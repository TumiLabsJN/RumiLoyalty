"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import type { UserStatusResponse } from "@/types/auth"

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
    const fetchUserStatus = async () => {
      try {
        // API call: GET /api/auth/user-status
        const response = await fetch('/api/auth/user-status', {
          method: 'GET',
          credentials: 'include'  // Include HTTP-only cookie
        })

        if (!response.ok) {
          // Not authenticated or error - redirect to login
          console.error('User status check failed:', response.status)
          router.push('/login/start')
          return
        }

        const data = (await response.json()) as UserStatusResponse

        // Log for debugging
        console.log('User status:', {
          userId: data.userId,
          isRecognized: data.isRecognized,
          redirectTo: data.redirectTo
        })

        // Backend determines where to route
        router.push(data.redirectTo)

      } catch (err) {
        console.error('Failed to get user status:', err)
        // On error, redirect to login
        router.push('/login/start')
      }
    }

    fetchUserStatus()
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
