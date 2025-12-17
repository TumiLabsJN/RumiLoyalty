# Missions Page Load Enhancement - Implementation Plan

**Specification Source:** MissionsPageLoadEnhancement.md
**Enhancement ID:** ENH-003
**Type:** Enhancement
**Priority:** High
**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5

---

## Enhancement Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionsPageLoadEnhancement.md:**

**Enhancement Summary:** Remove redundant `findByAuthId()` call from `/api/missions` route and add route to middleware matcher to reduce response time by ~200-500ms.

**Business Need:** Reduce Missions page load time to improve user experience (currently ~1.2-2.1s from Brazil).

**Files to Modify:**
1. `appcode/middleware.ts` - Add `/api/missions` to matcher array
2. `appcode/app/api/missions/route.ts` - Remove findByAuthId, pass authUser.id directly

**Specified Solution (From Enhancement.md Section 6):**
1. Add `/api/missions` to middleware matcher (prerequisite for token refresh)
2. Remove `userRepository` import
3. Remove `findByAuthId()` call and associated user validation (lines 55-78)
4. Remove tenant mismatch check (RPC enforces via WHERE client_id)
5. Pass `authUser.id` directly to `getUserDashboard` and `listAvailableMissions`
6. Return 500 for null dashboardData (data corruption, not user error)

