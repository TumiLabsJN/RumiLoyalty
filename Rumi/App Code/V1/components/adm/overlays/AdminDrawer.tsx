'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface AdminDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminDrawer({
  open,
  onClose,
  title,
  children,
  footer
}: AdminDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/80 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
        <div
          ref={drawerRef}
          className="w-screen max-w-md transform transition-transform duration-300 ease-in-out"
        >
          <div className="relative flex h-full flex-col divide-y divide-white/10 bg-gray-800 shadow-xl">
            {/* Left border */}
            <div className="absolute inset-y-0 left-0 w-px bg-white/10" />

            {/* Header */}
            <div className="flex items-start justify-between px-4 py-6 sm:px-6">
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <div className="ml-3 flex h-7 items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="relative rounded-md text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  <span className="absolute -inset-2.5" />
                  <span className="sr-only">Close panel</span>
                  <X className="size-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="relative flex-1 px-4 py-6 sm:px-6">
                {children}
              </div>
            </div>

            {/* Footer (sticky) */}
            {footer && (
              <div className="flex shrink-0 justify-end gap-3 px-4 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

/** Button for drawer footer - Cancel style */
export function DrawerCancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/10 hover:bg-white/20"
    >
      Cancel
    </button>
  )
}

/** Button for drawer footer - Primary action style */
export function DrawerActionButton({
  onClick,
  children,
  disabled = false
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex justify-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

/** Description list for drawer content */
export function DrawerDescriptionList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="space-y-4">
      {children}
    </dl>
  )
}

/** Description list item */
export function DrawerDescriptionItem({
  label,
  value
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  )
}

/** Section divider for drawer content */
export function DrawerSection({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}
