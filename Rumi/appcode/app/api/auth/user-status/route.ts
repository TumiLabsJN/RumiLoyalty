import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { formatErrorResponse } from '@/lib/utils/errors';

/**
 * GET /api/auth/user-status
 *
 * Determine authenticated user's recognition status and routing destination.
 *
 * References:
 * - API_CONTRACTS.md lines 1143-1297 (GET /api/auth/user-status)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: Requires auth-token cookie
 * Response: { userId, isRecognized, redirectTo, emailVerified }
 *
 * Recognition Logic:
 * - last_login_at IS NULL → First login → redirectTo="/login/welcomeunr"
 * - last_login_at IS NOT NULL → Returning user → redirectTo="/home"
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token BEFORE any database queries (line 1281)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      // Return 401 UNAUTHORIZED per API_CONTRACTS.md lines 1259-1264
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Please log in to continue.',
        },
        { status: 401 }
      );
    }

    // Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('CLIENT_ID not configured in environment');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Step 2: Query user info (id, email_verified, last_login_at) per lines 1200-1206
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

    // Step 3: Determine recognition status per lines 1208-1211
    // last_login_at IS NULL → First login (isRecognized=false)
    // last_login_at IS NOT NULL → Returning user (isRecognized=true)
    const isRecognized = user.lastLoginAt !== null;

    // Step 4: Determine routing destination per lines 1213-1215
    // First-time users → /login/welcomeunr
    // Returning users → /home
    const redirectTo = isRecognized ? '/home' : '/login/welcomeunr';

    // Step 5: Update last_login_at AFTER checking recognition status per lines 1217-1224
    // CRITICAL: Do this AFTER checking so first-time users are properly detected
    await userRepository.updateLastLogin(clientId, user.id);

    // Step 6: Return response per lines 1165-1170
    // Only expose userId (UUID), emailVerified - NO sensitive data (line 1278)
    return NextResponse.json(
      {
        userId: user.id,
        isRecognized: isRecognized,
        redirectTo: redirectTo,
        emailVerified: user.emailVerified ?? false,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('user-status error:', error);
    return formatErrorResponse(error);
  }
}
