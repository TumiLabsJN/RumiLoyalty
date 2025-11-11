# 2.5 Side quest
Home: Sales mission = Next: $30 Gift Card" must be dynamic and have a CLAIM button.
- If this button is hit, the Rewards tab Sales Mission must also go in processing
    - So does Home mission (Not implemented)

# 2 Follower Discount needs Modal Window programmed
This will have backend code, needs to be done now
Need to design this
1. Understand Logic (In SAReview_Decisions.md / Loyalty.md - Ask ChatGPT)

```CLI: None | From LoyaltyToDo's```

# 3 Gift Drop needs Modal Window Programmed
Gift Drop
- Automate size selection
    Gift Drop Category Clothes (Hoodie | T-shirt) 
        Check if Creator UI datafield is customizable as well (Hoodie, Tshirt)
- Modal window (After clicking redeem)
    - XS | S | M | L | XL | XXL (Drop down)

```CLI: None | From LoyaltyToDo's```

# 3.5 Browsers Built-in remember password
## QUESTION
Which code would we have to modify to enable the browser's built-in remember password?
A. In first time signup page in ## CONTEXT 1?
B. In returning client page in ## CONTEXT 2
C. In password reset page in ## CONTEXT 3
If it does, when the user gets logged out and needs to sign in via sign in page ## CONTEXT 2

### CONTEXT 1
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

  /**
   * SIGNUP PAGE - Complete signup flow with email + password
   *
   * User flow:
   * 1. User entered TikTok handle on previous page
   * 2. Backend verified handle exists in database
   * 3. User now registers email + password to create account
   */

  export default function SignupPage() {
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


### CONTEXT 2
"use client"

  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { AuthLayout } from "@/components/authlayout"
  import { useState } from "react"

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
    const [handle, setHandle] = useState("")

    // Frontend validation: Remove @ symbol if user types it
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      // Remove @ symbol and only allow letters, numbers, underscores, periods
      const sanitized = value.replace(/@/g, "").replace(/[^a-zA-Z0-9_.]/g, "")
      setHandle(sanitized)
    }

    const handleContinue = () => {
      if (handle.trim()) {
        console.log("TikTok handle:", `@${handle}`)
        // TODO: Send to backend for validation
        // Backend will check if handle exists in users table (tiktok_handle column)
        // API endpoint: POST /api/auth/validate-handle
        // Request body: { handle: "@username" }
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
        </div>

        {/* Continue Button */}
        <div className="space-y-4">
          {/* Static: Continue button */}
          <Button
            onClick={handleContinue}
            disabled={!handle.trim()}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50
  disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </div>
      </AuthLayout>
    )
  }


### CONTEXT 3


# 4 Ensure backend of auth flow is considered in BE
1. Download all code from v0.app, save in file
2. Ask Claude to analyze each auth .tsx (one by one)
    - Revise the IMAGE of that .tsx and ask:
        - Is A, B, C mapped out in back end?
3. Cross check with Loyalty.md

```CLI: None```

# 5 Ensure backend of home/app page is considered in BE
1. Download all code from v0.app, save in file
2. Ask Claude to analyze each auth .tsx (one by one)
    - Revise the IMAGE of that .tsx and ask:
        - Is A, B, C mapped out in back end?
3. Cross check with Loyalty.md

```CLI: None```











# DONE

# 1 Incorporate Missions Logic
Multiple missions per VIP level set by Admin
**To map out cost** per VIP level

This impacts Home page that has the Sales mission ! Mention it.

```CLI: Main pt5 | From LoyaltyToDo's```


# 1.25 Raffles are standalone (always 1 participation)
CHANGE the above, they should be dynamic as well
1. Backend activate raffle
2. Setup level, reward 
3. Activate
4. All users that meet qualifications can see mission / activate it

USE CASE:
A. Day 0, we plan Loyalty Program with a Raffle in Platinum level
B. Day 15, I convince client to try a Raffle earlier - test it. For Gold Level
    1. I go to dashboard, and activate the dynamic process as well