# Home Page Direct Service - Implementation Plan

**Specification Source:** HomePageDirectServiceEnhancement.md
**Enhancement ID:** ENH-008
**Type:** Enhancement (Performance Optimization)
**Priority:** High
**Implementation Date:** 2025-12-22
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From HomePageDirectServiceEnhancement.md:**

**Gap Summary:** The `/home` page Server Component fetches from an internal API route (`/api/dashboard`), causing ~500-600ms of redundant middleware/auth overhead.

**Business Need:** Reduce home page load time by 40-50% (from ~1178ms to ~500-600ms) to improve first-time user experience.

**Files to Create/Modify:**
1. `lib/types/dashboard.ts` - CREATE (single source of truth)
2. `lib/services/dashboardService.ts` - MODIFY (import from shared, add runtime validation)
3. `app/types/dashboard.ts` - MODIFY (re-export from shared)
4. `lib/types/api.ts` - MODIFY (re-export ALL 10 dashboard types)
5. `app/home/page.tsx` - MODIFY (replace fetch with direct service call)

**Specified Solution:**
> From ENH-008 Section 6:
> "Apply the Direct Service Pattern (proven in ENH-007): The Server Component will call `getDashboardOverview()` directly instead of fetching from `/api/dashboard`. This requires:
> 1. Type consolidation (single source of truth for dashboard types)
> 2. Runtime validation at service boundary
> 3. Direct service call in page component"

**Acceptance Criteria (From ENH-008 Section 16):**
1. [ ] `lib/types/dashboard.ts` created as single source of truth
2. [ ] `lib/services/dashboardService.ts` imports from shared types with runtime validation
3. [ ] `app/types/dashboard.ts` re-exports from shared source
4. [ ] `lib/types/api.ts` re-exports ALL 10 dashboard types from shared source
5. [ ] `app/home/page.tsx` uses direct service pattern (no fetch)
6. [ ] Type checker passes (`npx tsc --noEmit`)
7. [ ] Build completes (`npm run build`)
8. [ ] Manual verification shows dashboard renders correctly
9. [ ] Timing logs removed from code

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES (3 rounds)
- Critical Issues Addressed:
  - Round 1: Added `lib/types/api.ts` re-export step
  - Round 2: Expanded to ALL 10 dashboard types (not just DashboardResponse)
  - Round 3: Confirmed `progressId` included in spec, TypeScript available in build
- Concerns Addressed:
  - Automated verification (npm run build includes tsc)
  - Full type alignment with service output

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1
- Files modified: 4
- Lines added: ~150 (type file) + ~10 (service validation) + edits
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
grep -n "fetch.*api/dashboard" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** Match showing fetch call exists (gap is real)

**Check NOT already using direct service:**
```bash
grep -n "getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
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

**Verify getDashboardOverview exists:**
```bash
grep -n "export async function getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** Function export found

**Verify createClient exists:**
```bash
grep -n "export async function createClient" /home/jorge/Loyalty/Rumi/appcode/lib/supabase/server-client.ts
```
**Expected:** Function export found

**Verify runtime guards exist:**
```bash
grep -n "export const isMissionType\|export const isRewardType" /home/jorge/Loyalty/Rumi/appcode/lib/types/enums.ts
```
**Expected:** Both guards found

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `lib/services/dashboardService.ts` | `getDashboardOverview()` | Main service function | REUSE + MODIFY |
| `lib/supabase/server-client.ts` | `createClient()` | Supabase client | REUSE |
| `lib/types/enums.ts` | `isMissionType()`, `isRewardType()` | Runtime guards | REUSE |
| `app/home/home-client.tsx` | `HomeClient` | Client component | NO CHANGE |

**Checklist:**
- [ ] getDashboardOverview exists and exported: [YES/NO]
- [ ] createClient exists and exported: [YES/NO]
- [ ] Runtime guards exist: [YES/NO]
- [ ] Duplication risk: LOW (reusing existing code)

---

### Gate 4: Files to Modify Verification

**Files to be modified:**

**File 1 (CREATE):** `/home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts 2>&1
```
**Expected:** File does not exist (we will CREATE it)

**File 2 (MODIFY):** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** File exists

**File 3 (MODIFY):** `/home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts
```
**Expected:** File exists

**File 4 (MODIFY):** `/home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
```
**Expected:** File exists

**File 5 (MODIFY):** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** File exists

**Checklist:**
- [ ] lib/types/dashboard.ts does NOT exist (to create): [YES/NO]
- [ ] All 4 files to modify exist: [YES/NO]
- [ ] File paths match ENH-008

---

### Gate 5: Schema Verification

> **SKIPPED** - This enhancement does not add new database queries. It reuses existing `getDashboardOverview()` which is already verified for schema alignment.

---

### Gate 6: API Contract Verification

> **SKIPPED** - This enhancement does not modify the API contract. The `/api/dashboard` route is KEPT unchanged for client-side refresh.

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

### Step 1: Create lib/types/dashboard.ts (Type Consolidation)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts`
**Action Type:** CREATE
**Purpose:** Single source of truth for all dashboard-related types

---

#### New File Content:

```typescript
/**
 * Dashboard Types - Single Source of Truth
 *
 * Type definitions for Dashboard/Home Page API (GET /api/dashboard)
 * Used by: service layer, client components, API routes
 *
 * Source: API_CONTRACTS.md (lines 2063-2948)
 *
 * IMPORTANT: This is the canonical location for dashboard types.
 * Other files should re-export from here, not define duplicates.
 *
 * Types consolidated from:
 * - app/types/dashboard.ts (client types)
 * - lib/services/dashboardService.ts (service types)
 * - lib/types/api.ts (API types - 10 dashboard types)
 */

import type { MissionType, RewardType, VipMetric } from './enums';

// Re-export enum types for convenience
export type { MissionType, RewardType, VipMetric } from './enums';

// ============================================================================
// FEATURED MISSION TYPES
// ============================================================================

export type FeaturedMissionStatus =
  | 'active'
  | 'completed'
  | 'claimed'
  | 'fulfilled'
  | 'no_missions'
  | 'raffle_available';

export interface FeaturedMission {
  id: string;
  type: MissionType;
  displayName: string;
  currentProgress: number;
  targetValue: number;
  progressPercentage: number;
  currentFormatted: string | null;
  targetFormatted: string | null;
  targetText: string;
  progressText: string;
  isRaffle: boolean;
  raffleEndDate: string | null;
  rewardType: RewardType;
  rewardAmount: number | null;
  rewardCustomText: string | null;
  rewardDisplayText: string;
}

// ============================================================================
// TIER & CLIENT TYPES
// ============================================================================

export interface ClientInfo {
  id: string;
  vipMetric: VipMetric;
  vipMetricLabel: string;
}

export interface CurrentTierInfo {
  id: string;
  name: string;
  color: string;
  order: number;
  checkpointExempt: boolean;
}

export interface NextTierInfo {
  id: string;
  name: string;
  color: string;
  minSalesThreshold: number;
}

export interface TierProgress {
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  currentFormatted: string;
  targetFormatted: string;
  checkpointExpiresAt: string | null;
  checkpointExpiresFormatted: string;
  checkpointMonths: number;
}

export interface TierInfo {
  id?: string;
  name: string;
  color: string;
  order?: number;
  checkpointExempt?: boolean;
}

// ============================================================================
// REWARD TYPES
// ============================================================================

export interface RewardValueData {
  percent?: number;
  durationDays?: number;
  amount?: number;
  displayText?: string;
  requiresSize?: boolean;
  sizeCategory?: string;
  sizeOptions?: string[];
  couponCode?: string;
  maxUses?: number;
}

export interface CurrentTierReward {
  id: string;
  type: RewardType;
  name: string;
  displayText: string;
  description: string;
  valueData: RewardValueData | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

export interface FormattedReward {
  id: string;
  type: RewardType;
  name: string | null;
  displayText: string;
  description: string | null;
  valueData: {
    amount?: number;
    percent?: number;
    durationDays?: number;
  } | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

export interface Reward {
  id: string;
  type: RewardType;
  name: string;
  displayText: string;
  description: string;
  valueData: {
    amount?: number;
    percent?: number;
    durationDays?: number;
  } | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

// ============================================================================
// FEATURED MISSION RESPONSE
// ============================================================================

export interface FeaturedMissionResponse {
  status: FeaturedMissionStatus;
  mission: {
    id: string;
    progressId: string | null;
    type: MissionType;
    displayName: string;
    currentProgress: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string | null;
    targetFormatted: string | null;
    targetText: string;
    progressText: string;
    isRaffle: boolean;
    raffleEndDate: string | null;
    rewardType: RewardType;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    rewardDisplayText: string;
    rewardValueData: Record<string, unknown> | null;
    unitText: string;
  } | null;
  tier: TierInfo;
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}

// GET /api/dashboard/featured-mission response type
export type GetFeaturedMissionResponse = FeaturedMissionResponse;

// ============================================================================
// DASHBOARD RESPONSE (Root API Response)
// ============================================================================

export interface DashboardResponse {
  user: {
    id: string;
    handle: string;
    email: string | null;
    clientName: string;
  };
  client: ClientInfo;
  currentTier: CurrentTierInfo;
  nextTier: NextTierInfo | null;
  tierProgress: TierProgress;
  featuredMission: FeaturedMissionResponse;
  currentTierRewards: FormattedReward[];
  totalRewardsCount: number;
}
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
Content: [full content above]
```

