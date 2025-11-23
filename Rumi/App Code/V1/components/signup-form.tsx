"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/passwordinput"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthLayout } from "@/components/authlayout"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { SignupRequest, SignupResponse, AuthErrorResponse, TermsResponse, PrivacyResponse } from "@/types/auth"
import { useClientConfig } from "../app/login/ClientConfigProvider"
import { getButtonColors, adjustBrightness } from "@/lib/color-utils"

interface SignupFormProps {
  terms: TermsResponse
  privacy: PrivacyResponse
}

export function SignupForm({ terms, privacy }: SignupFormProps) {
  const router = useRouter()

  // Get handle from sessionStorage (client-side only)
  const [handle, setHandle] = useState<string>("")

  useEffect(() => {
    const storedHandle = sessionStorage.getItem('userHandle')
    if (!storedHandle) {
      // No handle found, redirect to start page
      router.push('/login/start')
    } else {
      setHandle(storedHandle)
    }
  }, [router])

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sheet state
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  // Get client config from context (dynamic branding)
  const { logoUrl, privacyPolicyUrl, primaryColor } = useClientConfig()
  const buttonColors = getButtonColors(primaryColor)

  // Form validation
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isFormValid = isValidEmail(email) && password.length >= 8 && password.length <= 128 && agreedToTerms

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, email, password, agreedToTerms } satisfies SignupRequest)
      })

      if (!response.ok) {
        const errorData = (await response.json()) as AuthErrorResponse
        throw new Error(errorData.message || 'Signup failed')
      }

      const data = (await response.json()) as SignupResponse

      // Success - OTP sent, store email for OTP page
      sessionStorage.setItem('userEmail', email)

      // Route to verification page
      router.push('/login/otp')

    } catch (err) {
      console.error('Signup failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout logoUrl={logoUrl} privacyPolicyUrl={privacyPolicyUrl}>
      {/* Header */}
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-lg font-semibold text-slate-900">
          Welcome, {handle}!
        </h1>
        <p className="text-sm text-slate-600">
          Create your account to unlock rewards. 🎁
        </p>
      </div>

      {/* Form with browser password manager support */}
      <form onSubmit={handleSignup} className="space-y-5">
        {/* Email Input */}
        <div>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="w-full py-6 text-base"
            required
          />
        </div>

        {/* Password Input */}
        <div>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full py-6 text-base"
            required
          />
          <p className="text-xs text-slate-500 mt-2">Minimum 8 characters</p>
        </div>

        {/* Terms & Privacy Checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms-privacy"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            className="mt-1"
            required
          />
          <label htmlFor="terms-privacy" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
            By continuing, you agree to our{" "}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowTerms(true) }}
              className="text-pink-600 font-medium underline underline-offset-2 hover:text-pink-700"
            >
              Terms
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setShowPrivacy(true) }}
              className="text-pink-600 font-medium underline underline-offset-2 hover:text-pink-700"
            >
              Privacy Policy
            </button>.
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Signup Button */}
        <div className="mt-8">
          <Button
            type="submit"
            disabled={!isFormValid || isLoading}
            style={{
              background: `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.hover}, ${adjustBrightness(primaryColor, -30)})`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `linear-gradient(to right, ${buttonColors.base}, ${buttonColors.hover})`
            }}
            className="w-full text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </div>
      </form>

      {/* Already have account link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <a href="/login/start" className="text-pink-600 font-medium hover:text-pink-700">
            Sign In
          </a>
        </p>
      </div>

      {/* Terms Sheet - Pre-fetched, no loading state! */}
      <Sheet open={showTerms} onOpenChange={setShowTerms}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader className="border-b border-slate-200 pb-4">
            <SheetTitle className="text-lg font-semibold text-slate-900">
              Terms of Use
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Last updated: {new Date(terms.lastUpdated).toLocaleDateString()} (v{terms.version})
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div
              className="prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: terms.content }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Privacy Sheet - Pre-fetched, no loading state! */}
      <Sheet open={showPrivacy} onOpenChange={setShowPrivacy}>
        <SheetContent side="bottom" className="h-[90vh] flex flex-col">
          <SheetHeader className="border-b border-slate-200 pb-4">
            <SheetTitle className="text-lg font-semibold text-slate-900">
              Privacy Policy
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Last updated: {new Date(privacy.lastUpdated).toLocaleDateString()} (v{privacy.version})
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div
              className="prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: privacy.content }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </AuthLayout>
  )
}
