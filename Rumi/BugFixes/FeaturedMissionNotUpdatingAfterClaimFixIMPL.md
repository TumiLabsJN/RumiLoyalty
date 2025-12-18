# FeaturedMissionNotUpdatingAfterClaim - Implementation Plan

**Decision Source:** FeaturedMissionNotUpdatingAfterClaimFix.md
**Bug ID:** BUG-003-FeaturedMissionPostClaim
**Severity:** Medium
**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Code (Opus 4.5)

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From FeaturedMissionNotUpdatingAfterClaimFix.md:**

**Bug Summary:** After claiming a mission reward, Home page continues showing the same completed mission instead of moving to the next available mission.

**Root Cause:** The `get_dashboard_data` RPC function's featured mission query filters by `mission_progress.status` to exclude claimed missions, but the claim flow only updates `redemption.status`, not `mission_progress.status`. Additionally, `mission_progress.status` doesn't have 'claimed' or 'fulfilled' values - the filter is effectively a no-op.

**Files Affected:**
- `supabase/migrations/20251217120000_get_dashboard_data.sql` (reference only)
- `supabase/migrations/[NEW]_fix_featured_mission_claimed_filter.sql` (to be created)

**Chosen Solution:**
From Fix.md Section 7 - Proposed Fix:

1. Add LEFT JOIN to redemptions table:
```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id
  AND red.deleted_at IS NULL
```

2. Replace filter (line 113) with simplified logic:
```sql
AND (red.id IS NULL OR red.status = 'claimable')
```

**Why This Solution:**
- Uses correct data source (`redemption.status`) for claim state, not `mission_progress.status`
- Minimal change - only adds one JOIN and replaces one filter line
- No schema changes required
- Correct separation of concerns: mission_progress tracks goal progress, redemption tracks claim lifecycle
- UNIQUE constraint on `(user_id, mission_progress_id)` prevents duplicate rows from JOIN

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: None
- Concerns Addressed:
  - Status enum distinction clarified (Section 1.1 added)
  - Simplified filter validated with case analysis
  - Dormant missions confirmed no behavior change
  - BUG-004 (Section 5 fulfillment) tracked separately
  - Index verification added to risk assessment

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1 (new migration file created)
- Lines changed: ~250 (full RPC function replacement)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO (response shape unchanged)

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable modified files

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be referenced:**

**File 1:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251217120000_get_dashboard_data.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251217120000_get_dashboard_data.sql
```
**Expected:** File exists

**Migration directory:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
**Expected:** Directory exists, contains migration files

**Checklist:**
- [ ] Original RPC migration file exists
- [ ] Migrations directory exists
- [ ] Ready to create new migration file

---

### Gate 3: Current Code State Verification

**Read current state of code to be modified:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251217120000_get_dashboard_data.sql lines 99-114
```

**Expected Current State:**
```sql
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id
    AND mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on mission_progress
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND rp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on raffle_participations
    AND m.mission_type = 'raffle'
  WHERE m.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on missions
    AND m.enabled = true
    AND (m.tier_eligibility = v_current_tier.tier_id OR m.tier_eligibility = 'all')
    AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
    AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))
    AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
```

**Checklist:**
- [ ] Current code matches expected state: [YES / NO]
- [ ] Line 113 contains buggy filter: `mp.status NOT IN ('claimed', 'fulfilled')`
- [ ] No redemptions JOIN currently exists

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification (Database Bug)

**Read SchemaFinalv2.md for redemptions table:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 594-662
```

**Tables involved:** `redemptions`, `mission_progress`

**Column verification:**

| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| `red.id` | `redemptions.id` (UUID PRIMARY KEY) | ✅ |
| `red.mission_progress_id` | `redemptions.mission_progress_id` (UUID FK to mission_progress) | ✅ |
| `red.user_id` | `redemptions.user_id` (UUID FK to users) | ✅ |
| `red.client_id` | `redemptions.client_id` (UUID FK to clients) | ✅ |
| `red.status` | `redemptions.status` (VARCHAR(50), values: claimable, claimed, fulfilled, concluded, rejected) | ✅ |
| `red.deleted_at` | `redemptions.deleted_at` (TIMESTAMP, soft delete) | ✅ |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] Nullable handling correct (deleted_at is nullable)
- [ ] Foreign key `mission_progress_id` references `mission_progress(id)` - verified
- [ ] UNIQUE constraint on `(user_id, mission_progress_id)` prevents duplicate rows

---

### Gate 5: API Contract Verification (API Bug)

**Endpoint:** GET /api/dashboard

**Response verification:**
The `featuredMission` field structure remains unchanged. Only the filtering logic changes (which missions are selected).

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `featuredMission` | Returns claimed missions | Excludes claimed missions | No (behavior fix) |

**Checklist:**
- [ ] Response shape unchanged
- [ ] Field names unchanged
- [ ] No breaking changes to API contract

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Create New Migration File with Updated RPC Function

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql`
**Action Type:** CREATE (new file)

