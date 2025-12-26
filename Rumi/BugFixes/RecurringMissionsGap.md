# Recurring Missions - Gap Documentation

**ID:** GAP-RECURRING-001
**Type:** Feature Gap
**Created:** 2025-12-26
**Status:** Analysis Complete
**Priority:** Medium
**Related Tasks:** None

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, and Supabase/PostgreSQL. Creators complete missions (sales targets, video views, etc.) to earn rewards (gift cards, commission boosts, physical gifts). The system supports recurring missions via a `redemption_frequency` field, but no code implements the recurring behavior.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, RPC functions
**Architecture Pattern:** Repository → Service → Route layers with RPC-based data fetching

---

## 2. Gap/Enhancement Summary

**What's missing:** Weekly/monthly/unlimited missions behave identically to one-time missions. After completion, the mission card stays at 100% indefinitely. No rate-limiting exists, no cooldown state, and no UI differentiates recurring missions.

**What should exist (Rate Limit Model):**

1. Active recurring missions show badge ("Weekly"/"Monthly"/"Unlimited") and are flippable with explanation
2. Weekly/Monthly is a **rate limit** - user can complete once per 7/30 days
3. After claiming, next mission instance appears but is **rate-limited** until cooldown expires
4. User takes as long as they want to complete - **no progress reset**
5. When cooldown expires, mission becomes active and trackable again
6. If reward still processing when cooldown expires, two cards appear (old processing + new active)

**Key Insight:** Weekly means "max 4 completions per month" not "must complete within 7 days"

**Why it matters:** Recurring missions drive sustained engagement. Without this, the `redemption_frequency` field is useless and weekly/monthly missions cannot function as designed.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| SchemaFinalv2.md | rewards table | `redemption_frequency` field exists with values 'one-time', 'weekly', 'monthly', 'unlimited' |
| rpc.ts | GetAvailableMissionsRow | Does NOT include `reward_redemption_frequency` - only GetAvailableRewardsRow has it |
| baseline.sql | get_available_missions line 499 | `AND red.status NOT IN ('concluded', 'rejected')` - **excludes concluded redemptions** |
| baseline.sql | create_mission_progress_for_eligible_users | `NOT EXISTS` check prevents duplicate mission_progress per mission+user |
| missionService.ts | computeStatus() | No check for `redemption_frequency`, no cooldown logic |
| missionRepository.ts | listAvailable() | RPC returns missions but no frequency data |
| missions-client.tsx | Card rendering | No badge for recurring, no cooldown UI |
| daily-automation route.ts | Cron job | No step for recurring mission handling |
| API_CONTRACTS.md | MissionStatus type | No `recurring_cooldown` status defined |

### Critical Discovery: RPC Excludes Concluded Redemptions

**File:** `baseline.sql` line 499
```sql
AND red.status NOT IN ('concluded', 'rejected')
```

**Implication:** When a recurring mission's redemption is concluded:
1. It's filtered out of `get_available_missions` response
2. Mission **disappears** from missions page
3. Gap exists until new mission_progress is created

This creates a visibility gap that is solved by Option B (create at claim time).

---

## 4. Business Justification

**Business Need:** Enable true weekly/monthly/unlimited mission cycles with rate limiting.

**User Stories:**
1. As a creator, I want to see a "Weekly" badge on recurring missions so I know I can do them again
2. As a creator, I want to see "Available again on Jan 5" after completing a weekly mission
3. As a creator, I want to take my time completing missions without pressure or progress reset

**Impact if NOT implemented:**
- `redemption_frequency` field is completely useless
- Weekly/monthly missions behave as one-time (creator does once, never again)
- Reduced engagement and loyalty program effectiveness

---

## 5. Current State Analysis

### What Currently Exists

**File:** `lib/services/missionService.ts` - computeStatus()
```typescript
function computeStatus(data: AvailableMissionData): MissionStatus {
  // ... existing checks for locked, raffle, redemption states

  // Default: active mission
  return 'in_progress';
}
// NOTE: No check for redemption_frequency, no cooldown logic
```

**File:** `lib/types/rpc.ts` - GetAvailableMissionsRow
```typescript
// Does NOT include:
// reward_redemption_frequency: string | null;  // MISSING
// progress_cooldown_until: string | null;      // MISSING
```

