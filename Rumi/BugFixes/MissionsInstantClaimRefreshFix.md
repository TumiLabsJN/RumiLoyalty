# Missions Instant Claim Refresh - Fix Documentation

**Bug ID:** BUG-011-MissionsInstantClaimRefresh
**Created:** 2025-12-21
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** GAP-002-MissionsInstantClaim
**Linked Bugs:** None

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators complete missions (sales goals, video posts, raffles) to earn rewards (gift cards, commission boosts, discounts, physical gifts). The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering.

The bug affects the missions page instant claim feature which was just implemented as part of GAP-002. When a creator claims an instant reward (gift_card, spark_ads, experience), the API call succeeds and a toast appears, but the UI does not automatically refresh to show the updated status.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, sonner (toast notifications)
**Architecture Pattern:** Repository → Service → Route layers with React Server Components + Client Components

---

## 2. Bug Summary

**What's happening:** After claiming an instant reward on the `/missions` page, the toast message "Reward claimed!" appears correctly, but the UI remains unchanged. The mission card still shows "Claim Reward" button instead of transitioning to "Pending" status. Users must manually refresh the page to see the updated state.

**What should happen:** After the success toast appears and 2 seconds elapse, the page should automatically refresh and show the mission with "Pending" status (amber background with spinner icon).

**Impact:** Users experience confusing UX - they see a success message but the UI doesn't reflect the change. They may think the claim failed or attempt to claim again.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `missions-client.tsx` | Lines 54, 130 | Uses `useState(initialData)` pattern; calls `router.refresh()` for instant claims |
| `missions-client.tsx` | Lines 179, 237 | Scheduled rewards (discount, commission_boost) also use `router.refresh()` but work correctly |
| `home-client.tsx` | Lines 164 | Home page uses `window.location.reload()` for instant claims - works correctly |
| `claimMissionReward.ts` | Lines 49-50 | Utility calls `setTimeout(() => refreshFn(), refreshDelay)` with 2000ms default |
| `schedule-discount-modal.tsx` | Lines 217-223 | Modal calls `onClose()` AFTER `await onConfirm()` - causes state change before refresh |
| `MissionsInstantClaimGap.md` | Section 6 - Proposed Solution | Specification used `router.refresh()` for missions page |
| Next.js Documentation | App Router - router.refresh() | `router.refresh()` re-fetches server data but doesn't re-initialize client state |
| React Documentation | useState initialization | `useState(initialData)` only initializes on mount, not on prop changes |
| Browser Dev Tools | Network tab during testing | API call succeeds (200), `router.refresh()` fires, but component doesn't re-render |
| Manual testing | Missions page vs Home page | Home page claim works (uses `window.location.reload()`), Missions doesn't |
| Manual testing | Scheduled vs Instant claims | Scheduled claims work on missions page, instant claims don't |
| `missions-client.tsx` | Lines 792-803 | ScheduleDiscountModal has `onClose` callback that changes state before refresh fires |

### Key Evidence

**Evidence 1:** Missions page uses `useState` with server-passed `initialData`
- Source: `missions-client.tsx`, Component initialization (line 54)
- Code: `const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)`
- Implication: React only initializes state on mount. When `router.refresh()` re-fetches server data, the new `initialData` prop is ignored because the component is already mounted.

**Evidence 2:** Home page uses `window.location.reload()` and works correctly
- Source: `home-client.tsx`, handleClaimReward function (line 164)
- Code: `() => window.location.reload()`
- Implication: Full page reload forces complete re-mount, bypassing the stale state issue.

**Evidence 3:** Scheduled rewards work despite using `router.refresh()`
- Source: `missions-client.tsx`, handleScheduleDiscount (line 179), handleSchedulePayboost (line 237)
- Code: `setTimeout(() => router.refresh(), 2000)`
- Additional: Modal's `onClose()` callback at lines 797-798 triggers state changes (`setShowDiscountModal(false)`, `setSelectedMission(null)`)
- Implication: The state change from modal closing may trigger React to accept the refreshed data, while instant claims have no intervening state change.

**Evidence 4:** API call succeeds - verified via manual testing
- Source: Browser network tab, dev server logs
- Finding: POST `/api/missions/:id/claim` returns 200, redemption status updates to 'claimed' in database
- Implication: Bug is purely in frontend refresh mechanism, not in API or database layer.

**Evidence 5:** Manual page refresh shows correct state
- Source: Manual testing after instant claim
- Finding: After F5 refresh, mission shows "Pending" status correctly
- Implication: Server data is correct; only the client-side refresh mechanism is broken.

---

## 4. Root Cause Analysis

**Root Cause:** `router.refresh()` re-fetches server component data and passes new `initialData` props, but the client component's `useState(initialData)` does not re-initialize because React only uses the initial value on mount, not on subsequent renders.

**Contributing Factors:**
1. **React useState behavior:** `useState(initialValue)` only uses `initialValue` on component mount. After mount, prop changes are ignored unless explicitly handled with `useEffect`.
2. **No state synchronization:** missions-client.tsx lacks a `useEffect` to sync `missionsData` state with `initialData` prop changes.
3. **Different pattern on home page:** home-client.tsx uses `window.location.reload()` which forces full re-mount, avoiding this issue entirely.
4. **Scheduled rewards have intervening state changes:** Modal closing triggers state updates that may help React recognize the need to re-render.

**How it was introduced:** The GAP-002 implementation specified `router.refresh()` following the pattern used by scheduled rewards, without recognizing that scheduled rewards work due to modal state changes, not because `router.refresh()` alone is sufficient.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Confusing - success toast but no UI change | High |
| Data integrity | None - database is correctly updated | Low |
| Feature functionality | Partially broken - works after manual refresh | Medium |
| User trust | May think system is broken, attempt duplicate claims | Medium |

**Business Risk Summary:** Users will see a success message but unchanged UI, creating confusion and potentially support tickets. The feature technically works but the UX is broken, undermining confidence in the platform.

---

## 6. Current State

#### Current File(s)

**File:** `appcode/app/missions/missions-client.tsx`
```typescript
// Line 54 - State initialization
const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)

// Lines 123-131 - Instant claim call
// For other reward types (gift_card, spark_ads, experience), claim immediately
await claimMissionReward(
  {
    missionProgressId: mission.id,
    successMessage: 'Reward claimed!',
    successDescription: 'Check back soon for fulfillment updates',
  },
  () => router.refresh()  // ← BUG: This doesn't update useState
)
```

**Current Behavior:**
- User clicks "Claim Reward" on instant reward (gift_card, spark_ads, experience)
- API call succeeds, database updates correctly
- Toast "Reward claimed!" appears
- `router.refresh()` fires after 2 seconds
- Server component re-fetches data, passes new `initialData`
- **But:** `useState` ignores the new prop - UI stays unchanged
- User must manually refresh to see "Pending" status

#### Current Data Flow

```
User clicks "Claim Reward"
         ↓
handleClaimMission() → claimMissionReward()
         ↓
POST /api/missions/:id/claim → 200 OK
         ↓
toast.success() appears
         ↓
setTimeout(() => router.refresh(), 2000)
         ↓
Server Component re-fetches → new initialData prop
         ↓
❌ useState(initialData) ignores new prop (already mounted)
         ↓
UI unchanged - still shows "Claim Reward" button
```

---

## 7. Proposed Fix

#### Approach

Replace `router.refresh()` with `window.location.reload()` for instant claims on the missions page. This matches the pattern used by the home page and ensures a complete page re-mount that correctly initializes state.

#### Changes Required

**File:** `appcode/app/missions/missions-client.tsx`

**Before:**
```typescript
    // For other reward types (gift_card, spark_ads, experience), claim immediately
    await claimMissionReward(
      {
        missionProgressId: mission.id,
        successMessage: 'Reward claimed!',
        successDescription: 'Check back soon for fulfillment updates',
      },
      () => router.refresh()
    )
```

