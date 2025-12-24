import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { getTiersPageData } from '@/lib/services/tierService'
import { TiersClient } from './tiers-client'

/**
 * Tiers Page (Server Component)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ENH-012: Local JWT decode (no getUser() network call)
 * - Direct service call (no fetch/API route overhead)
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token, refreshes if needed
 * 2. Server Component decodes JWT locally to get user ID (~1ms vs ~500ms)
 * 3. Direct service call for tier data
 *
 * Security Note:
 * getUserIdFromToken() is safe here because:
 * - Middleware matcher includes /tiers (validates token first)
 * - Helper has fallback to getUser() if decode fails
 * - Service enforces client_id filtering
 *
 * References:
 * - TiersPageAuthOptimizationEnhancement.md (ENH-012)
 * - HomePageAuthOptimizationEnhancement.md (ENH-010 pattern)
 * - DATA_FLOWS.md /tiers section
 */
export default async function TiersPage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[TiersPage] CLIENT_ID not configured');
    return <TiersClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get tiers data - direct service call
  try {
    const tiersData = await getTiersPageData(userId, clientId);
    return <TiersClient initialData={tiersData} error={null} />;
  } catch (error) {
    console.error('[TiersPage] Error fetching tier data:', error);
    // User not found or not associated with client
    redirect('/login/start');
  }
}
