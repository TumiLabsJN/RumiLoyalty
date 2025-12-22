import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { getMissionHistory } from '@/lib/services/missionService';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/missions/history
 *
 * Returns concluded missions for mission history page (completed rewards + lost raffles).
 *
 * References:
 * - API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.2 (Missions Authorization, lines 1299-1309)
 *
 * Request: Requires auth-token cookie
 * Response: MissionHistoryResponse with user, history[]
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
      console.error('[MissionHistory] CLIENT_ID not configured');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'INTERNAL_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Step 3: Get dashboard data - pass authUser.id directly
    // NOTE: users.id === authUser.id (created atomically in auth_create_user RPC)
    // Multi-tenant isolation enforced by dashboardRepository via client_id parameter
    // TRADE-OFF: 403 TENANT_MISMATCH consolidated into 401 (acceptable for multi-tenant
    // deployment where tenant mismatch indicates data corruption/misconfiguration)
    const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          code: 'USER_NOT_FOUND',
          message: 'User profile not found. Please sign up.',
        },
        { status: 401 }
      );
    }

    // Step 4: Get mission history from service
    const historyResponse = await getMissionHistory(
      authUser.id,
      clientId,
      {
        currentTier: dashboardData.currentTier.id,
        currentTierName: dashboardData.currentTier.name,
        currentTierColor: dashboardData.currentTier.color,
      }
    );

    // Step 6: Return history response
    // Per API_CONTRACTS.md lines 3844-3884
    return NextResponse.json(historyResponse, { status: 200 });

  } catch (error) {
    console.error('[MissionHistory] Unexpected error:', error);
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
