/**
 * Dashboard Service
 *
 * Business logic for dashboard data transformation and aggregation.
 * Handles VIP metric-aware formatting and congrats modal detection.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
 * - API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard)
 * - API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission)
 */

import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
import { missionRepository } from '@/lib/repositories/missionRepository';
import type { UserDashboardData, DashboardReward } from '@/lib/repositories/dashboardRepository';
import type { FeaturedMissionData, CongratsModalData } from '@/lib/repositories/missionRepository';
import type { DashboardRPCResponse } from '@/lib/types/dashboard-rpc';

/**
 * Static display name mapping per mission type
 * Per API_CONTRACTS.md lines 1903-1929
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
 * Unit text mapping per mission type
 */
const UNIT_TEXT_MAP: Record<string, string> = {
  sales_dollars: 'sales',
  sales_units: 'units',
  videos: 'videos',
  likes: 'likes',
  views: 'views',
  raffle: '',
};

// ============================================
// Response Types (matching API_CONTRACTS.md)
// ============================================

export interface DashboardResponse {
  user: {
    id: string;
    handle: string;
    email: string | null;
    clientName: string;
  };
  client: {
    id: string;
    vipMetric: 'sales' | 'units';
    vipMetricLabel: string;
  };
  currentTier: {
    id: string;
    name: string;
    color: string;
    order: number;
    checkpointExempt: boolean;
  };
  nextTier: {
    id: string;
    name: string;
    color: string;
    minSalesThreshold: number;
  } | null;
  tierProgress: {
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string;
    targetFormatted: string;
    checkpointExpiresAt: string | null;
    checkpointExpiresFormatted: string;
    checkpointMonths: number;
  };
  featuredMission: FeaturedMissionResponse;
  currentTierRewards: FormattedReward[];
  totalRewardsCount: number;
}

export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available';
  mission: {
    id: string;
    progressId: string | null;
    type: string;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    rewardValueData: Record<string, unknown> | null;
    unitText: string;
  } | null;
  tier: {
    name: string;
    color: string;
  };
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}

