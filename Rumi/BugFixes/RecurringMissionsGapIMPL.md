# Recurring Missions - Gap Implementation Plan

**Specification Source:** RecurringMissionsGap.md
**Gap ID:** GAP-RECURRING-001
**Type:** Feature Gap
**Priority:** Medium
**Implementation Date:** 2025-12-26
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RecurringMissionsGap.md:**

**Gap Summary:** Weekly/monthly/unlimited missions behave identically to one-time missions. No rate-limiting, cooldown state, or recurring UI exists.

**Business Need:** Enable true weekly/monthly/unlimited mission cycles with rate limiting to drive sustained creator engagement.

**Files to Create/Modify:**
- `supabase/migrations/YYYYMMDD_recurring_missions.sql` (CREATE)
- `lib/types/rpc.ts` (MODIFY)
- `lib/types/api.ts` (MODIFY)
- `lib/repositories/missionRepository.ts` (MODIFY)
- `lib/services/missionService.ts` (MODIFY)
- `app/missions/missions-client.tsx` (MODIFY)
- `API_CONTRACTS.md` (MODIFY)

**Specified Solution (From Gap.md Section 6):**

1. Add `cooldown_until` column to mission_progress table
2. Modify `get_available_missions` RPC to include `reward_redemption_frequency` and `progress_cooldown_until`
3. Modify `claim_instant_reward` RPC to create next instance with cooldown for recurring missions
4. Add `recurring_cooldown` status (17th status)
5. Add `recurringData` to MissionItem API response
6. Add cooldown check to `computeStatus()` using `progress.cooldownUntil`
7. Add recurring badge, cooldown UI, and flippable content to missions-client.tsx

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] Migration deployed and verified in Supabase
2. [ ] All new code created per "Proposed Solution" section
3. [ ] Transaction safety verified (no orphan instances)
4. [ ] Duplicate prevention verified (concurrent claims handled)
5. [ ] Type checker passes
6. [ ] All tests pass
7. [ ] Build completes
8. [ ] Manual verification completed
9. [ ] API_CONTRACTS.md updated

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Modified existing `claim_instant_reward` RPC instead of creating new one
- Concerns Addressed: Backfill behavior documented, deploy order specified, ClaimResult type updated
- v5.2 Clarifications: Visibility guarantee documented, unlimited behavior explicitly noted, deploy sequencing enhanced

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1
- Files modified: 6
- Lines added: ~400 (approximate)
- Breaking changes: NO
- Schema changes: YES (new column, RPC modifications)
- API contract changes: YES (new status, new optional field)

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Key Clarifications (From Audit v5.2)

### 1. Visibility Guarantee (Why No Gap Exists)

The `get_available_missions` RPC filters out concluded redemptions, but this does NOT create a visibility gap because:

- **Atomic creation:** New instance is created in the SAME TRANSACTION as the claim
- **Timing:** 'concluded' happens LATER (user confirms receipt or auto-conclude)
- **Result:** By the time old redemption is concluded, new instance already exists

```
[Claim] → claim_instant_reward runs atomically:
  ├── UPDATE redemption SET status = 'claimed'
  └── INSERT new mission_progress (cooldown_until = NOW + 7 days)
       ↓
[Later] → old redemption marked 'concluded'
       ↓
[get_available_missions returns BOTH]:
  - Old instance: mp exists, red.* = NULL (concluded filtered)
  - New instance: mp exists with cooldown_until, red.* = NULL (no redemption yet)
```

### 2. Unlimited Missions Behavior

For `redemption_frequency = 'unlimited'`:
- `cooldown_until = NULL` (no cooldown)
- Partial unique index `WHERE cooldown_until IS NOT NULL` does NOT deduplicate
- **Intentional:** Multiple 0% instances may accumulate—matches "no limit" semantics
- User progresses on whichever instance they're tracking

### 3. Deploy Sequencing (Critical)

| Step | What | Failure Mode if Wrong |
|------|------|----------------------|
| 1 | Supabase migration | Types expect columns RPC doesn't return → runtime error |
| 2 | TypeScript types | Code references undefined types → compile error |
| 3 | Repository + Service | N/A (depends on 1 & 2) |
| 4 | UI components | `recurringData` undefined → compile error |

