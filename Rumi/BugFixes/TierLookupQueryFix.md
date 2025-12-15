# Tier Lookup Query Mismatch - Fix Documentation

**Bug ID:** BUG-TIER-LOOKUP-QUERY
**Created:** 2025-12-15
**Status:** Analysis Complete
**Severity:** High (Blocks dashboard and tiers pages, affects all authenticated users)
**Related Tasks:** Phase 9 Frontend Integration
**Linked Bugs:** BUG-TEST-SEED-AUTH-ID (discovered during investigation)

### Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-15 | Initial analysis - 2 bug locations identified |
| 1.1 | 2025-12-15 | Expanded scope after audit: 3 bug locations, test files, documentation update |

---

## 1. Project Context

This is a loyalty/VIP rewards application built with Next.js 14, TypeScript, and Supabase. The system tracks TikTok content creators' sales performance and assigns them to tiers (Bronze, Silver, Gold, Platinum) based on their metrics.

The bug affects **dashboard and tier data loading** which are core authenticated user experiences. When users navigate to `/home` or `/tiers`, the APIs fail to load tier information, resulting in 500 errors. Additionally, background tier promotion jobs are affected.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

---

## 2. Bug Summary

**What's happening:** When the dashboard API (`/api/dashboard`) attempts to load user data, it fails to find the user's current tier because it queries `tiers.tier_id` (which stores 'tier_1', 'tier_2') but compares against `users.current_tier` (which stores a UUID like 'aaaa1111-1111-1111-1111-111111111111').

**What should happen:** The dashboard should successfully load the user's tier by matching `users.current_tier` (UUID) against `tiers.id` (UUID).

**Impact:** All authenticated users cannot load the dashboard home page. They see "Something went wrong, failed to fetch dashboard: 500".

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| SchemaFinalv2.md | Section 1.2 users Table | Documents `current_tier` as VARCHAR(50) DEFAULT 'tier_1' - **OUTDATED** |
| SchemaFinalv2.md | Section 1.6 tiers Table | Documents `id` (UUID) and `tier_id` (VARCHAR 'tier_1'-'tier_6') as separate columns |
| dashboardRepository.ts | getUserDashboard function (line 154) | Queries `.eq('tier_id', user.current_tier)` - **BUG** |
| tierRepository.ts | getUserTierContext function (line 252) | Same incorrect query pattern `.eq('tier_id', user.current_tier)` - **BUG** |
| tierRepository.ts | getPromotionCandidates function (line 679) | Uses `.find(t => t.tier_id === user.current_tier)` - **BUG** |
| tierService.ts | getTiersPageData function (line 447) | Calls `tierRepository.getUserTierContext()` - **AFFECTED** |
| tierCalculationService.ts | processPromotions function | Calls `getPromotionCandidates()` - **AFFECTED** |
| seed-test-users.ts | User insertion | Stores `getTierUUID(user.current_tier)` which returns UUID, not 'tier_1' string |
| daily-automation-metrics.test.ts | Lines 847, 856 | Test sets `current_tier: tier.tier_id` - **INCORRECT TEST DATA** |
| Actual database query | users and tiers tables | Confirms `users.current_tier` stores UUIDs matching `tiers.id` |

### Pages Impact Analysis

| Page | API | Repository Function | Status |
|------|-----|---------------------|--------|
| `/home` | `/api/dashboard` | `dashboardRepository.getUserDashboard()` | **BROKEN** |
| `/tiers` | `/api/tiers` | `tierRepository.getUserTierContext()` | **BROKEN** |
| `/missions` | `/api/missions` | Uses RPC with tier_id as parameter | OK |
| `/rewards` | `/api/benefits` | Uses RPC with tier_id as parameter | OK |
| Background | Cron jobs | `tierRepository.getPromotionCandidates()` | **BROKEN** |

### Key Evidence

**Evidence 1:** Schema documentation is outdated
- Source: SchemaFinalv2.md, Section 1.2 users Table
- Documentation states: `current_tier - VARCHAR(50) DEFAULT 'tier_1'`
- Implication: Code was written based on outdated documentation

