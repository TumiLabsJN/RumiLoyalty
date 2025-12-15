# RPC projected_tier_at_checkpoint Type Mismatch - Fix Documentation

**Bug ID:** BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.4.9 (Manual dry run), Task 8.2.3a (updatePrecomputedFields)
**Linked Bugs:** GAP-MANUAL-CSV-TEST (blocked by this bug)

---

## Audit Feedback Incorporated

**Audit 1 (2025-12-15):** APPROVE WITH CHANGES
- ✅ Added `USING projected_tier_at_checkpoint::text` for safe explicit cast
- ✅ Added documentation that `projected_tier_at_checkpoint` is a denormalized `tier_id` value (no FK)
- ✅ Emphasized execution order: migration first, then type regeneration

---

## 1. Project Context

This is a loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system tracks TikTok creator performance via daily CSV imports from CRUVA platform, calculates tier status, and manages reward redemptions.

The bug affects the **`update_precomputed_fields` RPC function** which is called during daily automation to update 13 precomputed user metrics. The function attempts to assign a VARCHAR value (`tier_id`) to a UUID column (`projected_tier_at_checkpoint`), causing a PostgreSQL type mismatch error.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers per ARCHITECTURE.md

---

## 2. Bug Summary

**What's happening:** The `update_precomputed_fields` RPC function in the database tries to set `projected_tier_at_checkpoint` (a UUID column) with the value of `tiers.tier_id` (a VARCHAR column like `'tier_1'`, `'tier_2'`). PostgreSQL rejects this with error code 42804: "column 'projected_tier_at_checkpoint' is of type uuid but expression is of type character varying".

**What should happen:** The RPC should either:
1. Select `tiers.id` (the UUID primary key) instead of `tiers.tier_id`, OR
2. The `projected_tier_at_checkpoint` column should be VARCHAR to match the `current_tier` column pattern

**Impact:**
- `manual-csv-upload.test.ts` Test Cases 3, 4, 5 fail (Task 8.4.9 blocked)
- `daily-automation-metrics.test.ts` tests that call this RPC would fail
- Production daily cron would fail if it calls `updatePrecomputedFields()` from syncRepository

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| initial_schema.sql | Line 90, users table definition | `projected_tier_at_checkpoint UUID` - column is UUID type |
| initial_schema.sql | Lines 37-52, tiers table definition | `id UUID PRIMARY KEY`, `tier_id VARCHAR(50)` - tiers has both UUID `id` and VARCHAR `tier_id` |
| initial_schema.sql | Line 71, users table | `current_tier VARCHAR(50) DEFAULT 'tier_1'` - current_tier stores VARCHAR like `tier_id` |
| add_phase8_rpc_functions.sql | Lines 56-70, update_precomputed_fields | RPC selects `t.tier_id` (VARCHAR) for `projected_tier_at_checkpoint` (UUID) |
| SchemaFinalv2.md | Lines 144, Precomputed fields | Lists `projected_tier_at_checkpoint` without specifying type |
| SchemaFinalv2.md | Line 137 | `current_tier - VARCHAR(50) DEFAULT 'tier_1'` - consistent with VARCHAR pattern |
| SchemaFinalv2.md | Line 262 | `tier_id - VARCHAR(50) NOT NULL - Internal ID: 'tier_1' through 'tier_6'` |
| Loyalty.md | Line 2194 | `projected_tier_at_checkpoint - What tier current performance would result in` - no type specified |
| syncRepository.ts | Lines 294-314 | `updatePrecomputedFields()` calls the RPC via `supabase.rpc('update_precomputed_fields', ...)` |
| RPCMigrationFix.md | Section 6, Current State | Documents the RPC function creation but doesn't catch type mismatch |
| manual-csv-upload.test.ts | Test Case 3 | Test fails with error code 42804 - type mismatch |

### Key Evidence

**Evidence 1:** Schema inconsistency between `projected_tier_at_checkpoint` and `current_tier`
- Source: initial_schema.sql, lines 71 and 90
- Finding: `current_tier` is VARCHAR(50), but `projected_tier_at_checkpoint` is UUID
- Implication: These fields serve the same purpose (storing tier identifier) but have different types

