# Raffle Participate ID Mismatch - Fix Documentation

**Bug ID:** BUG-RAFFLE-001
**Created:** 2024-12-24
**Status:** Analysis Complete
**Severity:** Critical
**Related Tasks:** Raffle participation flow
**Linked Bugs:** None

---

## 1. Project Context

This is a creator loyalty/rewards application built with Next.js 14, TypeScript, Supabase (PostgreSQL + Auth), and deployed on Vercel. The system manages VIP tiers, missions, and rewards for TikTok Shop creators.

The bug affects the **raffle participation feature** where users enter raffles to win prizes. When a user clicks "Participate" on a raffle mission, the frontend sends the wrong ID to the backend, causing a 404 error and preventing all raffle entries.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL, Auth, RLS), Vercel
**Architecture Pattern:** Repository → Service → API Route → Frontend Client Component

---

## 2. Bug Summary

**What's happening:** When a user clicks the "Participate" button on a raffle mission, the frontend sends `mission_progress.id` to the participate API endpoint, but the endpoint expects `mission.id`. This results in a 404 "Mission not found" error because the endpoint queries the `missions` table with a UUID that belongs to the `mission_progress` table.

**What should happen:** The frontend should send `mission.id` to the participate endpoint, which would correctly find the mission and create the participation records.

**Impact:** 100% of raffle participation attempts fail in production when `mission_progress` rows exist (which is always the case after the daily cron runs). Users cannot enter any raffles.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `lib/services/missionService.ts` | `formatMissionItem()` function, return statement | Returns `id: progress?.id ?? mission.id` - uses progress ID when it exists, only falls back to mission ID when progress is null |
| `app/api/missions/[missionId]/participate/route.ts` | POST handler, line 94-98 | Passes `missionId` param directly to `participateInRaffle()` which queries `missions` table |
| `app/api/missions/[missionId]/claim/route.ts` | POST handler, lines 46-48 | Comment explicitly states: "Despite folder name [missionId], this param is actually mission_progress.id" |
| `lib/repositories/raffleRepository.ts` | `participate()` function, lines 67-87 | Queries `missions` table with `.eq('id', missionId)` - expects mission.id, not progress.id |
| `app/missions/missions-client.tsx` | `handleParticipateRaffle()` function | Calls `/api/missions/${mission.id}/participate` using the `id` field from API response |
| `MissionsRewardsFlows.md` | RAFFLE FLOW - ATTRIBUTE MAPPING, Step 2 | Documents that participation creates records in mission_progress, redemptions, and raffle_participations |
| `SchemaFinalv2.md` | missions table, mission_progress table | Confirms these are separate tables with separate UUIDs |
| Browser Network Tab | POST request to participate endpoint | Shows request to `/api/missions/24a2af78-69e7-413d-8f15-cdb2c8714366/participate` returning 404 - this UUID is from mission_progress, not missions |

### Key Evidence

**Evidence 1:** API returns wrong ID for participate action
- Source: `lib/services/missionService.ts`, `formatMissionItem()` return statement
- Code: `id: progress?.id ?? mission.id`
- Implication: When `mission_progress` exists (normal production state), the API returns `progress.id` instead of `mission.id`

**Evidence 2:** Participate endpoint expects mission.id
- Source: `lib/repositories/raffleRepository.ts`, `participate()` function
- Code: `.from('missions').select(...).eq('id', missionId)`
- Implication: The endpoint queries the `missions` table, so it needs the actual `mission.id`

**Evidence 3:** Claim endpoint explicitly expects progress.id (design inconsistency)
- Source: `app/api/missions/[missionId]/claim/route.ts`, lines 46-48
- Code comment: "Despite folder name [missionId], this param is actually mission_progress.id"
- Implication: The same `id` field is used for two different purposes - claim needs progress.id, participate needs mission.id

**Evidence 4:** Browser shows 404 with progress.id in URL
- Source: Browser console during testing
- Error: `POST /api/missions/24a2af78-69e7-413d-8f15-cdb2c8714366/participate 404 (Not Found)`
- Verification: `24a2af78-69e7-413d-8f15-cdb2c8714366` is confirmed to be a `mission_progress.id`, not a `missions.id`

