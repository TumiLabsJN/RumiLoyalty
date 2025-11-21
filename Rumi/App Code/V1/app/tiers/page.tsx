"use client"
  import { useState } from "react"
  import * as React from "react"
  import { Card, CardContent } from "@/components/ui/card"
  import { Button } from "@/components/ui/button"
  import { cn } from "@/lib/utils"
  import {
    Trophy,
    Lock,
    TrendingUp,
    Video,
    Heart,
    Eye,
    Ticket,
    Gift,
    HandCoins,
    Megaphone,
    BadgePercent,
    Clover,
    Info,
    ArrowLeft,
    X,
  } from "lucide-react"
  import { PageLayout } from "@/components/pagelayout"

  export default function TiersPage() {
    const [activeScenario, setActiveScenario] = useState("scenario-1")
    const [debugPanelOpen, setDebugPanelOpen] = useState(false)
    const [isProgressCardFlipped, setIsProgressCardFlipped] = useState(false)

    // Test scenarios
    const scenarios = {
      "scenario-1": {
        name: "Test 1: Bronze User (4 levels)",
        currentTier: "Bronze",
        currentSales: 320,
        expirationDate: "June 30, 2025",
        tiers: [
        {
          name: "Bronze",
          color: "#CD7F32",
          minSales: 0,
          tierLevel: 1,
          isUnlocked: true,
          isCurrent: true,
          commissionRate: 10, // Dynamic commission percentage for this tier
          rewards: [
            { type: "gift_card", value: "$25", uses: 2 },
            { type: "commission_boost", value: "5%", uses: 1 },
            { type: "spark_ads", value: "$30", uses: 1 },
            { type: "discount", value: "5%", uses: 1 },
          ],
          missions: [
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$25 Gift Card", uses: 2 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "5% Discount", uses: 1 },
            { name: "Eyes on You", missionType: "views", rewardValue: "$30 Spark Ads", uses: 1 },
          ],
        },
        {
          name: "Silver",
          color: "#94a3b8",
          minSales: 1000,
          tierLevel: 2,
          isUnlocked: false,
          commissionRate: 12, // Dynamic commission percentage for this tier
          rewards: [
            { type: "physical_gift", name: "AirPods", isRaffle: true, uses: 1 },
            { type: "physical_gift", name: "Gift Drop: Branded Water Bottle", uses: 1 },
            { type: "gift_card", value: "$40", uses: 2 },
            { type: "commission_boost", value: "8%", uses: 3 },
            { type: "spark_ads", value: "$60", uses: 2 },
            { type: "discount", value: "10%", uses: 1 },
          ],
          missions: [
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$40 Gift Card", uses: 2 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "8% Pay Boost", uses: 3 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "Branded Water Bottle", uses: 1 },
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "AirPods", uses: 1 },
          ],
        },
        {
          name: "Gold",
          color: "#F59E0B",
          minSales: 3000,
          tierLevel: 3,
          isUnlocked: false,
          commissionRate: 15, // Dynamic commission percentage for this tier
          rewards: [
            { type: "experience", name: "Mystery Trip", isRaffle: true, uses: 1 },
            { type: "physical_gift", name: "Premium Headphones", isRaffle: true, uses: 1 },
            { type: "physical_gift", name: "Gift Drop: Designer Backpack", uses: 1 },
            { type: "gift_card", value: "$75", uses: 4 },
            { type: "commission_boost", value: "12%", uses: 4 },
            { type: "spark_ads", value: "$120", uses: 3 },
            { type: "discount", value: "15%", uses: 3 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Mystery Trip", uses: 1 },
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Premium Headphones", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$75 Gift Card", uses: 4 },
            { name: "Eyes on You", missionType: "views", rewardValue: "12% Pay Boost", uses: 4 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "15% Deal Boost", uses: 3 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$120 Ads Boost", uses: 3 },
          ],
        },
        {
          name: "Platinum",
          color: "#818CF8",
          minSales: 5000,
          tierLevel: 4,
          isUnlocked: false,
          commissionRate: 20, // Dynamic commission percentage for this tier
          rewards: [
            { type: "physical_gift", name: "MacBook Pro", isRaffle: true, uses: 1 },
            { type: "experience", name: "Brand Partner Trip", isRaffle: true, uses: 1 },
            { type: "experience", name: "VIP Event Access", uses: 1 },
            { type: "physical_gift", name: "Gift Drop: Designer Bag", uses: 1 },
            { type: "gift_card", value: "$150", uses: 6 },
            { type: "commission_boost", value: "20%", uses: 10 },
            { type: "spark_ads", value: "$250", uses: 6 },
            { type: "discount", value: "25%", uses: 5 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "MacBook Pro", uses: 1 },
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Brand Partner Trip", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$150 Gift Card", uses: 6 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "20% Pay Boost", uses: 10 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "$250 Ads Boost", uses: 6 },
            { name: "Eyes on You", missionType: "views", rewardValue: "25% Deal Boost", uses: 5 },
          ],
        },
      ],
    },
    "scenario-2": {
      name: "Test 2: Silver User (4 levels)",
      currentTier: "Silver",
      currentSales: 2100,
      expirationDate: "August 10, 2025",
      tiers: [
        {
          name: "Bronze",
          color: "#CD7F32",
          minSales: 0,
          tierLevel: 1,
          isUnlocked: true,
          commissionRate: 10, // Dynamic commission percentage for this tier
          rewards: [
            { type: "gift_card", value: "$20", uses: 1 },
            { type: "spark_ads", value: "$40", uses: 2 },
          ],
          missions: [
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$20 Gift Card", uses: 1 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$40 Spark Ads", uses: 2 },
          ],
        },
        {
          name: "Silver",
          color: "#94a3b8",
          minSales: 1000,
          tierLevel: 2,
          isUnlocked: true,
          isCurrent: true,
          commissionRate: 12, // Dynamic commission percentage for this tier
          rewards: [
            { type: "gift_card", value: "$60", uses: 3 },
            { type: "commission_boost", value: "10%", uses: 4 },
            { type: "spark_ads", value: "$80", uses: 2 },
            { type: "discount", value: "12%", uses: 2 },
          ],
          missions: [
            { name: "Eyes on You", missionType: "views", rewardValue: "12% Deal Boost", uses: 2 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "10% Pay Boost", uses: 4 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$60 Gift Card", uses: 3 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$80 Ads Boost", uses: 2 },
          ],
        },
        {
          name: "Gold",
          color: "#F59E0B",
          minSales: 3000,
          tierLevel: 3,
          isUnlocked: false,
          commissionRate: 15, // Dynamic commission percentage for this tier
          rewards: [
            { type: "physical_gift", name: "Smartwatch", isRaffle: true, uses: 1 },
            { type: "physical_gift", name: "Gift Drop: Premium Backpack", uses: 1 },
            { type: "gift_card", value: "$100", uses: 5 },
            { type: "commission_boost", value: "15%", uses: 5 },
            { type: "spark_ads", value: "$150", uses: 4 },
            { type: "discount", value: "18%", uses: 4 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Smartwatch", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$100 Gift Card", uses: 5 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "15% Pay Boost", uses: 5 },
            { name: "Eyes on You", missionType: "views", rewardValue: "18% Deal Boost", uses: 4 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$150 Ads Boost", uses: 4 },
          ],
        },
        {
          name: "Platinum",
          color: "#818CF8",
          minSales: 5000,
          tierLevel: 4,
          isUnlocked: false,
          commissionRate: 20, // Dynamic commission percentage for this tier
          rewards: [
            { type: "experience", name: "Creator Retreat", isRaffle: true, uses: 1 },
            { type: "physical_gift", name: "Laptop", isRaffle: true, uses: 1 },
            { type: "experience", name: "VIP Brand Event", uses: 1 },
            { type: "gift_card", value: "$200", uses: 8 },
            { type: "commission_boost", value: "25%", uses: 12 },
            { type: "spark_ads", value: "$300", uses: 8 },
            { type: "discount", value: "30%", uses: 6 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Creator Retreat", uses: 1 },
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Laptop", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$200 Gift Card", uses: 8 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "25% Pay Boost", uses: 12 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "$300 Ads Boost", uses: 8 },
            { name: "Eyes on You", missionType: "views", rewardValue: "30% Deal Boost", uses: 6 },
          ],
        },
      ],
    },
  }

    // Get current scenario data
    const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
    const mockData = {
      currentTier: currentScenario.currentTier,
      currentSales: currentScenario.currentSales,
      expirationDate: currentScenario.expirationDate,
      tiers: currentScenario.tiers,
    }

    const formatCurrency = (num: number): string => {
      return `${num.toLocaleString()}`
    }

    // Custom Gift Drop SVG icon (matches Rewards page)
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

    // Get icon for reward type - standardized icons for all reward types
    const getRewardIcon = (type: string, isUnlocked: boolean, isRaffle: boolean = false) => {
      const iconClass = `h-5 w-5 ${isUnlocked ? "text-slate-700" : "text-slate-400"}`

      // Raffle-tied rewards (physical_gift or experience) use Clover icon
      if (isRaffle && (type === "physical_gift" || type === "experience")) {
        return <Clover className={iconClass} />
      }

      switch (type) {
        case "gift_card":
          return <Gift className={iconClass} />
        case "commission_boost":
          return <HandCoins className={iconClass} />
        case "spark_ads":
          return <Megaphone className={iconClass} />
        case "discount":
          return <BadgePercent className={iconClass} />
        case "physical_gift":
          return <GiftDropIcon className={iconClass} />
        case "experience":
          return <GiftDropIcon className={iconClass} /> // Experience uses same icon as physical_gift
        default:
          return <Gift className={iconClass} />
      }
    }

    // Get icon for mission type (matches Missions page)
    const getMissionIcon = (missionType: string, isUnlocked: boolean) => {
      const iconClass = `h-5 w-5 ${isUnlocked ? "text-slate-700" : "text-slate-400"}`

      switch (missionType) {
        case "sales":
          return <TrendingUp className={iconClass} />
        case "videos":
          return <Video className={iconClass} />
        case "likes":
          return <Heart className={iconClass} />
        case "views":
          return <Eye className={iconClass} />
        case "raffle":
          return <Ticket className={iconClass} />
        default:
          return <TrendingUp className={iconClass} />
      }
    }

    // Calculate total rewards count for a tier
    // Includes: sum of all reward uses + mission rewards
    // Example: Silver with 7 rewards + 7 missions (each with reward) = 14 total
    // NOTE: If rewards are monthly, each month counts (e.g., 2 spark ads/month = 2 rewards)
    const getTotalRewardsCount = (rewards: any[], missions: any[]) => {
      const rewardsCount = rewards.reduce((sum, reward) => sum + reward.uses, 0)
      const missionsCount = missions ? missions.reduce((sum, mission) => sum + (mission.uses || 1), 0) : 0
      return rewardsCount + missionsCount
    }

    // Get formatted reward list in priority order with proper display text
    const getFormattedRewards = (rewards: any[]) => {
      // Priority order: raffle rewards first, then regular rewards
      // 1) physical_gift (raffle), 2) experience (raffle), 3) experience, 4) physical_gift, 5) gift_card, 6) commission_boost, 7) spark_ads, 8) discount
      const priorityOrder = [
        "physical_gift_raffle",
        "experience_raffle",
        "experience",
        "physical_gift",
        "gift_card",
        "commission_boost",
        "spark_ads",
        "discount"
      ]

      const sortedRewards = [...rewards].sort((a, b) => {
        const aKey = a.isRaffle ? `${a.type}_raffle` : a.type
        const bKey = b.isRaffle ? `${b.type}_raffle` : b.type
        return priorityOrder.indexOf(aKey) - priorityOrder.indexOf(bKey)
      })

      // MAX DISPLAY: Show only first 4 rewards
      const displayRewards = sortedRewards.slice(0, 4)

      return displayRewards.map((reward) => {
        let displayName = ""

        // Display text rules based on reward type and whether it's tied to raffle
        if (reward.isRaffle) {
          // Raffle-tied rewards: "Chance to win {description}"
          if (reward.type === "physical_gift") {
            displayName = `Chance to win ${reward.name || reward.description || "Prize"}!`
          } else if (reward.type === "experience") {
            displayName = `Chance to win ${reward.name || reward.description || "Experience"}!`
          }
        } else {
          // Regular rewards with proper formatting
          switch (reward.type) {
            case "experience":
              // Experience: rewards.description
              displayName = reward.name || reward.description || "Experience"
              break
            case "physical_gift":
              // Physical gift: "Gift Drop: {value_data.name}"
              displayName = reward.name || "Physical Gift"
              break
            case "gift_card":
              // Gift card: "{count}x ${amount} Gift Card" from GET /api/rewards name field
              displayName = reward.uses > 1 ? `${reward.uses}x ${reward.value || ""} Gift Card` : `${reward.value || ""} Gift Card`
              break
            case "commission_boost":
              // Commission boost: "{count}x {percent}% Pay Boost" from GET /api/rewards name field
              displayName = reward.uses > 1 ? `${reward.uses}x ${reward.value} Pay Boost` : `${reward.value} Pay Boost`
              break
            case "spark_ads":
              // Spark ads: "{count}x ${amount} Ads Boost" from GET /api/rewards displayText field
              displayName = reward.uses > 1 ? `${reward.uses}x ${reward.value} Ads Boost` : `${reward.value} Ads Boost`
              break
            case "discount":
              // Discount: "{count}x {percent}% Deal Boost" from GET /api/rewards name field
              displayName = reward.uses > 1 ? `${reward.uses}x ${reward.value} Deal Boost` : `${reward.value} Deal Boost`
              break
          }
        }

        return {
          display: displayName,
          type: reward.type,
          isRaffle: reward.isRaffle || false,
        }
      })
    }

    // Get current tier details - color and level are dynamic based on user's current VIP tier
    const currentTierData = mockData.tiers.find(t => t.isCurrent)
    const currentTierLevel = currentTierData?.tierLevel || 1
    const currentTierColor = currentTierData?.color || "#CD7F32" // Dynamic: matches the tier's color (Bronze, Silver, Gold, Platinum)

    // Get next tier for progress tracking - dynamic based on what tier comes after current
    const nextTierData = mockData.tiers.find(t => t.tierLevel === currentTierLevel + 1)
    const nextTierName = nextTierData?.name || "Next Level"
    const nextTierTarget = nextTierData?.minSales || 5000

    // Calculate progress to next tier - dynamic based on current sales vs next tier requirement
    const progressToNext = nextTierTarget - mockData.currentSales
    const progressPercentage = (mockData.currentSales / nextTierTarget) * 100

    // First VIP level (tierLevel === 1) NEVER expires, so we hide expiration text for Bronze
    const showExpirationDate = currentTierLevel > 1

    // Filter and sort tiers: Show current tier first, then all higher tiers
    const displayTiers = mockData.tiers
      .filter(tier => tier.tierLevel >= currentTierLevel) // Only show current and higher tiers
      .sort((a, b) => a.tierLevel - b.tierLevel) // Sort ascending by tier level

    return (
      <>
        {/* Toggle Button - Always Visible */}
        <button
          onClick={() => setDebugPanelOpen(!debugPanelOpen)}
          className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
          aria-label="Toggle test scenarios"
        >
          🧪
        </button>

        {/* Collapsible Panel */}
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
                  <span className="font-semibold truncate w-full">
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

        {/* Original page content */}
        <PageLayout
          title="Tiers"
          headerContent={
            <p className="text-lg text-white/90">Program Benefits</p>
          }
        >
        {/* Your Progress Card - FLIPPABLE CARD */}
        {/* DYNAMIC: This entire card is dynamic to the user's current VIP level */}
        {/* Shows: current tier badge, sales progress, next tier target, progress bar, expiration (if tierLevel > 1) */}
        <div className="relative w-full" style={{ perspective: '1000px' }}>
          <div
            className="relative w-full transition-transform duration-600 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isProgressCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT SIDE */}
            <div style={{ backfaceVisibility: 'hidden' }}>
              <Card className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-sm border-slate-200">
                <CardContent className="px-6 py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">Your Progress</h3>
                    {/* Dynamic tier badge - color and name match current VIP tier */}
                    <div
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                      style={{
                        backgroundColor: `${currentTierColor}15`,
                        borderColor: `${currentTierColor}40`
                      }}
                    >
                      <Trophy className="h-4 w-4" style={{ color: currentTierColor }} />
                      <span className="text-sm font-semibold text-slate-900">{mockData.currentTier}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Dynamic sales value - displays creator's current sales with $ prefix */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">${formatCurrency(mockData.currentSales)}</span>
                    </div>

                    {/* Progress to next tier - all values are dynamic */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        {/* Dynamic next tier name (e.g., Silver, Gold, Platinum) */}
                        <span className="text-slate-600">Progress to {nextTierName}</span>
                        {/* Dynamic amount remaining - compatible with sales count or sales dollar value */}
                        <span className="font-semibold text-slate-900">
                          ${formatCurrency(progressToNext)} to go
                        </span>
                      </div>
                      {/* Dynamic progress bar - percentage based on current sales vs next tier target */}
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPercentage}%`,
                            backgroundColor: currentTierColor // Progress bar color matches current tier
                          }}
                        />
                      </div>

                      {/* Expiration text with Info icon - ONLY shown for tierLevel > 1 (Bronze never expires) */}
                      {showExpirationDate && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <p className="text-xs text-slate-600">
                            {mockData.currentTier} Expires on {mockData.expirationDate}
                          </p>
                          <Info
                            className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors flex-shrink-0"
                            onClick={() => setIsProgressCardFlipped(true)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* BACK SIDE - Only shown when tier has expiration (tierLevel > 1) */}
            {showExpirationDate && (
              <div
                className="absolute inset-0 cursor-pointer"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
                onClick={() => setIsProgressCardFlipped(false)}
              >
                <Card className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-sm border-slate-200 h-full">
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
                        Your <span className="font-semibold">{mockData.currentTier}</span> Level renews every <span className="font-semibold">6</span> months based on sales.
                      </p>
                      <p className="text-sm text-slate-600 font-medium">
                        Keep selling to earn more rewards! 🚀
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Tier Cards - Individual cards for each VIP tier (Bronze, Silver, Gold, Platinum) */}
        {/* DYNAMIC: These cards are generated based on user's current VIP level - shows current tier + all higher tiers */}
        {/* LOCKED CARDS: Every locked VIP level displays as a locked card (opacity-75, Lock icon, "Locked" badge) */}
        <div className="space-y-3">
          <div className="space-y-3">
            {displayTiers.map((tier) => {
              const formattedRewards = getFormattedRewards(tier.rewards)
              // DYNAMIC: Total rewards count = sum of all reward uses + mission rewards
              // Example: If Silver has 7 rewards + 7 missions (each with reward) = Tier Perks (14)
              // NOTE: If rewards are monthly, each month counts (e.g., 2 spark ads/month = 2 rewards)
              const totalRewardsCount = getTotalRewardsCount(tier.rewards, tier.missions || [])

              return (
                <Card
                  key={tier.name}
                  className={`rounded-xl shadow-sm transition-all ${
                    tier.isCurrent
                      ? "bg-gradient-to-br from-slate-50 to-white border-2 border-blue-600"
                      : tier.isUnlocked
                        ? "bg-white border-slate-200"
                        : "bg-slate-50 border-slate-200 opacity-75"
                  }`}
                >
                  <CardContent className="px-6 pt-5 pb-3 space-y-4">
                    {/* Tier Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* DYNAMIC: Trophy icon color matches VIP tier color (Bronze: #CD7F32, Silver: #94a3b8, Gold: #F59E0B, Platinum: #818CF8) */}
                        {/* DYNAMIC: Shows Lock icon for locked tiers, Trophy for unlocked tiers */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${tier.color}20`, border: `2px solid ${tier.color}` }}
                        >
                          {tier.isUnlocked ? (
                            <Trophy className="h-6 w-6" style={{ color: tier.color }} />
                          ) : (
                            <Lock className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          {/* DYNAMIC: Tier name (Bronze, Silver, Gold, Platinum) */}
                          <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                          {/* DYNAMIC: Minimum sales required for this VIP level */}
                          {/* DYNAMIC: Text changes based on VIP system metric - "in sales" for dollar value, "in units sold" for unit count */}
                          <p className="text-sm text-slate-600">${formatCurrency(tier.minSales)}+ in sales</p>
                        </div>
                      </div>

                      {tier.isCurrent && (
                        <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                          Current Tier
                        </div>
                      )}

                      {!tier.isUnlocked && (
                        <div className="bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </div>
                      )}
                    </div>

                    {/* DYNAMIC: Commission Rate - percentage varies by VIP level (Bronze: 10%, Silver: 12%, Gold: 15%, Platinum: 20%) */}
                    <p className="text-base font-semibold text-slate-700 -mt-2">
                      {tier.commissionRate}% Commission on sales
                    </p>

                    {/* Benefits Section */}
                    <div className="space-y-2">
                      {/* DYNAMIC: Tier Perks count includes ALL rewards for this VIP level */}
                      {/* Count = sum of reward uses + mission rewards. Monthly rewards counted per month (2 ads/month = 2 rewards) */}
                      {/* Example: Silver with 7 rewards + 7 missions = Tier Perks (14) */}
                      <p className="text-sm font-semibold text-slate-900">
                        Tier Perks ({totalRewardsCount})
                      </p>
                      {/* DYNAMIC: Rewards list with priority ranking and display rules */}
                      {/* MAX DISPLAY: Show maximum 4 rewards per card */}
                      {/* PRIORITY ORDER: 1) physical_gift (raffle), 2) experience (raffle), 3) experience, 4) physical_gift, 5) gift_card, 6) commission_boost, 7) spark_ads, 8) discount */}
                      {/* DISPLAY TEXT RULES by type:
                          - physical_gift (raffle mission): "Chance to win {rewards.description}" (e.g., "Chance to win AirPods!")
                          - experience (raffle mission): "Chance to win {rewards.description}" (e.g., "Chance to win Mystery Trip!")
                          - experience: rewards.description (e.g., "Mystery Trip")
                          - physical_gift: "Gift Drop: {value_data.name}" from value_data.display_text JSONB (e.g., "Gift Drop: Brand Gear")
                          - gift_card: "{count}x ${amount} Gift Card" from GET /api/rewards name field
                          - commission_boost: "{count}x {percent}% Pay Boost" from GET /api/rewards name field
                          - spark_ads: "{count}x ${amount} Ads Boost" from GET /api/rewards displayText field
                          - discount: "{count}x {percent}% Deal Boost" from GET /api/rewards name field
                      */}
                      {/* COUNT CALCULATION: Sum total rewards per type across tier (e.g., "3x Gift Card" if tier has 3 gift card rewards) */}
                      <div className="space-y-1">
                        {formattedRewards.map((reward, index) => (
                          <div key={index} className="flex items-center gap-2 pl-2">
                            {getRewardIcon(reward.type, tier.isUnlocked, reward.isRaffle)}
                            <span
                              className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}
                            >
                              {reward.display}
                            </span>
                          </div>
                        ))}
                        <p className="text-sm text-slate-500 italic mb-0">... and more!</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </PageLayout>
      </>
    )
  }
