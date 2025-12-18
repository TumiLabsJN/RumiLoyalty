# Featured Mission Not Updating After Claim - Fix Documentation

**Bug ID:** BUG-003-FeaturedMissionPostClaim
**Created:** 2025-12-17
**Status:** Audit Approved
**Severity:** Medium
**Related Tasks:** GAP-001 (Home Page Reward Claim Flow), BUG-002 (Claim Progress ID Lookup)
**Linked Bugs:** Discovered during BUG-002 testing; Related: BUG-004 (Section 5 Fulfillment Query - same class of bug)

---

## Severity Justification

**Medium** - Feature degraded, workaround exists. After claiming a mission reward, the Home page continues showing the same "completed" mission instead of moving to the next one. User can navigate to Missions page to see correct state. Core functionality works (claim succeeds), but UX is confusing.

---

### 1. Project Context

This is a **TikTok Shop affiliate loyalty platform** built with **Next.js 14, TypeScript, Supabase, and PostgreSQL**. The system allows content creators to earn rewards by completing missions and claiming rewards.

The bug affects the **Home page featured mission display** after a user claims a reward. The dashboard RPC function selects the "featured mission" to show, but its filter logic doesn't account for claimed rewards, causing the same mission to be re-displayed after claiming.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Supabase RPC → Repository → Service → Route layers

---

### 1.1 Critical: Status Enum Distinction

**⚠️ Two different tables have `status` columns with DIFFERENT valid values:**

| Table | Column | Valid Values | Tracks |
|-------|--------|--------------|--------|
| `mission_progress` | `status` | `active`, `dormant`, `completed` | Progress toward goal |
| `redemptions` | `status` | `claimable`, `claimed`, `fulfilled`, `concluded`, `rejected` | Claim lifecycle |

**Key insight:** The current buggy filter checks `mission_progress.status NOT IN ('claimed', 'fulfilled')`, but **'claimed' and 'fulfilled' are NOT valid mission_progress values**. This filter is effectively a no-op - it always passes for any valid mission_progress.status.

---

### 2. Bug Summary

**What's happening:** After a user successfully claims a mission reward (toast confirms success, Missions page shows correct "pending" status), the Home page still displays the same completed mission instead of moving to the next available mission.

**What should happen:** After claiming a reward, the Home page should display either:
1. The next unclaimed completed mission, OR
2. An in-progress mission, OR
3. "No missions" state if all are claimed

**Impact:**
- Confusing UX - users see "Claim" button for already-claimed rewards
- Users may attempt to re-claim, receiving error messages
- Perception that the claim didn't work despite success toast

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `supabase/migrations/20251217120000_get_dashboard_data.sql` | Section 4: Featured Mission Query (lines 75-125) | Filter at line 113: `mp.status NOT IN ('claimed', 'fulfilled')` checks mission_progress.status but NOT redemption.status |
| `supabase/migrations/20251217120000_get_dashboard_data.sql` | Lines 99-107 | Query JOINs mission_progress but does NOT JOIN redemptions table |
| `lib/services/missionService.ts` | `claimMissionReward` function | Updates `redemption.status` to 'claimed' but does NOT update `mission_progress.status` |
| `lib/repositories/missionRepository.ts` | `claimReward` function | Confirms only redemptions table is updated during claim |
| `SchemaFinalv2.md` | "mission_progress Table" (Section 2.2, lines 436) | `status` column options: 'active', 'dormant', 'completed' - note: no 'claimed' status defined |
| `SchemaFinalv2.md` | "redemptions Table" (line 604) | `status` column tracks claim state: 'claimable', 'claimed', 'fulfilled', 'concluded', 'rejected' |
| `API_CONTRACTS.md` | "POST /api/missions/:id/claim Backend Validation" (line 3786) | Step 5: "Update redemptions.status from 'claimable' → 'claimed'" - confirms only redemption is updated |
| Direct DB query during testing | mission_progress + redemptions join | After claiming: mission_progress.status='completed', redemption.status='claimed' |

### Key Evidence

**Evidence 1:** RPC filter doesn't check redemption status
- Source: `get_dashboard_data.sql`, Line 113
- Quote: `AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))`
- Implication: Only checks mission_progress.status, not redemption.status. Claimed missions pass this filter.

**Evidence 2:** No JOIN to redemptions table in featured mission query
- Source: `get_dashboard_data.sql`, Lines 99-107
- Quote: JOINs only `missions`, `rewards`, `tiers`, `mission_progress`, `raffle_participations`
- Implication: Cannot filter by redemption.status because table isn't joined

