'use client'

import { ReactNode } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface AdminTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (item: T) => void
  highlightId?: string
  emptyMessage?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminTable<T extends object>({
  columns,
  data,
  keyField,
  onRowClick,
  highlightId,
  emptyMessage = 'No data available'
}: AdminTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <table className="min-w-full divide-y divide-white/15">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-3 py-3.5 text-left text-sm font-semibold text-white first:pl-4 first:sm:pl-0 last:pr-4 last:sm:pr-0 ${column.className || ''}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.map((item) => {
                const itemId = String(item[keyField])
                const isHighlighted = highlightId === itemId

                return (
                  <tr
                    key={itemId}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      ${onRowClick ? 'cursor-pointer hover:bg-white/5' : ''}
                      ${isHighlighted ? 'bg-indigo-500/10' : ''}
                    `}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-4 text-sm whitespace-nowrap first:pl-4 first:sm:pl-0 last:pr-4 last:sm:pr-0 ${column.className || ''}`}
                      >
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
