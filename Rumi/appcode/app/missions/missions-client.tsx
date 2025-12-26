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
  Clock,  // NEW: for recurring_cooldown state (GAP-RECURRING-001)
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/pagelayout"
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { PaymentInfoModal } from "@/components/payment-info-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
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

// Props interface for server-passed data
interface MissionsClientProps {
  initialData: MissionsPageResponse | null
  error: string | null
}

// Named export for use by Server Component
export function MissionsClient({ initialData, error: initialError }: MissionsClientProps) {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)

  // Modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showPayboostModal, setShowPayboostModal] = useState(false)
  const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false)
  const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false)
  const [selectedMission, setSelectedMission] = useState<{ id: string; progressId?: string | null; percent: number; durationDays: number } | null>(null)
  const [selectedPaymentMission, setSelectedPaymentMission] = useState<{ id: string; redemptionId: string; name: string } | null>(null)
  const [selectedPhysicalGift, setSelectedPhysicalGift] = useState<any | null>(null)

  // Raffle participation state
  const [participatingMissionId, setParticipatingMissionId] = useState<string | null>(null)

  // ============================================
  // DATA FETCHING - REMOVED (ENH-004)
  // ============================================
  // Server Component (page.tsx) now fetches data and passes via props.
  // This eliminates the skeleton loader and double-fetch issues.
  // See: MissionsServerFetchEnhancement.md (ENH-004)

  // Tier colors (matches VIP level)
  const tierColors = {
    Bronze: "#CD7F32",
    Silver: "#94a3b8",
    Gold: "#F59E0B",
    Platinum: "#818CF8",
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // NOTE: Mock data removed - now fetching from /api/missions

  const handleClaimMission = async (mission: any) => {
    console.log("[v0] Claim mission clicked:", mission.id)

    // Route to correct modal based on reward type
    if (mission.rewardType === "discount") {
      setSelectedMission({
        id: mission.id,
        progressId: mission.progressId,
        percent: mission.valueData?.percent || 0,
        durationDays: mission.valueData?.durationDays || 30
      })
      setShowDiscountModal(true)
      return
    }

    if (mission.rewardType === "commission_boost") {
      setSelectedMission({
        id: mission.id,
        progressId: mission.progressId,
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

    // For other reward types (gift_card, spark_ads, experience), claim immediately
    await claimMissionReward(
      {
        missionProgressId: mission.progressId || mission.id,
        successMessage: 'Reward claimed!',
        successDescription: 'Check back soon for fulfillment updates',
      },
      () => window.location.reload()
    )
  }

  const handleScheduleDiscount = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // Extract date/time from UTC Date object (modal already converted ET → UTC)
      // API expects: scheduledActivationDate (YYYY-MM-DD) and scheduledActivationTime (HH:MM:SS in UTC)
      // ⚠️ DO NOT apply additional timezone conversion - scheduledDate is already UTC
      const isoString = scheduledDate.toISOString()
      const dateStr = isoString.split('T')[0]
      const timeStr = isoString.split('T')[1].split('.')[0]

      const response = await fetch(`/api/missions/${selectedMission.progressId || selectedMission.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledActivationDate: dateStr,
          scheduledActivationTime: timeStr,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to schedule discount')
      }

      // Show success message with user-friendly display
      const displayDateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const displayTimeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Discount scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
        description: "We'll activate your discount at this time",
        duration: 5000,
      })

      // Refresh page to update mission status (2 second delay for toast visibility)
      setTimeout(() => window.location.reload(), 2000)

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount", {
        description: error instanceof Error ? error.message : "Please try again or contact support",
        duration: 5000,
      })
    }
  }

  const handleSchedulePayboost = async (scheduledDate: Date) => {
    if (!selectedMission) return

    console.log("[v0] Schedule mission commission boost for:", selectedMission.id, scheduledDate.toISOString())

    try {
      // Extract date/time from UTC Date object (modal already converted 2 PM ET → UTC)
      // API expects: scheduledActivationDate (YYYY-MM-DD) and scheduledActivationTime (HH:MM:SS in UTC)
      // ⚠️ DO NOT apply additional timezone conversion - scheduledDate is already UTC
      const isoString = scheduledDate.toISOString()
      const dateStr = isoString.split('T')[0]
      const timeStr = isoString.split('T')[1].split('.')[0]

      const response = await fetch(`/api/missions/${selectedMission.progressId || selectedMission.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledActivationDate: dateStr,
          scheduledActivationTime: timeStr,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to schedule commission boost')
      }

      // Show success message with user-friendly display
      const displayDateStr = scheduledDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      const displayTimeStr = scheduledDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })

      toast.success(`Commission boost scheduled for ${displayDateStr} at ${displayTimeStr} ET`, {
        description: "We'll activate your boost at this time",
        duration: 5000,
      })

      // Refresh page to update mission status (2 second delay for toast visibility)
      setTimeout(() => window.location.reload(), 2000)

      // Reset selected mission
      setSelectedMission(null)
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost", {
        description: error instanceof Error ? error.message : "Please try again or contact support",
        duration: 5000,
      })
    }
  }

  const handleParticipateRaffle = async (missionId: string) => {
    if (participatingMissionId) return // Prevent double-click

    setParticipatingMissionId(missionId)

    try {
      const response = await fetch(`/api/missions/${missionId}/participate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to enter raffle')
      }

      // Null guard: only update if state exists
      setMissionsData(prev =>
        prev ? {
          ...prev,
          missions: prev.missions.map(m =>
            m.id === missionId
              ? { ...m, status: 'raffle_processing' as const }
              : m
          )
        } : prev
      )

      // Show success toast with draw date
      toast.success("You're entered in the raffle!", {
        description: data.raffleData?.drawDateFormatted
          ? `Draw date: ${data.raffleData.drawDateFormatted}`
          : "Good luck!",
        duration: 5000,
      })

    } catch (error) {
      console.error('[Missions] Participate error:', error)
      toast.error('Failed to enter raffle', {
        description: error instanceof Error ? error.message : 'Please try again',
        duration: 5000,
      })
    } finally {
      setParticipatingMissionId(null)
    }
  }

  const handlePhysicalGiftSuccess = () => {
    // Refresh page to update mission status (2 second delay for toast visibility)
    setTimeout(() => window.location.reload(), 2000)
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
  const displayMissions = missionsData?.missions || []

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <PageLayout title="Missions">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load missions</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </PageLayout>
    )
  }

  // ============================================
  // NO DATA STATE
  // ============================================
  if (!missionsData) {
    return (
      <PageLayout title="Missions">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-600">No missions available</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <>
      <PageLayout
        title="Missions"
        headerContent={
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3
  py-2 rounded-lg border border-white/30">
            <Trophy className="w-5 h-5" style={{ color: missionsData.user.currentTierColor }} />
            <span className="text-base font-semibold text-white">{missionsData.user.currentTierName}</span>
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
            const isRecurringCooldown = mission.status === "recurring_cooldown"  // NEW: GAP-RECURRING-001

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
              // CARD STATE: Recurring Cooldown - Slate with reduced opacity for rate-limited missions (GAP-RECURRING-001)
              isRecurringCooldown && "bg-slate-50 border-slate-200 opacity-70",
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
                            if (mission.redemptionId) {
                              setSelectedPaymentMission({
                                id: mission.id,
                                redemptionId: mission.redemptionId,
                                name: mission.displayName
                              })
                              setShowPaymentInfoModal(true)
                            } else {
                              console.warn('[MissionsClient] Mission in pending_info status missing redemptionId:', mission.id)
                            }
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
                  {/* RECURRING BADGE - Shows for all recurring missions including locked (GAP-RECURRING-001) */}
                  {mission.recurringData?.frequency && (
                    <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
                      {mission.recurringData.frequency === 'weekly' && '📅 Weekly'}
                      {mission.recurringData.frequency === 'monthly' && '📅 Monthly'}
                      {mission.recurringData.frequency === 'unlimited' && '♾️ Unlimited'}
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

                {/* CARD STATE: Recurring Cooldown - Shows cooldown info (GAP-RECURRING-001) */}
                {isRecurringCooldown && (
                  <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Available again in {mission.recurringData?.cooldownDaysRemaining || 0} {mission.recurringData?.cooldownDaysRemaining === 1 ? 'day' : 'days'}
                  </div>
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
                    disabled={participatingMissionId === mission.id}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600
  hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg
  disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {participatingMissionId === mission.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Entering...
                      </>
                    ) : (
                      'Participate'
                    )}
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

                {/* CARD STATE: Dormant Raffle - "Coming Soon!" text */}
                {isDormant && isRaffle && (
                  <p className="text-sm text-slate-500 font-medium">Coming Soon!</p>
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
            redemptionId={selectedPaymentMission.redemptionId}
            rewardName={selectedPaymentMission.name}
            onSuccess={() => {
              console.log("[MissionsClient] Payment info submitted successfully")
              // Refresh page to update mission status (pending_info → clearing)
              setTimeout(() => window.location.reload(), 2000)
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
