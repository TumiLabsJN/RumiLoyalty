# Missions - Implementation Guide

**Purpose:** Enable creators to view missions, track progress, claim rewards, and participate in raffles
**Phase:** Phase 5 - Missions System
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-03

---

## Quick Reference

**Steps Documented:**
- Step 5.1 - Mission Repositories ✅
- Step 5.2 - Mission Services ✅
- Step 5.3 - Mission API Routes 📋 Pending
- Step 5.4 - Mission Testing 📋 Pending

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `appcode/lib/repositories/missionRepository.ts` | 1,252 | Database queries with tenant isolation |
| `appcode/lib/repositories/raffleRepository.ts` | 316 | Raffle participation queries |
| `appcode/lib/services/missionService.ts` | 1,295 | Business logic: 14 statuses, sorting, flippable cards |

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

## Core Functions

### Repository Layer

#### missionRepository.listAvailable()

**Location:** `appcode/lib/repositories/missionRepository.ts:484-743`

**Signature:**
```typescript
async listAvailable(
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<AvailableMissionData[]>
```

**Purpose:** Retrieves all missions for a user with JOINs to progress, redemptions, and sub-state tables.

**Query Implementation (lines 493-538):**
```typescript
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
    preview_from_tier,
    enabled,
    display_order,
    reward_id,
    rewards!inner (
      id, type, name, description, value_data, redemption_type, reward_source
    ),
    tiers!inner (
      id, tier_id, tier_name, tier_color, tier_order
    ),
    mission_progress (
      id, user_id, current_value, status, completed_at, checkpoint_start, checkpoint_end
    )
  `)
  .eq('client_id', clientId)  // ⚠️ Multi-tenant filter (line 536)
  .eq('enabled', true)
  .or(`tier_eligibility.eq.${currentTierId},preview_from_tier.eq.${currentTierId}`);
```

**Multi-Tenant Filter:** ✅ Present (line 536) - `.eq('client_id', clientId)`

**Database Tables:**
- Primary: `missions` (SchemaFinalv2.md:362-423)
- Joined: `rewards` (SchemaFinalv2.md:462-592)
- Joined: `tiers` (SchemaFinalv2.md:254-273)
- Joined: `mission_progress` (SchemaFinalv2.md:425-460)

**Returns:** Array of `AvailableMissionData` with mission, reward, tier, progress, redemption, and sub-state data

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
| `listAvailable()` | missionRepository.ts:493 | missions, rewards, tiers, mission_progress | ✅ line 536 | SELECT multiple |
| `getHistory()` | missionRepository.ts:747 | missions, redemptions, raffle_participations | ✅ line 784 | SELECT multiple |
| `findById()` | missionRepository.ts:873 | missions, mission_progress, redemptions | ✅ line 924 | SELECT single |
| `claimReward()` | missionRepository.ts:1111 | redemptions | ✅ line 1116 | SELECT + UPDATE |
| `participate()` | raffleRepository.ts:67 | missions | ✅ line 85 | SELECT + INSERT |
| `getRaffleMissionInfo()` | raffleRepository.ts:248 | missions, rewards | ✅ line 261 | SELECT single |
| `hasParticipated()` | raffleRepository.ts:306 | raffle_participations | ✅ line 311 | SELECT single |

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

**Document Version:** 2.0
**Steps Completed:** 2 / 4 (5.1 Repositories, 5.2 Services)
**Last Updated:** 2025-12-03
**Completeness:** Repositories ✅, Services ✅, Routes 📋, Tests 📋
