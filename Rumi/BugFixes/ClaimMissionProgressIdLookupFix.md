# Claim Mission Progress ID Lookup - Fix Documentation

**Bug ID:** BUG-002-ClaimProgressIdLookup
**Created:** 2025-12-17
**Status:** Analysis Complete | Implementation Ready
**Severity:** High
**Related Tasks:** GAP-001 (Home Page Reward Claim Flow)
**Linked Bugs:** None (but blocks GAP-001 completion)
**Auditor Review:** Option B approved - rename `findById` → `findByMissionId` + add `findByProgressId`
**Second Review:** Approved with clarifications on client_id index, parameter naming, and DB round-trip trade-off

---

## Severity Justification

**High** - Major feature broken, no workaround. Users cannot claim ANY mission rewards from the Home page (or Missions page once that's wired up). The claim button is non-functional, which defeats the core purpose of the rewards platform.

---

### 1. Project Context

This is a **TikTok Shop affiliate loyalty platform** built with **Next.js 14, TypeScript, Supabase, and PostgreSQL**. The system allows content creators (affiliates) to earn rewards by completing missions (sales targets, engagement goals) and claiming VIP tier benefits.

The bug affects the **mission claim flow** - when a creator completes a mission and clicks "Claim", the system should process the reward. Instead, it returns "Mission not found" because the repository looks up the wrong ID.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers (3-tier)

---

### 2. Bug Summary

**What's happening:** When a user clicks "Claim" on a completed mission, the API returns 404 "Mission not found". The `claimMissionReward` service receives `mission_progress.id` but passes it to `missionRepository.findById()` which queries the `missions` table using that ID. Since `mission_progress.id` doesn't exist in `missions.id`, the lookup fails.

**What should happen:** The repository should look up the mission by joining from `mission_progress.id` to `missions.id` via the `mission_id` foreign key, returning the full mission data for claiming.

**Impact:**
- All mission reward claims fail (gift cards, commission boosts, discounts, physical gifts, experiences)
- Core platform functionality is broken
- Users complete missions but cannot receive their rewards

---

### 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `API_CONTRACTS.md` | "GET /api/missions Response Schema" (line 2987) | Explicitly states: `id: string // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)` |
| `API_CONTRACTS.md` | "POST /api/missions/:id/claim" (lines 3719-3789) | Documents the claim endpoint expecting mission_progress.id in the URL |
| `API_CONTRACTS.md` | "POST /api/missions/:id/claim Backend Validation" (lines 3780-3788) | Step 1: "Verify `mission_progress.status='completed'`" - confirms operation is on mission_progress |
| `SchemaFinalv2.md` | "missions Table" (Section 2.1, lines 362-420) | Documents `missions.id` as the mission template ID |
| `SchemaFinalv2.md` | "mission_progress Table" (Section 2.2, lines 425-457) | Documents `mission_progress.id` as the user's progress record ID, with FK to `missions.id` |
| `SchemaFinalv2.md` | "redemptions Table" (line 603) | Shows `mission_progress_id` FK: "Which mission completion (if mission-based)" |
| `lib/types/dashboard-rpc.ts` | "featuredMission interface" (line 52) | Has `progressId: string | null;` separate from `missionId` |
| `lib/services/missionService.ts` | "claimMissionReward function" (lines 1001-1007) | Parameter named `missionProgressId`, comment says "Get mission by progress ID" |
| `lib/repositories/missionRepository.ts` | "findById function" (lines 689-738) | **BUG LOCATION**: Queries `.from('missions').eq('id', missionId)` - wrong table |
| `app/api/missions/[missionId]/claim/route.ts` | "POST handler" (lines 115-126) | Passes `missionId` param to `claimMissionReward()` |

### Key Evidence

**Evidence 1:** API Contract explicitly defines ID source
- Source: `API_CONTRACTS.md`, "GET /api/missions Response Schema"
- Quote: `id: string // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)`
- Implication: The design intent is clear - claim endpoints receive `mission_progress.id`

**Evidence 2:** Service function named to expect progress ID
- Source: `lib/services/missionService.ts`, `claimMissionReward` function signature
- Quote: `claimMissionReward(missionProgressId: string, ...)` with comment `// 1. Get mission by progress ID`
- Implication: The service layer was designed to receive `mission_progress.id`

**Evidence 3:** Repository queries wrong table
- Source: `lib/repositories/missionRepository.ts`, `findById` function
- Quote: `.from('missions').eq('id', missionId)`
- Implication: Repository looks in `missions` table but receives `mission_progress.id`

**Evidence 4:** Database query proof
- Source: Direct database query during debugging
- Query: `SELECT 'mission_progress' as table_name, id FROM mission_progress WHERE id = 'ada0251c-cf31-4a0f-94a9-5fafbb40bf2c'` → Found 1 row
- Query: `SELECT 'missions' as table_name, id FROM missions WHERE id = 'ada0251c-cf31-4a0f-94a9-5fafbb40bf2c'` → No rows
- Implication: The ID passed IS a valid `mission_progress.id`, but doesn't exist in `missions`

**Evidence 5:** Server logs confirm 404
- Source: Dev server output during testing
- Quote: `POST /api/missions/ada0251c-cf31-4a0f-94a9-5fafbb40bf2c/claim 404 in 1107ms`
- Implication: The API returns 404 "Mission not found" due to the lookup failure

---

### 4. Root Cause Analysis

**Root Cause:** The `missionRepository.findById()` function queries the `missions` table using an ID that is actually from the `mission_progress` table. The design expects `mission_progress.id` but the implementation looks up `missions.id`.

**Contributing Factors:**
1. **Naming confusion**: The parameter is called `missionId` in the repository but should be `missionProgressId`
2. **Incomplete implementation**: The Missions page claim handlers have TODO comments and simulated delays - the claim flow was never fully tested end-to-end
3. **Separate ID fields**: The RPC returns both `missionId` (missions.id) and `progressId` (mission_progress.id), but the repository wasn't updated to handle this distinction

**How it was introduced:** The repository `findById` was likely written for a different use case (looking up missions by their template ID) and was reused for claims without updating the query logic.

---

### 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users complete missions but cannot claim rewards - extremely frustrating | **High** |
| Revenue/Engagement | Creators may abandon platform if rewards don't work | **High** |
| Feature functionality | Core mission reward system is completely non-functional | **High** |
| Data integrity | No data corruption - claims simply fail | Low |

**Business Risk Summary:** The mission reward system is the core value proposition of the platform. If creators cannot claim rewards after completing missions, they will lose trust and engagement. This is a blocking issue for platform launch.

---

### 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
```typescript
async findById(
  missionId: string,
  userId: string,
  clientId: string
): Promise<AvailableMissionData | null> {
  const supabase = await createClient();

  const { data: mission, error } = await supabase
    .from('missions')  // ❌ WRONG: Looking in missions table
    .select(`
      id,
      mission_type,
      display_name,
      // ... other fields
      mission_progress (
        id,
        user_id,
        current_value,
        status,
        // ...
      )
    `)
    .eq('id', missionId)  // ❌ WRONG: missionId is actually mission_progress.id
    .eq('client_id', clientId)
    .single();

  if (error || !mission) {
    return null;  // Returns null because mission_progress.id doesn't exist in missions.id
  }
  // ...
}
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
```typescript
export async function claimMissionReward(
  missionProgressId: string,  // ✅ CORRECT: Named as progress ID
  userId: string,
  clientId: string,
  currentTierId: string,
  claimData: ClaimRequestData
): Promise<ClaimResponse> {
  // 1. Get mission by progress ID
  const mission = await missionRepository.findById(missionProgressId, userId, clientId);
  // ❌ BUG: findById looks up missions.id, not mission_progress.id

  if (!mission) {
    return {
      success: false,
      message: 'Mission not found',  // This is what the user sees
      // ...
    };
  }
  // ...
}
```

**Current Behavior:**
- User completes a mission (mission_progress.status = 'completed')
- Dashboard returns `progressId` (mission_progress.id) correctly
- Frontend calls `POST /api/missions/{progressId}/claim`
- Service calls `missionRepository.findById(progressId, ...)`
- Repository queries `SELECT * FROM missions WHERE id = {progressId}` → No rows found
- Service returns "Mission not found"
- User sees error toast

#### Current Data Flow

```
Frontend (progressId: "ada0251c...")
    ↓
API Route (/api/missions/[missionId]/claim)
    ↓
Service (claimMissionReward(missionProgressId: "ada0251c..."))
    ↓
Repository (findById queries: missions.id = "ada0251c...")
    ↓
❌ NOT FOUND (because "ada0251c..." is in mission_progress, not missions)
```

---

### 7. Proposed Fix

#### Approach

**Option B (Auditor Approved):** Rename existing method and add new method for explicit, self-documenting API:

1. **Rename** `findById()` → `findByMissionId()` (preserves path for mission template lookups)
2. **Add** `findByProgressId()` (for claim flow - queries mission_progress first)
3. **Update** the single caller to use `findByProgressId()`

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`

**Change 1: Rename existing method**

```typescript
// Before
async findById(
  missionId: string,
  ...
)

// After
async findByMissionId(
  missionId: string,
  ...
)
```

**Change 2: Add new method after `findByMissionId`:**

```typescript
/**
 * Find mission data by mission_progress.id
 * Used by claim flow where the ID is the progress record, not the mission template
 *
 * @param progressId - mission_progress.id (NOT missions.id)
 * @param userId - User making the claim
 * @param clientId - Tenant isolation
 */
async findByProgressId(
  progressId: string,
  userId: string,
  clientId: string
): Promise<AvailableMissionData | null> {
  const supabase = await createClient();

  // Query mission_progress first, join to missions
  const { data: progress, error: progressError } = await supabase
    .from('mission_progress')
    .select(`
      id,
      user_id,
      mission_id,
      current_value,
      status,
      completed_at,
      checkpoint_start,
      checkpoint_end,
      missions!inner (
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
        preview_from_tier,
        enabled,
        display_order,
        reward_id,
        rewards!inner (
          id,
          type,
          name,
          description,
          value_data,
          redemption_type,
          reward_source
        )
      )
    `)
    .eq('id', progressId)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .single();

  if (progressError || !progress) {
    return null;
  }

  const mission = progress.missions as any;
  const reward = mission.rewards as any;

  // Get redemption if exists
  let redemption = null;
  const { data: redemptionData } = await supabase
    .from('redemptions')
    .select(`
      id,
      status,
      claimed_at,
      fulfilled_at,
      concluded_at,
      rejected_at,
      scheduled_activation_date,
      scheduled_activation_time,
      activation_date,
      expiration_date
    `)
    .eq('mission_progress_id', progressId)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .single();
  redemption = redemptionData;

  return {
    mission: {
      id: mission.id,
      type: mission.mission_type,
      displayName: mission.display_name,
      title: mission.title,
      description: mission.description,
      targetValue: mission.target_value,
      targetUnit: mission.target_unit,
      raffleEndDate: mission.raffle_end_date,
      activated: mission.activated,
      tierEligibility: mission.tier_eligibility,
      previewFromTier: mission.preview_from_tier,
      enabled: mission.enabled,
      displayOrder: mission.display_order,
    },
    reward: {
      id: reward.id,
      type: reward.type,
      name: reward.name,
      description: reward.description,
      valueData: reward.value_data,
      redemptionType: reward.redemption_type,
      rewardSource: reward.reward_source,
    },
    progress: {
      id: progress.id,
      currentValue: progress.current_value,
      status: progress.status,
      completedAt: progress.completed_at,
      checkpointStart: progress.checkpoint_start,
      checkpointEnd: progress.checkpoint_end,
    },
    redemption: redemption ? {
      id: redemption.id,
      status: redemption.status,
      claimedAt: redemption.claimed_at,
      fulfilledAt: redemption.fulfilled_at,
      concludedAt: redemption.concluded_at,
      rejectedAt: redemption.rejected_at,
      scheduledActivationDate: redemption.scheduled_activation_date,
      scheduledActivationTime: redemption.scheduled_activation_time,
      activationDate: redemption.activation_date,
      expirationDate: redemption.expiration_date,
    } : null,
  };
}
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`

**Before (line 1009):**
```typescript
const mission = await missionRepository.findById(missionProgressId, userId, clientId);
```

**After:**
```typescript
const mission = await missionRepository.findByProgressId(missionProgressId, userId, clientId);
```

**Explanation:** The service already expects `mission_progress.id` (parameter named `missionProgressId`). We just need to call the correct repository method that queries by progress ID instead of mission ID.

---

### 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/repositories/missionRepository.ts` | MODIFY | Rename `findById` → `findByMissionId`, add `findByProgressId()` method (~70 lines) |
| `appcode/lib/services/missionService.ts` | MODIFY | Change `findById` to `findByProgressId` (1 line) |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | MODIFY | Rename internal param `missionId` → `progressId`, add clarifying comment (Auditor request) |

### Dependency Graph

```
missionRepository.ts (adding findByProgressId)
├── imports from: @/lib/supabase/server-client
├── imported by: missionService.ts
└── affects: claimMissionReward flow

missionService.ts (changing method call)
├── imports from: missionRepository
├── imported by: /api/missions/[missionId]/claim/route.ts
└── affects: All mission claim operations
```

---

### 9. Data Flow Analysis

#### Before Fix

```
Frontend (progressId)
    ↓
API Route (passes to service)
    ↓
Service.claimMissionReward(progressId)
    ↓
Repository.findById(progressId)
    ↓
Query: SELECT * FROM missions WHERE id = progressId
    ↓
❌ NO ROWS (progressId is in mission_progress, not missions)
    ↓
Returns null → "Mission not found"
```

#### After Fix

```
Frontend (progressId)
    ↓
API Route (passes to service)
    ↓
Service.claimMissionReward(progressId)
    ↓
Repository.findByProgressId(progressId)
    ↓
Query: SELECT * FROM mission_progress
       JOIN missions ON missions.id = mission_progress.mission_id
       WHERE mission_progress.id = progressId
    ↓
✅ FOUND (progressId exists in mission_progress)
    ↓
Returns mission data → Claim proceeds
```

#### Data Transformation Steps

1. **Frontend sends progressId**: The dashboard returns `mission.progressId` which is `mission_progress.id`
2. **Repository queries mission_progress**: Find the progress record by its ID
3. **Join to missions**: Get the mission template via `mission_progress.mission_id` FK
4. **Join to rewards**: Get reward details via `missions.reward_id` FK
5. **Get redemption**: Query redemptions by `mission_progress_id`
6. **Return complete data**: All data needed for claim validation

---

### 10. Call Chain Mapping

#### Affected Call Chain

```
[Button Click] (home-client.tsx)
│
├─► handleClaimReward()
│   └── Calls fetch('/api/missions/{progressId}/claim')
│
├─► POST /api/missions/[missionId]/claim/route.ts
│   └── Validates auth, calls claimMissionReward()
│
├─► claimMissionReward() (missionService.ts:1001)
│   ├── Calls missionRepository.findById() ← ⚠️ BUG IS HERE
│   └── Returns "Mission not found" if null
│
└─► findById() (missionRepository.ts:689)
    └── Queries missions.id instead of mission_progress.id
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | mission_progress, missions tables | progressId is in mission_progress, not missions |
| Repository | `findById()` | Queries wrong table (missions instead of mission_progress) |
| Service | `claimMissionReward()` | Receives correct ID, calls wrong method |
| API Route | `/api/missions/[missionId]/claim` | Passes ID correctly, receives error |
| Frontend | `handleClaimReward()` | Sends correct progressId, shows error toast |

---

### 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `mission_progress` | `id`, `mission_id`, `user_id`, `status` | Progress record with FK to missions |
| `missions` | `id`, `reward_id`, `tier_eligibility` | Mission template |
| `rewards` | `id`, `type`, `value_data` | Reward details |
| `redemptions` | `id`, `mission_progress_id`, `status` | Claim records link to progress, not mission |

#### Schema Check

```sql
-- Verify FK relationship exists
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'mission_progress'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Expected: mission_progress.mission_id → missions.id
```

#### Data Migration Required?
- [x] No - schema already supports fix (FK relationship exists)

---

### 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| HomeClient | `app/home/home-client.tsx` | None - already sends progressId correctly |
| MissionsClient | `app/missions/missions-client.tsx` | None - sends mission.id which needs review |
| ClaimPhysicalGiftModal | `components/claim-physical-gift-modal.tsx` | None - receives progressId correctly |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| Request URL param | mission_progress.id (intended) | mission_progress.id (unchanged) | No |
| Response | 404 "Mission not found" | 200 with claim result | No (fix) |

### Frontend Changes Required?
- [x] No - frontend already sends correct ID (progressId)

---

### 13. Alternative Solutions Considered

#### Option A: Modify existing `findById` to handle both ID types
- **Description:** Add logic to check both `missions.id` and `mission_progress.id`
- **Pros:** Single method, no new code
- **Cons:** Ambiguous, could match wrong record, violates single responsibility
- **Verdict:** ❌ Rejected - ambiguous behavior is dangerous

#### Option B: Rename `findById` → `findByMissionId` + Add `findByProgressId` (Selected - Auditor Approved)
- **Description:** Rename existing method for clarity, add dedicated method for progress lookup
- **Pros:** Self-documenting API, explicit naming, no ambiguity, preserves mission lookup path
- **Cons:** Slightly more code, rename is technically breaking (but only 1 caller, already searched)
- **Verdict:** ✅ Selected - cleaner long-term shape, auditor approved

#### Option C: Only add `findByProgressId`, keep `findById` unchanged
- **Description:** Add new method but don't rename existing
- **Pros:** Non-breaking, clear intent for new method
- **Cons:** `findById` name remains misleading (doesn't specify which ID)
- **Verdict:** ❌ Rejected - leaves ambiguous naming in codebase

#### Option D: Change frontend to send `missions.id` instead
- **Description:** Modify dashboard to return `missions.id` and use that for claims
- **Pros:** No backend changes
- **Cons:** Violates API contract, requires frontend changes, loses progress context
- **Verdict:** ❌ Rejected - API contract explicitly says to use mission_progress.id

---

### 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| New method has bugs | Low | High | Copy proven query patterns from existing code |
| Breaking existing functionality | Low | High | Keep existing `findById` unchanged |
| Performance regression | Low | Low | Same query complexity, just different starting table |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Same endpoint, same request format |
| Database | No | No schema changes |
| Frontend | No | No changes needed |

---

### 14.1 Auditor Clarifications (Second Review)

#### Concern 1: client_id filter on mission_progress

**Question:** Does `mission_progress.client_id` exist and is it indexed?

**Resolution:** ✅ Confirmed
- Schema (line 434): `client_id UUID NOT NULL REFERENCES clients(id)` - column exists
- Index (line 457): `idx_mission_progress_tenant(client_id, user_id, status)` - composite index exists
- **Performance note:** Query filters on `(id, user_id, client_id)`. Since `id` is PK, lookup is O(1) regardless of composite index. No performance regression.

#### Concern 2: API/Type contract clarity

**Question:** Is the URL param clearly documented as `mission_progress.id`?

**Resolution:** ⚠️ Needs internal rename for clarity
- API_CONTRACTS.md (line 2987) clearly states: `id: string // UUID from mission_progress.id (NOT missions.id)`
- However, route handler uses confusing variable name `missionId`
- **Action:** Rename internal param `missionId` → `progressId` in route.ts and add clarifying comment

#### Concern 3: Second DB call trade-off

**Question:** The new method adds a second DB call for redemptions.

**Resolution:** ✅ Acceptable
- Same pattern as existing `findById` method (makes separate redemption query)
- No regression - we're matching existing behavior
- Future optimization possible with single JOIN query if needed

---

### 15. Testing Strategy

#### Unit Tests

**File:** `appcode/tests/unit/repositories/missionRepository.test.ts`
```typescript
describe('missionRepository.findByProgressId', () => {
  it('should find mission by mission_progress.id', async () => {
    // Setup: Create mission, progress, redemption
    const result = await missionRepository.findByProgressId(
      progressId,
      userId,
      clientId
    );

    expect(result).not.toBeNull();
    expect(result?.progress?.id).toBe(progressId);
    expect(result?.mission?.id).toBe(missionId);
  });

  it('should return null for non-existent progress ID', async () => {
    const result = await missionRepository.findByProgressId(
      'non-existent-id',
      userId,
      clientId
    );

    expect(result).toBeNull();
  });

  it('should enforce user isolation', async () => {
    const result = await missionRepository.findByProgressId(
      progressId,
      'different-user-id',
      clientId
    );

    expect(result).toBeNull();
  });
});
```

#### Integration Tests

```typescript
describe('Mission Claim Integration', () => {
  it('should successfully claim a completed mission reward', async () => {
    // Setup: User with completed mission
    const response = await fetch(`/api/missions/${progressId}/claim`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

#### Manual Verification Steps

1. [ ] Log in as test user with completed mission
2. [ ] Navigate to Home page
3. [ ] Verify "Claim" button is visible for completed mission
4. [ ] Click "Claim" button
5. [ ] Verify success toast appears (not "Mission not found")
6. [ ] Verify page reloads and mission status updates

#### Verification Commands

```bash
# Run specific tests
npm test -- missionRepository.test.ts

# Type check
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit

# Build verification
cd /home/jorge/Loyalty/Rumi/appcode && npm run build
```

---

### 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Rename `findById` → `findByMissionId` in missionRepository
  - File: `appcode/lib/repositories/missionRepository.ts`
  - Change: Rename method at line 689 for explicit naming
- [ ] **Step 2:** Add `findByProgressId` method to missionRepository
  - File: `appcode/lib/repositories/missionRepository.ts`
  - Change: Add new method after `findByMissionId` (~line 768)
- [ ] **Step 3:** Update service to call `findByProgressId`
  - File: `appcode/lib/services/missionService.ts`
  - Change: Line 1009: `findById` → `findByProgressId`
- [ ] **Step 4:** Rename internal param in route.ts for clarity (Auditor Clarification)
  - File: `appcode/app/api/missions/[missionId]/claim/route.ts`
  - Change: Rename `missionId` → `progressId` in destructuring and usage
  - Change: Add comment clarifying URL `:id` is `mission_progress.id` per API_CONTRACTS.md

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update GAP-001 status (was blocked by this bug)

---

### 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| GAP-001 | Home Page Reward Claim Flow | Blocked - claim API returns 404 |

#### Updates Required

**GAP-001:**
- Current Status: Implementation complete, but claim fails with "Mission not found"
- Updated Status: Blocked by BUG-002
- Notes: Once BUG-002 is fixed, GAP-001 should work end-to-end

#### New Tasks Created
- [x] BUG-002: Fix missionRepository to query by mission_progress.id

---

### 18. Definition of Done

- [ ] `findById` renamed to `findByMissionId` in missionRepository
- [ ] `findByProgressId` method added to missionRepository
- [ ] missionService updated to call `findByProgressId`
- [ ] Route.ts internal param renamed `missionId` → `progressId` with clarifying comment
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New tests added for `findByProgressId`
- [ ] Build completes successfully
- [ ] Manual verification: Claim button works on Home page
- [ ] This document status updated to "Implemented"

---

### 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `API_CONTRACTS.md` | "GET /api/missions Response Schema", "POST /api/missions/:id/claim" | Defines that claim endpoint expects mission_progress.id |
| `SchemaFinalv2.md` | "missions Table (2.1)", "mission_progress Table (2.2)", "redemptions Table" | Shows table relationships and FK constraints |
| `lib/types/dashboard-rpc.ts` | "featuredMission interface" | Shows progressId vs missionId distinction |
| `lib/services/missionService.ts` | "claimMissionReward function" | Shows service expects missionProgressId |
| `lib/repositories/missionRepository.ts` | "findById function" | Bug location - queries wrong table |

### Reading Order for External Auditor

1. **First:** `API_CONTRACTS.md` - "GET /api/missions Response Schema" (line 2987) - Shows design intent for ID usage
2. **Second:** `SchemaFinalv2.md` - "mission_progress Table" - Understand the FK relationship
3. **Third:** `lib/services/missionService.ts` - "claimMissionReward" - See the correct parameter naming
4. **Fourth:** `lib/repositories/missionRepository.ts` - "findById" - See the bug in the query

---

**Document Version:** 1.0
**Last Updated:** 2025-12-17
**Author:** Claude Code (Opus 4.5)
**Status:** Analysis Complete
