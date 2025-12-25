# Missed Raffle Visibility - Gap Documentation

**ID:** GAP-RAFFLE-001
**Type:** Feature Gap
**Created:** 2025-12-25
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Raffle Flow Enhancement
**Linked Issues:** BUG-RAFFLE-002 (Raffle Loser Visibility Fix - completed)

---

## 1. Project Context

This is a loyalty/rewards platform built for TikTok creators. Creators earn rewards by completing missions (sales targets, video posts) and participating in raffles. The platform supports multiple clients (multi-tenant) with tier-based eligibility (Bronze, Silver, Gold, Platinum).

Raffles are special missions where users "participate" for a chance to win prizes. An admin manually selects winners, and losers see a "Better luck next time" message in their mission history.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with RPC functions for atomic operations

---

## 2. Gap/Enhancement Summary

**What's missing:** When a raffle winner is selected, users who were eligible but didn't participate can still see and join the raffle. Late participants get stuck in "Waiting for draw" forever since the winner was already selected.

**What should exist:**
1. Block participation after winner is selected
2. Show closed raffles in mission history for non-participants with "Missed Raffle" UI (FOMO effect)
3. Hide closed raffles from available missions for non-participants

**Why it matters:**
- Users stuck in "Waiting for draw" creates confusion and support tickets
- Showing "Missed Raffle" in history creates FOMO, encouraging future participation
- Current state allows participation in already-concluded raffles (data integrity issue)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `/home/jorge/Loyalty/Rumi/MissionsRewardsFlows.md` | Step 3: Admin picks winner | Documents winner/loser state changes but no handling for non-participants |
| `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` | Section 2.8: raffle_participations table (lines 894-953) | `UNIQUE(mission_id, user_id)` constraint exists, but no check for closed raffle |
| `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` | Section 2.4: redemptions table (lines 594-665) | Defines `status` as VARCHAR(50) with options: 'claimable', 'claimed', 'fulfilled', 'concluded', 'rejected' |
| `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` | Section 2.1: missions table (lines 362-420) | Defines column types: `display_name` VARCHAR(255), `mission_type` VARCHAR(50), `tier_eligibility` VARCHAR(50) |
| `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` | Mission History section (lines 3841-4049) | Response status enum is `'concluded' \| 'rejected_raffle'` - **needs `'missed_raffle'` added** |
| `supabase/migrations/20251216134900_raffle_participation_rls_fix.sql` | `raffle_create_participation` RPC | SECURITY DEFINER, explicit client_id filters, no check if winner already selected |
| `supabase/migrations/20251224_fix_raffle_loser_visibility.sql` | `get_available_missions` RPC | SECURITY DEFINER, excludes losers (`is_winner = FALSE`) but not closed raffles for non-participants |
| `appcode/lib/services/missionService.ts` | `listMissionHistory()` (lines 1202-1257) | Status enum: `'concluded' \| 'rejected_raffle'`, history only includes records with redemptions |
| `appcode/app/missions/missionhistory/missionhistory-client.tsx` | Lines 117-139 | Has "Better luck next time" for `rejected_raffle` status but no "Missed" status |

### Key Evidence

**Evidence 1:** `raffle_create_participation` RPC allows participation without checking winner status
- Source: `supabase/migrations/20251216134900_raffle_participation_rls_fix.sql`, lines 80-92
- Implication: Users can participate after winner selected, creating orphaned "Waiting for draw" state

**Evidence 2:** `get_mission_history` RPC starts from `redemptions` table
- Source: Direct query of `pg_proc` for `get_mission_history`
- RPC prosrc: `FROM redemptions red...WHERE red.status IN ('concluded', 'rejected')`
- Implication: Non-participants have no redemption record, so they never appear in history

**Evidence 3:** API Contract status enum is limited
- Source: `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`, line 3874
- Current: `status: 'concluded' | 'rejected_raffle'`
- Implication: Must add `'missed_raffle'` to enum and update contract

---

## 4. Business Justification

**Business Need:** Prevent user confusion from stuck "Waiting for draw" states and create FOMO to drive future raffle participation.

**User Stories:**
1. As a creator, I should NOT be able to join a raffle after the winner was already selected, so I don't get stuck waiting forever
2. As a creator who missed a raffle, I want to see what I missed in my history so I'm motivated to participate next time (FOMO)
3. As an admin, I want the system to automatically handle late-comers so I don't get support tickets

