/**
 * Test Data Cleanup
 *
 * Cleanup functions for removing test data after integration tests.
 * Handles foreign key constraints by deleting in correct order.
 *
 * Usage:
 *   afterEach(async () => {
 *     await cleanupTestData(supabase, { clientIds: [testClientId] });
 *   });
 *
 * References:
 *   - EXECUTION_PLAN.md Task 8.4.3 (Test helper infrastructure)
 *   - SchemaFinalv2.md (foreign key relationships)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

export interface CleanupOptions {
  /** Client IDs to delete (cascades to all related data) */
  clientIds?: string[];
  /** User IDs to delete (if not using client cascade) */
  userIds?: string[];
  /** Video IDs to delete */
  videoIds?: string[];
  /** Mission IDs to delete */
  missionIds?: string[];
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Cleans up test data in correct order to respect foreign key constraints.
 *
 * Deletion order (leaf tables first):
 * 1. commission_boost_state_history (FK → commission_boost_redemptions)
 * 2. commission_boost_redemptions (FK → redemptions)
 * 3. redemptions (FK → users, rewards)
 * 4. mission_progress (FK → users, missions)
 * 5. raffle_participations (FK → users, missions)
 * 6. videos (FK → users)
 * 7. sales_adjustments (FK → users)
 * 8. tier_checkpoints (FK → users)
 * 9. otp_codes (FK → users)
 * 10. users (FK → clients, tiers)
 * 11. rewards (FK → clients, tiers)
 * 12. missions (FK → clients)
 * 13. tiers (FK → clients)
 * 14. sync_logs (FK → clients)
 * 15. clients (root table)
 */
export async function cleanupTestData(
  supabase: SupabaseClient<Database>,
  options: CleanupOptions
): Promise<void> {
  const { clientIds = [], userIds = [], videoIds = [], missionIds = [], verbose = false } = options;

  const log = (msg: string) => {
    if (verbose) console.log(`[cleanup] ${msg}`);
  };

  // If we have clientIds, delete everything under those clients
  if (clientIds.length > 0) {
    for (const clientId of clientIds) {
      log(`Cleaning up client: ${clientId}`);

      // Get all user IDs for this client
      const { data: clientUsers } = await supabase
        .from('users')
        .select('id')
        .eq('client_id', clientId);

      const clientUserIds = clientUsers?.map((u) => u.id) || [];

      if (clientUserIds.length > 0) {
        // Delete user-related data
        await cleanupUserData(supabase, clientUserIds, log);
      }

      // Delete rewards (FK → clients)
      const { error: rewardsError } = await supabase
        .from('rewards')
        .delete()
        .eq('client_id', clientId);
      if (rewardsError) log(`Error deleting rewards: ${rewardsError.message}`);
      else log(`Deleted rewards for client ${clientId}`);

      // Delete missions (FK → clients)
      const { error: missionsError } = await supabase
        .from('missions')
        .delete()
        .eq('client_id', clientId);
      if (missionsError) log(`Error deleting missions: ${missionsError.message}`);
      else log(`Deleted missions for client ${clientId}`);

      // Delete users (FK → clients)
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .eq('client_id', clientId);
      if (usersError) log(`Error deleting users: ${usersError.message}`);
      else log(`Deleted users for client ${clientId}`);

      // Delete tiers (FK → clients)
      const { error: tiersError } = await supabase
        .from('tiers')
        .delete()
        .eq('client_id', clientId);
      if (tiersError) log(`Error deleting tiers: ${tiersError.message}`);
      else log(`Deleted tiers for client ${clientId}`);

      // Delete sync_logs (FK → clients)
      const { error: syncLogsError } = await supabase
        .from('sync_logs')
        .delete()
        .eq('client_id', clientId);
      if (syncLogsError) log(`Error deleting sync_logs: ${syncLogsError.message}`);
      else log(`Deleted sync_logs for client ${clientId}`);

      // Delete client
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      if (clientError) log(`Error deleting client: ${clientError.message}`);
      else log(`Deleted client ${clientId}`);
    }
  }

  // Delete specific users if provided
  if (userIds.length > 0) {
    await cleanupUserData(supabase, userIds, log);

    const { error } = await supabase.from('users').delete().in('id', userIds);
    if (error) log(`Error deleting users: ${error.message}`);
    else log(`Deleted ${userIds.length} users`);
  }

  // Delete specific videos if provided
  if (videoIds.length > 0) {
    const { error } = await supabase.from('videos').delete().in('id', videoIds);
    if (error) log(`Error deleting videos: ${error.message}`);
    else log(`Deleted ${videoIds.length} videos`);
  }

  // Delete specific missions if provided
  if (missionIds.length > 0) {
    // First delete mission_progress for these missions
    const { error: mpError } = await supabase
      .from('mission_progress')
      .delete()
      .in('mission_id', missionIds);
    if (mpError) log(`Error deleting mission_progress: ${mpError.message}`);

    // Then delete missions
    const { error } = await supabase.from('missions').delete().in('id', missionIds);
    if (error) log(`Error deleting missions: ${error.message}`);
    else log(`Deleted ${missionIds.length} missions`);
  }
}

