# Missions Server-Side Fetch Enhancement - Implementation Plan

**Specification Source:** MissionsServerFetchEnhancement.md
**Enhancement ID:** ENH-004
**Type:** Enhancement
**Priority:** High
**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5

---

## Enhancement Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionsServerFetchEnhancement.md:**

**Enhancement Summary:** Refactor Missions page from client-side fetch (useEffect) to server-side fetch (Server Component) to eliminate skeleton loader and double-fetch.

**Business Need:** Improve perceived performance by showing content immediately instead of skeleton, matching Home page behavior.

**Files to Create/Modify:**
- `appcode/app/missions/page.tsx` → RENAME to `missions-client.tsx`
- `appcode/app/missions/missions-client.tsx` → MODIFY (accept props, remove useEffect)
- `appcode/app/missions/page.tsx` → CREATE (new Server Component)

**Specified Solution (From Section 6):**

1. Rename `page.tsx` → `missions-client.tsx`
2. Modify client component:
   - Change `export default function` → `export function MissionsClient`
   - Add `MissionsClientProps` interface with `initialData` and `error`
   - Initialize state from props instead of null
   - Remove `useEffect` fetch block
   - Remove `isLoading` state
   - Remove loading skeleton return block
3. Create new `page.tsx` as Server Component:
   - Copy exact pattern from `app/home/page.tsx`
   - Fetch `/api/missions` server-side with cookie forwarding
   - Handle 401 with `redirect('/login/start')`
   - Pass data to `<MissionsClient initialData={data} error={null} />`

**Acceptance Criteria (From Section 16 - Definition of Done):**
1. [ ] `missions-client.tsx` created (renamed from page.tsx)
2. [ ] `missions-client.tsx` modified to accept props
3. [ ] `page.tsx` created as Server Component
4. [ ] No skeleton visible on page load
5. [ ] Single API call (no double-fetch)
6. [ ] All modals still functional
7. [ ] Auth redirect works when not logged in
8. [ ] Error state displays correctly
9. [ ] Type checker passes
10. [ ] Build completes
11. [ ] MissionsServerFetchEnhancement.md status updated to "Implemented"

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Added SchemaFinalv2.md and ARCHITECTURE.md to sources
- Concerns Addressed: Added middleware matcher dependency note, deployment checklist

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1 (new page.tsx)
- Files modified: 1 (missions-client.tsx, renamed from page.tsx)
- Lines added: ~50 (new Server Component)
- Lines removed: ~35 (useEffect, isLoading, skeleton)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - missions page still uses client-side fetch.

**Verify current page.tsx is client component:**
```bash
head -1 /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** `"use client"`

**Verify useEffect fetch exists:**
```bash
grep -n "useEffect" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx | head -3
```
**Expected:** Shows useEffect on line ~58

**Verify isLoading state exists:**
```bash
grep -n "isLoading" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx | head -3
```
**Expected:** Shows isLoading state declarations

**Checklist:**
- [ ] "use client" directive present: [YES/NO]
- [ ] useEffect fetch exists: [YES/NO]
- [ ] isLoading state exists: [YES/NO]
- [ ] Gap confirmed to still exist: [YES/NO]

**If gap already filled (no "use client", no useEffect):** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Reference Pattern Verification

**Purpose:** Verify Home page pattern exists and is unchanged (our source to copy).

**Verify Home page is Server Component:**
```bash
head -5 /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** No "use client", has `import { cookies }` and `async function`

**Verify Home pattern structure:**
```bash
grep -n "fetch\|redirect\|HomeClient" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** Shows fetch call, redirect import, HomeClient usage

**Checklist:**
- [ ] Home page is Server Component: [YES/NO]
- [ ] Cookie forwarding pattern present: [YES/NO]
- [ ] Pattern ready to copy: [YES/NO]

---

### Gate 4: Files Verification

**File 1 (to be renamed):** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** File exists (856 lines)

**File 2 (should NOT exist yet):** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx 2>&1
```
**Expected:** "No such file or directory"

