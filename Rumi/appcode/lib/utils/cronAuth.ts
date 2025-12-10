/**
 * Cron Authentication Utility
 *
 * References:
 * - Loyalty.md lines 252-260 (Cron Job Security with Vercel cron secret validation)
 * - Loyalty.md line 258 (CRON_SECRET environment variable)
 * - Loyalty.md lines 227-229 (System Routes requiring cron secret)
 *
 * Validates cron job requests using constant-time comparison to prevent timing attacks.
 * Used on:
 * - /api/cron/daily-automation (single combined route for data sync + tier calculation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Cron auth error response
 */
export interface CronAuthErrorResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Validate cron secret from request
 *
 * Uses constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks.
 * The secret should be passed in the Authorization header as: "Bearer {secret}"
 *
 * @param request - NextRequest object
 * @returns true if valid, throws error if invalid
 * @throws Error if CRON_SECRET is not configured (deployment failure)
 */
export function validateCronSecret(request: NextRequest): boolean {
  // Get CRON_SECRET from environment
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not set, this is a deployment/configuration error
  if (!cronSecret) {
    throw new Error('CRON_SECRET environment variable is not configured');
  }

  // Extract secret from Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return false;
  }

  // Parse "Bearer {secret}" format
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedSecret = authHeader.slice(7); // Remove "Bearer " prefix

  // Use constant-time comparison to prevent timing attacks
  // Both strings must be same length for timingSafeEqual
  try {
    const secretBuffer = Buffer.from(cronSecret, 'utf8');
    const providedBuffer = Buffer.from(providedSecret, 'utf8');

    // If lengths differ, comparison will fail (but still takes constant time)
    if (secretBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(secretBuffer, providedBuffer);
  } catch {
    // If anything goes wrong with comparison, reject
    return false;
  }
}

/**
 * Higher-order function that wraps a cron API route handler with secret validation
 *
 * @param handler - The actual cron route handler function
 *
 * @example
 * // In /api/cron/daily-automation/route.ts
 * export const GET = withCronAuth(async (request) => {
 *   // Cron job logic here
 * });
 */
export function withCronAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const isValid = validateCronSecret(request);

      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Unauthorized',
            code: 'INVALID_CRON_SECRET',
            message: 'Invalid or missing cron secret',
          } as CronAuthErrorResponse,
          { status: 401 }
        );
      }

      // Secret validated, call handler
      return handler(request);
    } catch (error) {
      // CRON_SECRET not configured - this is a server configuration error
      console.error('[CronAuth] Configuration error:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'CRON_NOT_CONFIGURED',
          message: 'Cron authentication is not properly configured',
        } as CronAuthErrorResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Standalone cron auth check for use within route handlers
 * Useful when you need more control over the authentication flow
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const authResult = checkCronAuth(request);
 *   if (authResult.error) {
 *     return authResult.error; // Returns 401 response
 *   }
 *   // Continue with cron job logic
 * }
 */
export function checkCronAuth(
  request: NextRequest
): { valid: true; error: null } | { valid: false; error: NextResponse } {
  try {
    const isValid = validateCronSecret(request);

    if (!isValid) {
      return {
        valid: false,
        error: NextResponse.json(
          {
            error: 'Unauthorized',
            code: 'INVALID_CRON_SECRET',
            message: 'Invalid or missing cron secret',
          } as CronAuthErrorResponse,
          { status: 401 }
        ),
      };
    }

    return { valid: true, error: null };
  } catch (error) {
    console.error('[CronAuth] Configuration error:', error);
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'CRON_NOT_CONFIGURED',
          message: 'Cron authentication is not properly configured',
        } as CronAuthErrorResponse,
        { status: 500 }
      ),
    };
  }
}
