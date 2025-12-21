# Missions Instant Claim - Gap Implementation Plan

**Specification Source:** MissionsInstantClaimGap.md
**Gap ID:** GAP-002-MissionsInstantClaim
**Type:** Feature Gap
**Priority:** Medium
**Implementation Date:** 2025-12-21
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionsInstantClaimGap.md:**

**Gap Summary:** The `/missions` page has a TODO placeholder for instant reward claims (gift_card, spark_ads, experience). Clicking "Claim Reward" does nothing.

**Business Need:** Creators should be able to claim instant rewards from any page that shows the "Claim Reward" button.

**Files to Create/Modify:**
- `appcode/lib/client/claimMissionReward.ts` - CREATE
- `appcode/app/missions/missions-client.tsx` - MODIFY
- `appcode/app/home/home-client.tsx` - MODIFY

**Specified Solution (From Gap.md Section 6):**
Create a centralized claim utility (`lib/client/claimMissionReward.ts`) with `"use client"` directive. Both `/home` and `/missions` pages will import and use this utility. The utility:
- POSTs to `/api/missions/:id/claim` with empty body
- Shows context-specific success toast
- Refreshes page after configurable delay (default 2000ms)
- Handles errors with toast.error

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] `claimMissionReward.ts` utility created with `"use client"` directive, exported function and types
2. [ ] `missions-client.tsx` imports and uses centralized utility
3. [ ] `home-client.tsx` imports and uses centralized utility (replaces inline logic)
4. [ ] Home page toast: "Check Missions tab for details"
5. [ ] Missions page toast: "Check back soon for fulfillment updates"
6. [ ] Both pages use consistent error handling and 2-second refresh delay
7. [ ] Type checker passes
8. [ ] Build completes
9. [ ] Manual verification completed (instant claim + regression tests)
10. [ ] No code duplication for API call, error handling, refresh logic

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: None
- Concerns Addressed:
  - Added `"use client"` directive to prevent SSR bundling issues
  - Moved utility to `lib/client/` path for explicit client-only intent
  - Added explicit regression tests to Implementation Checklist
  - Added Future Work section for test scaffolding

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1 (`lib/client/claimMissionReward.ts`)
- Files modified: 2 (`missions-client.tsx`, `home-client.tsx`)
- Lines added: ~80 (new file ~65, modifications ~15)
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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` OR `/home/jorge/Loyalty/Rumi`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -r "claimMissionReward" appcode/lib/
grep -r "claimMissionReward" appcode/app/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Search for lib/client directory:**
```bash
ls -la appcode/lib/client/ 2>&1
```
**Expected:** Directory does not exist OR is empty
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `claimMissionReward`: [result]
- [ ] lib/client directory check: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for existing claim implementations:**
```bash
grep -n "fetch.*claim" appcode/app/missions/missions-client.tsx
grep -n "fetch.*claim" appcode/app/home/home-client.tsx
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `home-client.tsx` | Lines 155-181 | Existing inline claim logic | REPLACE with utility |
| `missions-client.tsx` | Lines 140, 198 | Scheduled reward claims | LEAVE as-is (different flow) |