**Checklist:**
- [ ] page.tsx exists: [YES/NO]
- [ ] missions-client.tsx does NOT exist: [YES/NO]
- [ ] Ready for rename operation: [YES/NO]

---

### Gate 5: Middleware Matcher Verification

**Purpose:** Confirm /api/missions is in middleware matcher (required for token refresh).

**Check middleware matcher:**
```bash
grep -n "'/api/missions'" /home/jorge/Loyalty/Rumi/appcode/middleware.ts
```
**Expected:** Line 224 shows `'/api/missions',`

**Checklist:**
- [ ] /api/missions in middleware matcher: [YES/NO]
- [ ] Token refresh will work for server-side fetch: [YES/NO]

---

### Gate 6: Type Verification

**Purpose:** Confirm MissionsPageResponse type exists and import path is correct.

**NOTE (Audit Clarification):** The import `@/types/missions` is correct because:
- tsconfig.json line 23 defines: `"@/types/*": ["./app/types/*"]`
- Actual file location: `appcode/app/types/missions.ts`
- Therefore: `@/types/missions` → `./app/types/missions.ts` ✅

**Check type exists:**
```bash
grep -n "MissionsPageResponse" /home/jorge/Loyalty/Rumi/appcode/app/types/missions.ts | head -3
```
**Expected:** Shows interface definition (line 9)

**Verify tsconfig path alias:**
```bash
grep -A1 '"@/types/\*"' /home/jorge/Loyalty/Rumi/appcode/tsconfig.json
```
**Expected:** `"@/types/*": ["./app/types/*"]`

**Test import compiles (create temp file to verify):**
```bash
echo 'import type { MissionsPageResponse } from "@/types/missions"; const x: MissionsPageResponse = {} as any;' > /tmp/test-import.ts
npx tsc --noEmit --skipLibCheck /tmp/test-import.ts 2>&1 || echo "Import test failed"
rm /tmp/test-import.ts
```
**Expected:** No errors (import resolves correctly)

**Checklist:**
- [ ] MissionsPageResponse type exists: [YES/NO]
- [ ] tsconfig path alias verified: [YES/NO]
- [ ] Import compiles correctly: [YES/NO]

---

### Gate 7: Auth/Error Pattern Verification

**Purpose:** Confirm new page.tsx will mirror Home's exact auth and error handling pattern.

**NOTE (Audit Clarification):** The implementation mirrors Home exactly:
- Cookie forwarding: `cookies().getAll().map(c => ...).join('; ')`
- Base URL: `NEXT_PUBLIC_SITE_URL` with production check, localhost fallback for dev
- 401 handling: `redirect('/login/start')` (server-side redirect)
- Other errors: `<MissionsClient initialData={null} error="..." />` (client shows error UI)
- Cache: `cache: 'no-store'` (dynamic user data)

**Verify Home pattern exists to copy:**
```bash
grep -n "redirect\|cache.*no-store\|Cookie.*cookieHeader" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** Shows redirect, cache, and Cookie header usage

**Verify NEXT_PUBLIC_SITE_URL handling in Home:**
```bash
grep -A2 "NEXT_PUBLIC_SITE_URL" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** Shows baseUrl check with production error and localhost fallback

**Checklist:**
- [ ] Home pattern verified as source to copy: [YES/NO]
- [ ] Auth handling (401 → redirect) confirmed: [YES/NO]
- [ ] Error handling (other → client with error) confirmed: [YES/NO]
- [ ] NEXT_PUBLIC_SITE_URL pattern confirmed: [YES/NO]

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step 1: Rename page.tsx to missions-client.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
**Action Type:** RENAME via git mv
**Purpose:** Preserve git history while renaming to client component file

**Command:**
```bash
git mv /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```

