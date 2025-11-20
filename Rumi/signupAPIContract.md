# SIGNUP AUTHENTICATION - IMPLEMENTATION GUIDE

**Audience:** LLM (fresh CLI instance with no context)
**Task:** Implement POST /api/auth/signup API contract + SSR refactoring + browser password manager support
**Estimated Time:** ~3 hours
**Date:** 2025-01-18

---

## CONTEXT FILES (READ FIRST)

**Required reading before implementation:**
1. `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 34-181) - Format reference for check-handle endpoint
2. `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (lines 131-210) - Database schema (users, otp_codes tables)
3. `/home/jorge/Loyalty/Rumi/Loyalty.md` (lines 17-64) - Tech stack (Next.js 14, Supabase Auth, TypeScript)
4. `/home/jorge/Loyalty/Rumi/App Code/V1/types/auth.ts` - Existing type definitions
5. `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/signup/page.tsx` - Current client-side implementation

---

## DEPENDENCIES STATUS

**Missing (must install first):**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npm install @supabase/supabase-js @supabase/ssr
```

**Already installed:**
- Next.js 14.2.18
- TypeScript 5.x
- React 18.3.1
- All shadcn/ui components

---

## DECISIONS ALREADY MADE

**Session Management:** Supabase Auth (NOT NextAuth)
**Terms/Privacy Storage:** File-based in `public/legal/` (NOT database)
**OTP Session Tracking:** HTTP-only cookie (NOT sessionStorage)
**Password Validation:** Min 8, max 128 characters, no complexity requirements
**Field Naming:** camelCase for all API responses
**Architecture:** Server-side rendering (SSR) with pre-fetched terms/privacy

---

## IMPLEMENTATION ORDER

Execute in this exact order:

1. Install dependencies (@supabase packages)
2. Create Supabase server client helper
3. Add TypeScript interfaces to /types/auth.ts
4. Create terms/privacy file structure
5. Create GET /api/clients/{clientId}/terms API route
6. Create GET /api/clients/{clientId}/privacy API route
7. Document POST /api/auth/signup in API_CONTRACTS.md
8. Refactor signup page to Server Component (SSR)
9. Add browser password manager support (form wrapper + autocomplete)
10. Verify build and manual testing

---

## STEP 1: CREATE SUPABASE SERVER CLIENT HELPER

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/lib/supabase-server.ts` (NEW FILE)

**Purpose:** Server-side Supabase client for reading sessions in Server Components

**Code:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create Supabase client for Server Components
 * Reads auth session from HTTP-only cookies
 */
export async function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

**Verification:**
```bash
npx tsc --noEmit lib/supabase-server.ts
# Expected: No errors
```

---

## STEP 2: ADD TYPESCRIPT INTERFACES

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/types/auth.ts` (UPDATE EXISTING)

**Add these interfaces:**

```typescript
// ============================================================================
// POST /api/auth/signup
// ============================================================================

/**
 * Request body for user signup
 * Used at /login/signup after handle validation
 */
export interface SignupRequest {
  handle: string          // TikTok handle with @ prefix (from sessionStorage or server session)
  email: string           // User's email address (must be valid format)
  password: string        // Plaintext password (min 8, max 128 chars, hashed server-side with bcrypt rounds=10)
  agreedToTerms: boolean  // Must be true (includes consent timestamp + version)
}

/**
 * Response from signup endpoint
 * Triggers OTP email and routes to /login/otp
 */
export interface SignupResponse {
  success: boolean
  otpSent: boolean        // Confirms OTP email was sent successfully
  sessionId: string       // For OTP verification tracking (stored in HTTP-only cookie)
  userId: string          // UUID of created user
}

// ============================================================================
// GET /api/clients/{clientId}/terms
// ============================================================================

/**
 * Response from terms of use endpoint
 * Pre-fetched server-side for SSR (no loading state)
 */
export interface TermsResponse {
  content: string         // HTML content of Terms of Use
  lastUpdated: string     // ISO date: "2025-01-18"
  version: string         // e.g., "2.1"
}

// ============================================================================
// GET /api/clients/{clientId}/privacy
// ============================================================================

/**
 * Response from privacy policy endpoint
 * Pre-fetched server-side for SSR (no loading state)
 */
