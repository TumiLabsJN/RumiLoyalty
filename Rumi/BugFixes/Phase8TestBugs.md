# Phase 8 Test Bugs - Tracking Document

**Created:** 2025-12-15
**Status:** In Progress
**Context:** Full Phase 8 test suite run revealed 25 failing tests across 4 test files

---

## Test Results Summary

| Test File | Passed | Failed | Total |
|-----------|--------|--------|-------|
| `daily-automation.test.ts` | 24 | 0 | 24 |
| `tier-calculation.test.ts` | 7 | 0 | 7 |
| `manual-csv-upload.test.ts` | 6 | 0 | 6 |
| `tier-promotion-rewards.test.ts` | 0 | 5 | 5 |
| `tier-demotion-rewards.test.ts` | 0 | 7 | 7 |
| `scheduled-activation.test.ts` | 0 | 8 | 8 |
| `daily-automation-metrics.test.ts` | 25 | 5 | 30 |
| **TOTAL** | **62** | **25** | **87** |

---

## Bug Checklist

### Bug 1: `check_quantity_with_frequency` Constraint Violation
- [x] **FIXED** (2025-12-15)

**Error:**
```
new row for relation "rewards" violates check constraint "check_quantity_with_frequency"
```

**Root Cause:**
The `createTestReward()` factory in `tests/helpers/factories.ts` does not set `redemption_frequency` or `redemption_quantity` fields. The database has a CHECK constraint (lines 294-297 in `initial_schema.sql`):

```sql
CONSTRAINT check_quantity_with_frequency CHECK (
    (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
    (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
)
```

When neither field is set, the defaults likely violate this constraint.

**Affected Tests:**
- `tier-promotion-rewards.test.ts` - All 5 tests
- `tier-demotion-rewards.test.ts` - All 7 tests
- `scheduled-activation.test.ts` - All 8 tests
- `daily-automation-metrics.test.ts` - Test Cases 6, 7, 8, 9, 10

**Fix Location:**
- `appcode/tests/helpers/factories.ts` - `createTestReward()` function (lines 232-259)

**Proposed Fix:**
Add default values for `redemption_frequency` and `redemption_quantity`:
```typescript
const defaultData: RewardInsert = {
  // ... existing fields ...
  redemption_frequency: overrides.redemption_frequency || 'unlimited',
  redemption_quantity: overrides.redemption_frequency === 'unlimited' ? null : (overrides.redemption_quantity || 1),
};
```

---

### Bug 2: `total_units` Ambiguous Column Reference in RPC
- [x] **FIXED** (2025-12-15)

**Error:**
```
column reference "total_units" is ambiguous
```

**Root Cause:**
In the `apply_pending_sales_adjustments` RPC function (lines 197-211 in `20251211163010_add_phase8_rpc_functions.sql`), the subquery aliases `SUM(amount_units) as total_units`, but the `users` table also has a column named `total_units`. When the UPDATE statement references `total_units`, PostgreSQL cannot determine which one to use.

**Current Code (problematic):**
```sql
UPDATE users u
SET
  total_units = total_units + adj.total_units,  -- AMBIGUOUS: u.total_units or adj.total_units?
  manual_adjustments_units = manual_adjustments_units + adj.total_units
FROM (
  SELECT user_id, SUM(amount_units) as total_units  -- Alias conflicts with users.total_units
  ...
) adj
```

**Affected Tests:**
- `daily-automation-metrics.test.ts` - Test Cases 4, 5

**Fix Location:**
- `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql` - lines 197-211
- Need new migration to `CREATE OR REPLACE FUNCTION`

**Proposed Fix:**
Rename the subquery alias to avoid conflict:
```sql
UPDATE users u
SET
  total_units = u.total_units + adj.adj_total_units,
  manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units
FROM (
  SELECT user_id, SUM(amount_units) as adj_total_units  -- Renamed to avoid conflict
  ...
) adj
```

---

### Bug 3: `update_precomputed_fields` Overwrites Manual Adjustments
- [ ] **NOT FIXED**

**Error:**
```
expect(received).toBe(expected) // Object.is equality
Expected: 500
Received: 0
```

**Root Cause:**
The `update_precomputed_fields` RPC function (lines 23-24 in `20251211163010_add_phase8_rpc_functions.sql`) OVERWRITES `total_sales` and `total_units` with only video aggregations, ignoring manual adjustments:

