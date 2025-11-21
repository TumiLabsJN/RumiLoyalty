# PASSWORD RECOVERY PAGES FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** Password Recovery Flow (Forgot Password + Reset Password)
**Created:** 2025-01-20
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/forgotpw/page.tsx` (237 lines)
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/resetpw/page.tsx` (365 lines)

**API Endpoints:**
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

**Estimated Effort:** ~3-4 hours (both pages combined)
**Execution Strategy:** Document APIs → Execute both pages → Verify together

---

## CONTEXT

### File Locations
- **Forgot Password Page:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/forgotpw/page.tsx`
- **Reset Password Page:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/resetpw/page.tsx`
- **Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`
- **API Contracts:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`

### Dependencies
- Next.js 14.2.18 (App Router)
- React 18.3.1
- TypeScript 5.x
- Lucide React (icons: Loader2, CheckCircle2, Eye, EyeOff, AlertCircle)

### Password Recovery Flow
```
User forgets password
  ↓
/login/forgotpw - Enter identifier (handle or email)
  ↓ POST /api/auth/forgot-password
  ↓ Backend: Generate token, send email
  ↓ Response: { sent: true, emailHint: "cr****@example.com" }
  ↓
Email received with reset link
  ↓ Link: /login/resetpw?token=abc123xyz
  ↓
/login/resetpw - Enter new password
  ↓ POST /api/auth/reset-password
  ↓ Backend: Verify token, update password_hash
  ↓ Response: { success: true, message: "Password updated successfully" }
  ↓
Redirect to /login/wb (login page)
```

---

## CURRENT STATE ANALYSIS

### Forgot Password Page (`/login/forgotpw/page.tsx`)

**What Exists:**
- ✅ Two-state component (request state + success state)
- ✅ Loading modal during send
- ✅ Success state with email hint display
- ✅ Resend functionality
- ✅ Back to sign in link

**What's Wrong:**
- ❌ **Line 38:** Hardcoded handle: `"@creatorpro"` (should get from sessionStorage or user input)
- ❌ **Line 42:** Hardcoded email: `"creator@example.com"` (should come from backend)
- ❌ **Line 46:** Hardcoded emailHint: `"cr****@example.com"` (should come from backend)
- ❌ **Lines 48-49:** Hardcoded branding (should use ENV vars)
- ❌ **Lines 55-110:** No actual API call (mock setTimeout)
- ❌ **Lines 60-95:** TODO comments show wrong field names (tiktok_handle, session_id - snake_case)
- ❌ **Line 108:** Alert for errors (should use inline error display)
- ❌ **No TypeScript interfaces imported**
- ❌ **No error state management** (uses alert)

**Key Issues:**
```typescript
// Line 38: Mock data
const handle = "@creatorpro" // ← Should be from sessionStorage OR user input
const email = "creator@example.com" // ← Should come from backend
const emailHint = "cr****@example.com" // ← Should come from backend response

// Line 62: TODO shows wrong approach
// Backend endpoint: POST /api/auth/forgot-password
// Request body: { tiktok_handle: handle, session_id: "from_cookie" }
// ❌ Wrong: Should be { identifier: email_or_handle }
```

### Reset Password Page (`/login/resetpw/page.tsx`)

**What Exists:**
- ✅ Token extraction from URL (?token=xyz)
- ✅ Token validation on mount
- ✅ Three states: validating, invalid token, create password form
- ✅ Password strength validation
- ✅ Password confirmation match validation
- ✅ Show/hide password toggle
- ✅ Loading states

**What's Wrong:**
- ❌ **Lines 42-43:** Hardcoded branding (should use ENV vars)
- ❌ **Lines 59-95:** No actual token validation API call (mock setTimeout)
- ❌ **Lines 138-173:** No actual reset password API call (mock setTimeout)
- ❌ **Lines 60-79:** TODO comments show wrong field names (user_id, used_at - snake_case)
- ❌ **Line 143:** Comment shows snake_case: `new_password` (should be `newPassword`)
- ❌ **Line 105:** Client-side password validation (backend should also validate)
- ❌ **No TypeScript interfaces imported**

