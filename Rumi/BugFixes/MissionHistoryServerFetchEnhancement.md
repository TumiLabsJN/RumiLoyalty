# Mission History Server-Side Fetch - Enhancement Documentation

**ID:** ENH-005
**Type:** Enhancement
**Created:** 2025-12-22
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 9.4.2, 9.4.3, 9.4.4, 9.4.5 from EXECUTION_PLAN.md (Step 9.4: Mission History Integration)
**Linked Issues:** None

---

## 1. Project Context

Rumi is a loyalty platform for TikTok Shop creators. Creators complete missions (sales goals, video uploads) to earn rewards (gift cards, commission boosts, physical gifts). The platform tracks creator progress across tiers (Bronze → Platinum) with associated benefits.

The frontend is built with Next.js 14 App Router, using a Server Component + Client Component pattern for data fetching. The backend uses Supabase (PostgreSQL) with Row-Level Security and custom RPC functions for complex queries.

**Tech Stack:** Next.js 14.2.18, TypeScript, Supabase, PostgreSQL, Tailwind CSS
**Architecture Pattern:** Repository → Service → API Route → Server Component → Client Component

---

## 2. Gap/Enhancement Summary

**What's missing:** The Mission History page (`/missions/missionhistory`) currently uses hardcoded mock data instead of fetching real data from the backend API.

**What should exist:** The page should fetch concluded missions from `GET /api/missions/history` using the established server-side fetch pattern (like `/home` and `/missions` pages), displaying the user's completed mission history with real data.

**Why it matters:** Users cannot see their actual mission history - only mock data is displayed. This breaks a core feature of the loyalty platform where creators track their accomplishments and earned rewards.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `DATA_FLOWS.md` | `/missions/missionhistory` | Documents complete backend flow: API → Service → Repository → RPC. Notes "Frontend: 🔄 Using mock data - needs to call `/api/missions/history`" |
| `MISSIONS_IMPL.md` | GET /api/missions/history (lines 331-392) | Backend fully implemented. Route at `app/api/missions/history/route.ts:21-116`. Call chain documented through to RPC `get_mission_history` |
| `app/missions/missionhistory/page.tsx` | Lines 19-166 | Contains `"use client"` directive and `mockApiResponse` with hardcoded history data. Comment on line 22 states "In production, this will be: const data = await fetch('/api/missions/history')" |
| `app/home/page.tsx` | Lines 16-49 | Establishes Server Component pattern: async function, server-side fetch with cookie forwarding, 401 redirect, pass data to Client Component |
| `app/missions/page.tsx` | Lines 25-58 | Same pattern as home. Comment notes "This follows the same pattern as app/home/page.tsx" |
| `app/missions/missions-client.tsx` | Lines 38-51 | Client component props interface: `{ initialData: MissionsPageResponse \| null, error: string \| null }` |
| `middleware.ts` | Lines 204-225 | Matcher includes `/api/missions/:path*` (line 217) - covers `/api/missions/history` for token refresh |
| `app/types/missionhistory.ts` | Full file | Defines `MissionHistoryResponse` and `MissionHistoryItem` interfaces used by both API and frontend |
| `lib/services/missionService.ts` | `getMissionHistory()` (lines 1303-1371) | Service layer transforms repository data to response format, handles status derivation |
| `lib/repositories/missionRepository.ts` | `getHistory()` (lines 645-700) | Uses RPC `get_mission_history` with Supabase client |
| `supabase/migrations/00000000000000_baseline.sql` | `get_mission_history` function (lines 573-608) | RPC query joins redemptions, mission_progress, missions, rewards, raffle_participations |

### Key Evidence

**Evidence 1:** Mock data in current implementation
- Source: `app/missions/missionhistory/page.tsx`, lines 24-166
- Quote: `const mockApiResponse: MissionHistoryResponse = { user: { id: "user123", ... }, history: [...] }`
- Implication: Page displays fake data, not user's actual mission history

**Evidence 2:** Backend API fully implemented
- Source: `MISSIONS_IMPL.md`, GET /api/missions/history section
- Quote: "Multi-Tenant Filter: ✅ Line 66 - `user.clientId !== clientId`"
- Implication: API is production-ready, just not being called by frontend

