/**
 * In-Progress Rewards Visibility After Demotion Tests
 *
 * Tests that in-progress rewards/missions remain visible after tier demotion.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=inprogress-visibility
 *
 * References:
 * - BugFixes/InProgressRewardsVisibilityFix.md
 * - Bug ID: BUG-INPROGRESS-VISIBILITY
 * - supabase/migrations/20251212_fix_inprogress_rewards_visibility.sql
 *
 * Test Cases:
 * 1. VIP reward with active redemption visible after demotion
 * 2. Unclaimed VIP reward NOT visible after demotion
 * 3. Concluded VIP reward NOT visible after demotion
 * 4. Mission reward with active redemption visible after demotion
 *
 * NOTE: Tests call RPC functions directly to verify the fix.
 */

import {
  createTestClient,
  createTestUser,
  createTestTier,
  createTestReward,
  createTestRedemption,
  createTestMission,
  createTestMissionProgress,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
} from '../../fixtures/factories';

describe('In-Progress Rewards Visibility After Demotion', () => {
  let testClient: TestClient;
  let silverTier: TestTier;
  let goldTier: TestTier;
  let testUser: TestUser;
  let goldReward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Demotion Visibility Test Client' });
    testClient = client;

    // Create Silver tier (tier_2, order 2)
    const { tier: silver } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_2',
      tierOrder: 2,
      tierName: 'Silver',
      unitsThreshold: 100,
    });
    silverTier = silver;

    // Create Gold tier (tier_3, order 3)
    const { tier: gold } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_3',
      tierOrder: 3,
      tierName: 'Gold',
      unitsThreshold: 500,
    });
    goldTier = gold;

    // Create user at Silver tier (demoted from Gold)
    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'demotion_test_user',
      currentTier: silverTier.tierId, // User is now Silver
    });
    testUser = user;

    // Create VIP reward for Gold tier
    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Gold Gift Card',
      valueData: { amount: 100 },
      tierEligibility: 'tier_3', // Gold tier only
      rewardSource: 'vip_tier',
    });
    goldReward = reward;
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('VIP Rewards (get_available_rewards RPC)', () => {
    it('should show Gold tier reward if user has active redemption after demotion to Silver', async () => {
      // User claimed Gold reward while at Gold tier, then was demoted to Silver
      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: goldReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3', // Claimed while Gold
        status: 'claimed', // In progress
        redemptionType: 'instant',
        claimedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user (tier_2, order 2)
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2', // Silver
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Gold reward should be visible because user has active redemption
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeDefined();
      expect(foundGoldReward?.redemption_id).toBe(redemption.id);
      expect(foundGoldReward?.redemption_status).toBe('claimed');
    });

    it('should NOT show Gold tier reward if user has NO redemption after demotion', async () => {
      // User was demoted to Silver but never claimed the Gold reward
      // No redemption created

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2', // Silver
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Gold reward should NOT be visible (no redemption, wrong tier)
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeUndefined();
    });

    it('should NOT show Gold tier reward if redemption is concluded', async () => {
      // User claimed Gold reward, then it was concluded, then user was demoted
      await createTestRedemption({
        userId: testUser.id,
        rewardId: goldReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3',
        status: 'concluded', // Terminal state
        redemptionType: 'instant',
        claimedAt: new Date(),
        concludedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2',
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Gold reward should NOT be visible (concluded redemption excluded by JOIN)
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeUndefined();
    });

    it('should NOT show Gold tier reward if redemption is rejected', async () => {
      // User claimed Gold reward, then it was rejected
      await createTestRedemption({
        userId: testUser.id,
        rewardId: goldReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3',
        status: 'rejected', // Terminal state
        redemptionType: 'instant',
        claimedAt: new Date(),
        rejectedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2',
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();

      // Gold reward should NOT be visible (rejected redemption excluded by JOIN)
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeUndefined();
    });

    it('should show fulfilled reward (in-progress) after demotion', async () => {
      // User claimed Gold reward, admin fulfilled it (e.g., shipped), then user was demoted
      await createTestRedemption({
        userId: testUser.id,
        rewardId: goldReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3',
        status: 'fulfilled', // In progress (shipped but not concluded)
        redemptionType: 'instant',
        claimedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2',
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();

      // Gold reward should be visible (fulfilled is still in-progress)
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeDefined();
      expect(foundGoldReward?.redemption_status).toBe('fulfilled');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should NOT show rewards from other clients even with active redemption', async () => {
      // Create second client
      const { client: otherClient } = await createTestClient({ name: 'Other Client' });
      const { tier: otherTier } = await createTestTier({
        clientId: otherClient.id,
        tierId: 'tier_3',
        tierOrder: 3,
        tierName: 'Gold',
        unitsThreshold: 500,
      });

      // Create reward for other client
      const { reward: otherReward } = await createTestReward({
        clientId: otherClient.id,
        type: 'gift_card',
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      // Create user for other client with redemption
      const { user: otherUser } = await createTestUser({
        clientId: otherClient.id,
        tiktokHandle: 'other_client_user',
        currentTier: 'tier_2',
      });

      await createTestRedemption({
        userId: otherUser.id,
        rewardId: otherReward.id,
        clientId: otherClient.id,
        tierAtClaim: 'tier_3',
        status: 'claimed',
        claimedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC for FIRST client's user
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id, // First client
        p_current_tier: 'tier_2',
        p_current_tier_order: 2,
      });

      expect(error).toBeNull();

      // Other client's reward should NOT appear
      const foundOtherReward = data?.find((r: { reward_id: string }) => r.reward_id === otherReward.id);
      expect(foundOtherReward).toBeUndefined();

      // Cleanup other client
      await cleanupTestData(otherClient.id);
    });
  });

  describe('Disabled Rewards with Active Redemptions', () => {
    it('should show disabled reward if user has active redemption', async () => {
      // User claimed reward, then admin disabled the reward
      await createTestRedemption({
        userId: testUser.id,
        rewardId: goldReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3',
        status: 'claimed',
        claimedAt: new Date(),
      });

      // Disable the reward
      const supabase = getTestSupabase();
      await supabase
        .from('rewards')
        .update({ enabled: false })
        .eq('id', goldReward.id);

      // Call RPC - disabled reward should still show because of active redemption
      const { data, error } = await supabase.rpc('get_available_rewards', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_3', // Even at correct tier
        p_current_tier_order: 3,
      });

      expect(error).toBeNull();

      // Disabled reward with active redemption should be visible
      const foundGoldReward = data?.find((r: { reward_id: string }) => r.reward_id === goldReward.id);
      expect(foundGoldReward).toBeDefined();
      expect(foundGoldReward?.reward_enabled).toBe(false);
    });
  });
});

describe('In-Progress Mission Rewards Visibility After Demotion', () => {
  let testClient: TestClient;
  let silverTier: TestTier;
  let goldTier: TestTier;
  let testUser: TestUser;
  let goldMissionReward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Mission Demotion Test Client' });
    testClient = client;

    // Create tiers
    const { tier: silver } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_2',
      tierOrder: 2,
      tierName: 'Silver',
      unitsThreshold: 100,
    });
    silverTier = silver;

    const { tier: gold } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_3',
      tierOrder: 3,
      tierName: 'Gold',
      unitsThreshold: 500,
    });
    goldTier = gold;

    // Create user at Silver tier
    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'mission_demotion_test_user',
      currentTier: silverTier.tierId,
    });
    testUser = user;

    // Create reward for Gold tier mission
    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Gold Mission Reward',
      valueData: { amount: 50 },
      tierEligibility: 'tier_3',
      rewardSource: 'mission',
    });
    goldMissionReward = reward;
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('Missions (get_available_missions RPC)', () => {
    it('should show Gold tier mission if user has active redemption after demotion', async () => {
      // Create Gold tier mission
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: goldMissionReward.id,
        title: 'Gold Sales Mission',
        missionType: 'sales_dollars', // Valid mission type
        targetValue: 1000,
        tierEligibility: 'tier_3', // Gold only
      });

      // User completed mission while Gold, now demoted to Silver
      const { progress } = await createTestMissionProgress({
        missionId: mission.id,
        userId: testUser.id,
        clientId: testClient.id,
        status: 'completed',
        currentValue: 1000,
      });

      // Create redemption for the completed mission
      await createTestRedemption({
        userId: testUser.id,
        rewardId: goldMissionReward.id,
        clientId: testClient.id,
        tierAtClaim: 'tier_3',
        missionProgressId: progress.id,
        status: 'claimed', // In progress
        claimedAt: new Date(),
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_missions', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2', // Silver
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Gold mission should be visible because user has active redemption
      const foundMission = data?.find((m: { mission_id: string }) => m.mission_id === mission.id);
      expect(foundMission).toBeDefined();
      expect(foundMission?.redemption_status).toBe('claimed');
    });

    it('should NOT show Gold tier mission if user has no redemption after demotion', async () => {
      // Create Gold tier mission (user never completed it)
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: goldMissionReward.id,
        title: 'Gold Sales Mission',
        missionType: 'sales_dollars', // Valid mission type
        targetValue: 1000,
        tierEligibility: 'tier_3',
      });

      const supabase = getTestSupabase();

      // Call RPC as Silver tier user
      const { data, error } = await supabase.rpc('get_available_missions', {
        p_user_id: testUser.id,
        p_client_id: testClient.id,
        p_current_tier: 'tier_2',
      });

      expect(error).toBeNull();

      // Gold mission should NOT be visible (no redemption, wrong tier)
      const foundMission = data?.find((m: { mission_id: string }) => m.mission_id === mission.id);
      expect(foundMission).toBeUndefined();
    });
  });
});
