# In-Progress Rewards Visibility on Demotion - Fix Documentation

**Bug ID:** BUG-INPROGRESS-VISIBILITY
**Created:** 2025-12-12
**Status:** Implemented
**Severity:** High
**Related Tasks:** Phase 8 - Tier Calculation (Task 8.3.1)
**Linked Bugs:** DemotionExp.md (discovery document)

---

## 1. Project Context

This is a loyalty rewards platform built with Next.js 14, TypeScript, and Supabase/PostgreSQL. Users earn VIP tier rewards and mission rewards based on their tier level. When users are demoted to a lower tier (e.g., Gold → Silver during monthly checkpoint), they may have in-progress rewards that were claimed but not yet concluded.

The bug affects two RPC functions that retrieve available rewards and missions for users. These RPCs filter by the user's current tier, causing in-progress items from higher tiers to disappear from the UI.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers, RPC functions for complex queries

---

## 2. Bug Summary

**What's happening:** When a user is demoted from a higher tier (e.g., Gold → Silver), any in-progress VIP rewards AND mission rewards from the higher tier disappear from their UI because both RPC queries filter strictly by current tier eligibility.

**What should happen:** In-progress rewards (status='claimed' or 'fulfilled') should remain visible until concluded, regardless of tier changes. Users should be able to see and complete rewards they already claimed.

**Impact:**
- Users lose visibility of rewards mid-fulfillment (e.g., physical gift being shipped, commission boost in active period)
- Support burden increases as users report "missing" rewards
- Business rule violation: "User must be able to conclude claimed reward even if demoted"

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| 20251203_single_query_rpc_functions.sql | get_available_rewards WHERE clause | Filters by `tier_eligibility = p_current_tier` |
| 20251203_single_query_rpc_functions.sql | get_available_missions WHERE clause | Filters by `tier_eligibility = p_current_tier` |
| SchemaFinalv2.md | redemptions Table | Status lifecycle: claimable → claimed → fulfilled → concluded |
| SchemaFinalv2.md | commission_boost_redemptions | boost_status lifecycle can span 30+ days |
| SchemaFinalv2.md | physical_gift_redemptions | Shipping process can span weeks |
| User clarification | Business rules | "User must be able to conclude claimed reward even if demoted" |

### Key Evidence

**Evidence 1:** VIP Rewards RPC WHERE clause excludes other tiers
- Source: 20251203_single_query_rpc_functions.sql, get_available_rewards function
- Code: `AND (r.tier_eligibility = p_current_tier OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order))`
- Implication: In-progress rewards from higher tiers not returned

**Evidence 2:** Mission RPC WHERE clause has same pattern
- Source: 20251203_single_query_rpc_functions.sql, get_available_missions function
- Code: `AND (m.tier_eligibility = p_current_tier OR m.tier_eligibility = 'all' OR m.preview_from_tier = p_current_tier)`
- Implication: In-progress mission rewards from higher tiers not returned

**Evidence 3:** Business rule confirmation
- Source: User clarification during discovery
- Quote: "The user must be able to conclude that claimed reward even if they get demoted"
- Implication: Current behavior violates business rule

**Evidence 4:** Long-duration reward types exist
- Source: SchemaFinalv2.md, commission_boost_redemptions and physical_gift_redemptions sections
- Finding: Commission boosts last 30+ days, physical gifts take weeks to ship
- Implication: High probability of demotion occurring during fulfillment period

---

## 4. Root Cause Analysis

**Root Cause:** Both `get_available_rewards` and `get_available_missions` RPC functions filter rewards/missions strictly by tier eligibility without considering existing active redemptions.

**Contributing Factors:**
1. RPCs designed to show "available" items, not "in-progress" items
2. No separate query logic for active redemptions regardless of tier
3. LEFT JOIN to redemptions exists but doesn't influence WHERE clause
4. Design focused on eligibility, not preserving visibility of claimed items

**How it was introduced:** Initial design focused on showing what users are eligible for, without considering the edge case of users with claimed items being demoted.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | In-progress rewards disappear unexpectedly | High |
| Fulfillment confusion | Users can't see status of shipping/active rewards | High |
| Support burden | Users will report "missing" rewards | Medium |
| Trust | Users may think they were cheated out of rewards | High |

**Business Risk Summary:** Users who have claimed rewards and are demoted will lose visibility of those rewards, causing confusion, support tickets, and potential loss of trust. Commission boosts (30+ days) and physical gifts (weeks for shipping) are particularly affected.

