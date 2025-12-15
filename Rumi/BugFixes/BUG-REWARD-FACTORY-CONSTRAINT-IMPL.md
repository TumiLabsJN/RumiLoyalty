# BUG-REWARD-FACTORY-CONSTRAINT - Implementation Plan

**Decision Source:** BUG-REWARD-FACTORY-CONSTRAINT.md
**Bug ID:** BUG-REWARD-FACTORY-CONSTRAINT
**Severity:** High (blocks 25 Phase 8 tests)
**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From BUG-REWARD-FACTORY-CONSTRAINT.md:**

**Bug Summary:** Database defaults (`redemption_frequency='unlimited'`, `redemption_quantity=1`) violate CHECK constraint `check_quantity_with_frequency` which requires `redemption_quantity=NULL` when frequency is 'unlimited'.

**Root Cause:** Column defaults conflict - 'unlimited' + 1 is invalid per constraint.

**Files Affected:**
- `supabase/migrations/[timestamp]_fix_reward_quantity_default.sql` (CREATE)
- `appcode/tests/helpers/factories.ts` (MODIFY)
- `appcode/tests/integration/cron/daily-automation-metrics.test.ts` (MODIFY)
- `appcode/lib/types/database.ts` (REGENERATE)

**Chosen Solution (Option B from audit):**
> Fix schema defaults + test code: Change `redemption_quantity` DEFAULT to NULL AND update test code to be explicit.

**Why This Solution:**
- Fixes root cause at schema level
- Future-proofs admin/seed paths
- Test code becomes explicit (belt-and-suspenders)
- No production code changes needed (only SELECT queries exist)

**From Audit Feedback (2025-12-15):**
- Recommendation: APPROVE WITH CHANGES
- Changes Incorporated:
  1. ✅ Added migration to fix schema defaults
  2. ✅ Verified no production INSERT paths exist
  3. ✅ Added Gate to verify current column defaults

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 4 (1 CREATE, 2 MODIFY, 1 REGENERATE)
- Tests fixed: 25 (was failing, will pass)
- Breaking changes: NO
- Schema changes: YES (ALTER DEFAULT)

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
**Expected:** `/home/jorge/Loyalty/Rumi`

**Git Status:**
```bash
git status --short
```
**Expected:** Shows bug fix docs as untracked

**Supabase Running:**
```bash
npx supabase status 2>&1 | head -5
```
**Expected:** Supabase local instance running

**Checklist:**
- [ ] Directory confirmed
- [ ] Git status acceptable
- [ ] Supabase running

---

### Gate 2: Current Schema Default Verification

**Verify current column default:**
```bash
grep -n "redemption_quantity" /home/jorge/Loyalty/Rumi/supabase/migrations/20251128173733_initial_schema.sql
```
**Expected:** Shows `redemption_quantity INTEGER DEFAULT 1`

**Checklist:**
- [ ] Current default is `1` (to be changed to NULL)

---

### Gate 3: Source Files Verification

**Factory file exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts
```
**Expected:** File exists

**Test file exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts
```
**Expected:** File exists

**Checklist:**
- [ ] factories.ts exists
- [ ] daily-automation-metrics.test.ts exists

---

### Gate 4: Current Test State (Baseline)

**Run tests to confirm failures:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/ 2>&1 | grep -E "Tests:.*failed"
```
**Expected:** Shows ~25 failures

**Checklist:**
- [ ] Baseline failures confirmed (~25)

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. **IMPORTANT:** Part 1 (migration) MUST complete before Part 2 (test code)

---

## Part 1: Schema Migration

### Step 1: Create Migration File

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_fix_reward_quantity_default.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Generate timestamp:**
```bash
date +%Y%m%d%H%M%S
```

**Verify no conflicting migration:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/*reward_quantity* 2>/dev/null || echo "No existing migration"
```
**Expected:** "No existing migration"

---

#### Create Action