**Evidence 2:** Database stores UUIDs, not tier_id strings
- Source: Direct database query via Supabase
- Actual values in `users.current_tier`:
  ```
  testbronze: aaaa1111-1111-1111-1111-111111111111
  testsilver: aaaa2222-2222-2222-2222-222222222222
  testgold: aaaa3333-3333-3333-3333-333333333333
  testplatinum: aaaa4444-4444-4444-4444-444444444444
  ```
- Implication: The database evolved to store UUIDs (FK relationship) but queries weren't updated

**Evidence 3:** Dashboard query uses wrong column
- Source: dashboardRepository.ts, getUserDashboard function
- Query: `.eq('tier_id', user.current_tier)`
- Expected: `tier_id` = 'tier_1' but received UUID 'aaaa1111-...'
- Result: No tier found → `getUserDashboard` returns null → 500 error

**Evidence 4:** Tiers table has both id and tier_id columns
- Source: Direct database query
- Values:
  ```
  Bronze: id=aaaa1111... tier_id=tier_1
  Silver: id=aaaa2222... tier_id=tier_2
  Gold: id=aaaa3333... tier_id=tier_3
  Platinum: id=aaaa4444... tier_id=tier_4
  ```
- Implication: Need to query by `id` (UUID) not `tier_id` (string)

---

## 4. Root Cause Analysis

**Root Cause:** The dashboard repository queries `tiers.tier_id` but `users.current_tier` stores a UUID reference to `tiers.id`, not the string 'tier_1'.

**Contributing Factors:**
1. Schema documentation (SchemaFinalv2.md) is outdated - states current_tier is VARCHAR but database stores UUID
2. Database schema evolved to use FK relationship (UUID) but queries weren't updated
3. The seed script correctly stores UUIDs, but repository queries assume string values

**How it was introduced:** The database was migrated to use proper FK relationships between `users.current_tier` and `tiers.id`, but the repository layer queries were written based on outdated schema documentation that assumed string values.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Dashboard completely fails to load - users see 500 error | High |
| Data integrity | No data corruption - just query mismatch | Low |
| Feature functionality | All dashboard features blocked | High |
| Authentication | Auth works, but post-auth experience broken | High |

**Business Risk Summary:** This is a critical user-facing bug that blocks all authenticated users from accessing the main application. Users can log in successfully but immediately see an error when trying to view their dashboard.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
```typescript
// Get current tier
const { data: currentTier, error: tierError } = await supabase
  .from('tiers')
  .select('*')
  .eq('tier_id', user.current_tier)  // BUG: tier_id stores 'tier_1', but user.current_tier is a UUID
  .eq('client_id', clientId)
  .single();

if (tierError || !currentTier) {
  return null;  // Returns null because tier not found
}
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts` (Line 252)
```typescript
// Get tier order for current tier
const { data: tier, error: tierError } = await supabase
  .from('tiers')
  .select('tier_order')
  .eq('client_id', clientId)
  .eq('tier_id', user.current_tier)  // BUG: Same issue
  .single();
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts` (Line 679)
```typescript
// Find current tier order
const currentTierData = tiers?.find(t => t.tier_id === user.current_tier);  // BUG: comparing tier_id to UUID
const currentTierOrder = currentTierData?.tier_order ?? 1;
```

**Current Behavior:**
- Query attempts to match `tiers.tier_id` ('tier_1') = `users.current_tier` (UUID)
- No match found because comparing different types/formats
- Repository returns null
- Service layer returns null
- API returns 500 error

### Current Data Flow

```
User Login (success)
       ↓
Navigate to /home
       ↓
GET /api/dashboard
       ↓
dashboardService.getDashboardOverview()
       ↓
dashboardRepository.getUserDashboard()
       ↓
Query: .eq('tier_id', user.current_tier)
       ↓
user.current_tier = 'aaaa1111-1111-1111-1111-111111111111'
tiers.tier_id = 'tier_1'
       ↓
NO MATCH → return null
       ↓
500 Error: "Failed to get dashboard data for user"
```

---

## 7. Proposed Fix

### Approach

Change the tier lookup query to match `users.current_tier` (UUID) against `tiers.id` (UUID) instead of `tiers.tier_id` (string).

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`

**Before:**
```typescript
// Get current tier
const { data: currentTier, error: tierError } = await supabase
  .from('tiers')
  .select('*')
  .eq('tier_id', user.current_tier)  // tier_id stores 'tier_1', 'tier_2', etc.
  .eq('client_id', clientId)
  .single();
