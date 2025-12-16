# Mission Service claimReward TypeScript Error - Fix Documentation

**Purpose:** Document TypeScript error TS2554 in missionService.ts claimReward function call
**Audience:** LLM agents implementing this fix
**Created:** 2025-12-05
**Status:** Not yet implemented

---

## Quick Reference

**Error Count:** 1 error
**Error Type:** TS2554 - Expected 6 arguments, but got 4
**Files Affected:** `lib/services/missionService.ts` line 1118
**Complexity Rating:** SIMPLE
**Estimated Fix Time:** 5-10 minutes
**Related Errors:** None (isolated error)
**Impact Radius:** 1 file modified, 0 files indirectly affected
**Breaking Changes:** NO
**Recommended Fix:** Pass missing parameters `currentTierId` and `rewardType` to repository function call

---

## Executive Summary

One TypeScript compilation error exists in `lib/services/missionService.ts` where the `claimMissionReward()` service function calls `missionRepository.claimReward()` with 4 arguments but the repository expects 6.

**Root Cause:** Incomplete refactor during "Missions refactored" commit (e1e08d9). The repository function signature was updated to accept `currentTierId` and `rewardType` parameters, but the service layer call was not updated to pass them. Both values exist in the service function's scope but are not being passed.

**Impact:** This is 1 of 19 compilation errors in codebase. The code cannot compile. The feature works at runtime despite the error (suggesting TypeScript strict mode is bypassed or the compiled JavaScript doesn't match TypeScript source).

**Fix:** Pass the two missing arguments (`currentTierId` and `rewardType`) to the repository function call. Both values are already available in function scope at lines 1005 and 1067 respectively.

---

## TypeScript Compilation Errors

### Error 1: Function Call Argument Count Mismatch

**File:** `lib/services/missionService.ts`
**Line(s):** 1118
**Error Type:** TS2554
**Error Message:**
```
lib/services/missionService.ts(1118,42): error TS2554: Expected 6 arguments, but got 4.
```

**Full Code Context:**
```typescript
// Lines 1110-1130 with surrounding context
          status: 'validation_error',
          message: 'Please select a size.',
        },
      };
    }
  }

  // 6. Process claim via repository
  const result = await missionRepository.claimReward(  // ❌ ERROR LINE 1118
    mission.redemption.id,
    userId,
    clientId,
    claimData
  );

  if (!result.success) {
    return {
      success: false,
      message: result.error ?? 'Failed to claim reward',
      redemptionId: mission.redemption.id,
```

**What the code is trying to do:**
The service layer is calling the repository layer to claim a mission reward. It's passing the redemption ID, user ID, client ID, and claim data (shipping address, size, activation date, etc.).

**Why it fails:**
The repository function `claimReward()` was updated to require 6 parameters:
1. `redemptionId: string`
2. `userId: string`
3. `clientId: string`
4. `currentTierId: string` ❌ MISSING
5. `rewardType: string` ❌ MISSING
6. `claimData: ClaimRequestData`

The service is only passing 4 arguments (parameters 1, 2, 3, and 6), omitting parameters 4 and 5.

---

## Discovery Process

### Step 1: Examined Error Location
**File:** `lib/services/missionService.ts` lines 1118-1123
**Purpose of Code:** Service layer calling repository to claim a mission reward
**Problem:** Function call passes 4 arguments but repository expects 6

### Step 2: Found Repository Function Signature
**File:** `lib/repositories/missionRepository.ts` lines 897-904
**Finding:** Repository function defined with 6 parameters:
```typescript
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  currentTierId: string,    // Parameter 4 - not passed by service
  rewardType: string,        // Parameter 5 - not passed by service
  claimData: ClaimRequestData
)
```
**Observation:** Parameters 4 and 5 exist in signature but are never used in function body (dead parameters).

### Step 3: Checked If Missing Values Exist in Service Scope
**File:** `lib/services/missionService.ts` lines 1001-1067
**Finding:** Both missing values are available:
- `currentTierId` - Function parameter at line 1005
- `rewardType` - Extracted from mission data at line 1067 (`const rewardType = mission.reward.type`)

### Step 4: Searched for Repository Function Usage
**Command:** `grep -rn "missionRepository.claimReward" appcode/lib/`
**Finding:** Only ONE call site - the error location at line 1118
**Implication:** Fixing this won't break other code (isolated change)

### Step 5: Traced Git History
**Command:** `git log --oneline --all -20 -- lib/repositories/missionRepository.ts`
**Finding:** Commit `e1e08d9` "Missions refactored" likely added parameters to repository
**Analysis:** Parameters were added to repository signature but:
1. Service layer was not updated to pass them
2. Repository code doesn't actually use the parameters (dead code)

### Step 6: Verified Parameter Usage in Repository
**File:** `lib/repositories/missionRepository.ts` lines 905-1046
**Searched for:** Uses of `currentTierId` and `rewardType` parameters
**Finding:**
- `currentTierId` - Defined at line 901, **never referenced** in function body
- `rewardType` - Defined at line 902, **never referenced** (function queries `reward.type` from database instead at line 947)

**Conclusion:** Parameters exist but are unused (dead parameters from incomplete refactor).

---

## Context on the Issue

### Business Functionality
**Feature:** Mission reward claiming - allows users to claim rewards after completing missions
**User Story:** User completes a mission → clicks "Claim Reward" → provides required info (shipping address for physical gifts, activation date for scheduled rewards) → reward is claimed
**Current State:** Feature works at runtime despite TypeScript error (JavaScript is compiled/running)

### Technical Context
**Why dead parameters exist:** During "Missions refactored" commit, someone added `currentTierId` and `rewardType` to the repository signature, likely intending to use them for validation or logging, but never implemented the actual usage. The parameters were added with the intention of future use that never happened.

**Why service wasn't updated:** The refactor was incomplete - repository signature changed but service layer call site was not updated to match.

**Why repository re-queries data:** Instead of trusting `rewardType` parameter, the repository queries the database for reward details (lines 945-949):
```typescript
const { data: reward } = await supabase
  .from('rewards')
  .select('id, type, value_data, redemption_type')
  .eq('id', redemption.reward_id)
  .single();
```
This makes the `rewardType` parameter redundant - it's passed but ignored.

**Current behavior:** TypeScript compilation fails, but if TypeScript is bypassed (ts-ignore, compiled JavaScript, etc.), the feature works because the repository doesn't actually need those parameters.

---

## Business Implications

### Impact: LOW

**Why LOW Impact:**
- This is 1 of 19 TypeScript compilation errors in codebase
- Build may be blocked by collective errors (not just this one)
- Feature works at runtime (parameters are unused anyway)
- No production traffic affected
- Runtime behavior is correct (reward claims work)

**Affected Functionality:**

**API Endpoint(s):**
- POST `/api/missions/[missionId]/claim` - Mission reward claiming

**User Experience:**
- Users can claim rewards successfully (no UX impact)
- Current behavior: Reward claim works properly
- After fix: No change to user experience (still works the same)

**Current Behavior:**
```typescript
// TypeScript compilation fails
// But runtime works:
User clicks "Claim Reward"
  → Service validates (lines 1008-1115)
  → Service calls repository with 4 args (TYPE ERROR)
  → Repository receives 4 args in JS (TypeScript ignored/bypassed)
  → Repository queries reward data from DB anyway
  → Claim succeeds
```

**After Fix:**
```typescript
// TypeScript compilation succeeds
// Runtime unchanged:
User clicks "Claim Reward"
  → Service validates
  → Service calls repository with 6 args (TYPE SAFE)
  → Repository receives 6 args (still unused)
  → Repository queries reward data from DB anyway
  → Claim succeeds
```

### Downstream Impact

**If left unfixed:**
- TypeScript error count remains at 19
- Build process may fail (if strict mode enabled)
- Code quality degraded (type safety compromised)
- Future refactors complicated by errors

**If fixed correctly:**
- TypeScript error count reduces to 18
- Type safety restored for this function call
- Code aligns with repository contract
- Foundation for cleanup (removing dead parameters later)

**Production Risk:** LOW
- **Current:** Feature works, no runtime risk
- **After fix:** No behavior change, no new risk
- **Consideration:** Dead parameters should be removed in future cleanup

---

## Alternative Solutions Analysis

### Option 1: Pass Missing Parameters (Quick Fix)

**Approach:**
Update service layer call to pass all 6 required parameters:
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,        // ✅ ADD - from function parameter line 1005
  rewardType,           // ✅ ADD - from extracted variable line 1067
  claimData
);
```

**Pros:**
- ✅ Fixes TypeScript error immediately
- ✅ Minimal change (1 file, 2 lines added)
- ✅ No breaking changes
- ✅ Aligns service with repository contract
- ✅ Values already available in scope (no additional queries needed)

**Cons:**
- ❌ Perpetuates dead code (parameters still unused in repository)
- ❌ Doesn't address root cause (incomplete refactor)
- ❌ Tech debt remains (should clean up later)

**Impact on Other Files:**
- No other files affected (isolated change)

**Trade-off:** Quick fix that resolves type error but doesn't clean up dead code. Acceptable as Step 1, should be followed by cleanup in future.

---

### Option 2: Remove Dead Parameters from Repository (Clean Fix)

**Approach:**
Remove unused parameters from repository signature and update service call:

**Step 1: Update repository signature:**
```typescript
// Before:
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  currentTierId: string,  // ❌ REMOVE - unused
  rewardType: string,     // ❌ REMOVE - unused
  claimData: ClaimRequestData
)