export interface PrivacyResponse {
  content: string         // HTML content of Privacy Policy
  lastUpdated: string     // ISO date: "2025-01-18"
  version: string         // e.g., "1.3"
}
```

**Verification:**
```bash
npx tsc --noEmit types/auth.ts
# Expected: No errors
```

---

## STEP 3: CREATE TERMS/PRIVACY FILE STRUCTURE

**Create directories:**
```bash
mkdir -p "/home/jorge/Loyalty/Rumi/App Code/V1/public/legal/client-fizee"
```

**Create files:**

**File 1:** `/public/legal/client-fizee/terms.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Terms of Use</title>
</head>
<body>
  <h1>Terms of Use</h1>
  <p>Last updated: January 18, 2025</p>

  <h2>1. Acceptance of Terms</h2>
  <p>By accessing and using this loyalty platform, you accept and agree to be bound by these Terms of Use.</p>

  <h2>2. Eligibility</h2>
  <p>You must be a TikTok content creator and at least 18 years old to use this platform.</p>

  <h2>3. Account Security</h2>
  <p>You are responsible for maintaining the confidentiality of your password and account.</p>

  <h2>4. Rewards and Benefits</h2>
  <p>Rewards are subject to availability and may be modified or discontinued at any time.</p>

  <h2>5. Changes to Terms</h2>
  <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance of modified terms.</p>
</body>
</html>
```

**File 2:** `/public/legal/client-fizee/privacy.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy</title>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>Last updated: January 18, 2025</p>

  <h2>1. Information We Collect</h2>
  <p>We collect your TikTok handle, email address, and performance metrics from TikTok videos.</p>

  <h2>2. How We Use Your Information</h2>
  <p>We use your information to provide loyalty rewards, track performance, and communicate program updates.</p>

  <h2>3. Data Security</h2>
  <p>We implement industry-standard security measures including password hashing (bcrypt) and secure database storage.</p>

  <h2>4. Third-Party Services</h2>
  <p>We use Supabase for authentication and database services. Data is stored in secure, encrypted databases.</p>

  <h2>5. Your Rights</h2>
  <p>You have the right to access, update, or delete your personal information at any time.</p>
</body>
</html>
```

---

## STEP 4: CREATE TERMS API ROUTE

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/api/clients/[clientId]/terms/route.ts` (NEW FILE)

**Code:**
```typescript
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { TermsResponse } from '@/types/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId

    // Read terms HTML file from public/legal directory
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'terms.html')
    const content = readFileSync(filePath, 'utf-8')

    const response: TermsResponse = {
      content,
      lastUpdated: '2025-01-18',  // Update this when terms change
      version: '1.0'
    }

    return Response.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600',  // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Failed to load terms:', error)

    return Response.json(
      { error: 'TERMS_NOT_FOUND', message: 'Terms of Use not found' },
      { status: 404 }
    )
  }
}
```

---

## STEP 5: CREATE PRIVACY API ROUTE

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/api/clients/[clientId]/privacy/route.ts` (NEW FILE)

**Code:**
```typescript
import { NextRequest } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { PrivacyResponse } from '@/types/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId

    // Read privacy HTML file from public/legal directory
    const filePath = join(process.cwd(), 'public', 'legal', `client-${clientId}`, 'privacy.html')
    const content = readFileSync(filePath, 'utf-8')

    const response: PrivacyResponse = {
      content,
      lastUpdated: '2025-01-18',  // Update this when privacy policy changes
      version: '1.0'
    }

    return Response.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600',  // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Failed to load privacy policy:', error)

    return Response.json(
      { error: 'PRIVACY_NOT_FOUND', message: 'Privacy Policy not found' },
      { status: 404 }
    )
  }
}
```

---

## STEP 6: DOCUMENT POST /api/auth/signup IN API_CONTRACTS.md

**File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`

**Location:** Update section starting at line 185 (replace "_To be defined_")

