# Mission Repository Embedded Join Fix - Fix Documentation

**Bug ID:** BUG-MISSION-REPO-EMBEDDED-JOIN
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High (Blocks dashboard missions display, affects all authenticated users)
**Related Tasks:** Phase 9 Frontend Integration
**Linked Bugs:** None

---

## 1. Project Context

This is a loyalty/VIP rewards application built with Next.js 14, TypeScript, and Supabase. The system tracks TikTok content creators' sales performance, assigns them to tiers (Bronze, Silver, Gold, Platinum), and provides missions they can complete for rewards.

The bug affects **dashboard mission display** - a core feature where users see their current mission progress. When the dashboard loads, it should show a featured mission with progress tracking, but instead shows empty data because the mission query fails.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgREST), PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

---

## 2. Bug Summary

**What's happening:** The missionRepository uses Supabase's embedded join syntax (`tiers!inner(...)`) to fetch mission data with tier information, but this syntax requires a foreign key relationship between the tables. No FK exists between `missions.tier_eligibility` and `tiers`, causing the query to fail with error "Could not find a relationship between 'missions' and 'tiers' in the schema cache."

**What should happen:** The dashboard should successfully fetch the user's featured mission with tier color/name information for display.

**Impact:** All authenticated users see empty mission data on the dashboard. The "Next:" field shows "$undefined", the progress circle is empty, and no mission information is displayed.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **Live Supabase Server (Runtime)** | Server error logs | Returns PGRST200 error: "Could not find a relationship between 'missions' and 'tiers' in the schema cache" |
| **Live Database - FK Query** | `SELECT ... FROM information_schema.table_constraints WHERE table_name = 'missions'` | Confirmed `missions` table has NO FK to `tiers` - only FKs: `missions_client_id_fkey`, `missions_reward_id_fkey` |
| **Live Database - tier_eligibility values** | `SELECT DISTINCT tier_eligibility FROM missions` | Returns: 'tier_1', 'tier_2', 'tier_3', 'tier_4', **'all'** - the 'all' value proves FK cannot exist |
| **missionRepository.ts** | `findFeaturedMission` function (line 271) | Uses `tiers!inner(...)` embedded join syntax which requires FK |
| **missionRepository.ts** | `findById` function (line 703) | Same broken pattern `tiers!inner(...)` |
| **Migration file** | `/supabase/migrations/20251204095615_single_query_rpc_functions.sql` line 143 | RPC uses explicit JOIN: `INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id` |
| **Supabase/PostgREST Documentation** | Embedded resources syntax | Confirms `table!inner(...)` syntax requires FK relationship |

### Key Evidence

**Evidence 1:** Runtime error from live Supabase server
- Source: Server logs when dashboard loads
- Error: `PGRST200 - "Could not find a relationship between 'missions' and 'tiers' in the schema cache"`
- Implication: This is not a documentation or test data issue - the live server is rejecting the query

**Evidence 2:** Foreign key verification query on live database
- Source: Supabase Dashboard SQL Editor
- Query:
```sql
SELECT tc.constraint_name, tc.table_name, kcu.column_name,
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'missions';
```
- Result: Only 2 FKs exist: `missions_client_id_fkey` and `missions_reward_id_fkey`
- Implication: No FK to `tiers` table exists, confirming why embedded join fails

**Evidence 3:** Working RPC uses explicit JOINs
- Source: `/supabase/migrations/20251204095615_single_query_rpc_functions.sql` line 143
- Code: `INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id`
- Implication: The intended design is explicit JOINs, not embedded syntax. The RPC works, the repository doesn't.

**Evidence 4:** tier_eligibility allows 'all' value
- Source: Live database query `SELECT DISTINCT tier_eligibility FROM missions`
- Result: `['tier_1', 'tier_2', 'tier_3', 'tier_4', 'all']`
- Implication: FK cannot exist because 'all' is not a valid `tiers.tier_id` - this is intentional design to support missions available to all tiers

**Evidence 5:** PostgREST documentation requirement
- Source: Supabase/PostgREST official documentation
- Finding: The `!inner` embedded join syntax requires a foreign key relationship
- Implication: Without FK, this syntax will always fail - this is not a bug in Supabase but incorrect usage

---

## 4. Root Cause Analysis

**Root Cause:** The missionRepository code uses Supabase's embedded join syntax (`tiers!inner(...)`) which requires a foreign key relationship, but no FK exists between `missions.tier_eligibility` and `tiers` - and one cannot exist because `tier_eligibility` can be 'all'.

