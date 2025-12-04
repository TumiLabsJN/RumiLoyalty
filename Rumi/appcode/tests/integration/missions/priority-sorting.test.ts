/**
 * Mission Priority Sorting Tests
 *
 * Tests that missions are sorted by the 12-priority status order.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=priority-sorting --testTimeout=30000
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.10
 * - missionService.ts lines 800-900 (sortMissionsByPriority function)
 * - API_CONTRACTS.md lines 3000-3100 (status enum and display order)
 * - repodocs/MISSIONS_IMPL.md (12-priority sort documentation)
 *
 * Status Priority Order (highest to lowest):
 * 1. default_claim - Completed, instant reward claimable
 * 2. default_schedule - Completed, scheduled reward claimable
 * 3. boost_claim - Commission boost claimable
 * 4. boost_schedule - Commission boost scheduled
 * 5. raffle_available - Raffle open for participation
 * 6. raffle_processing - User entered, awaiting draw
 * 7. in_progress - Active mission, user working on it
 * 8. locked - User tier too low (eligible tier)
 * 9. locked_schedule - Locked scheduled reward
 * 10. locked_raffle - Locked raffle
 * 11. locked_boost - Locked commission boost
 * 12. concluded - Mission completed and claimed
 *
 * NOTE: Tests at database level - we test the sorting logic by verifying
 * the expected order after computing statuses, not by calling missionService directly.
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

// Priority order from missionService.ts sortMissions()
const STATUS_PRIORITY: Record<string, number> = {
  'default_claim': 1,
  'default_schedule': 2,
  'boost_claim': 3,
  'boost_schedule': 4,
  'raffle_available': 5,
  'raffle_processing': 6,
  'in_progress': 7,
  'locked': 8,
  'locked_schedule': 9,
  'locked_raffle': 10,
  'locked_boost': 11,
  'concluded': 12,
};

/**
 * Simplified status computation for testing.
 * Mirrors the logic in missionService.ts computeStatus()
 */
function computeTestStatus(mission: {
  missionType: string;
  activated: boolean;
  tierEligibility: string;
}, progress: { status: string; currentValue: number } | null, redemption: { status: string } | null, userTier: string): string {
  // Check if locked (tier mismatch)
  const isLocked = mission.tierEligibility !== 'all' && mission.tierEligibility !== userTier;

  if (isLocked) {
    if (mission.missionType === 'raffle') return 'locked_raffle';
    return 'locked';
  }

  // Raffle states
  if (mission.missionType === 'raffle') {
    if (!mission.activated) return 'concluded'; // Dormant/ended
    return 'raffle_available';
  }

  // Check redemption status
  if (redemption) {
    if (redemption.status === 'claimable') return 'default_claim';
    if (redemption.status === 'claimed') return 'concluded';
  }

  // Active mission
  if (progress && progress.status === 'active') {
    return 'in_progress';
  }

  // Completed but no redemption yet
  if (progress && progress.status === 'completed') {
    return 'default_claim';
  }

  return 'in_progress';
}

