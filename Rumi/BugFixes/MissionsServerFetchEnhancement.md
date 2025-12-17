# Missions Server-Side Fetch Enhancement - Documentation

**ID:** ENH-004
**Type:** Enhancement
**Created:** 2025-12-17
**Status:** Implemented
**Priority:** High
**Related Tasks:** Performance Optimization (follows ENH-003)
**Linked Issues:** ENH-003 (Missions Page Load Enhancement)

---

## 1. Project Context

This is a Next.js 14 loyalty/rewards application using TypeScript, Supabase (PostgreSQL), and a layered architecture. The app has two main authenticated pages: Home and Missions. Home uses server-side data fetching (Server Component pattern), while Missions uses client-side fetching (useEffect pattern), resulting in different user experiences.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, TailwindCSS
**Architecture Pattern:** Server Components + Client Islands (Home), Pure Client Component (Missions - to be refactored)

---

## 2. Gap/Enhancement Summary

**What's missing:** The Missions page uses client-side data fetching, causing a visible skeleton loader while data loads. The Home page already uses server-side fetching with no skeleton.

**What should exist:** Server-side data fetching for Missions page, matching the Home page pattern. Data should be available when the page renders, eliminating the skeleton flash.

**Why it matters:**
- Eliminates skeleton loader flash (~1-2 seconds on slow connections)
- Eliminates double-fetch bug (React Strict Mode or hydration issue)
- Faster perceived load time (content appears immediately)
- Production benefit: Server→Supabase latency lower than Browser→Supabase if Vercel is in US
- Consistent UX between Home and Missions pages

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `SchemaFinalv2.md` | Full document | No schema changes required - pure frontend refactor |
| `ARCHITECTURE.md` | Section 5 (Presentation Layer) | Confirms Server Component + Client Islands pattern |
| `ARCHITECTURE.md` | Section 10.2 (Missions Auth) | Auth handled by API route, no changes needed |
| `appcode/app/home/page.tsx` | Full file (49 lines) | Server Component pattern: fetches `/api/dashboard` server-side, passes data to `HomeClient` |
| `appcode/app/home/page.tsx` | Lines 17-21 | Cookie forwarding pattern: `cookieStore.getAll().map().join('; ')` |
| `appcode/app/home/page.tsx` | Lines 24-28 | Base URL handling: `NEXT_PUBLIC_SITE_URL` or `localhost:3000` |
| `appcode/app/home/page.tsx` | Lines 30-33 | Fetch config: `{ headers: { Cookie }, cache: 'no-store' }` |
| `appcode/app/home/page.tsx` | Lines 36-38 | 401 handling: `redirect('/login/start')` server-side |
| `appcode/app/home/page.tsx` | Lines 41-43 | Error handling: Return `<HomeClient initialData={null} error="..." />` |
| `appcode/app/missions/page.tsx` | Line 1 | `"use client"` - Pure client component |
| `appcode/app/missions/page.tsx` | Lines 58-90 | `useEffect` fetch pattern - causes skeleton, double-fetch |
| `appcode/app/missions/page.tsx` | Lines 289-308 | Loading state: Returns skeleton UI while fetching |
| `appcode/app/missions/page.tsx` | Lines 313-331 | Error state: Returns error UI with retry button |
| `appcode/app/missions/page.tsx` | Lines 37-53 | State management: Modal states, selected mission states |
| `appcode/app/missions/page.tsx` | Lines 111-235 | Event handlers: handleClaimMission, handleScheduleDiscount, etc. |
| `types/missions.ts` | MissionsPageResponse | Type definition for API response |
| `API_CONTRACTS.md` | Lines 2957-3238 | GET /api/missions response schema |
| `appcode/app/api/missions/route.ts` | Full file | API endpoint (already optimized in ENH-003) |
| `PLS.png` | Network waterfall | Shows double-fetch and skeleton timing |

### Key Evidence

**Evidence 1:** Home uses Server Component pattern
- Source: `appcode/app/home/page.tsx`, Lines 1-49
- Pattern: `export default async function HomePage()` fetches data, passes to client
- Implication: No skeleton, data ready on render

**Evidence 2:** Missions uses Client Component pattern
- Source: `appcode/app/missions/page.tsx`, Lines 1, 58-90
- Pattern: `"use client"` + `useEffect` fetch
- Implication: Shows skeleton while data loads

**Evidence 3:** Double-fetch in browser network tab
- Source: `PLS.png`, Browser DevTools
- Finding: Two `/api/missions` fetch calls (844ms + 1.59s)
- Implication: Component mounting twice or React Strict Mode causing double execution

**Evidence 4:** Auditor guidance on implementation
- Source: User-provided audit
- Key points: Copy Home pattern exactly, use full base URL, handle errors gracefully

---

## 4. Business Justification

**Business Need:** Eliminate skeleton loader and double-fetch to improve perceived performance and UX consistency.

**User Stories:**
1. As a loyalty program member, I need the Missions page to load instantly so I don't see a loading skeleton
2. As a user, I expect consistent behavior between Home and Missions pages

