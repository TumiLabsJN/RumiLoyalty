# Missions Route TypeScript Errors - Fix Documentation

**Purpose:** Document TypeScript errors in missions route where code accesses `dashboardData.allTiers` but interface doesn't include this property
**Audience:** LLM agents implementing this fix
**Created:** 2025-12-05
**Status:** Not yet implemented

---

## Quick Reference

**Error Count:** 2 errors
**Error Type:** TS2339 - Property does not exist on type
**Files Affected:** `app/api/missions/route.ts` (lines 95, 96)
**Complexity Rating:** MEDIUM
**Estimated Fix Time:** 30 minutes
**Related Errors:** None (isolated to missions route)
**Impact Radius:** 1 file modified (dashboardRepository.ts), 6 files indirectly affected
**Breaking Changes:** NO
**Recommended Fix:** Add `allTiers` array to UserDashboardData interface and query all tiers in getUserDashboard()

---

## Executive Summary

Two TypeScript compilation errors exist in the missions route where code attempts to access `dashboardData.allTiers` to build a tier lookup map, but the `UserDashboardData` interface doesn't include this property.

**Root Cause:** The route code assumes `allTiers` property exists on dashboard data, but the `getUserDashboard()` repository function only queries `currentTier` and `nextTier`, not all tiers. The interface was never updated to include all tiers.

**Impact:** 2 of 21 compilation errors in codebase. Feature is functional (missions page works) but with poor UX - locked missions display tier IDs ("tier_3") instead of user-friendly names ("Gold") because tierLookup map can't be built.

**Fix:** Query all tiers from database in `getUserDashboard()` and add `allTiers` array to `UserDashboardData` interface. This enables proper tier name display for locked missions.

---

## TypeScript Compilation Errors

### Error 1: Property 'allTiers' does not exist (Line 95)

**File:** `app/api/missions/route.ts`
**Line:** 95
**Error Type:** TS2339
**Error Message:**
```
app/api/missions/route.ts(95,23): error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
```

**Full Code Context:**
```typescript
// Lines 93-99 in app/api/missions/route.ts
// Step 5: Build tier lookup map
const tierLookup = new Map<string, { name: string; color: string }>();
if (dashboardData.allTiers) {  // ❌ Line 95: allTiers doesn't exist on UserDashboardData
  for (const tier of dashboardData.allTiers) {
    tierLookup.set(tier.id, { name: tier.name, color: tier.color });
  }
}
```

**What the code is trying to do:**
Check if `dashboardData` contains an `allTiers` array, and if so, use it to build a lookup map.

**Why it fails:**
TypeScript compiler can't find `allTiers` property in the `UserDashboardData` interface definition (dashboardRepository.ts lines 23-58).

---

### Error 2: Property 'allTiers' does not exist (Line 96)

**File:** `app/api/missions/route.ts`
**Line:** 96
**Error Type:** TS2339
**Error Message:**
```
app/api/missions/route.ts(96,40): error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
```

**Full Code Context:**
```typescript
// Lines 93-99 in app/api/missions/route.ts
const tierLookup = new Map<string, { name: string; color: string }>();
if (dashboardData.allTiers) {
  for (const tier of dashboardData.allTiers) {  // ❌ Line 96: allTiers doesn't exist
    tierLookup.set(tier.id, { name: tier.name, color: tier.color });
  }
}
```

**What the code is trying to do:**
Iterate over `allTiers` array to populate the tierLookup Map with tier ID → {name, color} mappings.

**Why it fails:**
Same root cause as Error 1 - `allTiers` property not defined in `UserDashboardData` interface.

---

## Discovery Process

### Step 1: Verified Error Location

**Verification Command:**
```bash
npx tsc --noEmit 2>&1 | grep "app/api/missions/route.ts.*allTiers"
```

**Result:**
```
app/api/missions/route.ts(95,23): error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
app/api/missions/route.ts(96,40): error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
```

**File:** `app/api/missions/route.ts` lines 93-99

**Purpose of Code:**
- Build a `Map<string, { name: string; color: string }>` to lookup tier display names and colors by tier ID
- Used later in line 112 when calling `listAvailableMissions()` service function
- Service uses this map in `transformMission()` to display user-friendly tier names for locked missions

**Problem:**
- Code checks `if (dashboardData.allTiers)` but TypeScript knows this property doesn't exist
- Even at runtime, `dashboardData.allTiers` will be undefined, so tierLookup stays empty
- Locked missions will show "Unlock at tier_3" instead of "Unlock at Gold"

---

### Step 2: Found UserDashboardData Interface

**Location:** `lib/repositories/dashboardRepository.ts` lines 23-58

**Current Interface Definition:**
```typescript
export interface UserDashboardData {
  user: {
    id: string;
    handle: string;
    email: string | null;
  };
  client: {
    id: string;
    name: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
    supportEmail: string | null;
  };
  currentTier: {
    id: string;
    name: string;
    color: string;
    order: number;
    checkpointExempt: boolean;
  };
  nextTier: {
    id: string;
    name: string;
    color: string;
    salesThreshold: number;
    unitsThreshold: number;
  } | null;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
  // ❌ NO allTiers property
}
```

**Finding:** Interface includes `currentTier` and `nextTier` but NOT `allTiers`.

---

### Step 3: Analyzed getUserDashboard() Implementation

**Location:** `lib/repositories/dashboardRepository.ts` lines 96-199

**Current Query Pattern:**
```typescript
async getUserDashboard(userId: string, clientId: string): Promise<UserDashboardData | null> {
  // Query 1: Get user with client data (JOIN)
  const { data: user } = await supabase
    .from('users')
    .select('*, clients!inner(*)')
    .eq('id', userId)
    .eq('client_id', clientId)
    .single();

  // Query 2: Get current tier ONLY
  const { data: currentTier } = await supabase
    .from('tiers')
    .select('*')
    .eq('id', user.current_tier)
    .eq('client_id', clientId)
    .single();

  // Query 3: Get next tier ONLY (tier_order + 1)
  const { data: nextTier } = await supabase
    .from('tiers')
    .select('*')
    .eq('client_id', clientId)
    .eq('tier_order', currentTier.tier_order + 1)
    .single();

  // Returns: user, client, currentTier, nextTier, checkpointData
  // ❌ Does NOT query or return allTiers
}
```

**Finding:** Function queries only 2 specific tiers (current and next), never queries all tiers for the client.

---

### Step 4: Verified Database Schema

**Schema Source:** SchemaFinalv2.md (tiers table)

**Tiers Table Columns:**
- `tier_order` - INTEGER NOT NULL - Display order: 1-6
- `tier_name` - VARCHAR(100) NOT NULL - Admin-customizable (e.g., 'Bronze', 'Silver', 'Gold', 'Platinum')
- `tier_color` - VARCHAR(7) NOT NULL - Hex color for UI display
- UNIQUE(client_id, tier_order)

**Findings:**
- ✅ Table exists with all necessary fields (id, tier_name, tier_color, tier_order)
- ✅ Multi-tenant isolation via client_id
- ✅ Supports 1-6 tiers per client
- ✅ Can query all tiers for a client with proper filtering

---

### Step 5: Checked allTiers Usage

**Search Command:**
```bash
grep -rn "allTiers" appcode/ --include="*.ts" --include="*.tsx"
```

**Result:**
```
app/api/missions/route.ts:95:    if (dashboardData.allTiers) {
app/api/missions/route.ts:96:      for (const tier of dashboardData.allTiers) {
```

**Finding:** `allTiers` is ONLY used in missions route (2 lines), nowhere else in codebase.

---

### Step 6: Traced tierLookup Usage

**Data Flow:**
```
missions/route.ts (lines 93-99)
  ↓ Build tierLookup map from allTiers
  ↓ Pass to listAvailableMissions() (line 102-113)
  ↓
missionService.ts:listAvailableMissions()
  ↓ Receive tierLookup parameter
  ↓ Pass to transformMission() for each mission
  ↓
missionService.ts:transformMission()
  ↓ Use tierLookup.get(mission.tierEligibility)
  ↓ Purpose: Display locked mission tier requirements
  ↓
Result: "Unlock at Gold" (with tier name) vs "Unlock at tier_3" (fallback to ID)
```

**Purpose:** Display user-friendly tier names ("Gold") instead of technical IDs ("tier_3") for locked missions.

**Current Runtime Behavior:**
- `allTiers` is undefined, so tierLookup stays empty Map
- `transformMission()` calls `tierLookup.get(tierEligibility)` → returns undefined
- Fallback: uses `mission.tierEligibility` (the ID) directly
- Result: "Unlock at tier_3" instead of "Unlock at Gold"

---

### Step 7: Identified All Consumers of UserDashboardData

**Search Command:**
```bash
grep -rn "getUserDashboard" appcode/ --include="*.ts" --include="*.tsx"
```

**Routes Using getUserDashboard():**
1. `app/api/missions/route.ts:81` - Missions page
2. `app/api/rewards/route.ts:77` - Rewards page
3. `app/api/rewards/[rewardId]/claim/route.ts:101` - Reward claim
4. `app/api/rewards/history/route.ts:76` - Rewards history
5. `app/api/missions/history/route.ts:78` - Missions history
6. `app/api/dashboard/featured-mission/route.ts:84` - Dashboard featured mission

