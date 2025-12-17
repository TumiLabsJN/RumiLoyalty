import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionsClient } from './missions-client'
import type { MissionsPageResponse } from '@/types/missions'

/**
 * Missions Page (Server Component)
 *
 * Fetches missions data server-side for faster page load.
 * Data is passed to MissionsClient for interactive rendering.
 *
 * MAINTAINER NOTES:
 * 1. This follows the same pattern as app/home/page.tsx
 * 2. Cookie forwarding is CRITICAL for auth to work
 * 3. cache: 'no-store' prevents stale data caching
 * 4. Must use full URL (not relative) for server-side fetch
 * 5. CRITICAL: /api/missions MUST remain in middleware.ts matcher (line 224)
 *    for token refresh to work. Server-side fetch passes cookies but middleware
 *    handles refresh. Removing from matcher will cause 401 errors.
 *
 * References:
 * - MissionsServerFetchEnhancement.md (ENH-004)
 * - app/home/page.tsx (pattern source)
 */
export default async function MissionsPage() {
  // Get auth cookie for API call (explicit construction for reliability)
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  // Fetch data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!baseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
  }
  const fetchUrl = baseUrl || 'http://localhost:3000'

  const response = await fetch(`${fetchUrl}/api/missions`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors - pass to client for error UI
  if (!response.ok) {
    return <MissionsClient initialData={null} error="Failed to load missions" />
  }

  const data: MissionsPageResponse = await response.json()

  // Pass data to client component
  return <MissionsClient initialData={data} error={null} />
}
