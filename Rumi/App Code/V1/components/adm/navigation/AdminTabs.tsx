'use client'

import { useRouter, useSearchParams } from 'next/navigation'

// =============================================================================
// TYPES
// =============================================================================

export interface Tab {
  id: string
  label: string
  count?: number
}

interface AdminTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange?: (tabId: string) => void
  paramName?: string  // URL param name for tab (default: 'tab')
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminTabs({
  tabs,
  activeTab,
  onTabChange,
  paramName = 'tab'
}: AdminTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    } else {
      // Update URL param
      const params = new URLSearchParams(searchParams.toString())
      params.set(paramName, tabId)
      router.push(`?${params.toString()}`)
    }
  }

  return (
    <div>
      {/* Mobile dropdown */}
      <div className="grid grid-cols-1 sm:hidden">
        <select
          aria-label="Select a tab"
          value={activeTab}
          onChange={(e) => handleTabClick(e.target.value)}
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 py-2 pr-8 pl-3 text-base text-gray-100 outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id} className="bg-gray-800">
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-400"
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="border-b border-white/10">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap
                    ${isActive
                      ? 'border-indigo-400 text-indigo-400'
                      : 'border-transparent text-gray-400 hover:border-white/20 hover:text-gray-200'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-2 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`}>
                      ({tab.count})
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
