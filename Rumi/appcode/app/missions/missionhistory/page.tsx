import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionHistoryClient } from './missionhistory-client'
import type { MissionHistoryResponse } from '@/app/types/missionhistory'

/**
 * Mission History Page (Server Component)
 *
 * Fetches mission history data server-side for faster page load.
 * Data is passed to MissionHistoryClient for interactive rendering.
 *
 * MAINTAINER NOTES:
 * 1. This follows the same pattern as app/home/page.tsx and app/missions/page.tsx
 * 2. Cookie forwarding is CRITICAL for auth to work
 * 3. cache: 'no-store' prevents stale data caching
 * 4. Must use full URL (not relative) for server-side fetch
 *
 * References:
 * - ENH-005: MissionHistoryServerFetchEnhancement.md
 * - DATA_FLOWS.md Section: /missions/missionhistory
 * - Pattern source: app/missions/page.tsx
 */
export default async function MissionHistoryPage() {
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

  const response = await fetch(`${fetchUrl}/api/missions/history`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors - pass to client for error UI
  if (!response.ok) {
    return <MissionHistoryClient initialData={null} error="Failed to load mission history" />
  }

  const data: MissionHistoryResponse = await response.json()

  // Pass data to client component
  return <MissionHistoryClient initialData={data} error={null} />
}