**Contributing Factors:**
1. Code was written assuming FK would exist or misunderstanding how PostgREST embedded joins work
2. The working RPC (`get_available_missions`) uses explicit JOINs, but repository code wasn't updated to match
3. No integration testing was done against the live database before frontend integration
4. First-time testing of this code path during frontend integration exposed the issue

**How it was introduced:** The repository code was written with an incorrect assumption about Supabase embedded join requirements. The code pattern `tiers!inner(...)` was used without verifying a FK relationship existed.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Dashboard shows empty mission data, confusing users | High |
| Data integrity | No data corruption - query simply fails | Low |
| Feature functionality | Mission display completely broken | High |
| User engagement | Users cannot see missions to complete | High |

**Business Risk Summary:** This is a critical user-facing bug that prevents users from seeing and engaging with missions - a core gamification feature of the loyalty platform. Users see "$undefined" and empty progress, creating a poor first impression.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`

```typescript
// Lines 250-275 - findFeaturedMission function
const { data: missions, error: missionsError } = await supabase
  .from('missions')
  .select(`
    id,
    mission_type,
    display_name,
    title,
    description,
    target_value,
    target_unit,
    raffle_end_date,
    activated,
    tier_eligibility,
    reward_id,
    rewards!inner (
      id,
      type,
      name,
      description,
      value_data
    ),
    tiers!inner (          // ⚠️ BUG: Requires FK that doesn't exist
      id,
      tier_name,
      tier_color
    ),
    mission_progress (
      id,
      current_value,
      status,
      completed_at,
      ...
    )
  `)
```

**Current Behavior:**
- Query is sent to Supabase with embedded join syntax
- PostgREST looks for FK between `missions` and `tiers`
- No FK found → returns PGRST200 error
- Repository catches error, logs it, returns empty data
- Dashboard shows empty/undefined values

### Current Data Flow

```
Dashboard Page Load
       ↓
GET /api/dashboard
       ↓
dashboardService.getDashboardOverview()
       ↓
getFeaturedMission()
       ↓
missionRepository.findFeaturedMission()
       ↓
Supabase query with tiers!inner(...)
       ↓
PostgREST: "No FK relationship found"
       ↓
PGRST200 Error → null returned
       ↓
Dashboard shows empty/undefined
```

---

## 7. Proposed Fix

### Approach

Replace the embedded join syntax with separate queries - fetch missions first, then fetch tier information using the `tier_eligibility` value. This matches the pattern used by the working RPC.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`

**Option A: Use separate queries (Recommended)**

> **IMPORTANT IMPLEMENTATION NOTE:** The code snippets below are **illustrative only** - they show the pattern for removing the embedded join. The actual implementation **MUST preserve all existing filters** from the current code (lines 250-340), including:
> - Mission type constraints and prioritization
> - Raffle activation checks
> - Participation/claimed exclusion logic
> - Display order sorting
> - Progress status filtering
>
> The tier lookup must happen **AFTER** priority selection (on the chosen mission), not on `missions[0]`.

**Before:**
```typescript
const { data: missions, error: missionsError } = await supabase
  .from('missions')
  .select(`
    id,
    mission_type,
    ...
    rewards!inner (...),
    tiers!inner (           // ⚠️ REMOVE THIS - requires FK that doesn't exist
      id,
      tier_name,
      tier_color
    ),
    mission_progress (...)
  `)
```

**After (Pattern Only):**
```typescript
// CHANGE 1: Remove tiers!inner from .select()
const { data: missions, error: missionsError } = await supabase
  .from('missions')
  .select(`
    ...
    tier_eligibility,    // ADD: Need this field for tier lookup
    rewards!inner (...), // KEEP: FK exists, this works
    mission_progress (...) // KEEP: FK exists, this works
    // REMOVE: tiers!inner (...) - no FK, causes PGRST200 error
  `)
  // KEEP: All existing .eq(), .or(), .order() filters UNCHANGED

// CHANGE 2: After existing priority/selection logic determines the mission...
// (preserve all existing filtering, sorting, and selection logic)
const selectedMission = /* existing logic returns the chosen mission */;

// CHANGE 3: Add separate tier lookup for the SELECTED mission
let tierInfo = { tier_name: 'All Tiers', tier_color: '#888888' };
if (selectedMission && selectedMission.tier_eligibility !== 'all') {
  const { data: tier } = await supabase
    .from('tiers')
    .select('tier_name, tier_color')
    .eq('client_id', clientId)
    .eq('tier_id', selectedMission.tier_eligibility)
    .single();
  if (tier) tierInfo = tier;
}
```

**Key Changes Summary:**
1. Remove `tiers!inner(...)` from `.select()` - this is the fix
2. Add `tier_eligibility` to select fields if not already present
3. Add tier lookup query AFTER mission selection logic completes
4. **DO NOT MODIFY** any existing filters, ordering, or selection logic

