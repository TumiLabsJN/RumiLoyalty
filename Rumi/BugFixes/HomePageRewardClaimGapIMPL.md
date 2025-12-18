# Home Page Reward Claim Flow - Gap Implementation Plan

**Specification Source:** HomePageRewardClaimGap.md
**Gap ID:** GAP-001
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From HomePageRewardClaimGap.md:**

**Gap Summary:** The Home page's reward claim button only logs to console for most reward types and does not call the claim API. Additionally, the dashboard API does not return `progressId` which is required by the claim API endpoint.

**Business Need:** Creators should be able to claim rewards directly from the Home page, the primary landing page, without needing to navigate to the Missions tab.

**Files to Create/Modify:**
- `appcode/lib/services/dashboardService.ts` - MODIFY
- `appcode/app/home/home-client.tsx` - MODIFY
- `appcode/components/claim-physical-gift-modal.tsx` - MODIFY
- `appcode/types/dashboard.ts` - MODIFY

**Specified Solution:**
From HomePageRewardClaimGap.md Section 6:
1. **Backend**: Add `progressId` and `rewardValueData` to dashboard API response
2. **Frontend**: Extend `handleClaimReward()` to route each reward type to appropriate flow using `progressId`
3. **Modal**: Wire ClaimPhysicalGiftModal to actual API call with progressId

**Acceptance Criteria (From HomePageRewardClaimGap.md Section 16):**
1. [ ] Dashboard API returns `progressId` for featured mission
2. [ ] Dashboard API returns `rewardValueData` for featured mission
3. [ ] Home page uses `progressId` for all claim API calls
4. [ ] Physical gift modal receives correct `requiresSize`, `sizeOptions`
5. [ ] Physical gift modal sends `size` in API payload when required
6. [ ] All 6 reward types claimable from Home page
7. [ ] Type checker passes
8. [ ] All tests pass (existing + new)
9. [ ] Build completes
10. [ ] Manual verification completed (20 steps)

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: progressId added to response, valueData passed to modals
- Concerns Addressed: Backend changes explicit, modal wiring documented, CLIENT_ID verified
- **Field Naming Convention:** Database uses snake_case (`requires_size`, `size_options`, `size_category`, `duration_days`); modal interfaces use camelCase. Transformation handled explicitly in Step 9 with fallback handling for undefined values.

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 4
- Lines added: ~200
- Breaking changes: NO (additive only)
- Schema changes: NO
- API contract changes: YES (additive - progressId, rewardValueData)

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` or `/home/jorge/Loyalty/Rumi`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR only documentation changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - progressId is not already in dashboard response.

**Search for existing progressId in dashboard service:**
```bash
grep -n "progressId" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** No matches in the response construction (gap is real)

**Search for existing claim handler in home-client:**
```bash
grep -n "api/missions.*claim" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```
**Expected:** No matches or only in TODO comments (gap is real)

**Checklist:**
- [ ] Grep executed for progressId in dashboardService: [result]
- [ ] Grep executed for claim API in home-client: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to ensure proper integration patterns.

**Search for existing modal usage in missions-client (reference implementation):**
```bash
grep -n "ClaimPhysicalGiftModal\|SchedulePayboostModal" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | head -20
```

**Search for existing claim handler pattern in missions-client:**
```bash
grep -n "handleClaimMission\|handlePhysicalGift" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | head -10
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| missions-client.tsx | ClaimPhysicalGiftModal import | Reference implementation | Copy pattern |
| missions-client.tsx | handleClaimMission | Claim routing logic | Adapt for home |
| missions-client.tsx | handlePhysicalGiftSuccess | Success handler | Adapt for home |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: LOW (different file, same pattern)
- [ ] Integration points identified: Modal components, API endpoints

---

### Gate 4: Files to Modify Verification

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** File exists (MODIFY)

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```
**Expected:** File exists (MODIFY)

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
```
**Expected:** File exists (MODIFY)

**File 4:** `/home/jorge/Loyalty/Rumi/appcode/types/dashboard.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/types/dashboard.ts
```
**Expected:** File exists (MODIFY)

**Checklist:**
- [ ] All 4 files to modify exist: [count]
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification

> This feature uses existing schema - no new database queries added.

**Tables involved:** mission_progress (existing), redemptions (existing)

**Verification:**
- [ ] progressId comes from mission_progress.id (existing)
- [ ] No schema changes needed
- [ ] No new columns required

---

### Gate 6: API Contract Verification

**Changes to GET /api/dashboard response:**

| Field in Spec | Current State | Change |
|---------------|---------------|--------|
| mission.id | EXISTS | Keep |
| mission.progressId | MISSING | ADD |
| mission.rewardValueData | MISSING | ADD |

**Verification:**
- [ ] progressId is additive (non-breaking)
- [ ] rewardValueData is additive (non-breaking)
- [ ] POST /api/missions/:id/claim unchanged (expects progressId)

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For MODIFIED files: Pre-action check MUST match expected state
4. If any checkpoint fails, STOP and report

---

### Step 1: Update FeaturedMissionResponse Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Add progressId and rewardValueData to the interface

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 88-108
```

**Expected Current State (mission object within interface):**
```typescript
  mission: {
    id: string;
    type: string;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    unitText: string;
  } | null;
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  mission: {
    id: string;
    type: string;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    unitText: string;
  } | null;
```

**NEW Code (replacement):**
```typescript
  mission: {
    id: string;
    progressId: string | null;
    type: string;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    rewardValueData: Record<string, unknown> | null;
    unitText: string;
  } | null;
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
Old String: [exact mission interface block]
New String: [interface with progressId and rewardValueData]
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 88-110
```

**Expected New State:**
- Interface contains `progressId: string | null;`
- Interface contains `rewardValueData: Record<string, unknown> | null;`

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Pass progressId and rewardValueData in getDashboardOverview

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Include progressId and rewardValueData in the mission object construction

---

#### Pre-Action Reality Check

**Read Current State (around line 362 where mission object is constructed):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 355-390
```

**Expected:** Find `id: fm.missionId,` without progressId or rewardValueData

---

#### Edit Action

**After `id: fm.missionId,` add:**
```typescript
        progressId: fm.progressId ?? null,
```

**After `rewardDisplayText,` add:**
```typescript
        rewardValueData: fm.rewardValueData as Record<string, unknown> | null,
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
grep -n "progressId\|rewardValueData" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```

**Expected:** progressId and rewardValueData present in mission construction

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] progressId added to mission object
- [ ] rewardValueData added to mission object

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Update Frontend Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/types/dashboard.ts`
**Action Type:** MODIFY
**Purpose:** Add progressId and rewardValueData to frontend types

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/types/dashboard.ts lines 1-100
```

**Expected:** Find FeaturedMission interface without progressId

---

#### Edit Action

Add `progressId: string | null;` and `rewardValueData: Record<string, unknown> | null;` to the mission type

---

#### Post-Action Verification

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/types/dashboard.ts 2>&1 | head -20
```

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] Type definition updated
- [ ] No type errors

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Add Modal Imports to home-client.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Import required modal components

---

#### Pre-Action Reality Check

**Read Current Imports:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx lines 1-15
```

---

#### Edit Action

**Add after existing imports:**
```typescript
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
```

---

#### Post-Action Verification

```bash
grep -n "SchedulePayboostModal\|ClaimPhysicalGiftModal" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Step Checkpoint:**
- [ ] Both imports added
- [ ] No import errors

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Add State Variables to home-client.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add state for new modals and loading

---

#### Pre-Action Reality Check

**Read Current State Variables (around line 21-24):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx lines 17-30
```

---

#### Edit Action

**Add after existing state variables:**
```typescript
  const [isClaimingReward, setIsClaimingReward] = useState(false)
  const [showPayboostModal, setShowPayboostModal] = useState(false)
  const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false)
```

---

#### Post-Action Verification

```bash
grep -n "isClaimingReward\|showPayboostModal\|showPhysicalGiftModal" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Step Checkpoint:**
- [ ] All 3 state variables added
- [ ] useState imports working

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Replace handleClaimReward Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Implement full claim routing using progressId

---

#### Pre-Action Reality Check

