# Rewards Page Direct Service - Implementation Plan

**Specification Source:** RewardsPageDirectServiceEnhancement.md
**Enhancement ID:** ENH-006
**Type:** Enhancement (Performance Optimization)
**Priority:** High
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From RewardsPageDirectServiceEnhancement.md:**

**Gap Summary:** The `/rewards` page uses hardcoded mock data instead of real data from the database.

**Business Need:** Creators must see their actual VIP tier rewards to engage with the loyalty program.

**Files to Create/Modify:**

*Gate 0 (Type Consolidation Prerequisite):*
- `appcode/lib/types/rewards.ts` → CREATE (shared type definitions)
- `appcode/lib/services/rewardService.ts` → MODIFY (import from shared types)
- `appcode/app/types/rewards.ts` → MODIFY (re-export from shared types)
- `appcode/lib/types/api.ts` → MODIFY (remove duplicate)

*Main Implementation:*
- `appcode/app/rewards/page.tsx` → RENAME to `rewards-client.tsx`
- `appcode/app/rewards/rewards-client.tsx` → MODIFY (props interface, remove mockData)
- `appcode/app/rewards/page.tsx` → CREATE (Server Component)

**Specified Solution (From Section 6):**
> Direct Service Call: Server Component calls existing service functions directly (no fetch, no API route for initial load). This follows ENH-007 pattern.
> Key Principle: NO new SQL, NO new transforms. Reuse 100% of existing code.

**Auth/Error Parity Table (From Section 6):**
| Scenario | API Route | Server Component |
|----------|-----------|------------------|
| No authUser | 401 | `redirect('/login/start')` |
| No CLIENT_ID | 500 | Error component |
| User not found | 401 | `redirect('/login/start')` |
| clientId mismatch | 403 | Error component |
| No dashboardData | 500 | Error component |
| Success | 200 | Client with data |

**Acceptance Criteria (From Section 16):**
1. [ ] `rewards-client.tsx` created with props interface `{ initialData, error }`
2. [ ] `page.tsx` created as Server Component with direct service calls
3. [ ] Mock data completely removed (lines 319-615 deleted)
4. [ ] Type checker passes
5. [ ] Build completes
6. [ ] Manual verification completed (13 steps)
7. [ ] EXECUTION_PLAN.md updated
8. [ ] DATA_FLOWS.md updated
9. [ ] ENH-006 document status updated to "Implemented"

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- v1.1: Added type import alignment (`@/types/rewards`)
- v1.1: Added Auth/Error Parity Table
- v1.2: Added path prefix note (paths relative to `appcode/`)

**Expected Outcome:**
- Feature implemented: YES
- Files created: 2 (new page.tsx, lib/types/rewards.ts)
- Files modified: 3 (rewards-client.tsx, rewardService.ts, app/types/rewards.ts)
- Files renamed: 1 (page.tsx → rewards-client.tsx)
- Lines added: ~70 (Server Component) + ~200 (shared types)
- Lines removed: ~300 (mockData) + ~200 (duplicate types)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

**Prerequisite (Gate 0):**
- Type consolidation: 3 duplicate `RewardsPageResponse` → 1 shared definition

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 0: Type Consolidation Prerequisite (CRITICAL)

**Purpose:** Resolve duplicate `RewardsPageResponse` definitions to prevent type mismatches.

**The Problem:**
3 duplicate `RewardsPageResponse` definitions exist:

| File | Type Style | Layer |
|------|------------|-------|
| `app/types/rewards.ts` | Strict (literal unions) | Client |
| `lib/services/rewardService.ts` | Broad (`string`) | Service |
| `lib/types/api.ts` | Unknown | Shared |

**Why this matters for ENH-006:**
- Server Component imports `RewardsPageResponse` from `@/types/rewards` (strict)
- `rewardService.listAvailableRewards()` returns its own `RewardsPageResponse` (broad)
- Type mismatch → TypeScript error or needs unsafe cast

**Solution: Option C - Shared Types Directory**

