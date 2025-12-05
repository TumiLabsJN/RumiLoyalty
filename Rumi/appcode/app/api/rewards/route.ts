import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { rewardService } from '@/lib/services/rewardService';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/rewards
 *
 * Returns all VIP tier rewards for the Rewards page with pre-computed status,
 * availability, and formatted display text.
 *
 * References:
 * - API_CONTRACTS.md lines 4053-4827 (GET /api/rewards)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.1 (Rewards Authorization, lines 1160-1198)
 *
 * Request: Requires auth-token cookie
 * Response: RewardsPageResponse with user, redemptionCount, rewards[]
 *
 * Performance target: ~120-150ms (per API_CONTRACTS.md line 4812)
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
          message: 'Invalid or missing authentication token',
        },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('[Rewards] CLIENT_ID not configured');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
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
          message: 'Access denied.',
        },
        { status: 403 }
      );
    }

    // Step 4: Get dashboard data for tier info
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Failed to load user data.',
        },
        { status: 500 }
      );
    }

    // Step 5: Call reward service with all required params
    const rewardsResponse = await rewardService.listAvailableRewards({
      userId: user.id,
      clientId,
      currentTier: dashboardData.currentTier.id,
      currentTierOrder: dashboardData.currentTier.order,
      tierAchievedAt: user.tierAchievedAt ?? null,
      userHandle: user.tiktokHandle ?? '',
      tierName: dashboardData.currentTier.name,
      tierColor: dashboardData.currentTier.color,
    });

    // Step 6: Return rewards response
    // Per API_CONTRACTS.md lines 4059-4138
    return NextResponse.json(rewardsResponse, { status: 200 });

  } catch (error) {
    console.error('[Rewards] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch rewards data',
      },
      { status: 500 }
    );
  }
}
