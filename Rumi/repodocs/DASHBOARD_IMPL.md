# Dashboard - Implementation Guide

**Purpose:** Home/Dashboard page APIs - user info, tier progress, featured mission, rewards
**Phase:** Phase 4 - Dashboard APIs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-03 (v1.3 - Phase 4 complete)

---

## Quick Reference

**Steps Documented:**
- Step 4.1 - Dashboard Repositories ✅
- Step 4.2 - Dashboard Services ✅
- Step 4.3 - Dashboard API Routes ✅
- Step 4.4 - Dashboard Testing ✅

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/app/api/dashboard/route.ts` | 114 | GET /api/dashboard endpoint |
| `appcode/app/api/dashboard/featured-mission/route.ts` | 131 | GET /api/dashboard/featured-mission endpoint |
| `appcode/lib/repositories/dashboardRepository.ts` | 293 | User, tier, rewards queries with tenant isolation |
| `appcode/lib/repositories/missionRepository.ts` | 326 | Mission queries with priority ordering |
| `appcode/lib/services/dashboardService.ts` | 513 | VIP metric formatting, congrats modal logic |
| `appcode/tests/integration/api/dashboard.test.ts` | 598 | 21 tests: auth, multi-tenant, congrats modal |

**Database Tables Used:**
- `users` (SchemaFinalv2.md:171-280) - checkpoint_sales_current, checkpoint_units_current, manual_adjustments
- `clients` (SchemaFinalv2.md:33-75) - vip_metric, checkpoint_months
- `tiers` (SchemaFinalv2.md:77-118) - tier_name, tier_color, sales_threshold, units_threshold
- `rewards` (SchemaFinalv2.md:378-442) - type, value_data, tier_eligibility
- `missions` (SchemaFinalv2.md:282-340) - mission_type, target_value, activated, raffle_end_date
- `mission_progress` (SchemaFinalv2.md:342-376) - current_value, status, completed_at
- `raffle_participations` (SchemaFinalv2.md:520-558) - user_id, mission_id

**Quick Navigation:**
- [API Endpoints](#api-endpoints) - Route handlers
- [Repository Layer](#repository-layer) - Database queries
- [Service Layer](#service-layer) - Business logic
- [Formatting Helpers](#formatting-helpers) - VIP metric display
- [Debugging](#debugging-checklist) - Common issues

---

## API Endpoints

### GET /api/dashboard

**Location:** `appcode/app/api/dashboard/route.ts:23-114`

**Purpose:** Returns unified dashboard data for home page (7 sections)

**Authentication:** Required (auth-token cookie via `supabase.auth.getUser()`)

**Call Chain:**
```
GET /api/dashboard [route.ts:23]
  ├─→ supabase.auth.getUser() [route.ts:26-27]
  ├─→ userRepository.findByAuthId() [route.ts:54]
  ├─→ getDashboardOverview(userId, clientId) [route.ts:82]
  │   ├─→ dashboardRepository.getUserDashboard()
  │   ├─→ getFeaturedMission()
  │   ├─→ dashboardRepository.getCurrentTierRewards()
  │   └─→ dashboardRepository.updateLastLoginAt() (if congrats shown)
  └─→ Response: DashboardResponse [route.ts:96]
```

**Error Responses:**
| HTTP | Code | Condition | Line |
|------|------|-----------|------|
| 401 | UNAUTHORIZED | No auth token | route.ts:29-37 |
| 401 | USER_NOT_FOUND | User not in users table | route.ts:56-63 |
| 403 | TENANT_MISMATCH | User client_id != CLIENT_ID | route.ts:66-76 |
| 500 | DASHBOARD_ERROR | Service returned null | route.ts:84-93 |
| 500 | INTERNAL_ERROR | Unexpected error | route.ts:99-107 |

**Response:** `DashboardResponse` (see [Response Types](#response-types))

---

### GET /api/dashboard/featured-mission

**Location:** `appcode/app/api/dashboard/featured-mission/route.ts:27-131`

**Purpose:** Returns featured mission for circular progress display

**Authentication:** Required (auth-token cookie via `supabase.auth.getUser()`)

**Call Chain:**
```
GET /api/dashboard/featured-mission [route.ts:27]
  ├─→ supabase.auth.getUser() [route.ts:30-31]
  ├─→ userRepository.findByAuthId() [route.ts:58]
  ├─→ dashboardRepository.getUserDashboard() [route.ts:80]
  ├─→ getFeaturedMission(...) [route.ts:91-101]
  │   ├─→ checkCongratsModal()
  │   └─→ missionRepository.findFeaturedMission()
  ├─→ dashboardRepository.updateLastLoginAt() [route.ts:105-107] (if congrats shown)
  └─→ Response: FeaturedMissionResponse [route.ts:112]
