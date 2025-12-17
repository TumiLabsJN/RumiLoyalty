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

  const response = await fetch(`${fetchUrl}/api/dashboard`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors
  if (!response.ok) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />
  }

  const data: DashboardResponse = await response.json()

  // Pass data to client component
  return <HomeClient initialData={data} error={null} />
}
