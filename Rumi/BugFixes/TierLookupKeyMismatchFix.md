# Tier Lookup Key Mismatch - Fix Documentation

**Bug ID:** BUG-006-TierLookupKeyMismatch
**Created:** 2025-12-18
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** Missions Page Locked Badge Display
**Linked Bugs:** None

---

## 1. Project Context

This is a loyalty/gamification platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system enables content creators to complete missions, earn rewards, and progress through VIP tiers (Bronze, Silver, Gold, Platinum).

The bug affects the **Missions page** (`/missions`) where creators see available missions. Missions have tier eligibility requirements - some are "locked" for lower-tier users but visible as a preview. When locked, a badge should display the required tier name (e.g., "Gold") but instead displays the raw tier_id (e.g., "tier_3").

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with RPC functions

---

## 2. Bug Summary

**What's happening:** Locked missions on the Missions page display the raw `tier_id` value (e.g., "tier_3") instead of the human-readable tier name (e.g., "Gold") in the lock badge.

**What should happen:** The lock badge should display "Gold" (or whatever the tier name is) based on the `tiers` table configuration.

**Impact:** Poor user experience - creators see cryptic identifiers instead of meaningful tier names. Does not affect functionality, only display.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `SchemaFinalv2.md` | Section 1.6 - tiers Table | `tier_id` (VARCHAR) stores internal ID like 'tier_1', 'tier_3'. `id` (UUID) is primary key. These are different fields. |
| `SchemaFinalv2.md` | Section 2.1 - missions Table | `tier_eligibility` stores values like 'tier_1', 'tier_3' (matches `tiers.tier_id`, NOT `tiers.id`) |
| `DATA_FLOWS.md` | /home (Dashboard) - Database Tables | Documents that `tiers.tier_id` is the internal identifier used for tier_eligibility comparisons |
| `repodocs/MISSIONS_IMPL.md` | GET /api/missions - Implementation | Shows `tierLookup.set(tier.id, ...)` at line 114 - uses `tier.id` as map key |
| `appcode/lib/repositories/dashboardRepository.ts` | Line 202 vs 218 | `currentTier.id` uses `tier_id` but `allTiers[].id` uses UUID - **inconsistency** |
| `appcode/app/api/missions/route.ts` | Lines 70-74 | `tierLookup.set(tier.id, ...)` - builds map with whatever `allTiers[].id` returns |
| `appcode/lib/services/missionService.ts` | Lines 846-849 | `tierLookup.get(mission.tierEligibility)` - lookups use 'tier_3' but map keys are UUIDs |
| `appcode/app/missions/missions-client.tsx` | Line 590 | `mission.lockedData?.requiredTierName` - displays whatever backend provides |

### Key Evidence

**Evidence 1:** Schema defines two different ID fields for tiers
- Source: SchemaFinalv2.md, Section 1.6 tiers Table
- `id` - UUID PRIMARY KEY (database identifier)
- `tier_id` - VARCHAR(50) NOT NULL - Internal ID: 'tier_1' through 'tier_6'
- Implication: Code must use `tier_id` for business logic comparisons, not `id`

**Evidence 2:** Missions store tier_eligibility as tier_id values
- Source: SchemaFinalv2.md, Section 2.1 missions Table
- `tier_eligibility` - VARCHAR(50) - Options: 'all', 'tier_1', 'tier_2', 'tier_3', etc.
- Implication: Any lookup using `mission.tierEligibility` must key on `tier_id`, not UUID

**Evidence 3:** Inconsistent ID mapping in dashboardRepository
- Source: `appcode/lib/repositories/dashboardRepository.ts`
- Line 202: `currentTier.id: currentTier.tier_id` → Correctly uses tier_id
- Line 218: `allTiers[].id: tier.id` → Incorrectly uses UUID
- Implication: Same response object has inconsistent ID semantics

**Evidence 4:** tierLookup map built with wrong key type
- Source: `appcode/app/api/missions/route.ts:70-74`
- Code: `tierLookup.set(tier.id, { name: tier.name, color: tier.color })`
- Since `allTiers[].id` is UUID, the map keys are UUIDs
- Implication: Later lookup with 'tier_3' will fail (returns undefined)

**Evidence 5:** Fallback reveals the bug
- Source: `appcode/lib/services/missionService.ts:849`
- Code: `requiredTierName: requiredTierInfo?.name ?? mission.tierEligibility`
- When lookup fails, falls back to raw `tierEligibility` ('tier_3')
- Implication: This is why users see "tier_3" instead of "Gold"