**Read Current handleClaimReward (lines 128-139):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx lines 124-145
```

**Expected:** Function with console.log and TODO comment

---

#### Edit Action

**OLD Code:**
```typescript
  const handleClaimReward = () => {
    const mission = dashboardData.featuredMission.mission
    if (!mission) return

    if (mission.rewardType === "discount") {
      setShowScheduleModal(true)
      return
    }

    console.log("[v0] Claim reward clicked:", mission.rewardType, mission.rewardAmount || mission.rewardCustomText)
    // TODO: POST /api/missions/:id/claim (instant claim)
  }
```

**NEW Code:**
```typescript
  const handleClaimReward = async () => {
    const mission = dashboardData.featuredMission.mission
    if (!mission || !mission.progressId) return

    // Physical gift - show shipping modal
    if (mission.rewardType === "physical_gift") {
      setShowPhysicalGiftModal(true)
      return
    }

    // Commission boost - show scheduling modal
    if (mission.rewardType === "commission_boost") {
      setShowPayboostModal(true)
      return
    }

    // Discount - show existing scheduling modal
    if (mission.rewardType === "discount") {
      setShowScheduleModal(true)
      return
    }

    // Instant rewards (gift_card, spark_ads, experience) - direct API call
    setIsClaimingReward(true)
    try {
      const response = await fetch(
        `/api/missions/${mission.progressId}/claim`,
        { method: 'POST' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success("Reward claimed! Check Missions tab for details", {
            duration: 5000,
          })
          window.location.reload()
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Claim failed. Please try again")
      }
    } catch (error) {
      console.error('Claim error:', error)
      toast.error("Something went wrong. Please try again")
    } finally {
      setIsClaimingReward(false)
    }
  }
```

---

#### Post-Action Verification

```bash
grep -n "mission.progressId" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Expected:** progressId used in claim URL

**Step Checkpoint:**
- [ ] Function replaced completely
- [ ] Uses mission.progressId for API call
- [ ] Routes to correct modal by type

**Checkpoint Status:** [PASS / FAIL]

---

### Step 7: Replace handleScheduleDiscount Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Wire to real API call with progressId

---

#### Pre-Action Reality Check

**Read Current Function (lines 169-197):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx lines 165-200
```

**Expected:** Function with simulated delay (Promise) and TODO

---

#### Edit Action

Replace with actual API call using `mission.progressId`

---

#### Post-Action Verification

```bash
grep -n "api/missions.*claim" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Expected:** Multiple matches for claim API calls

**Step Checkpoint:**
- [ ] Function wired to real API
- [ ] Uses progressId
- [ ] Proper error handling

**Checkpoint Status:** [PASS / FAIL]

---

### Step 8: Add handleSchedulePayboost Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add handler for commission boost scheduling

---

#### Edit Action

Add new function after handleScheduleDiscount:
```typescript
  const handleSchedulePayboost = async (scheduledDate: Date) => {
    const mission = dashboardData.featuredMission.mission
    if (!mission || !mission.progressId) return

    try {
      const response = await fetch(`/api/missions/${mission.progressId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledActivationDate: scheduledDate.toISOString().split('T')[0],
          scheduledActivationTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const dateStr = scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          const timeStr = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
          toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, { description: "Check Missions tab for details", duration: 5000 })
          window.location.reload()
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to schedule boost")
      }
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost")
    }
  }
```

---

#### Post-Action Verification

```bash
grep -n "handleSchedulePayboost" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Step Checkpoint:**
- [ ] Function added
- [ ] Uses progressId
- [ ] Proper API call

**Checkpoint Status:** [PASS / FAIL]

---

### Step 9: Add Modal Components to JSX

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add SchedulePayboostModal and ClaimPhysicalGiftModal to render

---

#### IMPORTANT: snake_case to camelCase Transformation

The database/RPC returns `rewardValueData` with **snake_case** field names, but the modal interface expects **camelCase**:

| Database/RPC (snake_case) | Modal Interface (camelCase) | Transformation |
|---------------------------|-----------------------------| ---------------|
| `requires_size` | `requiresSize` | `rewardValueData?.requires_size as boolean` |
| `size_category` | `sizeCategory` | `rewardValueData?.size_category as string` |
| `size_options` | `sizeOptions` | `rewardValueData?.size_options as string[]` |
| `duration_days` | `durationDays` | `rewardValueData?.duration_days as number` |