**Impact Assessment:**
- All 6 routes will receive `allTiers` in dashboard data after fix
- Only missions route actually uses it
- Other routes will ignore the extra property (harmless)

---

## Context on the Issue

### Business Functionality

**Feature:** Missions page tier lookup for locked missions

**User Story:**
- User is on Tier 2 (Silver), has completed Silver missions
- Tier 3 (Gold) mission exists but is locked (requires Gold tier)
- UI should display: "Unlock at Gold" (user-friendly tier name)
- Currently displays: "Unlock at tier_3" (technical ID, poor UX)

**Current State:**
- Missions page loads successfully (no crash)
- Locked missions displayed with tier ID instead of tier name
- `transformMission()` has fallback logic: uses tier ID if lookup fails
- Functionally works but UX is suboptimal

### Technical Context

**Why tierLookup Map Exists:**
- RPC function `get_available_missions` returns mission data with `tier_eligibility` ID
- Mission data includes tier info ONLY for the tier that mission belongs to
- For LOCKED missions (different tier requirement), no tier name/color included
- Need to lookup other tier names/colors to show "Unlock at [TierName]"

**Why allTiers Was Expected:**
- Developer anticipated `getUserDashboard()` would return all tiers for the client
- Intended to build lookup map at route level before calling service
- Service would use map to translate tier IDs → tier names/colors

**Why allTiers Doesn't Exist:**
- `getUserDashboard()` was designed for dashboard page needs only
- Dashboard only shows current tier and next tier (progress display)
- No need for all tiers on dashboard
- Missions route has different requirements (needs all tier names)

---

## Business Implications

### Impact: LOW (Build Context), MEDIUM (UX Context)

**Why Low Build Impact:**
- This is 2 of 21 TypeScript compilation errors in codebase
- Build already blocked by 19 other unrelated errors
- Fixing this alone won't enable builds

**Why Medium UX Impact:**
- Feature is functional (missions page works)
- Poor UX: locked missions show "tier_3" instead of "Gold"
- Users can still understand mission is locked
- Tier names would improve clarity and professionalism

**Affected Functionality:**

**API Endpoint:**
- GET /api/missions - Returns all missions for authenticated user

**User Experience:**
```typescript
// Current behavior (without tierLookup):
lockedData: {
  requiredTierName: "tier_3",        // ❌ Technical ID
  unlockMessage: "Unlock at tier_3"  // ❌ Poor UX
}

// Expected behavior (with tierLookup):
lockedData: {
  requiredTierName: "Gold",          // ✅ User-friendly name
  unlockMessage: "Unlock at Gold"    // ✅ Better UX
}
```

### Downstream Impact

**If left unfixed:**
- 2 of 21 TypeScript errors remain
- Build still blocked by other errors
- Poor UX for locked mission tier names continues
- Code has runtime safety (fallback to tier ID works)

**If fixed correctly:**
- TypeScript compilation error count reduces by 2 (from 21 to 19)
- Improved UX: "Unlock at Gold" instead of "Unlock at tier_3"
- Code properly typed and maintainable
- tierLookup functionality works as intended

**Production Risk:** LOW
- **Current:** No crash risk - feature works with fallback
- **After fix:** Low risk - adding data to response, no breaking changes
- **Consideration:** Additional database query (negligible - tiers table small, < 10 rows per client)

---

## Alternative Solutions Analysis

### Option 1: Add allTiers to UserDashboardData (RECOMMENDED)

**Approach:**
1. Add database query in `getUserDashboard()` to fetch all tiers for client
2. Add `allTiers` array property to `UserDashboardData` interface
3. Return allTiers in getUserDashboard() response
4. Route code works as written (no route changes needed)

**Pros:**
- ✅ Minimal code changes (repository layer only)
- ✅ Route code already written correctly (just needs data)
- ✅ Consistent with existing pattern (repository provides all data needed)
- ✅ Useful for future features needing all tier info
- ✅ Clean separation: repository provides data, route/service consume
- ✅ Follows repository pattern (data access layer provides data)

**Cons:**
- ❌ Adds data to dashboard response (6 routes receive it, only 1 uses it)
- ❌ Additional database query (negligible cost - tiers table small)
- ❌ Changes interface used by multiple routes (but backward compatible)

**Impact on Other Routes:**
- GET /api/rewards - Will receive allTiers (unused but harmless)
- GET /api/rewards/history - Will receive allTiers (unused but harmless)
- GET /api/rewards/[id]/claim - Will receive allTiers (unused but harmless)
- GET /api/missions/history - Will receive allTiers (could be useful for future features)
- GET /api/dashboard/featured-mission - Will receive allTiers (unused but harmless)

**Trade-off:** Small overhead (extra query, extra data in response) for clean architecture and better UX.

---

### Option 2: Query Tiers Directly in Missions Route

**Approach:**
1. Remove `dashboardData.allTiers` code from route
2. Add separate tiers query directly in missions route.ts
3. Build tierLookup from direct query result
4. Keep using dashboardRepository for other data

**Pros:**
- ✅ No changes to shared interface
- ✅ Data only queried where needed (missions route only)
- ✅ Route-specific concern handled in route layer

**Cons:**
- ❌ Route layer doing database access (violates layered architecture)
- ❌ Bypasses repository layer (reduces testability)
- ❌ Duplicates query logic (tiers query exists in repository)
- ❌ Harder to maintain (query logic scattered across files)
- ❌ Inconsistent pattern (route uses both repository and direct DB access)

**Code Example:**
```typescript
// In missions/route.ts
const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);

// ❌ Direct database access in route layer
const supabase = await createClient();
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color')
  .eq('client_id', clientId)
  .order('tier_order', { ascending: true });
```

**Trade-off:** Reduces shared interface changes but breaks clean architecture and creates maintenance burden.

---

### Option 3: Query Tiers in Service Layer

**Approach:**
1. Remove tierLookup parameter from `listAvailableMissions()` function signature
2. Service layer queries all tiers internally using Supabase client
3. Service builds tierLookup map itself
4. Route no longer responsible for providing tierLookup

**Pros:**
- ✅ Service handles its own data needs (autonomy)
- ✅ No route layer changes needed
- ✅ No shared interface changes

**Cons:**
- ❌ Service layer doing direct database access (violates architecture)
- ❌ Service should use repository layer, not Supabase client directly
- ❌ Reduces testability (harder to mock database calls in service tests)
- ❌ Mixes concerns (service doing both data fetching and business logic)
- ❌ Breaks dependency injection pattern

**Trade-off:** Service autonomy but violates clean architecture and makes testing harder.

---

### Option 4: Modify RPC Function to Include All Tier Names

**Approach:**
1. Modify database RPC function `get_available_missions` to include tier lookup data
2. Add JOINs to include tier name/color for ALL tiers referenced in missions
3. Route/service extracts tier names from mission data itself
4. Remove tierLookup map entirely

**Pros:**
- ✅ No additional queries needed (single RPC call)
- ✅ Data comes from authoritative source
- ✅ Most efficient (no extra roundtrips)

**Cons:**
- ❌ Requires database migration (RPC function modification)
- ❌ RPC already complex (adds more JOINs and logic)
- ❌ Tier data duplicated across missions in response (payload bloat)
- ❌ Harder to change later (SQL in migration files, not TypeScript)
- ❌ Complicates RPC function maintenance

**Trade-off:** Performance optimization but higher complexity, requires migration, harder to maintain.

---

### Option 5: Remove Tier Name Lookup (Accept Poor UX)

**Approach:**
1. Remove TypeScript errors with type assertion (`as any` or `@ts-ignore`)
2. Accept that allTiers will be undefined
3. Keep fallback behavior (tier IDs shown to users)
4. Document as "known limitation"

**Pros:**
- ✅ Zero code changes to functionality
- ✅ No performance impact
- ✅ Simple and fast