**Evidence 3:** Established server-side fetch pattern exists
- Source: `app/home/page.tsx` and `app/missions/page.tsx`
- Quote: `export default async function MissionsPage() { ... const response = await fetch(...) }`
- Implication: Pattern is proven, should be replicated for mission history

**Evidence 4:** Middleware already configured
- Source: `middleware.ts`, line 217
- Quote: `'/api/missions/:path*'`
- Implication: Token refresh will work for `/api/missions/history` - no middleware changes needed

---

## 4. Business Justification

**Business Need:** Creators must see their actual completed missions and earned rewards to trust the loyalty program.

**User Stories:**
1. As a creator, I need to see my completed missions so that I can verify my rewards were delivered
2. As a creator, I need to see my raffle results (won/lost) so that I know the outcomes of raffles I entered
3. As a creator, I need to see completion dates so that I can track my activity over time

**Impact if NOT implemented:**
- Users see fake data instead of their real mission history
- Users cannot verify earned rewards
- Platform appears non-functional for this core feature
- Trust in the loyalty program is undermined

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `app/missions/missionhistory/page.tsx`
```typescript
"use client"
// ... imports ...

export default function MissionHistoryPage() {
  /**
   * Mock API response matching MissionHistoryResponse interface
   * In production, this will be: const data = await fetch('/api/missions/history').then(r => r.json())
   */
  const mockApiResponse: MissionHistoryResponse = {
    user: {
      id: "user123",
      currentTier: "tier_3",
      currentTierName: "Gold",
      currentTierColor: "#F59E0B",
    },
    history: [
      // ... 5 hardcoded mission history items ...
    ],
  }

  // ... JSX rendering using mockApiResponse ...
}
```

**Current Capability:**
- ✅ Page renders mission history cards correctly
- ✅ UI logic for concluded vs rejected_raffle states works
- ✅ Empty state handling exists
- ❌ CANNOT fetch real data from API (the gap)
- ❌ CANNOT show user's actual mission history
- ❌ CANNOT handle authentication errors

#### Current Data Flow

```
Current (Broken):
page.tsx ("use client")
  └── mockApiResponse (hardcoded)
        └── Renders fake data

Expected (To Implement):
page.tsx (Server Component)
  └── fetch('/api/missions/history')
        └── app/api/missions/history/route.ts
              ├── userRepository.findByAuthId()
              ├── dashboardRepository.getUserDashboard()
              └── missionService.getMissionHistory()
                    └── missionRepository.getHistory()
                          └── Supabase RPC: get_mission_history
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach
Split the existing single-file page into the established Server Component + Client Component pattern. The Server Component fetches data server-side and passes it to the Client Component for rendering.

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `app/missions/missionhistory/page.tsx` (Server Component - replaces current)
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionHistoryClient } from './missionhistory-client'
import type { MissionHistoryResponse } from '@/app/types/missionhistory'

/**
 * Mission History Page (Server Component)
 *
 * Fetches mission history data server-side for faster page load.
 * Data is passed to MissionHistoryClient for interactive rendering.
 *
 * References:
 * - DATA_FLOWS.md Section: /missions/missionhistory
 * - Pattern source: app/missions/page.tsx
 */
export default async function MissionHistoryPage() {
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

  const response = await fetch(`${fetchUrl}/api/missions/history`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store', // CRITICAL: Dynamic user data must not be cached
  })

  // Handle auth error - redirect server-side
  if (response.status === 401) {
    redirect('/login/start')
  }

  // Handle other errors - pass to client for error UI
  if (!response.ok) {
    return <MissionHistoryClient initialData={null} error="Failed to load mission history" />
  }

  const data: MissionHistoryResponse = await response.json()

  // Pass data to client component
  return <MissionHistoryClient initialData={data} error={null} />
}
```

**Explanation:** Server Component fetches data before page render, handles 401 with server-side redirect, passes data to client for interactive rendering.

**New File:** `app/missions/missionhistory/missionhistory-client.tsx` (Client Component)
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
"use client"
import {
  Trophy,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Video,
  Heart,
  Eye,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLayout } from "@/components/pagelayout"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { MissionHistoryResponse, MissionHistoryItem } from "@/app/types/missionhistory"

