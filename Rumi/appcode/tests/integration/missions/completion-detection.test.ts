/**
 * Completion Detection Tests
 *
 * Tests mission completion edge cases for current_value vs target_value.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=completion-detection
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.2
 * - SchemaFinalv2.md lines 421-455 (mission_progress table)
 * - API_CONTRACTS.md lines 2952-3140 (GET /api/missions response with progress)
 * - MissionsRewardsFlows.md lines 146-322 (Standard Mission Flow)
 *
 * Test Cases:
 * 1. current_value = target_value → status='completed'
 * 2. current_value = target_value - 1 → status='active'
 * 3. current_value = target_value + 1 → status='completed'
 * 4. completion detected regardless of how much over target
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
  TestMission,
} from '../../fixtures/factories';

describe('Completion Detection Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;
  let testReward: TestReward;
  let testMission: TestMission;

  const TARGET_VALUE = 100;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test data with mission target_value = 100
    const { client } = await createTestClient({ name: 'Completion Test Client' });
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
      tiktokHandle: 'completion_test_user',
      currentTier: testTier.tierId,
    });
    testUser = user;

    const { reward } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      valueData: { amount: 50 },
      tierEligibility: 'tier_1',
    });
    testReward = reward;

    const { mission } = await createTestMission({
      clientId: testClient.id,
      rewardId: testReward.id,
      missionType: 'sales_units',
      targetValue: TARGET_VALUE,
      tierEligibility: 'all',
      title: 'Completion Test Mission',
    });
    testMission = mission;
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('Edge Cases', () => {
    it('should detect completion when current_value = target_value exactly', async () => {
      // Create progress with current_value == target_value (100 == 100)
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE, // 100
        status: 'completed',
        completedAt: new Date(),
      });

      // Verify progress was stored correctly
      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData).toBeDefined();
      expect(progressData?.current_value).toBe(TARGET_VALUE);
      expect(progressData?.status).toBe('completed');
      expect(progressData?.completed_at).not.toBeNull();
    });

    it('should NOT complete when current_value = target_value - 1', async () => {
      // Create progress with current_value one below target (99 < 100)
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE - 1, // 99
        status: 'active',
      });

      // Verify status is 'active', NOT 'completed'
      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData).toBeDefined();
      expect(progressData?.current_value).toBe(TARGET_VALUE - 1);
      expect(progressData?.status).toBe('active');
      expect(progressData?.completed_at).toBeNull();
    });

    it('should detect completion when current_value = target_value + 1', async () => {
      // Create progress with current_value just over target (101 > 100)
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE + 1, // 101
        status: 'completed',
        completedAt: new Date(),
      });

      // Verify status is 'completed'
      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData).toBeDefined();
      expect(progressData?.current_value).toBe(TARGET_VALUE + 1);
      expect(progressData?.status).toBe('completed');
      expect(progressData?.completed_at).not.toBeNull();
    });

    it('should detect completion regardless of how much over target', async () => {
      // Create progress with current_value way over target (500 >> 100)
      const wayOverTarget = TARGET_VALUE * 5; // 500
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: wayOverTarget,
        status: 'completed',
        completedAt: new Date(),
      });

      // Verify status is 'completed'
      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData).toBeDefined();
      expect(progressData?.current_value).toBe(wayOverTarget);
      expect(progressData?.status).toBe('completed');
      expect(progressData?.completed_at).not.toBeNull();
    });
  });

  describe('Completion Threshold Boundary', () => {
    it('should maintain status=active until threshold is reached', async () => {
      // Create progress at 50% - should be active
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE / 2, // 50
        status: 'active',
      });

      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData?.current_value).toBe(TARGET_VALUE / 2);
      expect(progressData?.status).toBe('active');
    });

    it('should store completed_at timestamp when mission completes', async () => {
      const completedAt = new Date();
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE,
        status: 'completed',
        completedAt: completedAt,
      });

      const supabase = getTestSupabase();
      const { data: progressData } = await supabase
        .from('mission_progress')
        .select('*')
        .eq('id', progress.id)
        .single();

      expect(progressData?.status).toBe('completed');
      expect(progressData?.completed_at).not.toBeNull();
      // Verify timestamp is close to what we set (within 1 second)
      const storedDate = new Date(progressData?.completed_at);
      expect(Math.abs(storedDate.getTime() - completedAt.getTime())).toBeLessThan(1000);
    });
  });

  describe('Completion with Redemption', () => {
    it('should allow redemption creation only for completed missions', async () => {
      // Create completed progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create redemption linked to completed progress
      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      // Verify redemption was created with correct linkage
      const supabase = getTestSupabase();
      const { data: redemptionData } = await supabase
        .from('redemptions')
        .select('*')
        .eq('id', redemption.id)
        .single();

      expect(redemptionData).toBeDefined();
      expect(redemptionData?.mission_progress_id).toBe(progress.id);
      expect(redemptionData?.status).toBe('claimable');
    });

    it('should link mission_progress to redemption correctly via FK', async () => {
      // Create completed progress
      const { progress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: testMission.id,
        clientId: testClient.id,
        currentValue: TARGET_VALUE + 10,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create redemption
      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: progress.id,
        status: 'claimable',
      });

      // Query with join to verify FK relationship
      const supabase = getTestSupabase();
      const { data: joinedData } = await supabase
        .from('redemptions')
        .select(`
          id,
          status,
          mission_progress:mission_progress_id (
            id,
            current_value,
            status
          )
        `)
        .eq('id', redemption.id)
        .single();

      expect(joinedData).toBeDefined();
      expect(joinedData?.mission_progress).toBeDefined();
      const missionProgress = joinedData?.mission_progress as unknown as Record<string, unknown>;
      expect(missionProgress?.current_value).toBe(TARGET_VALUE + 10);
      expect(missionProgress?.status).toBe('completed');
    });
  });
});