**Fallback handling:** All fields use `|| false`, `|| null`, or `|| []` to handle undefined gracefully.

---

#### Edit Action

Add before closing `</>` after ScheduleDiscountModal:
```typescript
      {/* Schedule Payboost Modal */}
      {dashboardData.featuredMission.mission && (
        <SchedulePayboostModal
          open={showPayboostModal}
          onClose={() => setShowPayboostModal(false)}
          onConfirm={handleSchedulePayboost}
          boostPercent={(dashboardData.featuredMission.mission.rewardValueData?.percent as number) || dashboardData.featuredMission.mission.rewardAmount || 0}
          durationDays={(dashboardData.featuredMission.mission.rewardValueData?.duration_days as number) || 30}
        />
      )}

      {/* Physical Gift Claim Modal - NOTE: snake_case → camelCase transformation */}
      {dashboardData.featuredMission.mission && (
        <ClaimPhysicalGiftModal
          open={showPhysicalGiftModal}
          onOpenChange={(open) => setShowPhysicalGiftModal(open)}
          reward={{
            id: dashboardData.featuredMission.mission.progressId || '',
            displayName: dashboardData.featuredMission.mission.rewardCustomText || 'Physical Gift',
            rewardType: 'physical_gift',
            valueData: {
              // Transform snake_case (from DB) to camelCase (for modal interface)
              requiresSize: (dashboardData.featuredMission.mission.rewardValueData?.requires_size as boolean) || false,
              sizeCategory: (dashboardData.featuredMission.mission.rewardValueData?.size_category as string) || null,
              sizeOptions: (dashboardData.featuredMission.mission.rewardValueData?.size_options as string[]) || [],
            },
          }}
          onSuccess={() => {
            toast.success("Reward claimed! Check Missions tab for shipping updates", { duration: 5000 })
            window.location.reload()
          }}
        />
      )}
```

---

#### Post-Action Verification

```bash
grep -n "SchedulePayboostModal\|ClaimPhysicalGiftModal" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Expected:** Both modals in imports AND in JSX

**Step Checkpoint:**
- [ ] Both modals added to JSX
- [ ] Props correctly mapped from rewardValueData
- [ ] progressId used for modal reward.id

**Checkpoint Status:** [PASS / FAIL]

---

### Step 10: Update Claim Button Loading State

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add loading spinner and disable when progressId missing

---

#### Edit Action

Update Button (around line 257-263) to include:
- `disabled={isClaimingReward || !dashboardData.featuredMission.mission?.progressId}`
- Loading spinner when `isClaimingReward`

---

#### Post-Action Verification

```bash
grep -n "isClaimingReward" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```

**Step Checkpoint:**
- [ ] Button disabled when claiming or no progressId
- [ ] Loading spinner shown

**Checkpoint Status:** [PASS / FAIL]

---

### Step 11: Wire ClaimPhysicalGiftModal to API

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx`
**Action Type:** MODIFY
**Purpose:** Replace TODO with actual API call

---

#### Pre-Action Reality Check

