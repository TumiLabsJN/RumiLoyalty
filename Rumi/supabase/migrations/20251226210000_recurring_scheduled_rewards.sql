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
    redemption_id, client_id, boost_status, scheduled_activation_date,
    duration_days, boost_rate, created_at, updated_at
  ) VALUES (
    p_redemption_id, p_client_id, 'scheduled', p_scheduled_date,
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
