"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, DollarSign, Video, Eye, Heart, MessageCircle, Trophy, HandCoins, Megaphone, Gift, BadgePercent, Palmtree, Info, ArrowLeft, X } from "lucide-react"
import { HomePageLayout } from "@/components/homepagelayout"
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function Home() {
  // ============================================
  // DEBUG PANEL - Test Scenario Switcher
  // ============================================
  const [activeScenario, setActiveScenario] = useState("scenario-1")
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  // State for card flip animation
  const [isTierCardFlipped, setIsTierCardFlipped] = useState(false)
  // State for discount scheduling modal
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Auto-flip back after 6 seconds
  useEffect(() => {
    if (isTierCardFlipped) {
      const timer = setTimeout(() => {
        setIsTierCardFlipped(false)
      }, 6000) // 6 seconds

      // Cleanup timer if user manually flips back before 6 seconds
      return () => clearTimeout(timer)
    }
  }, [isTierCardFlipped])

  // ============================================
  // TEST SCENARIOS - 12 Comprehensive Cases
  // ============================================
  /**
   * API CONTRACT MOCK DATA
   *
   * Each scenario represents the response shape from GET /api/home
   *
   * NEXT CLAIMABLE MISSION:
   * - Backend determines which mission user is closest to completing
   * - Could be any mission type: sales, videos, likes, views, raffle
   * - Reward type determined by mission configuration in database
   *
   * Backend Service: HomeService.getNextClaimableMission(userId)
   * Business Logic:
   *   1. Get all active missions for user's tier
   *   2. Calculate progress on each mission
   *   3. Return mission with highest progressPercentage
   */
  const scenarios = {
    "scenario-1": {
      name: "Bronze - Sales Mission 25%",
      mockData: {
        user: { id: "1", handle: "newcreator", email: "new@example.com", clientName: "Stateside Growers" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Bronze", color: "#CD7F32", order: 1, checkpoint_exempt: true },
        nextTier: { name: "Silver", threshold: 1000, color: "#94a3b8" },
        tierProgress: { currentValue: 250, targetValue: 1000, progressPercentage: 25, currentFormatted: "$250", targetFormatted: "$1,000", checkpointExpiresAt: "2025-03-15T00:00:00Z", checkpointExpiresFormatted: "March 15, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-100k",
          missionType: "sales_dollars",
          currentProgress: 35000,
          targetThreshold: 100000,
          progressPercentage: 35,
          currentFormatted: "$35,000",
          targetFormatted: "$100,000",
          targetText: "of $100,000 sales",
          progressText: "$35,000 of $100,000 sales",
          reward: {
            id: "reward-gc-25",
            type: "gift_card",
            name: "$25 Amazon Gift Card",
            value_data: { amount: 25 }
          },
          canClaim: false,
          buttonText: "$35K of $100K sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "gift_card", name: "$25 Amazon Gift Card", displayText: "$25 Gift Card", value_data: { amount: 25 }, redemption_quantity: 1 },
        { type: "commission_boost", name: "3% Commission Boost", displayText: "+3% Pay boost for 30 Days", value_data: { percent: 3, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-2": {
      name: "Silver - Videos Mission 50%",
      mockData: {
        user: { id: "2", handle: "silverstar", email: "silver@example.com", clientName: "Fizee" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Silver", color: "#94a3b8", order: 2, checkpoint_exempt: false },
        nextTier: { name: "Gold", threshold: 3000, color: "#F59E0B" },
        tierProgress: { currentValue: 1500, targetValue: 3000, progressPercentage: 50, currentFormatted: "$1,500", targetFormatted: "$3,000", checkpointExpiresAt: "2025-04-01T00:00:00Z", checkpointExpiresFormatted: "April 1, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-videos-20",
          missionType: "videos",
          currentProgress: 10,
          targetThreshold: 20,
          progressPercentage: 50,
          currentFormatted: "10",
          targetFormatted: "20",
          targetText: "of 20 videos",
          progressText: "10 of 20 videos",
          reward: {
            id: "reward-headphones",
            type: "physical_gift",
            name: "Wireless Headphones",
            value_data: null
          },
          canClaim: false,
          buttonText: "10 of 20 videos",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "physical_gift", name: "Wireless Headphones", displayText: "Win a Wireless Headphones", value_data: null, redemption_quantity: 1 },
        { type: "gift_card", name: "$35 Gift Card", displayText: "$35 Gift Card", value_data: { amount: 35 }, redemption_quantity: 2 },
        { type: "commission_boost", name: "4% Commission Boost", displayText: "+4% Pay boost for 30 Days", value_data: { percent: 4, duration_days: 30 }, redemption_quantity: 1 },
        { type: "discount", name: "8% Follower Discount", displayText: "+8% Deal Boost for 30 Days", value_data: { percent: 8, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-3": {
      name: "Gold - Likes Mission 75%",
      mockData: {
        user: { id: "3", handle: "goldpro", email: "gold@example.com", clientName: "BrandCo" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Gold", color: "#F59E0B", order: 3, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 5000, color: "#818CF8" },
        tierProgress: { currentValue: 3750, targetValue: 5000, progressPercentage: 75, currentFormatted: "$3,750", targetFormatted: "$5,000", checkpointExpiresAt: "2025-03-20T00:00:00Z", checkpointExpiresFormatted: "March 20, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-likes-5k",
          missionType: "likes",
          currentProgress: 3750,
          targetThreshold: 5000,
          progressPercentage: 75,
          currentFormatted: "3.8K",
          targetFormatted: "5K",
          targetText: "of 5K likes",
          progressText: "3.8K of 5K likes",
          reward: {
            id: "reward-cb-5pct",
            type: "commission_boost",
            name: "5% Pay Boost",
            value_data: { percent: 5, duration_days: 30 }
          },
          canClaim: false,
          buttonText: "3.8K of 5K likes",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "experience", name: "VIP Event Access", displayText: "Win a VIP Event Access", value_data: null, redemption_quantity: 1 },
        { type: "physical_gift", name: "iPhone 16 Pro", displayText: "Win a iPhone 16 Pro", value_data: null, redemption_quantity: 1 },
        { type: "gift_card", name: "$50 Gift Card", displayText: "$50 Gift Card", value_data: { amount: 50 }, redemption_quantity: 2 },
        { type: "commission_boost", name: "5% Pay Boost", displayText: "+5% Pay boost for 30 Days", value_data: { percent: 5, duration_days: 30 }, redemption_quantity: 1 },
        { type: "spark_ads", name: "$100 Ad Boost", displayText: "+$100 Ads Boost", value_data: { amount: 100 }, redemption_quantity: 2 },
        { type: "discount", name: "10% Follower Discount", displayText: "+10% Deal Boost for 30 Days", value_data: { percent: 10, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-4": {
      name: "Platinum - Views Mission 99%",
      mockData: {
        user: { id: "4", handle: "platinumstar", email: "plat@example.com", clientName: "Elite Brand" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Platinum", color: "#818CF8", order: 4, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 10000, color: "#818CF8" },
        tierProgress: { currentValue: 9900, targetValue: 10000, progressPercentage: 99, currentFormatted: "$9,900", targetFormatted: "$10,000", checkpointExpiresAt: "2025-03-25T00:00:00Z", checkpointExpiresFormatted: "March 25, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-views-100k",
          missionType: "views",
          currentProgress: 99000,
          targetThreshold: 100000,
          progressPercentage: 99,
          currentFormatted: "99K",
          targetFormatted: "100K",
          targetText: "of 100K views",
          progressText: "99K of 100K views",
          reward: {
            id: "reward-spark-200",
            type: "spark_ads",
            name: "$200 Reach Boost",
            value_data: { amount: 200 }
          },
          canClaim: false,
          buttonText: "99K of 100K views",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "experience", name: "Exclusive Brand Summit", displayText: "Win a Exclusive Brand Summit", value_data: null, redemption_quantity: 1 },
        { type: "physical_gift", name: "MacBook Pro", displayText: "Win a MacBook Pro", value_data: null, redemption_quantity: 1 },
        { type: "gift_card", name: "$100 Gift Card", displayText: "$100 Gift Card", value_data: { amount: 100 }, redemption_quantity: 3 },
        { type: "commission_boost", name: "7% Pay Boost", displayText: "+7% Pay boost for 30 Days", value_data: { percent: 7, duration_days: 30 }, redemption_quantity: 2 },
        { type: "spark_ads", name: "$200 Ad Boost", displayText: "+$200 Ads Boost", value_data: { amount: 200 }, redemption_quantity: 3 },
        { type: "discount", name: "15% Follower Discount", displayText: "+15% Deal Boost for 30 Days", value_data: { percent: 15, duration_days: 30 }, redemption_quantity: 2 },
      ],
    },

    "scenario-5": {
      name: "Mission Complete 100%",
      mockData: {
        user: { id: "5", handle: "winner", email: "win@example.com", clientName: "Stateside Growers" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Gold", color: "#F59E0B", order: 3, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 5000, color: "#818CF8" },
        tierProgress: { currentValue: 4200, targetValue: 5000, progressPercentage: 84, currentFormatted: "$4,200", targetFormatted: "$5,000", checkpointExpiresAt: "2025-03-15T00:00:00Z", checkpointExpiresFormatted: "March 15, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-complete",
          missionType: "sales_dollars",
          currentProgress: 500,
          targetThreshold: 500,
          progressPercentage: 100,
          currentFormatted: "$500",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$500 of $500 sales",
          reward: {
            id: "reward-discount-8pct",
            type: "discount",
            name: "8% Follower Discount",
            value_data: { percent: 8, duration_days: 30 }
          },
          canClaim: true,
          buttonText: "+8% Deal Boost",
          buttonAction: "claim"
        },
      },
      currentTierBenefits: [
        { type: "gift_card", name: "$50 Gift Card", displayText: "$50 Gift Card", value_data: { amount: 50 }, redemption_quantity: 2 },
        { type: "commission_boost", name: "5% Commission Boost", displayText: "+5% Pay boost for 30 Days", value_data: { percent: 5, duration_days: 30 }, redemption_quantity: 1 },
        { type: "spark_ads", name: "$100 Ad Boost", displayText: "+$100 Ads Boost", value_data: { amount: 100 }, redemption_quantity: 3 },
      ],
    },

    "scenario-6": {
      name: "Commission Boost Reward",
      mockData: {
        user: { id: "6", handle: "booster", email: "boost@example.com", clientName: "BrandCo" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Silver", color: "#94a3b8", order: 2, checkpoint_exempt: false },
        nextTier: { name: "Gold", threshold: 3000, color: "#F59E0B" },
        tierProgress: { currentValue: 1800, targetValue: 3000, progressPercentage: 60, currentFormatted: "$1,800", targetFormatted: "$3,000", checkpointExpiresAt: "2025-04-01T00:00:00Z", checkpointExpiresFormatted: "April 1, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500",
          missionType: "sales_dollars",
          currentProgress: 300,
          targetThreshold: 500,
          progressPercentage: 60,
          currentFormatted: "$300",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$300 of $500 sales",
          reward: {
            id: "reward-gc-35",
            type: "gift_card",
            name: "$35 Gift Card",
            value_data: { amount: 35 }
          },
          canClaim: false,
          buttonText: "$300 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "commission_boost", name: "5% Commission Boost", displayText: "+5% Pay boost for 30 Days", value_data: { percent: 5, duration_days: 30 }, redemption_quantity: 1 },
        { type: "gift_card", name: "$35 Gift Card", displayText: "$35 Gift Card", value_data: { amount: 35 }, redemption_quantity: 2 },
      ],
    },

    "scenario-7": {
      name: "Spark Ads Reward",
      mockData: {
        user: { id: "7", handle: "advertiser", email: "ads@example.com", clientName: "Fizee" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Gold", color: "#F59E0B", order: 3, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 5000, color: "#818CF8" },
        tierProgress: { currentValue: 4000, targetValue: 5000, progressPercentage: 80, currentFormatted: "$4,000", targetFormatted: "$5,000", checkpointExpiresAt: "2025-03-20T00:00:00Z", checkpointExpiresFormatted: "March 20, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-spark",
          missionType: "sales_dollars",
          currentProgress: 400,
          targetThreshold: 500,
          progressPercentage: 80,
          currentFormatted: "$400",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$400 of $500 sales",
          reward: {
            id: "reward-spark-100",
            type: "spark_ads",
            name: "$100 Spark Ads Budget",
            value_data: { amount: 100 }
          },
          canClaim: false,
          buttonText: "$400 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "spark_ads", name: "$100 Spark Ads Budget", displayText: "+$100 Ads Boost", value_data: { amount: 100 }, redemption_quantity: 3 },
        { type: "gift_card", name: "$50 Gift Card", displayText: "$50 Gift Card", value_data: { amount: 50 }, redemption_quantity: 2 },
        { type: "commission_boost", name: "5% Pay Boost", displayText: "+5% Pay boost for 30 Days", value_data: { percent: 5, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-8": {
      name: "Follower Discount Reward",
      mockData: {
        user: { id: "8", handle: "discounter", email: "disc@example.com", clientName: "BrandCo" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Silver", color: "#94a3b8", order: 2, checkpoint_exempt: false },
        nextTier: { name: "Gold", threshold: 3000, color: "#F59E0B" },
        tierProgress: { currentValue: 2100, targetValue: 3000, progressPercentage: 70, currentFormatted: "$2,100", targetFormatted: "$3,000", checkpointExpiresAt: "2025-04-01T00:00:00Z", checkpointExpiresFormatted: "April 1, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-discount",
          missionType: "sales_dollars",
          currentProgress: 350,
          targetThreshold: 500,
          progressPercentage: 70,
          currentFormatted: "$350",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$350 of $500 sales",
          reward: {
            id: "reward-discount-10pct",
            type: "discount",
            name: "10% Follower Discount",
            value_data: { percent: 10, duration_days: 30 }
          },
          canClaim: false,
          buttonText: "$350 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "discount", name: "10% Follower Discount", displayText: "+10% Deal Boost for 30 Days", value_data: { percent: 10, duration_days: 30 }, redemption_quantity: 1 },
        { type: "gift_card", name: "$35 Gift Card", displayText: "$35 Gift Card", value_data: { amount: 35 }, redemption_quantity: 2 },
        { type: "commission_boost", name: "4% Commission Boost", displayText: "+4% Pay boost for 30 Days", value_data: { percent: 4, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-9": {
      name: "Physical Gift Reward",
      mockData: {
        user: { id: "9", handle: "giftwinner", email: "gift@example.com", clientName: "Elite Brand" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Platinum", color: "#818CF8", order: 4, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 10000, color: "#818CF8" },
        tierProgress: { currentValue: 8500, targetValue: 10000, progressPercentage: 85, currentFormatted: "$8,500", targetFormatted: "$10,000", checkpointExpiresAt: "2025-03-25T00:00:00Z", checkpointExpiresFormatted: "March 25, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-iphone",
          missionType: "sales_dollars",
          currentProgress: 425,
          targetThreshold: 500,
          progressPercentage: 85,
          currentFormatted: "$425",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$425 of $500 sales",
          reward: {
            id: "reward-iphone-16",
            type: "physical_gift",
            name: "iPhone 16 Pro",
            value_data: null
          },
          canClaim: false,
          buttonText: "$425 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "physical_gift", name: "iPhone 16 Pro", displayText: "Win a iPhone 16 Pro", value_data: null, redemption_quantity: 1 },
        { type: "experience", name: "VIP Event Access", displayText: "Win a VIP Event Access", value_data: null, redemption_quantity: 1 },
        { type: "gift_card", name: "$100 Gift Card", displayText: "$100 Gift Card", value_data: { amount: 100 }, redemption_quantity: 3 },
        { type: "commission_boost", name: "7% Pay Boost", displayText: "+7% Pay boost for 30 Days", value_data: { percent: 7, duration_days: 30 }, redemption_quantity: 2 },
      ],
    },

    "scenario-10": {
      name: "Minimal Benefits (2)",
      mockData: {
        user: { id: "10", handle: "starter", email: "start@example.com", clientName: "Stateside Growers" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Bronze", color: "#CD7F32", order: 1, checkpoint_exempt: true },
        nextTier: { name: "Silver", threshold: 1000, color: "#94a3b8" },
        tierProgress: { currentValue: 100, targetValue: 1000, progressPercentage: 10, currentFormatted: "$100", targetFormatted: "$1,000", checkpointExpiresAt: "2025-03-15T00:00:00Z", checkpointExpiresFormatted: "March 15, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-starter",
          missionType: "sales_dollars",
          currentProgress: 50,
          targetThreshold: 500,
          progressPercentage: 10,
          currentFormatted: "$50",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$50 of $500 sales",
          reward: {
            id: "reward-gc-25-starter",
            type: "gift_card",
            name: "$25 Gift Card",
            value_data: { amount: 25 }
          },
          canClaim: false,
          buttonText: "$50 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "gift_card", name: "$25 Gift Card", displayText: "$25 Gift Card", value_data: { amount: 25 }, redemption_quantity: 1 },
        { type: "commission_boost", name: "3% Commission Boost", displayText: "+3% Pay boost for 30 Days", value_data: { percent: 3, duration_days: 30 }, redemption_quantity: 1 },
      ],
    },

    "scenario-11": {
      name: "Low Progress 5%",
      mockData: {
        user: { id: "11", handle: "beginner", email: "begin@example.com", clientName: "Fizee" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Bronze", color: "#CD7F32", order: 1, checkpoint_exempt: true },
        nextTier: { name: "Silver", threshold: 1000, color: "#94a3b8" },
        tierProgress: { currentValue: 50, targetValue: 1000, progressPercentage: 5, currentFormatted: "$50", targetFormatted: "$1,000", checkpointExpiresAt: "2025-03-15T00:00:00Z", checkpointExpiresFormatted: "March 15, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-beginner",
          missionType: "sales_dollars",
          currentProgress: 25,
          targetThreshold: 500,
          progressPercentage: 5,
          currentFormatted: "$25",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$25 of $500 sales",
          reward: {
            id: "reward-gc-25-beginner",
            type: "gift_card",
            name: "$25 Gift Card",
            value_data: { amount: 25 }
          },
          canClaim: false,
          buttonText: "$25 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "gift_card", name: "$25 Gift Card", displayText: "$25 Gift Card", value_data: { amount: 25 }, redemption_quantity: 1 },
        { type: "commission_boost", name: "3% Commission Boost", displayText: "+3% Pay boost for 30 Days", value_data: { percent: 3, duration_days: 30 }, redemption_quantity: 1 },
        { type: "spark_ads", name: "$50 Ad Boost", displayText: "+$50 Ads Boost", value_data: { amount: 50 }, redemption_quantity: 1 },
      ],
    },

    "scenario-12": {
      name: "🔥 All Reward Types",
      mockData: {
        user: { id: "12", handle: "poweruser", email: "power@example.com", clientName: "Elite Brand" },
        client: { id: "client-1", vipMetric: "sales", vipMetricLabel: "sales" },
        currentTier: { name: "Platinum", color: "#818CF8", order: 4, checkpoint_exempt: false },
        nextTier: { name: "Platinum", threshold: 10000, color: "#818CF8" },
        tierProgress: { currentValue: 9000, targetValue: 10000, progressPercentage: 90, currentFormatted: "$9,000", targetFormatted: "$10,000", checkpointExpiresAt: "2025-03-25T00:00:00Z", checkpointExpiresFormatted: "March 25, 2025", checkpointMonths: 4 },
        nextClaimableMission: {
          missionId: "mission-sales-500-experience",
          missionType: "sales_dollars",
          currentProgress: 450,
          targetThreshold: 500,
          progressPercentage: 90,
          currentFormatted: "$450",
          targetFormatted: "$500",
          targetText: "of $500 sales",
          progressText: "$450 of $500 sales",
          reward: {
            id: "reward-summit",
            type: "experience",
            name: "Exclusive Brand Summit",
            value_data: null
          },
          canClaim: false,
          buttonText: "$450 of $500 sales",
          buttonAction: "view_progress"
        },
      },
      currentTierBenefits: [
        { type: "experience", name: "Exclusive Brand Summit", displayText: "Win a Exclusive Brand Summit", value_data: null, redemption_quantity: 1 },
        { type: "physical_gift", name: "MacBook Pro", displayText: "Win a MacBook Pro", value_data: null, redemption_quantity: 1 },
        { type: "gift_card", name: "$100 Gift Card", displayText: "$100 Gift Card", value_data: { amount: 100 }, redemption_quantity: 3 },
        { type: "commission_boost", name: "7% Pay Boost", displayText: "+7% Pay boost for 30 Days", value_data: { percent: 7, duration_days: 30 }, redemption_quantity: 2 },
        { type: "spark_ads", name: "$200 Ad Boost", displayText: "+$200 Ads Boost", value_data: { amount: 200 }, redemption_quantity: 3 },
        { type: "discount", name: "15% Follower Discount", displayText: "+15% Deal Boost for 30 Days", value_data: { percent: 15, duration_days: 30 }, redemption_quantity: 2 },
      ],
    },
  }

  // Get current scenario data
  const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
  const mockData = currentScenario.mockData

  /**
   * CURRENT TIER BENEFITS (from backend API)
   * Backend endpoint: GET /api/benefits/current-tier
   * Returns all benefits available for user's current tier
   */
  const currentTierBenefits = currentScenario.currentTierBenefits

  // Custom Gift Drop SVG icon (from rewards page)
  const GiftDropIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 7h-.7c.229-.467.349-.98.351-1.5a3.5 3.5 0 0 0-3.5-3.5c-1.717 0-3.215 1.2-4.331 2.481C10.4 2.842 8.949 2 7.5 2A3.5 3.5 0 0 0 4 5.5c.003.52.123 1.033.351 1.5H4a2 2 0 0 0-2 2v2a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a2 2 0 0
0-2-2Zm-9.942 0H7.5a1.5 1.5 0 0 1 0-3c.9 0 2 .754 3.092 2.122-.219.337-.392.635-.534.878Zm6.1 0h-3.742c.933-1.368 2.371-3 3.739-3a1.5 1.5 0 0 1 0 3h.003ZM13 14h-2v8h2v-8Zm-4 0H4v6a2 2 0 0 0 2 2h3v-8Zm6 0v8h3a2 2 0 0 0 2-2v-6h-5Z"
      />
    </svg>
  )

  // Map backend benefit types to frontend icons
  const getIconForBenefitType = (type: string) => {
    const iconClass = "h-5 w-5 text-slate-700 flex-shrink-0"

    switch (type) {
      case "commission_boost":
        return <HandCoins className={iconClass} />
      case "spark_ads":
        return <Megaphone className={iconClass} />
      case "gift_card":
        return <Gift className={iconClass} />
      case "physical_gift":
        return <GiftDropIcon className={iconClass} />
      case "discount":
        return <BadgePercent className={iconClass} />
      case "experience":
        return <Palmtree className={iconClass} />
      default:
        return <Gift className={iconClass} />
    }
  }

  // Sort benefits by priority order
  const benefitPriority = {
    experience: 1,
    physical_gift: 2,
    gift_card: 3,
    commission_boost: 4,
    spark_ads: 5,
    discount: 6,
  }

  const sortedBenefits = [...currentTierBenefits].sort((a, b) => {
    const aPriority = benefitPriority[a.type as keyof typeof benefitPriority] || 999
    const bPriority = benefitPriority[b.type as keyof typeof benefitPriority] || 999
    return aPriority - bPriority
  })

  // Get top 4 benefits
  const topBenefits = sortedBenefits.slice(0, 4)
  const hasMoreBenefits = sortedBenefits.length > 4

  // TASK 1: Circle color is DYNAMIC from backend (tiers.tier_color)
  // Uses mockData.currentTier.color which comes from database
  const currentTierColor = mockData.currentTier.color

  // ============================================
  // FORMATTING NOTE:
  // ============================================
  // Backend sends pre-formatted strings for ALL display text:
  // - Mission progress: currentFormatted, targetText, progressText
  // - Tier progress: currentFormatted, targetFormatted
  // - VIP metric label: client.vipMetricLabel
  // - Reward display: displayText (with + prefix, "Win a", duration)
  //
  // Frontend just displays these strings - no manual formatting needed.
  // This ensures:
  // ✅ Consistency across all platforms
  // ✅ i18n support (backend can format for different locales)
  // ✅ Business logic stays in backend (server authoritative)
  // ✅ Simpler frontend code
  //
  // Removed functions (no longer needed):
  // ❌ formatCurrency, formatNumber, formatLargeNumber
  // ❌ formatMissionValue, getMissionUnitLabel
  // ❌ formatBenefitText
  // ============================================

  // Format claim button text based on mission type and reward type
  const formatClaimButtonText = (missionType: string, rewardType: string, rewardValue: number): string => {
    // Raffle missions have different button text
    if (missionType === "raffle") {
      return "Join Raffle"
    }

    // Regular mission claim button text
    switch (rewardType) {
      case "gift_card":
        return `$${rewardValue} Gift Card`
      case "commission_boost":
        return `+${rewardValue}% Pay Boost`  // Added + prefix
      case "spark_ads":
        return `$${rewardValue} Reach Boost`
      case "discount":
        return `+${rewardValue}% Deal Boost`
      case "physical_gift":
        return "Claim Gift"
      case "experience":
        return "Claim Experience"
      default:
        return "Claim Reward"
    }
  }

  // ============================================
  // CLAIM HANDLERS
  // ============================================

  const handleClaimReward = () => {
    const { reward } = mockData.nextClaimableMission

    // If discount type, open scheduling modal
    if (reward.type === "discount") {
      setShowScheduleModal(true)
      return
    }

    // For other reward types, claim immediately
    console.log("[v0] Claim reward clicked:", reward.type, reward.value_data)
    // TODO: POST /api/missions/:id/claim (instant claim)
  }

  const handleScheduleDiscount = async (scheduledDate: Date) => {
    console.log("[v0] Schedule discount for:", scheduledDate.toISOString())

    try {
      // TODO: POST /api/missions/:id/claim
      // Request body: { scheduled_activation_at: scheduledDate.toISOString() }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Show success message
      const dateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const timeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }

  // ============================================
  // FRONTEND: UI PRESENTATION LOGIC ONLY
  // ============================================
  // Backend provides progressPercentage - frontend uses it for display
  // Frontend ONLY calculates SVG geometry (circle radius, circumference, stroke offset)

  // Mission circular progress - Use backend's calculated percentage
  const missionProgressPercentage = mockData.nextClaimableMission.progressPercentage

  // SVG circle geometry (UI presentation logic)
  const circleSize = 240
  const strokeWidth = 24
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const circleOffset = circumference - (missionProgressPercentage / 100) * circumference

  // Tier progress linear bar - Use backend's calculated percentage
  const tierProgressPercentage = mockData.tierProgress.progressPercentage

  return (
    <>
      {/* DEBUG PANEL TOGGLE BUTTON - Always visible */}
      <button
        onClick={() => setDebugPanelOpen(!debugPanelOpen)}
        className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
        aria-label="Toggle test scenarios"
      >
        🧪
      </button>

      {/* Collapsible Debug Panel */}
      {debugPanelOpen && (
        <div className="fixed top-16 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-purple-500 p-4 w-64 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              🧪 Test Scenarios
              <span className="text-xs text-slate-500">({Object.keys(scenarios).length})</span>
            </h3>
            <button
              onClick={() => setDebugPanelOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <Button
                key={key}
                onClick={() => setActiveScenario(key)}
                variant={activeScenario === key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-full justify-start text-xs h-auto py-2 px-3",
                  activeScenario === key && "bg-purple-600 hover:bg-purple-700"
                )}
              >
                <span className="font-semibold truncate w-full text-left">
                  {scenario.name}
                </span>
              </Button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              <span className="font-semibold">Active:</span> {currentScenario.name}
            </p>
          </div>
        </div>
      )}

      <HomePageLayout title={`Hi, @${mockData.user.handle}`}>
      {/* Section 1: Circular Progress (NO CARD - directly on gray background) */}
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900">{mockData.user.clientName} Rewards</h3>

        {/* Circular Progress */}
        <div className="relative inline-flex items-center justify-center">
          <svg width={circleSize} height={circleSize} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
            {/* Progress circle (TASK 1: tier colored - dynamic from backend) */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke={currentTierColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={circleOffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Center text - Mission progress (100% from backend - pre-formatted) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900">
              {mockData.nextClaimableMission.currentFormatted}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {mockData.nextClaimableMission.targetText}
            </span>
          </div>
        </div>

        {/* Subtitle - Reward display (button if claimable, reward name if in progress) */}
        {mockData.nextClaimableMission.canClaim ? (
          <Button
            onClick={handleClaimReward}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
          >
            {getIconForBenefitType(mockData.nextClaimableMission.reward.type)}
            {formatClaimButtonText(
              mockData.nextClaimableMission.missionType,
              mockData.nextClaimableMission.reward.type,
              mockData.nextClaimableMission.reward.value_data?.amount || mockData.nextClaimableMission.reward.value_data?.percent || 0
            )}
          </Button>
        ) : (
          <p className="text-base text-slate-900 font-semibold">
            Next:{" "}
            <span className="text-slate-600 font-semibold">
              {mockData.nextClaimableMission.reward.name}
            </span>
          </p>
        )}
      </div>

      {/* NEW SECTION: Current Rewards (with icons, no bullets) */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="px-6 py-1">
          <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: currentTierColor }} />
            {mockData.currentTier.name} Level Rewards
          </h3>
          <ul className="space-y-3">
            {topBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                {getIconForBenefitType(benefit.type)}
                <span className="text-sm text-slate-700">
                  {benefit.displayText}
                </span>
              </li>
            ))}
            {hasMoreBenefits && (
              <li className="flex items-start gap-3">
                <span className="text-slate-400 text-sm">•</span>
                <span className="text-sm text-slate-500 italic">And more!</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Card 1: Tier Progress - Unlock Next Tier (FLIPPABLE CARD) */}
      <div className="relative w-full" style={{ perspective: '1000px' }}>
        <div
          className="relative w-full transition-transform duration-600 ease-in-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: isTierCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* FRONT SIDE */}
          <div style={{ backfaceVisibility: 'hidden' }}>
            <Card className="bg-white rounded-xl shadow-sm">
              <CardContent className="px-6 py-2 space-y-3">
                {/* Title with gradient ribbon */}
                <div className="relative inline-block">
                  <div
                    className="absolute inset-0 opacity-20 blur-sm rounded-lg -z-10"
                    style={{
                      background: `linear-gradient(135deg, ${mockData.nextTier.color}, ${mockData.nextTier.color}80)`,
                      transform: 'scale(1.1)',
                    }}
                  />
                  <h3
                    className="text-base font-bold text-slate-900 px-3 py-1 relative"
                    style={{
                      background: `linear-gradient(135deg, ${mockData.nextTier.color}15, ${mockData.nextTier.color}25)`,
                      borderRadius: '0.5rem',
                      boxShadow: `0 0 15px ${mockData.nextTier.color}40`,
                    }}
                  >
                    Unlock {mockData.nextTier.name}
                  </h3>
                </div>

                {/* VIP progress text */}
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {mockData.tierProgress.currentFormatted} of{" "}
                    {mockData.tierProgress.targetFormatted}
                  </p>
                  <p className="text-sm text-slate-600">{mockData.client.vipMetricLabel}</p>
                </div>

                {/* Current tier badge + progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" style={{ color: currentTierColor }} />
                    <span className="font-semibold text-slate-900">{mockData.currentTier.name}</span>
                  </div>

                  {/* Linear progress bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${tierProgressPercentage}%`,
                        backgroundColor: currentTierColor,
                      }}
                    />
                  </div>

                  {/* Expiration text with Info icon - Only show for tiers that expire */}
                  {!mockData.currentTier.checkpoint_exempt && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <p className="text-xs text-slate-600">
                        {mockData.currentTier.name} Expires on {mockData.tierProgress.checkpointExpiresFormatted}
                      </p>
                      <Info
                        className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors flex-shrink-0"
                        onClick={() => setIsTierCardFlipped(true)}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BACK SIDE */}
          <div
            className="absolute inset-0 cursor-pointer"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            onClick={() => setIsTierCardFlipped(false)}
          >
            <Card className="bg-white rounded-xl shadow-sm h-full">
              <CardContent className="px-6 py-4 h-full flex flex-col">
                {/* Visual hint at top */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Tap to return
                  </span>
                  <X className="h-3.5 w-3.5" />
                </div>

                {/* Explanation content */}
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900">
                    ⚠️ VIP Checkpoint
                  </h3>
                  <p className="text-sm text-slate-600">
                    Your <span className="font-semibold">{mockData.currentTier.name}</span> Level renews every <span className="font-semibold">{mockData.tierProgress.checkpointMonths}</span> months based on sales.
                  </p>
                  <p className="text-sm text-slate-600 font-medium">
                    Keep selling to earn more rewards! 🚀
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Card 2: Checkpoint Information (WHITE CARD) */}


    </HomePageLayout>

      {/* Schedule Discount Modal */}
      <ScheduleDiscountModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleScheduleDiscount}
        discountPercent={mockData.nextClaimableMission.reward.value_data?.percent || 0}
        durationDays={mockData.nextClaimableMission.reward.value_data?.duration_days || 30}
      />
    </>
  )
}
