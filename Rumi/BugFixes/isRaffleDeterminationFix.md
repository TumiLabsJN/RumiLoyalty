# isRaffle Determination - Fix Documentation

**Bug ID:** BUG-001-ISRAFFLE
**Created:** 2025-12-08
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** Task 7.2.1, 7.2.2, 7.2.3, 7.2.4 from EXECUTION_PLAN.md
**Linked Bugs:** None

---

## 1. Project Context

This is a **creator loyalty/rewards platform** built with **Next.js 14, TypeScript, and Supabase (PostgreSQL)**. The system enables brands to reward content creators with tiered VIP benefits, missions, and raffle prizes.

The bug affects the **Tiers page** (`/tiers`) which displays a marketing overview of benefits available at each VIP level (Bronze, Silver, Gold, Platinum). This page shows both guaranteed rewards and raffle opportunities.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route (3-layer)

---

## 2. Bug Summary

**What's happening:** The `tierRepository.ts` only queries VIP tier rewards (`reward_source='vip_tier'`), which are always guaranteed benefits. It does not query mission-based rewards, which include raffle prizes. The `isRaffle` field required by the API response cannot be determined because mission data (specifically `mission_type`) is not being fetched.

**What should happen:** The Tiers page should display BOTH guaranteed VIP tier rewards (`isRaffle: false`) AND raffle prizes from missions (`isRaffle: true`). The backend must derive `isRaffle` from `mission.mission_type === 'raffle'`.

**Impact:** Raffle prizes won't appear on the Tiers page, misleading creators about available opportunities. Icon display, sort priority, and displayText formatting will all be incorrect.

---

## 2a. Scope Clarification

> **IMPORTANT:** This document was updated based on external LLM audit feedback.

### What This Document Covers
- **Repository layer fix only** - Enhancing `tierRepository.ts` to return mission data with `isRaffle` derivation

### What This Document Does NOT Cover
- Service layer implementation (`tierService.ts`)
- API route implementation (`/api/tiers/route.ts`)

### Dependencies for Complete User-Visible Fix

| Task | Description | Status |
|------|-------------|--------|
| **This fix** | Repository returns mission data with isRaffle | Pending |
| **Task 7.2.3** | Create `tierService.ts` (will consume `getTierMissions()`) | Not Started |
| **Task 7.2.4** | Implement `getTiersPageData` (will aggregate with isRaffle) | Not Started |
| **Task 7.2.5** | Create `/api/tiers` route (will return response to frontend) | Not Started |

**Bug is fully resolved when:** All tasks 7.2.3-7.2.5 complete and use this repository function.

### Audit Feedback Addressed

| Issue | Resolution |
|-------|------------|
| Bug not actually fixed (repository-only) | Clarified scope, linked to dependent tasks |
| Multi-tenant gap on join | Added `rewards.client_id` filter to query |
| Usage claim inaccurate | Corrected - function has zero callers |
| Missing reward_source | Added to query for consistency |
| Missing rewards.enabled filter | Added `.eq('rewards.enabled', true)` for consistency with getVipTierRewards |
| Tests are aspirational | Clarified tests created in Task 7.3.1 |
| Schema verification incomplete | Added client_id, reward_source, enabled to rewards columns |

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **API_CONTRACTS.md** | GET /api/tiers → Reward Aggregation section | `groupBy(tierRewards, r => ${r.type}_${r.isRaffle})` - rewards are grouped by type AND isRaffle |
| **API_CONTRACTS.md** | GET /api/tiers → Example Response | Shows same tier with `physical_gift` having both `isRaffle: true` AND `isRaffle: false` |
| **API_CONTRACTS.md** | GET /api/tiers → Total Perks Count Calculation | `totalPerksCount` includes BOTH `tier.rewards` AND `tier.missions` contributions |
| **SchemaFinalv2.md** | rewards table definition | No `is_raffle` column exists on rewards table |
| **SchemaFinalv2.md** | missions table definition | `mission_type` column has value `'raffle'` - raffle is a mission type |
| **dashboardService.ts** | transformFeaturedMission function | `const isRaffle = mission.type === 'raffle'` - derived from mission, not stored on reward |
| **appcode/app/types/tiers.ts** | AggregatedReward interface | `isRaffle: boolean // True if tied to raffle mission` - confirms derivation expectation |

