/**
 * Tier Repository
 *
 * Data access layer for tiers and tier-related reward aggregation.
 * Enforces multi-tenant isolation via client_id filtering.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - API_CONTRACTS.md lines 5559-6140 (GET /api/tiers)
 * - SchemaFinalv2.md lines 254-272 (tiers table)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type TierRow = Database['public']['Tables']['tiers']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];
type RewardRow = Database['public']['Tables']['rewards']['Row'];
type MissionRow = Database['public']['Tables']['missions']['Row'];

/**
 * Tier data with basic fields
 * Per SchemaFinalv2.md lines 254-272
 */
export interface TierData {
  id: string;
  tierId: string;
  tierName: string;
  tierColor: string;
  tierOrder: number;
  salesThreshold: number | null;
  unitsThreshold: number | null;
  commissionRate: number;
  checkpointExempt: boolean;
}

/**
 * Reward data for aggregation
 * Per API_CONTRACTS.md lines 6111-6132
 */
export interface TierRewardData {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  valueData: Record<string, unknown> | null;
  tierEligibility: string;
  uses: number;
  rewardSource: string;
}

/**
 * Mission with linked reward data for tier aggregation.
 * Includes mission_type for isRaffle derivation.
 * Per API_CONTRACTS.md GET /api/tiers → Reward Aggregation section
 */
export interface TierMissionData {
  id: string;
  missionType: string;
  tierEligibility: string;
  rewardId: string;
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    uses: number;
    rewardSource: string;
  };
  isRaffle: boolean;
}

/**
 * User tier context for filtering and calculations
 */
export interface UserTierContext {
  userId: string;
  clientId: string;
  currentTier: string;
  currentTierOrder: number;
  totalSales: number;
  totalUnits: number;
  nextCheckpointAt: string | null;
  tierAchievedAt: string | null;
}

/**
 * VIP system settings from clients table
 */
export interface VipSystemSettings {
  metric: 'sales_dollars' | 'sales_units';
}

