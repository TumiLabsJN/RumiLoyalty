# TypeScript Errors - Fix Tracker

**Purpose:** Track and document all TypeScript compilation errors across the codebase
**Created:** 2025-12-05
**Last Updated:** 2025-12-05
**Total Errors:** 21 (1 fixed, 21 remaining)
**Status:** In Progress

---

## Executive Summary

| Category | Count | Status | Priority | Phase |
|----------|-------|--------|----------|-------|
| Mission Claim Route | 1 | ✅ FIXED | HIGH | Phase 5 |
| Missions Route | 2 | ⏳ Pending | HIGH | Phase 5 |
| Mission Service | 1 | ⏳ Pending | HIGH | Phase 5 |
| Auth Service | 1 | ⏳ Pending | MEDIUM | Phase 3 |
| Admin Components | 1 | ⏳ Pending | MEDIUM | Phase 12 |
| Tiers Page | 5 | ⏳ Pending | MEDIUM | Frontend |
| Test Files | 11 | ⏳ Pending | LOW | Testing |
| **TOTAL** | **22 → 21** | **1 Fixed** | | |

---

## Fix Checklist

**Progress:** 1 / 22 errors fixed (4.5%)

### Phase 5: Mission System (4 errors)
- [x] **Category 1:** Mission Claim Route - firstName/lastName type mismatch (1 error) ✅
- [ ] **Category 2:** Missions Route - allTiers property missing (2 errors)
- [ ] **Category 3:** Mission Service - function arguments mismatch (1 error)

### Phase 3: Authentication (1 error)
- [ ] **Category 4:** Auth Service - isAdmin property missing (1 error)

### Phase 12: Admin Components (1 error)
- [ ] **Category 5:** Admin Table - generic type constraint (1 error)

### Frontend: User Pages (5 errors)
- [ ] **Category 6:** Tiers Page - count property missing (5 errors)

### Testing: Integration Tests (11 errors)
- [ ] **Category 7a:** History Completeness Tests (6 errors)
- [ ] **Category 7b:** Tier Filtering Tests (3 errors)
- [ ] **Category 7c:** Completion Detection Test (1 error)
- [ ] **Category 7d:** Claim Creates Redemption Test (1 error)

---

## Error Categories

### Category 1: Mission Claim Route (1 error) - ✅ FIXED

**File:** `app/api/missions/[missionId]/claim/route.ts`
**Line:** 124
**Error:** TS2322 - Type mismatch for shippingAddress firstName/lastName

```
error TS2322: Type '{ firstName?: string | undefined; lastName?: string | undefined; ... }'
is not assignable to type '{ firstName: string; lastName: string; ... }'.
```

**Root Cause:** Route defines `firstName?: string` (optional), repository expects `firstName: string` (required)

**Fix Documentation:** See `MissionPageFix.md` (1079 lines, comprehensive analysis)

