// app/admin/missions/types.ts
// Missions screen types based on AdminFlows.md Screen 3 wireframe

// =============================================================================
// ENUMS
// =============================================================================

/** Mission type options */
export type MissionType =
  | 'sales_dollars'
  | 'sales_units'
  | 'videos'
  | 'views'
  | 'likes'
  | 'raffle'

/** Mission type display mapping (for admin dropdowns) */
export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  sales_dollars: 'Sales ($)',
  sales_units: 'Sales (Units)',
  videos: 'Videos',
  views: 'Views',
  likes: 'Likes',
  raffle: 'Raffle'
}

/**
 * Static display names per mission_type (user-facing)
 * @backend: missions.display_name - auto-set based on mission_type, NOT editable
 * Per SchemaFinalv2.md line 367
 */
export const MISSION_DISPLAY_NAMES: Record<MissionType, string> = {
  sales_dollars: 'Sales Sprint',
  sales_units: 'Sales Sprint',
  videos: 'Lights, Camera, Go!',
  views: 'Road to Viral',
  likes: 'Fan Favorite',
  raffle: 'VIP Raffle'
}

/**
 * Client VIP metric type
 * @backend: clients.vip_metric - immutable after launch
 * Per SchemaFinalv2.md line 118
 */
export type VipMetric = 'units' | 'sales'

/** Target unit options */
export type TargetUnit = 'dollars' | 'units' | 'count'

/** Tier eligibility options */
export type TierEligibility = 'all' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6'

/** Tier display mapping */
export const TIER_LABELS: Record<TierEligibility, string> = {
  all: 'All Tiers',
  tier_1: 'Bronze',
  tier_2: 'Silver',
  tier_3: 'Gold',
  tier_4: 'Platinum',
  tier_5: 'Diamond',
  tier_6: 'Elite'
}

/** Mission status (computed from enabled + activated + raffle_end_date) */
export type MissionStatus = 'draft' | 'active' | 'ended'

/** Reward types for inline creation */
export type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience'

// =============================================================================
// TABLE DISPLAY
// =============================================================================

/** Mission item for table display */
export interface MissionItem {
  id: string                          // @backend: missions.id
  displayName: string                 // @backend: missions.display_name
  missionType: MissionType            // @backend: missions.mission_type
  missionTypeFormatted: string        // @backend: computed by server ("Sales", "Videos", etc.)
  targetValue: number                 // @backend: missions.target_value
  targetValueFormatted: string        // @backend: computed by server ("$100", "25 units", "-" for raffle)
  rewardName: string                  // @backend: rewards.name (via missions.reward_id)
  tierEligibility: TierEligibility    // @backend: missions.tier_eligibility
  tierFormatted: string               // @backend: computed by server ("Bronze", "All", etc.)
  status: MissionStatus               // @backend: computed (enabled + activated + raffle_end_date)
  statusFormatted: string             // @backend: computed by server
  // Raffle-specific (only for raffle type)
  raffleEndDate: string | null        // @backend: missions.raffle_end_date (ISO 8601)
  raffleEndDateFormatted: string | null // @backend: computed by server ("Nov 30", "Today")
  raffleEntryCount: number | null     // @backend: COUNT(raffle_participations WHERE mission_id)
}

// =============================================================================
// DRAWER DETAIL (for Create/Edit)
// =============================================================================

/** Full mission details for create/edit drawer */
export interface MissionDetails {
  id: string | null                   // @backend: missions.id (null for new)
  title: string                       // @backend: missions.title (internal admin reference)
  displayName: string                 // @backend: missions.display_name (user-facing)
  description: string | null          // @backend: missions.description (admin notes)
  missionType: MissionType            // @backend: missions.mission_type
  targetValue: number                 // @backend: missions.target_value
  targetUnit: TargetUnit              // @backend: missions.target_unit (auto-set based on type)
  rewardId: string | null             // @backend: missions.reward_id (FK to rewards)
  tierEligibility: TierEligibility    // @backend: missions.tier_eligibility
  previewFromTier: TierEligibility | null  // @backend: missions.preview_from_tier (NULL or 'tier_1' through 'tier_6')
  displayOrder: number                // @backend: missions.display_order
  enabled: boolean                    // @backend: missions.enabled
  activated: boolean                  // @backend: missions.activated
  raffleEndDate: string | null        // @backend: missions.raffle_end_date (ISO 8601, raffle only)
  // Joined data
  rewardName: string | null           // @backend: rewards.name (for display)
  // Inline reward creation (for new missions)
  inlineReward: InlineRewardData | null  // @backend: when set, backend creates reward and links
}

// =============================================================================
// RAFFLE DRAWER (for winner selection)
// =============================================================================

/** Raffle participant for winner selection list */
export interface RaffleParticipant {
  id: string                          // @backend: raffle_participations.id
  userId: string                      // @backend: raffle_participations.user_id
  handle: string                      // @backend: users.tiktok_handle (via JOIN)
  participatedAt: string              // @backend: raffle_participations.participated_at (ISO 8601)
  participatedAtFormatted: string     // @backend: computed by server ("Jan 15, 2025")
}

/** Raffle details for raffle actions drawer */
export interface RaffleDetails {
  id: string                          // @backend: missions.id
  displayName: string                 // @backend: missions.display_name
  rewardName: string                  // @backend: rewards.name
  tierEligibility: TierEligibility    // @backend: missions.tier_eligibility
  tierFormatted: string               // @backend: computed by server
  raffleEndDate: string               // @backend: missions.raffle_end_date (ISO 8601)
  raffleEndDateFormatted: string      // @backend: computed by server
  entryCount: number                  // @backend: COUNT(raffle_participations)
  activated: boolean                  // @backend: missions.activated
  // Participants list (for winner selection)
  participants: RaffleParticipant[]   // @backend: raffle_participations JOIN users
  // Winner info
  winnerHandle: string | null         // @backend: raffle_participations.is_winner = true -> users.tiktok_handle
  winnerId: string | null             // @backend: raffle_participations.user_id WHERE is_winner = true
}

// =============================================================================
// REWARD SELECTION / CREATION
// =============================================================================

/** Existing reward for selection dropdown */
export interface RewardOption {
  id: string                          // @backend: rewards.id
  name: string                        // @backend: rewards.name
  type: RewardType                    // @backend: rewards.type
  valueFormatted: string              // @backend: computed by server ("$50", "5%", etc.)
}

/** Value data types by reward type */
export interface GiftCardValueData {
  amount: number                      // @backend: rewards.value_data.amount
}

export interface CommissionBoostValueData {
  percent: number                     // @backend: rewards.value_data.percent
  durationDays: number                // @backend: rewards.value_data.duration_days
}

export interface SparkAdsValueData {
  amount: number                      // @backend: rewards.value_data.amount
}

export interface DiscountValueData {
  percent: number                     // @backend: rewards.value_data.percent
  durationMinutes: number             // @backend: rewards.value_data.duration_minutes
  couponCode: string                  // @backend: rewards.value_data.coupon_code
  maxUses: number | null              // @backend: rewards.value_data.max_uses
}

export interface PhysicalGiftValueData {
  requiresSize: boolean               // @backend: rewards.value_data.requires_size
  sizeCategory: string | null         // @backend: rewards.value_data.size_category
  sizeOptions: string[]               // @backend: rewards.value_data.size_options
  displayText: string                 // @backend: rewards.value_data.display_text
}

export interface ExperienceValueData {
  displayText: string                 // @backend: rewards.value_data.display_text
}

export type ValueData =
  | GiftCardValueData
  | CommissionBoostValueData
  | SparkAdsValueData
  | DiscountValueData
  | PhysicalGiftValueData
  | ExperienceValueData

/** Inline reward creation data - used when creating new reward with mission */
export interface InlineRewardData {
  type: RewardType                    // @backend: rewards.type
  description: string | null          // @backend: rewards.description (physical_gift/experience only)
  valueData: ValueData                // @backend: rewards.value_data (JSONB)
  // Auto-set by backend:
  // - reward_source = 'mission'
  // - tier_eligibility = mission.tier_eligibility
}

// =============================================================================
// API RESPONSE
// =============================================================================

/** Missions list API response */
export interface MissionsResponse {
  missions: MissionItem[]
  totalCount: number                  // @backend: computed by server
  totalCountFormatted: string         // @backend: computed by server
}

/** Available rewards for dropdown */
export interface AvailableRewardsResponse {
  rewards: RewardOption[]
}

// =============================================================================
// STATUS BADGE CONFIG
// =============================================================================

export const MISSION_STATUS_CONFIG: Record<MissionStatus, { label: string; variant: 'gray' | 'green' | 'blue' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  active: { label: 'Active', variant: 'green' },
  ended: { label: 'Ended', variant: 'blue' }
}
