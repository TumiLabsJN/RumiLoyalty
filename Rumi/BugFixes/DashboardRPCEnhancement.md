# Dashboard RPC Function - Enhancement Documentation

**ID:** ENH-001
**Type:** Enhancement
**Created:** 2025-12-17
**Status:** Implementation Ready
**Priority:** High
**Related Tasks:** Performance optimization following PageLoadRefactor.md
**Linked Issues:** None

---

## Priority Definitions

| Level | Definition | Timeline |
|-------|------------|----------|
| **Critical** | Blocks core functionality, no workaround | Immediate |
| **High** | Major feature incomplete, workaround is painful | This sprint |
| **Medium** | Feature degraded, acceptable workaround exists | Next sprint |
| **Low** | Nice-to-have, cosmetic improvement | Backlog |

---

## 1. Project Context

This is a Next.js 14 loyalty rewards platform using TypeScript and Supabase (PostgreSQL). The application provides VIP tier tracking, missions, rewards, and raffles for brand ambassadors. The dashboard (`/home` page) displays user tier progress, featured mission, and available rewards.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with multi-tenant isolation via `client_id`

---

## 2. Gap/Enhancement Summary

**What's missing:** A single PostgreSQL RPC function that returns all dashboard data in one database call.

**What currently exists:** The dashboard API makes 6-9 sequential/parallel database queries to gather user, tier, mission, and rewards data. Even after parallelization optimization, page load times are ~1.9 seconds.

**What should exist:** A `get_dashboard_data(p_user_id, p_client_id)` PostgreSQL function that executes all necessary JOINs in a single database round-trip, reducing latency to ~400ms.

**Why it matters:** Dashboard is the primary landing page after login. A 2-second load time creates poor user perception. Reducing to sub-1-second dramatically improves UX.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `appcode/lib/services/dashboardService.ts` | Lines 238-337 | Current `getDashboardOverview()` orchestrating multiple repository calls; `Promise.all()` parallelization; `getFeaturedMission()` logic with priority sorting |
| `appcode/lib/repositories/dashboardRepository.ts` | Lines 103-296 | `getUserDashboard()` with user+tiers parallel queries; `getCurrentTierRewards()` with rewards+count parallel queries |
| `appcode/lib/repositories/missionRepository.ts` | Lines 240-430 | `findFeaturedMission()` with missions+raffle parallel queries; priority filtering logic (raffle > sales > videos > likes > views) |
| `appcode/lib/repositories/missionRepository.ts` | Lines 509-526 | **Existing RPC pattern:** `supabase.rpc('get_available_missions', {...})` - proves RPC approach works |
| `SingleQueryBS.md` | Sections 1-4 | Documents RPC pattern rationale, Supabase JS client limitations, performance analysis (3x improvement) |
| `DATA_FLOWS.md` | /home (Dashboard) lines 22-100 | Full data flow diagram with 7 database tables accessed across multiple queries |
| `SchemaFinalv2.md` | §3 users (lines 171-280) | User table schema: `current_tier`, `checkpoint_sales_current`, `checkpoint_units_current`, `manual_adjustments_*`, `last_login_at` |
| `SchemaFinalv2.md` | §4 tiers (lines 77-118) | Tier table schema: `tier_id`, `tier_name`, `tier_color`, `tier_order`, `sales_threshold`, `units_threshold` |
| `SchemaFinalv2.md` | §6 missions (lines 282-340) | Mission table schema: `mission_type`, `display_name`, `target_value`, `tier_eligibility`, `activated` |
| `SchemaFinalv2.md` | §8 raffle_participations (lines 520-558) | Raffle participation schema: **includes `client_id`** - must be filtered for multi-tenancy |
| `SchemaFinalv2.md` | §7 rewards (lines 378-442) | Reward table schema: `type`, `value_data`, `tier_eligibility`, `reward_source` |
| `API_CONTRACTS.md` | GET /api/dashboard (lines 2063-2948) | Response contract: `DashboardResponse` interface with `vipMetricLabel`, `displayText`, `progressPercentage` computed fields |

### Key Evidence

**Evidence 1:** Existing RPC Pattern in Codebase
- Source: `missionRepository.ts`, lines 509-526
- Code: `const { data, error } = await supabase.rpc('get_available_missions', { p_user_id, p_client_id, p_current_tier })`
- Implication: RPC pattern already established and working in production

**Evidence 2:** Documented Performance Impact
- Source: `SingleQueryBS.md`, Section 3
- Quote: "Multi-Query (current): 5 round-trips, 60-120ms. Single Query (specified): 1 round-trip, 20-40ms. Difference: ~3x slower"
- Implication: Single RPC can reduce dashboard load time by ~60-70%

**Evidence 3:** Current Parallelized Query Count
- Source: Live testing session 2025-12-17
- Measurement: After all parallelization optimizations, dashboard still takes ~1.9 seconds
- Analysis: ~6 effective sequential query "layers" remain due to data dependencies
- Implication: Further optimization requires reducing round-trips, not just parallelizing

