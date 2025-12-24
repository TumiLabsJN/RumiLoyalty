# Tiers Page Auth Optimization - Enhancement Documentation

**ID:** ENH-012
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-24
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 9.7 from EXECUTION_PLAN.md, follows ENH-010/ENH-011 pattern
**Linked Issues:** ENH-010 (Home Page Auth Optimization), ENH-011 (Rewards History Auth Optimization)

---

## 1. Project Context

Rumi is a multi-tenant VIP loyalty platform for TikTok Shop affiliates. The `/tiers` page displays the user's current tier, progress to the next tier, and all available VIP tiers with their rewards. The page currently uses mock data and needs to be converted to use the backend. Following the pattern established in ENH-010 and ENH-011, we will use local JWT decode to avoid the ~500ms `auth.getUser()` network call.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL + Auth), Vercel Serverless
**Architecture Pattern:** Middleware → Server Component → Service → Repository → PostgreSQL

---

## 2. Gap/Enhancement Summary

**What exists:** The `/tiers` page is a Client Component using mock data (805 lines, ~390 lines of mock scenarios). The backend is fully implemented (`tierService.getTiersPageData()`) but not connected.

**What should exist:** A Server Component that:
1. Uses `getUserIdFromToken()` to decode the JWT locally (~1ms) - helper already exists from ENH-010
2. Calls `tierService.getTiersPageData()` directly (no fetch/API route overhead)
3. Passes data to a Client Component for rendering

**Why it matters:** The current mock data page shows no real user data. Converting to Server Component with direct service calls (ENH-010 pattern) will:
- Show real user tier progression data
- Achieve optimal performance (~200-400ms total, avoiding ~500ms getUser() + ~200ms findByAuthId())
- Complete Step 9.7 (Tiers Integration) in the execution plan

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/tiers/page.tsx` | Lines 1-40 | Client Component with `"use client"`, uses mock `scenarios` object |
| `app/tiers/page.tsx` | Lines 38-429 | ~390 lines of mock data (2 test scenarios) |
| `app/tiers/page.tsx` | Lines 517-566 | Debug panel for scenario switching |
| `lib/services/tierService.ts` | Lines 441-444 | `getTiersPageData(userId, clientId)` exists and is exported |
| `lib/services/tierService.ts` | Lines 446-452 | Uses `Promise.all()` for 5 parallel repository calls - already optimized |
| `lib/supabase/get-user-id-from-token.ts` | Lines 33-39 | `ALLOWED_PAGE_ROUTES` includes `/tiers` |
| `lib/supabase/get-user-id-from-token.ts` | Lines 43-60 | Security contract JSDoc documents trust boundary |
| `middleware.ts` | Lines 218-219 | Matcher includes `/tiers` and `/tiers/:path*` |
| `app/api/tiers/route.ts` | Lines 21-30 | API route uses `auth.getUser()` + `findByAuthId()` - same bottleneck |
| `TIERS_IMPL.md` | Response Schema (lines 48-93) | `TiersPageResponse` structure documented |
| `DATA_FLOWS.md` | /tiers section | Backend complete, frontend using mock data |
| `SchemaFinalv2.md` | users, tiers, rewards, missions tables | Table definitions for tier data |
| `API_CONTRACTS.md` | Lines 5619-5688 | `TiersPageResponse` API contract schema |

### Key Evidence

**Evidence 1:** Page uses mock data, not connected to backend
- Source: `app/tiers/page.tsx` line 28-29
- Code:
  ```typescript
  const [activeScenario, setActiveScenario] = useState("scenario-1")
  // ... scenarios object with mock data (lines 38-429)
  ```
- Implication: Page shows fake data, needs backend connection

**Evidence 2:** Backend is fully implemented and ready
- Source: `lib/services/tierService.ts` lines 441-444
- Code:
  ```typescript
  export async function getTiersPageData(
    userId: string,
    clientId: string
  ): Promise<TiersPageResponse> {
  ```
- Implication: Service layer ready, just needs to be called from Server Component

**Evidence 3:** JWT helper already includes /tiers route
- Source: `lib/supabase/get-user-id-from-token.ts` lines 33-39
- Code:
  ```typescript
  export const ALLOWED_PAGE_ROUTES = [
    '/home',
    '/missions',
    '/rewards',
    '/tiers',    // Already included!
    '/admin',
  ] as const;
  ```
- Implication: Can reuse ENH-010 helper for /tiers - no helper changes needed

**Evidence 4:** API route has the same bottleneck as other pages
- Source: `app/api/tiers/route.ts` lines 21-30
- Pattern: Uses `supabase.auth.getUser()` + `userRepository.findByAuthId()`
- Implication: Direct service call avoids this ~700ms overhead

**Evidence 5:** Type duplicates exist but are not blocking
- Source: grep for TiersPageResponse
- Locations:
  - `app/types/tiers.ts:9`
  - `lib/services/tierService.ts:92`
  - `lib/types/api.ts:514`
- Implication: Import from service layer (same pattern as ENH-011)

---

## 4. Business Justification

**Business Need:** Convert `/tiers` page from mock data to real backend data with optimized authentication, matching the pattern used on `/home` and `/rewards/rewardshistory`.

**User Stories:**
1. As an affiliate user, I need to see my real tier progression so I can track my progress toward higher commission rates
2. As an affiliate user, I need to see the rewards available at each tier so I can plan my sales goals

**Impact if NOT implemented:**
- Page shows mock data instead of real user tier information
- Inconsistent user experience compared to optimized pages (/home, /rewards)
- Step 9.7 (Tiers Integration) cannot be completed

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/tiers/page.tsx` (805 lines)
```typescript
"use client"
import { useState } from "react"
// ... UI imports

export default function TiersPage() {
  const [activeScenario, setActiveScenario] = useState("scenario-1")
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  const [isProgressCardFlipped, setIsProgressCardFlipped] = useState(false)

  // Mock data scenarios (lines 38-429)
  const scenarios: Record<string, TestScenario> = {
    "scenario-1": { /* Bronze user mock data */ },
    "scenario-2": { /* Silver user mock data */ },
  };

  // UI rendering using mockData...
}
```

**Current Capability:**
- Renders tier UI with flip card, tier progression, rewards
- Uses mock data for 2 test scenarios (Bronze, Silver users)
- Has debug panel for scenario switching

**Current Limitation (The Gap):**
- No connection to backend
- Shows fake data, not real user data
- Client Component with mock data instead of Server Component with direct service

### Current Data Flow

```
page.tsx (Client Component)
  └── useState(scenarios)
        └── Mock data object (hardcoded)
              └── UI renders mock data
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Apply ENH-010/ENH-011 pattern:
1. Create `tiers-client.tsx` Client Component (UI only, receives data via props)
2. Convert `page.tsx` to Server Component
3. Use `getUserIdFromToken()` for local JWT decode (~1ms)
4. Call `tierService.getTiersPageData()` directly (no fetch/API route)
5. Remove mock data and debug panel

### Code Changes

**⚠️ NOTE: The following code modifications are a SPECIFICATION. Changes will be made during implementation.**

**New File:** `app/tiers/tiers-client.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
"use client"

// Move ALL current UI code from page.tsx to this file
// Remove: useState for activeScenario, debugPanelOpen (debug panel)
// Keep: useState for isProgressCardFlipped (UI flip state)
// Add: Props interface for receiving data from Server Component

import { useState } from "react"
// ... UI imports (Card, Button, Icons, etc.)

interface TiersClientProps {
  initialData: TiersPageResponse | null
  error: string | null
}

export function TiersClient({ initialData, error }: TiersClientProps) {
  const [isProgressCardFlipped, setIsProgressCardFlipped] = useState(false)

  // Error state
  if (error) {
    return <PageLayout title="VIP Tiers"><ErrorUI message={error} /></PageLayout>
  }

  // No data state
  if (!initialData) {
    return <PageLayout title="VIP Tiers"><NoDataUI /></PageLayout>
  }

  // Render UI using initialData instead of mockData
  // ... existing UI code ...
}
```

**Modified File:** `app/tiers/page.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { getTiersPageData } from '@/lib/services/tierService'
import { TiersClient } from './tiers-client'

/**
 * Tiers Page (Server Component)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ENH-012: Local JWT decode (no getUser() network call)
 * - Direct service call (no fetch/API route overhead)
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token, refreshes if needed
 * 2. Server Component decodes JWT locally to get user ID (~1ms vs ~500ms)
 * 3. Direct service call for tier data
 *
 * References:
 * - TiersPageAuthOptimizationEnhancement.md (ENH-012)
 * - HomePageAuthOptimizationEnhancement.md (ENH-010 pattern)
 * - DATA_FLOWS.md /tiers section
 */
export default async function TiersPage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const userId = await getUserIdFromToken();

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[TiersPage] CLIENT_ID not configured');
    return <TiersClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get tiers data - direct service call
  try {
    const tiersData = await getTiersPageData(userId, clientId);
    return <TiersClient initialData={tiersData} error={null} />;
  } catch (error) {
    console.error('[TiersPage] Error fetching tier data:', error);
    // User not found or not associated with client
    redirect('/login/start');
  }
}
```

**Explanation:**
- Removes: Client Component pattern, mock data, debug panel, scenario switching
- Adds: Server Component with direct service call
- Uses: `getUserIdFromToken()` (existing ENH-010 helper) for auth
- Pattern: Same as `/home` (ENH-010) and `/rewards/rewardshistory` (ENH-011)

### Security Note: Auth Helper Trust Boundary

**IMPORTANT:** The `getUserIdFromToken()` helper is ONLY safe to use on `/tiers` because:

1. **Middleware runs first:** The Next.js middleware matcher (lines 218-219) includes `/tiers` and `/tiers/:path*`, ensuring `setSession()` validates and refreshes the token BEFORE the Server Component executes.

2. **Helper does NOT verify signature:** `getUserIdFromToken()` only decodes the JWT payload - it does NOT verify the cryptographic signature. The signature was already verified by middleware's `setSession()` call.

3. **Fallback exists:** If local decode fails for any reason (malformed token, expired, invalid audience), the helper falls back to `supabase.auth.getUser()` network call. This fallback is logged:
   ```typescript
   console.warn('[getUserIdFromToken] Decode failed, falling back to getUser():', error);
   ```

4. **Existing logs capture fallback:** The helper already logs fallback scenarios. These will appear in Vercel logs if the fallback path is ever triggered, allowing monitoring without additional instrumentation.

**DO NOT** use `getUserIdFromToken()` on routes not covered by middleware's `setSession()`.

### No New Types/Interfaces Required

All types already exist:
- `getUserIdFromToken()` returns `Promise<string | null>`
- `getTiersPageData()` returns `Promise<TiersPageResponse>`
- `TiersPageResponse` defined in `lib/services/tierService.ts`

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/tiers/page.tsx` | REWRITE | Convert to Server Component, remove 700+ lines of mock data |
| `app/tiers/tiers-client.tsx` | CREATE | Extract UI from page.tsx, remove debug panel |

