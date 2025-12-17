# Discount Duration Display - Implementation Plan

**Decision Source:** DiscountDurationDisplayFix.md
**Bug ID:** BUG-DISCOUNT-DURATION-001
**Severity:** Medium
**Implementation Date:** 2025-12-16
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From DiscountDurationDisplayFix.md:**

**Bug Summary:** The Home page displays discount rewards with "30 Days" duration regardless of the actual `duration_minutes` value stored in the database.

**Root Cause:** The `generateRewardDisplayText` function in dashboardService.ts references `duration_days` (used by commission_boost) instead of `duration_minutes` (used by discount) when generating the display string for discount rewards.

**Files Affected:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`

**Chosen Solution:**
```typescript
case 'discount': {
  const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
  const durationDays = Math.floor(durationMinutes / 1440);
  return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
}
```

**Why This Solution:**
- Minimal change (3 lines added, 1 line replaced)
- Matches pattern used in rewardService.ts and missionService.ts
- Localized fix with clear intent
- Default fallback (1440 = 1 day) matches other services
- Schema constraint ensures `duration_minutes` must exist for valid discounts

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: None
- Concerns Addressed:
  - Default fallback: 1 day (1440 minutes) confirmed as intentional - matches other services
  - Testability: Switched to integration test via /api/dashboard (function is private)
  - Duplication: Tech debt note added for future refactor

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1
- Lines changed: ~4 (1 removed, 4 added)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO (displayText value corrected, not structure)

**Known UX Debt (Intentional - Out of Scope):**
- **Pluralization:** The fix outputs "X Days" regardless of count (e.g., "1 Days" instead of "1 Day")
- **Rationale:** Matches existing pattern in `rewardService.ts` and `missionService.ts` which both use plural "days" unconditionally
- **Decision:** Fixing singular/plural grammar is out of scope for this bug fix - would require changes across 3 services
- **Future:** Can be addressed in a separate UX polish pass that unifies all duration display logic

**Tech Debt (Acknowledged):**
- **Duplication:** The `duration_minutes / 1440` conversion logic is now duplicated in 3 services:
  - `rewardService.ts` (getRewardDescription)
  - `missionService.ts` (generateMissionRewardText)
  - `dashboardService.ts` (generateRewardDisplayText) - after this fix
- **Future:** Extract to shared utility function (e.g., `convertMinutesToDays()` in `transformers.ts`)

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi` or `/home/jorge/Loyalty/Rumi/appcode`

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

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** File exists

**Checklist:**
- [ ] All source files exist: 1
- [ ] All files readable
- [ ] File paths match Fix.md

---

### Gate 3: Current Code State Verification

**Read current state of code to be modified:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 188-196
```

**Expected Current State:**
```typescript
    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Boost`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;
```

**Checklist:**
- [ ] Current code matches Fix.md Section 6: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**
```bash
grep -A 10 "// discount" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md
```

**Tables involved:** rewards

**Column verification:**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| duration_minutes | value_data->>'duration_minutes' | ✅ |
| percent | value_data->>'percent' | ✅ |

**Schema Confirmation (from SchemaFinalv2.md lines 498-504):**
```json
// discount (displayText auto-generated by backend)
{
  "percent": 10,
  "duration_minutes": 1440,
  "max_uses": 100,
  "coupon_code": "GOLD10"
}
```

**Constraint (from SchemaFinalv2.md lines 567-575):**
```sql
CONSTRAINT check_discount_value_data CHECK (
  type != 'discount' OR (
    value_data->>'duration_minutes' IS NOT NULL AND
    (value_data->>'duration_minutes')::integer BETWEEN 10 AND 525600
  )
)
```

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible (integer)
- [ ] Nullable handling correct (NOT NULL per constraint)
- [ ] Field name confirmed: `duration_minutes` (NOT `duration_days`)

---

### Gate 5: API Contract Verification

**Endpoint:** GET /api/dashboard

**Read API_CONTRACTS.md for relevant section:**
```bash
grep -A 20 "currentTierRewards" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -30
```

**Response field verification:**
| Field in Code | Field in Contract | Match? |
|---------------|-------------------|--------|
| displayText | currentTierRewards[].displayText | ✅ |
| type | currentTierRewards[].type | ✅ |

**Note:** The `displayText` value is changing (30 Days → actual days), but the structure and type remain the same. This is a bug fix, not a breaking change.

**Checklist:**
- [ ] All field names match contract
- [ ] Data types match (string)
- [ ] Response structure matches
- [ ] No breaking changes

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Update discount case in generateRewardDisplayText

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Target Lines:** 191-192
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 188-196
```

**Expected Current State (EXACT CODE):**
```typescript
    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Boost`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate (not drifted)

**If current state doesn't match:** STOP. Do not proceed with edit. Report actual state vs expected.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;
```

