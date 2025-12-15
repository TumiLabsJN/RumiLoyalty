# Rewards Table tier_eligibility: 'all' Constraint Violation - Fix Documentation

**Bug ID:** BUG-REWARDS-TIER-ELIGIBILITY-ALL
**Created:** 2025-12-15
**Status:** Implemented
**Severity:** Medium
**Related Tasks:** Task 8.4.3a (RPC function behaviors tests)
**Linked Bugs:** Phase8TestBugs.md Bug 4

---

## 1. Project Context

This is the Rumi Loyalty Platform, a multi-tenant SaaS application for managing creator loyalty programs. Built with Next.js 14, TypeScript, and Supabase (PostgreSQL), it enables brands to track TikTok creator performance, manage tier-based rewards, and run missions/challenges.

The bug affects the **test infrastructure** for Phase 8 (Automation & Cron Jobs), specifically test files that validate RPC functions for mission progress creation and updates. The rewards table has a stricter `tier_eligibility` constraint than the missions table, and test code incorrectly uses `'all'` as a value for rewards.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with RPC functions for bulk operations

---

## 2. Bug Summary

**What's happening:** Test code attempts to insert rewards with `tier_eligibility: 'all'`, which violates the rewards table's CHECK constraint. The constraint only allows specific tier values ('tier_1' through 'tier_6').

**What should happen:** Test code should use a valid tier value like `'tier_1'` for rewards. The `'all'` value is only valid for the missions table.

**Impact:** 4 test cases in `daily-automation-metrics.test.ts` fail with constraint violation errors, preventing validation of critical RPC functions (mission progress creation and updates).

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| SchemaFinalv2.md | Section 2, rewards Table (3. rewards) | `tier_eligibility` column defined with constraint: "Options: 'tier_1' through 'tier_6'" - does NOT include 'all' |
| SchemaFinalv2.md | Section 2, missions Table (1. missions) | `tier_eligibility` column defined with constraint: "Options: 'all', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'" - DOES include 'all' |
| SchemaFinalv2.md | Section 2, rewards Constraints | SQL constraint: `CHECK (tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'))` |
| SchemaFinalv2.md | Section 2, missions Constraints | SQL constraint: `CHECK (tier_eligibility = 'all' OR tier_eligibility IN ('tier_1', ...))` |
| initial_schema.sql | rewards table definition (lines 279-280) | `tier_eligibility VARCHAR(50) NOT NULL CHECK (tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'))` |
| initial_schema.sql | missions table definition (lines 337-338) | `tier_eligibility VARCHAR(50) NOT NULL CHECK (tier_eligibility = 'all' OR tier_eligibility IN ('tier_1', ...))` |
| daily-automation-metrics.test.ts | Test Case 6 (lines 750-766) | Inline reward insert with `tier_eligibility: 'all'` |
| daily-automation-metrics.test.ts | Test Case 8 (lines 938-946) | Inline reward insert with `tier_eligibility: 'all'` |
| daily-automation-metrics.test.ts | Test Case 9 (lines 1016-1024) | Inline reward insert with `tier_eligibility: 'all'` |
| daily-automation-metrics.test.ts | Test Case 10 (lines 1112-1120) | Inline reward insert with `tier_eligibility: 'all'` |
| tests/helpers/factories.ts | createTestReward function (line 243) | Default value: `tier_eligibility: overrides.tier_eligibility \|\| 'all'` - ❌ BUG |
| tests/fixtures/factories.ts | createTestReward function (line 423) | Default value: `tierEligibility ?? 'tier_1'` - ✅ CORRECT (has comment explaining constraint) |
| Phase8TestBugs.md | Bug 4 section | Documents this bug as "Test Code Uses Invalid tier_eligibility: 'all' on Rewards Table" |
| Repo-wide grep | All test files | Confirmed: Only 4 inline inserts + 1 factory default use 'all' on rewards. All other 'all' refs are on missions (valid). |

### Key Evidence

**Evidence 1:** Rewards table constraint is stricter than missions table
- Source: SchemaFinalv2.md, rewards Table Constraints + initial_schema.sql lines 279-280
- Implication: The rewards table was intentionally designed to NOT accept 'all' as a tier_eligibility value. Rewards are always tied to a specific tier, while missions can target all tiers.