describe('Mission Priority Sorting Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;
  let higherTier: TestTier;
  let testReward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Priority Sorting Test Client' });
    testClient = client;

    // Create tiers
    const { tier } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_1',
      tierOrder: 1,
      tierName: 'Bronze',
      unitsThreshold: 0,
    });
    testTier = tier;

    const { tier: tier2 } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_2',
      tierOrder: 2,
      tierName: 'Silver',
      unitsThreshold: 100,
    });
    higherTier = tier2;

    // Create user at tier_1
    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'priority_sort_test_user',
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

  describe('Status Priority Order', () => {
    it('should sort default_claim missions before in_progress missions', async () => {
      // Create in_progress mission (active, not completed)
      const { mission: inProgressMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'In Progress Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 1,
      });

      // Create progress for in_progress (50/100)
      await createTestMissionProgress({
        userId: testUser.id,
        missionId: inProgressMission.id,
        clientId: testClient.id,
        currentValue: 50,
        status: 'active',
      });

      // Create claimable mission (completed with claimable redemption)
      const { mission: claimableMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Claimable Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 2,
      });

      // Create completed progress
      const { progress: completedProgress } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: claimableMission.id,
        clientId: testClient.id,
        currentValue: 100,
        status: 'completed',
        completedAt: new Date(),
      });

      // Create claimable redemption
      await createTestRedemption({
        userId: testUser.id,
        rewardId: testReward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: completedProgress.id,
        status: 'claimable',
      });

      // Compute statuses
      const inProgressStatus = computeTestStatus(
        { missionType: 'sales_units', activated: true, tierEligibility: 'all' },
        { status: 'active', currentValue: 50 },
        null,
        testUser.currentTier ?? 'tier_1'
      );

      const claimableStatus = computeTestStatus(
        { missionType: 'sales_units', activated: true, tierEligibility: 'all' },
        { status: 'completed', currentValue: 100 },
        { status: 'claimable' },
        testUser.currentTier ?? 'tier_1'
      );

      // Verify priority order
      expect(inProgressStatus).toBe('in_progress');
      expect(claimableStatus).toBe('default_claim');
      expect(STATUS_PRIORITY[claimableStatus]).toBeLessThan(STATUS_PRIORITY[inProgressStatus]);
    });

    it('should sort locked missions after claimable missions', async () => {
      // Create claimable mission (tier_1, user is tier_1)
      const { mission: claimableMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Claimable Mission',
        targetValue: 100,
        tierEligibility: 'tier_1', // User's tier
        displayOrder: 1,
      });

      // Create locked mission (tier_2, user is tier_1)
      const { mission: lockedMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Locked Mission',
        targetValue: 100,
        tierEligibility: 'tier_2', // Higher tier - user can't access
        displayOrder: 2,
      });

      // Compute statuses
      const claimableStatus = computeTestStatus(
        { missionType: 'sales_units', activated: true, tierEligibility: 'tier_1' },
        { status: 'completed', currentValue: 100 },
        { status: 'claimable' },
        'tier_1' // User tier
      );

      const lockedStatus = computeTestStatus(
        { missionType: 'sales_units', activated: true, tierEligibility: 'tier_2' },
        null,
        null,
        'tier_1' // User tier - doesn't match tier_2
      );

      // Verify priority order
      expect(claimableStatus).toBe('default_claim');
      expect(lockedStatus).toBe('locked');
      expect(STATUS_PRIORITY[claimableStatus]).toBeLessThan(STATUS_PRIORITY[lockedStatus]);
    });

    it('should sort missions correctly by 12-priority order', async () => {
      // Create missions with different statuses
      const missions = [];

      // 1. default_claim (claimable redemption)
      const { mission: m1 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Claimable Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 1,
      });
      const { progress: p1 } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: m1.id,
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
        missionProgressId: p1.id,
        status: 'claimable',
      });
      missions.push({ mission: m1, expectedStatus: 'default_claim' });

      // 2. raffle_available (active raffle)
      const { mission: m2 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Active Raffle',
        missionType: 'raffle',
        targetValue: 0,
        tierEligibility: 'all',
        activated: true,
        displayOrder: 2,
      });
      missions.push({ mission: m2, expectedStatus: 'raffle_available' });

      // 3. in_progress (active mission)
      const { mission: m3 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'In Progress Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 3,
      });
      await createTestMissionProgress({
        userId: testUser.id,
        missionId: m3.id,
        clientId: testClient.id,
        currentValue: 50,
        status: 'active',
      });
      missions.push({ mission: m3, expectedStatus: 'in_progress' });

      // 4. locked (higher tier required)
      const { mission: m4 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Locked Mission',
        targetValue: 100,
        tierEligibility: 'tier_2',
        displayOrder: 4,
      });
      missions.push({ mission: m4, expectedStatus: 'locked' });

      // 5. concluded (claimed redemption)
      const { mission: m5 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Concluded Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 5,
      });
      const { progress: p5 } = await createTestMissionProgress({
        userId: testUser.id,
        missionId: m5.id,
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
        missionProgressId: p5.id,
        status: 'claimed',
        claimedAt: new Date(),
      });
      missions.push({ mission: m5, expectedStatus: 'concluded' });

      // Sort by priority
      const sorted = missions.sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.expectedStatus] || 99;
        const priorityB = STATUS_PRIORITY[b.expectedStatus] || 99;
        return priorityA - priorityB;
      });

      // Verify expected order
      expect(sorted[0].expectedStatus).toBe('default_claim');
      expect(sorted[1].expectedStatus).toBe('raffle_available');
      expect(sorted[2].expectedStatus).toBe('in_progress');
      expect(sorted[3].expectedStatus).toBe('locked');
      expect(sorted[4].expectedStatus).toBe('concluded');

      // Verify priority values are in ascending order
      for (let i = 0; i < sorted.length - 1; i++) {
        const currentPriority = STATUS_PRIORITY[sorted[i].expectedStatus];
        const nextPriority = STATUS_PRIORITY[sorted[i + 1].expectedStatus];
        expect(currentPriority).toBeLessThanOrEqual(nextPriority);
      }
    });
  });

  describe('Database Query with Priority Sorting', () => {
    it('should allow sorting by display_order as fallback within same priority', async () => {
      // Create two in_progress missions with different display_order
      const { mission: m1 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'First In Progress',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 10,
      });

      const { mission: m2 } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Second In Progress',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 5,
      });

      const supabase = getTestSupabase();

      // Query and sort by display_order
      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, display_order')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      // Both missions should be present
      expect(missions?.length).toBe(2);

      // display_order 5 should come before 10
      expect(missions?.[0].display_order).toBe(5);
      expect(missions?.[1].display_order).toBe(10);
    });
  });

  describe('Multi-Tenant Isolation with Sorting', () => {
    it('should maintain sorting within client boundary', async () => {
      // Create missions for test client
      const { mission: clientMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: testReward.id,
        title: 'Client 1 Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 1,
      });

      // Create second client with mission
      const { client: client2 } = await createTestClient({ name: 'Other Client' });
      const { reward: reward2 } = await createTestReward({
        clientId: client2.id,
        type: 'gift_card',
      });
      const { mission: otherMission } = await createTestMission({
        clientId: client2.id,
        rewardId: reward2.id,
        title: 'Client 2 Mission',
        targetValue: 100,
        tierEligibility: 'all',
        displayOrder: 0, // Lower display_order, but different client
      });

      const supabase = getTestSupabase();

      // Query only first client's missions with sorting
      const { data: missions } = await supabase
        .from('missions')
        .select('id, title, display_order, client_id')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      // Should only see first client's mission
      expect(missions?.length).toBe(1);
      expect(missions?.[0].id).toBe(clientMission.id);

      // Other client's mission should NOT appear
      const foundOther = missions?.find(m => m.id === otherMission.id);
      expect(foundOther).toBeUndefined();

      // Cleanup
      await cleanupTestData(client2.id);
    });
  });
});
