-- =============================================
-- BASELINE MIGRATION
-- Generated: 2025-12-16
-- Purpose: Reconciliation of existing database state
-- Plan ID: PROC-MIGRATION-RECON-001
-- =============================================
--
-- This migration represents the complete database schema
-- as it existed on 2025-12-16 after manual application of
-- 17 migration files.
--
-- Verified object counts:
--   Tables: 18
--   Functions: 31
--   SECURITY DEFINER: 28
--   RLS Policies: 34
--   Triggers: 12
--   Indexes: 84
--   Foreign Keys: 43
--   Named CHECK constraints: 31
--
-- DO NOT MODIFY THIS FILE
-- Future changes should be in new migration files
-- =============================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") RETURNS TABLE("boost_redemption_id" "uuid", "redemption_id" "uuid", "user_id" "uuid", "sales_at_activation" numeric, "activated_at" timestamp without time zone, "expires_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_create_otp"("p_user_id" "uuid", "p_session_id" "text", "p_code_hash" "text", "p_expires_at" timestamp with time zone, "p_access_token_encrypted" "text" DEFAULT NULL::"text", "p_refresh_token_encrypted" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."auth_create_otp"("p_user_id" "uuid", "p_session_id" "text", "p_code_hash" "text", "p_expires_at" timestamp with time zone, "p_access_token_encrypted" "text", "p_refresh_token_encrypted" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at, ip_address)
  VALUES (p_user_id, p_token_hash, p_expires_at, p_ip_address)
  RETURNING id;
$$;


ALTER FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying DEFAULT NULL::character varying) RETURNS TABLE("id" "uuid", "client_id" "uuid", "tiktok_handle" character varying, "email" character varying, "email_verified" boolean, "current_tier" character varying, "is_admin" boolean, "terms_accepted_at" timestamp with time zone, "terms_version" character varying, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE client_id = p_client_id
    AND email = LOWER(p_email)
  );
$$;


ALTER FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_otp_by_session"("p_session_id" "text") RETURNS TABLE("id" "uuid", "user_id" "uuid", "session_id" "text", "code_hash" "text", "expires_at" timestamp with time zone, "attempts" integer, "used" boolean, "created_at" timestamp with time zone, "access_token_encrypted" "text", "refresh_token_encrypted" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."auth_find_otp_by_session"("p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT t.id, t.created_at
  FROM public.password_reset_tokens t
  WHERE t.user_id = p_user_id
  AND t.created_at > NOW() - INTERVAL '1 hour';
$$;


ALTER FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") RETURNS TABLE("id" "uuid", "client_id" "uuid", "tiktok_handle" character varying, "email" character varying, "email_verified" boolean, "is_admin" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.is_admin
  FROM public.users u
  WHERE u.client_id = p_client_id
  AND u.email = LOWER(p_email);
$$;


ALTER FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") RETURNS TABLE("id" "uuid", "client_id" "uuid", "tiktok_handle" character varying, "email" character varying, "email_verified" boolean, "is_admin" boolean, "last_login_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.is_admin, u.last_login_at
  FROM public.users u
  WHERE u.client_id = p_client_id
  AND u.tiktok_handle = LOWER(p_handle);
$$;


ALTER FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "client_id" "uuid", "tiktok_handle" character varying, "email" character varying, "email_verified" boolean, "current_tier" character varying, "is_admin" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id, u.client_id, u.tiktok_handle, u.email, u.email_verified, u.current_tier, u.is_admin
  FROM public.users u
  WHERE u.id = p_user_id;
$$;


ALTER FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_find_valid_reset_tokens"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "token_hash" "text", "expires_at" timestamp with time zone, "used_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT t.id, t.user_id, t.token_hash, t.expires_at, t.used_at
  FROM public.password_reset_tokens t
  WHERE t.used_at IS NULL
  AND t.expires_at > NOW();
$$;


ALTER FUNCTION "public"."auth_find_valid_reset_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") RETURNS TABLE("id" "uuid", "name" character varying, "subdomain" character varying, "logo_url" "text", "primary_color" character varying)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT c.id, c.name, c.subdomain, c.logo_url, c.primary_color
  FROM public.clients c
  WHERE c.id = p_client_id;
$$;


ALTER FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE client_id = p_client_id
    AND tiktok_handle = LOWER(p_handle)
  );
$$;


ALTER FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") RETURNS integer
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.otp_codes
  SET attempts = attempts + 1
  WHERE session_id = p_session_id
  RETURNING attempts;
$$;


ALTER FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE user_id = p_user_id
  AND used_at IS NULL;
$$;


ALTER FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.users
  SET email_verified = true, updated_at = NOW()
  WHERE id = p_user_id;
$$;


ALTER FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.otp_codes
  SET
    used = true,
    access_token_encrypted = NULL,
    refresh_token_encrypted = NULL
  WHERE session_id = p_session_id;
$$;


ALTER FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE id = p_token_id;
$$;


ALTER FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  UPDATE public.users
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE id = p_user_id;
$$;


ALTER FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_mission_progress_for_eligible_users"("p_client_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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
        OR (ut.tier_order IS NOT NULL AND mt.tier_order IS NOT NULL AND ut.tier_order >=
  mt.tier_order)
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