---

#### Post-Create Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
```
**Expected:** File exists, ~200 lines

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File created successfully
- [ ] Line count approximately correct: [actual]
- [ ] Type check passed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Update lib/services/dashboardService.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Import from shared types, remove local interfaces, add runtime validation

---

#### Pre-Action Reality Check

**Read Current Imports (lines 1-20):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 1-20
```

**Expected to find local interface definitions starting around line 48.**

**Read Current Interface Definitions (lines 45-140):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts lines 45-140
```

**Expected:** Local DashboardResponse, FeaturedMissionResponse, FormattedReward interfaces defined here.

---

#### Edit Action 1: Add import from shared types and runtime guards

**OLD Code (around line 17, after existing imports):**
```typescript
import type { DashboardRPCResponse } from '@/lib/types/dashboard-rpc';
```

**NEW Code:**
```typescript
import type { DashboardRPCResponse } from '@/lib/types/dashboard-rpc';
import type { DashboardResponse, FeaturedMissionResponse, FormattedReward } from '@/lib/types/dashboard';
import { isMissionType, isRewardType } from '@/lib/types/enums';

// Re-export for backwards compatibility
export type { DashboardResponse, FeaturedMissionResponse, FormattedReward } from '@/lib/types/dashboard';
```

---

#### Edit Action 2: Remove local interface definitions

**Remove lines 44-135** (the local DashboardResponse, FeaturedMissionResponse, FormattedReward interface definitions)

The comment `// ============================================` and `// Response Types (matching API_CONTRACTS.md)` section should be removed entirely.

---

#### Edit Action 3: Add runtime validation in transform section

**Find the featured mission transform section (around line 278 in current file, will shift after deletions).**

**After the line that assigns `fm.missionType`, add validation:**
```typescript
// Validate mission type at service boundary
if (fm.missionType && !isMissionType(fm.missionType)) {
  console.error(`[DashboardService] Invalid missionType: ${fm.missionType}`);
  throw new Error(`Invalid mission type: ${fm.missionType}`);
}

// Validate reward type at service boundary
if (fm.rewardType && !isRewardType(fm.rewardType)) {
  console.error(`[DashboardService] Invalid rewardType: ${fm.rewardType}`);
  throw new Error(`Invalid reward type: ${fm.rewardType}`);
}
```

---

#### Post-Action Verification

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts 2>&1 | head -20
```
**Expected:** No type errors

**Verify imports present:**
```bash
grep -n "from '@/lib/types/dashboard'" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** Import line found

**Verify runtime validation present:**
```bash
grep -n "isMissionType\|isRewardType" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** Both guards found

**Step Checkpoint:**
- [ ] Imports updated
- [ ] Local interfaces removed
- [ ] Runtime validation added
- [ ] Type check passed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Update app/types/dashboard.ts to Re-export

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts`
**Action Type:** MODIFY (complete replacement)
**Purpose:** Re-export all types from shared source

