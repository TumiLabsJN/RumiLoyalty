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
  type ShippingInfo,
} from '@/lib/repositories/rewardRepository';
import { userRepository } from '@/lib/repositories/userRepository';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';
import {
  AppError,
  ErrorCode,
  tierIneligibleError,
  activeClaimExistsError,
  limitReachedError,
  schedulingRequiredError,
  invalidScheduleWeekdayError,
  invalidTimeSlotError,
  shippingInfoRequiredError,
  sizeRequiredError,
  invalidSizeSelectionError,
  paymentAccountMismatchError,
  invalidPaypalEmailError,
  invalidVenmoHandleError,
  paymentInfoNotRequiredError,
} from '@/lib/utils/errors';
import {
  createInstantRewardEvent,
  createDiscountActivationEvent,
  createPhysicalGiftEvent,
  createCommissionBoostScheduledEvent,
} from '@/lib/utils/googleCalendar';

// Import shared types from canonical source (ENH-006)
import type {
  RewardsPageResponse,
  Reward,
  RewardType,
  RewardStatus,
  RedemptionFrequency,
  RedemptionType,
  ValueData,
  StatusDetails,
  ClaimRewardRequest,
  ClaimRewardResponse,
} from '@/lib/types/rewards';

// Re-export for consumers that import from service
export type {
  RewardsPageResponse,
  Reward,
  RewardType,
  RewardStatus,
  ValueData,
  StatusDetails,
};

// ============================================================================
// Types (Service-specific)
// ============================================================================

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

// NOTE: RewardUserInfo, StatusDetails, RewardItem, RewardsPageResponse
// are now imported from @/lib/types/rewards (ENH-006 type consolidation)

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

/**
 * Input parameters for claimReward
 * Per API_CONTRACTS.md lines 4852-4876
 */
export interface ClaimRewardParams {
  userId: string;
  clientId: string;
  rewardId: string;
  currentTier: string;
  tierAchievedAt: string | null;
  scheduledActivationAt?: string;
  shippingInfo?: ShippingInfo;
  sizeValue?: string;
  // Added for Google Calendar event creation (Task 6.2.4)
  userHandle: string; // TikTok handle for calendar event title
  userEmail: string; // Email for calendar event description
}

/**
 * Next steps hint for UI
 * Per API_CONTRACTS.md lines 5042-5046
 */
export interface NextSteps {
  action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation';
  message: string;
}

/**
 * Single history item in reward history response
 * Per API_CONTRACTS.md lines 5499-5509
 */
export interface RewardHistoryItem {
  id: string;
  rewardId: string;
  name: string;
  description: string;
  type: string;
  rewardSource: 'vip_tier' | 'mission';
  claimedAt: string;
  concludedAt: string;
  status: 'concluded';
}

/**
 * Full response for GET /api/rewards/history
 * Per API_CONTRACTS.md lines 5490-5510
 */
export interface RedemptionHistoryResponse {
  user: {
    id: string;
    handle: string;
    currentTier: string;
    currentTierName: string;
    currentTierColor: string;
  };
  history: RewardHistoryItem[];
}

/**
 * Input parameters for getRewardHistory
 */
export interface GetRewardHistoryParams {
  userId: string;
  clientId: string;
  userHandle: string;
  currentTier: string;
  tierName: string;
  tierColor: string;
}

/**
 * Response for GET /api/user/payment-info
 * Per API_CONTRACTS.md lines 5301-5305
 */
export interface PaymentInfoResponse {
  hasPaymentInfo: boolean;
  paymentMethod: 'paypal' | 'venmo' | null;
  paymentAccount: string | null;
}

/**
 * Input parameters for savePaymentInfo
 * Per API_CONTRACTS.md lines 5346-5351
 */
export interface SavePaymentInfoParams {
  userId: string;
  clientId: string;
  redemptionId: string;
  paymentMethod: 'paypal' | 'venmo';
  paymentAccount: string;
  paymentAccountConfirm: string;
  saveAsDefault: boolean;
}

/**
 * Response for POST /api/rewards/:id/payment-info
 * Per API_CONTRACTS.md lines 5379-5389
 */