export interface FormattedReward {
  id: string;
  type: string;
  name: string | null;
  displayText: string;
  description: string | null;
  valueData: {
    amount?: number;
    percent?: number;
    durationDays?: number;
  } | null;
  rewardSource: string;
  redemptionQuantity: number;
  displayOrder: number;
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format currency value with $ prefix and comma separators
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

/**
 * Format units value with comma separators and " units" suffix
 */
function formatUnits(value: number): string {
  return `${value.toLocaleString()} units`;
}

/**
 * Format value based on VIP metric setting
 * Per API_CONTRACTS.md lines 2456-2471
 */
function formatVipMetricValue(value: number, vipMetric: 'sales' | 'units'): string {
  return vipMetric === 'sales' ? formatCurrency(value) : formatUnits(value);
}

/**
 * Format date as human-readable string
 * Per API_CONTRACTS.md line 2472-2473
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
 * Generate displayText for reward based on type
 * Per API_CONTRACTS.md lines 2757-2782
 */
function generateRewardDisplayText(reward: DashboardReward): string {
  const valueData = reward.valueData as Record<string, unknown> | null;

  switch (reward.type) {
    case 'gift_card':
      return `$${valueData?.amount ?? 0} Gift Card`;

    case 'commission_boost':
      return `+${valueData?.percent ?? 0}% Pay boost for ${valueData?.duration_days ?? 30} Days`;

    case 'spark_ads':
      return `$${valueData?.amount ?? 0} Spark Ads Boost`;

    case 'discount': {
      const durationMinutes = (valueData?.duration_minutes as number) ?? 1440;
      const durationDays = Math.floor(durationMinutes / 1440);
      return `+${valueData?.percent ?? 0}% Deal Boost for ${durationDays} Days`;
    }

    case 'physical_gift':
      return `Win a ${(valueData?.display_text as string) ?? reward.name ?? 'Prize'}`;

    case 'experience':
      return `Win a ${(valueData?.display_text as string) ?? reward.name ?? 'Experience'}`;

    default:
      return reward.name ?? 'Reward';
  }
}

/**
 * Transform valueData from snake_case to camelCase
 */
function transformValueData(valueData: Record<string, unknown> | null): FormattedReward['valueData'] {
  if (!valueData) return null;

  return {
    amount: valueData.amount as number | undefined,
    percent: valueData.percent as number | undefined,
    durationDays: valueData.duration_days as number | undefined,
  };
}

// ============================================
// Service Functions
// ============================================

/**
 * Get complete dashboard overview with all 5 sections.
 * Uses single RPC call for ~75% latency improvement.
 *
 * Per API_CONTRACTS.md lines 2063-2948:
 * - Backend handles ALL formatting based on vipMetric
 * - Calculates tier progress percentage
 * - Includes featured mission with same structure as /featured-mission
 * - Returns top 4 rewards with displayText
 *
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @see DashboardRPCEnhancement.md
 */
export async function getDashboardOverview(
  userId: string,
  clientId: string
): Promise<DashboardResponse | null> {
  // 1. Call RPC - single database round-trip
  const rpcData = await dashboardRepository.getDashboardDataRPC(userId, clientId);
  if (!rpcData) {
    return null;
  }

  // 2. Transform RPC response to DashboardResponse
  const vipMetric = rpcData.client.vipMetric;
  const vipMetricLabel = vipMetric === 'sales' ? 'sales' : 'units';

  // Calculate tier progress
  const currentValue = vipMetric === 'sales'
    ? (rpcData.checkpointData.salesCurrent || 0) + (rpcData.checkpointData.manualAdjustmentsTotal || 0)
    : (rpcData.checkpointData.unitsCurrent || 0) + (rpcData.checkpointData.manualAdjustmentsUnits || 0);

  const targetValue = rpcData.nextTier
    ? (vipMetric === 'sales' ? rpcData.nextTier.salesThreshold : rpcData.nextTier.unitsThreshold)
    : currentValue; // At max tier

  const progressPercentage = targetValue > 0
    ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
    : 100;

  // Format checkpoint expiration
  const checkpointExpiresFormatted = formatDate(rpcData.checkpointData.nextCheckpointAt);

  // 3. Transform featured mission
  let featuredMissionResponse: FeaturedMissionResponse;
  const supportEmail = 'support@example.com'; // TODO: Source from client settings when support_email column added

  if (rpcData.featuredMission) {
    const fm = rpcData.featuredMission;
    const isRaffle = fm.missionType === 'raffle';
    const missionCurrentValue = fm.currentValue || 0;
    const missionProgressPercentage = isRaffle
      ? 100
      : (fm.targetValue > 0 ? Math.min(Math.round((missionCurrentValue / fm.targetValue) * 100), 100) : 0);

    // Determine status
    let status: FeaturedMissionResponse['status'];
    if (isRaffle && !fm.progressStatus) {
      status = 'raffle_available';
    } else if (fm.progressStatus === 'completed') {
      status = 'completed';
    } else if (fm.progressStatus === 'claimed') {
      status = 'claimed';
    } else if (fm.progressStatus === 'fulfilled') {
      status = 'fulfilled';
    } else {
      status = 'active';
    }

    // Format progress text based on mission type
    const unitText = UNIT_TEXT_MAP[fm.missionType] ?? '';
    let currentFormatted: string | null;
    let targetFormatted: string | null;
    let targetText: string;
    let progressText: string;

    if (isRaffle) {
      const prizeDisplay = fm.rewardName
        ?? ((fm.rewardValueData as Record<string, unknown>)?.amount ? `$${(fm.rewardValueData as Record<string, unknown>).amount}` : 'a prize');
      currentFormatted = prizeDisplay;
      targetFormatted = null;
      targetText = 'Enter to Win!';
      progressText = `Enter to win ${prizeDisplay}`;
    } else if (fm.missionType === 'sales_dollars') {
      currentFormatted = formatCurrency(missionCurrentValue);
      targetFormatted = formatCurrency(fm.targetValue);
      targetText = `of ${targetFormatted} sales`;
      progressText = `${currentFormatted} ${targetText}`;
    } else if (fm.missionType === 'sales_units') {
      currentFormatted = missionCurrentValue.toLocaleString();
      targetFormatted = fm.targetValue.toLocaleString();
      targetText = `of ${targetFormatted} units sold`;
      progressText = `${currentFormatted} ${targetText}`;
    } else {
      // videos, likes, views
      currentFormatted = missionCurrentValue.toLocaleString();
      targetFormatted = fm.targetValue.toLocaleString();
      targetText = `of ${targetFormatted} ${unitText}`;
      progressText = `${currentFormatted} ${targetText}`;
    }

    // Generate reward display text
    const rewardForDisplay: DashboardReward = {
      id: fm.rewardId,
      type: fm.rewardType,
      name: fm.rewardName,
      description: null,
      valueData: fm.rewardValueData,
      rewardSource: 'mission',
      redemptionQuantity: 1,
      displayOrder: 0,
    };
    const rewardDisplayText = generateRewardDisplayText(rewardForDisplay);
    const rewardAmount = (fm.rewardValueData as Record<string, unknown>)?.amount as number ?? null;
    const rewardCustomText = (fm.rewardType === 'physical_gift' || fm.rewardType === 'experience')
      ? fm.rewardName
      : null;

    // Check congrats modal
    const showCongratsModal = rpcData.recentFulfillment !== null;
    let congratsMessage: string | null = null;
    if (rpcData.recentFulfillment) {
      const rf = rpcData.recentFulfillment;
      if (rf.rewardType === 'gift_card' && rf.rewardAmount) {
        congratsMessage = `Your $${rf.rewardAmount} Gift Card has been delivered!`;
      } else if (rf.rewardName) {
        congratsMessage = `Your ${rf.rewardName} has been delivered!`;
      } else {
        congratsMessage = 'Your reward has been delivered!';
      }
    }

    featuredMissionResponse = {
      status,
      mission: {
        id: fm.missionId,
        progressId: fm.progressId ?? null,
        type: fm.missionType,
        displayName: MISSION_DISPLAY_NAMES[fm.missionType] ?? fm.displayName,
        currentProgress: missionCurrentValue,
        targetValue: fm.targetValue,
        progressPercentage: missionProgressPercentage,
        currentFormatted,
        targetFormatted,
        targetText,
        progressText,
        isRaffle,
        raffleEndDate: fm.raffleEndDate,
        rewardType: fm.rewardType,
        rewardAmount,
        rewardCustomText,
        rewardDisplayText,
        rewardValueData: fm.rewardValueData as Record<string, unknown> | null,
        unitText,
      },
      tier: fm.tierName ? { name: fm.tierName, color: fm.tierColor } : { name: rpcData.currentTier.name, color: rpcData.currentTier.color },
      showCongratsModal,
      congratsMessage,
      supportEmail,
      emptyStateMessage: null,
    };

    // Update last_login_at if showing congrats modal
    if (showCongratsModal) {
      await dashboardRepository.updateLastLoginAt(userId, clientId);
    }
  } else {
    // No featured mission
    const showCongratsModal = rpcData.recentFulfillment !== null;
    let congratsMessage: string | null = null;
    if (rpcData.recentFulfillment) {
      const rf = rpcData.recentFulfillment;
      if (rf.rewardType === 'gift_card' && rf.rewardAmount) {
        congratsMessage = `Your $${rf.rewardAmount} Gift Card has been delivered!`;
      } else if (rf.rewardName) {
        congratsMessage = `Your ${rf.rewardName} has been delivered!`;
      } else {
        congratsMessage = 'Your reward has been delivered!';
      }
    }

    featuredMissionResponse = {
      status: 'no_missions',
      mission: null,
      tier: { name: rpcData.currentTier.name, color: rpcData.currentTier.color },
      showCongratsModal,
      congratsMessage,
      supportEmail,
      emptyStateMessage: 'No active missions. Check back soon!',
    };

    if (showCongratsModal) {
      await dashboardRepository.updateLastLoginAt(userId, clientId);
    }
  }

  // 4. Transform tier rewards (snake_case → camelCase + displayText)
  const currentTierRewards: FormattedReward[] = (rpcData.currentTierRewards || []).map(r => {
    const rewardForDisplay: DashboardReward = {
      id: r.id,
      type: r.type,
      name: r.name,
      description: r.description,
      valueData: r.value_data,
      rewardSource: r.reward_source,
      redemptionQuantity: r.redemption_quantity,
      displayOrder: r.display_order,
    };
    return {
      id: r.id,
      type: r.type,
      name: r.name,
      displayText: generateRewardDisplayText(rewardForDisplay),
      description: r.description,
      valueData: transformValueData(r.value_data),
      rewardSource: r.reward_source,
      redemptionQuantity: r.redemption_quantity,
      displayOrder: r.display_order,
    };
  });

  // 5. Return fully-formed DashboardResponse
  return {
    user: {
      id: rpcData.user.id,
      handle: rpcData.user.handle,
      email: rpcData.user.email,
      clientName: rpcData.user.clientName,
    },
    client: {
      id: rpcData.client.id,
      vipMetric: rpcData.client.vipMetric,
      vipMetricLabel,
    },
    currentTier: {
      id: rpcData.currentTier.id,
      name: rpcData.currentTier.name,
      color: rpcData.currentTier.color,
      order: rpcData.currentTier.order,
      checkpointExempt: rpcData.currentTier.checkpointExempt,
    },
    nextTier: rpcData.nextTier ? {
      id: rpcData.nextTier.id,
      name: rpcData.nextTier.name,
      color: rpcData.nextTier.color,
      minSalesThreshold: vipMetric === 'sales'
        ? rpcData.nextTier.salesThreshold
        : rpcData.nextTier.unitsThreshold,
    } : null,
    tierProgress: {
      currentValue,
      targetValue,
      progressPercentage,
      currentFormatted: vipMetric === 'sales' ? formatCurrency(currentValue) : currentValue.toLocaleString(),
      targetFormatted: vipMetric === 'sales' ? formatCurrency(targetValue) : targetValue.toLocaleString(),
      checkpointExpiresAt: rpcData.checkpointData.nextCheckpointAt,
      checkpointExpiresFormatted,
      checkpointMonths: rpcData.client.checkpointMonths,
    },
    featuredMission: featuredMissionResponse,
    currentTierRewards,
    totalRewardsCount: rpcData.totalRewardsCount,
  };
}

/**
 * Get featured mission with formatting and congrats modal check.
 *
 * Per API_CONTRACTS.md lines 1775-2060:
 * - Uses static displayName mapping
 * - Computes status: active/completed/no_missions
 * - Calculates progressPercentage in backend
 * - Checks congrats modal (fulfilled_at > last_login_at)
 *
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 * @param currentTierId - User's current tier ID
 * @param vipMetric - Client's VIP metric setting
 * @param tierInfo - Current tier name and color
 * @param lastLoginAt - User's last login timestamp
 */
export async function getFeaturedMission(
  userId: string,
  clientId: string,
  currentTierId: string,
  vipMetric: 'sales' | 'units',
  tierInfo: { name: string; color: string },
  lastLoginAt: string | null
): Promise<FeaturedMissionResponse> {
  // 1. Check congrats modal AND get featured mission IN PARALLEL
  // These are independent queries
  const [congratsData, missionData] = await Promise.all([
    checkCongratsModal(userId, clientId, lastLoginAt),
    missionRepository.findFeaturedMission(userId, clientId, currentTierId, vipMetric)
  ]);

  // 2. Default support email (TODO: get from client settings)
  const supportEmail = 'support@example.com';

  // 4. No mission found
  if (!missionData) {
    return {
      status: 'no_missions',
      mission: null,
      tier: tierInfo,
      showCongratsModal: congratsData.showModal,
      congratsMessage: congratsData.message,
      supportEmail,
      emptyStateMessage: 'No active missions. Check back soon!',
    };
  }

  // 5. Format mission data
  const mission = missionData.mission;
  const progress = missionData.progress;
  const reward = missionData.reward;

  const isRaffle = mission.type === 'raffle';
  const currentProgress = progress?.currentValue ?? 0;
  const targetValue = mission.targetValue;
  const progressPercentage = isRaffle
    ? 100  // Raffle requires no progress - user is already eligible to enter
    : Math.min(Math.round((currentProgress / targetValue) * 100), 100);

  // Determine status
  let status: FeaturedMissionResponse['status'];
  if (isRaffle) {
    status = 'raffle_available';
  } else if (progress?.status === 'completed') {
    status = 'completed';
  } else if (progress?.status === 'claimed') {
    status = 'claimed';
  } else if (progress?.status === 'fulfilled') {
    status = 'fulfilled';
  } else {
    status = 'active';
  }

  // Format progress text based on mission type
  let currentFormatted: string | null;
  let targetFormatted: string | null;
  let targetText: string;
  let progressText: string;
  const unitText = UNIT_TEXT_MAP[mission.type] ?? '';

  if (isRaffle) {
    // For raffle, show prize name in center with "Enter to Win" prompt
    // Prioritize reward.name (e.g., "$500 Gift Card") over raw amount
    const prizeDisplay = reward.name
      ?? (reward.valueData?.amount ? `$${reward.valueData.amount}` : 'a prize');
    currentFormatted = prizeDisplay;  // Prize name in large text
    targetFormatted = null;
    targetText = 'Enter to Win!';     // Clear call-to-action
    progressText = `Enter to win ${prizeDisplay}`;
  } else if (mission.type === 'sales_dollars') {
    currentFormatted = formatCurrency(currentProgress);
    targetFormatted = formatCurrency(targetValue);
    targetText = `of ${targetFormatted} sales`;
    progressText = `${currentFormatted} ${targetText}`;
  } else if (mission.type === 'sales_units') {
    currentFormatted = currentProgress.toLocaleString();
    targetFormatted = targetValue.toLocaleString();
    targetText = `of ${targetFormatted} units sold`;
    progressText = `${currentFormatted} ${targetText}`;
  } else {
    // videos, likes, views
    currentFormatted = currentProgress.toLocaleString();
    targetFormatted = targetValue.toLocaleString();
    targetText = `of ${targetFormatted} ${unitText}`;
    progressText = `${currentFormatted} ${targetText}`;
  }

  // Extract reward amount/custom text
  const rewardAmount = (reward.valueData?.amount as number) ?? null;
  const rewardCustomText = reward.type === 'physical_gift' || reward.type === 'experience'
    ? reward.name
    : null;

  // Generate formatted display text using existing function (single source of truth)
  // Cast to DashboardReward - function only uses type, name, valueData which are present
  const rewardDisplayText = generateRewardDisplayText(reward as DashboardReward);

  return {
    status,
    mission: {
      id: mission.id,
      progressId: progress?.id ?? null,
      type: mission.type,
      displayName: MISSION_DISPLAY_NAMES[mission.type] ?? mission.displayName,
      currentProgress,
      targetValue,
      progressPercentage,
      currentFormatted,
      targetFormatted,
      targetText,
      progressText,
      isRaffle,
      raffleEndDate: mission.raffleEndDate,
      rewardType: reward.type,
      rewardAmount,
      rewardCustomText,
      rewardDisplayText,
      rewardValueData: reward.valueData as Record<string, unknown> | null,
      unitText,
    },
    tier: tierInfo,
    showCongratsModal: congratsData.showModal,
    congratsMessage: congratsData.message,
    supportEmail,
    emptyStateMessage: null,
  };
}

/**
 * Check if congrats modal should be shown.
 * Compares mission_progress.fulfilled_at > users.last_login_at
 *
 * Per API_CONTRACTS.md lines 1998-2037
 */
async function checkCongratsModal(
  userId: string,
  clientId: string,
  lastLoginAt: string | null
): Promise<{ showModal: boolean; message: string | null }> {
  const fulfillment = await missionRepository.findRecentFulfillment(
    userId,
    clientId,
    lastLoginAt
  );

  if (!fulfillment) {
    return { showModal: false, message: null };
  }

  // Generate congrats message based on reward type
  let message: string;
  if (fulfillment.rewardType === 'gift_card' && fulfillment.rewardAmount) {
    message = `Your $${fulfillment.rewardAmount} Gift Card has been delivered!`;
  } else if (fulfillment.rewardName) {
    message = `Your ${fulfillment.rewardName} has been delivered!`;
  } else {
    message = 'Your reward has been delivered!';
  }

  return { showModal: true, message };
}
