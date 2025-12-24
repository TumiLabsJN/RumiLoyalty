import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/signup-form'
import type { TermsResponse, PrivacyResponse } from '@/types/auth'

/**
 * SIGNUP PAGE - Server Component with SSR
 *
 * Server-side responsibilities:
 * 1. Get TikTok handle from session (sessionStorage or Supabase)
 * 2. Pre-fetch terms and privacy server-side (no loading states!)
 * 3. Pass data to client component for form interactivity
 *
 * User flow:
 * 1. User entered TikTok handle on /login/start
 * 2. Backend verified handle exists
 * 3. User registers email + password to create account
 */

export default async function SignupPage() {
  const PAGE_START = Date.now();

  // Server-side: Get handle from session
  // Note: For MVP, using sessionStorage approach (client-side)
  // TODO: Once Supabase Auth is fully implemented, use server-side session

  // For now, we'll pass a function to get handle client-side
  // In production, this would be:
  // const supabase = await createClient()
  // const { data: { user } } = await supabase.auth.getUser()
  // const handle = user?.user_metadata?.tiktok_handle

  // Temporary: Use sessionStorage in client component
  // If no handle, redirect happens in client component

  // Server-side: Pre-fetch terms and privacy (no loading states!)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const t1 = Date.now();
  const [termsRes, privacyRes] = await Promise.all([
    fetch(`${baseUrl}/api/clients/fizee/terms`, {
      cache: 'no-store',  // Dynamic page, no caching
    }),
    fetch(`${baseUrl}/api/clients/fizee/privacy`, {
      cache: 'no-store',
    })
  ])
  console.log(`[TIMING][SignupPage] fetch(terms+privacy) parallel: ${Date.now() - t1}ms`);

  if (!termsRes.ok || !privacyRes.ok) {
    // Fallback: If legal docs fail to load, show error
    throw new Error('Failed to load legal documents')
  }

  const t2 = Date.now();
  const terms: TermsResponse = await termsRes.json()
  const privacy: PrivacyResponse = await privacyRes.json()
  console.log(`[TIMING][SignupPage] response.json() both: ${Date.now() - t2}ms`);

  console.log(`[TIMING][SignupPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  // Return client component with pre-fetched data
  // Handle is retrieved client-side from sessionStorage in SignupForm
  return <SignupForm terms={terms} privacy={privacy} />
}
