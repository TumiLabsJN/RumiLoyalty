# Mission Progress Row Creation - Gap Documentation

**ID:** GAP-MISSION-PROGRESS-ROWS
**Type:** Feature Gap
**Created:** 2025-12-12
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 8.2.2a, Task 8.2.3 from EXECUTION_PLAN.md
**Linked Issues:** BUG-MISSION-PROGRESS-UPDATE (depends on this gap being filled)

---

## 1. Project Context

This is a loyalty platform for TikTok Shop creators built with Next.js 14, TypeScript, and Supabase PostgreSQL. The system tracks creator metrics via daily CSV imports, manages missions with progress tracking, and rewards creators upon mission completion.

The gap affects the **mission progress row creation system** which should create `mission_progress` records for eligible users when missions are enabled/activated.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

## 2. Gap Summary

**What's missing:** No code exists to create `mission_progress` rows for users. The system assumes these rows exist but never creates them.

**What should exist:** Daily cron should create `mission_progress` rows for eligible users (based on tier eligibility) when missions are `enabled=true` and `activated=true`. These rows store `checkpoint_start` (snapshot of `tier_achieved_at`) and `checkpoint_end` (snapshot of `next_checkpoint_at`).

**Why it matters:** Without mission_progress rows:
1. `updateMissionProgress` RPC (BUG-MISSION-PROGRESS-UPDATE fix) has nothing to update
2. Users never see any missions in their dashboard
3. Mission completion and rewards are impossible

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| MissionsRewardsFlows.md | Step 0.5 | "System creates mission_progress rows (Daily cron at 2 PM EST)" |
| SchemaFinalv2.md | mission_progress table | `checkpoint_start` = "Snapshot of tier_achieved_at", `checkpoint_end` = "Snapshot of next_checkpoint_at" |
| EXECUTION_PLAN.md | Task 8.2.2a | Lists function (7) "updateMissionProgress" but NOT creation function |
| syncRepository.ts | Lines 337-344 | `updateMissionProgress` stub exists, no creation function |
| Loyalty.md | Flow 1 Step 5 | Shows UPDATE to mission_progress, assumes rows exist |

### Key Evidence

**Evidence 1:** MissionsRewardsFlows.md explicitly states row creation happens
- Source: MissionsRewardsFlows.md, Step 0.5
- Quote: "System creates mission_progress rows (Daily cron at 2 PM EST - see Loyalty.md Flow 1 Step 6)"
- Implication: This step was planned but never implemented

**Evidence 2:** Schema shows checkpoint fields are snapshots at creation time
- Source: SchemaFinalv2.md, mission_progress table
- Quote: "checkpoint_start | TIMESTAMP | Snapshot of tier_achieved_at | Never updated after creation"
- Implication: These values must be set when row is created, not updated later

**Evidence 3:** No creation function in codebase
- Source: grep search across appcode
- Finding: No `createMissionProgress`, `initializeMissionProgress`, or similar function exists
- Implication: The gap is complete - no code exists for this functionality

## 4. Business Justification

**Business Need:** Users need mission_progress rows to participate in missions and earn rewards.

**User Stories:**
1. As a creator, I need to see my mission progress so that I know how close I am to earning rewards
2. As a creator, I need missions to auto-complete so that I can claim my rewards

**Impact if NOT implemented:**
- All progress-based missions are non-functional
- Users see empty mission list or missions with no progress
- BUG-MISSION-PROGRESS-UPDATE fix is ineffective (nothing to update)
- Redemption creation for completed missions never triggers

## 5. Current State Analysis

### What Currently Exists

**File:** `syncRepository.ts`
```typescript
// Only UPDATE function exists (and it's a stub)
async updateMissionProgress(
  clientId: string,
  userIds: string[]
): Promise<number> {
  throw new Error('Not implemented - see Task 8.2.3');
},
```

**Current Capability:**
- Can UPDATE mission_progress rows IF they exist
- CANNOT create mission_progress rows (no function)
- CANNOT determine user eligibility for missions (no tier check)

### Current Data Flow

```
Daily Cron
  ↓
processDailySales()
  ↓
Step 6: updateMissionProgress() ← Tries to UPDATE rows
  ↓
FAILS: No rows exist to update
```

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Create a new function `createMissionProgressForEligibleUsers()` that:
1. Finds all enabled, activated missions
2. For each mission, finds users whose tier meets `tier_eligibility`
3. Creates `mission_progress` rows with checkpoint snapshots
4. Skips users who already have progress for that mission

### New Code to Create

**New File/Function:** `syncRepository.ts` - add function

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
/**
 * Create mission_progress rows for eligible users
 * Per MissionsRewardsFlows.md Step 0.5
 *
 * For each enabled+activated mission:
 * 1. Find users where current_tier >= mission.tier_eligibility
 * 2. Create mission_progress row with:
 *    - checkpoint_start = user.tier_achieved_at (snapshot)
 *    - checkpoint_end = user.next_checkpoint_at (snapshot)
 *    - status = 'active' (if activated) or 'dormant' (if not activated)
 *    - current_value = 0
 * 3. Skip users who already have progress for this mission
 *
 * SECURITY: Filters by client_id (multitenancy)
 */
async createMissionProgressForEligibleUsers(
  clientId: string
): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('create_mission_progress_for_eligible_users', {
    p_client_id: clientId,
  });

  if (error) {
    throw new Error(`Failed to create mission progress: ${error.message}`);
  }

  return data ?? 0;
}
```

### New RPC Function (SQL)

```sql
-- SPECIFICATION - TO BE IMPLEMENTED
CREATE OR REPLACE FUNCTION create_mission_progress_for_eligible_users(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_count INTEGER := 0;
BEGIN
  -- Create mission_progress for eligible users who don't have one yet
  -- Handles both tier-specific eligibility AND tier_eligibility='all'
  INSERT INTO mission_progress (
    client_id,
    mission_id,
    user_id,
    current_value,
    status,
    checkpoint_start,
    checkpoint_end,
    created_at,
    updated_at
  )
  SELECT
    p_client_id,
    m.id,
    u.id,
    0,
    CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
    u.tier_achieved_at,
    u.next_checkpoint_at,
    NOW(),
    NOW()
  FROM missions m
  CROSS JOIN users u
  LEFT JOIN tiers ut ON u.current_tier = ut.tier_id AND ut.client_id = p_client_id
  LEFT JOIN tiers mt ON m.tier_eligibility = mt.tier_id AND mt.client_id = p_client_id
  WHERE m.client_id = p_client_id
    AND u.client_id = p_client_id
    AND m.enabled = true
    AND (
      m.tier_eligibility = 'all'
      OR (ut.tier_order IS NOT NULL AND mt.tier_order IS NOT NULL AND ut.tier_order >= mt.tier_order)
    )
    AND NOT EXISTS (
      SELECT 1 FROM mission_progress mp
      WHERE mp.mission_id = m.id
        AND mp.user_id = u.id
        AND mp.client_id = p_client_id
    );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  RETURN v_created_count;
END;
$$;

GRANT EXECUTE ON FUNCTION create_mission_progress_for_eligible_users(UUID) TO service_role;
```

**Key SQL Logic:**
- `tier_eligibility = 'all'` → ALL users are eligible (no tier comparison needed)
- `tier_eligibility = 'tier_X'` → User's tier_order must be >= mission's tier_order
- `LEFT JOIN` on tiers handles the case where `tier_eligibility = 'all'` (won't find a matching tier)
- `NOT EXISTS` prevents duplicate rows for same user+mission pair

### New Types/Interfaces

No new types needed - uses existing `mission_progress` table schema.

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `lib/repositories/syncRepository.ts` | MODIFY | Add `createMissionProgressForEligibleUsers` function |
| `lib/services/salesService.ts` | MODIFY | Call creation BEFORE update in processDailySales |
| `supabase/migrations/` | CREATE | New migration for RPC function |

### Dependency Graph

```
salesService.ts
├── will call: createMissionProgressForEligibleUsers() (NEW)
└── then call: updateMissionProgress() (BUG-MISSION-PROGRESS-UPDATE)

syncRepository.ts (TO BE MODIFIED)
├── imports from: @/lib/supabase/admin-client
└── exports: createMissionProgressForEligibleUsers (NEW)

RPC: create_mission_progress_for_eligible_users (TO BE CREATED)
├── reads from: missions, users, tiers
└── writes to: mission_progress
```

## 8. Data Flow After Implementation

```
Daily Cron
  ↓
processDailySales()
  ↓
Step 5.5: createMissionProgressForEligibleUsers() ← NEW
  ↓
Creates rows for eligible users
  ↓
Step 6: updateMissionProgress() ← Now has rows to update
  ↓
Updates current_value based on videos
```

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| missions | id, client_id, tier_eligibility, enabled, activated | Find eligible missions |
| users | id, client_id, current_tier, tier_achieved_at, next_checkpoint_at | Find eligible users, snapshot checkpoint values |
| tiers | tier_id, tier_order, client_id | Compare tier eligibility |
| mission_progress | all columns | INSERT new rows |

### Schema Changes Required?
- [x] No - existing schema supports this feature

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| missions lookup | Yes | In spec |
| users lookup | Yes | In spec |
| tiers lookup | Yes | In spec |
| mission_progress insert | Yes | In spec |

## 10. Relationship to BUG-MISSION-PROGRESS-UPDATE

This gap MUST be filled BEFORE or ALONGSIDE BUG-MISSION-PROGRESS-UPDATE:

| Component | BUG-MISSION-PROGRESS-UPDATE | GAP-MISSION-PROGRESS-ROWS |
|-----------|----------------------------|---------------------------|
| Purpose | UPDATE current_value | CREATE rows |
| Depends on | Rows existing | Nothing |
| Order | Runs second | Runs first |

**Without this gap filled:** The BUG-MISSION-PROGRESS-UPDATE fix will update 0 rows because there's nothing to update.

## 11. Implementation Priority

**Recommended:** Implement this gap FIRST, then BUG-MISSION-PROGRESS-UPDATE, in sequence:

1. Create migration for `create_mission_progress_for_eligible_users` RPC
2. Add `createMissionProgressForEligibleUsers` to syncRepository
3. Update salesService to call creation before update
4. Apply BUG-MISSION-PROGRESS-UPDATE migration
5. Update syncRepository with updateMissionProgress RPC call

## 12. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

This is an internal cron function - no API contract changes.

### Breaking Changes?
- [x] No - additive changes only (new internal function)

## 13. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | missions × users (could be thousands) | Yes - daily batch |
| Query complexity | O(m×u) with NOT EXISTS optimization | Yes |
| Frequency | Once per day (cron) | Yes |

### Optimization Needed?
- [x] No - acceptable for MVP
- The `NOT EXISTS` clause ensures only new rows are created
- Index `idx_mission_progress_tenant` on `(client_id, user_id, status)` supports the query

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Duplicate rows created | Low | Medium | `NOT EXISTS` clause prevents duplicates |
| Large batch causes timeout | Low | Medium | Runs in daily cron with sufficient timeout |
| Wrong tier eligibility | Low | High | Test tier_eligibility='all' and tier-specific cases |
| NULL tier_order (invalid tier data) | Low | Low | Silent skip - see note below |

**Note on NULL tier_order behavior (per Codex audit):**
- If a user's `current_tier` has no matching row in `tiers` table → user silently skipped
- If a mission's `tier_eligibility` has no matching row in `tiers` table → mission silently skipped
- This is **acceptable behavior** - these are data integrity issues that shouldn't happen in production
- If users aren't getting mission_progress rows, investigate via SQL query on tiers table
- Silent skip is safer than failing the entire batch for one bad record

## 15. Testing Strategy

### Test Cases

1. **Eligible user gets row created**
   - Setup: User with tier_2, mission requires tier_1
   - Expected: mission_progress row created with status='active'

2. **Ineligible user skipped**
   - Setup: User with tier_1, mission requires tier_3
   - Expected: No row created

3. **Existing progress not duplicated**
   - Setup: User already has mission_progress for mission
   - Expected: No new row created (NOT EXISTS check)

4. **Checkpoint values snapshotted**
   - Setup: User with tier_achieved_at='2025-01-01', next_checkpoint_at='2025-04-01'
   - Expected: mission_progress.checkpoint_start='2025-01-01', checkpoint_end='2025-04-01'

5. **Status based on activated flag**
   - Setup: Mission with activated=false
   - Expected: status='dormant'
   - Setup: Mission with activated=true
   - Expected: status='active'

6. **tier_eligibility='all' creates rows for ALL users**
   - Setup: Mission with tier_eligibility='all', 3 users with different tiers
   - Expected: All 3 users get mission_progress rows

7. **Disabled missions skipped**
   - Setup: Mission with enabled=false
   - Expected: No rows created

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Create SQL migration file
  - File: `supabase/migrations/20251212_add_create_mission_progress_rpc.sql`
  - Action: CREATE
- [ ] **Step 1.5:** Regenerate Supabase RPC types (per Codex audit)
  - Command: `supabase gen types typescript --local > lib/types/database.ts`
  - Note: Skip if Supabase CLI not available - types regenerated after migration applied
- [ ] **Step 2:** Add function to syncRepository.ts
  - File: `lib/repositories/syncRepository.ts`
  - Action: MODIFY - Add `createMissionProgressForEligibleUsers` function
- [ ] **Step 3:** Update salesService.ts to call creation before update
  - File: `lib/services/salesService.ts`
  - Action: MODIFY - Add Step 5.5 call before Step 6

### Post-Implementation
- [ ] Run type checker (`npx tsc --noEmit`)
- [ ] Run build (`npm run build`)
- [ ] Apply migration to Supabase
- [ ] Manual verification
- [ ] Update this document status to "Implemented"

## 17. Definition of Done

- [ ] SQL migration created and applied
- [ ] Repository function added
- [ ] Service layer calls creation before update
- [ ] Type checker passes
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

## 18. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| MissionsRewardsFlows.md | Step 0.5 | Confirms row creation is planned |
| SchemaFinalv2.md | mission_progress table | Schema definition |
| Loyalty.md | Flow 1 Step 5-6 | Data flow context |
| EXECUTION_PLAN.md | Task 8.2.2a, 8.2.3 | Related tasks |

---

**Document Version:** 1.2 (Codex audit: added Step 1.5 types regen, NULL tier_order note)
**Last Updated:** 2025-12-12
**Author:** Claude Code
**Status:** Analysis Complete