### Files NOT Changed (Already Exist)

| File | Reason |
|------|--------|
| `lib/supabase/get-user-id-from-token.ts` | Already includes `/tiers` in ALLOWED_PAGE_ROUTES |
| `lib/services/tierService.ts` | Already has `getTiersPageData()` |
| `app/api/tiers/route.ts` | Keep for future client-side refresh/mutations |

### Dependency Graph

```
page.tsx (AFTER MODIFICATION)
├── imports: getUserIdFromToken (existing)
├── imports: getTiersPageData (existing)
└── imports: TiersClient (new)

tiers-client.tsx (NEW FILE)
├── imports: UI components (existing)
├── imports: TiersPageResponse type (from service)
└── exports: TiersClient component

REMOVED:
├── Mock scenarios object (390+ lines)
├── Debug panel (50+ lines)
├── activeScenario useState
└── debugPanelOpen useState
```

---

## 8. Data Flow After Implementation

```
Request
  │
  ▼
Middleware (setSession: ~200ms) ← Token validated here
  │
  ▼
page.tsx (Server Component)
  ├── getUserIdFromToken(): ~1ms    ← LOCAL decode
  └── getTiersPageData(): ~200-300ms
        ├── getUserTierContext()
        ├── getVipSystemSettings()
        ├── getAllTiers()           (5 parallel calls)
        ├── getVipTierRewards()
        └── getTierMissions()
  │
  ▼
TiersClient (receives data as props)
  └── Renders UI
  │
  ▼
Total: ~400ms (estimated)
```

