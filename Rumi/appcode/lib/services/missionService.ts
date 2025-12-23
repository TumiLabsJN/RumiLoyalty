/**
 * Mission Service
 *
 * Business logic for missions page data transformation, status computation,
 * and reward claiming. Handles 16-status computation, 12-priority sorting,
 * 8 flippable card types, and VIP metric-aware formatting.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
 * - API_CONTRACTS.md lines 2951-4055 (Missions APIs)
 * - SchemaFinalv2.md (Database schema)
 */

import { missionRepository } from '@/lib/repositories/missionRepository';
import { raffleRepository } from '@/lib/repositories/raffleRepository';
import { userRepository } from '@/lib/repositories/userRepository';
import type {
  AvailableMissionData,
  MissionHistoryData,
  ClaimRequestData,
  ClaimResult,
} from '@/lib/repositories/missionRepository';
import type {
  MissionStatus,
  MissionsPageResponse,
  MissionItem,
  MissionType,
  RewardType,
} from '@/lib/types/missions';
import type {
  MissionHistoryResponse,
  MissionHistoryItem,
} from '@/lib/types/api';
import { isMissionType, isRewardType, isTierId } from '@/lib/types/enums';

// ============================================
// Constants (per API_CONTRACTS.md)
// ============================================

/**
 * Static display name mapping per mission type
 * Per API_CONTRACTS.md lines 3077-3086
 */
const MISSION_DISPLAY_NAMES: Record<string, string> = {
  sales_dollars: 'Sales Sprint',
  sales_units: 'Sales Sprint',
  likes: 'Fan Favorite',
  views: 'Road to Viral',
  videos: 'Lights, Camera, Go!',
  raffle: 'VIP Raffle',
};

/**
 * Status priority for sorting (lower = higher priority)
 * Per API_CONTRACTS.md lines 3243-3311
 */
const STATUS_PRIORITY: Record<string, number> = {
  // Priority 2 - Actionable Raffle States
  raffle_available: 2,
  raffle_claim: 2,
  // Priority 3 - Claimable Rewards
  default_claim: 3,
  default_schedule: 3,
  // Priority 4 - Pending Payment Info
  pending_info: 4,
  // Priority 5 - Clearing
  clearing: 5,
  // Priority 6 - Sending
  sending: 6,
  // Priority 7 - Active
  active: 7,
  // Priority 8 - Scheduled
  scheduled: 8,
  // Priority 9 - Redeeming
  redeeming: 9,
  redeeming_physical: 9,
  // Priority 10 - In Progress
  in_progress: 10,
  // Priority 11 - Informational Raffle States
  raffle_won: 11,
  raffle_processing: 11,
  dormant: 11,
  // Priority 12 - Locked
  locked: 12,
};

/**
 * Mission type priority for secondary sort
 * Per API_CONTRACTS.md line 3309
 */
const MISSION_TYPE_PRIORITY: Record<string, number> = {
  raffle: 0,
  sales_dollars: 1,
  sales_units: 2,
  videos: 3,
  likes: 4,
  views: 5,
};

// ============================================
// Response Types - imported from @/lib/types/missions
// ============================================
// MissionStatus, MissionsPageResponse, MissionItem are now imported from shared types.
// Re-export for backwards compatibility with any code importing from this file.
export type { MissionStatus, MissionsPageResponse, MissionItem } from '@/lib/types/missions';

/**
 * Claim response
 * Per API_CONTRACTS.md lines 3755-3768
 */
export interface ClaimResponse {
  success: boolean;
  message: string;
  redemptionId: string;
  nextAction: {
    type: 'show_confirmation' | 'navigate_to_missions';
    status: string;
    message: string;
  };
}

/**
 * Participate response
 * Per API_CONTRACTS.md lines 3800-3811
 */
export interface ParticipateResponse {
  success: boolean;
  message: string;
  raffleData: {
    drawDate: string;
    drawDateFormatted: string;
    daysUntilDraw: number;
    prizeName: string;
  };
}

// ENH-009: MissionHistoryResponse and MissionHistoryItem now imported from @/lib/types/api (SSoT)

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format date as human-readable string
 * Per API_CONTRACTS.md line 3017
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date as short format
 * Per API_CONTRACTS.md line 3047
 */
