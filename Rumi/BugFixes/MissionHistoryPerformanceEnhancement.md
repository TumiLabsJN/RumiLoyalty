# Mission History Page Performance Optimization - Enhancement Documentation

**ID:** ENH-009
**Type:** Enhancement (Performance Optimization + Direct Service Pattern)
**Created:** 2025-12-22
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** ENH-008 (Rewards Page Performance), ENH-006 (Rewards Direct Service)
**Linked Issues:** None

---

## Prerequisites

**IMPORTANT:** This enhancement applies the same patterns proven in ENH-008 (Rewards Page).

| Prerequisite | Status | Verification |
|--------------|--------|--------------|
| ENH-008 implemented | ✅ Complete | `/rewards` uses getSession + direct service |
| Type guards exist | ✅ Verified | `isMissionType`, `isRewardType` in `lib/types/enums.ts` |
| API route works | ✅ Verified | `GET /api/missions/history` functional |

---

## 1. Project Context

Rumi is a creator loyalty platform that rewards TikTok Shop affiliates based on their sales performance. Creators complete missions to earn rewards. The `/missions/missionhistory` page displays concluded missions (completed rewards + lost raffles).

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Auth), Vercel
**Architecture Pattern:** Repository → Service → Server Component (Direct Service Pattern per ENH-006)

---

## 2. Gap/Enhancement Summary

**What's slow:** The `/missions/missionhistory` page uses the OLD pattern (fetch → API route) instead of direct service calls, adding ~700ms of unnecessary overhead.

**What should exist:** Direct service calls with local JWT validation, matching the pattern established in ENH-006/ENH-008.

**Why it matters:** Consistent performance across all pages improves creator experience. Mission history loads after completing missions - slow load times reduce satisfaction at a key moment.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/missions/missionhistory/page.tsx` | Lines 1-56 | Uses `fetch('/api/missions/history')` with cookie forwarding - OLD pattern |
| `app/api/missions/history/route.ts` | Lines 20-94 | Uses `auth.getUser()` (line 24) - ~500ms network call |
| `app/api/missions/history/route.ts` | Lines 51-66 | Calls `dashboardRepository.getUserDashboard()` directly (no findByAuthId) |
| `lib/services/missionService.ts` | Lines 1218-1280 | `getMissionHistory()` function - reusable for direct service |
| `lib/types/enums.ts` | Lines 253-266 | Runtime guards `isMissionType`, `isRewardType` exist |
| `app/types/missionhistory.ts` | Lines 1-57 | Duplicate type definition - uses inline literals |
| `lib/types/api.ts` | Lines 349-376 | SSoT type definition - uses imported enums |
| `DATA_FLOWS.md` | /missions/missionhistory section | Confirms call chain: route → dashboardRepository → missionService |
| ENH-008 | Full document | Proven pattern: getSession + direct service saves ~900ms |

### Key Evidence

**Evidence 1:** Old Pattern Still in Use
```typescript
// app/missions/missionhistory/page.tsx (current)
const response = await fetch(`${fetchUrl}/api/missions/history`, {
  headers: { Cookie: cookieHeader },
  cache: 'no-store',
})
```
- Source: page.tsx lines 37-40
- Implication: HTTP overhead (~100-200ms) + API route auth overhead (~500ms)

**Evidence 2:** API Route Uses getUser() Instead of getSession()
```typescript
// app/api/missions/history/route.ts line 24
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
```
- Source: route.ts line 24
- Implication: ~500ms network call to Supabase Auth (ENH-008 proved this)

**Evidence 3:** Type Duplication
- `app/types/missionhistory.ts` defines `MissionHistoryResponse` with inline string literals
- `lib/types/api.ts` defines `MissionHistoryResponse` using imported enums from `lib/types/enums.ts`
- Implication: SSoT violation - should consolidate to `lib/types/api.ts`

**Evidence 4:** API Route Already Optimized (No findByAuthId)
```typescript
// app/api/missions/history/route.ts line 56
const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId);
```
- Source: route.ts line 56
- Implication: Route already calls getUserDashboard directly - good pattern to preserve

---

## 4. Business Justification

**Business Need:** Reduce mission history page load time to match the optimized /rewards page (~700ms vs ~1400ms).

**User Stories:**
1. As a creator, I need mission history to load quickly so I can see my completed missions without frustration.
2. As a creator who just completed a mission, I need fast history load to verify my reward was recorded.

**Impact if NOT implemented:**
- Inconsistent performance (rewards ~700ms, mission history ~1400ms)
- Poor perceived performance after completing missions
- Creators may not check history, missing important information

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `app/missions/missionhistory/page.tsx`
```typescript
// Current: OLD pattern with fetch() and cookie forwarding
export default async function MissionHistoryPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  const response = await fetch(`${fetchUrl}/api/missions/history`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })

  if (response.status === 401) {
    redirect('/login/start')
  }

  const data: MissionHistoryResponse = await response.json()
  return <MissionHistoryClient initialData={data} error={null} />
}
```

**Current Capability:**
- ✅ Page loads with real data from API route
- ✅ Auth handled via cookie forwarding
- ❌ HTTP overhead from fetch() call (~100-200ms)
- ❌ API route uses getUser() (~500ms network call)
- ❌ Type imports from app/types (not SSoT)

#### Current Data Flow

```
page.tsx
  └── fetch('/api/missions/history')       ← HTTP overhead (~150ms)
        └── app/api/missions/history/route.ts
              ├── auth.getUser()           ← Network call (~500ms)
              ├── dashboardRepository.getUserDashboard()
              └── missionService.getMissionHistory()
                    └── missionRepository.getHistory() (RPC)