---

#### Pre-Action Reality Check

**Verify migration file does not already exist:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```

**Expected:** File does not exist (ls returns error)

**Reality Check:**
- [ ] Command executed
- [ ] File does not exist: [YES / NO]

---

#### Write Action

**Create new migration file with complete updated RPC function:**

**NEW File Content:**
```sql
-- Migration: Fix featured mission query to exclude claimed missions
-- Purpose: Add redemptions JOIN and filter by redemption.status instead of mission_progress.status
-- Bug ID: BUG-003-FeaturedMissionPostClaim
-- Reference: FeaturedMissionNotUpdatingAfterClaimFix.md
-- Date: 2025-12-17

-- The current filter `mp.status NOT IN ('claimed', 'fulfilled')` is ineffective because:
-- 1. mission_progress.status only has values: 'active', 'dormant', 'completed'
-- 2. 'claimed' and 'fulfilled' are redemption.status values, not mission_progress.status
-- 3. The filter always passes, so claimed missions still appear

-- Fix: JOIN redemptions table and filter by redemption.status

CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY: Prevent search_path injection
AS $$
DECLARE
  v_result JSON;
  v_user_data RECORD;
  v_current_tier RECORD;
  v_next_tier RECORD;
  v_featured_mission RECORD;
  v_recent_fulfillment RECORD;
  v_rewards JSON;
  v_rewards_count INTEGER;