**Evidence 3:** Claim flow only updates redemption, not mission_progress
- Source: `missionService.ts`, `claimMissionReward` function
- Observed: After claiming, mission_progress.status stays 'completed' while redemption.status becomes 'claimed'
- Implication: The filter `mp.status NOT IN ('claimed')` never triggers because mission_progress.status is never 'claimed'

**Evidence 4:** Direct observation during testing
- Source: Manual test after BUG-002 fix
- Steps: User claimed gift card reward → Toast showed success → Missions tab showed "pending" → Home page still showed same mission
- Query result:
  ```json
  {
    "progress_id": "ada0251c-cf31-4a0f-94a9-5fafbb40bf2c",
    "progress_status": "completed",  // Still 'completed'!
    "redemption_status": "claimed"   // Changed to 'claimed'
  }
  ```

**Evidence 5:** Schema confirms mission_progress.status doesn't have 'claimed' value
- Source: SchemaFinalv2.md, mission_progress table definition
- Quote: `status VARCHAR(50) DEFAULT 'active'` with options: 'active', 'dormant', 'completed'
- Implication: The filter checking for 'claimed' in mission_progress.status will never match

---

### 4. Root Cause Analysis

**Root Cause:** The `get_dashboard_data` RPC function's featured mission query filters by `mission_progress.status` to exclude claimed missions, but the claim flow only updates `redemption.status`, not `mission_progress.status`. Additionally, `mission_progress.status` doesn't even have a 'claimed' value in its enum.

**Contributing Factors:**
1. **Schema design mismatch**: `mission_progress.status` tracks progress (active/completed), while `redemption.status` tracks claim state (claimable/claimed). The RPC tries to filter claim state using the wrong column.
2. **Missing JOIN**: The featured mission query doesn't join the `redemptions` table, so it cannot access `redemption.status`.
3. **Filter logic error**: Line 113 checks `mp.status NOT IN ('claimed', 'fulfilled')` but mission_progress.status never equals 'claimed'.

**How it was introduced:** The RPC function was written with the assumption that mission_progress.status would be updated to 'claimed' after claiming, but the actual claim flow only updates redemption.status. The two systems have different status models that weren't reconciled.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Confusing - claimed mission still shows "Claim" button | **Medium** |
| User trust | May think claim failed despite success toast | **Medium** |
| Support load | Users may contact support about "stuck" missions | Low |
| Data integrity | None - data is correct, only display is wrong | None |

**Business Risk Summary:** Users will be confused by the inconsistent state between Home page (showing "Claim") and Missions page (showing "Pending"). While the claim actually succeeded, the poor UX may erode trust and generate support tickets.

---

### 6. Current State

#### Current File(s)

**File:** `supabase/migrations/20251217120000_get_dashboard_data.sql`
```sql
-- Lines 75-125: Featured mission selection query
-- 4. Get featured mission (highest priority, not claimed)
SELECT
  m.id AS mission_id,
  m.mission_type,
  -- ... other columns ...
  mp.status AS progress_status,
  -- ... more columns ...
INTO v_featured_mission
FROM missions m
INNER JOIN rewards r ON m.reward_id = r.id
LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
LEFT JOIN mission_progress mp ON m.id = mp.mission_id
  AND mp.user_id = p_user_id
  AND mp.client_id = p_client_id
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
  AND rp.user_id = p_user_id
  AND rp.client_id = p_client_id
  AND m.mission_type = 'raffle'
WHERE m.client_id = p_client_id
  AND m.enabled = true
  AND (m.tier_eligibility = v_current_tier.tier_id OR m.tier_eligibility = 'all')
  AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
  AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))  -- ❌ BUG: Wrong column!
  AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
ORDER BY
  -- ... priority ordering ...
LIMIT 1;
```

**Current Behavior:**
1. User completes mission → `mission_progress.status = 'completed'`
2. Redemption created → `redemption.status = 'claimable'`
3. User claims reward → `redemption.status = 'claimed'`, `mission_progress.status` unchanged
4. Home page reloads → RPC checks `mp.status NOT IN ('claimed')` → 'completed' passes → Same mission selected
5. User sees same "Claim" button for already-claimed reward

#### Current Data Flow

```
User Claims Reward
    ↓
redemption.status: 'claimable' → 'claimed' ✓
mission_progress.status: 'completed' → 'completed' (unchanged)
    ↓
Home Page Reload
    ↓
RPC Query: mp.status NOT IN ('claimed', 'fulfilled')
    ↓
'completed' NOT IN ('claimed', 'fulfilled') = TRUE ✓
    ↓
❌ Same mission selected (should be excluded)
```

