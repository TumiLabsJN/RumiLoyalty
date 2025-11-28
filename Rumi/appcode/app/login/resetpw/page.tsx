"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthLayout } from "@/components/authlayout"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { ResetPasswordRequest, ResetPasswordResponse, AuthErrorResponse } from "@/types/auth"
import { useClientConfig } from "../ClientConfigProvider"
import { getButtonColors, adjustBrightness } from "@/lib/color-utils"

/**
 * RESET PASSWORD PAGE - Create New Password
 *
 * User lands here from email magic link with token parameter
 * URL: /login/resetpw?token=xyz123abc
 *
 * Features:
 * - Token extraction from URL
 * - Password strength requirements
 * - Password confirmation match
 * - Show/hide password toggle
 * - Error states (invalid token, weak password, mismatch)
 * - Success redirect to login
 *
 * Security Note:
 * - Token validation happens on submit (not on mount)
 * - This prevents enumeration attacks (attackers can't probe if token is valid)
 * - Industry standard: GitHub, Google, Auth0 all use this approach
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

  // Get client config from context (dynamic branding)
  const { logoUrl, privacyPolicyUrl, primaryColor } = useClientConfig()
  const buttonColors = getButtonColors(primaryColor)

  // ============================================
  // CHECK TOKEN EXISTS ON MOUNT
  // ============================================

  useEffect(() => {
    // Simple check: does token exist in URL?
    // Backend will validate token when user submits form (security best practice)
    if (!token) {
      setErrorMessage("Invalid or missing reset token. Please request a new reset link.")
      setTokenValid(false)
    } else {
      // Token exists in URL, show form
      // Don't validate yet (anti-enumeration: don't leak if token is valid/expired)
      setTokenValid(true)
    }
    setIsValidatingToken(false)
  }, [token])

  // ============================================
  // VALIDATE PASSWORD STRENGTH
  // ============================================

  const validatePasswordStrength = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters"
    }
    // Backend also validates (defense in depth)
    return null
  }

  // ============================================
  // HANDLE PASSWORD RESET
  // ============================================

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrorMessage("")

    // Validate password strength (UI validation)
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

    if (!token) {
      setErrorMessage("Invalid reset token")
      return
    }

    setIsSubmitting(true)

    try {
      // API call: POST /api/auth/reset-password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword
        } satisfies ResetPasswordRequest)
      })

      if (!response.ok) {
        const errorData = (await response.json()) as AuthErrorResponse
        throw new Error(errorData.message || 'Failed to reset password')
      }

      const data = (await response.json()) as ResetPasswordResponse

      // Success - redirect to login with success message
      console.log('Password reset successful:', data.message)
      window.location.href = "/login/wb?reset=success"

    } catch (err) {
      console.error('Reset password failed:', err)
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password. Please try again.')
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
  // RENDER VALIDATING STATE (token check)
  // ============================================

  if (isValidatingToken) {
    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-pink-600 animate-spin mb-4" />
          <p className="text-slate-600">Loading...</p>
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
              name="new-password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
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
              name="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
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
        <div className="mt-8 mb-6">
          <Button
            onClick={handleResetPassword}
            disabled={!isFormValid || isSubmitting}
            style={{
              background: `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.hover}, ${adjustBrightness(primaryColor, -30)})`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`
            }}
            className="w-full text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
