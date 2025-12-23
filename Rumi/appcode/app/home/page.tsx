import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { getDashboardOverview } from '@/lib/services/dashboardService'
import { HomeClient } from './home-client'

/**
 * Home Page (Server Component)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ENH-008: Direct service calls (no fetch to /api/dashboard)
 * - ENH-010: Local JWT decode (no getUser() network call)
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token, refreshes if needed
 * 2. Server Component decodes JWT locally to get user ID (~1ms vs ~577ms)
 * 3. Service calls reuse existing repository methods and RPCs
 *
 * References:
 * - HomePageDirectServiceEnhancement.md (ENH-008)
 * - HomePageAuthOptimizationEnhancement.md (ENH-010)
 */
export default async function HomePage() {
  const PAGE_START = Date.now();

  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const t1 = Date.now();
  const userId = await getUserIdFromToken();
  console.log(`[TIMING][HomePage] getUserIdFromToken(): ${Date.now() - t1}ms`);

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[HomePage] CLIENT_ID not configured');
    return <HomeClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - DIRECT SERVICE CALL (no fetch)
  const t2 = Date.now();
  const dashboardData = await getDashboardOverview(userId, clientId);
  console.log(`[TIMING][HomePage] getDashboardOverview(): ${Date.now() - t2}ms`);

  console.log(`[TIMING][HomePage] TOTAL: ${Date.now() - PAGE_START}ms`);

  if (!dashboardData) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />;
  }

  // 4. Return client component with data
  return <HomeClient initialData={dashboardData} error={null} />;
}