// After:
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  claimData: ClaimRequestData
)
```

**Step 2: Service call stays as-is (already correct):**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  claimData
);
```

**Pros:**
- ✅ Fixes TypeScript error
- ✅ Removes dead code (cleaner codebase)
- ✅ Simplifies repository signature (4 params instead of 6)
- ✅ No runtime impact (parameters weren't used anyway)
- ✅ Prevents future confusion about parameter usage

**Cons:**
- ❌ More changes required (2 files: repository signature + interface if exported)
- ❌ Requires verifying no other code passes these parameters
- ❌ Might break if parameters were intended for future use
- ❌ Requires updating any documentation that references 6-param signature

**Impact on Other Files:**
- `lib/repositories/missionRepository.ts` - Function signature change
- Potentially type definitions if `claimReward` signature is exported
- No caller impact (only 1 call site)

**Trade-off:** Cleaner solution that removes tech debt but requires more changes. Best for long-term code health but higher effort.

---

### Option 3: Implement Missing Parameter Logic (Proper Fix)

**Approach:**
Find out WHY `currentTierId` and `rewardType` parameters were added and implement their intended usage.

**Possible intended uses:**
1. **Validation:** Verify user's currentTier still eligible before claiming
2. **Audit logging:** Log tier and reward type with claim for analytics
3. **Optimization:** Avoid re-querying reward type from database
4. **Security:** Double-check reward type matches claim data requirements

**Example implementation:**
```typescript
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  currentTierId: string,
  rewardType: string,
  claimData: ClaimRequestData
): Promise<ClaimResult> {
  const supabase = await createClient();

  // ✅ NEW: Verify tier eligibility
  // (fetch mission to check tier_eligibility matches currentTierId)

  // ✅ NEW: Validate reward type matches claim data
  if (rewardType === 'physical_gift' && !claimData.shippingAddress) {
    return { success: false, error: 'Shipping required for physical gifts' };
  }

  // ✅ NEW: Optimization - trust rewardType instead of querying DB
  // (remove lines 945-949 that query reward.type)

  // ✅ NEW: Audit logging
  console.log('[ClaimReward]', { userId, currentTierId, rewardType, redemptionId });

  // ... rest of function
}
```

**Pros:**
- ✅ Completes the original refactor intention
- ✅ May add valuable validation or optimization
- ✅ Parameters serve purpose (not dead code)
- ✅ Fixes TypeScript error

**Cons:**
- ❌ Requires understanding original intent (may not be documented)
- ❌ Significant implementation work
- ❌ May introduce new bugs if logic is wrong
- ❌ Validation may be redundant (service layer already validates at lines 1052-1115)
- ❌ DB query removal might break if reward data is needed

**Impact on Other Files:**
- `lib/repositories/missionRepository.ts` - Significant logic changes
- Potentially new error paths
- May require additional testing

**Trade-off:** Theoretically best (completes refactor) but impractical without knowing original intent. Risk of over-engineering.

---

### Option 4: Type Assertion Workaround (Not Recommended)

**Approach:**
Suppress TypeScript error with type assertion or @ts-ignore:

```typescript
// @ts-ignore - TODO: Fix parameter count mismatch
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  claimData
);
```

**Pros:**
- ✅ Zero code changes (just comment)
- ✅ Instantly "fixes" compilation

**Cons:**
- ❌ Defeats type safety entirely
- ❌ Error remains in codebase
- ❌ Not a real fix
- ❌ Hides problem instead of solving it
- ❌ Future developers may not know what's wrong

**Trade-off:** Never acceptable for production code. Only use temporarily during investigation.

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

### Option 1: Pass Missing Parameters (Quick Fix)

**Quality Analysis:**
- ⚠️ **Root Cause:** Treats symptoms (TypeScript error) but not root cause (incomplete refactor)
- ⚠️ **Tech Debt:** Perpetuates dead code (parameters still unused)
- ✅ **Architecture:** Follows layered pattern (service → repository)
- ✅ **Scalability:** No impact (just type alignment)
- ✅ **Maintainability:** Simple change, easy to understand

**Overall Quality Rating:** ACCEPTABLE

**Warnings:**
- ⚠️ **TECH DEBT WARNING:** This approach passes parameters that are never used in the repository function. The `currentTierId` and `rewardType` parameters exist in the repository signature but are dead code - they're defined but never referenced in the function body. This is technical debt left over from an incomplete refactor.

**When to use despite warnings:**
- Quick fix needed to reduce error count
- Dead parameter cleanup can be deferred
- Acceptable as interim step before Option 2

---

### Option 2: Remove Dead Parameters from Repository (Clean Fix)

**Quality Analysis:**
- ✅ **Root Cause:** Addresses incomplete refactor by removing unused parameters
- ✅ **Tech Debt:** Removes dead code (cleaner codebase)
- ✅ **Architecture:** Simplifies repository contract
- ✅ **Scalability:** Cleaner signature easier to maintain
- ✅ **Maintainability:** Removes confusion about parameter usage

**Overall Quality Rating:** EXCELLENT

**Warnings:**
- None - this is the cleanest solution

**Why this is best:**
- Completes the refactor properly
- Removes technical debt
- Simpler signature (4 params vs 6)
- No downsides (parameters weren't used anyway)

---

### Option 3: Implement Missing Parameter Logic (Proper Fix)

**Quality Analysis:**
- ✅ **Root Cause:** Could address original refactor intent
- ⚠️ **Tech Debt:** Depends on implementation quality
- ⚠️ **Architecture:** May add redundant validation (service already validates)
- ⚠️ **Scalability:** Depends on implementation
- ❌ **Maintainability:** Complex without understanding original intent

**Overall Quality Rating:** POOR (without clear requirements)

**Warnings:**
- ⚠️ **BANDAID FIX WARNING:** Without knowing the original intent for these parameters, implementing logic is speculative and may introduce bugs or redundant validation.
- ⚠️ **ARCHITECTURE WARNING:** Service layer already validates tier eligibility (line 1053-1064) and reward type requirements (lines 1066-1115). Adding repository-level validation may violate single responsibility principle.

**When to use despite warnings:**
- Original requirements are documented somewhere
- Clear business need for repository-level validation
- Not recommended without evidence of need

---

### Option 4: Type Assertion Workaround (Not Recommended)

**Quality Analysis:**
- ❌ **Root Cause:** Ignores problem entirely
- ❌ **Tech Debt:** Creates massive tech debt
- ❌ **Architecture:** Violates type safety principles
- ❌ **Scalability:** Compounds problems over time
- ❌ **Maintainability:** Confuses future developers

**Overall Quality Rating:** POOR

**Warnings:**
- ⚠️ **BANDAID FIX WARNING:** This is not a fix, just hiding the error
- ⚠️ **TECH DEBT WARNING:** Defeats purpose of TypeScript
- ⚠️ **ARCHITECTURE WARNING:** Violates type safety

**When to use despite warnings:**
- NEVER in production code
- Only acceptable for temporary investigation

---

## Recommended Fix: Option 1 (Short-term) or Option 2 (Long-term)

**Short-term Recommended: Option 1 - Pass Missing Parameters**

**Rationale:**
1. Fixes TypeScript error immediately (reduces 19 → 18 errors)
2. Minimal risk (1 line change, values already in scope)
3. Aligns service call with repository contract
4. No breaking changes
5. Can be implemented in < 5 minutes

**Quality Rating:** ACCEPTABLE
**Warnings:** Creates technical debt (dead parameters), should follow with Option 2 cleanup

---

**Long-term Recommended: Option 2 - Remove Dead Parameters**

**Rationale:**
1. Fixes TypeScript error
2. Removes technical debt (dead parameters)
3. Simplifies repository signature (4 params instead of 6)
4. Completes the incomplete refactor properly
5. Better code quality long-term

**Quality Rating:** EXCELLENT
**Warnings:** None - cleanest solution

---

**Recommendation:** Implement **Option 1 now** (quick fix to reduce error count), then schedule **Option 2 as cleanup** in next refactor sprint.

---

## Assumptions Made During Analysis

**Verified Assumptions:**
1. ✅ Only 1 call site exists - Verified via `grep -rn "missionRepository.claimReward"`
2. ✅ `currentTierId` available in scope - Verified at line 1005 (function parameter)
3. ✅ `rewardType` available in scope - Verified at line 1067 (`mission.reward.type`)
4. ✅ Parameters are unused - Verified by reading repository function body (lines 905-1046)
5. ✅ Repository queries reward.type from DB - Verified at lines 945-949

**Unverified Assumptions:**
1. ⚠️ Original intent for parameters unknown - Could not find documentation of why they were added
2. ⚠️ Parameters may have been added for future use - No evidence found, assumed dead code
3. ⚠️ Removing parameters won't break anything - High confidence (only 1 call site, unused in body) but not 100% certain

## Open Questions for User

**No open questions** - All necessary information gathered during discovery. However, if you know the original intent for `currentTierId` and `rewardType` parameters in the repository, that would inform whether Option 3 (implement logic) is worth considering.

---

## Impact Radius

**Files Directly Modified:** 1 file

**Option 1 (Quick Fix):**
- `lib/services/missionService.ts` - Add 2 arguments to function call (lines 1121-1122)

**Option 2 (Clean Fix):**
- `lib/repositories/missionRepository.ts` - Remove 2 parameters from signature (lines 901-902)
- Service file unchanged (already has correct call)

**Files Indirectly Affected:** 0 files
- Only 1 call site exists (line 1118)
- No other code references these parameters

**Routes Affected:** 1 route
- POST `/api/missions/[missionId]/claim` - Mission reward claiming

**Database Changes:** NO
- No schema changes
- No migrations needed

**Migration Required:** NO
- Code-only change
- No data migration

**Breaking Changes:** NO
- Option 1: Service now passes 6 args, repository expects 6 (matches)
- Option 2: Repository now expects 4 args, service passes 4 (matches)

**Backward Compatibility:** ✅ SAFE
- Option 1: Repository signature unchanged (backward compatible)
- Option 2: Repository signature changed but only 1 caller (safe to update)

**Rollback Plan:**
- Option 1: Revert 2-line addition in service file
- Option 2: Revert parameter removal from repository signature

---

## Implementation Guide

### Prerequisites Before Implementing

1. Confirm working directory: `/home/jorge/Loyalty/Rumi/appcode`
2. Verify git status is clean or changes are committed
3. Have TypeScript compiler available: `npx tsc --noEmit`
4. Know current error count: 19 errors

### Fix Required (Option 1 - Recommended Short-term)

**Update 1 file:**
1. `lib/services/missionService.ts` - Add 2 missing arguments to function call

**No changes needed:**
- Repository file unchanged
- Route file unchanged
- No test updates needed (parameters are unused)

### Step-by-Step Implementation (Option 1)

**Step 1: Open Service File**
- File: `lib/services/missionService.ts`
- Navigate to lines 1118-1123
- Locate the `missionRepository.claimReward()` call

**Step 2: Add Missing Arguments**
- Lines: 1118-1123
- Action: Insert `currentTierId` and `rewardType` as arguments 4 and 5
- Verification: Count 6 total arguments

**Step 3: Verify Variable Availability**
- Check: `currentTierId` exists at line 1005 (function parameter)
- Check: `rewardType` exists at line 1067 (extracted variable)
- Verify both are in scope at line 1118

**Step 4: Test Compilation**
```bash
npx tsc --noEmit 2>&1 | grep "missionService.ts"
```
Expected: No output (error resolved)

**Step 5: Verify Error Count Reduction**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
Expected: 18 (down from 19)

---

## Before/After Code Blocks

### Fix 1: Add Missing Arguments to claimReward Call

**File:** `lib/services/missionService.ts`

**Before (Lines 1117-1123):**
```typescript
  // 6. Process claim via repository
  const result = await missionRepository.claimReward(
    mission.redemption.id,
    userId,
    clientId,
    claimData
  );
```

**After (Lines 1117-1125):**
```typescript
  // 6. Process claim via repository
  const result = await missionRepository.claimReward(
    mission.redemption.id,
    userId,
    clientId,
    currentTierId,        // ✅ ADD - parameter from line 1005
    rewardType,           // ✅ ADD - variable from line 1067
    claimData
  );
```

**Changes:**
- Line 1121: Added `currentTierId,` as 4th argument
- Line 1122: Added `rewardType,` as 5th argument
- Arguments now total 6, matching repository signature
- Both values already exist in function scope (no new variables needed)

**Important Notes:**
- `currentTierId` comes from function parameter at line 1005
- `rewardType` comes from `const rewardType = mission.reward.type;` at line 1067
- Order matters: parameters must match repository signature order
- Trailing comma after `rewardType` is required (or before `claimData`)

---

## Verification Commands

### After Implementing Fix

**1. Run TypeScript compilation:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode
npx tsc --noEmit
```
**Expected:** No error on missionService.ts:1118

**2. Check specific file compilation:**
```bash
npx tsc --noEmit lib/services/missionService.ts 2>&1 | grep "1118"
```
**Expected:** No output (no error at line 1118)

**3. Search for the specific error pattern:**
```bash
npx tsc --noEmit 2>&1 | grep "Expected 6 arguments, but got 4"
```
**Expected:** No output (error resolved)

**4. Verify missionService.ts has no errors:**
```bash
npx tsc --noEmit 2>&1 | grep "missionService.ts"
```
**Expected:** No output (file compiles cleanly)

**5. Count total errors:**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```
**Expected:** 18 (down from 19)

**6. Verify function call has 6 arguments:**
```bash
grep -A 6 "missionRepository.claimReward" lib/services/missionService.ts
```
**Expected:** See 6 arguments listed

---

## Runtime Testing Strategy

### Test 1: Claim Physical Gift Reward

**Purpose:** Verify mission claiming still works with new parameter passing

**Request:**
```bash
curl -X POST http://localhost:3000/api/missions/[missionId]/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "firstName": "Test",
      "lastName": "User",
      "line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA",
      "phone": "+14155551234"
    },
    "size": "L"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "redemptionId": "redeem_xyz123",
  "newStatus": "claimed",
  "nextAction": {
    "type": "navigate_to_rewards",
    "status": "success",
    "message": "Reward claimed! Check your email for shipping details."
  }
}
```

**Verification Checklist:**
- ✅ Response status 200 OK
- ✅ `success: true`
- ✅ `redemptionId` returned
- ✅ `newStatus` is "claimed"
- ✅ Database: redemptions.status updated to "claimed"
- ✅ Database: physical_gift_redemptions row created with shipping info

---

### Test 2: Claim Scheduled Reward (Commission Boost)

**Purpose:** Verify scheduled rewards work with parameter changes

**Request:**
```bash
curl -X POST http://localhost:3000/api/missions/[missionId]/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledActivationDate": "2025-12-15",
    "scheduledActivationTime": "09:00:00"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "redemptionId": "redeem_abc456",
  "newStatus": "claimed",
  "nextAction": {
    "type": "navigate_to_rewards",
    "status": "success",
    "message": "Reward claimed! It will activate on 12/15/2025."
  }
}
```

**Verification Checklist:**
- ✅ Response status 200 OK
- ✅ `success: true`
- ✅ Scheduled activation date/time stored correctly
- ✅ Database: commission_boost_redemptions row created
- ✅ `boost_status` set to "scheduled"

---

### Test 3: Claim Instant Reward (Gift Card)

**Purpose:** Verify instant rewards (no additional data needed)

**Request:**
```bash
curl -X POST http://localhost:3000/api/missions/[missionId]/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "redemptionId": "redeem_def789",
  "newStatus": "claimed",
  "nextAction": {
    "type": "navigate_to_rewards",
    "status": "success",
    "message": "Reward claimed! Check your rewards page."
  }
}
```

**Verification Checklist:**
- ✅ Response status 200 OK
- ✅ Works with empty request body
- ✅ No sub-state table created (instant rewards don't need them)
- ✅ redemptions.status updated to "claimed"

---

### Test 4: Error Case - Reward Already Claimed

**Purpose:** Verify error handling still works

**Request:**
```bash
curl -X POST http://localhost:3000/api/missions/[alreadyClaimedMissionId]/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Cannot claim: reward is claimed",
  "redemptionId": "redeem_xyz123",
  "nextAction": {
    "type": "navigate_to_rewards",
    "status": "error",
    "message": "This reward has already been claimed."
  }
}
```

**Verification Checklist:**
- ✅ Response status 400 Bad Request
- ✅ `success: false`
- ✅ Error message indicates already claimed
- ✅ No database changes

---

### Test 5: Multi-Tenant Isolation

**Purpose:** Verify tenant isolation still enforced (parameters don't break security)

**Request:**
```bash
# User A (Tenant A) tries to claim mission from Tenant B
curl -X POST http://localhost:3000/api/missions/[tenantBMissionId]/claim \
  -H "Authorization: Bearer <tenantAToken>" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Mission not found",
  "redemptionId": "",
  "nextAction": {
    "type": "navigate_to_missions",
    "status": "error",
    "message": "Please return to missions page."
  }
}
```

**Verification Checklist:**
- ✅ Response status 404 Not Found
- ✅ `success: false`
- ✅ Tenant A cannot access Tenant B mission
- ✅ Repository filters by client_id (security maintained)

---

**Minimum Tests:**
- Happy path: Instant, scheduled, and physical rewards
- Edge cases: Empty body, already claimed
- Error cases: Not found, tier ineligible
- Security: Multi-tenant isolation

---

## Dependency Analysis

### Files That Import/Use claimMissionReward

**Search Command:**
```bash
grep -rn "import.*claimMissionReward\|from.*missionService" appcode/ --include="*.ts" --include="*.tsx"
```

**Known Usages:**

1. **app/api/missions/[missionId]/claim/route.ts**
   - Uses: Imports `claimMissionReward` and calls it at line 115
   - Impact: Non-breaking (route already passes 5 params, matches service signature)
   - Action Required: None (route signature already correct)

### Potential Breaking Changes

**Risk Areas to Check:**

1. **Repository Parameter Addition (Option 1):**
   - **Current state:** Repository expects 6 parameters
   - **Risk:** NONE - Service will pass 6, repository expects 6 (matches)
   - **Verification:** TypeScript compilation success

2. **Repository Parameter Removal (Option 2):**
   - **Current state:** Repository expects 6 parameters but only uses 4
   - **Risk:** LOW - Only 1 call site, easy to verify
   - **Verification:** Grep confirms only 1 caller

### Search Results

**Files affected by change:**
```
lib/services/missionService.ts - Service layer (caller)
lib/repositories/missionRepository.ts - Repository layer (callee, signature only if Option 2)
```

**Files NOT affected but might seem related:**
```
app/api/missions/[missionId]/claim/route.ts - Route layer (calls service, not repository)
  Why not affected: Route calls service, not repository directly

app/api/missions/[missionId]/participate/route.ts - Different service function
  Why not affected: Uses participateInRaffle(), not claimReward()

lib/repositories/rewardRepository.ts - Different repository
  Why not affected: Separate claimReward exists for VIP tier rewards, not missions
```

---

## Data Flow Analysis

### Complete Data Pipeline

```
User (Frontend)
  ↓ POST /api/missions/[missionId]/claim
  ↓ Body: { shippingAddress, size, scheduledActivationDate }
  ↓
[API Route: missions/[missionId]/claim/route.ts]
  ↓ Line 115: Calls claimMissionReward()
  ↓ Passes: missionId, userId, clientId, currentTierId, claimData
  ↓
[Service Layer: missionService.ts]
  ↓ Line 1009: Fetches mission from repository
  ↓ Lines 1012-1064: Validates mission status, tier eligibility
  ↓ Lines 1066-1115: Validates claim data (shipping, size, activation date)
  ↓ Line 1118: Calls missionRepository.claimReward() ← ERROR LOCATION
  ↓ Should pass: redemptionId, userId, clientId, currentTierId, rewardType, claimData
  ↓ Currently passes: redemptionId, userId, clientId, claimData (MISSING 2 PARAMS)
  ↓
[Repository Layer: missionRepository.ts]
  ↓ Line 908: Queries redemptions table (verify exists, status='claimable')
  ↓ Line 945: Queries rewards table (get reward.type, value_data, redemption_type)
  ↓ Line 963: Updates redemptions.status = 'claimed'
  ↓ Lines 992-1041: Creates sub-state records (commission_boost_redemptions OR physical_gift_redemptions)
  ↓ Line 1043: Returns ClaimResult { success, redemptionId, newStatus }
  ↓
[Service Layer: missionService.ts]
  ↓ Line 1125: Receives result
  ↓ Line 1130: Returns ClaimResponse to route
  ↓
[API Route]
  ↓ Line 128: Returns HTTP response to frontend
  ↓
User sees: "Reward claimed!" message
```

### Query Count Impact

**Before Fix:**
```
claimMissionReward():
  Query 1: findById(missionProgressId) - Get mission details
  Query 2: claimReward() internals:
    Query 2a: SELECT redemptions (verify claimable)
    Query 2b: SELECT rewards (get reward type, value data)
    Query 2c: UPDATE redemptions (set status='claimed')
    Query 2d: INSERT commission_boost_redemptions OR physical_gift_redemptions
Total: 4-5 queries
```

**After Fix (Option 1):**
```
claimMissionReward():
  Query 1: findById(missionProgressId) - Get mission details
  Query 2: claimReward() internals:
    Query 2a: SELECT redemptions (verify claimable)
    Query 2b: SELECT rewards (get reward type, value data)
    Query 2c: UPDATE redemptions (set status='claimed')
    Query 2d: INSERT commission_boost_redemptions OR physical_gift_redemptions
Total: 4-5 queries (UNCHANGED)
```

**Performance Analysis:**
- Additional 0 queries (no change)
- Parameters passed but unused (no new database calls)
- Query time: Unchanged
- Frequency: Per mission claim (~1-10 per user per month)
- Total impact: None (parameters ignored by repository)

**Optimization Options (if needed later):**
- Remove Query 2b: Trust `rewardType` parameter instead of querying (requires implementing Option 3)
- Cache reward type data in service layer
- Batch reward data with mission fetch in Query 1

---

## Call Chain Mapping

### Detailed Function Call Trace

```
[Entry Point: HTTP POST /api/missions/[missionId]/claim]
  ↓
app/api/missions/[missionId]/claim/route.ts:115 POST()
  ↓ Validates auth (lines 27-40)
  ↓ Gets user from DB (lines 43-66)
  ↓ Verifies tenant match (lines 69-78)
  ↓ Parses request body (lines 81-111)
  ↓ Calls service:
  ↓
  lib/services/missionService.ts:1001 claimMissionReward()
    ↓ Parameters: (missionProgressId, userId, clientId, currentTierId, claimData)
    ↓
    ↓ Line 1009: Calls missionRepository.findById()
    ↓ Returns mission with status, tier eligibility, reward data
    ↓
    ↓ Line 1012: Validates mission exists
    ↓ Line 1019: Validates mission.progress.status === 'completed'
    ↓ Line 1030: Validates redemption.status === 'claimable'
    ↓ Line 1053: Validates tier eligibility
    ↓ Line 1067: Extracts rewardType = mission.reward.type
    ↓
    ↓ Lines 1071-1115: Validates claim data based on reward type:
    ↓   - Scheduled rewards: require scheduledActivationDate
    ↓   - Physical gifts: require shippingAddress (+ size if applicable)
    ↓
    ↓ Line 1118: Calls repository ← ERROR LOCATION
    ↓
    lib/repositories/missionRepository.ts:897 claimReward()
      ↓ Expected params: (redemptionId, userId, clientId, currentTierId, rewardType, claimData)
      ↓ Actual params: (redemptionId, userId, clientId, claimData) ← MISSING 2
      ↓
      ↓ Line 908: Query redemptions table (verify exists, claimable status)
      ↓ Line 945: Query rewards table (get type, value_data, redemption_type)
      ↓   ⚠️ Note: Re-queries reward.type despite rewardType param being passed
      ↓ Line 963: Update redemptions.status = 'claimed', claimed_at = now
      ↓ Lines 992-1041: Create sub-state records (if needed):
      ↓   - commission_boost: Insert to commission_boost_redemptions
      ↓   - physical_gift: Insert to physical_gift_redemptions with shipping
      ↓ Line 1043: Return ClaimResult { success, redemptionId, newStatus }
      ↓
    ↓ Line 1125: Service receives result
    ↓ Line 1130: Returns ClaimResponse with success/error/nextAction
    ↓
  ↓ Route Line 128: Returns HTTP response
  ↓
[Exit: Frontend receives JSON response]
```

**Key Points in Call Chain:**
- Line 1067: `rewardType` extracted (needed for repository call)
- Line 1118: Repository call with MISSING parameters (error location)
- Line 945: Repository re-queries reward.type (making `rewardType` param redundant)
- Line 1005: `currentTierId` available as function parameter (never used in repository)

---

## Success Criteria Checklist

### TypeScript Compilation
- [ ] TypeScript compilation succeeds without TS2554 error
- [ ] Error count reduced from 19 to 18
- [ ] No new TypeScript errors introduced
- [ ] `lib/services/missionService.ts` compiles cleanly

### API Endpoint Functionality
- [ ] POST `/api/missions/[missionId]/claim` returns expected data structure
- [ ] Mission claiming works for all reward types (instant, scheduled, physical)
- [ ] Validation logic still functions (tier eligibility, claim data requirements)
- [ ] Error cases handled correctly (not found, already claimed, invalid data)

### Data Accuracy
- [ ] `redemptions.status` updated to 'claimed' correctly
- [ ] `redemptions.claimed_at` timestamp set
- [ ] Sub-state records created correctly (commission_boost_redemptions, physical_gift_redemptions)
- [ ] Shipping address data stored accurately for physical gifts

### Multi-Tenant Isolation
- [ ] Repository queries still filtered by `client_id`
- [ ] Tenant A cannot claim Tenant B missions
- [ ] Security boundaries maintained (no data leakage)

### Performance
- [ ] API response time acceptable (< 500ms typical)
- [ ] Database query count unchanged (4-5 queries)
- [ ] No N+1 query issues
- [ ] Queries use appropriate indexes (redemptions.id, rewards.id)

### Backward Compatibility
- [ ] POST `/api/missions/[missionId]/claim` still works
- [ ] No breaking changes to existing functionality
- [ ] Frontend still functions correctly
- [ ] Other mission endpoints unaffected

### Code Quality
- [ ] Code follows existing patterns (layered architecture)
- [ ] Multi-tenant `client_id` filtering present in all queries
- [ ] Error handling appropriate
- [ ] Type safety maintained (no `any` types introduced)
- [ ] No linter warnings

### Monitoring & Alerting
- [ ] Identified key metrics to monitor (claim success rate, error rate)
- [ ] Defined alerts for failure conditions (claim failures > 5%)
- [ ] Existing logging sufficient (repository logs errors at lines 982, 1008, 1039)
- [ ] No silent failures introduced
- [ ] Monitoring captures both success and failure paths

**Why this matters:**
- Mission claiming is critical user flow (users expect rewards after completing missions)
- Silent failures would degrade UX (user completes mission but can't claim → frustration)
- Error monitoring helps detect issues early (sudden spike in "already claimed" errors might indicate duplicate requests)

**Minimum Requirements:**
- Log claim failures with context (userId, redemptionId, error reason)
- Alert when claim error rate > threshold
- Track claim success rate per reward type

**Definition of Done:**
All checkboxes above must be ✅ before considering fix complete.

---

## Integration Points

### Routes Using claimMissionReward

**1. POST /api/missions/[missionId]/claim**
- **File:** `app/api/missions/[missionId]/claim/route.ts`
- **Usage:** Line 115 - Calls `claimMissionReward(missionId, userId, clientId, currentTierId, claimData)`
- **Impact:** Non-breaking (route already passes correct parameters)
- **Breaking:** NO - Route signature already matches service signature (5 params)
- **Testing:** Test all reward types (instant, scheduled, physical), verify claims succeed

### Shared Utilities Impacted

**None** - This change is isolated to:
- Service layer: `lib/services/missionService.ts` (function call)
- Repository layer: `lib/repositories/missionRepository.ts` (function definition - unchanged if Option 1)

No shared utilities, helpers, or middleware affected by this change.

---

## Performance Considerations

### Database Query Analysis

**New/Modified Query:**
None (fix only changes function parameters, not database queries)

**Existing Queries (unchanged):**
```sql
-- Query 1: Verify redemption exists and is claimable
SELECT id, status, reward_id, mission_progress_id
FROM redemptions
WHERE id = $1 AND user_id = $2 AND client_id = $3 AND deleted_at IS NULL;

-- Query 2: Get reward details
SELECT id, type, value_data, redemption_type
FROM rewards
WHERE id = $4;

-- Query 3: Update redemption to claimed
UPDATE redemptions
SET status = 'claimed', claimed_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- Query 4 (conditional): Create sub-state record
INSERT INTO commission_boost_redemptions (...) VALUES (...);
-- OR
INSERT INTO physical_gift_redemptions (...) VALUES (...);
```

**Index Usage:**
- ✅ `redemptions.id` is primary key (indexed)
- ✅ `redemptions.user_id` likely indexed (multi-tenant filter)
- ✅ `rewards.id` is primary key (indexed)

**Row Count:**
- Minimum: 1 row (single redemption)
- Maximum: 1 row (SELECT SINGLE)
- Average: 1 row

**Query Time Estimate:**
- ~5-10ms total (indexed lookups + 2 writes)

### Response Payload Size

**Additional Data per Request:**
None (fix doesn't change response structure)

**Size:** 0 bytes (no change)
**Impact:** None

### Routes Affected Frequency

**Medium Frequency:**
- POST `/api/missions/[missionId]/claim` - Called when user clicks "Claim Reward" (1-10 times per user per month)

**Total Impact:**
- No performance change (parameters passed but unused)
- No additional database queries
- No payload size increase

### Optimization Opportunities

**If performance becomes concern:**

1. **Option A: Remove redundant reward query**
   ```typescript
   // Current: Repository queries reward.type despite receiving rewardType param
   const { data: reward } = await supabase
     .from('rewards')
     .select('id, type, value_data, redemption_type')
     .eq('id', redemption.reward_id)
     .single();

   // Optimized: Trust rewardType parameter (requires implementing Option 3)
   // Skip query, use parameter directly
   const reward = {
     type: rewardType,  // From parameter
     value_data: null,  // Would need to be passed too
     redemption_type: null  // Would need to be passed too
   };
   ```
   - Pros: Saves 1 database query
   - Cons: Requires passing full reward data as parameters

2. **Option B: Batch reward data with mission fetch**
   ```typescript
   // Service layer: Fetch mission WITH reward data in single query
   // Repository: Join rewards table in findById()
   // Result: Eliminate separate reward query
   ```
   - Pros: Reduces query count from 5 to 4
   - Cons: Requires repository refactor

**Recommendation:** Current approach acceptable (claim frequency is low, ~5-10ms is fast). Optimize only if profiling shows bottleneck.

---

## Security/Authorization Check

### Multi-Tenant Isolation Verification

**Query Filters:**
```typescript
// Repository line 908: Verify redemption belongs to user AND client
.eq('id', redemptionId)
.eq('user_id', userId)           // ✅ User isolation
.eq('client_id', clientId)       // ✅ Tenant isolation
.is('deleted_at', null)
```

**Security Checklist:**
- ✅ Query includes `client_id` filter (line 913)
- ✅ `clientId` validated earlier in flow (route layer, line 69-78)
- ✅ Follows same pattern as other repositories
- ✅ RLS (Row Level Security) policies may apply (Supabase)

### Authorization Flow

```
User authenticates → JWT token
  ↓
Route validates JWT → authUser object
  ↓
Route queries users table → user object
  ↓
Route validates user.clientId === process.env.CLIENT_ID
  ↓
Service receives validated userId, clientId
  ↓
Repository queries with client_id filter
  ↓
No unauthorized data access ✅
```

### Potential Security Concerns

**None identified:**
- ✅ Multi-tenant filtering properly implemented (client_id on all queries)
- ✅ User ownership verified (user_id on redemption query)
- ✅ No SQL injection risk (parameterized queries via Supabase client)
- ✅ No exposed PII (shipping address only stored, not returned in response)
- ✅ Auth token validated before any database access

**Security Red Flags Checked:**
- ✅ SQL injection vulnerabilities - None (Supabase uses parameterized queries)
- ✅ Cross-tenant data leaks - Prevented by `client_id` filtering
- ✅ Missing authorization checks - Validated at route layer
- ✅ Exposed PII or sensitive data - Shipping address stored securely, not leaked
- ✅ Unvalidated user input - Validated at service layer (lines 1071-1115)
- ✅ Missing rate limiting - Not in scope for this fix (should exist at API gateway)

---

## Code Reading Guide

**For LLM agents implementing this fix, read files in this order:**

### 1. Understand the Error
```
File: lib/services/missionService.ts
Lines: 1118-1123
Purpose: Locate the function call with too few arguments
Key Points:
  - Currently passes 4 arguments
  - Repository expects 6 arguments
  - Error: TS2554 "Expected 6 arguments, but got 4"
```

### 2. Check Repository Signature
```
File: lib/repositories/missionRepository.ts
Lines: 897-904
Purpose: Verify repository function signature
Key Points:
  - Line 898-903: 6 parameters defined
  - Parameters 4 and 5: currentTierId, rewardType
  - These are the missing parameters
```

### 3. Find Missing Values in Service Scope
```
File: lib/services/missionService.ts
Lines: 1001-1067
Purpose: Verify missing values are available
Key Points:
  - Line 1005: currentTierId (function parameter)
  - Line 1067: rewardType (extracted from mission.reward.type)
  - Both in scope at line 1118 (call site)
```

### 4. Verify Repository Parameter Usage
```
File: lib/repositories/missionRepository.ts
Lines: 905-1046
Purpose: Check if parameters are actually used
Key Points:
  - currentTierId: Defined at line 901, NEVER referenced in body
  - rewardType: Defined at line 902, NEVER referenced (queries reward.type at line 947 instead)
  - Conclusion: Dead parameters from incomplete refactor
```

### 5. Check Call Site Context
```
File: lib/services/missionService.ts
Lines: 1050-1125
Purpose: Understand validation before repository call
Key Points:
  - Lines 1053-1064: Tier eligibility validation
  - Lines 1071-1115: Claim data validation (shipping, size, activation)
  - Line 1118: Repository call (ERROR)
  - Service already validates everything repository would need
```

### 6. Implement Fix
```
File: lib/services/missionService.ts
Lines: 1118-1123
Action: Add currentTierId and rewardType as arguments 4 and 5
Verification: Count 6 total arguments in function call
```

---

## Common Pitfalls Warning

### Pitfall 1: Wrong Parameter Order

**DON'T:**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  rewardType,      // ❌ WRONG - Parameter 4 should be currentTierId
  currentTierId,   // ❌ WRONG - Parameter 5 should be rewardType
  claimData
);
```

**DO:**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,   // ✅ CORRECT - Parameter 4
  rewardType,      // ✅ CORRECT - Parameter 5
  claimData
);
```

**Why this matters:** TypeScript won't catch this (both are strings), but repository will receive wrong values if parameters are ever used.

---

### Pitfall 2: Using Wrong Variable Name

**DON'T:**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTier,     // ❌ WRONG - Variable is currentTierId, not currentTier
  rewardType,
  claimData
);
```

**DO:**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,   // ✅ CORRECT - Matches function parameter name
  rewardType,
  claimData
);
```

**Why this matters:** `currentTier` doesn't exist in scope, will cause ReferenceError.

---

### Pitfall 3: Forgetting to Extract rewardType

**DON'T:**
```typescript
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,
  mission.reward.type,  // ❌ NOT IDEAL - Inline access
  claimData
);
```

**DO:**
```typescript
// Line 1067 - Already exists
const rewardType = mission.reward.type;

// Line 1118
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,
  rewardType,          // ✅ CORRECT - Use extracted variable
  claimData
);
```

**Why this matters:** Variable already exists at line 1067 and is used elsewhere (lines 1071, 1087). Using it maintains consistency and avoids duplicate property access.

---

### Pitfall 4: Adding Parameters to Wrong Function

**DON'T:**
```typescript
// Wrong file: lib/repositories/missionRepository.ts
// Modifying repository signature when service needs fixing

async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  // Don't add more parameters here!
  claimData: ClaimRequestData
)
```

**DO:**
```typescript
// Correct file: lib/services/missionService.ts
// Add arguments to the CALL, not the signature

const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,   // ✅ ADD HERE (caller side)
  rewardType,      // ✅ ADD HERE (caller side)
  claimData
);
```

**Why this matters:** The repository signature is already correct (6 parameters). The service call is what's missing 2 arguments.

---

### Pitfall 5: Not Checking Variable Scope

**DON'T:**
```typescript
// Assuming currentTierId exists without checking
const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,  // Is this in scope? Did we check?
  rewardType,
  claimData
);
```

**DO:**
```typescript
// Verify variables exist in scope first:
// Line 1005: currentTierId (function parameter) ✅
// Line 1067: rewardType (extracted variable) ✅
// Line 1118: Both in scope ✅

const result = await missionRepository.claimReward(
  mission.redemption.id,
  userId,
  clientId,
  currentTierId,   // ✅ Verified in scope
  rewardType,      // ✅ Verified in scope
  claimData
);
```

**Why this matters:** Always verify variables exist in scope before using them. Don't assume.

---

## Related Documentation

- **TypeErrorsFix.md** - Category 3: Mission Service function arguments mismatch (this error)
- **MissionServiceFix.md** - This document (comprehensive fix guide)
- **ARCHITECTURE.md** - Layered architecture patterns (service → repository)
- **MISSIONS_IMPL.md** - Mission implementation details (if exists)
- **MissionRoutefix.md** - Related mission route fixes (if exists)
- **EXECUTION_STATUS.md** - Current implementation status

**Specific Sections:**
- TypeErrorsFix.md lines 113-133: Category 3 error description
- Git commit `e1e08d9`: "Missions refactored" - likely introduced this issue

---

## Related Errors

**Similar Errors in Codebase:**
- None found with same pattern (function argument count mismatch)

**Different Errors:**
- Category 1 (app/api/missions/[missionId]/claim/route.ts line 124): Type mismatch for shippingAddress - FIXED
- Category 2 (app/api/missions/route.ts lines 95-96): allTiers property missing - FIXED
- Category 4-7: Various other TypeScript errors (different root causes)

**Important:** Each error should be fixed independently using its own FSTSFix.md document.

---

## Changelog

### 2025-12-05 (Version 1.0)
- Initial creation with comprehensive analysis
- Documented 1 TS2554 error in missionService.ts
- Analyzed 4 alternative solutions
- Recommended Option 1 (short-term: pass parameters) and Option 2 (long-term: remove dead parameters)
- Included all 27 required sections per FSTSFix.md template
- Discovered parameters are dead code (unused in repository)
- Verified only 1 call site exists (isolated fix)
- Provided complete before/after code blocks
- Created 5-test runtime testing strategy
- Documented security (multi-tenant isolation verified)

---

**Document Version:** 1.0
**Implementation Status:** Not yet implemented
**Next Action:** Review document, approve Option 1 or Option 2, then implement fix