**Comparison to API Route Pattern:**
| Pattern | Auth | Service | Total |
|---------|------|---------|-------|
| API Route (current) | ~700ms (getUser+findByAuthId) | ~300ms | ~1000ms |
| Direct Service (proposed) | ~1ms (getUserIdFromToken) | ~300ms | ~400ms |

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, client_id, current_tier, total_sales, total_units, next_checkpoint_at | Via getUserTierContext() |
| `clients` | id, vip_metric | Via getVipSystemSettings() |
| `tiers` | tier_id, tier_name, tier_color, tier_order, sales_threshold, commission_rate | Via getAllTiers() |
| `rewards` | type, name, description, value_data, tier_eligibility | Via getVipTierRewards() |
| `missions` | tier_eligibility, reward_id | Via getTierMissions() |

### Schema Changes Required?
- [x] No - existing schema supports this feature

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| `getTiersPageData(userId, clientId)` | Yes - passed to all repository calls | [x] |
| `tierRepository.getUserTierContext` | Yes - `.eq('client_id', clientId)` | [x] |
| `tierRepository.getAllTiers` | Yes - `.eq('client_id', clientId)` | [x] |
| `tierRepository.getVipTierRewards` | Yes - `.eq('client_id', clientId)` | [x] |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | No API changes | - | - |

### Breaking Changes?
- [x] No - internal optimization only, no API changes

---

## 11. Performance Considerations

### Expected Load

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Auth calls | ~700ms (getUser+findByAuthId) | ~1ms | ~99% faster |
| Service calls | ~300ms | ~300ms | Same |
| **Total page load** | **~1000ms** | **~400ms** | **60% faster** |

### Optimization Already in Place
- `tierService.getTiersPageData()` uses `Promise.all()` for 5 parallel repository calls

### Optimization Needed?
- [x] No additional optimization needed - service layer already optimized

---

## 12. Alternative Solutions Considered

### Option A: Use fetch() to API Route
- **Description:** Keep page as Client Component, fetch from `/api/tiers`
- **Pros:** Simpler, keeps existing pattern
- **Cons:** Pays ~1000ms penalty (API route uses getUser+findByAuthId)
- **Verdict:** Rejected - misses performance optimization opportunity

### Option B: Server Component + Direct Service + getUserIdFromToken (Selected)
- **Description:** Apply ENH-010/ENH-011 pattern
- **Pros:** Maximum performance (~400ms), proven pattern, consistent with other pages
- **Cons:** More code changes (split into 2 files)
- **Verdict:** Selected - matches established pattern, best performance

### Option C: Server Component + Direct Service + getSession()
- **Description:** Use Supabase's getSession() instead of getUserIdFromToken()
- **Pros:** Simpler, built-in Supabase function
- **Cons:** ~5ms slower than getUserIdFromToken(), inconsistent with ENH-010/011
- **Verdict:** Rejected - want consistency with existing ENH-010/011 pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JWT decode fails | Low | Low | Fallback to `getUser()` built into helper |
| User not in database | Low | Low | `getTiersPageData()` throws, redirect to login |
| Wrong client_id | Low | Low | All repository calls filter by client_id |
| Type mismatch (TiersPageResponse) | Low | Low | Import from service layer (same as ENH-011) |
| UI state lost (flip card) | None | None | useState for flip state stays in Client Component |

