# Login Layout Optimization - Enhancement Documentation

**ID:** ENH-012
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-24
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Follows ENH-010/ENH-011 pattern (Direct Service Pattern)
**Linked Issues:** ENH-010 (Home Page Auth Optimization), ENH-011 (Cron Warmup)

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates. The `/login/*` pages (start, signup, otp, etc.) share a common layout (`login/layout.tsx`) that fetches client configuration (logo, colors, branding) for white-labeling. This layout currently uses an internal `fetch()` to `/api/internal/client-config`, adding 130-380ms overhead per request.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Vercel Serverless
**Architecture Pattern:** Layout → fetch() → API Route → Admin Client → RPC → PostgreSQL

---

## 2. Gap/Enhancement Summary

**What exists:** The `login/layout.tsx` Server Component fetches client configuration via `fetch('/api/internal/client-config')`. This internal fetch creates an additional HTTP round-trip that takes 130-380ms on top of the actual database query (~107-233ms).

**What should exist:** The layout should call the Supabase RPC directly using the admin client, eliminating the fetch overhead.

**Why it matters:** Login pages are the first impression for users. Every login page request pays the 130-380ms penalty:
- Current: ~240-620ms for client config
- After: ~107-233ms (RPC only)
- **Expected savings: 130-380ms per login page load (35-60% faster)**

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/login/layout.tsx` | Lines 18-46 (`getClientConfig`) | Uses `fetch('/api/internal/client-config')` with `cache: 'no-store'` |
| `app/login/layout.tsx` | Lines 22-27 | Constructs API URL from env vars, makes HTTP fetch |
| `app/api/internal/client-config/route.ts` | Lines 36-57 | Creates admin client, calls RPC `auth_get_client_by_id` |
| `app/api/internal/client-config/route.ts` | Lines 48-56 | RPC call is the actual data fetch |
| `lib/supabase/admin-client.ts` | Full file | `createAdminClient()` creates service-role client (bypasses RLS) |
| Vercel Logs (2025-12-24 10:42-44) | Production timing | Confirmed 130-380ms fetch overhead |
| `middleware.ts` | Lines 212-213 | Login routes excluded from auth middleware (public pages) |

### Key Evidence

**Evidence 1:** Timing logs show fetch overhead
- Source: Vercel Production Logs, Dec 24 2025
- Measurements:
  ```
  Request 1:
  [TIMING][/api/internal/client-config] rpc(): 107ms, TOTAL: 109ms
  [TIMING][LoginLayout] fetch(client-config): 241ms
  Fetch overhead: 132ms

  Request 2 (cold):
  [TIMING][/api/internal/client-config] rpc(): 233ms, TOTAL: 237ms
  [TIMING][LoginLayout] fetch(client-config): 615ms
  Fetch overhead: 378ms
  ```
- Implication: Internal fetch adds 130-380ms overhead

**Evidence 2:** API route simply wraps admin client + RPC
- Source: `app/api/internal/client-config/route.ts` lines 36-56
- Code:
  ```typescript
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('auth_get_client_by_id', {
    p_client_id: clientId,
  })
  ```
- Implication: No business logic in API route - can call RPC directly from layout

**Evidence 3:** Login pages are public (no auth required)
- Source: `middleware.ts` lines 72-77 (publicPaths includes `/login/:path*`)
- Source: `app/api/internal/client-config/route.ts` line 22-24 (uses x-internal-request header, not auth)
- Implication: Must use admin client (service role) to bypass RLS since users aren't authenticated

**Evidence 4:** Admin client is synchronous and available
- Source: `lib/supabase/admin-client.ts`
- Code:
  ```typescript
  export function createAdminClient(): SupabaseClient<Database> {
    return createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { ... }
    )
  }
  ```
- Implication: Can call `createAdminClient()` directly in layout (sync, no await needed)
- **Security Note:** `SUPABASE_SERVICE_ROLE_KEY` is only used server-side (Server Component). It is NOT prefixed with `NEXT_PUBLIC_` so it won't leak to the client bundle. This is safe because `layout.tsx` is a Server Component (no "use client" directive).

**Evidence 5:** RPC function exists and handles tenant lookup
- Source: Database RPC `auth_get_client_by_id` (baseline.sql:257-264)
- Purpose: Bypasses RLS to get client by ID (needed for unauthenticated requests)
- Returns: `id`, `name`, `subdomain`, `logo_url`, `primary_color` - exactly what layout needs
- SQL Definition:
  ```sql
  CREATE OR REPLACE FUNCTION auth_get_client_by_id(p_client_id UUID)
  RETURNS TABLE (id UUID, name VARCHAR, subdomain VARCHAR, logo_url TEXT, primary_color VARCHAR)
  LANGUAGE sql STABLE SECURITY DEFINER
  ```
- TypeScript types verified in `lib/types/database.ts:1465-1468`
- Already used by `clientRepository.findById()` (clientRepository.ts:89-94)

---

## 4. Business Justification

**Business Need:** Reduce login page load time by 130-380ms by eliminating internal fetch overhead for client configuration.

**User Stories:**
1. As a new user visiting the signup page, I need the page to load quickly so that I don't abandon the registration process
2. As a returning user on the login page, I need fast page loads so that I can quickly access my dashboard

**Impact if NOT implemented:**
- Every login page request pays 130-380ms penalty (~35-60% of total time)
- Inconsistent with optimized protected pages (ENH-010)
- Poor first impression for new users

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/login/layout.tsx`
```typescript
// Current flow - fetch to internal API
async function getClientConfig(): Promise<ClientConfig> {
  const t0 = Date.now();
  try {
    const apiUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const t1 = Date.now();
    const response = await fetch(`${apiUrl}/api/internal/client-config`, {
      headers: {
        'x-internal-request': 'true',
      },
      cache: 'no-store',
    })
    console.log(`[TIMING][LoginLayout] fetch(client-config): ${Date.now() - t1}ms`);
    // ... rest of function
  }
}
```

**File:** `app/api/internal/client-config/route.ts`
```typescript
// API route that layout fetches - just wraps admin client
export async function GET(request: NextRequest) {
  // Security check
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const clientId = process.env.CLIENT_ID

  const { data, error } = await supabase.rpc('auth_get_client_by_id', {
    p_client_id: clientId,
  })

  // Transform and return
  return NextResponse.json({
    logoUrl: data[0].logo_url || "/images/fizee-logo.png",
    privacyPolicyUrl: `/api/clients/${clientId}/privacy`,
    clientName: data[0].name || "Rewards Program",
    primaryColor: data[0].primary_color || "#F59E0B"
  })
}
```

**Current Capability:**
- Layout can fetch client config (logo, colors, name)
- Multi-tenant support via CLIENT_ID env var

**Current Limitation (The Gap):**
- Fetch to internal API adds 130-380ms overhead
- Creates unnecessary HTTP round-trip within same serverless function

### Current Data Flow

```
Request to /login/start
  │
  ▼
LoginLayout (Server Component)
  │
  ├── getClientConfig()
  │     │
  │     └── fetch('/api/internal/client-config')  ← 130-380ms overhead
  │           │
  │           ▼
  │         API Route Handler
  │           │
  │           ├── createAdminClient(): ~1ms
  │           └── rpc('auth_get_client_by_id'): ~107-233ms
  │           │
  │           ▼
  │         Return JSON
  │
  ▼
Render page with config
  │
  ▼
Total: 240-620ms for config
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Move the admin client + RPC call directly into the layout's `getClientConfig()` function, eliminating the fetch overhead. Use `createAdminClient()` (service role) to bypass RLS since login pages are public.

### Code Changes

**⚠️ NOTE: The following code modifications are a SPECIFICATION. Changes will be made during implementation.**

**Modified File:** `app/login/layout.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { ClientConfigProvider } from './ClientConfigProvider'
import { createAdminClient } from '@/lib/supabase/admin-client'

// Force dynamic rendering for all login pages
export const dynamic = 'force-dynamic'

interface ClientConfig {
  logoUrl: string
  privacyPolicyUrl: string
  clientName: string
  primaryColor: string
}

/**
 * Server-side fetch for client configuration
 * ENH-012: Direct RPC call (eliminates fetch overhead)
 * Uses admin client to bypass RLS (login pages are public)
 */
async function getClientConfig(): Promise<ClientConfig> {
  const t0 = Date.now();
  try {
    const clientId = process.env.CLIENT_ID

    if (!clientId) {
      console.error('[LoginLayout] CLIENT_ID not configured')
      throw new Error('CLIENT_ID not configured')
    }

    // ENH-012: Direct admin client + RPC (no fetch overhead)
    const t1 = Date.now();
    const supabase = createAdminClient()
    console.log(`[TIMING][LoginLayout] createAdminClient(): ${Date.now() - t1}ms`);

    const t2 = Date.now();
    const { data, error } = await supabase.rpc('auth_get_client_by_id', {
      p_client_id: clientId,
    })
    console.log(`[TIMING][LoginLayout] rpc(auth_get_client_by_id): ${Date.now() - t2}ms`);

    if (error) {
      console.error('[LoginLayout] RPC error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error('[LoginLayout] Client not found:', clientId)
      throw new Error('Client not found')
    }

    const client = data[0]
    const privacyPolicyUrl = `/api/clients/${clientId}/privacy`

    const config = {
      logoUrl: client.logo_url || "/images/fizee-logo.png",
      privacyPolicyUrl,
      clientName: client.name || "Rewards Program",
      primaryColor: client.primary_color || "#F59E0B"
    }

    console.log(`[TIMING][LoginLayout] getClientConfig() TOTAL: ${Date.now() - t0}ms`);
    return config

  } catch (error) {
    console.error('[LoginLayout] Failed to load client config:', error)
    console.log(`[TIMING][LoginLayout] getClientConfig() FAILED: ${Date.now() - t0}ms`);

    // Fallback to defaults (auth flow continues)
    const fallbackClientId = process.env.CLIENT_ID || 'fizee'
    return {
      logoUrl: "/images/fizee-logo.png",
      privacyPolicyUrl: `/api/clients/${fallbackClientId}/privacy`,
      clientName: "Rewards Program",
      primaryColor: "#F59E0B"
    }
  }
}

/**
 * Auth Layout - Wraps all /login/* pages
 * Provides client configuration via React Context
 */
export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getClientConfig()

  return (
    <ClientConfigProvider config={config}>
      {children}
    </ClientConfigProvider>
  )
}
```

**Explanation:**
- Removes: `fetch('/api/internal/client-config')` with URL construction
- Uses: `createAdminClient()` + `supabase.rpc()` directly
- Why admin client: Login pages are PUBLIC (no user auth), need service role to bypass RLS
- Fallback preserved: Same fallback behavior if RPC fails
- Timing logs: Updated to show direct RPC timing instead of fetch timing

### No New Types/Interfaces Required

All types already exist:
- `ClientConfig` interface already defined in layout.tsx
- `createAdminClient()` already typed in `lib/supabase/admin-client.ts`
- RPC `auth_get_client_by_id` already exists in database

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/login/layout.tsx` | MODIFY | Replace fetch() with direct createAdminClient() + rpc() |

### Files NOT Changed (Already Exist)

| File | Reason |
|------|--------|
| `lib/supabase/admin-client.ts` | Already provides createAdminClient() |
| `app/api/internal/client-config/route.ts` | Keep for backwards compatibility (no breaking change) |
| `app/login/ClientConfigProvider.tsx` | No changes needed |

### Dependency Graph

```
app/login/layout.tsx (AFTER MODIFICATION)
├── imports: createAdminClient from @/lib/supabase/admin-client (NEW)
├── imports: ClientConfigProvider (existing)
└── calls: supabase.rpc('auth_get_client_by_id') (direct, no fetch)

REMOVED:
├── fetch('/api/internal/client-config')
└── URL construction from env vars
```

---

## 8. Data Flow After Implementation

```
Request to /login/start
  │
  ▼
LoginLayout (Server Component)
  │
  ├── getClientConfig()
  │     │
  │     ├── createAdminClient(): ~1ms
  │     └── rpc('auth_get_client_by_id'): ~107-233ms
  │     │
  │     ▼
  │   Return config object
  │
  ▼
Render page with config
  │
  ▼
Total: ~110-235ms for config (was 240-620ms)
```

**Savings Breakdown:**
| Removed | Time Saved |
|---------|------------|
| Internal fetch() | ~130-380ms |
| API route handler overhead | ~5-10ms |
| **Total Saved** | **~135-390ms** |

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `clients` | logo_url, name, primary_color | Via RPC `auth_get_client_by_id` |

### Schema Changes Required?
- [x] No - existing schema and RPC support this optimization

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| `rpc('auth_get_client_by_id', p_client_id)` | Yes - passed as parameter | [x] |

**Note:** RPC `auth_get_client_by_id` is designed to bypass RLS (SECURITY DEFINER) specifically for unauthenticated client config lookups.

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | No API changes | - | - |

### Breaking Changes?
- [x] No - internal optimization only
- API route `/api/internal/client-config` kept for backwards compatibility

---

## 11. Performance Considerations

### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Config fetch time | 240-620ms | 110-235ms | 55-62% faster |
| Network calls | 1 (internal fetch) | 0 | Eliminated |
| DB calls | 1 (RPC) | 1 (RPC) | Same |

### Optimization Needed?
- [x] No additional optimization needed - this IS the optimization