**Key Issues:**
```typescript
// Line 59: TODO shows GET endpoint (unnecessary)
// Backend endpoint: GET /api/auth/validate-reset-token?token=xyz
// ❌ Wrong: Token validation should happen in POST /api/auth/reset-password

// Line 143: TODO shows wrong field name
// Request body: { token: token, new_password: newPassword }
// ❌ Wrong: Should be { token, newPassword } (camelCase)
```

---

## API CONTRACTS - TO BE DOCUMENTED

### 1. POST /api/auth/forgot-password

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
| expiresIn | number | Minutes until token expires (e.g., 15) |

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

-- 3. If user found, generate secure token (crypto.randomBytes(32))
-- Token format: URL-safe base64 string (44 chars)

-- 4. Hash token with bcrypt before storing
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, NOW() + INTERVAL '15 minutes');

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
-- "creator@example.com" → "cr****@example.com"
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_IDENTIFIER | Please provide an email or handle. | identifier missing |
| 400 | INVALID_IDENTIFIER | Please provide a valid email or handle. | identifier format invalid |
| 429 | TOO_MANY_REQUESTS | Too many reset requests. Please try again in 1 hour. | More than 3 requests in 1 hour |
| 500 | EMAIL_SEND_FAILED | Failed to send reset email. Please try again. | Email service error |

**Security Notes:**
- Always return success even if user not found (prevent enumeration attacks)
- Rate limit: Max 3 requests per hour per identifier
- Token stored as bcrypt hash (not plaintext)
- Token valid for 15 minutes only
- One-time use only (marked as used after successful reset)

**Database Tables Used:**
- `users` (lookup by email or handle)
- `password_reset_tokens` (store token hash, expiration)

---

### 2. POST /api/auth/reset-password

**Purpose:** Verify reset token and update user's password

**Route:** `POST /api/auth/reset-password`

**Authentication:** None required (token provides authentication)

**Request Body:**

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| token | string | ✅ Yes | 44-char URL-safe base64 | Reset token from email link |
| newPassword | string | ✅ Yes | 8-128 chars | New plaintext password |

**TypeScript Interface:**
```typescript
export interface ResetPasswordRequest {
  token: string       // From URL query parameter (?token=xyz)
  newPassword: string // New plaintext password (8-128 chars)
}
```

