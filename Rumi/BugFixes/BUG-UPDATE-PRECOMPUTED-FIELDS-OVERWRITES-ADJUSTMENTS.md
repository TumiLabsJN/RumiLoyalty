# BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS - Fix Documentation

**Bug ID:** BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.2.3-rpc, Task 8.3.1a from EXECUTION_PLAN.md
**Linked Bugs:** Discovered after fixing BUG-RPC-AMBIGUOUS-COLUMN (was masked by earlier test failure)

---

## 1. Project Context

This is a multi-tenant loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system manages TikTok creator rewards programs where creators earn rewards based on sales performance and engagement metrics.

The bug affects the `update_precomputed_fields` RPC function which is responsible for aggregating video metrics into precomputed user fields. This function OVERWRITES `total_sales` and `total_units` with only video aggregations, ignoring manual adjustments that were applied earlier in the call sequence.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with PostgreSQL RPC functions for bulk operations

---

## 2. Bug Summary

**What's happening:** When the daily automation cron job runs, `apply_pending_sales_adjustments` correctly adds manual adjustments to `users.total_sales` and `users.manual_adjustments_total`. However, `update_precomputed_fields` (called immediately after) OVERWRITES `total_sales` with only `SUM(videos.gmv)`, erasing the manual adjustments.

**What should happen:** `update_precomputed_fields` should calculate `total_sales` as `SUM(videos.gmv) + manual_adjustments_total`, preserving the adjustments applied in the previous step.

**Impact:**
- Manual sales adjustments (offline sales, refunds, bonuses) are silently erased
- Leaderboard rankings don't reflect manual adjustments
- Tier calculations may be incorrect for users with manual adjustments
- Test Case 5 in `daily-automation-metrics.test.ts` fails

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `repodocs/AUTOMATION_IMPL.md` | "Call Sequence (per RPCMigrationFixIMPL.md)" | States: "1. applyPendingSalesAdjustments() ← MUST be first (adjusts totals), 2. updatePrecomputedFields() ← Uses adjusted totals" |
| `repodocs/AUTOMATION_IMPL.md` | "Function 1: update_precomputed_fields" | Documents that `total_sales = SUM(gmv) from all videos` - no mention of preserving adjustments |
| `EXECUTION_PLAN.md` | Task 8.3.1a (line 1440) | States: "IMPORTANT: Must be called BEFORE updatePrecomputedFields and updateLeaderboardRanks per RPCMigrationFixIMPL.md call sequence" |
| `EXECUTION_PLAN.md` | Task 8.4.3a (line 1502) | Test requirement: "verify adjustment reflected in total_sales AND in leaderboard rank" |
| `SchemaFinalv2.md` | Section 1.2 users Table (lines 142-143) | Documents 5 Leaderboard fields: `leaderboard_rank`, `total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units` |
| `SchemaFinalv2.md` | Section 1.8 tier_checkpoints Table (line 304) | States: "sales_in_period - Sales in checkpoint period (sales mode only, includes manual adjustments)" |
| `Loyalty.md` | "Total Sales Queries" section | States: "users.total_sales now includes applied adjustments" |
| `Loyalty.md` | "Checkpoint Period Sales" section | States: "Checkpoint calculations use: users.checkpoint_sales_current + users.manual_adjustments_total" |
| `BugFixes/RPCMigrationFix.md` | Function 3: apply_pending_sales_adjustments | Shows code adds to total_sales: `total_sales = total_sales + adj.total_amount` |
| `20251211163010_add_phase8_rpc_functions.sql` | Lines 41-42 | Current buggy code: `total_sales = COALESCE((SELECT SUM(gmv) FROM videos ...), 0)` |

### Key Evidence

**Evidence 1:** Design Contradiction in Call Sequence
- Source: AUTOMATION_IMPL.md, "Call Sequence" section
- Quote: "1. applyPendingSalesAdjustments() ← MUST be first (adjusts totals), 2. updatePrecomputedFields() ← Uses adjusted totals"
- Implication: The documented design says `updatePrecomputedFields` should USE the adjusted totals, not OVERWRITE them

