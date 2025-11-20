# LOADING PAGE FRONTEND UPGRADE - IMPLEMENTATION GUIDE

**Project:** Rumi Loyalty Platform
**Feature:** Post-Authentication Loading & Routing
**Created:** 2025-01-20
**Target Files:**
- `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/loading/page.tsx`

**API Endpoint:**
- GET /api/auth/user-status

**Contract Reference:** /home/jorge/Loyalty/Rumi/API_CONTRACTS.md (lines TBD - will be ~1135-1300)
**Schema Reference:** /home/jorge/Loyalty/Rumi/SchemaFinalv2.md (users table, line 161: last_login_at)
**Estimated Effort:** ~1 hour
**Execution Strategy:** All phases in one go, verify after each phase

---

## CONTEXT

### File Locations
- **Target File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/loading/page.tsx`
- **Type Definitions:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts` (will add UserStatusResponse)
- **API Contract Reference:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` (will document GET /api/auth/user-status)
- **Schema Reference:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (lines 131-172)

### Dependencies
- Next.js 14.2.18 (App Router)
- React 18.3.1
- TypeScript 5.x
- Lucide React (Loader2 icon)

### Project Structure
```
app/
├── types/
│   └── auth.ts              ← ADD UserStatusResponse interface
├── login/
│   ├── loading/
│   │   └── page.tsx         ← MODIFY THIS (56 lines currently)
│   ├── otp/
│   │   └── page.tsx         ← Routes here from OTP verification
│   ├── wb/
│   │   └── page.tsx         ← Routes here from password login
│   ├── welcomeunr/
│   │   └── page.tsx         ← Routes here if user is unrecognized (first login)
│   └── ...
├── home/
│   └── page.tsx             ← Routes here if user is recognized (returning user)
```

---

## CURRENT STATE ANALYSIS

### What Exists
**Files:**
- `page.tsx` - 56 lines
- Client-side component ("use client")

**Current Features:**
- ✅ Loading animation (Loader2 spinning icon)
- ✅ Loading text ("Setting up your account...")
- ✅ Redirect logic with 2-second delay

**Current Data Structure:**
```typescript
// Lines 20-22: Gets data from sessionStorage
const userType = sessionStorage.getItem("userType")  // ← Mock: "recognized" or other
const handle = sessionStorage.getItem("userHandle")

// Lines 27-34: Client-side routing logic
setTimeout(() => {
  if (userType === "recognized") {
    router.push("/home")              // Recognized user
  } else {
    router.push("/login/welcomeunr")  // Unrecognized user
  }
}, 2000)  // ← Hardcoded 2-second delay
```

### What's Wrong
**Mismatches with API Contract:**
- ❌ No TypeScript interfaces imported from `@/types/auth`
- ❌ No API call to backend
- ❌ Mock data from sessionStorage: `userType` (should come from backend)
- ❌ Client-side routing logic (lines 28-34) - backend should determine routing
- ❌ Hardcoded 2-second delay (line 27) - should wait for API response
- ❌ Frontend decides routes (`/home` vs `/welcomeunr`) - backend should own this logic

**Specific Issues:**
1. **Line 21:** Gets mock `userType` from sessionStorage (should call API)
2. **Line 22:** Gets `userHandle` but never uses it (dead code)
3. **Line 27:** Hardcoded 2000ms delay (arbitrary - should be API response time)
4. **Lines 28-34:** Frontend owns routing logic (should be backend decision)
5. **No error handling:** What if user is not authenticated? Should redirect to /login/start

### Target State
**After completion:**
- ✅ Import and use TypeScript interfaces from `@/types/auth`
- ✅ Call `GET /api/auth/user-status` to get user recognition status
- ✅ Backend determines routing (provides `redirectTo` field)
- ✅ Frontend just follows backend's routing instruction
- ✅ Show loading animation while API call is in progress
- ✅ Error handling: redirect to login if unauthenticated
- ✅ Type-safe with UserStatusResponse interface
- ✅ Ready for backend deployment (zero frontend changes needed)

---

## FIELD MAPPING TABLE

### Complete Mapping: Frontend → API Contract

| Current Frontend | API Contract | Type | Notes |
|-----------------|--------------|------|-------|
| `userType` (sessionStorage) | `isRecognized` | `boolean` | REPLACE: Mock sessionStorage with API field |
| N/A | `userId` | `string` | ADD: User UUID for logging/debugging |
| N/A | `redirectTo` | `string` | ADD: Backend-determined route ("/home" or "/login/welcomeunr") |
| N/A | `emailVerified` | `boolean` | ADD: Extra context for debugging |
| Hardcoded routes | Backend `redirectTo` | `string` | REMOVE: Frontend routing logic |
| `handle` (unused) | N/A | N/A | REMOVE: Dead code (line 22) |

### Key Restructuring Changes

**Change 1: Remove Client-Side Routing Logic**
```typescript
// BEFORE (lines 20-34):
const userType = sessionStorage.getItem("userType")
const handle = sessionStorage.getItem("userHandle")

