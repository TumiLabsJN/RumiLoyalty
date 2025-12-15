# activate_scheduled_boosts RPC Type Mismatch - Fix Documentation

**Bug ID:** BUG-ACTIVATE-SCHEDULED-BOOSTS-TYPE-MISMATCH
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.4.8 (Test scheduled activation at correct time)
**Linked Bugs:** Phase8TestBugs.md Bug 8

---

## 1. Project Context

This is the Rumi Loyalty Platform, a multi-tenant SaaS application for managing creator loyalty programs. Built with Next.js 14, TypeScript, and Supabase (PostgreSQL), it enables brands to track TikTok creator performance, manage tier-based rewards, and run missions/challenges.

The bug affects the **commission boost activation system** in Phase 8 (Automation & Cron Jobs). The `activate_scheduled_boosts` RPC function transitions commission boost redemptions from 'scheduled' to 'active' status at the scheduled activation date. This is a critical production function called by the daily automation cron job.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with RPC functions for bulk operations

---

## 2. Bug Summary

**What's happening:** The `activate_scheduled_boosts` RPC function fails with "structure of query does not match function result type" error. The RPC correctly declares `TIMESTAMP` per SchemaFinalv2.md (source of truth), but the database schema implementation incorrectly uses `TIMESTAMP WITH TIME ZONE`. PostgreSQL enforces strict type matching.

**What should happen:** The database schema should match SchemaFinalv2.md (source of truth), using `TIMESTAMP` for `activated_at` and `expires_at` columns.

**Impact:** Commission boost activation is completely broken. 7 out of 8 tests in `scheduled-activation.test.ts` fail. This is a PRODUCTION BUG that prevents scheduled boosts from activating.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **SchemaFinalv2.md (SOT)** | Section 2.5 commission_boost_redemptions Table (lines 695-696) | **Source of Truth** declares `activated_at \| TIMESTAMP` and `expires_at \| TIMESTAMP` |
| initial_schema.sql | commission_boost_redemptions CREATE TABLE (lines 494-495) | **DEVIATES FROM SOT**: Implements `TIMESTAMP WITH TIME ZONE` instead of `TIMESTAMP` |
| 20251213135422_boost_activation_rpcs.sql | activate_scheduled_boosts function (lines 28-29) | **CORRECT per SOT**: RETURNS TABLE declares `activated_at TIMESTAMP` and `expires_at TIMESTAMP` |
| scheduled-activation.test.ts | Test file header (lines 12-13) | References SchemaFinalv2.md lines 693-700 for column definitions |
| scheduled-activation.test.ts | callActivateScheduledBoosts helper (lines 130-154) | Shows expected return signature |
| PostgreSQL documentation | Type system | PostgreSQL enforces strict type matching for RETURNS TABLE - TIMESTAMP ≠ TIMESTAMPTZ |
| Phase8TestBugs.md | Bug 8 section | Original error: "structure of query does not match function result type" |
| Database inspection | `\d commission_boost_redemptions` | Confirmed actual types deviate: `timestamp with time zone` |

### Key Evidence

**Evidence 1:** SchemaFinalv2.md (Source of Truth) specifies TIMESTAMP
- Source: SchemaFinalv2.md, lines 695-696
- Content: `activated_at | TIMESTAMP | | commission_boost_redemptions | Actual activation time`
- Content: `expires_at | TIMESTAMP | | commission_boost_redemptions | Expiration time`
- Implication: This is the authoritative specification

**Evidence 2:** RPC function correctly follows Source of Truth
- Source: 20251213135422_boost_activation_rpcs.sql, lines 28-29
- Content: `activated_at TIMESTAMP, expires_at TIMESTAMP`
- Implication: RPC was written correctly per SOT - NO CHANGE NEEDED

**Evidence 3:** Database schema DEVIATES from Source of Truth
- Source: initial_schema.sql, lines 494-495
- Content: `activated_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE`
- Implication: **This is the bug** - schema implementation doesn't match SOT

**Evidence 4:** Test failure confirms type mismatch
- Source: Test output from scheduled-activation.test.ts
- Error: "RPC activate_scheduled_boosts failed: structure of query does not match function result type"
- Implication: PostgreSQL rejects because column types don't match function declaration

---

## 4. Root Cause Analysis

**Root Cause:** The database schema implementation in `initial_schema.sql` uses `TIMESTAMP WITH TIME ZONE` for `activated_at` and `expires_at` columns, but SchemaFinalv2.md (source of truth) specifies `TIMESTAMP`. The RPC function correctly follows the SOT, causing a type mismatch with the incorrectly implemented schema.

