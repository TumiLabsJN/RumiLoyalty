# Reward Factory Constraint Violation - Fix Documentation

**Bug ID:** BUG-REWARD-FACTORY-CONSTRAINT
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High (blocks 25 Phase 8 tests)
**Related Tasks:** Task 8.4.6, 8.4.7, 8.4.8, 8.4.3 (Test Cases 6-10)
**Linked Bugs:** Phase8TestBugs.md (Bug 1)

---

## Audit Feedback Incorporated

**Audit 1 (2025-12-15):** APPROVE WITH CHANGES
- ✅ Added migration to fix schema defaults (`redemption_quantity DEFAULT NULL`)
- ✅ Verified no production INSERT paths exist (only SELECT queries on rewards table)
- ✅ Added Gate to verify current column defaults before migration

---

## 1. Project Context

This is a loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system manages rewards for TikTok creators including gift cards, discounts, commission boosts, and physical gifts.

The bug affects **test helper code** - specifically the `createTestReward()` factory function and direct reward inserts in test files. These inserts violate a database CHECK constraint that enforces valid `redemption_frequency`/`redemption_quantity` combinations.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers per ARCHITECTURE.md

---

## 2. Bug Summary

**What's happening:** The `createTestReward()` factory and direct reward inserts in tests don't specify `redemption_frequency` or `redemption_quantity`. The database has default values (`'unlimited'` and `1` respectively) that violate the `check_quantity_with_frequency` constraint.

**What should happen:** Test code should provide valid combinations:
- `redemption_frequency: 'unlimited'` with `redemption_quantity: null`
- OR `redemption_frequency: 'one-time'/'monthly'/'weekly'` with `redemption_quantity: 1-10`

**Impact:**
- 25 Phase 8 tests fail before any assertions run
- Cannot validate tier promotion/demotion reward visibility
- Cannot validate scheduled activation
- Cannot validate mission progress creation

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| initial_schema.sql | Lines 284-286, rewards table | `redemption_frequency DEFAULT 'unlimited'`, `redemption_quantity DEFAULT 1` |
| initial_schema.sql | Lines 293-297, CHECK constraint | `check_quantity_with_frequency` requires NULL quantity for unlimited frequency |
| SchemaFinalv2.md | Lines 478-479 | Documents `redemption_frequency` and `redemption_quantity` fields |
| SchemaFinalv2.md | Lines 557-560 | Documents the CHECK constraint logic |
| factories.ts | Lines 238-246 | `createTestReward()` doesn't set `redemption_frequency` or `redemption_quantity` |
| daily-automation-metrics.test.ts | Lines 751-762 | Direct insert also missing these fields |
| tier-promotion-rewards.test.ts | Uses `createTestReward()` | All 5 tests fail with constraint error |
| tier-demotion-rewards.test.ts | Uses `createTestReward()` | All 7 tests fail with constraint error |
| scheduled-activation.test.ts | Uses `createTestReward()` | All 8 tests fail with constraint error |

### Key Evidence

**Evidence 1:** Database defaults conflict with CHECK constraint
- Source: initial_schema.sql, lines 284-297
- Finding:
  ```sql
  redemption_frequency VARCHAR(50) DEFAULT 'unlimited'
  redemption_quantity INTEGER DEFAULT 1

  CONSTRAINT check_quantity_with_frequency CHECK (
      (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
      (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
  )
  ```
- Implication: Default combo ('unlimited', 1) violates constraint - 'unlimited' requires NULL quantity

**Evidence 2:** Factory doesn't override problematic defaults
- Source: factories.ts, lines 238-246
- Current code:
  ```typescript
  const defaultData: RewardInsert = {
    id,
    client_id: overrides.client_id,
    type: overrides.type || 'gift_card',
    value_data: overrides.value_data || { amount: 50 },
    tier_eligibility: overrides.tier_eligibility || 'all',
    redemption_type: overrides.redemption_type || 'instant',
    enabled: overrides.enabled ?? true,
    // Missing: redemption_frequency, redemption_quantity
  };
  ```
- Implication: Database defaults apply, causing constraint violation

**Evidence 3:** Direct inserts in tests have same problem
- Source: daily-automation-metrics.test.ts, lines 751-762
- Code:
  ```typescript
  .insert({
    client_id: testClientId,
    type: 'gift_card',
    value_data: { amount: 50 },
    tier_eligibility: 'all',
    redemption_type: 'instant',
    enabled: true,
    // Missing: redemption_frequency, redemption_quantity
  })
  ```
- Implication: 5 additional test cases fail (Test Cases 6-10)