ALTER FUNCTION "public"."create_mission_progress_for_eligible_users"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") RETURNS TABLE("boost_redemption_id" "uuid", "redemption_id" "uuid", "user_id" "uuid", "sales_at_activation" numeric, "sales_at_expiration" numeric, "sales_delta" numeric, "boost_rate" numeric, "final_payout_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) RETURNS TABLE("mission_id" "uuid", "mission_type" character varying, "mission_display_name" character varying, "mission_title" character varying, "mission_description" "text", "mission_target_value" integer, "mission_target_unit" character varying, "mission_raffle_end_date" timestamp without time zone, "mission_activated" boolean, "mission_tier_eligibility" character varying, "mission_preview_from_tier" character varying, "mission_enabled" boolean, "mission_display_order" integer, "mission_reward_id" "uuid", "reward_id" "uuid", "reward_type" character varying, "reward_name" character varying, "reward_description" character varying, "reward_value_data" "jsonb", "reward_redemption_type" character varying, "reward_source" character varying, "tier_id" character varying, "tier_name" character varying, "tier_color" character varying, "tier_order" integer, "progress_id" "uuid", "progress_current_value" integer, "progress_status" character varying, "progress_completed_at" timestamp without time zone, "progress_checkpoint_start" timestamp without time zone, "progress_checkpoint_end" timestamp without time zone, "redemption_id" "uuid", "redemption_status" character varying, "redemption_claimed_at" timestamp without time zone, "redemption_fulfilled_at" timestamp without time zone, "redemption_concluded_at" timestamp without time zone, "redemption_rejected_at" timestamp without time zone, "redemption_scheduled_activation_date" "date", "redemption_scheduled_activation_time" time without time zone, "redemption_activation_date" timestamp without time zone, "redemption_expiration_date" timestamp without time zone, "boost_status" character varying, "boost_scheduled_activation_date" "date", "boost_activated_at" timestamp without time zone, "boost_expires_at" timestamp without time zone, "boost_duration_days" integer, "physical_gift_shipped_at" timestamp without time zone, "physical_gift_shipping_city" character varying, "physical_gift_requires_size" boolean, "raffle_is_winner" boolean, "raffle_participated_at" timestamp without time zone, "raffle_winner_selected_at" timestamp without time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
      m.id, m.mission_type, m.display_name, m.title, m.description,
      m.target_value, m.target_unit, m.raffle_end_date, m.activated,
      m.tier_eligibility, m.preview_from_tier, m.enabled, m.display_order, m.reward_id,
      r.id, r.type, r.name, r.description, r.value_data, r.redemption_type, r.reward_source,
      t.tier_id, t.tier_name, t.tier_color, t.tier_order,
      mp.id, mp.current_value, mp.status, mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
      red.id, red.status, red.claimed_at, red.fulfilled_at, red.concluded_at, red.rejected_at,
      red.scheduled_activation_date, red.scheduled_activation_time, red.activation_date, red.expiration_date,
      cb.boost_status, cb.scheduled_activation_date, cb.activated_at, cb.expires_at, cb.duration_days,
      pg.shipped_at, pg.shipping_city, pg.requires_size,
      rp.is_winner, rp.participated_at, rp.winner_selected_at
    FROM missions m
    INNER JOIN rewards r ON m.reward_id = r.id
    INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
    LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = p_user_id AND mp.client_id = p_client_id
    LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
      AND red.user_id = p_user_id
      AND red.client_id = p_client_id
      AND red.status NOT IN ('concluded', 'rejected')
      AND red.deleted_at IS NULL
    LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
    LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
    LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
    WHERE m.client_id = p_client_id
      AND (
        (m.enabled = true AND (
          m.tier_eligibility = p_current_tier
          OR m.tier_eligibility = 'all'
          OR m.preview_from_tier = p_current_tier
        ))
        OR red.id IS NOT NULL
      )
    ORDER BY m.display_order ASC;
  $$;


ALTER FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_rewards"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying, "p_current_tier_order" integer) RETURNS TABLE("reward_id" "uuid", "reward_type" character varying, "reward_name" character varying, "reward_description" character varying, "reward_value_data" "jsonb", "reward_tier_eligibility" character varying, "reward_preview_from_tier" character varying, "reward_redemption_frequency" character varying, "reward_redemption_quantity" integer, "reward_redemption_type" character varying, "reward_source" character varying, "reward_display_order" integer, "reward_enabled" boolean, "reward_expires_days" integer, "tier_id" character varying, "tier_name" character varying, "tier_color" character varying, "tier_order" integer, "redemption_id" "uuid", "redemption_status" character varying, "redemption_claimed_at" timestamp without time zone, "redemption_scheduled_activation_date" "date", "redemption_scheduled_activation_time" time without time zone, "redemption_activation_date" timestamp without time zone, "redemption_expiration_date" timestamp without time zone, "redemption_fulfilled_at" timestamp without time zone, "boost_status" character varying, "boost_scheduled_activation_date" "date", "boost_activated_at" timestamp without time zone, "boost_expires_at" timestamp without time zone, "boost_duration_days" integer, "boost_rate" numeric, "boost_sales_at_expiration" numeric, "physical_gift_requires_size" boolean, "physical_gift_size_value" character varying, "physical_gift_shipping_city" character varying, "physical_gift_shipped_at" timestamp without time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
      r.id, r.type, r.name, r.description, r.value_data, r.tier_eligibility, r.preview_from_tier,
      r.redemption_frequency, r.redemption_quantity, r.redemption_type, r.reward_source,
      r.display_order, r.enabled, r.expires_days,
      t.tier_id, t.tier_name, t.tier_color, t.tier_order,
      red.id, red.status, red.claimed_at, red.scheduled_activation_date, red.scheduled_activation_time,
      red.activation_date, red.expiration_date, red.fulfilled_at,
      cb.boost_status, cb.scheduled_activation_date, cb.activated_at, cb.expires_at,
      cb.duration_days, cb.boost_rate, cb.sales_at_expiration,
      pg.requires_size, pg.size_value, pg.shipping_city, pg.shipped_at
    FROM rewards r
    INNER JOIN tiers t ON r.tier_eligibility = t.tier_id AND r.client_id = t.client_id
    LEFT JOIN redemptions red ON r.id = red.reward_id
      AND red.user_id = p_user_id
      AND red.client_id = p_client_id
      AND red.mission_progress_id IS NULL
      AND red.status NOT IN ('concluded', 'rejected')
      AND red.deleted_at IS NULL
    LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
    LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
    WHERE r.client_id = p_client_id
      AND r.reward_source = 'vip_tier'
      AND (
        (r.enabled = true AND (
          r.tier_eligibility = p_current_tier
          OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
        ))
        OR red.id IS NOT NULL
      )
    ORDER BY r.display_order ASC;
  $$;


ALTER FUNCTION "public"."get_available_rewards"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying, "p_current_tier_order" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_client_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (SELECT client_id FROM public.users WHERE id = auth.uid())
  END;
$$;


ALTER FUNCTION "public"."get_current_user_client_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") RETURNS TABLE("redemption_id" "uuid", "redemption_status" character varying, "redemption_claimed_at" timestamp without time zone, "redemption_fulfilled_at" timestamp without time zone, "redemption_concluded_at" timestamp without time zone, "redemption_rejected_at" timestamp without time zone, "mission_id" "uuid", "mission_type" character varying, "mission_display_name" character varying, "reward_id" "uuid", "reward_type" character varying, "reward_name" character varying, "reward_description" "text", "reward_value_data" "jsonb", "reward_source" character varying, "progress_completed_at" timestamp without time zone, "raffle_is_winner" boolean, "raffle_participated_at" timestamp without time zone, "raffle_winner_selected_at" timestamp without time zone)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT
      red.id,
      red.status,
      red.claimed_at,
      red.fulfilled_at,
      red.concluded_at,
      red.rejected_at,
      m.id,
      m.mission_type,
      m.display_name,
      r.id,
      r.type,
      r.name,
      r.description,
      r.value_data,
      r.reward_source,
      mp.completed_at,
      rp.is_winner,
      rp.participated_at,
      rp.winner_selected_at
    FROM redemptions red
    INNER JOIN mission_progress mp ON red.mission_progress_id = mp.id
    INNER JOIN missions m ON mp.mission_id = m.id
    INNER JOIN rewards r ON m.reward_id = r.id
    LEFT JOIN raffle_participations rp ON mp.id = rp.mission_progress_id
      AND rp.user_id = p_user_id
    WHERE red.user_id = p_user_id
      AND red.client_id = p_client_id
      AND red.status IN ('concluded', 'rejected')
      AND red.deleted_at IS NULL
      AND red.mission_progress_id IS NOT NULL
    ORDER BY COALESCE(red.concluded_at, red.rejected_at) DESC;
  $$;


