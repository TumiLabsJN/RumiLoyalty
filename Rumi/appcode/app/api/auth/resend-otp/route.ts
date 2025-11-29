import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';

/**
 * POST /api/auth/resend-otp
 *
 * Invalidate old OTP and send new verification code to user's email.
 *
 * References:
 * - API_CONTRACTS.md lines 725-939 (POST /api/auth/resend-otp)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: Empty body + otp_session cookie
 * Response: { success, sent, expiresAt, remainingSeconds }
 */

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

    // 2. Call auth service to resend OTP
    // Service handles: query OTP, rate limit, invalidate old, generate new, send email
    const result = await authService.resendOTP(sessionId);

    // 3. Build response per API_CONTRACTS.md lines 746-753
    return NextResponse.json(
      {
        success: result.success,
        sent: result.sent,
        expiresAt: result.expiresAt,
        remainingSeconds: result.remainingSeconds,
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle specific business errors with appropriate error codes
    if (error instanceof BusinessError) {
      // Map service errors to API error codes per API_CONTRACTS.md lines 881-912
      const errorMap: Record<string, { code: string; message: string; status: number }> = {
        'INVALID_SESSION': { code: 'INVALID_SESSION', message: 'OTP session not found. Please sign up again.', status: 400 },
        'RESEND_TOO_SOON': { code: 'RESEND_TOO_SOON', message: (error as BusinessError).message, status: 429 },
        'USER_NOT_FOUND': { code: 'INVALID_SESSION', message: 'User account not found.', status: 400 },
        'CLIENT_NOT_FOUND': { code: 'INTERNAL_ERROR', message: 'Server configuration error.', status: 500 },
        'EMAIL_SEND_FAILED': { code: 'EMAIL_SEND_FAILED', message: 'Failed to send verification email. Please try again.', status: 500 },
      };

      const mappedError = errorMap[error.code];
      if (mappedError) {
        return NextResponse.json(
          {
            error: mappedError.code,
            message: mappedError.message,
          },
          { status: mappedError.status }
        );
      }
    }

    console.error('resend-otp error:', error);
    return formatErrorResponse(error);
  }
}