**Current Capability:**
- System CAN track mission completion and reward redemption
- System CAN store `redemption_frequency` on rewards table
- System CANNOT detect if a mission is recurring
- System CANNOT compute rate-limited/cooldown state
- System CANNOT create new instances after cooldown
- System CANNOT display recurring badge or cooldown UI

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Rate Limit Model with Durable Cooldown State

Each recurring mission instance carries its own cooldown state via `cooldown_until` column:

**Key Design Decision:** New instances store `cooldown_until` timestamp at creation time. This solves the problem of needing to look up previous instance's `claimed_at`.

**Lifecycle:**
```
[Active at 0%] → [User completes] → [Claims reward]
                                          ↓
                        [Create new instance with cooldown_until = NOW() + 7 days]
                                          ↓
                        [New instance: status = 'recurring_cooldown' until cooldown_until]
                                          ↓
                        [cooldown_until passes] → [New instance: status = 'in_progress']
```

**No Progress Reset:** User takes as long as they want to complete. Progress is never reset.

---

### Schema Change: Add cooldown_until Column

**File:** `supabase/migrations/YYYYMMDD_recurring_missions.sql`
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Add cooldown_until to mission_progress for recurring missions

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
CREATE UNIQUE INDEX idx_mission_progress_active_cooldown
ON mission_progress(mission_id, user_id, client_id)
WHERE cooldown_until IS NOT NULL;
```

---

### New Status Definition

**File:** `lib/types/api.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
export type MissionStatus =
  | 'in_progress'
  | 'default_claim'
  | 'default_schedule'
  | 'scheduled'
  | 'active'
  | 'redeeming'
  | 'redeeming_physical'
  | 'sending'
  | 'pending_info'
  | 'clearing'
  | 'dormant'
  | 'raffle_available'
  | 'raffle_processing'
  | 'raffle_claim'
  | 'raffle_won'
  | 'locked'
  | 'recurring_cooldown';  // NEW - 17th status (rate-limited)
```

### New Data in API Response

**File:** `lib/types/api.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
interface MissionItem {
  // ... existing fields
  recurringData: {
    frequency: 'weekly' | 'monthly' | 'unlimited' | null;  // null = one-time
    cooldownUntil: string | null;         // ISO date when cooldown ends (from progress.cooldown_until)
    cooldownDaysRemaining: number | null;  // Days until available
    isInCooldown: boolean;                 // True if rate-limited
  } | null;
}
```

---

### RPC Modification

**File:** `supabase/migrations/YYYYMMDD_recurring_missions.sql`
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Add redemption_frequency and cooldown_until to get_available_missions return

-- Must DROP first due to return type change
DROP FUNCTION IF EXISTS get_available_missions(UUID, UUID, VARCHAR);

CREATE OR REPLACE FUNCTION get_available_missions(
  p_user_id UUID,
  p_client_id UUID,
  p_current_tier VARCHAR
)
RETURNS TABLE (
  -- ... existing 47 columns ...
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
  reward_redemption_frequency VARCHAR,  -- NEW
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
  progress_cooldown_until TIMESTAMP,     -- NEW
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
    r.redemption_frequency,  -- NEW
    t.tier_id, t.tier_name, t.tier_color, t.tier_order,
    mp.id, mp.current_value, mp.status, mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
    mp.cooldown_until,       -- NEW
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
```

---

### Type Updates

**File:** `lib/types/rpc.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
export interface GetAvailableMissionsRow {
  // ... existing fields ...

  // NEW fields
  reward_redemption_frequency: string | null;
  progress_cooldown_until: string | null;
}
```

**File:** `lib/repositories/missionRepository.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add to AvailableMissionData.reward
reward: {
  // ... existing fields ...
  redemptionFrequency: row.reward_redemption_frequency ?? 'one-time',
}

// Add to AvailableMissionData.progress
progress: row.progress_id
  ? {
      // ... existing fields ...
      cooldownUntil: row.progress_cooldown_until,
    }
  : null,
```

---

### Status Computation Logic (Using cooldown_until)

**File:** `lib/services/missionService.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
function computeStatus(data: AvailableMissionData): MissionStatus {
  // ... existing checks for locked, raffle states ...

  // CHECK COOLDOWN STATE (uses progress.cooldownUntil, NOT redemption.claimedAt)
  // This runs BEFORE redemption checks because new instances have no redemption
  if (data.progress?.cooldownUntil) {
    const cooldownUntil = new Date(data.progress.cooldownUntil);
    if (new Date() < cooldownUntil) {
      return 'recurring_cooldown';  // Rate-limited
    }
    // Cooldown expired - continue to normal status computation
  }

  // ... existing redemption checks ...
  if (redemption) {
    // ... existing logic ...
  }

  // Default: active mission
  return 'in_progress';
}
```

