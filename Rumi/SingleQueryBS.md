# Single Query vs Multi-Query Analysis

**Document Purpose:** Technical debt analysis for LLM continuation sessions
**Created:** 2025-12-03
**Context:** During Phase 6 (Rewards APIs) implementation, we discovered a divergence between specification and implementation regarding database query patterns.

---

## 1. The Specification vs Implementation Conflict

### What API_CONTRACTS.md Specifies

**GET /api/rewards (lines 4733-4804):**
> "MUST execute **single optimized query** with **LEFT JOINs** to: redemptions, commission_boost_redemptions, physical_gift_redemptions, tiers"

**GET /api/missions (lines 3304-3400):**
> Similar single query pattern specified for missions with LEFT JOINs to mission_progress, redemptions, sub-state tables

### What Was Actually Implemented

**Both `missionRepository.listAvailable()` and `rewardRepository.listAvailable()` use 5 separate queries:**

```typescript
// Pattern used in both repositories:
Query 1: Main table (rewards/missions)
Query 2: Tiers
Query 3: Redemptions
Query 4: Commission boost sub-states
Query 5: Physical gift sub-states (or raffle participations for missions)
// Then: JavaScript Map joins to combine results
```

**Files affected:**
- `appcode/lib/repositories/missionRepository.ts` - `listAvailable()` function (lines 484-739)
- `appcode/lib/repositories/rewardRepository.ts` - `listAvailable()` function (lines 103-290)

---

## 2. Why This Divergence Occurred

### Supabase/PostgREST Technical Limitations