**Evidence 2:** Test code uses inline inserts bypassing potential factory validation
- Source: daily-automation-metrics.test.ts, lines 751-764, 938-946, 1016-1024, 1112-1120
- Implication: The tests don't use the `createTestReward()` factory helper, instead doing inline `.insert()` calls with invalid data.

**Evidence 3:** Factory helper also has the same bug
- Source: factories.ts, line 243
- Implication: Even if tests used the factory, they would still fail unless explicitly overriding `tier_eligibility`. The factory default is incorrect.

**Evidence 4:** Design intent documented in SchemaFinalv2.md
- Source: SchemaFinalv2.md, rewards Table, tier_eligibility column comment
- Implication: "Tier targeting (exact match)" - rewards must match a specific tier, not all tiers. This is different from missions which can have "Tier targeting" with 'all' option.

---

## 4. Root Cause Analysis

**Root Cause:** Test author assumed rewards.tier_eligibility has the same constraint as missions.tier_eligibility, but they have different CHECK constraints by design.

**Contributing Factors:**
1. **Similar column names:** Both tables have `tier_eligibility` columns, but with different allowed values
2. **Factory helper bug:** `createTestReward()` defaults to `'all'` which would fail on any usage
3. **Inline inserts:** Test cases bypass factory and use direct inserts, replicating the same mistake
4. **No TypeScript enforcement:** The database types allow any string, not enforcing the CHECK constraint at compile time

**How it was introduced:** The test author was creating tests for mission progress functionality. Since missions CAN have `tier_eligibility: 'all'`, they likely assumed the same applied to rewards. This is a logical mistake given the similar naming.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | None - test bug only | None |
| Data integrity | None - production code unaffected | None |
| Test coverage | 4 test cases fail, blocking validation of mission progress RPC functions | Medium |
| CI/CD pipeline | Test failures may block deployments | Medium |

**Business Risk Summary:** This is a test infrastructure bug with no production impact. However, it blocks validation of critical RPC functions that handle mission progress creation and updates, which could mask actual production bugs.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

```typescript
// Line 751-764 - Test Case 6 (and similar pattern in 8, 9, 10)
const { data: reward, error: rewardError } = await supabase
  .from('rewards')
  .insert({
    client_id: testClientId,
    type: 'gift_card',
    value_data: { amount: 50 },
    tier_eligibility: 'all',  // ⚠️ BUG: Invalid for rewards table
    redemption_type: 'instant',
    redemption_frequency: 'unlimited',
    redemption_quantity: null,
    enabled: true,
  })
  .select('id')
  .single();
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts`

```typescript
// Line 238-248
const defaultData: RewardInsert = {
  id,
  client_id: overrides.client_id,
  type: overrides.type || 'gift_card',
  value_data: overrides.value_data || { amount: 50 },
  tier_eligibility: overrides.tier_eligibility || 'all',  // ⚠️ BUG: Invalid default
  redemption_type: overrides.redemption_type || 'instant',
  redemption_frequency: overrides.redemption_frequency || 'unlimited',
  redemption_quantity: overrides.redemption_frequency && overrides.redemption_frequency !== 'unlimited' ? (overrides.redemption_quantity || 1) : null,
  enabled: overrides.enabled ?? true,
};
```

**Current Behavior:**
- Test cases 6, 8, 9, 10 fail with: `new row for relation "rewards" violates check constraint "rewards_tier_eligibility_check"`
- Factory helper would fail if used without explicit `tier_eligibility` override

#### Current Data Flow

```
Test Setup
    ↓
Insert reward with tier_eligibility: 'all'
    ↓
PostgreSQL CHECK constraint validation
    ↓
CONSTRAINT VIOLATION → Test fails before RPC testing
```

---

## 7. Proposed Fix

#### Approach

