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
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { otpRepository } from '@/lib/repositories/otpRepository';
import { clientRepository } from '@/lib/repositories/clientRepository';
import { passwordResetRepository } from '@/lib/repositories/passwordResetRepository';
import { ValidationError, BusinessError } from '@/lib/utils/errors';
import { encrypt, decrypt } from '@/lib/utils/encryption'; // CR-001: For session token encryption

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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
 *
 * References:
 * - Loyalty.md lines 730-736 (OTP email template)
 * - API_CONTRACTS.md lines 334, 414 (5-minute expiry)
 */
async function sendOTPEmail(email: string, otp: string, clientName: string): Promise<void> {
  // Always log OTP in development for debugging/testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }

  // Send actual email via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: `${clientName} <onboarding@resend.dev>`, // Use Resend test domain (works without domain verification)
      to: email,
      subject: `Your verification code - ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
          </div>
          <p style="color: #666;">This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] OTP email error:', error);
      // Don't throw - allow auth flow to continue (user can resend OTP)
      // In production, this should trigger monitoring/alerts
    } else {
      console.log(`[Resend] OTP email sent to ${email}, id: ${data?.id}`);
    }
  } catch (err) {
    console.error('[Resend] OTP email exception:', err);
    // Don't throw - allow auth flow to continue
  }
}

/**
 * Send password reset email via Resend
 *
 * References:
 * - Loyalty.md Flow 5 (Password Reset)
 * - API_CONTRACTS.md lines 614-741 (forgotPassword endpoint)
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

  // Always log reset link in development for debugging/testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset for ${email}: ${resetUrl}`);
  }

  // Send actual email via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: `${clientName} <onboarding@resend.dev>`, // Use Resend test domain (works without domain verification)
      to: email,
      subject: `Reset Your Password - ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hi @${handle},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666;">This link expires in <strong>${RESET_TOKEN_EXPIRY_MINUTES} minutes</strong>.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 11px;">
            Or copy and paste this link into your browser:<br>
            <span style="color: #666;">${resetUrl}</span>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend] Password reset email error:', error);
      // Don't throw - allow auth flow to continue (anti-enumeration requires success response)
    } else {
      console.log(`[Resend] Password reset email sent to ${email}, id: ${data?.id}`);
    }
  } catch (err) {
    console.error('[Resend] Password reset email exception:', err);
    // Don't throw - allow auth flow to continue
  }
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
  accessToken: string | null;  // CR-001: Supabase access_token for session
  refreshToken: string | null; // CR-001: Supabase refresh_token for session
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

    // CR-001: Capture session tokens for auto-login after OTP verification
    // When email confirmation is disabled in Supabase, signUp returns a session
    const accessToken = authData.session?.access_token ?? null;
    const refreshToken = authData.session?.refresh_token ?? null;

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

    // 7. Store OTP with encrypted session tokens (CR-001)
    // Encrypt tokens before storage for security
    const accessTokenEncrypted = accessToken ? encrypt(accessToken) : null;
    const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken) : null;

    await otpRepository.create({
      userId: authUserId,
      sessionId,
      codeHash: otpHash,
      expiresAt,
      accessTokenEncrypted,  // CR-001
      refreshTokenEncrypted, // CR-001
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

    // 10. CR-001: Decrypt stored session tokens for auto-login
    // These were captured during signup and encrypted for secure storage
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (otpRecord.accessTokenEncrypted) {
      try {
        accessToken = decrypt(otpRecord.accessTokenEncrypted);
      } catch (e) {
        console.error('[verifyOTP] Failed to decrypt access token:', e);
        // Don't throw - user can still login manually if decryption fails
      }
    }

    if (otpRecord.refreshTokenEncrypted) {
      try {
        refreshToken = decrypt(otpRecord.refreshTokenEncrypted);
      } catch (e) {
        console.error('[verifyOTP] Failed to decrypt refresh token:', e);
      }
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
      accessToken,  // CR-001: Return for session creation in route
      refreshToken, // CR-001: Return for session creation in route
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
