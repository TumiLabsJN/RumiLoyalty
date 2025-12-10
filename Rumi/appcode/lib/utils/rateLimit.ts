/**
 * Rate Limiting Utility
 *
 * References:
 * - Loyalty.md lines 181, 198, 232-234 (Rate Limiting with Upstash Redis)
 * - Loyalty.md lines 206-230 (API Route Inventory with rate limits)
 *
 * Rate limits per Loyalty.md:
 * - login: 5/min per IP
 * - signup: 3/min per IP
 * - reset-password: 3/min per IP
 * - claim: 10/hour per user
 * - cron: 1/day per route
 * - OTP resend: 1/60s per user
 * - forgot-password: 3/hour per email
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Export redis client for direct access if needed
export { redis };

/**
 * Login rate limiter: 5 requests per minute per IP
 * Used on: /api/auth/login
 */
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:login',
  analytics: true,
});

/**
 * Signup rate limiter: 3 requests per minute per IP
 * Used on: /api/auth/signup
 */
export const signupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  prefix: 'ratelimit:signup',
  analytics: true,
});

/**
 * Reset password rate limiter: 3 requests per minute per IP
 * Used on: /api/auth/reset-password
 */
export const resetPasswordLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  prefix: 'ratelimit:reset-password',
  analytics: true,
});

/**
 * Forgot password rate limiter: 3 requests per hour per email
 * Used on: /api/auth/forgot-password
 */
export const forgotPasswordLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:forgot-password',
  analytics: true,
});

/**
 * Claim rate limiter: 10 requests per hour per user
 * Used on: /api/rewards/claim
 */
export const claimLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'ratelimit:claim',
  analytics: true,
});

/**
 * Cron rate limiter: 1 request per day per route
 * Used on: /api/cron/daily-automation (single combined route for data sync + tier calculation)
 */
export const cronLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '1 d'),
  prefix: 'ratelimit:cron',
  analytics: true,
});

/**
 * OTP resend rate limiter: 1 request per 60 seconds per user
 * Used on: /api/auth/resend-otp
 */
export const otpResendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '60 s'),
  prefix: 'ratelimit:otp-resend',
  analytics: true,
});

/**
 * Check rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
}

/**
 * Helper function to check rate limit and return standardized result
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get client IP from request headers
 * Handles X-Forwarded-For for proxied requests (Vercel, etc.)
 */
export function getClientIP(request: Request): string {
  // Check X-Forwarded-For header (set by proxies like Vercel)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback for local development
  return '127.0.0.1';
}
