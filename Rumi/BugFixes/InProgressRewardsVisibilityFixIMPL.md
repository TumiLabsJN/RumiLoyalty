# InProgressRewardsVisibility - Implementation Plan

**Decision Source:** InProgressRewardsVisibilityFix.md
**Bug ID:** BUG-INPROGRESS-VISIBILITY
**Severity:** High
**Implementation Date:** 2025-12-12
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From InProgressRewardsVisibilityFix.md:**

**Bug Summary:** In-progress VIP rewards and mission rewards disappear from UI when user is demoted because RPC queries filter strictly by current tier eligibility.

**Root Cause:** Both `get_available_rewards` and `get_available_missions` RPC functions filter rewards/missions strictly by tier eligibility without considering existing active redemptions.

**Files Affected:** `supabase/migrations/20251203_single_query_rpc_functions.sql` (via new migration)

**Chosen Solution:**
1. Add `AND red.client_id = p_client_id` to both RPCs' redemptions JOINs for multi-tenant isolation
2. Add `AND red.status NOT IN ('concluded', 'rejected')` to missions RPC JOIN (already exists in rewards)
3. Modify WHERE clauses to: `(standard eligibility) OR red.id IS NOT NULL`

**Why This Solution:**
- Minimal change - only WHERE clause and JOIN modifications
- No frontend impact - response is additive
- Defense-in-depth multi-tenant isolation per Codex audit
- Consistent pattern between both RPCs
- Simple `red.id IS NOT NULL` covers all reward types without per-type complexity

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Added client_id to redemptions JOINs
- Concerns Addressed: Documented disabled rewards with active redemptions as intentional

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 1 (new migration file)
- Lines changed: ~100 (new migration)
- Breaking changes: NO
- Schema changes: NO (RPC signature unchanged)
- API contract changes: NO (response additive)

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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` or `/home/jorge/Loyalty/Rumi`

**Migrations Directory Exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
**Expected:** Directory exists with existing migrations

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Migrations directory exists
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**File to reference:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251203_single_query_rpc_functions.sql`

```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251203_single_query_rpc_functions.sql
```
**Expected:** File exists

**Checklist:**
- [ ] Source RPC file exists
- [ ] File readable
- [ ] File path matches Fix.md

---

### Gate 3: Current Code State Verification - get_available_missions

**Read current JOIN and WHERE for missions RPC:**

**Expected Current State (Lines 147-160):**
```sql
  LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
    AND red.user_id = p_user_id
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
  WHERE m.client_id = p_client_id
    AND m.enabled = true
    AND (
      m.tier_eligibility = p_current_tier
      OR m.tier_eligibility = 'all'
      OR m.preview_from_tier = p_current_tier
    )
```

**Issues to fix:**
1. Missing `AND red.client_id = p_client_id` in JOIN
2. Missing `AND red.status NOT IN ('concluded', 'rejected')` in JOIN
3. WHERE clause doesn't include `OR red.id IS NOT NULL`

**Checklist:**
- [ ] Current missions RPC code matches expected state: [YES / NO]
- [ ] Line numbers accurate
- [ ] Issues confirmed

---

### Gate 4: Current Code State Verification - get_available_rewards

**Read current JOIN and WHERE for rewards RPC:**

**Expected Current State (Lines 270-283):**
```sql
  LEFT JOIN redemptions red ON r.id = red.reward_id
    AND red.user_id = p_user_id
    AND red.mission_progress_id IS NULL
    AND red.status NOT IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  WHERE r.client_id = p_client_id
    AND r.enabled = true
    AND r.reward_source = 'vip_tier'
    AND (
      r.tier_eligibility = p_current_tier
      OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
    )
```

**Issues to fix:**
1. Missing `AND red.client_id = p_client_id` in JOIN
2. WHERE clause doesn't include `OR red.id IS NOT NULL`

**Checklist:**
- [ ] Current rewards RPC code matches expected state: [YES / NO]
- [ ] Line numbers accurate
- [ ] Issues confirmed

---

### Gate 5: Schema Verification

**Verify redemptions table has client_id column:**