**Safe rollout:**
1. Deploy migration to Supabase (verify RPC returns new columns)
2. Deploy full app (types + service + UI in same bundle)

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
**Expected:** Clean working tree OR acceptable state

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -r "recurring_cooldown" /home/jorge/Loyalty/Rumi/appcode/lib/
grep -r "cooldown_until" /home/jorge/Loyalty/Rumi/appcode/lib/
grep -r "recurringData" /home/jorge/Loyalty/Rumi/appcode/lib/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `recurring_cooldown`: [result]
- [ ] Grep executed for `cooldown_until`: [result]
- [ ] Grep executed for `recurringData`: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for related implementations:**
```bash
grep -rn "redemption_frequency" /home/jorge/Loyalty/Rumi/appcode/lib/ | head -20
grep -rn "claim_instant_reward" /home/jorge/Loyalty/Rumi/appcode/lib/
grep -rn "computeStatus" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -5
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| missionRepository.ts | claimInstantReward | Existing fast path | Extend RPC |
| missionService.ts | computeStatus() | Status computation | Add cooldown check |
| rpc.ts | GetAvailableMissionsRow | Type definition | Add new fields |
| api.ts | MissionStatus | Status type | Add new status |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: LOW
- [ ] Integration points identified: 4 files

---

### Gate 4: Files to Modify Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**File 4:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** File exists

**File 5:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** File exists

**File 6:** `/home/jorge/Loyalty/Rumi/supabase/migrations/` (for new migration)
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | tail -5
```
**Expected:** Directory exists, migration will be created

**Checklist:**
- [ ] All files to modify exist: 5 files
- [ ] Migration directory exists for new file
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**

**Tables involved:** `mission_progress`, `rewards`, `redemptions`

**Column verification:**
| Column in Spec | Table | Exists? | Type Match? |
|----------------|-------|---------|-------------|
| cooldown_until | mission_progress | ❌ (to add) | TIMESTAMP |
| redemption_frequency | rewards | ✅ | VARCHAR |
| claimed_at | redemptions | ✅ | TIMESTAMP |

**Checklist:**
- [ ] cooldown_until to be added (new column)
- [ ] redemption_frequency exists in rewards
- [ ] claimed_at exists in redemptions
- [ ] Schema migration planned

---

### Gate 6: API Contract Verification

**Read API_CONTRACTS.md for relevant endpoint:**

**Endpoint:** GET /api/missions

**Contract alignment:**
| Field in Spec | Current Contract | Action |
|---------------|------------------|--------|
| recurring_cooldown status | Not present | Add to MissionStatus |
| recurringData | Not present | Add to MissionItem |

**Checklist:**
- [ ] MissionStatus to be updated (add recurring_cooldown)
- [ ] MissionItem to be updated (add recurringData)
- [ ] Changes are additive (no breaking changes)

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

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251226_recurring_missions.sql`
**Action Type:** CREATE
**Purpose:** Add cooldown_until column, modify get_available_missions RPC, modify claim_instant_reward RPC

---

**New File Content:**
```sql
-- Migration: Recurring Missions Support
-- GAP-RECURRING-001: Add rate-limiting for weekly/monthly/unlimited missions
-- Created: 2025-12-26

-- ============================================
-- PART 1: Add cooldown_until column
-- ============================================

ALTER TABLE mission_progress
ADD COLUMN cooldown_until TIMESTAMP;

COMMENT ON COLUMN mission_progress.cooldown_until IS
  'For recurring missions: timestamp when this instance becomes active. NULL means no cooldown (immediately active). Set at creation time based on parent claim.';

-- Index for efficient cooldown queries
CREATE INDEX idx_mission_progress_cooldown_until
ON mission_progress(cooldown_until)
WHERE cooldown_until IS NOT NULL;

-- Partial unique index: Prevent duplicate "next instances" for recurring missions
-- Only one active cooldown instance allowed per mission/user/client
-- This closes the race condition where concurrent claims could create duplicates
-- NOTE: Only applies to weekly/monthly (cooldown_until IS NOT NULL)
-- Unlimited missions have cooldown_until = NULL, so duplicates are allowed (intentional)
CREATE UNIQUE INDEX idx_mission_progress_active_cooldown
ON mission_progress(mission_id, user_id, client_id)
WHERE cooldown_until IS NOT NULL;

-- ============================================
-- PART 2: Modify get_available_missions RPC
-- ============================================

-- Must DROP first due to return type change
DROP FUNCTION IF EXISTS get_available_missions(UUID, UUID, VARCHAR);

