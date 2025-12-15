# Test Case 8 & 10 Invalid target_unit - Fix Documentation

**Bug ID:** BUG-TEST-CASE-8-10-INVALID-TARGET-UNIT
**Created:** 2025-12-15
**Status:** Implemented
**Severity:** Low (Test Bug)
**Related Tasks:** Task 8.4.3a (RPC function behaviors tests)
**Linked Bugs:** Phase8TestBugs.md Bug 6, Bug 7

---

## 1. Project Context

This is the Rumi Loyalty Platform, a multi-tenant SaaS application for managing creator loyalty programs. Built with Next.js 14, TypeScript, and Supabase (PostgreSQL).

The bug affects **Test Case 8** and **Test Case 10** in `daily-automation-metrics.test.ts`. Both tests create missions with `mission_type: 'videos'` but incorrectly set `target_unit: 'videos'`, which violates the database CHECK constraint that only allows `'dollars'`, `'units'`, or `'count'`.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Jest
**Bug Type:** TEST BUG (not production code)

---

## 2. Bug Summary

**What's happening:** Test Case 8 and Test Case 10 fail because the mission insert uses `target_unit: 'videos'`, which violates the `missions_target_unit_check` constraint. The database rejects the insert with error: `new row for relation "missions" violates check constraint "missions_target_unit_check"`.

**What should happen:** Tests should use valid `target_unit` values per the schema CHECK constraint: `'dollars'`, `'units'`, or `'count'`. For `mission_type: 'videos'` (counting number of videos), the correct `target_unit` is `'count'`.

**Impact:** Test Cases 8 and 10 fail, preventing validation of the `create_mission_progress_for_eligible_users` RPC idempotency and the `update_mission_progress` RPC completion marking.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| initial_schema.sql | missions table (lines 325-357) | CHECK constraint: `target_unit IN ('dollars', 'units', 'count')` |
| SchemaFinalv2.md | Section 2.1 missions table (line 375) | Confirms: `target_unit VARCHAR(20) NOT NULL DEFAULT 'dollars' CHECK (target_unit IN ('dollars', 'units', 'count'))` |
| SchemaFinalv2.md | Section 2.1 missions table (line 373) | `mission_type` options: 'sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle' |
| daily-automation-metrics.test.ts | Test Case 6 (line 779) | **PASSES** - Uses `target_unit: 'dollars'` with `mission_type: 'sales_dollars'` |
| daily-automation-metrics.test.ts | Test Case 8 (line 966) | **FAILS** - Uses `target_unit: 'videos'` (INVALID) with `mission_type: 'videos'` |
| daily-automation-metrics.test.ts | Test Case 9 (line 1048) | **PASSES** - Uses `target_unit: 'dollars'` with `mission_type: 'sales_dollars'` |
| daily-automation-metrics.test.ts | Test Case 10 (line 1146) | **FAILS** - Uses `target_unit: 'videos'` (INVALID) with `mission_type: 'videos'` |
| Phase8TestBugs.md | Bug 6 & Bug 7 | Documented as failing tests needing investigation |

### Key Evidence

**Evidence 1:** CHECK constraint definition
- Source: initial_schema.sql, missions table definition (line 334-335)
- Actual constraint:
```sql
target_unit VARCHAR(20) NOT NULL DEFAULT 'dollars'
    CHECK (target_unit IN ('dollars', 'units', 'count')),
```
- Implication: Only three valid values are allowed. `'videos'` is NOT a valid value.

**Evidence 2:** Test Case 8 uses invalid value
- Source: daily-automation-metrics.test.ts, Test Case 8 (lines 964-966)
```typescript
mission_type: 'videos',
target_value: 5,
target_unit: 'videos',  // INVALID - 'videos' not in CHECK constraint
```
- Implication: Mission insert fails with constraint violation.

**Evidence 3:** Test Case 10 uses same invalid value
- Source: daily-automation-metrics.test.ts, Test Case 10 (lines 1144-1146)
```typescript
mission_type: 'videos',
target_value: 2,
target_unit: 'videos',  // INVALID - 'videos' not in CHECK constraint
```
- Implication: Same failure as Test Case 8.

**Evidence 4:** Test Case 6 uses valid value and passes
- Source: daily-automation-metrics.test.ts, Test Case 6 (lines 777-779)
```typescript
mission_type: 'sales_dollars',
target_value: 1000,
target_unit: 'dollars',  // VALID
```
- Implication: Demonstrates correct pattern - tests using valid `target_unit` values pass.

**Evidence 5:** SchemaFinalv2.md documents the correct mapping
- Source: SchemaFinalv2.md, Section 2.1 missions table (line 375)
- `target_unit` purpose: "Unit type for target_value - Options: 'dollars' (sales mode), 'units' (units mode), 'count' (engagement missions)"
- Implication: For `mission_type: 'videos'` (an engagement mission counting videos), `target_unit` should be `'count'`.

---

## 4. Root Cause Analysis

**Root Cause:** Test code incorrectly assumes `target_unit` should semantically match `mission_type`. The test author set `target_unit: 'videos'` thinking it should describe what's being counted, but the schema only allows generic unit types: `'dollars'`, `'units'`, `'count'`.

**Contributing Factors:**
1. **Intuitive but wrong assumption:** `mission_type: 'videos'` suggests `target_unit: 'videos'` but schema uses generic units
2. **No test helper validation:** Test factories don't validate `target_unit` against allowed values
3. **Error not immediately visible:** Earlier test (error check addition) was needed to surface this constraint violation

**How it was introduced:** Copy-paste or intuitive coding without referencing SchemaFinalv2.md constraint definitions.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production code | None - this is a test bug | None |
| Test coverage | Cannot verify RPC idempotency and completion marking | Low |
| Developer confidence | 2 tests fail, obscuring whether production code works | Low |

**Business Risk Summary:** This is a test code bug with no production impact. However, it prevents validation of critical RPC functionality (mission progress creation idempotency and completion detection).

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

**Test Case 8 - Current Code (lines 959-972):**
```typescript
// missions table DOES allow tier_eligibility='all'
const { data: mission, error: missionError } = await supabase
  .from('missions')
  .insert({
    client_id: testClientId,
    title: 'Idempotent Test Mission',
    display_name: 'Test',
    description: 'Test',
    mission_type: 'videos',
    target_value: 5,
    target_unit: 'videos',  // <-- BUG: 'videos' not allowed by CHECK constraint
    reward_id: reward!.id,
    tier_eligibility: 'all',
    display_order: 1,
    enabled: true,
    activated: true,
  })
  .select('id')
  .single();

expect(missionError).toBeNull();  // FAILS: missionError contains constraint violation
```

**Test Case 10 - Current Code (lines 1137-1154):**
```typescript
// missions table DOES allow tier_eligibility='all'
const { data: mission } = await supabase
  .from('missions')
  .insert({
    client_id: testClientId,
    title: 'Easy Mission',
    display_name: 'Post 2 Videos',
    description: 'Post 2 videos',
    mission_type: 'videos',
    target_value: 2,
    target_unit: 'videos',  // <-- BUG: 'videos' not allowed by CHECK constraint
    reward_id: reward!.id,
    tier_eligibility: 'all',
    display_order: 1,
    enabled: true,
    activated: true,
  })
  .select('id')
  .single();
```

**Current Behavior:**
- Mission insert fails with CHECK constraint violation
- `missionError` contains: `"new row for relation \"missions\" violates check constraint \"missions_target_unit_check\""`
- Test fails at assertion `expect(missionError).toBeNull()` (Test Case 8) or when accessing `mission!.id` (Test Case 10)

#### Current Data Flow

```
Test Setup
    │
    ├─► Create user (success)
    │
    ├─► Create reward (success)
    │
    └─► Create mission with target_unit: 'videos'
        │
        └─► PostgreSQL CHECK constraint
            │
            └─► REJECTED: 'videos' NOT IN ('dollars', 'units', 'count')
```

---

## 7. Proposed Fix

#### Approach

Change `target_unit: 'videos'` to `target_unit: 'count'` in both Test Case 8 and Test Case 10. The value `'count'` is semantically correct for engagement missions (counting videos, views, likes).

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

**Test Case 8 - Before (line 966):**
```typescript
target_unit: 'videos',
```

**Test Case 8 - After:**
```typescript
target_unit: 'count',
```

**Explanation:** For `mission_type: 'videos'` which counts number of videos posted, the generic unit type is `'count'`. This satisfies the CHECK constraint.

---

**Test Case 10 - Before (line 1146):**
```typescript
target_unit: 'videos',
```

**Test Case 10 - After:**
```typescript
target_unit: 'count',
```

**Explanation:** Same fix - `'count'` is the correct `target_unit` for engagement missions.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | MODIFY | Change line 966: `'videos'` → `'count'` |
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | MODIFY | Change line 1146: `'videos'` → `'count'` |

### Dependency Graph

```
daily-automation-metrics.test.ts
├── imports from: @supabase/supabase-js, test helpers
├── imported by: none (test file)
└── affects: Test suite pass/fail status
```

---

## 9. Data Flow Analysis

#### Before Fix

```
Test Code                 PostgreSQL
    │                         │
    └─► INSERT mission        │
        target_unit='videos'  │
            │                 │
            └────────────────►│ CHECK constraint
                              │ target_unit IN ('dollars','units','count')
                              │
                              └─► REJECT (constraint violation)
```

#### After Fix

```
Test Code                 PostgreSQL
    │                         │
    └─► INSERT mission        │
        target_unit='count'   │
            │                 │
            └────────────────►│ CHECK constraint
                              │ target_unit IN ('dollars','units','count')
                              │
                              └─► ACCEPT (valid value)
```

#### Data Transformation Steps

1. **Step 1:** Test code prepares mission INSERT with `target_unit: 'count'`
2. **Step 2:** PostgreSQL validates CHECK constraint - `'count'` is valid
3. **Step 3:** Mission row created successfully
4. **Step 4:** Test continues to RPC calls

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
Jest Test Runner
│
├─► Test Case 8: 'should not create duplicate rows when called twice'
│   │
│   ├─► createTestUser() ✅
│   │
│   ├─► INSERT rewards ✅
│   │
│   ├─► INSERT missions
│   │   └── ⚠️ BUG: target_unit='videos' rejected
│   │
│   └─► RPC create_mission_progress_for_eligible_users (never reached)
│
└─► Test Case 10: 'should set status=completed when current_value >= target_value'
    │
    ├─► createTestUser() ✅
    │
    ├─► INSERT rewards ✅
    │
    ├─► INSERT missions
    │   └── ⚠️ BUG: target_unit='videos' rejected
    │
    └─► RPC update_mission_progress (never reached)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | missions table CHECK constraint | Enforces valid target_unit values |
| Test Code | Test Case 8, line 966 | Provides invalid value |
| Test Code | Test Case 10, line 1146 | Provides invalid value |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| missions | target_unit | CHECK constraint limits to 'dollars', 'units', 'count' |

#### Schema Check

```sql
-- Verify CHECK constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%target_unit%';

-- Expected: missions_target_unit_check with IN ('dollars', 'units', 'count')
```

#### Data Migration Required?
- [x] No - schema already supports fix (just need correct test value)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| N/A | N/A | None - this is a test bug |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?
- [x] No - this is a test-only fix

---

## 13. Alternative Solutions Considered

#### Option A: Change target_unit to 'count' (Selected)
- **Description:** Use the correct generic unit type for engagement missions
- **Pros:**
  - Follows schema design intent
  - Consistent with SchemaFinalv2.md documentation
  - Simple one-line change per test
- **Cons:** None
- **Verdict:** ✅ Selected - correct per schema design

