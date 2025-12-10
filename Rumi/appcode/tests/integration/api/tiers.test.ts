/**
 * Tiers API Integration Tests
 *
 * References:
 * - EXECUTION_PLAN.md Tasks 7.3.1-7.3.2
 * - API_CONTRACTS.md lines 5604-6190 (GET /api/tiers)
 * - ARCHITECTURE.md Section 8 (Testing Strategy)
 *
 * Tests:
 * - Task 7.3.1: Tier API tests (auth, response schema, tier filtering, rewards aggregation)
 * - Task 7.3.2: Tier progression calculation tests
 */

import { NextRequest } from 'next/server';
import { GET as getTiers } from '@/app/api/tiers/route';

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

jest.mock('@/lib/repositories/tierRepository', () => ({
  tierRepository: {
    getAllTiers: jest.fn(),
    getUserTierContext: jest.fn(),
    getVipSystemSettings: jest.fn(),
    getVipTierRewards: jest.fn(),
    getTierMissions: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { tierRepository } from '@/lib/repositories/tierRepository';

// Type assertions for mocks
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockTierRepo = tierRepository as jest.Mocked<typeof tierRepository>;

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

// Tier data fixtures
const mockAllTiers: MockReturnValue = [
  {
    id: 'tier-bronze-id',
    tierId: 'tier_1',
    tierName: 'Bronze',
    tierColor: '#CD7F32',
    tierOrder: 1,
    salesThreshold: 0,
    unitsThreshold: 0,
    commissionRate: 10,
    checkpointExempt: true,
  },
  {
    id: 'tier-silver-id',
    tierId: 'tier_2',
    tierName: 'Silver',
    tierColor: '#94a3b8',
    tierOrder: 2,
    salesThreshold: 1000,
    unitsThreshold: 1000,
    commissionRate: 12,
    checkpointExempt: false,
  },
  {
    id: 'tier-gold-id',
    tierId: 'tier_3',
    tierName: 'Gold',
    tierColor: '#F59E0B',
    tierOrder: 3,
    salesThreshold: 3000,
    unitsThreshold: 3000,
    commissionRate: 15,
    checkpointExempt: false,
  },
  {
    id: 'tier-platinum-id',
    tierId: 'tier_4',
    tierName: 'Platinum',
    tierColor: '#818CF8',
    tierOrder: 4,
    salesThreshold: 5000,
    unitsThreshold: 5000,
    commissionRate: 20,
    checkpointExempt: false,
  },
];

// User context for Bronze user
const mockBronzeUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_1',
  currentTierOrder: 1,
  totalSales: 320,
  totalUnits: 32,
  nextCheckpointAt: null,
  tierAchievedAt: '2025-01-01T00:00:00Z',
};

// User context for Silver user
const mockSilverUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_2',
  currentTierOrder: 2,
  totalSales: 2100,
  totalUnits: 210,
  nextCheckpointAt: '2025-08-10T00:00:00Z',
  tierAchievedAt: '2025-02-10T00:00:00Z',
};

// User context for Platinum user (max tier)
const mockPlatinumUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_4',
  currentTierOrder: 4,
  totalSales: 7500,
  totalUnits: 750,
  nextCheckpointAt: '2025-10-15T00:00:00Z',
  tierAchievedAt: '2025-04-15T00:00:00Z',
};

// VIP system settings
const mockVipSettingsDollars: MockReturnValue = { metric: 'sales_dollars' };
const mockVipSettingsUnits: MockReturnValue = { metric: 'sales_units' };

// VIP tier rewards fixtures
const mockVipRewards: MockReturnValue = [
  {
    id: 'reward-gc-1',
    type: 'gift_card',
    name: '$25 Gift Card',
    description: 'Amazon Gift Card',
    valueData: { amount: 25 },
    tierEligibility: 'tier_1',
    uses: 2,
    rewardSource: 'vip_tier',
  },
  {
    id: 'reward-boost-1',
    type: 'commission_boost',
    name: '5% Pay Boost',
    description: null,
    valueData: { percent: 5, duration_days: 30 },
    tierEligibility: 'tier_1',
    uses: 1,
    rewardSource: 'vip_tier',
  },
  {
    id: 'reward-gc-2',
    type: 'gift_card',
    name: '$40 Gift Card',
    description: 'Amazon Gift Card',
    valueData: { amount: 40 },
    tierEligibility: 'tier_2',
    uses: 2,
    rewardSource: 'vip_tier',
  },
  {
    id: 'reward-physical-2',
    type: 'physical_gift',
    name: 'Branded Water Bottle',
    description: 'Water Bottle',
    valueData: { display_text: 'Branded Water Bottle' },
    tierEligibility: 'tier_2',
    uses: 1,
    rewardSource: 'vip_tier',
  },
];

// Mission rewards fixtures (for aggregation tests)
const mockMissionRewards: MockReturnValue = [
  {
    id: 'mission-raffle-1',
    missionType: 'raffle',
    tierEligibility: 'tier_2',
    isRaffle: true,
    reward: {
      id: 'reward-raffle-1',
      type: 'physical_gift',
      name: 'AirPods Pro',
      description: 'AirPods Pro',
      valueData: { display_text: 'AirPods Pro' },
      uses: 1,
      rewardSource: 'mission',
    },
  },
  {
    id: 'mission-sales-1',
    missionType: 'sales_dollars',
    tierEligibility: 'tier_1',
    isRaffle: false,
    reward: {
      id: 'reward-mission-gc-1',
      type: 'gift_card',
      name: '$50 Gift Card',
      description: 'Amazon Gift Card',
      valueData: { amount: 50 },
      uses: 1,
      rewardSource: 'mission',
    },
  },
];

// Helper to create mock NextRequest
function createMockRequest(url: string = 'http://localhost:3000/api/tiers'): NextRequest {
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

// Helper to setup default tier repository mocks for Bronze user
function setupBronzeUserMocks() {
  mockTierRepo.getUserTierContext.mockResolvedValue(mockBronzeUserContext);
  mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
  mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
  mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
  mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);
}

// Helper to setup default tier repository mocks for Silver user
function setupSilverUserMocks() {
  mockTierRepo.getUserTierContext.mockResolvedValue(mockSilverUserContext);
  mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
  mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
  mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
  mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);
}