### Transform Function (Using cooldown_until)

**File:** `lib/services/missionService.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
function generateRecurringData(
  data: AvailableMissionData,
  status: MissionStatus
): MissionItem['recurringData'] {
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
    frequency,
    cooldownUntil,
    cooldownDaysRemaining,
    isInCooldown,
  };
}
```

---

### Claim-Time Instance Creation (Modify Existing RPC)

**Integration Point:** The existing fast path uses `claim_instant_reward` RPC. We **modify this RPC** to handle recurring missions atomically, avoiding any service-layer branching.

**File:** `lib/repositories/missionRepository.ts` - Update ClaimResult type
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Add optional fields for recurring missions (backwards compatible)

interface ClaimResult {
  success: boolean;
  redemptionId: string;
  newStatus: string;
  error?: string;
  // NEW optional fields for recurring
  newProgressId?: string | null;   // ID of next instance (null for one-time)
  cooldownDays?: number | null;    // Days until next available (null for unlimited)
}
```

**File:** `lib/repositories/missionRepository.ts` - Update claimInstantReward mapping
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// In claimInstantReward(), update return mapping:

return {
  success: true,
  redemptionId: result.redemption_id ?? '',
  newStatus: result.new_status ?? 'claimed',
  // NEW: map recurring fields if present
  newProgressId: result.new_progress_id ?? null,
  cooldownDays: result.cooldown_days ?? null,
};
```

**File:** `supabase/migrations/YYYYMMDD_recurring_missions.sql` - Modify Existing RPC
```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Modify claim_instant_reward to handle recurring missions atomically
-- This preserves the fast path while adding recurring support

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
  v_redemption_frequency TEXT;  -- NEW
  v_cooldown_days INTEGER;      -- NEW
  v_new_progress_id UUID;       -- NEW
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
    rw.redemption_frequency  -- NEW: get frequency for recurring check
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
    AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
  JOIN rewards rw ON r.reward_id = rw.id
    AND rw.client_id = p_client_id  -- MULTI-TENANT GUARD
  WHERE r.mission_progress_id = p_mission_progress_id
    AND r.user_id = v_user_id
    AND r.client_id = p_client_id
    AND r.deleted_at IS NULL
  FOR UPDATE OF r;  -- Lock redemption row

  -- Validation checks (existing logic)
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

  -- Instant rewards only (existing check)
  IF v_reward_type NOT IN ('gift_card', 'spark_ads', 'experience') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reward requires additional information');
  END IF;

  -- Perform the claim (existing logic)
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
    'new_progress_id', v_new_progress_id,  -- NEW: null for one-time
    'cooldown_days', v_cooldown_days       -- NEW: null for one-time/unlimited
  );
END;
$$;

REVOKE ALL ON FUNCTION claim_instant_reward FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_instant_reward TO authenticated;
```

**Key Safety Features:**
1. **FOR UPDATE OF r** - Locks the redemption row to prevent concurrent claims
2. **Partial unique index** - `idx_mission_progress_active_cooldown` prevents duplicate next instances at database level
3. **ON CONFLICT DO NOTHING** - Race conditions handled gracefully; second concurrent claim silently does nothing
4. **Single transaction** - All operations atomic; if anything fails, nothing commits
5. **cooldown_until set at creation** - New instance knows its own cooldown state
6. **Backwards compatible** - Existing callers continue to work; new fields are optional

**Visibility Guarantee (Why No Gap Exists):**

The `get_available_missions` RPC filters out concluded redemptions (`AND red.status NOT IN ('concluded', 'rejected')`). This might seem like it would hide completed recurring missions, but visibility is guaranteed because:

1. **Atomic creation:** The new instance is created in the SAME TRANSACTION as the claim (redemption status → 'claimed')
2. **Timing:** 'concluded' status happens LATER (user confirms receipt, or auto-conclude job runs)
3. **By the time the old redemption is concluded, the new instance already exists**

