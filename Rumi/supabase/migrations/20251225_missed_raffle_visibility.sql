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

-- Must DROP first because we're adding a new column (is_missed) to return type
DROP FUNCTION IF EXISTS "public"."get_mission_history"("uuid", "uuid");

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
  -- Wrap UNION in subquery so we can use COALESCE in ORDER BY
  SELECT * FROM (
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
  ) AS combined
  ORDER BY COALESCE(concluded_at, rejected_at, raffle_winner_selected_at) DESC;
$$;

ALTER FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";

-- =============================================
-- END OF MIGRATION
-- =============================================
