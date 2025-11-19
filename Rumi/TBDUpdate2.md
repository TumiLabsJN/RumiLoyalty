# TBDUpdate2: Auth API Contracts Implementation

**Date Created:** 2025-01-18
**Status:** Ready for Implementation
**Priority:** 🔴 CRITICAL - Blocks auth page integration
**Estimated Time:** 2-3 hours for complete auth contract documentation

---

## CONTEXT: What Was Done Before This

### Previous Session Summary

1. ✅ **Updated Loyalty.md** with complete auth flow documentation (+524 lines)
   - Added two-tier access model (Recognized vs Unrecognized creators)
   - Documented 7-page authentication journey with OTP verification
   - Added sample program onboarding flow
   - Updated password reset to handle-based lookup
   - Added Flow 6 (OTP system), visual flowchart, auth pages inventory

2. ✅ **Analyzed auth page implementations** in `/app/login/`:
   - `/login/start/page.tsx` - Handle collection
   - `/login/signup/page.tsx` - Email + password with Terms/Privacy
   - `/login/otp/page.tsx` - 6-digit OTP verification
   - `/login/loading/page.tsx` - Recognition routing hub
   - `/login/welcomeunr/page.tsx` - Unrecognized user welcome
   - `/login/wb/page.tsx` - Returning user login (password only)
   - `/login/forgotpw/page.tsx` - Password reset via magic link

3. ✅ **Read API_CONTRACTS.md** (3,718 lines) - Found auth section is EMPTY:
   - Lines 28-77: All auth endpoints marked "_To be defined_"
   - Other sections are complete (Home, Missions, Rewards)

---

## TASK: Add Auth API Contracts to API_CONTRACTS.md

### What Needs to Be Done

**Add 9 API endpoint contracts** to API_CONTRACTS.md (lines 28-77):

| # | Endpoint | Priority | Page | Current Status |
|---|----------|----------|------|----------------|
| 1 | `POST /api/auth/signup` | 🔴 CRITICAL | `/login/signup` | ❌ Undefined |
| 2 | `POST /api/auth/verify-otp` | 🔴 CRITICAL | `/login/otp` | ❌ Undefined |
| 3 | `POST /api/auth/resend-otp` | 🔴 CRITICAL | `/login/otp` | ❌ Undefined |
| 4 | `POST /api/auth/check-recognition` | 🔴 CRITICAL | `/login/loading` | ❌ Undefined |
| 5 | `POST /api/auth/login` | 🔴 CRITICAL | `/login/wb` | ❌ Undefined |
| 6 | `POST /api/auth/forgot-password` | 🔴 CRITICAL | `/login/forgotpw` | ❌ Undefined |
| 7 | `POST /api/auth/reset-password` | 🔴 CRITICAL | `/auth/reset-password` (not created yet) | ❌ Undefined |
| 8 | `GET /api/clients/{id}/terms` | 🟡 OPTIONAL | `/login/signup` | ❌ Undefined |
| 9 | `GET /api/clients/{id}/privacy` | 🟡 OPTIONAL | `/login/signup` | ❌ Undefined |

---

## DETAILED SPECIFICATIONS FOR EACH ENDPOINT

### 1. POST /api/auth/signup

**Page:** `/app/login/signup/page.tsx` (line 147)

**Request:**
```typescript
{
  handle: string;              // "@creatorpro" (@ will be stripped)
  email: string;               // "creator@example.com"
  password: string;            // Plaintext (will be hashed server-side)
  agreed_to_terms: boolean;    // Must be true
}
```

**Response:**
```typescript
{
  success: boolean;
  otp_sent: boolean;
  session_id?: string;         // For tracking OTP verification
  user_id?: string;
}
```

**Backend Responsibilities:**
1. Validate email format (standard regex)
2. Validate password (minimum 8 characters)
3. Hash password using bcrypt (rounds=10)
4. Create user record with `email_verified: false`
5. Generate 6-digit OTP code (`Math.floor(100000 + Math.random() * 900000)`)
6. Hash OTP with bcrypt, store with 5-minute expiration
7. Send OTP email via Resend/SendGrid
8. Return success with session_id

**Error Cases:**
- Email already exists: `EMAIL_ALREADY_EXISTS`
- Invalid email format: `INVALID_EMAIL`
- Password too short: `PASSWORD_TOO_SHORT`
- Terms not accepted: `TERMS_NOT_ACCEPTED`

---

### 2. POST /api/auth/verify-otp

**Page:** `/app/login/otp/page.tsx` (line 112)

**Request:**
```typescript
{
  otp: string;                 // "123456"
  session_id: string;          // From signup response or cookie
}
```