```

**Error Responses:**
| HTTP | Code | Condition | Line |
|------|------|-----------|------|
| 401 | UNAUTHORIZED | No auth token | route.ts:33-41 |
| 401 | USER_NOT_FOUND | User not in users table | route.ts:60-67 |
| 403 | TENANT_MISMATCH | User client_id != CLIENT_ID | route.ts:70-78 |
| 500 | USER_DATA_ERROR | getUserDashboard failed | route.ts:82-89 |
| 500 | INTERNAL_ERROR | Unexpected error | route.ts:116-124 |

**Response:** `FeaturedMissionResponse` (see [Response Types](#response-types))

**Note:** Returns 200 with `status='no_missions'` if no missions available (not 404)

---

## Repository Layer

### dashboardRepository

**Location:** `appcode/lib/repositories/dashboardRepository.ts`

#### getUserDashboard()

**Lines:** 97-191

**Purpose:** Get user dashboard data with tier info and checkpoint progress

**Multi-Tenant Filter:** ✅ Lines 127, 148, 159

**Query Implementation (lines 111-131):**
```typescript
// dashboardRepository.ts:111-131
const { data: user, error: userError } = await supabase
  .from('users')
  .select(`
    id,
    tiktok_handle,
    email,
    current_tier,
    checkpoint_sales_current,
    checkpoint_units_current,
    manual_adjustments_total,
    manual_adjustments_units,
    next_checkpoint_at,
    last_login_at,
    client_id,
    clients!inner (
      id,
      name,
      vip_metric,
      checkpoint_months,
      primary_color
    )
  `)
  .eq('id', userId)
  .eq('client_id', clientId) // Line 127: CRITICAL: Multitenancy enforcement
  .single();
```

**Current Tier Query (lines 143-149):**
```typescript
// dashboardRepository.ts:143-149
const { data: currentTier, error: tierError } = await supabase
  .from('tiers')
  .select('*')
  .eq('id', user.current_tier)
  .eq('client_id', clientId) // Line 148: CRITICAL: Multitenancy enforcement
  .single();
```

**Next Tier Query (lines 155-159):**
```typescript
// dashboardRepository.ts:155-159
const { data: nextTier } = await supabase
  .from('tiers')
  .select('*')
  .eq('client_id', clientId) // Line 159
  .eq('tier_order', currentTier.tier_order + 1)
  .single();
```

**Returns:** `UserDashboardData` with sections:
- `user`: id, handle, email
- `client`: id, name, vipMetric ('sales' | 'units'), checkpointMonths
- `currentTier`: id, name, color, order, checkpointExempt
- `nextTier`: id, name, color, salesThreshold, unitsThreshold (or null if highest)
- `checkpointData`: salesCurrent, unitsCurrent, manualAdjustmentsTotal, manualAdjustmentsUnits, nextCheckpointAt, lastLoginAt

---

#### getCurrentTierRewards()

**Lines:** 215-278

**Purpose:** Get top 4 VIP tier rewards for dashboard showcase + total count

**Multi-Tenant Filter:** ✅ Lines 234, 250

**Query Implementation (lines 225-244):**
```typescript
// dashboardRepository.ts:225-244
const { data: rewards, error: rewardsError } = await supabase
  .from('rewards')
  .select(`
    id,
    type,
    name,
    description,
    value_data,
    reward_source,
    redemption_quantity,
    display_order
  `)
  .eq('client_id', clientId) // Line 234: CRITICAL: Multitenancy enforcement
  .eq('tier_eligibility', currentTierId)
  .eq('enabled', true)
  .eq('reward_source', 'vip_tier') // Only VIP tier rewards, not mission rewards
  .order('display_order', { ascending: true })
  .limit(4);
