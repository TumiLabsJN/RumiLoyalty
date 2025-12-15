-- ============================================================================
-- Fix: apply_pending_sales_adjustments Ambiguous Column Reference
-- ============================================================================
-- Bug ID: BUG-RPC-AMBIGUOUS-COLUMN
-- Issue: Subquery alias 'total_units' conflicts with users.total_units column
-- Fix: Rename alias to 'adj_total_units' and add explicit table prefixes
-- Reference: BugFixes/BUG-RPC-AMBIGUOUS-COLUMN.md
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
  -- NOTE: This section is UNCHANGED - 'total_amount' alias does not conflict
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
  -- FIX: Renamed alias from 'total_units' to 'adj_total_units' to avoid ambiguity
  -- FIX: Added explicit 'u.' prefix to column references in SET clause
  UPDATE users u
  SET
    total_units = u.total_units + adj.adj_total_units,
    manual_adjustments_units = u.manual_adjustments_units + adj.adj_total_units
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