// Props interface for server-passed data
interface MissionHistoryClientProps {
  initialData: MissionHistoryResponse | null
  error: string | null
}

// Named export for use by Server Component
export function MissionHistoryClient({ initialData, error }: MissionHistoryClientProps) {
  // Error state
  if (error || !initialData) {
    return (
      <PageLayout title="Mission History">
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600 text-base">{error || "Failed to load mission history"}</p>
          <Link href="/missions">
            <Button variant="outline" className="mt-4">Back to Missions</Button>
          </Link>
        </div>
      </PageLayout>
    )
  }

  // Extract user info from API response
  const { currentTierName, currentTierColor } = initialData.user

  // Map backend mission types to frontend icons
  const getIconForMissionType = (missionType: string, status: string) => {
    // ... (existing icon logic from current page.tsx lines 40-67)
  }

  return (
    <PageLayout
      title="Mission History"
      headerContent={
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
          <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
          <span className="text-base font-semibold text-white">{currentTierName}</span>
        </div>
      }
    >
      {/* ... (existing JSX from current page.tsx lines 178-291, using initialData.history instead of mockApiResponse.history) */}
    </PageLayout>
  )
}
```

**Explanation:** Client Component receives data via props, handles error state, renders mission history using existing UI logic.

#### New Types/Interfaces

```typescript
// ALREADY EXISTS - No new types needed
// File: app/types/missionhistory.ts
interface MissionHistoryResponse {
  user: {
    id: string
    currentTier: string
    currentTierName: string
    currentTierColor: string
  }
  history: MissionHistoryItem[]
}
```

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `app/missions/missionhistory/page.tsx` | REPLACE | Replace current "use client" page with Server Component |
| `app/missions/missionhistory/missionhistory-client.tsx` | CREATE | New Client Component with existing UI logic |

#### Dependency Graph

```
app/missions/missionhistory/page.tsx (TO BE CREATED - Server Component)
├── imports from: next/headers (cookies), next/navigation (redirect)
├── imports: ./missionhistory-client (MissionHistoryClient)
├── imports: @/app/types/missionhistory (MissionHistoryResponse)
└── fetches: /api/missions/history

app/missions/missionhistory/missionhistory-client.tsx (TO BE CREATED - Client Component)
├── imports from: react, lucide-react, @/components/ui/button, @/components/pagelayout
├── imports: @/lib/utils (cn)
├── imports: @/app/types/missionhistory (MissionHistoryResponse, MissionHistoryItem)
└── exports: MissionHistoryClient
```

---

## 8. Data Flow After Implementation

```
User visits /missions/missionhistory
        ↓
Server Component (page.tsx)
        ↓
fetch('/api/missions/history') with cookies
        ↓
API Route (route.ts)
├── Validates auth via Supabase
├── Gets user via userRepository
├── Gets tier via dashboardRepository
└── Gets history via missionService.getMissionHistory()
        ↓
missionRepository.getHistory()
        ↓
Supabase RPC: get_mission_history(p_user_id, p_client_id)
        ↓
Returns: redemptions JOIN mission_progress JOIN missions JOIN rewards LEFT JOIN raffle_participations
        ↓
Service transforms to MissionHistoryResponse
        ↓
API returns JSON
        ↓
Server Component passes to MissionHistoryClient
        ↓
Client Component renders history cards
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, client_id, current_tier | User identification |
| `tiers` | tier_id, tier_name, tier_color | Tier badge display |
| `redemptions` | id, status, concluded_at, rejected_at, mission_progress_id | History filter (concluded/rejected) |
| `mission_progress` | id, mission_id, completed_at | Link to mission |
| `missions` | id, mission_type, display_name | Mission details |
| `rewards` | id, type, name, value_data, reward_source | Reward display |
| `raffle_participations` | is_winner, participated_at, winner_selected_at | Raffle outcomes |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| `get_mission_history` RPC | Yes - via `p_client_id` parameter | [x] Verified in baseline.sql line 603 |
| API route user validation | Yes - `user.clientId !== clientId` check | [x] Verified in route.ts line 66 |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `GET /api/missions/history` | NO CHANGE | Existing | Existing |

