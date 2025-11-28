// app/admin/sales-adjustments/mock-data.ts
// Mock data for Sales Adjustments screen - TEST SCENARIOS

import type {
  CreatorInfo,
  AdjustmentHistoryItem,
  CreatorSearchResponse,
  AdjustmentHistoryResponse
} from './types'

// =============================================================================
// MOCK CREATORS (for search)
// =============================================================================

/**
 * Mock creators database - simulates search results
 * TEST SCENARIOS:
 * - @creator_jane: Has history, sales mode
 * - @creator_bob: Has history, would be units mode if client used units
 * - @new_creator: No history yet
 * - @not_found: Will return not found
 */
export const mockCreators: Record<string, CreatorInfo> = {
  '@creator_jane': {
    id: 'user-001',
    handle: '@creator_jane',
    // Sales mode fields
    totalSales: 5420.00,
    totalSalesFormatted: '$5,420',
    checkpointSales: 1200.00,
    checkpointSalesFormatted: '$1,200',
    manualAdjustmentsTotal: 300.00,
    manualAdjustmentsTotalFormatted: '+$300',
    // Units mode fields (would show if client uses units)
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnits: null,
    checkpointUnitsFormatted: null,
    manualAdjustmentsUnits: null,
    manualAdjustmentsUnitsFormatted: null,
    // Tier
    currentTier: 'tier_3',
    currentTierName: 'Gold'
  },
  '@creator_bob': {
    id: 'user-002',
    handle: '@creator_bob',
    // Sales mode fields
    totalSales: 12850.50,
    totalSalesFormatted: '$12,850',
    checkpointSales: 3200.00,
    checkpointSalesFormatted: '$3,200',
    manualAdjustmentsTotal: -150.00,
    manualAdjustmentsTotalFormatted: '-$150',
    // Units mode fields
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnits: null,
    checkpointUnitsFormatted: null,
    manualAdjustmentsUnits: null,
    manualAdjustmentsUnitsFormatted: null,
    // Tier
    currentTier: 'tier_4',
    currentTierName: 'Platinum'
  },
  '@new_creator': {
    id: 'user-003',
    handle: '@new_creator',
    // Sales mode fields
    totalSales: 250.00,
    totalSalesFormatted: '$250',
    checkpointSales: 250.00,
    checkpointSalesFormatted: '$250',
    manualAdjustmentsTotal: 0,
    manualAdjustmentsTotalFormatted: '$0',
    // Units mode fields
    totalUnits: null,
    totalUnitsFormatted: null,
    checkpointUnits: null,
    checkpointUnitsFormatted: null,
    manualAdjustmentsUnits: null,
    manualAdjustmentsUnitsFormatted: null,
    // Tier
    currentTier: 'tier_1',
    currentTierName: 'Bronze'
  },
  // Units mode creator example (for testing units mode)
  '@units_creator': {
    id: 'user-004',
    handle: '@units_creator',
    // Sales mode fields (null for units mode client)
    totalSales: null,
    totalSalesFormatted: null,
    checkpointSales: null,
    checkpointSalesFormatted: null,
    manualAdjustmentsTotal: null,
    manualAdjustmentsTotalFormatted: null,
    // Units mode fields
    totalUnits: 542,
    totalUnitsFormatted: '542 units',
    checkpointUnits: 120,
    checkpointUnitsFormatted: '120 units',
    manualAdjustmentsUnits: 30,
    manualAdjustmentsUnitsFormatted: '+30 units',
    // Tier
    currentTier: 'tier_2',
    currentTierName: 'Silver'
  }
}

// =============================================================================
// MOCK ADJUSTMENT HISTORY
// =============================================================================

/**
 * Mock adjustment history per user
 * TEST SCENARIOS:
 * - @creator_jane: Multiple adjustments with different types/statuses
 * - @creator_bob: Some adjustments
 * - @new_creator: No history (empty array)
 */
