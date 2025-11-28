"use client"

  import { useState } from "react"
  import { Eye, EyeOff } from "lucide-react"
  import { Input } from "@/components/ui/input"
  import { Button } from "@/components/ui/button"

  /**
   * PASSWORD INPUT WITH SHOW/HIDE TOGGLE
   *
   * Features:
   * - Eye icon button to toggle password visibility
   * - Switches between type="password" and type="text"
   * - Same styling as regular Input component
   *
   * Usage:
   * <PasswordInput
   *   value={password}
   *   onChange={(e) => setPassword(e.target.value)}
   *   placeholder="Enter password"
   * />
   */

  interface PasswordInputProps extends React.ComponentProps<typeof Input> {
    // All standard Input props are supported (value, onChange, placeholder, etc.)
  }

  export function PasswordInput({ className, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={className}
          {...props}
        />

        {/* Toggle button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-700 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          <span className="sr-only">
            {showPassword ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>
    )
  }
