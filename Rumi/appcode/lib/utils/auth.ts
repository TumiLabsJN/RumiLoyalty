import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type User = Database['public']['Tables']['users']['Row'];

/**
 * Auth Error Types
 */
export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN');
  }
}

/**
 * User data extracted from JWT/session
 */
export interface AuthenticatedUser {
  id: string;
  clientId: string;
  email: string;
  tiktokHandle: string;
  currentTier: string;
  isAdmin: boolean;
}

/**
 * Get authenticated user from Supabase session
 *
 * Extracts user from JWT token via Supabase auth, then fetches
 * full user data including client_id for multitenancy enforcement.
 *
 * @throws UnauthorizedError if no valid session
 * @throws ForbiddenError if user not found in database
 */
export async function getUserFromRequest(): Promise<AuthenticatedUser> {
  const supabase = await createClient();

  // 1. Get session from Supabase (validates JWT)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new UnauthorizedError('Invalid or expired session');
  }

  // 2. Fetch full user data from users table (includes client_id)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, client_id, email, tiktok_handle, current_tier, is_admin')
    .eq('id', authUser.id)
    .single();

  if (userError || !user) {
    throw new ForbiddenError('User not found in database');
  }

  return {
    id: user.id,
    clientId: user.client_id,
    email: user.email,
    tiktokHandle: user.tiktok_handle,
    currentTier: user.current_tier,
    isAdmin: user.is_admin,
  };
}

/**
 * Validate that a client_id matches the user's client
 *
 * Use this to prevent cross-tenant data access.
 * Every query to tenant-scoped tables MUST use the user's client_id.
 *
 * @param userClientId - The authenticated user's client_id
 * @param resourceClientId - The client_id of the resource being accessed
 * @throws ForbiddenError if client_ids don't match
 */
export function validateClientId(
  userClientId: string,
  resourceClientId: string
): void {
  if (userClientId !== resourceClientId) {
    throw new ForbiddenError('Resource not available for your organization');
  }
}

/**
 * Require admin privileges
 *
 * @param user - The authenticated user
 * @throws ForbiddenError if user is not an admin
 */
export function requireAdmin(user: AuthenticatedUser): void {
  if (!user.isAdmin) {
    throw new ForbiddenError('Admin privileges required');
  }
}

/**
 * Validate tier eligibility
 *
 * @param userTier - The user's current tier (e.g., 'tier_1', 'tier_2')
 * @param requiredTier - The required tier for the resource
 * @throws ForbiddenError if user's tier doesn't match
 */
export function validateTierEligibility(
  userTier: string,
  requiredTier: string
): void {
  if (userTier !== requiredTier) {
    throw new ForbiddenError('Tier requirement not met');
  }
}

/**
 * Get user's client_id for multitenancy queries
 *
 * Convenience function to get client_id for use in repository queries.
 * This ensures every query is properly scoped to the user's tenant.
 *
 * Usage:
 * ```typescript
 * const user = await getUserFromRequest();
 * const clientId = getClientId(user);
 *
 * const { data } = await supabase
 *   .from('missions')
 *   .select('*')
 *   .eq('client_id', clientId);  // REQUIRED for multitenancy
 * ```
 */
export function getClientId(user: AuthenticatedUser): string {
  return user.clientId;
}
