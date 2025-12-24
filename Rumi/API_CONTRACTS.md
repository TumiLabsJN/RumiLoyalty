# API CONTRACTS

**Project:** RumiAI Loyalty Platform
**Base URL:** `/api`
**Authentication:** Supabase JWT token in `Authorization: Bearer <token>` header
**Date Created:** 2025-01-10
**Status:** In Progress - Contract Definitions

---

## TABLE OF CONTENTS

1. [Authentication](#authentication)
   - [Login Start](#login-start)
   - [Signup](#signup)
   - [OTP Verification](#otp-verification)
   - [Welcome Back](#welcome-back)
   - [Forgot Password](#forgot-password)
2. [Home](#home)
3. [Missions](#missions)
4. [Mission History](#mission-history)
5. [Rewards](#rewards)
6. [Rewards History](#rewards-history)
7. [Tiers](#tiers)
8. [Internal/System Endpoints](#internalsystem-endpoints)
   - [Client Configuration](#get-apiinternalclient-config)

---

# Authentication

## Login Start

**Page:** `/app/login/start/page.tsx`

### POST /api/auth/check-handle

**Purpose:** Validate TikTok handle and determine routing based on user existence and email registration status

#### Request

```http
POST /api/auth/check-handle
Content-Type: application/json
```

#### Request Body Schema

```typescript
interface CheckHandleRequest {
  handle: string              // TikTok handle (without @ symbol, already stripped by frontend)
}
```

#### Response Schema

```typescript
interface CheckHandleResponse {
  exists: boolean             // Does this handle exist in Supabase users table?
  has_email: boolean          // Does user have email registered?
  route: 'signup' | 'login'   // Where to send the user next
  handle: string              // Normalized handle with @ prefix
}
```

#### Example Request

```json
{
  "handle": "creatorpro"
}
```

#### Example Responses

**Success - Scenario A (User Exists + Email Registered):**
```json
{
  "exists": true,
  "has_email": true,
  "route": "login",
  "handle": "@creatorpro"
}
```

**Success - Scenario B (User Exists + No Email):**
```json
{
  "exists": true,
  "has_email": false,
  "route": "signup",
  "handle": "@creatorpro"
}
```

**Success - Scenario C (User Does Not Exist):**
```json
{
  "exists": false,
  "has_email": false,
  "route": "signup",
  "handle": "@creatorpro"
}
```

#### Business Logic

**Backend responsibilities:**

1. **Normalize handle** (add @ prefix if missing):
   ```typescript
   const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
   ```

2. **Query database:**
   ```sql
   SELECT id, email, email_verified
   FROM users
   WHERE tiktok_handle = $normalizedHandle
   LIMIT 1;
   ```

3. **Determine routing based on three scenarios:**

   **Scenario A: Handle EXISTS + Email NOT NULL**
   - User is a returning user (has registered previously)
   - Response: `{ exists: true, has_email: true, route: 'login', handle: '@creatorpro' }`
   - Frontend routes to `/login/wb` (password authentication)

   **Scenario B: Handle EXISTS + Email IS NULL**
   - User imported from Cruva (has videos) but never registered email
   - Response: `{ exists: true, has_email: false, route: 'signup', handle: '@creatorpro' }`
   - Frontend routes to `/login/signup` (collect email + password)

   **Scenario C: Handle NOT FOUND**
   - Word-of-mouth user (not in Cruva, no videos yet)
   - Response: `{ exists: false, has_email: false, route: 'signup', handle: '@creatorpro' }`
   - Frontend routes to `/login/signup` (new user registration)

4. **Return response**

#### Error Responses

**400 Bad Request - Missing Handle:**
```json
{
  "error": "HANDLE_REQUIRED",
  "message": "TikTok handle is required"
}
```

**400 Bad Request - Invalid Handle:**
```json
{
  "error": "INVALID_HANDLE",
  "message": "Handle can only contain letters, numbers, underscores, and periods"
}
```

**400 Bad Request - Handle Too Long:**
```json
{
  "error": "HANDLE_TOO_LONG",
  "message": "Handle must be 30 characters or less"
}
```

#### Security Notes

- Handle validation regex: `^[a-zA-Z0-9_.]{1,30}$`
- Rate limiting: Max 20 requests per IP per minute (prevent account enumeration)
- Do NOT expose sensitive user data (tier, sales, videos count, etc.)
- Only return minimal routing information

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-170)

**Fields Referenced:**
- `users.tiktok_handle` - VARCHAR(100) NOT NULL
- `users.email` - VARCHAR(255) NULLABLE
- `users.email_verified` - BOOLEAN DEFAULT false

---

## Signup

**Page:** `/app/login/signup/page.tsx`

### POST /api/auth/signup

**Purpose:** Create new user account with email + password, send OTP verification email

#### Request

```http
POST /api/auth/signup
Content-Type: application/json
```

#### Request Body Schema

```typescript
interface SignupRequest {
  handle: string          // TikTok handle with @ prefix (from check-handle flow)
  email: string           // User's email address
  password: string        // Plaintext password (min 8, max 128 chars, hashed server-side)
  agreedToTerms: boolean  // Must be true
}
```

#### Response Schema

```typescript
interface SignupResponse {
  success: boolean
  otpSent: boolean        // Confirms OTP email sent
  sessionId: string       // OTP session tracking (stored in HTTP-only cookie)
  userId: string          // UUID of created user
}
```

#### Example Request

```json
{
  "handle": "@creatorpro",
  "email": "creator@example.com",
  "password": "securePassword123",
  "agreedToTerms": true
}
```

#### Example Response

**Success:**
```json
{
  "success": true,
  "otpSent": true,
  "sessionId": "otp-session-abc-123",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Business Logic

**Backend responsibilities:**

1. **Validate input:**
   ```typescript
   // Email format
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
     return { error: "INVALID_EMAIL", message: "Invalid email format" }
   }

   // Password length
   if (password.length < 8) {
     return { error: "PASSWORD_TOO_SHORT", message: "Password must be at least 8 characters" }
   }
   if (password.length > 128) {
     return { error: "PASSWORD_TOO_LONG", message: "Password must be less than 128 characters" }
   }

   // Terms agreement
   if (!agreedToTerms) {
     return { error: "TERMS_NOT_ACCEPTED", message: "You must agree to the terms" }
   }
   ```

2. **Check for existing user:**
   ```sql
   SELECT id FROM users
   WHERE email = $email
   LIMIT 1;
   ```
   If exists: Return `EMAIL_ALREADY_EXISTS` error

3. **Hash password:**
   ```typescript
   import bcrypt from 'bcryptjs'
   const passwordHash = await bcrypt.hash(password, 10);  // rounds=10
   ```

4. **Create user record:**
   ```sql
   INSERT INTO users (
     client_id,
     tiktok_handle,
     email,
     password_hash,
     email_verified,
     terms_accepted_at,
     terms_version,
     current_tier,
     created_at,
     updated_at
   ) VALUES (
     $clientId,                -- From app config
     $handle,                  -- From request
     $email,                   -- From request
     $passwordHash,            -- Bcrypt hash
     false,                    -- Email not verified yet
     NOW(),                    -- Consent timestamp
     '2025-01-18',            -- Current terms version
     'tier_1',                -- Default tier
     NOW(),
     NOW()
   ) RETURNING id;
   ```

5. **Generate 6-digit OTP code:**
   ```typescript
   const otpCode = String(Math.floor(100000 + Math.random() * 900000));  // 6 digits
   const otpHash = await bcrypt.hash(otpCode, 10);
   const sessionId = crypto.randomUUID();
   ```

6. **Store OTP in database:**
   ```sql
   INSERT INTO otp_codes (
     user_id,
     session_id,
     code_hash,
     expires_at,
     attempts,
     used,
     created_at
   ) VALUES (
     $userId,
     $sessionId,
     $otpHash,
     NOW() + INTERVAL '5 minutes',
     0,
     false,
     NOW()
   );
   ```

7. **Send OTP email:**
   ```typescript
   // Using Resend or similar email service
   await sendEmail({
     to: email,
     subject: "Verify Your Email - [Client Name]",
     html: `Your verification code is: <strong>${otpCode}</strong>. Valid for 5 minutes.`
   })
   ```

8. **Set HTTP-only cookie for session tracking:**
   ```typescript
   return Response.json(response, {
     headers: {
       'Set-Cookie': `otp_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=300`
     }
   })
   ```

#### Error Responses

**400 Bad Request - Email Already Exists:**
```json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "An account with this email already exists"
}
```

**400 Bad Request - Invalid Email:**
```json
{
  "error": "INVALID_EMAIL",
  "message": "Invalid email format"
}
```

**400 Bad Request - Password Too Short:**
```json
{
  "error": "PASSWORD_TOO_SHORT",
  "message": "Password must be at least 8 characters"
}
```

**400 Bad Request - Password Too Long:**
```json
{
  "error": "PASSWORD_TOO_LONG",
  "message": "Password must be less than 128 characters"
}
```

**400 Bad Request - Terms Not Accepted:**
```json
{
  "error": "TERMS_NOT_ACCEPTED",
  "message": "You must agree to the terms and conditions"
}
```

**500 Internal Server Error - OTP Send Failed:**
```json
{
  "error": "OTP_SEND_FAILED",
  "message": "Failed to send verification email. Please try again."
}
```

#### Security Notes

- Password hashed with bcrypt (rounds=10) before storage - NEVER store plaintext
- OTP code also hashed before storage (never store plaintext OTP)
- OTP expires in 5 minutes from creation
- Session ID stored in HTTP-only cookie (XSS protection)
- Rate limiting: Max 5 signup attempts per IP per hour (prevent abuse)
- Terms consent timestamp + version stored for legal compliance

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-162) - Create user record with auth fields
- `otp_codes` (SchemaFinalv2.md:175-210) - Store OTP verification data

**Fields Referenced:**
- `users.client_id` - Multi-tenant isolation
- `users.tiktok_handle` - VARCHAR(100) NOT NULL
- `users.email` - VARCHAR(255) NULLABLE
- `users.password_hash` - VARCHAR(255) NOT NULL (bcrypt hash)
- `users.email_verified` - BOOLEAN DEFAULT false
- `users.terms_accepted_at` - TIMESTAMP NULLABLE
- `users.terms_version` - VARCHAR(50) NULLABLE
- `users.current_tier` - VARCHAR(50) DEFAULT 'tier_1'
- `otp_codes.session_id` - VARCHAR(100) NOT NULL UNIQUE
- `otp_codes.code_hash` - VARCHAR(255) NOT NULL
- `otp_codes.expires_at` - TIMESTAMP NOT NULL

---

## OTP Verification

**Page:** `/app/login/otp/page.tsx`

### POST /api/auth/verify-otp

**Purpose:** Verify 6-digit OTP code and create authenticated session

#### Request

```http
POST /api/auth/verify-otp
Content-Type: application/json
Cookie: otp_session={sessionId}
```

#### Request Body Schema

```typescript
interface VerifyOtpRequest {
  code: string           // 6-digit OTP code entered by user
}
```

#### Response Schema

```typescript
interface VerifyOtpResponse {
  success: boolean
  verified: boolean      // True if OTP is valid
  userId: string         // UUID of authenticated user
  sessionToken: string   // JWT token for authenticated session (stored in HTTP-only cookie)
}
```

#### Example Request

```json
{
  "code": "123456"
}
```

#### Example Response

**Success:**
```json
{
  "success": true,
  "verified": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Business Logic

**Backend responsibilities:**

1. **Get session ID from HTTP-only cookie:**
   ```typescript
   const sessionId = cookies.get('otp_session')?.value

   if (!sessionId) {
     return { error: "SESSION_NOT_FOUND", message: "OTP session expired. Please sign up again." }
   }
   ```

2. **Validate input:**
   ```typescript
   // Code format (6 digits)
   if (!/^\d{6}$/.test(code)) {
     return { error: "INVALID_CODE_FORMAT", message: "Code must be 6 digits" }
   }
   ```

3. **Query OTP record:**
   ```sql
   SELECT
     id,
     user_id,
     code_hash,
     expires_at,
     attempts,
     used
   FROM otp_codes
   WHERE session_id = $sessionId
     AND used = false
   LIMIT 1;
   ```

4. **Check if OTP exists and not used:**
   ```typescript
   if (!otpRecord) {
     return {
       error: "INVALID_SESSION",
       message: "OTP session not found or already used. Please sign up again."
     }
   }

   if (otpRecord.used) {
     return {
       error: "OTP_ALREADY_USED",
       message: "This code has already been used. Please request a new one."
     }
   }
   ```

5. **Check expiration:**
   ```typescript
   if (new Date() > new Date(otpRecord.expires_at)) {
     return {
       error: "OTP_EXPIRED",
       message: "This code has expired. Please request a new one."
     }
   }
   ```

6. **Check max attempts:**
   ```typescript
   if (otpRecord.attempts >= 3) {
     // Mark as used to prevent further attempts
     await db.execute(`
       UPDATE otp_codes
       SET used = true
       WHERE id = $otpRecordId
     `)

     return {
       error: "MAX_ATTEMPTS_EXCEEDED",
       message: "Too many incorrect attempts. Please sign up again."
     }
   }
   ```

7. **Verify OTP code:**
   ```typescript
   import bcrypt from 'bcryptjs'
   const isValid = await bcrypt.compare(code, otpRecord.code_hash)

   if (!isValid) {
     // Increment attempts
     const newAttempts = otpRecord.attempts + 1
     await db.execute(`
       UPDATE otp_codes
       SET attempts = $newAttempts
       WHERE id = $otpRecordId
     `)

     const attemptsRemaining = 3 - newAttempts

     return {
       error: "INVALID_OTP",
       message: attemptsRemaining > 0
         ? `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`
         : "Too many incorrect attempts. Please sign up again.",
       attemptsRemaining
     }
   }
   ```

8. **Mark OTP as used:**
   ```sql
   UPDATE otp_codes
   SET used = true
   WHERE id = $otpRecordId;
   ```

9. **Update user email verification status:**
   ```sql
   UPDATE users
   SET email_verified = true,
       updated_at = NOW()
   WHERE id = $userId;
   ```

10. **Create authenticated session (Supabase Auth):**
    ```typescript
    const { data: session, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: temporaryPassword  // Or create session directly
    })

    const sessionToken = session.access_token
    ```

11. **Set session cookie and clear OTP cookie:**
    ```typescript
    return Response.json(response, {
      headers: {
        'Set-Cookie': [
          `auth_token=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`, // 30 days
          `otp_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` // Clear OTP cookie
        ].join(', ')
      }
    })
    ```

#### Error Responses

**400 Bad Request - Invalid Code Format:**
```json
{
  "error": "INVALID_CODE_FORMAT",
  "message": "Code must be 6 digits"
}
```

**400 Bad Request - Invalid OTP:**
```json
{
  "error": "INVALID_OTP",
  "message": "Incorrect code. 2 attempts remaining.",
  "attemptsRemaining": 2
}
```

**400 Bad Request - OTP Expired:**
```json
{
  "error": "OTP_EXPIRED",
  "message": "This code has expired. Please request a new one."
}
```

**400 Bad Request - OTP Already Used:**
```json
{
  "error": "OTP_ALREADY_USED",
  "message": "This code has already been used. Please request a new one."
}
```

**400 Bad Request - Max Attempts Exceeded:**
```json
{
  "error": "MAX_ATTEMPTS_EXCEEDED",
  "message": "Too many incorrect attempts. Please sign up again."
}
```

**400 Bad Request - Session Not Found:**
```json
{
  "error": "SESSION_NOT_FOUND",
  "message": "OTP session expired. Please sign up again."
}
```

**400 Bad Request - Invalid Session:**
```json
{
  "error": "INVALID_SESSION",
  "message": "OTP session not found or already used. Please sign up again."
}
```

#### Security Notes

- OTP code hashed with bcrypt (rounds=10) - NEVER store plaintext
- OTP expires in 5 minutes from creation
- Max 3 verification attempts per OTP
- One-time use (marked as used after successful verification)
- Session ID in HTTP-only cookie (XSS protection)
- OTP session cookie cleared after successful verification
- Auth session cookie set with 30-day expiration
- Rate limiting: Max 10 verify attempts per IP per minute

#### Database Tables Used

**Primary:**
- `otp_codes` (SchemaFinalv2.md:175-210) - OTP verification data
- `users` (SchemaFinalv2.md:131-162) - Update email_verified status

**Fields Referenced:**
- `otp_codes.session_id` - VARCHAR(100) NOT NULL UNIQUE
- `otp_codes.user_id` - UUID REFERENCES users(id)
- `otp_codes.code_hash` - VARCHAR(255) NOT NULL (bcrypt hash)
- `otp_codes.expires_at` - TIMESTAMP NOT NULL
- `otp_codes.attempts` - INTEGER DEFAULT 0 (max 3)
- `otp_codes.used` - BOOLEAN DEFAULT false
- `users.email_verified` - BOOLEAN DEFAULT false

---

### POST /api/auth/resend-otp

**Purpose:** Invalidate old OTP and send new verification code to user's email

#### Request

```http
POST /api/auth/resend-otp
Content-Type: application/json
Cookie: otp_session={sessionId}
```

#### Request Body Schema

```typescript
interface ResendOtpRequest {
  // Empty body - session_id from HTTP-only cookie
}
```

#### Response Schema

```typescript
interface ResendOtpResponse {
  success: boolean
  sent: boolean              // Confirms new OTP email was sent
  expiresAt: string          // ISO timestamp when new OTP expires
  remainingSeconds: number   // Seconds until expiration (for countdown timer)
}
```

#### Example Request

```json
{}
```

#### Example Response

**Success:**
```json
{
  "success": true,
  "sent": true,
  "expiresAt": "2025-01-19T10:40:00Z",
  "remainingSeconds": 300
}
```

#### Business Logic

**Backend responsibilities:**

1. **Get session ID from HTTP-only cookie:**
   ```typescript
   const sessionId = cookies.get('otp_session')?.value

   if (!sessionId) {
     return { error: "SESSION_NOT_FOUND", message: "OTP session expired. Please sign up again." }
   }
   ```

2. **Query existing OTP record:**
   ```sql
   SELECT
     id,
     user_id,
     created_at
   FROM otp_codes
   WHERE session_id = $sessionId
   LIMIT 1;
   ```

3. **Check if session exists:**
   ```typescript
   if (!otpRecord) {
     return {
       error: "INVALID_SESSION",
       message: "OTP session not found. Please sign up again."
     }
   }
   ```

4. **Rate limiting - Check last resend time:**
   ```typescript
   const timeSinceCreation = Date.now() - new Date(otpRecord.created_at).getTime()
   const minimumWaitTime = 30000 // 30 seconds

   if (timeSinceCreation < minimumWaitTime) {
     const waitSeconds = Math.ceil((minimumWaitTime - timeSinceCreation) / 1000)
     return {
       error: "RESEND_TOO_SOON",
       message: `Please wait ${waitSeconds} seconds before requesting a new code.`
     }
   }
   ```

5. **Get user details:**
   ```sql
   SELECT email FROM users WHERE id = $userId LIMIT 1;
   ```

6. **Invalidate old OTP (mark as used):**
   ```sql
   UPDATE otp_codes
   SET used = true
   WHERE session_id = $sessionId;
   ```

7. **Generate new 6-digit OTP code:**
   ```typescript
   const newOtpCode = String(Math.floor(100000 + Math.random() * 900000))  // 6 digits
   const newOtpHash = await bcrypt.hash(newOtpCode, 10)
   const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
   ```

8. **Create new OTP record (reuse same session_id):**
   ```sql
   INSERT INTO otp_codes (
     user_id,
     session_id,
     code_hash,
     expires_at,
     attempts,
     used,
     created_at
   ) VALUES (
     $userId,
     $sessionId,          -- Reuse same session ID
     $newOtpHash,
     $expiresAt,
     0,
     false,
     NOW()
   );
   ```

9. **Send new OTP email:**
   ```typescript
   await sendEmail({
     to: user.email,
     subject: "Your New Verification Code",
     html: `Your new verification code is: <strong>${newOtpCode}</strong>. Valid for 5 minutes.`
   })
   ```

10. **Return response:**
    ```typescript
    return Response.json({
      success: true,
      sent: true,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: 300
    })
    ```

#### Error Responses

**400 Bad Request - Session Not Found:**
```json
{
  "error": "SESSION_NOT_FOUND",
  "message": "OTP session expired. Please sign up again."
}
```

**400 Bad Request - Invalid Session:**
```json
{
  "error": "INVALID_SESSION",
  "message": "OTP session not found. Please sign up again."
}
```

**429 Too Many Requests - Resend Too Soon:**
```json
{
  "error": "RESEND_TOO_SOON",
  "message": "Please wait 25 seconds before requesting a new code."
}
```

**500 Internal Server Error - Email Send Failed:**
```json
{
  "error": "EMAIL_SEND_FAILED",
  "message": "Failed to send verification email. Please try again."
}
```

#### Security Notes

- New OTP code hashed with bcrypt (rounds=10)
- Old OTP marked as used (prevents reuse)
- Same session ID reused (no need to reset cookie)
- New OTP expires in 5 minutes from creation
- Rate limiting: Min 30 seconds between resend requests
- Rate limiting: Max 5 resend requests per session (total)
- Email sending uses secure SMTP connection

#### Database Tables Used

**Primary:**
- `otp_codes` (SchemaFinalv2.md:175-210) - Create new OTP record
- `users` (SchemaFinalv2.md:131-162) - Get email address

**Fields Referenced:**
- `otp_codes.session_id` - VARCHAR(100) NOT NULL UNIQUE (reused)
- `otp_codes.user_id` - UUID REFERENCES users(id)
- `otp_codes.code_hash` - VARCHAR(255) NOT NULL
- `otp_codes.expires_at` - TIMESTAMP NOT NULL
- `otp_codes.used` - BOOLEAN DEFAULT false
- `otp_codes.created_at` - TIMESTAMP DEFAULT NOW()
- `users.email` - VARCHAR(255) NULLABLE

---

## Welcome Back

**Page:** `/app/login/wb/page.tsx`

### Endpoints

#### POST /api/auth/login

**Purpose:** Authenticates existing user with handle and password, creates authenticated session.

**Route:** `POST /api/auth/login`

**Authentication:** None required (public endpoint)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| handle | string | ✅ Yes | Must start with @, 3-30 chars | TikTok handle (from sessionStorage, set by check-handle) |
| password | string | ✅ Yes | 8-128 chars | User's plaintext password (hashed server-side for comparison) |

**TypeScript Interface:**
```typescript
export interface LoginRequest {
  handle: string      // TikTok handle with @ prefix (e.g., "@jazzyjayna")
  password: string    // Plaintext password (validated by backend with bcrypt)
}
```

**Example Request:**
```json
{
  "handle": "@jazzyjayna",
  "password": "SecureP@ss123"
}
```

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Always true on success |
| userId | string | UUID of authenticated user |
| sessionToken | string | JWT token for authenticated session (also set in HTTP-only cookie) |

**TypeScript Interface:**
```typescript
export interface LoginResponse {
  success: boolean
  userId: string         // UUID of authenticated user
  sessionToken: string   // JWT token (stored in HTTP-only cookie)
}
```

**Example Response:**
```json
{
  "success": true,
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Business Logic:**

```sql
-- Step 1: Find user by handle
SELECT
  id,
  handle,
  email,
  email_verified,
  password_hash
FROM users
WHERE handle = $1  -- e.g., '@jazzyjayna'
LIMIT 1;

-- Step 2: Verify password (server-side bcrypt comparison)
-- bcrypt.compare(plaintext_password, password_hash_from_db)
-- Returns: boolean (true if match, false if no match)

-- Step 3: If password valid, create authenticated session
-- Uses Supabase Auth: supabase.auth.signInWithPassword()
-- Or custom JWT creation with user_id payload

-- Step 4: Set HTTP-only cookie with sessionToken
-- Cookie name: 'auth-token' or 'session-token'
-- Flags: HttpOnly, Secure (HTTPS only), SameSite=Strict
-- Expiration: 7 days (configurable)

-- Step 5: Return success response
```

**Backend Implementation Notes:**

1. **Retrieve User:**
   - Query users table by handle
   - If no user found → 401 INVALID_CREDENTIALS (don't reveal "user not found")

2. **Validate Password:**
   - Use bcrypt.compare(password, password_hash)
   - If invalid → 401 INVALID_CREDENTIALS
   - Rate limit: Lock account after 5 failed attempts in 15 minutes

3. **Check Email Verification:**
   - If email_verified = false → 403 EMAIL_NOT_VERIFIED
   - Provide helpful message: "Please verify your email before logging in."

4. **Create Session:**
   - Generate JWT token with payload: { userId, handle, email, iat, exp }
   - Set HTTP-only cookie: auth-token
   - Store session in database (optional: sessions table for tracking)

5. **Response:**
   - Return { success: true, userId, sessionToken }
   - Frontend routes to /home (or /login/loading for smooth transition)

#### Error Responses

**400 Bad Request - Missing Fields:**
```json
{
  "error": "MISSING_FIELDS",
  "message": "Please provide both handle and password."
}
```

**400 Bad Request - Invalid Handle Format:**
```json
{
  "error": "INVALID_HANDLE",
  "message": "Handle must start with @ and be 3-30 characters."
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Incorrect handle or password. Please try again."
}
```

**403 Forbidden - Email Not Verified:**
```json
{
  "error": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email before logging in. Check your inbox for the verification link."
}
```

**429 Too Many Requests - Account Locked:**
```json
{
  "error": "ACCOUNT_LOCKED",
  "message": "Too many failed login attempts. Please try again in 15 minutes or reset your password."
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Something went wrong. Please try again."
}
```

#### Security Notes

- Passwords validated with bcrypt.compare (NOT plain text comparison)
- HTTP-only cookie prevents XSS attacks (JavaScript cannot access token)
- SameSite=Strict prevents CSRF attacks
- Rate limiting: Max 5 failed attempts per handle in 15 minutes
- No user enumeration: Same error message for "user not found" and "wrong password"
- Email verification required before login (email_verified = true)
- Session token expires after 7 days (configurable)
- JWT payload includes: userId, handle, email, issued_at, expires_at
- Login attempts logged for security auditing

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-172) - Authenticate user credentials

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.handle` - VARCHAR(31) UNIQUE NOT NULL
- `users.email` - VARCHAR(255) NULLABLE
- `users.email_verified` - BOOLEAN DEFAULT false
- `users.password_hash` - VARCHAR(255) NOT NULL
- `users.created_at` - TIMESTAMP DEFAULT NOW()
- `users.last_login` - TIMESTAMP NULLABLE (updated on successful login)

---

## Loading Page

**Page:** `/app/login/loading/page.tsx`

### Endpoints

#### GET /api/auth/user-status

**Purpose:** Determine authenticated user's recognition status and routing destination after successful login/OTP verification.

**Route:** `GET /api/auth/user-status`

**Authentication:** Required (session cookie from login or OTP verification)

**Query Parameters:** None

**Request Headers:**
- Cookie: `auth-token` (HTTP-only session cookie set by login or verify-otp endpoints)

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| userId | string | UUID of authenticated user |
| isRecognized | boolean | Has user logged in before? (checks last_login_at field) |
| redirectTo | string | Backend-determined route ("/home" or "/login/welcomeunr") |
| emailVerified | boolean | Email verification status (for debugging/logging) |

**TypeScript Interface:**
```typescript
export interface UserStatusResponse {
  userId: string         // UUID of authenticated user
  isRecognized: boolean  // Has logged in before (last_login_at IS NOT NULL)
  redirectTo: string     // Backend-determined route
  emailVerified: boolean // Email verification status
}
```

**Example Response (First-time user):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "isRecognized": false,
  "redirectTo": "/login/welcomeunr",
  "emailVerified": true
}
```

**Example Response (Returning user):**
```json
{
  "userId": "987e6543-e21b-12d3-a456-426614174111",
  "isRecognized": true,
  "redirectTo": "/home",
  "emailVerified": true
}
```

**Business Logic:**

```sql
-- Step 1: Get authenticated user from session token
-- (JWT decode or session lookup from HTTP-only cookie)

-- Step 2: Query user info
SELECT
  id,
  email_verified,
  last_login_at,
  created_at
FROM users
WHERE id = $1;  -- From authenticated session

-- Step 3: Determine recognition status
-- Recognition logic:
-- - If last_login_at IS NULL → First login (unrecognized)
-- - If last_login_at IS NOT NULL → Returning user (recognized)

-- Step 4: Determine routing destination
-- If isRecognized = false → redirectTo = "/login/welcomeunr"
-- If isRecognized = true → redirectTo = "/home"

-- Step 5: Update last_login_at timestamp
UPDATE users
SET last_login_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- IMPORTANT: Update AFTER checking recognition status
-- This ensures first login is properly detected before updating timestamp

-- Step 6: Return response with routing instruction
```

**Backend Implementation Notes:**

1. **Authentication Check:**
   - Verify session token from HTTP-only cookie
   - If invalid/missing → 401 Unauthorized
   - Redirect frontend to `/login/start`

2. **Recognition Logic:**
   - Query `last_login_at` field from users table
   - NULL = first login → `isRecognized: false`, `redirectTo: "/login/welcomeunr"`
   - NOT NULL = returning user → `isRecognized: true`, `redirectTo: "/home"`

3. **Update Last Login:**
   - Set `last_login_at = NOW()` and `updated_at = NOW()`
   - **Critical:** Do this AFTER checking recognition status
   - This ensures first-time users are properly routed to welcome page

4. **Routing Determination:**
   - Backend owns all routing logic
   - Frontend just follows `redirectTo` instruction
   - Allows backend to add new routing rules without frontend changes

5. **Future Extensibility:**
   - Can add: If `email_verified = false` → `redirectTo: "/verify-email"`
   - Can add: If `account_status = 'suspended'` → `redirectTo: "/account/suspended"`
   - Can add: If `onboarding_completed = false` → `redirectTo: "/onboarding"`
   - Can add: If `profile_incomplete = true` → `redirectTo: "/profile/setup"`

#### Error Responses

**401 Unauthorized - Not Authenticated:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Please log in to continue."
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Something went wrong. Please try again."
}
```

#### Security Notes

- Requires valid session token (HTTP-only cookie)
- No sensitive data exposed (no password_hash, payment info, etc.)
- Updates last_login_at timestamp for audit trail
- Can be called multiple times (idempotent after first call)
- Session token validated before any database queries
- No PII exposed beyond userId (UUID)

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-172) - Check recognition status, update last_login_at

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.email_verified` - BOOLEAN DEFAULT false
- `users.last_login_at` - TIMESTAMP (line 161) - Key field for recognition logic
- `users.created_at` - TIMESTAMP DEFAULT NOW()
- `users.updated_at` - TIMESTAMP DEFAULT NOW()

---

## Welcome Unrecognized

**Page:** `/app/login/welcomeunr/page.tsx`

### Endpoints

#### GET /api/auth/onboarding-info

**Purpose:** Provide client-specific welcome and onboarding information for first-time users after authentication.

**Route:** `GET /api/auth/onboarding-info`

**Authentication:** Required (session cookie from login or OTP verification)

**Query Parameters:** None

**Request Headers:**
- Cookie: `auth-token` (HTTP-only session cookie)

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| heading | string | Welcome heading (can include emojis) |
| message | string | Main onboarding message (can include dynamic dates) |
| submessage | string | Secondary message (communication channel info) |
| buttonText | string | CTA button text |

**TypeScript Interface:**
```typescript
export interface OnboardingInfoResponse {
  heading: string      // Welcome heading (e.g., "🎉 Welcome! 🎉")
  message: string      // Main message (e.g., "Our onboarding begins January 27th!")
  submessage: string   // Secondary message (e.g., "Watch your DMs for details")
  buttonText: string   // Button CTA (e.g., "Explore Program", "Get Started")
}
```

**Example Response (TikTok influencer client):**
```json
{
  "heading": "🎉 Welcome! 🎉",
  "message": "You're all set! Our onboarding begins this coming Monday.",
  "submessage": "👀 Watch your DMs for your sample request link.",
  "buttonText": "Explore Program"
}
```

**Example Response (Different client with email onboarding):**
```json
{
  "heading": "Welcome to the Program!",
  "message": "Your onboarding starts on January 27th, 2025.",
  "submessage": "Check your email inbox for next steps.",
  "buttonText": "Get Started"
}
```

**Business Logic:**

```sql
-- Step 1: Get authenticated user from session token
-- (JWT decode or session lookup from HTTP-only cookie)

-- Step 2: Get user's client_id
SELECT client_id
FROM users
WHERE id = $1;  -- From authenticated session

-- Step 3: Get client-specific onboarding configuration
-- MVP: Return hardcoded default response (single client)
-- Future: Query onboarding_messages table by client_id

-- Step 4: Build response with dynamic content
-- Can include:
-- - Dynamic dates (next Monday, specific date calculated server-side)
-- - Client-specific communication channels (DMs, email, SMS)
-- - Localization (language based on user preference)
-- - A/B testing variants (randomize and track)

-- Step 5: Return response
```

**Backend Implementation Notes:**

1. **MVP Implementation (Single Client):**
   - Hardcode response in backend
   - Return default onboarding message for all users
   - Simple JavaScript object returned by endpoint

2. **Future Multi-Client Implementation:**
   - Create `onboarding_messages` table with client_id foreign key
   - Schema: `{ id, client_id, heading, message, submessage, button_text, created_at }`
   - Query: `SELECT * FROM onboarding_messages WHERE client_id = $1`

3. **Dynamic Date Calculation:**
   - Backend can calculate "next Monday" based on current date
   - Example: If today is Thursday, return "this coming Monday"
   - Example: If today is Tuesday, return "next Monday"
   - Or return specific formatted date: "January 27th, 2025"

4. **Localization (Future):**
   - Add `language` field to users table or detect from Accept-Language header
   - Store translations in onboarding_messages table
   - Return content in user's preferred language

5. **A/B Testing (Future):**
   - Store multiple variants in database
   - Randomize which variant is returned
   - Track conversion rates (which variant leads to more engagement)

6. **Caching:**
   - Response can be cached per client_id (doesn't change per user)
   - Cache duration: 1 hour (or until admin updates messaging)

#### Error Responses

**401 Unauthorized - Not Authenticated:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Please log in to continue."
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Something went wrong. Please try again."
}
```

#### Security Notes

- Requires valid session token (HTTP-only cookie)
- No sensitive data exposed (just UI copy/text)
- Can be cached per client (onboarding info doesn't change per request)
- Rate limiting not critical (one-time page load per user session)
- No PII exposed (only marketing copy)

#### Database Tables Used

**Primary (MVP):**
- `users` (SchemaFinalv2.md:131-172) - Get user's client_id
- `clients` (SchemaFinalv2.md:105-128) - Client configuration

**Future (Multi-Client):**
- `onboarding_messages` (to be created) - Store client-specific onboarding copy

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.client_id` - UUID REFERENCES clients(id)
- `clients.id` - UUID PRIMARY KEY
- `clients.name` - VARCHAR(255) (for logging/debugging)

---

## Forgot Password

**Page:** `/app/login/forgotpw/page.tsx`

### Endpoints

#### POST /api/auth/forgot-password

**Purpose:** Generate password reset token and send email with reset link

**Route:** `POST /api/auth/forgot-password`

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| identifier | string | ✅ Yes | Valid email OR handle format | User's email or TikTok handle (user can provide either) |

**TypeScript Interface:**
```typescript
export interface ForgotPasswordRequest {
  identifier: string  // Email OR handle (e.g., "user@example.com" or "@creatorpro")
}
```

**Example Request:**
```json
{
  "identifier": "creator@example.com"
}
```
OR
```json
{
  "identifier": "@creatorpro"
}
```

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| sent | boolean | Email sent successfully (always true on 200) |
| emailHint | string | Masked email for confirmation (e.g., "cr****@example.com") |
| expiresIn | number | Minutes until token expires (15) |

**TypeScript Interface:**
```typescript
export interface ForgotPasswordResponse {
  sent: boolean       // Email sent successfully
  emailHint: string   // Masked email "cr****@example.com"
  expiresIn: number   // Minutes until token expires (15)
}
```

**Example Response:**
```json
{
  "sent": true,
  "emailHint": "cr****@example.com",
  "expiresIn": 15
}
```

**Business Logic:**
```sql
-- 1. Lookup user by email OR handle
SELECT id, email FROM users
WHERE email = $1 OR handle = $1
LIMIT 1;

-- 2. If user not found, still return success (prevent enumeration)
-- But don't send email

-- 3. If user found, generate secure token
-- Token format: crypto.randomBytes(32).toString('base64url') (44 chars)
-- Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2"

-- 4. Hash token with bcrypt before storing
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
VALUES ($1, $2, NOW() + INTERVAL '15 minutes', NOW());

-- 5. Send email via SendGrid/AWS SES
-- Email template:
--   Subject: Reset Your Password - {Client Name}
--   Body:
--     Hi @{handle},
--
--     Click the link below to reset your password:
--     [Reset Password Button] → https://app.com/login/resetpw?token={token}
--
--     This link expires in 15 minutes.
--
--     If you didn't request this, ignore this email.

-- 6. Mask email for response
-- Example: "creator@example.com" → "cr****@example.com"
-- Logic: Show first 2 chars + **** + @ + domain
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_IDENTIFIER | Please provide an email or handle. | identifier field missing or empty |
| 400 | INVALID_IDENTIFIER | Please provide a valid email or handle. | identifier format invalid (not email or handle) |
| 429 | TOO_MANY_REQUESTS | Too many reset requests. Please try again in 1 hour. | More than 3 requests in 1 hour from same identifier |
| 500 | EMAIL_SEND_FAILED | Failed to send reset email. Please try again. | Email service error (SendGrid/SES down) |

**Error Response Format:**
```typescript
{
  error: "TOO_MANY_REQUESTS",
  message: "Too many reset requests. Please try again in 1 hour."
}
```

**Security Notes:**
- **Anti-Enumeration:** Always return success (200) even if user not found (prevents attackers from discovering valid emails/handles)
- **Rate Limiting:** Max 3 requests per hour per identifier (prevents abuse)
- **Token Storage:** Token stored as bcrypt hash, not plaintext (prevents token theft if DB compromised)
- **Token Expiration:** 15 minutes only (reduces attack window)
- **One-Time Use:** Token marked as used after successful reset (prevents replay attacks)
- **HTTPS Only:** Reset links must use HTTPS (prevents man-in-the-middle)

**Database Tables Used:**

**Primary (MVP):**
- `users` (SchemaFinalv2.md:131-172) - Lookup by email or handle
- `password_reset_tokens` (to be created) - Store token hash and expiration

**Future Table: password_reset_tokens**
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,      -- bcrypt hashed token
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,          -- created_at + 15 minutes
  used_at TIMESTAMP NULL,                 -- NULL = not used yet
  ip_address VARCHAR(45) NULL,            -- For security audit log
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.email` - VARCHAR(255) (for lookup and email sending)
- `users.handle` - VARCHAR(31) UNIQUE (stored as tiktok_handle in DB)
- `password_reset_tokens.token_hash` - VARCHAR(255) (bcrypt hash)
- `password_reset_tokens.expires_at` - TIMESTAMP (for validation)
- `password_reset_tokens.used_at` - TIMESTAMP (for one-time use check)

---

## Reset Password

**Page:** `/app/login/resetpw/page.tsx`

### Endpoints

#### POST /api/auth/reset-password

**Purpose:** Verify reset token and update user's password

**Route:** `POST /api/auth/reset-password`

**Authentication:** None required (token provides authentication)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| token | string | ✅ Yes | 44-char base64url string | Reset token from email link (URL query param) |
| newPassword | string | ✅ Yes | 8-128 chars | New plaintext password (hashed server-side) |

**TypeScript Interface:**
```typescript
export interface ResetPasswordRequest {
  token: string       // Reset token from URL query parameter
  newPassword: string // New plaintext password (8-128 chars, validated server-side)
}
```

**Example Request:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2",
  "newPassword": "NewSecureP@ss123"
}
```

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Password updated successfully (always true on 200) |
| message | string | Success message for display to user |

**TypeScript Interface:**
```typescript
export interface ResetPasswordResponse {
  success: boolean
  message: string  // "Password updated successfully. You can now log in with your new password."
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Password updated successfully. You can now log in with your new password."
}
```

**Business Logic:**
```sql
-- 1. Find token in password_reset_tokens table
SELECT user_id, created_at, used_at, expires_at
FROM password_reset_tokens
WHERE token_hash = $1  -- Use bcrypt.compare(token, token_hash)
LIMIT 1;

-- 2. Validate token
-- Check: token exists
-- Check: NOT expired (expires_at > NOW())
-- Check: NOT used (used_at IS NULL)

-- 3. Validate new password
-- Length: 8-128 characters
-- (Optional) Strength: uppercase, lowercase, number, special char
-- (Optional) Not in common passwords list (rockyou.txt top 10k)

-- 4. Hash new password with bcrypt (rounds=10)
UPDATE users
SET
  password_hash = $1,  -- bcrypt.hash(newPassword, 10)
  updated_at = NOW()
WHERE id = $2;

-- 5. Mark token as used (prevent reuse)
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE token_hash = $1;

-- 6. Invalidate all user sessions (force re-login for security)
DELETE FROM user_sessions WHERE user_id = $1;

-- 7. (Optional) Send confirmation email
-- "Your password was changed on {date} at {time}"
-- "If you didn't make this change, contact support immediately."
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_FIELDS | Please provide token and new password. | token or newPassword missing |
| 400 | INVALID_TOKEN | Invalid or expired reset link. Please request a new one. | Token not found, expired, or already used |
| 400 | TOKEN_EXPIRED | This reset link has expired. Please request a new one. | Token older than 15 minutes |
| 400 | TOKEN_USED | This reset link has already been used. Please request a new one. | Token's used_at is not NULL |
| 400 | WEAK_PASSWORD | Password must be at least 8 characters. | Password too short |
| 400 | PASSWORD_TOO_COMMON | This password is too common. Please choose a stronger password. | Password in common passwords list |
| 500 | UPDATE_FAILED | Failed to update password. Please try again. | Database error during update |

**Error Response Format:**
```typescript
{
  error: "INVALID_TOKEN",
  message: "Invalid or expired reset link. Please request a new one."
}
```

**Security Notes:**
- **Token Validation:** Expiration checked (15 minutes from creation)
- **One-Time Use:** Token can only be used once (used_at timestamp prevents reuse)
- **Password Hashing:** Password hashed with bcrypt rounds=10 (industry standard)
- **Session Invalidation:** All user sessions invalidated after reset (forces re-login on all devices)
- **Confirmation Email:** User notified of password change (alerts to unauthorized changes)
- **No Token in Logs:** Token never logged server-side (prevents token theft from logs)
- **HTTPS Only:** Endpoint must use HTTPS (prevents password interception)

**Database Tables Used:**

**Primary (MVP):**
- `password_reset_tokens` (to be created) - Validate token hash
- `users` (SchemaFinalv2.md:131-172) - Update password_hash
- `user_sessions` (if exists) - Invalidate all sessions

**Fields Referenced:**
- `password_reset_tokens.token_hash` - VARCHAR(255) (for bcrypt compare)
- `password_reset_tokens.expires_at` - TIMESTAMP (for expiration check)
- `password_reset_tokens.used_at` - TIMESTAMP (for one-time use check)
- `users.password_hash` - VARCHAR(255) (update with new hash)
- `users.updated_at` - TIMESTAMP (track when password changed)

**Password Requirements:**
- **Minimum Length:** 8 characters
- **Maximum Length:** 128 characters
- **Recommended Strength:** Uppercase + lowercase + number + special char
- **Common Passwords:** Check against rockyou.txt top 10k (optional but recommended)

**Post-Reset Behavior:**
- User redirected to `/login/wb` (Welcome Back login page)
- Success message can be shown via query param: `/login/wb?reset=success`
- User must log in with new password (all sessions invalidated)

---

# Home

**Page:** `/app/home/page.tsx`

## GET /api/dashboard/featured-mission

**Purpose:** Returns the ONE mission to display in circular progress (Section 1) with all necessary UI data.

### Request

```http
GET /api/dashboard/featured-mission
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface FeaturedMissionResponse {
  // Core status
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'

  // Mission data (null if status='no_missions')
  mission: {
    id: string                        // UUID for claim API call
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string               // Static per mission_type: "Sales Sprint" (sales), "Fan Favorite" (likes), "Road to Viral" (views), "Lights, Camera, Go!" (videos), "VIP Raffle" (raffle)

    // Progress
    currentProgress: number           // mission_progress.current_value (0 for raffle)
    targetValue: number               // missions.target_value (1 for raffle)
    progressPercentage: number        // Computed: (current / target) * 100, or 100 for raffle (user eligible)

    // Reward
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null       // For gift_card, spark_ads, commission_boost, discount
    rewardCustomText: string | null   // For physical_gift, experience
    rewardDisplayText: string         // Formatted display text (e.g., "$25 Gift Card", "$30 Spark Ads Boost")

    // Display
    unitText: 'sales' | 'videos' | 'likes' | 'views'  // For "300 of 500 {unitText}"
  } | null

  // Tier info (always present)
  tier: {
    name: string                      // "Bronze", "Silver", "Gold", "Platinum"
    color: string                     // Hex color from tiers.tier_color
  }

  // Congratulations modal
  showCongratsModal: boolean          // True if first login after recent fulfillment
  congratsMessage: string | null      // "Your $50 Gift Card has been delivered!"
  supportEmail: string                // Client's support email

  // Empty state message (only if status='no_missions')
  emptyStateMessage: string | null    // "You've completed all missions for your tier..."
}
```

### Example Responses

**Active Mission:**
```json
{
  "status": "active",
  "mission": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sales_dollars",
    "displayName": "Sales Sprint",
    "currentProgress": 300,
    "targetValue": 500,
    "progressPercentage": 60,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales_dollars"
  },
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": null
}
```

**Completed Mission:**
```json
{
  "status": "completed",
  "mission": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sales_dollars",
    "displayName": "Sales Sprint",
    "currentProgress": 500,
    "targetValue": 500,
    "progressPercentage": 100,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales_dollars"
  },
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": null
}
```

**No Missions Available:**
```json
{
  "status": "no_missions",
  "mission": null,
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": "You've completed all missions for your tier. Keep it up to unlock more missions!"
}
```

### Business Logic

#### **Display Name Mapping (Static per Mission Type):**

Mission display names are **static** and stored in `missions.display_name`. They do NOT change based on target value.

| Mission Type | `display_name` | Example Targets | Notes |
|--------------|----------------|-----------------|-------|
| `sales_dollars` | "Sales Sprint" | $500, $1K, $5K | Same name for all sales missions in dollars mode |
| `sales_units` | "Sales Sprint" | 100, 500, 1000 units | Same name for all sales missions in units mode |
| `likes` | "Fan Favorite" | 5K, 50K, 100K likes | Same name regardless of like count target |
| `views` | "Road to Viral" | 10K, 100K, 1M views | Same name regardless of view count target |
| `videos` | "Lights, Camera, Go!" | 10, 20, 50 videos | Same name regardless of video count target |
| `raffle` | "VIP Raffle" | N/A (no target) | Raffle missions always use this name |

**Backend Implementation:**
```typescript
// Auto-populate display_name on mission creation
function getDisplayNameForMissionType(missionType: string): string {
  const displayNameMap = {
    'sales_dollars': 'Sales Sprint',
    'sales_units': 'Sales Sprint',
    'likes': 'Fan Favorite',
    'views': 'Road to Viral',
    'videos': 'Lights, Camera, Go!',
    'raffle': 'VIP Raffle'
  }
  return displayNameMap[missionType]
}
```

#### **Mission Priority (Fallback Order):**
1. Raffle (VIP Raffle) - **ONLY if activated=true**
2. Sales Dollars (Sales Sprint)
3. Sales Units (Sales Sprint)
4. Videos (Lights, Camera, Go!)
5. Likes (Fan Favorite)
6. Views (Road to Viral)

**Implementation:** Single query with IN clause, sort by priority in application layer

```sql
-- Single optimized query (vs 4 sequential queries)
-- IMPORTANT: Excludes 'claimed' missions - they remain on Missions page but disappear from Home
-- IMPORTANT: Includes 'raffle' missions ONLY if activated=true (surprise raffle feature!)
SELECT m.*, mp.*, b.*
FROM missions m
LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = $userId
LEFT JOIN rewards b ON m.reward_id = b.id
WHERE m.client_id = $clientId
  AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
  AND m.tier_eligibility = $currentTier
  AND m.enabled = true
  -- Raffle-specific condition: Only show if activated=true (surprise feature)
  AND (m.mission_type != 'raffle' OR m.activated = true)
  -- Exclude if user already participated in this raffle
  AND NOT EXISTS (
    SELECT 1 FROM raffle_participations rp
    WHERE rp.mission_id = m.id AND rp.user_id = $userId
  )
  AND (mp.status IN ('active', 'completed') OR mp.status IS NULL)  -- Excludes 'claimed' missions
ORDER BY
  CASE m.mission_type
    WHEN 'raffle' THEN 0      -- 🎰 HIGHEST PRIORITY (surprise raffle!)
    WHEN 'sales_dollars' THEN 1
    WHEN 'sales_units' THEN 2
    WHEN 'videos' THEN 3
    WHEN 'likes' THEN 4
    WHEN 'views' THEN 5
  END
LIMIT 1
```

**Performance:** ~80ms (single query vs 200ms for sequential)

---

#### **Status Computation:**
- `active`: User has progress record with status='active'
- `completed`: Progress >= target, status='completed', NOT yet claimed
- `no_missions`: No missions found matching criteria

**Note:** `claimed` status is intentionally EXCLUDED from home page. Once a mission is claimed, it:
- ✅ Remains visible on Missions page (with "Claimed" badge)
- ❌ Disappears from Home page (replaced by next available mission)
- ✅ Moves to Mission History after fulfillment

**Design Decision:**
Backend calculates and sends `progressPercentage` for featured mission to ensure:
- ✅ Single source of truth for mission progress calculation
- ✅ Frontend only handles SVG circle geometry (radius, circumference, strokeOffset)
- ✅ Business logic stays in backend (Service layer)

Frontend should receive percentage and use it for display only. SVG math (circle radius, circumference calculations) remains in frontend as pure UI presentation logic.

---

#### **Congratulations Modal Detection:**

**Logic:** Compare `mission_progress.fulfilled_at` with `users.last_login_at`

```typescript
// Check if any mission was fulfilled AFTER user's last login
const recentFulfillment = await supabase
  .from('mission_progress')
  .select(`
    fulfilled_at,
    missions!inner (
      rewards (value_data)
    )
  `)
  .eq('user_id', userId)
  .eq('status', 'fulfilled')
  .gt('fulfilled_at', user.last_login_at)  // ← Key comparison
  .order('fulfilled_at', { ascending: false })
  .limit(1)
  .single()

// If found, show modal ONCE
if (recentFulfillment) {
  showCongratsModal = true
  congratsMessage = `Your $${recentFulfillment.missions.rewards.value_data.amount} Gift Card has been delivered!`
}

// After rendering response, update last_login_at
// This prevents modal from showing again on next login
await supabase
  .from('users')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', userId)
```

**Why this works:**
- ✅ No schema changes needed (uses existing `last_login_at` field)
- ✅ Automatic "mark as seen" (updating timestamp prevents re-showing)
- ✅ Simple timestamp comparison
- ✅ Works across multiple logins/sessions

**Important:** Update `last_login_at` AFTER checking for fulfillments, not before

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch mission data"
}
```

---

---

## GET /api/dashboard

**Purpose:** Returns ALL data for the home page in a single optimized call. This is the main unified endpoint that powers the entire home screen.

### Request

```http
GET /api/dashboard
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface DashboardResponse {
  // ============================================
  // USER & TIER INFO (for header and tier badges)
  // ============================================
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    email: string                       // From users.email
    clientName: string                  // From clients.company_name
  }

  // Client configuration (for UI formatting)
  client: {
    id: string                          // UUID from clients.id
    vipMetric: 'sales' | 'units'        // From clients.vip_metric - determines VIP progression tracking
    vipMetricLabel: string              // Display label: "sales" (sales mode) OR "units" (units mode)
  }

  // Current tier data
  currentTier: {
    id: string                          // UUID from tiers.id
    name: string                        // From tiers.tier_name ("Bronze", "Silver", "Gold", "Platinum")
    color: string                       // From tiers.tier_color (hex, e.g., "#F59E0B")
    order: number                       // From tiers.tier_order (1, 2, 3, 4)
    checkpointExempt: boolean           // From tiers.checkpoint_exempt (DB snake_case → API camelCase)
  }

  // Next tier data (null if already at highest tier)
  nextTier: {
    id: string                          // UUID
    name: string                        // Next tier name
    color: string                       // Next tier color (for future use)
    minSalesThreshold: number           // From tiers.sales_threshold (DB snake_case → API camelCase)
  } | null

  // ============================================
  // TIER PROGRESSION (checkpoint-based tracking)
  // ============================================
  tierProgress: {
    currentValue: number                // Current metric value ($ or units based on client.vipMetric)
    targetValue: number                 // Target metric value ($ or units based on client.vipMetric)
    progressPercentage: number          // Computed: (currentValue / targetValue) * 100

    // Pre-formatted display strings (backend handles formatting)
    currentFormatted: string            // "$2,500" (sales mode) OR "2,500 units" (units mode)
    targetFormatted: string             // "$5,000" (sales mode) OR "5,000 units" (units mode)

    checkpointExpiresAt: string         // From users.next_checkpoint_at (ISO 8601)
    checkpointExpiresFormatted: string  // Human readable: "March 15, 2025"
    checkpointMonths: number            // From clients.checkpoint_months (e.g., 4)
  }

  // ============================================
  // FEATURED MISSION (circular progress section)
  // ============================================
  // This section uses the SAME data structure as GET /api/dashboard/featured-mission
  // (See above for full schema and examples)
  featuredMission: {
    status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available'
    mission: {
      id: string
      type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
      displayName: string  // Static mapping from missions.display_name (see Display Name Mapping below)

      // Progress fields (for non-raffle missions)
      currentProgress: number             // Raw value (0 for raffle)
      targetValue: number                 // Raw value (1 for raffle)
      progressPercentage: number          // 0-100 for regular missions, 100 for raffle (user eligible to enter)

      // Pre-formatted display strings (backend handles formatting)
      currentFormatted: string            // "$350" (sales) OR "350" (units/videos) OR prize name (raffle: "iPhone 15 Pro")
      targetFormatted: string             // "$500" (sales) OR "500" (units/videos) OR null (raffle)
      targetText: string                  // "of $500 sales" OR "of 20 videos" OR "Enter to Win!" (raffle)
      progressText: string                // "$350 of $500 sales" OR "Enter to win iPhone 15 Pro" (raffle)

      // Raffle-specific fields (null for non-raffle missions)
      isRaffle: boolean                   // true if mission_type='raffle', false otherwise
      raffleEndDate: string | null        // ISO 8601 - When raffle drawing happens
      // NOTE: Prize name comes from rewardCustomText (physical_gift) or rewardAmount (gift_card)

      // Reward details
      rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
      rewardAmount: number | null         // For gift_card, spark_ads (e.g., 50 for "$50")
      rewardCustomText: string | null     // For physical_gift, experience (e.g., "iPhone 16 Pro")
      rewardDisplayText: string           // Formatted display text (e.g., "$25 Gift Card", "$30 Spark Ads Boost")
    } | null
    tier: {
      name: string
      color: string
    }
    showCongratsModal: boolean
    congratsMessage: string | null
    supportEmail: string
    emptyStateMessage: string | null
  }

  // ============================================
  // CURRENT TIER REWARDS (rewards showcase card)
  // ============================================
  // Backend handles display logic:
  // - Sorted by rewards.display_order ASC
  // - Limited to 4 rewards (top priority rewards only)
  // - Frontend receives pre-sorted, pre-limited data
  currentTierRewards: Array<{
    id: string                          // UUID from rewards.id
    type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    name: string                        // From rewards.name (auto-generated, simple form)
    displayText: string                 // Backend-generated UI-ready text with prefixes and duration
    description: string                 // From rewards.description (15 char max for physical_gift/experience)
    valueData: {                        // From rewards.value_data (JSONB) - transformed to camelCase
      amount?: number                   // For gift_card, spark_ads
      percent?: number                  // For commission_boost, discount
      durationDays?: number             // For commission_boost, discount
    } | null
    rewardSource: 'vip_tier' | 'mission' // From rewards.reward_source (always 'vip_tier' for this endpoint)
    redemptionQuantity: number          // From rewards.redemption_quantity
    displayOrder: number                // From rewards.display_order (used for sorting)
  }>

  totalRewardsCount: number             // Total rewards available at user's tier (for "And more!" logic)
}
```

### Example Response

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "handle": "creatorpro",
    "email": "creator@example.com",
    "clientName": "Stateside Growers"
  },
  "client": {
    "id": "client-uuid-123",
    "vipMetric": "sales",
    "vipMetricLabel": "sales"
  },
  "currentTier": {
    "id": "tier-gold-uuid",
    "name": "Gold",
    "color": "#F59E0B",
    "order": 3,
    "checkpointExempt": false
  },
  "nextTier": {
    "id": "tier-platinum-uuid",
    "name": "Platinum",
    "color": "#818CF8",
    "minSalesThreshold": 5000
  },
  "tierProgress": {
    "currentValue": 4200,
    "targetValue": 5000,
    "progressPercentage": 84,
    "currentFormatted": "$4,200",
    "targetFormatted": "$5,000",
    "checkpointExpiresAt": "2025-03-15T00:00:00Z",
    "checkpointExpiresFormatted": "March 15, 2025",
    "checkpointMonths": 4
  },
  "featuredMission": {
    "status": "active",
    "mission": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "sales_dollars",
      "displayName": "Sales Sprint",
      "currentProgress": 300,
      "targetValue": 500,
      "progressPercentage": 60,
      "currentFormatted": "$300",
      "targetFormatted": "$500",
      "targetText": "of $500 sales",
      "progressText": "$300 of $500 sales",
      "isRaffle": false,
      "raffleEndDate": null,
      "rewardType": "gift_card",
      "rewardAmount": 50,
      "rewardCustomText": null
    },
    "tier": {
      "name": "Gold",
      "color": "#F59E0B"
    },
    "showCongratsModal": false,
    "congratsMessage": null,
    "supportEmail": "support@statesidegrowers.com",
    "emptyStateMessage": null
  }
}
```

### Example Response 2: Surprise Raffle (Featured Mission)

**Scenario:** Admin activates a surprise raffle. User opens app and sees raffle FIRST (highest priority).

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "creatorpro",
    "email": "creator@example.com",
    "clientName": "Stateside Growers"
  },
  "client": {
    "id": "client-uuid-123",
    "vipMetric": "sales",
    "vipMetricLabel": "sales"
  },
  "currentTier": {
    "id": "tier-gold-uuid",
    "name": "Gold",
    "color": "#F59E0B",
    "order": 3,
    "checkpointExempt": false
  },
  "nextTier": {
    "id": "tier-platinum-uuid",
    "name": "Platinum",
    "color": "#818CF8",
    "minSalesThreshold": 5000
  },
  "tierProgress": {
    "currentValue": 4200,
    "targetValue": 5000,
    "progressPercentage": 84,
    "currentFormatted": "$4,200",
    "targetFormatted": "$5,000",
    "checkpointExpiresAt": "2025-03-15T00:00:00Z",
    "checkpointExpiresFormatted": "March 15, 2025",
    "checkpointMonths": 4
  },
  "featuredMission": {
    "status": "raffle_available",
    "mission": {
      "id": "mission-raffle-surprise-2025",
      "type": "raffle",
      "displayName": "VIP Raffle",
      "currentProgress": 0,
      "targetValue": 1,
      "progressPercentage": 0,
      "currentFormatted": null,
      "targetFormatted": null,
      "targetText": "Chance to win",
      "progressText": "Chance to win iPhone 16 Pro",
      "isRaffle": true,
      "raffleEndDate": "2025-02-01T23:59:59Z",
      "rewardType": "physical_gift",
      "rewardAmount": null,
      "rewardCustomText": "iPhone 16 Pro"
    },
    "tier": {
      "name": "Gold",
      "color": "#F59E0B"
    },
    "showCongratsModal": false,
    "congratsMessage": null,
    "supportEmail": "support@statesidegrowers.com",
    "emptyStateMessage": null
  },
  "currentTierRewards": [
    {
      "id": "reward-1-uuid",
      "type": "experience",
      "name": "VIP Event Access",
      "displayText": "Win a VIP Event Access",
      "description": "Get exclusive access to VIP events and meetups",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 1
    },
    {
      "id": "reward-2-uuid",
      "type": "physical_gift",
      "name": "Wireless Headphones",
      "displayText": "Win a Wireless Headphones",
      "description": "Premium wireless headphones",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 2
    },
    {
      "id": "reward-3-uuid",
      "type": "gift_card",
      "name": "$50 Gift Card",
      "displayText": "$50 Gift Card",
      "description": "Amazon gift card",
      "valueData": {
        "amount": 50
      },
      "redemptionQuantity": 2,
      "displayOrder": 3
    },
    {
      "id": "reward-4-uuid",
      "type": "commission_boost",
      "name": "5% Pay Boost",
      "displayText": "+5% Pay boost for 30 Days",
      "description": "Temporary commission increase",
      "valueData": {
        "percent": 5,
        "durationDays": 30
      },
      "redemptionQuantity": 1,
      "displayOrder": 4
    }
  ],
  "totalRewardsCount": 8
}
```

### Business Logic

#### **User & Tier Info Query:**

```sql
-- Get user data with tier info
SELECT
  u.id,
  u.tiktok_handle as handle,
  u.email,
  c.company_name as client_name,
  t.id as tier_id,
  t.tier_name,
  t.tier_color,
  t.tier_order,
  u.tier_achieved_at,
  u.next_checkpoint_at
FROM users u
JOIN clients c ON u.client_id = c.id
JOIN tiers t ON u.current_tier = t.id
WHERE u.id = $userId
```

---

#### **Next Tier Query:**

```sql
-- Get next tier in sequence
SELECT
  t.id,
  t.tier_name,
  t.tier_color,
  t.sales_threshold
FROM tiers t
WHERE t.client_id = $clientId
  AND t.tier_order = $currentTierOrder + 1
LIMIT 1
```

**If no result:** User is at highest tier, return `nextTier: null`

---

#### **Tier Progress Calculation:**

```sql
-- Tier Progress Calculation (read from precomputed users table)
SELECT
  CASE
    WHEN c.vip_metric = 'sales' THEN u.checkpoint_sales_current
    WHEN c.vip_metric = 'units' THEN u.checkpoint_units_current
  END as metric_total,
  u.manual_adjustments_total,
  u.manual_adjustments_units
FROM users u
JOIN clients c ON c.id = u.client_id
WHERE u.id = $userId
  AND u.client_id = $clientId;
```

**Computation:**
```typescript
// Total checkpoint value = Precomputed checkpoint total + manual adjustments
const currentValue = (client.vip_metric === 'sales')
  ? (user.checkpoint_sales_current + user.manual_adjustments_total)
  : (user.checkpoint_units_current + user.manual_adjustments_units)

const progressPercentage = nextTier
  ? Math.min((currentValue / nextTier.threshold) * 100, 100)
  : 100  // Already at max tier

// Format display strings based on vipMetric
let currentFormatted, targetFormatted, vipMetricLabel

if (client.vipMetric === 'sales') {
  currentFormatted = `$${currentValue.toLocaleString()}`  // "$4,200"
  targetFormatted = `$${nextTier.threshold.toLocaleString()}`  // "$5,000"
  vipMetricLabel = 'sales'
} else {
  currentFormatted = `${currentValue.toLocaleString()} units`  // "4,200 units"
  targetFormatted = `${nextTier.threshold.toLocaleString()} units`  // "5,000 units"
  vipMetricLabel = 'units'
}

const checkpointExpiresFormatted = new Date(user.next_checkpoint_at)
  .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
```

**Design Decisions:**

1. **Backend Formats All Display Strings:**
   - ✅ `currentFormatted`, `targetFormatted`, `progressText` all pre-formatted
   - ✅ Formatting based on `client.vipMetric` setting
   - ✅ Sales mode: "$4,200" | Units mode: "4,200 units"
   - ✅ Single source of truth for formatting logic

2. **VIP Metric-Aware Formatting:**
   - **Sales Mode:** `vipMetric = 'sales'` → "$" prefix, no suffix
   - **Units Mode:** `vipMetric = 'units'` → No prefix, " units" suffix
   - **Decision from user:** "2,500 units of 5,000 units" (explicit 'units' on both)

3. **Mission Progress Text Formatting:**

```typescript
// Backend generates 3 text fields for mission progress
function formatMissionProgress(mission) {
  const { type, current_value, target_value } = mission

  let currentFormatted, targetFormatted, targetText, progressText, unitLabel

  switch (type) {
    case 'sales_dollars':
      currentFormatted = `$${current_value.toLocaleString()}`
      targetFormatted = `$${target_value.toLocaleString()}`
      unitLabel = 'sales'
      break

    case 'sales_units':
      currentFormatted = current_value.toLocaleString()
      targetFormatted = target_value.toLocaleString()
      unitLabel = 'units'
      break

    case 'videos':
    case 'likes':
    case 'views':
      currentFormatted = current_value.toLocaleString()
      targetFormatted = target_value.toLocaleString()
      unitLabel = type  // 'videos', 'likes', 'views'
      break

    case 'raffle':
      // Raffle missions have no progress tracking
      currentFormatted = null
      targetFormatted = null
      targetText = 'Chance to win'

      // Format prize display from reward info (not rafflePrizeName!)
      let prizeDisplay
      if (mission.reward.type === 'gift_card' || mission.reward.type === 'spark_ads') {
        prizeDisplay = `$${mission.reward.value_data.amount}`  // "$500"
      } else if (mission.reward.type === 'physical_gift' || mission.reward.type === 'experience') {
        prizeDisplay = mission.reward.description  // "iPhone 16 Pro"
      } else {
        prizeDisplay = mission.reward.name  // Fallback
      }

      progressText = `Chance to win ${prizeDisplay}`

      return {
        currentFormatted,
        targetFormatted,
        targetText,
        progressText,
        isRaffle: true,
        raffleEndDate: mission.raffle_end_date
        // NOTE: No rafflePrizeName! Use rewardCustomText instead
      }
  }

  targetText = `of ${targetFormatted} ${unitLabel}`
  progressText = `${currentFormatted} ${targetText}`

  return {
    currentFormatted,
    targetFormatted,
    targetText,
    progressText,
    isRaffle: false,
    raffleEndDate: null
  }
}
```

**Examples:**
   - **sales_dollars:**
     - `currentFormatted`: "$350"
     - `targetText`: "of $500 sales"
     - `progressText`: "$350 of $500 sales"
     - `isRaffle`: false
   - **sales_units:**
     - `currentFormatted`: "350"
     - `targetText`: "of 500 units"
     - `progressText`: "350 of 500 units"
     - `isRaffle`: false
   - **videos:**
     - `currentFormatted`: "8"
     - `targetText`: "of 20 videos"
     - `progressText`: "8 of 20 videos"
     - `isRaffle`: false
   - **raffle (gift_card reward):**
     - `currentFormatted`: null
     - `targetText`: "Chance to win"
     - `progressText`: "Chance to win $500"
     - `isRaffle`: true
     - `raffleEndDate`: "2025-02-01T23:59:59Z"
     - `rewardType`: "gift_card"
     - `rewardAmount`: 500
   - **raffle (physical_gift reward):**
     - `currentFormatted`: null
     - `targetText`: "Chance to win"
     - `progressText`: "Chance to win iPhone 16 Pro"
     - `isRaffle`: true
     - `raffleEndDate`: "2025-02-01T23:59:59Z"
     - `rewardType`: "physical_gift"
     - `rewardCustomText`: "iPhone 16 Pro"

**Frontend Conditional UI for Raffle:**

```typescript
// Frontend checks isRaffle to render different UI
if (mission.isRaffle) {
  // Raffle-specific circular progress UI
  // Prize display comes from reward info (not rafflePrizeName!)
  const prizeDisplay = mission.rewardCustomText || `$${mission.rewardAmount}`

  return (
    <div className="circular-progress">
      {/* NO PROGRESS RING for raffles */}
      <div className="center-text">
        <span className="large-text">{mission.targetText}</span>  {/* "Chance to win" */}
        <span className="small-text">{prizeDisplay}</span>  {/* "iPhone 16 Pro" or "$500" */}
      </div>
      <Button>
        <CloverIcon />  {/* 4-leaf clover icon */}
        Join Raffle
      </Button>
    </div>
  )
} else {
  // Regular mission UI with progress ring
  return (
    <div className="circular-progress">
      <svg>/* Progress ring based on progressPercentage */</svg>
      <div className="center-text">
        <span className="large-text">{mission.currentFormatted}</span>  {/* "$350" */}
        <span className="small-text">{mission.targetText}</span>  {/* "of $500 sales" */}
      </div>
      <p>Next: {reward.name}</p>
    </div>
  )
}
```

**Frontend Responsibilities:**
- ✅ Check `isRaffle` flag to conditionally render UI
- ✅ Hide progress ring for raffles (no progress tracking)
- ✅ Show "Join Raffle" button with clover icon
- ✅ Display prize from `rewardCustomText` (physical_gift) or `rewardAmount` (gift_card)
- ✅ No need for `rafflePrizeName` - use reward info directly!

Frontend should NOT recalculate percentages or format numbers. Backend provides all UI-ready strings to ensure:
- ✅ Consistent formatting across all clients
- ✅ i18n-ready (future: different locales/currencies)
- ✅ Business logic centralized
- ✅ Frontend only handles SVG geometry, layout, and conditional rendering

**Tier Expiration Business Rules:**

| Tier Configuration (DB) | Expires? | Frontend Display |
|------------|----------|------------------|
| **checkpoint_exempt = true** | ❌ Never | Hide expiration date entirely. No tooltip needed. |
| **checkpoint_exempt = false** | ✅ Yes | Show "{TierName} Expires on {Date}" with ℹ️ tooltip explaining checkpoint recalculation. |

**Logic:**
- Tiers with `checkpoint_exempt = true` (DB) are guaranteed (typically first tier, but configurable by admin)
- Tiers with `checkpoint_exempt = false` (DB) are recalculated at each checkpoint based on sales performance
- Backend sends `checkpointExempt` field (camelCase) in currentTier object

**Frontend Implementation:**
```typescript
// Check if current tier is exempt from checkpoints
const tierExpires = !currentTier.checkpointExempt  // camelCase

// Only show expiration if tier is NOT exempt
{tierExpires && (
  <p>{currentTier.name} Expires on {tierProgress.checkpointExpiresFormatted}</p>
)}
```

**Tooltip Message (for higher tiers only):**
> "We review your VIP level at each checkpoint based on recent sales. Keep selling to stay {currentTierName} or move up!"

---

## API Naming Conventions

**Database → API Transformation:**

The API layer transforms database snake_case to JavaScript-idiomatic camelCase:

| Database Field (snake_case) | API Response Field (camelCase) | Example |
|------------------------------|--------------------------------|---------|
| `tiers.checkpoint_exempt` | `currentTier.checkpointExempt` | `false` |
| `clients.vip_metric` | `client.vipMetric` | `"sales"` |
| `clients.checkpoint_months` | `tierProgress.checkpointMonths` | `4` |
| `users.next_checkpoint_at` | `tierProgress.checkpointExpiresAt` | `"2025-03-15T00:00:00Z"` |
| `tiers.tier_name` | `currentTier.name` | `"Gold"` |
| `tiers.tier_color` | `currentTier.color` | `"#F59E0B"` |
| `users.tiktok_handle` | `user.handle` | `"creatorpro"` |
| `rewards.reward_source` | `reward.rewardSource` | `"vip_tier"` |

**Backend Transformation Example:**
```typescript
// Service layer transforms DB response to API response
function transformDashboardResponse(dbData) {
  return {
    client: {
      id: dbData.client_id,
      vipMetric: dbData.vip_metric  // snake_case → camelCase
    },
    currentTier: {
      name: dbData.tier_name,
      checkpointExempt: dbData.checkpoint_exempt  // snake_case → camelCase
    },
    tierProgress: {
      checkpointMonths: dbData.checkpoint_months,
      checkpointExpiresAt: dbData.next_checkpoint_at
    }
  }
}
```

**Why camelCase?**
- ✅ JavaScript/TypeScript native convention
- ✅ Industry standard (Stripe, GitHub, Google APIs)
- ✅ No transformation needed in frontend: `response.vipMetric` (not `response.vip_metric`)
- ✅ TypeScript/ESLint defaults expect camelCase

---

#### **Current Tier Rewards Query:**

```sql
-- Get rewards for current tier (pre-sorted and limited by backend)
SELECT
  r.id,
  r.type,
  r.name,
  r.description,
  r.value_data,
  r.redemption_quantity,
  r.display_order
FROM rewards r
WHERE r.tier_eligibility = $currentTierId
  AND r.client_id = $clientId
  AND r.enabled = true
  AND r.reward_source = 'vip_tier'  -- Only VIP tier rewards (not mission rewards)
ORDER BY r.display_order ASC  -- Backend sorts by admin-defined order
LIMIT 4;                      -- Backend limits to top 4 rewards

-- Get total count for "And more!" logic
SELECT COUNT(*) as total_count
FROM rewards r
WHERE r.tier_eligibility = $currentTierId
  AND r.client_id = $clientId
  AND r.enabled = true
  AND r.reward_source = 'vip_tier';  -- Only VIP tier rewards (not mission rewards)
```

**Backend Responsibilities:**
- ✅ Sorts rewards by `display_order ASC` (admin-defined priority)
- ✅ Limits to 4 rewards (reduces payload size)
- ✅ Provides `totalRewardsCount` (for "And more!" message)
- ✅ Generates `displayText` for each reward (UI-ready with prefixes and duration)
- ✅ Transforms `value_data` from snake_case to camelCase (`valueData`)

**Backend displayText Generation:**
```typescript
function generateDisplayText(reward) {
  const { type, value_data } = reward

  switch (type) {
    case 'gift_card':
      return `$${value_data.amount} Gift Card`

    case 'commission_boost':
      return `+${value_data.percent}% Pay boost for ${value_data.duration_days} Days`

    case 'spark_ads':
      return `+$${value_data.amount} Ads Boost`

    case 'discount':
      return `+${value_data.percent}% Deal Boost for ${value_data.duration_days} Days`

    case 'physical_gift':
      return `Win a ${reward.name}`

    case 'experience':
      return `Win a ${reward.name}`

    default:
      return reward.name
  }
}
```

**Frontend Responsibilities:**
- ✅ Receives pre-sorted, pre-limited data (no sorting/limiting needed)
- ✅ Maps `type` to UI icons (e.g., `gift_card` → Gift icon, `commission_boost` → HandCoins icon)
- ✅ Displays `displayText` directly (no formatting needed)
- ✅ Shows "And more!" if `totalRewardsCount > 4`

**Performance Benefits:**
- 📉 50% less data transferred (4 rewards vs 8+ rewards)
- ⚡ No client-side sorting overhead (O(1) vs O(n log n))
- 🚀 Faster page loads (smaller API response)

**Example:**
```typescript
// Frontend receives (already sorted and limited):
currentTierRewards = [
  { type: "experience", displayOrder: 1 },
  { type: "physical_gift", displayOrder: 2 },
  { type: "gift_card", displayOrder: 3 },
  { type: "commission_boost", displayOrder: 4 }
]
totalRewardsCount = 8  // Total available at tier

// Frontend just renders (no sorting needed):
displayedRewards = currentTierRewards  // Use as-is
hasMoreRewards = totalRewardsCount > 4  // true (show "And more!")
```

Future: Admin dashboard will allow drag/drop reordering of `display_order` values, which backend will use as the primary sort order.

---

#### **Featured Mission Data:**

This section reuses the exact same logic as `GET /api/dashboard/featured-mission` endpoint (see above for full details on mission priority, status computation, and congrats modal detection).

---

### Performance Optimization

**Query Strategy:**
- All queries run in parallel using `Promise.all()`
- No sequential blocking
- Expected total response time: ~150-200ms

```typescript
const [
  userData,
  nextTierData,
  tierProgressData,
  featuredMissionData,
  rewardsData
] = await Promise.all([
  getUserWithTierInfo(userId),
  getNextTier(clientId, currentTierOrder),
  getTierProgress(userId, tierAchievedAt, nextCheckpointAt),
  getFeaturedMission(userId),  // Reuse existing function
  getCurrentTierRewards(currentTierId)
])
```

---

### Frontend Code Cleanup

**After backend implements display logic, remove the following from `/app/home/page.tsx`:**

#### **Lines 486-500 - DELETE Priority Sorting Object:**
```typescript
// ❌ DELETE THIS - Backend handles sorting now
const benefitPriority = {
  experience: 1,
  physical_gift: 2,
  gift_card: 3,
  commission_boost: 4,
  spark_ads: 5,
  discount: 6,
}

const sortedBenefits = [...currentTierBenefits].sort((a, b) => {
  const aPriority = benefitPriority[a.type as keyof typeof benefitPriority] || 999
  const bPriority = benefitPriority[b.type as keyof typeof benefitPriority] || 999
  return aPriority - bPriority
})
```

#### **Lines 502-504 - DELETE Limit Logic:**
```typescript
// ❌ DELETE THIS - Backend sends exactly 4 rewards
const topBenefits = sortedBenefits.slice(0, 4)
const hasMoreBenefits = sortedBenefits.length > 4
```

#### **REPLACE WITH - Simplified Logic:**
```typescript
// ✅ NEW: Just use backend data directly
const displayedBenefits = currentTierBenefits  // Already sorted and limited!
const hasMoreBenefits = totalRewardsCount > 4  // Use backend count
```

#### **Lines 796-802 - UPDATE Rendering:**
```typescript
// BEFORE:
{topBenefits.map((benefit, index) => (

// AFTER (change variable name):
{displayedBenefits.map((benefit, index) => (
```

**Lines Removed:** ~18 lines of sorting/limiting logic
**Result:** Cleaner code, backend handles business logic

**KEEP These (UI concerns):**
- ✅ `getIconForBenefitType()` - Icon mapping (lines 465-484)
- ✅ `formatBenefitText()` - Text formatting with + signs (lines 507-530)
- ✅ Rendering logic (lines 789-812)

---

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "User not found or not associated with a client"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch dashboard data"
}
```

---

### Frontend Usage Notes

**Page:** `/app/home/page.tsx`

**Data Sections Mapping:**

1. **Header:** Uses `user.handle` → "Hi, @creatorpro"
2. **Circular Progress Section:** Uses `featuredMission.*`
3. **Current Rewards Card:** Uses `currentTierRewards` (top 4 items)
4. **Unlock Next Tier Card:** Uses `tierProgress.*` + `nextTier.*` + `currentTier.*`

**Formatting Functions Needed:**
- `formatCurrency(num)` - For sales numbers
- `formatRewardText(type, name, valueData)` - For reward display
- Date formatting for checkpoint expiration

**Important:** This single endpoint eliminates the need for multiple separate API calls and reduces network overhead.

---

# Missions

**Page:** `/app/missions/page.tsx`

## GET /api/missions

**Purpose:** Returns all missions for the Missions page with pre-computed status, progress tracking, and formatted display text.

### Request

```http
GET /api/missions
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface MissionsPageResponse {
  // User & Tier Info (for header badge)
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    currentTier: string                 // From users.current_tier (tier_3)
    currentTierName: string             // From tiers.tier_name ("Gold")
    currentTierColor: string            // From tiers.tier_color (hex, e.g., "#F59E0B")
  }

  // Featured mission ID (for home page sync)
  featuredMissionId: string             // ID of highest priority mission (always first in missions array)

  // Missions list (sorted by actionable priority - see Sorting Logic below)
  missions: Array<{
    // Core mission data
    id: string                          // UUID from missions.id
    progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
    missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string                 // Backend-generated from missions.display_name
    targetUnit: 'dollars' | 'units' | 'count'  // From missions.target_unit
    tierEligibility: string             // From missions.tier_eligibility

    // Reward information
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardDescription: string           // Backend-generated (see Formatting Rules)
    rewardSource: 'vip_tier' | 'mission' // From rewards.reward_source (always 'mission' for missions endpoint)

    // PRE-COMPUTED status (backend derives from multiple tables)
    status: 'in_progress' | 'default_claim' | 'default_schedule' |
            'scheduled' | 'active' | 'redeeming' | 'redeeming_physical' | 'sending' |
            'pending_info' | 'clearing' |
            'dormant' | 'raffle_available' | 'raffle_processing' | 'raffle_claim' | 'raffle_won' |
            'locked'

    // Progress tracking (null for raffles and locked missions)
    progress: {
      currentValue: number              // Raw value from mission_progress.current_value
      currentFormatted: string          // Backend-formatted ("$350" or "35 units")
      targetValue: number               // Raw value from missions.target_value
      targetFormatted: string           // Backend-formatted ("$500" or "50 units")
      percentage: number                // Backend-calculated (currentValue / targetValue * 100)
      remainingText: string             // Backend-formatted ("$150 more to go!" or "15 more units to go!")
      progressText: string              // Backend-formatted combined text ("$350 of $500")
    } | null

    // Deadline information
    deadline: {
      checkpointEnd: string             // ISO 8601 from mission_progress.checkpoint_end
      checkpointEndFormatted: string    // Backend-formatted "March 15, 2025"
      daysRemaining: number             // Backend-calculated
    } | null

    // Reward value data (for modals/forms)
    valueData: {
      percent?: number                  // For commission_boost/discount
      durationDays?: number             // For commission_boost/discount
      amount?: number                   // For gift_card/spark_ads
      displayText?: string              // For physical_gift/experience
      requiresSize?: boolean            // For physical_gift
      sizeCategory?: string             // For physical_gift
      sizeOptions?: string[]            // For physical_gift
    } | null

    // Scheduling data (for Scheduled/Active states)
    scheduling: {
      scheduledActivationDate: string   // Date only (YYYY-MM-DD)
      scheduledActivationTime: string   // Time only (HH:MM:SS) in EST
      scheduledActivationFormatted: string  // Backend-formatted "Feb 15, 2025 2:00 PM EST"
      activationDate: string | null     // ISO 8601, set when activated
      activationDateFormatted: string | null  // Backend-formatted "Started: Feb 15, 2:00 PM"
      expirationDate: string | null     // ISO 8601
      expirationDateFormatted: string | null  // Backend-formatted "Expires: Mar 17, 2:00 PM"
      durationText: string              // Backend-formatted "Active for 30 days"
    } | null

    // Raffle-specific data (null for non-raffles)
    raffleData: {
      raffleEndDate: string             // ISO 8601 from missions.raffle_end_date
      raffleEndFormatted: string        // Backend-formatted "Feb 20, 2025"
      daysUntilDraw: number             // Backend-calculated
      isWinner: boolean | null          // From raffle_participations.is_winner
      prizeName: string                 // Backend-generated with article ("an iPhone 16 Pro")
    } | null

    // Locked state data (null if not locked)
    lockedData: {
      requiredTier: string              // e.g., "tier_4"
      requiredTierName: string          // Backend-formatted "Platinum"
      requiredTierColor: string         // Hex color "#818CF8"
      unlockMessage: string             // Backend-formatted "Unlock at Platinum"
      previewFromTier: string | null    // From missions.preview_from_tier
    } | null

    // Flippable card content (null if not flippable state)
    flippableCard: {
      backContentType: 'dates' | 'message'
      message: string | null
      dates: Array<{
        label: string
        value: string
      }> | null
    } | null
  }>
}
```

### Backend Formatting Rules

**Mission Display Names:**

| mission_type | displayName |
|--------------|-------------|
| sales_dollars | "Sales Sprint" |
| sales_units | "Sales Sprint" |
| videos | "Lights, Camera, Go!" |
| likes | "Fan Favorite" |
| views | "Road to Viral" |
| raffle | "VIP Raffle" |

**Reward Descriptions (VIP Metric Mode-Aware):**

| reward_type | Description Format | Example |
|-------------|-------------------|---------|
| gift_card | `"Win a $${amount} Gift Card!"` | "Win a $50 Gift Card!" |
| commission_boost | `"Win +${percent}% commission for ${durationDays} days!"` | "Win +5% commission for 30 days!" |
| spark_ads | `"Win a $${amount} Ads Boost!"` | "Win a $100 Ads Boost!" |
| discount | `"Win a Follower Discount of ${percent}% for ${durationDays} days!"` | "Win a Follower Discount of 10% for 1 days!" |
| physical_gift | `"Win ${addArticle(displayText)}!"` | "Win an iPhone 16 Pro!" |
| experience | `"Win ${addArticle(displayText)}!"` | "Win a Mystery Trip!" |

**Progress Text by VIP Metric Mode:**

| Mode | Mission Type | Current Format | Target Format | Remaining Format |
|------|-------------|----------------|---------------|------------------|
| Sales | sales_dollars | "$350" | "$500" | "$150 more to go!" |
| Units | sales_units | "35 units" | "50 units" | "15 more units to go!" |
| Both | videos | "8 videos" | "15 videos" | "7 more videos to post!" |
| Both | likes | "800 likes" | "1,000 likes" | "200 more likes to go!" |
| Both | views | "25,000 views" | "50,000 views" | "25,000 more views to go!" |

### Example Response

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "creatorpro",
    "currentTier": "tier_3",
    "currentTierName": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "featuredMissionId": "mission-sales-500",
  "missions": [
    {
      "id": "mission-sales-500",
      "missionType": "sales_dollars",
      "displayName": "Sales Sprint",
      "targetUnit": "dollars",
      "tierEligibility": "tier_3",
      "rewardType": "gift_card",
      "rewardDescription": "Win a $50 Gift Card!",
      "rewardSource": "mission",
      "status": "in_progress",
      "progress": {
        "currentValue": 350,
        "currentFormatted": "$350",
        "targetValue": 500,
        "targetFormatted": "$500",
        "percentage": 70,
        "remainingText": "$150 more to go!",
        "progressText": "$350 of $500"
      },
      "deadline": {
        "checkpointEnd": "2025-03-15T23:59:59Z",
        "checkpointEndFormatted": "March 15, 2025",
        "daysRemaining": 23
      },
      "valueData": {"amount": 50},
      "scheduling": null,
      "raffleData": null,
      "lockedData": null,
      "flippableCard": null
    },
    {
      "id": "mission-boost-30d",
      "missionType": "videos",
      "displayName": "Lights, Camera, Go!",
      "targetUnit": "count",
      "tierEligibility": "tier_3",
      "rewardType": "commission_boost",
      "rewardDescription": "Win +5% commission for 30 days!",
      "rewardSource": "mission",
      "status": "scheduled",
      "progress": null,
      "deadline": null,
      "valueData": {"percent": 5, "durationDays": 30},
      "scheduling": {
        "scheduledActivationDate": "2025-02-15",
        "scheduledActivationTime": "19:00:00",
        "scheduledActivationFormatted": "Feb 15, 2025 2:00 PM EST",
        "activationDate": null,
        "activationDateFormatted": null,
        "expirationDate": null,
        "expirationDateFormatted": null,
        "durationText": "Active for 30 days"
      },
      "raffleData": null,
      "lockedData": null,
      "flippableCard": {
        "backContentType": "dates",
        "message": null,
        "dates": [
          {"label": "Scheduled", "value": "Feb 15, 2025 2:00 PM EST"},
          {"label": "Duration", "value": "Active for 30 days"}
        ]
      }
    },
    {
      "id": "mission-raffle-iphone",
      "missionType": "raffle",
      "displayName": "VIP Raffle",
      "targetUnit": "count",
      "tierEligibility": "tier_3",
      "rewardType": "physical_gift",
      "rewardDescription": "Win an iPhone 16 Pro!",
      "rewardSource": "mission",
      "status": "raffle_available",
      "progress": null,
      "deadline": null,
      "valueData": {
        "displayText": "iPhone 16 Pro",
        "requiresSize": false
      },
      "scheduling": null,
      "raffleData": {
        "raffleEndDate": "2025-02-20T23:59:59Z",
        "raffleEndFormatted": "Feb 20, 2025",
        "daysUntilDraw": 15,
        "isWinner": null,
        "prizeName": "an iPhone 16 Pro"
      },
      "lockedData": null,
      "flippableCard": null
    },
    {
      "id": "mission-platinum-exclusive",
      "missionType": "sales_dollars",
      "displayName": "Sales Sprint",
      "targetUnit": "dollars",
      "tierEligibility": "tier_4",
      "rewardType": "gift_card",
      "rewardDescription": "Win a $200 Gift Card!",
      "rewardSource": "mission",
      "status": "locked",
      "progress": null,
      "deadline": null,
      "valueData": {"amount": 200},
      "scheduling": null,
      "raffleData": null,
      "lockedData": {
        "requiredTier": "tier_4",
        "requiredTierName": "Platinum",
        "requiredTierColor": "#818CF8",
        "unlockMessage": "Unlock at Platinum",
        "previewFromTier": "tier_3"
      },
      "flippableCard": null
    }
  ]
}
```

### Business Logic

#### **Sorting Logic (Backend Sort Order)**

**Missions array is sorted to prioritize actionable items first, then status updates, then informational items:**

**Priority 1 - Featured Mission (Home Page Sync):**
- The mission matching `featuredMissionId` MUST appear first in the array
- This ensures missions page and home page show the same mission at the top
- Featured mission selection follows home page priority (see `GET /api/dashboard/featured-mission`)

**Priority 2 - Actionable Raffle States (Urgent Action Required):**
- `status='raffle_available'` - Raffle accepting entries (user can participate NOW)
  - Database condition: `mission.mission_type='raffle'` AND `mission.activated=true` AND `raffle_participation IS NULL`
- `status='raffle_claim'` - User won raffle, needs to claim prize
  - Database condition: `raffle_participation.is_winner=true` AND `redemptions.status='claimable'`

**Priority 3 - Claimable Rewards (Action Required):**
- `status='default_claim'` - Instant rewards ready to claim
  - Database condition: `redemptions.status='claimable'` AND `reward.redemption_type='instant'`
- `status='default_schedule'` - Scheduled rewards ready to claim
  - Database condition: `redemptions.status='claimable'` AND `reward.redemption_type='scheduled'`

**Priority 4 - Pending Payment Info (Action Required):**
- `status='pending_info'` - Commission boost waiting for payment method
  - Database condition: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='pending_info'`

**Priority 5 - Clearing (Money Processing):**
- `status='clearing'` - Commission boost in payout clearing period
  - Database condition: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='pending_payout'`

**Priority 6 - Sending (Physical Gifts Shipped):**
- `status='sending'` - Physical gift shipped, tracking available
  - Database condition: `redemptions.status='claimed'` AND `physical_gift_redemptions.shipped_at IS NOT NULL`

**Priority 7 - Active (Currently Running):**
- `status='active'` - Commission boost or discount currently active
  - Commission boost: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='active'`
  - Discount: `redemptions.status='fulfilled'` AND `redemptions.fulfilled_at IS NOT NULL`

**Priority 8 - Scheduled (Future Activation):**
- `status='scheduled'` - Commission boost or discount scheduled for future
  - Commission boost: `redemptions.status='claimed'` AND `commission_boost_redemption.scheduled_activation_date IS NOT NULL`
  - Discount: `redemptions.status='claimed'` AND `redemptions.scheduled_activation_date IS NOT NULL`

**Priority 9 - Redeeming (Processing):**
- `status='redeeming'` - Instant rewards being processed (gift cards, spark ads, experiences)
  - Database condition: `redemptions.status='claimed'` AND `reward.type IN ('gift_card', 'spark_ads', 'experience')`
- `status='redeeming_physical'` - Physical gift claimed, address provided, not yet shipped
  - Database condition: `redemptions.status='claimed'` AND `physical_gift_redemptions.shipping_city IS NOT NULL` AND `shipped_at IS NULL`

**Priority 10 - In Progress (Making Progress):**
- `status='in_progress'` - User actively working toward goal
  - Database condition: `mission_progress.status='active'` AND `current_value < target_value`

**Priority 11 - Informational Raffle States (No Action Required):**
- `status='raffle_won'` - User claimed raffle prize (informational - shows in history)
  - Database condition: `raffle_participation.is_winner=true` AND `redemptions.status='claimed'`
  - **Note:** If raffle prize is `commission_boost` or `discount`, status reflects sub-state (`scheduled`, `active`, `pending_info`, `clearing`, `redeeming`) instead of `raffle_won`
- `status='raffle_processing'` - User entered raffle, waiting for draw (informational)
  - Database condition: `raffle_participation EXISTS` AND `raffle_participation.is_winner IS NULL`
- `status='dormant'` - Raffle not yet activated (informational - coming soon)
  - Database condition: `mission.mission_type='raffle'` AND `mission.activated=false`

**Priority 12 - Locked (Tier-Gated Preview):**
- `status='locked'` - Mission from higher tier shown as preview
  - Database condition: `mission.tier_eligibility != user.current_tier` AND `mission.preview_from_tier IS NOT NULL`

**Secondary Sort (within same status priority):**
- Mission type priority: raffle → sales (based on VIP metric) → videos → likes → views

**Guarantee:** The first mission in the sorted array will ALWAYS be the `featuredMissionId` mission.

---

#### **Flippable Card Population Logic**

**Flippable cards are ONLY populated for specific statuses. Most statuses have `flippableCard: null`.**

**Card 1 - Redeeming (Instant Rewards):**
- **Conditions:**
  - `status='redeeming'`
  - `reward.type IN ('gift_card', 'spark_ads', 'experience')`
  - `redemptions.status='claimed'`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'message',
  message: "We will deliver your reward in up to 72 hours",
  dates: null
}
```

**Card 2 - Sending (Physical Gifts Shipped):**
- **Conditions:**
  - `status='sending'`
  - `reward.type='physical_gift'`
  - `physical_gift_redemptions.shipped_at IS NOT NULL`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'message',
  message: "Your gift is on its way 🚚",
  dates: null
}
```

**Card 3 - Scheduled (Commission Boost):**
- **Conditions:**
  - `status='scheduled'`
  - `reward.type='commission_boost'`
  - `redemptions.status='claimed'`
  - `commission_boost_redemption.scheduled_activation_date IS NOT NULL`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'dates',
  message: null,
  dates: [
    {
      label: "Scheduled",
      value: scheduledActivationFormatted  // "Jan 25, 2025 at 2:00 PM"
    },
    {
      label: "Duration",
      value: durationText  // "Will be active for 30 days"
    }
  ]
}
```

**Card 4 - Active (Commission Boost):**
- **Conditions:**
  - `status='active'`
  - `reward.type='commission_boost'`
  - `redemptions.status='claimed'`
  - `commission_boost_redemption.boost_status='active'`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'dates',
  message: null,
  dates: [
    {
      label: "Started",
      value: activationDateFormatted  // "Jan 15, 2025"
    },
    {
      label: "Expires",
      value: expirationDateFormatted  // "Feb 14, 2025"
    }
  ]
}
```

**Card 5 - Pending Payment (Commission Boost):**
- **Conditions:**
  - `status='pending_info'`
  - `reward.type='commission_boost'`
  - `redemptions.status='claimed'`
  - `commission_boost_redemption.boost_status='pending_info'`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'message',
  message: "Setup your payout info 💵",
  dates: null
}
```

**Card 6 - Clearing (Commission Boost):**
- **Conditions:**
  - `status='clearing'`
  - `reward.type='commission_boost'`
  - `redemptions.status='claimed'`
  - `commission_boost_redemption.boost_status='pending_payout'`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'message',
  message: "Sales clear after 20 days to allow for returns. We'll notify you as soon as your reward is ready.",
  dates: null
}
```

**Card 7 - Scheduled (Discount):**
- **Conditions:**
  - `status='scheduled'`
  - `reward.type='discount'`
  - `redemptions.status='claimed'`
  - `redemptions.scheduled_activation_date IS NOT NULL`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'dates',
  message: null,
  dates: [
    {
      label: "Scheduled",
      value: scheduledActivationFormatted  // "Jan 25, 2025 at 2:00 PM"
    },
    {
      label: "Duration",
      value: durationText  // "Will be active for 30 days"
    }
  ]
}
```

**Card 8 - Active (Discount):**
- **Conditions:**
  - `status='active'`
  - `reward.type='discount'`
  - `redemptions.status='fulfilled'`
  - `redemptions.fulfilled_at IS NOT NULL`
- **Content:**
```typescript
flippableCard: {
  backContentType: 'dates',
  message: null,
  dates: [
    {
      label: "Started",
      value: activationDateFormatted  // "Jan 15, 2025"
    },
    {
      label: "Expires",
      value: expirationDateFormatted  // "Feb 14, 2025"
    }
  ]
}
```

**All Other Statuses:**
- `flippableCard: null` for:
  - `in_progress`, `default_claim`, `default_schedule`
  - `redeeming_physical` (address provided but not shipped)
  - All raffle states
  - `locked`

---

#### **Status Computation (Backend Derives from Multiple Tables)**

**Priority Rank 1 - Completed Missions (Show First):**

```typescript
// Mission completed, reward ready to claim (redemption auto-created with status='claimable')
if (redemption?.status === 'claimable') {
  if (reward.redemption_type === 'scheduled') {
    status = 'default_schedule';  // Commission boost or discount
  } else {
    status = 'default_claim';  // Gift card, spark_ads, experience, physical_gift
  }
}

// Mission reward claimed (user clicked "Claim" button)
if (redemption?.status === 'claimed') {
  // Check reward type for specific states
  if (reward.type === 'commission_boost') {
    switch (boost_redemption.boost_status) {
      case 'scheduled': status = 'scheduled'; break;
      case 'active': status = 'active'; break;
      case 'pending_info': status = 'pending_info'; break;
      case 'pending_payout': status = 'clearing'; break;
    }
  } else if (reward.type === 'discount') {
    if (redemption.activation_date === null) status = 'scheduled';
    else if (NOW() <= redemption.expiration_date) status = 'active';
  } else if (reward.type === 'physical_gift') {
    if (physical_gift_redemption.shipped_at !== null) status = 'sending';
    else if (physical_gift_redemption.shipping_city !== null) status = 'redeeming_physical';
  } else if (reward.type IN ('gift_card', 'spark_ads', 'experience')) {
    status = 'redeeming';
  }
}
```

**Priority Rank 2 - Active Missions (In Progress):**

```typescript
// User making progress toward goal
if (mission_progress.status === 'active' &&
    mission_progress.current_value < mission.target_value) {
  status = 'in_progress';
}
```

**Priority Rank 3 - Raffle States:**

```typescript
// Raffle dormant (not accepting entries)
if (mission.mission_type === 'raffle' &&
    mission.activated === false) {
  status = 'dormant';
}

// Raffle available (can participate)
if (mission.mission_type === 'raffle' &&
    mission.activated === true &&
    !raffle_participation) {
  status = 'raffle_available';
}

// Raffle processing (waiting for draw)
if (raffle_participation?.is_winner === null) {
  status = 'raffle_processing';
}

// Raffle claim (user won, needs to claim)
if (raffle_participation?.is_winner === true &&
    redemption.status === 'claimable') {
  status = 'raffle_claim';
}

// Raffle won (user claimed prize)
if (raffle_participation?.is_winner === true &&
    redemption.status === 'claimed') {
  status = 'raffle_won';
}
```

**Priority Rank 4 - Locked Missions:**

```typescript
// Preview from higher tier
if (mission.tier_eligibility !== user.current_tier &&
    mission.preview_from_tier !== null &&
    user.current_tier >= mission.preview_from_tier) {
  status = 'locked';
}
```

#### **Text Generation**

**Reward Description with Article Grammar:**

```typescript
function addArticle(text: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstLetter = text.charAt(0).toLowerCase();

  // Special cases
  if (text.toLowerCase().startsWith('hour')) return `an ${text}`;
  if (text.toLowerCase().startsWith('uni')) return `a ${text}`;

  // General rule
  return vowels.includes(firstLetter) ? `an ${text}` : `a ${text}`;
}

function generateRewardDescription(reward) {
  switch (reward.type) {
    case 'gift_card':
      return `Win a $${reward.value_data.amount} Gift Card!`;
    case 'commission_boost':
      return `Win +${reward.value_data.percent}% commission for ${reward.value_data.duration_days} days!`;
    case 'spark_ads':
      return `Win a $${reward.value_data.amount} Ads Boost!`;
    case 'discount':
      const days = Math.floor(reward.value_data.duration_minutes / 1440);
      return `Win a Follower Discount of ${reward.value_data.percent}% for ${days} days!`;
    case 'physical_gift':
    case 'experience':
      const text = reward.value_data.display_text || reward.description;
      return `Win ${addArticle(text)}!`;
  }
}
```

**Progress Text with VIP Metric Mode:**

```typescript
function generateProgressText(currentValue, targetValue, missionType, vipMetric) {
  // Sales mode (dollars)
  if (missionType === 'sales_dollars' && vipMetric === 'sales') {
    return {
      currentFormatted: `$${currentValue.toLocaleString()}`,
      targetFormatted: `$${targetValue.toLocaleString()}`,
      progressText: `$${currentValue.toLocaleString()} of $${targetValue.toLocaleString()}`,
      remainingText: `$${(targetValue - currentValue).toLocaleString()} more to go!`
    };
  }

  // Units mode (quantity)
  if (missionType === 'sales_units' && vipMetric === 'units') {
    const remaining = targetValue - currentValue;
    const unitWord = remaining === 1 ? 'unit' : 'units';
    return {
      currentFormatted: `${currentValue.toLocaleString()} units`,
      targetFormatted: `${targetValue.toLocaleString()} units`,
      progressText: `${currentValue.toLocaleString()} of ${targetValue.toLocaleString()} units`,
      remainingText: `${remaining.toLocaleString()} more ${unitWord} to go!`
    };
  }

  // Videos
  if (missionType === 'videos') {
    const remaining = targetValue - currentValue;
    const videoWord = remaining === 1 ? 'video' : 'videos';
    return {
      currentFormatted: `${currentValue} videos`,
      targetFormatted: `${targetValue} videos`,
      progressText: `${currentValue} of ${targetValue} videos`,
      remainingText: `${remaining} more ${videoWord} to post!`
    };
  }

  // Likes/Views (with thousands separators)
  const metricName = missionType; // 'likes' or 'views'
  return {
    currentFormatted: `${currentValue.toLocaleString()} ${metricName}`,
    targetFormatted: `${targetValue.toLocaleString()} ${metricName}`,
    progressText: `${currentValue.toLocaleString()} of ${targetValue.toLocaleString()} ${metricName}`,
    remainingText: `${(targetValue - currentValue).toLocaleString()} more ${metricName} to go!`
  };
}
```

---

## GET /api/dashboard/featured-mission

**Purpose:** Returns the highest-priority mission for home page circular progress display.

### Request

```http
GET /api/dashboard/featured-mission
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface FeaturedMissionResponse {
  user: {
    id: string
    currentTier: string
    currentTierName: string
    currentTierColor: string
  }

  // Featured mission (same structure as missions array above)
  mission: {
    // ... (all fields from GET /api/missions mission object)
  } | null

  // Empty state (if no missions available)
  emptyStateMessage: string | null  // "No active missions. Check back soon!"
}
```

### Business Logic

**Selection Priority Order:**

1. **Raffle** - ONLY if `activated=true` AND user hasn't participated
2. **Sales Dollars** (if `clients.vip_metric='sales'`)
3. **Sales Units** (if `clients.vip_metric='units'`)
4. **Videos**
5. **Likes**
6. **Views**

**Filtering Criteria:**
- ✅ `mission.tier_eligibility = user.current_tier`
- ✅ `mission.enabled = true`
- ✅ `mission_progress.status IN ('active', 'completed')`
- ✅ For raffles: `activated=true` AND no existing `raffle_participation`

**Raffle Display Behavior:**
- `progressPercentage`: 100 (user is eligible to enter, no progress needed)
- `currentFormatted`: Prize name (e.g., "iPhone 15 Pro")
- `targetText`: "Enter to Win!"
- `status`: "raffle_available"

---

## POST /api/missions/:id/claim

**Purpose:** Creator claims a completed mission reward.

### Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

> **Parameter Clarification:** The `:id` parameter in this endpoint is `mission_progress.id` (aliased as `progressId` in the missions API response), NOT `missions.id`. Despite the folder name `[missionId]`, callers must pass `progressId` from the missions API response.

### Request Body Schema

```typescript
// Instant rewards (gift_card, spark_ads, experience)
{}

// Scheduled rewards (commission_boost, discount)
{
  "scheduledActivationDate": "2025-02-15",  // Date (YYYY-MM-DD)
  "scheduledActivationTime": "19:00:00"     // Time (HH:MM:SS) in UTC (2 PM EST)
}

// Physical gifts (no size required)
{
  "shippingAddress": {
    "firstName": string,    // Recipient first name (required for carrier)
    "lastName": string,     // Recipient last name (required for carrier)
    "line1": string,
    "line2": string,
    "city": string,
    "state": string,
    "postalCode": string,
    "country": string,
    "phone": string
  }
}

// Physical gifts (size required)
{
  "size": string,  // From reward.valueData.sizeOptions
  "shippingAddress": { /* same as above */ }
}
```

### Response Schema

```typescript
{
  "success": boolean,
  "message": string,  // "Reward claimed successfully!"
  "redemptionId": string,
  "nextAction": {
    "type": "show_confirmation" | "navigate_to_missions",
    "status": string,  // New status after claim
    "message": string  // Next steps for user
  }
}
```

### Backend Validation

1. ✅ Verify `mission_progress.status='completed'`
2. ✅ Check `redemptions.status='claimable'` (not already claimed)
3. ✅ Verify `mission.tier_eligibility = user.current_tier`
4. ✅ Validate request body based on reward type
5. ✅ Update `redemptions.status` from 'claimable' → 'claimed'
6. ✅ Create sub-state records if needed
7. ✅ Log audit trail

---

## POST /api/missions/:id/participate

**Purpose:** Creator participates in a raffle mission.

### Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/participate
Authorization: Bearer <supabase-jwt-token>
```

### Request Body

```typescript
{}  // Empty body
```

### Response Schema

```typescript
{
  "success": boolean,
  "message": string,  // "You're entered in the raffle!"
  "raffleData": {
    "drawDate": string,  // ISO 8601
    "drawDateFormatted": string,  // "Feb 20, 2025"
    "daysUntilDraw": number,
    "prizeName": string  // "an iPhone 16 Pro"
  }
}
```

### Backend Processing

1. ✅ Verify `mission.mission_type='raffle'`
2. ✅ Check `mission.activated=true`
3. ✅ Verify user hasn't already participated
4. ✅ Verify tier eligibility
5. ✅ Update `mission_progress.status` from 'active' → 'completed'
6. ✅ Create `redemptions` row (`status='claimable'`)
7. ✅ Create `raffle_participations` row (`is_winner=NULL`)
8. ✅ Log audit trail

---

# Mission History

**Page:** `/app/missions/missionhistory/page.tsx`

## GET /api/missions/history

**Purpose:** Returns concluded missions for mission history page (completed rewards + lost raffles).

### Request

```http
GET /api/missions/history
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface MissionHistoryResponse {
  user: {
    id: string
    currentTier: string
    currentTierName: string
    currentTierColor: string
  }

  history: Array<{
    // Mission identity
    id: string
    missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string             // "Sales Sprint", "VIP Raffle", etc.

    // Status (only concluded or rejected)
    status: 'concluded' | 'rejected_raffle'

    // Reward information (focus on what was earned/lost)
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardName: string              // Backend-formatted "$50 Gift Card"
    rewardSubtitle: string          // Backend-formatted "From: Sales Sprint mission"
    rewardSource: 'vip_tier' | 'mission' // From rewards.reward_source (always 'mission' for missions)

    // Completion timeline
    completedAt: string             // ISO 8601
    completedAtFormatted: string    // "Jan 10, 2025"
    claimedAt: string | null        // ISO 8601
    claimedAtFormatted: string | null  // "Jan 10, 2025"
    deliveredAt: string | null      // ISO 8601
    deliveredAtFormatted: string | null  // "Jan 12, 2025"

    // Raffle-specific (null for non-raffles)
    raffleData: {
      isWinner: boolean             // true | false
      drawDate: string              // ISO 8601
      drawDateFormatted: string     // "Jan 20, 2025"
      prizeName: string             // "an iPhone 16 Pro"
    } | null
  }>
}
```

### Backend Formatting Rules

**Reward Names (Focused on Reward, Not Mission):**

| reward_type | Name Format | Example |
|-------------|-------------|---------|
| gift_card | `"$${amount} Gift Card"` | "$50 Gift Card" |
| commission_boost | `"${percent}% Pay Boost"` | "5% Pay Boost" |
| spark_ads | `"$${amount} Ads Boost"` | "$100 Ads Boost" |
| discount | `"${percent}% Deal Boost"` | "15% Deal Boost" |
| physical_gift | `reward.value_data.display_text \|\| reward.description` | "Premium Headphones" |
| experience | `reward.value_data.display_text \|\| reward.description` | "Mystery Trip" |

**Subtitle Format:**
```typescript
rewardSubtitle = `From: ${mission.displayName} mission`
```

Examples:
- "From: Sales Sprint mission"
- "From: VIP Raffle mission"
- "From: Lights, Camera, Go! mission"

### Example Response

```json
{
  "user": {
    "id": "user-abc-123",
    "currentTier": "tier_3",
    "currentTierName": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "history": [
    {
      "id": "mission-sales-500",
      "missionType": "sales_dollars",
      "displayName": "Sales Sprint",
      "status": "concluded",
      "rewardType": "gift_card",
      "rewardName": "$50 Gift Card",
      "rewardSubtitle": "From: Sales Sprint mission",
      "rewardSource": "mission",
      "completedAt": "2025-01-10T14:30:00Z",
      "completedAtFormatted": "Jan 10, 2025",
      "claimedAt": "2025-01-10T14:35:00Z",
      "claimedAtFormatted": "Jan 10, 2025",
      "deliveredAt": "2025-01-12T10:00:00Z",
      "deliveredAtFormatted": "Jan 12, 2025",
      "raffleData": null
    },
    {
      "id": "mission-raffle-iphone",
      "missionType": "raffle",
      "displayName": "VIP Raffle",
      "status": "rejected_raffle",
      "rewardType": "physical_gift",
      "rewardName": "iPhone 16 Pro",
      "rewardSubtitle": "From: VIP Raffle mission",
      "rewardSource": "mission",
      "completedAt": "2025-01-15T12:00:00Z",
      "completedAtFormatted": "Jan 15, 2025",
      "claimedAt": null,
      "claimedAtFormatted": null,
      "deliveredAt": null,
      "deliveredAtFormatted": null,
      "raffleData": {
        "isWinner": false,
        "drawDate": "2025-01-20T23:59:59Z",
        "drawDateFormatted": "Jan 20, 2025",
        "prizeName": "an iPhone 16 Pro"
      }
    },
    {
      "id": "mission-boost-30d",
      "missionType": "videos",
      "displayName": "Lights, Camera, Go!",
      "status": "concluded",
      "rewardType": "commission_boost",
      "rewardName": "5% Pay Boost",
      "rewardSubtitle": "From: Lights, Camera, Go! mission",
      "rewardSource": "mission",
      "completedAt": "2024-12-15T09:00:00Z",
      "completedAtFormatted": "Dec 15, 2024",
      "claimedAt": "2024-12-15T09:05:00Z",
      "claimedAtFormatted": "Dec 15, 2024",
      "deliveredAt": "2025-01-20T15:00:00Z",
      "deliveredAtFormatted": "Jan 20, 2025",
      "raffleData": null
    }
  ]
}
```

### Business Logic

**Query Filtering:**

```sql
SELECT
  m.*,
  mp.completed_at,
  r.type as reward_type,
  r.value_data,
  r.description as reward_description,
  red.status as redemption_status,
  red.claimed_at,
  red.fulfilled_at,
  red.concluded_at,
  rp.is_winner,
  rp.winner_selected_at
FROM missions m
INNER JOIN mission_progress mp ON (
  mp.mission_id = m.id
  AND mp.user_id = $userId
)
INNER JOIN rewards r ON r.id = m.reward_id
INNER JOIN redemptions red ON (
  red.mission_progress_id = mp.id
  AND red.user_id = $userId
  AND red.status IN ('concluded', 'rejected')  -- Only completed missions
)
LEFT JOIN raffle_participations rp ON (
  rp.mission_id = m.id
  AND rp.user_id = $userId
)
WHERE m.client_id = $clientId
  AND mp.status != 'cancelled'  -- Exclude cancelled missions
ORDER BY
  COALESCE(red.concluded_at, red.rejected_at) DESC
```

**Status Determination:**

```typescript
function determineHistoryStatus(redemption, raffle_participation) {
  if (redemption.status === 'concluded') {
    return 'concluded';
  }

  if (redemption.status === 'rejected' &&
      raffle_participation?.is_winner === false) {
    return 'rejected_raffle';
  }

  // Should never reach here if query filters correctly
  return null;
}
```

**Date Fields:**

```typescript
// For concluded missions
{
  completedAt: mission_progress.completed_at,
  claimedAt: redemptions.claimed_at,
  deliveredAt: redemptions.concluded_at  // When reward fully delivered
}

// For rejected raffles
{
  completedAt: raffle_participations.participated_at,
  claimedAt: null,  // Never claimed (lost raffle)
  deliveredAt: null
}
```

---
# Rewards

**Page:** `/app/rewards/page.tsx`

## GET /api/rewards

**Purpose:** Returns all VIP tier rewards for the Rewards page with pre-computed status, availability, and formatted display text.

### Request

```http
GET /api/rewards
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface RewardsPageResponse {
  // User & Tier Info (for header badge)
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    currentTier: string                 // From users.current_tier (tier_3)
    currentTierName: string             // From tiers.tier_name ("Gold")
    currentTierColor: string            // From tiers.tier_color (hex, e.g., "#F59E0B")
  }

  // Redemption history count (for "View Redemption History" link)
  redemptionCount: number               // COUNT of status='concluded' redemptions

  // Rewards list (sorted by actionable priority - see Sorting Logic below)
  rewards: Array<{
    // Core reward data
    id: string                          // UUID from rewards.id
    type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    name: string                        // Backend-generated (see Formatting Rules below)
    description: string                 // From rewards.description (12 char max for physical_gift/experience)

    // PRE-FORMATTED display text (backend handles all formatting)
    displayText: string                 // Backend-generated (see Formatting Rules below)

    // Structured data (camelCase transformed from value_data JSONB)
    valueData: {
      amount?: number                   // For gift_card, spark_ads
      percent?: number                  // For commission_boost, discount
      durationDays?: number             // For commission_boost, discount (backend converts duration_minutes / 1440 for discounts)
      couponCode?: string               // For discount (2-8 char code)
      maxUses?: number                  // For discount (optional usage limit)
      requiresSize?: boolean            // For physical_gift
      sizeCategory?: string             // For physical_gift
      sizeOptions?: string[]            // For physical_gift
      displayText?: string              // For physical_gift, experience (client-provided, max 27 chars)
    } | null

    // COMPUTED status (backend derives from multiple tables)
    status: 'clearing' | 'sending' | 'active' | 'pending_info' | 'scheduled' |
            'redeeming_physical' | 'redeeming' | 'claimable' |
            'limit_reached' | 'locked'

    // COMPUTED availability (backend validates eligibility)
    canClaim: boolean                   // Backend checks: tier match + limit + enabled + no active claim
    isLocked: boolean                   // tier_eligibility != current_tier (preview from higher tier)
    isPreview: boolean                  // Locked preview reward (from preview_from_tier)

    // Usage tracking (VIP tier rewards only, current tier only)
    usedCount: number                   // COUNT from redemptions WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier
    totalQuantity: number               // From rewards.redemption_quantity (1-10 or NULL for unlimited)

    // Tier information
    tierEligibility: string             // From rewards.tier_eligibility ("tier_3")
    requiredTierName: string | null     // From tiers.tier_name ("Platinum") if locked, else null
    rewardSource: 'vip_tier' | 'mission' // From rewards.reward_source (always 'vip_tier' for this endpoint)
    displayOrder: number                // From rewards.display_order (admin-defined priority)

    // PRE-FORMATTED status details (backend computes all dates/times)
    statusDetails: {
      // For 'scheduled' status (discount or commission_boost)
      scheduledDate?: string            // "Jan 15, 2025 at 2:00 PM" (formatted in user's timezone)
      scheduledDateRaw?: string         // ISO 8601 for frontend date pickers

      // For 'active' status (discount or commission_boost)
      activationDate?: string           // "Jan 10, 2025" (human readable)
      expirationDate?: string           // "Feb 10, 2025" (human readable)
      daysRemaining?: number            // Days until expiration (e.g., 15)

      // For 'sending' status (physical_gift)
      shippingCity?: string             // "Los Angeles" (user's shipping city)

      // For 'clearing' status (commission_boost)
      clearingDays?: number             // Days remaining until payout (20-day clearing period)
    } | null

    // Redemption frequency info (for UI hints)
    redemptionFrequency: 'one-time' | 'monthly' | 'weekly' | 'unlimited'

    // Redemption type (workflow type)
    redemptionType: 'instant' | 'scheduled'  // 'instant' for gift_card/spark_ads/experience/physical_gift, 'scheduled' for commission_boost/discount
  }>
}
```

### Backend Formatting Rules

The backend generates `name` and `displayText` fields dynamically based on reward type:

| Type | `name` Generation | `displayText` Generation |
|------|-------------------|--------------------------|
| **gift_card** | `"$" + amount + " Gift Card"` | `"Amazon Gift Card"` |
| **commission_boost** | `percent + "% Pay Boost"` | `"Higher earnings (" + durationDays + "d)"` |
| **spark_ads** | `"$" + amount + " Ads Boost"` | `"Spark Ads Promo"` |
| **discount** | `percent + "% Deal Boost"` | `"Follower Discount (" + durationDays + "d)"` |
| **physical_gift** | `"Gift Drop: " + description` | `valueData.displayText \|\| description` |
| **experience** | `description` | `valueData.displayText \|\| description` |

**Examples:**
- `gift_card` with `amount: 50` → name: `"$50 Gift Card"`, displayText: `"Amazon Gift Card"`
- `commission_boost` with `percent: 5, durationDays: 30` → name: `"5% Pay Boost"`, displayText: `"Higher earnings (30d)"`
- `spark_ads` with `amount: 100` → name: `"$100 Ads Boost"`, displayText: `"Spark Ads Promo"`
- `discount` with `percent: 15, durationDays: 7` → name: `"15% Deal Boost"`, displayText: `"Follower Discount (7d)"`
- `physical_gift` with `description: "Headphones"`, `valueData.displayText: "Premium wireless earbuds"` → name: `"Gift Drop: Headphones"`, displayText: `"Premium wireless earbuds"`
- `experience` with `description: "Mystery Trip"`, `valueData.displayText: "A hidden adventure"` → name: `"Mystery Trip"`, displayText: `"A hidden adventure"`

**Character Limits:**
- `name`: VARCHAR(255) - auto-generated
- `description`: VARCHAR(12) - client admin input (physical_gift/experience only)
- `valueData.displayText`: max 27 chars - client admin input (physical_gift/experience only)

### Example Response

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "creatorpro",
    "currentTier": "tier_3",
    "currentTierName": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "redemptionCount": 5,
  "rewards": [
    {
      "id": "reward-boost-5pct",
      "type": "commission_boost",
      "name": "5% Pay Boost",
      "description": "",
      "displayText": "Higher earnings (30d)",
      "valueData": {
        "percent": 5,
        "durationDays": 30
      },
      "status": "clearing",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 3,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 4,
      "statusDetails": {
        "clearingDays": 15
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-headphones",
      "type": "physical_gift",
      "name": "Wireless Headphones",
      "description": "Premium earbuds",
      "displayText": "Win a Wireless Headphones",
      "valueData": {
        "requiresSize": false
      },
      "status": "sending",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 2,
      "statusDetails": {
        "shippingCity": "Los Angeles"
      },
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-discount-15",
      "type": "discount",
      "name": "15% Follower Discount",
      "description": "Deal boost",
      "displayText": "+15% Deal Boost for 7 Days",
      "valueData": {
        "percent": 15,
        "durationDays": 7,
        "couponCode": "GOLD15",
        "maxUses": 100
      },
      "status": "active",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 6,
      "statusDetails": {
        "activationDate": "Jan 10, 2025",
        "expirationDate": "Jan 17, 2025",
        "daysRemaining": 3
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-boost-10pct",
      "type": "commission_boost",
      "name": "10% Commission Boost",
      "description": "Temporary commission increase",
      "displayText": "+10% Pay boost for 30 Days",
      "valueData": {
        "percent": 10,
        "durationDays": 30
      },
      "status": "scheduled",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 2,
      "totalQuantity": 3,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 4,
      "statusDetails": {
        "scheduledDate": "Jan 20, 2025 at 2:00 PM",
        "scheduledDateRaw": "2025-01-20T19:00:00Z"
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-hoodie",
      "type": "physical_gift",
      "name": "Branded Hoodie",
      "description": "Premium hoodie",
      "displayText": "Win a Branded Hoodie",
      "valueData": {
        "requiresSize": true,
        "sizeCategory": "clothing",
        "sizeOptions": ["S", "M", "L", "XL"]
      },
      "status": "redeeming_physical",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 0,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 2,
      "statusDetails": null,
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-giftcard-50",
      "type": "gift_card",
      "name": "$50 Amazon Gift Card",
      "description": "Amazon GC",
      "displayText": "$50 Gift Card",
      "valueData": {
        "amount": 50
      },
      "status": "redeeming",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 3,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    },
    {
      "id": "reward-giftcard-25",
      "type": "gift_card",
      "name": "$25 Amazon Gift Card",
      "description": "Amazon GC",
      "displayText": "$25 Gift Card",
      "valueData": {
        "amount": 25
      },
      "status": "claimable",
      "canClaim": true,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 0,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 3,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    },
    {
      "id": "reward-sparkads-100",
      "type": "spark_ads",
      "name": "$100 Spark Ads Credit",
      "description": "Ads boost",
      "displayText": "+$100 Ads Boost",
      "valueData": {
        "amount": 100
      },
      "status": "limit_reached",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "rewardSource": "vip_tier",
      "displayOrder": 5,
      "statusDetails": null,
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-platinum-giftcard",
      "type": "gift_card",
      "name": "$200 Amazon Gift Card",
      "description": "Premium GC",
      "displayText": "$200 Gift Card",
      "valueData": {
        "amount": 200
      },
      "status": "locked",
      "canClaim": false,
      "isLocked": true,
      "isPreview": true,
      "usedCount": 0,
      "totalQuantity": 1,
      "tierEligibility": "tier_4",
      "requiredTierName": "Platinum",
      "rewardSource": "vip_tier",
      "displayOrder": 1,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    }
  ]
}
```

### Business Logic

#### **Status Computation (Backend Derives from Multiple Tables)**

**Priority Rank 1 - Pending Info:**
```typescript
// Commission boost waiting for payment information
if (reward.type === 'commission_boost' &&
    redemption.status === 'claimed' &&
    boost_redemption.boost_status === 'pending_info') {
  status = 'pending_info'
  statusDetails = null  // No additional details needed
}
```

**Priority Rank 2 - Clearing:**
```typescript
// Commission boost pending payout (20-day clearing period)
if (reward.type === 'commission_boost' &&
    redemption.status === 'fulfilled' &&
    boost_redemption.boost_status === 'pending_payout') {
  status = 'clearing'
  statusDetails = {
    clearingDays: 20 - daysSince(boost_redemption.sales_at_expiration)
  }
}
```

**Priority Rank 3 - Sending:**
```typescript
// Physical gift shipped by admin
if (reward.type === 'physical_gift' &&
    redemption.status === 'claimed' &&
    physical_gift_redemption.shipped_at IS NOT NULL) {
  status = 'sending'
  statusDetails = {
    shippingCity: physical_gift_redemption.shipping_city
  }
}
```

**Priority Rank 4 - Active:**
```typescript
// Commission boost currently active
if (reward.type === 'commission_boost' &&
    redemption.status === 'claimed' &&
    boost_redemption.boost_status === 'active') {
  status = 'active'
  statusDetails = {
    activationDate: formatDate(boost_redemption.activated_at),
    expirationDate: formatDate(boost_redemption.expires_at),
    daysRemaining: daysBetween(NOW(), boost_redemption.expires_at)
  }
}

// Discount currently active
if (reward.type === 'discount' &&
    redemption.status === 'fulfilled' &&
    redemption.activation_date IS NOT NULL &&
    redemption.expiration_date IS NOT NULL &&
    NOW() >= redemption.activation_date &&
    NOW() <= redemption.expiration_date) {
  status = 'active'
  statusDetails = {
    activationDate: formatDate(redemption.activation_date),
    expirationDate: formatDate(redemption.expiration_date),
    daysRemaining: daysBetween(NOW(), redemption.expiration_date)
  }
}
```

**Priority Rank 5 - Scheduled:**
```typescript
// Commission boost or discount scheduled for future activation
if ((reward.type === 'commission_boost' || reward.type === 'discount') &&
    redemption.status === 'claimed' &&
    redemption.scheduled_activation_date IS NOT NULL) {
  status = 'scheduled'
  statusDetails = {
    scheduledDate: formatDateTime(redemption.scheduled_activation_date, redemption.scheduled_activation_time),
    scheduledDateRaw: toISO8601(redemption.scheduled_activation_date, redemption.scheduled_activation_time)
  }
}
```

**Priority Rank 6 - Redeeming Physical:**
```typescript
// Physical gift claimed, address provided, but not shipped yet
if (reward.type === 'physical_gift' &&
    redemption.status === 'claimed' &&
    physical_gift_redemption.shipping_city IS NOT NULL &&
    physical_gift_redemption.shipped_at IS NULL) {
  status = 'redeeming_physical'
}
```

**Priority Rank 7 - Redeeming:**
```typescript
// Instant rewards (gift_card, spark_ads, experience) claimed but not fulfilled
if (reward.type IN ('gift_card', 'spark_ads', 'experience') &&
    redemption.status === 'claimed') {
  status = 'redeeming'
}
```

**Priority Rank 8 - Claimable:**
```typescript
// No active claim AND within limits
if (!hasActiveClaim && usedCount < totalQuantity && tier matches) {
  status = 'claimable'
  canClaim = true
}
```

**Priority Rank 9 - Limit Reached:**
```typescript
// All uses exhausted (only shows AFTER last reward is concluded)
if (usedCount >= totalQuantity && allClaimsConcluded) {
  status = 'limit_reached'
  canClaim = false
}
```

**Priority Rank 10 - Locked:**
```typescript
// Tier requirement not met (preview from higher tier)
if (reward.tier_eligibility != user.current_tier &&
    reward.preview_from_tier IS NOT NULL &&
    user.current_tier >= reward.preview_from_tier) {
  status = 'locked'
  isLocked = true
  isPreview = true
  canClaim = false
  requiredTierName = getTierName(reward.tier_eligibility)
}
```

---

#### **Usage Count Calculation (VIP Tier Rewards Only)**

```sql
-- Count ONLY VIP tier redemptions from current tier
SELECT COUNT(*) as used_count
FROM redemptions
WHERE user_id = $userId
  AND reward_id = $rewardId
  AND mission_progress_id IS NULL              -- ✅ VIP tier rewards only
  AND tier_at_claim = $currentTier             -- ✅ Current tier only
  AND status IN ('claimed', 'fulfilled', 'concluded')  -- ✅ Active and completed claims
  AND deleted_at IS NULL                       -- ✅ Not soft-deleted
  AND created_at >= (
    SELECT tier_achieved_at
    FROM users
    WHERE id = $userId
  );
```

**Key Points:**
- Mission rewards DON'T count toward VIP tier limits (`mission_progress_id IS NULL`)
- Only current tier redemptions count (`tier_at_claim = current_tier`)
- Resets on tier change (`created_at >= tier_achieved_at`)

**Usage Count Reset Behavior:**

When a user's tier changes, the usage count resets according to these rules:

1. **Tier Promotion (e.g., Silver → Gold):**
   - User's `tier_achieved_at` timestamp updates to NOW()
   - `usedCount` for new tier's rewards starts at 0
   - Old tier's redemptions remain in database (with `tier_at_claim = 'tier_2'`)
   - New tier's rewards become available based on new tier's `redemption_quantity`

2. **Tier Demotion (e.g., Gold → Silver):**
   - User's `tier_achieved_at` timestamp updates to NOW()
   - Higher tier's redemptions are **soft-deleted** (`deleted_at` set, `deleted_reason` = 'tier_change_tier_3_to_tier_2')
   - Lower tier's rewards become available again
   - `usedCount` for lower tier rewards starts fresh from demotion timestamp

3. **Re-Promotion to Same Tier (e.g., Gold → Silver → Gold):**
   - User's `tier_achieved_at` timestamp updates to NOW() when re-promoted
   - Previous Gold tier redemptions are NOT reactivated (soft-deleted during demotion)
   - User gets FRESH `redemption_quantity` limits for Gold tier rewards
   - Example: Gold allows 3 commission boosts → demoted → re-promoted → gets 3 NEW boosts

**SQL Query Ensures Fresh Count:**
```sql
-- Only count redemptions created AFTER current tier achievement
created_at >= (SELECT tier_achieved_at FROM users WHERE id = $userId)
```

**Example Timeline:**
```
Jan 1:  User promoted to Gold (tier_achieved_at = Jan 1)
Jan 5:  Claims commission boost #1 (usedCount = 1/3)
Jan 10: Claims commission boost #2 (usedCount = 2/3)
Feb 1:  Checkpoint: User demoted to Silver (tier_achieved_at = Feb 1, Gold redemptions soft-deleted)
Mar 1:  User re-promoted to Gold (tier_achieved_at = Mar 1)
Mar 5:  Claims commission boost #1 (usedCount = 1/3) ← Fresh count, previous boosts don't count
```

---

#### **Display Text Formatting (Backend Pre-Formats)**

```typescript
function generateDisplayText(reward: Reward): string {
  const { type, value_data, name } = reward

  switch (type) {
    case 'gift_card':
      return `$${value_data.amount} Gift Card`

    case 'commission_boost':
      return `+${value_data.percent}% Pay boost for ${value_data.duration_days} Days`

    case 'spark_ads':
      return `+$${value_data.amount} Ads Boost`

    case 'discount':
      // Convert duration_minutes (stored in DB) to days for display
      const durationDays = Math.floor(value_data.duration_minutes / 1440)
      return `+${value_data.percent}% Deal Boost for ${durationDays} Days`

    case 'physical_gift':
      return `Win a ${name}`

    case 'experience':
      return `Win a ${name}`

    default:
      return name
  }
}
```

**Note:** Backend must transform discount `duration_minutes` (DB field) to `durationDays` (API field) before returning response:
```typescript
// For discount type rewards, transform value_data
if (reward.type === 'discount') {
  reward.valueData = {
    percent: reward.value_data.percent,
    durationDays: Math.floor(reward.value_data.duration_minutes / 1440),
    couponCode: reward.value_data.coupon_code,
    maxUses: reward.value_data.max_uses
  }
}
```

---

#### **Sorting Logic (Backend Dual-Sort)**

**Rewards array is sorted to prioritize actionable items first, then status updates, then informational items:**

**Priority 1-2: Actionable (Requires User Action)**
- `pending_info` (1) - Commission boost waiting for payment method (ACTION REQUIRED)
  - Database condition: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='pending_info'`
- `claimable` (2) - Ready to claim (ACTION REQUIRED)
  - Database condition: User has no active redemption AND redemption limit not reached

**Priority 3-6: Status Updates (Active/Processing)**
- `clearing` (3) - Commission boost payout clearing period
  - Database condition: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='pending_payout'`
- `sending` (4) - Physical gift shipped, tracking available
  - Database condition: `redemptions.status='claimed'` AND `physical_gift_redemptions.shipped_at IS NOT NULL`
- `active` (5) - Commission boost or discount currently running
  - Commission boost: `redemptions.status='claimed'` AND `commission_boost_redemption.boost_status='active'`
  - Discount: `redemptions.status='fulfilled'` AND `redemptions.fulfilled_at IS NOT NULL`
- `scheduled` (6) - Commission boost or discount scheduled for future activation
  - Commission boost: `redemptions.status='claimed'` AND `commission_boost_redemption.scheduled_activation_date IS NOT NULL`
  - Discount: `redemptions.status='claimed'` AND `redemptions.scheduled_activation_date IS NOT NULL`

**Priority 7-8: Processing (Being Fulfilled)**
- `redeeming` (7) - Instant rewards being processed (gift cards, spark ads, experiences)
  - Database condition: `redemptions.status='claimed'` AND `reward.type IN ('gift_card', 'spark_ads', 'experience')`
- `redeeming_physical` (8) - Physical gift claimed, address provided, awaiting shipment
  - Database condition: `redemptions.status='claimed'` AND `physical_gift_redemptions.shipping_city IS NOT NULL` AND `shipped_at IS NULL`

**Priority 9-10: Informational/Unavailable**
- `limit_reached` (9) - Redemption limit reached (monthly/one-time cap hit)
  - Database condition: User has reached `redemption_quantity` limit for this reward
- `locked` (10) - Tier-gated preview (requires higher tier)
  - Database condition: `reward.tier_eligibility != user.current_tier` AND `reward.preview_from_tier IS NOT NULL`

**Implementation:**

```typescript
// Step 1: Sort by status priority (actionable → status updates → informational)
const statusPriority = {
  pending_info: 1,        // Action required
  claimable: 2,           // Action required
  clearing: 3,            // Status update
  sending: 4,             // Status update
  active: 5,              // Status update
  scheduled: 6,           // Status update
  redeeming: 7,           // Processing
  redeeming_physical: 8,  // Processing
  limit_reached: 9,       // Informational
  locked: 10              // Informational
}

// Step 2: Within same status priority, sort by display_order (admin-defined)
rewards.sort((a, b) => {
  const statusDiff = statusPriority[a.status] - statusPriority[b.status]
  if (statusDiff !== 0) return statusDiff
  return a.displayOrder - b.displayOrder  // Tiebreaker: admin-defined order
})
```

---

#### **Database Query**

```sql
-- Get all rewards for user's current tier (including locked previews)
SELECT
  r.id,
  r.type,
  r.name,
  r.description,
  r.value_data,
  r.tier_eligibility,
  r.redemption_frequency,
  r.redemption_quantity,
  r.display_order,
  r.preview_from_tier,
  t.tier_name as tier_name,

  -- Active redemption data (if exists)
  red.id as redemption_id,
  red.status as redemption_status,
  red.claimed_at,
  red.scheduled_activation_date,
  red.scheduled_activation_time,
  red.activation_date,
  red.expiration_date,

  -- Commission boost sub-state (if applicable)
  cb.boost_status,
  cb.activated_at as boost_activated_at,
  cb.expires_at as boost_expires_at,
  cb.sales_at_expiration,

  -- Physical gift sub-state (if applicable)
  pg.shipping_city,
  pg.shipped_at

FROM rewards r
JOIN tiers t ON r.tier_eligibility = t.tier_id AND t.client_id = $clientId
LEFT JOIN redemptions red ON (
  red.reward_id = r.id
  AND red.user_id = $userId
  AND red.mission_progress_id IS NULL  -- VIP tier rewards only
  AND red.status NOT IN ('concluded', 'rejected')  -- Exclude completed/rejected
  AND red.deleted_at IS NULL
)
LEFT JOIN commission_boost_redemptions cb ON cb.redemption_id = red.id
LEFT JOIN physical_gift_redemptions pg ON pg.redemption_id = red.id

WHERE r.client_id = $clientId
  AND r.enabled = true
  AND r.reward_source = 'vip_tier'  -- Only VIP tier rewards (not mission rewards)
  AND (
    -- Show rewards for current tier
    r.tier_eligibility = $currentTier
    OR
    -- Show locked previews from higher tiers
    (r.preview_from_tier IS NOT NULL AND $currentTierOrder >= (
      SELECT tier_order FROM tiers WHERE tier_id = r.preview_from_tier AND client_id = $clientId
    ))
  )

ORDER BY r.display_order ASC;  -- Backend will re-sort by status priority
```

---

### Performance Optimization

**Single Query Strategy:**
- Fetch all rewards + active redemptions + sub-states in ONE query
- Use LEFT JOINs for optional sub-state tables
- Backend computes status for each reward
- Backend re-sorts by status priority + display_order

**Expected Response Time:** ~120-150ms

---

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch rewards data"
}
```

---

## POST /api/rewards/:id/claim

**Purpose:** Creator claims a VIP tier reward from their current tier. Creates a redemption record and handles scheduling for commission_boost and discount types.

**Note:** This endpoint is for VIP tier rewards ONLY (rewards page). For mission rewards, use `POST /api/missions/:id/claim`.

### Request

```http
POST /api/rewards/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Request Body Schema

```typescript
interface ClaimRewardRequest {
  // Optional: Only required for scheduled reward types (discount, commission_boost)
  scheduledActivationAt?: string  // ISO 8601 timestamp
                                   // Required if reward type is 'discount' or 'commission_boost'
                                   // Not used for: gift_card, spark_ads, physical_gift, experience

  // Optional: For physical gifts requiring size selection
  sizeValue?: string               // Size value (e.g., "M", "L", "XL")
                                   // Required if reward.value_data.requires_size = true
                                   // Must match one of reward.value_data.size_options

  // Optional: Shipping information for physical gifts
  shippingInfo?: {
    firstName: string            // Required - Recipient first name (1-100 chars, letters/spaces/hyphens/apostrophes only)
    lastName: string             // Required - Recipient last name (1-100 chars, letters/spaces/hyphens/apostrophes only)
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone: string                // Required - Contact phone for delivery
  }  // Required if reward type is 'physical_gift'
}
```

### Request Body Examples

**Instant Reward (Gift Card, Spark Ads, Experience):**
```json
{}
```

**Physical Gift (No size required):**
```json
{
  "shippingInfo": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA",
    "phone": "555-0123"
  }
}
```

**Physical Gift (Size required):**
```json
{
  "sizeValue": "L",
  "shippingInfo": {
    "firstName": "Jane",
    "lastName": "Smith",
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA",
    "phone": "555-0123"
  }
}
```