---

## 4. Root Cause Analysis

**Root Cause:** The `allTiers` array returned by `dashboardRepository.getUserDashboard()` maps `id` to the database UUID instead of `tier_id`, causing the tierLookup map to be keyed incorrectly.

**Contributing Factors:**
1. Schema has two ID concepts (`id` UUID vs `tier_id` VARCHAR) which creates confusion
2. `currentTier` correctly uses `tier_id` for its `id` field, but `allTiers` does not
3. No TypeScript type enforcement distinguishes UUID from tier_id semantically
4. Fallback behavior masks the lookup failure, making bug non-obvious

**How it was introduced:** During initial implementation, the developer likely copy-pasted field mappings and didn't notice that `currentTier` (line 202) correctly uses `tier_id` while `allTiers` (line 218) uses the wrong field.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Creators see "tier_3" instead of "Gold" - confusing and unprofessional | Medium |
| Data integrity | None - display only, no data corruption | Low |
| Feature functionality | Locked missions still work correctly, just display wrong label | Low |

**Business Risk Summary:** This is a cosmetic bug that makes the UI look unpolished. It doesn't prevent any functionality but creates a poor impression of product quality.

---

## 6. Current State

### Current File(s)

**File:** `appcode/lib/repositories/dashboardRepository.ts`
```typescript
// Lines 178-186: allTiersData mapping
const allTiersData = options?.includeAllTiers
  ? allTiers.map(tier => ({
      id: tier.id,           // ← BUG: Uses UUID instead of tier_id
      tier_name: tier.tier_name,
      tier_color: tier.tier_color,
      tier_order: tier.tier_order,
    }))
  : [];

// Lines 217-222: Final response mapping
allTiers: allTiersData.map(tier => ({
  id: tier.id,              // ← BUG: Propagates UUID
  name: tier.tier_name,
  color: tier.tier_color,
  order: tier.tier_order,
})),
```

**File:** `appcode/app/api/missions/route.ts`
```typescript
// Lines 70-74: Build tier lookup
const tierLookup = new Map<string, { name: string; color: string }>();
if (dashboardData.allTiers) {
  for (const tier of dashboardData.allTiers) {
    tierLookup.set(tier.id, { name: tier.name, color: tier.color });
    // ↑ tier.id is UUID, but lookups use 'tier_3'
  }
}
```

**File:** `appcode/lib/services/missionService.ts`
```typescript
// Lines 846-849: Lookup tier info for locked missions
const requiredTierInfo = tierLookup.get(mission.tierEligibility);
// ↑ mission.tierEligibility = 'tier_3', but map keys are UUIDs
// ↑ Result: requiredTierInfo is undefined

lockedData = {
  requiredTier: mission.tierEligibility,
  requiredTierName: requiredTierInfo?.name ?? mission.tierEligibility,
  // ↑ Falls back to 'tier_3' because lookup failed
```

**Current Behavior:**
- `allTiers[].id` returns UUID (e.g., "aaaa-bbbb-cccc-dddd")
- `tierLookup` is keyed by UUID
- `tierLookup.get('tier_3')` returns `undefined`
- Fallback displays raw 'tier_3' to user

### Current Data Flow

```
dashboardRepository.getUserDashboard()
    ↓
allTiers: [{ id: UUID, name: "Gold", ... }]  ← id is UUID
    ↓
/api/missions/route.ts
    ↓
tierLookup.set(UUID, { name: "Gold" })  ← Map keyed by UUID
    ↓
missionService.ts
    ↓
tierLookup.get('tier_3')  → undefined  ← Lookup fails!
    ↓
requiredTierName = 'tier_3'  ← Fallback to raw value
    ↓
Frontend displays "🔒 tier_3"
```

---

## 7. Proposed Fix

### Approach

Change `allTiers[].id` to use `tier_id` instead of the database UUID, making it consistent with how `currentTier.id` is already handled.

### Changes Required

**File:** `appcode/lib/repositories/dashboardRepository.ts`

**Before (Line 181):**
```typescript
const allTiersData = options?.includeAllTiers
  ? allTiers.map(tier => ({
      id: tier.id,  // UUID
      tier_name: tier.tier_name,
      tier_color: tier.tier_color,
      tier_order: tier.tier_order,
    }))
  : [];
```