**Checklist:**
- [ ] Related code identified: 2 files
- [ ] Duplication risk assessed: LOW (we're centralizing)
- [ ] Integration points identified: handleClaimMission, handleClaimReward

---

### Gate 3b: ID Field Verification (CRITICAL - Per Audit)

**Purpose:** Verify `mission.id` (missions page) and `mission.progressId` (home page) are the correct identifiers for `POST /api/missions/:id/claim` which expects `mission_progress.id`.

**Verify missions page uses correct ID:**
```bash
grep -n "id: progress?.id" appcode/lib/services/missionService.ts
```
**Expected:** Line ~891 shows `id: progress?.id ?? mission.id` - confirms transformed `mission.id` IS `mission_progress.id` for claimable states
**Actual:** [document actual output]

**Verify home page mission type has progressId field:**
```bash
grep -n "progressId" appcode/types/dashboard.ts
```
**Expected:** `progressId` field exists in FeaturedMission or related type
**Actual:** [document actual output]

**Verify home page uses progressId in claim call:**
```bash
grep -n "mission.progressId" appcode/app/home/home-client.tsx
```
**Expected:** Line ~159 shows `mission.progressId` used in fetch URL
**Actual:** [document actual output]

**Checklist:**
- [ ] missionService.ts confirms `id: progress?.id ?? mission.id`: [YES / NO]
- [ ] dashboard.ts has `progressId` field: [YES / NO]
- [ ] home-client.tsx uses `mission.progressId`: [YES / NO]
- [ ] ID semantics verified correct for claim API: [YES / NO]

**If ID semantics incorrect:** STOP. Report to user - API contract mismatch.

---

### Gate 4: Files to Modify Verification

**File 1 (CREATE):** `appcode/lib/client/claimMissionReward.ts`
```bash
ls -la appcode/lib/client/claimMissionReward.ts 2>&1
```
**Expected:** File does not exist
**Actual:** [document actual output]

**File 2 (MODIFY):** `appcode/app/missions/missions-client.tsx`
```bash
ls -la appcode/app/missions/missions-client.tsx
```
**Expected:** File exists
**Actual:** [document actual output]

**File 3 (MODIFY):** `appcode/app/home/home-client.tsx`
```bash
ls -la appcode/app/home/home-client.tsx
```
**Expected:** File exists
**Actual:** [document actual output]

**Checklist:**
- [ ] File to create does not exist: [confirmed]
- [ ] All files to modify exist: 2 files
- [ ] File paths match Gap.md: [YES]

---

### Gate 5: Schema Verification

> **SKIPPED** - This feature doesn't create new database queries. It uses existing `/api/missions/:id/claim` endpoint which already handles database operations.

---

### Gate 6: API Contract Verification

> **SKIPPED** - This feature uses existing API endpoint with no changes. Per Gap.md Section 10: "NO CHANGE - Accepts empty body for instant rewards"

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step 1: Create lib/client Directory

**Target:** `appcode/lib/client/`
**Action Type:** CREATE DIRECTORY
**Purpose:** Establish client-only utilities directory

**Create Command:**
```bash
mkdir -p appcode/lib/client
```

**Post-Create Verification:**
```bash
ls -la appcode/lib/client/
```
**Expected:** Empty directory exists

**Step Checkpoint:**
- [ ] Directory created successfully ✅
- [ ] Ready for file creation ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Create claimMissionReward.ts Utility

**Target File:** `appcode/lib/client/claimMissionReward.ts`
**Action Type:** CREATE
**Purpose:** Centralized instant claim utility with `"use client"` directive

**New File Content:**
```typescript
"use client"

import { toast } from 'sonner'

export interface ClaimMissionRewardOptions {
  missionProgressId: string
  successMessage: string
  successDescription: string
  refreshDelay?: number
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

**Create Command:**
```
Tool: Write
File: appcode/lib/client/claimMissionReward.ts
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la appcode/lib/client/claimMissionReward.ts
wc -l appcode/lib/client/claimMissionReward.ts
```
**Expected:** File exists, ~65 lines

**Type Check:**
```bash
npx tsc --noEmit appcode/lib/client/claimMissionReward.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File created successfully ✅
- [ ] Line count approximately correct ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Update missions-client.tsx - Add Import

**Target File:** `appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add import for centralized claim utility

**Pre-Action Reality Check:**

**Read Current State (lines 24-30):**
```bash
Read appcode/app/missions/missions-client.tsx lines 24-30
```

**Expected Current State:**
```typescript
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import * as React from "react"
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

**Edit Action:**

**OLD Code (line 24):**
```typescript
import { toast } from "sonner"
```

**NEW Code:**
```typescript
import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
```

**Edit Command:**
```
Tool: Edit
File: appcode/app/missions/missions-client.tsx
Old String: import { toast } from "sonner"
New String: import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
```

**Post-Action Verification:**
```bash
grep -n "claimMissionReward" appcode/app/missions/missions-client.tsx
```
**Expected:** Line ~25 shows import

**Step Checkpoint:**
- [ ] Import added successfully ✅
- [ ] No syntax errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update missions-client.tsx - Make handleClaimMission Async

**Target File:** `appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Make handleClaimMission async to support await

**Pre-Action Reality Check:**

**Read Current State (line 91):**
```bash
Read appcode/app/missions/missions-client.tsx lines 91-92
```

**Expected Current State:**
```typescript
  const handleClaimMission = (mission: any) => {
    console.log("[v0] Claim mission clicked:", mission.id)
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]

---

**Edit Action:**

**OLD Code:**
```typescript
  const handleClaimMission = (mission: any) => {
```

**NEW Code:**
```typescript
  const handleClaimMission = async (mission: any) => {
```

**Edit Command:**
```
Tool: Edit
File: appcode/app/missions/missions-client.tsx
Old String:   const handleClaimMission = (mission: any) => {
New String:   const handleClaimMission = async (mission: any) => {
```

**Post-Action Verification:**
```bash
grep -n "handleClaimMission = async" appcode/app/missions/missions-client.tsx
```
**Expected:** Line ~91 shows async function

**Step Checkpoint:**
- [ ] Function made async ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Update missions-client.tsx - Replace TODO with Utility Call

**Target File:** `appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Replace TODO placeholder with centralized utility call

**Pre-Action Reality Check:**

**Read Current State (lines 122-125):**
```bash
Read appcode/app/missions/missions-client.tsx lines 120-126
```

**Expected Current State:**
```typescript
    }

    // For other reward types, claim immediately
    // TODO: POST /api/missions/:id/claim
    // Sets status from 'completed' → 'claimed'
  }
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] TODO placeholder confirmed present

---

**Edit Action:**

**OLD Code:**
```typescript
    // For other reward types, claim immediately
    // TODO: POST /api/missions/:id/claim
    // Sets status from 'completed' → 'claimed'
```

**NEW Code:**
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

**Edit Command:**
```
Tool: Edit
File: appcode/app/missions/missions-client.tsx
Old String:     // For other reward types, claim immediately
    // TODO: POST /api/missions/:id/claim
    // Sets status from 'completed' → 'claimed'
New String:     // For other reward types (gift_card, spark_ads, experience), claim immediately
    await claimMissionReward(
      {
        missionProgressId: mission.id,
        successMessage: 'Reward claimed!',
        successDescription: 'Check back soon for fulfillment updates',
      },
      () => router.refresh()
    )
```

**Post-Action Verification:**
```bash
grep -n "claimMissionReward" appcode/app/missions/missions-client.tsx
```
**Expected:** Shows import line AND usage line (~125)

**Type Check:**
```bash
npx tsc --noEmit appcode/app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] TODO replaced with utility call ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 6: Update home-client.tsx - Add Import

**Target File:** `appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add import for centralized claim utility

**Pre-Action Reality Check:**

**Read Current State (lines 11-13):**
```bash
Read appcode/app/home/home-client.tsx lines 10-14
```

**Expected Current State:**
```typescript
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]

---

**Edit Action:**

**OLD Code:**
```typescript
import { toast } from "sonner"
import { cn } from "@/lib/utils"
```

**NEW Code:**
```typescript
import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
import { cn } from "@/lib/utils"
```

**Edit Command:**
```
Tool: Edit
File: appcode/app/home/home-client.tsx
Old String: import { toast } from "sonner"
import { cn } from "@/lib/utils"
New String: import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
import { cn } from "@/lib/utils"
```

**Post-Action Verification:**
```bash
grep -n "claimMissionReward" appcode/app/home/home-client.tsx
```
**Expected:** Line ~12 shows import

**Step Checkpoint:**
- [ ] Import added successfully ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 7: Update home-client.tsx - Replace Inline Claim Logic

**Target File:** `appcode/app/home/home-client.tsx`
**Action Type:** MODIFY
**Purpose:** Replace inline claim logic with centralized utility call

**Pre-Action Reality Check:**

**Read Current State (lines 155-181):**
```bash
Read appcode/app/home/home-client.tsx lines 154-182
```

**Expected Current State:**
```typescript
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
          // Delay reload so user can see success message
          setTimeout(() => window.location.reload(), 1500)
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
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Inline logic confirmed present

