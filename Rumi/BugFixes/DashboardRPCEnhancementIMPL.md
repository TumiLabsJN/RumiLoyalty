# Dashboard RPC Function - Enhancement Implementation Plan

**Specification Source:** DashboardRPCEnhancement.md (v1.6)
**Enhancement ID:** ENH-001
**Type:** Enhancement
**Priority:** High
**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From DashboardRPCEnhancement.md:**

**Gap Summary:** Single PostgreSQL RPC function that returns all dashboard data in one database call is missing.

**Business Need:** Reduce dashboard page load time from ~1.9 seconds to sub-1 second for better user experience.

**Files to Create/Modify:**
- `/home/jorge/Loyalty/Rumi/supabase/migrations/YYYYMMDDHHMMSS_get_dashboard_data.sql` - CREATE
- `appcode/lib/types/dashboard-rpc.ts` - CREATE
- `appcode/lib/repositories/dashboardRepository.ts` - MODIFY
- `appcode/lib/services/dashboardService.ts` - MODIFY
- `appcode/app/api/dashboard/route.ts` - NO CHANGE (service layer handles switch)

**Specified Solution:**
> Create a PostgreSQL function `get_dashboard_data()` that executes all JOINs in a single database call and returns a JSON object with all dashboard sections. Call via `supabase.rpc()` from the repository layer.

**Acceptance Criteria (From DashboardRPCEnhancement.md Section 16):**
1. [ ] Migration deployed and RPC function exists in database
2. [ ] New repository method calls RPC successfully
3. [ ] New service method transforms RPC response to `DashboardResponse`
4. [ ] Service method replaced with RPC implementation
5. [ ] Type checker passes
6. [ ] All tests pass (existing + new)
7. [ ] Build completes
8. [ ] Manual verification completed
9. [ ] Page load time reduced to under 1 second

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES (6 audit rounds)
- Critical Issues Addressed:
  - raffle_participations client_id filter
  - mission_progress client_id filter
  - REVOKE FROM PUBLIC on SECURITY DEFINER
  - SET search_path = public
  - Null tier guard
  - Safe reward_amount cast
  - All file paths use appcode/ prefix
- Concerns Addressed:
  - Response transformation table with snake_case → camelCase
  - Status semantics documentation
  - Edge case matrix
  - Field-by-field checklist
  - Response parity test specification

**Expected Outcome:**
- Feature implemented: YES
- Files created: 2 (migration, types)
- Files modified: 3 (repository, service, route)
- Lines added: ~400 (approximate)
- Breaking changes: NO
- Schema changes: YES (new PostgreSQL function)
- API contract changes: NO (internal implementation only)

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
**Expected:** Clean working tree or acceptable modified files

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - RPC function hasn't been added since spec was created.

**Search for existing implementation:**
```bash
grep -r "get_dashboard_data" /home/jorge/Loyalty/Rumi/appcode/lib/
grep -r "getDashboardDataRPC" /home/jorge/Loyalty/Rumi/appcode/lib/
grep -r "getDashboardOverviewRPC" /home/jorge/Loyalty/Rumi/appcode/lib/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `get_dashboard_data`: [result]
- [ ] Grep executed for `getDashboardDataRPC`: [result]
- [ ] Grep executed for `getDashboardOverviewRPC`: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for related implementations:**
```bash
grep -r "supabase.rpc" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/ | head -5
grep -n "getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
grep -n "generateRewardDisplayText" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
grep -n "formatVipMetricValue" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `missionRepository.ts` | `supabase.rpc('get_available_missions')` | Existing RPC pattern | Reference for implementation |
| `dashboardService.ts` | `getDashboardOverview()` | Current implementation | Replace with RPC-based implementation |
| `dashboardService.ts` | `generateRewardDisplayText()` | Helper function | Reuse in transformation |
| `dashboardService.ts` | `formatVipMetricValue()` | Helper function | Reuse in transformation |

**Checklist:**
- [ ] Existing RPC pattern identified: [YES / NO]
- [ ] Current dashboard service found: [YES / NO]
- [ ] Helper functions located: [YES / NO]
- [ ] Integration points identified

---

### Gate 4: Files to Modify Verification

