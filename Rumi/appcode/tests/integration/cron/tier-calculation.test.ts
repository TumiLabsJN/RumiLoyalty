/**
 * Integration Tests for Tier Calculation - Threshold Boundaries
 *
 * Tests that tier calculation uses correct >= threshold comparison
 * by calling the PRODUCTION checkForPromotions() service function.
 *
 * IMPORTANT: Uses LOCAL Supabase instance (requires `npx supabase start`).
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=tier-calculation
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.4.5 (Test tier calculation correct thresholds)
 * - SchemaFinalv2.md lines 254-272 (tiers table with sales_threshold, units_threshold)
 * - Loyalty.md lines 1580-1609 (Tier Calculation Logic: >= threshold comparison)
 * - tierCalculationService.ts checkForPromotions() (production function)
 *
 * Test Cases (per EXECUTION_PLAN.md Task 8.4.5):
 * 1. 999 < 1000 stays at current tier (below threshold)
 * 2. Exactly 1000 promotes to next tier (>= threshold)
 * 3. 1001 promotes to next tier (> threshold)
 * 4. vip_metric='sales' uses sales_threshold
 * 5. vip_metric='units' uses units_threshold
 *
 * Prerequisites:
 *   - Local Supabase running: `cd appcode && npx supabase start`
 *   - Database migrations applied
 *
 * GAP FIX: GAP-TIER-CALC-TEST
 * This file was rewritten to call production checkForPromotions()
 * instead of a local helper function.
 */

import {
  createTestClient,
  createTestClientRecord,
  createTestUser,
  createTestTier,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Test timeout for database operations
jest.setTimeout(30000);

describe('Tier Calculation - Threshold Boundaries (Task 8.4.5)', () => {
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
    // Cleanup after each test - uses existing cleanupTestData helper
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
      testClientId = ''; // Reset for next test
    }
  });

  // ============================================================================
  // Test Case 1: 999 < 1000 stays at current tier
  // Per Loyalty.md line 1594: >= threshold means 999 fails threshold of 1000
  // ============================================================================
  describe('Test Case 1: Below threshold (999 < 1000)', () => {
    it('should NOT promote user when total_sales is 999 and Silver threshold is 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Below',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers with known thresholds
      // tier_1 (Bronze): threshold 0
      // tier_2 (Silver): threshold 1000
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });

      // Setup: Create user at tier_1 with total_sales = 999
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 999, // Below Silver threshold of 1000
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: No promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(0);
      expect(result.promotions).toHaveLength(0);

      // VERIFY: User tier unchanged in database (with client_id filter for multi-tenant safety)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_1');
    });
  });

  // ============================================================================
  // Test Case 2: Exactly 1000 promotes (>= threshold)
  // Per Loyalty.md line 1594: if (checkpointValue >= threshold)
  // ============================================================================
  describe('Test Case 2: Exactly at threshold (1000 >= 1000)', () => {
    it('should promote user when total_sales is exactly 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Exact',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });

      // Setup: Create user at tier_1 with total_sales = 1000 (exactly at threshold)
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 1000, // Exactly at Silver threshold
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed in database (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });
  });

  // ============================================================================
  // Test Case 3: 1001 promotes (> threshold)
  // Per Loyalty.md line 1594: >= means 1001 > 1000 passes
  // ============================================================================
  describe('Test Case 3: Above threshold (1001 > 1000)', () => {
    it('should promote user when total_sales is 1001', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Above',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });

      // Setup: Create user at tier_1 with total_sales = 1001
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 1001, // Above Silver threshold
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed in database (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });

    it('should find highest qualifying tier when value exceeds multiple thresholds', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Multi',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create 4-tier setup
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });
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

      // Setup: Create user at tier_1 with total_sales = 5000 (exceeds Silver AND Gold)
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 5000, // Exceeds Gold (3000) but not Platinum (10000)
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promoted to Gold (highest qualifying)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_3'); // Gold, not Silver

      // VERIFY: User tier changed to Gold (with client_id filter)
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
  // Test Case 4: vip_metric='sales' uses sales_threshold
  // Per Loyalty.md lines 1590-1592: vip_metric determines threshold field
  // ============================================================================
  describe('Test Case 4: vip_metric=sales uses sales_threshold', () => {
    it('should use sales_threshold when client vip_metric is sales', async () => {
      // Setup: Create client with SALES mode
      const client = await createTestClientRecord(supabase, {
        name: 'Sales Mode Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers with DIFFERENT sales and units thresholds
      // This proves we're using the correct field
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000, // Sales threshold is HIGH
        units_threshold: 50, // Units threshold is LOW
      });

      // Setup: Create user with total_sales = 500 (below sales 1000, above units 50)
      // In SALES mode, user should NOT be promoted
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 500, // Below sales_threshold (1000)
        total_units: 100, // Above units_threshold (50) - but shouldn't matter
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: NO promotion (because sales_threshold used, not units_threshold)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(0);

      // VERIFY: User tier unchanged (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_1');
    });
  });

  // ============================================================================
  // Test Case 5: vip_metric='units' uses units_threshold
  // Per Loyalty.md lines 1590-1592: vip_metric determines threshold field
  // ============================================================================
  describe('Test Case 5: vip_metric=units uses units_threshold', () => {
    it('should use units_threshold when client vip_metric is units', async () => {
      // Setup: Create client with UNITS mode
      const client = await createTestClientRecord(supabase, {
        name: 'Units Mode Client',
        vip_metric: 'units',
      });
      testClientId = client.id;

      // Setup: Create tiers with DIFFERENT sales and units thresholds
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000, // Sales threshold is HIGH
        units_threshold: 50, // Units threshold is LOW
      });

      // Setup: Create user with total_units = 100 (above units 50, below sales 1000)
      // In UNITS mode, user SHOULD be promoted
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 100, // Below sales_threshold (1000) - but shouldn't matter
        total_units: 100, // Above units_threshold (50)
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred (because units_threshold used)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });

    it('should correctly differentiate between sales and units mode', async () => {
      // Setup: Create TWO clients - one in each mode
      const salesClient = await createTestClientRecord(supabase, {
        name: 'Sales Mode Test',
        vip_metric: 'sales',
      });

      const unitsClient = await createTestClientRecord(supabase, {
        name: 'Units Mode Test',
        vip_metric: 'units',
      });

      // Create identical tiers for BOTH clients
      for (const clientId of [salesClient.id, unitsClient.id]) {
        await createTestTier(supabase, {
          client_id: clientId,
          tier_id: 'tier_1',
          tier_name: 'Bronze',
          tier_order: 1,
          sales_threshold: 0,
          units_threshold: 0,
        });
        await createTestTier(supabase, {
          client_id: clientId,
          tier_id: 'tier_2',
          tier_name: 'Silver',
          tier_order: 2,
          sales_threshold: 1000,
          units_threshold: 100,
        });
      }

      // Create user in SALES client with value 500
      const salesUser = await createTestUser(supabase, {
        client_id: salesClient.id,
        current_tier: 'tier_1',
        total_sales: 500, // Below 1000
        total_units: 500, // Above 100 - but shouldn't matter
      });

      // Create user in UNITS client with value 500
      const unitsUser = await createTestUser(supabase, {
        client_id: unitsClient.id,
        current_tier: 'tier_1',
        total_sales: 500, // Below 1000 - but shouldn't matter
        total_units: 500, // Above 100
      });

      // ACT: Call PRODUCTION service for BOTH clients
      const salesResult = await checkForPromotions(salesClient.id);
      const unitsResult = await checkForPromotions(unitsClient.id);

      // ASSERT: Different outcomes based on vip_metric
      expect(salesResult.usersPromoted).toBe(0); // 500 < 1000 sales
      expect(unitsResult.usersPromoted).toBe(1); // 500 >= 100 units

      // VERIFY in database (with client_id filters)
      const { data: salesUserAfter } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', salesUser.id)
        .eq('client_id', salesClient.id)
        .single();

      const { data: unitsUserAfter } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', unitsUser.id)
        .eq('client_id', unitsClient.id)
        .single();

      expect(salesUserAfter?.current_tier).toBe('tier_1'); // NOT promoted
      expect(unitsUserAfter?.current_tier).toBe('tier_2'); // Promoted

      // Cleanup both clients
      await cleanupTestData(supabase, { clientIds: [salesClient.id, unitsClient.id] });
      testClientId = ''; // Clear to avoid double cleanup
    });
  });
});
