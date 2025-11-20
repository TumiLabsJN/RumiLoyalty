# WELCOME UNRECOGNIZED PAGE FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** First-Time User Welcome & Onboarding Info
**Created:** 2025-01-20
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx`

**API Endpoint:**
- GET /api/auth/onboarding-info

**Contract Reference:** /home/jorge/Loyalty/Rumi/API_CONTRACTS.md (lines TBD - will be ~1300-1450)
**Schema Reference:** /home/jorge/Loyalty/Rumi/SchemaFinalv2.md (clients table, lines 105-128)
**Estimated Effort:** ~1.5 hours
**Execution Strategy:** Hybrid approach - ENV vars for logo/privacy, API for welcome message

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx`
- **Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts` (will add OnboardingInfoResponse)
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (will document GET /api/auth/onboarding-info)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (lines 105-128: clients table)
- **Environment Variables:** `.env.local` (will add NEXT_PUBLIC_CLIENT_LOGO_URL, NEXT_PUBLIC_PRIVACY_POLICY_URL)

### Dependencies
- Next.js 14.2.18 (App Router)
- React 18.3.1
- TypeScript 5.x
- AuthLayout component (shared auth wrapper)

### Project Structure
```
app/
├── types/
│   └── auth.ts              ← ADD OnboardingInfoResponse interface
├── login/
│   ├── welcomeunr/
│   │   └── page.tsx         ← MODIFY THIS (52 lines currently)
│   ├── loading/
│   │   └── page.tsx         ← Routes here from loading page (if isRecognized = false)
│   └── ...
├── home/
│   └── page.tsx             ← Routes here after user clicks "Explore Program"
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `page.tsx` - 52 lines
- Client-side component ("use client")

**Current Features:**
- ✅ Welcome message with emojis
- ✅ Onboarding start date message
- ✅ "Explore Program" button
- ✅ Routes to /home on button click

**Current Data Structure:**
```typescript
// Lines 17-18: Hardcoded configuration
const logoUrl = "/images/fizee-logo.png"           // ← Hardcoded
const privacyPolicyUrl = "/privacy-policy"         // ← Hardcoded

// Lines 29-37: Hardcoded welcome message
<h1>🎉 Welcome! 🎉</h1>                           // ← Hardcoded
<p>You're all set! Our onboarding begins this coming Monday.</p>  // ← Hardcoded
<p>👀 Watch your DMs for your sample request link.</p>           // ← Hardcoded

// Line 46: Hardcoded button text
<Button>Explore Program</Button>                   // ← Hardcoded
```

### What's Wrong
**Mismatches with Best Practices:**
- ❌ No TypeScript interfaces imported from `@/types/auth`
- ❌ Hardcoded logo URL (should use env var from clients.logo_url)
- ❌ Hardcoded privacy policy URL (should use env var)
- ❌ Hardcoded welcome message (should come from backend - client-specific)
- ❌ Hardcoded date reference "coming Monday" (not dynamic, could be outdated)
- ❌ Hardcoded communication method "DMs" (could be email, SMS, etc. for different clients)
- ❌ Hardcoded button text (backend may want "Get Started", "Continue", etc.)
- ❌ No loading state (API call has no loading indicator)
- ❌ No error handling (what if API fails?)

**Specific Issues:**
1. **Line 17:** Hardcoded logo URL (should be `process.env.NEXT_PUBLIC_CLIENT_LOGO_URL`)
2. **Line 18:** Hardcoded privacy URL (should be `process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL`)
3. **Line 29-30:** Hardcoded heading with emojis (should come from API)
4. **Line 33:** "coming Monday" is not dynamic (could be past date, wrong day)
5. **Line 36:** "Watch your DMs" assumes TikTok DMs (could be email for other clients)
6. **Line 46:** Button text hardcoded (backend may want different CTA)
7. **No API call:** All content is static (not client-customizable)

### Target State
**After completion:**
- ✅ Import and use TypeScript interfaces from `@/types/auth`
- ✅ Logo URL from environment variable (per-client branding)
- ✅ Privacy policy URL from environment variable
- ✅ Welcome message from backend API (client-specific, customizable)
- ✅ Loading state while fetching onboarding info
- ✅ Error handling with fallback message
- ✅ Type-safe with OnboardingInfoResponse interface
- ✅ Ready for backend deployment (zero frontend changes needed)

---

## DATA SOURCE STRATEGY - HYBRID APPROACH

