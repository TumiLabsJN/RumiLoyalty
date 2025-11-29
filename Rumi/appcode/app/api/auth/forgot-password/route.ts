import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';

/**
 * POST /api/auth/forgot-password
 *
 * Generate password reset token and send email with reset link.
 *
 * References:
 * - API_CONTRACTS.md lines 1464-1614 (POST /api/auth/forgot-password)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: { identifier } (email OR handle)
 * Response: { sent, emailHint, expiresIn }
 *
 * SECURITY: Always returns 200 even if user not found (anti-enumeration)
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Handle validation regex (alphanumeric, underscore, period, 1-30 chars, optional @ prefix)
const HANDLE_REGEX = /^@?[a-zA-Z0-9_.]{1,30}$/;

/**
 * Check if identifier looks like an email or a handle
 */
function isValidIdentifier(identifier: string): boolean {
  return EMAIL_REGEX.test(identifier) || HANDLE_REGEX.test(identifier);
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { identifier } = body;

    // Validate identifier is provided
    if (!identifier || typeof identifier !== 'string' || identifier.trim() === '') {
      return NextResponse.json(
        {
          error: 'MISSING_IDENTIFIER',
          message: 'Please provide an email or handle.',
        },
        { status: 400 }
      );
    }

    const trimmedIdentifier = identifier.trim();

    // Validate identifier format (email or handle)
    if (!isValidIdentifier(trimmedIdentifier)) {
      return NextResponse.json(
        {
          error: 'INVALID_IDENTIFIER',
          message: 'Please provide a valid email or handle.',
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

    // Call auth service to handle forgot password
    // Service handles: lookup user, anti-enumeration, rate limit, generate token, send email
    const result = await authService.forgotPassword(clientId, trimmedIdentifier);

    // Build response per API_CONTRACTS.md lines 1506-1512
    // ALWAYS returns 200 (anti-enumeration) - service handles this
    return NextResponse.json(
      {
        sent: result.sent,
        emailHint: result.emailHint,
        expiresIn: result.expiresIn,
      },
      { status: 200 }
    );

  } catch (error) {
    // Handle specific business errors
    if (error instanceof BusinessError) {
      // Map service errors to API error codes per API_CONTRACTS.md lines 1560-1573
      const errorMap: Record<string, { code: string; message: string; status: number }> = {
        'RATE_LIMITED': {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many reset requests. Please try again in 1 hour.',
          status: 429
        },
        'EMAIL_SEND_FAILED': {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send reset email. Please try again.',
          status: 500
        },
        'CLIENT_NOT_FOUND': {
          code: 'INTERNAL_ERROR',
          message: 'Server configuration error.',
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

    console.error('forgot-password error:', error);
    return formatErrorResponse(error);
  }
}
