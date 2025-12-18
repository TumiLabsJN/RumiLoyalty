-- Migration: Add DEFAULT NULL to optional RPC parameters
-- Bug ID: BUG-007-SupabaseRPCNullableParams
-- Purpose: Make Supabase type generator produce nullable types for optional params
-- Date: 2025-12-18
-- Scope: Only claim_physical_gift (claim_commission_boost has all required params)
-- Note: Auth guard (users.id = auth.uid()) already fixed in 20251218100002

-- ============================================
-- RPC: claim_physical_gift (ADD DEFAULT NULL)
-- ============================================
-- Parameters needing DEFAULT NULL:
--   p_size_category - nullable in schema (size not always required)
--   p_size_value    - nullable in schema (size not always required)
--   p_line2         - nullable in schema (apt/suite is optional)
--   p_phone         - nullable in schema (phone is optional)
-- ============================================

-- NOTE: PostgreSQL requires params with DEFAULT to come AFTER required params
-- Reordered: required params first, then optional (DEFAULT NULL) params last
-- TypeScript calls use named parameters so order doesn't affect call sites
--
-- IMPORTANT: Must DROP existing function first because we're changing parameter order
-- PostgreSQL doesn't allow changing parameter positions with CREATE OR REPLACE

DROP FUNCTION IF EXISTS claim_physical_gift(
  UUID, UUID, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE OR REPLACE FUNCTION claim_physical_gift(
  -- Required parameters (no defaults)
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  -- Optional parameters (with DEFAULT NULL) - must come last
  p_size_category TEXT DEFAULT NULL,
  p_size_value TEXT DEFAULT NULL,
  p_line2 TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
BEGIN
  -- SECURITY: Get user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly
  SELECT id INTO v_user_id
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify redemption belongs to authenticated user and is claimable
  IF NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE id = p_redemption_id
      AND user_id = v_user_id
      AND client_id = p_client_id
      AND status = 'claimable'
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Redemption not found or not claimable'
    );
  END IF;

  -- Both operations in single transaction (implicit BEGIN)

  -- 1. Update redemption status
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = p_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id;

  -- 2. Insert physical gift sub-state
  INSERT INTO physical_gift_redemptions (
    redemption_id, client_id,
    requires_size, size_category, size_value, size_submitted_at,
    shipping_recipient_first_name, shipping_recipient_last_name,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code,
    shipping_country, shipping_phone, shipping_info_submitted_at
  ) VALUES (
    p_redemption_id, p_client_id,
    p_requires_size, p_size_category, p_size_value,
    CASE WHEN p_size_value IS NOT NULL THEN v_now ELSE NULL END,
    p_first_name, p_last_name,
    p_line1, p_line2,
    p_city, p_state, p_postal_code,
    COALESCE(p_country, 'USA'), p_phone, v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