### Rationale for Hybrid:

**Environment Variables (Static, Rarely Changes):**
- ✅ Logo URL - Set per client, rarely changes, no need for API roundtrip
- ✅ Privacy Policy URL - Static, same reason

**Backend API (Dynamic, Frequently Changes):**
- ✅ Welcome heading - Client-specific, A/B testable
- ✅ Welcome message - Can include dynamic dates, personalization
- ✅ Submessage - Different communication channels per client
- ✅ Button text - Different CTAs per client ("Get Started", "Continue", etc.)

**Why Hybrid is Best:**
- Fast (no API call for logo/privacy)
- Flexible (backend controls messaging without redeployment)
- Client-specific (multi-tenant ready)
- Marketable (non-devs can update welcome message)
- Future-proof (can add personalization, localization, A/B testing)

---

## FIELD MAPPING TABLE

### Complete Mapping: Frontend → Data Sources

| Current Frontend | Data Source | Type | Notes |
|-----------------|-------------|------|-------|
| `logoUrl` (line 17) | ENV VAR | `string` | REPLACE: `process.env.NEXT_PUBLIC_CLIENT_LOGO_URL` |
| `privacyPolicyUrl` (line 18) | ENV VAR | `string` | REPLACE: `process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL` |
| "🎉 Welcome! 🎉" (line 29) | BACKEND API | `string` | REPLACE: `data.heading` |
| "You're all set! Our onboarding begins this coming Monday." (line 33) | BACKEND API | `string` | REPLACE: `data.message` |
| "👀 Watch your DMs for your sample request link." (line 36) | BACKEND API | `string` | REPLACE: `data.submessage` |
| "Explore Program" (line 46) | BACKEND API | `string` | REPLACE: `data.buttonText` |

### Key Restructuring Changes

**Change 1: Logo & Privacy from ENV**
```typescript
// BEFORE (lines 17-18):
const logoUrl = "/images/fizee-logo.png"           // ❌ Hardcoded
const privacyPolicyUrl = "/privacy-policy"         // ❌ Hardcoded

// AFTER:
const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"
// ✅ Uses env vars with fallback defaults
```

**Change 2: Welcome Content from API**
```typescript
// BEFORE (lines 29-37, 46):
<h1>🎉 Welcome! 🎉</h1>
<p>You're all set! Our onboarding begins this coming Monday.</p>
<p>👀 Watch your DMs for your sample request link.</p>
<Button>Explore Program</Button>

// AFTER:
const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfoResponse | null>(null)

useEffect(() => {
  const fetchOnboardingInfo = async () => {
    const response = await fetch('/api/auth/onboarding-info')
    const data = await response.json()
    setOnboardingInfo(data)
  }
  fetchOnboardingInfo()
}, [])

<h1>{onboardingInfo.heading}</h1>
<p>{onboardingInfo.message}</p>
<p>{onboardingInfo.submessage}</p>
<Button>{onboardingInfo.buttonText}</Button>
// ✅ Backend controls all messaging
```

---

## API CONTRACT DESIGN

### GET /api/auth/onboarding-info

**Purpose:** Provide client-specific welcome and onboarding information for first-time users

**Authentication:** Required (session cookie from login/OTP)

**Query Parameters:** None

**Request Headers:**
- Cookie: `auth-token` (HTTP-only session cookie)

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| heading | string | Welcome heading (can include emojis) |
| message | string | Main onboarding message (can include dynamic dates) |
| submessage | string | Secondary message (communication channel info) |
| buttonText | string | CTA button text |

**TypeScript Interface:**
```typescript
export interface OnboardingInfoResponse {
  heading: string      // Welcome heading (e.g., "🎉 Welcome! 🎉")
  message: string      // Main message (e.g., "Our onboarding begins January 27th!")
  submessage: string   // Secondary message (e.g., "Watch your DMs for details")
  buttonText: string   // Button CTA (e.g., "Explore Program", "Get Started")
}
```

**Example Response (TikTok influencer client):**
```json
{
  "heading": "🎉 Welcome! 🎉",
  "message": "You're all set! Our onboarding begins this coming Monday.",
  "submessage": "👀 Watch your DMs for your sample request link.",
  "buttonText": "Explore Program"
}
```

**Example Response (Different client with email onboarding):**
```json
{
  "heading": "Welcome to the Program!",
  "message": "Your onboarding starts on January 27th, 2025.",
  "submessage": "Check your email inbox for next steps.",
  "buttonText": "Get Started"
}
```

