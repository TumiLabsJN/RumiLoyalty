-- Migration: Add atomic claim RPC for instant rewards and raffle winner claims
-- Enhancement ID: ENH-001
-- Covers: gift_card, spark_ads, experience, and raffle winner claims (all use empty POST body)
-- Purpose: Single DB call replaces 10+ sequential queries for these claim types
-- Date: 2025-12-21
-- SYNC: Must match missionService.claimMissionReward() validation logic

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
BEGIN
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly (no separate auth_id column)
  -- Pattern from 20251218100002_fix_rpc_auth_column.sql
  SELECT id, current_tier INTO v_user_id, v_user_tier
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Single query: Get redemption + validate in one shot
  SELECT
    r.id,
    r.status,
    rw.type,
    mp.status,
    m.tier_eligibility
  INTO
    v_redemption_id,
    v_redemption_status,
    v_reward_type,
    v_mission_status,
    v_tier_eligibility
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
  JOIN rewards rw ON r.reward_id = rw.id
  WHERE r.mission_progress_id = p_mission_progress_id
    AND r.user_id = v_user_id
    AND r.client_id = p_client_id
    AND r.deleted_at IS NULL;

  -- Validation checks (matches missionService.claimMissionReward validation)
  IF v_redemption_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  IF v_mission_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed yet');
  END IF;

  IF v_redemption_status != 'claimable' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reward already claimed or not available',
      'redemption_id', v_redemption_id
    );
  END IF;

  IF v_tier_eligibility != 'all' AND v_tier_eligibility != v_user_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are no longer eligible for this reward');
  END IF;

  -- Only allow instant reward types (works for both regular missions and raffle winners)
  -- Raffle winners with gift_card/spark_ads/experience prizes use same empty-body claim
  IF v_reward_type NOT IN ('gift_card', 'spark_ads', 'experience') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This reward type requires additional information',
      'reward_type', v_reward_type
    );
  END IF;

  -- Atomic update
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = v_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id
    AND status = 'claimable';  -- Re-check for race condition

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim failed - status may have changed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'new_status', 'claimed',
    'message', 'Reward claimed successfully!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_instant_reward FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_instant_reward TO authenticated;
