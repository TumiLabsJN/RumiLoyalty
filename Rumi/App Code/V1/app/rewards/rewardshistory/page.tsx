"use client"

    import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import Link from "next/link"

    /**
     * REDEMPTION HISTORY PAGE
     *
     * Shows creator's FULFILLED rewards ONLY (completed deliveries)
     *
     * Backend Query:
     * SELECT * FROM redemptions
     * WHERE user_id = current_user_id
     * AND status = 'fulfilled'
     * ORDER BY fulfilled_at DESC
     */

    interface RedemptionHistoryItem {
      id: string // UUID from redemptions table
      benefit_id: string // FK to benefits table
      benefit_name: string // From benefits.name (e.g., "Gift Card: $50")
      benefit_description: string // From benefits.description
      claimed_at: string // ISO timestamp from redemptions.claimed_at
      status: "fulfilled" // ONLY fulfilled in history
      fulfilled_at: string // When admin completed fulfillment
    }

    export default function RedemptionHistoryPage() {
      const currentTier = "tier_3" // Gold (dynamic from backend)

      const tierColors = {
        tier_1: "#CD7F32",
        tier_2: "#94a3b8",
        tier_3: "#F59E0B",
        tier_4: "#818CF8",
      }

      const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

      /**
       * MOCK DATA - Replace with backend API call
       * Backend endpoint: GET /api/redemptions/history
       * Filter: status = 'fulfilled' ONLY
       */
      const redemptionHistory: RedemptionHistoryItem[] = [
        {
          id: "r2",
          benefit_id: "b3",
          benefit_name: "Reach Boost: $100",
          benefit_description: "$100 USD in Spark Ads",
          claimed_at: "2024-01-10T14:20:00Z",
          status: "fulfilled",
          fulfilled_at: "2024-01-11T09:00:00Z",
        },
        {
          id: "r3",
          benefit_id: "b2",
          benefit_name: "Pay Boost: 5%",
          benefit_description: "+5% Commission for 30 days",
          claimed_at: "2024-01-05T09:15:00Z",
          status: "fulfilled",
          fulfilled_at: "2024-01-06T10:30:00Z",
        },
        {
          id: "r4",
          benefit_id: "b5",
          benefit_name: "Deal Boost: 10%",
          benefit_description: "10% follower discount",
          claimed_at: "2023-12-28T16:45:00Z",
          status: "fulfilled",
          fulfilled_at: "2023-12-28T18:00:00Z",
        },
        {
          id: "r5",
          benefit_id: "b1",
          benefit_name: "Gift Card: $50",
          benefit_description: "Amazon gift card",
          claimed_at: "2023-12-20T11:00:00Z",
          status: "fulfilled",
          fulfilled_at: "2023-12-21T14:00:00Z",
        },
      ]

      return (
        <PageLayout
          title="Redemption History"
          headerContent={
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
              <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
              <span className="text-base font-semibold text-white">
                {currentTier === "tier_1" ? "Bronze" : currentTier === "tier_2" ? "Silver" : currentTier === "tier_3" ? "Gold" : "Platinum"}
              </span>
            </div>
          }
        >
          {/* Back Button */}
          <Link href="/rewards">
            <Button variant="ghost" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Rewards
            </Button>
          </Link>

          {/* Page Title */}
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Your Redemption History</h2>

          {/* History List */}
          <div className="space-y-3">
            {redemptionHistory.map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Benefit name from benefits table */}
                    <h3 className="font-semibold text-slate-900">{item.benefit_name}</h3>

                    {/* Description from benefits table */}
                    <p className="text-sm text-slate-600 mt-1">{item.benefit_description}</p>

                    {/* Fulfilled timestamp */}
                    <p className="text-xs text-slate-500 mt-2">
                      Fulfilled on{" "}
                      {new Date(item.fulfilled_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="ml-4">
                    {/* All items in history are fulfilled */}
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Fulfilled</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {redemptionHistory.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No redemption history yet</p>
              <p className="text-xs text-slate-400 mt-2">Fulfilled rewards will appear here</p>
            </div>
          )}
        </PageLayout>
      )
    }
