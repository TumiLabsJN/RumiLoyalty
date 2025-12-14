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
