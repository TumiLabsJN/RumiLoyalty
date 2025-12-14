/**
 * Integration Tests for Manual CSV Upload Pipeline (Task 8.4.9)
 *
 * Validates Phase 8 CSV processing helpers work correctly when
 * fed CSV data directly (simulating manual upload scenario).
 *
 * Acceptance Criteria Mapping:
 * - Test Case 1 → Validates parseCruvaCSV() column mapping and data types
 * - Test Case 2 → Validates video insertion with createTestVideo helper
 * - Test Case 2b → Validates handle-based user lookup (mirrors production path)
 * - Test Case 3 → Validates update_precomputed_fields RPC updates user metrics
 * - Test Case 4 → Validates checkForPromotions() triggers tier change
 * - Test Case 5 → Validates client_id isolation (multi-tenant)
 *
 * Design Decisions:
 * - Uses createTestVideo helper (not direct insert) for consistency with existing tests
 * - All DB operations scoped by .eq('client_id', testClientId)
 * - afterEach cleanup via cleanupTestData(supabase, { clientIds: [testClientId] })
 * - RPC called via (supabase.rpc as Function)('update_precomputed_fields', params)
 *
 * References:
 * - GAP-MANUAL-CSV-TEST.md (specification)
 * - GAP-MANUAL-CSV-TEST-IMPL.md (implementation plan)
 * - BUG-TIER-CALC-SERVICE-CLIENT.md (checkForPromotions fix)
 */

import { parseCruvaCSV } from '@/lib/utils/csvParser';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import {
  createTestClientRecord,
  createTestUser,
  createTestTier,
  createTestTierSet,
  createTestVideo,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Note: createTestClient removed per audit feedback (unused import)

// Sample CSV matching CRUVA format (10 columns per CRUVA_COLUMN_MAP)
const SAMPLE_CSV = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@testcreator1,https://tiktok.com/video1,1000,50,10,500.00,2.5,25,2025-01-15,Test Video 1
@testcreator1,https://tiktok.com/video2,2000,100,20,750.00,3.0,35,2025-01-16,Test Video 2
@testcreator2,https://tiktok.com/video3,500,25,5,250.00,1.5,10,2025-01-15,Another Video`;

jest.setTimeout(30000);

describe('Manual CSV Upload Pipeline (Task 8.4.9)', () => {
  let supabase: SupabaseClient<Database>;
  let testClientId: string;

  beforeAll(async () => {
    await assertSupabaseRunning();
    const { createTestClient } = await import('@/tests/helpers');
    supabase = createTestClient();
  });

  afterAll(async () => {
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
    }
  });

  afterEach(async () => {
    // CRITICAL: Clean up test data after each test to prevent cross-test pollution
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
      testClientId = '';
    }
  });

  // ==========================================================================
  // Test Case 1: CSV parsing (validates parseCruvaCSV column mapping)
  // Acceptance Criterion: Parse CSV string → correct ParseResult with typed rows
  // ==========================================================================
  describe('Test Case 1: CSV Parsing', () => {
    it('should parse CSV with correct column mapping and data types', () => {
      // ACT: Parse sample CSV
      const result = parseCruvaCSV(SAMPLE_CSV);

      // ASSERT: Parsing succeeded
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(3);
      expect(result.skippedRows).toBe(0);

      // ASSERT: Column mapping correct (CRUVA headers → database columns)
      expect(result.rows[0].tiktok_handle).toBe('@testcreator1'); // Handle → tiktok_handle
      expect(result.rows[0].video_url).toBe('https://tiktok.com/video1'); // Video → video_url
      expect(result.rows[0].views).toBe(1000); // Views → views (number)
      expect(result.rows[0].gmv).toBe(500.00); // GMV → gmv (number)
      expect(result.rows[0].units_sold).toBe(25); // Units Sold → units_sold (number)
      expect(result.rows[0].post_date).toBe('2025-01-15'); // Post Date → post_date

      // ASSERT: Multiple rows parsed
      expect(result.rows.length).toBe(3);
      expect(result.rows[1].tiktok_handle).toBe('@testcreator1');
      expect(result.rows[2].tiktok_handle).toBe('@testcreator2');
    });
  });

  // ==========================================================================
  // Test Case 2: Video insertion (validates createTestVideo helper)
  // Acceptance Criterion: Parsed rows → videos table with correct data
  // ==========================================================================
  describe('Test Case 2: Video Insertion', () => {
    it('should insert videos from parsed CSV data using test helper', async () => {
      // SETUP: Create test client and user
      const client = await createTestClientRecord(supabase, {
        name: 'CSV Upload Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
      });

      // ACT: Parse CSV and insert videos using helper
      const parseResult = parseCruvaCSV(SAMPLE_CSV);
      const userRows = parseResult.rows.filter(r => r.tiktok_handle === '@testcreator1');

      for (const row of userRows) {
        await createTestVideo(supabase, {
          client_id: testClientId,
          user_id: user.id,
          video_url: row.video_url,
          video_title: row.video_title,
          post_date: row.post_date,
          views: row.views,
          likes: row.likes,
          comments: row.comments,
          gmv: row.gmv,
          ctr: row.ctr,
          units_sold: row.units_sold,
        });
      }

      // ASSERT: Videos exist in database with correct data
      const { data: videos } = await supabase
        .from('videos')
        .select('video_url, gmv, units_sold, views')
        .eq('client_id', testClientId) // Multi-tenant filter
        .eq('user_id', user.id);

      expect(videos).toHaveLength(2);
      expect(videos?.find(v => v.video_url === 'https://tiktok.com/video1')?.gmv).toBe(500.00);
      expect(videos?.find(v => v.video_url === 'https://tiktok.com/video2')?.gmv).toBe(750.00);
    });
  });

  // ==========================================================================
  // Test Case 2b: Handle-based user lookup (mirrors real ingestion path)
  // Acceptance Criterion: CSV tiktok_handle → find user → insert video for that user
  // Per Audit: Validates findUserByTiktokHandle pattern used in production
  // ==========================================================================
  describe('Test Case 2b: Handle-Based User Lookup', () => {
    it('should find user by tiktok_handle from CSV and insert video', async () => {
      // SETUP: Create test client and user with known handle
      const client = await createTestClientRecord(supabase, {
        name: 'Handle Lookup Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      const knownHandle = '@testcreator1';
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: knownHandle,
        current_tier: 'tier_1',
      });

      // ACT: Parse CSV, find user by handle (simulating findUserByTiktokHandle)
      const parseResult = parseCruvaCSV(SAMPLE_CSV);
      const csvRow = parseResult.rows.find(r => r.tiktok_handle === knownHandle);
      expect(csvRow).toBeDefined();

      // Simulate findUserByTiktokHandle: query user by tiktok_handle
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, tiktok_handle')
        .eq('client_id', testClientId) // Multi-tenant filter
        .eq('tiktok_handle', knownHandle)
        .single();

      expect(foundUser).toBeDefined();
      expect(foundUser?.tiktok_handle).toBe(knownHandle);

      // Insert video for the found user (using user_id from lookup)
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: foundUser!.id,
        video_url: csvRow!.video_url,
        video_title: csvRow!.video_title,
        gmv: csvRow!.gmv,
        units_sold: csvRow!.units_sold,
      });

      // ASSERT: Video linked to correct user via handle lookup
      const { data: videos } = await supabase
        .from('videos')
        .select('video_url, user_id')
        .eq('client_id', testClientId)
        .eq('user_id', foundUser!.id);

      expect(videos).toHaveLength(1);
      expect(videos?.[0].video_url).toBe(csvRow!.video_url);
    });
  });

  // ==========================================================================
  // Test Case 3: Metrics update via RPC (validates update_precomputed_fields)
  // Acceptance Criterion: After video insert → user.total_sales = SUM(videos.gmv)
  // ==========================================================================
  describe('Test Case 3: Metrics Update via RPC', () => {
    it('should update user precomputed fields after calling RPC', async () => {
      // SETUP: Create client, tiers, user
      const client = await createTestClientRecord(supabase, {
        name: 'Metrics RPC Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      await createTestTierSet(supabase, testClientId);

      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
        total_sales: 0, // Start at 0
      });

      // ACT: Insert videos with known GMV values
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/test-video-1',
        gmv: 500.00,
        units_sold: 25,
      });
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/test-video-2',
        gmv: 750.00,
        units_sold: 35,
      });

      // ACT: Call RPC to update precomputed fields
      // Signature: update_precomputed_fields(p_client_id UUID, p_user_ids UUID[] DEFAULT NULL)
      const { error: rpcError } = await (supabase.rpc as Function)(
        'update_precomputed_fields',
        { p_client_id: testClientId, p_user_ids: [user.id] }
      );

      expect(rpcError).toBeNull();

      // ASSERT: User metrics updated correctly
      const { data: updatedUser } = await supabase
        .from('users')
        .select('total_sales, total_units, checkpoint_sales_current')
        .eq('id', user.id)
        .eq('client_id', testClientId) // Multi-tenant filter
        .single();

      expect(Number(updatedUser?.total_sales)).toBe(1250.00); // 500 + 750
      expect(Number(updatedUser?.total_units)).toBe(60); // 25 + 35
    });
  });

  // ==========================================================================
  // Test Case 4: Tier promotion (validates checkForPromotions)
  // Acceptance Criterion: User crosses threshold → current_tier updated
  // ==========================================================================
  describe('Test Case 4: Tier Promotion', () => {
    it('should trigger tier promotion when sales exceed threshold', async () => {
      // SETUP: Create client with tiers
      const client = await createTestClientRecord(supabase, {
        name: 'Tier Promotion Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Create tiers: tier_1 (0), tier_2 (1000), tier_3 (3000)
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

      // Create user at tier_1 with 0 sales
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
        total_sales: 0,
      });

      // ACT: Add videos that push sales over tier_2 threshold (1000)
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/promo-video-1',
        gmv: 600.00,
      });
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/promo-video-2',
        gmv: 600.00,
      });

      // Call RPC to update metrics (total_sales = 1200)
      await (supabase.rpc as Function)('update_precomputed_fields', {
        p_client_id: testClientId,
        p_user_ids: [user.id],
      });

      // Verify total_sales updated before promotion check
      const { data: beforePromo } = await supabase
        .from('users')
        .select('total_sales, current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(Number(beforePromo?.total_sales)).toBe(1200);
      expect(beforePromo?.current_tier).toBe('tier_1'); // Not promoted yet

      // ACT: Call checkForPromotions (this is the tier calculation service)
      const promotionResult = await checkForPromotions(testClientId);

      // ASSERT: User promoted to tier_2
      const { data: afterPromo } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(afterPromo?.current_tier).toBe('tier_2');
      expect(promotionResult.usersPromoted).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Test Case 5: Multi-tenant isolation (validates client_id scoping)
  // Acceptance Criterion: Operations on client A do NOT affect client B
  // ==========================================================================
  describe('Test Case 5: Multi-tenant Isolation', () => {
    let clientBId: string;

    afterEach(async () => {
      // Clean up Client B separately
      if (clientBId) {
        await cleanupTestData(supabase, { clientIds: [clientBId] });
        clientBId = '';
      }
    });

    it('should only affect videos/users for specified client_id', async () => {
      // SETUP: Create two separate clients
      const clientA = await createTestClientRecord(supabase, {
        name: 'Client A',
        vip_metric: 'sales',
      });
      testClientId = clientA.id;

      const clientB = await createTestClientRecord(supabase, {
        name: 'Client B',
        vip_metric: 'sales',
      });
      clientBId = clientB.id;

      // Create tiers for Client A only
      await createTestTierSet(supabase, testClientId);

      // Create users in each client
      const userA = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@creatorA',
        total_sales: 0,
      });
      const userB = await createTestUser(supabase, {
        client_id: clientBId,
        tiktok_handle: '@creatorB',
        total_sales: 0,
      });

      // ACT: Add videos only to Client A's user
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: userA.id,
        video_url: 'https://tiktok.com/clientA-video',
        gmv: 1000.00,
      });

      // Call RPC for Client A only
      await (supabase.rpc as Function)('update_precomputed_fields', {
        p_client_id: testClientId,
        p_user_ids: [userA.id],
      });

      // ASSERT: Client A's user updated
      const { data: userAAfter } = await supabase
        .from('users')
        .select('total_sales')
        .eq('id', userA.id)
        .eq('client_id', testClientId)
        .single();

      expect(Number(userAAfter?.total_sales)).toBe(1000);

      // ASSERT: Client B's user NOT affected (still 0)
      const { data: userBAfter } = await supabase
        .from('users')
        .select('total_sales')
        .eq('id', userB.id)
        .eq('client_id', clientBId)
        .single();

      expect(Number(userBAfter?.total_sales)).toBe(0);
    });
  });
});