setTimeout(() => {
  if (userType === "recognized") {
    router.push("/home")              // ❌ Frontend decides
  } else {
    router.push("/login/welcomeunr")  // ❌ Frontend decides
  }
}, 2000)  // ❌ Arbitrary delay

// AFTER:
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  const fetchUserStatus = async () => {
    try {
      const response = await fetch('/api/auth/user-status')

      if (!response.ok) {
        // Not authenticated - redirect to login
        router.push('/login/start')
        return
      }

      const data = await response.json() as UserStatusResponse

      // Backend decides where to route
      router.push(data.redirectTo)  // ✅ Backend owns routing logic

    } catch (err) {
      console.error('Failed to get user status:', err)
      router.push('/login/start')
    }
  }

  fetchUserStatus()
}, [router])
```

**Change 2: Backend Response Structure**
```typescript
// API Response:
{
  userId: "123e4567-e89b-12d3-a456-426614174000",
  isRecognized: false,              // first login (last_login_at IS NULL)
  redirectTo: "/login/welcomeunr",  // Backend determined
  emailVerified: true
}

// OR for returning user:
{
  userId: "123e4567-e89b-12d3-a456-426614174000",
  isRecognized: true,               // returning user (last_login_at IS NOT NULL)
  redirectTo: "/home",              // Backend determined
  emailVerified: true
}
```

---

## API CONTRACT DESIGN

### GET /api/auth/user-status

**Purpose:** Determine authenticated user's recognition status and routing destination

**Authentication:** Required (uses session cookie from login/OTP)

**Query Parameters:** None

**Request Headers:**
- Cookie: `auth-token` (HTTP-only session cookie)

**Success Response (200 OK):**

| Field | Type | Description |
|-------|------|-------------|
| userId | string | UUID of authenticated user |
| isRecognized | boolean | Has user logged in before? (checks last_login_at field) |
| redirectTo | string | Where to route user ("/home" or "/login/welcomeunr") |
| emailVerified | boolean | Email verification status (for debugging/logging) |

**TypeScript Interface:**
```typescript
export interface UserStatusResponse {
  userId: string         // UUID of authenticated user
  isRecognized: boolean  // Has logged in before (last_login_at IS NOT NULL)
  redirectTo: string     // Backend-determined route
  emailVerified: boolean // Email verification status
}
```

**Example Response (First-time user):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "isRecognized": false,
  "redirectTo": "/login/welcomeunr",
  "emailVerified": true
}
```

**Example Response (Returning user):**
```json
{
  "userId": "987e6543-e21b-12d3-a456-426614174111",
  "isRecognized": true,
  "redirectTo": "/home",
  "emailVerified": true
}
```

**Business Logic:**

```sql
-- Step 1: Get authenticated user from session token
-- (JWT decode or session lookup)

-- Step 2: Query user info
SELECT
  id,
  email_verified,
  last_login_at,
  created_at
FROM users
WHERE id = $1;  -- From authenticated session

-- Step 3: Determine recognition status
-- If last_login_at IS NULL → First login (unrecognized)
-- If last_login_at IS NOT NULL → Returning user (recognized)

-- Step 4: Update last_login_at
UPDATE users
SET last_login_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- Step 5: Return response
```

**Backend Implementation Notes:**

1. **Authentication Check:**
   - Verify session token from HTTP-only cookie
   - If invalid → 401 Unauthorized

2. **Recognition Logic:**
   - Query `last_login_at` field
   - NULL = first login → `isRecognized: false`, `redirectTo: "/login/welcomeunr"`
   - NOT NULL = returning → `isRecognized: true`, `redirectTo: "/home"`

3. **Update Last Login:**
   - Set `last_login_at = NOW()`
   - **Important:** Do this AFTER checking recognition status (so first login is properly detected)

4. **Future Extensibility:**
   - Can add logic: If `email_verified = false` → `redirectTo: "/verify-email"`
   - Can add logic: If `account_status = 'suspended'` → `redirectTo: "/account/suspended"`
   - Can add logic: If onboarding incomplete → `redirectTo: "/onboarding"`

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
- No sensitive data exposed (no password_hash, payment info, etc.)
- Updates last_login_at timestamp for audit trail
- Can be called multiple times (idempotent after first call)

#### Database Tables Used

**Primary:**
- `users` (SchemaFinalv2.md:131-172) - Check recognition status, update last_login_at

**Fields Referenced:**
- `users.id` - UUID PRIMARY KEY
- `users.email_verified` - BOOLEAN DEFAULT false
- `users.last_login_at` - TIMESTAMP (line 161)
- `users.created_at` - TIMESTAMP
- `users.updated_at` - TIMESTAMP

---

## IMPLEMENTATION PLAN - 7 PHASES

### Phase 1: Create/Update Type Definitions

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`

**Action:** Add UserStatusResponse interface after LoginResponse

**Changes:**
```typescript
// ADD after LoginResponse (around line 165+)
// ============================================================================
// GET /api/auth/user-status
// ============================================================================

/**
 * Response from user-status endpoint
 * Determines routing after authentication (loading page)
 */
export interface UserStatusResponse {
  userId: string         // UUID of authenticated user
  isRecognized: boolean  // Has logged in before (last_login_at IS NOT NULL)
  redirectTo: string     // Backend-determined route ("/home" or "/login/welcomeunr")
  emailVerified: boolean // Email verification status (for debugging)
}
```

**Verification:**
- ✅ Interface matches API contract exactly
- ✅ camelCase field names
- ✅ Clear JSDoc comments
- ✅ Located after LoginResponse

---

### Phase 2: Replace Mock Data with API Call

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/loading/page.tsx`

**Import types (add to line 1-6):**
```typescript
// ADD:
import type { UserStatusResponse } from "@/types/auth"
```

**Replace entire useEffect (lines 19-39):**
```typescript
// BEFORE (lines 19-39):
useEffect(() => {
  const userType = sessionStorage.getItem("userType")
  const handle = sessionStorage.getItem("userHandle")

  console.log("Loading page - User type:", userType, "Handle:", handle)

  const timer = setTimeout(() => {
    if (userType === "recognized") {
      router.push("/home")
    } else {
      router.push("/login/welcomeunr")
    }
  }, 2000)

  return () => clearTimeout(timer)
}, [router])

// AFTER:
useEffect(() => {
  const fetchUserStatus = async () => {
    try {
      // API call: GET /api/auth/user-status
      const response = await fetch('/api/auth/user-status', {
        method: 'GET',
        credentials: 'include'  // Include HTTP-only cookie
      })

      if (!response.ok) {
        // Not authenticated or error - redirect to login
        console.error('User status check failed:', response.status)
        router.push('/login/start')
        return
      }

      const data = (await response.json()) as UserStatusResponse

      // Log for debugging
      console.log('User status:', {
        userId: data.userId,
        isRecognized: data.isRecognized,
        redirectTo: data.redirectTo
      })

      // Backend determines where to route
      router.push(data.redirectTo)

    } catch (err) {
      console.error('Failed to get user status:', err)
      // On error, redirect to login
      router.push('/login/start')
    }
  }

  fetchUserStatus()
}, [router])
```

**Verification:**
- ✅ Removed sessionStorage mock data
- ✅ Uses fetch('/api/auth/user-status')
- ✅ Type-safe with UserStatusResponse
- ✅ Error handling: redirects to /login/start on failure
- ✅ Uses data.redirectTo (backend-determined routing)
- ✅ No hardcoded delay (waits for API response)

---

### Phase 3: N/A - No Complex API Integration

Phase 2 already completed the API integration.

**Skip this phase.**

---

### Phase 4: N/A - No Resend Functionality

Loading page does not have resend functionality.

**Skip this phase.**

---

### Phase 5: Remove Client-Side Business Logic ✅

**Verification:**
- ✅ Removed client-side routing logic (was lines 28-34)
- ✅ Backend now owns routing decisions (via `redirectTo` field)
- ✅ No frontend logic for determining user type
- ✅ No conditional routing in frontend

**What was removed:**
```typescript
// ❌ REMOVED: Frontend routing logic
if (userType === "recognized") {
  router.push("/home")
} else {
  router.push("/login/welcomeunr")
}

// ✅ REPLACED WITH: Backend-determined routing
router.push(data.redirectTo)
```

---

### Phase 6: Update Error Display

**Analysis:**
Loading page has no visible error display (just redirects to /login/start on error).

**Verification:**
- ✅ Errors handled by redirecting to login page
- ✅ Console logging for debugging
- ✅ No user-facing error messages needed (transient loading page)

**No changes needed.**

---

### Phase 7: Verify Loading UI

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/login/loading/page.tsx`

**Current UI (lines 41-54):**
```typescript
return (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
    <div className="flex flex-col items-center space-y-6">
      {/* Spinning loader */}
      <Loader2 className="h-16 w-16 text-pink-600 animate-spin" />

      {/* Loading text */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Setting up your account...</h1>
        <p className="text-sm text-slate-600">This will only take a moment</p>
      </div>
    </div>
  </div>
)
```

**Verification:**
- ✅ Loading spinner present (Loader2)
- ✅ Loading text appropriate
- ✅ Centered layout
- ✅ No changes needed

---

## VERIFICATION CHECKLIST

### TypeScript Compilation
```bash
npx tsc --noEmit --pretty 2>&1 | grep -E "(login/loading|types/auth)"
# Expected: No errors in login/loading or types/auth
```

### Build Success
```bash
npm run build
# Expected: Loading page compiles successfully
```

### Runtime Checks
- ✅ Calls GET /api/auth/user-status on mount
- ✅ Shows loading animation during API call
- ✅ Routes to backend-determined destination (data.redirectTo)
- ✅ Error handling: redirects to /login/start if unauthenticated
- ✅ No hardcoded delays
- ✅ No client-side routing logic

### API Contract Alignment
- ✅ Request: GET /api/auth/user-status (no body)
- ✅ Response: { userId, isRecognized, redirectTo, emailVerified }
- ✅ All camelCase (no snake_case)
- ✅ Type-safe with UserStatusResponse interface
- ✅ Backend owns routing logic (provides redirectTo)

---

## SUCCESS CRITERIA

**All criteria must be met:**

1. 🔲 API contract documented in `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
2. 🔲 TypeScript interface (UserStatusResponse) in `/home/jorge/Loyalty/Rumi/App Code/V1/app/types/auth.ts`
3. 🔲 All 7 phases executed and verified
4. 🔲 Build succeeds (no errors in loading page)
5. 🔲 API call to GET /api/auth/user-status on mount
6. 🔲 Backend determines routing (uses data.redirectTo)
7. 🔲 Type-safe with UserStatusResponse
8. 🔲 Error handling redirects to /login/start
9. 🔲 No client-side routing logic
10. 🔲 No hardcoded delays
11. 🔲 Ready for backend deployment (zero frontend changes needed)

---

## AUTH FLOW CONTEXT

```
/login/start (check-handle)
  ↓ stores handle in sessionStorage
  ├─→ /login/wb (if route === 'login')
  │     ↓ POST /api/auth/login
  │     ↓
  │   /login/loading ← THIS PAGE (will be implemented)
  │     ↓ GET /api/auth/user-status
  │     ↓
  │     ├─→ /home (if isRecognized: true)
  │     └─→ /login/welcomeunr (if isRecognized: false)
  │
  └─→ /login/signup (if route === 'signup')
        ↓ stores email in sessionStorage
        ↓ POST /api/auth/signup
        ↓
      /login/otp
        ↓ POST /api/auth/verify-otp
        ↓
      /login/loading ← THIS PAGE (will be implemented)
        ↓ GET /api/auth/user-status
        ↓
        ├─→ /home (if isRecognized: true - shouldn't happen for signup flow)
        └─→ /login/welcomeunr (if isRecognized: false - expected for new signups)
```

---

## NOTES

- **Recognition Logic:** Based on `last_login_at` field (NULL = first login, NOT NULL = returning user)
- **Backend Updates:** Backend will set `last_login_at = NOW()` during this API call
- **Future Extensibility:** Backend can add more routing logic (email verification, onboarding, account status)
- **No Loading Delay:** Page shows loading animation until API responds (natural delay, not hardcoded)
- **Error Fallback:** Any error redirects to /login/start (user can restart auth flow)

---

## DECISION SUMMARY

**Based on user choices:**

1. **Endpoint Name:** `GET /api/auth/user-status` ✅
   - Future-proof, broad scope, follows /auth/* pattern

2. **Recognition Definition:** `last_login_at IS NOT NULL` ✅
   - Simple, clear, uses existing schema field (line 161)

3. **Response Structure:** Both `isRecognized` + `redirectTo` ✅
   - Backend owns routing logic
   - Frontend has context for debugging
   - Type-safe and extensible

---

**READY FOR APPROVAL - Do not implement until user reviews this guide!** 🦆