Per [Supabase Docs](https://supabase.com/docs/guides/database/joins-and-nesting) and [GitHub discussions](https://github.com/orgs/supabase/discussions/21167):

**What Supabase JS Client CAN do:**
- Nested selects following foreign key relationships (parent → child)
- `!inner` for INNER JOINs
- `!left` for LEFT JOINs (PostgREST 11+)
- Simple many-to-many through join tables

**What Supabase JS Client CANNOT do:**
- Complex LEFT JOINs with filters across unrelated table branches
- `.or()` filters spanning multiple joined tables
- Joins requiring multiple filter conditions on the joined table

**Our specific blocker:**
```sql
-- We need this:
LEFT JOIN redemptions ON rewards.id = redemptions.reward_id
  AND redemptions.user_id = $userId
  AND redemptions.mission_progress_id IS NULL
  AND redemptions.status NOT IN ('concluded', 'rejected')
  AND redemptions.deleted_at IS NULL
```

The Supabase JS client cannot express this complex filtered LEFT JOIN natively. The nested select syntax doesn't support multi-condition filters on the joined table.

### Key Clarification: Single Query IS Achievable with Supabase

**Important:** The limitation is with the **Supabase JS client query builder**, NOT the database.

| Component | Single Query Support |
|-----------|---------------------|
| Supabase Database (PostgreSQL) | **YES** - Full SQL support |
| Supabase `.rpc()` method | **YES** - Call any PostgreSQL function |
| Supabase JS `.from().select()` | **NO** - Cannot express complex filtered JOINs |

**Solution path:** Write a PostgreSQL function, call it via `supabase.rpc('function_name', params)`. This gives single-query performance while staying 100% within Supabase. No database provider change needed.

---

## 3. Performance Impact Analysis

### Single Request Comparison

| Approach | DB Round-trips | Estimated Latency |
|----------|---------------|-------------------|
| Multi-Query (current) | 5 | 60-120ms |
| Single Query (specified) | 1 | 20-40ms |

**Difference:** ~3x slower response time per request

### Scale Impact (Total Users Across ALL Clients)

| Total Users | Daily Page Loads | Multi-Query DB Calls | Single Query DB Calls |
|-------------|-----------------|---------------------|----------------------|
| 5,000 | 10,000 | 50,000 | 10,000 |
| 25,000 | 50,000 | 250,000 | 50,000 |
| 50,000 | 100,000 | **500,000** | 100,000 |
| 100,000 | 200,000 | **1,000,000** | 200,000 |

**Critical threshold:** ~50,000 total users across all clients
- Connection pool exhaustion risk
- Meaningful Supabase cost increase
- Cumulative latency affects UX

**Note:** This is total users across ALL clients (multi-tenant), not per-client, because all clients share the same Supabase database instance.

---

## 4. Implementation: Database Functions (RPC)

### 4.1 get_available_rewards Function

Create a PostgreSQL function callable via `supabase.rpc()`:

```sql
-- Migration: supabase/migrations/YYYYMMDD_get_available_rewards.sql
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
  ORDER BY r.display_order ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_rewards(UUID, UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rewards(UUID, UUID, VARCHAR, INTEGER) TO service_role;
```

---

### 4.2 get_available_missions Function

```sql
-- Migration: supabase/migrations/YYYYMMDD_get_available_missions.sql
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
  ORDER BY m.display_order ASC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_missions(UUID, UUID, VARCHAR) TO service_role;
```

---

### 4.3 Security Note: SECURITY DEFINER

The functions use `SECURITY DEFINER` which means they run with the **permissions of the function owner** (typically postgres), not the calling user. This is necessary because:
- The anon/authenticated Supabase roles may not have direct SELECT on all joined tables
- RLS policies are bypassed inside the function

**Important:** The functions enforce security via the `p_client_id` and `p_user_id` parameters. Always pass these from the authenticated session, never from user input.

---

### 4.4 Local Testing

Before deploying, test the functions in Supabase SQL Editor:

```sql
-- Test get_available_rewards with real IDs from your seed data
SELECT * FROM get_available_rewards(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- user_id
  '123e4567-e89b-12d3-a456-426614174001'::UUID,  -- client_id
  'tier_1',                                        -- current_tier
  1                                                -- current_tier_order
);

-- Test get_available_missions
SELECT * FROM get_available_missions(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- user_id
  '123e4567-e89b-12d3-a456-426614174001'::UUID,  -- client_id
  'tier_1'                                         -- current_tier
);

-- Expected: Rows with all columns populated
-- NULL values in redemption/boost/physical_gift/raffle columns are expected for unclaimed items
```

---

## 5. Refactoring Checklist (When Switching to Single Query)

### Step 1: Create Database Migration for Rewards

**File:** `supabase/migrations/YYYYMMDD_get_available_rewards_rpc.sql`

**Actions:**
- [ ] Copy the `get_available_rewards` function from Option B above
- [ ] Verify all column types match SchemaFinalv2.md
- [ ] Test function locally: `SELECT * FROM get_available_rewards('user-uuid', 'client-uuid', 'tier_1', 1);`
- [ ] Deploy: `supabase db push` or via Supabase dashboard

**Estimated time:** 2-3 hours

---

### Step 2: Create Database Migration for Missions

**File:** `supabase/migrations/YYYYMMDD_get_available_missions_rpc.sql`

**Actions:**
- [ ] Write equivalent `get_available_missions` function with JOINs to:
  - `missions` (main table)
  - `tiers` (tier info)
  - `mission_progress` (user progress)
  - `redemptions` (claim status)
  - `commission_boost_redemptions` (boost sub-state)
  - `physical_gift_redemptions` (gift sub-state)
  - `raffle_participations` (raffle sub-state)
- [ ] Test function locally
- [ ] Deploy migration

**Estimated time:** 3-4 hours

---

### Step 3: Refactor rewardRepository.listAvailable()

**File:** `appcode/lib/repositories/rewardRepository.ts`

**Current implementation (lines 103-290):** 5 separate queries + JS Map joins

**New implementation (complete):**
```typescript
async listAvailable(
  userId: string,
  clientId: string,
  currentTier: string,
  currentTierOrder: number
): Promise<AvailableRewardData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_available_rewards', {
    p_user_id: userId,
    p_client_id: clientId,
    p_current_tier: currentTier,
    p_current_tier_order: currentTierOrder
  });

  if (error) {
    console.error('Error fetching rewards:', error);
    throw new Error('Failed to fetch rewards');
  }

  // Transform flat rows to AvailableRewardData structure
  return (data || []).map((row: GetAvailableRewardsRow) => ({
    reward: {
      id: row.reward_id,
      type: row.reward_type,
      name: row.reward_name,
      description: row.reward_description,
      valueData: row.reward_value_data as Record<string, unknown> | null,
      tierEligibility: row.reward_tier_eligibility,
      previewFromTier: row.reward_preview_from_tier,
      redemptionFrequency: row.reward_redemption_frequency ?? 'unlimited',
      redemptionQuantity: row.reward_redemption_quantity,
      redemptionType: row.reward_redemption_type ?? 'instant',
      rewardSource: row.reward_source ?? 'mission',
      displayOrder: row.reward_display_order,
      enabled: row.reward_enabled ?? false,
      expiresDays: row.reward_expires_days,
    },
    tier: {
      id: row.tier_id,
      name: row.tier_name,
      color: row.tier_color,
      order: row.tier_order,
    },
    redemption: row.redemption_id ? {
      id: row.redemption_id,
      status: row.redemption_status ?? 'claimable',
      claimedAt: row.redemption_claimed_at,
      scheduledActivationDate: row.redemption_scheduled_activation_date,
      scheduledActivationTime: row.redemption_scheduled_activation_time,
      activationDate: row.redemption_activation_date,
      expirationDate: row.redemption_expiration_date,
      fulfilledAt: row.redemption_fulfilled_at,
    } : null,
    commissionBoost: row.boost_status ? {
      boostStatus: row.boost_status,
      scheduledActivationDate: row.boost_scheduled_activation_date,
      activatedAt: row.boost_activated_at,
      expiresAt: row.boost_expires_at,
      durationDays: row.boost_duration_days,
      boostRate: row.boost_rate ? Number(row.boost_rate) : null,
      salesAtExpiration: row.boost_sales_at_expiration ? Number(row.boost_sales_at_expiration) : null,
    } : null,
    physicalGift: (row.physical_gift_requires_size !== null || row.physical_gift_shipping_city) ? {
      requiresSize: row.physical_gift_requires_size,
      sizeValue: row.physical_gift_size_value,
      shippingCity: row.physical_gift_shipping_city,
      shippedAt: row.physical_gift_shipped_at,
    } : null,
  }));
}
```

**Actions:**
- [ ] Replace 5-query implementation with single `.rpc()` call
- [ ] Update return type mapping (flat row → nested object)
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`
- [ ] Run existing tests to verify same behavior

**Estimated time:** 1-2 hours

---

### Step 4: Refactor missionRepository.listAvailable()

**File:** `appcode/lib/repositories/missionRepository.ts`

**Current implementation (lines 484-739):** 5 separate queries + JS Map joins

**New implementation (complete):**
```typescript
async listAvailable(
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<AvailableMissionData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_available_missions', {
    p_user_id: userId,
    p_client_id: clientId,
    p_current_tier: currentTierId
  });

  if (error) {
    console.error('[MissionRepository] Error fetching missions:', error);
    return [];
  }

  // Transform flat rows to AvailableMissionData structure
  return (data || []).map((row: GetAvailableMissionsRow) => {
    // Determine if this is a locked mission (from higher tier)
    const isLocked = row.mission_tier_eligibility !== currentTierId &&
      row.mission_tier_eligibility !== 'all' &&
      row.mission_preview_from_tier === currentTierId;

    return {
      mission: {
        id: row.mission_id,
        type: row.mission_type,
        displayName: row.mission_display_name,
        title: row.mission_title,
        description: row.mission_description,
        targetValue: row.mission_target_value,
        targetUnit: row.mission_target_unit,
        raffleEndDate: row.mission_raffle_end_date,
        activated: row.mission_activated ?? false,
        tierEligibility: row.mission_tier_eligibility,
        previewFromTier: row.mission_preview_from_tier,
        enabled: row.mission_enabled ?? true,
      },
      reward: {
        id: row.reward_id,
        type: row.reward_type,
        name: row.reward_name,
        description: row.reward_description,
        valueData: row.reward_value_data as Record<string, unknown> | null,
        redemptionType: row.reward_redemption_type ?? 'instant',
        rewardSource: row.reward_source ?? 'mission',
      },
      tier: {
        id: row.tier_id,
        name: row.tier_name,
        color: row.tier_color,
        order: row.tier_order,
      },
      progress: row.progress_id ? {
        id: row.progress_id,
        currentValue: row.progress_current_value ?? 0,
        status: row.progress_status ?? 'active',
        completedAt: row.progress_completed_at,
        checkpointStart: row.progress_checkpoint_start,
        checkpointEnd: row.progress_checkpoint_end,
      } : null,
      redemption: row.redemption_id ? {
        id: row.redemption_id,
        status: row.redemption_status ?? 'claimable',
        claimedAt: row.redemption_claimed_at,
        fulfilledAt: row.redemption_fulfilled_at,
        concludedAt: row.redemption_concluded_at,
        rejectedAt: row.redemption_rejected_at,
        scheduledActivationDate: row.redemption_scheduled_activation_date,
        scheduledActivationTime: row.redemption_scheduled_activation_time,
        activationDate: row.redemption_activation_date,
        expirationDate: row.redemption_expiration_date,
      } : null,
      commissionBoost: row.boost_status ? {
        boostStatus: row.boost_status,
        scheduledActivationDate: row.boost_scheduled_activation_date,
        activatedAt: row.boost_activated_at,
        expiresAt: row.boost_expires_at,
        durationDays: row.boost_duration_days,
      } : null,
      physicalGift: (row.physical_gift_requires_size !== null || row.physical_gift_shipping_city) ? {
        shippedAt: row.physical_gift_shipped_at,
        shippingCity: row.physical_gift_shipping_city,
        requiresSize: row.physical_gift_requires_size,
      } : null,
      raffleParticipation: row.raffle_participated_at ? {
        isWinner: row.raffle_is_winner,
        participatedAt: row.raffle_participated_at,
        winnerSelectedAt: row.raffle_winner_selected_at,
      } : null,
      isLocked,
    };
  });
}
```

**Actions:**
- [ ] Replace with single `.rpc('get_available_missions', params)` call
- [ ] Update return type mapping
- [ ] Verify TypeScript compiles
- [ ] Run existing tests

**Estimated time:** 1-2 hours

---

### Step 5: Add TypeScript Types for RPC Functions

**File:** `appcode/lib/types/rpc.ts` (new file)

```typescript
/**
 * RPC Function Return Types
 *
 * These types match the RETURNS TABLE definitions in our PostgreSQL functions.
 * See SingleQueryBS.md Section 4 for the SQL function definitions.
 */

