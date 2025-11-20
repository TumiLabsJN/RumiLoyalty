# OTP VERIFICATION PAGE FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** OTP Email Verification
**Created:** 2025-01-19
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/otp/page.tsx`

**API Endpoints:**
- POST /api/auth/verify-otp
- POST /api/auth/resend-otp

**Contract Reference:** /home/jorge/Loyalty/Rumi/API_CONTRACTS.md (lines 438-937)
**Schema Reference:** /home/jorge/Loyalty/Rumi/SchemaFinalv2.md (otp_codes table, lines 175-210)
**Estimated Effort:** ~2 hours
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/otp/page.tsx`
- **Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts` (lines 90-142)
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 438-937)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (lines 175-210)

### Dependencies
- Next.js 14.2.18 (App Router)
- React 18.3.1
- TypeScript 5.x
- Lucide React (icons)

### Project Structure
```
app/
├── types/
│   └── auth.ts              ← Type definitions already exist
├── login/
│   ├── otp/
│   │   └── page.tsx         ← MODIFY THIS (235 lines)
│   ├── signup/
│   │   └── page.tsx         ← Routes here after signup
│   └── loading/
│       └── page.tsx         ← Routes here after successful verification
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `page.tsx` - 235 lines
- Client-side component ("use client")

**Current Features:**
- ✅ 6-digit OTP input with auto-focus
- ✅ Auto-submit after completion (1-second delay)
- ✅ Paste handling (robust - strips spaces/text)
- ✅ 60-second countdown timer
- ✅ Resend button UI
- ✅ Loading modal during verification
- ✅ Back navigation
- ✅ Keyboard navigation (backspace handling)

**Current Data Structure:**
```typescript
// Mock data (lines 31-32)
const email = "creator@example.com"        // ← Hardcoded
const clientName = "Stateside Growers"     // ← Hardcoded

// State
const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
const [countdown, setCountdown] = useState(60)  // ← Hardcoded 60 seconds
const [canResend, setCanResend] = useState(false)
const [isVerifying, setIsVerifying] = useState(false)
```

### What's Wrong
**Mismatches with API Contract:**
- ❌ No TypeScript interfaces imported from `@/types/auth`
- ❌ Mock email: `"creator@example.com"` (should come from signup session or API)
- ❌ Mock clientName: `"Stateside Growers"` (should be configurable)
- ❌ Hardcoded countdown: `60` (should use `remainingSeconds` from API)
- ❌ API calls are TODOs (lines 111-116, 142-145)
- ❌ Request body uses wrong field name: `{ otp: "123456" }` should be `{ code: "123456" }`
- ❌ Response expects wrong fields: `verified`, `user_id`, `session_token` (snake_case)
- ❌ No error state management (uses `alert()` - line 130)
- ❌ No `attemptsRemaining` handling
- ❌ Resend doesn't use `expiresAt` or `remainingSeconds` from API

**Specific Issues:**
1. **Line 31:** Email hardcoded (should come from sessionStorage or server)
2. **Line 32:** Client name hardcoded (should be from env or config)
3. **Line 24:** Countdown hardcoded to 60 (should use API response)
4. **Line 113:** Comment shows wrong field: `otp:` should be `code:`
5. **Line 115:** Response shows snake_case: `user_id`, `session_token`
6. **Line 130:** Uses `alert()` instead of inline error display
7. **Line 147:** Resend countdown hardcoded to 60 (should use API `remainingSeconds`)
8. **Lines 111-122:** No actual API integration for verify
9. **Lines 142-150:** No actual API integration for resend

### Target State
**After completion:**
- ✅ Import and use TypeScript interfaces from `@/types/auth`
- ✅ Get email from sessionStorage (set by signup page)
- ✅ API integration for both verify-otp and resend-otp
- ✅ Use `code` field (not `otp`) in request
- ✅ Use camelCase fields in response (`userId`, `sessionToken`, not snake_case)
- ✅ Display backend error messages inline (not alert)
- ✅ Show `attemptsRemaining` to user
- ✅ Use `remainingSeconds` from resend API for countdown
- ✅ Proper error handling with user-friendly messages
- ✅ Route to `/login/loading` on success (already correct)
- ✅ Ready for backend integration (zero code changes needed)