export const tierRepository = {
  /**
   * Get all tiers for a client ordered by tier_order.
   * Per API_CONTRACTS.md lines 6092-6098 (tier filtering logic)
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getAllTiers(clientId: string): Promise<TierData[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tiers')
      .select('*')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: true });

    if (error) {
      console.error('[TierRepository] Error fetching tiers:', error);
      throw new Error('Failed to fetch tiers');
    }

    return (data || []).map((tier) => ({
      id: tier.id,
      tierId: tier.tier_id,
      tierName: tier.tier_name,
      tierColor: tier.tier_color,
      tierOrder: tier.tier_order,
      salesThreshold: tier.sales_threshold,
      unitsThreshold: tier.units_threshold,
      commissionRate: tier.commission_rate,
      checkpointExempt: tier.checkpoint_exempt ?? false,
    }));
  },

  /**
   * Get user tier context for tiers page calculations.
   * Per API_CONTRACTS.md lines 5624-5634 (user section fields)
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getUserTierContext(
    userId: string,
    clientId: string
  ): Promise<UserTierContext | null> {
    const supabase = await createClient();

    // Get user with current tier info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, client_id, current_tier, total_sales, total_units, next_checkpoint_at, tier_achieved_at')
      .eq('id', userId)
      .eq('client_id', clientId)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return null; // User not found
      }
      console.error('[TierRepository] Error fetching user:', userError);
      throw new Error('Failed to fetch user');
    }

    // Validate current_tier exists (should always be set, but check for safety)
    if (!user.current_tier) {
      console.error('[TierRepository] User has no current_tier:', userId);
      return null;
    }

    // Get tier order for current tier
    const { data: tier, error: tierError } = await supabase
      .from('tiers')
      .select('tier_order')
      .eq('client_id', clientId)
      .eq('tier_id', user.current_tier)
      .single();

    if (tierError) {
      console.error('[TierRepository] Error fetching tier order:', tierError);
      throw new Error('Failed to fetch tier order');
    }

    return {
      userId: user.id,
      clientId: user.client_id,
      currentTier: user.current_tier ?? 'tier_1',
      currentTierOrder: tier?.tier_order ?? 1,
      totalSales: user.total_sales ?? 0,
      totalUnits: user.total_units ?? 0,
      nextCheckpointAt: user.next_checkpoint_at,
      tierAchievedAt: user.tier_achieved_at,
    };
  },

  /**
   * Get VIP system settings (metric) from clients table.
   * Per API_CONTRACTS.md lines 5648-5650 (vipSystem section)
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getVipSystemSettings(clientId: string): Promise<VipSystemSettings> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('vip_metric')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('[TierRepository] Error fetching VIP settings:', error);
      throw new Error('Failed to fetch VIP system settings');
    }

    // Map database vip_metric to API response format
    // Database stores 'units' or 'sales', API returns 'sales_units' or 'sales_dollars'
    const metric = data.vip_metric === 'sales' ? 'sales_dollars' : 'sales_units';

    return { metric };
  },

  /**
   * Get VIP tier rewards for aggregation.
   * Per API_CONTRACTS.md lines 6111-6132 (reward aggregation)
   *
   * Returns rewards where reward_source = 'vip_tier' grouped by tier.
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getVipTierRewards(clientId: string): Promise<TierRewardData[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rewards')
      .select('id, type, name, description, value_data, tier_eligibility, redemption_quantity, reward_source')
      .eq('client_id', clientId)
      .eq('reward_source', 'vip_tier')
      .eq('enabled', true);

    if (error) {
      console.error('[TierRepository] Error fetching VIP tier rewards:', error);
      throw new Error('Failed to fetch VIP tier rewards');
    }

    return (data || []).map((reward) => ({
      id: reward.id,
      type: reward.type,
      name: reward.name,
      description: reward.description,
      valueData: reward.value_data as Record<string, unknown> | null,
      tierEligibility: reward.tier_eligibility,
      uses: reward.redemption_quantity ?? 1,
      rewardSource: reward.reward_source ?? 'vip_tier',
    }));
  },

  /**
   * Get tier-eligible missions with their linked rewards.
   * Returns complete data for:
   * - Reward aggregation (type, name, valueData for displayText)
   * - isRaffle derivation (mission_type === 'raffle')
   * - totalPerksCount calculation (uses)
   *
   * Per API_CONTRACTS.md GET /api/tiers → Reward Aggregation section
   *
   * SECURITY: Validates client_id match on BOTH missions AND rewards (multitenancy)
   */
  async getTierMissions(clientId: string): Promise<TierMissionData[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('missions')
      .select(`
        id,
        mission_type,
        tier_eligibility,
        reward_id,
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_quantity,
          reward_source,
          client_id
        )
      `)
      .eq('client_id', clientId)
      .eq('enabled', true)
      .eq('rewards.client_id', clientId)
      .eq('rewards.enabled', true);

    if (error) {
      console.error('[TierRepository] Error fetching tier missions:', error);
      throw new Error('Failed to fetch tier missions');
    }

    return (data || []).map((mission) => {
      const reward = mission.rewards as unknown as {
        id: string;
        type: string;
        name: string | null;
        description: string | null;
        value_data: Record<string, unknown> | null;
        redemption_quantity: number | null;
        reward_source: string;
        client_id: string;
      };
      return {
        id: mission.id,
        missionType: mission.mission_type,
        tierEligibility: mission.tier_eligibility,
        rewardId: mission.reward_id,
        reward: {
          id: reward.id,
          type: reward.type,
          name: reward.name,
          description: reward.description,
          valueData: reward.value_data,
          uses: reward.redemption_quantity ?? 1,
          rewardSource: reward.reward_source ?? 'mission',
        },
        isRaffle: mission.mission_type === 'raffle',
      };
    });
  },
};
