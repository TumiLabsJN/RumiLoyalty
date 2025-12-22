import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsClient } from './rewards-client'
import type { RewardsPageResponse } from '@/types/rewards'

/**
 * Rewards Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-006):
 * Calls services directly instead of using mock data or fetching from API.
 * This follows the same pattern as ENH-007 (Missions).
 *
 * The API route (/api/rewards) is KEPT for client-side claim operations.
 *
 * Auth/Error Parity (matches API route):
 * - No authUser → redirect to /login/start
 * - No CLIENT_ID → error component
 * - User not found → redirect to /login/start
 * - clientId mismatch → error component
 * - No dashboardData → error component
 */
export default async function RewardsPage() {
  const PAGE_START = Date.now()

  // 1. Get authenticated user via Supabase
  const t1 = Date.now()
  const supabase = await createClient()
  console.log(`[TIMING][RewardsPage] createClient(): ${Date.now() - t1}ms`)

  // ENH-008: Use getSession() instead of getUser() - validates JWT locally, no network call
  const t2 = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log(`[TIMING][RewardsPage] auth.getSession(): ${Date.now() - t2}ms`)

  if (sessionError || !session?.user) {
    redirect('/login/start')
  }

  const authUser = session.user

  // 2. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[RewardsPage] CLIENT_ID not configured')
    return <RewardsClient initialData={null} error="Server configuration error" />
  }

  // ENH-008: Get dashboard data directly (includes user info + tier) - SKIP findByAuthId
  // getUserDashboard queries users table with client_id filter (multitenancy enforced)
  const t3 = Date.now()
  const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId)
  console.log(`[TIMING][RewardsPage] getUserDashboard(): ${Date.now() - t3}ms`)

  if (!dashboardData) {
    // User not found or doesn't belong to this client
    redirect('/login/start')
  }

  // 4. Get rewards - REUSES existing service (which uses existing RPC)
  // ENH-008: Now uses dashboardData.user for tierAchievedAt and handle
  const t4 = Date.now()
  const rewardsResponse = await rewardService.listAvailableRewards({
    userId: dashboardData.user.id,
    clientId,
    currentTier: dashboardData.currentTier.id,
    currentTierOrder: dashboardData.currentTier.order,
    tierAchievedAt: dashboardData.user.tierAchievedAt,
    userHandle: dashboardData.user.handle,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  })
  console.log(`[TIMING][RewardsPage] listAvailableRewards(): ${Date.now() - t4}ms`)

  console.log(`[TIMING][RewardsPage] TOTAL: ${Date.now() - PAGE_START}ms`)

  // 7. Return client component with real data
  return <RewardsClient initialData={rewardsResponse} error={null} />
}
