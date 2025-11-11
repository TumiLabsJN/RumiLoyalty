"use client"

  import { Button } from "@/components/ui/button"
  import { PasswordInput } from "@/components/passwordinput"
  import { AuthLayout } from "@/components/authlayout"
  import { Loader2, AlertCircle } from "lucide-react"
  import { useRouter } from "next/navigation"
  import { useState } from "react"

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

    // Form validation: Only password length check
    const isFormValid = password.length >= 8

    // ============================================
    // DYNAMIC DATA - Replace with backend values
    // ============================================

    // Dynamic: TikTok handle from server-side session
    // TODO: Replace with actual session fetch
    const handle = "@creatorpro" // ← MOCK DATA: From server session

    const logoUrl = "/images/fizee-logo.png"
    const privacyPolicyUrl = "/privacy-policy"

    // ============================================
    // FORM SUBMISSION
    // ============================================

    const handleContinue = async () => {
      if (!isFormValid) return

      setIsSigningIn(true)
      setError("") // Clear any previous errors

      console.log("Login attempt:", { handle, password: "***" })

      try {
        // TODO: Replace with actual API call
        // Backend endpoint: POST /api/auth/login
        // Request body:
        // {
        //   tiktok_handle: handle, // From session
        //   password: "plaintext_password", // Backend will hash and compare
        //   session_id: "from_cookie"
        // }
        //
        // Success response:
        // {
        //   success: true,
        //   user_id: "uuid",
        //   session_token: "jwt_token"
        // }
        //
        // Error response:
        // {
        //   success: false,
        //   error: "Invalid password"
        // }

        // Simulate API call (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Uncomment to test error state:
        // throw new Error("Invalid password")

        // On success, redirect to home
        router.push("/home")

      } catch (err) {
        console.error("Login error:", err)

        setIsSigningIn(false)

        // Show inline error message
        setError("Incorrect password. Please try again.")

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

          {/* Form */}
          <div className="space-y-5">
            {/* Password Input */}
            <div>
              <PasswordInput
                id="password"
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
          </div>

          {/* Continue Button */}
          <div className="mt-8">
            <Button
              onClick={handleContinue}
              disabled={!isFormValid}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </Button>
          </div>

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
