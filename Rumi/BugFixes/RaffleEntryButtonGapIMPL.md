# Raffle Entry Button - Gap Implementation Plan

**Specification Source:** RaffleEntryButtonGap.md
**Gap ID:** GAP-RAFFLE-ENTRY-001
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-16
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RaffleEntryButtonGap.md:**

**Gap Summary:** The home page has no "Enter Raffle" button when featured mission is a raffle - users cannot participate.

**Business Need:** Users must be able to enter raffles directly from the home page to drive engagement.

**Files to Modify:**
- `lib/services/dashboardService.ts` - Backend raffle formatting
- `app/home/page.tsx` - Frontend button and handler

**Specified Solution (From Gap.md Section 6):**

1. **Backend:** Change raffle `progressPercentage` to 100
2. **Backend:** Change raffle center text to prize name + "Enter to Win!"
3. **Frontend:** Add `isEnteringRaffle` state variable
4. **Frontend:** Add `handleEnterRaffle()` function with toast + re-fetch
5. **Frontend:** Update button rendering for `raffle_available` status
6. **Frontend:** ~~Add imports (Loader2, Gift, toast)~~ **SKIP - Already imported**

**Discovery Adjustments (Pre-Execution Audit):**

> These adjustments were identified during discovery phase and MUST be applied:

| Original (Gap.md) | Adjusted (Actual Code) | Reason |
|-------------------|------------------------|--------|
| `dashboardData.featuredMission...` | `mockData.featuredMission...` | page.tsx uses `mockData` alias (line 169) |
| `fetchDashboardData()` | `fetchDashboard()` | Actual function name (line 80) |
| `toast({ title: "...", description: "..." })` | `toast.success("...")` / `toast.error("...")` | Uses `sonner` library, not `@/hooks/use-toast` |
| Add Loader2, Gift imports | SKIP | Already imported at line 7 |
| Add toast import | SKIP | Already imported from `sonner` at line 10 |

**Implementation Coupling (Known Tech Debt):**

> ⚠️ **IMPORTANT:** This implementation aligns with the CURRENT code state of `app/home/page.tsx`.
> If a future refactor changes these patterns, this handler may need updates.

| Coupling | Current State | If Changed |
|----------|---------------|------------|
| `mockData` variable | Alias for `dashboardData!` at line 169 | Handler references would break |
| `fetchDashboard()` | useCallback at line 80 | Re-fetch call would break |
| `sonner` toast | Imported at line 10 | Toast calls would break |

**Decision:** We intentionally use the existing patterns rather than refactoring. Renaming `mockData` to `dashboardData` is out of scope for this feature. A future cleanup task could:
1. Rename `mockData` → `dashboardData` throughout the component
2. Consolidate toast usage across the app (sonner vs hooks/use-toast)

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] Raffle progressPercentage is 100 (filled circle)
2. [ ] Raffle center text shows prize name + "Enter to Win!"
3. [ ] "Enter Raffle" button visible for raffle missions
4. [ ] Button shows loading state during API call
5. [ ] After entry, dashboard re-fetches and shows next featured mission
6. [ ] API_CONTRACTS.md documents raffle progressPercentage=100
7. [ ] Type checker passes
8. [ ] Build completes
9. [ ] Manual verification completed

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES (4 audit rounds on Gap.md + 2 on IMPL.md)
- Critical Issues: None
- Concerns Addressed:
  - Toast + re-fetch UX (no inline state)
  - Complete mock data for tests
  - Both API endpoints documented
  - Test assertions for re-fetch behavior
  - Variable alias clarity (`mockData` used intentionally, no rename)
  - Toast API consistency (sonner, not hooks/use-toast)
  - Implementation coupling documented as tech debt

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 3 (dashboardService.ts, page.tsx, API_CONTRACTS.md)
- Lines added: ~80
- Breaking changes: NO
- Schema changes: NO
- API contract changes: YES (behavior change for raffle)

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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed
- [ ] Git status acceptable
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - Enter Raffle button not yet implemented.

