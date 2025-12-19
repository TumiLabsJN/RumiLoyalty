# Scheduled Reward Claim API Integration - Gap Implementation Plan

**Specification Source:** ScheduledRewardClaimGap.md
**Gap ID:** GAP-001-ScheduledRewardClaimAPI
**Type:** Feature Gap
**Priority:** Critical
**Implementation Date:** 2025-12-19
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From ScheduledRewardClaimGap.md:**

**Gap Summary:** The frontend `handleSchedulePayboost()` and `handleScheduleDiscount()` functions contain TODO placeholders with `setTimeout()` simulation instead of actual API calls.

**Business Need:** Users must be able to claim scheduled rewards (commission boosts, discounts) after completing missions - currently the claim silently fails leaving users confused.

**Files to Create/Modify:**
- `appcode/app/missions/missions-client.tsx` (MODIFY)

**Specified Solution (From Gap.md Section 6):**

> Replace the simulation with actual `fetch()` calls to `/api/missions/:id/claim`, following the pattern established in `claim-physical-gift-modal.tsx`. The modal passes a UTC timestamp; the handler must extract date and time strings from it.

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] `handleSchedulePayboost()` makes actual API call instead of simulation
2. [ ] `handleScheduleDiscount()` makes actual API call instead of simulation
3. [ ] Success toast only shows when API returns success
4. [ ] Error toast shows with message when API returns error
5. [ ] UI refreshes after successful claim
6. [ ] Type checker passes
7. [ ] Build completes
8. [ ] Manual verification completed - commission boost claim works end-to-end

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Server log source clarified as runtime observation
- Concerns Addressed: Timezone handling documented (DO NOT double-convert)

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 1 (`missions-client.tsx`)
- Lines added: ~60 (net change)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

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
**Expected:** Clean working tree OR only untracked files in BugFixes/

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -n "fetch.*missions.*claim" appcode/app/missions/missions-client.tsx
```
**Expected:** No matches in handleSchedulePayboost or handleScheduleDiscount

**Search for TODO still present:**
```bash
grep -n "TODO.*POST.*missions.*claim" appcode/app/missions/missions-client.tsx
```
**Expected:** Matches on lines ~129 and ~168

**Checklist:**
- [ ] Grep executed for fetch pattern: [result]
- [ ] Grep executed for TODO pattern: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for existing claim fetch patterns:**
```bash
grep -n "fetch.*claim" appcode/components/claim-physical-gift-modal.tsx
```
**Expected:** Match on line ~73

**Related code found:**

| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `claim-physical-gift-modal.tsx` | `handleShippingSubmit()` lines 73-88 | Same API endpoint | Reuse pattern |
| `schedule-payboost-modal.tsx` | `convertToDateTime()` lines 96-106 | Provides UTC Date | Consume output |
| `schedule-discount-modal.tsx` | `convertToDateTime()` lines 185-196 | Provides UTC Date | Consume output |

**Checklist:**
- [ ] Related code identified: 3 files
- [ ] Duplication risk assessed: LOW (following existing pattern)
- [ ] Integration points identified: Modal → Handler → API

---

### Gate 4: Files to Modify Verification

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** File exists

**Verify useRouter import status:**
```bash
grep -n "useRouter" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** No matches (import needs to be added)

**Checklist:**
- [ ] missions-client.tsx exists: [YES / NO]
- [ ] useRouter currently NOT imported: [YES / NO]
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification

> Skip - This feature does not add new database queries. The existing API handles all database operations.

**Checklist:**
- [x] Skipped - frontend-only change

---

### Gate 6: API Contract Verification

**Read route.ts for ClaimRequestBody interface:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/missions/[missionId]/claim/route.ts lines 24-39
```

**Endpoint:** POST /api/missions/:id/claim

**Contract alignment:**

| Field in Spec | Field in Contract | Aligned? |
|---------------|-------------------|----------|
| `scheduledActivationDate` | `scheduledActivationDate?: string` | ✅ |
| `scheduledActivationTime` | `scheduledActivationTime?: string` | ✅ |

**Checklist:**
- [ ] All field names align with contract
- [ ] Response structure matches (`{ success, message, redemptionId, nextAction }`)
- [ ] No breaking changes to existing API

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

### Step 1: Add useRouter Import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add Next.js router for page refresh after successful claim

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 26-28
```

