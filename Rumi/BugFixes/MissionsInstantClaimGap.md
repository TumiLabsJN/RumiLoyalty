# Missions Page Instant Claim - Gap Documentation

**ID:** GAP-002-MissionsInstantClaim
**Type:** Feature Gap
**Created:** 2025-12-21
**Status:** Analysis Complete
**Priority:** Medium
**Related Tasks:** Phase 5 - Missions System
**Linked Issues:** None

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators complete missions (sales goals, video posts, raffles) to earn rewards (gift cards, commission boosts, discounts, physical gifts). The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, sonner (toast notifications)
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Gap/Enhancement Summary

**What's missing:** The `/missions` page (`missions-client.tsx`) has a TODO placeholder for instant reward claims (gift_card, spark_ads, experience). Clicking "Claim Reward" on these reward types does nothing.

**What should exist:** When a creator clicks "Claim Reward" for an instant reward on the missions page, the system should:
1. POST to `/api/missions/:id/claim` with empty body
2. Show success toast
3. Refresh the page after 2 seconds

**Why it matters:** Creators cannot claim instant rewards from the `/missions` page. They must use the `/home` page instead, creating inconsistent UX. This is confusing because the "Claim Reward" button appears but doesn't work.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `missions-client.tsx` | Lines 91-125 (`handleClaimMission`) | TODO placeholder at lines 122-125 - no fetch call for instant rewards |
| `missions-client.tsx` | Lines 140, 198 | Scheduled rewards (discount, commission_boost) have working fetch calls |
| `home-client.tsx` | Lines 155-181 | Instant claim IS implemented here with 1.5s delay |
| `MISSIONS_IMPL.md` | Section "POST /api/missions/:id/claim" | Backend API fully supports empty body for instant rewards |
| `API_CONTRACTS.md` | Lines 3711-3779 | API contract defines instant reward claim with empty body |
| Dev server logs | `/tmp/claude/.../b73f9a9.output` | Confirmed POST requests work when called from home page |
| `route.ts` (claim) | Lines 111-113 | `// Empty body is valid for instant rewards` - backend ready |
| `SchemaFinalv2.md` | redemptions table (lines 594-664) | `status` column transitions from 'claimable' → 'claimed' |
| `SchemaFinalv2.md` | rewards table (lines 462-592) | `redemption_type` column: 'instant' vs 'scheduled' |
| `missionService.ts` | Lines 717-720 (`computeStatus`) | Instant rewards return 'redeeming' status after claim |
| `missionService.ts` | Line 891 (`transformMission`) | `id: progress?.id ?? mission.id` - confirms `mission.id` is `mission_progress.id` for claimable states |
| `missionRepository.ts` | Lines 1100-1252 (`claimReward`) | Repository handles claim for all reward types |
| `REWARDS_IMPL.md` | Sections 6.1-6.3 | VIP tier rewards use same claim pattern |
| Supabase Schema | `commission_boost_redemptions` | Not used for instant rewards (gift_card, spark_ads, experience) |
| Supabase Schema | `physical_gift_redemptions` | Not used for instant rewards |
| `missions-client.tsx` | Lines 682-691 | `isDefaultClaim` button exists but calls non-functional handler |
| `missions-client.tsx` | Lines 373 | `isDefaultClaim = mission.status === "default_claim"` |

### Key Evidence

**Evidence 1:** TODO placeholder with no implementation
- Source: `missions-client.tsx`, Lines 122-125
- Code:
  ```typescript
  // For other reward types, claim immediately
  // TODO: POST /api/missions/:id/claim
  // Sets status from 'completed' → 'claimed'
  ```
- Implication: No fetch call exists for instant rewards

**Evidence 2:** Home page has working implementation
- Source: `home-client.tsx`, Lines 155-181
- Code:
  ```typescript
  // Instant rewards (gift_card, spark_ads, experience) - direct API call
  const response = await fetch(
    `/api/missions/${mission.progressId}/claim`,
    { method: 'POST' }
  )
  ```
- Implication: Pattern exists and works - just needs to be replicated

**Evidence 3:** Backend fully supports instant claims
- Source: `MISSIONS_IMPL.md`, Lines 210-214
- Quote: `try { const text = await request.text(); if (text) body = JSON.parse(text); } catch { /* Empty body valid for instant rewards */ }`
- Implication: API ready, only frontend implementation missing

