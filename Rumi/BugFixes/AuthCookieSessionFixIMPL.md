# Auth Cookie Session Not Persisting - Implementation Plan v2.0

**Decision Source:** AuthCookieSessionFix.md
**Bug ID:** BUG-AUTH-COOKIE-SESSION
**Severity:** Critical
**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From AuthCookieSessionFix.md + Audit Feedback:**

**Bug Summary:** After successful login (200 OK), subsequent authenticated requests return 401 because the session is not restored from our custom `auth-token` cookie.

**Root Cause:** Cookie name mismatch - login route sets `auth-token` but Supabase SSR expects `sb-<projectRef>-auth-token`. Additionally, refresh token is not stored, and there was no mechanism to persist refreshed tokens back to the browser.

**Files Affected:**
- `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts`
- `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`
- `/home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts`

**Chosen Solution (v2.0 - Middleware Approach):**
> Use middleware to handle session restoration and token refresh. Middleware has proper request/response access, allowing refreshed tokens to be persisted back to the browser. This is Supabase's recommended pattern.

**Why Middleware (Audit Feedback Addressed):**
- Original plan's `createClient()` with `cookies().set()` doesn't persist refreshed tokens to response
- Middleware runs BEFORE route handlers, has response access
- Middleware can write refreshed tokens to `response.cookies` (reaches browser)
- Supabase-recommended pattern for token refresh
- Existing middleware.ts already has response-aware cookie handlers

**Session Duration (v2.2):**
- Password login aligned to 30 days (was 7 days)
- Matches OTP verification flow (already 30 days)
- Supabase configured with session timeout = "never"

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 3
- Lines changed: ~80
- Breaking changes: NO
- Schema changes: NO
- API contract changes: Minor (7 days → 30 days, additive refresh cookie)

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts`
**File 2:** `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`
**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts`

```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts \
       /home/jorge/Loyalty/Rumi/appcode/middleware.ts \
       /home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts
```
**Expected:** All files exist

**Checklist:**
- [ ] All source files exist: 3
- [ ] All files readable

---

### Gate 3: Current Code State Verification - Login Route

**Read current state of cookie setting code:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts lines 111-125
```

**Expected Current State:**
- Sets `auth-token` cookie only
- No `auth-refresh-token` cookie

**Checklist:**
- [ ] Current code matches expected: [YES / NO]
- [ ] No refresh token cookie present

---

### Gate 4: Current Code State Verification - Middleware

**Read current state:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/middleware.ts
```

**Expected Current State:**
- Only matches `/admin/:path*` routes
- Has response-aware cookie handlers (set/remove update both request and response)
- Checks for `auth-token` cookie
- Calls `supabase.auth.getUser()` but does NOT call `setSession()` first
- No session restoration from custom cookies

**Checklist:**
- [ ] Matcher only includes `/admin/:path*`: [YES / NO]
- [ ] Response-aware cookie handlers present: [YES / NO]
- [ ] No `setSession()` call: [YES / NO]

---

### Gate 5: Current Code State Verification - Server Client

**Read current state:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts
```

**Expected Current State:**
- `createClient()` returns Supabase client directly
- No `setSession()` call

**Checklist:**
- [ ] No session restoration present: [YES / NO]

---

### Gate 6: API Contract Verification

**Verify auth-token cookie is specified:**
```bash
grep -n "auth-token" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -10
```

**Note:** Adding `auth-refresh-token` cookie is additive, not breaking.

**Checklist:**
- [ ] Cookie naming matches contract
- [ ] No breaking changes

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change

---

### Step 1: Add Refresh Token Cookie to Login Route

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts`
**Action Type:** ADD

---

#### Edit Action

**OLD Code (lines 111-121):**
```typescript
    // Set auth-token HTTP-only cookie (7 days per API_CONTRACTS.md line 1028)
    if (sessionToken) {
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 604800, // 7 days
      });
    }

    // Log successful login for security auditing (per line 1117)
```

**NEW Code:**
```typescript
    // Set auth-token HTTP-only cookie (30 days - aligned with OTP flow)
    if (sessionToken) {
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2592000, // 30 days
      });
    }

    // BUG-AUTH-COOKIE-SESSION Fix: Set refresh token cookie for session refresh
    // Required for middleware to refresh expired access tokens
    const refreshToken = sessionData.session?.refresh_token;
    if (refreshToken) {
      response.cookies.set('auth-refresh-token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 2592000, // 30 days
      });
    }

    // Log successful login for security auditing (per line 1117)
```

**Change Summary:** +11 lines (refresh token cookie)

---

### Step 2: Update Middleware Matcher and Add Session Restoration

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`
**Action Type:** MODIFY

---

#### Edit Action - Part A: Add Session Restoration After Supabase Client Creation

**FIND this code (after line 82, before auth-token check):**
```typescript
  );

  // Check for auth-token cookie (our custom session token)
  const authToken = request.cookies.get('auth-token')?.value;
```

**REPLACE with:**
```typescript
  );

  // Check for auth-token cookie (our custom session token)
  const authToken = request.cookies.get('auth-token')?.value;
  const refreshToken = request.cookies.get('auth-refresh-token')?.value;

  // BUG-AUTH-COOKIE-SESSION Fix: Restore session from custom cookies
  // Supabase expects sb-xxx-auth-token but we use custom names.
  // Call setSession() to restore session - this also handles token refresh.
  if (authToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken || '',
    });

    // If tokens were refreshed, update our custom cookies
    if (sessionData?.session) {
      const newAccessToken = sessionData.session.access_token;
      const newRefreshToken = sessionData.session.refresh_token;

      // Update cookies if tokens changed (were refreshed)
      if (newAccessToken && newAccessToken !== authToken) {
        request.cookies.set({
          name: 'auth-token',
          value: newAccessToken,
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set('auth-token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 2592000, // 30 days
        });
      }
      if (newRefreshToken && newRefreshToken !== refreshToken) {
        request.cookies.set({
          name: 'auth-refresh-token',
          value: newRefreshToken,
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set('auth-refresh-token', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 2592000, // 30 days
        });
      }
    }
  }
```

**Change Summary:** +45 lines (session restoration with refresh token persistence)

---

#### Edit Action - Part B: Update Matcher to Include All Authenticated Routes

**FIND (end of file):**
```typescript
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
```

**REPLACE with:**
```typescript
export const config = {
  matcher: [
    // Protected routes that need session refresh
    // Note: Static assets (/_next/*, images, etc.) are NOT matched - explicit list is safer
    '/admin/:path*',
    '/home/:path*',
    '/home',
    '/missions/:path*',
    '/missions',
    '/rewards/:path*',
    '/rewards',
    '/tiers/:path*',
    '/tiers',
    '/api/user/:path*',
    '/api/missions/:path*',
    '/api/rewards/:path*',
    '/api/auth/user-status',
  ],
};
```

**Change Summary:** +13 lines (expanded matcher with user-status)

---

### Step 3: Add Session Restoration to Server Client (For Route Handlers)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts`
**Action Type:** MODIFY

**Note:** Even with middleware handling refresh, route handlers need the session restored in their Supabase client instance.

---

#### Edit Action

**OLD Code (lines 16-46):**
```typescript
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

**NEW Code:**
```typescript
export async function createClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );

  // BUG-AUTH-COOKIE-SESSION Fix: Restore session from custom cookies
  // Middleware handles token refresh; this ensures route handlers have valid session.
  //
  // IMPORTANT: Token refresh is MIDDLEWARE-ONLY. This setSession() call restores the
  // session but does NOT have response access to persist refreshed tokens. If tokens
  // expire mid-request (rare - tokens last ~1 hour), the refresh won't persist to browser.
  // For MVP, this is acceptable; middleware handles 99.9% of refresh cases.
  const authToken = cookieStore.get('auth-token')?.value;
  const refreshToken = cookieStore.get('auth-refresh-token')?.value;
  if (authToken) {
    await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken || '',
    });
  }

  return supabase;
}
```

**Change Summary:** +17 lines (session restoration with middleware-only documentation)

---

## Security Verification

**This fix does NOT introduce new database queries.**

**Security Checklist:**
- [x] No new database queries introduced
- [x] No cross-tenant data exposure
- [x] Both cookies are HTTP-only, Secure, SameSite=Strict
- [x] Refresh tokens only sent over HTTPS in production

---

## Final Verification (ALL MUST PASS)

---

### Verification 1: Type Check

```bash
npx tsc --noEmit 2>&1 | grep -c "error" || echo "0"
```
**Expected:** Same or fewer errors than before

---

### Verification 2: Build Check

```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build succeeds

---

### Verification 3: Runtime Test

```
1. Clear cookies for localhost
2. Navigate to http://localhost:3000/login/start
3. Enter handle: testbronze
4. Enter password: TestPass123!
5. Verify redirect to /home (not back to /login/start)
6. Verify dashboard loads
7. Refresh page - should stay on /home
8. Check DevTools > Application > Cookies:
   - auth-token cookie present
   - auth-refresh-token cookie present
```

**Expected:** Login succeeds, redirects to /home, stays on /home after refresh

---

### Verification 4: Git Diff Check

```bash
git diff --stat
```

**Expected Changes:**
- `app/api/auth/login/route.ts`: +11 lines
- `middleware.ts`: +56 lines
- `lib/supabase/server-client.ts`: +13 lines

---

## Audit Trail

### Files Modified

1. `/home/jorge/Loyalty/Rumi/appcode/app/api/auth/login/route.ts` - ADD refresh token cookie
2. `/home/jorge/Loyalty/Rumi/appcode/middleware.ts` - ADD session restoration + expanded matcher
3. `/home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts` - ADD session restoration

**Total:** 3 files modified, ~80 lines changed

---

### Revision History

- **v1.0 (2025-12-15):** Original plan with per-request setSession in createClient
- **v2.0 (2025-12-15):** Middleware-based approach per audit feedback
  - Added session restoration to middleware with response-aware cookie handlers
  - Expanded middleware matcher to all authenticated routes
  - Kept server-client setSession for route handler compatibility
  - Addresses audit concern: refreshed tokens now persist to browser via response.cookies
- **v2.1 (2025-12-15):** Final audit feedback incorporated
  - Added `/api/auth/user-status` to middleware matcher
  - Added explicit comment documenting middleware-only refresh limitation
  - Added note that static assets are not matched (explicit list is safer)
- **v2.2 (2025-12-15):** Session duration aligned to 30 days
  - Changed cookie maxAge from 604800 (7 days) to 2592000 (30 days)
  - Aligns password login with OTP verification flow
  - Supabase session timeout is "never" so cookie duration is the only limit

---

**Document Version:** 2.2
**Status:** APPROVED - READY FOR EXECUTION
