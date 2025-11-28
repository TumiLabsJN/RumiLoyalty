"use client"

  import type React from "react"

  import { BottomNavigation } from "@/components/bottom-navigation"
  import { cn } from "@/lib/utils"

  interface HomePageLayoutProps {
    /** Page title - "Hi, @{handle}" */
    title: string

    /** Main page content */
    children: React.ReactNode

    /** Optional additional classes for content container */
    className?: string

    /** Header gradient color (admin-configurable, defaults to purple) */
    headerGradient?: string
  }

  export function HomePageLayout({
    title,
    children,
    className,
    headerGradient = "from-purple-600 to-purple-700",
  }: HomePageLayoutProps) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* Compact Purple Header Section (Half Size) */}
        <div className={cn("bg-gradient-to-br px-6 pt-8 pb-6", headerGradient)}>
          <div className="max-w-[600px] mx-auto">
            <h1 className="text-xl font-semibold text-white">{title}</h1>

            {/* Small bottom spacer */}
            <div className="h-[17px]"></div>
          </div>
        </div>

        {/* Gray Content Section (Uber-style) */}
        <div className="rounded-t-3xl bg-gray-100 -mt-4">
          <div className={cn("max-w-[600px] mx-auto p-4", className)}>
            <div className="space-y-6">{children}</div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </div>
    )
  }