**Evidence 2:** Total Sales Should Include Adjustments
- Source: Loyalty.md, "Total Sales Queries" section
- Quote: "users.total_sales now includes applied adjustments"
- Implication: The business requirement is that total_sales includes manual adjustments

**Evidence 3:** Checkpoint Calculations Formula
- Source: Loyalty.md, "Checkpoint Period Sales" section
- Quote: "Checkpoint calculations use: users.checkpoint_sales_current + users.manual_adjustments_total"
- Implication: The pattern for including adjustments is: base value + manual_adjustments

**Evidence 4:** Test Requirement
- Source: EXECUTION_PLAN.md, Task 8.4.3a (line 1502)
- Quote: "verify adjustment reflected in total_sales AND in leaderboard rank"
- Implication: Tests expect total_sales to reflect the adjustment after the full call sequence

---

## 4. Root Cause Analysis

**Root Cause:** The `update_precomputed_fields` RPC function sets `total_sales = SUM(videos.gmv)` which OVERWRITES any value previously set by `apply_pending_sales_adjustments`, instead of preserving the manual adjustment component stored in `manual_adjustments_total`.

**Contributing Factors:**
1. Design disconnect between documented call sequence ("uses adjusted totals") and actual implementation (overwrites totals)
2. The two functions (`apply_pending_sales_adjustments` and `update_precomputed_fields`) were likely developed without coordination
3. `apply_pending_sales_adjustments` adds to `total_sales` incrementally, assuming it won't be overwritten
4. `update_precomputed_fields` recalculates from scratch, not knowing about the previous step

**How it was introduced:** During implementation of Task 8.2.3-rpc, the `update_precomputed_fields` function was designed to calculate totals from videos only. The call sequence design (adjustments first, then precomputed fields) was added later without updating the function to preserve adjustments.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Data integrity | Manual adjustments silently lost after daily sync | High |
| Leaderboard accuracy | Users with manual adjustments ranked incorrectly | High |
| Tier calculations | Users may be wrongly promoted/demoted | High |
| Admin trust | Admin enters adjustments but they have no effect | Medium |
| User experience | Creators don't see their bonus/correction reflected | Medium |

**Business Risk Summary:** For clients using manual adjustments (offline sales, bonuses, refund corrections), all adjustments are silently erased during the daily sync. This defeats the purpose of the adjustment feature and can lead to incorrect tier placements, wrong leaderboard rankings, and creator complaints.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211163010_add_phase8_rpc_functions.sql`

```sql
-- Lines 38-52: Update aggregation fields
UPDATE users u
SET
  total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
  total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
  checkpoint_sales_current = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
  checkpoint_units_current = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
  -- ... engagement fields ...
WHERE u.client_id = p_client_id
  AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));
```

**Current Behavior:**
- `total_sales` is set to `SUM(gmv)` from videos only
- `total_units` is set to `SUM(units_sold)` from videos only
- `manual_adjustments_total` and `manual_adjustments_units` are NOT included
- Any value previously in `total_sales`/`total_units` (including adjustments) is overwritten

#### Current Data Flow

```
apply_pending_sales_adjustments(client_id)
         |
         v
total_sales = total_sales + adjustment_amount  ← Adjustment applied
manual_adjustments_total = manual_adjustments_total + adjustment_amount
         |
         v
update_precomputed_fields(client_id)
         |
         v
total_sales = SUM(videos.gmv)  ← OVERWRITES! Adjustment lost
         |
         v
update_leaderboard_ranks(client_id)
         |
         v
Ranks calculated using WRONG total_sales (without adjustments)
```

---

## 7. Proposed Fix

#### Approach

Modify `update_precomputed_fields` to include `manual_adjustments_total` and `manual_adjustments_units` in the calculations for `total_sales` and `total_units` respectively. This preserves the adjustments applied by `apply_pending_sales_adjustments`.

#### Changes Required

**File:** New migration `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql`

**IMPORTANT - Migration Requirements:**
- Migration MUST include the **complete function definition** using `CREATE OR REPLACE FUNCTION`
- MUST include `LANGUAGE plpgsql` and `SECURITY DEFINER` clauses
- MUST include `GRANT EXECUTE ON FUNCTION update_precomputed_fields(UUID, UUID[]) TO service_role`
- MUST preserve all existing functionality (projected_tier, next_tier fields, etc.)

**Before (lines 41-42):**
```sql
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
```

**After:**
```sql
total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_units, 0),
```

**Explanation:**
1. `SUM(gmv)` gives the total from video sales (Cruva data)
2. `+ COALESCE(u.manual_adjustments_total, 0)` adds the manual adjustments
3. The COALESCE handles NULL values safely (defaults to 0)
4. This matches the documented design: "total_sales now includes applied adjustments"

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql` | CREATE | New migration with complete CREATE OR REPLACE FUNCTION |

### Dependency Graph

```
supabase/migrations/[new]_fix_precomputed_fields_adjustments.sql
├── replaces: update_precomputed_fields function in database
├── called by: syncRepository.updatePrecomputedFields()
│   └── called by: daily-automation route
│   └── called by: tierCalculationService
└── affects: users.total_sales, users.total_units columns
```

---

## 9. Data Flow Analysis

#### Before Fix

```
apply_pending_sales_adjustments()
         |
         v
users.total_sales = 0 + 500 (adjustment) = 500
users.manual_adjustments_total = 0 + 500 = 500
         |
         v
update_precomputed_fields()
         |
         v
users.total_sales = SUM(videos.gmv) = 0  ← OVERWRITES!
         |
         v
Final: total_sales = 0 (WRONG - adjustment lost)
```

#### After Fix

```
apply_pending_sales_adjustments()
         |
         v
users.total_sales = 0 + 500 (adjustment) = 500
users.manual_adjustments_total = 0 + 500 = 500
         |
         v
update_precomputed_fields()
         |
         v
users.total_sales = SUM(videos.gmv) + manual_adjustments_total = 0 + 500 = 500
         |
         v
Final: total_sales = 500 (CORRECT - adjustment preserved)
```

#### Data Transformation Steps

1. **Step 1 (apply_pending_sales_adjustments):** Adds pending adjustments to both `total_sales` and `manual_adjustments_total`
2. **Step 2 (update_precomputed_fields):** Recalculates `total_sales` as `SUM(videos) + manual_adjustments_total`
3. **Step 3 (update_leaderboard_ranks):** Uses correct `total_sales` for ranking

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
daily-automation/route.ts (GET handler)
│
├─► tierCalculationService.runCheckpointEvaluation(clientId)
│   └── Orchestrates the call sequence
│
├─► syncRepository.applyPendingSalesAdjustments(clientId)
│   └── Calls supabase.rpc('apply_pending_sales_adjustments')
│   └── Sets total_sales += adjustment, manual_adjustments_total += adjustment
│
├─► syncRepository.updatePrecomputedFields(clientId)
│   └── Calls supabase.rpc('update_precomputed_fields')
│   └── ⚠️ BUG IS HERE: Overwrites total_sales with just SUM(videos.gmv)
│
└─► syncRepository.updateLeaderboardRanks(clientId)
    └── Calls supabase.rpc('update_leaderboard_ranks')
    └── Uses total_sales for ranking (wrong value due to bug)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `update_precomputed_fields` RPC | Contains the bug - overwrites instead of preserving |
| Database | `apply_pending_sales_adjustments` RPC | Works correctly - adds to totals |
| Database | `users` table | Has `total_sales` and `manual_adjustments_total` columns |
| Repository | `syncRepository.updatePrecomputedFields()` | Calls the buggy RPC |
| Service | `tierCalculationService` | Orchestrates the call sequence |
| API Route | `daily-automation` | Entry point for cron job |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `users` | `total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units` | All columns exist and have correct types |
| `videos` | `gmv`, `units_sold`, `user_id`, `client_id` | Source for video aggregations |