Per SchemaFinalv2.md, redemptions table section:
- `client_id` UUID REFERENCES clients(id) ON DELETE CASCADE - Multi-tenant isolation

**Checklist:**
- [ ] redemptions.client_id exists in schema
- [ ] redemptions.status column exists with valid values
- [ ] Foreign key to clients table confirmed

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

### Step 1: Create New Migration File

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify file doesn't exist:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql 2>&1
```
**Expected:** File not found (doesn't exist yet)

**Reality Check:**
- [ ] Command executed
- [ ] File does not exist: [YES / NO]

---

#### Create Migration File

**NEW File Content:**
```sql
-- Migration: Fix In-Progress Rewards Visibility on Demotion
-- Purpose: Ensure in-progress rewards remain visible after tier demotion
-- Date: 2025-12-12
-- Bug ID: BUG-INPROGRESS-VISIBILITY
-- References: InProgressRewardsVisibilityFix.md
--
-- Changes:
-- 1. get_available_missions: Add client_id and status filter to redemptions JOIN, modify WHERE
-- 2. get_available_rewards: Add client_id to redemptions JOIN, modify WHERE
--
-- Both RPCs now include rewards/missions where user has active redemption
-- regardless of tier eligibility or enabled status.

-- ============================================================================
-- FUNCTION 1: get_available_missions (UPDATED)
-- ============================================================================
-- Changes from original:
-- - Added: AND red.client_id = p_client_id (multi-tenant isolation)
-- - Added: AND red.status NOT IN ('concluded', 'rejected') (active redemptions only)
-- - Modified WHERE: Added OR red.id IS NOT NULL (include in-progress items)