**Step 0.1:** Verify duplicate definitions exist
```bash
grep -rn "interface RewardsPageResponse" /home/jorge/Loyalty/Rumi/appcode/
```
**Expected:** 3 matches in different files

**Step 0.2:** Create `lib/types/rewards.ts` as single source of truth
- Move strict type definitions from `app/types/rewards.ts`
- Include all interfaces: `RewardsPageResponse`, `Reward`, `RewardStatus`, `ValueData`, `StatusDetails`

**Step 0.3:** Update `lib/services/rewardService.ts`
- Change: `export interface RewardsPageResponse { ... }`
- To: `import type { RewardsPageResponse } from '@/lib/types/rewards'`
- Delete local interface definitions

**Step 0.4:** Update `app/types/rewards.ts`
- Change to re-export: `export * from '@/lib/types/rewards'`
- Or delete and update imports elsewhere

**Step 0.5:** Update `lib/types/api.ts` (if applicable)
- Remove duplicate `RewardsPageResponse`
- Import from `@/lib/types/rewards` if needed

**Step 0.6:** Verify consolidation - single definition
```bash
grep -rn "interface RewardsPageResponse" /home/jorge/Loyalty/Rumi/appcode/
```
**Expected:** 1 match only (in `lib/types/rewards.ts`)

**Step 0.6b:** Verify consolidation - all imports resolve (AUDIT REQUIREMENT)
```bash
grep -rn "RewardsPageResponse" /home/jorge/Loyalty/Rumi/appcode/ | grep -v node_modules | grep -v ".md"
```
**Expected:** All imports point to `@/types/rewards` or `@/lib/types/rewards`
**Check for:** No stale imports from `lib/services/rewardService` or `lib/types/api`

**Step 0.7:** Type check
```bash
npx tsc --noEmit 2>&1 | grep -i "reward" | head -20
```
**Expected:** No type errors related to rewards

**Step 0.8:** Full build verification (AUDIT REQUIREMENT)
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes successfully
**Purpose:** Verify all consumers updated before proceeding to main implementation

**Checklist:**
- [ ] Duplicate definitions identified: [count]
- [ ] `lib/types/rewards.ts` created with strict types
- [ ] `lib/services/rewardService.ts` imports from shared types
- [ ] `app/types/rewards.ts` re-exports (or imports updated)
- [ ] `lib/types/api.ts` duplicate removed
- [ ] Only 1 interface definition remains
- [ ] All imports resolve correctly (no stale imports)
- [ ] Type check passes
- [ ] Full build passes

**If Gate 0 fails:** STOP. Type consolidation must complete before ENH-006 implementation.

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
**Expected:** Clean working tree or acceptable state

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - mockData is still in use, no real fetch implemented.

**Search for existing real data fetch:**
```bash
grep -n "fetch.*api/rewards" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
grep -n "rewardService" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```

**Expected:** No matches (gap is real - still using mock data)

**Search for mockData usage:**
```bash
grep -n "mockData" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```

**Expected:** Matches found (confirms mock data still in use)

**Checklist:**
- [ ] No fetch to /api/rewards found: [YES/NO]
- [ ] No rewardService import found: [YES/NO]
- [ ] mockData still in use: [YES/NO]
- [ ] Gap confirmed to still exist: [YES/NO]

**If code already fetches real data:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to ensure proper integration.

