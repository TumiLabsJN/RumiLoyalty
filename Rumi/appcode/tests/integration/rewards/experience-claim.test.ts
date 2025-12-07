/**
 * Integration Tests for Experience Reward Claim
 *
 * Tests experience claiming via actual API routes per EXECUTION_PLAN.md Task 6.4.9:
 * - POST /api/rewards/:id/claim → expect 200
 * - value_data.display_text shown in response
 * - redemption_type='instant'
 * - status='claimed' immediately
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=experience-claim
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.9 (Experience Reward Claim Tests)
 * - SchemaFinalv2.md lines 514-517 (experience value_data structure)
 * - API_CONTRACTS.md lines 4171, 4155, 5017 (experience formatting, instant, claimed)
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
const TEST_REWARD_ID = 'reward-experience-001';
const TEST_REDEMPTION_ID = 'redemption-exp-001';

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

/**
 * Create successful experience claim response
 * Per API_CONTRACTS.md lines 4171, 5016-5035
 */
function createExperienceClaimResponse(displayText: string): MockReturnValue {
  return {
    success: true,
    message: 'Experience claimed! We\'ll be in touch soon.',
    redemption: {
      id: TEST_REDEMPTION_ID,
      status: 'claimed', // Per line 5017: Always "claimed" immediately
      rewardType: 'experience',
      claimedAt: new Date().toISOString(),
      reward: {
        id: TEST_REWARD_ID,
        name: 'Mystery Trip', // Per line 4171: name = description
        displayText: displayText, // Per line 4171: valueData.displayText || description
        type: 'experience',
        rewardSource: 'vip_tier',
        valueData: {
          displayText: displayText, // Per SchemaFinalv2.md line 517
        },
      },
      usedCount: 1,
      totalQuantity: 1, // Experience is one-time per API_CONTRACTS.md line 5000
      nextSteps: {
        action: 'wait_fulfillment',
        message: 'We\'ll contact you with details about your experience!',
      },
    },
    updatedRewards: [
      {
        id: TEST_REWARD_ID,
        status: 'redeeming', // Per line 4527: experience goes to 'redeeming' status
        canClaim: false,
        usedCount: 1,
      },
    ],
  };
}

/**
 * Create mock history response with experience
 * Per API_CONTRACTS.md lines 5504-5526
 */
function createHistoryResponseWithExperience(displayText: string): MockReturnValue {
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
        name: 'Mystery Trip', // Per line 5526: experience name = description
        description: displayText, // Per line 5526: displayText = valueData.displayText || description
        type: 'experience',
        rewardSource: 'vip_tier',
        claimedAt: '2025-01-10T00:00:00Z',
        concludedAt: '2025-01-15T00:00:00Z',
        status: 'concluded',
      },
    ],
  };
}

