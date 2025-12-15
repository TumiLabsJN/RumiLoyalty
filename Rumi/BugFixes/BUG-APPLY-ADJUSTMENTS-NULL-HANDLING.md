# BUG-APPLY-ADJUSTMENTS-NULL-HANDLING - Fix Documentation

**Bug ID:** BUG-APPLY-ADJUSTMENTS-NULL-HANDLING
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.3.1a from EXECUTION_PLAN.md
**Linked Bugs:** Discovered while verifying BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS fix

---

## 1. Project Context

This is a multi-tenant loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system manages TikTok creator rewards programs where creators earn rewards based on sales performance and engagement metrics.

The bug affects the `apply_pending_sales_adjustments` RPC function which is responsible for atomically applying pending manual sales/units adjustments to user totals. When user columns contain NULL values (the database default), arithmetic operations result in NULL instead of the expected sum.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with PostgreSQL RPC functions for bulk operations

---

## 2. Bug Summary

**What's happening:** When `apply_pending_sales_adjustments` runs on users whose `total_sales`, `total_units`, `manual_adjustments_total`, or `manual_adjustments_units` columns are NULL (the database default for new users), the arithmetic operation `NULL + value` results in NULL, not the expected sum.

**What should happen:** The function should treat NULL as 0 and correctly add the adjustment amount, resulting in the adjustment value (e.g., `NULL + 500 = 500`, not `NULL`).

**Impact:**
- Manual sales adjustments silently fail for new users (columns remain NULL)
- Test Case 5 in `daily-automation-metrics.test.ts` fails because adjustments aren't applied
- Downstream `update_precomputed_fields` calculates `total_sales = 0 + COALESCE(NULL, 0) = 0`
- Users with manual adjustments don't see their bonuses/corrections reflected

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `supabase/migrations/20251128173733_initial_schema.sql` | users table definition | `manual_adjustments_total DECIMAL(10, 2)` - NO DEFAULT, so NULL |
| `supabase/migrations/20251128173733_initial_schema.sql` | users table definition | `manual_adjustments_units INTEGER` - NO DEFAULT, so NULL |
| `supabase/migrations/20251128173733_initial_schema.sql` | users table definition | `total_sales DECIMAL(10, 2)` - NO DEFAULT specified |
| `supabase/migrations/20251128173733_initial_schema.sql` | users table definition | `total_units INTEGER` - NO DEFAULT specified |
| `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` | Lines 24-25 | `total_sales = total_sales + adj.total_amount` - no COALESCE |
| `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` | Lines 42-43 | `total_units = u.total_units + adj.adj_total_units` - no COALESCE |
| `appcode/tests/helpers/factories.ts` | createTestUser function | Sets `total_sales: 0` but NOT `manual_adjustments_total` |
| `SchemaFinalv2.md` | Section 1.2 users Table | Documents `manual_adjustments_total` and `manual_adjustments_units` as precomputed fields |
| `repodocs/AUTOMATION_IMPL.md` | Function 3: apply_pending_sales_adjustments | Documents function should "atomically apply pending adjustments" |
| `EXECUTION_PLAN.md` | Task 8.3.1a (line 1440) | States function "updates users.total_sales/total_units and manual_adjustments_* fields" |
| Direct SQL testing | Docker psql verification | Confirmed: when `manual_adjustments_total` is NULL, `apply_pending_sales_adjustments` leaves it NULL |

### Key Evidence

**Evidence 1:** Schema columns have NO DEFAULT
- Source: `supabase/migrations/20251128173733_initial_schema.sql`, users table
- Quote: `manual_adjustments_total DECIMAL(10, 2),` (no DEFAULT clause)
- Implication: New users have NULL in these columns, not 0

**Evidence 2:** Current function doesn't handle NULL
- Source: `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql`, lines 24-25
- Code: `manual_adjustments_total = manual_adjustments_total + adj.total_amount`
- Implication: When `manual_adjustments_total` is NULL, result is NULL (NULL + 500 = NULL)

**Evidence 3:** Test factory doesn't initialize manual_adjustments columns
- Source: `appcode/tests/helpers/factories.ts`, createTestUser function
- Finding: Sets `total_sales: 0`, `total_units: 0` but NOT `manual_adjustments_total`
- Implication: Test users have NULL in `manual_adjustments_*` columns

