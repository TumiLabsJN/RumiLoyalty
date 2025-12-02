# Login Flow Fix - Auto-Login After OTP Verification

**Purpose:** Fix the broken session creation after OTP verification by using the session returned from Supabase signup
**Target Audience:** LLM agents implementing authentication fixes
**Priority:** Critical - blocks user signup flow
**Created:** 2025-12-02

---

## Problem Statement

### Current Broken Behavior
1. User signs up with email/password
2. `supabase.auth.signUp()` returns `{ user, session }` - **session is discarded**
3. OTP sent to email
4. User enters OTP
5. `verifyOTP()` calls `supabase.auth.admin.getUserById()` expecting it to create a session
6. **BUG:** `getUserById()` does NOT create a session, it only fetches user data
7. Error thrown: `AUTH_CREATION_FAILED: Failed to create session`

### Root Cause
- `authService.ts:510` uses `supabase.auth.admin.getUserById()`
- This function retrieves user data, does NOT create an auth session
- The session from `signUp()` at signup time is never captured or used

### Error Location
- **File:** `appcode/lib/services/authService.ts`
- **Line:** 510-514
- **Error Code:** `AUTH_CREATION_FAILED`

---

## Solution: Capture Session at Signup, Return After OTP Verification

### Flow After Fix
1. User signs up with email/password
2. `supabase.auth.signUp()` returns `{ user, session }` - **session tokens stored in OTP record**
3. OTP sent to email
4. User enters OTP
5. `verifyOTP()` retrieves stored session tokens from OTP record
6. Returns session tokens to frontend
7. Frontend stores tokens, user is authenticated

---

## Implementation Steps

### Step 1: Modify OTP Table Schema

**File:** Database migration (new migration file)

**Action:** Add columns to store encrypted session tokens in `otps` table

```sql
-- Migration: add_session_tokens_to_otps.sql

ALTER TABLE otps
ADD COLUMN access_token_encrypted TEXT,
ADD COLUMN refresh_token_encrypted TEXT;

COMMENT ON COLUMN otps.access_token_encrypted IS 'AES-256-GCM encrypted Supabase access_token from signup';
COMMENT ON COLUMN otps.refresh_token_encrypted IS 'AES-256-GCM encrypted Supabase refresh_token from signup';
```

**Why encrypt:** Session tokens are sensitive credentials. Use existing encryption utility from Pattern 9 (ARCHITECTURE.md).

---

### Step 2: Update OTP Repository Types

**File:** `appcode/lib/repositories/otpRepository.ts`

**Action:** Update `OtpData` interface to include session token fields

**Location:** Lines 15-25 (OtpData interface)

**Change:**
```typescript
// BEFORE
export interface OtpData {
  id: string;
  userId: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  createdAt: string;
}

// AFTER
export interface OtpData {
  id: string;
  userId: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  createdAt: string;
  accessTokenEncrypted: string | null;  // NEW
  refreshTokenEncrypted: string | null; // NEW
}
```

---

### Step 3: Update OTP Create RPC Function

**File:** Database RPC function `auth_create_otp`

**Action:** Accept and store encrypted session tokens

```sql
-- Update existing RPC function

CREATE OR REPLACE FUNCTION auth_create_otp(
  p_user_id TEXT,
  p_session_id TEXT,
  p_code_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_access_token_encrypted TEXT DEFAULT NULL,  -- NEW
  p_refresh_token_encrypted TEXT DEFAULT NULL  -- NEW
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_id UUID;
BEGIN
  INSERT INTO otps (
    user_id,
    session_id,
    code_hash,
    expires_at,
    access_token_encrypted,   -- NEW
    refresh_token_encrypted   -- NEW
  ) VALUES (
    NULLIF(p_user_id, '')::UUID,
    p_session_id,
    p_code_hash,
    p_expires_at,
    p_access_token_encrypted,  -- NEW
    p_refresh_token_encrypted  -- NEW
  )
  RETURNING id INTO v_otp_id;

  RETURN v_otp_id;
END;
$$;
```

