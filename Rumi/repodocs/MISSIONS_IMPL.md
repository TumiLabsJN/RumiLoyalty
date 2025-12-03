# MISSIONS_IMPL.md - Phase 5 Implementation Documentation

**Last Updated:** 2025-12-03
**Phase:** 5 - Missions APIs
**Status:** Steps 5.1-5.2 Complete

---

## Overview

Phase 5 implements the Missions feature for the Rumi Loyalty Platform, enabling creators to view missions, track progress, claim rewards, participate in raffles, and view mission history.

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `lib/repositories/missionRepository.ts` | 1,252 | Data access for missions, progress, redemptions |
| `lib/repositories/raffleRepository.ts` | 316 | Raffle participation and winner tracking |
| `lib/services/missionService.ts` | 1,295 | Business logic: 14 statuses, 12-priority sorting, 8 flippable cards |

---

## Step 5.1: Mission Repositories

### missionRepository.ts (lines 1-1252)

**Location:** `appcode/lib/repositories/missionRepository.ts`

#### Key Interfaces

```typescript
// Line 17-47: AvailableMissionData - Raw data from repository
export interface AvailableMissionData {
  mission: {
    id: string;
    type: string;
    displayName: string;
    title: string;
    description: string | null;
    targetValue: number;
    targetUnit: string;
    raffleEndDate: string | null;
    activated: boolean;
    tierEligibility: string;
    previewFromTier: string | null;
    enabled: boolean;
  };
  reward: {
    id: string;
    type: string;
    name: string | null;
    description: string | null;
    valueData: Record<string, unknown> | null;
    redemptionType: string;
    rewardSource: string;
  };
  // ... progress, redemption, commissionBoost, physicalGift, raffleParticipation
  isLocked: boolean;
}
```

#### listAvailable() - Lines 180-450

Retrieves all missions for a user with JOINs to progress, redemptions, and sub-state tables.

```typescript
// Line 180-200: Query missions with tier eligibility
async listAvailable(
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<AvailableMissionData[]> {
  const supabase = await createClient();

  // 1. Get eligible missions (user's tier + locked previews)
  const { data: missions } = await supabase
    .from('missions')
    .select(`
      id, mission_type, display_name, title, description,
      target_value, target_unit, raffle_end_date, activated,
      tier_eligibility, preview_from_tier, enabled, reward_id,
      rewards!inner (...)
    `)
    .eq('client_id', clientId)  // Multi-tenant isolation
    .eq('enabled', true);
```

**Multi-tenant Isolation:** ALL queries filter by `client_id` (24+ occurrences).

#### claimReward() - Lines 1050-1180

Updates redemption status and creates sub-state records based on reward type.

```typescript
// Line 1050-1070: Claim reward with validation
async claimReward(
  redemptionId: string,
  userId: string,
  clientId: string,
  claimData: ClaimRequestData
): Promise<ClaimResult> {
  const supabase = await createClient();

  // 1. Get redemption with reward info
  const { data: redemption } = await supabase
    .from('redemptions')
    .select('*, rewards!inner(*)')
    .eq('id', redemptionId)
    .eq('user_id', userId)
    .eq('client_id', clientId)  // Multi-tenant isolation
    .single();
```

### raffleRepository.ts (lines 1-316)

**Location:** `appcode/lib/repositories/raffleRepository.ts`

#### participate() - Lines 58-234

Creates mission_progress, redemption, and raffle_participation records in a transaction.

```typescript
// Line 58-70: Participate in raffle
async participate(
  missionId: string,
  userId: string,
  clientId: string,
  currentTierId: string
): Promise<ParticipationResult> {
  const supabase = await createClient();

  // 1. Verify mission exists and is a raffle
  const { data: mission } = await supabase
    .from('missions')
    .select(`id, mission_type, activated, tier_eligibility, ...`)
    .eq('id', missionId)
    .eq('client_id', clientId)  // Multi-tenant isolation
    .single();
```

---

## Step 5.2: Mission Services

### missionService.ts (lines 1-1295)

**Location:** `appcode/lib/services/missionService.ts`

#### Constants

