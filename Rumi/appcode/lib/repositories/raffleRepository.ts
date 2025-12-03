/**
 * Raffle Repository
 *
 * Data access layer for raffle participation and winner management.
 * Enforces multi-tenant isolation via client_id filtering.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - API_CONTRACTS.md lines 3782-3824 (POST /api/missions/:id/participate)
 * - SchemaFinalv2.md lines 892-957 (raffle_participations table)
 */

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type MissionRow = Database['public']['Tables']['missions']['Row'];
type MissionProgressRow = Database['public']['Tables']['mission_progress']['Row'];
type RedemptionRow = Database['public']['Tables']['redemptions']['Row'];
type RaffleParticipationRow = Database['public']['Tables']['raffle_participations']['Row'];

/**
 * Raffle participation result
 */
export interface ParticipationResult {
  success: boolean;
  participationId?: string;
  redemptionId?: string;
  error?: string;
}

/**
 * Raffle mission data for response
 */
export interface RaffleMissionInfo {
  missionId: string;
  drawDate: string | null;
  prizeName: string | null;
  prizeType: string;
}

export const raffleRepository = {
  /**
   * Participate in a raffle mission.
   * Creates mission_progress, redemption, and raffle_participation records.
   *
   * Per API_CONTRACTS.md lines 3814-3823:
   * 1. Verify mission.mission_type='raffle'
   * 2. Check mission.activated=true
   * 3. Verify user hasn't already participated
   * 4. Verify tier eligibility
   * 5. Update mission_progress.status from 'active' → 'completed'
   * 6. Create redemptions row (status='claimable')
   * 7. Create raffle_participations row (is_winner=NULL)
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async participate(
    missionId: string,
    userId: string,
    clientId: string,
    currentTierId: string
  ): Promise<ParticipationResult> {
    const supabase = await createClient();

    // 1. Verify mission exists and is a raffle
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select(`
        id,
        mission_type,
        activated,
        tier_eligibility,
        raffle_end_date,
        reward_id,
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data
        )
      `)
      .eq('id', missionId)
      .eq('client_id', clientId)
      .eq('enabled', true)
      .single();

    if (missionError || !mission) {
      return {
        success: false,
        error: 'Mission not found',
      };
    }

    // 2. Verify it's a raffle type
    if (mission.mission_type !== 'raffle') {
      return {
        success: false,
        error: 'This mission is not a raffle',
      };
    }

    // 3. Verify raffle is activated
    if (!mission.activated) {
      return {
        success: false,
        error: 'This raffle is not currently accepting entries',
      };
    }

    // 4. Verify tier eligibility
    if (mission.tier_eligibility !== 'all' && mission.tier_eligibility !== currentTierId) {
      return {
        success: false,
        error: 'You are not eligible for this raffle',
      };
    }

    // 5. Check if user already participated
    const { data: existingParticipation } = await supabase
      .from('raffle_participations')
      .select('id')
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single();

    if (existingParticipation) {
      return {
        success: false,
        error: 'You have already entered this raffle',
      };
    }

    const now = new Date().toISOString();

    // 6. Check if mission_progress exists, create if not
    let { data: progress } = await supabase
      .from('mission_progress')
      .select('id, status')
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single();

    if (!progress) {
      // Create mission_progress for raffle (auto-completed on participation)
      const { data: newProgress, error: progressError } = await supabase
        .from('mission_progress')
        .insert({
          mission_id: missionId,
          user_id: userId,
          client_id: clientId,
          current_value: 0, // Raffles don't track progress
          status: 'completed',
          completed_at: now,
        })
        .select('id')
        .single();

      if (progressError || !newProgress) {
        console.error('[RaffleRepository] Error creating progress:', progressError);
        return {
          success: false,
          error: 'Failed to record participation',
        };
      }
      progress = { id: newProgress.id, status: 'completed' };
    } else if (progress.status !== 'completed') {
      // Update existing progress to completed
      await supabase
        .from('mission_progress')
        .update({
          status: 'completed',
          completed_at: now,
          updated_at: now,
        })
        .eq('id', progress.id);
    }

    // 7. Create redemption record (status='claimable' for raffle winner to claim later)
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        user_id: userId,
        reward_id: mission.reward_id,
        mission_progress_id: progress.id,
        client_id: clientId,
        status: 'claimable', // Winner will claim after draw
        tier_at_claim: currentTierId,
        redemption_type: 'instant', // Raffle prizes are typically instant after winning
      })
      .select('id')
      .single();

    if (redemptionError || !redemption) {
      console.error('[RaffleRepository] Error creating redemption:', redemptionError);
      return {
        success: false,
        error: 'Failed to create redemption record',
      };
    }

    // 8. Create raffle_participation record
    const { data: participation, error: participationError } = await supabase
      .from('raffle_participations')
      .insert({
        mission_id: missionId,
        user_id: userId,
        mission_progress_id: progress.id,
        redemption_id: redemption.id,
        client_id: clientId,
        participated_at: now,
        is_winner: null, // Will be set when winner is selected
      })
      .select('id')
      .single();

    if (participationError || !participation) {
      console.error('[RaffleRepository] Error creating participation:', participationError);
      // Rollback redemption
      await supabase.from('redemptions').delete().eq('id', redemption.id);
      return {
        success: false,
        error: 'Failed to record raffle entry',
      };
    }

    return {
      success: true,
      participationId: participation.id,
      redemptionId: redemption.id,
    };
  },

  /**
   * Get raffle mission info for response formatting.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async getRaffleMissionInfo(
    missionId: string,
    clientId: string
  ): Promise<RaffleMissionInfo | null> {
    const supabase = await createClient();

    const { data: mission, error } = await supabase
      .from('missions')
      .select(`
        id,
        raffle_end_date,
        rewards!inner (
          type,
          name,
          description,
          value_data
        )
      `)
      .eq('id', missionId)
      .eq('client_id', clientId)
      .single();

    if (error || !mission) {
      return null;
    }

    const reward = mission.rewards as unknown as {
      type: string;
      name: string | null;
      description: string | null;
      value_data: Record<string, unknown> | null;
    };

    // Generate prize name from reward
    let prizeName: string | null = null;
    if (reward.type === 'physical_gift' || reward.type === 'experience') {
      prizeName = (reward.value_data?.display_text as string) ?? reward.name ?? reward.description;
    } else if (reward.type === 'gift_card') {
      const amount = reward.value_data?.amount as number;
      prizeName = amount ? `$${amount} Gift Card` : 'Gift Card';
    } else {
      prizeName = reward.name ?? reward.description;
    }

    return {
      missionId: mission.id,
      drawDate: mission.raffle_end_date,
      prizeName,
      prizeType: reward.type,
    };
  },

  /**
   * Check if user has participated in a raffle.
   *
   * SECURITY: Filters by client_id (multitenancy)
   */
  async hasParticipated(
    missionId: string,
    userId: string,
    clientId: string
  ): Promise<boolean> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('raffle_participations')
      .select('id')
      .eq('mission_id', missionId)
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .single();

    return !!data;
  },
};