---

### Step 4: Update OTP Find RPC Function

**File:** Database RPC function `auth_find_otp_by_session`

**Action:** Return encrypted session token columns

```sql
-- Update existing RPC function to return new columns

CREATE OR REPLACE FUNCTION auth_find_otp_by_session(p_session_id TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_id VARCHAR(64),
  code_hash TEXT,
  expires_at TIMESTAMPTZ,
  attempts INTEGER,
  used BOOLEAN,
  created_at TIMESTAMPTZ,
  access_token_encrypted TEXT,   -- NEW
  refresh_token_encrypted TEXT   -- NEW
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.session_id,
    o.code_hash,
    o.expires_at,
    o.attempts,
    o.used,
    o.created_at,
    o.access_token_encrypted,   -- NEW
    o.refresh_token_encrypted   -- NEW
  FROM otps o
  WHERE o.session_id = p_session_id
  ORDER BY o.created_at DESC
  LIMIT 1;
END;
$$;
```

---

### Step 5: Update otpRepository.create()

**File:** `appcode/lib/repositories/otpRepository.ts`

**Location:** Lines 66-100 (create function)

**Action:** Accept and pass encrypted session tokens to RPC

```typescript
// BEFORE (lines 66-100)
async create(otpData: {
  userId?: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<OtpData>

// AFTER
async create(otpData: {
  userId?: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: Date;
  accessTokenEncrypted?: string | null;  // NEW
  refreshTokenEncrypted?: string | null; // NEW
}): Promise<OtpData> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_create_otp', {
    p_user_id: otpData.userId ?? '',
    p_session_id: otpData.sessionId,
    p_code_hash: otpData.codeHash,
    p_expires_at: otpData.expiresAt.toISOString(),
    p_access_token_encrypted: otpData.accessTokenEncrypted ?? null,   // NEW
    p_refresh_token_encrypted: otpData.refreshTokenEncrypted ?? null, // NEW
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create OTP');
  }

  return {
    id: data,
    userId: otpData.userId ?? null,
    sessionId: otpData.sessionId,
    codeHash: otpData.codeHash,
    expiresAt: otpData.expiresAt.toISOString(),
    attempts: 0,
    used: false,
    createdAt: new Date().toISOString(),
    accessTokenEncrypted: otpData.accessTokenEncrypted ?? null,   // NEW
    refreshTokenEncrypted: otpData.refreshTokenEncrypted ?? null, // NEW
  };
}
```

---

### Step 6: Update mapRpcResultToOtpData()

**File:** `appcode/lib/repositories/otpRepository.ts`

**Location:** Lines 40-55 (mapping function)

**Action:** Map new columns from RPC result

```typescript
// Add to mapping function
function mapRpcResultToOtpData(row: Record<string, unknown>): OtpData {
  return {
    id: row.id as string,
    userId: row.user_id as string | null,
    sessionId: row.session_id as string,
    codeHash: row.code_hash as string,
    expiresAt: row.expires_at as string,
    attempts: row.attempts as number,
    used: row.used as boolean,
    createdAt: row.created_at as string,
    accessTokenEncrypted: row.access_token_encrypted as string | null,   // NEW
    refreshTokenEncrypted: row.refresh_token_encrypted as string | null, // NEW
  };
}
```

---

### Step 7: Update authService.initiateSignup()

**File:** `appcode/lib/services/authService.ts`

**Location:** Lines 281-370 (initiateSignup function)

**Action:**
1. Capture session from `signUp()` response
2. Encrypt tokens using existing encryption utility
3. Store encrypted tokens in OTP record

**Critical Change at line 166-172:**
```typescript
// BEFORE
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: password,
  options: {
    emailRedirectTo: undefined,
  },
});

// AFTER
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: password,
  options: {
    emailRedirectTo: undefined,
  },
});

// Capture session tokens (available when email confirmation is disabled)
const accessToken = authData.session?.access_token ?? null;
const refreshToken = authData.session?.refresh_token ?? null;
```

