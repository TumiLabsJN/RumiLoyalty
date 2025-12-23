# Rewards History Auth Optimization - Enhancement Implementation Plan

**Specification Source:** RewardsHistoryAuthOptimizationEnhancement.md
**Enhancement ID:** ENH-011
**Type:** Enhancement (Performance Optimization)
**Priority:** High
**Implementation Date:** 2025-12-23
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RewardsHistoryAuthOptimizationEnhancement.md:**

**Gap Summary:** Replace redundant `auth.getUser()` (~500ms) and `findByAuthId()` (~200ms) with `getUserIdFromToken()` (~1ms) and use data from `getUserDashboard()`.

**Business Need:** Reduce `/rewards/rewardshistory` page load time from ~1132ms to ~430ms (62% improvement).

**Files to Modify:** `app/rewards/rewardshistory/page.tsx`

**Specified Solution (From ENH-011 Section 6):**
```typescript
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'

export default async function RewardsHistoryPage() {
  // 1. Get user ID from validated token (local decode, ~1ms)
  const userId = await getUserIdFromToken();
  if (!userId) redirect('/login/start');

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) return <RewardsHistoryClient initialData={null} error="Server configuration error" />;

  // 3. Get dashboard data (includes user.handle and tier info)
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);
  if (!dashboardData) redirect('/login/start');

  // 4. Get reward history - use handle from dashboardData
  const historyData = await rewardService.getRewardHistory({
    userId,
    clientId,
    userHandle: dashboardData.user.handle ?? '',
    currentTier: dashboardData.currentTier.id,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });

  return <RewardsHistoryClient initialData={historyData} error={null} />;
}
```

**Acceptance Criteria (From ENH-011 Section 16):**
1. [ ] `page.tsx` modified per Section 6 specification
2. [ ] Type checker passes
3. [ ] Build completes
4. [ ] Vercel logs show ~430ms total (was ~1132ms)
5. [ ] Manual verification completed

**From Audit Feedback:**
- Recommendation: APPROVE
- Critical Issues Addressed: None (no critical issues)
- Concerns Addressed:
  - Fallback logging already exists in helper
  - Timing logs will be kept for verification

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 1
- Lines changed: ~50 (removing ~70, adding ~40)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

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
**Expected:** Working tree may have uncommitted changes from ENH-011 analysis

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the page still uses `auth.getUser()` and `findByAuthId()` - not already optimized.

**Search for current auth pattern:**
```bash
grep -n "auth.getUser\|findByAuthId" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
```

**Expected:** Matches on lines ~41 and ~58 (gap still exists)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `auth.getUser`: [result]
- [ ] Grep executed for `findByAuthId`: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If pattern not found:** STOP. Page may have been already optimized.

---

### Gate 3: getUserIdFromToken Helper Exists

**Purpose:** Verify the ENH-010 helper exists and includes `/rewards` route.

**Check helper exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/supabase/get-user-id-from-token.ts
```
**Expected:** File exists

**Check ALLOWED_PAGE_ROUTES includes /rewards:**
```bash
grep -n "ALLOWED_PAGE_ROUTES" /home/jorge/Loyalty/Rumi/appcode/lib/supabase/get-user-id-from-token.ts | head -5
grep -A 8 "ALLOWED_PAGE_ROUTES" /home/jorge/Loyalty/Rumi/appcode/lib/supabase/get-user-id-from-token.ts
```
**Expected:** `/rewards` in array

**Checklist:**
- [ ] Helper file exists: [YES / NO]
- [ ] `/rewards` is in ALLOWED_PAGE_ROUTES: [YES / NO]

---

### Gate 4: getUserDashboard Returns user.handle

**Purpose:** Verify `getUserDashboard()` returns `user.handle` so we can skip `findByAuthId()`.

**Check return shape:**
```bash
grep -n "user.handle\|tiktok_handle\|user\.handle" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts | head -5
```
**Expected:** Return includes `handle: user.tiktok_handle` around line 197

**Checklist:**
- [ ] `getUserDashboard()` returns `user.handle`: [YES / NO]

---

### Gate 5: File to Modify Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx`

```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
wc -l /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
```
**Expected:** File exists, ~99 lines

**Checklist:**
- [ ] File exists: [YES / NO]
- [ ] Line count: [actual]

---

### Gate 6: Middleware Matcher Includes Route

**Purpose:** Verify `/rewards/:path*` is in middleware matcher (security requirement).

```bash
grep -n "/rewards" /home/jorge/Loyalty/Rumi/appcode/middleware.ts
```
**Expected:** `/rewards/:path*` in matcher around lines 212-213

**Checklist:**
- [ ] Route in middleware matcher: [YES / NO]

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. If any checkpoint fails, STOP and report

---

### Step 1: Modify page.tsx - Replace Auth Flow

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx`
**Action Type:** MODIFY
**Purpose:** Replace `createClient` + `auth.getUser()` + `findByAuthId()` with `getUserIdFromToken()` + use `dashboardData.user.handle`

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx lines 1-99
```

