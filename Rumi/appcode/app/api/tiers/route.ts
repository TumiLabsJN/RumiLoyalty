import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { getTiersPageData } from '@/lib/services/tierService';
import { userRepository } from '@/lib/repositories/userRepository';

/**
 * GET /api/tiers
 *
 * Returns tier progression data for the Tiers page including user progress,
 * next tier targets, VIP system settings, and tier cards with aggregated rewards.
 *
 * References:
 * - API_CONTRACTS.md lines 5604-6190 (GET /api/tiers)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)
 *
 * Request: Requires auth-token cookie
 * Response: TiersPageResponse with user, progress, vipSystem, tiers[]
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
      console.error('[Tiers] CLIENT_ID not configured');
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

    // Step 4: Verify user belongs to this client (multitenancy)
    // Per ARCHITECTURE.md Section 10.3 (Tenant Isolation Pattern)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied.',
        },
        { status: 403 }
      );
    }

    // Step 5: Call tier service to get complete tiers page data
    // Service handles: tier filtering, rewards aggregation, progress calculations,
    // VIP metric formatting, expiration logic
    const tiersResponse = await getTiersPageData(user.id, clientId);

    // Step 6: Return tiers response
    // Per API_CONTRACTS.md lines 5619-5689
    return NextResponse.json(tiersResponse, { status: 200 });

  } catch (error) {
    console.error('[Tiers] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch tiers data',
      },
      { status: 500 }
    );
  }
}
