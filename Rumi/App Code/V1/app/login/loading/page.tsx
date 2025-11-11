"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * LOADING PAGE - Transition screen after OTP verification
 *
 * This page shows a loading animation while redirecting users
 * based on their recognition status:
 * - Recognized users (handle = "Test") → /home
 * - Unrecognized users (any other handle) → /login/welcomeunr
 */

export default function LoadingPage() {
  const router = useRouter()

  useEffect(() => {
    // Get user type from sessionStorage (set in start page)
    const userType = sessionStorage.getItem("userType")
    const handle = sessionStorage.getItem("userHandle")

    console.log("Loading page - User type:", userType, "Handle:", handle)

    // Simulate loading delay (2 seconds)
    const timer = setTimeout(() => {
      if (userType === "recognized") {
        // Recognized user flow: redirect to home
        router.push("/home")
      } else {
        // Unrecognized user flow: redirect to welcomeunr page
        router.push("/login/welcomeunr")
      }
    }, 2000)

    // Cleanup timeout on unmount
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Spinning loader */}
        <Loader2 className="h-16 w-16 text-pink-600 animate-spin" />

        {/* Loading text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Setting up your account...</h1>
          <p className="text-sm text-slate-600">This will only take a moment</p>
        </div>
      </div>
    </div>
  )
}
