-- Patch: Fix recurring mission checkpoint_start conflict
-- BUG-RECURRING-CHECKPOINT-001
--
-- Root Cause: All three recurring RPCs used u.tier_achieved_at for checkpoint_start,
-- which conflicts with the unique constraint (user_id, mission_id, checkpoint_start).
--
-- Fix: Use v_now for checkpoint_start (unique timestamp), NULL for checkpoint_end,
-- and add multi-tenant guard m.client_id = p_client_id.

-- ============================================================================
-- PART 1: Fix claim_instant_reward
-- ============================================================================

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

  -- If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- FIX: Use v_now for checkpoint_start, NULL for checkpoint_end
    -- Multi-tenant guard: m.client_id = p_client_id
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
      v_now,  -- checkpoint_start: unique timestamp
      NULL,   -- checkpoint_end: NULL for recurring
      v_now,
      v_now
    FROM missions m
    WHERE m.id = v_mission_id
      AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
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

-- ============================================================================
-- PART 2: Fix claim_commission_boost
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

  -- Existing boost logic: Insert commission_boost_redemptions (with client_id)
  INSERT INTO commission_boost_redemptions (
    redemption_id, client_id, boost_status, scheduled_activation_date,
    duration_days, boost_rate, created_at, updated_at
  ) VALUES (
    p_redemption_id, p_client_id, 'scheduled', p_scheduled_date,
    p_duration_days, p_boost_rate, v_now, v_now
  );

  -- If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- FIX: Use v_now for checkpoint_start, NULL for checkpoint_end
    -- Multi-tenant guard: m.client_id = p_client_id
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
      v_now,  -- checkpoint_start: unique timestamp
      NULL,   -- checkpoint_end: NULL for recurring
      v_now,
      v_now
    FROM missions m
    WHERE m.id = v_mission_id
      AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
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
-- PART 3: Fix claim_discount
-- ============================================================================

DROP FUNCTION IF EXISTS claim_discount(UUID, UUID, DATE, TIME);

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

  -- If recurring, create next instance with cooldown
  IF v_redemption_frequency IN ('weekly', 'monthly', 'unlimited') THEN
    v_cooldown_days := CASE v_redemption_frequency
      WHEN 'weekly' THEN 7
      WHEN 'monthly' THEN 30
      WHEN 'unlimited' THEN 0
      ELSE 0
    END;

    -- FIX: Use v_now for checkpoint_start, NULL for checkpoint_end
    -- Multi-tenant guard: m.client_id = p_client_id
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
      v_now,  -- checkpoint_start: unique timestamp
      NULL,   -- checkpoint_end: NULL for recurring
      v_now,
      v_now
    FROM missions m
    WHERE m.id = v_mission_id
      AND m.client_id = p_client_id  -- MULTI-TENANT GUARD
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
