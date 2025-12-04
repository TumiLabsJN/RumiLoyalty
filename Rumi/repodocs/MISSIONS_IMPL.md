# Missions - Implementation Guide

**Purpose:** Enable creators to view missions, track progress, claim rewards, and participate in raffles
**Phase:** Phase 5 - Missions System
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-04

---

## Quick Reference

**Steps Documented:**
- Step 5.1 - Mission Repositories ✅
- Step 5.2 - Mission Services ✅
- Step 5.3 - Mission API Routes ✅
- Step 5.4 - Mission Testing 📋 Pending

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/lib/repositories/missionRepository.ts` | 1,111 | Database queries with tenant isolation (RPC-based) |
| `appcode/lib/repositories/raffleRepository.ts` | 316 | Raffle participation queries |
| `appcode/lib/services/missionService.ts` | 1,295 | Business logic: 14 statuses, sorting, flippable cards |
| `appcode/lib/types/rpc.ts` | 124 | TypeScript types for RPC function return values |
| `appcode/app/api/missions/route.ts` | 130 | GET /api/missions endpoint |
| `appcode/app/api/missions/[missionId]/claim/route.ts` | 167 | POST /api/missions/:id/claim endpoint |
| `appcode/app/api/missions/[missionId]/participate/route.ts` | 140 | POST /api/missions/:id/participate endpoint |
| `appcode/app/api/missions/history/route.ts` | 116 | GET /api/missions/history endpoint |

**RPC Functions (PostgreSQL):**
| Function | Migration File | Purpose |
|----------|----------------|---------|
| `get_available_missions` | `supabase/migrations/20251203_single_query_rpc_functions.sql` | Single query for all mission data |
| `get_available_rewards` | `supabase/migrations/20251203_single_query_rpc_functions.sql` | Single query for all reward data |

**Database Tables Used:**
- `missions` (SchemaFinalv2.md:362-423)
- `mission_progress` (SchemaFinalv2.md:425-460)
- `rewards` (SchemaFinalv2.md:462-592)
- `redemptions` (SchemaFinalv2.md:594-664)
- `commission_boost_redemptions` (SchemaFinalv2.md:666-748)
- `physical_gift_redemptions` (SchemaFinalv2.md:824-890)
- `raffle_participations` (SchemaFinalv2.md:892-957)

**Quick Navigation:**
- [Core Functions](#core-functions) - Repositories and services
- [Database Queries](#database-queries) - All queries with filters
- [Status Computation](#status-computation) - 14 statuses logic
- [Error Handling](#error-handling) - Error codes and scenarios
- [Debugging](#debugging-checklist) - Common issues and fixes

---

## API Endpoints (Step 5.3)

### GET /api/missions

**Location:** `appcode/app/api/missions/route.ts:24-130`

**Purpose:** Returns all missions for the Missions page with pre-computed status, progress tracking, and formatted display text.

**References:**
- API_CONTRACTS.md lines 2955-3238
- ARCHITECTURE.md Section 5 (lines 408-461)

**Implementation (lines 24-117):**
```typescript
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

    // Step 2: Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('[Missions] CLIENT_ID not configured');
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'INTERNAL_ERROR', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Step 3: Get user from our users table
    const user = await userRepository.findByAuthId(authUser.id);
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', code: 'USER_NOT_FOUND', message: 'User profile not found. Please sign up.' },
        { status: 401 }
      );
    }

    // ⚠️ Multi-tenant filter (line 69)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', code: 'TENANT_MISMATCH', message: 'Access denied.' },
        { status: 403 }
      );
    }

    // Step 4-6: Get dashboard data, build tier lookup, get missions
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
    const tierLookup = new Map<string, { name: string; color: string }>();
    if (dashboardData.allTiers) {
      for (const tier of dashboardData.allTiers) {
        tierLookup.set(tier.id, { name: tier.name, color: tier.color });
      }
    }

    // Step 6: Get missions from service (line 102-113)
    const missionsResponse = await listAvailableMissions(
      user.id,
      clientId,
      { handle: user.tiktokHandle ?? '', currentTier: dashboardData.currentTier.id, ... },
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

**Multi-Tenant Filter:** ✅ Line 69 - `user.clientId !== clientId`

**Call Chain:**
```
GET /api/missions (route.ts:24)
  ├─→ userRepository.findByAuthId() (userRepository.ts)
  ├─→ dashboardRepository.getUserDashboard() (dashboardRepository.ts)
  └─→ listAvailableMissions() (missionService.ts:942)
      ├─→ missionRepository.listAvailable() (missionRepository.ts:484)
      ├─→ computeStatus() (missionService.ts:490)
      ├─→ transformMission() (missionService.ts:750)
      └─→ sortMissions() (missionService.ts:887)
```

---

### POST /api/missions/:id/claim

**Location:** `appcode/app/api/missions/[missionId]/claim/route.ts:41-167`

**Purpose:** Creator claims a completed mission reward.

**References:**
- API_CONTRACTS.md lines 3711-3779
- ARCHITECTURE.md Section 10.2 (lines 1312-1323)

**Request Body (varies by reward type):**
```typescript
interface ClaimRequestBody {
  scheduledActivationDate?: string;  // For scheduled rewards
  scheduledActivationTime?: string;
  size?: string;                     // For physical gifts
  shippingAddress?: {                // For physical gifts
    firstName?: string;
    lastName?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    phone?: string;
  };
}
```

**Implementation (lines 41-154):**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const { missionId } = await params;

    // Steps 1-3: Auth validation (same pattern as GET /api/missions)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    // ... auth checks ...

    const clientId = process.env.CLIENT_ID;
    const user = await userRepository.findByAuthId(authUser.id);

    // ⚠️ Multi-tenant filter (line 91)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', code: 'TENANT_MISMATCH', message: 'Access denied.' },
        { status: 403 }
      );
    }

    // Step 4: Parse request body (line 103-111)
    let body: ClaimRequestBody = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch { /* Empty body valid for instant rewards */ }

    // Step 5: Call service to claim reward (line 115-126)
    const result = await claimMissionReward(
      missionId,
      user.id,
      clientId,
      user.currentTier ?? '',
      {
        scheduledActivationDate: body.scheduledActivationDate,
        scheduledActivationTime: body.scheduledActivationTime,
        size: body.size,
        shippingAddress: body.shippingAddress,
      }
    );

    // Step 6: Return response based on result (line 129-154)
    if (!result.success) {
      let status = 400;
      if (result.message.includes('not found')) status = 404;
      else if (result.message.includes('not eligible')) status = 403;
      else if (result.message.includes('already claimed')) status = 409;
      return NextResponse.json({ success: false, error: 'CLAIM_FAILED', ... }, { status });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) { ... }
}
```

**Multi-Tenant Filter:** ✅ Line 91 - `user.clientId !== clientId`

**Call Chain:**
```
POST /api/missions/:id/claim (route.ts:41)
  ├─→ userRepository.findByAuthId() (userRepository.ts)
  └─→ claimMissionReward() (missionService.ts:1001)
      ├─→ missionRepository.findById() (missionRepository.ts:873)
      └─→ missionRepository.claimReward() (missionRepository.ts:1100)
