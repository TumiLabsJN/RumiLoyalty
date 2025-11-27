'use client'

import { forwardRef } from 'react'

// =============================================================================
// TYPES
// =============================================================================

interface AdminInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  description?: string
  error?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AdminInput - Form input with label
 * Based on TailwindPlus "Input Groups - Input with label"
 */
export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  ({ label, description, error, id, ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm/6 font-medium text-white"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-sm/6 text-gray-400">{description}</p>
        )}
        <div className="mt-2">
          <input
            ref={ref}
            id={inputId}
            className={`
              block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white
              outline-1 -outline-offset-1 outline-white/10
              placeholder:text-gray-500
              focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500
              disabled:cursor-not-allowed disabled:opacity-50
              sm:text-sm/6
              ${error ? 'outline-red-500' : ''}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

AdminInput.displayName = 'AdminInput'
