-- ============================================================================
-- Fix: apply_pending_sales_adjustments NULL Handling
-- ============================================================================
-- Bug ID: BUG-APPLY-ADJUSTMENTS-NULL-HANDLING
-- Issue: Columns may be NULL, and NULL + value = NULL in PostgreSQL
-- Fix: Wrap column references in COALESCE(column, 0) to handle NULL
-- Reference: BugFixes/BUG-APPLY-ADJUSTMENTS-NULL-HANDLING.md
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
  -- FIX: Added COALESCE to handle NULL values
  UPDATE users u
  SET
    total_sales = COALESCE(total_sales, 0) + adj.total_amount,
    manual_adjustments_total = COALESCE(manual_adjustments_total, 0) + adj.total_amount
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
  -- FIX: Added COALESCE to handle NULL values
  UPDATE users u
  SET
    total_units = COALESCE(u.total_units, 0) + adj.adj_total_units,
    manual_adjustments_units = COALESCE(u.manual_adjustments_units, 0) + adj.adj_total_units
  FROM (
    SELECT user_id, SUM(amount_units) as adj_total_units
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

-- CRITICAL: Must include GRANT to preserve service_role access
GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role;
