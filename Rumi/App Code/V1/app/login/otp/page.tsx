"use client"

  import { useState, useEffect, useRef } from "react"
  import { ArrowLeft, Loader2 } from "lucide-react"
  import { useRouter } from "next/navigation"

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

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const email = "creator@example.com"
    const clientName = "Stateside Growers"

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

      console.log("Verifying OTP:", code)

      try {
        // TODO: Replace with actual API call
        // Backend endpoint: POST /api/auth/verify-otp
        // Request body: { otp: "123456", session_id: "from_cookie" }
        //
        // Success response: { verified: true, user_id: "uuid", session_token: "jwt" }
        // Error response: { verified: false, error: "Invalid or expired code" }

        // Simulate API call (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1500))

        // On success, redirect to loading page
        router.push("/login/loading")

      } catch (error) {
        console.error("Verification error:", error)

        setIsVerifying(false)

        // TODO: Replace alert with better error UI (toast/inline message)
        alert("Invalid code. Please try again.")

        setOtp(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    }

    const handleResend = async () => {
      if (!canResend) return

      console.log("Resending OTP to:", email)

      // TODO: Send to backend
      // Backend endpoint: POST /api/auth/resend-otp
      // Request body: { session_id: "from_cookie" }
      // Response: { sent: true }

      setCountdown(60)
      setCanResend(false)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
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
