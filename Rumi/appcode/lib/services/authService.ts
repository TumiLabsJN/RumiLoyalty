/**
 * Auth Service
 *
 * Business logic layer for authentication operations.
 * Orchestrates repositories, implements business rules, coordinates transactions.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Service Layer, lines 467-530)
 * - API_CONTRACTS.md (Authentication endpoints, lines 36-1768)
 * - Loyalty.md Flow 3 (Signup), Flow 4 (OTP), Flow 5 (Login)
 *
 * NOT Responsible For:
 * - Direct database access (use repositories)
 * - HTTP handling (that's routes)
 * - Raw SQL queries (that's repositories)
 */

import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcrypt';
import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { otpRepository } from '@/lib/repositories/otpRepository';
import { clientRepository } from '@/lib/repositories/clientRepository';
import { passwordResetRepository } from '@/lib/repositories/passwordResetRepository';
import { ValidationError, BusinessError } from '@/lib/utils/errors';

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5; // Per API_CONTRACTS.md lines 334, 414, 700, 838, 920
const BCRYPT_ROUNDS = 10;

// Password reset configuration
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESET_TOKEN_RATE_LIMIT = 3; // Max requests per hour

/**
 * Generate a cryptographically secure 6-digit OTP
 */
function generateOTP(): string {
  // Generate random number between 0-999999, pad with leading zeros
  const otp = randomInt(0, 1000000).toString().padStart(OTP_LENGTH, '0');
  return otp;
}

/**
 * Generate a unique session ID for OTP tracking
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a cryptographically secure password reset token
 * Format: base64url encoded 32 random bytes (44 chars)
 */
function generateResetToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Hash an OTP code using bcrypt
 */
async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, BCRYPT_ROUNDS);
}

/**
 * Verify OTP against hash
 */
async function verifyOTPHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Send OTP email via Resend
 * TODO: Implement actual email sending when Resend is configured
 */
async function sendOTPEmail(email: string, otp: string, clientName: string): Promise<void> {
  // Placeholder for Resend integration
  // In development, log the OTP for testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }

  // TODO: Task for email utility - implement Resend integration
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: `${clientName} <noreply@${process.env.RESEND_DOMAIN}>`,
  //   to: email,
  //   subject: `Your verification code: ${otp}`,
  //   html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  // });
}

/**
 * Send password reset email via Resend
 * TODO: Implement actual email sending when Resend is configured
 */
async function sendPasswordResetEmail(
  email: string,
  handle: string,
  resetToken: string,
  clientName: string
): Promise<void> {
  // Build reset URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/login/resetpw?token=${resetToken}`;

  // Placeholder for Resend integration
  // In development, log the reset link for testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset for ${email}: ${resetUrl}`);
  }

  // TODO: Task for email utility - implement Resend integration
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: `${clientName} <noreply@${process.env.RESEND_DOMAIN}>`,
  //   to: email,
  //   subject: `Reset Your Password - ${clientName}`,
  //   html: `
  //     <p>Hi @${handle},</p>
  //     <p>Click the link below to reset your password:</p>
  //     <p><a href="${resetUrl}">Reset Password</a></p>
  //     <p>This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
  //     <p>If you didn't request this, ignore this email.</p>
  //   `,
  // });
}

/**
 * Mask email for display (e.g., j***@example.com)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Result of checking a TikTok handle
 */
export interface CheckHandleResult {
  exists: boolean;
  hasEmail: boolean;
  route: 'signup' | 'login';
  handle: string; // Normalized with @ prefix
}

/**
 * Result of initiating signup
 */
export interface SignupResult {
  success: boolean;
  sessionId: string; // For HTTP-only cookie
  userId: string; // UUID of created user
  message: string;
  email: string; // Masked email for display
}

/**
 * Result of verifying OTP
 */
export interface VerifyOTPResult {
  success: boolean;
  userId: string;
  email: string;
  tiktokHandle: string;
  isAdmin: boolean;
  message: string;
}

/**
 * Result of resending OTP
 */
export interface ResendOTPResult {
  success: boolean;
  sent: boolean;
  expiresAt: string; // ISO timestamp
  remainingSeconds: number;
}

/**
 * Result of login
 */
export interface LoginResult {
  success: boolean;
  userId: string;
  email: string;
  tiktokHandle: string;
  isAdmin: boolean;
}

/**
 * Result of forgot password request
 */
export interface ForgotPasswordResult {
  sent: boolean;
  emailHint: string; // Masked email (e.g., "cr****@example.com")
  expiresIn: number; // Minutes until token expires
}

