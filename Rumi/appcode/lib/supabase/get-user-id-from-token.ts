/**
 * JWT Decode Helper for Server Components
 *
 * Extracts user ID from auth-token cookie via local JWT decode.
 * Falls back to Supabase getUser() network call on any error.
 *
 * SECURITY: Only safe on routes where middleware runs setSession().
 * See ALLOWED_PAGE_ROUTES and sync test for enforcement.
 *
 * References:
 * - HomePageAuthOptimizationEnhancement.md (ENH-010)
 * - middleware.ts (setSession validation)
 */

import { cookies } from 'next/headers';
import { createClient } from './server-client';

interface SupabaseJwtPayload {
  sub: string;      // User ID (UUID)
  exp: number;      // Expiry timestamp (Unix seconds)
  aud: string;      // Audience (should be 'authenticated')
  iat?: number;     // Issued at
  role?: string;    // Role
}

/**
 * Page routes where this helper is safe to use.
 * These routes are covered by middleware.ts matcher, which runs setSession().
 *
 * EXPORTED for sync test to verify against middleware.ts config.
 * Update this list AND middleware.ts matcher together.
 */
export const ALLOWED_PAGE_ROUTES = [
  '/home',
  '/missions',
  '/rewards',
  '/tiers',
  '/admin',
] as const;

/**
 * Get user ID from auth token via local JWT decode.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SECURITY CONTRACT                                                       │
 * │                                                                         │
 * │ This function ONLY decodes the JWT payload - it does NOT verify the     │
 * │ signature. It is ONLY safe to use on routes where middleware has        │
 * │ already validated the token via setSession().                           │
 * │                                                                         │
 * │ ALLOWED ROUTES: See ALLOWED_PAGE_ROUTES constant above.                 │
 * │                                                                         │
 * │ DO NOT use this function on:                                            │
 * │   - API routes not in middleware matcher                                │
 * │   - Public pages                                                        │
 * │   - Any route where middleware doesn't run setSession()                 │
 * │                                                                         │
 * │ A sync test verifies ALLOWED_PAGE_ROUTES matches middleware.ts.         │
 * │ Run tests before deploying changes.                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SAFETY LAYERS:
 * 1. Middleware setSession() validates signature + refreshes tokens
 * 2. This function validates exp (expiry) and aud (audience) claims
 * 3. Any decode error falls back to getUser() network call
 * 4. Database RLS policies enforce authorization on returned user ID
 *
 * Falls back to getUser() network call if:
 * - Token missing or malformed
 * - Token expired or expiring within 30s (clock skew protection)
 * - Invalid audience
 * - Any decode error
 *
 * Expected fallback frequency: <1% in normal operation
 *
 * @returns User ID string, or null if auth failed
 */
export async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    // No token - caller should redirect to login
    return null;
  }

  try {
    // Decode JWT payload (no signature verification - middleware already did this)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[getUserIdFromToken] Malformed JWT (not 3 parts), falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Base64url decode the payload (middle part)
    // JWT uses base64url encoding: replace - with +, _ with /, add padding
    const payloadB64 = parts[1];
    const payloadB64Std = payloadB64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    // Add padding if needed (base64 requires length divisible by 4)
    const padding = (4 - (payloadB64Std.length % 4)) % 4;
    const payloadB64Padded = payloadB64Std + '='.repeat(padding);

    // Use Buffer.from for Node.js runtime (not atob which has issues with base64url)
    // NOTE: Buffer.from may throw on invalid base64 chars - caught by outer try/catch
    const payloadJson = Buffer.from(payloadB64Padded, 'base64').toString('utf-8');
    // NOTE: JSON.parse may throw on malformed JSON - caught by outer try/catch
    const payload: SupabaseJwtPayload = JSON.parse(payloadJson);

    // Validate expiry - reject if token is expired OR will expire within 30s
    // This protects against clock skew where our server clock is behind
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now + 30) {
      console.warn('[getUserIdFromToken] Token expired or expiring soon, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Validate audience matches Supabase authenticated users
    if (!payload.aud || payload.aud !== 'authenticated') {
      console.warn('[getUserIdFromToken] Invalid audience, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Validate sub (user ID) exists and is non-empty
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.warn('[getUserIdFromToken] Missing or invalid sub claim, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Success - return user ID from local decode
    return payload.sub;

  } catch (error) {
    // Any error (JSON parse, Buffer decode, etc.) - fall back to network call
    console.warn('[getUserIdFromToken] Decode failed, falling back to getUser():', error);
    return await fallbackToGetUser();
  }
}

/**
 * Fallback to Supabase getUser() network call.
 * Used when local decode fails for any reason.
 * This ensures auth always works, even if decode logic has bugs.
 */
async function fallbackToGetUser(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user.id;
}