---

## 6. Current State

### Current RPC Function: get_available_rewards

**File:** `supabase/migrations/20251203_single_query_rpc_functions.sql`

```sql
-- Lines 268-284
FROM rewards r
INNER JOIN tiers t ON r.tier_eligibility = t.tier_id AND r.client_id = t.client_id
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = p_user_id
  AND red.mission_progress_id IS NULL
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
WHERE r.client_id = p_client_id
  AND r.enabled = true
  AND r.reward_source = 'vip_tier'
  AND (
    r.tier_eligibility = p_current_tier
    OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
  )
ORDER BY r.display_order ASC;
```

### Current RPC Function: get_available_missions

**File:** `supabase/migrations/20251203_single_query_rpc_functions.sql`

```sql
-- Lines 141-161
FROM missions m
INNER JOIN rewards r ON m.reward_id = r.id
INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
LEFT JOIN mission_progress mp ON m.id = mp.mission_id
  AND mp.user_id = p_user_id
  AND mp.client_id = p_client_id
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.deleted_at IS NULL
LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
  AND rp.user_id = p_user_id
WHERE m.client_id = p_client_id
  AND m.enabled = true
  AND (
    m.tier_eligibility = p_current_tier
    OR m.tier_eligibility = 'all'
    OR m.preview_from_tier = p_current_tier
  )
ORDER BY m.display_order ASC;
```

**Key Difference Between RPCs:**
- `get_available_rewards`: Redemptions JOIN filters for `status NOT IN ('concluded', 'rejected')`
- `get_available_missions`: Redemptions JOIN does NOT filter by status

### Current Behavior

**get_available_rewards:**
- Returns VIP rewards where `tier_eligibility = current_tier`
- Returns preview rewards for lower tiers
- Does NOT return rewards from higher tiers, even if user has active redemption

**get_available_missions:**
- Returns missions where `tier_eligibility = current_tier` or `'all'`
- Returns preview missions for current tier
- Does NOT return missions from higher tiers, even if user has active redemption

### Current Data Flow

```
User demoted Gold → Silver with in-progress gift_card
    ↓
RPC: WHERE tier_eligibility = 'tier_2' (Silver)
    ↓
Gold rewards/missions (tier_eligibility = 'tier_3') excluded
    ↓
In-progress items NOT returned
    ↓
User doesn't see their shipping reward ❌
```

---

## 7. Proposed Fix

### Approach

Modify the WHERE clause in both RPCs to include items where the user has an active (non-concluded) redemption, regardless of tier eligibility or enabled status.

### Changes Required

**File:** `supabase/migrations/[NEW]_fix_inprogress_visibility.sql`

#### Fix 1: get_available_rewards

**Before (JOIN):**
```sql
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = p_user_id
  AND red.mission_progress_id IS NULL
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
```

**After (JOIN):**
```sql
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id  -- ADDED: Multi-tenant isolation
  AND red.mission_progress_id IS NULL
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
```

**Before (WHERE):**
```sql
WHERE r.client_id = p_client_id
  AND r.enabled = true
  AND r.reward_source = 'vip_tier'
  AND (
    r.tier_eligibility = p_current_tier
    OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
  )
```

**After (WHERE):**
```sql
WHERE r.client_id = p_client_id
  AND r.reward_source = 'vip_tier'
  AND (
    -- Standard eligibility for enabled rewards
    (r.enabled = true AND (
      r.tier_eligibility = p_current_tier
      OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= p_current_tier_order)
    ))
    -- OR has active redemption (regardless of enabled/tier)
    OR red.id IS NOT NULL
  )
```

**Explanation:**
- **JOIN change:** Added `red.client_id = p_client_id` for defense-in-depth multi-tenant isolation (prevents cross-tenant leakage under service_role if data corruption occurs)
- The `red.id IS NOT NULL` condition includes any reward where the LEFT JOIN found an active redemption
- The LEFT JOIN already filters for `status NOT IN ('concluded', 'rejected')`, so only in-progress redemptions match
- For unclaimed rewards, `red.id` is NULL (no redemption record exists), so they don't match this condition
- Disabled rewards with active redemptions will show (user can finish their claim)
- Disabled rewards without active redemptions won't show (correct behavior)

#### Fix 2: get_available_missions

**Before (JOIN):**
```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.deleted_at IS NULL
```

