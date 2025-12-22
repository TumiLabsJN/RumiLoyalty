# Mission History API Optimization - Implementation Plan

**Specification Source:** MissionHistoryAPIOptimizationEnhancement.md
**Gap ID:** ENH-006
**Type:** Enhancement (Pattern B - Remove Redundant Database Call)
**Priority:** Medium
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionHistoryAPIOptimizationEnhancement.md:**

**Gap Summary:** Remove redundant `userRepository.findByAuthId()` call from `/api/missions/history` route

**Business Need:** Reduce page load latency by ~200-400ms

**Files to Modify:**
- `app/api/missions/history/route.ts` - MODIFY

**Specified Solution:**
1. Remove `findByAuthId()` block (lines 52-75)
2. Change `user.id` → `authUser.id` (2 occurrences)
3. Return 401 when `dashboardData` is null (preserves error semantics)
4. Add comment noting 403 TENANT_MISMATCH consolidated into 401

**Acceptance Criteria (From ENH-006 Section 16):**
1. [ ] `findByAuthId()` call removed from route
2. [ ] `user.id` replaced with `authUser.id` (2 occurrences)
3. [ ] 401 returned when dashboardData is null (not 500)
4. [ ] Explanatory comment added (trade-off documented)
5. [ ] Type checker passes
6. [ ] Build completes
7. [ ] Page load time reduced (~1.0-1.2s target)

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issue Addressed: Return 401 (not 500) when dashboardData is null
- Trade-off Documented: 403 TENANT_MISMATCH consolidated into 401

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 1
- Lines removed: ~25
- Lines added: ~5
- Breaking changes: NO (401 preserved, 403 consolidated)
- Schema changes: NO
- API contract changes: NO (response unchanged)

---

**RED FLAG:** If you find yourself re-designing the solution, STOP. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

### Gate 1: Environment Verification

**Commands:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Checklist:**
- [ ] Directory confirmed
- [ ] Ready to proceed

---

### Gate 2: Current Code Verification

**Verify redundant call exists:**
```bash
grep -n "findByAuthId" app/api/missions/history/route.ts
```
**Expected:** Match at line 53

**Verify user.id usage:**
```bash
grep -n "user.id" app/api/missions/history/route.ts
```
**Expected:** Matches at lines 78, 91

**Checklist:**
- [ ] findByAuthId call confirmed at line 53
- [ ] user.id usage confirmed at lines 78, 91
- [ ] Code matches "Current State" in ENH-006

---

### Gate 3: Reference Implementation Check

**Verify missions route already fixed:**
```bash
grep -n "REMOVED: findByAuthId" app/api/missions/route.ts
```
**Expected:** Match showing the pattern we're following

**Checklist:**
- [ ] Reference implementation confirmed
- [ ] Pattern to follow is clear

---

### Gate 4: File Exists

**File:** `app/api/missions/history/route.ts`
```bash
ls -la app/api/missions/history/route.ts
wc -l app/api/missions/history/route.ts
```
**Expected:** File exists, ~117 lines

**Checklist:**
- [ ] File exists
- [ ] Line count approximately correct

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation

---

## Implementation Steps

### Step 1: Remove findByAuthId block and update dashboardData check

**Target File:** `app/api/missions/history/route.ts`
**Action Type:** MODIFY
**Purpose:** Remove redundant DB call, preserve 401 error semantics

**OLD Code (lines 52-88 to be replaced):**
```typescript
    // Step 3: Get user from our users table
    const user = await userRepository.findByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          code: 'USER_NOT_FOUND',
          message: 'User profile not found. Please sign up.',
        },
        { status: 401 }
      );
    }

    // Verify user belongs to this client (multitenancy)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          code: 'TENANT_MISMATCH',
          message: 'Access denied.',
        },
        { status: 403 }
      );
    }

    // Step 4: Get tier info for response
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          code: 'USER_DATA_ERROR',
          message: 'Failed to load user data.',
        },
        { status: 500 }
      );
    }
```

**NEW Code (replacement):**
```typescript
    // Step 3: Get dashboard data - pass authUser.id directly
    // NOTE: users.id === authUser.id (created atomically in auth_create_user RPC)
    // Multi-tenant isolation enforced by dashboardRepository via client_id parameter
    // TRADE-OFF: 403 TENANT_MISMATCH consolidated into 401 (acceptable for single-tenant MVP)
    const dashboardData = await dashboardRepository.getUserDashboard(authUser.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          code: 'USER_NOT_FOUND',
          message: 'User profile not found. Please sign up.',
        },
        { status: 401 }
      );
    }
```

