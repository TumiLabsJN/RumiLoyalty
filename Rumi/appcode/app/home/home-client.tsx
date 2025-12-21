"use client"
import { useState, useEffect } from "react"
import type { DashboardResponse, Reward } from "@/types/dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, HandCoins, Megaphone, Gift, BadgePercent, Palmtree, Info, ArrowLeft, X, Loader2 } from "lucide-react"
import { HomePageLayout } from "@/components/homepagelayout"
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal"
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal"
import { toast } from "sonner"
import { claimMissionReward } from '@/lib/client/claimMissionReward'
import { cn } from "@/lib/utils"

interface HomeClientProps {
  initialData: DashboardResponse | null
  error: string | null
}

export function HomeClient({ initialData, error }: HomeClientProps) {
  // ============================================
  // INTERACTIVE STATE ONLY (no data fetching)
  // ============================================
  const [isEnteringRaffle, setIsEnteringRaffle] = useState(false)
  const [isTierCardFlipped, setIsTierCardFlipped] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isClaimingReward, setIsClaimingReward] = useState(false)
  const [showPayboostModal, setShowPayboostModal] = useState(false)
  const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false)

  // Auto-flip back after 6 seconds
  useEffect(() => {
    if (isTierCardFlipped) {
      const timer = setTimeout(() => {
        setIsTierCardFlipped(false)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [isTierCardFlipped])

  // ============================================
  // ERROR STATE (from server)
  // ============================================
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center space-y-6 max-w-md text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600">{error}</p>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Info className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-slate-600">No dashboard data available</p>
        </div>
      </div>
    )
  }

  // ============================================
  // DATA - use initialData from server
  // ============================================
  const dashboardData = initialData

  // Custom Gift Drop SVG icon
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

  // Backend already sorts by display_order and limits to 4 rewards
  const displayedRewards = dashboardData.currentTierRewards
  const hasMoreRewards = dashboardData.totalRewardsCount > 4

  // Tier color from backend
  const currentTierColor = dashboardData.currentTier.color

  // ============================================
  // CLAIM HANDLERS
  // ============================================

  const handleClaimReward = async () => {
    const mission = dashboardData.featuredMission.mission
    if (!mission || !mission.progressId) return

    // Physical gift - show shipping modal
    if (mission.rewardType === "physical_gift") {
      setShowPhysicalGiftModal(true)
      return
    }

    // Commission boost - show scheduling modal
    if (mission.rewardType === "commission_boost") {
      setShowPayboostModal(true)
      return
    }

    // Discount - show existing scheduling modal
    if (mission.rewardType === "discount") {
      setShowScheduleModal(true)
      return
    }

    // Instant rewards (gift_card, spark_ads, experience) - use centralized utility
    setIsClaimingReward(true)
    await claimMissionReward(
      {
        missionProgressId: mission.progressId,
        successMessage: 'Reward claimed!',
        successDescription: 'Check Missions tab for details',
      },
      () => window.location.reload()
    )
    setIsClaimingReward(false)
  }

  const handleEnterRaffle = async () => {
    if (!dashboardData?.featuredMission.mission?.id) return

    setIsEnteringRaffle(true)
    try {
      const response = await fetch(
        `/api/missions/${dashboardData.featuredMission.mission.id}/participate`,
        { method: 'POST' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success("You're in! Check Missions tab for updates")
          // Delay reload so user can see success message
          setTimeout(() => window.location.reload(), 1500)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Entry failed. Please try again")
      }
    } catch (error) {
      console.error('Raffle entry error:', error)
      toast.error("Something went wrong. Please try again")
    } finally {
      setIsEnteringRaffle(false)
    }
  }

  const handleScheduleDiscount = async (scheduledDate: Date) => {
    const mission = dashboardData.featuredMission.mission
    if (!mission || !mission.progressId) return

    try {
      const response = await fetch(`/api/missions/${mission.progressId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledActivationDate: scheduledDate.toISOString().split('T')[0],
          scheduledActivationTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const dateStr = scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          const timeStr = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
          toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, { description: "Check Missions tab for details", duration: 5000 })
          // Delay reload so user can see success message
          setTimeout(() => window.location.reload(), 1500)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to schedule discount")
      }
    } catch (error) {
      console.error("Failed to schedule discount:", error)
      toast.error("Failed to schedule discount")
    }
  }

  const handleSchedulePayboost = async (scheduledDate: Date) => {
    const mission = dashboardData.featuredMission.mission
    if (!mission || !mission.progressId) return

    try {
      const response = await fetch(`/api/missions/${mission.progressId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledActivationDate: scheduledDate.toISOString().split('T')[0],
          scheduledActivationTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const dateStr = scheduledDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          const timeStr = scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
          toast.success(`Commission boost scheduled for ${dateStr} at ${timeStr} ET`, { description: "Check Missions tab for details", duration: 5000 })
          // Delay reload so user can see success message
          setTimeout(() => window.location.reload(), 1500)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to schedule boost")
      }
    } catch (error) {
      console.error("Failed to schedule commission boost:", error)
      toast.error("Failed to schedule commission boost")
    }
  }

  // ============================================
  // SVG CIRCLE GEOMETRY (UI presentation logic)
  // ============================================
  const missionProgressPercentage = dashboardData.featuredMission.mission?.progressPercentage || 0
  const circleSize = 240
  const strokeWidth = 24
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const circleOffset = circumference - (missionProgressPercentage / 100) * circumference
  const tierProgressPercentage = dashboardData.tierProgress.progressPercentage

  return (
    <>
      <HomePageLayout title={`Hi, @${dashboardData.user.handle}`}>
      {/* Section 1: Circular Progress */}
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <h3 className="text-lg font-semibold text-slate-900">{dashboardData.user.clientName} Rewards</h3>

        {/* Circular Progress */}
        <div className="relative inline-flex items-center justify-center">
          <svg width={circleSize} height={circleSize} className="transform -rotate-90">
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
            />
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

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              "font-bold text-slate-900",
              dashboardData.featuredMission.mission?.isRaffle ? "text-xl" : "text-3xl"
            )}>
              {dashboardData.featuredMission.mission?.currentFormatted || ""}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {dashboardData.featuredMission.mission?.targetText || ""}
            </span>
          </div>
        </div>

        {/* Subtitle - Reward display */}
        {dashboardData.featuredMission.status === "completed" ? (
          <Button
            onClick={handleClaimReward}
            disabled={isClaimingReward || !dashboardData.featuredMission.mission?.progressId}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isClaimingReward ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              getIconForBenefitType(dashboardData.featuredMission.mission?.rewardType || "gift_card")
            )}
            {isClaimingReward ? "Claiming..." : dashboardData.featuredMission.mission?.rewardDisplayText}
          </Button>
        ) : dashboardData.featuredMission.status === "raffle_available" ? (
          <Button
            onClick={handleEnterRaffle}
            disabled={isEnteringRaffle}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
          >
            {isEnteringRaffle ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Gift className="h-5 w-5" />
            )}
            {isEnteringRaffle ? 'Entering...' : 'Enter Raffle'}
          </Button>
        ) : (
          <p className="text-base text-slate-900 font-semibold">
            Next:{" "}
            <span className="text-slate-600 font-semibold">
              {dashboardData.featuredMission.mission?.rewardDisplayText}
            </span>
          </p>
        )}
      </div>

      {/* Current Rewards Card */}
      <Card className="bg-white rounded-xl shadow-sm">
        <CardContent className="px-6 py-1">
          <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: currentTierColor }} />
            {dashboardData.currentTier.name} Level Rewards
          </h3>
          <ul className="space-y-3">
            {displayedRewards.map((reward, index) => (
              <li key={index} className="flex items-start gap-3">
                {getIconForBenefitType(reward.type)}
                <span className="text-sm text-slate-700">
                  {reward.displayText}
                </span>
              </li>
            ))}
            {hasMoreRewards && (
              <li className="flex items-start gap-3">
                <span className="text-slate-400 text-sm">•</span>
                <span className="text-sm text-slate-500 italic">And more!</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Tier Progress Card (Flippable) */}
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
                <div className="relative inline-block">
                  <div
                    className="absolute inset-0 opacity-20 blur-sm rounded-lg -z-10"
                    style={{
                      background: `linear-gradient(135deg, ${dashboardData.nextTier?.color || currentTierColor}, ${dashboardData.nextTier?.color || currentTierColor}80)`,
                      transform: 'scale(1.1)',
                    }}
                  />
                  <h3
                    className="text-base font-bold text-slate-900 px-3 py-1 relative"
                    style={{
                      background: `linear-gradient(135deg, ${dashboardData.nextTier?.color || currentTierColor}15, ${dashboardData.nextTier?.color || currentTierColor}25)`,
                      borderRadius: '0.5rem',
                      boxShadow: `0 0 15px ${dashboardData.nextTier?.color || currentTierColor}40`,
                    }}
                  >
                    {dashboardData.nextTier ? `Unlock ${dashboardData.nextTier.name}` : "You're at the Top!"}
                  </h3>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">
                    {dashboardData.tierProgress.currentFormatted} of{" "}
                    {dashboardData.tierProgress.targetFormatted}
                  </p>
                  <p className="text-sm text-slate-600">{dashboardData.client.vipMetricLabel}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" style={{ color: currentTierColor }} />
                    <span className="font-semibold text-slate-900">{dashboardData.currentTier.name}</span>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${tierProgressPercentage}%`,
                        backgroundColor: currentTierColor,
                      }}
                    />
                  </div>

                  {!dashboardData.currentTier.checkpointExempt && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <p className="text-xs text-slate-600">
                        {dashboardData.currentTier.name} Expires on {dashboardData.tierProgress.checkpointExpiresFormatted}
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
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="h-3 w-3" />
                    Tap to return
                  </span>
                  <X className="h-3.5 w-3.5" />
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900">
                    ⚠️ VIP Checkpoint
                  </h3>
                  <p className="text-sm text-slate-600">
                    Your <span className="font-semibold">{dashboardData.currentTier.name}</span> Level renews every <span className="font-semibold">{dashboardData.tierProgress.checkpointMonths}</span> months based on sales.
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

    </HomePageLayout>

      {/* Schedule Discount Modal */}
      <ScheduleDiscountModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleScheduleDiscount}
        discountPercent={(dashboardData.featuredMission.mission?.rewardValueData?.percent as number) || dashboardData.featuredMission.mission?.rewardAmount || 0}
        durationDays={(dashboardData.featuredMission.mission?.rewardValueData?.duration_days as number) || 30}
      />

      {/* Schedule Payboost Modal */}
      {dashboardData.featuredMission.mission && (
        <SchedulePayboostModal
          open={showPayboostModal}
          onClose={() => setShowPayboostModal(false)}
          onConfirm={handleSchedulePayboost}
          boostPercent={(dashboardData.featuredMission.mission.rewardValueData?.percent as number) || dashboardData.featuredMission.mission.rewardAmount || 0}
          durationDays={(dashboardData.featuredMission.mission.rewardValueData?.duration_days as number) || 30}
        />
      )}

      {/* Physical Gift Claim Modal - NOTE: snake_case → camelCase transformation */}
      {dashboardData.featuredMission.mission && (
        <ClaimPhysicalGiftModal
          open={showPhysicalGiftModal}
          onOpenChange={(open) => setShowPhysicalGiftModal(open)}
          reward={{
            id: dashboardData.featuredMission.mission.progressId || '',
            displayName: dashboardData.featuredMission.mission.rewardCustomText || 'Physical Gift',
            rewardType: 'physical_gift',
            valueData: {
              // Transform snake_case (from DB) to camelCase (for modal interface)
              requiresSize: (dashboardData.featuredMission.mission.rewardValueData?.requires_size as boolean) || false,
              sizeCategory: (dashboardData.featuredMission.mission.rewardValueData?.size_category as string) || undefined,
              sizeOptions: (dashboardData.featuredMission.mission.rewardValueData?.size_options as string[]) || [],
            },
          }}
          onSuccess={() => {
            toast.success("Reward claimed! Check Missions tab for shipping updates", { duration: 5000 })
            // Delay reload so user can see success message
            setTimeout(() => window.location.reload(), 1500)
          }}
        />
      )}
    </>
  )
}
