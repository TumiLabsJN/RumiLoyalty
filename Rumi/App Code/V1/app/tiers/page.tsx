"use client"
  import { Card, CardContent } from "@/components/ui/card"
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
    TicketPercent,
    Palmtree,
  } from "lucide-react"
  import { PageLayout } from "@/components/pagelayout"

  export default function TiersPage() {
    // Mock data
    const mockData = {
      currentTier: "Gold",
      currentSales: 4200,
      expirationDate: "March 15, 2025",
      tiers: [
        {
          name: "Bronze",
          color: "#CD7F32",
          minSales: 0,
          tierLevel: 1,
          isUnlocked: true,
          rewards: [
            { type: "commission_boost", value: "5%", uses: 2 },
            { type: "spark_ads", value: "$50", uses: 1 },
          ],
          missions: [
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$25 Gift Card", uses: 2 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "5% Commission Boost", uses: 1 },
          ],
        },
        {
          name: "Silver",
          color: "#94a3b8",
          minSales: 1000,
          tierLevel: 2,
          isUnlocked: true,
          rewards: [
            { type: "gift_card", value: "$50", uses: 3 },
            { type: "commission_boost", value: "7%", uses: 3 },
            { type: "discount", value: "10%", uses: 2 },
          ],
          missions: [
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$50 Gift Card", uses: 3 },
            { name: "Eyes on You", missionType: "views", rewardValue: "10% Discount", uses: 2 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$75 Spark Ads", uses: 1 },
          ],
        },
        {
          name: "Gold",
          color: "#F59E0B",
          minSales: 3000,
          tierLevel: 3,
          isUnlocked: true,
          isCurrent: true,
          rewards: [
            { type: "experience", name: "VIP Event Access", uses: 1 },
            { type: "commission_boost", value: "10%", uses: 5 },
            { type: "spark_ads", value: "$100", uses: 3 },
            { type: "discount", value: "15%", uses: 4 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Wireless Headphones", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$50 Gift Card", uses: 5 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$100 Spark Ads", uses: 3 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "10% Commission Boost", uses: 2 },
            { name: "Eyes on You", missionType: "views", rewardValue: "15% Discount", uses: 4 },
          ],
        },
        {
          name: "Platinum",
          color: "#818CF8",
          minSales: 5000,
          tierLevel: 4,
          isUnlocked: false,
          rewards: [
            { type: "experience", name: "Exclusive Brand Summit", uses: 1 },
            { type: "physical_gift", name: "Premium Gift Package", uses: 2 },
            { type: "gift_card", value: "$100", uses: 5 },
            { type: "commission_boost", value: "15%", uses: 8 },
            { type: "spark_ads", value: "$200", uses: 5 },
            { type: "discount", value: "20%", uses: 6 },
          ],
          missions: [
            { name: "VIP Raffle", missionType: "raffle", rewardValue: "Exclusive Brand Summit", uses: 1 },
            { name: "Unlock Payday", missionType: "sales", rewardValue: "$100 Gift Card", uses: 5 },
            { name: "Lights, Camera, Go!", missionType: "videos", rewardValue: "$200 Spark Ads", uses: 5 },
            { name: "Road to Viral", missionType: "likes", rewardValue: "15% Commission Boost", uses: 8 },
            { name: "Eyes on You", missionType: "views", rewardValue: "20% Discount", uses: 6 },
          ],
        },
      ],
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

    // Get icon for reward type (matches Rewards page)
    const getRewardIcon = (type: string, isUnlocked: boolean) => {
      const iconClass = `h-5 w-5 ${isUnlocked ? "text-slate-700" : "text-slate-400"}`

      switch (type) {
        case "gift_card":
          return <Gift className={iconClass} />
        case "commission_boost":
          return <HandCoins className={iconClass} />
        case "spark_ads":
          return <Megaphone className={iconClass} />
        case "discount":
          return <TicketPercent className={iconClass} />
        case "physical_gift":
          return <GiftDropIcon className={iconClass} />
        case "experience":
          return <Palmtree className={iconClass} />
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
    const getTotalRewardsCount = (rewards: any[]) => {
      return rewards.reduce((sum, reward) => sum + reward.uses, 0)
    }

    // Get formatted reward list in priority order
    const getFormattedRewards = (rewards: any[]) => {
      const priorityOrder = ["experience", "physical_gift", "gift_card", "commission_boost", "spark_ads", "discount"]

      const sortedRewards = [...rewards].sort((a, b) => {
        return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type)
      })

      return sortedRewards.map((reward) => {
        let displayName = ""

        switch (reward.type) {
          case "experience":
            displayName = reward.name || "Experience"
            break
          case "physical_gift":
            displayName = reward.name || "Physical Gift"
            break
          case "gift_card":
            displayName = "Gift Card"
            break
          case "commission_boost":
            displayName = "Commission Boost"
            break
          case "spark_ads":
            displayName = "Spark Ads"
            break
          case "discount":
            displayName = "Discount"
            break
        }

        return {
          display: reward.uses > 1 ? `${reward.uses}x ${displayName}` : displayName,
          type: reward.type,
        }
      })
    }

    // Filter and sort tiers: Show current tier first, then all higher tiers
    const currentTierLevel = mockData.tiers.find(t => t.isCurrent)?.tierLevel || 1
    const displayTiers = mockData.tiers
      .filter(tier => tier.tierLevel >= currentTierLevel) // Only show current and higher tiers
      .sort((a, b) => a.tierLevel - b.tierLevel) // Sort ascending by tier level

    return (
      <PageLayout
        title="Tiers"
        headerContent={
          <p className="text-lg text-white/90">Program Benefits</p>
        }
      >
        {/* Current Progress Overview */}
        <Card className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-sm border-slate-200">
          <CardContent className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Your Progress</h3>
              <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <Trophy className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-slate-900">{mockData.currentTier}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{formatCurrency(mockData.currentSales)}</span>
              </div>

              {/* Progress to next tier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress to Platinum</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(5000 - mockData.currentSales)} to go
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${(mockData.currentSales / 5000) * 100}%` }}
                  />
                </div>

                {/* Expiration text */}
                <p className="text-xs text-slate-600 pt-1">
                  {mockData.currentTier} Expires on {mockData.expirationDate}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tiers List */}
        <div className="space-y-3">
          <div className="space-y-3">
            {displayTiers.map((tier) => {
              const formattedRewards = getFormattedRewards(tier.rewards)
              const totalRewardsCount = getTotalRewardsCount(tier.rewards)

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
                  <CardContent className="px-6 py-5 space-y-4">
                    {/* Tier Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                          <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
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

                    {/* Benefits Section */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">
                        Benefits: {totalRewardsCount} Rewards
                      </p>
                      <div className="space-y-1 pl-2">
                        {formattedRewards.map((reward, index) => (
                          <div key={index} className="flex items-center gap-2">
                            {getRewardIcon(reward.type, tier.isUnlocked)}
                            <span
                              className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}
                            >
                              {reward.display}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Current Missions Section */}
                    {tier.missions && tier.missions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <p className="text-sm font-semibold text-slate-900">Current Missions</p>
                        <div className="space-y-1 pl-2">
                          {tier.missions.map((mission, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {getMissionIcon(mission.missionType, tier.isUnlocked)}
                              <span
                                className={`text-sm ${tier.isUnlocked ? "text-slate-700" : "text-slate-500"}`}
                              >
                                {mission.uses}x {mission.name} - {mission.rewardValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </PageLayout>
    )
  }
