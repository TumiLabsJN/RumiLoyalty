// app/admin/creator-lookup/mock-data.ts
// Mock data for Creator Lookup screen - TEST SCENARIOS

import type {
  CreatorProfile,
  ActiveRedemption,
  MissionProgressItem,
  RedemptionHistoryItem,
  CreatorDetailsResponse,
  CreatorSearchResponse
} from './types'

// =============================================================================
// MOCK CREATORS DATABASE
// =============================================================================

const mockCreatorProfiles: Record<string, CreatorProfile> = {
  '@creator_jane': {
    id: 'user-001',
    handle: '@creator_jane',
    email: 'jane@email.com',
    currentTier: 'tier_3',
    currentTierName: 'Gold',
    // Sales mode
    totalSales: 5420.00,
    totalSalesFormatted: '$5,420',
    checkpointSalesCurrent: 1200.00,
    checkpointSalesTarget: 2000.00,
    checkpointProgressFormatted: '$1,200 / $2,000',
    // Units mode (null for sales mode client)
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnitsCurrent: null,
    checkpointUnitsTarget: null,
    checkpointUnitsProgressFormatted: null,
    // Member info
    createdAt: '2025-01-15T10:30:00Z',
    memberSinceFormatted: 'Jan 15, 2025'
  },
  '@creator_bob': {
    id: 'user-002',
    handle: '@creator_bob',
    email: 'bob@creator.com',
    currentTier: 'tier_4',
    currentTierName: 'Platinum',
    totalSales: 12850.50,
    totalSalesFormatted: '$12,850',
    checkpointSalesCurrent: 3200.00,
    checkpointSalesTarget: 5000.00,
    checkpointProgressFormatted: '$3,200 / $5,000',
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnitsCurrent: null,
    checkpointUnitsTarget: null,
    checkpointUnitsProgressFormatted: null,
    createdAt: '2024-11-01T08:00:00Z',
    memberSinceFormatted: 'Nov 1, 2024'
  },
  '@new_creator': {
    id: 'user-003',
    handle: '@new_creator',
    email: 'newbie@test.com',
    currentTier: 'tier_1',
    currentTierName: 'Bronze',
    totalSales: 250.00,
    totalSalesFormatted: '$250',
    checkpointSalesCurrent: 250.00,
    checkpointSalesTarget: 500.00,
    checkpointProgressFormatted: '$250 / $500',
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnitsCurrent: null,
    checkpointUnitsTarget: null,
    checkpointUnitsProgressFormatted: null,
    createdAt: '2025-11-20T14:00:00Z',
    memberSinceFormatted: 'Nov 20, 2025'
  }
}

// Email lookup mapping
const emailToHandle: Record<string, string> = {
  'jane@email.com': '@creator_jane',
  'bob@creator.com': '@creator_bob',
  'newbie@test.com': '@new_creator'
}

// =============================================================================
// MOCK ACTIVE REDEMPTIONS
// =============================================================================

const mockActiveRedemptions: Record<string, ActiveRedemption[]> = {
  'user-001': [
    {
      id: 'red-001',
      rewardName: '$50 Gift Card',
      rewardType: 'gift_card',
      rewardTypeFormatted: 'Gift Card',
      status: 'claimed',
      statusFormatted: 'Claimed',
      claimedAt: '2025-11-20T10:30:00Z',
      claimedAtFormatted: 'Nov 20',
      subStatus: null
    },
    {
      id: 'red-002',
      rewardName: '5% Pay Boost',
      rewardType: 'commission_boost',
      rewardTypeFormatted: 'Pay Boost',
      status: 'fulfilled',
      statusFormatted: 'Active',
      claimedAt: '2025-11-15T14:00:00Z',
      claimedAtFormatted: 'Nov 15',
      subStatus: 'boost_active'  // Commission boost is currently active
    },
    {
      id: 'red-003',
      rewardName: 'Hoodie (L)',
      rewardType: 'physical_gift',
      rewardTypeFormatted: 'Physical Gift',
      status: 'fulfilled',
      statusFormatted: 'Shipping',
      claimedAt: '2025-11-18T09:00:00Z',
      claimedAtFormatted: 'Nov 18',
      subStatus: 'shipped'  // Physical gift has been shipped
    }
  ],
  'user-002': [
    {
      id: 'red-004',
      rewardName: '$100 Spark Ads',
      rewardType: 'spark_ads',
      rewardTypeFormatted: 'Spark Ads',
      status: 'claimed',
      statusFormatted: 'Claimed',
      claimedAt: '2025-11-22T16:00:00Z',
      claimedAtFormatted: 'Nov 22',
      subStatus: null
    }
  ],
  'user-003': []  // New creator has no active redemptions
}

// =============================================================================
// MOCK MISSION PROGRESS
// =============================================================================

