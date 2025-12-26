"use client"
import {
  Trophy,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Video,
  Heart,
  Eye,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/pagelayout"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { MissionHistoryResponse, MissionHistoryItem } from "@/app/types/missionhistory"

/**
 * Mission History Client Component
 *
 * Renders mission history data passed from Server Component.
 * Handles error state and empty state.
 *
 * References:
 * - ENH-005: MissionHistoryServerFetchEnhancement.md
 * - Pattern source: app/missions/missions-client.tsx
 */

// Props interface for server-passed data
interface MissionHistoryClientProps {
  initialData: MissionHistoryResponse | null
  error: string | null
}

// Named export for use by Server Component
export function MissionHistoryClient({ initialData, error }: MissionHistoryClientProps) {
  // Error state
  if (error || !initialData) {
    return (
      <PageLayout title="Mission History">
        <Link href="/missions">
          <Button variant="ghost" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Missions
          </Button>
        </Link>
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600 text-base">{error || "Failed to load mission history"}</p>
        </div>
      </PageLayout>
    )
  }

  // Extract user info from API response
  const { currentTierName, currentTierColor } = initialData.user

  // Map backend mission types to frontend icons
  const getIconForMissionType = (missionType: string, status: string) => {
    const iconClass = cn(
      "h-8 w-8",
      status === "concluded" && "text-green-600",
      status === "rejected_raffle" && "text-red-500"
    )

    // Backend missionType → Frontend icon mapping
    switch (missionType) {
      case "sales_dollars":
      case "sales_units":
        return <TrendingUp className={iconClass} />
      case "videos":
        return <Video className={iconClass} />
      case "likes":
        return <Heart className={iconClass} />
      case "views":
        return <Eye className={iconClass} />
      case "raffle":
        // Raffle shows X for rejected/missed, checkmark for won
        if (status === "rejected_raffle") {
          return <XCircle className="h-8 w-8 text-red-500" />
        }
        if (status === "missed_raffle") {
          return <XCircle className="h-8 w-8 text-amber-500" />
        }
        return <CheckCircle2 className="h-8 w-8 text-green-600" />
      default:
        return <CheckCircle2 className={iconClass} />
    }
  }

  return (
    <PageLayout
      title="Mission History"
      headerContent={
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
          <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
          <span className="text-base font-semibold text-white">{currentTierName}</span>
        </div>
      }
    >
      {/* Back Button */}
      <Link href="/missions">
        <Button variant="ghost" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Missions
        </Button>
      </Link>

      {/* Page Title */}
      <h2 className="text-xl font-semibold text-slate-900 mb-6">Completed Missions</h2>

      {/* Historic Mission Cards */}
      <div className="space-y-4">
        {initialData.history.map((mission) => {
          // CARD STATE conditions
          const isRaffle = mission.missionType === "raffle"
          const isRejectedRaffle = mission.status === "rejected_raffle"
          const isConcluded = mission.status === "concluded"

          // CARD STATE: Rejected Raffle - Lost raffle entry
          const isRejectedRaffleCard = isRaffle && isRejectedRaffle

          // CARD STATE: Missed Raffle - Eligible but didn't participate (GAP-RAFFLE-001)
          const isMissedRaffleCard = isRaffle && mission.status === "missed_raffle"

          // CARD STATE: Won Raffle - Concluded raffle prize
          const isWonRaffle = isRaffle && isConcluded

          // Card styling based on status
          const cardClass = cn(
            "p-5 rounded-xl border",
            // CARD STATE: Won Raffle & Concluded - Green background
            mission.status === "concluded" && "bg-green-50 border-green-200",
            // CARD STATE: Rejected Raffle - Red background
            mission.status === "rejected_raffle" && "bg-red-50 border-red-200",
            // CARD STATE: Missed Raffle - Amber background (GAP-RAFFLE-001)
            mission.status === "missed_raffle" && "bg-amber-50 border-amber-200"
          )

          // Primary text (main message)
          let primaryText = ""
          if (isRejectedRaffleCard) {
            primaryText = "Better luck next time"
          } else if (isMissedRaffleCard) {
            primaryText = "Missed Raffle Participation"
          } else if (isWonRaffle) {
            primaryText = "Prize delivered"
          }

          // Secondary text (date line)
          let secondaryText = ""
          if (isRejectedRaffleCard && mission.raffleData?.drawDateFormatted) {
            secondaryText = `Raffle date: ${mission.raffleData.drawDateFormatted}`
          } else if (isMissedRaffleCard && mission.raffleData?.drawDateFormatted) {
            secondaryText = `Raffle date: ${mission.raffleData.drawDateFormatted}`
          } else if (mission.completedAtFormatted) {
            secondaryText = `Completed: ${mission.completedAtFormatted}`
          }

          return (
            <div key={mission.id} className={cardClass}>
              {/* Top Row: Icon */}
              <div className="flex items-start justify-between mb-3">
                {getIconForMissionType(mission.missionType, mission.status)}
              </div>

              {/* Mission Title */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">{mission.displayName}</h3>

              {/* Primary Message */}
              {primaryText && (
                <p className={cn(
                  "text-base mb-1",
                  isRejectedRaffle ? "text-red-700 font-semibold" :
                  isMissedRaffleCard ? "text-amber-700 font-semibold" : "text-slate-600"
                )}>
                  {primaryText}
                </p>
              )}

              {/* Secondary Text (Date info) */}
              {secondaryText && (
                <p className="text-sm text-slate-500 mb-2">
                  {secondaryText}
                </p>
              )}

              {/* Reward Name (what they earned) */}
              {mission.rewardName && (
                <p className="text-sm text-green-700 font-medium">
                  {isRaffle ? `🎁 ${mission.rewardName}` : `✅ ${mission.rewardName}`}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State (if no history) */}
      {initialData.history.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-base">No completed missions yet</p>
          <p className="text-slate-400 text-sm mt-1">Keep working on your active missions!</p>
        </div>
      )}
    </PageLayout>
  )
}