```

---

### POST /api/missions/:id/participate

**Location:** `appcode/app/api/missions/[missionId]/participate/route.ts:31-140`

**Purpose:** Creator participates in a raffle mission.

**References:**
- API_CONTRACTS.md lines 3782-3824
- ARCHITECTURE.md Section 10.3 (lines 1347-1367)

**Backend Processing (8 steps per API_CONTRACTS.md):**
1. Verify mission.mission_type='raffle'
2. Check mission.activated=true
3. Verify user hasn't already participated
4. Verify tier eligibility
5. Update mission_progress.status → 'completed'
6. Create redemptions row (status='claimable')
7. Create raffle_participations row (is_winner=NULL)
8. Log audit trail

**Implementation (lines 31-127):**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const { missionId } = await params;

    // Steps 1-3: Auth validation (same pattern)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    // ... auth checks ...

    // ⚠️ Multi-tenant filter (line 81)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', code: 'TENANT_MISMATCH', message: 'Access denied.' },
        { status: 403 }
      );
    }

    // Step 4: Call service to participate in raffle (line 94-99)
    const result = await participateInRaffle(
      missionId,
      user.id,
      clientId,
      user.currentTier ?? ''
    );

    // Step 5: Return response based on result (line 102-127)
    if (!result.success) {
      let status = 400;
      if (result.message.includes('not found')) status = 404;
      else if (result.message.includes('not eligible')) status = 403;
      else if (result.message.includes('already entered')) status = 409;
      return NextResponse.json({ success: false, error: 'PARTICIPATION_FAILED', ... }, { status });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) { ... }
}
```

**Multi-Tenant Filter:** ✅ Line 81 - `user.clientId !== clientId`

**Call Chain:**
```
POST /api/missions/:id/participate (route.ts:31)
  ├─→ userRepository.findByAuthId() (userRepository.ts)
  └─→ participateInRaffle() (missionService.ts:1179)
      └─→ raffleRepository.participate() (raffleRepository.ts:58)
```

---

### GET /api/missions/history

**Location:** `appcode/app/api/missions/history/route.ts:21-116`

**Purpose:** Returns concluded missions for mission history page (completed rewards + lost raffles).

**References:**
- API_CONTRACTS.md lines 3827-4047
- ARCHITECTURE.md Section 10.2 (lines 1299-1309)

**Implementation (lines 21-103):**
```typescript
export async function GET(request: NextRequest) {
  try {
    // Steps 1-3: Auth validation (same pattern)
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    // ... auth checks ...

    // ⚠️ Multi-tenant filter (line 66)
    if (user.clientId !== clientId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', code: 'TENANT_MISMATCH', message: 'Access denied.' },
        { status: 403 }
      );
    }

    // Step 4: Get tier info for response (line 78-88)
    const dashboardData = await dashboardRepository.getUserDashboard(user.id, clientId);
    if (!dashboardData) {
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', code: 'USER_DATA_ERROR', message: 'Failed to load user data.' },
        { status: 500 }
      );
    }

    // Step 5: Get mission history from service (line 91-99)
    const historyResponse = await getMissionHistory(
      user.id,
      clientId,
      {
        currentTier: dashboardData.currentTier.id,
        currentTierName: dashboardData.currentTier.name,
        currentTierColor: dashboardData.currentTier.color,
      }
    );

    return NextResponse.json(historyResponse, { status: 200 });
  } catch (error) { ... }
}
```

**Multi-Tenant Filter:** ✅ Line 66 - `user.clientId !== clientId`

**Call Chain:**
```
GET /api/missions/history (route.ts:21)
  ├─→ userRepository.findByAuthId() (userRepository.ts)
  ├─→ dashboardRepository.getUserDashboard() (dashboardRepository.ts)
  └─→ getMissionHistory() (missionService.ts:1221)
      └─→ missionRepository.getHistory() (missionRepository.ts:747)
```

---

## Core Functions

### Repository Layer

#### missionRepository.listAvailable()

**Location:** `appcode/lib/repositories/missionRepository.ts:485-598`

**Signature:**
```typescript
async listAvailable(
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<AvailableMissionData[]>
```

**Purpose:** Retrieves all missions for a user via single RPC call. Replaces previous 5-query approach.

**RPC Implementation (lines 494-498):**
```typescript
// Single RPC call replaces 5 separate queries
// Per SingleQueryBS.md Section 4.2 - get_available_missions function
const { data, error } = await supabase.rpc('get_available_missions', {
  p_user_id: userId,
  p_client_id: clientId,
  p_current_tier: currentTierId,
});
```

**Multi-Tenant Filter:** ✅ Enforced in RPC function via `p_client_id` parameter
- SQL: `WHERE m.client_id = p_client_id` (migration line 154)

**RPC Function Location:** `supabase/migrations/20251203_single_query_rpc_functions.sql:13-162`

