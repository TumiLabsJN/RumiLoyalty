"use client"

    import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import { cn } from "@/lib/utils"
    import Link from "next/link"
    import { useState } from "react"
    import * as React from "react"

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
      // ============================================
      // DEBUG PANEL - Test Scenario Switcher
      // ============================================
      const [activeScenario, setActiveScenario] = useState("scenario-1")
      const [debugPanelOpen, setDebugPanelOpen] = useState(false)

      const currentTier = "tier_3" // Gold (dynamic from backend)

      const tierColors = {
        tier_1: "#CD7F32",
        tier_2: "#94a3b8",
        tier_3: "#F59E0B",
        tier_4: "#818CF8",
      }

      const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

      // ============================================
      // TEST SCENARIOS - Comprehensive Reward Coverage
      // ============================================
      const scenarios = {
        "scenario-1": {
          name: "All 6 Reward Types",
          redemptionHistory: [
            {
              id: "r1",
              benefit_id: "b1",
              benefit_name: "Gift Card: $50",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2024-01-15T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-16T14:00:00Z",
            },
            {
              id: "r2",
              benefit_id: "b2",
              benefit_name: "Pay Boost: 5%",
              benefit_description: "More commission for 30 days",
              claimed_at: "2024-01-10T09:15:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-11T10:30:00Z",
            },
            {
              id: "r3",
              benefit_id: "b3",
              benefit_name: "Reach Boost: $100",
              benefit_description: "In Spark Ads for more visibility",
              claimed_at: "2024-01-05T14:20:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-06T09:00:00Z",
            },
            {
              id: "r4",
              benefit_id: "b4",
              benefit_name: "Wireless Headphones",
              benefit_description: "Gift Drop",
              claimed_at: "2023-12-28T16:45:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-30T18:00:00Z",
            },
            {
              id: "r5",
              benefit_id: "b5",
              benefit_name: "Deal Boost: 10%",
              benefit_description: "Earn a discount for your viewers",
              claimed_at: "2023-12-20T11:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-21T14:00:00Z",
            },
            {
              id: "r6",
              benefit_id: "b6",
              benefit_name: "VIP Event",
              benefit_description: "Mystery Trip",
              claimed_at: "2023-12-15T08:30:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-16T12:00:00Z",
            },
          ],
        },
        "scenario-2": {
          name: "Empty History",
          redemptionHistory: [],
        },
        "scenario-3": {
          name: "Single Item",
          redemptionHistory: [
            {
              id: "r1",
              benefit_id: "b1",
              benefit_name: "Gift Card: $25",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2024-01-15T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-16T14:00:00Z",
            },
          ],
        },
        "scenario-4": {
          name: "Multiple Gift Cards",
          redemptionHistory: [
            {
              id: "r1",
              benefit_id: "b1",
              benefit_name: "Gift Card: $100",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2024-01-20T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-21T14:00:00Z",
            },
            {
              id: "r2",
              benefit_id: "b1",
              benefit_name: "Gift Card: $50",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2024-01-10T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-11T14:00:00Z",
            },
            {
              id: "r3",
              benefit_id: "b1",
              benefit_name: "Gift Card: $25",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2023-12-25T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-26T14:00:00Z",
            },
          ],
        },
        "scenario-5": {
          name: "Long History (10 Items)",
          redemptionHistory: [
            {
              id: "r1",
              benefit_id: "b1",
              benefit_name: "Gift Card: $50",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2024-02-01T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-02-02T14:00:00Z",
            },
            {
              id: "r2",
              benefit_id: "b2",
              benefit_name: "Pay Boost: 5%",
              benefit_description: "More commission for 30 days",
              claimed_at: "2024-01-25T09:15:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-26T10:30:00Z",
            },
            {
              id: "r3",
              benefit_id: "b3",
              benefit_name: "Reach Boost: $100",
              benefit_description: "In Spark Ads for more visibility",
              claimed_at: "2024-01-20T14:20:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-21T09:00:00Z",
            },
            {
              id: "r4",
              benefit_id: "b4",
              benefit_name: "Wireless Headphones",
              benefit_description: "Gift Drop",
              claimed_at: "2024-01-15T16:45:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-17T18:00:00Z",
            },
            {
              id: "r5",
              benefit_id: "b5",
              benefit_name: "Deal Boost: 10%",
              benefit_description: "Earn a discount for your viewers",
              claimed_at: "2024-01-10T11:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-11T14:00:00Z",
            },
            {
              id: "r6",
              benefit_id: "b6",
              benefit_name: "VIP Event",
              benefit_description: "Mystery Trip",
              claimed_at: "2024-01-05T08:30:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2024-01-06T12:00:00Z",
            },
            {
              id: "r7",
              benefit_id: "b1",
              benefit_name: "Gift Card: $25",
              benefit_description: "Redeem for Amazon gift card",
              claimed_at: "2023-12-30T10:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-31T14:00:00Z",
            },
            {
              id: "r8",
              benefit_id: "b2",
              benefit_name: "Pay Boost: 7%",
              benefit_description: "More commission for 30 days",
              claimed_at: "2023-12-25T09:15:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-26T10:30:00Z",
            },
            {
              id: "r9",
              benefit_id: "b3",
              benefit_name: "Reach Boost: $200",
              benefit_description: "In Spark Ads for more visibility",
              claimed_at: "2023-12-20T14:20:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-21T09:00:00Z",
            },
            {
              id: "r10",
              benefit_id: "b5",
              benefit_name: "Deal Boost: 15%",
              benefit_description: "Earn a discount for your viewers",
              claimed_at: "2023-12-15T11:00:00Z",
              status: "fulfilled" as const,
              fulfilled_at: "2023-12-16T14:00:00Z",
            },
          ],
        },
      }

      // Get current scenario data
      const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
      const redemptionHistory = currentScenario.redemptionHistory

      return (
        <>
          {/* DEBUG PANEL TOGGLE BUTTON - Always visible */}
          <button
            onClick={() => setDebugPanelOpen(!debugPanelOpen)}
            className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
            aria-label="Toggle test scenarios"
          >
            🧪
          </button>

          {/* Collapsible Debug Panel */}
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
                <p className="text-xs text-slate-500 mt-1">
                  {redemptionHistory.length} {redemptionHistory.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          )}

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
        </>
      )
    }
