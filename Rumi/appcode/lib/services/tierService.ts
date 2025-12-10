/**
 * Tier Service
 *
 * Business logic for tiers page: tier progression, rewards aggregation, formatting.
 * Orchestrates tierRepository calls and applies business rules.
 *
 * References:
 * - API_CONTRACTS.md lines 5604-6190 (GET /api/tiers)
 * - ARCHITECTURE.md Section 5 (Service Layer, lines 467-530)
 * - ARCHITECTURE.md Section 7 (Naming Conventions, lines 940-948)
 */

import { tierRepository } from '@/lib/repositories/tierRepository';
import type {
  TierData,
  TierRewardData,
  TierMissionData,
  UserTierContext,
  VipSystemSettings,
} from '@/lib/repositories/tierRepository';

// ============================================================================
// TYPE DEFINITIONS
// Per API_CONTRACTS.md lines 5619-5688 (TiersPageResponse schema)
// ============================================================================

/**
 * User section of tiers page response
 * Per API_CONTRACTS.md lines 5624-5634
 */
export interface TierUserInfo {
  id: string;
  currentTier: string;                  // Database tier_id (e.g., "tier_2")
  currentTierName: string;              // Display name: "Bronze", "Silver", etc.
  currentTierColor: string;             // Hex color from tiers.tier_color
  currentSales: number;                 // Raw number
  currentSalesFormatted: string;        // Backend-formatted: "$2,100" or "2,100 units"
  expirationDate: string | null;        // ISO 8601 (null if Bronze)
  expirationDateFormatted: string | null; // Backend-formatted: "August 10, 2025"
  showExpiration: boolean;              // True if tierLevel > 1
}

/**
 * Progress section of tiers page response
 * Per API_CONTRACTS.md lines 5636-5645
 */
export interface TierProgressInfo {
  nextTierName: string;                 // Display name of next tier
  nextTierTarget: number;               // Raw number
  nextTierTargetFormatted: string;      // Backend-formatted
  amountRemaining: number;              // Calculated: nextTierTarget - currentSales
  amountRemainingFormatted: string;     // Backend-formatted
  progressPercentage: number;           // Calculated percentage
  progressText: string;                 // Backend-formatted: "$900 to go" or "900 units to go"
}

/**
 * Single reward in tier card
 * Per API_CONTRACTS.md lines 5681-5687
 */
export interface TierRewardItem {
  type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience';
  isRaffle: boolean;
  displayText: string;                  // Backend-formatted reward name
  count: number;                        // Quantity (aggregated sum of uses)
  sortPriority: number;                 // 1 = highest priority
}

/**
 * Single tier card in tiers array
 * Per API_CONTRACTS.md lines 5654-5688
 */
export interface TierCardInfo {
  name: string;                         // Display name
  color: string;                        // Hex color
  tierLevel: number;                    // 1 = Bronze, 2 = Silver, etc.
  minSales: number;                     // Raw number
  minSalesFormatted: string;            // Backend-formatted
  salesDisplayText: string;             // Full text: "$1,000+ in sales"
  commissionRate: number;               // Percentage: 10, 12, 15, 20
  commissionDisplayText: string;        // Backend-formatted: "12% Commission on sales"
  isUnlocked: boolean;                  // tier_level <= user's tier_level
  isCurrent: boolean;                   // This is user's current tier
  totalPerksCount: number;              // Sum of reward uses + mission reward uses
  rewards: TierRewardItem[];            // Max 4, sorted by priority
}

/**
 * Complete tiers page response
 * Per API_CONTRACTS.md lines 5619-5690
 */
export interface TiersPageResponse {
  user: TierUserInfo;
  progress: TierProgressInfo;
  vipSystem: VipSystemSettings;
  tiers: TierCardInfo[];
}

// ============================================================================
// CONSTANTS
// Per API_CONTRACTS.md lines 5714-5723 (Priority Sorting)
// ============================================================================

/**
 * Priority sorting for reward display
 * Lower number = higher priority (shown first)
 * Per API_CONTRACTS.md lines 5714-5723
 */
const REWARD_PRIORITY: Record<string, number> = {
  // Raffle rewards (highest priority)
  'physical_gift_raffle': 1,
  'experience_raffle': 2,
  'gift_card_raffle': 3,
  // Non-raffle rewards
  'experience': 4,
  'physical_gift': 5,
  'gift_card': 6,
  'commission_boost': 7,
  'spark_ads': 8,
  'discount': 9,
};

// ============================================================================
// VIP METRIC FORMATTING HELPERS
// Per API_CONTRACTS.md lines 6135-6146 (VIP System Metric Display)
// ============================================================================