---

### 7. Proposed Fix

#### Approach

Add a LEFT JOIN to the `redemptions` table and modify the filter to check `redemption.status` instead of (or in addition to) `mission_progress.status`.

#### Changes Required

**File:** `supabase/migrations/[NEW]_fix_featured_mission_claimed_filter.sql`

**Add JOIN (after line 107):**
```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id
  AND red.deleted_at IS NULL
```

**Replace filter (line 113):**

**Before:**
```sql
AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))
```

**After (SIMPLIFIED):**
```sql
AND (red.id IS NULL OR red.status = 'claimable')
```

**Explanation:**
- `red.id IS NULL`: No redemption exists → mission is in progress (active/dormant) or not started → **Show**
- `red.status = 'claimable'`: Completed mission with unclaimed reward → **Show**
- Any other redemption status ('claimed', 'fulfilled', 'concluded', 'rejected') → **Hide**

**Case-by-case analysis:**

| Mission State | `red.id IS NULL` | `red.status = 'claimable'` | Result |
|--------------|------------------|---------------------------|--------|
| No progress record | TRUE | - | ✅ Show |
| Active (in progress) | TRUE | - | ✅ Show |
| Dormant (paused) | TRUE | - | ✅ Show |
| Completed + claimable | FALSE | TRUE | ✅ Show |
| Completed + claimed | FALSE | FALSE | ❌ Hide (THE FIX) |
| Completed + fulfilled | FALSE | FALSE | ❌ Hide |
| Completed + concluded | FALSE | FALSE | ❌ Hide |
| Raffle loser (rejected) | FALSE | FALSE | ❌ Hide |

**Note on dormant missions:** Dormant missions (e.g., raffles with `activated=false`) have NO redemption record, so `red.id IS NULL = TRUE` and they remain visible. **No behavior change for dormant missions.**

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[NEW]_fix_featured_mission_claimed_filter.sql` | CREATE | New migration to update RPC function |
| `supabase/migrations/20251217120000_get_dashboard_data.sql` | REFERENCE | Original file, not modified directly (migrations are append-only) |

### Dependency Graph

```
get_dashboard_data RPC function
├── called by: dashboardRepository.ts
├── affects: Home page featured mission display
└── no breaking changes to API contract
```

---

### 9. Data Flow Analysis

#### Before Fix

```
RPC Query
    ↓
Filter: mp.status NOT IN ('claimed', 'fulfilled')
    ↓
'completed' passes filter ✓
    ↓
❌ Claimed mission selected
```

#### After Fix

```
RPC Query
    ↓
JOIN redemptions table
    ↓
Filter: red.id IS NULL OR red.status = 'claimable'
    ↓
red.status = 'claimed' → red.id IS NOT NULL AND red.status != 'claimable' → FALSE
    ↓
✅ Next available mission selected
```

#### Data Transformation Steps

1. **JOIN redemptions**: Link mission_progress to its redemption record via `mp.id = red.mission_progress_id`
2. **Apply simplified filter**: `AND (red.id IS NULL OR red.status = 'claimable')`
3. **Result**: Active/dormant missions (no redemption) pass; completed+claimable pass; claimed/fulfilled/concluded filtered out
4. **Select next mission**: ORDER BY priority returns the next unclaimed mission

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
[Home Page Load] (page.tsx)
│
├─► fetch('/api/dashboard')
│
├─► dashboardRepository.getDashboardDataRPC()
│   └── Calls: supabase.rpc('get_dashboard_data')
│
├─► get_dashboard_data() (PostgreSQL RPC)
│   ├── Section 4: Featured mission query
│   └── ⚠️ BUG IS HERE: Filter doesn't check redemption.status
│
└─► Returns featuredMission to frontend
    └── Home page displays (incorrectly) claimed mission
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `get_dashboard_data` RPC | Bug location - filter logic error |
| Database | `redemptions` table | Not joined, so status can't be checked |
| Repository | `dashboardRepository.ts` | Passes through RPC result (no bug here) |
| Service | `dashboardService.ts` | Processes RPC result (no bug here) |
| Frontend | `home-client.tsx` | Displays whatever backend returns (no bug here) |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `mission_progress` | `id`, `status` | status: 'active', 'dormant', 'completed' |
| `redemptions` | `id`, `mission_progress_id`, `status` | status: 'claimable', 'claimed', 'fulfilled', etc. |
| `missions` | `id`, `enabled`, `tier_eligibility` | Already joined in query |

#### Schema Check

```sql
-- Verify redemptions can be joined to mission_progress
SELECT
  mp.id AS progress_id,
  mp.status AS progress_status,
  red.status AS redemption_status