**New File Content:**
```sql
-- ============================================================================
-- Fix redemption_quantity Default Value
-- ============================================================================
-- Bug: BUG-REWARD-FACTORY-CONSTRAINT
-- Issue: Default 'unlimited' + default 1 violates check_quantity_with_frequency
--
-- The CHECK constraint requires:
--   (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
--   (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND <= 10)
--
-- Current defaults: 'unlimited' + 1 → INVALID
-- Fixed defaults: 'unlimited' + NULL → VALID
--
-- References:
--   - BugFixes/BUG-REWARD-FACTORY-CONSTRAINT.md
--   - SchemaFinalv2.md lines 478-479, 557-560
-- ============================================================================

ALTER TABLE rewards
ALTER COLUMN redemption_quantity SET DEFAULT NULL;

COMMENT ON COLUMN rewards.redemption_quantity IS
  'Number of redemptions allowed per period. NULL for unlimited frequency, 1-10 for limited frequencies.';
```

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_reward_quantity_default.sql
```

**Verify content:**
```bash
cat /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_reward_quantity_default.sql
```

**Checkpoint:**
- [ ] File created
- [ ] Content correct

---

### Step 2: Apply Migration

**Target:** Local Supabase database
**Action Type:** DATABASE MIGRATION

---

#### Migration Action

```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db reset 2>&1
```
**Expected:** All migrations applied including new one

---

#### Post-Action Verification

**Verify migration listed:**
```bash
npx supabase migration list 2>/dev/null | tail -5
```
**Expected:** New migration shows

**Checkpoint:**
- [ ] Migration applied without errors

---

### Step 3: Regenerate TypeScript Types

**Target:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts`
**Action Type:** REGENERATE

---

#### Regenerate Action

```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --local 2>/dev/null > lib/types/database.ts
```

---

#### Post-Action Verification

**Verify file updated:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** Recent timestamp

**Verify types valid:**
```bash
head -5 /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** Starts with `export type Json =`

**Checkpoint:**
- [ ] Types regenerated
- [ ] File starts with valid TypeScript

---

## Part 2: Test Code Fixes

### Step 4: Update createTestReward Factory

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts`
**Target Lines:** 238-246
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read current state:**
```bash
sed -n '238,246p' /home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts
```

**Expected Current State:**
```typescript
  const defaultData: RewardInsert = {
    id,
    client_id: overrides.client_id,
    type: overrides.type || 'gift_card',
    value_data: overrides.value_data || { amount: 50 },
    tier_eligibility: overrides.tier_eligibility || 'all',
    redemption_type: overrides.redemption_type || 'instant',
    enabled: overrides.enabled ?? true,
  };
```

---

#### Edit Action

**OLD Code:**
```typescript
  const defaultData: RewardInsert = {
    id,
    client_id: overrides.client_id,
    type: overrides.type || 'gift_card',
    value_data: overrides.value_data || { amount: 50 },
    tier_eligibility: overrides.tier_eligibility || 'all',
    redemption_type: overrides.redemption_type || 'instant',
    enabled: overrides.enabled ?? true,
  };
```

**NEW Code:**
```typescript
  const defaultData: RewardInsert = {
    id,
    client_id: overrides.client_id,
    type: overrides.type || 'gift_card',
    value_data: overrides.value_data || { amount: 50 },
    tier_eligibility: overrides.tier_eligibility || 'all',
    redemption_type: overrides.redemption_type || 'instant',
    redemption_frequency: overrides.redemption_frequency || 'unlimited',
    redemption_quantity: overrides.redemption_frequency && overrides.redemption_frequency !== 'unlimited' ? (overrides.redemption_quantity || 1) : null,
    enabled: overrides.enabled ?? true,
  };
```

---

#### Post-Action Verification

**Read modified state:**
```bash
sed -n '238,248p' /home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts
```

**Checkpoint:**
- [ ] `redemption_frequency` line added
- [ ] `redemption_quantity` line added with conditional logic

---

### Step 5: Update Direct Inserts in daily-automation-metrics.test.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`
**Action Type:** MODIFY (5 locations)

---

#### Location 1: Lines ~751-762 (Test Case 6)

**Find exact location:**
```bash
grep -n "type: 'gift_card'" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts | head -5
```

