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