**Evidence 4:** SchemaFinalv2.md documents correct behavior
- Source: SchemaFinalv2.md, lines 478-479, 557-560
- Finding: Clearly states `redemption_quantity` should be 1-10 OR NULL for unlimited
- Implication: Schema design is correct; test code doesn't follow it

---

## 4. Root Cause Analysis

**Root Cause:** The database schema has conflicting defaults - `redemption_frequency` defaults to `'unlimited'` while `redemption_quantity` defaults to `1`, but the CHECK constraint requires `redemption_quantity` to be NULL when frequency is `'unlimited'`.

**Contributing Factors:**
1. Test factory was written before the CHECK constraint was added (or without awareness of it)
2. Direct inserts in tests copied the factory pattern
3. Schema defaults work individually but conflict when combined
4. No integration tests caught this until full suite run

**How it was introduced:** The CHECK constraint `check_quantity_with_frequency` was added to enforce business logic, but the column defaults weren't updated to be compatible. Test code was written to the pre-constraint behavior.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Test coverage | 25 tests blocked, can't validate reward visibility logic | High |
| Phase 8 completion | Cannot mark Phase 8 complete with failing tests | High |
| Production code | NOT affected - production reward creation goes through services | None |
| CI/CD | Would block deployments if tests run in pipeline | High |

**Business Risk Summary:** This is a test-only bug that blocks validation of reward visibility and scheduled activation features. Production code is not affected since reward creation goes through service layer with proper validation.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts`
```typescript
// Lines 238-246: createTestReward defaultData
const defaultData: RewardInsert = {
  id,
  client_id: overrides.client_id,
  type: overrides.type || 'gift_card',
  value_data: overrides.value_data || { amount: 50 },
  tier_eligibility: overrides.tier_eligibility || 'all',
  redemption_type: overrides.redemption_type || 'instant',
  enabled: overrides.enabled ?? true,
  // BUG: Missing redemption_frequency and redemption_quantity
};
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`
```typescript
// Lines 751-762: Direct reward insert
const { data: reward, error: rewardError } = await supabase
  .from('rewards')
  .insert({
    client_id: testClientId,
    type: 'gift_card',
    value_data: { amount: 50 },
    tier_eligibility: 'all',
    redemption_type: 'instant',
    enabled: true,
    // BUG: Missing redemption_frequency and redemption_quantity
  })
```

**Current Behavior:**
- Factory/inserts rely on database defaults
- Database defaults: `redemption_frequency='unlimited'`, `redemption_quantity=1`
- CHECK constraint rejects this combination
- Error: `new row for relation "rewards" violates check constraint "check_quantity_with_frequency"`

### Current Data Flow

```
createTestReward() or direct insert
        ↓
No redemption_frequency/quantity specified
        ↓
PostgreSQL applies defaults: 'unlimited' + 1
        ↓
CHECK constraint: ('unlimited' AND quantity=1) → FAIL
        ↓
Error: check_quantity_with_frequency violation
```

---

## 7. Proposed Fix

### Approach

**Two-part fix:**
1. **Fix schema defaults** - Add migration to change `redemption_quantity DEFAULT NULL` (root cause fix)
2. **Fix test code** - Update factory and direct inserts to be explicit (belt-and-suspenders)

This eliminates the invalid default combination at the source AND makes test code explicit.

### Part 1: Schema Migration (Root Cause Fix)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_fix_reward_quantity_default.sql`

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
-- ============================================================================

ALTER TABLE rewards
ALTER COLUMN redemption_quantity SET DEFAULT NULL;

COMMENT ON COLUMN rewards.redemption_quantity IS
  'Number of redemptions allowed per period. NULL for unlimited frequency, 1-10 for limited frequencies.';
```

### Part 2: Test Code Fixes (Explicit Values)

### Changes Required

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts`

**Before:**
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

**After:**
```typescript
const defaultData: RewardInsert = {
  id,
  client_id: overrides.client_id,
  type: overrides.type || 'gift_card',
  value_data: overrides.value_data || { amount: 50 },
  tier_eligibility: overrides.tier_eligibility || 'all',
  redemption_type: overrides.redemption_type || 'instant',
  redemption_frequency: overrides.redemption_frequency || 'unlimited',
  redemption_quantity: overrides.redemption_frequency === 'unlimited' || !overrides.redemption_frequency ? null : (overrides.redemption_quantity || 1),
  enabled: overrides.enabled ?? true,
};
```

**Explanation:** Sets `redemption_frequency` to 'unlimited' by default, and `redemption_quantity` to null when frequency is 'unlimited', satisfying the CHECK constraint.

---

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