**Discount (Requires scheduling):**
```json
{
  "scheduledActivationAt": "2025-01-15T14:00:00Z"
}
```

**Commission Boost (Requires activation date, time auto-set to 2 PM EST):**
```json
{
  "scheduledActivationAt": "2025-01-20T19:00:00Z"
}
```

### Validation Business Rules

#### **Pre-Claim Validation (in order):**

1. **Authentication:** Valid JWT token required
2. **Reward Exists:** Reward ID must exist in database
3. **Reward Enabled:** `rewards.enabled = true`
4. **Tier Eligibility:** `reward.tier_eligibility` must match `user.current_tier`
5. **VIP Tier Reward Only:** `reward.reward_source` must be `'vip_tier'`
   ```sql
   SELECT * FROM rewards WHERE id = $rewardId AND reward_source = 'vip_tier';
   -- Must return 1 row (mission rewards should use POST /api/missions/:id/claim)
   ```
6. **No Active Claim:** User must NOT have an active redemption for this reward
   ```sql
   SELECT COUNT(*) FROM redemptions
   WHERE user_id = $userId
     AND reward_id = $rewardId
     AND mission_progress_id IS NULL  -- VIP tier only
     AND status IN ('claimed', 'fulfilled')  -- Active states
     AND deleted_at IS NULL;
   -- Must return 0 (user can't claim same reward twice simultaneously)
   ```