**Evidence 4:** Supabase RPC Capability
- Source: `SingleQueryBS.md`, Section 2, lines 70-78
- Quote: "The limitation is with the Supabase JS client query builder, NOT the database. Solution path: Write a PostgreSQL function, call it via `supabase.rpc('function_name', params)`"
- Implication: Technical path is proven and documented

---

## 4. Business Justification

**Business Need:** Reduce dashboard page load time from ~2 seconds to sub-1 second for better user experience.

**User Stories:**
1. As an ambassador, I need the dashboard to load quickly so I can check my progress without waiting
2. As a brand manager, I need fast page loads so ambassadors stay engaged with the platform

**Impact if NOT implemented:**
- Users perceive the app as "slow" despite correct functionality
- Higher bounce rates on dashboard page
- Competitive disadvantage against faster loyalty platforms
- Increased Supabase database load (more connections, more queries)

---

## 5. Current State Analysis

### What Currently Exists

**File:** `appcode/lib/services/dashboardService.ts`
```typescript
// appcode/lib/services/dashboardService.ts:238-263 (current parallelized implementation)
export async function getDashboardOverview(
  userId: string,
  clientId: string
): Promise<DashboardResponse | null> {
  // 1. Get user dashboard data - MUST complete first
  const dashboardData = await dashboardRepository.getUserDashboard(userId, clientId);
  if (!dashboardData) return null;

  // 2. Get featured mission AND current tier rewards IN PARALLEL
  const [featuredMission, rewardsResult] = await Promise.all([
    getFeaturedMission(
      userId, clientId, dashboardData.currentTier.id,
      dashboardData.client.vipMetric, dashboardData.currentTier,
      dashboardData.checkpointData.lastLoginAt
    ),
    dashboardRepository.getCurrentTierRewards(clientId, dashboardData.currentTier.id)
  ]);

  // ... tier progress calculation and response formatting
}
```

**Current Capability:**
- Dashboard loads correctly with all data
- Queries are parallelized where possible
- Multi-tenant isolation is enforced

**Current Limitation:**
- Still ~6 effective query layers due to data dependencies
- ~1.9 second load time (measured 2025-12-17)
- Cannot parallelize further without restructuring

### Current Data Flow

```
GET /api/dashboard
├── dashboardRepository.getUserDashboard()
│   └── Promise.all([usersQuery, tiersQuery]) = 1 layer
│
├── Promise.all (parallel after getUserDashboard):
│   │
│   ├── getFeaturedMission()
│   │   └── Promise.all([checkCongratsModal, findFeaturedMission])
│   │       ├── findRecentFulfillment() = 1 query
│   │       └── Promise.all([missionsQuery, raffleQuery]) = 1 layer
│   │           └── tierQuery (if needed) = 1 query
│   │
│   └── getCurrentTierRewards()
│       └── Promise.all([rewardsQuery, countQuery]) = 1 layer

Total: ~6 sequential "layers" of database calls
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Create a PostgreSQL function `get_dashboard_data()` that executes all JOINs in a single database call and returns a JSON object with all dashboard sections. Call via `supabase.rpc()` from the repository layer.

### New Code to Create

**New File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/YYYYMMDDHHMMSS_get_dashboard_data.sql`

```sql
-- SPECIFICATION - TO BE IMPLEMENTED
-- Migration: Create get_dashboard_data RPC function
-- Purpose: Single-query dashboard data retrieval for ~70% latency reduction

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

**Explanation:** This function executes all dashboard queries within a single database call using PL/pgSQL. The priority sorting for featured missions is done via CASE expression in ORDER BY. Multi-tenant isolation is enforced at every query with `client_id = p_client_id`.

### Response Transformation (Service Layer)

**CRITICAL:** The RPC returns raw database fields. The service layer MUST transform to match the existing `DashboardResponse` contract per `API_CONTRACTS.md`. Key transformations:

#### ⚠️ SNAKE_CASE → camelCase Renames (Contract Critical)

| RPC Field (snake_case) | DashboardResponse Field (camelCase) | Location |
|------------------------|-------------------------------------|----------|
| `featuredMission.reward_value_data` | `featuredMission.mission.rewardValueData` | Featured mission reward |
| `currentTierRewards[].value_data` | `currentTierRewards[].valueData` | Tier rewards array |

**Both of these MUST be renamed in the service layer or UI components will break.**

#### Status Semantics Note

The SQL uses `mp.status NOT IN ('claimed', 'fulfilled')` and `status = 'fulfilled'`. Per current codebase analysis, these values match the existing service logic. However, the schema (`SchemaFinalv2.md`) lists `active/dormant/completed` as enum values. **This is intentional alignment with current behavior** - if status enums change in the future, both the RPC and this documentation must be updated.

#### Full Transformation Table

| RPC Field | DashboardResponse Field | Transformation Required |
|-----------|------------------------|------------------------|
| `client.vipMetric` | `client.vipMetricLabel` | `vipMetric === 'sales' ? 'Total Sales' : 'Units Sold'` |
| `checkpointData.*` | `tierProgress.currentFormatted` | `formatVipMetricValue(value, vipMetric)` |
| `checkpointData.*` | `tierProgress.progressPercentage` | `Math.min(Math.round((current/target)*100), 100)` |
| `checkpointData.nextCheckpointAt` | `tierProgress.checkpointExpiresFormatted` | `new Date(val).toLocaleDateString('en-US', {...})` |
| `featuredMission.*` | `featuredMission.mission.progressPercentage` | `Math.round((current/target)*100)` |
| `featuredMission.*` | `featuredMission.mission.currentFormatted` | Format based on mission type |
| `featuredMission.rewardValueData` | `featuredMission.mission.rewardAmount` | `(rewardValueData?.amount as number) \|\| null` |
| `featuredMission.rewardValueData` | `featuredMission.mission.rewardDisplayText` | `generateRewardDisplayText({type, valueData: rewardValueData, name})` |
| `currentTierRewards[].value_data` | `currentTierRewards[].valueData` | Direct assign (already JSON, just rename key) |
| `currentTierRewards[].value_data` | `currentTierRewards[].displayText` | `generateRewardDisplayText(reward)` |
| `recentFulfillment` | `featuredMission.showCongratsModal` | `recentFulfillment !== null` |
| `recentFulfillment` | `featuredMission.congratsMessage` | Generate message from reward type/amount |

### Reward Field Transformation Details

**CRITICAL:** The RPC returns `value_data` (snake_case from DB), but `DashboardResponse` expects `valueData` (camelCase). Additionally, `displayText` must be computed.

**For `featuredMission.reward`:**
```typescript
// RPC returns:
featuredMission: {
  rewardValueData: { amount: 50, percent: null, duration_days: null }, // snake_case from DB
  rewardType: 'gift_card',
  rewardName: 'Amazon Gift Card'
}