CREATE OR REPLACE FUNCTION get_available_missions(
  p_user_id UUID,
  p_client_id UUID,
  p_current_tier VARCHAR
)
RETURNS TABLE (
  mission_id UUID,
  mission_type VARCHAR,
  mission_display_name VARCHAR,
  mission_title VARCHAR,
  mission_description TEXT,
  mission_target_value INTEGER,
  mission_target_unit VARCHAR,
  mission_raffle_end_date TIMESTAMP,
  mission_activated BOOLEAN,
  mission_tier_eligibility VARCHAR,
  mission_preview_from_tier VARCHAR,
  mission_enabled BOOLEAN,
  mission_display_order INTEGER,
  mission_reward_id UUID,
  reward_id UUID,
  reward_type VARCHAR,
  reward_name VARCHAR,
  reward_description VARCHAR,
  reward_value_data JSONB,
  reward_redemption_type VARCHAR,
  reward_source VARCHAR,
  reward_redemption_frequency VARCHAR,
  tier_id VARCHAR,
  tier_name VARCHAR,
  tier_color VARCHAR,
  tier_order INTEGER,
  progress_id UUID,
  progress_current_value INTEGER,
  progress_status VARCHAR,
  progress_completed_at TIMESTAMP,
  progress_checkpoint_start TIMESTAMP,
  progress_checkpoint_end TIMESTAMP,
  progress_cooldown_until TIMESTAMP,
  redemption_id UUID,
  redemption_status VARCHAR,
  redemption_claimed_at TIMESTAMP,
  redemption_fulfilled_at TIMESTAMP,
  redemption_concluded_at TIMESTAMP,
  redemption_rejected_at TIMESTAMP,
  redemption_scheduled_activation_date DATE,
  redemption_scheduled_activation_time TIME,
  redemption_activation_date TIMESTAMP,
  redemption_expiration_date TIMESTAMP,
  boost_status VARCHAR,
  boost_scheduled_activation_date DATE,
  boost_activated_at TIMESTAMP,
  boost_expires_at TIMESTAMP,
  boost_duration_days INTEGER,
  physical_gift_shipped_at TIMESTAMP,
  physical_gift_shipping_city VARCHAR,
  physical_gift_requires_size BOOLEAN,
  raffle_is_winner BOOLEAN,
  raffle_participated_at TIMESTAMP,
  raffle_winner_selected_at TIMESTAMP
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    m.id, m.mission_type, m.display_name, m.title, m.description,
    m.target_value, m.target_unit, m.raffle_end_date, m.activated,
    m.tier_eligibility, m.preview_from_tier, m.enabled, m.display_order, m.reward_id,
    r.id, r.type, r.name, r.description, r.value_data, r.redemption_type, r.reward_source,
    r.redemption_frequency,
    t.tier_id, t.tier_name, t.tier_color, t.tier_order,
    mp.id, mp.current_value, mp.status, mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
    mp.cooldown_until,
    red.id, red.status, red.claimed_at, red.fulfilled_at, red.concluded_at, red.rejected_at,
    red.scheduled_activation_date, red.scheduled_activation_time, red.activation_date, red.expiration_date,
    cb.boost_status, cb.scheduled_activation_date, cb.activated_at, cb.expires_at, cb.duration_days,
    pg.shipped_at, pg.shipping_city, pg.requires_size,
    rp.is_winner, rp.participated_at, rp.winner_selected_at
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = p_user_id AND mp.client_id = p_client_id
  LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
    AND red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.status NOT IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
  WHERE m.client_id = p_client_id
    AND (
      (m.enabled = true AND (
        m.tier_eligibility = p_current_tier
        OR m.tier_eligibility = 'all'
        OR m.preview_from_tier = p_current_tier
      ))
      OR red.id IS NOT NULL
    )
  ORDER BY m.display_order ASC;
$$;

GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO service_role;

-- ============================================
-- PART 3: Modify claim_instant_reward RPC
-- ============================================

DROP FUNCTION IF EXISTS claim_instant_reward(UUID, UUID);

CREATE OR REPLACE FUNCTION claim_instant_reward(
  p_mission_progress_id UUID,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_user_tier TEXT;
  v_auth_uid UUID := auth.uid();
  v_redemption_id UUID;
  v_redemption_status TEXT;
  v_reward_type TEXT;
  v_mission_status TEXT;
  v_tier_eligibility TEXT;
  v_mission_id UUID;
  v_redemption_frequency TEXT;
  v_cooldown_days INTEGER;
  v_new_progress_id UUID;
BEGIN
  -- SECURITY: Derive user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, current_tier INTO v_user_id, v_user_tier
  FROM users
  WHERE id = v_auth_uid AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Single query: Get redemption + validate + get frequency
  SELECT
    r.id,
    r.status,
    rw.type,
    mp.status,
    m.tier_eligibility,
    m.id,
    rw.redemption_frequency
  INTO
    v_redemption_id,
    v_redemption_status,
    v_reward_type,
    v_mission_status,
    v_tier_eligibility,
    v_mission_id,
    v_redemption_frequency
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
    AND m.client_id = p_client_id
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id
  WHERE r.mission_progress_id = p_mission_progress_id
    AND r.user_id = v_user_id
    AND r.client_id = p_client_id
    AND r.deleted_at IS NULL
  FOR UPDATE OF r;

  -- Validation checks
  IF v_redemption_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Redemption not found');
  END IF;

  IF v_redemption_status != 'claimable' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed or not claimable',
      'redemption_id', v_redemption_id);
  END IF;

  IF v_mission_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed');
  END IF;

  IF v_tier_eligibility != 'all' AND v_tier_eligibility != v_user_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not eligible for this tier');
  END IF;

  -- Instant rewards only
  IF v_reward_type NOT IN ('gift_card', 'spark_ads', 'experience') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward requires additional information');
  END IF;

  -- Perform the claim
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = v_redemption_id;

  -- NEW: If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- Create new instance with cooldown_until
    -- Uses ON CONFLICT to handle race conditions: if concurrent claims try to insert,
    -- only one succeeds due to idx_mission_progress_active_cooldown unique index
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

  -- Return success with new fields (backwards compatible)
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'new_status', 'claimed',
    'new_progress_id', v_new_progress_id,
    'cooldown_days', v_cooldown_days
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_instant_reward FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_instant_reward TO authenticated;
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251226_recurring_missions.sql
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251226_recurring_missions.sql
```
**Expected:** File exists, ~250 lines

**Step Checkpoint:**
- [ ] Migration file created ✅
- [ ] Contains all 3 parts (column, get_available_missions, claim_instant_reward) ✅
- [ ] Multi-tenant guards present ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Update RPC Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts`
**Action Type:** MODIFY
**Purpose:** Add reward_redemption_frequency and progress_cooldown_until to GetAvailableMissionsRow

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts lines 42-48
```

**Expected Current State (near progress_checkpoint_end):**
```typescript
  progress_checkpoint_start: string | null;
  progress_checkpoint_end: string | null;
  // Redemption columns
  redemption_id: string | null;
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

**Edit Action 1: Add reward_redemption_frequency after reward_source**

**OLD Code:**
```typescript
  reward_source: string | null;
  // Tier columns
```

**NEW Code:**
```typescript
  reward_source: string | null;
  reward_redemption_frequency: string | null;  // NEW: for recurring missions
  // Tier columns
```

---

**Edit Action 2: Add progress_cooldown_until after progress_checkpoint_end**

**OLD Code:**
```typescript
  progress_checkpoint_end: string | null;
  // Redemption columns
```

**NEW Code:**
```typescript
  progress_checkpoint_end: string | null;
  progress_cooldown_until: string | null;  // NEW: for recurring missions
  // Redemption columns
```

---

**Post-Action Verification:**
```bash
grep -n "reward_redemption_frequency\|progress_cooldown_until" /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts
```
**Expected:** Both fields present in GetAvailableMissionsRow

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] reward_redemption_frequency added ✅
- [ ] progress_cooldown_until added ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Update API Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts`
**Action Type:** MODIFY
**Purpose:** Add recurring_cooldown status and recurringData interface

---

**Pre-Action Reality Check:**

**Read MissionStatus type:**
```bash
grep -n "MissionStatus" /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts | head -5
```

**Find current MissionStatus definition and add `recurring_cooldown` after `locked`.**

---

**Edit Action 1: Add recurring_cooldown to MissionStatus**

After `locked` status, add:
```typescript
  | 'recurring_cooldown'  // NEW: recurring mission in cooldown period