**Impact if NOT implemented:**
- Users stuck in "Waiting for draw" forever create support burden
- Lost opportunity for FOMO-driven engagement
- Data integrity issues with orphaned participation records

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `supabase/migrations/20251216134900_raffle_participation_rls_fix.sql`
```sql
-- Current checks in raffle_create_participation RPC:
-- Check 1: Verify user belongs to client
-- Check 2: Verify mission is raffle, enabled, activated
-- Check 3: Verify user hasn't already participated
-- Check 4: Verify reward_id is provided
-- MISSING: Check if winner already selected

-- RPC is SECURITY DEFINER with explicit client_id filtering
```

**File:** `supabase/migrations/20251224_fix_raffle_loser_visibility.sql`
```sql
-- Current exclusion in get_available_missions:
AND NOT EXISTS (
  SELECT 1 FROM raffle_participations rp_check
  WHERE rp_check.mission_id = m.id
    AND rp_check.user_id = p_user_id
    AND rp_check.client_id = p_client_id
    AND rp_check.is_winner = FALSE
)
-- MISSING: Exclude closed raffles for non-participants

-- RPC is SECURITY DEFINER with explicit client_id filtering
```

**Current API Contract (line 3874):**
```typescript
// Status (only concluded or rejected)
status: 'concluded' | 'rejected_raffle'
// MISSING: 'missed_raffle' status
```

**Current Capability:**
- System CAN block users who already participated
- System CAN hide raffles from losers (`is_winner = FALSE`)
- System CANNOT block participation after winner selected
- System CANNOT show "missed raffles" in history for non-participants
- System CANNOT hide closed raffles from non-participants

#### Current Data Flow

```
User visits /missions
    ↓
get_available_missions RPC (SECURITY DEFINER)
    ↓
Returns raffle (even if winner selected and user didn't participate)
    ↓
User clicks "Participate"
    ↓
raffle_create_participation RPC (no winner check!)
    ↓
Creates records → User stuck in "Waiting for draw"
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach Selection: UNION vs Separate RPC

**Option A: UNION query in get_mission_history (Selected)**
- **Description:** Add UNION to existing RPC to include missed raffles with synthetic rows
- **Pros:** Single RPC call, consistent ordering, atomic response
- **Cons:** More complex query, must handle null fields carefully
- **Verdict:** ✅ Selected - simpler client integration, single data source

**Option B: Separate get_missed_raffles RPC**
- **Description:** Create new RPC, combine results in service layer
- **Pros:** Separation of concerns, easier to test in isolation
- **Cons:** Two RPC calls, complex merge logic, ordering challenges
- **Verdict:** ❌ Rejected - adds latency, merge complexity outweighs benefits

**Rationale:** The UNION approach is preferred because:
1. History page needs single sorted list (UNION ORDER BY handles this)
2. Service layer already transforms RPC results - minimal change
3. No additional network roundtrip
4. Consistent pattern with existing RPC design

---

#### RLS and Multi-Tenant Considerations

**All RPCs use SECURITY DEFINER pattern:**
- RPCs bypass Row-Level Security (RLS) policies
- Multi-tenant isolation enforced via explicit `client_id` in WHERE clauses
- All existing RPCs follow this pattern; new code maintains it

**Client ID Enforcement in Proposed Code:**

| Query/Check | client_id Filter | Location |
|-------------|------------------|----------|
| Check winner exists | `rp.client_id = p_client_id` | raffle_create_participation |
| Find closed raffles | `m.client_id = p_client_id` | get_available_missions |
| Find missed raffles | `m.client_id = p_client_id AND rp_winner.client_id = p_client_id` | get_mission_history |

**No new tables introduced** - all queries use existing tables with established RLS patterns.

---

#### API Contract Changes Required

**File:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`

**Current (line 3874):**
```typescript
status: 'concluded' | 'rejected_raffle'
```

**Proposed:**
```typescript
status: 'concluded' | 'rejected_raffle' | 'missed_raffle'
```

**New Status Semantics:**
| Status | Meaning | User Participated? | Has Redemption? |
|--------|---------|-------------------|-----------------|
| `concluded` | Reward fully delivered | Yes | Yes |
| `rejected_raffle` | Lost raffle (participated) | Yes | Yes (`status='rejected'`) |
| `missed_raffle` | Eligible but didn't participate | No | No (synthetic row) |