**Evidence 2:** RPC selects wrong column
- Source: add_phase8_rpc_functions.sql, lines 58-68
- Code: `SET projected_tier_at_checkpoint = (SELECT t.tier_id FROM tiers t WHERE ...)`
- Finding: `tier_id` is VARCHAR(50) like `'tier_1'`, but column expects UUID
- Implication: RPC would need to select `t.id` instead, OR column type needs to change

**Evidence 3:** Test failure confirms bug exists in database
- Source: manual-csv-upload.test.ts test run
- Error: `{"code": "42804", "message": "column \"projected_tier_at_checkpoint\" is of type uuid but expression is of type character varying"}`
- Implication: This is a database-level bug, not a test code issue

**Evidence 4:** Pattern established by `current_tier` field
- Source: initial_schema.sql line 71, SchemaFinalv2.md line 137
- Finding: `current_tier` stores `tier_id` values like `'tier_1'` (VARCHAR)
- Implication: `projected_tier_at_checkpoint` should follow the same pattern for consistency

---

## 4. Root Cause Analysis

**Root Cause:** The `projected_tier_at_checkpoint` column was defined as UUID in the schema, but should have been VARCHAR(50) to match the `current_tier` field pattern which stores `tier_id` values (not UUID primary keys).

**Contributing Factors:**
1. SchemaFinalv2.md lists `projected_tier_at_checkpoint` without specifying its type explicitly
2. The initial_schema.sql defined it as UUID without cross-referencing how tiers are identified elsewhere
3. RPCMigrationFix.md created the RPC function assuming the column would accept `tier_id` values
4. No integration tests were run against the actual database before now to catch the mismatch

**How it was introduced:** Design oversight during schema creation. The schema author may have assumed `projected_tier_at_checkpoint` would reference the tiers table's UUID primary key, but the RPC implementer correctly used `tier_id` (the human-readable identifier like `'tier_1'`).

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Daily cron functionality | `updatePrecomputedFields()` fails, blocking entire daily sync | Critical |
| User dashboard data | Precomputed fields not updated = stale dashboard data | High |
| Tier calculations | `projected_tier_at_checkpoint` cannot be set, breaking tier projections | High |
| Task 8.4.9 completion | Blocked - cannot validate manual CSV upload pipeline | High |

**Business Risk Summary:** The daily automation cron relies on `update_precomputed_fields` RPC. If this function fails, all 13 precomputed fields stop updating, dashboards show stale data, and tier projections break. This is a production-blocking bug.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251128173733_initial_schema.sql`
```sql
-- Lines 87-91: users table precomputed fields
    -- Precomputed fields: Checkpoint progress (3 fields)
    checkpoint_sales_current DECIMAL(10, 2),
    checkpoint_units_current INTEGER,
    projected_tier_at_checkpoint UUID,  -- BUG: Should be VARCHAR(50)
```

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211163010_add_phase8_rpc_functions.sql`
```sql
-- Lines 56-70: update_precomputed_fields RPC
  -- Update projected_tier_at_checkpoint based on vip_metric
  UPDATE users u
  SET projected_tier_at_checkpoint = (
    SELECT t.tier_id  -- VARCHAR(50) like 'tier_1', 'tier_2'
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
```

**Current Behavior:**
- RPC function attempts to assign `tier_id` (VARCHAR) to `projected_tier_at_checkpoint` (UUID)
- PostgreSQL rejects with error 42804
- All tests calling this RPC fail
- `syncRepository.updatePrecomputedFields()` throws error in production

### Current Data Flow

```
syncRepository.updatePrecomputedFields(clientId, userIds)
        ↓
supabase.rpc('update_precomputed_fields', params)
        ↓
PostgreSQL executes RPC function
        ↓
UPDATE users SET projected_tier_at_checkpoint = t.tier_id  -- VARCHAR
        ↓
ERROR 42804: Type mismatch (UUID column, VARCHAR value)
```

---

