# BUG-APPLY-ADJUSTMENTS-NULL-HANDLING - Implementation Plan

**Decision Source:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md
**Bug ID:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING
**Severity:** High
**Implementation Date:** 2025-12-15
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md:**

**Bug Summary:** The `apply_pending_sales_adjustments` RPC function performs arithmetic on columns that may contain NULL values without using COALESCE. When columns are NULL, `NULL + value = NULL` in PostgreSQL, silently failing to apply adjustments.

**Root Cause:** Schema columns (`total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units`) have no DEFAULT and implicitly default to NULL. The function does `column = column + value` without COALESCE.

**Files Affected:**
- `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` (current buggy version)
- `supabase/migrations/[timestamp]_fix_apply_adjustments_null_handling.sql` (new fix)

**Chosen Solution:**
Add COALESCE to 4 lines in the SET clauses:

```sql
-- Before (lines 24-25):
total_sales = total_sales + adj.total_amount,
manual_adjustments_total = manual_adjustments_total + adj.total_amount

-- After:
total_sales = COALESCE(total_sales, 0) + adj.total_amount,
manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount

-- Before (lines 42-43):
total_units = u.total_units + adj.adj_total_units,
manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units

-- After:
total_units = COALESCE(u.total_units, 0) + adj.adj_total_units,
manual_adjustments_units = COALESCE(u.manual_adjustments_units, 0) + adj.adj_total_units
```

**Why This Solution:**
- Minimal change (4 lines)
- Handles existing NULL values correctly
- Defensive coding pattern
- No schema changes required
- Non-NULL values unaffected (COALESCE returns original value)

**From Audit Feedback (if applicable):**
- Recommendation: Pending
- Critical Issues Addressed: N/A
- Concerns Addressed: N/A

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1 (new migration file)
- Lines changed: ~70 (complete function replacement)
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

**Environment Note:** This is a **non-production/local development environment**. Database reset is acceptable because there is no production data to preserve.

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Supabase running: [actual status]
- [ ] Environment is non-production (safe for db reset)
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**Current buggy migration (reference):**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql
```
**Expected:** File exists (68 lines)

**Migrations Directory:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/ | tail -5
```
**Expected:** Directory exists, shows recent migrations

**Checklist:**
- [ ] Current buggy migration exists
- [ ] Migrations directory accessible
- [ ] Can create new migration file

---

### Gate 3: Current Code State Verification

