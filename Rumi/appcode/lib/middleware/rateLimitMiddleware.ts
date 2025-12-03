/**
 * Rate Limit Middleware
 *
 * References:
 * - Loyalty.md lines 181, 198 (Rate limiting as security layer)
 * - Loyalty.md lines 206-230 (API Route Inventory with rate limits)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * Provides wrapper function for Next.js API routes to enforce rate limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { getClientIP, checkRateLimit } from '../utils/rateLimit';

/**
 * Rate limit error response
 */
export interface RateLimitErrorResponse {
  error: string;
  code: string;
  retryAfter: number;
  message: string;
}

/**
 * Identifier extractor function type
 * Can extract IP (for auth routes) or userId (for authenticated routes)
 */
export type IdentifierExtractor = (request: NextRequest) => string | Promise<string>;

/**
 * Default IP-based identifier extractor
 */
export const ipIdentifier: IdentifierExtractor = (request: NextRequest) => {
  return getClientIP(request);
};

/**
 * Create a user-based identifier extractor
 * Extracts user ID from auth-token cookie or request context
 */
export const userIdentifier = (userId: string): string => {
  return `user:${userId}`;
};

/**
 * Higher-order function that wraps an API route handler with rate limiting
 *
 * @param limiter - The Upstash rate limiter instance to use
 * @param handler - The actual route handler function
 * @param getIdentifier - Function to extract the rate limit identifier (default: IP-based)
 *
 * @example
 * // IP-based rate limiting (for auth routes)
 * export const POST = withRateLimit(loginLimiter, async (request) => {
 *   // handler logic
 * });
 *
 * @example
 * // User-based rate limiting (for authenticated routes)
 * export const POST = withRateLimit(claimLimiter, async (request) => {
 *   // handler logic
 * }, async (request) => {
 *   const userId = await getUserIdFromRequest(request);
 *   return userIdentifier(userId);
 * });
 */
export function withRateLimit<T extends NextRequest>(
  limiter: Ratelimit,
  handler: (request: T) => Promise<NextResponse>,
  getIdentifier: IdentifierExtractor = ipIdentifier
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    try {
      // Extract identifier (IP or userId)
      const identifier = await getIdentifier(request);

      // Check rate limit
      const result = await checkRateLimit(limiter, identifier);

      if (!result.success) {
        // Calculate retry-after in seconds
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

        const errorResponse: RateLimitErrorResponse = {
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: retryAfter > 0 ? retryAfter : 1,
          message: `Rate limit exceeded. Please try again in ${retryAfter > 0 ? retryAfter : 1} seconds.`,
        };

        return NextResponse.json(errorResponse, {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter > 0 ? retryAfter : 1),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.reset),
          },
        });
      }

      // Rate limit passed, call the actual handler
      const response = await handler(request);

      // Add rate limit headers to successful response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', String(result.limit));
      headers.set('X-RateLimit-Remaining', String(result.remaining));
      headers.set('X-RateLimit-Reset', String(result.reset));

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // If rate limiting fails (e.g., Redis unavailable), log and allow request
      // This is a fail-open approach to prevent service disruption
      console.error('[RateLimit] Error checking rate limit:', error);

      // Still call the handler - fail open for availability
      return handler(request);
    }
  };
}

/**
 * Standalone rate limit check function for use within route handlers
 * Useful when you need more control over the rate limit response
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await checkRouteRateLimit(loginLimiter, request);
 *   if (rateLimitResult) {
 *     return rateLimitResult; // Returns 429 response
 *   }
 *   // Continue with handler logic
 * }
 */
export async function checkRouteRateLimit(
  limiter: Ratelimit,
  request: NextRequest,
  getIdentifier: IdentifierExtractor = ipIdentifier
): Promise<NextResponse | null> {
  const identifier = await getIdentifier(request);
  const result = await checkRateLimit(limiter, identifier);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    const errorResponse: RateLimitErrorResponse = {
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: retryAfter > 0 ? retryAfter : 1,
      message: `Rate limit exceeded. Please try again in ${retryAfter > 0 ? retryAfter : 1} seconds.`,
    };

    return NextResponse.json(errorResponse, {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter > 0 ? retryAfter : 1),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
      },
    });
  }

  return null; // Rate limit passed
}
