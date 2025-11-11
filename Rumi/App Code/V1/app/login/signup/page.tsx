"use client"

  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { PasswordInput } from "@/components/passwordinput"
  import { Checkbox } from "@/components/ui/checkbox"
  import { AuthLayout } from "@/components/authlayout"
  import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
  } from "@/components/ui/sheet"
  import { useState, useEffect } from "react"
  import { useRouter } from "next/navigation"

  /**
   * SIGNUP PAGE - Complete signup flow with email + password
   *
   * User flow:
   * 1. User entered TikTok handle on previous page
   * 2. Backend verified handle exists in database
   * 3. User now registers email + password to create account
   */

  export default function SignupPage() {
    const router = useRouter()

    // Form state
    const [email, setEmail] = useState("") // New: Email field
    const [password, setPassword] = useState("")
    const [agreedToTerms, setAgreedToTerms] = useState(false)

    // Legal document sheet state
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)

    // Document content state (cached after first fetch)
    const [termsContent, setTermsContent] = useState("")
    const [termsLastUpdated, setTermsLastUpdated] = useState("")
    const [privacyContent, setPrivacyContent] = useState("")
    const [privacyLastUpdated, setPrivacyLastUpdated] = useState("")

    // Loading states
    const [isLoadingTerms, setIsLoadingTerms] = useState(false)
    const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false)

    // Error states
    const [termsError, setTermsError] = useState("")
    const [privacyError, setPrivacyError] = useState("")

    // Email validation helper
    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    // Form validation
    const isFormValid = isValidEmail(email) && password.length >= 8 && agreedToTerms

    // ============================================
    // DYNAMIC DATA - Replace with backend values
    // ============================================

    // Dynamic: TikTok handle from server-side session
    const handle = "@creatorpro" // From backend session (dynamic)

    const logoUrl = "/images/fizee-logo.png"
    const privacyPolicyUrl = "/privacy-policy"
    const termsApiUrl = "/api/clients/fizee/terms"
    const privacyApiUrl = "/api/clients/fizee/privacy"

    // ============================================
    // LEGAL DOCUMENT FETCHING
    // ============================================

    useEffect(() => {
      if (showTerms && !termsContent) {
        fetchTerms()
      }
    }, [showTerms])

    useEffect(() => {
      if (showPrivacy && !privacyContent) {
        fetchPrivacy()
      }
    }, [showPrivacy])

    const fetchTerms = async () => {
      setIsLoadingTerms(true)
      setTermsError("")

      try {
        const response = await fetch(termsApiUrl)

        if (!response.ok) {
          throw new Error("Failed to load terms")
        }

        const data = await response.json()
        setTermsContent(data.content)
        setTermsLastUpdated(data.last_updated)
      } catch (err) {
        console.error("Error fetching terms:", err)
        setTermsError("Unable to load Terms of Use. Please try again.")
      } finally {
        setIsLoadingTerms(false)
      }
    }

    const fetchPrivacy = async () => {
      setIsLoadingPrivacy(true)
      setPrivacyError("")

      try {
        const response = await fetch(privacyApiUrl)

        if (!response.ok) {
          throw new Error("Failed to load privacy policy")
        }

        const data = await response.json()
        setPrivacyContent(data.content)
        setPrivacyLastUpdated(data.last_updated)
      } catch (err) {
        console.error("Error fetching privacy policy:", err)
        setPrivacyError("Unable to load Privacy Policy. Please try again.")
      } finally {
        setIsLoadingPrivacy(false)
      }
    }

    // ============================================
    // FORM SUBMISSION
    // ============================================

    const handleSignup = () => {
      if (isFormValid) {
        console.log("Signup data:", {
          handle: handle,
          email: email, // Dynamic from user input
          password: "***",
          agreedToTerms,
        })

        // TODO: Send to backend
        // Backend endpoint: POST /api/auth/signup
        // Payload: { handle, email, password }

        // Navigate to OTP page
        router.push("/login/otp")
      }
    }

    return (
      <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
        {/* Header - Dynamic handle from server */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-lg font-semibold text-slate-900">
            Welcome, {handle}!
          </h1>
          <p className="text-sm text-slate-600">
            Create your account to unlock rewards. 🎁
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Email Input - NEW */}
          <div>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full py-6 text-base"
            />
            
          </div>

          {/* Password Input */}
          <div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full py-6 text-base"
            />
            <p className="text-xs text-slate-500 mt-2">Minimum 8 characters</p>
          </div>

          {/* Terms & Privacy Policy Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms-privacy"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-1"
            />
            <label
              htmlFor="terms-privacy"
              className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none"
            >
              By continuing, you agree to our{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setShowTerms(true)
                }}
                className="text-pink-600 font-medium underline underline-offset-2 hover:text-pink-700"
              >
                Terms
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  setShowPrivacy(true)
                }}
                className="text-pink-600 font-medium underline underline-offset-2 hover:text-pink-700"
              >
                Privacy Policy
              </button>
              .
            </label>
          </div>
        </div>

        {/* Signup Button */}
        <div className="mt-8">
          <Button
            onClick={handleSignup}
            disabled={!isFormValid}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50
  disabled:cursor-not-allowed"
          >
            Sign Up
          </Button>
        </div>

        {/* Already have account link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <a href="/login/start" className="text-pink-600 font-medium hover:text-pink-700">
              Sign In
            </a>
          </p>
        </div>

        {/* Terms of Use Sheet */}
        <Sheet open={showTerms} onOpenChange={(open) => !open && setShowTerms(false)}>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col">
            <SheetHeader className="border-b border-slate-200 pb-4">
              <SheetTitle className="text-lg font-semibold text-slate-900">
                Terms of Use
              </SheetTitle>
              {termsLastUpdated && (
                <SheetDescription className="text-xs text-slate-500">
                  Last updated: {new Date(termsLastUpdated).toLocaleDateString()}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingTerms && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">Loading...</p>
                </div>
              )}

              {termsError && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-red-600">{termsError}</p>
                </div>
              )}

              {termsContent && !isLoadingTerms && (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: termsContent }}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Privacy Policy Sheet */}
        <Sheet open={showPrivacy} onOpenChange={(open) => !open && setShowPrivacy(false)}>
          <SheetContent side="bottom" className="h-[90vh] flex flex-col">
            <SheetHeader className="border-b border-slate-200 pb-4">
              <SheetTitle className="text-lg font-semibold text-slate-900">
                Privacy Policy
              </SheetTitle>
              {privacyLastUpdated && (
                <SheetDescription className="text-xs text-slate-500">
                  Last updated: {new Date(privacyLastUpdated).toLocaleDateString()}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoadingPrivacy && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-slate-500">Loading...</p>
                </div>
              )}

              {privacyError && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-red-600">{privacyError}</p>
                </div>
              )}

              {privacyContent && !isLoadingPrivacy && (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: privacyContent }}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </AuthLayout>
    )
  }