/**
 * Return type for get_available_rewards RPC function
 * Maps to Section 4.1 RETURNS TABLE
 */
export interface GetAvailableRewardsRow {
  // Reward columns
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_tier_eligibility: string;
  reward_preview_from_tier: string | null;
  reward_redemption_frequency: string | null;
  reward_redemption_quantity: number | null;
  reward_redemption_type: string | null;
  reward_source: string | null;
  reward_display_order: number | null;
  reward_enabled: boolean | null;
  reward_expires_days: number | null;
  // Tier columns
  tier_id: string;
  tier_name: string;
  tier_color: string;
  tier_order: number;
  // Redemption columns
  redemption_id: string | null;
  redemption_status: string | null;
  redemption_claimed_at: string | null;
  redemption_scheduled_activation_date: string | null;
  redemption_scheduled_activation_time: string | null;
  redemption_activation_date: string | null;
  redemption_expiration_date: string | null;
  redemption_fulfilled_at: string | null;
  // Commission boost columns
  boost_status: string | null;
  boost_scheduled_activation_date: string | null;
  boost_activated_at: string | null;
  boost_expires_at: string | null;
  boost_duration_days: number | null;
  boost_rate: number | null;
  boost_sales_at_expiration: number | null;
  // Physical gift columns
  physical_gift_requires_size: boolean | null;
  physical_gift_size_value: string | null;
  physical_gift_shipping_city: string | null;
  physical_gift_shipped_at: string | null;
}