**Add encryption import at top of file:**
```typescript
import { encrypt, decrypt } from '@/lib/utils/encryption';
```

**Critical Change at OTP creation (lines 203-208):**
```typescript
// BEFORE
await otpRepository.create({
  userId: authUserId,
  sessionId,
  codeHash: otpHash,
  expiresAt,
});

// AFTER
// Encrypt session tokens before storage
const accessTokenEncrypted = accessToken ? encrypt(accessToken) : null;
const refreshTokenEncrypted = refreshToken ? encrypt(refreshToken) : null;

await otpRepository.create({
  userId: authUserId,
  sessionId,
  codeHash: otpHash,
  expiresAt,
  accessTokenEncrypted,   // NEW
  refreshTokenEncrypted,  // NEW
});
```

---

### Step 8: Update authService.verifyOTP()

**File:** `appcode/lib/services/authService.ts`

**Location:** Lines 450-527 (verifyOTP function)

**Action:**
1. Remove broken `getUserById()` call
2. Decrypt stored session tokens
3. Return tokens in response

**Remove lines 504-514:**
```typescript
// DELETE THIS BLOCK
const supabase = await createClient();
const { data: sessionData, error: sessionError } = await supabase.auth.admin.getUserById(user.id);

if (sessionError || !sessionData.user) {
  throw new BusinessError('AUTH_CREATION_FAILED', 'Failed to create session');
}
```

**Replace with:**
```typescript
// Decrypt stored session tokens
let accessToken: string | null = null;
let refreshToken: string | null = null;

if (otpRecord.accessTokenEncrypted) {
  accessToken = decrypt(otpRecord.accessTokenEncrypted);
}
if (otpRecord.refreshTokenEncrypted) {
  refreshToken = decrypt(otpRecord.refreshTokenEncrypted);
}
```

**Update return type and value:**
```typescript
// BEFORE return type
interface VerifyOTPResult {
  success: boolean;
  userId: string;
  email: string;
  tiktokHandle: string;
  isAdmin: boolean;
  message: string;
}

// AFTER return type
interface VerifyOTPResult {
  success: boolean;
  userId: string;
  email: string;
  tiktokHandle: string;
  isAdmin: boolean;
  message: string;
  accessToken: string | null;   // NEW
  refreshToken: string | null;  // NEW
}

// AFTER return value (lines 519-527)
return {
  success: true,
  userId: user.id,
  email: user.email || '',
  tiktokHandle: user.tiktokHandle,
  isAdmin: user.isAdmin,
  message: 'Email verified successfully',
  accessToken,   // NEW
  refreshToken,  // NEW
};
```

---

### Step 9: Update verify-otp API Route

**File:** `appcode/app/api/auth/verify-otp/route.ts`

**Action:** Return session tokens in response and set auth cookie

**Add to response handling:**
```typescript
// After successful verification
const result = await authService.verifyOTP(sessionId, code);

// Set Supabase auth cookie if tokens available
if (result.accessToken && result.refreshToken) {
  // Create Supabase client and set session
  const supabase = await createClient();
  await supabase.auth.setSession({
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  });
}

return NextResponse.json({
  success: true,
  userId: result.userId,
  email: result.email,
  tiktokHandle: result.tiktokHandle,
  isAdmin: result.isAdmin,
  message: result.message,
  // Session tokens for frontend to store (optional - cookie already set)
  session: result.accessToken ? {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  } : null,
}, { status: 200 });
```

---

### Step 10: Clear Tokens After Use (Security)

**File:** `appcode/lib/services/authService.ts`

**Location:** After successful OTP verification in verifyOTP()

**Action:** Clear encrypted tokens from database after successful verification

**Add after marking OTP as used (after line 489):**
```typescript
// Clear encrypted session tokens from OTP record (security - one-time use)
// The OTP is already marked as used, but explicitly nullify tokens
// This is handled by the markUsed function or add explicit clearing
```

