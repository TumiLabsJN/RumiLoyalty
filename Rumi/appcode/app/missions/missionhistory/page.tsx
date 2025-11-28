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
    import type { MissionHistoryResponse, MissionHistoryItem } from "@/app/types/missionhistory"

    export default function MissionHistoryPage() {
      /**
       * Mock API response matching MissionHistoryResponse interface
       * In production, this will be: const data = await fetch('/api/missions/history').then(r => r.json())
       */
      const mockApiResponse: MissionHistoryResponse = {
        user: {
          id: "user123",
          currentTier: "tier_3",
          currentTierName: "Gold",
          currentTierColor: "#F59E0B",
        },
        history: [
          // Mission data will go here
        ],
      }

      // Extract user info from API response
      const { currentTierName, currentTierColor } = mockApiResponse.user

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
            // Raffle shows checkmark for concluded, X for rejected
            if (status === "rejected_raffle") {
              return <XCircle className="h-8 w-8 text-red-500" />
            }
            return <CheckCircle2 className="h-8 w-8 text-green-600" />
          default:
            return <CheckCircle2 className={iconClass} />
        }
      }

      // Mock mission data (will be replaced by API response)
      mockApiResponse.history = [
        {
          id: "1",
          missionType: "sales_dollars",
          displayName: "Sales Sprint",
          status: "concluded",
          rewardType: "gift_card",
          rewardName: "$50 Gift Card",
          rewardSubtitle: "From: Sales Sprint mission",
          rewardSource: "mission",
          completedAt: "2024-12-15T10:30:00Z",
          completedAtFormatted: "Dec 15, 2024",
          claimedAt: "2024-12-15T10:35:00Z",
          claimedAtFormatted: "Dec 15, 2024",
          deliveredAt: "2024-12-17T14:00:00Z",
          deliveredAtFormatted: "Dec 17, 2024",
          raffleData: null,
        },
        {
          id: "2",
          missionType: "videos",
          displayName: "Lights, Camera, Go!",
          status: "concluded",
          rewardType: "commission_boost",
          rewardName: "+5% Commission Boost for 30 Days",
          rewardSubtitle: "From: Lights, Camera, Go! mission",
          rewardSource: "mission",
          completedAt: "2024-12-10T14:20:00Z",
          completedAtFormatted: "Dec 10, 2024",
          claimedAt: "2024-12-10T14:25:00Z",
          claimedAtFormatted: "Dec 10, 2024",
          deliveredAt: "2024-12-11T18:00:00Z",
          deliveredAtFormatted: "Dec 11, 2024",
          raffleData: null,
        },
        {
          id: "3",
          missionType: "raffle",
          displayName: "VIP Raffle",
          status: "rejected_raffle",
          rewardType: "physical_gift",
          rewardName: "AirPods Pro",
          rewardSubtitle: "From: VIP Raffle",
          rewardSource: "mission",
          completedAt: "2024-12-01T00:00:00Z",
          completedAtFormatted: "Dec 1, 2024",
          claimedAt: null,
          claimedAtFormatted: null,
          deliveredAt: null,
          deliveredAtFormatted: null,
          raffleData: {
            isWinner: false,
            drawDate: "2024-12-01T00:00:00Z",
            drawDateFormatted: "Dec 1, 2024",
            prizeName: "AirPods Pro",
          },
        },
        {
          id: "4",
          missionType: "likes",
          displayName: "Road to Viral",
          status: "concluded",
          rewardType: "gift_card",
          rewardName: "$25 Gift Card",
          rewardSubtitle: "From: Road to Viral mission",
          rewardSource: "mission",
          completedAt: "2024-11-28T09:15:00Z",
          completedAtFormatted: "Nov 28, 2024",
          claimedAt: "2024-11-28T09:20:00Z",
          claimedAtFormatted: "Nov 28, 2024",
          deliveredAt: "2024-11-30T10:00:00Z",
          deliveredAtFormatted: "Nov 30, 2024",
          raffleData: null,
        },
        {
          id: "5",
          missionType: "raffle",
          displayName: "VIP Raffle",
          status: "concluded",
          rewardType: "physical_gift",
          rewardName: "AirPods Pro",
          rewardSubtitle: "From: VIP Raffle",
          rewardSource: "mission",
          completedAt: "2024-11-25T16:45:00Z",
          completedAtFormatted: "Nov 25, 2024",
          claimedAt: "2024-11-25T16:50:00Z",
          claimedAtFormatted: "Nov 25, 2024",
          deliveredAt: "2024-11-27T14:00:00Z",
          deliveredAtFormatted: "Nov 27, 2024",
          raffleData: {
            isWinner: true,
            drawDate: "2024-11-25T16:45:00Z",
            drawDateFormatted: "Nov 25, 2024",
            prizeName: "AirPods Pro",
          },
        },
      ]

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
            {mockApiResponse.history.map((mission) => {
              // CARD STATE conditions
              const isRaffle = mission.missionType === "raffle"
              const isRejectedRaffle = mission.status === "rejected_raffle"
              const isConcluded = mission.status === "concluded"

              // CARD STATE: Rejected Raffle - Lost raffle entry
              // Applies when: missionType='raffle' AND status='rejected_raffle'
              const isRejectedRaffleCard = isRaffle && isRejectedRaffle

              // CARD STATE: Won Raffle - Concluded raffle prize
              // Applies when: missionType='raffle' AND status='concluded'
              const isWonRaffle = isRaffle && isConcluded

              // CARD STATE: Concluded Mission - Completed non-raffle missions
              // Applies when: missionType!='raffle' AND status='concluded'
              const isConcludedMission = !isRaffle && isConcluded

              // Card styling based on status
              const cardClass = cn(
                "p-5 rounded-xl border",
                // CARD STATE: Won Raffle & Concluded - Green background for concluded missions
                mission.status === "concluded" && "bg-green-50 border-green-200",
                // CARD STATE: Rejected Raffle - Red background for rejected raffles
                mission.status === "rejected_raffle" && "bg-red-50 border-red-200"
              )

              // Primary text (main message)
              let primaryText = ""
              // CARD STATE: Rejected Raffle - "Better luck next time" message
              if (isRejectedRaffleCard) {
                primaryText = "Better luck next time"
              }
              // CARD STATE: Won Raffle - "Prize delivered" message
              else if (isWonRaffle) {
                primaryText = "Prize delivered"
              }
              // CARD STATE: Concluded Mission - No primary text needed
              // (removed rewardSubtitle display per design decision)

              // Secondary text (date line)
              let secondaryText = ""
              // CARD STATE: Rejected Raffle - Shows raffle date
              if (isRejectedRaffleCard && mission.raffleData?.drawDateFormatted) {
                secondaryText = `Raffle date: ${mission.raffleData.drawDateFormatted}`
              } else if (mission.completedAtFormatted) {
                secondaryText = `Completed: ${mission.completedAtFormatted}`
              }

              return (
                <div key={mission.id} className={cardClass}>
                  {/* Top Row: Icon */}
                  {/* CARD STATE: Rejected Raffle - Shows XCircle icon in red */}
                  {/* CARD STATE: Won Raffle - Shows CheckCircle2 icon in green */}
                  {/* CARD STATE: Concluded - Shows mission type icon in green */}
                  <div className="flex items-start justify-between mb-3">
                    {getIconForMissionType(mission.missionType, mission.status)}
                  </div>

                  {/* Mission Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{mission.displayName}</h3>

                  {/* Primary Message */}
                  {/* CARD STATE: Rejected Raffle - Red semibold text */}
                  {primaryText && (
                    <p className={cn(
                      "text-base mb-1",
                      isRejectedRaffle ? "text-red-700 font-semibold" : "text-slate-600"
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
                  {/* CARD STATE: Won Raffle - Shows prize with gift emoji */}
                  {/* CARD STATE: Concluded - Shows reward with checkmark */}
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
          {mockApiResponse.history.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-base">No completed missions yet</p>
              <p className="text-slate-400 text-sm mt-1">Keep working on your active missions!</p>
            </div>
          )}
        </PageLayout>
      )
    }
