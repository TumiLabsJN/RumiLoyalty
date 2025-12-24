# Raffle Loser Visibility - Fix Documentation

**Bug ID:** BUG-RAFFLE-002
**Created:** 2025-12-24
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** None identified
**Linked Bugs:** BUG-RAFFLE-001 (RaffleParticipateIdMismatchFix.md)

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, Supabase (PostgreSQL), and deployed on Vercel. The system manages VIP tiers, missions, and rewards for TikTok Shop creators. Creators complete missions (sales targets, content creation, raffles) to earn rewards like gift cards, commission boosts, and physical prizes.

The bug affects the **Missions page** which displays active/available missions. Raffle missions allow creators to enter a drawing for prizes. When the raffle concludes and a winner is selected, losing participants should no longer see the raffle on their active missions page - it should move to their mission history.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Vercel
**Architecture Pattern:** RPC Functions → Repository → Service → API Route → React Client

---

## 2. Bug Summary

**What's happening:** After a raffle winner is selected and losers are marked (`is_winner = FALSE`, `redemption.status = 'rejected'`), losing participants still see the raffle mission on their active Missions page with status "Waiting for Draw" (`raffle_processing`).

**What should happen:** Losing participants should NOT see the raffle on their active Missions page. The lost raffle should only appear in their Mission History with a "Better luck next time" message.

**Impact:**
- User confusion (raffle shows "waiting" when it's already concluded)
- Poor user experience (false hope that draw hasn't happened)
- Cluttered missions page with concluded content

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Full Path | Section/Area | Finding |
|----------|-----------|--------------|---------|
| `missionService.ts` | `appcode/lib/services/missionService.ts` | `computeStatus()` (lines 375-428) | Returns `raffle_processing` for `isWinner === false` with comment "shouldn't appear in available missions" but no filter implemented |
| `missionService.ts` | `appcode/lib/services/missionService.ts` | `getMissionHistory()` (line 1203) | History correctly handles `rejected_raffle` status |
| `missionService.ts` | `appcode/lib/services/missionService.ts` | `listAvailableMissions()` (lines 854-901) | No filter step to exclude lost raffles before returning response |
| `baseline.sql` | `supabase/migrations/00000000000000_baseline.sql` | `get_available_missions` RPC (lines 477-514) | RPC filters `redemptions` with `NOT IN ('concluded', 'rejected')` but `raffle_participations` join has no `is_winner` filter |
| `ADMIN_API_CONTRACTS.md` | `Rumi/ADMIN_API_CONTRACTS.md` | POST /api/admin/missions/raffle/:id/select-winner (lines 1500-1565) | Documents that winner selection should mark all losers with `is_winner = FALSE` and `redemption.status = 'rejected'` |
| `raffle-winner-selection.test.ts` | `appcode/tests/integration/missions/raffle-winner-selection.test.ts` | Winner Selection tests | Confirms expected behavior: losers should have `is_winner = FALSE` and `redemption.status = 'rejected'` |
| `SchemaFinalv2.md` | `Rumi/SchemaFinalv2.md` | raffle_participations table (lines 892-957) | Documents `is_winner` column: `NULL = not picked, TRUE = won, FALSE = lost` |
| `API_CONTRACTS.md` | `Rumi/API_CONTRACTS.md` | GET /api/missions Response Schema | Documents that missions array should only contain active/available missions |
| `MISSIONS_IMPL.md` | `Rumi/repodocs/MISSIONS_IMPL.md` | Status Computation, raffle flows | Reference documentation for mission status logic |

### Key Evidence

**Evidence 1:** RPC query joins `raffle_participations` without filtering losers
- Source: `supabase/migrations/00000000000000_baseline.sql`, `get_available_missions` function, line 503
- Code: `LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id`
- Implication: Losers' participation records are returned, causing mission to appear

**Evidence 2:** Redemption filter exists but doesn't help for raffles
- Source: `supabase/migrations/00000000000000_baseline.sql`, `get_available_missions` function, line 499
- Code: `AND red.status NOT IN ('concluded', 'rejected')`
- Implication: Rejected redemption is filtered from JOIN, but `raffle_participations` row still exists and mission still matches WHERE clause

**Evidence 3:** Status computation acknowledges bug but doesn't fix it
- Source: `appcode/lib/services/missionService.ts`, `computeStatus()`, lines 426-427
- Code: `// Lost - shouldn't appear in available missions` followed by `return 'raffle_processing';`
- Implication: Comment documents intent but implementation doesn't filter - just returns wrong status

**Evidence 4:** History correctly handles losers
- Source: `appcode/lib/services/missionService.ts`, `getMissionHistory()`, line 1203
- Code: `if (data.redemption.status === 'rejected' && data.raffleParticipation?.isWinner === false)`
- Implication: History function knows how to identify losers, proving the data is available for filtering

---

## 4. Root Cause Analysis

**Root Cause:** The `get_available_missions` RPC function joins `raffle_participations` without filtering out rows where `is_winner = FALSE`, causing lost raffles to be returned to the frontend.

**Contributing Factors:**
1. RPC designed before winner selection flow was fully implemented
2. `redemptions` table filter (`NOT IN ('concluded', 'rejected')`) was assumed sufficient
3. `raffle_participations` join was added for participation tracking, not winner filtering
4. Service layer has no secondary filter as a safety net

**How it was introduced:** The raffle participation feature was implemented incrementally. The participation tracking (lines 503) was added first, and the winner selection flow was documented (ADMIN_API_CONTRACTS.md) but the RPC wasn't updated when winner selection logic was defined.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User Experience | Creators see stale "waiting for draw" after losing | Medium |
| User Trust | May believe raffle hasn't concluded when it has | Medium |
| Page Clutter | Lost raffles take up space on active missions | Low |
| Data Accuracy | UI state doesn't match database state | Medium |

**Business Risk Summary:** While not breaking functionality, this bug causes confusion for creators who lost raffles. They see misleading status information and may contact support thinking the draw hasn't happened.

---

## 6. Current State

### Current File(s)

**File:** `supabase/migrations/00000000000000_baseline.sql` (RPC function)
```sql
-- Lines 503: raffle_participations join has no is_winner filter
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
```

**File:** `appcode/lib/services/missionService.ts`
```typescript
// Lines 426-427: Comment acknowledges issue but returns wrong status
    // Lost - shouldn't appear in available missions
    return 'raffle_processing';
```

**Current Behavior:**
- Raffle loser has `is_winner = FALSE` in database
- Raffle loser has `redemption.status = 'rejected'` in database
- RPC still returns the mission because `raffle_participations` row exists
- Frontend shows "Waiting for Draw" status (raffle_processing)

### Current Data Flow

```
Database: raffle_participations.is_winner = FALSE
         redemptions.status = 'rejected'
              ↓
RPC: get_available_missions
     - Filters rejected redemption (red.id = NULL)
     - Still joins raffle_participation (rp.is_winner = FALSE returned)
     - Mission matches WHERE (enabled AND tier-eligible)
              ↓
Service: computeStatus()
     - Sees raffleParticipation.isWinner === false
     - Returns 'raffle_processing' (wrong!)
              ↓
Frontend: Shows "Waiting for Draw"
```

---

## 7. Proposed Fix

### Approach

**Two-layer fix for defense in depth:**

1. **Primary fix (RPC):** Update `get_available_missions` RPC to exclude `raffle_participations` rows where `is_winner = FALSE`. This fixes the issue at the data source.

2. **Secondary safeguard (Service):** Add filter in `listAvailableMissions()` to exclude lost raffles. This protects against future data source changes that might bypass the RPC filter.

### Changes Required

#### Change 1: Service-Level Filter (Defense in Depth)

**File:** `appcode/lib/services/missionService.ts`

**Before (lines 869-874):**
```typescript
  // 2. Compute status and transform each mission
  const missionsWithData = rawMissions.map((data) => {
    const status = computeStatus(data);
    const item = transformMission(data, status, tierLookup);
    return { item, data };
  });
```

**After:**
```typescript
  // 2. Compute status and transform each mission
  const missionsWithData = rawMissions.map((data) => {
    const status = computeStatus(data);
    const item = transformMission(data, status, tierLookup);
    return { item, data };
  });

  // 2a. Filter out lost raffles (defense in depth - RPC should already exclude)
  const filteredMissions = missionsWithData.filter(({ data }) => {
    // Exclude lost raffles - they belong in history, not available missions
    if (data.raffleParticipation?.isWinner === false) {
      return false;
    }
    return true;
  });
```

**Note:** Also update line 879 and 887 to use `filteredMissions` instead of `missionsWithData`.

**Explanation:** Even if RPC is bypassed or a future data source doesn't filter, this ensures losers never see their lost raffle on the active page.

#### Change 2: RPC Filter (Primary Fix)

**File:** `supabase/migrations/[timestamp]_fix_raffle_loser_visibility.sql`

**Before (from baseline):**
```sql
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
```

**After:**
```sql
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
  AND rp.user_id = p_user_id
  AND (rp.is_winner IS NULL OR rp.is_winner = TRUE)
```

**Explanation:**
- `is_winner IS NULL` → User participated, waiting for draw (show)
- `is_winner = TRUE` → User won (show, with appropriate status)
- `is_winner = FALSE` → User lost (exclude from available, goes to history)

### New Code (Migration File)

**New File:** `supabase/migrations/[timestamp]_fix_raffle_loser_visibility.sql`
```sql
-- Fix: Exclude raffle losers from available missions
-- BUG-RAFFLE-002: Losers should not see raffle on active missions page

CREATE OR REPLACE FUNCTION "public"."get_available_missions"(
  "p_user_id" "uuid",
  "p_client_id" "uuid",
  "p_current_tier" character varying
) RETURNS TABLE(
  "mission_id" "uuid",
  "mission_type" character varying,
  "mission_display_name" character varying,
  "mission_title" character varying,
  "mission_description" "text",
  "mission_target_value" integer,
  "mission_target_unit" character varying,
  "mission_raffle_end_date" timestamp without time zone,
  "mission_activated" boolean,
  "mission_tier_eligibility" character varying,
  "mission_preview_from_tier" character varying,
  "mission_enabled" boolean,
  "mission_display_order" integer,
  "mission_reward_id" "uuid",
  "reward_id" "uuid",
  "reward_type" character varying,
  "reward_name" character varying,
  "reward_description" character varying,
  "reward_value_data" "jsonb",
  "reward_redemption_type" character varying,
  "reward_source" character varying,
  "tier_id" character varying,
  "tier_name" character varying,
  "tier_color" character varying,
  "tier_order" integer,
  "progress_id" "uuid",
  "progress_current_value" integer,
  "progress_status" character varying,
  "progress_completed_at" timestamp without time zone,
  "progress_checkpoint_start" timestamp without time zone,
  "progress_checkpoint_end" timestamp without time zone,
  "redemption_id" "uuid",
  "redemption_status" character varying,
  "redemption_claimed_at" timestamp without time zone,
  "redemption_fulfilled_at" timestamp without time zone,
  "redemption_concluded_at" timestamp without time zone,
  "redemption_rejected_at" timestamp without time zone,
  "redemption_scheduled_activation_date" "date",
  "redemption_scheduled_activation_time" time without time zone,
  "redemption_activation_date" timestamp without time zone,
  "redemption_expiration_date" timestamp without time zone,
  "boost_status" character varying,
  "boost_scheduled_activation_date" "date",
  "boost_activated_at" timestamp without time zone,
  "boost_expires_at" timestamp without time zone,
  "boost_duration_days" integer,
  "physical_gift_shipped_at" timestamp without time zone,
  "physical_gift_shipping_city" character varying,
  "physical_gift_requires_size" boolean,
  "raffle_is_winner" boolean,
  "raffle_participated_at" timestamp without time zone,
  "raffle_winner_selected_at" timestamp without time zone
)
LANGUAGE "sql" SECURITY DEFINER
AS $$
  SELECT
    m.id, m.mission_type, m.display_name, m.title, m.description,
    m.target_value, m.target_unit, m.raffle_end_date, m.activated,
    m.tier_eligibility, m.preview_from_tier, m.enabled, m.display_order, m.reward_id,
    r.id, r.type, r.name, r.description, r.value_data, r.redemption_type, r.reward_source,
    t.tier_id, t.tier_name, t.tier_color, t.tier_order,
    mp.id, mp.current_value, mp.status, mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
    red.id, red.status, red.claimed_at, red.fulfilled_at, red.concluded_at, red.rejected_at,
    red.scheduled_activation_date, red.scheduled_activation_time, red.activation_date, red.expiration_date,
    cb.boost_status, cb.scheduled_activation_date, cb.activated_at, cb.expires_at, cb.duration_days,
    pg.shipped_at, pg.shipping_city, pg.requires_size,
    rp.is_winner, rp.participated_at, rp.winner_selected_at
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = p_user_id AND mp.client_id = p_client_id
  LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
    AND red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.status NOT IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
  LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
  LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
  -- FIX: Exclude raffle losers (is_winner = FALSE)
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND (rp.is_winner IS NULL OR rp.is_winner = TRUE)
  WHERE m.client_id = p_client_id
    AND (
      (m.enabled = true AND (
        m.tier_eligibility = p_current_tier
        OR m.tier_eligibility = 'all'
        OR m.preview_from_tier = p_current_tier
      ))
      OR red.id IS NOT NULL
    )
    -- FIX: Exclude raffle missions where user lost
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_check
      WHERE rp_check.mission_id = m.id
        AND rp_check.user_id = p_user_id
        AND rp_check.is_winner = FALSE
    )
  ORDER BY m.display_order ASC;
$$;
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/services/missionService.ts` | MODIFY | Add filter in `listAvailableMissions()` to exclude lost raffles (defense in depth) |
| `supabase/migrations/[timestamp]_fix_raffle_loser_visibility.sql` | CREATE | New migration to update RPC function with `is_winner` filter |

### Dependency Graph

```
GET /api/missions
│
├── missionService.listAvailableMissions() ← MODIFY (add filter)
│   │
│   └── missionRepository.listAvailable()
│       │
│       └── supabase.rpc('get_available_missions') ← MODIFY (RPC migration)
│
└── Response excludes lost raffles (both layers filter)
```

---

## 9. Data Flow Analysis

### Before Fix

```
Database: is_winner = FALSE, redemption.status = 'rejected'
              ↓
RPC: LEFT JOIN raffle_participations (no filter)
     → Returns mission with rp.is_winner = FALSE
              ↓
Service: computeStatus() returns 'raffle_processing'
              ↓
Frontend: Shows "Waiting for Draw" ❌
```

### After Fix

```
Database: is_winner = FALSE, redemption.status = 'rejected'
              ↓
RPC: LEFT JOIN raffle_participations
     WHERE (is_winner IS NULL OR is_winner = TRUE)
     + NOT EXISTS (is_winner = FALSE)
     → Mission excluded from results (Layer 1)
              ↓
Service: listAvailableMissions()
     → Filter excludes isWinner === false (Layer 2 - defense in depth)
              ↓
Frontend: Raffle not shown ✅ (appears in history instead)
```

### Data Transformation Steps

1. **Database query (Layer 1):** RPC filters out participation rows where `is_winner = FALSE`
2. **NOT EXISTS clause:** Ensures raffle missions with loser participation are excluded from RPC results
3. **Service filter (Layer 2):** `listAvailableMissions()` filters out any remaining `isWinner === false` entries
4. **Frontend unchanged:** Will simply not receive lost raffles

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/missions (route.ts)
│
├─► userRepository.findByAuthId()
│   └── Auth validation
│
├─► dashboardRepository.getUserDashboard()
│   └── Get tier info
│
└─► listAvailableMissions() (missionService.ts)
    │
    ├─► missionRepository.listAvailable()
    │   │
    │   └─► supabase.rpc('get_available_missions') ⚠️ BUG IS HERE
    │       └── Returns lost raffles due to missing filter
    │
    ├─► computeStatus()
    │   └── Returns 'raffle_processing' for losers
    │
    └─► transformMission()
        └── Transforms to API response
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `get_available_missions` RPC | **Root cause** - missing is_winner filter |
| Repository | `missionRepository.listAvailable()` | Passes through RPC results unchanged |
| Service | `computeStatus()` | Returns wrong status for losers |
| API Route | `GET /api/missions` | Returns incorrect data to frontend |
| Frontend | Missions page | Displays "Waiting for Draw" incorrectly |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `raffle_participations` | `is_winner`, `mission_id`, `user_id` | `is_winner`: NULL (pending), TRUE (won), FALSE (lost) |
| `redemptions` | `status` | 'rejected' for losers |
| `missions` | `mission_type`, `enabled` | Filter for raffle type |

### Schema Check

```sql
-- Verify raffle_participations has is_winner column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'raffle_participations'
  AND column_name = 'is_winner';

-- Expected: is_winner, boolean, YES
```

### Data Migration Required?
- [x] No - schema already supports fix (is_winner column exists and is properly populated)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `app/missions/missions-client.tsx` | None - will just not receive lost raffles |
| MissionCard | `app/missions/missions-client.tsx` | None - no changes needed |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `missions[]` | Includes lost raffles | Excludes lost raffles | No |

### Frontend Changes Required?
- [x] No - frontend already handles this (lost raffles simply won't appear in response)

---

## 13. Alternative Solutions Considered

### Option A: Filter in Service Layer Only
- **Description:** Add `.filter()` in `listAvailableMissions()` to exclude lost raffles, no RPC change
- **Pros:** No database migration needed, quick to implement
- **Cons:** Data still transferred from DB, inefficient, doesn't fix root cause
- **Verdict:** ❌ Rejected as sole solution - treating symptom, not cause; wastes bandwidth

### Option B: Fix RPC Function Only
- **Description:** Update `get_available_missions` RPC to exclude losers at query level
- **Pros:** Fixes at source, efficient, no wasted data transfer
- **Cons:** No safety net if RPC is bypassed in future
- **Verdict:** ⚠️ Good but incomplete - needs service layer backup

### Option C: Both RPC + Service Filter (Selected)
- **Description:** Fix RPC AND add service filter as defense in depth
- **Pros:** Fixes at source (efficient) + provides safety net (robust)
- **Cons:** Two places to maintain, slightly more code
- **Verdict:** ✅ Selected - proper fix with defense in depth per audit recommendation

### Option D: Add New RPC Parameter
- **Description:** Add `p_exclude_lost_raffles` parameter to RPC
- **Pros:** Backwards compatible, flexible
- **Cons:** Over-engineered, adds complexity, all callers need updating
- **Verdict:** ❌ Rejected - unnecessary complexity for simple fix

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration fails on Supabase | Low | High | Test in staging first, use Supabase dashboard to verify |
| Breaks history page | Low | Medium | History uses separate query (getHistory RPC), unaffected |
| Winners also filtered | Low | High | Filter condition includes `is_winner = TRUE` explicitly |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response just contains fewer items |
| Database | No | RPC signature unchanged |
| Frontend | No | Already handles variable mission counts |

---

## 15. Testing Strategy

### Unit Tests

**File:** `appcode/tests/integration/missions/raffle-loser-visibility.test.ts`
```typescript
describe('Raffle Loser Visibility', () => {
  it('should not return lost raffles in available missions', async () => {
    // Setup: Create raffle, user participates, marked as loser
    const { mission } = await createTestMission({ missionType: 'raffle' });
    const { user } = await createTestUser();

    // Participate and lose
    await createTestRaffleParticipation({
      missionId: mission.id,
      userId: user.id,
      isWinner: false, // Lost
    });
    await createTestRedemption({
      userId: user.id,
      status: 'rejected',
    });

    // Query available missions
    const { data } = await supabase.rpc('get_available_missions', {
      p_user_id: user.id,
      p_client_id: testClient.id,
      p_current_tier: 'tier_1',
    });

    // Assert: Lost raffle not in results
    const raffleInResults = data.find(m => m.mission_id === mission.id);
    expect(raffleInResults).toBeUndefined();
  });

  it('should still return raffles with pending draw', async () => {
    const { mission } = await createTestMission({ missionType: 'raffle' });
    const { user } = await createTestUser();

    await createTestRaffleParticipation({
      missionId: mission.id,
      userId: user.id,
      isWinner: null, // Pending
    });

    const { data } = await supabase.rpc('get_available_missions', {
      p_user_id: user.id,
      p_client_id: testClient.id,
      p_current_tier: 'tier_1',
    });

    const raffleInResults = data.find(m => m.mission_id === mission.id);
    expect(raffleInResults).toBeDefined();
  });

  it('should still return raffles for winners', async () => {
    const { mission } = await createTestMission({ missionType: 'raffle' });
    const { user } = await createTestUser();

    await createTestRaffleParticipation({
      missionId: mission.id,
      userId: user.id,
      isWinner: true, // Won
    });

    const { data } = await supabase.rpc('get_available_missions', {
      p_user_id: user.id,
      p_client_id: testClient.id,
      p_current_tier: 'tier_1',
    });

    const raffleInResults = data.find(m => m.mission_id === mission.id);
    expect(raffleInResults).toBeDefined();
  });
});
```

### Manual Verification Steps

1. [ ] Create raffle mission in database
2. [ ] Have test user participate
3. [ ] Set test user as loser (`is_winner = FALSE`, `redemption.status = 'rejected'`)
4. [ ] Log in as test user, navigate to Missions page
5. [ ] Verify lost raffle does NOT appear
6. [ ] Navigate to Mission History
7. [ ] Verify lost raffle DOES appear with "Better luck next time"

### Verification Commands

```bash
# Apply migration (Supabase CLI)
supabase db push

# Or via Supabase Dashboard:
# SQL Editor > Run migration SQL

# Verify RPC updated
supabase db query "SELECT prosrc FROM pg_proc WHERE proname = 'get_available_missions';"

# Test locally
cd appcode && npm run dev
# Navigate to /missions as a raffle loser
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read `appcode/lib/services/missionService.ts` lines 854-901 (listAvailableMissions)
- [ ] Verify current RPC in Supabase dashboard matches baseline (line 503)
- [ ] Identify test user who lost a raffle (user_id: `60bd09f9-2b05-4585-8c7a-68d583c9fb43`)

### Implementation Steps
- [ ] **Step 1:** Add service-level filter (defense in depth)
  - File: `appcode/lib/services/missionService.ts`
  - Change: Add filter after line 874 to exclude `isWinner === false`
  - Change: Update lines 879 and 887 to use `filteredMissions`
- [ ] **Step 2:** Create RPC migration file
  - File: `supabase/migrations/[timestamp]_fix_raffle_loser_visibility.sql`
  - Change: Add `is_winner` filter to raffle_participations JOIN
  - Change: Add NOT EXISTS clause to exclude missions where user lost
- [ ] **Step 3:** Apply migration to Supabase
  - Run: `supabase db push` or execute in SQL Editor
- [ ] **Step 4:** Verify migration applied
  - Query: Check RPC function definition in pg_proc

### Post-Implementation
- [ ] Verify type checker still passes: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Log in as raffle loser, verify mission not shown
- [ ] Verify history still shows lost raffle

### Deployment Notes (Vercel + Supabase)

**Deployment Order (IMPORTANT):**

1. **FIRST:** Deploy service filter (git push → Vercel auto-deploys)
   - File: `appcode/lib/services/missionService.ts`
   - This provides immediate protection even before RPC is updated

2. **SECOND:** Apply RPC migration (Supabase dashboard or CLI)
   - File: `supabase/migrations/[timestamp]_fix_raffle_loser_visibility.sql`
   - This is an optimization (reduces data transfer), not critical path

**Why this order is safe:**
- Service filter works immediately as defense in depth
- If RPC migration is delayed, losers are still filtered at service layer
- No transient regression window - service filter catches all cases

**Other Data Consumers (verified safe):**

| Endpoint | Data Source | Impact |
|----------|-------------|--------|
| `GET /api/missions` | `listAvailableMissions()` | ✅ Protected by both layers |
| `GET /api/missions/history` | `getMissionHistory()` | ❌ Intentionally shows losers (correct) |
| `GET /api/dashboard` | `get_dashboard_data` RPC | ❌ Different RPC, no mission list |

No other consumers of `listAvailableMissions()` identified.

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | No directly related tasks | This is a discovered bug, not part of planned work |

### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix outside of planned tasks.

### New Tasks Created (if any)
- [ ] Consider adding admin select-winner API endpoint (documented in ADMIN_API_CONTRACTS.md but not implemented)

---

## 18. Definition of Done

- [ ] Service-level filter added in `missionService.ts`
- [ ] Migration file created with updated RPC function
- [ ] Migration applied to Supabase (staging then production)
- [ ] No type errors in codebase
- [ ] All existing tests pass
- [ ] New test for raffle loser visibility added
- [ ] Build completes successfully
- [ ] Manual verification: loser doesn't see raffle on Missions page
- [ ] Manual verification: loser sees raffle in Mission History
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Full Path | Relevant Sections | Purpose |
|----------|-----------|-------------------|---------|
| `missionService.ts` | `appcode/lib/services/missionService.ts` | `computeStatus()`, `listAvailableMissions()` | Service layer handling of raffle status |
| `baseline.sql` | `supabase/migrations/00000000000000_baseline.sql` | `get_available_missions` function | Current RPC implementation showing missing filter |
| `ADMIN_API_CONTRACTS.md` | `Rumi/ADMIN_API_CONTRACTS.md` | POST /api/admin/missions/raffle/:id/select-winner | Documents expected winner selection flow |
| `SchemaFinalv2.md` | `Rumi/SchemaFinalv2.md` | raffle_participations table | Schema for is_winner column semantics |
| `raffle-winner-selection.test.ts` | `appcode/tests/integration/missions/raffle-winner-selection.test.ts` | All tests | Expected behavior for winner/loser handling |
| `API_CONTRACTS.md` | `Rumi/API_CONTRACTS.md` | GET /api/missions Response | API contract for missions endpoint |
| `MISSIONS_IMPL.md` | `Rumi/repodocs/MISSIONS_IMPL.md` | Status Computation, raffle flows | Reference documentation for mission status logic |

### Reading Order for External Auditor

1. **First:** `Rumi/SchemaFinalv2.md` - raffle_participations table - Understand `is_winner` column semantics
2. **Second:** `appcode/lib/services/missionService.ts` - `computeStatus()` lines 375-428 - See how status is derived
3. **Third:** `supabase/migrations/00000000000000_baseline.sql` - `get_available_missions` - See current RPC with missing filter
4. **Fourth:** `Rumi/ADMIN_API_CONTRACTS.md` - select-winner endpoint - Understand winner selection flow
5. **Fifth:** This document - Proposed fix and implementation plan

---

**Document Version:** 1.2
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Analysis Complete
**Audit Status:** Approved with changes (v1.1: service filter + full paths; v1.2: deployment notes)
