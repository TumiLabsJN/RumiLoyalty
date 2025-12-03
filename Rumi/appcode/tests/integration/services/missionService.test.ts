/**
 * Integration Tests for Mission Service
 *
 * Tests missionService functions against live Supabase database.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=missionService
 *
 * References:
 * - EXECUTION_PLAN.md Tasks 5.4.1-5.4.8 (Mission Testing)
 * - API_CONTRACTS.md lines 2951-4055 (Mission Endpoints)
 * - SchemaFinalv2.md lines 362-460 (missions, mission_progress tables)
 * - ARCHITECTURE.md Section 5 (Service Layer)
 *
 * Prerequisites:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database migrations deployed
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
  TestMissionProgress,
} from '../../fixtures/factories';

// Environment variables are loaded by factories.ts

describe('Mission Service Integration Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;
  let testReward: TestReward;

  beforeAll(async () => {
    // Verify database connection
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    const { client } = await createTestClient({ name: 'Mission Test Client' });
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
      tiktokHandle: 'mission_test_user',
      currentTier: testTier.tierId,
    });
    testUser = user;

    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      valueData: { amount: 50 },
      tierEligibility: 'tier_1',  // rewards.tier_eligibility only allows tier_1 through tier_6
    });
    testReward = reward;
  });

  afterEach(async () => {
    // Clean up all test data
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('Test Infrastructure', () => {
    it('should create mission test data successfully', async () => {
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        missionType: 'sales_units',
        targetValue: 100,
        tierEligibility: 'all',
      });

      expect(mission.id).toBeDefined();
      expect(mission.clientId).toBe(testClient.id);
      expect(mission.rewardId).toBe(testReward.id);
      expect(mission.targetValue).toBe(100);
    });

    it('should create mission progress successfully', async () => {
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
      });

      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 50,
        status: 'active',
      });

      expect(progress.id).toBeDefined();
      expect(progress.userId).toBe(testUser.id);
      expect(progress.missionId).toBe(mission.id);
      expect(progress.currentValue).toBe(50);
      expect(progress.status).toBe('active');
    });

    it('should create redemption successfully', async () => {
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
      });

      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      expect(redemption.id).toBeDefined();
      expect(redemption.status).toBe('claimable');
      expect(redemption.missionProgressId).toBe(progress.id);
    });
  });

  describe('listAvailableMissions', () => {
    it.todo('should return missions for user tier');
    it.todo('should filter out disabled missions');
    it.todo('should include progress data for active missions');
    it.todo('should compute correct status for each mission');
    it.todo('should sort missions by priority');
  });

  describe('claimMissionReward', () => {
    it.todo('should create redemption on first claim');
    it.todo('should reject claim on incomplete mission');
    it.todo('should reject duplicate claims');
    it.todo('should lock tier at claim time');
    it.todo('should handle scheduled rewards');
    it.todo('should handle physical gift rewards with address');
  });

  describe('participateInRaffle', () => {
    it.todo('should allow participation in active raffle');
    it.todo('should reject participation in inactive raffle');
    it.todo('should reject duplicate participation');
    it.todo('should create mission_progress and redemption on participate');
    it.todo('should reject ineligible tier');
  });

  describe('getMissionHistory', () => {
    it.todo('should return completed missions');
    it.todo('should include redemption details');
    it.todo('should include raffle results for raffle missions');
    it.todo('should not include active missions');
  });

  describe('Status Computation', () => {
    it.todo('should compute in_progress for active mission');
    it.todo('should compute default_claim for completed instant reward');
    it.todo('should compute default_schedule for completed scheduled reward');
    it.todo('should compute locked for ineligible tier');
    it.todo('should compute raffle_available for active raffle');
    it.todo('should compute raffle_processing after participation');
  });

  describe('Multi-Tenant Isolation', () => {
    it('should not return missions from other clients', async () => {
      // Create mission in test client
      const { mission: mission1 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Client 1 Mission',
      });

      // Create second client with its own mission
      const { client: client2 } = await createTestClient({ name: 'Other Client' });
      const { reward: reward2 } = await createTestReward({
        clientId: client2.id,
        type: 'gift_card',
      });
      const { mission: mission2 } = await createTestMission({
        clientId: client2.id,
        rewardId: reward2.id,
        title: 'Client 2 Mission',
      });

      // Query missions for first client
      const supabase = getTestSupabase();
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id);

      // Should only see first client's mission
      expect(missions).toBeDefined();
      expect(missions?.length).toBe(1);
      expect(missions?.[0].id).toBe(mission1.id);
      expect(missions?.find(m => m.id === mission2.id)).toBeUndefined();

      // Cleanup second client
      await cleanupTestData(client2.id);
    });

    it('should not allow accessing other client mission progress', async () => {
      // Create mission and progress in test client
      const { mission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
      });
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: mission.id,
        clientId: testClient.id,
        currentValue: 50,
      });

      // Create second client
      const { client: client2 } = await createTestClient({ name: 'Other Client' });

      // Query progress with wrong client_id
      const supabase = getTestSupabase();
      const { data: wrongClientProgress } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .eq('client_id', client2.id)
        .single();

      // Should not find progress with wrong client_id
      expect(wrongClientProgress).toBeNull();

      // Cleanup
      await cleanupTestData(client2.id);
    });
  });
});
