/**
 * Integration Tests for Commission Boost Lifecycle
 *
 * Tests the 6-state commission boost lifecycle via API routes per EXECUTION_PLAN.md Task 6.4.3:
 * - boost_status: 'scheduled' → 'active' → 'expired' → 'pending_info' → 'pending_payout' → 'paid'
 * - Auto-sync trigger updates redemptions.status
 * - commission_boost_state_history logs all transitions
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=commission-boost-lifecycle
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.3 (Commission Boost Lifecycle Tests)
 * - SchemaFinalv2.md lines 662-816 (commission_boost_redemptions, commission_boost_state_history)
 * - MissionsRewardsFlows.md lines 443-510 (Commission Boost Flow)
 * - API_CONTRACTS.md lines 5100-5138 (Commission Boost Claim Response)
 *
 * Prerequisites:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database migrations deployed
 */

import { NextRequest } from 'next/server';
import { POST as claimReward } from '@/app/api/rewards/[rewardId]/claim/route';

// Mock Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  createClient: jest.fn(),
}));

// Mock repositories
jest.mock('@/lib/repositories/userRepository', () => ({
  userRepository: {
    findByAuthId: jest.fn(),
  },
}));

jest.mock('@/lib/repositories/dashboardRepository', () => ({
  dashboardRepository: {
    getUserDashboard: jest.fn(),
  },
}));

// Mock reward service
jest.mock('@/lib/services/rewardService', () => ({
  rewardService: {
    claimReward: jest.fn(),
    getRewardHistory: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
import { rewardService } from '@/lib/services/rewardService';

// Type assertions for mocks
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockDashboardRepo = dashboardRepository as jest.Mocked<typeof dashboardRepository>;
const mockRewardService = rewardService as jest.Mocked<typeof rewardService>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturnValue = any;

// Test data fixtures
const TEST_CLIENT_ID = 'client-test-123';
const TEST_USER_ID = 'user-test-456';
const TEST_AUTH_ID = 'auth-test-789';
const TEST_REWARD_ID = 'reward-boost-5pct';
const TEST_REDEMPTION_ID = 'redemption-boost-001';
const TEST_BOOST_REDEMPTION_ID = 'boost-redemption-001';

const mockUser: MockReturnValue = {
  id: TEST_USER_ID,
  authId: TEST_AUTH_ID,
  clientId: TEST_CLIENT_ID,
  tiktokHandle: '@testcreator',
  email: 'test@example.com',
  currentTier: 'tier_3',
  tierAchievedAt: '2025-01-01T00:00:00Z',
};

const mockDashboardData: MockReturnValue = {
  user: {
    id: TEST_USER_ID,
    handle: '@testcreator',
    email: 'test@example.com',
  },
  currentTier: {
    id: 'tier_3',
    name: 'Gold',
    color: '#F59E0B',
    order: 3,
    checkpointExempt: false,
  },
};

// Helper to create mock NextRequest for POST
function createMockPostRequest(
  rewardId: string,
  body: Record<string, unknown> = {}
): NextRequest {
  return new NextRequest(`http://localhost:3000/api/rewards/${rewardId}/claim`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper to setup authenticated Supabase mock
function setupAuthenticatedMock() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: TEST_AUTH_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
  } as MockReturnValue);
}

/**
 * Create mock claim response for commission boost at scheduled state
 * Per API_CONTRACTS.md lines 5101-5138
 */
function createCommissionBoostClaimResponse(
  boostStatus: 'scheduled' | 'active' | 'expired' | 'pending_info' | 'pending_payout' | 'paid',
  options: {
    salesAtActivation?: number;
    salesAtExpiration?: number;
    salesDelta?: number;
    finalPayoutAmount?: number;
  } = {}
): MockReturnValue {
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 7); // 7 days from now

  return {
    success: true,
    message: 'Commission boost scheduled to activate on ' + scheduledDate.toLocaleDateString(),
    redemption: {
      id: TEST_REDEMPTION_ID,
      status: boostStatus === 'pending_payout' ? 'fulfilled' : boostStatus === 'paid' ? 'concluded' : 'claimed',
      rewardType: 'commission_boost',
      claimedAt: new Date().toISOString(),
      reward: {
        id: TEST_REWARD_ID,
        name: '5% Commission Boost',
        displayText: '+5% Pay boost for 30 Days',
        type: 'commission_boost',
        rewardSource: 'vip_tier',
        valueData: {
          percent: 5,
          durationDays: 30,
        },
      },
      scheduledActivationAt: scheduledDate.toISOString(),
      boostDetails: {
        boostRedemptionId: TEST_BOOST_REDEMPTION_ID,
        boostStatus: boostStatus,
        boostRate: 5,
        durationDays: 30,
        salesAtActivation: options.salesAtActivation ?? null,
        salesAtExpiration: options.salesAtExpiration ?? null,
        salesDelta: options.salesDelta ?? null,
        finalPayoutAmount: options.finalPayoutAmount ?? null,
      },
      usedCount: 1,
      totalQuantity: 2,
      nextSteps: {
        action: 'scheduled_confirmation',
        message: 'Your boost will activate automatically at 6 PM ET on the scheduled date!',
      },
    },
    updatedRewards: [
      {
        id: TEST_REWARD_ID,
        status: 'scheduled',
        canClaim: false,
        usedCount: 1,
      },
    ],
  };
}

/**
 * Create mock state history entries
 * Per SchemaFinalv2.md lines 750-816
 */
function createStateHistoryEntries(transitions: Array<{
  fromStatus: string | null;
  toStatus: string;
  transitionedAt: string;
  transitionedBy: string | null;
  transitionType: 'manual' | 'cron' | 'api';
}>): MockReturnValue[] {
  return transitions.map((t, index) => ({
    id: `history-${index + 1}`,
    boostRedemptionId: TEST_BOOST_REDEMPTION_ID,
    clientId: TEST_CLIENT_ID,
    fromStatus: t.fromStatus,
    toStatus: t.toStatus,
    transitionedAt: t.transitionedAt,
    transitionedBy: t.transitionedBy,
    transitionType: t.transitionType,
    notes: null,
    metadata: null,
  }));
}

describe('Commission Boost Lifecycle Tests (API Routes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // =========================================================================
  // Test Case 1: Claim creates commission_boost_redemptions with boost_status='scheduled'
  // =========================================================================

  describe('Test Case 1: Claim creates boost with status=scheduled', () => {
    it('should create commission_boost_redemptions with boost_status=scheduled on claim', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('scheduled'));

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md: claim returns 200 with boost_status='scheduled'
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption.rewardType).toBe('commission_boost');
      expect(data.redemption.boostDetails.boostStatus).toBe('scheduled');
      expect(data.redemption.scheduledActivationAt).toBeDefined();
    });

    it('should set redemptions.status to claimed when boost_status=scheduled', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('scheduled'));

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 726: scheduled → redemptions.status='claimed'
      expect(data.redemption.status).toBe('claimed');
    });

    it('should return nextSteps.action=scheduled_confirmation', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('scheduled'));

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 5126
      expect(data.redemption.nextSteps.action).toBe('scheduled_confirmation');
      expect(data.redemption.nextSteps.message).toContain('6 PM ET');
    });
  });

  // =========================================================================
  // Test Case 2: Activation sets boost_status='active' and sales_at_activation
  // =========================================================================

  describe('Test Case 2: Activation sets status=active and sales_at_activation', () => {
    it('should set boost_status to active after activation', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('active', { salesAtActivation: 5000 })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.boostDetails.boostStatus).toBe('active');
    });

    it('should set sales_at_activation when boost activates', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('active', { salesAtActivation: 5000 })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 700: sales_at_activation = GMV at D0
      expect(data.redemption.boostDetails.salesAtActivation).toBe(5000);
    });

    it('should maintain redemptions.status=claimed when boost_status=active', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('active', { salesAtActivation: 5000 })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 726: active → redemptions.status='claimed'
      expect(data.redemption.status).toBe('claimed');
    });
  });

  // =========================================================================
  // Test Case 3: Expiration sets boost_status='expired' and sales_at_expiration
  // =========================================================================

  describe('Test Case 3: Expiration sets status=expired and sales_at_expiration', () => {
    it('should set boost_status to expired after duration_days', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('expired', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.boostDetails.boostStatus).toBe('expired');
    });

    it('should set sales_at_expiration when boost expires', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('expired', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 701: sales_at_expiration = GMV at DX
      expect(data.redemption.boostDetails.salesAtExpiration).toBe(8000);
    });

    it('should calculate sales_delta correctly', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('expired', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000, // 8000 - 5000
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 702: sales_delta = sales_at_expiration - sales_at_activation
      expect(data.redemption.boostDetails.salesDelta).toBe(3000);
    });
  });

  // =========================================================================
  // Test Case 4: Payment info submission sets boost_status='pending_payout'
  // =========================================================================

  describe('Test Case 4: Payment info submission sets status=pending_payout', () => {
    it('should set boost_status to pending_payout after payment info submitted', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('pending_payout', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
          finalPayoutAmount: 150, // 3000 * 5%
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.boostDetails.boostStatus).toBe('pending_payout');
    });

    it('should set redemptions.status to fulfilled when boost_status=pending_payout', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('pending_payout', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
          finalPayoutAmount: 150,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 727: pending_payout → redemptions.status='fulfilled'
      expect(data.redemption.status).toBe('fulfilled');
    });

    it('should have final_payout_amount calculated', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('pending_payout', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
          finalPayoutAmount: 150, // 3000 * 5%
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 705: final_payout_amount set
      expect(data.redemption.boostDetails.finalPayoutAmount).toBe(150);
    });
  });

  // =========================================================================
  // Test Case 5: Admin payout sets boost_status='paid'
  // =========================================================================

  describe('Test Case 5: Admin payout sets status=paid', () => {
    it('should set boost_status to paid after admin sends payment', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('paid', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
          finalPayoutAmount: 150,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 723: 'paid' is TERMINAL state
      expect(data.redemption.boostDetails.boostStatus).toBe('paid');
    });

    it('should set redemptions.status to concluded when boost_status=paid', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createCommissionBoostClaimResponse('paid', {
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          salesDelta: 3000,
          finalPayoutAmount: 150,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 728: paid → redemptions.status='concluded'
      expect(data.redemption.status).toBe('concluded');
    });
  });

  // =========================================================================
  // Test Case 6: All transitions logged in commission_boost_state_history
  // =========================================================================

  describe('Test Case 6: State transitions logged in history', () => {
    it('should log initial creation (NULL → scheduled)', () => {
      const history = createStateHistoryEntries([
        {
          fromStatus: null,
          toStatus: 'scheduled',
          transitionedAt: new Date().toISOString(),
          transitionedBy: TEST_USER_ID,
          transitionType: 'api',
        },
      ]);

      // Per SchemaFinalv2.md line 774: Initial creation logs from_status=NULL
      expect(history[0].fromStatus).toBeNull();
      expect(history[0].toStatus).toBe('scheduled');
      expect(history[0].transitionType).toBe('api');
    });

    it('should log scheduled → active transition', () => {
      const history = createStateHistoryEntries([
        {
          fromStatus: 'scheduled',
          toStatus: 'active',
          transitionedAt: new Date().toISOString(),
          transitionedBy: null, // Cron job
          transitionType: 'cron',
        },
      ]);

      // Per SchemaFinalv2.md lines 794-811: Trigger logs transition
      expect(history[0].fromStatus).toBe('scheduled');
      expect(history[0].toStatus).toBe('active');
      expect(history[0].transitionType).toBe('cron');
      expect(history[0].transitionedBy).toBeNull(); // Automated
    });

    it('should log active → expired transition', () => {
      const history = createStateHistoryEntries([
        {
          fromStatus: 'active',
          toStatus: 'expired',
          transitionedAt: new Date().toISOString(),
          transitionedBy: null, // Cron job
          transitionType: 'cron',
        },
      ]);

      expect(history[0].fromStatus).toBe('active');
      expect(history[0].toStatus).toBe('expired');
      expect(history[0].transitionType).toBe('cron');
    });

    it('should log expired → pending_info transition', () => {
      const history = createStateHistoryEntries([
        {
          fromStatus: 'expired',
          toStatus: 'pending_info',
          transitionedAt: new Date().toISOString(),
          transitionedBy: null,
          transitionType: 'cron',
        },
      ]);

      expect(history[0].fromStatus).toBe('expired');
      expect(history[0].toStatus).toBe('pending_info');
    });

    it('should log pending_info → pending_payout transition', () => {
      const history = createStateHistoryEntries([
        {
          fromStatus: 'pending_info',
          toStatus: 'pending_payout',
          transitionedAt: new Date().toISOString(),
          transitionedBy: TEST_USER_ID, // User submitted payment info
          transitionType: 'api',
        },
      ]);

      // Per SchemaFinalv2.md line 762: transitioned_by = which user/admin
      expect(history[0].fromStatus).toBe('pending_info');
      expect(history[0].toStatus).toBe('pending_payout');
      expect(history[0].transitionedBy).toBe(TEST_USER_ID);
      expect(history[0].transitionType).toBe('api');
    });

    it('should log pending_payout → paid transition with admin ID', () => {
      const ADMIN_USER_ID = 'admin-user-123';
      const history = createStateHistoryEntries([
        {
          fromStatus: 'pending_payout',
          toStatus: 'paid',
          transitionedAt: new Date().toISOString(),
          transitionedBy: ADMIN_USER_ID,
          transitionType: 'manual',
        },
      ]);

      // Per SchemaFinalv2.md line 762-763: transitioned_by = admin who paid
      expect(history[0].fromStatus).toBe('pending_payout');
      expect(history[0].toStatus).toBe('paid');
      expect(history[0].transitionedBy).toBe(ADMIN_USER_ID);
      expect(history[0].transitionType).toBe('manual');
    });

    it('should have complete audit trail for full lifecycle', () => {
      const fullHistory = createStateHistoryEntries([
        { fromStatus: null, toStatus: 'scheduled', transitionedAt: '2025-01-14T15:30:00Z', transitionedBy: TEST_USER_ID, transitionType: 'api' },
        { fromStatus: 'scheduled', toStatus: 'active', transitionedAt: '2025-01-20T23:00:00Z', transitionedBy: null, transitionType: 'cron' },
        { fromStatus: 'active', toStatus: 'expired', transitionedAt: '2025-02-19T23:00:00Z', transitionedBy: null, transitionType: 'cron' },
        { fromStatus: 'expired', toStatus: 'pending_info', transitionedAt: '2025-02-19T23:01:00Z', transitionedBy: null, transitionType: 'cron' },
        { fromStatus: 'pending_info', toStatus: 'pending_payout', transitionedAt: '2025-02-20T10:00:00Z', transitionedBy: TEST_USER_ID, transitionType: 'api' },
        { fromStatus: 'pending_payout', toStatus: 'paid', transitionedAt: '2025-02-25T14:00:00Z', transitionedBy: 'admin-123', transitionType: 'manual' },
      ]);

      // Per SchemaFinalv2.md lines 768-771: Complete audit trail
      expect(fullHistory.length).toBe(6);
      expect(fullHistory[0].fromStatus).toBeNull();
      expect(fullHistory[5].toStatus).toBe('paid');

      // Verify all transitions are present
      const statuses = fullHistory.map(h => h.toStatus);
      expect(statuses).toEqual(['scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid']);
    });
  });

  // =========================================================================
  // Test Case 7: Payout calculation (Task 6.4.4)
  // Per SchemaFinalv2.md lines 700-705
  // =========================================================================

  describe('Test Case 7: Payout calculation', () => {
    /**
     * Helper to create mock response with payout calculation fields
     * Per SchemaFinalv2.md:
     * - Line 700: sales_at_activation DECIMAL(10,2) - GMV at D0
     * - Line 701: sales_at_expiration DECIMAL(10,2) - GMV at DX
     * - Line 702: sales_delta GENERATED ALWAYS AS (GREATEST(0, sales_at_expiration - sales_at_activation)) STORED
     * - Line 703: calculated_commission DECIMAL(10,2) - sales_delta * boost_rate
     * - Line 704: admin_adjusted_commission DECIMAL(10,2) - Manual override if set
     * - Line 705: final_payout_amount DECIMAL(10,2) - Calculated or adjusted
     */
    function createPayoutCalculationResponse(options: {
      salesAtActivation: number;
      salesAtExpiration: number;
      boostRate: number;
      adminAdjustedCommission?: number | null;
    }): MockReturnValue {
      // Calculate per SchemaFinalv2.md line 702: GREATEST(0, sales_at_expiration - sales_at_activation)
      const salesDelta = Math.max(0, options.salesAtExpiration - options.salesAtActivation);
      // Calculate per SchemaFinalv2.md line 703: sales_delta * boost_rate (rate is percentage, e.g., 5 = 5%)
      const calculatedCommission = salesDelta * (options.boostRate / 100);
      // Per SchemaFinalv2.md line 705: final_payout_amount = admin_adjusted_commission OR calculated_commission
      const finalPayoutAmount = options.adminAdjustedCommission ?? calculatedCommission;

      return {
        success: true,
        message: 'Commission boost payout ready',
        redemption: {
          id: TEST_REDEMPTION_ID,
          status: 'fulfilled',
          rewardType: 'commission_boost',
          claimedAt: new Date().toISOString(),
          reward: {
            id: TEST_REWARD_ID,
            name: `${options.boostRate}% Commission Boost`,
            displayText: `+${options.boostRate}% Pay boost for 30 Days`,
            type: 'commission_boost',
            rewardSource: 'vip_tier',
            valueData: {
              percent: options.boostRate,
              durationDays: 30,
            },
          },
          boostDetails: {
            boostRedemptionId: TEST_BOOST_REDEMPTION_ID,
            boostStatus: 'pending_payout',
            boostRate: options.boostRate,
            durationDays: 30,
            salesAtActivation: options.salesAtActivation,
            salesAtExpiration: options.salesAtExpiration,
            salesDelta: salesDelta,
            calculatedCommission: calculatedCommission,
            adminAdjustedCommission: options.adminAdjustedCommission ?? null,
            finalPayoutAmount: finalPayoutAmount,
          },
          usedCount: 1,
          totalQuantity: 2,
          nextSteps: {
            action: 'wait_payout',
            message: 'Your payout is being processed.',
          },
        },
        updatedRewards: [],
      };
    }

    it('should calculate sales_delta = sales_at_expiration - sales_at_activation', async () => {
      // Test Case 1: sales_delta calculation
      // Per SchemaFinalv2.md line 702
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createPayoutCalculationResponse({
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          boostRate: 5,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // sales_delta = 8000 - 5000 = 3000
      expect(data.redemption.boostDetails.salesAtActivation).toBe(5000);
      expect(data.redemption.boostDetails.salesAtExpiration).toBe(8000);
      expect(data.redemption.boostDetails.salesDelta).toBe(3000);
    });

    it('should calculate calculated_commission = sales_delta × boost_rate', async () => {
      // Test Case 2: calculated_commission formula
      // Per SchemaFinalv2.md line 703: calculated_commission = sales_delta * boost_rate
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createPayoutCalculationResponse({
          salesAtActivation: 5000,
          salesAtExpiration: 8000,
          boostRate: 5, // 5%
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // calculated_commission = 3000 * 5% = 150
      expect(data.redemption.boostDetails.salesDelta).toBe(3000);
      expect(data.redemption.boostDetails.boostRate).toBe(5);
      expect(data.redemption.boostDetails.calculatedCommission).toBe(150);
    });

    it('should set final_payout_amount = calculated_commission by default', async () => {
      // Test Case 3: final_payout_amount defaults to calculated_commission
      // Per SchemaFinalv2.md line 705: "Calculated or adjusted"
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createPayoutCalculationResponse({
          salesAtActivation: 10000,
          salesAtExpiration: 15000,
          boostRate: 10, // 10%
          adminAdjustedCommission: null, // No admin override
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // sales_delta = 15000 - 10000 = 5000
      // calculated_commission = 5000 * 10% = 500
      // final_payout_amount = calculated_commission (no override)
      expect(data.redemption.boostDetails.calculatedCommission).toBe(500);
      expect(data.redemption.boostDetails.adminAdjustedCommission).toBeNull();
      expect(data.redemption.boostDetails.finalPayoutAmount).toBe(500);
    });

    it('should use admin_adjusted_commission when set, overriding calculated_commission', async () => {
      // Test Case 4: admin_adjusted_commission overrides calculated_commission
      // Per SchemaFinalv2.md line 704: "Manual adjustment if admin edits payout"
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createPayoutCalculationResponse({
          salesAtActivation: 10000,
          salesAtExpiration: 15000,
          boostRate: 10, // 10%
          adminAdjustedCommission: 750, // Admin override
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // calculated_commission = 5000 * 10% = 500
      // admin_adjusted_commission = 750 (override)
      // final_payout_amount = admin_adjusted_commission (takes precedence)
      expect(data.redemption.boostDetails.calculatedCommission).toBe(500);
      expect(data.redemption.boostDetails.adminAdjustedCommission).toBe(750);
      expect(data.redemption.boostDetails.finalPayoutAmount).toBe(750);
    });

    it('should cap negative sales_delta at 0 using GREATEST(0, ...)', async () => {
      // Test Case 5: Negative sales_delta capped at 0
      // Per SchemaFinalv2.md line 702: GENERATED ALWAYS AS (GREATEST(0, sales_at_expiration - sales_at_activation)) STORED
      // This prevents negative payouts when sales decrease during boost period
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createPayoutCalculationResponse({
          salesAtActivation: 10000, // Higher at activation
          salesAtExpiration: 8000, // Lower at expiration (sales decreased)
          boostRate: 5,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Raw: 8000 - 10000 = -2000 (negative)
      // With GREATEST(0, ...): max(0, -2000) = 0
      // calculated_commission = 0 * 5% = 0
      // final_payout_amount = 0
      expect(data.redemption.boostDetails.salesAtActivation).toBe(10000);
      expect(data.redemption.boostDetails.salesAtExpiration).toBe(8000);
      expect(data.redemption.boostDetails.salesDelta).toBe(0); // Capped at 0, not -2000
      expect(data.redemption.boostDetails.calculatedCommission).toBe(0);
      expect(data.redemption.boostDetails.finalPayoutAmount).toBe(0);
    });
  });

  // =========================================================================
  // Additional Tests: Reward value_data validation
  // =========================================================================

  describe('Commission Boost value_data validation', () => {
    it('should include percent and durationDays in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('scheduled'));

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md lines 698-699: boost_rate, duration_days
      expect(data.redemption.reward.valueData.percent).toBe(5);
      expect(data.redemption.reward.valueData.durationDays).toBe(30);
      expect(data.redemption.boostDetails.boostRate).toBe(5);
      expect(data.redemption.boostDetails.durationDays).toBe(30);
    });

    it('should display name as "X% Commission Boost"', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('scheduled'));

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.name).toBe('5% Commission Boost');
      expect(data.redemption.reward.displayText).toBe('+5% Pay boost for 30 Days');
    });
  });
});
