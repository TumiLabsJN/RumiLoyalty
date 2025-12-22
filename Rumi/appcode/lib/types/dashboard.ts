/**
 * Dashboard Types - Single Source of Truth
 *
 * Type definitions for Dashboard/Home Page API (GET /api/dashboard)
 * Used by: service layer, client components, API routes
 *
 * Source: API_CONTRACTS.md (lines 2063-2948)
 *
 * IMPORTANT: This is the canonical location for dashboard types.
 * Other files should re-export from here, not define duplicates.
 *
 * Types consolidated from:
 * - app/types/dashboard.ts (client types)
 * - lib/services/dashboardService.ts (service types)
 * - lib/types/api.ts (API types - 10 dashboard types)
 */

import type { MissionType, RewardType, VipMetric } from './enums';

// Re-export enum types for convenience
export type { MissionType, RewardType, VipMetric } from './enums';

// ============================================================================
// FEATURED MISSION TYPES
// ============================================================================

export type FeaturedMissionStatus =
  | 'active'
  | 'completed'
  | 'claimed'
  | 'fulfilled'
  | 'no_missions'
  | 'raffle_available';

export interface FeaturedMission {
  id: string;
  type: MissionType;
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
  rewardType: RewardType;
  rewardAmount: number | null;
  rewardCustomText: string | null;
  rewardDisplayText: string;
}

// ============================================================================
// TIER & CLIENT TYPES
// ============================================================================

export interface ClientInfo {
  id: string;
  vipMetric: VipMetric;
  vipMetricLabel: string;
}

export interface CurrentTierInfo {
  id: string;
  name: string;
  color: string;
  order: number;
  checkpointExempt: boolean;
}

export interface NextTierInfo {
  id: string;
  name: string;
  color: string;
  minSalesThreshold: number;
}

export interface TierProgress {
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  currentFormatted: string;
  targetFormatted: string;
  checkpointExpiresAt: string | null;
  checkpointExpiresFormatted: string;
  checkpointMonths: number;
}

export interface TierInfo {
  id?: string;
  name: string;
  color: string;
  order?: number;
  checkpointExempt?: boolean;
}

// ============================================================================
// REWARD TYPES
// ============================================================================

export interface RewardValueData {
  percent?: number;
  durationDays?: number;
  amount?: number;
  displayText?: string;
  requiresSize?: boolean;
  sizeCategory?: string;
  sizeOptions?: string[];
  couponCode?: string;
  maxUses?: number;
}

export interface CurrentTierReward {
  id: string;
  type: RewardType;
  name: string;
  displayText: string;
  description: string;
  valueData: RewardValueData | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

export interface FormattedReward {
  id: string;
  type: RewardType;
  name: string | null;
  displayText: string;
  description: string | null;
  valueData: {
    amount?: number;
    percent?: number;
    durationDays?: number;
  } | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

export interface Reward {
  id: string;
  type: RewardType;
  name: string;
  displayText: string;
  description: string;
  valueData: {
    amount?: number;
    percent?: number;
    durationDays?: number;
  } | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

// ============================================================================
// FEATURED MISSION RESPONSE
// ============================================================================

export interface FeaturedMissionResponse {
  status: FeaturedMissionStatus;
  mission: {
    id: string;
    progressId: string | null;
    type: MissionType;
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
    rewardType: RewardType;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    rewardValueData: Record<string, unknown> | null;
    unitText: string;
  } | null;
  tier: TierInfo;
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}

// GET /api/dashboard/featured-mission response type
export type GetFeaturedMissionResponse = FeaturedMissionResponse;

// ============================================================================
// DASHBOARD RESPONSE (Root API Response)
// ============================================================================

export interface DashboardResponse {
  user: {
    id: string;
    handle: string;
    email: string | null;
    clientName: string;
  };
  client: ClientInfo;
  currentTier: CurrentTierInfo;
  nextTier: NextTierInfo | null;
  tierProgress: TierProgress;
  featuredMission: FeaturedMissionResponse;
  currentTierRewards: FormattedReward[];
  totalRewardsCount: number;
}