**Files to be CREATED:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts 2>&1
```
**Expected:** No such file or directory (does not exist)

**Files to be MODIFIED:**

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** File exists

**File 4:** `/home/jorge/Loyalty/Rumi/appcode/app/api/dashboard/route.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/api/dashboard/route.ts
```
**Expected:** File exists

**Checklist:**
- [ ] Types file does NOT exist: [confirmed]
- [ ] Repository file exists: [confirmed]
- [ ] Service file exists: [confirmed]
- [ ] Route file exists: [confirmed]

---

### Gate 5: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**
```bash
grep -n "users\|tiers\|missions\|rewards\|raffle_participations\|mission_progress" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md | head -30
```

**Tables involved:** users, clients, tiers, missions, mission_progress, rewards, raffle_participations

**Column verification (key columns):**
| Column in Spec | Table | Exists? |
|----------------|-------|---------|
| `current_tier` | users | ✅ |
| `client_id` | all tables | ✅ |
| `tier_id` | tiers | ✅ |
| `tier_order` | tiers | ✅ |
| `mission_type` | missions | ✅ |
| `reward_id` | missions | ✅ |
| `status` | mission_progress | ✅ |
| `value_data` | rewards | ✅ |

**Checklist:**
- [ ] All required columns exist in schema
- [ ] Data types compatible
- [ ] No schema migration needed for tables (function only)

---

### Gate 6: API Contract Verification

**Read API_CONTRACTS.md for GET /api/dashboard:**
```bash
grep -n "GET /api/dashboard\|DashboardResponse" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -20
```

**Endpoint:** GET /api/dashboard

**Contract alignment:**
| Field in Spec | Field in Contract | Aligned? |
|---------------|-------------------|----------|
| `user.handle` | `user.handle` | ✅ |
| `currentTier.name` | `currentTier.name` | ✅ |
| `tierProgress.progressPercentage` | `tierProgress.progressPercentage` | ✅ (computed) |
| `featuredMission.mission.rewardDisplayText` | Computed | ✅ (via service) |
| `currentTierRewards[].displayText` | Computed | ✅ (via service) |

**Checklist:**
- [ ] All field names align with contract
- [ ] Response structure matches (after transformation)
- [ ] No breaking changes to existing API

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

### Step 1: Create Types File

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts`
**Action Type:** CREATE
**Purpose:** Define TypeScript interface for RPC response before transformation

---

**New File Content:**
```typescript
/**
 * Dashboard RPC Response Type
 *
 * Raw response from get_dashboard_data PostgreSQL function.
 * Must be transformed to DashboardResponse by service layer.
 *
 * @see DashboardRPCEnhancement.md Section 6
 */

export interface DashboardRPCResponse {
  user: {
    id: string;
    handle: string;
    email: string | null;
    clientName: string;
  };
  client: {
    id: string;
    vipMetric: 'sales' | 'units';
    checkpointMonths: number;
  };
  currentTier: {
    id: string;
    name: string;
    color: string;
    order: number;
    checkpointExempt: boolean;
  };
  nextTier: {
    id: string;
    name: string;
    color: string;
    salesThreshold: number;
    unitsThreshold: number;
  } | null;
  checkpointData: {
    salesCurrent: number;
    unitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    nextCheckpointAt: string | null;
    lastLoginAt: string | null;
  };
  featuredMission: {
    missionId: string;
    missionType: string;
    displayName: string;
    targetValue: number;
    targetUnit: string;
    raffleEndDate: string | null;
    activated: boolean;
    progressId: string | null;
    currentValue: number;
    progressStatus: string | null;
    completedAt: string | null;
    rewardId: string;
    rewardType: string;
    rewardName: string | null;
    rewardValueData: Record<string, unknown> | null;
    tierName: string;
    tierColor: string;
  } | null;
  recentFulfillment: {
    fulfilledAt: string;
    rewardType: string;
    rewardName: string | null;
    rewardAmount: number;
  } | null;
  currentTierRewards: Array<{
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    value_data: Record<string, unknown> | null;
    reward_source: string;
    redemption_quantity: number;
    display_order: number;
  }>;
  totalRewardsCount: number;
}
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts
```
**Expected:** File exists, ~75 lines

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/types/dashboard-rpc.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] File created successfully ✅
- [ ] Line count approximately correct ✅
- [ ] No type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Add Repository Method

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add `getDashboardDataRPC()` method to call the PostgreSQL function

---

**Pre-Action Reality Check:**

**Read end of file to find insertion point:**
```bash
tail -30 /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```

**Expected:** File ends with class closing brace or export

**Reality Check:**
- [ ] Read command executed
- [ ] Found insertion point at end of file

---

**Edit Action:**

**Location:** Add new method before the closing of `dashboardRepository` object

**NEW Code (to add at end of dashboardRepository object, before final closing):**
```typescript
  /**
   * Get all dashboard data in a single RPC call
   *
   * @param userId - User UUID
   * @param clientId - Client UUID for multi-tenant isolation
   * @returns Dashboard data from RPC or null if not found
   * @see DashboardRPCEnhancement.md
   */
  async getDashboardDataRPC(
    userId: string,
    clientId: string
  ): Promise<DashboardRPCResponse | null> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_user_id: userId,
      p_client_id: clientId,
    });

    if (error) {
      console.error('[DashboardRepository] RPC error:', error);
      return null;
    }

    return data as DashboardRPCResponse | null;
  },
```

**Also add import at top of file:**
```typescript
import type { DashboardRPCResponse } from '@/types/dashboard-rpc';
```

**Post-Action Verification:**
```bash
grep -n "getDashboardDataRPC" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
grep -n "DashboardRPCResponse" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/dashboardRepository.ts
```
**Expected:** Method and import found

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No new type errors (RPC not yet deployed, will warn about missing function)

**Step Checkpoint:**
- [ ] Method added ✅
- [ ] Import added ✅
- [ ] Type check passes ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Replace Service Method with RPC Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts`
**Action Type:** MODIFY
**Purpose:** Replace `getDashboardOverview()` with RPC-based implementation (no feature flag - fail fast approach)

---

**Pre-Action Reality Check:**

**Read current getDashboardOverview function:**
```bash
grep -n "export async function getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```

