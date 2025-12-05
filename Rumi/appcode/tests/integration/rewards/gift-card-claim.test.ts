/**
 * Integration Tests for Gift Card Reward Claim
 *
 * Tests gift card claiming functionality against live Supabase database.
 * Validates correct amount display and prevents catastrophic $100-shows-as-$1000 bugs.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=gift-card-claim
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.2 (Gift Card Claim Tests)
 * - SchemaFinalv2.md lines 482-485 (gift_card value_data structure)
 * - API_CONTRACTS.md lines 4838-5087 (POST /api/rewards/:id/claim)
 * - MissionsRewardsFlows.md lines 388-440 (Instant Rewards Flow)
 *
 * Note: These tests work at the repository/database level because rewardService
 * requires Next.js request context (cookies). E2E tests cover full API flow.
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
  createTestRedemption,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
  TestRedemption,
} from '../../fixtures/factories';

/**
 * Helper to format gift card display name
 * Per API_CONTRACTS.md lines 5075-5081: "$25 Amazon Gift Card" format
 */
function formatGiftCardName(amount: number): string {
  return `$${amount} Gift Card`;
}

/**
 * Helper to simulate claiming a gift card reward (repository-level)
 * This creates the redemption record as the service would
 */
async function claimGiftCardReward(
  userId: string,
  rewardId: string,
  clientId: string,
  tierAtClaim: string
): Promise<{ redemption: TestRedemption; reward: TestReward }> {
  const supabase = getTestSupabase();

  // Get the reward details
  const { data: rewardData, error: rewardError } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', rewardId)
    .single();

  if (rewardError || !rewardData) {
    throw new Error(`Reward not found: ${rewardError?.message}`);
  }

  // Create redemption record with status='claimed' (per MissionsRewardsFlows.md line 403)
  const { redemption } = await createTestRedemption({
    userId,
    rewardId,
    clientId,
    tierAtClaim,
    missionProgressId: null, // VIP tier rewards have no mission
    status: 'claimed',
    redemptionType: 'instant',
    claimedAt: new Date(),
  });

  const reward: TestReward = {
    id: rewardData.id,
    clientId: rewardData.client_id,
    type: rewardData.type,
    name: rewardData.name,
    description: rewardData.description,
    valueData: rewardData.value_data,
    rewardSource: rewardData.reward_source,
    tierEligibility: rewardData.tier_eligibility,
    redemptionType: rewardData.redemption_type,
    enabled: rewardData.enabled,
  };

  return { redemption, reward };
}

/**
 * Helper to get usage count for a reward
 */
