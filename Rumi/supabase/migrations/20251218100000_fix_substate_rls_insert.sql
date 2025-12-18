-- Migration: Add INSERT RLS policies for sub-state tables
-- Bug ID: BUG-005-PhysicalGiftRLSInsert
-- Purpose: Allow creators to insert their own physical gift and commission boost records
-- Date: 2025-12-18
-- Note: Both policies use strengthened predicate with client_id matching for defense-in-depth

-- Add INSERT policy for physical_gift_redemptions
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_physical_gift_redemptions"
ON "public"."physical_gift_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);

-- REQUIRED: Also fix commission_boost_redemptions (same pattern, same risk)
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_boost_redemptions"
ON "public"."commission_boost_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);
