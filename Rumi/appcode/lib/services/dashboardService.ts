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
      return `+$${valueData?.amount ?? 0} Ads Boost`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;

    case 'experience':
      return `Win a ${reward.name ?? 'Experience'}`;

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
 * Aggregates user, client, tier, progress, mission, and rewards data.
 *
 * Per API_CONTRACTS.md lines 2063-2948:
 * - Backend handles ALL formatting based on vipMetric
 * - Calculates tier progress percentage
 * - Includes featured mission with same structure as /featured-mission
 * - Returns top 4 rewards with displayText
 *
 * @param userId - Authenticated user ID
 * @param clientId - Client ID for multitenancy
 */
export async function getDashboardOverview(
  userId: string,
  clientId: string
): Promise<DashboardResponse | null> {
  // 1. Get user dashboard data (user, client, tiers, checkpoint)
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);
  if (!dashboardData) {
    return null;
  }

  // 2. Get featured mission
  const featuredMission = await getFeaturedMission(
    userId,
    clientId,
    dashboardData.currentTier.id,
    dashboardData.client.vipMetric,
    dashboardData.currentTier,
    dashboardData.checkpointData.lastLoginAt
  );

  // 3. Get current tier rewards
  const rewardsResult = await dashboardRepository.getCurrentTierRewards(
    clientId,
    dashboardData.currentTier.id
  );

  // 4. Calculate tier progress
  const vipMetric = dashboardData.client.vipMetric;
  const currentValue = vipMetric === 'sales'
    ? dashboardData.checkpointData.salesCurrent + dashboardData.checkpointData.manualAdjustmentsTotal
    : dashboardData.checkpointData.unitsCurrent + dashboardData.checkpointData.manualAdjustmentsUnits;

  const targetValue = dashboardData.nextTier
    ? (vipMetric === 'sales'
        ? dashboardData.nextTier.salesThreshold
        : dashboardData.nextTier.unitsThreshold)
    : currentValue; // Already at max tier

  const progressPercentage = targetValue > 0
    ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
    : 100;

  // 5. Format rewards with displayText
  const formattedRewards: FormattedReward[] = rewardsResult.rewards.map((reward) => ({
    id: reward.id,
    type: reward.type,
    name: reward.name,
    displayText: generateRewardDisplayText(reward),
    description: reward.description,
    valueData: transformValueData(reward.valueData),
    rewardSource: reward.rewardSource,
    redemptionQuantity: reward.redemptionQuantity,
    displayOrder: reward.displayOrder,
  }));

  // 6. Update last_login_at AFTER checking congrats modal
  // Per API_CONTRACTS.md lines 2025-2030
  if (featuredMission.showCongratsModal) {
    await dashboardRepository.updateLastLoginAt(userId, clientId);
  }

  return {
    user: {
      id: dashboardData.user.id,
      handle: dashboardData.user.handle,
      email: dashboardData.user.email,
      clientName: dashboardData.client.name,
    },
    client: {
      id: dashboardData.client.id,
      vipMetric: dashboardData.client.vipMetric,
      vipMetricLabel: vipMetric === 'sales' ? 'sales' : 'units',
    },
    currentTier: dashboardData.currentTier,
    nextTier: dashboardData.nextTier
      ? {
          id: dashboardData.nextTier.id,
          name: dashboardData.nextTier.name,
          color: dashboardData.nextTier.color,
          minSalesThreshold: vipMetric === 'sales'
            ? dashboardData.nextTier.salesThreshold
            : dashboardData.nextTier.unitsThreshold,
        }
      : null,
    tierProgress: {
      currentValue,
      targetValue,
      progressPercentage,
      currentFormatted: formatVipMetricValue(currentValue, vipMetric),
      targetFormatted: formatVipMetricValue(targetValue, vipMetric),
      checkpointExpiresAt: dashboardData.checkpointData.nextCheckpointAt,
      checkpointExpiresFormatted: formatDate(dashboardData.checkpointData.nextCheckpointAt),
      checkpointMonths: dashboardData.client.checkpointMonths,
    },
    featuredMission,
    currentTierRewards: formattedRewards,
    totalRewardsCount: rewardsResult.totalCount,
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
  // 1. Check for recently fulfilled mission (congrats modal)
  const congratsData = await checkCongratsModal(userId, clientId, lastLoginAt);

  // 2. Get featured mission
  const missionData = await missionRepository.findFeaturedMission(
    userId,
    clientId,
    currentTierId,
    vipMetric
  );

  // 3. Default support email (TODO: get from client settings)
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
    ? 0
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
    // Raffle missions have no progress tracking
    currentFormatted = null;
    targetFormatted = null;
    targetText = 'Chance to win';

    // Format prize display
    const prizeDisplay = reward.valueData?.amount
      ? `$${reward.valueData.amount}`
      : reward.name ?? 'a prize';
    progressText = `Chance to win ${prizeDisplay}`;
  } else if (mission.type === 'sales_dollars') {
    currentFormatted = formatCurrency(currentProgress);
    targetFormatted = formatCurrency(targetValue);
    targetText = `of ${targetFormatted} sales`;
    progressText = `${currentFormatted} ${targetText}`;
  } else if (mission.type === 'sales_units') {
    currentFormatted = currentProgress.toLocaleString();
    targetFormatted = targetValue.toLocaleString();
    targetText = `of ${targetFormatted} units`;
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

  return {
    status,
    mission: {
      id: mission.id,
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
