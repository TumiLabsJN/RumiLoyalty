/**
 * Redemption Repository
 *
 * Data access layer for redemptions table.
 * Per ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 *
 * Responsibilities:
 * - CRUD operations on redemptions
 * - Database queries (Supabase)
 * - Tenant isolation enforcement
 * - Data mapping (DB → domain objects)
 *
 * NOT Responsible For:
 * - Business logic
 * - Computing derived values
 * - Orchestrating multiple operations
 *
 * References:
 * - SchemaFinalv2.md lines 459-662 (redemptions table)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement)
 */

import { createClient } from '@/lib/supabase/server-client';

/**
 * Redemption history item returned by getHistory
 * Per API_CONTRACTS.md lines 5498-5508 (history array item)
 */
export interface RedemptionHistoryItem {
  id: string;
  rewardId: string;
  type: string;
  name: string | null;
  description: string | null;
  valueData: Record<string, unknown> | null;
  rewardSource: string;
  claimedAt: string | null;
  concludedAt: string | null;
}

export const redemptionRepository = {
  /**
   * Get concluded redemptions for user's reward history.
   * Per API_CONTRACTS.md lines 5467-5485 (GET /api/rewards/history backend query)
   *
   * Returns redemptions WHERE status='concluded' with reward info for formatting.
   * Includes value_data for service layer to generate formatted name/description.
   * NO pagination per API spec.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getHistory(
    userId: string,
    clientId: string
  ): Promise<RedemptionHistoryItem[]> {
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
      .is('deleted_at', null)
      .order('concluded_at', { ascending: false });

    if (error) {
      console.error('[RedemptionRepository] Error fetching history:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map to RedemptionHistoryItem
    return data.map((row) => {
      const reward = row.rewards as {
        type: string;
        name: string | null;
        description: string | null;
        value_data: Record<string, unknown> | null;
        reward_source: string;
      };

      return {
        id: row.id,
        rewardId: row.reward_id!,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        valueData: reward.value_data,
        rewardSource: reward.reward_source ?? 'mission',
        claimedAt: row.claimed_at,
        concludedAt: row.concluded_at,
      };
    });
  },
};
