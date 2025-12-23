"use client"

import { Trophy, ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/pagelayout"
import Link from "next/link"
import type { RedemptionHistoryResponse } from "@/lib/services/rewardService"

/**
 * Rewards History Client Component
 *
 * Receives data from Server Component (no fetch, no mock data).
 * Displays concluded VIP tier reward redemptions.
 *
 * References:
 * - DATA_FLOWS.md /rewards/rewardshistory section
 * - REWARDS_IMPL.md GET /api/rewards/history
 */

interface RewardsHistoryClientProps {
  initialData: RedemptionHistoryResponse | null
  error: string | null
}

export function RewardsHistoryClient({ initialData, error }: RewardsHistoryClientProps) {
  // Error state
  if (error) {
    return (
      <PageLayout title="Redemption History">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <Link href="/rewards">
            <Button variant="outline" className="mt-4">
              Back to Rewards
            </Button>
          </Link>
        </div>
      </PageLayout>
    )
  }

  // No data state (shouldn't happen if server component works)
  if (!initialData) {
    return (
      <PageLayout title="Redemption History">
        <div className="text-center py-12">
          <p className="text-slate-500">Unable to load history</p>
          <Link href="/rewards">
            <Button variant="outline" className="mt-4">
              Back to Rewards
            </Button>
          </Link>
        </div>
      </PageLayout>
    )
  }

  const { user, history } = initialData

  return (
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
  )
}
