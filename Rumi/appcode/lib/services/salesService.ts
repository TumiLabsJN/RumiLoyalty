/**
 * Sales Service
 *
 * Business logic for daily sales sync from CRUVA platform.
 * Handles CSV processing, video upserts, precomputed field updates,
 * mission progress tracking, and redemption creation.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
 * - Loyalty.md Flow 1 lines 425-610 (Daily Metrics Sync)
 * - SchemaFinalv2.md lines 227-251 (videos table)
 * - EXECUTION_PLAN.md Tasks 8.2.3, 8.2.3a, 8.2.3b, 8.2.3c
 */

import { syncRepository, type VideoUpsertData } from '@/lib/repositories/syncRepository';
import { downloadCruvaCSV, readCSVBuffer, cleanupCSV } from '@/lib/automation/cruvaDownloader';
import { parseCruvaCSV, type ParsedVideoRow, type ParseResult } from '@/lib/utils/csvParser';

// ============================================
// Types
// ============================================

export interface ProcessDailySalesResult {
  success: boolean;
  recordsProcessed: number;
  usersUpdated: number;
  newUsersCreated: number;
  missionsUpdated: number;
  redemptionsCreated: number;
  errors: string[];
}


// ============================================
// Main Functions (Task 8.2.3)
// ============================================

/**
 * Process daily sales data from CRUVA CSV
 *
 * 8-step workflow per Loyalty.md Flow 1 and EXECUTION_PLAN.md Task 8.2.3:
 * 1. Create sync log to track automation run
 * 2. Download CSV from CRUVA via Puppeteer
 * 3. Parse CSV using csvParser utility
 * 4. For each row: match user by tiktok_handle, auto-create if needed, upsert video
 * 5. Update user precomputed fields (Task 8.2.3a)
 * 6. Update mission progress for active missions
 * 7. Create redemptions for newly completed missions (Task 8.2.3c)
 * 8. Update sync log with final status
 *
 * Error handling per Phase8UpgradeIMPL.md Section 10:
 * - Download/parse failures: Return immediately, update sync_log status='failed'
 * - Per-row failures: Log error, skip row, continue
 * - Precomputed/mission failures: Log error, continue (non-fatal)
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @returns ProcessDailySalesResult with success/failure details
 */
