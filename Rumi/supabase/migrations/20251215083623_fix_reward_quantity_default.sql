-- ============================================================================
-- Fix redemption_quantity Default Value
-- ============================================================================
-- Bug: BUG-REWARD-FACTORY-CONSTRAINT
-- Issue: Default 'unlimited' + default 1 violates check_quantity_with_frequency
--
-- The CHECK constraint requires:
--   (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
--   (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND <= 10)
--
-- Current defaults: 'unlimited' + 1 → INVALID
-- Fixed defaults: 'unlimited' + NULL → VALID
--
-- References:
--   - BugFixes/BUG-REWARD-FACTORY-CONSTRAINT.md
--   - SchemaFinalv2.md lines 478-479, 557-560
-- ============================================================================

ALTER TABLE rewards
ALTER COLUMN redemption_quantity SET DEFAULT NULL;

COMMENT ON COLUMN rewards.redemption_quantity IS
  'Number of redemptions allowed per period. NULL for unlimited frequency, 1-10 for limited frequencies.';
