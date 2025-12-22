import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { listAvailableMissions } from '@/lib/services/missionService'
import { MissionsClient } from './missions-client'

/**
 * Missions Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-007):
 * Calls services directly instead of fetching from /api/missions.
 * This eliminates ~550ms of redundant middleware/auth overhead.
 *
 * The API route (/api/missions) is KEPT for client-side refresh/mutations.
 *
 * Auth Flow:
 * 1. Middleware runs setSession() for /missions page route
 * 2. Server Component calls getUser() once (not redundant - we need user ID)
 * 3. Service calls reuse existing repository methods and RPCs
 *
 * References:
 * - MissionsPageDirectServiceEnhancement.md (ENH-007)
 * - app/api/missions/route.ts (logic source)
 */
export default async function MissionsPage() {
  // 1. Get authenticated user
  // NOTE: Middleware already ran setSession(), this just retrieves the user
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment (same as API route)
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[MissionsPage] CLIENT_ID not configured');
    return <MissionsClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - REUSES existing repository method
  const dashboardData = await dashboardRepository.getUserDashboard(
    authUser.id,
    clientId,
    { includeAllTiers: true }
  );

  if (!dashboardData) {
    return <MissionsClient initialData={null} error="Failed to load user data" />;
  }

  // 4. Build tier lookup - same logic as API route
  const tierLookup = new Map<string, { name: string; color: string }>();
  if (dashboardData.allTiers) {
    for (const tier of dashboardData.allTiers) {
      tierLookup.set(tier.id, { name: tier.name, color: tier.color });
    }
  }

  // 5. Get missions - REUSES existing service function (which uses existing RPC)
  const missionsResponse = await listAvailableMissions(
    authUser.id,
    clientId,
    {
      handle: dashboardData.user.handle ?? '',
      currentTier: dashboardData.currentTier.id,
      currentTierName: dashboardData.currentTier.name,
      currentTierColor: dashboardData.currentTier.color,
    },
    dashboardData.client.vipMetric as 'sales' | 'units',
    tierLookup
  );

  // 6. Return client component with data
  return <MissionsClient initialData={missionsResponse} error={null} />;
}
