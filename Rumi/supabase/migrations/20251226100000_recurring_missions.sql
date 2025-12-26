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
