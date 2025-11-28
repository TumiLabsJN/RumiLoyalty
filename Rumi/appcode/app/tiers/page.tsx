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
  import type { TiersPageResponse, TierCard, AggregatedReward } from "@/app/types/tiers"

  export default function TiersPage() {
    const [activeScenario, setActiveScenario] = useState("scenario-1")
    const [debugPanelOpen, setDebugPanelOpen] = useState(false)
    const [isProgressCardFlipped, setIsProgressCardFlipped] = useState(false)

    // Test scenarios
    interface TestScenario {
      name: string
      mockData: TiersPageResponse
    }

    const scenarios: Record<string, TestScenario> = {
      "scenario-1": {
        name: "Test 1: Bronze User (4 levels)",
        mockData: {
          user: {
            id: "user123",
            currentTier: "tier_1",
            currentTierName: "Bronze",
            currentTierColor: "#CD7F32",
            currentSales: 320,
            currentSalesFormatted: "$320",
            expirationDate: null,
            expirationDateFormatted: null,
            showExpiration: false
          },
          progress: {
            nextTierName: "Silver",
            nextTierTarget: 1000,
            nextTierTargetFormatted: "$1,000",
            amountRemaining: 680,
            amountRemainingFormatted: "$680",
            progressPercentage: 32,
            progressText: "$680 to go"
          },
          vipSystem: {
            metric: "sales_dollars"
          },
          tiers: [
        {
          name: "Bronze",
          color: "#CD7F32",
          tierLevel: 1,
          minSales: 0,
          minSalesFormatted: "$0",
          salesDisplayText: "$0+ in sales",
          commissionRate: 10,
          commissionDisplayText: "10% Commission on sales",
          isUnlocked: true,
          isCurrent: true,
          totalPerksCount: 9,
          rewards: [
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$25 Gift Card",
              count: 2,
              sortPriority: 6
            },
            {
              type: "commission_boost",
              isRaffle: false,
              displayText: "5% Pay Boost",
              count: 1,
              sortPriority: 7
            },
            {
              type: "spark_ads",
              isRaffle: false,
              displayText: "$30 Ads Boost",
              count: 1,
              sortPriority: 8
            },
            {
              type: "discount",
              isRaffle: false,
              displayText: "5% Deal Boost",
              count: 1,
              sortPriority: 9
            }
          ]
        },
        {
          name: "Silver",
          color: "#94a3b8",
          tierLevel: 2,
          minSales: 1000,
          minSalesFormatted: "$1,000",
          salesDisplayText: "$1,000+ in sales",
          commissionRate: 12,
          commissionDisplayText: "12% Commission on sales",
          isUnlocked: false,
          isCurrent: false,
          totalPerksCount: 17,
          rewards: [
            {
              type: "physical_gift",
              isRaffle: true,
              displayText: "Chance to win AirPods!",
              count: 1,
              sortPriority: 1
            },
            {
              type: "physical_gift",
              isRaffle: false,
              displayText: "Gift Drop: Branded Water Bottle",
              count: 1,
              sortPriority: 5
            },
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$40 Gift Card",
              count: 2,
              sortPriority: 6
            },
            {
              type: "commission_boost",
              isRaffle: false,
              displayText: "8% Pay Boost",
              count: 3,
              sortPriority: 7
            }
          ]
        },
        {
          name: "Gold",
          color: "#F59E0B",
          tierLevel: 3,
          minSales: 3000,
          minSalesFormatted: "$3,000",
          salesDisplayText: "$3,000+ in sales",
          commissionRate: 15,
          commissionDisplayText: "15% Commission on sales",
          isUnlocked: false,
          isCurrent: false,
          totalPerksCount: 33,
          rewards: [
            {
              type: "experience",
              isRaffle: true,
              displayText: "Chance to win Mystery Trip!",
              count: 1,
              sortPriority: 2
            },
            {
              type: "physical_gift",
              isRaffle: true,
              displayText: "Chance to win Premium Headphones!",
              count: 1,
              sortPriority: 1
            },
            {
              type: "physical_gift",
              isRaffle: false,
              displayText: "Gift Drop: Designer Backpack",
              count: 1,
              sortPriority: 5
            },
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$75 Gift Card",
              count: 4,
              sortPriority: 6
            }
          ]
        },
        {
          name: "Platinum",
          color: "#818CF8",
          tierLevel: 4,
          minSales: 5000,
          minSalesFormatted: "$5,000",
          salesDisplayText: "$5,000+ in sales",
          commissionRate: 20,
          commissionDisplayText: "20% Commission on sales",
          isUnlocked: false,
          isCurrent: false,
          totalPerksCount: 60,
          rewards: [
            {
              type: "physical_gift",
              isRaffle: true,
              displayText: "Chance to win MacBook Pro!",
              count: 1,
              sortPriority: 1
            },
            {
              type: "experience",
              isRaffle: true,
              displayText: "Chance to win Brand Partner Trip!",
              count: 1,
              sortPriority: 2
            },
            {
              type: "experience",
              isRaffle: false,
              displayText: "VIP Event Access",
              count: 1,
              sortPriority: 4
            },
            {
              type: "physical_gift",
              isRaffle: false,
              displayText: "Gift Drop: Designer Bag",
              count: 1,
              sortPriority: 5
            }
          ]
        }
      ]
        }
    },
    "scenario-2": {
      name: "Test 2: Silver User (4 levels)",
      mockData: {
        user: {
          id: "user456",
          currentTier: "tier_2",
          currentTierName: "Silver",
          currentTierColor: "#94a3b8",
          currentSales: 2100,
          currentSalesFormatted: "$2,100",
          expirationDate: "2025-08-10T00:00:00Z",
          expirationDateFormatted: "August 10, 2025",
          showExpiration: true
        },
        progress: {
          nextTierName: "Gold",
          nextTierTarget: 3000,
          nextTierTargetFormatted: "$3,000",
          amountRemaining: 900,
          amountRemainingFormatted: "$900",
          progressPercentage: 70,
          progressText: "$900 to go"
        },
        vipSystem: {
          metric: "sales_dollars"
        },
        tiers: [
        {
          name: "Bronze",
          color: "#CD7F32",
          tierLevel: 1,
          minSales: 0,
          minSalesFormatted: "$0",
          salesDisplayText: "$0+ in sales",
          commissionRate: 10,
          commissionDisplayText: "10% Commission on sales",
          isUnlocked: true,
          isCurrent: false,
          totalPerksCount: 6,
          rewards: [
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$20 Gift Card",
              count: 1,
              sortPriority: 6
            },
            {
              type: "spark_ads",
              isRaffle: false,
              displayText: "$40 Ads Boost",
              count: 2,
              sortPriority: 8
            }
          ]
        },
        {
          name: "Silver",
          color: "#94a3b8",
          tierLevel: 2,
          minSales: 1000,
          minSalesFormatted: "$1,000",
          salesDisplayText: "$1,000+ in sales",
          commissionRate: 12,
          commissionDisplayText: "12% Commission on sales",
          isUnlocked: true,
          isCurrent: true,
          totalPerksCount: 22,
          rewards: [
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$60 Gift Card",
              count: 3,
              sortPriority: 6
            },
            {
              type: "commission_boost",
              isRaffle: false,
              displayText: "10% Pay Boost",
              count: 4,
              sortPriority: 7
            },
            {
              type: "spark_ads",
              isRaffle: false,
              displayText: "$80 Ads Boost",
              count: 2,
              sortPriority: 8
            },
            {
              type: "discount",
              isRaffle: false,
              displayText: "12% Deal Boost",
              count: 2,
              sortPriority: 9
            }
          ]
        },
        {
          name: "Gold",
          color: "#F59E0B",
          tierLevel: 3,
          minSales: 3000,
          minSalesFormatted: "$3,000",
          salesDisplayText: "$3,000+ in sales",
          commissionRate: 15,
          commissionDisplayText: "15% Commission on sales",
          isUnlocked: false,
          isCurrent: false,
          totalPerksCount: 39,
          rewards: [
            {
              type: "physical_gift",
              isRaffle: true,
              displayText: "Chance to win Smartwatch!",
              sortPriority: 1
            },
            {
              type: "physical_gift",
              isRaffle: false,
              displayText: "Gift Drop: Premium Backpack",
              sortPriority: 5
            },
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$100 Gift Card",
              count: 5,
              sortPriority: 6
            },
            {
              type: "commission_boost",
              isRaffle: false,
              displayText: "15% Pay Boost",
              count: 5,
              sortPriority: 7
            }
          ]
        },
        {
          name: "Platinum",
          color: "#818CF8",
          tierLevel: 4,
          minSales: 5000,
          minSalesFormatted: "$5,000",
          salesDisplayText: "$5,000+ in sales",
          commissionRate: 20,
          commissionDisplayText: "20% Commission on sales",
          isUnlocked: false,
          isCurrent: false,
          totalPerksCount: 73,
          rewards: [
            {
              type: "experience",
              isRaffle: true,
              displayText: "Chance to win Creator Retreat!",
              sortPriority: 2
            },
            {
              type: "physical_gift",
              isRaffle: true,
              displayText: "Chance to win Laptop!",
              sortPriority: 1
            },
            {
              type: "experience",
              isRaffle: false,
              displayText: "VIP Brand Event",
              sortPriority: 4
            },
            {
              type: "gift_card",
              isRaffle: false,
              displayText: "$200 Gift Card",
              count: 8,
              sortPriority: 6
            }
          ]
        }
      ]
        }
    }
  }

    // Get current scenario data
    const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
    const mockData: TiersPageResponse = currentScenario.mockData

    // Destructure for cleaner access
    const { user, progress, tiers: displayTiers } = mockData

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

    // Get current tier details - color and level are dynamic based on user's current VIP tier
    const currentTierData = displayTiers.find(t => t.isCurrent)
    const currentTierLevel = currentTierData?.tierLevel || 1
    const currentTierColor = user.currentTierColor // Backend provides this

    // Backend provides all progress calculations
    const { nextTierName, progressPercentage } = progress

    // Backend provides expiration flag
    const showExpirationDate = user.showExpiration

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
                      <span className="text-sm font-semibold text-slate-900">{user.currentTierName}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Dynamic sales value - displays creator's current sales with $ prefix */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-slate-900">{user.currentSalesFormatted}</span>
                    </div>

                    {/* Progress to next tier - all values are dynamic */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        {/* Dynamic next tier name (e.g., Silver, Gold, Platinum) */}
                        <span className="text-slate-600">Progress to {nextTierName}</span>
                        {/* Dynamic amount remaining - compatible with sales count or sales dollar value */}
                        <span className="font-semibold text-slate-900">
                          {progress.amountRemainingFormatted} to go
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
                            {user.currentTierName} Expires on {user.expirationDateFormatted}
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
                        Your <span className="font-semibold">{user.currentTierName}</span> Level renews every <span className="font-semibold">6</span> months based on sales.
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
              // Backend provides pre-formatted rewards and total count

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
                          <p className="text-sm text-slate-600">{tier.salesDisplayText}</p>
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
                      {tier.commissionDisplayText}
                    </p>

                    {/* Benefits Section */}
                    <div className="space-y-2">
                      {/* DYNAMIC: Tier Perks count includes ALL rewards for this VIP level */}
                      {/* Count = sum of reward uses + mission rewards. Monthly rewards counted per month (2 ads/month = 2 rewards) */}
                      {/* Example: Silver with 7 rewards + 7 missions = Tier Perks (14) */}
                      <p className="text-sm font-semibold text-slate-900">
                        Tier Perks ({tier.totalPerksCount})
                      </p>
                      {/* DYNAMIC: Rewards list with NEW mobile-friendly format */}
                      {/* NEW FORMAT: [icon] [reward name] ............ ×N */}
                      {/* MAX DISPLAY: Show maximum 4 rewards per card */}
                      {/* PRIORITY ORDER: 1) physical_gift (raffle), 2) experience (raffle), 3) experience, 4) physical_gift, 5) gift_card, 6) commission_boost, 7) spark_ads, 8) discount */}
                      {/* DISPLAY TEXT RULES by type:
                          - physical_gift (raffle): reward name (e.g., "AirPods", "Mystery Reward")
                          - experience (raffle): reward name (e.g., "Mystery Trip", "Mystery Reward")
                          - experience: reward name (e.g., "Mystery Trip", "VIP Event Access")
                          - physical_gift: clean name (e.g., "Branded Water Bottle", "Designer Backpack")
                          - gift_card: "${amount} Gift Card" (e.g., "$40 Gift Card")
                          - commission_boost: "{percent}% Pay Boost" (e.g., "8% Pay Boost")
                          - spark_ads: "${amount} Ads Boost" (e.g., "$60 Ads Boost")
                          - discount: "{percent}% Deal Boost" (e.g., "10% Deal Boost")
                      */}
                      {/* MOBILE-FRIENDLY FORMAT: [icon] Reward Name ............ ×N */}
                      <div className="space-y-1">
                        {tier.rewards.map((reward, index) => (
                          <div key={index} className="flex items-center justify-between pl-2 pr-2">
                            <div className="flex items-center gap-2">
                              {getRewardIcon(reward.type, tier.isUnlocked, reward.isRaffle)}
                              <span
                                className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}
                              >
                                {reward.displayText}
                              </span>
                            </div>
                            <span className={`text-sm font-medium ${tier.isUnlocked ? "text-slate-600" : "text-slate-400"}`}>
                              ×{reward.count}
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
