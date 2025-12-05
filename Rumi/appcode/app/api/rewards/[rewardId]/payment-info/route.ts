import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server-client';
import { rewardService } from '@/lib/services/rewardService';
import { userRepository } from '@/lib/repositories/userRepository';
import { formatErrorResponse } from '@/lib/utils/errors';

/**
 * POST /api/rewards/:id/payment-info
 *
 * Submit payment information for a commission boost payout.
 * Updates both the specific redemption and optionally saves as user's default payment method.
 *
 * References:
 * - API_CONTRACTS.md lines 5333-5453 (POST /api/rewards/:id/payment-info)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.4 (Validation Checklist Template, lines 1396-1401)
 *
 * Request Body:
 * - paymentMethod: 'paypal' | 'venmo'
 * - paymentAccount: string (PayPal email or Venmo handle)
 * - paymentAccountConfirm: string (must match paymentAccount)
 * - saveAsDefault: boolean (save to users.default_payment_* for future use)
 *
 * Response: SavePaymentInfoResponse with redemption details and userPaymentUpdated flag
 */

// Zod schema for request body validation per ARCHITECTURE.md Section 10.4
const PaymentInfoRequestSchema = z.object({
  paymentMethod: z.enum(['paypal', 'venmo']),
  paymentAccount: z.string().min(1, 'paymentAccount is required'),
  paymentAccountConfirm: z.string().min(1, 'paymentAccountConfirm is required'),
  saveAsDefault: z.boolean(),
});

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
      console.error('[PaymentInfo] CLIENT_ID not configured');
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

    // Step 4: Parse and validate request body with Zod
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Zod validation for all 4 required fields
    const parseResult = PaymentInfoRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: firstError.message || 'Invalid request body',
        },
        { status: 400 }
      );
    }

    const body = parseResult.data;

    // Step 5: Call reward service to save payment info
    // Service handles all business validation (account match, email format, venmo @, boost_status)
    const saveResponse = await rewardService.savePaymentInfo({
      userId: user.id,
      clientId,
      redemptionId: rewardId, // Note: rewardId param is actually redemptionId per API design
      paymentMethod: body.paymentMethod,
      paymentAccount: body.paymentAccount,
      paymentAccountConfirm: body.paymentAccountConfirm,
      saveAsDefault: body.saveAsDefault,
    });

    // Step 6: Return save response
    // Per API_CONTRACTS.md lines 5379-5408
    return NextResponse.json(saveResponse, { status: 200 });

  } catch (error) {
    console.error('[PaymentInfo] Error:', error);
    return formatErrorResponse(error);
  }
}
