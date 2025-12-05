import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { listAvailableMissions } from '@/lib/services/missionService';
import { userRepository } from '@/lib/repositories/userRepository';
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
      console.error('[Missions] CLIENT_ID not configured');
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

    // Step 4: Get dashboard data for tier info and VIP metric
    const dashboardData = await dashboardRepository.getUserDashboard(
      user.id,
      clientId,
      { includeAllTiers: true }
    );
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

    // Step 5: Build tier lookup map
    const tierLookup = new Map<string, { name: string; color: string }>();
    if (dashboardData.allTiers) {
      for (const tier of dashboardData.allTiers) {
        tierLookup.set(tier.id, { name: tier.name, color: tier.color });
      }
    }

    // Monitor for empty tierLookup (indicates data quality issues)
    if (dashboardData.allTiers && tierLookup.size === 0) {
      console.warn(
        '[Missions] tierLookup is empty despite allTiers being present',
        {
          clientId,
          allTiersCount: dashboardData.allTiers.length,
          userId: user.id,
        }
      );
    }

    // Monitor for missing allTiers (shouldn't happen with opt-in, but defensive)
    if (!dashboardData.allTiers || dashboardData.allTiers.length === 0) {
      console.warn(
        '[Missions] allTiers missing or empty - tier names will show as IDs',
        {
          clientId,
          userId: user.id,
          hasAllTiers: !!dashboardData.allTiers,
        }
      );
    }

    // Step 6: Get missions from service
    const missionsResponse = await listAvailableMissions(
      user.id,
      clientId,
      {
        handle: user.tiktokHandle ?? '',
        currentTier: dashboardData.currentTier.id,
        currentTierName: dashboardData.currentTier.name,
        currentTierColor: dashboardData.currentTier.color,
      },
      dashboardData.client.vipMetric as 'sales' | 'units',
      tierLookup
    );

    // Step 7: Return missions response
    // Per API_CONTRACTS.md lines 2968-3072
    return NextResponse.json(missionsResponse, { status: 200 });

  } catch (error) {
    console.error('[Missions] Unexpected error:', error);
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
