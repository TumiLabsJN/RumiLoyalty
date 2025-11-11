"use client"

import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/authlayout"
import { useRouter } from "next/navigation"

/**
 * WELCOME UNRECOGNIZED PAGE
 *
 * This page is shown to users whose TikTok handle is NOT in the database.
 * Shows a welcome message informing them their onboarding will begin soon.
 */

export default function WelcomeUnrecognizedPage() {
  const router = useRouter()

  const logoUrl = "/images/fizee-logo.png"
  const privacyPolicyUrl = "/privacy-policy"

  const handleExploreProgram = () => {
    // Navigate to home page
    router.push("/home")
  }

  return (
    <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
      {/* Header with emoji */}
      <div className="text-center space-y-3 mt-22 mb-24">
        <h1 className="text-2xl font-bold text-slate-900 -mt-4">
          🎉 Welcome! 🎉
        </h1>
        <p className="text-base text-slate-600 leading-relaxed pt-4">
          You're all set! Our onboarding begins this <span className="font-bold">coming Monday</span>.
        </p>
        <p className="text-base text-slate-600 leading-relaxed pt-4">
          👀 Watch your DMs for your sample request link.
        </p>
      </div>

      {/* Explore Program Button */}
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleExploreProgram}
          className="w-64 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
        >
          Explore Program
        </Button>
      </div>
    </AuthLayout>
  )
}