**Example Request:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
  "newPassword": "NewSecureP@ss123"
}
```

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Password updated successfully (always true on 200) |
| message | string | Success message for display |

**TypeScript Interface:**
```typescript
export interface ResetPasswordResponse {
  success: boolean
  message: string  // "Password updated successfully"
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
SELECT user_id, created_at, used_at
FROM password_reset_tokens
WHERE token_hash = $1  -- bcrypt compare
LIMIT 1;

-- 2. Validate token
-- - Check exists
-- - Check not expired (created_at + 15 minutes > NOW())
-- - Check not used (used_at IS NULL)

-- 3. Validate new password
-- - Length: 8-128 characters
-- - (Optional) Strength: uppercase, lowercase, number, special char
-- - Not in common passwords list

-- 4. Hash new password with bcrypt (rounds=10)
UPDATE users
SET password_hash = $1, updated_at = NOW()
WHERE id = $2;

-- 5. Mark token as used (prevent reuse)
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE token_hash = $1;

-- 6. Invalidate all user sessions (force re-login)
DELETE FROM user_sessions WHERE user_id = $1;

-- 7. (Optional) Send confirmation email
-- "Your password was changed on [date] at [time]"
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_FIELDS | Please provide token and new password. | Missing fields |
| 400 | INVALID_TOKEN | Invalid or expired reset link. Please request a new one. | Token not found/expired/used |
| 400 | WEAK_PASSWORD | Password must be at least 8 characters. | Password too short |
| 500 | UPDATE_FAILED | Failed to update password. Please try again. | Database error |

**Security Notes:**
- Token validated for expiration (15 minutes)
- Token can only be used once (used_at timestamp)
- Password hashed with bcrypt (rounds=10)
- All user sessions invalidated after reset (force re-login)
- Confirmation email sent to alert user of password change

**Database Tables Used:**
- `password_reset_tokens` (validate token)
- `users` (update password_hash)
- `user_sessions` (invalidate sessions)

---

## FIELD MAPPING TABLES

### Forgot Password Page - Field Mapping

| Current Frontend | API Contract | Type | Notes |
|-----------------|--------------|------|-------|
| `handle` (mock, line 38) | N/A | N/A | REMOVE: Not needed, user provides identifier |
| `email` (mock, line 42) | `identifier` | `string` | CHANGE: User inputs email OR handle |
| `emailHint` (mock, line 46) | `emailHint` | `string` | FROM BACKEND: Backend provides masked email |
| `tiktok_handle` (TODO comment) | `identifier` | `string` | FIX: Wrong field name |
| `session_id` (TODO comment) | N/A | N/A | REMOVE: Not needed |
| N/A | `sent` | `boolean` | ADD: Backend response field |
| N/A | `expiresIn` | `number` | ADD: Backend response field (15) |

**Key Changes:**
```typescript
// BEFORE (lines 60-95 TODO):
// Request: { tiktok_handle: handle, session_id: "from_cookie" }
// Response: { success: true, email_hint: "cr****@example.com" }

// AFTER:
// Request: { identifier: "creator@example.com" } OR { identifier: "@creatorpro" }
// Response: { sent: true, emailHint: "cr****@example.com", expiresIn: 15 }
```

### Reset Password Page - Field Mapping

| Current Frontend | API Contract | Type | Notes |
|-----------------|--------------|------|-------|
| `token` (from URL) | `token` | `string` | ✅ Correct - from searchParams |
| `newPassword` | `newPassword` | `string` | ✅ Correct field name |
| `new_password` (TODO comment) | `newPassword` | `string` | FIX: snake_case → camelCase |
| `user_id` (TODO comment) | N/A | N/A | REMOVE: Backend internal |
| N/A | `success` | `boolean` | ADD: Backend response field |
| N/A | `message` | `string` | ADD: Backend response field |

**Key Changes:**
```typescript
// BEFORE (lines 138-158 TODO):
// Request: { token: token, new_password: newPassword }
// Response: { success: true, message: "Password reset successfully" }

// AFTER:
// Request: { token: "abc123xyz", newPassword: "NewSecureP@ss123" }
// Response: { success: true, message: "Password updated successfully. You can now log in with your new password." }
```

---

## IMPLEMENTATION PLAN - 7 PHASES (BOTH PAGES)

### Phase 1: Create Type Definitions

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`

**Action:** Add 4 new interfaces for password recovery

**Changes:**
```typescript
// Add after OnboardingInfoResponse (around line 196)

// ============================================================================
// POST /api/auth/forgot-password
// ============================================================================

/**
 * Request body for forgot password (Forgot Password page)
 * User provides email OR handle to receive password reset link
 */
export interface ForgotPasswordRequest {
  identifier: string  // Email OR TikTok handle (user can provide either)
}

/**
 * Response from forgot password endpoint
 * Provides masked email confirmation and expiration time
 */
export interface ForgotPasswordResponse {
  sent: boolean       // Email sent successfully
  emailHint: string   // Masked email "cr****@example.com"
  expiresIn: number   // Minutes until token expires (15)
}

// ============================================================================
// POST /api/auth/reset-password
// ============================================================================

/**
 * Request body for reset password (Reset Password page)
 * Token from email link + new password
 */
export interface ResetPasswordRequest {
  token: string       // Reset token from URL query parameter
  newPassword: string // New plaintext password (8-128 chars, validated server-side)
}

/**
 * Response from reset password endpoint
 * Confirms successful password update
 */
export interface ResetPasswordResponse {
  success: boolean
  message: string  // Success message: "Password updated successfully..."
}
```

**Verification:**
- ✅ All field names are camelCase (not snake_case)
- ✅ Clear JSDoc comments
- ✅ Matches API contract exactly
- ✅ 4 new interfaces added

---

### Phase 2: Replace Mock Data with Dynamic Data

#### Forgot Password Page Changes:

**Replace hardcoded branding (lines 48-49):**
```typescript
// BEFORE:
const logoUrl = "/images/fizee-logo.png"
const privacyPolicyUrl = "/privacy-policy"

// AFTER:
const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"
```

**Add user input for identifier (replace mock handle/email):**
```typescript
// BEFORE (lines 38-46):
const handle = "@creatorpro"
const email = "creator@example.com"
const emailHint = "cr****@example.com"

// AFTER:
// Add state for user input
const [identifier, setIdentifier] = useState<string>("")
const [emailHint, setEmailHint] = useState<string>("")
const [error, setError] = useState<string>("")

// Remove mock handle and email (no longer needed)
// emailHint will come from backend response
```

**Add input field in UI (after line 196):**
```typescript
// Add before "Send Reset Link" button:
<div className="mb-6">
  <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-2">
    Email or Handle
  </label>
  <Input
    id="identifier"
    type="text"
    placeholder="Enter your email or @handle"
    value={identifier}
    onChange={(e) => {
      setIdentifier(e.target.value)
      if (error) setError("") // Clear error when typing
    }}
    className={error ? "border-red-500" : ""}
  />
</div>
```

**Update button disabled state:**
```typescript
// BEFORE (line 207):
<Button onClick={handleSendResetLink} ... >

// AFTER:
<Button
  onClick={handleSendResetLink}
  disabled={!identifier.trim() || isSending}
  ...
>
```

**Update success message display (line 154):**
```typescript
// BEFORE:
<span className="font-medium text-slate-900">{emailHint}</span>

// AFTER: (emailHint now comes from state, set by API response)
<span className="font-medium text-slate-900">{emailHint}</span>
```

#### Reset Password Page Changes:

**Replace hardcoded branding (lines 42-43):**
```typescript
// BEFORE:
const logoUrl = "/images/fizee-logo.png"
const privacyPolicyUrl = "/privacy-policy"

// AFTER:
const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"
```

**No other mock data changes needed** (token already from URL, passwords from user input)

---

### Phase 3: Integrate API Calls

#### Forgot Password Page - API Integration:

**Import types (add to top):**
```typescript
// After existing imports:
import type { ForgotPasswordRequest, ForgotPasswordResponse, AuthErrorResponse } from "@/types/auth"
```

**Replace handleSendResetLink function (lines 55-110):**
```typescript
const handleSendResetLink = async () => {
  // Validation
  if (!identifier.trim()) {
    setError("Please enter your email or handle")
    return
  }

  setIsSending(true)
  setError("")

  try {
    // API call: POST /api/auth/forgot-password
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim() } satisfies ForgotPasswordRequest)
    })

    if (!response.ok) {
      const errorData = (await response.json()) as AuthErrorResponse
      throw new Error(errorData.message || 'Failed to send reset link')
    }

    const data = (await response.json()) as ForgotPasswordResponse

    // Success - store email hint and show success state
    setEmailHint(data.emailHint)
    setEmailSent(true)

  } catch (err) {
    console.error('Forgot password failed:', err)
    setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  } finally {
    setIsSending(false)
  }
}
```

**Update resend functionality (lines 116-122):**
```typescript
const handleResend = () => {
  // Reset state and send again
  setEmailSent(false)
  setError("")
  handleSendResetLink()
}
```

#### Reset Password Page - API Integration:

**Import types (add to top):**
```typescript
// After existing imports:
import type { ResetPasswordRequest, ResetPasswordResponse, AuthErrorResponse } from "@/types/auth"
```

**Remove token validation useEffect** (lines 49-98):
```typescript
// BEFORE: Separate token validation API call with loading state
// AFTER: Simple check if token exists in URL (backend validates on submit)