```

**Count Query (lines 247-253):**
```typescript
// dashboardRepository.ts:247-253
const { count, error: countError } = await supabase
  .from('rewards')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', clientId) // Line 250
  .eq('tier_eligibility', currentTierId)
  .eq('enabled', true)
  .eq('reward_source', 'vip_tier');
```

**Returns:** `CurrentTierRewardsResult`
- `rewards`: Array of DashboardReward (max 4)
- `totalCount`: Total rewards in tier (for "And more!" logic)

---

#### updateLastLoginAt()

**Lines:** 280-293

**Purpose:** Update user's last_login_at AFTER checking congrats modal (prevents re-showing)

**Multi-Tenant Filter:** ✅ Line 287

**Query Implementation (lines 283-291):**
```typescript
// dashboardRepository.ts:283-291
const { error } = await supabase
  .from('users')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', userId)
  .eq('client_id', clientId); // Line 287: CRITICAL: Multitenancy enforcement
```

---

### missionRepository

**Location:** `appcode/lib/repositories/missionRepository.ts`

#### Mission Priority Constants

**Lines:** 21-28
```typescript
// missionRepository.ts:21-28
const MISSION_PRIORITY: Record<string, number> = {
  raffle: 0,
  sales_dollars: 1,
  sales_units: 2,
  videos: 3,
  likes: 4,
  views: 5,
};
```

---

#### findFeaturedMission()

**Lines:** 239-406

**Purpose:** Find highest-priority featured mission for circular progress display

**Multi-Tenant Filter:** ✅ Lines 283, 302

**Query Implementation (lines 249-286):**
```typescript
// missionRepository.ts:249-286
const { data: missions, error: missionsError } = await supabase
  .from('missions')
  .select(`
    id,
    mission_type,
    display_name,
    title,
    description,
    target_value,
    target_unit,
    raffle_end_date,
    activated,
    tier_eligibility,
    reward_id,
    rewards!inner (
      id, type, name, description, value_data
    ),
    tiers!inner (
      id, tier_name, tier_color
    ),
    mission_progress (
      id, current_value, status, completed_at, user_id
    )
  `)
  .eq('client_id', clientId) // Line 283: CRITICAL: Multitenancy enforcement
  .eq('tier_eligibility', currentTierId)
  .eq('enabled', true)
  .in('mission_type', ['raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views']);
```

**Raffle Participations Query (lines 298-302):**
```typescript
// missionRepository.ts:298-302
const { data: raffleParticipations } = await supabase
  .from('raffle_participations')
  .select('mission_id')
  .eq('user_id', userId)
  .eq('client_id', clientId); // Line 302
```

**Priority Filtering Logic (lines 309-357):**
```typescript
// missionRepository.ts:309-357
const eligibleMissions = missions
  .filter((mission) => {
    const userProgress = (mission.mission_progress as MissionProgressRow[])
      ?.find((p) => p.user_id === userId);

    // Exclude claimed missions (they appear on Missions page, not Home)
    // Per API_CONTRACTS.md lines 1959, 1981-1984
    if (userProgress?.status === 'claimed') {
      return false;
    }

    // For raffle missions, check additional conditions
    if (mission.mission_type === 'raffle') {
      // Only show if activated=true (surprise feature)
      // Per API_CONTRACTS.md lines 1954-1955
      if (!mission.activated) {
        return false;
      }
      // Exclude if user already participated
      // Per API_CONTRACTS.md lines 1954-1958
      if (participatedRaffleIds.has(mission.id)) {
        return false;
      }
    }

    // Only show active or completed (not yet claimed)
    // Per API_CONTRACTS.md line 1959
    if (userProgress && !['active', 'completed'].includes(userProgress.status ?? '')) {
      return false;
    }

    return true;
  })
  .sort((a, b) => {
    const priorityA = MISSION_PRIORITY[a.mission_type] ?? 999;
    const priorityB = MISSION_PRIORITY[b.mission_type] ?? 999;

    // For sales type, prefer the one matching vipMetric
    if (priorityA === priorityB) {
      if (a.mission_type === 'sales_dollars' && vipMetric === 'sales') return -1;
      if (b.mission_type === 'sales_dollars' && vipMetric === 'sales') return 1;
      if (a.mission_type === 'sales_units' && vipMetric === 'units') return -1;
      if (b.mission_type === 'sales_units' && vipMetric === 'units') return 1;
    }

    return priorityA - priorityB;
  });
```

**Returns:** `FeaturedMissionData | null`
- `mission`: id, type, displayName, targetValue, raffleEndDate, activated
- `progress`: id, currentValue, status, completedAt (or null if no progress)
- `reward`: id, type, name, description, valueData
- `tier`: id, name, color

---

#### findRecentFulfillment()

**Lines:** 414-471

**Purpose:** Check for recently fulfilled missions (for congrats modal)

**Multi-Tenant Filter:** ✅ Line 446

**Query Implementation (lines 428-450):**
```typescript
// missionRepository.ts:428-450
const { data: fulfillments, error } = await supabase
  .from('mission_progress')
  .select(`
    id,
    mission_id,
    completed_at,
    missions!inner (
      id,
      mission_type,
      rewards!inner (
        id, type, name, value_data
      )
    )
  `)
  .eq('user_id', userId)
  .eq('client_id', clientId) // Line 446: CRITICAL: Multitenancy enforcement
  .eq('status', 'fulfilled')
  .gt('completed_at', lastLoginAt)
  .order('completed_at', { ascending: false })
  .limit(1);
```

**Returns:** `CongratsModalData | null`
- `missionId`, `fulfilledAt`, `rewardType`, `rewardName`, `rewardAmount`

---

## Service Layer

### dashboardService

**Location:** `appcode/lib/services/dashboardService.ts`

#### Display Name Mapping

**Lines:** 22-29
```typescript
// dashboardService.ts:22-29
const MISSION_DISPLAY_NAMES: Record<string, string> = {
  sales_dollars: 'Sales Sprint',
  sales_units: 'Sales Sprint',
  likes: 'Fan Favorite',
  views: 'Road to Viral',
  videos: 'Lights, Camera, Go!',
  raffle: 'VIP Raffle',
};
```

---

#### getDashboardOverview()

**Lines:** 234-320

**Purpose:** Aggregate all 5 dashboard sections with VIP metric-aware formatting

**Call Chain:**
```
getDashboardOverview(userId, clientId) [dashboardService.ts:234]
  ├─→ dashboardRepository.getUserDashboard() [dashboardRepository.ts:97]
  ├─→ getFeaturedMission() [dashboardService.ts:350]
  │   ├─→ checkCongratsModal() [dashboardService.ts:488]
  │   │   └─→ missionRepository.findRecentFulfillment() [missionRepository.ts:414]
  │   └─→ missionRepository.findFeaturedMission() [missionRepository.ts:239]
  ├─→ dashboardRepository.getCurrentTierRewards() [dashboardRepository.ts:215]
  ├─→ Calculate tier progress [dashboardService.ts:259-271]
  ├─→ Format rewards with displayText [dashboardService.ts:273-285]
  ├─→ dashboardRepository.updateLastLoginAt() [dashboardRepository.ts:280] (if congrats shown)
  └─→ Return DashboardResponse
```

**Tier Progress Calculation (lines 259-271):**
```typescript
// dashboardService.ts:259-271
const vipMetric = dashboardData.client.vipMetric;
const currentValue = vipMetric === 'sales'
  ? dashboardData.checkpointData.salesCurrent + dashboardData.checkpointData.manualAdjustmentsTotal
  : dashboardData.checkpointData.unitsCurrent + dashboardData.checkpointData.manualAdjustmentsUnits;

const targetValue = dashboardData.nextTier
  ? (vipMetric === 'sales'
      ? dashboardData.nextTier.salesThreshold
      : dashboardData.nextTier.unitsThreshold)
  : currentValue; // Already at max tier

const progressPercentage = targetValue > 0
  ? Math.min(Math.round((currentValue / targetValue) * 100), 100)
  : 100;
