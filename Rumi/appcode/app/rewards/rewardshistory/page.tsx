import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { userRepository } from '@/lib/repositories/userRepository'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'

/**
 * Rewards History Page (Server Component)
 *
 * PERFORMANCE INSTRUMENTATION:
 * Timing logs added to measure baseline performance before optimization.
 * Deploy to Vercel and check logs to identify bottlenecks.
 *
 * Expected timing breakdown:
 * - createClient: ~5-10ms
 * - getUser/getSession: ~500-600ms (potential bottleneck - can use getUserIdFromToken)
 * - findByAuthId: ~50-100ms
 * - getUserDashboard: ~100-200ms
 * - getRewardHistory: ~100-300ms
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token
 * 2. Server Component calls getUser() to get auth user
 * 3. Direct service calls for data (no fetch to API route)
 *
 * References:
 * - DATA_FLOWS.md /rewards/rewardshistory section
 * - REWARDS_IMPL.md GET /api/rewards/history
 */
export default async function RewardsHistoryPage() {
  const PAGE_START = Date.now();

  // 1. Create Supabase client
  const t1 = Date.now();
  const supabase = await createClient();
  console.log(`[TIMING][RewardsHistoryPage] createClient(): ${Date.now() - t1}ms`);

  // 2. Get authenticated user (potential bottleneck - ~500-600ms network call)
  const t2 = Date.now();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  console.log(`[TIMING][RewardsHistoryPage] auth.getUser(): ${Date.now() - t2}ms`);

  if (authError || !authUser) {
    console.log(`[TIMING][RewardsHistoryPage] REDIRECT (no auth): ${Date.now() - PAGE_START}ms`);
    redirect('/login/start');
  }

  // 3. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[RewardsHistoryPage] CLIENT_ID not configured');
    return <RewardsHistoryClient initialData={null} error="Server configuration error" />;
  }

  // 4. Get user from our database
  const t3 = Date.now();
  const user = await userRepository.findByAuthId(authUser.id);
  console.log(`[TIMING][RewardsHistoryPage] findByAuthId(): ${Date.now() - t3}ms`);

  if (!user) {
    console.log(`[TIMING][RewardsHistoryPage] REDIRECT (no user): ${Date.now() - PAGE_START}ms`);
    redirect('/login/start');
  }

  // 5. Verify user belongs to this client (multi-tenant check)
  if (user.clientId !== clientId) {
    console.error('[RewardsHistoryPage] User does not belong to this client');
    return <RewardsHistoryClient initialData={null} error="Access denied" />;
  }

  // 6. Get dashboard data for tier info (needed for header badge)
  const t4 = Date.now();
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
  console.log(`[TIMING][RewardsHistoryPage] getUserDashboard(): ${Date.now() - t4}ms`);

  if (!dashboardData) {
    console.error('[RewardsHistoryPage] Failed to load dashboard data');
    return <RewardsHistoryClient initialData={null} error="Failed to load user data" />;
  }

  // 7. Get reward history - DIRECT SERVICE CALL (no fetch)
  const t5 = Date.now();
  const historyData = await rewardService.getRewardHistory({
    userId: user.id,
    clientId,
    userHandle: user.tiktokHandle ?? '',
    currentTier: dashboardData.currentTier.id,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });
  console.log(`[TIMING][RewardsHistoryPage] getRewardHistory(): ${Date.now() - t5}ms`);

  console.log(`[TIMING][RewardsHistoryPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  // 8. Return client component with data
  return <RewardsHistoryClient initialData={historyData} error={null} />;
}