// Remove the entire validateToken async function (lines 50-95)
// Remove setTimeout mock (line 82)
// Remove TODO comments about GET /api/auth/validate-reset-token
```

**Simplify token check to client-side only (replace lines 49-98):**
```typescript
useEffect(() => {
  // Simple check: does token exist in URL?
  // Backend will validate token when user submits form (security best practice)
  if (!token) {
    setErrorMessage("Invalid or missing reset token. Please request a new reset link.")
    setTokenValid(false)
  } else {
    // Token exists in URL, show form
    // Don't validate yet (anti-enumeration: don't leak if token is valid/expired)
    setTokenValid(true)
  }
  setIsValidatingToken(false)
}, [token])
```

**Why this is safe:**
- ✅ Backend validates token on submit (expiration, one-time use, existence)
- ✅ Anti-enumeration: Attackers can't probe if token is valid before submitting
- ✅ Better UX: No loading delay, form shows immediately
- ✅ Industry standard: GitHub, Google, Auth0 all use this approach
```

**Replace handleResetPassword function (lines 118-173):**
```typescript
const handleResetPassword = async () => {
  // Clear previous errors
  setErrorMessage("")

  // Validate password strength (frontend validation)
  const strengthError = validatePasswordStrength(newPassword)
  if (strengthError) {
    setErrorMessage(strengthError)
    return
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    setErrorMessage("Passwords do not match")
    return
  }

  if (!token) {
    setErrorMessage("Invalid reset token")
    return
  }

  setIsSubmitting(true)

  try {
    // API call: POST /api/auth/reset-password
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        newPassword
      } satisfies ResetPasswordRequest)
    })

    if (!response.ok) {
      const errorData = (await response.json()) as AuthErrorResponse
      throw new Error(errorData.message || 'Failed to reset password')
    }

    const data = (await response.json()) as ResetPasswordResponse

    // Success - redirect to login with success message
    console.log('Password reset successful:', data.message)
    window.location.href = "/login/wb?reset=success"

  } catch (err) {
    console.error('Reset password failed:', err)
    setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
```