**Business Logic:**

```sql
-- Step 1: Get authenticated user from session token
-- (JWT decode or session lookup from HTTP-only cookie)

-- Step 2: Get user's client_id
SELECT client_id
FROM users
WHERE id = $1;  -- From authenticated session

-- Step 3: Get client configuration (future: onboarding_config table)
-- For MVP: Return default hardcoded message
-- Future: Query onboarding_messages table by client_id

-- Step 4: Build response with dynamic content
-- Can include:
-- - Dynamic dates (next Monday, specific date)
-- - Client-specific communication channels (DMs, email, SMS)
-- - Localization (language based on user preference)
-- - A/B testing variants

-- Step 5: Return response
```

**Backend Implementation Notes:**

1. **MVP Implementation:**
   - Hardcode response in backend (one client)
   - Can be simple JavaScript object returned by endpoint

2. **Future Multi-Client:**
   - Create `onboarding_messages` table with client_id foreign key
   - Store heading, message, submessage, buttonText per client
   - Query based on user's client_id

3. **Dynamic Dates:**
   - Backend can calculate "next Monday" or specific dates
   - Example: "Onboarding begins January 27th, 2025"

4. **Localization Ready:**
   - Can add `language` field to response
   - Return translated content based on user preference

5. **A/B Testing:**
   - Can randomize variants and track conversion
   - Example: "Get Started" vs "Explore Program"

#### Error Responses

**401 Unauthorized - Not Authenticated:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Please log in to continue."
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Something went wrong. Please try again."
}
```

#### Security Notes

- Requires valid session token (HTTP-only cookie)
- No sensitive data exposed (just UI copy/text)
- Can be cached (onboarding info doesn't change per request)
- Rate limiting not critical (one-time page load)

#### Database Tables Used

**Primary (Future):**
- `onboarding_messages` (to be created) - Store client-specific onboarding copy

**Current (MVP):**
- `users` (SchemaFinalv2.md:131-172) - Get user's client_id
- `clients` (SchemaFinalv2.md:105-128) - Client configuration

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.client_id` - UUID REFERENCES clients(id)
- `clients.id` - UUID PRIMARY KEY
- `clients.name` - VARCHAR(255) (for logging/debugging)

---

## IMPLEMENTATION PLAN - 7 PHASES

### Phase 1: Create/Update Type Definitions

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`

**Action:** Add OnboardingInfoResponse interface after UserStatusResponse

**Changes:**
```typescript
// ADD after UserStatusResponse (around line 180+)
// ============================================================================
// GET /api/auth/onboarding-info
// ============================================================================

/**
 * Response from onboarding-info endpoint
 * Provides client-specific welcome message for first-time users
 */
export interface OnboardingInfoResponse {
  heading: string      // Welcome heading (can include emojis)
  message: string      // Main onboarding message (can include dynamic dates)
  submessage: string   // Secondary message (communication channel info)
  buttonText: string   // CTA button text
}
```

**Verification:**
- ✅ Interface matches API contract exactly
- ✅ Clear JSDoc comments
- ✅ Located after UserStatusResponse

---

### Phase 2: Replace Hardcoded Values with ENV and State

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx`

**Import types and hooks (lines 1-6):**
```typescript
// BEFORE:
"use client"

import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/authlayout"
import { useRouter } from "next/navigation"

// AFTER:
"use client"

import { Button } from "@/components/ui/button"
import { AuthLayout } from "@/components/authlayout"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import type { OnboardingInfoResponse } from "@/types/auth"
```

**Replace logo/privacy URLs (lines 17-18):**
```typescript
// BEFORE:
const logoUrl = "/images/fizee-logo.png"
const privacyPolicyUrl = "/privacy-policy"

// AFTER:
const logoUrl = process.env.NEXT_PUBLIC_CLIENT_LOGO_URL || "/images/fizee-logo.png"
const privacyPolicyUrl = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy-policy"
```

**Add state for onboarding info (after logoUrl/privacyPolicyUrl):**
```typescript
// ADD:
const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfoResponse | null>(null)
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

**Verification:**
- ✅ Imports added (useState, useEffect, type)
- ✅ Environment variables used with fallback
- ✅ State defined for API data

---

### Phase 3: Integrate API Call for Onboarding Info

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx`

**Add useEffect for API call (after handleExploreProgram function):**
```typescript
// ADD BEFORE return statement:
useEffect(() => {
  const fetchOnboardingInfo = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // API call: GET /api/auth/onboarding-info
      const response = await fetch('/api/auth/onboarding-info', {
        method: 'GET',
        credentials: 'include'  // Include HTTP-only cookie
      })

      if (!response.ok) {
        throw new Error('Failed to load onboarding information')
      }

      const data = (await response.json()) as OnboardingInfoResponse
      setOnboardingInfo(data)

    } catch (err) {
      console.error('Failed to fetch onboarding info:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')

      // Fallback to default content
      setOnboardingInfo({
        heading: "🎉 Welcome! 🎉",
        message: "You're all set! Our onboarding begins soon.",
        submessage: "Watch for updates.",
        buttonText: "Explore Program"
      })
    } finally {
      setIsLoading(false)
    }
  }

  fetchOnboardingInfo()
}, [])
```

**Verification:**
- ✅ Uses fetch('/api/auth/onboarding-info')
- ✅ Type-safe with OnboardingInfoResponse
- ✅ Error handling with fallback content
- ✅ Loading state management

---

### Phase 4: Update UI to Use Dynamic Content

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/welcomeunr/page.tsx`

**Replace hardcoded content in JSX (lines 28-48):**
```typescript
// BEFORE (lines 28-48):
<div className="text-center space-y-3 mt-22 mb-24">
  <h1 className="text-2xl font-bold text-slate-900 -mt-4">
    🎉 Welcome! 🎉
  </h1>
  <p className="text-base text-slate-600 leading-relaxed pt-4">
    You're all set! Our onboarding begins this <span className="font-bold">coming Monday</span>.
  </p>
  <p className="text-base text-slate-600 leading-relaxed pt-4">
    👀 Watch your DMs for your sample request link.
  </p>
</div>

<div className="mt-8 flex justify-center">
  <Button
    onClick={handleExploreProgram}
    className="..."
  >
    Explore Program
  </Button>
</div>

// AFTER:
{isLoading ? (
  // Loading state
  <div className="text-center space-y-3 mt-22 mb-24">
    <div className="animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-48 mx-auto mb-4"></div>
      <div className="h-4 bg-slate-200 rounded w-64 mx-auto mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-56 mx-auto"></div>
    </div>
  </div>
) : onboardingInfo ? (
  // Content loaded
  <>
    <div className="text-center space-y-3 mt-22 mb-24">
      <h1 className="text-2xl font-bold text-slate-900 -mt-4">
        {onboardingInfo.heading}
      </h1>
      <p className="text-base text-slate-600 leading-relaxed pt-4">
        {onboardingInfo.message}
      </p>
      <p className="text-base text-slate-600 leading-relaxed pt-4">
        {onboardingInfo.submessage}
      </p>
    </div>

    <div className="mt-8 flex justify-center">
      <Button
        onClick={handleExploreProgram}
        className="w-64 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md"
      >
        {onboardingInfo.buttonText}
      </Button>
    </div>
  </>
) : (
  // Error fallback
  <div className="text-center space-y-3 mt-22 mb-24">
    <p className="text-slate-600">Unable to load onboarding information.</p>
  </div>
)}
```

**Verification:**
- ✅ Loading skeleton during API call
- ✅ Dynamic content from API response
- ✅ Error fallback UI
- ✅ All hardcoded text replaced

---

### Phase 5: Remove Client-Side Business Logic ✅

**Verification:**
- ✅ No client-side business logic present (just UI state management)
- ✅ Backend owns onboarding message content
- ✅ Frontend just displays what backend provides

**No changes needed.**

---

### Phase 6: Verify Error Display ✅

**Current Implementation:**
- ✅ Loading state (skeleton UI)
- ✅ Error handling (try/catch with fallback)
- ✅ Graceful degradation (shows default message on error)

**Verification:**
- ✅ User never sees blank page
- ✅ Error logged to console for debugging
- ✅ Fallback content ensures page is functional

**No additional changes needed.**

---

### Phase 7: Add Environment Variables

**File:** `.env.local` (or `.env.example` for documentation)

**Add:**
```bash
# Client Branding (from clients table)
NEXT_PUBLIC_CLIENT_LOGO_URL=/images/fizee-logo.png
NEXT_PUBLIC_PRIVACY_POLICY_URL=/privacy-policy

# Note: These values should come from clients.logo_url and privacy_policy_url
# Update per client deployment
```

**Verification:**
- ✅ Environment variables documented
- ✅ Default fallback values in code
- ✅ Ready for multi-tenant deployment

---

## VERIFICATION CHECKLIST

### TypeScript Compilation
```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "(login/welcomeunr|types/auth)"
# Expected: No errors in login/welcomeunr or types/auth
```

### Build Success
```bash
npm run build
# Expected: Welcome unrecognized page compiles successfully
```

### Runtime Checks
- ✅ Calls GET /api/auth/onboarding-info on mount
- ✅ Shows loading skeleton during API call
- ✅ Displays dynamic content from API
- ✅ Uses environment variables for logo/privacy URLs
- ✅ Error handling with fallback content
- ✅ Routes to /home on button click

### API Contract Alignment
- ✅ Request: GET /api/auth/onboarding-info (no body)
- ✅ Response: { heading, message, submessage, buttonText }
- ✅ All camelCase (no snake_case)
- ✅ Type-safe with OnboardingInfoResponse interface

### Environment Variable Usage
- ✅ NEXT_PUBLIC_CLIENT_LOGO_URL used with fallback
- ✅ NEXT_PUBLIC_PRIVACY_POLICY_URL used with fallback
- ✅ No hardcoded logo or privacy URLs

---

## SUCCESS CRITERIA

**All criteria must be met:**

1. 🔲 API contract documented in `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
2. 🔲 TypeScript interface (OnboardingInfoResponse) in `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`
3. 🔲 All 7 phases executed and verified
4. 🔲 Build succeeds (no errors in welcomeunr page)
5. 🔲 API call to GET /api/auth/onboarding-info on mount
6. 🔲 Loading state shows skeleton UI
7. 🔲 Dynamic content displayed from API
8. 🔲 Environment variables used for logo/privacy
9. 🔲 Type-safe with OnboardingInfoResponse
10. 🔲 Error handling with fallback content
11. 🔲 Ready for backend deployment (zero frontend changes needed)

---

## AUTH FLOW CONTEXT

```
/login/start (check-handle)
  ↓ stores handle in sessionStorage
  ├─→ /login/wb (if route === 'login')
  │     ↓ POST /api/auth/login
  │     ↓
  │   /login/loading ✅ COMPLETED
  │     ↓ GET /api/auth/user-status
  │     ↓
  │     ├─→ /home (if isRecognized: true)
  │     └─→ /login/welcomeunr ← THIS PAGE (will be implemented)
  │           ↓ GET /api/auth/onboarding-info
  │           ↓ User clicks "Explore Program"
  │           ↓
  │         /home
  │
  └─→ /login/signup (if route === 'signup')
        ↓ stores email in sessionStorage
        ↓ POST /api/auth/signup
        ↓
      /login/otp ✅ COMPLETED
        ↓ POST /api/auth/verify-otp
        ↓
      /login/loading ✅ COMPLETED
        ↓ GET /api/auth/user-status
        ↓
        └─→ /login/welcomeunr ← THIS PAGE (will be implemented)
              ↓ GET /api/auth/onboarding-info
              ↓ User clicks "Explore Program"
              ↓
            /home
```

---

## NOTES

- **Hybrid Approach:** ENV vars for static assets, API for dynamic content
- **MVP Ready:** Backend can return hardcoded response (one client)
- **Future Multi-Client:** Add onboarding_messages table with client_id
- **Dynamic Dates:** Backend can calculate "next Monday" or specific dates
- **A/B Testing Ready:** Backend can randomize button text and track conversion
- **Localization Ready:** Can add language field to API response
- **No Breaking Changes:** Fallback values ensure page works even if API fails

---

## ENVIRONMENT VARIABLES DOCUMENTATION

Add to `.env.example`:
```bash
# ============================================
# CLIENT BRANDING
# ============================================
# Logo URL for login screens (from clients.logo_url)
NEXT_PUBLIC_CLIENT_LOGO_URL=/images/fizee-logo.png

# Privacy policy URL (from clients.privacy_policy_url or static)
NEXT_PUBLIC_PRIVACY_POLICY_URL=/privacy-policy

# Note: Update these values per client deployment
# For multi-tenant: Consider fetching from API instead
```

---

**READY FOR APPROVAL - Do not implement until user reviews this guide!** 🦆

(No offense, just the silly goose emoji! 😄)
