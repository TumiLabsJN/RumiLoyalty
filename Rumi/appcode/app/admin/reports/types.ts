// app/admin/reports/types.ts
// Reports screen types based on AdminFlows.md Screen 8 wireframe

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Date range preset options
 */
export type DateRangePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'custom'

/** Date range preset labels */
export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  last_quarter: 'Last Quarter',
  custom: 'Custom Range'
}

/**
 * Reward type
 * @backend: rewards.type
 */
export type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'

/** Reward type display labels */
export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  gift_card: 'Gift Cards',
  commission_boost: 'Commission Boosts',
  spark_ads: 'Spark Ads',
  discount: 'Discounts',
  physical_gift: 'Physical Gifts',
  experience: 'Experiences'
}

// =============================================================================
// DATE RANGE
// =============================================================================

/**
 * Date range for filtering
 */
export interface DateRange {
  preset: DateRangePreset
  startDate: string | null          // ISO 8601, for custom range
  endDate: string | null            // ISO 8601, for custom range
  periodLabel: string               // @backend: computed ("November 2025", "Q4 2025")
}

// =============================================================================
// REPORT 1: REWARDS SUMMARY
// =============================================================================

/**
 * Rewards summary row
 * @backend: Aggregated from redemptions + rewards tables
 * Per AdminFlows.md lines 1597-1608
 */
export interface RewardsSummaryRow {
  rewardType: RewardType | 'total'  // @backend: rewards.type | 'total' for summary
  rewardTypeFormatted: string       // @backend: computed ("Gift Cards")
  count: number                     // @backend: COUNT(redemptions.id) WHERE status='concluded'
  countFormatted: string            // @backend: computed ("45")
  totalSpent: number | null         // @backend: varies by type (see AdminFlows.md)
  totalSpentFormatted: string       // @backend: computed ("$2,250.00" or "-")
}

/**
 * Rewards summary report
 */
export interface RewardsSummaryReport {
  periodLabel: string               // @backend: computed ("November 2025")
  rows: RewardsSummaryRow[]
  totalCount: number                // @backend: SUM of counts
  totalCountFormatted: string       // @backend: computed ("95")
  totalSpent: number                // @backend: SUM of totalSpent (where applicable)
  totalSpentFormatted: string       // @backend: computed ("$4,297.50")
}

// =============================================================================
// REPORT 2: CREATOR ACTIVITY SUMMARY
// =============================================================================

/**
 * Creator activity row (by reward type)
 * @backend: Aggregated from redemptions table
 * Per AdminFlows.md lines 1610-1617
 */
export interface CreatorActivityRow {
  rewardType: RewardType            // @backend: rewards.type
  rewardTypeFormatted: string       // @backend: computed ("Gift Cards")
  redemptionCount: number           // @backend: COUNT(redemptions.id) per type
  redemptionCountFormatted: string  // @backend: computed ("45")
  uniqueCreators: number            // @backend: COUNT(DISTINCT redemptions.user_id) per type
  uniqueCreatorsFormatted: string   // @backend: computed ("38")
}

/**
 * Creator activity report
 */
export interface CreatorActivityReport {
  periodLabel: string               // @backend: computed ("November 2025")
  totalUniqueCreators: number       // @backend: COUNT(DISTINCT user_id) overall
  totalUniqueCreatorsFormatted: string // @backend: computed ("67")
  totalRedemptions: number          // @backend: COUNT(redemptions.id) overall
  totalRedemptionsFormatted: string // @backend: computed ("95")
  rows: CreatorActivityRow[]
}

// =============================================================================
// API RESPONSE
// =============================================================================

/**
 * Reports page response
 */
export interface ReportsResponse {
  dateRange: DateRange
  rewardsSummary: RewardsSummaryReport
  creatorActivity: CreatorActivityReport
}
