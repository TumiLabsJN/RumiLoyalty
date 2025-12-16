"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { Reward } from "@/types/dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, DollarSign, Video, Eye, Heart, MessageCircle, Trophy, HandCoins, Megaphone, Gift, BadgePercent, Palmtree, Info, ArrowLeft, X, Loader2 } from "lucide-react"
import { HomePageLayout } from "@/components/homepagelayout"
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Dashboard response type (matches DASHBOARD_IMPL.md lines 634-654)
interface DashboardData {
  user: { id: string; handle: string; email: string | null; clientName: string };
  client: { id: string; vipMetric: 'sales' | 'units'; vipMetricLabel: string };
  currentTier: { id: string; name: string; color: string; order: number; checkpointExempt: boolean };
  nextTier: { id: string; name: string; color: string; minSalesThreshold: number } | null;
  tierProgress: {
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string;
    targetFormatted: string;
    checkpointExpiresAt: string | null;
    checkpointExpiresFormatted: string;
    checkpointMonths: number;
  };
  featuredMission: {
    status: string;
    mission: {
      id: string;
      type: string;
      displayName: string;
      currentProgress: number;
      targetValue: number;
      progressPercentage: number;
      currentFormatted: string;
      targetFormatted: string;
      targetText: string;
      progressText: string;
      isRaffle: boolean;
      raffleEndDate: string | null;
      rewardType: string;
      rewardAmount: number | null;
      rewardCustomText: string | null;
      rewardDisplayText: string;
    } | null;
    tier: { name: string; color: string } | null;
    showCongratsModal: boolean;
    congratsMessage: string | null;
    supportEmail: string;
    emptyStateMessage: string | null;
  };
  currentTierRewards: Array<{
    id: string;
    type: string;
    name: string;
    displayText: string;
    description: string;
    valueData: Record<string, unknown> | null;
    rewardSource: string;
    redemptionQuantity: number;
    displayOrder: number;
  }>;
  totalRewardsCount: number;
}

export default function Home() {
  const router = useRouter()

  // ============================================
  // DATA FETCHING - Real API Call
  // ============================================
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEnteringRaffle, setIsEnteringRaffle] = useState(false)

  // Fetch dashboard data - extracted for retry capability
  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard', {
        credentials: 'include', // Include auth cookie
      })

      // Handle 401 - redirect to login
      if (response.status === 401) {
        router.push('/login/start')
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.status}`)
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

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

  // Loading state - show spinner while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center space-y-6">
          <Loader2 className="h-16 w-16 text-pink-600 animate-spin" />
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Loading your dashboard...</h1>
            <p className="text-sm text-slate-600">This will only take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state - show error message with retry button
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
            onClick={() => fetchDashboard()}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Dashboard data is guaranteed to be defined here (loading/error states return early)
  const mockData = dashboardData!

  /**
   * CURRENT TIER REWARDS (from backend API)
   * Backend endpoint: GET /api/dashboard
   * Returns pre-sorted, pre-limited rewards (top 4) for user's current tier
   */

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

  // Backend already sorts by display_order and limits to 4 rewards (API_CONTRACTS.md lines 1026-1051)
  // Just use the data directly - no client-side sorting or limiting needed
  const displayedRewards = mockData.currentTierRewards
  const hasMoreRewards = mockData.totalRewardsCount > 4

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

  // Backend provides pre-formatted displayText - no manual formatting needed
  // REMOVED: formatClaimButtonText() function (was lines 644-667)
  // Will use mission.progressText and reward displayText from API response

  // ============================================
  // CLAIM HANDLERS
  // ============================================

  const handleClaimReward = () => {
    const mission = mockData.featuredMission.mission
    if (!mission) return

    // If discount type, open scheduling modal
    if (mission.rewardType === "discount") {
      setShowScheduleModal(true)
      return
    }

    // For other reward types, claim immediately
    console.log("[v0] Claim reward clicked:", mission.rewardType, mission.rewardAmount || mission.rewardCustomText)
    // TODO: POST /api/missions/:id/claim (instant claim)
  }

  const handleEnterRaffle = async () => {
    if (!mockData?.featuredMission.mission?.id) return;

    setIsEnteringRaffle(true);
    try {
      const response = await fetch(
        `/api/missions/${mockData.featuredMission.mission.id}/participate`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("You're in! Check Missions tab for updates");
          await fetchDashboard();
        }
      } else {
        const error = await response.json();
        toast.error(error.message || "Entry failed. Please try again");
      }
    } catch (error) {
      console.error('Raffle entry error:', error);
      toast.error("Something went wrong. Please try again");
    } finally {
      setIsEnteringRaffle(false);
    }
  };

  const handleScheduleDiscount = async (scheduledDate: Date) => {
    console.log("[v0] Schedule discount for:", scheduledDate.toISOString())

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
  const missionProgressPercentage = mockData.featuredMission.mission?.progressPercentage || 0

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
            <span className={cn(
              "font-bold text-slate-900",
              mockData.featuredMission.mission?.isRaffle ? "text-xl" : "text-3xl"
            )}>
              {mockData.featuredMission.mission?.currentFormatted || ""}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {mockData.featuredMission.mission?.targetText || ""}
            </span>
          </div>
        </div>

        {/* Subtitle - Reward display (button if claimable, raffle entry, or reward name if in progress) */}
        {mockData.featuredMission.status === "completed" ? (
          <Button
            onClick={handleClaimReward}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-full shadow-md flex items-center gap-2"
          >
            {getIconForBenefitType(mockData.featuredMission.mission?.rewardType || "gift_card")}
            {mockData.featuredMission.mission?.rewardDisplayText}
          </Button>
        ) : mockData.featuredMission.status === "raffle_available" ? (
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
              {mockData.featuredMission.mission?.rewardDisplayText}
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
                {/* Title with gradient ribbon - shows "Unlock [NextTier]" or "You're at the Top!" */}
                <div className="relative inline-block">
                  <div
                    className="absolute inset-0 opacity-20 blur-sm rounded-lg -z-10"
                    style={{
                      background: `linear-gradient(135deg, ${mockData.nextTier?.color || currentTierColor}, ${mockData.nextTier?.color || currentTierColor}80)`,
                      transform: 'scale(1.1)',
                    }}
                  />
                  <h3
                    className="text-base font-bold text-slate-900 px-3 py-1 relative"
                    style={{
                      background: `linear-gradient(135deg, ${mockData.nextTier?.color || currentTierColor}15, ${mockData.nextTier?.color || currentTierColor}25)`,
                      borderRadius: '0.5rem',
                      boxShadow: `0 0 15px ${mockData.nextTier?.color || currentTierColor}40`,
                    }}
                  >
                    {mockData.nextTier ? `Unlock ${mockData.nextTier.name}` : "You're at the Top!"}
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
                  {!mockData.currentTier.checkpointExempt && (
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
        discountPercent={mockData.featuredMission.mission?.rewardAmount || 0}
        durationDays={30}
      />
    </>
  )
}