```

---

**Edit Action 2: Add RecurringData interface**

Add new interface (location TBD based on file structure):
```typescript
/**
 * Recurring mission data - returned for weekly/monthly/unlimited missions
 * GAP-RECURRING-001
 */
export interface RecurringData {
  frequency: 'weekly' | 'monthly' | 'unlimited';
  cooldownUntil: string | null;
  cooldownDaysRemaining: number | null;
  isInCooldown: boolean;
}
```

---

**Edit Action 3: Add recurringData to MissionItem interface**

Find MissionItem interface and add:
```typescript
  recurringData: RecurringData | null;  // NEW: for recurring missions
```

---

**Post-Action Verification:**
```bash
grep -n "recurring_cooldown\|RecurringData\|recurringData" /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
```
**Expected:** All three patterns found

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] recurring_cooldown status added ✅
- [ ] RecurringData interface added ✅
- [ ] recurringData field added to MissionItem ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update Repository Mapping

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Action Type:** MODIFY
**Purpose:** Map new RPC fields to AvailableMissionData, update ClaimResult type

---

**Edit Action 1: Add redemptionFrequency to reward mapping**

Find reward mapping in listAvailable() and add:
```typescript
  redemptionFrequency: row.reward_redemption_frequency ?? 'one-time',
```

---

**Edit Action 2: Add cooldownUntil to progress mapping**

Find progress mapping in listAvailable() and add:
```typescript
  cooldownUntil: row.progress_cooldown_until,
