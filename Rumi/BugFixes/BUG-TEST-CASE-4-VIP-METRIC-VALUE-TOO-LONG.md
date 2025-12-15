# Test Case 4 vip_metric Value Too Long - Fix Documentation

**Bug ID:** BUG-TEST-CASE-4-VIP-METRIC-VALUE-TOO-LONG
**Created:** 2025-12-15
**Status:** Implemented
**Severity:** Low (Test Bug)
**Related Tasks:** Task 8.4.3 (Daily automation metrics tests)
**Linked Bugs:** Phase8TestBugs.md Bug 5

---

## 1. Project Context

This is the Rumi Loyalty Platform, a multi-tenant SaaS application for managing creator loyalty programs. Built with Next.js 14, TypeScript, and Supabase (PostgreSQL).

The bug affects **Test Case 4** in `daily-automation-metrics.test.ts`, which is a **negative test** designed to verify that the `vip_metric` CHECK constraint correctly rejects invalid values. The test fails because it uses a value that exceeds the VARCHAR(10) length limit before the CHECK constraint can be evaluated.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Jest
**Bug Type:** TEST BUG (not production code)
**Test Type:** Negative test (expects failure)

---

## 2. Bug Summary

**What's happening:** Test Case 4 uses `vip_metric: 'invalid_value'` (13 characters) to test CHECK constraint validation. However, the `vip_metric` column is VARCHAR(10), so PostgreSQL rejects the value for length before evaluating the CHECK constraint. The test expects "violates check constraint" but receives "value too long for type character varying(10)".

**What should happen:** The test should use a value that fits within VARCHAR(10) but violates the CHECK constraint (`vip_metric IN ('units', 'sales')`), allowing the test to verify the CHECK constraint works correctly.

**Impact:** Test Case 4 fails with the wrong error, preventing validation that the CHECK constraint properly rejects invalid `vip_metric` values.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| initial_schema.sql | clients table (lines 25-26) | `vip_metric VARCHAR(10) NOT NULL DEFAULT 'units' CHECK (vip_metric IN ('units', 'sales'))` |
| SchemaFinalv2.md | Section 1.1 clients table (line 118) | `vip_metric VARCHAR(10) NOT NULL DEFAULT 'units'` - Options: 'units' or 'sales' |
| daily-automation-metrics.test.ts | Test Case 4 (lines 645-656) | Uses `'invalid_value'` (13 chars) to test CHECK constraint |
| daily-automation-metrics.test.ts | beforeEach (lines 67-70) | Creates client with `vip_metric: 'sales'` |
| daily-automation-metrics.test.ts | afterEach (lines 77-81) | Cleans up test data after each test |
| Phase8TestBugs.md | Bug 5 | Documented as failing test |

### Key Evidence

**Evidence 1:** Column definition with length and CHECK constraint
- Source: initial_schema.sql, lines 25-26
```sql
vip_metric VARCHAR(10) NOT NULL DEFAULT 'units'
    CHECK (vip_metric IN ('units', 'sales')),
```
- Implication: Two validations occur in order: (1) VARCHAR(10) length, (2) CHECK constraint. Length check happens first.

**Evidence 2:** Test uses value exceeding VARCHAR(10)
- Source: daily-automation-metrics.test.ts, line 650
```typescript
.update({ vip_metric: 'invalid_value' })  // 13 characters
```
- Implication: PostgreSQL rejects for length (10 max) before CHECK can be evaluated.

**Evidence 3:** Test expects CHECK constraint error
- Source: daily-automation-metrics.test.ts, line 655
```typescript
expect(updateError?.message).toContain('violates check constraint');
```
- Implication: Test assertion is correct for CHECK constraint testing, but wrong input prevents reaching that validation.

**Evidence 4:** Actual error received
- Source: Test failure output
```
Expected substring: "violates check constraint"
Received string:    "value too long for type character varying(10)"
```
- Implication: PostgreSQL validates length before CHECK constraint.

**Evidence 5:** Valid vip_metric values
- Source: SchemaFinalv2.md, line 118
- Options: 'units' (5 chars), 'sales' (5 chars)
- Implication: Any value ≤10 chars that is NOT 'units' or 'sales' will trigger CHECK constraint.

**Evidence 6:** Test is isolated (no downstream impact)
- Source: daily-automation-metrics.test.ts, lines 65-81
- `beforeEach`: Creates fresh client with `vip_metric: 'sales'`
- `afterEach`: Cleans up all test data
- Test expects UPDATE to FAIL (no data persists on failure)
- Implication: This is a negative test with no side effects.

