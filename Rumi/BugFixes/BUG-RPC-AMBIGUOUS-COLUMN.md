# BUG-RPC-AMBIGUOUS-COLUMN - Fix Documentation

**Bug ID:** BUG-RPC-AMBIGUOUS-COLUMN
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.2.3-rpc, Task 8.3.1a from EXECUTION_PLAN.md
**Linked Bugs:** Part of Phase8TestBugs.md Bug 2

---

## 1. Project Context

This is a multi-tenant loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system manages TikTok creator rewards programs where creators earn rewards based on sales performance and engagement metrics.

The bug affects the `apply_pending_sales_adjustments` RPC function which is responsible for applying manual sales/units corrections (offline sales, refunds, bonuses) to user totals. This function is called during the daily automation cron job before tier calculations.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository -> Service -> Route layers with PostgreSQL RPC functions for bulk operations

---

## 2. Bug Summary

**What's happening:** When the `apply_pending_sales_adjustments` RPC function attempts to apply units-based adjustments, PostgreSQL throws error "column reference 'total_units' is ambiguous" and the UPDATE fails.

**What should happen:** The function should successfully apply pending `amount_units` adjustments to `users.total_units` and `users.manual_adjustments_units` columns, then mark adjustments as applied.

**Impact:**
- Manual units adjustments (offline unit sales, refunds, bonuses) are not applied to user totals
- Tier calculations based on units mode will use stale data
- 13 integration tests failing (Test Cases 4, 5 in daily-automation-metrics.test.ts plus downstream failures)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `20251211163010_add_phase8_rpc_functions.sql` | Function 3: apply_pending_sales_adjustments (lines 171-222) | Subquery uses `total_units` alias which conflicts with `users.total_units` column |
| SchemaFinalv2.md | Section 1.2 users Table | Confirms `total_units` is a column on users table (line 143) |
| SchemaFinalv2.md | Section 1.7 sales_adjustments Table | Confirms `amount_units` column exists for units adjustments (line 284) |
| Phase8TestBugs.md | Bug 2 section | Documents error and affected tests |

### Key Evidence

**Evidence 1:** Subquery alias conflicts with column name
- Source: `20251211163010_add_phase8_rpc_functions.sql`, lines 202-208
- Code:
  ```sql
  SELECT user_id, SUM(amount_units) as total_units  -- Alias same as users.total_units
  FROM sales_adjustments
  WHERE client_id = p_client_id
    AND applied_at IS NULL
    AND amount_units IS NOT NULL
  GROUP BY user_id
  ```
- Implication: When UPDATE references `total_units`, PostgreSQL cannot determine if it means `users.total_units` (the column to update) or `adj.total_units` (the subquery result)

**Evidence 2:** Unqualified column references in SET clause
- Source: `20251211163010_add_phase8_rpc_functions.sql`, lines 199-201
- Code:
  ```sql
  SET
    total_units = total_units + adj.total_units,
    manual_adjustments_units = manual_adjustments_units + adj.total_units
  ```
- Implication: The left-hand `total_units` and `manual_adjustments_units` lack table prefix `u.`, making references ambiguous

**Evidence 3:** Test failures confirm the bug
- Source: Phase8TestBugs.md, Bug 2 section
- Error: `column reference "total_units" is ambiguous`
- Affected tests: `daily-automation-metrics.test.ts` - Test Cases 4, 5

---

## 4. Root Cause Analysis

**Root Cause:** The `apply_pending_sales_adjustments` RPC function uses `total_units` as a subquery alias, which conflicts with the `users.total_units` column name, and the UPDATE statement lacks explicit table prefixes for column references.

**Contributing Factors:**
1. Subquery alias `total_units` matches column name `users.total_units`
2. SET clause uses unqualified column names (`total_units` instead of `u.total_units`)
3. The sales-based UPDATE (lines 182-195) doesn't have this issue because `total_amount` alias doesn't conflict with any users column

**How it was introduced:** Design oversight during implementation of Task 8.2.3-rpc. The sales adjustment portion (using `total_amount` alias) was written first and works correctly. The units adjustment portion was likely copy-pasted with alias renamed from `total_amount` to `total_units`, not realizing `total_units` is also a column name on the users table.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Data integrity | Units-based manual adjustments not applied to user totals | High |
| Feature functionality | Units mode tier calculations use stale data | High |
| Admin workflow | Admin enters adjustments but they have no effect | High |
| User experience | Creators don't see corrected unit counts | Medium |