## 7. Proposed Fix

### Approach

Change the `projected_tier_at_checkpoint` column from UUID to VARCHAR(50) to match the `current_tier` field pattern. This requires a new migration that alters the column type. This approach is preferred because:

1. **Consistency:** Matches `current_tier` which also stores `tier_id` values
2. **Minimal change:** Only the schema needs to change, not the RPC logic
3. **Correct semantics:** `projected_tier_at_checkpoint` should store the same type of value as `current_tier`

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_fix_projected_tier_type.sql` (NEW)

**New Migration Content:**
```sql
-- ============================================================================
-- Fix projected_tier_at_checkpoint Column Type
-- ============================================================================
-- Bug: BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH
-- Issue: Column was UUID but should store tier_id values (VARCHAR) like current_tier
--
-- References:
--   - BugFixes/BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH.md
--   - SchemaFinalv2.md line 137 (current_tier is VARCHAR(50))
--   - SchemaFinalv2.md line 262 (tier_id is VARCHAR(50))
--
-- IMPORTANT: This field is a DENORMALIZED tier_id value (e.g., 'tier_1', 'tier_2').
-- It is NOT a foreign key to tiers.id. This matches the current_tier field pattern.
-- Both fields store tier_id strings for display/caching purposes, not referential integrity.
-- ============================================================================

-- Alter column type from UUID to VARCHAR(50)
-- Note: Column is expected to be NULL in all environments since the RPC was failing.
-- The explicit USING cast is added for safety in case any non-null UUID values exist.
ALTER TABLE users
ALTER COLUMN projected_tier_at_checkpoint TYPE VARCHAR(50)
USING projected_tier_at_checkpoint::text;

-- Add comment for documentation
COMMENT ON COLUMN users.projected_tier_at_checkpoint IS
  'Denormalized tier_id value (e.g., ''tier_1'', ''tier_2'') representing projected tier at next checkpoint. NOT a FK to tiers.id. Matches current_tier pattern per SchemaFinalv2.md.';
```

**Explanation:** This migration changes the column type from UUID to VARCHAR(50), matching the `current_tier` field. The RPC function already selects the correct value (`t.tier_id`), so no changes are needed there.

### Type Definitions (if applicable)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts`

After running `supabase gen types typescript`, the generated type will change:

```typescript
// Before (generated)
projected_tier_at_checkpoint: string | null  // UUID serializes as string anyway

// After (generated)
projected_tier_at_checkpoint: string | null  // VARCHAR also serializes as string
```

No functional change in TypeScript types - both UUID and VARCHAR serialize to `string`.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_fix_projected_tier_type.sql` | CREATE | New migration to alter column type |
| `appcode/lib/types/database.ts` | REGENERATE | Run `supabase gen types typescript` after migration |

### Dependency Graph

```
supabase/migrations/[timestamp]_fix_projected_tier_type.sql (NEW)
├── affects: users.projected_tier_at_checkpoint column
├── enables: update_precomputed_fields RPC to work
└── downstream: syncRepository.updatePrecomputedFields() will succeed
```

---

## 9. Data Flow Analysis

### Before Fix

```
syncRepository.updatePrecomputedFields(clientId)
        ↓
RPC: UPDATE users SET projected_tier_at_checkpoint = 'tier_1'
        ↓
PostgreSQL: ERROR - cannot assign VARCHAR to UUID column
        ↓
Function throws error, all precomputed fields NOT updated
```

### After Fix

```
syncRepository.updatePrecomputedFields(clientId)
        ↓
RPC: UPDATE users SET projected_tier_at_checkpoint = 'tier_1'
        ↓
PostgreSQL: SUCCESS - VARCHAR assigned to VARCHAR column
        ↓
