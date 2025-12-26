/**
 * Missions Types - Single Source of Truth
 *
 * Type definitions for Missions Page API (GET /api/missions)
 * Used by: service layer, client components, API routes
 *
 * Source: API_CONTRACTS.md (lines 2484-2948)
 *
 * IMPORTANT: This is the canonical location for mission types.
 * Other files should re-export from here, not define duplicates.
 */

// ============================================================================
// API RESPONSE (Root)
// ============================================================================

export interface MissionsPageResponse {
  // User & Tier Info (for header badge)
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    currentTier: string                 // From users.current_tier (tier_3)
    currentTierName: string             // From tiers.tier_name ("Gold")
    currentTierColor: string            // From tiers.tier_color (hex, e.g., "#F59E0B")
  }

  // Featured mission ID (for home page sync)
  featuredMissionId: string | null      // ID of highest priority mission (null if none)

  // Missions list (sorted by status priority + mission type)
  missions: Array<Mission>
}

// ============================================================================
// MISSION TYPE
// ============================================================================

export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
  redemptionId: string | null         // UUID from redemptions.id (for payment-info calls; null if not claimed)
  missionType: MissionType
  displayName: string                 // Backend-generated from missions.display_name
  targetUnit: 'dollars' | 'units' | 'count'  // From missions.target_unit
  tierEligibility: string             // From missions.tier_eligibility

  // Reward information
  rewardType: RewardType
  rewardDescription: string           // Backend-generated (with article grammar)
  rewardSource: 'vip_tier' | 'mission' // From rewards.reward_source (always 'mission' for missions)

  // PRE-COMPUTED status (backend derives from multiple tables)
  status: MissionStatus

  // Progress tracking (null for raffles and locked missions)
  progress: MissionProgress | null

  // Deadline information
  deadline: MissionDeadline | null

  // Reward value data (for modals/forms)
  valueData: MissionValueData | null

  // Scheduling data (for Scheduled/Active states)
  scheduling: MissionScheduling | null

  // Raffle-specific data (null for non-raffles)
  raffleData: RaffleData | null

  // Locked state data (null if not locked)
  lockedData: LockedData | null

  // Recurring mission data (null for one-time missions) - GAP-RECURRING-001
  recurringData: RecurringData | null

  // Flippable card content (null if not flippable state)
  flippableCard: FlippableCardData | null
}

// ============================================================================
// TYPE ALIASES (for cleaner code)
// ============================================================================

export type MissionType = 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'

export type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'

// ============================================================================
// MISSION STATUS (17 possible values)
// ============================================================================

export type MissionStatus =
  | 'in_progress'           // Active mission making progress
  | 'default_claim'         // Completed, instant reward ready to claim
  | 'default_schedule'      // Completed, scheduled reward ready to schedule
  | 'scheduled'             // Scheduled reward with activation date set
  | 'active'                // Active reward currently running
  | 'redeeming'             // Instant reward being processed
  | 'redeeming_physical'    // Physical gift being shipped
  | 'sending'               // Physical gift shipped
  | 'pending_info'          // Commission boost pending payment info
  | 'clearing'              // Commission boost waiting for sales to clear
  | 'dormant'               // Raffle not started yet
  | 'raffle_available'      // Raffle ready to participate
  | 'raffle_processing'     // Waiting for raffle draw
  | 'raffle_claim'          // Won raffle, needs to claim
  | 'raffle_won'            // Won raffle prize
  | 'locked'                // Tier-locked mission
  | 'recurring_cooldown'    // Recurring mission in rate-limit period (GAP-RECURRING-001)

// ============================================================================
// NESTED TYPES
// ============================================================================

export interface MissionProgress {
  currentValue: number              // Raw value from mission_progress.current_value
  currentFormatted: string          // Backend-formatted ("$350" or "35 units")
  targetValue: number               // Raw value from missions.target_value
  targetFormatted: string           // Backend-formatted ("$500" or "50 units")
  percentage: number                // Backend-calculated (currentValue / targetValue * 100)
  remainingText: string             // Backend-formatted ("$150 more to go!" or "15 more units to go!")
  progressText: string              // Backend-formatted combined text ("$350 of $500")
}

export interface MissionDeadline {
  checkpointEnd: string             // ISO 8601 from mission_progress.checkpoint_end
  checkpointEndFormatted: string    // Backend-formatted "March 15, 2025"
  daysRemaining: number             // Backend-calculated
}

export interface MissionValueData {
  percent?: number                  // For commission_boost/discount
  durationDays?: number             // For commission_boost/discount
  amount?: number                   // For gift_card/spark_ads
  displayText?: string              // For physical_gift/experience
  requiresSize?: boolean            // For physical_gift
  sizeCategory?: string             // For physical_gift
  sizeOptions?: string[]            // For physical_gift
}

export interface MissionScheduling {
  scheduledActivationDate: string   // Date only (YYYY-MM-DD)
  scheduledActivationTime: string   // Time only (HH:MM:SS) in EST
  scheduledActivationFormatted: string  // Backend-formatted "Feb 15, 2025 2:00 PM EST"
  activationDate: string | null     // ISO 8601, set when activated
  activationDateFormatted: string | null  // Backend-formatted "Started: Feb 15, 2:00 PM"
  expirationDate: string | null     // ISO 8601
  expirationDateFormatted: string | null  // Backend-formatted "Expires: Mar 17, 2:00 PM"
  durationText: string              // Backend-formatted "Active for 30 days"
}

export interface RaffleData {
  raffleEndDate: string             // ISO 8601 from missions.raffle_end_date
  raffleEndFormatted: string        // Backend-formatted "Feb 20, 2025"
  daysUntilDraw: number             // Backend-calculated
  isWinner: boolean | null          // From raffle_participations.is_winner
  prizeName: string                 // Backend-generated with article ("an iPhone 16 Pro")
}

export interface LockedData {
  requiredTier: string              // e.g., "tier_4"
  requiredTierName: string          // Backend-formatted "Platinum"
  requiredTierColor: string         // Hex color "#818CF8"
  unlockMessage: string             // Backend-formatted "Unlock at Platinum"
  previewFromTier: string | null    // From missions.preview_from_tier
}

/**
 * Recurring mission data - returned for weekly/monthly/unlimited missions
 * GAP-RECURRING-001
 */
export interface RecurringData {
  frequency: 'weekly' | 'monthly' | 'unlimited'
  cooldownUntil: string | null      // ISO timestamp when cooldown ends
  cooldownDaysRemaining: number | null  // Days until available
  isInCooldown: boolean             // True if rate-limited
}

export interface FlippableCardData {
  backContentType: 'dates' | 'message'
  message: string | null
  dates: Array<{
    label: string
    value: string
  }> | null
}

// ============================================================================
// ADDITIONAL TYPES (for service layer compatibility)
// ============================================================================

/**
 * MissionItem - Alias for Mission
 * Used by missionService.ts for internal processing
 */
export type MissionItem = Mission
