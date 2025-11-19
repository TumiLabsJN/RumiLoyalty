"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthLayout } from "@/components/authlayout"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { CheckHandleRequest, CheckHandleResponse, AuthErrorResponse } from "@/types/auth"

  /**
   * LOGIN PAGE - Creator Authentication
   *
   * This page collects the creator's TikTok handle and validates it.
   *
   * Dynamic Fields (passed to AuthLayout):
   * - Logo: Client-specific branding (from clients.logo_url)
   * - Privacy Policy URL: Client-specific privacy page (from clients.privacy_policy_url)
   *
   * Page-Specific Content:
   * - "Let's Get Started!" header
   * - "Enter your TikTok Handle" instructions
   * - TikTok handle input with @ prefix
   * - "Continue" button
   *
   * Frontend Validation:
   * - Automatically removes @ symbol if user types it
   * - Only allows: letters, numbers, underscore, period
   * - Max 30 characters
   */

export default function LoginPage() {
  const router = useRouter()
  const [handle, setHandle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

    // Frontend validation: Remove @ symbol if user types it
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // Remove @ symbol and only allow letters, numbers, underscores, periods
      const sanitized = value.replace(/@/g, "").replace(/[^a-zA-Z0-9_.]/g, "")
      setHandle(sanitized)
    }

  const handleContinue = async () => {
    if (!handle.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Call check-handle API (API_CONTRACTS.md lines 34-181)
      const response = await fetch('/api/auth/check-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle } satisfies CheckHandleRequest)
      })

      if (!response.ok) {
        const errorData = (await response.json()) as AuthErrorResponse
        throw new Error(errorData.message || 'Failed to validate handle')
      }

      const data = (await response.json()) as CheckHandleResponse

      // Store normalized handle for next steps
      sessionStorage.setItem("userHandle", data.handle)

      // Route based on API response
      if (data.route === 'login') {
        router.push("/login/wb")      // User has email → password login
      } else {
        router.push("/login/signup")  // No email OR new user → signup flow
      }

    } catch (err) {
      console.error('Handle check failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

    // ============================================
    // DYNAMIC DATA - Replace with backend values
    // ============================================

    // Dynamic from backend: Client logo URL
    // Database: clients.logo_url
    // Example: "/images/client-uuid.png" or "https://cdn.example.com/logo.png"
    const logoUrl = "/images/fizee-logo.png" // ← MOCK DATA: Replace with real client logo

    // Dynamic from backend: Privacy policy URL per client
    // Database: clients.privacy_policy_url or construct as `/privacy-policy?client=${client_id}`
    // Example: "/privacy-policy?client=abc123" or "https://clientdomain.com/privacy"
    const privacyPolicyUrl = "/privacy-policy" // ← MOCK DATA: Replace with client-specific URL

    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* PAGE-SPECIFIC CONTENT (The "Black Box") */}

        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          {/* Static: Main heading */}
          <h1 className="text-lg font-semibold text-slate-900">Let's Get Started!</h1>

          {/* Static: Instructions */}
          <p className="text-sm text-slate-600">Enter your TikTok Handle</p>
        </div>

        {/* TikTok Handle Input */}
        <div className="mb-6">
          <div className="relative">
            {/* @ Symbol inside input */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base font-medium">
              @
            </span>

            {/* Input Field - Frontend Validation */}
            {/* Validation: No @ symbol, only letters/numbers/underscore/period */}
            <Input
              type="text"
              value={handle}
              onChange={handleInputChange}
              placeholder="username"
              className="w-full pl-8 pr-3 py-6 text-base"
              maxLength={30}
            />
          </div>

          {/* Helper text */}
          <p className="text-xs text-slate-500 mt-2">Without the @ symbol</p>

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="space-y-4">
          {/* Static: Continue button */}
          <Button
            onClick={handleContinue}
            disabled={!handle.trim() || isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Checking...' : 'Continue'}
          </Button>
        </div>
      </AuthLayout>
    )
  }