**Step Checkpoint:**
- [ ] Edit applied successfully
- [ ] No syntax errors

---

### Step 2: Update getMissionHistory call

**Target File:** `app/api/missions/history/route.ts`
**Action Type:** MODIFY
**Purpose:** Change user.id to authUser.id in service call

**OLD Code:**
```typescript
    // Step 5: Get mission history from service
    const historyResponse = await getMissionHistory(
      user.id,
      clientId,
```

**NEW Code:**
```typescript
    // Step 4: Get mission history from service
    const historyResponse = await getMissionHistory(
      authUser.id,
      clientId,
```

**Step Checkpoint:**
- [ ] Edit applied successfully
- [ ] user.id changed to authUser.id

---

### Step 3: Remove unused import

**Target File:** `app/api/missions/history/route.ts`
**Action Type:** MODIFY
**Purpose:** Remove userRepository import (no longer used)

**OLD Code:**
```typescript
import { userRepository } from '@/lib/repositories/userRepository';
```

**NEW Code:**
```typescript
// userRepository import removed - no longer needed after ENH-006 optimization
```

**Step Checkpoint:**
- [ ] Import removed
- [ ] No unused import warnings

---

## Feature Verification

### Verification 1: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No errors
**Status:** [ ] PASS

---

### Verification 2: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Status:** [ ] PASS

---

### Verification 3: findByAuthId Removed

**Command:**
```bash
grep -c "findByAuthId" app/api/missions/history/route.ts
```
**Expected:** 0
**Status:** [ ] PASS

---

### Verification 4: user.id Removed

**Command:**
```bash
grep -c "user\.id" app/api/missions/history/route.ts
```
**Expected:** 0
**Status:** [ ] PASS

---

### Verification 5: authUser.id Used

**Command:**
```bash
grep -c "authUser.id" app/api/missions/history/route.ts
```
**Expected:** 2 or more (dashboardRepository + getMissionHistory calls)
**Status:** [ ] PASS

---

### Verification 6: 401 Response Preserved

**Command:**
```bash
grep -A5 "!dashboardData" app/api/missions/history/route.ts | grep "status: 401"
```
**Expected:** Match found (401 status)
**Status:** [ ] PASS

---

### Verification 7: Trade-off Comment Present

**Command:**
```bash
grep "TRADE-OFF" app/api/missions/history/route.ts
```
**Expected:** Match found
**Status:** [ ] PASS

---

### Verification 8: Performance Test (Manual)

**Action:**
1. Start dev server: `npm run dev`
2. Login and navigate to `/missions/missionhistory`
3. Open Network tab, refresh page 3 times
4. Record document load times

**Expected:** ~1.0-1.2s (down from ~1.4-1.5s)
**Status:** [ ] PASS

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED

---

## Acceptance Criteria Summary

| # | Criterion | Test | Status |
|---|-----------|------|--------|
| 1 | findByAuthId() removed | grep -c = 0 | [ ] |
| 2 | user.id → authUser.id | grep user.id = 0 | [ ] |
| 3 | 401 when dashboardData null | grep status: 401 | [ ] |
| 4 | Comment added | grep TRADE-OFF | [ ] |
| 5 | Type check passes | npx tsc --noEmit | [ ] |
| 6 | Build completes | npm run build | [ ] |
| 7 | Load time reduced | Manual test ~1.0-1.2s | [ ] |

---

## Document Status

**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code verified
- [ ] Reference implementation checked

**Implementation:**
- [ ] Step 1: Remove findByAuthId block, update dashboardData check
- [ ] Step 2: Change user.id to authUser.id in getMissionHistory
- [ ] Step 3: Remove unused userRepository import

**Verification:**
- [ ] Type check passes
- [ ] Build succeeds
- [ ] All grep verifications pass
- [ ] Manual performance test shows improvement

---

### Next Actions

**After implementation succeeds:**
1. [ ] Run type check
2. [ ] Run build
3. [ ] Manual test (measure load time)
4. [ ] Update ENH-006 status to "Implemented"
5. [ ] Continue with Task 9.4.6 manual testing

---

**Document Version:** 1.0
**Status:** Ready for Execution
