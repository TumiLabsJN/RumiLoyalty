"use client"

import { useState } from "react"
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
import type { TiersPageResponse, TierCardInfo, TierRewardItem } from "@/lib/services/tierService"

/**
 * Tiers Client Component
 *
 * Receives tier data from Server Component (no fetch, no mock data).
 * Displays VIP tier progression with flip card and tier cards.
 *
 * References:
 * - TiersPageAuthOptimizationEnhancement.md (ENH-012)
 * - DATA_FLOWS.md /tiers section
 */

interface TiersClientProps {
  initialData: TiersPageResponse | null
  error: string | null
}

export function TiersClient({ initialData, error }: TiersClientProps) {
  const [isProgressCardFlipped, setIsProgressCardFlipped] = useState(false)

  // Error state
  if (error) {
    return (
      <PageLayout title="Tiers">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      </PageLayout>
    )
  }

  // No data state
  if (!initialData) {
    return (
      <PageLayout title="Tiers">
        <div className="text-center py-12">
          <p className="text-slate-500">Unable to load tier information</p>
        </div>
      </PageLayout>
    )
  }

  const { user, progress, tiers: displayTiers } = initialData

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
        return <GiftDropIcon className={iconClass} />
      default:
        return <Gift className={iconClass} />
    }
  }

  // Get current tier details
  const currentTierData = displayTiers.find(t => t.isCurrent)
  const currentTierColor = user.currentTierColor

  // Backend provides all progress calculations
  const { nextTierName, progressPercentage } = progress

  // Backend provides expiration flag
  const showExpirationDate = user.showExpiration

  return (
    <PageLayout
      title="Tiers"
      headerContent={
        <p className="text-lg text-white/90">Program Benefits</p>
      }
    >
      {/* Your Progress Card - FLIPPABLE CARD */}
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
                  {/* Dynamic tier badge */}
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
                  {/* Dynamic sales value */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900">{user.currentSalesFormatted}</span>
                  </div>

                  {/* Progress to next tier */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Progress to {nextTierName}</span>
                      <span className="font-semibold text-slate-900">
                        {progress.amountRemainingFormatted} to go
                      </span>
                    </div>
                    {/* Dynamic progress bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercentage}%`,
                          backgroundColor: currentTierColor
                        }}
                      />
                    </div>

                    {/* Expiration text - ONLY shown for tierLevel > 1 */}
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

      {/* Tier Cards */}
      <div className="space-y-3">
        <div className="space-y-3">
          {displayTiers.map((tier: TierCardInfo) => {
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

                  {/* Commission Rate */}
                  <p className="text-base font-semibold text-slate-700 -mt-2">
                    {tier.commissionDisplayText}
                  </p>

                  {/* Benefits Section */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900">
                      Tier Perks ({tier.totalPerksCount})
                    </p>
                    <div className="space-y-1">
                      {tier.rewards.map((reward: TierRewardItem, index: number) => (
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
  )
}
