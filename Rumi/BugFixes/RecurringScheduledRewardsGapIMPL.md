# Recurring Scheduled Rewards - Gap Implementation Plan

**Specification Source:** RecurringScheduledRewardsGap.md
**Gap ID:** GAP-RECURRING-002
**Type:** Feature Gap
**Priority:** Medium
**Implementation Date:** 2025-12-26
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RecurringScheduledRewardsGap.md:**

**Gap Summary:** Weekly/monthly recurring missions with scheduled rewards (commission_boost, discount) do not create new mission instances after claiming.

**Business Need:** Enable weekly/monthly recurring cycles for commission_boost and discount missions.

**Files to Create/Modify:**
- CREATE: `supabase/migrations/YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql`
- MODIFY: `lib/repositories/missionRepository.ts`

**Specified Solution:**
1. Modify `claim_commission_boost` RPC to add recurring logic (create new mission_progress with cooldown_until)
2. Create new `claim_discount` RPC with recurring logic
3. Update repository to call `claim_discount` RPC for discount rewards

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] Migration deployed and verified in Supabase
2. [ ] claim_commission_boost returns new_progress_id for recurring
3. [ ] claim_discount returns new_progress_id for recurring
4. [ ] Repository updated to call claim_discount RPC
5. [ ] Transaction safety verified (no orphan instances)
6. [ ] Type checker passes
7. [ ] Build completes
8. [ ] Manual verification completed

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - Added multi-tenant guards in RPC joins (m.client_id, rw.client_id)
  - Added explicit dependency on idx_mission_progress_active_cooldown index
- Concerns Addressed:
  - Confirmed ClaimResult already has newProgressId/cooldownDays
  - Noted signature unchanged for backwards compatibility

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1
- Files modified: 1
- Lines added: ~150
- Breaking changes: NO
- Schema changes: NO (uses existing cooldown_until column)
- API contract changes: NO (ClaimResult already has fields)

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

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

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing recurring logic in scheduled reward RPCs:**
```bash
grep -r "cooldown_until" supabase/migrations/ | grep -i "commission_boost\|discount"
```

**Expected:** No matches showing recurring logic in commission_boost or discount
**Actual:** [document actual output]

**Search for claim_discount RPC:**
```bash
grep -r "claim_discount" supabase/migrations/
```

