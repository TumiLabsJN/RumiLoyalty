-- ============================================================================
-- Fix: update_precomputed_fields Overwrites Manual Adjustments
-- ============================================================================
-- Bug ID: BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS
-- Issue: total_sales and total_units were set to only SUM(videos), ignoring
--        manual_adjustments applied by apply_pending_sales_adjustments
-- Fix: Include manual_adjustments_total and manual_adjustments_units in calculation
-- Reference: BugFixes/BUG-UPDATE-PRECOMPUTED-FIELDS-OVERWRITES-ADJUSTMENTS.md
-- ============================================================================

CREATE OR REPLACE FUNCTION update_precomputed_fields(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip_metric VARCHAR(10);
  v_updated_count INTEGER := 0;
BEGIN
  -- Get client's vip_metric with NULL guard
  SELECT vip_metric INTO v_vip_metric FROM clients WHERE id = p_client_id;

  -- Fail loudly if vip_metric is NULL or invalid (indicates data integrity issue)
  IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
    RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
  END IF;

  -- Update aggregation fields (both modes update engagement fields)
  -- FIX: Include manual_adjustments_total and manual_adjustments_units in totals
  UPDATE users u
  SET
    total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_total, 0),
    total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0) + COALESCE(u.manual_adjustments_units, 0),
    checkpoint_sales_current = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_units_current = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_videos_posted = COALESCE((SELECT COUNT(*) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_views = COALESCE((SELECT SUM(views) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_likes = COALESCE((SELECT SUM(likes) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_comments = COALESCE((SELECT SUM(comments) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_progress_updated_at = NOW(),
    updated_at = NOW()
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Update projected_tier_at_checkpoint based on vip_metric
  UPDATE users u
  SET projected_tier_at_checkpoint = (
    SELECT t.tier_id
    FROM tiers t
    WHERE t.client_id = p_client_id
      AND (
        (v_vip_metric = 'sales' AND u.checkpoint_sales_current >= COALESCE(t.sales_threshold, 0))
        OR (v_vip_metric = 'units' AND u.checkpoint_units_current >= COALESCE(t.units_threshold, 0))
      )
    ORDER BY t.tier_order DESC
    LIMIT 1
  )
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  -- Update next_tier fields
  -- DESIGN NOTE: We set BOTH next_tier_threshold AND next_tier_threshold_units
  -- regardless of vip_metric. This is intentional:
  --   - SchemaFinalv2.md lines 146 defines both fields on users table
  --   - Frontend selects which to display based on client.vip_metric
  --   - In units mode: UI shows next_tier_threshold_units ("50 more units to Silver")
  --   - In sales mode: UI shows next_tier_threshold ("$500 more to Silver")
  --   - Having both populated is a denormalization for frontend flexibility
  UPDATE users u
  SET
    next_tier_name = nt.tier_name,
    next_tier_threshold = nt.sales_threshold,        -- Always set (frontend picks based on vip_metric)
    next_tier_threshold_units = nt.units_threshold   -- Always set (frontend picks based on vip_metric)
  FROM tiers ct, tiers nt
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND ct.client_id = p_client_id
    AND ct.tier_id = u.current_tier
    AND nt.client_id = p_client_id
    AND nt.tier_order = ct.tier_order + 1;

  -- Clear next_tier for users at max tier
  UPDATE users u
  SET
    next_tier_name = NULL,
    next_tier_threshold = NULL,
    next_tier_threshold_units = NULL
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND NOT EXISTS (
      SELECT 1 FROM tiers ct, tiers nt
      WHERE ct.client_id = p_client_id
        AND ct.tier_id = u.current_tier
        AND nt.client_id = p_client_id
        AND nt.tier_order = ct.tier_order + 1
    );

  RETURN v_updated_count;
END;
$$;

-- CRITICAL: Must include GRANT to preserve service_role access
GRANT EXECUTE ON FUNCTION update_precomputed_fields(UUID, UUID[]) TO service_role;
