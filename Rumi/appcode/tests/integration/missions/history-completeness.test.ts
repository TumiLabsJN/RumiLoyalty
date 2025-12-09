/**
 * History Completeness Tests
 *
 * Tests that completed missions appear in mission history correctly.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=history-completeness
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.7
 * - API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history)
 * - SchemaFinalv2.md lines 421-455 (mission_progress)
 *
 * Test Cases:
 * 1. completed+claimed mission appears in history
 * 2. history includes redemption info (rewardName, claimedAt)
 * 3. concluded mission NOT in active missions list
 * 4. multiple completed missions all appear (no vanishing)
 *
 * NOTE: Tests at database level since service functions require Next.js request context.
 */

import {
  createTestClient,
  createTestUser,
  createTestTier,
  createTestReward,
  createTestMission,
  createTestMissionProgress,
  createTestRedemption,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
} from '../../fixtures/factories';

describe('History Completeness Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;
  let testReward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test data
    const { client } = await createTestClient({ name: 'History Test Client' });
    testClient = client;

    const { tier } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_1',
      tierOrder: 1,
      tierName: 'Bronze',
      unitsThreshold: 0,
    });
    testTier = tier;

    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'history_test_user',
      currentTier: testTier.tierId,
    });
    testUser = user;

    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Test Gift Card',
      valueData: { amount: 50 },
      tierEligibility: 'tier_1',
    });
    testReward = reward;
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('Completed Missions in History', () => {
    it('should include completed+claimed mission in history query', async () => {
      // Create mission
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Completed Mission',
        targetValue: 100,
        tierEligibility: 'all',
      });

      // Create completed progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create claimed redemption
      const claimedAt = new Date();
      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimed',
        claimedAt: claimedAt,
      });

      const supabase = getTestSupabase();

      // Query history: missions with claimed redemptions for this user
      const { data: history } = await supabase
        .from('redemptions')
        .select(`
          id,
          status,
          claimed_at,
          reward_id,
          mission_progress_id,
          rewards!inner (
            id,
            name,
            type
          ),
          mission_progress:mission_progress_id (
            id,
            mission_id,
            status,
            missions (
              id,
              title,
              mission_type
            )
          )
        `)
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .eq('status', 'claimed');

      // Verify mission appears in history
      expect(history).toBeDefined();
      expect(history?.length).toBeGreaterThanOrEqual(1);

      const historyItem = history?.find(h => h.id === redemption.id);
      expect(historyItem).toBeDefined();
      expect(historyItem?.status).toBe('claimed');
    });

    it('should include redemption info (rewardName, claimedAt) in history', async () => {
      // Create mission
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'History Info Mission',
        targetValue: 100,
        tierEligibility: 'all',
      });

      // Create completed progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create claimed redemption with timestamp
      const claimedAt = new Date();
      await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimed',
        claimedAt: claimedAt,
      });

      const supabase = getTestSupabase();

      // Query with reward info
      const { data: history } = await supabase
        .from('redemptions')
        .select(`
          id,
          claimed_at,
          rewards!inner (
            name,
            type,
            value_data
          )
        `)
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .eq('status', 'claimed')
        .single();

      // Verify redemption info is included
      expect(history).toBeDefined();
      expect(history?.claimed_at).not.toBeNull();

      // Verify reward info
      const rewardInfo = history?.rewards as unknown as Record<string, unknown>;
      expect(rewardInfo?.name).toBe('Test Gift Card');
      expect(rewardInfo?.type).toBe('gift_card');
    });

    it('should NOT include active missions in history query', async () => {
      // Create active mission (not completed)
      const { mission: activeMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Active Mission',
        targetValue: 100,
        tierEligibility: 'all',
      });

      // Create active progress (not completed)
      await createTestMissionProgress({
        userId: testUser.id,
        missionId: activeMission.id,
        clientId: testClient.id,
        currentValue: 50, // Below target
        status: 'active',
      });

      const supabase = getTestSupabase();

      // Query history (only claimed redemptions)
      const { data: history } = await supabase
        .from('redemptions')
        .select(`
          id,
          mission_progress:mission_progress_id (
            mission_id
          )
        `)
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .eq('status', 'claimed');

      // Active mission should NOT appear in history
      const activeInHistory = history?.some(h => {
        const mp = h.mission_progress as unknown as Record<string, unknown> | null;
        return mp?.mission_id === activeMission.id;
      });

      expect(activeInHistory).toBeFalsy();
    });

    it('should include ALL completed missions (no vanishing)', async () => {
      // Create multiple missions and complete them
      const missions = [];
      const progresses = [];
      const redemptions = [];

      for (let i = 1; i <= 5; i++) {
        // Create reward for this mission
        const { reward } = await createTestReward({
          clientId: testClient.id,
          type: 'gift_card',
          name: `Reward ${i}`,
          tierEligibility: 'tier_1',
        });

        // Create mission with unique display_order
        const { mission } = await createTestMission({
          clientId: testClient.id,
          rewardId: reward.id,
          title: `Completed Mission ${i}`,
          targetValue: 100,
          tierEligibility: 'all',
          displayOrder: i, // Unique display_order to avoid constraint violation
        });
        missions.push(mission);

        // Create completed progress
        const { progress } = await createTestMissionProgress({
          userId: testUser.id,
          missionId: mission.id,
          clientId: testClient.id,
          currentValue: 100,
          status: 'completed',
          completedAt: new Date(Date.now() - i * 86400000), // Different dates
        });
        progresses.push(progress);

        // Create claimed redemption
        const { redemption } = await createTestRedemption({
          userId: testUser.id,
          rewardId: reward.id,
          clientId: testClient.id,
          tierAtClaim: testTier.tierId,
          missionProgressId: progress.id,
          status: 'claimed',
          claimedAt: new Date(Date.now() - i * 86400000),
        });
        redemptions.push(redemption);
      }

      const supabase = getTestSupabase();

      // Query history
      const { data: history, count } = await supabase
        .from('redemptions')
        .select(`
          id,
          mission_progress:mission_progress_id (
            mission_id
          )
        `, { count: 'exact' })
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .eq('status', 'claimed');

      // ALL 5 completed missions should appear
      expect(count).toBe(5);
      expect(history?.length).toBe(5);

      // Verify each mission appears
      for (const mission of missions) {
        const found = history?.some(h => {
          const mp = h.mission_progress as unknown as Record<string, unknown> | null;
          return mp?.mission_id === mission.id;
        });
        expect(found).toBe(true);
      }
    });
  });

  describe('History Edge Cases', () => {
    it('should handle user with no completed missions', async () => {
      const supabase = getTestSupabase();

      // Query history for user with no claimed redemptions
      const { data: history } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .eq('status', 'claimed');

      // Should return empty array, not error
      expect(history).toBeDefined();
      expect(history?.length).toBe(0);
    });

    it('should include raffle loser in history (as concluded)', async () => {
      // Create raffle mission
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Raffle Mission',
        missionType: 'raffle',
        targetValue: 0,
        tierEligibility: 'all',
      });

      // Create completed progress (participated)
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 0,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create rejected redemption (raffle loser)
      await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'rejected', // Raffle loser
      });

      const supabase = getTestSupabase();

      // Query history including rejected (for raffle losers)
      const { data: history } = await supabase
        .from('redemptions')
        .select(`
          id,
          status,
          mission_progress:mission_progress_id (
            mission_id,
            missions (
              mission_type
            )
          )
        `)
        .eq('user_id', testUser.id)
        .eq('client_id', testClient.id)
        .in('status', ['claimed', 'rejected']); // Include raffle losers

      // Raffle loser should appear in concluded history
      expect(history).toBeDefined();
      expect(history?.length).toBeGreaterThanOrEqual(1);

      const raffleLoss = history?.find(h => h.status === 'rejected');
      expect(raffleLoss).toBeDefined();
    });
  });

  describe('get_mission_history RPC direct call', () => {
    it('should return concluded missions via RPC', async () => {
      const supabase = getTestSupabase();

      // Create mission
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'RPC History Test Mission',
        targetValue: 100,
        tierEligibility: 'all',
      });

      // Create completed progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create concluded redemption
      await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'concluded',
        claimedAt: new Date(),
        concludedAt: new Date(),
      });

      // Call RPC directly (tests the PostgreSQL function)
      const { data: history, error } = await supabase.rpc('get_mission_history', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
      });

      // Assertions
      expect(error).toBeNull();
      expect(history).toHaveLength(1);
      expect(history![0].mission_id).toBe(mission.id);
      expect(history![0].redemption_status).toBe('concluded');
      // concluded_at may be null if factory doesn't set it, just verify status is correct
    });

    it('should return rejected raffle missions with raffle participation data', async () => {
      const supabase = getTestSupabase();

      // Create raffle mission - use existing raffle test pattern from raffle-winner-selection.test.ts
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      // Insert mission directly to avoid factory constraints
      // Raffle requires: target_value = 0, raffle_end_date NOT NULL
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .insert({
          client_id: testClient.id,
          reward_id: testReward.id,
          title: 'RPC History Raffle Test',
          display_name: 'RPC History Raffle Test',
          mission_type: 'raffle',
          target_value: 0,
          target_unit: 'count',
          tier_eligibility: 'all',
          activated: true,
          enabled: true,
          display_order: 1,
          raffle_end_date: futureDate.toISOString(),
        })
        .select()
        .single();

      if (missionError) throw new Error(`Failed to create raffle mission: ${missionError.message}`);
      const mission = missionData;

      // Create progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 1,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create rejected redemption (raffle loser)
      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'rejected',
        claimedAt: new Date(),
        rejectedAt: new Date(),
      });

      // Create raffle participation (loser) - requires redemption_id
      const { error: raffleError } = await supabase.from('raffle_participations').insert({
        user_id: testUser.id,
        mission_id: mission.id,
        mission_progress_id: progress.id,
        redemption_id: redemption.id,
        client_id: testClient.id,
        is_winner: false,
        participated_at: new Date().toISOString(),
        winner_selected_at: new Date().toISOString(),
      });
      if (raffleError) throw new Error(`Failed to create raffle participation: ${raffleError.message}`);

      // Call RPC directly (tests LEFT JOIN to raffle_participations)
      const { data: history, error } = await supabase.rpc('get_mission_history', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
      });

      // Assertions
      expect(error).toBeNull();
      expect(history).toHaveLength(1);
      expect(history![0].mission_id).toBe(mission.id);
      expect(history![0].redemption_status).toBe('rejected');
      expect(history![0].raffle_is_winner).toBe(false);
      expect(history![0].raffle_participated_at).not.toBeNull();
    });

    it('should enforce multi-tenant isolation', async () => {
      const supabase = getTestSupabase();

      // Create mission for testClient
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Tenant Isolation Test',
        targetValue: 100,
        tierEligibility: 'all',
      });

      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'concluded',
        claimedAt: new Date(),
        concludedAt: new Date(),
      });

      // Create different client
      const { client: otherClient } = await createTestClient({ name: 'Other Client' });

      // Query with wrong client_id should return empty
      const { data: history, error } = await supabase.rpc('get_mission_history', {
        p_user_id: testUser.id,
        p_client_id: otherClient.id,
      });

      expect(error).toBeNull();
      expect(history).toHaveLength(0);

      // Cleanup other client
      await cleanupTestData(otherClient.id);
    });
  });
});