// Transform to:
featuredMission: {
  mission: {
    rewardType: 'gift_card',
    rewardAmount: 50,  // extracted from rewardValueData.amount
    rewardDisplayText: '$50 Gift Card',  // from generateRewardDisplayText()
  }
}
```

**For `currentTierRewards[]`:**
```typescript
// RPC returns (snake_case):
currentTierRewards: [
  { id: '...', type: 'commission_boost', name: null, value_data: { percent: 10, duration_days: 30 }, ... }
]

// Transform to (camelCase + displayText) - MUST preserve ALL fields:
currentTierRewards: [
  {
    id: '...',
    type: 'commission_boost',
    name: null,                                        // Preserve
    description: 'Earn more on every sale',           // Preserve
    valueData: { percent: 10, duration_days: 30 },    // Renamed from value_data
    rewardSource: 'vip_tier',                         // Renamed from reward_source
    redemptionQuantity: 1,                            // Renamed from redemption_quantity
    displayOrder: 1,                                  // Renamed from display_order
    displayText: '+10% Pay boost for 30 Days'         // Computed via generateRewardDisplayText()
  }
]
```

**Transformation helper (reuse existing):**
```typescript
// appcode/lib/services/dashboardService.ts - generateRewardDisplayText() already exists
// CRITICAL: Must preserve ALL fields from current API contract
const formattedRewards = rpcData.currentTierRewards.map(r => ({
  id: r.id,
  type: r.type,
  name: r.name,                                    // Preserve
  description: r.description,                      // Preserve
  valueData: r.value_data,                         // Rename snake_case → camelCase
  rewardSource: r.reward_source,                   // Rename snake_case → camelCase
  redemptionQuantity: r.redemption_quantity,       // Rename snake_case → camelCase
  displayOrder: r.display_order,                   // Rename snake_case → camelCase
  displayText: generateRewardDisplayText({
    type: r.type,
    name: r.name,
    valueData: r.value_data as Record<string, unknown>
  })
}));
```

**Service method skeleton:**

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// lib/services/dashboardService.ts - getDashboardOverviewRPC()

export async function getDashboardOverviewRPC(
  userId: string,
  clientId: string
): Promise<DashboardResponse | null> {
  // 1. Call RPC
  const rpcData = await dashboardRepository.getDashboardDataRPC(userId, clientId);
  if (!rpcData) return null;

  // 2. Transform to DashboardResponse (reuse existing formatting helpers)
  const vipMetric = rpcData.client.vipMetric;
  const vipMetricLabel = vipMetric === 'sales' ? 'Total Sales' : 'Units Sold';

  // Calculate tier progress
  const currentValue = vipMetric === 'sales'
    ? rpcData.checkpointData.salesCurrent + rpcData.checkpointData.manualAdjustmentsTotal
    : rpcData.checkpointData.unitsCurrent + rpcData.checkpointData.manualAdjustmentsUnits;

  // ... (use existing formatVipMetricValue, generateRewardDisplayText, etc.)

  // 3. Return fully-formed DashboardResponse (identical to current implementation)
  return { user, client, currentTier, nextTier, tierProgress, featuredMission, currentTierRewards, totalRewardsCount };
}
```

**Key principle:** Consumers of `GET /api/dashboard` see NO CHANGE. All transformation logic is encapsulated in the service layer.