Flow:
```
[Claim button clicked] → claim_instant_reward RPC runs:
  ├── UPDATE redemption SET status = 'claimed'
  └── INSERT new mission_progress (cooldown_until = NOW + 7 days)
      ↓
[Hours/days later] → old redemption marked 'concluded'
      ↓
[get_available_missions returns]:
  - Old instance: mission_progress exists, red.* = NULL (concluded filtered)
  - New instance: mission_progress exists with cooldown_until, red.* = NULL (no redemption yet)
```

Both instances appear in the RPC response. The service layer computes status for each.

**Unlimited Missions (cooldown_until = NULL):**

For `redemption_frequency = 'unlimited'`:
- `v_cooldown_days = 0` → `cooldown_until = NULL`
- The partial unique index `WHERE cooldown_until IS NOT NULL` does NOT prevent duplicates
- **This is intentional:** Multiple 0% instances may accumulate for unlimited missions
- User progresses on whichever instance they're actively tracking
- This matches the "no limit" semantics—no deduplication needed

---

### UI Components

**File:** `app/missions/missions-client.tsx`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED

// Recurring badge (upper right of card) - shows on ALL recurring states
{mission.recurringData?.frequency && (
  <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
    {mission.recurringData.frequency === 'weekly' && '📅 Weekly'}
    {mission.recurringData.frequency === 'monthly' && '📅 Monthly'}
    {mission.recurringData.frequency === 'unlimited' && '♾️ Unlimited'}
  </div>
)}

// Rate-limited state card (similar to locked styling)
{status === 'recurring_cooldown' && (
  <div className="bg-slate-50 border-slate-200 opacity-70 p-5 rounded-xl">
    <Clock className="h-8 w-8 text-slate-400" />
    <h3 className="text-lg font-bold text-slate-900 mb-2">{mission.displayName}</h3>
    <p className="text-slate-600 font-medium capitalize">
      {mission.recurringData?.frequency} mission
    </p>
    <p className="text-slate-500 text-sm">
      Available again on {formatDate(mission.recurringData?.cooldownUntil)}
    </p>
  </div>
)}

// Flippable card content for recurring missions
const recurringFlipContent = mission.recurringData?.frequency ? (
  <div className="p-4 text-center">
    <p className="text-slate-700 font-medium">
      This is a {mission.recurringData.frequency} mission
    </p>
    <p className="text-slate-500 text-sm mt-2">
      {mission.recurringData.frequency === 'weekly' &&
        'Complete it once a week to earn rewards!'}
      {mission.recurringData.frequency === 'monthly' &&
        'Complete it once a month to earn rewards!'}
      {mission.recurringData.frequency === 'unlimited' &&
        'Complete it as many times as you want - no waiting!'}
    </p>
  </div>
) : null;
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_recurring_missions.sql` | CREATE | Add column, modify get_available_missions RPC, modify claim_instant_reward RPC |
| `lib/types/rpc.ts` | MODIFY | Add `reward_redemption_frequency`, `progress_cooldown_until` |
| `lib/types/api.ts` | MODIFY | Add `recurring_cooldown` status, add `recurringData` interface |
| `lib/repositories/missionRepository.ts` | MODIFY | Map new RPC fields, update ClaimResult type with optional `newProgressId`/`cooldownDays` |
| `lib/services/missionService.ts` | MODIFY | Add cooldown check (using cooldown_until) to computeStatus(), add recurringData generation |
| `app/missions/missions-client.tsx` | MODIFY | Add recurring badge, cooldown UI, flippable content |
| `API_CONTRACTS.md` | MODIFY | Document new status, recurringData, and cooldown_until field |

---

## 8. Data Flow After Implementation

```
[Active at 0%] → [User makes progress] → [Completes target]
                                              ↓
                                     [Claims reward via atomic RPC]
                                              ↓
                              ┌───────────────┴───────────────┐
                              ↓                               ↓
                    [Unlimited frequency]           [Weekly/Monthly frequency]
                              ↓                               ↓
                    [New instance created]          [New instance created]
                    [cooldown_until = NULL]         [cooldown_until = NOW() + 7/30 days]
                              ↓                               ↓
                    [Immediately active]            [status = recurring_cooldown]
                                                              ↓
                                                   [cooldown_until passes]
                                                              ↓
                                                   [status = in_progress]