**Expected:** Function found at specific line number

**Reality Check:**
- [ ] Read command executed
- [ ] Current implementation found

---

**Edit Action:**

**REPLACE existing `getDashboardOverview()` function with:**
```typescript
/**
 * Get dashboard overview using RPC (single database call)
 *
 * This replaces the previous multi-query implementation.
 * Reduces 6+ queries to 1 for ~75% latency improvement.
 * Response is transformed to match exact DashboardResponse contract.
 *
 * @see DashboardRPCEnhancement.md
 */
export async function getDashboardOverview(
  userId: string,
  clientId: string
): Promise<DashboardResponse | null> {
  // 1. Call RPC
  const rpcData = await dashboardRepository.getDashboardDataRPC(userId, clientId);
  if (!rpcData) return null;

  // 2. Transform RPC response to DashboardResponse
  const vipMetric = rpcData.client.vipMetric;
  const vipMetricLabel = vipMetric === 'sales' ? 'Total Sales' : 'Units Sold';

  // Calculate tier progress
  const currentValue = vipMetric === 'sales'
    ? (rpcData.checkpointData.salesCurrent || 0) + (rpcData.checkpointData.manualAdjustmentsTotal || 0)
    : (rpcData.checkpointData.unitsCurrent || 0) + (rpcData.checkpointData.manualAdjustmentsUnits || 0);

  const targetValue = rpcData.nextTier
    ? (vipMetric === 'sales' ? rpcData.nextTier.salesThreshold : rpcData.nextTier.unitsThreshold)
    : currentValue; // At max tier

  const progressPercentage = targetValue > 0
    ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
    : 100;

  // Format checkpoint expiration
  const checkpointExpiresFormatted = rpcData.checkpointData.nextCheckpointAt
    ? new Date(rpcData.checkpointData.nextCheckpointAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Transform featured mission
  let featuredMissionResponse: FeaturedMissionResponse;
  if (rpcData.featuredMission) {
    const fm = rpcData.featuredMission;
    const missionProgressPercentage = fm.targetValue > 0
      ? Math.round((fm.currentValue / fm.targetValue) * 100)
      : 0;

    // Determine status
    let status: string;
    if (fm.missionType === 'raffle' && !fm.progressStatus) {
      status = 'raffle_available';
    } else if (fm.progressStatus === 'completed') {
      status = 'completed';
    } else if (fm.progressStatus === 'fulfilled') {
      status = 'fulfilled';
    } else {
      status = 'active';
    }

    // Generate reward display text
    const rewardDisplayText = generateRewardDisplayText({
      type: fm.rewardType,
      name: fm.rewardName,
      valueData: fm.rewardValueData as Record<string, unknown> | null,
    });

    featuredMissionResponse = {
      status,
      mission: {
        id: fm.missionId,
        type: fm.missionType,
        displayName: fm.displayName,
        isRaffle: fm.missionType === 'raffle',
        progressPercentage: missionProgressPercentage,
        currentValue: fm.currentValue,
        currentFormatted: formatMissionValue(fm.currentValue, fm.missionType, vipMetric),
        targetValue: fm.targetValue,
        targetText: formatTargetText(fm.targetValue, fm.targetUnit, fm.missionType),
        rewardType: fm.rewardType,
        rewardAmount: (fm.rewardValueData as Record<string, unknown>)?.amount as number || null,
        rewardCustomText: fm.rewardName,
        rewardDisplayText,
      },
      tier: fm.tierName ? { name: fm.tierName, color: fm.tierColor } : null,
      showCongratsModal: rpcData.recentFulfillment !== null,
      congratsMessage: rpcData.recentFulfillment
        ? `You earned ${generateRewardDisplayText({
            type: rpcData.recentFulfillment.rewardType,
            name: rpcData.recentFulfillment.rewardName,
            valueData: { amount: rpcData.recentFulfillment.rewardAmount },
          })}!`
        : null,
      supportEmail: 'support@example.com', // TODO: Source from client settings when support_email column added
    };
  } else {
    featuredMissionResponse = {
      status: 'no_missions',
      mission: null,
      tier: null,
      showCongratsModal: false,
      congratsMessage: null,
      supportEmail: 'support@example.com', // TODO: Source from client settings when support_email column added
    };
  }

  // Transform tier rewards (snake_case → camelCase + displayText)
  // CRITICAL: Must preserve ALL fields from current API contract
  const currentTierRewards = rpcData.currentTierRewards.map(r => ({
    id: r.id,
    type: r.type,
    name: r.name,
    description: r.description,
    valueData: r.value_data, // Rename: value_data → valueData
    rewardSource: r.reward_source, // Rename: reward_source → rewardSource
    redemptionQuantity: r.redemption_quantity, // Rename: redemption_quantity → redemptionQuantity
    displayOrder: r.display_order, // Rename: display_order → displayOrder
    displayText: generateRewardDisplayText({
      type: r.type,
      name: r.name,
      valueData: r.value_data,
    }),
  }));

  // 3. Return fully-formed DashboardResponse
  return {
    user: {
      id: rpcData.user.id,
      handle: rpcData.user.handle,
      email: rpcData.user.email,
      clientName: rpcData.user.clientName,
    },
    client: {
      id: rpcData.client.id,
      vipMetric: rpcData.client.vipMetric,
      vipMetricLabel,
    },
    currentTier: {
      id: rpcData.currentTier.id,
      name: rpcData.currentTier.name,
      color: rpcData.currentTier.color,
      order: rpcData.currentTier.order,
      checkpointExempt: rpcData.currentTier.checkpointExempt,
    },
    nextTier: rpcData.nextTier ? {
      id: rpcData.nextTier.id,
      name: rpcData.nextTier.name,
      color: rpcData.nextTier.color,
      salesThreshold: rpcData.nextTier.salesThreshold,
      unitsThreshold: rpcData.nextTier.unitsThreshold,
    } : null,
    tierProgress: {
      currentValue,
      targetValue,
      progressPercentage,
      currentFormatted: formatVipMetricValue(currentValue, vipMetric),
      targetFormatted: formatVipMetricValue(targetValue, vipMetric),
      checkpointExpiresAt: rpcData.checkpointData.nextCheckpointAt,
      checkpointExpiresFormatted,
      checkpointMonths: rpcData.client.checkpointMonths,
    },
    featuredMission: featuredMissionResponse,
    currentTierRewards,
    totalRewardsCount: rpcData.totalRewardsCount,
  };
}

// Helper functions for mission formatting
// NOTE: Logic matches previous implementation from dashboardService.ts lines 412-445
// Original logic:
// - raffle: currentFormatted = prizeDisplay (name or "$X"), targetText = "Enter to Win!"
// - sales_dollars: formatCurrency(), targetText = "of $X sales"
// - sales_units: toLocaleString(), targetText = "of X units sold"
// - videos/likes/views: toLocaleString(), targetText = "of X {unitText}"
function formatMissionValue(value: number, missionType: string, vipMetric: string): string {
  if (missionType === 'sales_dollars') {
    return formatCurrency(value);  // Reuse existing formatCurrency helper
  }
  return value.toLocaleString();
}

const UNIT_TEXT_MAP: Record<string, string> = {
  videos: 'videos',
  likes: 'likes',
  views: 'views',
};

function formatTargetText(target: number, unit: string, missionType: string): string {
  if (missionType === 'raffle') {
    return 'Enter to Win!';
  }
  if (missionType === 'sales_dollars') {
    return `of ${formatCurrency(target)} sales`;
  }
  if (missionType === 'sales_units') {
    return `of ${target.toLocaleString()} units sold`;
  }
  // videos, likes, views
  const unitText = UNIT_TEXT_MAP[missionType] ?? unit;
  return `of ${target.toLocaleString()} ${unitText}`;
}
```

