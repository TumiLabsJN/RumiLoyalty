# VIP Metric Mission Type Mismatch - Fix Documentation

**Bug ID:** BUG-VIP-METRIC-001
**Created:** 2025-12-16
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** Phase 9.2 Frontend Integration (EXECUTION_PLAN.md)
**Linked Bugs:** None

---

## 1. Project Context

This is a VIP loyalty rewards application built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system allows brands (clients) to create tiered reward programs for TikTok creators. Each client configures a `vip_metric` setting that determines whether creator progress is measured in **sales dollars** or **units sold**.

The bug affects the **Dashboard/Home page** which displays a featured mission with progress tracking. The mission progress and tier progress should both respect the client's `vip_metric` setting to provide a coherent user experience.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, TailwindCSS
**Architecture Pattern:** Repository → Service → API Route → React Frontend

---

## 2. Bug Summary

**What's happening:** A client with `vip_metric='units'` can have `sales_dollars` type missions in their system. When displayed on the dashboard, the mission progress shows "$45 of $100 sales" while the tier progress correctly shows "25 units of 100 units", creating an inconsistent and confusing user experience.

**What should happen:** If a client's `vip_metric='units'`, only `sales_units` missions should exist (not `sales_dollars`). The UI should be coherent - all sales-related metrics should use the same unit type.

**Impact:** Users see conflicting metrics on the same screen, leading to confusion about how their progress is measured.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `lib/repositories/dashboardRepository.ts` | `getUserDashboard()` function | Retrieves `vip_metric` from clients table and passes to service layer |
| `lib/repositories/missionRepository.ts` | `MISSION_PRIORITY` constant | Defines priority order: sales_dollars (1) > sales_units (2), causing sales_dollars to always win |
| `lib/repositories/missionRepository.ts` | `findFeaturedMission()` function | Has tie-breaker logic for vipMetric but it never executes because priorities differ |
| `lib/services/dashboardService.ts` | `getDashboardOverview()` function | Uses vipMetric for tier progress formatting but not for mission filtering |
| `lib/services/dashboardService.ts` | `getFeaturedMission()` function | Passes vipMetric to repository but no filtering occurs |
| `app/home/page.tsx` | Dashboard UI | Displays both mission progress (potentially $) and tier progress (units) on same screen |
| `scripts/seed-test-users.ts` | Seed configuration | Creates both sales_dollars AND sales_units missions regardless of client vip_metric |
| `clients` table (Supabase) | vip_metric column | Test client has `vip_metric='units'` |
| `missions` table (Supabase) | mission_type column | Contains both `sales_dollars` and `sales_units` for same client |
| `tiers` table (Supabase) | sales_threshold, units_threshold columns | Test client has `sales_threshold=NULL`, only `units_threshold` set |

### Key Evidence

**Evidence 1:** Priority constants prevent vipMetric preference from working
- Source: `lib/repositories/missionRepository.ts`, `MISSION_PRIORITY` constant
- Code:
  ```typescript
  const MISSION_PRIORITY: Record<string, number> = {
    raffle: 0,
    sales_dollars: 1,  // Always higher priority
    sales_units: 2,    // Always lower priority
    videos: 3,
    likes: 4,
    views: 5,
  };
  ```
- Implication: Even with tie-breaker logic, `sales_dollars` always wins over `sales_units`

**Evidence 2:** Tie-breaker logic exists but never executes
- Source: `lib/repositories/missionRepository.ts`, `findFeaturedMission()` sort function
- Code:
  ```typescript
  // For sales type, prefer the one matching vipMetric
  if (priorityA === priorityB) {  // This is NEVER true for sales types
    if (a.mission_type === 'sales_dollars' && vipMetric === 'sales') return -1;
    if (b.mission_type === 'sales_dollars' && vipMetric === 'sales') return 1;
    if (a.mission_type === 'sales_units' && vipMetric === 'units') return -1;
    if (b.mission_type === 'sales_units' && vipMetric === 'units') return 1;
  }
  ```
- Implication: The tie-breaker assumes both sales types have equal priority, but they don't

