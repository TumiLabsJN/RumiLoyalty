# Recurring Mission checkpoint_start Conflict - Fix Documentation

**Bug ID:** BUG-RECURRING-CHECKPOINT-001
**Created:** 2025-12-26
**Status:** Implementation Ready
**Severity:** High
**Related Tasks:** GAP-RECURRING-001, GAP-RECURRING-002
**Linked Bugs:** None

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, and Supabase/PostgreSQL deployed on Vercel. Creators complete missions (sales targets, video views, etc.) to earn rewards. The recurring missions feature (GAP-RECURRING-001/002) allows creators to repeat missions weekly/monthly.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL), Vercel
**Architecture Pattern:** Repository → Service → Route layers with Supabase RPC functions

---

## 2. Bug Summary

**What's happening:** When a creator claims a recurring mission reward (commission_boost, discount, or instant), the RPC fails with a unique constraint violation on `mission_progress_user_id_mission_id_checkpoint_start_key`. The error message is: `duplicate key value violates unique constraint "mission_progress_user_id_mission_id_checkpoint_start_key"`.

**What should happen:** The RPC should successfully create a new mission_progress instance for the next recurring cycle without violating any constraints.

**Impact:** All recurring missions are completely broken. Creators cannot claim weekly/monthly missions with scheduled rewards.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `baseline.sql` | Line 1298 | Unique constraint: `UNIQUE ("user_id", "mission_id", "checkpoint_start")` |
| `20251226100000_recurring_missions.sql` | Lines 267-269 | INSERT uses `u.tier_achieved_at` for `checkpoint_start` |
| `20251226210000_recurring_scheduled_rewards.sql` | Lines 108-112 | Same pattern: `u.tier_achieved_at` for `checkpoint_start` |
| `20251226221817_fix_commission_boost_client_id.sql` | Lines 102-106 | Same pattern copied from original |
| `RecurringMissionsGap.md` | Section 6 (claim_instant_reward) | Specification shows `u.tier_achieved_at` usage |
| `RecurringScheduledRewardsGap.md` | Section 6 | Copied same pattern for scheduled rewards |
| Error log | Runtime | `Key (user_id, mission_id, checkpoint_start)=(..., 2025-12-15 22:32:16.126+00) already exists` |

### Key Evidence

**Evidence 1:** Unique constraint exists on `(user_id, mission_id, checkpoint_start)`
- Source: `baseline.sql`, Line 1298
- Code: `ADD CONSTRAINT "mission_progress_user_id_mission_id_checkpoint_start_key" UNIQUE ("user_id", "mission_id", "checkpoint_start")`
- Implication: Only one mission_progress row allowed per user/mission/checkpoint period

**Evidence 2:** All recurring RPCs use `u.tier_achieved_at` for new instance `checkpoint_start`
- Source: `20251226100000_recurring_missions.sql`, Lines 267-269
- Code:
  ```sql
  SELECT
    ...
    u.tier_achieved_at,   -- checkpoint_start
    u.next_checkpoint_at, -- checkpoint_end
  FROM missions m, users u
  ```
- Implication: New instance has SAME checkpoint_start as existing row, violating unique constraint

**Evidence 3:** Live error confirms the conflict
- Source: Runtime error log (2025-12-26 22:22:13)
- Error: `duplicate key value violates unique constraint "mission_progress_user_id_mission_id_checkpoint_start_key"`
- Detail: `Key (user_id, mission_id, checkpoint_start)=(422044eb-..., bbbb0000-..., 2025-12-15 22:32:16.126+00) already exists`
- Implication: The original mission_progress row's checkpoint_start is being reused

---

## 4. Root Cause Analysis

**Root Cause:** The recurring mission INSERT statements use `u.tier_achieved_at` as `checkpoint_start` for the new instance, but this value is identical to the existing instance's `checkpoint_start`, violating the unique constraint.

**Contributing Factors:**
1. The original schema design assumed one mission_progress per user/mission/checkpoint period
2. GAP-RECURRING-001 specification copied tier checkpoint dates without considering the unique constraint
3. GAP-RECURRING-002 copied the same flawed pattern
4. The `ON CONFLICT` clause handles `idx_mission_progress_active_cooldown` (partial index), NOT the `checkpoint_start` constraint

**How it was introduced:** Design oversight in GAP-RECURRING-001. The specification assumed using tier checkpoint dates for the new instance's checkpoint period, but didn't account for the pre-existing unique constraint.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Feature functionality | All recurring missions completely broken | **Critical** |
| User experience | Creators see claim errors, cannot earn recurring rewards | **High** |
| Data integrity | No corruption, but incomplete data (missing recurring instances) | **Medium** |

**Business Risk Summary:** Recurring missions are a key engagement feature. Complete failure means creators cannot participate in weekly/monthly reward cycles, defeating the purpose of the `redemption_frequency` field entirely.

---

## 6. Current State

### Current File(s)

**File:** `supabase/migrations/20251226100000_recurring_missions.sql` (Lines 254-276)
```sql
-- Create new instance with cooldown_until
INSERT INTO mission_progress (
  id, client_id, mission_id, user_id,
  current_value, status, cooldown_until,
  checkpoint_start, checkpoint_end,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  p_client_id,
  v_mission_id,
  v_user_id,
  0,
  CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
  CASE WHEN v_cooldown_days > 0 THEN v_now + (v_cooldown_days || ' days')::INTERVAL ELSE NULL END,
  u.tier_achieved_at,     -- BUG: Same as existing row's checkpoint_start
  u.next_checkpoint_at,   -- BUG: Same as existing row's checkpoint_end
  v_now,
  v_now
FROM missions m, users u
WHERE m.id = v_mission_id AND u.id = v_user_id
ON CONFLICT (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL
DO NOTHING
RETURNING id INTO v_new_progress_id;
```

**Current Behavior:**
- INSERT attempts to create new row with same `(user_id, mission_id, checkpoint_start)` as existing row
- PostgreSQL rejects with unique constraint violation
- RPC returns error, claim fails
- No new mission_progress instance is created

### Current Data Flow

```
[Creator claims recurring mission]
        ↓
[RPC: claim_commission_boost / claim_instant_reward]
        ↓
[UPDATE redemption → status='claimed'] ✓
        ↓
[INSERT new mission_progress with u.tier_achieved_at]
        ↓
[UNIQUE CONSTRAINT VIOLATION] ✗
        ↓
[RPC FAILS - Transaction rolled back]
```

---

## 7. Proposed Fix

### Approach

Change `checkpoint_start` from `u.tier_achieved_at` to `v_now` for new recurring instances. The new instance represents a fresh mission cycle starting NOW, not the same checkpoint period as the original.

### Changes Required

**File:** `supabase/migrations/YYYYMMDDHHMMSS_fix_recurring_checkpoint_start.sql`

**Before:**
```sql
SELECT
  gen_random_uuid(),
  p_client_id,
  v_mission_id,
  v_user_id,
  0,
  CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
  CASE WHEN v_cooldown_days > 0 THEN v_now + (v_cooldown_days || ' days')::INTERVAL ELSE NULL END,
  u.tier_achieved_at,     -- checkpoint_start
  u.next_checkpoint_at,   -- checkpoint_end
  v_now,
  v_now
FROM missions m, users u
```

**After:**
```sql
SELECT
  gen_random_uuid(),
  p_client_id,
  v_mission_id,
  v_user_id,
  0,
  CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
  CASE WHEN v_cooldown_days > 0 THEN v_now + (v_cooldown_days || ' days')::INTERVAL ELSE NULL END,
  v_now,                  -- checkpoint_start: NEW instance starts NOW
  NULL,                   -- checkpoint_end: NULL for recurring (no fixed end)
  v_now,
  v_now
FROM missions m
WHERE m.id = v_mission_id
  AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
```

**Explanation:**
1. `checkpoint_start = v_now` ensures uniqueness (no two instances can have identical start times)
2. `checkpoint_end = NULL` simplifies recurring logic (recurring missions don't have fixed checkpoint periods)
3. Removed `users u` from FROM clause since we no longer need tier dates
4. Added `m.client_id = p_client_id` for defense-in-depth multi-tenant isolation

### RPCs Affected

All three recurring RPCs need this fix:

| RPC | Migration File | Current Line |
|-----|----------------|--------------|
| `claim_instant_reward` | `20251226100000_recurring_missions.sql` | 267-269 |
| `claim_commission_boost` | `20251226221817_fix_commission_boost_client_id.sql` | 102-106 |
| `claim_discount` | `20251226210000_recurring_scheduled_rewards.sql` | 218-220 |

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_fix_recurring_checkpoint_start.sql` | CREATE | Patch all 3 RPCs with corrected checkpoint_start |

### Dependency Graph

```
[New patch migration]
├── DROP FUNCTION IF EXISTS claim_instant_reward
├── DROP FUNCTION IF EXISTS claim_commission_boost
├── DROP FUNCTION IF EXISTS claim_discount
└── CREATE OR REPLACE for all 3 with fixed INSERT
```

---

## 9. Data Flow Analysis

### Before Fix

```
[Claim] → [INSERT mission_progress]
              ↓
       checkpoint_start = u.tier_achieved_at
              ↓
       = 2025-12-15 (same as existing row)
              ↓
       UNIQUE CONSTRAINT VIOLATION
              ↓
       [Transaction FAILED]
```

### After Fix

```
[Claim] → [INSERT mission_progress]
              ↓
       checkpoint_start = v_now
              ↓
       = 2025-12-26 22:30:00 (unique timestamp)
              ↓
       INSERT SUCCEEDS
              ↓
       [New instance created with cooldown_until]
```

### Data Transformation Steps

1. **Step 1:** Creator clicks claim button
2. **Step 2:** RPC updates redemption status to 'claimed'
3. **Step 3:** RPC checks if recurring (weekly/monthly/unlimited)
4. **Step 4:** RPC INSERTs new mission_progress with `checkpoint_start = NOW()` (unique)
5. **Step 5:** New instance has `cooldown_until` set for rate limiting

---

## 10. Call Chain Mapping

### Affected Call Chain

```
[Frontend: Claim Button] (missions-client.tsx)
│
├─► [API Route: /api/missions/[id]/claim] (route.ts)
│   └── Calls missionService.claimMissionReward()
│
├─► [Service: claimMissionReward] (missionService.ts)
│   └── Calls repository.claimReward() or claimInstantReward()
│
├─► [Repository: claimReward/claimInstantReward] (missionRepository.ts)
│   └── Calls supabase.rpc('claim_*')
│
└─► [RPC: claim_instant_reward/claim_commission_boost/claim_discount]
    ├── UPDATE redemption SET status = 'claimed'
    └── ⚠️ BUG IS HERE: INSERT mission_progress with wrong checkpoint_start
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `mission_progress_user_id_mission_id_checkpoint_start_key` | Enforces uniqueness |
| Database | `claim_*` RPCs | Contains buggy INSERT |
| Repository | `claimReward()` / `claimInstantReward()` | Calls buggy RPCs |
| Service | `claimMissionReward()` | Orchestrates claim |
| API Route | `/api/missions/[id]/claim` | Entry point |
| Frontend | missions-client.tsx | Displays error |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| mission_progress | user_id, mission_id, checkpoint_start, cooldown_until | Has unique constraint on (user_id, mission_id, checkpoint_start) |

### Schema Check

```sql
-- Query to verify unique constraint exists
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'mission_progress'
  AND constraint_type = 'UNIQUE';

-- Expected result:
-- mission_progress_user_id_mission_id_checkpoint_start_key
```

### Data Migration Required?
- [x] No - schema already supports fix (just need different values in INSERT)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `app/missions/missions-client.tsx` | None - fix is backend only |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| (none) | - | - | No |

### Frontend Changes Required?
- [x] No - frontend already handles success/error responses correctly

---

## 13. Alternative Solutions Considered

### Option A: Use v_now for checkpoint_start (Selected)
- **Description:** Change `checkpoint_start` from `u.tier_achieved_at` to `v_now`
- **Pros:** Simple, direct fix; guarantees uniqueness; semantically correct (new instance starts now)
- **Cons:** Changes meaning of checkpoint_start for recurring instances
- **Verdict:** ✅ Selected - simplest fix that respects constraint

### Option B: Remove the unique constraint
- **Description:** Drop `mission_progress_user_id_mission_id_checkpoint_start_key`
- **Pros:** Allows any checkpoint_start values
- **Cons:** Dangerous; constraint exists for reason; may break other queries
- **Verdict:** ❌ Rejected - high risk, unknown side effects

### Option C: Use checkpoint_start = NULL for recurring
- **Description:** Set checkpoint_start to NULL for new recurring instances
- **Pros:** Semantically distinct from original instance
- **Cons:** NULL may cause issues in queries that filter by checkpoint_start; constraint may not allow NULL
- **Verdict:** ❌ Rejected - unknown query impacts, potential NULL issues

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Fix doesn't work | Low | High | Test in staging before prod |
| Other queries depend on checkpoint_start | Low | Medium | Grep codebase for checkpoint_start usage |
| Concurrent claims race condition | Low | Low | ON CONFLICT DO NOTHING already handles this |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response unchanged |
| Database | No | New data format, old data unaffected |
| Frontend | No | No changes needed |

---

## 15. Testing Strategy

### Unit Tests

No unit tests required - this is a database RPC fix.

### Integration Tests

```typescript
// Test in Supabase SQL Editor after migration
describe('Recurring Mission Claims', () => {
  it('should create new instance with unique checkpoint_start', async () => {
    // 1. Complete a weekly mission
    // 2. Claim the reward
    // 3. Verify two mission_progress rows exist
    // 4. Verify checkpoint_start values are different
  });
});
```

### Manual Verification Steps

1. [ ] Apply migration to Supabase
2. [ ] Create/reset a weekly commission_boost mission for test user
3. [ ] Complete mission (set current_value = target_value)
4. [ ] Create claimable redemption
5. [ ] Claim via UI - schedule the commission boost
6. [ ] Query mission_progress: verify TWO rows exist
7. [ ] Verify new row has `checkpoint_start = claim time`, not `tier_achieved_at`
8. [ ] Verify new row has `cooldown_until = claim time + 7 days`

### Verification Commands

```bash
# After migration, verify RPCs exist
npx supabase migration list

# Type check (no app changes needed)
cd /home/jorge/Loyalty/Rumi/appcode && npm run build
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current RPCs use `u.tier_achieved_at` pattern
- [ ] Backup database before migration

### Implementation Steps
- [ ] **Step 1:** Generate 14-digit UTC timestamp
  - Command: `date -u +"%Y%m%d%H%M%S"`

- [ ] **Step 2:** Create patch migration file
  - File: `supabase/migrations/YYYYMMDDHHMMSS_fix_recurring_checkpoint_start.sql`
  - Content: DROP + CREATE for all 3 RPCs with `v_now` instead of `u.tier_achieved_at`

- [ ] **Step 3:** Verify migration history clean
  - Command: `npx supabase migration list`

- [ ] **Step 4:** Push migration
  - Command: `npx supabase db push`

- [ ] **Step 5:** Test claim flow in UI

### Post-Implementation
- [ ] Verify in Supabase SQL Editor that RPCs use `v_now`
- [ ] Manual verification per Testing Strategy
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| GAP-RECURRING-001 | Recurring Missions for Instant Rewards | Fix required in claim_instant_reward |
| GAP-RECURRING-002 | Recurring Missions for Scheduled Rewards | Fix required in claim_commission_boost, claim_discount |

### Updates Required

**All three RPCs need the same fix:**
- Replace `u.tier_achieved_at` with `v_now` for checkpoint_start
- Replace `u.next_checkpoint_at` with `NULL` for checkpoint_end
- Remove `users u` from FROM clause (no longer needed)

### New Tasks Created (if any)
- None - this is a bugfix for existing tasks

---

## 18. Definition of Done

- [ ] Patch migration created with 14-digit timestamp
- [ ] All three RPCs (claim_instant_reward, claim_commission_boost, claim_discount) updated
- [ ] Migration pushed via `npx supabase db push`
- [ ] Manual test: claim recurring mission without constraint error
- [ ] Two mission_progress rows verified after claim
- [ ] New row has cooldown_until set correctly
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `baseline.sql` | Line 1298 - UNIQUE constraint definition | Explains why INSERT fails |
| `20251226100000_recurring_missions.sql` | Lines 254-276 - INSERT statement | Shows buggy pattern |
| `20251226210000_recurring_scheduled_rewards.sql` | Lines 95-117, 206-228 | Same buggy pattern |
| `20251226221817_fix_commission_boost_client_id.sql` | Lines 88-110 | Latest version with buggy pattern |
| `RecurringMissionsGap.md` | Section 6 - claim_instant_reward | Original specification with flaw |
| `RecurringScheduledRewardsGap.md` | Section 6 - claim_commission_boost/discount | Copied flawed pattern |

### Reading Order for External Auditor

1. **First:** `baseline.sql` Line 1298 - Understand the unique constraint
2. **Second:** Error log in Section 3 - See the actual failure
3. **Third:** `20251226100000_recurring_missions.sql` Lines 267-269 - See the buggy INSERT
4. **Fourth:** Section 7 Proposed Fix - Understand the solution

---

## 20. Audit Responses

**Audit Recommendation:** APPROVE WITH CHANGES

### Critical Issues Addressed

**Issue: Multi-tenant guard missing in new INSERTs**
- **Response:** Added `AND m.client_id = p_client_id` to all three recurring INSERTs
- **Rationale:** Defense-in-depth even though v_mission_id is pre-validated

### Concerns Addressed

**Concern 1: checkpoint_end = NULL impact**
- **Response:** NULL is SAFE - verified via codebase grep
- **Evidence:**
  - `missionService.ts:704` guards: `if (progress?.checkpointEnd && status === 'in_progress')`
  - Types already nullable: `checkpoint_end: string | null` in database.ts, rpc.ts, missionRepository.ts
  - Test fixtures explicitly test NULL cases in missionstests.md

**Concern 2: Concurrency on checkpoint_start**
- **Response:** Accept negligible risk
- **Rationale:**
  - `v_now` uses microsecond precision - collision astronomically unlikely
  - RPC already uses `FOR UPDATE` on redemption row, serializing concurrent claims
  - PostgreSQL only allows one ON CONFLICT per INSERT (already used for cooldown index)

### Final Fix Summary

| Change | Before | After |
|--------|--------|-------|
| checkpoint_start | `u.tier_achieved_at` | `v_now` |
| checkpoint_end | `u.next_checkpoint_at` | `NULL` |
| FROM clause | `FROM missions m, users u` | `FROM missions m WHERE m.client_id = p_client_id` |
| Multi-tenant guard | Missing | Added `m.client_id = p_client_id` |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Analysis Complete