```

---

## 9. Database/Schema Requirements

### Tables Modified

| Table | Change | Purpose |
|-------|--------|---------|
| mission_progress | ADD `cooldown_until TIMESTAMP` | Store when this instance becomes active |

### Schema Migration

```sql
-- Add column
ALTER TABLE mission_progress ADD COLUMN cooldown_until TIMESTAMP;

-- Add index for queries
CREATE INDEX idx_mission_progress_cooldown_until
ON mission_progress(cooldown_until)
WHERE cooldown_until IS NOT NULL;
```

### Backfill Behavior (Important)

**Existing rows:** `cooldown_until = NULL` → **immediately active**

This is intentional and acceptable because:
- No production users exist yet
- NULL means "no cooldown restriction"
- Pre-existing recurring missions will behave as active (not rate-limited)
- Only NEW claims after migration will create instances with cooldown_until set

**No action required** - this is the desired behavior for pre-prod.

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| get_available_missions RPC | Yes - p_client_id | [x] |
| claim_recurring_mission_reward RPC | Yes - p_client_id | [x] |
| New instance INSERT | Yes - client_id column | [x] |

---

## 10. API Contract Changes

### Response Shape Change

**File:** `API_CONTRACTS.md` - Add to MissionStatus
```markdown
### MissionStatus (17 values)
- ... existing 16 values ...
- `recurring_cooldown` - Recurring mission in rate-limit period, waiting for cooldown to expire
```

**File:** `API_CONTRACTS.md` - Add to MissionItem
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

### Breaking Changes?
- [x] No - additive changes only (new status, new optional field, new column)

### Deploy Order (Migration/Contract Sequencing)

**⚠️ CRITICAL:** Deploy in this exact order to avoid type mismatches and runtime errors:

| Step | What | Why First |
|------|------|-----------|
| 1 | **Supabase migration** | RPC must return new columns before TS expects them |
| 2 | **TypeScript types** (rpc.ts, api.ts) | Types must match RPC before service uses them |
| 3 | **Repository + Service** | Can now safely access new fields |
| 4 | **UI components** | Can now safely render recurring data |

**What breaks if order is wrong:**
- If types deploy before migration: Runtime error—TS expects columns RPC doesn't return
- If service deploys before types: Compile error—code references undefined types
- If UI deploys before service: Compile error—`recurringData` undefined on MissionItem

**Safe rollout strategy:**
1. Deploy migration to Supabase (no app deploy yet)
2. Verify RPC returns new columns: `SELECT reward_redemption_frequency, progress_cooldown_until FROM get_available_missions(...)`
3. Deploy full app (types → service → UI all at once, since they're in same bundle)

**Backwards compatibility:** RPC changes are additive—new columns return NULL for rows without data. Existing callers (before app deploy) continue to work.

---

## 11. Performance Considerations

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| New column (cooldown_until) | 8 bytes per row | Yes |
| Additional RPC columns | 2 columns per mission | Yes |
| Cooldown calculation | O(1) date comparison | Yes |
| New instance creation | 1 INSERT per claim | Yes |
| Index on cooldown_until | Filtered index, low overhead | Yes |

---

## 12. Implementation Options (Audit Response)

### Selected: Option B with cooldown_until Column

After audit review, Option B (create at claim time) is selected with the following fixes:

**Fix 1: Durable Cooldown State**
- Add `cooldown_until` column to mission_progress
- New instances store their own cooldown expiry timestamp
- `computeStatus()` checks `progress.cooldownUntil`, NOT `redemption.claimedAt`
- No need to look up previous instance's data

**Fix 2: Transaction Safety**
- New RPC `claim_recurring_mission_reward` wraps everything in single transaction
- `FOR UPDATE` locks prevent concurrent claims
- All-or-nothing: if claim fails, no new instance is created

**Fix 3: Duplicate Prevention**
- `NOT EXISTS` check before creating new instance
- Guards against double-creation from concurrent requests
- Idempotent: second call to claim same mission is safely rejected

**Fix 4: Schema/API Alignment**
- Full RPC signature with all 49 columns specified
- Type updates for rpc.ts and api.ts documented
- API_CONTRACTS.md updates specified

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Two cards confusing to user | Low | Low | Clear UI differentiation |
| Concurrent claim race condition | Low | Low | FOR UPDATE + NOT EXISTS guard |
| RPC migration fails | Low | High | Test in staging, backup before deploy |
| Existing claims affected | None | None | Backfill is NULL (no cooldown) |

---

## 14. Testing Strategy

### Manual Verification Steps

**Happy Path:**
1. [ ] Create weekly mission with test reward
2. [ ] Complete mission, claim reward
3. [ ] Verify recurring badge appears on BOTH old and new cards
4. [ ] Verify old card shows processing state
5. [ ] Verify new card shows rate-limited state "Available again on {date}"
6. [ ] Fast-forward cooldown_until by updating via SQL
7. [ ] Refresh page
8. [ ] Verify new mission shows as active at 0%

**Transaction Safety:**
1. [ ] Attempt to claim same mission twice rapidly
2. [ ] Verify only one new instance created
3. [ ] Verify no orphan instances if claim fails

**Unlimited:**
1. [ ] Create unlimited mission
2. [ ] Complete and claim
3. [ ] Verify new mission immediately active at 0% (cooldown_until = NULL)

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Backup database before migration

### Implementation Steps

- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/YYYYMMDD_recurring_missions.sql`
  - Action: Add cooldown_until column, modify get_available_missions RPC, modify claim_instant_reward RPC

