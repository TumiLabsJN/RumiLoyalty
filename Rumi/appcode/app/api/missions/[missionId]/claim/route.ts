import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { claimMissionReward } from '@/lib/services/missionService';
import { userRepository } from '@/lib/repositories/userRepository';

/**
 * POST /api/missions/:id/claim
 *
 * Creator claims a completed mission reward.
 *
 * References:
 * - API_CONTRACTS.md lines 3711-3779 (POST /api/missions/:id/claim)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.2 (Mission Claim Validation, lines 1312-1323)
 *
 * Request Body (varies by reward type):
 * - Instant rewards (gift_card, spark_ads, experience): {}
 * - Scheduled rewards (commission_boost, discount): { scheduledActivationDate, scheduledActivationTime }
 * - Physical gifts: { shippingAddress, size? }
 *
 * Response: { success, message, redemptionId, nextAction }
 */

interface ClaimRequestBody {
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;
  size?: string;
  shippingAddress?: {
    firstName: string;   // Required for carrier delivery
    lastName: string;    // Required for carrier delivery
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    phone?: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const { missionId } = await params;

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
      console.error('[MissionClaim] CLIENT_ID not configured');
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

    // Step 4: Parse request body
    let body: ClaimRequestBody = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is valid for instant rewards
    }

    // Step 5: Call service to claim reward
    // Per API_CONTRACTS.md lines 3772-3778 (7-step validation)
    const result = await claimMissionReward(
      missionId,
      user.id,
      clientId,
      user.currentTier ?? '',
      {
        scheduledActivationDate: body.scheduledActivationDate,
        scheduledActivationTime: body.scheduledActivationTime,
        size: body.size,
        shippingAddress: body.shippingAddress,
      }
    );

    // Step 6: Return response based on result
    if (!result.success) {
      // Determine HTTP status based on error
      let status = 400;
      if (result.message.includes('not found')) {
        status = 404;
      } else if (result.message.includes('not eligible') || result.message.includes('no longer eligible')) {
        status = 403;
      } else if (result.message.includes('already claimed') || result.message.includes('Cannot claim')) {
        status = 409;
      }

      return NextResponse.json(
        {
          success: false,
          error: 'CLAIM_FAILED',
          code: 'CLAIM_FAILED',
          message: result.message,
          redemptionId: result.redemptionId,
          nextAction: result.nextAction,
        },
        { status }
      );
    }

    // Per API_CONTRACTS.md lines 3758-3768
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[MissionClaim] Unexpected error:', error);
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
