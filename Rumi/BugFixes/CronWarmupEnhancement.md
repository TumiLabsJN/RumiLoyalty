# Cron Warmup - Enhancement Documentation

**ID:** ENH-011
**Type:** Enhancement (Performance / Cold Start Mitigation)
**Created:** 2025-12-23
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** ENH-008, ENH-009, ENH-010 (Page Performance Optimizations)
**Linked Issues:** None

---

## 1. Project Context

Rumi is a creator loyalty platform built with Next.js 14, TypeScript, and Supabase. The application runs on Vercel serverless functions with Fluid compute. After extended periods of inactivity (~8 hours), cold starts result in 3+ second page load times due to:
- Vercel serverless function initialization
- Supabase Auth connection establishment
- Supabase Database connection pool warming

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Auth), Vercel (Fluid compute)
**Architecture Pattern:** Server Components with direct service calls (ENH-008/009/010 pattern)

---

## 2. Gap/Enhancement Summary

**What's missing:** No mechanism exists to keep serverless functions and database connections warm during periods of low traffic.

**What should exist:** A cron job that runs every 2 minutes, hitting all application pages with authenticated requests to prevent cold starts.

**Why it matters:** First user of the day (after ~8 hours inactivity) experiences 3+ second load times. This creates poor UX at a critical first-impression moment.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Vercel Logs (2025-12-23) | Home page cold start | 3s+ load after 8 hours inactivity |
| Vercel Logs (2025-12-23) | Home page warm | 634ms server, 1.5s browser after 1 hour |
| Vercel Logs (2025-12-23) | Home page hot | 198ms server, 694ms browser after minutes |
| `app/api/cron/daily-automation/route.ts` | Lines 1-377 | Existing cron pattern with `withCronAuth` |
| `lib/utils/cronAuth.ts` | Lines 1-171 | CRON_SECRET validation pattern |
| `lib/supabase/server-client.ts` | Lines 1-60 | Supabase client creation pattern |
| Vercel Pricing Docs | Fluid compute | 1M invocations included on Hobby plan |
| `app/` directory | Page structure | 14 pages total (6 auth-protected, 8 public) |

### Key Evidence

**Evidence 1:** Cold Start Timing Degradation
```
After ~1 hour:  Server 634ms, Browser 1.5s
After ~8 hours: Server ???ms, Browser 3s+
```
- Source: User-reported Vercel logs
- Implication: Longer inactivity = worse cold starts (Supabase connections fully cold)

**Evidence 2:** Existing Cron Infrastructure
```typescript
// app/api/cron/daily-automation/route.ts
export const GET = withCronAuth(async () => {
  // Cron job protected by CRON_SECRET
});
```
- Source: daily-automation/route.ts lines 101-377
- Implication: Pattern exists for secure cron endpoints

