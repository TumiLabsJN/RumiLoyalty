import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { getDashboardOverview } from '@/lib/services/dashboardService'
import { HomeClient } from './home-client'

/**
 * Home Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-008):
 * Calls services directly instead of fetching from /api/dashboard.
 * This eliminates ~500-600ms of redundant middleware/auth overhead.
 *
 * The API route (/api/dashboard) is KEPT for client-side refresh/mutations.
 *
 * Auth Flow:
 * 1. Middleware runs setSession() for /home page route
 * 2. Server Component calls getUser() once (not redundant - we need user ID)
 * 3. Service calls reuse existing repository methods and RPCs
 *
 * References:
 * - HomePageDirectServiceEnhancement.md (ENH-008)
 * - app/api/dashboard/route.ts (logic source)
 */
export default async function HomePage() {
  const PAGE_START = Date.now();

  // 1. Get authenticated user
  // NOTE: Middleware already ran setSession(), this just retrieves the user
  const t_client = Date.now();
  const supabase = await createClient();
  console.log(`[HomePage] t_createClient: ${Date.now() - t_client}ms`);

  const t0 = Date.now();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  console.log(`[HomePage] t_getUser: ${Date.now() - t0}ms`);

  if (authError || !authUser) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment (same as API route)
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[HomePage] CLIENT_ID not configured');
    return <HomeClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - DIRECT SERVICE CALL (no fetch)
  const t1 = Date.now();
  const dashboardData = await getDashboardOverview(authUser.id, clientId);
  console.log(`[HomePage] t_getDashboardOverview: ${Date.now() - t1}ms`);

  if (!dashboardData) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />;
  }

  console.log(`[HomePage] TOTAL: ${Date.now() - PAGE_START}ms`);

  // 4. Return client component with data
  return <HomeClient initialData={dashboardData} error={null} />;
}
