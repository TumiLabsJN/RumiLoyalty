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

// ============================================
// Checkpoint Evaluation Types (Task 8.3.0a)
// Per Phase8UpgradeIMPL.md Section 11
// ============================================

/**
 * User data for checkpoint evaluation
 * Per Loyalty.md lines 1553-1561 (checkpoint query)
 */
export interface CheckpointUserData {
  userId: string;
  currentTier: string;
  tierOrder: number;
  checkpointSalesCurrent: number;
  checkpointUnitsCurrent: number;
  manualAdjustmentsTotal: number;
  manualAdjustmentsUnits: number;
  tierAchievedAt: string;
  nextCheckpointAt: string;
  vipMetric: 'sales' | 'units';
  checkpointMonths: number;
}

/**
 * Tier threshold for checkpoint comparison
 * Per Loyalty.md lines 1580-1598 (threshold comparison)
 */
export interface TierThreshold {
  tierId: string;
  tierName: string;
  tierOrder: number;
  threshold: number;
}

/**
 * Data for logging checkpoint result
 * Per SchemaFinalv2.md lines 293-312 (tier_checkpoints table)
 * Per Phase8UpgradeIMPL.md Section 11
 */
export interface CheckpointLogData {
  userId: string;
  checkpointDate: string;
  periodStartDate: string;
  periodEndDate: string;
  salesInPeriod: number | null;
  unitsInPeriod: number | null;
  salesRequired: number | null;
  unitsRequired: number | null;
  tierBefore: string;
  tierAfter: string;
  status: 'maintained' | 'promoted' | 'demoted';
}

/**
 * Candidate for tier promotion
 * Used by real-time promotion check (BUG-REALTIME-PROMOTION)
 */
export interface PromotionCandidate {
  userId: string;
  currentTier: string;
  currentTierOrder: number;
  qualifiesForTier: string;
  qualifiesForTierOrder: number;
  totalValue: number;
  threshold: number;
  tierAchievedAt: string;
}

/**
 * Data for updating user after checkpoint
 * Per Phase8UpgradeIMPL.md lines 263-267
 */
export interface CheckpointUpdateData {
  newTier: string;
  tierChanged: boolean;
  checkpointMonths: number;
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

  // ============================================
  // Checkpoint Evaluation Functions (Task 8.3.0a)
  // Per Loyalty.md lines 1553-1655
  // ============================================