#### Breaking Changes?
- [x] No - additive changes only (frontend now calls existing API)

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 10-50 history items per user | Yes |
| Query complexity | O(n) where n = user's concluded redemptions | Yes |
| Frequency | Per page visit (not cached) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP

Server-side fetch is actually faster than client-side fetch because:
- Data is fetched before HTML is sent to browser
- No loading spinner needed
- No hydration delay before data appears

---

## 12. Alternative Solutions Considered

#### Option A: Client-Side Fetch (per original EXECUTION_PLAN)
- **Description:** Add useState + useEffect in current page to fetch data client-side
- **Pros:** Simpler refactor, matches EXECUTION_PLAN task description
- **Cons:** Loading spinner required, slower perceived performance, inconsistent with home/missions pattern
- **Verdict:** ❌ Rejected - inconsistent with codebase patterns, worse UX

#### Option B: Server-Side Fetch (Selected)
- **Description:** Split into Server Component + Client Component, fetch server-side
- **Pros:** Consistent with home/missions pages, faster perceived load, no loading spinner, server-side 401 redirect
- **Cons:** Slightly more complex (2 files vs 1)
- **Verdict:** ✅ Selected - matches established pattern, better performance

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cookie forwarding fails | Low | High (401 errors) | Use same pattern as working pages (home/missions) |
| User has no history data | Medium | Low | Empty state already handled in UI |
| API returns error | Low | Medium | Error prop passed to client, shows error UI |

---

## 14. Testing Strategy

#### Unit Tests
No new unit tests required - existing service/repository tests cover backend logic.

#### Integration Tests
Backend API already tested via existing test suite.

#### Manual Verification Steps

1. [ ] Login as @testbronze user
2. [ ] Navigate to `/missions/missionhistory`
3. [ ] Verify page loads without loading spinner (server-side fetch)
4. [ ] Verify tier badge shows correct tier (Bronze)
5. [ ] Verify history shows real concluded missions (or empty state if none)
6. [ ] Logout and try to access page directly
7. [ ] Verify redirect to `/login/start` (401 handling)
8. [ ] Login as @testgold user with concluded missions
9. [ ] Verify mission cards render with correct data
10. [ ] Verify raffle won/lost states display correctly

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [x] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Create missionhistory-client.tsx
  - File: `app/missions/missionhistory/missionhistory-client.tsx`
  - Action: CREATE - Move UI logic from current page, add props interface
- [ ] **Step 2:** Replace page.tsx with Server Component
  - File: `app/missions/missionhistory/page.tsx`
  - Action: REPLACE - Server Component with fetch, pass data to client

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification (all steps in Section 14)
- [ ] Update EXECUTION_PLAN.md - mark Tasks 9.4.2-9.4.5 complete

---

## 16. Definition of Done

- [ ] `missionhistory-client.tsx` created with props interface `{ initialData, error }`
- [ ] `page.tsx` replaced with Server Component that fetches `/api/missions/history`
- [ ] Mock data completely removed from codebase
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed (10 steps)
- [ ] EXECUTION_PLAN.md updated (Tasks 9.4.2-9.4.5 marked complete)
- [ ] DATA_FLOWS.md updated (Current Implementation Status changed to ✅)
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `DATA_FLOWS.md` | `/missions/missionhistory` | Complete backend data flow documentation |
| `MISSIONS_IMPL.md` | GET /api/missions/history | API route implementation details |
| `app/home/page.tsx` | Full file | Pattern reference for Server Component |
| `app/missions/page.tsx` | Full file | Pattern reference for Server Component |
| `app/missions/missions-client.tsx` | Props interface (lines 38-51) | Pattern reference for Client Component |
| `middleware.ts` | Matcher config (lines 204-225) | Confirm API route covered |
| `app/types/missionhistory.ts` | Full file | Type definitions for response |
| `supabase/migrations/00000000000000_baseline.sql` | `get_mission_history` (lines 573-608) | RPC implementation |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-22
**Author:** Claude Code
**Status:** Analysis Complete

---

# Checklist for Gap/Enhancement Document

- [x] **Type clearly identified** as Enhancement (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (no changes needed)
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