CREATE OR REPLACE FUNCTION get_available_missions(
  p_user_id UUID,
  p_client_id UUID,
  p_current_tier VARCHAR(50)
)
RETURNS TABLE (
  -- Mission columns (from missions table per SchemaFinalv2.md lines 370-421)
  mission_id UUID,
  mission_type VARCHAR(50),
  mission_display_name VARCHAR(255),
  mission_title VARCHAR(255),
  mission_description TEXT,
  mission_target_value INTEGER,
  mission_target_unit VARCHAR(20),
  mission_raffle_end_date TIMESTAMP,
  mission_activated BOOLEAN,
  mission_tier_eligibility VARCHAR(50),
  mission_preview_from_tier VARCHAR(50),
  mission_enabled BOOLEAN,
  mission_display_order INTEGER,
  mission_reward_id UUID,
  -- Reward columns (from rewards table per SchemaFinalv2.md lines 462-590)
  reward_id UUID,
  reward_type VARCHAR(100),
  reward_name VARCHAR(255),
  reward_description VARCHAR(12),
  reward_value_data JSONB,
  reward_redemption_type VARCHAR(50),
  reward_source VARCHAR(50),
  -- Tier columns (from tiers table per SchemaFinalv2.md lines 254-272)
  tier_id VARCHAR(50),
  tier_name VARCHAR(100),
  tier_color VARCHAR(7),
  tier_order INTEGER,
  -- Mission progress columns (from mission_progress table per SchemaFinalv2.md lines 425-458)
  progress_id UUID,
  progress_current_value INTEGER,
  progress_status VARCHAR(50),
  progress_completed_at TIMESTAMP,
  progress_checkpoint_start TIMESTAMP,
  progress_checkpoint_end TIMESTAMP,
  -- Redemption columns (from redemptions table per SchemaFinalv2.md lines 594-662)
  redemption_id UUID,
  redemption_status VARCHAR(50),
  redemption_claimed_at TIMESTAMP,
  redemption_fulfilled_at TIMESTAMP,
  redemption_concluded_at TIMESTAMP,
  redemption_rejected_at TIMESTAMP,
  redemption_scheduled_activation_date DATE,
  redemption_scheduled_activation_time TIME,
  redemption_activation_date TIMESTAMP,
  redemption_expiration_date TIMESTAMP,
  -- Commission boost columns (from commission_boost_redemptions per SchemaFinalv2.md lines 666-746)
  boost_status VARCHAR(50),
  boost_scheduled_activation_date DATE,
  boost_activated_at TIMESTAMP,
  boost_expires_at TIMESTAMP,
  boost_duration_days INTEGER,
  -- Physical gift columns (from physical_gift_redemptions per SchemaFinalv2.md lines 824-888)
  physical_gift_shipped_at TIMESTAMP,
  physical_gift_shipping_city VARCHAR(100),
  physical_gift_requires_size BOOLEAN,
  -- Raffle participation columns (from raffle_participations per SchemaFinalv2.md lines 892-957)
  raffle_is_winner BOOLEAN,
  raffle_participated_at TIMESTAMP,
  raffle_winner_selected_at TIMESTAMP
) AS $$
  SELECT
    -- Mission columns
    m.id,
    m.mission_type,
    m.display_name,
    m.title,
    m.description,
    m.target_value,
    m.target_unit,
    m.raffle_end_date,
    m.activated,
    m.tier_eligibility,
    m.preview_from_tier,
    m.enabled,
    m.display_order,
    m.reward_id,
    -- Reward columns
    r.id,
    r.type,
    r.name,
    r.description,
    r.value_data,
    r.redemption_type,
    r.reward_source,
    -- Tier columns
    t.tier_id,
    t.tier_name,
    t.tier_color,
    t.tier_order,
    -- Mission progress columns (filtered by user)
    mp.id,
    mp.current_value,
    mp.status,
    mp.completed_at,
    mp.checkpoint_start,
    mp.checkpoint_end,
    -- Redemption columns (linked via mission_progress_id)
    red.id,
    red.status,
    red.claimed_at,
    red.fulfilled_at,
    red.concluded_at,
    red.rejected_at,
    red.scheduled_activation_date,
    red.scheduled_activation_time,
    red.activation_date,
    red.expiration_date,
    -- Commission boost columns
    cb.boost_status,
    cb.scheduled_activation_date,
    cb.activated_at,
    cb.expires_at,
    cb.duration_days,
    -- Physical gift columns
    pg.shipped_at,
    pg.shipping_city,
    pg.requires_size,
    -- Raffle participation columns
    rp.is_winner,
    rp.participated_at,
    rp.winner_selected_at
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id
    AND mp.user_id = p_user_id
    AND mp.client_id = p_client_id
  LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
    AND red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.status NOT IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
  WHERE m.client_id = p_client_id
    AND (
      -- Standard eligibility for enabled missions
      (m.enabled = true AND (
        m.tier_eligibility = p_current_tier
        OR m.tier_eligibility = 'all'
        OR m.preview_from_tier = p_current_tier
      ))
      -- OR has active redemption (regardless of enabled/tier)
      OR red.id IS NOT NULL
    )
  ORDER BY m.display_order ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions for get_available_missions
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO service_role;

-- ============================================================================
-- FUNCTION 2: get_available_rewards (UPDATED)
-- ============================================================================
-- Changes from original:
-- - Added: AND red.client_id = p_client_id (multi-tenant isolation)
-- - Modified WHERE: Added OR red.id IS NOT NULL (include in-progress items)