```

**After:**
```typescript
// Get current tier
const { data: currentTier, error: tierError } = await supabase
  .from('tiers')
  .select('*')
  .eq('id', user.current_tier)  // current_tier stores the tier's UUID (FK to tiers.id)
  .eq('client_id', clientId)
  .single();
```

**Explanation:** The `users.current_tier` column stores a UUID that references `tiers.id`, so we need to match by `id` not `tier_id`.

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`

**Before:**
```typescript
// Get tier order for current tier
const { data: tier, error: tierError } = await supabase
  .from('tiers')
  .select('tier_order')
  .eq('client_id', clientId)
  .eq('tier_id', user.current_tier)
  .single();
```

**After:**
```typescript
// Get tier order for current tier
const { data: tier, error: tierError } = await supabase
  .from('tiers')
  .select('tier_order')
  .eq('client_id', clientId)
  .eq('id', user.current_tier)  // current_tier stores UUID (FK to tiers.id)
  .single();
```

**Explanation:** Same fix - match by `id` (UUID) not `tier_id` (string).

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts` (Line 679)

**Before:**
```typescript
// Find current tier order
const currentTierData = tiers?.find(t => t.tier_id === user.current_tier);
```

**After:**
```typescript
// Find current tier order
const currentTierData = tiers?.find(t => t.id === user.current_tier);  // current_tier stores UUID (FK to tiers.id)
```

**Explanation:** Same fix for JavaScript `.find()` - match by `id` (UUID) not `tier_id` (string).

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `lib/repositories/dashboardRepository.ts` | MODIFY | Line 154: `.eq('tier_id', ...)` → `.eq('id', ...)` |
| `lib/repositories/tierRepository.ts` | MODIFY | Line 252: `.eq('tier_id', ...)` → `.eq('id', ...)` |
| `lib/repositories/tierRepository.ts` | MODIFY | Line 679: `.find(t => t.tier_id === ...)` → `.find(t => t.id === ...)` |
| `tests/.../daily-automation-metrics.test.ts` | MODIFY | Lines 847, 856: `current_tier: tier.tier_id` → `current_tier: tier.id` |
| `SchemaFinalv2.md` | UPDATE | Section 1.2: Document `current_tier` as UUID FK to tiers.id |

### Dependency Graph

```
dashboardRepository.ts (line 154)
├── imports from: @/lib/supabase/server-client
├── imported by: dashboardService.ts
└── affects: /api/dashboard → /home page

tierRepository.ts (line 252)
├── imports from: @/lib/supabase/server-client
├── imported by: tierService.ts
└── affects: /api/tiers → /tiers page

tierRepository.ts (line 679)
├── imports from: @/lib/supabase/server-client
├── imported by: tierCalculationService.ts
└── affects: Cron jobs → tier promotions
```

---

## 9. Data Flow Analysis

### Before Fix

```
users.current_tier (UUID: 'aaaa1111-...')
         ↓
Query: .eq('tier_id', 'aaaa1111-...')
         ↓
tiers.tier_id = 'tier_1' (no match!)
         ↓
null → 500 error
```

### After Fix

```
users.current_tier (UUID: 'aaaa1111-...')
         ↓
Query: .eq('id', 'aaaa1111-...')
         ↓
tiers.id = 'aaaa1111-...' (MATCH!)
         ↓
Tier data returned → Dashboard loads
```

### Data Transformation Steps

1. **Step 1:** User logs in, cookie set with auth token
2. **Step 2:** User navigates to /home, triggering GET /api/dashboard
3. **Step 3:** Dashboard route calls dashboardService.getDashboardOverview()
4. **Step 4:** Service calls dashboardRepository.getUserDashboard()
5. **Step 5:** Repository queries user data including `current_tier` (UUID)
6. **Step 6:** Repository queries tier by matching `tiers.id` = `users.current_tier`
7. **Step 7:** Dashboard data returned successfully

---

## 10. Call Chain Mapping

### Affected Call Chains

**Chain 1: Dashboard (/home page)**
```
/api/dashboard (route.ts)
│
├─► getDashboardOverview (dashboardService.ts)
│   └── Orchestrates dashboard data fetching
│
├─► getUserDashboard (dashboardRepository.ts)
│   ├── Fetches user with client data
│   └── ⚠️ BUG #1: .eq('tier_id', user.current_tier)
│
└─► getCurrentTierRewards (dashboardRepository.ts)
    └── Fetches rewards for tier