---

### Phase 4: N/A - Resend Functionality

**Forgot Password Page:** Resend functionality already exists (line 116-122), updated in Phase 3

**Reset Password Page:** No resend functionality needed

---

### Phase 5: Remove Client-Side Business Logic

#### Forgot Password Page:

**Analysis:**
- ✅ No client-side business logic present
- ✅ No email masking (backend does this)
- ✅ No sorting, filtering, calculations

#### Reset Password Page:

**Keep client-side validation** (lines 104-112):
```typescript
const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters"
  }
  return null
}
```
✅ **This is UI validation only** - backend ALSO validates (defense in depth)

**Analysis:**
- ✅ Password strength check is UI-only (backend also validates)
- ✅ Password match check is UI-only (prevents bad UX)
- ✅ No token validation in frontend (backend does this)

---

### Phase 6: Update Error Display

#### Forgot Password Page:

**Add error display in form (after identifier input):**
```typescript
{/* Error Message */}
{error && (
  <div className="mb-4 flex items-center gap-2 text-red-600">
    <AlertCircle className="h-4 w-4 flex-shrink-0" />
    <p className="text-sm">{error}</p>
  </div>
)}
```

**Remove alert (line 108):**
```typescript
// BEFORE:
alert("Failed to send reset link. Please try again.")

// AFTER: (handled in catch block with setError)
```

**Update input border on error:**
```typescript
<Input
  ...
  className={error ? "border-red-500" : ""}
/>
```

#### Reset Password Page:

**Error display already exists** (lines 328-333):
```typescript
{errorMessage && (
  <div className="mb-6 flex items-center gap-2 text-red-600">
    <AlertCircle className="h-4 w-4 flex-shrink-0" />
    <p className="text-sm">{errorMessage}</p>
  </div>
)}
```
✅ Already correct

---

### Phase 7: Verify Password Manager Support

#### Forgot Password Page:

**No password manager support needed** (no password input, just email/handle)

#### Reset Password Page:

**Check password fields (lines 272-325):**

**New Password field:**
```typescript
<Input
  id="new-password"
  name="new-password"       // ✅ Has name attribute
  type={showNewPassword ? "text" : "password"}
  autoComplete="new-password"  // ✅ Has autocomplete
  value={newPassword}
  onChange={(e) => setNewPassword(e.target.value)}
  placeholder="Enter new password"
  className="w-full pr-10"
/>
```
✅ Correct