**Search for existing raffle button implementation:**
```bash
grep -n "Enter Raffle" app/home/page.tsx
grep -n "handleEnterRaffle" app/home/page.tsx
grep -n "raffle_available" app/home/page.tsx
```

**Expected:** No matches for "Enter Raffle" button or handler (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for "Enter Raffle": [result]
- [ ] Grep executed for "handleEnterRaffle": [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to integrate with.

**Search for related implementations:**
```bash
grep -n "isEntering" app/home/page.tsx
grep -n "toast" app/home/page.tsx
grep -n "fetchDashboardData\|fetchDashboard" app/home/page.tsx
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `hooks/use-toast.ts` | `toast()` function | Existing toast system | Reuse |
| `app/home/page.tsx` | Dashboard fetch logic | Existing fetch | Call after entry |

**Checklist:**
- [ ] Toast system exists: [YES/NO]
- [ ] Dashboard fetch function identified: [function name]
- [ ] Integration points clear

---

### Gate 4: Files to Modify Verification

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
```bash
ls -la /home/jorge/Loyalty/Rumi/API_CONTRACTS.md
```
**Expected:** File exists

**Checklist:**
- [ ] dashboardService.ts exists
- [ ] page.tsx exists
- [ ] API_CONTRACTS.md exists

---

### Gate 5: Schema Verification

> Not applicable - no database changes. Using existing `raffle_participations` table via existing API.

**Checklist:**
- [x] SKIPPED - no schema changes

---

### Gate 6: API Contract Verification

**Read API_CONTRACTS.md for raffle sections:**

**Endpoint 1:** `GET /api/dashboard` - featuredMission section
**Endpoint 2:** `GET /api/dashboard/featured-mission`

**Current contract for raffle progressPercentage:**
```bash
grep -A5 "progressPercentage" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -20
```

**Checklist:**
- [ ] Current progressPercentage behavior documented
- [ ] Plan to add raffle-specific note

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

### Step 1: Update Raffle progressPercentage to 100

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Show filled circle for raffle (no progress needed to participate)

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
Read dashboardService.ts lines 390-400
```

**Expected Current State:**
```typescript
const progressPercentage = isRaffle
  ? 0
  : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

**Edit Action:**

**OLD Code:**
```typescript
  const progressPercentage = isRaffle
    ? 0
    : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

**NEW Code:**
```typescript
  const progressPercentage = isRaffle
    ? 100  // Raffle requires no progress - user is already eligible to enter
    : Math.min(Math.round((currentProgress / targetValue) * 100), 100);
```

---

**Step 1 Checkpoint:**
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No type errors

---

### Step 2: Update Raffle Center Text

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Show prize name and "Enter to Win!" instead of "Chance to win"

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
Read dashboardService.ts lines 419-430
```

**Expected Current State:**
```typescript
  if (isRaffle) {
    // Raffle missions have no progress tracking
    currentFormatted = null;
    targetFormatted = null;
    targetText = 'Chance to win';

    // Format prize display
    const prizeDisplay = reward.valueData?.amount
      ? `$${reward.valueData.amount}`
      : reward.name ?? 'a prize';
    progressText = `Chance to win ${prizeDisplay}`;
```

---

**Edit Action:**

**OLD Code:**
```typescript
  if (isRaffle) {
    // Raffle missions have no progress tracking
    currentFormatted = null;
    targetFormatted = null;
    targetText = 'Chance to win';

    // Format prize display
    const prizeDisplay = reward.valueData?.amount
      ? `$${reward.valueData.amount}`
      : reward.name ?? 'a prize';
    progressText = `Chance to win ${prizeDisplay}`;
```

**NEW Code:**
```typescript
  if (isRaffle) {
    // For raffle, show prize name in center with "Enter to Win" prompt
    const prizeDisplay = reward.valueData?.amount
      ? `$${reward.valueData.amount}`
      : reward.name ?? 'a prize';
    currentFormatted = prizeDisplay;  // Prize name in large text
    targetFormatted = null;
    targetText = 'Enter to Win!';     // Clear call-to-action
    progressText = `Enter to win ${prizeDisplay}`;
```

---

**Step 2 Checkpoint:**
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No type errors

---

### Step 3: Add Imports to page.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
**Action Type:** ~~MODIFY~~ **SKIP**
**Purpose:** ~~Add Loader2, Gift icons and toast import~~

---

**⚠️ DISCOVERY FINDING: STEP SKIPPED**

**Verification (from discovery):**
```
Line 7:  import { ..., Loader2, Gift, ... } from "lucide-react"
Line 10: import { toast } from "sonner"
```

**All required imports already exist.** No changes needed.

---

**Step 3 Checkpoint:**
- [x] SKIPPED - Imports already present
- [x] Loader2 verified at line 7
- [x] Gift verified at line 7
- [x] toast verified at line 10 (from sonner)

---

### Step 4: Add isEnteringRaffle State Variable

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
**Action Type:** MODIFY
**Purpose:** Track loading state during raffle entry

---

**Pre-Action Reality Check:**

**Find existing useState declarations:**
```bash
grep -n "useState" app/home/page.tsx | head -10
```

---

**Edit Action:**

Add after other useState declarations:
```typescript
const [isEnteringRaffle, setIsEnteringRaffle] = useState(false);
```

---

**Step 4 Checkpoint:**
- [ ] State variable added
- [ ] No type errors

---

### Step 5: Add handleEnterRaffle Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
**Action Type:** MODIFY
**Purpose:** Handle raffle entry with toast and re-fetch

---

**Pre-Action Reality Check:**

**Find handleClaimReward function:**
```bash
grep -n "handleClaimReward" app/home/page.tsx
```
**Expected:** Line ~256

---

**Edit Action:**

Add after handleClaimReward function (after line ~270):

> **⚠️ ADJUSTED CODE** - Uses discovery findings:
> - `mockData` (not `dashboardData`)
> - `fetchDashboard()` (not `fetchDashboardData()`)
> - `toast.success()` / `toast.error()` (sonner API, not hooks/use-toast)

```typescript
const handleEnterRaffle = async () => {
  if (!mockData?.featuredMission.mission?.id) return;

  setIsEnteringRaffle(true);
  try {
    const response = await fetch(
      `/api/missions/${mockData.featuredMission.mission.id}/participate`,
      { method: 'POST' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        toast.success("You're in! Check Missions tab for updates");
        await fetchDashboard();
      }
    } else {
      const error = await response.json();
      toast.error(error.message || "Entry failed. Please try again");
    }
  } catch (error) {
    console.error('Raffle entry error:', error);
    toast.error("Something went wrong. Please try again");
  } finally {
    setIsEnteringRaffle(false);
  }
};
```

---

**Step 5 Checkpoint:**
- [ ] Function added after handleClaimReward
- [x] Uses `mockData` (verified: page uses mockData alias)
- [x] Uses `fetchDashboard()` (verified: line 80)
- [x] Uses sonner toast API (verified: line 10)
- [ ] No type errors

---

### Step 6: Update Button Rendering Logic

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
**Action Type:** MODIFY
**Purpose:** Show Enter Raffle button when status is raffle_available

---

**Pre-Action Reality Check:**

**Find current button logic:**
```bash
grep -n "status.*completed" app/home/page.tsx
```

---

**Edit Action:**

Update the button conditional to add raffle_available case:

> **⚠️ ADJUSTED CODE** - Uses `mockData` (not `dashboardData`)

```typescript
{mockData.featuredMission.status === "completed" ? (
  <Button
    onClick={handleClaimReward}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
  >
    {getIconForBenefitType(mockData.featuredMission.mission?.rewardType || "gift_card")}
    {mockData.featuredMission.mission?.rewardDisplayText}
  </Button>
) : mockData.featuredMission.status === "raffle_available" ? (
  <Button
    onClick={handleEnterRaffle}
    disabled={isEnteringRaffle}
    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
  >
    {isEnteringRaffle ? (
      <Loader2 className="h-5 w-5 animate-spin" />
    ) : (
      <Gift className="h-5 w-5" />
    )}
    {isEnteringRaffle ? 'Entering...' : 'Enter Raffle'}
  </Button>
) : (
  <p className="text-base text-slate-900 font-semibold">
    Next:{" "}
    <span className="text-slate-600 font-semibold">
      {mockData.featuredMission.mission?.rewardDisplayText}
    </span>
  </p>
)}
```

---

**Step 6 Checkpoint:**
- [ ] Button logic updated
- [ ] Raffle_available case added
- [ ] No type errors

---

### Step 7: Update API_CONTRACTS.md

**Target File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
**Action Type:** MODIFY
**Purpose:** Document raffle progressPercentage=100 behavior

---

**Edit Action:**

Find the featuredMission response section and add note about raffle:

```markdown
**Raffle Mission Behavior:**
- `progressPercentage`: 100 (user eligible to enter, no progress needed)
- `currentFormatted`: Prize name (e.g., "iPhone 15 Pro")
- `targetText`: "Enter to Win!"
```

---

**Step 7 Checkpoint:**
- [ ] Documentation updated for /api/dashboard
- [ ] Documentation updated for /api/dashboard/featured-mission

---

## Integration Verification

### Import Verification

**File:** `app/home/page.tsx`

**⚠️ DISCOVERY FINDING: No new imports needed**

Existing imports (already present):
```typescript
// Line 7: Loader2, Gift already in lucide-react import
import { ..., Loader2, Gift, ... } from "lucide-react"
// Line 10: toast already imported from sonner
import { toast } from "sonner"
```

**Verification:**
```bash
npx tsc --noEmit app/home/page.tsx 2>&1 | head -20
```
**Expected:** No import errors

---

### Call Site Verification

**handleEnterRaffle calls:**
- `fetch()` - standard API
- `toast.success()` / `toast.error()` - from sonner (line 10)
- `fetchDashboard()` - existing function in page.tsx (line 80)
- `mockData` - existing aliased state variable (line 169)

**Verification:**
- [ ] All function calls resolve
- [ ] No undefined references
- [x] Variable names match existing code

---

### Test Mock Guidance

> ⚠️ **Gap.md Section 14 tests use `@/hooks/use-toast` mocks, but actual code uses `sonner`.**
> When writing tests, use this mock pattern instead:

```typescript
// CORRECT: Mock sonner (what the code actually uses)
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockToastSuccess = jest.mocked(toast.success);
const mockToastError = jest.mocked(toast.error);

// In test assertions:
expect(mockToastSuccess).toHaveBeenCalledWith("You're in! Check Missions tab for updates");
```

```typescript
// INCORRECT: Do NOT use this (Gap.md pattern doesn't match actual code)
// jest.mock('@/hooks/use-toast', () => ({ ... }));
```

---

**INTEGRATION STATUS:** [ ] ALL CHECKS PASSED

---

## Security Verification

### Multi-Tenant Security Check

**The raffle participation uses existing API:**
- `POST /api/missions/:id/participate` - already enforces client_id

**No new database queries added in this implementation.**

**Checklist:**
- [x] Using existing API (already secured)
- [x] No new database queries
- [x] No cross-tenant exposure

---

**SECURITY STATUS:** [x] ALL CHECKS PASSED (no new security surface)

---

## Feature Verification (ALL MUST PASS)

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: Raffle progressPercentage is 100
**Test:** Check dashboardService.ts raffle code
```bash
grep -A2 "isRaffle" lib/services/dashboardService.ts | grep "100"
```
**Expected:** Line with `? 100`
**Status:** [ ] PASS / FAIL

#### Criterion 2: Raffle center text shows prize name + "Enter to Win!"
**Test:** Check dashboardService.ts raffle formatting
```bash
grep "Enter to Win" lib/services/dashboardService.ts
```
**Expected:** Match found
**Status:** [ ] PASS / FAIL

#### Criterion 3: "Enter Raffle" button visible
**Test:** Check page.tsx for button
```bash
grep "Enter Raffle" app/home/page.tsx
```
**Expected:** Match found
**Status:** [ ] PASS / FAIL

#### Criterion 4: Button shows loading state
**Test:** Check for Entering... text
```bash
grep "Entering" app/home/page.tsx
```
**Expected:** Match found
**Status:** [ ] PASS / FAIL

#### Criterion 5: Dashboard re-fetches after entry
**Test:** Check handler calls fetchDashboardData
```bash
grep -A20 "handleEnterRaffle" app/home/page.tsx | grep "fetchDashboard"
```
**Expected:** Match found
**Status:** [ ] PASS / FAIL

---

### Verification 4: Manual Test

**Steps:**
1. Login as `testgold@test.com` (sees iPhone raffle)
2. Verify progress circle is 100% filled
3. Verify "Enter Raffle" button visible (purple)
4. Click button - verify loading spinner
5. Verify toast: "You're in!"
6. Verify next mission appears (raffle gone)

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED / FAILED

---

## Audit Trail

### Implementation Summary

**Date:** 2025-12-16
**Executor:** Claude Opus 4.5
**Specification Source:** RaffleEntryButtonGap.md v1.4
**Gap ID:** GAP-RAFFLE-ENTRY-001

---

### Files Modified

1. `lib/services/dashboardService.ts` - MODIFY - ~10 lines - Backend raffle formatting
2. `app/home/page.tsx` - MODIFY - ~50 lines - Frontend button and handler
3. `API_CONTRACTS.md` - MODIFY - ~10 lines - Documentation

**Total:** 3 files, ~70 lines added

---

### Decision Trail

**Step 1: Analysis Phase**
- StandardGapFix.md applied
- Created: RaffleEntryButtonGap.md v1.4
- 4 audit rounds completed

**Step 2: Audit Feedback**
- Toast + re-fetch UX chosen
- Complete test mocks specified
- Both API endpoints documented

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md applied
- This document created
- Ready for execution

---

## Document Status

**Implementation Date:** 2025-12-16
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Related code identified

**Implementation:**
- [ ] Step 1: progressPercentage = 100
- [ ] Step 2: Center text updated
- [x] Step 3: ~~Imports added~~ SKIPPED (already imported)
- [ ] Step 4: State variable added
- [ ] Step 5: Handler function added (uses mockData, fetchDashboard, sonner toast)
- [ ] Step 6: Button logic updated (uses mockData)
- [ ] Step 7: API_CONTRACTS.md updated

**Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] All acceptance criteria met
- [ ] Manual verification completed

---

### Final Status

**Implementation Result:** [ ] SUCCESS / FAILED

---

### Git Commit Message Template

```
feat: Add Enter Raffle button to home page

Implements GAP-RAFFLE-ENTRY-001: Raffle entry button feature
- Backend: progressPercentage=100 for raffle, updated center text
- Frontend: Enter Raffle button with toast + re-fetch UX
- Docs: Updated API_CONTRACTS.md for raffle behavior

Modified files:
- lib/services/dashboardService.ts: Raffle formatting changes
- app/home/page.tsx: Button, handler, state
- API_CONTRACTS.md: Raffle behavior documentation

References:
- RaffleEntryButtonGap.md v1.4
- RaffleEntryButtonGapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

**Document Version:** 1.2
**Created:** 2025-12-16
**Last Updated:** 2025-12-16
**Status:** Ready for Execution

### Revision History
- **v1.2 (2025-12-16):** Post-audit coupling documentation
  - Added "Implementation Coupling (Known Tech Debt)" section
  - Documents explicit decision to use existing `mockData` alias (no rename)
  - Added "Test Mock Guidance" section with correct sonner mock pattern
  - Clarifies Gap.md tests use wrong toast mock (`@/hooks/use-toast` vs `sonner`)
- **v1.1 (2025-12-16):** Pre-execution audit adjustments
  - Added Discovery Adjustments table documenting 5 deviations from original Gap.md
  - Step 3 (imports) marked as SKIPPED - Loader2, Gift, toast already imported
  - Step 5 (handler) updated to use `mockData`, `fetchDashboard()`, sonner toast API
  - Step 6 (button) updated to use `mockData` instead of `dashboardData`
  - Integration Verification updated to reflect existing imports
- **v1.0 (2025-12-16):** Initial implementation plan created