---

## FIELD MAPPING TABLE

### Complete Mapping: Frontend → API Contract

| Current Frontend | API Contract | Type | Notes |
|-----------------|--------------|------|-------|
| `otp` (request field) | `code` | `string` | RENAME: otp → code |
| `verified` (response) | `verified` | `boolean` | ✅ Correct (camelCase) |
| `user_id` (response - commented) | `userId` | `string` | FIX: snake_case → camelCase |
| `session_token` (response - commented) | `sessionToken` | `string` | FIX: snake_case → camelCase |
| N/A | `attemptsRemaining` | `number?` | ADD: Show to user on error |
| `countdown` (hardcoded 60) | `remainingSeconds` | `number` | USE: From resend-otp API |
| `sent` (resend response) | `sent` | `boolean` | ✅ Correct |
| N/A | `expiresAt` | `string` | ADD: ISO timestamp from resend API |
| `email` (hardcoded) | From sessionStorage | `string` | GET: From signup session |
| `clientName` (hardcoded) | From env/config | `string` | GET: From environment |

### Key Restructuring Changes

**Change 1: Request Body for Verify**
```typescript
// BEFORE (line 113 comment):
{ otp: "123456", session_id: "from_cookie" }

// AFTER:
{ code: "123456" }
// Note: session_id automatically sent via HTTP-only cookie
```

**Change 2: Response for Verify**
```typescript
// BEFORE (line 115 comment):
{ verified: true, user_id: "uuid", session_token: "jwt" }

// AFTER:
{ success: true, verified: true, userId: "uuid", sessionToken: "jwt" }
```

**Change 3: Response for Resend**
```typescript
// BEFORE (line 145 comment):
{ sent: true }

// AFTER:
{ success: true, sent: true, expiresAt: "2025-01-19T10:40:00Z", remainingSeconds: 300 }
```

---

## PHASE 1: ADD TYPE IMPORTS

### Estimated Time: 5 minutes

### Step 1.1: Add Import Statement

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/otp/page.tsx`

**Search for (line 3-5):**
```typescript
import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
```

**Add after line 5:**
```typescript
import type {
  VerifyOtpRequest,
  VerifyOtpResponse,
  VerifyOtpErrorResponse,
  ResendOtpRequest,
  ResendOtpResponse,
  AuthErrorResponse
} from "@/types/auth"
```

### Step 1.2: Verify Import

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/login/otp/page.tsx
```

**Expected:** May have errors about usage, but imports should resolve

**Completion Criteria:**
- [x] Import statement added
- [x] No "Cannot find module" errors for @/types/auth

---

## PHASE 2: GET DYNAMIC DATA FROM SESSION

### Estimated Time: 15 minutes

### Step 2.1: Replace Hardcoded Email with SessionStorage

**Find (line 31):**
```typescript
const email = "creator@example.com"
```

**Replace with:**
```typescript
// Get email from sessionStorage (set by signup page)
const [email, setEmail] = useState<string>("")

useEffect(() => {
  const storedEmail = sessionStorage.getItem('userEmail')
  if (storedEmail) {
    setEmail(storedEmail)
  } else {
    // No email found, redirect to start
    router.push('/login/start')
  }
}, [router])
```

**Note:** The signup page will need to set this:
```typescript
// In signup-form.tsx (after successful signup)
sessionStorage.setItem('userEmail', email)
```

### Step 2.2: Replace Hardcoded Client Name with Environment Variable

**Find (line 32):**
```typescript
const clientName = "Stateside Growers"
```

