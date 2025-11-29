/**
 * Simple in-memory rate limiter for login attempts
 *
 * References:
 * - API_CONTRACTS.md line 1044, 1112, 1114 (5 failed attempts in 15 minutes)
 *
 * NOTE: This is an in-memory implementation suitable for single-server MVP.
 * For production with multiple servers, use Redis/Upstash (@upstash/ratelimit).
 */

interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

// In-memory store for rate limiting
// Key: clientId:handle (lowercase)
const loginAttempts = new Map<string, RateLimitEntry>();

// Configuration per API_CONTRACTS.md
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Clean up expired entries (call periodically)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    // Remove if window has passed and not locked
    if (!entry.lockedUntil && now - entry.firstAttemptAt > WINDOW_MS) {
      loginAttempts.delete(key);
    }
    // Remove if lockout has expired
    if (entry.lockedUntil && now > entry.lockedUntil) {
      loginAttempts.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check if a handle is currently rate limited
 *
 * @param clientId - Tenant ID
 * @param handle - TikTok handle (will be normalized)
 * @returns Object with isLimited flag and retryAfterSeconds if limited
 */
export function checkLoginRateLimit(
  clientId: string,
  handle: string
): { isLimited: boolean; retryAfterSeconds?: number } {
  const key = `${clientId}:${handle.toLowerCase().replace('@', '')}`;
  const entry = loginAttempts.get(key);
  const now = Date.now();

  if (!entry) {
    return { isLimited: false };
  }

  // Check if locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { isLimited: true, retryAfterSeconds };
  }

  // Check if lockout expired
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    loginAttempts.delete(key);
    return { isLimited: false };
  }

  // Check if window expired (reset attempts)
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { isLimited: false };
  }

  return { isLimited: false };
}

/**
 * Record a failed login attempt
 *
 * @param clientId - Tenant ID
 * @param handle - TikTok handle (will be normalized)
 * @returns Object with isLocked flag if account is now locked
 */
export function recordFailedLogin(
  clientId: string,
  handle: string
): { isLocked: boolean; attemptsRemaining: number } {
  const key = `${clientId}:${handle.toLowerCase().replace('@', '')}`;
  const now = Date.now();
  let entry = loginAttempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    // Start new window
    entry = {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    };
    loginAttempts.set(key, entry);
    return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
  }

  // Increment attempts
  entry.attempts += 1;

  // Check if should lock
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(key, entry);
    return { isLocked: true, attemptsRemaining: 0 };
  }

  loginAttempts.set(key, entry);
  return { isLocked: false, attemptsRemaining: MAX_ATTEMPTS - entry.attempts };
}

/**
 * Clear rate limit for a handle (call on successful login)
 *
 * @param clientId - Tenant ID
 * @param handle - TikTok handle
 */
export function clearLoginRateLimit(clientId: string, handle: string): void {
  const key = `${clientId}:${handle.toLowerCase().replace('@', '')}`;
  loginAttempts.delete(key);
}