**Business Risk Summary:** For clients using units-based VIP metrics, manual corrections (offline sales, refunds, bonuses) are silently ignored, leading to incorrect tier placements and creator complaints about inaccurate data.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211163010_add_phase8_rpc_functions.sql`

```sql
-- Lines 197-211: Apply units adjustments (amount_units field)
UPDATE users u
SET
  total_units = total_units + adj.total_units,
  manual_adjustments_units = manual_adjustments_units + adj.total_units
FROM (
  SELECT user_id, SUM(amount_units) as total_units
  FROM sales_adjustments
  WHERE client_id = p_client_id
    AND applied_at IS NULL
    AND amount_units IS NOT NULL
  GROUP BY user_id
) adj
WHERE u.id = adj.user_id
  AND u.client_id = p_client_id;
```

**Current Behavior:**
- When `apply_pending_sales_adjustments(client_id)` is called with pending units adjustments
- PostgreSQL throws: `ERROR: column reference "total_units" is ambiguous`
- No units adjustments are applied
- Function fails and returns error

#### Current Data Flow

```
sales_adjustments (pending)
         |
         v
apply_pending_sales_adjustments(p_client_id)
         |
         v
Step 1: Sales adjustments (amount) -----> Works correctly (uses total_amount alias)
         |
         v
Step 2: Units adjustments (amount_units) -----> FAILS: "total_units" ambiguous
         |
         X (function aborts)
```

---

## 7. Proposed Fix

#### Approach

Rename the subquery alias from `total_units` to `adj_total_units` (following the pattern `adj_` prefix to clearly indicate it's from the adjustment subquery), and add explicit table prefixes (`u.`) to all column references in the SET clause.

#### Changes Required

**File:** New migration `supabase/migrations/[timestamp]_fix_rpc_ambiguous_column.sql`

**IMPORTANT - Migration Requirements (per audit feedback):**
- Migration MUST include the **complete function definition** using `CREATE OR REPLACE FUNCTION`
- MUST include `LANGUAGE plpgsql` and `SECURITY DEFINER` clauses
- MUST include `GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role`
- MUST include both sales branch (unchanged) and units branch (fixed)
- Failure to include GRANT will cause permission loss and runtime regressions

**Alias Scan Verification:**
- Scanned all migrations for similar aliases: `grep "as total_units\|as total_sales" supabase/migrations/`
- Result: Only one instance found at line 203 (the buggy line)
- The sales branch uses `total_amount` alias which does NOT conflict with any users column
- No other RPCs have this ambiguity issue

**Current Code (lines 197-211):**
```sql
-- Apply units adjustments (amount_units field)
UPDATE users u
SET
  total_units = total_units + adj.total_units,
  manual_adjustments_units = manual_adjustments_units + adj.total_units
FROM (
  SELECT user_id, SUM(amount_units) as total_units
  FROM sales_adjustments
  WHERE client_id = p_client_id
    AND applied_at IS NULL
    AND amount_units IS NOT NULL
  GROUP BY user_id
) adj
WHERE u.id = adj.user_id
  AND u.client_id = p_client_id;
```

**Fixed Code:**
```sql
-- Apply units adjustments (amount_units field)
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

**Explanation:**
1. Renamed subquery alias from `total_units` to `adj_total_units` - eliminates name conflict
2. Added explicit `u.` prefix to left-hand column references - makes intent unambiguous
3. Updated `adj.total_units` references to `adj.adj_total_units` - matches new alias

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_fix_rpc_ambiguous_column.sql` | CREATE | New migration with complete CREATE OR REPLACE FUNCTION (includes LANGUAGE, SECURITY DEFINER, GRANT EXECUTE) |

### Dependency Graph

```
supabase/migrations/[new]_fix_rpc_ambiguous_column.sql
├── replaces: apply_pending_sales_adjustments function in database
├── called by: syncRepository.applyPendingSalesAdjustments()
│   └── called by: tierCalculationService.runCheckpointEvaluation()
│       └── called by: daily-automation route
└── affects: users.total_units, users.manual_adjustments_units columns
```

---

## 9. Data Flow Analysis

#### Before Fix

```
sales_adjustments.amount_units
         |
         v
SUM(amount_units) as total_units  <-- Alias conflicts with users.total_units
         |
         v
UPDATE users SET total_units = total_units + adj.total_units
         |                           |                |
         v                           v                v
    [which one?]              [which one?]     [works, has adj. prefix]
         |
         X ERROR: ambiguous