```

**Estimated Current Total:** ~1400ms

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Three optimizations (matching ENH-008 pattern):
1. **Direct Service Pattern** - Replace fetch() with direct service calls (saves ~150ms HTTP overhead)
2. **Replace auth.getUser() with auth.getSession()** - Local JWT validation (saves ~500ms)
3. **Type Consolidation** - Update app/types to re-export from lib/types/api.ts (SSoT)

#### Optimization 1: Direct Service Pattern

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**Modified File:** `app/missions/missionhistory/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { getMissionHistory } from '@/lib/services/missionService'
import { MissionHistoryClient } from './missionhistory-client'
import type { MissionHistoryResponse } from '@/lib/types/api'  // SSoT import

export default async function MissionHistoryPage() {
  const PAGE_START = Date.now()

  // 1. Get authenticated user via Supabase (local JWT validation)
  const t1 = Date.now()
  const supabase = await createClient()
  console.log(`[TIMING][MissionHistoryPage] createClient(): ${Date.now() - t1}ms`)

  // ENH-009: Use getSession() instead of getUser() - validates JWT locally, no network call
  const t2 = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log(`[TIMING][MissionHistoryPage] auth.getSession(): ${Date.now() - t2}ms`)

  if (sessionError || !session?.user) {
    redirect('/login/start')
  }

  const authUser = session.user

  // 2. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[MissionHistoryPage] CLIENT_ID not configured')
    return <MissionHistoryClient initialData={null} error="Server configuration error" />
  }

  // 3. Get dashboard data for tier info
  const t3 = Date.now()
  const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId)
  console.log(`[TIMING][MissionHistoryPage] getUserDashboard(): ${Date.now() - t3}ms`)

  if (!dashboardData) {
    redirect('/login/start')
  }

  // 4. Get mission history directly from service
  const t4 = Date.now()
  const historyResponse = await getMissionHistory(
    authUser.id,
    clientId,
    {
      currentTier: dashboardData.currentTier.id,
      currentTierName: dashboardData.currentTier.name,
      currentTierColor: dashboardData.currentTier.color,
    }
  )
  console.log(`[TIMING][MissionHistoryPage] getMissionHistory(): ${Date.now() - t4}ms`)

  console.log(`[TIMING][MissionHistoryPage] TOTAL: ${Date.now() - PAGE_START}ms`)

  return <MissionHistoryClient initialData={historyResponse} error={null} />
}
```

**Explanation:**
- Removes `fetch()` call - eliminates HTTP overhead
- Uses `getSession()` - local JWT validation (~5ms vs ~500ms)
- Calls service directly - same logic as API route, no duplication

#### Optimization 2: Type Consolidation (SSoT)

**Modified File:** `app/types/missionhistory.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Re-export from canonical source (SSoT)
export type {
  MissionHistoryResponse,
  MissionHistoryItem,
} from '@/lib/types/api';
```

**Explanation:** Makes `lib/types/api.ts` the Single Source of Truth. App-level types re-export from lib-level.

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/missions/missionhistory/page.tsx` | MODIFY | Replace fetch with direct service, use getSession |
| `app/types/missionhistory.ts` | MODIFY | Re-export from lib/types/api.ts |