BEGIN
  -- 1. Get user with client data
  SELECT
    u.id,
    u.tiktok_handle,
    u.email,
    u.current_tier,
    u.checkpoint_sales_current,
    u.checkpoint_units_current,
    u.manual_adjustments_total,
    u.manual_adjustments_units,
    u.next_checkpoint_at,
    u.last_login_at,
    c.id AS client_id,
    c.name AS client_name,
    c.vip_metric,
    c.checkpoint_months
  INTO v_user_data
  FROM users u
  INNER JOIN clients c ON u.client_id = c.id
  WHERE u.id = p_user_id
    AND u.client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  IF v_user_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Get current tier
  SELECT
    tier_id, tier_name, tier_color, tier_order, checkpoint_exempt,
    sales_threshold, units_threshold
  INTO v_current_tier
  FROM tiers
  WHERE tier_id = v_user_data.current_tier
    AND client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  -- Guard: If current tier not found, return NULL (prevents exception on v_current_tier.tier_order)
  IF v_current_tier IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Get next tier (tier_order + 1)
  SELECT
    id, tier_id, tier_name, tier_color, tier_order,
    sales_threshold, units_threshold
  INTO v_next_tier
  FROM tiers
  WHERE client_id = p_client_id
    AND tier_order = v_current_tier.tier_order + 1;

  -- 4. Get featured mission (highest priority, not claimed)
  -- BUG-003 FIX: Added redemptions JOIN and filter by redemption.status
  SELECT
    m.id AS mission_id,
    m.mission_type,
    m.display_name,
    m.title,
    m.description,
    m.target_value,
    m.target_unit,
    m.raffle_end_date,
    m.activated,
    m.tier_eligibility,
    mp.id AS progress_id,
    mp.current_value,
    mp.status AS progress_status,
    mp.completed_at,
    r.id AS reward_id,
    r.type AS reward_type,
    r.name AS reward_name,
    r.description AS reward_description,
    r.value_data AS reward_value_data,
    t.tier_name AS tier_name,
    t.tier_color AS tier_color
  INTO v_featured_mission
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id
    AND mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on mission_progress
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND rp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on raffle_participations
    AND m.mission_type = 'raffle'
  -- BUG-003 FIX: Added redemptions JOIN to check claim status
  LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
    AND red.user_id = p_user_id
    AND red.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on redemptions
    AND red.deleted_at IS NULL
  WHERE m.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on missions
    AND m.enabled = true
    AND (m.tier_eligibility = v_current_tier.tier_id OR m.tier_eligibility = 'all')
    AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
    -- BUG-003 FIX: Replaced ineffective mp.status filter with redemption.status check
    -- Old: AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))
    -- New: Show if no redemption exists OR redemption is still claimable
    AND (red.id IS NULL OR red.status = 'claimable')
    AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
  ORDER BY
    CASE m.mission_type
      WHEN 'raffle' THEN 0
      WHEN 'sales_dollars' THEN CASE WHEN v_user_data.vip_metric = 'sales' THEN 1 ELSE 2 END
      WHEN 'sales_units' THEN CASE WHEN v_user_data.vip_metric = 'units' THEN 1 ELSE 2 END
      WHEN 'videos' THEN 3
      WHEN 'likes' THEN 4
      WHEN 'views' THEN 5
      ELSE 999
    END ASC
  LIMIT 1;

  -- 5. Check for recent fulfillment (congrats modal)
  -- NOTE: BUG-004 exists here - mp.status='fulfilled' is invalid, tracked separately
  SELECT
    mp.id AS progress_id,
    mp.completed_at AS fulfilled_at,
    r.type AS reward_type,
    r.name AS reward_name,
    COALESCE((r.value_data->>'amount')::INTEGER, 0) AS reward_amount  -- Safe cast with fallback
  INTO v_recent_fulfillment
  FROM mission_progress mp
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  WHERE mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
    AND mp.status = 'fulfilled'
    AND (v_user_data.last_login_at IS NULL OR mp.completed_at > v_user_data.last_login_at)
  ORDER BY mp.completed_at DESC
  LIMIT 1;

  -- 6. Get top 4 tier rewards
  SELECT json_agg(reward_row)
  INTO v_rewards
  FROM (
    SELECT
      r.id,
      r.type,
      r.name,
      r.description,
      r.value_data,
      r.reward_source,
      r.redemption_quantity,
      r.display_order
    FROM rewards r
    WHERE r.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
      AND r.tier_eligibility = v_current_tier.tier_id
      AND r.enabled = true
      AND r.reward_source = 'vip_tier'
    ORDER BY r.display_order ASC
    LIMIT 4
  ) reward_row;

  -- 7. Get total rewards count
  SELECT COUNT(*)
  INTO v_rewards_count
  FROM rewards
  WHERE client_id = p_client_id
    AND tier_eligibility = v_current_tier.tier_id
    AND enabled = true
    AND reward_source = 'vip_tier';

  -- 8. Build response JSON
  v_result := json_build_object(
    'user', json_build_object(
      'id', v_user_data.id,
      'handle', v_user_data.tiktok_handle,
      'email', v_user_data.email,
      'clientName', v_user_data.client_name
    ),
    'client', json_build_object(
      'id', v_user_data.client_id,
      'vipMetric', v_user_data.vip_metric,
      'checkpointMonths', v_user_data.checkpoint_months
    ),
    'currentTier', json_build_object(
      'id', v_current_tier.tier_id,
      'name', v_current_tier.tier_name,
      'color', v_current_tier.tier_color,
      'order', v_current_tier.tier_order,
      'checkpointExempt', COALESCE(v_current_tier.checkpoint_exempt, false)
    ),
    'nextTier', CASE WHEN v_next_tier.tier_id IS NOT NULL THEN json_build_object(
      'id', v_next_tier.tier_id,
      'name', v_next_tier.tier_name,
      'color', v_next_tier.tier_color,
      'salesThreshold', v_next_tier.sales_threshold,
      'unitsThreshold', v_next_tier.units_threshold
    ) ELSE NULL END,
    'checkpointData', json_build_object(
      'salesCurrent', v_user_data.checkpoint_sales_current,
      'unitsCurrent', v_user_data.checkpoint_units_current,
      'manualAdjustmentsTotal', v_user_data.manual_adjustments_total,
      'manualAdjustmentsUnits', v_user_data.manual_adjustments_units,
      'nextCheckpointAt', v_user_data.next_checkpoint_at,
      'lastLoginAt', v_user_data.last_login_at
    ),
    'featuredMission', CASE WHEN v_featured_mission.mission_id IS NOT NULL THEN json_build_object(
      'missionId', v_featured_mission.mission_id,
      'missionType', v_featured_mission.mission_type,
      'displayName', v_featured_mission.display_name,
      'targetValue', v_featured_mission.target_value,
      'targetUnit', v_featured_mission.target_unit,
      'raffleEndDate', v_featured_mission.raffle_end_date,
      'activated', v_featured_mission.activated,
      'progressId', v_featured_mission.progress_id,
      'currentValue', COALESCE(v_featured_mission.current_value, 0),
      'progressStatus', v_featured_mission.progress_status,
      'completedAt', v_featured_mission.completed_at,
      'rewardId', v_featured_mission.reward_id,
      'rewardType', v_featured_mission.reward_type,
      'rewardName', v_featured_mission.reward_name,
      'rewardValueData', v_featured_mission.reward_value_data,
      'tierName', v_featured_mission.tier_name,
      'tierColor', v_featured_mission.tier_color
    ) ELSE NULL END,
    'recentFulfillment', CASE WHEN v_recent_fulfillment.progress_id IS NOT NULL THEN json_build_object(
      'fulfilledAt', v_recent_fulfillment.fulfilled_at,
      'rewardType', v_recent_fulfillment.reward_type,
      'rewardName', v_recent_fulfillment.reward_name,
      'rewardAmount', v_recent_fulfillment.reward_amount
    ) ELSE NULL END,
    'currentTierRewards', COALESCE(v_rewards, '[]'::json),
    'totalRewardsCount', v_rewards_count
  );

  RETURN v_result;