**After (JOIN):**
```sql
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
  AND red.user_id = p_user_id
  AND red.client_id = p_client_id  -- ADDED: Multi-tenant isolation
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
```

**Before (WHERE):**
```sql
WHERE m.client_id = p_client_id
  AND m.enabled = true
  AND (
    m.tier_eligibility = p_current_tier
    OR m.tier_eligibility = 'all'
    OR m.preview_from_tier = p_current_tier
  )
```

**After (WHERE):**
```sql
WHERE m.client_id = p_client_id
  AND (
    -- Standard eligibility for enabled missions
    (m.enabled = true AND (
      m.tier_eligibility = p_current_tier
      OR m.tier_eligibility = 'all'
      OR m.preview_from_tier = p_current_tier
    ))
    -- OR has active redemption (regardless of enabled/tier)
    OR red.id IS NOT NULL
  )
```

**Explanation:**
- **JOIN changes:** Added `red.client_id = p_client_id` for multi-tenant isolation AND `status NOT IN ('concluded', 'rejected')` to match rewards RPC pattern
- Same WHERE clause logic as rewards: include if standard eligibility OR has active redemption
- Mission redemptions are linked via `mission_progress_id`, so this correctly identifies in-progress mission rewards

### Accepted Behavior: Disabled Rewards with Active Redemptions

**INTENTIONAL:** Disabled rewards (`enabled = false`) WILL show if the user has an active redemption. This is accepted behavior because:
- User has already claimed the reward and is mid-fulfillment
- Examples: physical gift being shipped, commission boost in active period
- User must be able to see and conclude their in-progress claim
- Once concluded/rejected, the reward will no longer appear

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/[NEW]_fix_inprogress_visibility.sql` | CREATE | New migration with CREATE OR REPLACE for both RPC functions |

### Dependency Graph

```
get_available_rewards (RPC)
├── called by: rewardRepository.listAvailable()
├── affects: GET /api/rewards response
└── affects: Rewards page UI

get_available_missions (RPC)
├── called by: missionRepository.listAvailable()
├── affects: GET /api/missions response (if exists)
└── affects: Missions page UI
```

---

## 9. Data Flow Analysis

### Before Fix

```
User demoted (Gold → Silver) with in-progress gift_card
    ↓
RPC: tier_eligibility = 'tier_2' AND enabled = true
    ↓
Gold reward excluded (tier_3 != tier_2)
    ↓
Gift card NOT in response ❌
```

### After Fix

```
User demoted (Gold → Silver) with in-progress gift_card
    ↓
RPC: (tier = 'tier_2' AND enabled) OR red.id IS NOT NULL
    ↓
Gold reward has active redemption (red.id IS NOT NULL)
    ↓
Gift card IN response ✅
```

### Data Transformation Steps

1. **Step 1:** RPC receives user_id, client_id, current_tier, tier_order
2. **Step 2:** LEFT JOIN finds active redemptions for this user (status NOT IN concluded/rejected)
3. **Step 3:** WHERE clause evaluates: standard eligibility OR has active redemption
4. **Step 4:** Results include both eligible rewards AND in-progress rewards from any tier

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/rewards (route.ts)
│
├─► rewardRepository.listAvailable()
│   └── Calls get_available_rewards RPC
│       └── ⚠️ BUG IS HERE (WHERE clause)
│
└─► Response to frontend

GET /api/missions (route.ts)
│
├─► missionRepository.listAvailable()
│   └── Calls get_available_missions RPC
│       └── ⚠️ BUG IS HERE (WHERE clause)
│
└─► Response to frontend
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | get_available_rewards RPC | Contains buggy WHERE clause |
| Database | get_available_missions RPC | Contains buggy WHERE clause |
| Repository | rewardRepository.listAvailable() | Passes parameters to RPC |
| Repository | missionRepository.listAvailable() | Passes parameters to RPC |
| API Route | GET /api/rewards | Returns RPC results |
| Frontend | Rewards page | Displays what RPC returns |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| rewards | id, tier_eligibility, enabled, reward_source | Filtering targets |
| missions | id, tier_eligibility, enabled | Filtering targets |
| redemptions | id, reward_id, mission_progress_id, status, user_id, **client_id**, deleted_at | JOIN target, status filter, **multi-tenant isolation** |
| mission_progress | id, mission_id, user_id, client_id | Links missions to redemptions |

### Redemptions Status Values

Per SchemaFinalv2.md, redemptions.status is VARCHAR(50) with allowed values:
- `claimable` - Mission completed or tier achieved, reward available
- `claimed` - Creator clicked "Claim" button
- `fulfilled` - Admin completed action (shipped, activated, sent payment)
- `concluded` - Admin confirmed completion (TERMINAL state)
- `rejected` - Redemption rejected (TERMINAL state)

**Active redemption filter:** `status NOT IN ('concluded', 'rejected')` matches claimable, claimed, fulfilled

### Schema Check

```sql
-- Verify redemptions has required columns including client_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'redemptions'
AND column_name IN ('id', 'status', 'mission_progress_id', 'deleted_at', 'client_id', 'user_id');

