"use client"

  import { ArrowUpNarrowWide, HandCoins, Gift, TicketPercent, Lock, Loader2 } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import { cn } from "@/lib/utils"

  interface RewardCardProps {
    type: "reach-boost" | "pay-boost" | "gift-card" | "deal-boost"
    name: string
    description: string
    amount: string | number
    status: "available" | "redeeming" | "locked" | "redeemed"
    requiredTier?: string
    onRedeem?: () => void
  }

  export function RewardCard({ type, name, description, status, requiredTier, onRedeem }: RewardCardProps) {
    // Map reward type to icon
    const getIcon = () => {
      if (status === "locked") {
        return <Lock className="h-6 w-6 text-slate-400" />
      }

      const icons = {
        "reach-boost": ArrowUpNarrowWide,
        "pay-boost": HandCoins,
        "gift-card": Gift,
        "deal-boost": TicketPercent,
      }
      const Icon = icons[type]

      return (
        <Icon
          className={cn(
            "h-6 w-6",
            status === "redeeming" && "text-amber-500",
            status === "redeemed" && "text-slate-300",
            !["redeeming", "redeemed"].includes(status) && "text-slate-400",
          )}
        />
      )
    }

    // Card styling based on status
    const cardClass = cn(
      "flex items-center justify-between p-4 rounded-lg border",
      status === "available" && "bg-slate-50 border-slate-200",
      status === "redeeming" && "bg-amber-50 border-amber-200",
      status === "locked" && "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed",
      status === "redeemed" && "bg-slate-50 border-slate-200 opacity-50",
    )

    return (
      <div className={cardClass}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <h4 className={cn("text-sm font-semibold", status === "redeemed" ? "text-slate-400" : "text-slate-900")}>
              {name}
            </h4>
            <p className={cn("text-xs", status === "redeemed" ? "text-slate-400" : "text-slate-600")}>{description}</p>

            {status === "redeeming" && (
              <p className="text-xs text-amber-600 font-medium mt-1">⏳ Redeeming</p>
            )}

            {status === "redeemed" && <p className="text-xs text-green-600 font-medium mt-1">✓ Completed</p>}
          </div>
        </div>

        <div>
          {status === "available" && (
            <Button
              onClick={onRedeem}
              className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-sm px-4 py-2 rounded-lg font-medium"
            >
              Redeem
            </Button>
          )}

          {status === "redeeming" && (
            <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          )}

          {status === "locked" && (
            <div className="bg-slate-100 text-slate-500 px-3 py-2 rounded-lg text-xs font-medium">
              🔒 {requiredTier || "Higher Tier"}
            </div>
          )}

          {status === "redeemed" && (
            <div className="bg-slate-100 text-slate-400 px-3 py-2 rounded-lg text-xs font-medium">✓ Redeemed</div>
          )}
        </div>
      </div>
    )
  }