#### Option B: Add 'videos' to CHECK constraint
- **Description:** Modify schema to allow 'videos' as a target_unit
- **Pros:** Would make test code work as-is
- **Cons:**
  - Violates SOT (SchemaFinalv2.md says only 3 values)
  - Would require production migration
  - Schema design uses generic units deliberately
- **Verdict:** ❌ Rejected - would deviate from SOT

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fix breaks other tests | Low | Low | Grep shows only 2 occurrences of `target_unit: 'videos'` |
| Wrong unit type | Low | Low | `'count'` documented as correct for engagement missions |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | N/A (test code only) |
| Database | No | N/A (test code only) |
| Frontend | No | N/A (test code only) |

---

## 15. Testing Strategy

#### Unit Tests

N/A - this IS the test code being fixed.

#### Integration Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

After fix, Test Case 8 and Test Case 10 should pass:
- Test Case 8: Validates `create_mission_progress_for_eligible_users` RPC idempotency
- Test Case 10: Validates `update_mission_progress` RPC completion marking

#### Manual Verification Steps

1. [x] Identify all occurrences of `target_unit: 'videos'` (found 2: lines 966, 1146)
2. [ ] Change both to `target_unit: 'count'`
3. [ ] Run Test Case 8 in isolation
4. [ ] Run Test Case 10 in isolation
5. [ ] Run full test suite

#### Verification Commands

```bash
# Verify only 2 occurrences exist
grep -n "target_unit: 'videos'" appcode/tests/integration/cron/daily-automation-metrics.test.ts
# Expected: lines 966, 1146

# Run Test Case 8
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts -t "Test Case 8"

# Run Test Case 10
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts -t "Test Case 10"

# Run full Phase 8 test suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Change Test Case 8 target_unit
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Line: 966
  - Change: `target_unit: 'videos'` → `target_unit: 'count'`

- [ ] **Step 2:** Change Test Case 10 target_unit
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Line: 1146
  - Change: `target_unit: 'videos'` → `target_unit: 'count'`

#### Post-Implementation
- [ ] Run Test Case 8: `npm test -- -t "Test Case 8"`
- [ ] Run Test Case 10: `npm test -- -t "Test Case 10"`
- [ ] Run full Phase 8 suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md - mark Bug 6 and Bug 7 as fixed

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.3a | RPC function behaviors tests | Test Case 8 validates idempotency |
| Task 8.4.3a | RPC function behaviors tests | Test Case 10 validates completion marking |

#### Updates Required

**Task 8.4.3a:**
- Current AC: Tests verify RPC behavior
- Updated AC: No change needed - fix enables tests to run correctly
- Notes: Tests were correct in intent, just had invalid test data

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [x] Line 966 changed from `'videos'` to `'count'`
- [x] Line 1146 changed from `'videos'` to `'count'`
- [x] Test Case 8 passes
- [x] Test Case 10 passes
- [x] Full Phase 8 test suite passes (or only unrelated failures remain) - 85/87 passing
- [x] Phase8TestBugs.md updated - Bug 6 and Bug 7 marked fixed
- [x] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 2.1 missions table (lines 366-412) | Defines target_unit CHECK constraint |
| initial_schema.sql | missions table (lines 325-357) | Actual CHECK constraint implementation |
| daily-automation-metrics.test.ts | Test Case 6 (lines 770-810) | Shows correct pattern with `target_unit: 'dollars'` |
| daily-automation-metrics.test.ts | Test Case 8 (lines 922-1000) | Failing test with invalid target_unit |
| daily-automation-metrics.test.ts | Test Case 10 (lines 1100-1180) | Failing test with invalid target_unit |
| Phase8TestBugs.md | Bug 6, Bug 7 | Documents these as known failing tests |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 2.1 missions table - Defines allowed target_unit values
2. **Second:** initial_schema.sql - missions table - Shows actual CHECK constraint
3. **Third:** daily-automation-metrics.test.ts - Test Case 6 - Shows working pattern
4. **Fourth:** daily-automation-metrics.test.ts - Test Cases 8, 10 - Shows the bugs

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Implemented
