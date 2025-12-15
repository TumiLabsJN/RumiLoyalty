# BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS - Implementation Plan

**Decision Source:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
**Bug ID:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS
**Severity:** High
**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md:**

**Bug Summary:** The `update_precomputed_fields` RPC function overwrites `total_sales` and `total_units` with only video aggregations, erasing manual adjustments applied by `apply_pending_sales_adjustments`.

**Root Cause:** The function sets `total_sales = SUM(videos.gmv)` which overwrites any value previously set, instead of preserving the manual adjustment component stored in `manual_adjustments_total`.

**Files Affected:**
- `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql` (original with bug)
- `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql` (new fix migration)

**Chosen Solution:**
Modify lines 41-42 of `update_precomputed_fields` to include manual adjustments:

```sql
-- Before:
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),

-- After:
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_units, 0),
```

**Why This Solution:**
- Minimal change (2 lines modified)
- Matches documented design ("total_sales includes adjustments")
- Matches Loyalty.md pattern for checkpoint calculations
- Preserves existing call sequence
- No breaking changes to function signature

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Updated source document paths to include full relative paths
- Concerns Addressed: Added note that `db reset` is acceptable for non-production environment

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1 (new migration file)
- Lines changed: ~115 (complete function replacement)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

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
**Expected:** `/home/jorge/Loyalty/Rumi` (project root - required for Supabase migration commands)

**Note:** This bug fix involves database migrations, which must run from the project root where `supabase/` directory exists.

**Supabase Status:**
```bash
npx supabase status 2>&1 | head -5
```
**Expected:** Supabase local development running

**Environment Note:** This is a **non-production/local development environment**. Database reset is acceptable because there is no production data to preserve. For production environments, use `npx supabase migration up` instead of `db reset`.

**Checklist:**
- [ ] Directory confirmed: [actual path] (must be `/home/jorge/Loyalty/Rumi`)
- [ ] Supabase running: [actual status]
- [ ] Environment is non-production (safe for db reset)
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**Original Migration (reference only - not modified):**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251211163010_add_phase8_rpc_functions.sql
```
**Expected:** File exists (224 lines)

**Migrations Directory:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | tail -5
```
**Expected:** Directory exists, can create new migration

**Checklist:**
- [ ] Original migration exists
- [ ] Migrations directory accessible
- [ ] Can create new migration file

---

### Gate 3: Current Code State Verification