END;
$$;

-- SECURITY: Revoke default PUBLIC access, then grant only to specific roles
REVOKE EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO service_role;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
Content: [above SQL content]
```

**Change Summary:**
- Lines added: ~260 (new migration file)
- Key changes:
  1. Added LEFT JOIN to redemptions (lines 113-116 in new file)
  2. Replaced filter with `AND (red.id IS NULL OR red.status = 'claimable')` (line 121 in new file)
  3. Added BUG-003 FIX comments for traceability
  4. Added NOTE about BUG-004 in Section 5

---

#### Post-Action Verification

**Read created file to verify content:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql lines 1-30
```

**Expected:** File exists with migration header and CREATE OR REPLACE FUNCTION

**Verify key changes are present:**
```bash
grep -n "LEFT JOIN redemptions red" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```
**Expected:** Line containing redemptions JOIN

```bash
grep -n "red.id IS NULL OR red.status = 'claimable'" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```
**Expected:** Line containing new filter logic

**State Verification:**
- [ ] File created successfully
- [ ] Redemptions JOIN present
- [ ] New filter logic present
- [ ] BUG-003 FIX comments present

---

#### Step Verification

**SQL Syntax Check (basic):**
```bash
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```
**Expected:** 1 (one function definition)

```bash
grep -c "END;" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```
**Expected:** 1 (function properly closed)

**Step Checkpoint:**
- [ ] Pre-action state matched expected (file did not exist)
- [ ] File created successfully
- [ ] Post-action state matches expected (all key elements present)
- [ ] SQL syntax appears valid

**Checkpoint Status:** [PASS / FAIL]
**If FAIL:** [Exact failure point and actual state]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** Featured mission query with new redemptions JOIN

```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on redemptions
  AND red.deleted_at IS NULL
```

**Security Checklist:**
- [ ] `red.user_id = p_user_id` present - user isolation
- [ ] `red.client_id = p_client_id` present - tenant isolation
- [ ] `red.deleted_at IS NULL` present - soft delete respected
- [ ] No cross-tenant data exposure possible

**Other JOINs in query (unchanged, verify still correct):**
- [ ] `mission_progress` has `mp.client_id = p_client_id`
- [ ] `raffle_participations` has `rp.client_id = p_client_id`
- [ ] `missions` has `m.client_id = p_client_id` in WHERE

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**For Database/Query Bugs:**

After applying migration, test the RPC directly:
```sql
-- In Supabase SQL Editor or via supabase db push
SELECT * FROM get_dashboard_data(
  'a05f5d26-2d93-4156-af86-70a88604c7d8'::UUID,
  '[client-id]'::UUID
);
```

**Expected:**
- If user has claimed mission: `featuredMission` should NOT be the claimed mission
- If user has claimable mission: `featuredMission` should be that mission
- If no missions available: `featuredMission` should be NULL