ALTER FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND client_id = p_client_id
      AND is_admin = true
    )
  END;
$$;


ALTER FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_boost_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.boost_status IS DISTINCT FROM NEW.boost_status THEN
        INSERT INTO commission_boost_state_history (
            boost_redemption_id,
            client_id,
            from_status,
            to_status,
            transitioned_by,
            transition_type
        )
        VALUES (
            NEW.id,
            NEW.client_id,
            OLD.boost_status,
            NEW.boost_status,
            NULLIF(current_setting('app.current_user_id', true), '')::UUID,
            CASE
                WHEN current_setting('app.current_user_id', true) = '' THEN 'cron'
                ELSE 'manual'
            END
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_boost_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_boost_to_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only sync if boost_status actually changed
    IF OLD.boost_status IS DISTINCT FROM NEW.boost_status THEN
        UPDATE redemptions
        SET
            status = CASE
                WHEN NEW.boost_status IN ('scheduled', 'active', 'expired', 'pending_info') THEN 'claimed'
                WHEN NEW.boost_status = 'pending_payout' THEN 'fulfilled'
                WHEN NEW.boost_status = 'paid' THEN 'concluded'
                ELSE status  -- No change for unknown states
            END,
            updated_at = NOW()
        WHERE id = NEW.redemption_id;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_boost_to_redemption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") RETURNS TABLE("boost_redemption_id" "uuid", "redemption_id" "uuid", "user_id" "uuid", "final_payout_amount" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  $$;


ALTER FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_mission_progress"("p_client_id" "uuid", "p_user_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."update_mission_progress"("p_client_id" "uuid", "p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "subdomain" character varying(100),
    "logo_url" "text",
    "primary_color" character varying(7) DEFAULT '#6366f1'::character varying,
    "tier_calculation_mode" character varying(50) DEFAULT 'fixed_checkpoint'::character varying,
    "checkpoint_months" integer DEFAULT 4,
    "vip_metric" character varying(10) DEFAULT 'units'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clients_tier_calculation_mode_check" CHECK ((("tier_calculation_mode")::"text" = ANY ((ARRAY['fixed_checkpoint'::character varying, 'lifetime'::character varying])::"text"[]))),
    CONSTRAINT "clients_vip_metric_check" CHECK ((("vip_metric")::"text" = ANY ((ARRAY['units'::character varying, 'sales'::character varying])::"text"[])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_boost_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "redemption_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "boost_status" character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    "scheduled_activation_date" "date" NOT NULL,
    "activated_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "duration_days" integer DEFAULT 30 NOT NULL,
    "boost_rate" numeric(5,2) NOT NULL,
    "tier_commission_rate" numeric(5,2),
    "sales_at_activation" numeric(10,2),
    "sales_at_expiration" numeric(10,2),
    "sales_delta" numeric(10,2) GENERATED ALWAYS AS (GREATEST((0)::numeric, ("sales_at_expiration" - "sales_at_activation"))) STORED,
    "calculated_commission" numeric(10,2),
    "admin_adjusted_commission" numeric(10,2),
    "final_payout_amount" numeric(10,2),
    "payment_method" character varying(20),
    "payment_account" character varying(255),
    "payment_account_confirm" character varying(255),
    "payment_info_collected_at" timestamp with time zone,
    "payment_info_confirmed" boolean DEFAULT false,
    "payout_sent_at" timestamp with time zone,
    "payout_sent_by" "uuid",
    "payout_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "commission_boost_redemptions_boost_status_check" CHECK ((("boost_status")::"text" = ANY ((ARRAY['scheduled'::character varying, 'active'::character varying, 'expired'::character varying, 'pending_info'::character varying, 'pending_payout'::character varying, 'paid'::character varying])::"text"[]))),
    CONSTRAINT "commission_boost_redemptions_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['venmo'::character varying, 'paypal'::character varying])::"text"[])))
);


ALTER TABLE "public"."commission_boost_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_boost_state_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "boost_redemption_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "from_status" character varying(50),
    "to_status" character varying(50),
    "transitioned_at" timestamp with time zone DEFAULT "now"(),
    "transitioned_by" "uuid",
    "transition_type" character varying(50),
    "notes" "text",
    "metadata" "jsonb",
    CONSTRAINT "commission_boost_state_history_transition_type_check" CHECK ((("transition_type")::"text" = ANY ((ARRAY['manual'::character varying, 'cron'::character varying, 'api'::character varying])::"text"[])))
);


ALTER TABLE "public"."commission_boost_state_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."handle_changes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "old_handle" character varying(100) NOT NULL,
    "new_handle" character varying(100) NOT NULL,
    "detected_at" timestamp with time zone DEFAULT "now"(),
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."handle_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mission_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "mission_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "current_value" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'active'::character varying,
    "completed_at" timestamp with time zone,
    "checkpoint_start" timestamp with time zone,
    "checkpoint_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mission_progress_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'dormant'::character varying, 'completed'::character varying])::"text"[])))
);


ALTER TABLE "public"."mission_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."missions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "title" character varying(255) NOT NULL,
    "display_name" character varying(255) NOT NULL,
    "description" "text",
    "mission_type" character varying(50) NOT NULL,
    "target_value" integer NOT NULL,
    "target_unit" character varying(20) DEFAULT 'dollars'::character varying NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "tier_eligibility" character varying(50) NOT NULL,
    "preview_from_tier" character varying(50),
    "display_order" integer NOT NULL,
    "raffle_end_date" timestamp with time zone,
    "enabled" boolean DEFAULT true,
    "activated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_non_raffle_fields" CHECK (((("mission_type")::"text" = 'raffle'::"text") OR ((("mission_type")::"text" <> 'raffle'::"text") AND ("raffle_end_date" IS NULL)))),
    CONSTRAINT "check_raffle_requirements" CHECK (((("mission_type")::"text" <> 'raffle'::"text") OR ((("mission_type")::"text" = 'raffle'::"text") AND ("raffle_end_date" IS NOT NULL) AND ("target_value" = 0)))),
    CONSTRAINT "missions_mission_type_check" CHECK ((("mission_type")::"text" = ANY ((ARRAY['sales_dollars'::character varying, 'sales_units'::character varying, 'videos'::character varying, 'views'::character varying, 'likes'::character varying, 'raffle'::character varying])::"text"[]))),
    CONSTRAINT "missions_preview_from_tier_check" CHECK ((("preview_from_tier" IS NULL) OR (("preview_from_tier")::"text" = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying])::"text"[])))),
    CONSTRAINT "missions_target_unit_check" CHECK ((("target_unit")::"text" = ANY ((ARRAY['dollars'::character varying, 'units'::character varying, 'count'::character varying])::"text"[]))),
    CONSTRAINT "missions_tier_eligibility_check" CHECK (((("tier_eligibility")::"text" = 'all'::"text") OR (("tier_eligibility")::"text" = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying])::"text"[]))))
);