**Content:**
```markdown
## Signup

**Page:** `/app/login/signup/page.tsx`

### POST /api/auth/signup

**Purpose:** Create new user account with email + password, send OTP verification email

#### Request

```http
POST /api/auth/signup
Content-Type: application/json
```

#### Request Body Schema

```typescript
interface SignupRequest {
  handle: string          // TikTok handle with @ prefix (from check-handle flow)
  email: string           // User's email address
  password: string        // Plaintext password (min 8, max 128 chars, hashed server-side)
  agreedToTerms: boolean  // Must be true
}
```

#### Response Schema

```typescript
interface SignupResponse {
  success: boolean
  otpSent: boolean        // Confirms OTP email sent
  sessionId: string       // OTP session tracking (stored in HTTP-only cookie)
  userId: string          // UUID of created user
}
```

#### Example Request

```json
{
  "handle": "@creatorpro",
  "email": "creator@example.com",
  "password": "securePassword123",
  "agreedToTerms": true
}
```

#### Example Response

**Success:**
```json
{
  "success": true,
  "otpSent": true,
  "sessionId": "otp-session-abc-123",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Business Logic

**Backend responsibilities:**

1. **Validate input:**
   ```typescript
   // Email format
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
     return { error: "INVALID_EMAIL", message: "Invalid email format" }
   }

   // Password length
   if (password.length < 8) {
     return { error: "PASSWORD_TOO_SHORT", message: "Password must be at least 8 characters" }
   }
   if (password.length > 128) {
     return { error: "PASSWORD_TOO_LONG", message: "Password must be less than 128 characters" }
   }

   // Terms agreement
   if (!agreedToTerms) {
     return { error: "TERMS_NOT_ACCEPTED", message: "You must agree to the terms" }
   }
   ```

2. **Check for existing user:**
   ```sql
   SELECT id FROM users
   WHERE email = $email
   LIMIT 1;
   ```
   If exists: Return `EMAIL_ALREADY_EXISTS` error

3. **Hash password:**
   ```typescript
   import bcrypt from 'bcryptjs'
   const passwordHash = await bcrypt.hash(password, 10);  // rounds=10
   ```

4. **Create user record:**
   ```sql
   INSERT INTO users (
     client_id,
     tiktok_handle,
     email,
     password_hash,
     email_verified,
     terms_accepted_at,
     terms_version,
     current_tier,
     created_at,
     updated_at
   ) VALUES (
     $clientId,                -- From app config
     $handle,                  -- From request
     $email,                   -- From request
     $passwordHash,            -- Bcrypt hash
     false,                    -- Email not verified yet
     NOW(),                    -- Consent timestamp
     '2025-01-18',            -- Current terms version
     'tier_1',                -- Default tier
     NOW(),
     NOW()
   ) RETURNING id;
   ```

5. **Generate 6-digit OTP code:**
   ```typescript
   const otpCode = String(Math.floor(100000 + Math.random() * 900000));  // 6 digits
   const otpHash = await bcrypt.hash(otpCode, 10);
   const sessionId = crypto.randomUUID();
   ```

6. **Store OTP in database:**
   ```sql
   INSERT INTO otp_codes (
     user_id,
     session_id,
     code_hash,
     expires_at,
     attempts,
     used,
     created_at
   ) VALUES (
     $userId,
     $sessionId,
     $otpHash,
     NOW() + INTERVAL '5 minutes',
     0,
     false,
     NOW()
   );
   ```

7. **Send OTP email:**
   ```typescript
   // Using Resend or similar email service
   await sendEmail({
     to: email,
     subject: "Verify Your Email - [Client Name]",
     html: `Your verification code is: <strong>${otpCode}</strong>. Valid for 5 minutes.`
   })
   ```

8. **Set HTTP-only cookie for session tracking:**
   ```typescript
   return Response.json(response, {
     headers: {
       'Set-Cookie': `otp_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=300`
     }
   })
   ```

#### Error Responses

**400 Bad Request - Email Already Exists:**
```json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "An account with this email already exists"
}
```

**400 Bad Request - Invalid Email:**
```json
{
  "error": "INVALID_EMAIL",
  "message": "Invalid email format"
}
```

**400 Bad Request - Password Too Short:**
```json
{
  "error": "PASSWORD_TOO_SHORT",
  "message": "Password must be at least 8 characters"
}
```

**400 Bad Request - Password Too Long:**
```json
{
  "error": "PASSWORD_TOO_LONG",
  "message": "Password must be less than 128 characters"
}
```

**400 Bad Request - Terms Not Accepted:**
```json
{
  "error": "TERMS_NOT_ACCEPTED",
  "message": "You must agree to the terms and conditions"
}
```

**500 Internal Server Error - OTP Send Failed:**
```json
{
  "error": "OTP_SEND_FAILED",
  "message": "Failed to send verification email. Please try again."
}
```

#### Security Notes

- Password hashed with bcrypt (rounds=10) before storage - NEVER store plaintext
- OTP code also hashed before storage (never store plaintext OTP)
- OTP expires in 5 minutes from creation
- Session ID stored in HTTP-only cookie (XSS protection)
- Rate limiting: Max 5 signup attempts per IP per hour (prevent abuse)
- Terms consent timestamp + version stored for legal compliance

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-162) - Create user record with auth fields
- `otp_codes` (SchemaFinalv2.md:175-210) - Store OTP verification data