### Key Evidence

**Evidence 1:** API response example shows both raffle and non-raffle rewards in same tier
- Source: API_CONTRACTS.md, GET /api/tiers Example Response section
- Implication: Backend must return both types, distinguished by `isRaffle` flag

**Evidence 2:** No `is_raffle` column in database schema
- Source: SchemaFinalv2.md, rewards table definition
- Implication: `isRaffle` must be derived at runtime, not queried directly

**Evidence 3:** Existing code derives isRaffle from mission_type
- Source: dashboardService.ts, transformFeaturedMission function
- Implication: Established pattern exists - `isRaffle = mission.mission_type === 'raffle'`

---

## 4. Root Cause Analysis

**Root Cause:** The `tierRepository.ts` was designed with incomplete understanding - it only queries VIP tier rewards, missing the mission-based rewards that include raffles.

**Contributing Factors:**
1. `isRaffle` is not a database column - it must be derived from mission data
2. The initial implementation only considered `reward_source='vip_tier'` rewards
3. The relationship between missions and rewards for the Tiers page was not fully understood

**How it was introduced:** During Task 7.2.1 implementation, the focus was on VIP tier rewards without recognizing that mission rewards (especially raffles) also appear on the Tiers page.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators won't see raffle opportunities on Tiers page | High |
| Marketing effectiveness | "Chance to win" promotions invisible to users | High |
| Icon display | Wrong icons shown (GiftDrop vs Clover) | Medium |
| Sort order | Raffles should appear first (priority 1-3) but won't | Medium |

**Business Risk Summary:** Creators evaluating VIP tiers will see incomplete benefits, potentially reducing motivation to achieve higher tiers. Raffle promotions are high-engagement features that would be hidden.

---

## 6. Current State

### Current File

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`

```typescript
/**
 * Get missions with their reward uses for totalPerksCount calculation.
 * Per API_CONTRACTS.md lines 6105-6125 (totalPerksCount = reward uses + mission reward uses)
 *
 * SECURITY: Validates client_id match (multitenancy)
 */
async getMissionsWithRewardUses(clientId: string): Promise<TierMissionData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('missions')
    .select(`
      id,
      tier_eligibility,
      reward_id,
      rewards!inner (redemption_quantity)
    `)
    .eq('client_id', clientId)
    .eq('enabled', true);

  if (error) {
    console.error('[TierRepository] Error fetching missions:', error);
    throw new Error('Failed to fetch missions');
  }

  return (data || []).map((mission) => {
    const reward = mission.rewards as unknown as { redemption_quantity: number | null };
    return {
      id: mission.id,
      tierEligibility: mission.tier_eligibility,
      rewardId: mission.reward_id,
      rewardUses: reward?.redemption_quantity ?? 1,
    };
  });
},
```

**Current Interface:**

```typescript
export interface TierMissionData {
  id: string;
  tierEligibility: string;
  rewardId: string;
  rewardUses: number;
}
```

**Current Behavior:**
- Returns mission ID, tier eligibility, reward ID, and uses count
- Missing: `mission_type` (needed to derive isRaffle)
- Missing: `reward.type`, `reward.name`, `reward.description`, `reward.value_data` (needed for aggregation/displayText)

### Current Data Flow

```
Database                    Repository                  Service                 API
─────────────────────────────────────────────────────────────────────────────────────
rewards table ──────────► getVipTierRewards() ────► [aggregation] ────────► tiers[].rewards
(reward_source='vip_tier')     │                         │
                               │                         │
                               └── isRaffle = false ─────┘

missions table ─────────► getMissionsWithRewardUses() ──► [ZERO CALLERS - function unused]
                               │
                               └── mission_type NOT queried ──► isRaffle CANNOT be derived

**Note:** The function `getMissionsWithRewardUses()` was created during Task 7.2.1 but has **zero callers** in the codebase. It is not yet integrated into any service or route.
```

---

## 7. Proposed Fix

### Approach
Enhance the existing `getMissionsWithRewardUses()` function to return complete mission+reward data, including `mission_type` for isRaffle derivation. Rename to `getTierMissions()` to reflect expanded purpose.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`