ALTER TABLE "public"."missions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" character varying(100) NOT NULL,
    "code_hash" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "attempts" integer DEFAULT 0,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "access_token_encrypted" "text",
    "refresh_token_encrypted" "text"
);


ALTER TABLE "public"."otp_codes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."otp_codes"."access_token_encrypted" IS 'AES-256-GCM encrypted Supabase access_token from signup (cleared after use)';



COMMENT ON COLUMN "public"."otp_codes"."refresh_token_encrypted" IS 'AES-256-GCM encrypted Supabase refresh_token from signup (cleared after use)';



CREATE TABLE IF NOT EXISTS "public"."password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_hash" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "ip_address" character varying(45)
);


ALTER TABLE "public"."password_reset_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."physical_gift_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "redemption_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "requires_size" boolean DEFAULT false,
    "size_category" character varying(50),
    "size_value" character varying(20),
    "size_submitted_at" timestamp with time zone,
    "shipping_recipient_first_name" character varying(100) NOT NULL,
    "shipping_recipient_last_name" character varying(100) NOT NULL,
    "shipping_address_line1" character varying(255) NOT NULL,
    "shipping_address_line2" character varying(255),
    "shipping_city" character varying(100) NOT NULL,
    "shipping_state" character varying(100) NOT NULL,
    "shipping_postal_code" character varying(20) NOT NULL,
    "shipping_country" character varying(100) DEFAULT 'USA'::character varying,
    "shipping_phone" character varying(50),
    "shipping_info_submitted_at" timestamp with time zone NOT NULL,
    "tracking_number" character varying(100),
    "carrier" character varying(50),
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_size_required" CHECK ((("requires_size" = false) OR (("requires_size" = true) AND ("size_category" IS NOT NULL) AND ("size_value" IS NOT NULL)))),
    CONSTRAINT "physical_gift_redemptions_carrier_check" CHECK ((("carrier" IS NULL) OR (("carrier")::"text" = ANY ((ARRAY['FedEx'::character varying, 'UPS'::character varying, 'USPS'::character varying, 'DHL'::character varying])::"text"[])))),
    CONSTRAINT "physical_gift_redemptions_size_category_check" CHECK ((("size_category" IS NULL) OR (("size_category")::"text" = ANY ((ARRAY['clothing'::character varying, 'shoes'::character varying])::"text"[]))))
);


ALTER TABLE "public"."physical_gift_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raffle_participations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mission_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "mission_progress_id" "uuid" NOT NULL,
    "redemption_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "participated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_winner" boolean,
    "winner_selected_at" timestamp with time zone,
    "selected_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_winner_consistency" CHECK (((("is_winner" IS NULL) AND ("winner_selected_at" IS NULL)) OR (("is_winner" IS NOT NULL) AND ("winner_selected_at" IS NOT NULL))))
);