CREATE OR REPLACE FUNCTION get_available_rewards(
  p_user_id UUID,
  p_client_id UUID,
  p_current_tier VARCHAR(50),
  p_current_tier_order INTEGER
)
RETURNS TABLE (
  -- Reward columns (from rewards table per SchemaFinalv2.md lines 462-590)
  reward_id UUID,
  reward_type VARCHAR(100),
  reward_name VARCHAR(255),
  reward_description VARCHAR(12),
  reward_value_data JSONB,
  reward_tier_eligibility VARCHAR(50),
  reward_preview_from_tier VARCHAR(50),
  reward_redemption_frequency VARCHAR(50),
  reward_redemption_quantity INTEGER,
  reward_redemption_type VARCHAR(50),
  reward_source VARCHAR(50),
  reward_display_order INTEGER,
  reward_enabled BOOLEAN,
  reward_expires_days INTEGER,
  -- Tier columns (from tiers table per SchemaFinalv2.md lines 254-272)
  tier_id VARCHAR(50),
  tier_name VARCHAR(100),
  tier_color VARCHAR(7),
  tier_order INTEGER,
  -- Redemption columns (from redemptions table per SchemaFinalv2.md lines 594-662)
  redemption_id UUID,
  redemption_status VARCHAR(50),
  redemption_claimed_at TIMESTAMP,
  redemption_scheduled_activation_date DATE,
  redemption_scheduled_activation_time TIME,
  redemption_activation_date TIMESTAMP,
  redemption_expiration_date TIMESTAMP,
  redemption_fulfilled_at TIMESTAMP,
  -- Commission boost columns (from commission_boost_redemptions per SchemaFinalv2.md lines 666-746)
  boost_status VARCHAR(50),
  boost_scheduled_activation_date DATE,
  boost_activated_at TIMESTAMP,
  boost_expires_at TIMESTAMP,
  boost_duration_days INTEGER,
  boost_rate DECIMAL(5,2),
  boost_sales_at_expiration DECIMAL(10,2),
  -- Physical gift columns (from physical_gift_redemptions per SchemaFinalv2.md lines 824-888)
  physical_gift_requires_size BOOLEAN,
  physical_gift_size_value VARCHAR(20),
  physical_gift_shipping_city VARCHAR(100),
  physical_gift_shipped_at TIMESTAMP
) AS $$
  SELECT
    -- Reward columns
    r.id,
    r.type,
    r.name,
    r.description,
    r.value_data,
    r.tier_eligibility,
    r.preview_from_tier,
    r.redemption_frequency,
    r.redemption_quantity,
    r.redemption_type,
    r.reward_source,
    r.display_order,
    r.enabled,
    r.expires_days,
    -- Tier columns
    t.tier_id,
    t.tier_name,
    t.tier_color,
    t.tier_order,
    -- Redemption columns
    red.id,
    red.status,
    red.claimed_at,
    red.scheduled_activation_date,
    red.scheduled_activation_time,
    red.activation_date,
    red.expiration_date,
    red.fulfilled_at,
    -- Commission boost columns
    cb.boost_status,
    cb.scheduled_activation_date,
    cb.activated_at,
    cb.expires_at,
    cb.duration_days,
    cb.boost_rate,
    cb.sales_at_expiration,
    -- Physical gift columns
    pg.requires_size,
    pg.size_value,
    pg.shipping_city,
    pg.shipped_at
  FROM rewards r
  INNER JOIN tiers t ON r.tier_eligibility = t.tier_id AND r.client_id = t.client_id
  LEFT JOIN redemptions red ON r.id = red.reward_id
    AND red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.mission_progress_id IS NULL
    AND red.status NOT IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  WHERE r.client_id = p_client_id
    AND r.reward_source = 'vip_tier'
    AND (
      -- Standard eligibility for enabled rewards
      (r.enabled = true AND (
        r.tier_eligibility = p_current_tier
        OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
      ))
      -- OR has active redemption (regardless of enabled/tier)
      OR red.id IS NOT NULL
    )
  ORDER BY r.display_order ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions for get_available_rewards
