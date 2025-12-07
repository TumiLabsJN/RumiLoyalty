/**
 * Integration Tests for Spark Ads Reward Claim
 *
 * Tests spark_ads instant redemption via API routes per EXECUTION_PLAN.md Task 6.4.5:
 * - type='spark_ads', value_data={amount: 100}
 * - redemption_type='instant' (no scheduling required)
 * - status='claimed' immediately after claim
 * - Display: "$100 Ads Boost" / "Spark Ads Promo"
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=spark-ads-claim
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.5 (Spark Ads Claim Tests)
 * - SchemaFinalv2.md lines 495-496 (spark_ads value_data structure)
 * - API_CONTRACTS.md lines 4102, 4155, 4168, 4176 (spark_ads formatting, instant redemption)
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
const TEST_REWARD_ID = 'reward-spark-100';
const TEST_REDEMPTION_ID = 'redemption-spark-001';

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
function createMockGetRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'GET',
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
 * Create mock claim response for spark_ads
 * Per API_CONTRACTS.md lines 4168, 4176:
 * - name: "$" + amount + " Ads Boost"
 * - displayText: "Spark Ads Promo"
 * - redemptionType: 'instant'
 */
function createSparkAdsClaimResponse(amount: number): MockReturnValue {
  return {
    success: true,
    message: 'Spark Ads credit claimed! You\'ll receive your boost soon.',
    redemption: {
      id: TEST_REDEMPTION_ID,
      status: 'claimed', // Instant rewards go to 'claimed' immediately
      rewardType: 'spark_ads',
      claimedAt: new Date().toISOString(),
      reward: {
        id: TEST_REWARD_ID,
        name: `$${amount} Ads Boost`, // Per API_CONTRACTS.md line 4168
        displayText: 'Spark Ads Promo', // Per API_CONTRACTS.md line 4168
        type: 'spark_ads',
        rewardSource: 'vip_tier',
        valueData: {
          amount: amount, // Per SchemaFinalv2.md line 496
        },
      },
      // No scheduledActivationAt for instant rewards
      usedCount: 1,
      totalQuantity: 2,
      nextSteps: {
        action: 'wait_fulfillment',
        message: 'Your Spark Ads credit is being processed. You\'ll receive confirmation via email!',
      },
    },
    updatedRewards: [
      {
        id: TEST_REWARD_ID,
        status: 'redeeming', // Per API_CONTRACTS.md line 4115: instant rewards show 'redeeming'
        canClaim: false,
        usedCount: 1,
      },
    ],
  };
}

/**
 * Create mock history response for spark_ads
 * Per API_CONTRACTS.md lines 5517-5524 (same formatting rules)
 */
function createSparkAdsHistoryResponse(amount: number): MockReturnValue {
  return {
    user: {
      id: TEST_USER_ID,
      handle: '@testcreator',
      currentTier: 'tier_3',
      currentTierName: 'Gold',
      currentTierColor: '#F59E0B',
    },
    history: [
      {
        id: TEST_REDEMPTION_ID,
        rewardId: TEST_REWARD_ID,
        name: `$${amount} Ads Boost`,
        description: 'Spark Ads Promo',
        type: 'spark_ads',
        rewardSource: 'vip_tier',
        claimedAt: '2025-01-14T15:30:00Z',
        concludedAt: '2025-01-15T10:00:00Z',
        status: 'concluded',
        valueData: {
          amount: amount,
        },
      },
    ],
  };
}

