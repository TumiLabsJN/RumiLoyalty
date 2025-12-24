"use client"

import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/authlayout"
import { useRouter } from "next/navigation"
import { useClientConfig } from "../ClientConfigProvider"
import { getButtonColors, adjustBrightness } from "@/lib/color-utils"

/**
 * WELCOME UNRECOGNIZED PAGE
 *
 * ENH-014: Removed useEffect fetch and skeleton loading
 * Uses hardcoded onboarding info directly (same as API returns)
 *
 * This page is shown to users whose TikTok handle is NOT in the database.
 * Shows a welcome message informing them their onboarding will begin soon.
 *
 * IMPORTANT: This page is intentionally PUBLIC (no auth required).
 * Users reaching this page are "unrecognized" - they have no Supabase
 * session yet. Do NOT add auth gating - it would break the flow.
 */

// ENH-014: Hardcoded onboarding info (same as API route returns)
// Future: Can be made dynamic when onboarding_messages table is implemented
const ONBOARDING_INFO = {
  heading: "🎉 Welcome! 🎉",
  message: "You're all set! Our onboarding begins this coming Monday.",
  submessage: "👀 Watch your DMs for your sample request link.",
  buttonText: "Explore Program"
}

export default function WelcomeUnrecognizedPage() {
  const router = useRouter()

  // Get client config from context (dynamic branding)
  const { logoUrl, privacyPolicyUrl, primaryColor } = useClientConfig()
  const buttonColors = getButtonColors(primaryColor)

  const handleExploreProgram = () => {
    router.push("/home")
  }

  return (
    <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
      {/* ENH-014: Direct content render - no skeleton, no loading state */}
      <div className="text-center space-y-3 mt-22 mb-24">
        <h1 className="text-2xl font-bold text-slate-900 -mt-4">
          {ONBOARDING_INFO.heading}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed pt-4">
          {ONBOARDING_INFO.message}
        </p>
        <p className="text-base text-slate-600 leading-relaxed pt-4">
          {ONBOARDING_INFO.submessage}
        </p>
      </div>

      {/* Explore Program Button */}
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleExploreProgram}
          style={{
            background: `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.hover}, ${adjustBrightness(primaryColor, -30)})`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`
          }}
          className="w-64 text-white font-semibold py-6 rounded-full shadow-md"
        >
          {ONBOARDING_INFO.buttonText}
        </Button>
      </div>
    </AuthLayout>
  )
}