**Expected:** No matches (RPC doesn't exist yet)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for recurring logic in scheduled RPCs: [result]
- [ ] Grep executed for claim_discount: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Dependency Verification (CRITICAL)

**Purpose:** Verify the partial unique index from GAP-RECURRING-001 exists.

**Verification Query (run in Supabase SQL Editor):**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'mission_progress'
  AND indexname = 'idx_mission_progress_active_cooldown';
```

**Expected:** One row showing the partial unique index
**Actual:** [document actual output]

**Checklist:**
- [ ] Query executed: [result]
- [ ] Index exists: [YES / NO]

**If index does NOT exist:** STOP. GAP-RECURRING-001 migration must be applied first.

---

### Gate 4: Current RPC Signature Verification

**Purpose:** Verify claim_commission_boost exists with expected signature.

**Query (run in Supabase SQL Editor):**
```sql
SELECT proname, proargnames, prosrc
FROM pg_proc
WHERE proname = 'claim_commission_boost';
```

**Expected:** Function exists with parameters (p_redemption_id, p_client_id, p_scheduled_date, p_duration_days, p_boost_rate)
**Actual:** [document actual output]

**Checklist:**
- [ ] claim_commission_boost exists: [YES / NO]
- [ ] Signature matches expected: [YES / NO]

---

### Gate 5: Files to Modify Verification

**File 1 (CREATE):** Migration file
```bash
ls -la supabase/migrations/ | tail -5
```
**Expected:** New migration file does NOT exist yet
**Naming Pattern:** `YYYYMMDDHHMMSS_recurring_scheduled_rewards.sql`

**File 2 (MODIFY):** `lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**Checklist:**
- [ ] Migration directory accessible
- [ ] missionRepository.ts exists
- [ ] Ready to proceed

---

### Gate 6: Schema Verification

**Purpose:** Verify cooldown_until column exists in mission_progress.

**Query (run in Supabase SQL Editor):**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mission_progress'
  AND column_name = 'cooldown_until';
```

**Expected:** One row showing cooldown_until TIMESTAMP
**Actual:** [document actual output]

**Checklist:**
- [ ] cooldown_until column exists: [YES / NO]
- [ ] Data type is TIMESTAMP: [YES / NO]

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step 1: Create Migration File

**Target File:** `supabase/migrations/20251226210000_recurring_scheduled_rewards.sql`
**Action Type:** CREATE
**Purpose:** Add recurring logic to claim_commission_boost and create claim_discount RPC

---

**New File Content:**

```sql
-- Migration: Recurring logic for scheduled rewards (GAP-RECURRING-002)
-- Depends on: 20251226100000_recurring_missions.sql (GAP-RECURRING-001)
--
-- This migration modifies claim_commission_boost and creates claim_discount
-- to add recurring mission support for scheduled reward types.
--
-- CRITICAL DEPENDENCY: idx_mission_progress_active_cooldown must exist
-- (created by GAP-RECURRING-001 migration)

-- ============================================================================
-- PART 1: Modify claim_commission_boost with recurring logic
-- ============================================================================

DROP FUNCTION IF EXISTS claim_commission_boost(UUID, UUID, DATE, INTEGER, NUMERIC);

CREATE OR REPLACE FUNCTION claim_commission_boost(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,
  p_duration_days INTEGER,
  p_boost_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
  v_mission_id UUID;
  v_redemption_frequency TEXT;
  v_cooldown_days INTEGER;
  v_new_progress_id UUID;
BEGIN
  -- SECURITY: Derive user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user_id, mission_id, and redemption_frequency in single query
  -- MULTI-TENANT GUARDS: Filter on missions.client_id and rewards.client_id
  SELECT
    r.user_id,
    m.id,
    rw.redemption_frequency
  INTO
    v_user_id,
    v_mission_id,
    v_redemption_frequency
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
    AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
  WHERE r.id = p_redemption_id
    AND r.client_id = p_client_id
    AND r.user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  -- Existing claim logic: Update redemption
  UPDATE redemptions
  SET status = 'claimed',
      claimed_at = v_now,
      scheduled_activation_date = p_scheduled_date,
      scheduled_activation_time = '19:00:00',
      updated_at = v_now
  WHERE id = p_redemption_id;

  -- Existing boost logic: Insert commission_boost_redemptions
  INSERT INTO commission_boost_redemptions (
    redemption_id, boost_status, scheduled_activation_date,
    duration_days, boost_rate, created_at, updated_at
  ) VALUES (
    p_redemption_id, 'scheduled', p_scheduled_date,
    p_duration_days, p_boost_rate, v_now, v_now
  );

  -- NEW: If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- Create new instance with cooldown_until
    -- Uses ON CONFLICT to handle race conditions (relies on idx_mission_progress_active_cooldown)
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
      u.tier_achieved_at,
      u.next_checkpoint_at,
      v_now,
      v_now
    FROM missions m, users u
    WHERE m.id = v_mission_id AND u.id = v_user_id
    ON CONFLICT (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_progress_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed',
    'new_progress_id', v_new_progress_id,
    'cooldown_days', v_cooldown_days
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_commission_boost FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_commission_boost TO authenticated;

-- ============================================================================
-- PART 2: Create claim_discount RPC with recurring logic
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_discount(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
  v_mission_id UUID;
  v_redemption_frequency TEXT;
  v_cooldown_days INTEGER;
  v_new_progress_id UUID;
BEGIN
  -- SECURITY: Derive user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user_id, mission_id, and redemption_frequency
  -- MULTI-TENANT GUARDS: Filter on missions.client_id and rewards.client_id
  SELECT
    r.user_id,
    m.id,
    rw.redemption_frequency
  INTO
    v_user_id,
    v_mission_id,
    v_redemption_frequency
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
    AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
  WHERE r.id = p_redemption_id
    AND r.client_id = p_client_id
    AND r.user_id = v_auth_uid;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  -- Claim the redemption
  UPDATE redemptions
  SET status = 'claimed',
      claimed_at = v_now,
      scheduled_activation_date = p_scheduled_date,
      scheduled_activation_time = p_scheduled_time,
      updated_at = v_now
  WHERE id = p_redemption_id;

  -- NEW: If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- Create new instance with cooldown_until
    -- Uses ON CONFLICT to handle race conditions (relies on idx_mission_progress_active_cooldown)
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
      u.tier_achieved_at,
      u.next_checkpoint_at,
      v_now,
      v_now
    FROM missions m, users u
    WHERE m.id = v_mission_id AND u.id = v_user_id
    ON CONFLICT (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_new_progress_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed',
    'new_progress_id', v_new_progress_id,
    'cooldown_days', v_cooldown_days
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_discount FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_discount TO authenticated;
```

**Create Command:**
Write file to: `/home/jorge/Loyalty/Rumi/supabase/migrations/20251226210000_recurring_scheduled_rewards.sql`

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251226210000_recurring_scheduled_rewards.sql
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251226210000_recurring_scheduled_rewards.sql
```
**Expected:** File exists, ~200 lines

**Step Checkpoint:**
- [ ] Migration file created ✅
- [ ] File contains both RPCs ✅
- [ ] Multi-tenant guards present ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Update missionRepository.ts - Add discount RPC call

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Action Type:** MODIFY
**Purpose:** Replace standalone UPDATE for discount with claim_discount RPC call

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
Read missionRepository.ts lines 1346-1378
```

**Expected Current State:** The discount claim uses standalone UPDATE (not RPC):
```typescript
    // ============================================
    // OTHER REWARD TYPES: Use existing standalone UPDATE
    // (raffle, points, discount, etc. - no sub-state table)
    // ============================================

    const updateData: Record<string, unknown> = {
      status: 'claimed',
      claimed_at: now,
      updated_at: now,
    };

    if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
      updateData.scheduled_activation_date = claimData.scheduledActivationDate;
      updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
    }

    const { error: updateError } = await supabase
      .from('redemptions')
      .update(updateData)
      .eq('id', redemptionId);
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

**Edit Action:**

**Location:** After commission_boost RPC block (around line 1344), BEFORE the standalone UPDATE section

**OLD Code (to be replaced):**
```typescript
      return { success: true, redemptionId, newStatus: 'claimed' };
    }

    // ============================================
    // OTHER REWARD TYPES: Use existing standalone UPDATE
    // (raffle, points, discount, etc. - no sub-state table)
    // ============================================
```

**NEW Code (replacement):**
```typescript
      return {
        success: true,
        redemptionId,
        newStatus: 'claimed',
        newProgressId: isClaimRPCResult(result) ? result.new_progress_id ?? null : null,
        cooldownDays: isClaimRPCResult(result) ? result.cooldown_days ?? null : null,
      };
    }

    // Discount: Use atomic RPC with recurring support (GAP-RECURRING-002)
    if (reward.type === 'discount') {
      const scheduledDate = claimData.scheduledActivationDate;
      const scheduledTime = claimData.scheduledActivationTime ?? '12:00:00';

      if (!scheduledDate) {
        return {
          success: false,
          redemptionId,
          newStatus: 'claimable',
          error: 'Scheduled activation date is required',
        };
      }

      const { data: result, error: rpcError } = await supabase.rpc('claim_discount', {
        p_redemption_id: redemptionId,
        p_client_id: clientId,
        p_scheduled_date: scheduledDate,
        p_scheduled_time: scheduledTime,
      });

      if (rpcError || !isClaimRPCResult(result) || !result.success) {
        const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
        console.error('[MissionRepository] Discount claim failed:', rpcError || errorMsg);
        return {
          success: false,
          redemptionId,
          newStatus: 'claimable',
          error: errorMsg ?? 'Failed to schedule discount',
        };
      }

      return {
        success: true,
        redemptionId,
        newStatus: 'claimed',
        newProgressId: result.new_progress_id ?? null,
        cooldownDays: result.cooldown_days ?? null,
      };
    }

    // ============================================
    // OTHER REWARD TYPES: Use existing standalone UPDATE
    // (raffle, points, physical_gift without shipping, etc.)
    // ============================================
```

---

**Post-Action Verification:**

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Edit applied correctly ✅
- [ ] Discount now uses claim_discount RPC ✅
- [ ] Returns newProgressId and cooldownDays ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Also update commission_boost return to include recurring fields

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Action Type:** MODIFY
**Purpose:** Ensure commission_boost claim also returns newProgressId/cooldownDays

---

**Pre-Action Reality Check:**

**Read Current State:** (around line 1340-1344)
```typescript
      return { success: true, redemptionId, newStatus: 'claimed' };
```

**Edit Action:**

This was already addressed in Step 2 by the edit. The commission_boost return statement was updated to:
```typescript
      return {
        success: true,
        redemptionId,
        newStatus: 'claimed',
        newProgressId: isClaimRPCResult(result) ? result.new_progress_id ?? null : null,
        cooldownDays: isClaimRPCResult(result) ? result.cooldown_days ?? null : null,
      };
```

**Verification:**
- [ ] Commission boost return includes newProgressId ✅
- [ ] Commission boost return includes cooldownDays ✅

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Type Alignment Verification

**ClaimResult interface already exists with required fields:**
```typescript
export interface ClaimResult {
  success: boolean;
  redemptionId: string;
  newStatus: string;
  error?: string;
  newProgressId?: string | null;   // Already exists from GAP-RECURRING-001
  cooldownDays?: number | null;    // Already exists from GAP-RECURRING-001
}
```

**Verification:**
- [ ] ClaimResult has newProgressId field
- [ ] ClaimResult has cooldownDays field
- [ ] No type changes needed

---

### RPC Call Site Verification

**claim_discount RPC call:**
```typescript
await supabase.rpc('claim_discount', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_scheduled_date: scheduledDate,
  p_scheduled_time: scheduledTime,
});
```

**Verification:**
- [ ] Parameter names match RPC definition
- [ ] Return type handled correctly (isClaimRPCResult guard)
- [ ] Error handling in place

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `claim_commission_boost` RPC
```sql
JOIN missions m ON mp.mission_id = m.id
  AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
JOIN rewards rw ON r.reward_id = rw.id
  AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
WHERE r.id = p_redemption_id
  AND r.client_id = p_client_id
```

**Security Checklist:**
- [ ] redemptions.client_id filtered
- [ ] missions.client_id filtered
- [ ] rewards.client_id filtered
- [ ] No cross-tenant data exposure

**Query 2:** `claim_discount` RPC
```sql
JOIN missions m ON mp.mission_id = m.id
  AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
JOIN rewards rw ON r.reward_id = rw.id
  AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
WHERE r.id = p_redemption_id
  AND r.client_id = p_client_id
```

**Security Checklist:**
- [ ] redemptions.client_id filtered
- [ ] missions.client_id filtered
- [ ] rewards.client_id filtered
- [ ] No cross-tenant data exposure

---

### Grep Verification (Explicit Check)

After migration applied:
```bash
grep -n "client_id" supabase/migrations/20251226210000_recurring_scheduled_rewards.sql
```
**Expected:** client_id on multiple lines in both RPCs
**Actual:** [document actual output]

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 2: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 3: Migration Applied Successfully

**Run migration in Supabase SQL Editor and verify:**

**Query 1:** Verify claim_commission_boost updated
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'claim_commission_boost';
```
**Expected:** Function contains 'cooldown_until' and 'new_progress_id'

**Query 2:** Verify claim_discount created
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'claim_discount';
```
**Expected:** Function exists with recurring logic

**Status:**
- [ ] claim_commission_boost updated ✅
- [ ] claim_discount created ✅

---

### Verification 4: Acceptance Criteria Validation

#### Criterion 1: Migration deployed and verified
**Test:** Run verification queries above
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: claim_commission_boost returns new_progress_id for recurring
**Test:** Check RPC return includes new_progress_id in JSONB
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: claim_discount returns new_progress_id for recurring
**Test:** Check RPC return includes new_progress_id in JSONB
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Repository updated to call claim_discount RPC
**Test:** Grep for claim_discount in missionRepository.ts
```bash
grep -n "claim_discount" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Transaction safety verified
**Test:** Both RPCs use single transaction (plpgsql function)
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Type checker passes
**Test:** npx tsc --noEmit shows no errors
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Build completes
**Test:** npm run build succeeds
**Status:** [ ] PASS ✅ / FAIL ❌

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-26
**Executor:** Claude Opus 4.5
**Specification Source:** RecurringScheduledRewardsGap.md
**Implementation Doc:** RecurringScheduledRewardsGapIMPL.md
**Gap ID:** GAP-RECURRING-002

---

### Execution Log

**Pre-Implementation:**
```
Gate 1: Environment - [PENDING]
Gate 2: Gap Confirmation - [PENDING]
Gate 3: Dependency (Index) - [PENDING]
Gate 4: RPC Signature - [PENDING]
Gate 5: Files - [PENDING]
Gate 6: Schema - [PENDING]
```

**Implementation Steps:**
```
Step 1: Create migration file - [PENDING]
Step 2: Update missionRepository.ts - [PENDING]
Step 3: Verify commission_boost return - [PENDING]
```

**Verification:**
```
Type check - [PENDING]
Build - [PENDING]
Migration applied - [PENDING]
Acceptance criteria - [PENDING]
```

---

### Files Created/Modified

**Complete List:**
1. `supabase/migrations/20251226210000_recurring_scheduled_rewards.sql` - CREATE - ~200 lines - RPCs with recurring logic
2. `lib/repositories/missionRepository.ts` - MODIFY - ~40 lines added - claim_discount RPC call

**Total:** 2 files, ~240 lines added (net)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251226210000_recurring_scheduled_rewards.sql

# 2. Verify claim_discount in repository
grep -n "claim_discount" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts

# 3. Verify multi-tenant guards in migration
grep -n "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251226210000_recurring_scheduled_rewards.sql

# 4. Verify no type errors
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```

---

## Document Status

**Implementation Date:** 2025-12-26
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Dependency index verified
- [ ] Schema verified

**Implementation:**
- [ ] Migration file created ✅
- [ ] Repository updated ✅
- [ ] All checkpoints passed ✅

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filters confirmed ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅

---

### Final Status

**Implementation Result:** [PENDING]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Apply migration to Supabase
2. [ ] Verify RPCs in Supabase
3. [ ] Update RecurringScheduledRewardsGap.md status to "Implemented"
4. [ ] Test with live data

**Manual Testing Steps:**
1. Reset "Road to Viral" mission (commission_boost, weekly)
2. Complete and claim
3. Verify TWO mission_progress rows exist
4. Verify new row has cooldown_until = NOW + 7 days

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Verified against reality (not assumed)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Addressed audit feedback (multi-tenant guards, index dependency)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] All three tables guarded (redemptions, missions, rewards)

---

**META-VERIFICATION STATUS:** [PENDING]

---

**Document Version:** 1.0
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Ready for Execution