**Contributing Factors:**
1. **Schema implementation error:** initial_schema.sql used TIMESTAMPTZ instead of TIMESTAMP as specified in SOT
2. **No schema validation:** The deviation from SOT wasn't caught during implementation
3. **RPC follows SOT correctly:** The RPC author correctly referenced SchemaFinalv2.md

**How it was introduced:** When `initial_schema.sql` was created, the implementer used `TIMESTAMP WITH TIME ZONE` instead of `TIMESTAMP` as specified in SchemaFinalv2.md. The RPC was later written correctly per SOT, exposing the schema deviation.

**Correct Component:** RPC function (follows SOT)
**Incorrect Component:** Database schema (deviates from SOT)

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Commission boost activation | Completely broken - boosts cannot activate | High |
| Creator payments | Creators won't earn commission boosts | High |
| Cron job automation | Daily automation partially fails | High |
| Test coverage | 7 tests blocked | Medium |

**Business Risk Summary:** This is a critical production bug. Commission boosts are a key reward type that creators expect. If boosts don't activate, creators won't earn their promised bonuses, damaging trust and engagement.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213135422_boost_activation_rpcs.sql`

```sql
-- Lines 22-54: RPC function definition (CORRECT per SOT)
CREATE OR REPLACE FUNCTION activate_scheduled_boosts(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  sales_at_activation DECIMAL(10,2),
  activated_at TIMESTAMP,           -- ✅ Correct per SOT
  expires_at TIMESTAMP              -- ✅ Correct per SOT
) AS $$
...
```

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251128173733_initial_schema.sql`

```sql
-- Lines 494-495: Database schema (INCORRECT - deviates from SOT)
CREATE TABLE commission_boost_redemptions (
    ...
    activated_at TIMESTAMP WITH TIME ZONE,  -- ❌ SOT says TIMESTAMP
    expires_at TIMESTAMP WITH TIME ZONE,    -- ❌ SOT says TIMESTAMP
    ...
);
```

**Current Behavior:**
- Function call fails immediately with type mismatch error
- No boosts are activated
- All 7 tests that call this RPC fail

#### Current Data Flow

```
Test/Cron calls RPC
        ↓
PostgreSQL validates RETURNS TABLE
        ↓
RPC declares: TIMESTAMP (correct per SOT)
Database returns: TIMESTAMPTZ (deviates from SOT)
        ↓
MISMATCH DETECTED → Error thrown
        ↓
"structure of query does not match function result type"
```

---

## 7. Proposed Fix

#### Approach

**Option A (Selected):** Fix the database schema to match SchemaFinalv2.md (Source of Truth). ALTER the `activated_at` and `expires_at` columns from `TIMESTAMP WITH TIME ZONE` to `TIMESTAMP`.

The RPC function is CORRECT and should NOT be changed.

#### Changes Required

**File:** New migration `supabase/migrations/[timestamp]_fix_boost_timestamp_types.sql`

**Schema Change:**
```sql
-- Fix commission_boost_redemptions columns to match SOT (SchemaFinalv2.md lines 695-696)
ALTER TABLE commission_boost_redemptions
  ALTER COLUMN activated_at TYPE TIMESTAMP,
  ALTER COLUMN expires_at TYPE TIMESTAMP;
```

**Explanation:** This aligns the database schema with SchemaFinalv2.md (source of truth). The RPC function already correctly uses TIMESTAMP, so after this fix the types will match.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[new]_fix_boost_timestamp_types.sql` | CREATE | ALTER TABLE to change column types to TIMESTAMP |

### Dependency Graph

```
commission_boost_redemptions table
├── columns: activated_at, expires_at (FIX THESE)
├── referenced by: activate_scheduled_boosts RPC
├── referenced by: expire_active_boosts RPC
└── referenced by: scheduled-activation.test.ts
```

---

## 9. Data Flow Analysis

#### Before Fix

```
RPC RETURNS TABLE: TIMESTAMP (correct per SOT)
                ↓
Database column: TIMESTAMPTZ (wrong - deviates from SOT)
                ↓
Type mismatch → Function fails
```

#### After Fix

```
RPC RETURNS TABLE: TIMESTAMP (correct per SOT)
                ↓
Database column: TIMESTAMP (fixed to match SOT)
                ↓