---

## 4. Root Cause Analysis

**Root Cause:** The test value `'invalid_value'` is 13 characters, exceeding the VARCHAR(10) column limit. PostgreSQL validates column type constraints (length) before CHECK constraints. The length violation error is returned before the CHECK constraint can be evaluated.

**PostgreSQL Constraint Evaluation Order:**
1. NOT NULL constraint
2. Column type constraints (VARCHAR length, numeric precision, etc.)
3. CHECK constraints
4. UNIQUE constraints
5. Foreign key constraints

**Contributing Factors:**
1. **Intuitive but incorrect value:** `'invalid_value'` clearly communicates test intent but is too long
2. **Two-layer validation:** Both VARCHAR(10) and CHECK exist on the same column
3. **Test author oversight:** Didn't verify value length against column definition

**How it was introduced:** Test author chose a descriptive value (`'invalid_value'`) without checking the column length constraint.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production code | None - CHECK constraint works correctly | None |
| Data integrity | None - constraint is functional | None |
| Test coverage | Cannot verify CHECK constraint works | Low |
| Security | None - constraint still prevents invalid values | None |

**Business Risk Summary:** This is a test code bug with no production impact. The `vip_metric` CHECK constraint works correctly in production. This test failure only prevents automated verification of that constraint.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

**Test Case 4 - Current Code (lines 645-656):**
```typescript
// ============================================================================
// Test Case 4: vip_metric invalid throws exception
// Per RPCMigrationFix.md: update_leaderboard_ranks raises EXCEPTION for invalid vip_metric
// ============================================================================
describe('Test Case 4: vip_metric invalid throws exception', () => {
  it('should throw error when client has invalid vip_metric', async () => {
    // Try to set invalid vip_metric (should fail CHECK constraint)
    const { error: updateError } = await supabase
      .from('clients')
      .update({ vip_metric: 'invalid_value' })  // <-- BUG: 13 chars > VARCHAR(10)
      .eq('id', testClientId);

    // CHECK constraint should prevent invalid values
    expect(updateError).not.toBeNull();
    expect(updateError?.message).toContain('violates check constraint');
  });
});
```

**Current Behavior:**
- PostgreSQL receives UPDATE with `vip_metric = 'invalid_value'`
- VARCHAR(10) validation fails first (13 > 10 chars)
- Error returned: "value too long for type character varying(10)"
- Test assertion fails: expected "violates check constraint", got length error

#### Current Data Flow

```
Test Code                     PostgreSQL Validation Order
    │                                    │
    ▼                                    │
UPDATE clients                           │
SET vip_metric = 'invalid_value'         │
    │                                    │
    └───────────────────────────────────►│
                                         ▼
                               1. NOT NULL? ✓ (has value)
                                         │
                                         ▼
                               2. VARCHAR(10)? ✗ FAIL
                                  'invalid_value' = 13 chars
                                         │
                                         ▼
                               Return error immediately
                               "value too long..."
                                         │
                               (CHECK never evaluated)
```

---

## 7. Proposed Fix

#### Approach

Change the test value from `'invalid_value'` (13 chars) to `'bad'` (3 chars). This value:
- Fits within VARCHAR(10) ✓
- Is NOT in the CHECK constraint options ('units', 'sales') ✓
- Clearly indicates an invalid value ✓

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

**Before (line 650):**
```typescript
.update({ vip_metric: 'invalid_value' })
```

**After:**
```typescript
.update({ vip_metric: 'bad' })  // 3 chars fits VARCHAR(10), violates CHECK
```

**Explanation:**
- `'bad'` is 3 characters, well within VARCHAR(10) limit
- `'bad'` is NOT in ('units', 'sales'), so CHECK constraint will reject it
- PostgreSQL will return: `new row for relation "clients" violates check constraint "clients_vip_metric_check"`
- Test assertion `toContain('violates check constraint')` will pass

#### Alternative Values Considered