```

---

**Edit Action 3: Update ClaimResult interface**

Find ClaimResult interface and add optional fields:
```typescript
  newProgressId?: string | null;   // NEW: for recurring missions
  cooldownDays?: number | null;    // NEW: for recurring missions
```

---

**Edit Action 4: Update claimInstantReward return mapping**

Find claimInstantReward() return and add:
```typescript
  newProgressId: result.new_progress_id ?? null,
  cooldownDays: result.cooldown_days ?? null,
```

---

**Post-Action Verification:**
```bash
grep -n "redemptionFrequency\|cooldownUntil\|newProgressId\|cooldownDays" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** All patterns found

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] redemptionFrequency mapped ✅
- [ ] cooldownUntil mapped ✅
- [ ] ClaimResult updated ✅
- [ ] claimInstantReward return updated ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Update Service Layer

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
**Action Type:** MODIFY
**Purpose:** Add cooldown check to computeStatus(), add recurringData generation

---

**Edit Action 1: Add cooldown check to computeStatus()**

Find computeStatus() function and add BEFORE the final `return 'in_progress'`:
```typescript
  // Check for recurring mission cooldown (GAP-RECURRING-001)
  if (data.progress?.cooldownUntil) {
    const cooldownUntil = new Date(data.progress.cooldownUntil);
    if (new Date() < cooldownUntil) {
      return 'recurring_cooldown';
    }
  }
```

---

**Edit Action 2: Add generateRecurringData function**

Add new function:
```typescript
/**
 * Generate recurringData for mission response (GAP-RECURRING-001)
 */
function generateRecurringData(
  data: AvailableMissionData,
  status: MissionStatus
): RecurringData | null {
  const frequency = data.reward.redemptionFrequency;

  if (!frequency || frequency === 'one-time') {
    return null;
  }

  let cooldownUntil: string | null = null;
  let cooldownDaysRemaining: number | null = null;
  let isInCooldown = false;

  if (data.progress?.cooldownUntil) {
    const cooldownDate = new Date(data.progress.cooldownUntil);
    cooldownUntil = cooldownDate.toISOString();

    if (new Date() < cooldownDate) {
      isInCooldown = true;
      cooldownDaysRemaining = Math.ceil((cooldownDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    }
  }

  return {
    frequency: frequency as 'weekly' | 'monthly' | 'unlimited',
    cooldownUntil,
    cooldownDaysRemaining,
    isInCooldown,
  };
}
```

---

**Edit Action 3: Call generateRecurringData in transformMission()**

Find transformMission() or equivalent and add:
```typescript
  recurringData: generateRecurringData(data, status),
```

---

**Post-Action Verification:**
```bash
grep -n "recurring_cooldown\|generateRecurringData\|cooldownUntil" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -10
```
**Expected:** All patterns found

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Cooldown check added to computeStatus() ✅
- [ ] generateRecurringData function added ✅
- [ ] recurringData included in transform ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 6: Update UI

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add recurring badge, cooldown UI, flippable content

---

**Edit Action 1: Import Clock icon**

