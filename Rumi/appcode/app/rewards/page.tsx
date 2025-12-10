"use client";
import { useState, useEffect } from "react";
import type { RewardsPageResponse, Reward, RewardStatus } from "@/types/rewards";
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
  ClockArrowDown,
  Info,
  Calendar,
  CheckCircle2,
  Truck,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/pagelayout";
import { ScheduleDiscountModal } from "@/components/schedule-discount-modal";
import { SchedulePayboostModal } from "@/components/schedule-payboost-modal";
import { ClaimPhysicalGiftModal } from "@/components/claim-physical-gift-modal";
import { PaymentInfoModal } from "@/components/payment-info-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FlippableCard, FlipFrontSide, FlipBackSide, FlipInfoButton } from "@/components/FlippableCard";

export default function RewardsPage() {
      // API delay constants (milliseconds)
      const CLAIM_DELAY_MS = 2000;
      const SCHEDULE_DELAY_MS = 1500;
      const AUTO_FLIP_DELAY_MS = 6000;

      const [showScheduleModal, setShowScheduleModal] = useState(false);
      const [selectedDiscount, setSelectedDiscount] = useState<{ id: string; percent: number; durationDays: number } | null>(null);
      const [showPayboostModal, setShowPayboostModal] = useState(false);
      const [selectedPayboost, setSelectedPayboost] = useState<{ id: string; percent: number; durationDays: number } | null>(null);
      const [showPhysicalGiftModal, setShowPhysicalGiftModal] = useState(false);
      const [selectedPhysicalGift, setSelectedPhysicalGift] = useState<any | null>(null);
      const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);
      const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
      const [userTimezone, setUserTimezone] = useState<string>("America/New_York");
      const [isClient, setIsClient] = useState(false);

      // Detect user's timezone on client-side only (avoid hydration mismatch)
      useEffect(() => {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setIsClient(true);
      }, []);

      const handleRedeemClick = async (benefit: Reward) => {
        console.log("[v0] Redeem clicked for benefit:", benefit.id)

        // If discount type, open discount scheduling modal
        if (benefit.type === "discount") {
          setSelectedDiscount({
            id: benefit.id,
            percent: benefit.valueData?.percent || 0,
            durationDays: benefit.valueData?.durationDays || 30,
          })
          setShowScheduleModal(true)
          return
        }

        // If commission boost type, open payboost scheduling modal
        if (benefit.type === "commission_boost") {
          setSelectedPayboost({
            id: benefit.id,
            percent: benefit.valueData?.percent || 0,
            durationDays: benefit.valueData?.durationDays || 30,
          })
          setShowPayboostModal(true)
          return
        }

        // If physical gift type, open physical gift claim modal
        if (benefit.type === "physical_gift") {
          setSelectedPhysicalGift(benefit)
          setShowPhysicalGiftModal(true)
          return
        }

        // For other reward types, claim immediately
        try {
          // TODO: POST /api/rewards/:id/claim
          // Backend will update reward.status to 'redeeming'
          // This will trigger the "Pending" badge to appear
          await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY_MS))

          // No toast for immediate claims - only scheduled rewards show toasts
        } catch (error) {
          toast.error("Failed to claim reward", {
            description: "Please try again or contact support",
            duration: 5000,
          })
        }
      }

      const handleScheduleDiscount = async (scheduledDate: Date) => {
        if (!selectedDiscount) return

        console.log("[v0] Schedule discount for:", selectedDiscount.id, scheduledDate.toISOString())

        try {
          // TODO: POST /api/rewards/:id/claim
          // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

          // Show success message with user's local time
          const localDateStr = scheduledDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: userTimezone,
          });
          const localTimeStr = scheduledDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: userTimezone,
          });

          toast.success(`Discount scheduled for ${localDateStr} at ${localTimeStr}`, {
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

      const handleSchedulePayboost = async (scheduledDate: Date) => {
        if (!selectedPayboost) return

        console.log("[v0] Schedule payboost for:", selectedPayboost.id, scheduledDate.toISOString())

        try {
          // TODO: POST /api/rewards/:id/claim
          // Request body: { scheduledActivationAt: scheduledDate.toISOString() }

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, SCHEDULE_DELAY_MS))

          // Show success message with user's local time
          const localDateStr = scheduledDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: userTimezone,
          });
          const localTimeStr = scheduledDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: userTimezone,
          });

          toast.success(`Pay Boost scheduled for ${localDateStr} at ${localTimeStr}`, {
            description: "We'll activate your commission boost at this time",
            duration: 5000,
          })

          // Reset selected payboost
          setSelectedPayboost(null)
        } catch (error) {
          console.error("Failed to schedule pay boost:", error)
          toast.error("Failed to schedule pay boost", {
            description: "Please try again or contact support",
            duration: 5000,
          })
        }
      }

      const handlePhysicalGiftSuccess = () => {
        console.log("[v0] Physical gift claimed successfully")
        // TODO: Refresh benefits data from API
        // For now, the modal handles success toast
      }

      const handlePaymentInfoSuccess = () => {
        console.log("[v0] Payment info submitted successfully")
        // TODO: Refresh benefits data from API
        // Status should change from "pending_info" to "clearing"
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
      );

      // Map backend benefit types to frontend icons (ALWAYS show benefit icon, never lock)
      const getIconForBenefitType = (type: string) => {
        const iconClass = "h-6 w-6 text-slate-700";

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
      };

      // Format benefit description based on type
      const getBenefitDescription = (type: string, description: string, value_data: any): string => {
        switch (type) {
          case "commission_boost":
            return `Higher earnings (${value_data?.duration_days || 30}d)`
          case "spark_ads":
            return description // Use backend description
          case "discount":
            return "Follower discount"
          case "gift_card":
            return description // Use backend description
          case "physical_gift":
            return description // Use description field from benefit
          case "experience":
            return description // Use description field from benefit
          default:
            return description
        }
      };

      // Format benefit name based on type
      const getBenefitName = (type: string, name: string, description: string): string => {
        switch (type) {
          case "physical_gift":
            return name // Use name field (e.g., "Gift Drop: Wireless Headphones")
          case "experience":
            return name // Use name field (e.g., "Mystery Trip")
          default:
            return name // Use auto-generated name (e.g., "Gift Card: $50")
        }
      };

      // Get display name for tier
      const getTierDisplayName = (tier: string): string => {
        switch (tier) {
          case "tier_1":
            return "Bronze";
          case "tier_2":
            return "Silver";
          case "tier_3":
            return "Gold";
          case "tier_4":
            return "Platinum";
          default:
            return "Unknown";
        }
      };

      // Get user's timezone abbreviation
      const getUserTimezoneAbbr = (): string => {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
          timeZoneName: "short",
        })
        const parts = formatter.formatToParts(now)
        const tzPart = parts.find((part) => part.type === "timeZoneName")
        return tzPart?.value || ""
      }

      // Format scheduled date/time for display in user's local timezone
      const formatScheduledDateTime = (date: Date, type: string): string => {
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: userTimezone,
        });

        const timeStr = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: userTimezone,
        });

        return `${dateStr}, ${timeStr}`;
      };

      /**
       * MOCK DATA - All 9 reward statuses for testing
       * Follows API_CONTRACTS.md v1.5 structure
       */
      const mockData: RewardsPageResponse = {
        user: {
          id: "user-123",
          handle: "creator_jane",
          currentTier: "tier_3",
          currentTierName: "Gold",
          currentTierColor: "#F59E0B"
        },
        redemptionCount: 5,
        rewards: [
          // Status 1: Clearing
          {
            id: "reward-clearing-1",
            type: "commission_boost",
            name: "5% Pay Boost",
            description: "",
            displayText: "Higher earnings (30d)",
            valueData: { percent: 5, durationDays: 30 },
            status: "clearing",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 3,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 1,
            statusDetails: { clearingDays: 15 },
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          },
          // Status 2: Sending
          {
            id: "reward-sending-1",
            type: "physical_gift",
            name: "Gift Drop: Headphones",
            description: "Headphones",
            displayText: "Premium wireless earbuds",
            valueData: { requiresSize: false },
            status: "sending",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 2,
            statusDetails: { shippingCity: "Los Angeles" },
            redemptionFrequency: "one-time",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // Status 3: Active
          {
            id: "reward-active-1",
            type: "discount",
            name: "15% Deal Boost",
            description: "",
            displayText: "Follower Discount (7d)",
            valueData: {
              percent: 15,
              durationDays: 7,
              couponCode: "GOLD15",
              maxUses: 100
            },
            status: "active",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 2,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 3,
            statusDetails: {
              activationDate: "Jan 10, 2025",
              expirationDate: "Jan 17, 2025",
              daysRemaining: 3
            },
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          },
          // Status 4: Pending Info (NEW)
          {
            id: "reward-pending-info-1",
            type: "commission_boost",
            name: "5% Pay Boost",
            description: "",
            displayText: "Higher earnings (30d)",
            valueData: { percent: 5, durationDays: 30 },
            status: "pending_info",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 3,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 4,
            statusDetails: null,
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          },
          // Status 5: Scheduled
          {
            id: "reward-scheduled-1",
            type: "commission_boost",
            name: "10% Pay Boost",
            description: "",
            displayText: "Higher earnings (30d)",
            valueData: { percent: 10, durationDays: 30 },
            status: "scheduled",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 2,
            totalQuantity: 3,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 5,
            statusDetails: {
              scheduledDate: "Jan 20, 2025 at 2:00 PM",
              scheduledDateRaw: "2025-01-20T19:00:00Z"
            },
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          },
          // Status 6: Redeeming Physical
          {
            id: "reward-redeeming-physical-1",
            type: "physical_gift",
            name: "Gift Drop: Hoodie",
            description: "Hoodie",
            displayText: "Premium branded hoodie",
            valueData: {
              requiresSize: true,
              sizeCategory: "clothing",
              sizeOptions: ["S", "M", "L", "XL"]
            },
            status: "redeeming_physical",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 0,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 6,
            statusDetails: null,
            redemptionFrequency: "one-time",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // Status 7: Redeeming
          {
            id: "reward-redeeming-1",
            type: "gift_card",
            name: "$50 Gift Card",
            description: "",
            displayText: "$50 Amazon Gift Card",
            valueData: { amount: 50 },
            status: "redeeming",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 2,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 7,
            statusDetails: null,
            redemptionFrequency: "monthly",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // Status 8: Claimable (Experience example)
          {
            id: "reward-claimable-1",
            type: "experience",
            name: "Mystery Trip",
            description: "Mystery Trip",
            displayText: "A hidden adventure",
            valueData: {},
            status: "claimable",
            canClaim: true,
            isLocked: false,
            isPreview: false,
            usedCount: 0,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 8,
            statusDetails: null,
            redemptionFrequency: "one-time",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // Status 9: Limit Reached
          {
            id: "reward-limit-reached-1",
            type: "spark_ads",
            name: "$100 Ads Boost",
            description: "",
            displayText: "Spark Ads Promo",
            valueData: { amount: 100 },
            status: "limit_reached",
            canClaim: false,
            isLocked: false,
            isPreview: false,
            usedCount: 1,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 9,
            statusDetails: null,
            redemptionFrequency: "one-time",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // Status 10: Locked
          {
            id: "reward-locked-1",
            type: "gift_card",
            name: "$200 Gift Card",
            description: "",
            displayText: "$200 Amazon Gift Card",
            valueData: { amount: 200 },
            status: "locked",
            canClaim: false,
            isLocked: true,
            isPreview: true,
            usedCount: 0,
            totalQuantity: 1,
            tierEligibility: "tier_4",
            requiredTierName: "Platinum",
            displayOrder: 10,
            statusDetails: null,
            redemptionFrequency: "monthly",
            redemptionType: "instant",
            rewardSource: "vip_tier"
          },
          // TEST 1: Discount - Claimable (opens schedule discount modal)
          {
            id: "reward-test-discount-1",
            type: "discount",
            name: "20% Deal Boost",
            description: "",
            displayText: "Follower discount",
            valueData: {
              percent: 20,
              durationDays: 14,
              couponCode: "",
              maxUses: 500
            },
            status: "claimable",
            canClaim: true,
            isLocked: false,
            isPreview: false,
            usedCount: 0,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 11,
            statusDetails: null,
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          },
          // TEST 2: Commission Boost - Claimable (opens schedule payboost modal)
          {
            id: "reward-test-payboost-1",
            type: "commission_boost",
            name: "15% Pay Boost",
            description: "",
            displayText: "Higher earnings (30d)",
            valueData: { percent: 15, durationDays: 30 },
            status: "claimable",
            canClaim: true,
            isLocked: false,
            isPreview: false,
            usedCount: 0,
            totalQuantity: 1,
            tierEligibility: "tier_3",
            requiredTierName: null,
            displayOrder: 12,
            statusDetails: null,
            redemptionFrequency: "monthly",
            redemptionType: "scheduled",
            rewardSource: "vip_tier"
          }
        ]
      };

      const { user, redemptionCount, rewards } = mockData;

      // Get current tier info from user object
      const currentTier = user.currentTier;
      const currentTierColor = user.currentTierColor;

      /**
       * All benefits from backend API (GET /api/benefits)
       * Backend sends benefit TEMPLATES (not redemptions)
       *
       * DYNAMIC FIELDS (from backend):
       * - id: Benefit UUID
       * - type: Backend benefit type (gift_card, commission_boost, spark_ads, discount, physical_gift, experience)
       * - name: Auto-generated display name ("Gift Card: $50", "Pay Boost: 5%")
       * - description: Benefit details (15 char limit for physical_gift/experience)
       * - value_data: JSONB for structured types ({"amount": 50}, {"percent": 5, "duration_days": 30})
       * - tier_eligibility: Required tier (tier_1, tier_2, tier_3, tier_4) - EXACT match
       * - redemption_frequency: 'one-time', 'monthly', 'weekly', 'unlimited'
       * - redemption_quantity: 1-10 (how many times claimable per period, NULL for unlimited)
       * - used_count: Times THIS USER has claimed (calculated from redemptions table)
       * - can_claim: Boolean (frontend checks: within limits, tier matches, enabled=true)
       * - is_locked: Boolean (user's tier < tier_eligibility OR tier != tier_eligibility)
       * - preview_from_tier: Tier that can preview this benefit (NULL = only eligible tier sees it)
       */

      // ✅ Backend already filters and sorts rewards by priority (actionable → status updates → informational):
      //    1. Pending info (payment method needed)
      //    2. Claimable (ready to claim)
      //    3. Clearing → Sending → Active → Scheduled
      //    4. Redeeming → Redeeming Physical
      //    5. Limit reached → Locked
      // ✅ Within same status, sorted by display_order (admin-defined)
      const displayBenefits = rewards;

      return (
        <PageLayout
            title="Rewards"
            headerContent={
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
                <span className="text-base font-semibold text-white">
                  {getTierDisplayName(currentTier)}
                </span>
              </div>
            }
          >
          {/* Page Title */}
          <h2 className="text-xl font-semibold text-slate-900">Your Rewards</h2>

          {/* Benefit Cards */}
          <div className="space-y-3">
            {displayBenefits.map((benefit) => {
              // Get tier display name for locked badge (using requiredTierName from backend)
              const requiredTierName = benefit.requiredTierName || getTierDisplayName(benefit.tierEligibility);

              // Trust backend's computed status - no client-side derivation needed
              const isClearing = benefit.status === "clearing";
              const isScheduled = benefit.status === "scheduled";
              const isActive = benefit.status === "active";
              const isPendingInfo = benefit.status === "pending_info";
              const isSending = benefit.status === "sending";
              const isRedeemingPhysical = benefit.status === "redeeming_physical";
              const isRedeeming = benefit.status === "redeeming";
              const isLimitReached = benefit.status === "limit_reached";
              const isLocked = benefit.status === "locked";

              const cardClass = cn(
                "relative flex items-center justify-between p-4 rounded-lg border min-h-[88px]",
                (isActive || isSending) && "bg-green-50 border-green-200",
                (isClearing || isScheduled) && "bg-slate-50 border-slate-200",
                !isActive && !isSending && !isClearing && !isScheduled && benefit.canClaim && !benefit.isLocked && "bg-slate-50 border-slate-200",
                !isActive && !isSending && !isClearing && !isScheduled && !benefit.canClaim && !benefit.isLocked && "bg-amber-50 border-amber-200",
                benefit.isLocked && "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
              );

              return (
                <FlippableCard key={benefit.id} id={benefit.id} autoFlipDelay={AUTO_FLIP_DELAY_MS}>
                  {({ flip, flipBack, isFlipped }) => (
                    <>
                      <FlipFrontSide>
                        <div className={cardClass}>
                          {/* INFO ICON: Positioned in upper right corner for flippable cards */}
                          {(isClearing || isScheduled || isActive || isPendingInfo || isSending || isRedeeming) && !isRedeemingPhysical && (
                            <div className="absolute top-0.5 right-0.5">
                              <FlipInfoButton onClick={flip} />
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            {/* ALWAYS show benefit icon (not lock) */}
                            {getIconForBenefitType(benefit.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-semibold text-slate-900">
                                  {benefit.name}
                                </h4>
                                {/* Show "X/Y" counter only for multiple-use benefits (totalQuantity > 1) */}
                                {benefit.totalQuantity > 1 && !benefit.isLocked && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    {benefit.usedCount}/{benefit.totalQuantity}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600">
                                {benefit.displayText}
                              </p>

                              {isLimitReached && (
                                <p className="text-xs text-amber-600 font-medium mt-1">Limit reached</p>
                              )}
                            </div>
                          </div>

                          {/* RIGHT SIDE: Action Buttons & Status Badges */}
                          <div className="flex items-center gap-2">
                            {/* STATUS BADGE: Clearing (Commission Boost Pending Payout) */}
                            {isClearing && (
                              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <ClockArrowDown className="h-4 w-4 text-blue-500" />
                                Clearing
                              </div>
                            )}

                            {/* STATUS BADGE: Scheduled (Discount or Commission Boost) */}
                            {isScheduled && !isClearing && !isActive && (
                              <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <Calendar className="h-4 w-4 text-purple-500" />
                                Scheduled
                              </div>
                            )}

                            {/* STATUS BADGE: Pending Payment Info (Commission Boost) */}
                            {isPendingInfo && (
                              <Button
                                onClick={() => {
                                  setSelectedReward(benefit)
                                  setShowPaymentInfoModal(true)
                                }}
                                className="bg-white border-2 border-yellow-600 text-yellow-600 hover:bg-yellow-50 text-xs px-4 py-2 rounded-lg font-medium"
                              >
                                Add Info
                              </Button>
                            )}

                            {/* STATUS BADGE: Active (Discount or Commission Boost Currently Running) */}
                            {isActive && !isClearing && (
                              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Active
                              </div>
                            )}

                            {/* STATUS BADGE: Sending (Physical Gift Being Shipped) */}
                            {isSending && (
                              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                Shipping
                              </div>
                            )}

                            {/* STATUS BADGE: Redeeming (Pending) - Flippable for non-physical gifts */}
                            {isRedeeming && (
                              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Pending
                              </div>
                            )}

                            {/* STATUS BADGE: Redeeming Physical (Pending) - NOT flippable for physical gifts */}
                            {isRedeemingPhysical && (
                              <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-medium">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Pending
                              </div>
                            )}

                            {/* STATUS BADGE: Default Claim - Action button shows "Claim" or "Schedule" */}
                            {benefit.canClaim && !benefit.isLocked && benefit.status === "claimable" && (
                              <Button
                                onClick={() => handleRedeemClick(benefit)}
                                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-xs px-4 py-2 rounded-lg font-medium"
                              >
                                {(benefit.type === "discount" || benefit.type === "commission_boost") ? "Schedule" : "Claim"}
                              </Button>
                            )}

                            {/* STATUS BADGE: Limit Reached */}
                            {isLimitReached && (
                              <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg text-xs font-medium">
                                Limit Reached
                              </div>
                            )}

                            {/* STATUS BADGE: Locked (Tier-Locked) */}
                            {isLocked && (
                              <div className="flex flex-col items-center gap-1">
                                <Lock className="h-4 w-4 text-slate-400" />
                                <span className="text-xs text-slate-500 font-medium">{requiredTierName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </FlipFrontSide>

                      {/* BACK SIDE: Clearing explanation */}
                      {isClearing && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center justify-center p-4 rounded-lg border bg-slate-50 border-slate-200 min-h-[88px]">
                            <p className="text-xs text-slate-600 leading-snug text-center max-w-full">
                              Sales clear after 20 days to allow for returns. We&apos;ll notify you as soon as your reward is ready.
                            </p>
                          </div>
                        </FlipBackSide>
                      )}

                      {/* BACK SIDE: Scheduled details */}
                      {isScheduled && !isClearing && !isActive && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center p-4 rounded-lg border bg-purple-50 border-purple-200 min-h-[88px]">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4 text-purple-500" />
                                <p className="text-xs font-semibold text-purple-700">
                                  {benefit.statusDetails?.scheduledDate || "Scheduled"}
                                </p>
                              </div>
                              <p className="text-xs text-slate-600">
                                Will be active for {benefit.valueData?.durationDays || 30} days
                              </p>
                            </div>
                          </div>
                        </FlipBackSide>
                      )}

                      {/* BACK SIDE: Active details */}
                      {isActive && !isClearing && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center p-4 rounded-lg border bg-green-50 border-green-200 min-h-[88px]">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-slate-600">Started:</p>
                                <p className="text-xs font-semibold text-green-700">
                                  {benefit.statusDetails?.activationDate || "Active"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-600">Expires:</p>
                                <p className="text-xs font-semibold text-green-700">
                                  {benefit.statusDetails?.expirationDate || "Soon"}
                                </p>
                              </div>
                              {benefit.statusDetails?.daysRemaining !== undefined && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {benefit.statusDetails.daysRemaining} days remaining
                                </p>
                              )}
                            </div>
                          </div>
                        </FlipBackSide>
                      )}

                      {/* BACK SIDE: Pending Info explanation */}
                      {isPendingInfo && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center justify-center gap-2 p-4 rounded-lg border bg-yellow-50 border-yellow-200 min-h-[88px]">
                            <p className="text-sm text-yellow-700 font-medium leading-snug text-center">
                              Set up your payout info
                            </p>
                            <CircleDollarSign className="h-5 w-5 text-yellow-600" />
                          </div>
                        </FlipBackSide>
                      )}

                      {/* BACK SIDE: Sending explanation */}
                      {isSending && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center justify-center gap-2 p-4 rounded-lg border bg-green-50 border-green-200 min-h-[88px]">
                            <p className="text-sm text-green-700 font-medium leading-snug text-center">
                              Your gift is on its way!
                            </p>
                            <Truck className="h-5 w-5 text-green-600" />
                          </div>
                        </FlipBackSide>
                      )}

                      {/* BACK SIDE: Redeeming explanation */}
                      {isRedeeming && (
                        <FlipBackSide onClick={flipBack}>
                          <div className="flex items-center justify-center p-4 rounded-lg border bg-slate-50 border-slate-200 min-h-[88px]">
                            <p className="text-xs text-slate-600 leading-snug text-center max-w-full">
                              We will deliver your reward in up to 72 hours
                            </p>
                          </div>
                        </FlipBackSide>
                      )}
                    </>
                  )}
                </FlippableCard>
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

          {/* Schedule Payboost Modal */}
          {selectedPayboost && (
            <SchedulePayboostModal
              open={showPayboostModal}
              onClose={() => {
                setShowPayboostModal(false)
                setSelectedPayboost(null)
              }}
              onConfirm={handleSchedulePayboost}
              boostPercent={selectedPayboost.percent}
              durationDays={selectedPayboost.durationDays}
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

          {/* Payment Info Modal */}
          {selectedReward && (
            <PaymentInfoModal
              open={showPaymentInfoModal}
              onOpenChange={(open) => {
                setShowPaymentInfoModal(open)
                if (!open) {
                  setSelectedReward(null)
                }
              }}
              rewardId={selectedReward.id}
              rewardName={selectedReward.name}
              onSuccess={handlePaymentInfoSuccess}
            />
          )}
        </PageLayout>
      )
  }