```typescript
// Lines 32-39: Mission display names per API_CONTRACTS.md lines 3077-3086
const MISSION_DISPLAY_NAMES: Record<string, string> = {
  sales_dollars: 'Sales Sprint',
  sales_units: 'Sales Sprint',
  likes: 'Fan Favorite',
  views: 'Road to Viral',
  videos: 'Lights, Camera, Go!',
  raffle: 'VIP Raffle',
};

// Lines 45-73: 12-priority status sorting per API_CONTRACTS.md lines 3243-3311
const STATUS_PRIORITY: Record<string, number> = {
  raffle_available: 2,
  raffle_claim: 2,
  default_claim: 3,
  default_schedule: 3,
  pending_info: 4,
  clearing: 5,
  sending: 6,
  active: 7,
  scheduled: 8,
  redeeming: 9,
  redeeming_physical: 9,
  in_progress: 10,
  raffle_won: 11,
  raffle_processing: 11,
  dormant: 11,
  locked: 12,
};
```

#### MissionStatus Type (lines 96-112)

```typescript
// 14 statuses per API_CONTRACTS.md lines 2996-3001
export type MissionStatus =
  | 'in_progress'
  | 'default_claim'
  | 'default_schedule'
  | 'scheduled'
  | 'active'
  | 'redeeming'
  | 'redeeming_physical'
  | 'sending'
  | 'pending_info'
  | 'clearing'
  | 'dormant'
  | 'raffle_available'
  | 'raffle_processing'
  | 'raffle_claim'
  | 'raffle_won'
  | 'locked';
```

#### computeStatus() - Lines 490-600

Derives mission status from multiple tables per API_CONTRACTS.md lines 3482-3571.

```typescript
// Lines 490-527: Status computation for raffles
function computeStatus(data: AvailableMissionData): MissionStatus {
  const { mission, progress, redemption, commissionBoost, physicalGift, raffleParticipation, isLocked } = data;

  // Priority 4 - Locked Missions
  if (isLocked) {
    return 'locked';
  }

  // Priority 3 - Raffle States
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

  // Priority 1 - Completed Missions with redemptions
  if (redemption) {
    if (redemption.status === 'claimable') {
      return data.reward.redemptionType === 'scheduled' ? 'default_schedule' : 'default_claim';
    }
    if (redemption.status === 'claimed') {
      // Commission boost sub-states
      if (data.reward.type === 'commission_boost' && commissionBoost) {
        switch (commissionBoost.boostStatus) {
          case 'scheduled': return 'scheduled';
          case 'active': return 'active';
          case 'pending_info': return 'pending_info';
          case 'pending_payout': return 'clearing';
        }
      }
      // ... discount, physical_gift, instant rewards
    }
  }

  // Priority 2 - Active Missions
  if (progress?.status === 'active') return 'in_progress';
  return 'in_progress';
}
```

#### generateFlippableCard() - Lines 610-741

Generates flippable card content for 8 status+reward type combinations per API_CONTRACTS.md lines 3315-3478.

```typescript
// Lines 610-656: Flippable card generation
function generateFlippableCard(
  status: MissionStatus,
  data: AvailableMissionData
): MissionItem['flippableCard'] {
  const { reward, redemption, commissionBoost } = data;

  // Card 1 - Redeeming (Instant Rewards)
  if (status === 'redeeming' && ['gift_card', 'spark_ads', 'experience'].includes(reward.type)) {
    return {
      backContentType: 'message',
      message: 'We will deliver your reward in up to 72 hours',
      dates: null,
    };
  }

  // Card 2 - Sending (Physical Gifts)
  if (status === 'sending' && reward.type === 'physical_gift') {
    return {
      backContentType: 'message',
      message: 'Your gift is on its way 🚚',
      dates: null,
    };
  }

  // Card 3 - Scheduled (Commission Boost)
  if (status === 'scheduled' && reward.type === 'commission_boost' && commissionBoost) {
    return {
      backContentType: 'dates',
      message: null,
      dates: [
        { label: 'Scheduled', value: formatDateTimeEST(commissionBoost.scheduledActivationDate, '18:00:00') },
        { label: 'Duration', value: `Will be active for ${commissionBoost.durationDays ?? 30} days` },
      ],
    };
  }

  // Cards 4-8: active (boost), pending_info, clearing, scheduled (discount), active (discount)
  // ... (see full implementation)

  return null; // All other statuses have no flippable card
}
```

#### sortMissions() - Lines 887-924

Sorts missions by 12-priority ranking per API_CONTRACTS.md lines 3243-3311.