**NEW Code (replacement):**
```typescript
    case 'discount': {
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
    }
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
Old String:     case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;
New String:     case 'discount': {
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
    }
```

**Change Summary:**
- Lines removed: 2
- Lines added: 5
- Net change: +3 lines

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 188-199
```

**Expected New State (EXACT CODE):**
```typescript
    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Boost`;

    case 'discount': {
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
    }

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**Type Check (TypeScript):**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts 2>&1 | head -20
```
**Expected:** No new type errors

**No New Errors Introduced:**
- [ ] File compiles without new errors
- [ ] Existing functionality preserved

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PENDING - Not yet executed]
**If FAIL:** [Exact failure point and actual state]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This bug fix does NOT modify any database queries.**

The `generateRewardDisplayText` function is a pure transformation function that:
- Receives reward data already filtered by client_id (upstream)
- Performs string formatting only
- Does not execute any database queries

**Security Checklist:**
- [x] No database queries in modified code
- [x] No raw SQL introduced
- [x] No cross-tenant data exposure possible

---

### Authentication Check

**Route:** `/api/dashboard`

The route authentication is unchanged. This fix only modifies the display text formatting.

**Checklist:**
- [x] Auth middleware already applied (not modified)
- [x] User verified before data access (not modified)
- [x] Tenant isolation enforced (not modified)

---

**SECURITY STATUS:** ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**For Business Logic Bug - Manual Test:**

1. Ensure Bronze tier discount has `duration_minutes: 5760` (4 days) in Supabase
2. Login as testbronze user
3. Navigate to Home page
4. Verify discount reward shows "+5% Deal Boost for 4 Days"

**Expected:** Display shows "4 Days" (not "30 Days")
**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed

---

### Verification 2: No New Errors Introduced

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** Same or fewer errors than before
**Actual:** [count]

**Status:**
- [ ] No new type errors introduced

---

### Verification 3: Modified Files Compile/Work

**For modified file:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts 2>&1
```
**Expected:** No errors on modified file
**Actual:** [document output]

**Status:**
- [ ] All modified files compile

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [x] Column name `duration_minutes` matches SchemaFinalv2.md (lines 498-504)
- [x] Data type integer correct
- [x] NOT NULL constraint exists (lines 567-575)

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [x] Response structure unchanged (displayText is string)
- [x] No breaking changes to existing consumers
- [x] Value changes from incorrect (30) to correct (actual days)

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
git diff /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```

**Expected Changes:**
- dashboardService.ts: ~5 lines changed - discount case updated to use duration_minutes

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

### Verification 7: Runtime Test

**Test Command:**
```bash
npm run dev
# Then manually test: Login as testbronze → Navigate to Home → Check discount display
```

**Expected:** Discount shows actual duration (e.g., "4 Days" for 5760 minutes)
**Actual:** [actual behavior]

**Status:**
- [ ] Runtime test passed

---

**FINAL VERIFICATION STATUS:** [PENDING - Not yet executed]

**After Execution - If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**After Execution - If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-16
**Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Decision Source:** DiscountDurationDisplayFix.md
**Implementation Doc:** DiscountDurationDisplayFixIMPL.md
**Bug ID:** BUG-DISCOUNT-DURATION-001

---

### Execution Log

> **STATUS: PENDING - Implementation not yet executed**

**Pre-Implementation:**
```
[PENDING] Gate 1: Environment - [NOT RUN]
[PENDING] Gate 2: Files - [NOT RUN]
[PENDING] Gate 3: Code State - [NOT RUN]
[PENDING] Gate 4: Schema - [NOT RUN]
[PENDING] Gate 5: API Contract - [NOT RUN]
```

**Implementation Steps:**
```
[PENDING] Step 1: Update discount case - [NOT RUN]
```

**Security Verification:**
```
[PRE-VERIFIED] Multi-tenant check - N/A (no queries modified - static analysis)
[PRE-VERIFIED] Auth check - N/A (no auth modified - static analysis)
```

**Final Verification:**
```
[PENDING] Bug-specific validation - [NOT RUN]
[PENDING] No new errors - [NOT RUN]
[PENDING] Files compile - [NOT RUN]
[PENDING] Schema alignment - [NOT RUN]
[PENDING] API contract - [NOT RUN]
[PENDING] Git diff sanity - [NOT RUN]
[PENDING] Runtime test - [NOT RUN]
[PENDING] Overall: NOT YET DETERMINED
```

---

### Files To Be Modified

**Planned Changes:**
1. `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts` - Lines 191-192 → 191-195 - MODIFY - Update discount case to use duration_minutes

**Expected Total:** 1 file modified, ~5 lines changed (net +3)

---

### Bug Resolution

**Before Implementation:**
- Bug: Discount rewards display "30 Days" regardless of actual duration_minutes value
- Root cause: Code referenced non-existent `duration_days` field, falling back to 30

