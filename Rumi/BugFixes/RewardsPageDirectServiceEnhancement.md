# Rewards Page Direct Service Call - Enhancement Documentation

**ID:** ENH-006
**Type:** Enhancement (Performance Optimization)
**Created:** 2025-12-22
**Status:** Analysis Complete - Ready for Implementation
**Priority:** High
**Related Tasks:** Task 9.5.2-9.5.5 from EXECUTION_PLAN.md (Step 9.5: Rewards Integration)
**Linked Issues:** ENH-007 (Missions Direct Service pattern reference)

---

## 1. Project Context

Rumi is a loyalty platform for TikTok Shop creators built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The application uses a layered architecture: Server Components → Services → Repositories → Supabase RPC. Authentication uses Supabase Auth with custom cookie handling via middleware.

The `/rewards` page currently uses hardcoded mock data. This enhancement replaces mock data with direct service calls from the Server Component, **reusing all existing service and repository code** (following the ENH-007 pattern).

**Tech Stack:** Next.js 14.2.18, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Server Component → Service → Repository → Supabase RPC

---

## 2. Gap/Enhancement Summary

**What's missing:** The `/rewards` page uses hardcoded mock data (lines 319-615) instead of real data from the database.

**What should exist:** The Server Component should call the service layer directly, reusing the existing `listAvailableRewards()` service function and `get_available_rewards` RPC.

**Why it matters:** Users see fake rewards data instead of their actual VIP tier benefits. They cannot claim rewards, track usage counts, or see real status. This breaks a core feature of the loyalty platform.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `app/rewards/page.tsx` | Lines 1-996 | Contains `"use client"` and `mockData: RewardsPageResponse` (lines 319-615). Line 617: `const { user, redemptionCount, rewards } = mockData;` - no real data fetch |
| `app/api/rewards/route.ts` | Lines 24-114 | Production-ready API route. Shows exact service calls needed: `createClient()`, `userRepository.findByAuthId()`, `dashboardRepository.getUserDashboard()`, `rewardService.listAvailableRewards()` |
| `lib/services/rewardService.ts` | Lines 159-168, 820-943 | `ListAvailableRewardsParams` interface defines 8 required params. `listAvailableRewards()` is the existing service function to reuse |
| `lib/repositories/rewardRepository.ts` | Lines 156-235 | `listAvailable()` uses existing `get_available_rewards` RPC |
| `lib/repositories/dashboardRepository.ts` | `getUserDashboard()` | Existing method for user/tier data - same as used by missions |
| `lib/repositories/userRepository.ts` | `findByAuthId()` | Existing method to get user from Supabase Auth ID |
| `lib/supabase/server-client.ts` | Lines 16-49 | `createClient()` works in Server Components, handles cookies automatically via `next/headers` |
| `middleware.ts` | Line 223 | `/api/rewards/:path*` in matcher - confirms middleware runs for rewards routes |
| `app/types/rewards.ts` | Full file (205 lines) | `RewardsPageResponse`, `Reward`, `RewardStatus` interfaces already exist and match API contract |
| `DATA_FLOWS.md` | `/rewards` section (lines 741-981) | Documents complete data flow, notes "Frontend: 🔄 Using mock data" |
| `API_CONTRACTS.md` | GET /api/rewards (lines 4071-4270) | Complete API specification with response schema |
| `MissionsPageDirectServiceEnhancement.md` | ENH-007 v2.0 | Pattern reference: "NO new SQL, NO new transforms. Reuse 100% of existing code" |
| `app/missions/missions-client.tsx` | Lines 38-51 | Client component props pattern: `{ initialData: T | null, error: string | null }` |

### Key Evidence

**Evidence 1:** Mock data blocks real functionality
- Source: `app/rewards/page.tsx`, lines 319-617
- Quote: `const mockData: RewardsPageResponse = { ... }` followed by `const { user, redemptionCount, rewards } = mockData;`
- Implication: Page displays fake data, not user's actual VIP tier rewards

**Evidence 2:** API route shows exact service calls to reuse
- Source: `app/api/rewards/route.ts`, lines 88-98
- Code:
  ```typescript
  const rewardsResponse = await rewardService.listAvailableRewards({
    userId: user.id,
    clientId,
    currentTier: dashboardData.currentTier.id,
    currentTierOrder: dashboardData.currentTier.order,
    tierAchievedAt: user.tierAchievedAt ?? null,
    userHandle: user.tiktokHandle ?? '',
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });
  ```
- Implication: We copy this exact logic to Server Component - guaranteed parity

**Evidence 3:** Supabase server client works in Server Components
- Source: `lib/supabase/server-client.ts`, lines 16-49
- Quote: `export async function createClient() { const cookieStore = await cookies(); ... }`
- Implication: No fetch needed - direct Supabase calls work in Server Components

**Evidence 4:** ENH-007 established the pattern
- Source: `MissionsPageDirectServiceEnhancement.md`, Section 6
- Quote: "NO new SQL, NO new transforms. Reuse 100% of existing code"
- Implication: Same approach for rewards - reuse existing service/repository

---

## 4. Business Justification

**Business Need:** Creators must see their actual VIP tier rewards to engage with the loyalty program.

**User Stories:**
1. As a creator, I need to see my available VIP rewards so I can claim benefits I've earned
2. As a creator, I need to see usage counts (e.g., 2/3 used) so I know how many claims remain
3. As a creator, I need to schedule discounts and boosts so I can activate them at optimal times

**Impact if NOT implemented:**
- Users see fake data instead of their real VIP tier rewards
- Claim buttons don't work (handlers have TODO comments)
- Platform appears non-functional for core rewards feature
- Trust in the loyalty program is undermined

---

## 5. Current State Analysis

### What Currently Exists

**File:** `app/rewards/page.tsx`
```typescript
"use client"
import { useState, useEffect } from "react";
import type { RewardsPageResponse, Reward, RewardStatus } from "@/types/rewards";

export default function RewardsPage() {
  // ... modal state variables ...

  // MOCK DATA - lines 319-615
  const mockData: RewardsPageResponse = {
    user: {
      id: "user-123",
      handle: "creator_jane",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    redemptionCount: 5,
    rewards: [
      // ... 12 hardcoded reward objects ...
    ]
  };

  const { user, redemptionCount, rewards } = mockData;  // Line 617 - uses mock!

  // ... rest of component ...
}
```

**Current Capability:**
- ✅ Page renders reward cards correctly with all 10 status types
- ✅ UI logic for flippable cards, modals, status badges works
- ✅ Modal components exist (ScheduleDiscountModal, SchedulePayboostModal, etc.)
- ❌ CANNOT fetch real data (uses mock)
- ❌ CANNOT show user's actual VIP tier rewards
- ❌ CANNOT handle authentication (no auth check)

### Current Data Flow

```
Current (Broken):
page.tsx ("use client")
  └── mockData (hardcoded lines 319-615)
        └── Renders fake data

Expected (To Implement):
page.tsx (Server Component)
  └── createClient().auth.getUser()
  └── userRepository.findByAuthId()
  └── dashboardRepository.getUserDashboard()
  └── rewardService.listAvailableRewards()  ← Existing service
        └── rewardRepository.listAvailable()
              └── Supabase RPC: get_available_rewards  ← Existing RPC
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

**Direct Service Call:** Server Component calls existing service functions directly (no fetch, no API route for initial load). This follows ENH-007 pattern.

**Key Principle:** NO new SQL, NO new transforms. Reuse 100% of existing code:
- `userRepository.findByAuthId()` - existing
- `dashboardRepository.getUserDashboard()` - existing
- `rewardService.listAvailableRewards()` - existing
- `get_available_rewards` RPC - existing (via service)

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/rewards/page.tsx` | RENAME → `rewards-client.tsx` | Preserve git history with `git mv` |
| `app/rewards/rewards-client.tsx` | MODIFY | Add props interface, remove mockData, named export |
| `app/rewards/page.tsx` | CREATE | New Server Component with direct service calls |

