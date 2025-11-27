'use client'

// =============================================================================
// TYPES
// =============================================================================

export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
}

interface AdminRadioGroupProps {
  legend: string
  description?: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  name: string
  inline?: boolean  // Display options inline (horizontal) or stacked (vertical)
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AdminRadioGroup - Radio button group
 * Based on TailwindPlus "Radio Groups - simple inline list"
 */
export function AdminRadioGroup({
  legend,
  description,
  options,
  value,
  onChange,
  name,
  inline = true
}: AdminRadioGroupProps) {
  return (
    <fieldset>
      <legend className="text-sm/6 font-semibold text-white">{legend}</legend>
      {description && (
        <p className="mt-1 text-sm/6 text-gray-400">{description}</p>
      )}
      <div
        className={`
          mt-4
          ${inline
            ? 'sm:flex sm:items-center sm:space-x-10 sm:space-y-0 space-y-4'
            : 'space-y-4'
          }
        `}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`
          const isSelected = value === option.value

          return (
            <div key={option.value} className="flex items-center">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                disabled={option.disabled}
                className={`
                  relative size-4 appearance-none rounded-full
                  border bg-white/5
                  before:absolute before:inset-1 before:rounded-full before:bg-white
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
                  disabled:border-white/5 disabled:bg-white/10 disabled:before:bg-white/20
                  forced-colors:appearance-auto forced-colors:before:hidden
                  ${isSelected
                    ? 'border-indigo-500 bg-indigo-500'
                    : 'border-white/10 before:hidden'
                  }
                  ${option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
              />
              <label
                htmlFor={optionId}
                className={`
                  ml-3 block text-sm/6 font-medium text-white
                  ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
              >
                {option.label}
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