### Error/Null Handling (Route Layer)

**CRITICAL:** The route must preserve existing HTTP response behavior. The RPC returns `NULL` for various failure cases, but the route must map these to the correct HTTP status codes per `API_CONTRACTS.md`.

| Scenario | RPC Returns | Route Must Return | HTTP Status |
|----------|-------------|-------------------|-------------|
| No auth token | N/A (checked before RPC) | `{ error: 'UNAUTHORIZED' }` | 401 |
| User not in DB | `null` | `{ error: 'USER_NOT_FOUND' }` | 401 |
| Wrong client_id | `null` | `{ error: 'TENANT_MISMATCH' }` | 403 |
| RPC execution error | `null` or throws | `{ error: 'DASHBOARD_ERROR' }` | 500 |
| Success | `DashboardRPCResponse` | `DashboardResponse` | 200 |

**Route error handling pattern:**

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// app/api/dashboard/route.ts

export async function GET(request: Request) {
  // 1. Auth check (BEFORE RPC) - unchanged from current implementation
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // 2. Get user from DB (BEFORE RPC) - unchanged, needed for client_id validation
  const dbUser = await userRepository.findByAuthId(authUser.id);
  if (!dbUser) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 401 });
  }

  // 3. Tenant validation (BEFORE RPC) - unchanged
  if (dbUser.client_id !== CLIENT_ID) {
    return NextResponse.json({ error: 'TENANT_MISMATCH' }, { status: 403 });
  }

  // 4. Call RPC-based service (NEW)
  const dashboardData = await getDashboardOverviewRPC(dbUser.id, dbUser.client_id);

  // 5. Handle null response (same as current behavior)
  if (!dashboardData) {
    return NextResponse.json(
      { error: 'DASHBOARD_ERROR', message: 'Failed to load dashboard' },
      { status: 500 }
    );
  }

  // 6. Return success (same shape as current)
  return NextResponse.json(dashboardData);
}
```

**Key principle:** Auth and tenant checks happen BEFORE the RPC call, preserving the existing error response hierarchy. The RPC only runs for validated users.

### New Types/Interfaces

**File:** `lib/types/dashboard-rpc.ts`

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// Type for the raw RPC response before service-layer transformation

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
    rewardAmount: number | null;
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

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `/home/jorge/Loyalty/Rumi/supabase/migrations/YYYYMMDDHHMMSS_get_dashboard_data.sql` | CREATE | New migration with RPC function |
| `appcode/lib/types/dashboard-rpc.ts` | CREATE | New type for RPC response |
| `appcode/lib/repositories/dashboardRepository.ts` | MODIFY | Add `getDashboardDataRPC()` method |
| `appcode/lib/services/dashboardService.ts` | MODIFY | Add `getDashboardOverviewRPC()` that uses new repository method |
| `appcode/app/api/dashboard/route.ts` | MODIFY | Optionally switch to RPC-based service call |

### Dependency Graph

```
appcode/app/api/dashboard/route.ts
├── imports: dashboardService
└── calls: getDashboardOverviewRPC() (NEW)

appcode/lib/services/dashboardService.ts
├── imports: dashboardRepository
├── exports: getDashboardOverviewRPC (NEW)
└── calls: dashboardRepository.getDashboardDataRPC()

appcode/lib/repositories/dashboardRepository.ts
├── imports: supabase client, DashboardRPCResponse type
├── exports: getDashboardDataRPC (NEW)
└── calls: supabase.rpc('get_dashboard_data', params)

appcode/lib/types/dashboard-rpc.ts (NEW)
└── exports: DashboardRPCResponse interface
```

---

## 8. Data Flow After Implementation

```
GET /api/dashboard
    │
    ▼
dashboardService.getDashboardOverviewRPC(userId, clientId)
    │
    ▼
dashboardRepository.getDashboardDataRPC(userId, clientId)
    │
    ▼
supabase.rpc('get_dashboard_data', { p_user_id, p_client_id })
    │
    ▼
[Single PostgreSQL function execution]
    │
    ▼
JSON response with all dashboard sections
    │
    ▼
Service transforms to DashboardResponse
    │
    ▼
Route returns to client

Database round-trips: 1 (was 6-9)
Expected latency: ~400ms (was ~1900ms)
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | id, tiktok_handle, email, current_tier, checkpoint_*, manual_adjustments_*, next_checkpoint_at, last_login_at, client_id | User profile and progress |
| `clients` | id, name, vip_metric, checkpoint_months | Client configuration |
| `tiers` | tier_id, tier_name, tier_color, tier_order, sales_threshold, units_threshold, checkpoint_exempt | Current and next tier |
| `missions` | id, mission_type, display_name, target_value, raffle_end_date, activated, tier_eligibility, reward_id, enabled | Featured mission selection |
| `mission_progress` | id, user_id, client_id, mission_id, current_value, status, completed_at | User progress and fulfillment check |
| `rewards` | id, type, name, description, value_data, reward_source, redemption_quantity, display_order, tier_eligibility, enabled | Tier rewards list |
| `raffle_participations` | mission_id, user_id, **client_id** | Raffle exclusion filter (must filter by client_id) |

### Schema Changes Required?
- [x] Yes - New PostgreSQL function migration needed
- [ ] No - existing schema supports this feature

**Migration needed:** Create `get_dashboard_data()` function via Supabase migration

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| User query | Yes | [x] `AND u.client_id = p_client_id` |
| Current tier query | Yes | [x] `AND client_id = p_client_id` |
| Next tier query | Yes | [x] `WHERE client_id = p_client_id` |
| Featured mission query | Yes | [x] `WHERE m.client_id = p_client_id` |
| Mission progress JOIN | Yes | [x] `AND mp.client_id = p_client_id` |
| Raffle participations JOIN | Yes | [x] `AND rp.client_id = p_client_id` |
| Recent fulfillment query | Yes | [x] `AND mp.client_id = p_client_id` |
| Tier rewards query | Yes | [x] `WHERE r.client_id = p_client_id` |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `GET /api/dashboard` | MODIFY (internal) | Multiple repository calls | Single RPC call |

### Breaking Changes?
- [ ] Yes
- [x] No - additive changes only

**Note:** The API response shape (`DashboardResponse`) remains identical. Only the internal implementation changes.

---

## 11. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | ~10-50 per call | Yes |
| Query complexity | O(1) lookups + small sorts | Yes |
| Frequency | Per page load (~1000/day current) | Yes |

### Optimization Needed?
- [ ] Yes
- [x] No - Single query is the optimization

**Performance targets:**
- Current: ~1900ms (after parallelization)
- Target: ~400ms (single RPC)
- Improvement: ~75%

---

## 12. Alternative Solutions Considered

### Option A: Further Parallelization
- **Description:** Continue optimizing with more `Promise.all()` patterns
- **Pros:** No SQL changes, TypeScript-only
- **Cons:** Already maxed out - data dependencies prevent further parallelization
- **Verdict:** Rejected - Already implemented, hit ceiling at ~1.9s

### Option B: Direct Service Call (Skip HTTP)
- **Description:** Call `dashboardService.getDashboardOverview()` directly from Server Component instead of fetching `/api/dashboard`
- **Pros:** Eliminates HTTP layer overhead (~50ms)
- **Cons:** Still has same multi-query problem, breaks API abstraction
- **Verdict:** Rejected - Doesn't address core issue

### Option C: PostgreSQL RPC Function (Selected)
- **Description:** Single database function returns all data
- **Pros:**
  - Proven pattern (exists for missions/rewards)
  - ~75% latency reduction
  - Single database connection
  - All filtering happens in database (efficient)
- **Cons:**
  - SQL function is harder to debug than TypeScript
  - Migration required
  - Two code paths during transition
- **Verdict:** Selected - Best performance improvement with acceptable complexity

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| SQL function has bug | Medium | High | Comprehensive testing, keep old code path as fallback |
| Performance regression | Low | Medium | Benchmark before/after, A/B test |
| Multi-tenant leak | Low | Critical | All queries have explicit `client_id` filter (including `raffle_participations`), code review |
| Migration fails | Low | High | Test in staging first, rollback migration available |
| Type mismatch | Medium | Low | Strong TypeScript types for RPC response |
| Response contract drift | Medium | High | Integration test compares old vs new response; transformation table above |

### Dual-Path Rollout Strategy (Explicit Fallback)

**Phase 1: Deploy with Feature Flag**
```typescript
// lib/services/dashboardService.ts
const USE_RPC_DASHBOARD = process.env.USE_RPC_DASHBOARD === 'true';

export async function getDashboardOverview(userId: string, clientId: string) {
  if (USE_RPC_DASHBOARD) {
    return getDashboardOverviewRPC(userId, clientId);  // New path
  }
  return getDashboardOverviewLegacy(userId, clientId);  // Old path (renamed)
}
```

**Phase 2: Gradual Rollout**
1. Deploy with `USE_RPC_DASHBOARD=false` (old path active)
2. Enable for internal testing: `USE_RPC_DASHBOARD=true` on staging
3. Compare responses between old and new paths in integration tests
4. Enable in production after validation

**Phase 3: Cleanup (after 1-2 weeks stable)**
1. Remove feature flag
2. Remove `getDashboardOverviewLegacy()` function
3. Keep SQL migration (no rollback needed)

**Rollback procedure:** Set `USE_RPC_DASHBOARD=false` - instant rollback to old multi-query path with zero code changes.

---

## 14. Testing Strategy

### Unit Tests

**File:** `tests/unit/repositories/dashboardRepository.rpc.test.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('dashboardRepository.getDashboardDataRPC', () => {
  it('returns null for non-existent user', async () => {
    const result = await dashboardRepository.getDashboardDataRPC('non-existent-id', clientId);
    expect(result).toBeNull();
  });

  it('returns complete dashboard data for valid user', async () => {
    const result = await dashboardRepository.getDashboardDataRPC(testUserId, clientId);
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('currentTier');
    expect(result).toHaveProperty('currentTierRewards');
  });

  it('enforces multi-tenant isolation', async () => {
    const result = await dashboardRepository.getDashboardDataRPC(testUserId, 'wrong-client-id');
    expect(result).toBeNull();
  });
});
```