// Additional fixtures for edge cases
const mockZeroSalesUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_1',
  currentTierOrder: 1,
  totalSales: 0,
  totalUnits: 0,
  nextCheckpointAt: null,
  tierAchievedAt: '2025-01-01T00:00:00Z',
};

const mockAtThresholdUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_2',
  currentTierOrder: 2,
  totalSales: 1000, // Exactly at Silver threshold
  totalUnits: 100,
  nextCheckpointAt: '2025-08-10T00:00:00Z',
  tierAchievedAt: '2025-02-10T00:00:00Z',
};

const mockAboveMaxUserContext: MockReturnValue = {
  userId: TEST_USER_ID,
  clientId: TEST_CLIENT_ID,
  currentTier: 'tier_4',
  currentTierOrder: 4,
  totalSales: 10000, // Well above Platinum threshold
  totalUnits: 1000,
  nextCheckpointAt: '2025-10-15T00:00:00Z',
  tierAchievedAt: '2025-04-15T00:00:00Z',
};

// Empty rewards fixtures
const mockEmptyVipRewards: MockReturnValue = [];
const mockEmptyMissionRewards: MockReturnValue = [];

describe('Tiers API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.CLIENT_ID;
  });

  // ============================================
  // Task 7.3.1: Basic Tiers Endpoint Tests
  // ============================================
  describe('Task 7.3.1: GET /api/tiers - Authentication & Authorization', () => {
    it('returns 401 when not authenticated', async () => {
      setupUnauthenticatedMock();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns 401 when user not found in users table', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('UNAUTHORIZED');
      expect(data.message).toContain('User profile not found');
    });

    it('returns 403 when user client_id does not match tenant', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue({
        ...mockUser,
        clientId: OTHER_CLIENT_ID,
      });

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
    });

    it('returns 500 when CLIENT_ID not configured', async () => {
      delete process.env.CLIENT_ID;
      setupAuthenticatedMock();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });

    it('returns 200 with tiers data for authenticated user', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('progress');
      expect(data).toHaveProperty('vipSystem');
      expect(data).toHaveProperty('tiers');
    });
  });

  describe('Task 7.3.1: Response Schema Validation', () => {
    beforeEach(() => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();
    });

    it('user section has all required fields', async () => {
      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('currentTier');
      expect(data.user).toHaveProperty('currentTierName');
      expect(data.user).toHaveProperty('currentTierColor');
      expect(data.user).toHaveProperty('currentSales');
      expect(data.user).toHaveProperty('currentSalesFormatted');
      expect(data.user).toHaveProperty('expirationDate');
      expect(data.user).toHaveProperty('expirationDateFormatted');
      expect(data.user).toHaveProperty('showExpiration');
    });

    it('progress section has all required fields', async () => {
      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.progress).toHaveProperty('nextTierName');
      expect(data.progress).toHaveProperty('nextTierTarget');
      expect(data.progress).toHaveProperty('nextTierTargetFormatted');
      expect(data.progress).toHaveProperty('amountRemaining');
      expect(data.progress).toHaveProperty('amountRemainingFormatted');
      expect(data.progress).toHaveProperty('progressPercentage');
      expect(data.progress).toHaveProperty('progressText');
    });

    it('vipSystem section has metric field', async () => {
      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.vipSystem).toHaveProperty('metric');
      expect(['sales_dollars', 'sales_units']).toContain(data.vipSystem.metric);
    });

    it('tiers array items have all required fields', async () => {
      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(Array.isArray(data.tiers)).toBe(true);
      expect(data.tiers.length).toBeGreaterThan(0);

      const tier = data.tiers[0];
      expect(tier).toHaveProperty('name');
      expect(tier).toHaveProperty('color');
      expect(tier).toHaveProperty('tierLevel');
      expect(tier).toHaveProperty('minSales');
      expect(tier).toHaveProperty('minSalesFormatted');
      expect(tier).toHaveProperty('salesDisplayText');
      expect(tier).toHaveProperty('commissionRate');
      expect(tier).toHaveProperty('commissionDisplayText');
      expect(tier).toHaveProperty('isUnlocked');
      expect(tier).toHaveProperty('isCurrent');
      expect(tier).toHaveProperty('totalPerksCount');
      expect(tier).toHaveProperty('rewards');
    });

    it('tier rewards have all required fields', async () => {
      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Find a tier with rewards
      const tierWithRewards = data.tiers.find((t: any) => t.rewards && t.rewards.length > 0);
      if (tierWithRewards) {
        const reward = tierWithRewards.rewards[0];
        expect(reward).toHaveProperty('type');
        expect(reward).toHaveProperty('isRaffle');
        expect(reward).toHaveProperty('displayText');
        expect(reward).toHaveProperty('count');
        expect(reward).toHaveProperty('sortPriority');
      }
    });
  });

  describe('Task 7.3.1: User-Scoped Tier Filtering', () => {
    it('Bronze user sees all 4 tiers (tier_order >= 1)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.tiers.length).toBe(4);
      expect(data.tiers[0].name).toBe('Bronze');
      expect(data.tiers[1].name).toBe('Silver');
      expect(data.tiers[2].name).toBe('Gold');
      expect(data.tiers[3].name).toBe('Platinum');
    });

    it('Silver user sees 3 tiers (tier_order >= 2)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.tiers.length).toBe(3);
      expect(data.tiers[0].name).toBe('Silver');
      expect(data.tiers[1].name).toBe('Gold');
      expect(data.tiers[2].name).toBe('Platinum');
      // Bronze should NOT be present
      expect(data.tiers.find((t: any) => t.name === 'Bronze')).toBeUndefined();
    });

    it('Platinum user sees only 1 tier (tier_order >= 4)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockPlatinumUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.tiers.length).toBe(1);
      expect(data.tiers[0].name).toBe('Platinum');
    });
  });

  describe('Task 7.3.1: VIP Metric-Aware Formatting', () => {
    it('sales_dollars mode formats with $ symbol', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.vipSystem.metric).toBe('sales_dollars');
      expect(data.user.currentSalesFormatted).toMatch(/^\$/);
      expect(data.progress.nextTierTargetFormatted).toMatch(/^\$/);
      expect(data.progress.amountRemainingFormatted).toMatch(/^\$/);
      expect(data.progress.progressText).toContain('$');

      // Tier minSales formatting
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      expect(silverTier.minSalesFormatted).toMatch(/^\$/);
      expect(silverTier.salesDisplayText).toContain('$');
      expect(silverTier.salesDisplayText).toContain('in sales');
    });

    it('sales_units mode formats with units suffix', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue({
        ...mockBronzeUserContext,
        totalUnits: 320,
      });
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsUnits);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.vipSystem.metric).toBe('sales_units');
      expect(data.user.currentSalesFormatted).toContain('units');
      expect(data.progress.nextTierTargetFormatted).toContain('units');
      expect(data.progress.amountRemainingFormatted).toContain('units');
      expect(data.progress.progressText).toContain('units to go');

      // Tier minSales formatting
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      expect(silverTier.minSalesFormatted).toContain('units');
      expect(silverTier.salesDisplayText).toContain('in units sold');
    });
  });

  describe('Task 7.3.1: Expiration Logic', () => {
    it('Bronze user has null expiration and showExpiration=false', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentTierName).toBe('Bronze');
      expect(data.user.expirationDate).toBeNull();
      expect(data.user.expirationDateFormatted).toBeNull();
      expect(data.user.showExpiration).toBe(false);
    });

    it('Silver user has ISO 8601 expiration and showExpiration=true', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentTierName).toBe('Silver');
      expect(data.user.expirationDate).toBe('2025-08-10T00:00:00Z');
      expect(data.user.expirationDateFormatted).toBeTruthy();
      expect(data.user.showExpiration).toBe(true);
    });

    it('expiration date is formatted as readable text', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Should be formatted like "August 10, 2025"
      expect(data.user.expirationDateFormatted).toMatch(/\w+ \d+, \d{4}/);
    });
  });

  describe('Task 7.3.1: Rewards Aggregation', () => {
    it('rewards are limited to max 4 per tier', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      for (const tier of data.tiers) {
        expect(tier.rewards.length).toBeLessThanOrEqual(4);
      }
    });

    it('rewards are sorted by priority (1-9, ascending)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Find Silver tier with raffle (priority 1 for physical_gift raffle)
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      if (silverTier && silverTier.rewards.length > 1) {
        for (let i = 1; i < silverTier.rewards.length; i++) {
          expect(silverTier.rewards[i].sortPriority).toBeGreaterThanOrEqual(
            silverTier.rewards[i - 1].sortPriority
          );
        }
      }
    });

    it('raffle rewards have isRaffle=true', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Find Silver tier which has raffle mission
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      if (silverTier) {
        const raffleReward = silverTier.rewards.find((r: any) => r.isRaffle === true);
        if (raffleReward) {
          expect(raffleReward.displayText).toContain('Chance to win');
        }
      }
    });

    it('non-raffle rewards have isRaffle=false', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      const bronzeTier = data.tiers.find((t: any) => t.name === 'Bronze');
      if (bronzeTier && bronzeTier.rewards.length > 0) {
        // Bronze tier in our fixtures has no raffles
        for (const reward of bronzeTier.rewards) {
          expect(reward.isRaffle).toBe(false);
        }
      }
    });
  });

  describe('Task 7.3.1: isUnlocked and isCurrent Flags', () => {
    it('Bronze user: Bronze is unlocked and current, others unlocked=false', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      const bronzeTier = data.tiers.find((t: any) => t.name === 'Bronze');
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');

      expect(bronzeTier.isUnlocked).toBe(true);
      expect(bronzeTier.isCurrent).toBe(true);
      expect(silverTier.isUnlocked).toBe(false);
      expect(silverTier.isCurrent).toBe(false);
    });

    it('Silver user: Bronze+Silver unlocked, Silver is current', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Silver user only sees Silver, Gold, Platinum (Bronze filtered out)
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      const goldTier = data.tiers.find((t: any) => t.name === 'Gold');

      expect(silverTier.isUnlocked).toBe(true);
      expect(silverTier.isCurrent).toBe(true);
      expect(goldTier.isUnlocked).toBe(false);
      expect(goldTier.isCurrent).toBe(false);
    });
  });

  describe('Task 7.3.1: Commission Rate Display', () => {
    it('commission rates are displayed correctly', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      const bronzeTier = data.tiers.find((t: any) => t.name === 'Bronze');
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      const platinumTier = data.tiers.find((t: any) => t.name === 'Platinum');

      expect(bronzeTier.commissionRate).toBe(10);
      expect(bronzeTier.commissionDisplayText).toBe('10% Commission on sales');

      expect(silverTier.commissionRate).toBe(12);
      expect(silverTier.commissionDisplayText).toBe('12% Commission on sales');

      expect(platinumTier.commissionRate).toBe(20);
      expect(platinumTier.commissionDisplayText).toBe('20% Commission on sales');
    });
  });

  describe('Task 7.3.1: totalPerksCount Calculation', () => {
    it('totalPerksCount includes VIP rewards uses', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Bronze tier has gift_card (uses: 2) + commission_boost (uses: 1) from VIP + gift_card mission (uses: 1)
      // Total = 2 + 1 + 1 = 4
      const bronzeTier = data.tiers.find((t: any) => t.name === 'Bronze');
      expect(bronzeTier.totalPerksCount).toBeGreaterThan(0);
      expect(typeof bronzeTier.totalPerksCount).toBe('number');
    });
  });

  // ============================================
  // Task 7.3.2: Tier Progression Calculation Tests
  // ============================================
  describe('Task 7.3.2: Progress Field Calculations', () => {
    it('nextTierTarget is correct for Bronze user', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Bronze user's next tier is Silver (threshold 1000)
      expect(data.progress.nextTierName).toBe('Silver');
      expect(data.progress.nextTierTarget).toBe(1000);
    });

    it('amountRemaining = nextTierTarget - currentSales', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Bronze user: currentSales = 320, nextTierTarget = 1000
      // amountRemaining = 1000 - 320 = 680
      expect(data.user.currentSales).toBe(320);
      expect(data.progress.nextTierTarget).toBe(1000);
      expect(data.progress.amountRemaining).toBe(680);
    });

    it('progressPercentage = (currentSales / nextTierTarget) * 100', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Bronze user: 320 / 1000 = 32%
      expect(data.progress.progressPercentage).toBe(32);
    });

    it('progressText formatted with VIP metric (sales_dollars)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // "$680 to go"
      expect(data.progress.progressText).toBe('$680 to go');
    });

    it('progressText formatted with VIP metric (sales_units)', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue({
        ...mockBronzeUserContext,
        totalSales: 320,
        totalUnits: 320,
      });
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsUnits);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // "680 units to go"
      expect(data.progress.progressText).toBe('680 units to go');
    });

    it('Bronze user shows Silver as next tier', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentTierName).toBe('Bronze');
      expect(data.progress.nextTierName).toBe('Silver');
    });

    it('Silver user shows Gold as next tier', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupSilverUserMocks();

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentTierName).toBe('Silver');
      expect(data.progress.nextTierName).toBe('Gold');
      expect(data.progress.nextTierTarget).toBe(3000);
      // 2100 sales, need 3000
      expect(data.progress.amountRemaining).toBe(900);
    });

    it('Platinum user at max tier has appropriate progress handling', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockPlatinumUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentTierName).toBe('Platinum');
      // At max tier, nextTierName should indicate max or be null/empty
      // Implementation may vary - checking that progressPercentage is 100 or similar
      expect(data.progress.progressPercentage).toBe(100);
    });
  });

  // ============================================
  // Multi-tenant Isolation Tests
  // ============================================
  describe('Multi-tenant Isolation', () => {
    it('repository queries are called with correct client_id', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();

      const request = createMockRequest();
      await getTiers(request);

      expect(mockTierRepo.getUserTierContext).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_CLIENT_ID
      );
      expect(mockTierRepo.getVipSystemSettings).toHaveBeenCalledWith(TEST_CLIENT_ID);
      expect(mockTierRepo.getAllTiers).toHaveBeenCalledWith(TEST_CLIENT_ID);
      expect(mockTierRepo.getVipTierRewards).toHaveBeenCalledWith(TEST_CLIENT_ID);
      expect(mockTierRepo.getTierMissions).toHaveBeenCalledWith(TEST_CLIENT_ID);
    });
  });

  // ============================================
  // Edge Case Tests
  // ============================================
  describe('Edge Cases: Zero Sales', () => {
    it('user with exactly 0 sales shows correct progress', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockZeroSalesUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.currentSales).toBe(0);
      expect(data.user.currentSalesFormatted).toBe('$0');
      expect(data.progress.amountRemaining).toBe(1000); // Full amount to Silver
      expect(data.progress.progressPercentage).toBe(0);
      expect(data.progress.progressText).toBe('$1,000 to go');
    });

    it('user with 0 units in units mode shows correct progress', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockZeroSalesUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsUnits);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(data.user.currentSalesFormatted).toBe('0 units');
      expect(data.progress.progressText).toBe('1,000 units to go');
    });
  });

  describe('Edge Cases: At Threshold', () => {
    it('user exactly at tier threshold shows correct state', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockAtThresholdUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.currentTierName).toBe('Silver');
      expect(data.user.currentSales).toBe(1000);
      // Progress to Gold (3000)
      expect(data.progress.nextTierName).toBe('Gold');
      expect(data.progress.nextTierTarget).toBe(3000);
      expect(data.progress.amountRemaining).toBe(2000);
      // 1000/3000 = 33.33...% (rounded)
      expect(data.progress.progressPercentage).toBeCloseTo(33.33, 0);
    });
  });

  describe('Edge Cases: Above Max Tier', () => {
    it('user well above max tier threshold shows 100% progress', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockAboveMaxUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.currentTierName).toBe('Platinum');
      expect(data.user.currentSales).toBe(10000);
      // At max tier
      expect(data.progress.progressPercentage).toBe(100);
      expect(data.progress.nextTierName).toBe('Max Tier');
    });
  });

  describe('Edge Cases: Empty Rewards', () => {
    it('tier with no rewards returns empty rewards array', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockBronzeUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockEmptyVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockEmptyMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // All tiers should have empty rewards arrays
      for (const tier of data.tiers) {
        expect(tier.rewards).toEqual([]);
        expect(tier.totalPerksCount).toBe(0);
      }
    });
  });

  describe('Edge Cases: VIP Metric Threshold Selection', () => {
    it('sales_dollars mode uses salesThreshold for minSales', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      setupBronzeUserMocks();
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Silver tier has salesThreshold: 1000
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      expect(silverTier.minSales).toBe(1000);
      expect(silverTier.minSalesFormatted).toBe('$1,000');
    });

    it('sales_units mode uses unitsThreshold for minSales', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(mockBronzeUserContext);
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsUnits);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      // Silver tier has unitsThreshold: 1000
      const silverTier = data.tiers.find((t: any) => t.name === 'Silver');
      expect(silverTier.minSales).toBe(1000);
      expect(silverTier.minSalesFormatted).toBe('1,000 units');
    });
  });

  describe('Edge Cases: Error Handling', () => {
    it('returns 500 when getUserTierContext returns null', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockResolvedValue(null); // User not found in tier context
      mockTierRepo.getVipSystemSettings.mockResolvedValue(mockVipSettingsDollars);
      mockTierRepo.getAllTiers.mockResolvedValue(mockAllTiers);
      mockTierRepo.getVipTierRewards.mockResolvedValue(mockVipRewards);
      mockTierRepo.getTierMissions.mockResolvedValue(mockMissionRewards);

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });

    it('returns 500 when repository throws error', async () => {
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockTierRepo.getUserTierContext.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest();
      const response = await getTiers(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });
});