**Acceptance Criteria (From Enhancement.md Section 16 - Definition of Done):**
1. [ ] `/api/missions` added to middleware matcher (PREREQUISITE)
2. [ ] `findByAuthId()` removed from missions route
3. [ ] `userRepository` import removed from missions route
4. [ ] `authUser.id` passed directly to getUserDashboard and listAvailableMissions
5. [ ] Maintainer notes added to route comments
6. [ ] Type checker passes
7. [ ] Build completes
8. [ ] Missions page loads correctly with all data
9. [ ] Auth redirect works when not logged in
10. [ ] Response time reduced by ~200-500ms
11. [ ] Enhancement document status updated to "Implemented"

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Added API_CONTRACTS.md and SchemaFinalv2.md to source documents
- Concerns Addressed: Documented intentional 401/403→500 error contract change

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 2
- Lines removed: ~30 (net)
- Breaking changes: NO (internal optimization only)
- Schema changes: NO
- API contract changes: Error codes for edge cases (401/403→500 for data corruption)

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
**Expected:** May have uncommitted changes from previous enhancements - acceptable

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the code to optimize STILL exists (findByAuthId hasn't been removed).

**NOTE:** This gate confirms the CURRENT state has the redundant code we want to REMOVE. If these checks pass, the code needs optimization. If they fail, someone may have already optimized it.

**Verify findByAuthId exists:**
```bash
grep -n "findByAuthId" appcode/app/api/missions/route.ts
```
**Expected:** Line 56 shows `userRepository.findByAuthId`
**Actual:** [document actual output]

**Verify userRepository import exists:**
```bash
grep -n "userRepository" appcode/app/api/missions/route.ts
```
**Expected:** Line 4 shows import, line 56 shows usage
**Actual:** [document actual output]

**Verify /api/missions NOT in middleware matcher:**
```bash
grep -n "api/missions'" appcode/middleware.ts
```
**Expected:** Only shows `/api/missions/:path*` (with :path*), NOT `/api/missions` alone
**Actual:** [document actual output]

**Checklist:**
- [ ] findByAuthId exists: [YES / NO]
- [ ] userRepository import exists: [YES / NO]
- [ ] `/api/missions` NOT in matcher (only `:path*` version): [YES / NO]
- [ ] Code to optimize confirmed present

**If code doesn't exist:** STOP. Enhancement may have been implemented. Report to user.

---

### Gate 3: Files to Modify Verification

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`
```bash
ls -la appcode/middleware.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/api/missions/route.ts`
```bash
ls -la appcode/app/api/missions/route.ts
```
**Expected:** File exists

**Checklist:**
- [ ] All files to modify exist: [count]
- [ ] File paths verified

---

### Gate 4: Schema Verification

> SKIP - This enhancement does not involve database schema changes.
> Multi-tenant isolation is already enforced by existing RPCs.

---

### Gate 5: API Contract Verification

> Partial - Error codes change for edge cases only.

**From API_CONTRACTS.md Lines 2957-3004:**
- Response shape: Unchanged (MissionsPageResponse)
- Error codes: 401/403 → 500 for data corruption (intentional, documented)

**Checklist:**
- [ ] Response shape unchanged: YES
- [ ] Error code change documented: YES (Section 10 of Enhancement.md)

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

### Step 1: Add `/api/missions` to Middleware Matcher

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`
**Action Type:** MODIFY
**Purpose:** Enable middleware token refresh for missions route (PREREQUISITE for removing findByAuthId)

---

#### Pre-Action Reality Check

**Read Current State:**
```
Read appcode/middleware.ts lines 215-226
```

**Expected Current State (EXACT CODE):**
```typescript
    '/tiers',
    '/api/user/:path*',
    '/api/missions/:path*',
    '/api/rewards/:path*',
    '/api/auth/user-status',
    '/api/auth/onboarding-info',
    '/api/dashboard',
    '/api/dashboard/featured-mission',
    '/api/tiers',
  ],
};
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate (215-226)

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
    '/api/tiers',
  ],
};
```

**NEW Code (replacement):**
```typescript
    '/api/tiers',
    '/api/missions',
  ],
};
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/middleware.ts
Old String:     '/api/tiers',
  ],
};
New String:     '/api/tiers',
    '/api/missions',
  ],
};
```

---

#### Post-Action Verification

**Verify /api/missions added:**
```bash
grep -n "'/api/missions'" appcode/middleware.ts
```

**Expected:** Two lines - one for `/api/missions/:path*` and one for `/api/missions`

**State Verification:**
- [ ] Read command executed
- [ ] `/api/missions` now in matcher: [YES / NO]

---

#### Step Checkpoint

**Step Checkpoint:**
- [ ] `/api/missions` added to matcher ✅
- [ ] No syntax errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Simplify Missions Route

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/missions/route.ts`
**Action Type:** MODIFY (full file replacement)
**Purpose:** Remove findByAuthId, pass authUser.id directly, add maintainer notes

**⚠️ ASSUMPTION:** `authUser.id === users.id` (set in `auth_create_user` function, baseline.sql).
If user creation logic changes in the future, revalidate this assumption.

---

#### Pre-Action Reality Check

**Read Current State:**
```
Read appcode/app/api/missions/route.ts
```

**Expected Current State:**
- Line 4: `import { userRepository } from '@/lib/repositories/userRepository';`
- Line 56: `const user = await userRepository.findByAuthId(authUser.id);`
- Lines 57-78: User validation and tenant check
- Line 82: `user.id` passed to getUserDashboard
- Line 131: `user.id` passed to listAvailableMissions

**Reality Check:**
- [ ] Read command executed
- [ ] userRepository import on line 4: [YES / NO]
- [ ] findByAuthId on line 56: [YES / NO]
- [ ] user.id usage confirmed: [YES / NO]

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**Full file replacement with simplified route:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { listAvailableMissions } from '@/lib/services/missionService';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';

/**
 * GET /api/missions
 *
 * Returns all missions for the Missions page with pre-computed status,
 * progress tracking, and formatted display text.
 *
 * References:
 * - API_CONTRACTS.md lines 2955-3238 (GET /api/missions)
 * - ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
 * - ARCHITECTURE.md Section 10.2 (Missions Authorization, lines 1299-1309)
 *
 * Request: Requires auth-token cookie
 * Response: MissionsPageResponse with user, featuredMissionId, missions[]
 *
 * Performance target: <200ms
 *
 * MAINTAINER NOTES:
 * 1. This route MUST remain in middleware.ts matcher for token refresh to work.
 *    If removed from matcher, requests will 401 because setSession() was removed.
 * 2. If dashboardData is null, we return 500 (not 401) because:
 *    - users.id = authUser.id (created atomically in auth_create_user)
 *    - A missing users row indicates data corruption, not a user action error
 *    - Do NOT reintroduce 401/USER_NOT_FOUND here; investigate the corruption instead
 */

export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', code: 'UNAUTHORIZED', message: 'Please log in to continue.' },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Step 3: Get dashboard data - pass authUser.id directly
    // REMOVED: findByAuthId() call - users.id === authUser.id (same UUID)
    // REMOVED: Tenant mismatch check - RPC enforces via WHERE client_id = p_client_id
    const dashboardData = await dashboardRepository.getUserDashboard(
      authUser.id,
      clientId,
      { includeAllTiers: true }
    );

    if (!dashboardData) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'USER_DATA_ERROR', message: 'Failed to load user data.' },
        { status: 500 }
      );
    }

    // Step 4: Build tier lookup map
    const tierLookup = new Map<string, { name: string; color: string }>();
    if (dashboardData.allTiers) {
      for (const tier of dashboardData.allTiers) {
        tierLookup.set(tier.id, { name: tier.name, color: tier.color });
      }
    }

    // Step 5: Get missions from service
    const missionsResponse = await listAvailableMissions(
      authUser.id,
      clientId,
      {
        handle: dashboardData.user.handle ?? '',
        currentTier: dashboardData.currentTier.id,
        currentTierName: dashboardData.currentTier.name,
        currentTierColor: dashboardData.currentTier.color,
      },
      dashboardData.client.vipMetric as 'sales' | 'units',
      tierLookup
    );

    return NextResponse.json(missionsResponse, { status: 200 });

  } catch (error) {
    console.error('[Missions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
```

**Edit Command:**
```
Tool: Write (full file replacement)
File: /home/jorge/Loyalty/Rumi/appcode/app/api/missions/route.ts
Content: [full new code block above]
```

---

#### Post-Action Verification

**Verify userRepository import removed:**
```bash
grep -n "userRepository" appcode/app/api/missions/route.ts
```
**Expected:** No matches

**Verify findByAuthId removed:**
```bash
grep -n "findByAuthId" appcode/app/api/missions/route.ts
```
**Expected:** No matches

**Verify authUser.id used:**
```bash
grep -n "authUser.id" appcode/app/api/missions/route.ts
```
**Expected:** Multiple lines showing direct usage

**Verify maintainer notes present:**
```bash
grep -n "MAINTAINER NOTES" appcode/app/api/missions/route.ts
```
**Expected:** Line showing maintainer notes comment

**State Verification:**
- [ ] userRepository import removed: [YES / NO]
- [ ] findByAuthId removed: [YES / NO]
- [ ] authUser.id used directly: [YES / NO]
- [ ] Maintainer notes present: [YES / NO]

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit appcode/app/api/missions/route.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] userRepository import removed ✅
- [ ] findByAuthId removed ✅
- [ ] authUser.id used directly ✅
- [ ] Maintainer notes added ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All changes must integrate cleanly with existing code.**