| Value | Length | Fits VARCHAR(10) | Violates CHECK | Selected? |
|-------|--------|------------------|----------------|-----------|
| `'invalid_value'` | 13 | ❌ No | N/A (never reached) | Current (broken) |
| `'bad'` | 3 | ✓ Yes | ✓ Yes | ✓ **Selected** |
| `'x'` | 1 | ✓ Yes | ✓ Yes | Too cryptic |
| `'foo'` | 3 | ✓ Yes | ✓ Yes | Less descriptive |
| `'invalid'` | 7 | ✓ Yes | ✓ Yes | Also acceptable |
| `'bogus'` | 5 | ✓ Yes | ✓ Yes | Also acceptable |

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/tests/integration/cron/daily-automation-metrics.test.ts` | MODIFY | Line 650: `'invalid_value'` → `'bad'` |

### Dependency Graph

```
daily-automation-metrics.test.ts
├── imports from: @supabase/supabase-js, test helpers
├── imported by: none (test file)
└── affects: Test suite pass/fail status only
```

---

## 9. Data Flow Analysis

#### Before Fix

```
Test Value                PostgreSQL                  Result
    │                          │                         │
'invalid_value'                │                         │
(13 chars)                     │                         │
    │                          │                         │
    └─────────────────────────►│                         │
                               ▼                         │
                    VARCHAR(10) check                    │
                         FAIL                            │
                               │                         │
                               └────────────────────────►│
                                                         ▼
                                              "value too long..."
                                              (CHECK never reached)
```

#### After Fix

```
Test Value                PostgreSQL                  Result
    │                          │                         │
'bad'                          │                         │
(3 chars)                      │                         │
    │                          │                         │
    └─────────────────────────►│                         │
                               ▼                         │
                    VARCHAR(10) check                    │
                         PASS (3 ≤ 10)                   │
                               │                         │
                               ▼                         │
                    CHECK (IN ('units','sales'))         │
                         FAIL ('bad' not in list)        │
                               │                         │
                               └────────────────────────►│
                                                         ▼
                                              "violates check constraint"
                                              (Test assertion passes)
```

#### Data Transformation Steps

1. **Step 1:** Test sends UPDATE with `vip_metric = 'bad'`
2. **Step 2:** PostgreSQL validates VARCHAR(10) - 3 chars ≤ 10, PASS
3. **Step 3:** PostgreSQL validates CHECK constraint - 'bad' NOT IN ('units', 'sales'), FAIL
4. **Step 4:** PostgreSQL returns error: "violates check constraint..."
5. **Step 5:** Test assertion `toContain('violates check constraint')` matches, PASS

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
Jest Test Runner
│
└─► beforeEach
    └─► createTestClientRecord({ vip_metric: 'sales' })
        └─► Client created with valid vip_metric
│
└─► Test Case 4: 'should throw error when client has invalid vip_metric'
    │
    ├─► supabase.from('clients').update({ vip_metric: 'bad' })
    │   │
    │   └─► PostgreSQL validates:
    │       ├─► VARCHAR(10): PASS (3 chars)
    │       └─► CHECK: FAIL ('bad' not in options)
    │               └── ⚠️ Returns error (expected behavior)
    │
    └─► expect(updateError?.message).toContain('violates check constraint')
        └─► Assertion PASSES (message contains expected substring)
│
└─► afterEach
    └─► cleanupTestData()
        └─► Client deleted (no data persists)
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | clients.vip_metric VARCHAR(10) | Length check fails before CHECK |
| Database | clients_vip_metric_check | CHECK constraint (correct, never reached) |
| Test Code | Line 650 | Provides value too long for column |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| clients | vip_metric VARCHAR(10) CHECK (IN ('units', 'sales')) | Two validations: length then CHECK |

#### Schema Check

```sql
-- Verify column definition
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'vip_metric';
-- Expected: varchar, 10