const mockMissionProgress: Record<string, MissionProgressItem[]> = {
  'user-001': [
    {
      id: 'prog-001',
      missionName: 'First $500',
      missionType: 'sales_dollars',
      missionTypeFormatted: 'Sales',
      currentValue: 320,
      targetValue: 500,
      progressFormatted: '$320 / $500',
      status: 'active',
      statusFormatted: 'Active'
    },
    {
      id: 'prog-002',
      missionName: '10 Videos',
      missionType: 'videos',
      missionTypeFormatted: 'Videos',
      currentValue: 7,
      targetValue: 10,
      progressFormatted: '7 / 10',
      status: 'active',
      statusFormatted: 'Active'
    },
    {
      id: 'prog-003',
      missionName: 'Holiday Raffle',
      missionType: 'raffle',
      missionTypeFormatted: 'Raffle',
      currentValue: 1,
      targetValue: 1,
      progressFormatted: 'Entered',
      status: 'completed',
      statusFormatted: 'Entered'
    }
  ],
  'user-002': [
    {
      id: 'prog-004',
      missionName: 'Power Seller',
      missionType: 'sales_dollars',
      missionTypeFormatted: 'Sales',
      currentValue: 500,
      targetValue: 500,
      progressFormatted: '$500 / $500',
      status: 'completed',
      statusFormatted: 'Completed'
    },
    {
      id: 'prog-005',
      missionName: '50K Views',
      missionType: 'views',
      missionTypeFormatted: 'Views',
      currentValue: 32000,
      targetValue: 50000,
      progressFormatted: '32K / 50K',
      status: 'active',
      statusFormatted: 'Active'
    }
  ],
  'user-003': [
    {
      id: 'prog-006',
      missionName: 'First Sale',
      missionType: 'sales_dollars',
      missionTypeFormatted: 'Sales',
      currentValue: 50,
      targetValue: 100,
      progressFormatted: '$50 / $100',
      status: 'active',
      statusFormatted: 'Active'
    }
  ]
}

// =============================================================================
// MOCK REDEMPTION HISTORY
// =============================================================================

const mockRedemptionHistory: Record<string, RedemptionHistoryItem[]> = {
  'user-001': [
    {
      id: 'hist-001',
      rewardName: '$25 Gift Card',
      claimedAt: '2025-10-15T10:00:00Z',
      claimedAtFormatted: 'Oct 15',
      concludedAt: '2025-10-16T14:00:00Z',
      concludedAtFormatted: 'Oct 16'
    },
    {
      id: 'hist-002',
      rewardName: '10% Discount',
      claimedAt: '2025-10-10T09:00:00Z',
      claimedAtFormatted: 'Oct 10',
      concludedAt: '2025-10-10T09:30:00Z',
      concludedAtFormatted: 'Oct 10'
    },
    {
      id: 'hist-003',
      rewardName: '$10 Gift Card',
      claimedAt: '2025-09-20T11:00:00Z',
      claimedAtFormatted: 'Sep 20',
      concludedAt: '2025-09-21T10:00:00Z',
      concludedAtFormatted: 'Sep 21'
    }
  ],
  'user-002': [
    {
      id: 'hist-004',
      rewardName: '$100 Gift Card',
      claimedAt: '2025-11-01T08:00:00Z',
      claimedAtFormatted: 'Nov 1',
      concludedAt: '2025-11-02T09:00:00Z',
      concludedAtFormatted: 'Nov 2'
    },
    {
      id: 'hist-005',
      rewardName: '3% Pay Boost',
      claimedAt: '2025-10-15T10:00:00Z',
      claimedAtFormatted: 'Oct 15',
      concludedAt: '2025-11-15T10:00:00Z',
      concludedAtFormatted: 'Nov 15'
    }
  ],
  'user-003': []  // New creator has no history
}

// =============================================================================
// MOCK API FUNCTIONS
// =============================================================================

/**
 * Search for a creator by handle or email
 */
export function mockSearchCreator(query: string): CreatorSearchResponse {
  // Normalize query
  const normalizedQuery = query.trim().toLowerCase()

  // Try handle search (with or without @)
  let handle = normalizedQuery.startsWith('@') ? normalizedQuery : `@${normalizedQuery}`
  let creator = mockCreatorProfiles[handle]

  // If not found by handle, try email
  if (!creator) {
    const handleFromEmail = emailToHandle[normalizedQuery]
    if (handleFromEmail) {
      creator = mockCreatorProfiles[handleFromEmail]
    }
  }

  if (creator) {
    return {
      found: true,
      creator,
      error: null
    }
  }

  return {
    found: false,
    creator: null,
    error: `No creator found for "${query}"`
  }
}

/**
 * Get full details for a creator
 */
export function mockGetCreatorDetails(userId: string): CreatorDetailsResponse | null {
  // Find the creator by ID
  const creator = Object.values(mockCreatorProfiles).find(c => c.id === userId)
  if (!creator) return null

  return {
    profile: creator,
    activeRedemptions: mockActiveRedemptions[userId] || [],
    missionProgress: mockMissionProgress[userId] || [],
    redemptionHistory: mockRedemptionHistory[userId] || []
  }
}