**RPC Query (PostgreSQL):**
```sql
SELECT
  m.id, m.mission_type, m.display_name, m.title, ...
  r.id, r.type, r.name, r.description, ...
  t.tier_id, t.tier_name, t.tier_color, t.tier_order,
  mp.id, mp.current_value, mp.status, mp.completed_at, ...
  red.id, red.status, red.claimed_at, ...
  cb.boost_status, cb.activated_at, cb.expires_at, ...
  pg.shipped_at, pg.shipping_city, pg.requires_size,
  rp.is_winner, rp.participated_at, rp.winner_selected_at
FROM missions m
INNER JOIN rewards r ON m.reward_id = r.id
INNER JOIN tiers t ON m.tier_eligibility = t.tier_id AND m.client_id = t.client_id
LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = p_user_id
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id AND red.user_id = p_user_id
LEFT JOIN commission_boost_redemptions cb ON red.id = cb.redemption_id
LEFT JOIN physical_gift_redemptions pg ON red.id = pg.redemption_id
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = p_user_id
WHERE m.client_id = p_client_id AND m.enabled = true
  AND (m.tier_eligibility = p_current_tier OR m.tier_eligibility = 'all' OR m.preview_from_tier = p_current_tier)
ORDER BY m.display_order ASC;
```

**TypeScript Mapping (lines 510-597):**
```typescript
return (data as GetMissionHistoryRow[]).map((row) => ({
  mission: { id: row.mission_id, type: row.mission_type, ... },
  reward: { id: row.reward_id, type: row.reward_type, ... },
  tier: { id: row.tier_id, name: row.tier_name, color: row.tier_color },
  progress: row.progress_id ? { id: row.progress_id, ... } : null,
  redemption: row.redemption_id ? { id: row.redemption_id, ... } : null,
  commissionBoost: row.boost_status ? { boostStatus: row.boost_status, ... } : null,
  physicalGift: row.physical_gift_requires_size !== null ? { ... } : null,
  raffleParticipation: row.raffle_participated_at ? { ... } : null,
  isLocked,
}));
```

**Database Tables (via RPC JOINs):**
- Primary: `missions` (SchemaFinalv2.md:362-423)
- Joined: `rewards` (SchemaFinalv2.md:462-592)
- Joined: `tiers` (SchemaFinalv2.md:254-273)
- Joined: `mission_progress` (SchemaFinalv2.md:425-460)
- Joined: `redemptions` (SchemaFinalv2.md:594-664)
- Joined: `commission_boost_redemptions` (SchemaFinalv2.md:666-748)
- Joined: `physical_gift_redemptions` (SchemaFinalv2.md:824-890)
- Joined: `raffle_participations` (SchemaFinalv2.md:892-957)

**Returns:** Array of `AvailableMissionData` with mission, reward, tier, progress, redemption, and sub-state data

**Type Reference:** `GetAvailableMissionsRow` in `appcode/lib/types/rpc.ts:13-74`

---

#### missionRepository.claimReward()

**Location:** `appcode/lib/repositories/missionRepository.ts:1100-1252`

**Signature:**
```typescript
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  currentTierId: string,
  rewardType: string,
  claimData: ClaimRequestData
): Promise<ClaimResult>
```

**Purpose:** Updates redemption status from 'claimable' to 'claimed' and creates sub-state records based on reward type.

**Query Implementation (lines 1111-1118):**
```typescript
// 1. Verify redemption exists and is claimable
const { data: redemption, error: redemptionError } = await supabase
  .from('redemptions')
  .select('id, status, reward_id, mission_progress_id')
  .eq('id', redemptionId)
  .eq('user_id', userId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 1116)
  .is('deleted_at', null)
  .single();
```

**Multi-Tenant Filter:** ✅ Present (line 1116) - `.eq('client_id', clientId)`

**Error Cases:**
- Returns `{ success: false, error: 'Redemption not found' }` if query returns null (line 1120-1126)
- Returns `{ success: false, error: 'Cannot claim: reward is ${status}' }` if status !== 'claimable' (line 1129-1135)

---

#### raffleRepository.participate()

**Location:** `appcode/lib/repositories/raffleRepository.ts:58-234`

**Signature:**
```typescript
async participate(
  missionId: string,
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<ParticipationResult>
```

**Purpose:** Creates mission_progress, redemption, and raffle_participation records for raffle entry.

