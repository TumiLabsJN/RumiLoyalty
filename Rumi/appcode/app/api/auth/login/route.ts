import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';
import { checkLoginRateLimit, recordFailedLogin, clearLoginRateLimit } from '@/lib/utils/rateLimiter';

/**
 * POST /api/auth/login
 *
 * Authenticates existing user with handle and password, creates authenticated session.
 *
 * References:
 * - API_CONTRACTS.md lines 948-1118 (POST /api/auth/login)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Request: { handle, password }
 * Response: { success, userId, sessionToken }
 * Sets HTTP-only cookie: auth-token (7 days)
 */

// Handle validation regex (alphanumeric, underscore, period, 1-30 chars)
const HANDLE_REGEX = /^@?[a-zA-Z0-9_.]{1,30}$/;

export async function POST(request: NextRequest) {
  // Parse request body outside try-catch to have handle available in catch
  const body = await request.json().catch(() => ({}));
  const { handle, password } = body;

  try {

    // Validate required fields
    if (!handle || !password) {
      return NextResponse.json(
        {
          error: 'MISSING_FIELDS',
          message: 'Please provide both handle and password.',
        },
        { status: 400 }
      );
    }

    // Validate handle format
    if (typeof handle !== 'string' || !HANDLE_REGEX.test(handle)) {
      return NextResponse.json(
        {
          error: 'INVALID_HANDLE',
          message: 'Handle must start with @ and be 3-30 characters.',
        },
        { status: 400 }
      );
    }

    // Validate password is string
    if (typeof password !== 'string') {
      return NextResponse.json(
        {
          error: 'MISSING_FIELDS',
          message: 'Please provide both handle and password.',
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

    // Check rate limit before attempting login (5 failed attempts in 15 minutes)
    const rateLimitCheck = checkLoginRateLimit(clientId, handle);
    if (rateLimitCheck.isLimited) {
      console.log(`[AUTH] Login blocked (rate limited): handle=${handle}`);
      return NextResponse.json(
        {
          error: 'ACCOUNT_LOCKED',
          message: 'Too many failed login attempts. Please try again in 15 minutes or reset your password.',
        },
        { status: 429 }
      );
    }

    // Call auth service to login
    const result = await authService.login(clientId, handle, password);

    // Clear rate limit on successful login
    clearLoginRateLimit(clientId, handle);

    // Get session tokens from login result (returned by authService.login)
    const sessionToken = result.accessToken;
    const refreshToken = result.refreshToken;

    // DEBUG: Log token status
    console.log('[AUTH] Tokens from authService:', {
      hasAccessToken: !!sessionToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: sessionToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });

    // Build response per API_CONTRACTS.md lines 987-993
    const response = NextResponse.json(
      {
        success: true,
        userId: result.userId,
        sessionToken: sessionToken,
      },
      { status: 200 }
    );

    // Set auth-token HTTP-only cookie (30 days - aligned with OTP flow)
    if (sessionToken) {
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2592000, // 30 days
      });
    }

    // BUG-AUTH-COOKIE-SESSION Fix: Set refresh token cookie for session refresh
    // Required for middleware to refresh expired access tokens
    if (refreshToken) {
      response.cookies.set('auth-refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2592000, // 30 days
      });
    }

    // Log successful login for security auditing (per line 1117)
    console.log(`[AUTH] Login success: handle=${handle}, userId=${result.userId}`);

    return response;

  } catch (error) {
    // Log failed login attempt for security auditing
    const failedHandle = handle || 'unknown';
    console.log(`[AUTH] Login failed: handle=${failedHandle}, error=${error instanceof Error ? error.message : 'unknown'}`);

    // Handle specific business errors with appropriate error codes
    if (error instanceof BusinessError) {
      // Record failed attempt for rate limiting (only for credential errors)
      if (error.code === 'INVALID_CREDENTIALS' && handle && process.env.CLIENT_ID) {
        const rateLimitResult = recordFailedLogin(process.env.CLIENT_ID, handle);
        if (rateLimitResult.isLocked) {
          console.log(`[AUTH] Account locked after 5 failed attempts: handle=${failedHandle}`);
          return NextResponse.json(
            {
              error: 'ACCOUNT_LOCKED',
              message: 'Too many failed login attempts. Please try again in 15 minutes or reset your password.',
            },
            { status: 429 }
          );
        }
      }

      // Map service errors to API error codes per API_CONTRACTS.md lines 1059-1105
      const errorMap: Record<string, { code: string; message: string; status: number }> = {
        'INVALID_CREDENTIALS': {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect handle or password. Please try again.',
          status: 401
        },
        'EMAIL_NOT_VERIFIED': {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before logging in. Check your inbox for the verification link.',
          status: 403
        },
        'ACCOUNT_LOCKED': {
          code: 'ACCOUNT_LOCKED',
          message: 'Too many failed login attempts. Please try again in 15 minutes or reset your password.',
          status: 429
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

    console.error('login error:', error);
    return formatErrorResponse(error);
  }
}
