/**
 * Reward Repository
 *
 * Data access layer for rewards, redemptions, and reward sub-states.
 * Enforces multi-tenant isolation via client_id filtering.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - API_CONTRACTS.md lines 4056-5600 (Rewards endpoints)
 * - SchemaFinalv2.md lines 462-590 (rewards table)
 * - SchemaFinalv2.md lines 594-662 (redemptions table)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type RewardRow = Database['public']['Tables']['rewards']['Row'];
type RedemptionRow = Database['public']['Tables']['redemptions']['Row'];
type CommissionBoostRedemptionRow = Database['public']['Tables']['commission_boost_redemptions']['Row'];
type PhysicalGiftRedemptionRow = Database['public']['Tables']['physical_gift_redemptions']['Row'];
type TierRow = Database['public']['Tables']['tiers']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Available reward data with active redemption and sub-state info
 * Per API_CONTRACTS.md lines 4740-4800 (database query with LEFT JOINs)
 */
export interface AvailableRewardData {
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    tierEligibility: string;
    previewFromTier: string | null;
    redemptionFrequency: string;
    redemptionQuantity: number | null;
    redemptionType: string;
    rewardSource: string;
    displayOrder: number | null;
    enabled: boolean;
  };
  tier: {
    id: string;
    name: string;
    color: string;
  };
  redemption: {
    id: string;
    status: string;
    claimedAt: string | null;
    scheduledActivationDate: string | null;
    scheduledActivationTime: string | null;
    activationDate: string | null;
    expirationDate: string | null;
  } | null;
  commissionBoost: {
    boostStatus: string;
    activatedAt: string | null;
    expiresAt: string | null;
    salesAtExpiration: number | null;
  } | null;
  physicalGift: {
    shippingCity: string | null;
    shippedAt: string | null;
  } | null;
}

/**
 * Usage count result
 */
export interface UsageCountResult {
  usedCount: number;
  tierAchievedAt: string | null;
}

/**
 * Redemption creation result
 */
export interface CreateRedemptionResult {
  redemptionId: string;
  status: string;
  claimedAt: string;
  subStateId?: string;
}