**Post-Rename Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/
```
**Expected:** Shows `missions-client.tsx`, NO `page.tsx`

**Git Status Check:**
```bash
git status --short /home/jorge/Loyalty/Rumi/appcode/app/missions/
```
**Expected:** `R  app/missions/page.tsx -> app/missions/missions-client.tsx`

**Step Checkpoint:**
- [ ] Rename command executed successfully
- [ ] missions-client.tsx exists
- [ ] page.tsx no longer exists
- [ ] Git shows rename (not delete+add)

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Modify missions-client.tsx - Change Export and Add Props

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Convert default export to named export, add props interface

**Pre-Action Reality Check:**

**Read Current State (lines 35-45):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 35-45
```

**Expected Current State:**
```typescript
import type { MissionsPageResponse, Mission } from "@/types/missions"

export default function MissionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Data fetching state
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
```

**Edit Action:**

**OLD Code (to be replaced):**
```typescript
import type { MissionsPageResponse, Mission } from "@/types/missions"

export default function MissionsPage() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Data fetching state
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
```

**NEW Code (replacement):**
```typescript
import type { MissionsPageResponse, Mission } from "@/types/missions"

// Props interface for server-passed data
interface MissionsClientProps {
  initialData: MissionsPageResponse | null
  error: string | null
}

// Named export for use by Server Component
export function MissionsClient({ initialData, error: initialError }: MissionsClientProps) {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  // Initialize from server-provided data (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
```

**Post-Action Verification:**
```bash
grep -n "MissionsClientProps\|export function MissionsClient" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx | head -5
```
**Expected:** Shows interface and named export

**Step Checkpoint:**
- [ ] Props interface added
- [ ] Export changed to named export
- [ ] State initialized from props
- [ ] isLoading state removed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Remove useEffect Fetch Block

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Remove client-side data fetching (server handles this now)

**Pre-Action Reality Check:**

**Read Current State (lines 55-91):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines 55-91
```

**Expected Current State (useEffect block to remove):**
```typescript
  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/missions', {
          credentials: 'include', // Include auth cookie
        })

        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/login/start'
          return
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to load missions')
        }

        const data: MissionsPageResponse = await response.json()
        setMissionsData(data)
      } catch (err) {
        console.error('[Missions] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load missions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMissions()
  }, [])
```

**Edit Action:**

**OLD Code (to be replaced):**
```typescript
  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/missions', {
          credentials: 'include', // Include auth cookie
        })

        if (response.status === 401) {
          // Redirect to login if unauthorized
          window.location.href = '/login/start'
          return
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to load missions')
        }

        const data: MissionsPageResponse = await response.json()
        setMissionsData(data)
      } catch (err) {
        console.error('[Missions] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load missions')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMissions()
  }, [])
```

**NEW Code (replacement):**
```typescript
  // ============================================
  // DATA FETCHING - REMOVED
  // ============================================
  // Server Component (page.tsx) now fetches data and passes via props.
  // This eliminates the skeleton loader and double-fetch issues.
  // See: MissionsServerFetchEnhancement.md (ENH-004)
```

**Post-Action Verification:**
```bash
grep -n "useEffect" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** No matches (useEffect removed)

**Step Checkpoint:**
- [ ] useEffect block removed
- [ ] Comment explains the change
- [ ] No more client-side fetch

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Remove Loading Skeleton Return Block

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Remove loading skeleton (no longer needed with server-side fetch)

**Pre-Action Reality Check:**

**Find loading skeleton block (should be around lines 286-308 after previous edits):**
```bash
grep -n "if (isLoading)" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx lines [found line -2 to +22]
```

**Expected Current State (loading skeleton block):**
```typescript
  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <PageLayout title="Missions">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl border bg-slate-50 border-slate-200 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2 mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageLayout>
    )
  }
```

**Edit Action:**

Delete the entire loading state block (replace with empty string or minimal comment).

**Post-Action Verification:**
```bash
grep -n "isLoading\|LOADING STATE" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** No matches

**Step Checkpoint:**
- [ ] Loading skeleton block removed
- [ ] No isLoading references remain
- [ ] File still valid TypeScript

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Remove Unused Import (useEffect)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx`
**Action Type:** MODIFY
**Purpose:** Clean up unused import after removing useEffect