export interface SavePaymentInfoResponse {
  success: boolean;
  message: string;
  redemption: {
    id: string;
    status: 'fulfilled';
    paymentMethod: 'paypal' | 'venmo';
    paymentInfoCollectedAt: string;
  };
  userPaymentUpdated: boolean;
}

// NOTE: ClaimRewardResponse is now imported from @/lib/types/rewards (ENH-006)

// ============================================================================
// Type Guard Helpers (ENH-006: Centralized boundary validation)
// ============================================================================

const VALID_REWARD_TYPES = new Set<RewardType>([
  'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'
]);

const VALID_REDEMPTION_FREQUENCIES = new Set<RedemptionFrequency>([
  'one-time', 'monthly', 'weekly', 'unlimited'
]);

const VALID_REDEMPTION_TYPES = new Set<RedemptionType>([
  'instant', 'scheduled'
]);

/**
 * Validate and convert string to RewardType at DB boundary.
 * Throws if invalid to prevent bad data from silently flowing.
 */
function toRewardType(value: string): RewardType {
  if (VALID_REWARD_TYPES.has(value as RewardType)) {
    return value as RewardType;
  }
  console.error(`[rewardService] Invalid reward type: ${value}`);
  throw new Error(`Invalid reward type: ${value}`);
}

/**
 * Validate and convert string to RedemptionFrequency at DB boundary.
 */
function toRedemptionFrequency(value: string): RedemptionFrequency {
  if (VALID_REDEMPTION_FREQUENCIES.has(value as RedemptionFrequency)) {
    return value as RedemptionFrequency;
  }
  console.error(`[rewardService] Invalid redemption frequency: ${value}`);
  throw new Error(`Invalid redemption frequency: ${value}`);
}

/**
 * Validate and convert string to RedemptionType at DB boundary.
 */
function toRedemptionType(value: string): RedemptionType {
  if (VALID_REDEMPTION_TYPES.has(value as RedemptionType)) {
    return value as RedemptionType;
  }
  console.error(`[rewardService] Invalid redemption type: ${value}`);
  throw new Error(`Invalid redemption type: ${value}`);
}

/**
 * Validate reward source at DB boundary.
 */