ALTER TABLE "public"."raffle_participations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "reward_id" "uuid",
    "mission_progress_id" "uuid",
    "client_id" "uuid",
    "status" character varying(50) DEFAULT 'claimable'::character varying,
    "tier_at_claim" character varying(50) NOT NULL,
    "redemption_type" character varying(50) NOT NULL,
    "claimed_at" timestamp with time zone,
    "scheduled_activation_date" "date",
    "scheduled_activation_time" time without time zone,
    "activation_date" timestamp with time zone,
    "expiration_date" timestamp with time zone,
    "google_calendar_event_id" character varying(255),
    "fulfilled_at" timestamp with time zone,
    "fulfilled_by" "uuid",
    "fulfillment_notes" "text",
    "concluded_at" timestamp with time zone,
    "rejection_reason" "text",
    "rejected_at" timestamp with time zone,
    "external_transaction_id" character varying(255),
    "deleted_at" timestamp with time zone,
    "deleted_reason" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "redemptions_redemption_type_check" CHECK ((("redemption_type")::"text" = ANY ((ARRAY['instant'::character varying, 'scheduled'::character varying])::"text"[]))),
    CONSTRAINT "redemptions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['claimable'::character varying, 'claimed'::character varying, 'fulfilled'::character varying, 'concluded'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid",
    "type" character varying(100) NOT NULL,
    "name" character varying(255),
    "description" character varying(12),
    "value_data" "jsonb",
    "reward_source" character varying(50) DEFAULT 'mission'::character varying NOT NULL,
    "tier_eligibility" character varying(50) NOT NULL,
    "enabled" boolean DEFAULT false,
    "preview_from_tier" character varying(50),
    "redemption_frequency" character varying(50) DEFAULT 'unlimited'::character varying,
    "redemption_quantity" integer DEFAULT 1,
    "redemption_type" character varying(50) DEFAULT 'instant'::character varying NOT NULL,
    "expires_days" integer,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_discount_value_data" CHECK (((("type")::"text" <> 'discount'::"text") OR ((("value_data" ->> 'percent'::"text") IS NOT NULL) AND (((("value_data" ->> 'percent'::"text"))::numeric >= (1)::numeric) AND ((("value_data" ->> 'percent'::"text"))::numeric <= (100)::numeric)) AND (("value_data" ->> 'duration_minutes'::"text") IS NOT NULL) AND (((("value_data" ->> 'duration_minutes'::"text"))::integer >= 10) AND ((("value_data" ->> 'duration_minutes'::"text"))::integer <= 525600)) AND (("value_data" ->> 'coupon_code'::"text") IS NOT NULL) AND (("length"(("value_data" ->> 'coupon_code'::"text")) >= 2) AND ("length"(("value_data" ->> 'coupon_code'::"text")) <= 8)) AND (("value_data" ->> 'coupon_code'::"text") ~ '^[A-Z0-9]+$'::"text") AND ((("value_data" ->> 'max_uses'::"text") IS NULL) OR ((("value_data" ->> 'max_uses'::"text"))::integer > 0))))),
    CONSTRAINT "check_quantity_with_frequency" CHECK ((((("redemption_frequency")::"text" = 'unlimited'::"text") AND ("redemption_quantity" IS NULL)) OR ((("redemption_frequency")::"text" <> 'unlimited'::"text") AND ("redemption_quantity" >= 1) AND ("redemption_quantity" <= 10)))),
    CONSTRAINT "rewards_preview_from_tier_check" CHECK ((("preview_from_tier" IS NULL) OR (("preview_from_tier")::"text" = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying])::"text"[])))),
    CONSTRAINT "rewards_redemption_frequency_check" CHECK ((("redemption_frequency")::"text" = ANY ((ARRAY['one-time'::character varying, 'monthly'::character varying, 'weekly'::character varying, 'unlimited'::character varying])::"text"[]))),
    CONSTRAINT "rewards_redemption_type_check" CHECK ((("redemption_type")::"text" = ANY ((ARRAY['instant'::character varying, 'scheduled'::character varying])::"text"[]))),
    CONSTRAINT "rewards_reward_source_check" CHECK ((("reward_source")::"text" = ANY ((ARRAY['vip_tier'::character varying, 'mission'::character varying])::"text"[]))),
    CONSTRAINT "rewards_tier_eligibility_check" CHECK ((("tier_eligibility")::"text" = ANY ((ARRAY['tier_1'::character varying, 'tier_2'::character varying, 'tier_3'::character varying, 'tier_4'::character varying, 'tier_5'::character varying, 'tier_6'::character varying])::"text"[]))),
    CONSTRAINT "rewards_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['gift_card'::character varying, 'commission_boost'::character varying, 'spark_ads'::character varying, 'discount'::character varying, 'physical_gift'::character varying, 'experience'::character varying])::"text"[])))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "amount" numeric(10,2),
    "amount_units" integer,
    "reason" "text" NOT NULL,
    "adjustment_type" character varying(50) NOT NULL,
    "adjusted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "applied_at" timestamp with time zone,
    CONSTRAINT "sales_adjustments_adjustment_type_check" CHECK ((("adjustment_type")::"text" = ANY ((ARRAY['manual_sale'::character varying, 'refund'::character varying, 'bonus'::character varying, 'correction'::character varying])::"text"[])))
);


ALTER TABLE "public"."sales_adjustments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'running'::character varying NOT NULL,
    "source" character varying(50) DEFAULT 'auto'::character varying NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "records_processed" integer DEFAULT 0,
    "error_message" "text",
    "file_name" character varying(255),
    "triggered_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_logs_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['auto'::character varying, 'manual'::character varying])::"text"[]))),
    CONSTRAINT "sync_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tier_checkpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "checkpoint_date" timestamp with time zone NOT NULL,
    "period_start_date" timestamp with time zone NOT NULL,
    "period_end_date" timestamp with time zone NOT NULL,
    "sales_in_period" numeric(10,2),
    "sales_required" numeric(10,2),
    "units_in_period" integer,
    "units_required" integer,
    "tier_before" character varying(50) NOT NULL,
    "tier_after" character varying(50) NOT NULL,
    "status" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tier_checkpoints_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['maintained'::character varying, 'promoted'::character varying, 'demoted'::character varying])::"text"[])))
);


ALTER TABLE "public"."tier_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "tier_order" integer NOT NULL,
    "tier_id" character varying(50) NOT NULL,
    "tier_name" character varying(100) NOT NULL,
    "tier_color" character varying(7) NOT NULL,
    "sales_threshold" numeric(10,2),
    "units_threshold" integer,
    "commission_rate" numeric(5,2) NOT NULL,
    "checkpoint_exempt" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "tiktok_handle" character varying(100) NOT NULL,
    "email" character varying(255),
    "email_verified" boolean DEFAULT false,
    "password_hash" character varying(255) NOT NULL,
    "terms_accepted_at" timestamp with time zone,
    "terms_version" character varying(50),
    "is_admin" boolean DEFAULT false,
    "current_tier" character varying(50) DEFAULT 'tier_1'::character varying,
    "tier_achieved_at" timestamp with time zone,
    "next_checkpoint_at" timestamp with time zone,
    "checkpoint_sales_target" numeric(10,2),
    "checkpoint_units_target" integer,
    "default_payment_method" character varying(20),
    "default_payment_account" character varying(255),
    "payment_info_updated_at" timestamp with time zone,
    "leaderboard_rank" integer,
    "total_sales" numeric(10,2),
    "total_units" integer,
    "manual_adjustments_total" numeric(10,2),
    "manual_adjustments_units" integer,
    "checkpoint_sales_current" numeric(10,2),
    "checkpoint_units_current" integer,
    "projected_tier_at_checkpoint" "uuid",
    "checkpoint_videos_posted" integer,
    "checkpoint_total_views" bigint,
    "checkpoint_total_likes" bigint,
    "checkpoint_total_comments" bigint,
    "next_tier_name" character varying(100),
    "next_tier_threshold" numeric(10,2),
    "next_tier_threshold_units" integer,
    "checkpoint_progress_updated_at" timestamp with time zone,
    "first_video_date" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_default_payment_method_check" CHECK ((("default_payment_method")::"text" = ANY ((ARRAY['paypal'::character varying, 'venmo'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "video_url" "text" NOT NULL,
    "video_title" "text",
    "post_date" "date" NOT NULL,
    "views" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "gmv" numeric(10,2) DEFAULT 0,
    "ctr" numeric(5,2),
    "units_sold" integer DEFAULT 0,
    "sync_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_redemption_id_key" UNIQUE ("redemption_id");



