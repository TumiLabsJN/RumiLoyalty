import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { getDashboardOverview } from '@/lib/services/dashboardService';
import { userRepository } from '@/lib/repositories/userRepository';

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
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          code: 'UNAUTHORIZED',
          message: 'Please log in to continue.',
        },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('[Dashboard] CLIENT_ID not configured');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'INTERNAL_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Step 3: Get user from our users table (need userId for service)
    const user = await userRepository.findByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          code: 'USER_NOT_FOUND',
          message: 'User profile not found. Please sign up.',
        },
        { status: 401 }
      );
    }

    // Verify user belongs to this client (multitenancy)
    if (user.clientId !== clientId) {
      console.error('[Dashboard] User client_id mismatch:', {
        userId: user.id,
        userClientId: user.clientId,
        expectedClientId: clientId,
      });
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          code: 'TENANT_MISMATCH',
          message: 'Access denied.',
        },
        { status: 403 }
      );
    }

    // Step 4: Get dashboard data from service
    const dashboardData = await getDashboardOverview(user.id, clientId);

    if (!dashboardData) {
      console.error('[Dashboard] Failed to get dashboard data for user:', user.id);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'DASHBOARD_ERROR',
          message: 'Failed to load dashboard. Please try again.',
        },
        { status: 500 }
      );
    }

    // Step 5: Return dashboard response
    // Per API_CONTRACTS.md lines 2075-2193
    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error('[Dashboard] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    );
  }
}