/**
 * Helper to clean up all data related to specific user IDs.
 */
async function cleanupUserData(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  log: (msg: string) => void
): Promise<void> {
  if (userIds.length === 0) return;

  // Get redemption IDs for commission_boost cleanup
  const { data: redemptions } = await supabase
    .from('redemptions')
    .select('id')
    .in('user_id', userIds);

  const redemptionIds = redemptions?.map((r) => r.id) || [];

  if (redemptionIds.length > 0) {
    // Get boost redemption IDs
    const { data: boostRedemptions } = await supabase
      .from('commission_boost_redemptions')
      .select('id')
      .in('redemption_id', redemptionIds);

    const boostIds = boostRedemptions?.map((b) => b.id) || [];

    if (boostIds.length > 0) {
      // Delete commission_boost_state_history
      const { error: historyError } = await supabase
        .from('commission_boost_state_history')
        .delete()
        .in('boost_redemption_id', boostIds);
      if (historyError) log(`Error deleting boost history: ${historyError.message}`);

      // Delete commission_boost_redemptions
      const { error: boostError } = await supabase
        .from('commission_boost_redemptions')
        .delete()
        .in('id', boostIds);
      if (boostError) log(`Error deleting boost redemptions: ${boostError.message}`);
    }

    // Delete redemptions
    const { error: redemptionsError } = await supabase
      .from('redemptions')
      .delete()
      .in('id', redemptionIds);
    if (redemptionsError) log(`Error deleting redemptions: ${redemptionsError.message}`);
  }

  // Delete mission_progress
  const { error: mpError } = await supabase
    .from('mission_progress')
    .delete()
    .in('user_id', userIds);
  if (mpError) log(`Error deleting mission_progress: ${mpError.message}`);

  // Delete raffle_participations
  const { error: raffleError } = await supabase
    .from('raffle_participations')
    .delete()
    .in('user_id', userIds);
  if (raffleError) log(`Error deleting raffle_participations: ${raffleError.message}`);

  // Delete videos
  const { error: videosError } = await supabase
    .from('videos')
    .delete()
    .in('user_id', userIds);
  if (videosError) log(`Error deleting videos: ${videosError.message}`);

  // Delete sales_adjustments
  const { error: adjustmentsError } = await supabase
    .from('sales_adjustments')
    .delete()
    .in('user_id', userIds);
  if (adjustmentsError) log(`Error deleting sales_adjustments: ${adjustmentsError.message}`);

  // Delete tier_checkpoints
  const { error: checkpointsError } = await supabase
    .from('tier_checkpoints')
    .delete()
    .in('user_id', userIds);
  if (checkpointsError) log(`Error deleting tier_checkpoints: ${checkpointsError.message}`);

  // Delete otp_codes
  const { error: otpError } = await supabase
    .from('otp_codes')
    .delete()
    .in('user_id', userIds);
  if (otpError) log(`Error deleting otp_codes: ${otpError.message}`);

  log(`Cleaned up data for ${userIds.length} users`);
}

/**
 * Deletes ALL data from the database.
 * USE WITH EXTREME CAUTION - only for local development.
 */
export async function cleanupAllTestData(
  supabase: SupabaseClient<Database>
): Promise<void> {
  console.warn('[cleanup] WARNING: Deleting ALL data from database');

  // Get all client IDs
  const { data: clients } = await supabase.from('clients').select('id');
  const clientIds = clients?.map((c) => c.id) || [];

  if (clientIds.length > 0) {
    await cleanupTestData(supabase, { clientIds, verbose: true });
  }

  console.log('[cleanup] All test data deleted');
}