**Alternative:** Modify `auth_mark_otp_used` RPC to also clear token columns:
```sql
CREATE OR REPLACE FUNCTION auth_mark_otp_used(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE otps
  SET
    used = true,
    access_token_encrypted = NULL,  -- Clear for security
    refresh_token_encrypted = NULL  -- Clear for security
  WHERE session_id = p_session_id;
END;
$$;
```

---

## File Change Summary

| File | Action | Lines Affected |
|------|--------|----------------|
| `migrations/YYYYMMDD_add_session_tokens_to_otps.sql` | CREATE | New file |
| `lib/repositories/otpRepository.ts` | MODIFY | 15-25, 40-55, 66-100 |
| `lib/services/authService.ts` | MODIFY | 18 (import), 166-172, 203-208, 504-527 |
| `app/api/auth/verify-otp/route.ts` | MODIFY | Response handling section |
| Database RPC: `auth_create_otp` | MODIFY | Add 2 parameters |
| Database RPC: `auth_find_otp_by_session` | MODIFY | Add 2 return columns |
| Database RPC: `auth_mark_otp_used` | MODIFY | Clear token columns |

---

## Verification Checklist

After implementation, verify:

1. [ ] Migration applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'otps' AND column_name LIKE '%token%';`
   - Expected: `access_token_encrypted`, `refresh_token_encrypted`

2. [ ] Signup stores tokens: After signup, query `SELECT access_token_encrypted IS NOT NULL FROM otps ORDER BY created_at DESC LIMIT 1;`
   - Expected: `true`

3. [ ] Tokens are encrypted: `SELECT access_token_encrypted FROM otps ORDER BY created_at DESC LIMIT 1;`
   - Expected: Encrypted string (not raw JWT)

4. [ ] OTP verification succeeds: No `AUTH_CREATION_FAILED` error

5. [ ] Session is valid: After OTP verification, `supabase.auth.getUser()` returns user data

6. [ ] Tokens cleared after use: `SELECT access_token_encrypted FROM otps WHERE used = true ORDER BY created_at DESC LIMIT 1;`
   - Expected: `NULL`

---

## Rollback Plan

If implementation fails:

1. Revert migration: `ALTER TABLE otps DROP COLUMN access_token_encrypted, DROP COLUMN refresh_token_encrypted;`
2. Restore original RPC functions from backup
3. Revert code changes in `otpRepository.ts` and `authService.ts`
4. Alternative: Implement Option C (require login after OTP verification) as fallback

---

## Security Considerations

1. **Token Encryption:** Session tokens encrypted with AES-256-GCM before storage (existing Pattern 9)
2. **One-Time Use:** Tokens cleared from database after successful OTP verification
3. **Token Expiry:** OTP record expires in 5 minutes, tokens become inaccessible
4. **No Plaintext Storage:** Tokens never stored in plaintext in database
5. **HTTPS Required:** Tokens transmitted over HTTPS only

---

## Testing Commands

```bash
# 1. Run migration
cd appcode && npx supabase db push

# 2. Start dev server
npm run dev

# 3. Test signup flow
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"tiktokHandle": "testuser", "email": "test@example.com", "password": "TestPass123!", "agreedToTerms": true}'

# 4. Get OTP from console log: [DEV] OTP for test@example.com: XXXXXX

# 5. Verify OTP (use sessionId from signup response cookie)
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -H "Cookie: otp_session=<sessionId>" \
  -d '{"code": "XXXXXX"}'

# Expected: 200 OK with session tokens, no AUTH_CREATION_FAILED error
```

---

## Dependencies

- Existing encryption utility: `lib/utils/encryption.ts` (encrypt/decrypt functions)
- Supabase email confirmation: MUST be disabled in Supabase dashboard
- Environment variable: `ENCRYPTION_KEY` must be set in `.env.local`

---

**Document Version:** 1.0
**Status:** Ready for implementation
**Estimated Changes:** ~150 lines of code across 4 files + 1 migration + 3 RPC updates
