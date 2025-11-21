// /app/types/missionhistory.ts
// Type definitions for Mission History Page API (GET /api/missions/history)
// Source: API_CONTRACTS.md (lines 3815-4039)

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface MissionHistoryResponse {
  // User info
  user: {
    id: string
    currentTier: string         // tier_3
    currentTierName: string     // "Gold"
    currentTierColor: string    // "#F59E0B"
  }

  // Historic missions (completed rewards + lost raffles)
  history: Array<MissionHistoryItem>
}

// ============================================================================
// MISSION HISTORY ITEM
// ============================================================================

export interface MissionHistoryItem {
  // Mission identity
  id: string
  missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
  displayName: string             // "Sales Sprint", "VIP Raffle", etc.

  // Status (only concluded or rejected)
  status: 'concluded' | 'rejected_raffle'

  // Reward information (focus on what was earned/lost)
  rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  rewardName: string              // Backend-formatted "$50 Gift Card"
  rewardSubtitle: string          // Backend-formatted "From: Sales Sprint mission"

  // Completion timeline
  completedAt: string             // ISO 8601
  completedAtFormatted: string    // "Jan 10, 2025"
  claimedAt: string | null        // ISO 8601
  claimedAtFormatted: string | null  // "Jan 10, 2025"
  deliveredAt: string | null      // ISO 8601
  deliveredAtFormatted: string | null  // "Jan 12, 2025"

  // Raffle-specific (null for non-raffles)
  raffleData: {
    isWinner: boolean             // true | false
    drawDate: string              // ISO 8601
    drawDateFormatted: string     // "Jan 20, 2025"
    prizeName: string             // "an iPhone 16 Pro"
  } | null
}