/**
 * Return type for get_available_missions RPC function
 * Maps to Section 4.2 RETURNS TABLE
 */
export interface GetAvailableMissionsRow {
  // Mission columns
  mission_id: string;
  mission_type: string;
  mission_display_name: string;
  mission_title: string;
  mission_description: string | null;
  mission_target_value: number;
  mission_target_unit: string;
  mission_raffle_end_date: string | null;
  mission_activated: boolean | null;
  mission_tier_eligibility: string;
  mission_preview_from_tier: string | null;
  mission_enabled: boolean | null;
  mission_display_order: number;
  mission_reward_id: string;
  // Reward columns
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_redemption_type: string | null;
  reward_source: string | null;
  // Tier columns
  tier_id: string;
  tier_name: string;
  tier_color: string;
  tier_order: number;
  // Mission progress columns
  progress_id: string | null;
  progress_current_value: number | null;
  progress_status: string | null;
  progress_completed_at: string | null;
  progress_checkpoint_start: string | null;
  progress_checkpoint_end: string | null;
  // Redemption columns
  redemption_id: string | null;
  redemption_status: string | null;
  redemption_claimed_at: string | null;
  redemption_fulfilled_at: string | null;
  redemption_concluded_at: string | null;
  redemption_rejected_at: string | null;
  redemption_scheduled_activation_date: string | null;
  redemption_scheduled_activation_time: string | null;
  redemption_activation_date: string | null;
  redemption_expiration_date: string | null;
  // Commission boost columns
  boost_status: string | null;
  boost_scheduled_activation_date: string | null;
  boost_activated_at: string | null;
  boost_expires_at: string | null;
  boost_duration_days: number | null;
  // Physical gift columns
  physical_gift_shipped_at: string | null;
  physical_gift_shipping_city: string | null;
  physical_gift_requires_size: boolean | null;
  // Raffle participation columns
  raffle_is_winner: boolean | null;
  raffle_participated_at: string | null;
  raffle_winner_selected_at: string | null;
}
```

**Actions:**
- [ ] Create `appcode/lib/types/rpc.ts` with above types
- [ ] Import types in repository files
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`

