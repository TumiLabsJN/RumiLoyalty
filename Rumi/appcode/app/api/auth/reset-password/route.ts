import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';

/**
 * POST /api/auth/reset-password
 *
 * Verify reset token and update user's password.
 *
 * References:
 * - API_CONTRACTS.md lines 1623-1768 (POST /api/auth/reset-password)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: { token, newPassword }
 * Response: { success, message }
 */

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { token, newPassword } = body;

    // Validate required fields
    if (!token || !newPassword) {
      return NextResponse.json(
        {
          error: 'MISSING_FIELDS',
          message: 'Please provide token and new password.',
        },
        { status: 400 }
      );
    }

    // Validate token is string
    if (typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        {
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired reset link. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Validate password is string
    if (typeof newPassword !== 'string') {
      return NextResponse.json(
        {
          error: 'MISSING_FIELDS',
          message: 'Please provide token and new password.',
        },
        { status: 400 }
      );
    }

    // Validate password length (8-128 chars per API_CONTRACTS.md lines 1636, 1723, 1759-1760)
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters.',
        },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        {
          error: 'WEAK_PASSWORD',
          message: 'Password must be at most 128 characters.',
        },
        { status: 400 }
      );
    }

    // Call auth service to reset password
    // Service handles: find token, validate (exists, not expired, not used), update password, mark used
    const result = await authService.resetPassword(token, newPassword);

    // Build response per API_CONTRACTS.md lines 1661-1667
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle specific business errors
    if (error instanceof BusinessError) {
      // Map service errors to API error codes per API_CONTRACTS.md lines 1715-1725
      const errorMap: Record<string, { code: string; message: string; status: number }> = {
        'INVALID_TOKEN': {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset link. Please request a new one.',
          status: 400
        },
        'TOKEN_EXPIRED': {
          code: 'TOKEN_EXPIRED',
          message: 'This reset link has expired. Please request a new one.',
          status: 400
        },
        'TOKEN_USED': {
          code: 'TOKEN_USED',
          message: 'This reset link has already been used. Please request a new one.',
          status: 400
        },
        'WEAK_PASSWORD': {
          code: 'WEAK_PASSWORD',
          message: (error as BusinessError).message,
          status: 400
        },
        'INTERNAL_ERROR': {
          code: 'UPDATE_FAILED',
          message: 'Failed to update password. Please try again.',
          status: 500
        },
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

    console.error('reset-password error:', error);
    return formatErrorResponse(error);
  }
}