#### Schema Check

```sql
-- Verify users table has all required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('total_sales', 'total_units', 'manual_adjustments_total', 'manual_adjustments_units');
```

#### Data Migration Required?
- [x] No - schema already supports fix
- The columns exist and have correct types; only the RPC function logic needs to change

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | N/A | None - fix is backend only |
| Leaderboard | N/A | None - fix is backend only, data will now be correct |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `users.total_sales` | Videos only | Videos + adjustments | No - value becomes more accurate |
| `users.total_units` | Videos only | Videos + adjustments | No - value becomes more accurate |

### Frontend Changes Required?
- [x] No - frontend already handles this correctly
- The bug is in the RPC function; once fixed, frontend receives correct data automatically

---

## 13. Alternative Solutions Considered

#### Option A: Don't call update_precomputed_fields after adjustments
- **Description:** Skip `update_precomputed_fields` when adjustments were applied
- **Pros:** Quick fix, no SQL changes
- **Cons:** Video aggregations wouldn't be updated, breaks the documented flow, other fields wouldn't be recalculated
- **Verdict:** Rejected - breaks other functionality

#### Option B: Modify apply_pending_sales_adjustments to update manual_adjustments only
- **Description:** Don't touch total_sales in adjustments function; let precomputed_fields handle everything
- **Pros:** Single source of truth for total_sales calculation
- **Cons:** Requires changing the adjustments function, complicates the logic, doesn't match documented design
- **Verdict:** Rejected - more invasive, doesn't match design intent

#### Option C: Include manual_adjustments in update_precomputed_fields (Selected)
- **Description:** Modify `total_sales = SUM(videos) + manual_adjustments_total`
- **Pros:**
  - Minimal change (2 lines)
  - Matches documented design ("total_sales includes adjustments")
  - Matches Loyalty.md pattern for checkpoint calculations
  - Preserves existing call sequence
- **Cons:** Slight increase in query complexity
- **Verdict:** Selected - simplest fix that matches design intent

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails to apply | Low | Medium | Test with `supabase db reset` locally first |
| Breaks other callers of RPC | Low | Low | Function signature unchanged, only internal fix |
| Double-counting adjustments | Low | High | Verify adjustment is in manual_adjustments_total, not added twice |
| Permission loss if GRANT omitted | Medium | High | Migration MUST include `GRANT EXECUTE ... TO service_role` |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Function signature unchanged |
| Database | No | CREATE OR REPLACE preserves function |
| Frontend | No | No changes needed, data becomes more accurate |

---

## 15. Testing Strategy

#### Unit Tests

Existing test will verify the fix:

**File:** `appcode/tests/integration/cron/daily-automation-metrics.test.ts`

Test Case 5 specifically tests the call sequence and should pass after fix:
```typescript
it('should reflect sales adjustments in total_sales and leaderboard rank', async () => {
  // Create user with total_sales = 0
  // Create sales_adjustment with amount = 500
  // Call apply_pending_sales_adjustments
  // Call update_precomputed_fields
  // Call update_leaderboard_ranks
  // Expect total_sales = 500 (currently fails, gets 0)
});
```

#### Integration Tests

Full Phase 8 test suite will verify:
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/
```

#### Manual Verification Steps

1. [ ] Create a pending sales_adjustment with `amount` value
2. [ ] Call `apply_pending_sales_adjustments` RPC
3. [ ] Verify `users.total_sales` increased by adjustment amount
4. [ ] Call `update_precomputed_fields` RPC
5. [ ] Verify `users.total_sales` STILL includes the adjustment amount
6. [ ] Verify `users.manual_adjustments_total` equals the adjustment amount

#### Verification Commands

**Note:** `npx supabase db reset` is acceptable because this is a non-production environment with no data to preserve. For production environments, use targeted migration apply (`npx supabase migration up`) instead.

```bash
# Apply migration (non-production - db reset is acceptable)
cd /home/jorge/Loyalty/Rumi && npx supabase db reset

