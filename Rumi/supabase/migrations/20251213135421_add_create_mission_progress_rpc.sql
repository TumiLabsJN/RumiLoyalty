-- ============================================================================
-- Mission Progress Row Creation RPC Function
-- ============================================================================
-- Purpose: Create mission_progress rows for eligible users based on tier
-- References:
--   - GAP-MISSION-PROGRESS-ROWS (BugFixes/MissionProgressRowCreationGap.md)
--   - MissionsRewardsFlows.md Step 0.5
--   - SchemaFinalv2.md mission_progress table
-- ============================================================================

CREATE OR REPLACE FUNCTION create_mission_progress_for_eligible_users(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_count INTEGER := 0;
BEGIN
  INSERT INTO mission_progress (
    client_id,
    mission_id,
    user_id,
    current_value,
    status,
    checkpoint_start,
    checkpoint_end,
    created_at,
    updated_at
  )
  SELECT
    p_client_id,
    m.id,
    u.id,
    0,
    CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
    u.tier_achieved_at,
    u.next_checkpoint_at,
    NOW(),
    NOW()
  FROM missions m
  CROSS JOIN users u
  LEFT JOIN tiers ut ON u.current_tier = ut.tier_id AND ut.client_id = p_client_id
  LEFT JOIN tiers mt ON m.tier_eligibility = mt.tier_id AND mt.client_id = p_client_id
  WHERE m.client_id = p_client_id
    AND u.client_id = p_client_id
    AND m.enabled = true
    AND (
      m.tier_eligibility = 'all'
      OR (ut.tier_order IS NOT NULL AND mt.tier_order IS NOT NULL AND ut.tier_order >= mt.tier_order)
    )
    AND NOT EXISTS (
      SELECT 1 FROM mission_progress mp
      WHERE mp.mission_id = m.id
        AND mp.user_id = u.id
        AND mp.client_id = p_client_id
    );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  RETURN v_created_count;
END;
$$;

GRANT EXECUTE ON FUNCTION create_mission_progress_for_eligible_users(UUID) TO service_role;