FROM mission_progress mp
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
WHERE mp.user_id = 'a05f5d26-2d93-4156-af86-70a88604c7d8';
```

#### Data Migration Required?
- [x] No - only RPC function logic changes, no data migration needed

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| HomeClient | `app/home/home-client.tsx` | None - displays whatever backend returns |
| Dashboard API | `app/api/dashboard/route.ts` | None - passes through service result |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `featuredMission` | Returns claimed missions | Excludes claimed missions | No (behavior fix) |

### Frontend Changes Required?
- [x] No - frontend already handles all mission states correctly

---

### 13. Alternative Solutions Considered

#### Option A: Update mission_progress.status on claim
- **Description:** Modify claim flow to set `mission_progress.status = 'claimed'` when user claims
- **Pros:** Would make existing RPC filter work
- **Cons:** Requires schema change (add 'claimed' to mission_progress.status enum), changes data model semantics
- **Verdict:** ❌ Rejected - mission_progress tracks progress state, not claim state

#### Option B: Add redemptions JOIN to RPC (Selected)
- **Description:** JOIN redemptions table and filter by `redemption.status`
- **Pros:** Uses correct data source for claim state, minimal change, no schema changes
- **Cons:** Slightly more complex query
- **Verdict:** ✅ Selected - correct separation of concerns, uses authoritative source

#### Option C: Subquery instead of JOIN
- **Description:** Use NOT EXISTS subquery to check redemption status
- **Pros:** Avoids JOIN complexity
- **Cons:** Potentially slower, harder to read
- **Verdict:** ❌ Rejected - JOIN is cleaner and standard pattern

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Query performance regression | Low | Low | redemptions JOIN uses indexed FK; test with EXPLAIN ANALYZE |
| Breaking existing behavior | Low | Medium | Filter logic is additive (more restrictive), won't show wrong missions |
| Edge case: No redemption record | Low | Low | Handle with `red.id IS NULL OR red.status = 'claimable'` |
| Dormant missions hidden | None | - | No change - dormant missions have no redemption, so `red.id IS NULL = TRUE` |

#### Index Verification (from audit)

**Existing index:**
```sql
CREATE UNIQUE INDEX "idx_redemptions_unique_mission" ON "public"."redemptions"
  USING "btree" ("user_id", "mission_progress_id")
  WHERE ("mission_progress_id" IS NOT NULL);
```

**JOIN conditions:**
```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id
  AND red.deleted_at IS NULL
```

**Analysis:** Index covers `user_id` and `mission_progress_id`. The `client_id` and `deleted_at` filters add minor overhead but are necessary for security and correctness. Run EXPLAIN ANALYZE to verify acceptable performance.

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response shape unchanged, just better data |
| Database | No | RPC signature unchanged |
| Frontend | No | No changes needed |

---

### 15. Testing Strategy

#### Unit Tests

**File:** Manual SQL test in Supabase
```sql
-- Test: Claimed mission should NOT be returned
-- Setup: User with claimed mission (redemption.status = 'claimed')

SELECT * FROM get_dashboard_data(
  'a05f5d26-2d93-4156-af86-70a88604c7d8'::UUID,
  '[client-id]'::UUID
);

-- Expected: featuredMission should NOT be the claimed mission
-- Expected: featuredMission should be next available mission or NULL
```

#### Integration Tests

```typescript
describe('Dashboard Featured Mission', () => {
  it('should not return claimed missions', async () => {
    // Setup: Create user with claimed mission
    // Act: Call dashboard API
    // Assert: featuredMission is NOT the claimed mission
  });

  it('should return next claimable mission after claim', async () => {
    // Setup: User with multiple completed missions, one claimed
    // Act: Call dashboard API
    // Assert: featuredMission is the unclaimed completed mission
  });
});
```

#### Manual Verification Steps

1. [ ] Log in as test user with completed mission
2. [ ] Verify Home page shows "Claim" button
3. [ ] Click "Claim" and verify success toast
4. [ ] Verify Home page now shows different mission (or "no missions")
5. [ ] Verify Missions page shows claimed mission as "Pending"

#### Verification Commands

```bash
# Apply migration
supabase db push

