# Scheduled Reward Refresh Bug - Fix Documentation

**Bug ID:** BUG-012-ScheduledRewardRefresh
**Created:** 2025-12-21
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** Phase 5 - Missions System
**Linked Bugs:** BUG-011 (useState ignores prop changes - same root cause)

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators complete missions (sales goals, video posts, raffles) to earn rewards (gift cards, commission boosts, discounts, physical gifts). The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering and is deployed on Vercel.

The bug affects the `/missions` page where creators schedule commission boost and discount rewards. After scheduling, the page should refresh to show the updated mission status, but it doesn't.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Bug Summary

**What's happening:** After a creator schedules a commission boost or discount reward on the `/missions` page, the modal closes but the page doesn't refresh. The mission card still shows "Claim Reward" instead of updating to "Scheduled" status.

**What should happen:** After successfully scheduling a reward, the page should refresh after a 2-second delay (for toast visibility), and the mission card should update to show the scheduled status.

**Impact:** Creators think the scheduling failed because the UI doesn't update. They may click "Claim" again, causing confusion or potential duplicate API calls. This creates a frustrating user experience and may generate support tickets.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `missions-client.tsx` | `handleSchedulePayboost` function (lines 192-248) | Uses `router.refresh()` at line 237 which doesn't trigger re-render |
| `missions-client.tsx` | `handleScheduleDiscount` function (lines 132-190) | Uses `router.refresh()` at line 179 - same bug |
| `home-client.tsx` | All refresh handlers | Consistently uses `window.location.reload()` - works correctly |
| `MissionsInstantClaimGap.md` | Revision Notes v1.6 | Documents BUG-011: "useState ignores prop changes" - same root cause |
| `MissionsInstantClaimGap.md` | Section 6 - Proposed Solution | Shows `window.location.reload()` pattern as the fix |
| `claimMissionReward.ts` | `refreshFn` parameter | Utility accepts refresh function, callers pass `window.location.reload` |
| `schedule-payboost-modal.tsx` | `handleConfirm` function | Modal calls parent's `onConfirm`, parent handles refresh |
| `SchemaFinalv2.md` | `redemptions` table | `status` transitions from 'claimable' → 'claimed' on schedule |
| `SchemaFinalv2.md` | `commission_boost_redemptions` table | `boost_status` set to 'scheduled' with `scheduled_activation_date` |

### Key Evidence

**Evidence 1:** Commission boost handler uses `router.refresh()`
- Source: `missions-client.tsx`, `handleSchedulePayboost` function
- Code: `setTimeout(() => router.refresh(), 2000)` at line 237
- Implication: `router.refresh()` doesn't trigger component re-render due to Next.js App Router behavior with useState

**Evidence 2:** Discount handler has identical bug
- Source: `missions-client.tsx`, `handleScheduleDiscount` function
- Code: `setTimeout(() => router.refresh(), 2000)` at line 179
- Implication: Both scheduled reward types are affected

**Evidence 3:** Home page uses correct pattern
- Source: `home-client.tsx`, all refresh calls
- Code: `setTimeout(() => window.location.reload(), 1500)` (lines 184, 219, 252, 533)
- Implication: Working pattern exists - just needs to be applied to missions page

**Evidence 4:** Previous bug fix documented same issue
- Source: `MissionsInstantClaimGap.md`, v1.6 revision notes
- Quote: "Changed missions page refresh from `router.refresh()` to `window.location.reload()` (per BUG-011 - useState ignores prop changes)"
- Implication: This is a known issue with a documented solution

**Evidence 5:** Grep search confirms inconsistency
- Command: `grep "router\.refresh\(\)|window\.location\.reload\(\)"`
- Results: `missions-client.tsx` has 2 uses of `router.refresh()` (lines 179, 237) while `home-client.tsx` consistently uses `window.location.reload()`
- Implication: Inconsistent refresh strategy between pages

---

## 4. Root Cause Analysis

**Root Cause:** Next.js App Router's `router.refresh()` re-fetches server components but doesn't trigger re-renders for client components that receive data via props and store it in useState.

**Contributing Factors:**
1. `missions-client.tsx` stores `initialMissions` prop in `useState` on mount
2. `router.refresh()` fetches new data but component ignores prop changes after mount
3. Two handlers (`handleScheduleDiscount`, `handleSchedulePayboost`) were not updated when BUG-011 fix was applied to instant claims

**How it was introduced:** When the missions page was implemented, `router.refresh()` was used assuming it would update the UI. The limitation was discovered later (BUG-011) and fixed for instant claims, but the scheduled reward handlers were missed.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creator thinks scheduling failed, may retry or abandon | High |
| Data integrity | No impact - API call succeeds, only UI doesn't update | Low |
| Feature functionality | Feature works but appears broken | Medium |
| Support load | Potential increase in "scheduling not working" tickets | Medium |

**Business Risk Summary:** Creators cannot see confirmation that their scheduled reward was successfully set up, creating distrust in the platform and potential abandonment of the reward claim flow.

---

## 6. Current State

#### Current File(s)

**File:** `appcode/app/missions/missions-client.tsx`
```typescript
// handleScheduleDiscount - lines 173-179
toast.success(`Discount scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
  description: "We'll activate your discount at this time",
  duration: 5000,
})

// Refresh page to update mission status (2 second delay for toast visibility)
setTimeout(() => router.refresh(), 2000)  // ← BUG: Doesn't work

// handleSchedulePayboost - lines 231-237
toast.success(`Commission boost scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
  description: "We'll activate your boost at this time",
  duration: 5000,
})

// Refresh page to update mission status (2 second delay for toast visibility)
setTimeout(() => router.refresh(), 2000)  // ← BUG: Doesn't work
```

**Current Behavior:**
- User clicks "Schedule Activation" in modal
- API call succeeds (POST to `/api/missions/:id/claim`)
- Toast appears with success message
- Modal closes
- **Page does NOT refresh** - mission card still shows "Claim Reward"
- User must manually refresh to see updated status

#### Current Data Flow

```
User selects date in modal
         ↓
handleSchedulePayboost() called
         ↓
POST /api/missions/:id/claim (SUCCESS)
         ↓
Database updated: redemptions.status='claimed', commission_boost_redemptions created
         ↓
toast.success() shown
         ↓
setTimeout(() => router.refresh(), 2000)
         ↓
router.refresh() executes (server data fetched)
         ↓
useState ignores new props ← BUG
         ↓
UI shows stale "Claim Reward" state
```

---

## 7. Proposed Fix

#### Approach

Replace `router.refresh()` with `window.location.reload()` in both scheduled reward handlers. This forces a full page reload, ensuring the component receives fresh data and re-initializes useState.

#### Changes Required

**File:** `appcode/app/missions/missions-client.tsx`

**Change 1 - Remove unused import (line 28):**

**Before:**
```typescript
import { useRouter } from "next/navigation"
```

**After:**
```typescript
// REMOVE THIS LINE - no longer needed
```

**Explanation:** `useRouter` is only used for `router.refresh()` calls which are being replaced.

---

**Change 2 - Remove unused router declaration (line 51):**

**Before:**
```typescript
// Router for page refresh after claim
const router = useRouter()
```

**After:**
```typescript
// REMOVE THESE LINES - no longer needed
```

**Explanation:** The `router` variable is only used in the two refresh calls being replaced.

---

**Change 3 - Update discount handler (line 179):**

**Before:**
```typescript
setTimeout(() => router.refresh(), 2000)
```

**After:**
```typescript
setTimeout(() => window.location.reload(), 2000)
```

**Explanation:** `window.location.reload()` performs a full page reload, causing the component to unmount and remount with fresh server data.

---

**Change 4 - Update commission boost handler (line 237):**

**Before:**
```typescript
setTimeout(() => router.refresh(), 2000)
```

**After:**
```typescript
setTimeout(() => window.location.reload(), 2000)
```

**Explanation:** Same fix applied to commission boost handler for consistency.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/missions/missions-client.tsx` | MODIFY | Remove `useRouter` import, remove `router` declaration, replace 2 instances of `router.refresh()` with `window.location.reload()` |

### Dependency Graph

```
missions-client.tsx
├── imports from: next/navigation (useRouter - REMOVE after fix)
├── imported by: missions/page.tsx (server component)
└── affects: Mission card UI state after scheduling
```

---

## 9. Data Flow Analysis

#### Before Fix

```
API Success → toast.success() → router.refresh()
                                      ↓
                              Server data fetched
                                      ↓
                              useState ignores new props
                                      ↓
                              UI shows stale state ❌
```

#### After Fix

```
API Success → toast.success() → window.location.reload()
                                      ↓
                              Full page reload
                                      ↓
                              Component remounts with fresh data
                                      ↓
                              UI shows "Scheduled" status ✓
```

#### Data Transformation Steps

1. **Step 1:** User schedules reward → API updates database
2. **Step 2:** `window.location.reload()` triggers full page reload
3. **Step 3:** Server component fetches fresh missions data
4. **Step 4:** Client component mounts with new `initialMissions` prop
5. **Step 5:** useState initializes with fresh data showing "Scheduled" status

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
SchedulePayboostModal (schedule-payboost-modal.tsx)
│
├─► handleConfirm() - User clicks "Schedule Activation"
│   └── Calls parent's onConfirm(scheduledDate)
│
└─► handleSchedulePayboost() (missions-client.tsx)
    ├── POST /api/missions/:id/claim
    ├── toast.success()
    └── ⚠️ BUG: setTimeout(() => router.refresh(), 2000)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `redemptions`, `commission_boost_redemptions` | Updated correctly - not the issue |
| Repository | `missionRepository.claimReward()` | Works correctly |
| Service | `missionService.claimMissionReward()` | Works correctly |
| API Route | `POST /api/missions/:id/claim` | Works correctly |
| Frontend | `missions-client.tsx` | ⚠️ BUG: Uses `router.refresh()` |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `redemptions` | `status`, `claimed_at`, `scheduled_activation_date` | Updated from 'claimable' to 'claimed' |
| `commission_boost_redemptions` | `boost_status`, `scheduled_activation_date` | Created with 'scheduled' status |

#### Schema Check

```sql
-- Verify scheduling worked (not the bug - database is fine)
SELECT r.status, r.scheduled_activation_date, cbr.boost_status
FROM redemptions r
LEFT JOIN commission_boost_redemptions cbr ON cbr.redemption_id = r.id
WHERE r.mission_progress_id = '<mission_progress_id>';
```

#### Data Migration Required?
- [x] No - schema already supports fix (this is a frontend-only bug)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `missions-client.tsx` | Minor - 2 line changes |
| SchedulePayboostModal | `schedule-payboost-modal.tsx` | None - already correct |
| ScheduleDiscountModal | `schedule-discount-modal.tsx` | None - already correct |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [x] Yes - Replace `router.refresh()` with `window.location.reload()` in 2 locations

---

## 13. Alternative Solutions Considered

#### Option A: Fix useState to sync with props
- **Description:** Use useEffect to update state when props change
- **Pros:** More React-idiomatic, uses `router.refresh()`
- **Cons:** Adds complexity, potential for stale closure bugs, inconsistent with home page pattern
- **Verdict:** ❌ Rejected - Over-engineering for this use case

#### Option B: Use `window.location.reload()` (Selected)
- **Description:** Replace `router.refresh()` with `window.location.reload()`
- **Pros:** Simple, consistent with home page, proven to work (BUG-011 fix)
- **Cons:** Full page reload instead of soft navigation (heavier UX)
- **UX Trade-off Accepted:** Full reload is acceptable because:
  - 2-second delay preserves toast visibility
  - Missions page has no form state to lose
  - Same pattern already used successfully on home page
  - Scroll position loss is minor (user just completed an action)
- **Verdict:** ✅ Selected - Matches existing pattern, minimal risk

#### Option C: Use SWR/React Query for data fetching
- **Description:** Implement client-side data fetching with cache invalidation
- **Pros:** More sophisticated state management, automatic revalidation
- **Cons:** Major refactor, adds dependencies, overkill for current needs
- **Verdict:** ❌ Rejected - Too much scope creep

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Full reload causes flash | Low | Low | 2-second delay for toast visibility |
| User loses unseen state | Low | Low | No forms or unsaved state on missions page |
| Inconsistent behavior | Low | Medium | Using same pattern as home page |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes |
| Database | No | No changes |
| Frontend | No | Just refresh behavior change |

---

## 15. Testing Strategy

#### Unit Tests

No existing test infrastructure (`appcode/tests/**/*.test.ts` = 0 files). Unit tests deferred.

#### Integration Tests

No existing test infrastructure. Integration tests deferred.

#### Manual Verification Steps

**Commission Boost Scheduling Test:**
1. [ ] Reset video mission to claimable state (use reset query from session)
2. [ ] Login as testbronze@test.com
3. [ ] Navigate to `/missions`
4. [ ] Find video mission with commission_boost reward in "Claim Reward" state
5. [ ] Click "Claim Reward" button
6. [ ] Select a date in the calendar modal
7. [ ] Click "Schedule Activation"
8. [ ] Verify success toast appears
9. [ ] Wait 2 seconds
10. [ ] Verify page refreshes automatically
11. [ ] Verify mission card shows "Scheduled" status (not "Claim Reward")

**Discount Scheduling Test:**
12. [ ] Assign discount reward to a mission and reset to claimable
13. [ ] Click "Claim Reward" on discount mission
14. [ ] Select date and time in discount modal
15. [ ] Click "Schedule Discount"
16. [ ] Verify toast appears and page refreshes after 2 seconds
17. [ ] Verify mission shows scheduled status

**Regression Tests:**
18. [ ] Verify instant claim (gift_card) still works from missions page
19. [ ] Verify physical_gift modal still works
20. [ ] Verify home page claim flows still work

#### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Run dev server for manual testing
npm run dev
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand `missions-client.tsx` current state
- [ ] Verify lines 179 and 237 contain `router.refresh()`
- [ ] Confirm no other handlers depend on these specific lines

#### Implementation Steps
- [ ] **Step 1:** Remove unused import
  - File: `appcode/app/missions/missions-client.tsx`
  - Change: Line 28 - Remove `import { useRouter } from "next/navigation"`
- [ ] **Step 2:** Remove unused router declaration
  - File: `appcode/app/missions/missions-client.tsx`
  - Change: Lines 50-51 - Remove comment and `const router = useRouter()`
- [ ] **Step 3:** Update discount handler
  - File: `appcode/app/missions/missions-client.tsx`
  - Change: Line ~177 (after removals) - Replace `router.refresh()` with `window.location.reload()`
- [ ] **Step 4:** Update commission boost handler
  - File: `appcode/app/missions/missions-client.tsx`
  - Change: Line ~233 (after removals) - Replace `router.refresh()` with `window.location.reload()`

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Schedule a commission boost, verify page refreshes
- [ ] Manual verification: Schedule a discount, verify page refreshes
- [ ] Regression test: Instant claim still works

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 5 | Missions System | Bug in claim flow UX |

#### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix within existing scope.

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [ ] `useRouter` import removed from line 28
- [ ] `const router = useRouter()` declaration removed from lines 50-51
- [ ] Discount handler uses `window.location.reload()` instead of `router.refresh()`
- [ ] Commission boost handler uses `window.location.reload()` instead of `router.refresh()`
- [ ] Type checker passes with no errors (no unused variable warnings)
- [ ] Build completes successfully
- [ ] Manual verification: Commission boost scheduling refreshes page
- [ ] Manual verification: Discount scheduling refreshes page
- [ ] Regression: Instant claims still work
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missions-client.tsx` | `handleSchedulePayboost`, `handleScheduleDiscount` | Current buggy code |
| `home-client.tsx` | All refresh handlers | Working pattern reference |
| `MissionsInstantClaimGap.md` | Revision Notes v1.6 | Documents BUG-011 and solution |
| `schedule-payboost-modal.tsx` | `handleConfirm` | Modal callback flow |
| `SchemaFinalv2.md` | `redemptions`, `commission_boost_redemptions` | Database state after scheduling |

### Reading Order for External Auditor

1. **First:** This document Section 3 (Discovery Evidence) - Provides bug evidence
2. **Second:** `MissionsInstantClaimGap.md` Section v1.6 notes - Shows same issue was fixed elsewhere
3. **Third:** `missions-client.tsx` lines 179, 237 - Shows current buggy code
4. **Fourth:** `home-client.tsx` refresh patterns - Shows correct implementation

---

**Document Version:** 1.1
**Last Updated:** 2025-12-21
**Author:** Claude Opus 4.5
**Status:** Analysis Complete

**Revision Notes:**
- v1.1: Added cleanup steps for unused `useRouter` import and `router` variable (per audit)
- v1.1: Added UX trade-off acknowledgment for full page reload
- v1.0: Initial bug documentation