**Evidence 2b:** Vercel Cron Auth Mechanism
```
Vercel cron automatically injects: Authorization: Bearer ${CRON_SECRET}
withCronAuth (cronAuth.ts:45-57) validates this exact format
No manual header configuration needed in vercel.json
```
- Source: [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- Implication: Existing `withCronAuth` works out-of-the-box with Vercel cron

**Evidence 3:** Cost Analysis
```
14 pages × 30 pings/hour × 24 hours × 30 days = 302,400 invocations/month
Hobby plan includes: 1,000,000 invocations
Cost: $0 (within free tier)
```
- Source: Vercel pricing documentation
- Implication: Warmup cron is cost-effective

**Evidence 4:** Auth-Protected vs Public Pages
```
Auth-protected (need credentials):
- /home, /missions, /missions/missionhistory
- /rewards, /rewards/rewardshistory, /tiers

Public (no auth needed):
- /login/start, /login/signup, /login/otp
- /login/forgotpw, /login/resetpw, /login/loading
- /login/wb, /login/welcomeunr
```
- Source: `find app -name "page.tsx"` analysis
- Implication: Need two warmup strategies (authenticated + public)

---

## 4. Business Justification

**Business Need:** Eliminate 3+ second cold starts for the first user of the day.

**User Stories:**
1. As the first user of the day, I need fast page loads so that I don't abandon the app before it renders.
2. As a creator checking my rewards, I need consistent performance regardless of when I visit.

**Impact if NOT implemented:**
- First user of day experiences 3s+ load (poor first impression)
- Users may abandon before page loads
- Inconsistent perceived performance

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `app/api/cron/daily-automation/route.ts`
```typescript
// Existing cron pattern - runs once daily at 2 PM EST
export const GET = withCronAuth(async () => {
  // Heavy daily processing (sales sync, tier calculation)
});
```

**File:** `lib/utils/cronAuth.ts`
```typescript
// Secure cron authentication
export function withCronAuth(handler) {
  return async (request) => {
    const isValid = validateCronSecret(request);
    if (!isValid) return 401;
    return handler(request);
  };
}
```

**Current Capability:**
- ✅ Secure cron endpoint pattern exists
- ✅ CRON_SECRET validation implemented
- ❌ No warmup cron exists
- ❌ No mechanism to authenticate and hit protected pages

#### Current Data Flow

```
User visits after 8 hours
        ↓
Vercel function cold start (~500ms)
        ↓
Supabase Auth connection cold (~500ms)
        ↓
Supabase DB connection cold (~500ms)
        ↓
RPC query execution (~500ms)
        ↓
Total: 2-3+ seconds
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Create a cron warmup endpoint that:
1. Runs every 2 minutes via Vercel cron
2. Authenticates as a service account to get session cookies
3. Fetches each protected page with cookies (warms full code path)
4. Fetches each public page without cookies
5. Logs timing for monitoring

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `app/api/cron/warmup/route.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
/**
 * Cron Warmup Route
 *
 * Keeps serverless functions and Supabase connections warm.
 * Runs every 2 minutes via Vercel cron.
 *
 * Security: Protected by CRON_SECRET (withCronAuth)
 *
 * AUDIT v1.1 FIXES:
 * - Use anon client for signIn (not admin/service-role)
 * - Use correct cookie names: auth-token, auth-refresh-token (matches middleware.ts:80-82)
 * - Warmup user must exist in public.users with matching CLIENT_ID
 */

import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { createClient } from '@supabase/supabase-js';

// Pages to warm up
const PROTECTED_PAGES = [
  '/home',
  '/missions',
  '/missions/missionhistory',
  '/rewards',
  '/rewards/rewardshistory',
  '/tiers',
];

const PUBLIC_PAGES = [
  '/login/start',
  '/login/signup',
  '/login/otp',
  '/login/forgotpw',
  '/login/resetpw',
  '/login/loading',
  '/login/wb',
  '/login/welcomeunr',
];

interface WarmupResult {
  page: string;
  status: number;
  timeMs: number;
  error?: string;
}

export const GET = withCronAuth(async () => {
  const timestamp = new Date().toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl) {
    return NextResponse.json({
      success: false,
      error: 'NEXT_PUBLIC_SITE_URL not configured',
      timestamp,
    }, { status: 500 });
  }

  console.log(`[Warmup] Starting warmup at ${timestamp}`);

  // Step 1: Authenticate as warmup user using ANON client (not admin/service-role)
  // AUDIT v1.1: Use anon key to respect RLS and standard auth flow
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const warmupEmail = process.env.WARMUP_USER_EMAIL;
  const warmupPassword = process.env.WARMUP_USER_PASSWORD;

  if (!warmupEmail || !warmupPassword) {
    return NextResponse.json({
      success: false,
      error: 'WARMUP_USER_EMAIL or WARMUP_USER_PASSWORD not configured',
      timestamp,
    }, { status: 500 });
  }

  // Sign in to get session tokens
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: warmupEmail,
    password: warmupPassword,
  });

  if (authError || !authData.session) {
    console.error('[Warmup] Auth failed:', authError?.message);
    return NextResponse.json({
      success: false,
      error: `Auth failed: ${authError?.message}`,
      timestamp,
    }, { status: 500 });
  }

  // AUDIT v1.1 FIX: Use correct cookie names that middleware expects (middleware.ts:80-82)
  // Middleware looks for 'auth-token' and 'auth-refresh-token', NOT 'sb-access-token'
  const accessToken = authData.session.access_token;
  const refreshToken = authData.session.refresh_token;
  const cookieHeader = `auth-token=${accessToken}; auth-refresh-token=${refreshToken}`;

  const results: WarmupResult[] = [];

  // Step 2: Warm protected pages (with auth cookies)
  for (const page of PROTECTED_PAGES) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        headers: {
          Cookie: cookieHeader,
        },
        cache: 'no-store',
      });
      results.push({
        page,
        status: response.status,
        timeMs: Date.now() - start,
      });
      console.log(`[Warmup] ${page}: ${response.status} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        page,
        status: 0,
        timeMs: Date.now() - start,
        error: errorMsg,
      });
      console.error(`[Warmup] ${page}: ERROR - ${errorMsg}`);
    }
  }

  // Step 3: Warm public pages (no auth needed)
  for (const page of PUBLIC_PAGES) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        cache: 'no-store',
      });
      results.push({
        page,
        status: response.status,
        timeMs: Date.now() - start,
      });
      console.log(`[Warmup] ${page}: ${response.status} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        page,
        status: 0,
        timeMs: Date.now() - start,
        error: errorMsg,
      });
      console.error(`[Warmup] ${page}: ERROR - ${errorMsg}`);
    }
  }

  // Step 4: Sign out to clean up session
  await supabase.auth.signOut();

  // Calculate summary
  const successful = results.filter(r => r.status >= 200 && r.status < 400).length;
  const failed = results.filter(r => r.status === 0 || r.status >= 400).length;
  const avgTimeMs = Math.round(results.reduce((sum, r) => sum + r.timeMs, 0) / results.length);

  console.log(`[Warmup] Complete: ${successful}/${results.length} pages, avg ${avgTimeMs}ms`);

  return NextResponse.json({
    success: failed === 0,
    message: `Warmup complete: ${successful}/${results.length} pages warmed`,
    data: {
      pagesWarmed: successful,
      pagesFailed: failed,
      avgTimeMs,
      results,
    },
    timestamp,
  }, { status: failed === 0 ? 200 : 207 });
});
```

**Explanation:**
- Uses existing `withCronAuth` for security
- Signs in as service account to get valid session
- Fetches each page with appropriate auth
- Signs out to clean up
- Logs timing for monitoring

#### New Configuration

**New File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/warmup",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Explanation:** Runs warmup every 2 minutes.

#### New Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `WARMUP_USER_EMAIL` | Service account email | `warmup@rumi-loyalty.com` |
| `WARMUP_USER_PASSWORD` | Service account password | `<secure-password>` |

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/api/cron/warmup/route.ts` | CREATE | New warmup endpoint |
| `vercel.json` | CREATE | Cron configuration |

