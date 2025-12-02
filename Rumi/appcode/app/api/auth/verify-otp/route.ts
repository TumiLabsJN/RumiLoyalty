import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';
import { createClient } from '@/lib/supabase/server-client';

/**
 * POST /api/auth/verify-otp
 *
 * Verify 6-digit OTP code and create authenticated session.
 *
 * References:
 * - API_CONTRACTS.md lines 444-722 (POST /api/auth/verify-otp)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: { code } + otp_session cookie
 * Response: { success, verified, userId, sessionToken }
 * Sets HTTP-only cookie: auth-token (30 days)
 * Clears HTTP-only cookie: otp_session
 */

// OTP code validation regex (6 digits)
const OTP_REGEX = /^\d{6}$/;

export async function POST(request: NextRequest) {
  try {
    // 1. Get session ID from HTTP-only cookie
    const sessionId = request.cookies.get('otp_session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'SESSION_NOT_FOUND',
          message: 'OTP session expired. Please sign up again.',
        },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const { code } = body;

    // 3. Validate code format (6 digits)
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          error: 'CODE_REQUIRED',
          message: 'Verification code is required',
        },
        { status: 400 }
      );
    }

    if (!OTP_REGEX.test(code)) {
      return NextResponse.json(
        {
          error: 'INVALID_CODE_FORMAT',
          message: 'Code must be 6 digits',
        },
        { status: 400 }
      );
    }

    // 4. Call auth service to verify OTP
    // CR-001: This now returns session tokens captured during signup
    const result = await authService.verifyOTP(sessionId, code);

    // 5. CR-001: Set Supabase session using tokens from signup
    // If tokens are available, set the session to auto-login the user
    let sessionSet = false;
    if (result.accessToken && result.refreshToken) {
      try {
        const supabase = await createClient();
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });

        if (setSessionError) {
          console.error('[verify-otp] Failed to set session:', setSessionError);
          // Don't throw - user can still login manually
        } else {
          sessionSet = true;
          console.log('[verify-otp] Session set successfully for user:', result.userId);
        }
      } catch (e) {
        console.error('[verify-otp] Exception setting session:', e);
      }
    }

    // 6. Build response per API_CONTRACTS.md lines 466-473
    const response = NextResponse.json(
      {
        success: true,
        verified: true,
        userId: result.userId,
        sessionSet, // CR-001: Indicates if auto-login succeeded
        message: sessionSet
          ? 'Email verified successfully'
          : 'Email verified. Please login to continue.',
      },
      { status: 200 }
    );

    // 7. Set auth-token cookie if session was set (30 days per API_CONTRACTS.md line 631)
    // CR-001: Use access_token as auth-token for session tracking
    if (sessionSet && result.accessToken) {
      response.cookies.set('auth-token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2592000, // 30 days
      });
    }

    // 8. Clear OTP session cookie per API_CONTRACTS.md line 632
    response.cookies.set('otp_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0, // Immediately expire
    });

    return response;

  } catch (error) {
    // Handle specific business errors with appropriate error codes
    if (error instanceof BusinessError) {
      // Map service errors to API error codes per API_CONTRACTS.md lines 638-694
      const errorMap: Record<string, { code: string; message: string; status: number }> = {
        'INVALID_OTP': { code: 'INVALID_OTP', message: (error as BusinessError).message, status: 400 },
        'OTP_NOT_FOUND': { code: 'INVALID_SESSION', message: 'OTP session not found or already used. Please sign up again.', status: 400 },
        'OTP_ALREADY_USED': { code: 'OTP_ALREADY_USED', message: 'This code has already been used. Please request a new one.', status: 400 },
        'OTP_EXPIRED': { code: 'OTP_EXPIRED', message: 'This code has expired. Please request a new one.', status: 400 },
        'OTP_MAX_ATTEMPTS': { code: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Please sign up again.', status: 400 },
        'USER_NOT_FOUND': { code: 'INVALID_SESSION', message: 'User account not found.', status: 400 },
      };

      const mappedError = errorMap[error.code];
      if (mappedError) {
        const responseBody: Record<string, unknown> = {
          error: mappedError.code,
          message: mappedError.message,
        };

        // Include attemptsRemaining for INVALID_OTP errors if present in message
        if (error.code === 'INVALID_OTP') {
          const attemptsMatch = error.message.match(/(\d+) attempt/);
          if (attemptsMatch) {
            responseBody.attemptsRemaining = parseInt(attemptsMatch[1], 10);
          }
        }

        return NextResponse.json(responseBody, { status: mappedError.status });
      }
    }

    console.error('verify-otp error:', error);
    return formatErrorResponse(error);
  }
}
