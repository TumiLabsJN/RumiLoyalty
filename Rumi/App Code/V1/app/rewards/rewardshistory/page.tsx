"use client"

    import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import { cn } from "@/lib/utils"
    import Link from "next/link"
    import { useState } from "react"
    import * as React from "react"
    import type { RedemptionHistoryScenario } from "@/types/redemption-history"

    /**
     * REDEMPTION HISTORY PAGE
     *
     * Shows creator's CONCLUDED rewards ONLY (archived/completed)
     *
     * Backend Query:
     * SELECT * FROM redemptions
     * WHERE user_id = current_user_id
     * AND status = 'concluded'
     * ORDER BY concluded_at DESC
     */

    // Interfaces now imported from @/types/redemption-history
    // Using: RedemptionHistoryResponse from API contract

    export default function RedemptionHistoryPage() {
      // ============================================
      // DEBUG PANEL - Test Scenario Switcher
      // ============================================
      const [activeScenario, setActiveScenario] = useState("scenario-1")
      const [debugPanelOpen, setDebugPanelOpen] = useState(false)

      // Tier data now comes from mockData.user (will come from API)

      // ============================================
      // TEST SCENARIOS - Comprehensive Reward Coverage
      // ============================================
      const scenarios: Record<string, RedemptionHistoryScenario> = {
        "scenario-1": {
          name: "All 6 Reward Types",
          mockData: {
            user: {
              id: "user-123",
              handle: "creator_jane",
              currentTier: "tier_3",
              currentTierName: "Gold",
              currentTierColor: "#F59E0B"
            },
            history: [
              {
                id: "r1",
                rewardId: "b1",
                name: "$50 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2024-01-15T10:00:00Z",
                concludedAt: "2024-01-16T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r2",
                rewardId: "b2",
                name: "5% Pay Boost",
                description: "Higher earnings (30d)",
                type: "commission_boost",
                claimedAt: "2024-01-10T09:15:00Z",
                concludedAt: "2024-01-11T10:30:00Z",
                status: "concluded" as const,
              },
              {
                id: "r3",
                rewardId: "b3",
                name: "$100 Ads Boost",
                description: "Spark Ads Promo",
                type: "spark_ads",
                claimedAt: "2024-01-05T14:20:00Z",
                concludedAt: "2024-01-06T09:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r4",
                rewardId: "b4",
                name: "Gift Drop: Headphones",
                description: "Premium wireless earbuds",
                type: "physical_gift",
                claimedAt: "2023-12-28T16:45:00Z",
                concludedAt: "2023-12-30T18:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r5",
                rewardId: "b5",
                name: "10% Deal Boost",
                description: "Follower Discount (7d)",
                type: "discount",
                claimedAt: "2023-12-20T11:00:00Z",
                concludedAt: "2023-12-21T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r6",
                rewardId: "b6",
                name: "Mystery Trip",
                description: "A hidden adventure",
                type: "experience",
                claimedAt: "2023-12-15T08:30:00Z",
                concludedAt: "2023-12-16T12:00:00Z",
                status: "concluded" as const,
              },
            ],
          },
        },
        "scenario-2": {
          name: "Empty History",
          mockData: {
            user: {
              id: "user-123",
              handle: "creator_jane",
              currentTier: "tier_3",
              currentTierName: "Gold",
              currentTierColor: "#F59E0B"
            },
            history: [],
          },
        },
        "scenario-3": {
          name: "Single Item",
          mockData: {
            user: {
              id: "user-123",
              handle: "creator_jane",
              currentTier: "tier_3",
              currentTierName: "Gold",
              currentTierColor: "#F59E0B"
            },
            history: [
              {
                id: "r1",
                rewardId: "b1",
                name: "$25 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2024-01-15T10:00:00Z",
                concludedAt: "2024-01-16T14:00:00Z",
                status: "concluded" as const,
              },
            ],
          },
        },
        "scenario-4": {
          name: "Multiple Gift Cards",
          mockData: {
            user: {
              id: "user-123",
              handle: "creator_jane",
              currentTier: "tier_3",
              currentTierName: "Gold",
              currentTierColor: "#F59E0B"
            },
            history: [
              {
                id: "r1",
                rewardId: "b1",
                name: "$100 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2024-01-20T10:00:00Z",
                concludedAt: "2024-01-21T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r2",
                rewardId: "b1",
                name: "$50 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2024-01-10T10:00:00Z",
                concludedAt: "2024-01-11T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r3",
                rewardId: "b1",
                name: "$25 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2023-12-25T10:00:00Z",
                concludedAt: "2023-12-26T14:00:00Z",
                status: "concluded" as const,
              },
            ],
          },
        },
        "scenario-5": {
          name: "Long History (10 Items)",
          mockData: {
            user: {
              id: "user-123",
              handle: "creator_jane",
              currentTier: "tier_3",
              currentTierName: "Gold",
              currentTierColor: "#F59E0B"
            },
            history: [
              {
                id: "r1",
                rewardId: "b1",
                name: "$50 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2024-02-01T10:00:00Z",
                concludedAt: "2024-02-02T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r2",
                rewardId: "b2",
                name: "5% Pay Boost",
                description: "Higher earnings (30d)",
                type: "commission_boost",
                claimedAt: "2024-01-25T09:15:00Z",
                concludedAt: "2024-01-26T10:30:00Z",
                status: "concluded" as const,
              },
              {
                id: "r3",
                rewardId: "b3",
                name: "$100 Ads Boost",
                description: "Spark Ads Promo",
                type: "spark_ads",
                claimedAt: "2024-01-20T14:20:00Z",
                concludedAt: "2024-01-21T09:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r4",
                rewardId: "b4",
                name: "Gift Drop: Headphones",
                description: "Premium wireless earbuds",
                type: "physical_gift",
                claimedAt: "2024-01-15T16:45:00Z",
                concludedAt: "2024-01-17T18:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r5",
                rewardId: "b5",
                name: "10% Deal Boost",
                description: "Follower Discount (7d)",
                type: "discount",
                claimedAt: "2024-01-10T11:00:00Z",
                concludedAt: "2024-01-11T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r6",
                rewardId: "b6",
                name: "Mystery Trip",
                description: "A hidden adventure",
                type: "experience",
                claimedAt: "2024-01-05T08:30:00Z",
                concludedAt: "2024-01-06T12:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r7",
                rewardId: "b1",
                name: "$25 Gift Card",
                description: "Amazon Gift Card",
                type: "gift_card",
                claimedAt: "2023-12-30T10:00:00Z",
                concludedAt: "2023-12-31T14:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r8",
                rewardId: "b2",
                name: "7% Pay Boost",
                description: "Higher earnings (30d)",
                type: "commission_boost",
                claimedAt: "2023-12-25T09:15:00Z",
                concludedAt: "2023-12-26T10:30:00Z",
                status: "concluded" as const,
              },
              {
                id: "r9",
                rewardId: "b3",
                name: "$200 Ads Boost",
                description: "Spark Ads Promo",
                type: "spark_ads",
                claimedAt: "2023-12-20T14:20:00Z",
                concludedAt: "2023-12-21T09:00:00Z",
                status: "concluded" as const,
              },
              {
                id: "r10",
                rewardId: "b5",
                name: "15% Deal Boost",
                description: "Follower Discount (7d)",
                type: "discount",
                claimedAt: "2023-12-15T11:00:00Z",
                concludedAt: "2023-12-16T14:00:00Z",
                status: "concluded" as const,
              },
            ],
          },
        },
      }

      // Get current scenario data
      const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
      const { user, history } = currentScenario.mockData

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
                  {history.length} {history.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
          )}

          <PageLayout
            title="Redemption History"
            headerContent={
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                <Trophy className="w-5 h-5" style={{ color: user.currentTierColor }} />
                <span className="text-base font-semibold text-white">
                  {user.currentTierName}
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
              {history.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Reward name (backend-formatted) */}
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>

                      {/* Description (backend-formatted displayText) */}
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>

                      {/* Concluded timestamp */}
                      <p className="text-xs text-slate-500 mt-2">
                        Completed on{" "}
                        {new Date(item.concludedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="ml-4">
                      {/* All items in history are concluded (show as "Completed" to user) */}
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {history.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No redemption history yet</p>
                <p className="text-xs text-slate-400 mt-2">Concluded rewards will appear here</p>
              </div>
            )}
          </PageLayout>
        </>
      )
    }
