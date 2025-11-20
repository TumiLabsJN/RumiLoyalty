import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create Supabase client for Server Components
 * Reads auth session from HTTP-only cookies
 */
export async function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
