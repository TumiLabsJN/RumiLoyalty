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
 * - API_CONTRACTS.md lines 2955-3820 (GET /api/missions)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';
import type { GetAvailableMissionsRow, GetMissionHistoryRow } from '@/lib/types/rpc';

type MissionRow = Database['public']['Tables']['missions']['Row'];
type MissionProgressRow = Database['public']['Tables']['mission_progress']['Row'];
type RewardRow = Database['public']['Tables']['rewards']['Row'];
type RedemptionRow = Database['public']['Tables']['redemptions']['Row'];
type CommissionBoostRedemptionRow = Database['public']['Tables']['commission_boost_redemptions']['Row'];
type PhysicalGiftRedemptionRow = Database['public']['Tables']['physical_gift_redemptions']['Row'];
type RaffleParticipationRow = Database['public']['Tables']['raffle_participations']['Row'];
type TierRow = Database['public']['Tables']['tiers']['Row'];

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

/**
 * Raw mission data for Missions page (service layer transforms)
 * Per API_CONTRACTS.md lines 2955-3820
 */
export interface AvailableMissionData {
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
    tierEligibility: string;
    previewFromTier: string | null;
    enabled: boolean;
  };
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    redemptionType: string;
    rewardSource: string;
  };
  tier: {
    id: string;
    name: string;
    color: string;
    order: number;
  };
  progress: {
    id: string;
    currentValue: number;
    status: string;
    completedAt: string | null;
    checkpointStart: string | null;
    checkpointEnd: string | null;
  } | null;
  redemption: {
    id: string;
    status: string;
    claimedAt: string | null;
    fulfilledAt: string | null;
    concludedAt: string | null;
    rejectedAt: string | null;
    scheduledActivationDate: string | null;
    scheduledActivationTime: string | null;
    activationDate: string | null;
    expirationDate: string | null;
  } | null;
  commissionBoost: {
    boostStatus: string;
    scheduledActivationDate: string;
    activatedAt: string | null;
    expiresAt: string | null;
    durationDays: number;
  } | null;
  physicalGift: {
    shippedAt: string | null;
    shippingCity: string | null;
    requiresSize: boolean | null;
  } | null;
  raffleParticipation: {
    isWinner: boolean | null;
    participatedAt: string;
    winnerSelectedAt: string | null;
  } | null;
  isLocked: boolean;
}

/**
 * Claim request data for different reward types
 * Per API_CONTRACTS.md lines 3723-3752
 */
export interface ClaimRequestData {
  scheduledActivationDate?: string; // YYYY-MM-DD for commission_boost, discount
  scheduledActivationTime?: string; // HH:MM:SS for commission_boost, discount
  size?: string; // For physical_gift with requiresSize
  shippingAddress?: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    phone?: string;
  };
}

/**
 * Claim result after processing
 */
export interface ClaimResult {
  success: boolean;
  redemptionId: string;
  newStatus: string;
  error?: string;
}

/**
 * Mission history entry for history page
 * Per API_CONTRACTS.md lines 3827-4047
 */