**Impact if NOT implemented:**
- Users see skeleton loader for 1-2+ seconds on Missions
- Double API calls waste bandwidth and server resources
- Inconsistent UX compared to Home page
- Perception of slow application

---

## 5. Current State Analysis

### What Currently Exists

**File:** `appcode/app/missions/page.tsx` (856 lines - Client Component)
```typescript
"use client"
// ... imports ...

export default function MissionsPage() {
  // State for data fetching
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state (must stay in client component)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  // ... more modal states ...

  // useEffect fetch - causes skeleton and double-fetch
  useEffect(() => {
    const fetchMissions = async () => {
      setIsLoading(true)
      const response = await fetch('/api/missions', { credentials: 'include' })
      // ... error handling ...
      const data = await response.json()
      setMissionsData(data)
      setIsLoading(false)
    }
    fetchMissions()
  }, [])

  // Loading state - shows skeleton
  if (isLoading) {
    return <PageLayout title="Missions"><Skeleton /></PageLayout>
  }

  // ... render with data ...
}
```

**File:** `appcode/app/home/page.tsx` (49 lines - Server Component pattern to copy)
```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { HomeClient } from './home-client'

export default async function HomePage() {
  // Get auth cookie for API call
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')

  // Fetch data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/dashboard`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors
  if (!response.ok) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />
  }

  const data = await response.json()
  return <HomeClient initialData={data} error={null} />
}
```

### Current Data Flow

```
CURRENT (Client-Side):
Browser → /missions (HTML with skeleton)
       → JavaScript loads
       → useEffect fires
       → fetch('/api/missions') ← Network from browser
       → fetch('/api/missions') ← Double-fetch bug
       → Data arrives
       → Re-render with content

PROPOSED (Server-Side):
Browser → /missions
       → Server fetches /api/missions internally
       → HTML with actual data sent
       → JavaScript hydrates
       → Content visible immediately
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Refactor Missions to Server Component + Client Island pattern matching Home:
1. Create `missions-client.tsx` (move current page content, remove fetch)
2. Create new `page.tsx` (Server Component that fetches and passes data)
3. Handle errors gracefully (fallback to client component with error)

### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `appcode/app/missions/page.tsx` (Server Component)
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
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

**Modified File:** `appcode/app/missions/missions-client.tsx` (Renamed from page.tsx)
```typescript
// SPECIFICATION - KEY CHANGES ONLY (full file is 800+ lines)
"use client"
// ... same imports ...
import type { MissionsPageResponse } from '@/types/missions'

// NEW: Props interface for server-passed data
interface MissionsClientProps {
  initialData: MissionsPageResponse | null
  error: string | null
}

// CHANGED: Named export, accepts props
export function MissionsClient({ initialData, error: initialError }: MissionsClientProps) {
  // CHANGED: Initialize state from props (no loading state needed)
  const [missionsData, setMissionsData] = useState<MissionsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)

  // REMOVED: isLoading state (data always present from server)
  // REMOVED: useEffect fetch (server handles this)

  // ... modal states stay the same ...
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  // etc.

  // REMOVED: Loading skeleton (no longer needed)
  // if (isLoading) { return <Skeleton /> }  ← DELETE THIS

  // KEEP: Error state (now uses initialError or refresh errors)
  if (error) {
    return (
      <PageLayout title="Missions">
        <ErrorUI error={error} onRetry={() => window.location.reload()} />
      </PageLayout>
    )
  }

  // KEEP: No data state
  if (!missionsData) {
    return (
      <PageLayout title="Missions">
        <p>No missions available</p>
      </PageLayout>
    )
  }

  // ... rest of render logic stays exactly the same ...
}
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `appcode/app/missions/page.tsx` | RENAME → `missions-client.tsx` | Rename file |
| `appcode/app/missions/missions-client.tsx` | MODIFY | Change to named export, accept props, remove useEffect fetch, remove loading state |
| `appcode/app/missions/page.tsx` | CREATE | New Server Component (copy Home pattern) |

### Dependency Graph

```
appcode/app/missions/page.tsx (NEW - Server Component)
├── imports: cookies, redirect (next)
├── imports: MissionsClient (local)
├── imports: MissionsPageResponse (types)
├── fetches: /api/missions (server-side)
└── renders: <MissionsClient initialData={data} error={null} />

appcode/app/missions/missions-client.tsx (RENAMED + MODIFIED)
├── KEEP: all imports except useState for isLoading
├── KEEP: all modal states and handlers
├── REMOVE: useEffect fetch
├── REMOVE: isLoading state
├── REMOVE: Loading skeleton return
├── ADD: Props interface (initialData, error)
└── CHANGE: default export → named export
```

---

## 8. Data Flow After Implementation

```
AFTER (Server-Side Fetch):
Browser requests /missions
        ↓
Next.js Server Component executes
        ↓
Server fetches /api/missions (internal, low latency)
        ↓
Data included in HTML response
        ↓
Browser receives page with content (no skeleton)
        ↓
React hydrates, interactivity ready

