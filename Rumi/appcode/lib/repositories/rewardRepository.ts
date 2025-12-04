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
import type { GetAvailableRewardsRow } from '@/lib/types/rpc';

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

/**
 * Shipping info for physical gifts
 * Per API_CONTRACTS.md lines 4865-4875
 */
export interface ShippingInfo {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

/**
 * Parameters for redeeming a VIP tier reward
 * Per API_CONTRACTS.md lines 4836-4988 (POST /api/rewards/:id/claim)
 */
export interface RedeemRewardParams {
  userId: string;
  rewardId: string;
  clientId: string;
  rewardType: string;
  tierAtClaim: string;
  redemptionType: 'instant' | 'scheduled';
  // For commission_boost and discount
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;
  // For commission_boost
  durationDays?: number;
  boostRate?: number;
  tierCommissionRate?: number;
  // For physical_gift
  shippingInfo?: ShippingInfo;
  sizeValue?: string;
  requiresSize?: boolean;
  sizeCategory?: string;
}

/**
 * Result of redeeming a VIP tier reward
 */
export interface RedeemRewardResult {
  redemptionId: string;
  status: string;
  claimedAt: string;
  boostSubStateId?: string;
  physicalGiftSubStateId?: string;
}

export const rewardRepository = {
  /**
   * Get all available rewards for user's current tier with active redemptions and sub-states.
   * Uses single RPC call per SingleQueryBS.md Section 4.1.
   *
   * Per API_CONTRACTS.md lines 4786-4797:
   * - Filter by client_id, enabled=true, reward_source='vip_tier'
   * - Include tier_eligibility matches OR preview_from_tier visibility
   * - LEFT JOIN redemptions WHERE mission_progress_id IS NULL (VIP tier only)
   * - LEFT JOIN commission_boost_redemptions for boost sub-state
   * - LEFT JOIN physical_gift_redemptions for shipping sub-state
   *
   * SECURITY: Validates client_id match via RPC parameter (multitenancy)
   */
  async listAvailable(
    userId: string,
    clientId: string,
    currentTier: string,
    currentTierOrder: number
  ): Promise<AvailableRewardData[]> {
    const supabase = await createClient();

    // Single RPC call replaces 4+ separate queries
    // Per SingleQueryBS.md Section 4.1 - get_available_rewards function
    const { data, error } = await supabase.rpc('get_available_rewards', {
      p_user_id: userId,
      p_client_id: clientId,
      p_current_tier: currentTier,
      p_current_tier_order: currentTierOrder,
    });

    if (error) {
      console.error('[RewardRepository] Error fetching available rewards:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map RPC rows to AvailableRewardData
    return (data as GetAvailableRewardsRow[]).map((row) => ({
      reward: {
        id: row.reward_id,
        type: row.reward_type,
        name: row.reward_name,
        description: row.reward_description,
        valueData: row.reward_value_data,
        tierEligibility: row.reward_tier_eligibility,
        previewFromTier: row.reward_preview_from_tier,
        redemptionFrequency: row.reward_redemption_frequency ?? 'unlimited',
        redemptionQuantity: row.reward_redemption_quantity,
        redemptionType: row.reward_redemption_type ?? 'instant',
        rewardSource: row.reward_source ?? 'vip_tier',
        displayOrder: row.reward_display_order,
        enabled: row.reward_enabled ?? false,
      },
      tier: {
        id: row.tier_id,
        name: row.tier_name,
        color: row.tier_color,
      },
      redemption: row.redemption_id
        ? {
            id: row.redemption_id,
            status: row.redemption_status ?? 'claimable',
            claimedAt: row.redemption_claimed_at,
            scheduledActivationDate: row.redemption_scheduled_activation_date,
            scheduledActivationTime: row.redemption_scheduled_activation_time,
            activationDate: row.redemption_activation_date,
            expirationDate: row.redemption_expiration_date,
          }
        : null,
      commissionBoost: row.boost_status
        ? {
            boostStatus: row.boost_status,
            activatedAt: row.boost_activated_at,
            expiresAt: row.boost_expires_at,
            salesAtExpiration: row.boost_sales_at_expiration
              ? Number(row.boost_sales_at_expiration)
              : null,
          }
        : null,
      physicalGift:
        row.physical_gift_requires_size !== null ||
        row.physical_gift_shipping_city !== null ||
        row.physical_gift_shipped_at !== null
          ? {
              shippingCity: row.physical_gift_shipping_city,
              shippedAt: row.physical_gift_shipped_at,
            }
          : null,
    }));
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
   * Get usage counts for multiple rewards in a single query.
   * Per API_CONTRACTS.md lines 4565-4582 (Usage Count Calculation)
   *
   * Batch version of getUsageCount() to avoid N+1 queries in listAvailableRewards.
   *
   * Counts WHERE:
   * - mission_progress_id IS NULL (VIP tier rewards only)
   * - tier_at_claim = currentTier (current tier only)
   * - status IN ('claimed', 'fulfilled', 'concluded')
   * - deleted_at IS NULL
   * - created_at >= tier_achieved_at (resets on tier change)
   *
   * SECURITY: Validates client_id match (multitenancy)
   *
   * @param userId - User ID
   * @param rewardIds - Array of reward IDs to count
   * @param clientId - Tenant ID for multi-tenant isolation
   * @param currentTier - User's current tier (e.g., 'tier_3')
   * @param tierAchievedAt - When user achieved current tier (for reset logic)
   * @returns Map of rewardId → usedCount
   */
  async getUsageCountBatch(
    userId: string,
    rewardIds: string[],
    clientId: string,
    currentTier: string,
    tierAchievedAt: string | null
  ): Promise<Map<string, number>> {
    // Return empty map if no reward IDs provided
    if (!rewardIds || rewardIds.length === 0) {
      return new Map();
    }

    const supabase = await createClient();

    // Build query for all redemptions matching the criteria
    let query = supabase
      .from('redemptions')
      .select('reward_id')
      .eq('user_id', userId)
      .eq('client_id', clientId) // Multi-tenant filter
      .in('reward_id', rewardIds)
      .is('mission_progress_id', null) // VIP tier rewards only
      .eq('tier_at_claim', currentTier) // Current tier only
      .in('status', ['claimed', 'fulfilled', 'concluded'])
      .is('deleted_at', null);

    // Only filter by tier_achieved_at if it exists (resets on tier change)
    if (tierAchievedAt) {
      query = query.gte('created_at', tierAchievedAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[RewardRepository] Error fetching usage counts:', error);
      // Return zeros rather than throwing - service can handle gracefully
      const emptyMap = new Map<string, number>();
      rewardIds.forEach((id) => emptyMap.set(id, 0));
      return emptyMap;
    }

    // Initialize all reward IDs with 0
    const countMap = new Map<string, number>();
    rewardIds.forEach((id) => countMap.set(id, 0));

    // Count occurrences of each reward_id
    data?.forEach((row) => {
      if (row.reward_id) {
        const currentCount = countMap.get(row.reward_id) || 0;
        countMap.set(row.reward_id, currentCount + 1);
      }
    });

    return countMap;
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
   * Redeem a VIP tier reward with sub-state creation.
   * Per API_CONTRACTS.md lines 4836-5001 (POST /api/rewards/:id/claim)
   * Per SchemaFinalv2.md lines 524-746 (commission_boost_redemptions)
   * Per SchemaFinalv2.md lines 678-888 (physical_gift_redemptions)
   *
   * Creates:
   * 1. Redemption record with status='claimed', tier_at_claim, mission_progress_id=NULL
   * 2. For commission_boost: commission_boost_redemptions with boost_status='scheduled'
   * 3. For physical_gift: physical_gift_redemptions with shipping info
   *
   * SECURITY: Validates client_id is provided (multitenancy)
   */
  async redeemReward(params: RedeemRewardParams): Promise<RedeemRewardResult> {
    const supabase = await createClient();
    const claimedAt = new Date().toISOString();

    // Step 1: Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        user_id: params.userId,
        reward_id: params.rewardId,
        client_id: params.clientId,
        tier_at_claim: params.tierAtClaim,
        redemption_type: params.redemptionType,
        status: 'claimed',
        claimed_at: claimedAt,
        scheduled_activation_date: params.scheduledActivationDate || null,
        scheduled_activation_time: params.scheduledActivationTime || null,
        mission_progress_id: null, // VIP tier rewards have no mission
      })
      .select('id, status, claimed_at')
      .single();

    if (redemptionError) {
      console.error('[RewardRepository] Error creating redemption:', redemptionError);
      throw new Error('Failed to create redemption');
    }

    const result: RedeemRewardResult = {
      redemptionId: redemption.id,
      status: redemption.status ?? 'claimed',
      claimedAt: redemption.claimed_at ?? claimedAt,
    };

    // Step 2: Create sub-state record based on reward type
    if (params.rewardType === 'commission_boost') {
      // VALIDATION: Ensure scheduled_activation_date is provided and not empty
      if (!params.scheduledActivationDate?.trim()) {
        console.error('[RewardRepository] scheduled_activation_date is required for commission_boost but was not provided or is empty');
        throw new Error('scheduled_activation_date is required for commission_boost rewards');
      }

      // Per SchemaFinalv2.md lines 688-715 (commission_boost_redemptions)
      // boost_status defaults to 'scheduled' per line 693
      const { data: boostState, error: boostError } = await supabase
        .from('commission_boost_redemptions')
        .insert({
          redemption_id: redemption.id,
          client_id: params.clientId,
          boost_status: 'scheduled',
          scheduled_activation_date: params.scheduledActivationDate,
          duration_days: params.durationDays ?? 30,
          boost_rate: params.boostRate ?? 0,
          tier_commission_rate: params.tierCommissionRate ?? null,
        })
        .select('id')
        .single();

      if (boostError) {
        console.error('[RewardRepository] Error creating boost sub-state:', boostError);
        // Rollback: delete the redemption we just created
        await supabase.from('redemptions').delete().eq('id', redemption.id);
        throw new Error('Failed to create commission boost sub-state');
      }

      result.boostSubStateId = boostState.id;
    } else if (params.rewardType === 'physical_gift' && params.shippingInfo) {
      // Per SchemaFinalv2.md lines 846-870 (physical_gift_redemptions)
      const { data: giftState, error: giftError } = await supabase
        .from('physical_gift_redemptions')
        .insert({
          redemption_id: redemption.id,
          client_id: params.clientId,
          requires_size: params.requiresSize ?? false,
          size_category: params.sizeCategory ?? null,
          size_value: params.sizeValue ?? null,
          size_submitted_at: params.sizeValue ? new Date().toISOString() : null,
          shipping_recipient_first_name: params.shippingInfo.firstName,
          shipping_recipient_last_name: params.shippingInfo.lastName,
          shipping_address_line1: params.shippingInfo.addressLine1,
          shipping_address_line2: params.shippingInfo.addressLine2 ?? null,
          shipping_city: params.shippingInfo.city,
          shipping_state: params.shippingInfo.state,
          shipping_postal_code: params.shippingInfo.postalCode,
          shipping_country: params.shippingInfo.country,
          shipping_phone: params.shippingInfo.phone,
          shipping_info_submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (giftError) {
        console.error('[RewardRepository] Error creating physical gift sub-state:', giftError);
        // Rollback: delete the redemption we just created
        await supabase.from('redemptions').delete().eq('id', redemption.id);
        throw new Error('Failed to create physical gift sub-state');
      }

      result.physicalGiftSubStateId = giftState.id;
    }

    return result;
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