---

#### Pre-Action Reality Check

**Read Current File:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts
```
**Expected:** ~169 lines (current implementation with local definitions)

---

#### Edit Action: Replace entire file

**NEW File Content:**
```typescript
/**
 * Dashboard Types - Re-export from shared source
 *
 * This file re-exports from lib/types/dashboard.ts for backwards compatibility.
 * All types are defined in the canonical location: lib/types/dashboard.ts
 */
export * from '@/lib/types/dashboard';
```

---

#### Post-Action Verification

**Verify file updated:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts
cat /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts
```
**Expected:** ~7 lines, contains re-export

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File replaced with re-export
- [ ] Type check passed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Update lib/types/api.ts to Re-export Dashboard Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts`
**Action Type:** MODIFY
**Purpose:** Remove local dashboard type definitions, re-export from shared source

---

#### Pre-Action Reality Check

**Read Current Dashboard Types Section (lines 165-290):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts lines 165-290
```

**Expected:** Local definitions for FeaturedMissionStatus, FeaturedMission, FeaturedMissionResponse, GetFeaturedMissionResponse, ClientInfo, CurrentTierInfo, NextTierInfo, TierProgress, CurrentTierReward, DashboardResponse

---

#### Edit Action: Replace Section 3 with re-exports

**OLD Code (lines 165-288):** The entire "SECTION 3: Dashboard / Home Endpoints" with local interface definitions.

**NEW Code:**
```typescript
// =============================================================================
// SECTION 3: Dashboard / Home Endpoints
// =============================================================================

// Dashboard types are defined in lib/types/dashboard.ts (single source of truth)
// Re-export here for backwards compatibility
export type {
  FeaturedMissionStatus,
  FeaturedMission,
  FeaturedMissionResponse,
  GetFeaturedMissionResponse,
  ClientInfo,
  CurrentTierInfo,
  NextTierInfo,
  TierProgress,
  CurrentTierReward,
  DashboardResponse,
  FormattedReward,
  Reward,
  RewardValueData,
  TierInfo,
} from './dashboard';
```

---

#### Post-Action Verification

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts 2>&1 | head -20
```
**Expected:** No type errors

**Verify re-exports present:**
```bash
grep -n "from './dashboard'" /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
```
**Expected:** Re-export line found

**Step Checkpoint:**
- [ ] Local definitions removed
- [ ] Re-exports added
- [ ] Type check passed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Update app/home/page.tsx with Direct Service Pattern

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx`
**Action Type:** MODIFY (complete replacement)
**Purpose:** Replace fetch pattern with direct service call

---

#### Pre-Action Reality Check

**Read Current File:**
```bash
cat /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```

**Expected:** Current file uses fetch('/api/dashboard') pattern with timing logs.

---

#### Edit Action: Replace entire file

**NEW File Content:**
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server-client'
import { getDashboardOverview } from '@/lib/services/dashboardService'
import { HomeClient } from './home-client'

/**
 * Home Page (Server Component)
 *
 * DIRECT SERVICE PATTERN (ENH-008):
 * Calls services directly instead of fetching from /api/dashboard.
 * This eliminates ~500-600ms of redundant middleware/auth overhead.
 *
 * The API route (/api/dashboard) is KEPT for client-side refresh/mutations.
 *
 * Auth Flow:
 * 1. Middleware runs setSession() for /home page route
 * 2. Server Component calls getUser() once (not redundant - we need user ID)
 * 3. Service calls reuse existing repository methods and RPCs
 *
 * References:
 * - HomePageDirectServiceEnhancement.md (ENH-008)
 * - app/api/dashboard/route.ts (logic source)
 */
export default async function HomePage() {
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
    console.error('[HomePage] CLIENT_ID not configured');
    return <HomeClient initialData={null} error="Server configuration error" />;
  }

  // 3. Get dashboard data - DIRECT SERVICE CALL (no fetch)
  const dashboardData = await getDashboardOverview(authUser.id, clientId);

  if (!dashboardData) {
    return <HomeClient initialData={null} error="Failed to load dashboard" />;
  }

  // 4. Return client component with data
  return <HomeClient initialData={dashboardData} error={null} />;
}
```

---

#### Post-Action Verification

**Verify file updated:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** ~48 lines

**Verify fetch REMOVED:**
```bash
grep -n "fetch" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** No matches

