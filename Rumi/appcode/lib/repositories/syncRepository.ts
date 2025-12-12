/**
 * Sync Repository
 *
 * Data access layer for daily sync operations (CRUVA CSV processing).
 * Used by salesService for daily automation cron jobs.
 *
 * References:
 * - ARCHITECTURE.md Section 4 (Repository Layer, lines 534-612)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - Phase8UpgradeIMPL.md Section 1.1 (syncRepository functions)
 * - SchemaFinalv2.md (videos, users, sync_logs, mission_progress, redemptions tables)
 * - EXECUTION_PLAN.md Task 8.2.2a
 */

import { createAdminClient } from '@/lib/supabase/admin-client';
import type { Database } from '@/lib/types/database';

// ============================================
// Constants
// ============================================

/**
 * Sentinel value for password_hash on auto-created users (from CRUVA CSV).
 * These users have no credentials and must set up their account on first login.
 * This value is intentionally invalid as a bcrypt hash to prevent login.
 */
const CRUVA_AUTO_CREATED_NO_PASSWORD = 'CRUVA_AUTO_CREATED_NO_PASSWORD_SET';

// ============================================
// Types (per Phase8UpgradeIMPL.md Section 11)
// ============================================

/**
 * Input type for video upsert (maps from ParsedVideoRow)
 */
export interface VideoUpsertData {
  videoUrl: string;
  videoTitle: string;
  postDate: string;
  views: number;
  likes: number;
  comments: number;
  gmv: number;
  ctr: number;
  unitsSold: number;
}

/**
 * Bulk upsert input
 */
export interface BulkVideoUpsert {
  userId: string;
  videoData: VideoUpsertData;
}

/**
 * User lookup result (minimal for sync)
 */
export interface SyncUserData {
  id: string;
  currentTier: string;
}

/**
 * Newly completed mission result
 * Per TierAtClaimLookupFix.md - includes currentTier from users JOIN
 */
export interface CompletedMissionData {
  missionProgressId: string;
  userId: string;
  missionId: string;
  rewardId: string;
  currentTier: string;  // From users table JOIN - for tier_at_claim
}

/**
 * Sync log creation input
 */
export interface SyncLogInput {
  source: 'auto' | 'manual';
  fileName?: string;
  triggeredBy?: string;
}

// ============================================
// Repository Implementation
// ============================================

export const syncRepository = {
  // ========== Video Operations ==========

  /**
   * Upsert video record using video_url as unique key
   * Per SchemaFinalv2.md lines 227-251
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userId - User ID who posted the video
   * @param videoData - Video data from CSV
   * @returns Video ID
   */
  async upsertVideo(
    clientId: string,
    userId: string,
    videoData: VideoUpsertData
  ): Promise<string> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('videos')
      .upsert(
        {
          client_id: clientId,
          user_id: userId,
          video_url: videoData.videoUrl,
          video_title: videoData.videoTitle,
          post_date: videoData.postDate,
          views: videoData.views,
          likes: videoData.likes,
          comments: videoData.comments,
          gmv: videoData.gmv,
          ctr: videoData.ctr,
          units_sold: videoData.unitsSold,
          sync_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'video_url',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to upsert video: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Bulk upsert videos for efficiency
   * Per SchemaFinalv2.md lines 227-251
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param videos - Array of user/video pairs
   * @returns Count of inserted and updated records
   */
  async bulkUpsertVideos(
    clientId: string,
    videos: BulkVideoUpsert[]
  ): Promise<{ inserted: number; updated: number }> {
    const supabase = createAdminClient();

    const records = videos.map(({ userId, videoData }) => ({
      client_id: clientId,
      user_id: userId,
      video_url: videoData.videoUrl,
      video_title: videoData.videoTitle,
      post_date: videoData.postDate,
      views: videoData.views,
      likes: videoData.likes,
      comments: videoData.comments,
      gmv: videoData.gmv,
      ctr: videoData.ctr,
      units_sold: videoData.unitsSold,
      sync_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('videos')
      .upsert(records, {
        onConflict: 'video_url',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      throw new Error(`Failed to bulk upsert videos: ${error.message}`);
    }

    // Note: Supabase upsert doesn't distinguish inserted vs updated
    // Return total count as "inserted" for simplicity
    return {
      inserted: data?.length ?? 0,
      updated: 0,
    };
  },

  // ========== User Lookup ==========

  /**
   * Find user by TikTok handle
   * Following userRepository.findByHandle pattern but simplified for sync
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param handle - TikTok handle (with or without @)
   * @returns User data or null if not found
   */
  async findUserByTiktokHandle(
    clientId: string,
    handle: string
  ): Promise<SyncUserData | null> {
    const supabase = createAdminClient();

    // Normalize handle (remove @ if present)
    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    const { data, error } = await supabase
      .from('users')
      .select('id, current_tier')
      .eq('client_id', clientId)
      .eq('tiktok_handle', normalizedHandle)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find user by handle: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      currentTier: data.current_tier ?? 'tier_1',
    };
  },

  /**
   * Create user from CRUVA CSV data (auto-registration)
   * Per Loyalty.md Flow 2 lines 556-560
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param tiktokHandle - TikTok handle from CSV
   * @param firstVideoDate - Earliest post_date for this user
   * @returns User ID
   */
  async createUserFromCruva(
    clientId: string,
    tiktokHandle: string,
    firstVideoDate: string
  ): Promise<string> {
    const supabase = createAdminClient();

    // Normalize handle (remove @ if present)
    const normalizedHandle = tiktokHandle.startsWith('@')
      ? tiktokHandle.slice(1)
      : tiktokHandle;

    const { data, error } = await supabase
      .from('users')
      .insert({
        client_id: clientId,
        tiktok_handle: normalizedHandle,
        email: null, // Auto-created users have no email
        password_hash: CRUVA_AUTO_CREATED_NO_PASSWORD, // Placeholder - user must set password on first login
        current_tier: 'tier_1', // Start at lowest tier
        first_video_date: firstVideoDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create user from CRUVA: ${error.message}`);
    }

    return data.id;
  },

  // ========== Precomputed Fields ==========

  /**
   * Update precomputed fields for users via RPC bulk operation
   * Per RPCMigrationFix.md - O(1) performance instead of O(N)
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - Optional user IDs to update (null = all users)
   * @returns Count of users updated
   */
  async updatePrecomputedFields(
    clientId: string,
    userIds?: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Type assertion: RPC function added in 20251211_add_phase8_rpc_functions.sql
    // Regenerate types after migration: supabase gen types typescript
    const { data, error } = await (supabase.rpc as Function)(
      'update_precomputed_fields',
      {
        p_client_id: clientId,
        p_user_ids: userIds ?? null,
      }
    );

    if (error) {
      throw new Error(`Failed to update precomputed fields: ${error.message}`);
    }

    return (data as number) ?? 0;
  },

  /**
   * Update leaderboard ranks via RPC bulk operation
   * Per RPCMigrationFix.md - Uses ROW_NUMBER() with vip_metric awareness
   *
   * @param clientId - Client ID for multi-tenant isolation
   */
  async updateLeaderboardRanks(clientId: string): Promise<void> {
    const supabase = createAdminClient();

    // Type assertion: RPC function added in 20251211_add_phase8_rpc_functions.sql
    // Regenerate types after migration: supabase gen types typescript
    const { error } = await (supabase.rpc as Function)('update_leaderboard_ranks', {
      p_client_id: clientId,
    });

    if (error) {
      throw new Error(`Failed to update leaderboard ranks: ${error.message}`);
    }
  },

  // ========== Mission Progress ==========

  /**
   * Update mission progress for users based on current metrics
   * Per Loyalty.md lines 466-533
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - User IDs to update progress for
   * @returns Count of progress records updated
   */
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Per Codex audit: empty/null userIds means "update all users for this client"
    // RPC handles this internally with conditional logic
    // Type assertion: RPC function added in 20251212_add_update_mission_progress_rpc.sql
    // Regenerate types after migration: supabase gen types typescript
    const { data, error } = await (supabase.rpc as Function)(
      'update_mission_progress',
      {
        p_client_id: clientId,
        p_user_ids: userIds.length > 0 ? userIds : null,  // null = all users
      }
    );

    if (error) {
      throw new Error(`Failed to update mission progress: ${error.message}`);
    }

    return (data as number) ?? 0;
  },

  /**
   * Find missions where status just changed to 'completed'
   * (current_value >= target_value AND status was 'in_progress' AND no existing redemption)
   * Per TierAtClaimLookupFix.md - JOINs users table to get current_tier
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @returns Array of completed mission data including currentTier
   */
  async findNewlyCompletedMissions(
    clientId: string
  ): Promise<CompletedMissionData[]> {
    const supabase = createAdminClient();

    // Find mission_progress records where:
    // 1. status = 'completed' (just transitioned)
    // 2. No existing redemption for this mission_progress
    // JOIN users to get current_tier for tier_at_claim (TierAtClaimLookupFix.md)
    const { data, error } = await supabase
      .from('mission_progress')
      .select(`
        id,
        user_id,
        mission_id,
        missions!inner (
          reward_id
        ),
        users!inner (
          current_tier
        )
      `)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .is('completed_at', null)
      .eq('users.client_id', clientId); // AUDIT FIX: Multi-tenant filter on joined users table

    if (error) {
      throw new Error(`Failed to find newly completed missions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter out missions that already have redemptions
    const missionProgressIds = data.map((mp) => mp.id);

    const { data: existingRedemptions, error: redemptionError } = await supabase
      .from('redemptions')
      .select('mission_progress_id')
      .eq('client_id', clientId)
      .in('mission_progress_id', missionProgressIds);

    if (redemptionError) {
      throw new Error(`Failed to check existing redemptions: ${redemptionError.message}`);
    }

    const existingIds = new Set(
      existingRedemptions?.map((r) => r.mission_progress_id) ?? []
    );

    return data
      .filter((mp) => !existingIds.has(mp.id) && mp.user_id && mp.mission_id)
      .map((mp) => ({
        missionProgressId: mp.id,
        userId: mp.user_id as string,
        missionId: mp.mission_id as string,
        rewardId: (mp.missions as { reward_id: string }).reward_id,
        currentTier: (mp.users as { current_tier: string | null }).current_tier ?? 'tier_1',
      }));
  },

  // ========== Redemption Creation ==========

  /**
   * Create redemption record for completed mission
   * Per Loyalty.md lines 338-355
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param data - Redemption data
   * @returns Redemption ID
   */
  async createRedemptionForCompletedMission(
    clientId: string,
    data: {
      userId: string;
      missionProgressId: string;
      rewardId: string;
      tierAtClaim: string;
    }
  ): Promise<string> {
    const supabase = createAdminClient();

    // Get reward's redemption_type
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('redemption_type')
      .eq('id', data.rewardId)
      .eq('client_id', clientId)
      .single();

    if (rewardError || !reward) {
      throw new Error(`Failed to get reward: ${rewardError?.message ?? 'Not found'}`);
    }

    const { data: redemption, error } = await supabase
      .from('redemptions')
      .insert({
        client_id: clientId,
        user_id: data.userId,
        reward_id: data.rewardId,
        mission_progress_id: data.missionProgressId,
        status: 'claimable',
        tier_at_claim: data.tierAtClaim,
        redemption_type: reward.redemption_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create redemption: ${error.message}`);
    }

    // Mark mission_progress as processed
    await supabase
      .from('mission_progress')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.missionProgressId)
      .eq('client_id', clientId);

    return redemption.id;
  },

  // ========== Sync Logs ==========

  /**
   * Create sync log entry when automation starts
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param input - Sync log input data
   * @returns Sync log ID
   */
  async createSyncLog(clientId: string, input: SyncLogInput): Promise<string> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        client_id: clientId,
        status: 'running',
        source: input.source,
        file_name: input.fileName,
        triggered_by: input.triggeredBy,
        started_at: new Date().toISOString(),
        records_processed: 0,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data.id;
  },

  /**
   * Update sync log with completion status
   *
   * @param syncLogId - Sync log ID to update
   * @param status - Final status
   * @param recordsProcessed - Number of records processed
   * @param errorMessage - Error message if failed
   */
  async updateSyncLog(
    syncLogId: string,
    status: 'success' | 'failed',
    recordsProcessed: number,
    errorMessage?: string
  ): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('sync_logs')
      .update({
        status,
        records_processed: recordsProcessed,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);

    if (error) {
      throw new Error(`Failed to update sync log: ${error.message}`);
    }
  },

  // ========== Sales Adjustments ==========

  /**
   * Apply pending sales adjustments via RPC bulk operation
   * Per RPCMigrationFix.md - Atomic application of all pending adjustments
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @returns Count of adjustments applied
   */
  async applyPendingSalesAdjustments(clientId: string): Promise<number> {
    const supabase = createAdminClient();

    // Type assertion: RPC function added in 20251211_add_phase8_rpc_functions.sql
    // Regenerate types after migration: supabase gen types typescript
    const { data, error } = await (supabase.rpc as Function)(
      'apply_pending_sales_adjustments',
      {
        p_client_id: clientId,
      }
    );

    if (error) {
      throw new Error(`Failed to apply sales adjustments: ${error.message}`);
    }

    return (data as number) ?? 0;
  },
};
