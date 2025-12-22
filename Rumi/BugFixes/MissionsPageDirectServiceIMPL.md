# Missions Page Direct Service - Implementation Plan

**Specification Source:** MissionsPageDirectServiceEnhancement.md
**Enhancement ID:** ENH-007
**Type:** Enhancement (Performance Optimization)
**Priority:** High
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From MissionsPageDirectServiceEnhancement.md:**

**Gap Summary:** The `/missions` page Server Component fetches from an internal API route, causing ~550ms of redundant middleware/auth overhead.

**Business Need:** Reduce missions page load time from ~1.3-1.6s to ~700-900ms by eliminating unnecessary HTTP hop and duplicate auth calls.

**Files to Modify:** `app/missions/page.tsx` (ONE file only)

**Specified Solution:**
> From ENH-007 Section 6:
> "Direct Service Call: Server Component calls existing service functions directly instead of fetching from API route. This eliminates:
> - API route middleware runs (~350ms)
> - Redundant `getUser()` in API route (~200ms)
>
> Key Principle: NO new SQL, NO new transforms. Reuse 100% of existing code:
> - `dashboardRepository.getUserDashboard()` - existing
> - `listAvailableMissions()` - existing
> - `get_available_missions` RPC - existing"

**Acceptance Criteria (From ENH-007 Section 14 & 16):**
1. [ ] Page component updated to use direct service calls
2. [ ] Type checker passes (`npx tsc --noEmit`)
3. [ ] Build completes (`npm run build`)
4. [ ] Manual verification completed (visual parity with current production)
5. [ ] Page load time reduced to ~700-900ms (target)
6. [ ] Timing logs removed from code after verification

**From Audit Feedback:**
- Recommendation: APPROVED WITH CHANGES
- Critical Issues Addressed:
  - v1.0 rejection: Removed combined RPC approach
  - **Type import aligned**: Use `@/types/missions` (same as missions-client.tsx), NOT `@/lib/services/missionService`
- Concerns Addressed:
  - Error handling parity documented (401 → redirect, config error → error component)
  - Old fetch/env code fully removed (no dead code)
  - Code removal explicitly listed

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 1
- Lines added: ~45 (net change ~-10 due to removed fetch code)
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
**Expected:** Clean or only untracked BugFixes/*.md files

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - page still uses fetch pattern.

**Check current page.tsx uses fetch:**
```bash
grep -n "fetch.*api/missions" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** Match showing fetch call exists (gap is real)

**Check NOT already using direct service:**
```bash
grep -n "listAvailableMissions" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** No matches (direct service not yet implemented)

**Checklist:**
- [ ] Grep executed for fetch pattern: [result]
- [ ] Grep executed for direct service: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already uses direct service:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Verify related code exists and is importable.

**Verify dashboardRepository exists:**
```bash
grep -n "getUserDashboard" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts | head -3
```
**Expected:** Function definition found

**Verify listAvailableMissions exists:**
```bash
grep -n "export async function listAvailableMissions" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** Function export found

**Verify MissionsPageResponse export (client types file):**
```bash
grep -n "export interface MissionsPageResponse" /home/jorge/Loyalty/Rumi/appcode/app/types/missions.ts
```
**Expected:** Interface export found at line 9 (same file used by missions-client.tsx)

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `lib/repositories/dashboardRepository.ts` | `getUserDashboard()` | Provides user/tier data | REUSE |
| `lib/services/missionService.ts` | `listAvailableMissions()` | Main service function | REUSE |
| `app/types/missions.ts` | `MissionsPageResponse` | Response type (client types) | IMPORT |
| `lib/supabase/server-client.ts` | `createClient()` | Supabase client | REUSE |

**Checklist:**
- [ ] dashboardRepository.getUserDashboard exists: [YES/NO]
- [ ] listAvailableMissions exists and exported: [YES/NO]
- [ ] MissionsPageResponse exported from app/types/missions.ts: [YES/NO]
- [ ] createClient exists: [YES/NO]
- [ ] Duplication risk: LOW (reusing existing code)

---

### Gate 4: Files to Modify Verification

**File to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** File exists

**Read current file to confirm structure:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** ~70 lines (current implementation)

**Checklist:**
- [ ] File exists: [YES/NO]
- [ ] Current line count: [count]
- [ ] File paths match ENH-007

---

### Gate 5: Schema Verification

> **SKIPPED** - This enhancement does not add new database queries. It reuses existing `getUserDashboard()` and `listAvailableMissions()` which are already verified for schema alignment.

---

### Gate 6: API Contract Verification

> **SKIPPED** - This enhancement does not modify the API contract. The `/api/missions` route is KEPT unchanged for client-side refresh. Only the page's data fetching pattern changes.

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

### Step 1: Replace page.tsx with Direct Service Pattern

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`
**Action Type:** MODIFY (complete replacement)
**Purpose:** Replace fetch-based pattern with direct service calls

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```

**Expected Current State (key sections):**

Lines 1-4 should contain:
```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MissionsClient } from './missions-client'
import type { MissionsPageResponse } from '@/types/missions'
```

Lines ~38-48 should contain fetch pattern:
```typescript
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ...
  const response = await fetch(`${fetchUrl}/api/missions`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] File uses fetch pattern: [YES / NO]

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**Complete NEW File Content:**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { listAvailableMissions } from '@/lib/services/missionService'
import { MissionsClient } from './missions-client'
import type { MissionsPageResponse } from '@/types/missions'

/**
 * Missions Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-007):
 * Calls services directly instead of fetching from /api/missions.
 * This eliminates ~550ms of redundant middleware/auth overhead.
 *
 * The API route (/api/missions) is KEPT for client-side refresh/mutations.
 *
 * Auth Flow:
 * 1. Middleware runs setSession() for /missions page route
 * 2. Server Component calls getUser() once (not redundant - we need user ID)
 * 3. Service calls reuse existing repository methods and RPCs
 *
 * References:
 * - MissionsPageDirectServiceEnhancement.md (ENH-007)
 * - app/api/missions/route.ts (logic source)
 */
export default async function MissionsPage() {
  // 1. Get authenticated user
  // NOTE: Middleware already ran setSession(), this just retrieves the user
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login/start');
  }

  // 2. Get client ID from environment (same as API route)
  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    console.error('[MissionsPage] CLIENT_ID not configured');
    return <MissionsClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - REUSES existing repository method
  const dashboardData = await dashboardRepository.getUserDashboard(
    authUser.id,
    clientId,
    { includeAllTiers: true }
  );

  if (!dashboardData) {
    return <MissionsClient initialData={null} error="Failed to load user data" />;
  }

  // 4. Build tier lookup - same logic as API route
  const tierLookup = new Map<string, { name: string; color: string }>();
  if (dashboardData.allTiers) {
    for (const tier of dashboardData.allTiers) {
      tierLookup.set(tier.id, { name: tier.name, color: tier.color });
    }
  }

  // 5. Get missions - REUSES existing service function (which uses existing RPC)
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

  // 6. Return client component with data
  return <MissionsClient initialData={missionsResponse} error={null} />;
}
```

**Edit Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
Content: [full content above]
```

---

#### Post-Action Verification

**Verify file written:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** ~77 lines

**Verify key imports present:**
```bash
grep -n "import.*createClient" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
grep -n "import.*dashboardRepository" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
grep -n "import.*listAvailableMissions" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** All three imports found

**Verify fetch REMOVED:**
```bash
grep -n "fetch.*api/missions" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** No matches (fetch removed)

**Verify direct service calls present:**
```bash
grep -n "dashboardRepository.getUserDashboard" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
grep -n "listAvailableMissions" /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** Both function calls found

**State Verification:**
- [ ] File written successfully
- [ ] Line count approximately correct: [actual]
- [ ] All imports present
- [ ] fetch removed
- [ ] Direct service calls present

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx 2>&1 | head -20
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

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx`

**New Imports:**
```typescript
import { createClient } from '@/lib/supabase/server-client';
import { dashboardRepository } from '@/lib/repositories/dashboardRepository';
import { listAvailableMissions } from '@/lib/services/missionService';
import type { MissionsPageResponse } from '@/types/missions';  // Same as missions-client.tsx
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx 2>&1 | grep -i "import\|cannot find"
```
**Expected:** No import errors

**Checklist:**
- [ ] createClient import resolves
- [ ] dashboardRepository import resolves
- [ ] listAvailableMissions import resolves
- [ ] MissionsPageResponse type import resolves

---

### Call Site Verification

**Call 1:** `createClient()`
```typescript
const supabase = await createClient();
```
- [ ] Returns Supabase client (async)
- [ ] No arguments needed

**Call 2:** `supabase.auth.getUser()`
```typescript
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
```
- [ ] Returns `{ data: { user }, error }` shape
- [ ] Destructuring correct

**Call 3:** `dashboardRepository.getUserDashboard()`
```typescript
const dashboardData = await dashboardRepository.getUserDashboard(
  authUser.id,
  clientId,
  { includeAllTiers: true }
);
```
- [ ] Arguments: `(userId: string, clientId: string, options?: { includeAllTiers?: boolean })`
- [ ] Returns `UserDashboardData | null`

**Call 4:** `listAvailableMissions()`
```typescript
const missionsResponse = await listAvailableMissions(
  authUser.id,
  clientId,
  { handle, currentTier, currentTierName, currentTierColor },
  vipMetric,
  tierLookup
);
```
- [ ] Arguments: `(userId, clientId, userInfo, vipMetric, tierLookup)`
- [ ] Returns `MissionsPageResponse`

---

### Type Alignment Verification

**Types Used:**
- `MissionsPageResponse` - imported from `@/types/missions` (same as missions-client.tsx)

**NOTE:** `listAvailableMissions()` in missionService.ts returns its own `MissionsPageResponse` type (line 118). TypeScript uses structural typing - the types are compatible if their shapes match. The type check (`npx tsc --noEmit`) will verify this.

**Verification:**
- [ ] MissionsClient accepts `{ initialData: MissionsPageResponse | null, error: string | null }`
- [ ] Return type from `listAvailableMissions()` is structurally compatible with `@/types/missions.MissionsPageResponse`
- [ ] Both page.tsx and missions-client.tsx import from same type source
- [ ] TypeScript compiles without errors (confirms structural compatibility)

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This implementation REUSES existing verified code. No new queries added.**

**Existing Security (already verified in ENH-007 Section 9):**

| Function | client_id Filter | Verified In |
|----------|------------------|-------------|
| `dashboardRepository.getUserDashboard()` | `.eq('client_id', clientId)` | dashboardRepository.ts:137 |
| `listAvailableMissions()` → `missionRepository.listAvailable()` | RPC with `p_client_id` | missionRepository.ts |

**Security Checklist:**
- [ ] No NEW database queries added (reuses existing)
- [ ] Existing queries have client_id filters (pre-verified)
- [ ] No cross-tenant data exposure possible

---

### Authentication Check

**Route:** `/missions` (page route)

**Auth Pattern:**
```typescript
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

if (authError || !authUser) {
  redirect('/login/start');
}
```

**Checklist:**
- [ ] Auth check before data access: YES
- [ ] Redirect on auth failure: YES
- [ ] User ID passed to service calls: YES

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to ENH-007 acceptance criteria.**

---

### Verification 1: Type Check Passes

**Traces to:** Acceptance Criterion #2

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -c "error"
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed

---

### Verification 2: Build Succeeds

**Traces to:** Acceptance Criterion #3

**Command:**
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

---

### Verification 3: Visual Parity (Manual Test)

**Traces to:** Acceptance Criterion #4

**Test Steps:**
1. Start dev server: `npm run dev`
2. Navigate to `/missions`
3. Verify all missions display correctly
4. Verify locked missions show correctly
5. Verify mission progress displays correctly
6. Compare with current production (should be identical)

**Expected:** Visual output identical to before
**Actual:** [document observations]

**Status:**
- [ ] Visual parity confirmed

---

### Verification 4: Performance Improvement

**Traces to:** Acceptance Criterion #5

**Test:**
1. Check Vercel logs for page load timing
2. Compare with baseline (~1.3-1.6s)
3. Target: ~700-900ms

**Expected:** ~40-50% reduction in page load time
**Actual:** [document timing]

**Status:**
- [ ] Performance improved

---

### Verification 5: Acceptance Criteria Summary

**From ENH-007 Section 16:**

| # | Criterion | Test | Status |
|---|-----------|------|--------|
| 1 | Page component updated to use direct service calls | grep for `listAvailableMissions` in page.tsx | [ ] |
| 2 | Type checker passes | `npx tsc --noEmit` | [ ] |
| 3 | Build completes | `npm run build` | [ ] |
| 4 | Manual verification completed (visual parity) | Navigate and inspect | [ ] |
| 5 | Page load time reduced | Vercel timing logs | [ ] |
| 6 | Timing logs removed | grep for `[TIMING]` | [ ] (post-verification) |

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `app/missions/page.tsx`: ~70 lines changed - complete rewrite

**Command:**
```bash
git diff app/missions/page.tsx | head -100
```

**Expected:**
- Removed: `fetch`, `cookies()`, `cookieHeader`, `baseUrl`, `fetchUrl`
- Added: `createClient`, `dashboardRepository`, `listAvailableMissions`

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED / FAILED]

---

## Post-Implementation: Remove Timing Logs

**After verification complete, remove timing logs from 3 files:**

### Step 2: Remove Timing Logs from middleware.ts

**File:** `/home/jorge/Loyalty/Rumi/appcode/middleware.ts`

**Lines to remove (timing-related console.log):**
- Line 23: `console.log(\`[TIMING][Middleware] START for ${pathname}\`);`
- Line 94: `console.log(\`[TIMING][Middleware] setSession() for ${pathname}: ${Date.now() - t_setSession}ms\`);`
- Line 140: `console.log(\`[TIMING][Middleware] TOTAL for ${pathname}: ${Date.now() - MW_START}ms\`);`
- Line 21: `const MW_START = Date.now();`
- Line 89: `const t_setSession = Date.now();`

**Action:** Edit to remove these lines (documented separately if needed)

---

### Step 3: Remove Timing Logs from API route

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/missions/route.ts`

**Lines to remove:** All `[TIMING]` console.log statements and timing variables

---

### Step 4: Verify Timing Logs Removed

**Command:**
```bash
grep -r "\[TIMING\]" /home/jorge/Loyalty/Rumi/appcode/middleware.ts /home/jorge/Loyalty/Rumi/appcode/app/api/missions/route.ts /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
```
**Expected:** No matches

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-22
**Executor:** Claude Opus 4.5
**Specification Source:** MissionsPageDirectServiceEnhancement.md
**Implementation Doc:** MissionsPageDirectServiceIMPL.md
**Enhancement ID:** ENH-007

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - SKIPPED (no new queries)
[Timestamp] Gate 6: API Contract - SKIPPED (no API changes)
```

**Implementation Steps:**
```
[Timestamp] Step 1: Replace page.tsx - Modified - Verified
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - PASS (reuses existing verified code)
[Timestamp] Auth check - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Type check passes
[Timestamp] Build succeeds
[Timestamp] Criterion 1: Direct service calls
[Timestamp] Criterion 2: Type check
[Timestamp] Criterion 3: Build
[Timestamp] Criterion 4: Visual parity
[Timestamp] Criterion 5: Performance
[Timestamp] Criterion 6: Timing logs removed
[Timestamp] Git diff sanity
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `app/missions/page.tsx` - MODIFY - ~77 lines - Replace fetch with direct service calls

**Total:** 1 file, ~10 lines removed (net)

---

### Feature Completion

**Before Implementation:**
- Pattern: Server Component → fetch('/api/missions') → API route → services
- Overhead: ~550ms redundant middleware/auth calls

**After Implementation:**
- Pattern: Server Component → services directly
- Savings: ~550ms eliminated

---

### Decision Trail

**Step 1: Analysis Phase**
- Timing diagnostics identified 4× middleware setSession calls
- Created ENH-007 MissionsPageDirectServiceEnhancement.md

**Step 2: Audit Phase**
- v1.0 REJECTED (combined RPC had duplication risk)
- v2.0 APPROVED (reuses existing code)

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created this document

**Step 4: Current Status**
- Implementation: PENDING EXECUTION
- Ready for: User approval to execute

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify file modified
git diff --stat app/missions/page.tsx
# Should show: ~70 lines changed

# 2. Verify no type errors
npx tsc --noEmit app/missions/page.tsx 2>&1
# Should show: no errors

# 3. Verify fetch removed
grep "fetch.*api/missions" app/missions/page.tsx
# Should show: no matches

# 4. Verify direct service calls present
grep -n "listAvailableMissions\|dashboardRepository" app/missions/page.tsx
# Should show: both functions called

# 5. Verify auth check present
grep -n "redirect.*login" app/missions/page.tsx
# Should show: redirect on auth failure
```

---

## Document Status

**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates defined
- [ ] Gap confirmed to exist (fetch pattern present)
- [ ] Related code verified (services exist and exported)

**Implementation:**
- [ ] Step 1 defined with complete code
- [ ] Post-action verification defined

**Integration:**
- [ ] Import verification defined
- [ ] Call site verification defined
- [ ] Type alignment defined

**Security:**
- [ ] Multi-tenant isolation verified (reuses existing)
- [ ] Auth requirements documented

**Feature Verification:**
- [ ] All 6 acceptance criteria have tests defined
- [ ] Git diff check defined

---

### Final Status

**Implementation Result:** PENDING EXECUTION

**Next Steps:**
1. User approves this implementation plan
2. Execute Step 1 (modify page.tsx)
3. Run all verifications
4. Remove timing logs (Steps 2-4)
5. Git commit

---

### Git Commit Message Template

```
perf: Direct service calls for /missions page (ENH-007)

Eliminates ~550ms of redundant middleware/auth overhead by calling
services directly from Server Component instead of fetching from
internal API route.

Changes:
- app/missions/page.tsx: Replace fetch with direct dashboardRepository
  and listAvailableMissions calls

Pattern: Server Component → Services (was: SC → fetch → API → Services)

The /api/missions route is KEPT for client-side refresh/mutations.

References:
- MissionsPageDirectServiceEnhancement.md
- MissionsPageDirectServiceIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Will run EVERY bash command (not imagine output)
- [ ] Will read EVERY file mentioned (not from memory)
- [ ] Will verify EXACT expected output (not guess)
- [ ] Used EXACT line numbers from actual file reads
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified discovery phase confirmed function signatures

### Specification Fidelity
- [ ] Following locked specification from ENH-007 v2.0
- [ ] Not re-designing (just implementing)
- [ ] Addressed import path correction (MissionsPageResponse from missionService)

### Security Verification
- [ ] Reusing existing verified multi-tenant code
- [ ] Auth check present in new code
- [ ] No new database queries added

---

**META-VERIFICATION STATUS:** Document ready for execution approval

**RED FLAGS exhibited:** None

---

**Document Version:** 1.0
**Status:** Ready for User Approval to Execute
