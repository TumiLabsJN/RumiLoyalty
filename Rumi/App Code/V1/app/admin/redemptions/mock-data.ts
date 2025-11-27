// app/admin/redemptions/mock-data.ts
// Mock data for Redemptions screen - TEST SCENARIOS for all flows

import type {
  RedemptionsResponse,
  PhysicalGiftDetails,
  PayBoostDetails,
  DiscountDetails
} from './types'

// =============================================================================
// MAIN RESPONSE DATA - Multiple test scenarios per tab
// =============================================================================

export const mockRedemptionsData: RedemptionsResponse = {
  // =========================================================================
  // TAB 1: INSTANT REWARDS - Test scenarios
  // =========================================================================
  instantRewards: {
    count: 5,
    countFormatted: "5",
    items: [
      // TEST 1: Gift Card - needs fulfillment (status: claimed)
      {
        id: "instant-001",
        creatorHandle: "@creator1",
        rewardType: "gift_card",
        rewardTypeFormatted: "Gift Card",
        value: "$50",
        email: "creator1@email.com",
        status: "claimed",
        claimedAt: "2025-01-27T08:30:00Z",
        claimedAtFormatted: "4 hours ago"
      },
      // TEST 2: Spark Ads - needs fulfillment (no email shown)
      {
        id: "instant-002",
        creatorHandle: "@creator2",
        rewardType: "spark_ads",
        rewardTypeFormatted: "Spark Ads",
        value: "$100",
        email: null,
        status: "claimed",
        claimedAt: "2025-01-27T06:15:00Z",
        claimedAtFormatted: "6 hours ago"
      },
      // TEST 3: Experience - needs fulfillment
      {
        id: "instant-003",
        creatorHandle: "@creator3",
        rewardType: "experience",
        rewardTypeFormatted: "Experience",
        value: "VIP Meet & Greet",
        email: "creator3@email.com",
        status: "claimed",
        claimedAt: "2025-01-27T10:00:00Z",
        claimedAtFormatted: "2 hours ago"
      },
      // TEST 4: Already done (status: concluded)
      {
        id: "instant-004",
        creatorHandle: "@creator4",
        rewardType: "gift_card",
        rewardTypeFormatted: "Gift Card",
        value: "$25",
        email: "creator4@email.com",
        status: "concluded",
        claimedAt: "2025-01-26T22:00:00Z",
        claimedAtFormatted: "14 hours ago"
      },
      // TEST 5: Raffle winner claim (same flow as regular)
      {
        id: "instant-005",
        creatorHandle: "@winner1",
        rewardType: "gift_card",
        rewardTypeFormatted: "Gift Card",
        value: "$200",
        email: "winner1@email.com",
        status: "claimed",
        claimedAt: "2025-01-27T09:00:00Z",
        claimedAtFormatted: "3 hours ago"
      }
    ]
  },

  // =========================================================================
  // TAB 2: PHYSICAL GIFTS - Test scenarios
  // =========================================================================
  physicalGifts: {
    count: 3,
    countFormatted: "3",
    items: [
      // TEST 1: Claimed - needs shipping (drawer: input carrier, tracking)
      {
        id: "physical-001",
        creatorHandle: "@creator5",
        itemName: "Hoodie",
        sizeValue: "L",
        cityState: "Los Angeles, CA",
        status: "claimed",
        statusFormatted: "Claimed",
        claimedAt: "2025-01-26T15:00:00Z"
      },
      // TEST 2: Shipped - has tracking info (drawer: show tracking, allow mark delivered)
      {
        id: "physical-002",
        creatorHandle: "@creator6",
        itemName: "Cap",
        sizeValue: null,
        cityState: "Miami, FL",
        status: "shipped",
        statusFormatted: "Shipped",
        claimedAt: "2025-01-24T10:00:00Z"
      },
      // TEST 3: Delivered - complete (read-only)
      {
        id: "physical-003",
        creatorHandle: "@creator7",
        itemName: "T-Shirt",
        sizeValue: "M",
        cityState: "New York, NY",
        status: "delivered",
        statusFormatted: "Delivered",
        claimedAt: "2025-01-20T10:00:00Z"
      }
    ]
  },

  // =========================================================================
  // TAB 3: PAY BOOST - Test scenarios
  // =========================================================================
  payBoosts: {
    count: 2,
    countFormatted: "2",
    items: [
      // TEST 1: Pending payout (drawer: input date paid, paid by, txn id, notes)
      {
        id: "boost-001",
        creatorHandle: "@creator8",
        payoutAmount: 47.50,
        payoutAmountFormatted: "$47.50",
        paymentMethod: "PayPal",
        paymentAccount: "john@email.com",
        status: "pending_payout"
      },
      // TEST 2: Already paid (read-only, show payment info)
      {
        id: "boost-002",
        creatorHandle: "@creator9",
        payoutAmount: 125.00,
        payoutAmountFormatted: "$125.00",
        paymentMethod: "Venmo",
        paymentAccount: "@janedoe",
        status: "paid"
      }
    ]
  },

  // =========================================================================
  // TAB 4: DISCOUNT - Test scenarios
  // =========================================================================
  discounts: {
    count: 4,
    countFormatted: "4",
    items: [
      // TEST 1: Ready to activate (scheduled time passed, needs manual activation)
      {
        id: "discount-001",
        creatorHandle: "@creator10",
        discountPercent: 15,
        scheduledDate: "2025-01-27",
        scheduledTime: "14:00:00",
        scheduledFormatted: "Today 2:00 PM",
        couponCode: "GOLD15",
        status: "ready",
        statusFormatted: "Ready"
      },
      // TEST 2: Scheduled for later (waiting for time)
      {
        id: "discount-002",
        creatorHandle: "@creator11",
        discountPercent: 10,
        scheduledDate: "2025-01-27",
        scheduledTime: "16:00:00",
        scheduledFormatted: "Today 4:00 PM",
        couponCode: "SAVE10",
        status: "claimed",
        statusFormatted: "Scheduled"
      },
      // TEST 3: Active (activated, running)
      {
        id: "discount-003",
        creatorHandle: "@creator12",
        discountPercent: 20,
        scheduledDate: "2025-01-27",
        scheduledTime: "10:00:00",
        scheduledFormatted: "Today 10:00 AM",
        couponCode: "VIP20",
        status: "active",
        statusFormatted: "Active"
      },
      // TEST 4: Done (expired)
      {
        id: "discount-004",
        creatorHandle: "@creator13",
        discountPercent: 5,
        scheduledDate: "2025-01-26",
        scheduledTime: "12:00:00",
        scheduledFormatted: "Yesterday 12:00 PM",
        couponCode: "FLASH5",
        status: "done",
        statusFormatted: "Expired"
      }
    ]
  }
}