**Evidence 4:** Direct SQL verification
- Source: Docker psql testing during debugging
- Command: `SELECT apply_pending_sales_adjustments('client-id')` on user with NULL columns
- Result: `manual_adjustments_total` remained NULL after function ran
- Implication: Bug confirmed - NULL + value = NULL in PostgreSQL

---

## 4. Root Cause Analysis

**Root Cause:** The `apply_pending_sales_adjustments` RPC function performs arithmetic on columns that may contain NULL values without using COALESCE to provide a default value of 0.

**Contributing Factors:**
1. Schema defines columns without DEFAULT values (NULL is implicit default)
2. Test factory `createTestUser` doesn't set `manual_adjustments_*` columns
3. Previous fix (BUG-RPC-AMBIGUOUS-COLUMN) focused on alias conflict, didn't notice NULL handling issue
4. PostgreSQL arithmetic with NULL: `NULL + value = NULL` (not an error, silent failure)

**How it was introduced:** The original `apply_pending_sales_adjustments` function was written assuming columns would have non-NULL values. The BUG-RPC-AMBIGUOUS-COLUMN fix copied this assumption without adding NULL handling.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Data integrity | Manual adjustments silently fail for new users | High |
| User experience | Creators don't see bonuses/corrections reflected | High |
| Admin trust | Admin enters adjustments but they don't apply | High |
| Tier calculations | Users may be wrongly demoted (missing bonus sales) | High |
| Leaderboard accuracy | Rankings incorrect for users with adjustments | Medium |

**Business Risk Summary:** For any user whose `manual_adjustments_*` columns are NULL (all new users), manual adjustments silently fail. Admins believe they've applied bonuses/corrections, but the values remain NULL. This defeats the purpose of the manual adjustment feature.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql`

```sql
-- Lines 22-35: Sales adjustments section (BUGGY)
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

-- Lines 40-53: Units adjustments section (BUGGY)
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

**Current Behavior:**
- When `total_sales` is NULL: `NULL + 500 = NULL` (stays NULL)
- When `manual_adjustments_total` is NULL: `NULL + 500 = NULL` (stays NULL)
- Same for `total_units` and `manual_adjustments_units`
- Adjustment row is still marked as "applied" even though values didn't change

#### Current Data Flow

```
apply_pending_sales_adjustments(client_id)
         |
         v
total_sales = NULL + 500 = NULL  ← BUG: stays NULL
manual_adjustments_total = NULL + 500 = NULL  ← BUG: stays NULL
         |
         v
Adjustment marked as applied (applied_at = NOW())
         |
         v
update_precomputed_fields(client_id)
         |
         v
total_sales = SUM(videos) + COALESCE(NULL, 0) = 0  ← Downstream sees 0
```

---

## 7. Proposed Fix

#### Approach

Wrap all column references in the SET clause with `COALESCE(column, 0)` to handle NULL values. This ensures `NULL + value = value` instead of `NULL`.

#### Changes Required

**File:** New migration `supabase/migrations/[timestamp]_fix_apply_adjustments_null_handling.sql`

**Before (lines 24-25):**
```sql
total_sales = total_sales + adj.total_amount,
manual_adjustments_total = manual_adjustments_total + adj.total_amount
```

**After:**
```sql
total_sales = COALESCE(total_sales, 0) + adj.total_amount,
manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount
```

**Before (lines 42-43):**
```sql
total_units = u.total_units + adj.adj_total_units,
manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units
```

**After:**
```sql
total_units = COALESCE(u.total_units, 0) + adj.adj_total_units,
manual_adjustments_units = COALESCE(u.manual_adjustments_units, 0) + adj.adj_total_units
```

**Explanation:**
1. `COALESCE(column, 0)` returns the column value if not NULL, or 0 if NULL
2. `COALESCE(NULL, 0) + 500 = 0 + 500 = 500` (correct behavior)
3. `COALESCE(100, 0) + 500 = 100 + 500 = 600` (existing values still work)

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_fix_apply_adjustments_null_handling.sql` | CREATE | New migration with complete CREATE OR REPLACE FUNCTION |

### Dependency Graph

