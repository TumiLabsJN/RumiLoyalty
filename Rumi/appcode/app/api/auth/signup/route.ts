import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';

/**
 * POST /api/auth/signup
 *
 * Create new user account with email + password, send OTP verification email.
 *
 * References:
 * - API_CONTRACTS.md lines 189-437 (POST /api/auth/signup)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: { handle, email, password, agreedToTerms }
 * Response: { success, otpSent, sessionId, userId }
 * Sets HTTP-only cookie: otp_session
 */

// Email validation regex per API_CONTRACTS.md line 254
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { handle, email, password, agreedToTerms } = body;

    // Validate handle
    if (!handle || typeof handle !== 'string' || handle.trim() === '') {
      return NextResponse.json(
        {
          error: 'HANDLE_REQUIRED',
          message: 'TikTok handle is required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        {
          error: 'INVALID_EMAIL',
          message: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password length (min 8, max 128)
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          error: 'PASSWORD_REQUIRED',
          message: 'Password is required',
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: 'PASSWORD_TOO_SHORT',
          message: 'Password must be at least 8 characters',
        },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        {
          error: 'PASSWORD_TOO_LONG',
          message: 'Password must be less than 128 characters',
        },
        { status: 400 }
      );
    }

    // Validate terms agreement
    if (agreedToTerms !== true) {
      return NextResponse.json(
        {
          error: 'TERMS_NOT_ACCEPTED',
          message: 'You must agree to the terms and conditions',
        },
        { status: 400 }
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

    // Call auth service to initiate signup
    const result = await authService.initiateSignup(
      clientId,
      handle.trim(),
      email.trim(),
      password
    );

    // Build response per API_CONTRACTS.md lines 214-219
    const response = NextResponse.json(
      {
        success: result.success,
        otpSent: true,
        sessionId: result.sessionId,
        userId: result.userId,
        message: result.message,
        email: result.email, // Masked email for display
      },
      { status: 201 }
    );

    // Set HTTP-only cookie for OTP session tracking
    // Max-Age=300 (5 minutes) per API_CONTRACTS.md line 355
    response.cookies.set('otp_session', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300, // 5 minutes
    });

    return response;

  } catch (error) {
    // Handle specific business errors
    if (error instanceof BusinessError) {
      // Map service errors to API error codes
      const errorMap: Record<string, { code: string; message: string }> = {
        'HANDLE_EXISTS': { code: 'HANDLE_ALREADY_EXISTS', message: 'This TikTok handle is already registered' },
        'EMAIL_EXISTS': { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists' },
      };

      const mappedError = errorMap[error.code];
      if (mappedError) {
        return NextResponse.json(
          {
            error: mappedError.code,
            message: mappedError.message,
          },
          { status: 400 }
        );
      }
    }

    console.error('signup error:', error);
    return formatErrorResponse(error);
  }
}