export const mockAdjustmentHistory: Record<string, AdjustmentHistoryItem[]> = {
  'user-001': [
    // @creator_jane's history
    {
      id: 'adj-001',
      createdAt: '2025-11-25T14:30:00Z',
      createdAtFormatted: 'Nov 25',
      amount: 100.00,
      amountUnits: null,
      amountFormatted: '+$100',
      adjustmentType: 'bonus',
      adjustmentTypeFormatted: 'Bonus',
      reason: 'Great video performance',
      appliedAt: null,
      status: 'pending',
      statusFormatted: 'Pending',
      adjustedBy: 'admin-001',
      adjustedByName: 'Admin User'
    },
    {
      id: 'adj-002',
      createdAt: '2025-11-20T10:15:00Z',
      createdAtFormatted: 'Nov 20',
      amount: 200.00,
      amountUnits: null,
      amountFormatted: '+$200',
      adjustmentType: 'manual_sale',
      adjustmentTypeFormatted: 'Manual Sale',
      reason: 'Popup event sales - not tracked in TikTok',
      appliedAt: '2025-11-21T06:00:00Z',
      status: 'applied',
      statusFormatted: 'Applied',
      adjustedBy: 'admin-001',
      adjustedByName: 'Admin User'
    },
    {
      id: 'adj-003',
      createdAt: '2025-11-15T16:45:00Z',
      createdAtFormatted: 'Nov 15',
      amount: -50.00,
      amountUnits: null,
      amountFormatted: '-$50',
      adjustmentType: 'refund',
      adjustmentTypeFormatted: 'Refund',
      reason: 'Customer return - order #12345',
      appliedAt: '2025-11-16T06:00:00Z',
      status: 'applied',
      statusFormatted: 'Applied',
      adjustedBy: 'admin-002',
      adjustedByName: 'Support Admin'
    },
    {
      id: 'adj-004',
      createdAt: '2025-11-10T09:00:00Z',
      createdAtFormatted: 'Nov 10',
      amount: 50.00,
      amountUnits: null,
      amountFormatted: '+$50',
      adjustmentType: 'correction',
      adjustmentTypeFormatted: 'Correction',
      reason: 'Data sync missed this sale',
      appliedAt: '2025-11-11T06:00:00Z',
      status: 'applied',
      statusFormatted: 'Applied',
      adjustedBy: 'admin-001',
      adjustedByName: 'Admin User'
    }
  ],
  'user-002': [
    // @creator_bob's history
    {
      id: 'adj-005',
      createdAt: '2025-11-18T11:30:00Z',
      createdAtFormatted: 'Nov 18',
      amount: -150.00,
      amountUnits: null,
      amountFormatted: '-$150',
      adjustmentType: 'refund',
      adjustmentTypeFormatted: 'Refund',
      reason: 'Multiple returns from Black Friday',
      appliedAt: '2025-11-19T06:00:00Z',
      status: 'applied',
      statusFormatted: 'Applied',
      adjustedBy: 'admin-001',
      adjustedByName: 'Admin User'
    }
  ],
  'user-003': [],  // @new_creator has no history
  'user-004': [
    // @units_creator's history (units mode)
    {
      id: 'adj-006',
      createdAt: '2025-11-22T13:00:00Z',
      createdAtFormatted: 'Nov 22',
      amount: null,
      amountUnits: 30,
      amountFormatted: '+30 units',
      adjustmentType: 'manual_sale',
      adjustmentTypeFormatted: 'Manual Sale',
      reason: 'In-store demo sales',
      appliedAt: '2025-11-23T06:00:00Z',
      status: 'applied',
      statusFormatted: 'Applied',
      adjustedBy: 'admin-001',
      adjustedByName: 'Admin User'
    }
  ]
}

// =============================================================================
// MOCK API FUNCTIONS
// =============================================================================

/**
 * Simulate searching for a creator by handle
 */
export function mockSearchCreator(handle: string): CreatorSearchResponse {
  // Normalize handle (add @ if missing)
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`

  const creator = mockCreators[normalizedHandle.toLowerCase()] || mockCreators[normalizedHandle]

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
    error: `Creator "${normalizedHandle}" not found`
  }
}

/**
 * Simulate getting adjustment history for a user
 */
export function mockGetAdjustmentHistory(userId: string): AdjustmentHistoryResponse {
  const adjustments = mockAdjustmentHistory[userId] || []

  return {
    adjustments,
    totalCount: adjustments.length,
    totalCountFormatted: adjustments.length.toString()
  }
}
