# Rewards Page Performance Optimization - Implementation Plan

**Specification Source:** RewardsPagePerformanceEnhancement.md
**Enhancement ID:** ENH-008
**Type:** Enhancement (Performance Optimization)
**Priority:** High
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RewardsPagePerformanceEnhancement.md:**

**Enhancement Summary:** The `/rewards` page takes ~1900ms to load due to sequential database calls and duplicate auth verification.

**Business Need:** Reduce page load time to under 1000ms to improve creator engagement with rewards.

**Files to Modify:**
- `appcode/app/rewards/page.tsx` → MODIFY (replace auth.getUser with getSession, skip findByAuthId)
- `appcode/lib/repositories/dashboardRepository.ts` → MODIFY (add tier_achieved_at to query)
- `appcode/lib/services/rewardService.ts` → MODIFY (parallelize getRedemptionCount)

**Specified Solution (From Section 6):**
> Three optimizations:
> 1. Replace `auth.getUser()` with `auth.getSession()` - Local JWT validation instead of network call
> 2. Merge `findByAuthId()` into `getUserDashboard()` - Add `tier_achieved_at` to dashboard query
> 3. Parallelize `getRedemptionCount()` - Run it in parallel with `listAvailable()`

**Acceptance Criteria (From Section 16):**
1. [ ] auth.getSession() replaces auth.getUser() call
2. [ ] findByAuthId() call removed from page.tsx
3. [ ] tier_achieved_at added to getUserDashboard query and return type
4. [ ] getRedemptionCount parallelized with listAvailable via Promise.all
5. [ ] Type checker passes
6. [ ] Build completes
7. [ ] Page load time < 1100ms (verified in Vercel logs)
8. [ ] Security verified: forged tokens rejected
9. [ ] Claim flow still works

**From Audit Feedback:**
- Recommendation: APPROVE (v1.2)
- Critical Issues Addressed: Replaced jwt-decode with auth.getSession() for security
- Concerns Addressed: Added UserDashboardData consumer check to pre-implementation checklist

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 3
- Lines changed: ~30
- Breaking changes: NO
- Schema changes: NO (tier_achieved_at already exists)
- API contract changes: NO (internal optimization)

**Performance Target:**
- Before: ~1900ms
- After: ~950ms
- Improvement: ~50%

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean or acceptable state (ENH-008 doc may be untracked)

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Prerequisite Verification (ENH-006)

**Purpose:** Verify ENH-006 is implemented - page.tsx is Server Component, not client with mock data.

**Verify page.tsx is Server Component:**
```bash
head -10 /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** Contains `import { redirect }`, `async function RewardsPage`, NOT `"use client"`

**Verify auth.getUser() exists (to be replaced):**
```bash
grep -n "auth.getUser" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** Match found (confirms current state)

**Checklist:**
- [ ] page.tsx is Server Component: [YES/NO]
- [ ] auth.getUser() currently in use: [YES/NO]
- [ ] ENH-006 prerequisite met: [YES/NO]

---

### Gate 3: UserDashboardData Consumer Check

**Purpose:** Verify adding tierAchievedAt won't break consumers.

**Search for consumers:**
```bash
grep -rn "UserDashboardData" /home/jorge/Loyalty/Rumi/appcode --include="*.ts" --include="*.tsx" | grep -v node_modules
```
**Expected:** Only dashboardRepository.ts (defines) and dashboardService.ts (imports)

**Verify dashboardService doesn't use tierAchievedAt:**
```bash
grep -n "tierAchievedAt" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** No matches (safe to add field)

**Checklist:**
- [ ] Consumer count: [N] files
- [ ] Adding tierAchievedAt is safe: [YES/NO]

---

### Gate 4: Files to Modify Verification

**File 1:** `appcode/app/rewards/page.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** File exists

