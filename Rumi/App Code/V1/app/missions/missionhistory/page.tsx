"use client"
    import {
      Trophy,
      ArrowLeft,
      CheckCircle2,
      TrendingUp,
      Video,
      Heart,
      Eye,
      Ticket,
      XCircle,
    } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import { cn } from "@/lib/utils"
    import Link from "next/link"

    export default function MissionHistoryPage() {
      const currentTier = "Gold" // Current VIP level (dynamic from backend)

      // Tier colors (matches VIP level)
      const tierColors = {
        Bronze: "#CD7F32",
        Silver: "#94a3b8",
        Gold: "#F59E0B",
        Platinum: "#818CF8",
      }

      const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

      // Map backend mission types to frontend icons
      const getIconForMissionType = (missionType: string, status: string) => {
        const iconClass = cn(
          "h-8 w-8",
          status === "fulfilled" && "text-green-600",
          status === "lost" && "text-red-500"
        )

        // Backend mission_type → Frontend icon mapping
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
            // Raffle shows checkmark for fulfilled, X for lost
            if (status === "lost") {
              return <XCircle className="h-8 w-8 text-red-500" />
            }
            return <CheckCircle2 className="h-8 w-8 text-green-600" />
          default:
            return <CheckCircle2 className={iconClass} />
        }
      }

      /**
       * Historic missions from backend API (GET /api/missions/history)
       * Backend sends missions with status = "fulfilled" OR "lost"
       *
       * DYNAMIC FIELDS (from backend):
       * - mission_type: Backend mission type identifier (sales/videos/likes/views/raffle)
       * - display_name: Mission title (DYNAMIC for regular missions, HARDCODED "VIP Raffle" for raffles)
       * - description: Mission description (for display)
       * - final_progress: Final achievement value (e.g., "$2,000", "15 videos", null for raffle)
       * - reward_description: What user earned (null for lost raffles, use for raffle prize display)
       * - status: fulfilled | lost (ONLY these two statuses in history)
       * - fulfilled_at: Timestamp when mission completed/raffle finished (dynamic from backend)
       */
      const historicMissions = [
        {
          id: "1",
          mission_type: "sales",
          display_name: "Unlock Payday",
          description: "Reached sales target",
          final_progress: "$2,000",
          reward_description: "$50 Bonus",
          status: "fulfilled" as const,
          fulfilled_at: "2024-12-15T10:30:00Z",
        },
        {
          id: "2",
          mission_type: "videos",
          display_name: "Lights, Camera, Go!",
          description: "Posted required clips",
          final_progress: "15 videos",
          reward_description: "Reach Boost",
          status: "fulfilled" as const,
          fulfilled_at: "2024-12-10T14:20:00Z",
        },
        {
          id: "3",
          mission_type: "raffle",
          display_name: "VIP Raffle",
          description: "Better luck next time",
          final_progress: null,
          reward_description: null,
          status: "lost" as const,
          fulfilled_at: "2024-12-01T00:00:00Z",
        },
        {
          id: "4",
          mission_type: "likes",
          display_name: "Road to Viral",
          description: "Reached like target",
          final_progress: "1,000 likes",
          reward_description: "$25 Gift Card",
          status: "fulfilled" as const,
          fulfilled_at: "2024-11-28T09:15:00Z",
        },
        {
          id: "5",
          mission_type: "raffle",
          display_name: "VIP Raffle",
          description: "Prize delivered",
          final_progress: null,
          reward_description: "AirPods Pro",
          status: "fulfilled" as const,
          fulfilled_at: "2024-11-25T16:45:00Z",
        },
      ]

      // Format date helper
      const formatDate = (isoString: string | null): string => {
        if (!isoString) return ""
        const date = new Date(isoString)
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      }

      return (
        <PageLayout
          title="Mission History"
          headerContent={
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
              <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
              <span className="text-base font-semibold text-white">{currentTier}</span>
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
            {historicMissions.map((mission) => {
              // Card styling based on status
              const cardClass = cn(
                "p-5 rounded-xl border",
                mission.status === "fulfilled" && "bg-green-50 border-green-200",
                mission.status === "lost" && "bg-red-50 border-red-200"
              )

              const isRaffle = mission.mission_type === "raffle"
              const isLost = mission.status === "lost"

              // Primary text (main message)
              let primaryText = mission.description
              if (isRaffle && isLost) {
                primaryText = "Better luck next time"
              } else if (isRaffle && mission.status === "fulfilled") {
                primaryText = "Prize delivered"
              }

              // Secondary text (date line)
              let secondaryText = ""
              if (isRaffle && isLost && mission.fulfilled_at) {
                secondaryText = `Raffle date: ${formatDate(mission.fulfilled_at)}`
              } else if (mission.fulfilled_at) {
                secondaryText = `Completed: ${formatDate(mission.fulfilled_at)}`
              }

              return (
                <div key={mission.id} className={cardClass}>
                  {/* Top Row: Icon */}
                  <div className="flex items-start justify-between mb-3">
                    {getIconForMissionType(mission.mission_type, mission.status)}

                    {/* Date Badge (for non-raffle missions) */}
                    {!isRaffle && mission.fulfilled_at && (
                      <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-medium">
                        {formatDate(mission.fulfilled_at)}
                      </div>
                    )}
                  </div>

                  {/* Mission Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{mission.display_name}</h3>

                  {/* Primary Message */}
                  <p className={cn(
                    "text-base mb-1",
                    isLost ? "text-red-700 font-semibold" : "text-slate-600"
                  )}>
                    {primaryText}
                  </p>

                  {/* Secondary Text (Date info) */}
                  {secondaryText && (
                    <p className="text-sm text-slate-500 mb-2">
                      {secondaryText}
                    </p>
                  )}

                  {/* Final Progress (only for non-raffle fulfilled missions) */}
                  {!isRaffle && mission.final_progress && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-semibold">Achievement:</span> {mission.final_progress}
                    </p>
                  )}

                  {/* Reward Description (what they earned) */}
                  {mission.reward_description && (
                    <p className="text-sm text-green-700 font-medium">
                      {isRaffle ? `🎁 ${mission.reward_description}` : `✅ ${mission.reward_description}`}
                    </p>
                  )}

                  {/* For lost raffles, show what prize was */}
                  {isRaffle && isLost && mission.reward_description && (
                    <p className="text-xs text-slate-500 mt-2">
                      Prize: {mission.reward_description}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Empty State (if no history) */}
          {historicMissions.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-base">No completed missions yet</p>
              <p className="text-slate-400 text-sm mt-1">Keep working on your active missions!</p>
            </div>
          )}
        </PageLayout>
      )
    }