**Verify direct service call present:**
```bash
grep -n "getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** Match found

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File replaced with direct service pattern
- [ ] fetch removed
- [ ] getDashboardOverview present
- [ ] Type check passed

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Remove Timing Logs

**Target Files:** `middleware.ts`, `app/api/dashboard/route.ts`
**Action Type:** MODIFY
**Purpose:** Remove diagnostic timing logs added earlier

---

#### Edit Action 1: Remove timing logs from middleware.ts

Remove:
- `const MW_START = Date.now();`
- `const t_setSession = Date.now();`
- `console.log(\`[TIMING][Middleware]...` lines

#### Edit Action 2: Remove timing logs from app/api/dashboard/route.ts

Remove:
- `const API_START = Date.now();`
- `const t0 = Date.now();`
- `const t1 = Date.now();`
- `const t2 = Date.now();`
- All `console.log(\`[TIMING]...` lines

---

#### Post-Action Verification

**Verify timing logs removed:**
```bash
grep -r "\[TIMING\]" /home/jorge/Loyalty/Rumi/appcode/middleware.ts /home/jorge/Loyalty/Rumi/appcode/app/api/dashboard/route.ts /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** No matches

**Step Checkpoint:**
- [ ] Timing logs removed from all files

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `app/home/page.tsx`
**New Imports:**
```typescript
import { getDashboardOverview } from '@/lib/services/dashboardService'
```

**Verification:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] getDashboardOverview import resolves
- [ ] createClient import resolves
- [ ] HomeClient import resolves

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

**Call 3:** `getDashboardOverview()`
```typescript
const dashboardData = await getDashboardOverview(authUser.id, clientId);
```
- [ ] Arguments: `(userId: string, clientId: string)`
- [ ] Returns `DashboardResponse | null`

---

### Type Alignment Verification

**Types Used:**
- `DashboardResponse` - from `@/lib/types/dashboard` (via service re-export)

**Verification:**
- [ ] HomeClient accepts `{ initialData: DashboardResponse | null, error: string | null }`
- [ ] Return type from `getDashboardOverview()` matches
- [ ] TypeScript compiles without errors

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**This implementation REUSES existing verified code. No new queries added.**

**Existing Security (already verified in ENH-008 Section 9):**

| Function | client_id Filter | Verified In |
|----------|------------------|-------------|
| `getDashboardOverview()` → `getDashboardDataRPC()` | RPC enforces via `p_client_id` | DASHBOARD_IMPL.md |

**Security Checklist:**
- [ ] No NEW database queries added (reuses existing)
- [ ] Existing queries have client_id filters (pre-verified)
- [ ] No cross-tenant data exposure possible

---

### Authentication Check

**Route:** `/home` (page route)

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
**Each verification MUST trace back to ENH-008 acceptance criteria.**

---

### Verification 1: Build Succeeds

**Traces to:** Acceptance Criterion #7

**Command:**
```bash
npm run build 2>&1 | tail -30
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

---

### Verification 2: Type Check Passes

**Traces to:** Acceptance Criterion #6

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -c "error"
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed

---

### Verification 3: Acceptance Criteria Validation

**For each acceptance criterion from ENH-008 Section 16:**

#### Criterion 1: lib/types/dashboard.ts created
**Test:** File exists with type definitions
**Command:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts && wc -l /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
```
**Expected:** File exists, ~200 lines
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 2: dashboardService.ts imports from shared
**Test:** Import statement present
**Command:**
```bash
grep -n "from '@/lib/types/dashboard'" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** Import line found
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 3: app/types/dashboard.ts re-exports
**Test:** File contains re-export
**Command:**
```bash
cat /home/jorge/Loyalty/Rumi/appcode/app/types/dashboard.ts
```
**Expected:** Contains `export * from '@/lib/types/dashboard'`
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 4: lib/types/api.ts re-exports ALL 10 types
**Test:** Re-export statement present
**Command:**
```bash
grep -A20 "SECTION 3: Dashboard" /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
```
**Expected:** Re-export from './dashboard' with all types listed
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 5: app/home/page.tsx uses direct service
**Test:** getDashboardOverview called directly
**Command:**
```bash
grep -n "getDashboardOverview\|fetch" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
```
**Expected:** getDashboardOverview present, no fetch
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 6: Type checker passes
**Test:** npx tsc --noEmit
**Command:**
```bash
npx tsc --noEmit 2>&1 | grep -c "error"
```
**Expected:** 0 errors
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

#### Criterion 7: Build completes
**Test:** npm run build
**Expected:** Build success
**Actual:** [from Verification 1]
**Status:** [ ] PASS / FAIL

#### Criterion 8: Dashboard renders correctly
**Test:** Manual verification
**Expected:** Dashboard shows tier, progress, featured mission, rewards
**Actual:** [manual check after deployment]
**Status:** [ ] PASS / FAIL (defer to manual)

#### Criterion 9: Timing logs removed
**Test:** No [TIMING] in code
**Command:**
```bash
grep -r "\[TIMING\]" /home/jorge/Loyalty/Rumi/appcode/middleware.ts /home/jorge/Loyalty/Rumi/appcode/app/api/dashboard/route.ts /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx 2>&1
```
**Expected:** No matches
**Actual:** [actual result]
**Status:** [ ] PASS / FAIL

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `lib/types/dashboard.ts`: NEW (~200 lines)
- `lib/services/dashboardService.ts`: ~100 lines removed (local types), ~15 lines added
- `app/types/dashboard.ts`: ~160 lines removed, ~7 lines (re-export)
- `lib/types/api.ts`: ~120 lines changed (local types → re-export)
- `app/home/page.tsx`: ~50 lines changed (fetch → direct service)
- `middleware.ts`: ~5 lines removed (timing logs)
- `app/api/dashboard/route.ts`: ~10 lines removed (timing logs)

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED / FAILED]