**Also add import for DashboardRPCResponse if not present:**
```typescript
import type { DashboardRPCResponse } from '@/types/dashboard-rpc';
```

**Post-Action Verification:**
```bash
grep -n "getDashboardOverview" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
grep -n "getDashboardDataRPC" /home/jorge/Loyalty/Rumi/appcode/lib/services/dashboardService.ts
```
**Expected:** Function uses RPC repository method

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -30
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] getDashboardOverview() replaced with RPC implementation ✅
- [ ] Transformation logic complete ✅
- [ ] Type check passes ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Create SQL Migration File (For Manual Deployment)

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql`
**Action Type:** CREATE
**Purpose:** Create the PostgreSQL RPC function

**Note:** This migration will be deployed manually via Supabase SQL Editor or CLI.

---

**New File Content:**
```sql
-- Migration: Create get_dashboard_data RPC function
-- Purpose: Single-query dashboard data retrieval for ~70% latency reduction
-- Version: 1.0
-- Date: 2025-12-17
-- Reference: DashboardRPCEnhancement.md v1.6

CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- SECURITY: Prevent search_path injection
AS $$
DECLARE
  v_result JSON;
  v_user_data RECORD;
  v_current_tier RECORD;
  v_next_tier RECORD;
  v_featured_mission RECORD;
  v_recent_fulfillment RECORD;
  v_rewards JSON;
  v_rewards_count INTEGER;