**Search for missions pattern (reference implementation):**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/page.tsx
ls -la /home/jorge/Loyalty/Rumi/appcode/app/missions/missions-client.tsx
```

**Expected:** Both files exist (pattern reference)

**Search for service we'll use:**
```bash
grep -n "listAvailableRewards" /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts | head -5
```

**Expected:** Function exists

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `app/missions/page.tsx` | Server Component pattern | Template to follow | Reference |
| `app/missions/missions-client.tsx` | Client props pattern | Template to follow | Reference |
| `lib/services/rewardService.ts` | `listAvailableRewards()` | Service to call | Reuse |
| `app/api/rewards/route.ts` | Service call pattern | Logic to copy | Reference |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: LOW (reusing existing services)
- [ ] Integration points identified: [list]

---

### Gate 4: Files to Modify Verification

**File 1:** `appcode/app/rewards/page.tsx` (to be RENAMED)
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** File exists

**File 2:** `appcode/app/rewards/rewards-client.tsx` (to be CREATED after rename)
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** File does NOT exist

**Checklist:**
- [ ] page.tsx exists (will be renamed)
- [ ] rewards-client.tsx does NOT exist (will be created by rename)
- [ ] File paths match ENH-006 spec

---

### Gate 5: Service/Repository Verification

**Purpose:** Verify the services we'll call exist and match expected signatures.

**Read rewardService.listAvailableRewards signature:**
```bash
grep -A 15 "async listAvailableRewards" /home/jorge/Loyalty/Rumi/appcode/lib/services/rewardService.ts | head -20
```

**Expected params:**
- userId: string
- clientId: string
- currentTier: string
- currentTierOrder: number
- tierAchievedAt: string | null
- userHandle: string
- tierName: string
- tierColor: string

**Checklist:**
- [ ] Service function exists
- [ ] Parameters match what API route uses
- [ ] Return type is RewardsPageResponse

---

### Gate 6: Type Import Verification

**Purpose:** Verify type imports will work (per audit feedback v1.1).

**Check type exists:**
```bash
grep -n "interface RewardsPageResponse" /home/jorge/Loyalty/Rumi/appcode/app/types/rewards.ts
```

**Expected:** Interface exists at specific line

**Checklist:**
- [ ] RewardsPageResponse exists in @/types/rewards
- [ ] Same source as client will use

---

### Gate 7: API Route Reference Check

**Purpose:** Verify we can copy the service call pattern from API route.

**Read API route service calls:**
```bash
sed -n '88,98p' /home/jorge/Loyalty/Rumi/appcode/app/api/rewards/route.ts
```

**Expected:** Shows the exact service call with all parameters

**Checklist:**
- [ ] API route shows complete service call pattern
- [ ] All parameters visible
- [ ] Can copy this pattern to Server Component

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step 1: Rename page.tsx to rewards-client.tsx

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** RENAME
**Purpose:** Preserve git history while creating space for new Server Component

**Pre-Action Check:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** page.tsx exists, rewards-client.tsx does NOT exist

**Rename Command:**
```bash
git mv /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```

**Post-Action Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/
```
**Expected:** rewards-client.tsx exists, page.tsx does NOT exist

