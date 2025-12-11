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
 */
export interface CompletedMissionData {
  missionProgressId: string;
  userId: string;
  missionId: string;
  rewardId: string;
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
   * Update 13 precomputed fields for users (Task 8.2.3a)
   * Per ARCHITECTURE.md Section 3.1 lines 176-207, Loyalty.md lines 439-464
   *
   * Fields updated by this function:
   * - total_sales, total_units (lifetime aggregates)
   * - checkpoint_sales_current, checkpoint_units_current (checkpoint period)
   * - checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments
   * - projected_tier_at_checkpoint (calculated from current progress vs thresholds)
   * - next_tier_name, next_tier_threshold, next_tier_threshold_units (from tiers table)
   * - checkpoint_progress_updated_at (NOW())
   *
   * NOT updated here (handled by other tasks):
   * - leaderboard_rank (Task 8.2.3b)
   * - manual_adjustments_total, manual_adjustments_units (Task 8.3.1a)
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - If provided, update only these users; otherwise update all
   * @returns Count of users updated
   */
  async updatePrecomputedFields(
    clientId: string,
    userIds?: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Step 1: Get client's vip_metric (sales or units mode)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('vip_metric')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Failed to get client: ${clientError?.message ?? 'Not found'}`);
    }

    const vipMetric = client.vip_metric as 'sales' | 'units';