All 13 precomputed fields updated correctly
```

### Data Transformation Steps

1. **Step 1:** Migration runs ALTER TABLE to change column type
2. **Step 2:** RPC function executes without type mismatch
3. **Step 3:** `projected_tier_at_checkpoint` stores `tier_id` values like `'tier_1'`

---

## 10. Call Chain Mapping

### Affected Call Chain

```
/api/cron/daily-automation (route.ts)
│
├─► syncRepository.processCruvaData()
│   └── Processes CSV and inserts videos
│
├─► syncRepository.updatePrecomputedFields(clientId)
│   ├── Calls RPC: update_precomputed_fields
│   └── ⚠️ BUG IS HERE: RPC fails on projected_tier_at_checkpoint
│
├─► syncRepository.updateLeaderboardRanks(clientId)
│   └── Updates leaderboard_rank field
│
└─► tierCalculationService.checkForPromotions(clientId)
    └── Checks for tier promotions
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | users.projected_tier_at_checkpoint | Wrong type (UUID instead of VARCHAR) |
| Database | update_precomputed_fields RPC | Correctly selects tier_id, but column rejects it |
| Repository | syncRepository.updatePrecomputedFields | Calls the failing RPC |
| API Route | /api/cron/daily-automation | Entry point that triggers the chain |
| Tests | manual-csv-upload.test.ts | Exposed the bug |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| users | projected_tier_at_checkpoint | Currently UUID, should be VARCHAR(50) |
| users | current_tier | VARCHAR(50) - pattern to follow |
| tiers | id (UUID), tier_id (VARCHAR) | Two different identifier columns |

### Schema Check

```sql
-- Verify current column type
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'projected_tier_at_checkpoint';

-- Expected before fix: data_type = 'uuid'
-- Expected after fix: data_type = 'character varying', character_maximum_length = 50
```

### Data Migration Required?
- [ ] Yes - describe migration
- [x] No - column should be NULL/empty since RPC was failing

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | appcode/app/dashboard | None - reads projected_tier_at_checkpoint as string anyway |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| projected_tier_at_checkpoint | UUID (null due to bug) | VARCHAR (e.g., 'tier_1') | No - both serialize to string |

### Frontend Changes Required?
- [ ] Yes - describe changes
- [x] No - frontend already handles string values

---

## 13. Alternative Solutions Considered

### Option A: Change RPC to select tiers.id (UUID) instead of tier_id
- **Description:** Modify the RPC to SELECT `t.id` instead of `t.tier_id`
- **Pros:** No schema change needed
- **Cons:** Inconsistent with `current_tier` pattern; would store UUID while `current_tier` stores `tier_id`; harder to debug/query manually
- **Verdict:** ❌ Rejected - creates inconsistency with `current_tier` field

### Option B: Change column type to VARCHAR(50) (Selected)
- **Description:** Alter `projected_tier_at_checkpoint` from UUID to VARCHAR(50)
- **Pros:** Consistent with `current_tier`; matches what RPC already does; easier manual queries
- **Cons:** Requires new migration
- **Verdict:** ✅ Selected - maintains consistency and requires minimal change

### Option C: Create foreign key to tiers table
- **Description:** Make `projected_tier_at_checkpoint` reference `tiers.id` with proper FK
- **Pros:** Referential integrity
- **Cons:** Complex; would require FK on (client_id, tier_id) composite; overkill for precomputed field
- **Verdict:** ❌ Rejected - over-engineering for a precomputed display field

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails on non-null UUID data | Low | Medium | Explicit `USING ::text` cast handles any existing UUIDs safely |
| TypeScript types out of sync | Low | Low | Regenerate types AFTER migration (execution order documented) |
| Existing NULL values cause issues | Low | Low | VARCHAR accepts NULL same as UUID |
| Loss of referential integrity | N/A | None | Field was never a FK; explicitly documented as denormalized tier_id |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | String type unchanged |
| Database | No | ALTER COLUMN is safe for NULL/empty column |
| Frontend | No | Already handles string values |

---

## 15. Testing Strategy

### Unit Tests

No new unit tests needed - existing tests will pass after fix.

### Integration Tests

**File:** `appcode/tests/integration/cron/manual-csv-upload.test.ts`