**File 2:** `appcode/lib/repositories/dashboardRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** File exists

**File 3:** `appcode/lib/services/rewardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts
```
**Expected:** File exists

**Checklist:**
- [ ] All 3 files exist: [YES/NO]
- [ ] File paths match ENH-008 spec: [YES/NO]

---

### Gate 5: Schema Verification

**Purpose:** Verify tier_achieved_at column exists in users table.

**Verify column in database types:**
```bash
grep -n "tier_achieved_at" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts | head -3
```
**Expected:** Match found in users table type

**Checklist:**
- [ ] tier_achieved_at column exists: [YES/NO]
- [ ] Type is string (timestamp) | null: [YES/NO]

---

### Gate 6: Current Timing Baseline

**Purpose:** Document current timing logs for comparison.

**Note:** Timing baseline already documented in ENH-008:
```
[TIMING][RewardsPage] auth.getUser(): 502ms
[TIMING][RewardsPage] findByAuthId(): 252ms
[TIMING][RewardsPage] getUserDashboard(): 448ms
[TIMING][rewardService] listAvailable(): 243ms
[TIMING][rewardService] getUsageCountBatch(): 254ms
[TIMING][rewardService] getRedemptionCount(): 192ms
[TIMING][RewardsPage] TOTAL: 1899ms
```

**Checklist:**
- [ ] Baseline timing documented: [YES]
- [ ] Target: < 1100ms

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For MODIFIED files: Pre-action check MUST match expected state
4. If any checkpoint fails, STOP and report

---

### Step 1: Add tier_achieved_at to dashboardRepository Query

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add tier_achieved_at to users query so we can skip findByAuthId

---

**Pre-Action Reality Check:**

**Read Current Query:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts lines 115-145
```

**Find the users select statement and add tier_achieved_at column.**

**Edit Action:**

**OLD Code (partial - the select columns):**
```typescript
    .select(`
      id,
      tiktok_handle,
      email,
      current_tier,
      checkpoint_sales_current,