---

## 12. Alternative Solutions Considered

### Option A: Cache client config at server startup
- **Description:** Load config once at startup, store in memory
- **Pros:** Even faster (no DB call per request)
- **Cons:** Requires server restart to update config, doesn't work with Vercel serverless
- **Verdict:** ❌ Rejected - doesn't work with serverless architecture

### Option B: Use Next.js cache/revalidate
- **Description:** Keep fetch but add cache headers
- **Pros:** Simple change
- **Cons:** Still pays fetch overhead on cache miss, doesn't solve cold start
- **Verdict:** ❌ Rejected - doesn't eliminate the root cause

### Option C: Direct admin client + RPC (Selected)
- **Description:** Call Supabase RPC directly from layout using admin client
- **Pros:** Eliminates fetch overhead, proven pattern (ENH-010), same DB query
- **Cons:** Slightly more code in layout
- **Verdict:** ✅ Selected - maximum performance gain, consistent with ENH-010 pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Admin client fails | Low | Medium | Fallback to defaults already implemented |
| RPC fails | Low | Medium | Same fallback, error logged |
| Missing SUPABASE_SERVICE_ROLE_KEY | Low | High | Build would fail, caught in deployment |
| Env var CLIENT_ID missing | Low | Medium | Error logged, fallback to defaults |

---

## 14. Testing Strategy

### Unit Tests

Not required - no new logic, only wiring changes. Existing functionality:
- `createAdminClient()` - already tested
- RPC `auth_get_client_by_id` - already tested via API route

### Integration Tests

Not required - same data flow, just direct instead of via fetch.

### Manual Verification Steps

1. [ ] Deploy to Vercel
2. [ ] Visit `/login/start`
3. [ ] Check Vercel logs for timing:
   - [ ] `[TIMING][LoginLayout] createAdminClient()` shows ~1ms
   - [ ] `[TIMING][LoginLayout] rpc(auth_get_client_by_id)` shows ~100-230ms
   - [ ] `[TIMING][LoginLayout] TOTAL` shows ~110-235ms (was 240-620ms)
   - [ ] NO `fetch(client-config)` log (removed)
4. [ ] Verify page renders correctly with logo/colors
5. [ ] Verify all login pages work (/login/signup, /login/otp, etc.)
6. [ ] Check Network tab - no `/api/internal/client-config` request

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm createAdminClient() exists and works
- [ ] **Gate: Verify env vars are set** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_ID)
- [ ] **Gate: Verify RPC shape matches** (`auth_get_client_by_id` returns `logo_url`, `name`, `primary_color`)

### Implementation Steps
- [ ] **Step 1:** Modify `app/login/layout.tsx`
  - File: `app/login/layout.tsx`
  - Action: MODIFY per Section 6 specification
  - Changes:
    - Add import: `createAdminClient` from `@/lib/supabase/admin-client`
    - Remove: fetch() call and URL construction
    - Add: direct `createAdminClient()` + `supabase.rpc()` call
    - Update: timing log labels

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Verify timing in Vercel logs
- [ ] Manual verification per Section 14

---

## 16. Definition of Done

- [ ] `layout.tsx` modified per Section 6 specification
- [ ] Type checker passes
- [ ] Build completes
- [ ] Vercel logs show ~110-235ms total (was ~240-620ms)
- [ ] All login pages render correctly
- [ ] No `/api/internal/client-config` fetch in Network tab
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/login/layout.tsx` | Lines 18-54 | Current implementation to modify |
| `app/api/internal/client-config/route.ts` | Lines 36-57 | Shows RPC pattern to replicate |
| `lib/supabase/admin-client.ts` | Full file | Admin client to use |
| `middleware.ts` | Lines 72-77 | Confirms login pages are public |
| `supabase/migrations/00000000000000_baseline.sql` | Lines 257-264 | RPC `auth_get_client_by_id` definition |
| `lib/types/database.ts` | Lines 1465-1468 | TypeScript types for RPC |
| `lib/repositories/clientRepository.ts` | Lines 89-94 | Existing usage of same RPC pattern |
| Vercel Production Logs (2025-12-24) | Timing entries | Performance measurements |
| `BugFixes/HomePageAuthOptimizationEnhancement.md` | Full document | ENH-010 pattern reference |
| `BugFixes/RewardsHistoryAuthOptimizationEnhancement.md` | Full document | ENH-011 pattern reference |

---

**Document Version:** 1.1 (Audit fixes: env var gates, RPC shape verification, security notes)
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Analysis Complete - Ready for Implementation