**Evidence 3:** No database constraint prevents mismatched mission types
- Source: Database schema (missions table)
- Finding: No CHECK constraint or trigger validates that `mission_type` matches client's `vip_metric`
- Implication: Admin can create any mission type regardless of client configuration

**Evidence 4:** Screenshot shows inconsistent metrics
- Source: `/home/jorge/Loyalty/Rumi/Home.png`
- Finding: Mission circle shows "$45 of $100 sales" while tier progress shows "25 units of 100 units"
- Implication: User sees two different measurement systems on same screen

**Evidence 5:** Test data contains mismatched missions
- Source: Supabase query on missions table
- Query Result: Client `11111111-1111-1111-1111-111111111111` has `vip_metric='units'` but contains missions with `mission_type='sales_dollars'`
- Implication: The seed script and/or admin UI allowed creation of incompatible missions

---

## 4. Root Cause Analysis

**Root Cause:** No validation exists at any layer (database, API, or UI) to ensure mission types match the client's configured `vip_metric` setting.

**Contributing Factors:**
1. Database schema lacks constraint on mission_type based on client vip_metric
2. Mission priority logic in repository assumes both sales types can coexist
3. Tie-breaker code is dead code - priorities are never equal
4. Seed scripts create all mission types regardless of client config
5. Admin mission creation UI (presumably) doesn't filter by vip_metric

**How it was introduced:** Design oversight - the `vip_metric` setting was created for tier progress calculation but wasn't enforced as a system-wide constraint affecting mission creation.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Confusing metrics - user sees $ and units on same screen | High |
| Data integrity | Missions exist that shouldn't based on client config | Medium |
| Feature functionality | Featured mission selection ignores client preference | Medium |
| Admin UX | Can create missions that will display incorrectly | Medium |

**Business Risk Summary:** Users may lose trust in the platform when they see conflicting metrics. The discrepancy suggests the system doesn't "know" how to measure their success consistently.

---

## 6. Current State

### Current File(s)

**File:** `lib/repositories/missionRepository.ts`
```typescript
/**
 * Mission type priority order per API_CONTRACTS.md lines 1963-1970
 * Lower number = higher priority
 */
const MISSION_PRIORITY: Record<string, number> = {
  raffle: 0,
  sales_dollars: 1,
  sales_units: 2,
  videos: 3,
  likes: 4,
  views: 5,
};

// In findFeaturedMission() sort function:
.sort((a, b) => {
  // Sort by priority (lower = higher priority)
  const priorityA = MISSION_PRIORITY[a.mission_type] ?? 999;
  const priorityB = MISSION_PRIORITY[b.mission_type] ?? 999;

  // For sales type, prefer the one matching vipMetric
  if (priorityA === priorityB) {
    if (a.mission_type === 'sales_dollars' && vipMetric === 'sales') return -1;
    if (b.mission_type === 'sales_dollars' && vipMetric === 'sales') return 1;
    if (a.mission_type === 'sales_units' && vipMetric === 'units') return -1;
    if (b.mission_type === 'sales_units' && vipMetric === 'units') return 1;
  }

  return priorityA - priorityB;
});
```

**Current Behavior:**
- `sales_dollars` missions always display before `sales_units` regardless of vip_metric
- No filtering prevents mismatched mission types from being selected
- Database accepts any mission_type regardless of client config

### Current Data Flow

```
Admin creates mission
       ↓
missions table (no validation)
       ↓
findFeaturedMission() selects by priority
       ↓
sales_dollars wins (priority 1 < priority 2)
       ↓
Dashboard shows $ values
       ↓
⚠️ Tier progress shows units (vip_metric='units')
       ↓
USER SEES INCONSISTENT METRICS
```

---

## 7. Proposed Fix

### Approach

Add a database trigger to prevent creation of mission types that don't match the client's `vip_metric`. This is defense-in-depth that catches the problem at the source rather than bandaiding the display logic.

### Changes Required

**File:** Database Migration (new)

**Before:** No validation exists