```

**Chain 2: Tiers Page (/tiers page)**
```
/api/tiers (route.ts)
│
├─► getTiersPageData (tierService.ts)
│   └── Orchestrates tier page data
│
└─► getUserTierContext (tierRepository.ts)
    ├── Fetches user tier context
    └── ⚠️ BUG #2: .eq('tier_id', user.current_tier)
```

**Chain 3: Tier Promotions (Background Jobs)**
```
Cron Job / Daily Sync
│
├─► processPromotions (tierCalculationService.ts)
│   └── Checks users for tier promotion
│
└─► getPromotionCandidates (tierRepository.ts)
    ├── Finds users eligible for promotion
    └── ⚠️ BUG #3: .find(t => t.tier_id === user.current_tier)
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | tiers table | Source of tier data (id vs tier_id columns) |
| Database | users table | Stores current_tier as UUID |
| Repository | dashboardRepository.getUserDashboard | Incorrect query column |
| Repository | tierRepository.getTierOrderForUser | Same incorrect query pattern |
| Service | dashboardService.getDashboardOverview | Returns null when repo fails |
| API Route | /api/dashboard | Returns 500 when service fails |
| Frontend | /home page | Displays error message |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| users | current_tier (UUID) | Stores FK reference to tiers.id |
| tiers | id (UUID), tier_id (VARCHAR) | id is the UUID, tier_id is 'tier_1' string |

### Schema Check

```sql
-- Verify users.current_tier contains UUIDs matching tiers.id
SELECT u.tiktok_handle, u.current_tier, t.id, t.tier_id, t.tier_name
FROM users u
JOIN tiers t ON u.current_tier = t.id  -- This works
WHERE u.tiktok_handle LIKE 'test%';

-- This would fail (current behavior):
SELECT u.tiktok_handle, u.current_tier, t.tier_id
FROM users u
JOIN tiers t ON u.current_tier = t.tier_id  -- No match!
WHERE u.tiktok_handle LIKE 'test%';
```

### Data Migration Required?

- [x] No - schema already supports fix (database stores UUIDs correctly)
- [ ] Yes - documentation should be updated to reflect actual schema

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Home page | app/home/page.tsx | Currently shows 500 error, will work after fix |
| Tiers page | app/tiers/page.tsx | Currently shows error, will work after fix |
| Dashboard data | API response | No schema change, same response structure |
| Tiers data | API response | No schema change, same response structure |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| N/A | N/A | N/A | No |

### Frontend Changes Required?

- [x] No - frontend already handles the response correctly
- [ ] Yes

---

## 13. Alternative Solutions Considered

### Option A: Fix Repository Queries (Selected)

- **Description:** Change `.eq('tier_id', ...)` to `.eq('id', ...)` in repository layer
- **Pros:**
  - Minimal code change (2 lines)
  - Aligns with actual database schema
  - No data migration needed
- **Cons:**
  - None identified
- **Verdict:** ✅ Selected - cleanest fix that aligns with database reality

### Option B: Fix Seed Script to Store tier_id Strings

- **Description:** Change seed script to store 'tier_1' instead of UUID
- **Pros:**
  - Would match schema documentation
- **Cons:**
  - Breaks FK relationship
  - Inconsistent with how production data works
  - Would need to update all tier references
- **Verdict:** ❌ Rejected - fights against database design

### Option C: Add Lookup by Either id or tier_id

- **Description:** Try both columns in queries
- **Pros:**
  - Would work with both formats
- **Cons:**
  - Unnecessary complexity
  - Slower queries
  - Doesn't fix root cause
- **Verdict:** ❌ Rejected - overcomplicates solution

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Other queries using tier_id | Medium | High | Search codebase for similar patterns |
| Breaking existing production data | Low | High | Production likely uses UUIDs too |
| Regression in tier lookups | Low | Medium | Test all tier-related features |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Response structure unchanged |
| Database | No | No schema change needed |
| Frontend | No | Already handles response |