function formatDateShort(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format datetime with time
 * Per API_CONTRACTS.md line 3036
 */
function formatDateTimeEST(date: string | null, time: string | null): string {
  if (!date) return '';
  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (time) {
    // Parse HH:MM:SS and format as 12-hour
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${dateStr} ${hour12}:${minutes.toString().padStart(2, '0')} ${period} EST`;
  }

  return dateStr;
}

/**
 * Calculate days between now and a future date
 */
function daysUntil(dateString: string | null): number {
  if (!dateString) return 0;
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add article (a/an) to text
 * Per API_CONTRACTS.md lines 3577-3588
 */
function addArticle(text: string): string {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstLetter = text.charAt(0).toLowerCase();

  // Special cases
  if (text.toLowerCase().startsWith('hour')) return `an ${text}`;
  if (text.toLowerCase().startsWith('uni')) return `a ${text}`;

  // General rule
  return vowels.includes(firstLetter) ? `an ${text}` : `a ${text}`;
}

/**
 * Generate reward description
 * Per API_CONTRACTS.md lines 3088-3097
 */
function generateRewardDescription(
  rewardType: string,
  valueData: Record<string, unknown> | null,
  description: string | null
): string {
  const data = valueData ?? {};

  switch (rewardType) {
    case 'gift_card':
      return `Win a $${data.amount ?? 0} Gift Card!`;

    case 'commission_boost':
      return `Win +${data.percent ?? 0}% commission for ${data.duration_days ?? 30} days!`;

    case 'spark_ads':
      return `Win a $${data.amount ?? 0} Ads Boost!`;

    case 'discount': {
      const durationMinutes = (data.duration_minutes as number) ?? 1440;
      const days = Math.floor(durationMinutes / 1440);
      return `Win a Follower Discount of ${data.percent ?? 0}% for ${days} days!`;
    }

    case 'physical_gift':
    case 'experience': {
      const displayText = (data.display_text as string) ?? description ?? 'a prize';
      return `Win ${addArticle(displayText)}!`;
    }

    default:
      return 'Win a reward!';
  }
}

/**
 * Generate progress text based on mission type
 * Per API_CONTRACTS.md lines 3099-3107, 3609-3655
 */
function generateProgressText(
  currentValue: number,
  targetValue: number,
  missionType: string
): {
  currentFormatted: string;
  targetFormatted: string;
  progressText: string;
  remainingText: string;
  percentage: number;
} {
  const remaining = Math.max(0, targetValue - currentValue);
  const percentage = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;

  // Sales dollars
  if (missionType === 'sales_dollars') {
    return {
      currentFormatted: `$${currentValue.toLocaleString()}`,
      targetFormatted: `$${targetValue.toLocaleString()}`,
      progressText: `$${currentValue.toLocaleString()} of $${targetValue.toLocaleString()}`,
      remainingText: `$${remaining.toLocaleString()} more to go!`,
      percentage,
    };
  }

  // Sales units
  if (missionType === 'sales_units') {
    const unitWord = remaining === 1 ? 'unit' : 'units';
    return {
      currentFormatted: `${currentValue.toLocaleString()} units`,
      targetFormatted: `${targetValue.toLocaleString()} units`,
      progressText: `${currentValue.toLocaleString()} of ${targetValue.toLocaleString()} units`,
      remainingText: `${remaining.toLocaleString()} more ${unitWord} to go!`,
      percentage,
    };
  }

  // Videos
  if (missionType === 'videos') {
    const videoWord = remaining === 1 ? 'video' : 'videos';
    return {
      currentFormatted: `${currentValue} videos`,
      targetFormatted: `${targetValue} videos`,
      progressText: `${currentValue} of ${targetValue} videos`,
      remainingText: `${remaining} more ${videoWord} to post!`,
      percentage,
    };
  }

  // Likes/Views (with thousands separators)
  const metricName = missionType; // 'likes' or 'views'
  return {
    currentFormatted: `${currentValue.toLocaleString()} ${metricName}`,
    targetFormatted: `${targetValue.toLocaleString()} ${metricName}`,
    progressText: `${currentValue.toLocaleString()} of ${targetValue.toLocaleString()} ${metricName}`,
    remainingText: `${remaining.toLocaleString()} more ${metricName} to go!`,
    percentage,
  };
}

/**
 * Generate reward name for history
 * Per API_CONTRACTS.md lines 3889-3898
 */
function generateRewardName(
  rewardType: string,
  valueData: Record<string, unknown> | null,
  description: string | null
): string {
  const data = valueData ?? {};

  switch (rewardType) {
    case 'gift_card':
      return `$${data.amount ?? 0} Gift Card`;
    case 'commission_boost':
      return `${data.percent ?? 0}% Pay Boost`;
    case 'spark_ads':
      return `$${data.amount ?? 0} Ads Boost`;
    case 'discount':
      return `${data.percent ?? 0}% Deal Boost`;
    case 'physical_gift':
    case 'experience':
      return (data.display_text as string) ?? description ?? 'Gift';
    default:
      return 'Reward';
  }
}

// ============================================
// Status Computation
// ============================================

/**
 * Compute mission status from raw data
 * Per API_CONTRACTS.md lines 3482-3571
 */
function computeStatus(data: AvailableMissionData): MissionStatus {
  const { mission, progress, redemption, commissionBoost, physicalGift, raffleParticipation, isLocked } = data;

  // Priority 4 - Locked Missions (per lines 3562-3570)
  if (isLocked) {
    return 'locked';
  }

  // Priority 3 - Raffle States (per lines 3528-3559)
  if (mission.type === 'raffle') {
    // Dormant (not accepting entries)
    if (!mission.activated) {
      return 'dormant';
    }

    // No participation yet
    if (!raffleParticipation) {
      return 'raffle_available';
    }

    // Processing (waiting for draw)
    if (raffleParticipation.isWinner === null) {
      return 'raffle_processing';
    }

    // Won - check if claimed
    if (raffleParticipation.isWinner === true) {
      if (redemption?.status === 'claimable') {
        return 'raffle_claim';
      }
      if (redemption?.status === 'claimed') {
        // Check commission_boost sub-states (same logic as non-raffle missions)
        // Data comes from Supabase commission_boost_redemptions table
        if (data.reward.type === 'commission_boost' && commissionBoost) {
          switch (commissionBoost.boostStatus) {
            case 'scheduled':
              return 'scheduled';
            case 'active':
              return 'active';
            case 'pending_info':
              return 'pending_info';
            case 'pending_payout':
              return 'clearing';
            default:
              return 'redeeming';
          }
        }
        // Check discount sub-states
        if (data.reward.type === 'discount') {
          if (!redemption.activationDate) {
            return 'scheduled';
          }
          if (redemption.expirationDate) {
            const now = new Date();
            const expiration = new Date(redemption.expirationDate);
            if (now <= expiration) {
              return 'active';
            }
          }
          return 'redeeming';
        }
        // Default for other reward types (gift_card, physical_gift, etc.)
        return 'raffle_won';
      }
    }

    // Lost - shouldn't appear in available missions
    return 'raffle_processing';
  }

  // Priority 1 - Completed Missions (per lines 3484-3515)
  if (redemption) {
    // Claimable
    if (redemption.status === 'claimable') {
      if (data.reward.redemptionType === 'scheduled') {
        return 'default_schedule';
      }
      return 'default_claim';
    }

    // Claimed - check reward type for specific states
    if (redemption.status === 'claimed') {
      // Commission boost sub-states
      if (data.reward.type === 'commission_boost' && commissionBoost) {
        switch (commissionBoost.boostStatus) {
          case 'scheduled':
            return 'scheduled';
          case 'active':
            return 'active';
          case 'pending_info':
            return 'pending_info';
          case 'pending_payout':
            return 'clearing';
          default:
            return 'redeeming';
        }
      }

      // Discount states
      if (data.reward.type === 'discount') {
        if (!redemption.activationDate) {
          return 'scheduled';
        }
        // Check if still active (within expiration)
        if (redemption.expirationDate) {
          const now = new Date();
          const expiration = new Date(redemption.expirationDate);
          if (now <= expiration) {
            return 'active';
          }
        }
        return 'redeeming';
      }

      // Physical gift states
      if (data.reward.type === 'physical_gift' && physicalGift) {
        if (physicalGift.shippedAt) {
          return 'sending';
        }
        if (physicalGift.shippingCity) {
          return 'redeeming_physical';
        }
      }

      // Instant rewards (gift_card, spark_ads, experience)
      if (['gift_card', 'spark_ads', 'experience'].includes(data.reward.type)) {
        return 'redeeming';
      }

      // Default for claimed
      return 'redeeming';
    }
  }

  // Priority 2 - Active Missions (per lines 3518-3526)
  if (progress?.status === 'active' && progress.currentValue < mission.targetValue) {
    return 'in_progress';
  }

  // Default fallback
  return 'in_progress';
}

// ============================================
// Flippable Card Logic
// ============================================

/**
 * Generate flippable card content
 * Per API_CONTRACTS.md lines 3315-3478
 */
function generateFlippableCard(
  status: MissionStatus,
  data: AvailableMissionData
): MissionItem['flippableCard'] {
  const { reward, redemption, commissionBoost } = data;

  // Card 1 - Redeeming (Instant Rewards)
  if (
    status === 'redeeming' &&
    ['gift_card', 'spark_ads', 'experience'].includes(reward.type)
  ) {
    return {
      backContentType: 'message',
      message: 'We will deliver your reward in up to 72 hours',
      dates: null,
    };
  }

  // Card 2 - Sending (Physical Gifts Shipped)
  if (status === 'sending' && reward.type === 'physical_gift') {
    return {
      backContentType: 'message',
      message: 'Your gift is on its way 🚚',
      dates: null,
    };
  }

  // Card 3 - Scheduled (Commission Boost)
  if (
    status === 'scheduled' &&
    reward.type === 'commission_boost' &&
    commissionBoost
  ) {
    const scheduledFormatted = formatDateTimeEST(
      commissionBoost.scheduledActivationDate,
      '19:00:00' // 2 PM EST (19:00 UTC)
    );
    const durationDays = commissionBoost.durationDays ?? 30;

    return {
      backContentType: 'dates',
      message: null,
      dates: [
        { label: 'Scheduled', value: scheduledFormatted },
        { label: 'Duration', value: `Will be active for ${durationDays} days` },
      ],
    };
  }

  // Card 4 - Active (Commission Boost)
  if (
    status === 'active' &&
    reward.type === 'commission_boost' &&
    commissionBoost
  ) {
    return {
      backContentType: 'dates',
      message: null,
      dates: [
        { label: 'Started', value: formatDateShort(commissionBoost.activatedAt) },
        { label: 'Expires', value: formatDateShort(commissionBoost.expiresAt) },
      ],
    };
  }

  // Card 5 - Pending Payment (Commission Boost)
  if (
    status === 'pending_info' &&
    reward.type === 'commission_boost'
  ) {
    return {
      backContentType: 'message',
      message: 'Setup your payout info 💵',
      dates: null,
    };
  }

  // Card 6 - Clearing (Commission Boost)
  if (
    status === 'clearing' &&
    reward.type === 'commission_boost'
  ) {
    return {
      backContentType: 'message',
      message: "Sales clear after 20 days to allow for returns. We'll notify you as soon as your reward is ready.",
      dates: null,
    };
  }

  // Card 7 - Scheduled (Discount)
  if (
    status === 'scheduled' &&
    reward.type === 'discount' &&
    redemption
  ) {
    const scheduledFormatted = formatDateTimeEST(
      redemption.scheduledActivationDate,
      redemption.scheduledActivationTime
    );
    const valueData = reward.valueData as Record<string, unknown> | null;
    const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
    const durationDays = Math.floor(durationMinutes / 1440);

    return {
      backContentType: 'dates',
      message: null,
      dates: [
        { label: 'Scheduled', value: scheduledFormatted },
        { label: 'Duration', value: `Will be active for ${durationDays} days` },
      ],
    };
  }

  // Card 8 - Active (Discount)
  if (
    status === 'active' &&
    reward.type === 'discount' &&
    redemption
  ) {
    return {
      backContentType: 'dates',
      message: null,
      dates: [
        { label: 'Started', value: formatDateShort(redemption.activationDate) },
        { label: 'Expires', value: formatDateShort(redemption.expirationDate) },
      ],
    };
  }

  // All other statuses - no flippable card
  return null;
}

// ============================================
// Mission Transformation
// ============================================

/**
 * Transform raw mission data to API response format
 */
function transformMission(
  data: AvailableMissionData,
  status: MissionStatus,
  tierLookup: Map<string, { name: string; color: string }>
): MissionItem {
  const { mission, reward, progress, redemption, commissionBoost, raffleParticipation } = data;
  const valueData = reward.valueData as Record<string, unknown> | null;

  // Generate progress data (null for raffles and locked)
  let progressData: MissionItem['progress'] = null;
  if (
    status !== 'locked' &&
    mission.type !== 'raffle' &&
    progress &&
    status === 'in_progress'
  ) {
    const progressText = generateProgressText(
      progress.currentValue,
      mission.targetValue,
      mission.type
    );
    progressData = {
      currentValue: progress.currentValue,
      currentFormatted: progressText.currentFormatted,
      targetValue: mission.targetValue,
      targetFormatted: progressText.targetFormatted,
      percentage: progressText.percentage,
      remainingText: progressText.remainingText,
      progressText: progressText.progressText,
    };
  }

  // Generate deadline data
  let deadlineData: MissionItem['deadline'] = null;
  if (progress?.checkpointEnd && status === 'in_progress') {
    deadlineData = {
      checkpointEnd: progress.checkpointEnd,
      checkpointEndFormatted: formatDate(progress.checkpointEnd),
      daysRemaining: daysUntil(progress.checkpointEnd),
    };
  }

  // Generate value data
  let formattedValueData: MissionItem['valueData'] = null;
  if (valueData) {
    formattedValueData = {
      percent: valueData.percent as number | undefined,
      durationDays: valueData.duration_days as number | undefined,
      amount: valueData.amount as number | undefined,
      displayText: valueData.display_text as string | undefined,
      requiresSize: valueData.requires_size as boolean | undefined,
      sizeCategory: valueData.size_category as string | undefined,
      sizeOptions: valueData.size_options as string[] | undefined,
    };
  }

  // Generate scheduling data
  let schedulingData: MissionItem['scheduling'] = null;
  if (
    ['scheduled', 'active'].includes(status) &&
    (reward.type === 'commission_boost' || reward.type === 'discount')
  ) {
    const scheduledDate = commissionBoost?.scheduledActivationDate ?? redemption?.scheduledActivationDate;
    const scheduledTime = redemption?.scheduledActivationTime ?? '19:00:00';
    const activationDate = commissionBoost?.activatedAt ?? redemption?.activationDate;
    const expirationDate = commissionBoost?.expiresAt ?? redemption?.expirationDate;
    const durationDays = commissionBoost?.durationDays ?? ((valueData?.duration_minutes as number ?? 1440) / 1440);

    schedulingData = {
      scheduledActivationDate: scheduledDate ?? '',
      scheduledActivationTime: scheduledTime,
      scheduledActivationFormatted: formatDateTimeEST(scheduledDate ?? null, scheduledTime),
      activationDate: activationDate ?? null,
      activationDateFormatted: activationDate ? formatDateShort(activationDate) : null,
      expirationDate: expirationDate ?? null,
      expirationDateFormatted: expirationDate ? formatDateShort(expirationDate) : null,
      durationText: `Active for ${Math.floor(durationDays)} days`,
    };
  }

  // Generate raffle data
  let raffleData: MissionItem['raffleData'] = null;
  if (mission.type === 'raffle') {
    const displayText = (valueData?.display_text as string) ?? reward.description ?? 'a prize';
    raffleData = {
      raffleEndDate: mission.raffleEndDate ?? '',
      raffleEndFormatted: formatDateShort(mission.raffleEndDate),
      daysUntilDraw: daysUntil(mission.raffleEndDate),
      isWinner: raffleParticipation?.isWinner ?? null,
      prizeName: addArticle(displayText),
    };
  }

  // Generate locked data
  let lockedData: MissionItem['lockedData'] = null;
  if (status === 'locked') {
    const requiredTierInfo = tierLookup.get(mission.tierEligibility);
    lockedData = {
      requiredTier: mission.tierEligibility,
      requiredTierName: requiredTierInfo?.name ?? mission.tierEligibility,
      requiredTierColor: requiredTierInfo?.color ?? '#6B7280',
      unlockMessage: `Unlock at ${requiredTierInfo?.name ?? mission.tierEligibility}`,
      previewFromTier: mission.previewFromTier,
    };
  }

  // Generate flippable card
  const flippableCard = generateFlippableCard(status, data);

  // Validate enum types at service boundary (makes bad data noisy)
  if (!isMissionType(mission.type)) {
    console.error(`[MissionService] Invalid missionType: ${mission.type} for mission ${mission.id}`);
    throw new Error(`Invalid mission type: ${mission.type}`);
  }
  if (!isRewardType(reward.type)) {
    console.error(`[MissionService] Invalid rewardType: ${reward.type} for mission ${mission.id}`);
    throw new Error(`Invalid reward type: ${reward.type}`);
  }

  return {
    id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
    missionType: mission.type, // Validated above
    displayName: MISSION_DISPLAY_NAMES[mission.type] ?? mission.displayName,
    targetUnit: mission.targetUnit as 'dollars' | 'units' | 'count',
    tierEligibility: mission.tierEligibility,
    rewardType: reward.type, // Validated above
    rewardDescription: generateRewardDescription(reward.type, valueData, reward.description),
    rewardSource: reward.rewardSource as 'vip_tier' | 'mission',
    status,
    progress: progressData,
    deadline: deadlineData,
    valueData: formattedValueData,
    scheduling: schedulingData,
    raffleData,
    lockedData,
    flippableCard,
  };
}

// ============================================
// Sorting Logic
// ============================================

/**
 * Sort missions by priority
 * Per API_CONTRACTS.md lines 3243-3311
 */
function sortMissions(
  missions: Array<{ item: MissionItem; data: AvailableMissionData }>,
  vipMetric: 'sales' | 'units',
  featuredMissionId: string | null
): MissionItem[] {
  return missions
    .sort((a, b) => {
      // Priority 1 - Featured mission ALWAYS first
      if (featuredMissionId) {
        if (a.item.id === featuredMissionId) return -1;
        if (b.item.id === featuredMissionId) return 1;
      }

      // Sort by status priority
      const priorityA = STATUS_PRIORITY[a.item.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.item.status] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Secondary sort by mission type (within same status)
      let typeA = MISSION_TYPE_PRIORITY[a.item.missionType] ?? 99;
      let typeB = MISSION_TYPE_PRIORITY[b.item.missionType] ?? 99;

      // Prefer sales type matching VIP metric
      if (vipMetric === 'sales') {
        if (a.item.missionType === 'sales_dollars') typeA = 0.5;
        if (b.item.missionType === 'sales_dollars') typeB = 0.5;
      } else {
        if (a.item.missionType === 'sales_units') typeA = 0.5;
        if (b.item.missionType === 'sales_units') typeB = 0.5;
      }

      return typeA - typeB;
    })
    .map((m) => m.item);
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all missions for the missions page.
 * Computes 16 statuses, applies 12-priority sorting, generates 8 flippable card types.
 *
 * Per API_CONTRACTS.md lines 2955-3238
 *
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @param userInfo - User tier and handle info
 * @param vipMetric - Client's VIP metric setting
 * @param tierLookup - Map of tier_id -> {name, color}
 */
export async function listAvailableMissions(
  userId: string,
  clientId: string,
  userInfo: {
    handle: string;
    currentTier: string;
    currentTierName: string;
    currentTierColor: string;
  },
  vipMetric: 'sales' | 'units',
  tierLookup: Map<string, { name: string; color: string }>
): Promise<MissionsPageResponse> {
  // 1. Get raw mission data from repository
  const rawMissions = await missionRepository.listAvailable(userId, clientId, userInfo.currentTier);

  // 2. Compute status and transform each mission
  const missionsWithData = rawMissions.map((data) => {
    const status = computeStatus(data);
    const item = transformMission(data, status, tierLookup);
    return { item, data };
  });

  // 3. Determine featured mission (first in-progress or claimable non-locked mission)
  // Per API_CONTRACTS.md lines 3247-3251
  let featuredMissionId: string | null = null;
  for (const { item } of missionsWithData) {
    if (item.status !== 'locked' && item.status !== 'dormant') {
      featuredMissionId = item.id;
      break;
    }
  }

  // 4. Sort missions by priority
  const sortedMissions = sortMissions(missionsWithData, vipMetric, featuredMissionId);

  // 5. Return response
  return {
    user: {
      id: userId,
      handle: userInfo.handle,
      currentTier: userInfo.currentTier,
      currentTierName: userInfo.currentTierName,
      currentTierColor: userInfo.currentTierColor,
    },
    featuredMissionId,
    missions: sortedMissions,
  };
}

/**
 * Claim a mission reward.
 * Validates 7 steps per API_CONTRACTS.md lines 3770-3778.
 *
 * @param missionProgressId - Mission progress ID from missions list
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @param currentTierId - User's current tier
 * @param claimData - Claim request data (varies by reward type)
 */
export async function claimMissionReward(
  missionProgressId: string,
  userId: string,
  clientId: string,
  currentTierId: string,
  claimData: ClaimRequestData
): Promise<ClaimResponse> {
  // FAST PATH: For instant rewards with no claimData, use atomic RPC
  // This skips the expensive findByProgressId + validation flow
  // SYNC: RPC validates same logic - keep in sync if validation changes
  const hasClaimData = claimData.scheduledActivationDate ||
                       claimData.shippingAddress ||
                       claimData.size;

  if (!hasClaimData) {
    // Likely instant reward - try atomic RPC first
    const instantResult = await missionRepository.claimInstantReward(
      missionProgressId,
      clientId
    );

    if (instantResult.success) {
      return {
        success: true,
        message: 'Reward claimed successfully!',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'show_confirmation',
          status: instantResult.newStatus,
          message: 'We will deliver your reward in up to 72 hours.',
        },
      };
    }

    // If RPC failed with "requires additional information", fall through to normal flow
    // This handles edge cases where reward type changed or needs scheduled data
    if (!instantResult.error?.includes('requires additional information')) {
      return {
        success: false,
        message: instantResult.error ?? 'Failed to claim reward',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'navigate_to_missions',
          status: 'error',
          message: 'Please try again.',
        },
      };
    }
    // Fall through to existing slow path for scheduled/physical_gift
  }

  // EXISTING FLOW: For scheduled rewards (commission_boost, discount) and physical_gift
  // 1. Get mission by progress ID
  const mission = await missionRepository.findByProgressId(missionProgressId, userId, clientId);

  if (!mission) {
    return {
      success: false,
      message: 'Mission not found',
      redemptionId: '',
      nextAction: {
        type: 'navigate_to_missions',
        status: 'error',
        message: 'Please return to missions page.',
      },
    };
  }

  // 2. Verify mission_progress.status='completed'
  if (mission.progress?.status !== 'completed') {
    return {
      success: false,
      message: 'Mission not completed yet',
      redemptionId: '',
      nextAction: {
        type: 'navigate_to_missions',
        status: 'error',
        message: 'Complete the mission first.',
      },
    };
  }

  // 3. Check redemptions.status='claimable'
  if (!mission.redemption || mission.redemption.status !== 'claimable') {
    return {
      success: false,
      message: 'Reward already claimed or not available',
      redemptionId: mission.redemption?.id ?? '',
      nextAction: {
        type: 'navigate_to_missions',
        status: mission.redemption?.status ?? 'error',
        message: 'Reward status has changed.',
      },
    };
  }

  // 4. Verify tier eligibility
  if (mission.mission.tierEligibility !== 'all' && mission.mission.tierEligibility !== currentTierId) {
    return {
      success: false,
      message: 'You are no longer eligible for this reward',
      redemptionId: mission.redemption.id,
      nextAction: {
        type: 'navigate_to_missions',
        status: 'error',
        message: 'Your tier has changed.',
      },
    };
  }

  // 5. Validate request body based on reward type
  const rewardType = mission.reward.type;
  const valueData = mission.reward.valueData as Record<string, unknown> | null;

  // Scheduled rewards need activation date/time
  if (['commission_boost', 'discount'].includes(rewardType)) {
    if (!claimData.scheduledActivationDate) {
      return {
        success: false,
        message: 'Scheduled activation date is required',
        redemptionId: mission.redemption.id,
        nextAction: {
          type: 'show_confirmation',
          status: 'validation_error',
          message: 'Please select when to activate your reward.',
        },
      };
    }
  }

  // Physical gifts need shipping address
  if (rewardType === 'physical_gift') {
    if (!claimData.shippingAddress) {
      return {
        success: false,
        message: 'Shipping address is required',
        redemptionId: mission.redemption.id,
        nextAction: {
          type: 'show_confirmation',
          status: 'validation_error',
          message: 'Please provide your shipping address.',
        },
      };
    }

    // Check if size is required
    const requiresSize = valueData?.requires_size as boolean | undefined;
    if (requiresSize && !claimData.size) {
      return {
        success: false,
        message: 'Size selection is required',
        redemptionId: mission.redemption.id,
        nextAction: {
          type: 'show_confirmation',
          status: 'validation_error',
          message: 'Please select a size.',
        },
      };
    }
  }

  // 6. Process claim via repository
  const result = await missionRepository.claimReward(
    mission.redemption.id,
    userId,
    clientId,
    claimData
  );

  if (!result.success) {
    return {
      success: false,
      message: result.error ?? 'Failed to claim reward',
      redemptionId: mission.redemption.id,
      nextAction: {
        type: 'navigate_to_missions',
        status: 'error',
        message: 'Please try again.',
      },
    };
  }

  // 7. Generate success response based on reward type
  let nextMessage: string;
  const nextType: 'show_confirmation' | 'navigate_to_missions' = 'show_confirmation';

  switch (rewardType) {
    case 'gift_card':
    case 'spark_ads':
    case 'experience':
      nextMessage = 'We will deliver your reward in up to 72 hours.';
      break;
    case 'commission_boost':
      nextMessage = `Your boost is scheduled for ${formatDateShort(claimData.scheduledActivationDate ?? null)}.`;
      break;
    case 'discount':
      nextMessage = `Your discount activates on ${formatDateShort(claimData.scheduledActivationDate ?? null)}.`;
      break;
    case 'physical_gift':
      nextMessage = "We'll ship your gift soon!";
      break;
    default:
      nextMessage = 'Reward claimed successfully!';
  }

  return {
    success: true,
    message: 'Reward claimed successfully!',
    redemptionId: result.redemptionId,
    nextAction: {
      type: nextType,
      status: result.newStatus,
      message: nextMessage,
    },
  };
}

/**
 * Participate in a raffle mission.
 * Validates 4 rules per API_CONTRACTS.md lines 3814-3823.
 *
 * @param missionId - Mission ID (not progress ID for raffles)
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @param currentTierId - User's current tier
 */
export async function participateInRaffle(
  missionId: string,
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<ParticipateResponse> {
  // Use raffle repository for participation
  const result = await raffleRepository.participate(missionId, userId, clientId, currentTierId);

  if (!result.success) {
    return {
      success: false,
      message: result.error ?? 'Failed to enter raffle',
      raffleData: {
        drawDate: '',
        drawDateFormatted: '',
        daysUntilDraw: 0,
        prizeName: '',
      },
    };
  }

  // Get raffle info for response
  const raffleInfo = await raffleRepository.getRaffleMissionInfo(missionId, clientId);

  return {
    success: true,
    message: "You're entered in the raffle!",
    raffleData: {
      drawDate: raffleInfo?.drawDate ?? '',
      drawDateFormatted: formatDateShort(raffleInfo?.drawDate ?? null),
      daysUntilDraw: daysUntil(raffleInfo?.drawDate ?? null),
      prizeName: raffleInfo?.prizeName ? addArticle(raffleInfo.prizeName) : 'a prize',
    },
  };
}

/**
 * Get mission history (concluded + rejected missions).
 * Per API_CONTRACTS.md lines 3827-4053.
 *
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @param userInfo - User tier info
 */
export async function getMissionHistory(
  userId: string,
  clientId: string,
  userInfo: {
    currentTier: string;
    currentTierName: string;
    currentTierColor: string;
  }
): Promise<MissionHistoryResponse> {
  // Get raw history data from repository
  const rawHistory = await missionRepository.getHistory(userId, clientId);

  // Transform to response format
  // ENH-009: Use MissionHistoryItem from SSoT with type guards at boundary
  const history: MissionHistoryItem[] = rawHistory.map((data) => {
    const valueData = data.reward.valueData as Record<string, unknown> | null;

    // Determine status
    let status: 'concluded' | 'rejected_raffle';
    if (data.redemption.status === 'rejected' && data.raffleParticipation?.isWinner === false) {
      status = 'rejected_raffle';
    } else {
      status = 'concluded';
    }

    // Generate raffle data if applicable
    let raffleData: MissionHistoryItem['raffleData'] = null;
    if (data.raffleParticipation) {
      const displayText = (valueData?.display_text as string) ?? data.reward.description ?? 'a prize';
      raffleData = {
        isWinner: data.raffleParticipation.isWinner ?? false,
        drawDate: data.raffleParticipation.winnerSelectedAt ?? '',
        drawDateFormatted: formatDateShort(data.raffleParticipation.winnerSelectedAt ?? null),
        prizeName: addArticle(displayText),
      };
    }

    const displayName = MISSION_DISPLAY_NAMES[data.mission.type] ?? data.mission.displayName;

    // ENH-009: Use type guards at mapping boundary for strict types
    const missionType = isMissionType(data.mission.type) ? data.mission.type : 'sales_dollars';
    const rewardType = isRewardType(data.reward.type) ? data.reward.type : 'gift_card';
    const rewardSource = data.reward.rewardSource === 'vip_tier' ? 'vip_tier' : 'mission';

    return {
      id: data.mission.id,
      missionType,
      displayName,
      status,
      rewardType,
      rewardName: generateRewardName(data.reward.type, valueData, data.reward.description),
      rewardSubtitle: `From: ${displayName} mission`,
      rewardSource,
      completedAt: data.raffleParticipation?.participatedAt ?? data.progress.completedAt ?? '',
      completedAtFormatted: formatDateShort(
        data.raffleParticipation?.participatedAt ?? data.progress.completedAt
      ),
      claimedAt: data.redemption.claimedAt,
      claimedAtFormatted: formatDateShort(data.redemption.claimedAt),
      deliveredAt: data.redemption.concludedAt,
      deliveredAtFormatted: formatDateShort(data.redemption.concludedAt),
      raffleData,
    };
  });

  // ENH-009: Use type guard for currentTier (TierId)
  const currentTier = isTierId(userInfo.currentTier) ? userInfo.currentTier : undefined;

  return {
    user: {
      id: userId,
      handle: '', // Not available in this context, but required by UserInfo
      currentTier,
      currentTierName: userInfo.currentTierName,
      currentTierColor: userInfo.currentTierColor,
    },
    history,
  };
}