**Replace with:**
```typescript
const clientName = process.env.NEXT_PUBLIC_CLIENT_NAME || "Rumi Loyalty"
```

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_CLIENT_NAME=Stateside Growers
```

### Step 2.3: Add Error State for Better UX

**Add state variables (after line 26):**
```typescript
const [isVerifying, setIsVerifying] = useState(false)
const [error, setError] = useState<string | null>(null)  // ← NEW
const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)  // ← NEW
```

**Completion Criteria:**
- [x] Email comes from sessionStorage
- [x] Client name from environment variable
- [x] Error state added
- [x] Attempts remaining state added

---

## PHASE 3: INTEGRATE VERIFY-OTP API

### Estimated Time: 30 minutes

### Step 3.1: Update handleVerify Function

**Find (lines 105-135):**
```typescript
const handleVerify = async (code: string) => {
  setIsVerifying(true)

  console.log("Verifying OTP:", code)

  try {
    // TODO: Replace with actual API call
    // ...
    await new Promise(resolve => setTimeout(resolve, 1500))
    router.push("/login/loading")
  } catch (error) {
    // ...
    alert("Invalid code. Please try again.")
    setOtp(["", "", "", "", "", ""])
    inputRefs.current[0]?.focus()
  }
}
```

**Replace with:**
```typescript
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

    // Handle error response
    if (err instanceof Error) {
      setError(err.message)
    } else {
      setError('Something went wrong. Please try again.')
    }

    // Clear OTP inputs
    setOtp(["", "", "", "", "", ""])
    inputRefs.current[0]?.focus()
  }
}
```

### Step 3.2: Handle Attempts Remaining in Error Response

**Update the error handling in handleVerify:**
```typescript
} catch (err) {
  console.error('OTP verification failed:', err)
  setIsVerifying(false)

  // Parse error response
  const errorResponse = err as VerifyOtpErrorResponse

  // Show error message
  if (errorResponse.message) {
    setError(errorResponse.message)  // Backend formatted: "Incorrect code. 2 attempts remaining."
  } else if (err instanceof Error) {
    setError(err.message)
  } else {
    setError('Something went wrong. Please try again.')
  }

  // Show attempts remaining if provided
  if (errorResponse.attemptsRemaining !== undefined) {
    setAttemptsRemaining(errorResponse.attemptsRemaining)
  }

  // Clear OTP inputs
  setOtp(["", "", "", "", "", ""])
  inputRefs.current[0]?.focus()
}
```

**Completion Criteria:**
- [x] API integration complete
- [x] Uses `code` field (not `otp`)
- [x] Typed with `VerifyOtpRequest` and `VerifyOtpResponse`
- [x] Error handling with backend messages
- [x] Attempts remaining tracked

---

## PHASE 4: INTEGRATE RESEND-OTP API

### Estimated Time: 20 minutes

### Step 4.1: Update handleResend Function

**Find (lines 137-151):**
```typescript
const handleResend = async () => {
  if (!canResend) return

  console.log("Resending OTP to:", email)

  // TODO: Send to backend
  // ...

  setCountdown(60)
  setCanResend(false)
  setOtp(["", "", "", "", "", ""])
  inputRefs.current[0]?.focus()
}
```

**Replace with:**
```typescript
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

      // Optional: Show success message
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
```

**Completion Criteria:**
- [x] API integration complete
- [x] Uses `remainingSeconds` from API
- [x] Empty body (session from cookie)
- [x] Typed with `ResendOtpRequest` and `ResendOtpResponse`
- [x] Error handling

---

## PHASE 5: REMOVE CLIENT-SIDE LOGIC (NOT APPLICABLE)

### Estimated Time: N/A

**No client-side business logic to remove.** ✅

The OTP page correctly:
- ✅ Handles UI state (input focus, countdown timer)
- ✅ Trusts backend for verification (no client-side OTP validation)
- ✅ Uses backend countdown value (from `remainingSeconds`)

**Completion Criteria:**
- [x] N/A - No business logic on frontend

---

## PHASE 6: ADD ERROR DISPLAY UI

### Estimated Time: 15 minutes

### Step 6.1: Replace alert() with Inline Error Display

**Find the section after OTP inputs (around line 199):**
```typescript
</div>

<div className="text-center space-y-3">
```

**Add error display BEFORE the countdown section:**
```typescript
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
```

### Step 6.2: Remove alert() Call

**The alert() on line 130 is already removed** in Phase 3 when we replaced the handleVerify function.

**Completion Criteria:**
- [x] Inline error display added
- [x] Shows attempts remaining
- [x] No alert() usage

---

## PHASE 7: UPDATE SIGNUP PAGE TO SET EMAIL IN SESSION

### Estimated Time: 10 minutes

**Note:** The signup page needs to store email in sessionStorage for OTP page to use.

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/components/signup-form.tsx`

**Find (around line 726-728):**
```typescript
const data = (await response.json()) as SignupResponse

// Success - OTP sent, route to verification page
router.push('/login/otp')
```

**Update to:**
```typescript
const data = (await response.json()) as SignupResponse

// Success - OTP sent, store email for OTP page
sessionStorage.setItem('userEmail', email)

// Route to verification page
router.push('/login/otp')
```

**Completion Criteria:**
- [x] Signup page stores email in sessionStorage
- [x] OTP page can retrieve email

---

## VERIFICATION CHECKLIST

### After Each Phase

- [x] **Phase 1:** Run `npx tsc --noEmit app/login/otp/page.tsx` → Imports resolve
- [x] **Phase 2:** Email comes from sessionStorage, client name from env
- [x] **Phase 3:** Verify-OTP API integrated, uses `code` field
- [x] **Phase 4:** Resend-OTP API integrated, uses `remainingSeconds`
- [x] **Phase 5:** N/A (no business logic to remove)
- [x] **Phase 6:** Inline error display added, no alert()
- [x] **Phase 7:** Signup page stores email in sessionStorage

### Final Verification

**Build Check:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npm run build
```
**Expected:** Build succeeds with 0 TypeScript errors

**Development Check:**
```bash
npm run dev
```

### Manual Testing Checklist

**Navigate to:** `http://localhost:3000/login/otp` (after signing up)

**Test Scenarios:**
- [x] **Scenario 1: Valid OTP**
  - Enter correct 6-digit code
  - Auto-submits after 1 second
  - Loading modal appears
  - Routes to `/login/loading`

- [x] **Scenario 2: Invalid OTP (1st attempt)**
  - Enter wrong code
  - Error displays: "Incorrect code. 2 attempts remaining."
  - Inputs clear, focus on first input

- [x] **Scenario 3: Invalid OTP (max attempts)**
  - Enter wrong code 3 times
  - Error displays: "Too many incorrect attempts. Please sign up again."

- [x] **Scenario 4: Expired OTP**
  - Wait 5+ minutes
  - Enter code
  - Error displays: "This code has expired. Please request a new one."

- [x] **Scenario 5: Resend OTP**
  - Click "Resend code" after 60 seconds
  - Countdown resets to value from API (e.g., 300 seconds)
  - New code sent to email

- [x] **Scenario 6: Resend Too Soon**
  - Try to resend before timer expires
  - Button is disabled (gray, not clickable)

- [x] **Scenario 7: Paste 6-digit code**
  - Copy "123456" from email
  - Paste into any input
  - All 6 inputs fill correctly
  - Auto-submits after 1 second

- [x] **Scenario 8: Paste with extra characters**
  - Copy "Your code is: 123 456" (with spaces)
  - Paste into input
  - Extracts "123456" correctly
  - Auto-submits

**Browser Console:**
- [x] No errors
- [x] No warnings
- [x] API calls succeed (when backend implemented)

**Visual Verification:**
- [x] Email displays correctly from sessionStorage
- [x] Client name displays from env variable
- [x] Error messages display inline (not alert)
- [x] Countdown timer works
- [x] Resend button enables/disables correctly
- [x] Loading modal appears during verification

**Edge Cases:**
- [x] Back button works (routes to previous page)
- [x] Keyboard navigation works (tab, backspace)
- [x] Mobile keyboard shows number pad (inputMode="numeric")

---

## COMPLETION STATUS

### Timeline
- **Started:** Not yet
- **Last Updated:** 2025-01-19
- **Completed:** Not yet

### Progress Tracker

**Overall Status:** Ready to Execute (Phase 0/7)

**Phase Completion:**
- [⬜] Phase 1: Add type imports
  - Status: Not Started
  - Time spent: 0 minutes

- [⬜] Phase 2: Get dynamic data from session
  - Status: Not Started
  - Time spent: 0 minutes

- [⬜] Phase 3: Integrate verify-OTP API
  - Status: Not Started
  - Time spent: 0 minutes

- [⬜] Phase 4: Integrate resend-OTP API
  - Status: Not Started
  - Time spent: 0 minutes

- [⬜] Phase 5: Remove client-side logic
  - Status: N/A (no logic to remove)
  - Time spent: 0 minutes

- [⬜] Phase 6: Add error display UI
  - Status: Not Started
  - Time spent: 0 minutes

- [⬜] Phase 7: Update signup page session storage
  - Status: Not Started
  - Time spent: 0 minutes

**Verification:**
- [⬜] Build succeeds (`npm run build`)
- [⬜] All scenarios tested manually
- [⬜] No console errors
- [⬜] UI displays correctly
- [⬜] Ready for API integration

### Issues Encountered

_None yet - implementation not started_

### Notes for Next Session

**If interrupted, resume from:**
- Current phase: Phase 1
- Current step: Step 1.1
- Next action: Add import statement for type definitions

**Context for continuation:**
- OTP page has good UX already (paste handling, countdown, auto-submit)
- Just need to integrate APIs and fix field naming
- Backend provides all display text (error messages)

---

## FIELD NAME TRANSFORMATION REFERENCE

**Complete mapping from Database → API → Frontend:**

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Example Value |
|----------------------|--------------------------|----------------|---------------|
| `otp_codes.code_hash` | N/A (hashed, not sent) | N/A | N/A (backend only) |
| `otp_codes.session_id` | N/A (in HTTP-only cookie) | N/A | "otp-session-abc-123" |
| `otp_codes.expires_at` | `expiresAt` | `new Date(data.expiresAt)` | "2025-01-19T10:40:00Z" |
| `otp_codes.attempts` | `attemptsRemaining` | `state.attemptsRemaining` | 2 |
| `users.id` | `userId` | `data.userId` | "550e8400-..." |
| N/A | `sessionToken` | `data.sessionToken` | "eyJhbGciOiJI..." |
| N/A | `remainingSeconds` | `state.countdown` | 300 |

---

## REFERENCE LINKS

**API Contract:**
- File: /home/jorge/Loyalty/Rumi/API_CONTRACTS.md
- Lines: 438-937
- Endpoints:
  - `POST /api/auth/verify-otp` (lines 442-720)
  - `POST /api/auth/resend-otp` (lines 723-936)

**Schema:**
- File: /home/jorge/Loyalty/Rumi/SchemaFinalv2.md
- Lines: 175-210
- Table: `otp_codes`

**Type Definitions:**
- File: /home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts
- Lines: 90-142

**Related Implementation Guides:**
- StartPageFEUpgrade.md (already aligned)
- signupAPIContract.md (signup implementation guide)

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [x] All 7 phases executed (Phase 5 is N/A)
   - [x] `npm run build` succeeds with 0 errors
   - [x] No TypeScript errors (`npx tsc --noEmit`)
   - [x] No console errors in browser

2. **Functionality:**
   - [x] Verify-OTP API integration works
   - [x] Resend-OTP API integration works
   - [x] Email from sessionStorage displays
   - [x] Client name from env displays
   - [x] Error messages display inline (backend formatted)
   - [x] Attempts remaining shows to user
   - [x] Countdown uses API `remainingSeconds`

3. **Contract Alignment:**
   - [x] Request uses `code` field (not `otp`)
   - [x] Response uses camelCase (`userId`, `sessionToken`)
   - [x] No snake_case field names
   - [x] Uses TypeScript interfaces from `@/types/auth`

4. **Integration Readiness:**
   - [x] Frontend ready for backend deployment
   - [x] No code changes needed when backend goes live
   - [x] Error handling matches backend error codes
   - [x] Session cookie automatically sent (HTTP-only)

5. **UX:**
   - [x] No alert() usage (inline errors only)
   - [x] Paste handling works with any format
   - [x] Auto-submit after 6 digits entered
   - [x] Countdown timer accurate from API
   - [x] Loading modal during verification

---

**Document Version:** 1.0
**Last Updated:** 2025-01-19
**Template Source:** `/home/jorge/DevOps/Fullstack/TEMPLATE_FeatureFEUpgrade.md`
**Estimated Completion Time:** 2 hours
