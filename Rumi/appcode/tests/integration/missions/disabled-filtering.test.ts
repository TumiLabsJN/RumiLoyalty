/**
 * Disabled Mission Filtering Tests
 *
 * Tests that missions with activated=false are excluded from queries.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=disabled-filtering
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.9
 * - SchemaFinalv2.md lines 362-420 (missions table, activated column)
 * - missionRepository.ts (listAvailable WHERE clause)
 * - API_CONTRACTS.md lines 2951-3140 (GET /api/missions)
 *
 * Test Cases:
 * 1. Mission with activated=true appears in query results
 * 2. Mission with activated=false is excluded from query results
 * 3. Mixed activated states - only activated=true missions returned
 *
 * NOTE: Tests at database level since service functions require Next.js request context.
 */

import {
  createTestClient,
  createTestUser,
  createTestTier,
  createTestReward,
  createTestMission,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
} from '../../fixtures/factories';

describe('Disabled Mission Filtering Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;
  let testReward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Disabled Filtering Test Client' });
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

    // Create user
    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'disabled_filter_test_user',
      currentTier: testTier.tierId,
    });
    testUser = user;

    // Create reward
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

  describe('Activated Flag Filtering', () => {
    it('should return mission with activated=true in query results', async () => {
      // Create mission with activated=true (default)
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Activated Mission',
        targetValue: 100,
        tierEligibility: 'all',
        activated: true,
      });

      const supabase = getTestSupabase();

      // Query missions with same filter as missionRepository.listAvailable()
      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, activated')
        .eq('client_id', testClient.id)
        .eq('enabled', true);

      // Activated mission should appear
      expect(missions).toBeDefined();
      expect(missions?.length).toBeGreaterThanOrEqual(1);

      const foundMission = missions?.find(m => m.id === mission.id);
      expect(foundMission).toBeDefined();
      expect(foundMission?.activated).toBe(true);
    });

    it('should exclude mission with activated=false from raffle-available queries', async () => {
      // Create raffle mission with activated=false (not accepting entries)
      const { mission: deactivatedMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Deactivated Raffle',
        missionType: 'raffle',
        targetValue: 0,
        tierEligibility: 'all',
        activated: false, // Not accepting entries
      });

      const supabase = getTestSupabase();

      // Query for active raffles (same pattern as raffle participation check)
      const { data: activeRaffles } = await supabase
        .from('missions')
        .select('id, title, activated, mission_type')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .eq('mission_type', 'raffle')
        .eq('activated', true); // Only active raffles

      // Deactivated raffle should NOT appear in active raffles query
      const foundDeactivated = activeRaffles?.find(m => m.id === deactivatedMission.id);
      expect(foundDeactivated).toBeUndefined();
    });

    it('should return only activated missions when mixed states exist', async () => {
      // Create 2 activated missions
      const { mission: activated1 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Activated Mission 1',
        targetValue: 100,
        tierEligibility: 'all',
        activated: true,
        displayOrder: 1,
      });

      const { mission: activated2 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Activated Mission 2',
        targetValue: 200,
        tierEligibility: 'all',
        activated: true,
        displayOrder: 2,
      });

      // Create 2 deactivated missions
      const { mission: deactivated1 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Deactivated Mission 1',
        missionType: 'raffle',
        targetValue: 0,
        tierEligibility: 'all',
        activated: false,
        displayOrder: 3,
      });

      const { mission: deactivated2 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Deactivated Mission 2',
        missionType: 'raffle',
        targetValue: 0,
        tierEligibility: 'all',
        activated: false,
        displayOrder: 4,
      });

      const supabase = getTestSupabase();

      // Query all missions (no activated filter - to see all)
      const { data: allMissions } = await supabase
        .from('missions')
        .select('id, title, activated')
        .eq('client_id', testClient.id)
        .eq('enabled', true);

      // Should have all 4 missions
      expect(allMissions?.length).toBe(4);

      // Query only activated missions (production pattern for active raffles)
      const { data: activatedOnly } = await supabase
        .from('missions')
        .select('id, title, activated')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .eq('activated', true);

      // Should only have 2 activated missions
      expect(activatedOnly?.length).toBe(2);

      // Verify correct missions returned
      const activatedIds = activatedOnly?.map(m => m.id) || [];
      expect(activatedIds).toContain(activated1.id);
      expect(activatedIds).toContain(activated2.id);
      expect(activatedIds).not.toContain(deactivated1.id);
      expect(activatedIds).not.toContain(deactivated2.id);
    });

    it('should filter by enabled=true in addition to activated', async () => {
      // Create enabled + activated mission
      const { mission: enabledActivated } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Enabled and Activated',
        targetValue: 100,
        tierEligibility: 'all',
        activated: true,
        // enabled defaults to true in factory
      });

      const supabase = getTestSupabase();

      // Disable the mission directly
      await supabase
        .from('missions')
        .update({ enabled: false })
        .eq('id', enabledActivated.id);

      // Query with enabled=true filter (production pattern)
      const { data: enabledMissions } = await supabase
        .from('missions')
        .select('id, title, enabled, activated')
        .eq('client_id', testClient.id)
        .eq('enabled', true);

      // Disabled mission should NOT appear even if activated
      const foundDisabled = enabledMissions?.find(m => m.id === enabledActivated.id);
      expect(foundDisabled).toBeUndefined();
    });
  });

  describe('Multi-Tenant Isolation with Activated Filter', () => {
    it('should only return activated missions from correct client', async () => {
      // Create activated mission for test client
      const { mission: clientMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Client 1 Activated Mission',
        targetValue: 100,
        tierEligibility: 'all',
        activated: true,
      });

      // Create second client with activated mission
      const { client: client2 } = await createTestClient({ name: 'Other Client' });
      const { reward: reward2 } = await createTestReward({
        clientId: client2.id,
        type: 'gift_card',
      });
      const { mission: otherClientMission } = await createTestMission({
        clientId: client2.id,
        rewardId: reward2.id,
        title: 'Client 2 Activated Mission',
        targetValue: 100,
        tierEligibility: 'all',
        activated: true,
      });

      const supabase = getTestSupabase();

      // Query activated missions for first client only
      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, activated')
        .eq('client_id', testClient.id) // Multi-tenant filter
        .eq('enabled', true)
        .eq('activated', true);

      // Should only see first client's mission
      expect(missions?.length).toBe(1);
      expect(missions?.[0].id).toBe(clientMission.id);

      // Other client's mission should NOT appear
      const foundOther = missions?.find(m => m.id === otherClientMission.id);
      expect(foundOther).toBeUndefined();

      // Cleanup second client
      await cleanupTestData(client2.id);
    });
  });
});
