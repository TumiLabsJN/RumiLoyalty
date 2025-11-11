"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Gift, Target, Award, User } from "lucide-react"

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  ariaLabel: string
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", href: "/home", ariaLabel: "Navigate to Home" },
  { icon: Gift, label: "Rewards", href: "/rewards", ariaLabel: "Navigate to Rewards" },
  { icon: Target, label: "Missions", href: "/missions", ariaLabel: "Navigate to Missions" },
  { icon: Award, label: "Tiers", href: "/tiers", ariaLabel: "Navigate to Tiers" },
  { icon: User, label: "Profile", href: "/login/start", ariaLabel: "Navigate to Profile" },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-evenly h-full max-w-[600px] mx-auto py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[60px] gap-1 transition-colors duration-150 relative",
                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600",
              )}
              aria-label={item.ariaLabel}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600" />}
              <IconComponent className="h-6 w-6" aria-hidden="true" />
              <span className={cn("text-xs", isActive ? "font-medium" : "")}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
