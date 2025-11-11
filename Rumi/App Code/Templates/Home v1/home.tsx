"use client"
  import { Card, CardContent } from "@/components/ui/card"
  import { Progress } from "@/components/ui/progress"
  import { TrendingUp, Calendar, DollarSign, Video, Eye, Heart, MessageCircle, Trophy } from "lucide-react"
  import { PageLayout } from "@/components/pagelayout"

  export default function Home() {
    // Mock data (replace with API call later)
    const mockData = {
      handle: "creatorpro",
      currentTier: {
        name: "Gold",
        stars: 3,
        achievedDate: "November 15, 2024",
      },
      nextTier: {
        name: "Platinum",
        salesRequired: 5000,
      },
      progress: {
        currentSales: 4200,
        targetSales: 5000,
        percentage: 84,
        amountNeeded: 800,
      },
      checkpoint: {
        daysRemaining: 73,
        currentLevel: "Gold",
        maintenanceAmount: 3000,
      },
      performance: {
        salesAmount: 4200,
        videosPosted: 45,
        totalViews: 1200000,
        totalLikes: 85000,
        totalComments: 12300,
        periodStart: "Nov 15",
        periodEnd: "Today",
      },
    }

    // Utility functions
    const formatNumber = (num: number): string => {
      return num.toLocaleString()
    }

    const formatLargeNumber = (num: number): string => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`
      }
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
      }
      return num.toLocaleString()
    }

    return (
      <PageLayout
        title={`Hi, @${mockData.handle}`}
        headerContent={
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="text-white font-semibold">{mockData.currentTier.name}</span>
          </div>
        }
      >
        {/* Progress to Next Tier Card */}
        <Card className="bg-gradient-to-b from-slate-50 to-white rounded-xl px-0 py-0.5">
          <CardContent className="px-6 pb-6 pt-4">
            <div className="space-y-4">
              {/* Progress Section */}
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 leading-7 mx-0 px-0 border-0">
                  Progress to {mockData.nextTier.name}
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    ${formatNumber(mockData.progress.currentSales)} / ${formatNumber(mockData.progress.targetSales)}
                  </span>
                  <span className="font-semibold text-slate-900">{mockData.progress.percentage}%</span>
                </div>
                <Progress
                  value={mockData.progress.percentage}
                  className="h-2 bg-slate-100 [&>div]:bg-blue-600"
                  aria-label={`Progress: ${mockData.progress.percentage}%`}
                />
              </div>

              <p className="text-sm text-emerald-600 font-medium">
                ↗ ${formatNumber(mockData.progress.amountNeeded)} more needed
              </p>
            </div>

            {/* Checkpoint Section */}
            <div className="pt-4 space-y-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Next Checkpoint: <span className="font-semibold">{mockData.checkpoint.daysRemaining} days</span>
                </span>
              </div>
              <p className={mockData.checkpoint.daysRemaining < 30 ? "text-xs text-amber-600" : "text-xs text-slate-500"}>
                Sell ${formatNumber(mockData.checkpoint.maintenanceAmount)} within this time to maintain{" "}
                {mockData.checkpoint.currentLevel} benefits!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Section - Border Only (No Card) */}
        <div className="space-y-3 pt-2">
          <div className="pb-2 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Performance</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wide mt-1">
              {mockData.performance.periodStart} - {mockData.performance.periodEnd}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sales */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-emerald-50 to-emerald-100 px-3 py-2 rounded-full border border-emerald-200">
              <DollarSign className="h-4 w-4 text-emerald-700" />
              <span className="font-bold text-slate-900 text-sm">${formatLargeNumber(mockData.performance.salesAmount)}</span>
              <span className="text-slate-600 text-xs">Sales</span>
            </div>

            {/* Videos */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-purple-50 to-purple-100 px-3 py-2 rounded-full border border-purple-200">
              <Video className="h-4 w-4 text-purple-700" />
              <span className="font-bold text-slate-900 text-sm">{formatNumber(mockData.performance.videosPosted)}</span>
              <span className="text-slate-600 text-xs">Videos</span>
            </div>

            {/* Views */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-blue-50 to-blue-100 px-3 py-2 rounded-full border border-blue-200">
              <Eye className="h-4 w-4 text-blue-700" />
              <span className="font-bold text-slate-900 text-sm">{formatLargeNumber(mockData.performance.totalViews)}</span>
              <span className="text-slate-600 text-xs">Views</span>
            </div>

            {/* Likes */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-rose-50 to-rose-100 px-3 py-2 rounded-full border border-rose-200">
              <Heart className="h-4 w-4 text-rose-700" />
              <span className="font-bold text-slate-900 text-sm">{formatLargeNumber(mockData.performance.totalLikes)}</span>
              <span className="text-slate-600 text-xs">Likes</span>
            </div>

            {/* Comments */}
            <div className="flex items-center gap-2 bg-gradient-to-br from-amber-50 to-amber-100 px-3 py-2 rounded-full border border-amber-200">
              <MessageCircle className="h-4 w-4 text-amber-700" />
              <span className="font-bold text-slate-900 text-sm">{formatLargeNumber(mockData.performance.totalComments)}</span>
              <span className="text-slate-600 text-xs">Comments</span>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }
