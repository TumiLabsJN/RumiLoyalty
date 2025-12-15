-- ============================================================================
-- Fix projected_tier_at_checkpoint Column Type
-- ============================================================================
-- Bug: BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH
-- Issue: Column was UUID but should store tier_id values (VARCHAR) like current_tier
--
-- References:
--   - BugFixes/BUG-RPC-PROJECTED-TIER-TYPE-MISMATCH.md
--   - SchemaFinalv2.md line 137 (current_tier is VARCHAR(50))
--   - SchemaFinalv2.md line 262 (tier_id is VARCHAR(50))
--
-- IMPORTANT: This field is a DENORMALIZED tier_id value (e.g., 'tier_1', 'tier_2').
-- It is NOT a foreign key to tiers.id. This matches the current_tier field pattern.
-- Both fields store tier_id strings for display/caching purposes, not referential integrity.
-- ============================================================================

-- Alter column type from UUID to VARCHAR(50)
-- Note: Column is expected to be NULL in all environments since the RPC was failing.
-- The explicit USING cast is added for safety in case any non-null UUID values exist.
ALTER TABLE users
ALTER COLUMN projected_tier_at_checkpoint TYPE VARCHAR(50)
USING projected_tier_at_checkpoint::text;

-- Add comment for documentation
COMMENT ON COLUMN users.projected_tier_at_checkpoint IS
  'Denormalized tier_id value (e.g., ''tier_1'', ''tier_2'') representing projected tier at next checkpoint. NOT a FK to tiers.id. Matches current_tier pattern per SchemaFinalv2.md.';
