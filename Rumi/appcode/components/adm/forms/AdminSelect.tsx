'use client'

import { forwardRef } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface AdminSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string
  description?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AdminSelect - Form dropdown with label
 * Based on TailwindPlus "Select Menus - simple native"
 */
export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
  ({ label, description, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div>
        <label
          htmlFor={selectId}
          className="block text-sm/6 font-medium text-white"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-sm/6 text-gray-400">{description}</p>
        )}
        <div className="mt-2 grid grid-cols-1">
          <select
            ref={ref}
            id={selectId}
            className={`
              col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5
              py-1.5 pr-8 pl-3 text-base text-white
              outline-1 -outline-offset-1 outline-white/10
              *:bg-gray-800
              focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500
              disabled:cursor-not-allowed disabled:opacity-50
              sm:text-sm/6
              ${error ? 'outline-red-500' : ''}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-400 sm:size-4"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            />
          </svg>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

AdminSelect.displayName = 'AdminSelect'
