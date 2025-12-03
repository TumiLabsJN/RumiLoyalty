
### CR-001: Fix Session Creation After OTP Verification
02/12

**Status:** ✅ CLOSED (2025-12-02)
**Filed:** 2025-12-02
**Severity:** CRITICAL - Blocks signup flow
**Blocks:** Task 3.4.7 (E2E test will fail without this)

#### Problem
- `authService.verifyOTP()` at line 510 calls `supabase.auth.admin.getUserById()`
- This function does NOT create a session - it only fetches user data
- Error thrown: `AUTH_CREATION_FAILED: Failed to create session`
- Users cannot complete signup - blocked after OTP verification

#### Root Cause
- AUTH_IMPL.md documents incorrect behavior (says "Create session" but uses wrong API)
- `signUp()` returns a session (when email confirmation disabled) but it's discarded
- No way to create session after OTP without user's password

#### Solution
Store encrypted session tokens from signup, return after OTP verification.
**Full implementation details:** `/repodocs/LoginFlowFix.md`

#### Files to MODIFY (Implementation)

| File | Change Type | Lines Affected |
|------|-------------|----------------|
| `supabase/migrations/YYYYMMDD_add_session_tokens_to_otps.sql` | CREATE | New file (~15 lines) |
| `appcode/lib/repositories/otpRepository.ts` | MODIFY | Lines 15-25 (interface), 40-55 (mapper), 66-100 (create) |
| `appcode/lib/services/authService.ts` | MODIFY | Line 18 (import), 166-172 (capture session), 203-208 (store tokens), 504-527 (return tokens) |
| `appcode/app/api/auth/verify-otp/route.ts` | MODIFY | Response handling (~20 lines) |

#### Database Changes (RPC Functions to UPDATE)

| RPC Function | Change |
|--------------|--------|
| `auth_create_otp` | Add 2 params: `p_access_token_encrypted`, `p_refresh_token_encrypted` |
| `auth_find_otp_by_session` | Add 2 return columns: `access_token_encrypted`, `refresh_token_encrypted` |
| `auth_mark_otp_used` | Clear token columns when marking used (security) |

#### Documentation to UPDATE After Implementation

| Document | Section to Update |
|----------|-------------------|
| `repodocs/AUTH_IMPL.md` | Lines 334-340 (verifyOTP session creation), Lines 379 (function description) |
| `EXECUTION_STATUS.md` | Mark CR-001 as CLOSED |

#### Test Files Potentially Affected

| Test File | Impact |
|-----------|--------|
| `tests/integration/auth/signup-login-flow.test.ts` | May need updates if testing verifyOTP return value |
| `tests/integration/auth/otp-security.test.ts` | May need updates for new OTP record fields |

#### Estimated Scope
- ~150 lines of code changes
- 1 new migration file
- 3 RPC function updates
- 4 TypeScript files modified

#### Decision
- [x] APPROVED - Implement CR-001 before Task 3.4.7 (2025-12-02)
- [x] IMPLEMENTED - All 44 integration tests pass (2025-12-02)
- [x] VERIFIED - Manual signup flow works with auto-login (2025-12-02)

---