// app/admin/missions/mock-data.ts
// Mock data for Missions screen - TEST SCENARIOS for all flows

import type {
  MissionsResponse,
  MissionDetails,
  RaffleDetails,
  RaffleParticipant,
  RewardOption
} from './types'

// =============================================================================
// MAIN RESPONSE DATA
// =============================================================================

export const mockMissionsData: MissionsResponse = {
  totalCount: 5,
  totalCountFormatted: "5",
  missions: [
    // TEST 1: Sales mission (dollars) - active
    {
      id: "mission-001",
      displayName: "First Sale",
      missionType: "sales_dollars",
      missionTypeFormatted: "Sales",
      targetValue: 100,
      targetValueFormatted: "$100",
      rewardName: "$10 Gift Card",
      tierEligibility: "tier_1",
      tierFormatted: "Bronze",
      status: "active",
      statusFormatted: "Active",
      raffleEndDate: null,
      raffleEndDateFormatted: null,
      raffleEntryCount: null
    },
    // TEST 2: Sales mission (dollars) - active, higher tier
    {
      id: "mission-002",
      displayName: "Power Seller",
      missionType: "sales_dollars",
      missionTypeFormatted: "Sales",
      targetValue: 500,
      targetValueFormatted: "$500",
      rewardName: "5% Commission Boost",
      tierEligibility: "tier_2",
      tierFormatted: "Silver",
      status: "active",
      statusFormatted: "Active",
      raffleEndDate: null,
      raffleEndDateFormatted: null,
      raffleEntryCount: null
    },
    // TEST 3: Sales mission (units) - active
    {
      id: "mission-003",
      displayName: "Unit Master",
      missionType: "sales_units",
      missionTypeFormatted: "Units",
      targetValue: 25,
      targetValueFormatted: "25 units",
      rewardName: "Branded Hoodie",
      tierEligibility: "tier_3",
      tierFormatted: "Gold",
      status: "active",
      statusFormatted: "Active",
      raffleEndDate: null,
      raffleEndDateFormatted: null,
      raffleEntryCount: null
    },
    // TEST 4: Raffle - active, accepting entries
    {
      id: "mission-004",
      displayName: "Holiday Raffle",
      missionType: "raffle",
      missionTypeFormatted: "Raffle",
      targetValue: 0,
      targetValueFormatted: "-",
      rewardName: "iPhone 16",
      tierEligibility: "all",
      tierFormatted: "All Tiers",
      status: "active",
      statusFormatted: "Active",
      raffleEndDate: "2025-11-30T23:59:59Z",
      raffleEndDateFormatted: "Nov 30",
      raffleEntryCount: 45
    },
    // TEST 5: Raffle - draft (not activated)
    {
      id: "mission-005",
      displayName: "Spring Raffle",
      missionType: "raffle",
      missionTypeFormatted: "Raffle",
      targetValue: 0,
      targetValueFormatted: "-",
      rewardName: "$500 Gift Card",
      tierEligibility: "tier_3",
      tierFormatted: "Gold",
      status: "draft",
      statusFormatted: "Draft",
      raffleEndDate: "2025-03-15T23:59:59Z",
      raffleEndDateFormatted: "Mar 15",
      raffleEntryCount: 0
    }
  ]
}

// =============================================================================
// MISSION DETAILS (for drawer)
// =============================================================================

export const mockMissionDetails: Record<string, MissionDetails> = {
  // TEST 1: Sales mission - edit mode
  "mission-001": {
    id: "mission-001",
    title: "bronze_first_sale",
    displayName: "First Sale",
    description: "Entry-level sales mission for Bronze tier",
    missionType: "sales_dollars",
    targetValue: 100,
    targetUnit: "dollars",
    rewardId: "reward-001",
    tierEligibility: "tier_1",
    previewFromTier: null,  // No preview for lower tiers
    displayOrder: 1,
    enabled: true,
    activated: true,
    raffleEndDate: null,
    rewardName: "$10 Gift Card",
    inlineReward: null
  },
  // TEST 2: Sales mission - higher tier, with preview from Bronze
  "mission-002": {
    id: "mission-002",
    title: "silver_power_seller",
    displayName: "Power Seller",
    description: "Power seller milestone for Silver tier",
    missionType: "sales_dollars",
    targetValue: 500,
    targetUnit: "dollars",
    rewardId: "reward-002",
    tierEligibility: "tier_2",
    previewFromTier: "tier_1",  // Bronze can see as locked preview
    displayOrder: 1,
    enabled: true,
    activated: true,
    raffleEndDate: null,
    rewardName: "5% Commission Boost",
    inlineReward: null
  },
  // TEST 3: Units mission
  "mission-003": {
    id: "mission-003",
    title: "gold_unit_master",
    displayName: "Unit Master",
    description: "Volume milestone for Gold tier",
    missionType: "sales_units",
    targetValue: 25,
    targetUnit: "units",
    rewardId: "reward-003",
    tierEligibility: "tier_3",
    previewFromTier: "tier_2",  // Silver can see as locked preview
    displayOrder: 1,
    enabled: true,
    activated: true,
    raffleEndDate: null,
    rewardName: "Branded Hoodie",
    inlineReward: null
  },
  // TEST 4: Active raffle
  "mission-004": {
    id: "mission-004",
    title: "holiday_raffle_2025",
    displayName: "Holiday Raffle",
    description: "End of year raffle for all creators",
    missionType: "raffle",
    targetValue: 0,
    targetUnit: "count",
    rewardId: "reward-004",
    tierEligibility: "all",
    previewFromTier: null,  // Open to all, no preview needed
    displayOrder: 1,
    enabled: true,
    activated: true,
    raffleEndDate: "2025-11-30",
    rewardName: "iPhone 16",
    inlineReward: null
  },
  // TEST 5: Draft raffle (not activated)
  "mission-005": {
    id: "mission-005",
    title: "spring_raffle_2025",
    displayName: "Spring Raffle",
    description: "Spring season raffle for Gold+ tiers",
    missionType: "raffle",
    targetValue: 0,
    targetUnit: "count",
    rewardId: "reward-005",
    tierEligibility: "tier_3",
    previewFromTier: null,  // No preview for raffles
    displayOrder: 2,
    enabled: true,
    activated: false,  // Not activated yet
    raffleEndDate: "2025-03-15",
    rewardName: "$500 Gift Card",
    inlineReward: null
  }
}