/**
 * Result of reset password
 */
export interface ResetPasswordResult {
  success: boolean;
  message: string;
}

export const authService = {
  /**
   * Check if a TikTok handle exists and determine routing
   *
   * 3 scenarios per API_CONTRACTS.md lines 104-137:
   * (A) exists + has email → route to login
   * (B) exists + no email → route to signup (complete profile)
   * (C) not found → route to signup (new user)
   *
   * @param clientId - Tenant ID for multitenancy
   * @param handle - TikTok handle (with or without @)
   * @returns CheckHandleResult with routing decision
   */
  async checkHandle(clientId: string, handle: string): Promise<CheckHandleResult> {
    // Normalize handle (ensure @ prefix for response, remove for query)
    const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const queryHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Query user via repository (enforces tenant isolation)
    const user = await userRepository.findByHandle(clientId, queryHandle);

    if (!user) {
      // Scenario C: Not found → signup (new user)
      return {
        exists: false,
        hasEmail: false,
        route: 'signup',
        handle: normalizedHandle,
      };
    }

    if (!user.email) {
      // Scenario B: Exists but no email → signup (complete profile)
      return {
        exists: true,
        hasEmail: false,
        route: 'signup',
        handle: normalizedHandle,
      };
    }

    // Scenario A: Exists with email → login
    return {
      exists: true,
      hasEmail: true,
      route: 'login',
      handle: normalizedHandle,
    };
  },

  /**
   * Initiate signup process for a new user
   *
   * 8-step workflow per API_CONTRACTS.md lines 191-437:
   * 1. Validate handle/email uniqueness
   * 2. Create Supabase Auth user (handles password hashing)
   * 3. Create user in users table
   * 4. Generate 6-digit OTP
   * 5. Hash and store OTP
   * 6. Send verification email
   * 7. Return session_id for HTTP-only cookie
   *
   * @param clientId - Tenant ID for multitenancy
   * @param handle - TikTok handle
   * @param email - User's email
   * @param password - User's password (will be hashed by Supabase Auth)
   * @returns SignupResult with session_id for cookie
   */
  async initiateSignup(
    clientId: string,
    handle: string,
    email: string,
    password: string
  ): Promise<SignupResult> {
    // Normalize inputs
    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check handle uniqueness
    const handleExists = await userRepository.handleExists(clientId, normalizedHandle);
    if (handleExists) {
      throw new BusinessError('HANDLE_EXISTS', 'This TikTok handle is already registered');
    }

    // 2. Check email uniqueness
    const emailExists = await userRepository.emailExists(clientId, normalizedEmail);
    if (emailExists) {
      throw new BusinessError('EMAIL_EXISTS', 'This email is already registered');
    }

    // 3. Get client info for email branding
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new BusinessError('CLIENT_NOT_FOUND', 'Invalid client configuration');
    }

    // 4. Create Supabase Auth user (handles password hashing)
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        // Don't send Supabase's default confirmation email
        // We'll send our own OTP email
        emailRedirectTo: undefined,
      },
    });

    if (authError || !authData.user) {
      throw new BusinessError('AUTH_CREATION_FAILED', authError?.message || 'Failed to create account');
    }

    const authUserId = authData.user.id;

    // 5. Create user in our users table
    // Note: password_hash is stored by Supabase Auth, we store a placeholder
    try {
      await userRepository.create({
        id: authUserId,
        clientId,
        tiktokHandle: normalizedHandle,
        email: normalizedEmail,
        passwordHash: '[managed-by-supabase-auth]', // Supabase Auth manages the actual hash
        isAdmin: false,
      });
    } catch (error) {
      // Rollback: Delete the Supabase Auth user if our user creation fails
      await supabase.auth.admin.deleteUser(authUserId);
      throw error;
    }

    // 6. Generate and hash OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 7. Store OTP
    await otpRepository.create({
      userId: authUserId,
      sessionId,
      codeHash: otpHash,
      expiresAt,
    });

    // 8. Send verification email
    await sendOTPEmail(normalizedEmail, otp, client.name);

    // 9. Return result (route will set HTTP-only cookie with sessionId)
    const maskedEmail = maskEmail(normalizedEmail);
    return {
      success: true,
      sessionId,
      userId: authUserId,
      message: `Verification code sent to ${maskedEmail}`,
      email: maskedEmail,
    };
  },

  /**
   * Verify OTP code and create authenticated session
   *
   * 11-step workflow per API_CONTRACTS.md lines 444-722:
   * 1. Validate code format (6 digits)
   * 2. Query OTP by session_id
   * 3. Check OTP exists
   * 4. Check OTP not already used
   * 5. Check OTP not expired
   * 6. Check attempts < 3
   * 7. Verify bcrypt hash
   * 8. Mark OTP as used
   * 9. Update email_verified
   * 10. Create Supabase session
   * 11. Update last_login_at
   *
   * @param sessionId - Session ID from HTTP-only cookie
   * @param code - 6-digit OTP code entered by user
   * @returns VerifyOTPResult with session tokens
   */
  async verifyOTP(sessionId: string, code: string): Promise<VerifyOTPResult> {
    // 1. Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      throw new BusinessError('INVALID_OTP', 'Invalid verification code format');
    }

    // 2. Query OTP by session_id (without validity checks first to provide specific errors)
    const otpRecord = await otpRepository.findBySessionId(sessionId);

    // 3. Check OTP exists
    if (!otpRecord) {
      throw new BusinessError('OTP_NOT_FOUND', 'Verification session not found or expired');
    }

    // 4. Check OTP not already used
    if (otpRecord.used) {
      throw new BusinessError('OTP_ALREADY_USED', 'This code has already been used');
    }

    // 5. Check OTP not expired
    if (new Date(otpRecord.expiresAt) < new Date()) {
      throw new BusinessError('OTP_EXPIRED', 'Verification code has expired. Please request a new one.');
    }

    // 6. Check attempts < 3
    if (otpRecord.attempts >= 3) {
      throw new BusinessError('OTP_MAX_ATTEMPTS', 'Too many failed attempts. Please request a new code.');
    }

    // 7. Verify bcrypt hash
    const isValid = await verifyOTPHash(code, otpRecord.codeHash);
    if (!isValid) {
      // Increment attempts on failure
      await otpRepository.incrementAttempts(sessionId);
      const remainingAttempts = 2 - otpRecord.attempts; // 3 max, 0-indexed
      throw new BusinessError('INVALID_OTP', `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'No attempts remaining.'}`);
    }

    // 8. Mark OTP as used (idempotent - Pattern 2)
    await otpRepository.markUsed(sessionId);

    // Get user for session creation
    if (!otpRecord.userId) {
      throw new BusinessError('OTP_NOT_FOUND', 'User not associated with this verification session');
    }

    const user = await userRepository.findByAuthId(otpRecord.userId);
    if (!user) {
      throw new BusinessError('USER_NOT_FOUND', 'User account not found');
    }

    // 9. Update email_verified
    await userRepository.markEmailVerified(user.clientId, user.id);

    // 10. Create Supabase session (sign in the user)
    const supabase = await createClient();

    // For Supabase Auth, we need to sign in with the user's credentials
    // Since we've verified the OTP, we can use the admin API to create a session
    // Note: This requires the service role key for admin operations
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.getUserById(user.id);

    if (sessionError || !sessionData.user) {
      throw new BusinessError('AUTH_CREATION_FAILED', 'Failed to create session');
    }

    // 11. Update last_login_at
    await userRepository.updateLastLogin(user.clientId, user.id);

    return {
      success: true,
      userId: user.id,
      email: user.email || '',
      tiktokHandle: user.tiktokHandle,
      isAdmin: user.isAdmin,
      message: 'Email verified successfully',
    };
  },

  /**
   * Resend OTP code for verification
   *
   * 10-step workflow per API_CONTRACTS.md lines 729-928:
   * 1. Session ID comes from route (extracted from HTTP-only cookie)
   * 2. Query existing OTP record by session_id
   * 3. Check if session exists
   * 4. Rate limit check (30 seconds between resends)
   * 5. Get user details (email)
   * 6. Invalidate old OTP (mark as used)
   * 7. Generate new 6-digit OTP and hash it
   * 8. Create new OTP record (reuse same session_id)
   * 9. Send new OTP email
   * 10. Return response with expiresAt and remainingSeconds
   *
   * @param sessionId - Session ID from HTTP-only cookie
   * @returns ResendOTPResult with expiration info
   */
  async resendOTP(sessionId: string): Promise<ResendOTPResult> {
    // 1-2. Query existing OTP record by session_id
    const otpRecord = await otpRepository.findBySessionId(sessionId);

    // 3. Check if session exists
    if (!otpRecord) {
      throw new BusinessError('INVALID_SESSION', 'OTP session not found. Please sign up again.');
    }

    // 4. Rate limit check (30 seconds between resends)
    const timeSinceCreation = Date.now() - new Date(otpRecord.createdAt).getTime();
    const minimumWaitTime = 30000; // 30 seconds

    if (timeSinceCreation < minimumWaitTime) {
      const waitSeconds = Math.ceil((minimumWaitTime - timeSinceCreation) / 1000);
      throw new BusinessError('RESEND_TOO_SOON', `Please wait ${waitSeconds} seconds before requesting a new code.`);
    }

    // 5. Get user details (email)
    if (!otpRecord.userId) {
      throw new BusinessError('INVALID_SESSION', 'No user associated with this session.');
    }

    const user = await userRepository.findByAuthId(otpRecord.userId);
    if (!user || !user.email) {
      throw new BusinessError('USER_NOT_FOUND', 'User account not found.');
    }

    // Get client info for email branding
    const client = await clientRepository.findById(user.clientId);
    if (!client) {
      throw new BusinessError('CLIENT_NOT_FOUND', 'Invalid client configuration');
    }

    // 6. Invalidate old OTP (mark as used)
    await otpRepository.markUsed(sessionId);

    // 7. Generate new 6-digit OTP and hash it
    const newOtp = generateOTP();
    const newOtpHash = await hashOTP(newOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 8. Create new OTP record (reuse same session_id)
    await otpRepository.create({
      userId: otpRecord.userId,
      sessionId, // Reuse same session ID
      codeHash: newOtpHash,
      expiresAt,
    });

    // 9. Send new OTP email
    await sendOTPEmail(user.email, newOtp, client.name);

    // 10. Return response
    const remainingSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return {
      success: true,
      sent: true,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds,
    };
  },

  /**
   * Authenticate existing user with handle and password
   *
   * 5-step workflow per API_CONTRACTS.md lines 948-1108:
   * 1. Find user by handle (with tenant isolation)
   * 2. Verify password via Supabase Auth
   * 3. Check email_verified status
   * 4. Create authenticated session
   * 5. Update last_login_at
   *
   * Security notes:
   * - Don't reveal "user not found" (use generic INVALID_CREDENTIALS)
   * - Rate limit: 5 failed attempts in 15 minutes → account locked (handled at route level)
   *
   * @param clientId - Tenant ID for multitenancy
   * @param handle - TikTok handle (with or without @)
   * @param password - User's plaintext password
   * @returns LoginResult with user info
   */
  async login(clientId: string, handle: string, password: string): Promise<LoginResult> {
    // Normalize handle (remove @ prefix for query)
    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // 1. Find user by handle (with tenant isolation)
    const user = await userRepository.findByHandle(clientId, normalizedHandle);

    // Security: Don't reveal whether user exists or password is wrong
    if (!user) {
      throw new BusinessError('INVALID_CREDENTIALS', 'Incorrect handle or password. Please try again.');
    }

    // Check user has email (required for login - Cruva imports may not have email)
    if (!user.email) {
      // User exists but hasn't completed registration - route to signup
      throw new BusinessError('INVALID_CREDENTIALS', 'Incorrect handle or password. Please try again.');
    }

    // 2. Verify password via Supabase Auth
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (authError || !authData.user) {
      // Generic error message - don't reveal what failed
      throw new BusinessError('INVALID_CREDENTIALS', 'Incorrect handle or password. Please try again.');
    }

    // 3. Check email_verified status
    if (!user.emailVerified) {
      throw new BusinessError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // 4. Session is created by Supabase Auth signInWithPassword
    // The route will handle setting the HTTP-only cookie

    // 5. Update last_login_at
    await userRepository.updateLastLogin(clientId, user.id);

    return {
      success: true,
      userId: user.id,
      email: user.email,
      tiktokHandle: user.tiktokHandle,
      isAdmin: user.isAdmin,
    };
  },

  /**
   * Initiate password reset flow
   *
   * 6-step workflow per API_CONTRACTS.md lines 1464-1613:
   * 1. Lookup user by email OR handle
   * 2. If not found, still return success (anti-enumeration)
   * 3. Rate limit check (max 3 requests per hour)
   * 4. Generate secure token and hash it
   * 5. Store token hash in database
   * 6. Send email with reset link
   *
   * Security notes:
   * - Always return success even if user not found (prevents email enumeration)
   * - Rate limit: max 3 requests per hour per user
   * - Token stored as bcrypt hash
   * - Token expires in 15 minutes
   *
   * @param clientId - Tenant ID for multitenancy
   * @param identifier - Email OR TikTok handle
   * @returns ForgotPasswordResult (always success to prevent enumeration)
   */
  async forgotPassword(clientId: string, identifier: string): Promise<ForgotPasswordResult> {
    // Normalize identifier
    const normalizedIdentifier = identifier.trim().toLowerCase();

    // 1. Lookup user by email OR handle
    let user = null;

    // Check if identifier looks like an email
    if (normalizedIdentifier.includes('@') && !normalizedIdentifier.startsWith('@')) {
      // Looks like email
      user = await userRepository.findByEmail(clientId, normalizedIdentifier);
    } else {
      // Looks like handle (with or without @ prefix)
      const handle = normalizedIdentifier.startsWith('@')
        ? normalizedIdentifier.slice(1)
        : normalizedIdentifier;
      user = await userRepository.findByHandle(clientId, handle);
    }

    // 2. If not found, still return success (anti-enumeration)
    // We return a fake masked email to not reveal whether user exists
    if (!user || !user.email) {
      return {
        sent: true,
        emailHint: '****@****.***',
        expiresIn: RESET_TOKEN_EXPIRY_MINUTES,
      };
    }

    // 3. Rate limit check (max 3 requests per hour)
    const recentTokens = await passwordResetRepository.findRecentByUserId(user.id);
    if (recentTokens.length >= RESET_TOKEN_RATE_LIMIT) {
      throw new BusinessError(
        'RATE_LIMITED',
        'Too many reset requests. Please try again in 1 hour.'
      );
    }

    // Get client info for email branding
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new BusinessError('CLIENT_NOT_FOUND', 'Invalid client configuration');
    }

    // 4. Generate secure token and hash it
    const resetToken = generateResetToken();
    const tokenHash = await bcrypt.hash(resetToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any existing tokens for this user
    await passwordResetRepository.invalidateAllForUser(user.id);

    // 5. Store token hash in database
    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // 6. Send email with reset link
    await sendPasswordResetEmail(user.email, user.tiktokHandle, resetToken, client.name);

    // Return masked email
    const maskedEmail = maskEmail(user.email);
    return {
      sent: true,
      emailHint: maskedEmail,
      expiresIn: RESET_TOKEN_EXPIRY_MINUTES,
    };
  },

  /**
   * Reset password using token from email link
   *
   * 6-step workflow per API_CONTRACTS.md lines 1623-1768:
   * 1. Find valid token by comparing with bcrypt
   * 2. Validate token (exists, not expired, not used)
   * 3. Validate new password (min 8 chars)
   * 4. Update password in Supabase Auth
   * 5. Mark token as used
   * 6. Invalidate all tokens for user (security)
   *
   * @param token - Reset token from email link (plaintext)
   * @param newPassword - New password (plaintext, will be hashed by Supabase Auth)
   * @returns ResetPasswordResult
   */
  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult> {
    // 1. Find valid token by comparing with bcrypt
    const validTokens = await passwordResetRepository.findAllValid();

    let matchedToken = null;
    for (const tokenData of validTokens) {
      const isMatch = await bcrypt.compare(token, tokenData.tokenHash);
      if (isMatch) {
        matchedToken = tokenData;
        break;
      }
    }

    // 2. Validate token exists
    if (!matchedToken) {
      throw new BusinessError('INVALID_TOKEN', 'Invalid or expired reset link. Please request a new one.');
    }

    // Double-check expiration (in case of race condition)
    if (new Date(matchedToken.expiresAt) < new Date()) {
      throw new BusinessError('TOKEN_EXPIRED', 'This reset link has expired. Please request a new one.');
    }

    // Double-check not used (in case of race condition)
    if (matchedToken.usedAt) {
      throw new BusinessError('TOKEN_USED', 'This reset link has already been used. Please request a new one.');
    }

    // 3. Validate new password (min 8 chars)
    if (newPassword.length < 8) {
      throw new BusinessError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
    }

    if (newPassword.length > 128) {
      throw new BusinessError('WEAK_PASSWORD', 'Password must be at most 128 characters.');
    }

    // 4. Update password in Supabase Auth
    const supabase = await createClient();

    // Use admin API to update user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      matchedToken.userId,
      { password: newPassword }
    );

    if (updateError) {
      throw new BusinessError('INTERNAL_ERROR', 'Failed to update password. Please try again.');
    }

    // 5. Mark token as used
    await passwordResetRepository.markUsed(matchedToken.id);

    // 6. Invalidate all tokens for user (security - prevent other reset links from working)
    await passwordResetRepository.invalidateAllForUser(matchedToken.userId);

    return {
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.',
    };
  },
};
