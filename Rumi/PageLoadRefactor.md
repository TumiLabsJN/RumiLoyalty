# Page Load Refactor Guide

**Purpose:** Convert client-side data fetching to server-side for faster page loads
**Pattern:** Server Component + Client Islands (Alternative 1)
**Expected Improvement:** 60-70% faster load (2-3s → 500-800ms)
**Target Audience:** LLM agents performing refactors
**Working Directory:** All commands assume you are in `appcode/` directory

---

## Source Documents Analyzed

- `app/missions/page.tsx` - Reference implementation (client-side fetch pattern)
- `app/types/missions.ts` - Type definitions
- `lib/services/missionService.ts` - Service layer (for understanding data flow)
- Next.js App Router documentation (Server Components, cookies, redirect)

---

## Trade-offs & Expectations

| Aspect | Current (Client) | After Refactor (Server) |
|--------|------------------|-------------------------|
| Initial load | 2-3 seconds | 500-800ms |
| Loading skeleton | Visible flash | None (data in HTML) |
| API contract | Preserved | Preserved |
| Extra latency | None | Server→API hop remains |
| Debugging | Browser Network tab | Server logs only |

**Note:** This refactor keeps the API layer for contract preservation and easier debugging. Calling services directly would be ~100-200ms faster but harder to debug and test.

---

## Prerequisites Checklist

Before starting refactor on any page:

- [ ] Page is wired to API (fetches from `/api/*`, NOT mock data)
- [ ] API endpoint returns expected response type
- [ ] Dev server running (`npm run dev`)
- [ ] No TypeScript errors in current page

**Pages NOT ready (need API wiring first):**
- `/missions/missionhistory` - has mock data
- `/rewards/rewardshistory` - has mock data
- `/tiers` - has mock data

---

## Reference Table (SINGLE SOURCE OF TRUTH)

Use this table for ALL variable values in the steps below.

| Page | Status | filePath | apiEndpoint | responseType | typeImportPath | clientFile | errorRedirect |
|------|--------|----------|-------------|--------------|----------------|------------|---------------|
| `/home` | ✅ Ready | `app/home` | `/api/dashboard` | `DashboardResponse` | `@/types/dashboard` | `home-client.tsx` | `/login/start` |
| `/missions` | ✅ Ready | `app/missions` | `/api/missions` | `MissionsPageResponse` | `@/types/missions` | `missions-client.tsx` | `/login/start` |
| `/missions/missionhistory` | ⛔ BLOCKED | `app/missions/missionhistory` | `/api/missions/history` | `MissionHistoryResponse` | `@/types/missionhistory` | `missionhistory-client.tsx` | `/login/start` |
| `/rewards` | ✅ Ready | `app/rewards` | `/api/rewards` | `RewardsPageResponse` | `@/types/rewards` | `rewards-client.tsx` | `/login/start` |
| `/rewards/rewardshistory` | ⛔ BLOCKED | `app/rewards/rewardshistory` | `/api/rewards/history` | `RedemptionHistoryResponse` | `@/types/redemption-history` | `rewardshistory-client.tsx` | `/login/start` |
| `/tiers` | ⛔ BLOCKED | `app/tiers` | `/api/tiers` | `TiersPageResponse` | `@/types/tiers` | `tiers-client.tsx` | `/login/start` |

**Status Legend:**
- ✅ Ready = Page fetches from API, can be refactored now
- ⛔ BLOCKED = Page uses mock data, must wire to API first (see EXECUTION_PLAN.md)

**DO NOT refactor BLOCKED pages** - they will fail because there's no API fetch to move server-side.

---

## Worked Example: /missions

### BEFORE (Current - Client Component)

**File:** `app/missions/page.tsx`