**Expected Current State (Lines 1-10):**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { userRepository } from '@/lib/repositories/userRepository'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current imports include `createClient` and `userRepository`: [YES / NO]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**Complete NEW File Content (with timing logs for verification):**
```typescript
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'

/**
 * Rewards History Page (Server Component)
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - ENH-011: Local JWT decode (no getUser() network call)
 * - Uses getUserDashboard() for user.handle (no findByAuthId() call)
 *
 * Auth Flow:
 * 1. Middleware runs setSession() - validates token, refreshes if needed
 * 2. Server Component decodes JWT locally to get user ID (~1ms vs ~500ms)
 * 3. getUserDashboard() provides user.handle and tier info
 * 4. Direct service calls for history data
 *
 * References:
 * - RewardsHistoryAuthOptimizationEnhancement.md (ENH-011)
 * - HomePageAuthOptimizationEnhancement.md (ENH-010 pattern)
 * - DATA_FLOWS.md /rewards/rewardshistory section
 */
export default async function RewardsHistoryPage() {
  const PAGE_START = Date.now();

  // 1. Get user ID from validated token (local decode, ~1ms)
  // Middleware already validated via setSession()
  const t1 = Date.now();
  const userId = await getUserIdFromToken();
  console.log(`[TIMING][RewardsHistoryPage] getUserIdFromToken(): ${Date.now() - t1}ms`);

  if (!userId) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[RewardsHistoryPage] CLIENT_ID not configured');
    return <RewardsHistoryClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data (includes user.handle and tier info)
  // This also validates user exists and belongs to this client
  const t2 = Date.now();
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);
  console.log(`[TIMING][RewardsHistoryPage] getUserDashboard(): ${Date.now() - t2}ms`);

  if (!dashboardData) {
    // User doesn't exist or doesn't belong to this client
    redirect('/login/start');
  }

  // 4. Get reward history - use handle from dashboardData
  const t3 = Date.now();
  const historyData = await rewardService.getRewardHistory({
    userId,
    clientId,
    userHandle: dashboardData.user.handle ?? '',
    currentTier: dashboardData.currentTier.id,
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  });
  console.log(`[TIMING][RewardsHistoryPage] getRewardHistory(): ${Date.now() - t3}ms`);

  console.log(`[TIMING][RewardsHistoryPage] TOTAL: ${Date.now() - PAGE_START}ms`);

  // 5. Return client component with data
  return <RewardsHistoryClient initialData={historyData} error={null} />;
}
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
Content: [full content above]
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
head -10 /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
```

**Expected New State (Lines 1-6):**
```typescript
import { redirect } from 'next/navigation'
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsHistoryClient } from './rewardshistory-client'
```

**State Verification:**
- [ ] Read command executed
- [ ] New imports use `getUserIdFromToken`: [YES / NO]
- [ ] `createClient` and `userRepository` removed: [YES / NO]

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]
**If FAIL:** [Exact failure point and actual state]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx`

**New Import:**
```typescript
import { getUserIdFromToken } from '@/lib/supabase/get-user-id-from-token';
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx 2>&1 | head -10
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct
- [ ] Exported name matches
- [ ] Types align

---

### Call Site Verification

**Function:** `getUserIdFromToken()`
- [ ] Returns `Promise<string | null>` - handled with `if (!userId)` check

**Function:** `dashboardRepository.getUserDashboard(userId, clientId)`
- [ ] Arguments match signature
- [ ] Returns dashboard data with `user.handle`

**Function:** `rewardService.getRewardHistory({...})`
- [ ] Uses `dashboardData.user.handle` for userHandle
- [ ] Returns `RedemptionHistoryResponse`

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `getUserDashboard(userId, clientId)`
```typescript
const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);
```

**Security Checklist:**
- [ ] `clientId` passed as parameter
- [ ] Repository uses `.eq('client_id', clientId)` filter
- [ ] Returns null if user not found or wrong client

**Query 2:** `getRewardHistory({...clientId...})`
```typescript
const historyData = await rewardService.getRewardHistory({
  userId,
  clientId,
  // ...
});
```

**Security Checklist:**
- [ ] `clientId` passed to service
- [ ] Service passes to repository
- [ ] Repository filters by `client_id`

---

### Auth Check

**Route:** `/rewards/rewardshistory`

**Checklist:**
- [ ] Middleware runs `setSession()` for this route
- [ ] `getUserIdFromToken()` checks for valid token
- [ ] Redirects to `/login/start` if not authenticated
- [ ] `getUserDashboard()` validates user belongs to client

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors
**Actual:** [count]

**Status:**
- [ ] Type check passed

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: page.tsx modified per Section 6 specification
**Test:** Verify imports and auth flow changed
**Command:**
```bash
grep -n "getUserIdFromToken\|createClient\|userRepository\|auth.getUser\|findByAuthId" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
```
**Expected:** Only `getUserIdFromToken` present, others removed
**Actual:** [output]
**Status:** [ ] PASS / FAIL

#### Criterion 2: Type checker passes
**Test:** Run tsc
**Command:**
```bash
npx tsc --noEmit 2>&1 | head -5
```
**Expected:** No errors
**Actual:** [output]
**Status:** [ ] PASS / FAIL

#### Criterion 3: Build completes
**Test:** npm run build
**Expected:** Build succeeds
**Actual:** [from Verification 1]
**Status:** [ ] PASS / FAIL

#### Criterion 4: Timing logs show improvement (post-deploy verification)
**Test:** Deploy and check Vercel logs
**Expected:** `TOTAL` shows ~430ms (was ~1132ms)
**Actual:** [to be verified after deploy]
**Status:** [ ] PENDING - Post-deploy

#### Criterion 5: Manual verification (post-deploy)
**Test:** Navigate to /rewards/rewardshistory, verify page renders
**Expected:** Page loads with history data or empty state
**Actual:** [to be verified after deploy]
**Status:** [ ] PENDING - Post-deploy

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat app/rewards/rewardshistory/page.tsx
```

**Expected Changes:**
- `app/rewards/rewardshistory/page.tsx`: ~50 lines changed

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED / FAILED]

**Acceptance Criteria Summary:**
| Criterion | From ENH-011 | Test Result |
|-----------|-------------|-------------|
| 1 | page.tsx modified | [PASS/FAIL] |
| 2 | Type checker passes | [PASS/FAIL] |
| 3 | Build completes | [PASS/FAIL] |
| 4 | Timing ~430ms | PENDING |
| 5 | Manual verification | PENDING |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-23
**Executor:** Claude Opus 4.5
**Specification Source:** RewardsHistoryAuthOptimizationEnhancement.md
**Implementation Doc:** RewardsHistoryAuthOptimizationEnhancementIMPL.md
**Enhancement ID:** ENH-011

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Helper Exists - [PASS/FAIL]
[Timestamp] Gate 4: getUserDashboard Returns handle - [PASS/FAIL]
[Timestamp] Gate 5: File Exists - [PASS/FAIL]
[Timestamp] Gate 6: Middleware Matcher - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Modify page.tsx - [Created/Modified] - [Verified]
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Build succeeds - [PASS/FAIL]
[Timestamp] Type check passes - [PASS/FAIL]
[Timestamp] Criterion 1: page.tsx modified - [PASS/FAIL]
[Timestamp] Criterion 2: Type check - [PASS/FAIL]
[Timestamp] Criterion 3: Build - [PASS/FAIL]
[Timestamp] Criterion 4: Timing - PENDING
[Timestamp] Criterion 5: Manual - PENDING
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `app/rewards/rewardshistory/page.tsx` - MODIFY - ~70 lines - Replace auth flow with ENH-010 pattern

**Total:** 1 file modified

---

### Expected Performance Improvement

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| `auth.getUser()` | ~246-617ms | 0ms | ~500ms |
| `findByAuthId()` | ~175-759ms | 0ms | ~200ms |
| `getUserIdFromToken()` | 0ms | ~1ms | -1ms |
| **Net Savings** | | | **~700ms** |
| **Total Page Load** | ~1132ms | ~430ms | **62%** |

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify file modified
git diff --stat app/rewards/rewardshistory/page.tsx
# Should show: 1 file changed

# 2. Verify new imports
grep -n "getUserIdFromToken" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
# Should show: import on line 2

# 3. Verify old imports removed
grep -n "createClient\|userRepository\|auth.getUser\|findByAuthId" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
# Should show: NO MATCHES

# 4. Verify no type errors
npx tsc --noEmit 2>&1 | head -5
# Should show: no errors

# 5. Verify dashboardData.user.handle used
grep -n "dashboardData.user.handle" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewardshistory/page.tsx
# Should show: match on userHandle assignment
```

**Expected Results:**
- File modified: `app/rewards/rewardshistory/page.tsx` ✅
- New import present: `getUserIdFromToken` ✅
- Old imports removed: `createClient`, `userRepository` ✅
- No type errors ✅
- Uses `dashboardData.user.handle` ✅

---

## Document Status

**Implementation Date:** 2025-12-23
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Helper verified to exist
- [ ] Return shape verified

**Implementation:**
- [ ] Step 1 completed
- [ ] Checkpoint passed

**Integration:**
- [ ] Imports verified
- [ ] Call sites verified

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] Auth requirements met

**Feature Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] Acceptance criteria 1-3 met
- [ ] Git diff reviewed

**Post-Deploy (Pending):**
- [ ] Criterion 4: Timing verified
- [ ] Criterion 5: Manual test passed

---

### Final Status

**Implementation Result:** [SUCCESS / FAILED]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET (1-3 verified, 4-5 pending deploy)
- Ready for: Deploy and verify

---

### Timing Log Summary

**Logs to verify after deploy:**
```
[TIMING][RewardsHistoryPage] getUserIdFromToken(): ~1ms (was auth.getUser ~500ms)
[TIMING][RewardsHistoryPage] getUserDashboard(): ~200-500ms
[TIMING][RewardsHistoryPage] getRewardHistory(): ~200ms
[TIMING][RewardsHistoryPage] TOTAL: ~430ms (was ~1132ms)
```

**Logs to remove after verification:** All `[TIMING]` logs in page.tsx

---

**Document Version:** 1.0
**Last Updated:** 2025-12-23
**Author:** Claude Code
**Status:** Ready for Implementation