Add to lucide-react imports:
```typescript
import { Clock } from "lucide-react"
```

---

**Edit Action 2: Add recurring badge component**

Add badge rendering logic in card component:
```typescript
{mission.recurringData?.frequency && (
  <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
    {mission.recurringData.frequency === 'weekly' && 'Weekly'}
    {mission.recurringData.frequency === 'monthly' && 'Monthly'}
    {mission.recurringData.frequency === 'unlimited' && 'Unlimited'}
  </div>
)}
```

---

**Edit Action 3: Add recurring_cooldown card state**

Add card rendering for cooldown state:
```typescript
{status === 'recurring_cooldown' && (
  <div className={cn("p-5 rounded-xl border bg-slate-50 border-slate-200 opacity-70")}>
    <div className="flex items-start justify-between mb-3">
      <Clock className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{mission.displayName}</h3>
    <p className="text-slate-600 font-medium capitalize">
      {mission.recurringData?.frequency} mission
    </p>
    <p className="text-slate-500 text-sm">
      Available again in {mission.recurringData?.cooldownDaysRemaining} days
    </p>
  </div>
)}
```

---

**Post-Action Verification:**
```bash
grep -n "recurring_cooldown\|recurringData\|Clock" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | head -10
```
**Expected:** All patterns found

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Clock icon imported ✅
- [ ] Recurring badge added ✅
- [ ] Cooldown card state added ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 7: Update API Contracts

**Target File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
**Action Type:** MODIFY
**Purpose:** Document new status and recurringData field

---

**Edit Action: Add recurring_cooldown and recurringData documentation**

Find MissionStatus section and add:
```markdown
- `recurring_cooldown` - Recurring mission in rate-limit period, waiting for cooldown to expire
```

Find MissionItem section and add:
```markdown
### MissionItem.recurringData

For recurring missions (`redemption_frequency` != 'one-time'):

| Field | Type | Description |
|-------|------|-------------|
| frequency | 'weekly' \| 'monthly' \| 'unlimited' | Recurring frequency |
| cooldownUntil | string \| null | ISO timestamp when cooldown ends |
| cooldownDaysRemaining | number \| null | Days until available |
| isInCooldown | boolean | True if rate-limited |

For one-time missions: `recurringData` is `null`.
```

---

**Post-Action Verification:**
```bash
grep -n "recurring_cooldown\|recurringData" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -10
```
**Expected:** Documentation added

**Step Checkpoint:**
- [ ] recurring_cooldown documented ✅
- [ ] recurringData documented ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `lib/services/missionService.ts`
**New Import:**
```typescript
import { RecurringData } from '@/lib/types/api';
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct
- [ ] RecurringData exported from api.ts
- [ ] Types align

---

### Type Alignment Verification

**New Types Introduced:**
```typescript
- RecurringData (interface)
- recurring_cooldown (MissionStatus literal)
- reward_redemption_frequency (RPC field)
- progress_cooldown_until (RPC field)
- newProgressId (ClaimResult field)
- cooldownDays (ClaimResult field)
```

**Verification:**
- [ ] Types exported correctly
- [ ] Types imported where needed
- [ ] No type conflicts with existing types

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `get_available_missions` RPC
```sql
WHERE m.client_id = p_client_id
```
**Security Checklist:**
- [ ] client_id filter present
- [ ] No cross-tenant data exposure

**Query 2:** `claim_instant_reward` RPC
```sql
AND m.client_id = p_client_id
AND rw.client_id = p_client_id
AND r.client_id = p_client_id
```
**Security Checklist:**
- [ ] Mission client_id checked
- [ ] Reward client_id checked
- [ ] Redemption client_id checked
- [ ] New mission_progress uses p_client_id

---

### Grep Verification

```bash
grep -n "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251226_recurring_missions.sql
```
**Expected:** client_id filter on multiple lines
**Actual:** [document actual output]

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: Migration deployed and verified
**Test:** Run migration in Supabase
**Expected:** No errors
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: New code created per specification
**Test:** Verify all files modified/created
**Expected:** 7 files (1 created, 6 modified)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: Transaction safety verified
**Test:** Claim same mission twice rapidly
**Expected:** Only one new instance created
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Duplicate prevention verified
**Test:** Check NOT EXISTS guard in RPC
**Expected:** Guard present and working
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Type checker passes
**Test:** npx tsc --noEmit
**Expected:** 0 errors
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Build completes
**Test:** npm run build
**Expected:** Success
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] cooldown_until column matches TIMESTAMP type
- [ ] All column names match SchemaFinalv2.md
- [ ] No breaking schema changes

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [ ] recurring_cooldown added to MissionStatus
- [ ] recurringData added to MissionItem
- [ ] No breaking changes to existing consumers

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `supabase/migrations/20251226_recurring_missions.sql`: ~250 lines added
- `lib/types/rpc.ts`: ~5 lines added
- `lib/types/api.ts`: ~15 lines added
- `lib/repositories/missionRepository.ts`: ~10 lines added
- `lib/services/missionService.ts`: ~40 lines added
- `app/missions/missions-client.tsx`: ~30 lines added
- `API_CONTRACTS.md`: ~20 lines added

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | Migration deployed | ✅ / ❌ |
| 2 | All code created | ✅ / ❌ |
| 3 | Transaction safety | ✅ / ❌ |
| 4 | Duplicate prevention | ✅ / ❌ |
| 5 | Type check passes | ✅ / ❌ |
| 6 | Build completes | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-26
**Executor:** Claude Opus 4.5
**Specification Source:** RecurringMissionsGap.md
**Implementation Doc:** RecurringMissionsGapIMPL.md
**Gap ID:** GAP-RECURRING-001

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - [PASS/FAIL]
[Timestamp] Gate 6: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create migration - Created ✅ - Verified ✅
[Timestamp] Step 2: Update RPC types - Modified ✅ - Verified ✅
[Timestamp] Step 3: Update API types - Modified ✅ - Verified ✅
[Timestamp] Step 4: Update repository - Modified ✅ - Verified ✅
[Timestamp] Step 5: Update service - Modified ✅ - Verified ✅
[Timestamp] Step 6: Update UI - Modified ✅ - Verified ✅
[Timestamp] Step 7: Update API contracts - Modified ✅ - Verified ✅
```