// =============================================================================
// DRAWER DETAIL DATA - Full details for each scenario
// =============================================================================

export const mockPhysicalGiftDetails: Record<string, PhysicalGiftDetails> = {
  // TEST 1: Needs shipping - drawer shows input fields
  "physical-001": {
    id: "physical-001",
    creatorHandle: "@creator5",
    itemName: "Hoodie",
    sizeValue: "L",
    cityState: "Los Angeles, CA",
    status: "claimed",
    statusFormatted: "Claimed",
    claimedAt: "2025-01-26T15:00:00Z",
    recipientName: "John Smith",
    addressLine1: "123 Main Street",
    addressLine2: "Apt 4B",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90210",
    requiresSize: true,
    sizeCategory: "clothing",
    // Empty - admin needs to fill in:
    carrier: null,
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
    notes: null
  },
  // TEST 2: Already shipped - drawer shows tracking info
  "physical-002": {
    id: "physical-002",
    creatorHandle: "@creator6",
    itemName: "Cap",
    sizeValue: null,
    cityState: "Miami, FL",
    status: "shipped",
    statusFormatted: "Shipped",
    claimedAt: "2025-01-24T10:00:00Z",
    recipientName: "Jane Doe",
    addressLine1: "456 Ocean Drive",
    addressLine2: null,
    city: "Miami",
    state: "FL",
    postalCode: "33139",
    requiresSize: false,
    sizeCategory: null,
    // Filled in by admin:
    carrier: "USPS",
    trackingNumber: "9400111899223456789012",
    shippedAt: "2025-01-25T14:30:00Z",
    deliveredAt: null,  // Not yet delivered
    notes: "Signature required"
  },
  // TEST 3: Delivered - all info complete
  "physical-003": {
    id: "physical-003",
    creatorHandle: "@creator7",
    itemName: "T-Shirt",
    sizeValue: "M",
    cityState: "New York, NY",
    status: "delivered",
    statusFormatted: "Delivered",
    claimedAt: "2025-01-20T10:00:00Z",
    recipientName: "Bob Wilson",
    addressLine1: "789 Broadway",
    addressLine2: "Suite 100",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    requiresSize: true,
    sizeCategory: "clothing",
    carrier: "FedEx",
    trackingNumber: "794644790138",
    shippedAt: "2025-01-21T09:00:00Z",
    deliveredAt: "2025-01-23T14:20:00Z",
    notes: "Left at door"
  }
}