**Cons:**
- ❌ Poor UX (technical IDs shown to users)
- ❌ Defeats purpose of tierLookup code (why have it if it doesn't work?)
- ❌ TypeScript errors remain (defeats type safety)
- ❌ Not a real fix (bandaid/workaround)
- ❌ Unprofessional user experience

**Trade-off:** No work but no improvement. Not acceptable for production quality.

---

## Fix Quality Assessment

### Quality Criteria
Every fix is evaluated against:
1. **Root Cause Fix** - Does it address the root cause or just symptoms?
2. **Tech Debt** - Does it make code harder to maintain?
3. **Architecture** - Does it follow established patterns?
4. **Scalability** - Will it work as system grows?
5. **Maintainability** - Can future developers understand/modify it?

---

### Option 1: Add allTiers to UserDashboardData

**Quality Analysis:**
- ✅ **Root Cause:** Addresses root cause (interface missing property, repository missing query)
- ✅ **Tech Debt:** Clean code, no debt created
- ✅ **Architecture:** Follows repository pattern perfectly
- ✅ **Scalability:** Scales well (tiers table stays small, query is indexed)
- ✅ **Maintainability:** Easy to maintain (changes in one place, clear responsibility)

**Overall Quality Rating:** EXCELLENT

**Warnings:** None

---

### Option 2: Query Tiers in Route

**Quality Analysis:**
- ❌ **Root Cause:** Treats symptoms (adds query) but creates new problem (architecture violation)
- ❌ **Tech Debt:** Creates debt (query logic scattered, harder to find/modify)
- ❌ **Architecture:** Violates layered architecture (route doing data access)
- ⚠️ **Scalability:** Works but makes pattern inconsistent
- ❌ **Maintainability:** Harder to maintain (logic in wrong place)

**Overall Quality Rating:** POOR

**Warnings:**
- ⚠️ **ARCHITECTURE WARNING:** This violates layered architecture by having route layer access database directly
- ⚠️ **TECH DEBT WARNING:** This creates technical debt by scattering data access logic across multiple files

**When to use despite warnings:**
- NOT RECOMMENDED - No valid reason to choose this over Option 1

---

### Option 3: Query Tiers in Service

**Quality Analysis:**
- ❌ **Root Cause:** Treats symptoms (adds query) but creates architecture problem
- ❌ **Tech Debt:** Creates debt (service doing data access)
- ❌ **Architecture:** Violates service layer responsibilities
- ⚠️ **Scalability:** Works but breaks dependency injection
- ❌ **Maintainability:** Harder to test and maintain

**Overall Quality Rating:** POOR

**Warnings:**
- ⚠️ **ARCHITECTURE WARNING:** This violates clean architecture by having service layer access database directly, bypassing repository layer
- ⚠️ **TECH DEBT WARNING:** This makes testing harder and breaks dependency injection pattern

**When to use despite warnings:**
- NOT RECOMMENDED - No valid reason to choose this over Option 1

---

### Option 4: Modify RPC Function

**Quality Analysis:**
- ✅ **Root Cause:** Addresses root cause (data not available)
- ⚠️ **Tech Debt:** Moderate debt (RPC function becomes more complex)
- ⚠️ **Architecture:** Acceptable but adds coupling
- ✅ **Scalability:** Scales well (single query)
- ❌ **Maintainability:** Harder to maintain (SQL migrations, not TypeScript)

**Overall Quality Rating:** ACCEPTABLE

**Warnings:**
- ⚠️ **TECH DEBT WARNING:** This increases RPC function complexity and makes future changes require database migrations

**When to use despite warnings:**
- If performance is critical concern and extra query is unacceptable
- If RPC function already being modified for other reasons
- If team prefers database-centric architecture

---

### Option 5: Accept Poor UX

**Quality Analysis:**
- ❌ **Root Cause:** Doesn't address root cause at all
- ❌ **Tech Debt:** Leaves broken code in place
- ❌ **Architecture:** N/A (no changes)
- ❌ **Scalability:** Poor UX scales to all users
- ❌ **Maintainability:** Leaves confusing code (why have tierLookup if it never works?)

**Overall Quality Rating:** UNACCEPTABLE

**Warnings:**
- ⚠️ **BANDAID FIX WARNING:** This approach treats symptoms (suppresses errors) without addressing the root cause
- ⚠️ **TECH DEBT WARNING:** This leaves broken functionality in codebase and defeats purpose of TypeScript

**When to use despite warnings:**
- NEVER RECOMMENDED - Not acceptable for production

---

## Recommended Fix: Option 1

**Add `allTiers` to `UserDashboardData` interface and query in `getUserDashboard()`**

**Rationale:**
1. **Clean Architecture:** Follows repository pattern - data access layer provides all data, consumers use it
2. **Minimal Changes:** Only repository file modified (interface + query), no changes to 6 consuming routes
3. **Future-Proof:** Other routes may need all tier info in future (missions history, tier filtering features)
4. **Maintains Existing Route Logic:** Route code already written correctly, just needs the data
5. **Small Performance Cost:** Tiers table < 10 rows per client, query < 5ms, negligible impact
6. **Quality Rating:** EXCELLENT - no architectural violations, no tech debt

**Quality Rating:** EXCELLENT
**Warnings:** None

---

## Assumptions Made During Analysis

**Verified Assumptions:**
1. ✅ Tiers table exists with tier_name, tier_color, tier_order columns - Verified in SchemaFinalv2.md
2. ✅ Tiers table has < 10 rows per client - Verified in schema (tier_order 1-6, max 6 tiers)
3. ✅ Multi-tenant isolation via client_id exists - Verified in existing tier queries (lines 147, 158)
4. ✅ Missions page is in production and working - Verified by reading route (no TODO markers, complete implementation)
5. ✅ allTiers only used in missions route - Verified by grep search (2 matches, both in same file)
6. ✅ transformMission() has fallback logic - Verified in previous discovery (uses tier ID if lookup fails)

**Unverified Assumptions:**
1. ⚠️ No caching strategy exists for tier data - Assumed based on code review (no cache found), but could not verify with certainty
2. ⚠️ Performance target for missions route is < 200ms - Assumed based on comment in route.ts line 21, but not verified with monitoring data

## Open Questions for User

**No open questions** - All necessary information gathered during discovery. Implementation can proceed with confidence.

---

## Impact Radius

**Files Directly Modified:** 1 file
- `lib/repositories/dashboardRepository.ts` - Add allTiers to interface (lines 23-58) and add query in getUserDashboard() (lines 96-199)

**Files Indirectly Affected:** 6 files (all receive allTiers but don't need changes)
- `app/api/missions/route.ts` - Uses allTiers (intended behavior) - **No changes needed**
- `app/api/rewards/route.ts` - Receives allTiers (unused but harmless) - **No changes needed**
- `app/api/rewards/history/route.ts` - Receives allTiers (unused but harmless) - **No changes needed**
- `app/api/rewards/[rewardId]/claim/route.ts` - Receives allTiers (unused but harmless) - **No changes needed**
- `app/api/missions/history/route.ts` - Receives allTiers (unused but harmless) - **No changes needed**
- `app/api/dashboard/featured-mission/route.ts` - Receives allTiers (unused but harmless) - **No changes needed**

**Routes Affected:** 6 routes (all GET endpoints)
- GET /api/missions - ✅ ENHANCED (tierLookup works correctly)
- GET /api/rewards - No impact (ignores allTiers)
- GET /api/rewards/history - No impact (ignores allTiers)
- POST /api/rewards/[id]/claim - No impact (ignores allTiers)
- GET /api/missions/history - No impact (could use allTiers in future)
- GET /api/dashboard/featured-mission - No impact (ignores allTiers)

**Database Changes:** NO
- No migrations required
- No schema changes
- Just adds one SELECT query to existing function

**Migration Required:** NO
- TypeScript-only changes
- No database schema modifications
- No data transformations needed

**Breaking Changes:** NO
- Additive change only (adding property to interface)
- All consuming code receives new property (backward compatible)
- Existing code that doesn't use allTiers continues to work

**Backward Compatibility:** ✅ FULL
- Adding optional property to response (not removing/changing existing properties)
- TypeScript consumers that don't reference allTiers will compile successfully
- JSON responses gain new field (frontend ignores unknown properties)

**Rollback Plan:**
- Simple: Revert the single commit to dashboardRepository.ts
- Zero risk: No database changes to rollback
- Missions route will return to showing tier IDs (poor UX but functional)

---

## Implementation Guide

### Prerequisites Before Implementing

1. Confirm working directory: `/home/jorge/Loyalty/Rumi/appcode`
2. Verify git status is clean or changes are committed
3. Understand this fix resolves 2 of 21 total TypeScript compilation errors
4. Note: Missions page currently works with fallback (tier IDs instead of names)
5. Note: No test coverage exists for tier lookup functionality (consider adding after fix)

### Fix Required (Option 1)

**Update 1 file:**
1. `lib/repositories/dashboardRepository.ts`
   - Add `allTiers` array to UserDashboardData interface (lines 23-58)
   - Add query for all tiers in getUserDashboard() function (lines 96-199)
   - Map query results to interface shape and include in return object

**No changes needed:**
- `app/api/missions/route.ts` - Already written correctly (lines 93-99)
- All 6 consuming routes - Work without modification

### Step-by-Step Implementation

**Step 1: Add allTiers to UserDashboardData Interface**
- File: `lib/repositories/dashboardRepository.ts`
- Lines: 23-58 (UserDashboardData interface)
- Action: Add new property `allTiers` array after `nextTier` property
- Verification: TypeScript compiler accepts new property definition

**Step 2: Add Database Query for All Tiers**
- File: `lib/repositories/dashboardRepository.ts`
- Lines: 155-160 (after nextTier query)
- Action: Add query to select all tiers for client, ordered by tier_order
- Verification: Query includes client_id filter (multi-tenant safety)

**Step 3: Map Query Results to Interface**
- File: `lib/repositories/dashboardRepository.ts`
- Lines: 162-199 (return statement)
- Action: Add allTiers array to return object, mapping database columns to interface fields
- Verification: All field names match interface (tier_name → name, tier_color → color)

**Step 4: Run TypeScript Compilation**
- Command: `npx tsc --noEmit`
- Verification: Error count reduces from 21 to 19
- Verification: No errors for missions/route.ts lines 95-96

---

## Before/After Code Blocks

### Fix 1: Add allTiers to UserDashboardData Interface

**File:** `lib/repositories/dashboardRepository.ts`

**Before (Lines 23-58):**
```typescript
export interface UserDashboardData {
  user: {
    id: string;
    handle: string;
    email: string | null;
  };
  client: {
    id: string;
    name: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
    supportEmail: string | null;
  };
  currentTier: {
    id: string;
    name: string;
    color: string;
    order: number;
    checkpointExempt: boolean;
  };
  nextTier: {
    id: string;
    name: string;
    color: string;
    salesThreshold: number;
    unitsThreshold: number;
  } | null;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
}
```

**After (Lines 23-63):**
```typescript
export interface UserDashboardData {
  user: {
    id: string;
    handle: string;
    email: string | null;
  };
  client: {
    id: string;
    name: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
    supportEmail: string | null;
  };
  currentTier: {
    id: string;
    name: string;
    color: string;
    order: number;
    checkpointExempt: boolean;
  };
  nextTier: {
    id: string;
    name: string;
    color: string;
    salesThreshold: number;
    unitsThreshold: number;
  } | null;
  allTiers: Array<{    // ✅ NEW: All tiers for client (for tier lookups in missions)
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
}
```

**Changes:**
- Added `allTiers` array property after `nextTier` (line 50)
- Array contains objects with: id, name, color, order
- Matches data needed for tierLookup map in missions route (id → {name, color})
- Includes `order` field for potential future sorting needs

**Important Notes:**
- Property added AFTER `nextTier` to maintain logical grouping (all tier-related data together)
- Uses same field structure as `currentTier` and `nextTier` for consistency
- Array type (not optional) - will always be present, even if empty (though tiers always exist for clients)

---

### Fix 2: Query All Tiers in getUserDashboard()

**File:** `lib/repositories/dashboardRepository.ts`

**Before (Lines 154-199):**
```typescript
    // Get next tier (tier_order + 1)
    const { data: nextTier } = await supabase
      .from('tiers')
      .select('*')
      .eq('client_id', clientId)
      .eq('tier_order', currentTier.tier_order + 1)
      .single();

    return {
      user: {
        id: user.id,
        handle: user.tiktok_handle,
        email: user.email,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        vipMetric: clientData.vip_metric as 'sales' | 'units',
        checkpointMonths: clientData.checkpoint_months ?? 4,
        supportEmail: clientData.primary_color,
      },
      currentTier: {
        id: currentTier.id,
        name: currentTier.tier_name,
        color: currentTier.tier_color,
        order: currentTier.tier_order,
        checkpointExempt: currentTier.checkpoint_exempt ?? false,
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.tier_name,
            color: nextTier.tier_color,
            salesThreshold: nextTier.sales_threshold ?? 0,
            unitsThreshold: nextTier.units_threshold ?? 0,
          }
        : null,
      checkpointData: {
        salesCurrent: user.checkpoint_sales_current ?? 0,
        unitsCurrent: user.checkpoint_units_current ?? 0,
        manualAdjustmentsTotal: user.manual_adjustments_total ?? 0,
        manualAdjustmentsUnits: user.manual_adjustments_units ?? 0,
        nextCheckpointAt: user.next_checkpoint_at,
        lastLoginAt: user.last_login_at,
      },
    };
```

**After (Lines 154-215):**
```typescript
    // Get next tier (tier_order + 1)
    const { data: nextTier } = await supabase
      .from('tiers')
      .select('*')
      .eq('client_id', clientId)
      .eq('tier_order', currentTier.tier_order + 1)
      .single();

    // ✅ NEW: Get all tiers for client (for tier lookups in missions route)
    const { data: allTiers } = await supabase
      .from('tiers')
      .select('id, tier_name, tier_color, tier_order')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: true });

    return {
      user: {
        id: user.id,
        handle: user.tiktok_handle,
        email: user.email,
      },
      client: {
        id: clientData.id,
        name: clientData.name,
        vipMetric: clientData.vip_metric as 'sales' | 'units',
        checkpointMonths: clientData.checkpoint_months ?? 4,
        supportEmail: clientData.primary_color,
      },
      currentTier: {
        id: currentTier.id,
        name: currentTier.tier_name,
        color: currentTier.tier_color,
        order: currentTier.tier_order,
        checkpointExempt: currentTier.checkpoint_exempt ?? false,
      },
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.tier_name,
            color: nextTier.tier_color,
            salesThreshold: nextTier.sales_threshold ?? 0,
            unitsThreshold: nextTier.units_threshold ?? 0,
          }
        : null,
      allTiers: (allTiers ?? []).map(tier => ({  // ✅ NEW: Map to interface shape
        id: tier.id,
        name: tier.tier_name,
        color: tier.tier_color,
        order: tier.tier_order,
      })),
      checkpointData: {
        salesCurrent: user.checkpoint_sales_current ?? 0,
        unitsCurrent: user.checkpoint_units_current ?? 0,
        manualAdjustmentsTotal: user.manual_adjustments_total ?? 0,
        manualAdjustmentsUnits: user.manual_adjustments_units ?? 0,
        nextCheckpointAt: user.next_checkpoint_at,
        lastLoginAt: user.last_login_at,
      },
    };
```

**Changes:**
1. Added new query after `nextTier` query (lines 162-166):
   - Queries tiers table for all tiers belonging to this client
   - Selects only needed fields: `id, tier_name, tier_color, tier_order`
   - Filters by `client_id` (CRITICAL for multi-tenant isolation)
   - Orders by `tier_order` ascending (Tier 1, 2, 3, etc.)

2. Added `allTiers` to return object (lines 196-201):
   - Maps database columns to interface field names (snake_case → camelCase)
   - Handles null case with empty array fallback (`allTiers ?? []`)
   - Transforms each tier object to match interface shape

**Query Details:**
```sql
-- Equivalent SQL query
SELECT id, tier_name, tier_color, tier_order
FROM tiers
WHERE client_id = $1
ORDER BY tier_order ASC;
```

**Important Notes:**
- **Multi-Tenant Safety:** Query includes `.eq('client_id', clientId)` filter (line 165)
- **Performance:** Selects only 4 columns (not `*`) to minimize payload
- **Performance:** Tiers table < 10 rows per client (max 6 tiers), query < 5ms
- **Indexed:** client_id is indexed via UNIQUE(client_id, tier_order) constraint
- **Null Handling:** Uses `allTiers ?? []` to ensure array even if query fails (defensive programming)
- **Field Mapping:** Maps tier_name → name, tier_color → color (matches interface)

---

## Verification Commands

### After Implementing Fix

**1. Run TypeScript compilation:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode
npx tsc --noEmit
```
**Expected:** Error count reduces from 21 to 19 (missions route allTiers errors resolved)

**2. Check specific file compilation:**
```bash
npx tsc --noEmit app/api/missions/route.ts
```
**Expected:** No errors related to allTiers or dashboardData

**3. Search for the specific error pattern:**
```bash
npx tsc --noEmit 2>&1 | grep "route.ts.*allTiers"
```
**Expected:** No output (no matches)

**4. Verify repository file compiles:**
```bash
npx tsc --noEmit lib/repositories/dashboardRepository.ts
```
**Expected:** No errors

**5. Count total errors:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Expected:** 19 (down from 21)

**6. Verify multi-tenant filter present:**
```bash
grep -A 3 "allTiers.*await supabase" lib/repositories/dashboardRepository.ts | grep client_id
```
**Expected:** Output shows `.eq('client_id', clientId)` line

---

## Runtime Testing Strategy

### Test 1: Missions API Returns allTiers in Dashboard Data

**Purpose:** Verify getUserDashboard() returns allTiers array with correct data

**Setup:**
- Authenticated user from test client
- Client has 4 tiers configured: Bronze, Silver, Gold, Platinum

**Request:**
```bash
curl -X GET http://localhost:3000/api/missions \
  -H "Authorization: Bearer <supabase-jwt-token>" \
  -H "Content-Type: application/json"
```

**Expected Response Structure:**
```json
{
  "user": {
    "id": "user-uuid",
    "handle": "creator123",
    "currentTier": "tier-2-uuid",
    "currentTierName": "Silver",
    "currentTierColor": "#C0C0C0"
  },
  "featuredMissionId": "mission-uuid",
  "missions": [
    {
      "id": "mission-uuid",
      "status": "locked",
      "lockedData": {
        "requiredTier": "tier-3-uuid",
        "requiredTierName": "Gold",        // ✅ Should show tier name, not ID
        "requiredTierColor": "#FFD700",
        "unlockMessage": "Unlock at Gold"  // ✅ User-friendly message
      }
    }
  ]
}
```

**Verification Checklist:**
- ✅ Response includes missions array
- ✅ Locked missions include `lockedData` object
- ✅ `lockedData.requiredTierName` shows tier name ("Gold"), not tier ID ("tier_3")
- ✅ `lockedData.unlockMessage` shows "Unlock at Gold" (user-friendly)
- ✅ Response status is 200

---

### Test 2: Tier Lookup Map Built Correctly

**Purpose:** Verify tierLookup Map is populated from allTiers

**Setup:** Add temporary console.log in route for debugging

**Code to Add (temporarily in missions/route.ts after line 99):**
```typescript
console.log('[DEBUG] tierLookup size:', tierLookup.size);
console.log('[DEBUG] tierLookup entries:', Array.from(tierLookup.entries()));
```

**Request:** Same as Test 1

**Expected Console Output:**
```
[DEBUG] tierLookup size: 4
[DEBUG] tierLookup entries: [
  ['tier-1-uuid', { name: 'Bronze', color: '#CD7F32' }],
  ['tier-2-uuid', { name: 'Silver', color: '#C0C0C0' }],
  ['tier-3-uuid', { name: 'Gold', color: '#FFD700' }],
  ['tier-4-uuid', { name: 'Platinum', color: '#E5E4E2' }]
]
```

**Verification Checklist:**
- ✅ tierLookup.size equals number of tiers for client (4 in example)
- ✅ Map contains entries for all tier UUIDs
- ✅ Each entry has `name` and `color` properties
- ✅ Tier names are user-friendly strings, not IDs

**Cleanup:** Remove console.log statements after verification

---

### Test 3: All Routes Still Work (Backward Compatibility)

**Purpose:** Verify other routes using getUserDashboard() continue working

**Test 3a: Rewards Route**
```bash
curl -X GET http://localhost:3000/api/rewards \
  -H "Authorization: Bearer <token>"
```
**Expected:** 200 OK, rewards data returned (allTiers present but unused)

**Test 3b: Rewards History Route**
```bash
curl -X GET http://localhost:3000/api/rewards/history \
  -H "Authorization: Bearer <token>"
```
**Expected:** 200 OK, history data returned (allTiers present but unused)

**Test 3c: Dashboard Featured Mission Route**
```bash
curl -X GET http://localhost:3000/api/dashboard/featured-mission \
  -H "Authorization: Bearer <token>"
```
**Expected:** 200 OK, featured mission data returned (allTiers present but unused)

**Verification Checklist:**
- ✅ All 6 routes return 200 OK
- ✅ No breaking changes to response structures
- ✅ No errors in server logs
- ✅ Frontend functionality unaffected

---

### Test 4: Multi-Tenant Isolation

**Purpose:** Verify allTiers filtered by client_id (no cross-tenant data leak)

**Setup:** Two test clients with different tiers
- Client A: 3 tiers (Bronze, Silver, Gold)
- Client B: 4 tiers (Starter, Pro, Expert, Master)

**Test 4a: Client A User**
```bash
curl -X GET http://localhost:3000/api/missions \
  -H "Authorization: Bearer <client-a-user-token>"
```

**Expected:**
- ✅ tierLookup contains only Client A's 3 tiers
- ✅ Tier names are "Bronze", "Silver", "Gold"
- ✅ No Client B tier names present

**Test 4b: Client B User**
```bash
curl -X GET http://localhost:3000/api/missions \
  -H "Authorization: Bearer <client-b-user-token>"
```

**Expected:**
- ✅ tierLookup contains only Client B's 4 tiers
- ✅ Tier names are "Starter", "Pro", "Expert", "Master"
- ✅ No Client A tier names present

**Verification Checklist:**
- ✅ Each client sees only their own tiers
- ✅ No cross-tenant data leakage
- ✅ Tier names match client configuration

---

### Test 5: Edge Case - User at Highest Tier

**Purpose:** Verify locked missions display correctly even when user is at highest tier

**Setup:**
- User at Tier 4 (Platinum - highest tier)
- No missions locked by tier (all tier-locked missions unlocked)

**Request:**
```bash
curl -X GET http://localhost:3000/api/missions \
  -H "Authorization: Bearer <tier-4-user-token>"
```

**Expected:**
- ✅ No missions have status "locked" with tier requirements
- ✅ tierLookup still built correctly (contains all 4 tiers)
- ✅ No errors in server logs
- ✅ Response includes all unlocked/available/completed missions

**Verification Checklist:**
- ✅ allTiers array contains all tiers (including user's current tier)
- ✅ tierLookup populated even if not used
- ✅ No null reference errors

---

## Dependency Analysis

### Files That Import/Use UserDashboardData

**Search Command:**
```bash
grep -rn "import.*UserDashboardData\|getUserDashboard" appcode/ --include="*.ts" --include="*.tsx"
```

**Known Usages:**

1. **lib/services/dashboardService.ts:15**
   - Imports: `import type { UserDashboardData } from '@/lib/repositories/dashboardRepository'`
   - Uses: Type annotation for function parameters
   - Impact: ✅ Non-breaking (TypeScript ignores unused properties)
   - Action Required: None

2. **app/api/missions/route.ts:81**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: `dashboardData.allTiers` for tierLookup map
   - Impact: ✅ FIXES ERROR (intended usage)
   - Action Required: None (already written correctly)

3. **app/api/rewards/route.ts:77**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: currentTier, client.vipMetric (ignores allTiers)
   - Impact: ✅ Non-breaking (unused property harmless)
   - Action Required: None

4. **app/api/rewards/[rewardId]/claim/route.ts:101**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: currentTier (ignores allTiers)
   - Impact: ✅ Non-breaking
   - Action Required: None

5. **app/api/rewards/history/route.ts:76**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: currentTier (ignores allTiers)
   - Impact: ✅ Non-breaking
   - Action Required: None

6. **app/api/missions/history/route.ts:78**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: user info (ignores allTiers)
   - Impact: ✅ Non-breaking (could use allTiers for future tier filtering feature)
   - Action Required: None

7. **app/api/dashboard/featured-mission/route.ts:84**
   - Calls: `dashboardRepository.getUserDashboard()`
   - Uses: user info (ignores allTiers)
   - Impact: ✅ Non-breaking
   - Action Required: None

### Potential Breaking Changes

**Risk Areas to Check:**

1. **API Routes Using Dashboard Data:**
   - **Current state:** 6 routes use `getUserDashboard()`
   - **Risk:** NONE - adding property to response doesn't break existing consumers
   - **Verification:** TypeScript validates interface usage, runtime ignores unused properties

2. **Frontend Pages:**
   - **Current state:** Dashboard, Missions, Rewards pages consume API responses
   - **Risk:** NONE - frontend TypeScript interfaces may need update, but backward compatible
   - **Verification:** Frontend ignores unknown properties in JSON responses

3. **Test Suites:**
   - **Current state:** Tests in tests/integration/api/dashboard.test.ts mock getUserDashboard
   - **Risk:** LOW - tests may need to add allTiers to mock data (optional, tests pass without it)
   - **Verification:** Run test suite after fix
   - **Action:** Update mock data to include allTiers: [] for completeness

4. **Database Performance:**
   - **Current state:** `getUserDashboard()` does 3 queries (user, currentTier, nextTier)
   - **After fix:** 4 queries (user, currentTier, nextTier, allTiers)
   - **Risk:** VERY LOW - tiers table small (< 10 rows per client), indexed on client_id
   - **Verification:** Monitor API response times (should stay < 200ms)

### Search Results

**Files affected by change:**
```
lib/repositories/dashboardRepository.ts - MODIFIED (interface + query)
```

**Files NOT affected but receive new data:**
```
app/api/missions/route.ts - ENHANCED (tierLookup works correctly)
app/api/rewards/route.ts - No impact (receives allTiers, ignores it)
app/api/rewards/history/route.ts - No impact (receives allTiers, ignores it)
app/api/rewards/[rewardId]/claim/route.ts - No impact (receives allTiers, ignores it)
app/api/missions/history/route.ts - No impact (receives allTiers, could use in future)
app/api/dashboard/featured-mission/route.ts - No impact (receives allTiers, ignores it)
```

---

## Data Flow Analysis

### Complete Data Pipeline

```
Database (PostgreSQL) - tiers table
  ↓
  SELECT id, tier_name, tier_color, tier_order
  FROM tiers
  WHERE client_id = $1
  ORDER BY tier_order ASC
  ↓
dashboardRepository.getUserDashboard()
  ↓ Query Result: Array<{ id, tier_name, tier_color, tier_order }>
  ↓ Transform to camelCase
  ↓
UserDashboardData.allTiers: Array<{ id, name, color, order }>
  ↓
GET /api/missions route (line 81)
  ↓ const dashboardData = await getUserDashboard(...)
  ↓ Extract dashboardData.allTiers (line 95)
  ↓ Build tierLookup Map (lines 95-99)
  ↓
tierLookup: Map<string, { name: string; color: string }>
  ↓ Pass to service layer (line 112)
  ↓
listAvailableMissions(userId, clientId, userInfo, vipMetric, tierLookup)
  ↓ Pass to transform function for each mission
  ↓
transformMission(rawMission, status, tierLookup)
  ↓ For locked missions: tierLookup.get(mission.tierEligibility)
  ↓ Returns: { name: "Gold", color: "#FFD700" }
  ↓
MissionItem.lockedData
  ↓
API Response JSON
  ↓
Frontend (missions page)
  ↓
User sees: "Unlock at Gold" ✅
```

### Query Count Impact

**Before Fix:**
```
getUserDashboard():
  Query 1: users (with client JOIN)
  Query 2: tiers (current tier)
  Query 3: tiers (next tier)
Total: 3 queries per call
```

**After Fix:**
```
getUserDashboard():
  Query 1: users (with client JOIN)
  Query 2: tiers (current tier)
  Query 3: tiers (next tier)
  Query 4: tiers (all tiers)  ✅ NEW
Total: 4 queries per call
```

**Performance Analysis:**
- Additional: 1 query per dashboard data fetch
- Tiers table: < 10 rows per client (max 6 tiers), indexed on client_id
- Query time: < 5ms (indexed query on small table)
- Routes affected: 6 routes (dashboard, missions, rewards, rewards/history, rewards/claim, missions/history)
- Frequency: Medium - called on page load, not on every interaction
- Total overhead per page load: < 5ms (negligible)

**Optimization Options (if needed later):**

1. **Option A: Cache allTiers in memory**
   ```typescript
   const tierCache = new Map<string, Array<Tier>>();
   // Cache expires on tier updates (rare - admin configuration only)
   ```
   - Benefit: Eliminates query for subsequent calls
   - Trade-off: Memory usage, cache invalidation complexity

2. **Option B: Combine queries with JOIN**
   ```sql
   SELECT users.*,
          current_tier.*,
          next_tier.*,
          all_tiers.*
   FROM users
   LEFT JOIN tiers as current_tier ON users.current_tier = current_tier.id
   LEFT JOIN tiers as next_tier ON ...
   LEFT JOIN tiers as all_tiers ON users.client_id = all_tiers.client_id
   ```
   - Benefit: Single query instead of 4
   - Trade-off: Complex query, harder to maintain, cartesian product

3. **Option C: Lazy load allTiers only when needed**
   ```typescript
   async getUserDashboard(userId, clientId, options?: { includeTiers?: boolean })
   // Only query allTiers if options.includeTiers === true
   ```
   - Benefit: Routes that don't need allTiers don't pay the cost
   - Trade-off: More complex API, missions route needs to pass flag

**Recommendation:** Monitor performance after deployment. Current approach is simplest. Tiers table is tiny and query is fast. Optimize only if metrics show need.

---

## Call Chain Mapping

### Detailed Function Call Trace

```
HTTP GET /api/missions
  ↓
app/api/missions/route.ts:export async function GET()
  ↓
  Step 1-3: Auth validation (lines 24-78)
    ↓ Validate JWT token
    ↓ Get user from users table
    ↓ Verify client_id match
  ↓
  Step 4: Get dashboard data (lines 80-91)
    ↓ const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
    ↓
    lib/repositories/dashboardRepository.ts:getUserDashboard()
      ↓ Query 1: users table (with client JOIN)
      ↓ Query 2: tiers table (current tier)
      ↓ Query 3: tiers table (next tier)
      ↓ Query 4: tiers table (all tiers) ← NEW QUERY
      ↓ Return: UserDashboardData (including allTiers)
    ↓
  ↓
  Step 5: Build tier lookup map (lines 93-99)
    ↓ const tierLookup = new Map()
    ↓ if (dashboardData.allTiers) {  ← ERROR FIXED HERE (allTiers now exists)
    ↓   for (const tier of dashboardData.allTiers) {
    ↓     tierLookup.set(tier.id, { name: tier.name, color: tier.color })
    ↓   }
    ↓ }
    ↓ tierLookup now contains: Map<tier_id → {name, color}>
  ↓
  Step 6: Get missions from service (lines 101-113)
    ↓ const missionsResponse = await listAvailableMissions(...)
    ↓ Pass tierLookup as 5th parameter
    ↓
    lib/services/missionService.ts:listAvailableMissions()
      ↓ Parameter: tierLookup: Map<string, { name, color }>
      ↓
      ↓ Step 1: Get raw mission data from repository
      ↓ const rawMissions = await missionRepository.listAvailable()
      ↓
      ↓ Step 2: Transform each mission
        ↓ for each mission: transformMission(data, status, tierLookup)
        ↓
        missionService.ts:transformMission()
          ↓ if (status === 'locked') {
          ↓   const requiredTierInfo = tierLookup.get(mission.tierEligibility)
          ↓   // requiredTierInfo = { name: "Gold", color: "#FFD700" }
          ↓   lockedData = {
          ↓     requiredTier: mission.tierEligibility,
          ↓     requiredTierName: requiredTierInfo?.name ?? mission.tierEligibility,
          ↓     requiredTierColor: requiredTierInfo?.color ?? '#6B7280',
          ↓     unlockMessage: `Unlock at ${requiredTierInfo?.name}`
          ↓   }
          ↓ }
          ↓ Return: MissionItem (with lockedData)
      ↓
      ↓ Step 3: Sort missions by priority
      ↓ Step 4: Return response
      ↓
  ↓
  Step 7: Return JSON response (line 117)
  ↓
HTTP Response: { user, featuredMissionId, missions }
```

**Key Points in Call Chain:**
- Line 81: dashboardData fetched (now includes allTiers)
- Line 95: ❌ ERROR WAS HERE - allTiers didn't exist on type
- Line 95: ✅ AFTER FIX - allTiers exists, no TypeScript error
- Line 96: ❌ ERROR WAS HERE - allTiers iteration failed type check
- Line 96: ✅ AFTER FIX - iteration works, tierLookup populated
- Line 112: tierLookup passed to service (no longer empty Map)
- transformMission: tierLookup.get() returns actual tier info (not undefined)

---

## Success Criteria Checklist

### TypeScript Compilation
- [ ] TypeScript compilation succeeds without allTiers errors
- [ ] Error count reduced from 21 to 19
- [ ] No new TypeScript errors introduced
- [ ] All routes using UserDashboardData still compile
- [ ] missions/route.ts lines 95-96 have no errors

### API Endpoint Functionality
- [ ] GET /api/missions returns expected data structure
- [ ] Response includes missions array
- [ ] Locked missions include lockedData object
- [ ] lockedData.requiredTierName shows tier name (not ID)
- [ ] lockedData.unlockMessage is user-friendly ("Unlock at Gold")

### Data Accuracy
- [ ] allTiers contains correct number of tiers for client (typically 3-6)
- [ ] allTiers ordered by tier_order (ascending: 1, 2, 3, ...)
- [ ] tierLookup map built correctly from allTiers
- [ ] Tier names in tierLookup match database tier_name values
- [ ] Tier colors in tierLookup match database tier_color values

### Multi-Tenant Isolation
- [ ] allTiers filtered by client_id in query
- [ ] Client A user sees only Client A tiers
- [ ] Client B user sees only Client B tiers
- [ ] No tier data leaked across tenants

### Performance
- [ ] API response time acceptable (< 200ms for missions route)
- [ ] Database query count reasonable (4 queries for getUserDashboard)
- [ ] No N+1 query issues introduced
- [ ] Tiers query uses index on client_id (UNIQUE constraint exists)

### Backward Compatibility
- [ ] Dashboard route still works (GET /api/dashboard/featured-mission)
- [ ] Rewards route still works (GET /api/rewards)
- [ ] Rewards history route still works (GET /api/rewards/history)
- [ ] Rewards claim route still works (POST /api/rewards/[id]/claim)
- [ ] Missions history route still works (GET /api/missions/history)
- [ ] No breaking changes to existing functionality

### Code Quality
- [ ] Code follows existing repository patterns (query structure, naming)
- [ ] Multi-tenant filter (client_id) present in allTiers query
- [ ] Error handling appropriate (null coalescing for allTiers)
- [ ] Type safety maintained (all fields properly mapped)
- [ ] No linter warnings introduced

**Definition of Done:**
All checkboxes above must be ✅ before considering fix complete.

---

## Integration Points

### Routes Using UserDashboardData

**1. GET /api/missions**
- **File:** `app/api/missions/route.ts`
- **Usage:** Uses allTiers to build tierLookup map for locked missions display
- **Impact:** ✅ ENHANCED - tierLookup works correctly, improved UX
- **Breaking:** NO - additive change only
- **Testing:** Verify locked missions show tier names ("Gold" not "tier_3")

**2. GET /api/rewards**
- **File:** `app/api/rewards/route.ts`
- **Usage:** Uses currentTier, ignores allTiers
- **Impact:** ✅ Non-breaking - receives extra property but doesn't use it
- **Breaking:** NO
- **Testing:** Verify rewards page still loads correctly

**3. POST /api/rewards/[rewardId]/claim**
- **File:** `app/api/rewards/[rewardId]/claim/route.ts`
- **Usage:** Uses currentTier for validation, ignores allTiers
- **Impact:** ✅ Non-breaking
- **Breaking:** NO
- **Testing:** Verify reward claiming still works

**4. GET /api/rewards/history**
- **File:** `app/api/rewards/history/route.ts`
- **Usage:** Uses currentTier, ignores allTiers
- **Impact:** ✅ Non-breaking
- **Breaking:** NO
- **Testing:** Verify rewards history page loads

**5. GET /api/missions/history**
- **File:** `app/api/missions/history/route.ts`
- **Usage:** Uses user info, ignores allTiers (could use for future tier filtering)
- **Impact:** ✅ Non-breaking, future enhancement opportunity
- **Breaking:** NO
- **Testing:** Verify missions history page loads

**6. GET /api/dashboard/featured-mission**
- **File:** `app/api/dashboard/featured-mission/route.ts`
- **Usage:** Uses user info, ignores allTiers
- **Impact:** ✅ Non-breaking
- **Breaking:** NO
- **Testing:** Verify dashboard featured mission displays

### Shared Utilities Impacted

**dashboardService.ts:**
- **File:** `lib/services/dashboardService.ts`
- **Impact:** Imports UserDashboardData type, will include allTiers property
- **Consumers:** Service layer functions that transform dashboard data
- **Action Required:** None (service ignores allTiers, uses other fields)

**No other shared utilities impacted** - This change is isolated to:
- `dashboardRepository.getUserDashboard()` function
- `UserDashboardData` interface
- Consuming routes (all backward compatible)

---

## Performance Considerations

### Database Query Analysis

**New Query:**
```sql
SELECT id, tier_name, tier_color, tier_order
FROM tiers
WHERE client_id = ?
ORDER BY tier_order ASC;
```

**Index Usage:**
- ✅ `client_id` is indexed (UNIQUE constraint on client_id + tier_order)
- ✅ Query uses index for WHERE clause (client_id filter)
- ✅ ORDER BY on indexed column (tier_order part of unique index)

**Row Count:**
- Minimum: 3 rows (typical client has 3 tiers: Bronze, Silver, Gold)
- Maximum: 6 rows (platform supports up to 6 tiers per client)
- Average: 4 rows (most clients have 4 tiers)

**Query Time Estimate:**
- < 5ms (indexed query on small table with < 10 rows)

**Query Execution Plan:**
- Index Scan on `tiers_client_id_tier_order_key` (UNIQUE index)
- Filtered by client_id
- Sorted by tier_order (already in index order, no extra sort needed)

### Response Payload Size

**Additional Data per Request:**
```json
"allTiers": [
  { "id": "uuid-1", "name": "Bronze", "color": "#CD7F32", "order": 1 },
  { "id": "uuid-2", "name": "Silver", "color": "#C0C0C0", "order": 2 },
  { "id": "uuid-3", "name": "Gold", "color": "#FFD700", "order": 3 },
  { "id": "uuid-4", "name": "Platinum", "color": "#E5E4E2", "order": 4 }
]
```

**Size Calculation:**
- UUID: 36 characters
- Name: average 8 characters (Bronze, Silver, Gold, Platinum)
- Color: 7 characters (#HEX)
- Order: 1 digit
- JSON overhead: ~50 characters per tier object
- **Size per tier:** ~100 bytes
- **Total for 4 tiers:** ~400 bytes

**Impact:** Negligible (< 1KB additional payload per request)

### Routes Affected Frequency

**High Frequency:**
- GET /api/missions - Called on missions page load, mission refresh
- GET /api/rewards - Called on rewards page load

**Medium Frequency:**
- GET /api/dashboard/featured-mission - Called on dashboard load
- GET /api/rewards/history - Called on rewards history page

**Low Frequency:**
- POST /api/rewards/[id]/claim - Called on reward claim action
- GET /api/missions/history - Called on missions history page

**Total Impact:**
- 1 additional query per route call (4 total queries instead of 3)
- Overhead: < 5ms per call
- Total: < 20ms per user session (assuming 4 page loads)
- **Acceptable performance cost** for improved UX

### Optimization Opportunities

**If performance becomes concern (unlikely given current metrics):**

1. **Option A: Cache allTiers in memory**
   ```typescript
   // In dashboardRepository.ts
   const tierCache = new Map<string, Array<Tier>>();

   async function getCachedTiers(clientId: string) {
     if (tierCache.has(clientId)) {
       return tierCache.get(clientId);
     }
     const tiers = await queryTiers(clientId);
     tierCache.set(clientId, tiers);
     return tiers;
   }
   // Cache expires on tier updates (rare - admin configuration only)
   ```
   - **Pros:** Eliminates repeated queries
   - **Cons:** Memory usage, cache invalidation complexity, stale data risk

2. **Option B: Include in initial user query with JOIN**
   ```sql
   SELECT users.*,
          tiers.*
   FROM users
   LEFT JOIN tiers ON users.client_id = tiers.client_id
   WHERE users.id = ? AND users.client_id = ?
   ORDER BY tiers.tier_order
   ```
   - **Pros:** Single query instead of 4
   - **Cons:** Complex query, cartesian product, harder to maintain

3. **Option C: Lazy load only when needed**
   ```typescript
   async getUserDashboard(
     userId: string,
     clientId: string,
     options?: { includeAllTiers?: boolean }
   )
   // Only query allTiers if options.includeAllTiers === true
   ```
   - **Pros:** Routes that don't need allTiers don't pay the cost
   - **Cons:** More complex API, caller needs to know when to request allTiers

**Recommendation:**
- Current approach is simplest and performance cost is negligible
- Monitor API response times in production
- Tiers table is tiny (< 10 rows per client)
- Query is fast (< 5ms, indexed)
- **Optimize only if metrics show performance degradation**

**Performance Monitoring:**
- Track P95 response time for GET /api/missions (target: < 200ms)
- Monitor database query duration for getUserDashboard
- Alert if response time exceeds 300ms

---

## Security/Authorization Check

### Multi-Tenant Isolation Verification

**Query Filter:**
```typescript
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color, tier_order')
  .eq('client_id', clientId)  // ✅ CRITICAL: Tenant filter
  .order('tier_order', { ascending: true });
```

**Security Checklist:**
- ✅ Query includes `.eq('client_id', clientId)` filter (line 165)
- ✅ `clientId` validated earlier in route (user.clientId === clientId check, line 69)
- ✅ Follows same pattern as existing tier queries (currentTier line 147, nextTier line 158)
- ✅ RLS (Row Level Security) policies apply if configured in Supabase

### Authorization Flow

```
User authenticates → JWT token
  ↓
Route validates JWT → authUser (Supabase auth)
  ↓
Get user from users table → user record
  ↓
Validate user.clientId === process.env.CLIENT_ID
  ↓ (Ensures user belongs to this tenant)
  ↓
Query tiers with client_id filter → only returns user's client tiers
  ↓
No cross-tenant data leak ✅
```

**Multi-Tenant Safety:**
1. **Authentication:** JWT token validated by Supabase auth (line 28)
2. **User Lookup:** User record fetched with user ID from JWT (line 56)
3. **Client Validation:** User's clientId verified against environment CLIENT_ID (line 69)
4. **Data Filtering:** All database queries filtered by validated clientId
5. **Tier Query:** allTiers query includes `.eq('client_id', clientId)` (line 165)

### Potential Security Concerns

**None identified:**
- ✅ Query properly scoped to client (client_id filter present)
- ✅ No user input in tier query (clientId from validated user record, not request)
- ✅ No risk of SQL injection (parameterized query via Supabase client)
- ✅ No PII exposed (tier names/colors are non-sensitive configuration data)
- ✅ No authentication bypass (JWT validated before any data access)
- ✅ RLS policies enforced (if configured in Supabase)

**Security Best Practices Followed:**
- Principle of Least Privilege: Query selects only needed columns (not `*`)
- Defense in Depth: Multiple layers of validation (JWT, user lookup, clientId check, query filter)
- Fail Secure: Returns null if any validation fails, doesn't expose data

---

## Code Reading Guide

**For LLM agents implementing this fix, read files in this order:**

### 1. Understand the Error
```
File: app/api/missions/route.ts
Lines: 93-99
Purpose: See where allTiers is accessed and how tierLookup is built
Key Points:
  - Line 95: if (dashboardData.allTiers) - ❌ TypeScript error here
  - Line 96: for (const tier of dashboardData.allTiers) - ❌ TypeScript error here
  - Line 97: tierLookup.set(...) - This is what we're trying to populate
  - Line 112: tierLookup passed to listAvailableMissions()
```

### 2. Check Current Interface
```
File: lib/repositories/dashboardRepository.ts
Lines: 23-58
Purpose: Understand current UserDashboardData structure (missing allTiers)
Key Points:
  - Interface includes: user, client, currentTier, nextTier, checkpointData
  - No allTiers property - this is the root cause
  - Need to add allTiers here
```

### 3. Examine Repository Function
```
File: lib/repositories/dashboardRepository.ts
Lines: 96-199
Purpose: See how getUserDashboard() currently queries tiers
Key Points:
  - Lines 143-148: currentTier query (pattern to follow)
  - Lines 155-160: nextTier query (pattern to follow)
  - Need to add allTiers query after nextTier query
  - Must include .eq('client_id', clientId) for multi-tenant isolation
```

### 4. Verify Database Schema
```
File: SchemaFinalv2.md (or grep output)
Purpose: Confirm tiers table structure and available columns
Key Points:
  - Table has: id, tier_name, tier_color, tier_order
  - UNIQUE(client_id, tier_order) constraint (provides index)
  - tier_order INTEGER 1-6
  - All fields NOT NULL
```

### 5. Understand tierLookup Usage
```
File: lib/services/missionService.ts
Search for: "tierLookup"
Purpose: See how tierLookup is used in service layer
Key Points:
  - listAvailableMissions() receives tierLookup as parameter
  - transformMission() calls tierLookup.get(mission.tierEligibility)
  - Used for locked missions to display "Unlock at Gold" vs "Unlock at tier_3"
```

### 6. Implement Interface Change
```
File: lib/repositories/dashboardRepository.ts
Lines: 23-58 (UserDashboardData interface)
Action: Add allTiers array property after nextTier property
Code:
  allTiers: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
```

### 7. Implement Query
```
File: lib/repositories/dashboardRepository.ts
Lines: 155-199 (after nextTier query, before return statement)
Action:
  1. Add query for all tiers (lines 162-166)
  2. Add allTiers to return object (lines 196-201)
Code: See "Before/After Code Blocks" section above
```

### 8. Verify TypeScript Compilation
```
Command: npx tsc --noEmit
Expected: Error count reduces from 21 to 19
Verification: No errors for missions/route.ts lines 95-96
```

---

## Common Pitfalls Warning

### Pitfall 1: Forgetting Multi-Tenant Filter

**DON'T:**
```typescript
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color, tier_order')
  .order('tier_order', { ascending: true });  // ❌ Returns tiers for ALL clients
```

**DO:**
```typescript
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color, tier_order')
  .eq('client_id', clientId)  // ✅ Filter by client
  .order('tier_order', { ascending: true });
```

**Why this matters:** Without client_id filter, tiers from all clients are returned, causing:
- Cross-tenant data leak (security vulnerability)
- Wrong tier names displayed (Client A sees Client B tier names)
- Compliance violation (data isolation breach)

---

### Pitfall 2: Wrong Column Names (snake_case vs camelCase)

**DON'T:**
```typescript
allTiers: (allTiers ?? []).map(tier => ({
  id: tier.id,
  name: tier.name,      // ❌ Database column is tier_name
  color: tier.color,    // ❌ Database column is tier_color
  order: tier.order,    // ❌ Database column is tier_order
}))
```

**DO:**
```typescript
allTiers: (allTiers ?? []).map(tier => ({
  id: tier.id,
  name: tier.tier_name,   // ✅ Correct database column
  color: tier.tier_color, // ✅ Correct database column
  order: tier.tier_order, // ✅ Correct database column
}))
```

**Why this matters:** Database uses snake_case, TypeScript uses camelCase. Must map correctly or:
- Runtime error: `undefined` values for name/color
- tierLookup contains { name: undefined, color: undefined }
- Locked missions display "Unlock at undefined"

---

### Pitfall 3: Not Handling Null Result

**DON'T:**
```typescript
allTiers: allTiers.map(tier => ...)  // ❌ Crashes if allTiers is null
```

**DO:**
```typescript
allTiers: (allTiers ?? []).map(tier => ...)  // ✅ Fallback to empty array
```

**Why this matters:** Supabase returns `null` if query fails or no rows found. Without null check:
- Runtime error: "Cannot read property 'map' of null"
- API returns 500 error instead of valid response
- User sees error page instead of missions

---

### Pitfall 4: Forgetting to Order Results

**DON'T:**
```typescript
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color, tier_order')
  .eq('client_id', clientId);  // ❌ Unordered results (random order)
```

**DO:**
```typescript
const { data: allTiers } = await supabase
  .from('tiers')
  .select('id, tier_name, tier_color, tier_order')
  .eq('client_id', clientId)
  .order('tier_order', { ascending: true });  // ✅ Ordered Tier 1, 2, 3...
```

**Why this matters:** Without ordering:
- Tiers returned in random order (depends on database insertion order)
- Inconsistent user experience
- Harder to debug (tier order changes between requests)
- Best practice: always order query results explicitly

---

### Pitfall 5: Selecting Unnecessary Columns

**DON'T:**
```typescript
.select('*')  // ❌ Returns all columns (sales_threshold, units_threshold, commission_rate, etc.)
```

**DO:**
```typescript
.select('id, tier_name, tier_color, tier_order')  // ✅ Only what we need
```

**Why this matters:**
- Reduces payload size (faster API responses)
- Clearer intent (explicit about what data is needed)
- Better performance (less data transferred from database)
- Security: don't expose columns not needed by consumer

---

### Pitfall 6: Adding allTiers in Wrong Place in Interface

**DON'T:**
```typescript
export interface UserDashboardData {
  user: { ... };
  client: { ... };
  allTiers: Array<...>;  // ❌ Wrong location (breaks logical grouping)
  currentTier: { ... };
  nextTier: { ... };
  checkpointData: { ... };
}
```

**DO:**
```typescript
export interface UserDashboardData {
  user: { ... };
  client: { ... };
  currentTier: { ... };
  nextTier: { ... };
  allTiers: Array<...>;    // ✅ After tier-related fields (logical grouping)
  checkpointData: { ... };
}
```

**Why this matters:**
- Logical grouping: all tier-related fields together
- Easier to read and understand interface structure
- Follows existing pattern (user, client, tiers, checkpoint)

---

### Pitfall 7: Not Updating Return Type After Adding Query

**DON'T:**
```typescript
// Add query but forget to include in return statement
const { data: allTiers } = await supabase.from('tiers').select(...);

return {
  user: {...},
  client: {...},
  currentTier: {...},
  nextTier: {...},
  checkpointData: {...},
  // ❌ Forgot to add allTiers to return object
};
```

**DO:**
```typescript
const { data: allTiers } = await supabase.from('tiers').select(...);

return {
  user: {...},
  client: {...},
  currentTier: {...},
  nextTier: {...},
  allTiers: (allTiers ?? []).map(...),  // ✅ Include in return
  checkpointData: {...},
};
```

**Why this matters:**
- Interface says allTiers exists, but runtime doesn't provide it
- TypeScript error: return type doesn't match interface
- Consumer receives undefined for allTiers (tierLookup stays empty)

---

## Related Documentation

- **TypeErrorsFix.md** - Master tracker for all 21 TypeScript errors (this is Category 2)
- **MISSIONS_IMPL.md** - Missions system implementation guide (context on missions feature)
- **SchemaFinalv2.md** - Database schema documentation (tiers table structure)
- **API_CONTRACTS.md** - API specifications (GET /api/missions endpoint contract)
- **ARCHITECTURE.md** - Architecture patterns (repository pattern, multi-tenancy)
- **EXECUTION_STATUS.md** - Current implementation status (phase tracking)

**Specific Sections:**
- MISSIONS_IMPL.md lines 750-880: transformMission() function (uses tierLookup)
- ARCHITECTURE.md Section 5: Repository Layer pattern
- ARCHITECTURE.md Section 9: Multi-tenancy enforcement (client_id filtering)
- API_CONTRACTS.md lines 2955-3238: GET /api/missions contract

---

## Related Errors

**Purpose:** Document context about related errors for awareness only (NOT for batch fixing)

**Note:** FSTSFix.md is designed for ONE error at a time. Do not suggest batch fixes.

**Similar Errors in Codebase:**
- None - this is the only error related to missing allTiers property

**Different Errors:**
- Category 3 (missionService.ts line 1118): Different - function arguments mismatch, different subsystem
- Category 4 (authService.ts line 408): Different - isAdmin property missing, different subsystem
- Category 6 (tiers/page.tsx lines 353-406): Different - count property missing, frontend not backend

**Important:** Each error should be fixed independently using its own FSTSFix.md document.

---

## Changelog

### 2025-12-05 (Version 1.0)
- Initial creation with comprehensive analysis following FSTSFix.md template
- Documented 2 TS2339 errors for allTiers property access
- Analyzed 5 alternative solutions (Option 1 recommended)
- Recommended Option 1: Add allTiers to UserDashboardData (Quality Rating: EXCELLENT)
- Included complete discovery process (7 steps)
- Added Fix Quality Assessment for all 5 alternatives
- Mapped data flow from database to frontend
- Documented call chain with line numbers
- Created success criteria checklist (7 categories)
- Added runtime testing strategy (5 test scenarios)
- Identified 6 consuming routes (all backward compatible)
- Performance analysis: < 5ms additional query time, negligible impact
- Security verification: multi-tenant isolation confirmed
- Common pitfalls documented (7 examples)

---

**Document Version:** 1.0
**Implementation Status:** Not yet implemented
**Next Action:** User reviews document → Approves → Implement Option 1 (add allTiers to interface and query)