// =============================================================================
// RAFFLE DETAILS (for raffle actions drawer)
// =============================================================================

// Mock participants for Holiday Raffle (mission-004)
const holidayRaffleParticipants: RaffleParticipant[] = [
  { id: "part-001", userId: "user-001", handle: "@creator1", participatedAt: "2025-11-01T10:30:00Z", participatedAtFormatted: "Nov 1, 2025" },
  { id: "part-002", userId: "user-002", handle: "@creator2", participatedAt: "2025-11-02T14:15:00Z", participatedAtFormatted: "Nov 2, 2025" },
  { id: "part-003", userId: "user-003", handle: "@creator3", participatedAt: "2025-11-03T09:45:00Z", participatedAtFormatted: "Nov 3, 2025" },
  { id: "part-004", userId: "user-004", handle: "@sparkle_star", participatedAt: "2025-11-04T16:20:00Z", participatedAtFormatted: "Nov 4, 2025" },
  { id: "part-005", userId: "user-005", handle: "@tiktok_queen", participatedAt: "2025-11-05T11:00:00Z", participatedAtFormatted: "Nov 5, 2025" },
  { id: "part-006", userId: "user-006", handle: "@viral_king", participatedAt: "2025-11-06T08:30:00Z", participatedAtFormatted: "Nov 6, 2025" },
  { id: "part-007", userId: "user-007", handle: "@content_creator99", participatedAt: "2025-11-07T13:45:00Z", participatedAtFormatted: "Nov 7, 2025" },
  { id: "part-008", userId: "user-008", handle: "@dance_master", participatedAt: "2025-11-08T17:00:00Z", participatedAtFormatted: "Nov 8, 2025" },
  { id: "part-009", userId: "user-009", handle: "@fashionista_x", participatedAt: "2025-11-09T10:15:00Z", participatedAtFormatted: "Nov 9, 2025" },
  { id: "part-010", userId: "user-010", handle: "@comedy_central", participatedAt: "2025-11-10T15:30:00Z", participatedAtFormatted: "Nov 10, 2025" },
  // More entries to simulate 45 total (showing first 10 for brevity)
]

export const mockRaffleDetails: Record<string, RaffleDetails> = {
  // TEST 4: Active raffle - END DATE PASSED, ready to select winner
  "mission-004": {
    id: "mission-004",
    displayName: "Holiday Raffle",
    rewardName: "iPhone 16",
    tierEligibility: "all",
    tierFormatted: "All Tiers",
    raffleEndDate: "2025-11-25T23:59:59Z",  // Past date so we can test winner selection
    raffleEndDateFormatted: "Nov 25, 2025",
    entryCount: 45,
    activated: true,
    participants: holidayRaffleParticipants,
    winnerHandle: null,  // No winner selected yet
    winnerId: null
  },
  // TEST 5: Draft raffle - needs activation (no participants yet)
  "mission-005": {
    id: "mission-005",
    displayName: "Spring Raffle",
    rewardName: "$500 Gift Card",
    tierEligibility: "tier_3",
    tierFormatted: "Gold",
    raffleEndDate: "2025-03-15T23:59:59Z",
    raffleEndDateFormatted: "Mar 15, 2025",
    entryCount: 0,
    activated: false,  // Dormant
    participants: [],  // No participants yet
    winnerHandle: null,
    winnerId: null
  }
}

// =============================================================================
// AVAILABLE REWARDS (for dropdown)
// =============================================================================

export const mockAvailableRewards: RewardOption[] = [
  {
    id: "reward-001",
    name: "$10 Gift Card",
    type: "gift_card",
    valueFormatted: "$10"
  },
  {
    id: "reward-002",
    name: "5% Commission Boost",
    type: "commission_boost",
    valueFormatted: "5% for 7 days"
  },
  {
    id: "reward-003",
    name: "Branded Hoodie",
    type: "physical_gift",
    valueFormatted: "Apparel"
  },
  {
    id: "reward-004",
    name: "iPhone 16",
    type: "physical_gift",
    valueFormatted: "Device"
  },
  {
    id: "reward-005",
    name: "$500 Gift Card",
    type: "gift_card",
    valueFormatted: "$500"
  },
  {
    id: "reward-006",
    name: "10% Discount",
    type: "discount",
    valueFormatted: "10% off"
  },
  {
    id: "reward-007",
    name: "$100 Spark Ads",
    type: "spark_ads",
    valueFormatted: "$100"
  },
  {
    id: "reward-008",
    name: "VIP Meet & Greet",
    type: "experience",
    valueFormatted: "Experience"
  }
]

// =============================================================================
// NEW MISSION TEMPLATE
// =============================================================================

export const newMissionTemplate: MissionDetails = {
  id: null,
  title: "",
  displayName: "",
  description: null,
  missionType: "sales_dollars",
  targetValue: 0,
  targetUnit: "dollars",
  rewardId: null,
  tierEligibility: "all",
  previewFromTier: null,
  displayOrder: 1,
  enabled: true,
  activated: false,
  raffleEndDate: null,
  rewardName: null,
  inlineReward: null
}
