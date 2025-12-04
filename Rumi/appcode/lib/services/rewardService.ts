/**
 * Reward Service
 *
 * Business logic layer for VIP tier rewards, redemptions, and payouts.
 * Per ARCHITECTURE.md Section 5 (Service Layer, lines 467-530)
 *
 * Responsibilities:
 * - Orchestrating multiple repositories
 * - Implementing business rules (11 pre-claim validation rules)
 * - Data transformations (status computation, formatting)
 * - Computing derived values (availability, sorting priority)
 * - Transaction coordination
 *
 * NOT Responsible For:
 * - Direct database access (use repositories)
 * - HTTP handling (that's routes)
 * - Raw SQL queries (that's repositories)
 *
 * References:
 * - API_CONTRACTS.md lines 4053-5600 (Rewards endpoints)
 * - ARCHITECTURE.md Section 10.1 (Rewards Claim Validation, lines 1201-1294)
 * - Loyalty.md lines 1994-2077 (Reward Redemption Rules)
 * - MissionsRewardsFlows.md (6 reward types, state machines)
 */

import {
  rewardRepository,
  type AvailableRewardData,
} from '@/lib/repositories/rewardRepository';

// ============================================================================
// Types
// ============================================================================

/**
 * Reward status - 10 possible values in priority order
 * Per API_CONTRACTS.md lines 4428-4561
 */
export type RewardStatus =
  | 'pending_info'
  | 'clearing'
  | 'sending'
  | 'active'
  | 'scheduled'
  | 'redeeming_physical'
  | 'redeeming'
  | 'claimable'
  | 'limit_reached'
  | 'locked';

/**
 * Status priority for sorting (lower = higher priority)
 * Per API_CONTRACTS.md lines 4714-4726
 */
const STATUS_PRIORITY: Record<RewardStatus, number> = {
  pending_info: 1, // Action required
  claimable: 2, // Action required
  clearing: 3, // Status update
  sending: 4, // Status update
  active: 5, // Status update
  scheduled: 6, // Status update
  redeeming: 7, // Processing
  redeeming_physical: 8, // Processing
  limit_reached: 9, // Informational
  locked: 10, // Informational
};

/**
 * User info for response header
 * Per API_CONTRACTS.md lines 4076-4082
 */
export interface RewardUserInfo {
  id: string;
  handle: string;
  currentTier: string;
  currentTierName: string;
  currentTierColor: string;
}

/**
 * Status details with formatted dates/times
 * Per API_CONTRACTS.md lines 4132-4147
 */
export interface StatusDetails {
  scheduledDate?: string;
  scheduledDateRaw?: string;
  activationDate?: string;
  expirationDate?: string;
  daysRemaining?: number;
  shippingCity?: string;
  clearingDays?: number;
}

/**
 * Single reward in the response
 * Per API_CONTRACTS.md lines 4088-4154
 */
export interface RewardItem {
  id: string;
  type: string;
  name: string;
  description: string;
  displayText: string;
  valueData: Record<string, unknown> | null;
  status: RewardStatus;
  canClaim: boolean;
  isLocked: boolean;
  isPreview: boolean;
  usedCount: number;
  totalQuantity: number | null;
  tierEligibility: string;
  requiredTierName: string | null;
  rewardSource: string;
  displayOrder: number;
  statusDetails: StatusDetails | null;
  redemptionFrequency: string;
  redemptionType: string;
}

/**
 * Full response for GET /api/rewards
 * Per API_CONTRACTS.md lines 4073-4155
 */
export interface RewardsPageResponse {
  user: RewardUserInfo;
  redemptionCount: number;
  rewards: RewardItem[];
}

/**
 * Input parameters for listAvailableRewards
 */
