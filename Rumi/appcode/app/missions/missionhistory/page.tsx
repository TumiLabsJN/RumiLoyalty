import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { getMissionHistory } from '@/lib/services/missionService'
import { MissionHistoryClient } from './missionhistory-client'
// Note: MissionHistoryResponse type inferred from getMissionHistory return type
// SSoT consolidation of missionService types is a separate task

/**
 * Mission History Page (Server Component)
 *
 * ENH-009: Direct Service Pattern
 * - Uses getSession() for local JWT validation (~5ms vs ~500ms)
 * - Calls services directly (no fetch/API route overhead)
 * - Same pattern as /rewards (ENH-008)
 *
 * Security:
 * - getSession() validates JWT signature (not raw decode)
 * - Middleware runs first, refreshes tokens
 * - getUserDashboard enforces client_id filtering
 * - getMissionHistory RPC enforces client_id (baseline.sql:603)
 */
export default async function MissionHistoryPage() {
  const PAGE_START = Date.now()

  // 1. Create Supabase client
  const t1 = Date.now()
  const supabase = await createClient()
  console.log(`[TIMING][MissionHistoryPage] createClient(): ${Date.now() - t1}ms`)

  // 2. Get session (local JWT validation - no network call)
  // ENH-009: Middleware runs first and refreshes tokens via setSession()
  // getSession() reads from those already-refreshed cookies
  const t2 = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log(`[TIMING][MissionHistoryPage] auth.getSession(): ${Date.now() - t2}ms`)

  if (sessionError || !session?.user) {
    redirect('/login/start')
  }

  const authUser = session.user

  // 3. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[MissionHistoryPage] CLIENT_ID not configured')
    return <MissionHistoryClient initialData={null} error="Server configuration error" />
  }

  // 4. Get dashboard data for tier info
  // Multi-tenant isolation: .eq('client_id', clientId) at dashboardRepository.ts:142
  const t3 = Date.now()
  const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId)
  console.log(`[TIMING][MissionHistoryPage] getUserDashboard(): ${Date.now() - t3}ms`)

  if (!dashboardData) {
    // User not found or doesn't belong to this client
    redirect('/login/start')
  }

  // 5. Get mission history directly from service
  // Multi-tenant isolation: RPC enforces WHERE red.client_id = p_client_id (baseline.sql:603)
  const t4 = Date.now()
  const historyResponse = await getMissionHistory(
    authUser.id,
    clientId,
    {
      currentTier: dashboardData.currentTier.id,
      currentTierName: dashboardData.currentTier.name,
      currentTierColor: dashboardData.currentTier.color,
    }
  )
  console.log(`[TIMING][MissionHistoryPage] getMissionHistory(): ${Date.now() - t4}ms`)

  console.log(`[TIMING][MissionHistoryPage] TOTAL: ${Date.now() - PAGE_START}ms`)

  // 6. Return client component with real data
  return <MissionHistoryClient initialData={historyResponse} error={null} />
}