**Acceptance Criteria Summary:**
| # | Criterion | Test Result |
|---|-----------|-------------|
| 1 | lib/types/dashboard.ts created | [ ] |
| 2 | dashboardService imports shared | [ ] |
| 3 | app/types re-exports | [ ] |
| 4 | lib/types/api.ts re-exports ALL | [ ] |
| 5 | Direct service in page | [ ] |
| 6 | Type check passes | [ ] |
| 7 | Build completes | [ ] |
| 8 | Dashboard renders | [ ] (manual) |
| 9 | Timing logs removed | [ ] |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-22
**Executor:** Claude Opus 4.5
**Specification Source:** HomePageDirectServiceEnhancement.md
**Implementation Doc:** HomePageDirectServiceIMPL.md
**Enhancement ID:** ENH-008

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
[Timestamp] Step 1: Create lib/types/dashboard.ts - Created - Verified
[Timestamp] Step 2: Update dashboardService.ts - Modified - Verified
[Timestamp] Step 3: Update app/types/dashboard.ts - Modified - Verified
[Timestamp] Step 4: Update lib/types/api.ts - Modified - Verified
[Timestamp] Step 5: Update app/home/page.tsx - Modified - Verified
[Timestamp] Step 6: Remove timing logs - Modified - Verified
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
[Timestamp] Build succeeds
[Timestamp] Type check passes
[Timestamp] Criterion 1-9: [PASS/FAIL]
[Timestamp] Git diff sanity
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `lib/types/dashboard.ts` - CREATE - ~200 lines - Single source of truth for dashboard types
2. `lib/services/dashboardService.ts` - MODIFY - ~100 lines removed, ~15 added - Import from shared, runtime validation
3. `app/types/dashboard.ts` - MODIFY - ~160 lines removed, ~7 lines - Re-export from shared
4. `lib/types/api.ts` - MODIFY - ~120 lines changed - Re-export dashboard types
5. `app/home/page.tsx` - MODIFY - ~50 lines changed - Direct service pattern
6. `middleware.ts` - MODIFY - ~5 lines removed - Timing logs
7. `app/api/dashboard/route.ts` - MODIFY - ~10 lines removed - Timing logs