```

---

#### getFeaturedMission()

**Lines:** 350-486

**Purpose:** Format mission with status, progress text, and congrats modal check

**Status Determination (lines 392-405):**
```typescript
// dashboardService.ts:392-405
let status: FeaturedMissionResponse['status'];
if (isRaffle) {
  status = 'raffle_available';
} else if (progress?.status === 'completed') {
  status = 'completed';
} else if (progress?.status === 'claimed') {
  status = 'claimed';
} else if (progress?.status === 'fulfilled') {
  status = 'fulfilled';
} else {
  status = 'active';
}
```

**Progress Text Formatting (lines 407-448):**
- Sales dollars: `"$350 of $500 sales"`
- Sales units: `"350 of 500 units"`
- Videos/likes/views: `"8 of 15 videos"`
- Raffle: `"Chance to win $500"` (no progress tracking)

---

#### checkCongratsModal()

**Lines:** 488-513

**Purpose:** Check if congrats modal should be shown (fulfilled_at > last_login_at)

```typescript
// dashboardService.ts:488-513
async function checkCongratsModal(
  userId: string,
  clientId: string,
  lastLoginAt: string | null
): Promise<{ showModal: boolean; message: string | null }> {
  const fulfillment = await missionRepository.findRecentFulfillment(
    userId,
    clientId,
    lastLoginAt
  );

  if (!fulfillment) {
    return { showModal: false, message: null };
  }

  // Generate congrats message based on reward type
  let message: string;
  if (fulfillment.rewardType === 'gift_card' && fulfillment.rewardAmount) {
    message = `Your $${fulfillment.rewardAmount} Gift Card has been delivered!`;
  } else if (fulfillment.rewardName) {
    message = `Your ${fulfillment.rewardName} has been delivered!`;
  } else {
    message = 'Your reward has been delivered!';
  }

  return { showModal: true, message };
}
```

---

## Formatting Helpers

**Location:** `appcode/lib/services/dashboardService.ts:118-186`

#### formatCurrency() (line 121)
```typescript
// dashboardService.ts:121-123
function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}
// Example: 4200 → "$4,200"
```

#### formatUnits() (line 128)
```typescript
// dashboardService.ts:128-130
function formatUnits(value: number): string {
  return `${value.toLocaleString()} units`;
}
// Example: 4200 → "4,200 units"
```

#### formatVipMetricValue() (line 136)
```typescript
// dashboardService.ts:136-138
function formatVipMetricValue(value: number, vipMetric: 'sales' | 'units'): string {
  return vipMetric === 'sales' ? formatCurrency(value) : formatUnits(value);
}
```

#### generateRewardDisplayText() (lines 152-180)
```typescript
// dashboardService.ts:152-180
function generateRewardDisplayText(reward: DashboardReward): string {
  const valueData = reward.valueData as Record<string, unknown> | null;

  switch (reward.type) {
    case 'gift_card':
      return `$${valueData?.amount ?? 0} Gift Card`;

    case 'commission_boost':
      return `+${valueData?.percent ?? 0}% Pay boost for ${valueData?.duration_days ?? 30} Days`;

    case 'spark_ads':
      return `+$${valueData?.amount ?? 0} Ads Boost`;

    case 'discount':
      return `+${valueData?.percent ?? 0}% Deal Boost for ${valueData?.duration_days ?? 30} Days`;

    case 'physical_gift':
      return `Win a ${reward.name ?? 'Prize'}`;

    case 'experience':
      return `Win a ${reward.name ?? 'Experience'}`;

    default:
      return reward.name ?? 'Reward';
  }
}
```

---

## Response Types

**Location:** `appcode/lib/services/dashboardService.ts`

### DashboardResponse (lines 45-80)
```typescript
export interface DashboardResponse {
  user: { id: string; handle: string; email: string | null; clientName: string };
  client: { id: string; vipMetric: 'sales' | 'units'; vipMetricLabel: string };
  currentTier: { id: string; name: string; color: string; order: number; checkpointExempt: boolean };
  nextTier: { id: string; name: string; color: string; minSalesThreshold: number } | null;
  tierProgress: {
    currentValue: number;
    targetValue: number;
    progressPercentage: number;
    currentFormatted: string;
    targetFormatted: string;
    checkpointExpiresAt: string | null;
    checkpointExpiresFormatted: string;
    checkpointMonths: number;
  };
  featuredMission: FeaturedMissionResponse;
  currentTierRewards: FormattedReward[];
  totalRewardsCount: number;
}
```

### FeaturedMissionResponse (lines 82-114)
```typescript
export interface FeaturedMissionResponse {
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available';
  mission: {
    id: string;
    type: string;
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
    rewardType: string;
    rewardAmount: number | null;
    rewardCustomText: string | null;
    unitText: string;
  } | null;
  tier: { name: string; color: string };
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}
```

---

## Multi-Tenant Verification

**All queries MUST include client_id filter:**

| Function | File:Line | Filter Present |
|----------|-----------|----------------|
| getUserDashboard (user) | dashboardRepository.ts:127 | ✅ `.eq('client_id', clientId)` |
| getUserDashboard (current tier) | dashboardRepository.ts:148 | ✅ `.eq('client_id', clientId)` |
| getUserDashboard (next tier) | dashboardRepository.ts:159 | ✅ `.eq('client_id', clientId)` |
| getCurrentTierRewards | dashboardRepository.ts:234 | ✅ `.eq('client_id', clientId)` |
| getCurrentTierRewards (count) | dashboardRepository.ts:250 | ✅ `.eq('client_id', clientId)` |
| updateLastLoginAt | dashboardRepository.ts:287 | ✅ `.eq('client_id', clientId)` |
| findFeaturedMission (missions) | missionRepository.ts:283 | ✅ `.eq('client_id', clientId)` |
| findFeaturedMission (raffle) | missionRepository.ts:302 | ✅ `.eq('client_id', clientId)` |
| findRecentFulfillment | missionRepository.ts:446 | ✅ `.eq('client_id', clientId)` |

---

## Debugging Checklist

### Dashboard Returns Empty/Null

1. **Check user exists with correct client_id:**
```sql
SELECT id, client_id, current_tier FROM users WHERE id = 'user-uuid';
```

2. **Verify tier exists for user's current_tier:**
```sql
SELECT * FROM tiers WHERE id = 'tier-uuid' AND client_id = 'client-uuid';
```

3. **Check dashboardRepository.getUserDashboard() returns data:**
- Verify `.eq('client_id', clientId)` matches user's client (line 127)

### Featured Mission Returns No Missions

1. **Check missions exist for user's tier:**
```sql
SELECT * FROM missions
WHERE client_id = 'client-uuid'
AND tier_eligibility = 'tier-uuid'
AND enabled = true;
```

2. **Check if all missions are claimed:**
```sql
SELECT mp.status, m.display_name
FROM mission_progress mp
JOIN missions m ON m.id = mp.mission_id
WHERE mp.user_id = 'user-uuid';
```

3. **For raffle missions, check activated flag:**
```sql
SELECT id, activated FROM missions WHERE mission_type = 'raffle' AND client_id = 'client-uuid';
```

4. **Check raffle participation:**
```sql
SELECT * FROM raffle_participations WHERE user_id = 'user-uuid' AND client_id = 'client-uuid';
```

### Congrats Modal Not Showing

1. **Check fulfilled missions after last login:**
```sql
SELECT mp.completed_at, u.last_login_at
FROM mission_progress mp
JOIN users u ON u.id = mp.user_id
WHERE mp.user_id = 'user-uuid' AND mp.status = 'fulfilled';
-- completed_at MUST be > last_login_at
```

2. **Verify updateLastLoginAt is called AFTER checking modal:**
- dashboardService.ts:287-291

### VIP Metric Formatting Wrong

1. **Check client's vip_metric setting:**
```sql
SELECT vip_metric FROM clients WHERE id = 'client-uuid';
-- Should be 'sales' or 'units'
```

2. **Verify formatVipMetricValue() called with correct vipMetric:**
- dashboardService.ts:136-138

---

## Related Documentation

- **EXECUTION_PLAN.md:** Phase 4 Tasks (lines 765-848)
- **API_CONTRACTS.md:** GET /api/dashboard (lines 2063-2948), GET /api/dashboard/featured-mission (lines 1775-2060)
- **SchemaFinalv2.md:** users (171-280), missions (282-340), tiers (77-118), rewards (378-442)
- **ARCHITECTURE.md:** Multi-Tenant Pattern (Section 9, lines 1104-1137)

---

**Document Version:** 1.2
**Steps Completed:** 3 / 4 (Step 4.1, 4.2, 4.3)
**Last Updated:** 2025-12-03
**Completeness:** Repositories ✅ | Services ✅ | Routes ✅ | Tests 📋
