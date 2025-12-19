# Scheduled Reward Claim API Integration - Gap Documentation

**ID:** GAP-001-ScheduledRewardClaimAPI
**Type:** Feature Gap
**Created:** 2025-12-18
**Status:** Analysis Complete
**Priority:** Critical
**Related Tasks:** Mission claim flow, Commission boost scheduling
**Linked Issues:** None

---

### 1. Project Context

This is a creator loyalty platform (Rumi) built with Next.js 14, TypeScript, and Supabase/PostgreSQL. Content creators earn rewards by completing missions. When creators complete a mission with a scheduled reward (commission_boost or discount), they must select an activation date. The frontend modal captures this date, but the API call to claim the reward is not implemented - only a simulation placeholder exists.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Route → Service → Repository → Supabase RPC

---

### 2. Gap/Enhancement Summary

**What's missing:** The frontend `handleSchedulePayboost()` and `handleScheduleDiscount()` functions in `missions-client.tsx` do not make actual API calls. They contain TODO comments and simulate the API call with `setTimeout()`.

**What should exist:** These functions should make POST requests to `/api/missions/:id/claim` with the scheduled activation date/time in the request body.

**Why it matters:** Users can complete missions, see the scheduling modal, select a date, and receive a "success" toast - but nothing is saved to the database. The reward claim silently fails, leaving users confused when their scheduled reward never appears.

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/app/missions/missions-client.tsx` | `handleSchedulePayboost()` (lines 162-199) | Contains TODO comment and `setTimeout` simulation instead of actual API call |
| `appcode/app/missions/missions-client.tsx` | `handleScheduleDiscount()` (lines 123-159) | Contains identical TODO comment and `setTimeout` simulation |
| `appcode/app/missions/missions-client.tsx` | `handleClaimMission()` (lines 87-121) | Routes to correct modal based on reward type, but delegates to TODO handlers |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | Full file (lines 1-169) | API endpoint EXISTS and is fully implemented - accepts `scheduledActivationDate` and `scheduledActivationTime` |
| `appcode/components/schedule-payboost-modal.tsx` | `onConfirm` callback (lines 124-145) | Modal correctly passes Date object to parent handler |
| `appcode/components/claim-physical-gift-modal.tsx` | `handleShippingSubmit()` (lines 69-88) | Physical gift DOES make actual API call - pattern to follow |
| `API_CONTRACTS.md` | POST /api/missions/:id/claim (lines 3736-3741) | Documents expected request body: `{"scheduledActivationDate": "YYYY-MM-DD", "scheduledActivationTime": "HH:MM:SS"}` |
| Server logs | POST requests | No POST to `/api/missions/:id/claim` when clicking schedule confirm - only GET requests |
| Browser console | `missions-client.tsx:165` | Logs "Schedule mission commission boost for: [id] [date]" but no network request follows |

### Key Evidence

**Evidence 1:** TODO Placeholder in handleSchedulePayboost
```typescript
// From appcode/app/missions/missions-client.tsx (lines 167-172)
try {
  // TODO: POST /api/missions/:id/claim
  // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))
```
- Source: `missions-client.tsx`, lines 167-172
- Implication: No actual API call is made - just a 1.5 second delay simulation

**Evidence 2:** API Endpoint IS Implemented
```typescript
// From appcode/app/api/missions/[missionId]/claim/route.ts (lines 24-39)
interface ClaimRequestBody {
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;
  size?: string;
  shippingAddress?: { ... };
}
```
- Source: `route.ts`, lines 24-39
- Implication: Backend is ready - only frontend integration is missing

**Evidence 3:** Physical Gift Modal Shows Correct Pattern
```typescript
// From appcode/components/claim-physical-gift-modal.tsx (lines 73-88)
const response = await fetch(`/api/missions/${reward.id}/claim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    size: requiresSize ? selectedSize : undefined,
    shippingAddress: { ... },
  }),
});
```
- Source: `claim-physical-gift-modal.tsx`, lines 73-88
- Implication: The pattern for making the API call exists in the codebase

**Evidence 4:** No Network Request in Server Logs
```
GET /api/missions 200 in 646ms
GET /missions 200 in 852ms
// NO POST /api/missions/:id/claim after clicking "Schedule Activation"
```
- Source: Runtime observation during debugging session (not a repo file - verified live on 2025-12-18)
- Implication: Confirms frontend is not making the API call

---

### 4. Business Justification

**Business Need:** Users must be able to claim scheduled rewards (commission boosts, discounts) after completing missions.

**User Stories:**
1. As a creator, I need to schedule my commission boost activation so that I can maximize my earnings during a high-sales period
2. As a creator, I need to schedule my discount activation so that I can offer deals to my followers at the optimal time

**Impact if NOT implemented:**
- Users complete missions but cannot actually claim scheduled rewards
- Users see false "success" messages when scheduling fails
- Commission boosts and discounts never activate
- User trust eroded when promised rewards don't materialize
- Support tickets from confused users

---

### 5. Current State Analysis

#### What Currently Exists

**File:** `appcode/app/missions/missions-client.tsx`
```typescript
// Current implementation (lines 162-199)
const handleSchedulePayboost = async (scheduledDate: Date) => {
  if (!selectedMission) return

  console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

  try {
    // TODO: POST /api/missions/:id/claim
    // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Show success message (MISLEADING - no actual claim made!)
    toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, {
      description: "We'll activate your boost at this time",
      duration: 5000,
    })

    setSelectedMission(null)
  } catch (error) {
    // ...
  }
}
```

**Current Capability:**
- Modal opens correctly when user clicks claim on commission_boost reward ✅
- User can select a date from calendar ✅
- Modal shows selected date confirmation ✅
- **API call to save the claim does NOT happen** ❌
- Success toast shows even though nothing was saved ❌

#### Current Data Flow (if applicable)

```
User clicks "Claim" → Modal opens → User selects date → handleSchedulePayboost()
                                                              ↓
                                            setTimeout(1500ms) ← SIMULATION
                                                              ↓
                                            toast.success() ← MISLEADING
                                                              ↓
                                            (Database NOT updated)
```

---

### 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach
Replace the simulation with actual `fetch()` calls to `/api/missions/:id/claim`, following the pattern established in `claim-physical-gift-modal.tsx`. The modal passes a UTC timestamp; the handler must extract date and time strings from it.

#### Timezone Handling (CRITICAL)

**API Expectation:** Per `API_CONTRACTS.md` line 3740, the API expects time in **UTC**:
```
"scheduledActivationTime": "19:00:00" // Time (HH:MM:SS) in UTC (2 PM EST)
```

**Modal Behavior:** The `schedule-payboost-modal.tsx` already handles ET→UTC conversion:
1. User selects a date (no time selection - fixed at 2 PM ET)
2. Modal creates date string with 2 PM ET: `${date}T14:00:00-05:00`
3. `new Date()` parses this and converts to UTC internally
4. `onConfirm(combinedDateTime)` passes a **UTC Date object**

**Handler Responsibility:**
- Use `toISOString()` to extract UTC date/time strings
- **DO NOT** convert again - the Date is already in UTC
- `date.toISOString()` → `"2025-12-24T19:00:00.000Z"` (7 PM UTC = 2 PM ET ✓)

**⚠️ WARNING:** Do NOT apply additional timezone conversion in the handler. The modal has already converted 2 PM ET to UTC. Double-converting will schedule at the wrong time (off by hours).

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**Modified Function:** `appcode/app/missions/missions-client.tsx` - `handleSchedulePayboost()`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
const handleSchedulePayboost = async (scheduledDate: Date) => {
  if (!selectedMission) return

  console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

  try {
    // Extract date/time from UTC Date object (modal already converted 2 PM ET → UTC)
    // API expects: scheduledActivationDate (YYYY-MM-DD) and scheduledActivationTime (HH:MM:SS in UTC)
    // ⚠️ DO NOT apply additional timezone conversion - scheduledDate is already UTC
    const isoString = scheduledDate.toISOString() // e.g., "2025-12-24T19:00:00.000Z"
    const dateStr = isoString.split('T')[0] // "2025-12-24"
    const timeStr = isoString.split('T')[1].split('.')[0] // "19:00:00" (UTC)

    const response = await fetch(`/api/missions/${selectedMission.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledActivationDate: dateStr,
        scheduledActivationTime: timeStr,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to schedule commission boost')
    }

    // Show success message
    const displayDateStr = scheduledDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const displayTimeStr = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    })

    toast.success(`Commission boost scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
      description: "We'll activate your boost at this time",
      duration: 5000,
    })

    // Refresh missions data to reflect new status
    router.refresh()

    // Reset selected mission
    setSelectedMission(null)
  } catch (error) {
    console.error("Failed to schedule commission boost:", error)
    toast.error("Failed to schedule commission boost", {
      description: error instanceof Error ? error.message : "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

**Explanation:**
- Extracts date (YYYY-MM-DD) and time (HH:MM:SS) from the Date object
- Makes POST request to existing `/api/missions/:id/claim` endpoint
- Handles success/error responses appropriately
- Calls `router.refresh()` to update the missions list after claiming

**Modified Function:** `appcode/app/missions/missions-client.tsx` - `handleScheduleDiscount()`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED (same pattern as handleSchedulePayboost)
const handleScheduleDiscount = async (scheduledDate: Date) => {
  if (!selectedMission) return

  console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

  try {
    // Extract date/time from UTC Date object (modal already converted ET → UTC)
    // ⚠️ DO NOT apply additional timezone conversion
    const isoString = scheduledDate.toISOString()
    const dateStr = isoString.split('T')[0]
    const timeStr = isoString.split('T')[1].split('.')[0]

    const response = await fetch(`/api/missions/${selectedMission.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledActivationDate: dateStr,
        scheduledActivationTime: timeStr,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to schedule discount')
    }

    const displayDateStr = scheduledDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const displayTimeStr = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    })

    toast.success(`Discount scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
      description: "We'll activate your discount at this time",
      duration: 5000,
    })

    router.refresh()
    setSelectedMission(null)
  } catch (error) {
    console.error("Failed to schedule discount:", error)
    toast.error("Failed to schedule discount", {
      description: error instanceof Error ? error.message : "Please try again or contact support",
      duration: 5000,
    })
  }
}
```

#### New Types/Interfaces

No new types needed - the API already defines `ClaimRequestBody` in `route.ts`.

---

### 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/missions/missions-client.tsx` | MODIFY | Replace TODO simulation with actual fetch() in `handleSchedulePayboost()` |
| `appcode/app/missions/missions-client.tsx` | MODIFY | Replace TODO simulation with actual fetch() in `handleScheduleDiscount()` |
| `appcode/app/missions/missions-client.tsx` | MODIFY | Add `import { useRouter } from 'next/navigation'` and `const router = useRouter()` if not present |

#### Dependency Graph

```
missions-client.tsx (TO BE MODIFIED)
├── already imports: toast from sonner
├── needs import: useRouter from next/navigation (if not present)
├── calls: /api/missions/:id/claim (existing endpoint)
└── calls: router.refresh() (to update missions list)

/api/missions/[missionId]/claim/route.ts (EXISTING - NO CHANGES)
├── already handles: scheduledActivationDate, scheduledActivationTime
└── already calls: claimMissionReward service
```

---

### 8. Data Flow After Implementation

```
User clicks "Claim" → Modal opens → User selects date → handleSchedulePayboost()
                                                              ↓
                                            fetch('/api/missions/:id/claim')
                                                              ↓
                                            API validates & creates records
                                                              ↓
                                            redemptions.status = 'claimed'
                                            commission_boost_redemptions created
                                                              ↓
                                            toast.success() (REAL success)
                                            router.refresh() (updates UI)
```

---

### 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `redemptions` | status, claimed_at, scheduled_activation_date | Updated to 'claimed' status |
| `commission_boost_redemptions` | boost_status, scheduled_activation_date, duration_days, boost_rate | Created with 'scheduled' status |
| `mission_progress` | status | Read to verify mission is 'completed' |

#### Schema Changes Required?
- [x] No - existing schema supports this feature (RPC functions already exist)

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| claim RPC | Yes - handled by existing API | [x] Verified in route.ts line 93 |

---

### 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| POST /api/missions/:id/claim | NO CHANGE | Accepts scheduledActivationDate/Time | No change - already implemented |

#### Breaking Changes?
- [x] No - additive changes only (frontend now uses existing API)

---

### 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 1 per claim | Yes |
| Query complexity | O(1) - single RPC call | Yes |
| Frequency | On user action (rare) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP

---

### 12. Alternative Solutions Considered

#### Option A: Implement in Modal Component
- **Description:** Move the fetch() call into schedule-payboost-modal.tsx instead of missions-client.tsx
- **Pros:** Modal is self-contained, less prop drilling
- **Cons:** Modal doesn't have access to mission ID directly, breaks reusability
- **Verdict:** ❌ Rejected - modal should remain a pure UI component

#### Option B: Implement in Page Handler (Selected)
- **Description:** Replace TODO in missions-client.tsx handlers with actual fetch() calls
- **Pros:** Follows existing pattern (physical gift modal), keeps modal reusable, handler has access to all needed data
- **Cons:** None significant
- **Verdict:** ✅ Selected - matches existing architecture

---

### 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API returns error | Low | Medium | Add proper error handling with user-friendly messages |
| Date format mismatch | Low | High | Test with various dates, use ISO format |
| Stale UI after claim | Medium | Low | Call router.refresh() after successful claim |
| Network timeout | Low | Medium | Add loading state (already exists in modal) |
| Double timezone conversion | Medium | High | Clear comments in code: "DO NOT convert - already UTC". Modal handles ET→UTC; handler just extracts strings |

---

### 14. Testing Strategy

#### Unit Tests

No unit tests needed - this is a simple fetch() integration.

#### Integration Tests

**File:** `appcode/tests/integration/missions/claim-scheduled-reward.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED (or verify existing tests cover this)
describe('Scheduled Reward Claim', () => {
  it('should claim commission boost with scheduled date', async () => {
    // 1. Create completed mission with commission_boost reward
    // 2. POST /api/missions/:progressId/claim with scheduledActivationDate
    // 3. Verify redemptions.status = 'claimed'
    // 4. Verify commission_boost_redemptions created with 'scheduled' status
  });
});
```

#### Manual Verification Steps

1. [ ] Log in as testbronze@test.com
2. [ ] Complete a mission with commission_boost reward
3. [ ] Click "Claim Reward" button
4. [ ] Select a date in the modal and click "Schedule Activation"
5. [ ] Verify toast shows success message
6. [ ] Check database: `SELECT * FROM redemptions WHERE user_id = '...'` - status should be 'claimed'
7. [ ] Check database: `SELECT * FROM commission_boost_redemptions` - record should exist with 'scheduled' status
8. [ ] Refresh page - mission should show as "Scheduled" not "Completed"

---

### 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Check if `useRouter` is imported in missions-client.tsx
  - File: `appcode/app/missions/missions-client.tsx`
  - Action: VERIFY / ADD IMPORT if needed
- [ ] **Step 2:** Replace `handleSchedulePayboost()` implementation
  - File: `appcode/app/missions/missions-client.tsx`
  - Action: MODIFY - replace TODO simulation with fetch() call
- [ ] **Step 3:** Replace `handleScheduleDiscount()` implementation
  - File: `appcode/app/missions/missions-client.tsx`
  - Action: MODIFY - replace TODO simulation with fetch() call

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification using steps above
- [ ] Verify server logs show POST request to /api/missions/:id/claim

---

### 16. Definition of Done

- [ ] `handleSchedulePayboost()` makes actual API call instead of simulation
- [ ] `handleScheduleDiscount()` makes actual API call instead of simulation
- [ ] Success toast only shows when API returns success
- [ ] Error toast shows with message when API returns error
- [ ] UI refreshes after successful claim
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed - commission boost claim works end-to-end
- [ ] This document status updated to "Implemented"

---

### 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `missions-client.tsx` | handleSchedulePayboost (162-199), handleScheduleDiscount (123-159) | Shows current TODO placeholder |
| `/api/missions/[missionId]/claim/route.ts` | Full file | Shows API is already implemented |
| `claim-physical-gift-modal.tsx` | handleShippingSubmit (69-88) | Pattern to follow for fetch() call |
| `schedule-payboost-modal.tsx` | Full file, especially lines 96-106 | Understanding modal's ET→UTC conversion |
| `API_CONTRACTS.md` | Lines 3736-3741 | Request body format, confirms UTC expectation |
| `SchemaFinalv2.md` | commission_boost_redemptions (Section 2.5) | Understanding database tables |
| Server logs | Runtime observation (2025-12-18) | Confirmed no POST request made (not a repo file) |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-18
**Author:** Claude Opus 4.5
**Status:** Analysis Complete

**Revision History:**
- v1.1: Added timezone handling section (CRITICAL), clarified server log as runtime observation, added double-conversion risk