GRANT EXECUTE ON FUNCTION get_available_rewards(UUID, UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rewards(UUID, UUID, VARCHAR, INTEGER) TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After deploying, test with:
--
-- Test 1: Normal user (should return tier-eligible items)
-- SELECT * FROM get_available_missions('user-uuid'::UUID, 'client-uuid'::UUID, 'tier_1');
-- SELECT * FROM get_available_rewards('user-uuid'::UUID, 'client-uuid'::UUID, 'tier_1', 1);
--
-- Test 2: Demoted user with in-progress reward (should still see it)
-- 1. Create redemption for user with tier_3 reward, status='claimed'
-- 2. Update user to tier_2
-- 3. SELECT * FROM get_available_rewards('user-uuid'::UUID, 'client-uuid'::UUID, 'tier_2', 2);
-- 4. Should include the tier_3 reward because red.id IS NOT NULL
--
-- Test 3: Verify concluded rewards are NOT shown
-- 1. Update redemption status to 'concluded'
-- 2. SELECT * FROM get_available_rewards(...)
-- 3. Should NOT include the tier_3 reward (JOIN excludes concluded)
```

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** File exists with correct permissions

**Verify file content (first 20 lines):**
```bash
head -20 /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** Shows migration header and comments

**Verify file content (key changes - missions JOIN):**
```bash
grep -A 5 "LEFT JOIN redemptions red ON mp.id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** Shows `AND red.client_id = p_client_id` and `AND red.status NOT IN`

**Verify file content (key changes - rewards JOIN):**
```bash
grep -A 6 "LEFT JOIN redemptions red ON r.id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** Shows `AND red.client_id = p_client_id`

**Verify file content (WHERE clause changes):**
```bash
grep -A 8 "OR red.id IS NOT NULL" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** Shows the new WHERE clause pattern (appears twice)

**State Verification:**
- [ ] File created successfully
- [ ] Header comments present
- [ ] Missions JOIN has client_id and status filter
- [ ] Rewards JOIN has client_id filter
- [ ] Both WHERE clauses have `OR red.id IS NOT NULL`
- [ ] GRANT statements present for both functions

**Step Checkpoint:**
- [ ] Pre-action state matched expected (file didn't exist)
- [ ] File created successfully
- [ ] Post-action state matches expected
- [ ] All key changes verified

**Checkpoint Status:** [PASS / FAIL]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `get_available_missions`

```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id  -- NEW: Multi-tenant isolation
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
...
WHERE m.client_id = p_client_id
```

**Security Checklist:**
- [ ] `red.client_id = p_client_id` present in JOIN
- [ ] `m.client_id = p_client_id` present in WHERE
- [ ] No cross-tenant data exposure possible

**Query 2:** `get_available_rewards`

```sql
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id  -- NEW: Multi-tenant isolation
  AND red.mission_progress_id IS NULL
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
...
WHERE r.client_id = p_client_id
```

**Security Checklist:**
- [ ] `red.client_id = p_client_id` present in JOIN
- [ ] `r.client_id = p_client_id` present in WHERE
- [ ] No cross-tenant data exposure possible

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: SQL Syntax Validation

**Verify SQL file has valid syntax (basic check):**
```bash
# Count CREATE OR REPLACE FUNCTION statements
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** 2 (one for each function)

**Verify GRANT statements:**
```bash
grep -c "GRANT EXECUTE" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** 4 (two per function)

**Status:**
- [ ] SQL syntax appears valid
- [ ] Correct number of functions
- [ ] Correct number of grants

---

### Verification 2: Key Changes Present

**Verify missions client_id filter added:**
```bash
grep "red.client_id = p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql | wc -l
```
**Expected:** 2 (one in each function)

**Verify missions status filter added:**
```bash
grep "red.status NOT IN" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql | wc -l
```
**Expected:** 2 (one in each function)

**Verify WHERE clause change:**
```bash
grep "OR red.id IS NOT NULL" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql | wc -l
```
**Expected:** 2 (one in each function)

**Status:**
- [ ] client_id filter present in both functions
- [ ] status filter present in both functions
- [ ] WHERE clause change present in both functions

---

### Verification 3: File Line Count

**Verify file is complete:**
```bash
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```
**Expected:** ~280-300 lines (complete migration)

**Status:**
- [ ] File has expected line count

---

### Verification 4: No Syntax Errors in Migration

**If Supabase CLI available, validate:**
```bash
# Optional - only if supabase CLI is set up
# supabase db lint
```

**Status:**
- [ ] No syntax errors (or N/A if CLI not available)

---

### Verification 5: Git Diff Sanity Check

**Command:**
```bash
git status --short
```

**Expected Changes:**
- New file: `supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql`

**Status:**
- [ ] Only expected file shows as new/modified
- [ ] No unexpected files changed

---

**FINAL VERIFICATION STATUS:** [ALL PASSED / FAILED]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-12
**Executor:** Claude Opus 4.5
**Decision Source:** InProgressRewardsVisibilityFix.md
**Implementation Doc:** InProgressRewardsVisibilityFixIMPL.md
**Bug ID:** BUG-INPROGRESS-VISIBILITY

---

### Execution Log

**Pre-Implementation:**
```
Gate 1: Environment - [PENDING]
Gate 2: Files - [PENDING]
Gate 3: Code State (missions) - [PENDING]
Gate 4: Code State (rewards) - [PENDING]
Gate 5: Schema - [PENDING]
```

**Implementation Steps:**
```
Step 1: Create migration file - [PENDING]
```

**Security Verification:**
```
Multi-tenant check (missions) - [PENDING]
Multi-tenant check (rewards) - [PENDING]
```

**Final Verification:**
```
SQL syntax validation - [PENDING]
Key changes present - [PENDING]
File line count - [PENDING]
Git diff sanity - [PENDING]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql` - CREATE - New migration with updated RPC functions

**Total:** 1 file created, ~290 lines added

---

### Bug Resolution

**Before Implementation:**
- Bug: In-progress rewards disappear when user is demoted
- Root cause: RPC WHERE clauses filter strictly by tier eligibility

**After Implementation:**
- Bug: RESOLVED
- Verification: WHERE clauses now include `OR red.id IS NOT NULL`

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: InProgressRewardsVisibilityFix.md
- Documented 19 sections
- Proposed solution: Modify WHERE clauses + add client_id to JOINs

**Step 2: Audit Phase**
- External LLM audit (Codex) completed
- Recommendation: APPROVE WITH CHANGES
- Feedback: Add client_id to redemptions JOINs
- Changes incorporated into Fix.md v1.1

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: InProgressRewardsVisibilityFixIMPL.md
- 1 implementation step (create migration)
- Security verified (multi-tenant isolation)

**Step 4: Current Status**
- Implementation: [PENDING EXECUTION]
- Ready for: Execution approval

---

### Auditor Verification Commands

**Quick Verification (Run These After Implementation):**

```bash
# 1. Verify migration file exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql

# 2. Verify client_id filter in both functions
grep "red.client_id = p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql

# 3. Verify WHERE clause changes
grep "OR red.id IS NOT NULL" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql

# 4. Verify status filter in both functions
grep "red.status NOT IN" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql

# 5. Count functions and grants
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
grep -c "GRANT EXECUTE" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
```

**Expected Results:**
- Migration file exists
- 2 occurrences of client_id filter
- 2 occurrences of WHERE clause change
- 2 occurrences of status filter
- 2 functions, 4 grants

---

## Document Status

**Implementation Date:** 2025-12-12
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates defined
- [ ] Current code state documented
- [ ] Schema verified

**Implementation:**
- [ ] Migration file content defined
- [ ] All changes documented

**Security:**
- [ ] Multi-tenant isolation verified in both functions

**Verification:**
- [ ] SQL syntax checks defined
- [ ] Key changes verification defined
- [ ] Git diff check defined

**Documentation:**
- [ ] Audit trail complete
- [ ] Auditor commands defined

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**Next Actions:**
1. [ ] User approves implementation plan
2. [ ] Execute Step 1 (create migration file)
3. [ ] Run all verification commands
4. [ ] Update InProgressRewardsVisibilityFix.md status to "Implemented"

**Git Commit Message Template:**
```
fix: In-progress rewards visible after tier demotion

Resolves BUG-INPROGRESS-VISIBILITY: Rewards/missions with active
redemptions now remain visible regardless of tier eligibility.

Changes:
- get_available_missions: Added client_id and status filter to JOIN,
  modified WHERE to include active redemptions
- get_available_rewards: Added client_id to JOIN, modified WHERE to
  include active redemptions

Security: Multi-tenant isolation enforced via client_id in JOINs

References:
- InProgressRewardsVisibilityFix.md
- InProgressRewardsVisibilityFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [x] Read actual RPC file (not from memory)
- [x] Used exact code from current file
- [x] Defined complete code blocks (no placeholders)
- [x] Read SchemaFinalv2.md for redemptions table

### Decision Fidelity
- [x] Followed locked decision from Fix.md
- [x] Implemented chosen solution exactly
- [x] Addressed Codex audit feedback (client_id)

### Security Verification
- [x] Multi-tenant isolation defined (client_id in JOINs)
- [x] Both functions have tenant filter

### Documentation Completeness
- [x] All sections present
- [x] All commands documented
- [x] Audit trail complete

---

**META-VERIFICATION STATUS:** ALL CHECKS PASSED

**RED FLAGS exhibited:** None