**Total:** 7 files, ~200 lines added (net: ~-50 due to removed duplicates)

---

### Feature Completion

**Before Implementation:**
- Pattern: Server Component → fetch('/api/dashboard') → API route → service
- Overhead: ~500-600ms redundant middleware/auth calls
- Page load: ~1178ms

**After Implementation:**
- Pattern: Server Component → service directly
- Savings: ~500-600ms eliminated
- Expected page load: ~500-600ms

---

### Decision Trail

**Step 1: Analysis Phase**
- Timing diagnostics revealed 1178ms page load
- Created ENH-008 HomePageDirectServiceEnhancement.md
- Identified 3 type duplicates + 10 api.ts types

**Step 2: Audit Phase**
- 3 rounds of audit feedback
- Round 1: Add lib/types/api.ts step
- Round 2: Expand to ALL 10 dashboard types
- Round 3: Confirm progressId, TypeScript availability
- Final: APPROVE WITH CHANGES (all addressed)

**Step 3: Implementation Phase**
- StandardGapFixIMPL.md template applied
- Created this document
- Ready for execution

**Step 4: Current Status**
- Implementation: PENDING EXECUTION
- Ready for: User approval to execute

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify lib/types/dashboard.ts created
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard.ts
# Should show: file exists, ~200 lines

# 2. Verify no type errors
npx tsc --noEmit 2>&1 | grep -c "error"
# Should show: 0

# 3. Verify fetch removed from page
grep "fetch" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
# Should show: no matches

# 4. Verify direct service call present
grep -n "getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/app/home/page.tsx
# Should show: function call found

# 5. Verify api.ts re-exports
grep -A20 "SECTION 3: Dashboard" /home/jorge/Loyalty/Rumi/appcode/lib/types/api.ts
# Should show: re-export from './dashboard'

# 6. Verify timing logs removed
grep -r "\[TIMING\]" /home/jorge/Loyalty/Rumi/appcode/middleware.ts /home/jorge/Loyalty/Rumi/appcode/app/api/dashboard/route.ts
# Should show: no matches

# 7. Verify build succeeds
npm run build 2>&1 | tail -10
# Should show: build success
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
- [ ] Step 1: Create lib/types/dashboard.ts
- [ ] Step 2: Update dashboardService.ts
- [ ] Step 3: Update app/types/dashboard.ts
- [ ] Step 4: Update lib/types/api.ts
- [ ] Step 5: Update app/home/page.tsx
- [ ] Step 6: Remove timing logs

**Integration:**
- [ ] Import verification
- [ ] Call site verification
- [ ] Type alignment

**Security:**
- [ ] Multi-tenant isolation (reuses existing verified)
- [ ] Auth requirements documented

**Feature Verification:**
- [ ] All 9 acceptance criteria tested
- [ ] Git diff reviewed

---

### Final Status

**Implementation Result:** PENDING EXECUTION

**Next Steps:**
1. User approves this implementation plan
2. Execute Steps 1-6
3. Run all verifications
4. Git commit

---

### Git Commit Message Template

```
perf: Direct service calls for /home page (ENH-008)

Eliminates ~500-600ms of redundant middleware/auth overhead by calling
services directly from Server Component instead of fetching from
internal API route.

Type Consolidation:
- Created lib/types/dashboard.ts as single source of truth
- Removed duplicates from dashboardService.ts, app/types, lib/types/api.ts
- Added runtime validation for MissionType/RewardType

Changes:
- lib/types/dashboard.ts: NEW - canonical dashboard types
- lib/services/dashboardService.ts: Import from shared, add validation
- app/types/dashboard.ts: Re-export from shared
- lib/types/api.ts: Re-export ALL 10 dashboard types
- app/home/page.tsx: Replace fetch with direct getDashboardOverview()

Pattern: Server Component → Services (was: SC → fetch → API → Services)

The /api/dashboard route is KEPT for client-side refresh/mutations.

References:
- HomePageDirectServiceEnhancement.md
- HomePageDirectServiceIMPL.md

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
- [ ] Following locked specification from ENH-008
- [ ] Not re-designing (just implementing)
- [ ] Addressed all audit feedback (3 rounds)

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