7. **Usage Limit Check:** Must not exceed `redemption_quantity`
   ```sql
   -- Count VIP tier redemptions from current tier only
   SELECT COUNT(*) FROM redemptions
   WHERE user_id = $userId
     AND reward_id = $rewardId
     AND mission_progress_id IS NULL              -- VIP tier only
     AND tier_at_claim = $currentTier             -- Current tier only
     AND status IN ('claimed', 'fulfilled', 'concluded')
     AND deleted_at IS NULL
     AND created_at >= (SELECT tier_achieved_at FROM users WHERE id = $userId);
   -- Count must be < redemption_quantity
   ```
8. **Scheduling Required:** If reward type is `discount` or `commission_boost`, `scheduledActivationAt` must be provided
9. **Scheduling Validation (Discount):**
   - Date must be weekday (Mon-Fri)
   - Time must be between 09:00-16:00 EST
   - Date must be in future
10. **Scheduling Validation (Commission Boost):**
    - Date must be in future
    - Time automatically set to 14:00:00 EST (2 PM) regardless of input
11. **Physical Gift Requirements:**
    - `shippingInfo` must be provided
    - If `value_data.requires_size = true`, `sizeValue` must be provided
    - If `sizeValue` is provided, it must match one of the values in `value_data.size_options`
    ```typescript
    if (reward.value_data.requires_size && !request.sizeValue) {
      throw new Error('SIZE_REQUIRED')
    }
    if (request.sizeValue && !reward.value_data.size_options.includes(request.sizeValue)) {
      throw new Error('INVALID_SIZE_SELECTION')
    }
    ```