```
supabase/migrations/[new]_fix_apply_adjustments_null_handling.sql
├── replaces: apply_pending_sales_adjustments function in database
├── called by: syncRepository.applyPendingSalesAdjustments()
│   └── called by: daily-automation route
│   └── called by: tierCalculationService
└── affects: users.total_sales, users.total_units, users.manual_adjustments_total, users.manual_adjustments_units
```

---

## 9. Data Flow Analysis

#### Before Fix

```
apply_pending_sales_adjustments()
         |
         v
users.manual_adjustments_total = NULL + 500 = NULL
users.total_sales = NULL + 500 = NULL (or 0 + 500 = 500 if not NULL)
         |
         v
update_precomputed_fields()
         |
         v
total_sales = SUM(videos) + COALESCE(NULL, 0) = 0 + 0 = 0  ← WRONG
```

#### After Fix

```
apply_pending_sales_adjustments()
         |
         v
users.manual_adjustments_total = COALESCE(NULL, 0) + 500 = 500
users.total_sales = COALESCE(NULL, 0) + 500 = 500
         |
         v
update_precomputed_fields()
         |
         v
total_sales = SUM(videos) + COALESCE(500, 0) = 0 + 500 = 500  ← CORRECT
```

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
daily-automation/route.ts (GET handler)
│
├─► syncRepository.applyPendingSalesAdjustments(clientId)
│   └── Calls supabase.rpc('apply_pending_sales_adjustments')
│   └── ⚠️ BUG IS HERE: NULL + value = NULL
│
├─► syncRepository.updatePrecomputedFields(clientId)
│   └── Reads manual_adjustments_total (sees NULL)
│   └── Calculates total_sales = SUM(videos) + 0
│
└─► syncRepository.updateLeaderboardRanks(clientId)
    └── Uses incorrect total_sales for ranking
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `apply_pending_sales_adjustments` RPC | Contains the bug - NULL arithmetic |
| Database | `users` table | Has NULL defaults for adjustment columns |
| Repository | `syncRepository.applyPendingSalesAdjustments()` | Calls the buggy RPC |
| Service | `tierCalculationService` | Orchestrates call sequence |
| Test | `createTestUser` factory | Creates users with NULL adjustment columns |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `users` | `total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units` | All can be NULL |

#### Schema Check

```sql
-- Verify columns allow NULL (no NOT NULL constraint)
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('total_sales', 'total_units', 'manual_adjustments_total', 'manual_adjustments_units');
```

**Expected:** All columns have `is_nullable = 'YES'` and `column_default = NULL`

#### Data Migration Required?
- [x] No - schema already supports fix
- Fix is in RPC function logic, not schema structure
- Existing NULL values will be handled correctly after fix

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | N/A | None - fix is backend only |
| Leaderboard | N/A | None - data will now be correct |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `users.total_sales` | NULL (for new users with adjustments) | Correct value | No - value becomes correct |
| `users.manual_adjustments_total` | NULL | Correct value | No - value becomes correct |

### Frontend Changes Required?
- [x] No - frontend already handles this correctly
- Fix is in RPC function; frontend receives correct data automatically

---

## 13. Alternative Solutions Considered

#### Option A: Add DEFAULT 0 to schema columns
- **Description:** Alter table to add DEFAULT 0 for affected columns
- **Pros:** Prevents NULL at source
- **Cons:** Requires schema migration, doesn't fix existing NULL values, more invasive
- **Verdict:** ❌ Rejected - more complex, doesn't fix existing data

#### Option B: Update test factory to set explicit 0 values
- **Description:** Modify `createTestUser` to set `manual_adjustments_total: 0`
- **Pros:** Tests would pass
- **Cons:** Masks the bug, doesn't fix production issue, real users still affected
- **Verdict:** ❌ Rejected - hides bug instead of fixing it

#### Option C: Add COALESCE in RPC function (Selected)
- **Description:** Wrap column references in `COALESCE(column, 0)` in SET clause
- **Pros:**
  - Minimal change (4 lines)
  - Handles existing NULL values
  - Defensive coding pattern
  - No schema changes
- **Cons:** Slight performance overhead (negligible)
- **Verdict:** ✅ Selected - simplest, most targeted fix

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails to apply | Low | Medium | Test with `supabase db reset` locally |
| COALESCE changes existing behavior | Low | Low | Only affects NULL values, non-NULL unchanged |
| Breaks other callers | Low | Low | Function signature unchanged |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Function signature unchanged |
| Database | No | CREATE OR REPLACE preserves function |
| Frontend | No | No changes needed |

---

## 15. Testing Strategy

#### Unit Tests

Existing test will verify the fix:

**File:** `appcode/tests/integration/cron/daily-automation-metrics.test.ts`

Test Case 5 creates a user (with NULL adjustment columns) and expects adjustments to be applied:
```typescript
it('should reflect sales adjustments in total_sales and leaderboard rank', async () => {
  // Creates user via createTestUser (manual_adjustments_total = NULL)
  // Creates sales_adjustment with amount = 500
  // Calls apply_pending_sales_adjustments
  // Calls update_precomputed_fields
  // Expects total_sales = 500 (currently fails due to NULL handling)
});
```

#### Manual Verification Steps

1. [ ] Create user with NULL `manual_adjustments_total`
2. [ ] Create pending sales_adjustment with `amount = 500`
3. [ ] Call `apply_pending_sales_adjustments` RPC
4. [ ] Verify `manual_adjustments_total = 500` (not NULL)
5. [ ] Call `update_precomputed_fields` RPC
6. [ ] Verify `total_sales = 500`

#### Verification Commands

**Note:** `npx supabase db reset` is acceptable because this is a non-production environment.

```bash
# Apply migration
cd /home/jorge/Loyalty/Rumi && npx supabase db reset

# Run Test Case 5
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments"

# Run full Phase 8 test suite
npm test -- tests/integration/cron/
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Generate migration timestamp
  - Command: `date +%Y%m%d%H%M%S`
- [ ] **Step 2:** Create new migration file
  - File: `supabase/migrations/[timestamp]_fix_apply_adjustments_null_handling.sql`
  - Change: Complete CREATE OR REPLACE FUNCTION with COALESCE fix
- [ ] **Step 3:** Apply migration
  - Command: `npx supabase db reset`
- [ ] **Step 4:** Regenerate TypeScript types (if needed)
  - Command: `npx supabase gen types typescript --local > lib/types/database.ts`

#### Post-Implementation
- [ ] Run Test Case 5: `npm test -- --testNamePattern="sales adjustments"`
- [ ] Run full test suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.3.1a | Implement applyPendingSalesAdjustments | Function has NULL handling bug |
| Task 8.4.3a | Test RPC function behaviors | Test Case 5 exposes this bug |

#### Updates Required

**Task 8.3.1a:**
- Current AC: Function atomically applies pending adjustments
- Updated AC: No change needed - fix makes function work correctly
- Notes: Bug was in implementation, not design

---

## 18. Definition of Done

- [ ] New migration file created with complete fixed RPC function
- [ ] Migration includes COALESCE for all 4 column references
- [ ] Migration includes LANGUAGE plpgsql, SECURITY DEFINER, GRANT EXECUTE
- [ ] Migration applies cleanly with `npx supabase db reset`
- [ ] Test Case 5 in daily-automation-metrics.test.ts passes
- [ ] No regressions in other test suites
- [ ] Phase8TestBugs.md updated
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `supabase/migrations/20251128173733_initial_schema.sql` | users table definition | Shows columns have no DEFAULT (NULL implicit) |
| `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` | Lines 24-25, 42-43 | Current buggy implementation |
| `appcode/tests/helpers/factories.ts` | createTestUser function | Shows test factory doesn't set adjustment columns |
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | Test Case 5 | Test that exposes the bug |
| `SchemaFinalv2.md` | Section 1.2 users Table | Documents adjustment columns as precomputed fields |
| `repodocs/AUTOMATION_IMPL.md` | Function 3: apply_pending_sales_adjustments | Documents expected function behavior |
| `EXECUTION_PLAN.md` | Task 8.3.1a | Related implementation task |
| `BugFixes/Phase8TestBugs.md` | Bug 3 section | Related bug tracking |

### Reading Order for External Auditor

1. **First:** `supabase/migrations/20251128173733_initial_schema.sql` - See columns have no DEFAULT
2. **Second:** `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` - See current buggy code
3. **Third:** `appcode/tests/helpers/factories.ts` - See test factory doesn't set adjustment columns
4. **Fourth:** This document - "Proposed Fix" section - See the solution

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete
