import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { getDashboardOverview } from '@/lib/services/dashboardService';

/**
 * GET /api/dashboard
 *
 * Returns unified dashboard data for home page.
 *
 * References:
 * - API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 * - ARCHITECTURE.md Section 10.1 (Rewards Authorization)
 *
 * Request: Requires auth-token cookie
 * Response: DashboardResponse with 7 sections:
 * - user, client, currentTier, nextTier, tierProgress, featuredMission, currentTierRewards
 *
 * Performance target: <200ms (per API_CONTRACTS.md)
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
    // NOTE: If user row is missing (null response), this is data corruption - return 500, not 401
    const dashboardData = await getDashboardOverview(authUser.id, clientId);

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'DASHBOARD_ERROR', message: 'Failed to load dashboard.' },
        { status: 500 }
      );
    }

    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error('[Dashboard] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