**Evidence 5:** First test worked because no progress row existed
- Source: Testing session discovery
- Finding: Initial participation test succeeded because `mission_progress` didn't exist, so API returned `mission.id` as fallback
- Implication: Bug only manifests when `mission_progress` exists (which is always true in production after cron runs)

---

## 4. Root Cause Analysis

**Root Cause:** The missions API returns a single `id` field that serves dual purposes (progress.id for claims, mission.id for participate), but only returns the correct ID for claims when progress exists.

**Contributing Factors:**
1. **Design conflict:** The claim endpoint expects `mission_progress.id` while the participate endpoint expects `mission.id`, but both use the same `id` field from the API response
2. **Fallback logic hides the bug:** `progress?.id ?? mission.id` only returns `mission.id` when progress is null, which is an edge case not representative of production
3. **No separate field for mission.id:** The API doesn't expose `mission.id` as a distinct field when progress exists
4. **Inconsistent endpoint design:** Both endpoints use the same URL parameter name `missionId` but expect different table IDs

**How it was introduced:** Design oversight during implementation. The `id` field was optimized for the claim flow (which is more common) without considering that participate needs the actual mission ID.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| **User experience** | Users cannot enter any raffles - "Failed to enter raffle" error | Critical |
| **Feature functionality** | Raffle feature is 100% broken in production | Critical |
| **Engagement** | Lost user engagement from raffle feature | High |
| **Customer trust** | Visible errors damage platform credibility | High |
| **Data integrity** | No participation records created (no data corruption) | Low |

**Business Risk Summary:** This is a critical bug that completely breaks the raffle participation feature. In production, where `mission_progress` rows always exist (created by daily cron), 100% of raffle entries will fail. This directly impacts user engagement and platform functionality.

---

## 6. Current State

#### Current File(s)

**File:** `lib/services/missionService.ts`
```typescript
// formatMissionItem() return statement (around line 770-787)
return {
  id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
  missionType: mission.type,
  displayName: MISSION_DISPLAY_NAMES[mission.type] ?? mission.displayName,
  targetUnit: mission.targetUnit as 'dollars' | 'units' | 'count',
  tierEligibility: mission.tierEligibility,
  rewardType: reward.type,
  rewardDescription: generateRewardDescription(reward.type, valueData, reward.description),
  rewardSource: reward.rewardSource as 'vip_tier' | 'mission',
  status,
  progress: progressData,
  deadline: deadlineData,
  valueData: formattedValueData,
  scheduling: schedulingData,
  raffleData,
  lockedData,
  flippableCard,
};
```

**File:** `app/missions/missions-client.tsx`
```typescript
// handleParticipateRaffle function (around line 249-295)
const handleParticipateRaffle = async (missionId: string) => {
  if (participatingMissionId) return
  setParticipatingMissionId(missionId)
  try {
    const response = await fetch(`/api/missions/${missionId}/participate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    // ... rest of handler
  }
}

// Button onClick (around line 762)
onClick={() => handleParticipateRaffle(mission.id)}
```

**Current Behavior:**
- API returns `id: progress.id` when mission_progress exists
- Frontend passes this `id` to participate endpoint
- Participate endpoint queries `missions` table with progress.id
- No mission found → 404 error → "PARTICIPATION_FAILED"

#### Current Data Flow

```
missions table                 mission_progress table
┌─────────────────────┐       ┌─────────────────────────┐
│ id: bbbb2001-...    │       │ id: 24a2af78-...        │
│ (actual mission)    │       │ mission_id: bbbb2001-...│
└─────────────────────┘       └─────────────────────────┘
           │                              │
           └──────────┬───────────────────┘
                      ▼
              missionService.formatMissionItem()
                      │
                      ▼
              Returns: id = 24a2af78-... (progress.id)
                      │
                      ▼
              Frontend receives mission object
                      │
                      ▼
              User clicks "Participate"
                      │
                      ▼
              POST /api/missions/24a2af78-.../participate
                      │
                      ▼
              raffleRepository.participate()
              SELECT * FROM missions WHERE id = '24a2af78-...'
                      │
                      ▼
              ❌ No rows found → 404 "Mission not found"