---

## 14. Testing Strategy

### Unit Tests

Not required - no new logic, only wiring changes. Existing tests cover:
- `getUserIdFromToken()` - tested via ENH-010
- `getTiersPageData()` - existing service tests

### Integration Tests

**Sync Test (Existing):** `tests/unit/supabase/get-user-id-from-token.sync.test.ts`
- Verifies `/tiers` is in `ALLOWED_PAGE_ROUTES`
- Verifies routes match middleware matcher

### Manual Verification Steps

1. [ ] Deploy to Vercel
2. [ ] Login as test user
3. [ ] Navigate to /tiers
4. [ ] Verify page renders with real tier data (not mock)
5. [ ] Verify tier progression shows correct values
6. [ ] Verify flip card interaction works
7. [ ] Verify tier rewards display correctly
8. [ ] Verify redirect works for logged-out user

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm `getUserIdFromToken()` includes `/tiers` in ALLOWED_PAGE_ROUTES
- [x] Confirm `getTiersPageData()` exists and is exported

### Implementation Steps
- [ ] **Step 1:** Create `tiers-client.tsx`
  - File: `app/tiers/tiers-client.tsx`
  - Action: CREATE - Extract UI from page.tsx, add props interface
- [ ] **Step 2:** Rewrite `page.tsx` as Server Component
  - File: `app/tiers/page.tsx`
  - Action: REWRITE - Server Component with direct service call

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Deploy to Vercel
- [ ] Manual verification per Section 14
- [ ] Update EXECUTION_PLAN.md (mark 9.7 tasks complete)

---

## 16. Definition of Done

- [ ] `tiers-client.tsx` created with UI extracted from page.tsx
- [ ] `page.tsx` converted to Server Component per Section 6 specification
- [ ] Mock data removed (390+ lines)
- [ ] Debug panel removed (50+ lines)
- [ ] Type checker passes
- [ ] Build completes
- [ ] Page renders with real tier data
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/tiers/page.tsx` | Full file (805 lines) | Current implementation to rewrite |
| `lib/supabase/get-user-id-from-token.ts` | Lines 33-39 | Verify `/tiers` in ALLOWED_PAGE_ROUTES |
| `lib/services/tierService.ts` | Lines 441-555 | `getTiersPageData()` function |
| `middleware.ts` | Lines 218-219, 227 | Verify matcher includes /tiers |
| `app/api/tiers/route.ts` | Full file | Shows API route bottleneck pattern |
| `TIERS_IMPL.md` | Response Schema (lines 48-93) | TiersPageResponse structure |
| `DATA_FLOWS.md` | /tiers section | Data flow documentation |
| `HomePageAuthOptimizationEnhancement.md` | Full document | ENH-010 pattern to follow |
| `RewardsHistoryAuthOptimizationEnhancement.md` | Full document | ENH-011 pattern to follow |

---

## Prerequisite Verification

### Prerequisite 1: Type Consolidation (SSoT)

**Status:** Known Issue - Not Blocking

Duplicate `TiersPageResponse` definitions exist in:
- `app/types/tiers.ts:9`
- `lib/services/tierService.ts:92`
- `lib/types/api.ts:514`

**Workaround:** Client component imports from service layer:
```typescript
import type { TiersPageResponse } from "@/lib/services/tierService"
```

This matches the pattern used in ENH-011 for RewardsHistoryResponse.

### Prerequisite 2: Runtime Validation Guards

**Status:** Exists - Not Required

Guards exist in `lib/types/enums.ts`:
- `isRewardType` (line 253)
- `isVipMetric` (line 232)

**Not Required for This Enhancement:** No new type transformations - using existing service which already handles types via tierService.

---

**Document Version:** 1.1
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Analysis Complete

**Audit Feedback (v1.1):**
- Added SchemaFinalv2.md and API_CONTRACTS.md to Source Documents Analyzed
- Added "Security Note: Auth Helper Trust Boundary" to Section 6
- Confirmed existing fallback logs are sufficient for monitoring