**Query Implementation (lines 67-87):**
```typescript
// 1. Verify mission exists and is a raffle
const { data: mission, error: missionError } = await supabase
  .from('missions')
  .select(`
    id,
    mission_type,
    activated,
    tier_eligibility,
    raffle_end_date,
    reward_id,
    rewards!inner (
      id, type, name, description, value_data
    )
  `)
  .eq('id', missionId)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 85)
  .eq('enabled', true)
  .single();
```

**Multi-Tenant Filter:** ✅ Present (line 85) - `.eq('client_id', clientId)`

**Validation Checks (lines 89-118):**
```typescript
// 2. Verify it's a raffle type
if (mission.mission_type !== 'raffle') {
  return { success: false, error: 'This mission is not a raffle' };
}

// 3. Verify raffle is activated
if (!mission.activated) {
  return { success: false, error: 'This raffle is not currently accepting entries' };
}

// 4. Verify tier eligibility
if (mission.tier_eligibility !== 'all' && mission.tier_eligibility !== currentTierId) {
  return { success: false, error: 'You are not eligible for this raffle' };
}
```

---

### Service Layer

#### missionService.listAvailableMissions()

**Location:** `appcode/lib/services/missionService.ts:942-989`

**Signature:**
```typescript
export async function listAvailableMissions(
  userId: string,
  clientId: string,
  userInfo: {
    handle: string;
    currentTier: string;
    currentTierName: string;
    currentTierColor: string;
  },
  vipMetric: 'sales' | 'units',
  tierLookup: Map<string, { name: string; color: string }>
): Promise<MissionsPageResponse>
```

**Purpose:** Orchestrates mission retrieval, status computation, and sorting.

**Implementation (lines 954-988):**
```typescript
// 1. Get raw mission data from repository
const rawMissions = await missionRepository.listAvailable(userId, clientId, userInfo.currentTier);

// 2. Compute status and transform each mission
const missionsWithData = rawMissions.map((data) => {
  const status = computeStatus(data);  // Calls computeStatus() at line 490
  const item = transformMission(data, status, tierLookup);  // Calls transformMission() at line 750
  return { item, data };
});

// 3. Determine featured mission (first non-locked, non-dormant)
let featuredMissionId: string | null = null;
for (const { item } of missionsWithData) {
  if (item.status !== 'locked' && item.status !== 'dormant') {
    featuredMissionId = item.id;
    break;
  }
}

// 4. Sort missions by priority
const sortedMissions = sortMissions(missionsWithData, vipMetric, featuredMissionId);

// 5. Return response
return {
  user: { id: userId, handle: userInfo.handle, currentTier: userInfo.currentTier, ... },
  featuredMissionId,
  missions: sortedMissions,
};
```

**Calls:**
- `missionRepository.listAvailable()` (missionRepository.ts:484) - Get raw data
- `computeStatus()` (missionService.ts:490) - Derive 14 statuses
- `transformMission()` (missionService.ts:750) - Format for API response
- `sortMissions()` (missionService.ts:887) - Apply 12-priority sorting

---

## Status Computation

#### computeStatus()

**Location:** `appcode/lib/services/missionService.ts:490-600`

**14 Possible Statuses (lines 96-112):**
```typescript
export type MissionStatus =
  | 'in_progress'        // Active mission, user working on it
  | 'default_claim'      // Completed, instant reward claimable
  | 'default_schedule'   // Completed, scheduled reward claimable
  | 'scheduled'          // Claimed, awaiting activation date
  | 'active'             // Commission boost or discount currently active
  | 'redeeming'          // Instant reward processing (gift_card, spark_ads, experience)
  | 'redeeming_physical' // Physical gift processing (address received)
  | 'sending'            // Physical gift shipped
  | 'pending_info'       // Commission boost needs payout info
  | 'clearing'           // Commission boost in 20-day clearing period
  | 'dormant'            // Raffle not accepting entries
  | 'raffle_available'   // Raffle open for participation
  | 'raffle_processing'  // User entered, awaiting draw
  | 'raffle_claim'       // User won, prize claimable
  | 'raffle_won'         // User won, prize claimed
  | 'locked';            // User tier too low
```