**Estimated time:** 30 min - 1 hour

---

### Step 6: Testing & Verification

**Actions:**
- [ ] Run all reward-related tests: `npm test -- --testPathPattern=reward`
- [ ] Run all mission-related tests: `npm test -- --testPathPattern=mission`
- [ ] Manual test: Load Rewards page, verify same data displayed
- [ ] Manual test: Load Missions page, verify same data displayed
- [ ] Performance check: Compare response times before/after

**Estimated time:** 2-3 hours

---

### Summary

| Step | File(s) | Time |
|------|---------|------|
| 1. Rewards RPC migration | `migrations/..._rewards_rpc.sql` | 2-3 hrs |
| 2. Missions RPC migration | `migrations/..._missions_rpc.sql` | 3-4 hrs |
| 3. Refactor rewardRepository | `rewardRepository.ts` | 1-2 hrs |
| 4. Refactor missionRepository | `missionRepository.ts` | 1-2 hrs |
| 5. Update TypeScript types | `database.ts` or `rpc.ts` | 0.5-1 hr |
| 6. Testing | - | 2-3 hrs |
| **Total** | | **10-15 hours (1.5-2 days)** |

**No changes required to:**
- Service layer (same return types)
- API routes
- Frontend

---



---

## 6. Files to Update When Refactoring

When the decision is made to refactor:

1. **New migration file:** `supabase/migrations/YYYYMMDD_reward_mission_views.sql`
2. **Update:** `appcode/lib/repositories/rewardRepository.ts` - `listAvailable()`
3. **Update:** `appcode/lib/repositories/missionRepository.ts` - `listAvailable()`
4. **Update:** `appcode/lib/types/database.ts` - regenerate types if using views
5. **Update:** This document with completion status

---


**Document maintained by:** LLM development sessions
**Last updated:** 2025-12-03