ALTER TABLE ONLY "public"."commission_boost_state_history"
    ADD CONSTRAINT "commission_boost_state_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."handle_changes"
    ADD CONSTRAINT "handle_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_user_id_mission_id_checkpoint_start_key" UNIQUE ("user_id", "mission_id", "checkpoint_start");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_client_id_tier_eligibility_mission_type_display_or_key" UNIQUE ("client_id", "tier_eligibility", "mission_type", "display_order");



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_gift_redemptions"
    ADD CONSTRAINT "physical_gift_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."physical_gift_redemptions"
    ADD CONSTRAINT "physical_gift_redemptions_redemption_id_key" UNIQUE ("redemption_id");



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_mission_id_user_id_key" UNIQUE ("mission_id", "user_id");



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_id_client_id_key" UNIQUE ("id", "client_id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_adjustments"
    ADD CONSTRAINT "sales_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tier_checkpoints"
    ADD CONSTRAINT "tier_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_client_id_tier_id_key" UNIQUE ("client_id", "tier_id");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_client_id_tier_order_key" UNIQUE ("client_id", "tier_order");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_video_url_key" UNIQUE ("video_url");



CREATE INDEX "idx_boost_history_redemption" ON "public"."commission_boost_state_history" USING "btree" ("boost_redemption_id", "transitioned_at");



CREATE INDEX "idx_boost_history_transitioned_by" ON "public"."commission_boost_state_history" USING "btree" ("transitioned_by") WHERE ("transitioned_by" IS NOT NULL);



CREATE INDEX "idx_boost_redemption" ON "public"."commission_boost_redemptions" USING "btree" ("redemption_id");



CREATE INDEX "idx_boost_scheduled" ON "public"."commission_boost_redemptions" USING "btree" ("scheduled_activation_date");



CREATE INDEX "idx_boost_status" ON "public"."commission_boost_redemptions" USING "btree" ("boost_status");



CREATE INDEX "idx_boost_tenant" ON "public"."commission_boost_redemptions" USING "btree" ("client_id", "boost_status");



CREATE INDEX "idx_handle_changes_user" ON "public"."handle_changes" USING "btree" ("user_id");



CREATE INDEX "idx_mission_progress_status" ON "public"."mission_progress" USING "btree" ("status");



CREATE INDEX "idx_mission_progress_tenant" ON "public"."mission_progress" USING "btree" ("client_id", "user_id", "status");



CREATE INDEX "idx_mission_progress_user" ON "public"."mission_progress" USING "btree" ("user_id");



CREATE INDEX "idx_missions_client" ON "public"."missions" USING "btree" ("client_id");



CREATE INDEX "idx_missions_lookup" ON "public"."missions" USING "btree" ("client_id", "enabled", "tier_eligibility", "display_order");



CREATE INDEX "idx_missions_tier" ON "public"."missions" USING "btree" ("tier_eligibility");



CREATE INDEX "idx_otp_expires" ON "public"."otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_otp_session" ON "public"."otp_codes" USING "btree" ("session_id");



CREATE INDEX "idx_password_reset_expires_at" ON "public"."password_reset_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_password_reset_token_hash" ON "public"."password_reset_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_password_reset_user_id" ON "public"."password_reset_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_physical_gift_pending" ON "public"."physical_gift_redemptions" USING "btree" ("created_at") WHERE ("shipped_at" IS NULL);



CREATE INDEX "idx_physical_gift_redemption" ON "public"."physical_gift_redemptions" USING "btree" ("redemption_id");



CREATE INDEX "idx_physical_gift_shipped" ON "public"."physical_gift_redemptions" USING "btree" ("shipped_at") WHERE ("shipped_at" IS NOT NULL);



CREATE INDEX "idx_raffle_mission" ON "public"."raffle_participations" USING "btree" ("mission_id", "is_winner");



CREATE INDEX "idx_raffle_redemption" ON "public"."raffle_participations" USING "btree" ("redemption_id");



CREATE INDEX "idx_raffle_user" ON "public"."raffle_participations" USING "btree" ("user_id", "mission_id");



CREATE INDEX "idx_raffle_winner" ON "public"."raffle_participations" USING "btree" ("is_winner", "winner_selected_at") WHERE ("is_winner" = true);