**Read current state of function (lines 22-35 - sales section):**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql lines 22-35
```

**Expected Current State (Lines 22-35):**
```sql
  UPDATE users u
  SET
    total_sales = total_sales + adj.total_amount,
    manual_adjustments_total = manual_adjustments_total + adj.total_amount
  FROM (
    SELECT user_id, SUM(amount) as total_amount
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;
```

**Read current state of function (lines 40-53 - units section):**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql lines 40-53
```

**Expected Current State (Lines 40-53):**
```sql
  UPDATE users u
  SET
    total_units = u.total_units + adj.adj_total_units,
    manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units
  FROM (
    SELECT user_id, SUM(amount_units) as adj_total_units
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount_units IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;
```

**Checklist:**
- [ ] Line 24 has: `total_sales = total_sales + adj.total_amount` (no COALESCE)
- [ ] Line 25 has: `manual_adjustments_total = manual_adjustments_total + adj.total_amount` (no COALESCE)
- [ ] Line 42 has: `total_units = u.total_units + adj.adj_total_units` (no COALESCE)
- [ ] Line 43 has: `manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units` (no COALESCE)

**If current state doesn't match:** STOP. Report discrepancy.

---

### Gate 4: Schema Verification (Database Bug - REQUIRED)

**Verify columns can be NULL:**
```bash
docker exec -i supabase_db_Rumi psql -U postgres -c "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('total_sales', 'total_units', 'manual_adjustments_total', 'manual_adjustments_units')" 2>&1
```

**Expected:** All columns have `is_nullable = 'YES'`

**Checklist:**
- [ ] `total_sales` is nullable
- [ ] `total_units` is nullable
- [ ] `manual_adjustments_total` is nullable
- [ ] `manual_adjustments_units` is nullable

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

### Step 1: Create New Migration File with Fixed Function

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251215103614_fix_apply_adjustments_null_handling.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify no existing fix migration:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/*null_handling* 2>/dev/null || echo "No existing fix migration"
```

**Expected:** "No existing fix migration"

**Reality Check:**
- [ ] No conflicting migration exists

---

#### Create Action

**New File Content (COMPLETE - no placeholders):**

```sql
-- ============================================================================
-- Fix: apply_pending_sales_adjustments NULL Handling
-- ============================================================================
-- Bug ID: BUG-APPLY-ADJUSTMENTS-NULL-HANDLING
-- Issue: Columns may be NULL, and NULL + value = NULL in PostgreSQL
-- Fix: Wrap column references in COALESCE(column, 0) to handle NULL
-- Reference: BugFixes/BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_pending_sales_adjustments(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_count INTEGER := 0;
BEGIN
  -- Apply sales adjustments (amount field)
  -- FIX: Added COALESCE to handle NULL values
  UPDATE users u
  SET
    total_sales = COALESCE(total_sales, 0) + adj.total_amount,
    manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount
  FROM (
    SELECT user_id, SUM(amount) as total_amount
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Apply units adjustments (amount_units field)
  -- FIX: Added COALESCE to handle NULL values
  UPDATE users u
  SET
    total_units = COALESCE(u.total_units, 0) + adj.adj_total_units,
    manual_adjustments_units = COALESCE(u.manual_adjustments_units, 0) + adj.adj_total_units
  FROM (
    SELECT user_id, SUM(amount_units) as adj_total_units
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount_units IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Mark all adjustments as applied
  UPDATE sales_adjustments
  SET applied_at = NOW()
  WHERE client_id = p_client_id
    AND applied_at IS NULL;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  RETURN v_affected_count;
END;
$$;

-- CRITICAL: Must include GRANT to preserve service_role access
GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251215103614_fix_apply_adjustments_null_handling.sql
Content: [Complete SQL above]
```

**Change Summary:**
- Line 24: `total_sales = COALESCE(total_sales, 0) + adj.total_amount`
- Line 25: `manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount`
- Line 42: `total_units = COALESCE(u.total_units, 0) + adj.adj_total_units`
- Line 43: `manual_adjustments_units = COALESCE(u.manual_adjustments_units, 0) + adj.adj_total_units`

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*null_handling*
```
**Expected:** File exists

**Verify fix content:**
```bash
grep "COALESCE" /home/jorge/Loyalty/Rumi/supabase/migrations/*null_handling* | wc -l
```
**Expected:** 4 (four COALESCE calls)

**State Verification:**
- [ ] File created successfully
- [ ] Contains 4 COALESCE calls
- [ ] Complete function included

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Apply Migration with Database Reset

**Action Type:** EXECUTE

**Note:** `npx supabase db reset` is acceptable because this is a non-production environment.

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
npx supabase migration list 2>&1 | grep "null_handling"
```
**Expected:** Migration shows as applied

**Verify function has COALESCE in database:**
```bash
docker exec -i supabase_db_Rumi psql -U postgres -c "SELECT prosrc FROM pg_proc WHERE proname = 'apply_pending_sales_adjustments'" 2>&1 | grep "COALESCE" | wc -l
```
**Expected:** 4 (four COALESCE calls in function body)

**Checkpoint:**
- [ ] Database reset completed without errors
- [ ] New migration applied successfully
- [ ] Function in database has 4 COALESCE calls

---

### Step 3: Regenerate TypeScript Types (If Needed)

**Action Type:** EXECUTE

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --local > lib/types/database.ts
```

**Expected:** Types regenerated (function signature unchanged)

**Checkpoint:**
- [ ] Types regenerated successfully

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** Sales adjustments UPDATE
```sql
UPDATE users u
SET
  total_sales = COALESCE(total_sales, 0) + adj.total_amount,
  manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount
FROM (
  SELECT user_id, SUM(amount) as total_amount
  FROM sales_adjustments
  WHERE client_id = p_client_id  -- ✅ Multi-tenant filter
    AND applied_at IS NULL
    AND amount IS NOT NULL
  GROUP BY user_id
) adj
WHERE u.id = adj.user_id
  AND u.client_id = p_client_id;  -- ✅ Multi-tenant filter
```

**Security Checklist:**
- [x] Inner query filters by `client_id = p_client_id`
- [x] Outer query filters by `u.client_id = p_client_id`
- [x] No cross-tenant data exposure possible

**Query 2:** Units adjustments UPDATE (same pattern)
- [x] Multi-tenant isolation verified

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

**Run Test Case 5:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments" 2>&1 | tail -20
```

**Expected:** Test passes - `total_sales = 500`
**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed ✅

---

### Verification 2: Direct SQL Verification

**Test NULL handling directly:**
```bash
docker exec -i supabase_db_Rumi psql -U postgres -c "
-- Reset test data
UPDATE users SET total_sales = NULL, manual_adjustments_total = NULL WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM sales_adjustments WHERE user_id = '22222222-2222-2222-2222-222222222222';
INSERT INTO sales_adjustments (client_id, user_id, amount, reason, adjustment_type, adjusted_by)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 500.00, 'Test', 'manual_sale', '22222222-2222-2222-2222-222222222222');

-- Run function
SELECT apply_pending_sales_adjustments('11111111-1111-1111-1111-111111111111');

-- Check result
SELECT total_sales, manual_adjustments_total FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
" 2>&1
```

**Expected:** `total_sales = 500.00`, `manual_adjustments_total = 500.00` (not NULL)
**Actual:** [document actual output]

**Status:**
- [ ] Direct SQL verification passed ✅

---

### Verification 3: No New Errors Introduced

**Run full Phase 8 test suite:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/ 2>&1 | tail -20
```

**Expected:** Test Case 5 passes, other tests maintain status
**Actual:** [document actual output]

**Status:**
- [ ] No new test failures introduced ✅

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [x] No schema changes required
- [x] Fix is in RPC function logic only
- [x] COALESCE handles existing NULL values correctly

---

### Verification 5: Git Diff Sanity Check

**Command:**
```bash
git status --short
```

**Expected Changes:**
- New file: `supabase/migrations/20251215103614_fix_apply_adjustments_null_handling.sql`

**Status:**
- [ ] Only expected files changed ✅

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED ✅ / [ ] FAILED ❌

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-15
**Executor:** Claude Opus 4.5
**Decision Source:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md
**Implementation Doc:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING-IMPL.md
**Bug ID:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING

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
[Timestamp] Step 1: Create migration file - Pre ✅ - Created ✅ - Post ✅
[Timestamp] Step 2: Apply migration (db reset) - [PASS/FAIL]
[Timestamp] Step 3: Regenerate types - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Bug-specific validation (Test Case 5) - [PASS/FAIL]
[Timestamp] Direct SQL verification - [PASS/FAIL]
[Timestamp] No new errors - [PASS/FAIL]
[Timestamp] Git diff sanity - [PASS/FAIL]
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251215103614_fix_apply_adjustments_null_handling.sql` - CREATE - New migration with COALESCE fix

**Total:** 1 file created, ~70 lines

---

### Bug Resolution

**Before Implementation:**
- Bug: `NULL + 500 = NULL` in PostgreSQL, adjustments silently fail
- Root cause: No COALESCE wrapper for columns that may be NULL

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: `COALESCE(NULL, 0) + 500 = 500`

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify new migration exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/*null_handling*

# 2. Verify fix content (should show 4 COALESCE calls)
grep "COALESCE" /home/jorge/Loyalty/Rumi/supabase/migrations/*null_handling*

# 3. Verify function in database has COALESCE
docker exec -i supabase_db_Rumi psql -U postgres -c "SELECT prosrc FROM pg_proc WHERE proname = 'apply_pending_sales_adjustments'" 2>&1 | grep "COALESCE"

# 4. Run Test Case 5
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments"
```

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]

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
- [ ] Schema verified (columns nullable)

**Implementation:**
- [ ] Migration file created ✅
- [ ] Database reset completed ✅
- [ ] Types regenerated ✅

**Verification:**
- [ ] Test Case 5 passes ✅
- [ ] Direct SQL verification passes ✅
- [ ] No new test failures ✅

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**Next Actions (After Successful Execution):**
1. [ ] Update Phase8TestBugs.md
2. [ ] Update BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md status to "Implemented"

**Git Commit Message Template:**
```
fix: apply_pending_sales_adjustments now handles NULL columns

Resolves BUG-APPLY-ADJUSTMENTS-NULL-HANDLING:
Columns may be NULL (database default), and NULL + value = NULL.
Added COALESCE(column, 0) to handle NULL values correctly.

Changes:
- New migration: 20251215103614_fix_apply_adjustments_null_handling.sql
- 4 lines changed: added COALESCE wrapper to column references

References:
- BugFixes/BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md
- BugFixes/BUG-APPLY-ADJUSTMENTS-NULL-HANDLING-IMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

**Document Version:** 1.0
**Created:** 2025-12-15
**Status:** READY FOR EXECUTION
