"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthLayout } from "@/components/authlayout"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"
import type { ForgotPasswordRequest, ForgotPasswordResponse, AuthErrorResponse } from "@/types/auth"

/**
 * FORGOT PASSWORD PAGE - Password Reset Flow
 *
 * Two states managed in one component:
 * 1. Request State: User enters email/handle to request reset link
 * 2. Success State: Email sent confirmation with masked email
 *
 * Features:
 * - User input for identifier (email OR handle)
 * - Loading modal during email send
 * - Success state with masked email from backend
 * - Resend functionality
 * - Inline error display
 * - Back to sign in link
 */

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [identifier, setIdentifier] = useState<string>("")
  const [emailHint, setEmailHint] = useState<string>("")
  const [expiresIn, setExpiresIn] = useState<number>(15)
  const [error, setError] = useState<string>("")

  const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
  const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"

  // ============================================
  // SEND RESET LINK
  // ============================================

  const handleSendResetLink = async () => {
    // Validation
    if (!identifier.trim()) {
      setError("Please enter your email or handle")
      return
    }

    setIsSending(true)
    setError("")

    try {
      // API call: POST /api/auth/forgot-password
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() } satisfies ForgotPasswordRequest)
      })

      if (!response.ok) {
        const errorData = (await response.json()) as AuthErrorResponse
        throw new Error(errorData.message || 'Failed to send reset link')
      }

      const data = (await response.json()) as ForgotPasswordResponse

      // Success - store email hint, expiration time, and show success state
      setEmailHint(data.emailHint)
      setExpiresIn(data.expiresIn)
      setEmailSent(true)

    } catch (err) {
      console.error('Forgot password failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  // ============================================
  // RESEND LINK
  // ============================================

  const handleResend = () => {
    // Reset state and send again
    setEmailSent(false)
    setError("")
    handleSendResetLink()
  }

  // ============================================
  // BACK TO SIGN IN
  // ============================================

  const handleBackToSignIn = () => {
    window.location.href = "/login/start"
  }

  // ============================================
  // RENDER SUCCESS STATE
  // ============================================

  if (emailSent) {
    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-xl font-bold text-slate-900">
            Check Your Email!
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            We sent a password reset link to{" "}
            <span className="font-medium text-slate-900">{emailHint}</span>
          </p>
          <p className="text-xs text-slate-500">
            The link expires in {expiresIn} minutes
          </p>
        </div>

        {/* Resend Link */}
        <div className="text-center mb-6">
          <p className="text-sm text-slate-600 mb-2">
            Didn't receive it?
          </p>
          <button
            onClick={handleResend}
            className="text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            Resend link
          </button>
        </div>

        {/* Back to Sign In */}
        <div className="text-center">
          <button
            onClick={handleBackToSignIn}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>
    )
  }

  // ============================================
  // RENDER REQUEST STATE
  // ============================================

  return (
    <>
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="text-xl font-bold text-slate-900">
            Reset Your Password
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Enter your email or handle to receive a password reset link
          </p>
        </div>

        {/* Identifier Input Field */}
        <div className="mb-4">
          <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-2">
            Email or Handle
          </label>
          <Input
            id="identifier"
            type="text"
            placeholder="Enter your email or @handle"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value)
              if (error) setError("") // Clear error when typing
            }}
            className={error ? "border-red-500" : ""}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Send Reset Link Button */}
        <div className="mb-6">
          <Button
            onClick={handleSendResetLink}
            disabled={!identifier.trim() || isSending}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Reset Link
          </Button>
        </div>

        {/* Back to Sign In */}
        <div className="text-center">
          <button
            onClick={handleBackToSignIn}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back to sign in
          </button>
        </div>
      </AuthLayout>

      {/* Loading Modal */}
      {isSending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 text-pink-600 animate-spin" />
            <p className="text-slate-900 font-medium text-lg">Sending reset link...</p>
          </div>
        </div>
      )}
    </>
  )
}