-- Verify CHECK constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'clients'::regclass AND conname LIKE '%vip_metric%';
-- Expected: clients_vip_metric_check, CHECK (vip_metric IN ('units', 'sales'))
```

#### Data Migration Required?
- [x] No - schema is correct, only test value needs changing

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

#### Option A: Change value to 'bad' (Selected)
- **Description:** Use shorter value that violates CHECK
- **Pros:**
  - Simple fix
  - Clearly indicates "bad" value
  - Tests the actual CHECK constraint
- **Cons:** None
- **Verdict:** ✅ Selected - simple, correct, clear intent

#### Option B: Increase VARCHAR length
- **Description:** Change column from VARCHAR(10) to VARCHAR(20)
- **Pros:** Would allow 'invalid_value' to work
- **Cons:**
  - Modifies production schema
  - Deviates from SOT (SchemaFinalv2.md)
  - Wrong fix location (schema is correct)
- **Verdict:** ❌ Rejected - production schema is correct

#### Option C: Change test assertion to accept length error
- **Description:** Change assertion to `toContain('value too long')`
- **Pros:** Test would pass
- **Cons:**
  - Doesn't test the CHECK constraint at all
  - Defeats the purpose of the test
  - Misleading test name/description
- **Verdict:** ❌ Rejected - doesn't test intended behavior

#### Option D: Remove the test
- **Description:** Delete Test Case 4 entirely
- **Pros:** No more failure
- **Cons:**
  - Loses test coverage for CHECK constraint
  - Bad practice
- **Verdict:** ❌ Rejected - need this test coverage

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 'bad' becomes valid vip_metric value | Very Low | Low | Would require schema migration AND SOT change |
| PostgreSQL CHECK error message format changes | Very Low | Low | Substring match is flexible |
| Test still fails after fix | Low | Low | Will verify by running test |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | N/A (test code only) |
| Database | No | N/A (test code only) |
| Frontend | No | N/A (test code only) |

#### Verification of Expected Error Message

PostgreSQL CHECK constraint violations return messages in this format:
```
new row for relation "tablename" violates check constraint "constraint_name"
```

For our case:
```
new row for relation "clients" violates check constraint "clients_vip_metric_check"
```

The assertion `toContain('violates check constraint')` will match this message.

---

## 15. Testing Strategy

#### Unit Tests

N/A - this IS the test code being fixed.

#### Integration Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts`

After fix, Test Case 4 should pass:
- Verifies `vip_metric` CHECK constraint rejects invalid values
- Confirms database-level validation works correctly

#### Manual Verification Steps

1. [x] Verify column is VARCHAR(10) (confirmed: initial_schema.sql line 25)
2. [x] Verify CHECK constraint options (confirmed: 'units', 'sales')
3. [x] Verify 'bad' is NOT a valid option
4. [ ] Apply fix (change 'invalid_value' to 'bad')
5. [ ] Run Test Case 4 in isolation
6. [ ] Verify error message contains "violates check constraint"
7. [ ] Run full Phase 8 test suite

#### Verification Commands

```bash
# Run Test Case 4 specifically
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts -t "Test Case 4"

# Run full daily-automation-metrics suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/daily-automation-metrics.test.ts

# Run full Phase 8 test suite (should be 87/87 after fix)
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Verify 'bad' is not a valid vip_metric value
- [x] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Change test value in Test Case 4
  - File: `appcode/tests/integration/cron/daily-automation-metrics.test.ts`
  - Line: 650
  - Change: `'invalid_value'` → `'bad'`

#### Post-Implementation
- [ ] Run Test Case 4: `npm test -- -t "Test Case 4"`
- [ ] Verify error message contains "violates check constraint"
- [ ] Run full Phase 8 suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md - mark Bug 5 as fixed
- [ ] Verify 87/87 tests pass

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.3 | Daily automation metrics tests | Test Case 4 validates vip_metric constraint |

#### Updates Required

**Task 8.4.3:**
- Current AC: Tests verify constraint behavior
- Updated AC: No change needed - fix enables test to run correctly
- Notes: Test intent was correct, just used wrong test value

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [x] Line 650 changed from `'invalid_value'` to `'bad'`
- [x] Test Case 4 passes
- [x] Error message contains "violates check constraint"
- [x] Full Phase 8 test suite passes (87/87)
- [x] Phase8TestBugs.md updated - Bug 5 marked fixed
- [x] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 1.1 clients table (line 118) | Defines vip_metric as VARCHAR(10) with options |
| initial_schema.sql | clients table (lines 25-26) | Shows VARCHAR(10) and CHECK constraint |
| daily-automation-metrics.test.ts | Test Case 4 (lines 645-656) | The failing test |
| daily-automation-metrics.test.ts | beforeEach/afterEach (lines 65-81) | Test isolation |
| Phase8TestBugs.md | Bug 5 | Documents this as known failing test |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 1.1 clients - See vip_metric VARCHAR(10) definition
2. **Second:** initial_schema.sql - clients table - See CHECK constraint definition
3. **Third:** daily-automation-metrics.test.ts - Test Case 4 - See the bug (value too long)
4. **Fourth:** daily-automation-metrics.test.ts - beforeEach/afterEach - Verify test isolation

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete
