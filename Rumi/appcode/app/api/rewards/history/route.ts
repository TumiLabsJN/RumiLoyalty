import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { rewardService } from '@/lib/services/rewardService';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/rewards/history
 *
 * Retrieve user's concluded reward redemptions (archived/completed history).
 * Shows ONLY rewards that have reached terminal "concluded" state.
 *
 * References:
 * - API_CONTRACTS.md lines 5456-5598 (GET /api/rewards/history)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.1 (Rewards Authorization, lines 1160-1198)
 *
 * Response: RedemptionHistoryResponse with user info and history array
 * - Sorted by concluded_at DESC (most recent first)
 * - No pagination per spec
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
      console.error('[RewardsHistory] CLIENT_ID not configured');
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

    // Step 5: Call reward service to get history
    const historyResponse = await rewardService.getRewardHistory({
      userId: user.id,
      clientId,
      userHandle: user.tiktokHandle ?? '',
      currentTier: dashboardData.currentTier.id,
      tierName: dashboardData.currentTier.name,
      tierColor: dashboardData.currentTier.color,
    });

    // Step 6: Return history response
    // Per API_CONTRACTS.md lines 5492-5512
    return NextResponse.json(historyResponse, { status: 200 });

  } catch (error) {
    console.error('[RewardsHistory] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch reward history',
      },
      { status: 500 }
    );
  }
}