**Fix Implemented:** 2025-12-05
1. ✅ `API_CONTRACTS.md` - Added firstName/lastName to shippingAddress schema (lines 3738-3739)
2. ✅ `lib/types/api.ts` - Added firstName/lastName to ShippingAddress interface (lines 443-444)
3. ✅ `app/api/missions/[missionId]/claim/route.ts` - Changed fields from optional to required (lines 29-30)
4. ✅ `MISSIONS_IMPL.md` - Updated documentation (lines 170-171)

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "app/api/missions/\[missionId\]/claim/route.ts(124"
# Result: No output (error resolved) ✅
```

**Impact:**
- Error count reduced from 22 to 21
- No production impact (no clients call endpoint, frontend uses different interface)
- Specification now accurate (firstName/lastName required for carrier delivery)

**Status:** ✅ FIXED (2025-12-05)

---

### Category 2: Missions Route (2 errors)

**File:** `app/api/missions/route.ts`
**Lines:** 95, 96
**Error:** TS2339 - Property 'allTiers' does not exist on type 'UserDashboardData'

```
error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
```

**Root Cause:** Route code references `dashboardData.allTiers` but `UserDashboardData` interface doesn't include this property.

**Investigation Needed:**
1. Check if `allTiers` was removed from interface
2. Check if property should be added to interface
3. Check if route should use different data source

**Fix Required:** TBD after investigation

**Status:** ⏳ Not investigated

---

### Category 3: Mission Service (1 error)

**File:** `lib/services/missionService.ts`
**Line:** 1118
**Error:** TS2554 - Expected 6 arguments, but got 4

```
error TS2554: Expected 6 arguments, but got 4.
```

**Root Cause:** Function signature changed (added 2 parameters) but caller wasn't updated.

**Investigation Needed:**
1. Identify which function is being called
2. Check what the 2 missing arguments are
3. Determine correct values to pass

**Fix Required:** TBD after investigation

**Status:** ⏳ Not investigated

---

### Category 4: Auth Service (1 error)

**File:** `lib/services/authService.ts`
**Line:** 408
**Error:** TS2353 - Object literal specifies unknown property 'isAdmin'

```
error TS2353: Object literal may only specify known properties, and 'isAdmin' does not exist in type '{ id: string; clientId: string; tiktokHandle: string; email: string; passwordHash: string; termsVersion?: string | undefined; }'.
```

**Root Cause:** Code tries to set `isAdmin` property but the target type doesn't include it.

**Investigation Needed:**
1. Check if `isAdmin` should be added to the type
2. Check if the code should use a different type
3. Check database schema for `is_admin` column

**Fix Required:** TBD after investigation

**Status:** ⏳ Not investigated

---

### Category 5: Admin Table Component (1 error)

**File:** `components/adm/data-display/AdminTable.tsx`
**Line:** 84
**Error:** TS7053 - Element implicitly has 'any' type

```
error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
```

**Root Cause:** Generic type constraint too loose, TypeScript can't verify string key access.

**Investigation Needed:**
1. Check generic type parameters
2. Add proper type constraint or type assertion

**Fix Required:** TBD after investigation

**Status:** ⏳ Not investigated

---

### Category 6: Tiers Page (5 errors)

**File:** `app/tiers/page.tsx`
**Lines:** 353, 359, 394, 400, 406
**Error:** TS2741 - Property 'count' is missing in type

```
error TS2741: Property 'count' is missing in type '{ type: "physical_gift"; isRaffle: true; displayText: string; sortPriority: number; }' but required in type 'AggregatedReward'.
```

**Root Cause:** Creating objects of type `AggregatedReward` without required `count` property.

**Pattern:** Same error 5 times for different reward type objects.

**Fix Required:** Add `count: number` to each object literal:
- Line 353: physical_gift raffle
- Line 359: physical_gift non-raffle
- Line 394: experience raffle
- Line 400: physical_gift raffle
- Line 406: experience non-raffle

**Status:** ⏳ Not fixed

---

### Category 7: Test Files (11 errors)

#### 7a. History Completeness Tests (6 errors)

**File:** `tests/integration/missions/history-completeness.test.ts`

| Line | Error | Description |
|------|-------|-------------|
| 216 | TS2352 | Type conversion may be mistake - array to Record |
| 257 | TS2352 | Type conversion may be mistake - array to Record |
| 336 | TS2352 | Type conversion may be mistake - array to Record |
| 452 | TS2353 | 'concludedAt' does not exist in type |
| 519 | TS2353 | 'rejectedAt' does not exist in type |
| 579 | TS2353 | 'concludedAt' does not exist in type |

**Root Cause:**
- TS2352: Test uses type assertion `as Record<string, unknown>` on arrays
- TS2353: Test passes properties not in type definition

#### 7b. Tier Filtering Tests (3 errors)

**File:** `tests/integration/missions/tier-filtering.test.ts`

| Line | Error | Description |
|------|-------|-------------|
| 308 | TS2367 | Comparison '"tier_4"' and '"tier_3"' have no overlap |
| 309 | TS2367 | Comparison '"tier_4"' and '"all"' have no overlap |
| 370 | TS2367 | Comparison '"all"' and '"tier_3"' have no overlap |

**Root Cause:** Comparing string literals that TypeScript knows can never be equal.

#### 7c. Completion Detection Test (1 error)

**File:** `tests/integration/missions/completion-detection.test.ts`

| Line | Error | Description |
|------|-------|-------------|
| 323 | TS2352 | Type conversion may be mistake - array to Record |

#### 7d. Claim Creates Redemption Test (1 error)

**File:** `tests/integration/missions/claim-creates-redemption.test.ts`

| Line | Error | Description |
|------|-------|-------------|
| 265 | TS2352 | Type conversion may be mistake - array to Record |

**Status:** ⏳ Not fixed (LOW priority - tests still run)

---

## Fix Priority Matrix

| Priority | Criteria | Errors |
|----------|----------|--------|
| **P0 - Critical** | Blocks API routes in current phase | 0 |
| **P1 - High** | Blocks Phase 5/6 routes or services | 4 |
| **P2 - Medium** | Frontend/admin components | 6 |
| **P3 - Low** | Test files (tests still run) | 11 |
| **Documented** | Has fix documentation | 1 |

---

## Fix Order Recommendation

### Sprint 1: Phase 5 Mission Fixes (4 errors → 3 remaining)
1. ✅ **COMPLETED** `MissionPageFix.md` - Applied documented fix (1 error) - 2025-12-05
2. ⏳ `missions/route.ts` - Fix allTiers property (2 errors)
3. ⏳ `missionService.ts` - Fix function call arguments (1 error)

### Sprint 2: Phase 3/12 Fixes (2 errors)
4. ⏳ `authService.ts` - Fix isAdmin property (1 error)
5. ⏳ `AdminTable.tsx` - Fix generic type constraint (1 error)

### Sprint 3: Frontend Fixes (5 errors)
6. ⏳ `tiers/page.tsx` - Add count property (5 errors)

### Sprint 4: Test Fixes (11 errors)
7. ⏳ Test type assertions and comparisons (11 errors)

---

## Investigation Commands

```bash
# Get full error output for a specific file
npx tsc --noEmit 2>&1 | grep "missions/route.ts"

# Check line content
sed -n '95,96p' app/api/missions/route.ts

# Find UserDashboardData definition
grep -rn "interface UserDashboardData" --include="*.ts"

# Find function being called at missionService line 1118
sed -n '1118p' lib/services/missionService.ts
```

---

## Related Documentation

- `MissionPageFix.md` - Comprehensive fix for mission claim route firstName/lastName
- `RewardFix.md` - Reward repository type fixes (if exists)
- `EXECUTION_STATUS.md` - Current implementation status

---

## Changelog

### 2025-12-05 (Updated)
- ✅ **FIXED** Category 1: Mission Claim Route firstName/lastName type mismatch
- Updated 4 files: API_CONTRACTS.md, lib/types/api.ts, route.ts, MISSIONS_IMPL.md
- Error count reduced from 22 to 21
- Added comprehensive fix checklist
- Updated Executive Summary with status column
- Verified fix with TypeScript compilation

### 2025-12-05 (Initial)
- Initial creation with 22 errors catalogued
- Categorized into 7 groups
- Linked to existing MissionPageFix.md documentation
- Created fix priority matrix

---

**Document Version:** 1.1
**Errors Fixed:** 1 / 22 (4.5%)
**Next Action:** Continue Sprint 1 - Fix missions/route.ts allTiers property (2 errors)