**Response:**
```typescript
// Success
{
  verified: true;
  user_id: string;
  session_token: string;       // JWT for authenticated session
}

// Error
{
  verified: false;
  error: string;
  attempts_remaining?: number; // 2, 1, 0
}
```

**Backend Responsibilities:**
1. Retrieve OTP record by session_id
2. Check expiration (5 minutes from creation)
3. Check attempts (max 3)
4. Compare submitted code with bcrypt hash
5. If valid:
   - Update `users.email_verified = true`
   - Mark OTP as used
   - Create authenticated session (JWT)
   - Return session token
6. If invalid:
   - Increment attempts counter
   - Return error with remaining attempts

**Error Cases:**
- Invalid/expired OTP: `INVALID_OR_EXPIRED_CODE`
- Too many attempts: `TOO_MANY_ATTEMPTS`
- Session not found: `SESSION_NOT_FOUND`

---

### 3. POST /api/auth/resend-otp

**Page:** `/app/login/otp/page.tsx` (line 137)

**Request:**
```typescript
{
  session_id: string;
}
```

**Response:**
```typescript
{
  sent: boolean;
  rate_limited?: boolean;      // If within 60-second window
}
```

**Backend Responsibilities:**
1. Check rate limit: 1 request per 60 seconds
2. Invalidate old OTP code (mark as used)
3. Generate new 6-digit code
4. Hash and store new OTP with 5-minute expiration
5. Send new email
6. Return success

**Error Cases:**
- Rate limited: `RATE_LIMITED` (with seconds remaining)
- Session not found: `SESSION_NOT_FOUND`

---

### 4. POST /api/auth/check-recognition

**Page:** `/app/login/loading/page.tsx` (lines 20-24)

**Purpose:** Determine if user is "recognized" (has created content) or "unrecognized" (sample program)

**Request:**
```typescript
{
  handle: string;              // "@creatorpro"
  user_id?: string;            // From authenticated session
}
```

**Response:**
```typescript
{
  recognized: boolean;
  has_videos: boolean;
  first_video_date?: string;   // "2024-01-15" if recognized
  user_id?: string;
}
```

**Backend Responsibilities:**
1. Query users table: `WHERE tiktok_handle = '@handle'`
2. Query videos table: `COUNT(*) WHERE user_id = user.id`
3. Determine recognition status:
   - **Recognized:** Has videos AND user exists in database
   - **Unrecognized:** No videos OR not in users table
4. Return status

**Business Logic:**
```sql
-- Recognition criteria
SELECT
  u.id as user_id,
  COUNT(v.id) as video_count,
  MIN(v.post_date) as first_video_date
FROM users u
LEFT JOIN videos v ON v.user_id = u.id
WHERE u.tiktok_handle = '@creatorpro'
GROUP BY u.id;

-- If video_count > 0: recognized = true
-- If video_count = 0: recognized = false
```

---

### 5. POST /api/auth/login

**Page:** `/app/login/wb/page.tsx` (line 66)

**Request:**
```typescript
{
  tiktok_handle: string;       // "@creatorpro"
  password: string;            // Plaintext
}
```

**Response:**
```typescript
// Success
{
  success: true;
  user_id: string;
  session_token: string;       // JWT
}

// Error
{
  success: false;
  error: string;               // "Invalid password"
}
```

**Backend Responsibilities:**
1. Query user by `tiktok_handle`
2. Compare password hash using `bcrypt.compare()`
3. If valid:
   - Create session token (JWT with 30-day expiration)
   - Set session cookie
   - Return success + token
4. If invalid:
   - Return error (do NOT reveal if handle exists)

**Security Notes:**
- Use constant-time comparison for password
- Generic error message: "Invalid credentials" (not "handle doesn't exist" or "wrong password")
- Rate limiting: Max 5 failed attempts per IP per hour

**Error Cases:**
- Invalid credentials: `INVALID_CREDENTIALS`
- Account locked: `ACCOUNT_LOCKED` (after 5 failed attempts)

---

### 6. POST /api/auth/forgot-password

**Page:** `/app/login/forgotpw/page.tsx` (line 62)

**Request:**
```typescript
{
  tiktok_handle: string;       // "@creatorpro"
}
```

**Response:**
```typescript
{
  success: boolean;
  email_hint: string;          // "cr****@example.com"
}
```

**Backend Responsibilities:**
1. Look up user by `tiktok_handle`
2. Retrieve `users.email`
3. Generate JWT token:
   ```typescript
   const token = jwt.sign(
     { user_id, type: "password_reset", exp: Math.floor(Date.now() / 1000) + (15 * 60) },
     process.env.JWT_SECRET
   )
   ```
