# Missed Raffle Visibility - Gap Implementation Plan

**Specification Source:** MissedRaffleVisibilityGap.md
**Gap ID:** GAP-RAFFLE-001
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-25
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissedRaffleVisibilityGap.md:**

**Gap Summary:** Users who were eligible but didn't participate in a raffle can still see/join it after winner selected, getting stuck in "Waiting for draw" forever.

**Business Need:** Prevent user confusion and create FOMO to drive future raffle participation.

**Files to Create/Modify:**
- CREATE: `supabase/migrations/YYYYMMDD_missed_raffle_visibility.sql`
- MODIFY: `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- MODIFY: `appcode/lib/types/missions.ts`
- MODIFY: `appcode/lib/types/rpc.ts`
- MODIFY: `appcode/lib/repositories/missionRepository.ts`
- MODIFY: `appcode/lib/services/missionService.ts`
- MODIFY: `appcode/app/missions/missionhistory/missionhistory-client.tsx`

**Specified Solution (From Gap.md Section 6):**
1. Block participation in `raffle_create_participation` if winner exists (Check 5)
2. Hide closed raffles from `get_available_missions` for non-participants
3. Add UNION query to `get_mission_history` for missed raffles with `is_missed` flag
4. Add `missed_raffle` status to TypeScript types
5. Handle `missed_raffle` in service layer
6. Render "Missed Raffle Participation" card in UI

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] All RPC functions updated per "Proposed Solution" section
2. [ ] API_CONTRACTS.md updated with new status enum
3. [ ] All TypeScript types updated
4. [ ] Repository and service layers handle new `is_missed` field
5. [ ] UI displays "Missed Raffle Participation" with FOMO styling
6. [ ] Participation blocked after winner selected with clear error
7. [ ] Multi-tenant isolation verified (client_id in all queries)
8. [ ] Type checker passes
9. [ ] All tests pass (existing + new)
10. [ ] Build completes

**From Audit Feedback:**
- Recommendation: APPROVE
- Critical Issues Addressed: None
- Concerns Addressed: Frontend handling - add missed_raffle branch to UI

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1 (migration)
- Files modified: 6
- Lines added: ~200
- Breaking changes: NO
- Schema changes: NO (RPC only)
- API contract changes: YES (additive - new enum value)

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
**Expected:** `/home/jorge/Loyalty/Rumi` or `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR acceptable pending changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -r "missed_raffle\|is_missed\|missed.*raffle" /home/jorge/Loyalty/Rumi/appcode/lib/ 2>/dev/null
grep -r "This raffle has ended" /home/jorge/Loyalty/Rumi/supabase/migrations/ 2>/dev/null
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `missed_raffle`: [result]
- [ ] Grep executed for "This raffle has ended": [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for related implementations:**
```bash
grep -rn "rejected_raffle" /home/jorge/Loyalty/Rumi/appcode/lib/ | head -10
grep -rn "is_winner.*false\|isWinner.*false" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -5
grep -rn "raffle_create_participation" /home/jorge/Loyalty/Rumi/supabase/migrations/ | head -5
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| missionService.ts | `rejected_raffle` status handling | Extend for `missed_raffle` | EXTEND |
| missionhistory-client.tsx | `isRejectedRaffleCard` styling | Add similar `isMissedRaffleCard` | EXTEND |
| raffle_participation_rls_fix.sql | `raffle_create_participation` RPC | Add Check 5 | MODIFY |
| fix_raffle_loser_visibility.sql | `get_available_missions` RPC | Add closed raffle filter | MODIFY |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: LOW
- [ ] Integration points identified: [list]

---

### Gate 4: Files to Modify Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/supabase/migrations/` (new file)
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | tail -5
```
**Expected:** Directory exists, will create new migration file

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts
```
**Expected:** File exists

**File 4:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**File 5:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** File exists

**File 6:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx
```
**Expected:** File exists

**Checklist:**
- [ ] All files to modify exist: [count]
- [ ] All files to create do not exist: [count]
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**
```bash
grep -A 20 "raffle_participations" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md | head -30
```

**Tables involved:** raffle_participations, missions, rewards, redemptions, users

**Column verification:**
| Column in Spec | Column in Schema | Exists? | Type Match? |
|----------------|------------------|---------|-------------|
| raffle_participations.is_winner | is_winner BOOLEAN | ✅ | ✅ |
| raffle_participations.client_id | client_id UUID | ✅ | ✅ |
| raffle_participations.winner_selected_at | winner_selected_at TIMESTAMP | ✅ | ✅ |
| missions.mission_type | mission_type VARCHAR(50) | ✅ | ✅ |
| missions.tier_eligibility | tier_eligibility VARCHAR(50) | ✅ | ✅ |
| missions.display_name | display_name VARCHAR(255) | ✅ | ✅ |

**Checklist:**
- [ ] All required columns exist in schema
- [ ] Data types compatible
- [ ] No schema migration needed

---

### Gate 6: API Contract Verification

**Read API_CONTRACTS.md for relevant endpoint:**
```bash
grep -B 5 -A 20 "status.*concluded.*rejected_raffle" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -30
```

**Endpoint:** GET /missions/missionhistory (SSR)

**Contract alignment:**
| Field in Spec | Field in Contract | Aligned? |
|---------------|-------------------|----------|
| status: 'missed_raffle' | NEEDS TO BE ADDED | ⚠️ Will add |
| All other fields | Existing fields | ✅ |

**Checklist:**
- [ ] Field names align with contract (after update)
- [ ] Response structure matches
- [ ] No breaking changes to existing API (additive only)

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

### Step 1: Create Migration File with RPC Updates

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql`
**Action Type:** CREATE
**Purpose:** Add all 3 RPC fixes (block participation, hide closed raffles, add missed to history)

---

**New File Content:**
```sql
-- =============================================
-- GAP-RAFFLE-001: Missed Raffle Visibility
-- Created: 2025-12-25
-- Purpose:
--   1. Block participation after winner selected
--   2. Hide closed raffles from non-participants
--   3. Show missed raffles in history
-- =============================================

-- =============================================
-- FIX 1: Block participation after winner selected
-- Add Check 5 to raffle_create_participation RPC
-- =============================================

CREATE OR REPLACE FUNCTION raffle_create_participation(
  p_mission_id UUID,
  p_user_id UUID,
  p_client_id UUID,
  p_reward_id UUID,
  p_tier_at_claim VARCHAR
) RETURNS TABLE (
  success BOOLEAN,
  participation_id UUID,
  redemption_id UUID,
  progress_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_progress_id UUID;
  v_redemption_id UUID;
  v_participation_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- =========================================
  -- DEFENSE-IN-DEPTH CHECKS
  -- =========================================

  -- Check 1: Verify user belongs to the specified client (tenant isolation)
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND client_id = p_client_id
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'User not found or client mismatch'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 2: Verify mission belongs to client, is raffle type, enabled, activated, AND has matching reward
  IF NOT EXISTS (
    SELECT 1 FROM missions
    WHERE id = p_mission_id
      AND client_id = p_client_id
      AND mission_type = 'raffle'
      AND enabled = true
      AND activated = true
      AND reward_id IS NOT NULL
      AND reward_id = p_reward_id
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Mission not found, not a raffle, not active, or reward mismatch'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 3: Idempotency - verify user hasn't already participated
  IF EXISTS (
    SELECT 1 FROM raffle_participations
    WHERE mission_id = p_mission_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Already participated in this raffle'::TEXT AS error_message;
    RETURN;
  END IF;

  -- Check 4: Verify reward_id is provided
  IF p_reward_id IS NULL THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Mission has no associated reward'::TEXT AS error_message;
    RETURN;
  END IF;

  -- NEW Check 5: Verify winner not already selected (GAP-RAFFLE-001)
  -- Multi-tenant filter: client_id = p_client_id
  IF EXISTS (
    SELECT 1 FROM raffle_participations
    WHERE mission_id = p_mission_id
      AND client_id = p_client_id
      AND is_winner = TRUE
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'This raffle has ended'::TEXT AS error_message;
    RETURN;
  END IF;

  -- =========================================
  -- RECORD CREATION
  -- =========================================

  -- Check if mission_progress already exists
  SELECT id INTO v_progress_id
  FROM mission_progress
  WHERE mission_id = p_mission_id
    AND user_id = p_user_id
    AND client_id = p_client_id;

  -- Create mission_progress if not exists
  IF v_progress_id IS NULL THEN
    INSERT INTO mission_progress (
      mission_id, user_id, client_id,
      current_value, status, completed_at, created_at, updated_at
    ) VALUES (
      p_mission_id, p_user_id, p_client_id,
      0, 'completed', v_now, v_now, v_now
    )
    RETURNING id INTO v_progress_id;
  ELSE
    UPDATE mission_progress
    SET status = 'completed', completed_at = v_now, updated_at = v_now
    WHERE id = v_progress_id AND status != 'completed';
  END IF;

  -- Create redemption record
  INSERT INTO redemptions (
    user_id, client_id, reward_id, mission_progress_id,
    status, tier_at_claim, redemption_type, created_at, updated_at
  ) VALUES (
    p_user_id, p_client_id, p_reward_id, v_progress_id,
    'claimable', p_tier_at_claim, 'instant', v_now, v_now
  )
  RETURNING id INTO v_redemption_id;

  -- Create raffle participation record
  INSERT INTO raffle_participations (
    mission_id, user_id, client_id, mission_progress_id, redemption_id, participated_at
  ) VALUES (
    p_mission_id, p_user_id, p_client_id, v_progress_id, v_redemption_id, v_now
  )
  RETURNING id INTO v_participation_id;

  -- Return success
  RETURN QUERY SELECT
    true AS success,
    v_participation_id AS participation_id,
    v_redemption_id AS redemption_id,
    v_progress_id AS progress_id,
    NULL::TEXT AS error_message;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    false AS success,
    NULL::UUID AS participation_id,
    NULL::UUID AS redemption_id,
    NULL::UUID AS progress_id,
    SQLERRM AS error_message;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;


-- =============================================
-- FIX 2: Hide closed raffles from non-participants
-- Update get_available_missions RPC
-- =============================================

CREATE OR REPLACE FUNCTION "public"."get_available_missions"(
  "p_user_id" "uuid",
  "p_client_id" "uuid",
  "p_current_tier" character varying
) RETURNS TABLE(
  "mission_id" "uuid",
  "mission_type" character varying,
  "mission_display_name" character varying,
  "mission_title" character varying,
  "mission_description" "text",
  "mission_target_value" integer,
  "mission_target_unit" character varying,
  "mission_raffle_end_date" timestamp without time zone,
  "mission_activated" boolean,
  "mission_tier_eligibility" character varying,
  "mission_preview_from_tier" character varying,
  "mission_enabled" boolean,
  "mission_display_order" integer,
  "mission_reward_id" "uuid",
  "reward_id" "uuid",
  "reward_type" character varying,
  "reward_name" character varying,
  "reward_description" character varying,
  "reward_value_data" "jsonb",
  "reward_redemption_type" character varying,
  "reward_source" character varying,
  "tier_id" character varying,
  "tier_name" character varying,
  "tier_color" character varying,
  "tier_order" integer,
  "progress_id" "uuid",
  "progress_current_value" integer,
  "progress_status" character varying,
  "progress_completed_at" timestamp without time zone,
  "progress_checkpoint_start" timestamp without time zone,
  "progress_checkpoint_end" timestamp without time zone,
  "redemption_id" "uuid",
  "redemption_status" character varying,
  "redemption_claimed_at" timestamp without time zone,
  "redemption_fulfilled_at" timestamp without time zone,
  "redemption_concluded_at" timestamp without time zone,
  "redemption_rejected_at" timestamp without time zone,
  "redemption_scheduled_activation_date" "date",
  "redemption_scheduled_activation_time" time without time zone,
  "redemption_activation_date" timestamp without time zone,
  "redemption_expiration_date" timestamp without time zone,
  "boost_status" character varying,
  "boost_scheduled_activation_date" "date",
  "boost_activated_at" timestamp without time zone,
  "boost_expires_at" timestamp without time zone,
  "boost_duration_days" integer,
  "physical_gift_shipped_at" timestamp without time zone,
  "physical_gift_shipping_city" character varying,
  "physical_gift_requires_size" boolean,
  "raffle_is_winner" boolean,
  "raffle_participated_at" timestamp without time zone,
  "raffle_winner_selected_at" timestamp without time zone
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  SELECT
    m.id, m.mission_type, m.display_name, m.title, m.description,
    m.target_value, m.target_unit, m.raffle_end_date, m.activated,
    m.tier_eligibility, m.preview_from_tier, m.enabled, m.display_order, m.reward_id,
    r.id, r.type, r.name, r.description, r.value_data, r.redemption_type, r.reward_source,
    t.tier_id, t.tier_name, t.tier_color, t.tier_order,
    mp.id, mp.current_value, mp.status, mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
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
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND (rp.is_winner IS NULL OR rp.is_winner = TRUE)
  WHERE m.client_id = p_client_id
    AND (
      (m.enabled = true AND (
        m.tier_eligibility = p_current_tier
        OR m.tier_eligibility = 'all'
        OR m.preview_from_tier = p_current_tier
      ))
      OR red.id IS NOT NULL
    )
    -- BUG-RAFFLE-002: Exclude raffle missions where user lost
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_check
      WHERE rp_check.mission_id = m.id
        AND rp_check.user_id = p_user_id
        AND rp_check.client_id = p_client_id
        AND rp_check.is_winner = FALSE
    )
    -- GAP-RAFFLE-001: Exclude closed raffles where user didn't participate
    AND NOT (
      m.mission_type = 'raffle'
      AND EXISTS (
        SELECT 1 FROM raffle_participations rp_winner
        WHERE rp_winner.mission_id = m.id
          AND rp_winner.client_id = p_client_id
          AND rp_winner.is_winner = TRUE
      )
      AND NOT EXISTS (
        SELECT 1 FROM raffle_participations rp_user
        WHERE rp_user.mission_id = m.id
          AND rp_user.user_id = p_user_id
          AND rp_user.client_id = p_client_id
      )
    )
  ORDER BY m.display_order ASC;
$$;

ALTER FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) OWNER TO "postgres";


-- =============================================
-- FIX 3: Include missed raffles in mission history
-- Update get_mission_history RPC with UNION
-- =============================================

CREATE OR REPLACE FUNCTION "public"."get_mission_history"(
  "p_user_id" "uuid",
  "p_client_id" "uuid"
) RETURNS TABLE(
  "redemption_id" "uuid",
  "redemption_status" character varying,
  "claimed_at" timestamp without time zone,
  "fulfilled_at" timestamp without time zone,
  "concluded_at" timestamp without time zone,
  "rejected_at" timestamp without time zone,
  "mission_id" "uuid",
  "mission_type" character varying,
  "mission_display_name" character varying,
  "reward_id" "uuid",
  "reward_type" character varying,
  "reward_name" character varying,
  "reward_description" "text",
  "reward_value_data" "jsonb",
  "reward_source" character varying,
  "completed_at" timestamp without time zone,
  "raffle_is_winner" boolean,
  "raffle_participated_at" timestamp without time zone,
  "raffle_winner_selected_at" timestamp without time zone,
  "is_missed" boolean
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  -- Existing: Concluded/rejected redemptions (user participated)
  SELECT
    red.id::UUID AS redemption_id,
    red.status::VARCHAR AS redemption_status,
    red.claimed_at::TIMESTAMP,
    red.fulfilled_at::TIMESTAMP,
    red.concluded_at::TIMESTAMP,
    red.rejected_at::TIMESTAMP,
    m.id::UUID AS mission_id,
    m.mission_type::VARCHAR,
    m.display_name::VARCHAR AS mission_display_name,
    r.id::UUID AS reward_id,
    r.type::VARCHAR AS reward_type,
    r.name::VARCHAR AS reward_name,
    r.description::TEXT AS reward_description,
    r.value_data::JSONB AS reward_value_data,
    r.reward_source::VARCHAR,
    mp.completed_at::TIMESTAMP,
    rp.is_winner::BOOLEAN AS raffle_is_winner,
    rp.participated_at::TIMESTAMP AS raffle_participated_at,
    rp.winner_selected_at::TIMESTAMP AS raffle_winner_selected_at,
    FALSE::BOOLEAN AS is_missed
  FROM redemptions red
  INNER JOIN mission_progress mp ON red.mission_progress_id = mp.id
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN raffle_participations rp ON mp.id = rp.mission_progress_id
    AND rp.user_id = p_user_id
  WHERE red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.status IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
    AND red.mission_progress_id IS NOT NULL

  UNION ALL

  -- GAP-RAFFLE-001: Missed raffles (eligible but didn't participate)
  SELECT
    NULL::UUID AS redemption_id,
    'missed_raffle'::VARCHAR AS redemption_status,  -- Must match MissionHistoryStatus type
    NULL::TIMESTAMP AS claimed_at,
    NULL::TIMESTAMP AS fulfilled_at,
    NULL::TIMESTAMP AS concluded_at,
    NULL::TIMESTAMP AS rejected_at,
    m.id::UUID AS mission_id,
    m.mission_type::VARCHAR,
    m.display_name::VARCHAR AS mission_display_name,
    r.id::UUID AS reward_id,
    r.type::VARCHAR AS reward_type,
    r.name::VARCHAR AS reward_name,
    r.description::TEXT AS reward_description,
    r.value_data::JSONB AS reward_value_data,
    r.reward_source::VARCHAR,
    NULL::TIMESTAMP AS completed_at,
    NULL::BOOLEAN AS raffle_is_winner,
    NULL::TIMESTAMP AS raffle_participated_at,
    rp_winner.winner_selected_at::TIMESTAMP AS raffle_winner_selected_at,
    TRUE::BOOLEAN AS is_missed
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  INNER JOIN raffle_participations rp_winner ON m.id = rp_winner.mission_id
    AND rp_winner.is_winner = TRUE
    AND rp_winner.client_id = p_client_id
  WHERE m.client_id = p_client_id
    AND m.mission_type = 'raffle'
    AND (m.tier_eligibility = 'all' OR m.tier_eligibility = (
      SELECT current_tier FROM users WHERE id = p_user_id AND client_id = p_client_id
    ))
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_user
      WHERE rp_user.mission_id = m.id
        AND rp_user.user_id = p_user_id
        AND rp_user.client_id = p_client_id
    )

  ORDER BY COALESCE(concluded_at, rejected_at, raffle_winner_selected_at) DESC;
$$;

ALTER FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";

-- =============================================
-- END OF MIGRATION
-- =============================================
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
```
**Expected:** File exists, ~300 lines

**Step Checkpoint:**
- [ ] File created successfully ✅
- [ ] Line count approximately correct ✅
- [ ] SQL syntax valid (no obvious errors) ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Update TypeScript Types - missions.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts`
**Action Type:** MODIFY
**Purpose:** Add `missed_raffle` to MissionHistoryStatus type

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -n "MissionHistoryStatus" /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
```

**Expected Current State:**
```typescript
export type MissionHistoryStatus = 'concluded' | 'rejected_raffle';
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line number identified: [N]

**Edit Action:**

**OLD Code:**
```typescript
export type MissionHistoryStatus = 'concluded' | 'rejected_raffle';
```

**NEW Code:**
```typescript
export type MissionHistoryStatus = 'concluded' | 'rejected_raffle' | 'missed_raffle';
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
Old String: export type MissionHistoryStatus = 'concluded' | 'rejected_raffle';
New String: export type MissionHistoryStatus = 'concluded' | 'rejected_raffle' | 'missed_raffle';
```

**Post-Action Verification:**
```bash
grep -n "MissionHistoryStatus" /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
```
**Expected:** Shows `'missed_raffle'` in the type

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts 2>&1 | head -10
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Edit applied correctly ✅
- [ ] Post-action state matches expected ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Update TypeScript Types - rpc.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts`
**Action Type:** MODIFY
**Purpose:** Add `is_missed` column to GetMissionHistoryRow type

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -B 5 -A 20 "GetMissionHistoryRow\|get_mission_history" /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts | head -40
```

**Expected:** Find GetMissionHistoryRow interface without is_missed

**Edit Action:**

Add `is_missed: boolean | null;` to the GetMissionHistoryRow interface after `raffle_winner_selected_at`.

**Step Checkpoint:**
- [ ] Interface found ✅
- [ ] is_missed field added ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update Repository Layer - missionRepository.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Action Type:** MODIFY
**Purpose:** Map `is_missed` field from RPC response in getHistory function

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -n "raffle_winner_selected_at\|raffleParticipation:" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts | head -10
```

**Expected:** Find where raffleParticipation is mapped

**Edit Action:**

Add `isMissed: row.is_missed ?? false` to the return object alongside raffleParticipation.

**Step Checkpoint:**
- [ ] Mapping location found ✅
- [ ] isMissed field added ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Update Service Layer - missionService.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
**Action Type:** MODIFY
**Purpose:** Handle `missed_raffle` status in listMissionHistory()

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -B 5 -A 10 "rejected_raffle\|Determine status" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -30
```

**Expected:** Find status determination logic around line 1212-1217

**Edit Action:**

**OLD Code:**
```typescript
// Determine status
let status: 'concluded' | 'rejected_raffle';
if (data.redemption.status === 'rejected' && data.raffleParticipation?.isWinner === false) {
  status = 'rejected_raffle';
} else {
  status = 'concluded';
}
```

**NEW Code:**
```typescript
// Determine status
let status: 'concluded' | 'rejected_raffle' | 'missed_raffle';
if (data.isMissed) {
  status = 'missed_raffle';
} else if (data.redemption.status === 'rejected' && data.raffleParticipation?.isWinner === false) {
  status = 'rejected_raffle';
} else {
  status = 'concluded';
}
```

**Step Checkpoint:**
- [ ] Status logic found ✅
- [ ] missed_raffle handling added ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 6: Update UI - missionhistory-client.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add UI for missed_raffle status card

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -B 3 -A 10 "isRejectedRaffleCard\|rejected_raffle" /home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx | head -30
```

**Expected:** Find rejected raffle card styling and logic

**Edit Actions:**

1. Add `const isMissedRaffleCard = isRaffle && mission.status === "missed_raffle"` after isRejectedRaffleCard

2. Add amber/yellow styling for missed raffle:
```typescript
mission.status === "missed_raffle" && "bg-amber-50 border-amber-200"
```

3. Add primaryText for missed raffle:
```typescript
if (isMissedRaffleCard) {
  primaryText = "Missed Raffle Participation"
}
```

**Step Checkpoint:**
- [ ] Missed raffle card logic added ✅
- [ ] Amber styling applied ✅
- [ ] FOMO messaging added ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 7: Update API_CONTRACTS.md

**Target File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
**Action Type:** MODIFY
**Purpose:** Add missed_raffle to status enum documentation

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -n "concluded.*rejected_raffle" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -5
```

**Edit Action:**

**OLD Code:**
```typescript
status: 'concluded' | 'rejected_raffle'
```

**NEW Code:**
```typescript
status: 'concluded' | 'rejected_raffle' | 'missed_raffle'
```

Also add example for missed_raffle in the example response section.

**Step Checkpoint:**
- [ ] Status enum updated ✅
- [ ] Documentation clear ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**No new imports needed** - using existing types and extending them.

**Checklist:**
- [ ] No new dependencies required
- [ ] Existing imports sufficient
- [ ] Types align

---

### Call Site Verification

**Repository → Service flow:**
- missionRepository.getHistory() now returns `isMissed` field
- missionService.listMissionHistory() handles `isMissed` → `missed_raffle` status

**Service → UI flow:**
- MissionHistoryItem type includes `status: MissionHistoryStatus`
- UI checks `mission.status === "missed_raffle"`

**Checklist:**
- [ ] Data flows from RPC → Repository → Service → UI
- [ ] All status values handled
- [ ] No runtime errors expected

---

### Type Alignment Verification

**Types updated:**
1. `MissionHistoryStatus` - added `'missed_raffle'`
2. `GetMissionHistoryRow` - added `is_missed: boolean | null`
3. Repository return type - added `isMissed: boolean`

**Verification:**
- [ ] Types exported correctly
- [ ] Types imported where needed
- [ ] No type conflicts

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

**RLS/SECURITY DEFINER Note:** All RPCs use `SECURITY DEFINER` which **bypasses RLS by design**. This is the established pattern in this codebase. Multi-tenant isolation is enforced via explicit `client_id = p_client_id` filters in WHERE clauses, NOT via RLS policies. This is intentional and documented in Gap.md Section 6.

---

### Multi-Tenant Security Check

**Query 1:** `raffle_create_participation` - Check 5
```sql
IF EXISTS (
  SELECT 1 FROM raffle_participations
  WHERE mission_id = p_mission_id
    AND client_id = p_client_id  -- Multi-tenant filter ✅
    AND is_winner = TRUE
)
```
**Checklist:**
- [x] `client_id = p_client_id` present
- [x] No cross-tenant data exposure

**Query 2:** `get_available_missions` - Closed raffle filter
```sql
AND EXISTS (
  SELECT 1 FROM raffle_participations rp_winner
  WHERE rp_winner.mission_id = m.id
    AND rp_winner.client_id = p_client_id  -- Multi-tenant filter ✅
    AND rp_winner.is_winner = TRUE
)
```
**Checklist:**
- [x] `client_id = p_client_id` present
- [x] No cross-tenant data exposure

**Query 3:** `get_mission_history` - Missed raffles UNION
```sql
WHERE m.client_id = p_client_id  -- Multi-tenant filter ✅
  AND ...
  AND rp_winner.client_id = p_client_id  -- Multi-tenant filter ✅
```
**Checklist:**
- [x] `client_id = p_client_id` present in multiple places
- [x] No cross-tenant data exposure

---

### Grep Verification (Post-Implementation)

```bash
grep -n "client_id.*p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
```
**Expected:** Multiple lines showing client_id filters

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: All RPC functions updated per "Proposed Solution" section
**Test:** Verify migration file contains all 3 RPC updates
**Command:**
```bash
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
```
**Expected:** 3
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: API_CONTRACTS.md updated with new status enum
**Test:** Verify missed_raffle in contract
**Command:**
```bash
grep "missed_raffle" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md
```
**Expected:** At least 1 match
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: All TypeScript types updated
**Test:** Verify types include missed_raffle and is_missed
**Command:**
```bash
grep "missed_raffle" /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts
grep "is_missed" /home/jorge/Loyalty/Rumi/appcode/lib/types/rpc.ts
```
**Expected:** Matches in both files
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Repository and service layers handle is_missed field
**Test:** Verify isMissed in repository and missed_raffle in service
**Command:**
```bash
grep "isMissed" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
grep "missed_raffle" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** Matches in both files
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: UI displays "Missed Raffle Participation" with FOMO styling
**Test:** Verify UI handles missed_raffle
**Command:**
```bash
grep "Missed Raffle\|missed_raffle\|amber" /home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx
```
**Expected:** Matches for styling and message
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Participation blocked after winner selected
**Test:** Verify Check 5 in RPC
**Command:**
```bash
grep "This raffle has ended" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
```
**Expected:** 1 match
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Multi-tenant isolation verified
**Test:** Verify client_id filters
**Command:**
```bash
grep -c "client_id.*p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql
```
**Expected:** Multiple matches (>5)
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- migrations/20251225_missed_raffle_visibility.sql: ~300 lines added (new file)
- lib/types/missions.ts: ~1 line modified
- lib/types/rpc.ts: ~1 line modified
- lib/repositories/missionRepository.ts: ~2 lines modified
- lib/services/missionService.ts: ~5 lines modified
- app/missions/missionhistory/missionhistory-client.tsx: ~10 lines modified
- API_CONTRACTS.md: ~5 lines modified

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | RPC functions updated | ⏳ |
| 2 | API contract updated | ⏳ |
| 3 | TypeScript types updated | ⏳ |
| 4 | Repository/service handle is_missed | ⏳ |
| 5 | UI displays missed raffle | ⏳ |
| 6 | Participation blocked | ⏳ |
| 7 | Multi-tenant verified | ⏳ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-25
**Executor:** Claude Opus 4.5
**Specification Source:** MissedRaffleVisibilityGap.md
**Implementation Doc:** MissedRaffleVisibilityGapIMPL.md
**Gap ID:** GAP-RAFFLE-001

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PENDING]
[Timestamp] Gate 2: Gap Confirmation - [PENDING]
[Timestamp] Gate 3: Partial Code Check - [PENDING]
[Timestamp] Gate 4: Files - [PENDING]
[Timestamp] Gate 5: Schema - [PENDING]
[Timestamp] Gate 6: API Contract - [PENDING]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create migration file - [PENDING]
[Timestamp] Step 2: Update missions.ts types - [PENDING]
[Timestamp] Step 3: Update rpc.ts types - [PENDING]
[Timestamp] Step 4: Update missionRepository.ts - [PENDING]
[Timestamp] Step 5: Update missionService.ts - [PENDING]
[Timestamp] Step 6: Update missionhistory-client.tsx - [PENDING]
[Timestamp] Step 7: Update API_CONTRACTS.md - [PENDING]
```

---

### Files Created/Modified

**Complete List:**
1. `supabase/migrations/20251225_missed_raffle_visibility.sql` - CREATE - ~300 lines
2. `appcode/lib/types/missions.ts` - MODIFY - 1 line
3. `appcode/lib/types/rpc.ts` - MODIFY - 1 line
4. `appcode/lib/repositories/missionRepository.ts` - MODIFY - 2 lines
5. `appcode/lib/services/missionService.ts` - MODIFY - 5 lines
6. `appcode/app/missions/missionhistory/missionhistory-client.tsx` - MODIFY - 10 lines
7. `API_CONTRACTS.md` - MODIFY - 5 lines

**Total:** 7 files, ~324 lines added (net)

---

### Decision Trail

**Step 1: Analysis Phase**
- StandardGapFix.md template applied
- Created: MissedRaffleVisibilityGap.md
- Documented 17 sections
- Proposed UNION solution

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE
- No critical issues
- Concern addressed: Frontend handling

**Step 3: Implementation Phase (Current)**
- StandardGapFixIMPL.md template applied
- Creating: MissedRaffleVisibilityGapIMPL.md
- 7 implementation steps defined

---

### Auditor Verification Commands

**Quick Verification (Run These Post-Implementation):**

```bash
# 1. Verify migration file created
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql

# 2. Verify Check 5 added (block participation)
grep "This raffle has ended" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql

# 3. Verify is_missed in UNION
grep "is_missed" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql

# 4. Verify multi-tenant filters
grep -c "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251225_missed_raffle_visibility.sql

# 5. Verify TypeScript types
grep "missed_raffle" /home/jorge/Loyalty/Rumi/appcode/lib/types/missions.ts

# 6. Verify UI handling
grep "Missed Raffle" /home/jorge/Loyalty/Rumi/appcode/app/missions/missionhistory/missionhistory-client.tsx
```

---

## Document Status

**Implementation Date:** 2025-12-25
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Partial code checked
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified
- [ ] Call sites verified
- [ ] Types aligned

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] client_id filters confirmed
- [ ] Auth requirements met

**Feature Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] ALL acceptance criteria met
- [ ] Git diff reviewed

---

### Final Status

**Implementation Result:** [PENDING - Awaiting Execution]

---

### Next Actions

**After implementation succeeds:**
1. [ ] Apply migration: `npx supabase db push`
2. [ ] Run smoke test to verify UNION returns missed_raffle rows:
   ```sql
   -- Smoke test: Verify missed raffles appear with correct status
   SELECT mission_id, redemption_status, is_missed
   FROM get_mission_history(
     '60bd09f9-2b05-4585-8c7a-68d583c9fb43'::uuid,
     '11111111-1111-1111-1111-111111111111'::uuid
   )
   WHERE is_missed = TRUE;
   -- Expected: redemption_status = 'missed_raffle', is_missed = true
   ```
3. [ ] Run type checker: `npm run typecheck`
4. [ ] Run build: `npm run build`
5. [ ] Manual test with two users
6. [ ] Git commit with message below
7. [ ] Update MissedRaffleVisibilityGap.md status to "Implemented"

**Git Commit Message Template:**
```
feat: add missed raffle visibility (GAP-RAFFLE-001)