---

**Edit Action:**

**OLD Code:**
```typescript
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
          // Delay reload so user can see success message
          setTimeout(() => window.location.reload(), 1500)
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
```

**NEW Code:**
```typescript
    // Instant rewards (gift_card, spark_ads, experience) - use centralized utility
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

**Edit Command:**
```
Tool: Edit
File: appcode/app/home/home-client.tsx
Old String: [exact old code above]
New String: [exact new code above]
```

**Post-Action Verification:**
```bash
grep -n "claimMissionReward" appcode/app/home/home-client.tsx
```
**Expected:** Shows import line AND usage line (~157)

**Type Check:**
```bash
npx tsc --noEmit appcode/app/home/home-client.tsx 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Inline logic replaced with utility call ✅
- [ ] No type errors ✅
- [ ] Loading state preserved (setIsClaimingReward) ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File 1:** `appcode/app/missions/missions-client.tsx`
**New Import:**
```typescript
import { claimMissionReward } from '@/lib/client/claimMissionReward'
```

**Verification:**
```bash
npx tsc --noEmit appcode/app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No import errors

**File 2:** `appcode/app/home/home-client.tsx`
**New Import:**
```typescript
import { claimMissionReward } from '@/lib/client/claimMissionReward'
```

**Verification:**
```bash
npx tsc --noEmit appcode/app/home/home-client.tsx 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import paths correct (both use `@/lib/client/claimMissionReward`)
- [ ] Exported names match
- [ ] Types align

---

### Call Site Verification

**Call Site 1:** `missions-client.tsx` handleClaimMission
```typescript
await claimMissionReward(
  {
    missionProgressId: mission.id,
    successMessage: 'Reward claimed!',
    successDescription: 'Check back soon for fulfillment updates',
  },
  () => router.refresh()
)
```

**Verification:**
- [ ] Arguments match function signature ✅
- [ ] mission.id is string (matches missionProgressId: string) ✅
- [ ] router.refresh() is valid refresh function ✅

**Call Site 2:** `home-client.tsx` handleClaimReward
```typescript
await claimMissionReward(
  {
    missionProgressId: mission.progressId,
    successMessage: 'Reward claimed!',
    successDescription: 'Check Missions tab for details',
  },
  () => window.location.reload()
)
```

**Verification:**
- [ ] Arguments match function signature ✅
- [ ] mission.progressId is string ✅
- [ ] window.location.reload() is valid refresh function ✅

---

### Type Alignment Verification

**New Types Introduced:**
```typescript
export interface ClaimMissionRewardOptions {
  missionProgressId: string
  successMessage: string
  successDescription: string
  refreshDelay?: number
}

export interface ClaimMissionRewardResult {
  success: boolean
  message?: string
  redemptionId?: string
}
```

**Verification:**
- [ ] Types exported correctly from claimMissionReward.ts
- [ ] Types not imported at call sites (only function needed)
- [ ] No type conflicts with existing types

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query Analysis:**

The new utility calls existing API endpoint: `POST /api/missions/:id/claim`

This endpoint already enforces multi-tenant security:
- Route validation in `route.ts` line 91
- User's clientId matched against mission's clientId
- Per MISSIONS_IMPL.md: `user.clientId !== clientId` check

**Security Checklist:**
- [ ] No new database queries in utility (uses existing API)
- [ ] API endpoint already has client_id validation
- [ ] No cross-tenant data exposure possible

---

### Authentication Check