**After (Line 181):**
```typescript
const allTiersData = options?.includeAllTiers
  ? allTiers.map(tier => ({
      id: tier.tier_id,  // tier_id (e.g., 'tier_1', 'tier_3')
      tier_name: tier.tier_name,
      tier_color: tier.tier_color,
      tier_order: tier.tier_order,
    }))
  : [];
```

**Explanation:** This single-line change makes `allTiers[].id` consistent with `currentTier.id` (line 202), which already correctly uses `tier_id`. The downstream tierLookup map will now be keyed by 'tier_1', 'tier_3', etc., matching what `mission.tierEligibility` uses for lookups.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/repositories/dashboardRepository.ts` | MODIFY | Change line 181: `id: tier.id` → `id: tier.tier_id` |

### Dependency Graph

```
dashboardRepository.ts (change here)
├── imports from: supabase client
├── imported by: dashboardService.ts, route.ts files
└── affects: /api/missions, /api/dashboard responses
```

---

## 9. Data Flow Analysis

### Before Fix

```
DB Query → tier.id (UUID) → allTiers[].id → tierLookup key → lookup fails → fallback
                 ↓                              ↓                    ↓
          "uuid-value"              Map<UUID, {}>       get('tier_3') = undefined
```

### After Fix

```
DB Query → tier.tier_id → allTiers[].id → tierLookup key → lookup succeeds → display name
                 ↓                              ↓                    ↓
             "tier_3"              Map<'tier_3', {}>    get('tier_3') = { name: "Gold" }
```

### Data Transformation Steps

1. **Database Query:** Fetches all tiers including both `id` (UUID) and `tier_id` ('tier_3')
2. **Repository Mapping:** Maps to `allTiersData` - currently uses wrong field
3. **Response Building:** Builds `allTiers` array in API response
4. **tierLookup Map:** API route builds Map from allTiers
5. **Service Lookup:** missionService looks up tier info using `mission.tierEligibility`
6. **Frontend Display:** Shows `requiredTierName` in lock badge

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/missions (route.ts)
│
├─► dashboardRepository.getUserDashboard() (dashboardRepository.ts)
│   ├── Queries tiers table
│   └── ⚠️ BUG: Maps tier.id (UUID) instead of tier.tier_id
│
├─► tierLookup.set(tier.id, ...) (route.ts:73)
│   └── Map keyed incorrectly
│
└─► listAvailableMissions() → transformMission() (missionService.ts)
    └── tierLookup.get(mission.tierEligibility) (line 846)
        └── ⚠️ Returns undefined, triggers fallback
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | `tiers` table | Source of both `id` and `tier_id` columns |
| Repository | `getUserDashboard()` | **Bug location** - wrong field mapping |
| Service | `transformMission()` | Performs failing lookup |
| API Route | `/api/missions` | Builds tierLookup from bad data |
| Frontend | `missions-client.tsx` | Displays fallback value |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `tiers` | `id` (UUID), `tier_id` (VARCHAR), `tier_name`, `tier_color` | Two different ID concepts |
| `missions` | `tier_eligibility` (VARCHAR) | Stores tier_id values like 'tier_3' |

### Schema Check

```sql
-- Verify tiers table has both id types
SELECT id, tier_id, tier_name
FROM tiers
WHERE client_id = '11111111-1111-1111-1111-111111111111';