```typescript
"use client"
import { useState, useEffect } from "react"
import type { MissionsPageResponse } from "@/types/missions"
// ... other imports

export default function MissionsPage() {
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch('/api/missions', {
          credentials: 'include',
        })
        if (response.status === 401) {
          window.location.href = '/login/start'
          return
        }
        const data = await response.json()
        setMissionsData(data)
      } catch (err) {
        setError('Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    fetchMissions()
  }, [])

  if (isLoading) return <LoadingSkeleton />
  if (error) return <ErrorState />
  if (!missionsData) return null

  // ... rest of component with modals, handlers, JSX
}
```

**Problems:**
- User sees blank → skeleton → content (2-3 seconds)
- JavaScript must load before fetch starts
- Three round trips: HTML → JS → API

### AFTER (Refactored - Server Component + Client)

**File 1:** `app/missions/page.tsx` (Server Component - ~40 lines)

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionsClient } from './missions-client'
import type { MissionsPageResponse } from '@/types/missions'

export default async function MissionsPage() {
  // Get auth cookie for API call (explicit construction for reliability)
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  // Fetch data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/missions`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors
  if (!response.ok) {
    // Option A: Show error UI
    return <MissionsClient initialData={null} error="Failed to load missions" />
    // Option B: Throw to error.tsx boundary
    // throw new Error('Failed to load missions')
  }

  const data: MissionsPageResponse = await response.json()

  // Pass data to client component
  return <MissionsClient initialData={data} error={null} />
}
```

**File 2:** `app/missions/missions-client.tsx` (Client Component)

```typescript
"use client"
import { useState } from "react"
// ... all other imports (NO useEffect for fetching)
import type { MissionsPageResponse } from "@/types/missions"

interface MissionsClientProps {
  initialData: MissionsPageResponse | null
  error: string | null
}

export function MissionsClient({ initialData, error }: MissionsClientProps) {
  // NO loading state - data arrives with HTML
  // NO useEffect fetch - data comes from props
  // NO error state for fetch - handled by server

  // Keep all interactive state
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showPayboostModal, setShowPayboostModal] = useState(false)
  // ... other modal states

  // Handle error from server
  if (error) {
    return (
      <PageLayout title="Missions">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageLayout>
    )
  }

  if (!initialData) {
    return (
      <PageLayout title="Missions">
        <p>No missions available</p>
      </PageLayout>
    )
  }

  // All handlers remain the same
  const handleClaimMission = (mission: any) => { /* ... */ }
  const handleScheduleDiscount = async (date: Date) => { /* ... */ }
  // ... other handlers

  // JSX remains the same, but use initialData instead of missionsData
  return (
    <>
      <PageLayout title="Missions" /* ... */ >
        {initialData.missions.map((mission) => (
          // ... mission cards
        ))}
      </PageLayout>
      {/* Modals remain the same */}
    </>
  )
}
```

**Benefits:**
- Data in initial HTML (no skeleton flash)
- Single round trip: HTML (with data)
- Auth redirect happens server-side (faster)

---

## Generic Steps

For each page in the Reference Table, follow these steps:

### Step 1: Verify Prerequisites

Use `{filePath}` from Reference Table (e.g., `app/missions` for /missions page).

**First, check page status in Reference Table.** If status is ⛔ BLOCKED, stop - page needs API wiring first.

```bash
# Check page is wired to API (should find useEffect + fetch)
# Example for /missions:
grep -n "useEffect\|fetch(" app/missions/page.tsx

# Generic (replace {filePath} with value from Reference Table):
grep -n "useEffect\|fetch(" {filePath}/page.tsx