**Explanation:** By splitting into two queries, we avoid the FK requirement. The `rewards!inner` join still works because that FK exists. Tier info is fetched separately for the selected mission only.

**Option B: Use existing RPC**

Alternatively, modify the service layer to use the existing `get_available_missions` RPC which already handles this correctly.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `lib/repositories/missionRepository.ts` | MODIFY | Line 271: Remove `tiers!inner(...)` in `findFeaturedMission`, add separate tier query |
| `lib/repositories/missionRepository.ts` | MODIFY | Line 703: Remove `tiers!inner(...)` in `findById`, add separate tier query |

### Dependency Graph

```
missionRepository.ts
├── imports from: @/lib/supabase/server-client, @/lib/types/database
├── imported by: dashboardService.ts, missionService.ts
└── affects: /api/dashboard → Home page mission display
             /api/missions → Missions page
```

---

## 9. Data Flow Analysis

### Before Fix

```
missionRepository.findFeaturedMission()
         ↓
Supabase query: missions + tiers!inner
         ↓
PostgREST: "No FK found"
         ↓
PGRST200 Error
         ↓
null returned
         ↓
Dashboard: empty mission data
```

### After Fix

```
missionRepository.findFeaturedMission()
         ↓
Query 1: missions + rewards!inner (FK exists ✓)
         ↓
Success: mission data returned
         ↓
Query 2: tiers where tier_id = tier_eligibility
         ↓
Success: tier info returned
         ↓
Combined data returned
         ↓
Dashboard: mission displays correctly
```

### Data Transformation Steps

1. **Step 1:** Query missions with rewards (FK exists, works)
2. **Step 2:** Extract `tier_eligibility` from mission
3. **Step 3:** If not 'all', query tiers table for color/name
4. **Step 4:** Combine mission + tier data
5. **Step 5:** Return to service layer for formatting

---

## 10. Call Chain Mapping

### Affected Call Chain

```
/api/dashboard (route.ts)
│
├─► getDashboardOverview (dashboardService.ts)
│   └── Orchestrates dashboard data fetching
│
├─► getFeaturedMission (dashboardService.ts)
│   └── Gets mission for dashboard display
│
└─► findFeaturedMission (missionRepository.ts)
    ├── Queries missions with embedded joins
    └── ⚠️ BUG: tiers!inner() fails - no FK
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | missions table | Source table, has no FK to tiers |
| Database | tiers table | Target of failed join |
| Repository | missionRepository.findFeaturedMission | Contains broken embedded join syntax |
| Service | dashboardService.getFeaturedMission | Receives null when query fails |
| API Route | /api/dashboard | Returns response with empty mission |
| Frontend | Home page | Displays "$undefined" and empty circle |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| missions | tier_eligibility (VARCHAR) | Contains 'tier_1', 'tier_2', 'all' - no FK |
| tiers | tier_id (VARCHAR), tier_name, tier_color | tier_id is 'tier_1' etc. |
| rewards | id (UUID) | Has FK from missions.reward_id |

### Schema Check

```sql
-- Verify missions.tier_eligibility values (includes 'all')
SELECT DISTINCT tier_eligibility FROM missions;
-- Returns: tier_1, tier_2, tier_3, tier_4, all

-- Verify tiers.tier_id values
SELECT tier_id FROM tiers;
-- Returns: tier_1, tier_2, tier_3, tier_4