**Client Impact:**
- Additive change (new enum value)
- Existing clients ignore unknown status (graceful degradation)
- Frontend must add handling for `missed_raffle` card styling

---

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**Migration File:** `supabase/migrations/YYYYMMDD_missed_raffle_visibility.sql`

```sql
-- SPECIFICATION - TO BE IMPLEMENTED

-- =============================================
-- FIX 1: Block participation after winner selected
-- =============================================

CREATE OR REPLACE FUNCTION raffle_create_participation(
  p_mission_id UUID,
  p_user_id UUID,
  p_client_id UUID,
  p_reward_id UUID,
  p_tier_at_claim VARCHAR
) RETURNS TABLE (
  success BOOLEAN,
  participation_id UUID,
  redemption_id UUID,
  progress_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_progress_id UUID;
  v_redemption_id UUID;
  v_participation_id UUID;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- EXISTING CHECKS (1-4) remain unchanged...

  -- NEW CHECK 5: Verify winner not already selected
  -- Uses explicit client_id filter for multi-tenant isolation
  IF EXISTS (
    SELECT 1 FROM raffle_participations
    WHERE mission_id = p_mission_id
      AND client_id = p_client_id  -- Multi-tenant filter
      AND is_winner = TRUE
  ) THEN
    RETURN QUERY SELECT
      false AS success,
      NULL::UUID AS participation_id,
      NULL::UUID AS redemption_id,
      NULL::UUID AS progress_id,
      'This raffle has ended'::TEXT AS error_message;
    RETURN;
  END IF;

  -- REST OF FUNCTION unchanged...
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;


-- =============================================
-- FIX 2: Hide closed raffles from non-participants
-- =============================================

CREATE OR REPLACE FUNCTION get_available_missions(
  p_user_id UUID,
  p_client_id UUID,
  p_current_tier VARCHAR
) RETURNS TABLE (...) AS $$
  SELECT ...
  FROM missions m
  ...
  WHERE m.client_id = p_client_id  -- Multi-tenant filter
    AND (...)
    -- EXISTING: Exclude losers
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_check
      WHERE rp_check.mission_id = m.id
        AND rp_check.user_id = p_user_id
        AND rp_check.client_id = p_client_id  -- Multi-tenant filter
        AND rp_check.is_winner = FALSE
    )
    -- NEW: Exclude closed raffles where user didn't participate
    AND NOT (
      m.mission_type = 'raffle'
      AND EXISTS (
        SELECT 1 FROM raffle_participations rp_winner
        WHERE rp_winner.mission_id = m.id
          AND rp_winner.client_id = p_client_id  -- Multi-tenant filter
          AND rp_winner.is_winner = TRUE
      )
      AND NOT EXISTS (
        SELECT 1 FROM raffle_participations rp_user
        WHERE rp_user.mission_id = m.id
          AND rp_user.user_id = p_user_id
          AND rp_user.client_id = p_client_id  -- Multi-tenant filter
      )
    )
  ORDER BY m.display_order ASC;
$$;


-- =============================================
-- FIX 3: Include missed raffles in mission history
-- Schema-aligned column types with explicit casts
-- =============================================

CREATE OR REPLACE FUNCTION get_mission_history(
  p_user_id UUID,
  p_client_id UUID
) RETURNS TABLE (
  redemption_id UUID,
  redemption_status VARCHAR(50),  -- Per SchemaFinalv2.md Section 2.4
  claimed_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  concluded_at TIMESTAMP,
  rejected_at TIMESTAMP,
  mission_id UUID,
  mission_type VARCHAR(50),       -- Per SchemaFinalv2.md Section 2.1
  mission_display_name VARCHAR(255),  -- Per SchemaFinalv2.md Section 2.1
  reward_id UUID,
  reward_type VARCHAR(50),
  reward_name VARCHAR(255),
  reward_description TEXT,
  reward_value_data JSONB,
  reward_source VARCHAR(50),
  completed_at TIMESTAMP,
  raffle_is_winner BOOLEAN,       -- Per SchemaFinalv2.md Section 2.8
  raffle_participated_at TIMESTAMP,
  raffle_winner_selected_at TIMESTAMP,
  is_missed BOOLEAN               -- NEW: Flag for missed raffles
) AS $$
  -- EXISTING query for concluded/rejected redemptions
  SELECT
    red.id::UUID AS redemption_id,
    red.status::VARCHAR(50) AS redemption_status,
    red.claimed_at::TIMESTAMP,
    red.fulfilled_at::TIMESTAMP,
    red.concluded_at::TIMESTAMP,
    red.rejected_at::TIMESTAMP,
    m.id::UUID AS mission_id,
    m.mission_type::VARCHAR(50),
    m.display_name::VARCHAR(255) AS mission_display_name,
    r.id::UUID AS reward_id,
    r.type::VARCHAR(50) AS reward_type,
    r.name::VARCHAR(255) AS reward_name,
    r.description::TEXT AS reward_description,
    r.value_data::JSONB AS reward_value_data,
    r.reward_source::VARCHAR(50),
    mp.completed_at::TIMESTAMP,
    rp.is_winner::BOOLEAN AS raffle_is_winner,
    rp.participated_at::TIMESTAMP AS raffle_participated_at,
    rp.winner_selected_at::TIMESTAMP AS raffle_winner_selected_at,
    FALSE::BOOLEAN AS is_missed  -- User participated
  FROM redemptions red
  INNER JOIN mission_progress mp ON red.mission_progress_id = mp.id
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN raffle_participations rp ON mp.id = rp.mission_progress_id
    AND rp.user_id = p_user_id
  WHERE red.user_id = p_user_id
    AND red.client_id = p_client_id  -- Multi-tenant filter
    AND red.status IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
    AND red.mission_progress_id IS NOT NULL

  UNION ALL

  -- NEW: Missed raffles (user didn't participate, winner exists)
  -- Synthetic rows with NULL redemption fields
  SELECT
    NULL::UUID AS redemption_id,  -- No redemption exists
    'missed_raffle'::VARCHAR(50) AS redemption_status,  -- Must match MissionHistoryStatus type
    NULL::TIMESTAMP AS claimed_at,
    NULL::TIMESTAMP AS fulfilled_at,
    NULL::TIMESTAMP AS concluded_at,
    NULL::TIMESTAMP AS rejected_at,
    m.id::UUID AS mission_id,
    m.mission_type::VARCHAR(50),
    m.display_name::VARCHAR(255) AS mission_display_name,
    r.id::UUID AS reward_id,
    r.type::VARCHAR(50) AS reward_type,
    r.name::VARCHAR(255) AS reward_name,
    r.description::TEXT AS reward_description,
    r.value_data::JSONB AS reward_value_data,
    r.reward_source::VARCHAR(50),
    NULL::TIMESTAMP AS completed_at,
    NULL::BOOLEAN AS raffle_is_winner,  -- User didn't participate
    NULL::TIMESTAMP AS raffle_participated_at,
    rp_winner.winner_selected_at::TIMESTAMP AS raffle_winner_selected_at,
    TRUE::BOOLEAN AS is_missed  -- Flag: user missed this raffle
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  INNER JOIN raffle_participations rp_winner ON m.id = rp_winner.mission_id
    AND rp_winner.is_winner = TRUE
    AND rp_winner.client_id = p_client_id  -- Multi-tenant filter
  WHERE m.client_id = p_client_id  -- Multi-tenant filter
    AND m.mission_type = 'raffle'
    -- User tier was eligible at time of raffle
    AND (m.tier_eligibility = 'all' OR m.tier_eligibility = (
      SELECT current_tier FROM users WHERE id = p_user_id AND client_id = p_client_id
    ))
    -- User did NOT participate
    AND NOT EXISTS (
      SELECT 1 FROM raffle_participations rp_user
      WHERE rp_user.mission_id = m.id
        AND rp_user.user_id = p_user_id
        AND rp_user.client_id = p_client_id  -- Multi-tenant filter
    )

  ORDER BY COALESCE(concluded_at, rejected_at, raffle_winner_selected_at) DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
```

**Explanation:**
- Fix 1 prevents late participation with clear error message
- Fix 2 hides closed raffles from non-participants in available missions
- Fix 3 adds missed raffles to history via UNION query with explicit type casts per SchemaFinalv2.md
- All queries include explicit `client_id` filters for multi-tenant isolation
- RPCs use `SECURITY DEFINER` pattern (bypasses RLS, enforces isolation in WHERE clauses)

---

#### New Types/Interfaces

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// File: appcode/lib/types/missions.ts

// UPDATED: Add new status to MissionHistoryStatus
export type MissionHistoryStatus = 'concluded' | 'rejected_raffle' | 'missed_raffle';

// File: appcode/lib/types/rpc.ts

// UPDATED: Add is_missed to GetMissionHistoryRow
export interface GetMissionHistoryRow {
  // ... existing fields
  is_missed: boolean;  // NEW: True if user was eligible but didn't participate
}
```

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDD_missed_raffle_visibility.sql` | CREATE | New migration with all 3 RPC fixes |
| `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` | MODIFY | Add `missed_raffle` to status enum (line 3874) |
| `appcode/lib/types/missions.ts` | MODIFY | Add `missed_raffle` to `MissionHistoryStatus` |
| `appcode/lib/types/rpc.ts` | MODIFY | Add `is_missed` column to `GetMissionHistoryRow` |
| `appcode/lib/repositories/missionRepository.ts` | MODIFY | Map `is_missed` field from RPC response |
| `appcode/lib/services/missionService.ts` | MODIFY | Handle `missed_raffle` status in `listMissionHistory()` |
| `appcode/app/missions/missionhistory/missionhistory-client.tsx` | MODIFY | Add UI for `missed_raffle` status card |