**Read Current handleShippingSubmit (around lines 69-109):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx lines 65-115
```

**Expected:** TODO comment and simulated delay

---

#### Edit Action

Replace simulated delay with:
```typescript
    const response = await fetch(`/api/missions/${reward.id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: requiresSize ? selectedSize : undefined,
        shippingAddress: {
          firstName: address.shipping_recipient_first_name,
          lastName: address.shipping_recipient_last_name,
          line1: address.shipping_address_line1,
          line2: address.shipping_address_line2 || undefined,
          city: address.shipping_city,
          state: address.shipping_state,
          postalCode: address.shipping_postal_code,
          country: address.shipping_country,
          phone: address.shipping_phone,
        },
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        toast.success("Reward claimed successfully!")
        handleOpenChange(false)
        onSuccess()
      } else {
        toast.error(data.message || "Failed to claim reward")
      }
    } else {
      const error = await response.json()
      toast.error(error.message || "Failed to claim reward")
    }
```

---

#### Post-Action Verification

```bash
grep -n "api/missions.*claim" /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
```

**Expected:** API call present

**Step Checkpoint:**
- [ ] API call implemented
- [ ] Uses reward.id (which is progressId)
- [ ] Sends shippingAddress and size

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `home-client.tsx`
**New Imports:**
```typescript
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx 2>&1 | head -30
```
**Expected:** No import errors

**Checklist:**
- [ ] Import paths correct
- [ ] Exported names match
- [ ] Types align

---

### Call Site Verification

**ClaimPhysicalGiftModal Props:**
- [ ] `open` - boolean state
- [ ] `onOpenChange` - state setter
- [ ] `reward.id` - progressId (string)
- [ ] `reward.valueData` - from rewardValueData
- [ ] `onSuccess` - callback with reload

**SchedulePayboostModal Props:**
- [ ] `open` - boolean state
- [ ] `onClose` - state setter to false
- [ ] `onConfirm` - handleSchedulePayboost
- [ ] `boostPercent` - from rewardValueData
- [ ] `durationDays` - from rewardValueData

---

### Type Alignment Verification

**New Fields Added to FeaturedMissionResponse.mission:**
```typescript
progressId: string | null;
rewardValueData: Record<string, unknown> | null;
```

**Verification:**
- [ ] Types exported from dashboardService.ts
- [ ] Types match in types/dashboard.ts
- [ ] No type conflicts

---

**INTEGRATION STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This feature adds no new database queries.** It passes data already fetched through the existing dashboard RPC.

**Existing Security (Verified in Gate 6):**
- Dashboard API route checks `client_id` at route.ts line 64-75
- Claim API checks `client_id` at missionService.ts line 1009

**Checklist:**
- [ ] No new database queries added
- [ ] progressId comes from authenticated user's data
- [ ] Claim API validates ownership

---

### Authentication Check

**Routes Used:**
- `POST /api/missions/:id/claim` - Already has auth middleware

**Checklist:**
- [ ] Auth middleware applied (existing)
- [ ] User verified before data access (existing)
- [ ] Tenant isolation enforced (existing)

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

---

### Verification 2: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: "Dashboard API returns progressId for featured mission"
**Test:** Check dashboardService.ts has progressId in response
**Command:**
```bash
grep -n "progressId:" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** progressId in mission object construction
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 2: "Dashboard API returns rewardValueData for featured mission"
**Test:** Check dashboardService.ts has rewardValueData in response
**Command:**
```bash
grep -n "rewardValueData:" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** rewardValueData in mission object construction
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 3: "Home page uses progressId for all claim API calls"
**Test:** Check all fetch calls use progressId
**Command:**
```bash
grep -n "mission.progressId" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx
```
**Expected:** Multiple uses in claim handlers
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 4: "Physical gift modal receives correct requiresSize, sizeOptions"
**Test:** Check modal props include valueData fields
**Command:**
```bash
grep -A5 "ClaimPhysicalGiftModal" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx | grep -i "requires_size\|size_options"
```
**Expected:** Both fields mapped from rewardValueData
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 5: "Physical gift modal sends size in API payload when required"
**Test:** Check modal API call includes size
**Command:**
```bash
grep -n "size:" /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx
```
**Expected:** size in API payload
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 6: "All 6 reward types claimable from Home page"
**Test:** Check handleClaimReward routes all types
**Command:**
```bash
grep -E "physical_gift|commission_boost|discount|gift_card|spark_ads|experience" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx | head -20
```
**Expected:** All types handled
**Actual:** [result]
**Status:** [ ] PASS / FAIL

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Changes:**
- `dashboardService.ts`: ~10 lines modified
- `home-client.tsx`: ~150 lines modified
- `claim-physical-gift-modal.tsx`: ~30 lines modified
- `types/dashboard.ts`: ~5 lines modified

**Actual Changes:** [document]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED / [ ] FAILED

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | progressId in response | [ ] |
| 2 | rewardValueData in response | [ ] |
| 3 | Uses progressId for claims | [ ] |
| 4 | Modal receives valueData | [ ] |
| 5 | Modal sends size | [ ] |
| 6 | All 6 types claimable | [ ] |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-17
**Executor:** Claude Opus 4.5
**Specification Source:** HomePageRewardClaimGap.md
**Implementation Doc:** HomePageRewardClaimGapIMPL.md
**Gap ID:** GAP-001

---

### Execution Log

**Pre-Implementation:**
```
[ ] Gate 1: Environment - [PENDING]
[ ] Gate 2: Gap Confirmation - [PENDING]
[ ] Gate 3: Partial Code Check - [PENDING]
[ ] Gate 4: Files - [PENDING]
[ ] Gate 5: Schema - [SKIPPED - no DB changes]
[ ] Gate 6: API Contract - [PENDING]
```

**Implementation Steps:**
```
[ ] Step 1: Update FeaturedMissionResponse interface - [PENDING]
[ ] Step 2: Pass progressId in getDashboardOverview - [PENDING]
[ ] Step 3: Update frontend types - [PENDING]
[ ] Step 4: Add modal imports - [PENDING]
[ ] Step 5: Add state variables - [PENDING]
[ ] Step 6: Replace handleClaimReward - [PENDING]
[ ] Step 7: Replace handleScheduleDiscount - [PENDING]
[ ] Step 8: Add handleSchedulePayboost - [PENDING]
[ ] Step 9: Add modal components to JSX - [PENDING]
[ ] Step 10: Update button loading state - [PENDING]
[ ] Step 11: Wire ClaimPhysicalGiftModal to API - [PENDING]
```

---

### Files Created/Modified

**Complete List:**
1. `appcode/lib/services/dashboardService.ts` - MODIFY - ~10 lines - Add progressId, rewardValueData
2. `appcode/app/home/home-client.tsx` - MODIFY - ~150 lines - Full claim flow
3. `appcode/components/claim-physical-gift-modal.tsx` - MODIFY - ~30 lines - API wiring
4. `appcode/types/dashboard.ts` - MODIFY - ~5 lines - Type updates

**Total:** 4 files, ~200 lines added (net)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify progressId in dashboard service
grep -n "progressId" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts

# 2. Verify claim API calls use progressId
grep -n "mission.progressId" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx

# 3. Verify modals imported and used
grep -n "ClaimPhysicalGiftModal\|SchedulePayboostModal" /home/jorge/Loyalty/Rumi/appcode/app/home/home-client.tsx

# 4. Verify modal API wiring
grep -n "api/missions.*claim" /home/jorge/Loyalty/Rumi/appcode/components/claim-physical-gift-modal.tsx

# 5. Type check
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep error | wc -l
```

---

## Document Status

**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Partial code checked
- [ ] API contract verified

**Implementation:**
- [ ] All 11 steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified
- [ ] Call sites verified
- [ ] Types aligned

**Security:**
- [ ] No new queries (existing security applies)
- [ ] Auth requirements met

**Feature Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] ALL 6 acceptance criteria met
- [ ] Git diff reviewed

---

### Final Status

**Implementation Result:** [PENDING]

**Next Actions:**
1. [ ] User approves implementation plan
2. [ ] Execute steps sequentially
3. [ ] Verify each checkpoint
4. [ ] Run build and type check
5. [ ] Manual testing
6. [ ] Git commit

**Git Commit Message Template:**
```
feat: Add reward claim flow to Home page

Implements GAP-001: Home page reward claim functionality

- Add progressId and rewardValueData to dashboard response
- Implement handleClaimReward with reward type routing
- Add SchedulePayboostModal and ClaimPhysicalGiftModal
- Wire ClaimPhysicalGiftModal to actual claim API
- Add loading states and error handling

Affected files:
- dashboardService.ts: Add progressId, rewardValueData to response
- home-client.tsx: Full claim flow implementation
- claim-physical-gift-modal.tsx: API wiring
- types/dashboard.ts: Type updates

References:
- HomePageRewardClaimGap.md
- HomePageRewardClaimGapIMPL.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly
- [ ] Addressed audit feedback (progressId, valueData)

### Security Verification
- [ ] No new queries added (existing security applies)
- [ ] progressId comes from authenticated user data

### Acceptance Criteria
- [ ] EVERY criterion from Gap.md tested
- [ ] Each test traces back to specific criterion
- [ ] No criteria skipped

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED / [ ] CHECKS FAILED

**RED FLAGS exhibited:** [ ] None