**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed

---

### Verification 2: No New Errors Introduced

**Migration syntax validation:**
```bash
# Apply migration to local database
cd /home/jorge/Loyalty/Rumi && supabase db push --dry-run
```
**Expected:** Migration applies without syntax errors
**Actual:** [document output]

**Status:**
- [ ] No syntax errors in migration

---

### Verification 3: EXPLAIN ANALYZE (Performance Check)

**Run EXPLAIN ANALYZE on the featured mission query:**
```sql
EXPLAIN ANALYZE
SELECT
  m.id AS mission_id,
  m.mission_type,
  -- ... (rest of select)
FROM missions m
INNER JOIN rewards r ON m.reward_id = r.id
LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
LEFT JOIN mission_progress mp ON m.id = mp.mission_id
  AND mp.user_id = '[test-user-id]'
  AND mp.client_id = '[test-client-id]'
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
  AND rp.user_id = '[test-user-id]'
  AND rp.client_id = '[test-client-id]'
  AND m.mission_type = 'raffle'
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = '[test-user-id]'
  AND red.client_id = '[test-client-id]'
  AND red.deleted_at IS NULL
WHERE m.client_id = '[test-client-id]'
  AND m.enabled = true
  AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
  AND (red.id IS NULL OR red.status = 'claimable')
  AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
ORDER BY m.mission_type
LIMIT 1;
```

**Expected:** Reasonable execution time (< 100ms), index usage on redemptions JOIN
**Actual:** [document EXPLAIN ANALYZE output]

**Index verification:**
- [ ] `idx_redemptions_unique_mission` used (user_id, mission_progress_id)
- [ ] No sequential scans on large tables
- [ ] Execution time acceptable

**Status:**
- [ ] Performance check passed

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] `redemptions.id` column exists (UUID PRIMARY KEY)
- [ ] `redemptions.mission_progress_id` column exists (UUID FK)
- [ ] `redemptions.user_id` column exists (UUID FK)
- [ ] `redemptions.client_id` column exists (UUID FK)
- [ ] `redemptions.status` column exists (VARCHAR with correct values)
- [ ] `redemptions.deleted_at` column exists (TIMESTAMP nullable)

---

### Verification 5: Manual Test (Runtime)

**Test Steps:**
1. [ ] Start dev server: `npm run dev`
2. [ ] Log in as test user with claimed mission
3. [ ] Navigate to Home page
4. [ ] Verify claimed mission is NOT shown as featured
5. [ ] Verify next available mission is shown (or "no missions" state)
6. [ ] Navigate to Missions page to confirm claimed mission shows as "Pending"

**Expected:** Home page no longer shows claimed missions
**Actual:** [document actual behavior]

**Status:**
- [ ] Runtime test passed

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git status
git diff --stat
```

**Expected Changes:**
- `supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql`: NEW FILE (~260 lines)

**Actual Changes:** [document git status output]

**Status:**
- [ ] Only expected file created
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

**FINAL VERIFICATION STATUS:** [ALL PASSED / FAILED]

**If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-17
**Executor:** Claude Code (Opus 4.5)
**Decision Source:** FeaturedMissionNotUpdatingAfterClaimFix.md
**Implementation Doc:** FeaturedMissionNotUpdatingAfterClaimFixIMPL.md
**Bug ID:** BUG-003-FeaturedMissionPostClaim

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create migration file - Pre [status] - Write [status] - Post [status] - Verified [status]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Bug-specific validation [status]
[Timestamp] No syntax errors [status]
[Timestamp] EXPLAIN ANALYZE [status]
[Timestamp] Schema alignment [status]
[Timestamp] Runtime test [status]
[Timestamp] Git diff sanity [status]
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `/home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql` - NEW FILE - ~260 lines - CREATE OR REPLACE FUNCTION with redemptions JOIN and filter fix

**Total:** 1 file created, ~260 lines added

---

### Bug Resolution

**Before Implementation:**
- Bug: After claiming a mission reward, Home page shows same completed mission
- Root cause: Filter checks `mission_progress.status` for values that don't exist ('claimed', 'fulfilled')

**After Implementation:**
- Bug: RESOLVED
- Verification: Filter now checks `redemption.status` via proper JOIN

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: FeaturedMissionNotUpdatingAfterClaimFix.md
- Documented 20 sections
- Proposed solution: Add redemptions JOIN, simplify filter

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: Status enum distinction, dormant behavior, BUG-004 tracked

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: FeaturedMissionNotUpdatingAfterClaimFixIMPL.md
- Executed 1 implementation step (create migration)
- All verifications: [pending]

**Step 4: Current Status**
- Implementation: [PENDING EXECUTION]
- Bug resolved: [PENDING VERIFICATION]
- Ready for commit: [PENDING]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql

# 2. Verify redemptions JOIN is present
grep -n "LEFT JOIN redemptions red" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql

# 3. Verify new filter is present
grep -n "red.id IS NULL OR red.status = 'claimable'" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql

# 4. Verify multi-tenant filter on redemptions
grep -n "red.client_id = p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql

# 5. Verify function structure
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217130000_fix_featured_mission_claimed_filter.sql
```

