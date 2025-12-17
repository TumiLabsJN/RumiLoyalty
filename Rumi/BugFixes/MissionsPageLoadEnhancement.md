# Missions Page Load Speed Enhancement - Documentation

**ID:** ENH-003
**Type:** Enhancement
**Created:** 2025-12-17
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 9.3.6 from EXECUTION_PLAN.md (Performance Optimization)
**Linked Issues:** ENH-002 (Dashboard Auth Optimization - same pattern)

---

## 1. Project Context

This is a Next.js 14 loyalty/rewards application using TypeScript, Supabase (PostgreSQL), and a layered architecture (Repository → Service → Route). Users earn rewards by completing missions (sales targets, social engagement, raffles). The Missions page displays all available, in-progress, and claimable missions with real-time progress tracking.

The application is multi-tenant with `client_id` filtering enforced at all data access layers. The backend is hosted on Supabase in East US (Ohio), with development/testing from Brazil (São Paulo), resulting in ~150-200ms network latency per round trip.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, TailwindCSS
**Architecture Pattern:** Repository → Service → Route Handler layers

---

## 2. Gap/Enhancement Summary

**What's missing:** The `/api/missions` route makes a redundant `findByAuthId()` database call that adds ~200-500ms latency per request. Additionally, the route is not in the middleware matcher, which could cause auth token refresh issues.

**What should exist:** A streamlined API route that:
1. Passes `authUser.id` directly to downstream services (since `users.id === authUser.id`)
2. Is included in middleware matcher for proper token refresh coverage
3. Achieves ~25% faster response times