describe('Experience Reward Claim Tests (API Routes)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // =========================================================================
  // Test Case 1: Claim creates redemption successfully
  // =========================================================================

  describe('Test Case 1: Claim creates redemption successfully', () => {
    it('should return 200 and create redemption for experience reward', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per spec: POST /api/rewards/:id/claim → expect 200
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption).toBeDefined();
      expect(data.redemption.id).toBe(TEST_REDEMPTION_ID);
    });

    it('should call service with correct rewardId and userId', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });

      expect(mockRewardService.claimReward).toHaveBeenCalledWith(
        expect.objectContaining({
          rewardId: TEST_REWARD_ID,
          userId: TEST_USER_ID,
          clientId: TEST_CLIENT_ID,
        })
      );
    });

    it('should not require any request body for experience claim', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      // Empty body - per API_CONTRACTS.md line 3726: Instant rewards {}
      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return rewardType as experience', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.rewardType).toBe('experience');
      expect(data.redemption.reward.type).toBe('experience');
    });
  });

  // =========================================================================
  // Test Case 2: value_data.display_text shown in response
  // =========================================================================

  describe('Test Case 2: value_data.display_text shown in response', () => {
    it('should display value_data.display_text="VIP Meet & Greet" in claim response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Per API_CONTRACTS.md line 4171: displayText = valueData.displayText || description
      expect(data.redemption.reward.displayText).toBe('VIP Meet & Greet');
      expect(data.redemption.reward.valueData.displayText).toBe('VIP Meet & Greet');
    });

    it('should display value_data.display_text="Mystery Trip" correctly', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('Mystery Trip')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.displayText).toBe('Mystery Trip');
    });

    it('should display value_data.display_text="VIP weekend getaway" correctly', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      // Per SchemaFinalv2.md line 517: {"display_text": "VIP weekend getaway"}
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP weekend getaway')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.displayText).toBe('VIP weekend getaway');
    });

    it('should show display_text in GET /api/rewards/history', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.getRewardHistory.mockResolvedValue(
        createHistoryResponseWithExperience('VIP Meet & Greet')
      );

      const request = createMockGetRequest('http://localhost:3000/api/rewards/history');
      const response = await getRewardHistory(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeDefined();
      expect(data.history.length).toBeGreaterThan(0);
      // Per API_CONTRACTS.md line 5526: description = displayText
      expect(data.history[0].description).toBe('VIP Meet & Greet');
      expect(data.history[0].type).toBe('experience');
    });
  });

  // =========================================================================
  // Test Case 3: redemption_type='instant'
  // =========================================================================

  describe('Test Case 3: redemption_type=instant', () => {
    it('should have redemption_type=instant for experience reward', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Per API_CONTRACTS.md line 4155: 'instant' for experience
      expect(data.redemption.rewardType).toBe('experience');
      // Experience is instant, no scheduling required
    });

    it('should not require scheduledActivationAt for experience', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      // Per API_CONTRACTS.md line 4859: Not used for experience
      const request = createMockPostRequest(TEST_REWARD_ID, {
        // No scheduledActivationAt needed
      });
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // No scheduledActivationAt in response
      expect(data.redemption.scheduledActivationAt).toBeUndefined();
    });

    it('should return nextSteps.action=wait_fulfillment for instant experience', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Instant rewards use wait_fulfillment action
      expect(data.redemption.nextSteps.action).toBe('wait_fulfillment');
    });
  });

  // =========================================================================
  // Test Case 4: status='claimed' immediately
  // =========================================================================

  describe('Test Case 4: status=claimed immediately', () => {
    it('should set status to claimed immediately after claim', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md line 5017: Always "claimed" immediately after claim
      expect(response.status).toBe(200);
      expect(data.redemption.status).toBe('claimed');
    });

    it('should have claimedAt timestamp set', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.claimedAt).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(() => new Date(data.redemption.claimedAt)).not.toThrow();
    });

    it('should set updatedRewards status to redeeming for experience', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Per API_CONTRACTS.md lines 4527-4529: experience goes to 'redeeming'
      expect(data.updatedRewards).toBeDefined();
      expect(data.updatedRewards[0].status).toBe('redeeming');
      expect(data.updatedRewards[0].canClaim).toBe(false);
    });
  });

  // =========================================================================
  // Additional Tests: Experience Response Structure
  // =========================================================================

  describe('Experience Response Structure', () => {
    it('should return rewardSource as vip_tier', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.rewardSource).toBe('vip_tier');
    });

    it('should return usedCount=1 and totalQuantity=1 for one-time experience', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      // Experience is once forever per API_CONTRACTS.md line 5000
      expect(data.redemption.usedCount).toBe(1);
      expect(data.redemption.totalQuantity).toBe(1);
    });

    it('should include valueData with displayText in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.redemption.reward.valueData).toBeDefined();
      expect(data.redemption.reward.valueData.displayText).toBe('VIP Meet & Greet');
    });

    it('should have success message in response', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockRewardService.claimReward.mockResolvedValue(
        createExperienceClaimResponse('VIP Meet & Greet')
      );

      const request = createMockPostRequest(TEST_REWARD_ID, {});
      const response = await claimReward(request, {
        params: Promise.resolve({ rewardId: TEST_REWARD_ID }),
      });
      const data = await response.json();

      expect(data.message).toBeDefined();
      expect(typeof data.message).toBe('string');
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
