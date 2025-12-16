-- =============================================
-- Raffle Participation RLS Fix
-- Created: 2025-12-16
-- Reference: BUG-RAFFLE-RLS-001
-- =============================================
--
-- Problem: Creators cannot INSERT into mission_progress (no INSERT policy)
-- Solution: SECURITY DEFINER function to handle raffle participation atomically
-- =============================================

-- =============================================
-- SECTION 1: SECURITY DEFINER FUNCTION
-- =============================================

-- Create raffle participation (mission_progress + redemption + raffle_participation)
-- This function handles the entire raffle participation flow atomically
--
-- ⚠️ SECURITY WARNING: This function bypasses RLS via SECURITY DEFINER.
-- Defense-in-depth checks are enforced INSIDE this function.
-- Upstream callers (repository) should ALSO validate these conditions.
--
CREATE OR REPLACE FUNCTION raffle_create_participation(
  p_mission_id UUID,
  p_user_id UUID,
  p_client_id UUID,
  p_reward_id UUID,
  p_tier_at_claim VARCHAR  -- Required for redemptions.tier_at_claim (NOT NULL)
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
  -- DEFENSE-IN-DEPTH CHECKS (per security audit)
  -- These checks reduce blast radius if RPC is ever called incorrectly
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
      AND reward_id = p_reward_id  -- Verify reward matches what caller provided
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

  -- Check 4: Verify reward_id is provided (fail fast with clear message)
  IF p_reward_id IS NULL THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'Mission has no associated reward'::TEXT AS error_message;
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
    -- Update existing to completed if not already
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
  -- Return error
  RETURN QUERY SELECT
    false AS success,
    NULL::UUID AS participation_id,
    NULL::UUID AS redemption_id,
    NULL::UUID AS progress_id,
    SQLERRM AS error_message;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- SECTION 2: GRANT/REVOKE ACCESS CONTROL
-- =============================================

-- Revoke from public (security baseline)
REVOKE ALL ON FUNCTION raffle_create_participation(UUID, UUID, UUID, UUID, VARCHAR) FROM PUBLIC;

-- Grant to authenticated users (creators)
GRANT EXECUTE ON FUNCTION raffle_create_participation(UUID, UUID, UUID, UUID, VARCHAR) TO authenticated;

-- =============================================
-- END OF MIGRATION
-- =============================================