export interface ListAvailableRewardsParams {
  userId: string;
  clientId: string;
  currentTier: string;
  currentTierOrder: number;
  tierAchievedAt: string | null;
  userHandle: string;
  tierName: string;
  tierColor: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate backend-formatted name based on reward type
 * Per API_CONTRACTS.md lines 4162-4169
 */
function generateName(
  type: string,
  valueData: Record<string, unknown> | null,
  description: string | null
): string {
  switch (type) {
    case 'gift_card':
      return `$${valueData?.amount ?? 0} Gift Card`;
    case 'commission_boost':
      return `${valueData?.percent ?? 0}% Pay Boost`;
    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Ads Boost`;
    case 'discount':
      return `${valueData?.percent ?? 0}% Deal Boost`;
    case 'physical_gift':
      return `Gift Drop: ${description ?? 'Gift'}`;
    case 'experience':
      return description ?? 'Experience';
    default:
      return description ?? 'Reward';
  }
}

/**
 * Generate backend-formatted displayText based on reward type
 * Per API_CONTRACTS.md lines 4162-4169
 */
function generateDisplayText(
  type: string,
  valueData: Record<string, unknown> | null,
  description: string | null
): string {
  switch (type) {
    case 'gift_card':
      return 'Amazon Gift Card';
    case 'commission_boost': {
      const durationDays = valueData?.duration_days ?? valueData?.durationDays ?? 30;
      return `Higher earnings (${durationDays}d)`;
    }
    case 'spark_ads':
      return 'Spark Ads Promo';
    case 'discount': {
      // Convert duration_minutes to days per API_CONTRACTS.md lines 4662-4672
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `Follower Discount (${durationDays}d)`;
    }
    case 'physical_gift':
      return (valueData?.display_text as string) ?? (valueData?.displayText as string) ?? description ?? 'Gift';
    case 'experience':
      return (valueData?.display_text as string) ?? (valueData?.displayText as string) ?? description ?? 'Experience';
    default:
      return description ?? 'Reward';
  }
}

/**
 * Format date as human-readable string
 * e.g., "Jan 15, 2025"
 */
function formatDate(dateString: string | null): string | undefined {
  if (!dateString) return undefined;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return undefined;
  }
}

/**
 * Format date and time as human-readable string
 * e.g., "Jan 15, 2025 at 2:00 PM"
 */
function formatDateTime(
  dateString: string | null,
  timeString: string | null
): string | undefined {
  if (!dateString) return undefined;
  try {
    let dateTimeStr = dateString;
    if (timeString) {
      dateTimeStr = `${dateString}T${timeString}`;
    }
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return undefined;
  }
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Compute reward status from multiple table data
 * Per API_CONTRACTS.md lines 4428-4561 (10-priority status computation)
 */
function computeStatus(
  data: AvailableRewardData,
  currentTier: string,
  usedCount: number
): {
  status: RewardStatus;
  canClaim: boolean;
  isLocked: boolean;
  isPreview: boolean;
  requiredTierName: string | null;
  statusDetails: StatusDetails | null;
} {
  const { reward, tier, redemption, commissionBoost, physicalGift } = data;

  // Priority 10: Locked (tier-gated preview)
  // Check this first to set isLocked/isPreview regardless of other status
  const isLocked = reward.tierEligibility !== currentTier;
  const isPreview = isLocked && reward.previewFromTier !== null;
  const requiredTierName = isLocked ? tier.name : null;

  if (isLocked) {
    return {
      status: 'locked',
      canClaim: false,
      isLocked: true,
      isPreview,
      requiredTierName,
      statusDetails: null,
    };
  }

  // Check for active redemption
  if (redemption) {
    const redemptionStatus = redemption.status;

    // Priority 1: pending_info - Commission boost waiting for payment info
    if (
      reward.type === 'commission_boost' &&
      redemptionStatus === 'claimed' &&
      commissionBoost?.boostStatus === 'pending_info'
    ) {
      return {
        status: 'pending_info',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: null,
      };
    }

    // Priority 2: clearing - Commission boost pending payout (20-day clearing)
    if (
      reward.type === 'commission_boost' &&
      redemptionStatus === 'fulfilled' &&
      commissionBoost?.boostStatus === 'pending_payout'
    ) {
      let clearingDays: number | undefined;
      if (commissionBoost.salesAtExpiration !== null) {
        // Calculate days remaining in 20-day clearing period
        // This is approximate - actual calculation may vary
        clearingDays = 20;
      }
      return {
        status: 'clearing',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: clearingDays ? { clearingDays } : null,
      };
    }

    // Priority 3: sending - Physical gift shipped
    if (
      reward.type === 'physical_gift' &&
      redemptionStatus === 'claimed' &&
      physicalGift?.shippedAt !== null
    ) {
      return {
        status: 'sending',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: physicalGift?.shippingCity
          ? { shippingCity: physicalGift.shippingCity }
          : null,
      };
    }

    // Priority 4: active - Commission boost or discount currently active
    if (
      reward.type === 'commission_boost' &&
      redemptionStatus === 'claimed' &&
      commissionBoost?.boostStatus === 'active'
    ) {
      const statusDetails: StatusDetails = {};
      if (commissionBoost.activatedAt) {
        statusDetails.activationDate = formatDate(commissionBoost.activatedAt);
      }
      if (commissionBoost.expiresAt) {
        statusDetails.expirationDate = formatDate(commissionBoost.expiresAt);
        statusDetails.daysRemaining = daysBetween(
          new Date(),
          new Date(commissionBoost.expiresAt)
        );
      }
      return {
        status: 'active',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: Object.keys(statusDetails).length > 0 ? statusDetails : null,
      };
    }

    // Discount active check
    if (
      reward.type === 'discount' &&
      redemptionStatus === 'fulfilled' &&
      redemption.activationDate &&
      redemption.expirationDate
    ) {
      const now = new Date();
      const activationDate = new Date(redemption.activationDate);
      const expirationDate = new Date(redemption.expirationDate);

      if (now >= activationDate && now <= expirationDate) {
        return {
          status: 'active',
          canClaim: false,
          isLocked: false,
          isPreview: false,
          requiredTierName: null,
          statusDetails: {
            activationDate: formatDate(redemption.activationDate),
            expirationDate: formatDate(redemption.expirationDate),
            daysRemaining: daysBetween(now, expirationDate),
          },
        };
      }
    }

    // Priority 5: scheduled - Future activation scheduled
    if (
      (reward.type === 'commission_boost' || reward.type === 'discount') &&
      redemptionStatus === 'claimed' &&
      redemption.scheduledActivationDate
    ) {
      return {
        status: 'scheduled',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: {
          scheduledDate: formatDateTime(
            redemption.scheduledActivationDate,
            redemption.scheduledActivationTime
          ),
          scheduledDateRaw: redemption.scheduledActivationDate,
        },
      };
    }

    // Priority 6: redeeming_physical - Physical gift address provided, not shipped
    if (
      reward.type === 'physical_gift' &&
      redemptionStatus === 'claimed' &&
      physicalGift?.shippingCity !== null &&
      physicalGift?.shippedAt === null
    ) {
      return {
        status: 'redeeming_physical',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: null,
      };
    }

    // Priority 7: redeeming - Instant rewards being processed
    if (
      ['gift_card', 'spark_ads', 'experience'].includes(reward.type) &&
      redemptionStatus === 'claimed'
    ) {
      return {
        status: 'redeeming',
        canClaim: false,
        isLocked: false,
        isPreview: false,
        requiredTierName: null,
        statusDetails: null,
      };
    }
  }

  // No active redemption - check if claimable or limit reached

  // Priority 9: limit_reached - All uses exhausted
  const totalQuantity = reward.redemptionQuantity;
  if (totalQuantity !== null && usedCount >= totalQuantity) {
    return {
      status: 'limit_reached',
      canClaim: false,
      isLocked: false,
      isPreview: false,
      requiredTierName: null,
      statusDetails: null,
    };
  }

  // Priority 8: claimable - Available to claim
  return {
    status: 'claimable',
    canClaim: true,
    isLocked: false,
    isPreview: false,
    requiredTierName: null,
    statusDetails: null,
  };
}

/**
 * Transform valueData for API response
 * Converts snake_case to camelCase and duration_minutes to durationDays for discount
 */
function transformValueData(
  type: string,
  valueData: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!valueData) return null;

  const result: Record<string, unknown> = {};

  // Copy and transform fields
  if (valueData.amount !== undefined) result.amount = valueData.amount;
  if (valueData.percent !== undefined) result.percent = valueData.percent;

  // Handle duration - convert duration_minutes to durationDays for discount
  if (type === 'discount' && valueData.duration_minutes !== undefined) {
    result.durationDays = Math.floor((valueData.duration_minutes as number) / 1440);
  } else if (valueData.duration_days !== undefined) {
    result.durationDays = valueData.duration_days;
  } else if (valueData.durationDays !== undefined) {
    result.durationDays = valueData.durationDays;
  }

  // Discount-specific fields
  if (valueData.coupon_code !== undefined) result.couponCode = valueData.coupon_code;
  if (valueData.couponCode !== undefined) result.couponCode = valueData.couponCode;
  if (valueData.max_uses !== undefined) result.maxUses = valueData.max_uses;
  if (valueData.maxUses !== undefined) result.maxUses = valueData.maxUses;

  // Physical gift fields
  if (valueData.requires_size !== undefined) result.requiresSize = valueData.requires_size;
  if (valueData.requiresSize !== undefined) result.requiresSize = valueData.requiresSize;
  if (valueData.size_category !== undefined) result.sizeCategory = valueData.size_category;
  if (valueData.sizeCategory !== undefined) result.sizeCategory = valueData.sizeCategory;
  if (valueData.size_options !== undefined) result.sizeOptions = valueData.size_options;
  if (valueData.sizeOptions !== undefined) result.sizeOptions = valueData.sizeOptions;
  if (valueData.display_text !== undefined) result.displayText = valueData.display_text;
  if (valueData.displayText !== undefined) result.displayText = valueData.displayText;

  return Object.keys(result).length > 0 ? result : null;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Reward service functions following verbNoun() naming convention
 * Per ARCHITECTURE.md Section 7 (Naming Conventions, line 947)
 */
export const rewardService = {
  /**
   * List all available rewards for user's current tier with computed status and formatting.
   * Per API_CONTRACTS.md lines 4060-4827 (GET /api/rewards)
   *
   * Responsibilities:
   * 1. Fetch rewards with active redemptions from repository
   * 2. Compute status from 10-priority ranking
   * 3. Generate backend-formatted name and displayText
   * 4. Calculate canClaim, isLocked, isPreview
   * 5. Get usedCount per reward (batch query)
   * 6. Generate statusDetails with formatted dates
   * 7. Sort by status priority, then displayOrder
   * 8. Get redemptionCount for history link
   *
   * @param params - User info and tier context
   * @returns Complete RewardsPageResponse for frontend
   */
  async listAvailableRewards(
    params: ListAvailableRewardsParams
  ): Promise<RewardsPageResponse> {
    const {
      userId,
      clientId,
      currentTier,
      currentTierOrder,
      tierAchievedAt,
      userHandle,
      tierName,
      tierColor,
    } = params;

    // Step 1: Fetch rewards with active redemptions and sub-states
    const rawRewards = await rewardRepository.listAvailable(
      userId,
      clientId,
      currentTier,
      currentTierOrder
    );

    // Step 2: Get usage counts for all rewards in one batch query
    const rewardIds = rawRewards.map((r) => r.reward.id);
    const usageCountMap = await rewardRepository.getUsageCountBatch(
      userId,
      rewardIds,
      clientId,
      currentTier,
      tierAchievedAt
    );

    // Step 3: Get redemption count for history link
    const redemptionCount = await rewardRepository.getRedemptionCount(userId, clientId);

    // Step 4: Transform each reward with computed status and formatting
    const rewards: RewardItem[] = rawRewards.map((data) => {
      const { reward } = data;
      const usedCount = usageCountMap.get(reward.id) || 0;

      // Compute status and availability
      const {
        status,
        canClaim,
        isLocked,
        isPreview,
        requiredTierName,
        statusDetails,
      } = computeStatus(data, currentTier, usedCount);

      // Generate backend-formatted strings
      const name = generateName(reward.type, reward.valueData, reward.description);
      const displayText = generateDisplayText(
        reward.type,
        reward.valueData,
        reward.description
      );

      // Transform valueData (snake_case → camelCase)
      const transformedValueData = transformValueData(reward.type, reward.valueData);

      return {
        id: reward.id,
        type: reward.type,
        name,
        description: reward.description ?? '',
        displayText,
        valueData: transformedValueData,
        status,
        canClaim,
        isLocked,
        isPreview,
        usedCount,
        totalQuantity: reward.redemptionQuantity,
        tierEligibility: reward.tierEligibility,
        requiredTierName,
        rewardSource: reward.rewardSource,
        displayOrder: reward.displayOrder ?? 0,
        statusDetails,
        redemptionFrequency: reward.redemptionFrequency,
        redemptionType: reward.redemptionType,
      };
    });

    // Step 5: Sort by status priority (1-10), then by displayOrder
    rewards.sort((a, b) => {
      const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.displayOrder - b.displayOrder;
    });

    // Step 6: Build response
    return {
      user: {
        id: userId,
        handle: userHandle,
        currentTier,
        currentTierName: tierName,
        currentTierColor: tierColor,
      },
      redemptionCount,
      rewards,
    };
  },

  // Task 6.2.3: claimReward - 11 pre-claim validation rules, type routing
  // Task 6.2.4: claimInstant - gift_card, spark_ads, experience + Google Calendar
  // Task 6.2.5: claimScheduled - discount with scheduled activation + Calendar
  // Task 6.2.6: claimPhysical - shipping address + Calendar
  // Task 6.2.7: claimCommissionBoost - boost activation, auto-sync
  // Task 6.2.7a: Commission Boost payout calendar event
  // Task 6.2.8: getRewardHistory - format concluded redemptions
  // Task 6.2.9: getPaymentInfo - service wrapper
  // Task 6.2.10: savePaymentInfo - 4 validation rules
};