export interface MissionHistoryData {
  mission: {
    id: string;
    type: string;
    displayName: string;
  };
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    rewardSource: string;
  };
  progress: {
    completedAt: string | null;
  };
  redemption: {
    status: string;
    claimedAt: string | null;
    fulfilledAt: string | null;
    concludedAt: string | null;
    rejectedAt: string | null;
  };
  raffleParticipation: {
    isWinner: boolean | null;
    participatedAt: string;
    winnerSelectedAt: string | null;
  } | null;
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

    // IMPORTANT: Tier lookup runs AFTER priority selection (topMission is already
    // the highest-priority mission from eligibleMissions after filtering/sorting).
    // This prevents fetching tier info for missions that won't be displayed.
    // No FK exists between missions.tier_eligibility and tiers, so embedded join fails.
    let tier: { id: string; tier_name: string; tier_color: string } = {
      id: '',
      tier_name: 'All Tiers',
      tier_color: '#888888',
    };
    if (topMission.tier_eligibility !== 'all') {
      const { data: tierData } = await supabase
        .from('tiers')
        .select('id, tier_name, tier_color')
        .eq('client_id', clientId)
        .eq('tier_id', topMission.tier_eligibility)
        .single();
      if (tierData) {
        tier = tierData;
      }
    }

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

  /**
   * List all available missions for the Missions page.
   * Returns raw data for the service layer to compute statuses and format.
   *
   * Per API_CONTRACTS.md lines 2955-3820:
   * - Returns missions for user's tier + locked previews from higher tiers
   * - Joins with progress, redemptions, and sub-state tables
   * - Service layer computes 16 statuses from this data
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async listAvailable(
    userId: string,
    clientId: string,
    currentTierId: string
  ): Promise<AvailableMissionData[]> {
    const supabase = await createClient();

    // Single RPC call replaces 5 separate queries
    // Per SingleQueryBS.md Section 4.2 - get_available_missions function
    const { data, error } = await supabase.rpc('get_available_missions', {
      p_user_id: userId,
      p_client_id: clientId,
      p_current_tier: currentTierId,
    });

    if (error) {
      console.error('[MissionRepository] Error fetching missions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform flat RPC rows to AvailableMissionData structure
    return (data as GetAvailableMissionsRow[]).map((row) => {
      // Determine if this is a locked mission (from higher tier)
      const isLocked =
        row.mission_tier_eligibility !== currentTierId &&
        row.mission_tier_eligibility !== 'all' &&
        row.mission_preview_from_tier === currentTierId;

      return {
        mission: {
          id: row.mission_id,
          type: row.mission_type,
          displayName: row.mission_display_name,
          title: row.mission_title,
          description: row.mission_description,
          targetValue: row.mission_target_value,
          targetUnit: row.mission_target_unit,
          raffleEndDate: row.mission_raffle_end_date,
          activated: row.mission_activated ?? false,
          tierEligibility: row.mission_tier_eligibility,
          previewFromTier: row.mission_preview_from_tier,
          enabled: row.mission_enabled ?? true,
        },
        reward: {
          id: row.reward_id,
          type: row.reward_type,
          name: row.reward_name,
          description: row.reward_description,
          valueData: row.reward_value_data as Record<string, unknown> | null,
          redemptionType: row.reward_redemption_type ?? 'instant',
          rewardSource: row.reward_source ?? 'mission',
        },
        tier: {
          id: row.tier_id,
          name: row.tier_name,
          color: row.tier_color,
          order: row.tier_order,
        },
        progress: row.progress_id
          ? {
              id: row.progress_id,
              currentValue: row.progress_current_value ?? 0,
              status: row.progress_status ?? 'active',
              completedAt: row.progress_completed_at,
              checkpointStart: row.progress_checkpoint_start,
              checkpointEnd: row.progress_checkpoint_end,
            }
          : null,
        redemption: row.redemption_id
          ? {
              id: row.redemption_id,
              status: row.redemption_status ?? 'claimable',
              claimedAt: row.redemption_claimed_at,
              fulfilledAt: row.redemption_fulfilled_at,
              concludedAt: row.redemption_concluded_at,
              rejectedAt: row.redemption_rejected_at,
              scheduledActivationDate: row.redemption_scheduled_activation_date,
              scheduledActivationTime: row.redemption_scheduled_activation_time,
              activationDate: row.redemption_activation_date,
              expirationDate: row.redemption_expiration_date,
            }
          : null,
        commissionBoost: row.boost_status
          ? {
              boostStatus: row.boost_status,
              scheduledActivationDate: row.boost_scheduled_activation_date ?? '',
              activatedAt: row.boost_activated_at,
              expiresAt: row.boost_expires_at,
              durationDays: row.boost_duration_days ?? 0,
            }
          : null,
        physicalGift:
          row.physical_gift_requires_size !== null || row.physical_gift_shipping_city
            ? {
                shippedAt: row.physical_gift_shipped_at,
                shippingCity: row.physical_gift_shipping_city,
                requiresSize: row.physical_gift_requires_size,
              }
            : null,
        raffleParticipation: row.raffle_participated_at
          ? {
              isWinner: row.raffle_is_winner,
              participatedAt: row.raffle_participated_at,
              winnerSelectedAt: row.raffle_winner_selected_at,
            }
          : null,
        isLocked,
      };
    });
  },

  /**
   * Get mission history (concluded + rejected missions).
   * Per API_CONTRACTS.md lines 3827-4047
   *
   * Uses single RPC call per MissionQuery2.md
   * SECURITY: Filters by client_id via p_client_id parameter
   */
  async getHistory(
    userId: string,
    clientId: string
  ): Promise<MissionHistoryData[]> {
    const supabase = await createClient();

    // Single RPC call replaces 2 separate queries
    // Per MissionQuery2.md - get_mission_history function
    const { data, error } = await supabase.rpc('get_mission_history', {
      p_user_id: userId,
      p_client_id: clientId,
    });

    if (error) {
      console.error('[MissionRepository] Error fetching history:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform flat RPC rows to MissionHistoryData structure
    return (data as GetMissionHistoryRow[]).map((row) => ({
      mission: {
        id: row.mission_id,
        type: row.mission_type,
        displayName: row.mission_display_name,
      },
      reward: {
        id: row.reward_id,
        type: row.reward_type,
        name: row.reward_name,
        description: row.reward_description,
        valueData: row.reward_value_data as Record<string, unknown> | null,
        rewardSource: row.reward_source ?? 'mission',
      },
      progress: {
        completedAt: row.progress_completed_at,
      },
      redemption: {
        status: row.redemption_status,
        claimedAt: row.redemption_claimed_at,
        fulfilledAt: row.redemption_fulfilled_at,
        concludedAt: row.redemption_concluded_at,
        rejectedAt: row.redemption_rejected_at,
      },
      raffleParticipation: row.raffle_participated_at
        ? {
            isWinner: row.raffle_is_winner,
            participatedAt: row.raffle_participated_at,
            winnerSelectedAt: row.raffle_winner_selected_at,
          }
        : null,
    }));
  },

  /**
   * Find a mission by ID with all related data for claim/participate.
   * Used by service layer for validation before claim/participate actions.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async findById(
    missionId: string,
    userId: string,
    clientId: string
  ): Promise<AvailableMissionData | null> {
    const supabase = await createClient();

    const { data: mission, error } = await supabase
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
        preview_from_tier,
        enabled,
        display_order,
        reward_id,
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        ),
        mission_progress (
          id,
          user_id,
          current_value,
          status,
          completed_at,
          checkpoint_start,
          checkpoint_end
        )
      `)
      .eq('id', missionId)
      .eq('client_id', clientId)
      .single();

    if (error || !mission) {
      return null;
    }

    // Get user's progress
    const userProgress = (mission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Get redemption if exists
    let redemption = null;
    if (userProgress) {
      const { data: redemptionData } = await supabase
        .from('redemptions')
        .select(`
          id,
          status,
          claimed_at,
          fulfilled_at,
          concluded_at,
          rejected_at,
          scheduled_activation_date,
          scheduled_activation_time,
          activation_date,
          expiration_date
        `)
        .eq('mission_progress_id', userProgress.id)
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .single();
      redemption = redemptionData;
    }

    // Get sub-state data
    let commissionBoost = null;
    let physicalGift = null;
    if (redemption) {
      const { data: boostData } = await supabase
        .from('commission_boost_redemptions')
        .select(`
          redemption_id,
          boost_status,
          scheduled_activation_date,
          activated_at,
          expires_at,
          duration_days
        `)
        .eq('redemption_id', redemption.id)
        .eq('client_id', clientId)
        .single();
      commissionBoost = boostData;

      const { data: giftData } = await supabase
        .from('physical_gift_redemptions')
        .select(`
          redemption_id,
          shipped_at,
          shipping_city,
          requires_size
        `)
        .eq('redemption_id', redemption.id)
        .eq('client_id', clientId)
        .single();
      physicalGift = giftData;
    }

    // Get raffle participation
    const { data: raffleData } = await supabase
      .from('raffle_participations')
      .select(`
        mission_id,
        is_winner,
        participated_at,
        winner_selected_at
      `)
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single();

    const reward = mission.rewards as unknown as RewardRow;

    // IMPORTANT: Tier lookup runs AFTER mission query completes.
    // No FK exists between missions.tier_eligibility and tiers, so embedded join fails.
    let tier: TierRow | { id: string; tier_id: string; tier_name: string; tier_color: string; tier_order: number } = {
      id: '',
      tier_id: 'all',
      tier_name: 'All Tiers',
      tier_color: '#888888',
      tier_order: 0,
    } as TierRow;
    if (mission.tier_eligibility !== 'all') {
      const { data: tierData } = await supabase
        .from('tiers')
        .select('id, tier_id, tier_name, tier_color, tier_order')
        .eq('client_id', clientId)
        .eq('tier_id', mission.tier_eligibility)
        .single();
      if (tierData) {
        tier = tierData as TierRow;
      }
    }

    return {
      mission: {
        id: mission.id,
        type: mission.mission_type,
        displayName: mission.display_name,
        title: mission.title,
        description: mission.description,
        targetValue: mission.target_value,
        targetUnit: mission.target_unit,
        raffleEndDate: mission.raffle_end_date,
        activated: mission.activated ?? false,
        tierEligibility: mission.tier_eligibility,
        previewFromTier: mission.preview_from_tier,
        enabled: mission.enabled ?? true,
      },
      reward: {
        id: reward.id,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        valueData: reward.value_data as Record<string, unknown> | null,
        redemptionType: reward.redemption_type ?? 'instant',
        rewardSource: reward.reward_source ?? 'mission',
      },
      tier: {
        id: tier.id,
        name: tier.tier_name,
        color: tier.tier_color,
        order: tier.tier_order,
      },
      progress: userProgress
        ? {
            id: userProgress.id,
            currentValue: userProgress.current_value ?? 0,
            status: userProgress.status ?? 'active',
            completedAt: userProgress.completed_at,
            checkpointStart: userProgress.checkpoint_start,
            checkpointEnd: userProgress.checkpoint_end,
          }
        : null,
      redemption: redemption
        ? {
            id: redemption.id,
            status: redemption.status ?? 'claimable',
            claimedAt: redemption.claimed_at,
            fulfilledAt: redemption.fulfilled_at,
            concludedAt: redemption.concluded_at,
            rejectedAt: redemption.rejected_at,
            scheduledActivationDate: redemption.scheduled_activation_date,
            scheduledActivationTime: redemption.scheduled_activation_time,
            activationDate: redemption.activation_date,
            expirationDate: redemption.expiration_date,
          }
        : null,
      commissionBoost: commissionBoost
        ? {
            boostStatus: commissionBoost.boost_status,
            scheduledActivationDate: commissionBoost.scheduled_activation_date,
            activatedAt: commissionBoost.activated_at,
            expiresAt: commissionBoost.expires_at,
            durationDays: commissionBoost.duration_days,
          }
        : null,
      physicalGift: physicalGift
        ? {
            shippedAt: physicalGift.shipped_at,
            shippingCity: physicalGift.shipping_city,
            requiresSize: physicalGift.requires_size,
          }
        : null,
      raffleParticipation: raffleData
        ? {
            isWinner: raffleData.is_winner,
            participatedAt: raffleData.participated_at,
            winnerSelectedAt: raffleData.winner_selected_at,
          }
        : null,
      isLocked: false, // When fetching by ID, it's for the user's own tier
    };
  },

  /**
   * Claim a mission reward.
   * Updates redemptions.status from 'claimable' → 'claimed'
   * Creates sub-state records as needed.
   *
   * Per API_CONTRACTS.md lines 3711-3779
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async claimReward(
    redemptionId: string,
    userId: string,
    clientId: string,
    claimData: ClaimRequestData
  ): Promise<ClaimResult> {
    const supabase = await createClient();

    // 1. Verify redemption exists and is claimable
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .select('id, status, reward_id, mission_progress_id')
      .eq('id', redemptionId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .single();

    if (redemptionError || !redemption) {
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Redemption not found',
      };
    }

    if (redemption.status !== 'claimable') {
      return {
        success: false,
        redemptionId,
        newStatus: redemption.status ?? 'unknown',
        error: `Cannot claim: reward is ${redemption.status}`,
      };
    }

    // 2. Get reward details for sub-state creation
    if (!redemption.reward_id) {
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Reward not linked to redemption',
      };
    }

    const { data: reward } = await supabase
      .from('rewards')
      .select('id, type, value_data, redemption_type')
      .eq('id', redemption.reward_id)
      .single();

    if (!reward) {
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Reward configuration not found',
      };
    }

    const valueData = reward.value_data as Record<string, unknown> | null;
    const now = new Date().toISOString();

    // 3. Update redemption to 'claimed'
    const updateData: Record<string, unknown> = {
      status: 'claimed',
      claimed_at: now,
      updated_at: now,
    };

    // Add scheduling data for scheduled rewards
    if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
      updateData.scheduled_activation_date = claimData.scheduledActivationDate;
      updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
    }

    const { error: updateError } = await supabase
      .from('redemptions')
      .update(updateData)
      .eq('id', redemptionId);

    if (updateError) {
      console.error('[MissionRepository] Error claiming reward:', updateError);
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Failed to update redemption',
      };
    }

    // 4. Create sub-state records based on reward type
    if (reward.type === 'commission_boost') {
      const durationDays = (valueData?.duration_days as number) ?? 30;
      const boostPercent = (valueData?.percent as number) ?? 0;

      const { error: boostError } = await supabase
        .from('commission_boost_redemptions')
        .insert({
          redemption_id: redemptionId,
          client_id: clientId,
          boost_status: 'scheduled',
          scheduled_activation_date: claimData.scheduledActivationDate!,
          duration_days: durationDays,
          boost_rate: boostPercent,
        });

      if (boostError) {
        console.error('[MissionRepository] Error creating boost record:', boostError);
        // Note: Main redemption is already claimed, sub-state can be recovered
      }
    }

    if (reward.type === 'physical_gift' && claimData.shippingAddress) {
      const addr = claimData.shippingAddress;
      const requiresSize = (valueData?.requires_size as boolean) ?? false;

      const { error: giftError } = await supabase
        .from('physical_gift_redemptions')
        .insert({
          redemption_id: redemptionId,
          client_id: clientId,
          requires_size: requiresSize,
          size_category: (valueData?.size_category as string) ?? null,
          size_value: claimData.size ?? null,
          size_submitted_at: claimData.size ? now : null,
          shipping_recipient_first_name: addr.firstName,
          shipping_recipient_last_name: addr.lastName,
          shipping_address_line1: addr.line1,
          shipping_address_line2: addr.line2 ?? null,
          shipping_city: addr.city,
          shipping_state: addr.state,
          shipping_postal_code: addr.postalCode,
          shipping_country: addr.country ?? 'USA',
          shipping_phone: addr.phone ?? null,
          shipping_info_submitted_at: now,
        });

      if (giftError) {
        console.error('[MissionRepository] Error creating gift record:', giftError);
      }
    }

    return {
      success: true,
      redemptionId,
      newStatus: 'claimed',
    };
  },
};