---

## 15. Testing Strategy

### Manual Verification Steps

**Setup:**
1. [ ] Run cleanup script: `npx tsx scripts/cleanup-test-users.ts`
2. [ ] Run seed script: `npx tsx scripts/seed-test-users.ts`
3. [ ] Start dev server: `npm run dev`

**Test /home page:**
4. [ ] Navigate to http://localhost:3001/login/start
5. [ ] Enter handle: `testbronze`
6. [ ] Enter password: `TestPass123!`
7. [ ] Verify redirected to /login/welcomeunr (first-time user)
8. [ ] Click "Explore Program"
9. [ ] Verify dashboard loads without error
10. [ ] Verify tier card shows "Bronze" with correct color

**Test /tiers page:**
11. [ ] Navigate to http://localhost:3001/tiers
12. [ ] Verify tiers page loads without error
13. [ ] Verify current tier is highlighted as "Bronze"
14. [ ] Verify tier progression data displays correctly

**Test with different tier users:**
15. [ ] Logout and login as `testsilver` (password: `TestPass123!`)
16. [ ] Verify /home shows "Silver" tier
17. [ ] Verify /tiers shows "Silver" as current tier

### Verification Commands

```bash
# Type check
npx tsc --noEmit

# Build verification
npm run build

# Test the dashboard endpoint directly
curl -b "auth-token=..." http://localhost:3001/api/dashboard
```

---

## 16. Implementation Checklist

### Pre-Implementation

- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

### Implementation Steps

- [ ] **Step 1:** Fix dashboardRepository.ts (Line 154)
  - File: `lib/repositories/dashboardRepository.ts`
  - Change: `.eq('tier_id', user.current_tier)` → `.eq('id', user.current_tier)`

- [ ] **Step 2:** Fix tierRepository.ts (Line 252)
  - File: `lib/repositories/tierRepository.ts`
  - Change: `.eq('tier_id', user.current_tier)` → `.eq('id', user.current_tier)`

- [ ] **Step 3:** Fix tierRepository.ts (Line 679)
  - File: `lib/repositories/tierRepository.ts`
  - Change: `.find(t => t.tier_id === user.current_tier)` → `.find(t => t.id === user.current_tier)`

- [ ] **Step 4:** Fix test file (Lines 847, 856)
  - File: `tests/integration/cron/daily-automation-metrics.test.ts`
  - Change: `current_tier: tier1!.tier_id` → `current_tier: tier1!.id`
  - Change: `current_tier: tier2!.tier_id` → `current_tier: tier2!.id`

- [ ] **Step 5:** Update schema documentation
  - File: `SchemaFinalv2.md`
  - Section: 1.2 users Table
  - Change: `current_tier - VARCHAR(50) DEFAULT 'tier_1'` → `current_tier - UUID REFERENCES tiers(id)`

### Post-Implementation

- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update SchemaFinalv2.md to reflect actual schema (optional but recommended)

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| Phase 9 | Frontend Integration Testing | Blocked until fix applied |

### Updates Required

**Phase 9 Testing:**
- Current blocker: Dashboard API returns 500
- After fix: Dashboard should load correctly

### New Tasks Created

- [ ] Update SchemaFinalv2.md Section 1.2 to document that `current_tier` stores UUID FK to tiers.id

---

## 18. Definition of Done

- [ ] All code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification steps completed (login → dashboard loads)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| SchemaFinalv2.md | Section 1.2 users Table, Section 1.6 tiers Table | Understanding expected vs actual schema |
| dashboardRepository.ts | getUserDashboard function | Location of bug |
| tierRepository.ts | getTierOrderForUser function | Secondary location of bug |
| seed-test-users.ts | User insertion section | Confirms UUID is correct format to store |

### Reading Order for External Auditor

1. **First:** SchemaFinalv2.md - Section 1.6 tiers Table - Understand id vs tier_id columns
2. **Second:** Direct database query evidence - See actual data format
3. **Third:** dashboardRepository.ts - getUserDashboard - See the buggy query
4. **Fourth:** Proposed Fix section - See the one-line fix

---

**Document Version:** 1.1
**Last Updated:** 2025-12-15
**Author:** Claude Code
**Status:** Analysis Complete - Expanded Scope