Change all `tier_eligibility: 'all'` values to `tier_eligibility: 'tier_1'` in both the inline test inserts and the factory helper default. The value `'tier_1'` is valid and appropriate for testing purposes (lowest tier, most inclusive).

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts`

**Before:**
```typescript
tier_eligibility: overrides.tier_eligibility || 'all',
```

**After:**
```typescript
tier_eligibility: overrides.tier_eligibility || 'tier_1',
```

**Explanation:** Factory default should use a valid tier value. Using 'tier_1' (Bronze) is sensible as it's the entry-level tier.

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

**Before (4 locations - lines 757, 943, 1021, 1117):**
```typescript
tier_eligibility: 'all',
```

**After:**
```typescript
tier_eligibility: 'tier_1',
```

**Explanation:** Use valid tier value that passes the CHECK constraint. The specific tier doesn't matter for these tests as they're testing mission progress creation, not tier filtering.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/tests/helpers/factories.ts` | MODIFY | Line 243: Change default tier_eligibility from 'all' to 'tier_1' |
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | MODIFY | Lines 757, 943, 1021, 1117: Change tier_eligibility from 'all' to 'tier_1' |

### Dependency Graph

```
factories.ts
├── imports from: @supabase/supabase-js, crypto, database types
├── imported by: All integration test files
└── affects: Any test using createTestReward() without tier_eligibility override

daily-automation-metrics.test.ts
├── imports from: factories.ts (createTestUser, createTestClient, etc.)
├── imported by: None (test file)
└── affects: Test suite results only
```

---

## 9. Data Flow Analysis

#### Before Fix

```
Test Insert Request → PostgreSQL
        ↓                  ↓
tier_eligibility: 'all'    CHECK constraint
        ↓                  ↓
       N/A              'all' NOT IN ('tier_1'...'tier_6')
        ↓                  ↓
    VIOLATION          Test FAILS
```

#### After Fix

```
Test Insert Request → PostgreSQL
        ↓                  ↓
tier_eligibility: 'tier_1' CHECK constraint
        ↓                  ↓
    VALID              'tier_1' IN ('tier_1'...'tier_6')
        ↓                  ↓
    INSERT             Test PROCEEDS to RPC validation
```

#### Data Transformation Steps

1. **Step 1:** Test creates reward with `tier_eligibility: 'tier_1'`
2. **Step 2:** PostgreSQL validates against CHECK constraint - PASSES
3. **Step 3:** Reward record created, test proceeds to create mission and test RPC

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
Jest Test Runner (daily-automation-metrics.test.ts)
│
├─► Test Case 6: create_mission_progress for tier_eligibility=all
│   ├── supabase.from('rewards').insert() ← ⚠️ BUG IS HERE
│   ├── supabase.from('missions').insert()
│   └── supabase.rpc('create_mission_progress_for_eligible_users')
│
├─► Test Case 8: create_mission_progress idempotent
│   └── Same pattern ← ⚠️ BUG IS HERE
│
├─► Test Case 9: update_mission_progress aggregates correctly
│   └── Same pattern ← ⚠️ BUG IS HERE
│
└─► Test Case 10: update_mission_progress marks completed
    └── Same pattern ← ⚠️ BUG IS HERE
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | rewards table CHECK constraint | Enforces valid tier_eligibility values |
| Test Helper | factories.ts createTestReward() | Has incorrect default |
| Test File | daily-automation-metrics.test.ts | Uses inline inserts with invalid value |
| RPC | create_mission_progress_for_eligible_users | Never reached due to earlier failure |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| rewards | tier_eligibility | CHECK constraint allows only 'tier_1' through 'tier_6' |
| missions | tier_eligibility | CHECK constraint allows 'all' OR 'tier_1' through 'tier_6' |

#### Schema Check

```sql
-- Verify rewards constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'rewards'::regclass AND conname LIKE '%tier%';
-- Expected: tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')

-- Verify missions constraint allows 'all'
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'missions'::regclass AND conname LIKE '%tier%';
-- Expected: tier_eligibility = 'all' OR tier_eligibility IN (...)
```

#### Data Migration Required?
- [x] No - schema already supports fix (constraint is correct, test code is wrong)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| None | N/A | None - test infrastructure only |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [x] No - this is a test-only bug

---

## 13. Alternative Solutions Considered

#### Option A: Change Database Constraint (Rejected)
- **Description:** Modify rewards table to accept 'all' like missions table
- **Pros:** Test code would work as-is
- **Cons:** Violates intentional design - rewards should be tier-specific
- **Verdict:** ❌ Rejected - would change production schema to accommodate test bug

#### Option B: Fix Test Code (Selected)
- **Description:** Change tier_eligibility from 'all' to 'tier_1' in test code
- **Pros:** Follows existing schema design, minimal change, test intent preserved
- **Cons:** None significant
- **Verdict:** ✅ Selected - correct approach, test code should match schema constraints

