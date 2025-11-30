# Authentication - Implementation Guide

**Purpose:** Complete authentication system including signup, OTP verification, login, and password reset
**Phase:** Phase 3 - Authentication System
**Target Audience:** LLM agents debugging or modifying authentication features
**Last Updated:** 2025-11-30

---

## Quick Reference

**Steps Documented:**
- Step 3.1 - Authentication Repositories ✅
- Step 3.2 - Authentication Services ✅
- Step 3.3 - Authentication API Routes ✅

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/lib/services/authService.ts` | 789 | Business logic for all auth workflows |
| `appcode/lib/repositories/userRepository.ts` | 358 | User CRUD with tenant isolation (RPC) |
| `appcode/lib/repositories/otpRepository.ts` | 271 | OTP verification management (RPC, USING(false)) |
| `appcode/lib/repositories/clientRepository.ts` | 134 | Client/tenant queries (RPC) |
| `appcode/lib/repositories/passwordResetRepository.ts` | 262 | Password reset token management (RPC, USING(false)) |
| `appcode/app/api/auth/*/route.ts` | ~75 each | 9 API route handlers |

**Database Tables Used:**
- `users` (SchemaFinalv2.md:131-170)
- `otps` (SchemaFinalv2.md:171-192)
- `password_reset_tokens` (SchemaFinalv2.md:193-220)
- `clients` (SchemaFinalv2.md:106-130)

**Quick Navigation:**
- [Service Functions](#service-functions) - All 7 auth service functions
- [Database Queries](#database-queries) - Repository layer functions with RPC
- [API Endpoints](#api-endpoints) - All 9 auth routes
- [Error Handling](#error-handling) - Error codes and flows
- [Security Context](#security-context) - Auth patterns and RLS

---

## Service Functions

### checkHandle()

**Location:** `appcode/lib/services/authService.ts:226-261`

**Signature:**
```typescript
async checkHandle(clientId: string, handle: string): Promise<CheckHandleResult>
```

**Purpose:** Determine routing based on TikTok handle existence and email status

**Implementation** (authService.ts:226-261):
```typescript
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
}
```

**Business Logic:**
- **3 Scenarios per API_CONTRACTS.md lines 104-137:**
  - (A) User exists + has email → route to login
  - (B) User exists + no email → route to signup (complete profile from Cruva import)
  - (C) User not found → route to signup (new user)
- Normalizes handle with @ prefix for response (line 228)
- Removes @ prefix for database query (line 229)

**Calls:**
- `userRepository.findByHandle()` (userRepository.ts:TBD) - Queries users table with tenant isolation

**Returns:**
```typescript
interface CheckHandleResult {
  exists: boolean;
  hasEmail: boolean;
  route: 'signup' | 'login';
  handle: string; // Normalized with @ prefix
}
```

---

### initiateSignup()

**Location:** `appcode/lib/services/authService.ts:281-370`

**Signature:**
```typescript
async initiateSignup(
  clientId: string,
  handle: string,
  email: string,
  password: string
): Promise<SignupResult>
```

**Purpose:** Create new user account and send OTP verification email

**Implementation** (authService.ts:281-370):
```typescript
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
      emailRedirectTo: undefined, // Don't send Supabase's default email
    },
  });

  if (authError || !authData.user) {
    throw new BusinessError('AUTH_CREATION_FAILED', authError?.message || 'Failed to create account');
  }

  const authUserId = authData.user.id;

  // 5. Create user in our users table
  try {
    await userRepository.create({
      id: authUserId,
      clientId,
      tiktokHandle: normalizedHandle,
      email: normalizedEmail,
      passwordHash: '[managed-by-supabase-auth]',
      isAdmin: false,
    });
  } catch (error) {
    // Rollback: Delete the Supabase Auth user if our user creation fails
    await supabase.auth.admin.deleteUser(authUserId);
    throw error;
  }

  // 6. Generate and hash OTP
  const otp = generateOTP(); // Generates 6-digit code
  const otpHash = await hashOTP(otp); // bcrypt with rounds=10
  const sessionId = generateSessionId(); // 32 random bytes hex
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

  // 9. Return result
  const maskedEmail = maskEmail(normalizedEmail);
  return {
    success: true,
    sessionId,
    userId: authUserId,
    message: `Verification code sent to ${maskedEmail}`,
    email: maskedEmail,
  };
}
```

**Business Logic (8-step workflow per API_CONTRACTS.md lines 191-437):**
1. Normalize handle (remove @) and email (lowercase, trim) - lines 288-289
2. Check handle uniqueness within tenant - line 292
3. Check email uniqueness within tenant - line 298
4. Get client info for email branding - line 304
5. Create Supabase Auth user (password auto-hashed) - lines 310-323
6. Create user in users table - lines 330-337
7. **Rollback on failure**: Delete Supabase Auth user if users table creation fails - line 340
8. Generate 6-digit OTP, hash with bcrypt rounds=10 - lines 345-346
9. Generate session ID (32 random bytes hex) - line 347
10. Store OTP with 5-minute expiry - lines 351-356
11. Send OTP email (currently logs to console in dev) - line 359
12. Return masked email for display - lines 362-369

**Calls:**
- `userRepository.handleExists()` - Check handle uniqueness
- `userRepository.emailExists()` - Check email uniqueness
- `clientRepository.findById()` - Get client branding
- `supabase.auth.signUp()` - Create Supabase Auth user
- `userRepository.create()` - Create user in users table
- `otpRepository.create()` - Store OTP record
- `sendOTPEmail()` (authService.ts:78-93) - Send verification email
- `maskEmail()` (authService.ts:134-140) - Mask email for display

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `HANDLE_EXISTS` | 294 | Handle already registered for this client |
| `EMAIL_EXISTS` | 300 | Email already registered for this client |
| `CLIENT_NOT_FOUND` | 306 | Invalid clientId |
| `AUTH_CREATION_FAILED` | 322 | Supabase Auth signup failed |

**Security Notes:**
- Password never stored in plain text (Supabase Auth manages hashing)
- OTP hashed with bcrypt rounds=10 before storage (line 346)
- Session ID is 32 random bytes (line 347)
- OTP expires in 5 minutes (line 29, 348)
- Rollback pattern ensures no orphaned Auth users (lines 339-342)

**Multi-Tenant Isolation:**
- Handle uniqueness checked per client (line 292)
- Email uniqueness checked per client (line 298)
- User created with client_id (line 332)

---

### verifyOTP()

**Location:** `appcode/lib/services/authService.ts:392-469`

**Signature:**
```typescript
async verifyOTP(sessionId: string, code: string): Promise<VerifyOTPResult>
```

**Purpose:** Verify 6-digit OTP code and mark email as verified

**Implementation** (authService.ts:392-469):
```typescript
async verifyOTP(sessionId: string, code: string): Promise<VerifyOTPResult> {
  // 1. Validate code format (6 digits)
  if (!/^\d{6}$/.test(code)) {
    throw new BusinessError('INVALID_OTP', 'Invalid verification code format');
  }

  // 2. Query OTP by session_id
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
    const remainingAttempts = 2 - otpRecord.attempts;
    throw new BusinessError('INVALID_OTP', `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining.` : 'No attempts remaining.'}`);
  }

  // 8. Mark OTP as used (idempotent - Pattern 2)
  await otpRepository.markUsed(sessionId);

  // Get user for session creation
  const user = await userRepository.findByAuthId(otpRecord.userId);
  if (!user) {
    throw new BusinessError('USER_NOT_FOUND', 'User account not found');
  }

  // 9. Update email_verified
  await userRepository.markEmailVerified(user.clientId, user.id);

  // 10. Create Supabase session
  const supabase = await createClient();
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
}
```

**Business Logic (11-step workflow per API_CONTRACTS.md lines 444-722):**
1. Validate code format (exactly 6 digits) - line 394
2. Query OTP by sessionId - line 399
3. Check OTP exists - line 402
4. Check OTP not already used - line 407
5. Check OTP not expired (5 minutes) - line 412
6. Check attempts < 3 - line 417
7. Verify code with bcrypt compare - line 422
8. **On failure**: Increment attempts counter - line 425
9. **On success**: Mark OTP as used - line 431
10. Get user details - line 438
11. Mark email as verified - line 444
12. Create Supabase session (admin API) - line 452
13. Update last_login_at - line 459

**Calls:**
- `otpRepository.findBySessionId()` - Get OTP record
- `otpRepository.incrementAttempts()` - Increment failed attempt counter
- `otpRepository.markUsed()` - Mark OTP as consumed
- `userRepository.findByAuthId()` - Get user by Supabase Auth ID
- `userRepository.markEmailVerified()` - Set email_verified=true
- `userRepository.updateLastLogin()` - Update last_login_at timestamp
- `verifyOTPHash()` (authService.ts:70-72) - bcrypt compare
- `supabase.auth.admin.getUserById()` - Create session

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `INVALID_OTP` (format) | 395 | Code is not exactly 6 digits |
| `OTP_NOT_FOUND` | 403 | Session ID not found in database |
| `OTP_ALREADY_USED` | 408 | OTP already consumed (idempotency check) |
| `OTP_EXPIRED` | 413 | OTP older than 5 minutes |
| `OTP_MAX_ATTEMPTS` | 418 | User failed 3 attempts |
| `INVALID_OTP` (wrong code) | 427 | bcrypt compare failed |
| `USER_NOT_FOUND` | 440 | User record missing |
| `AUTH_CREATION_FAILED` | 455 | Supabase session creation failed |

**Security Notes:**
- Max 3 attempts before lockout (line 417)
- OTP expires in 5 minutes (line 412)
- OTP is single-use (marked used on line 431)
- Attempts counter increments on failure (line 425)
- Remaining attempts shown in error message (line 427)

---

### resendOTP()

**Location:** `appcode/lib/services/authService.ts:489-550`

**Signature:**
```typescript
async resendOTP(sessionId: string): Promise<ResendOTPResult>
```

**Purpose:** Generate and send new OTP code for existing session

**Implementation** (authService.ts:489-550):
```typescript
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

  // 5. Get user details
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
}
```

**Business Logic (10-step workflow per API_CONTRACTS.md lines 729-928):**
1. Query existing OTP by sessionId - line 491
2. Check session exists - line 494
3. **Rate limit**: Minimum 30 seconds between resends - lines 499-505
4. Get user details for email - line 512
5. Get client for email branding - line 518
6. Mark old OTP as used (invalidate) - line 524
7. Generate new 6-digit OTP - line 527
8. Hash new OTP with bcrypt rounds=10 - line 528
9. Create new OTP record **reusing same sessionId** - lines 532-537
10. Send new OTP email - line 540
11. Return expiration timestamp and remaining seconds - lines 543-549

**Calls:**
- `otpRepository.findBySessionId()` - Get existing OTP
- `userRepository.findByAuthId()` - Get user email
- `clientRepository.findById()` - Get client branding
- `otpRepository.markUsed()` - Invalidate old OTP
- `otpRepository.create()` - Create new OTP
- `sendOTPEmail()` - Send email
- `generateOTP()` (authService.ts:39-43) - Generate 6-digit code
- `hashOTP()` (authService.ts:63-65) - bcrypt hash

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `INVALID_SESSION` | 495 | SessionId not found |
| `RESEND_TOO_SOON` | 504 | Less than 30 seconds since last OTP created |
| `USER_NOT_FOUND` | 514 | User or email missing |
| `CLIENT_NOT_FOUND` | 520 | Invalid clientId |

**Security Notes:**
- Rate limit: 30 seconds minimum between resends (line 500)
- Old OTP invalidated before creating new one (line 524)
- **Session ID reused** - prevents session proliferation (line 534)
- New OTP expires in 5 minutes (line 529)
- Wait time calculated and shown to user (line 503)

---

### login()

**Location:** `appcode/lib/services/authService.ts:571-619`

**Signature:**
```typescript
async login(clientId: string, handle: string, password: string): Promise<LoginResult>
```

**Purpose:** Authenticate existing user with handle and password

**Implementation** (authService.ts:571-619):
```typescript
async login(clientId: string, handle: string, password: string): Promise<LoginResult> {
  // Normalize handle (remove @ prefix for query)
  const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // 1. Find user by handle (with tenant isolation)
  const user = await userRepository.findByHandle(clientId, normalizedHandle);

  // Security: Don't reveal whether user exists or password is wrong
  if (!user) {
    throw new BusinessError('INVALID_CREDENTIALS', 'Incorrect handle or password. Please try again.');
  }

  // Check user has email (required for login)
  if (!user.email) {
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

  // 4. Session created by Supabase Auth signInWithPassword

  // 5. Update last_login_at
  await userRepository.updateLastLogin(clientId, user.id);

  return {
    success: true,
    userId: user.id,
    email: user.email,
    tiktokHandle: user.tiktokHandle,
    isAdmin: user.isAdmin,
  };
}
```

**Business Logic (5-step workflow per API_CONTRACTS.md lines 948-1108):**
1. Normalize handle (remove @ prefix) - line 573
2. Find user by handle with tenant isolation - line 576
3. **Security**: Return generic error if user not found - line 580
4. **Security**: Return same generic error if user has no email - line 586
5. Verify password via Supabase Auth - lines 591-594
6. **Security**: Return generic error on password failure - line 598
7. Check email_verified=true - line 602
8. Throw specific error if email not verified - line 603
9. Session auto-created by Supabase Auth (line 606 comment)
10. Update last_login_at timestamp - line 610

**Calls:**
- `userRepository.findByHandle()` - Query user by handle + clientId
- `supabase.auth.signInWithPassword()` - Verify password, create session
- `userRepository.updateLastLogin()` - Update timestamp

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `INVALID_CREDENTIALS` | 580 | User not found (but message doesn't reveal this) |
| `INVALID_CREDENTIALS` | 586 | User has no email (but message doesn't reveal this) |
| `INVALID_CREDENTIALS` | 598 | Password incorrect (but message doesn't reveal this) |
| `EMAIL_NOT_VERIFIED` | 603 | Email not verified yet |

**Security Notes:**
- **Anti-enumeration**: Same generic error for "user not found" and "wrong password" (lines 580, 586, 598)
- **Anti-enumeration**: Users without email get same error as non-existent users (line 586)
- Rate limiting handled at route level (5 failed attempts in 15 minutes)
- Supabase Auth handles password comparison (line 591)
- Email verification required before login (line 602)

**Multi-Tenant Isolation:**
- User lookup includes clientId filter (line 576)

---

### forgotPassword()

**Location:** `appcode/lib/services/authService.ts:642-711`

**Signature:**
```typescript
async forgotPassword(clientId: string, identifier: string): Promise<ForgotPasswordResult>
```

**Purpose:** Initiate password reset flow, send reset email

**Implementation** (authService.ts:642-711):
```typescript
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
}
```

**Business Logic (6-step workflow per API_CONTRACTS.md lines 1464-1613):**
1. Normalize identifier (trim, lowercase) - line 644
2. **Smart lookup**: Detect if identifier is email or handle - lines 650-659
3. **Anti-enumeration**: Return fake success if user not found - lines 662-668
4. Rate limit check: max 3 requests per hour - lines 672-678
5. Get client for email branding - line 681
6. Generate secure reset token (32 random bytes base64url, 44 chars) - line 687
7. Hash token with bcrypt rounds=10 - line 688
8. Calculate expiry (15 minutes from now) - line 689
9. Invalidate all existing tokens for user - line 692
10. Store token hash in database - lines 695-699
11. Send reset email with token - line 702
12. Return masked email - lines 705-710

**Calls:**
- `userRepository.findByEmail()` - Lookup by email
- `userRepository.findByHandle()` - Lookup by handle
- `passwordResetRepository.findRecentByUserId()` - Get recent tokens for rate limiting
- `clientRepository.findById()` - Get client branding
- `passwordResetRepository.invalidateAllForUser()` - Invalidate old tokens
- `passwordResetRepository.create()` - Store new token hash
- `sendPasswordResetEmail()` (authService.ts:99-129) - Send email
- `generateResetToken()` (authService.ts:56-58) - Generate 32-byte token
- `maskEmail()` - Mask email for display

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `RATE_LIMITED` | 674 | More than 3 requests in past hour |
| `CLIENT_NOT_FOUND` | 683 | Invalid clientId |
| (no error) | 663 | User not found - returns fake success for anti-enumeration |

**Security Notes:**
- **Anti-enumeration**: Always returns success, even if user doesn't exist (lines 662-668)
- **Anti-enumeration**: Returns fake masked email if user not found (line 666)
- Rate limit: max 3 requests per hour per user (lines 672-678)
- Token stored as bcrypt hash, not plaintext (line 688)
- Token expires in 15 minutes (line 33, 689)
- Old tokens invalidated when new one requested (line 692)
- Token is 44 characters (32 bytes base64url) (line 687)

**Multi-Tenant Isolation:**
- User lookup includes clientId (lines 652, 658)

---

### resetPassword()

**Location:** `appcode/lib/services/authService.ts:728-788`

**Signature:**
```typescript
async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult>
```

**Purpose:** Reset password using token from email link

**Implementation** (authService.ts:728-788):
```typescript
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

  // 3. Validate new password (8-128 chars)
  if (newPassword.length < 8) {
    throw new BusinessError('WEAK_PASSWORD', 'Password must be at least 8 characters.');
  }

  if (newPassword.length > 128) {
    throw new BusinessError('WEAK_PASSWORD', 'Password must be at most 128 characters.');
  }

  // 4. Update password in Supabase Auth
  const supabase = await createClient();
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    matchedToken.userId,
    { password: newPassword }
  );

  if (updateError) {
    throw new BusinessError('INTERNAL_ERROR', 'Failed to update password. Please try again.');
  }

  // 5. Mark token as used
  await passwordResetRepository.markUsed(matchedToken.id);

  // 6. Invalidate all tokens for user (prevent other links from working)
  await passwordResetRepository.invalidateAllForUser(matchedToken.userId);

  return {
    success: true,
    message: 'Password updated successfully. You can now log in with your new password.',
  };
}
```

**Business Logic (6-step workflow per API_CONTRACTS.md lines 1623-1768):**
1. Get all valid tokens from database - line 730
2. **Token lookup**: Compare plaintext token with all bcrypt hashes - lines 733-738
3. Validate token exists - line 742
4. Double-check expiration (race condition safety) - line 747
5. Double-check not already used (race condition safety) - line 752
6. Validate password length: 8-128 characters - lines 757-763
7. Update password in Supabase Auth (admin API) - lines 766-772
8. Mark token as used - line 779
9. **Security**: Invalidate ALL tokens for user - line 782

**Calls:**
- `passwordResetRepository.findAllValid()` - Get all unexpired, unused tokens
- `bcrypt.compare()` - Compare plaintext token with hashes
- `supabase.auth.admin.updateUserById()` - Update password
- `passwordResetRepository.markUsed()` - Mark token consumed
- `passwordResetRepository.invalidateAllForUser()` - Invalidate all user's tokens

**Error Cases:**
| Error | Line | Reason |
|-------|------|--------|
| `INVALID_TOKEN` | 743 | Token not found or doesn't match any hash |
| `TOKEN_EXPIRED` | 748 | Token older than 15 minutes |
| `TOKEN_USED` | 753 | Token already consumed |
| `WEAK_PASSWORD` | 758 | Password < 8 characters |
| `WEAK_PASSWORD` | 762 | Password > 128 characters |
| `INTERNAL_ERROR` | 775 | Supabase password update failed |

**Security Notes:**
- Token stored as bcrypt hash in database (compared on line 734)
- Token expires in 15 minutes (checked line 747)
- Token is single-use (checked line 752, marked line 779)
- **All tokens invalidated** after successful reset (line 782)
- Password validation: 8-128 characters (lines 757-763)
- Uses Supabase Auth admin API to bypass current password requirement (line 769)
- Race condition safety: Double-checks expiration and used status (lines 747, 752)

**Why loop through all tokens?** (lines 733-738)
- Tokens are stored as bcrypt hashes (one-way)
- Can't query by token directly
- Must compare plaintext token against all hashes
- Performance: Typically <10 valid tokens per user at any time

---

## API Endpoints

**Purpose:** HTTP route handlers that expose auth functionality to frontend

**Location:** `appcode/app/api/auth/*/route.ts`

**Pattern:** All routes follow ARCHITECTURE.md Section 5 (Presentation Layer):
1. Validate request (body/params/auth)
2. Call service function
3. Return JSON response with appropriate status code

### Route Summary

| Route | Method | Auth Required | Service Function | Purpose |
|-------|--------|---------------|------------------|---------|
| `/api/auth/check-handle` | POST | No | `authService.checkHandle()` | Verify TikTok handle exists in tenant |
| `/api/auth/signup` | POST | No | `authService.initiateSignup()` | Create user, send OTP email |
| `/api/auth/verify-otp` | POST | No (session cookie) | `authService.verifyOTP()` | Verify OTP code, complete signup |
| `/api/auth/resend-otp` | POST | No (session cookie) | `authService.resendOTP()` | Generate new OTP, resend email |
| `/api/auth/login` | POST | No | `authService.login()` | Authenticate with handle/password |
| `/api/auth/forgot-password` | POST | No | `authService.forgotPassword()` | Send password reset email |
| `/api/auth/reset-password` | POST | No | `authService.resetPassword()` | Reset password with token |
| `/api/auth/user-status` | GET | Yes | Repository direct | Get user recognition status, set routing |
| `/api/auth/onboarding-info` | GET | Yes | N/A (MVP hardcoded) | Get client-specific welcome message |

### Unauthenticated Routes (Public)

**check-handle, signup, verify-otp, resend-otp, login, forgot-password, reset-password**

These routes use `createAdminClient()` + RPC functions to bypass RLS. See ARCHITECTURE.md Section 12.

### Authenticated Routes (Protected)

**user-status, onboarding-info**

These routes require valid `auth-token` cookie. Use `supabase.auth.getUser()` to validate session.

### Error Response Pattern

All routes return consistent error format:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

Common codes: `UNAUTHORIZED` (401), `INVALID_INPUT` (400), `INTERNAL_ERROR` (500)

---

## Database Queries

**Purpose:** Repository layer functions for database access with tenant isolation

**Security Model:**
- User, OTP, Client, Password Reset repositories use **RPC functions with SECURITY DEFINER** to bypass RLS for unauthenticated auth routes
- `otps` and `password_reset_tokens` tables have `USING(false)` RLS policies - all access via RPC only
- `users` table uses RPC for auth operations (unauthenticated routes)
- `clients` table is the tenant root - no client_id filter needed
- Cleanup operations (deleteExpired) use admin client directly

---

### userRepository

**File:** `appcode/lib/repositories/userRepository.ts` (358 lines)

**Purpose:** User CRUD operations with tenant isolation

**All queries use RPC functions to bypass RLS for unauthenticated auth routes** (see ARCHITECTURE.md Section 12)

#### findByHandle()

**Location:** `userRepository.ts:98-118`

**Signature:**
```typescript
async findByHandle(clientId: string, handle: string): Promise<UserData | null>
```

**Implementation:**
```typescript
async findByHandle(clientId: string, handle: string): Promise<UserData | null> {
  const supabase = createAdminClient();

  // Normalize handle (remove @ if present)
  const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  const { data, error } = await supabase.rpc('auth_find_user_by_handle', {
    p_client_id: clientId,
    p_handle: normalizedHandle,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRpcResultToUserData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_find_user_by_handle(p_client_id, p_handle)`
- **Tenant Isolation:** RPC enforces `client_id` filter internally
- **Returns:** Array (access via `data[0]`) or empty array if not found
- **Normalization:** Removes `@` prefix before query (line 102)

---

#### findByEmail()

**Location:** `userRepository.ts:129-149`

**Signature:**
```typescript
async findByEmail(clientId: string, email: string): Promise<UserData | null>
```

**Implementation:**
```typescript
async findByEmail(clientId: string, email: string): Promise<UserData | null> {
  const supabase = createAdminClient();

  // Normalize email (lowercase)
  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.rpc('auth_find_user_by_email', {
    p_client_id: clientId,
    p_email: normalizedEmail,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRpcResultToUserData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_find_user_by_email(p_client_id, p_email)`
- **Tenant Isolation:** RPC enforces `client_id` filter internally
- **Returns:** Array (access via `data[0]`) or empty array if not found
- **Normalization:** Lowercase + trim (line 133)

---

#### findByAuthId()

**Location:** `userRepository.ts:159-175`

**Signature:**
```typescript
async findByAuthId(authId: string): Promise<UserData | null>
```

**Implementation:**
```typescript
async findByAuthId(authId: string): Promise<UserData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_user_by_id', {
    p_user_id: authId,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRpcResultToUserData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_find_user_by_id(p_user_id)`
- **Tenant Isolation:** Not needed - query by globally unique Supabase Auth ID
- **Returns:** Array (access via `data[0]`) or empty array if not found
- **Used by:** Authenticated routes to fetch current user data

---

#### create()

**Location:** `userRepository.ts:185-232`

**Signature:**
```typescript
async create(userData: {
  id: string;
  clientId: string;
  tiktokHandle: string;
  email: string;
  passwordHash: string;
  termsVersion?: string;
}): Promise<UserData>
```

**Implementation:**
```typescript
async create(userData: {
  id: string;
  clientId: string;
  tiktokHandle: string;
  email: string;
  passwordHash: string;
  termsVersion?: string;
}): Promise<UserData> {
  const supabase = createAdminClient();

  // Validate client_id is provided (Section 9 Critical Rule #2)
  if (!userData.clientId) {
    throw new Error('client_id is required for user creation');
  }

  const { data, error } = await supabase.rpc('auth_create_user', {
    p_id: userData.id,
    p_client_id: userData.clientId,
    p_tiktok_handle: userData.tiktokHandle,
    p_email: userData.email.toLowerCase().trim(),
    p_password_hash: userData.passwordHash,
    p_terms_version: userData.termsVersion,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create user');
  }

  return mapRpcResultToUserData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_create_user(p_id, p_client_id, p_tiktok_handle, p_email, p_password_hash, p_terms_version)`
- **Tenant Isolation:** `client_id` required parameter (validated line 196)
- **Returns:** Array with created user (access via `data[0]`)
- **Security:** NO `is_admin` parameter allowed (prevents privilege escalation)
- **Fields Set:**
  - `current_tier`: 'tier_1' (default)
  - `email_verified`: false (requires OTP verification)
  - `created_at`: NOW()

---

#### updateLastLogin()

**Location:** `userRepository.ts:242-252`

**Signature:**
```typescript
async updateLastLogin(clientId: string, userId: string): Promise<void>
```

**Implementation:**
```typescript
async updateLastLogin(clientId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('auth_update_last_login', {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **RPC Function:** `auth_update_last_login(p_user_id)`
- **Tenant Isolation:** Not needed - userId is globally unique
- **Updates:** `last_login_at = NOW()`
- **Security:** SECURITY DEFINER bypasses RLS

---

#### markEmailVerified()

**Location:** `userRepository.ts:262-272`

**Signature:**
```typescript
async markEmailVerified(clientId: string, userId: string): Promise<void>
```

**Implementation:**
```typescript
async markEmailVerified(clientId: string, userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('auth_mark_email_verified', {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **RPC Function:** `auth_mark_email_verified(p_user_id)`
- **Tenant Isolation:** Not needed - userId is globally unique
- **Updates:** `email_verified = true`
- **Called by:** verifyOTP after successful OTP verification

---

#### updateTermsAcceptance()

**Location:** `userRepository.ts:285-305`

**Signature:**
```typescript
async updateTermsAcceptance(
  clientId: string,
  userId: string,
  termsVersion: string
): Promise<void>
```

**Implementation:**
```typescript
async updateTermsAcceptance(
  clientId: string,
  userId: string,
  termsVersion: string
): Promise<void> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('users')
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: termsVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('client_id', clientId); // TENANT ISOLATION

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **NOT converted to RPC** - Terms captured at signup via `auth_create_user`
- **Used for:** Updating terms AFTER signup
- **Tenant Isolation:** `.eq('client_id', clientId)` (line 300)
- **Uses:** Server client (respects RLS)
- **Updates:** `terms_accepted_at`, `terms_version`, `updated_at`

---

#### handleExists()

**Location:** `userRepository.ts:316-331`

**Signature:**
```typescript
async handleExists(clientId: string, handle: string): Promise<boolean>
```

**Implementation:**
```typescript
async handleExists(clientId: string, handle: string): Promise<boolean> {
  const supabase = createAdminClient();

  const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  const { data, error } = await supabase.rpc('auth_handle_exists', {
    p_client_id: clientId,
    p_handle: normalizedHandle,
  });

  if (error) {
    throw error;
  }

  return data ?? false;
}
```

**Query Details:**
- **RPC Function:** `auth_handle_exists(p_client_id, p_handle)`
- **Tenant Isolation:** RPC enforces `client_id` filter internally
- **Returns:** Boolean (true if handle exists in tenant)

---

#### emailExists()

**Location:** `userRepository.ts:342-357`

**Signature:**
```typescript
async emailExists(clientId: string, email: string): Promise<boolean>
```

**Implementation:**
```typescript
async emailExists(clientId: string, email: string): Promise<boolean> {
  const supabase = createAdminClient();

  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await supabase.rpc('auth_email_exists', {
    p_client_id: clientId,
    p_email: normalizedEmail,
  });

  if (error) {
    throw error;
  }

  return data ?? false;
}
```

**Query Details:**
- **RPC Function:** `auth_email_exists(p_client_id, p_email)`
- **Tenant Isolation:** RPC enforces `client_id` filter internally
- **Returns:** Boolean (true if email exists in tenant)

---

### otpRepository

**File:** `appcode/lib/repositories/otpRepository.ts` (271 lines)

**Purpose:** OTP code management for email verification

**Security:** Table has `USING(false)` RLS policy - all access via RPC functions (see ARCHITECTURE.md Section 12)

**Validity Checks:** Performed in application code after RPC fetch (expiration, attempts, used status)

#### create()

**Location:** `otpRepository.ts:66-100`

**Signature:**
```typescript
async create(otpData: {
  userId?: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<OtpData>
```

**Implementation:**
```typescript
async create(otpData: {
  userId?: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<OtpData> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_create_otp', {
    p_user_id: otpData.userId ?? '',
    p_session_id: otpData.sessionId,
    p_code_hash: otpData.codeHash,
    p_expires_at: otpData.expiresAt.toISOString(),
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create OTP');
  }

  // RPC returns just the ID, construct full OtpData
  return {
    id: data,
    userId: otpData.userId ?? null,
    sessionId: otpData.sessionId,
    codeHash: otpData.codeHash,
    expiresAt: otpData.expiresAt.toISOString(),
    attempts: 0,
    used: false,
    createdAt: new Date().toISOString(),
  };
}
```

**Query Details:**
- **RPC Function:** `auth_create_otp(p_user_id, p_session_id, p_code_hash, p_expires_at)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** UUID string (OTP ID only, not full row)
- **Expiration:** Set by caller (typically 5 minutes)
- **Hash:** Code stored as bcrypt hash, not plaintext

---

#### findBySessionId()

**Location:** `otpRepository.ts:110-126`

**Signature:**
```typescript
async findBySessionId(sessionId: string): Promise<OtpData | null>
```

**Implementation:**
```typescript
async findBySessionId(sessionId: string): Promise<OtpData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_otp_by_session', {
    p_session_id: sessionId,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRpcResultToOtpData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_find_otp_by_session(p_session_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** Array (access via `data[0]`) or empty array if not found
- **NO validity checks** - fetches OTP regardless of expiration/used/attempts

---

#### findValidBySessionId()

**Location:** `otpRepository.ts:136-152`

**Signature:**
```typescript
async findValidBySessionId(sessionId: string): Promise<OtpData | null>
```

**Implementation:**
```typescript
async findValidBySessionId(sessionId: string): Promise<OtpData | null> {
  const otp = await this.findBySessionId(sessionId);

  if (!otp) {
    return null;
  }

  // Check validity in application code
  const now = new Date();
  const expiresAt = new Date(otp.expiresAt);

  if (otp.used || otp.attempts >= 3 || expiresAt <= now) {
    return null;
  }

  return otp;
}
```

**Query Details:**
- **Uses:** `findBySessionId()` then validates in app code
- **Validity Checks (lines 144-147):**
  - Not used (`otp.used === false`)
  - Attempts < 3 (`otp.attempts < 3`)
  - Not expired (`expiresAt > now`)
- **Returns:** `null` if any check fails

---

#### markUsed()

**Location:** `otpRepository.ts:161-171`

**Signature:**
```typescript
async markUsed(sessionId: string): Promise<void>
```

**Implementation:**
```typescript
async markUsed(sessionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('auth_mark_otp_used', {
    p_session_id: sessionId,
  });

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **RPC Function:** `auth_mark_otp_used(p_session_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Updates:** `used = true` (one-time use enforcement)

---

#### incrementAttempts()

**Location:** `otpRepository.ts:182-194`

**Signature:**
```typescript
async incrementAttempts(sessionId: string): Promise<number>
```

**Implementation:**
```typescript
async incrementAttempts(sessionId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_increment_otp_attempts', {
    p_session_id: sessionId,
  });

  if (error) {
    throw error;
  }

  return data ?? 0;
}
```

**Query Details:**
- **RPC Function:** `auth_increment_otp_attempts(p_session_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** New attempt count (used to show "X attempts remaining")
- **Max Attempts:** 3 (enforced in application code)

---

#### deleteExpired()

**Location:** `otpRepository.ts:203-219`

**Signature:**
```typescript
async deleteExpired(): Promise<number>
```

**Implementation:**
```typescript
async deleteExpired(): Promise<number> {
  const supabase = createAdminClient();

  // Note: With USING(false) policy, we need to use service_role
  // which bypasses RLS. This already uses admin client.
  const { data, error } = await supabase
    .from('otp_codes')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}
```

**Query Details:**
- **NOT converted to RPC** - Cleanup job uses admin client directly
- **Filter:** `expires_at < NOW()`
- **Uses:** Admin client (bypasses `USING(false)` policy)
- **Returns:** Count of deleted rows

---

### clientRepository

**File:** `appcode/lib/repositories/clientRepository.ts` (134 lines)

**Purpose:** Client/tenant configuration queries

**Exception:** `clients` table is the tenant root - no `client_id` filter needed (see ARCHITECTURE.md Section 9)

#### findById()

**Location:** `clientRepository.ts:89-105`

**Signature:**
```typescript
async findById(id: string): Promise<ClientData | null>
```

**Implementation:**
```typescript
async findById(id: string): Promise<ClientData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_get_client_by_id', {
    p_client_id: id,
  });

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return mapRpcResultToClientData(data[0]);
}
```

**Query Details:**
- **RPC Function:** `auth_get_client_by_id(p_client_id)`
- **Tenant Isolation:** N/A - clients table IS the tenant definition
- **Returns:** Array (access via `data[0]`) with limited columns for security:
  - `id`, `name`, `subdomain`, `logo_url`, `primary_color`
  - Excludes sensitive config fields (tier calculation mode, etc.)

---

#### findBySubdomain()

**Location:** `clientRepository.ts:116-133`

**Signature:**
```typescript
async findBySubdomain(subdomain: string): Promise<ClientData | null>
```

**Implementation:**
```typescript
async findBySubdomain(subdomain: string): Promise<ClientData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('subdomain', subdomain)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data ? mapToClientData(data) : null;
}
```

**Query Details:**
- **NOT converted to RPC** - Future multi-tenant feature (subdomain-based tenant detection)
- **Current:** MVP uses `CLIENT_ID` env var instead
- **Uses:** Server client
- **Filter:** `subdomain = ?`

---

### passwordResetRepository

**File:** `appcode/lib/repositories/passwordResetRepository.ts` (262 lines)

**Purpose:** Password reset token management

**Security:** Table has `USING(false)` RLS policy - all access via RPC functions (see ARCHITECTURE.md Section 12)

**Token Storage:** Bcrypt hashes (not plaintext) with 15-minute expiration

#### create()

**Location:** `passwordResetRepository.ts:67-100`

**Signature:**
```typescript
async create(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
}): Promise<PasswordResetData>
```

**Implementation:**
```typescript
async create(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
}): Promise<PasswordResetData> {
  const supabase = createAdminClient();

  const { data: tokenId, error } = await supabase.rpc('auth_create_reset_token', {
    p_user_id: data.userId,
    p_token_hash: data.tokenHash,
    p_expires_at: data.expiresAt.toISOString(),
    p_ip_address: data.ipAddress,
  });

  if (error) {
    throw error;
  }

  if (!tokenId) {
    throw new Error('Failed to create password reset token');
  }

  // RPC returns just the ID, construct full data
  return {
    id: tokenId,
    userId: data.userId,
    tokenHash: data.tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: data.expiresAt.toISOString(),
    usedAt: null,
    ipAddress: data.ipAddress ?? null,
  };
}
```

**Query Details:**
- **RPC Function:** `auth_create_reset_token(p_user_id, p_token_hash, p_expires_at, p_ip_address)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** UUID string (token ID only)
- **Expiration:** 15 minutes (set by caller)
- **Hash:** Token stored as bcrypt hash, not plaintext

---

#### findAllValid()

**Location:** `passwordResetRepository.ts:111-121`

**Signature:**
```typescript
async findAllValid(): Promise<PasswordResetData[]>
```

**Implementation:**
```typescript
async findAllValid(): Promise<PasswordResetData[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_valid_reset_tokens');

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRpcResultToPasswordResetData);
}
```

**Query Details:**
- **RPC Function:** `auth_find_valid_reset_tokens()`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** Array of all non-expired, non-used tokens
- **Used for:** Token verification (iterate and bcrypt compare since hashes can't be queried directly)
- **Filters (in RPC):** `expires_at > NOW() AND used_at IS NULL`

---

#### findRecentByUserId()

**Location:** `passwordResetRepository.ts:173-194`

**Signature:**
```typescript
async findRecentByUserId(userId: string): Promise<PasswordResetData[]>
```

**Implementation:**
```typescript
async findRecentByUserId(userId: string): Promise<PasswordResetData[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_recent_reset_tokens', {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  // RPC returns only id and created_at for rate limiting
  return (data ?? []).map((row: { id: string; created_at: string }) => ({
    id: row.id,
    userId: userId,
    tokenHash: '', // Not returned by RPC (not needed for rate limiting)
    createdAt: row.created_at,
    expiresAt: '', // Not returned by RPC
    usedAt: null,
    ipAddress: null,
  }));
}
```

**Query Details:**
- **RPC Function:** `auth_find_recent_reset_tokens(p_user_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Returns:** Partial data (id, created_at only) for rate limiting
- **Filters (in RPC):** `user_id = ? AND created_at > NOW() - INTERVAL '1 hour'`
- **Used for:** Prevent spam (limit password reset requests per user)

---

#### markUsed()

**Location:** `passwordResetRepository.ts:204-214`

**Signature:**
```typescript
async markUsed(id: string): Promise<void>
```

**Implementation:**
```typescript
async markUsed(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('auth_mark_reset_token_used', {
    p_token_id: id,
  });

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **RPC Function:** `auth_mark_reset_token_used(p_token_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Updates:** `used_at = NOW()` (one-time use enforcement)

---

#### invalidateAllForUser()

**Location:** `passwordResetRepository.ts:226-236`

**Signature:**
```typescript
async invalidateAllForUser(userId: string): Promise<void>
```

**Implementation:**
```typescript
async invalidateAllForUser(userId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('auth_invalidate_user_reset_tokens', {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}
```

**Query Details:**
- **RPC Function:** `auth_invalidate_user_reset_tokens(p_user_id)`
- **RLS Policy:** `USING(false)` - requires RPC
- **Updates:** Marks all unused tokens as used (`used_at = NOW()`)
- **Called when:**
  - User successfully resets password (invalidate all other tokens)
  - User requests a new reset (invalidate old ones)

---

#### deleteExpired()

**Location:** `passwordResetRepository.ts:245-261`

**Signature:**
```typescript
async deleteExpired(): Promise<number>
```

**Implementation:**
```typescript
async deleteExpired(): Promise<number> {
  const supabase = createAdminClient();

  // Note: With USING(false) policy, we need to use service_role
  // which bypasses RLS. This already uses admin client.
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}
```

**Query Details:**
- **NOT converted to RPC** - Cleanup job uses admin client directly
- **Filter:** `expires_at < NOW()`
- **Uses:** Admin client (bypasses `USING(false)` policy)
- **Returns:** Count of deleted rows

---

### Multi-Tenant Isolation Summary

**User Queries:**
- ✅ All find/exists functions include `client_id` parameter
- ✅ Tenant isolation enforced by RPC functions internally
- ✅ `updateTermsAcceptance()` uses `.eq('client_id', clientId)` (direct query)

**OTP Queries:**
- ✅ `USING(false)` RLS policy - all access via RPC
- ✅ Tenant isolation via linked `user_id` (users table enforces client_id)
- ✅ No direct client_id filter needed (OTPs are session-scoped)

**Client Queries:**
- ✅ NO client_id filter - `clients` table IS the tenant root
- ✅ Exception documented in ARCHITECTURE.md Section 9

**Password Reset Queries:**
- ✅ `USING(false)` RLS policy - all access via RPC
- ✅ Tenant isolation via `user_id` (users table enforces client_id)
- ✅ No direct client_id filter needed (tokens are user-scoped)

---

## Error Handling

### Service-Level Error Codes

**Thrown by authService:**

| Error Code | Thrown From | HTTP Status | Reason | User Action |
|------------|-------------|-------------|--------|-------------|
| `HANDLE_EXISTS` | initiateSignup:294 | 400 | Handle already registered for client | Choose different handle |
| `EMAIL_EXISTS` | initiateSignup:300 | 400 | Email already registered for client | Login or reset password |
| `CLIENT_NOT_FOUND` | initiateSignup:306 | 500 | Invalid clientId (system error) | Contact support |
| `AUTH_CREATION_FAILED` | initiateSignup:322, verifyOTP:455 | 500 | Supabase Auth operation failed | Retry or contact support |
| `INVALID_OTP` (format) | verifyOTP:395 | 400 | Code not 6 digits | Enter valid 6-digit code |
| `OTP_NOT_FOUND` | verifyOTP:403 | 400 | Session not found | Sign up again |
| `OTP_ALREADY_USED` | verifyOTP:408 | 400 | Code already consumed | Request new code |
| `OTP_EXPIRED` | verifyOTP:413 | 400 | Code older than 5 minutes | Request new code |
| `OTP_MAX_ATTEMPTS` | verifyOTP:418 | 400 | 3 failed attempts reached | Request new code |
| `INVALID_OTP` (wrong) | verifyOTP:427 | 400 | bcrypt compare failed | Try again (shows remaining attempts) |
| `USER_NOT_FOUND` | verifyOTP:440, resendOTP:514 | 400 | User record missing | Sign up again |
| `INVALID_SESSION` | resendOTP:495 | 400 | SessionId not found | Sign up again |
| `RESEND_TOO_SOON` | resendOTP:504 | 429 | Less than 30s since last resend | Wait X seconds |
| `INVALID_CREDENTIALS` | login:580, 586, 598 | 401 | Generic error (anti-enumeration) | Check handle and password |
| `EMAIL_NOT_VERIFIED` | login:603 | 403 | Email not verified yet | Verify email first |
| `RATE_LIMITED` | forgotPassword:674 | 429 | More than 3 reset requests/hour | Wait 1 hour |
| `INVALID_TOKEN` | resetPassword:743 | 400 | Token not found or invalid | Request new reset link |
| `TOKEN_EXPIRED` | resetPassword:748 | 400 | Token older than 15 minutes | Request new reset link |
| `TOKEN_USED` | resetPassword:753 | 400 | Token already consumed | Request new reset link |
| `WEAK_PASSWORD` | resetPassword:758, 762 | 400 | Password not 8-128 chars | Use valid password |
| `INTERNAL_ERROR` | resetPassword:775 | 500 | Password update failed | Retry |

### Error Flow Examples

**Scenario 1: User enters wrong OTP code**

1. User enters "123456" (wrong code)
2. Route calls `authService.verifyOTP(sessionId, "123456")`
3. Service validates format (authService.ts:394) ✅
4. Service queries OTP record (authService.ts:399) ✅
5. Service checks OTP exists (authService.ts:402) ✅
6. Service checks not used (authService.ts:407) ✅
7. Service checks not expired (authService.ts:412) ✅
8. Service checks attempts < 3 (authService.ts:417) ✅ (0 attempts so far)
9. Service verifies bcrypt hash (authService.ts:422) ❌ **FAILS**
10. Service increments attempts to 1 (authService.ts:425)
11. Service throws `INVALID_OTP` with "2 attempts remaining" (authService.ts:427)
12. Route catches error, returns 400

**Scenario 2: Signup rollback on failure**

1. User signs up with email/password/handle
2. Route calls `authService.initiateSignup(...)`
3. Service checks handle uniqueness (authService.ts:292) ✅
4. Service checks email uniqueness (authService.ts:298) ✅
5. Service creates Supabase Auth user (authService.ts:311) ✅ (authUserId = abc-123)
6. Service creates user in users table (authService.ts:330) ❌ **FAILS** (e.g., database connection error)
7. **Rollback triggered**: Service deletes Supabase Auth user (authService.ts:340)
8. Service re-throws error (authService.ts:341)
9. Route catches error, returns 500
10. **Result**: No orphaned Auth user, clean rollback

**Scenario 3: Anti-enumeration in login**

1. Attacker tries to enumerate users: login with handle "@nonexistent"
2. Route calls `authService.login(clientId, "@nonexistent", "password")`
3. Service queries user by handle (authService.ts:576)
4. User not found (line 579)
5. Service throws `INVALID_CREDENTIALS` with generic message (authService.ts:580)
6. Route returns 401

7. Attacker tries with valid handle but wrong password: "@validuser"
8. Service finds user (authService.ts:576) ✅
9. Service verifies password via Supabase Auth (authService.ts:591) ❌ **FAILS**
10. Service throws `INVALID_CREDENTIALS` with **same generic message** (authService.ts:598)
11. Route returns 401

**Result**: Attacker cannot tell if user exists or password is wrong (same error message both cases)

---

## Database Schema Context

### Tables Used

**Primary Table: `users`**
- **Schema Reference:** SchemaFinalv2.md:131-170
- **Purpose:** Store user accounts with authentication details
- **Key Fields:**
  - `id` (UUID, PK) - Matches Supabase Auth user ID
  - `client_id` (UUID, FK → clients.id) - Multi-tenant isolation
  - `tiktok_handle` (VARCHAR(100)) - TikTok username (without @)
  - `email` (VARCHAR(255), nullable) - Email address (nullable for Cruva imports)
  - `password_hash` (TEXT) - "[managed-by-supabase-auth]" placeholder (actual hash in Supabase Auth)
  - `email_verified` (BOOLEAN) - Email verification status
  - `is_admin` (BOOLEAN) - Admin role flag
  - `last_login_at` (TIMESTAMP, nullable) - Last login timestamp
- **Constraints:**
  - `UNIQUE(client_id, tiktok_handle)` - Handle unique per client
  - `UNIQUE(client_id, email)` - Email unique per client
  - `CHECK(tiktok_handle NOT LIKE '@%')` - Handle stored without @ prefix

**Related Table: `otps`**
- **Schema Reference:** SchemaFinalv2.md:171-192
- **Purpose:** Store OTP verification codes
- **Key Fields:**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK → users.id) - User being verified
  - `session_id` (VARCHAR(64), indexed) - Session identifier for HTTP-only cookie
  - `code_hash` (TEXT) - bcrypt hash of 6-digit OTP
  - `expires_at` (TIMESTAMP) - Expiry time (5 minutes from creation)
  - `used` (BOOLEAN) - Whether OTP has been consumed
  - `attempts` (INTEGER, default 0) - Failed verification attempts
  - `created_at` (TIMESTAMP) - For rate limiting resends
- **Indexes:**
  - `idx_otps_session_id` - Fast lookup by session
  - `idx_otps_user_id` - Fast lookup by user

**Related Table: `password_reset_tokens`**
- **Schema Reference:** SchemaFinalv2.md:193-220
- **Purpose:** Store password reset tokens
- **Key Fields:**
  - `id` (UUID, PK)
  - `user_id` (UUID, FK → users.id) - User resetting password
  - `token_hash` (TEXT) - bcrypt hash of reset token
  - `expires_at` (TIMESTAMP) - Expiry time (15 minutes from creation)
  - `used_at` (TIMESTAMP, nullable) - When token was consumed
  - `created_at` (TIMESTAMP) - For rate limiting
- **Indexes:**
  - `idx_password_reset_user_id` - Fast lookup by user

**Related Table: `clients`**
- **Schema Reference:** SchemaFinalv2.md:106-130
- **Purpose:** Multi-tenant client configuration
- **Used For:** Email branding (client.name in emails)

### Foreign Key Relationships

```
users
  └─→ client_id → clients(id) ON DELETE CASCADE

otps
  ├─→ user_id → users(id) ON DELETE CASCADE
  └─→ (no FK to clients - isolated via user_id)

password_reset_tokens
  ├─→ user_id → users(id) ON DELETE CASCADE
  └─→ (no FK to clients - isolated via user_id)
```

### RLS Policies Applied

**Note:** As documented in ARCHITECTURE.md Section 12, `otps` and `password_reset_tokens` tables use `USING(false)` RLS policies. All access is through RPC functions only.

**users table policies:**
- `creator_select_users` - Creators can SELECT their own record
- `creator_update_users` - Creators can UPDATE their own profile
- `admin_all_users` - Admins have full access
- `system_write_users` - Service role can INSERT/UPDATE for auth flows

**otps table policies:**
- `USING(false)` for all roles - No direct table access
- **Access via RPC functions only:**
  - `auth_create_otp` - Create OTP record (service_role)
  - `auth_find_otp_by_session` - Query by session_id (service_role)
  - `auth_increment_otp_attempts` - Increment attempts (service_role)
  - `auth_mark_otp_used` - Mark consumed (service_role)

**password_reset_tokens table policies:**
- `USING(false)` for all roles - No direct table access
- **Access via RPC functions only:**
  - `auth_create_reset_token` - Create token (service_role)
  - `auth_find_valid_reset_tokens` - Query valid tokens (service_role)
  - `auth_mark_reset_token_used` - Mark consumed (service_role)
  - `auth_invalidate_user_reset_tokens` - Invalidate all (service_role)
  - `auth_find_recent_reset_tokens` - Rate limiting (service_role)

**Why USING(false) policies?**
- Prevents any direct table queries (even with proper filters)
- Forces all access through secure RPC functions
- RPC functions run as SECURITY DEFINER with controlled logic
- See ARCHITECTURE.md Section 12 for full implementation details

---

## Security Context

### Authentication Requirements

**Public endpoints (no auth required):**
- POST /api/auth/check-handle
- POST /api/auth/signup
- POST /api/auth/verify-otp
- POST /api/auth/resend-otp
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

**Protected endpoints (auth required):**
- GET /api/auth/user-status
- GET /api/auth/onboarding-info

**Service functions are auth-neutral:**
- Functions accept clientId parameter for tenant isolation
- Routes handle authentication/authorization
- Services focus on business logic only

### Security Patterns

**Anti-Enumeration:**
1. **Login** (authService.ts:580, 586, 598):
   - Same error message for "user not found" and "wrong password"
   - Prevents attackers from discovering valid handles

2. **Forgot Password** (authService.ts:662-668):
   - Always returns success, even if user doesn't exist
   - Returns fake masked email for non-existent users
   - Prevents attackers from discovering valid emails

**Rate Limiting:**
1. **OTP Resend** (authService.ts:499-505):
   - Minimum 30 seconds between resends
   - Calculated dynamically and shown to user

2. **Password Reset** (authService.ts:672-678):
   - Maximum 3 requests per hour per user
   - Enforced by counting recent tokens

3. **Login** (handled at route level):
   - Maximum 5 failed attempts in 15 minutes
   - Account locked for 15 minutes after 5 failures

**Token Security:**
1. **OTP** (authService.ts:345-346):
   - Stored as bcrypt hash (rounds=10)
   - Never stored in plaintext
   - 6-digit code (1 million combinations)
   - Expires in 5 minutes
   - Single-use (marked used on success)
   - Max 3 verification attempts

2. **Password Reset** (authService.ts:687-688):
   - Token is 44 characters (32 random bytes base64url)
   - Stored as bcrypt hash (rounds=10)
   - Never stored in plaintext
   - Expires in 15 minutes
   - Single-use (marked used on success)
   - All user tokens invalidated after successful reset

**Rollback Patterns:**
1. **Signup Rollback** (authService.ts:339-342):
   - If users table creation fails, delete Supabase Auth user
   - Prevents orphaned Auth users
   - Ensures data consistency

**Multi-Tenant Isolation:**
1. **Handle Uniqueness** (authService.ts:292):
   - `UNIQUE(client_id, tiktok_handle)` constraint
   - Handle "@creator1" can exist in multiple clients

2. **Email Uniqueness** (authService.ts:298):
   - `UNIQUE(client_id, email)` constraint
   - Email can exist in multiple clients (different businesses)

3. **User Queries** (authService.ts:232, 576):
   - All user lookups filter by clientId
   - Cross-tenant access blocked at query level

### Password Handling

**Supabase Auth manages password hashing:**
- Signup: `supabase.auth.signUp()` auto-hashes password (authService.ts:311)
- Login: `supabase.auth.signInWithPassword()` verifies hash (authService.ts:591)
- Reset: `supabase.auth.admin.updateUserById()` auto-hashes new password (authService.ts:769)

**users.password_hash field:**
- Contains placeholder: "[managed-by-supabase-auth]" (authService.ts:335)
- Actual password hash stored in Supabase Auth's internal tables
- Service never sees or handles plaintext passwords after initial input

---

## Configuration Constants

**OTP Configuration** (authService.ts:27-30):
```typescript
const OTP_LENGTH = 6;                // 6-digit codes
const OTP_EXPIRY_MINUTES = 5;        // Per API_CONTRACTS.md
const BCRYPT_ROUNDS = 10;             // Industry standard
```

**Password Reset Configuration** (authService.ts:32-34):
```typescript
const RESET_TOKEN_EXPIRY_MINUTES = 15;  // Token lifetime
const RESET_TOKEN_RATE_LIMIT = 3;        // Max requests per hour
```

**Resend Rate Limit** (authService.ts:500):
```typescript
const minimumWaitTime = 30000; // 30 seconds between resends
```

---

## Helper Functions

**Utility functions in authService.ts:**

| Function | Lines | Purpose |
|----------|-------|---------|
| `generateOTP()` | 39-43 | Generate 6-digit random code |
| `generateSessionId()` | 48-50 | Generate 32-byte hex session ID |
| `generateResetToken()` | 56-58 | Generate 32-byte base64url token (44 chars) |
| `hashOTP()` | 63-65 | bcrypt hash OTP with rounds=10 |
| `verifyOTPHash()` | 70-72 | bcrypt compare OTP against hash |
| `sendOTPEmail()` | 78-93 | Send OTP email (placeholder, logs in dev) |
| `sendPasswordResetEmail()` | 99-129 | Send reset email (placeholder, logs in dev) |
| `maskEmail()` | 134-140 | Mask email for display (e.g., "j***@example.com") |

**TODO items:**
- Implement actual Resend email integration (authService.ts:86-92, 116-128)
- Configure RESEND_API_KEY and RESEND_DOMAIN environment variables

---

## Testing

### Manual Testing

**Test signup flow:**
```bash
# 1. Check handle (new user)
curl -X POST http://localhost:3000/api/auth/check-handle \
  -H "Content-Type: application/json" \
  -d '{"handle": "newcreator"}'
# Expected: {"exists": false, "hasEmail": false, "route": "signup"}

# 2. Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "tiktokHandle": "newcreator",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "agreedToTerms": true
  }'
# Expected: 201 with sessionId, userId
# Check console for OTP code in dev mode

# 3. Verify OTP (get sessionId from step 2, OTP from console)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}' \
  -H "Cookie: otp_session=<sessionId>"
# Expected: 200 with userId, email verified

# 4. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "newcreator", "password": "SecurePass123!"}'
# Expected: 200 with userId, sets auth-token cookie
```

**Test password reset flow:**
```bash
# 1. Request reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"identifier": "test@example.com"}'
# Expected: 200 with masked email
# Check console for reset link in dev mode

# 2. Reset password (get token from console)
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "<token>", "newPassword": "NewSecurePass456!"}'
# Expected: 200 with success message

# 3. Login with new password
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"handle": "newcreator", "password": "NewSecurePass456!"}'
# Expected: 200 with userId
```

### Unit Tests

**Location:** `tests/unit/services/authService.test.ts` (not yet created)

**Test coverage needed:**
- checkHandle: all 3 scenarios (user exists + email, user exists no email, user not found)
- initiateSignup: success, handle exists error, email exists error, rollback on failure
- verifyOTP: success, invalid format, wrong code, expired, max attempts
- resendOTP: success, rate limit error, session not found
- login: success, user not found, wrong password, email not verified
- forgotPassword: success (user found), success (user not found - anti-enumeration), rate limit
- resetPassword: success, invalid token, expired token, used token, weak password

---

## Debugging Checklist

**If signup fails:**
- [ ] Check Supabase connection: `SUPABASE_URL`, `SUPABASE_ANON_KEY` in .env.local
- [ ] Verify clientId is valid: `SELECT * FROM clients WHERE id = '<clientId>'`
- [ ] Check handle format: No @ prefix in database, added only for display
- [ ] Check email format: Lowercase, trimmed
- [ ] Verify bcrypt rounds=10 (not 12): authService.ts:30
- [ ] Check OTP expiry is 5 minutes (not 10): authService.ts:29

**If OTP verification fails:**
- [ ] Check sessionId from cookie matches otps.session_id
- [ ] Verify OTP not expired: `SELECT expires_at FROM otps WHERE session_id = '<id>'`
- [ ] Check attempts < 3: `SELECT attempts FROM otps WHERE session_id = '<id>'`
- [ ] Verify OTP hash with bcrypt compare (can't reverse hash to see actual code)
- [ ] Check OTP not already used: `SELECT used FROM otps WHERE session_id = '<id>'`
- [ ] Verify generateOTP() creates exactly 6 digits (pads with leading zeros)

**If login fails with generic error:**
- [ ] **By design**: Error message is generic for security (anti-enumeration)
- [ ] Check if user exists: `SELECT * FROM users WHERE client_id = '<id>' AND tiktok_handle = '<handle>'`
- [ ] Check if user has email: User might be Cruva import without email
- [ ] Check if email verified: `SELECT email_verified FROM users WHERE id = '<id>'`
- [ ] Verify password in Supabase Auth (can't check directly, must test login)
- [ ] Check Supabase Auth works: Try `supabase.auth.signInWithPassword()` directly

**If password reset fails:**
- [ ] Check rate limiting: `SELECT COUNT(*) FROM password_reset_tokens WHERE user_id = '<id>' AND created_at > NOW() - INTERVAL '1 hour'`
- [ ] Verify token expiry is 15 minutes (not 1 hour): authService.ts:33
- [ ] Check token hash matches: Must loop through all hashes and bcrypt compare
- [ ] Verify token not already used: `SELECT used_at FROM password_reset_tokens WHERE id = '<id>'`
- [ ] Check Supabase Auth admin API works: Verify `SUPABASE_SERVICE_ROLE_KEY`

**If multi-tenant isolation broken:**
- [ ] **CRITICAL SECURITY BUG** - Check all user queries include clientId
- [ ] Verify `userRepository.findByHandle()` includes client_id filter
- [ ] Verify `userRepository.findByEmail()` includes client_id filter
- [ ] Check UNIQUE constraints on users table: `UNIQUE(client_id, tiktok_handle)`, `UNIQUE(client_id, email)`
- [ ] Test with two different clients: Create users with same handle in both clients

### Common Issues

**Issue 1: OTP expires too quickly**
- **Symptom:** Users report OTP expired before they could enter it
- **Cause:** OTP_EXPIRY_MINUTES set to wrong value
- **Fix:** Verify authService.ts:29 is `const OTP_EXPIRY_MINUTES = 5;` (per API_CONTRACTS.md)
- **Reference:** API_CONTRACTS.md lines 334, 414, 700, 838, 920 - all specify 5 minutes

**Issue 2: Signup creates Supabase Auth user but not users table record**
- **Symptom:** User can't login, exists in Supabase Auth but not users table
- **Cause:** users table creation failed but rollback didn't work
- **Fix:** Check authService.ts:339-342 rollback logic
- **Debug:** Query Supabase Auth users vs users table: `SELECT * FROM auth.users` vs `SELECT * FROM users`

**Issue 3: Password reset token doesn't match**
- **Symptom:** Valid token from email returns "invalid token" error
- **Cause:** Token hash comparison loop not working (authService.ts:733-738)
- **Fix:** Verify bcrypt compare logic, check token not expired/used
- **Debug:** Log token length (should be 44 chars), log number of valid tokens found

**Issue 4: Handle uniqueness not enforced**
- **Symptom:** Two users in same client with same handle
- **Cause:** UNIQUE constraint not on database or not enforced
- **Fix:** Check SchemaFinalv2.md:139 - UNIQUE(client_id, tiktok_handle)
- **Test:** Try creating duplicate handle in same client, should fail

---

## Related Documentation

- **EXECUTION_PLAN.md:** [Phase 3 Tasks](../EXECUTION_PLAN.md#phase-3-authentication-system)
- **API_CONTRACTS.md:** [Authentication Endpoints](../API_CONTRACTS.md#authentication)
- **SchemaFinalv2.md:** [Users Table](../SchemaFinalv2.md) (lines 131-170)
- **SchemaFinalv2.md:** [OTPs Table](../SchemaFinalv2.md) (lines 171-192)
- **SchemaFinalv2.md:** [Password Reset Tokens Table](../SchemaFinalv2.md) (lines 193-220)
- **ARCHITECTURE.md Section 12:** SECURITY DEFINER Pattern for Auth (RPC Functions)
- **Loyalty.md:** [Flow 3 (Signup)](../Loyalty.md), [Flow 4 (OTP)](../Loyalty.md), [Flow 5 (Login)](../Loyalty.md)
- **ARCHITECTURE.md:** [Service Layer Pattern](../ARCHITECTURE.md#section-5)

---

**Document Version:** 1.1
**Steps Completed:** 3 / 3 (Steps 3.1, 3.2, 3.3 complete)
**Last Updated:** 2025-11-30
**Completeness:** Repositories ✅, Services ✅, API Routes ✅ - Next: Step 3.4 (Testing)
