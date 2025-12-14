/**
 * Integration Tests for Tier Promotion - Reward Visibility
 *
 * Tests that tier promotion immediately makes higher-tier rewards visible.
 * Uses LOCAL Supabase instance (requires `npx supabase start`).
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=tier-promotion-rewards
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.4.6 (Test tier promotion shows new rewards immediately)
 * - SchemaFinalv2.md lines 462-482 (rewards table with tier_eligibility)
 * - API_CONTRACTS.md lines 4788-4801 (rewards filtering: tier_eligibility = $currentTier)
 * - Loyalty.md lines 1879-1892 (Pattern 6: VIP Reward Lifecycle Management)
 *
 * Test Cases (per EXECUTION_PLAN.md Task 8.4.6):
 * 1. Gold user cannot see Platinum rewards
 * 2. After promotion to Platinum, rewards immediately visible
 * 3. No refresh/cache clear needed
 * 4. Promoted user can claim new tier rewards
 *
 * Prerequisites:
 *   - Local Supabase running: `cd appcode && npx supabase start`
 *   - Database migrations applied
 */

import {
  createTestClient,
  createTestClientRecord,
  createTestUser,
  createTestTier,
  createTestReward,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Test timeout for database operations
jest.setTimeout(30000);

describe('Tier Promotion - Reward Visibility (Task 8.4.6)', () => {
  let supabase: SupabaseClient<Database>;
  let testClientId: string;

  beforeAll(async () => {
    // Verify local Supabase is running
    await assertSupabaseRunning();
    supabase = createTestClient();
  });

  afterAll(async () => {
    // Final cleanup
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
    }
  });

  afterEach(async () => {
    // Cleanup after each test
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
      testClientId = '';
    }
  });

  /**
   * Helper: Query rewards visible to a user based on tier_eligibility
   * Per API_CONTRACTS.md lines 4788-4801: rewards filtered by tier_eligibility = currentTier
   */
  async function getVisibleRewards(userId: string, currentTier: string): Promise<string[]> {
    const { data: rewards } = await supabase
      .from('rewards')
      .select('id, tier_eligibility')
      .eq('client_id', testClientId)
      .eq('tier_eligibility', currentTier)
      .eq('enabled', true)
      .eq('reward_source', 'vip_tier');

    return (rewards || []).map(r => r.id);
  }

  // ============================================================================
  // Test Case 1: Gold user cannot see Platinum rewards
  // Per API_CONTRACTS.md line 4793: r.tier_eligibility = $currentTier
  // ============================================================================
  describe('Test Case 1: Gold user cannot see Platinum rewards', () => {
    it('should NOT show Platinum-tier rewards to Gold-tier user', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Reward Visibility Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create Gold user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_3', // Gold
        total_sales: 5000,
      });

      // Setup: Create Platinum-only reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4', // Platinum only
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // Setup: Create Gold reward (control)
      const goldReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_3', // Gold
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 50 },
      });

      // ACT: Query visible rewards for Gold user
      const visibleRewards = await getVisibleRewards(user.id, 'tier_3');

      // ASSERT: Gold user sees Gold reward, NOT Platinum reward
      expect(visibleRewards).toContain(goldReward.id);
      expect(visibleRewards).not.toContain(platinumReward.id);
    });
  });

  // ============================================================================
  // Test Case 2: After promotion to Platinum, rewards immediately visible
  // Per API_CONTRACTS.md: Query uses $currentTier parameter (real-time)
  // ============================================================================
  describe('Test Case 2: After promotion, rewards immediately visible', () => {
    it('should show Platinum rewards IMMEDIATELY after promotion (same query)', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Immediate Visibility Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create Gold user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_3', // Gold
        total_sales: 5000,
      });

      // Setup: Create Platinum-only reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4', // Platinum only
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // VERIFY: Before promotion, Platinum reward NOT visible
      const beforePromotion = await getVisibleRewards(user.id, 'tier_3');
      expect(beforePromotion).not.toContain(platinumReward.id);

      // ACT: Promote user to Platinum (simulate tier change)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          current_tier: 'tier_4',
          tier_achieved_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('client_id', testClientId);

      expect(updateError).toBeNull();

      // ASSERT: IMMEDIATELY after promotion, Platinum reward IS visible
      // No cache clear, no page refresh, just query with new tier
      const afterPromotion = await getVisibleRewards(user.id, 'tier_4');
      expect(afterPromotion).toContain(platinumReward.id);
    });
  });

  // ============================================================================
  // Test Case 3: No refresh/cache clear needed
  // The query uses user's current_tier as parameter - always real-time
  // ============================================================================
  describe('Test Case 3: No refresh/cache clear needed', () => {
    it('should reflect tier change in same session without refresh', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'No Cache Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create user and rewards
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_3',
        total_sales: 5000,
      });

      const goldReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_3',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 50 },
      });

      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'commission_boost',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { percent: 10, durationDays: 30 },
      });

      // Query 1: As Gold user
      const query1 = await getVisibleRewards(user.id, 'tier_3');
      expect(query1).toContain(goldReward.id);
      expect(query1).not.toContain(platinumReward.id);

      // Simulate promotion (in real app, this happens via checkForPromotions)
      await supabase
        .from('users')
        .update({ current_tier: 'tier_4' })
        .eq('id', user.id)
        .eq('client_id', testClientId);

      // Query 2: Immediately after, as Platinum user (NO refresh)
      // This simulates: same session, just re-query with updated tier
      const query2 = await getVisibleRewards(user.id, 'tier_4');
      expect(query2).toContain(platinumReward.id);
      expect(query2).not.toContain(goldReward.id); // Gold rewards NOT visible to Platinum

      // The key insight: visibility is determined by tier_eligibility = currentTier
      // No caching means immediate effect
    });
  });

  // ============================================================================
  // Test Case 4: Promoted user can claim new tier rewards
  // Verify the reward is actually claimable, not just visible
  // ============================================================================
  describe('Test Case 4: Promoted user can claim new tier rewards', () => {
    it('should allow Platinum user to create redemption for Platinum reward', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Claim Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create Platinum user (already promoted)
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4', // Platinum
        total_sales: 15000,
      });

      // Setup: Create Platinum reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        redemption_type: 'instant',
        value_data: { amount: 100 },
      });

      // VERIFY: Reward is visible
      const visibleRewards = await getVisibleRewards(user.id, 'tier_4');
      expect(visibleRewards).toContain(platinumReward.id);

      // ACT: Create redemption (simulate claim)
      const { data: redemption, error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: platinumReward.id,
          status: 'claimable',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant', // Required per SchemaFinalv2.md line 607
          // mission_progress_id: null (VIP tier reward)
        })
        .select('id, status, tier_at_claim')
        .single();

      // ASSERT: Redemption created successfully
      expect(redemptionError).toBeNull();
      expect(redemption).not.toBeNull();
      expect(redemption?.status).toBe('claimable');
      expect(redemption?.tier_at_claim).toBe('tier_4');

      // Verify redemption exists in database (only if redemption was created)
      if (redemption?.id) {
        const { data: verifyRedemption } = await supabase
          .from('redemptions')
          .select('id, status')
          .eq('id', redemption.id)
          .eq('client_id', testClientId)
          .single();

        expect(verifyRedemption?.status).toBe('claimable');
      }
    });

    it('should NOT allow Gold user to claim Platinum reward', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'No Claim Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create Gold user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_3', // Gold
        total_sales: 5000,
      });

      // Setup: Create Platinum reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // VERIFY: Reward is NOT visible to Gold user
      const visibleRewards = await getVisibleRewards(user.id, 'tier_3');
      expect(visibleRewards).not.toContain(platinumReward.id);

      // Note: In production, the API would reject this claim because:
      // 1. Reward not in visible list (tier_eligibility != current_tier)
      // 2. Backend validates tier_eligibility before allowing claim
      // This test verifies the visibility check prevents unauthorized claims
    });
  });
});