BEGIN
  -- 1. Get user with client data
  SELECT
    u.id,
    u.tiktok_handle,
    u.email,
    u.current_tier,
    u.checkpoint_sales_current,
    u.checkpoint_units_current,
    u.manual_adjustments_total,
    u.manual_adjustments_units,
    u.next_checkpoint_at,
    u.last_login_at,
    c.id AS client_id,
    c.name AS client_name,
    c.vip_metric,
    c.checkpoint_months
  INTO v_user_data
  FROM users u
  INNER JOIN clients c ON u.client_id = c.id
  WHERE u.id = p_user_id
    AND u.client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  IF v_user_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Get current tier
  SELECT
    tier_id, tier_name, tier_color, tier_order, checkpoint_exempt,
    sales_threshold, units_threshold
  INTO v_current_tier
  FROM tiers
  WHERE tier_id = v_user_data.current_tier
    AND client_id = p_client_id;  -- CRITICAL: Multitenancy enforcement

  -- Guard: If current tier not found, return NULL (prevents exception on v_current_tier.tier_order)
  IF v_current_tier IS NULL THEN
    RETURN NULL;
  END IF;

  -- 3. Get next tier (tier_order + 1)
  SELECT
    id, tier_id, tier_name, tier_color, tier_order,
    sales_threshold, units_threshold
  INTO v_next_tier
  FROM tiers
  WHERE client_id = p_client_id
    AND tier_order = v_current_tier.tier_order + 1;

  -- 4. Get featured mission (highest priority, not claimed)
  SELECT
    m.id AS mission_id,
    m.mission_type,
    m.display_name,
    m.title,
    m.description,
    m.target_value,
    m.target_unit,
    m.raffle_end_date,
    m.activated,
    m.tier_eligibility,
    mp.id AS progress_id,
    mp.current_value,
    mp.status AS progress_status,
    mp.completed_at,
    r.id AS reward_id,
    r.type AS reward_type,
    r.name AS reward_name,
    r.description AS reward_description,
    r.value_data AS reward_value_data,
    t.tier_name AS tier_name,
    t.tier_color AS tier_color
  INTO v_featured_mission
  FROM missions m
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
  LEFT JOIN mission_progress mp ON m.id = mp.mission_id
    AND mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on mission_progress
  LEFT JOIN raffle_participations rp ON m.id = rp.mission_id
    AND rp.user_id = p_user_id
    AND rp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on raffle_participations
    AND m.mission_type = 'raffle'
  WHERE m.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement on missions
    AND m.enabled = true
    AND (m.tier_eligibility = v_current_tier.tier_id OR m.tier_eligibility = 'all')
    AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
    AND (mp.status IS NULL OR mp.status NOT IN ('claimed', 'fulfilled'))
    AND (m.mission_type != 'raffle' OR (m.activated = true AND rp.id IS NULL))
  ORDER BY
    CASE m.mission_type
      WHEN 'raffle' THEN 0
      WHEN 'sales_dollars' THEN CASE WHEN v_user_data.vip_metric = 'sales' THEN 1 ELSE 2 END
      WHEN 'sales_units' THEN CASE WHEN v_user_data.vip_metric = 'units' THEN 1 ELSE 2 END
      WHEN 'videos' THEN 3
      WHEN 'likes' THEN 4
      WHEN 'views' THEN 5
      ELSE 999
    END ASC
  LIMIT 1;

  -- 5. Check for recent fulfillment (congrats modal)
  SELECT
    mp.id AS progress_id,
    mp.completed_at AS fulfilled_at,
    r.type AS reward_type,
    r.name AS reward_name,
    COALESCE((r.value_data->>'amount')::INTEGER, 0) AS reward_amount  -- Safe cast with fallback
  INTO v_recent_fulfillment
  FROM mission_progress mp
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  WHERE mp.user_id = p_user_id
    AND mp.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
    AND mp.status = 'fulfilled'
    AND (v_user_data.last_login_at IS NULL OR mp.completed_at > v_user_data.last_login_at)
  ORDER BY mp.completed_at DESC
  LIMIT 1;

  -- 6. Get top 4 tier rewards
  SELECT json_agg(reward_row)
  INTO v_rewards
  FROM (
    SELECT
      r.id,
      r.type,
      r.name,
      r.description,
      r.value_data,
      r.reward_source,
      r.redemption_quantity,
      r.display_order
    FROM rewards r
    WHERE r.client_id = p_client_id  -- CRITICAL: Multitenancy enforcement
      AND r.tier_eligibility = v_current_tier.tier_id
      AND r.enabled = true
      AND r.reward_source = 'vip_tier'
    ORDER BY r.display_order ASC
    LIMIT 4
  ) reward_row;

  -- 7. Get total rewards count
  SELECT COUNT(*)
  INTO v_rewards_count
  FROM rewards
  WHERE client_id = p_client_id
    AND tier_eligibility = v_current_tier.tier_id
    AND enabled = true
    AND reward_source = 'vip_tier';

  -- 8. Build response JSON
  v_result := json_build_object(
    'user', json_build_object(
      'id', v_user_data.id,
      'handle', v_user_data.tiktok_handle,
      'email', v_user_data.email,
      'clientName', v_user_data.client_name
    ),
    'client', json_build_object(
      'id', v_user_data.client_id,
      'vipMetric', v_user_data.vip_metric,
      'checkpointMonths', v_user_data.checkpoint_months
    ),
    'currentTier', json_build_object(
      'id', v_current_tier.tier_id,
      'name', v_current_tier.tier_name,
      'color', v_current_tier.tier_color,
      'order', v_current_tier.tier_order,
      'checkpointExempt', COALESCE(v_current_tier.checkpoint_exempt, false)
    ),
    'nextTier', CASE WHEN v_next_tier.tier_id IS NOT NULL THEN json_build_object(
      'id', v_next_tier.tier_id,
      'name', v_next_tier.tier_name,
      'color', v_next_tier.tier_color,
      'salesThreshold', v_next_tier.sales_threshold,
      'unitsThreshold', v_next_tier.units_threshold
    ) ELSE NULL END,
    'checkpointData', json_build_object(
      'salesCurrent', v_user_data.checkpoint_sales_current,
      'unitsCurrent', v_user_data.checkpoint_units_current,
      'manualAdjustmentsTotal', v_user_data.manual_adjustments_total,
      'manualAdjustmentsUnits', v_user_data.manual_adjustments_units,
      'nextCheckpointAt', v_user_data.next_checkpoint_at,
      'lastLoginAt', v_user_data.last_login_at
    ),
    'featuredMission', CASE WHEN v_featured_mission.mission_id IS NOT NULL THEN json_build_object(
      'missionId', v_featured_mission.mission_id,
      'missionType', v_featured_mission.mission_type,
      'displayName', v_featured_mission.display_name,
      'targetValue', v_featured_mission.target_value,
      'targetUnit', v_featured_mission.target_unit,
      'raffleEndDate', v_featured_mission.raffle_end_date,
      'activated', v_featured_mission.activated,
      'progressId', v_featured_mission.progress_id,
      'currentValue', COALESCE(v_featured_mission.current_value, 0),
      'progressStatus', v_featured_mission.progress_status,
      'completedAt', v_featured_mission.completed_at,
      'rewardId', v_featured_mission.reward_id,
      'rewardType', v_featured_mission.reward_type,
      'rewardName', v_featured_mission.reward_name,
      'rewardValueData', v_featured_mission.reward_value_data,
      'tierName', v_featured_mission.tier_name,
      'tierColor', v_featured_mission.tier_color
    ) ELSE NULL END,
    'recentFulfillment', CASE WHEN v_recent_fulfillment.progress_id IS NOT NULL THEN json_build_object(
      'fulfilledAt', v_recent_fulfillment.fulfilled_at,
      'rewardType', v_recent_fulfillment.reward_type,
      'rewardName', v_recent_fulfillment.reward_name,
      'rewardAmount', v_recent_fulfillment.reward_amount
    ) ELSE NULL END,
    'currentTierRewards', COALESCE(v_rewards, '[]'::json),
    'totalRewardsCount', v_rewards_count
  );

  RETURN v_result;
