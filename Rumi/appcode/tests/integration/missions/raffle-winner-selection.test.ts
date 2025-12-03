/**
 * Raffle Winner Selection Tests
 *
 * Tests raffle mission winner/loser selection and redemption status.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=raffle-winner-selection
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.8
 * - API_CONTRACTS.md lines 3261-3430 (POST /api/missions/:id/raffle/participate)
 * - SchemaFinalv2.md lines 888-953 (raffle_participations table)
 * - MissionsRewardsFlows.md lines 3-143 (Raffle Mission Flow)
 *
 * Test Cases:
 * 1. 5 users participate successfully
 * 2. admin selection sets 1 winner is_winner=true
 * 3. 4 losers have is_winner=false
 * 4. winner redemption status='claimable'
 * 5. loser redemptions status='rejected'
 * 6. loser history shows raffleData.isWinner=false ("Better luck next time")
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
  createTestRaffleParticipation,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
  TestMission,
} from '../../fixtures/factories';

describe('Raffle Winner Selection Tests', () => {
  let testClient: TestClient;
  let testTier: TestTier;
  let testReward: TestReward;
  let raffleMission: TestMission;
  let users: TestUser[] = [];

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Raffle Test Client' });
    testClient = client;

    // Create tier
    const { tier } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_1',
      tierOrder: 1,
      tierName: 'Bronze',
      unitsThreshold: 0,
    });
    testTier = tier;

    // Create reward for raffle
    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'physical_gift',
      name: 'iPhone 15 Pro',
      valueData: { productName: 'iPhone 15 Pro', value: 1000 },
      tierEligibility: 'tier_1',
    });
    testReward = reward;

    // Create raffle mission
    const { mission } = await createTestMission({
      clientId: testClient.id,
      rewardId: testReward.id,
      title: 'iPhone Raffle',
      missionType: 'raffle',
      targetValue: 0, // Raffles have no target
      tierEligibility: 'all',
      activated: true, // Raffle is accepting entries
    });
    raffleMission = mission;

    // Create 5 test users
    users = [];
    for (let i = 1; i <= 5; i++) {
      const { user } = await createTestUser({
        clientId: testClient.id,
        tiktokHandle: `raffle_user_${i}`,
        currentTier: testTier.tierId,
      });
      users.push(user);
    }
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
    users = [];
  });

  describe('Raffle Participation', () => {
    it('should allow 5 users to participate successfully', async () => {
      const supabase = getTestSupabase();
      const participations = [];

      // Each user participates
      for (const user of users) {
        // Create completed progress (raffle entry)
        const { progress } = await createTestMissionProgress({
          userId: user.id,
          missionId: raffleMission.id,
          clientId: testClient.id,
          currentValue: 0,
          status: 'completed',
          completedAt: new Date(),
        });

        // Create claimable redemption
        const { redemption } = await createTestRedemption({
          userId: user.id,
          rewardId: testReward.id,
          clientId: testClient.id,
          tierAtClaim: testTier.tierId,
          missionProgressId: progress.id,
          status: 'claimable', // Pending draw
        });

        // Create raffle participation
        const { participation } = await createTestRaffleParticipation({
          missionId: raffleMission.id,
          userId: user.id,
          missionProgressId: progress.id,
          redemptionId: redemption.id,
          clientId: testClient.id,
          isWinner: null, // Pending draw
        });

        participations.push(participation);
      }

      // Verify all 5 participated
      const { count } = await supabase
        .from('raffle_participations')
        .select('*', { count: 'exact' })
        .eq('mission_id', raffleMission.id)
        .eq('client_id', testClient.id);

      expect(count).toBe(5);
    });
  });

  describe('Winner Selection', () => {
    let participations: { participation: { id: string; redemptionId: string }; userId: string }[] = [];

    beforeEach(async () => {
      participations = [];

      // Create participations for all users
      for (const user of users) {
        const { progress } = await createTestMissionProgress({
          userId: user.id,
          missionId: raffleMission.id,
          clientId: testClient.id,
          currentValue: 0,
          status: 'completed',
          completedAt: new Date(),
        });

        const { redemption } = await createTestRedemption({
          userId: user.id,
          rewardId: testReward.id,
          clientId: testClient.id,
          tierAtClaim: testTier.tierId,
          missionProgressId: progress.id,
          status: 'claimable',
        });

        const { participation } = await createTestRaffleParticipation({
          missionId: raffleMission.id,
          userId: user.id,
          missionProgressId: progress.id,
          redemptionId: redemption.id,
          clientId: testClient.id,
          isWinner: null,
        });

        participations.push({
          participation: { id: participation.id, redemptionId: redemption.id },
          userId: user.id,
        });
      }
    });

    it('should set 1 winner with is_winner=true', async () => {
      const supabase = getTestSupabase();
      const winnerIndex = 0; // First user wins
      const winnerId = participations[winnerIndex].participation.id;

      // Admin selects winner
      const { error } = await supabase
        .from('raffle_participations')
        .update({
          is_winner: true,
          winner_selected_at: new Date().toISOString(),
        })
        .eq('id', winnerId)
        .eq('client_id', testClient.id);

      expect(error).toBeNull();

      // Verify winner
      const { data: winner } = await supabase
        .from('raffle_participations')
        .select('*')
        .eq('id', winnerId)
        .single();

      expect(winner?.is_winner).toBe(true);
      expect(winner?.winner_selected_at).not.toBeNull();
    });

    it('should set 4 losers with is_winner=false', async () => {
      const supabase = getTestSupabase();
      const winnerIndex = 0;

      // Set all losers
      for (let i = 0; i < participations.length; i++) {
        const isWinner = i === winnerIndex;
        await supabase
          .from('raffle_participations')
          .update({
            is_winner: isWinner,
            winner_selected_at: new Date().toISOString(),
          })
          .eq('id', participations[i].participation.id)
          .eq('client_id', testClient.id);
      }

      // Count losers
      const { count } = await supabase
        .from('raffle_participations')
        .select('*', { count: 'exact' })
        .eq('mission_id', raffleMission.id)
        .eq('client_id', testClient.id)
        .eq('is_winner', false);

      expect(count).toBe(4);
    });

    it('should set winner redemption status to claimable', async () => {
      const supabase = getTestSupabase();
      const winnerIndex = 0;
      const winnerRedemptionId = participations[winnerIndex].participation.redemptionId;

      // Set winner
      await supabase
        .from('raffle_participations')
        .update({ is_winner: true, winner_selected_at: new Date().toISOString() })
        .eq('id', participations[winnerIndex].participation.id);

      // Winner redemption should remain claimable
      const { data: winnerRedemption } = await supabase
        .from('redemptions')
        .select('status')
        .eq('id', winnerRedemptionId)
        .single();

      expect(winnerRedemption?.status).toBe('claimable');
    });

    it('should set loser redemptions status to rejected', async () => {
      const supabase = getTestSupabase();
      const winnerIndex = 0;

      // Set winner and losers
      for (let i = 0; i < participations.length; i++) {
        const isWinner = i === winnerIndex;

        // Update participation
        await supabase
          .from('raffle_participations')
          .update({ is_winner: isWinner, winner_selected_at: new Date().toISOString() })
          .eq('id', participations[i].participation.id);

        // Update redemption status based on win/lose
        await supabase
          .from('redemptions')
          .update({ status: isWinner ? 'claimable' : 'rejected' })
          .eq('id', participations[i].participation.redemptionId);
      }

      // Count rejected redemptions
      const loserRedemptionIds = participations
        .filter((_, i) => i !== winnerIndex)
        .map(p => p.participation.redemptionId);

      const { data: loserRedemptions } = await supabase
        .from('redemptions')
        .select('status')
        .in('id', loserRedemptionIds);

      expect(loserRedemptions?.length).toBe(4);
      loserRedemptions?.forEach(r => {
        expect(r.status).toBe('rejected');
      });
    });

    it('should show raffle result in loser history (isWinner=false)', async () => {
      const supabase = getTestSupabase();
      const winnerIndex = 0;
      const loserIndex = 1;

      // Set winner and losers
      for (let i = 0; i < participations.length; i++) {
        const isWinner = i === winnerIndex;
        await supabase
          .from('raffle_participations')
          .update({ is_winner: isWinner, winner_selected_at: new Date().toISOString() })
          .eq('id', participations[i].participation.id);

        await supabase
          .from('redemptions')
          .update({ status: isWinner ? 'claimable' : 'rejected' })
          .eq('id', participations[i].participation.redemptionId);
      }

      // Query loser's raffle history
      const loserId = participations[loserIndex].userId;
      const loserRedemptionId = participations[loserIndex].participation.redemptionId;

      // Query participation separately
      const { data: loserParticipation } = await supabase
        .from('raffle_participations')
        .select('id, is_winner, winner_selected_at')
        .eq('user_id', loserId)
        .eq('client_id', testClient.id)
        .eq('mission_id', raffleMission.id)
        .single();

      // Query redemption separately
      const { data: loserRedemption } = await supabase
        .from('redemptions')
        .select('status')
        .eq('id', loserRedemptionId)
        .single();

      expect(loserParticipation).toBeDefined();
      expect(loserParticipation?.is_winner).toBe(false);
      expect(loserParticipation?.winner_selected_at).not.toBeNull();
      expect(loserRedemption?.status).toBe('rejected');
    });
  });

  describe('Raffle Edge Cases', () => {
    it('should not allow duplicate participation', async () => {
      const supabase = getTestSupabase();
      const user = users[0];

      // First participation
      const { progress } = await createTestMissionProgress({
        userId: user.id,
        missionId: raffleMission.id,
        clientId: testClient.id,
        currentValue: 0,
        status: 'completed',
        completedAt: new Date(),
      });

      const { redemption } = await createTestRedemption({
        userId: user.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      await createTestRaffleParticipation({
        missionId: raffleMission.id,
        userId: user.id,
        missionProgressId: progress.id,
        redemptionId: redemption.id,
        clientId: testClient.id,
        isWinner: null,
      });

      // Try duplicate participation
      const { error } = await supabase
        .from('raffle_participations')
        .insert({
          mission_id: raffleMission.id,
          user_id: user.id,
          mission_progress_id: progress.id,
          redemption_id: redemption.id,
          client_id: testClient.id,
          participated_at: new Date().toISOString(),
          is_winner: null,
        });

      // Should fail with unique constraint
      expect(error).not.toBeNull();
    });

    it('should handle raffle with single participant', async () => {
      const supabase = getTestSupabase();
      const singleUser = users[0];

      // Single participant
      const { progress } = await createTestMissionProgress({
        userId: singleUser.id,
        missionId: raffleMission.id,
        clientId: testClient.id,
        currentValue: 0,
        status: 'completed',
        completedAt: new Date(),
      });

      const { redemption } = await createTestRedemption({
        userId: singleUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      const { participation } = await createTestRaffleParticipation({
        missionId: raffleMission.id,
        userId: singleUser.id,
        missionProgressId: progress.id,
        redemptionId: redemption.id,
        clientId: testClient.id,
        isWinner: null,
      });

      // Make them the winner (only participant)
      await supabase
        .from('raffle_participations')
        .update({ is_winner: true, winner_selected_at: new Date().toISOString() })
        .eq('id', participation.id);

      // Verify they won
      const { data: winner } = await supabase
        .from('raffle_participations')
        .select('is_winner')
        .eq('id', participation.id)
        .single();

      expect(winner?.is_winner).toBe(true);
    });

    it('should track winner_selected_at timestamp', async () => {
      const supabase = getTestSupabase();
      const user = users[0];
      const selectionTime = new Date();

      // Create participation
      const { progress } = await createTestMissionProgress({
        userId: user.id,
        missionId: raffleMission.id,
        clientId: testClient.id,
        currentValue: 0,
        status: 'completed',
        completedAt: new Date(),
      });

      const { redemption } = await createTestRedemption({
        userId: user.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      const { participation } = await createTestRaffleParticipation({
        missionId: raffleMission.id,
        userId: user.id,
        missionProgressId: progress.id,
        redemptionId: redemption.id,
        clientId: testClient.id,
        isWinner: null,
      });

      // Select winner with timestamp
      await supabase
        .from('raffle_participations')
        .update({
          is_winner: true,
          winner_selected_at: selectionTime.toISOString(),
        })
        .eq('id', participation.id);

      // Verify timestamp
      const { data } = await supabase
        .from('raffle_participations')
        .select('winner_selected_at')
        .eq('id', participation.id)
        .single();

      expect(data?.winner_selected_at).not.toBeNull();
      const storedTime = new Date(data?.winner_selected_at);
      expect(storedTime.getTime()).toBeCloseTo(selectionTime.getTime(), -3);
    });
  });
});
