import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'

/**
 * Rewards History Page (Server Component)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ENH-011: Local JWT decode (no getUser() network call)
 * - Uses getUserDashboard() for user.handle (no findByAuthId() call)
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token, refreshes if needed
 * 2. Server Component decodes JWT locally to get user ID (~1ms vs ~500ms)
 * 3. getUserDashboard() provides user.handle and tier info
 * 4. Direct service calls for history data
 *
 * References:
 * - RewardsHistoryAuthOptimizationEnhancement.md (ENH-011)
 * - HomePageAuthOptimizationEnhancement.md (ENH-010 pattern)
 * - DATA_FLOWS.md /rewards/rewardshistory section
 */
export default async function RewardsHistoryPage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[RewardsHistoryPage] CLIENT_ID not configured');
    return <RewardsHistoryClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data (includes user.handle and tier info)
  // This also validates user exists and belongs to this client
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);

  if (!dashboardData) {
    // User doesn't exist or doesn't belong to this client
    redirect('/login/start');
  }

  // 4. Get reward history - use handle from dashboardData
  const historyData = await rewardService.getRewardHistory({
    userId,
    clientId,
    userHandle: dashboardData.user.handle ?? '',
    currentTier: dashboardData.currentTier.id,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });

  // 5. Return client component with data
  return <RewardsHistoryClient initialData={historyData} error={null} />;
}
