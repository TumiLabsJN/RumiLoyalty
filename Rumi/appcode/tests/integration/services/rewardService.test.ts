/**
 * Integration Tests for Reward Service
 *
 * Tests rewardService functions against live Supabase database.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=rewardService
 *
 * References:
 * - EXECUTION_PLAN.md Tasks 6.4.1-6.4.12 (Reward Testing)
 * - API_CONTRACTS.md lines 4056-5601 (Reward Endpoints)
 * - SchemaFinalv2.md lines 458-887 (rewards, redemptions, commission_boost_redemptions, physical_gift_redemptions tables)
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
  createTestRedemption,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  TestClient,
  TestUser,
  TestTier,
  TestReward,
} from '../../fixtures/factories';

// Environment variables are loaded by factories.ts

describe('Reward Service Integration Tests', () => {
  let testClient: TestClient;
  let testUser: TestUser;
  let testTier: TestTier;

  beforeAll(async () => {
    // Verify database connection
    await setupTestDb();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    const { client } = await createTestClient({ name: 'Reward Test Client' });
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
      tiktokHandle: 'reward_test_user',
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
  // Test Infrastructure
  // =========================================================================

  describe('Test Infrastructure', () => {
    it('should create gift_card reward successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 100 },
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.clientId).toBe(testClient.id);
      expect(reward.type).toBe('gift_card');
      expect(reward.valueData).toEqual({ amount: 100 });
    });

    it('should create commission_boost reward successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'commission_boost',
        valueData: { percent: 5, duration_days: 30 },
        tierEligibility: 'tier_3',
        redemptionType: 'scheduled',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.type).toBe('commission_boost');
      expect(reward.valueData).toEqual({ percent: 5, duration_days: 30 });
      expect(reward.redemptionType).toBe('scheduled');
    });

    it('should create spark_ads reward successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'spark_ads',
        valueData: { amount: 100 },
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.type).toBe('spark_ads');
      expect(reward.valueData).toEqual({ amount: 100 });
    });

    it('should create discount reward successfully', async () => {
      // Per SchemaFinalv2.md lines 567-578: discount requires percent (1-100),
      // duration_minutes (10-525600), coupon_code (2-8 uppercase alphanumeric)
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'discount',
        valueData: { percent: 15, duration_minutes: 10080, coupon_code: 'TEST15' }, // 10080 min = 7 days
        tierEligibility: 'tier_3',
        redemptionType: 'scheduled',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.type).toBe('discount');
      expect(reward.valueData).toEqual({ percent: 15, duration_minutes: 10080, coupon_code: 'TEST15' });
    });

    it('should create physical_gift reward successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'physical_gift',
        valueData: { display_text: 'Branded Hoodie', requires_size: true, size_options: ['S', 'M', 'L', 'XL'] },
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.type).toBe('physical_gift');
      expect(reward.valueData).toEqual({ display_text: 'Branded Hoodie', requires_size: true, size_options: ['S', 'M', 'L', 'XL'] });
    });

    it('should create experience reward successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'experience',
        valueData: { display_text: 'VIP Meet & Greet' },
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      expect(reward.id).toBeDefined();
      expect(reward.type).toBe('experience');
      expect(reward.valueData).toEqual({ display_text: 'VIP Meet & Greet' });
    });

    it('should create redemption successfully', async () => {
      const { reward } = await createTestReward({
        clientId: testClient.id,
        type: 'gift_card',
        valueData: { amount: 50 },
        tierEligibility: 'tier_3',
        rewardSource: 'vip_tier',
      });

      const { redemption } = await createTestRedemption({
        userId: testUser.id,
        rewardId: reward.id,
        clientId: testClient.id,
        tierAtClaim: testTier.tierId,
        missionProgressId: null, // VIP tier rewards have no mission
        status: 'claimed',
      });

      expect(redemption.id).toBeDefined();
      expect(redemption.userId).toBe(testUser.id);
      expect(redemption.rewardId).toBe(reward.id);
      expect(redemption.status).toBe('claimed');
      expect(redemption.missionProgressId).toBeNull();
    });
  });

  // =========================================================================
  // Gift Card Tests (Tasks 6.4.2, 6.4.11)
  // =========================================================================

  describe('gift_card rewards', () => {
    it.todo('should claim gift_card with correct amount display');
    it.todo('should prevent double claim (idempotency)');
    it.todo('should track usedCount correctly');
  });

  // =========================================================================
  // Commission Boost Tests (Tasks 6.4.3, 6.4.4)
  // =========================================================================

  describe('commission_boost rewards', () => {
    it.todo('should claim commission_boost with scheduled activation');
    it.todo('should create commission_boost_redemptions record');
    it.todo('should transition boost_status through lifecycle');
    it.todo('should calculate payout correctly');
  });

  // =========================================================================
  // Spark Ads Tests (Task 6.4.5)
  // =========================================================================

  describe('spark_ads rewards', () => {
    it.todo('should claim spark_ads as instant redemption');
    it.todo('should display correct amount format');
  });

  // =========================================================================
  // Discount Tests (Tasks 6.4.6, 6.4.7)
  // =========================================================================

  describe('discount rewards', () => {
    it.todo('should enforce max_uses limit');
    it.todo('should allow unlimited when max_uses is null');
    it.todo('should require scheduled activation');
    it.todo('should create calendar event');
  });

  // =========================================================================
  // Physical Gift Tests (Task 6.4.8)
  // =========================================================================

  describe('physical_gift rewards', () => {
    it.todo('should require shipping info');
    it.todo('should require size when requires_size=true');
    it.todo('should create physical_gift_redemptions record');
  });

  // =========================================================================
  // Experience Tests (Task 6.4.9)
  // =========================================================================

  describe('experience rewards', () => {
    it.todo('should claim experience as instant redemption');
    it.todo('should display value_data.display_text');
  });

  // =========================================================================
  // Tier Isolation Tests (Task 6.4.10)
  // =========================================================================

  describe('tier isolation', () => {
    it.todo('should filter rewards by tier_eligibility');
    it.todo('should show preview rewards as locked');
    it.todo('should prevent claiming rewards from wrong tier');
  });

  // =========================================================================
  // Payment Info Tests (Task 6.4.12)
  // =========================================================================

  describe('payment info encryption', () => {
    it.todo('should encrypt payment_account on save');
    it.todo('should decrypt payment_account on retrieve');
  });
});
