"use client"
import {
  Trophy,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Video,
  Heart,
  Eye,
  Clover,
  Lock,
  Loader2,
  Calendar,
  CircleDollarSign,
  ClockArrowDown,
  Truck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/pagelayout"
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { PaymentInfoModal } from "@/components/payment-info-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useState } from "react"
import * as React from "react"
import {
  FlippableCardMissions,
  MissionFlipInfoButton,
  MissionFlipBackSide,
  MissionFlipFrontSide,
} from "@/components/FlippableCardMissions"
import type { MissionsPageResponse, Mission } from "@/types/missions"

export default function MissionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showPayboostModal, setShowPayboostModal] = useState(false)
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false)
  const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false)
  const [selectedMission, setSelectedMission] = useState<{ id: string; percent: number; durationDays: number } | null>(null)
  const [selectedPaymentMission, setSelectedPaymentMission] = useState<{ id: string; name: string } | null>(null)
  const [selectedPhysicalGift, setSelectedPhysicalGift] = useState<any | null>(null)

  // Tier colors (matches VIP level)
  const tierColors = {
    Bronze: "#CD7F32",
    Silver: "#94a3b8",
    Gold: "#F59E0B",
    Platinum: "#818CF8",
  }

  // ============================================
  // MOCK DATA - TODO: FETCH FROM API
  // ============================================
  // TODO: Replace with: const data = await fetch('/api/missions').then(r => r.json())

  const mockData: MissionsPageResponse = {
    user: {
      id: "user-abc-123",
      handle: "creatorpro",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B"
    },
    featuredMissionId: "1",
    missions: [
    {
      id: "1",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Reach your sales target",
      currentProgress: 1500,
      goal: 2000,
      progressPercentage: 75,
      remainingValue: 500,
      rewardType: "gift_card",
      rewardValue: 50,
      rewardCustomText: null,
      status: "active" as const,
      checkpointEnd: "2025-03-15T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: true, // CARD STATE: In Progress
      enabled: true,
      redemptions: { status: "claimable" }, // TODO: Replace with API response
    },
    {
      id: "1b",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Redeeming your reward",
      currentProgress: 500,
      goal: 500,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "gift_card",
      rewardValue: 100,
      rewardCustomText: null,
      status: "completed" as const,
      checkpointEnd: "2025-03-15T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimed" }, // TODO: Replace with API response - this triggers Redeeming state
    },
    {
      id: "2",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Film and post new clips",
      currentProgress: 8,
      goal: 15,
      progressPercentage: 50,
      remainingValue: 7,
      rewardType: "commission_boost",
      rewardValue: 5,
      rewardCustomText: null,
      status: "active" as const,
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: true, // CARD STATE: In Progress
      enabled: true,
      redemptions: { status: "claimable" }, // TODO: Replace with API response
    },
    {
      id: "2b",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Completed - Ready to schedule",
      currentProgress: 15,
      goal: 15,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "commission_boost",
      rewardValue: 5,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Default Schedule
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimable" },
    },
    {
      id: "3",
      missionType: "likes" as const,
      displayName: "Road to Viral",
      description: "Rack up those likes",
      currentProgress: 1000,
      goal: 1000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "gift_card",
      rewardValue: 25,
      rewardCustomText: null,
      status: "completed" as const,
      checkpointEnd: "2025-02-28T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimable" }, // TODO: Replace with API response
    },
    {
      id: "3b",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Completed - Ready to schedule discount",
      currentProgress: 3000,
      goal: 3000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "discount",
      rewardValue: 15,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Default Schedule (discount)
      checkpointEnd: "2025-03-20T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimable" },
    },
    {
      id: "3c",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Scheduled commission boost",
      currentProgress: 15,
      goal: 15,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "commission_boost",
      rewardValue: 5,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Scheduled (commission_boost)
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "claimed",
        scheduledActivationDate: "Jan 25, 2025 at 6:00 PM"
      },
    },
    {
      id: "3d",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Scheduled discount",
      currentProgress: 3000,
      goal: 3000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "discount",
      rewardValue: 15,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Scheduled (discount)
      checkpointEnd: "2025-03-20T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "claimed",
        scheduledActivationDate: "Jan 22, 2025 at 3:30 PM"
      },
    },
    {
      id: "3e",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Active commission boost",
      currentProgress: 15,
      goal: 15,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "commission_boost",
      rewardValue: 10,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Active (commission_boost)
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "claimed"
      },
      statusDetails: {
        activationDate: "Jan 15, 2025",
        expirationDate: "Feb 14, 2025"
      },
    },
    {
      id: "3f",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Active discount",
      currentProgress: 3000,
      goal: 3000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "discount",
      rewardValue: 20,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Active (discount)
      checkpointEnd: "2025-03-20T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "fulfilled"
      },
      statusDetails: {
        activationDate: "Jan 12, 2025",
        expirationDate: "Feb 11, 2025"
      },
    },
    {
      id: "3g",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Pending payment commission boost",
      currentProgress: 15,
      goal: 15,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "commission_boost",
      rewardValue: 10,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Pending Payment
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "claimed"
      },
      commission_boost_redemption: {
        boostStatus: "pending_info"
      },
    },
    {
      id: "3h",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Commission boost clearing",
      currentProgress: 2500,
      goal: 2500,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "commission_boost",
      rewardValue: 8,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Clearing
      checkpointEnd: "2025-03-15T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: {
        status: "claimed"
      },
      commission_boost_redemption: {
        boostStatus: "pending_payout"
      },
    },
    {
      id: "3i",
      missionType: "likes" as const,
      displayName: "Road to Viral",
      description: "Completed - Physical gift with size",
      currentProgress: 5000,
      goal: 5000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "physical_gift",
      rewardValue: null,
      rewardCustomText: "Branded Hoodie",
      status: "completed" as const, // TEST: Physical gift with size
      checkpointEnd: "2025-03-01T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimable" },
      name: "Gift Drop: Branded Hoodie",
      type: "physical_gift",
      valueData: {
        requiresSize: true,
        sizeCategory: "clothing",
        sizeOptions: ["S", "M", "L", "XL"]
      }
    },
    {
      id: "3j",
      missionType: "videos" as const,
      displayName: "Lights, Camera, Go!",
      description: "Completed - Physical gift being shipped",
      currentProgress: 20,
      goal: 20,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "physical_gift",
      rewardValue: null,
      rewardCustomText: "Wireless Earbuds",
      status: "completed" as const, // TEST: CARD STATE: Redeeming Physical
      checkpointEnd: "2025-03-05T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimed" },
      name: "Gift Drop: Wireless Earbuds",
      type: "physical_gift",
      valueData: {
        requiresSize: false
      },
      physical_gift_redemptions: {
        shippingCity: "Los Angeles"
      }
    },
    {
      id: "3k",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "Physical gift being shipped",
      currentProgress: 3000,
      goal: 3000,
      progressPercentage: 100,
      remainingValue: 0,
      rewardType: "physical_gift",
      rewardValue: null,
      rewardCustomText: "Premium Water Bottle",
      status: "completed" as const, // TEST: CARD STATE: Sending
      checkpointEnd: "2025-03-10T23:59:59Z",
      requiredTier: null,
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimed" },
      name: "Gift Drop: Premium Water Bottle",
      type: "physical_gift",
      valueData: {
        requiresSize: false
      },
      physical_gift_redemptions: {
        shippingCity: "New York",
        shippedAt: "2025-01-15T10:30:00Z"
      }
    },
    {
      id: "3l",
      missionType: "sales_dollars" as const,
      displayName: "Sales Sprint",
      description: "",
      currentProgress: 0,
      goal: 10000,
      progressPercentage: 0,
      remainingValue: 10000,
      rewardType: "gift_card",
      rewardValue: 500,
      rewardCustomText: null,
      status: "locked" as const, // TEST: CARD STATE: Locked
      checkpointEnd: "2025-04-01T23:59:59Z",
      requiredTier: "Gold",
      raffleEndDate: null,
      activated: null,
      enabled: true,
      redemptions: { status: "claimable" },
    },
    {
      id: "4a",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "gift",
      rewardValue: null,
      rewardCustomText: "iPhone 16 Pro",
      status: "available" as const, // TEST: CARD STATE: Raffle Available
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: "2025-02-15T23:59:59Z",
      activated: true,
      enabled: true,
      redemptions: { status: "claimable" },
    },
    {
      id: "4b",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "gift",
      rewardValue: null,
      rewardCustomText: "MacBook Pro",
      status: "processing" as const, // TEST: CARD STATE: Raffle Processing
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: "2025-01-25T23:59:59Z",
      activated: true,
      enabled: true,
      redemptions: { status: "claimable" },
    },
    {
      id: "4c",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "physical_gift",
      rewardValue: null,
      rewardCustomText: "AirPods Pro",
      status: "completed" as const, // TEST: CARD STATE: Raffle Claim (physical gift with size)
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: null,
      activated: true,
      enabled: true,
      redemptions: { status: "claimable" },
      raffle_participations: { isWinner: true },
      name: "Gift Drop: AirPods Pro",
      type: "physical_gift",
      valueData: {
        requiresSize: false
      }
    },
    {
      id: "4c2",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "gift_card",
      rewardValue: 100,
      rewardCustomText: null,
      status: "completed" as const, // TEST: CARD STATE: Raffle Claim (gift card)
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: null,
      activated: true,
      enabled: true,
      redemptions: { status: "claimable" },
      raffle_participations: { isWinner: true },
    },
    {
      id: "4c3",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "gift",
      rewardValue: null,
      rewardCustomText: "Apple Watch",
      status: "won" as const, // TEST: CARD STATE: Raffle Won
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: null,
      activated: true,
      enabled: true,
      redemptions: { status: "claimed" },
    },
    {
      id: "4d",
      missionType: "raffle" as const,
      displayName: "VIP Raffle",
      description: "Raffle starts soon",
      currentProgress: 0,
      goal: 1,
      progressPercentage: 0,
      remainingValue: 0,
      rewardType: "gift",
      rewardValue: null,
      rewardCustomText: "Apple Watch",
      status: "dormant" as const, // TEST: CARD STATE: Dormant
      checkpointEnd: null,
      requiredTier: null,
      raffleEndDate: "2025-03-01T23:59:59Z",
      activated: false,
      enabled: true,
      redemptions: { status: "claimable" },
    },
  ]
  }

  const completedMissions = 8 // TODO: Get from API

  const handleClaimMission = (mission: any) => {
    console.log("[v0] Claim mission clicked:", mission.id)

    // Route to correct modal based on reward type
    if (mission.reward_type === "discount") {
      setSelectedMission({
        id: mission.id,
        percent: mission.reward_value || 0,
        durationDays: 30, // Default duration for mission discounts
      })
      setShowDiscountModal(true)
      return
    }

    if (mission.reward_type === "commission_boost") {
      setSelectedMission({
        id: mission.id,
        percent: mission.reward_value || 0,
        durationDays: 30, // Default duration for mission commission boosts
      })
      setShowPayboostModal(true)
      return
    }

    // If physical gift type, open physical gift claim modal
    if (mission.reward_type === "physical_gift") {
      setSelectedPhysicalGift(mission)
      setShowPhysicalGiftModal(true)
      return
    }

    // For other reward types, claim immediately
    // TODO: POST /api/missions/:id/claim
    // Sets status from 'completed' → 'claimed'
  }

  const handleScheduleDiscount = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

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

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }

  const handleSchedulePayboost = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

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

      toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost", {
        description: "Please try again or contact support",
        duration: 5000,
      })
    }
  }

  const handleParticipateRaffle = (missionId: string) => {
    console.log("[v0] Participate in raffle clicked:", missionId)
    // TODO: POST /api/missions/:id/participate
    // Creates mission_progress (status='processing'), raffle_participants, redemptions
  }

  const handlePhysicalGiftSuccess = () => {
    console.log("[v0] Physical gift claimed successfully")
    // TODO: Refresh missions data from API
    // For now, the modal handles success toast
  }

  // Map backend mission types to frontend icons
  const getIconForMissionType = (missionType: string, status: string) => {
    const iconClass = cn(
      "h-8 w-8",
      status === "locked" && "text-slate-400",
      status === "processing" && "text-amber-500",
      (status === "active" || status === "available" || status === "dormant") &&
"text-slate-700",
      (status === "completed" || status === "claimed" || status === "won") &&
"text-green-600",
    )

    // Backend mission_type → Frontend icon mapping
    switch (missionType) {
      case "sales_dollars":
      case "sales_units":
        return <TrendingUp className={iconClass} />
      case "videos":
        return <Video className={iconClass} />
      case "likes":
        return <Heart className={iconClass} />
      case "views":
        return <Eye className={iconClass} />
      case "raffle":
        return <Clover className={iconClass} />
      default:
        return <TrendingUp className={iconClass} />
    }
  }

  // Calculate days remaining
  const calculateDaysRemaining = (endDate: string): number => {
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  // Format remaining amount text based on mission type
  const getRemainingText = (missionType: string, remainingValue: number): string => {
    switch (missionType) {
      case "sales_dollars":
        return `$${remainingValue.toLocaleString()} more to sell!`
      case "sales_units":
        return `${remainingValue.toLocaleString()} more units to sell!`
      case "videos":
        return `${remainingValue} more ${remainingValue === 1 ? 'video' : 'videos'} to post!`
      case "likes":
        return `${remainingValue.toLocaleString()} more likes!`
      case "views":
        return `${remainingValue.toLocaleString()} more views!`
      default:
        return `${remainingValue} more!`
    }
  }

  // Format reward text based on reward type
  const getRewardText = (
    rewardType: string,
    rewardValue: number | null,
    rewardCustomText: string | null
  ): string => {
    switch (rewardType) {
      case "gift_card":
        return `Win a $${rewardValue} Gift Card!`
      case "commission_boost":
        return `Win a ${rewardValue}% Commission Boost!`
      case "discount":
        return `Win a ${rewardValue}% Follower Discount!`
      case "physical_gift":
        return `Win ${rewardCustomText}!`
      case "gift":
        return `Win a ${rewardCustomText} Gift!`
      case "trip":
        return `Win a ${rewardCustomText}!`
      default:
        return "Win a reward!"
    }
  }

  // ✅ Backend already filters out: fulfilled, lost, cancelled, and disabled missions
  // ✅ Backend already sorts by status priority (completed → active → raffle → locked)
  const displayMissions = mockData.missions

  return (
    <>
      <PageLayout
        title="Missions"
        headerContent={
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3
  py-2 rounded-lg border border-white/30">
            <Trophy className="w-5 h-5" style={{ color: mockData.user.currentTierColor }} />
            <span className="text-base font-semibold text-white">{mockData.user.currentTierName}</span>
          </div>
        }
      >
        {/* Mission Cards */}
        <div className="space-y-4">
          {displayMissions.map((mission) => {
            const isRaffle = mission.mission_type === "raffle"

            // CARD STATE: Default Claim - Instant rewards (gift_card, spark_ads, experience, physical_gift)
            const isInstantReward = mission.reward_type === "gift_card" ||
                                   mission.reward_type === "spark_ads" ||
                                   mission.reward_type === "experience" ||
                                   mission.reward_type === "physical_gift"

            // CARD STATE: Redeeming - Instant rewards being processed (non-physical gifts, flippable)
            // Applies when: reward_type is gift_card/spark_ads/experience AND redemptions.status='claimed'
            const isRedeeming = (mission.reward_type === "gift_card" ||
                                mission.reward_type === "spark_ads" ||
                                mission.reward_type === "experience") &&
                               mission.status === "completed" &&
                               (mission as any).redemptions?.status === "claimed"

            // CARD STATE: Redeeming Physical - Physical gifts being shipped (NOT flippable)
            // Applies when: reward_type='physical_gift' AND redemptions.status='claimed' AND physical_gift_redemptions.shipping_city is set AND shipped_at is NULL
            const isRedeemingPhysical = mission.reward_type === "physical_gift" &&
                                       mission.status === "completed" &&
                                       (mission as any).redemptions?.status === "claimed" &&
                                       (mission as any).physical_gift_redemptions?.shipping_city &&
                                       !(mission as any).physical_gift_redemptions?.shipped_at

            // CARD STATE: Sending - Physical gifts shipped (flippable)
            // Applies when: reward_type='physical_gift' AND physical_gift_redemptions.shipped_at IS NOT NULL
            const isSending = mission.reward_type === "physical_gift" &&
                             mission.status === "completed" &&
                             (mission as any).physical_gift_redemptions?.shipped_at

            // CARD STATE: Locked - Tier-locked missions
            // Applies when: status='locked' (user's tier < required_tier)
            const isLocked = mission.status === "locked"

            // CARD STATE: Raffle Available - Raffle ready to participate
            // Applies when: mission_type='raffle' AND status='available'
            const isRaffleAvailable = isRaffle && mission.status === "available"

            // CARD STATE: Raffle Processing - Waiting for raffle draw
            // Applies when: mission_type='raffle' AND status='processing'
            const isRaffleProcessing = isRaffle && mission.status === "processing"

            // CARD STATE: Raffle Claim - Won raffle, needs to claim reward
            // Applies when: mission_type='raffle' AND redemptions.status='claimable' AND raffle_participations.is_winner=TRUE
            const isRaffleClaim = isRaffle &&
                                 (mission as any).redemptions?.status === "claimable" &&
                                 (mission as any).raffle_participations?.is_winner === true

            // CARD STATE: Raffle Won - Won raffle prize
            // Applies when: mission_type='raffle' AND status='won'
            const isRaffleWon = isRaffle && mission.status === "won"

            // CARD STATE: Dormant - Raffle not started yet
            // Applies when: mission_type='raffle' AND missions.activated='false' AND mission_progress.status='dormant'
            const isDormant = isRaffle && mission.status === "dormant"

            // CARD STATE: In Progress - Active missions with progress tracking
            // Applies when: missions.activated='true' AND mission_progress.status='active'
            const isInProgress = (mission as any).activated === true &&
                                mission.status === "active"

            // CARD STATE: Default Schedule - Scheduled rewards (commission_boost, discount)
            // Applies when: reward_type is commission_boost/discount AND status='completed'
            const isScheduledReward = mission.reward_type === "commission_boost" ||
                                     mission.reward_type === "discount"

            // CARD STATE: Scheduled - Scheduled rewards that have been claimed and have activation date set
            // Applies when: reward_type is commission_boost/discount AND redemptions.status='claimed' AND scheduled_activation_date is set
            const isScheduled = isScheduledReward &&
                               mission.status === "completed" &&
                               (mission as any).redemptions?.status === "claimed" &&
                               (mission as any).redemptions?.scheduled_activation_date

            // CARD STATE: Active - Active rewards currently running
            // Applies when: reward_type is commission_boost/discount AND redemptions.status='claimed'/'fulfilled' AND statusDetails has activation/expiration dates
            const isActive = isScheduledReward &&
                            mission.status === "completed" &&
                            ((mission as any).redemptions?.status === "claimed" || (mission as any).redemptions?.status === "fulfilled") &&
                            (mission as any).statusDetails?.activationDate &&
                            (mission as any).statusDetails?.expirationDate

            // CARD STATE: Pending Payment - Commission boost rewards pending payment info
            // Applies when: reward_type is commission_boost AND redemptions.status='claimed' AND boost_status='pending_info'
            const isPendingPayment = mission.reward_type === "commission_boost" &&
                                     mission.status === "completed" &&
                                     (mission as any).redemptions?.status === "claimed" &&
                                     (mission as any).commission_boost_redemption?.boost_status === "pending_info"

            // CARD STATE: Clearing - Commission boost waiting for sales to clear
            // Applies when: redemptions.status='claimed' AND boost_status='pending_payout'
            const isClearing = mission.status === "completed" &&
                              (mission as any).redemptions?.status === "claimed" &&
                              (mission as any).commission_boost_redemption?.boost_status === "pending_payout"

            // Build reward text
            let rewardText = ""
            if (isRaffle) {
              // For raffles, use reward data (reward_custom_text for physical_gift or reward_value for gift_card)
              const prizeName = mission.reward_custom_text || `$${mission.reward_value} Gift Card`
              if (mission.status === "won" || isRaffleClaim) {
                rewardText = `You won ${prizeName}!`
              } else if (mission.status === "available" || mission.status === "processing") {
                rewardText = getRewardText(mission.reward_type, mission.reward_value,
  mission.reward_custom_text)
              }
            } else {
              // For regular missions, use reward fields
              rewardText = getRewardText(mission.reward_type, mission.reward_value,
  mission.reward_custom_text)
            }

            // Build mission description for special raffle states
            let missionDescription = mission.description
            if (isRaffle) {
              if (mission.status === "locked") {
                missionDescription = `Unlock at ${mission.required_tier}`
              } else if (mission.status === "dormant") {
                missionDescription = `${mission.reward_custom_text} Raffle starts soon`
              } else if (mission.status === "processing") {
                const days = calculateDaysRemaining(mission.raffle_end_date!)
                missionDescription = `${days} days until raffle`
              }
            }

            // Card styling based on status
            const cardClass = cn(
              "p-5 rounded-xl border",
              // CARD STATE: In Progress - Slate background for active missions
              isInProgress && "bg-slate-50 border-slate-200",
              // CARD STATE: Raffle Available - Slate background for available raffles
              isRaffleAvailable && "bg-slate-50 border-slate-200",
              // CARD STATE: Raffle Processing - Amber background for raffles waiting for draw
              isRaffleProcessing && "bg-amber-50 border-amber-200",
              // CARD STATE: Dormant - Slate background for dormant raffles
              isDormant && "bg-slate-50 border-slate-200",
              // CARD STATE: Redeeming - Amber for instant rewards being processed
              isRedeeming && "bg-amber-50 border-amber-200",
              // CARD STATE: Redeeming Physical - Slate for physical gifts being shipped
              isRedeemingPhysical && "bg-slate-50 border-slate-200",
              // CARD STATE: Sending - Green for physical gifts shipped
              isSending && "bg-green-50 border-green-200",
              // CARD STATE: Pending Payment - Amber for commission boost pending payment info
              isPendingPayment && "bg-amber-50 border-amber-200",
              // CARD STATE: Clearing - Slate for commission boost waiting for sales to clear
              isClearing && "bg-slate-50 border-slate-200",
              // CARD STATE: Scheduled - Grey for scheduled rewards with activation date set
              isScheduled && "bg-slate-50 border-slate-200",
              // CARD STATE: Active - Green for active rewards currently running
              isActive && "bg-green-50 border-green-200",
              // CARD STATE: Default Claim - Green for completed instant rewards (claimable)
              (mission.status === "completed" && isInstantReward && !isRedeeming && !isRedeemingPhysical) &&
                "bg-green-50 border-green-200",
              // CARD STATE: Default Schedule - Green for completed scheduled rewards ready to schedule (claimable)
              (mission.status === "completed" && isScheduledReward && !isScheduled && !isPendingPayment && (mission as any).redemptions?.status === "claimable") &&
                "bg-green-50 border-green-200",
              // CARD STATE: Raffle Claim - Green background for claimable raffle prizes
              isRaffleClaim && "bg-green-50 border-green-200",
              // CARD STATE: Raffle Won - Green background for won raffle prizes
              isRaffleWon && "bg-green-50 border-green-200",
              // Other green states (claimed)
              mission.status === "claimed" && "bg-green-50 border-green-200",
              // CARD STATE: Locked - Slate with reduced opacity for tier-locked missions
              isLocked && "bg-slate-50 border-slate-200 opacity-60",
            )

            // CARD STATE: Redeeming, Scheduled, Active, Pending Payment, Clearing, or Sending - Entire card is flippable
            return isRedeeming || isScheduled || isActive || isPendingPayment || isClearing || isSending ? (
              <FlippableCardMissions key={mission.id} id={`mission-${mission.id}`}>
                {({ isFlipped, flip, flipBack }) => (
                  <>
                    {/* Front Side - Full Card */}
                    <MissionFlipFrontSide className={cardClass}>
                      {/* Mission Title with Icon and Info Button */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getIconForMissionType(mission.mission_type, mission.status)}
                          <h3 className="text-lg font-bold text-slate-900">
                            {isActive
                              ? mission.reward_type === "commission_boost"
                                ? `${mission.reward_value}% Commission Boost`
                                : `${mission.reward_value}% Follower Discount`
                              : mission.display_name
                            }
                          </h3>
                        </div>
                        <MissionFlipInfoButton onClick={flip} />
                      </div>

                      {/* Reward Text */}
                      {!isActive && rewardText && (
                        <p className="text-base text-slate-600 mb-3 font-medium">{rewardText}</p>
                      )}
                      {isActive && (
                        <p className="text-base text-slate-600 mb-3 font-medium">
                          {mission.reward_type === "commission_boost"
                            ? "Earning extra for every sale!"
                            : "Your fans pay less!"
                          }
                        </p>
                      )}

                      {/* Progress Section - Hide for Active state */}
                      {!isRaffle && !isActive && (
                        <>
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-full bg-slate-200 rounded-full h-3 mr-3">
                                <div
                                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${mission.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-base font-semibold text-slate-900 whitespace-nowrap">
                                {mission.progress_percentage}%
                              </span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Button - Pending, Scheduled, or Active */}
                      {isRedeeming && (
                        <Button
                          className="w-full bg-amber-200 text-amber-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                          disabled
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Pending
                        </Button>
                      )}
                      {isScheduled && (
                        <Button
                          className="w-full bg-purple-100 text-purple-700 font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                          disabled
                        >
                          <Calendar className="h-4 w-4 text-purple-500" />
                          Scheduled
                        </Button>
                      )}
                      {/* CARD STATE: Active - Green "Active" button with checkmark icon */}
                      {isActive && (
                        <Button
                          className="w-full bg-green-100 text-green-700 font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                          disabled
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Active
                        </Button>
                      )}
                      {/* CARD STATE: Pending Payment - Amber "Add Info" button (clickable) */}
                      {isPendingPayment && (
                        <Button
                          onClick={() => {
                            setSelectedPaymentMission({
                              id: mission.id,
                              name: mission.display_name
                            })
                            setShowPaymentInfoModal(true)
                          }}
                          className="w-full bg-amber-200 text-amber-800 font-semibold py-3 rounded-lg"
                        >
                          Add Info
                        </Button>
                      )}
                      {/* CARD STATE: Clearing - Blue "Clearing" button with clock icon */}
                      {isClearing && (
                        <Button
                          className="w-full bg-blue-100 text-blue-700 font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                          disabled
                        >
                          <ClockArrowDown className="h-4 w-4 text-blue-500" />
                          Clearing
                        </Button>
                      )}
                      {/* CARD STATE: Sending - Green "Shipping" button with check icon */}
                      {isSending && (
                        <Button
                          className="w-full bg-green-100 text-green-700 font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                          disabled
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Shipping
                        </Button>
                      )}
                    </MissionFlipFrontSide>

                    {/* Back Side - Full Card */}
                    <MissionFlipBackSide
                      onClick={flipBack}
                      className={`${cardClass} cursor-pointer`}
                    >
                      {isRedeeming && (
                        <p className="text-center text-amber-800 font-medium text-base">
                          We will deliver your reward in up to 72 hours
                        </p>
                      )}
                      {isScheduled && (
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center mb-1">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            <p className="text-sm font-semibold text-purple-700">
                              {(mission as any).redemptions?.scheduled_activation_date || "Scheduled"}
                            </p>
                          </div>
                          <p className="text-sm text-slate-600">
                            Will be active for 30 days
                          </p>
                        </div>
                      )}
                      {/* CARD STATE: Active - Backside with start/end dates */}
                      {isActive && (
                        <div className="text-center">
                          <div className="flex items-center gap-2 justify-center mb-1">
                            <p className="text-sm text-slate-600">Started:</p>
                            <p className="text-sm font-semibold text-green-700">
                              {(mission as any).statusDetails?.activationDate || "Active"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 justify-center">
                            <p className="text-sm text-slate-600">Expires:</p>
                            <p className="text-sm font-semibold text-green-700">
                              {(mission as any).statusDetails?.expirationDate || "Soon"}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* CARD STATE: Pending Payment - Backside with payout setup message */}
                      {isPendingPayment && (
                        <div className="flex items-center gap-2 justify-center">
                          <p className="text-base text-amber-800 font-medium">
                            Setup your payout info
                          </p>
                          <CircleDollarSign className="h-5 w-5 text-amber-600" />
                        </div>
                      )}
                      {/* CARD STATE: Clearing - Backside with sales clearing message */}
                      {isClearing && (
                        <p className="text-center text-slate-700 font-medium text-base px-4">
                          Sales clear after 20 days to allow for returns. We'll notify you as soon as your reward is ready.
                        </p>
                      )}
                      {/* CARD STATE: Sending - Backside with shipping message */}
                      {isSending && (
                        <div className="flex items-center gap-2 justify-center">
                          <p className="text-center text-green-700 font-medium text-base">
                            Your gift is on its way!
                          </p>
                          <Truck className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                    </MissionFlipBackSide>
                  </>
                )}
              </FlippableCardMissions>
            ) : (
              // Regular Card (Non-Redeeming)
              <div key={mission.id} className={cardClass}>
                {/* Mission Title with Icon and Lock Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getIconForMissionType(mission.mission_type, mission.status)}
                    <h3 className="text-lg font-bold text-slate-900">
                      {mission.display_name}
                    </h3>
                  </div>
                  {/* CARD STATE: Locked - Lock badge with required tier */}
                  {isLocked && (
                    <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
                      🔒 {mission.required_tier}
                    </div>
                  )}
                </div>

                {/* Reward Text - Shows for all missions including locked */}
                {rewardText && (
                  <p className="text-base text-slate-600 mb-3 font-medium">{rewardText}</p>
                )}

                {/* Mission Description - Only for dormant raffles without reward text */}
                {mission.status === "dormant" && !rewardText && (
                  <p className="text-base text-slate-600 mb-3">{missionDescription}</p>
                )}

                {/* Progress Section (only for active/completed regular missions) */}
                {!isRaffle && (mission.status === "active" || mission.status === "completed")
   && (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-full bg-slate-200 rounded-full h-3 mr-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all
  duration-500"
                            style={{ width: `${mission.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-base font-semibold text-slate-900
  whitespace-nowrap">
                          {mission.progress_percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Remaining Amount Text - Only for active missions */}
                    {mission.remaining_value > 0 && mission.status === "active" && (
                      <p className="text-base font-semibold text-slate-900 mb-3">
                        {getRemainingText(mission.mission_type, mission.remaining_value)}
                      </p>
                    )}
                  </>
                )}

                {/* CARD STATE: Raffle Processing - Description with countdown */}
                {isRaffleProcessing && (
                  <p className="text-sm text-slate-600 mb-3">{missionDescription}</p>
                )}

                {/* Status-specific actions/displays */}
                {/* CARD STATE: Default Claim - Green "Claim Reward" button for instant rewards */}
                {mission.status === "completed" && isInstantReward && !isRedeemingPhysical && !isRaffleClaim && (
                  <Button
                    onClick={() => handleClaimMission(mission)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600
  hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Claim Reward
                  </Button>
                )}

                {/* CARD STATE: Default Schedule - Green "Schedule Reward" button for scheduled rewards */}
                {mission.status === "completed" && isScheduledReward && (
                  <Button
                    onClick={() => handleClaimMission(mission)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600
  hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Schedule Reward
                  </Button>
                )}

                {mission.status === "claimed" && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3
  py-2 rounded-lg text-sm font-medium w-fit">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Prize on the way
                  </div>
                )}

                {/* CARD STATE: Raffle Available - Purple "Participate" button */}
                {isRaffleAvailable && (
                  <Button
                    onClick={() => handleParticipateRaffle(mission.id)}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600
  hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Participate
                  </Button>
                )}

                {/* CARD STATE: Raffle Processing - Amber "Waiting for Draw" badge */}
                {isRaffleProcessing && (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3
  py-2 rounded-lg text-sm font-medium w-fit">
                    <Clover className="h-4 w-4" />
                    Waiting for Draw
                  </div>
                )}

                {/* CARD STATE: Raffle Claim - Green "Claim Reward" button */}
                {isRaffleClaim && (
                  <Button
                    onClick={() => handleClaimMission(mission)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600
  hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Claim Reward
                  </Button>
                )}

                {/* CARD STATE: Raffle Won - Green "Prize on the way" badge */}
                {isRaffleWon && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3
  py-2 rounded-lg text-sm font-medium w-fit">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Prize on the way
                  </div>
                )}

                {/* CARD STATE: Redeeming Physical - Amber "Pending" button (NOT flippable) */}
                {isRedeemingPhysical && (
                  <Button
                    className="w-full bg-amber-200 text-amber-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 cursor-default"
                    disabled
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pending
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Completed Missions History Section */}
        <div className="border-t border-slate-200 pt-6 mt-8">
          <Link href="/missions/missionhistory" className="block">
            <Button
              variant="outline"
              className="w-full bg-white border-slate-200 text-slate-700 font-medium py-3
  rounded-lg hover:bg-slate-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                <span>View Completed Missions</span>
                <span className="text-slate-400">({completedMissions})</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Button>
          </Link>
        </div>

        {/* Schedule Discount Modal */}
        {selectedMission && (
          <ScheduleDiscountModal
            open={showDiscountModal}
            onClose={() => {
              setShowDiscountModal(false)
              setSelectedMission(null)
            }}
            onConfirm={handleScheduleDiscount}
            discountPercent={selectedMission.percent}
            durationDays={selectedMission.durationDays}
          />
        )}

        {/* Schedule Payboost Modal */}
        {selectedMission && (
          <SchedulePayboostModal
            open={showPayboostModal}
            onClose={() => {
              setShowPayboostModal(false)
              setSelectedMission(null)
            }}
            onConfirm={handleSchedulePayboost}
            boostPercent={selectedMission.percent}
            durationDays={selectedMission.durationDays}
          />
        )}

        {/* Payment Info Modal */}
        {selectedPaymentMission && (
          <PaymentInfoModal
            open={showPaymentInfoModal}
            onOpenChange={(open) => {
              setShowPaymentInfoModal(open)
              if (!open) {
                setSelectedPaymentMission(null)
              }
            }}
            rewardId={selectedPaymentMission.id}
            rewardName={selectedPaymentMission.name}
            onSuccess={() => {
              console.log("[v0] Payment info submitted successfully")
              // TODO: Refresh missions data from API
            }}
          />
        )}

        {/* Physical Gift Claim Modal */}
        {selectedPhysicalGift && (
          <ClaimPhysicalGiftModal
            open={showPhysicalGiftModal}
            onOpenChange={(open) => {
              setShowPhysicalGiftModal(open)
              if (!open) {
                setSelectedPhysicalGift(null)
              }
            }}
            reward={selectedPhysicalGift}
            onSuccess={handlePhysicalGiftSuccess}
          />
        )}
      </PageLayout>
    </>
  )
}