**Expected Current State (EXACT CODE):**
```typescript
import Link from "next/link"
import { useState } from "react"
import * as React from "react"
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
import Link from "next/link"
import { useState } from "react"
```

**NEW Code (replacement):**
```typescript
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
Old String: import Link from "next/link"
import { useState } from "react"
New String: import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 26-29
```

**Expected New State:**
```typescript
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import * as React from "react"
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Checkpoint

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No new type errors related to import

**Step Checkpoint:**
- [ ] Action completed successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Add router Instance Declaration

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Create router instance for refresh calls

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 48-53
```

**Expected Current State (EXACT CODE):**
```typescript
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
```

**NEW Code (replacement):**
```typescript
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Router for page refresh after claim
  const router = useRouter()

  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
Old String:   // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
New String:   // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Router for page refresh after claim
  const router = useRouter()

  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 48-56
```

**Expected New State:**
```typescript
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Router for page refresh after claim
  const router = useRouter()

  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Checkpoint

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Action completed successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Replace handleScheduleDiscount Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Replace TODO placeholder with actual fetch() call

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 123-160
```

**Expected Current State (EXACT CODE - verify TODO exists):**
```typescript
  const handleScheduleDiscount = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // TODO: POST /api/missions/:id/claim
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected (TODO present): [YES / NO]
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  const handleScheduleDiscount = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // TODO: POST /api/missions/:id/claim
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }
```

**NEW Code (replacement):**
```typescript
  const handleScheduleDiscount = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // Extract date/time from UTC Date object (modal already converted ET → UTC)
      // API expects: scheduledActivationDate (YYYY-MM-DD) and scheduledActivationTime (HH:MM:SS in UTC)
      // ⚠️ DO NOT apply additional timezone conversion - scheduledDate is already UTC
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

      // Show success message with user-friendly display
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

      // Refresh page to update mission status
      router.refresh()

      // Reset selected mission
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

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
Old String: [full old code block above]
New String: [full new code block above]
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 123-175
```

**Expected New State:** Should contain `fetch(/api/missions/` and NO `setTimeout`

**Verification Grep:**
```bash
grep -n "fetch.*missions.*claim" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | head -5
```
**Expected:** Match on line ~133

```bash
grep -n "setTimeout" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** NO matches in handleScheduleDiscount function

**State Verification:**
- [ ] Read command executed
- [ ] fetch() call present: [YES / NO]
- [ ] setTimeout removed: [YES / NO]

---

#### Step Checkpoint

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Action completed successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Replace handleSchedulePayboost Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Replace TODO placeholder with actual fetch() call

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 177-215
```

**Note:** Line numbers shifted after Step 3. Locate by searching for:
```bash
grep -n "handleSchedulePayboost" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```

**Expected Current State (EXACT CODE - verify TODO exists):**
```typescript
  const handleSchedulePayboost = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // TODO: POST /api/missions/:id/claim
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected (TODO present): [YES / NO]
- [ ] Located correct function

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  const handleSchedulePayboost = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // TODO: POST /api/missions/:id/claim
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }
```

**NEW Code (replacement):**
```typescript
  const handleSchedulePayboost = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // Extract date/time from UTC Date object (modal already converted 2 PM ET → UTC)
      // API expects: scheduledActivationDate (YYYY-MM-DD) and scheduledActivationTime (HH:MM:SS in UTC)
      // ⚠️ DO NOT apply additional timezone conversion - scheduledDate is already UTC
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
        throw new Error(result.message || 'Failed to schedule commission boost')
      }

      // Show success message with user-friendly display
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

      // Refresh page to update mission status
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

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
Old String: [full old code block above]
New String: [full new code block above]
```

---

#### Post-Action Verification

**Verification Grep:**
```bash
grep -n "fetch.*missions.*claim" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** Two matches (one for discount, one for payboost)

```bash
grep -n "setTimeout.*1500" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** NO matches