#### **Redemption Period Reset Rules:**

One-time rewards have **two different behaviors** based on reward type:

| Reward Type | Redemption Period | Re-claimable on Re-promotion? | Period Start |
|--------------|-------------------|-------------------------------|--------------|
| `gift_card` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `physical_gift` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `experience` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `commission_boost` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `spark_ads` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `discount` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |

---

### Response Schema

```typescript
interface ClaimRewardResponse {
  success: boolean
  message: string  // User-facing success message

  // Created redemption record
  redemption: {
    id: string                        // UUID of created redemption
    status: 'claimed'                 // Always "claimed" immediately after claim
    rewardType: 'gift_card' | 'commission_boost' | 'discount' | 'spark_ads' | 'physical_gift' | 'experience'
    claimedAt: string                 // ISO 8601 timestamp

    // Reward details (for confirmation display)
    reward: {
      id: string
      name: string                    // e.g., "$25 Gift Card", "5% Commission Boost"
      displayText: string             // Pre-formatted: "+5% Pay boost for 30 Days"
      type: string
      rewardSource: 'vip_tier'        // Always 'vip_tier' for this endpoint
      valueData: {
        amount?: number               // For gift_card, spark_ads
        percent?: number              // For commission_boost, discount
        durationDays?: number         // For commission_boost, discount (converted from duration_minutes)
        couponCode?: string           // For discount
        maxUses?: number              // For discount
      } | null
    }

    // Scheduling info (only present for discount, commission_boost)
    scheduledActivationAt?: string    // ISO 8601 timestamp

    // Updated usage tracking
    usedCount: number                 // New count after this claim
    totalQuantity: number             // From reward.redemption_quantity

    // Next steps (UI hints based on reward type)
    nextSteps: {
      action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation'
      message: string                 // User-facing instruction
    }
  }

  // Updated rewards list (for UI refresh)
  updatedRewards: Array<{
    id: string
    status: string                    // Updated status after claim
    canClaim: boolean                 // Updated claimability
    usedCount: number                 // Updated count
  }>
}
```

