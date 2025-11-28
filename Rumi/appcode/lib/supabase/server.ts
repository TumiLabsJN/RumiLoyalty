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

  return createServerClient<Database>(
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
