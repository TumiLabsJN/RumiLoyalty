# LOGIN START FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** Login Start - Handle Validation & Routing
**Created:** 2025-01-18
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/start/page.tsx`

**API Endpoint:** POST /api/auth/check-handle
**Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 34-181)
**Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (users table: lines 131-170)
**Estimated Effort:** ~1 hour
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/start/page.tsx`
- **New Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/types/auth.ts` (NEW FILE)
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (lines 34-181)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (users table: lines 131-170)

### Dependencies
- Next.js 14 (App Router)
- React 18
- TypeScript 5.x
- Tailwind CSS
- shadcn/ui components

### Project Structure
```
app/
├── types/              ← CREATE auth.ts HERE
│   └── auth.ts         ← NEW FILE
├── login/
│   └── start/
│       └── page.tsx    ← MODIFY THIS
└── components/
    └── authlayout.tsx  ← NO CHANGES NEEDED
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `/app/login/start/page.tsx` - 129 lines
- Single page component (no test scenarios)
- Uses mock/test flow logic

**Current Data Structure:**
```typescript
// Lines 46-54: Test flow logic
const isRecognized = handle.toLowerCase() === "test"
sessionStorage.setItem("userType", isRecognized ? "recognized" : "unrecognized")
sessionStorage.setItem("userHandle", handle)
router.push("/login/signup")  // Always routes to signup
```

**Current Features:**
- Frontend validation (alphanumeric + underscore/period, max 30 chars)
- Auto-removes @ symbol
- Basic handle storage in sessionStorage

### What's Wrong
**Mismatches with API Contract:**
- ❌ No API call: Currently uses hardcoded test logic (line 46-47)
- ❌ No type definitions: No TypeScript interfaces for API request/response
- ❌ Incorrect routing: Always routes to `/login/signup` (should route to `/login/wb` for users with email)
- ❌ Missing error handling: No API error states or user feedback
- ❌ No loading state: No visual feedback during API call

**Specific Issues:**
1. **Lines 46-54**: Hardcoded test flow logic needs replacement with actual API call
2. **Line 54**: Always routes to `/login/signup` regardless of user state
3. **Line 58**: TODO comment indicates incomplete implementation
4. **No type safety**: Request/response not typed

### Target State
**After completion:**
- ✅ TypeScript interfaces for POST /api/auth/check-handle request/response
- ✅ Real API integration with error handling
- ✅ Conditional routing based on API response:
  - `route: 'login'` → `/login/wb` (user has email)
  - `route: 'signup'` → `/login/signup` (no email OR new user)
- ✅ Loading state during API call
- ✅ Error handling with user-friendly messages
- ✅ Ready for production use (no mock/test logic)

---

## FIELD MAPPING TABLE

### Complete Mapping: Database → API → Frontend

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Type | Notes |
|----------------------|--------------------------|----------------|------|-------|
| `tiktok_handle` | `handle` | `data.handle` | `string` | Normalized with @ prefix |
| N/A | `exists` | `data.exists` | `boolean` | Computed by backend |
| `email` (NULL check) | `has_email` | `data.has_email` | `boolean` | Computed: email IS NOT NULL |
| N/A | `route` | `data.route` | `'signup' \| 'login'` | Routing decision |

### Key Restructuring Changes

**No major restructuring needed** - This is a simple request/response pattern.

**API Flow:**
```typescript
// REQUEST:
{ handle: "creatorpro" }  // Frontend sends (no @ symbol)

// RESPONSE:
{
  exists: true,           // User in database?
  has_email: true,        // Email registered?
  route: "login",         // Where to route
  handle: "@creatorpro"   // Normalized (with @)
}
```

---

## PHASE 1: CREATE TYPE DEFINITIONS

### Estimated Time: 15 minutes

### Step 1.1: Create Types File

**Action:** Create new file at `/home/jorge/Loyalty/Rumi/App Code/V1/types/auth.ts`

**File Content:**

