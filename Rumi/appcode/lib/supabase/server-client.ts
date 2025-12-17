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
            // Ignored in Server Components
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignored in Server Components
          }
        },
      },
    }
  );

  // REMOVED: setSession() call - middleware handles token refresh
  // The session is automatically available from cookies via the cookie handlers above

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
