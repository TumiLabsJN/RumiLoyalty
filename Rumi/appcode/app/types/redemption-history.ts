// /app/types/redemption-history.ts
// Type definitions for Redemption History Page API (GET /api/rewards/history)
// Source: API_CONTRACTS.md (lines 3270-3400)

import type { RewardType } from './rewards'

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface RedemptionHistoryResponse {
  // User information with current tier details
  user: {
    id: string                 // User UUID
    handle: string             // TikTok handle
    currentTier: string        // e.g., "tier_3"
    currentTierName: string    // e.g., "Gold"
    currentTierColor: string   // Hex color (e.g., "#F59E0B")
  }

  // Array of concluded redemptions (sorted by concluded_at DESC)
  history: RedemptionHistoryItem[]
}

// ============================================================================
// REDEMPTION HISTORY ITEM
// ============================================================================

export interface RedemptionHistoryItem {
  id: string                   // redemptions.id (UUID)
  rewardId: string             // redemptions.reward_id (FK to rewards table)
  name: string                 // Backend-formatted name (e.g., "$50 Gift Card", "5% Pay Boost")
  description: string          // Backend-formatted displayText
  type: RewardType             // 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  rewardSource: 'vip_tier' | 'mission'  // From rewards.reward_source
  claimedAt: string            // ISO 8601 timestamp - when user claimed
  concludedAt: string          // ISO 8601 timestamp - when moved to history
  status: 'concluded'          // Always 'concluded' in history (terminal state)
}

// ============================================================================
// TEST SCENARIO INTERFACE (for mock data structure)
// ============================================================================

export interface RedemptionHistoryScenario {
  name: string
  mockData: RedemptionHistoryResponse
}
