# VIP Reward Scheduling Not Calling API - Fix Documentation

**Bug ID:** BUG-013-VIPSchedulingNoAPI
**Created:** 2025-12-25
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Phase 6 - Rewards System
**Linked Bugs:** BUG-012 (ScheduledRewardRefresh - same page, different issue)

---

## 1. Project Context

This is a TikTok creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). Creators earn VIP tier rewards (commission boosts, discounts, gift cards, etc.) based on their tier level. The platform follows a Repository → Service → Route architecture with multi-tenant isolation via `client_id` filtering and is deployed on Vercel.

The bug affects the `/rewards` page where creators schedule VIP tier rewards (commission boosts and discounts). When a user selects a date and confirms scheduling, the frontend shows a success toast but never actually calls the backend API to create the redemption.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + Auth + RLS), Tailwind CSS, Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase client

---

## 2. Bug Summary

**What's happening:** When a creator schedules a VIP tier commission boost or discount reward on the `/rewards` page, the modal closes and a success toast appears, but no API call is made. The redemption is never created in the database. The frontend code contains `TODO` comments and uses `await new Promise(resolve => setTimeout(...))` to simulate the API call instead of actually calling it.

**What should happen:** After the creator confirms the scheduling date, the frontend should call `POST /api/rewards/:id/claim` with `{ scheduledActivationAt: scheduledDate.toISOString() }`. This creates a redemption record with `status='claimed'` and the appropriate sub-state record (commission_boost_redemptions or discount scheduling in redemptions).

**Impact:** VIP tier scheduled rewards are completely non-functional. Creators believe they have scheduled rewards (due to success toast) but nothing happens. This affects all Silver+ tier users trying to claim commission boosts or discounts from the rewards page.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/rewards/rewards-client.tsx` | `handleScheduleDiscount` function (lines 115-153) | Contains `// TODO: POST /api/rewards/:id/claim` comment and simulated delay instead of actual API call |
| `appcode/app/rewards/rewards-client.tsx` | `handleSchedulePayboost` function (lines 155-193) | Contains identical `// TODO: POST /api/rewards/:id/claim` comment and simulated delay |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | Full file | Fully implemented API route that handles reward claiming with validation, sub-state creation, and calendar events |
| `appcode/lib/services/rewardService.ts` | `claimReward` method | Complete implementation including 11 validation rules, redemption creation, sub-state creation |
| `appcode/lib/repositories/rewardRepository.ts` | `redeemReward` method | Creates redemption + commission_boost_redemptions sub-state atomically |
| `SchemaFinalv2.md` | Section 4 - redemptions table | Documents redemption lifecycle: claimable → claimed → fulfilled → concluded |
| `SchemaFinalv2.md` | Section 5 - commission_boost_redemptions table | Documents 6-state boost lifecycle: scheduled → active → expired → pending_info → pending_payout → paid |
| `MissionsRewardsFlows.md` | Commission Boost Reward Flow | Step 3: User claims & schedules activation date, creates redemption + sub-state |
| `API_CONTRACTS.md` | POST /api/rewards/:id/claim | Documents request body `{ scheduledActivationAt }` and response format |
| Database query results | `get_available_rewards` RPC | Shows `redemption_id = null` for VIP tier rewards, confirming no redemptions created |
| Database query results | `redemptions` table | Query showed 0 VIP tier redemptions exist (`reward_source = 'vip_tier'`) |
| `BugFixes/ScheduledRewardRefreshFix.md` | Full document | Documents similar issue on `/missions` page where `router.refresh()` doesn't work - different bug, same area |

### Key Evidence

**Evidence 1:** Frontend `handleScheduleDiscount` has TODO and fake delay
- Source: `appcode/app/rewards/rewards-client.tsx`, lines 121-125
- Code:
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }

// Simulate API call
await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))
```
- Implication: API call was planned but never implemented; function simulates success without actual backend interaction

**Evidence 2:** Frontend `handleSchedulePayboost` has identical TODO and fake delay
- Source: `appcode/app/rewards/rewards-client.tsx`, lines 161-165
- Code:
```typescript
// TODO: POST /api/rewards/:id/claim
// Request body: { scheduledActivationAt: scheduledDate.toISOString() }

// Simulate API call
await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))
```
- Implication: Both scheduled reward handlers are broken in identical ways

**Evidence 3:** Backend API route is fully implemented and working
- Source: `appcode/app/api/rewards/[rewardId]/claim/route.ts`, full file
- Implication: Backend is ready, only frontend connection is missing

**Evidence 4:** Database has zero VIP tier redemptions
- Source: SQL query `SELECT * FROM redemptions WHERE reward_source = 'vip_tier'`
- Result: 0 rows returned
- Implication: No VIP tier reward has ever been successfully claimed through the system

**Evidence 5:** RPC returns rewards but no redemption data
- Source: SQL query on `get_available_rewards` RPC for Silver user
- Result: Both discount and commission_boost rewards returned with `redemption_id = null`
- Implication: Rewards exist and are visible, but claiming flow never executes

---

## 4. Root Cause Analysis

**Root Cause:** The frontend scheduling handlers (`handleScheduleDiscount` and `handleSchedulePayboost`) contain placeholder TODO comments and use simulated delays instead of actual API calls. The backend API exists and is fully functional, but the frontend never calls it.

**Contributing Factors:**
1. Development was likely done in phases - frontend UI first, backend API second, but the connection was never completed
2. The simulated delay + success toast made manual testing appear to work
3. No integration tests to catch the missing API call
4. The `/missions` page has similar handlers that DO call the API (different code path), so the pattern exists elsewhere

**How it was introduced:** Incomplete implementation - the frontend modal and UI were built with placeholder code, the backend was built separately, but the final step of connecting them was never completed.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators think they scheduled rewards but nothing happens; complete feature failure | High |
| Data integrity | No data corruption, but expected data is never created | Medium |
| Feature functionality | VIP tier scheduled rewards (commission_boost, discount) are 100% non-functional | High |
| Trust/Retention | Creators may lose trust in platform when "scheduled" rewards never activate | High |

**Business Risk Summary:** VIP tier scheduled rewards are a core value proposition for Silver+ tier creators. Complete non-functionality of this feature means higher-tier creators receive no benefit from their status, potentially leading to churn and loss of top performers.

---

## 6. Current State

#### Current File(s)

**File:** `appcode/app/rewards/rewards-client.tsx`
```typescript
const handleScheduleDiscount = async (scheduledDate: Date) => {
  if (!selectedDiscount) return

  console.log("[v0] Schedule discount for:", selectedDiscount.id, scheduledDate.toISOString())

  try {
    // TODO: POST /api/rewards/:id/claim
    // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

    // Show success message with user's local time
    const localDateStr = scheduledDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: userTimezone,
    });
    const localTimeStr = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: userTimezone,
    });

    toast.success(`Discount scheduled for ${localDateStr} at ${localTimeStr}`, {
      description: "We'll activate your boost at this time",
      duration: 5000,
    })

    // Reset selected discount
    setSelectedDiscount(null)
  } catch (error) {
    console.error("Failed to schedule discount:", error)
    toast.error("Failed to schedule discount", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}

const handleSchedulePayboost = async (scheduledDate: Date) => {
  if (!selectedPayboost) return

  console.log("[v0] Schedule payboost for:", selectedPayboost.id, scheduledDate.toISOString())

  try {
    // TODO: POST /api/rewards/:id/claim
    // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

    // Show success message with user's local time
    const localDateStr = scheduledDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: userTimezone,
    });
    const localTimeStr = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: userTimezone,
    });

    toast.success(`Pay Boost scheduled for ${localDateStr} at ${localTimeStr}`, {
      description: "We'll activate your commission boost at this time",
      duration: 5000,
    })

    // Reset selected payboost
    setSelectedPayboost(null)
  } catch (error) {
    console.error("Failed to schedule pay boost:", error)
    toast.error("Failed to schedule pay boost", {
      description: "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**Current Behavior:**
- User clicks "Schedule" on a discount or commission boost reward
- Modal opens, user selects a date
- User clicks "Confirm"
- Frontend waits 1.5 seconds (SCHEDULE_DELAY_MS)
- Success toast appears
- Modal closes
- **No API call is made**
- **No redemption is created in database**
- Reward still shows as "claimable" on page refresh

#### Current Data Flow

```
User clicks "Schedule" on reward card
         ↓
Modal opens (ScheduleDiscountModal or SchedulePayboostModal)
         ↓
User selects date, clicks confirm
         ↓
handleScheduleDiscount() or handleSchedulePayboost() called
         ↓
await new Promise(setTimeout) ← FAKE DELAY, NO API CALL
         ↓
toast.success() shown
         ↓
setSelectedDiscount(null) or setSelectedPayboost(null)
         ↓
Database unchanged, redemption never created ❌
```

---

## 7. Proposed Fix

#### Approach

Replace the simulated delay with an actual `fetch()` call to `POST /api/rewards/:id/claim`. Add proper error handling that parses backend error responses. Add page refresh after successful claim to update UI state (following the pattern from BUG-012 fix).

#### Changes Required

**File:** `appcode/app/rewards/rewards-client.tsx`

**Change 1 - Update handleScheduleDiscount:**

**Before:**
```typescript
const handleScheduleDiscount = async (scheduledDate: Date) => {
  if (!selectedDiscount) return

  console.log("[v0] Schedule discount for:", selectedDiscount.id, scheduledDate.toISOString())

  try {
    // TODO: POST /api/rewards/:id/claim
    // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

    // Show success message with user's local time
    // ... rest of function
```

**After:**
```typescript
const handleScheduleDiscount = async (scheduledDate: Date) => {
  if (!selectedDiscount) return

  console.log("[RewardsClient] Schedule discount for:", selectedDiscount.id, scheduledDate.toISOString())

  try {
    // POST /api/rewards/:id/claim
    const response = await fetch(`/api/rewards/${selectedDiscount.id}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduledActivationAt: scheduledDate.toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to schedule discount')
    }

    // Show success message with user's local time
    // ... rest of function unchanged ...

    // Refresh page to update reward status (per BUG-012 fix pattern)
    setTimeout(() => window.location.reload(), 2000)
```

**Explanation:** Replaces fake delay with actual API call. Parses error response for user-friendly message. Adds page refresh after success to update UI.

---

**Change 2 - Update handleSchedulePayboost:**

**Before:**
```typescript
const handleSchedulePayboost = async (scheduledDate: Date) => {
  if (!selectedPayboost) return

  console.log("[v0] Schedule payboost for:", selectedPayboost.id, scheduledDate.toISOString())

  try {
    // TODO: POST /api/rewards/:id/claim
    // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

    // Show success message with user's local time
    // ... rest of function
```

**After:**
```typescript
const handleSchedulePayboost = async (scheduledDate: Date) => {
  if (!selectedPayboost) return

  console.log("[RewardsClient] Schedule payboost for:", selectedPayboost.id, scheduledDate.toISOString())

  try {
    // POST /api/rewards/:id/claim
    const response = await fetch(`/api/rewards/${selectedPayboost.id}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scheduledActivationAt: scheduledDate.toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Failed to schedule pay boost')
    }

    // Show success message with user's local time
    // ... rest of function unchanged ...

    // Refresh page to update reward status (per BUG-012 fix pattern)
    setTimeout(() => window.location.reload(), 2000)
```

**Explanation:** Same fix pattern as handleScheduleDiscount - actual API call with error handling and page refresh.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/rewards/rewards-client.tsx` | MODIFY | Replace fake delays with actual fetch() calls in handleScheduleDiscount and handleSchedulePayboost |

### Dependency Graph

```
rewards-client.tsx
├── imports from: react, lucide-react, sonner, next/link, UI components
├── imported by: rewards/page.tsx (server component)
├── calls: POST /api/rewards/:id/claim (NEW - currently not called)
└── affects: Reward card UI state after scheduling
```

---

## 9. Data Flow Analysis

#### Before Fix

```
User confirms schedule in modal
         ↓
handleSchedulePayboost() called
         ↓
await new Promise(setTimeout) ← FAKE - no network call
         ↓
toast.success() shown
         ↓
UI unchanged, database unchanged ❌
```

#### After Fix

```
User confirms schedule in modal
         ↓
handleSchedulePayboost() called
         ↓
fetch('/api/rewards/:id/claim', { scheduledActivationAt }) ← REAL API CALL
         ↓
Backend validates, creates redemption + sub-state
         ↓
toast.success() shown
         ↓
window.location.reload() after 2s
         ↓
UI shows "Scheduled" status, database has redemption ✓
```

#### Data Transformation Steps

1. **Step 1:** User selects date in modal → scheduledDate (Date object)
2. **Step 2:** Frontend converts to ISO string → `scheduledDate.toISOString()`
3. **Step 3:** API receives, validates (weekday 9-16 EST for discount, future date for boost)
4. **Step 4:** Backend creates `redemptions` row with `status='claimed'`, `scheduled_activation_date`, `scheduled_activation_time`
5. **Step 5:** For commission_boost: Backend creates `commission_boost_redemptions` row with `boost_status='scheduled'`
6. **Step 6:** Page refresh triggers `get_available_rewards` RPC which now returns redemption data
7. **Step 7:** `computeStatus()` in rewardService returns `status='scheduled'` with `statusDetails.scheduledDate`

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
SchedulePayboostModal (schedule-payboost-modal.tsx)
│
├─► User clicks "Schedule Activation"
│   └── Calls onConfirm(scheduledDate)
│
└─► handleSchedulePayboost() (rewards-client.tsx)
    ├── ⚠️ BUG: await new Promise(setTimeout) - NO API CALL
    ├── toast.success()
    └── setSelectedPayboost(null)

AFTER FIX:

└─► handleSchedulePayboost() (rewards-client.tsx)
    ├── fetch('/api/rewards/:id/claim') ← NEW
    │   │
    │   └─► POST /api/rewards/[rewardId]/claim/route.ts
    │       ├── auth validation (Supabase)
    │       ├── userRepository.findByAuthId()
    │       ├── dashboardRepository.getUserDashboard()
    │       └── rewardService.claimReward()
    │           ├── 11 validation rules
    │           ├── rewardRepository.redeemReward()
    │           │   ├── INSERT redemptions
    │           │   └── INSERT commission_boost_redemptions
    │           └── createCommissionBoostScheduledEvent() (Google Calendar)
    │
    ├── toast.success()
    └── window.location.reload()
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `redemptions`, `commission_boost_redemptions` | Never receives INSERT - not the issue |
| Repository | `rewardRepository.redeemReward()` | Never called - not the issue |
| Service | `rewardService.claimReward()` | Never called - not the issue |
| API Route | `POST /api/rewards/:id/claim` | Fully implemented, never called - not the issue |
| Frontend | `rewards-client.tsx` | ⚠️ BUG: Handlers don't call API |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `redemptions` | `id`, `user_id`, `reward_id`, `status`, `claimed_at`, `scheduled_activation_date`, `scheduled_activation_time`, `redemption_type` | Main redemption record |
| `commission_boost_redemptions` | `id`, `redemption_id`, `boost_status`, `scheduled_activation_date`, `duration_days`, `boost_rate` | Sub-state for commission boosts |
| `rewards` | `id`, `type`, `reward_source`, `tier_eligibility` | Reward definitions (already correct) |

#### Schema Check

```sql
-- Verify schema supports fix (it does - tables exist and have correct columns)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'redemptions'
AND column_name IN ('scheduled_activation_date', 'scheduled_activation_time', 'redemption_type');

-- Expected result: 3 rows showing these columns exist
```

#### Data Migration Required?
- [x] No - schema already supports fix (all tables and columns exist)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| RewardsClient | `rewards-client.tsx` | Major - 2 function changes |
| ScheduleDiscountModal | `schedule-discount-modal.tsx` | None - already correct |
| SchedulePayboostModal | `schedule-payboost-modal.tsx` | None - already correct |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No - API already exists, just not called |

### Frontend Changes Required?
- [x] Yes - Replace fake delays with actual fetch() calls in rewards-client.tsx

---

## 13. Alternative Solutions Considered

#### Option A: Fix only one handler as proof of concept
- **Description:** Fix handleSchedulePayboost first, test, then fix handleScheduleDiscount
- **Pros:** Lower risk, incremental
- **Cons:** Same fix needs to be applied twice anyway, delays full resolution
- **Verdict:** ❌ Rejected - Both handlers have identical bugs and fixes

#### Option B: Fix both handlers simultaneously (Selected)
- **Description:** Update both handleScheduleDiscount and handleSchedulePayboost with actual API calls
- **Pros:** Complete fix, consistent behavior, follows existing patterns from missions page
- **Cons:** Slightly more code to review
- **Verdict:** ✅ Selected - Simple, complete fix using existing API

#### Option C: Create shared utility function for scheduling
- **Description:** Extract fetch logic into a shared `scheduleReward()` utility
- **Pros:** DRY code, reusable
- **Cons:** Over-engineering for 2 call sites, adds abstraction layer
- **Verdict:** ❌ Rejected - Adds complexity without significant benefit

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API call fails silently | Low | Medium | Error handling with toast.error already in try/catch |
| Page refresh loses user context | Low | Low | 2-second delay preserves toast visibility |
| Duplicate claims on retry | Low | Low | Backend has "no active claim" validation |
| Breaking existing functionality | Low | Medium | API route unchanged, only frontend connection added |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes to API |
| Database | No | No changes to schema |
| Frontend | No | Internal implementation change only |

---

## 15. Testing Strategy

#### Unit Tests

No existing test infrastructure (`appcode/tests/**/*.test.ts` = 0 files). Unit tests deferred.

#### Integration Tests

No existing test infrastructure. Integration tests deferred.

#### Manual Verification Steps

**Discount Scheduling Test:**
1. [ ] Login as Silver tier user (60bd09f9-2b05-4585-8c7a-68d583c9fb43)
2. [ ] Navigate to `/rewards`
3. [ ] Find "10% Deal Boost" (discount) in claimable state
4. [ ] Click "Schedule" button
5. [ ] Select a valid date/time (weekday, 9 AM - 4 PM EST)
6. [ ] Click "Schedule Discount"
7. [ ] Verify success toast appears
8. [ ] Wait 2 seconds for page refresh
9. [ ] Verify reward now shows "Scheduled" status
10. [ ] Run DB query to verify redemption created:
```sql
SELECT red.*, r.name FROM redemptions red
JOIN rewards r ON red.reward_id = r.id
WHERE red.user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
AND r.type = 'discount'
AND r.reward_source = 'vip_tier';
```

**Commission Boost Scheduling Test:**
11. [ ] Find "5% Pay Boost" (commission_boost) in claimable state
12. [ ] Click "Schedule" button
13. [ ] Select a future date
14. [ ] Click "Schedule Activation"
15. [ ] Verify success toast appears
16. [ ] Wait 2 seconds for page refresh
17. [ ] Verify reward now shows "Scheduled" status
18. [ ] Run DB query to verify redemption + sub-state created:
```sql
SELECT red.*, cb.boost_status, cb.scheduled_activation_date
FROM redemptions red
JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
WHERE red.user_id = '60bd09f9-2b05-4585-8c7a-68d583c9fb43'
ORDER BY red.created_at DESC
LIMIT 1;
```

**Regression Tests:**
19. [ ] Verify physical gift claim flow still works (different handler)
20. [ ] Verify instant reward claims still work (different handler)
21. [ ] Verify payment info modal still works

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
- [ ] Read and understand rewards-client.tsx current state
- [ ] Verify handleScheduleDiscount contains TODO comment and fake delay
- [ ] Verify handleSchedulePayboost contains TODO comment and fake delay
- [ ] Confirm API route exists at `/api/rewards/[rewardId]/claim`

#### Implementation Steps
- [ ] **Step 1:** Update handleScheduleDiscount
  - File: `appcode/app/rewards/rewards-client.tsx`
  - Change: Replace `await new Promise(setTimeout)` with actual `fetch()` call
  - Add: Error handling for non-ok responses
  - Add: `setTimeout(() => window.location.reload(), 2000)` after success toast
- [ ] **Step 2:** Update handleSchedulePayboost
  - File: `appcode/app/rewards/rewards-client.tsx`
  - Change: Replace `await new Promise(setTimeout)` with actual `fetch()` call
  - Add: Error handling for non-ok responses
  - Add: `setTimeout(() => window.location.reload(), 2000)` after success toast

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Schedule a discount, verify page refreshes and shows "Scheduled"
- [ ] Manual verification: Schedule a commission boost, verify page refreshes and shows "Scheduled"
- [ ] Database verification: Confirm redemption rows created
- [ ] Database verification: Confirm commission_boost_redemptions sub-state created for boost

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 6 | Rewards System | VIP tier scheduled rewards non-functional |

#### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix within existing scope.

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [ ] handleScheduleDiscount calls `POST /api/rewards/:id/claim` with `{ scheduledActivationAt }`
- [ ] handleSchedulePayboost calls `POST /api/rewards/:id/claim` with `{ scheduledActivationAt }`
- [ ] Both handlers include error handling that shows toast.error on failure
- [ ] Both handlers include `window.location.reload()` after 2-second delay on success
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: Discount scheduling creates redemption in database
- [ ] Manual verification: Commission boost scheduling creates redemption + sub-state in database
- [ ] Manual verification: UI shows "Scheduled" status after page refresh
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/app/rewards/rewards-client.tsx` | handleScheduleDiscount, handleSchedulePayboost | Current buggy code with TODOs |
| `appcode/app/api/rewards/[rewardId]/claim/route.ts` | Full file | Backend API implementation (works correctly) |
| `appcode/lib/services/rewardService.ts` | claimReward method | Service layer implementation |
| `appcode/lib/repositories/rewardRepository.ts` | redeemReward method | Repository layer implementation |
| `SchemaFinalv2.md` | redemptions table, commission_boost_redemptions table | Database schema reference |
| `MissionsRewardsFlows.md` | Commission Boost Reward Flow | Expected flow documentation |
| `API_CONTRACTS.md` | POST /api/rewards/:id/claim | API contract specification |
| `BugFixes/ScheduledRewardRefreshFix.md` | Full document | Related bug fix showing page refresh pattern |

### Reading Order for External Auditor

1. **First:** `rewards-client.tsx` lines 115-153 and 155-193 - Shows TODO comments and fake delays (the bug)
2. **Second:** `appcode/app/api/rewards/[rewardId]/claim/route.ts` - Shows fully implemented backend
3. **Third:** `MissionsRewardsFlows.md` Commission Boost section - Shows expected scheduling flow
4. **Fourth:** `BugFixes/ScheduledRewardRefreshFix.md` - Shows page refresh pattern used in similar fix

---

**Document Version:** 1.0
**Last Updated:** 2025-12-25
**Author:** Claude Code
**Status:** Analysis Complete
