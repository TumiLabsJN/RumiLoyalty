// app/admin/creator-lookup/types.ts
// Creator Lookup screen types based on AdminFlows.md Screen 6 wireframe

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Client VIP metric type
 * @backend: clients.vip_metric
 */
export type VipMetric = 'units' | 'sales'

/**
 * Redemption status
 * @backend: redemptions.status
 */
export type RedemptionStatus = 'claimable' | 'claimed' | 'fulfilled' | 'concluded' | 'rejected'

/**
 * Reward type
 * @backend: rewards.type
 */
export type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'

/**
 * Mission type
 * @backend: missions.mission_type
 */
export type MissionType = 'sales_dollars' | 'sales_units' | 'videos' | 'views' | 'likes' | 'raffle'

/**
 * Mission progress status
 * @backend: mission_progress.status
 */
export type MissionProgressStatus = 'active' | 'dormant' | 'completed'

// =============================================================================
// CREATOR PROFILE
// =============================================================================

/**
 * Creator profile displayed after search
 * @backend: users table + tiers table JOIN
 * Per AdminFlows.md lines 1317-1327
 */
export interface CreatorProfile {
  id: string                          // @backend: users.id
  handle: string                      // @backend: users.tiktok_handle
  email: string                       // @backend: users.email
  // Tier info
  currentTier: string                 // @backend: users.current_tier (FK)
  currentTierName: string             // @backend: tiers.tier_name (via JOIN)
  // Sales mode fields
  totalSales: number | null           // @backend: users.total_sales (DECIMAL)
  totalSalesFormatted: string | null  // @backend: computed by server ("$5,420")
  checkpointSalesCurrent: number | null     // @backend: users.checkpoint_sales_current
  checkpointSalesTarget: number | null      // @backend: users.checkpoint_sales_target
  checkpointProgressFormatted: string | null // @backend: computed ("$1,200 / $2,000")
  // Units mode fields
  totalUnits: number | null           // @backend: users.total_units
  totalUnitsFormatted: string | null  // @backend: computed ("5,420 units")
  checkpointUnitsCurrent: number | null     // @backend: users.checkpoint_units_current
  checkpointUnitsTarget: number | null      // @backend: users.checkpoint_units_target
  checkpointUnitsProgressFormatted: string | null // @backend: computed ("120 / 200 units")
  // Member info
  createdAt: string                   // @backend: users.created_at (ISO 8601)
  memberSinceFormatted: string        // @backend: computed ("Jan 15, 2025")
}

// =============================================================================
// ACTIVE REDEMPTIONS
// =============================================================================

/**
 * Active redemption item
 * @backend: redemptions table + rewards JOIN
 * Per AdminFlows.md lines 1329-1334
 * Filter: status NOT IN ('concluded', 'rejected') AND deleted_at IS NULL
 */
export interface ActiveRedemption {
  id: string                          // @backend: redemptions.id
  rewardName: string                  // @backend: rewards.name
  rewardType: RewardType              // @backend: rewards.type
  rewardTypeFormatted: string         // @backend: computed ("Gift Card", "Pay Boost")
  status: RedemptionStatus            // @backend: redemptions.status
  statusFormatted: string             // @backend: computed ("Claimed", "Active", "Shipping")
  claimedAt: string                   // @backend: redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // @backend: computed ("Nov 20")
  // Sub-state for specific types
  subStatus: string | null            // @backend: commission_boost_redemptions.boost_status or physical_gift sub-state
}

// =============================================================================
// MISSION PROGRESS
// =============================================================================

/**
 * Mission progress item
 * @backend: mission_progress table + missions JOIN
 * Per AdminFlows.md lines 1336-1341
 * Filter: status IN ('active', 'completed')
 */
export interface MissionProgressItem {
  id: string                          // @backend: mission_progress.id
  missionName: string                 // @backend: missions.display_name
  missionType: MissionType            // @backend: missions.mission_type
  missionTypeFormatted: string        // @backend: computed ("Sales", "Videos", "Raffle")
  currentValue: number                // @backend: mission_progress.current_value
  targetValue: number                 // @backend: missions.target_value
  progressFormatted: string           // @backend: computed ("$320/$500", "7/10", "entered")
  status: MissionProgressStatus       // @backend: mission_progress.status
  statusFormatted: string             // @backend: computed ("Active", "Completed")
}

// =============================================================================
// REDEMPTION HISTORY
// =============================================================================

/**
 * Redemption history item (concluded only)
 * @backend: redemptions table
 * Per AdminFlows.md lines 1343-1347
 * Filter: status = 'concluded' ORDER BY concluded_at DESC LIMIT 10
 */
export interface RedemptionHistoryItem {
  id: string                          // @backend: redemptions.id
  rewardName: string                  // @backend: rewards.name
  claimedAt: string                   // @backend: redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // @backend: computed ("Oct 15")
  concludedAt: string                 // @backend: redemptions.concluded_at (ISO 8601)
  concludedAtFormatted: string        // @backend: computed ("Oct 16")
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Creator search response
 */
export interface CreatorSearchResponse {
  found: boolean
  creator: CreatorProfile | null
  error: string | null
}

/**
 * Creator details response (all data for a found creator)
 */
export interface CreatorDetailsResponse {
  profile: CreatorProfile
  activeRedemptions: ActiveRedemption[]
  missionProgress: MissionProgressItem[]
  redemptionHistory: RedemptionHistoryItem[]
}

// =============================================================================
// STATUS BADGE CONFIGS
// =============================================================================

export const REDEMPTION_STATUS_CONFIG: Record<RedemptionStatus, { label: string; variant: 'gray' | 'blue' | 'yellow' | 'green' }> = {
  claimable: { label: 'Claimable', variant: 'blue' },
  claimed: { label: 'Claimed', variant: 'yellow' },
  fulfilled: { label: 'Fulfilled', variant: 'green' },
  concluded: { label: 'Concluded', variant: 'gray' },
  rejected: { label: 'Rejected', variant: 'gray' }
}

export const MISSION_STATUS_CONFIG: Record<MissionProgressStatus, { label: string; variant: 'gray' | 'green' | 'blue' }> = {
  active: { label: 'Active', variant: 'blue' },
  dormant: { label: 'Dormant', variant: 'gray' },
  completed: { label: 'Completed', variant: 'green' }
}