END;
$$;

-- SECURITY: Revoke default PUBLIC access, then grant only to specific roles
REVOKE EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, UUID) TO service_role;
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
```
**Expected:** File exists, ~220 lines

**Step Checkpoint:**
- [ ] Migration file created ✅
- [ ] SQL syntax complete ✅
- [ ] All client_id filters present ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Deploy SQL Migration to Supabase

**Action Type:** MANUAL
**Purpose:** Deploy the RPC function to the database

**Deployment Options:**

**Option A: Supabase SQL Editor**
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of migration file
4. Execute

**Option B: Supabase CLI**
```bash
supabase db push
```

**Post-Deploy Verification:**
```bash
# Test RPC function exists
curl -X POST 'https://[project-ref].supabase.co/rest/v1/rpc/get_dashboard_data' \
  -H "apikey: [anon-key]" \
  -H "Authorization: Bearer [user-jwt]" \
  -H "Content-Type: application/json" \
  -d '{"p_user_id": "[test-user-id]", "p_client_id": "[test-client-id]"}'
```

**Expected:** JSON response with dashboard data (or null if user not found)

**Step Checkpoint:**
- [ ] Migration deployed ✅
- [ ] RPC function callable ✅
- [ ] Returns expected JSON structure ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 6: Test the Implementation

**Action Type:** VERIFY
**Purpose:** Verify end-to-end functionality and response parity after migration deployment

**Start Dev Server:**
```bash
npm run dev
```

**Test in Browser:**
1. Navigate to `/home`
2. Open Network tab
3. Check `/api/dashboard` response time
4. Verify all dashboard sections render correctly

**Expected:** Page load time ~400-500ms (was ~1900ms)

---

**Response Parity Checklist (REQUIRED - No Feature Flag):**

Since we're using fail-fast approach without a feature flag, manually verify these before considering implementation complete:

| Check | Method | Expected | Actual | ✅/❌ |
|-------|--------|----------|--------|-------|
| **Response shape** | Copy API response, validate JSON structure | All top-level keys present | | |
| **user.handle** | Check header greeting | "@username" displayed | | |
| **user.clientName** | Check brand name | Brand name in header | | |
| **currentTier.name** | Check tier card | Tier name displayed | | |
| **currentTier.color** | Check tier card styling | Correct color applied | | |
| **nextTier** | Check "Unlock X" text | Next tier name or null if max | | |
| **tierProgress.progressPercentage** | Check progress bar | Correct % width | | |
| **tierProgress.currentFormatted** | Check progress text | "$X,XXX" or "X,XXX units" | | |
| **featuredMission.status** | Check mission card | Correct button state | | |
| **featuredMission.mission.displayName** | Check mission title | Mission name shown | | |
| **featuredMission.mission.rewardDisplayText** | Check reward button | "$50 Gift Card" etc. | | |
| **currentTierRewards[].displayText** | Check rewards list | All rewards have display text | | |
| **currentTierRewards[].name** | Check rewards list | Names preserved (not dropped) | | |
| **currentTierRewards[].description** | Check rewards list | Descriptions preserved | | |
| **totalRewardsCount** | Check "And more" logic | Correct count shown | | |
| **Performance** | Network tab timing | < 500ms (was ~1900ms) | | |

**Edge Cases to Test:**
- [ ] User at max tier (nextTier should be null)
- [ ] User with no eligible missions (featuredMission.status = 'no_missions')
- [ ] User with raffle mission available
- [ ] User with recently fulfilled mission (showCongratsModal = true)

---

**Step Checkpoint:**
- [ ] Dev server started ✅
- [ ] Page loads successfully ✅
- [ ] All dashboard sections render correctly ✅
- [ ] Response parity checklist completed ✅
- [ ] Edge cases tested ✅
- [ ] Response time improved ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `appcode/lib/repositories/dashboardRepository.ts`
**New Import:**
```typescript
import type { DashboardRPCResponse } from '@/types/dashboard-rpc';
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "dashboard-rpc" | head -5
```
**Expected:** No import errors

**File:** `appcode/lib/services/dashboardService.ts`
**New Import:**
```typescript
import type { DashboardRPCResponse } from '@/types/dashboard-rpc';
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | grep "DashboardRPCResponse" | head -5
```
**Expected:** No import errors

**Checklist:**
- [ ] Import paths correct
- [ ] Exported names match
- [ ] Types align

---

### Call Site Verification

**File:** `appcode/lib/services/dashboardService.ts`
**Call:**
```typescript
const rpcData = await dashboardRepository.getDashboardDataRPC(userId, clientId);
```

**Verification:**
- [ ] Arguments match function signature
- [ ] Return type handled correctly (`null` check present)
- [ ] Error handling in place

---

### Type Alignment Verification

**New Types Introduced:**
```typescript
DashboardRPCResponse // From dashboard-rpc.ts
```

**Verification:**
- [ ] Type exported correctly from `dashboard-rpc.ts`
- [ ] Type imported in repository and service
- [ ] No type conflicts with existing types

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `get_dashboard_data` PostgreSQL function

**Security Checklist (8 queries in RPC):**
- [ ] User query: `AND u.client_id = p_client_id` ✅
- [ ] Current tier: `AND client_id = p_client_id` ✅
- [ ] Next tier: `WHERE client_id = p_client_id` ✅
- [ ] Featured mission: `WHERE m.client_id = p_client_id` ✅
- [ ] Mission progress: `AND mp.client_id = p_client_id` ✅
- [ ] Raffle participations: `AND rp.client_id = p_client_id` ✅
- [ ] Recent fulfillment: `AND mp.client_id = p_client_id` ✅
- [ ] Tier rewards: `WHERE r.client_id = p_client_id` ✅

---

### Grep Verification (Explicit Check)

```bash
grep -n "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
```
**Expected:** client_id filter on 8+ lines
**Actual:** [document actual output]

---

### Security Definer Check

```bash
grep -n "SECURITY DEFINER\|REVOKE\|GRANT" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
```
**Expected:**
- `SECURITY DEFINER` present
- `SET search_path = public` present
- `REVOKE ... FROM PUBLIC` present
- `GRANT ... TO authenticated` present
- `GRANT ... TO service_role` present

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to DashboardRPCEnhancement.md acceptance criteria.**

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
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: Migration deployed and RPC function exists in database
**Test:** Call RPC function from Supabase
**Expected:** Function exists and returns JSON
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: New repository method calls RPC successfully
**Test:** Type check and grep for method
**Expected:** Method exists, types align
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: New service method transforms RPC response to DashboardResponse
**Test:** Type check transformation code
**Expected:** No type errors, transformation logic complete
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Service method replaced with RPC implementation
**Test:** Load page, verify RPC is called
**Expected:** Page loads using RPC path (check server logs or Network tab)
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Type checker passes
**Test:** `npx tsc --noEmit`
**Expected:** 0 errors
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: All tests pass
**Test:** `npm test`
**Expected:** Tests pass
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Build completes
**Test:** `npm run build`
**Expected:** Build succeeds
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 8: Manual verification completed
**Test:** Browser test at /home
**Expected:** Dashboard displays correctly
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 9: Page load time reduced to under 1 second
**Test:** Network tab timing
**Expected:** < 1000ms
**Actual:** [result]
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `lib/types/dashboard-rpc.ts`: ~75 lines added (new file)
- `lib/repositories/dashboardRepository.ts`: ~30 lines added
- `lib/services/dashboardService.ts`: ~150 lines added
- `supabase/migrations/20251217000000_get_dashboard_data.sql`: ~220 lines (new file)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Enhancement.md | Test Result |
|-----------|---------------------|-------------|
| 1 | Migration deployed | ✅ / ❌ |
| 2 | Repository method | ✅ / ❌ |
| 3 | Service transformation | ✅ / ❌ |
| 4 | RPC implementation | ✅ / ❌ |
| 5 | Type check | ✅ / ❌ |
| 6 | Tests pass | ✅ / ❌ |
| 7 | Build succeeds | ✅ / ❌ |
| 8 | Manual verification | ✅ / ❌ |
| 9 | Performance target | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-17
**Executor:** Claude Opus 4.5
**Specification Source:** DashboardRPCEnhancement.md v1.6
**Implementation Doc:** DashboardRPCEnhancementIMPL.md
**Enhancement ID:** ENH-001

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - [PASS/FAIL]
[Timestamp] Gate 6: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create types file - Created ✅ - Verified ✅
[Timestamp] Step 2: Add repository method - Modified ✅ - Verified ✅
[Timestamp] Step 3: Add service method - Modified ✅ - Verified ✅
[Timestamp] Step 4: Create migration file - Created ✅ - Verified ✅
[Timestamp] Step 5: Deploy migration - Deployed ✅ - Verified ✅
[Timestamp] Step 6: Test implementation - Tested ✅ - Verified ✅
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check (8 queries) - [PASS/FAIL]
[Timestamp] client_id grep verification - [PASS/FAIL]
[Timestamp] SECURITY DEFINER check - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Build succeeds ✅
[Timestamp] Type check passes ✅
[Timestamp] Criterion 1-9: [results]
[Timestamp] Git diff sanity ✅
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `appcode/lib/types/dashboard-rpc.ts` - CREATE - ~75 lines - RPC response type
2. `appcode/lib/repositories/dashboardRepository.ts` - MODIFY - ~30 lines - RPC method
3. `appcode/lib/services/dashboardService.ts` - MODIFY - ~150 lines - Transformation
4. `/home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql` - CREATE - ~220 lines - SQL function

**Total:** 4 files, ~475 lines added

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files created/changed
git diff --stat
# Should show: 4 files

# 2. Verify no type errors
npx tsc --noEmit 2>&1 | grep "error" | wc -l
# Should show: 0

# 3. Verify multi-tenant filters in SQL
grep -c "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql
# Should show: 8+

# 4. Verify security settings
grep -E "SECURITY DEFINER|search_path|REVOKE|GRANT" /home/jorge/Loyalty/Rumi/supabase/migrations/20251217000000_get_dashboard_data.sql

# 5. Verify RPC method exists
grep -n "getDashboardDataRPC" appcode/lib/repositories/dashboardRepository.ts

# 6. Verify transformation method exists
grep -n "getDashboardOverviewRPC" appcode/lib/services/dashboardService.ts
```

