// app/admin/vip-rewards/mock-data.ts
// Mock data for VIP Rewards screen - TEST SCENARIOS for all reward types

import type {
  VipRewardsResponse,
  VipRewardDetails,
  GiftCardValueData,
  CommissionBoostValueData,
  SparkAdsValueData,
  DiscountValueData,
  PhysicalGiftValueData,
  ExperienceValueData
} from './types'

// =============================================================================
// MAIN RESPONSE DATA
// =============================================================================

export const mockVipRewardsData: VipRewardsResponse = {
  totalCount: 6,
  totalCountFormatted: "6",
  rewards: [
    // TEST 1: Gift card - Bronze tier
    {
      id: "reward-001",
      name: "$50 Gift Card",
      type: "gift_card",
      typeFormatted: "Gift Card",
      tierEligibility: "tier_1",
      tierFormatted: "Bronze",
      redemptionFrequency: "monthly",
      frequencyFormatted: "Monthly",
      enabled: true,
      statusFormatted: "Active"
    },
    // TEST 2: Commission boost - Silver tier
    {
      id: "reward-002",
      name: "5% Pay Boost",
      type: "commission_boost",
      typeFormatted: "Commission Boost",
      tierEligibility: "tier_2",
      tierFormatted: "Silver",
      redemptionFrequency: "one-time",
      frequencyFormatted: "One-time",
      enabled: true,
      statusFormatted: "Active"
    },
    // TEST 3: Spark ads - Gold tier
    {
      id: "reward-003",
      name: "$100 Ads Boost",
      type: "spark_ads",
      typeFormatted: "Spark Ads",
      tierEligibility: "tier_3",
      tierFormatted: "Gold",
      redemptionFrequency: "unlimited",
      frequencyFormatted: "Unlimited",
      enabled: true,
      statusFormatted: "Active"
    },
    // TEST 4: Discount - Gold tier (inactive)
    {
      id: "reward-004",
      name: "10% Deal Boost",
      type: "discount",
      typeFormatted: "Discount",
      tierEligibility: "tier_3",
      tierFormatted: "Gold",
      redemptionFrequency: "weekly",
      frequencyFormatted: "Weekly",
      enabled: false,
      statusFormatted: "Inactive"
    },
    // TEST 5: Physical gift - Platinum tier
    {
      id: "reward-005",
      name: "Gift Drop: Hoodie",
      type: "physical_gift",
      typeFormatted: "Physical Gift",
      tierEligibility: "tier_4",
      tierFormatted: "Platinum",
      redemptionFrequency: "one-time",
      frequencyFormatted: "One-time",
      enabled: true,
      statusFormatted: "Active"
    },
    // TEST 6: Experience - Platinum tier
    {
      id: "reward-006",
      name: "VIP Dinner",
      type: "experience",
      typeFormatted: "Experience",
      tierEligibility: "tier_4",
      tierFormatted: "Platinum",
      redemptionFrequency: "one-time",
      frequencyFormatted: "One-time",
      enabled: true,
      statusFormatted: "Active"
    }
  ]
}

// =============================================================================
// REWARD DETAILS (for drawer)
// =============================================================================

export const mockVipRewardDetails: Record<string, VipRewardDetails> = {
  // TEST 1: Gift card
  "reward-001": {
    id: "reward-001",
    type: "gift_card",
    description: null,
    valueData: {
      amount: 50
    } as GiftCardValueData,
    tierEligibility: "tier_1",
    previewFromTier: null,
    redemptionFrequency: "monthly",
    redemptionQuantity: 1,
    enabled: true,
    name: "$50 Gift Card"
  },
  // TEST 2: Commission boost
  "reward-002": {
    id: "reward-002",
    type: "commission_boost",
    description: null,
    valueData: {
      percent: 5,
      durationDays: 30
    } as CommissionBoostValueData,
    tierEligibility: "tier_2",
    previewFromTier: "tier_1",  // Bronze can preview
    redemptionFrequency: "one-time",
    redemptionQuantity: 1,
    enabled: true,
    name: "5% Pay Boost"
  },
  // TEST 3: Spark ads
  "reward-003": {
    id: "reward-003",
    type: "spark_ads",
    description: null,
    valueData: {
      amount: 100
    } as SparkAdsValueData,
    tierEligibility: "tier_3",
    previewFromTier: "tier_2",  // Silver can preview
    redemptionFrequency: "unlimited",
    redemptionQuantity: null,
    enabled: true,
    name: "$100 Ads Boost"
  },
  // TEST 4: Discount (inactive)
  "reward-004": {
    id: "reward-004",
    type: "discount",
    description: null,
    valueData: {
      percent: 10,
      durationMinutes: 1440,  // 24 hours
      couponCode: "GOLD10",
      maxUses: 100
    } as DiscountValueData,
    tierEligibility: "tier_3",
    previewFromTier: null,
    redemptionFrequency: "weekly",
    redemptionQuantity: 2,
    enabled: false,
    name: "10% Deal Boost"
  },
  // TEST 5: Physical gift with sizes
  "reward-005": {
    id: "reward-005",
    type: "physical_gift",
    description: "Hoodie",
    valueData: {
      requiresSize: true,
      sizeCategory: "clothing",
      sizeOptions: ["S", "M", "L", "XL", "XXL"],
      displayText: "Premium branded hoodie"
    } as PhysicalGiftValueData,
    tierEligibility: "tier_4",
    previewFromTier: "tier_3",  // Gold can preview
    redemptionFrequency: "one-time",
    redemptionQuantity: 1,
    enabled: true,
    name: "Gift Drop: Hoodie"
  },
  // TEST 6: Experience
  "reward-006": {
    id: "reward-006",
    type: "experience",
    description: "VIP Dinner",
    valueData: {
      displayText: "Exclusive dinner with team"
    } as ExperienceValueData,
    tierEligibility: "tier_4",
    previewFromTier: "tier_3",  // Gold can preview
    redemptionFrequency: "one-time",
    redemptionQuantity: 1,
    enabled: true,
    name: "VIP Dinner"
  }
}

// =============================================================================
// NEW REWARD TEMPLATE
// =============================================================================

export const newRewardTemplate: VipRewardDetails = {
  id: null,
  type: "gift_card",
  description: null,
  valueData: { amount: 0 },
  tierEligibility: "tier_1",
  previewFromTier: null,
  redemptionFrequency: "one-time",
  redemptionQuantity: 1,
  enabled: true,
  name: null
}