export const rewardRepository = {
  /**
   * Get all available rewards for user's current tier with active redemptions and sub-states.
   * Executes single optimized query with LEFT JOINs per API_CONTRACTS.md lines 4740-4800.
   *
   * Per API_CONTRACTS.md lines 4786-4797:
   * - Filter by client_id, enabled=true, reward_source='vip_tier'
   * - Include tier_eligibility matches OR preview_from_tier visibility
   * - LEFT JOIN redemptions WHERE mission_progress_id IS NULL (VIP tier only)
   * - LEFT JOIN commission_boost_redemptions for boost sub-state
   * - LEFT JOIN physical_gift_redemptions for shipping sub-state
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async listAvailable(
    userId: string,
    clientId: string,
    currentTier: string,
    currentTierOrder: number
  ): Promise<AvailableRewardData[]> {
    const supabase = await createClient();

    // Get rewards with tier info
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select(`
        id,
        type,
        name,
        description,
        value_data,
        tier_eligibility,
        preview_from_tier,
        redemption_frequency,
        redemption_quantity,
        redemption_type,
        reward_source,
        display_order,
        enabled
      `)
      .eq('client_id', clientId)
      .eq('enabled', true)
      .eq('reward_source', 'vip_tier')
      .order('display_order', { ascending: true });

    if (rewardsError) {
      console.error('Error fetching rewards:', rewardsError);
      throw new Error('Failed to fetch rewards');
    }

    if (!rewards || rewards.length === 0) {
      return [];
    }

    // Get tier info for all tiers (for tier name lookup)
    const { data: tiers, error: tiersError } = await supabase
      .from('tiers')
      .select('tier_id, tier_name, tier_color, tier_order')
      .eq('client_id', clientId);

    if (tiersError) {
      console.error('Error fetching tiers:', tiersError);
      throw new Error('Failed to fetch tiers');
    }

    const tierMap = new Map(tiers?.map(t => [t.tier_id, t]) || []);

    // Get active redemptions for this user (VIP tier rewards only)
    // Per API_CONTRACTS.md lines 4776-4781: mission_progress_id IS NULL, status NOT IN ('concluded', 'rejected')
    const rewardIds = rewards.map(r => r.id);
    const { data: redemptions, error: redemptionsError } = await supabase
      .from('redemptions')
      .select(`
        id,
        reward_id,
        status,
        claimed_at,
        scheduled_activation_date,
        scheduled_activation_time,
        activation_date,
        expiration_date
      `)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .is('mission_progress_id', null)
      .not('status', 'in', '("concluded","rejected")')
      .is('deleted_at', null)
      .in('reward_id', rewardIds);

    if (redemptionsError) {
      console.error('Error fetching redemptions:', redemptionsError);
      throw new Error('Failed to fetch redemptions');
    }

    // Create redemption map by reward_id
    const redemptionMap = new Map(redemptions?.map(r => [r.reward_id, r]) || []);

    // Get commission boost sub-states for active redemptions
    const redemptionIds = redemptions?.map(r => r.id) || [];
    type BoostSubState = {
      redemption_id: string;
      boost_status: string;
      activated_at: string | null;
      expires_at: string | null;
      sales_at_expiration: number | null;
    };
    type PhysicalGiftSubState = {
      redemption_id: string;
      shipping_city: string | null;
      shipped_at: string | null;
    };
    let boostMap = new Map<string, BoostSubState>();
    let physicalGiftMap = new Map<string, PhysicalGiftSubState>();

    if (redemptionIds.length > 0) {
      const { data: boosts, error: boostsError } = await supabase
        .from('commission_boost_redemptions')
        .select('redemption_id, boost_status, activated_at, expires_at, sales_at_expiration')
        .in('redemption_id', redemptionIds);

      if (boostsError) {
        console.error('Error fetching commission boosts:', boostsError);
      } else {
        boostMap = new Map(boosts?.map(b => [b.redemption_id, b]) || []);
      }

      const { data: physicalGifts, error: giftsError } = await supabase
        .from('physical_gift_redemptions')
        .select('redemption_id, shipping_city, shipped_at')
        .in('redemption_id', redemptionIds);

      if (giftsError) {
        console.error('Error fetching physical gifts:', giftsError);
      } else {
        physicalGiftMap = new Map(physicalGifts?.map(p => [p.redemption_id, p]) || []);
      }
    }

    // Filter and transform rewards
    const result: AvailableRewardData[] = [];

    for (const reward of rewards) {
      // Check tier eligibility per API_CONTRACTS.md lines 4789-4797
      const tierInfo = tierMap.get(reward.tier_eligibility);
      const isCurrentTier = reward.tier_eligibility === currentTier;

      // Check preview visibility
      let isVisible = isCurrentTier;
      if (!isVisible && reward.preview_from_tier) {
        const previewTier = tierMap.get(reward.preview_from_tier);
        if (previewTier && currentTierOrder >= previewTier.tier_order) {
          isVisible = true;
        }
      }

      if (!isVisible) continue;

      const redemption = redemptionMap.get(reward.id);
      const boost = redemption ? boostMap.get(redemption.id) : null;
      const physicalGift = redemption ? physicalGiftMap.get(redemption.id) : null;

      result.push({
        reward: {
          id: reward.id,
          type: reward.type,
          name: reward.name,
          description: reward.description,
          valueData: reward.value_data as Record<string, unknown> | null,
          tierEligibility: reward.tier_eligibility,
          previewFromTier: reward.preview_from_tier,
          redemptionFrequency: reward.redemption_frequency ?? 'unlimited',
          redemptionQuantity: reward.redemption_quantity,
          redemptionType: reward.redemption_type ?? 'instant',
          rewardSource: reward.reward_source ?? 'mission',
          displayOrder: reward.display_order,
          enabled: reward.enabled ?? false,
        },
        tier: {
          id: tierInfo?.tier_id || reward.tier_eligibility,
          name: tierInfo?.tier_name || reward.tier_eligibility,
          color: tierInfo?.tier_color || '#6366f1',
        },
        redemption: redemption ? {
          id: redemption.id,
          status: redemption.status ?? 'claimable',
          claimedAt: redemption.claimed_at,
          scheduledActivationDate: redemption.scheduled_activation_date,
          scheduledActivationTime: redemption.scheduled_activation_time,
          activationDate: redemption.activation_date,
          expirationDate: redemption.expiration_date,
        } : null,
        commissionBoost: boost ? {
          boostStatus: boost.boost_status,
          activatedAt: boost.activated_at,
          expiresAt: boost.expires_at,
          salesAtExpiration: boost.sales_at_expiration ? Number(boost.sales_at_expiration) : null,
        } : null,
        physicalGift: physicalGift ? {
          shippingCity: physicalGift.shipping_city,
          shippedAt: physicalGift.shipped_at,
        } : null,
      });
    }

    return result;
  },

  /**
   * Get usage count for a VIP tier reward.
   * Per API_CONTRACTS.md lines 4567-4615 (Usage Count Calculation)
   *
   * Counts WHERE:
   * - mission_progress_id IS NULL (VIP tier rewards only)
   * - tier_at_claim = currentTier (current tier only)
   * - status IN ('claimed', 'fulfilled', 'concluded')
   * - deleted_at IS NULL
   * - created_at >= tier_achieved_at (resets on tier change)
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getUsageCount(
    userId: string,
    rewardId: string,
    clientId: string,
    currentTier: string
  ): Promise<UsageCountResult> {
    const supabase = await createClient();

    // Get user's tier_achieved_at
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier_achieved_at')
      .eq('id', userId)
      .eq('client_id', clientId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      throw new Error('Failed to fetch user');
    }

    const tierAchievedAt = user?.tier_achieved_at;

    // Build query for usage count
    let query = supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reward_id', rewardId)
      .eq('client_id', clientId)
      .is('mission_progress_id', null)
      .eq('tier_at_claim', currentTier)
      .in('status', ['claimed', 'fulfilled', 'concluded'])
      .is('deleted_at', null);

    // Only filter by tier_achieved_at if it exists
    if (tierAchievedAt) {
      query = query.gte('created_at', tierAchievedAt);
    }

    const { count, error: countError } = await query;

    if (countError) {
      console.error('Error counting redemptions:', countError);
      throw new Error('Failed to count redemptions');
    }

    return {
      usedCount: count || 0,
      tierAchievedAt,
    };
  },

  /**
   * Get reward by ID with validation
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getById(
    rewardId: string,
    clientId: string
  ): Promise<RewardRow | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('client_id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching reward:', error);
      throw new Error('Failed to fetch reward');
    }

    return data;
  },

  /**
   * Check if user has an active redemption for a reward.
   * Per API_CONTRACTS.md lines 4946-4954 (No Active Claim validation)
   *
   * Active = status IN ('claimed', 'fulfilled') AND mission_progress_id IS NULL
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async hasActiveRedemption(
    userId: string,
    rewardId: string,
    clientId: string
  ): Promise<{ hasActive: boolean; redemption?: { id: string; status: string } }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('redemptions')
      .select('id, status')
      .eq('user_id', userId)
      .eq('reward_id', rewardId)
      .eq('client_id', clientId)
      .is('mission_progress_id', null)
      .in('status', ['claimed', 'fulfilled'])
      .is('deleted_at', null)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { hasActive: false };
      }
      console.error('Error checking active redemption:', error);
      throw new Error('Failed to check active redemption');
    }

    return {
      hasActive: true,
      redemption: data ? { id: data.id, status: data.status ?? 'claimed' } : undefined,
    };
  },

  /**
   * Create a redemption record for VIP tier reward claim.
   * Per API_CONTRACTS.md lines 4902-4970 (POST /api/rewards/:id/claim)
   *
   * Creates redemption with:
   * - status = 'claimed'
   * - tier_at_claim = current tier (snapshot)
   * - mission_progress_id = NULL (VIP tier reward)
   * - claimed_at = NOW()
   *
   * For commission_boost/discount: also sets scheduled_activation_date/time
   *
   * SECURITY: Validates client_id is provided (multitenancy)
   */
  async createRedemption(params: {
    userId: string;
    rewardId: string;
    clientId: string;
    tierAtClaim: string;
    redemptionType: 'instant' | 'scheduled';
    scheduledActivationDate?: string;
    scheduledActivationTime?: string;
  }): Promise<CreateRedemptionResult> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('redemptions')
      .insert({
        user_id: params.userId,
        reward_id: params.rewardId,
        client_id: params.clientId,
        tier_at_claim: params.tierAtClaim,
        redemption_type: params.redemptionType,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        scheduled_activation_date: params.scheduledActivationDate || null,
        scheduled_activation_time: params.scheduledActivationTime || null,
        mission_progress_id: null, // VIP tier rewards have no mission
      })
      .select('id, status, claimed_at')
      .single();

    if (error) {
      console.error('Error creating redemption:', error);
      throw new Error('Failed to create redemption');
    }

    return {
      redemptionId: data.id,
      status: data.status ?? 'claimed',
      claimedAt: data.claimed_at ?? new Date().toISOString(),
    };
  },

  /**
   * Get concluded redemptions for history.
   * Per API_CONTRACTS.md lines 5467-5483 (GET /api/rewards/history query)
   *
   * Returns redemptions WHERE status = 'concluded' with reward info
   * Sorted by concluded_at DESC
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getConcludedRedemptions(
    userId: string,
    clientId: string
  ): Promise<Array<{
    id: string;
    rewardId: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    rewardSource: string;
    claimedAt: string | null;
    concludedAt: string | null;
  }>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('redemptions')
      .select(`
        id,
        reward_id,
        claimed_at,
        concluded_at,
        rewards!inner (
          type,
          name,
          description,
          value_data,
          reward_source
        )
      `)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('status', 'concluded')
      .order('concluded_at', { ascending: false });

    if (error) {
      console.error('Error fetching concluded redemptions:', error);
      throw new Error('Failed to fetch concluded redemptions');
    }

    return (data || [])
      .filter(r => r.reward_id !== null) // Filter out any with null reward_id
      .map(r => {
        const reward = r.rewards as unknown as {
          type: string;
          name: string | null;
          description: string | null;
          value_data: Record<string, unknown> | null;
          reward_source: string;
        };

        return {
          id: r.id,
          rewardId: r.reward_id!, // Non-null assertion after filter
          type: reward.type,
          name: reward.name,
          description: reward.description,
          valueData: reward.value_data,
          rewardSource: reward.reward_source ?? 'mission',
          claimedAt: r.claimed_at,
          concludedAt: r.concluded_at,
        };
      });
  },

  /**
   * Get redemption count for history link.
   * Per API_CONTRACTS.md line 4085 (redemptionCount field)
   *
   * SECURITY: Validates client_id match (multitenancy)
   */
  async getRedemptionCount(
    userId: string,
    clientId: string
  ): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('status', 'concluded');

    if (error) {
      console.error('Error counting concluded redemptions:', error);
      throw new Error('Failed to count concluded redemptions');
    }

    return count || 0;
  },
};