- [ ] **Step 2:** Update RPC types
  - File: `lib/types/rpc.ts`
  - Action: Add reward_redemption_frequency, progress_cooldown_until

- [ ] **Step 3:** Update API types
  - File: `lib/types/api.ts`
  - Action: Add recurring_cooldown status, add recurringData interface

- [ ] **Step 4:** Update repository mapping
  - File: `lib/repositories/missionRepository.ts`
  - Action: Map new RPC fields to AvailableMissionData, update ClaimResult type with newProgressId/cooldownDays

- [ ] **Step 5:** Update service layer
  - File: `lib/services/missionService.ts`
  - Action: Add computeStatus() logic using cooldown_until, add recurringData generation

- [ ] **Step 6:** Update UI
  - File: `app/missions/missions-client.tsx`
  - Action: Add badge, cooldown UI, flippable content

- [ ] **Step 7:** Update API contracts
  - File: `API_CONTRACTS.md`
  - Action: Document new status, recurringData, and schema change

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per checklist
- [ ] Deploy migration to Supabase

---

## 16. Definition of Done

- [ ] Migration deployed and verified in Supabase
- [ ] All new code created per "Proposed Solution" section
- [ ] Transaction safety verified (no orphan instances)
- [ ] Duplicate prevention verified (concurrent claims handled)
- [ ] Type checker passes
- [ ] All tests pass
- [ ] Build completes
- [ ] Manual verification completed
- [ ] API_CONTRACTS.md updated
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | rewards table, mission_progress table | Schema reference |
| rpc.ts | GetAvailableMissionsRow | Current RPC types |
| baseline.sql | get_available_missions lines 477-514 | RPC to modify |
| missionService.ts | computeStatus() | Status logic to modify |
| missionRepository.ts | listAvailable() | Repository to modify |
| missions-client.tsx | Card rendering | UI to modify |
| FlippableCard.tsx | Existing component | Reuse for info display |

---

**Document Version:** 5.2
**Last Updated:** 2025-12-26
**Author:** Claude Code
**Status:** Approved - Ready for Implementation
**Audit:** Approved with clarifications:
- v5.1: Added partial unique index + ON CONFLICT for race condition safety
- v5.2: Added visibility guarantee explanation, unlimited behavior documentation, enhanced deploy sequencing

---

## LLM Implementation Note

This document uses the **Rate Limit Model** with **durable cooldown state**:

1. **cooldown_until column** - New instances store their own cooldown expiry
2. **No lookup needed** - computeStatus() checks progress.cooldownUntil directly
3. **Modify existing RPC** - claim_instant_reward is extended (NOT a new RPC)
4. **Backwards compatible** - ClaimResult adds optional fields; existing callers unaffected
5. **Truly idempotent** - Partial unique index + ON CONFLICT handles race conditions at database level

**Key insight:** The new instance doesn't need to know when the *previous* instance was claimed. It only needs to know when *it* becomes active (cooldown_until).

**Integration insight:** We modify the existing `claim_instant_reward` RPC to add recurring support. This preserves the fast path and requires no service-layer branching.

**Race condition fix:** The partial unique index `idx_mission_progress_active_cooldown` on (mission_id, user_id, client_id) WHERE cooldown_until IS NOT NULL ensures only one "next instance" can exist. ON CONFLICT DO NOTHING makes concurrent claims idempotent.