Implements missed raffle feature from MissedRaffleVisibilityGap.md:
- Block participation after winner selected (Check 5)
- Hide closed raffles from non-participants
- Show missed raffles in history with FOMO UI

New files:
- supabase/migrations/20251225_missed_raffle_visibility.sql

Modified files:
- appcode/lib/types/missions.ts: Add missed_raffle status
- appcode/lib/types/rpc.ts: Add is_missed column
- appcode/lib/repositories/missionRepository.ts: Map is_missed
- appcode/lib/services/missionService.ts: Handle missed_raffle
- appcode/app/missions/missionhistory/missionhistory-client.tsx: FOMO UI
- API_CONTRACTS.md: Document new status

References:
- BugFixes/MissedRaffleVisibilityGap.md
- BugFixes/MissedRaffleVisibilityGapIMPL.md

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
- [x] Read SchemaFinalv2.md for database queries
- [x] Read API_CONTRACTS.md for API changes
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)

### Specification Fidelity
- [x] Followed locked specification (no re-design)
- [x] Implemented specified solution exactly (no modifications)
- [x] Addressed audit feedback (frontend handling)
- [x] Did not second-guess specification

### Security Verification
- [x] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence
- [x] Verified auth requirements (SECURITY DEFINER)
- [x] No cross-tenant data exposure

---

**META-VERIFICATION STATUS:** [PENDING - Document is implementation plan, not yet executed]

**RED FLAGS exhibited:** None ✅

---

**Document Version:** 1.1
**Status:** Ready for Execution
**Next Step:** User approval to begin implementation

**Revision History:**
- v1.0: Initial implementation plan
- v1.1: Fixed status mismatch ('missed' → 'missed_raffle'), added smoke test, added RLS/SECURITY DEFINER note