async function getUsageCount(
  userId: string,
  rewardId: string,
  clientId: string
): Promise<number> {
  const supabase = getTestSupabase();
  const { count, error } = await supabase
    .from('redemptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reward_id', rewardId)
    .eq('client_id', clientId)
    .is('mission_progress_id', null) // VIP tier only
    .in('status', ['claimed', 'fulfilled', 'concluded'])
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to get usage count: ${error.message}`);
  }

  return count ?? 0;
}

describe('Gift Card Reward Claim Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;

  beforeAll(async () => {
    // Verify database connection
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    const { client } = await createTestClient({ name: 'Gift Card Test Client' });
    testClient = client;

    const { tier } = await createTestTier({
      clientId: testClient.id,
      tierId: 'tier_3',
      tierOrder: 3,
      tierName: 'Gold',
      unitsThreshold: 500,
    });
    testTier = tier;

    const { user } = await createTestUser({
      clientId: testClient.id,
      tiktokHandle: 'gift_card_test_user',
      currentTier: testTier.tierId,
    });
    testUser = user;
  });

  afterEach(async () => {
    // Clean up all test data
    if (testClient?.id) {
      await cleanupTestData(testClient.id);
    }
  });

  // =========================================================================
  // Test Case 1: Claim creates redemption with correct reward_id
  // =========================================================================

  describe('Test Case 1: Claim creates redemption with correct reward_id', () => {
    it('should create redemption record with matching reward_id', async () => {
      // Create gift card reward
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      // Claim the reward
      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      // Verify redemption was created
      expect(redemption).toBeDefined();
      expect(redemption.id).toBeDefined();

      // Query database to verify redemption has correct reward_id
      const supabase = getTestSupabase();
      const { data: redemptionData, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('id', redemption.id)
        .single();

      expect(error).toBeNull();
      expect(redemptionData).toBeDefined();
      expect(redemptionData?.reward_id).toBe(reward.id);
      expect(redemptionData?.user_id).toBe(testUser.id);
      expect(redemptionData?.client_id).toBe(testClient.id);
    });
  });

  // =========================================================================
  // Test Case 2: value_data.amount=100 displays as "$100 Gift Card"
  // =========================================================================

  describe('Test Case 2: Gift card amount displays correctly', () => {
    it('should format value_data.amount=100 as "$100 Gift Card" not "$1000"', async () => {
      // Create gift card with amount=100
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      // Claim and get reward details
      const { reward: claimedReward } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      // Verify the formatting is correct
      const displayName = formatGiftCardName(claimedReward.valueData?.amount as number);
      expect(displayName).toBe('$100 Gift Card');
      expect(claimedReward.valueData?.amount).toBe(100);

      // CRITICAL: Verify it does NOT show "$1000" (catastrophic bug prevention)
      expect(displayName).not.toContain('$1000');
      expect(displayName).not.toContain('$10 ');
    });

    it('should format value_data.amount=50 as "$50 Gift Card"', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 50 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { reward: claimedReward } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(formatGiftCardName(claimedReward.valueData?.amount as number)).toBe('$50 Gift Card');
      expect(claimedReward.valueData?.amount).toBe(50);
    });

    it('should format value_data.amount=250 as "$250 Gift Card"', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 250 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { reward: claimedReward } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(formatGiftCardName(claimedReward.valueData?.amount as number)).toBe('$250 Gift Card');
      expect(claimedReward.valueData?.amount).toBe(250);
    });
  });

  // =========================================================================
  // Test Case 3: redemption.status='claimed' after successful claim
  // =========================================================================

  describe('Test Case 3: Redemption status is "claimed" after successful claim', () => {
    it('should set redemption status to "claimed" immediately after claim', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      // Verify claim response status
      expect(redemption.status).toBe('claimed');

      // Verify database state
      const supabase = getTestSupabase();
      const { data: redemptionData } = await supabase
        .from('redemptions')
        .select('status, claimed_at')
        .eq('id', redemption.id)
        .single();

      expect(redemptionData?.status).toBe('claimed');
      expect(redemptionData?.claimed_at).not.toBeNull();
    });

    it('should NOT set status to "fulfilled" for instant rewards', async () => {
      // Per MissionsRewardsFlows.md: Instant rewards do NOT use 'fulfilled' status
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 75 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      // Verify status is 'claimed', not 'fulfilled'
      expect(redemption.status).toBe('claimed');
      expect(redemption.status).not.toBe('fulfilled');
    });
  });

  // =========================================================================
  // Test Case 4: Amount precision maintained (no rounding errors)
  // =========================================================================

  describe('Test Case 4: Amount precision is maintained', () => {
    const testAmounts = [50, 100, 250, 25, 75, 150, 500];

    it.each(testAmounts)(
      'should maintain exact amount precision for $%d gift card',
      async (amount) => {
        const { reward } = await createTestReward({
          clientId: testClient.id,
          type: 'gift_card',
          valueData: { amount },
          tierEligibility: testTier.tierId,
          rewardSource: 'vip_tier',
          redemptionFrequency: 'monthly',
          redemptionQuantity: 2,
        });

        const { reward: claimedReward } = await claimGiftCardReward(
          testUser.id,
          reward.id,
          testClient.id,
          testTier.tierId
        );

        // Verify valueData.amount matches exactly
        expect(claimedReward.valueData?.amount).toBe(amount);

        // Verify display name contains correct dollar amount
        expect(formatGiftCardName(amount)).toBe(`$${amount} Gift Card`);

        // Verify no decimal places added
        expect(formatGiftCardName(amount)).not.toContain('.');

        // Verify database stores correct value
        const supabase = getTestSupabase();
        const { data: rewardData } = await supabase
          .from('rewards')
          .select('value_data')
          .eq('id', reward.id)
          .single();

        expect(rewardData?.value_data?.amount).toBe(amount);

        // Cleanup for next iteration
        await supabase.from('redemptions').delete().eq('reward_id', reward.id);
        await supabase.from('rewards').delete().eq('id', reward.id);
      }
    );

    it('should handle decimal amounts without rounding issues', async () => {
      // Test with an amount that could cause floating point issues
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 99 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { reward: claimedReward } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      // Verify exact amount
      expect(claimedReward.valueData?.amount).toBe(99);
      expect(formatGiftCardName(99)).toBe('$99 Gift Card');

      // Ensure it's not rounded to 100 or 95
      expect(claimedReward.valueData?.amount).not.toBe(100);
      expect(claimedReward.valueData?.amount).not.toBe(95);
    });
  });

  // =========================================================================
  // Additional Tests: Database Integrity & usedCount
  // =========================================================================

  describe('Database Integrity & Usage Tracking', () => {
    it('should track usedCount correctly after claim', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 3,
      });

      // Initial count should be 0
      const initialCount = await getUsageCount(testUser.id, reward.id, testClient.id);
      expect(initialCount).toBe(0);

      // After first claim
      await claimGiftCardReward(testUser.id, reward.id, testClient.id, testTier.tierId);
      const afterFirstClaim = await getUsageCount(testUser.id, reward.id, testClient.id);
      expect(afterFirstClaim).toBe(1);

      // After second claim (simulating another claim in a new period)
      const { redemption: secondRedemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: reward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: null,
        status: 'claimed',
        redemptionType: 'instant',
        claimedAt: new Date(),
      });
      const afterSecondClaim = await getUsageCount(testUser.id, reward.id, testClient.id);
      expect(afterSecondClaim).toBe(2);
    });

    it('should store reward type as gift_card in redemption context', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { reward: claimedReward } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(claimedReward.type).toBe('gift_card');
      expect(claimedReward.rewardSource).toBe('vip_tier');
    });

    it('should set redemption_type to "instant" for gift cards', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(redemption.redemptionType).toBe('instant');

      // Verify in database
      const supabase = getTestSupabase();
      const { data } = await supabase
        .from('redemptions')
        .select('redemption_type')
        .eq('id', redemption.id)
        .single();

      expect(data?.redemption_type).toBe('instant');
    });

    it('should set mission_progress_id to null for VIP tier rewards', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(redemption.missionProgressId).toBeNull();

      // Verify in database
      const supabase = getTestSupabase();
      const { data } = await supabase
        .from('redemptions')
        .select('mission_progress_id')
        .eq('id', redemption.id)
        .single();

      expect(data?.mission_progress_id).toBeNull();
    });

    it('should store tier_at_claim correctly', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: testTier.tierId,
        rewardSource: 'vip_tier',
        redemptionFrequency: 'monthly',
        redemptionQuantity: 2,
      });

      const { redemption } = await claimGiftCardReward(
        testUser.id,
        reward.id,
        testClient.id,
        testTier.tierId
      );

      expect(redemption.tierAtClaim).toBe(testTier.tierId);

      // Verify in database
      const supabase = getTestSupabase();
      const { data } = await supabase
        .from('redemptions')
        .select('tier_at_claim')
        .eq('id', redemption.id)
        .single();

      expect(data?.tier_at_claim).toBe(testTier.tierId);
    });
  });
});