export const mockPayBoostDetails: Record<string, PayBoostDetails> = {
  // TEST 1: Pending payout - drawer shows input fields
  "boost-001": {
    id: "boost-001",
    creatorHandle: "@creator8",
    payoutAmount: 47.50,
    payoutAmountFormatted: "$47.50",
    paymentMethod: "PayPal",
    paymentAccount: "john@email.com",
    status: "pending_payout",
    boostPercent: 5,
    durationDays: 7,
    activatedAt: "2025-01-15T00:00:00Z",
    activatedAtFormatted: "Jan 15, 2025",
    expiresAt: "2025-01-22T00:00:00Z",
    expiresAtFormatted: "Jan 22, 2025",
    salesDuringBoost: 950.00,
    salesDuringBoostFormatted: "$950.00",
    // Empty - admin needs to fill in:
    payoutSentAt: null,
    payoutSentBy: null,
    externalTransactionId: null,
    payoutNotes: null
  },
  // TEST 2: Already paid - all info complete
  "boost-002": {
    id: "boost-002",
    creatorHandle: "@creator9",
    payoutAmount: 125.00,
    payoutAmountFormatted: "$125.00",
    paymentMethod: "Venmo",
    paymentAccount: "@janedoe",
    status: "paid",
    boostPercent: 10,
    durationDays: 14,
    activatedAt: "2025-01-01T00:00:00Z",
    activatedAtFormatted: "Jan 1, 2025",
    expiresAt: "2025-01-15T00:00:00Z",
    expiresAtFormatted: "Jan 15, 2025",
    salesDuringBoost: 1250.00,
    salesDuringBoostFormatted: "$1,250.00",
    // Filled in by admin:
    payoutSentAt: "2025-01-16T10:30:00Z",
    payoutSentBy: "Admin Jorge",
    externalTransactionId: "VNM-123456789",
    payoutNotes: "Sent via Venmo business account"
  }
}

export const mockDiscountDetails: Record<string, DiscountDetails> = {
  // TEST 1: Ready to activate - drawer shows coupon info to copy to TikTok
  "discount-001": {
    id: "discount-001",
    creatorHandle: "@creator10",
    discountPercent: 15,
    scheduledDate: "2025-01-27",
    scheduledTime: "14:00:00",
    scheduledFormatted: "Today 2:00 PM",
    couponCode: "GOLD15",
    status: "ready",
    statusFormatted: "Ready",
    durationMinutes: 30,
    durationFormatted: "30 minutes",
    maxUses: 50,
    // Not yet activated:
    activatedAt: null,
    activatedAtFormatted: null,
    activatedBy: null,
    expiresAt: null,
    expiresAtFormatted: null
  },
  // TEST 2: Scheduled for later
  "discount-002": {
    id: "discount-002",
    creatorHandle: "@creator11",
    discountPercent: 10,
    scheduledDate: "2025-01-27",
    scheduledTime: "16:00:00",
    scheduledFormatted: "Today 4:00 PM",
    couponCode: "SAVE10",
    status: "claimed",
    statusFormatted: "Scheduled",
    durationMinutes: 60,
    durationFormatted: "1 hour",
    maxUses: 100,
    activatedAt: null,
    activatedAtFormatted: null,
    activatedBy: null,
    expiresAt: null,
    expiresAtFormatted: null
  },
  // TEST 3: Active - shows activation info and expiration countdown
  "discount-003": {
    id: "discount-003",
    creatorHandle: "@creator12",
    discountPercent: 20,
    scheduledDate: "2025-01-27",
    scheduledTime: "10:00:00",
    scheduledFormatted: "Today 10:00 AM",
    couponCode: "VIP20",
    status: "active",
    statusFormatted: "Active",
    durationMinutes: 1440,
    durationFormatted: "24 hours",
    maxUses: null,
    // Activated:
    activatedAt: "2025-01-27T10:05:00Z",
    activatedAtFormatted: "Today 10:05 AM",
    activatedBy: "Admin Jorge",
    expiresAt: "2025-01-28T10:05:00Z",
    expiresAtFormatted: "Tomorrow 10:05 AM"
  },
  // TEST 4: Done/Expired
  "discount-004": {
    id: "discount-004",
    creatorHandle: "@creator13",
    discountPercent: 5,
    scheduledDate: "2025-01-26",
    scheduledTime: "12:00:00",
    scheduledFormatted: "Yesterday 12:00 PM",
    couponCode: "FLASH5",
    status: "done",
    statusFormatted: "Expired",
    durationMinutes: 30,
    durationFormatted: "30 minutes",
    maxUses: 25,
    activatedAt: "2025-01-26T12:02:00Z",
    activatedAtFormatted: "Yesterday 12:02 PM",
    activatedBy: "Admin Maria",
    expiresAt: "2025-01-26T12:32:00Z",
    expiresAtFormatted: "Yesterday 12:32 PM"
  }
}