**Why it matters:** The Missions page currently takes ~1.2-2.1 seconds to load from Brazil. Users see a skeleton loader for an extended period, degrading UX. US users would also benefit from reduced response times (~250-350ms target).

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/missions/page.tsx` | Lines 1, 58-90 | Client component with single `useEffect` fetch; double-call is React Strict Mode (dev only) |
| `appcode/app/api/missions/route.ts` | Lines 24-158 | Sequential calls: getUser → findByAuthId → getUserDashboard → listAvailableMissions |
| `appcode/app/api/missions/route.ts` | Line 56 | `findByAuthId(authUser.id)` - redundant call, same ID |
| `appcode/lib/repositories/dashboardRepository.ts` | Lines 104-145 | `getUserDashboard` already uses `Promise.all` for parallel queries |
| `appcode/lib/repositories/missionRepository.ts` | Lines 504-617 | `listAvailable` already uses single RPC `get_available_missions` |
| `appcode/lib/services/missionService.ts` | Lines 942-989 | `listAvailableMissions` calls single repository method, no parallelization opportunity |
| `appcode/middleware.ts` | Lines 203-225 | Matcher includes `/api/missions/:path*` but NOT `/api/missions` base route |
| `supabase/migrations/baseline.sql` | `auth_create_user` function | Confirms `users.id = auth.users.id` (same UUID) |
| `BugFixes/DashboardAuthOptimizationEnhancement.md` | Section 6 | Same pattern successfully applied to `/api/dashboard` |
| `PLS.png` (Network waterfall) | Browser DevTools | Shows 1.23s + 2.14s fetch times; double-call from Strict Mode |
| `API_CONTRACTS.md` | Lines 2957-3004 (GET /api/missions) | Response schema MissionsPageResponse; no explicit performance target stated |
| `API_CONTRACTS.md` | Lines 2998-3003 | Pre-computed status field - confirms backend derives status |
| `SchemaFinalv2.md` | Lines 129, 234, 282, 300, 338, 434, 469 | All tables include `client_id` for multi-tenant isolation |
| `SchemaFinalv2.md` | Lines 416-420 | `idx_missions_client`, `idx_missions_lookup` indexes enforce efficient client_id filtering |

### Key Evidence

**Evidence 1:** Redundant `findByAuthId` call in `/api/missions/route.ts`
- Source: `appcode/app/api/missions/route.ts`, Line 56
- Code: `const user = await userRepository.findByAuthId(authUser.id);`
- Implication: Makes unnecessary network round-trip (~200-500ms) when `authUser.id === users.id`

**Evidence 2:** Missing middleware matcher for base route
- Source: `appcode/middleware.ts`, Lines 217-218
- Code: `'/api/missions/:path*',` (matches sub-routes, NOT `/api/missions`)
- Implication: Token refresh won't happen for `/api/missions` without `setSession()` in createClient

**Evidence 3:** Network waterfall showing slow load times
- Source: `PLS.png` screenshot
- Data: Document load 293ms, API fetch 1.23s, second fetch 2.14s
- Implication: API response time is the bottleneck, not page rendering

**Evidence 4:** Internal queries already optimized
- Source: `dashboardRepository.ts` Line 112, `missionRepository.ts` Line 513
- Finding: `Promise.all` and single RPC already in use
- Implication: Only quick win is removing `findByAuthId`

---

## 4. Business Justification

**Business Need:** Reduce Missions page load time to improve user experience and engagement with the rewards program.

**User Stories:**
1. As a loyalty program member, I need the Missions page to load quickly so that I can check my progress and claim rewards without waiting
2. As a mobile user on variable network conditions, I need fast page loads so that the app feels responsive

**Impact if NOT implemented:**
- Users experience 2+ second skeleton loaders, causing frustration
- Higher bounce rates on Missions page
- Perception of slow/unresponsive application
- Inconsistent performance compared to optimized Dashboard (ENH-002)

---

## 5. Current State Analysis

### What Currently Exists

**File:** `appcode/app/api/missions/route.ts`
```typescript
// Current flow - sequential calls with redundant findByAuthId
export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', code: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment
    const clientId = process.env.CLIENT_ID;
    if (!clientId) { /* ... */ }

    // Step 3: REDUNDANT - findByAuthId when authUser.id === users.id
    const user = await userRepository.findByAuthId(authUser.id);  // ~200-500ms
    if (!user) { /* 401 USER_NOT_FOUND */ }

    // Tenant check using user.clientId
    if (user.clientId !== clientId) { /* 403 TENANT_MISMATCH */ }

    // Step 4: Get dashboard data (already optimized with Promise.all)
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId, { includeAllTiers: true });

    // Step 5: Get missions (already optimized with single RPC)
    const missionsResponse = await listAvailableMissions(user.id, clientId, /* ... */);

    return NextResponse.json(missionsResponse, { status: 200 });
  } catch (error) { /* ... */ }
}
```

**File:** `appcode/middleware.ts` (Lines 216-220)
```typescript
// Current matcher - missing /api/missions base route
export const config = {
  matcher: [
    // ...
    '/api/missions/:path*',  // Matches /api/missions/history, NOT /api/missions
    // '/api/missions' is MISSING
  ],
};
```

**Current Capability:**
- ✅ Missions page loads and displays correct data
- ✅ Internal queries use Promise.all and RPC
- ❌ Makes redundant `findByAuthId` call (~200-500ms wasted)
- ❌ Base `/api/missions` route not in middleware matcher

### Current Data Flow

```
Request → createClient() → getUser()
                              ↓
                         authUser.id
                              ↓
              findByAuthId(authUser.id) ← REDUNDANT (~200-500ms)
                              ↓
                           user.id (same as authUser.id!)
                              ↓
            getUserDashboard(user.id) ← Already optimized
                              ↓
         listAvailableMissions(user.id) ← Already optimized
                              ↓
                          Response
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Remove the redundant `findByAuthId()` call and pass `authUser.id` directly to downstream services. Add `/api/missions` to middleware matcher for token refresh coverage. Apply the same pattern proven in ENH-002 (Dashboard Auth Optimization).

### Code to Modify

**⚠️ NOTE: The following code is a SPECIFICATION for modifications.**