**After:**
```typescript
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

**Explanation:** `window.location.reload()` forces a full page reload, which unmounts and remounts all components. When the component remounts, `useState(initialData)` correctly initializes with the fresh server data.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/missions/missions-client.tsx` | MODIFY | Change `router.refresh()` to `window.location.reload()` on line 130 |

### Dependency Graph

```
missions-client.tsx
├── imports from: claimMissionReward (lib/client/claimMissionReward.ts)
├── imports from: useRouter (next/navigation) - still needed for scheduled rewards
└── affects: Instant claim UX only (gift_card, spark_ads, experience)

Scheduled rewards (lines 179, 237) remain unchanged - they work correctly.
```

---

## 9. Data Flow Analysis

#### Before Fix

```
User clicks "Claim Reward"
         ↓
claimMissionReward() → API success → toast
         ↓
setTimeout → router.refresh()
         ↓
Server re-fetches → new initialData prop
         ↓
❌ useState ignores new prop
         ↓
UI unchanged (BUG)
```

#### After Fix

```
User clicks "Claim Reward"
         ↓
claimMissionReward() → API success → toast
         ↓
setTimeout → window.location.reload()
         ↓
Full page reload → component unmounts
         ↓
Component remounts → useState(initialData) with fresh data
         ↓
✅ UI shows "Pending" status
```

#### Data Transformation Steps

1. **Step 1:** User clicks claim → `handleClaimMission` calls `claimMissionReward`
2. **Step 2:** API call succeeds → toast appears → setTimeout schedules refresh
3. **Step 3:** After 2 seconds, `window.location.reload()` triggers full page reload
4. **Step 4:** Server component fetches fresh data, client component mounts with correct state

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
missions-client.tsx (Client Component)
│
├─► handleClaimMission (line 92)
│   └── Handles claim button click, routes by reward type
│
├─► claimMissionReward (lib/client/claimMissionReward.ts)
│   ├── POST /api/missions/:id/claim
│   ├── Shows toast on success
│   └── ⚠️ Calls refreshFn() after delay - BUG IS HERE
│
└─► refreshFn = () => router.refresh()  ← PROBLEM
    └── Should be: () => window.location.reload()
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | redemptions table | Not involved - updates correctly |
| Repository | missionRepository.claimReward | Not involved - works correctly |
| Service | missionService | Not involved - works correctly |
| API Route | POST /api/missions/:id/claim | Not involved - returns 200 |
| Frontend | missions-client.tsx | ⚠️ BUG: Uses router.refresh() which doesn't update useState |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| redemptions | status, claimed_at | Correctly updated to 'claimed' by API |

#### Schema Check

```sql
-- Verify redemption was updated after claim
SELECT status, claimed_at FROM redemptions
WHERE mission_progress_id = 'ffff0002-0002-0000-0000-000000000002';
-- Returns: status='claimed', claimed_at=<timestamp>
```

#### Data Migration Required?
- [x] No - schema already supports fix (no database changes needed)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | missions-client.tsx | Minor - one line change |
| claimMissionReward | lib/client/claimMissionReward.ts | None - utility unchanged |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [x] Yes - Change `router.refresh()` to `window.location.reload()` on line 130

---

## 13. Alternative Solutions Considered

#### Option A: Add useEffect to sync state with props
- **Description:** Add `useEffect(() => setMissionsData(initialData), [initialData])` to sync state when props change
- **Pros:** Keeps `router.refresh()` pattern, more "React-like"
- **Cons:** Adds complexity, may cause unnecessary re-renders, initialData object reference changes on every render
- **Verdict:** ❌ Rejected - More complex, potential performance issues with object reference comparison

#### Option B: Use window.location.reload() (Selected)
- **Description:** Replace `router.refresh()` with `window.location.reload()` for instant claims
- **Pros:** Simple one-line fix, matches home page pattern, guaranteed to work
- **Cons:** Full page reload is slightly slower than soft refresh
- **Verdict:** ✅ Selected - Simplest fix, proven pattern from home page

#### Option C: Use key prop to force remount
- **Description:** Add a key prop to the component that changes on refresh
- **Pros:** Forces remount without full page reload
- **Cons:** Requires plumbing key through server component, adds complexity
- **Verdict:** ❌ Rejected - Over-engineered for this use case

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Full reload slower than soft refresh | Medium | Low | Acceptable - home page already uses this pattern |
| Scroll position lost on reload | Low | Low | User is interacting with mission card, minimal scroll |
| Scheduled rewards affected | None | None | Different code path, unchanged |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | N/A |
| Database | No | N/A |
| Frontend | No | Behavior improvement only |

---

## 15. Testing Strategy

#### Unit Tests

No existing test infrastructure. Unit tests deferred.

#### Integration Tests

No existing test infrastructure. Integration tests deferred.

#### Manual Verification Steps

1. [ ] Reset test mission to claimable state:
   ```sql
   UPDATE redemptions SET status = 'claimable', claimed_at = NULL
   WHERE mission_progress_id = 'ffff0002-0002-0000-0000-000000000002';
   ```
2. [ ] Navigate to `/missions` page
3. [ ] Find mission with gift_card reward in "Claim Reward" state
4. [ ] Click "Claim Reward" button
5. [ ] Verify toast appears: "Reward claimed!" with "Check back soon for fulfillment updates"
6. [ ] Wait 2 seconds - verify page reloads automatically
7. [ ] Verify mission now shows "Pending" status (amber background, spinner)

#### Regression Tests

8. [ ] Test scheduled discount claim still works (modal → schedule → UI updates)
9. [ ] Test scheduled commission_boost claim still works
10. [ ] Test physical_gift modal still opens correctly

#### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Modify instant claim refresh function
  - File: `appcode/app/missions/missions-client.tsx`
  - Line: 130
  - Change: `router.refresh()` → `window.location.reload()`

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy (steps 1-7)
- [ ] Regression tests (steps 8-10)

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| GAP-002 | MissionsInstantClaim | Bug discovered during implementation testing |

#### Updates Required

**GAP-002 MissionsInstantClaimGap.md:**
- Update Section 6 to specify `window.location.reload()` instead of `router.refresh()`
- Add note about useState/router.refresh() incompatibility

#### New Tasks Created (if any)
- None - this is a fix to existing implementation

---

## 18. Definition of Done

- [ ] Code change implemented: `router.refresh()` → `window.location.reload()` on line 130
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: instant claim updates UI after 2 seconds
- [ ] Regression verification: scheduled rewards still work
- [ ] MissionsInstantClaimGap.md updated to reflect correct pattern
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missions-client.tsx` | Component initialization, handleClaimMission | Shows useState pattern and current refresh call |
| `home-client.tsx` | handleClaimReward | Shows working pattern with window.location.reload() |
| `claimMissionReward.ts` | claimMissionReward function | Centralized utility that accepts refreshFn parameter |
| `schedule-discount-modal.tsx` | onConfirm handler | Shows modal closes after confirm, explaining why scheduled works |
| `MissionsInstantClaimGap.md` | Section 6 - Proposed Solution | Original specification that needs correction |
| React Documentation | useState | Explains initial value only used on mount |
| Next.js Documentation | useRouter - refresh() | Explains router.refresh() behavior |

### Reading Order for External Auditor

1. **First:** `MissionsInstantClaimGap.md` - Section 6 - Provides context on what was implemented
2. **Second:** `missions-client.tsx` - Lines 54, 123-131 - Shows useState pattern and current bug
3. **Third:** `home-client.tsx` - Line 164 - Shows working pattern to follow
4. **Fourth:** `schedule-discount-modal.tsx` - Lines 217-223 - Explains why scheduled rewards work

---

**Document Version:** 1.0
**Last Updated:** 2025-12-21
**Author:** Claude Opus 4.5
**Status:** Analysis Complete