### New Server Component

**⚠️ NOTE: This reuses existing services. Logic copied from API route.**

**File:** `app/rewards/page.tsx` (TO BE CREATED)
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { userRepository } from '@/lib/repositories/userRepository'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsClient } from './rewards-client'

/**
 * Rewards Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-006):
 * Calls services directly instead of using mock data or fetching from API.
 * This follows the same pattern as ENH-007 (Missions).
 *
 * The API route (/api/rewards) is KEPT for client-side claim operations.
 */
export default async function RewardsPage() {
  // 1. Get authenticated user via Supabase
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect('/login/start')
  }

  // 2. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[RewardsPage] CLIENT_ID not configured')
    return <RewardsClient initialData={null} error="Server configuration error" />
  }

  // 3. Get user from our users table - REUSES existing repository
  const user = await userRepository.findByAuthId(authUser.id)
  if (!user) {
    redirect('/login/start')
  }

  // 4. Verify user belongs to this client (multitenancy)
  if (user.clientId !== clientId) {
    return <RewardsClient initialData={null} error="Access denied" />
  }

  // 5. Get dashboard data for tier info - REUSES existing repository
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
  if (!dashboardData) {
    return <RewardsClient initialData={null} error="Failed to load user data" />
  }

  // 6. Get rewards - REUSES existing service (which uses existing RPC)
  // This is the exact same call as app/api/rewards/route.ts lines 89-98
  const rewardsResponse = await rewardService.listAvailableRewards({
    userId: user.id,
    clientId,
    currentTier: dashboardData.currentTier.id,
    currentTierOrder: dashboardData.currentTier.order,
    tierAchievedAt: user.tierAchievedAt ?? null,
    userHandle: user.tiktokHandle ?? '',
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  })

  // 7. Return client component with real data
  return <RewardsClient initialData={rewardsResponse} error={null} />
}
```

### Modified Client Component

**File:** `app/rewards/rewards-client.tsx` (RENAMED + MODIFIED)

**Changes from current page.tsx:**
1. Add props interface (lines to add at top)
2. Change default export to named export
3. Remove mockData constant (delete lines 319-615)
4. Initialize state from props instead of mockData
5. Add error state UI

```typescript
// SPECIFICATION - MODIFICATIONS TO EXISTING FILE
"use client"
import { useState, useEffect } from "react"
import type { RewardsPageResponse, Reward } from "@/types/rewards"
// ... existing imports ...

// NEW: Props interface for server-passed data
interface RewardsClientProps {
  initialData: RewardsPageResponse | null
  error: string | null
}

// CHANGED: Named export instead of default, accepts props
export function RewardsClient({ initialData, error: initialError }: RewardsClientProps) {
  // NEW: Initialize from props (no loading state needed)
  const [rewardsData, setRewardsData] = useState<RewardsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)

  // EXISTING: Modal state (unchanged)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<{...} | null>(null)
  // ... rest of modal state ...

  // NEW: Error state UI
  if (error || !rewardsData) {
    return (
      <PageLayout title="Rewards">
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600">{error || "Failed to load rewards"}</p>
          <Link href="/home">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </PageLayout>
    )
  }

  // CHANGED: Use rewardsData instead of mockData
  const { user, redemptionCount, rewards } = rewardsData

  // DELETED: mockData constant (lines 319-615 removed entirely)

  // EXISTING: Rest of component unchanged (handlers, helpers, JSX)
}
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/rewards/page.tsx` | RENAME | `git mv page.tsx rewards-client.tsx` |
| `app/rewards/rewards-client.tsx` | MODIFY | Props interface, named export, remove mockData |
| `app/rewards/page.tsx` | CREATE | Server Component with direct service calls |

### Files NOT Modified (Reused As-Is)

| File | Why Kept |
|------|----------|
| `app/api/rewards/route.ts` | Kept for client-side claim operations |
| `lib/services/rewardService.ts` | Reused - `listAvailableRewards()` |
| `lib/repositories/rewardRepository.ts` | Reused - `listAvailable()` |
| `lib/repositories/dashboardRepository.ts` | Reused - `getUserDashboard()` |
| `lib/repositories/userRepository.ts` | Reused - `findByAuthId()` |
| `middleware.ts` | No changes needed |

### Dependency Graph

```
app/rewards/page.tsx (TO BE CREATED - Server Component)
├── imports: createClient (existing)
├── imports: userRepository.findByAuthId (existing)
├── imports: dashboardRepository.getUserDashboard (existing)
├── imports: rewardService.listAvailableRewards (existing)
├── imports: RewardsClient (from ./rewards-client)
└── NO fetch, NO new RPC