**Pre-Action Reality Check:**

**Read imports (line 27):**
```bash
grep -n "useState, useEffect" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```

**Expected:** `import { useState, useEffect } from "react"`

**Edit Action:**

**OLD Code:**
```typescript
import { useState, useEffect } from "react"
```

**NEW Code:**
```typescript
import { useState } from "react"
```

**Post-Action Verification:**
```bash
grep -n "useEffect" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** No matches

**Step Checkpoint:**
- [ ] useEffect import removed
- [ ] useState still imported
- [ ] No unused imports

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Create New page.tsx (Server Component)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
**Action Type:** CREATE
**Purpose:** Create Server Component that fetches data and renders MissionsClient

**Pre-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx 2>&1
```
**Expected:** "No such file or directory" (file should not exist)

**New File Content:**
```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionsClient } from './missions-client'
import type { MissionsPageResponse } from '@/types/missions'

/**
 * Missions Page (Server Component)
 *
 * Fetches missions data server-side for faster page load.
 * Data is passed to MissionsClient for interactive rendering.
 *
 * MAINTAINER NOTES:
 * 1. This follows the same pattern as app/home/page.tsx
 * 2. Cookie forwarding is CRITICAL for auth to work
 * 3. cache: 'no-store' prevents stale data caching
 * 4. Must use full URL (not relative) for server-side fetch
 * 5. CRITICAL: /api/missions MUST remain in middleware.ts matcher (line 224)
 *    for token refresh to work. Server-side fetch passes cookies but middleware
 *    handles refresh. Removing from matcher will cause 401 errors.
 *
 * References:
 * - MissionsServerFetchEnhancement.md (ENH-004)
 * - app/home/page.tsx (pattern source)
 */
export default async function MissionsPage() {
  // Get auth cookie for API call (explicit construction for reliability)
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  // Fetch data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!baseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
  }
  const fetchUrl = baseUrl || 'http://localhost:3000'

  const response = await fetch(`${fetchUrl}/api/missions`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors - pass to client for error UI
  if (!response.ok) {
    return <MissionsClient initialData={null} error="Failed to load missions" />
  }

  const data: MissionsPageResponse = await response.json()

  // Pass data to client component
  return <MissionsClient initialData={data} error={null} />
}
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
wc -l /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** File exists, ~55 lines

**Content Verification:**
```bash
head -10 /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** Shows imports with `cookies`, `redirect`, `MissionsClient`

**Step Checkpoint:**
- [ ] page.tsx created
- [ ] Correct imports present
- [ ] Server Component (async function, no "use client")
- [ ] Cookie forwarding implemented
- [ ] Error handling implemented

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
**New Import:**
```typescript
import { MissionsClient } from './missions-client'
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct (`./missions-client`)
- [ ] Exported name matches (`MissionsClient`)
- [ ] Types align (`MissionsPageResponse`)

---

### Type Alignment Verification

**Props Interface:**
```typescript
interface MissionsClientProps {
  initialData: MissionsPageResponse | null
  error: string | null
}
```

**Server Component Usage:**
```typescript
return <MissionsClient initialData={data} error={null} />
return <MissionsClient initialData={null} error="Failed to load missions" />
```

**Verification:**
- [ ] `initialData` accepts `MissionsPageResponse | null`
- [ ] `error` accepts `string | null`
- [ ] Both usage sites match props interface

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This enhancement does NOT introduce new database queries.**

The server-side fetch calls `/api/missions` which:
- Already has auth verification (validated in ENH-003)
- Already enforces `client_id` filtering via RPC
- Already in middleware matcher for token refresh

**Security Checklist:**
- [x] No new database queries introduced
- [x] Uses existing secured API endpoint
- [x] Auth cookies forwarded correctly
- [x] 401 handling redirects to login

---

### Authentication Check

**Route:** `/missions` (page)

**Checklist:**
- [ ] Server-side fetch includes auth cookies
- [ ] 401 response redirects to login
- [ ] No unauthenticated data exposure

**Verification:**
```bash
grep -n "401\|redirect\|Cookie" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** Shows Cookie header, 401 check, redirect call

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to acceptance criteria.**