**Fields Referenced:**
- `users.client_id` - Multi-tenant isolation
- `users.tiktok_handle` - VARCHAR(100) NOT NULL
- `users.email` - VARCHAR(255) NULLABLE
- `users.password_hash` - VARCHAR(255) NOT NULL (bcrypt hash)
- `users.email_verified` - BOOLEAN DEFAULT false
- `users.terms_accepted_at` - TIMESTAMP NULLABLE
- `users.terms_version` - VARCHAR(50) NULLABLE
- `users.current_tier` - VARCHAR(50) DEFAULT 'tier_1'
- `otp_codes.session_id` - VARCHAR(100) NOT NULL UNIQUE
- `otp_codes.code_hash` - VARCHAR(255) NOT NULL
- `otp_codes.expires_at` - TIMESTAMP NOT NULL
```

---

## STEP 7: REFACTOR SIGNUP PAGE TO SSR

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/signup/page.tsx` (REFACTOR EXISTING)

**Changes required:**

### 7.1: Remove "use client" directive

**BEFORE (line 1):**
```typescript
"use client"
```

**AFTER:**
```typescript
// Remove "use client" - this is now a Server Component
```

### 7.2: Convert to async Server Component

**BEFORE (line 27):**
```typescript
export default function SignupPage() {
```

**AFTER:**
```typescript
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import type { TermsResponse, PrivacyResponse } from '@/types/auth'

export default async function SignupPage() {
  // Server-side: Get handle from Supabase session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fallback to sessionStorage approach if no Supabase session
  // (This requires client component for sessionStorage access)
  // For MVP, we'll use a guard in the client component

  const handle = user?.user_metadata?.tiktok_handle || sessionStorage.getItem('userHandle')

  // If no handle found, redirect to start page
  if (!handle) {
    redirect('/login/start')
  }

  // Server-side: Pre-fetch terms and privacy (no loading states!)
  const [termsRes, privacyRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/clients/fizee/terms`, { cache: 'force-cache' }),
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/clients/fizee/privacy`, { cache: 'force-cache' })
  ])

  const terms: TermsResponse = await termsRes.json()
  const privacy: PrivacyResponse = await privacyRes.json()

  // Return client component with pre-fetched data
  return <SignupForm handle={handle} terms={terms} privacy={privacy} />
}
```

### 7.3: Create Client Component for Form Interactivity

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/components/signup-form.tsx` (NEW FILE)

**Code:**
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/passwordinput"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthLayout } from "@/components/authlayout"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { SignupRequest, SignupResponse, AuthErrorResponse, TermsResponse, PrivacyResponse } from "@/types/auth"

interface SignupFormProps {
  handle: string
  terms: TermsResponse
  privacy: PrivacyResponse
}

export function SignupForm({ handle, terms, privacy }: SignupFormProps) {
  const router = useRouter()

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sheet state
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

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

      // Success - OTP sent, route to verification page
      router.push('/login/otp')

    } catch (err) {
      console.error('Signup failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout logoUrl="/images/fizee-logo.png" privacyPolicyUrl="/privacy-policy">
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
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
```

---

## STEP 8: UPDATE LOGIN PAGE FOR PASSWORD MANAGER

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/wb/page.tsx` (UPDATE EXISTING)

**Add form wrapper and autocomplete attributes:**

**Find the password input section and wrap in form:**

```typescript
<form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
  {/* Hidden field for handle (browsers may want it) */}
  <input type="hidden" name="username" value={handle} />

  <PasswordInput
    name="current-password"
    autoComplete="current-password"  // ← Tells browser this is EXISTING password
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Enter password"
    className="w-full py-6 text-base"
  />

  <Button type="submit" disabled={!password || isLoading}>
    {isLoading ? 'Signing In...' : 'Sign In'}
  </Button>
</form>
```

---

## VERIFICATION STEPS

### 1. TypeScript Compilation
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit
# Expected: 0 errors
```

