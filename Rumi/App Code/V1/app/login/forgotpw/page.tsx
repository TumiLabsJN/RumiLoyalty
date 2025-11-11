"use client"

  import { Button } from "@/components/ui/button"
  import { AuthLayout } from "@/components/authlayout"
  import { Loader2, CheckCircle2 } from "lucide-react"
  import { useState } from "react"

  /**
   * FORGOT PASSWORD PAGE - Magic Link Flow
   *
   * Two states managed in one component:
   * 1. Request State: User confirms they want reset link
   * 2. Success State: Email sent confirmation
   *
   * Dynamic Fields (from backend via session):
   * - handle: TikTok handle from previous screen (clients.tiktok_handle)
   * - email: User's registered email (users.email)
   * - emailHint: Masked email for display (e.g., "cr****@example.com")
   *
   * Features:
   * - Loading modal during email send
   * - Success state with masked email
   * - Resend functionality
   * - Back to sign in link
   */

  export default function ForgotPasswordPage() {
    const [emailSent, setEmailSent] = useState(false)
    const [isSending, setIsSending] = useState(false)

    // ============================================
    // DYNAMIC DATA - Replace with backend values
    // ============================================

    // Dynamic: TikTok handle from session (previous screen)
    // TODO: Fetch from server-side session
    // Backend: GET /api/auth/session → { tiktok_handle: "@creatorpro" }
    const handle = "@creatorpro" // ← MOCK DATA: From session

    // Dynamic: User's registered email (fetched from backend)
    // Backend: After user lookup by handle → { email: "creator@example.com" }
    const email = "creator@example.com" // ← MOCK DATA: From users.email

    // Dynamic: Masked email for display (backend should mask this)
    // Backend generates: "cr****@example.com" from "creator@example.com"
    const emailHint = "cr****@example.com" // ← MOCK DATA: Masked version

    const logoUrl = "/images/fizee-logo.png"
    const privacyPolicyUrl = "/privacy-policy"

    // ============================================
    // SEND RESET LINK
    // ============================================

    const handleSendResetLink = async () => {
      setIsSending(true)

      console.log("Sending reset link to:", email, "for user:", handle)

      try {
        // TODO: Replace with actual API call
        // Backend endpoint: POST /api/auth/forgot-password
        // Request body:
        // {
        //   tiktok_handle: handle, // "@creatorpro"
        //   session_id: "from_cookie"
        // }
        //
        // Backend actions:
        // 1. Look up user by tiktok_handle
        // 2. Get user's email from users.email
        // 3. Generate secure reset token (JWT with 15min expiry)
        //    Token payload: { user_id, type: "password_reset", exp }
        // 4. Create reset link:
        //    https://app.com/login/reset-password?token=xyz123abc
        // 5. Send email via SendGrid/AWS SES
        // 6. Store token hash in database (password_resets table)
        //
        // Email template:
        // Subject: Reset Your Password - {Client Name}
        // Body:
        //   Hi @creatorpro,
        //
        //   Click the link below to reset your password:
        //   [Reset Password Button/Link]
        //
        //   This link expires in 15 minutes.
        //
        //   If you didn't request this, ignore this email.
        //
        // Success response:
        // {
        //   success: true,
        //   email_hint: "cr****@example.com"
        // }

        // Simulate API call (remove in production)
        await new Promise(resolve => setTimeout(resolve, 2000))

        setIsSending(false)
        setEmailSent(true)

      } catch (error) {
        console.error("Error sending reset link:", error)
        setIsSending(false)

        // TODO: Show error message
        alert("Failed to send reset link. Please try again.")
      }
    }

    // ============================================
    // RESEND LINK
    // ============================================

    const handleResend = () => {
      console.log("Resending reset link")

      // Reset state and send again
      setEmailSent(false)
      handleSendResetLink()
    }

    // ============================================
    // BACK TO SIGN IN
    // ============================================

    const handleBackToSignIn = () => {
      // TODO: Navigate back to login
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
              The link expires in 15 minutes
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
              We'll send a reset link to the email associated with{" "}
              <span className="font-medium text-slate-900">{handle}</span>
            </p>
          </div>

          {/* Send Reset Link Button */}
          <div className="mb-6">
            <Button
              onClick={handleSendResetLink}
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
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
