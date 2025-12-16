-- =============================================
-- RLS Fix Migration: SECURITY DEFINER Functions
-- Created: 2025-11-29
-- Reference: SecurityDefiner.md
-- =============================================
--
-- This migration fixes three RLS issues:
-- 1. Problem A: Infinite recursion in 20 policies that query users table
-- 2. Problem B: No anon access for 8 unauthenticated auth routes
-- 3. Problem C: 2 overly permissive USING(true) policies
--
-- Solution: SECURITY DEFINER RPC functions with GRANT/REVOKE access control
-- =============================================

-- =============================================
-- SECTION 1: SECURITY DEFINER FUNCTIONS
-- =============================================

-- =============================================
-- GROUP A: Auth Route Functions (Anon Access)
-- These functions are called from API routes before authentication.
-- They are executed SERVER-SIDE ONLY via the Supabase client.
-- client_id comes from SERVER environment variable, NOT from user input.
-- =============================================

-- Find user by handle (for login, check-handle)
CREATE OR REPLACE FUNCTION auth_find_user_by_handle(
  p_client_id UUID,
  p_handle TEXT
) RETURNS TABLE (
  id UUID,
  client_id UUID,
  tiktok_handle VARCHAR,
  email VARCHAR,
  email_verified BOOLEAN,
  is_admin BOOLEAN,
  last_login_at TIMESTAMPTZ
) AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.is_admin, u.last_login_at
  FROM public.users u
  WHERE u.client_id = p_client_id
  AND u.tiktok_handle = LOWER(p_handle);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Find user by email (for forgot-password)
CREATE OR REPLACE FUNCTION auth_find_user_by_email(
  p_client_id UUID,
  p_email TEXT
) RETURNS TABLE (
  id UUID,
  client_id UUID,
  tiktok_handle VARCHAR,
  email VARCHAR,
  email_verified BOOLEAN,
  is_admin BOOLEAN
) AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.is_admin
  FROM public.users u
  WHERE u.client_id = p_client_id
  AND u.email = LOWER(p_email);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check handle uniqueness (for signup validation)
