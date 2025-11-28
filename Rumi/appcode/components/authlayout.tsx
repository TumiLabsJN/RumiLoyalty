"use client"

  import Link from "next/link"

  /**
   * AUTH LAYOUT COMPONENT
   *
   * Reusable authentication page wrapper used across all auth flows:
   * - Login page
   * - Signup page
   * - Password reset
   * - Email verification
   *
   * Dynamic Elements (from backend):
   * - logoUrl: Client-specific logo (from clients.logo_url)
   * - privacyPolicyUrl: Client-specific privacy page (from clients.privacy_policy_url)
   *
   * Static Elements:
   * - "Rewards Program" text
   * - Overall layout structure
   * - Footer styling
   *
   * Usage Example:
   * <AuthLayout logoUrl="/images/logo.png" privacyPolicyUrl="/privacy">
   *   <h1>Page Title</h1>
   *   <Input />
   *   <Button />
   * </AuthLayout>
   */

  interface AuthLayoutProps {
    /**
     * Page-specific content (header, form, buttons, etc.)
     * This is the "children slot" - whatever you put between
     * <AuthLayout>...</AuthLayout> tags will appear here
     */
    children: React.ReactNode

    /**
     * Dynamic: Client logo URL from backend
     * @example "/images/client-uuid.png"
     * Database: clients.logo_url
     */
    logoUrl?: string

    /**
     * Dynamic: Privacy policy URL for this client
     * @example "/privacy-policy" or "/privacy-policy?client=xyz"
     * Database: clients.privacy_policy_url
     */
    privacyPolicyUrl?: string
  }

  export function AuthLayout({
    children,
    logoUrl = "/images/fizee-logo.png", // Default/fallback logo
    privacyPolicyUrl = "/privacy-policy", // Default/fallback URL
  }: AuthLayoutProps) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Main Content Container */}
        <div className="flex-1 flex flex-col px-6">
          <div className="w-full max-w-sm mx-auto">
            {/* Logo + Rewards Program - Top Section (REUSABLE) */}
            <div className="flex flex-col items-center pt-16 pb-8">
              {/* Dynamic: Client Logo */}
              {/* Backend provides: clients.logo_url */}
              <img
                src={logoUrl}
                alt="Client Logo"
                className="w-24 h-24 object-contain"
              />

              {/* Static: Rewards Program label */}
              <p className="text-xl font-semibold text-slate-700 mt-3">Rewards Program</p>
            </div>

            {/* Spacer */}
            <div className="mt-12">
              {/* CHILDREN SLOT - Page-specific content goes here */}
              {/* This is where the "black box" content will appear */}
              {children}
            </div>
          </div>
        </div>

        {/* Footer (REUSABLE) */}
        <div className="pb-8 px-6">
          <div className="flex items-center justify-center">
            {/* Dynamic: Privacy Policy URL per client */}
            {/* Backend provides: clients.privacy_policy_url */}
            <Link href={privacyPolicyUrl} className="text-xs text-slate-500 hover:text-slate-700">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    )
  }