Need to add `redemption_frequency: 'unlimited', redemption_quantity: null` to all 5 direct inserts at lines:
- 751-762 (Test Case 6)
- ~860 (Test Case 7)
- ~934 (Test Case 8)
- ~1010 (Test Case 9)
- ~1104 (Test Case 10)

**Before (each insert):**
```typescript
.insert({
  client_id: testClientId,
  type: 'gift_card',
  value_data: { amount: 50 },
  tier_eligibility: 'all',
  redemption_type: 'instant',
  enabled: true,
})
```

**After (each insert):**
```typescript
.insert({
  client_id: testClientId,
  type: 'gift_card',
  value_data: { amount: 50 },
  tier_eligibility: 'all',
  redemption_type: 'instant',
  redemption_frequency: 'unlimited',
  redemption_quantity: null,
  enabled: true,
})
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[timestamp]_fix_reward_quantity_default.sql` | CREATE | Fix schema default |
| `appcode/tests/helpers/factories.ts` | MODIFY | Add `redemption_frequency` and `redemption_quantity` defaults |
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | MODIFY | Add fields to 5 direct inserts |
| `appcode/lib/types/database.ts` | REGENERATE | Run after migration |

### Dependency Graph

```
supabase/migrations/[timestamp]_fix_reward_quantity_default.sql (NEW)
├── fixes: rewards.redemption_quantity DEFAULT NULL
└── enables: inserts without explicit qty to use valid default

tests/helpers/factories.ts
├── exports: createTestReward()
├── imported by: tier-promotion-rewards.test.ts
├── imported by: tier-demotion-rewards.test.ts
├── imported by: scheduled-activation.test.ts
└── affects: 20 tests via factory

tests/integration/cron/daily-automation-metrics.test.ts
├── direct inserts (5 locations)
└── affects: 5 tests (Test Cases 6-10)
```

---

## 9. Data Flow Analysis

### Before Fix

```
Test code → Insert reward (no freq/qty)
     ↓
PostgreSQL → Apply defaults ('unlimited', 1)
     ↓
CHECK constraint → ('unlimited' AND qty=1) → REJECT
     ↓
Error thrown → Test fails in setup
```

### After Fix

```
Test code → Insert reward (freq='unlimited', qty=null)
     ↓
PostgreSQL → Values provided, no defaults applied
     ↓
CHECK constraint → ('unlimited' AND qty=NULL) → PASS
     ↓
Insert succeeds → Test can run
```

---

## 10. Call Chain Mapping

### Affected Call Chain

```
Test File (e.g., tier-promotion-rewards.test.ts)
│
├─► beforeEach() / test setup
│   └── createTestReward(supabase, { client_id })
│       └── ⚠️ BUG IS HERE: Missing freq/qty defaults
│
└─► Supabase .insert()
    └── PostgreSQL CHECK constraint
        └── FAIL: check_quantity_with_frequency
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | check_quantity_with_frequency | Enforces valid combinations |
| Database | Column defaults | Provides invalid combo |
| Test Helper | createTestReward() | Doesn't override defaults |
| Test File | Direct inserts | Same problem as factory |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| rewards | redemption_frequency | VARCHAR(50), DEFAULT 'unlimited' |
| rewards | redemption_quantity | INTEGER, DEFAULT 1 |

### Schema Check

```sql
-- Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_quantity_with_frequency';

-- Test valid combo
INSERT INTO rewards (client_id, type, redemption_frequency, redemption_quantity)
VALUES ('...', 'gift_card', 'unlimited', NULL);  -- Should succeed

-- Test invalid combo (current default behavior)
INSERT INTO rewards (client_id, type, redemption_frequency, redemption_quantity)
VALUES ('...', 'gift_card', 'unlimited', 1);  -- Should fail
```

### Data Migration Required?
- [ ] Yes
- [x] No - this is test code only, no production data affected

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| N/A | N/A | None - test code only |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [ ] Yes
- [x] No - test code fix only

---

## 13. Alternative Solutions Considered

### Option A: Fix test code only
- **Description:** Update factory and direct inserts to specify valid freq/qty combinations
- **Pros:** Minimal change, follows schema design, explicit test data
- **Cons:** Leaves invalid defaults in schema; future inserts could still fail
- **Verdict:** ❌ Rejected after audit - doesn't fix root cause

### Option B: Fix schema defaults + test code (Selected)
- **Description:** Change `redemption_quantity` DEFAULT to NULL AND update test code
- **Pros:** Fixes root cause; future-proofs admin/seed paths; test code is explicit
- **Cons:** Requires migration
- **Verdict:** ✅ Selected - eliminates invalid default combo at source

### Option C: Remove the CHECK constraint
- **Description:** Drop `check_quantity_with_frequency` constraint
- **Pros:** Would allow any combination
- **Cons:** Loses data integrity protection; could allow invalid data in production
- **Verdict:** ❌ Rejected - constraint is correct and valuable

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Factory change breaks other tests | Low | Medium | Factory is additive; existing overrides still work |
| Miss some direct inserts | Low | Low | Run full test suite to verify |
| Logic error in quantity calculation | Low | Medium | Simple conditional; test immediately |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| Test Factory | No | Additive defaults; existing overrides work |
| Test Files | No | Adding fields doesn't break existing behavior |
| Production | No | Test code only |

---

## 15. Testing Strategy

### Unit Tests

N/A - this fixes test code itself

### Integration Tests

**Verification:** Run the previously failing tests:

```bash
# Should pass after fix
npm test -- tier-promotion-rewards
npm test -- tier-demotion-rewards
npm test -- scheduled-activation
npm test -- daily-automation-metrics
```

### Manual Verification Steps

1. [ ] Verify current column default is 1
2. [ ] Create migration file
3. [ ] Apply migration with `supabase db reset`
4. [ ] Regenerate types
5. [ ] Edit `factories.ts` with new defaults
6. [ ] Edit `daily-automation-metrics.test.ts` (5 locations)
7. [ ] Run `npm test -- tests/integration/cron/`
8. [ ] Verify 87/87 tests pass (was 62/87)

### Verification Commands

```bash
# Run full Phase 8 test suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/

# Expected: 87 tests, 0 failures (was 25 failures)
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

### Implementation Steps

**Part 1: Schema Migration**
- [ ] **Gate 1:** Verify current column default
  - Command: `grep "redemption_quantity" supabase/migrations/20251128173733_initial_schema.sql`
  - Expected: `redemption_quantity INTEGER DEFAULT 1`
- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/[timestamp]_fix_reward_quantity_default.sql`
  - Change: `ALTER COLUMN redemption_quantity SET DEFAULT NULL`
- [ ] **Step 2:** Apply migration
  - Command: `supabase db reset`
- [ ] **Step 3:** Regenerate types
  - Command: `npx supabase gen types typescript --local 2>/dev/null > lib/types/database.ts`

**Part 2: Test Code Fixes**
- [ ] **Step 4:** Update `createTestReward()` in factories.ts
  - File: `appcode/tests/helpers/factories.ts`
  - Change: Add `redemption_frequency` and `redemption_quantity` defaults
- [ ] **Step 5:** Update direct inserts in daily-automation-metrics.test.ts
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: Add `redemption_frequency: 'unlimited', redemption_quantity: null` to 5 inserts

### Post-Implementation
- [ ] Run tests: `npm test -- tests/integration/cron/`
- [ ] Verify 87/87 pass (0 failures)
- [ ] Update Phase8TestBugs.md checklist

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.6 | Tier promotion reward visibility | Tests blocked by constraint error |
| Task 8.4.7 | Tier demotion soft-delete | Tests blocked by constraint error |
| Task 8.4.8 | Scheduled activation | Tests blocked by constraint error |
| Task 8.4.3 | Daily automation metrics (TC 6-10) | Tests blocked by constraint error |

### Updates Required

After fix:
- All above tasks should show passing tests
- Phase 8 can be marked complete once all 87 tests pass

### New Tasks Created (if any)
- None - this is a bug fix

---

## 18. Definition of Done

- [ ] Migration created: `[timestamp]_fix_reward_quantity_default.sql`
- [ ] Migration applied: `supabase db reset`
- [ ] Types regenerated: `database.ts` updated
- [ ] `createTestReward()` updated with `redemption_frequency` and `redemption_quantity` defaults
- [ ] All 5 direct inserts in `daily-automation-metrics.test.ts` updated
- [ ] All 87 Phase 8 tests pass
- [ ] Phase8TestBugs.md Bug 1 checkbox marked complete
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| initial_schema.sql | Lines 284-297 | CHECK constraint and defaults |
| SchemaFinalv2.md | Lines 478-479, 557-560 | Business rules for redemption fields |
| factories.ts | Lines 232-259 | Factory function to fix |
| daily-automation-metrics.test.ts | Lines 751-762, ~860, ~934, ~1010, ~1104 | Direct inserts to fix |

### Reading Order for External Auditor

1. **First:** initial_schema.sql - Lines 293-297 - Shows the CHECK constraint that's being violated
2. **Second:** initial_schema.sql - Lines 284-286 - Shows conflicting defaults
3. **Third:** factories.ts - Lines 238-246 - Shows factory missing the fields
4. **Fourth:** SchemaFinalv2.md - Lines 557-560 - Confirms constraint is intentional

---

**Document Version:** 1.2
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Implemented ✅