**Route:** `POST /api/missions/:id/claim`

**Checklist:**
- [ ] Auth middleware applied (existing route handles this)
- [ ] User verified before data access (existing route handles this)
- [ ] Tenant isolation enforced (existing route handles this)

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅]

No new security code needed - feature uses existing secured API endpoint.

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

**Traces to:** Acceptance Criterion 8: "Build completes"

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

**Traces to:** Acceptance Criterion 7: "Type checker passes"

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: Utility created with "use client" directive
**Test:** Verify file exists and has directive
```bash
head -5 appcode/lib/client/claimMissionReward.ts
```
**Expected:** First line is `"use client"`
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: missions-client.tsx imports and uses utility
**Test:** Verify import and usage
```bash
grep -n "claimMissionReward" appcode/app/missions/missions-client.tsx
```
**Expected:** Import line AND usage line
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: home-client.tsx imports and uses utility
**Test:** Verify import and usage
```bash
grep -n "claimMissionReward" appcode/app/home/home-client.tsx
```
**Expected:** Import line AND usage line
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Home page toast message
**Test:** Verify toast description in home-client.tsx
```bash
grep "Check Missions tab" appcode/app/home/home-client.tsx
```
**Expected:** "Check Missions tab for details"
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Missions page toast message
**Test:** Verify toast description in missions-client.tsx
```bash
grep "Check back soon" appcode/app/missions/missions-client.tsx
```
**Expected:** "Check back soon for fulfillment updates"
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Consistent error handling
**Test:** Verify utility has error handling
```bash
grep -c "toast.error" appcode/lib/client/claimMissionReward.ts
```
**Expected:** 1 (centralized error handling)
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 10: No code duplication
**Test:** Verify inline logic removed from home-client.tsx
```bash
grep -c "fetch.*claim" appcode/app/home/home-client.tsx
```
**Expected:** 0 (inline fetch removed)
**Actual:** [actual output]
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `appcode/lib/client/claimMissionReward.ts`: ~65 lines added (new file)
- `appcode/app/missions/missions-client.tsx`: ~8 lines changed
- `appcode/app/home/home-client.tsx`: ~20 lines changed (net reduction)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 5: Manual Testing

**Per Gap.md Section 14 - Manual Verification Steps:**

**Instant Claim Test (Primary):**
1. [ ] Login as testbronze@test.com
2. [ ] Navigate to `/missions`
3. [ ] Find mission with gift_card reward in "Claim Reward" state
4. [ ] Click "Claim Reward" button
5. [ ] Verify success toast: "Reward claimed!" with "Check back soon for fulfillment updates"
6. [ ] Verify page refreshes after ~2 seconds
7. [ ] Verify mission status changes to "Redeeming"

