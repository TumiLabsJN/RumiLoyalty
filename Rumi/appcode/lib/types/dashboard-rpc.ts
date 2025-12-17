/**
 * Dashboard RPC Response Type
 *
 * Raw response from get_dashboard_data PostgreSQL function.
 * Must be transformed to DashboardResponse by service layer.
 *
 * @see DashboardRPCEnhancement.md Section 6
 */

export interface DashboardRPCResponse {
  user: {
    id: string;
    handle: string;
    email: string | null;
    clientName: string;
  };
  client: {
    id: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
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
    salesThreshold: number;
    unitsThreshold: number;
  } | null;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
  featuredMission: {
    missionId: string;
    missionType: string;
    displayName: string;
    targetValue: number;
    targetUnit: string;
    raffleEndDate: string | null;
    activated: boolean;
    progressId: string | null;
    currentValue: number;
    progressStatus: string | null;
    completedAt: string | null;
    rewardId: string;
    rewardType: string;
    rewardName: string | null;
    rewardValueData: Record<string, unknown> | null;
    tierName: string;
    tierColor: string;
  } | null;
  recentFulfillment: {
    fulfilledAt: string;
    rewardType: string;
    rewardName: string | null;
    rewardAmount: number;
  } | null;
  currentTierRewards: Array<{
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    value_data: Record<string, unknown> | null;
    reward_source: string;
    redemption_quantity: number;
    display_order: number;
  }>;
  totalRewardsCount: number;
}
