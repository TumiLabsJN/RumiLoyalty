import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { getFeaturedMission } from '@/lib/services/dashboardService';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/dashboard/featured-mission
 *
 * Returns featured mission for circular progress display on home page.
 *
 * References:
 * - API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 * - ARCHITECTURE.md Section 10.2 (Missions Authorization)
 *
 * Request: Requires auth-token cookie
 * Response: FeaturedMissionResponse with:
 * - status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available'
 * - mission: Mission details with progress
 * - showCongratsModal: Boolean for newly fulfilled missions
 * - emptyStateMessage: If no missions available
 *
 * Performance target: ~80ms (per API_CONTRACTS.md lines 1943-1975)
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
      console.error('[FeaturedMission] CLIENT_ID not configured');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'INTERNAL_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Step 3: Get user from our users table
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
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          code: 'TENANT_MISMATCH',
          message: 'Access denied.',
        },
        { status: 403 }
      );
    }

    // Step 4: Get user's tier info for the featured mission query
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'USER_DATA_ERROR',
          message: 'Failed to load user data.',
        },
        { status: 500 }
      );
    }

    // Step 5: Get featured mission from service
    const featuredMission = await getFeaturedMission(
      user.id,
      clientId,
      dashboardData.currentTier.id,
      dashboardData.client.vipMetric,
      {
        name: dashboardData.currentTier.name,
        color: dashboardData.currentTier.color,
      },
      dashboardData.checkpointData.lastLoginAt
    );

    // Step 6: Update last_login_at if congrats modal shown
    // Per API_CONTRACTS.md lines 2025-2030
    if (featuredMission.showCongratsModal) {
      await dashboardRepository.updateLastLoginAt(user.id, clientId);
    }

    // Step 7: Return featured mission response
    // Per API_CONTRACTS.md lines 1789-1826
    // Returns 200 with status='no_missions' if none found (not 404)
    return NextResponse.json(featuredMission, { status: 200 });

  } catch (error) {
    console.error('[FeaturedMission] Unexpected error:', error);
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
