-- ============================================================================
-- Fix: commission_boost_redemptions TIMESTAMP types to match SOT
-- ============================================================================
-- Bug ID: BUG-ACTIVATE-SCHEDULED-BOOSTS-TYPE-MISMATCH
-- Issue: Columns use TIMESTAMP WITH TIME ZONE but SchemaFinalv2.md (SOT) specifies TIMESTAMP
-- Fix: ALTER columns to TIMESTAMP to match SOT
-- Reference: BugFixes/BUG-ACTIVATE-SCHEDULED-BOOSTS-TYPE-MISMATCH.md
-- ============================================================================

ALTER TABLE commission_boost_redemptions
  ALTER COLUMN activated_at TYPE TIMESTAMP,
  ALTER COLUMN expires_at TYPE TIMESTAMP;
