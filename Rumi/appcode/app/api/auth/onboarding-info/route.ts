import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { formatErrorResponse } from '@/lib/utils/errors';

/**
 * GET /api/auth/onboarding-info
 *
 * Provide client-specific welcome and onboarding information for first-time users.
 *
 * References:
 * - API_CONTRACTS.md lines 1304-1455 (GET /api/auth/onboarding-info)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: Requires auth-token cookie
 * Response: { heading, message, submessage, buttonText }
 *
 * MVP Implementation:
 * - Returns hardcoded default response for single client
 * - Future: Query onboarding_messages table by client_id
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get authenticated user from session token
    // JWT decode or session lookup from HTTP-only cookie auth-token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      // Return 401 UNAUTHORIZED per API_CONTRACTS.md lines 1417-1422
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Please log in to continue.',
        },
        { status: 401 }
      );
    }

    // Step 2: Get user's client_id from users table per lines 1364-1366
    const user = await userRepository.findByAuthId(authUser.id);

    if (!user) {
      // User exists in Supabase Auth but not in our users table
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Please log in to continue.',
        },
        { status: 401 }
      );
    }

    // Step 3: Get client-specific onboarding configuration
    // MVP: Return hardcoded default response (single client) per lines 1385-1388
    // Future: Query onboarding_messages table by client_id

    // Step 4: Build response with dynamic content per lines 1373-1378
    // Can include emojis in heading (line 1321), dynamic dates (line 1322)
    // communication channel info (line 1323), CTA button text (line 1324)

    // MVP hardcoded response per lines 1338-1345
    const onboardingInfo = {
      heading: '🎉 Welcome! 🎉',
      message: "You're all set! Our onboarding begins this coming Monday.",
      submessage: '👀 Watch your DMs for your sample request link.',
      buttonText: 'Explore Program',
    };

    // Step 5: Return response per lines 1328-1335
    // Can be cached per client_id for 1 hour per lines 1411-1413
    return NextResponse.json(onboardingInfo, { status: 200 });

  } catch (error) {
    console.error('onboarding-info error:', error);
    return formatErrorResponse(error);
  }
}
