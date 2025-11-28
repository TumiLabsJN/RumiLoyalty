"use client"

  import { useState, useEffect, useRef } from "react"
  import { ArrowLeft, Loader2 } from "lucide-react"
  import { useRouter } from "next/navigation"
  import type {
    VerifyOtpRequest,
    VerifyOtpResponse,
    VerifyOtpErrorResponse,
    ResendOtpRequest,
    ResendOtpResponse,
    AuthErrorResponse
  } from "@/types/auth"

  /**
   * OTP VERIFICATION PAGE - With Loading Modal & Robust Paste
   *
   * Features:
   * - 6-digit OTP input with auto-focus
   * - Auto-submit with 1-second delay after completion
   * - Loading modal overlay during verification
   * - Robust copy/paste (handles spaces, extra text, etc.)
   * - 60-second countdown timer for resend
   * - Mobile-first number pad (inputMode="numeric")
   * - Back navigation to previous screen
   */

  export default function VerifyOtpPage() {
    const router = useRouter()

    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
    const [countdown, setCountdown] = useState(60)
    const [canResend, setCanResend] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Get email from sessionStorage (set by signup page)
    const [email, setEmail] = useState<string>("")
    const clientName = process.env.NEXT_PUBLIC_CLIENT_NAME || "Rumi Loyalty"

    // Get email from session on mount
    useEffect(() => {
      const storedEmail = sessionStorage.getItem('userEmail')
      if (storedEmail) {
        setEmail(storedEmail)
      } else {
        // No email found, redirect to start
        router.push('/login/start')
      }
    }, [router])

    useEffect(() => {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
        return () => clearTimeout(timer)
      } else {
        setCanResend(true)
      }
    }, [countdown])

    const handleChange = (index: number, value: string) => {
      const digit = value.slice(-1)

      if (digit && !/^\d$/.test(digit)) return

      const newOtp = [...otp]
      newOtp[index] = digit
      setOtp(newOtp)

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus()
      }

      const isComplete = newOtp.every(d => d !== "")
      if (isComplete) {
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current)
        }

        submitTimeoutRef.current = setTimeout(() => {
          handleVerify(newOtp.join(""))
        }, 1000)
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (otp[index] === "" && index > 0) {
          const newOtp = [...otp]
          newOtp[index - 1] = ""
          setOtp(newOtp)
          inputRefs.current[index - 1]?.focus()
        } else {
          const newOtp = [...otp]
          newOtp[index] = ""
          setOtp(newOtp)
        }
      }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData("text").trim()

      // Extract only digits from pasted text (robust handling)
      const digits = pastedData.replace(/\D/g, "")

      // Only process if we got exactly 6 digits
      if (digits.length === 6) {
        const digitArray = digits.split("")
        setOtp(digitArray)

        // Focus last input
        inputRefs.current[5]?.focus()

        // Auto-submit after 1-second delay
        submitTimeoutRef.current = setTimeout(() => {
          handleVerify(digits)
        }, 1000)
      }
    }

    const handleVerify = async (code: string) => {
      setIsVerifying(true)
      setError(null)  // Clear previous errors
      setAttemptsRemaining(null)

      try {
        // API call: POST /api/auth/verify-otp
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code } satisfies VerifyOtpRequest)
        })

        if (!response.ok) {
          const errorData = (await response.json()) as VerifyOtpErrorResponse

          // Show error message from backend
          setError(errorData.message || 'Verification failed')

          // Show attempts remaining if provided
          if (errorData.attemptsRemaining !== undefined) {
            setAttemptsRemaining(errorData.attemptsRemaining)
          }

          throw new Error(errorData.message || 'Verification failed')
        }

        const data = (await response.json()) as VerifyOtpResponse

        // Success - OTP verified, session created
        if (data.verified) {
          // Backend sets auth cookie, route to loading page
          router.push("/login/loading")
        } else {
          throw new Error("Verification failed")
        }

      } catch (err) {
        console.error('OTP verification failed:', err)
        setIsVerifying(false)

        // Clear OTP inputs
        setOtp(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    }

    const handleResend = async () => {
      if (!canResend) return

      setError(null)  // Clear any previous errors

      try {
        // API call: POST /api/auth/resend-otp
        const response = await fetch('/api/auth/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({} satisfies ResendOtpRequest)  // Empty body
        })

        if (!response.ok) {
          const errorData = (await response.json()) as AuthErrorResponse
          throw new Error(errorData.message || 'Failed to resend code')
        }

        const data = (await response.json()) as ResendOtpResponse

        if (data.sent) {
          // Use remainingSeconds from API (not hardcoded 60)
          setCountdown(data.remainingSeconds)
          setCanResend(false)
          setOtp(["", "", "", "", "", ""])
          inputRefs.current[0]?.focus()

          // Optional: Log success
          console.log('New code sent! Expires at:', data.expiresAt)
        }

      } catch (err) {
        console.error('Resend OTP failed:', err)

        if (err instanceof Error) {
          setError(err.message)  // Backend formatted: "Please wait 25 seconds..."
        } else {
          setError('Failed to resend code. Please try again.')
        }
      }
    }

    const handleBack = () => {
      router.back()
    }

    useEffect(() => {
      inputRefs.current[0]?.focus()
    }, [])

    return (
      <>
        <div className="min-h-screen bg-white flex flex-col px-6 py-8">
          <button
            onClick={handleBack}
            className="self-start mb-8 p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-700" />
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Enter OTP Code 🔒
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Please check your email inbox for a message from {clientName}.
              We sent a code to <span className="font-medium text-slate-900">{email}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-xl font-semibold text-slate-900 border-2 border-slate-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-200 focus:outline-none transition-all"
              />
            ))}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <p className="text-xs text-red-500 text-center mt-1">
                  {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining
                </p>
              )}
            </div>
          )}

          <div className="text-center space-y-3">
            {!canResend ? (
              <p className="text-sm text-slate-500">
                You can resend the code in{" "}
                <span className="font-semibold text-pink-600">{countdown} seconds</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">Did not receive the code?</p>
            )}

            <button
              onClick={handleResend}
              disabled={!canResend}
              className={`text-sm font-medium transition-colors ${
                canResend
                  ? "text-pink-600 hover:text-pink-700 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              Resend code
            </button>
          </div>
        </div>

        {isVerifying && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-pink-600 animate-spin" />
              <p className="text-slate-900 font-medium text-lg">Verifying...</p>
            </div>
          </div>
        )}
      </>
    )
  }
