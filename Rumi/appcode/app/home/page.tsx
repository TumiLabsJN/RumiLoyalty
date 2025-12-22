import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { HomeClient } from './home-client'
import type { DashboardResponse } from '@/types/dashboard'

/**
 * Home Page (Server Component)
 *
 * Fetches dashboard data server-side for faster page load.
 * Data is passed to HomeClient for interactive rendering.
 *
 * References:
 * - PageLoadRefactor.md (Server Component + Client Islands pattern)
 * - DASHBOARD_IMPL.md (API documentation)
 */
export default async function HomePage() {
  const PAGE_START = Date.now();

  // Get auth cookie for API call (explicit construction for reliability)
  const t_cookies = Date.now();
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')
  console.log(`[TIMING][HomePage] cookies(): ${Date.now() - t_cookies}ms`);

  // Fetch data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!baseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
  }
  const fetchUrl = baseUrl || 'http://localhost:3000'

  const t_fetch = Date.now();
  const response = await fetch(`${fetchUrl}/api/dashboard`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })
  console.log(`[TIMING][HomePage] fetch(/api/dashboard): ${Date.now() - t_fetch}ms`);

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors
  if (!response.ok) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />
  }

  const t_json = Date.now();
  const data: DashboardResponse = await response.json()
  console.log(`[TIMING][HomePage] response.json(): ${Date.now() - t_json}ms`);
  console.log(`[TIMING][HomePage] TOTAL: ${Date.now() - PAGE_START}ms`);

  // Pass data to client component
  return <HomeClient initialData={data} error={null} />
}