**Before (Interface):**
```typescript
export interface TierMissionData {
  id: string;
  tierEligibility: string;
  rewardId: string;
  rewardUses: number;
}
```

**After (Interface):**
```typescript
/**
 * Mission with linked reward data for tier aggregation.
 * Includes mission_type for isRaffle derivation.
 */
export interface TierMissionData {
  id: string;
  missionType: string;
  tierEligibility: string;
  rewardId: string;
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    uses: number;
    rewardSource: string;  // Added for consistency with getVipTierRewards()
  };
  isRaffle: boolean;  // Derived: missionType === 'raffle'
}
```

**Before (Function):**
```typescript
async getMissionsWithRewardUses(clientId: string): Promise<TierMissionData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('missions')
    .select(`
      id,
      tier_eligibility,
      reward_id,
      rewards!inner (redemption_quantity)
    `)
    .eq('client_id', clientId)
    .eq('enabled', true);
  // ... mapping
}
```

**After (Function):**
```typescript
/**
 * Get tier-eligible missions with their linked rewards.
 * Returns complete data for:
 * - Reward aggregation (type, name, valueData for displayText)
 * - isRaffle derivation (mission_type)
 * - totalPerksCount calculation (uses)
 *
 * SECURITY: Validates client_id match on BOTH missions AND rewards (multitenancy)
 */
async getTierMissions(clientId: string): Promise<TierMissionData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('missions')
    .select(`
      id,
      mission_type,
      tier_eligibility,
      reward_id,
      rewards!inner (
        id,
        type,
        name,
        description,
        value_data,
        redemption_quantity,
        reward_source,
        client_id
      )
    `)
    .eq('client_id', clientId)
    .eq('enabled', true)
    .eq('rewards.client_id', clientId)   // SECURITY: Multi-tenant filter on joined rewards
    .eq('rewards.enabled', true);        // Consistency: Only enabled rewards (matches getVipTierRewards)

  if (error) {
    console.error('[TierRepository] Error fetching tier missions:', error);
    throw new Error('Failed to fetch tier missions');
  }

  return (data || []).map((mission) => {
    const reward = mission.rewards as unknown as {
      id: string;
      type: string;
      name: string | null;
      description: string | null;
      value_data: Record<string, unknown> | null;
      redemption_quantity: number | null;
      reward_source: string;
      client_id: string;
    };
    return {
      id: mission.id,
      missionType: mission.mission_type,
      tierEligibility: mission.tier_eligibility,
      rewardId: mission.reward_id,
      reward: {
        id: reward.id,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        valueData: reward.value_data,
        uses: reward.redemption_quantity ?? 1,
        rewardSource: reward.reward_source ?? 'mission',
      },
      isRaffle: mission.mission_type === 'raffle',
    };
  });
},
```

**Explanation:** The enhanced function:
1. Queries `mission_type` to enable isRaffle derivation
2. Queries full reward data (`type`, `name`, `description`, `value_data`, `reward_source`) for aggregation
3. **SECURITY:** Filters rewards by `client_id` to prevent cross-tenant data leakage (defense in depth)
4. **CONSISTENCY:** Filters rewards by `enabled` to match `getVipTierRewards()` behavior
5. Derives `isRaffle` in the repository layer (consistent with dashboardService pattern)
6. Renamed to `getTierMissions()` to reflect broader purpose

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `/appcode/lib/repositories/tierRepository.ts` | MODIFY | Enhance `getMissionsWithRewardUses()` → rename to `getTierMissions()`, expand query and interface |
| `/appcode/lib/services/tierService.ts` | MODIFY (future) | Update to call `getTierMissions()` and use isRaffle for aggregation |

### Dependency Graph

```
tierRepository.ts
├── imports from: @/lib/supabase/server-client, @/lib/types/database
├── imported by: tierService.ts (future - Task 7.2.3)
└── affects: GET /api/tiers response (future - Task 7.2.5)
```

---

## 9. Data Flow Analysis

### Before Fix