### Response Examples

**Success - Gift Card Claimed:**
```json
{
  "success": true,
  "message": "Gift card claimed! You'll receive your reward soon.",
  "redemption": {
    "id": "redemption-abc-123",
    "status": "claimed",
    "rewardType": "gift_card",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-giftcard-25",
      "name": "$25 Amazon Gift Card",
      "displayText": "$25 Gift Card",
      "type": "gift_card",
      "rewardSource": "vip_tier",
      "valueData": {
        "amount": 25
      }
    },
    "usedCount": 1,
    "totalQuantity": 2,
    "nextSteps": {
      "action": "wait_fulfillment",
      "message": "Your gift card is being processed. You'll receive an email when it's ready!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-giftcard-25",
      "status": "redeeming",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

**Success - Commission Boost Scheduled:**
```json
{
  "success": true,
  "message": "Commission boost scheduled to activate on Jan 20 at 2:00 PM ET",
  "redemption": {
    "id": "redemption-boost-456",
    "status": "claimed",
    "rewardType": "commission_boost",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-boost-10pct",
      "name": "10% Commission Boost",
      "displayText": "+10% Pay boost for 30 Days",
      "type": "commission_boost",
      "rewardSource": "vip_tier",
      "valueData": {
        "percent": 10,
        "durationDays": 30
      }
    },
    "scheduledActivationAt": "2025-01-20T19:00:00Z",
    "usedCount": 1,
    "totalQuantity": 3,
    "nextSteps": {
      "action": "scheduled_confirmation",
      "message": "Your boost will activate automatically at 2 PM ET on Jan 20!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-boost-10pct",
      "status": "scheduled",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

**Success - Physical Gift Claimed:**
```json
{
  "success": true,
  "message": "Hoodie claimed! We'll ship it to your address soon.",
  "redemption": {
    "id": "redemption-hoodie-789",
    "status": "claimed",
    "rewardType": "physical_gift",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-hoodie",
      "name": "Branded Hoodie",
      "displayText": "Win a Branded Hoodie",
      "type": "physical_gift",
      "rewardSource": "vip_tier",
      "valueData": null
    },
    "usedCount": 1,
    "totalQuantity": 1,
    "nextSteps": {
      "action": "shipping_confirmation",
      "message": "Your shipping info has been received. We'll send tracking details via email!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-hoodie",
      "status": "redeeming_physical",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

---

### Error Responses

**400 Bad Request - Active Claim Exists:**
```json
{
  "error": "ACTIVE_CLAIM_EXISTS",
  "message": "You already have an active claim for this reward. Wait for it to be fulfilled before claiming again.",
  "activeRedemptionId": "redemption-xyz-123",
  "activeRedemptionStatus": "claimed"
}
```

**400 Bad Request - Limit Reached:**
```json
{
  "error": "LIMIT_REACHED",
  "message": "You have reached the redemption limit for this reward (2 of 2 used this month)",
  "usedCount": 2,
  "totalQuantity": 2,
  "redemptionFrequency": "monthly"
}
```

**400 Bad Request - Missing Scheduled Date:**
```json
{
  "error": "SCHEDULING_REQUIRED",
  "message": "This reward requires a scheduled activation date",
  "rewardType": "discount"
}
```

**400 Bad Request - Invalid Schedule (Weekend):**
```json
{
  "error": "INVALID_SCHEDULE",
  "message": "Discounts can only be scheduled on weekdays (Monday-Friday)",
  "allowedDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

**400 Bad Request - Invalid Time Slot:**
```json
{
  "error": "INVALID_TIME_SLOT",
  "message": "Discounts must be scheduled between 9 AM - 4 PM EST",
  "allowedHours": "09:00 - 16:00 EST"
}
```

**400 Bad Request - Missing Shipping Info:**
```json
{
  "error": "SHIPPING_INFO_REQUIRED",
  "message": "Physical gifts require shipping information",
  "rewardType": "physical_gift"
}
```

**400 Bad Request - Missing Size:**
```json
{
  "error": "SIZE_REQUIRED",
  "message": "This item requires a size selection",
  "sizeOptions": ["S", "M", "L", "XL"]
}
```

**400 Bad Request - Invalid Size:**
```json
{
  "error": "INVALID_SIZE_SELECTION",
  "message": "Selected size is not available for this item",
  "selectedSize": "XXL",
  "availableSizes": ["S", "M", "L", "XL"]
}
```

**403 Forbidden - Tier Mismatch:**
```json
{
  "error": "TIER_INELIGIBLE",
  "message": "This reward requires Gold tier. You are currently Silver.",
  "requiredTier": "tier_3",
  "currentTier": "tier_2"
}
```

**404 Not Found:**
```json
{
  "error": "REWARD_NOT_FOUND",
  "message": "Reward not found or not available for your tier"
}
```

**500 Internal Server Error:**
```json
{
  "error": "CLAIM_FAILED",
  "message": "Failed to process reward claim. Please try again or contact support."
}
```

---

# Rewards History

**Page:** `/app/rewards/rewardshistory/page.tsx`

## GET /api/user/payment-info

**Purpose:** Retrieve user's saved payment information for pre-filling payment modals (commission boost payouts).

### Request

```http
GET /api/user/payment-info
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface PaymentInfoResponse {
  hasPaymentInfo: boolean                    // Whether user has saved payment info
  paymentMethod: 'paypal' | 'venmo' | null   // Saved payment method
  paymentAccount: string | null              // Full unmasked account (user is authenticated)
}
```

### Example Response

**With Saved Info:**
```json
{
  "hasPaymentInfo": true,
  "paymentMethod": "paypal",
  "paymentAccount": "john@example.com"
}
```

**No Saved Info:**
```json
{
  "hasPaymentInfo": false,
  "paymentMethod": null,
  "paymentAccount": null,
  "paymentAccountLast4": null
}
```

---

## POST /api/rewards/:id/payment-info

**Purpose:** Submit payment information for a commission boost payout. Updates both the specific redemption and optionally saves as user's default payment method.

### Request

```http
POST /api/rewards/:id/payment-info
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Request Body

```typescript
interface PaymentInfoRequest {
  paymentMethod: 'paypal' | 'venmo'          // Payment platform
  paymentAccount: string                     // PayPal email or Venmo handle
  paymentAccountConfirm: string              // Confirmation (must match)
  saveAsDefault: boolean                     // Save to users.default_payment_* for future use
}
```

### Request Body Examples

**PayPal:**
```json
{
  "paymentMethod": "paypal",
  "paymentAccount": "john@example.com",
  "paymentAccountConfirm": "john@example.com",
  "saveAsDefault": true
}
```

**Venmo:**
```json
{
  "paymentMethod": "venmo",
  "paymentAccount": "@johndoe",
  "paymentAccountConfirm": "@johndoe",
  "saveAsDefault": false
}
```

### Response Schema

```typescript
interface PaymentInfoSubmitResponse {
  success: boolean
  message: string
  redemption: {
    id: string
    status: string                           // Updated to 'fulfilled'
    paymentMethod: 'paypal' | 'venmo'
    paymentInfoCollectedAt: string           // ISO 8601 timestamp
  }
  userPaymentUpdated: boolean                // Whether default payment was saved to users table
}
```

### Example Response

**Success:**
```json
{
  "success": true,
  "message": "Payment information saved successfully",
  "redemption": {
    "id": "redemption-abc-123",
    "status": "fulfilled",
    "paymentMethod": "paypal",
    "paymentInfoCollectedAt": "2025-01-18T15:30:00Z"
  },
  "userPaymentUpdated": true
}
```

### Error Responses

**400 Bad Request - Accounts Don't Match:**
```json
{
  "error": "PAYMENT_ACCOUNT_MISMATCH",
  "message": "Payment account confirmation does not match"
}
```

**400 Bad Request - Invalid Email (PayPal):**
```json
{
  "error": "INVALID_PAYPAL_EMAIL",
  "message": "Please provide a valid PayPal email address"
}
```

**400 Bad Request - Invalid Handle (Venmo):**
```json
{
  "error": "INVALID_VENMO_HANDLE",
  "message": "Venmo handle must start with @ (e.g., @username)"
}
```

**403 Forbidden - Not Pending Info:**
```json
{
  "error": "PAYMENT_INFO_NOT_REQUIRED",
  "message": "This reward is not awaiting payment information",
  "currentStatus": "active"
}
```

**404 Not Found:**
```json
{
  "error": "REWARD_NOT_FOUND",
  "message": "Reward not found or not accessible"
}
```

---

## GET /api/rewards/history

**Purpose:** Retrieve user's concluded reward redemptions (archived/completed history). Shows ONLY rewards that have reached terminal "concluded" state and been moved to history archive.

**Page:** `/app/rewards/rewardshistory/page.tsx`

### Request

```http
GET /api/rewards/history
Authorization: Bearer <supabase-jwt-token>
```

### Backend Query

```sql
SELECT
  r.id,
  r.reward_id,
  rw.type,
  rw.name,
  rw.description,
  rw.value_data,        -- JSONB: Required for formatting (amount, percent, durationDays, displayText)
  rw.reward_source,
  r.claimed_at,
  r.concluded_at
FROM redemptions r
JOIN rewards rw ON r.reward_id = rw.id
WHERE r.user_id = current_user_id
  AND r.status = 'concluded'  -- ONLY concluded rewards in history
ORDER BY r.concluded_at DESC
```

### Response Schema

```typescript
interface RedemptionHistoryResponse {
  user: {
    id: string
    handle: string
    currentTier: string        // e.g., "tier_3"
    currentTierName: string    // e.g., "Gold"
    currentTierColor: string   // Hex color (e.g., "#F59E0B")
  }

  history: Array<{
    id: string                 // redemptions.id
    rewardId: string           // redemptions.reward_id (FK)
    name: string               // Backend-formatted name (follows same rules as GET /api/rewards)
    description: string        // Backend-formatted displayText
    type: RewardType           // 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardSource: 'vip_tier' | 'mission'  // From rewards.reward_source
    claimedAt: string          // ISO 8601 timestamp - when user claimed
    concludedAt: string        // ISO 8601 timestamp - when moved to history
    status: 'concluded'        // Always 'concluded' in history
  }>
}
```

### Backend Formatting Rules

The backend generates `name` and `description` fields using the SAME formatting logic as `GET /api/rewards`:

| Type | `name` Generation | `description` (displayText) Generation |
|------|-------------------|----------------------------------------|
| **gift_card** | `"$" + amount + " Gift Card"` | `"Amazon Gift Card"` |
| **commission_boost** | `percent + "% Pay Boost"` | `"Higher earnings (" + durationDays + "d)"` |
| **spark_ads** | `"$" + amount + " Ads Boost"` | `"Spark Ads Promo"` |
| **discount** | `percent + "% Deal Boost"` | `"Follower Discount (" + durationDays + "d)"` |
| **physical_gift** | `"Gift Drop: " + description` | `valueData.displayText \|\| description` |
| **experience** | `description` | `valueData.displayText \|\| description` |

### Example Response

```json
{
  "user": {
    "id": "user-123",
    "handle": "creator_jane",
    "currentTier": "tier_3",
    "currentTierName": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "history": [
    {
      "id": "redemption-abc-123",
      "rewardId": "reward-def-456",
      "name": "$50 Gift Card",
      "description": "Amazon Gift Card",
      "type": "gift_card",
      "rewardSource": "vip_tier",
      "claimedAt": "2024-01-15T10:00:00Z",
      "concludedAt": "2024-01-16T14:00:00Z",
      "status": "concluded"
    },
    {
      "id": "redemption-xyz-789",
      "rewardId": "reward-ghi-012",
      "name": "5% Pay Boost",
      "description": "Higher earnings (30d)",
      "type": "commission_boost",
      "rewardSource": "vip_tier",
      "claimedAt": "2024-01-10T09:15:00Z",
      "concludedAt": "2024-01-11T10:30:00Z",
      "status": "concluded"
    },
    {
      "id": "redemption-qrs-345",
      "rewardId": "reward-tuv-678",
      "name": "Gift Drop: Headphones",
      "description": "Premium wireless earbuds",
      "type": "physical_gift",
      "rewardSource": "mission",
      "claimedAt": "2023-12-28T16:45:00Z",
      "concludedAt": "2023-12-30T18:00:00Z",
      "status": "concluded"
    }
  ]
}
```

### Frontend Display Notes

- **Status display:** Frontend shows "Completed" badge (user-friendly) instead of "Concluded" (database status)
- **Timestamp display:** "Completed on [date]" using `concludedAt` field
- **Empty state:** Show "No redemption history yet" message when `history` array is empty
- **Sorting:** Backend returns sorted by `concludedAt DESC` (most recent first)

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "SERVER_ERROR",
  "message": "Failed to retrieve redemption history"
}
```

---

# Tiers

**Page:** `/app/tiers/page.tsx`

## GET /api/tiers

**Purpose:** Returns tier progression information and requirements.

### Request

```http
GET /api/tiers
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface TiersPageResponse {
  // User progress data (dynamic to user's current VIP level)
  user: {
    id: string
    currentTier: string                    // Database tier_id (e.g., "tier_2")
    currentTierName: string                // Display name: "Bronze", "Silver", "Gold", "Platinum"
    currentTierColor: string               // Hex color from tiers.tier_color (Bronze: #CD7F32, Silver: #94a3b8, Gold: #F59E0B, Platinum: #818CF8)
    currentSales: number                   // Current sales value (raw number, compatible with dollars or units)
    currentSalesFormatted: string          // Backend-formatted: "$2,100" or "2,100 units"
    expirationDate: string | null          // ISO 8601 (null if tierLevel === 1, Bronze never expires)
    expirationDateFormatted: string | null // Backend-formatted: "August 10, 2025"
    showExpiration: boolean                // True if tierLevel > 1 (controls display of expiration UI elements)
  }

  // Progress to next tier (dynamic calculations)
  progress: {
    nextTierName: string                   // Display name of next tier: "Silver", "Gold", "Platinum"
    nextTierTarget: number                 // Minimum sales required for next tier (raw number)
    nextTierTargetFormatted: string        // Backend-formatted: "$3,000" or "3,000 units"
    amountRemaining: number                // Calculated: nextTierTarget - currentSales
    amountRemainingFormatted: string       // Backend-formatted: "$900" or "900 units"
    progressPercentage: number             // Calculated: (currentSales / nextTierTarget) * 100
    progressText: string                   // Backend-formatted display text: "$900 to go" or "900 units to go"
  }

  // VIP system configuration (determines display text for all tiers)
  vipSystem: {
    metric: 'sales_dollars' | 'sales_units' // Determines whether minSales displays use "$" or "units"
  }

  // Tier cards (filtered to show only current tier + all higher tiers)
  // User-scoped: Backend only sends tiers where tier_level >= user's current tier_level
  tiers: Array<{
    // Tier identity
    name: string                           // Display name: "Bronze", "Silver", "Gold", "Platinum"
    color: string                          // Hex color from tiers.tier_color
    tierLevel: number                      // 1 = Bronze, 2 = Silver, 3 = Gold, 4 = Platinum

    // Tier requirements
    minSales: number                       // Minimum sales required (raw number)
    minSalesFormatted: string              // Backend-formatted: "$1,000" or "1,000 units"
    salesDisplayText: string               // Backend-formatted full text: "$1,000+ in sales" or "1,000+ in units sold"

    // Commission rate (public information for creators)
    commissionRate: number                 // Percentage: 10, 12, 15, 20
    commissionDisplayText: string          // Backend-formatted: "12% Commission on sales"

    // Tier status (user-specific)
    isUnlocked: boolean                    // True if user has reached this tier (tier_level <= user's tier_level)
    isCurrent: boolean                     // True if this is user's current active tier

    // Perks summary
    totalPerksCount: number                // Sum of all reward uses + mission reward uses
                                          // Example: 7 rewards (uses: 1,2,1,1,1,1,1) + 7 missions = 14 total
                                          // NOTE: Monthly rewards counted per month (2 spark ads/month = 2 perks)

    // Rewards preview (aggregated and formatted by backend)
    // MAX DISPLAY: Backend sends maximum 4 rewards per tier (highest priority only)
    // PRIORITY ORDER: physical_gift (raffle) → experience (raffle) → gift_card (raffle) → experience → physical_gift → gift_card → commission_boost → spark_ads → discount
    rewards: Array<{
      type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
      isRaffle: boolean                    // True if tied to raffle mission
      displayText: string                  // Backend-formatted reward name (see Display Rules below)
      count: number                        // Quantity: 1, 2, 3, etc. (aggregated sum of uses)
      sortPriority: number                 // Backend-computed for sorting (1 = highest priority)
    }>
  }>
}
```

### Display Rules for Reward Text

Backend generates `displayText` (clean reward name) and `count` (quantity) separately:

| Reward Type | Raffle? | displayText Format | count | UI Display |
|-------------|---------|-------------------|-------|------------|
| physical_gift | Yes | `"Chance to win {value_data.display_text \|\| description}!"` | 1 | `"Chance to win AirPods Pro!"` (no ×1) |
| experience | Yes | `"Chance to win {value_data.display_text \|\| description}!"` | 1 | `"Chance to win Mystery Trip!"` (no ×1) |
| gift_card | Yes | `"Chance to win {name}!"` | 1 | `"Chance to win $200 Gift Card!"` (no ×1) |
| experience | No | `"{value_data.display_text \|\| description}"` | 1 | `"VIP Event Access"` (no ×1) |
| physical_gift | No | `"Gift Drop: {value_data.display_text \|\| description}"` | 1 | `"Gift Drop: Branded Hoodie"` (no ×1) |
| gift_card | No | `"{name}"` | 3 | `"$100 Gift Card ×3"` |
| commission_boost | No | `"{name}"` | 4 | `"10% Pay Boost ×4"` |
| spark_ads | No | `"$" + {value_data.amount} + " Ads Boost"` | 2 | `"$50 Ads Boost ×2"` |
| discount | No | `"{name}"` | 3 | `"15% Deal Boost ×3"` |

**Count Calculation:**
- `count` = SUM of `uses` field across all rewards of same type in that tier
- Example: Tier has 2 gift card rewards (uses: 2, 1) → count = 3
- Monthly rewards: If reward has `uses: 2` (2 per month), count it as 2
- Raffle rewards: Always count = 1 (displayed without ×1 in UI)

**Priority Sorting:**
1. physical_gift (raffle)
2. experience (raffle)
3. gift_card (raffle)
4. experience
5. physical_gift
6. gift_card
7. commission_boost
8. spark_ads
9. discount

### Example Responses

**Bronze User (4 tiers total):**
```json
{
  "user": {
    "id": "user123",
    "currentTier": "tier_1",
    "currentTierName": "Bronze",
    "currentTierColor": "#CD7F32",
    "currentSales": 320,
    "currentSalesFormatted": "$320",
    "expirationDate": null,
    "expirationDateFormatted": null,
    "showExpiration": false
  },
  "progress": {
    "nextTierName": "Silver",
    "nextTierTarget": 1000,
    "nextTierTargetFormatted": "$1,000",
    "amountRemaining": 680,
    "amountRemainingFormatted": "$680",
    "progressPercentage": 32,
    "progressText": "$680 to go"
  },
  "vipSystem": {
    "metric": "sales_dollars"
  },
  "tiers": [
    {
      "name": "Bronze",
      "color": "#CD7F32",
      "tierLevel": 1,
      "minSales": 0,
      "minSalesFormatted": "$0",
      "salesDisplayText": "$0+ in sales",
      "commissionRate": 10,
      "commissionDisplayText": "10% Commission on sales",
      "isUnlocked": true,
      "isCurrent": true,
      "totalPerksCount": 10,
      "rewards": [
        {
          "type": "gift_card",
          "isRaffle": false,
          "displayText": "$25 Gift Card",
          "count": 2,
          "sortPriority": 6
        },
        {
          "type": "commission_boost",
          "isRaffle": false,
          "displayText": "5% Pay Boost",
          "count": 1,
          "sortPriority": 7
        },
        {
          "type": "spark_ads",
          "isRaffle": false,
          "displayText": "$30 Ads Boost",
          "count": 1,
          "sortPriority": 8
        },
        {
          "type": "discount",
          "isRaffle": false,
          "displayText": "5% Deal Boost",
          "count": 1,
          "sortPriority": 9
        }
      ]
    },
    {
      "name": "Silver",
      "color": "#94a3b8",
      "tierLevel": 2,
      "minSales": 1000,
      "minSalesFormatted": "$1,000",
      "salesDisplayText": "$1,000+ in sales",
      "commissionRate": 12,
      "commissionDisplayText": "12% Commission on sales",
      "isUnlocked": false,
      "isCurrent": false,
      "totalPerksCount": 14,
      "rewards": [
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win AirPods Pro!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Branded Water Bottle",
          "count": 1,
          "sortPriority": 5
        },
        {
          "type": "gift_card",
          "isRaffle": false,
          "displayText": "$40 Gift Card",
          "count": 2,
          "sortPriority": 6
        },
        {
          "type": "commission_boost",
          "isRaffle": false,
          "displayText": "8% Pay Boost",
          "count": 3,
          "sortPriority": 7
        }
      ]
    },
    {
      "name": "Gold",
      "color": "#F59E0B",
      "tierLevel": 3,
      "minSales": 3000,
      "minSalesFormatted": "$3,000",
      "salesDisplayText": "$3,000+ in sales",
      "commissionRate": 15,
      "commissionDisplayText": "15% Commission on sales",
      "isUnlocked": false,
      "isCurrent": false,
      "totalPerksCount": 20,
      "rewards": [
        {
          "type": "experience",
          "isRaffle": true,
          "displayText": "Chance to win Mystery Trip!",
          "count": 1,
          "sortPriority": 2
        },
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win Premium Headphones!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Designer Backpack",
          "count": 1,
          "sortPriority": 5
        },
        {
          "type": "gift_card",
          "isRaffle": false,
          "displayText": "$75 Gift Card",
          "count": 4,
          "sortPriority": 6
        }
      ]
    },
    {
      "name": "Platinum",
      "color": "#818CF8",
      "tierLevel": 4,
      "minSales": 5000,
      "minSalesFormatted": "$5,000",
      "salesDisplayText": "$5,000+ in sales",
      "commissionRate": 20,
      "commissionDisplayText": "20% Commission on sales",
      "isUnlocked": false,
      "isCurrent": false,
      "totalPerksCount": 32,
      "rewards": [
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win MacBook Pro!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "experience",
          "isRaffle": true,
          "displayText": "Chance to win Brand Partner Trip!",
          "count": 1,
          "sortPriority": 2
        },
        {
          "type": "experience",
          "isRaffle": false,
          "displayText": "VIP Event Access",
          "count": 1,
          "sortPriority": 4
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Designer Bag",
          "count": 1,
          "sortPriority": 5
        }
      ]
    }
  ]
}
```

**Silver User (units-based VIP system):**
```json
{
  "user": {
    "id": "user456",
    "currentTier": "tier_2",
    "currentTierName": "Silver",
    "currentTierColor": "#94a3b8",
    "currentSales": 2100,
    "currentSalesFormatted": "2,100 units",
    "expirationDate": "2025-08-10T00:00:00Z",
    "expirationDateFormatted": "August 10, 2025",
    "showExpiration": true
  },
  "progress": {
    "nextTierName": "Gold",
    "nextTierTarget": 3000,
    "nextTierTargetFormatted": "3,000 units",
    "amountRemaining": 900,
    "amountRemainingFormatted": "900 units",
    "progressPercentage": 70,
    "progressText": "900 units to go"
  },
  "vipSystem": {
    "metric": "sales_units"
  },
  "tiers": [
    {
      "name": "Silver",
      "color": "#94a3b8",
      "tierLevel": 2,
      "minSales": 1000,
      "minSalesFormatted": "1,000 units",
      "salesDisplayText": "1,000+ in units sold",
      "commissionRate": 12,
      "commissionDisplayText": "12% Commission on sales",
      "isUnlocked": true,
      "isCurrent": true,
      "totalPerksCount": 14,
      "rewards": [
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win AirPods Pro!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Branded Water Bottle",
          "count": 1,
          "sortPriority": 5
        },
        {
          "type": "gift_card",
          "isRaffle": false,
          "displayText": "$40 Gift Card",
          "count": 2,
          "sortPriority": 6
        },
        {
          "type": "commission_boost",
          "isRaffle": false,
          "displayText": "8% Pay Boost",
          "count": 3,
          "sortPriority": 7
        }
      ]
    },
    {
      "name": "Gold",
      "color": "#F59E0B",
      "tierLevel": 3,
      "minSales": 3000,
      "minSalesFormatted": "3,000 units",
      "salesDisplayText": "3,000+ in units sold",
      "commissionRate": 15,
      "commissionDisplayText": "15% Commission on sales",
      "isUnlocked": false,
      "isCurrent": false,
      "totalPerksCount": 20,
      "rewards": [
        {
          "type": "experience",
          "isRaffle": true,
          "displayText": "Chance to win Mystery Trip!",
          "count": 1,
          "sortPriority": 2
        },
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win Premium Headphones!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Designer Backpack",
          "count": 1,
          "sortPriority": 5
        },
        {
          "type": "gift_card",
          "isRaffle": false,
          "displayText": "$75 Gift Card",
          "count": 4,
          "sortPriority": 6
        }
      ]
    },
    {
      "name": "Platinum",
      "color": "#818CF8",
      "tierLevel": 4,
      "minSales": 5000,
      "minSalesFormatted": "5,000 units",
      "salesDisplayText": "5,000+ in units sold",
      "commissionRate": 20,
      "commissionDisplayText": "20% Commission on sales",
      "isUnlocked": false,
      "isCurrent": false,
      "totalPerksCount": 32,
      "rewards": [
        {
          "type": "physical_gift",
          "isRaffle": true,
          "displayText": "Chance to win MacBook Pro!",
          "count": 1,
          "sortPriority": 1
        },
        {
          "type": "experience",
          "isRaffle": true,
          "displayText": "Chance to win Brand Partner Trip!",
          "count": 1,
          "sortPriority": 2
        },
        {
          "type": "experience",
          "isRaffle": false,
          "displayText": "VIP Event Access",
          "count": 1,
          "sortPriority": 4
        },
        {
          "type": "physical_gift",
          "isRaffle": false,
          "displayText": "Gift Drop: Designer Bag",
          "count": 1,
          "sortPriority": 5
        }
      ]
    }
  ]
}
```

### Business Logic

#### 1. Tier Filtering (User-Scoped Display)
Backend only returns tiers where `tier_level >= user's current tier_level`.

**Example:** If user is Silver (tier_level = 2):
- ✅ Send: Silver (2), Gold (3), Platinum (4)
- ❌ Don't send: Bronze (1)

**Why:** User doesn't need to see tiers they've already surpassed.

#### 2. Expiration Logic
- **tierLevel === 1 (Bronze):** Never expires
  - `expirationDate: null`
  - `showExpiration: false`
  - Frontend hides entire expiration section
- **tierLevel > 1:** 6-month checkpoint renewal
  - `expirationDate: ISO 8601`
  - `showExpiration: true`
  - Frontend shows expiration text + info icon

#### 3. Reward Aggregation
Backend aggregates rewards by type for each tier:

```typescript
// Pseudocode for backend aggregation
function aggregateRewards(tierRewards: Reward[]): AggregatedReward[] {
  const grouped = groupBy(tierRewards, r => `${r.type}_${r.isRaffle}`)

  return Object.entries(grouped).map(([key, rewards]) => {
    const totalUses = sumBy(rewards, r => r.uses)
    const sample = rewards[0]

    return {
      type: sample.type,
      isRaffle: sample.isRaffle,
      displayText: formatDisplayText(sample.type, sample.isRaffle, totalUses, sample),
      sortPriority: getPriority(sample.type, sample.isRaffle)
    }
  })
  .sort((a, b) => a.sortPriority - b.sortPriority)
  .slice(0, 4)  // Max 4 rewards per tier
}
```

#### 4. VIP System Metric Display
The `vipSystem.metric` field controls all sales-related text:

| Metric | Progress Text | Sales Display Text | Format |
|--------|--------------|-------------------|--------|
| `sales_dollars` | `"$680 to go"` | `"$1,000+ in sales"` | Currency with $ symbol |
| `sales_units` | `"680 units to go"` | `"1,000+ in units sold"` | No $ symbol, "units" suffix |

**Backend must:**
- Check `vip_system_settings.metric` from database
- Apply appropriate formatting to ALL numeric fields
- Include metric in response for frontend validation

#### 5. Commission Rate Display
Commission rates are PUBLIC information shown to creators.

**Source:** `tiers.commission_rate` (integer percentage)
**Display:** Backend formats as `"{rate}% Commission on sales"`

#### 6. Total Perks Count Calculation
```typescript
// Pseudocode for backend calculation
function calculateTotalPerks(tier: Tier): number {
  // Sum of all reward uses (monthly rewards count per month)
  const rewardPerks = tier.rewards.reduce((sum, r) => sum + r.uses, 0)

  // Sum of all mission reward uses
  const missionPerks = tier.missions
    .filter(m => m.reward_id !== null)  // Only missions with rewards
    .reduce((sum, m) => sum + (m.uses || 1), 0)

  return rewardPerks + missionPerks
}
```

**Example:**
- 7 rewards: uses = [1, 2, 1, 1, 1, 1, 1] → sum = 8
- 7 missions: each has 1 reward → sum = 7
- **Total perks = 15**

#### 7. Frontend Icon Mapping
Frontend maps `type` to Lucide React icons (backend does NOT send icon names):

| Type | Icon | Component |
|------|------|-----------|
| gift_card | Gift | `<Gift />` |
| commission_boost | HandCoins | `<HandCoins />` |
| spark_ads | Megaphone | `<Megaphone />` |
| discount | BadgePercent | `<BadgePercent />` |
| physical_gift (raffle) | Clover | `<Clover />` |
| experience (raffle) | Clover | `<Clover />` |
| physical_gift | GiftDropIcon | Custom SVG (defined in page) |
| experience | GiftDropIcon | Custom SVG (defined in page) |

---

# Internal/System Endpoints

⚠️ **Security Notice:** These endpoints are internal-only and not accessible from client-side code.

## GET /api/internal/client-config

**Purpose:** Server-side endpoint to fetch client branding configuration for auth pages

**Used By:** `/app/login/layout.tsx` (Server Component only)

**Authentication:** Internal header validation only
- Requires: `x-internal-request: true` header
- Client-side requests will receive 403 Forbidden

### Request

```http
GET /api/internal/client-config
x-internal-request: true
```

### Response Schema

```typescript
interface ClientConfigResponse {
  logoUrl: string           // Supabase Storage URL or fallback path
  privacyPolicyUrl: string  // Path to privacy API route
  clientName: string        // Display name from clients.name
  primaryColor: string      // Hex color from clients.primary_color
}
```

### Example Response

**Success (200 OK):**
```json
{
  "logoUrl": "https://xyz.supabase.co/storage/v1/object/public/client-logos/fizee/logo.png",
  "privacyPolicyUrl": "/api/clients/fizee/privacy",
  "clientName": "Fizee Rewards",
  "primaryColor": "#F59E0B"
}
```

**Forbidden (403):**
```json
{
  "error": "Forbidden - Internal endpoint only"
}
```

### Backend Logic

```sql
-- Query Supabase clients table
SELECT logo_url, name, primary_color
FROM clients
WHERE id = $CLIENT_ID;

-- Construct privacy URL from CLIENT_ID env var
privacyPolicyUrl = `/api/clients/${CLIENT_ID}/privacy`
```

### Caching

- **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=7200`
- **Duration:** 1 hour
- **Revalidation:** 2 hours stale-while-revalidate

### Error Handling

Returns 200 with fallback values if database query fails (to prevent breaking auth flow):

```json
{
  "logoUrl": "/images/fizee-logo.png",
  "privacyPolicyUrl": "/api/clients/fizee/privacy",
  "clientName": "Rewards Program",
  "primaryColor": "#F59E0B"
}
```

### Security

- ✅ Server-side only (Next.js layout component)
- ✅ Header validation prevents client access
- ✅ No sensitive data exposed in response
- ✅ Graceful fallback on error (doesn't break auth)


# Admin Endpoints