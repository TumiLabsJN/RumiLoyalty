-- ============================================================================
-- Mission Progress Update RPC Function
-- ============================================================================
-- Purpose: Update mission_progress.current_value based on mission_type-specific
--          aggregations from videos table within checkpoint window
-- References:
--   - BUG-MISSION-PROGRESS-UPDATE (BugFixes/MissionProgressUpdateFix.md)
--   - Loyalty.md Flow 1 Step 5 "Update mission progress"
--   - EXECUTION_PLAN.md Task 8.2.3
--   - SchemaFinalv2.md mission_progress, missions, videos tables
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mission_progress(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE mission_progress mp
  SET
    current_value = CASE m.mission_type
      WHEN 'sales_dollars' THEN (
        SELECT COALESCE(SUM(v.gmv), 0)::INTEGER
        FROM videos v
        WHERE v.user_id = mp.user_id
          AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start
          AND v.post_date < mp.checkpoint_end
      )
      WHEN 'sales_units' THEN (
        SELECT COALESCE(SUM(v.units_sold), 0)
        FROM videos v
        WHERE v.user_id = mp.user_id
          AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start
          AND v.post_date < mp.checkpoint_end
      )
      WHEN 'videos' THEN (
        SELECT COUNT(*)::INTEGER
        FROM videos v
        WHERE v.user_id = mp.user_id
          AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start
          AND v.post_date < mp.checkpoint_end
      )
      WHEN 'views' THEN (
        SELECT COALESCE(SUM(v.views), 0)::INTEGER
        FROM videos v
        WHERE v.user_id = mp.user_id
          AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start
          AND v.post_date < mp.checkpoint_end
      )
      WHEN 'likes' THEN (
        SELECT COALESCE(SUM(v.likes), 0)::INTEGER
        FROM videos v
        WHERE v.user_id = mp.user_id
          AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start
          AND v.post_date < mp.checkpoint_end
      )
      ELSE mp.current_value
    END,
    updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.client_id = p_client_id
    AND m.client_id = p_client_id
    AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
    AND mp.status = 'active'
    AND m.enabled = true
    AND m.activated = true
    AND m.mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  UPDATE mission_progress mp
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.client_id = p_client_id
    AND m.client_id = p_client_id
    AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
    AND mp.status = 'active'
    AND m.enabled = true
    AND m.activated = true
    AND COALESCE(m.target_value, 0) > 0
    AND mp.current_value >= m.target_value
    AND m.mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes');

  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION update_mission_progress(UUID, UUID[]) TO service_role;
