/**
 * Integration Tests for Tier Demotion - Soft Delete VIP Rewards
 *
 * Tests that tier demotion soft-deletes unclaimed VIP redemptions.
 * Uses LOCAL Supabase instance (requires `npx supabase start`).
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=tier-demotion-rewards
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.4.7 (Test tier demotion soft-deletes VIP rewards)
 * - SchemaFinalv2.md lines 621-622 (redemptions.deleted_at, deleted_reason)
 * - Loyalty.md lines 1879-1892 (Pattern 6: VIP Reward Lifecycle Management)
 *
 * Test Cases (per EXECUTION_PLAN.md Task 8.4.7):
 * 1. Platinum user demoted to Gold
 * 2. Unclaimed Platinum VIP redemptions get deleted_at set
 * 3. Demoted user no longer sees Platinum rewards in API
 * 4. Already-claimed rewards NOT deleted (preserved)
 * 5. Mission rewards unaffected by demotion
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
  createTestMission,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Test timeout for database operations
jest.setTimeout(30000);

describe('Tier Demotion - Soft Delete VIP Rewards (Task 8.4.7)', () => {
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
   * Helper: Simulate tier demotion with soft delete of VIP redemptions
   * Per Loyalty.md lines 1885: "soft delete claimable rewards: deleted_at, deleted_reason"
   */
  async function demoteUserWithSoftDelete(
    userId: string,
    fromTier: string,
    toTier: string
  ): Promise<void> {
    // 1. Update user's tier
    await supabase
      .from('users')
      .update({
        current_tier: toTier,
        tier_achieved_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('client_id', testClientId);

    // 2. Soft delete claimable VIP redemptions for the old tier
    // Per SchemaFinalv2.md line 622: deleted_reason format 'tier_change_tier_X_to_tier_Y'
    const deletedReason = `tier_change_${fromTier}_to_${toTier}`;

    await supabase
      .from('redemptions')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: deletedReason,
      })
      .eq('user_id', userId)
      .eq('client_id', testClientId)
      .eq('status', 'claimable') // Only unclaimed
      .eq('tier_at_claim', fromTier) // Only old tier rewards
      .is('mission_progress_id', null); // Only VIP rewards, not mission rewards
  }

  /**
   * Helper: Query visible rewards (excluding soft-deleted)
   */
  async function getVisibleRewards(currentTier: string): Promise<string[]> {
    const { data: rewards } = await supabase
      .from('rewards')
      .select('id')
      .eq('client_id', testClientId)
      .eq('tier_eligibility', currentTier)
      .eq('enabled', true)
      .eq('reward_source', 'vip_tier');

    return (rewards || []).map(r => r.id);
  }

  // ============================================================================
  // Test Case 1: Platinum user demoted to Gold
  // Basic demotion scenario setup
  // ============================================================================
  describe('Test Case 1: Platinum user demoted to Gold', () => {
    it('should successfully demote user from Platinum to Gold', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Demotion Test Client',
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

      // Setup: Create Platinum user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4', // Platinum
        total_sales: 12000,
      });

      // ACT: Demote user to Gold
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: User is now Gold
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_3');
    });
  });

  // ============================================================================
  // Test Case 2: Unclaimed Platinum VIP redemptions get deleted_at set
  // Per SchemaFinalv2.md lines 621-622
  // ============================================================================
  describe('Test Case 2: Unclaimed VIP redemptions get deleted_at set', () => {
    it('should soft-delete claimable Platinum redemptions on demotion', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Soft Delete Test Client',
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

      // Setup: Create Platinum user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4',
        total_sales: 12000,
      });

      // Setup: Create Platinum VIP reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // Setup: Create claimable redemption for user
      const { data: redemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: platinumReward.id,
          status: 'claimable',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      // Verify redemption was created
      expect(redemption).not.toBeNull();
      const redemptionId = redemption!.id;

      // VERIFY: Before demotion, deleted_at is NULL
      const { data: beforeDemotion } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason')
        .eq('id', redemptionId)
        .eq('client_id', testClientId)
        .single();

      expect(beforeDemotion?.deleted_at).toBeNull();
      expect(beforeDemotion?.deleted_reason).toBeNull();

      // ACT: Demote user
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: After demotion, deleted_at is NOT NULL
      const { data: afterDemotion } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason')
        .eq('id', redemptionId)
        .eq('client_id', testClientId)
        .single();

      expect(afterDemotion?.deleted_at).not.toBeNull();
      expect(afterDemotion?.deleted_reason).toBe('tier_change_tier_4_to_tier_3');
    });
  });

  // ============================================================================
  // Test Case 3: Demoted user no longer sees Platinum rewards in API
  // Per API_CONTRACTS.md: rewards filtered by tier_eligibility = currentTier
  // ============================================================================
  describe('Test Case 3: Demoted user no longer sees Platinum rewards', () => {
    it('should NOT show Platinum rewards to demoted Gold user', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Visibility After Demotion Client',
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

      // Setup: Create rewards for both tiers
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
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // Setup: Create Platinum user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4',
        total_sales: 12000,
      });

      // VERIFY: As Platinum, can see Platinum rewards
      const platinumVisible = await getVisibleRewards('tier_4');
      expect(platinumVisible).toContain(platinumReward.id);

      // ACT: Demote to Gold
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: As Gold, can only see Gold rewards
      const goldVisible = await getVisibleRewards('tier_3');
      expect(goldVisible).toContain(goldReward.id);
      expect(goldVisible).not.toContain(platinumReward.id);
    });
  });

  // ============================================================================
  // Test Case 4: Already-claimed rewards NOT deleted (preserved)
  // Per Loyalty.md line 1885: only "claimable rewards" are soft-deleted
  // ============================================================================
  describe('Test Case 4: Already-claimed rewards NOT deleted', () => {
    it('should preserve claimed redemptions on demotion', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Preserve Claimed Test Client',
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

      // Setup: Create Platinum user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4',
        total_sales: 12000,
      });

      // Setup: Create Platinum VIP reward
      const platinumReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // Setup: Create CLAIMED redemption (already claimed before demotion)
      const { data: claimedRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: platinumReward.id,
          status: 'claimed', // Already claimed!
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
          claimed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      // Setup: Create CLAIMABLE redemption (not yet claimed)
      const { data: claimableRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: platinumReward.id,
          status: 'claimable', // Not yet claimed
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      // Verify redemptions were created
      expect(claimedRedemption).not.toBeNull();
      expect(claimableRedemption).not.toBeNull();
      const claimedId = claimedRedemption!.id;
      const claimableId = claimableRedemption!.id;

      // ACT: Demote user
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: Claimed redemption is NOT deleted
      const { data: claimedAfter } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason, status')
        .eq('id', claimedId)
        .eq('client_id', testClientId)
        .single();

      expect(claimedAfter?.deleted_at).toBeNull(); // Preserved!
      expect(claimedAfter?.deleted_reason).toBeNull();
      expect(claimedAfter?.status).toBe('claimed');

      // ASSERT: Claimable redemption IS deleted
      const { data: claimableAfter } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason, status')
        .eq('id', claimableId)
        .eq('client_id', testClientId)
        .single();

      expect(claimableAfter?.deleted_at).not.toBeNull(); // Soft deleted
      expect(claimableAfter?.deleted_reason).toBe('tier_change_tier_4_to_tier_3');
    });

    it('should preserve fulfilled and concluded redemptions on demotion', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Preserve All States Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tier
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });

      // Setup: Create user and reward
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4',
        total_sales: 12000,
      });

      const reward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      // Create redemptions in various non-claimable states
      const { data: fulfilledRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: reward.id,
          status: 'fulfilled',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      const { data: concludedRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: reward.id,
          status: 'concluded',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      // Verify redemptions were created
      expect(fulfilledRedemption).not.toBeNull();
      expect(concludedRedemption).not.toBeNull();
      const fulfilledId = fulfilledRedemption!.id;
      const concludedId = concludedRedemption!.id;

      // ACT: Demote user
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: Fulfilled NOT deleted
      const { data: fulfilledAfter } = await supabase
        .from('redemptions')
        .select('deleted_at')
        .eq('id', fulfilledId)
        .eq('client_id', testClientId)
        .single();

      expect(fulfilledAfter?.deleted_at).toBeNull();

      // ASSERT: Concluded NOT deleted
      const { data: concludedAfter } = await supabase
        .from('redemptions')
        .select('deleted_at')
        .eq('id', concludedId)
        .eq('client_id', testClientId)
        .single();

      expect(concludedAfter?.deleted_at).toBeNull();
    });
  });

  // ============================================================================
  // Test Case 5: Mission rewards unaffected by demotion
  // Per Loyalty.md: Pattern 6 applies to VIP tier rewards only
  // ============================================================================
  describe('Test Case 5: Mission rewards unaffected by demotion', () => {
    it('should NOT soft-delete mission reward redemptions on demotion', async () => {
      // Setup: Create client
      const client = await createTestClientRecord(supabase, {
        name: 'Mission Rewards Preserved Client',
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

      // Setup: Create Platinum user
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_4',
        total_sales: 12000,
      });

      // Setup: Create mission reward (reward_source = 'mission')
      const missionReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'mission', // NOT 'vip_tier'
        enabled: true,
        value_data: { amount: 25 },
      });

      // Setup: Create mission
      const mission = await createTestMission(supabase, {
        client_id: testClientId,
        reward_id: missionReward.id,
        title: 'Test Mission',
        mission_type: 'sales_dollars',
        target_value: 500,
      });

      // Setup: Create mission progress
      const { data: missionProgress } = await supabase
        .from('mission_progress')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          mission_id: mission.id,
          status: 'completed',
          current_value: 500,
        })
        .select('id')
        .single();

      // Setup: Create mission redemption (has mission_progress_id)
      const { data: missionRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: missionReward.id,
          mission_progress_id: missionProgress?.id, // Links to mission!
          status: 'claimable',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      // Setup: Create VIP redemption (NO mission_progress_id)
      const vipReward = await createTestReward(supabase, {
        client_id: testClientId,
        type: 'gift_card',
        tier_eligibility: 'tier_4',
        reward_source: 'vip_tier',
        enabled: true,
        value_data: { amount: 100 },
      });

      const { data: vipRedemption } = await supabase
        .from('redemptions')
        .insert({
          client_id: testClientId,
          user_id: user.id,
          reward_id: vipReward.id,
          mission_progress_id: null, // VIP reward - no mission
          status: 'claimable',
          tier_at_claim: 'tier_4',
          redemption_type: 'instant',
        })
        .select('id')
        .single();

      // Verify redemptions were created
      expect(missionRedemption).not.toBeNull();
      expect(vipRedemption).not.toBeNull();
      const missionRedemptionId = missionRedemption!.id;
      const vipRedemptionId = vipRedemption!.id;

      // ACT: Demote user
      await demoteUserWithSoftDelete(user.id, 'tier_4', 'tier_3');

      // ASSERT: Mission redemption NOT deleted
      const { data: missionAfter } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason')
        .eq('id', missionRedemptionId)
        .eq('client_id', testClientId)
        .single();

      expect(missionAfter?.deleted_at).toBeNull(); // Preserved!
      expect(missionAfter?.deleted_reason).toBeNull();

      // ASSERT: VIP redemption IS deleted
      const { data: vipAfter } = await supabase
        .from('redemptions')
        .select('deleted_at, deleted_reason')
        .eq('id', vipRedemptionId)
        .eq('client_id', testClientId)
        .single();

      expect(vipAfter?.deleted_at).not.toBeNull(); // Soft deleted
      expect(vipAfter?.deleted_reason).toBe('tier_change_tier_4_to_tier_3');
    });
  });
});