# Test RPC directly
supabase functions invoke get_dashboard_data --data '{"p_user_id": "...", "p_client_id": "..."}'

# Run app and test manually
npm run dev
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current RPC logic matches "Current State" section
- [ ] Confirm no other queries depend on this filter logic

#### Implementation Steps
- [ ] **Step 1:** Create new migration file
  - File: `supabase/migrations/[timestamp]_fix_featured_mission_claimed_filter.sql`
  - Change: CREATE OR REPLACE FUNCTION with updated query
- [ ] **Step 2:** Add LEFT JOIN to redemptions
  - Location: After line 107 in featured mission query
- [ ] **Step 3:** Update filter logic
  - Location: Line 113, replace mp.status check with redemption.status check
- [ ] **Step 4:** Apply migration
  - Command: `supabase db push` or apply via Supabase dashboard

#### Post-Implementation
- [ ] Run EXPLAIN ANALYZE on updated query to verify performance
- [ ] Test with user who has claimed mission
- [ ] Verify Home page shows next mission after claim
- [ ] Verify no regressions in other dashboard data

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| GAP-001 | Home Page Reward Claim Flow | UX degraded - claim works but display doesn't update |
| BUG-002 | Claim Progress ID Lookup | Prerequisite - claim must work for this bug to manifest |

#### Updates Required

**GAP-001:**
- Current Status: Claim works, but Home page doesn't refresh correctly
- Updated Status: Blocked by BUG-003 for complete UX flow
- Notes: Technical claim flow complete, UX flow incomplete

#### New Tasks Created
- [x] BUG-003: Fix featured mission query to exclude claimed missions
- [ ] BUG-004: Fix recent fulfillment query (Section 5) - same class of bug, tracked separately

---

### 17.1 Related Bug: BUG-004 (Out of Scope)

**During audit, a related bug was discovered in Section 5 of the same RPC:**

**Location:** `get_dashboard_data.sql` lines 140-143
```sql
AND mp.status = 'fulfilled'
```

**Problem:** This checks `mission_progress.status = 'fulfilled'`, but **'fulfilled' is NOT a valid mission_progress.status value**. This query returns **nothing ever**.

**Correct fix would be:** Check `redemption.status = 'fulfilled'` instead.

**Decision:** Track as separate BUG-004, out of scope for this fix. The recent fulfillment feature is lower priority than the featured mission display bug.

---

### 18. Definition of Done

- [ ] New migration file created with updated RPC function
- [ ] LEFT JOIN to redemptions added
- [ ] Filter logic updated to simplified: `AND (red.id IS NULL OR red.status = 'claimable')`
- [ ] Migration applied to database
- [ ] EXPLAIN ANALYZE run and documented (verify index usage)
- [ ] Manual test: Home page updates after claiming
- [ ] Manual test: Dormant missions still visible (no regression)
- [ ] No regressions in other dashboard data
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `get_dashboard_data.sql` | Section 4: Featured Mission Query (lines 75-125) | Bug location - current filter logic |
| `SchemaFinalv2.md` | "mission_progress Table", "redemptions Table" | Status column definitions |
| `API_CONTRACTS.md` | "POST /api/missions/:id/claim" | Confirms claim only updates redemption |
| `missionService.ts` | `claimMissionReward` function | Confirms claim flow behavior |

### Reading Order for External Auditor

1. **First:** `get_dashboard_data.sql` - Lines 113 - See the incorrect filter
2. **Second:** `SchemaFinalv2.md` - "redemptions Table" - Understand status flow
3. **Third:** `API_CONTRACTS.md` - "POST /api/missions/:id/claim" - Confirm what gets updated
4. **Fourth:** This document's Evidence section - See direct test results

---

### 20. Audit Trail

| Version | Date | Change | Auditor |
|---------|------|--------|---------|
| 1.0 | 2025-12-17 | Initial analysis | - |
| 1.1 | 2025-12-17 | Audit response: Added status enum distinction, simplified filter, dormant behavior confirmation, BUG-004 reference, index verification | User |

**Audit Decision:** APPROVE WITH CHANGES
- ✅ Status enum mismatch clarified (Section 1.1)
- ✅ Simplified filter validated with case analysis
- ✅ Dormant missions confirmed no behavior change
- ✅ BUG-004 (Section 5 fulfillment) tracked separately
- ✅ Index verification added to risk assessment

---

**Document Version:** 1.1
**Last Updated:** 2025-12-17
**Author:** Claude Code (Opus 4.5)
**Status:** Audit Approved - Ready for Implementation
