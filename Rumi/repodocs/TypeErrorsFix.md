# TypeScript Errors - Fix Tracker

**Purpose:** Track and document all TypeScript compilation errors across the codebase
**Created:** 2025-12-05
**Last Updated:** 2025-12-07
**Total Errors:** 20 (5 fixed from original 22, +3 new test errors)
**Status:** In Progress

---

## Executive Summary

| Category | Count | Status | Priority | Phase |
|----------|-------|--------|----------|-------|
| Mission Claim Route | 1 | ✅ FIXED | HIGH | Phase 5 |
| Missions Route | 2 | ✅ FIXED | HIGH | Phase 5 |
| Mission Service | 1 | ✅ FIXED | HIGH | Phase 5 |
| Auth Service | 1 | ✅ FIXED | MEDIUM | Phase 3 |
| Admin Components | 1 | ⏳ Pending | MEDIUM | Phase 12 |
| Tiers Page | 5 | ⏳ Pending | MEDIUM | Frontend |
| Test Files | 11+3 | ⏳ Pending | LOW | Testing |
| **TOTAL** | **22 → 20** | **5 Fixed** | | |

---

## Fix Checklist

**Progress:** 5 / 22 errors fixed (22.7%)

### Phase 5: Mission System (4 errors → 0 remaining) ✅ COMPLETE
- [x] **Category 1:** Mission Claim Route - firstName/lastName type mismatch (1 error) ✅
- [x] **Category 2:** Missions Route - allTiers property missing (2 errors) ✅
- [x] **Category 3:** Mission Service - function arguments mismatch (1 error) ✅

### Phase 3: Authentication (1 error → 0 remaining) ✅ COMPLETE
- [x] **Category 4:** Auth Service - isAdmin property missing (1 error) ✅

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

### Category 2: Missions Route (2 errors) - ✅ FIXED

**File:** `app/api/missions/route.ts`
**Lines:** 95, 96 (original error lines)
**Error:** TS2339 - Property 'allTiers' does not exist on type 'UserDashboardData'

```
error TS2339: Property 'allTiers' does not exist on type 'UserDashboardData'.
```

**Root Cause:** Route code references `dashboardData.allTiers` but `UserDashboardData` interface didn't include this property.

**Fix Documentation:** See `MissionsRouteAllTiersFix.md` and `MissionsRouteAllTiersDecision.md`

**Fix Implemented:** 2025-12-05 - Modified Option 1 (opt-in flag)
1. ✅ `lib/repositories/dashboardRepository.ts` - Added `allTiers` property to UserDashboardData interface
2. ✅ `lib/repositories/dashboardRepository.ts` - Added optional `options?: { includeAllTiers?: boolean }` parameter to getUserDashboard()
3. ✅ `lib/repositories/dashboardRepository.ts` - Added conditional allTiers query (only executes if opted-in)
4. ✅ `lib/repositories/dashboardRepository.ts` - Added allTiers to return statement with field mapping
5. ✅ `app/api/missions/route.ts` - Updated to opt-in with `{ includeAllTiers: true }`
6. ✅ `app/api/missions/route.ts` - Added monitoring logs for empty tierLookup
7. ✅ `tests/integration/api/dashboard.test.ts` - Updated mock fixture to include `allTiers: []`

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep -i "allTiers"
# Result: No output (errors resolved) ✅

npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Result: 19 (reduced from 21) ✅
```

**Impact:**
- Error count reduced from 21 to 19
- Missions page now shows "Unlock at Gold" instead of "Unlock at tier_3"
- Performance: Only missions route pays query cost (opt-in pattern)
- Other 5 routes get empty array without extra database query

**Multi-tenant Safety:**
- ✅ allTiers query includes `.eq('client_id', clientId)` filter (line 176)

**Status:** ✅ FIXED (2025-12-05)

---

### Category 3: Mission Service (1 error) - ✅ FIXED

**File:** `lib/services/missionService.ts`
**Line:** 1118
**Error:** TS2554 - Expected 6 arguments, but got 4

```
error TS2554: Expected 6 arguments, but got 4.
```

**Root Cause:** Repository signature had 6 parameters (including currentTierId and rewardType) but service only passed 4 arguments. Analysis revealed the 2 extra parameters were DEAD CODE - never used in repository function body.

**Fix Documentation:** See `MissionServiceFix.md` (1,662 lines) and `MissionServiceFixIMPL.md` (754 lines)

**Fix Implemented:** 2025-12-06
1. ✅ `lib/repositories/missionRepository.ts` - Removed currentTierId and rewardType parameters from claimReward signature (lines 901-902)
2. ✅ Applied Option 2 (Remove Dead Parameters) - cleanest solution
3. ✅ Passed Codex audit with enhanced safety gates (export verification, test fixtures, dead code confirmation)

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "lib/services/missionService.ts(1118"
# Result: No output (error resolved) ✅

npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Result: 20 (reduced from 21) ✅
```

**Impact:**
- Error count reduced from 21 to 20
- Removed dead code (parameters never used in function body)
- Simplified repository signature (6 → 4 parameters)
- No breaking changes (only 1 call site, already passing 4 args)
- Verified: No interface exports, no test mocks affected

**Status:** ✅ FIXED (2025-12-06)

---

### Category 4: Auth Service (1 error) - ✅ FIXED

**File:** `lib/services/authService.ts`
**Line:** 408 (original error line)
**Error:** TS2353 - Object literal specifies unknown property 'isAdmin'

```
error TS2353: Object literal may only specify known properties, and 'isAdmin' does not exist in type '{ id: string; clientId: string; tiktokHandle: string; email: string; passwordHash: string; termsVersion?: string | undefined; }'.
```

