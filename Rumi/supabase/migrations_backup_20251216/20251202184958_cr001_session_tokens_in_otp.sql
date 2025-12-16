-- CR-001: Fix Session Creation After OTP Verification
--
-- Problem: verifyOTP() calls getUserById() expecting it to create a session,
--          but getUserById() only fetches user data, doesn't create sessions.
--
-- Solution: Store encrypted session tokens from signup in OTP record,
--           return them after OTP verification.
--
-- References:
-- - /repodocs/LoginFlowFix.md (full implementation guide)
-- - EXECUTION_STATUS.md CR-001

-- =============================================================================
-- Step 1: Add session token columns to otp_codes table
-- =============================================================================

ALTER TABLE public.otp_codes
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;

COMMENT ON COLUMN public.otp_codes.access_token_encrypted IS 'AES-256-GCM encrypted Supabase access_token from signup (cleared after use)';
COMMENT ON COLUMN public.otp_codes.refresh_token_encrypted IS 'AES-256-GCM encrypted Supabase refresh_token from signup (cleared after use)';

-- =============================================================================
-- Step 2: Update auth_create_otp to accept session tokens
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_create_otp(
  p_user_id UUID,
  p_session_id TEXT,
  p_code_hash TEXT,
  p_expires_at TIMESTAMPTZ,
  p_access_token_encrypted TEXT DEFAULT NULL,
  p_refresh_token_encrypted TEXT DEFAULT NULL
) RETURNS UUID AS $$
  INSERT INTO public.otp_codes (
    user_id,
    session_id,
    code_hash,
    expires_at,
    attempts,
    used,
    access_token_encrypted,
    refresh_token_encrypted
  )
  VALUES (
    p_user_id,
    p_session_id,
    p_code_hash,
    p_expires_at,
    0,
    false,
    p_access_token_encrypted,
    p_refresh_token_encrypted
  )
  RETURNING id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- Step 3: Update auth_find_otp_by_session to return session tokens
-- Note: Must DROP first because we're changing the return type
-- =============================================================================

DROP FUNCTION IF EXISTS auth_find_otp_by_session(TEXT);

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
  created_at TIMESTAMPTZ,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT
) AS $$
  SELECT
    o.id,
    o.user_id,
    o.session_id,
    o.code_hash,
    o.expires_at,
    o.attempts,
    o.used,
    o.created_at,
    o.access_token_encrypted,
    o.refresh_token_encrypted
  FROM public.otp_codes o
  WHERE o.session_id = p_session_id
  ORDER BY o.created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- Step 4: Update auth_mark_otp_used to clear tokens (security)
-- =============================================================================

CREATE OR REPLACE FUNCTION auth_mark_otp_used(
  p_session_id TEXT
) RETURNS VOID AS $$
  UPDATE public.otp_codes
  SET
    used = true,
    access_token_encrypted = NULL,
    refresh_token_encrypted = NULL
  WHERE session_id = p_session_id;
$$ LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- Verification queries (run manually after migration)
-- =============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'otp_codes' AND column_name LIKE '%token%';
--
-- Expected: access_token_encrypted (text), refresh_token_encrypted (text)