function toRewardSource(value: string): 'vip_tier' | 'mission' {
  if (value === 'vip_tier' || value === 'mission') {
    return value;
  }
  console.error(`[rewardService] Invalid reward source: ${value}`);
  throw new Error(`Invalid reward source: ${value}`);
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

/**
 * Get next steps hint based on reward type
 * Per API_CONTRACTS.md lines 5083-5086, 5123-5126, 5159-5162
 */
function getNextSteps(rewardType: string): NextSteps {
  switch (rewardType) {
    case 'physical_gift':
      return {
        action: 'shipping_confirmation',
        message:
          'Your shipping info has been received. We\'ll send tracking details via email!',
      };
    case 'discount':
    case 'commission_boost':
      return {
        action: 'scheduled_confirmation',
        message:
          rewardType === 'discount'
            ? 'Your discount will activate at the scheduled time!'
            : 'Your boost will activate automatically at 2 PM ET on the scheduled date!',
      };
    default:
      // gift_card, spark_ads, experience
      return {
        action: 'wait_fulfillment',
        message:
          'Your reward is being processed. You\'ll receive an email when it\'s ready!',
      };
  }
}

/**
 * Get updated status after claim based on reward type
 * Per API_CONTRACTS.md lines 5091, 5131, 5167
 */
function getUpdatedStatus(rewardType: string, hasShippingInfo: boolean): string {
  switch (rewardType) {
    case 'physical_gift':
      return hasShippingInfo ? 'redeeming_physical' : 'redeeming';
    case 'discount':
    case 'commission_boost':
      return 'scheduled';
    default:
      // gift_card, spark_ads, experience
      return 'redeeming';
  }
}

/**
 * Generate success message based on reward type
 * Per API_CONTRACTS.md lines 5065, 5103, 5143
 */
function getSuccessMessage(
  rewardType: string,
  description: string | null,
  scheduledDate?: string
): string {
  switch (rewardType) {
    case 'gift_card':
      return 'Gift card claimed! You\'ll receive your reward soon.';
    case 'spark_ads':
      return 'Spark Ads boost claimed! You\'ll receive your reward soon.';
    case 'experience':
      return `${description || 'Experience'} claimed! You'll receive details soon.`;
    case 'physical_gift':
      return `${description || 'Item'} claimed! We'll ship it to your address soon.`;
    case 'discount':
      return scheduledDate
        ? `Discount scheduled to activate on ${formatDateForMessage(scheduledDate)}!`
        : 'Discount scheduled!';
    case 'commission_boost':
      return scheduledDate
        ? `Commission boost scheduled to activate on ${formatDateForMessage(scheduledDate)} at 2:00 PM ET`
        : 'Commission boost scheduled!';
    default:
      return 'Reward claimed successfully!';
  }
}

/**
 * Format date for user-facing message
 * e.g., "Jan 20"
 */
function formatDateForMessage(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
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
    const SVC_START = Date.now();
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

    // ENH-008: Step 1 - Fetch rewards AND redemption count IN PARALLEL (they're independent)
    const t1 = Date.now();
    const [rawRewards, redemptionCount] = await Promise.all([
      rewardRepository.listAvailable(userId, clientId, currentTier, currentTierOrder),
      rewardRepository.getRedemptionCount(userId, clientId),
    ]);
    console.log(`[TIMING][rewardService] Promise.all(listAvailable+getRedemptionCount): ${Date.now() - t1}ms (${rawRewards.length} rewards)`);

    // Step 2: Get usage counts (depends on rawRewards, so runs after)
    const rewardIds = rawRewards.map((r) => r.reward.id);
    const t2 = Date.now();
    const usageCountMap = await rewardRepository.getUsageCountBatch(
      userId,
      rewardIds,
      clientId,
      currentTier,
      tierAchievedAt
    );
    console.log(`[TIMING][rewardService] getUsageCountBatch(): ${Date.now() - t2}ms`);

    // Step 4: Transform each reward with computed status and formatting
    const rewards: Reward[] = rawRewards.map((data) => {
      const { reward, redemption } = data;
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
        redemptionId: redemption?.id ?? null,
        type: toRewardType(reward.type),
        name,
        description: reward.description ?? '',
        displayText,
        valueData: transformedValueData as ValueData | null,
        status,
        canClaim,
        isLocked,
        isPreview,
        usedCount,
        totalQuantity: reward.redemptionQuantity ?? 0,
        tierEligibility: reward.tierEligibility,
        requiredTierName,
        rewardSource: toRewardSource(reward.rewardSource),
        displayOrder: reward.displayOrder ?? 0,
        statusDetails,
        redemptionFrequency: toRedemptionFrequency(reward.redemptionFrequency),
        redemptionType: toRedemptionType(reward.redemptionType),
      };
    });

    // Step 5: Sort by status priority (1-10), then by displayOrder
    rewards.sort((a, b) => {
      const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.displayOrder - b.displayOrder;
    });

    // Step 6: Build response
    console.log(`[TIMING][rewardService] TOTAL listAvailableRewards(): ${Date.now() - SVC_START}ms`);
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

  /**
   * Claim a VIP tier reward with 11-step pre-claim validation.
   * Per API_CONTRACTS.md lines 4836-5279 (POST /api/rewards/:id/claim)
   *
   * Validation Rules (in order):
   * 1. Authentication (handled by route)
   * 2. Reward exists
   * 3. Reward enabled
   * 4. Tier eligibility matches
   * 5. VIP tier only (reward_source='vip_tier')
   * 6. No active claim (status IN ['claimed', 'fulfilled'])
   * 7. Usage limit check
   * 8. Scheduling required for discount/commission_boost
   * 9. Discount scheduling: weekday Mon-Fri, 09:00-16:00 EST
   * 10. Commission boost: future date, auto-set to 14:00:00 EST (19:00 UTC)
   * 11. Physical gift: shippingInfo required, sizeValue if requires_size
   *
   * @param params - Claim parameters
   * @returns ClaimRewardResponse with redemption and updatedRewards
   */
  async claimReward(params: ClaimRewardParams): Promise<ClaimRewardResponse> {
    const {
      userId,
      clientId,
      rewardId,
      currentTier,
      tierAchievedAt,
      scheduledActivationAt,
      shippingInfo,
      sizeValue,
      userHandle,
      userEmail,
    } = params;

    // =========================================================================
    // VALIDATION RULES 2-3: Reward exists and enabled
    // =========================================================================
    const reward = await rewardRepository.getById(rewardId, clientId);

    if (!reward) {
      throw new AppError(
        ErrorCode.REWARD_NOT_FOUND,
        'Reward not found or not available for your tier',
        404
      );
    }

    if (!reward.enabled) {
      throw new AppError(
        ErrorCode.REWARD_NOT_FOUND,
        'This reward is not currently available',
        404
      );
    }

    // =========================================================================
    // VALIDATION RULE 4: Tier eligibility
    // =========================================================================
    if (reward.tier_eligibility !== currentTier) {
      throw tierIneligibleError(reward.tier_eligibility, currentTier);
    }

    // =========================================================================
    // VALIDATION RULE 5: VIP tier only
    // =========================================================================
    if (reward.reward_source !== 'vip_tier') {
      throw new AppError(
        ErrorCode.REWARD_NOT_FOUND,
        'This reward is not a VIP tier reward. Use mission claim endpoint instead.',
        400
      );
    }

    // =========================================================================
    // VALIDATION RULE 6: No active claim
    // =========================================================================
    const { hasActive, redemption: activeRedemption } =
      await rewardRepository.hasActiveRedemption(userId, rewardId, clientId);

    if (hasActive && activeRedemption) {
      throw activeClaimExistsError(activeRedemption.id, activeRedemption.status);
    }

    // =========================================================================
    // VALIDATION RULE 7: Usage limit check
    // =========================================================================
    const { usedCount } = await rewardRepository.getUsageCount(
      userId,
      rewardId,
      clientId,
      currentTier
    );

    const totalQuantity = reward.redemption_quantity;
    if (totalQuantity !== null && usedCount >= totalQuantity) {
      throw limitReachedError(
        usedCount,
        totalQuantity,
        reward.redemption_frequency ?? 'tier'
      );
    }

    // =========================================================================
    // VALIDATION RULES 8-10: Scheduling validation
    // =========================================================================
    const rewardType = reward.type as string;
    let scheduledDate: string | undefined;
    let scheduledTime: string | undefined;

    if (rewardType === 'discount' || rewardType === 'commission_boost') {
      // Rule 8: Scheduling required
      if (!scheduledActivationAt) {
        throw schedulingRequiredError(rewardType);
      }

      const scheduledDateTime = new Date(scheduledActivationAt);
      const now = new Date();

      // Must be in the future
      if (scheduledDateTime <= now) {
        throw new AppError(
          ErrorCode.INVALID_SCHEDULE,
          'Scheduled date must be in the future',
          400
        );
      }

      if (rewardType === 'discount') {
        // Rule 9: Discount scheduling - weekday Mon-Fri, 09:00-16:00 EST
        const dayOfWeek = scheduledDateTime.getUTCDay();
        // Convert to EST for time validation (UTC-5, ignoring DST for simplicity)
        const estHour = (scheduledDateTime.getUTCHours() - 5 + 24) % 24;

        // Check weekday (0=Sunday, 6=Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          throw invalidScheduleWeekdayError();
        }

        // Check time slot (09:00-16:00 EST)
        if (estHour < 9 || estHour >= 16) {
          throw invalidTimeSlotError();
        }

        // Extract date and time for storage
        scheduledDate = scheduledDateTime.toISOString().split('T')[0];
        scheduledTime = scheduledDateTime.toISOString().split('T')[1].split('.')[0];
      } else {
        // Rule 10: Commission boost - auto-set to 14:00:00 EST (19:00 UTC)
        scheduledDate = scheduledDateTime.toISOString().split('T')[0];
        scheduledTime = '19:00:00'; // 14:00 EST = 19:00 UTC
      }
    }

    // =========================================================================
    // VALIDATION RULE 11: Physical gift requirements
    // =========================================================================
    if (rewardType === 'physical_gift') {
      if (!shippingInfo) {
        throw shippingInfoRequiredError();
      }

      const valueData = reward.value_data as Record<string, unknown> | null;
      const requiresSize = valueData?.requires_size === true;
      const sizeOptions = (valueData?.size_options as string[]) || [];

      if (requiresSize && !sizeValue) {
        throw sizeRequiredError(sizeOptions);
      }

      if (sizeValue && !sizeOptions.includes(sizeValue)) {
        throw invalidSizeSelectionError(sizeValue, sizeOptions);
      }
    }

    // =========================================================================
    // CREATE REDEMPTION
    // =========================================================================
    const valueData = reward.value_data as Record<string, unknown> | null;
    const redemptionType: 'instant' | 'scheduled' =
      rewardType === 'discount' || rewardType === 'commission_boost'
        ? 'scheduled'
        : 'instant';

    const redeemResult = await rewardRepository.redeemReward({
      userId,
      rewardId,
      clientId,
      rewardType,
      tierAtClaim: currentTier,
      redemptionType,
      scheduledActivationDate: scheduledDate,
      scheduledActivationTime: scheduledTime,
      // Commission boost specific
      durationDays: (valueData?.duration_days as number) ?? (valueData?.durationDays as number) ?? 30,
      boostRate: (valueData?.percent as number) ?? 0,
      // Physical gift specific
      shippingInfo: shippingInfo
        ? {
            firstName: shippingInfo.firstName,
            lastName: shippingInfo.lastName,
            addressLine1: shippingInfo.addressLine1,
            addressLine2: shippingInfo.addressLine2,
            city: shippingInfo.city,
            state: shippingInfo.state,
            postalCode: shippingInfo.postalCode,
            country: shippingInfo.country,
            phone: shippingInfo.phone,
          }
        : undefined,
      sizeValue,
      requiresSize: (valueData?.requires_size as boolean) ?? false,
      sizeCategory: (valueData?.size_category as string) ?? undefined,
    });

    // =========================================================================
    // CREATE CALENDAR EVENT (Task 6.2.4+)
    // Per Loyalty.md lines 1691-1794 (Google Calendar Integration)
    // Non-blocking: redemption succeeds even if calendar fails
    // =========================================================================
    // Format handle with @ prefix for calendar event titles (per Loyalty.md)
    const handleWithAt = userHandle.startsWith('@') ? userHandle : `@${userHandle}`;

    if (['gift_card', 'spark_ads', 'experience'].includes(rewardType)) {
      // Task 6.2.4: Instant rewards - calendar event due in 2 hours
      const calendarValue = (valueData?.amount as number) ?? 0;
      const calendarResult = await createInstantRewardEvent(
        handleWithAt,
        rewardType,
        calendarValue,
        userEmail
      );
      if (calendarResult.success && calendarResult.eventId) {
        await rewardRepository.updateCalendarEventId(
          redeemResult.redemptionId,
          clientId,
          calendarResult.eventId
        );
      }
    }
    else if (rewardType === 'discount' && scheduledDate && scheduledTime) {
      // Task 6.2.5: Discount - calendar event at scheduled activation time with 15-min reminder
      const discountPercent = (valueData?.percent as number) ?? 0;
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const couponCode = (valueData?.coupon_code as string) ?? (valueData?.couponCode as string) ?? '';
      const maxUses = (valueData?.max_uses as number) ?? (valueData?.maxUses as number) ?? null;

      // Build activation DateTime from scheduled date and time
      const activationDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      const calendarResult = await createDiscountActivationEvent(
        handleWithAt,
        discountPercent,
        durationMinutes,
        couponCode,
        maxUses,
        activationDateTime
      );
      if (calendarResult.success && calendarResult.eventId) {
        await rewardRepository.updateCalendarEventId(
          redeemResult.redemptionId,
          clientId,
          calendarResult.eventId
        );
      }
    }
    else if (rewardType === 'physical_gift' && shippingInfo) {
      // Task 6.2.6: Physical gift - calendar event due in 2 hours with shipping details
      const itemName = reward.name ?? reward.description ?? 'Physical Gift';

      const calendarResult = await createPhysicalGiftEvent(
        handleWithAt,
        itemName,
        sizeValue ?? null,
        {
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          line1: shippingInfo.addressLine1,
          line2: shippingInfo.addressLine2,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postalCode: shippingInfo.postalCode,
        }
      );
      if (calendarResult.success && calendarResult.eventId) {
        await rewardRepository.updateCalendarEventId(
          redeemResult.redemptionId,
          clientId,
          calendarResult.eventId
        );
      }
    }
    else if (rewardType === 'commission_boost' && scheduledDate) {
      // Task 6.2.7a: Commission boost - calendar event at claim with calculated payout due date
      // Due date = activation_date + duration_days + 20 days (clearing period)
      const boostPercent = (valueData?.percent as number) ?? 0;
      const boostDurationDays = (valueData?.duration_days as number) ?? (valueData?.durationDays as number) ?? 30;

      // Build activation date from scheduled date and time (time is always 19:00 UTC = 2 PM EST)
      const activationDateTime = new Date(`${scheduledDate}T${scheduledTime || '19:00:00'}`);

      const calendarResult = await createCommissionBoostScheduledEvent(
        handleWithAt,
        boostPercent,
        boostDurationDays,
        activationDateTime,
        userEmail
      );
      if (calendarResult.success && calendarResult.eventId) {
        await rewardRepository.updateCalendarEventId(
          redeemResult.redemptionId,
          clientId,
          calendarResult.eventId
        );
      }
    }

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================
    const newUsedCount = usedCount + 1;

    // Generate formatted name and displayText
    const name = generateName(rewardType, valueData, reward.description);
    const displayText = generateDisplayText(rewardType, valueData, reward.description);

    // Determine next steps based on reward type
    const nextSteps = getNextSteps(rewardType);

    // Determine updated status for this reward
    const updatedStatus = getUpdatedStatus(rewardType, shippingInfo !== undefined);

    // Generate success message
    const message = getSuccessMessage(rewardType, reward.description, scheduledDate);

    return {
      success: true,
      message,
      redemption: {
        id: redeemResult.redemptionId,
        status: 'claimed',
        rewardType: rewardType as ClaimRewardResponse['redemption']['rewardType'],
        claimedAt: redeemResult.claimedAt,
        reward: {
          id: reward.id,
          name,
          displayText,
          type: rewardType,
          rewardSource: 'vip_tier',
          valueData: transformValueData(rewardType, valueData),
        },
        scheduledActivationAt:
          scheduledDate && scheduledTime
            ? `${scheduledDate}T${scheduledTime}Z`
            : undefined,
        usedCount: newUsedCount,
        totalQuantity: totalQuantity ?? 0,
        nextSteps,
      },
      updatedRewards: [
        {
          id: reward.id,
          status: updatedStatus,
          canClaim: false,
          usedCount: newUsedCount,
        },
      ],
    };
  },

  /**
   * Get reward redemption history for user.
   * Per API_CONTRACTS.md lines 5454-5578 (GET /api/rewards/history)
   *
   * Returns concluded redemptions with:
   * - Backend-formatted name and description (same rules as GET /api/rewards)
   * - User info header
   * - Sorted by concludedAt DESC
   *
   * @param params - User info and tier context
   * @returns Complete RedemptionHistoryResponse
   */
  async getRewardHistory(
    params: GetRewardHistoryParams
  ): Promise<RedemptionHistoryResponse> {
    const SVC_START = Date.now();
    const {
      userId,
      clientId,
      userHandle,
      currentTier,
      tierName,
      tierColor,
    } = params;

    // Fetch concluded redemptions from repository
    const t_repo = Date.now();
    const rawHistory = await rewardRepository.getConcludedRedemptions(
      userId,
      clientId
    );
    console.log(`[TIMING][RewardService.getRewardHistory] getConcludedRedemptions(): ${Date.now() - t_repo}ms`);

    // Transform each redemption with backend formatting
    const history: RewardHistoryItem[] = rawHistory.map((item) => {
      // Generate backend-formatted name and description using same rules as GET /api/rewards
      const name = generateName(item.type, item.valueData, item.description);
      const description = generateDisplayText(item.type, item.valueData, item.description);

      return {
        id: item.id,
        rewardId: item.rewardId,
        name,
        description,
        type: item.type,
        rewardSource: item.rewardSource as 'vip_tier' | 'mission',
        claimedAt: item.claimedAt || '',
        concludedAt: item.concludedAt || '',
        status: 'concluded' as const,
      };
    });

    console.log(`[TIMING][RewardService.getRewardHistory] TOTAL: ${Date.now() - SVC_START}ms (${rawHistory.length} items)`);

    return {
      user: {
        id: userId,
        handle: userHandle,
        currentTier,
        currentTierName: tierName,
        currentTierColor: tierColor,
      },
      history,
    };
  },

  /**
   * Get user's saved payment information for pre-filling payment modals.
   * Per API_CONTRACTS.md lines 5287-5327 (GET /api/user/payment-info)
   *
   * Returns decrypted payment info if saved, or null values if not.
   *
   * @param userId - User ID
   * @param clientId - Tenant ID for multi-tenant isolation
   * @returns PaymentInfoResponse with hasPaymentInfo, paymentMethod, paymentAccount
   */
  async getPaymentInfo(
    userId: string,
    clientId: string
  ): Promise<PaymentInfoResponse> {
    // Delegate to repository which handles decryption
    return userRepository.getPaymentInfo(userId, clientId);
  },

  /**
   * Save payment information for a commission boost redemption.
   * Per API_CONTRACTS.md lines 5331-5450 (POST /api/rewards/:id/payment-info)
   *
   * Validates 4 rules:
   * 1. paymentAccount === paymentAccountConfirm
   * 2. PayPal: valid email format
   * 3. Venmo: handle starts with @
   * 4. boost_status must be 'pending_info'
   *
   * Then saves to commission_boost_redemptions and optionally to user defaults.
   *
   * @param params - Payment info parameters including validation fields
   * @returns SavePaymentInfoResponse with redemption status and userPaymentUpdated flag
   * @throws AppError for validation failures
   */
  async savePaymentInfo(
    params: SavePaymentInfoParams
  ): Promise<SavePaymentInfoResponse> {
    const {
      userId,
      clientId,
      redemptionId,
      paymentMethod,
      paymentAccount,
      paymentAccountConfirm,
      saveAsDefault,
    } = params;

    // =========================================================================
    // VALIDATION RULE 1: Account confirmation match
    // Per API_CONTRACTS.md lines 5411-5416
    // =========================================================================
    if (paymentAccount !== paymentAccountConfirm) {
      throw paymentAccountMismatchError();
    }

    // =========================================================================
    // VALIDATION RULE 2: PayPal email format
    // Per API_CONTRACTS.md lines 5419-5424
    // =========================================================================
    if (paymentMethod === 'paypal') {
      // Basic email regex - checks for @ and domain
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(paymentAccount)) {
        throw invalidPaypalEmailError();
      }
    }

    // =========================================================================
    // VALIDATION RULE 3: Venmo handle format
    // Per API_CONTRACTS.md lines 5427-5432
    // =========================================================================
    if (paymentMethod === 'venmo') {
      if (!paymentAccount.startsWith('@')) {
        throw invalidVenmoHandleError();
      }
    }

    // =========================================================================
    // VALIDATION RULE 4: Redemption status must be 'pending_info'
    // Per API_CONTRACTS.md lines 5435-5441
    // =========================================================================
    const boostStatus = await commissionBoostRepository.getBoostStatus(
      redemptionId,
      clientId
    );

    if (boostStatus !== 'pending_info') {
      throw paymentInfoNotRequiredError(boostStatus || 'not_found');
    }

    // =========================================================================
    // SAVE PAYMENT INFO
    // =========================================================================
    // Save to commission_boost_redemptions (updates status to 'pending_payout')
    const result = await commissionBoostRepository.savePaymentInfo(
      redemptionId,
      clientId,
      paymentMethod,
      paymentAccount
    );

    // Optionally save as user default
    let userPaymentUpdated = false;
    if (saveAsDefault) {
      userPaymentUpdated = await userRepository.savePaymentInfo(
        userId,
        clientId,
        paymentMethod,
        paymentAccount
      );
    }

    return {
      success: true,
      message: 'Payment information saved successfully',
      redemption: {
        id: result.redemptionId,
        status: result.status,
        paymentMethod: result.paymentMethod,
        paymentInfoCollectedAt: result.paymentInfoCollectedAt,
      },
      userPaymentUpdated,
    };
  },
};
