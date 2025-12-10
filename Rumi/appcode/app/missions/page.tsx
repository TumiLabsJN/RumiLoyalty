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
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "gift_card",
      rewardDescription: "Win a $50 Gift Card!",
      rewardSource: "mission",
      status: "in_progress",
      progress: {
        currentValue: 1500,
        currentFormatted: "$1,500",
        targetValue: 2000,
        targetFormatted: "$2,000",
        percentage: 75,
        remainingText: "$500 more to go!",
        progressText: "$1,500 of $2,000"
      },
      deadline: {
        checkpointEnd: "2025-03-15T23:59:59Z",
        checkpointEndFormatted: "March 15, 2025",
        daysRemaining: 23
      },
      valueData: { amount: 50 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "1b",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "gift_card",
      rewardDescription: "Win a $100 Gift Card!",
      rewardSource: "mission",
      status: "redeeming",
      progress: null,
      deadline: null,
      valueData: { amount: 100 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "message",
        message: "We will deliver your reward in up to 72 hours",
        dates: null
      }
    },
    {
      id: "2",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +5% commission for 30 days!",
      rewardSource: "mission",
      status: "in_progress",
      progress: {
        currentValue: 8,
        currentFormatted: "8 videos",
        targetValue: 15,
        targetFormatted: "15 videos",
        percentage: 53,
        remainingText: "7 more videos to post!",
        progressText: "8 of 15 videos"
      },
      deadline: {
        checkpointEnd: "2025-03-10T23:59:59Z",
        checkpointEndFormatted: "March 10, 2025",
        daysRemaining: 18
      },
      valueData: { percent: 5, durationDays: 30 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "2b",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +5% commission for 30 days!",
      rewardSource: "mission",
      status: "default_schedule",
      progress: null,
      deadline: null,
      valueData: { percent: 5, durationDays: 30 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "3",
      missionType: "likes",
      displayName: "Fan Favorite",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "gift_card",
      rewardDescription: "Win a $25 Gift Card!",
      rewardSource: "mission",
      status: "default_claim",
      progress: null,
      deadline: null,
      valueData: { amount: 25 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "3b",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "discount",
      rewardDescription: "Win a Follower Discount of 15% for 1 days!",
      rewardSource: "mission",
      status: "default_schedule",
      progress: null,
      deadline: null,
      valueData: { percent: 15, durationDays: 1 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "3c",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +5% commission for 30 days!",
      rewardSource: "mission",
      status: "scheduled",
      progress: null,
      deadline: null,
      valueData: { percent: 5, durationDays: 30 },
      scheduling: {
        scheduledActivationDate: "2025-01-25",
        scheduledActivationTime: "19:00:00",
        scheduledActivationFormatted: "Jan 25, 2025 at 2:00 PM EST",
        activationDate: null,
        activationDateFormatted: null,
        expirationDate: null,
        expirationDateFormatted: null,
        durationText: "Active for 30 days"
      },
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "dates",
        message: null,
        dates: [
          { label: "Scheduled", value: "Jan 25, 2025 at 2:00 PM EST" },
          { label: "Duration", value: "Active for 30 days" }
        ]
      }
    },
    {
      id: "3d",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "discount",
      rewardDescription: "Win a Follower Discount of 15% for 1 days!",
      rewardSource: "mission",
      status: "scheduled",
      progress: null,
      deadline: null,
      valueData: { percent: 15, durationDays: 1 },
      scheduling: {
        scheduledActivationDate: "2025-01-22",
        scheduledActivationTime: "15:30:00",
        scheduledActivationFormatted: "Jan 22, 2025 at 3:30 PM EST",
        activationDate: null,
        activationDateFormatted: null,
        expirationDate: null,
        expirationDateFormatted: null,
        durationText: "Active for 1 days"
      },
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "dates",
        message: null,
        dates: [
          { label: "Scheduled", value: "Jan 22, 2025 at 3:30 PM EST" },
          { label: "Duration", value: "Active for 1 days" }
        ]
      }
    },
    {
      id: "3e",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +10% commission for 30 days!",
      rewardSource: "mission",
      status: "active",
      progress: null,
      deadline: null,
      valueData: { percent: 10, durationDays: 30 },
      scheduling: {
        scheduledActivationDate: "2025-01-15",
        scheduledActivationTime: "00:00:00",
        scheduledActivationFormatted: "Jan 15, 2025",
        activationDate: "2025-01-15T00:00:00Z",
        activationDateFormatted: "Jan 15, 2025",
        expirationDate: "2025-02-14T23:59:59Z",
        expirationDateFormatted: "Feb 14, 2025",
        durationText: "Active for 30 days"
      },
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "dates",
        message: null,
        dates: [
          { label: "Started", value: "Jan 15, 2025" },
          { label: "Expires", value: "Feb 14, 2025" }
        ]
      }
    },
    {
      id: "3f",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "discount",
      rewardDescription: "Win a Follower Discount of 20% for 30 days!",
      rewardSource: "mission",
      status: "active",
      progress: null,
      deadline: null,
      valueData: { percent: 20, durationDays: 30 },
      scheduling: {
        scheduledActivationDate: "2025-01-12",
        scheduledActivationTime: "00:00:00",
        scheduledActivationFormatted: "Jan 12, 2025",
        activationDate: "2025-01-12T00:00:00Z",
        activationDateFormatted: "Jan 12, 2025",
        expirationDate: "2025-02-11T23:59:59Z",
        expirationDateFormatted: "Feb 11, 2025",
        durationText: "Active for 30 days"
      },
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "dates",
        message: null,
        dates: [
          { label: "Started", value: "Jan 12, 2025" },
          { label: "Expires", value: "Feb 11, 2025" }
        ]
      }
    },
    {
      id: "3g",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +10% commission for 30 days!",
      rewardSource: "mission",
      status: "pending_info",
      progress: null,
      deadline: null,
      valueData: { percent: 10, durationDays: 30 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "message",
        message: "Setup your payout info",
        dates: null
      }
    },
    {
      id: "3h",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "commission_boost",
      rewardDescription: "Win +8% commission for 30 days!",
      rewardSource: "mission",
      status: "clearing",
      progress: null,
      deadline: null,
      valueData: { percent: 8, durationDays: 30 },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "message",
        message: "Sales clear after 20 days to allow for returns. We'll notify you as soon as your reward is ready.",
        dates: null
      }
    },
    {
      id: "3i",
      missionType: "likes",
      displayName: "Fan Favorite",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win a Branded Hoodie!",
      rewardSource: "mission",
      status: "default_claim",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "Branded Hoodie",
        requiresSize: true,
        sizeCategory: "clothing",
        sizeOptions: ["S", "M", "L", "XL"]
      },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "3j",
      missionType: "videos",
      displayName: "Lights, Camera, Go!",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win Wireless Earbuds!",
      rewardSource: "mission",
      status: "redeeming_physical",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "Wireless Earbuds",
        requiresSize: false
      },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: null
    },
    {
      id: "3k",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win a Premium Water Bottle!",
      rewardSource: "mission",
      status: "sending",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "Premium Water Bottle",
        requiresSize: false
      },
      scheduling: null,
      raffleData: null,
      lockedData: null,
      flippableCard: {
        backContentType: "message",
        message: "Your gift is on its way!",
        dates: null
      }
    },
    {
      id: "3l",
      missionType: "sales_dollars",
      displayName: "Sales Sprint",
      targetUnit: "dollars",
      tierEligibility: "tier_4",
      rewardType: "gift_card",
      rewardDescription: "Win a $500 Gift Card!",
      rewardSource: "mission",
      status: "locked",
      progress: null,
      deadline: null,
      valueData: { amount: 500 },
      scheduling: null,
      raffleData: null,
      lockedData: {
        requiredTier: "tier_4",
        requiredTierName: "Platinum",
        requiredTierColor: "#818CF8",
        unlockMessage: "Unlock at Platinum",
        previewFromTier: "tier_3"
      },
      flippableCard: null
    },
    {
      id: "4a",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win an iPhone 16 Pro!",
      rewardSource: "mission",
      status: "raffle_available",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "iPhone 16 Pro",
        requiresSize: false
      },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-02-15T23:59:59Z",
        raffleEndFormatted: "Feb 15, 2025",
        daysUntilDraw: 26,
        isWinner: null,
        prizeName: "an iPhone 16 Pro"
      },
      lockedData: null,
      flippableCard: null
    },
    {
      id: "4b",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win a MacBook Pro!",
      rewardSource: "mission",
      status: "raffle_processing",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "MacBook Pro",
        requiresSize: false
      },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-01-25T23:59:59Z",
        raffleEndFormatted: "Jan 25, 2025",
        daysUntilDraw: 5,
        isWinner: null,
        prizeName: "a MacBook Pro"
      },
      lockedData: null,
      flippableCard: null
    },
    {
      id: "4c",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "You won AirPods Pro!",
      rewardSource: "mission",
      status: "raffle_claim",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "AirPods Pro",
        requiresSize: false
      },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-01-18T23:59:59Z",
        raffleEndFormatted: "Jan 18, 2025",
        daysUntilDraw: 0,
        isWinner: true,
        prizeName: "AirPods Pro"
      },
      lockedData: null,
      flippableCard: null
    },
    {
      id: "4c2",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "gift_card",
      rewardDescription: "You won a $100 Gift Card!",
      rewardSource: "mission",
      status: "raffle_claim",
      progress: null,
      deadline: null,
      valueData: { amount: 100 },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-01-17T23:59:59Z",
        raffleEndFormatted: "Jan 17, 2025",
        daysUntilDraw: 0,
        isWinner: true,
        prizeName: "a $100 Gift Card"
      },
      lockedData: null,
      flippableCard: null
    },
    {
      id: "4c3",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "You won an Apple Watch!",
      rewardSource: "mission",
      status: "raffle_won",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "Apple Watch",
        requiresSize: false
      },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-01-16T23:59:59Z",
        raffleEndFormatted: "Jan 16, 2025",
        daysUntilDraw: 0,
        isWinner: true,
        prizeName: "an Apple Watch"
      },
      lockedData: null,
      flippableCard: null
    },
    {
      id: "4d",
      missionType: "raffle",
      displayName: "VIP Raffle",
      targetUnit: "count",
      tierEligibility: "tier_3",
      rewardType: "physical_gift",
      rewardDescription: "Win an Apple Watch!",
      rewardSource: "mission",
      status: "dormant",
      progress: null,
      deadline: null,
      valueData: {
        displayText: "Apple Watch",
        requiresSize: false
      },
      scheduling: null,
      raffleData: {
        raffleEndDate: "2025-03-01T23:59:59Z",
        raffleEndFormatted: "Mar 1, 2025",
        daysUntilDraw: 40,
        isWinner: null,
        prizeName: "an Apple Watch"
      },
      lockedData: null,
      flippableCard: null
    },
  ]
  }

  const completedMissions = 8 // TODO: Get from API

  const handleClaimMission = (mission: any) => {
    console.log("[v0] Claim mission clicked:", mission.id)

    // Route to correct modal based on reward type
    if (mission.rewardType === "discount") {
      setSelectedMission({
        id: mission.id,
        percent: mission.valueData?.percent || 0,
        durationDays: mission.valueData?.durationDays || 30
      })
      setShowDiscountModal(true)
      return
    }

    if (mission.rewardType === "commission_boost") {
      setSelectedMission({
        id: mission.id,
        percent: mission.valueData?.percent || 0,
        durationDays: mission.valueData?.durationDays || 30
      })
      setShowPayboostModal(true)
      return
    }

    // If physical gift type, open physical gift claim modal
    if (mission.rewardType === "physical_gift") {
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
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

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
      // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

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

  // ✅ REMOVED FORMATTING FUNCTIONS (3 functions, ~45 lines)
  // Backend now provides all formatted text:
  // - mission.rewardDescription (replaces getRewardText)
  // - mission.progress.remainingText (replaces getRemainingText)
  // - mission.deadline.daysRemaining (replaces calculateDaysRemaining)

  // ✅ Backend already filters out: fulfilled, lost, cancelled, and disabled missions
  // ✅ Backend already sorts missions by priority (actionable → status updates → informational):
  //    1. Featured mission (matches home page)
  //    2. Actionable raffles (raffle_available, raffle_claim)
  //    3. Claimable rewards (default_claim, default_schedule)
  //    4. Pending payment → Clearing → Sending
  //    5. Active → Scheduled → Redeeming
  //    6. In progress
  //    7. Informational raffles (raffle_won, raffle_processing, dormant)
  //    8. Locked (tier-gated previews)
  // ✅ First mission in array is ALWAYS the featuredMissionId
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
            const isRaffle = mission.missionType === "raffle"

            // ✅ Backend pre-computes all CARD STATES - just check the status value
            const isRedeeming = mission.status === "redeeming"
            const isRedeemingPhysical = mission.status === "redeeming_physical"
            const isSending = mission.status === "sending"
            const isLocked = mission.status === "locked"
            const isRaffleAvailable = mission.status === "raffle_available"
            const isRaffleProcessing = mission.status === "raffle_processing"
            const isRaffleClaim = mission.status === "raffle_claim"
            const isRaffleWon = mission.status === "raffle_won"
            const isDormant = mission.status === "dormant"
            const isInProgress = mission.status === "in_progress"
            const isScheduled = mission.status === "scheduled"
            const isActive = mission.status === "active"
            const isPendingInfo = mission.status === "pending_info"
            const isClearing = mission.status === "clearing"
            const isDefaultClaim = mission.status === "default_claim"
            const isDefaultSchedule = mission.status === "default_schedule"

            // ✅ Use backend's pre-formatted rewardDescription
            const rewardText = mission.rewardDescription

            // Build mission description for special raffle states
            let missionDescription = ""
            if (isRaffle) {
              if (mission.status === "locked") {
                missionDescription = mission.lockedData?.unlockMessage || ""
              } else if (mission.status === "dormant") {
                missionDescription = `${mission.raffleData?.prizeName} Raffle starts soon`
              } else if (mission.status === "raffle_processing") {
                missionDescription = `${mission.raffleData?.daysUntilDraw || 0} days until raffle`
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
              isPendingInfo && "bg-amber-50 border-amber-200",
              // CARD STATE: Clearing - Slate for commission boost waiting for sales to clear
              isClearing && "bg-slate-50 border-slate-200",
              // CARD STATE: Scheduled - Grey for scheduled rewards with activation date set
              isScheduled && "bg-slate-50 border-slate-200",
              // CARD STATE: Active - Green for active rewards currently running
              isActive && "bg-green-50 border-green-200",
              // CARD STATE: Default Claim - Green for completed instant rewards (claimable)
              isDefaultClaim && "bg-green-50 border-green-200",
              // CARD STATE: Default Schedule - Green for completed scheduled rewards ready to schedule (claimable)
              isDefaultSchedule && "bg-green-50 border-green-200",
              // CARD STATE: Raffle Claim - Green background for claimable raffle prizes
              isRaffleClaim && "bg-green-50 border-green-200",
              // CARD STATE: Raffle Won - Green background for won raffle prizes
              isRaffleWon && "bg-green-50 border-green-200",
              // CARD STATE: Locked - Slate with reduced opacity for tier-locked missions
              isLocked && "bg-slate-50 border-slate-200 opacity-60",
            )

            // CARD STATE: Redeeming, Scheduled, Active, Pending Payment, Clearing, or Sending - Entire card is flippable
            return isRedeeming || isScheduled || isActive || isPendingInfo || isClearing || isSending ? (
              <FlippableCardMissions key={mission.id} id={`mission-${mission.id}`}>
                {({ isFlipped, flip, flipBack }) => (
                  <>
                    {/* Front Side - Full Card */}
                    <MissionFlipFrontSide className={cardClass}>
                      {/* Mission Title with Icon and Info Button */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getIconForMissionType(mission.missionType, mission.status)}
                          <h3 className="text-lg font-bold text-slate-900">
                            {isActive
                              ? mission.rewardType === "commission_boost"
                                ? `${mission.valueData?.percent || mission.valueData?.amount}% Commission Boost`
                                : `${mission.valueData?.percent || mission.valueData?.amount}% Follower Discount`
                              : mission.displayName
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
                          {mission.rewardType === "commission_boost"
                            ? "Earning extra for every sale!"
                            : "Your fans pay less!"
                          }
                        </p>
                      )}

                      {/* Progress Section - Only show if progress data exists */}
                      {!isRaffle && !isActive && mission.progress && (
                        <>
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-full bg-slate-200 rounded-full h-3 mr-3">
                                <div
                                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${mission.progress.percentage}%` }}
                                />
                              </div>
                              <span className="text-base font-semibold text-slate-900 whitespace-nowrap">
                                {mission.progress.percentage}%
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
                      {isPendingInfo && (
                        <Button
                          onClick={() => {
                            setSelectedPaymentMission({
                              id: mission.id,
                              name: mission.displayName
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
                              {mission.scheduling?.scheduledActivationFormatted || "Scheduled"}
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
                      {isPendingInfo && (
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
                          Sales clear after 20 days to allow for returns. We&apos;ll notify you as soon as your reward is ready.
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
                    {getIconForMissionType(mission.missionType, mission.status)}
                    <h3 className="text-lg font-bold text-slate-900">
                      {mission.displayName}
                    </h3>
                  </div>
                  {/* CARD STATE: Locked - Lock badge with required tier */}
                  {isLocked && (
                    <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full text-xs font-medium">
                      🔒 {mission.lockedData?.requiredTierName || ""}
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
                {!isRaffle && mission.progress !== null && (
                  <>
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-full bg-slate-200 rounded-full h-3 mr-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all
  duration-500"
                            style={{ width: `${mission.progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-base font-semibold text-slate-900
  whitespace-nowrap">
                          {mission.progress.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Remaining Amount Text - Only for active missions */}
                    {mission.progress && mission.progress.percentage < 100 && (
                      <p className="text-base font-semibold text-slate-900 mb-3">
                        {mission.progress.remainingText}
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
                {isDefaultClaim && (
                  <Button
                    onClick={() => handleClaimMission(mission)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600
  hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Claim Reward
                  </Button>
                )}

                {/* CARD STATE: Default Schedule - Green "Schedule Reward" button for scheduled rewards */}
                {isDefaultSchedule && (
                  <Button
                    onClick={() => handleClaimMission(mission)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600
  hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                  >
                    Schedule Reward
                  </Button>
                )}

                {(isScheduled || isActive) && (
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