# Regenerate types (if needed)
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --local > lib/types/database.ts

# Run Test Case 5 specifically
npm test -- tests/integration/cron/daily-automation-metrics.test.ts --testNamePattern="sales adjustments"

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
  - File: `supabase/migrations/[timestamp]_fix_precomputed_fields_adjustments.sql`
  - Change: Complete CREATE OR REPLACE FUNCTION with fix
- [ ] **Step 2:** Apply migration
  - Command: `npx supabase db reset`
  - **Note:** `db reset` is acceptable because this is a non-production environment. For production, use `npx supabase migration up` instead.
- [ ] **Step 3:** Regenerate TypeScript types (if needed)
  - Command: `npx supabase gen types typescript --local > lib/types/database.ts`

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test -- tests/integration/cron/`
- [ ] Verify Test Case 5 now passes
- [ ] Update Phase8TestBugs.md to mark Bug 3 as FIXED
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.2.3-rpc | Create Phase 8 RPC migration | Contains the buggy function |
| Task 8.2.3a | Implement syncRepository.updatePrecomputedFields | Calls the buggy RPC |
| Task 8.4.3a | Test RPC function behaviors | Test Case 5 exposes this bug |

#### Updates Required

**Task 8.2.3-rpc:**
- Current AC: Migration applies cleanly, all 3 functions callable via `supabase.rpc()`
- Updated AC: No change needed - fix maintains same interface
- Notes: Bug was in implementation detail, not interface

#### New Tasks Created
- None - this is a bug fix for existing functionality

---

## 18. Definition of Done

- [ ] New migration file created with complete fixed RPC function
- [ ] Migration includes LANGUAGE plpgsql, SECURITY DEFINER, GRANT EXECUTE
- [ ] Migration applies cleanly with `npx supabase db reset`
- [ ] Type checker passes with no errors
- [ ] Test Case 5 in daily-automation-metrics.test.ts passes
- [ ] No regressions in other test suites
- [ ] Phase8TestBugs.md updated (Bug 3 marked FIXED)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `repodocs/AUTOMATION_IMPL.md` | "Call Sequence", "Function 1: update_precomputed_fields" | Documents intended call sequence and current implementation |
| `EXECUTION_PLAN.md` | Tasks 8.2.3-rpc, 8.3.1a, 8.4.3a | Related implementation tasks and test requirements |
| `SchemaFinalv2.md` | Section 1.2 users Table, Section 1.8 tier_checkpoints Table | Schema definitions showing fields and design intent |
| `Loyalty.md` | "Total Sales Queries", "Checkpoint Period Sales" | Business requirements for how adjustments should be included |
| `BugFixes/RPCMigrationFix.md` | Function 3: apply_pending_sales_adjustments | Shows how adjustments are applied (adds to totals) |
| `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql` | Lines 38-52 | Current buggy implementation |
| `BugFixes/Phase8TestBugs.md` | Bug 3 section | Bug tracking documentation |

### Reading Order for External Auditor

1. **First:** `repodocs/AUTOMATION_IMPL.md` - "Call Sequence" section - Understand the intended order of operations
2. **Second:** `Loyalty.md` - "Total Sales Queries" and "Checkpoint Period Sales" sections - Understand business requirement
3. **Third:** `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql` - Lines 38-52 - See current buggy implementation
4. **Fourth:** This document - "Proposed Fix" section - See the solution

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
1. Updated all source document references to include relative paths (e.g., `repodocs/AUTOMATION_IMPL.md`, `BugFixes/RPCMigrationFix.md`)

**Concerns Addressed:**
1. Added explicit note in §15 and §16 that `npx supabase db reset` is acceptable because this is a non-production environment with no data to preserve