/**
 * Format a sales value based on VIP metric
 * Per API_CONTRACTS.md lines 6138-6141
 *
 * @param value - Raw numeric value
 * @param metric - 'sales_dollars' or 'sales_units'
 * @returns Formatted string: "$2,100" or "2,100 units"
 */
export function formatSalesValue(
  value: number,
  metric: 'sales_dollars' | 'sales_units'
): string {
  const formatted = value.toLocaleString('en-US');
  return metric === 'sales_dollars' ? `$${formatted}` : `${formatted} units`;
}

/**
 * Format progress text based on VIP metric
 * Per API_CONTRACTS.md lines 6138-6141
 *
 * @param remaining - Amount remaining to next tier
 * @param metric - 'sales_dollars' or 'sales_units'
 * @returns Formatted string: "$900 to go" or "900 units to go"
 */
export function formatProgressText(
  remaining: number,
  metric: 'sales_dollars' | 'sales_units'
): string {
  const formatted = remaining.toLocaleString('en-US');
  return metric === 'sales_dollars'
    ? `$${formatted} to go`
    : `${formatted} units to go`;
}

/**
 * Format sales display text for tier card
 * Per API_CONTRACTS.md lines 6138-6141
 *
 * @param minSales - Minimum sales threshold
 * @param metric - 'sales_dollars' or 'sales_units'
 * @returns Formatted string: "$1,000+ in sales" or "1,000+ in units sold"
 */
export function formatSalesDisplayText(
  minSales: number,
  metric: 'sales_dollars' | 'sales_units'
): string {
  const formatted = minSales.toLocaleString('en-US');
  return metric === 'sales_dollars'
    ? `$${formatted}+ in sales`
    : `${formatted}+ in units sold`;
}

// ============================================================================
// DISPLAY TEXT GENERATION
// Per API_CONTRACTS.md lines 5692-5721 (Display Rules for Reward Text)
// ============================================================================

/**
 * Generate displayText for a reward based on type and raffle status
 * Per API_CONTRACTS.md lines 5696-5706
 *
 * @param type - Reward type
 * @param isRaffle - Whether reward is tied to raffle mission
 * @param valueData - JSONB value_data from rewards table
 * @param name - Reward name
 * @param description - Reward description
 * @returns Formatted displayText string
 */
export function generateRewardDisplayText(
  type: string,
  isRaffle: boolean,
  valueData: Record<string, unknown> | null,
  name: string | null,
  description: string | null
): string {
  // Helper to get display_text from valueData (supports both snake_case and camelCase)
  // Per SchemaFinalv2.md lines 506-517, JSONB uses snake_case: display_text
  const getDisplayText = (): string | null => {
    return (valueData?.display_text as string) ?? (valueData?.displayText as string) ?? null;
  };

  // Raffle rewards have special "Chance to win" format
  // Per API_CONTRACTS.md lines 5698-5700
  if (isRaffle) {
    switch (type) {
      case 'physical_gift':
        // Use value_data.display_text per SchemaFinalv2.md lines 506-512
        const raffleGiftName = getDisplayText() || description || 'Prize';
        return `Chance to win ${raffleGiftName}!`;
      case 'experience':
        // Use value_data.display_text per SchemaFinalv2.md lines 514-517
        const raffleExpName = getDisplayText() || description || 'Experience';
        return `Chance to win ${raffleExpName}!`;
      case 'gift_card':
        return `Chance to win ${name || 'Gift Card'}!`;
      default:
        return `Chance to win ${name || description || 'Prize'}!`;
    }
  }

  // Non-raffle rewards per API_CONTRACTS.md lines 5701-5706
  switch (type) {
    case 'experience':
      // Per SchemaFinalv2.md lines 514-517: use display_text from value_data
      return getDisplayText() || description || 'Experience';
    case 'physical_gift':
      // Per SchemaFinalv2.md lines 506-512: use display_text from value_data
      const physicalName = getDisplayText() || description || 'Gift';
      return `Gift Drop: ${physicalName}`;
    case 'gift_card':
      return name || 'Gift Card';
    case 'commission_boost':
      return name || 'Pay Boost';
    case 'spark_ads':
      // Per SchemaFinalv2.md lines 495-496: spark_ads has {amount}, generate from it
      // Per existing rewardService.ts pattern (lines 325-326)
      const amount = (valueData?.amount as number) ?? 0;
      return `$${amount} Ads Boost`;
    case 'discount':
      return name || 'Deal Boost';
    default:
      return name || description || 'Reward';
  }
}

/**
 * Get sort priority for a reward
 * Per API_CONTRACTS.md lines 5714-5723
 *
 * @param type - Reward type
 * @param isRaffle - Whether reward is tied to raffle mission
 * @returns Priority number (1 = highest)
 */
export function getRewardPriority(type: string, isRaffle: boolean): number {
  const key = isRaffle ? `${type}_raffle` : type;
  return REWARD_PRIORITY[key] ?? 10; // Default to lowest priority if unknown
}

