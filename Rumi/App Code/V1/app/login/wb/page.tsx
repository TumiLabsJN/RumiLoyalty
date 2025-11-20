"use client"

  import { Button } from "@/components/ui/button"
  import { PasswordInput } from "@/components/passwordinput"
  import { AuthLayout } from "@/components/authlayout"
  import { Loader2, AlertCircle } from "lucide-react"
  import { useRouter } from "next/navigation"
  import { useState, useEffect } from "react"
  import type { LoginRequest, LoginResponse, AuthErrorResponse } from "@/types/auth"

  /**
   * LOGIN PAGE - User Authentication
   *
   * Collects password (TikTok handle from previous screen via session)
   *
   * Dynamic Fields (from backend via session):
   * - handle: TikTok handle from server-side session
   * - logoUrl: Client-specific branding (clients.logo_url)
   * - privacyPolicyUrl: Client-specific privacy page (clients.privacy_policy_url)
   *
   * Features:
   * - Password input with show/hide toggle
   * - Loading modal during signin
   * - Inline error handling (red border + message)
   * - Forgot password link
   * - Auto-clears error when user starts typing
   *
   * Frontend Validation:
   * - Password: minimum 8 characters
   */

  export default function LoginPage() {
    const router = useRouter()

    const [password, setPassword] = useState("")
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [error, setError] = useState("")

    // Get handle from sessionStorage (client-side only)
    const [handle, setHandle] = useState<string>("")

    useEffect(() => {
      const storedHandle = sessionStorage.getItem('userHandle')
      if (!storedHandle) {
        // No handle found, redirect to start page
        router.push('/login/start')
      } else {
        setHandle(storedHandle)
      }
    }, [router])

    // Form validation: Only password length check
    const isFormValid = password.length >= 8 && handle !== ""

    const logoUrl = "/images/fizee-logo.png"
    const privacyPolicyUrl = "/privacy-policy"

    // ============================================
    // FORM SUBMISSION
    // ============================================

    const handleContinue = async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      if (!isFormValid) return

      setIsSigningIn(true)
      setError("") // Clear any previous errors

      try {
        // API call: POST /api/auth/login
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle, password } satisfies LoginRequest)
        })

        if (!response.ok) {
          const errorData = (await response.json()) as AuthErrorResponse
          throw new Error(errorData.message || 'Login failed')
        }

        const data = (await response.json()) as LoginResponse

        // Success - session created, backend sets auth cookie
        if (data.success) {
          // Route to home page (or loading page for smooth transition)
          router.push("/login/loading")
        } else {
          throw new Error("Login failed")
        }

      } catch (err) {
        console.error('Login failed:', err)
        setIsSigningIn(false)

        // Show backend-formatted error message
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')

        // Clear password field
        setPassword("")
      }
    }

    // ============================================
    // PASSWORD CHANGE HANDLER
    // ============================================

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Clear error when user starts typing
      if (error) setError("")

      setPassword(e.target.value)
    }

    // ============================================
    // FORGOT PASSWORD
    // ============================================

    const handleForgotPassword = () => {
      console.log("Forgot password clicked for:", handle)

      // TODO: Redirect to forgot password flow
      // Option 1: Redirect to handle entry page
      // router.push('/login/forgot-password')
      //
      // Option 2: Skip to OTP (if handle already in session)
      // router.push('/login/reset-password')

      alert("Forgot password flow - to be implemented")
    }

    return (
      <>
        <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
          {/* Header - Dynamic handle from server */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-lg font-semibold text-slate-900">
              Welcome back, {handle}!
            </h1>
            <p className="text-sm text-slate-600">
              Let's unlock your rewards
            </p>
          </div>

          {/* Form with browser password manager support */}
          <form onSubmit={handleContinue} className="space-y-5">
            {/* Hidden email field for password managers - browsers recognize email + password pairs */}
            <input
              type="email"
              name="email"
              autoComplete="email"
              value=""
              onChange={() => {}}
              style={{ display: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* Password Input */}
            <div>
              <PasswordInput
                id="password"
                name="current-password"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
                className={`w-full py-6 text-base transition-all ${
                  error
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
              />

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 mt-2 text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Helper Text (only show if no error) */}
              {!error && (
                <p className="text-xs text-slate-500 mt-2">Minimum 8 characters</p>
              )}
            </div>

            {/* Continue Button */}
            <div className="mt-8">
              <Button
                type="submit"
                disabled={!isFormValid}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </Button>
            </div>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-6 text-center">
            <button
              onClick={handleForgotPassword}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </AuthLayout>

        {/* Loading Modal */}
        {isSigningIn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-pink-600 animate-spin" />
              <p className="text-slate-900 font-medium text-lg">Signing in...</p>
            </div>
          </div>
        )}
      </>
    )
  }