**After Implementation (Expected):**
- Bug: [PENDING VERIFICATION]
- Expected: Discount with duration_minutes=5760 displays "4 Days"

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: DiscountDurationDisplayFix.md
- Documented 19 sections
- Proposed solution: Convert duration_minutes to days in generateRewardDisplayText

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed:
  - Default fallback (1 day) confirmed as intentional
  - Testing strategy updated to integration tests
  - Tech debt note added for duplication

**Step 3: Implementation Phase** (CURRENT)
- StandardBugFixIMPL.md template applied
- Created: DiscountDurationDisplayFixIMPL.md
- Implementation steps: PENDING EXECUTION
- Verifications: NOT YET RUN

**Step 4: Current Status**
- Implementation: PENDING
- Bug resolved: NOT YET VERIFIED
- Ready for commit: NO (awaiting execution)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files changed
git diff --stat
# Should show: appcode/lib/services/dashboardService.ts | 5 +++--

# 2. Verify no type errors on modified files
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts 2>&1
# Should show: no errors

# 3. Verify git diff content
git diff /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
# Should show: discount case changed from duration_days to duration_minutes conversion

# 4. Verify schema alignment
grep -A 5 "// discount" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md
# Should show: duration_minutes field in discount value_data
```

**Expected Results (After Execution):**
- Files modified: dashboardService.ts [PENDING]
- No new errors [PENDING]
- Git diff matches plan [PENDING]
- Schema aligned (duration_minutes) [PRE-VERIFIED]

**Audit Status:** [PENDING - Implementation not yet executed]
**If issues:** [List discrepancies]

---

### Metrics

> **Note:** Metrics will be populated after implementation execution.

**Implementation Efficiency:**
- Gates passed: [PENDING]/5
- Steps completed: [PENDING]/1
- Verifications passed: [PENDING]/7
- Errors encountered: [PENDING]
- Retries needed: [PENDING]

**Code Quality (Expected):**
- Files to modify: 1
- Lines to change: ~5 (net +3)
- Breaking changes: 0 (expected)
- Security verified: YES (static analysis - no queries modified)
- Tests: Integration test via /api/dashboard (manual - after execution)

---

## Document Status

**Plan Created:** 2025-12-16
**Implementation Date:** [PENDING]
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.1
**Document Status:** READY FOR EXECUTION

---

### Completion Checklist

> **STATUS: AWAITING EXECUTION**

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [x] Multi-tenant isolation verified (no queries modified - static analysis)
- [x] Auth requirements met (no auth modified - static analysis)

**Verification:**
- [ ] Bug-specific validation passed
- [ ] No new errors
- [ ] Files compile
- [ ] Git diff reviewed

**Documentation:**
- [x] Audit trail template complete
- [ ] Execution log populated (after execution)
- [ ] Metrics documented (after execution)

---

### Final Status

**Implementation Result:** [PENDING - NOT YET EXECUTED]

**After Successful Execution:**
- Bug resolved: [TO BE VERIFIED]
- Ready for: Git commit
- Next: Update DiscountDurationDisplayFix.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update DiscountDurationDisplayFix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Manual test on Home page

**Git Commit Message Template:**
```
fix: correct discount duration display on home page

Resolves BUG-DISCOUNT-DURATION-001: Discount rewards showed "30 Days"
instead of actual duration from database.

Changes:
- dashboardService.ts: Convert duration_minutes to days for discount type

Root cause: Code referenced non-existent duration_days field (used by
commission_boost) instead of duration_minutes (used by discount).

References:
- BugFixes/DiscountDurationDisplayFix.md
- BugFixes/DiscountDurationDisplayFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

> **Note:** This checklist is to be completed AFTER implementation execution, not during plan creation.

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Read SchemaFinalv2.md for database queries
- [ ] Read API_CONTRACTS.md for API changes

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (if any)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (no queries modified)
- [ ] Verified auth requirements (no auth modified)
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

### Code Quality
- [ ] No "... rest of code ..." placeholders used
- [ ] No "around line X" approximations used
- [ ] No "should work" assumptions made
- [ ] No "probably" or "likely" hedging used

---

**META-VERIFICATION STATUS:** [TO BE COMPLETED AFTER EXECUTION]

**If any check failed:** This document is NOT complete. Go back and fix.

**RED FLAGS you exhibited (if any):**
- [ ] None
- [ ] Used placeholder code
- [ ] Approximated line numbers
- [ ] Skipped verification
- [ ] Re-analyzed decision
- [ ] Assumed without verifying
- [ ] Skipped security check
- [ ] Other: [describe]

**If RED FLAGS exist:** Document is unreliable. Restart with strict adherence to protocol.

---

**Document Version:** 1.1
**Last Updated:** 2025-12-16
**Author:** Claude Opus 4.5
**Status:** READY FOR EXECUTION (Plan complete, implementation pending)
