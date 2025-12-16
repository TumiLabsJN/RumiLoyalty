// /app/types/dashboard.ts
// Type definitions for Home Page API (GET /api/dashboard)
// Source: API_CONTRACTS.md (lines 372-1253)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface DashboardResponse {
  // User & Tier Info
  user: {
    id: string
    handle: string              // From users.tiktok_handle (without @)
    email: string
    clientName: string          // From clients.company_name
  }

  // Client configuration
  client: {
    id: string
    vipMetric: 'sales' | 'units'   // From clients.vip_metric
    vipMetricLabel: string          // "sales" or "units"
  }

  // Current tier data
  currentTier: {
    id: string
    name: string                // "Bronze", "Silver", "Gold", "Platinum"
    color: string               // Hex color (e.g., "#F59E0B")
    order: number               // 1, 2, 3, 4
    checkpointExempt: boolean   // DB: checkpoint_exempt (snake → camel)
  }

  // Next tier data (null if at highest tier)
  nextTier: {
    id: string
    name: string
    color: string
    minSalesThreshold: number   // DB: sales_threshold (snake → camel)
  } | null

  // Tier progression (checkpoint-based)
  tierProgress: {
    currentValue: number
    targetValue: number
    progressPercentage: number

    // Pre-formatted by backend
    currentFormatted: string       // "$2,500" or "2,500 units"
    targetFormatted: string        // "$5,000" or "5,000 units"

    checkpointExpiresAt: string    // ISO 8601
    checkpointExpiresFormatted: string  // "March 15, 2025"
    checkpointMonths: number       // e.g., 4
  }

  // Featured mission (circular progress)
  featuredMission: FeaturedMission

  // Current tier rewards (top 4, pre-sorted)
  currentTierRewards: Reward[]

  totalRewardsCount: number      // For "And more!" logic
}

// ============================================================================
// FEATURED MISSION
// ============================================================================

export interface FeaturedMission {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available'

  mission: {
    id: string
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string          // Static: "Unlock Payday", "Fan Favorite", etc.

    // Progress (0 for raffle)
    currentProgress: number
    targetValue: number
    progressPercentage: number

    // Pre-formatted by backend
    currentFormatted: string | null    // "$350" (sales) or "350" (units) or prize name (raffle: "iPhone 15 Pro")
    targetFormatted: string | null     // "$500" (sales) or "500" (units) or null (raffle)
    targetText: string                 // "of $500 sales" or "Enter to Win!" (raffle)
    progressText: string               // "$350 of $500 sales" or "Enter to win iPhone 15 Pro" (raffle)

    // Raffle-specific
    isRaffle: boolean
    raffleEndDate: string | null       // ISO 8601

    // Reward details
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null        // For gift_card, spark_ads
    rewardCustomText: string | null    // For physical_gift, experience
    rewardDisplayText: string          // Formatted display text from backend
  } | null

  tier: {
    name: string
    color: string
  }

  showCongratsModal: boolean
  congratsMessage: string | null
  supportEmail: string
  emptyStateMessage: string | null
}

// ============================================================================
// REWARD (for currentTierRewards array)
// ============================================================================

export interface Reward {
  id: string
  type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  name: string                  // Auto-generated simple form
  displayText: string           // Backend-generated with prefixes/duration
  description: string           // Max 15 chars for physical_gift/experience

  valueData: {
    amount?: number             // For gift_card, spark_ads
    percent?: number            // For commission_boost, discount
    durationDays?: number       // For commission_boost, discount
  } | null

  rewardSource: 'vip_tier' | 'mission'  // From rewards.reward_source (always 'vip_tier' for dashboard)
  redemptionQuantity: number    // From rewards.redemption_quantity
  displayOrder: number          // Used for backend sorting
}

// ============================================================================
// FEATURED MISSION API (Standalone Endpoint)
// ============================================================================

export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'

  mission: {
    id: string
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string

    currentProgress: number
    targetValue: number
    progressPercentage: number

    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null
    rewardCustomText: string | null
    rewardDisplayText: string

    unitText: 'sales' | 'videos' | 'likes' | 'views'
  } | null

  tier: {
    name: string
    color: string
  }

  showCongratsModal: boolean
  congratsMessage: string | null
  supportEmail: string
  emptyStateMessage: string | null
}