```typescript
// /app/types/auth.ts
// Type definitions for Authentication API endpoints
// Source: API_CONTRACTS.md (lines 34-181)

// ============================================================================
// POST /api/auth/check-handle
// ============================================================================

/**
 * Request body for checking if a TikTok handle exists
 * Used at /login/start to determine routing
 */
export interface CheckHandleRequest {
  handle: string  // TikTok handle (without @ symbol, already stripped by frontend)
}

/**
 * Response from check-handle endpoint
 * Determines if user should sign up or log in
 */
export interface CheckHandleResponse {
  exists: boolean             // Does this handle exist in Supabase users table?
  has_email: boolean          // Does user have email registered?
  route: 'signup' | 'login'   // Where to send the user next
  handle: string              // Normalized handle with @ prefix
}

/**
 * Error response structure for auth endpoints
 */
export interface AuthErrorResponse {
  error: string               // Error code (e.g., "HANDLE_REQUIRED")
  message: string             // Human-readable error message
}
```

### Step 1.2: Verify tsconfig.json Path Alias

**Action:** Check if `@/types/*` path alias exists

**Run:**
```bash
grep -A 5 '"paths"' "/home/jorge/Loyalty/Rumi/App Code/V1/tsconfig.json"
```

**Expected:** Should already have `@/types/*` alias configured

### Step 1.3: Verify Type Definitions Compile

**Run:**
```bash
cd "/home/jorge/Loyalty/Rumi/App Code/V1"
npx tsc --noEmit app/types/auth.ts
```

**Expected:** No errors (types compile successfully)

**Completion Criteria:**
- [ ] File created at `/app/types/auth.ts`
- [ ] All interfaces defined (CheckHandleRequest, CheckHandleResponse, AuthErrorResponse)
- [ ] Types compile with 0 errors
- [ ] Path alias configured in tsconfig.json

---

## PHASE 2: UPDATE PAGE IMPORTS AND STATE

### Estimated Time: 10 minutes

### Step 2.1: Add Import Statement

**File:** `/app/login/start/page.tsx`

**Search for (line 1-7):**
```typescript
"use client"

  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { AuthLayout } from "@/components/authlayout"
  import { useState } from "react"
  import { useRouter } from "next/navigation"
```

**Replace with:**
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AuthLayout } from "@/components/authlayout"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { CheckHandleRequest, CheckHandleResponse, AuthErrorResponse } from "@/types/auth"
```

### Step 2.2: Add New State Variables

**Search for (line 31-32):**
```typescript
  export default function LoginPage() {
    const router = useRouter()
    const [handle, setHandle] = useState("")
```

**Replace with:**
```typescript
export default function LoginPage() {
  const router = useRouter()
  const [handle, setHandle] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
```

**Completion Criteria:**
- [ ] Import statement added for auth types
- [ ] isLoading state added
- [ ] error state added
- [ ] Code compiles (may have errors about unused variables - expected)

---

## PHASE 3: REMOVE TEST/MOCK LOGIC

### Estimated Time: 5 minutes

### Step 3.1: Remove Test Flow Logic

**BEFORE (lines 42-60):**
```typescript
  const handleContinue = () => {
    if (handle.trim()) {
      console.log("TikTok handle:", `@${handle}`)

      // TEST FLOW: Check if handle is "Test" (recognized user)
      const isRecognized = handle.toLowerCase() === "test"

      // Store user type in sessionStorage for later use
      sessionStorage.setItem("userType", isRecognized ? "recognized" : "unrecognized")
      sessionStorage.setItem("userHandle", handle)

      // Route to signup page for both flows
      router.push("/login/signup")

      // TODO: In production, send to backend for validation
      // Backend will check if handle exists in users table (tiktok_handle column)
      // API endpoint: POST /api/auth/validate-handle
      // Request body: { handle: "@username" }
    }
  }
```

**AFTER:**
```typescript
const handleContinue = async () => {
  if (!handle.trim()) return

  setIsLoading(true)
  setError(null)

  // API call will be added in Phase 4
}
```

**Completion Criteria:**
- [ ] Test logic removed (lines 46-47)
- [ ] SessionStorage logic removed (lines 50-51)
- [ ] Hardcoded routing removed (line 54)
- [ ] TODO comment removed
- [ ] Function signature changed to `async`

---

## PHASE 4: IMPLEMENT API INTEGRATION

### Estimated Time: 20 minutes

### Step 4.1: Add API Call Logic

**BEFORE (lines 42-43):**
```typescript
const handleContinue = async () => {
  if (!handle.trim()) return

  setIsLoading(true)
  setError(null)

  // API call will be added in Phase 4
}
```

**AFTER:**
```typescript
const handleContinue = async () => {
  if (!handle.trim()) return

  setIsLoading(true)
  setError(null)

  try {
    // Call check-handle API (API_CONTRACTS.md lines 34-181)
    const response = await fetch('/api/auth/check-handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle } satisfies CheckHandleRequest)
    })

    if (!response.ok) {
      const errorData = (await response.json()) as AuthErrorResponse
      throw new Error(errorData.message || 'Failed to validate handle')
    }

    const data = (await response.json()) as CheckHandleResponse

    // Store normalized handle for next steps
    sessionStorage.setItem("userHandle", data.handle)

    // Route based on API response
    if (data.route === 'login') {
      router.push("/login/wb")      // User has email → password login
    } else {
      router.push("/login/signup")  // No email OR new user → signup flow
    }

  } catch (err) {
    console.error('Handle check failed:', err)
    setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
  } finally {
    setIsLoading(false)
  }
}
```

**Completion Criteria:**
- [ ] API call implemented with proper fetch
- [ ] Request body uses CheckHandleRequest type
- [ ] Response parsed as CheckHandleResponse
- [ ] Error handling with try/catch
- [ ] Conditional routing based on response.route
- [ ] Normalized handle stored in sessionStorage
- [ ] Loading state set correctly

---

## PHASE 5: ADD ERROR DISPLAY UI

### Estimated Time: 10 minutes

### Step 5.1: Add Error Message Display

**Search for (line 111):**
```typescript
          {/* Helper text */}
          <p className="text-xs text-slate-500 mt-2">Without the @ symbol</p>
        </div>
```

**Replace with:**
```typescript
          {/* Helper text */}
          <p className="text-xs text-slate-500 mt-2">Without the @ symbol</p>

          {/* Error message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
```

**Completion Criteria:**
- [ ] Error message component added
- [ ] Displays only when error state is set
- [ ] Styling matches design system (red-50 bg, red-200 border)

---

## PHASE 6: ADD LOADING STATE TO BUTTON

### Estimated Time: 5 minutes

### Step 6.1: Update Continue Button

**BEFORE (lines 117-124):**
```typescript
          <Button
            onClick={handleContinue}
            disabled={!handle.trim()}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50
  disabled:cursor-not-allowed"
          >
            Continue
          </Button>
```

**AFTER:**
```typescript
          <Button
            onClick={handleContinue}
            disabled={!handle.trim() || isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-6 rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Checking...' : 'Continue'}
          </Button>
```

**Completion Criteria:**
- [ ] Button disabled when isLoading is true
- [ ] Button text changes to "Checking..." during loading
- [ ] Fixed line break in className (formatting cleanup)

---

## PHASE 7: NO REQUEST BODIES TO FIX

### Estimated Time: 0 minutes

**This page only makes GET-style queries.** No POST/PUT/PATCH with complex request bodies.

Already handled in Phase 4 with `satisfies CheckHandleRequest`.

**Completion Criteria:**
- [✅] N/A - No additional request bodies to fix

---

## VERIFICATION CHECKLIST

### After Each Phase

- [ ] **Phase 1:** Run `npx tsc --noEmit app/types/auth.ts` → 0 errors
- [ ] **Phase 2:** Imports resolve, new state variables added
- [ ] **Phase 3:** Test logic removed, function is async
- [ ] **Phase 4:** API call implemented, routing logic correct
- [ ] **Phase 5:** Error UI displays correctly
- [ ] **Phase 6:** Button shows loading state
- [ ] **Phase 7:** N/A

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

**Navigate to:** `http://localhost:3000/login/start`

**Test Scenarios:**
- [ ] **Empty handle:** Button is disabled
- [ ] **Invalid characters:** Only alphanumeric + underscore/period allowed
- [ ] **@ symbol:** Automatically removed
- [ ] **Max length:** Limited to 30 characters
- [ ] **API call - User exists with email:** Routes to `/login/wb`
- [ ] **API call - User exists without email:** Routes to `/login/signup`
- [ ] **API call - User does not exist:** Routes to `/login/signup`
- [ ] **API error:** Error message displays correctly
- [ ] **Loading state:** Button shows "Checking..." during API call

**Interaction Testing:**
- [ ] Type valid handle → Click Continue → Loading state shows → Routes correctly
- [ ] Simulate API error (disconnect network) → Error message displays
- [ ] Error message disappears when user tries again

**Browser Console:**
- [ ] No errors
- [ ] No warnings
- [ ] Normalized handle stored in sessionStorage with @ prefix

**Visual Verification:**
- [ ] Layout unchanged (AuthLayout, input, button)
- [ ] Error message styled correctly
- [ ] Loading state clearly visible
- [ ] No layout shifts during loading

---

## COMPLETION STATUS

### Timeline
- **Started:** Not started
- **Last Updated:** 2025-01-18 (document created)
- **Completed:** Not yet

### Progress Tracker

**Overall Status:** Not Started

**Phase Completion:**
- [⬜] Phase 1: Create type definitions
  - Status: Not Started
  - Estimated time: 15 min

- [⬜] Phase 2: Update imports and state
  - Status: Not Started
  - Estimated time: 10 min

- [⬜] Phase 3: Remove test/mock logic
  - Status: Not Started
  - Estimated time: 5 min

- [⬜] Phase 4: Implement API integration
  - Status: Not Started
  - Estimated time: 20 min

- [⬜] Phase 5: Add error display UI
  - Status: Not Started
  - Estimated time: 10 min

- [⬜] Phase 6: Add loading state to button
  - Status: Not Started
  - Estimated time: 5 min

- [⬜] Phase 7: Fix request bodies
  - Status: N/A
  - Estimated time: 0 min

**Verification:**
- [⬜] Build succeeds (`npm run build`)
- [⬜] All scenarios tested manually
- [⬜] No console errors
- [⬜] UI displays correctly
- [⬜] Ready for production use

### Issues Encountered

No issues yet - implementation not started.

### Notes for Next Session

**If interrupted, resume from:**
- Current phase: Phase 1
- Current step: Step 1.1
- Next action: Create `/app/types/auth.ts` file

**Context for continuation:**
- This is the first auth page being aligned
- Other auth pages (signup, otp, etc.) will follow same pattern
- API contract already documented in API_CONTRACTS.md

### Performance Metrics

**Estimated Total Time:** ~1 hour
- Phase 1: 15 min
- Phase 2: 10 min
- Phase 3: 5 min
- Phase 4: 20 min
- Phase 5: 10 min
- Phase 6: 5 min
- Phase 7: 0 min (N/A)

**Actual time spent:** TBD

---

## FIELD NAME TRANSFORMATION REFERENCE

**Complete mapping from Database → API → Frontend:**

| Database (snake_case) | API Response (camelCase) | Frontend Usage | Example Value |
|----------------------|--------------------------|----------------|---------------|
| `users.tiktok_handle` | `handle` | `data.handle` | `"@creatorpro"` |
| N/A (computed) | `exists` | `data.exists` | `true` |
| `users.email IS NOT NULL` | `has_email` | `data.has_email` | `true` |
| N/A (computed) | `route` | `data.route` | `"login"` |

---

## REFERENCE LINKS

**API Contract:**
- File: `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
- Lines: 34-181
- Endpoint: `POST /api/auth/check-handle`

**Schema:**
- File: `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
- Tables: users (lines 131-170)

**Related Implementation Guides:**
- LoginSignupFEUpgrade.md (TBD - next auth page)
- LoginOtpFEUpgrade.md (TBD)
- LoginWbFEUpgrade.md (TBD)

---

## SUCCESS CRITERIA

✅ **Implementation is complete when:**

1. **Code Quality:**
   - [ ] All 6 phases executed (Phase 7 N/A)
   - [ ] `npm run build` succeeds with 0 errors
   - [ ] No TypeScript errors (`npx tsc --noEmit`)
   - [ ] No console errors in browser

2. **Functionality:**
   - [ ] API integration works correctly
   - [ ] Routing logic matches API response
   - [ ] Error handling works
   - [ ] Loading state displays correctly

3. **Contract Alignment:**
   - [ ] Request matches CheckHandleRequest interface
   - [ ] Response parsed as CheckHandleResponse interface
   - [ ] Routes correctly based on response.route value
   - [ ] Stores normalized handle (with @) in sessionStorage

4. **Integration Readiness:**
   - [ ] Frontend calls real API endpoint
   - [ ] Type definitions match API contract exactly
   - [ ] No mock/test logic remains
   - [ ] Ready for production deployment

5. **Documentation:**
   - [ ] This guide is complete and accurate
   - [ ] All phases documented with actual line numbers
   - [ ] Issues and solutions documented (if any)
   - [ ] Completion status updated

---

**Template Version:** 1.0
**Last Updated:** 2025-01-18
**Template Source:** `/home/jorge/DevOps/Fullstack/TEMPLATE_FeatureFEUpgrade.md`