**Root Cause:** Code attempted to pass `isAdmin: false` to `userRepository.create()`, but the function signature intentionally omits this parameter as a security constraint (userRepository.ts:180: "NO is_admin parameter allowed"). This prevents users from self-registering as administrators.

**Fix Documentation:** See `AuthServiceFix.md` v1.1 (1,500 lines, comprehensive analysis with Codex audit)

**Fix Implemented:** 2025-12-07 - Option 1 (Remove isAdmin Property)
1. ✅ `lib/services/authService.ts` - Removed `isAdmin: false,` from line 408
2. ✅ Applied Option 1 from AuthServiceFix.md (Remove isAdmin Property)
3. ✅ Passed Codex audit 1 - all 6 verifications PASSED (database schema, RPC function, single caller, test mocks, admin creation, frontend impact)
4. ✅ Passed Codex audit 2 - implementation plan hardened for brittleness (flexible baselines, migration-agnostic searches, re-run verification NOW)

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "lib/services/authService.ts(408"
# Result: No output (error resolved) ✅

npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
# Result: 20 (reduced from 21) ✅
```

**Impact:**
- Error count reduced from 21 to 20
- Security constraint preserved (database defaults is_admin to false, RPC hardcodes is_admin = false)
- No breaking changes (only 1 call site modified)
- No test mocks affected
- Zero frontend impact (monorepo architecture)

**Quality Rating:** EXCELLENT (removes code violating security constraint)

**Status:** ✅ FIXED (2025-12-07)

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

### Sprint 1: Phase 5 Mission Fixes (4 errors → 1 remaining)
1. ✅ **COMPLETED** `MissionPageFix.md` - Applied documented fix (1 error) - 2025-12-05
2. ✅ **COMPLETED** `MissionsRouteAllTiersDecision.md` - Applied opt-in flag fix (2 errors) - 2025-12-05
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
- `MissionServiceFix.md` - Comprehensive analysis of mission service claimReward error (1,662 lines)
- `MissionServiceFixIMPL.md` - Implementation plan with Codex audit enhancements (754 lines)
- `AuthServiceFix.md` - Comprehensive analysis of auth service isAdmin error (1,500 lines, Codex audit 1)
- `AuthServiceFixIMPL.md` - Implementation plan with brittleness fixes (1,050 lines, Codex audit 2)
- `TSErrorIMPL.md` - Reusable metaprompt template for implementation phase (976 lines)
- `EXECUTION_STATUS.md` - Current implementation status

---

## Changelog

### 2025-12-07 (Fourth Update - Category 4 Fixed)
- ✅ **FIXED** Category 4: Auth Service isAdmin property error (1 error)
- Updated 1 file: lib/services/authService.ts (removed `isAdmin: false,` from line 408)
- Error count reduced from 21 to 20
- Implemented Option 1 (Remove isAdmin Property) - respects security constraint
- Created comprehensive analysis: AuthServiceFix.md (1,500 lines, 27 sections per FSTSFix.md template)
- Created implementation plan: AuthServiceFixIMPL.md (1,050 lines per TSErrorIMPL.md template)
- Passed Codex audit 1: All 6 verifications PASSED (database schema, RPC function, single caller, test mocks, admin creation, frontend impact)
- Passed Codex audit 2: Implementation plan hardened for brittleness (flexible baselines, migration-agnostic searches, re-run verification NOW)
- Verified: Security constraint preserved (database defaults is_admin to false, RPC hardcodes is_admin = false)
- Phase 3 Authentication: **✅ COMPLETE** (1/1 errors fixed)
- Updated progress: 5 / 22 errors fixed (22.7%)

### 2025-12-06 (Third Update - Category 3 Fixed)
- ✅ **FIXED** Category 3: Mission Service function arguments mismatch (1 error)
- Updated 1 file: lib/repositories/missionRepository.ts (removed dead parameters from claimReward signature)
- Error count reduced from 21 to 20 (baseline 21 due to +2 new test file errors)
- Implemented Option 2 (Remove Dead Parameters) - cleanest solution
- Created comprehensive analysis: MissionServiceFix.md (1,662 lines, 27 sections per FSTSFix.md template)
- Created implementation plan: MissionServiceFixIMPL.md (754 lines per TSErrorIMPL.md template)
- Passed Codex audit: Added 3 safety gates (export verification, test fixtures, dead code confirmation)
- Verified: No interface exports, no test mocks affected, parameters confirmed dead code
- Confirmed database query NOT redundant (fetches 4 fields, all needed)
- Phase 5 Mission System: **✅ COMPLETE** (4/4 errors fixed)
- Updated progress: 4 / 22 errors fixed (18.2%)

### 2025-12-05 (Second Update - Category 2 Fixed)
- ✅ **FIXED** Category 2: Missions Route allTiers property missing (2 errors)
- Updated 3 files: dashboardRepository.ts (interface + query + opt-in), missions/route.ts (opt-in + monitoring), dashboard.test.ts (fixture)
- Error count reduced from 21 to 19
- Implemented Modified Option 1 with opt-in flag pattern
- Verified multi-tenant safety (client_id filter present)
- Added monitoring for empty tierLookup
- Verified fix with TypeScript compilation (19 errors remaining)
- Updated progress: 3 / 22 errors fixed (13.6%)

### 2025-12-05 (First Update - Category 1 Fixed)
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

**Document Version:** 1.4
**Errors Fixed:** 5 / 22 (22.7%)
**Next Action:** Sprint 2 - Phase 12 Fixes: AdminTable.tsx generic type constraint (1 error), then Frontend Fixes: tiers/page.tsx count property (5 errors)