**After:**
```sql
-- Create validation function
CREATE OR REPLACE FUNCTION validate_mission_vip_metric()
RETURNS TRIGGER AS $$
DECLARE
  v_vip_metric TEXT;
BEGIN
  -- Get client's vip_metric setting
  SELECT vip_metric INTO v_vip_metric
  FROM clients
  WHERE id = NEW.client_id;

  -- Validate sales mission types match vip_metric
  IF v_vip_metric = 'units' AND NEW.mission_type = 'sales_dollars' THEN
    RAISE EXCEPTION 'Cannot create sales_dollars mission for client with vip_metric=units. Use sales_units instead.';
  END IF;

  IF v_vip_metric = 'sales' AND NEW.mission_type = 'sales_units' THEN
    RAISE EXCEPTION 'Cannot create sales_units mission for client with vip_metric=sales. Use sales_dollars instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to missions table
CREATE TRIGGER trg_mission_vip_metric_check
  BEFORE INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION validate_mission_vip_metric();
```

**Explanation:** The trigger runs before every INSERT or UPDATE on missions table, checking that the mission_type is compatible with the client's vip_metric. If mismatched, it raises an exception preventing the write.

### Data Cleanup Required

```sql
-- Delete existing mismatched missions for test client
DELETE FROM missions
WHERE client_id = '11111111-1111-1111-1111-111111111111'
  AND mission_type = 'sales_dollars';
```

### Code Cleanup (Optional)

**File:** `lib/repositories/missionRepository.ts`

Remove dead tie-breaker code since it can never execute:

**Before:**
```typescript
// For sales type, prefer the one matching vipMetric
if (priorityA === priorityB) {
  if (a.mission_type === 'sales_dollars' && vipMetric === 'sales') return -1;
  if (b.mission_type === 'sales_dollars' && vipMetric === 'sales') return 1;
  if (a.mission_type === 'sales_units' && vipMetric === 'units') return -1;
  if (b.mission_type === 'sales_units' && vipMetric === 'units') return 1;
}
```

**After:**
```typescript
// REMOVED: Tie-breaker code was dead code.
// Database trigger now prevents mismatched mission types from existing.
// See BugFixes/VipMetricMissionTypeMismatchFix.md
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| Supabase Migration | CREATE | Add trigger function and trigger |
| `lib/repositories/missionRepository.ts` | MODIFY | Remove dead tie-breaker code (optional) |
| `scripts/seed-test-users.ts` | MODIFY | Respect vip_metric when seeding missions (future) |

### Dependency Graph

```
Database Trigger (new)
├── validates: missions INSERT/UPDATE
├── references: clients.vip_metric
└── affects: All mission creation (admin UI, seed scripts, APIs)

missionRepository.ts
├── imports from: supabase client, database types
├── imported by: dashboardService.ts, missionService.ts
└── affects: Featured mission selection (now cleaner with no mismatches)
```

---

## 9. Data Flow Analysis

### Before Fix

```
Admin/Seed → missions table → findFeaturedMission() → Dashboard
     ↓            ↓                   ↓                  ↓
  Any type    No validation    sales_dollars wins    Shows $ values
                                                          ↓
                                              Tier shows units (mismatch!)
```

### After Fix

```
Admin/Seed → Database Trigger → missions table → findFeaturedMission() → Dashboard
     ↓              ↓                ↓                   ↓                  ↓
  Any type    VALIDATES!        Only matching      Correct type       Coherent UI
              Rejects if        types exist        selected
              mismatched
```

### Data Transformation Steps

1. **Step 1:** Admin attempts to create mission with type X
2. **Step 2:** Trigger checks client's vip_metric
3. **Step 3:** If mismatch, EXCEPTION raised - write prevented
4. **Step 4:** If match, write proceeds normally
5. **Step 5:** Dashboard only ever sees compatible missions

---

## 10. Call Chain Mapping

### Affected Call Chain

```
Mission Creation (admin or seed)
│
├─► INSERT INTO missions
│   └── Trigger: validate_mission_vip_metric()
│       ├── Queries clients.vip_metric
│       ├── Compares with NEW.mission_type
│       └── ⚠️ RAISES EXCEPTION if mismatch (NEW)
│
Dashboard Load (/home)
│
├─► GET /api/dashboard
│   └── dashboardService.getDashboardOverview()
│       └── missionRepository.findFeaturedMission()
│           ├── Fetches eligible missions
│           ├── Sorts by priority
│           └── Returns first (now guaranteed to match vip_metric)
│
└─► Frontend renders coherent metrics
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | missions table | Accepts mismatched types (root cause) |
| Database | clients table | Stores vip_metric setting |
| Database | trigger (new) | Enforces constraint (fix) |
| Repository | findFeaturedMission() | Selects mission by priority |
| Service | getDashboardOverview() | Orchestrates dashboard data |
| API Route | GET /api/dashboard | Serves dashboard data |
| Frontend | app/home/page.tsx | Displays metrics (shows symptom) |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `clients` | id, vip_metric | vip_metric is 'sales' or 'units' |
| `missions` | id, client_id, mission_type | mission_type includes 'sales_dollars', 'sales_units' |