---

### Verification 1: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -E "error|missions" | head -20
```
**Expected:** No errors related to missions files
**Actual:** [document actual output]

**Status:**
- [ ] Type check passed

**Traces to Criterion 9:** "Type checker passes"

---

### Verification 2: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

**Traces to Criterion 10:** "Build completes"

---

### Verification 3: Files Created/Modified Correctly

**Criterion 1:** "missions-client.tsx created (renamed from page.tsx)"
**Test:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** File exists
**Status:** [ ] PASS / FAIL

**Criterion 2:** "missions-client.tsx modified to accept props"
**Test:**
```bash
grep -n "MissionsClientProps\|export function MissionsClient" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```
**Expected:** Shows props interface and named export
**Status:** [ ] PASS / FAIL

**Criterion 3:** "page.tsx created as Server Component"
**Test:**
```bash
head -5 /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
grep -c "use client" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** No "use client" directive (count = 0)
**Status:** [ ] PASS / FAIL

---

### Verification 4: No Skeleton on Page Load

**Criterion 4:** "No skeleton visible on page load"
**Test:** Manual - Start dev server, navigate to /missions
```bash
npm run dev
# In browser: Navigate to http://localhost:3000/missions
# Observe: Page should render with content, NO skeleton animation
```
**Expected:** Content visible immediately, no skeleton flash
**Status:** [ ] PASS / FAIL

---

### Verification 5: Single API Call

**Criterion 5:** "Single API call (no double-fetch)"
**Test:** Check Network tab in browser DevTools
```
1. Open DevTools → Network tab
2. Navigate to /missions
3. Filter by "missions"
4. Count API calls
```
**Expected:** Single `/api/missions` call (server-side, may show as document fetch)
**Status:** [ ] PASS / FAIL

---

### Verification 6: Modals Still Functional

**Criterion 6:** "All modals still functional"
**Test:** Manual testing
```
1. Click on a mission card with "Claim" button
2. Verify modal opens
3. Close modal
4. Verify page state unchanged
```
**Expected:** Modals open/close correctly
**Status:** [ ] PASS / FAIL

---

### Verification 7: Auth Redirect Works

**Criterion 7:** "Auth redirect works when not logged in"
**Test:**
```
1. Clear cookies or use incognito
2. Navigate to /missions
3. Should redirect to /login/start
```
**Expected:** Redirects to login page
**Status:** [ ] PASS / FAIL

---

### Verification 8: Error State Displays

**Criterion 8:** "Error state displays correctly"
**Test:** Temporarily break API or test with error response
**Expected:** Error UI displays with retry button
**Status:** [ ] PASS / FAIL (may skip if hard to simulate)

---

