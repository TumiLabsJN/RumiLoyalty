"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthLayout } from "@/components/authlayout"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"

/**
 * RESET PASSWORD PAGE - Create New Password
 *
 * User lands here from email magic link with token parameter
 * URL: /login/resetpw?token=xyz123abc
 *
 * Features:
 * - Token validation on load
 * - Password strength requirements
 * - Password confirmation match
 * - Show/hide password toggle
 * - Error states (invalid token, weak password, mismatch)
 * - Success redirect to login
 *
 * Backend Integration:
 * - Validate token on mount: GET /api/auth/validate-reset-token?token=xyz
 * - Submit new password: POST /api/auth/reset-password
 */

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const logoUrl = "/images/fizee-logo.png"
  const privacyPolicyUrl = "/privacy-policy"

  // ============================================
  // VALIDATE TOKEN ON MOUNT
  // ============================================

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false)
        setErrorMessage("Invalid reset link. Please request a new one.")
        setIsValidatingToken(false)
        return
      }

      try {
        // TODO: Replace with actual API call
        // Backend endpoint: GET /api/auth/validate-reset-token?token=xyz
        // Request: { token: token }
        //
        // Backend actions:
        // 1. Decode JWT token
        // 2. Check expiration (15 minutes)
        // 3. Verify token hash exists in password_resets table
        // 4. Check if token already used (one-time use)
        //
        // Success response:
        // {
        //   valid: true,
        //   user_id: "uuid",
        //   expires_at: "2025-01-15T12:30:00Z"
        // }
        //
        // Error responses:
        // - { valid: false, error: "Token expired" }
        // - { valid: false, error: "Token already used" }
        // - { valid: false, error: "Invalid token" }

        // Simulate API call (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1000))

        // MOCK: Token is valid
        setTokenValid(true)
        setErrorMessage("")

      } catch (error) {
        console.error("Error validating token:", error)
        setTokenValid(false)
        setErrorMessage("Invalid reset link. Please request a new one.")
      } finally {
        setIsValidatingToken(false)
      }
    }

    validateToken()
  }, [token])

  // ============================================
  // VALIDATE PASSWORD STRENGTH
  // ============================================

  const validatePasswordStrength = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters"
    }
    // Add more rules as needed:
    // - Must contain uppercase, lowercase, number, special char
    // - No common passwords
    return null
  }

  // ============================================
  // HANDLE PASSWORD RESET
  // ============================================

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrorMessage("")

    // Validate password strength
    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError) {
      setErrorMessage(strengthError)
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Replace with actual API call
      // Backend endpoint: POST /api/auth/reset-password
      // Request body:
      // {
      //   token: token,
      //   new_password: newPassword
      // }
      //
      // Backend actions:
      // 1. Validate token again (double-check)
      // 2. Hash new password (bcrypt)
      // 3. Update users.password_hash
      // 4. Mark token as used (password_resets.used_at = NOW())
      // 5. Invalidate all user sessions (force re-login)
      // 6. Send confirmation email
      //
      // Success response:
      // {
      //   success: true,
      //   message: "Password reset successfully"
      // }

      // Simulate API call (remove in production)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Success - redirect to login
      console.log("Password reset successful")
      window.location.href = "/login/wb?reset=success"

    } catch (error) {
      console.error("Error resetting password:", error)
      setErrorMessage("Failed to reset password. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // HANDLE REQUEST NEW LINK
  // ============================================

  const handleRequestNewLink = () => {
    window.location.href = "/login/forgotpw"
  }

  // ============================================
  // RENDER VALIDATING STATE
  // ============================================

  if (isValidatingToken) {
    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-pink-600 animate-spin mb-4" />
          <p className="text-slate-600">Validating reset link...</p>
        </div>
      </AuthLayout>
    )
  }

  // ============================================
  // RENDER INVALID TOKEN STATE
  // ============================================

  if (!tokenValid) {
    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-xl font-bold text-slate-900">
            Invalid Reset Link
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            This password reset link is invalid or has expired.
          </p>
        </div>

        {/* Error Message */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 text-center">
            {errorMessage}
          </p>
        </div>

        {/* Request New Link Button */}
        <div className="mb-6">
          <Button
            onClick={handleRequestNewLink}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
          >
            Request New Link
          </Button>
        </div>

        {/* Back to Sign In */}
        <div className="text-center">
          <button
            onClick={() => window.location.href = "/login/start"}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    )
  }

  // ============================================
  // RENDER CREATE PASSWORD FORM
  // ============================================

  const isFormValid = newPassword.length >= 8 && confirmPassword.length >= 8

  return (
    <>
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-xl font-bold text-slate-900">
            Create New Password
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Choose a strong password for your account
          </p>
        </div>

        {/* New Password Field */}
        <div className="mb-4">
          <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNewPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="mb-6">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Reset Password Button */}
        <div className="mb-6">
          <Button
            onClick={handleResetPassword}
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </div>
      </AuthLayout>

      {/* Loading Modal */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-pink-600 animate-spin" />
            <p className="text-slate-900 font-medium text-lg">Resetting your password...</p>
          </div>
        </div>
      )}
    </>
  )
}