### Schema Check

```sql
-- Verify clients table has vip_metric column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'vip_metric';

-- Verify missions table has mission_type column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' AND column_name = 'mission_type';

-- Check for existing mismatches
SELECT c.id as client_id, c.name, c.vip_metric,
       m.id as mission_id, m.mission_type, m.display_name
FROM clients c
JOIN missions m ON m.client_id = c.id
WHERE (c.vip_metric = 'units' AND m.mission_type = 'sales_dollars')
   OR (c.vip_metric = 'sales' AND m.mission_type = 'sales_units');
```

### Data Migration Required?
- [x] Yes - Delete existing mismatched missions before adding trigger
- [ ] No

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Home/Dashboard | `app/home/page.tsx` | None - will automatically show correct data |
| Missions Page | `app/missions/page.tsx` | None - will only receive compatible missions |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| featuredMission.mission.type | Could be any sales type | Only matching sales type | No |

### Frontend Changes Required?
- [x] No - Frontend already handles mission data correctly; it just receives wrong data

---

## 13. Alternative Solutions Considered

### Option A: Filter in Repository (Bandaid)
- **Description:** Add filter in `findFeaturedMission()` to exclude mismatched types
- **Pros:** Quick to implement, no DB changes
- **Cons:** Doesn't prevent bad data creation, bandaid not fix
- **Verdict:** ❌ Rejected - Treats symptom not cause

### Option B: Database Trigger (Selected)
- **Description:** Add trigger to prevent mismatched mission creation at source
- **Pros:** Defense in depth, prevents all future bad data, single point of enforcement
- **Cons:** Requires DB migration, existing bad data needs cleanup
- **Verdict:** ✅ Selected - Fixes root cause

### Option C: API Validation Only
- **Description:** Add validation in mission creation API
- **Pros:** Application-level control, easier to modify
- **Cons:** Can be bypassed by direct DB access, seed scripts, or admin tools
- **Verdict:** ❌ Rejected - Not comprehensive enough

### Option D: Admin UI Filtering Only
- **Description:** Hide incompatible mission types in admin dropdown
- **Pros:** Good UX, prevents user error
- **Cons:** Doesn't enforce at data layer, other entry points can still create bad data
- **Verdict:** ❌ Rejected - Not comprehensive enough

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Trigger breaks existing functionality | Low | High | Test in dev first, have rollback ready |
| Seed scripts fail | Medium | Low | Update seed scripts to respect vip_metric |
| Admin can't create missions | Low | High | Clear error messages explain the constraint |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | No changes to API contracts |
| Database | Yes (constraint) | Clean up bad data before adding trigger |
| Frontend | No | Receives correct data automatically |

---

## 15. Testing Strategy

### Unit Tests

**File:** `__tests__/repositories/missionRepository.test.ts`
```typescript
describe('Mission VIP Metric Constraint', () => {
  it('should reject sales_dollars mission for units client', async () => {
    // Arrange: Client with vip_metric='units'
    const clientId = '11111111-1111-1111-1111-111111111111';

    // Act & Assert: Attempt to create sales_dollars mission should fail
    await expect(
      supabase.from('missions').insert({
        client_id: clientId,
        mission_type: 'sales_dollars',
        // ... other fields
      })
    ).rejects.toThrow(/vip_metric/);
  });

  it('should accept sales_units mission for units client', async () => {
    const clientId = '11111111-1111-1111-1111-111111111111';

    const { error } = await supabase.from('missions').insert({
      client_id: clientId,
      mission_type: 'sales_units',
      // ... other fields
    });

    expect(error).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Dashboard VIP Metric Coherence', () => {
  it('should show units-based mission for units client', async () => {
    // Login as test user with units client
    // Fetch dashboard
    // Verify featured mission is sales_units type
    // Verify tier progress shows units
    // Both should be coherent
  });
});
```