```typescript
// Lines 887-924: Mission sorting
function sortMissions(
  missions: Array<{ item: MissionItem; data: AvailableMissionData }>,
  vipMetric: 'sales' | 'units',
  featuredMissionId: string | null
): MissionItem[] {
  return missions
    .sort((a, b) => {
      // Priority 1 - Featured mission ALWAYS first
      if (featuredMissionId) {
        if (a.item.id === featuredMissionId) return -1;
        if (b.item.id === featuredMissionId) return 1;
      }

      // Sort by status priority (STATUS_PRIORITY constant)
      const priorityA = STATUS_PRIORITY[a.item.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.item.status] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Secondary sort by mission type (VIP metric aware)
      let typeA = MISSION_TYPE_PRIORITY[a.item.missionType] ?? 99;
      let typeB = MISSION_TYPE_PRIORITY[b.item.missionType] ?? 99;
      if (vipMetric === 'sales') {
        if (a.item.missionType === 'sales_dollars') typeA = 0.5;
        if (b.item.missionType === 'sales_dollars') typeB = 0.5;
      }
      return typeA - typeB;
    })
    .map((m) => m.item);
}
```

#### Service Functions

**listAvailableMissions()** - Lines 942-989
```typescript
export async function listAvailableMissions(
  userId: string,
  clientId: string,
  userInfo: { handle, currentTier, currentTierName, currentTierColor },
  vipMetric: 'sales' | 'units',
  tierLookup: Map<string, { name: string; color: string }>
): Promise<MissionsPageResponse> {
  const rawMissions = await missionRepository.listAvailable(userId, clientId, userInfo.currentTier);
  const missionsWithData = rawMissions.map((data) => ({
    item: transformMission(data, computeStatus(data), tierLookup),
    data
  }));
  const featuredMissionId = missionsWithData.find(m => m.item.status !== 'locked')?.item.id ?? null;
  return {
    user: { id: userId, ...userInfo },
    featuredMissionId,
    missions: sortMissions(missionsWithData, vipMetric, featuredMissionId),
  };
}
```

**claimMissionReward()** - Lines 1001-1173
- 7-step validation per API_CONTRACTS.md lines 3770-3778
- Handles varying request body based on reward type

**participateInRaffle()** - Lines 1179-1212
- Delegates to raffleRepository.participate()
- Formats response with draw date and prize name

**getMissionHistory()** - Lines 1221-1295
- Formats concluded missions with reward-focused names
- Determines status: 'concluded' or 'rejected_raffle'

---

## Multi-Tenant Isolation Verification

| Repository | Filter Location | Verified |
|------------|----------------|----------|
| missionRepository.listAvailable | Line 200 `.eq('client_id', clientId)` | ✅ |
| missionRepository.getHistory | Line 890 `.eq('client_id', clientId)` | ✅ |
| missionRepository.findById | Line 970 `.eq('client_id', clientId)` | ✅ |
| missionRepository.claimReward | Line 1065 `.eq('client_id', clientId)` | ✅ |
| raffleRepository.participate | Line 85 `.eq('client_id', clientId)` | ✅ |
| raffleRepository.getRaffleMissionInfo | Line 261 `.eq('client_id', clientId)` | ✅ |
| raffleRepository.hasParticipated | Line 311 `.eq('client_id', clientId)` | ✅ |

---

## API Reference Cross-Check

| Feature | API_CONTRACTS.md Lines | Implementation |
|---------|----------------------|----------------|
| 14 statuses | 2996-3001 | MissionStatus type (lines 96-112) |
| Status computation | 3482-3571 | computeStatus() (lines 490-600) |
| 12-priority sorting | 3243-3311 | STATUS_PRIORITY + sortMissions() |
| 8 flippable cards | 3315-3478 | generateFlippableCard() (lines 610-741) |
| Display names | 3077-3086 | MISSION_DISPLAY_NAMES (lines 32-39) |
| Progress text | 3609-3655 | generateProgressText() (lines 390-452) |
| Reward descriptions | 3088-3097 | generateRewardDescription() (lines 310-344) |
| Claim 7-step validation | 3770-3778 | claimMissionReward() (lines 1001-1173) |
| Participate 8-step | 3814-3823 | raffleRepository.participate() |
| History formatting | 3889-3908 | generateRewardName() (lines 458-480) |

---

## Next Steps

- **Step 5.3:** Mission API Routes (GET /api/missions, POST /claim, POST /participate, GET /history)
- **Step 5.4:** Mission Integration Tests
