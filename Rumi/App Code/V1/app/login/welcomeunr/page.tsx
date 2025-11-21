"use client"

import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/authlayout"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { OnboardingInfoResponse } from "@/types/auth"

/**
 * WELCOME UNRECOGNIZED PAGE
 *
 * This page is shown to users whose TikTok handle is NOT in the database.
 * Shows a welcome message informing them their onboarding will begin soon.
 */

export default function WelcomeUnrecognizedPage() {
  const router = useRouter()

  const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
  const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"

  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfoResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleExploreProgram = () => {
    // Navigate to home page
    router.push("/home")
  }

  useEffect(() => {
    const fetchOnboardingInfo = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // API call: GET /api/auth/onboarding-info
        const response = await fetch('/api/auth/onboarding-info', {
          method: 'GET',
          credentials: 'include'  // Include HTTP-only cookie
        })

        if (!response.ok) {
          throw new Error('Failed to load onboarding information')
        }

        const data = (await response.json()) as OnboardingInfoResponse
        setOnboardingInfo(data)

      } catch (err) {
        console.error('Failed to fetch onboarding info:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong')

        // Fallback to default content
        setOnboardingInfo({
          heading: "🎉 Welcome! 🎉",
          message: "You're all set! Our onboarding begins soon.",
          submessage: "Watch for updates.",
          buttonText: "Explore Program"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchOnboardingInfo()
  }, [])

  return (
    <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
      {isLoading ? (
        // Loading state
        <div className="text-center space-y-3 mt-22 mb-24">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-64 mx-auto mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-56 mx-auto"></div>
          </div>
        </div>
      ) : onboardingInfo ? (
        // Content loaded
        <>
          {/* Header with dynamic content */}
          <div className="text-center space-y-3 mt-22 mb-24">
            <h1 className="text-2xl font-bold text-slate-900 -mt-4">
              {onboardingInfo.heading}
            </h1>
            <p className="text-base text-slate-600 leading-relaxed pt-4">
              {onboardingInfo.message}
            </p>
            <p className="text-base text-slate-600 leading-relaxed pt-4">
              {onboardingInfo.submessage}
            </p>
          </div>

          {/* Explore Program Button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleExploreProgram}
              className="w-64 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
            >
              {onboardingInfo.buttonText}
            </Button>
          </div>
        </>
      ) : (
        // Error fallback
        <div className="text-center space-y-3 mt-22 mb-24">
          <p className="text-slate-600">Unable to load onboarding information.</p>
        </div>
      )}
    </AuthLayout>
  )
}
