/**
 * Enum/Status Types for Rumi Loyalty Platform
 *
 * These TypeScript string literal unions mirror the VARCHAR CHECK constraints
 * defined in the database schema (supabase/migrations/20251128173733_initial_schema.sql).
 *
 * Source of truth: SchemaFinalv2.md
 * Generated: 2025-11-28
 */

// =============================================================================
// SECTION 1: System Configuration
// =============================================================================

/**
 * clients.tier_calculation_mode
 * How tier maintenance is calculated
 */
export type TierCalculationMode = 'fixed_checkpoint' | 'lifetime';

/**
 * clients.vip_metric
 * VIP tier progression metric (immutable after client launch)
 */
export type VipMetric = 'units' | 'sales';

// =============================================================================
// SECTION 2: User Management
// =============================================================================

/**
 * users.default_payment_method
 * User's preferred payment platform for commission payouts
 */
export type PaymentMethod = 'paypal' | 'venmo';

// =============================================================================
// SECTION 3: Performance Tracking
// =============================================================================

/**
 * sales_adjustments.adjustment_type
 * Type of manual sales correction
 */
export type AdjustmentType = 'manual_sale' | 'refund' | 'bonus' | 'correction';

// =============================================================================
// SECTION 4: Tier System
// =============================================================================

/**
 * tier_checkpoints.status
 * Result of tier maintenance evaluation
 */
export type TierCheckpointStatus = 'maintained' | 'promoted' | 'demoted';

/**
 * Tier identifiers used across the system
 * Used in: users.current_tier, rewards.tier_eligibility, missions.tier_eligibility, etc.
 */
export type TierId = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6';

/**
 * missions.tier_eligibility (extended)
 * Missions can target 'all' tiers or a specific tier
 */
export type MissionTierEligibility = 'all' | TierId;

// =============================================================================
// SECTION 5: Data Sync
// =============================================================================

/**
 * sync_logs.status
 * Status of data sync operation
 */
export type SyncStatus = 'running' | 'success' | 'failed';

/**
 * sync_logs.source
 * How the sync was triggered
 */
export type SyncSource = 'auto' | 'manual';

// =============================================================================
// SECTION 6: Rewards
// =============================================================================

/**
 * rewards.type
 * Available reward types in the system
 */
export type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience';

/**
 * rewards.reward_source
 * How the reward is earned
 */
export type RewardSource = 'vip_tier' | 'mission';

/**
 * rewards.redemption_frequency
 * How often a reward can be redeemed
 */
export type RedemptionFrequency = 'one-time' | 'monthly' | 'weekly' | 'unlimited';

/**
 * rewards.redemption_type, redemptions.redemption_type
 * Redemption process workflow
 */
export type RedemptionType = 'instant' | 'scheduled';

// =============================================================================
// SECTION 7: Missions
// =============================================================================

/**
 * missions.mission_type
 * Types of missions available
 */
export type MissionType =
  | 'sales_dollars'
  | 'sales_units'
  | 'videos'
  | 'views'
  | 'likes'
  | 'raffle';

/**
 * missions.target_unit
 * Unit type for mission target_value
 */
export type TargetUnit = 'dollars' | 'units' | 'count';

/**
 * mission_progress.status
 * Mission progress lifecycle state
 */
export type MissionProgressStatus = 'active' | 'dormant' | 'completed';

// =============================================================================
// SECTION 8: Redemptions
// =============================================================================

/**
 * redemptions.status
 * 5-state redemption lifecycle
 */
export type RedemptionStatus =
  | 'claimable'
  | 'claimed'
  | 'fulfilled'
  | 'concluded'
  | 'rejected';

// =============================================================================
// SECTION 9: Commission Boost Sub-State
// =============================================================================

/**
 * commission_boost_redemptions.boost_status
 * 6-state commission boost lifecycle
 */
export type BoostStatus =
  | 'scheduled'
  | 'active'
  | 'expired'
  | 'pending_info'
  | 'pending_payout'
  | 'paid';

/**
 * commission_boost_state_history.transition_type
 * How the boost status transition occurred
 */
export type BoostTransitionType = 'manual' | 'cron' | 'api';

// =============================================================================
// SECTION 10: Physical Gift Sub-State
// =============================================================================

/**
 * physical_gift_redemptions.size_category
 * Category of size selection required
 */
export type SizeCategory = 'clothing' | 'shoes';

/**
 * physical_gift_redemptions.carrier
 * Shipping carrier options
 */
export type ShippingCarrier = 'FedEx' | 'UPS' | 'USPS' | 'DHL';

// =============================================================================
// SECTION 11: Helper Arrays (for validation, dropdowns, etc.)
// =============================================================================

export const TIER_CALCULATION_MODES: TierCalculationMode[] = ['fixed_checkpoint', 'lifetime'];
export const VIP_METRICS: VipMetric[] = ['units', 'sales'];
export const PAYMENT_METHODS: PaymentMethod[] = ['paypal', 'venmo'];
export const ADJUSTMENT_TYPES: AdjustmentType[] = ['manual_sale', 'refund', 'bonus', 'correction'];
export const TIER_CHECKPOINT_STATUSES: TierCheckpointStatus[] = ['maintained', 'promoted', 'demoted'];
export const TIER_IDS: TierId[] = ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'];
export const SYNC_STATUSES: SyncStatus[] = ['running', 'success', 'failed'];
export const SYNC_SOURCES: SyncSource[] = ['auto', 'manual'];
export const REWARD_TYPES: RewardType[] = ['gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'];
export const REWARD_SOURCES: RewardSource[] = ['vip_tier', 'mission'];
export const REDEMPTION_FREQUENCIES: RedemptionFrequency[] = ['one-time', 'monthly', 'weekly', 'unlimited'];
export const REDEMPTION_TYPES: RedemptionType[] = ['instant', 'scheduled'];
export const MISSION_TYPES: MissionType[] = ['sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle'];
export const TARGET_UNITS: TargetUnit[] = ['dollars', 'units', 'count'];
export const MISSION_PROGRESS_STATUSES: MissionProgressStatus[] = ['active', 'dormant', 'completed'];
export const REDEMPTION_STATUSES: RedemptionStatus[] = ['claimable', 'claimed', 'fulfilled', 'concluded', 'rejected'];
export const BOOST_STATUSES: BoostStatus[] = ['scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'];
export const BOOST_TRANSITION_TYPES: BoostTransitionType[] = ['manual', 'cron', 'api'];
export const SIZE_CATEGORIES: SizeCategory[] = ['clothing', 'shoes'];
export const SHIPPING_CARRIERS: ShippingCarrier[] = ['FedEx', 'UPS', 'USPS', 'DHL'];

// =============================================================================
// SECTION 12: Type Guards (for runtime validation)
// =============================================================================

export const isTierCalculationMode = (value: string): value is TierCalculationMode =>
  TIER_CALCULATION_MODES.includes(value as TierCalculationMode);

export const isVipMetric = (value: string): value is VipMetric =>
  VIP_METRICS.includes(value as VipMetric);

export const isPaymentMethod = (value: string): value is PaymentMethod =>
  PAYMENT_METHODS.includes(value as PaymentMethod);

export const isAdjustmentType = (value: string): value is AdjustmentType =>
  ADJUSTMENT_TYPES.includes(value as AdjustmentType);

export const isTierCheckpointStatus = (value: string): value is TierCheckpointStatus =>
  TIER_CHECKPOINT_STATUSES.includes(value as TierCheckpointStatus);

export const isTierId = (value: string): value is TierId =>
  TIER_IDS.includes(value as TierId);

export const isSyncStatus = (value: string): value is SyncStatus =>
  SYNC_STATUSES.includes(value as SyncStatus);

export const isSyncSource = (value: string): value is SyncSource =>
  SYNC_SOURCES.includes(value as SyncSource);

export const isRewardType = (value: string): value is RewardType =>
  REWARD_TYPES.includes(value as RewardType);

export const isRewardSource = (value: string): value is RewardSource =>
  REWARD_SOURCES.includes(value as RewardSource);

export const isRedemptionFrequency = (value: string): value is RedemptionFrequency =>
  REDEMPTION_FREQUENCIES.includes(value as RedemptionFrequency);

export const isRedemptionType = (value: string): value is RedemptionType =>
  REDEMPTION_TYPES.includes(value as RedemptionType);

export const isMissionType = (value: string): value is MissionType =>
  MISSION_TYPES.includes(value as MissionType);

export const isTargetUnit = (value: string): value is TargetUnit =>
  TARGET_UNITS.includes(value as TargetUnit);

export const isMissionProgressStatus = (value: string): value is MissionProgressStatus =>
  MISSION_PROGRESS_STATUSES.includes(value as MissionProgressStatus);

export const isRedemptionStatus = (value: string): value is RedemptionStatus =>
  REDEMPTION_STATUSES.includes(value as RedemptionStatus);

export const isBoostStatus = (value: string): value is BoostStatus =>
  BOOST_STATUSES.includes(value as BoostStatus);

export const isBoostTransitionType = (value: string): value is BoostTransitionType =>
  BOOST_TRANSITION_TYPES.includes(value as BoostTransitionType);

export const isSizeCategory = (value: string): value is SizeCategory =>
  SIZE_CATEGORIES.includes(value as SizeCategory);

export const isShippingCarrier = (value: string): value is ShippingCarrier =>
  SHIPPING_CARRIERS.includes(value as ShippingCarrier);