#### Dependency Graph

```
supabase/migrations/YYYYMMDD_missed_raffle_visibility.sql (TO BE CREATED)
├── modifies: raffle_create_participation RPC
├── modifies: get_available_missions RPC
└── modifies: get_mission_history RPC (adds is_missed column)

API_CONTRACTS.md
└── updates: MissionHistoryResponse.status enum

appcode/lib/types/rpc.ts
└── adds: is_missed to GetMissionHistoryRow

appcode/lib/repositories/missionRepository.ts
├── imports from: types/rpc.ts
└── maps: is_missed field to isMissed

appcode/lib/services/missionService.ts
├── imports from: missionRepository.ts
└── handles: missed_raffle status (is_missed=true → status='missed_raffle')

appcode/app/missions/missionhistory/missionhistory-client.tsx
└── renders: missed_raffle UI card ("Missed Raffle Participation")
```

---

## 8. Data Flow After Implementation

```
SCENARIO A: User tries to join closed raffle
User clicks Participate → raffle_create_participation RPC
    ↓
Check 5: Winner exists for this client_id? → YES
    ↓
Return error: "This raffle has ended"

SCENARIO B: User views available missions
get_available_missions RPC (SECURITY DEFINER)
    ↓
NEW filter: Closed raffle + user didn't participate + same client_id?
    ↓
Exclude from results → User doesn't see closed raffle

SCENARIO C: User views mission history
get_mission_history RPC (SECURITY DEFINER)
    ↓
UNION: Regular history + Missed raffles (explicit type casts)
    ↓
Repository: Map is_missed field
    ↓
Service layer: is_missed=true → status='missed_raffle'
    ↓
UI: Render "Missed Raffle Participation" card with FOMO styling
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage | Schema Reference |
|-------|---------|-------|------------------|
| `raffle_participations` | `mission_id`, `user_id`, `client_id`, `is_winner` | Check if winner exists, check if user participated | Section 2.8 (lines 894-953) |
| `missions` | `id`, `mission_type`, `tier_eligibility`, `display_name` | Find eligible missed raffles | Section 2.1 (lines 362-420) |
| `rewards` | `id`, `type`, `name`, `value_data`, `reward_source` | Prize info for missed raffle display | Section 2.3 |
| `users` | `id`, `current_tier`, `client_id` | Check tier eligibility for missed raffles | Section 1.2 |
| `redemptions` | `id`, `status`, `claimed_at`, etc. | Existing history records | Section 2.4 (lines 594-665) |

#### Schema Changes Required?
- [ ] Yes - [describe migration needed]
- [x] No - existing schema supports this feature (only RPC changes)

#### Multi-Tenant Considerations

| Query | client_id Filter Location | Verified |
|-------|---------------------------|----------|
| Check winner exists | `WHERE ... AND client_id = p_client_id` | [x] |
| Hide closed raffles | `WHERE rp_winner.client_id = p_client_id` | [x] |
| Find missed raffles (missions) | `WHERE m.client_id = p_client_id` | [x] |
| Find missed raffles (winner check) | `WHERE rp_winner.client_id = p_client_id` | [x] |
| Find missed raffles (user check) | `WHERE rp_user.client_id = p_client_id` | [x] |

**RLS Note:** All RPCs use `SECURITY DEFINER` which bypasses RLS. Multi-tenant isolation is enforced via explicit `client_id` filters in WHERE clauses, consistent with existing RPC patterns.

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `POST /api/missions/:id/participate` | MODIFY (error case) | No error for closed raffle | Returns `{ error: "This raffle has ended" }` |
| `GET /missions` (SSR) | MODIFY | Shows closed raffles to non-participants | Hides closed raffles from non-participants |
| `GET /missions/missionhistory` (SSR) | MODIFY | status: `'concluded' \| 'rejected_raffle'` | status: `'concluded' \| 'rejected_raffle' \| 'missed_raffle'` |

#### Breaking Changes?
- [ ] Yes - [migration path for consumers]
- [x] No - additive changes only (new error case, new enum value in history status)

**Client Compatibility:**
- New `missed_raffle` status is additive
- Existing clients that don't handle it will show default/unknown state (graceful degradation)
- Error response for closed raffle participation is new but follows existing error format

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Missed raffles per user | ~5-10 max | Yes |
| UNION query complexity | O(n) subqueries, indexed on mission_id, user_id, client_id | Yes |
| Additional index usage | Uses existing `idx_raffle_winner` index | Yes |
| Frequency | Per history page load | Yes |

#### Optimization Needed?
- [ ] Yes - [describe optimization]
- [x] No - acceptable for MVP (small number of raffles per client, existing indexes sufficient)

**Index Coverage:**
- `raffle_participations(mission_id, is_winner)` - for winner check
- `raffle_participations(mission_id, user_id, client_id)` - for participation check
- `missions(client_id, mission_type)` - for finding raffle missions

---

## 12. Alternative Solutions Considered

#### Option A: Create redemption records for all eligible users when winner selected
- **Description:** When admin selects winner, create `redemptions` with `status='rejected'` for all eligible non-participants
- **Pros:** Fits existing data model perfectly, no RPC changes for history
- **Cons:** Creates many records for users who may never check, expensive write operation, storage bloat
- **Verdict:** ❌ Rejected - too many records created, performance concern on winner selection

#### Option B: UNION query in get_mission_history RPC (Selected)
- **Description:** Add UNION to find closed raffles user was eligible for but didn't join
- **Pros:** No extra records, computed on-the-fly, minimal storage impact, single RPC call
- **Cons:** Synthetic rows with null redemption fields, must handle carefully in service layer
- **Verdict:** ✅ Selected - efficient, no data bloat, aligns with existing RPC patterns

#### Option C: Separate get_missed_raffles RPC
- **Description:** Create new dedicated RPC for missed raffles, merge in service layer
- **Pros:** Separation of concerns, easier to test in isolation, clean RPC signature
- **Cons:** Two RPC calls per history page, complex merge/sort logic, additional latency
- **Verdict:** ❌ Rejected - added complexity outweighs benefits, ordering challenges

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UNION query performance | Low | Medium | Existing indexes cover all query patterns |
| UI doesn't handle null fields | Medium | Low | Service layer provides defaults before passing to UI |
| Tier eligibility check incorrect | Low | Medium | Use same `tier_eligibility` logic as `get_available_missions` |
| Multi-tenant data leak | Low | High | All queries include explicit `client_id` filters; code review |
| Type mismatch in UNION | Low | Medium | Explicit type casts per SchemaFinalv2.md column definitions |

---

## 14. Testing Strategy

#### Unit Tests

**File:** `appcode/tests/unit/services/missionService.test.ts`
```typescript
describe('listMissionHistory - Missed Raffles', () => {
  it('should include missed raffles with status=missed_raffle', async () => {
    // Setup: Raffle with winner, user eligible but didn't participate
    // Assert: History includes missed raffle with status='missed_raffle'
  });

  it('should NOT include missed raffles where user was not tier-eligible', async () => {
    // Setup: Raffle for tier_3, user is tier_2
    // Assert: Raffle not in history
  });

  it('should handle null redemption fields for missed raffles', async () => {
    // Setup: Missed raffle
    // Assert: claimedAt, fulfilledAt, concludedAt are null, no errors
  });
});
```

#### Integration Tests

```typescript
describe('Missed Raffle Flow Integration', () => {
  it('should block participation after winner selected', async () => {
    // 1. Create raffle for client_id X, user A participates
    // 2. Select user A as winner
    // 3. User B (same client) tries to participate
    // 4. Assert: Returns error "This raffle has ended"
  });

  it('should not block participation for different client', async () => {
    // 1. Create raffle for client_id X, select winner
    // 2. User from client_id Y should not be affected
    // Assert: Multi-tenant isolation works
  });

  it('should show missed raffle in history', async () => {
    // 1. Create raffle, user A participates, user B does not
    // 2. Select user A as winner
    // 3. User B checks history
    // 4. Assert: Missed raffle appears with status='missed_raffle'
  });

  it('should hide closed raffle from available missions', async () => {
    // 1. Create raffle, select winner
    // 2. Non-participant checks available missions
    // Assert: Closed raffle not in list
  });
});
```

#### Manual Verification Steps

1. [ ] Create raffle for tier_2, have user A participate
2. [ ] Select user A as winner
3. [ ] As user B (tier_2), try to participate → should see "Raffle has ended" error
4. [ ] As user B, check available missions → closed raffle should NOT appear
5. [ ] As user B, check mission history → should see "Missed Raffle Participation" card
6. [ ] Verify card shows prize info and draw date
7. [ ] Test with different client_id → should not see other client's raffles

---

## 15. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing RPCs match "Current State" section
- [ ] Verify SchemaFinalv2.md column types match explicit casts
- [ ] Confirm no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Create migration file with RPC updates
  - File: `supabase/migrations/YYYYMMDD_missed_raffle_visibility.sql`
  - Action: CREATE
- [ ] **Step 2:** Update API_CONTRACTS.md
  - File: `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
  - Action: MODIFY - Add `missed_raffle` to status enum (line 3874)
- [ ] **Step 3:** Update TypeScript types
  - File: `appcode/lib/types/missions.ts`
  - Action: MODIFY - Add `missed_raffle` status
  - File: `appcode/lib/types/rpc.ts`
  - Action: MODIFY - Add `is_missed` to RPC row type
- [ ] **Step 4:** Update repository layer
  - File: `appcode/lib/repositories/missionRepository.ts`
  - Action: MODIFY - Map `is_missed` field
- [ ] **Step 5:** Update service layer
  - File: `appcode/lib/services/missionService.ts`
  - Action: MODIFY - Handle `missed_raffle` status
- [ ] **Step 6:** Update UI
  - File: `appcode/app/missions/missionhistory/missionhistory-client.tsx`
  - Action: MODIFY - Add missed raffle card styling and "Missed Raffle Participation" message

#### Post-Implementation
- [ ] Apply migration: `npx supabase db push`
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per checklist above
- [ ] Deploy to production
- [ ] Git commit with reference to GAP-RAFFLE-001

---

## 16. Definition of Done

- [ ] All RPC functions updated per "Proposed Solution" section
- [ ] API_CONTRACTS.md updated with new status enum
- [ ] All TypeScript types updated
- [ ] Repository and service layers handle new `is_missed` field
- [ ] UI displays "Missed Raffle Participation" with FOMO styling
- [ ] Participation blocked after winner selected with clear error
- [ ] Multi-tenant isolation verified (client_id in all queries)
- [ ] Type checker passes
- [ ] All tests pass (existing + new)
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` | Section 2.1 (missions), 2.4 (redemptions), 2.8 (raffle_participations) | Column types for explicit casts, constraints |
| `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md` | Mission History (lines 3841-4049) | Response schema, status enum |
| `/home/jorge/Loyalty/Rumi/MissionsRewardsFlows.md` | Raffle Flow Steps 0-4 | Understand raffle lifecycle |
| `supabase/migrations/20251216134900_raffle_participation_rls_fix.sql` | Full file | Current `raffle_create_participation` RPC |
| `supabase/migrations/20251224_fix_raffle_loser_visibility.sql` | Full file | Current `get_available_missions` RPC |
| `appcode/lib/services/missionService.ts` | `listMissionHistory()` (lines 1202-1257) | Current history transformation logic |
| `appcode/app/missions/missionhistory/missionhistory-client.tsx` | Lines 110-180 | Current history UI rendering |

---

**Document Version:** 1.2
**Last Updated:** 2025-12-25
**Author:** Claude Code
**Status:** Analysis Complete

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed with explicit documentation
- [x] API contract changes documented with enum addition
- [x] Performance considerations addressed
- [x] Schema alignment verified with explicit type casts
- [x] RLS/SECURITY DEFINER pattern documented
- [x] Alternative approaches compared (UNION vs separate RPC)
- [x] External auditor could implement from this document alone