**Expected Results:**
- Migration file exists
- Redemptions JOIN present with correct conditions
- New filter logic present
- Multi-tenant filter present
- One function definition

**Audit Status:** [VERIFIED / ISSUES FOUND]
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5 or X/Y]
- Steps completed: [1/1]
- Verifications passed: [6/6 or X/Y]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: 1
- Lines changed: ~260 (new file)
- Breaking changes: 0
- Security verified: YES
- Tests updated: N/A (manual test)

---

## Document Status

**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Code (Opus 4.5)
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [ ] Schema verified
- [ ] API contract verified (no changes)

**Implementation:**
- [ ] Step 1 completed (migration file created)
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified (client_id filter on redemptions JOIN)
- [ ] Auth requirements met (RPC uses SECURITY DEFINER)

**Verification:**
- [ ] Bug-specific validation passed
- [ ] No syntax errors
- [ ] EXPLAIN ANALYZE shows acceptable performance
- [ ] Schema alignment confirmed
- [ ] Runtime test passed
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed
- [ ] Metrics documented

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**Next Actions:**

1. [ ] Execute implementation (create migration file)
2. [ ] Run all gates and verifications
3. [ ] Apply migration: `supabase db push`
4. [ ] Run EXPLAIN ANALYZE
5. [ ] Manual test in browser
6. [ ] Git commit with message:

```
fix: exclude claimed missions from Home page featured mission

Resolves BUG-003: Featured mission not updating after claim
Implements solution from FeaturedMissionNotUpdatingAfterClaimFix.md

Changes:
- Added LEFT JOIN to redemptions table in get_dashboard_data RPC
- Replaced ineffective mp.status filter with redemption.status check
- Filter now correctly uses: AND (red.id IS NULL OR red.status = 'claimable')

References:
- FeaturedMissionNotUpdatingAfterClaimFix.md
- FeaturedMissionNotUpdatingAfterClaimFixIMPL.md

Co-Authored-By: Claude <noreply@anthropic.com>
```

7. [ ] Update FeaturedMissionNotUpdatingAfterClaimFix.md status to "Implemented"

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [x] Read SchemaFinalv2.md for redemptions table schema
- [x] Read get_dashboard_data.sql for current code state
- [x] Used exact line numbers from files
- [x] Used complete code blocks (no placeholders)
- [ ] Will run EVERY bash command during execution (not imagined output)
- [ ] Will verify ACTUAL vs EXPECTED during execution

### Execution Integrity
- [x] Steps defined in exact order
- [x] Checkpoints defined for each step
- [x] STOP conditions defined for failures
- [ ] Will fill in ALL blanks during execution

### Decision Fidelity
- [x] Followed locked decision from Fix.md
- [x] Implemented chosen solution exactly (redemptions JOIN + simplified filter)
- [x] Addressed audit feedback (status enum distinction, dormant behavior, BUG-004 note)

### Security Verification
- [x] Multi-tenant isolation defined for redemptions JOIN
- [x] All client_id filters documented
- [x] No cross-tenant exposure possible

### Documentation Completeness
- [x] All sections present
- [x] All commands documented
- [x] Audit trail structure complete
- [ ] Will record actual outputs during execution

---

**META-VERIFICATION STATUS:** [READY FOR EXECUTION]

**RED FLAGS exhibited:** None

---

**Document Version:** 1.0
**Created:** 2025-12-17
**Author:** Claude Code (Opus 4.5)
**Status:** Ready for Execution Approval