#### Dependency Graph

```
/api/cron/warmup (TO BE CREATED)
├── imports: withCronAuth from @/lib/utils/cronAuth
├── imports: createClient from @supabase/supabase-js (with SUPABASE_ANON_KEY)
└── fetches: All 14 application pages

vercel.json (TO BE CREATED)
└── configures: Cron schedule for /api/cron/warmup
    (Vercel auto-injects Authorization: Bearer ${CRON_SECRET} header)
```

---

## 8. Data Flow After Implementation

```
Vercel Cron (every 2 min)
        ↓
GET /api/cron/warmup (with CRON_SECRET)
        ↓
Sign in as service account (Supabase Auth)
        ↓
For each protected page:
  ├── Fetch with session cookies
  └── Page renders → Supabase queries execute → Connections stay warm
        ↓
For each public page:
  └── Fetch without cookies → Page renders → Functions stay warm
        ↓
Sign out, return timing metrics
        ↓
Result: No cold starts for next 2 minutes
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `auth.users` | email, password | Service account authentication |
| `public.users` | id, client_id | Warmup user must exist |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| Auth sign in | N/A (auth.users) | [x] |
| Page fetches | Handled by page code | [x] |

**Note:** Warmup user must belong to the correct client_id for protected pages to render.

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `GET /api/cron/warmup` | NEW | N/A | Warmup endpoint |

#### Breaking Changes?
- [x] No - new endpoint, no existing consumers

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Invocations/month | 302,400 | Yes (under 1M free) |
| Duration per run | ~30-60s | Yes |
| Pages per run | 14 | Yes |

#### Optimization Needed?
- [x] No - within free tier limits

---

## 12. Alternative Solutions Considered

#### Option A: Health Check Endpoint (No Auth)
- **Description:** Simple /api/health endpoint that warms Supabase connection
- **Pros:** Simple, no credentials needed
- **Cons:** Doesn't warm full page code paths, protected pages stay cold
- **Verdict:** ❌ Rejected - doesn't solve the actual problem

#### Option B: Full Page Warmup with Auth (Selected)
- **Description:** Authenticate and fetch all pages including protected ones
- **Pros:** Warms exact code paths users will hit
- **Cons:** Slightly more complex, needs service account
- **Verdict:** ✅ Selected - comprehensive solution

#### Option C: Parallel Fetch
- **Description:** Fetch all pages in parallel for faster warmup
- **Pros:** Faster total warmup time
- **Cons:** Could overwhelm connections, harder to debug
- **Verdict:** ⏸️ Deferred - sequential is fine for MVP, can optimize later

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Service account credentials leak | Low | High | Store in Vercel env vars (encrypted) |
| Warmup fails silently | Medium | Low | Log all results, monitor in Vercel logs |
| Warmup user gets deleted | Low | Medium | Document as system user, never delete |
| Cron exceeds free tier | Very Low | Low | 302k << 1M limit |

---

## 14. Testing Strategy

#### Unit Tests

N/A - Integration endpoint, tested via manual verification.

#### Manual Verification Steps

1. [ ] Deploy warmup endpoint
2. [ ] Trigger manually: `curl -H "Authorization: Bearer $CRON_SECRET" https://app.url/api/cron/warmup`
3. [ ] Verify all 14 pages return 200
4. [ ] Verify timing logs in Vercel
5. [ ] Wait 8 hours, verify first load is <1s (not 3s+)
6. [ ] Check Vercel logs for cron execution every 2 min

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Confirm warmup user exists in Supabase Auth
- [ ] Confirm user exists in `public.users` with `client_id` matching env `CLIENT_ID`
- [ ] Set WARMUP_USER_EMAIL in Vercel env vars
- [ ] Set WARMUP_USER_PASSWORD in Vercel env vars
- [ ] Confirm SUPABASE_URL and SUPABASE_ANON_KEY are set (should already exist)