---

## Document Status

**Implementation Date:** 2025-12-17
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅
- [ ] Types aligned ✅

**Security:**
- [ ] Multi-tenant isolation verified (8 queries) ✅
- [ ] client_id filters confirmed via grep ✅
- [ ] SECURITY DEFINER properly configured ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update DashboardRPCEnhancement.md status to "Implemented"

**Git Commit Message Template:**
```
perf: Add RPC function for dashboard data retrieval

Implements ENH-001: Single PostgreSQL RPC function for dashboard data
Reduces page load time from ~1.9s to ~400ms (~75% improvement)

New files:
- lib/types/dashboard-rpc.ts: RPC response type
- supabase/migrations/20251217000000_get_dashboard_data.sql: PostgreSQL function

Modified files:
- lib/repositories/dashboardRepository.ts: Add getDashboardDataRPC method
- lib/services/dashboardService.ts: Add getDashboardOverviewRPC with transformation

References:
- DashboardRPCEnhancement.md v1.6
- DashboardRPCEnhancementIMPL.md

🤖 Generated with Claude Code
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
- [ ] Read SchemaFinalv2.md for database queries
- [ ] Read API_CONTRACTS.md for API changes
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (all 6 rounds)
- [ ] Did not second-guess specification

### Security Verification
- [ ] Verified multi-tenant isolation (8 client_id filters)
- [ ] Used grep to confirm client_id presence
- [ ] Verified SECURITY DEFINER configuration
- [ ] No cross-tenant data exposure

### Acceptance Criteria
- [ ] EVERY criterion from Enhancement.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL
- [ ] No criteria skipped or assumed

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED ✅

**RED FLAGS exhibited:** [ ] None ✅

---

**Document Version:** 1.3
**Created:** 2025-12-17
**Status:** READY FOR EXECUTION
**Audit Response (v1.1):**
- Fixed rewards transformation to preserve ALL fields (name, description, rewardSource, redemptionQuantity, displayOrder)
- Fixed migration path from `appcode/supabase/migrations/` to `/home/jorge/Loyalty/Rumi/supabase/migrations/`
- Fixed Gate 6 API_CONTRACTS.md path from `repodocs/` to repo root
- Added PARITY comments for supportEmail (matches legacy line 372)
- Added parity notes for mission formatting helpers referencing legacy lines 412-445
**Audit Response (v1.2):**
- Removed feature flag (USE_RPC_DASHBOARD) - fail fast approach for pre-production
- Removed dual-path rollout strategy - direct replacement of getDashboardOverview()
- Simplified Step 6 from "Enable Feature Flag" to "Test Implementation"
- Updated all acceptance criteria and verification sections
**Audit Response (v1.3):**
- Added Response Parity Checklist to Step 6 (16 fields to verify)
- Added Edge Cases to Test section (4 scenarios)
- Clarified supportEmail has parity (both legacy and RPC use hardcoded value)

**NOTE on supportEmail (for auditors):**
Legacy implementation at `dashboardService.ts:372` uses `const supportEmail = 'support@example.com';`
This is NOT sourced from client settings - it's hardcoded in the current production code.
The RPC implementation uses the same hardcoded value. There is NO UX drift.