CREATE INDEX "idx_redemptions_active" ON "public"."redemptions" USING "btree" ("user_id", "status", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_redemptions_active_period" ON "public"."redemptions" USING "btree" ("user_id", "status", "activation_date", "expiration_date") WHERE (("activation_date" IS NOT NULL) AND ("expiration_date" IS NOT NULL));



CREATE INDEX "idx_redemptions_reward" ON "public"."redemptions" USING "btree" ("reward_id");



CREATE INDEX "idx_redemptions_scheduled" ON "public"."redemptions" USING "btree" ("scheduled_activation_date", "scheduled_activation_time") WHERE ("scheduled_activation_date" IS NOT NULL);



CREATE INDEX "idx_redemptions_status" ON "public"."redemptions" USING "btree" ("status");



CREATE INDEX "idx_redemptions_tenant" ON "public"."redemptions" USING "btree" ("client_id", "user_id", "status");



CREATE UNIQUE INDEX "idx_redemptions_unique_mission" ON "public"."redemptions" USING "btree" ("user_id", "mission_progress_id") WHERE ("mission_progress_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_redemptions_unique_vip" ON "public"."redemptions" USING "btree" ("user_id", "reward_id", "tier_at_claim", "claimed_at") WHERE ("claimed_at" IS NOT NULL);



CREATE INDEX "idx_redemptions_user" ON "public"."redemptions" USING "btree" ("user_id");



CREATE INDEX "idx_rewards_client" ON "public"."rewards" USING "btree" ("client_id");



CREATE INDEX "idx_rewards_lookup" ON "public"."rewards" USING "btree" ("client_id", "enabled", "tier_eligibility", "reward_source", "display_order");



CREATE INDEX "idx_rewards_source" ON "public"."rewards" USING "btree" ("reward_source");



CREATE INDEX "idx_rewards_tier" ON "public"."rewards" USING "btree" ("tier_eligibility");



CREATE INDEX "idx_rewards_type" ON "public"."rewards" USING "btree" ("type");



CREATE INDEX "idx_sales_adjustments_client" ON "public"."sales_adjustments" USING "btree" ("client_id");



CREATE INDEX "idx_sales_adjustments_user" ON "public"."sales_adjustments" USING "btree" ("user_id");



CREATE INDEX "idx_sync_logs_client" ON "public"."sync_logs" USING "btree" ("client_id");



CREATE INDEX "idx_sync_logs_recent" ON "public"."sync_logs" USING "btree" ("client_id", "started_at" DESC);



CREATE INDEX "idx_sync_logs_status" ON "public"."sync_logs" USING "btree" ("client_id", "status");



CREATE INDEX "idx_tier_checkpoints_client" ON "public"."tier_checkpoints" USING "btree" ("client_id");



CREATE INDEX "idx_tier_checkpoints_user" ON "public"."tier_checkpoints" USING "btree" ("user_id");



CREATE INDEX "idx_tiers_client" ON "public"."tiers" USING "btree" ("client_id");



CREATE INDEX "idx_users_client" ON "public"."users" USING "btree" ("client_id");



CREATE INDEX "idx_users_leaderboard_rank" ON "public"."users" USING "btree" ("client_id", "leaderboard_rank") WHERE ("leaderboard_rank" IS NOT NULL);



CREATE INDEX "idx_users_tiktok_handle" ON "public"."users" USING "btree" ("client_id", "tiktok_handle");



CREATE INDEX "idx_users_total_sales" ON "public"."users" USING "btree" ("client_id", "total_sales" DESC) WHERE ("total_sales" IS NOT NULL);



CREATE INDEX "idx_users_total_units" ON "public"."users" USING "btree" ("client_id", "total_units" DESC) WHERE ("total_units" IS NOT NULL);



CREATE INDEX "idx_videos_client" ON "public"."videos" USING "btree" ("client_id");



CREATE INDEX "idx_videos_post_date" ON "public"."videos" USING "btree" ("user_id", "post_date");



CREATE INDEX "idx_videos_user" ON "public"."videos" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "sync_boost_status" AFTER UPDATE ON "public"."commission_boost_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_boost_to_redemption"();



CREATE OR REPLACE TRIGGER "track_boost_transitions" AFTER UPDATE ON "public"."commission_boost_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."log_boost_transition"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_commission_boost_redemptions_updated_at" BEFORE UPDATE ON "public"."commission_boost_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_mission_progress_updated_at" BEFORE UPDATE ON "public"."mission_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_physical_gift_redemptions_updated_at" BEFORE UPDATE ON "public"."physical_gift_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_raffle_participations_updated_at" BEFORE UPDATE ON "public"."raffle_participations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_redemptions_updated_at" BEFORE UPDATE ON "public"."redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_rewards_updated_at" BEFORE UPDATE ON "public"."rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_tiers_updated_at" BEFORE UPDATE ON "public"."tiers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_videos_updated_at" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_payout_sent_by_fkey" FOREIGN KEY ("payout_sent_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_redemption_id_client_id_fkey" FOREIGN KEY ("redemption_id", "client_id") REFERENCES "public"."redemptions"("id", "client_id");



ALTER TABLE ONLY "public"."commission_boost_redemptions"
    ADD CONSTRAINT "commission_boost_redemptions_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_boost_state_history"
    ADD CONSTRAINT "commission_boost_state_history_boost_redemption_id_fkey" FOREIGN KEY ("boost_redemption_id") REFERENCES "public"."commission_boost_redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_boost_state_history"
    ADD CONSTRAINT "commission_boost_state_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."commission_boost_state_history"
    ADD CONSTRAINT "commission_boost_state_history_transitioned_by_fkey" FOREIGN KEY ("transitioned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."handle_changes"
    ADD CONSTRAINT "handle_changes_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."handle_changes"
    ADD CONSTRAINT "handle_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_progress"
    ADD CONSTRAINT "mission_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."missions"
    ADD CONSTRAINT "missions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."otp_codes"
    ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."password_reset_tokens"
    ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."physical_gift_redemptions"
    ADD CONSTRAINT "physical_gift_redemptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."physical_gift_redemptions"
    ADD CONSTRAINT "physical_gift_redemptions_redemption_id_client_id_fkey" FOREIGN KEY ("redemption_id", "client_id") REFERENCES "public"."redemptions"("id", "client_id");



ALTER TABLE ONLY "public"."physical_gift_redemptions"
    ADD CONSTRAINT "physical_gift_redemptions_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_mission_progress_id_fkey" FOREIGN KEY ("mission_progress_id") REFERENCES "public"."mission_progress"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_redemption_id_client_id_fkey" FOREIGN KEY ("redemption_id", "client_id") REFERENCES "public"."redemptions"("id", "client_id");



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_redemption_id_fkey" FOREIGN KEY ("redemption_id") REFERENCES "public"."redemptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_selected_by_fkey" FOREIGN KEY ("selected_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."raffle_participations"
    ADD CONSTRAINT "raffle_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_fulfilled_by_fkey" FOREIGN KEY ("fulfilled_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_mission_progress_id_fkey" FOREIGN KEY ("mission_progress_id") REFERENCES "public"."mission_progress"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."redemptions"
    ADD CONSTRAINT "redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_adjustments"
    ADD CONSTRAINT "sales_adjustments_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_adjustments"
    ADD CONSTRAINT "sales_adjustments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."sales_adjustments"
    ADD CONSTRAINT "sales_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."sync_logs"
    ADD CONSTRAINT "sync_logs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tier_checkpoints"
    ADD CONSTRAINT "tier_checkpoints_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."tier_checkpoints"
    ADD CONSTRAINT "tier_checkpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tiers"
    ADD CONSTRAINT "tiers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



CREATE POLICY "admin_full_access_boost_history" ON "public"."commission_boost_state_history" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_boost_redemptions" ON "public"."commission_boost_redemptions" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_clients" ON "public"."clients" USING ("public"."is_admin_of_client"("id"));



CREATE POLICY "admin_full_access_handle_changes" ON "public"."handle_changes" USING ("public"."is_admin_of_client"(( SELECT "users"."client_id"
   FROM "public"."users"
  WHERE ("users"."id" = "handle_changes"."user_id"))));



CREATE POLICY "admin_full_access_mission_progress" ON "public"."mission_progress" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_missions" ON "public"."missions" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_physical_gift_redemptions" ON "public"."physical_gift_redemptions" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_raffle_participations" ON "public"."raffle_participations" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_redemptions" ON "public"."redemptions" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_rewards" ON "public"."rewards" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_sales_adjustments" ON "public"."sales_adjustments" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_sync_logs" ON "public"."sync_logs" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_tier_checkpoints" ON "public"."tier_checkpoints" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_tiers" ON "public"."tiers" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_users" ON "public"."users" USING ("public"."is_admin_of_client"("client_id"));



CREATE POLICY "admin_full_access_videos" ON "public"."videos" USING ("public"."is_admin_of_client"("client_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_boost_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_boost_state_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creators_insert_raffle_participations" ON "public"."raffle_participations" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_read_client" ON "public"."clients" FOR SELECT USING (("id" = "public"."get_current_user_client_id"()));



CREATE POLICY "creators_read_missions" ON "public"."missions" FOR SELECT USING ((("client_id" = "public"."get_current_user_client_id"()) AND ("enabled" = true)));



CREATE POLICY "creators_read_own_boost_redemptions" ON "public"."commission_boost_redemptions" FOR SELECT USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators_read_own_mission_progress" ON "public"."mission_progress" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_read_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions" FOR SELECT USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators_read_own_raffle_participations" ON "public"."raffle_participations" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_read_own_redemptions" ON "public"."redemptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_read_own_user" ON "public"."users" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "creators_read_own_videos" ON "public"."videos" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_read_rewards" ON "public"."rewards" FOR SELECT USING ((("client_id" = "public"."get_current_user_client_id"()) AND ("enabled" = true)));



CREATE POLICY "creators_read_tiers" ON "public"."tiers" FOR SELECT USING (("client_id" = "public"."get_current_user_client_id"()));



CREATE POLICY "creators_update_own_boost_redemptions" ON "public"."commission_boost_redemptions" FOR UPDATE USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators_update_own_physical_gift_redemptions" ON "public"."physical_gift_redemptions" FOR UPDATE USING (("redemption_id" IN ( SELECT "redemptions"."id"
   FROM "public"."redemptions"
  WHERE ("redemptions"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators_update_own_redemptions" ON "public"."redemptions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_update_own_user" ON "public"."users" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "deny_direct_otp_access" ON "public"."otp_codes" USING (false);



CREATE POLICY "deny_direct_reset_access" ON "public"."password_reset_tokens" USING (false);



ALTER TABLE "public"."handle_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."physical_gift_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raffle_participations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_adjustments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tier_checkpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."activate_scheduled_boosts"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_create_otp"("p_user_id" "uuid", "p_session_id" "text", "p_code_hash" "text", "p_expires_at" timestamp with time zone, "p_access_token_encrypted" "text", "p_refresh_token_encrypted" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_create_otp"("p_user_id" "uuid", "p_session_id" "text", "p_code_hash" "text", "p_expires_at" timestamp with time zone, "p_access_token_encrypted" "text", "p_refresh_token_encrypted" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_create_otp"("p_user_id" "uuid", "p_session_id" "text", "p_code_hash" "text", "p_expires_at" timestamp with time zone, "p_access_token_encrypted" "text", "p_refresh_token_encrypted" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_create_reset_token"("p_user_id" "uuid", "p_token_hash" "text", "p_expires_at" timestamp with time zone, "p_ip_address" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_create_user"("p_id" "uuid", "p_client_id" "uuid", "p_tiktok_handle" character varying, "p_email" character varying, "p_password_hash" character varying, "p_terms_version" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_email_exists"("p_client_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_find_otp_by_session"("p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_otp_by_session"("p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_otp_by_session"("p_session_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_recent_reset_tokens"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_email"("p_client_id" "uuid", "p_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_handle"("p_client_id" "uuid", "p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_user_by_id"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_find_valid_reset_tokens"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_find_valid_reset_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_find_valid_reset_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_find_valid_reset_tokens"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_get_client_by_id"("p_client_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_handle_exists"("p_client_id" "uuid", "p_handle" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_increment_otp_attempts"("p_session_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_invalidate_user_reset_tokens"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_mark_email_verified"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_mark_otp_used"("p_session_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_mark_reset_token_used"("p_token_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_update_last_login"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_mission_progress_for_eligible_users"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_mission_progress_for_eligible_users"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_mission_progress_for_eligible_users"("p_client_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_active_boosts"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_missions"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_rewards"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying, "p_current_tier_order" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_rewards"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying, "p_current_tier_order" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_rewards"("p_user_id" "uuid", "p_client_id" "uuid", "p_current_tier" character varying, "p_current_tier_order" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_current_user_client_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_current_user_client_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_client_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_client_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mission_history"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_of_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_boost_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_boost_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_boost_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_boost_to_redemption"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_boost_to_redemption"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_boost_to_redemption"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."transition_expired_to_pending_info"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_mission_progress"("p_client_id" "uuid", "p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."update_mission_progress"("p_client_id" "uuid", "p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_mission_progress"("p_client_id" "uuid", "p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."commission_boost_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."commission_boost_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_boost_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."commission_boost_state_history" TO "anon";
GRANT ALL ON TABLE "public"."commission_boost_state_history" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_boost_state_history" TO "service_role";



GRANT ALL ON TABLE "public"."handle_changes" TO "anon";
GRANT ALL ON TABLE "public"."handle_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."handle_changes" TO "service_role";



GRANT ALL ON TABLE "public"."mission_progress" TO "anon";
GRANT ALL ON TABLE "public"."mission_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."mission_progress" TO "service_role";



GRANT ALL ON TABLE "public"."missions" TO "anon";
GRANT ALL ON TABLE "public"."missions" TO "authenticated";
GRANT ALL ON TABLE "public"."missions" TO "service_role";



GRANT ALL ON TABLE "public"."otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."physical_gift_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."physical_gift_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."physical_gift_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."raffle_participations" TO "anon";
GRANT ALL ON TABLE "public"."raffle_participations" TO "authenticated";
GRANT ALL ON TABLE "public"."raffle_participations" TO "service_role";



GRANT ALL ON TABLE "public"."redemptions" TO "anon";
GRANT ALL ON TABLE "public"."redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."sales_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."sales_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tier_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."tier_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."tier_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."tiers" TO "anon";
GRANT ALL ON TABLE "public"."tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."tiers" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