```sql
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
```

**Design Contradiction (from AUTOMATION_IMPL.md):**
- Call sequence says: `applyPendingSalesAdjustments()` MUST be first (adjusts totals), then `updatePrecomputedFields()` "uses adjusted totals"
- But implementation OVERWRITES instead of preserving adjustments

**Type:** PRODUCTION BUG

**Affected Tests:**
- `daily-automation-metrics.test.ts` - Test Case 5 (was masked by Bug 2)

**Fix Location:**
- `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql` - lines 23-24
- Need new migration to `CREATE OR REPLACE FUNCTION`

**Proposed Fix:**
Include manual adjustments in the aggregation:
```sql
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_units, 0),
```

---

### Bug 4: Test Code Uses Invalid `tier_eligibility: 'all'` on Rewards Table
- [ ] **NOT FIXED**

**Error:**
```
new row for relation "rewards" violates check constraint "rewards_tier_eligibility_check"
```

**Root Cause:**
Test code in `daily-automation-metrics.test.ts` inserts rewards with `tier_eligibility: 'all'`, but the rewards table constraint (line 280 in `initial_schema.sql`) only allows tier values:

```sql
CHECK (tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'))
```

The `'all'` value is only valid for the **missions** table (line 338), not rewards.

**Type:** TEST BUG

**Affected Tests:**
- `daily-automation-metrics.test.ts` - Test Cases 6, 8, 9, 10 (lines 757, 943, 1021, 1117)

**Note:** These tests were previously attributed to Bug 1, but they have ADDITIONAL bugs in their inline insert code (not using the factory helper).

**Fix Location:**
- `appcode/tests/integration/cron/daily-automation-metrics.test.ts` - lines 757, 943, 1021, 1117

**Proposed Fix:**
Change `tier_eligibility: 'all'` to a valid tier value like `'tier_1'`:
```typescript
// Before
tier_eligibility: 'all',

// After
tier_eligibility: 'tier_1',
```

---

## Files to Modify

| File | Bug | Action |
|------|-----|--------|
| `appcode/tests/helpers/factories.ts` | Bug 1 | Add `redemption_frequency` and `redemption_quantity` defaults |
| `supabase/migrations/20251215091818_fix_rpc_ambiguous_column.sql` | Bug 2 | CREATE OR REPLACE FUNCTION with fixed column references (DONE) |
| `supabase/migrations/[new]_fix_precomputed_fields_adjustments.sql` | Bug 3 | CREATE OR REPLACE FUNCTION to preserve manual adjustments |
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | Bug 4 | Change `tier_eligibility: 'all'` to `'tier_1'` on rewards inserts |

---

## Verification Commands

After fixes are applied:

```bash
# Run full Phase 8 test suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/

# Expected: 87 tests, 0 failures
```

---

## Notes

- These bugs are **pre-existing** and were exposed when running the full test suite
- Bug 1 affects test factory code, not production code - **FIXED**
- Bug 2 affects production RPC (ambiguous column) - **FIXED** via migration `20251215091818_fix_rpc_ambiguous_column.sql`
- Bug 3 affects production RPC (design contradiction) - discovered after Bug 2 fix unmasked it
- Bug 4 affects test code (invalid tier_eligibility value) - discovered after Bug 2 fix unmasked it
- Bugs 3 and 4 were **masked** by Bug 2's earlier failure in the test execution chain

---

## Current Test Status (After Bug 1 & 2 Fixes)

| Test File | Passed | Failed | Total |
|-----------|--------|--------|-------|
| `daily-automation.test.ts` | 24 | 0 | 24 |
| `tier-calculation.test.ts` | 7 | 0 | 7 |
| `manual-csv-upload.test.ts` | 6 | 0 | 6 |
| `tier-promotion-rewards.test.ts` | 5 | 0 | 5 |
| `tier-demotion-rewards.test.ts` | 7 | 0 | 7 |
| `scheduled-activation.test.ts` | 8 | 0 | 8 |
| `daily-automation-metrics.test.ts` | 15 | 6 | 21 |
| **TOTAL** | **74** | **13** | **87** |

**Remaining failures (6 tests):**
- Test Case 4: vip_metric invalid (investigation needed)
- Test Case 5: Bug 3 (update_precomputed_fields overwrites adjustments)
- Test Cases 6, 8, 9, 10: Bug 4 (invalid tier_eligibility on rewards)

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