### Verification 9: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
git diff app/missions/
```

**Expected Changes:**
- `app/missions/page.tsx` → `app/missions/missions-client.tsx` (rename + modifications)
- `app/missions/page.tsx` (new file, ~55 lines)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED / FAILED]

**Acceptance Criteria Summary:**
| # | Criterion | Test Result |
|---|-----------|-------------|
| 1 | missions-client.tsx created | [ ] |
| 2 | missions-client.tsx accepts props | [ ] |
| 3 | page.tsx is Server Component | [ ] |
| 4 | No skeleton visible | [ ] |
| 5 | Single API call | [ ] |
| 6 | Modals functional | [ ] |
| 7 | Auth redirect works | [ ] |
| 8 | Error state displays | [ ] |
| 9 | Type checker passes | [ ] |
| 10 | Build completes | [ ] |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-17
**Executor:** Claude Opus 4.5
**Specification Source:** MissionsServerFetchEnhancement.md
**Implementation Doc:** MissionsServerFetchEnhancementIMPL.md
**Enhancement ID:** ENH-004

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Reference Pattern - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Middleware Matcher - [PASS/FAIL]
[Timestamp] Gate 6: Type Verification - [PASS/FAIL]
[Timestamp] Gate 7: Auth/Error Pattern - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Rename page.tsx → missions-client.tsx - [STATUS]
[Timestamp] Step 2: Add props interface, change export - [STATUS]
[Timestamp] Step 3: Remove useEffect fetch block - [STATUS]
[Timestamp] Step 4: Remove loading skeleton - [STATUS]
[Timestamp] Step 5: Remove unused useEffect import - [STATUS]
[Timestamp] Step 6: Create new page.tsx Server Component - [STATUS]
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Auth check - [PASS/FAIL]
[Timestamp] Cookie forwarding - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Type check passes - [STATUS]
[Timestamp] Build succeeds - [STATUS]
[Timestamp] Criterion 1-10 - [STATUS]
[Timestamp] Git diff sanity - [STATUS]
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `app/missions/page.tsx` → `app/missions/missions-client.tsx` - RENAME+MODIFY - ~820 lines - Client component with props
2. `app/missions/page.tsx` - CREATE - ~55 lines - Server Component

**Total:** 2 files, ~55 lines added, ~35 lines removed (net: ~20 lines added)

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardGapFix.md template applied
- Created: MissionsServerFetchEnhancement.md
- Documented all 17 sections
- Proposed solution specified (copy Home pattern)

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: Added source docs, middleware note, deployment checklist
- Updated to v1.1

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created: MissionsServerFetchEnhancementIMPL.md
- Defined 6 implementation steps
- All verifications specified

**Step 4: Current Status**
- Implementation: PENDING EXECUTION
- Ready for: User approval to execute

---

### Auditor Verification Commands

**Quick Verification (Run These After Implementation):**

```bash
# 1. Verify files exist
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/

# 2. Verify page.tsx is Server Component (no "use client")
grep -c "use client" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
# Should show: 0

# 3. Verify missions-client.tsx exports MissionsClient
grep "export function MissionsClient" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
# Should show: the export line

# 4. Verify no useEffect in client
grep -c "useEffect" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
# Should show: 0

# 5. Verify no isLoading in client
grep -c "isLoading" /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
# Should show: 0

# 6. Verify type check passes
npx tsc --noEmit 2>&1 | grep -E "error.*missions" | wc -l
# Should show: 0
```

---

## Document Status

**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Reference pattern verified
- [ ] Middleware matcher verified

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified
- [ ] Types aligned

**Security:**
- [ ] Auth requirements met
- [ ] Cookie forwarding verified

**Feature Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] ALL acceptance criteria met
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**Next Actions:**
1. [ ] User approves implementation plan
2. [ ] Execute steps 1-6 in order
3. [ ] Complete all verifications
4. [ ] Git commit with message below
5. [ ] Update MissionsServerFetchEnhancement.md status to "Implemented"

**Git Commit Message Template:**
```
perf(missions): implement server-side data fetching (ENH-004)

Refactors missions page from client-side fetch to server-side fetch:
- Eliminates skeleton loader flash
- Eliminates double-fetch bug
- Matches Home page pattern for consistent UX

New files:
- app/missions/page.tsx: Server Component (fetches data server-side)

Modified files:
- app/missions/missions-client.tsx: Renamed from page.tsx, accepts props

References:
- MissionsServerFetchEnhancement.md
- MissionsServerFetchEnhancementIMPL.md

🤖 Generated with Claude Code

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly
- [ ] Addressed audit feedback

### Acceptance Criteria
- [ ] EVERY criterion from Enhancement.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL

---

**META-VERIFICATION STATUS:** [PENDING - TO BE FILLED DURING EXECUTION]

---

**Document Version:** 1.1
**Created:** 2025-12-17
**Author:** Claude Opus 4.5
**Status:** Ready for Execution

**Changelog:**
- v1.1: Added Gate 7 (Auth/Error Pattern), expanded Gate 6 with tsconfig verification and import test, added audit clarification notes