# Check no TypeScript errors
npx tsc --noEmit {filePath}/page.tsx 2>&1 | head -5
```

**Interpreting grep results:**

| Result | Meaning | Action |
|--------|---------|--------|
| Shows `useEffect` + `fetch('/api/...')` | Ready for refactor | Continue to Step 2 |
| Shows `useEffect` but no `fetch` | Mock data page | STOP - wire to API first |
| No `useEffect` found | Already server component OR static page | Check if page has `async function` - if yes, already refactored |
| No matches at all | Page may be static | Verify page needs data fetching at all |

**If already a server component:**
```bash
# Check if already async (server component)
grep -n "async function.*Page" {filePath}/page.tsx
# If this returns a match, page is already refactored - skip it
```

### Step 2: Identify Code to Move

Read the current `page.tsx` and identify:

1. **REMOVE from page.tsx (server component handles):**
   - `"use client"` directive
   - `useState` for `isLoading`, `error`, data state
   - `useEffect` with fetch logic
   - Loading skeleton JSX
   - Error state JSX

2. **MOVE to client file:**
   - All other `useState` (modals, selections, UI state)
   - All event handlers (`handleClaim`, `handleSchedule`, etc.)
   - All JSX rendering
   - All imports used by the above

3. **KEEP in both:**
   - Type imports (used in both files)

### Step 3: Create Client Component File

**File:** `app/{pagePath}/{clientFile}` (from Reference Table)

```typescript
"use client"
// Paste all moved imports here
import type { {responseType} } from '{typeImportPath}'

interface {PageName}ClientProps {
  initialData: {responseType} | null
  error: string | null
}

export function {PageName}Client({ initialData, error }: {PageName}ClientProps) {
  // Paste all useState EXCEPT isLoading, error, data
  // Paste all handlers

  // Add error handling
  if (error) {
    return <ErrorState message={error} />
  }

  if (!initialData) {
    return <NoDataState />
  }

  // Paste all JSX
  // Replace: missionsData, rewardsData, etc. → initialData
}
```

**Verify:**
```bash
# File exists
ls app/{pagePath}/{clientFile}

# No TypeScript errors (will have some until page.tsx is updated)
```

### Step 3b: Verify Imports (Prevent Missing Import Errors)

Before proceeding, verify the client file has ALL required imports:

**Checklist for `{clientFile}`:**
- [ ] `"use client"` directive at top
- [ ] All `useState` hooks from original file
- [ ] All component imports (`Button`, `Card`, `Modal`, etc.)
- [ ] All icon imports (`lucide-react`)
- [ ] All utility imports (`cn`, `toast`, etc.)
- [ ] Type imports (`MissionsPageResponse`, etc.)
- [ ] Link/router imports if navigation used

**Checklist for `page.tsx` (server component):**
- [ ] `cookies` from `next/headers`
- [ ] `redirect` from `next/navigation`
- [ ] Client component import (`./{clientFile}`)
- [ ] Response type import

```bash
# Quick check: count imports in both files
grep -c "^import" {filePath}/{clientFile}
grep -c "^import" {filePath}/page.tsx
```

### Step 4: Rewrite page.tsx as Server Component

**File:** `app/{pagePath}/page.tsx`

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { {PageName}Client } from './{clientFile}'
import type { {responseType} } from '{typeImportPath}'

export default async function {PageName}Page() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}{apiEndpoint}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })

  if (response.status === 401) {
    redirect('{errorRedirect}')
  }

  if (!response.ok) {
    return <{PageName}Client initialData={null} error="Failed to load" />
  }

  const data: {responseType} = await response.json()
  return <{PageName}Client initialData={data} error={null} />
}
```

**Verify:**
```bash
# No "use client" in page.tsx
grep "use client" app/{pagePath}/page.tsx
# Should return nothing

# Has async function
grep "async function" app/{pagePath}/page.tsx
# Should return the function declaration
```

### Step 5: Test the Refactor

```bash
# 1. Check TypeScript compiles
npx tsc --noEmit

# 2. Test page loads in browser
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/{pagePath}
# Should return 200

# 3. Test with auth (replace with valid cookie)
curl -s -w "\n%{http_code}" http://localhost:3000/api/{apiEndpoint} \
  -H "Cookie: auth-token=YOUR_TOKEN"
# Should return 200 and JSON data
```

**Manual Verification:**
1. Open browser to `http://localhost:3000/{pagePath}`
2. **No loading skeleton should flash** - content appears immediately
3. Check DevTools Network tab - page.tsx should NOT show fetch to API (it's server-side now)
4. Test all interactive features (modals, buttons, etc.)

### Step 5b: Test Interactive Features (Prevent Handler Breakage)

After page loads, systematically test ALL interactive elements:

**Modal Testing:**
- [ ] Click each button that opens a modal
- [ ] Modal opens correctly
- [ ] Modal close button works
- [ ] Modal form submission works (if applicable)
- [ ] Toast notifications appear

**Navigation Testing:**
- [ ] Click all internal links
- [ ] Back button works
- [ ] No console errors during navigation

**Form/Input Testing:**
- [ ] Input fields accept text
- [ ] Dropdowns/selects work
- [ ] Date pickers work (if any)
- [ ] Submit buttons trigger correct actions

**State Testing:**
- [ ] UI updates when state changes (selections, toggles)
- [ ] No stale data displayed
- [ ] Refresh shows same data (cache: no-store working)

```bash
# Check browser console for errors
# Open DevTools → Console tab
# Should see NO red errors after interactions
```

**If something breaks:** Check that the handler was moved to client file and all its dependencies (state setters, imports) are present.

### Step 6: Clean Up

1. Remove any unused imports in both files
2. Remove commented-out code from old implementation
3. Verify no `console.log` debugging statements left

---

## Auth & Caching (CRITICAL)

### Cookie Forwarding

Server components cannot access browser cookies directly. You MUST forward them explicitly:

```typescript
// CORRECT - Explicit cookie construction (reliable across Next.js versions)
import { cookies } from 'next/headers'

const cookieStore = await cookies()
const cookieHeader = cookieStore.getAll()
  .map(c => `${c.name}=${c.value}`)
  .join('; ')

const response = await fetch(url, {
  headers: { Cookie: cookieHeader },
})

// WRONG - toString() may not work reliably in all Next.js versions
const response = await fetch(url, {
  headers: { Cookie: cookieStore.toString() },  // Unreliable!
})

// WRONG - Will get 401 Unauthorized
const response = await fetch(url)  // No cookies sent!
```

### Cache Control

> **SECURITY WARNING:** Omitting `cache: 'no-store'` can cause **User A to see User B's data**.
> This is a critical security bug. **ALWAYS** use `cache: 'no-store'` for authenticated endpoints.

User-specific data MUST NOT be cached:

```typescript
// CORRECT - Fresh data every request
const response = await fetch(url, {
  cache: 'no-store',  // REQUIRED for user-specific data
})

// WRONG - May serve stale/wrong user's data (SECURITY BUG)
const response = await fetch(url)  // Default caching!

// WRONG - Caches for 60 seconds (SECURITY BUG for auth endpoints)
const response = await fetch(url, {
  next: { revalidate: 60 },
})
```

### Environment URL

Server components need full URL (not relative):

```typescript
// RECOMMENDED - Fail in production if URL not configured
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
if (!baseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_SITE_URL must be set in production')
}
const fetchUrl = baseUrl || 'http://localhost:3000'
const response = await fetch(`${fetchUrl}/api/missions`)

// SIMPLER (but risky in production)
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const response = await fetch(`${baseUrl}/api/missions`)

// WRONG - Relative URL doesn't work server-side
const response = await fetch('/api/missions')
```

**Environment Validation:**

Ensure `NEXT_PUBLIC_SITE_URL` is set correctly per environment:

| Environment | Expected Value | Fallback Behavior |
|-------------|----------------|-------------------|
| Local dev | Not required | Falls back to `http://localhost:3000` |
| Preview/Staging | `https://staging.yourapp.com` | **MUST be set** |
| Production | `https://yourapp.com` | **MUST be set** |

```bash
# Verify environment variable is set
echo $NEXT_PUBLIC_SITE_URL

# Check .env.local has it defined
grep NEXT_PUBLIC_SITE_URL .env.local
```

> **SECURITY WARNING:** If `NEXT_PUBLIC_SITE_URL` is missing in production, the fallback `http://localhost:3000` will cause all fetches to fail silently or return wrong data. Use the "fail in production" pattern above, or ensure deployment pipelines validate this variable exists.

---

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing cookies | 401 on page load | Add `headers: { Cookie: cookieHeader }` using `getAll().map().join()` pattern |
| Cached data | Wrong user's data shown | Add `cache: 'no-store'` |
| Relative URL | `fetch failed` error | Use full URL with `process.env.NEXT_PUBLIC_SITE_URL` |
| Missing export | `{Component} is not exported` | Add `export function` to client component |
| Wrong import path | Module not found | Check `./` prefix for local imports |
| Forgot to rename data | `missionsData is not defined` | Replace with `initialData` in client |
| window.location in server | `window is not defined` | Use `redirect()` from `next/navigation` |

---

## Hydration Mismatch Debugging

If React shows a hydration mismatch warning in the console:

**What it means:** Server-rendered HTML doesn't match what client React expects.

**Common causes:**

| Cause | Example | Fix |
|-------|---------|-----|
| Dynamic values in render | `Date.now()`, `Math.random()` | Move to useEffect or pass from server |
| Browser-only APIs | `window.innerWidth` | Wrap in `useEffect` or check `typeof window` |
| Different data | Server has stale cache | Verify `cache: 'no-store'` is set |
| Conditional rendering | `{isClient && <Component />}` | Use consistent initial state |

**How to debug:**

1. Open browser DevTools Console
2. React will show: "Hydration failed because the initial UI does not match"
3. Look for the specific element mentioned
4. Check if that element uses any dynamic values

**Quick fix pattern:**
```typescript
// If you need browser-only values, use this pattern:
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

// Only render browser-dependent content after mount
{mounted && <BrowserOnlyComponent />}
```

**Note:** With our refactor pattern, hydration mismatches should be rare since:
- Data comes from server (same for both renders)
- No dynamic values in initial render
- Interactive state only changes after hydration

---

## Rollback Instructions

If refactor breaks the page:

### Quick Rollback (Git)

```bash
# Discard all changes to the page
git checkout -- app/{pagePath}/page.tsx
git checkout -- app/{pagePath}/{clientFile}

# Or if client file was newly created
rm app/{pagePath}/{clientFile}
git checkout -- app/{pagePath}/page.tsx
```

### Manual Rollback

1. Delete `{clientFile}`
2. Restore `page.tsx` from git or backup
3. Verify page works: `curl http://localhost:3000/{pagePath}`

---

## Implementation Log

Track progress as pages are refactored:

| Page | Status | Date | Notes |
|------|--------|------|-------|
| `/home` | ✅ Done | 2025-12-17 | Render ~100ms, API bottleneck ~4s |
| `/missions` | Pending | - | - |
| `/missions/missionhistory` | Blocked (mock data) | - | Needs API wiring first |
| `/rewards` | Pending | - | - |
| `/rewards/rewardshistory` | Blocked (mock data) | - | Needs API wiring first |
| `/tiers` | Blocked (mock data) | - | Needs API wiring first |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-17 | Initial guide created |
| 1.1 | 2025-12-17 | Audit fixes: explicit cookie construction with getAll(), added filePath column to Reference Table, added security warning for cache |
| 1.2 | 2025-12-17 | Minor fixes: aligned pitfalls table with getAll() pattern, added NEXT_PUBLIC_SITE_URL validation section |
| 1.3 | 2025-12-17 | UI stability: added Step 3b (import verification), Step 5b (interactive testing), Hydration Mismatch Debugging section |
| 1.4 | 2025-12-17 | Fixed type import paths in Reference Table (`@/app/types/...` → `@/types/...`) |
| 1.5 | 2025-12-17 | Audit fixes: Added Source Documents section, Trade-offs table, Status column in Reference Table, Step 1 grep interpretation guide, production env check pattern |

---

**Document Location:** `/home/jorge/Loyalty/Rumi/PageLoadRefactor.md`
**Related:** EXECUTION_PLAN.md (page integration tasks), DATA_FLOWS.md (API documentation)