    // Step 2: Get all tiers for this client (for projected_tier and next_tier calculations)
    const { data: tiers, error: tiersError } = await supabase
      .from('tiers')
      .select('tier_id, tier_name, tier_order, sales_threshold, units_threshold')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: true });

    if (tiersError) {
      throw new Error(`Failed to get tiers: ${tiersError.message}`);
    }

    // Step 3: Get users to update with their current tier info
    let usersQuery = supabase
      .from('users')
      .select('id, current_tier, tier_achieved_at')
      .eq('client_id', clientId);

    if (userIds && userIds.length > 0) {
      usersQuery = usersQuery.in('id', userIds);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return 0;
    }

    // Step 4: Aggregate video stats for each user
    // Using a single query with GROUP BY for efficiency
    const userIdList = users.map((u) => u.id);

    const { data: videoStats, error: videoError } = await supabase
      .from('videos')
      .select('user_id, gmv, units_sold, views, likes, comments, post_date')
      .eq('client_id', clientId)
      .in('user_id', userIdList);

    if (videoError) {
      throw new Error(`Failed to get video stats: ${videoError.message}`);
    }

    // Step 5: Calculate aggregates per user
    const userAggregates = new Map<string, {
      totalSales: number;
      totalUnits: number;
      checkpointSales: number;
      checkpointUnits: number;
      checkpointVideos: number;
      checkpointViews: number;
      checkpointLikes: number;
      checkpointComments: number;
    }>();

    // Initialize all users with zero values
    for (const user of users) {
      userAggregates.set(user.id, {
        totalSales: 0,
        totalUnits: 0,
        checkpointSales: 0,
        checkpointUnits: 0,
        checkpointVideos: 0,
        checkpointViews: 0,
        checkpointLikes: 0,
        checkpointComments: 0,
      });
    }

    // Aggregate video data
    for (const video of videoStats ?? []) {
      if (!video.user_id) continue;
      const agg = userAggregates.get(video.user_id);
      if (!agg) continue;

      const user = users.find((u) => u.id === video.user_id);
      const tierAchievedAt = user?.tier_achieved_at
        ? new Date(user.tier_achieved_at)
        : null;
      const postDate = new Date(video.post_date);

      // Lifetime totals
      agg.totalSales += video.gmv ?? 0;
      agg.totalUnits += video.units_sold ?? 0;

      // Checkpoint period (post_date >= tier_achieved_at)
      if (!tierAchievedAt || postDate >= tierAchievedAt) {
        agg.checkpointSales += video.gmv ?? 0;
        agg.checkpointUnits += video.units_sold ?? 0;
        agg.checkpointVideos += 1;
        agg.checkpointViews += video.views ?? 0;
        agg.checkpointLikes += video.likes ?? 0;
        agg.checkpointComments += video.comments ?? 0;
      }
    }

    // Step 6: Calculate projected_tier and next_tier for each user
    let updatedCount = 0;

    for (const user of users) {
      const agg = userAggregates.get(user.id);
      if (!agg) continue;

      // Find current tier info
      const currentTierInfo = tiers?.find((t) => t.tier_id === user.current_tier);
      const currentTierOrder = currentTierInfo?.tier_order ?? 1;

      // Calculate projected tier based on checkpoint progress
      const checkpointValue = vipMetric === 'sales' ? agg.checkpointSales : agg.checkpointUnits;
      let projectedTier = 'tier_1';

      if (tiers) {
        for (const tier of tiers) {
          const threshold = vipMetric === 'sales'
            ? (tier.sales_threshold ?? 0)
            : (tier.units_threshold ?? 0);

          if (checkpointValue >= threshold) {
            projectedTier = tier.tier_id;
          }
        }
      }

      // Find next tier (tier with order = current + 1)
      const nextTierInfo = tiers?.find((t) => t.tier_order === currentTierOrder + 1);

      // Step 7: Update user with all precomputed fields
      const { error: updateError } = await supabase
        .from('users')
        .update({
          total_sales: agg.totalSales,
          total_units: agg.totalUnits,
          checkpoint_sales_current: agg.checkpointSales,
          checkpoint_units_current: agg.checkpointUnits,
          checkpoint_videos_posted: agg.checkpointVideos,
          checkpoint_total_views: agg.checkpointViews,
          checkpoint_total_likes: agg.checkpointLikes,
          checkpoint_total_comments: agg.checkpointComments,
          projected_tier_at_checkpoint: projectedTier,
          next_tier_name: nextTierInfo?.tier_name ?? null,
          next_tier_threshold: nextTierInfo?.sales_threshold ?? null,
          next_tier_threshold_units: nextTierInfo?.units_threshold ?? null,
          checkpoint_progress_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('client_id', clientId);

      if (updateError) {
        console.error(`Failed to update user ${user.id}: ${updateError.message}`);
        continue;
      }

      updatedCount++;
    }

    return updatedCount;
  },

  /**
   * Calculate and update leaderboard ranks
   * Uses ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_sales DESC)
   *
   * @param clientId - Client ID for multi-tenant isolation
   */
  async updateLeaderboardRanks(clientId: string): Promise<void> {
    // TODO: Implement in Task 8.2.3b with ROW_NUMBER()
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3b');
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
    // TODO: Implement in Task 8.2.3 with mission-type-aware calculations
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3');
  },

  /**
   * Find missions where status just changed to 'completed'
   * (current_value >= target_value AND status was 'in_progress' AND no existing redemption)
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @returns Array of completed mission data
   */
  async findNewlyCompletedMissions(
    clientId: string
  ): Promise<CompletedMissionData[]> {
    const supabase = createAdminClient();

    // Find mission_progress records where:
    // 1. status = 'completed' (just transitioned)
    // 2. No existing redemption for this mission_progress
    const { data, error } = await supabase
      .from('mission_progress')
      .select(`
        id,
        user_id,
        mission_id,
        missions!inner (
          reward_id
        )
      `)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .is('completed_at', null); // Not yet processed

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
   * Apply pending sales adjustments to users
   * Per Loyalty.md lines 1458-1541 (Step 0 of tier calculation)
   *
   * 1. UPDATE users.total_sales += SUM(amount) WHERE applied_at IS NULL
   * 2. UPDATE users.manual_adjustments_total += same
   * 3. For units mode: same for units fields
   * 4. Mark adjustments as applied
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @returns Count of adjustments applied
   */
  async applyPendingSalesAdjustments(clientId: string): Promise<number> {
    // TODO: Implement in Task 8.3.1a with batch SQL
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.3.1a');
  },
};
