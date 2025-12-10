# Tiers System - Implementation Guide

**Purpose:** Returns tier progression data for the Tiers page including user progress, next tier targets, VIP system settings, and tier cards with aggregated rewards
**Phase:** Phase 7 - Tiers APIs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-09

---

## Quick Reference

**Steps Documented:**
- Step 7.1 - Schema Context ✅ (uses existing tables)
- Step 7.2 - Tiers API Implementation ✅

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/lib/repositories/tierRepository.ts` | 323 | Database queries with tenant isolation |
| `appcode/lib/services/tierService.ts` | 555 | Business logic, formatting, aggregation |
| `appcode/app/api/tiers/route.ts` | 93 | GET /api/tiers endpoint |

**Database Tables Used:**
- `tiers` (SchemaFinalv2.md:254-272)
- `users` (SchemaFinalv2.md:123-155)
- `clients` (SchemaFinalv2.md:106-120)
- `rewards` (SchemaFinalv2.md:462-590)
- `missions` (SchemaFinalv2.md:362-421)

**Quick Navigation:**
- [API Endpoints](#api-endpoints)
- [Core Functions](#core-functions)
- [Database Queries](#database-queries)
- [Error Handling](#error-handling)
- [Debugging](#debugging-checklist)

---

## API Endpoints

### GET /api/tiers

**Purpose:** Returns complete tiers page data with user progress, tier cards, and aggregated rewards

**Implementation:** `appcode/app/api/tiers/route.ts:21-93`

**Response Schema:**
```typescript
interface TiersPageResponse {
  user: {
    id: string;
    currentTier: string;                  // "tier_1", "tier_2", etc.
    currentTierName: string;              // "Bronze", "Silver", etc.
    currentTierColor: string;             // Hex color
    currentSales: number;
    currentSalesFormatted: string;        // "$2,100" or "2,100 units"
    expirationDate: string | null;
    expirationDateFormatted: string | null;
    showExpiration: boolean;
  };
  progress: {
    nextTierName: string;
    nextTierTarget: number;
    nextTierTargetFormatted: string;
    amountRemaining: number;
    amountRemainingFormatted: string;
    progressPercentage: number;
    progressText: string;                 // "$900 to go" or "900 units to go"
  };
  vipSystem: {
    metric: 'sales_dollars' | 'sales_units';
  };
  tiers: Array<{
    name: string;
    color: string;
    tierLevel: number;
    minSales: number;
    minSalesFormatted: string;
    salesDisplayText: string;             // "$1,000+ in sales"
    commissionRate: number;
    commissionDisplayText: string;        // "12% Commission on sales"
    isUnlocked: boolean;
    isCurrent: boolean;
    totalPerksCount: number;
    rewards: Array<{
      type: string;
      isRaffle: boolean;
      displayText: string;
      count: number;
      sortPriority: number;
    }>;
  }>;
}
```

**Call Chain:**
```
GET /api/tiers (route.ts:21)
  ├─→ supabase.auth.getUser() (route.ts:25)
  ├─→ userRepository.findByAuthId() (route.ts:51)
  ├─→ Multitenancy check (route.ts:64)
  ├─→ getTiersPageData() (tierService.ts:441)
  │   ├─→ tierRepository.getUserTierContext() (tierRepository.ts:137)
  │   ├─→ tierRepository.getVipSystemSettings() (tierRepository.ts:196)
  │   ├─→ tierRepository.getAllTiers() (tierRepository.ts:104)
  │   ├─→ tierRepository.getVipTierRewards() (tierRepository.ts:225)
  │   ├─→ tierRepository.getTierMissions() (tierRepository.ts:263)
  │   ├─→ aggregateRewardsForTier() (tierService.ts:342)
  │   └─→ Build response (tierService.ts:522-546)
  └─→ Response (route.ts:81)
```

**Authentication:** Required - JWT token via cookie or header

**Route Implementation** (route.ts:21-93):
```typescript
export async function GET(request: NextRequest) {
  try {
    // Step 1: Validate session token
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Step 2: Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Step 3: Get user from our users table
    const user = await userRepository.findByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'User profile not found. Please sign up.' },
        { status: 401 }
      );
    }

    // Step 4: Verify user belongs to this client (multitenancy)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied.' },
        { status: 403 }
      );
    }

    // Step 5: Call tier service
    const tiersResponse = await getTiersPageData(user.id, clientId);

    // Step 6: Return response
    return NextResponse.json(tiersResponse, { status: 200 });

  } catch (error) {
    console.error('[Tiers] Unexpected error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch tiers data' },
      { status: 500 }
    );
  }
}
```

**Error Cases:**
| HTTP Status | Error Code | Thrown At | Reason |
|-------------|------------|-----------|--------|
| 401 | UNAUTHORIZED | route.ts:28-34 | Invalid/missing auth token |
| 401 | UNAUTHORIZED | route.ts:53-59 | User profile not found |
| 403 | FORBIDDEN | route.ts:65-71 | User belongs to different client |
| 500 | INTERNAL_ERROR | route.ts:41-47 | CLIENT_ID not configured |
| 500 | INTERNAL_ERROR | route.ts:85-91 | Unexpected server error |

---

## Core Functions

### Service Layer

#### getTiersPageData()

**Location:** `appcode/lib/services/tierService.ts:441-547`

**Signature:**
```typescript
export async function getTiersPageData(
  userId: string,
  clientId: string
): Promise<TiersPageResponse>
```

**Purpose:** Orchestrates all repository calls, applies business logic, returns complete response

**Implementation** (tierService.ts:441-500):
```typescript
export async function getTiersPageData(
  userId: string,
  clientId: string
): Promise<TiersPageResponse> {
  // 1. Get all required data from repository (parallel calls)
  const [userContext, vipSettings, allTiers, vipRewards, missionRewards] = await Promise.all([
    tierRepository.getUserTierContext(userId, clientId),
    tierRepository.getVipSystemSettings(clientId),
    tierRepository.getAllTiers(clientId),
    tierRepository.getVipTierRewards(clientId),
    tierRepository.getTierMissions(clientId),
  ]);

  if (!userContext) {
    throw new Error('User not found or not associated with client');
  }

  // 2. Find current tier data
  const currentTierData = allTiers.find(t => t.tierId === userContext.currentTier);
  if (!currentTierData) {
    throw new Error(`Current tier ${userContext.currentTier} not found`);
  }

  // 3. Filter tiers: only current + higher
  const filteredTiers = allTiers.filter(t => t.tierOrder >= userContext.currentTierOrder);

  // 4. Find next tier (if exists)
  const nextTier = allTiers.find(t => t.tierOrder === userContext.currentTierOrder + 1);

  // 5. Get current sales based on VIP metric
  const currentSales = vipSettings.metric === 'sales_dollars'
    ? userContext.totalSales
    : userContext.totalUnits;

  // ... continues with progress calculations, expiration, tier cards
}
```

**Calls:**
- `tierRepository.getUserTierContext()` (tierRepository.ts:137) - Get user tier info
- `tierRepository.getVipSystemSettings()` (tierRepository.ts:196) - Get VIP metric
- `tierRepository.getAllTiers()` (tierRepository.ts:104) - Get all tiers
- `tierRepository.getVipTierRewards()` (tierRepository.ts:225) - Get VIP rewards
- `tierRepository.getTierMissions()` (tierRepository.ts:263) - Get missions with rewards
- `aggregateRewardsForTier()` (tierService.ts:342) - Aggregate rewards by type

---

#### aggregateRewardsForTier()

**Location:** `appcode/lib/services/tierService.ts:342-426`

**Purpose:** Groups rewards by type+isRaffle, sorts by 9-priority, limits to max 4

**Implementation** (tierService.ts:342-426):
```typescript
function aggregateRewardsForTier(
  vipRewards: TierRewardData[],
  missionRewards: TierMissionData[],
  tierEligibility: string
): { rewards: TierRewardItem[]; totalPerksCount: number } {
  // Filter rewards for this tier
  const tierVipRewards = vipRewards.filter(r => r.tierEligibility === tierEligibility);
  const tierMissionRewards = missionRewards.filter(m => m.tierEligibility === tierEligibility);

  // Group by type+isRaffle key
  const grouped = new Map<string, { type: string; isRaffle: boolean; totalUses: number; sample: {...} }>();

  // Add VIP rewards (isRaffle = false)
  for (const reward of tierVipRewards) {
    const key = `${reward.type}_false`;
    // ... grouping logic
  }

  // Add mission rewards (isRaffle from mission)
  for (const mission of tierMissionRewards) {
    const key = `${mission.reward.type}_${mission.isRaffle}`;
    // ... grouping logic
  }

  // Calculate totalPerksCount
  let totalPerksCount = 0;
  for (const reward of tierVipRewards) totalPerksCount += reward.uses;
  for (const mission of tierMissionRewards) totalPerksCount += mission.reward.uses;

  // Sort by priority and take max 4
  aggregated.sort((a, b) => a.sortPriority - b.sortPriority);
  const rewards = aggregated.slice(0, 4);

  return { rewards, totalPerksCount };
}
```

**Priority Sorting** (tierService.ts:100-109):
```typescript
const REWARD_PRIORITY: Record<string, number> = {
  'physical_gift_raffle': 1,
  'experience_raffle': 2,
  'gift_card_raffle': 3,
  'experience': 4,
  'physical_gift': 5,
  'gift_card': 6,
  'commission_boost': 7,
  'spark_ads': 8,
  'discount': 9,
};
```

---

#### formatSalesValue()

**Location:** `appcode/lib/services/tierService.ts:136-147`

**Purpose:** Format number based on VIP metric (dollars vs units)

```typescript
export function formatSalesValue(
  value: number,
  metric: 'sales_dollars' | 'sales_units'
): string {
  const formatted = value.toLocaleString('en-US');
  return metric === 'sales_dollars' ? `$${formatted}` : `${formatted} units`;
}
```

---

#### getExpirationInfo()

**Location:** `appcode/lib/services/tierService.ts:286-326`

**Purpose:** Calculate expiration display based on tier level

```typescript
export function getExpirationInfo(
  tierLevel: number,
  nextCheckpointAt: string | null
): { expirationDate: string | null; expirationDateFormatted: string | null; showExpiration: boolean } {
  // Bronze (tier_level = 1) never expires
  if (tierLevel === 1) {
    return { expirationDate: null, expirationDateFormatted: null, showExpiration: false };
  }

  // Higher tiers have checkpoint expiration
  // ... format date as "Month DD, YYYY"
  return { expirationDate: nextCheckpointAt, expirationDateFormatted: formatted, showExpiration: true };
}
```

---

### Repository Layer

#### tierRepository.getAllTiers()

**Location:** `appcode/lib/repositories/tierRepository.ts:104-129`

**Query Implementation:**
```typescript
async getAllTiers(clientId: string): Promise<TierData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('client_id', clientId)  // ⚠️ Multi-tenant filter
    .order('tier_order', { ascending: true });

  if (error) {
    console.error('[TierRepository] Error fetching tiers:', error);
    throw new Error('Failed to fetch tiers');
  }

  return (data || []).map((tier) => ({
    id: tier.id,
    tierId: tier.tier_id,
    tierName: tier.tier_name,
    tierColor: tier.tier_color,
    tierOrder: tier.tier_order,
    salesThreshold: tier.sales_threshold,
    unitsThreshold: tier.units_threshold,
    commissionRate: tier.commission_rate,
    checkpointExempt: tier.checkpoint_exempt ?? false,
  }));
}
```

**Multi-Tenant Filter:** ✅ Present (line 110) - `.eq('client_id', clientId)`

---

#### tierRepository.getUserTierContext()

**Location:** `appcode/lib/repositories/tierRepository.ts:137-188`

**Query Implementation:**
```typescript
async getUserTierContext(userId: string, clientId: string): Promise<UserTierContext | null> {
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, client_id, current_tier, total_sales, total_units, next_checkpoint_at, tier_achieved_at')
    .eq('id', userId)
    .eq('client_id', clientId)  // ⚠️ Multi-tenant filter
    .single();

  // ... error handling and tier_order lookup
}
```

**Multi-Tenant Filter:** ✅ Present (line 148) - `.eq('client_id', clientId)`

---

#### tierRepository.getVipSystemSettings()

**Location:** `appcode/lib/repositories/tierRepository.ts:196-215`

**Query Implementation:**
```typescript
async getVipSystemSettings(clientId: string): Promise<VipSystemSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('clients')
    .select('vip_metric')
    .eq('id', clientId)  // ⚠️ Multi-tenant filter
    .single();

  // Map database 'units'/'sales' to API 'sales_units'/'sales_dollars'
  const metric = data.vip_metric === 'sales' ? 'sales_dollars' : 'sales_units';
  return { metric };
}
```

**Multi-Tenant Filter:** ✅ Present (line 202) - `.eq('id', clientId)`

---

#### tierRepository.getVipTierRewards()

**Location:** `appcode/lib/repositories/tierRepository.ts:225-250`

**Query Implementation:**
```typescript
async getVipTierRewards(clientId: string): Promise<TierRewardData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rewards')
    .select('id, type, name, description, value_data, tier_eligibility, redemption_quantity, reward_source')
    .eq('client_id', clientId)  // ⚠️ Multi-tenant filter
    .eq('reward_source', 'vip_tier')
    .eq('enabled', true);

  // ... mapping to TierRewardData
}
```

**Multi-Tenant Filter:** ✅ Present (line 231) - `.eq('client_id', clientId)`

---

#### tierRepository.getTierMissions()

**Location:** `appcode/lib/repositories/tierRepository.ts:263-322`

**Query Implementation:**
```typescript
async getTierMissions(clientId: string): Promise<TierMissionData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('missions')
    .select(`
      id, mission_type, tier_eligibility, reward_id,
      rewards!inner (id, type, name, description, value_data, redemption_quantity, reward_source, client_id)
    `)
    .eq('client_id', clientId)  // ⚠️ Multi-tenant filter on missions
    .eq('enabled', true)
    .eq('rewards.client_id', clientId)  // ⚠️ Multi-tenant filter on rewards (defense in depth)
    .eq('rewards.enabled', true);

  // ... mapping with isRaffle derivation
  return (data || []).map((mission) => ({
    // ...
    isRaffle: mission.mission_type === 'raffle',  // isRaffle derived from mission_type
  }));
}
```

**Multi-Tenant Filter:** ✅ Present (lines 284, 287) - Both missions AND rewards filtered by client_id

---

## Database Queries

### Summary of All Queries

| Function | File:Line | Table(s) | Multi-Tenant | Operation |
|----------|-----------|----------|--------------|-----------|
| `getAllTiers()` | tierRepository.ts:104 | tiers | ✅ line 110 | SELECT multiple |
| `getUserTierContext()` | tierRepository.ts:137 | users, tiers | ✅ lines 148, 169 | SELECT single + tier lookup |
| `getVipSystemSettings()` | tierRepository.ts:196 | clients | ✅ line 202 | SELECT single |
| `getVipTierRewards()` | tierRepository.ts:225 | rewards | ✅ line 231 | SELECT multiple |
| `getTierMissions()` | tierRepository.ts:263 | missions, rewards | ✅ lines 284, 287 | SELECT with join |

---

## Error Handling

### Error Codes

| Error Code | HTTP Status | Thrown From | Reason |
|------------|-------------|-------------|--------|
| `UNAUTHORIZED` | 401 | route.ts:28-34 | Invalid/missing auth token |
| `UNAUTHORIZED` | 401 | route.ts:53-59 | User profile not found |
| `FORBIDDEN` | 403 | route.ts:65-71 | Cross-tenant access attempt |
| `INTERNAL_ERROR` | 500 | route.ts:41-47 | CLIENT_ID not configured |
| `INTERNAL_ERROR` | 500 | route.ts:85-91 | Unexpected error |

### Error from Service Layer

| Error | Thrown From | Reason |
|-------|-------------|--------|
| `'User not found or not associated with client'` | tierService.ts:455 | userContext is null |
| `'Current tier ${tier} not found'` | tierService.ts:461 | Tier data inconsistency |
| `'Failed to fetch tiers'` | tierRepository.ts:115 | Database query error |
| `'Failed to fetch user'` | tierRepository.ts:156 | Database query error |
| `'Failed to fetch tier order'` | tierRepository.ts:175 | Tier lookup for user failed |
| `'Failed to fetch VIP system settings'` | tierRepository.ts:207 | Database query error |
| `'Failed to fetch VIP tier rewards'` | tierRepository.ts:237 | Database query error |
| `'Failed to fetch tier missions'` | tierRepository.ts:291 | Database query error |

---

## Database Schema Context

### Tables Used

**tiers Table** (SchemaFinalv2.md:254-272)
- `id` (UUID, PK)
- `client_id` (UUID, FK → clients.id) - Multi-tenant isolation
- `tier_order` (INTEGER) - Display order: 1-6
- `tier_id` (VARCHAR(50)) - Internal ID: 'tier_1' through 'tier_6'
- `tier_name` (VARCHAR(100)) - Admin-customizable name
- `tier_color` (VARCHAR(7)) - Hex color
- `sales_threshold` (DECIMAL(10,2)) - For sales mode
- `units_threshold` (INTEGER) - For units mode
- `commission_rate` (DECIMAL(5,2)) - Commission percentage
- `checkpoint_exempt` (BOOLEAN) - Entry tier only

**users Table** (SchemaFinalv2.md:123-155)
- `current_tier` (VARCHAR(50)) - Current tier_id
- `tier_achieved_at` (TIMESTAMP) - Start of checkpoint period
- `next_checkpoint_at` (TIMESTAMP) - End of checkpoint period
- `total_sales` (DECIMAL) - Precomputed sales
- `total_units` (INTEGER) - Precomputed units

**clients Table** (SchemaFinalv2.md:106-120)
- `vip_metric` (VARCHAR(10)) - 'units' or 'sales'

**rewards Table** (SchemaFinalv2.md:462-590)
- `tier_eligibility` (VARCHAR(50)) - 'tier_1' through 'tier_6'
- `reward_source` (VARCHAR(50)) - 'vip_tier' or 'mission'
- `value_data` (JSONB) - Contains display_text for physical_gift/experience

**missions Table** (SchemaFinalv2.md:362-421)
- `mission_type` (VARCHAR(50)) - Used for isRaffle derivation
- `tier_eligibility` (VARCHAR(50)) - Target tier

---

## Debugging Checklist

**If endpoint returns 401 Unauthorized:**
- [ ] Check auth token is valid
- [ ] Check user exists in users table with matching auth_id
- [ ] Verify findByAuthId() returns user (userRepository)

**If endpoint returns 403 Forbidden:**
- [ ] Check user.clientId matches CLIENT_ID environment variable
- [ ] Verify multitenancy check at route.ts:64

**If tiers array is empty:**
- [ ] Verify tiers table has data for this client_id
- [ ] Check tier filtering logic (tier_order >= current)
- [ ] Verify user has valid current_tier

**If rewards not showing:**
- [ ] Check rewards.enabled = true
- [ ] Check rewards.reward_source = 'vip_tier' for VIP rewards
- [ ] Check missions.enabled = true for mission rewards
- [ ] Verify tier_eligibility matches tier_id

**If VIP metric formatting wrong:**
- [ ] Check clients.vip_metric value ('units' or 'sales')
- [ ] Verify getVipSystemSettings() returns correct metric
- [ ] Check formatSalesValue() is using correct metric

---

## Related Documentation

- **EXECUTION_PLAN.md:** Phase 7 Tasks
- **API_CONTRACTS.md:** GET /api/tiers (lines 5604-6190)
- **SchemaFinalv2.md:** tiers (254-272), users (123-155), clients (106-120)
- **BugFixes/isRaffleDeterminationFix.md:** isRaffle derivation logic

---

**Document Version:** 1.0
**Steps Completed:** Step 7.2 (Tiers API Implementation)
**Last Updated:** 2025-12-09
**Completeness:** Repository ✅ | Service ✅ | Route ✅
