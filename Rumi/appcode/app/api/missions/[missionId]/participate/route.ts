import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { participateInRaffle } from '@/lib/services/missionService';
import { userRepository } from '@/lib/repositories/userRepository';

/**
 * POST /api/missions/:id/participate
 *
 * Creator participates in a raffle mission.
 *
 * References:
 * - API_CONTRACTS.md lines 3782-3824 (POST /api/missions/:id/participate)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
 *
 * Request Body: {} (empty)
 *
 * Response: { success, message, raffleData }
 *
 * Backend Processing (8 steps per API_CONTRACTS.md lines 3816-3823):
 * 1. Verify mission.mission_type='raffle'
 * 2. Check mission.activated=true
 * 3. Verify user hasn't already participated
 * 4. Verify tier eligibility
 * 5. Update mission_progress.status → 'completed'
 * 6. Create redemptions row (status='claimable')
 * 7. Create raffle_participations row (is_winner=NULL)
 * 8. Log audit trail
 */

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
      console.error('[RaffleParticipate] CLIENT_ID not configured');
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

    // Step 4: Call service to participate in raffle
    // Per API_CONTRACTS.md lines 3816-3823 (8-step processing)
    const result = await participateInRaffle(
      missionId,
      user.id,
      clientId,
      user.currentTier ?? ''
    );

    // Step 5: Return response based on result
    if (!result.success) {
      // Determine HTTP status based on error
      let status = 400;
      if (result.message.includes('not found')) {
        status = 404;
      } else if (result.message.includes('not eligible')) {
        status = 403;
      } else if (result.message.includes('already entered') || result.message.includes('already participated')) {
        status = 409;
      } else if (result.message.includes('not accepting') || result.message.includes('not a raffle')) {
        status = 400;
      }

      return NextResponse.json(
        {
          success: false,
          error: 'PARTICIPATION_FAILED',
          code: 'PARTICIPATION_FAILED',
          message: result.message,
        },
        { status }
      );
    }

    // Per API_CONTRACTS.md lines 3801-3811
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[RaffleParticipate] Unexpected error:', error);
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
