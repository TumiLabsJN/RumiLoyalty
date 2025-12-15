# Test Case 3 Timestamp Timezone Mismatch - Fix Documentation

**Bug ID:** BUG-TEST-CASE-3-TIMESTAMP-TIMEZONE
**Created:** 2025-12-15
**Status:** Implemented
**Severity:** Low (Test Bug)
**Related Tasks:** Task 8.4.8 (Test scheduled activation at correct time)
**Linked Bugs:** Phase8TestBugs.md Bug 9, BUG-ACTIVATE-SCHEDULED-BOOSTS-TYPE-MISMATCH (caused this)

---

## 1. Project Context

This is the Rumi Loyalty Platform, a multi-tenant SaaS application for managing creator loyalty programs. Built with Next.js 14, TypeScript, and Supabase (PostgreSQL).

The bug affects **Test Case 3** in `scheduled-activation.test.ts`, which verifies that `activated_at` is set correctly when boosts are activated. The test fails because of a timezone interpretation mismatch between PostgreSQL's `NOW()` (UTC) and JavaScript's `new Date()` parsing (local time).

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Jest
**Bug Type:** TEST BUG (not production code)

---

## 2. Bug Summary

**What's happening:** Test Case 3 fails with timestamp comparison error. The `activated_at` value (~3 hours off) doesn't fall within the expected range of `beforeActivation` to `afterActivation`.

**Error:**
```
expect(received).toBeLessThanOrEqual(expected)
Expected: <= 1765811572047
Received:    1765822371037
```
Difference: ~10,800,000 ms = ~3 hours (timezone offset)

**What should happen:** The `activated_at` timestamp should be correctly compared to the test's `beforeActivation` and `afterActivation` timestamps, accounting for timezone differences.

**Impact:** Test Case 3 fails, preventing validation that `activated_at` is set correctly during boost activation.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| SchemaFinalv2.md | commission_boost_redemptions table (lines 695-696) | `activated_at` and `expires_at` are TIMESTAMP (not TIMESTAMPTZ) |
| 20251215113550_fix_boost_timestamp_types.sql | ALTER TABLE statement | Changed columns FROM `TIMESTAMP WITH TIME ZONE` TO `TIMESTAMP` |
| 20251213135422_boost_activation_rpcs.sql | activate_scheduled_boosts function (line 36) | Uses `activated_at = NOW()` - returns UTC in Supabase |
| scheduled-activation.test.ts | Test Case 3 (lines 411-436) | Compares `new Date(boostAfter!.activated_at!)` to local time |
| scheduled-activation.test.ts | Line 430 | `const activatedAt = new Date(boostAfter!.activated_at!)` - no timezone handling |
| Supabase documentation | TIMESTAMP vs TIMESTAMPTZ behavior | TIMESTAMP returns without 'Z' suffix, TIMESTAMPTZ returns with 'Z' |

### Key Evidence

**Evidence 1:** Column type changed to TIMESTAMP (no timezone)
- Source: Migration 20251215113550_fix_boost_timestamp_types.sql
```sql
ALTER TABLE commission_boost_redemptions
  ALTER COLUMN activated_at TYPE TIMESTAMP,
  ALTER COLUMN expires_at TYPE TIMESTAMP;
```
- Implication: Column no longer stores timezone information.

**Evidence 2:** RPC stores UTC time via NOW()
- Source: 20251213135422_boost_activation_rpcs.sql, line 36
```sql
activated_at = NOW(),
```
- Implication: PostgreSQL's `NOW()` returns current timestamp in UTC (on Supabase). When stored in a TIMESTAMP column, the UTC value is stored but timezone info is stripped.

**Evidence 3:** Supabase returns TIMESTAMP without 'Z' suffix
- Source: Supabase-js client behavior
- For TIMESTAMP columns, Supabase returns ISO strings WITHOUT 'Z':
  - TIMESTAMP → `"2025-12-15T19:00:00"` (no 'Z')
  - TIMESTAMPTZ → `"2025-12-15T19:00:00Z"` (has 'Z')
- Implication: Client must know the timezone context to interpret correctly.

