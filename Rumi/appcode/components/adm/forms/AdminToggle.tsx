'use client'

// =============================================================================
// TYPES
// =============================================================================

interface AdminToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AdminToggle - Toggle switch with label
 * Based on TailwindPlus "Toggles - With right label"
 */
export function AdminToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id
}: AdminToggleProps) {
  const toggleId = id || label.toLowerCase().replace(/\s+/g, '-')
  const labelId = `${toggleId}-label`
  const descriptionId = description ? `${toggleId}-description` : undefined

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        className={`
          group relative inline-flex w-11 shrink-0 rounded-full p-0.5
          outline-offset-2 outline-indigo-500
          transition-colors duration-200 ease-in-out
          ${checked ? 'bg-indigo-500' : 'bg-white/5 ring-1 ring-inset ring-white/10'}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span
          className={`
            size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
        <input
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          className="absolute inset-0 appearance-none focus:outline-none"
        />
      </div>

      <div className="flex-1 text-sm">
        <label
          id={labelId}
          htmlFor={toggleId}
          className={`font-medium text-white ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label}
        </label>
        {description && (
          <span id={descriptionId} className="ml-1 text-gray-400">
            {description}
          </span>
        )}
      </div>
    </div>
  )
}
