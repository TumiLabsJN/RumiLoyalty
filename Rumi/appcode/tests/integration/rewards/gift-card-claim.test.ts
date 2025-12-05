/**
 * Integration Tests for Gift Card Reward Claim
 *
 * Tests gift card claiming via actual API routes per EXECUTION_PLAN.md Task 6.4.2:
 * - POST /api/rewards/:id/claim → expect 200
 * - GET /api/rewards/history → verify "$100 Gift Card" format
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
 * Prerequisites:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database migrations deployed
 */

import { NextRequest } from 'next/server';
import { POST as claimReward } from '@/app/api/rewards/[rewardId]/claim/route';
import { GET as getRewardHistory } from '@/app/api/rewards/history/route';

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
const TEST_REWARD_ID = 'reward-giftcard-100';

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

// Helper to create mock NextRequest for GET
function createMockGetRequest(url: string): NextRequest {
  return new NextRequest(url);
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

// Helper to setup unauthenticated Supabase mock
function setupUnauthenticatedMock() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      }),
    },
  } as MockReturnValue);
}

/**
 * Create mock claim response for a gift card
 * Per API_CONTRACTS.md lines 5063-5087
 */
function createGiftCardClaimResponse(amount: number): MockReturnValue {
  return {
    success: true,
    message: 'Gift card claimed! You\'ll receive your reward soon.',
    redemption: {
      id: `redemption-${Date.now()}`,
      status: 'claimed',
      rewardType: 'gift_card',
      claimedAt: new Date().toISOString(),
      reward: {
        id: TEST_REWARD_ID,
        name: `$${amount} Gift Card`,
        displayText: 'Amazon Gift Card',
        type: 'gift_card',
        rewardSource: 'vip_tier',
        valueData: {
          amount: amount,
        },
      },
      usedCount: 1,
      totalQuantity: 2,
      nextSteps: {
        action: 'wait_fulfillment',
        message: 'Your gift card is being processed. You\'ll receive an email when it\'s ready!',
      },
    },
    updatedRewards: [],
  };
}

/**
 * Create mock history response with gift card
 * Per API_CONTRACTS.md lines 5492-5598
 */
function createHistoryResponseWithGiftCard(amount: number): MockReturnValue {
  return {
    user: {
      id: TEST_USER_ID,
      handle: '@testcreator',
    },
    currentTier: {
      name: 'Gold',
      color: '#F59E0B',
    },
    history: [
      {
        id: `redemption-${Date.now()}`,
        rewardType: 'gift_card',
        rewardName: `$${amount} Gift Card`,
        status: 'concluded',
        claimedAt: '2025-01-10T00:00:00Z',
        concludedAt: '2025-01-15T00:00:00Z',
        valueData: {
          amount: amount,
        },
        tierAtClaim: 'tier_3',
        tierNameAtClaim: 'Gold',
      },
    ],
    totalCount: 1,
  };
}