Test Case 3 will pass after fix:
```typescript
it('should update user precomputed fields after calling RPC', async () => {
  // ... setup ...

  const { error: rpcError } = await (supabase.rpc as Function)(
    'update_precomputed_fields',
    { p_client_id: testClientId, p_user_ids: null }
  );

  expect(rpcError).toBeNull();  // Will pass after fix
  // ... assertions ...
});
```

### Manual Verification Steps

1. [ ] Run migration on local Supabase: `supabase db push`
2. [ ] Verify column type changed: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='projected_tier_at_checkpoint'`
3. [ ] Run `manual-csv-upload.test.ts` - all tests should pass
4. [ ] Verify `projected_tier_at_checkpoint` contains values like `'tier_1'`

### Verification Commands

```bash
# Apply migration to local Supabase
cd /home/jorge/Loyalty/Rumi && supabase db push

# Regenerate TypeScript types
cd /home/jorge/Loyalty/Rumi/appcode && npx supabase gen types typescript --local > lib/types/database.ts

# Run affected tests
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- manual-csv-upload

# Type check
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

### Implementation Steps

**IMPORTANT: Execution Order Matters**
Steps 1-2 (migration) MUST complete before Step 3 (type regeneration). The generated types reflect the database schema, so the migration must be applied first.

- [ ] **Step 1:** Create new migration file
  - File: `supabase/migrations/[timestamp]_fix_projected_tier_type.sql`
  - Change: ALTER COLUMN projected_tier_at_checkpoint TYPE VARCHAR(50) USING projected_tier_at_checkpoint::text
- [ ] **Step 2:** Apply migration to local Supabase
  - Command: `supabase db push`
  - Verify: Check that migration completes without errors
- [ ] **Step 3:** Regenerate TypeScript types (AFTER migration)
  - Command: `npx supabase gen types typescript --local > lib/types/database.ts`
  - Note: Must run AFTER Step 2 so types reflect the new VARCHAR(50) column
- [ ] **Step 4:** Run tests to verify fix
  - Command: `npm test -- manual-csv-upload`

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Manual verification per Testing Strategy
- [ ] Update EXECUTION_PLAN.md Task 8.4.9 (can proceed after fix)

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.9 | Manual dry run | Blocked - tests fail due to RPC bug |
| Task 8.2.3a | updatePrecomputedFields | RPC created but broken; needs this fix |

### Updates Required

**Task 8.4.9:**
- Current status: Blocked by BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH
- After fix: Can complete `manual-csv-upload.test.ts` verification
- Notes: Fix RPC bug first, then re-run tests

**Task 8.2.3a:**
- Current status: Marked complete but RPC has bug
- After fix: RPC works correctly
- Notes: Add note about bug fix in completion note

### New Tasks Created (if any)
- None - this is a bug fix for existing functionality

---

## 18. Definition of Done

- [ ] Migration file created with ALTER COLUMN statement
- [ ] Migration applied to local Supabase successfully
- [ ] TypeScript types regenerated
- [ ] `manual-csv-upload.test.ts` passes all 6 tests
- [ ] Type checker passes with no errors
- [ ] All existing tests pass (no regressions)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| initial_schema.sql | Lines 37-52 (tiers), 87-91 (users precomputed) | Shows column definitions |
| add_phase8_rpc_functions.sql | Lines 56-70 | Shows RPC logic that fails |
| SchemaFinalv2.md | Lines 137, 144, 262 | Tier identifier patterns |
| Loyalty.md | Line 2194 | projected_tier_at_checkpoint purpose |
| RPCMigrationFix.md | Section 6 | Original RPC creation context |

### Reading Order for External Auditor

1. **First:** initial_schema.sql - Lines 87-91 - Shows `projected_tier_at_checkpoint UUID` definition
2. **Second:** initial_schema.sql - Lines 37-52 - Shows tiers table with `id UUID` and `tier_id VARCHAR`
3. **Third:** add_phase8_rpc_functions.sql - Lines 56-70 - Shows RPC selecting `tier_id` (wrong type)
4. **Fourth:** SchemaFinalv2.md - Line 137 - Shows `current_tier VARCHAR(50)` pattern to follow

---

**Document Version:** 1.2
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Implemented ✅