#### Option C: Add TypeScript Type Guards
- **Description:** Create stricter types that enforce tier_eligibility values at compile time
- **Pros:** Would catch this at compile time
- **Cons:** Significant effort, types already exist in database.ts
- **Verdict:** ❌ Rejected - good for future, but overkill for this fix

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Change breaks other tests | Low | Low | All other tests either use factory with override or different values |
| Incorrect tier affects test logic | Low | Low | Tests validate mission progress creation, not tier-based filtering |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | N/A |
| Database | No | N/A |
| Frontend | No | N/A |
| Other Tests | No | Factory change uses valid default |

---

## 15. Testing Strategy

#### Unit Tests

No new unit tests needed - existing tests will pass after fix.

#### Integration Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

The fix will enable these existing tests to run:
- Test Case 6: create_mission_progress for tier_eligibility=all
- Test Case 8: create_mission_progress idempotent
- Test Case 9: update_mission_progress aggregates correctly
- Test Case 10: update_mission_progress marks completed

#### Manual Verification Steps

1. [ ] Apply changes to both files
2. [ ] Run `npm test -- --testPathPattern=daily-automation-metrics`
3. [ ] Verify Test Cases 6, 8, 9, 10 pass
4. [ ] Run full test suite: `npm test -- tests/integration/cron/`

#### Verification Commands

```bash
# Run specific test file
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=daily-automation-metrics

# Run full Phase 8 test suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/

# Expected: All 87 tests pass
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Fix factory helper default
  - File: `appcode/tests/helpers/factories.ts`
  - Change: Line 243 - `'all'` → `'tier_1'`
- [ ] **Step 2:** Fix Test Case 6 reward insert
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: Line 757 - `'all'` → `'tier_1'`
- [ ] **Step 3:** Fix Test Case 8 reward insert
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: Line 943 - `'all'` → `'tier_1'`
- [ ] **Step 4:** Fix Test Case 9 reward insert
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: Line 1021 - `'all'` → `'tier_1'`
- [ ] **Step 5:** Fix Test Case 10 reward insert
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: Line 1117 - `'all'` → `'tier_1'`

#### Post-Implementation
- [ ] Run tests: `npm test -- --testPathPattern=daily-automation-metrics`
- [ ] Run full suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md to mark Bug 4 as FIXED

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.3a | Test RPC function behaviors | Test cases 6-10 were blocked by this bug |

#### Updates Required

**Task 8.4.3a:**
- Current AC: All 10 test cases MUST pass
- Updated AC: No change needed
- Notes: Bug fix enables test cases 6, 8, 9, 10 to execute

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [x] All code changes implemented per "Proposed Fix" section
- [ ] All existing tests pass (77/87 - remaining failures are different bugs)
- [x] Test cases 6, 9 in daily-automation-metrics.test.ts pass (Bug 4 fix verified)
- [ ] Full Phase 8 test suite (87 tests) passes (77/87 - separate bugs remain)
- [x] Phase8TestBugs.md updated to mark Bug 4 as FIXED
- [x] This document status updated to "Implemented"

**Note:** Test Cases 8 and 10 failures are NOT related to Bug 4 (tier_eligibility constraint). They have different root causes (missing current_tier, mission insert failure) that were masked by the constraint error.

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 2: rewards Table (3. rewards) | Defines tier_eligibility constraint for rewards |
| SchemaFinalv2.md | Section 2: missions Table (1. missions) | Shows missions allows 'all' (contrast with rewards) |
| initial_schema.sql | rewards table CREATE statement | Contains actual CHECK constraint SQL |
| initial_schema.sql | missions table CREATE statement | Contains actual CHECK constraint SQL for comparison |
| Phase8TestBugs.md | Bug 4 section | Original bug documentation |
| EXECUTION_PLAN.md | Task 8.4.3a | Test requirements for RPC functions |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - rewards Table - Shows allowed tier_eligibility values
2. **Second:** SchemaFinalv2.md - missions Table - Shows 'all' IS valid here (explains the confusion)
3. **Third:** Phase8TestBugs.md - Bug 4 section - Original bug report
4. **Fourth:** daily-automation-metrics.test.ts - Lines 750-765 - See actual buggy code

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Implemented