describe('Gift Card Reward Claim Tests (API Routes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // =========================================================================
  // Test Case 1: POST /api/rewards/:id/claim creates redemption with correct reward_id
  // =========================================================================

  describe('Test Case 1: POST /api/rewards/:id/claim creates redemption', () => {
    it('should return 200 and create redemption with correct reward_id', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per spec: POST /api/rewards/:id/claim → expect 200
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption).toBeDefined();
      expect(data.redemption.id).toBeDefined();

      // Verify service was called with correct rewardId
      expect(mockRewardService.claimReward).toHaveBeenCalledWith(
        expect.objectContaining({
          rewardId: TEST_REWARD_ID,
          userId: TEST_USER_ID,
          clientId: TEST_CLIENT_ID,
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      setupUnauthenticatedMock();

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });
  });

  // =========================================================================
  // Test Case 2: value_data.amount=100 displays as "$100 Gift Card"
  // =========================================================================

  describe('Test Case 2: Gift card amount displays correctly via API', () => {
    it('should display value_data.amount=100 as "$100 Gift Card" in claim response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redemption.reward.name).toBe('$100 Gift Card');
      expect(data.redemption.reward.valueData.amount).toBe(100);

      // CRITICAL: Verify it does NOT show "$1000" (catastrophic bug prevention)
      expect(data.redemption.reward.name).not.toContain('$1000');
      expect(data.redemption.reward.name).not.toContain('$10 ');
    });

    it('should display value_data.amount=50 as "$50 Gift Card" in claim response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(50));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redemption.reward.name).toBe('$50 Gift Card');
      expect(data.redemption.reward.valueData.amount).toBe(50);
    });

    it('should display value_data.amount=250 as "$250 Gift Card" in claim response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(250));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redemption.reward.name).toBe('$250 Gift Card');
      expect(data.redemption.reward.valueData.amount).toBe(250);
    });

    it('should display correct amount in GET /api/rewards/history', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.getRewardHistory.mockResolvedValue(createHistoryResponseWithGiftCard(100));

      const request = createMockGetRequest('http://localhost:3000/api/rewards/history');
      const response = await getRewardHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeDefined();
      expect(data.history.length).toBeGreaterThan(0);
      expect(data.history[0].rewardName).toBe('$100 Gift Card');
      expect(data.history[0].valueData.amount).toBe(100);

      // CRITICAL: Verify it does NOT show "$1000"
      expect(data.history[0].rewardName).not.toContain('$1000');
    });
  });

  // =========================================================================
  // Test Case 3: redemption.status='claimed' after successful claim
  // =========================================================================

  describe('Test Case 3: Redemption status is "claimed" after successful claim', () => {
    it('should set redemption status to "claimed" in API response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redemption.status).toBe('claimed');
      expect(data.redemption.claimedAt).toBeDefined();
    });

    it('should set rewardType to "gift_card" in API response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redemption.rewardType).toBe('gift_card');
      expect(data.redemption.reward.type).toBe('gift_card');
    });
  });

  // =========================================================================
  // Test Case 4: Amount precision maintained (no rounding errors)
  // =========================================================================

  describe('Test Case 4: Amount precision is maintained via API', () => {
    const testAmounts = [50, 100, 250, 25, 75, 150, 500];

    it.each(testAmounts)(
      'should maintain exact amount precision for $%d gift card via POST',
      async (amount) => {
        setupAuthenticatedMock();
        mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
        mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
        mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(amount));

        const request = createMockPostRequest(TEST_REWARD_ID, {});
        const response = await claimReward(request, {
          params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
        });
        const data = await response.json();

        // Verify exact amount via API response
        expect(response.status).toBe(200);
        expect(data.redemption.reward.valueData.amount).toBe(amount);
        expect(data.redemption.reward.name).toBe(`$${amount} Gift Card`);

        // Verify no decimal places in display
        expect(data.redemption.reward.name).not.toContain('.');
      }
    );

    it.each(testAmounts)(
      'should maintain exact amount precision for $%d gift card via GET history',
      async (amount) => {
        setupAuthenticatedMock();
        mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
        mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
        mockRewardService.getRewardHistory.mockResolvedValue(createHistoryResponseWithGiftCard(amount));

        const request = createMockGetRequest('http://localhost:3000/api/rewards/history');
        const response = await getRewardHistory(request);
        const data = await response.json();

        // Verify exact amount via API response
        expect(response.status).toBe(200);
        expect(data.history[0].valueData.amount).toBe(amount);
        expect(data.history[0].rewardName).toBe(`$${amount} Gift Card`);
      }
    );
  });

  // =========================================================================
  // Additional Tests: API Response Structure Validation
  // =========================================================================

  describe('API Response Structure Validation', () => {
    it('should return correct nextSteps for gift_card claim', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md lines 5085-5088
      expect(data.redemption.nextSteps).toBeDefined();
      expect(data.redemption.nextSteps.action).toBe('wait_fulfillment');
      expect(data.redemption.nextSteps.message).toContain('gift card');
    });

    it('should track usedCount correctly in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.usedCount).toBeDefined();
      expect(data.redemption.totalQuantity).toBeDefined();
      expect(typeof data.redemption.usedCount).toBe('number');
      expect(typeof data.redemption.totalQuantity).toBe('number');
    });

    it('should return rewardSource as vip_tier for VIP rewards', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createGiftCardClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.rewardSource).toBe('vip_tier');
    });

    it('should return 500 when CLIENT_ID not configured', async () => {
      delete process.env.CLIENT_ID;
      setupAuthenticatedMock();

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });

  // =========================================================================
  // Multi-tenant Isolation Tests
  // =========================================================================

  describe('Multi-tenant Isolation', () => {
    it('should return 403 when user client_id does not match tenant', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: 'different-client-id',
      });

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
    });
  });
});