**Read current state of function to be fixed:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251211163010_add_phase8_rpc_functions.sql lines 38-52
```

**Expected Current State (Lines 38-52):**
```sql
  -- Update aggregation fields (both modes update engagement fields)
  UPDATE users u
  SET
    total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
    total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
    checkpoint_sales_current = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_units_current = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_videos_posted = COALESCE((SELECT COUNT(*) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_views = COALESCE((SELECT SUM(views) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_likes = COALESCE((SELECT SUM(likes) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_comments = COALESCE((SELECT SUM(comments) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_progress_updated_at = NOW(),
    updated_at = NOW()
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));
```

**Checklist:**
- [ ] Current code matches expected state: [YES / NO]
- [ ] Line 41 has buggy `total_sales = COALESCE((SELECT SUM(gmv)...)` without manual_adjustments
- [ ] Line 42 has buggy `total_units = COALESCE((SELECT SUM(units_sold)...)` without manual_adjustments

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification (Database Bug - REQUIRED)

**Read SchemaFinalv2.md for users table:**
```bash
grep -A 5 "manual_adjustments" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md | head -10
```

**Expected columns in users table:**
- `manual_adjustments_total` - DECIMAL(10,2) - tracks manual sales adjustments
- `manual_adjustments_units` - INTEGER - tracks manual units adjustments

**Column verification:**
| Column in Fix | Column in Schema | Match? |
|---------------|------------------|--------|
| `manual_adjustments_total` | `manual_adjustments_total` | ✅ |
| `manual_adjustments_units` | `manual_adjustments_units` | ✅ |

**Checklist:**
- [ ] manual_adjustments_total column exists in schema
- [ ] manual_adjustments_units column exists in schema
- [ ] Data types compatible (DECIMAL, INTEGER)
- [ ] Nullable handling correct (defaults to 0 via COALESCE)

---

### Gate 5: API Contract Verification

> Skip this gate - bug doesn't involve direct API changes (RPC function only)

**Checklist:**
- [x] SKIPPED - Not an API bug

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

### Step 1: Generate Migration Timestamp

**Action Type:** PREPARE

**Command:**
```bash
date +%Y%m%d%H%M%S
```

**Expected:** Timestamp in format YYYYMMDDHHMMSS (e.g., 20251215123456)

**Checkpoint:**
- [ ] Timestamp generated: [actual timestamp]
- [ ] Will use for migration filename

---

### Step 2: Create New Migration File with Fixed Function

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify no existing fix migration:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_precomputed* 2>/dev/null || echo "No existing fix migration"
```

**Expected:** "No existing fix migration"

**Reality Check:**
- [ ] No conflicting migration exists

---

#### Create Action

**New File Content (COMPLETE - no placeholders):**

```sql
-- ============================================================================
-- Fix: update_precomputed_fields Overwrites Manual Adjustments
-- ============================================================================
-- Bug ID: BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS
-- Issue: total_sales and total_units were set to only SUM(videos), ignoring
--        manual_adjustments applied by apply_pending_sales_adjustments
-- Fix: Include manual_adjustments_total and manual_adjustments_units in calculation
-- Reference: BugFixes/BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
-- ============================================================================

CREATE OR REPLACE FUNCTION update_precomputed_fields(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip_metric VARCHAR(10);
  v_updated_count INTEGER := 0;
BEGIN
  -- Get client's vip_metric with NULL guard
  SELECT vip_metric INTO v_vip_metric FROM clients WHERE id = p_client_id;

  -- Fail loudly if vip_metric is NULL or invalid (indicates data integrity issue)
  IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
    RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
  END IF;

  -- Update aggregation fields (both modes update engagement fields)
  -- FIX: Include manual_adjustments_total and manual_adjustments_units in totals
  UPDATE users u
  SET
    total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
    total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_units, 0),
    checkpoint_sales_current = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_units_current = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_videos_posted = COALESCE((SELECT COUNT(*) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_views = COALESCE((SELECT SUM(views) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_likes = COALESCE((SELECT SUM(likes) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_comments = COALESCE((SELECT SUM(comments) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_progress_updated_at = NOW(),
    updated_at = NOW()
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Update projected_tier_at_checkpoint based on vip_metric
  UPDATE users u
  SET projected_tier_at_checkpoint = (
    SELECT t.tier_id
    FROM tiers t
    WHERE t.client_id = p_client_id
      AND (
        (v_vip_metric = 'sales' AND u.checkpoint_sales_current >= COALESCE(t.sales_threshold, 0))
        OR (v_vip_metric = 'units' AND u.checkpoint_units_current >= COALESCE(t.units_threshold, 0))
      )
    ORDER BY t.tier_order DESC
    LIMIT 1
  )
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  -- Update next_tier fields
  -- DESIGN NOTE: We set BOTH next_tier_threshold AND next_tier_threshold_units
  -- regardless of vip_metric. This is intentional:
  --   - SchemaFinalv2.md lines 146 defines both fields on users table
  --   - Frontend selects which to display based on client.vip_metric
  --   - In units mode: UI shows next_tier_threshold_units ("50 more units to Silver")
  --   - In sales mode: UI shows next_tier_threshold ("$500 more to Silver")
  --   - Having both populated is a denormalization for frontend flexibility
  UPDATE users u
  SET
    next_tier_name = nt.tier_name,
    next_tier_threshold = nt.sales_threshold,        -- Always set (frontend picks based on vip_metric)
    next_tier_threshold_units = nt.units_threshold   -- Always set (frontend picks based on vip_metric)
  FROM tiers ct, tiers nt
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND ct.client_id = p_client_id
    AND ct.tier_id = u.current_tier
    AND nt.client_id = p_client_id
    AND nt.tier_order = ct.tier_order + 1;

  -- Clear next_tier for users at max tier
  UPDATE users u
  SET
    next_tier_name = NULL,
    next_tier_threshold = NULL,
    next_tier_threshold_units = NULL
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND NOT EXISTS (
      SELECT 1 FROM tiers ct, tiers nt
      WHERE ct.client_id = p_client_id
        AND ct.tier_id = u.current_tier
        AND nt.client_id = p_client_id
        AND nt.tier_order = ct.tier_order + 1
    );

  RETURN v_updated_count;
END;
$$;

-- CRITICAL: Must include GRANT to preserve service_role access
GRANT EXECUTE ON FUNCTION update_precomputed_fields(UUID, UUID[]) TO service_role;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql
Content: [Complete SQL above]
```

**Change Summary:**
- New migration file created
- Lines: ~115
- Key changes: Lines 35-36 now include `+ COALESCE(u.manual_adjustments_total, 0)` and `+ COALESCE(u.manual_adjustments_units, 0)`

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_precomputed*
```
**Expected:** File exists with correct timestamp

**Verify fix content:**
```bash
grep "manual_adjustments_total" /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_precomputed*
```
**Expected:** Line containing `+ COALESCE(u.manual_adjustments_total, 0)`

**State Verification:**
- [ ] File created successfully
- [ ] Contains manual_adjustments_total fix
- [ ] Contains manual_adjustments_units fix

---

#### Step Checkpoint

- [ ] Pre-action: No conflicting migration exists ✅
- [ ] Create applied successfully ✅
- [ ] Post-action: File contains fix ✅
- [ ] Complete function included (not partial) ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Apply Migration with Database Reset

**Action Type:** EXECUTE

**Note:** `npx supabase db reset` is acceptable because this is a non-production environment with no data to preserve.

---

#### Pre-Action Reality Check

**Verify Supabase is running:**
```bash
npx supabase status 2>&1 | grep -E "API URL|DB URL" | head -2
```
**Expected:** URLs showing local Supabase is running

---

#### Execute Action

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db reset
```

**Expected Output:** All migrations apply successfully, including the new fix migration

---

#### Post-Action Verification

**Verify migration applied:**
```bash
npx supabase migration list 2>&1 | grep "fix_precomputed"
```
**Expected:** Migration shows as applied

**Checkpoint:**
- [ ] Database reset completed without errors
- [ ] New migration applied successfully

---

### Step 4: Regenerate TypeScript Types (If Needed)

**Action Type:** EXECUTE

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --local > lib/types/database.ts
```

**Expected:** Types regenerated (function signature unchanged, so minimal changes expected)

**Checkpoint:**
- [ ] Types regenerated successfully

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `update_precomputed_fields` main UPDATE
```sql
UPDATE users u
SET
  total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
  ...
WHERE u.client_id = p_client_id
  AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));
```

**Security Checklist:**
- [x] `WHERE u.client_id = p_client_id` present
- [x] Inner query filters by `client_id = p_client_id`
- [x] No raw SQL without client_id filter
- [x] No cross-tenant data exposure possible

**Query 2:** `projected_tier_at_checkpoint` UPDATE
```sql
UPDATE users u
SET projected_tier_at_checkpoint = (
  SELECT t.tier_id
  FROM tiers t
  WHERE t.client_id = p_client_id
  ...
)
WHERE u.client_id = p_client_id
```

**Security Checklist:**
- [x] Outer query filters by `u.client_id = p_client_id`
- [x] Inner query filters by `t.client_id = p_client_id`
- [x] Multi-tenant isolation maintained

---

### Authentication Check

**Function Security:**
- [x] `SECURITY DEFINER` - runs with elevated privileges
- [x] `GRANT EXECUTE ... TO service_role` - only service_role can call
- [x] Called via `supabase.rpc()` which requires authentication

---

**SECURITY STATUS:** ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**Run the specific test that was failing:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments" 2>&1 | tail -20
```

**Expected:** Test Case 5 passes (total_sales = 500 after adjustment)
**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed ✅

---

### Verification 2: No New Errors Introduced

**Run full Phase 8 test suite:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/ 2>&1 | tail -30
```

**Expected:** Test Case 5 passes, other tests maintain current status
**Actual:** [document actual output]

**Status:**
- [ ] No new test failures introduced ✅

---

### Verification 3: Migration Applied Correctly

**Verify function exists in database:**
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\df update_precomputed_fields" 2>&1
```

**Expected:** Function listed with correct signature
**Actual:** [document output]

**Status:**
- [ ] Function exists in database ✅

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [x] `manual_adjustments_total` column exists in users table (verified in Gate 4)
- [x] `manual_adjustments_units` column exists in users table (verified in Gate 4)
- [x] Data types compatible (DECIMAL, INTEGER)

---

### Verification 5: API Contract Alignment Confirmed

> Skip - not an API bug

**Verification:**
- [x] SKIPPED - RPC function only, no API contract changes

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git status --short
git diff --stat
```

**Expected Changes:**
- New file: `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql` (~115 lines)
- Possibly: `appcode/lib/types/database.ts` (regenerated types)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Only expected files changed ✅
- [ ] No unexpected modifications ✅

---

### Verification 7: Runtime Test

**Test Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts 2>&1 | grep -E "✓|✕" | head -25
```

**Expected:** Test Case 5 (sales adjustments) now shows ✓
**Actual:** [document actual output]

**Status:**
- [ ] Runtime test passed ✅

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED ✅ / [ ] FAILED ❌

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-15
**Executor:** Claude Opus 4.5
**Decision Source:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
**Implementation Doc:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS-IMPL.md
**Bug ID:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: API Contract - SKIPPED
```

**Implementation Steps:**
```
[Timestamp] Step 1: Generate timestamp - [PASS/FAIL]
[Timestamp] Step 2: Create migration file - Pre ✅ - Created ✅ - Post ✅ - Verified ✅
[Timestamp] Step 3: Apply migration (db reset) - [PASS/FAIL]
[Timestamp] Step 4: Regenerate types - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - PASS
[Timestamp] Auth check - PASS (SECURITY DEFINER + service_role)
```

**Final Verification:**
```
[Timestamp] Bug-specific validation (Test Case 5) - [PASS/FAIL]
[Timestamp] No new errors - [PASS/FAIL]
[Timestamp] Function exists in DB - [PASS/FAIL]
[Timestamp] Schema alignment - PASS (verified in Gate 4)
[Timestamp] API contract - SKIPPED
[Timestamp] Git diff sanity - [PASS/FAIL]
[Timestamp] Runtime test - [PASS/FAIL]
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql` - CREATE - New migration with fixed function
2. `appcode/lib/types/database.ts` - REGENERATE - TypeScript types (if changed)

**Total:** 1-2 files modified, ~115 lines added (new migration)

---

### Bug Resolution

**Before Implementation:**
- Bug: `update_precomputed_fields` overwrites `total_sales` with only `SUM(videos.gmv)`, erasing manual adjustments
- Root cause: Missing `+ COALESCE(u.manual_adjustments_total, 0)` in calculation

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: Test Case 5 passes - total_sales now preserves manual adjustments

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
- Documented 19 sections
- Proposed solution: Add manual_adjustments to aggregation

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: Updated source paths, added db reset note

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS-IMPL.md
- Executed 4 implementation steps
- All verifications: [PENDING]

**Step 4: Current Status**
- Implementation: [PENDING EXECUTION]
- Bug resolved: [PENDING]
- Ready for commit: [PENDING]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify new migration exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_precomputed*
# Should show: new migration file

# 2. Verify fix content
grep "manual_adjustments_total" /home/jorge/Loyalty/Rumi/supabase/migrations/*fix_precomputed*
# Should show: line with + COALESCE(u.manual_adjustments_total, 0)

# 3. Verify function in database
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\df update_precomputed_fields"
# Should show: function exists

# 4. Run Test Case 5
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments"
# Should show: test passes
```

**Expected Results:**
- Migration file exists ✅
- Fix content present ✅
- Function in database ✅
- Test Case 5 passes ✅

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [4/4 + 1 skipped]
- Steps completed: [4/4]
- Verifications passed: [7/7]
- Errors encountered: [TBD]
- Retries needed: [TBD]

**Code Quality:**
- Files modified: 1-2
- Lines changed: ~115 (new migration)
- Breaking changes: 0
- Security verified: YES
- Tests updated: NO (existing test validates fix)

---

## Document Status

**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified (Gate 4)
- [ ] API contract verified (SKIPPED - not applicable)

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] Auth requirements met ✅

**Verification:**
- [ ] Bug-specific validation passed ✅
- [ ] No new errors ✅
- [ ] Function exists in database ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**Next Actions (After Successful Execution):**
1. [ ] Update Phase8TestBugs.md - Mark Bug 3 as FIXED
2. [ ] Update BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md status to "Implemented"
3. [ ] Git commit (if requested)

**Git Commit Message Template:**
```
fix: update_precomputed_fields now preserves manual adjustments

Resolves BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS:
total_sales and total_units now include manual_adjustments applied
by apply_pending_sales_adjustments RPC.

Changes:
- New migration: [timestamp]_fix_precomputed_fields_adjustments.sql
- Lines 35-36: Added + COALESCE(u.manual_adjustments_total/units, 0)

References:
- BugFixes/BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
- BugFixes/BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS-IMPL.md

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
- [ ] Read SchemaFinalv2.md for database queries

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (source paths, db reset note)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Verified auth requirements (SECURITY DEFINER, service_role)
- [ ] No cross-tenant data exposure

---

**META-VERIFICATION STATUS:** [PENDING - Document created, awaiting execution]

**RED FLAGS exhibited:** None ✅

---

**Document Version:** 1.1
**Created:** 2025-12-15
**Status:** READY FOR EXECUTION

---

## Audit Response Log

### Audit 1 (2025-12-15)
**Verdict:** APPROVE WITH CHANGES

**Concerns Addressed:**
1. **Gate 1 working directory**: Changed expected path from `/home/jorge/Loyalty/Rumi/appcode` to `/home/jorge/Loyalty/Rumi` (project root) since migrations run from repo root
2. **Reset guidance**: Added explicit "Environment Note" in Gate 1 clarifying that `db reset` is acceptable for non-production/local development only, and to use `npx supabase migration up` for production environments
3. **Length requirement**: Not applicable to this document (concerns the template itself)