4. Create magic link: `https://app.com/auth/reset-password?token=xyz`
5. Send email with magic link (expires in 15 minutes)
6. Store token hash in `password_resets` table:
   ```sql
   INSERT INTO password_resets (user_id, token_hash, expires_at, used)
   VALUES ($userId, $tokenHash, NOW() + INTERVAL '15 minutes', false);
   ```
7. Mask email for response: `"cr****@example.com"`
8. Return masked email

**Email Template:**
```
Subject: Reset Your Password - {Client Name}

Hi @creatorpro,

Click the button below to reset your password:

[Reset Password Button] → Magic link with token

This link expires in 15 minutes.

If you didn't request this, ignore this email.
```

**Error Cases:**
- Handle not found: Still return success (security - don't reveal user existence)
- Rate limited: `RATE_LIMITED` (max 3 requests per hour per handle)

---

### 7. POST /api/auth/reset-password

**Page:** `/auth/reset-password` (TO BE CREATED)

**Request:**
```typescript
{
  token: string;               // "eyJhbGciOiJIUzI1NiIsInR5..."
  new_password: string;        // Plaintext
}
```

**Response:**
```typescript
// Success
{
  success: true;
  session_token: string;       // Auto-login after reset
}

// Error
{
  success: false;
  error: string;               // "Link expired or invalid"
}
```

**Backend Responsibilities:**
1. Verify JWT signature and decode
2. Check expiration (within 15 minutes)
3. Query `password_resets` table:
   ```sql
   SELECT * FROM password_resets
   WHERE user_id = $userId
     AND token_hash = $tokenHash
     AND used = false
     AND expires_at > NOW();
   ```
4. If valid:
   - Hash new password (bcrypt)
   - Update `users.password`
   - Mark token as used: `UPDATE password_resets SET used = true WHERE id = $id`
   - Create authenticated session
   - Return session token (auto-login)
5. If invalid:
   - Return error

**Error Cases:**
- Invalid/expired token: `INVALID_OR_EXPIRED_TOKEN`
- Token already used: `TOKEN_ALREADY_USED`
- Password too short: `PASSWORD_TOO_SHORT`

---

### 8. GET /api/clients/{client_id}/terms

**Page:** `/app/login/signup/page.tsx` (line 94)

**Request:** None (client_id from URL)

**Response:**
```typescript
{
  content: string;             // HTML content
  last_updated: string;        // "2024-11-18T00:00:00Z"
}
```

**Backend:** Fetch from `clients.terms_of_service` field (or separate `legal_documents` table)

---

### 9. GET /api/clients/{client_id}/privacy

**Page:** `/app/login/signup/page.tsx` (line 116)

**Request:** None (client_id from URL)

**Response:**
```typescript
{
  content: string;             // HTML content
  last_updated: string;        // "2024-11-18T00:00:00Z"
}
```

**Backend:** Fetch from `clients.privacy_policy` field

---

## STYLE GUIDE: Match Existing API_CONTRACTS.md Format

### Section Structure Template

```markdown
## POST /api/auth/signup

**Purpose:** [One-line description]

**Page:** `/app/login/signup/page.tsx`

### Request

\`\`\`http
POST /api/auth/signup
Content-Type: application/json
\`\`\`

### Request Body Schema

\`\`\`typescript
interface SignupRequest {
  handle: string
  email: string
  password: string
  agreed_to_terms: boolean
}
\`\`\`

### Response Schema

\`\`\`typescript
interface SignupResponse {
  success: boolean
  otp_sent: boolean
  session_id?: string
}
\`\`\`

### Example Request

\`\`\`json
{
  "handle": "creatorpro",
  "email": "creator@example.com",
  "password": "securePassword123",
  "agreed_to_terms": true
}
\`\`\`

### Example Response

**Success:**
\`\`\`json
{
  "success": true,
  "otp_sent": true,
  "session_id": "session-abc-123"
}
\`\`\`

### Business Logic

[Detailed backend implementation steps]

### Error Responses

**400 Bad Request - Email Already Exists:**
\`\`\`json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "An account with this email already exists"
}
\`\`\`

---
```

**Key Formatting Notes:**
- Use TypeScript interfaces (not inline objects)
- Provide both request AND response examples (JSON)
- Include business logic section with SQL/pseudo-code
- Document ALL error cases with exact error codes
- Use snake_case for request/response fields (database convention)
- Add `---` separator between endpoints

---

## FILE LOCATIONS REFERENCE

### Auth Pages (Implementation)
```
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/start/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/signup/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/otp/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/loading/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/wb/page.tsx
/home/jorge/Loyalty/Rumi/App Code/V1/app/login/forgotpw/page.tsx
```

### Documentation Files
```
/home/jorge/Loyalty/Rumi/API_CONTRACTS.md          (Lines 28-77 need updates)
/home/jorge/Loyalty/Rumi/Loyalty.md                (Auth flows: lines 1037-1053, 2245-2904)
/home/jorge/Loyalty/Rumi/SchemaFinalv2.md          (Database schema reference)
```

---

## DATABASE TABLES INVOLVED

### Primary Tables
- `users` - User accounts (tiktok_handle, email, password_hash, email_verified)
- `clients` - Client configuration (for terms/privacy fetching)

### Auth-Specific Tables (May Need Creation)
- `otp_codes` - OTP verification tracking
  ```sql
  CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    code_hash VARCHAR(255),
    expires_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- `password_resets` - Magic link token tracking
  ```sql
  CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255),
    expires_at TIMESTAMP,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

