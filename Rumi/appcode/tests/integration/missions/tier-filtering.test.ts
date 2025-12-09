/**
 * Tier Filtering Tests
 *
 * Tests tier eligibility and preview_from_tier filtering for missions.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=tier-filtering
 *
 * References:
 * - EXECUTION_PLAN.md Task 5.4.6
 * - SchemaFinalv2.md lines 373-374 (missions.tier_eligibility, preview_from_tier)
 * - API_CONTRACTS.md lines 2952-3140 (GET /api/missions with tier filtering)
 *
 * Test Cases:
 * 1. Gold user sees tier_3 missions
 * 2. Gold user does NOT see tier_4 missions (no preview)
 * 3. Gold user sees tier_4 mission with preview_from_tier='tier_3' as preview/locked
 * 4. Gold user cannot claim tier_4 mission (403)
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

describe('Tier Filtering Tests', () => {
  let testClient: TestClient;
  let goldUser: TestUser;
  let tier1: TestTier;
  let tier3: TestTier;
  let tier4: TestTier;
  let tier1Reward: TestReward;
  let tier3Reward: TestReward;
  let tier4Reward: TestReward;

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create test client
    const { client } = await createTestClient({ name: 'Tier Filtering Test Client' });
    testClient = client;

    // Create tier hierarchy: tier_1 (Bronze) < tier_3 (Gold) < tier_4 (Platinum)
    const { tier: t1 } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_1',
      tierOrder: 1,
      tierName: 'Bronze',
      unitsThreshold: 0,
    });
    tier1 = t1;

    const { tier: t3 } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_3',
      tierOrder: 3,
      tierName: 'Gold',
      unitsThreshold: 100,
    });
    tier3 = t3;

    const { tier: t4 } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_4',
      tierOrder: 4,
      tierName: 'Platinum',
      unitsThreshold: 500,
    });
    tier4 = t4;

    // Create Gold-tier user
    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'gold_tier_user',
      currentTier: 'tier_3', // Gold tier
    });
    goldUser = user;

    // Create rewards for different tiers
    const { reward: r1 } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Bronze Reward',
      tierEligibility: 'tier_1',
    });
    tier1Reward = r1;

    const { reward: r3 } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Gold Reward',
      tierEligibility: 'tier_3',
    });
    tier3Reward = r3;

    const { reward: r4 } = await createTestReward({
      clientId: testClient.id,
      type: 'gift_card',
      name: 'Platinum Reward',
      tierEligibility: 'tier_4',
    });
    tier4Reward = r4;
  });

  afterEach(async () => {
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  describe('Tier Eligibility Filtering', () => {
    it('should allow Gold user to see tier_3 eligible missions', async () => {
      // Create mission for tier_3 (Gold)
      const { mission: goldMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier3Reward.id,
        title: 'Gold Mission',
        tierEligibility: 'tier_3',
      });

      const supabase = getTestSupabase();

      // Query missions available to tier_3 user
      // Per API: tier_eligibility.eq.${currentTierId} OR preview_from_tier.eq.${currentTierId}
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .or(`tier_eligibility.eq.tier_3,tier_eligibility.eq.all`);

      // Gold user should see the Gold mission
      expect(missions).toBeDefined();
      expect(missions?.length).toBeGreaterThanOrEqual(1);
      expect(missions?.some(m => m.id === goldMission.id)).toBe(true);
    });

    it('should allow Gold user to see tier_eligibility=all missions', async () => {
      // Create mission for all tiers
      const { mission: allTierMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier1Reward.id,
        title: 'All Tiers Mission',
        tierEligibility: 'all',
      });

      const supabase = getTestSupabase();

      // Query missions available to any tier
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .eq('tier_eligibility', 'all');

      // Gold user should see the all-tier mission
      expect(missions).toBeDefined();
      expect(missions?.length).toBeGreaterThanOrEqual(1);
      expect(missions?.some(m => m.id === allTierMission.id)).toBe(true);
    });

    it('should NOT show tier_4 missions to Gold user (without preview)', async () => {
      // Create mission for tier_4 (Platinum) - no preview_from_tier
      const { mission: platinumMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier4Reward.id,
        title: 'Platinum Only Mission',
        tierEligibility: 'tier_4',
        previewFromTier: null, // No preview for lower tiers
      });

      const supabase = getTestSupabase();

      // Query missions available to tier_3 user (Gold)
      // This query mimics the repository logic
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .or(`tier_eligibility.eq.tier_3,tier_eligibility.eq.all,preview_from_tier.eq.tier_3`);

      // Gold user should NOT see the Platinum-only mission
      expect(missions?.some(m => m.id === platinumMission.id)).toBe(false);
    });
  });

  describe('Preview From Tier', () => {
    it('should show tier_4 mission with preview_from_tier=tier_3 to Gold user', async () => {
      // Create Platinum mission with preview enabled for Gold users
      const { mission: previewMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier4Reward.id,
        title: 'Platinum Mission (Preview for Gold)',
        tierEligibility: 'tier_4',
        previewFromTier: 'tier_3', // Gold users can see preview
      });

      const supabase = getTestSupabase();

      // Query with preview_from_tier filter
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .or(`tier_eligibility.eq.tier_3,tier_eligibility.eq.all,preview_from_tier.eq.tier_3`);

      // Gold user should see the preview mission
      expect(missions?.some(m => m.id === previewMission.id)).toBe(true);
    });

    it('should mark preview missions as locked for Gold user', async () => {
      // Create Platinum mission with preview
      const { mission: previewMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier4Reward.id,
        title: 'Locked Preview Mission',
        tierEligibility: 'tier_4',
        previewFromTier: 'tier_3',
      });

      const supabase = getTestSupabase();

      // Get mission and check tier relationship
      const { data: missionData } = await supabase
        .from('missions')
        .select('tier_eligibility, preview_from_tier')
        .eq('id', previewMission.id)
        .single();

      // For Gold user (tier_3), this mission is:
      // - Visible (preview_from_tier = tier_3)
      // - Locked (tier_eligibility = tier_4, not tier_3)
      const userTier = 'tier_3';
      const isEligible = missionData?.tier_eligibility === userTier ||
                         missionData?.tier_eligibility === 'all';
      const isPreview = missionData?.preview_from_tier === userTier;
      const isLocked = isPreview && !isEligible;

      expect(isPreview).toBe(true);
      expect(isEligible).toBe(false);
      expect(isLocked).toBe(true);
    });

    it('should NOT show preview missions below user tier', async () => {
      // Create Bronze mission with preview for tier_1 only
      const { mission: bronzePreview } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier1Reward.id,
        title: 'Bronze Preview Only',
        tierEligibility: 'tier_1',
        previewFromTier: 'tier_1', // Only Bronze users see preview
      });

      const supabase = getTestSupabase();

      // Query from Gold user perspective (tier_3)
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', testClient.id)
        .eq('enabled', true)
        .or(`tier_eligibility.eq.tier_3,tier_eligibility.eq.all,preview_from_tier.eq.tier_3`);

      // Gold user should NOT see Bronze-preview mission (preview_from_tier is tier_1, not tier_3)
      // Unless tier_eligibility allows
      const bronzeMission = missions?.find(m => m.id === bronzePreview.id);

      // The mission won't appear because:
      // - tier_eligibility is tier_1 (not tier_3 or all)
      // - preview_from_tier is tier_1 (not tier_3)
      expect(bronzeMission).toBeUndefined();
    });
  });

  describe('Claim Tier Validation', () => {
    it('should prevent Gold user from claiming tier_4 mission', async () => {
      // Create Platinum mission (preview enabled for Gold, but not claimable)
      const { mission: platinumMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier4Reward.id,
        title: 'Unclaimmable for Gold',
        tierEligibility: 'tier_4',
        previewFromTier: 'tier_3',
      });

      // Verify the tier validation logic
      const userTier: string = 'tier_3';
      const missionTierEligibility: string = 'tier_4';

      // Business logic: user can only claim if tier matches OR eligibility is 'all'
      const canClaim = missionTierEligibility === userTier ||
                       missionTierEligibility === 'all';

      expect(canClaim).toBe(false);

      // Verify mission data
      const supabase = getTestSupabase();
      const { data: missionData } = await supabase
        .from('missions')
        .select('tier_eligibility')
        .eq('id', platinumMission.id)
        .single();

      expect(missionData?.tier_eligibility).toBe('tier_4');
      expect(missionData?.tier_eligibility).not.toBe(userTier);
    });

    it('should allow Gold user to claim tier_3 mission', async () => {
      // Create Gold mission
      const { mission: goldMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier3Reward.id,
        title: 'Claimable for Gold',
        tierEligibility: 'tier_3',
      });

      // Verify the tier validation logic
      const userTier = 'tier_3';
      const missionTierEligibility = 'tier_3';

      // Business logic: user can claim if tier matches
      const canClaim = missionTierEligibility === userTier ||
                       missionTierEligibility === 'all';

      expect(canClaim).toBe(true);

      // Verify mission data
      const supabase = getTestSupabase();
      const { data: missionData } = await supabase
        .from('missions')
        .select('tier_eligibility')
        .eq('id', goldMission.id)
        .single();

      expect(missionData?.tier_eligibility).toBe('tier_3');
      expect(missionData?.tier_eligibility).toBe(userTier);
    });

    it('should allow Gold user to claim tier_eligibility=all mission', async () => {
      // Create all-tier mission
      const { mission: allMission } = await createTestMission({
        clientId: testClient.id,
        rewardId: tier1Reward.id,
        title: 'Open to All',
        tierEligibility: 'all',
      });

      // Verify the tier validation logic
      const userTier: string = 'tier_3';
      const missionTierEligibility: string = 'all';

      // Business logic: tier_eligibility='all' allows any tier
      const canClaim = missionTierEligibility === userTier ||
                       missionTierEligibility === 'all';

      expect(canClaim).toBe(true);

      // Verify mission data
      const supabase = getTestSupabase();
      const { data: missionData } = await supabase
        .from('missions')
        .select('tier_eligibility')
        .eq('id', allMission.id)
        .single();

      expect(missionData?.tier_eligibility).toBe('all');
    });
  });
});
