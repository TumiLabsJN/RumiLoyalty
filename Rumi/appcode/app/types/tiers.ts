// /app/types/tiers.ts
// Type definitions for Tiers Page API (GET /api/tiers)
// Source: API_CONTRACTS.md (lines 5554-6108)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface TiersPageResponse {
  // User progress data (dynamic to user's current VIP level)
  user: UserProgress

  // Progress to next tier (dynamic calculations)
  progress: TierProgress

  // VIP system configuration
  vipSystem: VIPSystemConfig

  // Tier cards (filtered to show only current tier + all higher tiers)
  tiers: Array<TierCard>
}

// ============================================================================
// USER PROGRESS
// ============================================================================

export interface UserProgress {
  id: string
  currentTier: string                    // Database tier_id (e.g., "tier_2")
  currentTierName: string                // Display name: "Bronze", "Silver", "Gold", "Platinum"
  currentTierColor: string               // Hex color: #CD7F32, #94a3b8, #F59E0B, #818CF8
  currentSales: number                   // Current sales value (raw number)
  currentSalesFormatted: string          // Backend-formatted: "$2,100" or "2,100 units"
  expirationDate: string | null          // ISO 8601 (null if tierLevel === 1)
  expirationDateFormatted: string | null // Backend-formatted: "August 10, 2025"
  showExpiration: boolean                // True if tierLevel > 1
}

// ============================================================================
// TIER PROGRESS
// ============================================================================

export interface TierProgress {
  nextTierName: string                   // Display name of next tier
  nextTierTarget: number                 // Minimum sales required for next tier
  nextTierTargetFormatted: string        // Backend-formatted: "$3,000" or "3,000 units"
  amountRemaining: number                // Calculated: nextTierTarget - currentSales
  amountRemainingFormatted: string       // Backend-formatted: "$900" or "900 units"
  progressPercentage: number             // Calculated: (currentSales / nextTierTarget) * 100
  progressText: string                   // Backend-formatted: "$900 to go" or "900 units to go"
}

// ============================================================================
// VIP SYSTEM CONFIG
// ============================================================================

export interface VIPSystemConfig {
  metric: 'sales_dollars' | 'sales_units' // Determines display format
}

// ============================================================================
// TIER CARD
// ============================================================================

export interface TierCard {
  // Tier identity
  name: string                           // "Bronze", "Silver", "Gold", "Platinum"
  color: string                          // Hex color
  tierLevel: number                      // 1, 2, 3, 4

  // Tier requirements
  minSales: number                       // Minimum sales required (raw number)
  minSalesFormatted: string              // Backend-formatted: "$1,000" or "1,000 units"
  salesDisplayText: string               // Backend-formatted: "$1,000+ in sales" or "1,000+ in units sold"

  // Commission rate
  commissionRate: number                 // Percentage: 10, 12, 15, 20
  commissionDisplayText: string          // Backend-formatted: "12% Commission on sales"

  // Tier status
  isUnlocked: boolean                    // True if user has reached this tier
  isCurrent: boolean                     // True if this is user's current tier

  // Perks summary
  totalPerksCount: number                // Backend-computed sum of all rewards + missions

  // Rewards preview (max 4, aggregated and sorted by backend)
  rewards: Array<AggregatedReward>
}

// ============================================================================
// AGGREGATED REWARD
// ============================================================================

export interface AggregatedReward {
  type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  isRaffle: boolean                      // True if tied to raffle mission
  displayText: string                    // Backend-formatted name: "$100 Gift Card", "8% Pay Boost"
  count: number                          // Quantity: 1, 2, 3, etc.
  sortPriority: number                   // Backend-computed for sorting (1 = highest)
}