```

#### After Fix

```
sales_adjustments.amount_units
         |
         v
SUM(amount_units) as adj_total_units  <-- Unique alias, no conflict
         |
         v
UPDATE users u SET total_units = u.total_units + adj.adj_total_units
         |                            |                    |
         v                            v                    v
   [users column]             [users column]       [subquery result]
         |
         v
    SUCCESS: users.total_units updated correctly
```

#### Data Transformation Steps

1. **Step 1:** Aggregate pending units adjustments by user_id: `SUM(amount_units) as adj_total_units`
2. **Step 2:** Join aggregated adjustments to users table: `FROM users u ... FROM (...) adj`
3. **Step 3:** Update users with explicit column references: `u.total_units = u.total_units + adj.adj_total_units`

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
daily-automation/route.ts (GET handler)
│
├─► tierCalculationService.runCheckpointEvaluation(clientId)
│   └── Calls applyPendingSalesAdjustments before tier calculations
│
├─► syncRepository.applyPendingSalesAdjustments(clientId)
│   └── Calls supabase.rpc('apply_pending_sales_adjustments', {p_client_id})
│
└─► apply_pending_sales_adjustments (PostgreSQL RPC)
    ├── Step 1: Apply sales adjustments (works)
    ├── Step 2: Apply units adjustments (BUG IS HERE)
    └── Step 3: Mark adjustments as applied (never reached if Step 2 fails)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `apply_pending_sales_adjustments` RPC | Contains the bug - ambiguous column reference |
| Database | `users` table | Has `total_units` column that conflicts with alias |
| Database | `sales_adjustments` table | Source of `amount_units` data |
| Repository | `syncRepository.applyPendingSalesAdjustments()` | Calls the buggy RPC |
| Service | `tierCalculationService.runCheckpointEvaluation()` | Orchestrates the call |
| API Route | `daily-automation` | Entry point for cron job |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `users` | `total_units`, `manual_adjustments_units` | Target columns for update |
| `sales_adjustments` | `amount_units`, `user_id`, `client_id`, `applied_at` | Source data for adjustments |

#### Schema Check

```sql
-- Verify users table has the target columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('total_units', 'manual_adjustments_units');

-- Verify sales_adjustments has source column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales_adjustments'
  AND column_name = 'amount_units';
```

#### Data Migration Required?
- [x] No - schema already supports fix
- This is a code fix (SQL function), not a schema change

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | N/A | None - fix is backend only |
| Leaderboard | N/A | None - fix is backend only |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [x] No - frontend already handles this correctly
- The bug is in the RPC function; once fixed, frontend receives correct data automatically

---

## 13. Alternative Solutions Considered

#### Option A: Rename subquery alias only
- **Description:** Change `total_units` to `adj_total_units` in subquery
- **Pros:** Minimal change, fixes the immediate issue
- **Cons:** Doesn't add explicit table prefixes for defensive coding
- **Verdict:** Partial solution

#### Option B: Add table prefixes only
- **Description:** Add `u.` prefix to all column references but keep alias
- **Pros:** Makes references explicit
- **Cons:** Still has confusing naming where subquery alias matches column name
- **Verdict:** Partial solution, less clear

#### Option C: Both rename alias AND add table prefixes (Selected)
- **Description:** Rename alias to `adj_total_units` AND add `u.` prefix to column references
- **Pros:**
  - Fixes the bug definitively
  - Improves code clarity (alias clearly indicates source)
  - Defensive coding prevents future ambiguity
  - Consistent with best practices for complex JOINs
- **Cons:** Slightly more changes
- **Verdict:** Selected - most robust and maintainable solution

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails to apply | Low | Medium | Test with `supabase db reset` locally first |
| Breaks other callers of RPC | Low | Low | Function signature unchanged, only internal fix |
| Regression in sales adjustments | Low | High | Existing tests cover sales path; verify still passes |
| Permission loss if GRANT omitted | Medium | High | Migration MUST include `GRANT EXECUTE ... TO service_role` |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Function signature unchanged |
| Database | No | CREATE OR REPLACE preserves function |
| Frontend | No | No changes needed |
| Repository | No | Calls same RPC with same parameters |

---

## 15. Testing Strategy

#### Unit Tests

Existing tests will verify the fix:

**File:** `appcode/tests/integration/cron/daily-automation-metrics.test.ts`

Test Cases 4 and 5 specifically test the sales adjustment call sequence and should pass after fix:
- Test Case 4: Verifies `total_sales` AND `manual_adjustments_total` updated
- Test Case 5: Verifies call sequence (adjustments applied before precomputed fields)

#### Integration Tests

Full Phase 8 test suite will verify:
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/
```

