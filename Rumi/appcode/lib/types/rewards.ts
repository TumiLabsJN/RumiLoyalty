// /lib/types/rewards.ts
// Shared type definitions for Rewards (single source of truth)
// Source: API_CONTRACTS.md v1.5 (lines 1803-2129)
//
// IMPORTANT: This is the canonical location for reward types.
// - lib/services/rewardService.ts imports from here
// - app/types/rewards.ts re-exports from here
// - Do NOT define RewardsPageResponse elsewhere

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface RewardsPageResponse {
  user: {
    id: string
    handle: string
    currentTier: string        // e.g., "tier_3"
    currentTierName: string    // e.g., "Gold"
    currentTierColor: string   // Hex color (e.g., "#F59E0B")
  }

  redemptionCount: number      // Count for "View Redemption History (X)"

  rewards: Reward[]            // Array of rewards (sorted by backend)
}

// ============================================================================
// REWARD
// ============================================================================

export interface Reward {
  // Core reward data
  id: string
  redemptionId: string | null  // UUID from redemptions.id (null if not claimed)
  type: RewardType
  name: string
  description: string

  // PRE-FORMATTED display text (backend handles all formatting)
  displayText: string          // e.g., "+5% Pay boost for 30 Days"

  // Structured data (camelCase transformed from value_data JSONB)
  valueData: ValueData | null

  // COMPUTED status (backend derives from multiple tables)
  status: RewardStatus

  // COMPUTED availability (backend validates eligibility)
  canClaim: boolean
  isLocked: boolean
  isPreview: boolean

  // Usage tracking (VIP tier rewards only, current tier only)
  usedCount: number
  totalQuantity: number

  // Tier information
  tierEligibility: string
  requiredTierName: string | null
  displayOrder: number

  // PRE-FORMATTED status details (backend computes all dates/times)
  statusDetails: StatusDetails | null

  // Redemption frequency info (for UI hints)
  redemptionFrequency: RedemptionFrequency

  // Redemption type (workflow type)
  redemptionType: RedemptionType

  // Reward source (distinguishes VIP tier vs mission rewards)
  rewardSource: 'vip_tier' | 'mission'
}

// ============================================================================
// ENUMS
// ============================================================================

export type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience'

export type RewardStatus =
  | 'clearing'           // Rank 1: Commission boost pending payout
  | 'sending'            // Rank 2: Physical gift shipped by admin
  | 'active'             // Rank 2: Commission boost or discount currently active
  | 'pending_info'       // Rank 3: Commission boost needs payment info
  | 'scheduled'          // Rank 4: Future activation date set
  | 'redeeming_physical' // Rank 5: Physical gift, address provided, not shipped
  | 'redeeming'          // Rank 6: Instant reward claimed, awaiting fulfillment
  | 'claimable'          // Rank 7: No active claim, within limits
  | 'limit_reached'      // Rank 8: All uses exhausted
  | 'locked'             // Rank 9: Tier requirement not met (preview)

export type RedemptionFrequency =
  | 'one-time'
  | 'monthly'
  | 'weekly'
  | 'unlimited'

export type RedemptionType =
  | 'instant'    // gift_card, spark_ads, experience, physical_gift
  | 'scheduled'  // commission_boost, discount

// ============================================================================
// VALUE DATA (JSONB)
// ============================================================================

export interface ValueData {
  // For gift_card, spark_ads
  amount?: number

  // For commission_boost, discount
  percent?: number
  durationDays?: number      // Backend converts duration_minutes / 1440
  couponCode?: string        // For discount (2-8 char code)
  maxUses?: number           // For discount (optional usage limit)

  // For physical_gift
  requiresSize?: boolean
  sizeCategory?: string
  sizeOptions?: string[]

  // For physical_gift, experience
  displayText?: string       // Client-provided custom text (max 27 chars)
}

// ============================================================================
// STATUS DETAILS
// ============================================================================

export interface StatusDetails {
  // For 'scheduled' status (discount or commission_boost)
  scheduledDate?: string      // "Jan 15, 2025 at 2:00 PM" (formatted)
  scheduledDateRaw?: string   // ISO 8601 for frontend date pickers

  // For 'active' status (discount or commission_boost)
  activationDate?: string     // "Jan 10, 2025" (human readable)
  expirationDate?: string     // "Feb 10, 2025" (human readable)
  daysRemaining?: number      // Days until expiration (e.g., 15)

  // For 'sending' status (physical_gift)
  shippingCity?: string       // "Los Angeles"

  // For 'clearing' status (commission_boost)
  clearingDays?: number       // Days remaining until payout (20-day clearing period)
}

// ============================================================================
// CLAIM REQUEST/RESPONSE
// ============================================================================

export interface ClaimRewardRequest {
  // For scheduled reward types (discount, commission_boost)
  scheduledActivationAt?: string  // ISO 8601 timestamp

  // For physical gifts requiring size selection
  sizeValue?: string              // Size value (e.g., "M", "L", "XL")

  // Shipping information for physical gifts
  shippingInfo?: {
    firstName: string           // Required - Recipient first name
    lastName: string            // Required - Recipient last name
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone: string               // Required - Contact phone for delivery
  }
}

export interface ClaimRewardResponse {
  success: boolean
  message: string

  redemption: {
    id: string
    status: 'claimed'
    rewardType: RewardType
    claimedAt: string
    reward: {
      id: string
      name: string
      displayText: string
      type: string
      rewardSource: 'vip_tier'
      valueData: ValueData | null
    }
    scheduledActivationAt?: string
    usedCount: number
    totalQuantity: number
    nextSteps: {
      action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation'
      message: string
    }
  }

  updatedRewards: Array<{
    id: string
    status: string
    canClaim: boolean
    usedCount: number
  }>
}
