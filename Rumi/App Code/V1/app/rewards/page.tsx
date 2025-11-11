"use client"
    import * as React from "react"
    import { useState } from "react"
    import {
      Trophy,
      History,
      ChevronRight,
      Megaphone,
      HandCoins,
      Gift,
      BadgePercent,
      Lock,
      Loader2,
      Palmtree,
    } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
    import { toast } from "sonner"
    import { cn } from "@/lib/utils"
    import Link from "next/link"

    export default function RewardsPage() {
      // Test scenario state
      const [activeScenario, setActiveScenario] = useState("scenario-1")
      const [debugPanelOpen, setDebugPanelOpen] = useState(false)

      const [showScheduleModal, setShowScheduleModal] = useState(false)
      const [selectedDiscount, setSelectedDiscount] = useState<{ id: string; percent: number; durationDays: number } | null>(null)

      const handleRedeemClick = (benefit: any) => {
        console.log("[v0] Redeem clicked for benefit:", benefit.id)

        // If discount type, open scheduling modal
        if (benefit.type === "discount") {
          setSelectedDiscount({
            id: benefit.id,
            percent: benefit.value_data?.percent || 0,
            durationDays: benefit.value_data?.duration_days || 30,
          })
          setShowScheduleModal(true)
          return
        }

        // For other reward types, claim immediately
        // TODO: POST /api/benefits/:id/claim
        // Creates redemption record with status='pending'
      }

      const handleScheduleDiscount = async (scheduledDate: Date) => {
        if (!selectedDiscount) return

        console.log("[v0] Schedule discount for:", selectedDiscount.id, scheduledDate.toISOString())

        try {
          // TODO: POST /api/benefits/:id/claim
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

          // Reset selected discount
          setSelectedDiscount(null)
        } catch (error) {
          console.error("Failed to schedule discount:", error)
          toast.error("Failed to schedule discount", {
            description: "Please try again or contact support",
            duration: 5000,
          })
        }
      }

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
            d="M20 7h-.7c.229-.467.349-.98.351-1.5a3.5 3.5 0 0 0-3.5-3.5c-1.717 0-3.215 1.2-4.331 2.481C10.4 2.842 8.949 2 7.5 2A3.5 3.5 0 0 0 4 5.5c.003.52.123 1.033.351 1.5H4a2 2 0 0 0-2 2v2a1 1 0 0 0 1
  1h18a1 1 0 0 0 1-1V9a2 2 0 0 0-2-2Zm-9.942 0H7.5a1.5 1.5 0 0 1 0-3c.9 0 2 .754 3.092 2.122-.219.337-.392.635-.534.878Zm6.1 0h-3.742c.933-1.368 2.371-3 3.739-3a1.5 1.5 0 0 1 0 3h.003ZM13 14h-2v8h2v-8Zm-4
  0H4v6a2 2 0 0 0 2 2h3v-8Zm6 0v8h3a2 2 0 0 0 2-2v-6h-5Z"
          />
        </svg>
      )

      // Map backend benefit types to frontend icons (ALWAYS show benefit icon, never lock)
      const getIconForBenefitType = (type: string) => {
        const iconClass = "h-6 w-6 text-slate-700"

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

      // Format benefit description based on type
      const getBenefitDescription = (type: string, description: string, value_data: any): string => {
        switch (type) {
          case "commission_boost":
            return `More commission for ${value_data?.duration_days || 30} days`
          case "spark_ads":
            return "In Spark Ads for more visibility"
          case "discount":
            return "Earn a discount for your viewers"
          case "gift_card":
            return description // Use backend description
          case "physical_gift":
            return "Gift Drop" // HARDCODED
          case "experience":
            return "Mystery Trip" // HARDCODED
          default:
            return description
        }
      }

      // Format benefit name based on type
      const getBenefitName = (type: string, name: string, description: string): string => {
        switch (type) {
          case "physical_gift":
            return description // Show 15-char description from backend (e.g., "Wireless Phones")
          case "experience":
            return description // Show 15-char description from backend (e.g., "VIP Event Access")
          default:
            return name // Use auto-generated name (e.g., "Gift Card: $50")
        }
      }

      /**
       * TEST SCENARIOS - Discount Scheduling Feature
       */
      const scenarios = {
        "scenario-1": {
          name: "Default - Single Discount (10%)",
          currentTier: "tier_3",
          redemptionCount: 5,
          benefits: [
            {
              id: "b1",
              type: "gift_card",
              name: "Gift Card: $50",
              description: "Redeem for Amazon gift card",
              value_data: { amount: 50 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 2,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: "tier_2",
            },
            {
              id: "b5",
              type: "discount",
              name: "Deal Boost: 10%",
              description: "10% follower discount (scheduled activation)",
              value_data: { percent: 10, duration_days: 7 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b3",
              type: "spark_ads",
              name: "Reach Boost: $100",
              description: "$100 USD in Spark Ads budget",
              value_data: { amount: 100 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 3,
              used_count: 1,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
          ],
        },
        "scenario-2": {
          name: "Multiple Discounts (10%, 15%, 20%)",
          currentTier: "tier_3",
          redemptionCount: 5,
          benefits: [
            {
              id: "b5",
              type: "discount",
              name: "Deal Boost: 10%",
              description: "10% follower discount",
              value_data: { percent: 10, duration_days: 7 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b6",
              type: "discount",
              name: "Deal Boost: 15%",
              description: "15% follower discount",
              value_data: { percent: 15, duration_days: 14 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b7",
              type: "discount",
              name: "Deal Boost: 20%",
              description: "20% follower discount",
              value_data: { percent: 20, duration_days: 30 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
          ],
        },
        "scenario-3": {
          name: "Discount Limit Reached",
          currentTier: "tier_3",
          redemptionCount: 5,
          benefits: [
            {
              id: "b1",
              type: "gift_card",
              name: "Gift Card: $50",
              description: "Redeem for Amazon gift card",
              value_data: { amount: 50 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 2,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: "tier_2",
            },
            {
              id: "b5",
              type: "discount",
              name: "Deal Boost: 10%",
              description: "10% follower discount",
              value_data: { percent: 10, duration_days: 7 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 1, // Already used!
              can_claim: false, // Cannot claim
              is_locked: false,
              preview_from_tier: null,
            },
          ],
        },
        "scenario-4": {
          name: "Locked Discount (Platinum Only)",
          currentTier: "tier_2", // Silver user
          redemptionCount: 3,
          benefits: [
            {
              id: "b1",
              type: "gift_card",
              name: "Gift Card: $25",
              description: "Redeem for Amazon gift card",
              value_data: { amount: 25 },
              tier_eligibility: "tier_2",
              redemption_frequency: "monthly",
              redemption_quantity: 2,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b7",
              type: "discount",
              name: "Deal Boost: 20%",
              description: "20% follower discount",
              value_data: { percent: 20, duration_days: 30 },
              tier_eligibility: "tier_4", // Platinum only
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: false,
              is_locked: true, // Locked!
              preview_from_tier: "tier_2", // Silver can preview
            },
          ],
        },
        "scenario-5": {
          name: "No Discounts - Other Rewards Only",
          currentTier: "tier_3",
          redemptionCount: 5,
          benefits: [
            {
              id: "b1",
              type: "gift_card",
              name: "Gift Card: $50",
              description: "Redeem for Amazon gift card",
              value_data: { amount: 50 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 2,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: "tier_2",
            },
            {
              id: "b2",
              type: "commission_boost",
              name: "Pay Boost: 5%",
              description: "Increase commission for 30 days",
              value_data: { percent: 5, duration_days: 30 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b3",
              type: "spark_ads",
              name: "Reach Boost: $100",
              description: "$100 USD in Spark Ads budget",
              value_data: { amount: 100 },
              tier_eligibility: "tier_3",
              redemption_frequency: "monthly",
              redemption_quantity: 3,
              used_count: 1,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
            {
              id: "b4",
              type: "physical_gift",
              name: "Gift Drop: Wireless Headphones",
              description: "Wireless Headphones",
              value_data: null,
              tier_eligibility: "tier_3",
              redemption_frequency: "one-time",
              redemption_quantity: 1,
              used_count: 0,
              can_claim: true,
              is_locked: false,
              preview_from_tier: null,
            },
          ],
        },
      }

      // Get current scenario data
      const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
      const currentTier = currentScenario.currentTier
      const redemptionCount = currentScenario.redemptionCount
      const benefits = currentScenario.benefits

      // Tier colors (matches VIP level)
      const tierColors = {
        tier_1: "#CD7F32", // Bronze
        tier_2: "#94a3b8", // Silver
        tier_3: "#F59E0B", // Gold
        tier_4: "#818CF8", // Platinum
      }

      const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

      /**
       * All benefits from backend API (GET /api/benefits)
       * Backend sends benefit TEMPLATES (not redemptions)
       *
       * DYNAMIC FIELDS (from backend):
       * - id: Benefit UUID
       * - type: Backend benefit type (gift_card, commission_boost, spark_ads, discount, physical_gift, experience)
       * - name: Auto-generated display name ("Gift Card: $50", "Pay Boost: 5%")
       * - description: Benefit details (15 char limit for physical_gift/experience, matches raffle_prize_name)
       * - value_data: JSONB for structured types ({"amount": 50}, {"percent": 5, "duration_days": 30})
       * - tier_eligibility: Required tier (tier_1, tier_2, tier_3, tier_4) - EXACT match
       * - redemption_frequency: 'one-time', 'monthly', 'weekly', 'unlimited'
       * - redemption_quantity: 1-10 (how many times claimable per period, NULL for unlimited)
       * - used_count: Times THIS USER has claimed (calculated from redemptions table)
       * - can_claim: Boolean (frontend checks: within limits, tier matches, enabled=true)
       * - is_locked: Boolean (user's tier < tier_eligibility OR tier != tier_eligibility)
       * - preview_from_tier: Tier that can preview this benefit (NULL = only eligible tier sees it)
       */
      const benefitsOLD = [
        {
          id: "b1",
          type: "gift_card",
          name: "Gift Card: $50", // Auto-generated from value_data
          description: "Redeem for Amazon gift card",
          value_data: { amount: 50 },
          tier_eligibility: "tier_3", // Gold only
          redemption_frequency: "monthly",
          redemption_quantity: 2,
          used_count: 0, // This user hasn't claimed yet this month
          can_claim: true, // User is tier_3, within limits
          is_locked: false,
          preview_from_tier: "tier_2", // Silver+ can preview
        },
        {
          id: "b2",
          type: "commission_boost",
          name: "Pay Boost: 5%",
          description: "Increase commission for 30 days",
          value_data: { percent: 5, duration_days: 30 },
          tier_eligibility: "tier_3",
          redemption_frequency: "monthly",
          redemption_quantity: 1,
          used_count: 1, // Already claimed once this month
          can_claim: false, // Limit reached
          is_locked: false,
          preview_from_tier: null,
        },
        {
          id: "b3",
          type: "spark_ads",
          name: "Reach Boost: $100",
          description: "$100 USD in Spark Ads budget",
          value_data: { amount: 100 },
          tier_eligibility: "tier_3",
          redemption_frequency: "monthly",
          redemption_quantity: 3,
          used_count: 1, // Claimed 1 of 3 this month
          can_claim: true,
          is_locked: false,
          preview_from_tier: null,
        },
        {
          id: "b4",
          type: "physical_gift",
          name: "Gift Drop: Wireless Phones",
          description: "Wireless Phones", // 15 char limit from backend (VARCHAR(15))
          value_data: null, // Physical gifts use description instead
          tier_eligibility: "tier_3",
          redemption_frequency: "one-time",
          redemption_quantity: 1,
          used_count: 0,
          can_claim: true,
          is_locked: false,
          preview_from_tier: null,
        },
        {
          id: "b5",
          type: "discount",
          name: "Deal Boost: 10%",
          description: "10% follower discount (scheduled activation)",
          value_data: { percent: 10 },
          tier_eligibility: "tier_3",
          redemption_frequency: "monthly",
          redemption_quantity: 1,
          used_count: 0,
          can_claim: true,
          is_locked: false,
          preview_from_tier: null,
        },
        {
          id: "b6",
          type: "experience",
          name: "Mystery Trip: VIP Event Access",
          description: "VIP Event", // 15 char limit from backend (VARCHAR(15))
          value_data: null,
          tier_eligibility: "tier_4", // Platinum only
          redemption_frequency: "one-time",
          redemption_quantity: 1,
          used_count: 0,
          can_claim: false, // User is tier_3 (Gold), needs tier_4 (Platinum)
          is_locked: true, // LOCKED because user tier < tier_eligibility
          preview_from_tier: "tier_3", // Gold+ can preview
        },
      ]

      // Frontend filtering and sorting: Show benefits user can see
      const displayBenefits = benefits
        .filter((benefit) => {
          // Show if user's tier matches tier_eligibility (EXACT match)
          if (benefit.tier_eligibility === currentTier) return true

          // OR show if locked but within preview range
          if (benefit.is_locked && benefit.preview_from_tier) {
            const tierLevels = { tier_1: 1, tier_2: 2, tier_3: 3, tier_4: 4 }
            const currentLevel = tierLevels[currentTier as keyof typeof tierLevels]
            const previewLevel = tierLevels[benefit.preview_from_tier as keyof typeof tierLevels]
            return currentLevel >= previewLevel
          }

          return false
        })
        .sort((a, b) => {
          // Ineligible = locked OR can't claim (limit reached)
          const aIsIneligible = a.is_locked || !a.can_claim
          const bIsIneligible = b.is_locked || !b.can_claim

          // Sort: Eligible first, ineligible last
          if (aIsIneligible && !bIsIneligible) return 1  // a goes after b
          if (!aIsIneligible && bIsIneligible) return -1 // a goes before b
          return 0 // Both same status, keep original order
        })

      return (
        <>
          {/* Test Scenarios Toggle Button */}
          <button
            onClick={() => setDebugPanelOpen(!debugPanelOpen)}
            className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
            aria-label="Toggle test scenarios"
          >
            🧪
          </button>

          {/* Test Scenarios Panel */}
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

          {/* Original Page Content */}
          <PageLayout
            title="Rewards"
            headerContent={
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
                <span className="text-base font-semibold text-white">
                  {currentTier === "tier_1" ? "Bronze" : currentTier === "tier_2" ? "Silver" : currentTier === "tier_3" ? "Gold" : "Platinum"}
                </span>
              </div>
            }
          >
          {/* Page Title */}
          <h2 className="text-xl font-semibold text-slate-900">Your Rewards</h2>

          {/* Benefit Cards */}
          <div className="space-y-3">
            {displayBenefits.map((benefit) => {
              const cardClass = cn(
                "flex items-center justify-between p-4 rounded-lg border",
                benefit.can_claim && !benefit.is_locked && "bg-slate-50 border-slate-200",
                !benefit.can_claim && !benefit.is_locked && "bg-amber-50 border-amber-200",
                benefit.is_locked && "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
              )

              // Get tier display name for locked badge
              const requiredTierName = benefit.tier_eligibility === "tier_1" ? "Bronze"
                : benefit.tier_eligibility === "tier_2" ? "Silver"
                : benefit.tier_eligibility === "tier_3" ? "Gold"
                : "Platinum"

              return (
                <div key={benefit.id} className={cardClass}>
                  <div className="flex items-center gap-3">
                    {/* ALWAYS show benefit icon (not lock) */}
                    {getIconForBenefitType(benefit.type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {getBenefitName(benefit.type, benefit.name, benefit.description)}
                        </h4>
                        {/* Show "X/Y" counter only for multiple-use benefits (redemption_quantity > 1) */}
                        {benefit.redemption_quantity && benefit.redemption_quantity > 1 && !benefit.is_locked && (
                          <span className="text-xs text-slate-500 font-medium">
                            {benefit.used_count}/{benefit.redemption_quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {getBenefitDescription(benefit.type, benefit.description, benefit.value_data)}
                      </p>

                      {!benefit.can_claim && !benefit.is_locked && (
                        <p className="text-xs text-amber-600 font-medium mt-1">Limit reached</p>
                      )}
                    </div>
                  </div>

                  <div>
                    {benefit.can_claim && !benefit.is_locked && (
                      <Button
                        onClick={() => handleRedeemClick(benefit)}
                        className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-sm px-4 py-2 rounded-lg font-medium"
                      >
                        {benefit.type === "discount" ? "Schedule" : "Claim"}
                      </Button>
                    )}

                    {!benefit.can_claim && !benefit.is_locked && (
                      <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg text-xs font-medium">
                        Limit Reached
                      </div>
                    )}

                    {benefit.is_locked && (
                      <div className="flex flex-col items-center gap-1">
                        <Lock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">{requiredTierName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Redemption History Section */}
          <div className="border-t border-slate-200 pt-6 mt-8">
            <Link href="/rewards/rewardshistory" className="block">
              <Button
                variant="outline"
                className="w-full bg-white border-slate-200 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  <span>View Redemption History</span>
                  <span className="text-slate-400">({redemptionCount})</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Button>
            </Link>
          </div>

          {/* Schedule Discount Modal */}
          {selectedDiscount && (
            <ScheduleDiscountModal
              open={showScheduleModal}
              onClose={() => {
                setShowScheduleModal(false)
                setSelectedDiscount(null)
              }}
              onConfirm={handleScheduleDiscount}
              discountPercent={selectedDiscount.percent}
              durationDays={selectedDiscount.durationDays}
            />
          )}
        </PageLayout>
      </>
    )
  }
