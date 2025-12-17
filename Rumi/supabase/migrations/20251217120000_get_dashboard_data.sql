-- Migration: Create get_dashboard_data RPC function
-- Purpose: Single-query dashboard data retrieval for ~70% latency reduction
-- Version: 1.0
-- Date: 2025-12-17
-- Reference: DashboardRPCEnhancement.md v1.7

CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY: Prevent search_path injection
AS $$
DECLARE
  v_result JSON;
  v_user_data RECORD;
  v_current_tier RECORD;
  v_next_tier RECORD;
  v_featured_mission RECORD;
  v_recent_fulfillment RECORD;
  v_rewards JSON;
  v_rewards_count INTEGER;
BEGIN
  -- 1. Get user with client data
  SELECT
    u.id,
    u.tiktok_handle,
    u.email,
    u.current_tier,
    u.checkpoint_sales_current,
    u.checkpoint_units_current,
    u.manual_adjustments_total,
    u.manual_adjustments_units,
    u.next_checkpoint_at,
    u.last_login_at,
    c.id AS client_id,
    c.name AS client_name,
    c.vip_metric,
    c.checkpoint_months
  INTO v_user_data
  FROM users u
  INNER JOIN clients c ON u.client_id = c.id
  WHERE u.id = p_user_id
    AND u.client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  IF v_user_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Get current tier
  SELECT
    tier_id, tier_name, tier_color, tier_order, checkpoint_exempt,
    sales_threshold, units_threshold
  INTO v_current_tier
  FROM tiers
  WHERE tier_id = v_user_data.current_tier
    AND client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  -- Guard: If current tier not found, return NULL (prevents exception on v_current_tier.tier_order)
  IF v_current_tier IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Get next tier (tier_order + 1)
  SELECT
    id, tier_id, tier_name, tier_color, tier_order,
    sales_threshold, units_threshold
  INTO v_next_tier
  FROM tiers
  WHERE client_id = p_client_id
    AND tier_order = v_current_tier.tier_order + 1;

  -- 4. Get featured mission (highest priority, not claimed)
  SELECT
    m.id AS mission_id,
    m.mission_type,
    m.display_name,
    m.title,
    m.description,
    m.target_value,
    m.target_unit,
    m.raffle_end_date,
    m.activated,
    m.tier_eligibility,
    mp.id AS progress_id,
    mp.current_value,
    mp.status AS progress_status,
    mp.completed_at,
    r.id AS reward_id,
    r.type AS reward_type,
    r.name AS reward_name,
    r.description AS reward_description,
    r.value_data AS reward_value_data,
    t.tier_name AS tier_name,
    t.tier_color AS tier_color
  INTO v_featured_mission
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id
    AND mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on mission_progress
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND rp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on raffle_participations
    AND m.mission_type = 'raffle'
  WHERE m.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on missions
    AND m.enabled = true
    AND (m.tier_eligibility = v_current_tier.tier_id OR m.tier_eligibility = 'all')
    AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
    AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))
    AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
  ORDER BY
    CASE m.mission_type
      WHEN 'raffle' THEN 0
      WHEN 'sales_dollars' THEN CASE WHEN v_user_data.vip_metric = 'sales' THEN 1 ELSE 2 END
      WHEN 'sales_units' THEN CASE WHEN v_user_data.vip_metric = 'units' THEN 1 ELSE 2 END
      WHEN 'videos' THEN 3
      WHEN 'likes' THEN 4
      WHEN 'views' THEN 5
      ELSE 999
    END ASC
  LIMIT 1;

  -- 5. Check for recent fulfillment (congrats modal)
  SELECT
    mp.id AS progress_id,
    mp.completed_at AS fulfilled_at,
    r.type AS reward_type,
    r.name AS reward_name,
    COALESCE((r.value_data->>'amount')::INTEGER, 0) AS reward_amount  -- Safe cast with fallback
  INTO v_recent_fulfillment
  FROM mission_progress mp
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  WHERE mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
    AND mp.status = 'fulfilled'
    AND (v_user_data.last_login_at IS NULL OR mp.completed_at > v_user_data.last_login_at)
  ORDER BY mp.completed_at DESC
  LIMIT 1;

  -- 6. Get top 4 tier rewards
  SELECT json_agg(reward_row)
  INTO v_rewards
  FROM (
    SELECT
      r.id,
      r.type,
      r.name,
      r.description,
      r.value_data,
      r.reward_source,
      r.redemption_quantity,
      r.display_order
    FROM rewards r
    WHERE r.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
      AND r.tier_eligibility = v_current_tier.tier_id
      AND r.enabled = true
      AND r.reward_source = 'vip_tier'
    ORDER BY r.display_order ASC
    LIMIT 4
  ) reward_row;

  -- 7. Get total rewards count
  SELECT COUNT(*)
  INTO v_rewards_count
  FROM rewards
  WHERE client_id = p_client_id
    AND tier_eligibility = v_current_tier.tier_id
    AND enabled = true
    AND reward_source = 'vip_tier';

  -- 8. Build response JSON
  v_result := json_build_object(
    'user', json_build_object(
      'id', v_user_data.id,
      'handle', v_user_data.tiktok_handle,
      'email', v_user_data.email,
      'clientName', v_user_data.client_name
    ),
    'client', json_build_object(
      'id', v_user_data.client_id,
      'vipMetric', v_user_data.vip_metric,
      'checkpointMonths', v_user_data.checkpoint_months
    ),
    'currentTier', json_build_object(
      'id', v_current_tier.tier_id,
      'name', v_current_tier.tier_name,
      'color', v_current_tier.tier_color,
      'order', v_current_tier.tier_order,
      'checkpointExempt', COALESCE(v_current_tier.checkpoint_exempt, false)
    ),
    'nextTier', CASE WHEN v_next_tier.tier_id IS NOT NULL THEN json_build_object(
      'id', v_next_tier.tier_id,
      'name', v_next_tier.tier_name,
      'color', v_next_tier.tier_color,
      'salesThreshold', v_next_tier.sales_threshold,
      'unitsThreshold', v_next_tier.units_threshold
    ) ELSE NULL END,
    'checkpointData', json_build_object(
      'salesCurrent', v_user_data.checkpoint_sales_current,
      'unitsCurrent', v_user_data.checkpoint_units_current,
      'manualAdjustmentsTotal', v_user_data.manual_adjustments_total,
      'manualAdjustmentsUnits', v_user_data.manual_adjustments_units,
      'nextCheckpointAt', v_user_data.next_checkpoint_at,
      'lastLoginAt', v_user_data.last_login_at
    ),
    'featuredMission', CASE WHEN v_featured_mission.mission_id IS NOT NULL THEN json_build_object(
      'missionId', v_featured_mission.mission_id,
      'missionType', v_featured_mission.mission_type,
      'displayName', v_featured_mission.display_name,
      'targetValue', v_featured_mission.target_value,
      'targetUnit', v_featured_mission.target_unit,
      'raffleEndDate', v_featured_mission.raffle_end_date,
      'activated', v_featured_mission.activated,
      'progressId', v_featured_mission.progress_id,
      'currentValue', COALESCE(v_featured_mission.current_value, 0),
      'progressStatus', v_featured_mission.progress_status,
      'completedAt', v_featured_mission.completed_at,
      'rewardId', v_featured_mission.reward_id,
      'rewardType', v_featured_mission.reward_type,
      'rewardName', v_featured_mission.reward_name,
      'rewardValueData', v_featured_mission.reward_value_data,
      'tierName', v_featured_mission.tier_name,
      'tierColor', v_featured_mission.tier_color
    ) ELSE NULL END,
    'recentFulfillment', CASE WHEN v_recent_fulfillment.progress_id IS NOT NULL THEN json_build_object(
      'fulfilledAt', v_recent_fulfillment.fulfilled_at,
      'rewardType', v_recent_fulfillment.reward_type,
      'rewardName', v_recent_fulfillment.reward_name,
      'rewardAmount', v_recent_fulfillment.reward_amount
    ) ELSE NULL END,
    'currentTierRewards', COALESCE(v_rewards, '[]'::json),
    'totalRewardsCount', v_rewards_count
  );

  RETURN v_result;
END;
$$;

-- SECURITY: Revoke default PUBLIC access, then grant only to specific roles
REVOKE EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO service_role;
