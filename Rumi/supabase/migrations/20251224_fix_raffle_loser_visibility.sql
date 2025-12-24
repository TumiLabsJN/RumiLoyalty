-- BUG-RAFFLE-002: Fix raffle loser visibility
-- Losers should not see raffle on active missions page
-- Created: 2025-12-24

-- Update get_available_missions RPC to exclude raffle losers
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
  -- FIX: Exclude raffle losers (is_winner = FALSE) from JOIN
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
    -- FIX: Exclude raffle missions where user lost (includes client_id for multi-tenant safety)
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_check
      WHERE rp_check.mission_id = m.id
        AND rp_check.user_id = p_user_id
        AND rp_check.client_id = p_client_id
        AND rp_check.is_winner = FALSE
    )
  ORDER BY m.display_order ASC;
$$;

-- Grant permissions (same as original)
ALTER FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) OWNER TO "postgres";
