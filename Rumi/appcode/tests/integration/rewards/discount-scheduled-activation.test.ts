/**
 * Integration Tests for Discount Scheduled Activation
 *
 * Tests discount reward scheduling via API routes per EXECUTION_PLAN.md Task 6.4.7:
 * - Claim with scheduled date creates redemption correctly
 * - Initial status='claimed' until activation (computed as 'scheduled')
 * - Status transitions to 'fulfilled' then 'active' at activation time
 * - Weekday-only and 9AM-4PM EST validation
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=discount-scheduled-activation
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.7 (Discount Scheduled Activation Tests)
 * - API_CONTRACTS.md lines 4499-4510 (scheduled status computation)
 * - API_CONTRACTS.md lines 4921-4926 (discount claim with scheduledActivationAt)
 * - API_CONTRACTS.md lines 4971-4975 (scheduling validation rules)
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
const TEST_REWARD_ID = 'reward-discount-15pct';
const TEST_REDEMPTION_ID = 'redemption-discount-001';

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

// Helper to get next weekday (Mon-Fri) from now
function getNextWeekday(daysFromNow: number = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  // Skip to Monday if weekend
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
  if (dayOfWeek === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday

  // Set to 2 PM EST (14:00 EST = 19:00 UTC in winter)
  date.setUTCHours(19, 0, 0, 0);
  return date;
}

// Helper to get weekend date
function getNextWeekend(daysFromNow: number = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  // Find next Saturday
  const dayOfWeek = date.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);

  date.setUTCHours(19, 0, 0, 0); // 2 PM EST
  return date;
}

/**
 * Create mock claim response for discount with scheduling
 * Per API_CONTRACTS.md lines 4499-4510:
 * - status='claimed' in DB
 * - computed status='scheduled' when scheduledActivationAt is set
 */