-- Verify status constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'redemptions'::regclass;

-- Verify client_id foreign key exists
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'redemptions' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'client_id';
```

### Data Migration Required?
- [x] No - schema already supports fix (no new columns needed, client_id already exists)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Rewards Page | (frontend path) | None - will receive more data |
| Missions Page | (frontend path) | None - will receive more data |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| Response array | Excludes demoted tier items | Includes in-progress demoted tier items | No (additive) |

### Frontend Changes Required?
- [x] No - frontend already handles displaying rewards/missions from any tier

---

## 13. Alternative Solutions Considered

### Option A: Separate RPC for In-Progress Items
- **Description:** Create new RPCs (get_inprogress_rewards, get_inprogress_missions) that return only in-progress items
- **Pros:** Clean separation, no modification to existing RPCs
- **Cons:** Requires frontend changes, two API calls, more complex state management
- **Verdict:** ❌ Rejected - adds unnecessary complexity

### Option B: Simple WHERE Clause Modification (Selected)
- **Description:** Add `OR red.id IS NOT NULL` to existing WHERE clauses
- **Pros:** Minimal change, no frontend impact, single source of truth
- **Cons:** Slightly more complex WHERE clause
- **Verdict:** ✅ Selected - simplest fix with full coverage

### Option C: Per-Type Granular Conditions
- **Description:** Add type-specific conditions (e.g., commission_boost until paid, physical_gift until delivered)
- **Pros:** More precise control
- **Cons:** Complex SQL, harder to maintain, over-engineering for current need
- **Verdict:** ❌ Rejected - over-engineering; simple approach covers all cases

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unclaimed rewards incorrectly shown | Low | Medium | LEFT JOIN only matches if redemption exists (created at claim time) |
| Concluded rewards shown | Low | Low | JOIN filters for `status NOT IN ('concluded', 'rejected')` |
| Performance degradation | Low | Low | No new JOINs, only WHERE clause change |
| Disabled rewards incorrectly shown | Low | Low | Only shown if user has active redemption (correct behavior) |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response is additive (more items, same structure) |
| Database | No | RPC signature unchanged |
| Frontend | No | Already handles rewards from any tier |

---

## 15. Testing Strategy

### Manual Verification Steps

**Test Case 1: VIP Reward Visibility After Demotion**
1. [ ] Create user at Gold tier (tier_3)
2. [ ] User claims physical_gift VIP reward (status='claimed')
3. [ ] Demote user to Silver tier (update users.current_tier to 'tier_2')
4. [ ] Call GET /api/rewards
5. [ ] Verify in-progress physical_gift appears in response
6. [ ] Admin concludes the gift (status='concluded')
7. [ ] Verify gift_card no longer appears (correctly excluded)

**Test Case 2: Mission Reward Visibility After Demotion**
1. [ ] Create user at Gold tier (tier_3)
2. [ ] User completes Gold-tier mission, claims reward (status='claimed')
3. [ ] Demote user to Silver tier
4. [ ] Call GET /api/missions
5. [ ] Verify in-progress mission reward appears in response

**Test Case 3: Disabled Reward with Active Redemption**
1. [ ] User claims VIP reward
2. [ ] Admin disables the reward (enabled=false)
3. [ ] Call GET /api/rewards
4. [ ] Verify in-progress reward still appears

**Test Case 4: Unclaimed Rewards After Demotion (Negative Test)**
1. [ ] Create user at Gold tier
2. [ ] Gold tier has unclaimed VIP rewards
3. [ ] Demote user to Silver tier
4. [ ] Call GET /api/rewards
5. [ ] Verify unclaimed Gold rewards do NOT appear (correctly excluded)

### SQL Verification

```sql
-- Test query for VIP rewards after demotion
SELECT r.id, r.name, r.tier_eligibility, r.enabled, red.status
FROM rewards r
INNER JOIN tiers t ON r.tier_eligibility = t.tier_id AND r.client_id = t.client_id
LEFT JOIN redemptions red ON r.id = red.reward_id
  AND red.user_id = '[test_user_id]'
  AND red.client_id = '[test_client_id]'  -- Multi-tenant isolation
  AND red.mission_progress_id IS NULL
  AND red.status NOT IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
WHERE r.client_id = '[test_client_id]'
  AND r.reward_source = 'vip_tier'
  AND (
    (r.enabled = true AND (
      r.tier_eligibility = 'tier_2'  -- Current tier (Silver)
      OR (r.preview_from_tier IS NOT NULL AND t.tier_order <= 2)
    ))
    OR red.id IS NOT NULL  -- Has active redemption
  );
-- Should return Gold tier reward if user has active redemption
```

### Verification Commands

```bash
# Apply migration locally
supabase db reset

# Verify RPC exists
supabase db query "SELECT proname FROM pg_proc WHERE proname IN ('get_available_rewards', 'get_available_missions');"

# Run manual test queries
supabase db query "SELECT * FROM get_available_rewards('user-uuid'::UUID, 'client-uuid'::UUID, 'tier_2', 2);"
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Verify current RPC code matches "Current State" section
- [ ] Confirm business rule with stakeholder (in-progress items stay visible)
- [ ] Backup current RPC definitions

### Implementation Steps
- [ ] **Step 1:** Create new migration file
  - File: `supabase/migrations/[TIMESTAMP]_fix_inprogress_visibility.sql`
  - Action: Create file with header comments
- [ ] **Step 2:** Add CREATE OR REPLACE for get_available_rewards
  - Change: Updated WHERE clause per Section 7
- [ ] **Step 3:** Add CREATE OR REPLACE for get_available_missions
  - Change: Updated JOIN and WHERE clause per Section 7
- [ ] **Step 4:** Add GRANT statements for both functions
- [ ] **Step 5:** Run migration locally
  - Command: `supabase db reset` or apply migration
- [ ] **Step 6:** Execute manual verification steps (Section 15)

### Post-Implementation
- [ ] Verify RPC returns in-progress rewards after demotion
- [ ] Verify concluded rewards are correctly excluded
- [ ] Verify unclaimed rewards from demoted tier are excluded
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| (New) | Fix in-progress visibility | New bug fix task |

### Updates Required

This bug fix is independent of Phase 8 tasks but was discovered during Task 8.3.1 (tierCalculationService).

**Recommended:** Add to Phase 8 as a bug fix task, or create a separate bug fix sprint.

### New Tasks Created (if any)
- [ ] Implement InProgressRewardsVisibilityFix.md (this document)

---

## 18. Definition of Done

- [ ] Migration file created with both RPC updates
- [ ] Type checker passes (N/A - SQL only)
- [ ] Migration applies without errors
- [ ] Manual verification: VIP reward visible after demotion
- [ ] Manual verification: Mission reward visible after demotion
- [ ] Manual verification: Disabled reward with active redemption visible
- [ ] Manual verification: Unclaimed rewards from demoted tier NOT visible
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| 20251203_single_query_rpc_functions.sql | get_available_rewards, get_available_missions | Current RPC implementation |
| SchemaFinalv2.md | redemptions Table, commission_boost_redemptions, physical_gift_redemptions | Status lifecycles, JOIN conditions |
| DemotionExp.md | Full document | Discovery context and VIP reward flow |

### Reading Order for External Auditor

1. **First:** This document Section 1-2 - Provides project context and bug summary
2. **Second:** 20251203_single_query_rpc_functions.sql - Shows current RPC implementation
3. **Third:** SchemaFinalv2.md redemptions section - Explains status lifecycle
4. **Fourth:** This document Section 7 - Shows exact fix

---

**Document Version:** 1.2
**Last Updated:** 2025-12-12
**Author:** Claude Code
**Status:** Implemented

**Revision History:**
- v1.2 (2025-12-12): Status updated to Implemented - migration file created
- v1.1 (2025-12-12): Added client_id to redemptions JOINs per Codex audit (multi-tenant isolation), documented accepted behavior for disabled rewards with active redemptions, expanded Section 11 with status enum values
- v1.0 (2025-12-12): Initial document