-- Note: 'all' in missions.tier_eligibility has no match in tiers
-- This is why FK cannot exist - intentional design
```

### Data Migration Required?

- [x] No - schema already supports fix (separate queries work)
- [ ] Yes

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Home page | app/home/page.tsx | Will display mission data after fix |
| Mission circle | app/home/page.tsx | Will show progress percentage |
| Next reward text | app/home/page.tsx | Will show reward instead of "$undefined" |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| featuredMission.mission | null (due to error) | Populated object | No - frontend handles both |
| featuredMission.tier | null | { name, color } | No |

### Frontend Changes Required?

- [x] No - frontend already handles the response structure
- [ ] Yes

---

## 13. Alternative Solutions Considered

### Option A: Add Foreign Key to Database

- **Description:** Create FK from missions.tier_eligibility to tiers.tier_id
- **Pros:** Would make embedded join syntax work
- **Cons:**
  - Cannot work - `tier_eligibility` allows 'all' which has no tiers.tier_id match
  - Would require schema redesign
  - Would break existing data
- **Verdict:** ❌ Rejected - Technically impossible due to 'all' value

### Option B: Separate Queries (Selected)

- **Description:** Remove embedded join, fetch tier info in separate query
- **Pros:**
  - Works with existing schema
  - Minimal code change
  - Matches pattern used by working RPC
  - No database changes needed
- **Cons:**
  - Two queries instead of one (minor performance impact)
- **Verdict:** ✅ Selected - Clean fix that works with current design

### Option C: Use RPC Instead of Repository

- **Description:** Call `get_available_missions` RPC from repository
- **Pros:** RPC already works correctly
- **Cons:**
  - Breaks repository pattern (repositories do direct queries)
  - Would need to reshape RPC response to match repository interface
  - More invasive change
- **Verdict:** ❌ Rejected - Too invasive, breaks architecture pattern

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Second query adds latency | Medium | Low | Tier query is simple, indexed lookup |
| Other embedded joins exist | Low | Medium | Search codebase for similar patterns |
| Tier not found for valid tier_id | Low | Low | Default fallback tier info |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response structure unchanged |
| Database | No | No schema changes |
| Frontend | No | Already handles response |

---

## 15. Testing Strategy

### Manual Verification Steps

1. [ ] Start dev server: `npm run dev`
2. [ ] Navigate to http://localhost:3000/login/start
3. [ ] Login as `testbronze` / `TestPass123!`
4. [ ] Verify dashboard shows mission progress (not empty circle)
5. [ ] Verify "Next:" shows reward value (not "$undefined")
6. [ ] Login as `testsilver` and verify missions display
7. [ ] Check server logs - no PGRST200 errors

### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Check for similar embedded join issues
grep -r "tiers!inner" lib/repositories/
```

---

## 16. Implementation Checklist

### Pre-Implementation

- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

### Implementation Steps

- [ ] **Step 1:** Modify `findFeaturedMission` function (line 271)
  - File: `lib/repositories/missionRepository.ts`
  - Change: Remove `tiers!inner(...)`, add separate tier query

- [ ] **Step 2:** Modify `findById` function (line 703)
  - File: `lib/repositories/missionRepository.ts`
  - Change: Remove `tiers!inner(...)`, add separate tier query

- [ ] **Step 3:** Verify no other occurrences
  - Command: `grep -r "tiers!inner" lib/`
  - Expected: No matches after Steps 1-2

### Post-Implementation

- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Verify no PGRST200 errors in server logs

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 9 | Frontend Integration Testing | Blocked until fix applied |

### Updates Required

**Phase 9 Testing:**
- Current blocker: Dashboard missions not displaying
- After fix: Mission progress should display correctly

### New Tasks Created

- [ ] Audit all repository files for embedded join patterns that may have similar issues

---

## 18. Definition of Done

- [ ] All code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Dashboard displays mission progress (not empty)
- [ ] "Next:" shows reward value (not "$undefined")
- [ ] No PGRST200 errors in server logs
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Live Supabase Server Error Log | PGRST200 error message | Proves the query is failing at runtime |
| Live Database FK Query | `SELECT ... FROM information_schema.table_constraints` | Proves no FK to tiers exists |
| Live Database tier_eligibility Query | `SELECT DISTINCT tier_eligibility FROM missions` | Proves 'all' value exists, FK impossible |
| `lib/repositories/missionRepository.ts` | `findFeaturedMission` (line 271), `findById` (line 703) | Shows broken embedded join code |
| `/supabase/migrations/20251204095615_single_query_rpc_functions.sql` | Line 143 | Shows working explicit JOIN pattern |
| Supabase PostgREST Docs | Embedded resources | Confirms FK requirement for `!inner` syntax |

### Reading Order for External Auditor

1. **First:** This document Section 3 (Discovery Evidence) - See all proof sources with SQL queries
2. **Second:** `lib/repositories/missionRepository.ts` lines 271 and 703 - See the broken `tiers!inner` code
3. **Third:** `/supabase/migrations/20251204095615_single_query_rpc_functions.sql` line 143 - See the working explicit JOIN
4. **Fourth:** Section 7 (Proposed Fix) - Understand the solution

---

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-15 | Initial analysis |
| 1.1 | 2025-12-15 | Audit feedback: Added `findById` (line 703), repo-backed RPC evidence, live DB query for 'all' value |
| 1.2 | 2025-12-15 | Audit feedback: Added implementation warning to preserve existing filters; clarified tier lookup must happen after priority selection |
| 1.3 | 2025-12-15 | Audit feedback: Removed specific filter examples from "After" snippet to prevent behavior drift; made pattern more abstract with explicit KEEP/REMOVE/ADD comments |

---

**Document Version:** 1.3
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete
