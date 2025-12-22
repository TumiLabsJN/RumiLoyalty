import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { userRepository } from '@/lib/repositories/userRepository'
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
  // 1. Get authenticated user via Supabase
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect('/login/start')
  }

  // 2. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[RewardsPage] CLIENT_ID not configured')
    return <RewardsClient initialData={null} error="Server configuration error" />
  }

  // 3. Get user from our users table - REUSES existing repository
  const user = await userRepository.findByAuthId(authUser.id)
  if (!user) {
    redirect('/login/start')
  }

  // 4. Verify user belongs to this client (multitenancy)
  if (user.clientId !== clientId) {
    return <RewardsClient initialData={null} error="Access denied" />
  }

  // 5. Get dashboard data for tier info - REUSES existing repository
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
  if (!dashboardData) {
    return <RewardsClient initialData={null} error="Failed to load user data" />
  }

  // 6. Get rewards - REUSES existing service (which uses existing RPC)
  // This is the exact same call as app/api/rewards/route.ts lines 89-98
  const rewardsResponse = await rewardService.listAvailableRewards({
    userId: user.id,
    clientId,
    currentTier: dashboardData.currentTier.id,
    currentTierOrder: dashboardData.currentTier.order,
    tierAchievedAt: user.tierAchievedAt ?? null,
    userHandle: user.tiktokHandle ?? '',
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  })

  // 7. Return client component with real data
  return <RewardsClient initialData={rewardsResponse} error={null} />
}