Expected: 87 tests passing (currently 74 pass, 13 fail due to this bug)

#### Manual Verification Steps

1. [ ] Create a pending sales_adjustment with `amount_units` value
2. [ ] Call `apply_pending_sales_adjustments` RPC
3. [ ] Verify `users.total_units` increased by adjustment amount
4. [ ] Verify `users.manual_adjustments_units` increased by adjustment amount
5. [ ] Verify `sales_adjustments.applied_at` is set

#### Verification Commands

```bash
# Apply migration
cd /home/jorge/Loyalty/Rumi && supabase db reset

# Regenerate types
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --project-id local > lib/types/database.ts

# Run full Phase 8 test suite
npm test -- tests/integration/cron/

# Type check
npx tsc --noEmit
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Create new migration file
  - File: `supabase/migrations/[timestamp]_fix_rpc_ambiguous_column.sql`
  - Change: Complete CREATE OR REPLACE FUNCTION with:
    - Full function body (both sales and units branches)
    - `LANGUAGE plpgsql`
    - `SECURITY DEFINER`
    - `GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role`
  - Only the units branch is modified; sales branch remains unchanged
- [ ] **Step 2:** Apply migration
  - Command: `supabase db reset`
- [ ] **Step 3:** Regenerate TypeScript types
  - Command: `npx supabase gen types typescript --project-id local > lib/types/database.ts`

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test -- tests/integration/cron/`
- [ ] Verify 87/87 tests pass (was 74/87)
- [ ] Update Phase8TestBugs.md to mark Bug 2 as FIXED
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.2.3-rpc | Create Phase 8 RPC migration | Contains the buggy function |
| Task 8.3.1a | Implement syncRepository.applyPendingSalesAdjustments | Calls the buggy RPC |
| Task 8.4.3a | Test RPC function behaviors | Tests expose this bug |

#### Updates Required

**Task 8.2.3-rpc:**
- Current AC: Migration applies cleanly, all 3 functions callable via `supabase.rpc()`
- Updated AC: No change needed - fix maintains same interface
- Notes: Bug was in implementation detail, not interface

#### New Tasks Created
- None - this is a bug fix for existing functionality

---

## 18. Definition of Done

- [ ] New migration file created with complete fixed RPC function (includes LANGUAGE, SECURITY DEFINER, GRANT EXECUTE)
- [ ] Migration applies cleanly with `supabase db reset`
- [ ] Type checker passes with no errors
- [ ] All 87 Phase 8 tests pass (was 74)
- [ ] No regressions in other test suites
- [ ] Phase8TestBugs.md updated (Bug 2 marked FIXED)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 1.2 users Table, Section 1.7 sales_adjustments Table | Schema definitions for affected tables |
| 20251211163010_add_phase8_rpc_functions.sql | Function 3: apply_pending_sales_adjustments | Current buggy implementation |
| Phase8TestBugs.md | Bug 2 section | Bug tracking and affected tests |
| EXECUTION_PLAN.md | Tasks 8.2.3-rpc, 8.3.1a, 8.4.3a | Related implementation tasks |
| AUTOMATION_IMPL.md | Section on RPC Functions | Documents call sequence |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 1.2 (users) and 1.7 (sales_adjustments) - Understand the tables involved
2. **Second:** 20251211163010_add_phase8_rpc_functions.sql - Lines 171-222 - See the buggy code
3. **Third:** Phase8TestBugs.md - Bug 2 section - Understand the error and affected tests
4. **Fourth:** This document - Proposed Fix section - See the solution

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete

---

## Audit Response Log

### Audit 1 (2025-12-15)
**Verdict:** APPROVE WITH CHANGES

**Critical Issues Addressed:**
1. Migration completeness - Added explicit requirements in Section 7 that migration MUST include complete function definition with LANGUAGE, SECURITY DEFINER, and GRANT EXECUTE

**Concerns Addressed:**
1. Confirmed no other `total_units` ambiguity in other RPCs via grep scan (documented in Section 7)
2. Added permission loss risk to Risk Assessment (Section 14)

**Questions Answered:**
1. Yes - migration will include full function body with LANGUAGE and GRANT EXECUTE
2. Yes - scanned all migrations, only one instance of ambiguous alias found