**Add to each insert:**
```typescript
redemption_frequency: 'unlimited',
redemption_quantity: null,
```

**Edit each of the 5 inserts** to include these two fields.

---

#### Post-Action Verification

**Count inserts now have redemption_frequency:**
```bash
grep -c "redemption_frequency: 'unlimited'" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts
```
**Expected:** 5

**Checkpoint:**
- [ ] All 5 direct inserts updated

---

## Security Verification

**This fix does not add or modify any queries.**

**Security Checklist:**
- [x] No new queries added
- [x] No production code modified
- [x] Test code only + schema default change

**SECURITY STATUS:** ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

---

### Verification 1: Type Check

```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i error | wc -l
```
**Expected:** 0 errors
**Actual:** [document]

---

### Verification 2: Run Full Phase 8 Tests

```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/ 2>&1 | tail -20
```
**Expected:** 87 tests, 0 failures
**Actual:** [document]

---

### Verification 3: Git Diff Sanity Check

```bash
cd /home/jorge/Loyalty/Rumi && git status --short
```

**Expected Changes:**
- `supabase/migrations/[timestamp]_fix_reward_quantity_default.sql` - NEW
- `appcode/tests/helpers/factories.ts` - MODIFIED
- `appcode/tests/integration/cron/daily-automation-metrics.test.ts` - MODIFIED
- `appcode/lib/types/database.ts` - MODIFIED (regenerated)
- Bug fix docs - NEW

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

---

## Audit Trail

### Implementation Summary

**Date:** 2025-12-15
**Executor:** Claude Opus 4.5
**Decision Source:** BUG-REWARD-FACTORY-CONSTRAINT.md
**Bug ID:** BUG-REWARD-FACTORY-CONSTRAINT

### Execution Log

```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Schema Default - [PASS/FAIL]
[Timestamp] Gate 3: Files Exist - [PASS/FAIL]
[Timestamp] Gate 4: Baseline Failures - [PASS/FAIL]

[Timestamp] Step 1: Create migration - [PASS/FAIL]
[Timestamp] Step 2: Apply migration - [PASS/FAIL]
[Timestamp] Step 3: Regenerate types - [PASS/FAIL]
[Timestamp] Step 4: Update factory - [PASS/FAIL]
[Timestamp] Step 5: Update test inserts - [PASS/FAIL]

[Timestamp] Final: Type check - [PASS/FAIL]
[Timestamp] Final: Tests 87/87 - [PASS/FAIL]
```

### Files Modified

1. `supabase/migrations/[timestamp]_fix_reward_quantity_default.sql` - CREATE - Schema default fix
2. `appcode/tests/helpers/factories.ts` - MODIFY - Add redemption_frequency/quantity
3. `appcode/tests/integration/cron/daily-automation-metrics.test.ts` - MODIFY - 5 direct inserts
4. `appcode/lib/types/database.ts` - REGENERATE

### Bug Resolution

**Before:** 25 tests failing with `check_quantity_with_frequency` constraint violation
**After:** 87 tests passing

---

## Document Status

**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

### Next Actions

**If implementation succeeded:**
1. [ ] Update Phase8TestBugs.md - mark Bug 1 complete
2. [ ] Update BUG-REWARD-FACTORY-CONSTRAINT.md status to "Implemented"
3. [ ] Check if Bug 2 still exists (ambiguous column)

**Git Commit Message Template:**
```
fix: Fix reward quantity default and test factories

Resolves BUG-REWARD-FACTORY-CONSTRAINT: Database defaults violated
check_quantity_with_frequency constraint.

Changes:
- supabase/migrations: Set redemption_quantity DEFAULT NULL
- tests/helpers/factories.ts: Add redemption_frequency/quantity defaults
- tests/integration/cron: Fix 5 direct reward inserts

25 Phase 8 tests now pass that were failing.

References:
- BugFixes/BUG-REWARD-FACTORY-CONSTRAINT.md
- BugFixes/BUG-REWARD-FACTORY-CONSTRAINT-IMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Ready for Execution