export async function processDailySales(
  clientId: string
): Promise<ProcessDailySalesResult> {
  const errors: string[] = [];
  let syncLogId: string | null = null;
  let recordsProcessed = 0;
  let usersUpdated = 0;
  let newUsersCreated = 0;
  let missionsUpdated = 0;
  let redemptionsCreated = 0;
  const processedUserIds: string[] = [];

  try {
    // Step 1: Create sync log to track automation run
    console.log('[SalesService] Step 1: Creating sync log...');
    syncLogId = await syncRepository.createSyncLog(clientId, { source: 'auto' });

    // Step 2: Download CSV from CRUVA via Puppeteer
    console.log('[SalesService] Step 2: Downloading CSV from CRUVA...');
    const downloadResult = await downloadCruvaCSV();

    if (!downloadResult.success || !downloadResult.filePath) {
      const errorMsg = `CRUVA download failed: ${downloadResult.error ?? 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`[SalesService] ${errorMsg}`);
      await syncRepository.updateSyncLog(syncLogId, 'failed', 0, errorMsg);
      return {
        success: false,
        recordsProcessed: 0,
        usersUpdated: 0,
        newUsersCreated: 0,
        missionsUpdated: 0,
        redemptionsCreated: 0,
        errors,
      };
    }

    // Step 3: Parse CSV using csvParser utility
    console.log('[SalesService] Step 3: Parsing CSV...');
    const csvBuffer = readCSVBuffer(downloadResult.filePath);
    const parseResult = parseCruvaCSV(csvBuffer);

    // Clean up CSV file after reading
    cleanupCSV(downloadResult.filePath);

    if (!parseResult.success || parseResult.rows.length === 0) {
      const errorMsg = `CSV parse failed: ${parseResult.errors.join('; ') || 'No rows found'}`;
      errors.push(errorMsg);
      console.error(`[SalesService] ${errorMsg}`);
      await syncRepository.updateSyncLog(syncLogId, 'failed', 0, errorMsg);
      return {
        success: false,
        recordsProcessed: 0,
        usersUpdated: 0,
        newUsersCreated: 0,
        missionsUpdated: 0,
        redemptionsCreated: 0,
        errors,
      };
    }

    console.log(`[SalesService] Parsed ${parseResult.rows.length} rows from CSV`);

    // Step 4: For each row - find/create user, upsert video
    console.log('[SalesService] Step 4: Processing video rows...');
    for (let i = 0; i < parseResult.rows.length; i++) {
      const row = parseResult.rows[i];
      const rowNum = i + 1;

      try {
        // Find user by TikTok handle
        let userData = await syncRepository.findUserByTiktokHandle(clientId, row.tiktok_handle);

        // Auto-create user if not found (per Loyalty.md Flow 2 lines 556-560)
        if (!userData) {
          console.log(`[SalesService] Auto-creating user for handle: ${row.tiktok_handle}`);
          const newUserId = await syncRepository.createUserFromCruva(
            clientId,
            row.tiktok_handle,
            row.post_date
          );
          userData = { id: newUserId, currentTier: 'tier_1' };
          newUsersCreated++;
        }

        // Track user for later updates
        if (!processedUserIds.includes(userData.id)) {
          processedUserIds.push(userData.id);
          usersUpdated++;
        }

        // Upsert video record
        const videoData: VideoUpsertData = {
          videoUrl: row.video_url,
          videoTitle: row.video_title,
          postDate: row.post_date,
          views: row.views,
          likes: row.likes,
          comments: row.comments,
          gmv: row.gmv,
          ctr: row.ctr,
          unitsSold: row.units_sold,
        };

        await syncRepository.upsertVideo(clientId, userData.id, videoData);
        recordsProcessed++;
      } catch (rowError) {
        // Per-row failures: Log error, skip row, continue
        const errorMsg = rowError instanceof Error ? rowError.message : String(rowError);
        errors.push(`Row ${rowNum}: ${errorMsg}`);
        console.error(`[SalesService] Row ${rowNum} failed: ${errorMsg}`);
      }
    }

    console.log(`[SalesService] Processed ${recordsProcessed}/${parseResult.rows.length} videos`);

    // Step 5: Update precomputed fields (Task 8.2.3a - currently stub)
    console.log('[SalesService] Step 5: Updating precomputed fields...');
    try {
      await syncRepository.updatePrecomputedFields(clientId, processedUserIds);
    } catch (precomputedError) {
      // Non-fatal: Log error, continue
      const errorMsg = precomputedError instanceof Error ? precomputedError.message : String(precomputedError);
      console.warn(`[SalesService] Precomputed fields update failed (non-fatal): ${errorMsg}`);
    }

    // Step 5b: Update leaderboard ranks (Task 8.2.3b - currently stub)
    console.log('[SalesService] Step 5b: Updating leaderboard ranks...');
    try {
      await syncRepository.updateLeaderboardRanks(clientId);
    } catch (leaderboardError) {
      // Non-fatal: Log error, continue
      const errorMsg = leaderboardError instanceof Error ? leaderboardError.message : String(leaderboardError);
      console.warn(`[SalesService] Leaderboard ranks update failed (non-fatal): ${errorMsg}`);
    }

    // Step 5.5: Create mission_progress rows for eligible users (GAP-MISSION-PROGRESS-ROWS)
    console.log('[SalesService] Step 5.5: Creating mission progress rows for eligible users...');
    let missionRowsCreated = 0;
    try {
      missionRowsCreated = await syncRepository.createMissionProgressForEligibleUsers(clientId);
      if (missionRowsCreated > 0) {
        console.log(`[SalesService] Created ${missionRowsCreated} mission progress rows`);
      }
    } catch (createError) {
      // Non-fatal: Log error, continue
      const errorMsg = createError instanceof Error ? createError.message : String(createError);
      console.warn(`[SalesService] Mission progress row creation failed (non-fatal): ${errorMsg}`);
    }

    // Step 6: Update mission progress
    console.log('[SalesService] Step 6: Updating mission progress...');
    try {
      missionsUpdated = await syncRepository.updateMissionProgress(clientId, processedUserIds);
    } catch (missionError) {
      // Non-fatal: Log error, continue
      const errorMsg = missionError instanceof Error ? missionError.message : String(missionError);
      console.warn(`[SalesService] Mission progress update failed (non-fatal): ${errorMsg}`);
    }

    // Step 7: Create redemptions for newly completed missions (Task 8.2.3c)
    // Delegates to helper function - SINGLE SOURCE OF TRUTH (TierAtClaimLookupFix.md)
    console.log('[SalesService] Step 7: Creating redemptions for completed missions...');
    try {
      redemptionsCreated = await createRedemptionsForCompletedMissions(clientId, errors);
    } catch (findMissionsError) {
      // Non-fatal: Log error, continue
      const errorMsg = findMissionsError instanceof Error ? findMissionsError.message : String(findMissionsError);
      console.warn(`[SalesService] Find completed missions failed (non-fatal): ${errorMsg}`);
    }

    // Step 8: Update sync log with final status
    console.log('[SalesService] Step 8: Updating sync log...');
    const finalStatus = errors.length > 0 ? 'failed' : 'success';
    await syncRepository.updateSyncLog(
      syncLogId,
      finalStatus,
      recordsProcessed,
      errors.length > 0 ? errors.join('; ') : undefined
    );

    console.log(`[SalesService] Daily sales sync complete: ${recordsProcessed} records, ${errors.length} errors`);

    return {
      success: errors.length === 0,
      recordsProcessed,
      usersUpdated,
      newUsersCreated,
      missionsUpdated,
      redemptionsCreated,
      errors,
    };
  } catch (unexpectedError) {
    // Unexpected top-level error
    const errorMsg = unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError);
    errors.push(`Unexpected error: ${errorMsg}`);
    console.error(`[SalesService] Unexpected error: ${errorMsg}`);

    // Update sync log if we have one
    if (syncLogId) {
      try {
        await syncRepository.updateSyncLog(syncLogId, 'failed', recordsProcessed, errorMsg);
      } catch (logError) {
        console.error('[SalesService] Failed to update sync log:', logError);
      }
    }

    return {
      success: false,
      recordsProcessed,
      usersUpdated,
      newUsersCreated,
      missionsUpdated,
      redemptionsCreated,
      errors,
    };
  }
}

/**
 * Process sales from manually uploaded CSV buffer
 *
 * Same workflow as processDailySales but skips Puppeteer download.
 * Used by admin manual upload feature (Task 8.4.1).
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @param csvBuffer - CSV file buffer from manual upload
 * @param triggeredBy - Admin user ID who triggered upload
 * @returns ProcessDailySalesResult with success/failure details
 */
export async function processManualUpload(
  clientId: string,
  csvBuffer: Buffer,
  triggeredBy: string
): Promise<ProcessDailySalesResult> {
  // TODO: Implement in Task 8.4.1
  throw new Error('Not implemented - see Task 8.4.1');
}

// ============================================
// Helper Functions (Tasks 8.2.3a, 8.2.3b, 8.2.3c)
// ============================================

/**
 * Update all 16 precomputed fields on users table
 *
 * Delegates to syncRepository.updatePrecomputedFields (Task 8.2.3a)
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @param userIds - Array of user IDs to update (or all users if empty)
 */
export async function updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<void> {
  await syncRepository.updatePrecomputedFields(clientId, userIds);
}

/**
 * Calculate and update leaderboard ranks for all users
 *
 * Delegates to syncRepository.updateLeaderboardRanks (Task 8.2.3b)
 *
 * @param clientId - Client ID for multi-tenant isolation
 */
export async function updateLeaderboardRanks(
  clientId: string
): Promise<void> {
  await syncRepository.updateLeaderboardRanks(clientId);
}

/**
 * Create redemption records for missions that just completed
 * SINGLE SOURCE OF TRUTH for redemption creation (TierAtClaimLookupFix.md)
 *
 * Uses syncRepository.findNewlyCompletedMissions (which includes currentTier via JOIN)
 * + syncRepository.createRedemptionForCompletedMission
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @param errors - Optional array to collect error messages (for caller tracking)
 * @returns Number of redemptions created
 */
export async function createRedemptionsForCompletedMissions(
  clientId: string,
  errors?: string[]
): Promise<number> {
  let redemptionsCreated = 0;
  const completedMissions = await syncRepository.findNewlyCompletedMissions(clientId);

  for (const mission of completedMissions) {
    try {
      // Use mission.currentTier from findNewlyCompletedMissions JOIN (TierAtClaimLookupFix.md)
      await syncRepository.createRedemptionForCompletedMission(clientId, {
        userId: mission.userId,
        missionProgressId: mission.missionProgressId,
        rewardId: mission.rewardId,
        tierAtClaim: mission.currentTier,
      });
      redemptionsCreated++;
    } catch (redemptionError) {
      const errorMsg = redemptionError instanceof Error ? redemptionError.message : String(redemptionError);
      if (errors) {
        errors.push(`Redemption creation failed for mission ${mission.missionId}: ${errorMsg}`);
      }
      console.error(`[SalesService] Redemption creation failed: ${errorMsg}`);
    }
  }

  return redemptionsCreated;
}