Types match → Function works ✅
```

#### Data Transformation Steps

1. **Step 1:** Migration alters column types to TIMESTAMP
2. **Step 2:** RPC call succeeds (types now match)
3. **Step 3:** UPDATE...RETURNING produces TIMESTAMP values
4. **Step 4:** Results match RETURNS TABLE declaration
5. **Step 5:** Results returned to caller

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
Daily Automation Cron (/api/cron/daily-automation)
│
├─► callActivateScheduledBoosts()
│   └── supabase.rpc('activate_scheduled_boosts', { p_client_id })
│       │
│       └─► PostgreSQL: activate_scheduled_boosts(UUID)
│           ├── RETURNS TABLE: TIMESTAMP (correct)
│           ├── UPDATE commission_boost_redemptions
│           │       └── columns: activated_at, expires_at
│           │               └── ⚠️ Currently TIMESTAMPTZ (wrong)
│           └── RETURNING clause
│
└─► Process activation results
```

#### Integration Points

| Layer | Component | Status |
|-------|-----------|--------|
| Database | activate_scheduled_boosts function | ✅ Correct per SOT |
| Database | commission_boost_redemptions.activated_at | ❌ Wrong type (TIMESTAMPTZ) |
| Database | commission_boost_redemptions.expires_at | ❌ Wrong type (TIMESTAMPTZ) |
| Cron Route | daily-automation/route.ts | Blocked by bug |
| Test | scheduled-activation.test.ts | 7 failures |

---

## 11. Database/Schema Verification

#### Source of Truth vs Implementation

| Column | SchemaFinalv2.md (SOT) | Current Database | Correct? |
|--------|------------------------|------------------|----------|
| activated_at | `TIMESTAMP` | `timestamp with time zone` | ❌ NO |
| expires_at | `TIMESTAMP` | `timestamp with time zone` | ❌ NO |

#### Schema Check

```sql
-- Current state (incorrect)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'commission_boost_redemptions'
AND column_name IN ('activated_at', 'expires_at');

-- Returns:
-- activated_at | timestamp with time zone  ← WRONG
-- expires_at   | timestamp with time zone  ← WRONG

-- After fix (correct per SOT):
-- activated_at | timestamp without time zone
-- expires_at   | timestamp without time zone
```

#### Data Migration Required?
- [x] Yes - ALTER TABLE to change column types from TIMESTAMPTZ to TIMESTAMP

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| None | N/A | None - schema fix only |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| activated_at | TIMESTAMPTZ (wrong) | TIMESTAMP (per SOT) | No - aligns with SOT |
| expires_at | TIMESTAMPTZ (wrong) | TIMESTAMP (per SOT) | No - aligns with SOT |

### Frontend Changes Required?
- [x] No - Frontend should already expect TIMESTAMP per SOT

---

## 13. Alternative Solutions Considered

#### Option A: Fix database schema to match SOT (Selected)
- **Description:** ALTER columns from TIMESTAMPTZ to TIMESTAMP to match SchemaFinalv2.md
- **Pros:** Aligns implementation with source of truth, RPC stays unchanged (already correct)
- **Cons:** Requires schema migration
- **Verdict:** ✅ Selected - maintains SOT integrity

#### Option B: Update SOT and RPC to use TIMESTAMPTZ (Rejected)
- **Description:** Change SchemaFinalv2.md to say TIMESTAMPTZ, update RPC to match
- **Pros:** No schema change needed
- **Cons:** Changes source of truth to match incorrect implementation, sets bad precedent
- **Verdict:** ❌ Rejected - SOT should drive implementation, not vice versa

#### Option C: Cast in RETURNING clause (Rejected)
- **Description:** Cast TIMESTAMPTZ to TIMESTAMP in the RETURNING clause
- **Pros:** Quick fix, no schema change
- **Cons:** Hides the underlying schema deviation from SOT
- **Verdict:** ❌ Rejected - doesn't fix root cause

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data conversion issues | Low | Medium | TIMESTAMP vs TIMESTAMPTZ conversion is straightforward |
| Existing data affected | Low | Low | Table likely empty or has few rows in dev |
| Fix doesn't resolve issue | Low | High | Verify column types after migration |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Types align with SOT |
| Database | Yes (schema change) | ALTER TABLE migration |
| Frontend | No | Should already expect TIMESTAMP |
| Tests | No | Will start passing |

---

## 15. Testing Strategy

#### Unit Tests

No new unit tests needed - existing tests will pass after fix.

#### Integration Tests

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/scheduled-activation.test.ts`

The fix will enable these existing tests to run:
- Test Case 1: Scheduled reward stays scheduled before activation time
- Test Case 2: At activation time, boost_status changes to 'active'
- Test Case 3: activated_at timestamp set correctly
- Test Case 4: sales_at_activation captures current sales value (2 tests)
- Test Case 5: Discount activation (if applicable)
- Multi-tenant isolation test

#### Manual Verification Steps

1. [ ] Apply migration
2. [ ] Verify column types: `\d commission_boost_redemptions`
3. [ ] Confirm types are `timestamp without time zone`
4. [ ] Run `npm test -- tests/integration/cron/scheduled-activation.test.ts`
5. [ ] Verify 8/8 tests pass

#### Verification Commands

```bash
# Apply migration
cd /home/jorge/Loyalty/Rumi && npx supabase db reset

# Verify column types in database
docker exec -i supabase_db_Rumi psql -U postgres -d postgres -c "\d commission_boost_redemptions" | grep -E "activated_at|expires_at"

# Expected output:
# activated_at | timestamp without time zone
# expires_at   | timestamp without time zone

# Run specific test file
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/scheduled-activation.test.ts

# Run full Phase 8 test suite
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tests/integration/cron/
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify SchemaFinalv2.md specifies TIMESTAMP (confirmed lines 695-696)
- [x] Verify RPC correctly uses TIMESTAMP (confirmed)
- [x] Verify database incorrectly uses TIMESTAMPTZ (confirmed)

#### Implementation Steps
- [ ] **Step 1:** Create new migration file
  - File: `supabase/migrations/[timestamp]_fix_boost_timestamp_types.sql`
  - Change: ALTER TABLE to change column types to TIMESTAMP
- [ ] **Step 2:** Apply migration
  - Command: `npx supabase db reset` (local development)
- [ ] **Step 3:** Verify column types in database
  - Command: `docker exec -i supabase_db_Rumi psql -U postgres -d postgres -c "\d commission_boost_redemptions"`
  - Expected: `timestamp without time zone` for both columns

#### Post-Implementation
- [ ] Run tests: `npm test -- tests/integration/cron/scheduled-activation.test.ts`
- [ ] Run full suite: `npm test -- tests/integration/cron/`
- [ ] Update Phase8TestBugs.md to mark Bug 8 as FIXED

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Task 8.4.8 | Test scheduled activation at correct time | 7 tests blocked by this bug |

#### Updates Required

**Task 8.4.8:**
- Current AC: All scheduled activation tests pass
- Updated AC: No change needed
- Notes: Bug fix enables tests to execute

#### New Tasks Created (if any)
- None

---

## 18. Definition of Done

- [ ] Migration file created with ALTER TABLE to TIMESTAMP
- [ ] Migration applied successfully
- [ ] Column types verified as `timestamp without time zone`
- [ ] All 8 tests in scheduled-activation.test.ts pass
- [ ] Full Phase 8 test suite run (target: 84+/87 passing)
- [ ] Phase8TestBugs.md updated to mark Bug 8 as FIXED
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| **SchemaFinalv2.md** | Section 2.5 commission_boost_redemptions (lines 695-696) | **SOURCE OF TRUTH** - specifies TIMESTAMP |
| initial_schema.sql | commission_boost_redemptions CREATE TABLE (lines 494-495) | Shows incorrect TIMESTAMPTZ implementation |
| 20251213135422_boost_activation_rpcs.sql | Lines 28-29 | Shows RPC correctly uses TIMESTAMP per SOT |
| scheduled-activation.test.ts | Test file | Validates RPC behavior |
| Phase8TestBugs.md | Bug 8 section | Original bug documentation |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Lines 695-696 - **SOURCE OF TRUTH** specifies TIMESTAMP
2. **Second:** initial_schema.sql - Lines 494-495 - See incorrect TIMESTAMPTZ implementation
3. **Third:** 20251213135422_boost_activation_rpcs.sql - Lines 28-29 - RPC correctly follows SOT
4. **Fourth:** This document - Full analysis showing schema deviates from SOT

---

**Document Version:** 2.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Implemented

---

## Appendix: SOT Compliance Summary

| Component | SchemaFinalv2.md (SOT) | Implementation | Compliant? |
|-----------|------------------------|----------------|------------|
| RPC Function | TIMESTAMP | TIMESTAMP | ✅ Yes |
| Database Schema | TIMESTAMP | TIMESTAMPTZ | ❌ No - **FIX THIS** |
