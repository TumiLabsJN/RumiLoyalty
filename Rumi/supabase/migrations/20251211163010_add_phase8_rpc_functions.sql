-- ============================================================================
-- Phase 8 RPC Functions for Daily Automation
-- ============================================================================
-- Purpose: Bulk UPDATE operations for precomputed fields, leaderboard ranks,
--          and sales adjustments
-- References:
--   - RPCMigrationFix.md (BugFixes folder)
--   - Loyalty.md Flow 1 Step 4
--   - EXECUTION_PLAN.md Tasks 8.2.3a, 8.2.3b, 8.3.1a
--   - SchemaFinalv2.md users, tiers, sales_adjustments tables
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: update_precomputed_fields
-- Updates 13 precomputed fields on users table with video aggregations
-- and tier projection calculations. vip_metric aware.
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
  UPDATE users u
  SET
    total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
    total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
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

GRANT EXECUTE ON FUNCTION update_precomputed_fields(UUID, UUID[]) TO service_role;

-- ============================================================================
-- FUNCTION 2: update_leaderboard_ranks
-- Calculates leaderboard ranks using ROW_NUMBER().
-- vip_metric aware: uses total_sales for sales mode, total_units for units mode.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_leaderboard_ranks(
  p_client_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip_metric VARCHAR(10);
BEGIN
  -- Get client's vip_metric with NULL guard
  SELECT vip_metric INTO v_vip_metric FROM clients WHERE id = p_client_id;

  -- Fail loudly if vip_metric is NULL or invalid (indicates data integrity issue)
  IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
    RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
  END IF;

  -- Branch ranking metric based on vip_metric (SchemaFinalv2.md line 118)
  IF v_vip_metric = 'units' THEN
    UPDATE users u
    SET leaderboard_rank = ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY total_units DESC) as rank
      FROM users
      WHERE client_id = p_client_id
    ) ranked
    WHERE u.id = ranked.id
      AND u.client_id = p_client_id;
  ELSE
    UPDATE users u
    SET leaderboard_rank = ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY total_sales DESC) as rank
      FROM users
      WHERE client_id = p_client_id
    ) ranked
    WHERE u.id = ranked.id
      AND u.client_id = p_client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_leaderboard_ranks(UUID) TO service_role;

-- ============================================================================
-- FUNCTION 3: apply_pending_sales_adjustments
-- Applies pending sales/units adjustments to user totals atomically.
-- Updates: total_sales, total_units, manual_adjustments_total, manual_adjustments_units
-- Then marks adjustments as applied (applied_at = NOW()).
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_pending_sales_adjustments(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_count INTEGER := 0;
BEGIN
  -- Apply sales adjustments (amount field)
  UPDATE users u
  SET
    total_sales = total_sales + adj.total_amount,
    manual_adjustments_total = manual_adjustments_total + adj.total_amount
  FROM (
    SELECT user_id, SUM(amount) as total_amount
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Apply units adjustments (amount_units field)
  UPDATE users u
  SET
    total_units = total_units + adj.total_units,
    manual_adjustments_units = manual_adjustments_units + adj.total_units
  FROM (
    SELECT user_id, SUM(amount_units) as total_units
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount_units IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Mark all adjustments as applied
  UPDATE sales_adjustments
  SET applied_at = NOW()
  WHERE client_id = p_client_id
    AND applied_at IS NULL;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  RETURN v_affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role;
