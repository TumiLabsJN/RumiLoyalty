-- Migration: Add boost activation/expiration RPC functions
-- Per GAP-BOOST-ACTIVATION specification + BUG-BOOST-EXPIRATION-STATE fix
--
-- Functions:
--   1. activate_scheduled_boosts - Transitions scheduled → active
--   2. expire_active_boosts - Transitions active → expired (NOT pending_info)
--   3. transition_expired_to_pending_info - Transitions expired → pending_info
--
-- SECURITY: All functions use SECURITY DEFINER with service_role-only grants
-- MULTI-TENANT: All functions require p_client_id and filter all queries
--
-- Audit Fixes Applied:
--   - COALESCE(u.total_sales, 0) to handle NULL total_sales
--   - service_role ONLY grants (removed authenticated - security fix)
--   - expire_active_boosts ends in 'expired' state (BUG-BOOST-EXPIRATION-STATE fix)
--   - New transition_expired_to_pending_info for Step 6

-- ============================================================================
-- Function 1: activate_scheduled_boosts
-- Transitions scheduled → active on scheduled_activation_date
-- ============================================================================
CREATE OR REPLACE FUNCTION activate_scheduled_boosts(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  sales_at_activation DECIMAL(10,2),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'active',
    activated_at = NOW(),
    expires_at = NOW() + (cb.duration_days || ' days')::INTERVAL,
    -- COALESCE to handle NULL total_sales
    sales_at_activation = COALESCE(u.total_sales, 0)
  FROM redemptions r
  JOIN users u ON r.user_id = u.id AND u.client_id = p_client_id
  WHERE cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
    AND cb.boost_status = 'scheduled'
    AND cb.scheduled_activation_date <= CURRENT_DATE
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.sales_at_activation,
    cb.activated_at,
    cb.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function 2: expire_active_boosts
-- Transitions active → expired (Step 5 of documented flow)
-- IMPORTANT: Ends in 'expired' state, NOT 'pending_info'
-- Call transition_expired_to_pending_info() for Step 6
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_active_boosts(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  sales_at_activation DECIMAL(10,2),
  sales_at_expiration DECIMAL(10,2),
  sales_delta DECIMAL(10,2),
  boost_rate DECIMAL(5,2),
  final_payout_amount DECIMAL(10,2)
) AS $$
DECLARE
  expired_ids UUID[];
BEGIN
  -- Phase 1: Set sales_at_expiration (triggers sales_delta GENERATED column calculation)
  WITH expired AS (
    UPDATE commission_boost_redemptions cb
    -- COALESCE to handle NULL total_sales
    SET sales_at_expiration = COALESCE(u.total_sales, 0)
    FROM redemptions r
    JOIN users u ON r.user_id = u.id AND u.client_id = p_client_id
    WHERE cb.redemption_id = r.id
      AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
      AND cb.boost_status = 'active'
      AND cb.expires_at <= NOW()
    RETURNING cb.id
  )
  SELECT ARRAY_AGG(id) INTO expired_ids FROM expired;

  -- If no boosts to expire, return empty
  IF expired_ids IS NULL OR array_length(expired_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Phase 2: Set 'expired' status and calculate final_payout_amount
  -- Row now observable in 'expired' state (Step 5 of documented flow)
  -- Per BUG-BOOST-EXPIRATION-STATE fix: ends in 'expired', NOT 'pending_info'
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'expired',
    final_payout_amount = cb.sales_delta * cb.boost_rate / 100
  FROM redemptions r
  WHERE cb.id = ANY(expired_ids)
    AND cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.sales_at_activation,
    cb.sales_at_expiration,
    cb.sales_delta,
    cb.boost_rate,
    cb.final_payout_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function 3: transition_expired_to_pending_info
-- Transitions expired → pending_info (Step 6 of documented flow)
-- Per BUG-BOOST-EXPIRATION-STATE fix: separate operation from expiration
-- ============================================================================
CREATE OR REPLACE FUNCTION transition_expired_to_pending_info(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  final_payout_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'pending_info'
  FROM redemptions r
  WHERE cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
    AND cb.boost_status = 'expired'
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.final_payout_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grants: service_role ONLY (cron uses this, not authenticated users)
-- ============================================================================
GRANT EXECUTE ON FUNCTION activate_scheduled_boosts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION expire_active_boosts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION transition_expired_to_pending_info(UUID) TO service_role;

-- SECURITY: Revoke from public (defense in depth)
REVOKE EXECUTE ON FUNCTION activate_scheduled_boosts(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION expire_active_boosts(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_expired_to_pending_info(UUID) FROM PUBLIC;