**State Verification:**
- [ ] Read command executed
- [ ] TWO fetch() calls present: [YES / NO]
- [ ] ALL setTimeout simulations removed: [YES / NO]

---

#### Step Checkpoint

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Action completed successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**New Import:**
```typescript
import { useRouter } from "next/navigation"
```

**Verification:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct (`next/navigation`)
- [ ] `useRouter` hook used correctly in component
- [ ] `router.refresh()` called correctly

---

### Call Site Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`

**Call 1 - handleScheduleDiscount:**
```typescript
const response = await fetch(`/api/missions/${selectedMission.id}/claim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheduledActivationDate: dateStr,
    scheduledActivationTime: timeStr,
  }),
})
```

**Call 2 - handleSchedulePayboost:**
```typescript
const response = await fetch(`/api/missions/${selectedMission.id}/claim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheduledActivationDate: dateStr,
    scheduledActivationTime: timeStr,
  }),
})
```

**Verification:**
- [ ] Arguments match API contract (`scheduledActivationDate`, `scheduledActivationTime`)
- [ ] Return type handled correctly (checks `response.ok` and `result.success`)
- [ ] Error handling in place (catch block with toast.error)

---

### Type Alignment Verification

**No new types introduced** - uses existing types from Next.js and the API response.

**Verification:**
- [ ] No new interfaces/types needed
- [ ] `selectedMission.id` is string (verified from existing code)
- [ ] Response type matches API (`{ success, message, ... }`)

---

**INTEGRATION STATUS:** [ ] ALL CHECKS PASSED ✅

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This feature does not add new database queries.** The frontend makes a fetch() call to an existing API endpoint (`/api/missions/:id/claim`) which already handles multi-tenant security.

**Verification of existing API security (route.ts):**
```bash
grep -n "client_id\|clientId" /home/jorge/Loyalty/Rumi/appcode/app/api/missions/\[missionId\]/claim/route.ts
```
**Expected:** client_id verification on lines 66, 93

**Checklist:**
- [x] Frontend does not query database directly
- [x] API endpoint already verifies client_id (route.ts line 93)
- [x] No cross-tenant data exposure possible

---

### Authentication Check

**Route:** POST `/api/missions/:id/claim` (existing)

**Verification (from route.ts):**
- [x] Auth middleware applied (line 52: `supabase.auth.getUser()`)
- [x] User verified before data access (line 54: `if (authError || !authUser)`)
- [x] Tenant isolation enforced (line 93: `if (user.clientId !== clientId)`)

---

**SECURITY STATUS:** [x] ALL CHECKS PASSED ✅ (no new security surface)

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -c "error" || echo "0"
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

**For each acceptance criterion from Gap.md Section 16:**

#### Criterion 1: `handleSchedulePayboost()` makes actual API call instead of simulation

**Test:** Grep for fetch() in handleSchedulePayboost
**Command:**
```bash
grep -A5 "const handleSchedulePayboost" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | grep -c "fetch"
```
**Expected:** 1 (fetch call present)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: `handleScheduleDiscount()` makes actual API call instead of simulation

**Test:** Grep for fetch() in handleScheduleDiscount
**Command:**
```bash
grep -A5 "const handleScheduleDiscount" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | grep -c "fetch"
```
**Expected:** 1 (fetch call present)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: Success toast only shows when API returns success

**Test:** Verify toast.success is inside `if (!response.ok || !result.success)` check
**Command:**
```bash
grep -B10 "toast.success.*Commission boost scheduled" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | grep -c "throw new Error"
```
**Expected:** 1 (error thrown before success toast would execute if API fails)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Error toast shows with message when API returns error

**Test:** Verify error handling includes error.message
**Command:**
```bash
grep "error instanceof Error" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | wc -l
```
**Expected:** 2 (one per handler)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: UI refreshes after successful claim

**Test:** Verify router.refresh() called after success
**Command:**
```bash
grep -c "router.refresh()" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** 2 (one per handler)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Type checker passes

**Test:** Run tsc --noEmit
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1 | grep -c "error" || echo "0"
```
**Expected:** 0
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Build completes

**Test:** Run npm run build
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -5
```
**Expected:** "✓ Compiled successfully" or similar
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 8: Manual verification - commission boost claim works end-to-end

**Test:** Runtime test (manual)
1. Log in as testbronze@test.com
2. Navigate to completed mission with commission_boost reward
3. Click "Claim Reward"
4. Select date and click "Schedule Activation"
5. Check server logs for POST request
6. Check database for redemption record

**Expected:**
- POST /api/missions/:id/claim visible in server logs
- Toast shows success
- Database shows claimed redemption

**Actual:** [document results]
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Schema Alignment Confirmed

> Skipped - no new database queries added

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [x] Request body matches API_CONTRACTS.md (`scheduledActivationDate`, `scheduledActivationTime`)
- [x] No breaking changes to existing consumers
- [x] Error responses handled correctly (checks `result.message`)

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Changes:**
- `appcode/app/missions/missions-client.tsx`: ~30 lines added (net)

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff appcode/app/missions/missions-client.tsx | head -100
```

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 7: Runtime/Integration Test

**Dev Server Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev
```

Then test in browser:
1. Navigate to /missions
2. Find claimable commission_boost mission
3. Click claim, select date, confirm

**Expected:** POST request logged, success toast shown
**Actual:** [document results]

**Status:**
- [ ] Runtime test passed ✅

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED ✅ / [ ] FAILED ❌

**Acceptance Criteria Summary:**

| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | handleSchedulePayboost() makes API call | ✅ / ❌ |
| 2 | handleScheduleDiscount() makes API call | ✅ / ❌ |
| 3 | Success toast only on API success | ✅ / ❌ |
| 4 | Error toast with message | ✅ / ❌ |
| 5 | UI refreshes after claim | ✅ / ❌ |
| 6 | Type checker passes | ✅ / ❌ |
| 7 | Build completes | ✅ / ❌ |
| 8 | End-to-end manual test | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-19
**Executor:** Claude Opus 4.5
**Specification Source:** ScheduledRewardClaimGap.md
**Implementation Doc:** ScheduledRewardClaimGapIMPL.md
**Gap ID:** GAP-001-ScheduledRewardClaimAPI

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PENDING]
[Timestamp] Gate 2: Gap Confirmation - [PENDING]
[Timestamp] Gate 3: Partial Code Check - [PENDING]
[Timestamp] Gate 4: Files - [PENDING]
[Timestamp] Gate 5: Schema - SKIPPED (frontend-only)
[Timestamp] Gate 6: API Contract - [PENDING]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Add useRouter import - [PENDING]
[Timestamp] Step 2: Add router instance - [PENDING]
[Timestamp] Step 3: Replace handleScheduleDiscount - [PENDING]
[Timestamp] Step 4: Replace handleSchedulePayboost - [PENDING]
```

**Integration Verification:**
```
[Timestamp] Import check - [PENDING]
[Timestamp] Call site check - [PENDING]
[Timestamp] Type alignment - [PENDING]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - SKIPPED (no new queries)
[Timestamp] Auth check - VERIFIED (existing API)
```

**Feature Verification:**
```
[Timestamp] Build succeeds - [PENDING]
[Timestamp] Type check passes - [PENDING]
[Timestamp] Criteria 1-8 - [PENDING]
[Timestamp] Git diff sanity - [PENDING]
[Timestamp] Runtime test - [PENDING]
```

---

### Files Created/Modified

**Complete List:**
1. `appcode/app/missions/missions-client.tsx` - MODIFY - ~30 lines net - Replace TODO with fetch()

**Total:** 1 file, ~30 lines added (net)

---

### Feature Completion

**Before Implementation:**
- Gap: `handleSchedulePayboost()` and `handleScheduleDiscount()` contain TODO placeholders
- Code existed: NO (simulation only)

**After Implementation:**
- Feature: IMPLEMENTED ✅
- All acceptance criteria: MET ✅
- Verification: Build + Type check + Runtime

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardGapFix.md template applied
- Created: ScheduledRewardClaimGap.md
- Documented 17 sections
- Proposed solution: Replace TODO with fetch()

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: Timezone handling clarified, server log source noted

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created: ScheduledRewardClaimGapIMPL.md
- Planned 4 implementation steps

**Step 4: Current Status**
- Implementation: PLANNED (ready for execution)
- Ready for user approval: YES

---

### Auditor Verification Commands

**Quick Verification (Run These After Implementation):**

```bash
# 1. Verify file changed
git diff --stat appcode/app/missions/missions-client.tsx

# 2. Verify no type errors
cd appcode && npx tsc --noEmit app/missions/missions-client.tsx 2>&1

# 3. Verify fetch() calls added
grep -n "fetch.*missions.*claim" appcode/app/missions/missions-client.tsx

# 4. Verify setTimeout removed
grep -n "setTimeout.*1500" appcode/app/missions/missions-client.tsx
# Should show: no matches

# 5. Verify router.refresh() added
grep -n "router.refresh()" appcode/app/missions/missions-client.tsx
# Should show: 2 matches

# 6. Verify useRouter imported
grep -n "useRouter" appcode/app/missions/missions-client.tsx
# Should show: import and usage
```

**Expected Results:**
- File modified: `missions-client.tsx` ✅
- No new errors ✅
- fetch() calls present (2) ✅
- setTimeout removed ✅
- router.refresh() present (2) ✅
- useRouter imported ✅

---

### Metrics

**Implementation Efficiency:**
- Gates to pass: 5/6 (Schema skipped)
- Steps to complete: 4
- Verifications to run: 8
- Acceptance criteria: 8

**Code Quality:**
- Files created: 0
- Files modified: 1
- Lines added: ~30 (net)
- Breaking changes: 0
- Security verified: YES (existing API)
- Tests added: NO (manual verification)

---

## Document Status

**Implementation Date:** 2025-12-19
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [x] Schema verified: SKIPPED (frontend-only)
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅
- [ ] Types aligned ✅

**Security:**
- [x] Multi-tenant isolation: SKIPPED (no new queries)
- [x] Auth requirements: VERIFIED (existing API)

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [x] Audit trail complete ✅
- [x] Execution log template ready ✅
- [x] Metrics documented ✅

---

### Final Status

**Implementation Result:** [ ] PENDING EXECUTION

**Next Actions:**

1. User approves implementation plan
2. Execute Steps 1-4 in order
3. Run all verification checks
4. Git commit with message below
5. Update ScheduledRewardClaimGap.md status to "Implemented"

**Git Commit Message Template:**
```
feat: implement scheduled reward claim API integration

Implements GAP-001: handleSchedulePayboost() and handleScheduleDiscount()
now make actual POST requests to /api/missions/:id/claim instead of
setTimeout simulation.

Modified files:
- appcode/app/missions/missions-client.tsx: Replace TODO with fetch()

Changes:
- Add useRouter import from next/navigation
- Add router instance for page refresh
- Replace setTimeout simulation with fetch() call in handleScheduleDiscount
- Replace setTimeout simulation with fetch() call in handleSchedulePayboost
- Add proper error handling with API error messages
- Add router.refresh() after successful claim

References:
- BugFixes/ScheduledRewardClaimGap.md
- BugFixes/ScheduledRewardClaimGapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [x] Document structure matches StandardGapFixIMPL.md template
- [x] All code blocks are complete (no placeholders)
- [x] Line numbers will be verified during execution
- [x] API contract verified from route.ts
- [x] Gap confirmed via discovery (TODO still present)

### Specification Fidelity
- [x] Followed locked specification from ScheduledRewardClaimGap.md
- [x] Implemented specified solution exactly
- [x] Addressed audit feedback (timezone handling)

### Acceptance Criteria
- [x] All 8 criteria from Gap.md listed
- [x] Each criterion has explicit test command
- [x] Tests trace back to Gap.md Section 16

---

**META-VERIFICATION STATUS:** [x] PLANNING COMPLETE - Ready for execution approval

**Document Version:** 1.0
**Last Updated:** 2025-12-19
**Author:** Claude Opus 4.5
