// app/admin/reports/mock-data.ts
// Mock data for Reports screen

import type {
  RewardsSummaryReport,
  CreatorActivityReport,
  ReportsResponse
} from './types'

// =============================================================================
// MOCK REWARDS SUMMARY
// =============================================================================

export const mockRewardsSummary: RewardsSummaryReport = {
  periodLabel: 'November 2025',
  rows: [
    {
      rewardType: 'gift_card',
      rewardTypeFormatted: 'Gift Cards',
      count: 45,
      countFormatted: '45',
      totalSpent: 2250.00,
      totalSpentFormatted: '$2,250.00'
    },
    {
      rewardType: 'spark_ads',
      rewardTypeFormatted: 'Spark Ads',
      count: 12,
      countFormatted: '12',
      totalSpent: 1200.00,
      totalSpentFormatted: '$1,200.00'
    },
    {
      rewardType: 'commission_boost',
      rewardTypeFormatted: 'Commission Boosts',
      count: 8,
      countFormatted: '8',
      totalSpent: 847.50,
      totalSpentFormatted: '$847.50'
    },
    {
      rewardType: 'discount',
      rewardTypeFormatted: 'Discounts',
      count: 23,
      countFormatted: '23',
      totalSpent: null,
      totalSpentFormatted: '-'
    },
    {
      rewardType: 'physical_gift',
      rewardTypeFormatted: 'Physical Gifts',
      count: 5,
      countFormatted: '5',
      totalSpent: null,
      totalSpentFormatted: '-'
    },
    {
      rewardType: 'experience',
      rewardTypeFormatted: 'Experiences',
      count: 2,
      countFormatted: '2',
      totalSpent: null,
      totalSpentFormatted: '-'
    }
  ],
  totalCount: 95,
  totalCountFormatted: '95',
  totalSpent: 4297.50,
  totalSpentFormatted: '$4,297.50'
}

// =============================================================================
// MOCK CREATOR ACTIVITY
// =============================================================================

export const mockCreatorActivity: CreatorActivityReport = {
  periodLabel: 'November 2025',
  totalUniqueCreators: 67,
  totalUniqueCreatorsFormatted: '67',
  totalRedemptions: 95,
  totalRedemptionsFormatted: '95',
  rows: [
    {
      rewardType: 'gift_card',
      rewardTypeFormatted: 'Gift Cards',
      redemptionCount: 45,
      redemptionCountFormatted: '45',
      uniqueCreators: 38,
      uniqueCreatorsFormatted: '38'
    },
    {
      rewardType: 'spark_ads',
      rewardTypeFormatted: 'Spark Ads',
      redemptionCount: 12,
      redemptionCountFormatted: '12',
      uniqueCreators: 10,
      uniqueCreatorsFormatted: '10'
    },
    {
      rewardType: 'commission_boost',
      rewardTypeFormatted: 'Commission Boosts',
      redemptionCount: 8,
      redemptionCountFormatted: '8',
      uniqueCreators: 7,
      uniqueCreatorsFormatted: '7'
    },
    {
      rewardType: 'discount',
      rewardTypeFormatted: 'Discounts',
      redemptionCount: 23,
      redemptionCountFormatted: '23',
      uniqueCreators: 21,
      uniqueCreatorsFormatted: '21'
    },
    {
      rewardType: 'physical_gift',
      rewardTypeFormatted: 'Physical Gifts',
      redemptionCount: 5,
      redemptionCountFormatted: '5',
      uniqueCreators: 5,
      uniqueCreatorsFormatted: '5'
    },
    {
      rewardType: 'experience',
      rewardTypeFormatted: 'Experiences',
      redemptionCount: 2,
      redemptionCountFormatted: '2',
      uniqueCreators: 2,
      uniqueCreatorsFormatted: '2'
    }
  ]
}

// =============================================================================
// MOCK RESPONSE
// =============================================================================

export const mockReportsResponse: ReportsResponse = {
  dateRange: {
    preset: 'this_month',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    periodLabel: 'November 2025'
  },
  rewardsSummary: mockRewardsSummary,
  creatorActivity: mockCreatorActivity
}