app/rewards/rewards-client.tsx (RENAMED + MODIFIED)
├── imports: existing UI components
├── REMOVES: mockData constant
├── ADDS: RewardsClientProps interface
└── exports: RewardsClient (named)
```

---

## 8. Data Flow After Implementation

```
Browser
    ↓
Server Component (page.tsx)
    ↓
createClient().auth.getUser() → Supabase Auth
    ↓
userRepository.findByAuthId() → Supabase RPC
    ↓
dashboardRepository.getUserDashboard() → Supabase DB
    ↓
rewardService.listAvailableRewards() → get_available_rewards RPC
    ↓
Render RewardsClient with real data
```

---

## 9. Database/Schema Requirements

### Schema Changes Required?
- [x] No - **Reuses existing `get_available_rewards` RPC**

### Multi-Tenant Considerations

| Query | client_id Filter | Status |
|-------|------------------|--------|
| `userRepository.findByAuthId()` | N/A (by auth ID) | ✅ Existing |
| `dashboardRepository.getUserDashboard()` | Yes - param | ✅ Existing |
| `rewardService.listAvailableRewards()` | Yes - param | ✅ Existing |
| Server Component check | `user.clientId !== clientId` | ✅ Added |

**No new queries = no new multi-tenant risk.**

---

## 10. API Contract Changes

| Endpoint | Change Type | Notes |
|----------|-------------|-------|
| `GET /api/rewards` | NO CHANGE | Kept for client-side claim operations |
| Page `/rewards` | INTERNAL | Direct service call instead of mock data |

### Breaking Changes?
- [x] No - API route unchanged, response shape unchanged

### Response Parity

| Path | Response Type | Parity |
|------|---------------|--------|
| Direct service call | `RewardsPageResponse` | ✅ Same |
| `/api/rewards` route | `RewardsPageResponse` | ✅ Same |

**Guaranteed parity** because both paths call `rewardService.listAvailableRewards()`.

---

## 11. Performance Considerations

### Expected Metrics

| Metric | Mock Data | Direct Service |
|--------|-----------|----------------|
| Auth check | None (broken) | ~200ms |
| Data fetch | 0ms (fake) | ~300-400ms |
| Real data | ❌ No | ✅ Yes |

### Why Direct Service vs API Fetch?

| Approach | Overhead | Risk |
|----------|----------|------|
| Direct service (this) | None | Low - reuses existing |
| API fetch | HTTP + JSON | Low |
| New RPC | None | High - duplication |

Direct service is preferred per ENH-007 pattern - reuses existing code with zero duplication.

---

## 12. Alternative Solutions Considered

### Option A: Client-Side Fetch (EXECUTION_PLAN Task 9.5.2)
- **Description:** Add useState + useEffect with fetch('/api/rewards')
- **Pros:** Simple, matches original plan
- **Cons:** Loading spinner, slower perceived load, inconsistent with ENH-007
- **Verdict:** ❌ Rejected - worse UX, inconsistent pattern

### Option B: Server Component + API Fetch
- **Description:** Server Component fetches from /api/rewards
- **Pros:** Reuses API route
- **Cons:** HTTP overhead, cookie forwarding complexity
- **Verdict:** ❌ Rejected - unnecessary overhead

### Option C: Direct Service Call (Selected)
- **Description:** Server Component calls services directly
- **Pros:** Zero code duplication, guaranteed parity, follows ENH-007
- **Cons:** None significant
- **Verdict:** ✅ Selected - best pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Response differs from API | None | N/A | Same service function called |
| Auth regression | Low | High | Same auth pattern as API route |
| Multi-tenant leak | None | N/A | Same service with same filters |
| Build failure | Low | Low | Simple changes, type-safe |

---

## 14. Testing Strategy

### Manual Verification Steps

1. [ ] Start dev server: `npm run dev`
2. [ ] Login as @testbronze user
3. [ ] Navigate to `/rewards`
4. [ ] Verify page loads without loading spinner
5. [ ] Verify tier badge shows correct tier and color
6. [ ] Verify rewards list shows real data (or empty state if none seeded)
7. [ ] Verify usage counts display correctly (e.g., "1/3")
8. [ ] Verify reward statuses render correctly (claimable, locked, etc.)
9. [ ] Click "Schedule" on a discount - verify modal opens
10. [ ] Logout and try to access `/rewards` directly
11. [ ] Verify redirect to `/login/start`
12. [ ] Login as @testgold user
13. [ ] Verify Gold-tier rewards appear

### Parity Verification

No explicit parity test needed because:
- Direct service calls `rewardService.listAvailableRewards()`
- API route calls `rewardService.listAvailableRewards()`
- Same function = same output

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read `app/api/rewards/route.ts` to understand service calls
- [ ] Verify import paths for services/repositories

### Implementation Steps
- [ ] **Step 1:** Rename page.tsx to rewards-client.tsx
  - Command: `git mv app/rewards/page.tsx app/rewards/rewards-client.tsx`
- [ ] **Step 2:** Modify rewards-client.tsx
  - Add `RewardsClientProps` interface
  - Change to named export `export function RewardsClient`
  - Remove mockData constant (lines 319-615)
  - Add error state UI
  - Change `mockData` references to `rewardsData` from props
- [ ] **Step 3:** Create new page.tsx
  - Server Component with direct service calls per spec

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification (13 steps above)
- [ ] Update EXECUTION_PLAN.md - mark Tasks 9.5.2-9.5.5 complete
- [ ] Update DATA_FLOWS.md - change status to ✅

---

## 16. Definition of Done

- [ ] `rewards-client.tsx` created with props interface
- [ ] `page.tsx` created as Server Component with direct service calls
- [ ] Mock data completely removed (lines 319-615 deleted)
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed (13 steps)
- [ ] EXECUTION_PLAN.md updated
- [ ] DATA_FLOWS.md updated
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `app/api/rewards/route.ts` | Lines 88-98 | Service calls to copy |
| `lib/services/rewardService.ts` | `listAvailableRewards()` | Reused service |
| `lib/supabase/server-client.ts` | `createClient()` | Auth in Server Component |
| `MissionsPageDirectServiceEnhancement.md` | ENH-007 v2.0 | Pattern reference |
| `DATA_FLOWS.md` | `/rewards` section | Data flow documentation |
| `API_CONTRACTS.md` | GET /api/rewards | Response schema |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Author:** Claude Code
**Status:** Analysis Complete - Ready for Implementation

---

# Checklist for Gap/Enhancement Document

- [x] **Type clearly identified** as Enhancement
- [x] **Reuses existing code** - no duplication (per ENH-007 pattern)
- [x] **No new RPC** - uses existing `get_available_rewards`
- [x] Project context explains the system
- [x] Current state shows mock data problem
- [x] Proposed solution copies API route logic
- [x] Multi-tenant filtering addressed (reuses existing)
- [x] API contract unchanged
- [x] Source Documents Analyzed thoroughly enriched (13 documents)
- [x] Tech stack respected (Supabase)
- [x] External auditor could implement from this document alone