```
[rewards table] ──► getVipTierRewards() ──► isRaffle=false always
                                                    ↓
                                            [aggregation] ──► API response
                                                    ↑
[missions table] ──► getMissionsWithRewardUses() ──► perks count ONLY (no isRaffle)
```

### After Fix

```
[rewards table] ──► getVipTierRewards() ──────────► isRaffle=false
                                                           ↓
                                                    [aggregation] ──► API response
                                                           ↑
[missions table] ──► getTierMissions() ──────────► isRaffle derived from mission_type
  + rewards JOIN           │
                           └── Returns: missionType, reward.*, isRaffle
```

### Data Transformation Steps

1. **Repository Layer**
   - `getVipTierRewards()` → returns VIP rewards, service sets `isRaffle: false`
   - `getTierMissions()` → returns missions with rewards, derives `isRaffle` from `mission_type`

2. **Service Layer** (future Task 7.2.4)
   - Filter by tier_eligibility (including 'all' handling)
   - Combine VIP rewards + mission rewards
   - Group by `${type}_${isRaffle}`
   - Apply 9-priority sorting
   - Limit to 4 per tier

3. **Presentation Layer** (future Task 7.2.5)
   - Return JSON response matching API contract

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/tiers (route.ts) - FUTURE Task 7.2.5
│
├─► Auth: supabase.auth.getUser()
├─► User: userRepository.findByAuthId()
├─► Tenant check: user.clientId !== clientId
│
└─► tierService.getTiersPageData(userId, clientId) - FUTURE Task 7.2.4
    │
    ├─► tierRepository.getAllTiers(clientId)
    │   └── Returns: TierData[]
    │
    ├─► tierRepository.getVipTierRewards(clientId)
    │   └── Returns: TierRewardData[] (isRaffle always false)
    │
    ├─► tierRepository.getTierMissions(clientId)  ⚠️ THIS FIX
    │   └── Returns: TierMissionData[] (isRaffle derived)
    │
    └─► Aggregation & Formatting
        ├── aggregateRewardsForTier()  ⚠️ Uses isRaffle
        └── calculateTotalPerksCount()
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | missions + rewards tables | Source of mission_type for isRaffle |
| Repository | `getTierMissions()` | Must derive isRaffle |
| Service | `aggregateRewardsForTier()` | Groups by type+isRaffle |
| API Route | GET /api/tiers | Returns isRaffle in response |
| Frontend | tiers/page.tsx | Uses isRaffle for icon/sorting |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| missions | id, mission_type, tier_eligibility, reward_id, client_id, enabled | `mission_type='raffle'` determines isRaffle |
| rewards | id, type, name, description, value_data, redemption_quantity, reward_source, client_id, enabled | Linked via missions.reward_id. `client_id` for multi-tenant filter, `enabled` for consistency with getVipTierRewards, `reward_source` for aggregation |

### Schema Check

```sql
-- Verify missions have mission_type and link to rewards
SELECT
  m.id,
  m.mission_type,
  m.tier_eligibility,
  r.type AS reward_type,
  r.name AS reward_name,
  (m.mission_type = 'raffle') AS is_raffle
FROM missions m
INNER JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = '[client_id]'
  AND m.enabled = true
LIMIT 10;
```

### Data Migration Required?
- [x] No - schema already supports fix (mission_type column exists)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Tiers Page | `/appcode/app/tiers/page.tsx` | None - already expects isRaffle |
| AggregatedReward type | `/appcode/app/types/tiers.ts` | None - already includes isRaffle |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `tiers[].rewards[].isRaffle` | Not populated correctly | Correctly derived | No - additive |

### Frontend Changes Required?
- [x] No - frontend already handles isRaffle correctly (types defined, icon mapping exists)

---

## 13. Alternative Solutions Considered

### Option A: Add `is_raffle` Column to Rewards Table
- **Description:** Add database column to store isRaffle directly
- **Pros:** Simple queries, no JOINs needed
- **Cons:** Data duplication, sync issues if mission_type changes
- **Verdict:** ❌ Rejected - violates DRY, introduces sync risk

### Option B: Derive isRaffle in Repository (Selected)
- **Description:** Enhance repository query to include mission_type, derive isRaffle
- **Pros:** Single source of truth, matches existing pattern (dashboardService)
- **Cons:** Requires JOIN
- **Verdict:** ✅ Selected - architecturally sound, follows established pattern

### Option C: Derive isRaffle in Service Layer
- **Description:** Repository returns raw data, service derives isRaffle
- **Pros:** Repository stays simpler
- **Cons:** Service needs mission data anyway, two-step process
- **Verdict:** ❌ Rejected - less efficient than Option B

### Option D: Create Database View
- **Description:** Create SQL view that includes derived is_raffle
- **Pros:** Clean query interface
- **Cons:** Database change, Supabase type generation issues
- **Verdict:** ❌ Rejected - overkill for this use case

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JOIN fails silently | Low | High | Error handling, logging |
| tier_eligibility='all' not handled | Medium | Medium | Service layer filter logic |
| Performance degradation | Low | Low | Query is simple, indexed columns |
| ~~Cross-tenant data via join~~ | ~~Medium~~ | ~~High~~ | ~~FIXED: Added `.eq('rewards.client_id', clientId)`~~ |

> **Audit Fix:** The multi-tenant security gap identified in audit has been addressed by adding explicit `rewards.client_id` filtering on the join.

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response gains correct isRaffle values |
| Database | No | No schema changes |
| Frontend | No | Already expects isRaffle |

---

## 15. Testing Strategy

> **Note:** Tests are created in **Task 7.3.1** (EXECUTION_PLAN.md Step 7.3: Tiers Testing).
> The examples below show WHAT tests should verify, not claiming they exist now.

### Unit Tests

**File:** `/tests/integration/api/tiers.test.ts` (created in Task 7.3.1)

```typescript
describe('tierRepository.getTierMissions', () => {
  it('should return missions with isRaffle derived from mission_type', async () => {
    const missions = await tierRepository.getTierMissions(testClientId);

    const raffleMission = missions.find(m => m.missionType === 'raffle');
    const normalMission = missions.find(m => m.missionType !== 'raffle');

    expect(raffleMission?.isRaffle).toBe(true);
    expect(normalMission?.isRaffle).toBe(false);
  });

  it('should return complete reward data for each mission', async () => {
    const missions = await tierRepository.getTierMissions(testClientId);

    expect(missions[0].reward).toHaveProperty('id');
    expect(missions[0].reward).toHaveProperty('type');
    expect(missions[0].reward).toHaveProperty('name');
    expect(missions[0].reward).toHaveProperty('uses');
  });

  it('should filter by client_id (multitenancy)', async () => {
    const missions = await tierRepository.getTierMissions(testClientId);
    // Verify no cross-tenant data
  });
});
```

### Integration Tests

```typescript
describe('GET /api/tiers - isRaffle handling', () => {
  it('should include both raffle and non-raffle rewards', async () => {
    const response = await GET(mockRequest);
    const data = await response.json();

    const allRewards = data.tiers.flatMap(t => t.rewards);
    const hasRaffle = allRewards.some(r => r.isRaffle === true);
    const hasNonRaffle = allRewards.some(r => r.isRaffle === false);

    expect(hasRaffle).toBe(true);
    expect(hasNonRaffle).toBe(true);
  });

  it('should sort raffle rewards before non-raffle', async () => {
    const response = await GET(mockRequest);
    const data = await response.json();

    data.tiers.forEach(tier => {
      const priorities = tier.rewards.map(r => r.sortPriority);
      const isSorted = priorities.every((p, i) => i === 0 || p >= priorities[i-1]);
      expect(isSorted).toBe(true);
    });
  });
});
```

### Manual Verification Steps

1. [ ] Query database directly to verify raffle missions exist
2. [ ] Call repository function and verify isRaffle derivation
3. [ ] Call API endpoint and verify response includes raffle rewards
4. [ ] Check frontend displays Clover icon for raffle rewards

### Verification Commands