**Status Priority (lines 490-600):**
```typescript
function computeStatus(data: AvailableMissionData): MissionStatus {
  const { mission, progress, redemption, commissionBoost, physicalGift, raffleParticipation, isLocked } = data;

  // Priority 1 - Locked (line 494)
  if (isLocked) return 'locked';

  // Priority 2 - Raffle States (lines 498-527)
  if (mission.type === 'raffle') {
    if (!mission.activated) return 'dormant';
    if (!raffleParticipation) return 'raffle_available';
    if (raffleParticipation.isWinner === null) return 'raffle_processing';
    if (raffleParticipation.isWinner === true) {
      if (redemption?.status === 'claimable') return 'raffle_claim';
      if (redemption?.status === 'claimed') return 'raffle_won';
    }
    return 'raffle_processing';
  }

  // Priority 3 - Completed with redemption (lines 529-590)
  if (redemption) {
    if (redemption.status === 'claimable') {
      return data.reward.redemptionType === 'scheduled' ? 'default_schedule' : 'default_claim';
    }
    if (redemption.status === 'claimed') {
      // Commission boost sub-states (lines 542-555)
      if (data.reward.type === 'commission_boost' && commissionBoost) {
        switch (commissionBoost.boostStatus) {
          case 'scheduled': return 'scheduled';
          case 'active': return 'active';
          case 'pending_info': return 'pending_info';
          case 'pending_payout': return 'clearing';
          default: return 'redeeming';
        }
      }
      // Physical gift states (lines 573-581)
      if (data.reward.type === 'physical_gift' && physicalGift) {
        if (physicalGift.shippedAt) return 'sending';
        if (physicalGift.shippingCity) return 'redeeming_physical';
      }
      // Instant rewards (line 584-586)
      if (['gift_card', 'spark_ads', 'experience'].includes(data.reward.type)) {
        return 'redeeming';
      }
    }
  }

  // Priority 4 - Active mission (line 594)
  return 'in_progress';
}
```

---

## Database Queries

### Summary of All Queries

| Function | File:Line | Table(s) | Multi-Tenant | Operation |
|----------|-----------|----------|--------------|-----------|
| `listAvailable()` | missionRepository.ts:485 | **RPC: get_available_missions** | ✅ via p_client_id | RPC single query |
| `getHistory()` | missionRepository.ts:606 | redemptions, mission_progress, missions, rewards, raffle_participations | ✅ line 643 | SELECT (2 queries) |
| `findById()` | missionRepository.ts:726 | missions, mission_progress, redemptions | ✅ line 777 | SELECT single |
| `claimReward()` | missionRepository.ts:960 | redemptions | ✅ line 965 | SELECT + UPDATE |
| `participate()` | raffleRepository.ts:67 | missions | ✅ line 85 | SELECT + INSERT |
| `getRaffleMissionInfo()` | raffleRepository.ts:248 | missions, rewards | ✅ line 261 | SELECT single |
| `hasParticipated()` | raffleRepository.ts:306 | raffle_participations | ✅ line 311 | SELECT single |

### RPC Functions

| RPC Function | Migration Line | Tables Joined | Security |
|--------------|----------------|---------------|----------|
| `get_available_missions` | 13-162 | missions, rewards, tiers, mission_progress, redemptions, commission_boost_redemptions, physical_gift_redemptions, raffle_participations | SECURITY DEFINER, client_id enforced via parameter |
| `get_available_rewards` | 175-289 | rewards, tiers, redemptions, commission_boost_redemptions, physical_gift_redemptions | SECURITY DEFINER, client_id enforced via parameter |

### Multi-Tenant Filter Verification

**missionRepository.ts client_id occurrences:**
- Line 283: `.eq('client_id', clientId)` - tier lookup
- Line 302: `.eq('client_id', clientId)` - tier lookup
- Line 446: `.eq('client_id', clientId)` - progress query
- Line 536: `.eq('client_id', clientId)` - missions query
- Line 568: `.eq('client_id', clientId)` - redemptions query
- Line 583: `.eq('client_id', clientId)` - boost redemptions
- Line 595: `.eq('client_id', clientId)` - physical redemptions
- Line 608: `.eq('client_id', clientId)` - raffle participations
- Line 784: `.eq('client_id', clientId)` - history query
- Line 924: `.eq('client_id', clientId)` - findById
- Line 1004: `.eq('client_id', clientId)` - findById progress
- Line 1116: `.eq('client_id', clientId)` - claimReward

**raffleRepository.ts client_id occurrences:**
- Line 85: `.eq('client_id', clientId)` - mission verification
- Line 126: `.eq('client_id', clientId)` - existing participation check
- Line 144: `.eq('client_id', clientId)` - progress check
- Line 189: `.eq('client_id', clientId)` - redemption insert
- Line 261: `.eq('client_id', clientId)` - getRaffleMissionInfo
- Line 311: `.eq('client_id', clientId)` - hasParticipated

**API Routes client_id verification (Step 5.3):**
| Route | File:Line | Check | HTTP Status |
|-------|-----------|-------|-------------|
| GET /api/missions | route.ts:69 | `user.clientId !== clientId` | 403 TENANT_MISMATCH |
| POST /api/missions/:id/claim | claim/route.ts:91 | `user.clientId !== clientId` | 403 TENANT_MISMATCH |
| POST /api/missions/:id/participate | participate/route.ts:81 | `user.clientId !== clientId` | 403 TENANT_MISMATCH |
| GET /api/missions/history | history/route.ts:66 | `user.clientId !== clientId` | 403 TENANT_MISMATCH |

---

## Error Handling

### Error Codes

| Error | Returned From | Condition | HTTP Status |
|-------|---------------|-----------|-------------|
| `'Mission not found'` | missionRepository.findById:931 | Query returns null | 404 |
| `'Redemption not found'` | missionRepository.claimReward:1125 | Redemption query returns null | 404 |
| `'Cannot claim: reward is ${status}'` | missionRepository.claimReward:1134 | status !== 'claimable' | 409 |
| `'This mission is not a raffle'` | raffleRepository.participate:100 | mission_type !== 'raffle' | 400 |
| `'This raffle is not currently accepting entries'` | raffleRepository.participate:107 | activated === false | 400 |
| `'You are not eligible for this raffle'` | raffleRepository.participate:113 | Tier check fails | 403 |
| `'You have already entered this raffle'` | raffleRepository.participate:131 | Existing participation found | 409 |

---

## Debugging Checklist

**If mission status computed incorrectly:**
- [ ] Check `computeStatus()` at missionService.ts:490
- [ ] Verify redemption.status value from database
- [ ] Check commissionBoost.boostStatus for commission_boost rewards
- [ ] Verify raffleParticipation.isWinner for raffle missions

**If missions not appearing:**
- [ ] Verify `client_id` filter at missionRepository.ts:536
- [ ] Check `enabled = true` filter
- [ ] Verify tier eligibility: `tier_eligibility.eq.${currentTierId}` OR `preview_from_tier.eq.${currentTierId}`

**If multi-tenant isolation broken:**
- [ ] **CRITICAL:** Audit ALL queries for `.eq('client_id', clientId)`
- [ ] Check 12 locations in missionRepository.ts
- [ ] Check 6 locations in raffleRepository.ts

**If raffle participation fails:**
- [ ] Check `mission.activated === true` at raffleRepository.ts:105
- [ ] Verify tier eligibility at raffleRepository.ts:113
- [ ] Check for existing participation at raffleRepository.ts:121

---

## Related Documentation

- **EXECUTION_PLAN.md:** Phase 5 Tasks (lines 820-1000)
- **API_CONTRACTS.md:** Missions Endpoints (lines 2951-4055)
- **SchemaFinalv2.md:** Tables (missions:362, mission_progress:425, rewards:462, redemptions:594)
- **ARCHITECTURE.md:** Multi-Tenant Pattern (Section 9, lines 1104-1137)

---

**Document Version:** 4.0
**Steps Completed:** 3 / 4 (5.1 Repositories, 5.2 Services, 5.3 API Routes)
**Last Updated:** 2025-12-04
**Completeness:** Repositories ✅ (RPC refactored), Services ✅, Routes ✅, Tests 📋
**RPC Migration:** `get_available_missions` deployed, `get_available_rewards` deployed