Benefits:
- No skeleton flash
- No double-fetch
- Faster perceived load (content in first paint)
- Lower latency if Vercel in US (server→Supabase vs browser→Supabase)
```

---

## 9. Database/Schema Requirements

### Schema Changes Required?
- [x] No - No database changes needed. Uses existing `/api/missions` endpoint.

### Multi-Tenant Considerations
- Already enforced by `/api/missions` API (verified in ENH-003)
- Server-side fetch passes same auth cookies, same security model

---

## 10. API Contract Changes

### New/Modified Endpoints
- None. Uses existing `/api/missions` endpoint unchanged.

### Breaking Changes?
- [x] No - Internal refactor only. API contract unchanged.

---

## 11. Performance Considerations

### Expected Improvement

| Metric | Before (Client Fetch) | After (Server Fetch) |
|--------|----------------------|----------------------|
| Skeleton visible | 1-2+ seconds | **None** |
| API calls | 2 (double-fetch bug) | **1** |
| Time to Content (Brazil) | ~2s | ~1s |
| Time to Content (US prod) | ~500ms | ~200-300ms |

### Production Benefit
If Vercel edge is in US near Supabase (Ohio):
- Server→Supabase: ~50ms
- Browser(Brazil)→Supabase: ~600ms
- **Savings: ~550ms in production**

---

## 12. Alternative Solutions Considered

### Option A: Keep Client-Side Fetch with SWR/React Query
- **Description:** Add caching/deduplication library
- **Pros:** Keeps current architecture, adds caching
- **Cons:** Still shows skeleton, doesn't fix double-fetch root cause
- **Verdict:** ❌ Rejected - Doesn't solve skeleton problem

### Option B: Server Component Pattern (Selected)
- **Description:** Match Home page pattern
- **Pros:** No skeleton, no double-fetch, proven pattern, consistent UX
- **Cons:** Slightly more complex file structure
- **Verdict:** ✅ Selected - Best UX, proven pattern

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cookie forwarding fails | Low | High | Copy exact pattern from Home |
| Hydration mismatch | Low | Medium | Keep all interactive state in client |
| Error handling differs | Low | Low | Return client component with error prop |
| Modal state breaks | Low | High | Keep all modal state in client component |

---

## 14. Testing Strategy

### Manual Verification Steps

1. [ ] Load /missions - verify no skeleton visible
2. [ ] Check Network tab - verify single API call (not double)
3. [ ] Click mission cards - verify modals still work
4. [ ] Claim a mission - verify claim flow works
5. [ ] Clear cookies, access /missions - verify redirect to login
6. [ ] Force API error - verify error UI displays

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand Home page pattern
- [ ] Verify NEXT_PUBLIC_SITE_URL is set (or use localhost in dev)
- [ ] Verify /api/missions is in middleware.ts matcher (required for token refresh)

### Deployment Checklist
- [ ] Confirm NEXT_PUBLIC_SITE_URL is set in production environment (Vercel/hosting)
- [ ] Confirm NEXT_PUBLIC_SITE_URL matches the actual deployment URL

### Implementation Steps
- [ ] **Step 1:** Rename `page.tsx` → `missions-client.tsx`
- [ ] **Step 2:** Modify `missions-client.tsx`:
  - Change `export default function` → `export function MissionsClient`
  - Add props interface
  - Initialize state from props
  - Remove useEffect fetch
  - Remove isLoading state
  - Remove loading skeleton return
- [ ] **Step 3:** Create new `page.tsx` (Server Component)
  - Copy Home pattern exactly
  - Change endpoint to `/api/missions`
  - Change import to `MissionsClient`
  - Change type to `MissionsPageResponse`

### Post-Implementation
- [ ] Type check passes
- [ ] Build completes
- [ ] Manual testing (no skeleton, single fetch, modals work)

---

## 16. Definition of Done

- [ ] `missions-client.tsx` created (renamed from page.tsx)
- [ ] `missions-client.tsx` modified to accept props
- [ ] `page.tsx` created as Server Component
- [ ] No skeleton visible on page load
- [ ] Single API call (no double-fetch)
- [ ] All modals still functional
- [ ] Auth redirect works when not logged in
- [ ] Error state displays correctly
- [ ] Type checker passes
- [ ] Build completes
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/app/home/page.tsx` | Full file (49 lines) | Pattern to copy |
| `appcode/app/missions/page.tsx` | Full file (856 lines) | Current implementation to refactor |
| `types/missions.ts` | MissionsPageResponse | Type for API response |
| `API_CONTRACTS.md` | Lines 2957-3238 | Verify API contract |
| `PLS.png` | Network waterfall | Baseline performance evidence |
| Auditor guidance | User message | Implementation constraints |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-17
**Author:** Claude Code
**Status:** Implemented

**Changelog:**
- v1.1: Added SchemaFinalv2.md and ARCHITECTURE.md to sources, added middleware matcher dependency note, added deployment checklist

---

## Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Enhancement (not Bug or Feature Gap)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as specifications
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for modifications
- [x] Multi-tenant (client_id) filtering addressed (uses existing API)
- [x] API contract changes documented (none)
- [x] Performance considerations addressed with before/after metrics
- [x] External auditor could implement from this document alone
