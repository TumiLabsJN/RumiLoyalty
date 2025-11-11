# CIRCULAR PROGRESS - DYNAMIC STATUS IMPLEMENTATION

**Project:** RumiAI Loyalty Platform
**Component:** Home Page - Section 1 (Circular Progress)
**Date Created:** 2025-01-10
**Status:** Specification Complete - Ready for Implementation

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Current State](#2-current-state)
3. [Requirements by Scenario](#3-requirements-by-scenario)
4. [Backend Requirements](#4-backend-requirements)
5. [Frontend Implementation Tasks](#5-frontend-implementation-tasks)
6. [UI Specifications](#6-ui-specifications)
7. [Edge Cases](#7-edge-cases)
8. [Testing Checklist](#8-testing-checklist)

---

## 1. OVERVIEW

### 1.1 Purpose

The circular progress component on the home page must dynamically adapt to:
- Mission status changes (active → completed → claimed → fulfilled)
- Mission availability (enabled/disabled, tier eligibility)
- Mission type fallback priority (sales → videos → likes → views)
- Tier changes (Silver → Gold while mission in progress)

### 1.2 Core Principle

**Backend precomputes ALL logic during daily cron job (midnight UTC).**
Frontend displays the precomputed result with no complex business logic.

### 1.3 Data Refresh Strategy

- **Frequency:** Daily at midnight UTC (existing cron job)
- **Frontend refresh:** On page load only
- **User sees updates:** Next time they visit home page after backend processing

**Why this works:**
- Metrics sync is daily (sales, videos, views, likes)
- Mission status changes are admin-driven (not real-time)
- Simple, performant, no polling needed

---

## 2. CURRENT STATE

### 2.1 Existing Implementation

**File:** `/home/jorge/Loyalty/Rumi/App Code/V1/app/home/page.tsx`

**Current UI:**
- Shows circular progress with tier-colored ring
- Displays: "300 of 500 sales"
- Shows: "Next: $50 Gift Card"
- Assumes mission status is always 'active'

**Mock Data Structure:**
```typescript
giftCard: {
  currentSales: 300,    // mission_progress.current_value
  threshold: 500,       // missions.target_value
  nextAmount: 50,       // benefits.value_data->>'amount'
}
```

### 2.2 What's Missing

- ❌ UI for 'completed' status (claim button)
- ❌ UI for 'claimed' status (processing message)
- ❌ UI for 'fulfilled' status (next mission or empty state)
- ❌ UI for disabled mission (fallback to videos/likes/views)
- ❌ UI for no missions available (empty state)
- ❌ Congratulations modal on first login after fulfillment
- ❌ Mission type fallback logic
- ❌ Tier change color update

---

## 3. REQUIREMENTS BY SCENARIO

### Scenario 1: Mission Status = 'active'

**Condition:**
- User has an active mission (in progress)
- Mission is enabled
- User's tier matches mission's tier_eligibility

**UI:**
```
┌─────────────────────────────────────┐
│  Stateside Growers Rewards          │
│                                     │
│      ╔═══════════════╗              │
│      ║  Progress Ring ║              │
│      ║   (tier color) ║  ← 60% filled
│      ║                ║              │
│      ║   300 / 500    ║  ← current / threshold
│      ║     sales      ║  ← mission type
│      ╚═══════════════╝              │
│                                     │
│  Next: $50 Gift Card                │
└─────────────────────────────────────┘
```

**Data Required:**
```typescript
{
  status: 'active',
  missionType: 'sales',           // 'sales' | 'videos' | 'likes' | 'views'
  missionDisplayName: 'Unlock Payday',
  currentProgress: 300,
  targetValue: 500,
  progressPercentage: 60,
  tierColor: '#F59E0B',           // From tiers.tier_color
  rewardType: 'gift_card',
  rewardAmount: 50,
}
```

**Business Logic:**
- After fulfillment, next mission (display_order + 1) automatically becomes active
- If no next mission exists → Go to Scenario 6

**Reference:** Current implementation ✅

---

### Scenario 2: Mission Status = 'completed'

**Condition:**
- `mission_progress.current_value >= missions.target_value`
- Daily cron detected completion
- User has NOT yet claimed reward

**UI:**
```
┌─────────────────────────────────────┐
│  Stateside Growers Rewards          │
│                                     │
│      ╔═══════════════╗              │
│      ║  Progress Ring ║              │
│      ║  (tier color)  ║  ← 100% filled
│      ║   COMPLETE!    ║              │
│      ║      🎉        ║              │
│      ╚═══════════════╝              │
│                                     │
│  [Claim $50 Gift Card]  ← Button    │
└─────────────────────────────────────┘
```

**Data Required:**
```typescript
{
  status: 'completed',
  missionType: 'sales',
  missionId: 'uuid-here',         // For claim API call
  currentProgress: 500,
  targetValue: 500,
  progressPercentage: 100,
  tierColor: '#F59E0B',
  rewardType: 'gift_card',
  rewardAmount: 50,
}
```

**UI Changes:**
1. Circle fills to 100%
2. Circle color: Keep tier color (not green)
3. Center text: "COMPLETE! 🎉"
4. Bottom text replaced with button: "Claim $50 Gift Card"

**Button Action:**
```typescript
const handleClaim = async () => {
  await fetch(`/api/missions/${missionId}/claim`, { method: 'POST' })
  // Refetch dashboard data
  // Status changes to 'claimed'
}
```

**Backend Updates on Claim:**
1. `mission_progress.status` = 'claimed'
2. `mission_progress.claimed_at` = NOW()
3. Create `redemptions` record (status='pending')
4. Lock `tier_at_claim` in redemptions table

**Reference:** Missions.md Section 8.2 - Status Definitions

---

### Scenario 3: Mission Status = 'claimed'

**Condition:**
- User clicked [Claim Reward]
- Waiting for admin fulfillment
- Redemption status = 'pending'

**UI:**
```
┌─────────────────────────────────────┐
│  Stateside Growers Rewards          │
│                                     │
│      ╔═══════════════╗              │
│      ║  [Animated]    ║  ← Spinner/pulse
│      ║   (tier color) ║              │
│      ║                ║              │
│      ║      ⏳        ║  ← Hourglass
│      ╚═══════════════╝              │
│                                     │
│  Processing your reward...          │
└─────────────────────────────────────┘
```

**Data Required:**
```typescript
{
  status: 'claimed',
  missionType: 'sales',
  tierColor: '#F59E0B',
  rewardType: 'gift_card',
  rewardAmount: 50,
}
```

**UI Changes:**
1. Circle shows animated spinner (rotating or pulsing)
2. Center shows hourglass emoji ⏳
3. Bottom text: "Processing your reward..."

**CSS Animation (suggestion):**
```css
.processing-circle {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

**Reference:** Similar to missions page "claimed" status UI

---

### Scenario 4: Mission Status = 'fulfilled'

**Condition:**
- Admin marked redemption as fulfilled
- `mission_progress.status` = 'fulfilled'
- Mission moved to history

**Two Sub-Scenarios:**

#### Scenario 4A: Next Mission Available

**Backend Logic:**
```sql
-- Check if next mission exists
SELECT * FROM missions
WHERE client_id = :client_id
  AND tier_eligibility = :current_tier
  AND mission_type = 'sales'
  AND display_order = :current_display_order + 1
  AND enabled = true
LIMIT 1;
```

**If found:** Return next mission data with status='active' → Display Scenario 1 UI

#### Scenario 4B: No Next Mission Available

**Backend Logic:**
```sql
-- Returns 0 rows (no next mission)
```

**If not found:** Go to Scenario 6 (No missions available)

**Congratulations Modal (First Login After Fulfillment):**

**Trigger:**
- User's last session timestamp < mission's fulfilled_at timestamp
- Show modal ONCE on first page load

**Modal UI:**
```
┌─────────────────────────────────────┐
│              🎉                     │
│                                     │
│  Congratulations!                   │
│  Your reward has been delivered!    │
│                                     │
│  Please let us know if you have     │
│  any questions:                     │
│  support@statesidegrowers.com       │
│                                     │
│           [Got it!]                 │
└─────────────────────────────────────┘
```

**Implementation Notes:**
- Store flag in localStorage: `lastSeenFulfillment_${missionId}`
- Backend returns: `showCongratsModal: true/false`
- Modal closes on button click or backdrop click

**Reference:** Loyalty.md LOC 568-611 (Flow 6: Tier Calculation)

---

### Scenario 5: Mission Disabled (enabled=false)

**Condition:**
- Sales mission has `enabled=false` (admin disabled it)
- Need to show fallback mission

**Fallback Priority (in order):**
1. **Sales** (Unlock Payday) ← Try first
2. **Videos** (Lights, Camera, Go!) ← If sales disabled
3. **Likes** (Road to Viral) ← If sales + videos disabled
4. **Views** (Eyes on You) ← If sales + videos + likes disabled
5. **None** → Scenario 6 ← If all disabled

**Backend Logic:**
```typescript
// Pseudocode for backend endpoint
const missionTypePriority = ['sales', 'videos', 'likes', 'views']

for (const type of missionTypePriority) {
  const mission = await db.query(`
    SELECT * FROM missions m
    JOIN mission_progress mp ON m.id = mp.mission_id
    WHERE m.client_id = :client_id
      AND m.tier_eligibility = :user_tier
      AND m.mission_type = :type
      AND m.enabled = true
      AND mp.user_id = :user_id
      AND mp.status = 'active'
      AND mp.checkpoint_start = :current_checkpoint
    ORDER BY m.display_order ASC
    LIMIT 1
  `)

  if (mission) return mission  // Found active mission
}

// No missions found
return null  // Go to Scenario 6
```

**UI Changes per Mission Type:**

| Mission Type | Center Text Changes | Example |
|--------------|---------------------|---------|
| **sales** | "300 of 500 **sales**" | Current implementation ✅ |
| **videos** | "7 of 10 **videos**" | "Next: $50 Gift Card" |
| **likes** | "800 of 1,000 **likes**" | "Next: $25 Gift Card" |
| **views** | "40,000 of 50,000 **views**" | "Next: $100 Gift Card" |

**ONLY change:** The unit text ("sales" → "videos" → "likes" → "views")

**Everything else stays the same:**
- Circle color: User's current tier color ✅
- Reward text format: "Next: $XX Gift Card" ✅
- Progress calculation: `current / target * 100` ✅

**Important Notes:**
- This is **precomputed** during daily cron (not real-time)
- Changes rarely (mission config is semi-static)
- Frontend simply displays whatever backend returns

**Reference:** Missions.md Section 2.1 (Mission Types)

---

### Scenario 6: No Missions Available

**Condition:**
- All missions fulfilled for current tier
- OR no missions configured for current tier
- OR all missions disabled

**Backend Returns:**
```typescript
{
  status: 'no_missions',
  tierName: 'Gold',
  message: "You've completed all missions for your tier. Keep it up to unlock more missions!"
}
```

**UI:**
```
┌─────────────────────────────────────┐
│  Stateside Growers Rewards          │
│                                     │
│            🎉                       │
│                                     │
│      Amazing work!                  │
│                                     │
│  You've completed all missions      │
│  for your tier.                     │
│                                     │
│  Keep it up to unlock more          │
│  missions!                          │
└─────────────────────────────────────┘
```

**UI Specifications:**
- No circular progress (section still renders but shows message)
- Celebration emoji: 🎉
- Bold header: "Amazing work!"
- Body text: "You've completed all missions for your tier."
- Motivational text: "Keep it up to unlock more missions!"

**When Does This Resolve?**
- Admin adds new missions for this tier
- User gets promoted to tier with available missions
- Next checkpoint period starts (missions reset)

**Alternative UI (if preferred):**
Hide circular progress section entirely, page starts with "Gold Level Rewards" card.

**Implementation Decision:** Show message (not hide section) for better UX feedback.

**Reference:** Similar to empty states in missions/rewards history pages

---

### Scenario 7: Raffle-Specific Statuses

**Statuses:**
- `processing` (raffle entry submitted)
- `won` (raffle winner)
- `lost` (raffle non-winner)

**Action:** **IGNORE for circular progress**

**Why?**
- Circular progress ONLY shows: sales, videos, likes, views
- Raffles are separate mission type (not in priority list)
- Raffles appear in missions page, not home circular progress

**Reference:** Missions.md Section 2.2 (Raffle Mission)

---

### Scenario 8: Tier Change During Active Mission

**Condition:**
- User is Silver, working on Silver sales mission (200/500)
- User gets promoted to Gold (or demoted to Bronze)
- Mission persists (does NOT cancel)

**UI Behavior:**

**BEFORE tier change:**
```
Circle color: Silver (#94a3b8)
Progress: 200 / 500 sales
Tier badge: "Silver Level Rewards"
```

**AFTER tier change (promoted to Gold):**
```
Circle color: Gold (#F59E0B)  ← UPDATED
Progress: 200 / 500 sales     ← SAME (mission persists)
Tier badge: "Gold Level Rewards"  ← UPDATED
```

**Key Points:**
1. ✅ Circle color updates to **new tier color**
2. ✅ Tier badge shows **current tier** (not mission's original tier)
3. ✅ Mission progress **persists** (200/500 stays)
4. ✅ After claiming → Next mission is from **Gold tier** (not Silver)

**Example Timeline:**
```
Day 1:  Silver tier, Sales Mission 1 (200/500)
Day 30: Promoted to Gold (checkpoint)
Day 31: Still on Silver Sales Mission 1 (250/500)
        → Circle shows GOLD color
        → Badge says "Gold Level Rewards"
Day 40: Complete mission (500/500) → Claim → Fulfilled
Day 41: Gold Sales Mission order=1 appears (0/2000)
        → New mission, new target, Gold tier rewards
```

**Backend Data Structure:**
```typescript
{
  status: 'active',
  missionType: 'sales',
  currentProgress: 250,
  targetValue: 500,           // From original Silver mission
  tierColor: '#F59E0B',       // User's CURRENT tier (Gold)
  tierName: 'Gold',           // User's CURRENT tier
  rewardAmount: 25,           // From original Silver mission reward
  // Note: Mission is from Silver, but display uses current tier color
}
```

**Demotion Works Same Way:**
```
Gold → Silver mid-mission
Circle color: Changes to Silver color
Progress: Persists
After fulfillment: Next mission from Silver tier
```

**Reference:**
- Loyalty.md LOC 603-606 (Tier change handling)
- Loyalty.md LOC 2012-2015 (Mission persistence)
- Loyalty.md LOC 2387-2392 (Tier change behavior)

---

## 4. BACKEND REQUIREMENTS

### 4.1 New API Endpoint

**Endpoint:** `GET /api/dashboard/featured-mission`

**Purpose:** Returns the ONE mission to display in circular progress (precomputed)

**Response Schema:**
```typescript
interface FeaturedMissionResponse {
  // Core status
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'

  // Mission data (null if status='no_missions')
  mission: {
    id: string                        // UUID for claim API call
    type: 'sales' | 'videos' | 'likes' | 'views'
    displayName: string               // "Unlock Payday", "Lights, Camera, Go!", etc.

    // Progress
    currentProgress: number           // mission_progress.current_value
    targetValue: number               // missions.target_value
    progressPercentage: number        // Computed: (current / target) * 100

    // Reward
    rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    rewardAmount: number | null       // For gift_card, spark_ads, commission_boost, discount
    rewardCustomText: string | null   // For physical_gift, experience

    // Display
    unitText: 'sales' | 'videos' | 'likes' | 'views'  // For "300 of 500 {unitText}"
  } | null

  // Tier info (always present)
  tier: {
    name: string                      // "Bronze", "Silver", "Gold", "Platinum"
    color: string                     // Hex color from tiers.tier_color
  }

  // Congratulations modal
  showCongratsModal: boolean          // True if first login after recent fulfillment
  congratsMessage: string | null      // "Your $50 Gift Card has been delivered!"
  supportEmail: string                // Client's support email

  // Empty state message (only if status='no_missions')
  emptyStateMessage: string | null    // "You've completed all missions for your tier..."
}
```

**Example Responses:**

**Active Mission:**
```json
{
  "status": "active",
  "mission": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sales",
    "displayName": "Unlock Payday",
    "currentProgress": 300,
    "targetValue": 500,
    "progressPercentage": 60,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales"
  },
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": null
}
```

**Completed Mission:**
```json
{
  "status": "completed",
  "mission": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sales",
    "displayName": "Unlock Payday",
    "currentProgress": 500,
    "targetValue": 500,
    "progressPercentage": 100,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales"
  },
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": null
}
```

**No Missions Available:**
```json
{
  "status": "no_missions",
  "mission": null,
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": false,
  "congratsMessage": null,
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": "You've completed all missions for your tier. Keep it up to unlock more missions!"
}
```

**First Login After Fulfillment:**
```json
{
  "status": "active",
  "mission": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "type": "sales",
    "displayName": "Unlock Payday",
    "currentProgress": 0,
    "targetValue": 1000,
    "progressPercentage": 0,
    "rewardType": "gift_card",
    "rewardAmount": 100,
    "rewardCustomText": null,
    "unitText": "sales"
  },
  "tier": {
    "name": "Gold",
    "color": "#F59E0B"
  },
  "showCongratsModal": true,
  "congratsMessage": "Your $50 Gift Card has been delivered!",
  "supportEmail": "support@statesidegrowers.com",
  "emptyStateMessage": null
}
```

---

### 4.2 Backend Logic (Pseudocode)

```typescript
async function getFeaturedMission(userId: string) {
  // 1. Get user data
  const user = await db.query(`
    SELECT
      current_tier,
      last_login_at,
      tier_achieved_at,
      checkpoint_start
    FROM users
    WHERE id = $1
  `, [userId])

  // 2. Get tier info
  const tier = await db.query(`
    SELECT tier_name, tier_color
    FROM tiers
    WHERE id = $1
  `, [user.current_tier])

  // 3. Check for recently fulfilled missions (for congrats modal)
  const recentFulfillment = await db.query(`
    SELECT
      mp.fulfilled_at,
      b.value_data->>'amount' as reward_amount
    FROM mission_progress mp
    JOIN missions m ON mp.mission_id = m.id
    JOIN benefits b ON m.benefit_id = b.id
    WHERE mp.user_id = $1
      AND mp.status = 'fulfilled'
      AND mp.fulfilled_at > $2
    ORDER BY mp.fulfilled_at DESC
    LIMIT 1
  `, [userId, user.last_login_at])

  const showCongratsModal = recentFulfillment.length > 0
  const congratsMessage = showCongratsModal
    ? `Your $${recentFulfillment[0].reward_amount} Gift Card has been delivered!`
    : null

  // 4. Try to find active mission (priority order)
  const missionTypePriority = ['sales', 'videos', 'likes', 'views']

  for (const missionType of missionTypePriority) {
    const mission = await db.query(`
      SELECT
        m.id,
        m.mission_type,
        m.target_value,
        mp.current_value,
        mp.status,
        b.type as reward_type,
        b.value_data,
        b.name as reward_name
      FROM missions m
      LEFT JOIN mission_progress mp
        ON m.id = mp.mission_id
        AND mp.user_id = $1
        AND mp.checkpoint_start = $4
      LEFT JOIN benefits b ON m.benefit_id = b.id
      WHERE m.client_id = $2
        AND m.tier_eligibility = $3
        AND m.mission_type = $5
        AND m.enabled = true
        AND (mp.status IS NULL OR mp.status IN ('active', 'completed', 'claimed'))
      ORDER BY m.display_order ASC
      LIMIT 1
    `, [userId, user.client_id, user.current_tier, user.checkpoint_start, missionType])

    if (mission.length > 0) {
      // Found a mission!
      const m = mission[0]

      // Determine status
      let status = 'active'
      if (m.status === 'completed') status = 'completed'
      if (m.status === 'claimed') status = 'claimed'

      // Compute progress
      const currentProgress = m.current_value || 0
      const progressPercentage = Math.min((currentProgress / m.target_value) * 100, 100)

      // Format reward
      const rewardAmount = m.reward_type === 'gift_card'
        ? parseInt(m.value_data.amount)
        : null

      const rewardCustomText = ['physical_gift', 'experience'].includes(m.reward_type)
        ? m.reward_name
        : null

      // Map mission type to display name
      const displayNames = {
        sales: 'Unlock Payday',
        videos: 'Lights, Camera, Go!',
        likes: 'Road to Viral',
        views: 'Eyes on You'
      }

      return {
        status,
        mission: {
          id: m.id,
          type: m.mission_type,
          displayName: displayNames[m.mission_type],
          currentProgress,
          targetValue: m.target_value,
          progressPercentage: Math.round(progressPercentage),
          rewardType: m.reward_type,
          rewardAmount,
          rewardCustomText,
          unitText: m.mission_type
        },
        tier: {
          name: tier.tier_name,
          color: tier.tier_color
        },
        showCongratsModal,
        congratsMessage,
        supportEmail: user.support_email,
        emptyStateMessage: null
      }
    }
  }

  // 5. No missions found
  return {
    status: 'no_missions',
    mission: null,
    tier: {
      name: tier.tier_name,
      color: tier.tier_color
    },
    showCongratsModal,
    congratsMessage,
    supportEmail: user.support_email,
    emptyStateMessage: "You've completed all missions for your tier. Keep it up to unlock more missions!"
  }
}
```

---

### 4.3 Claim Endpoint (Already Documented)

**Endpoint:** `POST /api/missions/:id/claim`

**Purpose:** Creator claims completed mission reward

**Request:**
```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "mission_id": "550e8400-e29b-41d4-a716-446655440000",
  "redemption_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "claimed",
  "message": "Reward claimed successfully. Awaiting admin fulfillment."
}
```

**Backend Actions:**
1. Update `mission_progress.status` = 'claimed'
2. Set `mission_progress.claimed_at` = NOW()
3. Create `redemptions` record (status='pending')
4. Lock `tier_at_claim` in redemptions

**Reference:** API_SPECIFICATION.md Section 3

---

## 5. FRONTEND IMPLEMENTATION TASKS

### Task 5.1: Update Data Structure

**File:** `app/home/page.tsx`

**Current:**
```typescript
const mockData = {
  giftCard: {
    currentSales: 300,
    threshold: 500,
    nextAmount: 30,
  }
}
```

**New:**
```typescript
const mockData = {
  featuredMission: {
    status: 'active',  // or 'completed', 'claimed', 'no_missions'
    mission: {
      id: 'uuid',
      type: 'sales',
      displayName: 'Unlock Payday',
      currentProgress: 300,
      targetValue: 500,
      progressPercentage: 60,
      rewardType: 'gift_card',
      rewardAmount: 50,
      rewardCustomText: null,
      unitText: 'sales',
    },
    tier: {
      name: 'Gold',
      color: '#F59E0B',
    },
    showCongratsModal: false,
    congratsMessage: null,
    supportEmail: 'support@example.com',
    emptyStateMessage: null,
  }
}
```

**Action:**
- Replace `giftCard` object with `featuredMission` object
- Update all references throughout component

---

### Task 5.2: Implement Status-Based Rendering

**File:** `app/home/page.tsx`

**Add conditional rendering logic:**

```typescript
const renderCircularProgress = () => {
  const { status, mission, tier } = mockData.featuredMission

  // Scenario 6: No missions
  if (status === 'no_missions') {
    return <NoMissionsUI message={mockData.featuredMission.emptyStateMessage} />
  }

  // All other scenarios have a mission
  const { currentProgress, targetValue, progressPercentage, unitText, rewardAmount } = mission

  // Common: Circle rendering
  const circleElement = (
    <svg width={circleSize} height={circleSize} className="transform -rotate-90">
      <circle /* background */ />
      <circle /* progress with tier.color */ />
    </svg>
  )

  // Scenario 1: Active
  if (status === 'active') {
    return (
      <>
        {circleElement}
        <div className="center-text">
          <span>{currentProgress}</span>
          <span>of {targetValue} {unitText}</span>
        </div>
        <p>Next: ${rewardAmount} Gift Card</p>
      </>
    )
  }

  // Scenario 2: Completed
  if (status === 'completed') {
    return (
      <>
        {circleElement}  {/* 100% filled */}
        <div className="center-text">
          <span>COMPLETE! 🎉</span>
        </div>
        <button onClick={handleClaim}>
          Claim ${rewardAmount} Gift Card
        </button>
      </>
    )
  }

  // Scenario 3: Claimed
  if (status === 'claimed') {
    return (
      <>
        <AnimatedCircle color={tier.color} />
        <div className="center-text">
          <span>⏳</span>
        </div>
        <p>Processing your reward...</p>
      </>
    )
  }
}
```

---

### Task 5.3: Implement Claim Handler

**File:** `app/home/page.tsx`

```typescript
const handleClaim = async () => {
  const { mission } = mockData.featuredMission

  try {
    setIsClaimingLoading(true)

    const response = await fetch(`/api/missions/${mission.id}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) throw new Error('Claim failed')

    const result = await response.json()

    // Refetch dashboard data
    await refetchDashboard()

    // Show success toast
    toast.success('Reward claimed! Admin will fulfill soon.')

  } catch (error) {
    console.error('Claim error:', error)
    toast.error('Failed to claim reward. Please try again.')
  } finally {
    setIsClaimingLoading(false)
  }
}
```

---

### Task 5.4: Implement Congratulations Modal

**File:** `app/home/page.tsx`

**Add modal component:**

```typescript
const CongratsModal = ({
  isOpen,
  onClose,
  message,
  supportEmail
}: {
  isOpen: boolean
  onClose: () => void
  message: string
  supportEmail: string
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-4 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Congratulations!
        </h2>
        <p className="text-slate-700 mb-4">{message}</p>
        <p className="text-sm text-slate-600 mb-6">
          Please let us know if you have any questions:<br />
          <a
            href={`mailto:${supportEmail}`}
            className="text-blue-600 hover:underline"
          >
            {supportEmail}
          </a>
        </p>
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-full"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
```

**Usage:**

```typescript
export default function Home() {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (mockData.featuredMission.showCongratsModal) {
      setShowModal(true)
      // Mark as seen (store in localStorage or update backend)
      localStorage.setItem('lastSeenCongrats', new Date().toISOString())
    }
  }, [])

  return (
    <>
      <HomePageLayout>
        {/* ... existing content ... */}
      </HomePageLayout>

      <CongratsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        message={mockData.featuredMission.congratsMessage}
        supportEmail={mockData.featuredMission.supportEmail}
      />
    </>
  )
}
```

---

### Task 5.5: Implement No Missions UI

**File:** `app/home/page.tsx`

```typescript
const NoMissionsUI = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-4 py-8">
      <h3 className="text-lg font-semibold text-slate-900">
        Stateside Growers Rewards
      </h3>

      <div className="text-6xl">🎉</div>

      <div className="space-y-2">
        <p className="text-xl font-bold text-slate-900">
          Amazing work!
        </p>
        <p className="text-base text-slate-700 max-w-xs mx-auto">
          {message}
        </p>
      </div>
    </div>
  )
}
```

---

### Task 5.6: Add Animated Spinner for 'claimed' Status

**File:** `app/home/page.tsx`

**CSS (in globals.css or component):**

```css
@keyframes pulse-ring {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.processing-ring {
  animation: pulse-ring 2s ease-in-out infinite;
}
```

**Component:**

```typescript
const AnimatedCircle = ({ color }: { color: string }) => {
  return (
    <svg width={circleSize} height={circleSize} className="transform -rotate-90">
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={0}  // Full circle
        strokeLinecap="round"
        className="processing-ring"
      />
    </svg>
  )
}
```

---

### Task 5.7: Update Tier Color References

**File:** `app/home/page.tsx`

**Change:**

```typescript
// OLD (hardcoded mapping)
const tierColors = {
  Bronze: "#CD7F32",
  Silver: "#94a3b8",
  Gold: "#F59E0B",
  Platinum: "#818CF8",
}
const currentTierColor = tierColors[mockData.currentTier.name]

// NEW (from backend)
const currentTierColor = mockData.featuredMission.tier.color
```

**Apply to:**
- Circular progress stroke color
- Trophy icons
- Progress bars
- Tier badges

---

## 6. UI SPECIFICATIONS

### 6.1 Component Hierarchy

```
HomePageLayout
├── CircularProgressSection
│   ├── ActiveMissionUI (status='active')
│   │   ├── CircularProgress (tier colored)
│   │   ├── CenterText ("300 of 500 sales")
│   │   └── RewardText ("Next: $50 Gift Card")
│   │
│   ├── CompletedMissionUI (status='completed')
│   │   ├── CircularProgress (100%, tier colored)
│   │   ├── CenterText ("COMPLETE! 🎉")
│   │   └── ClaimButton ("Claim $50 Gift Card")
│   │
│   ├── ClaimedMissionUI (status='claimed')
│   │   ├── AnimatedCircle (pulsing, tier colored)
│   │   ├── CenterIcon (⏳)
│   │   └── StatusText ("Processing your reward...")
│   │
│   └── NoMissionsUI (status='no_missions')
│       ├── Emoji (🎉)
│       ├── Header ("Amazing work!")
│       └── Message (dynamic from backend)
│
├── CurrentTierRewardsCard
├── UnlockNextTierCard
└── PerformanceSection

Overlays:
└── CongratsModal (showCongratsModal=true)
```

---

### 6.2 Color Specifications

| Element | Color Source | Example |
|---------|-------------|---------|
| Circle progress stroke | `tier.color` (dynamic) | #F59E0B (Gold) |
| Circle background | Fixed | #E5E7EB (gray-200) |
| Center text | Fixed | text-slate-900 |
| Reward text | Fixed | text-slate-600 |
| Button gradient | Fixed | from-pink-500 to-pink-600 |
| Processing spinner | `tier.color` (dynamic) | Animates with tier color |

---

### 6.3 Typography

| Element | Font Size | Weight | Color |
|---------|-----------|--------|-------|
| Section title | text-lg (18px) | font-semibold (600) | text-slate-900 |
| Circle center (large) | text-3xl (30px) | font-bold (700) | text-slate-900 |
| Circle center (small) | text-sm (14px) | font-medium (500) | text-slate-500 |
| Reward text | text-base (16px) | font-semibold (600) | text-slate-600 |
| Button text | text-base (16px) | font-semibold (600) | text-white |
| Processing text | text-base (16px) | font-normal (400) | text-slate-700 |
| Empty state header | text-xl (20px) | font-bold (700) | text-slate-900 |
| Empty state body | text-base (16px) | font-normal (400) | text-slate-700 |

---

### 6.4 Spacing

| Element | Spacing | Value |
|---------|---------|-------|
| Section padding (vertical) | py-2 | 8px |
| Section spacing (between elements) | space-y-3 | 12px |
| Circle size | 240px | Fixed |
| Stroke width | 24px | Fixed |
| Button height | py-3 | 48px total |
| Modal padding | p-8 | 32px |
| Empty state emoji size | text-6xl | 60px |

---

### 6.5 Animation Specifications

**Processing Ring (claimed status):**
```css
animation: pulse-ring 2s ease-in-out infinite

Keyframes:
  0%: opacity 1
  50%: opacity 0.6
  100%: opacity 1
```

**Button Hover:**
```css
hover:from-pink-600 hover:to-pink-700
transition-colors (default Tailwind)
```

**Circle Progress:**
```css
transition-all duration-500 ease-out
(Applied to strokeDashoffset)
```

---

## 7. EDGE CASES

### 7.1 Network Errors

**Scenario:** API call to `/api/dashboard/featured-mission` fails

**Handling:**
```typescript
const [error, setError] = useState(null)

useEffect(() => {
  fetch('/api/dashboard/featured-mission')
    .then(res => res.json())
    .then(data => setMockData(data))
    .catch(err => {
      setError('Failed to load missions. Please refresh.')
      // Show error toast or inline message
    })
}, [])

// UI
{error && (
  <div className="text-center py-8">
    <p className="text-red-600">{error}</p>
    <button onClick={() => window.location.reload()}>
      Retry
    </button>
  </div>
)}
```

---

### 7.2 Claim Button Double-Click

**Scenario:** User rapidly clicks [Claim Reward] multiple times

**Handling:**
```typescript
const [isClaimingLoading, setIsClaimingLoading] = useState(false)

const handleClaim = async () => {
  if (isClaimingLoading) return  // Prevent double-click

  setIsClaimingLoading(true)
  try {
    await fetch(`/api/missions/${mission.id}/claim`, { method: 'POST' })
  } finally {
    setIsClaimingLoading(false)
  }
}

// Button UI
<button
  onClick={handleClaim}
  disabled={isClaimingLoading}
  className={isClaimingLoading ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isClaimingLoading ? 'Claiming...' : `Claim $${rewardAmount} Gift Card`}
</button>
```

---

### 7.3 Modal Dismissed, Then Reopened

**Scenario:** User closes congrats modal, then navigates away and back

**Handling:**
```typescript
// Store in localStorage to prevent re-showing
const handleModalClose = () => {
  setShowModal(false)
  localStorage.setItem(
    `congrats_seen_${mission.id}`,
    new Date().toISOString()
  )
}

// Check on mount
useEffect(() => {
  const alreadySeen = localStorage.getItem(`congrats_seen_${mission.id}`)
  if (mockData.featuredMission.showCongratsModal && !alreadySeen) {
    setShowModal(true)
  }
}, [])
```

**Alternative (backend-driven):**
- Backend tracks `last_congrats_shown_at` in users table
- Only returns `showCongratsModal: true` once per fulfillment

---

### 7.4 Tier Change During Active Session

**Scenario:** User is on page, admin changes their tier in backend

**Handling:**
- Current implementation: User sees old data until page reload
- **Acceptable:** Since tier changes happen during checkpoint (midnight), users won't be actively using app
- **Enhancement (future):** Poll every 5 minutes for tier updates

**Current Decision:** No action needed (daily refresh is sufficient)

---

### 7.5 Mission Disabled While User Has Progress

**Scenario:** User has 200/500 on sales mission, admin disables sales mission

**Confirmed in Requirements:** This will NOT happen (admin doesn't disable mid-progress)

**If it does happen:**
- Backend fallback logic takes over
- Shows next available mission type (videos/likes/views)
- Progress on disabled mission is preserved in database (not deleted)

---

### 7.6 Zero Division Error

**Scenario:** Mission has `target_value = 0` (data error)

**Handling:**
```typescript
const progressPercentage = targetValue === 0
  ? 0
  : Math.min((currentProgress / targetValue) * 100, 100)
```

**Backend should validate:** `target_value > 0` for non-raffle missions

---

### 7.7 Negative Progress

**Scenario:** Sales adjustment makes `current_value` negative

**Handling:**
```typescript
const displayProgress = Math.max(0, currentProgress)
const progressPercentage = Math.max(0, Math.min((displayProgress / targetValue) * 100, 100))
```

**Backend should validate:** Adjustments cannot make progress negative

---

### 7.8 Very Large Numbers

**Scenario:** Mission has target of 1,000,000 views

**Handling:**
```typescript
const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

// UI
<span>{formatLargeNumber(currentProgress)} of {formatLargeNumber(targetValue)} views</span>
```

**Example:** "1.2M of 5M views"

---

## 8. TESTING CHECKLIST

### 8.1 Scenario Testing

**Test each scenario with mock data:**

- [ ] **Scenario 1 (active):** Circle shows progress, text says "300 of 500 sales"
- [ ] **Scenario 2 (completed):** Circle at 100%, shows [Claim] button
- [ ] **Scenario 3 (claimed):** Animated spinner, "Processing..." text
- [ ] **Scenario 4A (fulfilled → next):** Shows next mission automatically
- [ ] **Scenario 4B (fulfilled → none):** Shows empty state
- [ ] **Scenario 5 (videos fallback):** Text says "7 of 10 videos"
- [ ] **Scenario 5 (likes fallback):** Text says "800 of 1,000 likes"
- [ ] **Scenario 5 (views fallback):** Text says "40K of 50K views"
- [ ] **Scenario 6 (no missions):** Shows 🎉 empty state
- [ ] **Scenario 8 (tier change):** Circle color updates to new tier

---

### 8.2 Interaction Testing

- [ ] Click [Claim $50 Gift Card] → Status changes to 'claimed'
- [ ] Click [Claim] twice rapidly → Only one request sent
- [ ] Click [Got it!] on modal → Modal closes and doesn't reappear
- [ ] Navigate away and back → Data refetches correctly
- [ ] Reload page → Congrats modal doesn't reappear if already seen

---

### 8.3 Visual Testing

- [ ] Circle progress animates smoothly (500ms ease-out)
- [ ] Tier color applies correctly (Bronze, Silver, Gold, Platinum)
- [ ] Processing spinner pulses at correct speed (2s cycle)
- [ ] Button hover effect works (pink gradient darkens)
- [ ] Text wraps correctly on small screens
- [ ] Emoji displays correctly (🎉, ⏳)

---

### 8.4 Responsive Testing

- [ ] iPhone SE (375px width): All elements visible, no overflow
- [ ] iPhone 12 Pro (390px width): Proper spacing
- [ ] Pixel 5 (393px width): Circle centered
- [ ] iPhone 14 Pro Max (430px width): Not too much whitespace
- [ ] Desktop (600px+ width): Max width container works

---

### 8.5 Edge Case Testing

- [ ] API returns error → Shows error message
- [ ] API returns null mission → Shows empty state
- [ ] Target value is 0 → No division error
- [ ] Current progress is negative → Shows 0%
- [ ] Very large numbers → Formatted as "1.2M"
- [ ] Missing tier color → Falls back to default
- [ ] Missing reward amount → Handles gracefully

---

### 8.6 Backend Integration Testing

- [ ] GET /api/dashboard/featured-mission returns correct schema
- [ ] POST /api/missions/:id/claim updates status
- [ ] Refetch after claim shows new status
- [ ] Congrats modal shows on first login after fulfillment
- [ ] Empty state shows when no missions available
- [ ] Fallback priority works (sales → videos → likes → views)

---

## APPENDIX A: MISSION TYPE DISPLAY NAMES

| Backend Value | Display Name | Unit Text | Icon |
|---------------|--------------|-----------|------|
| `sales` | "Unlock Payday" | "sales" | 💰 (optional) |
| `videos` | "Lights, Camera, Go!" | "videos" | 🎬 (optional) |
| `likes` | "Road to Viral" | "likes" | ❤️ (optional) |
| `views` | "Eyes on You" | "views" | 👁️ (optional) |

**Reference:** Missions.md Section 2.1

---

## APPENDIX B: STATUS FLOW DIAGRAM

```
┌─────────────┐
│   ACTIVE    │  ← User working on mission
└──────┬──────┘
       │ (Progress reaches target)
       ↓
┌─────────────┐
│  COMPLETED  │  ← Can claim reward
└──────┬──────┘
       │ (User clicks [Claim])
       ↓
┌─────────────┐
│   CLAIMED   │  ← Waiting for admin
└──────┬──────┘
       │ (Admin fulfills)
       ↓
┌─────────────┐
│  FULFILLED  │  ← Moves to history
└──────┬──────┘
       │
       ├──→ Next mission exists? → Back to ACTIVE (new mission)
       │
       └──→ No more missions? → NO_MISSIONS state
```

---

## APPENDIX C: TIER COLOR REFERENCE

| Tier | Default Color | Source |
|------|--------------|--------|
| Bronze | #CD7F32 | tiers.tier_color |
| Silver | #94a3b8 | tiers.tier_color |
| Gold | #F59E0B | tiers.tier_color |
| Platinum | #818CF8 | tiers.tier_color |

**Note:** These are defaults - actual colors come from database (admin-configurable per client)

**Reference:** Loyalty.md Lines 1483-1490 (tiers table schema)

---

## APPENDIX D: RELATED DOCUMENTATION

- **Missions.md** - Section 8.2 (Status Definitions)
- **Missions.md** - Section 4.2 (Modifiable Fields)
- **Missions.md** - Section 2.1 (Mission Types)
- **Loyalty.md** - LOC 603-606 (Tier change handling)
- **Loyalty.md** - LOC 2012-2015 (Mission persistence)
- **Loyalty.md** - LOC 2387-2392 (Tier change behavior)
- **API_SPECIFICATION.md** - Section 3 (POST /api/missions/:id/claim)
- **Home Page Code** - `/home/jorge/Loyalty/Rumi/App Code/V1/app/home/page.tsx`

---

**END OF SPECIFICATION**

---

## IMPLEMENTATION CHECKLIST

For tracking implementation progress:

### Backend:
- [x] Create GET /api/dashboard/featured-mission endpoint (API_CONTRACTS.md)
- [x] Implement mission priority fallback logic (single query with IN clause)
- [x] Add congrats modal detection logic (timestamp comparison)
- [x] Document optimization strategy (ARCHITECTURE.md - Data Freshness Strategy)
- [ ] Implement database indexes for performance
- [ ] Test all scenarios with database queries
- [ ] Handle edge cases (null checks, validation)

### Frontend:
- [ ] Update mockData structure
- [ ] Implement status-based rendering
- [ ] Add claim button handler
- [ ] Create congratulations modal component
- [ ] Add no missions empty state
- [ ] Implement animated spinner for 'claimed'
- [ ] Update tier color references
- [ ] Add error handling
- [ ] Test responsive design
- [ ] Test all interactions

### Documentation:
- [x] Create comprehensive spec document
- [x] Update API_CONTRACTS.md with new endpoint (full schema + examples)
- [x] Document architectural decisions (ARCHITECTURE.md)
- [ ] Add frontend usage examples
- [ ] Document testing procedures
- [ ] Create database index implementation script

---

**Document Version:** 1.1
**Last Updated:** 2025-01-10 (Backend design phase complete)
**Next Review:** After implementation complete

---

## PROGRESS NOTES

**2025-01-10 - Backend Design Complete:**
- ✅ API contract fully defined (API_CONTRACTS.md)
- ✅ Mission priority fallback strategy decided (single optimized query)
- ✅ Congrats modal logic documented (timestamp comparison)
- ✅ Data freshness strategy documented (ARCHITECTURE.md)
- ✅ Architectural pattern locked in (Repository + Service)
- ⏸️ Frontend implementation NOT started
- ⏸️ Backend code implementation NOT started (design only)
