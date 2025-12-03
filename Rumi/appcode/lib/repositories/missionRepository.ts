/**
 * Mission Repository
 *
 * Data access layer for missions, mission_progress, and raffle_participations.
 * Enforces multi-tenant isolation via client_id filtering.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type MissionRow = Database['public']['Tables']['missions']['Row'];
type MissionProgressRow = Database['public']['Tables']['mission_progress']['Row'];
type RewardRow = Database['public']['Tables']['rewards']['Row'];

/**
 * Mission type priority order per API_CONTRACTS.md lines 1963-1970
 * Lower number = higher priority
 */
const MISSION_PRIORITY: Record<string, number> = {
  raffle: 0,
  sales_dollars: 1,
  sales_units: 2,
  videos: 3,
  likes: 4,
  views: 5,
};

/**
 * Featured mission data (raw from DB, service layer transforms)
 */
export interface FeaturedMissionData {
  mission: {
    id: string;
    type: string;
    displayName: string;
    title: string;
    description: string | null;
    targetValue: number;
    targetUnit: string;
    raffleEndDate: string | null;
    activated: boolean;
  };
  progress: {
    id: string;
    currentValue: number;
    status: string;
    completedAt: string | null;
  } | null;
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
  };
  tier: {
    id: string;
    name: string;
    color: string;
  };
}

/**
 * Congrats modal data for recently fulfilled missions
 */
export interface CongratsModalData {
  missionId: string;
  fulfilledAt: string;
  rewardType: string;
  rewardName: string | null;
  rewardAmount: number | null;
}