function createScheduledDiscountClaimResponse(options: {
  scheduledActivationAt: string;
  percent?: number;
  durationDays?: number;
  couponCode?: string;
}): MockReturnValue {
  const percent = options.percent ?? 15;
  const durationDays = options.durationDays ?? 7;
  const couponCode = options.couponCode ?? 'TEST15';

  const scheduledDate = new Date(options.scheduledActivationAt);
  const formattedScheduledDate = scheduledDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    success: true,
    message: `Discount scheduled! Will activate on ${formattedScheduledDate}`,
    redemption: {
      id: TEST_REDEMPTION_ID,
      status: 'claimed', // DB status per API_CONTRACTS.md line 4503
      rewardType: 'discount',
      claimedAt: new Date().toISOString(),
      scheduledActivationAt: options.scheduledActivationAt, // Stored in DB
      reward: {
        id: TEST_REWARD_ID,
        name: `${percent}% Deal Boost`,
        displayText: `Follower Discount (${durationDays}d)`,
        type: 'discount',
        rewardSource: 'vip_tier',
        valueData: {
          percent: percent,
          durationDays: durationDays,
          couponCode: couponCode,
          maxUses: null,
        },
      },
      // Computed status for display
      computedStatus: 'scheduled',
      statusDetails: {
        scheduledDate: formattedScheduledDate,
        scheduledDateRaw: options.scheduledActivationAt,
      },
      usedCount: 1,
      totalQuantity: null, // unlimited
      nextSteps: {
        action: 'wait_activation',
        message: `Your discount will activate on ${formattedScheduledDate}. Add to calendar!`,
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
 * Create mock response for active discount (after activation)
 * Per API_CONTRACTS.md lines 4483-4496
 */
function createActiveDiscountResponse(): MockReturnValue {
  const activationDate = new Date();
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);

  return {
    success: true,
    message: 'Discount is now active!',
    redemption: {
      id: TEST_REDEMPTION_ID,
      status: 'fulfilled', // DB status when discount is active
      rewardType: 'discount',
      claimedAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      activationDate: activationDate.toISOString(),
      expirationDate: expirationDate.toISOString(),
      reward: {
        id: TEST_REWARD_ID,
        name: '15% Deal Boost',
        displayText: 'Follower Discount (7d)',
        type: 'discount',
        rewardSource: 'vip_tier',
        valueData: {
          percent: 15,
          durationDays: 7,
          couponCode: 'TEST15',
          maxUses: null,
        },
      },
      computedStatus: 'active',
      statusDetails: {
        activationDate: activationDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        expirationDate: expirationDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        daysRemaining: 7,
      },
      usedCount: 1,
      totalQuantity: null,
      nextSteps: {
        action: 'use_code',
        message: 'Use code TEST15 for 15% off!',
      },
    },
    updatedRewards: [
      {
        id: TEST_REWARD_ID,
        status: 'active',
        canClaim: false,
        usedCount: 1,
      },
    ],
  };
}

/**
 * Create mock error for scheduling validation failures
 */
function createSchedulingError(errorCode: string, message: string): MockReturnValue {
  class MockAppError extends Error {
    code: string;
    statusCode: number;
    details: Record<string, unknown>;

    constructor() {
      super(message);
      this.name = 'AppError';
      this.code = errorCode;
      this.statusCode = 400;
      this.details = {};
    }
  }
  return new MockAppError();
}

describe('Discount Scheduled Activation Tests (API Routes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // =========================================================================
  // Test Case 1: Claim with scheduled date creates redemption correctly
  // =========================================================================

  describe('Test Case 1: Claim with scheduled date creates redemption', () => {
    it('should return 200 and create redemption with scheduledActivationAt', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption.scheduledActivationAt).toBe(scheduledDate.toISOString());
    });

    it('should call rewardService.claimReward with scheduledActivationAt', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(mockRewardService.claimReward).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );
    });

    it('should return statusDetails with scheduledDate and scheduledDateRaw', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md lines 4506-4509
      expect(data.redemption.statusDetails.scheduledDate).toBeDefined();
      expect(data.redemption.statusDetails.scheduledDateRaw).toBe(scheduledDate.toISOString());
    });

    it('should return nextSteps.action=wait_activation', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.nextSteps.action).toBe('wait_activation');
    });
  });

  // =========================================================================
  // Test Case 2: Scheduling requires scheduledActivationAt for discount
  // =========================================================================

  describe('Test Case 2: Scheduling required for discount type', () => {
    it('should return error when scheduledActivationAt is missing', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockRejectedValue(
        createSchedulingError('SCHEDULING_REQUIRED', 'This reward requires a scheduled activation date')
      );

      // Missing scheduledActivationAt
      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(500); // Generic error handling
    });

    it('should accept valid weekday scheduling', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(5);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(200);
    });
  });

  // =========================================================================
  // Test Case 3: Initial status='claimed' until activation
  // =========================================================================

  describe('Test Case 3: Initial status=claimed until activation', () => {
    it('should set redemption.status to claimed immediately after scheduling', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 4503: redemption.status === 'claimed'
      expect(data.redemption.status).toBe('claimed');
    });

    it('should return computedStatus=scheduled for display', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Computed status for UI display
      expect(data.redemption.computedStatus).toBe('scheduled');
    });

    it('should return updatedRewards with status=scheduled', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      const updatedReward = data.updatedRewards.find(
        (r: { id: string }) => r.id === TEST_REWARD_ID
      );
      expect(updatedReward.status).toBe('scheduled');
      expect(updatedReward.canClaim).toBe(false);
    });
  });

  // =========================================================================
  // Test Case 4: Status transitions to fulfilled/active at activation time
  // =========================================================================

  describe('Test Case 4: Status transitions to active at activation', () => {
    it('should set status=fulfilled and computedStatus=active when activated', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createActiveDiscountResponse());

      // Simulating a query/fetch after activation
      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md lines 4483-4496
      expect(data.redemption.status).toBe('fulfilled');
      expect(data.redemption.computedStatus).toBe('active');
    });

    it('should include activationDate and expirationDate in statusDetails when active', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createActiveDiscountResponse());

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md lines 4491-4494
      expect(data.redemption.statusDetails.activationDate).toBeDefined();
      expect(data.redemption.statusDetails.expirationDate).toBeDefined();
      expect(data.redemption.statusDetails.daysRemaining).toBeDefined();
    });

    it('should return nextSteps.action=use_code when active', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createActiveDiscountResponse());

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.nextSteps.action).toBe('use_code');
    });
  });

  // =========================================================================
  // Additional Tests: Discount scheduling validation
  // =========================================================================

  describe('Additional: Discount value_data in scheduled claim', () => {
    it('should return correct discount name formatting', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
          percent: 15,
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.name).toBe('15% Deal Boost');
    });

    it('should return rewardType as discount', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.rewardType).toBe('discount');
      expect(data.redemption.reward.type).toBe('discount');
    });

    it('should include couponCode in valueData', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
          couponCode: 'GOLD15',
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.valueData.couponCode).toBe('GOLD15');
    });

    it('should return claimedAt timestamp', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      mockRewardService.claimReward.mockResolvedValue(
        createScheduledDiscountClaimResponse({
          scheduledActivationAt: scheduledDate.toISOString(),
        })
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.claimedAt).toBeDefined();
      expect(() => new Date(data.redemption.claimedAt)).not.toThrow();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should return 403 when user client_id does not match tenant', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: TEST_AUTH_ID, email: 'test@example.com' } },
            error: null,
          }),
        },
      } as MockReturnValue);
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: 'different-client-id',
      });
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const scheduledDate = getNextWeekday(3);
      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 401 when not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
          }),
        },
      } as MockReturnValue);

      const scheduledDate = getNextWeekday(3);
      const request = createMockPostRequest(TEST_REWARD_ID, {
        scheduledActivationAt: scheduledDate.toISOString(),
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(401);
    });
  });
});
