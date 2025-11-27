// app/admin/dashboard/mock-data.ts
// Mock data for Dashboard - matches DashboardResponse type

import type { DashboardResponse } from './types'

export const mockDashboardData: DashboardResponse = {
  todaysTasks: {
    discounts: {
      count: 2,
      countFormatted: "2",
      items: [
        {
          id: "redemption-disc-001",
          creatorHandle: "@creator1",
          discountPercent: 15,
          scheduledTime: "2025-01-27T14:00:00-05:00",
          scheduledTimeFormatted: "2:00 PM EST",
          couponCode: "GOLD15"
        },
        {
          id: "redemption-disc-002",
          creatorHandle: "@creator3",
          discountPercent: 10,
          scheduledTime: "2025-01-27T16:00:00-05:00",
          scheduledTimeFormatted: "4:00 PM EST",
          couponCode: "SAVE10"
        }
      ]
    },

    commissionPayouts: {
      count: 1,
      countFormatted: "1",
      items: [
        {
          id: "boost-payout-001",
          creatorHandle: "@creator2",
          payoutAmount: 47.50,
          payoutAmountFormatted: "$47.50",
          paymentMethod: "PayPal",
          paymentAccount: "john@email.com"
        }
      ]
    },

    instantRewards: {
      count: 3,
      countFormatted: "3",
      items: [
        {
          id: "redemption-instant-001",
          creatorHandle: "@creator4",
          rewardType: "gift_card",
          rewardValue: "$50 Gift Card",
          email: "jane@email.com",
          claimedHoursAgo: 22,
          claimedHoursAgoFormatted: "22h",
          slaStatus: "warning"
        },
        {
          id: "redemption-instant-002",
          creatorHandle: "@creator5",
          rewardType: "spark_ads",
          rewardValue: "$100 Spark Ads",
          email: null,
          claimedHoursAgo: 18,
          claimedHoursAgoFormatted: "18h",
          slaStatus: "ok"
        },
        {
          id: "redemption-instant-003",
          creatorHandle: "@creator6",
          rewardType: "experience",
          rewardValue: "VIP Meet & Greet",
          email: "sam@email.com",
          claimedHoursAgo: 12,
          claimedHoursAgoFormatted: "12h",
          slaStatus: "ok"
        }
      ]
    },

    physicalGifts: {
      count: 1,
      countFormatted: "1",
      items: [
        {
          id: "redemption-physical-001",
          creatorHandle: "@creator7",
          itemName: "Hoodie",
          sizeValue: "L",
          cityState: "Los Angeles, CA"
        }
      ]
    },

    rafflesToDraw: {
      count: 0,
      countFormatted: "0",
      items: []
    }
  },

  thisWeeksTasks: {
    upcomingDiscounts: {
      count: 3,
      countFormatted: "3",
      items: [
        {
          id: "redemption-upcoming-001",
          date: "2025-01-29",
          dateFormatted: "Wed 29th",
          time: "10:00:00",
          timeFormatted: "10:00 AM EST",
          creatorHandle: "@creator8",
          discountPercent: 15
        },
        {
          id: "redemption-upcoming-002",
          date: "2025-01-30",
          dateFormatted: "Thu 30th",
          time: "14:00:00",
          timeFormatted: "2:00 PM EST",
          creatorHandle: "@creator9",
          discountPercent: 20
        },
        {
          id: "redemption-upcoming-003",
          date: "2025-01-31",
          dateFormatted: "Fri 31st",
          time: "11:00:00",
          timeFormatted: "11:00 AM EST",
          creatorHandle: "@creator10",
          discountPercent: 10
        }
      ]
    },

    upcomingRaffles: {
      count: 1,
      countFormatted: "1",
      items: [
        {
          id: "mission-raffle-001",
          drawDate: "2025-02-01",
          drawDateFormatted: "Sat 1st",
          raffleName: "Holiday Raffle",
          prizeName: "iPhone 16",
          participantCount: 45,
          participantCountFormatted: "45"
        }
      ]
    },

    expiringBoosts: {
      count: 2,
      countFormatted: "2",
      items: [
        {
          id: "boost-expiring-001",
          expirationDate: "2025-01-29",
          expirationDateFormatted: "Wed 29th",
          creatorHandle: "@creator11",
          boostPercent: 5,
          estimatedPayout: 32,
          estimatedPayoutFormatted: "$32"
        },
        {
          id: "boost-expiring-002",
          expirationDate: "2025-01-31",
          expirationDateFormatted: "Fri 31st",
          creatorHandle: "@creator12",
          boostPercent: 10,
          estimatedPayout: 85,
          estimatedPayoutFormatted: "$85"
        }
      ]
    }
  }
}