```bash
# Type check
npm run typecheck

# Run tier-related tests
npm test -- tiers

# Build verification
npm run build
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Update `TierMissionData` interface in tierRepository.ts
  - File: `/appcode/lib/repositories/tierRepository.ts`
  - Change: Add missionType, reward object, isRaffle fields
- [ ] **Step 2:** Rename function `getMissionsWithRewardUses` → `getTierMissions`
  - File: `/appcode/lib/repositories/tierRepository.ts`
  - Change: Function name and JSDoc
- [ ] **Step 3:** Enhance select query to include mission_type and full reward data
  - File: `/appcode/lib/repositories/tierRepository.ts`
  - Change: Expand `.select()` clause
- [ ] **Step 4:** Update mapping to derive isRaffle
  - File: `/appcode/lib/repositories/tierRepository.ts`
  - Change: Add `isRaffle: mission.mission_type === 'raffle'`

### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update EXECUTION_PLAN.md Task 7.2.2 if needed

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 7.2.2 | Implement tier repository query functions | This fix completes part of the task |
| 7.2.4 | Implement getTiersPageData service function | Must use new `getTierMissions()` |

### Updates Required

**Task 7.2.2:**
- Current AC: Returns raw tier data, raw VIP tier rewards, raw mission data
- Updated AC: `getTierMissions()` now returns complete mission+reward data with isRaffle
- Notes: Function renamed from `getMissionsWithRewardUses` to `getTierMissions`

### New Tasks Created
- None - this fix is part of existing Task 7.2.2

---

## 18. Definition of Done

### Repository Fix (This Document)
- [ ] `TierMissionData` interface updated with missionType, reward object (including rewardSource), isRaffle
- [ ] Function renamed to `getTierMissions()`
- [ ] Query enhanced to select mission_type, full reward data, and reward_source
- [ ] **SECURITY:** Multi-tenant filter added on rewards join (`.eq('rewards.client_id', clientId)`)
- [ ] isRaffle derived as `mission.mission_type === 'raffle'`
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] Build completes successfully

### Full Bug Resolution (Dependent Tasks)
> Bug is NOT fully resolved until these complete:
- [ ] Task 7.2.3: `tierService.ts` created and calls `getTierMissions()`
- [ ] Task 7.2.4: `getTiersPageData` aggregates rewards using isRaffle
- [ ] Task 7.2.5: `/api/tiers` route returns response with isRaffle field
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

> **Note:** Reference by section name, not line numbers (lines change frequently).

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| API_CONTRACTS.md | GET /api/tiers → Reward Aggregation | Defines groupBy type+isRaffle logic |
| API_CONTRACTS.md | GET /api/tiers → Example Response | Shows expected isRaffle values |
| API_CONTRACTS.md | GET /api/tiers → Total Perks Count | Shows both rewards + missions contribute |
| SchemaFinalv2.md | missions table | Defines mission_type column |
| SchemaFinalv2.md | rewards table | Confirms no is_raffle column |
| ARCHITECTURE.md | Section 5 - Repository Layer | Defines repository responsibilities |
| ARCHITECTURE.md | Section 5 - Service Layer | Defines where business logic belongs |
| dashboardService.ts | transformFeaturedMission | Shows existing isRaffle derivation pattern |

### Reading Order for External Auditor

1. **First:** This document Section 2 (Bug Summary) - Understand the problem
2. **Second:** API_CONTRACTS.md, GET /api/tiers section - See expected behavior
3. **Third:** This document Section 6 (Current State) - See what exists now
4. **Fourth:** This document Section 7 (Proposed Fix) - See exact changes needed
5. **Fifth:** SchemaFinalv2.md, missions/rewards tables - Verify schema supports fix

---

**Document Version:** 3.1
**Last Updated:** 2025-12-09
**Author:** Claude Code
**Status:** Analysis Complete (Audit Feedback Addressed - APPROVE WITH CHANGES)

### Revision History
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-08 | Initial analysis |
| 2.0 | 2025-12-08 | Reformatted to StandardBugFix.md template |
| 3.0 | 2025-12-09 | Addressed external audit feedback: scope clarification, multi-tenant security fix, usage claim correction, added reward_source |
| 3.1 | 2025-12-09 | Addressed second audit: added rewards.enabled filter, clarified test strategy, expanded schema verification |
