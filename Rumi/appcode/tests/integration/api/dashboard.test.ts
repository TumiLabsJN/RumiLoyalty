/**
 * Dashboard API Integration Tests
 *
 * References:
 * - EXECUTION_PLAN.md Tasks 4.4.1-4.4.3
 * - API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission)
 * - API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard)
 * - ARCHITECTURE.md Section 8 (Testing Strategy)
 *
 * Tests:
 * - Task 4.4.1: Basic endpoint tests (auth, response schema)
 * - Task 4.4.2: Multi-tenant isolation (client_id boundary)
 * - Task 4.4.3: Congrats modal logic (fulfilled_at > last_login_at)
 */

import { NextRequest } from 'next/server';
import { GET as getDashboard } from '@/app/api/dashboard/route';
import { GET as getFeaturedMission } from '@/app/api/dashboard/featured-mission/route';

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
    getCurrentTierRewards: jest.fn(),
    updateLastLoginAt: jest.fn(),
  },
}));

jest.mock('@/lib/repositories/missionRepository', () => ({
  missionRepository: {
    findFeaturedMission: jest.fn(),
    findRecentFulfillment: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
import { missionRepository } from '@/lib/repositories/missionRepository';

// Type assertions for mocks - using 'any' for flexibility with mock data shapes
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockDashboardRepo = dashboardRepository as jest.Mocked<typeof dashboardRepository>;
const mockMissionRepo = missionRepository as jest.Mocked<typeof missionRepository>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturnValue = any;

// Test data fixtures
const TEST_CLIENT_ID = 'client-test-123';
const TEST_USER_ID = 'user-test-456';
const TEST_AUTH_ID = 'auth-test-789';
const OTHER_CLIENT_ID = 'client-other-999';

const mockUser: MockReturnValue = {
  id: TEST_USER_ID,
  authId: TEST_AUTH_ID,
  clientId: TEST_CLIENT_ID,
  handle: '@testcreator',
  email: 'test@example.com',
};

const mockDashboardData: MockReturnValue = {
  user: {
    id: TEST_USER_ID,
    handle: '@testcreator',
    email: 'test@example.com',
  },
  client: {
    id: TEST_CLIENT_ID,
    name: 'Test Client',
    vipMetric: 'sales' as const,
    checkpointMonths: 4,
  },
  currentTier: {
    id: 'tier-gold-123',
    name: 'Gold',
    color: '#F59E0B',
    order: 3,
    checkpointExempt: false,
  },
  nextTier: {
    id: 'tier-platinum-456',
    name: 'Platinum',
    color: '#818CF8',
    salesThreshold: 5000,
    unitsThreshold: 5000,
  },
  checkpointData: {
    salesCurrent: 4000,
    unitsCurrent: 400,
    manualAdjustmentsTotal: 200,
    manualAdjustmentsUnits: 20,
    nextCheckpointAt: '2025-03-15T00:00:00Z',
    lastLoginAt: '2025-01-01T00:00:00Z',
  },
};

const mockRewardsResult: MockReturnValue = {
  rewards: [
    {
      id: 'reward-1',
      type: 'gift_card',
      name: '$50 Gift Card',
      description: 'Amazon gift card',
      valueData: { amount: 50 },
      rewardSource: 'vip_tier',
      redemptionQuantity: 2,
      displayOrder: 1,
    },
  ],
  totalCount: 4,
};

// Helper to create mock NextRequest
function createMockRequest(url: string = 'http://localhost:3000/api/dashboard'): NextRequest {
  return new NextRequest(url);
}

// Helper to setup authenticated Supabase mock
function setupAuthenticatedMock() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: TEST_AUTH_ID } },
        error: null,
      }),
    },
  } as any);
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
  } as any);
}

describe('Dashboard API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set CLIENT_ID env var for multi-tenant check
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // ============================================
  // Task 4.4.1: Basic Dashboard Endpoint Tests
  // ============================================
  describe('Task 4.4.1: GET /api/dashboard', () => {
    it('returns 401 when not authenticated', async () => {
      setupUnauthenticatedMock();

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 when user not found in users table', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('returns 200 with dashboard data for authenticated user', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('client');
      expect(data).toHaveProperty('currentTier');
      expect(data).toHaveProperty('tierProgress');
      expect(data).toHaveProperty('featuredMission');
      expect(data).toHaveProperty('currentTierRewards');
    });

    it('returns 500 when CLIENT_ID not configured', async () => {
      delete process.env.CLIENT_ID;
      setupAuthenticatedMock();

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('validates response schema has required fields', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      // User section
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('handle');

      // Client section
      expect(data.client).toHaveProperty('vipMetric');
      expect(['sales', 'units']).toContain(data.client.vipMetric);

      // Tier progress section
      expect(data.tierProgress).toHaveProperty('currentValue');
      expect(data.tierProgress).toHaveProperty('targetValue');
      expect(data.tierProgress).toHaveProperty('progressPercentage');
      expect(data.tierProgress).toHaveProperty('currentFormatted');
      expect(data.tierProgress).toHaveProperty('targetFormatted');
    });
  });

  describe('Task 4.4.1: GET /api/dashboard/featured-mission', () => {
    it('returns 401 when not authenticated', async () => {
      setupUnauthenticatedMock();

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns 200 with no_missions status when no mission found', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('no_missions');
      expect(data.mission).toBeNull();
      expect(data.emptyStateMessage).toBeTruthy();
    });

    it('returns featured mission with correct structure', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockMissionRepo.findFeaturedMission.mockResolvedValue({
        mission: {
          id: 'mission-123',
          type: 'sales_dollars',
          displayName: 'Sales Sprint',
          targetValue: 500,
          raffleEndDate: null,
        },
        progress: {
          currentValue: 300,
          status: 'active',
        },
        reward: {
          type: 'gift_card',
          name: '$50 Gift Card',
          valueData: { amount: 50 },
        },
      } as MockReturnValue);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('active');
      expect(data.mission).not.toBeNull();
      expect(data.mission.id).toBe('mission-123');
      expect(data.mission.type).toBe('sales_dollars');
      expect(data.mission.progressPercentage).toBe(60);
      expect(data.tier).toHaveProperty('name');
      expect(data.tier).toHaveProperty('color');
    });
  });

  // ============================================
  // Task 4.4.2: Multi-tenant Isolation Tests
  // ============================================
  describe('Task 4.4.2: Multi-tenant Isolation', () => {
    it('returns 403 when user client_id does not match tenant', async () => {
      setupAuthenticatedMock();
      // User belongs to a different client
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: OTHER_CLIENT_ID, // Different from process.env.CLIENT_ID
      });

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
      expect(data.code).toBe('TENANT_MISMATCH');
    });

    it('returns 403 for featured-mission when client mismatch', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: OTHER_CLIENT_ID,
      });

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('TENANT_MISMATCH');
    });

    it('allows access when user client_id matches tenant', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser); // Matches TEST_CLIENT_ID
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);

      expect(response.status).toBe(200);
    });

    it('repository queries include client_id filter', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      await getDashboard(request);

      // Verify getUserDashboard was called with correct client_id
      expect(mockDashboardRepo.getUserDashboard).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_CLIENT_ID
      );

      // Verify getCurrentTierRewards was called with correct client_id
      expect(mockDashboardRepo.getCurrentTierRewards).toHaveBeenCalledWith(
        TEST_CLIENT_ID,
        expect.any(String) // tier ID
      );
    });
  });

  // ============================================
  // Task 4.4.3: Congrats Modal Logic Tests
  // ============================================
  describe('Task 4.4.3: Congrats Modal Logic', () => {
    it('showCongratsModal is false when no recent fulfillment', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null); // No fulfillment

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(data.showCongratsModal).toBe(false);
      expect(data.congratsMessage).toBeNull();
    });

    it('showCongratsModal is true when fulfilled_at > last_login_at', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue({
        ...mockDashboardData,
        checkpointData: {
          ...mockDashboardData.checkpointData,
          lastLoginAt: '2025-01-01T00:00:00Z', // Older
        },
      });
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue({
        missionId: 'mission-fulfilled-123',
        fulfilledAt: '2025-01-15T00:00:00Z', // Newer than last_login_at
        rewardType: 'gift_card',
        rewardAmount: 50,
        rewardName: '$50 Gift Card',
      });

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(data.showCongratsModal).toBe(true);
      expect(data.congratsMessage).toContain('$50');
      expect(data.congratsMessage).toContain('Gift Card');
    });

    it('updates last_login_at after showing congrats modal', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.updateLastLoginAt.mockResolvedValue(undefined);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue({
        missionId: 'mission-fulfilled-123',
        fulfilledAt: '2025-01-15T00:00:00Z',
        rewardType: 'gift_card',
        rewardAmount: 50,
        rewardName: '$50 Gift Card',
      });

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      await getFeaturedMission(request);

      // Verify last_login_at was updated AFTER checking congrats
      expect(mockDashboardRepo.updateLastLoginAt).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_CLIENT_ID
      );
    });

    it('does not update last_login_at when no congrats modal', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null); // No fulfillment

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      await getFeaturedMission(request);

      // Should NOT update last_login_at if no congrats modal
      expect(mockDashboardRepo.updateLastLoginAt).not.toHaveBeenCalled();
    });

    it('generates correct congrats message for physical_gift reward', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue({
        missionId: 'mission-fulfilled-456',
        fulfilledAt: '2025-01-15T00:00:00Z',
        rewardType: 'physical_gift',
        rewardAmount: null,
        rewardName: 'iPhone 16 Pro',
      });

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(data.showCongratsModal).toBe(true);
      expect(data.congratsMessage).toContain('iPhone 16 Pro');
      expect(data.congratsMessage).toContain('delivered');
    });

    it('first login shows congrats modal if there is prior fulfillment', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue({
        ...mockDashboardData,
        checkpointData: {
          ...mockDashboardData.checkpointData,
          lastLoginAt: null, // First login (never logged in before)
        },
      });
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      // Even with null lastLoginAt, if there's a fulfillment, show modal
      mockMissionRepo.findRecentFulfillment.mockResolvedValue({
        missionId: 'mission-fulfilled-789',
        fulfilledAt: '2025-01-15T00:00:00Z',
        rewardType: 'gift_card',
        rewardAmount: 100,
        rewardName: '$100 Gift Card',
      });

      const request = createMockRequest('http://localhost:3000/api/dashboard/featured-mission');
      const response = await getFeaturedMission(request);
      const data = await response.json();

      expect(data.showCongratsModal).toBe(true);
    });
  });

  // ============================================
  // Additional Response Validation Tests
  // ============================================
  describe('Response Validation', () => {
    it('formats tier progress values correctly for sales mode', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue({
        ...mockDashboardData,
        client: { ...mockDashboardData.client, vipMetric: 'sales' as const },
      });
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      // Sales mode should have $ prefix
      expect(data.tierProgress.currentFormatted).toMatch(/^\$/);
      expect(data.tierProgress.targetFormatted).toMatch(/^\$/);
    });

    it('formats tier progress values correctly for units mode', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue({
        ...mockDashboardData,
        client: { ...mockDashboardData.client, vipMetric: 'units' as const },
      });
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue(mockRewardsResult);
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      // Units mode should have " units" suffix
      expect(data.tierProgress.currentFormatted).toContain('units');
      expect(data.tierProgress.targetFormatted).toContain('units');
    });

    it('returns totalRewardsCount for "And more!" logic', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockDashboardRepo.getUserDashboard.mockResolvedValue(mockDashboardData);
      mockDashboardRepo.getCurrentTierRewards.mockResolvedValue({
        rewards: mockRewardsResult.rewards,
        totalCount: 8, // More than 4
      });
      mockMissionRepo.findFeaturedMission.mockResolvedValue(null);
      mockMissionRepo.findRecentFulfillment.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getDashboard(request);
      const data = await response.json();

      expect(data.totalRewardsCount).toBe(8);
      expect(data.currentTierRewards.length).toBeLessThanOrEqual(4);
    });
  });
});