**Confirm Password field:**
```typescript
<Input
  id="confirm-password"
  name="confirm-password"   // ✅ Has name attribute
  type={showConfirmPassword ? "text" : "password"}
  autoComplete="new-password"  // ✅ Has autocomplete
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  placeholder="Confirm new password"
  className="w-full pr-10"
/>
```
✅ Correct

**Verification:**
- ✅ Both fields have name attributes
- ✅ Both fields have autoComplete="new-password"
- ✅ Browser will offer to save new password
- ✅ No form wrapper needed (not a login form)

---

## API CONTRACTS DOCUMENTATION

### Location in API_CONTRACTS.md

**Insert after "Welcome Unrecognized" section** (after line 1453)

**Section to add:**

```markdown
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

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| sent | boolean | Email sent successfully (always true on 200) |
| emailHint | string | Masked email for confirmation (e.g., "cr****@example.com") |
| expiresIn | number | Minutes until token expires (15) |

**TypeScript Interface:**
```typescript
export interface ForgotPasswordResponse {
  sent: boolean
  emailHint: string
  expiresIn: number
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

-- 3. If user found, generate secure token
-- Token: crypto.randomBytes(32).toString('base64url') (44 chars)

-- 4. Hash token with bcrypt before storing
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, NOW() + INTERVAL '15 minutes');

-- 5. Send email via SendGrid/AWS SES
-- Link: https://app.com/login/resetpw?token={token}

-- 6. Mask email for response
-- "creator@example.com" → "cr****@example.com"
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_IDENTIFIER | Please provide an email or handle. | identifier missing |
| 400 | INVALID_IDENTIFIER | Please provide a valid email or handle. | identifier format invalid |
| 429 | TOO_MANY_REQUESTS | Too many reset requests. Please try again in 1 hour. | More than 3 requests in 1 hour |
| 500 | EMAIL_SEND_FAILED | Failed to send reset email. Please try again. | Email service error |

**Security Notes:**
- Always return success even if user not found (prevent enumeration)
- Rate limit: Max 3 requests per hour per identifier
- Token stored as bcrypt hash (not plaintext)
- Token valid for 15 minutes
- One-time use only

**Database Tables Used:**
- `users` (lookup by email or handle)
- `password_reset_tokens` (store token hash, expiration)

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
| token | string | ✅ Yes | 44-char base64url | Reset token from email link |
| newPassword | string | ✅ Yes | 8-128 chars | New plaintext password |

**TypeScript Interface:**
```typescript
export interface ResetPasswordRequest {
  token: string
  newPassword: string
}
```

