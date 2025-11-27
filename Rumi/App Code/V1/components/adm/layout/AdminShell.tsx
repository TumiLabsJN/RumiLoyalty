'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Gift,
  Target,
  Crown,
  DollarSign,
  Search,
  RefreshCw,
  FileText,
  X,
  Menu
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Redemptions', href: '/admin/redemptions', icon: Gift },
  { name: 'Missions', href: '/admin/missions', icon: Target },
  { name: 'VIP Rewards', href: '/admin/vip-rewards', icon: Crown },
  { name: 'Sales Adj.', href: '/admin/sales-adjustments', icon: DollarSign },
  { name: 'Creator Lookup', href: '/admin/creator-lookup', icon: Search },
  { name: 'Data Sync', href: '/admin/data-sync', icon: RefreshCw },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
]

interface AdminShellProps {
  children: React.ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="absolute top-0 right-0 -mr-12 pt-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="-m-2.5 p-2.5 text-white"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="size-6" />
          </button>
        </div>

        {/* Mobile sidebar content */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-2 ring-1 ring-white/10">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-xl font-bold text-white">Rumi Admin</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold ${
                            active
                              ? 'bg-white/5 text-white'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon
                            className={`size-6 shrink-0 ${
                              active ? 'text-white' : 'text-gray-400 group-hover:text-white'
                            }`}
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden bg-gray-900 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-black/10 px-6">
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-xl font-bold text-white">Rumi Admin</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold ${
                            active
                              ? 'bg-white/5 text-white'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon
                            className={`size-6 shrink-0 ${
                              active ? 'text-white' : 'text-gray-400 group-hover:text-white'
                            }`}
                          />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="-m-2.5 p-2.5 text-gray-400 hover:text-white"
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="size-6" />
        </button>
        <div className="flex-1 text-sm/6 font-semibold text-white">
          {navigation.find((item) => isActive(item.href))?.name || 'Admin'}
        </div>
      </div>

      {/* Main content */}
      <main className="py-10 lg:pl-72">
        <div className="px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
