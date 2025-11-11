"use client"

  import { BottomNavigation } from "@/components/bottom-navigation"
  import { cn } from "@/lib/utils"

  interface PageLayoutProps {
    /**
     * Page title displayed in purple header section
     * @example "Rewards", "Missions", "Tiers"
     */
    title: string

    /**
     * Optional content to display in purple header below title
     * @example Tier badge, user info, filters, etc.
     *
     * DESIGN RULE: All headerContent must fit within 50px height
     * Content that exceeds this height will be clipped
     */
    headerContent?: React.ReactNode

    /**
     * Main page content
     */
    children: React.ReactNode

    /**
     * Optional additional classes for content container
     */
    className?: string
  }

  export function PageLayout({ title, headerContent, children, className }: PageLayoutProps) {
    return (
      <div className="min-h-screen bg-white pb-20">
        {/* Purple Header Section */}
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 px-6 pt-8 pb-6">
          <div className="max-w-[600px] mx-auto">
            <h1 className="text-2xl font-semibold text-white mb-4">{title}</h1>

            {/*
              FIXED HEIGHT CONTAINER - Always 50px regardless of content
              DESIGN RULE: All headerContent must fit within 50px height
              Content that exceeds this height will be clipped
            */}
            <div className="h-[50px] flex items-center overflow-hidden">
              {headerContent}
            </div>

            {/* Bottom spacer - always present */}
            <div className="h-[17px]"></div>
          </div>
        </div>

        {/* White Content Section */}
        <div className="rounded-t-3xl bg-white -mt-4">
          <div className={cn("max-w-[600px] mx-auto p-4", className)}>
            <div className="space-y-6">{children}</div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    )
  }
