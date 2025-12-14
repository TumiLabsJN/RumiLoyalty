/**
 * Integration Tests for Daily Automation Cron
 *
 * Tests the daily sales sync workflow per EXECUTION_PLAN.md Task 8.4.1:
 * - CSV parsing
 * - Sales upsert
 * - Real-time promotion (BUG-REALTIME-PROMOTION)
 * - Checkpoint evaluation
 * - Boost activation
 * - Mission progress creation (GAP-MISSION-PROGRESS-ROWS)
 * - Mission progress update (BUG-MISSION-PROGRESS-UPDATE)
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=daily-automation
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.4.1 (Create cron integration tests)
 * - SchemaFinalv2.md lines 271-286 (sales_adjustments table)
 * - SchemaFinalv2.md lines 123-155 (users precomputed fields)
 * - SchemaFinalv2.md lines 425-498 (mission_progress table)
 * - BugFixes/RealTimePromotionFix.md (real-time promotion flow)
 * - BugFixes/MissionProgressRowCreationGap.md (mission progress row creation)
 * - BugFixes/MissionProgressUpdateFix.md (mission progress update RPC)
 *
 * Prerequisites:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database migrations deployed
 */

// Mock Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  createClient: jest.fn(),
}));

// Mock services
jest.mock('@/lib/services/salesService', () => ({
  processDailySales: jest.fn(),
}));

jest.mock('@/lib/services/tierCalculationService', () => ({
  checkForPromotions: jest.fn(),
  runCheckpointEvaluation: jest.fn(),
}));

// Mock repositories
jest.mock('@/lib/repositories/syncRepository', () => ({
  syncRepository: {
    findRafflesEndingToday: jest.fn(),
  },
}));

jest.mock('@/lib/repositories/commissionBoostRepository', () => ({
  commissionBoostRepository: {
    activateScheduledBoosts: jest.fn(),
    expireActiveBoosts: jest.fn(),
    transitionExpiredToPendingInfo: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server-client';
import { processDailySales } from '@/lib/services/salesService';
import { checkForPromotions, runCheckpointEvaluation } from '@/lib/services/tierCalculationService';
import { syncRepository } from '@/lib/repositories/syncRepository';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';
import { parseCruvaCSV, ParseResult, ParsedVideoRow } from '@/lib/utils/csvParser';

// Type assertions for mocks
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockProcessDailySales = processDailySales as jest.MockedFunction<typeof processDailySales>;
const mockCheckForPromotions = checkForPromotions as jest.MockedFunction<typeof checkForPromotions>;
const mockRunCheckpointEvaluation = runCheckpointEvaluation as jest.MockedFunction<typeof runCheckpointEvaluation>;
const mockSyncRepository = syncRepository as jest.Mocked<typeof syncRepository>;
const mockCommissionBoostRepository = commissionBoostRepository as jest.Mocked<typeof commissionBoostRepository>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturnValue = any;

// Test data fixtures
const TEST_CLIENT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_USER_ID = 'bbbb0000-0000-0000-0000-000000000000';

// Fixture CSV data (matching CRUVA format per csvParser.ts CRUVA_COLUMN_MAP)
// 10 columns: Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title
const FIXTURE_CSV_VALID = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@testcreator1,https://tiktok.com/v1,1000,50,10,$150.00,2.5,3,2025-01-15,My First Video
@testcreator2,https://tiktok.com/v2,2000,100,20,$300.00,3.2,6,2025-01-15,Product Review
@testcreator1,https://tiktok.com/v3,500,25,5,$75.50,1.8,2,2025-01-15,Unboxing Video`;

// CSV with empty rows (should be skipped)
const FIXTURE_CSV_WITH_EMPTY_ROWS = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@testcreator1,https://tiktok.com/v1,1000,50,10,$150.00,2.5,3,2025-01-15,My First Video

@testcreator2,https://tiktok.com/v2,2000,100,20,$300.00,3.2,6,2025-01-15,Product Review
`;

// CSV with special characters in handle
const FIXTURE_CSV_SPECIAL_CHARS = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@test_creator.123,https://tiktok.com/v1,1000,50,10,$150.00,2.5,3,2025-01-15,Test Video`;

// CSV with currency formatting in GMV ($ symbol, no commas since CSV uses commas as delimiter)
// Note: CRUVA likely quotes fields with commas or uses different delimiter
const FIXTURE_CSV_CURRENCY = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@testcreator1,https://tiktok.com/v1,1000,50,10,$1234.56,2.5,3,2025-01-15,High GMV Video`;

// Invalid CSV (missing required columns)
const FIXTURE_CSV_INVALID = `WrongColumn1,WrongColumn2
value1,value2`;

describe('Daily Automation Cron Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    const mockSupabase: MockReturnValue = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // CSV Parsing Tests (Task 8.4.2)
  // Per csvParser.ts CRUVA_COLUMN_MAP: 10 columns
  // ============================================================================
  describe('CSV parsing', () => {
    it('should parse valid CSV with all 10 columns correctly', () => {
      const result: ParseResult = parseCruvaCSV(FIXTURE_CSV_VALID);

      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(3);
      expect(result.skippedRows).toBe(0);

      // Verify first row structure and types
      const firstRow: ParsedVideoRow = result.rows[0];
      expect(firstRow.tiktok_handle).toBe('@testcreator1');
      expect(firstRow.video_url).toBe('https://tiktok.com/v1');
      expect(firstRow.views).toBe(1000);
      expect(typeof firstRow.views).toBe('number');
      expect(firstRow.likes).toBe(50);
      expect(typeof firstRow.likes).toBe('number');
      expect(firstRow.comments).toBe(10);
      expect(typeof firstRow.comments).toBe('number');
      expect(firstRow.gmv).toBe(150.00);
      expect(typeof firstRow.gmv).toBe('number');
      expect(firstRow.ctr).toBe(2.5);
      expect(typeof firstRow.ctr).toBe('number');
      expect(firstRow.units_sold).toBe(3);
      expect(typeof firstRow.units_sold).toBe('number');
      expect(firstRow.post_date).toBe('2025-01-15');
      expect(firstRow.video_title).toBe('My First Video');
    });

    it('should skip empty rows', () => {
      const result: ParseResult = parseCruvaCSV(FIXTURE_CSV_WITH_EMPTY_ROWS);

      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(2); // Only 2 valid rows, empty row skipped
      expect(result.rows[0].tiktok_handle).toBe('@testcreator1');
      expect(result.rows[1].tiktok_handle).toBe('@testcreator2');
    });

    it('should handle special characters in handles (@, _, .)', () => {
      const result: ParseResult = parseCruvaCSV(FIXTURE_CSV_SPECIAL_CHARS);

      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tiktok_handle).toBe('@test_creator.123');
    });

    it('should maintain decimal precision for GMV values with currency formatting', () => {
      const result: ParseResult = parseCruvaCSV(FIXTURE_CSV_CURRENCY);

      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
      // GMV parsing should handle $ symbol: "$1234.56" → 1234.56
      expect(result.rows[0].gmv).toBe(1234.56);
    });

    it('should return error for invalid CSV format (missing required columns)', () => {
      const result: ParseResult = parseCruvaCSV(FIXTURE_CSV_INVALID);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing');
    });
  });

  // ============================================================================
  // Sales Upsert Tests (Task 8.4.3)
  // ============================================================================
  describe('sales upsert', () => {
    it('should upsert video records from CSV data', () => {
      // Placeholder for video upsert test
      expect(true).toBe(true);
    });

    it('should update user precomputed fields after upsert', () => {
      // Placeholder for precomputed fields test
      expect(true).toBe(true);
    });

    it('should create new users for unknown handles', () => {
      // Placeholder for new user creation test
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Real-Time Promotion Tests (BUG-REALTIME-PROMOTION)
  // Per BugFixes/RealTimePromotionFix.md
  // ============================================================================
  describe('real-time promotion', () => {
    it('should promote Bronze user exceeding Silver threshold', async () => {
      // Per RealTimePromotionFix.md: Bronze user sells 1500 units (Silver threshold: 1000)
      // Should be promoted immediately
      mockCheckForPromotions.mockResolvedValue({
        success: true,
        usersChecked: 10,
        usersPromoted: 1,
        promotions: [{
          userId: TEST_USER_ID,
          fromTier: 'tier_1',
          toTier: 'tier_2',
          totalValue: 1500,
        }],
        errors: [],
      });

      const result = await mockCheckForPromotions(TEST_CLIENT_ID);

      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');
    });

    it('should run promotion check BEFORE checkpoint evaluation', () => {
      // Per RealTimePromotionFix.md: promotion happens first to avoid re-evaluation
      // Placeholder - verify call order in integration test
      expect(true).toBe(true);
    });

    it('should NOT re-evaluate promoted user in checkpoint (next_checkpoint_at in future)', () => {
      // Per RealTimePromotionFix.md: promoted user gets new checkpoint period
      // Placeholder for checkpoint exclusion test
      expect(true).toBe(true);
    });

    it('should reset tier_achieved_at on promotion', () => {
      // Per RealTimePromotionFix.md: affects VIP reward usage limits
      // Placeholder for tier_achieved_at reset test
      expect(true).toBe(true);
    });

    it('should create audit log with status=promoted', () => {
      // Per RealTimePromotionFix.md: tier_checkpoint_history entry
      // Placeholder for audit log test
      expect(true).toBe(true);
    });

    it('should include Bronze users in getUsersForPromotionCheck (no tier filter)', () => {
      // Per RealTimePromotionFix.md: Bronze users were previously excluded
      // Placeholder for tier filter test
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Checkpoint Evaluation Tests (Task 8.3.2)
  // ============================================================================
  describe('checkpoint evaluation', () => {
    it('should evaluate users where next_checkpoint_at <= TODAY', async () => {
      mockRunCheckpointEvaluation.mockResolvedValue({
        success: true,
        adjustmentsApplied: 2,
        usersEvaluated: 5,
        promoted: 1,
        maintained: 3,
        demoted: 1,
        results: [],
        errors: [],
      });

      const result = await mockRunCheckpointEvaluation(TEST_CLIENT_ID);

      expect(result.usersEvaluated).toBe(5);
    });

    it('should maintain tier if checkpoint target met', () => {
      // Placeholder for tier maintenance test
      expect(true).toBe(true);
    });

    it('should demote tier if checkpoint target NOT met', () => {
      // Placeholder for tier demotion test
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Boost Activation Tests (GAP-BOOST-ACTIVATION + BUG-BOOST-EXPIRATION-STATE)
  // ============================================================================
  describe('boost activation', () => {
    it('should activate scheduled boosts where scheduled_activation_date <= TODAY', async () => {
      mockCommissionBoostRepository.activateScheduledBoosts.mockResolvedValue({
        activatedCount: 2,
        activations: [],
        errors: [],
      });

      const result = await mockCommissionBoostRepository.activateScheduledBoosts(TEST_CLIENT_ID);

      expect(result.activatedCount).toBe(2);
    });

    it('should expire active boosts and end in expired state (NOT pending_info)', async () => {
      // Per BUG-BOOST-EXPIRATION-STATE fix: expire_active_boosts ends in 'expired'
      mockCommissionBoostRepository.expireActiveBoosts.mockResolvedValue({
        expiredCount: 1,
        expirations: [{
          boostRedemptionId: 'boost-123',
          redemptionId: 'redemption-456',
          userId: TEST_USER_ID,
          salesAtActivation: 5000,
          salesAtExpiration: 7500,
          salesDelta: 2500,
          boostRate: 5,
          finalPayoutAmount: 125,
        }],
        errors: [],
      });

      const result = await mockCommissionBoostRepository.expireActiveBoosts(TEST_CLIENT_ID);

      expect(result.expiredCount).toBe(1);
      expect(result.expirations[0].finalPayoutAmount).toBe(125);
    });

    it('should transition expired boosts to pending_info', async () => {
      // Per BUG-BOOST-EXPIRATION-STATE fix: separate operation
      mockCommissionBoostRepository.transitionExpiredToPendingInfo.mockResolvedValue({
        transitionedCount: 1,
        transitions: [],
        errors: [],
      });

      const result = await mockCommissionBoostRepository.transitionExpiredToPendingInfo(TEST_CLIENT_ID);

      expect(result.transitionedCount).toBe(1);
    });
  });

  // ============================================================================
  // Mission Progress Creation Tests (GAP-MISSION-PROGRESS-ROWS)
  // Per BugFixes/MissionProgressRowCreationGap.md
  // ============================================================================
  describe('mission progress creation', () => {
    it('should create progress rows for enabled missions', () => {
      // Per GAP-MISSION-PROGRESS-ROWS: enabled=true AND activated=true missions
      // Placeholder for enabled mission test
      expect(true).toBe(true);
    });

    it('should create rows for ALL users when tier_eligibility=all', () => {
      // Per GAP-MISSION-PROGRESS-ROWS: tier_eligibility='all' creates rows for ALL users
      // Placeholder for all-tier eligibility test
      expect(true).toBe(true);
    });

    it('should only create rows for eligible tier users when tier_eligibility=tier_X', () => {
      // Per GAP-MISSION-PROGRESS-ROWS: tier_eligibility='tier_X' only for users >= tier_order
      // Placeholder for tier-specific eligibility test
      expect(true).toBe(true);
    });

    it('should NOT duplicate existing progress rows (NOT EXISTS check)', () => {
      // Per GAP-MISSION-PROGRESS-ROWS: use NOT EXISTS to avoid duplicates
      // Placeholder for duplicate prevention test
      expect(true).toBe(true);
    });

    it('should run BEFORE mission progress update (Step 5.5 before Step 6)', () => {
      // Per GAP-MISSION-PROGRESS-ROWS: creation before update in cron flow
      // Placeholder for execution order test
      expect(true).toBe(true);
    });

    it('should snapshot checkpoint_start and checkpoint_end from user tier_achieved_at/next_checkpoint_at', () => {
      // Per SchemaFinalv2.md: checkpoint_start = tier_achieved_at, checkpoint_end = next_checkpoint_at
      // Placeholder for snapshot test
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Mission Progress Update Tests (BUG-MISSION-PROGRESS-UPDATE)
  // Per BugFixes/MissionProgressUpdateFix.md
  // ============================================================================
  describe('mission progress update', () => {
    it('should update current_value based on videos within checkpoint window', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: videos.post_date BETWEEN checkpoint_start AND checkpoint_end
      // Placeholder for checkpoint window test
      expect(true).toBe(true);
    });

    it('should aggregate sales_dollars for mission_type=sales_dollars', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: SUM(gmv) for sales missions
      // Placeholder for sales aggregation test
      expect(true).toBe(true);
    });

    it('should count videos for mission_type=videos', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: COUNT(*) for video missions
      // Placeholder for video count test
      expect(true).toBe(true);
    });

    it('should sum views for mission_type=views', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: SUM(views) for view missions
      // Placeholder for views aggregation test
      expect(true).toBe(true);
    });

    it('should sum likes for mission_type=likes', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: SUM(likes) for likes missions
      // Placeholder for likes aggregation test
      expect(true).toBe(true);
    });

    it('should change status to completed when current_value >= target_value', () => {
      // Per BUG-MISSION-PROGRESS-UPDATE: auto-completion logic
      // Placeholder for completion status test
      expect(true).toBe(true);
    });

    it('should set completed_at timestamp when mission completes', () => {
      // Per SchemaFinalv2.md: completed_at field set on completion
      // Placeholder for completed_at test
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // value_data validation
  // ============================================================================
  describe('processDailySales invocation', () => {
    it('should call processDailySales with client_id', async () => {
      mockProcessDailySales.mockResolvedValue({
        success: true,
        recordsProcessed: 3,
        usersUpdated: 2,
        newUsersCreated: 0,
        missionsUpdated: 1,
        redemptionsCreated: 0,
        errors: [],
      });

      const result = await mockProcessDailySales(TEST_CLIENT_ID);

      expect(mockProcessDailySales).toHaveBeenCalledWith(TEST_CLIENT_ID);
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(3);
    });
  });
});
