-- Migration: Add INSERT policy for creators on redemptions table
-- Gap: GAP-001-VIPRedemptionInsertRLS
-- Context: VIP tier rewards require creators to INSERT new redemption records
-- when claiming. Mission rewards pre-create redemptions, so only UPDATE was needed.
-- This policy fills the gap for VIP tier claims.
-- Pattern: Matches existing creators_insert_own_* policies in 20251218100000_fix_substate_rls_insert.sql

-- Add INSERT policy for redemptions table
-- Allows creators to insert redemptions where:
-- 1. user_id matches their auth.uid()
-- 2. client_id matches their tenant (defense-in-depth against cross-tenant inserts)
CREATE POLICY "creators_insert_own_redemptions"
ON "public"."redemptions"
FOR INSERT
WITH CHECK (
  "user_id" = "auth"."uid"()
  AND "client_id" = (SELECT "client_id" FROM "public"."users" WHERE "id" = "auth"."uid"())
);
