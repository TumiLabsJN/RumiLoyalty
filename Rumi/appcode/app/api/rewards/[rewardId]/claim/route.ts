import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { rewardService } from '@/lib/services/rewardService';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
import { formatErrorResponse } from '@/lib/utils/errors';

/**
 * POST /api/rewards/:id/claim
 *
 * Creator claims a VIP tier reward from their current tier.
 * Creates a redemption record and handles scheduling for commission_boost and discount types.
 *
 * References:
 * - API_CONTRACTS.md lines 4836-5259 (POST /api/rewards/:id/claim)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.1 (Rewards Claim Validation, lines 1201-1294)
 *
 * Request Body (varies by reward type):
 * - Instant rewards (gift_card, spark_ads, experience): {}
 * - Scheduled rewards (commission_boost, discount): { scheduledActivationAt }
 * - Physical gifts: { shippingInfo, sizeValue? }
 *
 * Response: ClaimRewardResponse with redemption details and updated rewards
 */

interface ClaimRequestBody {
  scheduledActivationAt?: string;
  sizeValue?: string;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> }
) {
  try {
    const { rewardId } = await params;

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
      console.error('[RewardClaim] CLIENT_ID not configured');
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

    // Step 5: Parse request body
    const body: ClaimRequestBody = await request.json().catch(() => ({}));

    // Step 6: Pass shippingInfo directly (already matches ShippingInfo interface)
    const shippingInfo = body.shippingInfo;

    // Step 7: Call reward service with all required params
    const claimResponse = await rewardService.claimReward({
      userId: user.id,
      clientId,
      rewardId,
      currentTier: dashboardData.currentTier.id,
      tierAchievedAt: user.tierAchievedAt ?? null,
      scheduledActivationAt: body.scheduledActivationAt,
      shippingInfo,
      sizeValue: body.sizeValue,
      userHandle: user.tiktokHandle ?? '',
      userEmail: user.email ?? authUser.email ?? '',
    });

    // Step 8: Return claim response
    // Per API_CONTRACTS.md lines 5007-5057
    return NextResponse.json(claimResponse, { status: 200 });

  } catch (error) {
    console.error('[RewardClaim] Error:', error);
    return formatErrorResponse(error);
  }
}