```

**NEW Code:**
```typescript
    .select(`
      id,
      tiktok_handle,
      email,
      current_tier,
      tier_achieved_at,
      checkpoint_sales_current,
```

**Post-Action Verification:**
```bash
grep -n "tier_achieved_at" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** Match found in select statement

**Step Checkpoint:**
- [ ] tier_achieved_at added to query
- [ ] No syntax errors

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Add tierAchievedAt to UserDashboardData Return Type

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
**Action Type:** MODIFY
**Purpose:** Return tierAchievedAt in the user object

---

**Pre-Action Reality Check:**

**Read Current Return Object:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts lines 192-200
```

**Find the user return object and add tierAchievedAt.**

**Edit Action:**

**OLD Code:**
```typescript
    return {
      user: {
        id: user.id,
        handle: user.tiktok_handle,
        email: user.email,
      },
```

**NEW Code:**
```typescript
    return {
      user: {
        id: user.id,
        handle: user.tiktok_handle,
        email: user.email,
        tierAchievedAt: user.tier_achieved_at,
      },
```

**Post-Action Verification:**
```bash
grep -n "tierAchievedAt" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** Match found in return object

**Step Checkpoint:**
- [ ] tierAchievedAt added to return object
- [ ] No syntax errors

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Update UserDashboardData Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add tierAchievedAt to the user type in UserDashboardData interface

---

**Pre-Action Reality Check:**

**Find UserDashboardData interface:**
```bash
grep -n "export interface UserDashboardData" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```

**Read the interface:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts lines 25-45
```

**Edit the user property in the interface to include tierAchievedAt.**

**Step Checkpoint:**
- [ ] tierAchievedAt added to interface
- [ ] Type is `string | null`

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Parallelize getRedemptionCount in rewardService

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts`
**Action Type:** MODIFY
**Purpose:** Run listAvailable and getRedemptionCount in parallel

---

**Pre-Action Reality Check:**

**Read Current Sequential Calls:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts lines 820-850
```

**Edit Action:**

**OLD Code (sequential):**
```typescript
    // Step 1: Fetch rewards with active redemptions and sub-states
    const t1 = Date.now();
    const rawRewards = await rewardRepository.listAvailable(
      userId,
      clientId,
      currentTier,
      currentTierOrder
    );
    console.log(`[TIMING][rewardService] listAvailable(): ${Date.now() - t1}ms (${rawRewards.length} rewards)`);

    // Step 2: Get usage counts for all rewards in one batch query
    const rewardIds = rawRewards.map((r) => r.reward.id);
    const t2 = Date.now();
    const usageCountMap = await rewardRepository.getUsageCountBatch(
      userId,
      rewardIds,
      clientId,
      currentTier,
      tierAchievedAt
    );
    console.log(`[TIMING][rewardService] getUsageCountBatch(): ${Date.now() - t2}ms`);

    // Step 3: Get redemption count for history link
    const t3 = Date.now();
    const redemptionCount = await rewardRepository.getRedemptionCount(userId, clientId);
    console.log(`[TIMING][rewardService] getRedemptionCount(): ${Date.now() - t3}ms`);
```

**NEW Code (parallel):**
```typescript
    // Step 1: Fetch rewards AND redemption count IN PARALLEL (they're independent)
    const t1 = Date.now();
    const [rawRewards, redemptionCount] = await Promise.all([
      rewardRepository.listAvailable(userId, clientId, currentTier, currentTierOrder),
      rewardRepository.getRedemptionCount(userId, clientId),
    ]);
    console.log(`[TIMING][rewardService] Promise.all(listAvailable+getRedemptionCount): ${Date.now() - t1}ms (${rawRewards.length} rewards)`);

    // Step 2: Get usage counts (depends on rawRewards, so runs after)
    const rewardIds = rawRewards.map((r) => r.reward.id);
    const t2 = Date.now();
    const usageCountMap = await rewardRepository.getUsageCountBatch(
      userId,
      rewardIds,
      clientId,
      currentTier,
      tierAchievedAt
    );
    console.log(`[TIMING][rewardService] getUsageCountBatch(): ${Date.now() - t2}ms`);
```

**Post-Action Verification:**
```bash
grep -n "Promise.all" /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts | head -3
```
**Expected:** Match found in listAvailableRewards function

**Step Checkpoint:**
- [ ] Promise.all wraps listAvailable + getRedemptionCount
- [ ] getUsageCountBatch still runs after (needs rewardIds)
- [ ] redemptionCount variable still available later

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Replace auth.getUser() with auth.getSession() in page.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** MODIFY
**Purpose:** Use local JWT validation instead of network call

---

**Pre-Action Reality Check:**

**Read Current Auth Code:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx lines 28-40
```

**Edit Action:**

**OLD Code:**
```typescript
  const t2 = Date.now()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  console.log(`[TIMING][RewardsPage] auth.getUser(): ${Date.now() - t2}ms`)

  if (authError || !authUser) {
    redirect('/login/start')
  }
```

**NEW Code:**
```typescript
  // Use getSession() instead of getUser() - validates JWT locally, no network call
  const t2 = Date.now()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log(`[TIMING][RewardsPage] auth.getSession(): ${Date.now() - t2}ms`)

  if (sessionError || !session?.user) {
    redirect('/login/start')
  }

  const authUser = session.user
```

**Post-Action Verification:**
```bash
grep -n "getSession\|getUser" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** getSession found, getUser NOT found

**Step Checkpoint:**
- [ ] getUser() replaced with getSession()
- [ ] session.user extracted to authUser variable
- [ ] Error handling updated for session

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Remove findByAuthId() Call and Use Dashboard Data

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** MODIFY
**Purpose:** Skip redundant user lookup, use dashboardData instead

---

**Pre-Action Reality Check:**

**Read Current findByAuthId Code:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx lines 48-60
```

**Edit Action:**

**OLD Code:**
```typescript
  // 3. Get user from our users table - REUSES existing repository
  const t3 = Date.now()
  const user = await userRepository.findByAuthId(authUser.id)
  console.log(`[TIMING][RewardsPage] findByAuthId(): ${Date.now() - t3}ms`)
  if (!user) {
    redirect('/login/start')
  }

  // 4. Verify user belongs to this client (multitenancy)
  if (user.clientId !== clientId) {
    return <RewardsClient initialData={null} error="Access denied" />
  }

  // 5. Get dashboard data for tier info - REUSES existing repository
  const t4 = Date.now()
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
```

**NEW Code:**
```typescript
  // 3. Get dashboard data (includes user info + tier) - SKIP findByAuthId
  // getUserDashboard queries users table with client_id filter (multitenancy enforced)
  const t3 = Date.now()
  const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId)
  console.log(`[TIMING][RewardsPage] getUserDashboard(): ${Date.now() - t3}ms`)

  if (!dashboardData) {
    // User not found or doesn't belong to this client
    redirect('/login/start')
  }
```

**Post-Action Verification:**
```bash
grep -n "findByAuthId" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** No matches (removed)

**Step Checkpoint:**
- [ ] findByAuthId() call removed
- [ ] getUserDashboard() called with authUser.id directly
- [ ] Multitenancy still enforced (via client_id in dashboard query)

**Checkpoint Status:** [PASS / FAIL]

---

### Step 7: Update listAvailableRewards Call to Use Dashboard Data

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** MODIFY
**Purpose:** Use dashboardData.user.tierAchievedAt instead of user.tierAchievedAt

---

**Pre-Action Reality Check:**

**Read Current listAvailableRewards Call:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx lines 70-85
```

**Edit Action:**

Change `user.tierAchievedAt` to `dashboardData.user.tierAchievedAt`
Change `user.tiktokHandle` to `dashboardData.user.handle`

**Post-Action Verification:**
```bash
grep -n "dashboardData.user" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** Matches found for tierAchievedAt and handle

**Step Checkpoint:**
- [ ] tierAchievedAt sourced from dashboardData.user
- [ ] userHandle sourced from dashboardData.user.handle
- [ ] No references to old `user` variable

**Checkpoint Status:** [PASS / FAIL]

---

### Step 8: Remove Unused Import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** MODIFY
**Purpose:** Remove userRepository import since findByAuthId is no longer called

---

**Pre-Action Reality Check:**

**Read Current Imports:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx lines 1-10
```

**Edit Action:**

**OLD Code:**
```typescript
import { userRepository } from '@/lib/repositories/userRepository'
```

**NEW Code:**
(Remove this line entirely)

**Post-Action Verification:**
```bash
grep -n "userRepository" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** No matches

**Step Checkpoint:**
- [ ] userRepository import removed
- [ ] No unused imports

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All modified code must integrate cleanly.**

---

### Type Check

**Command:**
```bash
npx tsc --noEmit 2>&1 | head -30
```
**Expected:** No type errors

**Checklist:**
- [ ] dashboardRepository types correct
- [ ] rewardService types correct
- [ ] page.tsx types correct

---

### Build Verification

**Command:**
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes successfully

**Checklist:**
- [ ] Build passes
- [ ] No warnings related to modified files

---

**INTEGRATION STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Security Verification

### Auth Security Check

**Verify getSession() validates JWT:**
- [ ] Uses Supabase client (validates signature)
- [ ] Returns null for invalid/expired tokens
- [ ] Redirect to login on failure

### Multi-Tenant Security Check

**Verify client_id filtering maintained:**
```bash
grep -n "client_id\|clientId" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts | head -5
```
**Expected:** client_id filter in getUserDashboard query

**Checklist:**
- [ ] getUserDashboard still has `.eq('client_id', clientId)`
- [ ] No cross-tenant data exposure

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Feature Verification (ALL MUST PASS)

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors

**Status:** [ ] PASS / [ ] FAIL

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors

**Status:** [ ] PASS / [ ] FAIL

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: auth.getSession() replaces auth.getUser() call
**Test:** grep for getSession in page.tsx
**Command:**
```bash
grep -c "getSession" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** 1 or more matches
**Status:** [ ] PASS / [ ] FAIL

#### Criterion 2: findByAuthId() call removed from page.tsx
**Test:** grep for findByAuthId in page.tsx
**Command:**
```bash
grep -c "findByAuthId" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** 0 matches
**Status:** [ ] PASS / [ ] FAIL

#### Criterion 3: tier_achieved_at added to getUserDashboard query
**Test:** grep for tier_achieved_at in dashboardRepository.ts
**Command:**
```bash
grep -c "tier_achieved_at" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** 2 or more matches (query + return)
**Status:** [ ] PASS / [ ] FAIL

#### Criterion 4: getRedemptionCount parallelized with listAvailable
**Test:** grep for Promise.all in rewardService.ts
**Command:**
```bash
grep "Promise.all.*getRedemptionCount\|Promise.all.*listAvailable" /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts
```
**Expected:** Match found
**Status:** [ ] PASS / [ ] FAIL

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `app/rewards/page.tsx`: ~15 lines modified
- `lib/repositories/dashboardRepository.ts`: ~5 lines modified
- `lib/services/rewardService.ts`: ~15 lines modified

**Status:** [ ] PASS / [ ] FAIL

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED / [ ] FAILED

---

## Audit Trail

### Implementation Summary

**Date:** 2025-12-22
**Executor:** Claude Opus 4.5
**Specification Source:** RewardsPagePerformanceEnhancement.md
**Enhancement ID:** ENH-008

---

### Files Modified

1. `lib/repositories/dashboardRepository.ts` - MODIFY - Add tier_achieved_at to query and return
2. `lib/services/rewardService.ts` - MODIFY - Parallelize getRedemptionCount
3. `app/rewards/page.tsx` - MODIFY - Replace auth.getUser, remove findByAuthId

**Total:** 3 files modified

---

### Performance Improvement

**Before:**
```
auth.getUser(): 502ms
findByAuthId(): 252ms
getUserDashboard(): 448ms
listAvailableRewards(): 690ms (sequential)
TOTAL: ~1900ms
```

**After:**
```
auth.getSession(): ~5ms (local)
getUserDashboard(): ~450ms (includes tierAchievedAt)
listAvailableRewards(): ~500ms (parallel getRedemptionCount)
TOTAL: ~950ms
```

**Improvement:** ~950ms saved (50% faster)

---

## Document Status

**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

### Final Status

**Implementation Result:** [ ] SUCCESS / [ ] FAILED

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit and deploy

**Git Commit Message Template:**
```
perf: optimize /rewards page load time by 50%

Implements ENH-008: Rewards Page Performance Optimization

Changes:
- Replace auth.getUser() with auth.getSession() (saves ~500ms)
- Remove findByAuthId(), merge into getUserDashboard (saves ~250ms)
- Parallelize getRedemptionCount with listAvailable (saves ~150ms)

Modified files:
- app/rewards/page.tsx: Use getSession, skip findByAuthId
- lib/repositories/dashboardRepository.ts: Add tier_achieved_at
- lib/services/rewardService.ts: Promise.all for parallel queries

Performance: ~1900ms → ~950ms (50% improvement)

References:
- RewardsPagePerformanceEnhancement.md (ENH-008)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking COMPLETE, verify:**

### Reality Checks
- [ ] Actually ran EVERY bash command
- [ ] Read EVERY file mentioned
- [ ] Used EXACT line numbers from files
- [ ] Used COMPLETE code blocks

### Execution Integrity
- [ ] Executed steps in EXACT order
- [ ] Passed ALL checkpoints
- [ ] Documented ACTUAL results

### Security Verification
- [ ] auth.getSession() validates JWT signature
- [ ] client_id filtering maintained in getUserDashboard
- [ ] No cross-tenant data exposure

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED / [ ] CHECKS FAILED