**Example Request:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
  "newPassword": "NewSecureP@ss123"
}
```

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Password updated successfully |
| message | string | Success message for display |

**TypeScript Interface:**
```typescript
export interface ResetPasswordResponse {
  success: boolean
  message: string
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
-- 1. Find and validate token
SELECT user_id, created_at, used_at
FROM password_reset_tokens
WHERE token_hash = $1  -- bcrypt compare
AND expires_at > NOW()
AND used_at IS NULL
LIMIT 1;

-- 2. Validate new password (8-128 chars)

-- 3. Hash new password with bcrypt (rounds=10)
UPDATE users
SET password_hash = $1, updated_at = NOW()
WHERE id = $2;

-- 4. Mark token as used
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE token_hash = $1;

-- 5. Invalidate all user sessions (force re-login)
DELETE FROM user_sessions WHERE user_id = $1;
```

**Error Responses:**

| Status | Error Code | Message | When |
|--------|-----------|---------|------|
| 400 | MISSING_FIELDS | Please provide token and new password. | Missing fields |
| 400 | INVALID_TOKEN | Invalid or expired reset link. Please request a new one. | Token invalid/expired/used |
| 400 | WEAK_PASSWORD | Password must be at least 8 characters. | Password too short |
| 500 | UPDATE_FAILED | Failed to update password. Please try again. | Database error |

**Security Notes:**
- Token validated for expiration (15 minutes)
- Token can only be used once (used_at timestamp)
- Password hashed with bcrypt (rounds=10)
- All user sessions invalidated after reset
- Confirmation email sent to alert user

**Database Tables Used:**
- `password_reset_tokens` (validate token)
- `users` (update password_hash)
- `user_sessions` (invalidate sessions)

---
```

---

## VERIFICATION CHECKLIST

### TypeScript Compilation
```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "(login/forgotpw|login/resetpw|types/auth)"
# Expected: No errors in these files
```

### Build Success
```bash
npm run build
# Expected: Both pages compile successfully
```

### Runtime Checks - Forgot Password
- [ ] User can input email or handle
- [ ] Identifier input has proper validation
- [ ] Loading modal shows during send
- [ ] Success state shows masked email from backend
- [ ] Resend functionality works
- [ ] Error messages display inline
- [ ] Back to sign in link works

### Runtime Checks - Reset Password
- [ ] Token extracted from URL (?token=xyz)
- [ ] Invalid token shows error state
- [ ] Password fields have show/hide toggle
- [ ] Password match validation works
- [ ] Loading state shows during submit
- [ ] Success redirects to login page
- [ ] Error messages display inline

### API Contract Alignment
**Forgot Password:**
- [ ] Request: { identifier: string }
- [ ] Response: { sent: boolean, emailHint: string, expiresIn: number }
- [ ] All camelCase (no snake_case)
- [ ] Type-safe with interfaces

**Reset Password:**
- [ ] Request: { token: string, newPassword: string }
- [ ] Response: { success: boolean, message: string }
- [ ] All camelCase (no snake_case)
- [ ] Type-safe with interfaces

---

## SUCCESS CRITERIA

1. [ ] API contracts documented in `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
2. [ ] 4 TypeScript interfaces added to `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`
3. [ ] Forgot Password page fully migrated (all 7 phases)
4. [ ] Reset Password page fully migrated (all 7 phases)
5. [ ] Build succeeds (no errors in either page)
6. [ ] ENV vars used for logo/privacy URLs
7. [ ] Backend error messages displayed (not hardcoded)
8. [ ] All field names are camelCase
9. [ ] Type-safe with satisfies and as keywords
10. [ ] Ready for backend deployment (zero frontend changes needed)

---

## AUTH FLOW INTEGRATION

```
User forgets password
  ↓
/login/forgotpw ← NEW (TO BE IMPLEMENTED)
  ↓ POST /api/auth/forgot-password ← NEW
  ↓ Backend: Generate token, send email
  ↓ Success: { sent: true, emailHint: "cr****@example.com" }
  ↓
Email received with reset link
  ↓ Link: /login/resetpw?token=abc123xyz
  ↓
/login/resetpw ← NEW (TO BE IMPLEMENTED)
  ↓ POST /api/auth/reset-password ← NEW
  ↓ Backend: Verify token, update password_hash
  ↓ Success: { success: true, message: "Password updated successfully" }
  ↓
Redirect to /login/wb (login page)
  ↓ POST /api/auth/login ✅ (already implemented)
  ↓
/login/loading ✅ (already implemented)
  ↓
/home (authenticated)
```

---

## NEXT STEPS AFTER COMPLETION

**All 8 auth pages will be complete:**
1. ✅ /login/start - Check handle
2. ✅ /login/signup - Signup
3. ✅ /login/otp - OTP verification
4. ✅ /login/wb - Welcome Back / Login
5. ✅ /login/loading - Post-auth routing
6. ✅ /login/welcomeunr - Welcome Unrecognized
7. 🔲 /login/forgotpw - Forgot Password (TO BE IMPLEMENTED)
8. 🔲 /login/resetpw - Reset Password (TO BE IMPLEMENTED)

**100% auth coverage achieved! 🎉**

---

## NOTES

- Combined guide saves ~15-20k tokens vs separate guides
- Token validation happens in reset endpoint (no separate validation endpoint)
- Frontend validation is UI-only (backend also validates - defense in depth)
- Backend owns all security logic (token generation, expiration, one-time use)
- Frontend owns UI state (loading, error display, password toggle)

**JAGSHEMESH! Let's finish this! 🚀**