-- Example output:
-- id (UUID)                              | tier_id | tier_name
-- 12345678-1234-1234-1234-123456789012   | tier_1  | Bronze
-- 87654321-4321-4321-4321-876543210987   | tier_3  | Gold
```

### Data Migration Required?
- [x] No - schema already supports fix (tier_id column exists)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| MissionsClient | `app/missions/missions-client.tsx` | None - already handles data correctly |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `allTiers[].id` | UUID string | tier_id string (e.g., 'tier_3') | No - same type |

### Frontend Changes Required?
- [x] No - frontend already expects tier_id-style values (matches currentTier.id)

---

## 13. Alternative Solutions Considered

### Option A: Fix in dashboardRepository (Selected)
- **Description:** Change `id: tier.id` to `id: tier.tier_id` in the mapping
- **Pros:** Single line change, matches existing pattern for `currentTier.id`, fixes root cause
- **Cons:** None significant
- **Verdict:** ✅ Selected - minimal change, fixes root cause

### Option B: Fix in API route
- **Description:** Change tierLookup to also store by tier_id separately
- **Pros:** Doesn't change repository response
- **Cons:** Adds complexity, requires knowing tier_id is available
- **Verdict:** ❌ Rejected - would require adding tier_id field to allTiers

### Option C: Fix in missionService
- **Description:** Look up tier by iterating allTiers instead of Map lookup
- **Pros:** Works around bad data
- **Cons:** O(n) instead of O(1), treats symptom not cause
- **Verdict:** ❌ Rejected - inefficient workaround

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Other code depends on allTiers[].id being UUID | **None** | N/A | **Verified:** Only `/api/missions` uses `includeAllTiers: true`. All other callers get empty array. |
| TypeScript type might enforce UUID | Low | Low | Check interface definition |

### Consumer Analysis (Audit Verification)

**Search performed:** `grep -r "includeAllTiers\|getUserDashboard" appcode/app/api/`

**Results:**
| Caller | includeAllTiers | Receives allTiers? |
|--------|-----------------|-------------------|
| `/api/missions/route.ts:59` | `true` | Yes - **only consumer** |
| `/api/dashboard/...` | not passed (default false) | No - empty array |
| `/api/rewards/route.ts:77` | not passed | No - empty array |
| `/api/rewards/history/route.ts:76` | not passed | No - empty array |
| `/api/rewards/[rewardId]/claim/route.ts:101` | not passed | No - empty array |
| `/api/missions/history/route.ts:78` | not passed | No - empty array |

**Conclusion:** Zero risk of breaking other consumers. Only `/api/missions` receives `allTiers` data.

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Same field, different value format |
| Database | No | No schema change |
| Frontend | No | Already expects this format |

---

## 15. Testing Strategy

### Unit Tests

**File:** `appcode/tests/unit/dashboardRepository.test.ts` (if exists)
```typescript
describe('getUserDashboard', () => {
  it('should return allTiers with tier_id as id field', async () => {
    const result = await getUserDashboard(userId, clientId, { includeAllTiers: true });

    // Verify allTiers uses tier_id, not UUID
    expect(result.allTiers[0].id).toMatch(/^tier_\d+$/);
    expect(result.allTiers[0].id).not.toMatch(/^[a-f0-9-]{36}$/);
  });
});
```

### Manual Verification Steps

1. [ ] Log in as a Bronze tier user
2. [ ] Navigate to /missions
3. [ ] Find a mission locked for Gold tier
4. [ ] Verify badge shows "🔒 Gold" (not "🔒 tier_3")

### Verification Commands

```bash
# Type check
npm run typecheck

# Build verification
npm run build

# Run dev server and test manually
npm run dev
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify current code matches "Current State" section
- [ ] Search for other usages of `allTiers[].id` to ensure no breaking changes

### Implementation Steps
- [ ] **Step 1:** Open `appcode/lib/repositories/dashboardRepository.ts`
  - File: `appcode/lib/repositories/dashboardRepository.ts`
  - Change: Line 181, change `id: tier.id` to `id: tier.tier_id`

### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Log in as Bronze user, check locked mission badge
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| N/A | Bug discovered during test data setup | No planned task affected |

### Updates Required

None - this is a bug fix discovered during testing, not related to planned execution tasks.

### New Tasks Created (if any)
- [ ] None

---

## 18. Definition of Done

- [ ] Code change implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification: Locked mission shows "Gold" not "tier_3"
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 1.6 (tiers), Section 2.1 (missions) | Schema definitions showing tier_id vs id |
| DATA_FLOWS.md | /home Dashboard section | Data flow and table relationships |
| repodocs/MISSIONS_IMPL.md | GET /api/missions | Implementation details and call chain |
| appcode/lib/repositories/dashboardRepository.ts | Lines 178-222 | Bug location - allTiers mapping |
| appcode/app/api/missions/route.ts | Lines 70-74 | tierLookup map building |
| appcode/lib/services/missionService.ts | Lines 846-849 | Tier lookup and fallback logic |
| appcode/app/missions/missions-client.tsx | Line 590 | Frontend display of requiredTierName |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 1.6 (tiers Table) - Understand the two ID concepts
2. **Second:** dashboardRepository.ts - Lines 178-222 - See the inconsistent mapping
3. **Third:** missionService.ts - Lines 846-849 - See the failing lookup and fallback
4. **Fourth:** missions-client.tsx - Line 590 - See where the bad value displays

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Claude Code
**Status:** Analysis Complete