---

### Import Verification

**File:** `appcode/app/api/missions/route.ts`

**Remaining Imports:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { listAvailableMissions } from '@/lib/services/missionService';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
```

**Removed Import:**
```typescript
// REMOVED: import { userRepository } from '@/lib/repositories/userRepository';
```

**Verification:**
```bash
npx tsc --noEmit appcode/app/api/missions/route.ts 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import paths correct
- [ ] No unused imports
- [ ] Types align

---

### Call Site Verification

**File:** `appcode/app/api/missions/route.ts`

**Call 1: getUserDashboard**
```typescript
const dashboardData = await dashboardRepository.getUserDashboard(
  authUser.id,  // Changed from user.id
  clientId,
  { includeAllTiers: true }
);
```

**Call 2: listAvailableMissions**
```typescript
const missionsResponse = await listAvailableMissions(
  authUser.id,  // Changed from user.id
  clientId,
  {
    handle: dashboardData.user.handle ?? '',  // Changed from user.tiktokHandle
    currentTier: dashboardData.currentTier.id,
    currentTierName: dashboardData.currentTier.name,
    currentTierColor: dashboardData.currentTier.color,
  },
  dashboardData.client.vipMetric as 'sales' | 'units',
  tierLookup
);
```

**Verification:**
- [ ] `authUser.id` is string (UUID) - matches function signatures
- [ ] `dashboardData.user.handle` is string - matches expected type
- [ ] Return types handled correctly

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**The missions route relies on downstream functions for tenant isolation.**