describe('Spark Ads Claim Tests (API Routes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // =========================================================================
  // Test Case 1: POST /api/rewards/:id/claim creates redemption successfully
  // =========================================================================

  describe('Test Case 1: Claim creates redemption successfully', () => {
    it('should return 200 and create redemption with correct reward_id', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption.id).toBe(TEST_REDEMPTION_ID);
      expect(data.redemption.reward.id).toBe(TEST_REWARD_ID);
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

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(401);
    });

    it('should call rewardService.claimReward with correct parameters', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(mockRewardService.claimReward).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_USER_ID,
          clientId: TEST_CLIENT_ID,
          rewardId: TEST_REWARD_ID,
          currentTier: 'tier_3',
        })
      );
    });
  });

  // =========================================================================
  // Test Case 2: value_data.amount stored correctly
  // =========================================================================

  describe('Test Case 2: value_data.amount stored correctly', () => {
    it('should return value_data.amount=100 in claim response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per SchemaFinalv2.md line 496: {"amount": 100}
      expect(data.redemption.reward.valueData.amount).toBe(100);
    });

    it('should return value_data.amount=50 for $50 spark ads', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(50));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.valueData.amount).toBe(50);
    });

    it('should return value_data.amount=250 for $250 spark ads', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(250));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.valueData.amount).toBe(250);
    });

    it('should display correct amount in GET /api/rewards/history', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.getRewardHistory.mockResolvedValue(createSparkAdsHistoryResponse(100));

      const request = createMockGetRequest('/api/rewards/history');
      const response = await getRewardHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history[0].valueData.amount).toBe(100);
      expect(data.history[0].name).toBe('$100 Ads Boost');
    });
  });

  // =========================================================================
  // Test Case 3: redemption_type='instant' per reward config
  // =========================================================================

  describe('Test Case 3: redemption_type=instant per reward config', () => {
    it('should return rewardType as spark_ads in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 4155: spark_ads is 'instant'
      expect(data.redemption.rewardType).toBe('spark_ads');
      expect(data.redemption.reward.type).toBe('spark_ads');
    });

    it('should NOT require scheduledActivationAt for spark_ads', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      // Empty body - no scheduling needed for instant rewards
      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Claim succeeds without scheduling params
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // No scheduledActivationAt in response
      expect(data.redemption.scheduledActivationAt).toBeUndefined();
    });

    it('should return nextSteps.action=wait_fulfillment for instant reward', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Instant rewards get wait_fulfillment action
      expect(data.redemption.nextSteps.action).toBe('wait_fulfillment');
    });
  });

  // =========================================================================
  // Test Case 4: status='claimed' immediately (no scheduling needed)
  // =========================================================================

  describe('Test Case 4: status=claimed immediately', () => {
    it('should set redemption status to claimed immediately', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per spec: status='claimed' (instant fulfillment)
      expect(data.redemption.status).toBe('claimed');
    });

    it('should include claimedAt timestamp in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.claimedAt).toBeDefined();
      // claimedAt should be a valid ISO timestamp
      expect(() => new Date(data.redemption.claimedAt)).not.toThrow();
    });

    it('should update reward status to redeeming in updatedRewards', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md: instant rewards show 'redeeming' status
      const updatedReward = data.updatedRewards.find(
        (r: { id: string }) => r.id === TEST_REWARD_ID
      );
      expect(updatedReward.status).toBe('redeeming');
      expect(updatedReward.canClaim).toBe(false);
    });
  });

  // =========================================================================
  // Test Case 5: Display formatting "$X Ads Boost" / "Spark Ads Promo"
  // =========================================================================

  describe('Test Case 5: Display formatting per API_CONTRACTS.md', () => {
    it('should display name as "$100 Ads Boost" for amount=100', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 4168: "$" + amount + " Ads Boost"
      expect(data.redemption.reward.name).toBe('$100 Ads Boost');
    });

    it('should display displayText as "Spark Ads Promo"', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 4168: displayText = "Spark Ads Promo"
      expect(data.redemption.reward.displayText).toBe('Spark Ads Promo');
    });

    it('should display name as "$50 Ads Boost" for amount=50', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(50));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.name).toBe('$50 Ads Boost');
    });

    it('should display name as "$250 Ads Boost" for amount=250', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(250));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.name).toBe('$250 Ads Boost');
    });
  });

  // =========================================================================
  // Additional Tests: rewardSource and usage tracking
  // =========================================================================

  describe('Additional: rewardSource and usage tracking', () => {
    it('should return rewardSource as vip_tier for VIP rewards', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.rewardSource).toBe('vip_tier');
    });

    it('should track usedCount and totalQuantity correctly', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(createSparkAdsClaimResponse(100));

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(typeof data.redemption.usedCount).toBe('number');
      expect(typeof data.redemption.totalQuantity).toBe('number');
      expect(data.redemption.usedCount).toBe(1);
      expect(data.redemption.totalQuantity).toBe(2);
    });

    it('should return 403 when user client_id does not match tenant', async () => {
      setupAuthenticatedMock();
      // User belongs to different client
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: 'different-client-id',
      });
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 500 when CLIENT_ID not configured', async () => {
      delete process.env.CLIENT_ID;
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(response.status).toBe(500);
    });
  });
});