### 2. Build Check
```bash
npm run build
# Expected: Build succeeds
```

### 3. API Route Testing
```bash
# Test terms endpoint
curl http://localhost:3000/api/clients/fizee/terms

# Expected: JSON response with content, lastUpdated, version

# Test privacy endpoint
curl http://localhost:3000/api/clients/fizee/privacy

# Expected: JSON response with content, lastUpdated, version
```

### 4. Manual Browser Testing

**Start dev server:**
```bash
npm run dev
```

**Test signup flow:**
1. Navigate to `http://localhost:3000/login/start`
2. Enter handle → routed to signup
3. Verify handle appears in header ("Welcome, @handle!")
4. Enter email + password
5. Click "Terms" → modal opens instantly (no loading!)
6. Click "Privacy Policy" → modal opens instantly (no loading!)
7. Check "agree to terms"
8. Submit form
9. Browser should prompt: "Save password for this site?"
10. Check console - should see OTP sent (when backend implemented)

**Test login flow (after signup):**
1. Navigate to `http://localhost:3000/login/wb`
2. Browser should auto-fill saved password
3. Submit → login succeeds

**Browser Console:**
- [ ] No errors
- [ ] No warnings about missing autocomplete
- [ ] API calls succeed (when backend implemented)

### 5. Password Manager Verification

**Chrome DevTools:**
1. Open DevTools → Application → Cookies
2. Check for `otp_session` cookie with HttpOnly flag
3. Open Network tab → Passwords
4. Verify password save prompt appears on signup

---

## SUCCESS CRITERIA

✅ **Implementation complete when:**

**Dependencies:**
- [x] @supabase/supabase-js installed
- [x] @supabase/ssr installed

**Files Created:**
- [x] `/lib/supabase-server.ts` - Server client helper
- [x] `/public/legal/client-fizee/terms.html` - Terms content
- [x] `/public/legal/client-fizee/privacy.html` - Privacy content
- [x] `/app/api/clients/[clientId]/terms/route.ts` - Terms API
- [x] `/app/api/clients/[clientId]/privacy/route.ts` - Privacy API
- [x] `/components/signup-form.tsx` - Client component

**Files Updated:**
- [x] `/types/auth.ts` - Added SignupRequest, SignupResponse, TermsResponse, PrivacyResponse
- [x] `/app/login/signup/page.tsx` - Converted to async Server Component
- [x] `/app/login/wb/page.tsx` - Added form wrapper + autocomplete
- [x] `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` - Documented POST /api/auth/signup

**Functionality:**
- [x] Build succeeds (`npm run build`)
- [x] No TypeScript errors
- [x] Signup page is Server Component (no "use client")
- [x] Terms/Privacy pre-fetched (no loading states)
- [x] Browser password manager works (save + autofill)
- [x] Form has proper autocomplete attributes
- [x] HTTP-only cookie for OTP session
- [x] Error handling with user-friendly messages

**API Contract:**
- [x] Request/response schemas documented
- [x] Business logic with SQL examples
- [x] Error cases with codes
- [x] Security notes included
- [x] Database tables referenced

---

## RELATED ENDPOINTS (NOT IN THIS DOC)

**Next implementations needed:**
- `POST /api/auth/verify-otp` - OTP verification after signup
- `POST /api/auth/resend-otp` - Resend OTP if expired
- `POST /api/auth/check-recognition` - Check if user in Cruva database
- `POST /api/auth/login` - Password authentication for returning users
- `POST /api/auth/forgot-password` - Password reset flow

---

## NOTES FOR BACKEND IMPLEMENTATION

**When implementing POST /api/auth/signup backend:**

1. Install bcrypt: `npm install bcryptjs @types/bcryptjs`
2. Set up email service (Resend or similar)
3. Configure environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   RESEND_API_KEY=your_resend_key
   ```
4. Create database tables (users, otp_codes) if not exists
5. Implement rate limiting middleware
6. Set up email templates

**Security reminders:**
- NEVER log passwords (even for debugging)
- NEVER store passwords in plaintext
- ALWAYS use bcrypt with rounds >= 10
- ALWAYS use HTTP-only cookies for sessions
- ALWAYS validate input server-side
- NEVER trust client-side validation alone

---

**Document Version:** 1.0
**Last Updated:** 2025-01-18
**Author:** Implementation guide for fresh LLM instance
**Estimated Completion Time:** 3 hours