**⚠️ TENANT CHECK DECISION:** The explicit `user.clientId !== clientId` check is REMOVED. This is acceptable because:
1. `getUserDashboard` enforces `.eq('client_id', clientId)` at line 137
2. `get_available_missions` RPC enforces `WHERE client_id = p_client_id`
3. Defense-in-depth is maintained at the data layer (repository + RPC)
4. If either check fails, dashboardData or missionsResponse will be null/empty

**Downstream tenant isolation:**

**getUserDashboard:** (dashboardRepository.ts line 137)
```typescript
.eq('client_id', clientId)  // CRITICAL: Multitenancy enforcement
```

**listAvailableMissions → missionRepository.listAvailable:** (missionRepository.ts line 513-517)
```typescript
const { data, error } = await supabase.rpc('get_available_missions', {
  p_user_id: userId,
  p_client_id: clientId,  // Multi-tenant isolation via RPC parameter
});
```

**Security Checklist:**
- [ ] getUserDashboard has client_id filter: YES (line 137)
- [ ] get_available_missions RPC has p_client_id: YES
- [ ] No raw SQL without client_id filter: YES
- [ ] No cross-tenant data exposure possible: YES

---

### Authentication Check

**Route:** `/api/missions`

**Checklist:**
- [ ] Route in middleware matcher: YES (Step 1)
- [ ] `getUser()` validates auth before data access: YES
- [ ] Tenant isolation enforced by downstream functions: YES

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Enhancement.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: `/api/missions` added to middleware matcher
**Test:** Grep for route in matcher
**Command:**
```bash
grep -n "'/api/missions'" appcode/middleware.ts
```
**Expected:** Two lines - `:path*` version and base route
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: `findByAuthId()` removed from missions route
**Test:** Grep for findByAuthId
**Command:**
```bash
grep -n "findByAuthId" appcode/app/api/missions/route.ts
```
**Expected:** No matches
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: `userRepository` import removed
**Test:** Grep for userRepository
**Command:**
```bash
grep -n "userRepository" appcode/app/api/missions/route.ts
```
**Expected:** No matches
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: `authUser.id` passed directly
**Test:** Grep for authUser.id usage
**Command:**
```bash
grep -n "authUser.id" appcode/app/api/missions/route.ts
```
**Expected:** Multiple lines showing direct usage in getUserDashboard and listAvailableMissions
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Maintainer notes added
**Test:** Grep for maintainer notes
**Command:**
```bash
grep -n "MAINTAINER NOTES" appcode/app/api/missions/route.ts
```
**Expected:** Line with maintainer notes comment
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6-7: Type checker passes / Build completes
**Covered in Verification 1 and 2 above**

#### Criterion 8: Missions page loads correctly with all data
**Test:** Manual - start dev server and load /missions
**Command:**
```bash
npm run dev
# Then open http://localhost:3000/missions in browser
```
**Expected:** Missions page loads with mission cards, progress bars, tier info
**Actual:** [document result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 9: Auth redirect works when not logged in
**Test:** Manual - clear cookies and try to access /missions
**Expected:** Redirects to login page
**Actual:** [document result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 10: Response time reduced by ~200-500ms
**Test:** Observe terminal timing (compare before/after)
**Expected:** Response time ~900-1100ms (was ~1200-1400ms from Brazil)
**Actual:** [document result]
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `middleware.ts`: ~1 line added (api/missions route)
- `missions/route.ts`: ~-30 lines net change (simplified)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Enhancement.md | Test Result |
|-----------|---------------------|-------------|
| 1 | /api/missions in matcher | ✅ / ❌ |
| 2 | findByAuthId removed | ✅ / ❌ |
| 3 | userRepository removed | ✅ / ❌ |
| 4 | authUser.id used directly | ✅ / ❌ |
| 5 | Maintainer notes added | ✅ / ❌ |
| 6 | Type checker passes | ✅ / ❌ |
| 7 | Build completes | ✅ / ❌ |
| 8 | Missions page loads | ✅ / ❌ |
| 9 | Auth redirect works | ✅ / ❌ |
| 10 | Response time reduced | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-17
**Executor:** Claude Opus 4.5
**Specification Source:** MissionsPageLoadEnhancement.md
**Implementation Doc:** MissionsPageLoadEnhancementIMPL.md
**Enhancement ID:** ENH-003

---

### Execution Log

**Pre-Implementation:**
```
Gate 1: Environment - [PASS/FAIL]
Gate 2: Gap Confirmation - [PASS/FAIL]
Gate 3: Files - [PASS/FAIL]
Gate 4: Schema - SKIPPED
Gate 5: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
Step 1: Add /api/missions to middleware matcher - [PASS/FAIL]
Step 2: Simplify missions route (remove findByAuthId) - [PASS/FAIL]
```

**Feature Verification:**
```
Build succeeds - [PASS/FAIL]
Type check passes - [PASS/FAIL]
Criterion 1: /api/missions in matcher - [PASS/FAIL]
Criterion 2: findByAuthId removed - [PASS/FAIL]
Criterion 3: userRepository removed - [PASS/FAIL]
Criterion 4: authUser.id used - [PASS/FAIL]
Criterion 5: Maintainer notes - [PASS/FAIL]
Criterion 8: Missions page loads - [PASS/FAIL]
Criterion 9: Auth redirect works - [PASS/FAIL]
Criterion 10: Response time reduced - [PASS/FAIL]
Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `appcode/middleware.ts` - MODIFY - +1 line - Add /api/missions to matcher
2. `appcode/app/api/missions/route.ts` - MODIFY - ~-30 lines net - Remove findByAuthId, simplify

**Total:** 2 files modified, ~30 lines removed (net)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify /api/missions in middleware matcher
grep -n "'/api/missions'" appcode/middleware.ts
# Should show: two lines (one :path*, one base route)

# 2. Verify findByAuthId removed
grep -n "findByAuthId" appcode/app/api/missions/route.ts
# Should show: no matches

# 3. Verify userRepository removed
grep -n "userRepository" appcode/app/api/missions/route.ts
# Should show: no matches

# 4. Verify authUser.id used directly
grep -n "authUser.id" appcode/app/api/missions/route.ts
# Should show: multiple lines

# 5. Verify maintainer notes present
grep -n "MAINTAINER NOTES" appcode/app/api/missions/route.ts
# Should show: line with comment

# 6. Verify no type errors
npx tsc --noEmit 2>&1 | grep "error" | wc -l
# Should show: 0

# 7. Verify git diff
git diff --stat
# Should show: middleware.ts, route.ts
```

---

## Document Status

**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.1

**Changelog:**
- v1.1: Added clarifying note to Gate 2; added tenant check decision to Security section; enhanced Completion Checklist with explicit grep commands
- v1.0: Initial implementation plan

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Code to optimize confirmed present
- [ ] Middleware matcher verified

**Implementation:**
- [ ] Step 1: /api/missions added to matcher ✅
- [ ] Step 2: findByAuthId + validation removed ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] Matcher verified: `grep -n "'/api/missions'" appcode/middleware.ts` shows BOTH routes (`:path*` AND base) ✅
- [ ] findByAuthId removed: `grep -n "findByAuthId" appcode/app/api/missions/route.ts` shows NO matches ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Enhancement implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update MissionsPageLoadEnhancement.md status to "Implemented"

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message below
2. [ ] Update MissionsPageLoadEnhancement.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Test manually on /missions page

**Git Commit Message Template:**
```
perf: remove redundant findByAuthId from missions API

Implements ENH-003: Missions Page Load Enhancement
- Add /api/missions to middleware matcher for token refresh
- Remove findByAuthId() call (users.id === authUser.id)
- Remove userRepository import
- Pass authUser.id directly to downstream services

Performance improvement: ~200-500ms reduction per request
- Before: 4 network calls (~1200-1400ms from Brazil)
- After: 3 network calls (~900-1100ms from Brazil)

References:
- BugFixes/MissionsPageLoadEnhancement.md
- BugFixes/MissionsPageLoadEnhancementIMPL.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (maintainer notes included)

### Security Verification
- [ ] Multi-tenant isolation verified (RPC has client_id filter)
- [ ] Auth requirements verified (getUser validates, middleware refreshes)

### Acceptance Criteria
- [ ] EVERY criterion from Enhancement.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

---

**Document Version:** 1.0
**Last Updated:** 2025-12-17
**Author:** Claude Opus 4.5

---