```

---

## 7. Proposed Fix

#### Approach
Fix the `id` field to always contain `mission.id` (matching the type contract), and add a new `progressId` field for claim calls. This aligns with the documented contract in `lib/types/missions.ts` which specifies `id` as "UUID from missions.id".

#### Changes Required

**File:** `lib/services/missionService.ts`

**Change 1 - formatMissionItem return statement:**

**Before:**
```typescript
return {
  id: progress?.id ?? mission.id, // Use progress ID for claim calls, mission ID as fallback
  missionType: mission.type,
  // ... rest of fields
};
```

**After:**
```typescript
return {
  id: mission.id, // Always mission.id (matches type contract)
  progressId: progress?.id ?? null, // For claim calls that need progress ID
  missionType: mission.type,
  // ... rest of fields
};
```

**Explanation:** Fix `id` to always be `mission.id` as the contract specifies. Add `progressId` for claim operations.

---

**Change 2 - featuredMissionId assignment (around line 880):**

**Before:**
```typescript
featuredMissionId = item.id;
```

**After:**
```typescript
featuredMissionId = item.id; // Now correctly uses mission.id after Change 1
```

**Explanation:** No code change needed here - once `id` is fixed to be `mission.id`, this automatically works correctly.

---

**File:** `app/missions/missions-client.tsx`

**No changes needed for participate button** - it already uses `mission.id` which will now be correct.

**Update handleClaimMission to use progressId:**

**Before:**
```typescript
await claimMissionReward(
  {
    missionProgressId: mission.id, // Currently using id (which was progress.id)
    ...
  },
  ...
)
```

**After:**
```typescript
await claimMissionReward(
  {
    missionProgressId: mission.progressId || mission.id, // Use progressId, fallback to id
    ...
  },
  ...
)
```

**Explanation:** Claim calls need `progressId` (mission_progress.id), not `mission.id`.

---

**File:** `lib/types/missions.ts`

**Before:**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  missionType: MissionType
  // ... rest of fields
}
```

**After:**
```typescript
export interface Mission {
  // Core mission data
  id: string                          // UUID from missions.id
  progressId: string | null           // UUID from mission_progress.id (for claim calls, null if no progress)
  missionType: MissionType
  // ... rest of fields
}
```

**Explanation:** Add `progressId` field to type. The `id` field comment is already correct.

---

### Type Definitions