// ============================================================================
// EXPIRATION LOGIC
// Per API_CONTRACTS.md lines 6101-6109 (Expiration Logic)
// ============================================================================

/**
 * Calculate expiration display based on tier level
 * Per API_CONTRACTS.md lines 6101-6109
 *
 * - tierLevel === 1 (Bronze): Never expires
 *   - expirationDate: null
 *   - showExpiration: false
 * - tierLevel > 1: 6-month checkpoint renewal
 *   - expirationDate: ISO 8601
 *   - showExpiration: true
 *
 * @param tierLevel - User's current tier level (1 = Bronze)
 * @param nextCheckpointAt - ISO 8601 timestamp or null
 * @returns Object with expirationDate, expirationDateFormatted, showExpiration
 */
export function getExpirationInfo(
  tierLevel: number,
  nextCheckpointAt: string | null
): {
  expirationDate: string | null;
  expirationDateFormatted: string | null;
  showExpiration: boolean;
} {
  // Bronze (tier_level = 1) never expires
  if (tierLevel === 1) {
    return {
      expirationDate: null,
      expirationDateFormatted: null,
      showExpiration: false,
    };
  }

  // Higher tiers have checkpoint expiration
  if (!nextCheckpointAt) {
    // Shouldn't happen for non-Bronze, but handle gracefully
    return {
      expirationDate: null,
      expirationDateFormatted: null,
      showExpiration: true, // Still show section, just no date
    };
  }

  // Format date as "Month DD, YYYY"
  const date = new Date(nextCheckpointAt);
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    expirationDate: nextCheckpointAt,
    expirationDateFormatted: formatted,
    showExpiration: true,
  };
}

// ============================================================================
// REWARD AGGREGATION
// Per API_CONTRACTS.md lines 6111-6132 (Reward Aggregation)
// ============================================================================

/**
 * Aggregate rewards by type+isRaffle for a specific tier
 * Per API_CONTRACTS.md lines 6111-6132
 *
 * @param vipRewards - VIP tier rewards (isRaffle = false)
 * @param missionRewards - Mission rewards (isRaffle from mission_type)
 * @param tierEligibility - The tier to filter rewards for
 * @returns Aggregated rewards sorted by priority, max 4
 */
function aggregateRewardsForTier(
  vipRewards: TierRewardData[],
  missionRewards: TierMissionData[],
  tierEligibility: string
): { rewards: TierRewardItem[]; totalPerksCount: number } {
  // Filter rewards for this tier
  const tierVipRewards = vipRewards.filter(r => r.tierEligibility === tierEligibility);
  const tierMissionRewards = missionRewards.filter(m => m.tierEligibility === tierEligibility);

  // Group by type+isRaffle key
  const grouped = new Map<string, {
    type: string;
    isRaffle: boolean;
    totalUses: number;
    sample: { name: string | null; description: string | null; valueData: Record<string, unknown> | null };
  }>();

  // Add VIP rewards (isRaffle = false)
  for (const reward of tierVipRewards) {
    const key = `${reward.type}_false`;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalUses += reward.uses;
    } else {
      grouped.set(key, {
        type: reward.type,
        isRaffle: false,
        totalUses: reward.uses,
        sample: { name: reward.name, description: reward.description, valueData: reward.valueData },
      });
    }
  }

  // Add mission rewards (isRaffle from mission)
  for (const mission of tierMissionRewards) {
    const key = `${mission.reward.type}_${mission.isRaffle}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalUses += mission.reward.uses;
    } else {
      grouped.set(key, {
        type: mission.reward.type,
        isRaffle: mission.isRaffle,
        totalUses: mission.reward.uses,
        sample: { name: mission.reward.name, description: mission.reward.description, valueData: mission.reward.valueData },
      });
    }
  }

  // Calculate totalPerksCount (sum of all uses)
  let totalPerksCount = 0;
  for (const reward of tierVipRewards) {
    totalPerksCount += reward.uses;
  }
  for (const mission of tierMissionRewards) {
    totalPerksCount += mission.reward.uses;
  }

  // Convert to TierRewardItem array with displayText and priority
  const aggregated: TierRewardItem[] = [];
  for (const [, data] of grouped) {
    const priority = getRewardPriority(data.type, data.isRaffle);
    const displayText = generateRewardDisplayText(
      data.type,
      data.isRaffle,
      data.sample.valueData,
      data.sample.name,
      data.sample.description
    );

    aggregated.push({
      type: data.type as TierRewardItem['type'],
      isRaffle: data.isRaffle,
      displayText,
      count: data.totalUses,
      sortPriority: priority,
    });
  }

  // Sort by priority and take max 4
  aggregated.sort((a, b) => a.sortPriority - b.sortPriority);
  const rewards = aggregated.slice(0, 4);

  return { rewards, totalPerksCount };
}

// ============================================================================
// MAIN SERVICE FUNCTION
// Per API_CONTRACTS.md lines 5619-5689 (TiersPageResponse)
// ============================================================================

/**
 * Get complete tiers page data for a user
 * Per API_CONTRACTS.md lines 5619-5689
 *
 * @param userId - User ID
 * @param clientId - Client ID for multi-tenant isolation
 * @returns TiersPageResponse with user, progress, vipSystem, tiers
 */
export async function getTiersPageData(
  userId: string,
  clientId: string
): Promise<TiersPageResponse> {
  // 1. Get all required data from repository
  const [userContext, vipSettings, allTiers, vipRewards, missionRewards] = await Promise.all([
    tierRepository.getUserTierContext(userId, clientId),
    tierRepository.getVipSystemSettings(clientId),
    tierRepository.getAllTiers(clientId),
    tierRepository.getVipTierRewards(clientId),
    tierRepository.getTierMissions(clientId),
  ]);

  if (!userContext) {
    throw new Error('User not found or not associated with client');
  }

  // 2. Find current tier data
  const currentTierData = allTiers.find(t => t.tierId === userContext.currentTier);
  if (!currentTierData) {
    throw new Error(`Current tier ${userContext.currentTier} not found`);
  }

  // 3. Filter tiers: only current + higher (tier_order >= user's current tier_order)
  // Per API_CONTRACTS.md lines 6092-6098
  const filteredTiers = allTiers.filter(t => t.tierOrder >= userContext.currentTierOrder);

  // 4. Find next tier (if exists)
  const nextTier = allTiers.find(t => t.tierOrder === userContext.currentTierOrder + 1);

  // 5. Get current sales based on VIP metric
  const currentSales = vipSettings.metric === 'sales_dollars'
    ? userContext.totalSales
    : userContext.totalUnits;

  // 6. Calculate progress to next tier
  let nextTierTarget = 0;
  let nextTierName = '';
  if (nextTier) {
    nextTierName = nextTier.tierName;
    nextTierTarget = vipSettings.metric === 'sales_dollars'
      ? (nextTier.salesThreshold ?? 0)
      : (nextTier.unitsThreshold ?? 0);
  }

  const amountRemaining = Math.max(0, nextTierTarget - currentSales);
  const progressPercentage = nextTierTarget > 0
    ? Math.min(100, Math.round((currentSales / nextTierTarget) * 100))
    : 100;

  // 7. Get expiration info
  const expirationInfo = getExpirationInfo(userContext.currentTierOrder, userContext.nextCheckpointAt);

  // 8. Build tier cards with aggregated rewards
  const tierCards: TierCardInfo[] = filteredTiers.map(tier => {
    const { rewards, totalPerksCount } = aggregateRewardsForTier(
      vipRewards,
      missionRewards,
      tier.tierId
    );

    const minSales = vipSettings.metric === 'sales_dollars'
      ? (tier.salesThreshold ?? 0)
      : (tier.unitsThreshold ?? 0);

    return {
      name: tier.tierName,
      color: tier.tierColor,
      tierLevel: tier.tierOrder,
      minSales,
      minSalesFormatted: formatSalesValue(minSales, vipSettings.metric),
      salesDisplayText: formatSalesDisplayText(minSales, vipSettings.metric),
      commissionRate: tier.commissionRate,
      commissionDisplayText: `${tier.commissionRate}% Commission on sales`,
      isUnlocked: tier.tierOrder <= userContext.currentTierOrder,
      isCurrent: tier.tierId === userContext.currentTier,
      totalPerksCount,
      rewards,
    };
  });

  // 9. Build and return response
  return {
    user: {
      id: userContext.userId,
      currentTier: userContext.currentTier,
      currentTierName: currentTierData.tierName,
      currentTierColor: currentTierData.tierColor,
      currentSales,
      currentSalesFormatted: formatSalesValue(currentSales, vipSettings.metric),
      expirationDate: expirationInfo.expirationDate,
      expirationDateFormatted: expirationInfo.expirationDateFormatted,
      showExpiration: expirationInfo.showExpiration,
    },
    progress: {
      nextTierName: nextTierName || 'Max Tier',
      nextTierTarget,
      nextTierTargetFormatted: formatSalesValue(nextTierTarget, vipSettings.metric),
      amountRemaining,
      amountRemainingFormatted: formatSalesValue(amountRemaining, vipSettings.metric),
      progressPercentage,
      progressText: nextTier ? formatProgressText(amountRemaining, vipSettings.metric) : 'Max tier reached!',
    },
    vipSystem: vipSettings,
    tiers: tierCards,
  };
}

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export const tierService = {
  getTiersPageData,
};