CREATE OR REPLACE FUNCTION auth_handle_exists(
  p_client_id UUID,
  p_handle TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE client_id = p_client_id
    AND tiktok_handle = LOWER(p_handle)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check email uniqueness (for signup validation)
CREATE OR REPLACE FUNCTION auth_email_exists(
  p_client_id UUID,
  p_email TEXT
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE client_id = p_client_id
    AND email = LOWER(p_email)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Get client by ID (for email branding, client-config)
CREATE OR REPLACE FUNCTION auth_get_client_by_id(
  p_client_id UUID
) RETURNS TABLE (
  id UUID,
  name VARCHAR,
  subdomain VARCHAR,
  logo_url TEXT,
  primary_color VARCHAR
) AS $$
  SELECT c.id, c.name, c.subdomain, c.logo_url, c.primary_color
  FROM public.clients c
  WHERE c.id = p_client_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Create user (for signup)
-- SECURITY: NO p_is_admin parameter - ALWAYS creates non-admin users
-- This prevents privilege escalation via anon key
CREATE OR REPLACE FUNCTION auth_create_user(
  p_id UUID,
  p_client_id UUID,
  p_tiktok_handle VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_terms_version VARCHAR DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  client_id UUID,
  tiktok_handle VARCHAR,
  email VARCHAR,
  email_verified BOOLEAN,
  current_tier VARCHAR,
  is_admin BOOLEAN,
  terms_accepted_at TIMESTAMPTZ,
  terms_version VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
  INSERT INTO public.users (
    id, client_id, tiktok_handle, email, password_hash,
    email_verified, current_tier, is_admin,
    terms_accepted_at, terms_version
  ) VALUES (
    p_id, p_client_id, LOWER(p_tiktok_handle), LOWER(p_email), p_password_hash,
    false, 'tier_1', false,
    CASE WHEN p_terms_version IS NOT NULL THEN NOW() ELSE NULL END,
    p_terms_version
  )
  RETURNING id, client_id, tiktok_handle, email, email_verified, current_tier, is_admin, terms_accepted_at, terms_version, created_at;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- GROUP B: Auth Route Functions (Cookie Auth)
-- These functions are used after signup when user has OTP session cookie.
-- =============================================

-- Find user by ID (for verify-otp, resend-otp, auth.ts getUserFromRequest)
CREATE OR REPLACE FUNCTION auth_find_user_by_id(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  client_id UUID,
  tiktok_handle VARCHAR,
  email VARCHAR,
  email_verified BOOLEAN,
  current_tier VARCHAR,
  is_admin BOOLEAN
) AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.current_tier, u.is_admin
  FROM public.users u
  WHERE u.id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Mark email verified (for verify-otp)
CREATE OR REPLACE FUNCTION auth_mark_email_verified(
  p_user_id UUID
) RETURNS VOID AS $$
  UPDATE public.users
  SET email_verified = true, updated_at = NOW()
  WHERE id = p_user_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- Update last login (for verify-otp, login)
CREATE OR REPLACE FUNCTION auth_update_last_login(
  p_user_id UUID
) RETURNS VOID AS $$
  UPDATE public.users
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE id = p_user_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- GROUP C: Admin Check Functions (Fix Recursion)
-- These are called BY RLS policies, not directly by app code.
-- =============================================

-- Check if current user is admin of a client (breaks recursion)
-- Guards against auth.uid() IS NULL to prevent unexpected behavior
CREATE OR REPLACE FUNCTION is_admin_of_client(
  p_client_id UUID
) RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND client_id = p_client_id
      AND is_admin = true
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Get current user's client_id (for creator policies)
-- Returns NULL if auth.uid() IS NULL (unauthenticated)
CREATE OR REPLACE FUNCTION get_current_user_client_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (SELECT client_id FROM public.users WHERE id = auth.uid())
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================
-- GROUP D: OTP Functions (Unauthenticated Access)
-- =============================================

-- Create OTP code (called during signup before auth)
CREATE OR REPLACE FUNCTION auth_create_otp(
  p_user_id UUID,
  p_session_id TEXT,
  p_code_hash TEXT,
  p_expires_at TIMESTAMPTZ
) RETURNS UUID AS $$
  INSERT INTO public.otp_codes (user_id, session_id, code_hash, expires_at, attempts, used)
  VALUES (p_user_id, p_session_id, p_code_hash, p_expires_at, 0, false)
  RETURNING id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- Find OTP by session ID (called during verify-otp)
CREATE OR REPLACE FUNCTION auth_find_otp_by_session(
  p_session_id TEXT
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_id TEXT,
  code_hash TEXT,
  expires_at TIMESTAMPTZ,
  attempts INTEGER,
  used BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
  SELECT o.id, o.user_id, o.session_id, o.code_hash, o.expires_at, o.attempts, o.used, o.created_at
  FROM public.otp_codes o
  WHERE o.session_id = p_session_id
  ORDER BY o.created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Mark OTP as used
CREATE OR REPLACE FUNCTION auth_mark_otp_used(
  p_session_id TEXT
) RETURNS VOID AS $$
  UPDATE public.otp_codes
  SET used = true
  WHERE session_id = p_session_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- Increment OTP attempts
CREATE OR REPLACE FUNCTION auth_increment_otp_attempts(
  p_session_id TEXT
) RETURNS INTEGER AS $$
  UPDATE public.otp_codes
  SET attempts = attempts + 1
  WHERE session_id = p_session_id
  RETURNING attempts;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- GROUP E: Password Reset Functions (Unauthenticated Access)
-- =============================================

-- Create password reset token
CREATE OR REPLACE FUNCTION auth_create_reset_token(
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
  INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at, ip_address)
  VALUES (p_user_id, p_token_hash, p_expires_at, p_ip_address)
  RETURNING id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- Find all valid reset tokens (for bcrypt comparison)
CREATE OR REPLACE FUNCTION auth_find_valid_reset_tokens()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  token_hash TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
) AS $$
  SELECT t.id, t.user_id, t.token_hash, t.expires_at, t.used_at
  FROM public.password_reset_tokens t
  WHERE t.used_at IS NULL
  AND t.expires_at > NOW();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Find recent tokens by user (for rate limiting)
CREATE OR REPLACE FUNCTION auth_find_recent_reset_tokens(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ
) AS $$
  SELECT t.id, t.created_at
  FROM public.password_reset_tokens t
  WHERE t.user_id = p_user_id
  AND t.created_at > NOW() - INTERVAL '1 hour';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Mark reset token as used
CREATE OR REPLACE FUNCTION auth_mark_reset_token_used(
  p_token_id UUID
) RETURNS VOID AS $$
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE id = p_token_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- Invalidate all tokens for user
CREATE OR REPLACE FUNCTION auth_invalidate_user_reset_tokens(
  p_user_id UUID
) RETURNS VOID AS $$
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = p_user_id
  AND used_at IS NULL;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================
-- SECTION 2: GRANT/REVOKE ACCESS CONTROL
-- CRITICAL: Without this, all functions are executable by PUBLIC
-- =============================================

-- =============================================
-- REVOKE ALL FROM PUBLIC (security baseline)
-- =============================================

-- Group A: Auth Route Functions
REVOKE ALL ON FUNCTION auth_find_user_by_handle(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_user_by_email(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_handle_exists(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_email_exists(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_get_client_by_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_create_user(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC;

-- Group B: Cookie Auth Functions
REVOKE ALL ON FUNCTION auth_find_user_by_id(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_mark_email_verified(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_update_last_login(UUID) FROM PUBLIC;

-- Group C: Admin Check Functions (used by RLS policies)
REVOKE ALL ON FUNCTION is_admin_of_client(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_current_user_client_id() FROM PUBLIC;

-- Group D: OTP Functions
REVOKE ALL ON FUNCTION auth_create_otp(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_otp_by_session(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_mark_otp_used(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_increment_otp_attempts(TEXT) FROM PUBLIC;

-- Group E: Password Reset Functions
REVOKE ALL ON FUNCTION auth_create_reset_token(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_valid_reset_tokens() FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_find_recent_reset_tokens(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_mark_reset_token_used(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth_invalidate_user_reset_tokens(UUID) FROM PUBLIC;

-- =============================================
-- GRANT EXECUTE TO service_role
-- This is the role used by our API server (SUPABASE_SERVICE_ROLE_KEY)
-- =============================================

-- Group A: Auth Route Functions (called by API routes before auth)
GRANT EXECUTE ON FUNCTION auth_find_user_by_handle(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_find_user_by_email(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_handle_exists(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_email_exists(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_get_client_by_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auth_create_user(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO service_role;

-- Group B: Cookie Auth Functions (called by API routes with OTP session)
GRANT EXECUTE ON FUNCTION auth_find_user_by_id(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auth_mark_email_verified(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auth_update_last_login(UUID) TO service_role;

-- Group C: Admin Check Functions (called by RLS policies for authenticated users)
-- These need to be executable by authenticated users for policies to work
GRANT EXECUTE ON FUNCTION is_admin_of_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_client_id() TO authenticated;

-- Group D: OTP Functions (called by API routes)
GRANT EXECUTE ON FUNCTION auth_create_otp(UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION auth_find_otp_by_session(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_mark_otp_used(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_increment_otp_attempts(TEXT) TO service_role;

-- Group E: Password Reset Functions (called by API routes)
GRANT EXECUTE ON FUNCTION auth_create_reset_token(UUID, TEXT, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION auth_find_valid_reset_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION auth_find_recent_reset_tokens(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auth_mark_reset_token_used(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION auth_invalidate_user_reset_tokens(UUID) TO service_role;

-- =============================================
-- SECTION 3: UPDATE RLS POLICIES
-- =============================================

-- =============================================
-- DROP ALL EXISTING PROBLEMATIC POLICIES
-- =============================================

-- Admin policies (16 total)
DROP POLICY IF EXISTS "admin_full_access_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_full_access_users" ON public.users;
DROP POLICY IF EXISTS "admin_full_access_tiers" ON public.tiers;
DROP POLICY IF EXISTS "admin_full_access_videos" ON public.videos;
DROP POLICY IF EXISTS "admin_full_access_sales_adjustments" ON public.sales_adjustments;
DROP POLICY IF EXISTS "admin_full_access_tier_checkpoints" ON public.tier_checkpoints;
DROP POLICY IF EXISTS "admin_full_access_handle_changes" ON public.handle_changes;
DROP POLICY IF EXISTS "admin_full_access_sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "admin_full_access_rewards" ON public.rewards;
DROP POLICY IF EXISTS "admin_full_access_missions" ON public.missions;
DROP POLICY IF EXISTS "admin_full_access_mission_progress" ON public.mission_progress;
DROP POLICY IF EXISTS "admin_full_access_redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "admin_full_access_raffle_participations" ON public.raffle_participations;
DROP POLICY IF EXISTS "admin_full_access_boost_redemptions" ON public.commission_boost_redemptions;
DROP POLICY IF EXISTS "admin_full_access_boost_history" ON public.commission_boost_state_history;
DROP POLICY IF EXISTS "admin_full_access_physical_gift_redemptions" ON public.physical_gift_redemptions;

-- Creator policies that subquery users table (4 total)
DROP POLICY IF EXISTS "creators_read_client" ON public.clients;
DROP POLICY IF EXISTS "creators_read_tiers" ON public.tiers;
DROP POLICY IF EXISTS "creators_read_rewards" ON public.rewards;
DROP POLICY IF EXISTS "creators_read_missions" ON public.missions;

-- System policies (will be replaced with deny-all + RPC access)
DROP POLICY IF EXISTS "system_manage_otp_codes" ON public.otp_codes;
DROP POLICY IF EXISTS "system_manage_password_reset_tokens" ON public.password_reset_tokens;

-- =============================================
-- RECREATE ADMIN POLICIES (using helper function)
-- =============================================

CREATE POLICY "admin_full_access_clients" ON public.clients
    FOR ALL USING (is_admin_of_client(id));

CREATE POLICY "admin_full_access_users" ON public.users
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_tiers" ON public.tiers
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_videos" ON public.videos
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_sales_adjustments" ON public.sales_adjustments
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_tier_checkpoints" ON public.tier_checkpoints
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_handle_changes" ON public.handle_changes
    FOR ALL USING (is_admin_of_client(
        (SELECT client_id FROM public.users WHERE id = handle_changes.user_id)
    ));

CREATE POLICY "admin_full_access_sync_logs" ON public.sync_logs
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_rewards" ON public.rewards
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_missions" ON public.missions
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_mission_progress" ON public.mission_progress
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_redemptions" ON public.redemptions
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_raffle_participations" ON public.raffle_participations
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_boost_redemptions" ON public.commission_boost_redemptions
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_boost_history" ON public.commission_boost_state_history
    FOR ALL USING (is_admin_of_client(client_id));

CREATE POLICY "admin_full_access_physical_gift_redemptions" ON public.physical_gift_redemptions
    FOR ALL USING (is_admin_of_client(client_id));

-- =============================================
-- RECREATE CREATOR POLICIES (using helper function)
-- =============================================

CREATE POLICY "creators_read_client" ON public.clients
    FOR SELECT USING (id = get_current_user_client_id());

CREATE POLICY "creators_read_tiers" ON public.tiers
    FOR SELECT USING (client_id = get_current_user_client_id());

CREATE POLICY "creators_read_rewards" ON public.rewards
    FOR SELECT USING (
        client_id = get_current_user_client_id()
        AND enabled = true
    );

CREATE POLICY "creators_read_missions" ON public.missions
    FOR SELECT USING (
        client_id = get_current_user_client_id()
        AND enabled = true
    );

-- =============================================
-- OTP/RESET TOKEN POLICIES
-- DENY ALL direct access - all operations go through RPC functions.
-- This is MORE secure than USING(true) since RPC functions bypass RLS anyway.
-- =============================================

-- OTP codes: Deny all direct access (RPC functions bypass this via SECURITY DEFINER)
CREATE POLICY "deny_direct_otp_access" ON public.otp_codes
    FOR ALL USING (false);

-- Password reset tokens: Deny all direct access
CREATE POLICY "deny_direct_reset_access" ON public.password_reset_tokens
    FOR ALL USING (false);

-- =============================================
-- END OF MIGRATION
-- =============================================