**Regression Tests:**
8. [ ] Test discount scheduling on missions page still works
9. [ ] Test commission_boost scheduling on missions page still works
10. [ ] Test physical_gift modal opens on missions page

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| # | Criterion | Test Result |
|---|-----------|-------------|
| 1 | Utility with "use client" | ✅ / ❌ |
| 2 | missions-client imports/uses | ✅ / ❌ |
| 3 | home-client imports/uses | ✅ / ❌ |
| 4 | Home toast message | ✅ / ❌ |
| 5 | Missions toast message | ✅ / ❌ |
| 6 | Consistent error handling | ✅ / ❌ |
| 7 | Type check passes | ✅ / ❌ |
| 8 | Build completes | ✅ / ❌ |
| 9 | Manual verification | ✅ / ❌ |
| 10 | No code duplication | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-21
**Executor:** Claude Opus 4.5
**Specification Source:** MissionsInstantClaimGap.md v1.5
**Implementation Doc:** MissionsInstantClaimGapIMPL.md
**Gap ID:** GAP-002-MissionsInstantClaim

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 3b: ID Field Verification - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - SKIPPED (no DB changes)
[Timestamp] Gate 6: API Contract - SKIPPED (no API changes)
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create lib/client directory - Created ✅ - Verified ✅
[Timestamp] Step 2: Create claimMissionReward.ts - Created ✅ - Verified ✅
[Timestamp] Step 3: Add import to missions-client.tsx - Modified ✅ - Verified ✅
[Timestamp] Step 4: Make handleClaimMission async - Modified ✅ - Verified ✅
[Timestamp] Step 5: Replace TODO with utility call - Modified ✅ - Verified ✅
[Timestamp] Step 6: Add import to home-client.tsx - Modified ✅ - Verified ✅
[Timestamp] Step 7: Replace inline logic with utility - Modified ✅ - Verified ✅
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - PASS (uses existing secured API)
[Timestamp] Auth check - PASS (existing route handles)
```

**Feature Verification:**
```
[Timestamp] Build succeeds ✅
[Timestamp] Type check passes ✅
[Timestamp] Criterion 1-10: [results]
[Timestamp] Git diff sanity ✅
[Timestamp] Manual test ✅ / PENDING
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `appcode/lib/client/claimMissionReward.ts` - CREATE - ~65 lines - Centralized claim utility
2. `appcode/app/missions/missions-client.tsx` - MODIFY - ~8 lines - Import + async + utility call
3. `appcode/app/home/home-client.tsx` - MODIFY - ~-17 lines net - Import + replace inline logic

**Total:** 3 files, ~56 lines added (net)

---

### Feature Completion

**Before Implementation:**
- Gap: Missions page TODO placeholder for instant claims
- Code existed: NO

**After Implementation:**
- Feature: IMPLEMENTED ✅
- All acceptance criteria: MET ✅
- Verification: Type check + build + manual test

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify new utility file
head -10 appcode/lib/client/claimMissionReward.ts
# Should show: "use client" directive and imports

# 2. Verify missions-client.tsx changes
grep -n "claimMissionReward" appcode/app/missions/missions-client.tsx
# Should show: import line + usage line

# 3. Verify home-client.tsx changes
grep -n "claimMissionReward" appcode/app/home/home-client.tsx
# Should show: import line + usage line

# 4. Verify inline logic removed
grep -c "fetch.*claim" appcode/app/home/home-client.tsx
# Should show: 0

# 5. Verify no type errors
npx tsc --noEmit 2>&1 | grep "error" | wc -l
# Should show: 0

# 6. Verify build
npm run build 2>&1 | tail -5
# Should show: success
```

---

## Document Status

**Implementation Date:** 2025-12-21
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] ID field semantics verified (Gate 3b)
- [ ] Schema verified: SKIPPED (no DB changes)
- [ ] API contract verified: SKIPPED (no API changes)

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅
- [ ] Types aligned ✅

**Security:**
- [ ] Multi-tenant: N/A (uses existing API)
- [ ] Auth: N/A (uses existing API)

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update MissionsInstantClaimGap.md status to "Implemented"

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update MissionsInstantClaimGap.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Manual test on running dev server

**Git Commit Message Template:**
```
feat: add instant claim functionality to missions page

Implements GAP-002: Missions page instant claim for gift_card, spark_ads, experience rewards

New files:
- lib/client/claimMissionReward.ts: Centralized claim utility with "use client" directive

Modified files:
- missions-client.tsx: Import utility, make handleClaimMission async, replace TODO
- home-client.tsx: Import utility, replace inline claim logic

References:
- MissionsInstantClaimGap.md
- MissionsInstantClaimGapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (client-only path, "use client" directive)

### Acceptance Criteria
- [ ] EVERY criterion from Gap.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

**RED FLAGS you exhibited (if any):**
- [ ] None ✅

---

**Document Version:** 1.1
**Last Updated:** 2025-12-21
**Author:** Claude Opus 4.5
**Status:** Ready for Execution

**Revision Notes:**
- v1.1: Added Gate 3b (ID Field Verification) per audit - verifies mission.id and mission.progressId are correct for claim API
- v1.0: Initial implementation plan