**Evidence 4:** ID field is mission_progress.id for claimable states (VERIFIED)
- Source: `missionService.ts`, Line 891
- Code: `id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback`
- Verification: Existing scheduled rewards (discount, commission_boost) use `mission.id` and work correctly
- Implication: Using `mission.id` in fetch call is CORRECT for claim API

---

## 4. Business Justification

**Business Need:** Creators should be able to claim instant rewards from any page that shows the "Claim Reward" button.

**User Stories:**
1. As a creator, I need to claim my gift card reward from the missions page so that I don't have to navigate to the home page
2. As a creator, I expect the "Claim Reward" button to work so that I can redeem my earned rewards immediately

**Impact if NOT implemented:**
- Confusing UX: Button appears but does nothing
- Inconsistent behavior between `/home` and `/missions` pages
- Creators may think the system is broken
- Support tickets for "claim button not working"

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `appcode/app/missions/missions-client.tsx`
```typescript
// Lines 91-125 - handleClaimMission function
const handleClaimMission = (mission: any) => {
  console.log("[v0] Claim mission clicked:", mission.id)

  // Route to correct modal based on reward type
  if (mission.rewardType === "discount") {
    setSelectedMission({...})
    setShowDiscountModal(true)
    return
  }

  if (mission.rewardType === "commission_boost") {
    setSelectedMission({...})
    setShowPayboostModal(true)
    return
  }

  if (mission.rewardType === "physical_gift") {
    setSelectedPhysicalGift(mission)
    setShowPhysicalGiftModal(true)
    return
  }

  // For other reward types, claim immediately
  // TODO: POST /api/missions/:id/claim
  // Sets status from 'completed' → 'claimed'
}
```

**Current Capability:**
- ✅ Discount rewards: Opens scheduling modal, calls API with dates
- ✅ Commission boost rewards: Opens scheduling modal, calls API with dates
- ✅ Physical gift rewards: Opens shipping modal, calls API with address
- ❌ Gift card rewards: **Does nothing** (TODO placeholder)
- ❌ Spark ads rewards: **Does nothing** (TODO placeholder)
- ❌ Experience rewards: **Does nothing** (TODO placeholder)

#### Current Data Flow (if applicable)

```
User clicks "Claim Reward" on instant reward
         ↓
handleClaimMission(mission) called
         ↓
Check rewardType: discount? ❌ commission_boost? ❌ physical_gift? ❌
         ↓
Fall through to TODO
         ↓
NOTHING HAPPENS ← Gap
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Create a **centralized claim utility** that both `/home` and `/missions` pages use. This prevents code divergence and ensures consistent behavior across the application. Use native `fetch()` API (not axios, per project conventions), `useRouter` from `next/navigation` for page refresh, and `sonner` toast for notifications.

**⚠️ CLIENT-SIDE ONLY:** This utility uses `toast` (sonner) and `setTimeout`, which are browser APIs. The file MUST include `"use client"` directive to prevent SSR bundling issues. Only import from client components (`"use client"` files).

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `appcode/lib/client/claimMissionReward.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
"use client"

import { toast } from 'sonner'

export interface ClaimMissionRewardOptions {
  missionProgressId: string
  successMessage: string           // Context-specific success message
  successDescription: string       // Context-specific success description
  refreshDelay?: number            // Default: 2000ms
}

export interface ClaimMissionRewardResult {
  success: boolean
  message?: string
  redemptionId?: string
}

/**
 * Claims an instant mission reward (gift_card, spark_ads, experience)
 * Centralized to ensure consistent API call, error handling, and refresh behavior
 * Toast messages are context-specific (passed by caller)
 *
 * @param options - Claim options including mission progress ID and toast messages
 * @param refreshFn - Function to refresh the page (router.refresh or window.location.reload)
 * @returns Promise resolving to claim result
 */
export async function claimMissionReward(
  options: ClaimMissionRewardOptions,
  refreshFn: () => void
): Promise<ClaimMissionRewardResult> {
  const { missionProgressId, successMessage, successDescription, refreshDelay = 2000 } = options

  try {
    const response = await fetch(`/api/missions/${missionProgressId}/claim`, {
      method: 'POST',
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to claim reward')
    }

    toast.success(successMessage, {
      description: successDescription,
      duration: 5000,
    })

    // Refresh page to update mission status (delay for toast visibility)
    setTimeout(() => refreshFn(), refreshDelay)

    return { success: true, redemptionId: result.redemptionId }

  } catch (error) {
    console.error('Failed to claim reward:', error)
    toast.error('Failed to claim reward', {
      description: error instanceof Error ? error.message : 'Please try again or contact support',
      duration: 5000,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

**Modified Function:** `appcode/app/missions/missions-client.tsx` - `handleClaimMission`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add import at top of file:
import { claimMissionReward } from '@/lib/client/claimMissionReward'

// Replace lines 122-125 with:
// For other reward types (gift_card, spark_ads, experience), claim immediately
await claimMissionReward(
  {
    missionProgressId: mission.id,
    successMessage: 'Reward claimed!',
    successDescription: 'Check back soon for fulfillment updates',
  },
  () => window.location.reload()
)
```

**Modified Function:** `appcode/app/home/home-client.tsx` - `handleClaimReward`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add import at top of file:
import { claimMissionReward } from '@/lib/client/claimMissionReward'

// Replace lines 155-181 with:
// Instant rewards (gift_card, spark_ads, experience) - use centralized function
setIsClaimingReward(true)
await claimMissionReward(
  {
    missionProgressId: mission.progressId,
    successMessage: 'Reward claimed!',
    successDescription: 'Check Missions tab for details',
  },
  () => window.location.reload()
)
setIsClaimingReward(false)
```

**Explanation:**
- Single source of truth for API call, error handling, and refresh behavior
- Context-specific toast messages (home directs to Missions tab, missions page doesn't)
- Consistent error handling across both pages
- Configurable refresh delay (default 2000ms)
- Accepts refresh function as parameter to support both `router.refresh()` and `window.location.reload()`
- Uses native `fetch()` per project conventions
- Uses `sonner` toast (already used throughout codebase)

#### Function Signature Change

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// handleClaimMission in missions-client.tsx must become async
const handleClaimMission = async (mission: any) => {
  // ... existing code + new centralized claim call
}
```

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/client/claimMissionReward.ts` | CREATE | New centralized claim utility function |
| `appcode/app/missions/missions-client.tsx` | MODIFY | Import utility, make `handleClaimMission` async, call utility |
| `appcode/app/home/home-client.tsx` | MODIFY | Import utility, replace inline claim logic with utility call |

#### Dependency Graph

```
lib/client/ (NEW DIRECTORY - TO BE CREATED)
└── claimMissionReward.ts (NEW FILE)
    ├── directive: "use client"
    ├── imports: toast from "sonner"
    └── exports: claimMissionReward(), ClaimMissionRewardOptions, ClaimMissionRewardResult

missions-client.tsx (EXISTING)
├── already imports: useRouter from "next/navigation" (line 27)
├── already imports: toast from "sonner" (line 7) - can remove if not used elsewhere
├── already has: router = useRouter() (line 50)
├── NEW import: claimMissionReward from "@/lib/client/claimMissionReward"
└── MODIFY: handleClaimMission function (lines 91-125)

home-client.tsx (EXISTING)
├── already imports: toast from "sonner"
├── NEW import: claimMissionReward from "@/lib/client/claimMissionReward"
└── MODIFY: handleClaimReward function (lines 133-181) - replace inline logic
```

---

## 8. Data Flow After Implementation

```
User clicks "Claim Reward" on gift_card/spark_ads/experience
         ↓
handleClaimMission(mission) called
         ↓
Check rewardType: discount? ❌ commission_boost? ❌ physical_gift? ❌
         ↓
NEW: POST /api/missions/${mission.id}/claim (empty body)
         ↓
Backend: redemptions.status → 'claimed', claimed_at → NOW()
         ↓
Success: toast.success() + setTimeout(window.location.reload, 2000)
         ↓
Page refreshes → Mission shows "Redeeming" status
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `redemptions` | `status`, `claimed_at` | Updated from 'claimable' to 'claimed' by existing API |
| `mission_progress` | `status` | Not changed - stays 'completed' |
| `rewards` | `type`, `redemption_type` | Read-only - determines flow |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

The API endpoint `POST /api/missions/:id/claim` already handles instant reward claims. It updates `redemptions.status` to 'claimed' and sets `claimed_at`. No sub-state tables (commission_boost_redemptions, physical_gift_redemptions) are touched for instant rewards.

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| POST /api/missions/:id/claim | Yes - handled in route.ts line 91 | [x] Already implemented |

The API route already enforces `user.clientId !== clientId` check (MISSIONS_IMPL.md line 201-207). No additional multi-tenant code needed in frontend.

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `POST /api/missions/:id/claim` | NO CHANGE | Accepts empty body for instant rewards | Same - no API changes |

#### Breaking Changes?
- [x] No - additive changes only (frontend calling existing API)

The API already supports this use case. Per MISSIONS_IMPL.md line 214: `/* Empty body valid for instant rewards */`

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 1 redemption per claim | Yes |
| Query complexity | O(1) - single row update | Yes |
| Frequency | Per user action (button click) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP

Single API call on button click. Same pattern already used for scheduled rewards without issues.

---

## 12. Alternative Solutions Considered

#### Option A: Redirect to Home Page
- **Description:** When instant reward claim clicked on /missions, redirect to /home
- **Pros:** Quick to implement, reuses existing code
- **Cons:** Poor UX, confusing navigation, doesn't solve the core issue
- **Verdict:** ❌ Rejected - Band-aid solution, bad UX

#### Option B: Extract Shared Claim Handler (Selected)
- **Description:** Add instant claim logic directly to missions-client.tsx following home-client.tsx pattern
- **Pros:** Consistent UX, uses existing API, minimal code addition (~15 lines)
- **Cons:** Slight code duplication (acceptable for clarity)
- **Verdict:** ✅ Selected - Simple, effective, matches existing patterns

#### Option C: Create Shared Hook
- **Description:** Create `useClaimReward()` hook used by both pages
- **Pros:** DRY, centralized logic
- **Cons:** Over-engineering for simple use case, adds complexity
- **Verdict:** ❌ Rejected - YAGNI, premature abstraction

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API endpoint behavior differs | Low | Medium | Verified via MISSIONS_IMPL.md - same API works for home page |
| mission.id is wrong property | Low | High | Verified via grep - scheduled rewards use same property successfully |
| Toast/router not imported | Low | Low | Verified - already imported at lines 7, 27 |
| Async function breaks existing flow | Low | Medium | Test all reward types after change |

---

## 14. Testing Strategy

#### Unit Tests

No existing test infrastructure (`appcode/tests/**/*.test.ts` = 0 files). Unit tests deferred.

#### Integration Tests

No existing test infrastructure. Integration tests deferred.

#### Manual Verification Steps

**Instant Claim Test (Primary):**
1. [ ] Login as testbronze@test.com
2. [ ] Navigate to `/missions`
3. [ ] Find a mission with gift_card reward in "Claim Reward" state
4. [ ] Click "Claim Reward" button
5. [ ] Verify success toast appears: "Reward claimed!"
6. [ ] Verify page refreshes after ~2 seconds
7. [ ] Verify mission status changes to "Redeeming"
8. [ ] Verify database: `redemptions.status = 'claimed'`, `claimed_at` is set

**Regression Tests (Required per IMPL v1.1 audit):**
9. [ ] Reset mission and assign discount reward
10. [ ] Click "Schedule Reward" → Verify discount modal opens
11. [ ] Schedule discount → Verify API call succeeds, toast appears, page refreshes
12. [ ] Reset mission and assign commission_boost reward
13. [ ] Click "Schedule Reward" → Verify payboost modal opens
14. [ ] Schedule boost → Verify API call succeeds, toast appears, page refreshes
15. [ ] Verify both scheduled reward flows still work after making `handleClaimMission` async

**Setup Query (if needed):**
```sql
-- Assign gift_card reward to video mission and make claimable
UPDATE missions SET reward_id = 'cccc1111-0001-0000-0000-000000000001'
WHERE id = (SELECT mission_id FROM mission_progress WHERE id = 'ffff0002-0002-0000-0000-000000000002');

UPDATE mission_progress SET current_value = 5, status = 'completed', completed_at = NOW()
WHERE id = 'ffff0002-0002-0000-0000-000000000002';

INSERT INTO redemptions (user_id, reward_id, mission_progress_id, client_id, status, tier_at_claim, redemption_type)
SELECT mp.user_id, m.reward_id, mp.id, mp.client_id, 'claimable', u.current_tier, rw.redemption_type
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
JOIN rewards rw ON m.reward_id = rw.id
JOIN users u ON mp.user_id = u.id
WHERE mp.id = 'ffff0002-0002-0000-0000-000000000002';
```

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Verify `home-client.tsx` lines 155-181 contain inline claim logic
- [ ] Confirm no other files import from future `claimMissionReward.ts` location

#### Implementation Steps
- [ ] **Step 1:** Create centralized claim utility
  - Directory: `appcode/lib/client/` (CREATE if not exists)
  - File: `appcode/lib/client/claimMissionReward.ts`
  - Action: CREATE - New file with `"use client"` directive and `claimMissionReward()` function per Section 6
- [ ] **Step 2:** Update missions-client.tsx
  - File: `appcode/app/missions/missions-client.tsx`
  - Action: MODIFY - Add import, make `handleClaimMission` async, replace TODO with utility call
- [ ] **Step 3:** Update home-client.tsx
  - File: `appcode/app/home/home-client.tsx`
  - Action: MODIFY - Add import, replace inline claim logic (lines 155-181) with utility call

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Section 14 (instant claim test)
- [ ] **Regression: Scheduled rewards still work after async change**
  - [ ] Test discount scheduling on missions page
  - [ ] Test commission_boost scheduling on missions page
  - [ ] Test physical_gift modal opens on missions page
- [ ] Verify both pages use consistent error handling and refresh behavior
- [ ] Verify context-specific toast descriptions (home → Missions tab, missions → fulfillment)

---

## 16. Definition of Done

- [ ] `claimMissionReward.ts` utility created with `"use client"` directive, exported function and types
- [ ] `missions-client.tsx` imports and uses centralized utility
- [ ] `home-client.tsx` imports and uses centralized utility (replaces inline logic)
- [ ] Home page toast: "Check Missions tab for details"
- [ ] Missions page toast: "Check back soon for fulfillment updates"
- [ ] Both pages use consistent error handling and 2-second refresh delay
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed (instant claim + regression tests)
- [ ] No code duplication for API call, error handling, refresh logic
- [ ] This document status updated to "Implemented"

---

## 17. Future Work

- **Test Scaffolding:** Once testing infrastructure exists (`appcode/tests/**/*.test.ts`), add unit tests for `claimMissionReward()` utility covering:
  - Success path with toast and refresh callback
  - Error handling for network failures
  - Error handling for API error responses
  - Custom delay parameter behavior

---

## 18. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missions-client.tsx` | Lines 91-125, 140, 198, 682-691 | Current state and patterns to follow |
| `home-client.tsx` | Lines 133-181 | Working implementation to centralize |
| `MISSIONS_IMPL.md` | POST /api/missions/:id/claim section | API contract and backend behavior |
| `API_CONTRACTS.md` | Lines 3711-3779 | API specification |
| `SchemaFinalv2.md` | redemptions (594-664), rewards (462-592) | Database schema |
| `missionService.ts` | Lines 717-720, 891 | Status computation, ID mapping |
| `route.ts` (claim) | Lines 111-113 | Backend empty body handling |

---

**Document Version:** 1.6
**Last Updated:** 2025-12-21
**Author:** Claude Opus 4.5
**Status:** Analysis Complete

**Revision Notes:**
- v1.6: Changed missions page refresh from `router.refresh()` to `window.location.reload()` (per BUG-011 - useState ignores prop changes)
- v1.5: Changed utility path from `lib/utils/` to `lib/client/` (per audit - explicit client-only path)
- v1.5: Updated Dependency Graph to show new directory creation
- v1.4: Added `"use client"` directive to utility specification (per audit - prevent SSR bundling issues)
- v1.4: Added CLIENT-SIDE ONLY warning in Approach section
- v1.4: Added explicit regression tests to Implementation Checklist
- v1.4: Added Future Work section for test scaffolding follow-on
- v1.3: Made toast messages context-specific (per user feedback - home directs to Missions tab)
- v1.3: Updated utility interface to accept `successMessage` and `successDescription` params
- v1.2: Changed approach to centralized utility function (per user feedback on divergence risk)
- v1.2: Added `claimMissionReward.ts` as new file to create
- v1.2: Added `home-client.tsx` modification to use centralized utility
- v1.2: Updated Implementation Checklist with 3-step process
- v1.2: Updated Definition of Done for centralization requirements
- v1.1: Added Evidence 4 confirming `mission.id` is correct for claim API (per audit critical issue)
- v1.1: Added regression tests for scheduled rewards (per audit concern)
- v1.1: Added `missionService.ts` line 891 to Source Documents Analyzed
- v1.0: Initial gap documentation