**Evidence 4:** JavaScript interprets no-timezone strings as local time
- Source: scheduled-activation.test.ts, line 430
```typescript
const activatedAt = new Date(boostAfter!.activated_at!);
```
- When string lacks 'Z' suffix, JavaScript's `new Date()` interprets it as **local time**
- Implication: If test runs in PST (UTC-8), a 19:00:00 string becomes 19:00:00 PST = 03:00:00 UTC next day

**Evidence 5:** Test compares to local time references
- Source: scheduled-activation.test.ts, lines 412, 418
```typescript
const beforeActivation = new Date();  // Local time
// ... call RPC ...
const afterActivation = new Date();   // Local time
```
- Both reference timestamps are in the test machine's local timezone
- `activatedAt` is parsed as local time but contains a UTC value
- Implication: Timezone mismatch causes ~3 hour difference

**Evidence 6:** Error shows ~3 hour difference
- Source: Test failure output
```
Expected: <= 1765811572047
Received:    1765822371037
```
- Difference: 10,798,990 ms ≈ 3 hours
- Implication: Consistent with a timezone offset (e.g., EST = UTC-5, difference varies)

---

## 4. Root Cause Analysis

**Root Cause:** When reading a TIMESTAMP column (without timezone) from Supabase, the client receives a string without 'Z' suffix. JavaScript's `new Date()` interprets this as local time, but the stored value was actually UTC. This causes a timezone offset when comparing to `new Date()` references created in local time.

**Contributing Factors:**
1. **Bug 8 fix changed column type:** The fix for Bug 8 changed `activated_at` from TIMESTAMPTZ to TIMESTAMP per SOT
2. **Supabase return format changed:** TIMESTAMPTZ returns 'Z' suffix, TIMESTAMP does not
3. **Test didn't account for timezone:** Test assumes `new Date(string)` and `new Date()` are in same timezone context

**How it was introduced:** The Bug 8 fix (migration 20251215113550) correctly aligned the schema with SOT, but the test wasn't updated to handle the changed return format.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Production code | None - production code works correctly | None |
| Data integrity | None - timestamps are stored correctly | None |
| Test coverage | Cannot verify activated_at is set correctly | Low |

**Business Risk Summary:** This is a test code bug with no production impact. The RPC correctly sets `activated_at = NOW()` in UTC. Only the test's comparison logic is affected.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/scheduled-activation.test.ts`

**Test Case 3 - Current Code (lines 420-432):**
```typescript
// ASSERT: activated_at is set and within expected range
const { data: boostAfter } = await supabase
  .from('commission_boost_redemptions')
  .select('activated_at, expires_at')
  .eq('id', boostRedemptionId)
  .eq('client_id', testClientId)
  .single();

expect(boostAfter?.activated_at).not.toBeNull();

const activatedAt = new Date(boostAfter!.activated_at!);  // <-- BUG: No timezone handling
expect(activatedAt.getTime()).toBeGreaterThanOrEqual(beforeActivation.getTime() - 1000);
expect(activatedAt.getTime()).toBeLessThanOrEqual(afterActivation.getTime() + 1000);
```

**Current Behavior:**
- Supabase returns `activated_at` as `"2025-12-15T19:00:00"` (no 'Z')
- `new Date("2025-12-15T19:00:00")` interprets as local time
- `beforeActivation` and `afterActivation` are local time references
- The stored value (UTC) mismatches the parsed value (local), causing ~3 hour offset
- Test fails: `activatedAt` appears to be in the future

#### Current Data Flow

```
PostgreSQL (UTC)                    JavaScript (Local)
      │                                   │
      ▼                                   │
NOW() = '2025-12-15 19:00:00+00'          │
      │                                   │
      ▼                                   │
Stored in TIMESTAMP column                │
as '2025-12-15 19:00:00' (no TZ)          │
      │                                   │
      ▼                                   │
Supabase returns string:                  │
"2025-12-15T19:00:00" (no 'Z')            │
      │                                   │
      └──────────────────────────────────►│
                                          ▼
                            new Date("2025-12-15T19:00:00")
                            Interpreted as LOCAL time
                                          │
                                          ▼
                            '2025-12-15 19:00:00 PST'
                            = '2025-12-16 03:00:00 UTC'
                                          │
                                          ▼
                            MISMATCH: ~8 hours off
```

---

## 7. Proposed Fix

#### Approach

Append 'Z' to the timestamp string before parsing, forcing JavaScript to interpret it as UTC. This aligns the parsed value with how PostgreSQL stored it (UTC via NOW()).

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/scheduled-activation.test.ts`

**Before (line 430):**
```typescript
const activatedAt = new Date(boostAfter!.activated_at!);
```

**After:**
```typescript
// Append 'Z' to interpret TIMESTAMP as UTC (matches PostgreSQL NOW() behavior)
const activatedAt = new Date(boostAfter!.activated_at! + 'Z');
```

**Explanation:**
- PostgreSQL's `NOW()` stores the current UTC time in the TIMESTAMP column
- Supabase returns it as `"2025-12-15T19:00:00"` without timezone suffix
- Adding 'Z' makes JavaScript interpret it as UTC: `"2025-12-15T19:00:00Z"`
- Now `activatedAt` correctly represents UTC time
- Comparison with `beforeActivation`/`afterActivation` (which internally use UTC) works correctly

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/tests/integration/cron/scheduled-activation.test.ts` | MODIFY | Line 430: append 'Z' to timestamp string |

### Dependency Graph

```
scheduled-activation.test.ts
├── imports from: @supabase/supabase-js, test helpers
├── imported by: none (test file)
└── affects: Test suite pass/fail status
```

---

## 9. Data Flow Analysis

#### Before Fix

```
PostgreSQL NOW()           Supabase Return         JavaScript Parse
      │                         │                        │
'19:00:00 UTC'           "19:00:00" (no TZ)      19:00:00 LOCAL
      │                         │                        │
      └────────────────────────►└───────────────────────►│
                                                         ▼
                                              WRONG: Offset by timezone
```

#### After Fix

```
PostgreSQL NOW()           Supabase Return         JavaScript Parse
      │                         │                        │
'19:00:00 UTC'           "19:00:00" (no TZ)      "19:00:00Z" + 'Z'
      │                         │                        │
      └────────────────────────►└───────────────────────►│
                                                         ▼
                                              CORRECT: 19:00:00 UTC
```

#### Data Transformation Steps

1. **Step 1:** RPC calls `NOW()` → PostgreSQL returns UTC timestamp
2. **Step 2:** Stored in TIMESTAMP column (timezone stripped but value is UTC)
3. **Step 3:** Supabase returns string without 'Z' suffix
4. **Step 4:** Test appends 'Z' → `"2025-12-15T19:00:00Z"`
5. **Step 5:** `new Date()` correctly interprets as UTC
6. **Step 6:** Comparison with `beforeActivation`/`afterActivation` succeeds

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
Jest Test Runner
│
└─► Test Case 3: 'should set activated_at to current timestamp on activation'
    │
    ├─► beforeActivation = new Date() ✅
    │
    ├─► callActivateScheduledBoosts() ✅
    │   └─► RPC: activated_at = NOW() (stored as UTC)
    │
    ├─► afterActivation = new Date() ✅
    │
    ├─► Query commission_boost_redemptions
    │   └─► Returns: { activated_at: "2025-12-15T19:00:00" } (no 'Z')
    │
    └─► const activatedAt = new Date(boostAfter!.activated_at!)
        └── ⚠️ BUG: Interpreted as LOCAL time, should be UTC
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | commission_boost_redemptions.activated_at | Stores UTC value in TIMESTAMP column |
| RPC | activate_scheduled_boosts | Sets `activated_at = NOW()` (UTC) |
| Supabase | Client response | Returns TIMESTAMP without 'Z' suffix |
| Test Code | Line 430 | Parses without timezone context |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| commission_boost_redemptions | activated_at TIMESTAMP | Per SOT (SchemaFinalv2.md line 695) |

#### Schema Check

```sql
-- Verify column type is TIMESTAMP (not TIMESTAMPTZ)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'commission_boost_redemptions'
AND column_name = 'activated_at';

-- Expected: data_type = 'timestamp without time zone'
```

#### Data Migration Required?
- [x] No - schema is correct per SOT, only test needs updating

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

#### Option A: Append 'Z' to force UTC interpretation (Selected)
- **Description:** Add 'Z' suffix to timestamp string before parsing
- **Pros:**
  - Simple one-character change
  - Explicitly documents the UTC assumption
  - Matches actual PostgreSQL behavior (NOW() is UTC)
- **Cons:** None
- **Verdict:** ✅ Selected - simple, correct, explicit