**Step Checkpoint:**
- [ ] Rename completed successfully
- [ ] rewards-client.tsx exists
- [ ] page.tsx no longer exists
- [ ] Git tracked the rename

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Modify rewards-client.tsx - Add Props Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`
**Action Type:** MODIFY
**Purpose:** Add props interface for server-passed data

**Pre-Action Reality Check:**
Read the file to find where to add the interface (after imports, before function).

```bash
head -40 /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```

**Edit Action:**
Add after the imports, before the export default function:

**OLD Code (find the export default function line):**
```typescript
export default function RewardsPage() {
```

**NEW Code:**
```typescript
// Props interface for server-passed data
interface RewardsClientProps {
  initialData: RewardsPageResponse | null
  error: string | null
}

// Named export for use by Server Component
export function RewardsClient({ initialData, error: initialError }: RewardsClientProps) {
```

**Post-Action Verification:**
```bash
grep -n "interface RewardsClientProps" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
grep -n "export function RewardsClient" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** Both patterns found

**Step Checkpoint:**
- [ ] Props interface added
- [ ] Function changed to named export
- [ ] Function accepts props

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Modify rewards-client.tsx - Add State Initialization from Props

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`
**Action Type:** MODIFY
**Purpose:** Initialize state from props instead of having no initial data

**Find current modal state declarations and add before them:**

**NEW Code to add after function signature:**
```typescript
  // Initialize from server-provided data (no loading state needed)
  const [rewardsData, setRewardsData] = useState<RewardsPageResponse | null>(initialData)
  const [error, setError] = useState<string | null>(initialError)
```

**Step Checkpoint:**
- [ ] State initialized from props
- [ ] rewardsData state added
- [ ] error state added

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Modify rewards-client.tsx - Add Error State UI

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`
**Action Type:** MODIFY
**Purpose:** Handle error state before rendering main content

**Add after state declarations, before the main return:**

**NEW Code:**
```typescript
  // Error state UI
  if (error || !rewardsData) {
    return (
      <PageLayout title="Rewards">
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-red-300 mx-auto mb-3" />
          <p className="text-red-600">{error || "Failed to load rewards"}</p>
          <Link href="/home">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </PageLayout>
    )
  }
```

**Step Checkpoint:**
- [ ] Error state UI added
- [ ] Returns early if error or no data

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Modify rewards-client.tsx - Remove mockData and Update References

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx`
**Action Type:** MODIFY
**Purpose:** Remove hardcoded mock data and use props instead

**Find and DELETE the entire mockData constant (approximately lines 319-615).**

**Find the line that destructures mockData:**
```typescript
const { user, redemptionCount, rewards } = mockData;
```

**Replace with:**
```typescript
  const { user, redemptionCount, rewards } = rewardsData
```

**Post-Action Verification:**
```bash
grep -n "mockData" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** No matches (mockData completely removed)

```bash
grep -n "rewardsData" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** Matches found (using props data)

**Step Checkpoint:**
- [ ] mockData constant deleted (~300 lines removed)
- [ ] References changed from mockData to rewardsData
- [ ] No "mockData" string remains in file

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Create New page.tsx Server Component

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx`
**Action Type:** CREATE
**Purpose:** Server Component that calls services directly

**Pre-Action Check:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** File does NOT exist

**New File Content:**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { userRepository } from '@/lib/repositories/userRepository'
import { dashboardRepository } from '@/lib/repositories/dashboardRepository'
import { rewardService } from '@/lib/services/rewardService'
import { RewardsClient } from './rewards-client'
import type { RewardsPageResponse } from '@/types/rewards'

/**
 * Rewards Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-006):
 * Calls services directly instead of using mock data or fetching from API.
 * This follows the same pattern as ENH-007 (Missions).
 *
 * The API route (/api/rewards) is KEPT for client-side claim operations.
 *
 * Auth/Error Parity (matches API route):
 * - No authUser → redirect to /login/start
 * - No CLIENT_ID → error component
 * - User not found → redirect to /login/start
 * - clientId mismatch → error component
 * - No dashboardData → error component
 */
export default async function RewardsPage() {
  // 1. Get authenticated user via Supabase
  const supabase = await createClient()
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect('/login/start')
  }

  // 2. Get client ID from environment (MVP: single tenant)
  const clientId = process.env.CLIENT_ID
  if (!clientId) {
    console.error('[RewardsPage] CLIENT_ID not configured')
    return <RewardsClient initialData={null} error="Server configuration error" />
  }

  // 3. Get user from our users table - REUSES existing repository
  const user = await userRepository.findByAuthId(authUser.id)
  if (!user) {
    redirect('/login/start')
  }

  // 4. Verify user belongs to this client (multitenancy)
  if (user.clientId !== clientId) {
    return <RewardsClient initialData={null} error="Access denied" />
  }

  // 5. Get dashboard data for tier info - REUSES existing repository
  const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId)
  if (!dashboardData) {
    return <RewardsClient initialData={null} error="Failed to load user data" />
  }

  // 6. Get rewards - REUSES existing service (which uses existing RPC)
  // This is the exact same call as app/api/rewards/route.ts lines 89-98
  const rewardsResponse = await rewardService.listAvailableRewards({
    userId: user.id,
    clientId,
    currentTier: dashboardData.currentTier.id,
    currentTierOrder: dashboardData.currentTier.order,
    tierAchievedAt: user.tierAchievedAt ?? null,
    userHandle: user.tiktokHandle ?? '',
    tierName: dashboardData.currentTier.name,
    tierColor: dashboardData.currentTier.color,
  })

  // 7. Return client component with real data
  return <RewardsClient initialData={rewardsResponse} error={null} />
}
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
wc -l /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** File exists, ~70 lines

**Step Checkpoint:**
- [ ] File created
- [ ] Contains Server Component (async function)
- [ ] Imports correct services
- [ ] Type import from @/types/rewards
- [ ] Auth/error handling matches parity table

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `appcode/app/rewards/page.tsx`

**Verify all imports resolve:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] createClient import resolves
- [ ] userRepository import resolves
- [ ] dashboardRepository import resolves
- [ ] rewardService import resolves
- [ ] RewardsClient import resolves
- [ ] RewardsPageResponse type import resolves

---

### Call Site Verification

**rewardService.listAvailableRewards() call:**
- [ ] Arguments match function signature
- [ ] All 8 parameters provided
- [ ] Return type is RewardsPageResponse

**RewardsClient component:**
- [ ] Props match interface { initialData, error }
- [ ] initialData type is RewardsPageResponse | null
- [ ] error type is string | null

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Server Component auth flow:**
```typescript
// Line 1: Get authenticated user
const { data: { user: authUser } } = await supabase.auth.getUser()

// Line 2: Get user from our table
const user = await userRepository.findByAuthId(authUser.id)

// Line 3: Verify tenant match
if (user.clientId !== clientId) {
  return <RewardsClient initialData={null} error="Access denied" />
}
```

**Security Checklist:**
- [ ] Auth check before any data access
- [ ] User looked up by auth ID (not untrusted input)
- [ ] clientId verification explicit
- [ ] Service calls use verified clientId

---

### Service Layer Security (Already Verified)

The services we call already have client_id filtering:
- `dashboardRepository.getUserDashboard(userId, clientId)` - clientId param
- `rewardService.listAvailableRewards({ clientId, ... })` - clientId param

**No new queries = no new multi-tenant risk.**

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Feature Verification (ALL MUST PASS)

---

### Verification 1: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -c "error" || echo "0"
```
**Expected:** 0 errors (or same count as before implementation)

**Status:**
- [ ] Type check passed

---

### Verification 2: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors

**Status:**
- [ ] Build passed

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: rewards-client.tsx created with props interface
**Test:** Check file exists with interface
```bash
grep -n "interface RewardsClientProps" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx
```
**Expected:** Interface found
**Status:** [ ] PASS / FAIL

#### Criterion 2: page.tsx created as Server Component
**Test:** Check file exists with async function
```bash
grep -n "export default async function RewardsPage" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx
```
**Expected:** Pattern found
**Status:** [ ] PASS / FAIL

#### Criterion 3: Mock data completely removed
**Test:** No mockData references
```bash
grep -c "mockData" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx || echo "0"
```
**Expected:** 0
**Status:** [ ] PASS / FAIL

#### Criterion 4: Type checker passes
**Test:** Run tsc
**Expected:** No new errors
**Status:** [ ] PASS / FAIL

#### Criterion 5: Build completes
**Test:** Run build
**Expected:** Success
**Status:** [ ] PASS / FAIL

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `app/rewards/page.tsx`: ~70 lines added (new Server Component)
- `app/rewards/rewards-client.tsx`: net negative (mockData removed, props added)

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED / FAILED]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-22
**Executor:** Claude Opus 4.5
**Specification Source:** RewardsPageDirectServiceEnhancement.md
**Implementation Doc:** RewardsPageDirectServiceEnhancementIMPL.md
**Enhancement ID:** ENH-006

---

### Execution Log

**Pre-Implementation:**
```
Gate 0: Type Consolidation - [PENDING]
  Step 0.1: Verify duplicates exist - [PENDING]
  Step 0.2: Create lib/types/rewards.ts - [PENDING]
  Step 0.3: Update rewardService.ts - [PENDING]
  Step 0.4: Update app/types/rewards.ts - [PENDING]
  Step 0.5: Update lib/types/api.ts - [PENDING]
  Step 0.6: Verify single definition - [PENDING]
  Step 0.6b: Verify all imports resolve - [PENDING]
  Step 0.7: Type check - [PENDING]
  Step 0.8: Full build verification - [PENDING]