#### Implementation Steps
- [ ] **Step 1:** Create `/app/api/cron/warmup/route.ts`
  - File: `app/api/cron/warmup/route.ts`
  - Action: CREATE
- [ ] **Step 2:** Create `vercel.json` with cron config
  - File: `vercel.json`
  - Action: CREATE

#### Post-Implementation
- [ ] Deploy to Vercel
- [ ] Trigger warmup manually to test
- [ ] Verify cron runs every 2 minutes in Vercel logs
- [ ] Monitor for 24 hours
- [ ] Test cold start after 8 hours

---

## 16. Definition of Done

- [ ] Warmup endpoint created and deployed
- [ ] Cron configured to run every 2 minutes
- [ ] Service account created and configured
- [ ] All 14 pages return 200 on warmup
- [ ] Timing logs visible in Vercel
- [ ] First user of day experiences <1.5s load (not 3s+)
- [ ] Invocations stay under 1M/month
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/api/cron/daily-automation/route.ts` | Full file | Existing cron pattern |
| `lib/utils/cronAuth.ts` | Lines 45-57, 88-121 | CRON_SECRET validation (expects Bearer header) |
| `@supabase/supabase-js` | createClient | Anon client for auth (not admin) |
| [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs) | Auth section | Confirms auto Bearer injection |
| Vercel Pricing Docs | Fluid compute invocations | Cost analysis |
| User Vercel Logs (2025-12-23) | Home page timing | Cold start evidence |

---

**Document Version:** 1.2 (Audit v2 fixes: cron auth clarification, dependency graph)
**Last Updated:** 2025-12-23
**Author:** Claude Code
**Status:** Approved - Ready for Implementation

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (Performance)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (cron infrastructure)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented
- [x] Performance considerations addressed (302k invocations/month)
- [x] External auditor could implement from this document alone
