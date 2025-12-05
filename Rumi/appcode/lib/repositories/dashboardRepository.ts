/**
 * Dashboard Repository
 *
 * Data access layer for dashboard data (user info, tiers, rewards).
 * Enforces multi-tenant isolation via client_id filtering.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type UserRow = Database['public']['Tables']['users']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];
type TierRow = Database['public']['Tables']['tiers']['Row'];
type RewardRow = Database['public']['Tables']['rewards']['Row'];

/**
 * User dashboard data (raw from DB, service layer transforms)
 */
export interface UserDashboardData {
  user: {
    id: string;
    handle: string;
    email: string | null;
  };
  client: {
    id: string;
    name: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
    supportEmail: string | null;
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
  allTiers: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
}

/**
 * Reward data for dashboard showcase
 */
export interface DashboardReward {
  id: string;
  type: string;
  name: string | null;
  description: string | null;
  valueData: Record<string, unknown> | null;
  rewardSource: string;
  redemptionQuantity: number;
  displayOrder: number;
}

/**
 * Rewards result with total count
 */
export interface CurrentTierRewardsResult {
  rewards: DashboardReward[];
  totalCount: number;
}

export const dashboardRepository = {
  /**
   * Get user dashboard data with tier info and checkpoint progress.
   * Executes JOINed query: users -> clients -> tiers (current + next)
   *
   * Per API_CONTRACTS.md lines 2079-2125:
   * - user: id, handle, email, clientName
   * - client: id, vipMetric, vipMetricLabel
   * - currentTier: id, name, color, order, checkpointExempt
   * - nextTier: id, name, color, minSalesThreshold (or null if highest)
   * - checkpointData: raw values for service layer formatting
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getUserDashboard(
    userId: string,
    clientId: string,
    options?: { includeAllTiers?: boolean }
  ): Promise<UserDashboardData | null> {
    const supabase = await createClient();

    // Get user with client data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        tiktok_handle,
        email,
        current_tier,
        checkpoint_sales_current,
        checkpoint_units_current,
        manual_adjustments_total,
        manual_adjustments_units,
        next_checkpoint_at,
        last_login_at,
        client_id,
        clients!inner (
          id,
          name,
          vip_metric,
          checkpoint_months,
          primary_color
        )
      `)
      .eq('id', userId)
      .eq('client_id', clientId) // CRITICAL: Multitenancy enforcement
      .single();

    if (userError || !user) {
      return null;
    }

    // Type assertion for joined client data
    const clientData = user.clients as unknown as ClientRow;

    // current_tier should always exist, but check for safety
    if (!user.current_tier) {
      console.error('[DashboardRepository] User has no current_tier:', userId);
      return null;
    }

    // Get current tier
    const { data: currentTier, error: tierError } = await supabase
      .from('tiers')
      .select('*')
      .eq('id', user.current_tier)
      .eq('client_id', clientId) // CRITICAL: Multitenancy enforcement
      .single();

    if (tierError || !currentTier) {
      return null;
    }

    // Get next tier (tier_order + 1)
    const { data: nextTier } = await supabase
      .from('tiers')
      .select('*')
      .eq('client_id', clientId)
      .eq('tier_order', currentTier.tier_order + 1)
      .single();

    // Get all tiers for client (only if requested)
    let allTiersData: Array<{ id: string; tier_name: string; tier_color: string; tier_order: number }> = [];
    if (options?.includeAllTiers) {
      const { data: allTiers } = await supabase
        .from('tiers')
        .select('id, tier_name, tier_color, tier_order')
        .eq('client_id', clientId)
        .order('tier_order', { ascending: true });

      allTiersData = allTiers ?? [];
    }

    return {
      user: {
        id: user.id,
        handle: user.tiktok_handle,
        email: user.email,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        vipMetric: clientData.vip_metric as 'sales' | 'units',
        checkpointMonths: clientData.checkpoint_months ?? 4,
        supportEmail: clientData.primary_color, // TODO: Add support_email to clients table
      },
      currentTier: {
        id: currentTier.id,
        name: currentTier.tier_name,
        color: currentTier.tier_color,
        order: currentTier.tier_order,
        checkpointExempt: currentTier.checkpoint_exempt ?? false,
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.tier_name,
            color: nextTier.tier_color,
            salesThreshold: nextTier.sales_threshold ?? 0,
            unitsThreshold: nextTier.units_threshold ?? 0,
          }
        : null,
      allTiers: allTiersData.map(tier => ({
        id: tier.id,
        name: tier.tier_name,
        color: tier.tier_color,
        order: tier.tier_order,
      })),
      checkpointData: {
        salesCurrent: user.checkpoint_sales_current ?? 0,
        unitsCurrent: user.checkpoint_units_current ?? 0,
        manualAdjustmentsTotal: user.manual_adjustments_total ?? 0,
        manualAdjustmentsUnits: user.manual_adjustments_units ?? 0,
        nextCheckpointAt: user.next_checkpoint_at,
        lastLoginAt: user.last_login_at,
      },
    };
  },

  /**
   * Get current tier rewards for dashboard showcase.
   * Returns top 4 rewards sorted by display_order, plus total count.
   *
   * Per API_CONTRACTS.md lines 2172-2192:
   * - Filters: tier_eligibility, enabled=true, reward_source='vip_tier'
   * - ORDER BY display_order ASC
   * - LIMIT 4 (for showcase card)
   * - Also returns totalRewardsCount for "And more!" logic
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getCurrentTierRewards(
    clientId: string,
    currentTierId: string
  ): Promise<CurrentTierRewardsResult> {
    const supabase = await createClient();

    // Get top 4 rewards
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select(`
        id,
        type,
        name,
        description,
        value_data,
        reward_source,
        redemption_quantity,
        display_order
      `)
      .eq('client_id', clientId) // CRITICAL: Multitenancy enforcement
      .eq('tier_eligibility', currentTierId)
      .eq('enabled', true)
      .eq('reward_source', 'vip_tier') // Only VIP tier rewards, not mission rewards
      .order('display_order', { ascending: true })
      .limit(4);

    if (rewardsError) {
      console.error('[DashboardRepository] Error fetching rewards:', rewardsError);
      return { rewards: [], totalCount: 0 };
    }

    // Get total count for "And more!" logic
    const { count, error: countError } = await supabase
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('tier_eligibility', currentTierId)
      .eq('enabled', true)
      .eq('reward_source', 'vip_tier');

    if (countError) {
      console.error('[DashboardRepository] Error counting rewards:', countError);
    }

    return {
      rewards: (rewards ?? []).map((reward) => ({
        id: reward.id,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        valueData: reward.value_data as Record<string, unknown> | null,
        rewardSource: reward.reward_source,
        redemptionQuantity: reward.redemption_quantity ?? 1,
        displayOrder: reward.display_order ?? 999,
      })),
      totalCount: count ?? 0,
    };
  },

  /**
   * Update user's last_login_at timestamp.
   * Called AFTER checking congrats modal to prevent re-showing.
   *
   * Per API_CONTRACTS.md lines 2025-2030
   */
  async updateLastLoginAt(userId: string, clientId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('client_id', clientId); // CRITICAL: Multitenancy enforcement

    if (error) {
      console.error('[DashboardRepository] Error updating last_login_at:', error);
    }
  },
};