**File:** `appcode/middleware.ts`
```typescript
// SPECIFICATION - ADD /api/missions to matcher
export const config = {
  matcher: [
    // ... existing routes ...
    '/api/missions/:path*',
    '/api/missions',  // ADD THIS LINE
  ],
};
```

**File:** `appcode/app/api/missions/route.ts`
```typescript
// SPECIFICATION - SIMPLIFIED ROUTE
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { listAvailableMissions } from '@/lib/services/missionService';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/missions
 *
 * Returns all missions for the Missions page with pre-computed status,
 * progress tracking, and formatted display text.
 *
 * MAINTAINER NOTES:
 * 1. This route MUST remain in middleware.ts matcher for token refresh to work.
 *    If removed from matcher, requests will 401 because setSession() was removed.
 * 2. If dashboardData is null, we return 500 (not 401) because:
 *    - users.id = authUser.id (created atomically in auth_create_user)
 *    - A missing users row indicates data corruption, not a user action error
 *    - Do NOT reintroduce 401/USER_NOT_FOUND here; investigate the corruption instead
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', code: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Step 3: Get dashboard data - pass authUser.id directly
    // REMOVED: findByAuthId() call - users.id === authUser.id (same UUID)
    // REMOVED: Tenant mismatch check - RPC enforces via WHERE client_id = p_client_id
    const dashboardData = await dashboardRepository.getUserDashboard(
      authUser.id,  // Use authUser.id directly
      clientId,
      { includeAllTiers: true }
    );

    if (!dashboardData) {
      // NOTE: This is data corruption (user row missing), not a user error
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'USER_DATA_ERROR', message: 'Failed to load user data.' },
        { status: 500 }
      );
    }

    // Step 4: Build tier lookup map
    const tierLookup = new Map<string, { name: string; color: string }>();
    if (dashboardData.allTiers) {
      for (const tier of dashboardData.allTiers) {
        tierLookup.set(tier.id, { name: tier.name, color: tier.color });
      }
    }

    // Step 5: Get missions from service
    const missionsResponse = await listAvailableMissions(
      authUser.id,  // Use authUser.id directly
      clientId,
      {
        handle: dashboardData.user.handle ?? '',
        currentTier: dashboardData.currentTier.id,
        currentTierName: dashboardData.currentTier.name,
        currentTierColor: dashboardData.currentTier.color,
      },
      dashboardData.client.vipMetric as 'sales' | 'units',
      tierLookup
    );

    return NextResponse.json(missionsResponse, { status: 200 });

  } catch (error) {
    console.error('[Missions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
```

**Explanation:**
1. Remove `userRepository` import (no longer needed)
2. Remove `findByAuthId()` call and associated user validation
3. Remove tenant mismatch check (RPC enforces this via `WHERE client_id`)
4. Pass `authUser.id` directly to `getUserDashboard` and `listAvailableMissions`
5. Return 500 for null dashboardData (data corruption, not user error)

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `appcode/middleware.ts` | MODIFY | Add `/api/missions` to matcher array |
| `appcode/app/api/missions/route.ts` | MODIFY | Remove findByAuthId, remove userRepository import, pass authUser.id directly |

### Dependency Graph

```
appcode/app/api/missions/route.ts (MODIFY)
├── REMOVE import: userRepository
├── KEEP import: createClient, dashboardRepository, listAvailableMissions
├── REMOVE call: userRepository.findByAuthId()
└── MODIFY call: getUserDashboard(authUser.id, ...) instead of user.id

appcode/middleware.ts (MODIFY)
└── ADD to matcher: '/api/missions'
```

---

## 8. Data Flow After Implementation

```
Request → createClient() → getUser()
                              ↓
                         authUser.id
                              ↓
            getUserDashboard(authUser.id) ← Direct pass (no findByAuthId)
                              ↓
         listAvailableMissions(authUser.id) ← Direct pass
                              ↓
                          Response

Time saved: ~200-500ms per request (one fewer network round-trip)
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, client_id, tiktok_handle, current_tier, checkpoint_* | User data via getUserDashboard |
| `tiers` | tier_id, tier_name, tier_color, tier_order, client_id | Tier lookup via getUserDashboard |
| `missions` | (via RPC) | Mission data via get_available_missions RPC |
| `mission_progress` | (via RPC) | Progress tracking via RPC |
| `rewards` | (via RPC) | Reward details via RPC |

### Schema Changes Required?
- [x] No - existing schema supports this feature

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| getUserDashboard | Yes - `.eq('client_id', clientId)` | [x] Line 137 in dashboardRepository.ts |
| get_available_missions RPC | Yes - `p_client_id` parameter | [x] Line 515 in missionRepository.ts |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `GET /api/missions` | INTERNAL | 401 USER_NOT_FOUND if user row missing | 500 USER_DATA_ERROR if user row missing |
| `GET /api/missions` | INTERNAL | 403 TENANT_MISMATCH if user.clientId !== clientId | 500 USER_DATA_ERROR (RPC returns null) |

### Breaking Changes?
- [x] No - Response shape unchanged, only internal optimization and edge case error code change

### ⚠️ INTENTIONAL ERROR CONTRACT CHANGE

**Previous behavior:**
- 401 USER_NOT_FOUND: If `findByAuthId` returns null (user row missing)
- 403 TENANT_MISMATCH: If `user.clientId !== clientId` (wrong tenant)

**New behavior:**
- 500 USER_DATA_ERROR: If `getUserDashboard` returns null (covers both cases)

**Rationale:**
1. If `authUser` exists (Supabase Auth validated), then `users` row SHOULD exist (created atomically in `auth_create_user`)
2. A missing row or tenant mismatch at this point indicates **data corruption**, not a user action error
3. 500 is appropriate for data integrity issues (requires developer investigation)
4. The 401 "Please sign up" message was misleading for this corruption scenario
5. Matches pattern established in ENH-002 (Dashboard Auth Optimization)

**Consumer impact:**
- Frontend shows generic error message regardless of 401/403/500
- No user-facing behavior change
- Debugging/logging now correctly indicates data corruption vs auth failure

**Decision:** ✅ Accepted - 500 is semantically correct for data corruption scenarios

---

## 11. Performance Considerations

### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API response time (Brazil) | ~1200-1400ms | ~900-1100ms | ~25% faster |
| API response time (US) | ~400ms | ~250-350ms | ~30% faster |
| Network round-trips | 4 | 3 | -1 round-trip |
| Page load time (Brazil) | ~2.0s | ~1.2s | ~40% faster |

### Optimization Needed?
- [x] No - This IS the optimization
- [ ] Future: Consider single RPC combining getUserDashboard + listAvailableMissions if still slow

---

## 12. Alternative Solutions Considered

### Option A: React Strict Mode Double-Fetch Fix
- **Description:** Disable Strict Mode or add fetch deduplication
- **Pros:** Eliminates dev double-call
- **Cons:** Double-call is dev-only; production unaffected; hiding potential bugs
- **Verdict:** ❌ Rejected - Not a production issue, Strict Mode helps catch bugs

### Option B: Parallelize getUserDashboard + listAvailableMissions
- **Description:** Run both calls with Promise.all
- **Pros:** Could save time if calls were independent
- **Cons:** They're NOT independent - listAvailableMissions needs currentTier from getUserDashboard
- **Verdict:** ❌ Rejected - Data dependency prevents parallelization

### Option C: Remove findByAuthId (Selected)
- **Description:** Pass authUser.id directly, add route to middleware matcher
- **Pros:** Saves ~200-500ms, proven pattern from ENH-002, minimal code change
- **Cons:** Requires middleware matcher update, changes edge case error code
- **Verdict:** ✅ Selected - Quick win with proven pattern

### Option D: Single RPC for entire missions page
- **Description:** Create get_missions_page_data RPC combining all queries
- **Pros:** Maximum performance, single network call
- **Cons:** More SQL to maintain, higher implementation effort
- **Verdict:** ⏸️ Deferred - Consider if Option C doesn't meet targets

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Token refresh fails without middleware matcher | High | High | Add `/api/missions` to matcher BEFORE removing findByAuthId |
| authUser.id !== users.id assumption breaks | Low | High | Document assumption; auth_create_user enforces equality |
| Edge case 401→500 change confuses debugging | Low | Low | Add maintainer notes in code comments |

---

## 14. Testing Strategy

### Unit Tests

> Note: Existing service/repository tests cover data transformation. This change is route-level optimization.

### Integration Tests

> Note: Manual testing sufficient for this optimization.

### Manual Verification Steps

1. [ ] Start dev server
2. [ ] Login as test user
3. [ ] Navigate to /missions
4. [ ] Verify page loads with correct data
5. [ ] Check terminal for response times (~900-1100ms Brazil, ~250-350ms US)
6. [ ] Verify no `[findByAuthId]` timing logs (removed)
7. [ ] Clear cookies, access /missions → should redirect to login

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand this document
- [ ] Verify middleware.ts matcher currently missing `/api/missions`
- [ ] Verify `findByAuthId` exists in current route

### Implementation Steps
- [ ] **Step 1:** Add `/api/missions` to middleware matcher
  - File: `appcode/middleware.ts`
  - Action: MODIFY - Add `'/api/missions',` to matcher array
- [ ] **Step 2:** Simplify missions route
  - File: `appcode/app/api/missions/route.ts`
  - Action: MODIFY - Remove userRepository import, remove findByAuthId, pass authUser.id directly

### Post-Implementation
- [ ] Run type checker (`npx tsc --noEmit`)
- [ ] Run build (`npm run build`)
- [ ] Manual verification (load /missions, verify data)
- [ ] Verify response time improvement

---

## 16. Definition of Done

- [ ] `/api/missions` added to middleware matcher (PREREQUISITE)
- [ ] `findByAuthId()` removed from missions route
- [ ] `userRepository` import removed from missions route
- [ ] `authUser.id` passed directly to getUserDashboard and listAvailableMissions
- [ ] Maintainer notes added to route comments
- [ ] Type checker passes
- [ ] Build completes
- [ ] Missions page loads correctly with all data
- [ ] Auth redirect works when not logged in
- [ ] Response time reduced by ~200-500ms
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/app/missions/page.tsx` | Lines 1, 58-90 | Understand client-side fetch pattern |
| `appcode/app/api/missions/route.ts` | Full file (159 lines) | Current route implementation to modify |
| `appcode/lib/repositories/dashboardRepository.ts` | Lines 104-200 | Verify getUserDashboard uses Promise.all |
| `appcode/lib/repositories/missionRepository.ts` | Lines 504-617 | Verify listAvailable uses RPC |
| `appcode/lib/services/missionService.ts` | Lines 942-989 | Understand listAvailableMissions flow |
| `appcode/middleware.ts` | Lines 203-225 | Current matcher configuration |
| `supabase/migrations/baseline.sql` | auth_create_user function | Confirms users.id = authUser.id |
| `BugFixes/DashboardAuthOptimizationEnhancement.md` | Full document | Same pattern reference |
| `PLS.png` | Network waterfall screenshot | Performance baseline evidence |
| `API_CONTRACTS.md` | Lines 2957-3004 | GET /api/missions response schema and contract |
| `SchemaFinalv2.md` | Lines 129-469 | client_id column definitions and indexes for multi-tenant isolation |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-17
**Author:** Claude Code
**Status:** Analysis Complete

**Changelog:**
- v1.1: Added API_CONTRACTS.md and SchemaFinalv2.md to source documents; added explicit 401/403→500 contract change documentation
- v1.0: Initial specification

---

## Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (not Bug or Feature Gap)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as specifications
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for modifications
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (edge case error code)
- [x] Performance considerations addressed with before/after metrics
- [x] External auditor could implement from this document alone
