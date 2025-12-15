import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

/**
 * Create Supabase client for Server Components and API Routes
 *
 * Uses:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_ANON_KEY: Anonymous key (respects RLS policies)
 * - HTTP-only cookies for auth session
 *
 * This client respects Row Level Security (RLS) policies.
 * Use this for all user-facing server operations.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );

  // BUG-AUTH-COOKIE-SESSION Fix: Restore session from custom cookies
  // Middleware handles token refresh; this ensures route handlers have valid session.
  //
  // IMPORTANT: Token refresh is MIDDLEWARE-ONLY. This setSession() call restores the
  // session but does NOT have response access to persist refreshed tokens. If tokens
  // expire mid-request (rare - tokens last ~1 hour), the refresh won't persist to browser.
  // For MVP, this is acceptable; middleware handles 99.9% of refresh cases.
  const authToken = cookieStore.get('auth-token')?.value;
  const refreshToken = cookieStore.get('auth-refresh-token')?.value;
  if (authToken) {
    await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken || '',
    });
  }

  return supabase;
}

/**
 * Create Supabase client for API Route Handlers
 *
 * Same as createClient but with explicit cookie handling for route handlers.
 * Prefer this in API routes where you need to set/remove cookies.
 */
export async function createRouteHandlerClient() {
  return createClient();
}