  /**
   * Get users due for checkpoint evaluation today.
   * Per Loyalty.md lines 1553-1561
   *
   * Query: WHERE next_checkpoint_at <= TODAY AND current_tier != 'tier_1'
   * Bronze tier (tier_1) is exempt from checkpoints.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getUsersDueForCheckpoint(clientId: string): Promise<CheckpointUserData[]> {
    const supabase = await createClient();

    // Get users due for checkpoint with client's VIP settings
    // Join clients to get vip_metric and checkpoint_months
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        current_tier,
        checkpoint_sales_current,
        checkpoint_units_current,
        manual_adjustments_total,
        manual_adjustments_units,
        tier_achieved_at,
        next_checkpoint_at,
        clients!inner (
          vip_metric,
          checkpoint_months
        )
      `)
      .eq('client_id', clientId)
      .neq('current_tier', 'tier_1') // Bronze tier exempt
      .lte('next_checkpoint_at', new Date().toISOString().split('T')[0]); // <= TODAY

    if (error) {
      console.error('[TierRepository] Error fetching users due for checkpoint:', error);
      throw new Error(`Failed to fetch users due for checkpoint: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get tier_order for each user's current tier
    const tierIds = [...new Set(data.map((u) => u.current_tier).filter((t): t is string => t !== null))];
    const { data: tiers, error: tierError } = await supabase
      .from('tiers')
      .select('tier_id, tier_order')
      .eq('client_id', clientId)
      .in('tier_id', tierIds);

    if (tierError) {
      console.error('[TierRepository] Error fetching tier orders:', tierError);
      throw new Error(`Failed to fetch tier orders: ${tierError.message}`);
    }

    const tierOrderMap = new Map(tiers?.map((t) => [t.tier_id, t.tier_order]) || []);

    return data.map((user) => {
      const client = user.clients as unknown as { vip_metric: string; checkpoint_months: number };
      return {
        userId: user.id,
        currentTier: user.current_tier ?? 'tier_1',
        tierOrder: tierOrderMap.get(user.current_tier ?? '') ?? 1,
        checkpointSalesCurrent: user.checkpoint_sales_current ?? 0,
        checkpointUnitsCurrent: user.checkpoint_units_current ?? 0,
        manualAdjustmentsTotal: user.manual_adjustments_total ?? 0,
        manualAdjustmentsUnits: user.manual_adjustments_units ?? 0,
        tierAchievedAt: user.tier_achieved_at ?? new Date().toISOString(),
        nextCheckpointAt: user.next_checkpoint_at ?? new Date().toISOString(),
        vipMetric: (client.vip_metric === 'units' ? 'units' : 'sales') as 'sales' | 'units',
        checkpointMonths: client.checkpoint_months ?? 3,
      };
    });
  },

  /**
   * Get tier thresholds for checkpoint comparison.
   * Per Loyalty.md lines 1580-1598
   *
   * Returns tiers ordered by tier_order DESC for highest-first matching.
   * Returns sales_threshold OR units_threshold based on vipMetric.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getTierThresholdsForCheckpoint(
    clientId: string,
    vipMetric: 'sales' | 'units'
  ): Promise<TierThreshold[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('tiers')
      .select('tier_id, tier_name, tier_order, sales_threshold, units_threshold')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: false }); // Highest tier first

    if (error) {
      console.error('[TierRepository] Error fetching tier thresholds:', error);
      throw new Error(`Failed to fetch tier thresholds: ${error.message}`);
    }

    return (data || []).map((tier) => ({
      tierId: tier.tier_id,
      tierName: tier.tier_name,
      tierOrder: tier.tier_order,
      // Return appropriate threshold based on client's VIP metric
      threshold: vipMetric === 'units'
        ? (tier.units_threshold ?? 0)
        : (tier.sales_threshold ?? 0),
    }));
  },

  /**
   * Update user record after checkpoint evaluation.
   * Per Phase8UpgradeIMPL.md lines 260-268, Loyalty.md lines 1616-1631
   *
   * Updates:
   * - current_tier
   * - tier_achieved_at = NOW() (if changed)
   * - next_checkpoint_at = NOW() + checkpoint_months
   * - checkpoint_sales_current = 0 (reset)
   * - checkpoint_units_current = 0 (reset)
   *
   * SECURITY: Filters by client_id AND user_id (multitenancy)
   */
  async updateUserTierAfterCheckpoint(
    clientId: string,
    userId: string,
    data: CheckpointUpdateData
  ): Promise<void> {
    const supabase = await createClient();

    const now = new Date();
    const nextCheckpoint = new Date(now);
    nextCheckpoint.setMonth(nextCheckpoint.getMonth() + data.checkpointMonths);

    const updateData: Record<string, unknown> = {
      current_tier: data.newTier,
      next_checkpoint_at: nextCheckpoint.toISOString(),
      // Reset BOTH checkpoint totals (Issue 4: Option A per Loyalty.md line 1627)
      checkpoint_sales_current: 0,
      checkpoint_units_current: 0,
    };

    // Only update tier_achieved_at if tier changed
    if (data.tierChanged) {
      updateData.tier_achieved_at = now.toISOString();
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('client_id', clientId);

    if (error) {
      console.error('[TierRepository] Error updating user after checkpoint:', error);
      throw new Error(`Failed to update user after checkpoint: ${error.message}`);
    }
  },

  /**
   * Log checkpoint evaluation result to tier_checkpoints audit table.
   * Per Phase8UpgradeIMPL.md lines 274-289, Loyalty.md lines 1633-1659
   *
   * Creates audit record with period dates, values achieved, thresholds required,
   * tier before/after, and evaluation status.
   *
   * SECURITY: Inserts with client_id (multitenancy)
   *
   * @returns tier_checkpoint ID
   */
  async logCheckpointResult(
    clientId: string,
    data: CheckpointLogData
  ): Promise<string> {
    const supabase = await createClient();

    const { data: result, error } = await supabase
      .from('tier_checkpoints')
      .insert({
        client_id: clientId,
        user_id: data.userId,
        checkpoint_date: data.checkpointDate,
        period_start_date: data.periodStartDate,
        period_end_date: data.periodEndDate,
        sales_in_period: data.salesInPeriod,
        units_in_period: data.unitsInPeriod,
        sales_required: data.salesRequired,
        units_required: data.unitsRequired,
        tier_before: data.tierBefore,
        tier_after: data.tierAfter,
        status: data.status,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[TierRepository] Error logging checkpoint result:', error);
      throw new Error(`Failed to log checkpoint result: ${error.message}`);
    }

    return result.id;
  },

  /**
   * Get all users who may qualify for promotion.
   * Returns users whose total_sales OR total_units exceed their current tier's threshold.
   *
   * Unlike checkpoint evaluation, this includes ALL users (including Bronze).
   * Per BUG-REALTIME-PROMOTION: Model B real-time promotion.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getUsersForPromotionCheck(clientId: string): Promise<PromotionCandidate[]> {
    const supabase = await createClient();

    // Get all users with their current tier
    const { data: users, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        current_tier,
        total_sales,
        total_units,
        tier_achieved_at
      `)
      .eq('client_id', clientId);

    if (userError) {
      console.error('[TierRepository] Error fetching users for promotion check:', userError);
      throw new Error(`Failed to fetch users: ${userError.message}`);
    }

    // Get client's VIP metric setting
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('vip_metric')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('[TierRepository] Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    // Get tier thresholds sorted by tier_order DESC (highest first)
    const { data: tiers, error: tierError } = await supabase
      .from('tiers')
      .select('tier_id, tier_order, sales_threshold, units_threshold')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: false });

    if (tierError) {
      console.error('[TierRepository] Error fetching tiers:', tierError);
      throw new Error(`Failed to fetch tiers: ${tierError.message}`);
    }

    const vipMetric = client?.vip_metric;
    const candidates: PromotionCandidate[] = [];

    for (const user of users || []) {
      const userValue = vipMetric === 'units'
        ? (user.total_units ?? 0)
        : (user.total_sales ?? 0);

      // Find current tier order
      const currentTierData = tiers?.find(t => t.tier_id === user.current_tier);
      const currentTierOrder = currentTierData?.tier_order ?? 1;

      // Find highest qualifying tier (tiers sorted DESC by tier_order)
      for (const tier of tiers || []) {
        const threshold = vipMetric === 'units'
          ? (tier.units_threshold ?? 0)
          : (tier.sales_threshold ?? 0);

        if (userValue >= threshold && tier.tier_order > currentTierOrder) {
          // User qualifies for a HIGHER tier
          candidates.push({
            userId: user.id,
            currentTier: user.current_tier ?? 'tier_1',
            currentTierOrder,
            qualifiesForTier: tier.tier_id,
            qualifiesForTierOrder: tier.tier_order,
            totalValue: userValue,
            threshold,
            tierAchievedAt: user.tier_achieved_at ?? new Date().toISOString(),
          });
          break; // Take highest qualifying tier
        }
      }
    }

    return candidates;
  },

  /**
   * Promote a user to a higher tier.
   *
   * Updates:
   * - current_tier: New tier
   * - tier_achieved_at: NOW (new achievement date)
   * - next_checkpoint_at: NOW + checkpoint_months (fresh checkpoint period)
   * - checkpoint_*_target: NEW tier's threshold (must maintain new level)
   * - checkpoint_*_current: 0 (reset accumulation)
   *
   * Per BUG-REALTIME-PROMOTION: User gets full checkpoint period to prove new tier.
   *
   * SECURITY: Filters by client_id AND user_id (multitenancy)
   */
  async promoteUserToTier(
    clientId: string,
    userId: string,
    newTier: string,
    newTierThreshold: number,
    checkpointMonths: number,
    vipMetric: 'sales' | 'units'
  ): Promise<void> {
    const supabase = await createClient();

    const now = new Date();
    const nextCheckpoint = new Date(now);
    nextCheckpoint.setMonth(nextCheckpoint.getMonth() + checkpointMonths);

    const updateData: Record<string, unknown> = {
      current_tier: newTier,
      tier_achieved_at: now.toISOString(),
      next_checkpoint_at: nextCheckpoint.toISOString(),
      // Reset checkpoint accumulation
      checkpoint_sales_current: 0,
      checkpoint_units_current: 0,
      // Set target to NEW tier's threshold (dynamic per tier)
      checkpoint_sales_target: vipMetric === 'sales' ? newTierThreshold : null,
      checkpoint_units_target: vipMetric === 'units' ? newTierThreshold : null,
    };

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .eq('client_id', clientId);

    if (error) {
      console.error('[TierRepository] Error promoting user:', error);
      throw new Error(`Failed to promote user: ${error.message}`);
    }
  },
};
