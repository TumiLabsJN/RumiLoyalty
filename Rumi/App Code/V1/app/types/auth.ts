// /app/types/auth.ts
// Type definitions for Authentication API endpoints
// Source: API_CONTRACTS.md (lines 34-181)

// ============================================================================
// POST /api/auth/check-handle
// ============================================================================

/**
 * Request body for checking if a TikTok handle exists
 * Used at /login/start to determine routing
 */
export interface CheckHandleRequest {
  handle: string  // TikTok handle (without @ symbol, already stripped by frontend)
}

/**
 * Response from check-handle endpoint
 * Determines if user should sign up or log in
 */
export interface CheckHandleResponse {
  exists: boolean             // Does this handle exist in Supabase users table?
  has_email: boolean          // Does user have email registered?
  route: 'signup' | 'login'   // Where to send the user next
  handle: string              // Normalized handle with @ prefix
}

/**
 * Error response structure for auth endpoints
 */
export interface AuthErrorResponse {
  error: string               // Error code (e.g., "HANDLE_REQUIRED")
  message: string             // Human-readable error message
}

// ============================================================================
// POST /api/auth/signup
// ============================================================================

/**
 * Request body for user signup
 * Used at /login/signup after handle validation
 */
export interface SignupRequest {
  handle: string          // TikTok handle with @ prefix (from sessionStorage or server session)
  email: string           // User's email address (must be valid format)
  password: string        // Plaintext password (min 8, max 128 chars, hashed server-side with bcrypt rounds=10)
  agreedToTerms: boolean  // Must be true (includes consent timestamp + version)
}

/**
 * Response from signup endpoint
 * Triggers OTP email and routes to /login/otp
 */
export interface SignupResponse {
  success: boolean
  otpSent: boolean        // Confirms OTP email was sent successfully
  sessionId: string       // For OTP verification tracking (stored in HTTP-only cookie)
  userId: string          // UUID of created user
}

// ============================================================================
// GET /api/clients/{clientId}/terms
// ============================================================================

/**
 * Response from terms of use endpoint
 * Pre-fetched server-side for SSR (no loading state)
 */
export interface TermsResponse {
  content: string         // HTML content of Terms of Use
  lastUpdated: string     // ISO date: "2025-01-18"
  version: string         // e.g., "2.1"
}

// ============================================================================
// GET /api/clients/{clientId}/privacy
// ============================================================================

/**
 * Response from privacy policy endpoint
 * Pre-fetched server-side for SSR (no loading state)
 */
export interface PrivacyResponse {
  content: string         // HTML content of Privacy Policy
  lastUpdated: string     // ISO date: "2025-01-18"
  version: string         // e.g., "1.3"
}

// ============================================================================
// POST /api/auth/verify-otp
// ============================================================================

/**
 * Request body for OTP verification
 * Used at /login/otp after signup
 */
export interface VerifyOtpRequest {
  code: string           // 6-digit OTP code entered by user
}

/**
 * Response from verify-otp endpoint
 * Creates authenticated session on success
 */
export interface VerifyOtpResponse {
  success: boolean
  verified: boolean      // True if OTP is valid
  userId: string         // UUID of authenticated user
  sessionToken: string   // JWT token for authenticated session (stored in HTTP-only cookie)
}

/**
 * Error response from verify-otp (extends AuthErrorResponse)
 * Includes attempts remaining for user feedback
 */
export interface VerifyOtpErrorResponse extends AuthErrorResponse {
  attemptsRemaining?: number  // Number of attempts left (if applicable)
}

// ============================================================================
// POST /api/auth/resend-otp
// ============================================================================

/**
 * Request body for resending OTP
 * Empty body - session_id from HTTP-only cookie
 */
export interface ResendOtpRequest {
  // Empty - session tracked via cookie
}

/**
 * Response from resend-otp endpoint
 * Confirms new OTP sent with expiration info
 */
export interface ResendOtpResponse {
  success: boolean
  sent: boolean              // Confirms new OTP email was sent
  expiresAt: string          // ISO timestamp when new OTP expires
  remainingSeconds: number   // Seconds until expiration (for countdown timer)
}

// ============================================================================
// POST /api/auth/login
// ============================================================================

/**
 * Request body for user login (Welcome Back page)
 * Used at /login/wb for existing users with password
 */
export interface LoginRequest {
  handle: string      // TikTok handle with @ prefix (from sessionStorage, set by check-handle)
  password: string    // Plaintext password (validated by backend with bcrypt)
}

/**
 * Response from login endpoint
 * Creates authenticated session on success
 */
export interface LoginResponse {
  success: boolean
  userId: string         // UUID of authenticated user
  sessionToken: string   // JWT token for authenticated session (stored in HTTP-only cookie)
}

// ============================================================================
// GET /api/auth/user-status
// ============================================================================

/**
 * Response from user-status endpoint
 * Determines routing after authentication (loading page)
 */
export interface UserStatusResponse {
  userId: string         // UUID of authenticated user
  isRecognized: boolean  // Has logged in before (last_login_at IS NOT NULL)
  redirectTo: string     // Backend-determined route ("/home" or "/login/welcomeunr")
  emailVerified: boolean // Email verification status (for debugging)
}