```typescript
// Update to Mission interface in lib/types/missions.ts
export interface Mission {
  id: string;              // Always missions.id (matches existing contract)
  progressId: string | null; // mission_progress.id (for claim calls, null if no progress)
  missionType: MissionType;
  displayName: string;
  // ... rest of existing fields unchanged
}
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `lib/services/missionService.ts` | MODIFY | Fix `id` to be `mission.id`, add `progressId: progress?.id ?? null` |
| `app/missions/missions-client.tsx` | MODIFY | Update claim calls and physical gift modal to use `progressId` |
| `lib/types/missions.ts` | MODIFY | Add `progressId: string \| null` to `Mission` interface |
| `API_CONTRACTS.md` | MODIFY | Update `id` documentation, add `progressId` field, clarify claim endpoint param |
| `components/claim-physical-gift-modal.tsx` | NO CHANGE | Modal receives ID from caller; callers are updated (see 8b) |

---

## 8a. Dashboard vs Missions Service Comparison

The dashboard service **already implements the correct pattern**. Only the missions service needs fixing:

| Service | `id` field | `progressId` field | Status |
|---------|------------|-------------------|--------|
| `dashboardService.ts` | `mission.id` | `progress?.id ?? null` | ✅ Correct |
| `missionService.ts` | `progress?.id ?? mission.id` | Not present | ❌ Bug |

**Evidence from dashboardService.ts (lines 289-290, 543-544):**
```typescript
mission: {
  id: fm.missionId,
  progressId: fm.progressId ?? null,
  // ...
}
```

The fix aligns missionService.ts with the existing correct pattern in dashboardService.ts.

---

## 8b. Complete Claim Call Site Enumeration

All locations that call the `/api/missions/[id]/claim` endpoint:

| File | Line | Current Code | After Fix | Action |
|------|------|--------------|-----------|--------|
| `missions-client.tsx` | 123 | `missionProgressId: mission.id` | `mission.progressId \|\| mission.id` | ✅ UPDATE |
| `missions-client.tsx` | 146 | `selectedMission.id` | `selectedMission.progressId \|\| selectedMission.id` | ✅ UPDATE |
| `missions-client.tsx` | 204 | `selectedMission.id` | `selectedMission.progressId \|\| selectedMission.id` | ✅ UPDATE |
| `missions-client.tsx` | 903 | `reward={selectedPhysicalGift}` (uses `mission.id` internally) | Transform to use `progressId` | ✅ UPDATE |
| `home-client.tsx` | 160 | `missionProgressId: mission.progressId` | No change | ✅ Already correct |
| `home-client.tsx` | 203 | `mission.progressId` | No change | ✅ Already correct |
| `home-client.tsx` | 236 | `mission.progressId` | No change | ✅ Already correct |
| `home-client.tsx` | 520 | `id: mission.progressId` (physical gift modal) | No change | ✅ Already correct |
| `rewards-client.tsx` | 699 | `reward={selectedPhysicalGift}` | No change (uses benefit.id from rewards API) | ⚠️ Different flow |
| `claim-physical-gift-modal.tsx` | 73 | `reward.id` | No change (receives ID from caller) | ➖ N/A (depends on caller) |

**Key finding:** `home-client.tsx` already uses `progressId` pattern (aligned with dashboardService). Only `missions-client.tsx` needs updates.

---

## 8c. API Route Naming Clarification

> **IMPORTANT: Route Parameter Semantics**
>
> The route `/api/missions/[missionId]/claim` has a **misleading folder name**. Despite the `[missionId]` param name, it expects `mission_progress.id`, NOT `missions.id`.
>
> This is documented in the route handler comment (lines 46-48):
> ```typescript
> // NOTE: Despite folder name [missionId], this param is actually mission_progress.id
> // Per API_CONTRACTS.md line 2987: "UUID from mission_progress.id (NOT missions.id)"
> ```
>
> **Future consumers must pass `progressId` to this endpoint, not `mission.id`.**

---

## 8d. API_CONTRACTS.md Updates Required

The current API_CONTRACTS.md (line 2987) documents the **buggy behavior**:
```typescript
id: string  // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)
```

This is incorrect because:
- The participate endpoint (`/api/missions/:id/participate`) expects `missions.id`
- Only the claim endpoint expects `mission_progress.id`

**Required Changes to API_CONTRACTS.md:**

**Change 1 - Line 2987 (Mission object `id` field):**

**Before:**
```typescript
id: string                          // UUID from mission_progress.id (NOT missions.id - for claim/participate calls)
```

**After:**
```typescript
id: string                          // UUID from missions.id
progressId: string | null           // UUID from mission_progress.id (for claim calls; null if no progress)
```

**Change 2 - Line 3720-3727 (Claim endpoint documentation):**

**Before:**
```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim
```

**After:**
```http
POST /api/missions/{progressId}/claim
```

Add clarification note:
```markdown
> **Parameter Clarification:** The `:id` parameter in this endpoint is `mission_progress.id` (aliased as `progressId` in the API response), NOT `missions.id`. Despite the folder name `[missionId]`, callers must pass `progressId` from the missions API response.
```

---

## 8e. claim-physical-gift-modal.tsx Verification

**File:** `components/claim-physical-gift-modal.tsx`

**Finding:** NO CHANGES REQUIRED

The modal:
1. Receives a `reward` prop with an `id` field (line 18, 73)
2. Uses `reward.id` to call the claim endpoint (line 73)
3. Does not determine which ID to use - that's the caller's responsibility

**Callers updated in this fix:**
- `missions-client.tsx` (line 903) - Will transform to pass `progressId`
- `home-client.tsx` (line 520) - Already passes `progressId` ✅
- `rewards-client.tsx` (line 699) - Uses benefits API, not missions API (different flow)

**Conclusion:** The modal is a "pass-through" component. It correctly uses whatever ID the caller provides. The fix ensures callers provide the correct ID (`progressId`).

### Dependency Graph

```
lib/services/missionService.ts
├── imports from: lib/repositories/*, lib/types/*
├── imported by: app/api/missions/route.ts
└── affects: All mission API responses (id now correct, progressId added)

app/missions/missions-client.tsx
├── imports from: types/missions, components/*, lib/*
├── imported by: app/missions/page.tsx
└── affects: Claim button behavior (now uses progressId)

lib/types/missions.ts
├── imports from: None
├── imported by: missionService.ts, missions-client.tsx
└── affects: Type checking across mission features
```

---

## 9. Data Flow Analysis

#### Before Fix

```
missions table              mission_progress table
     │                              │
     └──────────┬───────────────────┘
                ▼
        formatMissionItem()
        id = progress?.id ?? mission.id
                │
                ▼
        Returns: { id: "24a2af78-..." } (WRONG - progress.id)
                │
                ▼
        POST /api/missions/24a2af78-.../participate
                │
                ▼
        ❌ 404 - Mission not found
```

#### After Fix

```
missions table              mission_progress table
     │                              │
     └──────────┬───────────────────┘
                ▼
        formatMissionItem()
        id = progress?.id ?? mission.id
        missionId = mission.id  ← NEW
                │
                ▼
        Returns: { id: "24a2af78-...", missionId: "bbbb2001-..." }
                │
                ▼
        POST /api/missions/bbbb2001-.../participate (uses missionId)
                │
                ▼
        ✅ Mission found - participation created
```

#### Data Transformation Steps

1. **Step 1:** `formatMissionItem()` receives mission and progress data
2. **Step 2:** Function returns object with BOTH `id` (for claims) and `missionId` (for participate)
3. **Step 3:** Frontend uses `missionId` field for participate API calls
4. **Step 4:** Participate endpoint receives correct mission UUID and succeeds

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
User clicks "Participate" button
│
├─► missions-client.tsx: handleParticipateRaffle(mission.missionId)
│   └── Sends POST request to participate endpoint
│
├─► /api/missions/[missionId]/participate/route.ts: POST()
│   ├── Validates auth via Supabase
│   └── Calls participateInRaffle(missionId, ...)
│
├─► missionService.ts: participateInRaffle()
│   └── Calls raffleRepository.participate()
│
├─► raffleRepository.ts: participate()
│   ├── Queries: SELECT * FROM missions WHERE id = missionId
│   ├── ⚠️ BUG WAS HERE - wrong ID caused no results
│   └── Calls RPC: raffle_create_participation()
│
└─► Supabase RPC: raffle_create_participation()
    └── Creates mission_progress, redemption, raffle_participation records
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `missions` table | Queried with wrong ID (progress.id instead of mission.id) |
| Database | `mission_progress` table | Its ID was incorrectly used to query missions table |
| Repository | `raffleRepository.participate()` | Receives wrong ID, query returns no results |
| Service | `missionService.formatMissionItem()` | Returns wrong ID in `id` field for participate use case |
| API Route | `/api/missions/[missionId]/participate` | Passes incorrect ID downstream |
| Frontend | `missions-client.tsx` | Uses `id` field which contains wrong value |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `missions` | `id` (UUID, PK) | This is what participate endpoint needs |
| `mission_progress` | `id` (UUID, PK), `mission_id` (FK to missions) | Its `id` was incorrectly being used |
| `raffle_participations` | `mission_id` (FK to missions) | Requires actual mission.id |

#### Schema Check

```sql
-- Verify missions and mission_progress have different UUIDs
SELECT
  m.id as mission_id,
  mp.id as progress_id,
  m.id = mp.id as ids_match
FROM missions m
JOIN mission_progress mp ON mp.mission_id = m.id
WHERE m.mission_type = 'raffle'
LIMIT 5;

-- Expected: ids_match = false (they should be different)
```

#### Data Migration Required?
- [x] No - schema already supports fix (just need to expose mission.id in API response)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `app/missions/missions-client.tsx` | Minor - update one line to use new field |
| HomeClient | `app/home/home-client.tsx` | Check - may also have participate button |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `id` | `progress.id \|\| mission.id` (incorrect) | `mission.id` (matches contract) | No - aligns with documented contract |
| `progressId` | Not present | `progress.id \|\| null` | No (additive) |

### Frontend Changes Required?
- [x] Yes - Update claim calls to use `mission.progressId || mission.id` instead of `mission.id`

---

## 13. Alternative Solutions Considered

#### Option A: Change participate endpoint to accept progress.id
- **Description:** Modify participate endpoint to look up mission via progress.id
- **Pros:** No API response changes needed
- **Cons:** Semantically wrong (participate is a mission-level action), adds complexity to endpoint
- **Verdict:** ❌ Rejected - violates separation of concerns

#### Option B: Add missionId field, keep id as progress.id
- **Description:** Add dedicated `missionId` field, keep `id` as `progress?.id ?? mission.id`
- **Pros:** Additive change, backward compatible for claim
- **Cons:** Violates type contract (type says `id` is from `missions.id`), leaves `featuredMissionId` broken
- **Verdict:** ❌ Rejected - contract violation, incomplete fix

#### Option C: Fix id to be mission.id, add progressId (Selected)
- **Description:** Change `id` to always be `mission.id` (matching contract), add `progressId` for claim calls
- **Pros:** Matches documented type contract, fixes participate AND featuredMissionId, explicit naming
- **Cons:** Requires updating claim calls to use new `progressId` field
- **Verdict:** ✅ Selected - aligns with contract, complete fix

#### Option D: Change claim endpoint to use mission.id
- **Description:** Modify claim endpoint to accept mission.id instead of progress.id
- **Pros:** Simplest - just use mission.id everywhere
- **Cons:** Claim endpoint design explicitly uses progress.id for good reasons (can have multiple progress rows per mission)
- **Verdict:** ❌ Rejected - would break claim functionality design

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type errors from new field | Low | Low | Update TypeScript interface before code changes |
| Claim functionality breaks | Low | High | Keep existing `id` field unchanged |
| Frontend doesn't use new field | Low | Medium | Use fallback: `mission.missionId \|\| mission.id` |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Additive field, existing `id` unchanged |
| Database | No | No schema changes |
| Frontend | No | Graceful fallback handles both old and new API |

---

## 15. Testing Strategy

#### Unit Tests

**File:** `tests/unit/services/missionService.test.ts`
```typescript
describe('formatMissionItem', () => {
  it('should include missionId field with actual mission UUID', async () => {
    const mission = { id: 'mission-uuid-123', type: 'raffle', ... };
    const progress = { id: 'progress-uuid-456', mission_id: 'mission-uuid-123', ... };

    const result = formatMissionItem(mission, progress, reward, ...);

    expect(result.id).toBe('progress-uuid-456'); // For claims
    expect(result.missionId).toBe('mission-uuid-123'); // For participate
  });

  it('should include missionId even when progress is null', async () => {
    const mission = { id: 'mission-uuid-123', type: 'raffle', ... };

    const result = formatMissionItem(mission, null, reward, ...);

    expect(result.id).toBe('mission-uuid-123');
    expect(result.missionId).toBe('mission-uuid-123');
  });
});
```

#### Integration Tests

```typescript
describe('Raffle Participation Integration', () => {
  it('should successfully participate in raffle using missionId', async () => {
    // Setup: Create mission and mission_progress
    const mission = await createTestMission({ type: 'raffle', activated: true });
    const progress = await createTestProgress({ missionId: mission.id, status: 'active' });

    // Act: Call participate endpoint with mission.id (not progress.id)
    const response = await fetch(`/api/missions/${mission.id}/participate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

#### Manual Verification Steps

1. [ ] Deploy fix to Vercel preview environment
2. [ ] Log in as Silver tier user (testsilver or silver11)
3. [ ] Navigate to Missions page
4. [ ] Verify raffle mission shows "Participate" button
5. [ ] Click "Participate" button
6. [ ] Verify success toast appears
7. [ ] Verify card changes to "Waiting for Draw" state
8. [ ] Check Supabase: verify `raffle_participations` row created

#### Verification Commands

```bash
# Run specific tests
npm test -- missionService.test.ts

# Type check
npx tsc --noEmit

# Build verification
npm run build
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Update TypeScript interface
  - File: `lib/types/missions.ts`
  - Change: Add `progressId: string | null` to `Mission` interface (after `id` field)
- [ ] **Step 2:** Update service return object
  - File: `lib/services/missionService.ts`
  - Change: In `formatMissionItem()` return, change `id: progress?.id ?? mission.id` to `id: mission.id`
  - Change: Add `progressId: progress?.id ?? null` after `id` field
- [ ] **Step 3:** Update missions-client.tsx claim calls (4 locations)
  - File: `app/missions/missions-client.tsx`
  - Line ~123: `claimMissionReward({ missionProgressId: mission.id, ...})` → `mission.progressId || mission.id`
  - Line ~146: `fetch('/api/missions/${selectedMission.id}/claim')` → `selectedMission.progressId || selectedMission.id`
  - Line ~204: `fetch('/api/missions/${selectedMission.id}/claim')` → `selectedMission.progressId || selectedMission.id`
  - Line ~903: Physical gift modal - transform to pass `progressId`:
    ```typescript
    reward={{
      ...selectedPhysicalGift,
      id: selectedPhysicalGift.progressId || selectedPhysicalGift.id
    }}
    ```
- [ ] **Step 4:** Verify home-client.tsx (no changes expected)
  - File: `app/home/home-client.tsx`
  - Verify: Already uses `progressId` pattern (lines 160, 203, 236, 520) ✅
- [ ] **Step 5:** Verify rewards-client.tsx (no changes expected)
  - File: `app/rewards/rewards-client.tsx`
  - Verify: Uses benefits from rewards API, not missions API - different flow ✅
- [ ] **Step 6:** Update API_CONTRACTS.md
  - File: `API_CONTRACTS.md`
  - Line 2987: Change `id` comment to "UUID from missions.id"
  - Line 2987: Add `progressId: string | null` field after `id`
  - Line 3720-3727: Add clarification note that `:id` param is `progressId` (mission_progress.id)
- [ ] **Step 7:** Verify claim-physical-gift-modal.tsx (no changes expected)
  - File: `components/claim-physical-gift-modal.tsx`
  - Verify: Modal is pass-through; uses whatever ID caller provides ✅

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Deploy to Vercel and test in production

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | Raffle feature | This bug blocks raffle participation entirely |

#### Updates Required

No EXECUTION_PLAN.md updates required - this is a bug fix, not a planned task.

#### New Tasks Created (if any)
- [ ] Verify raffle participation works end-to-end after fix

---

## 18. Definition of Done

- [ ] All code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New tests added per "Testing Strategy" section
- [ ] Build completes successfully
- [ ] Manual verification steps completed
- [ ] Raffle participation works for users with existing mission_progress
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `lib/services/missionService.ts` | `formatMissionItem()` function | Shows where API response is constructed |
| `app/api/missions/[missionId]/participate/route.ts` | POST handler | Shows participate endpoint expects mission.id |
| `app/api/missions/[missionId]/claim/route.ts` | POST handler, comment on lines 46-48 | Proves design inconsistency - claim expects progress.id |
| `lib/repositories/raffleRepository.ts` | `participate()` function | Shows missions table query with missionId |
| `app/missions/missions-client.tsx` | `handleParticipateRaffle()` | Shows frontend using id field |
| `MissionsRewardsFlows.md` | RAFFLE FLOW - ATTRIBUTE MAPPING | Documents expected raffle participation flow |
| `SchemaFinalv2.md` | missions table, mission_progress table | Confirms separate table UUIDs |

### Reading Order for External Auditor

1. **First:** `MissionsRewardsFlows.md` - RAFFLE FLOW section - Provides context on how raffle participation should work
2. **Second:** `lib/services/missionService.ts` - `formatMissionItem()` - Shows the root cause (id field logic)
3. **Third:** `app/api/missions/[missionId]/participate/route.ts` - Shows what ID the endpoint expects
4. **Fourth:** `lib/repositories/raffleRepository.ts` - `participate()` - Confirms missions table query
5. **Fifth:** `app/api/missions/[missionId]/claim/route.ts` - Comment proves design inconsistency

---

**Document Version:** 1.0
**Last Updated:** 2024-12-24
**Author:** Claude Code
**Status:** Analysis Complete
