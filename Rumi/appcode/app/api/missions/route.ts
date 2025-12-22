import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { listAvailableMissions } from '@/lib/services/missionService';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/missions
 *
 * Returns all missions for the Missions page with pre-computed status,
 * progress tracking, and formatted display text.
 *
 * References:
 * - API_CONTRACTS.md lines 2955-3238 (GET /api/missions)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.2 (Missions Authorization, lines 1299-1309)
 *
 * Request: Requires auth-token cookie
 * Response: MissionsPageResponse with user, featuredMissionId, missions[]
 *
 * Performance target: <200ms
 *
 * MAINTAINER NOTES:
 * 1. This route MUST remain in middleware.ts matcher for token refresh to work.
 *    If removed from matcher, requests will 401 because setSession() was removed.
 * 2. If dashboardData is null, we return 500 (not 401) because:
 *    - users.id = authUser.id (created atomically in auth_create_user)
 *    - A missing users row indicates data corruption, not a user action error
 *    - Do NOT reintroduce 401/USER_NOT_FOUND here; investigate the corruption instead
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', code: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Step 3: Get dashboard data - pass authUser.id directly
    // REMOVED: findByAuthId() call - users.id === authUser.id (same UUID)
    // REMOVED: Tenant mismatch check - RPC enforces via WHERE client_id = p_client_id
    const dashboardData = await dashboardRepository.getUserDashboard(
      authUser.id,
      clientId,
      { includeAllTiers: true }
    );

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'USER_DATA_ERROR', message: 'Failed to load user data.' },
        { status: 500 }
      );
    }

    // Step 4: Build tier lookup map
    const tierLookup = new Map<string, { name: string; color: string }>();
    if (dashboardData.allTiers) {
      for (const tier of dashboardData.allTiers) {
        tierLookup.set(tier.id, { name: tier.name, color: tier.color });
      }
    }

    // Step 5: Get missions from service
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

    return NextResponse.json(missionsResponse, { status: 200 });

  } catch (error) {
    console.error('[Missions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