Gate 1: Environment - [PENDING]
Gate 2: Gap Confirmation - [PENDING]
Gate 3: Partial Code Check - [PENDING]
Gate 4: Files - [PENDING]
Gate 5: Service Verification - [PENDING]
Gate 6: Type Import - [PENDING]
Gate 7: API Route Reference - [PENDING]
```

**Implementation Steps:**
```
Step 1: Rename page.tsx to rewards-client.tsx - [PENDING]
Step 2: Add props interface - [PENDING]
Step 3: Add state initialization - [PENDING]
Step 4: Add error state UI - [PENDING]
Step 5: Remove mockData - [PENDING]
Step 6: Create Server Component - [PENDING]
```

---

### Files Created/Modified

**Complete List:**

**Gate 0 (Type Consolidation):**
1. `lib/types/rewards.ts` - CREATE - ~200 lines - Shared type definitions
2. `lib/services/rewardService.ts` - MODIFY - import from shared types, delete local interfaces
3. `app/types/rewards.ts` - MODIFY - re-export from shared types
4. `lib/types/api.ts` - MODIFY - remove duplicate (if exists)

**ENH-006 Implementation:**
5. `app/rewards/page.tsx` - RENAME to rewards-client.tsx
6. `app/rewards/rewards-client.tsx` - MODIFY - props, remove mockData
7. `app/rewards/page.tsx` - CREATE - ~70 lines - Server Component

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files exist
ls -la /home/jorge/Loyalty/Rumi/appcode/app/rewards/

# 2. Verify Server Component pattern
grep "export default async function" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx

# 3. Verify client props interface
grep "interface RewardsClientProps" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx

# 4. Verify no mockData remains
grep -c "mockData" /home/jorge/Loyalty/Rumi/appcode/app/rewards/rewards-client.tsx || echo "0"

# 5. Verify type import alignment
grep "from '@/types/rewards'" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx

# 6. Verify service calls
grep "rewardService.listAvailableRewards" /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx

# 7. Type check
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/rewards/page.tsx 2>&1 | head -10
```

---

## Document Status

**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.1

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist (mockData in use)
- [ ] Partial code checked (services exist)
- [ ] Type imports verified

**Implementation:**
- [ ] All 6 steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified
- [ ] Call sites verified
- [ ] Types aligned

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] Auth requirements met

**Feature Verification:**
- [ ] Type check passes
- [ ] Build succeeds
- [ ] Acceptance criteria met
- [ ] Git diff reviewed

---

### Final Status

**Implementation Result:** [PENDING]

---

### Next Actions

**After implementation succeeds:**
1. [ ] Git commit with message
2. [ ] Update ENH-006 status to "Implemented"
3. [ ] Update EXECUTION_PLAN.md - mark Tasks 9.5.2-9.5.5 complete
4. [ ] Update DATA_FLOWS.md - change status to "Frontend: ✅ Complete"

**Git Commit Message Template:**
```
feat(rewards): implement direct service pattern (ENH-006)

Replaces mock data with real data fetching via direct service calls.
Server Component calls rewardService.listAvailableRewards() directly,
eliminating API route overhead for initial page load.

Changes:
- Rename page.tsx to rewards-client.tsx (client component)
- Add RewardsClientProps interface for server-passed data
- Remove ~300 lines of hardcoded mockData
- Create new page.tsx as Server Component

Pattern: Direct Service (same as ENH-007 Missions)
No new RPCs - reuses existing services

References:
- RewardsPageDirectServiceEnhancement.md (ENH-006)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly
- [ ] Addressed audit feedback (type alignment, parity table)

---

**META-VERIFICATION STATUS:** [PENDING - TO BE FILLED DURING EXECUTION]

---

**Document Version:** 1.1
**Created:** 2025-12-22
**Revision:** Added Gate 0 type consolidation to header file list, aligned with spec v1.3
**Status:** Ready for Execution