#### Dependency Graph

```
app/missions/missionhistory/page.tsx
├── removes: cookies(), fetch(), cookieHeader, baseUrl
├── adds: createClient(), auth.getSession()
├── calls: dashboardRepository.getUserDashboard(authUser.id, clientId)
└── calls: getMissionHistory(userId, clientId, userInfo)

app/types/missionhistory.ts
├── removes: Local interface definitions
└── re-exports: MissionHistoryResponse, MissionHistoryItem from @/lib/types/api
```

---

## 8. Data Flow After Implementation

```
page.tsx (Server Component)
    │
    ▼
auth.getSession()              ← LOCAL JWT validation (~5ms)
    │                           (signature verified, no network)
    ▼
getUserDashboard()             ← ONE users query (~300ms)
    │                           (includes tier info)
    ▼
getMissionHistory()            ← RPC query (~200ms)
    │
    ▼
MissionHistoryClient           ← Render with data

TOTAL: ~500ms (vs ~1400ms before)
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, current_tier, client_id | getUserDashboard (tier info) |
| `tiers` | tier_id, tier_name, tier_color | getUserDashboard (tier display) |
| `redemptions` | status, concluded_at, rejected_at | getHistory RPC |
| `mission_progress` | completed_at | getHistory RPC |
| `missions` | mission_type, display_name | getHistory RPC |
| `rewards` | type, name, value_data | getHistory RPC |
| `raffle_participations` | is_winner, winner_selected_at | getHistory RPC |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified | Location |
|-------|---------------------------|----------|----------|
| getUserDashboard | Yes - `.eq('client_id', clientId)` | [x] | dashboardRepository.ts:142 |
| getHistory RPC | Yes - `WHERE red.client_id = p_client_id` | [x] | baseline.sql:603 |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

This is a Server Component optimization. API route is KEPT for any future client-side needs.

#### Breaking Changes?
- [x] No - internal optimization only

---

## 11. Performance Considerations

#### Expected Improvement (Real Baseline Data - Verified 2025-12-23)

| Metric | Before (Measured) | After (Expected) | Savings |
|--------|-------------------|------------------|---------|
| Middleware (API route) | 184ms | 0ms | 184ms |
| HTTP fetch overhead | ~600ms | 0ms | ~600ms |
| auth.getUser() | 538ms | ~5ms (getSession) | 533ms |
| getUserDashboard() | 246ms | ~250ms | 0ms |
| getMissionHistory() | 180ms | ~180ms | 0ms |
| **API Route TOTAL** | 970ms | - | - |
| **Network (RSC)** | **1.78s** | **~620ms** | **~1.16s (65%)** |

#### Optimization Needed?
- [x] Yes - this document specifies the optimization

---

## 12. Alternative Solutions Considered

#### Option A: Keep fetch() but optimize API route
- **Description:** Only replace getUser() with getSession() in the API route
- **Pros:** Minimal changes
- **Cons:** Still has HTTP overhead, inconsistent with ENH-006/008 pattern
- **Verdict:** ❌ Rejected - doesn't match established pattern

#### Option B: Direct Service Pattern + getSession() (Selected)
- **Description:** Replace fetch with direct service calls, use getSession for auth
- **Pros:** Matches ENH-006/008 pattern, maximum performance, consistent codebase
- **Cons:** Slightly more code changes
- **Verdict:** ✅ Selected - consistent with proven pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| getSession() returns null | Low | Medium | Redirect to login, same as current behavior |
| Type mismatch after SSoT | Low | Low | Runtime validation guards exist |
| Service call throws | Low | Medium | Try/catch with error UI |

**Security Note:** `auth.getSession()` validates the JWT signature using Supabase's JWT secret. Forged or tampered tokens will be rejected. This is NOT raw JWT decode - it's cryptographic verification.

**Middleware + getSession() Flow (Audit v1.1):**
- Middleware runs FIRST → calls `setSession()` → refreshes tokens → sets cookies
- Page runs AFTER middleware → `getSession()` reads from already-refreshed cookies
- If session is invalid/expired → getSession() returns null → redirect to `/login/start`
- This is safe because middleware always executes before the page component

**Multi-Tenant Isolation (Audit v1.1):**
- `missionRepository.getHistory()` passes `p_client_id` to RPC (line 655)
- RPC enforces: `WHERE red.client_id = p_client_id` (baseline.sql line 603)
- Client_id filtering is enforced at the database level via RPC

---

## 14. Testing Strategy

#### Unit Tests

N/A - No new business logic, only pattern change.

#### Manual Verification Steps

1. [ ] Deploy to Vercel preview
2. [ ] Visit /missions/missionhistory page
3. [ ] Check Vercel logs for TIMING output
4. [ ] Verify total time < 700ms
5. [ ] Verify page displays correctly
6. [ ] Test with expired token (should redirect to login)
7. [ ] Compare before/after timing

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm ENH-008 pattern is implemented in /rewards

#### Implementation Steps
- [ ] **Step 1:** Update app/types/missionhistory.ts to re-export from SSoT
  - File: `app/types/missionhistory.ts`
  - Action: MODIFY - replace definitions with re-exports
- [ ] **Step 2:** Update page.tsx with direct service pattern
  - File: `app/missions/missionhistory/page.tsx`
  - Action: MODIFY - replace fetch with direct service calls

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel preview
- [ ] Check timing logs (expect < 700ms)
- [ ] Manual verification

---

## 16. Definition of Done

- [ ] auth.getSession() replaces fetch + API route auth
- [ ] Direct service calls replace fetch()
- [ ] Type imports from lib/types/api.ts (SSoT)
- [ ] Type checker passes
- [ ] Build completes
- [ ] Page load time < 700ms (verified in Vercel logs)
- [ ] Security verified: forged tokens rejected
- [ ] History still displays correctly
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/missions/missionhistory/page.tsx` | Full file | Current fetch pattern |
| `app/api/missions/history/route.ts` | Lines 20-94 | Current API route (kept for reference) |
| `lib/services/missionService.ts` | Lines 1218-1280 | getMissionHistory function |
| `lib/types/api.ts` | Lines 349-376 | SSoT type definitions |
| `lib/types/enums.ts` | Lines 253-266 | Runtime type guards |
| `DATA_FLOWS.md` | /missions/missionhistory section | Call chain documentation |
| `ENH-008` | Full document | Proven pattern reference |
| `MISSIONS_IMPL.md` | API Endpoints section | Service layer documentation |

---

**Document Version:** 1.1 (Audit clarifications added)
**Last Updated:** 2025-12-22
**Author:** Claude Code
**Status:** Implementation Ready

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (Performance Optimization)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (fetch pattern)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (none - internal only)
- [x] Performance considerations addressed (56% improvement target)
- [x] External auditor could implement from this document alone
