// components/adm/data-display/AdminDescriptionList.tsx
// Description list for displaying key-value pairs (e.g., creator info, stats)

'use client'

import { ReactNode } from 'react'

// =============================================================================
// TYPES
// =============================================================================

interface DescriptionItem {
  label: string
  value: ReactNode
}

interface AdminDescriptionListProps {
  /** Title for the section (optional) */
  title?: string
  /** Items to display as key-value pairs */
  items: DescriptionItem[]
  /** Layout variant */
  variant?: 'horizontal' | 'grid'
  /** Number of columns for grid variant (default 2) */
  columns?: 2 | 3 | 4
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AdminDescriptionList - displays key-value pairs in a clean format
 *
 * Usage:
 * ```tsx
 * <AdminDescriptionList
 *   title="Creator Info"
 *   items={[
 *     { label: 'Total Sales', value: '$5,420' },
 *     { label: 'Current Tier', value: 'Gold' },
 *   ]}
 *   variant="grid"
 *   columns={2}
 * />
 * ```
 */
export function AdminDescriptionList({
  title,
  items,
  variant = 'grid',
  columns = 2
}: AdminDescriptionListProps) {
  // Grid column classes
  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }[columns]

  if (variant === 'horizontal') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        {title && (
          <h3 className="text-sm font-medium text-white mb-3">{title}</h3>
        )}
        <dl className="divide-y divide-white/10">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between py-2 first:pt-0 last:pb-0">
              <dt className="text-sm text-gray-400">{item.label}</dt>
              <dd className="text-sm font-medium text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  // Grid variant (default)
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      {title && (
        <h3 className="text-sm font-medium text-white mb-3">{title}</h3>
      )}
      <dl className={`grid ${gridColsClass} gap-4`}>
        {items.map((item, index) => (
          <div key={index}>
            <dt className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</dt>
            <dd className="mt-1 text-sm font-medium text-white">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// =============================================================================
// SINGLE STAT CARD (for prominent display)
// =============================================================================

interface AdminStatCardProps {
  label: string
  value: ReactNode
  /** Optional description below value */
  description?: string
  /** Highlight color for value */
  highlight?: 'default' | 'green' | 'red' | 'yellow'
}

/**
 * AdminStatCard - single prominent stat display
 */
export function AdminStatCard({
  label,
  value,
  description,
  highlight = 'default'
}: AdminStatCardProps) {
  const highlightClass = {
    default: 'text-white',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400'
  }[highlight]

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${highlightClass}`}>{value}</dd>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}