### Manual Verification Steps

1. [ ] Run data cleanup SQL to remove mismatched missions
2. [ ] Apply database trigger migration
3. [ ] Attempt to create sales_dollars mission for units client (should fail)
4. [ ] Load /home page and verify mission shows units, not dollars
5. [ ] Verify tier progress also shows units
6. [ ] Both metrics should now be coherent

### Verification Commands

```bash
# Run database migration (when implemented)
npx supabase db push

# Type check
npm run typecheck

# Build verification
npm run build

# Run tests
npm test
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress
- [ ] Backup current mismatched data (for reference)

### Implementation Steps

- [ ] **Step 1:** Clean up existing bad data
  - Location: Supabase SQL Editor
  - Query: `DELETE FROM missions WHERE client_id = '...' AND mission_type = 'sales_dollars';`

- [ ] **Step 2:** Create validation function
  - Location: Supabase SQL Editor / Migration
  - Query: See "Proposed Fix" section

- [ ] **Step 3:** Create trigger
  - Location: Supabase SQL Editor / Migration
  - Query: See "Proposed Fix" section

- [ ] **Step 4:** Test trigger with INSERT
  - Location: Supabase SQL Editor
  - Verify: INSERT of mismatched type raises exception

- [ ] **Step 5:** (Optional) Remove dead tie-breaker code
  - File: `lib/repositories/missionRepository.ts`
  - Change: Remove unused tie-breaker logic

- [ ] **Step 6:** Update seed scripts (future)
  - File: `scripts/seed-test-users.ts`
  - Change: Check client vip_metric before creating missions

### Post-Implementation
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Load /home and verify coherent metrics
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 9.2 | Frontend Integration | Dashboard now shows correct metrics |
| Future | Admin Mission CRUD | Will need to respect constraint |

### Updates Required

**Phase 9.2:**
- Current AC: Dashboard displays featured mission
- Updated AC: Dashboard displays featured mission with metrics matching client vip_metric
- Notes: After fix, frontend receives only compatible mission types

### New Tasks Created (if any)
- [ ] Add admin UI filtering to only show compatible mission types in dropdown
- [ ] Update seed scripts to respect vip_metric when creating missions

---

## 18. Definition of Done

- [ ] Existing mismatched missions deleted from database
- [ ] Database trigger created and tested
- [ ] INSERT of mismatched type raises clear exception
- [ ] Dashboard shows coherent metrics (same unit type for mission and tier)
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `lib/repositories/missionRepository.ts` | MISSION_PRIORITY constant, findFeaturedMission() | Shows priority bug and dead tie-breaker code |
| `lib/repositories/dashboardRepository.ts` | getUserDashboard() | Shows how vip_metric is fetched |
| `lib/services/dashboardService.ts` | getDashboardOverview(), getFeaturedMission() | Shows service orchestration |
| `app/home/page.tsx` | Dashboard UI rendering | Shows where symptom appears |
| `scripts/seed-test-users.ts` | Mission seeding logic | Shows how bad data was created |
| Supabase: clients table | vip_metric column | Source of truth for client config |
| Supabase: missions table | mission_type column | Where constraint should be enforced |
| `/home/jorge/Loyalty/Rumi/Home.png` | Screenshot | Visual evidence of bug |

### Reading Order for External Auditor

1. **First:** This document, Section 2 (Bug Summary) - Understand the problem
2. **Second:** `lib/repositories/missionRepository.ts`, MISSION_PRIORITY - See the priority bug
3. **Third:** Supabase clients/missions tables - Verify data mismatch exists
4. **Fourth:** This document, Section 7 (Proposed Fix) - Understand the solution
5. **Fifth:** Home.png screenshot - See visual evidence

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Author:** Claude Code
**Status:** Analysis Complete