### Integration Tests

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
describe('GET /api/dashboard (RPC)', () => {
  it('returns same response shape as current implementation', async () => {
    const [oldResponse, newResponse] = await Promise.all([
      getDashboardOverview(userId, clientId),
      getDashboardOverviewRPC(userId, clientId)
    ]);

    expect(newResponse.user.id).toBe(oldResponse.user.id);
    expect(newResponse.currentTier.name).toBe(oldResponse.currentTier.name);
    // ... more assertions
  });

  it('completes in under 500ms', async () => {
    const start = Date.now();
    await getDashboardOverviewRPC(userId, clientId);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

### Manual Verification Steps

1. [ ] Deploy migration to staging
2. [ ] Test with test users at each tier level
3. [ ] Verify featured mission priority ordering
4. [ ] Verify congrats modal shows for recently fulfilled missions
5. [ ] Verify multi-tenant isolation (user from client A can't see client B data)
6. [ ] Measure page load time in browser Network tab
7. [ ] Compare response shape with current implementation

### Response Parity Test (UI Bug Prevention)

**Purpose:** Guarantee the RPC path produces IDENTICAL output to the legacy path.

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// appcode/tests/integration/dashboard-parity.test.ts

import { getDashboardOverviewLegacy, getDashboardOverviewRPC } from '@/lib/services/dashboardService';
import { isDeepStrictEqual } from 'util';

describe('Dashboard Response Parity', () => {
  const testUsers = [
    { id: 'tier1-user-id', description: 'Tier 1 user with active mission' },
    { id: 'tier3-user-id', description: 'Tier 3 user at max tier (no nextTier)' },
    { id: 'raffle-user-id', description: 'User with raffle mission available' },
    { id: 'fulfilled-user-id', description: 'User with recent fulfillment (congrats modal)' },
    { id: 'no-missions-user-id', description: 'User with no eligible missions' },
  ];

  testUsers.forEach(({ id, description }) => {
    it(`produces identical response for: ${description}`, async () => {
      const [legacy, rpc] = await Promise.all([
        getDashboardOverviewLegacy(id, CLIENT_ID),
        getDashboardOverviewRPC(id, CLIENT_ID),
      ]);

      // Deep equality check - will fail on ANY difference
      expect(isDeepStrictEqual(legacy, rpc)).toBe(true);

      // If deep equality fails, log diff for debugging
      if (!isDeepStrictEqual(legacy, rpc)) {
        console.log('LEGACY:', JSON.stringify(legacy, null, 2));
        console.log('RPC:', JSON.stringify(rpc, null, 2));
      }
    });
  });

  it('handles null responses identically', async () => {
    const [legacy, rpc] = await Promise.all([
      getDashboardOverviewLegacy('non-existent-user', CLIENT_ID),
      getDashboardOverviewRPC('non-existent-user', CLIENT_ID),
    ]);
    expect(legacy).toBeNull();
    expect(rpc).toBeNull();
  });
});
```

**Run this test before enabling RPC in production.** Any field mismatch will cause test failure.

### Edge Case Matrix (UI Bug Prevention)

**Purpose:** Document exact behavior for edge cases that could break UI components.

| Edge Case | RPC Returns | Service Transforms To | UI Expects | Verified |
|-----------|-------------|----------------------|------------|----------|
| **No featured mission** | `featuredMission: null` | `featuredMission: { status: 'no_missions', mission: null, ... }` | Shows "No missions available" state | [ ] |
| **User at max tier** | `nextTier: null` | `nextTier: null`, `tierProgress.targetValue = currentValue` | Progress bar at 100%, no "Unlock X" text | [ ] |
| **No tier rewards** | `currentTierRewards: []` | `currentTierRewards: []`, `totalRewardsCount: 0` | Empty rewards card or hidden | [ ] |
| **No recent fulfillment** | `recentFulfillment: null` | `showCongratsModal: false`, `congratsMessage: null` | No modal shown | [ ] |
| **Raffle mission (no progress)** | `currentValue: 0`, `progressStatus: null` | `progressPercentage: 0`, `status: 'raffle_available'` | Shows "Enter Raffle" button | [ ] |
| **Completed non-raffle mission** | `progressStatus: 'completed'` | `status: 'completed'` | Shows "Claim Reward" button | [ ] |
| **Tier with checkpointExempt=true** | `checkpointExempt: true` | `checkpointExempt: true` | Hides checkpoint expiration text | [ ] |
| **Missing reward name** | `rewardName: null` | `displayText` uses type-based fallback | Shows "$50 Gift Card" not "null Gift Card" | [ ] |
| **Zero reward amount** | `rewardAmount: 0` | `rewardAmount: 0` or uses custom text | Shows custom text if available | [ ] |

**Test each edge case manually in staging before production rollout.**

### Field-by-Field Checklist (UI Bug Prevention)

**Purpose:** Trace every `DashboardResponse` field to its RPC source to ensure nothing is missed.

#### `user` object
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `user.id` | `rpcData.user.id` | Direct | N/A (internal) |
| `user.handle` | `rpcData.user.handle` | Direct | Header: "Hi, @handle" |
| `user.email` | `rpcData.user.email` | Direct | N/A (not displayed) |
| `user.clientName` | `rpcData.user.clientName` | Direct | Header: "ClientName Rewards" |

#### `client` object
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `client.id` | `rpcData.client.id` | Direct | N/A (internal) |
| `client.vipMetric` | `rpcData.client.vipMetric` | Direct | Determines progress formatting |
| `client.vipMetricLabel` | `rpcData.client.vipMetric` | `vipMetric === 'sales' ? 'Total Sales' : 'Units Sold'` | Tier progress card label |

#### `currentTier` object
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `currentTier.id` | `rpcData.currentTier.id` | Direct | N/A (internal) |
| `currentTier.name` | `rpcData.currentTier.name` | Direct | "Gold Level Rewards" |
| `currentTier.color` | `rpcData.currentTier.color` | Direct | Progress circle stroke color |
| `currentTier.order` | `rpcData.currentTier.order` | Direct | N/A (internal) |
| `currentTier.checkpointExempt` | `rpcData.currentTier.checkpointExempt` | Direct | Hide/show checkpoint expiration |

#### `nextTier` object (nullable)
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `nextTier` | `rpcData.nextTier` | Direct (null if max tier) | "Unlock Platinum" or hidden |
| `nextTier.id` | `rpcData.nextTier.id` | Direct | N/A (internal) |
| `nextTier.name` | `rpcData.nextTier.name` | Direct | "Unlock {name}" header |
| `nextTier.color` | `rpcData.nextTier.color` | Direct | Glow effect on tier card |
| `nextTier.salesThreshold` / `unitsThreshold` | `rpcData.nextTier.*` | Direct | Target value for progress |

#### `tierProgress` object
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `tierProgress.currentValue` | `checkpointData.salesCurrent + manualAdjustmentsTotal` (or units) | Computed | Internal for percentage |
| `tierProgress.targetValue` | `nextTier.salesThreshold` (or units, or currentValue if max) | Computed | Internal for percentage |
| `tierProgress.progressPercentage` | Computed from above | `Math.min(Math.round((c/t)*100), 100)` | Progress bar width |
| `tierProgress.currentFormatted` | `tierProgress.currentValue` | `formatVipMetricValue()` | "$4,200" or "4,200 units" |
| `tierProgress.targetFormatted` | `tierProgress.targetValue` | `formatVipMetricValue()` | "$10,000" or "10,000 units" |
| `tierProgress.checkpointExpiresAt` | `checkpointData.nextCheckpointAt` | Direct | Internal for formatting |
| `tierProgress.checkpointExpiresFormatted` | `checkpointData.nextCheckpointAt` | `toLocaleDateString()` | "Expires on Mar 15" |
| `tierProgress.checkpointMonths` | `rpcData.client.checkpointMonths` | Direct | "renews every 4 months" |

#### `featuredMission` object
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `featuredMission.status` | `rpcData.featuredMission.*` | Computed from progressStatus, missionType | Button state (Claim/Enter/Active) |
| `featuredMission.mission.id` | `rpcData.featuredMission.missionId` | Direct | API calls |
| `featuredMission.mission.type` | `rpcData.featuredMission.missionType` | Direct | Progress formatting |
| `featuredMission.mission.displayName` | `rpcData.featuredMission.displayName` | Direct | N/A (use computed) |
| `featuredMission.mission.progressPercentage` | Computed | `Math.round((current/target)*100)` | Circular progress |
| `featuredMission.mission.currentFormatted` | `rpcData.featuredMission.currentValue` | Format by type | "$350" or "8 videos" |
| `featuredMission.mission.targetText` | `rpcData.featuredMission.targetValue/Unit` | Format by type | "of $500 sales" |
| `featuredMission.mission.rewardType` | `rpcData.featuredMission.rewardType` | Direct | Icon selection |
| `featuredMission.mission.rewardAmount` | `rpcData.featuredMission.rewardValueData?.amount` | Extract | Internal |
| `featuredMission.mission.rewardDisplayText` | `rpcData.featuredMission.*` | `generateRewardDisplayText()` | "$50 Gift Card" button |
| `featuredMission.tier.name` | `rpcData.featuredMission.tierName` | Direct | N/A |
| `featuredMission.tier.color` | `rpcData.featuredMission.tierColor` | Direct | N/A |
| `featuredMission.showCongratsModal` | `rpcData.recentFulfillment` | `!== null` | Modal visibility |
| `featuredMission.congratsMessage` | `rpcData.recentFulfillment.*` | Generate from type/amount | Modal text |

#### `currentTierRewards` array
| Field | RPC Source | Transform | UI Component |
|-------|------------|-----------|--------------|
| `[].id` | `rpcData.currentTierRewards[].id` | Direct | N/A (internal) |
| `[].type` | `rpcData.currentTierRewards[].type` | Direct | Icon selection |
| `[].name` | `rpcData.currentTierRewards[].name` | Direct (preserve) | Reward title |
| `[].description` | `rpcData.currentTierRewards[].description` | Direct (preserve) | Reward description |
| `[].valueData` | `rpcData.currentTierRewards[].value_data` | **Rename snake→camel** | Internal for displayText |
| `[].rewardSource` | `rpcData.currentTierRewards[].reward_source` | **Rename snake→camel** | N/A (internal) |
| `[].redemptionQuantity` | `rpcData.currentTierRewards[].redemption_quantity` | **Rename snake→camel** | "Use X times" |
| `[].displayOrder` | `rpcData.currentTierRewards[].display_order` | **Rename snake→camel** | N/A (sorting) |
| `[].displayText` | `rpcData.currentTierRewards[].value_data` | `generateRewardDisplayText()` | "+10% Pay boost for 30 Days" |
| `totalRewardsCount` | `rpcData.totalRewardsCount` | Direct | "And more!" logic |

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress
- [ ] Set up staging environment for testing

### Implementation Steps
- [ ] **Step 1:** Create migration file
  - File: `appcode/supabase/migrations/YYYYMMDDHHMMSS_get_dashboard_data.sql`
  - Action: CREATE
- [ ] **Step 2:** Create type definition
  - File: `appcode/lib/types/dashboard-rpc.ts`
  - Action: CREATE
- [ ] **Step 3:** Add repository method
  - File: `appcode/lib/repositories/dashboardRepository.ts`
  - Action: MODIFY - Add `getDashboardDataRPC()` method
- [ ] **Step 4:** Add service method
  - File: `appcode/lib/services/dashboardService.ts`
  - Action: MODIFY - Add `getDashboardOverviewRPC()` method
- [ ] **Step 5:** Deploy migration to staging
  - Action: Run `supabase db push` or apply via SQL Editor
- [ ] **Step 6:** Test RPC function directly
  - Action: Call `supabase.rpc('get_dashboard_data', {...})` and verify response
- [ ] **Step 7:** Update route to use new service method
  - File: `appcode/app/api/dashboard/route.ts`
  - Action: MODIFY - Switch to `getDashboardOverviewRPC()`

### Post-Implementation
- [ ] Run type checker (`npx tsc --noEmit`)
- [ ] Run tests
- [ ] Run build (`npm run build`)
- [ ] Manual verification (browser test)
- [ ] Measure performance improvement
- [ ] Update PageLoadRefactor.md Implementation Log

---

## 16. Definition of Done

- [ ] Migration deployed and RPC function exists in database
- [ ] New repository method calls RPC successfully
- [ ] New service method transforms RPC response to `DashboardResponse`
- [ ] Route uses new service method
- [ ] Type checker passes
- [ ] All tests pass (existing + new)
- [ ] Build completes
- [ ] Manual verification completed
- [ ] Page load time reduced to under 1 second
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `appcode/lib/services/dashboardService.ts` | Lines 238-337 | Current `getDashboardOverview()` implementation, formatting helpers |
| `appcode/lib/repositories/dashboardRepository.ts` | Lines 103-296 | Current query implementations |
| `appcode/lib/repositories/missionRepository.ts` | Lines 240-430, 505-526 | `findFeaturedMission()` logic, existing RPC pattern |
| `SingleQueryBS.md` | Sections 1-4 | RPC pattern precedent, performance analysis, Supabase limitations |
| `DATA_FLOWS.md` | /home (Dashboard) | Data flow diagram, tables used |
| `SchemaFinalv2.md` | §3-8 | Table schemas for users, tiers, missions, rewards, raffle_participations |
| `API_CONTRACTS.md` | GET /api/dashboard (lines 2063-2948) | Response contract, computed fields documentation |
| `PageLoadRefactor.md` | Entire document | Context for performance optimization effort |

---

**Document Version:** 1.7
**Last Updated:** 2025-12-17
**Author:** Claude Code
**Status:** Implementation Ready
**Audit Response:**
- v1.1: Fixed raffle_participations client_id, search_path, source citations
- v1.2: Added Error/Null Handling section with HTTP status preservation
- v1.3: Fixed mission_progress client_id, added REVOKE FROM PUBLIC, null tier guard, safe reward_amount cast
- v1.4: Fixed all file paths to use `appcode/` prefix, added detailed reward field transformation (value_data → valueData + displayText)
- v1.5: Added UI Bug Prevention sections: Response Parity Test, Edge Case Matrix, Field-by-Field Checklist
- v1.6: Fixed remaining path in "Current State", added prominent snake_case→camelCase table, added Status Semantics Note
- v1.7: Fixed migration path to `/home/jorge/Loyalty/Rumi/supabase/migrations/`, added all reward fields to transformation (name, description, rewardSource, redemptionQuantity, displayOrder)

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap or Enhancement (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