---

### Files Created/Modified

**Complete List:**
1. `supabase/migrations/20251226_recurring_missions.sql` - CREATE - ~250 lines - Migration
2. `lib/types/rpc.ts` - MODIFY - ~5 lines - Add RPC fields
3. `lib/types/api.ts` - MODIFY - ~15 lines - Add status and interface
4. `lib/repositories/missionRepository.ts` - MODIFY - ~10 lines - Map new fields
5. `lib/services/missionService.ts` - MODIFY - ~40 lines - Add cooldown logic
6. `app/missions/missions-client.tsx` - MODIFY - ~30 lines - Add UI
7. `API_CONTRACTS.md` - MODIFY - ~20 lines - Document changes

**Total:** 7 files, ~370 lines added (net)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files created/changed
git diff --stat

# 2. Verify no type errors
npx tsc --noEmit 2>&1 | head -20

# 3. Verify multi-tenant filters present
grep -n "client_id" supabase/migrations/20251226_recurring_missions.sql

# 4. Verify new status added
grep -n "recurring_cooldown" lib/types/api.ts

# 5. Verify recurringData in service
grep -n "recurringData\|generateRecurringData" lib/services/missionService.ts
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
- [ ] Partial code checked
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filters confirmed ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / PENDING / FAILED ❌]

**Next Actions:**
1. [ ] Execute gates (verify environment)
2. [ ] Execute steps in order
3. [ ] Run verifications
4. [ ] Git commit with message below

**Git Commit Message Template:**
```
feat: add recurring missions rate-limiting support

Implements GAP-RECURRING-001: Weekly/monthly/unlimited missions
with cooldown period between completions.

New files:
- supabase/migrations/20251226_recurring_missions.sql

Modified files:
- lib/types/rpc.ts: Add RPC fields
- lib/types/api.ts: Add recurring_cooldown status, RecurringData
- lib/repositories/missionRepository.ts: Map new fields
- lib/services/missionService.ts: Add cooldown logic
- app/missions/missions-client.tsx: Add recurring UI
- API_CONTRACTS.md: Document changes

References:
- BugFixes/RecurringMissionsGap.md
- BugFixes/RecurringMissionsGapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (if any)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence

---

**META-VERIFICATION STATUS:** [PENDING - Execute steps first]

---

**Document Version:** 1.1
**Created:** 2025-12-26
**Updated:** 2025-12-26
**Status:** Ready for Execution
**Spec Version:** RecurringMissionsGap.md v5.2