export const missionRepository = {
  /**
   * Find the highest-priority featured mission for a user.
   * Uses single optimized query with priority ordering.
   *
   * Per API_CONTRACTS.md lines 1943-1972:
   * - Mission types: raffle, sales_dollars, sales_units, videos, likes, views
   * - Priority: raffle > sales_dollars > sales_units > videos > likes > views
   * - Raffle only if activated=true AND no participation
   * - Excludes claimed missions
   * - Returns mission with progress and reward data
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async findFeaturedMission(
    userId: string,
    clientId: string,
    currentTierId: string,
    vipMetric: 'sales' | 'units'
  ): Promise<FeaturedMissionData | null> {
    const supabase = await createClient();

    // Get all eligible missions with their progress and rewards
    // Uses single query with LEFT JOINs for performance (~80ms)
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select(`
        id,
        mission_type,
        display_name,
        title,
        description,
        target_value,
        target_unit,
        raffle_end_date,
        activated,
        tier_eligibility,
        reward_id,
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        ),
        tiers!inner (
          id,
          tier_name,
          tier_color
        ),
        mission_progress (
          id,
          current_value,
          status,
          completed_at,
          user_id
        )
      `)
      .eq('client_id', clientId) // CRITICAL: Multitenancy enforcement
      .eq('tier_eligibility', currentTierId)
      .eq('enabled', true)
      .in('mission_type', ['raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views']);

    if (missionsError) {
      console.error('[MissionRepository] Error fetching missions:', missionsError);
      return null;
    }

    if (!missions || missions.length === 0) {
      return null;
    }

    // Get user's raffle participations to exclude
    const { data: raffleParticipations } = await supabase
      .from('raffle_participations')
      .select('mission_id')
      .eq('user_id', userId)
      .eq('client_id', clientId);

    const participatedRaffleIds = new Set(
      (raffleParticipations ?? []).map((p) => p.mission_id)
    );

    // Filter and sort missions by priority
    const eligibleMissions = missions
      .filter((mission) => {
        // Get user's progress for this mission
        const userProgress = (mission.mission_progress as MissionProgressRow[])
          ?.find((p) => p.user_id === userId);

        // Exclude claimed missions (they appear on Missions page, not Home)
        // Per API_CONTRACTS.md lines 1959, 1981-1984
        if (userProgress?.status === 'claimed') {
          return false;
        }

        // For raffle missions, check additional conditions
        if (mission.mission_type === 'raffle') {
          // Only show if activated=true (surprise feature)
          // Per API_CONTRACTS.md lines 1954-1955
          if (!mission.activated) {
            return false;
          }
          // Exclude if user already participated
          // Per API_CONTRACTS.md lines 1954-1958
          if (participatedRaffleIds.has(mission.id)) {
            return false;
          }
        }

        // Only show active or completed (not yet claimed)
        // Per API_CONTRACTS.md line 1959
        if (userProgress && !['active', 'completed'].includes(userProgress.status ?? '')) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort by priority (lower = higher priority)
        const priorityA = MISSION_PRIORITY[a.mission_type] ?? 999;
        const priorityB = MISSION_PRIORITY[b.mission_type] ?? 999;

        // For sales type, prefer the one matching vipMetric
        if (priorityA === priorityB) {
          if (a.mission_type === 'sales_dollars' && vipMetric === 'sales') return -1;
          if (b.mission_type === 'sales_dollars' && vipMetric === 'sales') return 1;
          if (a.mission_type === 'sales_units' && vipMetric === 'units') return -1;
          if (b.mission_type === 'sales_units' && vipMetric === 'units') return 1;
        }

        return priorityA - priorityB;
      });

    // Return first (highest priority) mission
    const topMission = eligibleMissions[0];
    if (!topMission) {
      return null;
    }

    // Get user's progress for this mission
    const userProgress = (topMission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Type assertions for joined data
    const reward = topMission.rewards as unknown as RewardRow;
    const tier = topMission.tiers as unknown as { id: string; tier_name: string; tier_color: string };

    return {
      mission: {
        id: topMission.id,
        type: topMission.mission_type,
        displayName: topMission.display_name,
        title: topMission.title,
        description: topMission.description,
        targetValue: topMission.target_value,
        targetUnit: topMission.target_unit,
        raffleEndDate: topMission.raffle_end_date,
        activated: topMission.activated ?? false,
      },
      progress: userProgress
        ? {
            id: userProgress.id,
            currentValue: userProgress.current_value ?? 0,
            status: userProgress.status ?? 'active',
            completedAt: userProgress.completed_at,
          }
        : null,
      reward: {
        id: reward.id,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        valueData: reward.value_data as Record<string, unknown> | null,
      },
      tier: {
        id: tier.id,
        name: tier.tier_name,
        color: tier.tier_color,
      },
    };
  },

  /**
   * Check for recently fulfilled missions (for congrats modal).
   * Finds missions where fulfilled_at > last_login_at.
   *
   * Per API_CONTRACTS.md lines 1998-2037
   */
  async findRecentFulfillment(
    userId: string,
    clientId: string,
    lastLoginAt: string | null
  ): Promise<CongratsModalData | null> {
    const supabase = await createClient();

    // If no last login, user is new - no fulfillments to show
    if (!lastLoginAt) {
      return null;
    }

    // Find missions fulfilled AFTER last login
    // Per API_CONTRACTS.md lines 2004-2017
    const { data: fulfillments, error } = await supabase
      .from('mission_progress')
      .select(`
        id,
        mission_id,
        completed_at,
        missions!inner (
          id,
          mission_type,
          rewards!inner (
            id,
            type,
            name,
            value_data
          )
        )
      `)
      .eq('user_id', userId)
      .eq('client_id', clientId) // CRITICAL: Multitenancy enforcement
      .eq('status', 'fulfilled')
      .gt('completed_at', lastLoginAt)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (error || !fulfillments || fulfillments.length === 0) {
      return null;
    }

    const fulfillment = fulfillments[0];
    const mission = fulfillment.missions as unknown as MissionRow & { rewards: RewardRow };
    const reward = mission.rewards;

    // Extract amount from value_data if it's a gift_card or spark_ads
    const valueData = reward.value_data as Record<string, unknown> | null;
    const rewardAmount = valueData?.amount as number | null;

    return {
      missionId: fulfillment.mission_id!,
      fulfilledAt: fulfillment.completed_at!,
      rewardType: reward.type,
      rewardName: reward.name,
      rewardAmount,
    };
  },
};