---

## SECURITY REQUIREMENTS

### Password Handling
- ✅ Hash with bcrypt (rounds=10 minimum)
- ✅ Never store plaintext passwords
- ✅ Validate minimum 8 characters
- ✅ Use constant-time comparison

### OTP Security
- ✅ 6-digit random code
- ✅ Hash before storing (bcrypt)
- ✅ 5-minute expiration
- ✅ Max 3 verification attempts
- ✅ Rate limit resends (1 per 60 seconds)

### Token Security (Password Reset)
- ✅ JWT with 15-minute expiration
- ✅ One-time use (mark as used after reset)
- ✅ Store hash, not plaintext token
- ✅ Invalidate old tokens when new requested

### Rate Limiting
- Login: Max 5 failed attempts per IP per hour
- Password reset: Max 3 requests per hour per handle
- OTP resend: Max 1 request per 60 seconds per session

---

## IMPLEMENTATION CHECKLIST

**When adding to API_CONTRACTS.md:**

- [ ] Replace "_To be defined_" placeholders (lines 28-77)
- [ ] Add each endpoint with full documentation
- [ ] Include TypeScript interfaces for request/response
- [ ] Provide JSON examples for each endpoint
- [ ] Document business logic with SQL/pseudo-code
- [ ] List ALL error cases with error codes
- [ ] Match existing formatting style (see Home/Missions/Rewards sections)
- [ ] Add note about database tables that need creation (otp_codes, password_resets)
- [ ] Update document version number at bottom
- [ ] Update changelog at bottom

**Optional Enhancements:**
- [ ] Add sequence diagrams for auth flows
- [ ] Create separate AUTH_FLOWS.md with visual diagrams
- [ ] Add security checklist section
- [ ] Document session management (JWT payload structure)

---

## RECOMMENDED APPROACH

**Step-by-step implementation:**

1. **Start with Login/Signup** (most critical):
   - `POST /api/auth/signup`
   - `POST /api/auth/verify-otp`
   - `POST /api/auth/resend-otp`

2. **Add Returning User Flow**:
   - `POST /api/auth/login`
   - `POST /api/auth/check-recognition`

3. **Add Password Reset**:
   - `POST /api/auth/forgot-password`
   - `POST /api/auth/reset-password`

4. **Add Optional Endpoints**:
   - `GET /api/clients/{id}/terms`
   - `GET /api/clients/{id}/privacy`

**Estimated Time:**
- Critical endpoints (1-5): 1.5 hours
- Password reset (6-7): 30 minutes
- Optional endpoints (8-9): 15 minutes
- Review & formatting: 15 minutes
- **Total: ~2.5 hours**

---

## SUCCESS CRITERIA

✅ **Complete when:**
1. All 9 endpoints documented in API_CONTRACTS.md
2. "_To be defined_" placeholders removed (lines 28-77)
3. Each endpoint has:
   - Request/response TypeScript interfaces
   - JSON examples
   - Business logic explanation
   - Error case documentation
4. Style matches existing API_CONTRACTS.md format
5. Document version updated at bottom

---

## NOTES FOR FUTURE LLM

**Context You'll Need:**
- This builds on previous auth flow documentation in Loyalty.md (lines 2245-2904)
- Auth pages already exist and are functional (see File Locations above)
- API_CONTRACTS.md exists and has excellent examples (see Home/Missions/Rewards sections)
- Follow the existing pattern: TypeScript interfaces → JSON examples → Business Logic → Errors

**What NOT to do:**
- Don't change existing API_CONTRACTS.md sections (Home, Missions, Rewards are complete)
- Don't implement backend code (this is contract documentation only)
- Don't create new auth pages (they already exist)

**What TO do:**
- Fill in the authentication section (lines 28-77) with complete endpoint documentation
- Match the style/format of existing sections (use them as templates)
- Include ALL details from this TBDUpdate2.md document

Good luck, future me! 🚀