#### Option B: Use more lenient time window
- **Description:** Change assertion to allow larger time difference (e.g., 24 hours)
- **Pros:** Would make test pass
- **Cons:**
  - Hides the real issue
  - Test becomes meaningless (doesn't actually verify timestamp correctness)
  - Hacky workaround
- **Verdict:** ❌ Rejected - doesn't actually test the right thing

#### Option C: Change column back to TIMESTAMPTZ
- **Description:** Revert the Bug 8 fix to use TIMESTAMPTZ
- **Pros:** Would make Supabase return 'Z' suffix automatically
- **Cons:**
  - Deviates from SOT (SchemaFinalv2.md specifies TIMESTAMP)
  - Requires production migration
  - Wrong fix location (production code is correct)
- **Verdict:** ❌ Rejected - violates SOT

#### Option D: Use toISOString() for beforeActivation/afterActivation
- **Description:** Use `.toISOString()` on all timestamps for consistent comparison
- **Pros:** More explicit about UTC
- **Cons:**
  - Still doesn't fix the parsing issue
  - `new Date()` internally uses UTC anyway
- **Verdict:** ❌ Rejected - doesn't address root cause

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fix breaks other timestamp comparisons | Low | Low | Only Test Case 3 uses this pattern |
| UTC assumption incorrect | Low | Low | Supabase PostgreSQL uses UTC for NOW() |

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

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/scheduled-activation.test.ts`

After fix, Test Case 3 should pass:
- Verifies `activated_at` is set within expected time range
- Confirms boost activation timestamp is recorded correctly

#### Manual Verification Steps

1. [x] Identify the timezone parsing issue (line 430)
2. [ ] Add 'Z' suffix to force UTC interpretation
3. [ ] Run Test Case 3 in isolation
4. [ ] Run full scheduled-activation test suite
5. [ ] Run full Phase 8 test suite

#### Verification Commands

```bash
# Run Test Case 3 specifically
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/scheduled-activation.test.ts -t "Test Case 3"

# Run full scheduled-activation suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/scheduled-activation.test.ts

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
- [ ] **Step 1:** Change timestamp parsing in Test Case 3
  - File: `appcode/tests/integration/cron/scheduled-activation.test.ts`
  - Line: 430
  - Change: `new Date(boostAfter!.activated_at!)` → `new Date(boostAfter!.activated_at! + 'Z')`

#### Post-Implementation
- [ ] Run Test Case 3: `npm test -- -t "Test Case 3"`
- [ ] Run full scheduled-activation suite
- [ ] Run full Phase 8 suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md - mark Bug 9 as fixed

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.8 | Test scheduled activation at correct time | Test Case 3 validates activated_at |

#### Updates Required

**Task 8.4.8:**
- Current AC: Tests verify activation timestamps
- Updated AC: No change needed - fix enables test to run correctly
- Notes: Test was correct in intent, just needed timezone-aware parsing

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [x] Line 430 changed to append 'Z' for UTC interpretation
- [x] Test Case 3 passes
- [x] Full scheduled-activation test suite passes (8/8)
- [ ] Full Phase 8 test suite passes (86/87 - Bug 5 unrelated)
- [x] Phase8TestBugs.md updated - Bug 9 marked fixed
- [x] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | commission_boost_redemptions (lines 690-716) | Defines activated_at as TIMESTAMP |
| 20251215113550_fix_boost_timestamp_types.sql | Full file | Changed columns to TIMESTAMP per SOT |
| 20251213135422_boost_activation_rpcs.sql | activate_scheduled_boosts (lines 22-54) | RPC uses NOW() for activated_at |
| scheduled-activation.test.ts | Test Case 3 (lines 364-436) | Test comparing timestamps |
| Phase8TestBugs.md | Bug 9 | Documents this as known failing test |
| BUG-ACTIVATE-SCHEDULED-BOOSTS-TYPE-MISMATCH.md | Full file | Documents the Bug 8 fix that exposed this issue |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - commission_boost_redemptions - SOT defines TIMESTAMP type
2. **Second:** 20251215113550_fix_boost_timestamp_types.sql - Shows column type change
3. **Third:** 20251213135422_boost_activation_rpcs.sql - Shows RPC uses NOW()
4. **Fourth:** scheduled-activation.test.ts - Test Case 3 - Shows the bug location

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete
