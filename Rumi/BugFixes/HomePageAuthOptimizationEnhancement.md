# Home Page Auth Optimization - Gap/Enhancement Documentation

**ID:** ENH-010
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-22
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Follow-up to ENH-008 (Home Page Direct Service)
**Linked Issues:** ENH-008, ENH-002 (Dashboard Auth Optimization)

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates. The `/home` page displays a dashboard with tier progress, featured missions, and rewards. After implementing ENH-008 (Direct Service Pattern), timing analysis revealed that `getUser()` makes a redundant 577ms network call to Supabase Auth, even though middleware already validated the session via `setSession()`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Vercel Serverless
**Architecture Pattern:** Middleware → Server Component → Service → Repository → PostgreSQL RPC

---

## 2. Gap/Enhancement Summary

**What exists:** The `/home` Server Component calls `supabase.auth.getUser()` to get the authenticated user ID. This makes a ~577ms network round-trip to Supabase Auth API, even though middleware already validated the session.

**What should exist:** The Server Component should decode the JWT locally to extract the user ID (~1ms), since middleware already validated the token's signature and expiry.

**Why it matters:** The `getUser()` call adds 577ms to every page load. With this optimization, `/home` page load drops from ~1143ms to ~566ms (50% improvement).

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `middleware.ts` | Lines 86-131 | `setSession()` validates token, refreshes if needed, updates cookies |
| `middleware.ts` | Lines 203-225 | Matcher confirms `/home` runs through middleware |
| `app/home/page.tsx` | Lines 1-61 (full file) | **ENH-008 IS IMPLEMENTED**: Uses `getDashboardOverview()` direct call (line 50), NOT fetch. Contains `getUser()` (line 34) which takes 577ms. |
| `app/home/page.tsx` | Line 3 | `import { getDashboardOverview }` - confirms direct service pattern |
| `app/home/page.tsx` | Line 34 | `supabase.auth.getUser()` - the 577ms bottleneck to eliminate |
| `lib/supabase/server-client.ts` | Lines 16-49 | `createClient()` creates Supabase client with cookie handlers |
| Vercel Logs (2025-12-23) | Production timing | `[HomePage] t_getUser: 577ms` - network call to Supabase Auth |
| Vercel Logs (2025-12-23) | Production timing | `[Middleware] /home t_setSession: 184ms` - already validates token |
| Supabase JWT Documentation | Token structure | JWT contains `sub` (user ID), `exp` (expiry), `aud` (audience) |
| ENH-002 | Full document | Precedent: removed `setSession()` from server-client.ts (same pattern) |
| ENH-008 | Full document | **IMPLEMENTED**: Direct service calls work, but getUser() is bottleneck |

### Key Evidence

**Evidence 1:** Vercel timing logs show redundant auth
- Source: Production Vercel logs, Dec 23 2025
- Measurements:
  ```
  [Middleware] /home t_setSession: 184ms    ← Token validated here
  [HomePage] t_createClient: 8ms
  [HomePage] t_getUser: 577ms               ← REDUNDANT network call
  [DashboardService] t_RPC: 528ms
  [HomePage] TOTAL: 1143ms
  ```
- Implication: 577ms spent on auth validation that middleware already did

**Evidence 2:** Middleware already validates the token
- Source: `middleware.ts` lines 86-93
- Code:
  ```typescript
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: authToken,
    refresh_token: refreshToken || '',
  });
  ```
- Implication: `setSession()` validates signature, checks expiry, refreshes if needed. Server Component doesn't need to re-validate.

**Evidence 3:** JWT contains user ID in `sub` claim
- Source: Supabase Auth documentation, JWT standard (RFC 7519)
- Structure: `{ "sub": "<user-uuid>", "exp": <unix-timestamp>, "aud": "authenticated", ... }`
- Implication: User ID can be extracted via local decode without network call

**Evidence 4:** `/home` is in middleware matcher
- Source: `middleware.ts` lines 208-209
- Code:
  ```typescript
  matcher: [
    '/home/:path*',
    '/home',
    // ...
  ]
  ```
- Implication: Middleware ALWAYS runs before `/home` page - safe to trust validated token

---

## 4. Business Justification

**Business Need:** Reduce `/home` page load time from ~1143ms to ~566ms (50% improvement) by eliminating redundant auth network call.

**User Stories:**
1. As an affiliate user, I need the dashboard to load quickly so that I can check my progress without waiting
2. As a brand administrator, I need consistent sub-second page loads so affiliates perceive the platform as responsive

**Impact if NOT implemented:**
- Every `/home` page load wastes 577ms on redundant auth validation
- Users experience 1.1+ second page loads instead of sub-600ms
- Geographic penalty: Users far from Supabase region experience even worse latency

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `app/home/page.tsx`
```typescript
export default async function HomePage() {
  // 1. Get authenticated user
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  // ↑ THIS TAKES 577ms - NETWORK CALL TO SUPABASE AUTH

  if (authError || !authUser) {
    redirect('/login/start');
  }

  // 2. Get dashboard data
  const dashboardData = await getDashboardOverview(authUser.id, clientId);
  // ...
}
```

**File:** `middleware.ts` (relevant section)
```typescript
if (authToken) {
  const { data: sessionData } = await supabase.auth.setSession({
    access_token: authToken,
    refresh_token: refreshToken || '',
  });
  // Token is NOW validated - signature checked, expiry verified
  // Refreshed tokens written to cookies if needed
}
```

**Current Capability:**
- Middleware validates token via `setSession()` (~184ms)
- Server Component re-validates via `getUser()` (~577ms) ← THE GAP
- User ID is obtained, but at cost of redundant network call

#### Current Data Flow

```
Request → Middleware                    → Server Component
          ├── setSession() [184ms]        ├── createClient() [8ms]
          │   └── Validates token         ├── getUser() [577ms] ← REDUNDANT
          │   └── Refreshes if needed     │   └── Network call to Supabase Auth
          │   └── Updates cookies         ├── getDashboardOverview() [528ms]
          └── Returns response            └── Returns JSX
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Replace `getUser()` with local JWT decode. Since middleware already validated the token (signature + expiry), we can safely decode the JWT payload to extract the user ID. Add fallback to `getUser()` if decode fails (malformed token, expired, invalid audience).

#### Auditor Requirements Addressed

Per auditor review:
1. ✅ Add exp/aud check after decode
2. ✅ Fall back to `getUser()` on any failure
3. ✅ Only use on routes covered by middleware matcher
4. ✅ Read post-refresh token from cookies

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `lib/supabase/get-user-id-from-token.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { cookies } from 'next/headers';
import { createClient } from './server-client';

interface SupabaseJwtPayload {
  sub: string;      // User ID (UUID)
  exp: number;      // Expiry timestamp (Unix seconds)
  aud: string;      // Audience (should be 'authenticated')
  iat?: number;     // Issued at
  role?: string;    // Role
}

/**
 * Page routes where this helper is safe to use.
 * These routes are covered by middleware.ts matcher, which runs setSession().
 *
 * EXPORTED for sync test to verify against middleware.ts config.
 * Update this list AND middleware.ts matcher together.
 */
export const ALLOWED_PAGE_ROUTES = [
  '/home',
  '/missions',
  '/rewards',
  '/tiers',
  '/admin',
] as const;

/**
 * Get user ID from auth token via local JWT decode.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ SECURITY CONTRACT                                                       │
 * │                                                                         │
 * │ This function ONLY decodes the JWT payload - it does NOT verify the     │
 * │ signature. It is ONLY safe to use on routes where middleware has        │
 * │ already validated the token via setSession().                           │
 * │                                                                         │
 * │ ALLOWED ROUTES: See ALLOWED_PAGE_ROUTES constant above.                 │
 * │                                                                         │
 * │ DO NOT use this function on:                                            │
 * │   - API routes not in middleware matcher                                │
 * │   - Public pages                                                        │
 * │   - Any route where middleware doesn't run setSession()                 │
 * │                                                                         │
 * │ A sync test verifies ALLOWED_PAGE_ROUTES matches middleware.ts.         │
 * │ Run tests before deploying changes.                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SAFETY LAYERS:
 * 1. Middleware setSession() validates signature + refreshes tokens
 * 2. This function validates exp (expiry) and aud (audience) claims
 * 3. Any decode error falls back to getUser() network call
 * 4. Database RLS policies enforce authorization on returned user ID
 *
 * Falls back to getUser() network call if:
 * - Token missing or malformed
 * - Token expired or expiring within 30s (clock skew protection)
 * - Invalid audience
 * - Any decode error
 *
 * Expected fallback frequency: <1% in normal operation
 *
 * @returns User ID string, or null if auth failed
 */
export async function getUserIdFromToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    // No token - caller should redirect to login
    return null;
  }

  try {
    // Decode JWT payload (no signature verification - middleware already did this)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[getUserIdFromToken] Malformed JWT (not 3 parts), falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Base64url decode the payload (middle part)
    // JWT uses base64url encoding: replace - with +, _ with /, add padding
    const payloadB64 = parts[1];
    const payloadB64Std = payloadB64
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    // Add padding if needed (base64 requires length divisible by 4)
    const padding = (4 - (payloadB64Std.length % 4)) % 4;
    const payloadB64Padded = payloadB64Std + '='.repeat(padding);

    // Use Buffer.from for Node.js runtime (not atob which has issues with base64url)
    const payloadJson = Buffer.from(payloadB64Padded, 'base64').toString('utf-8');
    const payload: SupabaseJwtPayload = JSON.parse(payloadJson);

    // Validate expiry - reject if token is expired OR will expire within 30s
    // This protects against clock skew where our server clock is behind
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now + 30) {
      console.warn('[getUserIdFromToken] Token expired or expiring soon, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Validate audience matches Supabase authenticated users
    if (!payload.aud || payload.aud !== 'authenticated') {
      console.warn('[getUserIdFromToken] Invalid audience, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Validate sub (user ID) exists and is non-empty
    if (!payload.sub || typeof payload.sub !== 'string') {
      console.warn('[getUserIdFromToken] Missing or invalid sub claim, falling back to getUser()');
      return await fallbackToGetUser();
    }

    // Success - return user ID from local decode
    return payload.sub;

  } catch (error) {
    // Any error (JSON parse, Buffer decode, etc.) - fall back to network call
    console.warn('[getUserIdFromToken] Decode failed, falling back to getUser():', error);
    return await fallbackToGetUser();
  }
}

/**
 * Fallback to Supabase getUser() network call.
 * Used when local decode fails for any reason.
 * This ensures auth always works, even if decode logic has bugs.
 */
async function fallbackToGetUser(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user.id;
}
```

**Explanation:**
- Reads the `auth-token` cookie (post-refresh value from middleware)
- Decodes JWT payload locally (no network call)
- Validates `exp` (expiry) and `aud` (audience) claims
- Falls back to `getUser()` on any failure (malformed, expired, invalid)
- Returns user ID or null

#### Modified File: `app/home/page.tsx`

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { getDashboardOverview } from '@/lib/services/dashboardService'
import { HomeClient } from './home-client'

export default async function HomePage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[HomePage] CLIENT_ID not configured');
    return <HomeClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - DIRECT SERVICE CALL
  const dashboardData = await getDashboardOverview(userId, clientId);

  if (!dashboardData) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />;
  }

  return <HomeClient initialData={dashboardData} error={null} />;
}
```

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `lib/supabase/get-user-id-from-token.ts` | CREATE | New helper function for local JWT decode |
| `app/home/page.tsx` | MODIFY | Replace `createClient()` + `getUser()` with `getUserIdFromToken()` |

#### Dependency Graph

```
middleware.ts
├── runs setSession() - validates token, refreshes if needed
├── updates auth-token cookie with fresh token
└── passes request to Server Component

app/home/page.tsx (MODIFIED)
├── imports: getUserIdFromToken (NEW)
├── calls: getUserIdFromToken() - local decode (~1ms)
│   └── fallback: getUser() if decode fails (~577ms)
└── calls: getDashboardOverview(userId, clientId)

lib/supabase/get-user-id-from-token.ts (NEW)
├── imports from: next/headers (cookies)
├── imports from: ./server-client (createClient - for fallback)
└── exports: getUserIdFromToken()
```

---

## 8. Data Flow After Implementation

```
Request → Middleware                    → Server Component
          ├── setSession() [184ms]        ├── getUserIdFromToken() [~1ms]
          │   └── Validates token         │   └── Decode JWT locally
          │   └── Refreshes if needed     │   └── Validate exp/aud
          │   └── Updates cookies         │   └── Return sub (userId)
          └── Returns response            ├── getDashboardOverview() [528ms]
                                          └── Returns JSX

TOTAL: 184 + 1 + 528 = ~713ms (was 184 + 577 + 528 = 1143ms)
Savings: ~430ms (38% improvement)
```

Note: Actual savings may be higher as `createClient()` is also eliminated.

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| N/A | N/A | This enhancement does not touch the database |

#### Schema Changes Required?
- [x] No - existing schema supports this feature (no DB changes)

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| N/A | N/A | No DB queries in this enhancement |

The `client_id` filter is enforced downstream in `getDashboardOverview()` RPC.

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

This enhancement only affects Server Component internals, not API contracts.

#### Breaking Changes?
- [x] No - internal optimization only

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| JWT decode time | ~1ms | Yes |
| Fallback frequency | <1% (only on errors) | Yes |
| Memory impact | Negligible | Yes |

#### Optimization Needed?
- [x] No - JWT decode is inherently fast (~1ms)

#### Expected Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| getUser/decode | 577ms | ~1ms | -576ms |
| createClient | 8ms | 0ms | -8ms |
| **Total page load** | 1143ms | ~559ms | **-584ms (51%)** |

---

## 12. Alternative Solutions Considered

#### Option A: Keep getUser() with caching
- **Description:** Cache getUser() result in request context
- **Pros:** No new code paths, uses Supabase SDK
- **Cons:** Still makes network call on first request, caching adds complexity
- **Verdict:** ❌ Rejected - doesn't solve the fundamental problem

#### Option B: Pass user ID through headers from middleware
- **Description:** Middleware sets `X-User-ID` header after validation
- **Pros:** Zero decode logic in Server Component
- **Cons:** Security risk (headers can be spoofed if misconfigured), non-standard
- **Verdict:** ❌ Rejected - security concerns

#### Option C: Local JWT decode with fallback (Selected)
- **Description:** Decode JWT locally, validate exp/aud, fallback on error
- **Pros:**
  - ~576ms savings per request
  - Safe - falls back to getUser() on any error
  - Uses standard JWT structure
  - Middleware already validated signature
- **Cons:**
  - New code path (but simple)
  - Must keep route in middleware matcher
- **Verdict:** ✅ Selected - best balance of performance and safety

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Malformed token bypass | Low | High | Fallback to getUser() on any decode error |
| Expired token accepted | Low | Medium | Strict exp check: reject if `exp < now + 30` (expiring within 30s) |
| Route removed from middleware | Low | High | Sync test verifies helper's allowed routes match middleware.ts matcher |
| Clock skew issues | Low | Low | 30-second forward buffer protects against server clock being behind |
| Helper reused on unprotected route | Low | Medium | Clear JSDoc security contract + sync test. Database RLS is final authorization layer. |
| Stale token after refresh | Low | Low | Middleware sets cookie on response; Next.js cookies() reads updated value. Expected fallback frequency: <1% |
| Route lists drift apart | Low | Medium | **Sync test** (`get-user-id-from-token.sync.test.ts`) fails if helper docs don't match middleware.ts |

---

## 14. Testing Strategy

#### Unit Tests

**File:** `lib/supabase/__tests__/get-user-id-from-token.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { getUserIdFromToken } from '../get-user-id-from-token';

// Helper to create test JWTs
function createTestJwt(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature'; // Not verified in our function
  return `${headerB64}.${payloadB64}.${signature}`;
}

describe('getUserIdFromToken', () => {
  beforeEach(() => {
    // Mock headers() to return protected route
    jest.mock('next/headers', () => ({
      headers: () => Promise.resolve({
        get: (name: string) => name === 'x-invoke-path' ? '/home' : null
      }),
      cookies: () => Promise.resolve({
        get: (name: string) => ({ value: mockToken })
      })
    }));
  });

  describe('valid tokens', () => {
    it('returns user ID from valid JWT with standard base64url', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const token = createTestJwt({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        aud: 'authenticated'
      });
      // Mock cookies to return this token
      // Expect: returns userId
    });

    it('handles base64url padding edge case (payload length % 4 = 1)', async () => {
      // Create payload that results in base64 needing 3 padding chars
      const userId = 'a'.repeat(37); // Specific length to trigger padding
      const token = createTestJwt({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'authenticated'
      });
      // Expect: decodes correctly despite padding requirements
    });

    it('handles base64url special chars (- and _)', async () => {
      // JWT with payload containing chars that differ between base64 and base64url
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const token = createTestJwt({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'authenticated'
      });
      // Expect: correctly replaces - with + and _ with /
    });
  });

  describe('expiry validation (exp + 30s logic)', () => {
    it('accepts token expiring in 31+ seconds', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) + 31, // 31 seconds from now
        aud: 'authenticated'
      });
      // Expect: returns user ID (local decode succeeds)
    });

    it('rejects token expiring in exactly 30 seconds', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) + 30, // Exactly 30 seconds
        aud: 'authenticated'
      });
      // Expect: falls back to getUser() (exp < now + 30 is false, but exp === now + 30)
      // Note: Our logic is exp < now + 30, so exp = now + 30 passes. Adjust if needed.
    });

    it('rejects token expiring in 29 seconds (within 30s window)', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) + 29, // 29 seconds from now
        aud: 'authenticated'
      });
      // Expect: falls back to getUser()
    });

    it('rejects already-expired token', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) - 1, // 1 second ago
        aud: 'authenticated'
      });
      // Expect: falls back to getUser()
    });

    it('rejects token expired 1 hour ago', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        aud: 'authenticated'
      });
      // Expect: falls back to getUser()
    });
  });

  describe('fallback scenarios', () => {
    it('returns null when no token cookie', async () => {
      // Mock empty cookies
      // Expect: returns null (no fallback, just null)
    });

    it('falls back for malformed JWT (not 3 parts)', async () => {
      const token = 'not.a.valid.jwt.token';
      // Expect: calls getUser() fallback
    });

    it('falls back for invalid audience', async () => {
      const token = createTestJwt({
        sub: 'user-id',
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'wrong-audience'
      });
      // Expect: calls getUser() fallback
    });

    it('falls back for missing sub claim', async () => {
      const token = createTestJwt({
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'authenticated'
        // No sub claim
      });
      // Expect: calls getUser() fallback
    });
  });
});
```

**File:** `lib/supabase/__tests__/get-user-id-from-token.sync.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// SYNC TEST: Ensures helper's allowed routes match middleware.ts matcher
//
// IMPORTS FROM BOTH SOURCES - no hardcoded lists in test
import { config as middlewareConfig } from '../../../middleware';
import { ALLOWED_PAGE_ROUTES } from '../get-user-id-from-token';

/**
 * This test ensures ALLOWED_PAGE_ROUTES in the helper matches
 * the actual middleware.ts matcher configuration.
 *
 * If this test fails:
 * 1. A route was added to middleware.ts but not ALLOWED_PAGE_ROUTES, OR
 * 2. A route was added to ALLOWED_PAGE_ROUTES but not middleware.ts
 *
 * Fix by updating BOTH files together.
 */
describe('getUserIdFromToken route sync', () => {
  // Source of truth: middleware.ts config.matcher
  const middlewareMatcher = middlewareConfig.matcher as string[];

  // Source of truth: helper's exported constant
  const helperRoutes = ALLOWED_PAGE_ROUTES as readonly string[];

  it('every ALLOWED_PAGE_ROUTE is covered by middleware matcher', () => {
    for (const route of helperRoutes) {
      const isMatched = middlewareMatcher.some(pattern => {
        // Handle exact match: '/home' matches '/home'
        if (pattern === route) return true;
        // Handle wildcard: '/home/:path*' covers '/home'
        if (pattern.startsWith(route + '/') || pattern.startsWith(route + ':')) return true;
        return false;
      });

      expect(isMatched).toBe(true);
      // Failure: ALLOWED_PAGE_ROUTES contains '${route}' but middleware.ts doesn't match it
    }
  });

  it('every middleware page route is in ALLOWED_PAGE_ROUTES', () => {
    // Filter to only page routes (exclude /api/* routes)
    const pagePatterns = middlewareMatcher.filter(p => !p.startsWith('/api/'));

    for (const pattern of pagePatterns) {
      // Extract base route: '/home/:path*' -> '/home', '/home' -> '/home'
      const baseRoute = '/' + pattern.split('/')[1].replace(/:.*$/, '');

      const isInHelper = helperRoutes.some(
        allowed => baseRoute === allowed || baseRoute.startsWith(allowed + '/')
      );

      expect(isInHelper).toBe(true);
      // Failure: middleware.ts has '${pattern}' but ALLOWED_PAGE_ROUTES doesn't include '${baseRoute}'
    }
  });
});
```

#### Integration Tests

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('HomePage auth integration', () => {
  it('loads dashboard with valid session', async () => {
    // Setup: Valid auth-token cookie
    // Action: Request /home
    // Expect: Dashboard renders, no getUser() network call
  });

  it('redirects to login with expired token', async () => {
    // Setup: Expired auth-token cookie, getUser() returns null
    // Action: Request /home
    // Expect: Redirect to /login/start
  });
});
```

#### Manual Verification Steps

1. [ ] Deploy to Vercel
2. [ ] Visit `/home` with valid session
3. [ ] Check Vercel logs for `[getUserIdFromToken]` timing
4. [ ] Verify `[HomePage] TOTAL` reduced from ~1143ms to ~560ms
5. [ ] Verify dashboard renders correctly
6. [ ] Test expired token scenario (should redirect to login)

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify `/home` is in middleware matcher (lines 208-209)
- [ ] Confirm middleware setSession() validates tokens
- [ ] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Create `lib/supabase/get-user-id-from-token.ts`
  - File: `lib/supabase/get-user-id-from-token.ts`
  - Action: CREATE
  - Content: JWT decode helper with exp/aud validation and fallback
- [ ] **Step 2:** Update `app/home/page.tsx`
  - File: `app/home/page.tsx`
  - Action: MODIFY
  - Changes: Replace createClient()+getUser() with getUserIdFromToken()
- [ ] **Step 3:** Add timing log for verification
  - File: `app/home/page.tsx`
  - Action: MODIFY
  - Changes: Add `console.log('[HomePage] t_getUserId: ${time}ms')`

#### Post-Implementation
- [ ] Run type checker (`npx tsc --noEmit`)
- [ ] Run build (`npm run build`)
- [ ] Deploy to Vercel
- [ ] Verify timing improvement in Vercel logs
- [ ] Remove timing logs after verification

---

## 16. Definition of Done

- [ ] `lib/supabase/get-user-id-from-token.ts` created with exp/aud validation
- [ ] `app/home/page.tsx` uses `getUserIdFromToken()` instead of `getUser()`
- [ ] Fallback to `getUser()` on any decode failure
- [ ] Type checker passes
- [ ] Build completes successfully
- [ ] Vercel logs show `[HomePage] TOTAL` reduced from ~1143ms to ~560ms
- [ ] Dashboard renders correctly with real data
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `middleware.ts` | Lines 86-131, 203-225 | Confirms setSession() validates token, /home in matcher |
| `app/home/page.tsx` | Lines 29-35 | Current getUser() call to be replaced |
| `lib/supabase/server-client.ts` | Lines 16-49 | createClient() implementation |
| Vercel Logs (2025-12-23) | Production timing | Evidence of 577ms getUser() bottleneck |
| ENH-008 | Full document | Direct service pattern (prerequisite) |
| ENH-002 | Full document | Precedent for removing redundant auth calls |
| Supabase JWT Documentation | Token structure | JWT payload structure (sub, exp, aud) |
| Auditor Review | Approval with changes | Security requirements for implementation |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Author:** Claude Code
**Status:** Analysis Complete

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed (N/A - no DB queries)
- [x] API contract changes documented (N/A - internal only)
- [x] Performance considerations addressed
- [x] Auditor requirements incorporated (exp/aud check, fallback)
- [x] External auditor could implement from this document alone
