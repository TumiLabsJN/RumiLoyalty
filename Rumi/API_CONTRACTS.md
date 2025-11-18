# API CONTRACTS

**Project:** RumiAI Loyalty Platform
**Base URL:** `/api`
**Authentication:** Supabase JWT token in `Authorization: Bearer <token>` header
**Date Created:** 2025-01-10
**Status:** In Progress - Contract Definitions

---

## TABLE OF CONTENTS

1. [Authentication](#authentication)
   - [Login Start](#login-start)
   - [Signup](#signup)
   - [OTP Verification](#otp-verification)
   - [Welcome Back](#welcome-back)
   - [Forgot Password](#forgot-password)
2. [Home](#home)
3. [Missions](#missions)
4. [Mission History](#mission-history)
5. [Rewards](#rewards)
6. [Rewards History](#rewards-history)
7. [Tiers](#tiers)

---

# Authentication

## Login Start

**Page:** `/app/login/start/page.tsx`

### Endpoints

_To be defined_

---

## Signup

**Page:** `/app/login/signup/page.tsx`

### Endpoints

_To be defined_

---

## OTP Verification

**Page:** `/app/login/otp/page.tsx`

### Endpoints

_To be defined_

---

## Welcome Back

**Page:** `/app/login/wb/page.tsx`

### Endpoints

_To be defined_

---

## Forgot Password

**Page:** `/app/login/forgotpw/page.tsx`

### Endpoints

_To be defined_

---

# Home

**Page:** `/app/home/page.tsx`

## GET /api/dashboard/featured-mission

**Purpose:** Returns the ONE mission to display in circular progress (Section 1) with all necessary UI data.

### Request

```http
GET /api/dashboard/featured-mission
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface FeaturedMissionResponse {
  // Core status
  status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'

  // Mission data (null if status='no_missions')
  mission: {
    id: string                        // UUID for claim API call
    type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string               // Static per mission_type: "Unlock Payday" (sales), "Fan Favorite" (likes), "Road to Viral" (views), "Lights, Camera, Go!" (videos), "VIP Raffle" (raffle)

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

### Example Responses

**Active Mission:**
```json
{
  "status": "active",
  "mission": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "sales_dollars",
    "displayName": "Unlock Payday",
    "currentProgress": 300,
    "targetValue": 500,
    "progressPercentage": 60,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales_dollars"
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
    "type": "sales_dollars",
    "displayName": "Unlock Payday",
    "currentProgress": 500,
    "targetValue": 500,
    "progressPercentage": 100,
    "rewardType": "gift_card",
    "rewardAmount": 50,
    "rewardCustomText": null,
    "unitText": "sales_dollars"
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

### Business Logic

#### **Display Name Mapping (Static per Mission Type):**

Mission display names are **static** and stored in `missions.display_name`. They do NOT change based on target value.

| Mission Type | `display_name` | Example Targets | Notes |
|--------------|----------------|-----------------|-------|
| `sales_dollars` | "Unlock Payday" | $500, $1K, $5K | Same name for all sales missions in dollars mode |
| `sales_units` | "Unlock Payday" | 100, 500, 1000 units | Same name for all sales missions in units mode |
| `likes` | "Fan Favorite" | 5K, 50K, 100K likes | Same name regardless of like count target |
| `views` | "Road to Viral" | 10K, 100K, 1M views | Same name regardless of view count target |
| `videos` | "Lights, Camera, Go!" | 10, 20, 50 videos | Same name regardless of video count target |
| `raffle` | "VIP Raffle" | N/A (no target) | Raffle missions always use this name |

**Backend Implementation:**
```typescript
// Auto-populate display_name on mission creation
function getDisplayNameForMissionType(missionType: string): string {
  const displayNameMap = {
    'sales_dollars': 'Unlock Payday',
    'sales_units': 'Unlock Payday',
    'likes': 'Fan Favorite',
    'views': 'Road to Viral',
    'videos': 'Lights, Camera, Go!',
    'raffle': 'VIP Raffle'
  }
  return displayNameMap[missionType]
}
```

#### **Mission Priority (Fallback Order):**
1. Raffle (VIP Raffle) - **ONLY if activated=true**
2. Sales Dollars (Unlock Payday)
3. Sales Units (Unlock Payday)
4. Videos (Lights, Camera, Go!)
5. Likes (Fan Favorite)
6. Views (Road to Viral)

**Implementation:** Single query with IN clause, sort by priority in application layer

```sql
-- Single optimized query (vs 4 sequential queries)
-- IMPORTANT: Excludes 'claimed' missions - they remain on Missions page but disappear from Home
-- IMPORTANT: Includes 'raffle' missions ONLY if activated=true (surprise raffle feature!)
SELECT m.*, mp.*, b.*
FROM missions m
LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = $userId
LEFT JOIN rewards b ON m.reward_id = b.id
WHERE m.client_id = $clientId
  AND m.mission_type IN ('raffle', 'sales_dollars', 'sales_units', 'videos', 'likes', 'views')
  AND m.tier_eligibility = $currentTier
  AND m.enabled = true
  -- Raffle-specific condition: Only show if activated=true (surprise feature)
  AND (m.mission_type != 'raffle' OR m.activated = true)
  -- Exclude if user already participated in this raffle
  AND NOT EXISTS (
    SELECT 1 FROM raffle_participations rp
    WHERE rp.mission_id = m.id AND rp.user_id = $userId
  )
  AND (mp.status IN ('active', 'completed') OR mp.status IS NULL)  -- Excludes 'claimed' missions
ORDER BY
  CASE m.mission_type
    WHEN 'raffle' THEN 0      -- 🎰 HIGHEST PRIORITY (surprise raffle!)
    WHEN 'sales_dollars' THEN 1
    WHEN 'sales_units' THEN 2
    WHEN 'videos' THEN 3
    WHEN 'likes' THEN 4
    WHEN 'views' THEN 5
  END
LIMIT 1
```

**Performance:** ~80ms (single query vs 200ms for sequential)

---

#### **Status Computation:**
- `active`: User has progress record with status='active'
- `completed`: Progress >= target, status='completed', NOT yet claimed
- `no_missions`: No missions found matching criteria

**Note:** `claimed` status is intentionally EXCLUDED from home page. Once a mission is claimed, it:
- ✅ Remains visible on Missions page (with "Claimed" badge)
- ❌ Disappears from Home page (replaced by next available mission)
- ✅ Moves to Mission History after fulfillment

**Design Decision:**
Backend calculates and sends `progressPercentage` for featured mission to ensure:
- ✅ Single source of truth for mission progress calculation
- ✅ Frontend only handles SVG circle geometry (radius, circumference, strokeOffset)
- ✅ Business logic stays in backend (Service layer)

Frontend should receive percentage and use it for display only. SVG math (circle radius, circumference calculations) remains in frontend as pure UI presentation logic.

---

#### **Congratulations Modal Detection:**

**Logic:** Compare `mission_progress.fulfilled_at` with `users.last_login_at`

```typescript
// Check if any mission was fulfilled AFTER user's last login
const recentFulfillment = await supabase
  .from('mission_progress')
  .select(`
    fulfilled_at,
    missions!inner (
      rewards (value_data)
    )
  `)
  .eq('user_id', userId)
  .eq('status', 'fulfilled')
  .gt('fulfilled_at', user.last_login_at)  // ← Key comparison
  .order('fulfilled_at', { ascending: false })
  .limit(1)
  .single()

// If found, show modal ONCE
if (recentFulfillment) {
  showCongratsModal = true
  congratsMessage = `Your $${recentFulfillment.missions.rewards.value_data.amount} Gift Card has been delivered!`
}

// After rendering response, update last_login_at
// This prevents modal from showing again on next login
await supabase
  .from('users')
  .update({ last_login_at: new Date().toISOString() })
  .eq('id', userId)
```

**Why this works:**
- ✅ No schema changes needed (uses existing `last_login_at` field)
- ✅ Automatic "mark as seen" (updating timestamp prevents re-showing)
- ✅ Simple timestamp comparison
- ✅ Works across multiple logins/sessions

**Important:** Update `last_login_at` AFTER checking for fulfillments, not before

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch mission data"
}
```

---

---

## GET /api/dashboard

**Purpose:** Returns ALL data for the home page in a single optimized call. This is the main unified endpoint that powers the entire home screen.

### Request

```http
GET /api/dashboard
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface DashboardResponse {
  // ============================================
  // USER & TIER INFO (for header and tier badges)
  // ============================================
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    email: string                       // From users.email
    clientName: string                  // From clients.company_name
  }

  // Client configuration (for UI formatting)
  client: {
    id: string                          // UUID from clients.id
    vipMetric: 'sales' | 'units'        // From clients.vip_metric - determines VIP progression tracking
    vipMetricLabel: string              // Display label: "sales" (sales mode) OR "units" (units mode)
  }

  // Current tier data
  currentTier: {
    id: string                          // UUID from tiers.id
    name: string                        // From tiers.tier_name ("Bronze", "Silver", "Gold", "Platinum")
    color: string                       // From tiers.tier_color (hex, e.g., "#F59E0B")
    order: number                       // From tiers.tier_order (1, 2, 3, 4)
    checkpointExempt: boolean           // From tiers.checkpoint_exempt (DB snake_case → API camelCase)
  }

  // Next tier data (null if already at highest tier)
  nextTier: {
    id: string                          // UUID
    name: string                        // Next tier name
    color: string                       // Next tier color (for future use)
    minSalesThreshold: number           // From tiers.sales_threshold (DB snake_case → API camelCase)
  } | null

  // ============================================
  // TIER PROGRESSION (checkpoint-based tracking)
  // ============================================
  tierProgress: {
    currentValue: number                // Current metric value ($ or units based on client.vipMetric)
    targetValue: number                 // Target metric value ($ or units based on client.vipMetric)
    progressPercentage: number          // Computed: (currentValue / targetValue) * 100

    // Pre-formatted display strings (backend handles formatting)
    currentFormatted: string            // "$2,500" (sales mode) OR "2,500 units" (units mode)
    targetFormatted: string             // "$5,000" (sales mode) OR "5,000 units" (units mode)

    checkpointExpiresAt: string         // From users.next_checkpoint_at (ISO 8601)
    checkpointExpiresFormatted: string  // Human readable: "March 15, 2025"
    checkpointMonths: number            // From clients.checkpoint_months (e.g., 4)
  }

  // ============================================
  // FEATURED MISSION (circular progress section)
  // ============================================
  // This section uses the SAME data structure as GET /api/dashboard/featured-mission
  // (See above for full schema and examples)
  featuredMission: {
    status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions' | 'raffle_available'
    mission: {
      id: string
      type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
      displayName: string  // Static mapping from missions.display_name (see Display Name Mapping below)

      // Progress fields (for non-raffle missions)
      currentProgress: number             // Raw value (0 for raffle)
      targetValue: number                 // Raw value (1 for raffle)
      progressPercentage: number          // 0-100 for regular missions, 0 for raffle

      // Pre-formatted display strings (backend handles formatting)
      currentFormatted: string            // "$350" (sales) OR "350" (units/videos) OR null (raffle)
      targetFormatted: string             // "$500" (sales) OR "500" (units/videos) OR null (raffle)
      targetText: string                  // "of $500 sales" OR "of 20 videos" OR "Chance to win" (raffle)
      progressText: string                // "$350 of $500 sales" OR "Chance to win $500" (raffle)

      // Raffle-specific fields (null for non-raffle missions)
      isRaffle: boolean                   // true if mission_type='raffle', false otherwise
      raffleEndDate: string | null        // ISO 8601 - When raffle drawing happens
      // NOTE: Prize name comes from rewardCustomText (physical_gift) or rewardAmount (gift_card)

      // Reward details
      rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
      rewardAmount: number | null         // For gift_card, spark_ads (e.g., 50 for "$50")
      rewardCustomText: string | null     // For physical_gift, experience (e.g., "iPhone 16 Pro")
    } | null
    tier: {
      name: string
      color: string
    }
    showCongratsModal: boolean
    congratsMessage: string | null
    supportEmail: string
    emptyStateMessage: string | null
  }

  // ============================================
  // CURRENT TIER REWARDS (rewards showcase card)
  // ============================================
  // Backend handles display logic:
  // - Sorted by rewards.display_order ASC
  // - Limited to 4 rewards (top priority rewards only)
  // - Frontend receives pre-sorted, pre-limited data
  currentTierRewards: Array<{
    id: string                          // UUID from rewards.id
    type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    name: string                        // From rewards.name (auto-generated, simple form)
    displayText: string                 // Backend-generated UI-ready text with prefixes and duration
    description: string                 // From rewards.description (15 char max for physical_gift/experience)
    valueData: {                        // From rewards.value_data (JSONB) - transformed to camelCase
      amount?: number                   // For gift_card, spark_ads
      percent?: number                  // For commission_boost, discount
      duration_days?: number            // For commission_boost, discount
    } | null
    redemptionQuantity: number          // From rewards.redemption_quantity
    displayOrder: number                // From rewards.display_order (used for sorting)
  }>

  totalRewardsCount: number             // Total rewards available at user's tier (for "And more!" logic)
}
```

### Example Response

```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "handle": "creatorpro",
    "email": "creator@example.com",
    "clientName": "Stateside Growers"
  },
  "client": {
    "id": "client-uuid-123",
    "vipMetric": "sales",
    "vipMetricLabel": "sales"
  },
  "currentTier": {
    "id": "tier-gold-uuid",
    "name": "Gold",
    "color": "#F59E0B",
    "order": 3,
    "checkpointExempt": false
  },
  "nextTier": {
    "id": "tier-platinum-uuid",
    "name": "Platinum",
    "color": "#818CF8",
    "minSalesThreshold": 5000
  },
  "tierProgress": {
    "currentValue": 4200,
    "targetValue": 5000,
    "progressPercentage": 84,
    "currentFormatted": "$4,200",
    "targetFormatted": "$5,000",
    "checkpointExpiresAt": "2025-03-15T00:00:00Z",
    "checkpointExpiresFormatted": "March 15, 2025",
    "checkpointMonths": 4
  },
  "featuredMission": {
    "status": "active",
    "mission": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "sales_dollars",
      "displayName": "Unlock Payday",
      "currentProgress": 300,
      "targetValue": 500,
      "progressPercentage": 60,
      "currentFormatted": "$300",
      "targetFormatted": "$500",
      "targetText": "of $500 sales",
      "progressText": "$300 of $500 sales",
      "isRaffle": false,
      "raffleEndDate": null,
      "rewardType": "gift_card",
      "rewardAmount": 50,
      "rewardCustomText": null
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
}
```

### Example Response 2: Surprise Raffle (Featured Mission)

**Scenario:** Admin activates a surprise raffle. User opens app and sees raffle FIRST (highest priority).

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "creatorpro",
    "email": "creator@example.com",
    "clientName": "Stateside Growers"
  },
  "client": {
    "id": "client-uuid-123",
    "vipMetric": "sales",
    "vipMetricLabel": "sales"
  },
  "currentTier": {
    "id": "tier-gold-uuid",
    "name": "Gold",
    "color": "#F59E0B",
    "order": 3,
    "checkpointExempt": false
  },
  "nextTier": {
    "id": "tier-platinum-uuid",
    "name": "Platinum",
    "color": "#818CF8",
    "minSalesThreshold": 5000
  },
  "tierProgress": {
    "currentValue": 4200,
    "targetValue": 5000,
    "progressPercentage": 84,
    "currentFormatted": "$4,200",
    "targetFormatted": "$5,000",
    "checkpointExpiresAt": "2025-03-15T00:00:00Z",
    "checkpointExpiresFormatted": "March 15, 2025",
    "checkpointMonths": 4
  },
  "featuredMission": {
    "status": "raffle_available",
    "mission": {
      "id": "mission-raffle-surprise-2025",
      "type": "raffle",
      "displayName": "VIP Raffle",
      "currentProgress": 0,
      "targetValue": 1,
      "progressPercentage": 0,
      "currentFormatted": null,
      "targetFormatted": null,
      "targetText": "Chance to win",
      "progressText": "Chance to win iPhone 16 Pro",
      "isRaffle": true,
      "raffleEndDate": "2025-02-01T23:59:59Z",
      "rewardType": "physical_gift",
      "rewardAmount": null,
      "rewardCustomText": "iPhone 16 Pro"
    },
    "tier": {
      "name": "Gold",
      "color": "#F59E0B"
    },
    "showCongratsModal": false,
    "congratsMessage": null,
    "supportEmail": "support@statesidegrowers.com",
    "emptyStateMessage": null
  },
  "currentTierRewards": [
    {
      "id": "reward-1-uuid",
      "type": "experience",
      "name": "VIP Event Access",
      "displayText": "Win a VIP Event Access",
      "description": "Get exclusive access to VIP events and meetups",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 1
    },
    {
      "id": "reward-2-uuid",
      "type": "physical_gift",
      "name": "Wireless Headphones",
      "displayText": "Win a Wireless Headphones",
      "description": "Premium wireless headphones",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 2
    },
    {
      "id": "reward-3-uuid",
      "type": "gift_card",
      "name": "$50 Gift Card",
      "displayText": "$50 Gift Card",
      "description": "Amazon gift card",
      "valueData": {
        "amount": 50
      },
      "redemptionQuantity": 2,
      "displayOrder": 3
    },
    {
      "id": "reward-4-uuid",
      "type": "commission_boost",
      "name": "5% Pay Boost",
      "displayText": "+5% Pay boost for 30 Days",
      "description": "Temporary commission increase",
      "valueData": {
        "percent": 5,
        "duration_days": 30
      },
      "redemptionQuantity": 1,
      "displayOrder": 4
    }
  ],
  "totalRewardsCount": 8
}
```

### Business Logic

#### **User & Tier Info Query:**

```sql
-- Get user data with tier info
SELECT
  u.id,
  u.tiktok_handle as handle,
  u.email,
  c.company_name as client_name,
  t.id as tier_id,
  t.tier_name,
  t.tier_color,
  t.tier_order,
  u.tier_achieved_at,
  u.next_checkpoint_at
FROM users u
JOIN clients c ON u.client_id = c.id
JOIN tiers t ON u.current_tier = t.id
WHERE u.id = $userId
```

---

#### **Next Tier Query:**

```sql
-- Get next tier in sequence
SELECT
  t.id,
  t.tier_name,
  t.tier_color,
  t.sales_threshold
FROM tiers t
WHERE t.client_id = $clientId
  AND t.tier_order = $currentTierOrder + 1
LIMIT 1
```

**If no result:** User is at highest tier, return `nextTier: null`

---

#### **Tier Progress Calculation:**

```sql
-- Tier Progress Calculation (read from precomputed users table)
SELECT
  CASE
    WHEN c.vip_metric = 'sales' THEN u.checkpoint_sales_current
    WHEN c.vip_metric = 'units' THEN u.checkpoint_units_current
  END as metric_total,
  u.manual_adjustments_total,
  u.manual_adjustments_units
FROM users u
JOIN clients c ON c.id = u.client_id
WHERE u.id = $userId
  AND u.client_id = $clientId;
```

**Computation:**
```typescript
// Total checkpoint value = Precomputed checkpoint total + manual adjustments
const currentValue = (client.vip_metric === 'sales')
  ? (user.checkpoint_sales_current + user.manual_adjustments_total)
  : (user.checkpoint_units_current + user.manual_adjustments_units)

const progressPercentage = nextTier
  ? Math.min((currentValue / nextTier.threshold) * 100, 100)
  : 100  // Already at max tier

// Format display strings based on vipMetric
let currentFormatted, targetFormatted, vipMetricLabel

if (client.vipMetric === 'sales') {
  currentFormatted = `$${currentValue.toLocaleString()}`  // "$4,200"
  targetFormatted = `$${nextTier.threshold.toLocaleString()}`  // "$5,000"
  vipMetricLabel = 'sales'
} else {
  currentFormatted = `${currentValue.toLocaleString()} units`  // "4,200 units"
  targetFormatted = `${nextTier.threshold.toLocaleString()} units`  // "5,000 units"
  vipMetricLabel = 'units'
}

const checkpointExpiresFormatted = new Date(user.next_checkpoint_at)
  .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
```

**Design Decisions:**

1. **Backend Formats All Display Strings:**
   - ✅ `currentFormatted`, `targetFormatted`, `progressText` all pre-formatted
   - ✅ Formatting based on `client.vipMetric` setting
   - ✅ Sales mode: "$4,200" | Units mode: "4,200 units"
   - ✅ Single source of truth for formatting logic

2. **VIP Metric-Aware Formatting:**
   - **Sales Mode:** `vipMetric = 'sales'` → "$" prefix, no suffix
   - **Units Mode:** `vipMetric = 'units'` → No prefix, " units" suffix
   - **Decision from user:** "2,500 units of 5,000 units" (explicit 'units' on both)

3. **Mission Progress Text Formatting:**

```typescript
// Backend generates 3 text fields for mission progress
function formatMissionProgress(mission) {
  const { type, current_value, target_value } = mission

  let currentFormatted, targetFormatted, targetText, progressText, unitLabel

  switch (type) {
    case 'sales_dollars':
      currentFormatted = `$${current_value.toLocaleString()}`
      targetFormatted = `$${target_value.toLocaleString()}`
      unitLabel = 'sales'
      break

    case 'sales_units':
      currentFormatted = current_value.toLocaleString()
      targetFormatted = target_value.toLocaleString()
      unitLabel = 'units'
      break

    case 'videos':
    case 'likes':
    case 'views':
      currentFormatted = current_value.toLocaleString()
      targetFormatted = target_value.toLocaleString()
      unitLabel = type  // 'videos', 'likes', 'views'
      break

    case 'raffle':
      // Raffle missions have no progress tracking
      currentFormatted = null
      targetFormatted = null
      targetText = 'Chance to win'

      // Format prize display from reward info (not rafflePrizeName!)
      let prizeDisplay
      if (mission.reward.type === 'gift_card' || mission.reward.type === 'spark_ads') {
        prizeDisplay = `$${mission.reward.value_data.amount}`  // "$500"
      } else if (mission.reward.type === 'physical_gift' || mission.reward.type === 'experience') {
        prizeDisplay = mission.reward.description  // "iPhone 16 Pro"
      } else {
        prizeDisplay = mission.reward.name  // Fallback
      }

      progressText = `Chance to win ${prizeDisplay}`

      return {
        currentFormatted,
        targetFormatted,
        targetText,
        progressText,
        isRaffle: true,
        raffleEndDate: mission.raffle_end_date
        // NOTE: No rafflePrizeName! Use rewardCustomText instead
      }
  }

  targetText = `of ${targetFormatted} ${unitLabel}`
  progressText = `${currentFormatted} ${targetText}`

  return {
    currentFormatted,
    targetFormatted,
    targetText,
    progressText,
    isRaffle: false,
    raffleEndDate: null
  }
}
```

**Examples:**
   - **sales_dollars:**
     - `currentFormatted`: "$350"
     - `targetText`: "of $500 sales"
     - `progressText`: "$350 of $500 sales"
     - `isRaffle`: false
   - **sales_units:**
     - `currentFormatted`: "350"
     - `targetText`: "of 500 units"
     - `progressText`: "350 of 500 units"
     - `isRaffle`: false
   - **videos:**
     - `currentFormatted`: "8"
     - `targetText`: "of 20 videos"
     - `progressText`: "8 of 20 videos"
     - `isRaffle`: false
   - **raffle (gift_card reward):**
     - `currentFormatted`: null
     - `targetText`: "Chance to win"
     - `progressText`: "Chance to win $500"
     - `isRaffle`: true
     - `raffleEndDate`: "2025-02-01T23:59:59Z"
     - `rewardType`: "gift_card"
     - `rewardAmount`: 500
   - **raffle (physical_gift reward):**
     - `currentFormatted`: null
     - `targetText`: "Chance to win"
     - `progressText`: "Chance to win iPhone 16 Pro"
     - `isRaffle`: true
     - `raffleEndDate`: "2025-02-01T23:59:59Z"
     - `rewardType`: "physical_gift"
     - `rewardCustomText`: "iPhone 16 Pro"

**Frontend Conditional UI for Raffle:**

```typescript
// Frontend checks isRaffle to render different UI
if (mission.isRaffle) {
  // Raffle-specific circular progress UI
  // Prize display comes from reward info (not rafflePrizeName!)
  const prizeDisplay = mission.rewardCustomText || `$${mission.rewardAmount}`

  return (
    <div className="circular-progress">
      {/* NO PROGRESS RING for raffles */}
      <div className="center-text">
        <span className="large-text">{mission.targetText}</span>  {/* "Chance to win" */}
        <span className="small-text">{prizeDisplay}</span>  {/* "iPhone 16 Pro" or "$500" */}
      </div>
      <Button>
        <CloverIcon />  {/* 4-leaf clover icon */}
        Join Raffle
      </Button>
    </div>
  )
} else {
  // Regular mission UI with progress ring
  return (
    <div className="circular-progress">
      <svg>/* Progress ring based on progressPercentage */</svg>
      <div className="center-text">
        <span className="large-text">{mission.currentFormatted}</span>  {/* "$350" */}
        <span className="small-text">{mission.targetText}</span>  {/* "of $500 sales" */}
      </div>
      <p>Next: {reward.name}</p>
    </div>
  )
}
```

**Frontend Responsibilities:**
- ✅ Check `isRaffle` flag to conditionally render UI
- ✅ Hide progress ring for raffles (no progress tracking)
- ✅ Show "Join Raffle" button with clover icon
- ✅ Display prize from `rewardCustomText` (physical_gift) or `rewardAmount` (gift_card)
- ✅ No need for `rafflePrizeName` - use reward info directly!

Frontend should NOT recalculate percentages or format numbers. Backend provides all UI-ready strings to ensure:
- ✅ Consistent formatting across all clients
- ✅ i18n-ready (future: different locales/currencies)
- ✅ Business logic centralized
- ✅ Frontend only handles SVG geometry, layout, and conditional rendering

**Tier Expiration Business Rules:**

| Tier Configuration (DB) | Expires? | Frontend Display |
|------------|----------|------------------|
| **checkpoint_exempt = true** | ❌ Never | Hide expiration date entirely. No tooltip needed. |
| **checkpoint_exempt = false** | ✅ Yes | Show "{TierName} Expires on {Date}" with ℹ️ tooltip explaining checkpoint recalculation. |

**Logic:**
- Tiers with `checkpoint_exempt = true` (DB) are guaranteed (typically first tier, but configurable by admin)
- Tiers with `checkpoint_exempt = false` (DB) are recalculated at each checkpoint based on sales performance
- Backend sends `checkpointExempt` field (camelCase) in currentTier object

**Frontend Implementation:**
```typescript
// Check if current tier is exempt from checkpoints
const tierExpires = !currentTier.checkpointExempt  // camelCase

// Only show expiration if tier is NOT exempt
{tierExpires && (
  <p>{currentTier.name} Expires on {tierProgress.checkpointExpiresFormatted}</p>
)}
```

**Tooltip Message (for higher tiers only):**
> "We review your VIP level at each checkpoint based on recent sales. Keep selling to stay {currentTierName} or move up!"

---

## API Naming Conventions

**Database → API Transformation:**

The API layer transforms database snake_case to JavaScript-idiomatic camelCase:

| Database Field (snake_case) | API Response Field (camelCase) | Example |
|------------------------------|--------------------------------|---------|
| `tiers.checkpoint_exempt` | `currentTier.checkpointExempt` | `false` |
| `clients.vip_metric` | `client.vipMetric` | `"sales"` |
| `clients.checkpoint_months` | `tierProgress.checkpointMonths` | `4` |
| `users.next_checkpoint_at` | `tierProgress.checkpointExpiresAt` | `"2025-03-15T00:00:00Z"` |
| `tiers.tier_name` | `currentTier.name` | `"Gold"` |
| `tiers.tier_color` | `currentTier.color` | `"#F59E0B"` |
| `users.tiktok_handle` | `user.handle` | `"creatorpro"` |

**Backend Transformation Example:**
```typescript
// Service layer transforms DB response to API response
function transformDashboardResponse(dbData) {
  return {
    client: {
      id: dbData.client_id,
      vipMetric: dbData.vip_metric  // snake_case → camelCase
    },
    currentTier: {
      name: dbData.tier_name,
      checkpointExempt: dbData.checkpoint_exempt  // snake_case → camelCase
    },
    tierProgress: {
      checkpointMonths: dbData.checkpoint_months,
      checkpointExpiresAt: dbData.next_checkpoint_at
    }
  }
}
```

**Why camelCase?**
- ✅ JavaScript/TypeScript native convention
- ✅ Industry standard (Stripe, GitHub, Google APIs)
- ✅ No transformation needed in frontend: `response.vipMetric` (not `response.vip_metric`)
- ✅ TypeScript/ESLint defaults expect camelCase

---

#### **Current Tier Rewards Query:**

```sql
-- Get rewards for current tier (pre-sorted and limited by backend)
SELECT
  r.id,
  r.type,
  r.name,
  r.description,
  r.value_data,
  r.redemption_quantity,
  r.display_order
FROM rewards r
WHERE r.tier_eligibility = $currentTierId
  AND r.client_id = $clientId
  AND r.enabled = true
ORDER BY r.display_order ASC  -- Backend sorts by admin-defined order
LIMIT 4;                      -- Backend limits to top 4 rewards

-- Get total count for "And more!" logic
SELECT COUNT(*) as total_count
FROM rewards r
WHERE r.tier_eligibility = $currentTierId
  AND r.client_id = $clientId
  AND r.enabled = true;
```

**Backend Responsibilities:**
- ✅ Sorts rewards by `display_order ASC` (admin-defined priority)
- ✅ Limits to 4 rewards (reduces payload size)
- ✅ Provides `totalRewardsCount` (for "And more!" message)
- ✅ Generates `displayText` for each reward (UI-ready with prefixes and duration)
- ✅ Transforms `value_data` from snake_case to camelCase (`valueData`)

**Backend displayText Generation:**
```typescript
function generateDisplayText(reward) {
  const { type, value_data } = reward

  switch (type) {
    case 'gift_card':
      return `$${value_data.amount} Gift Card`

    case 'commission_boost':
      return `+${value_data.percent}% Pay boost for ${value_data.duration_days} Days`

    case 'spark_ads':
      return `+$${value_data.amount} Ads Boost`

    case 'discount':
      return `+${value_data.percent}% Deal Boost for ${value_data.duration_days} Days`

    case 'physical_gift':
      return `Win a ${reward.name}`

    case 'experience':
      return `Win a ${reward.name}`

    default:
      return reward.name
  }
}
```

**Frontend Responsibilities:**
- ✅ Receives pre-sorted, pre-limited data (no sorting/limiting needed)
- ✅ Maps `type` to UI icons (e.g., `gift_card` → Gift icon, `commission_boost` → HandCoins icon)
- ✅ Displays `displayText` directly (no formatting needed)
- ✅ Shows "And more!" if `totalRewardsCount > 4`

**Performance Benefits:**
- 📉 50% less data transferred (4 rewards vs 8+ rewards)
- ⚡ No client-side sorting overhead (O(1) vs O(n log n))
- 🚀 Faster page loads (smaller API response)

**Example:**
```typescript
// Frontend receives (already sorted and limited):
currentTierRewards = [
  { type: "experience", displayOrder: 1 },
  { type: "physical_gift", displayOrder: 2 },
  { type: "gift_card", displayOrder: 3 },
  { type: "commission_boost", displayOrder: 4 }
]
totalRewardsCount = 8  // Total available at tier

// Frontend just renders (no sorting needed):
displayedRewards = currentTierRewards  // Use as-is
hasMoreRewards = totalRewardsCount > 4  // true (show "And more!")
```

Future: Admin dashboard will allow drag/drop reordering of `display_order` values, which backend will use as the primary sort order.

---

#### **Featured Mission Data:**

This section reuses the exact same logic as `GET /api/dashboard/featured-mission` endpoint (see above for full details on mission priority, status computation, and congrats modal detection).

---

### Performance Optimization

**Query Strategy:**
- All queries run in parallel using `Promise.all()`
- No sequential blocking
- Expected total response time: ~150-200ms

```typescript
const [
  userData,
  nextTierData,
  tierProgressData,
  featuredMissionData,
  rewardsData
] = await Promise.all([
  getUserWithTierInfo(userId),
  getNextTier(clientId, currentTierOrder),
  getTierProgress(userId, tierAchievedAt, nextCheckpointAt),
  getFeaturedMission(userId),  // Reuse existing function
  getCurrentTierRewards(currentTierId)
])
```

---

### Frontend Code Cleanup

**After backend implements display logic, remove the following from `/app/home/page.tsx`:**

#### **Lines 486-500 - DELETE Priority Sorting Object:**
```typescript
// ❌ DELETE THIS - Backend handles sorting now
const benefitPriority = {
  experience: 1,
  physical_gift: 2,
  gift_card: 3,
  commission_boost: 4,
  spark_ads: 5,
  discount: 6,
}

const sortedBenefits = [...currentTierBenefits].sort((a, b) => {
  const aPriority = benefitPriority[a.type as keyof typeof benefitPriority] || 999
  const bPriority = benefitPriority[b.type as keyof typeof benefitPriority] || 999
  return aPriority - bPriority
})
```

#### **Lines 502-504 - DELETE Limit Logic:**
```typescript
// ❌ DELETE THIS - Backend sends exactly 4 rewards
const topBenefits = sortedBenefits.slice(0, 4)
const hasMoreBenefits = sortedBenefits.length > 4
```

#### **REPLACE WITH - Simplified Logic:**
```typescript
// ✅ NEW: Just use backend data directly
const displayedBenefits = currentTierBenefits  // Already sorted and limited!
const hasMoreBenefits = totalRewardsCount > 4  // Use backend count
```

#### **Lines 796-802 - UPDATE Rendering:**
```typescript
// BEFORE:
{topBenefits.map((benefit, index) => (

// AFTER (change variable name):
{displayedBenefits.map((benefit, index) => (
```

**Lines Removed:** ~18 lines of sorting/limiting logic
**Result:** Cleaner code, backend handles business logic

**KEEP These (UI concerns):**
- ✅ `getIconForBenefitType()` - Icon mapping (lines 465-484)
- ✅ `formatBenefitText()` - Text formatting with + signs (lines 507-530)
- ✅ Rendering logic (lines 789-812)

---

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "User not found or not associated with a client"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch dashboard data"
}
```

---

### Frontend Usage Notes

**Page:** `/app/home/page.tsx`

**Data Sections Mapping:**

1. **Header:** Uses `user.handle` → "Hi, @creatorpro"
2. **Circular Progress Section:** Uses `featuredMission.*`
3. **Current Rewards Card:** Uses `currentTierRewards` (top 4 items)
4. **Unlock Next Tier Card:** Uses `tierProgress.*` + `nextTier.*` + `currentTier.*`

**Formatting Functions Needed:**
- `formatCurrency(num)` - For sales numbers
- `formatRewardText(type, name, valueData)` - For reward display
- Date formatting for checkpoint expiration

**Important:** This single endpoint eliminates the need for multiple separate API calls and reduces network overhead.

---

# Missions

**Page:** `/app/missions/page.tsx`

## GET /api/missions

**Purpose:** Returns all active and available missions for the current user.

### Request

```http
GET /api/missions
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

_To be defined_

---

## POST /api/missions/:id/claim

**Purpose:** Creator claims a completed mission reward. Transitions mission_progress status from `completed` to `completed` (stays same) and creates a redemption record with status `claimed`.

**Source:** Flow documented in MissionsRewardsFlows.md (Standard Missions Flow Step 4, Discount Flow Step 3, Commission Boost Flow Step 3, Physical Gift Flow Step 3)

### Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Request Body Schema

```typescript
interface ClaimMissionRequest {
  // Optional: Only required for scheduled reward types (discount, commission_boost)
  scheduled_activation_at?: string  // ISO 8601 timestamp
                                    // Required if reward type is 'discount' or 'commission_boost'
                                    // Not used for: gift_card, spark_ads, physical_gift, experience
}
```

### Request Body Examples

**Instant Reward (Gift Card, Spark Ads, Experience):**
```json
{}
```

**Physical Gift (No scheduling needed):**
```json
{}
```

**Discount (Requires scheduling):**
```json
{
  "scheduled_activation_at": "2025-01-15T14:00:00Z"
}
```

**Commission Boost (Requires activation date, time auto-set to 6 PM EST):**
```json
{
  "scheduled_activation_at": "2025-01-20T23:00:00Z"
}
```

### Response Schema

```typescript
interface ClaimMissionResponse {
  success: boolean
  message: string  // User-facing success message

  // Created redemption record
  redemption: {
    id: string                        // UUID of created redemption
    status: "claimed"                 // Always "claimed" immediately after claim
    reward_type: "gift_card" | "commission_boost" | "discount" | "spark_ads" | "physical_gift" | "experience"
    claimed_at: string                // ISO 8601 timestamp

    // Reward details (for confirmation display)
    reward: {
      id: string
      name: string                    // e.g., "$25 Gift Card", "5% Commission Boost"
      type: string
      value_data: {
        amount?: number               // For gift_card, spark_ads
        percent?: number              // For commission_boost, discount
        duration_days?: number        // For commission_boost, discount
      } | null
    }

    // Scheduling info (only present for discount, commission_boost)
    scheduled_activation_at?: string  // ISO 8601 timestamp

    // Next steps (UI hints based on reward type)
    next_steps: {
      action: "wait_fulfillment" | "schedule_activation" | "provide_shipping" | "provide_size_and_shipping"
      message: string                 // User-facing instruction
    }
  }

  // Next featured mission (replaces claimed one on home page)
  nextFeaturedMission: {
    status: 'active' | 'completed' | 'no_missions'
    mission: {
      id: string
      type: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views'
      displayName: string
      currentProgress: number
      targetValue: number
      progressPercentage: number
      rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
      rewardAmount: number | null
      rewardCustomText: string | null
      unitText: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views'
    } | null
    tier: {
      name: string
      color: string
    }
  }

  // Info about claimed mission (for notification)
  claimedMission: {
    displayName: string              // e.g., "Unlock Payday"
    rewardName: string               // e.g., "$25 Gift Card"
    visibleOnMissionsPage: true      // Always true - mission still shows on Missions page with "Claimed" badge
  }
}
```

### Response Examples

**Success - Gift Card Claimed:**
```json
{
  "success": true,
  "message": "Reward claimed! You'll receive your $25 Gift Card soon.",
  "redemption": {
    "id": "redemption-abc-123",
    "status": "claimed",
    "reward_type": "gift_card",
    "claimed_at": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-xyz-789",
      "name": "$25 Amazon Gift Card",
      "type": "gift_card",
      "value_data": {
        "amount": 25
      }
    },
    "next_steps": {
      "action": "wait_fulfillment",
      "message": "Your reward is being processed. You'll receive an email when it's ready!"
    }
  },
  "nextFeaturedMission": {
    "status": "active",
    "mission": {
      "id": "mission-videos-20",
      "type": "videos",
      "displayName": "Lights, Camera, Go!",
      "currentProgress": 8,
      "targetValue": 20,
      "progressPercentage": 40,
      "rewardType": "commission_boost",
      "rewardAmount": 5,
      "rewardCustomText": null,
      "unitText": "videos"
    },
    "tier": {
      "name": "Gold",
      "color": "#F59E0B"
    }
  },
  "claimedMission": {
    "displayName": "Unlock Payday",
    "rewardName": "$25 Amazon Gift Card",
    "visibleOnMissionsPage": true
  }
}
```

**Success - Discount Scheduled:**
```json
{
  "success": true,
  "message": "Discount scheduled for Jan 15 at 2:00 PM ET",
  "redemption": {
    "id": "redemption-def-456",
    "status": "claimed",
    "reward_type": "discount",
    "claimed_at": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-discount-10",
      "name": "10% Follower Discount",
      "type": "discount",
      "value_data": {
        "percent": 10,
        "duration_days": 1,
        "coupon_code": "SAVE10"
      }
    },
    "scheduled_activation_at": "2025-01-15T19:00:00Z",
    "next_steps": {
      "action": "wait_fulfillment",
      "message": "We'll activate your discount code at the scheduled time!"
    }
  },
  "mission": {
    "id": "mission-sales-1000",
    "status": "completed",
    "canClaim": false,
    "buttonText": "Claimed",
    "buttonDisabled": true
  }
}
```

**Success - Commission Boost Scheduled:**
```json
{
  "success": true,
  "message": "Commission boost scheduled to activate on Jan 20 at 6:00 PM ET",
  "redemption": {
    "id": "redemption-ghi-789",
    "status": "claimed",
    "reward_type": "commission_boost",
    "claimed_at": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-boost-5pct",
      "name": "5% Commission Boost",
      "type": "commission_boost",
      "value_data": {
        "percent": 5,
        "duration_days": 30
      }
    },
    "scheduled_activation_at": "2025-01-20T23:00:00Z",
    "next_steps": {
      "action": "wait_fulfillment",
      "message": "Your boost will activate automatically at 6 PM ET on the scheduled date!"
    }
  },
  "mission": {
    "id": "mission-videos-20",
    "status": "completed",
    "canClaim": false,
    "buttonText": "Claimed",
    "buttonDisabled": true
  }
}
```

**Success - Physical Gift Claimed:**
```json
{
  "success": true,
  "message": "Please provide your shipping information to complete your claim.",
  "redemption": {
    "id": "redemption-jkl-012",
    "status": "claimed",
    "reward_type": "physical_gift",
    "claimed_at": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-headphones",
      "name": "Wireless Headphones",
      "type": "physical_gift",
      "value_data": {
        "requires_size": false
      }
    },
    "next_steps": {
      "action": "provide_shipping",
      "message": "Please provide your shipping address to receive your gift!"
    }
  },
  "mission": {
    "id": "mission-likes-5k",
    "status": "completed",
    "canClaim": false,
    "buttonText": "Claimed",
    "buttonDisabled": true
  }
}
```

### Business Logic

#### **Validation Checks (in order):**

1. **Authentication:** Valid JWT token required
2. **Mission Exists:** Mission ID must exist in database
3. **User Owns Mission:** mission_progress.user_id must match authenticated user
4. **Mission Completed:** mission_progress.status must be `completed`
5. **Not Already Claimed:** No existing redemption with this mission_progress_id
6. **Scheduling Required:** If reward type is `discount` or `commission_boost`, `scheduled_activation_at` must be provided
7. **Scheduling Validation (Discount):**
   - Date must be weekday (Mon-Fri)
   - Time must be between 09:00-16:00 EST
   - Date must be in future
8. **Scheduling Validation (Commission Boost):**
   - Date must be in future
   - Time automatically set to 18:00:00 EST (6 PM) regardless of input

#### **Database Operations:**

```sql
-- Step 1: Verify mission is claimable
SELECT
  mp.id as mission_progress_id,
  mp.status as mission_status,
  mp.user_id,
  m.reward_id,
  r.type as reward_type,
  r.name as reward_name,
  r.value_data,
  r.redemption_type
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
JOIN rewards r ON m.reward_id = r.id
WHERE mp.id = $missionProgressId
  AND mp.user_id = $userId
  AND mp.status = 'completed';

-- Step 2: Check if already claimed
SELECT id FROM redemptions
WHERE mission_progress_id = $missionProgressId;
-- Must return 0 rows

-- Step 3: Create redemption
INSERT INTO redemptions (
  user_id,
  client_id,
  reward_id,
  mission_progress_id,
  status,
  claimed_at,
  redemption_type,
  scheduled_activation_date,
  scheduled_activation_time
) VALUES (
  $userId,
  $clientId,
  $rewardId,
  $missionProgressId,
  'claimed',
  NOW(),
  $redemptionType,  -- 'instant' or 'scheduled'
  $scheduledDate,   -- Only for discount/commission_boost
  $scheduledTime    -- Only for discount/commission_boost
) RETURNING *;

-- Step 4: For scheduled rewards, create sub-state record
-- Discount: No sub-state table (uses redemptions.scheduled_activation_*)
-- Commission Boost: Create commission_boost_redemptions row
INSERT INTO commission_boost_redemptions (
  redemption_id,
  client_id,
  boost_status,
  scheduled_activation_date
) VALUES (
  $redemptionId,
  $clientId,
  'scheduled',
  $scheduledDate
);

-- Step 5: Mission status stays 'completed' (no update needed)
```

#### **Flow by Reward Type (from MissionsRewardsFlows.md):**

| Reward Type | Scheduling Required? | Sub-State Table | Next Frontend Action |
|-------------|---------------------|-----------------|---------------------|
| **gift_card** | ❌ No | None | Wait for fulfillment |
| **spark_ads** | ❌ No | None | Wait for fulfillment |
| **experience** | ❌ No | None | Wait for fulfillment |
| **physical_gift** | ❌ No | physical_gift_redemptions | Open shipping modal |
| **discount** | ✅ Yes | None (uses redemptions table) | Show confirmation |
| **commission_boost** | ✅ Yes | commission_boost_redemptions | Show confirmation |

**From MissionsRewardsFlows.md:**
- Standard Missions Flow Step 4 (lines 150): User claims reward → redemption created with status='claimed'
- Discount Flow Step 3 (lines 485): User schedules activation time slot (9 AM - 4 PM EST, weekdays)
- Commission Boost Flow Step 3 (lines 415): User schedules activation date (time fixed at 6 PM EST)
- Physical Gift Flow Step 3a/3b (lines 314-315): User provides size (if needed) and shipping info

---

#### **Frontend Flow After Successful Claim:**

**On Home Page (`/app/home/page.tsx`):**

1. ✅ **User clicks "Claim" button** on completed mission
2. ✅ **POST /api/missions/:id/claim** executes
3. ✅ **Success response received** with `nextFeaturedMission` data
4. ✅ **Update UI immediately** using response data (no refetch needed):
   ```typescript
   // Use nextFeaturedMission from response to update circular progress
   setFeaturedMission(response.nextFeaturedMission)
   ```
5. ✅ **Show success toast** with reward name:
   ```typescript
   toast.success("Reward claimed! You'll receive your $25 Gift Card soon.")
   ```
6. ✅ **Show info toast** about mission location:
   ```typescript
   toast.info("Your completed mission is viewable in Mission History", {
     duration: 4000,
     action: {
       label: "View",
       onClick: () => router.push('/missions/missionhistory')
     }
   })
   ```

**On Missions Page (`/app/missions/page.tsx`):**
- ✅ Mission REMAINS visible with "Claimed" badge
- ✅ Same mission shows same progress (not duplicated)
- ❌ No "moved from Home" notification needed (mission was always on Missions page)

**Key UX Note:**
- The mission exists in ONE place in the database (mission_progress table)
- Home page shows it IF status is `active` or `completed` (not yet claimed)
- Missions page shows it ALWAYS (with appropriate status badge)
- This prevents user confusion about "two rewards" - it's the same mission, different views

---

### Error Responses

**400 Bad Request - Already Claimed:**
```json
{
  "error": "ALREADY_CLAIMED",
  "message": "This mission reward has already been claimed"
}
```

**400 Bad Request - Missing Scheduled Date:**
```json
{
  "error": "SCHEDULING_REQUIRED",
  "message": "This reward requires a scheduled activation date",
  "reward_type": "discount"
}
```

**400 Bad Request - Invalid Schedule (Weekend):**
```json
{
  "error": "INVALID_SCHEDULE",
  "message": "Discounts can only be scheduled on weekdays (Monday-Friday)",
  "allowed_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

**400 Bad Request - Invalid Time Slot:**
```json
{
  "error": "INVALID_TIME_SLOT",
  "message": "Discounts must be scheduled between 9 AM - 4 PM EST",
  "allowed_hours": "09:00 - 16:00 EST"
}
```

**403 Forbidden - Mission Not Completed:**
```json
{
  "error": "MISSION_NOT_COMPLETED",
  "message": "This mission has not been completed yet",
  "current_progress": 450,
  "target_value": 500
}
```

**404 Not Found - Mission Not Found:**
```json
{
  "error": "NOT_FOUND",
  "message": "Mission not found or you don't have access to it"
}
```

**500 Internal Server Error:**
```json
{
  "error": "CLAIM_FAILED",
  "message": "Failed to process reward claim. Please try again or contact support."
}
```

---

---

## POST /api/missions/:id/participate

**Purpose:** Creator participates in a raffle mission.

### Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/participate
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Response Schema

_To be defined_

---

# Mission History

**Page:** `/app/missions/missionhistory/page.tsx`

## GET /api/missions/history

**Purpose:** Returns historical missions (fulfilled, cancelled, lost raffles).

### Request

```http
GET /api/missions/history
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

_To be defined_

---

# Rewards

**Page:** `/app/rewards/page.tsx`

## GET /api/rewards

**Purpose:** Returns all VIP tier rewards for the Rewards page with pre-computed status, availability, and formatted display text.

### Request

```http
GET /api/rewards
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

```typescript
interface RewardsPageResponse {
  // User & Tier Info (for header badge)
  user: {
    id: string                          // UUID from users.id
    handle: string                      // From users.tiktok_handle (without @)
    currentTier: string                 // From users.current_tier (tier_3)
    currentTierName: string             // From tiers.tier_name ("Gold")
    currentTierColor: string            // From tiers.tier_color (hex, e.g., "#F59E0B")
  }

  // Redemption history count (for "View Redemption History" link)
  redemptionCount: number               // COUNT of status='concluded' redemptions

  // Rewards list (sorted by status priority + display_order)
  rewards: Array<{
    // Core reward data
    id: string                          // UUID from rewards.id
    type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    name: string                        // From rewards.name (auto-generated)
    description: string                 // From rewards.description (15 char max for physical_gift/experience)

    // PRE-FORMATTED display text (backend handles all formatting)
    displayText: string                 // "+5% Pay boost for 30 Days" | "$50 Gift Card" | "Win a Wireless Headphones"

    // Structured data (camelCase transformed from value_data JSONB)
    valueData: {
      amount?: number                   // For gift_card, spark_ads
      percent?: number                  // For commission_boost, discount
      durationDays?: number             // For commission_boost, discount (backend converts duration_minutes / 1440 for discounts)
      couponCode?: string               // For discount (2-8 char code)
      maxUses?: number                  // For discount (optional usage limit)
      requiresSize?: boolean            // For physical_gift
      sizeCategory?: string             // For physical_gift
      sizeOptions?: string[]            // For physical_gift
    } | null

    // COMPUTED status (backend derives from multiple tables)
    status: 'clearing' | 'sending' | 'active' | 'scheduled' |
            'redeeming_physical' | 'redeeming' | 'claimable' |
            'limit_reached' | 'locked'

    // COMPUTED availability (backend validates eligibility)
    canClaim: boolean                   // Backend checks: tier match + limit + enabled + no active claim
    isLocked: boolean                   // tier_eligibility != current_tier (preview from higher tier)
    isPreview: boolean                  // Locked preview reward (from preview_from_tier)

    // Usage tracking (VIP tier rewards only, current tier only)
    usedCount: number                   // COUNT from redemptions WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier
    totalQuantity: number               // From rewards.redemption_quantity (1-10 or NULL for unlimited)

    // Tier information
    tierEligibility: string             // From rewards.tier_eligibility ("tier_3")
    requiredTierName: string | null     // From tiers.tier_name ("Platinum") if locked, else null
    displayOrder: number                // From rewards.display_order (admin-defined priority)

    // PRE-FORMATTED status details (backend computes all dates/times)
    statusDetails: {
      // For 'scheduled' status (discount or commission_boost)
      scheduledDate?: string            // "Jan 15, 2025 at 2:00 PM" (formatted in user's timezone)
      scheduledDateRaw?: string         // ISO 8601 for frontend date pickers

      // For 'active' status (discount or commission_boost)
      activationDate?: string           // "Jan 10, 2025" (human readable)
      expirationDate?: string           // "Feb 10, 2025" (human readable)
      daysRemaining?: number            // Days until expiration (e.g., 15)

      // For 'sending' status (physical_gift)
      shippingCity?: string             // "Los Angeles" (user's shipping city)

      // For 'clearing' status (commission_boost)
      clearingDays?: number             // Days remaining until payout (20-day clearing period)
    } | null

    // Redemption frequency info (for UI hints)
    redemptionFrequency: 'one-time' | 'monthly' | 'weekly' | 'unlimited'

    // Redemption type (workflow type)
    redemptionType: 'instant' | 'scheduled'  // 'instant' for gift_card/spark_ads/experience/physical_gift, 'scheduled' for commission_boost/discount
  }>
}
```

### Example Response

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "creatorpro",
    "currentTier": "tier_3",
    "currentTierName": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "redemptionCount": 5,
  "rewards": [
    {
      "id": "reward-boost-5pct",
      "type": "commission_boost",
      "name": "5% Commission Boost",
      "description": "Temporary commission increase",
      "displayText": "+5% Pay boost for 30 Days",
      "valueData": {
        "percent": 5,
        "durationDays": 30
      },
      "status": "clearing",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 3,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 4,
      "statusDetails": {
        "clearingDays": 15
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-headphones",
      "type": "physical_gift",
      "name": "Wireless Headphones",
      "description": "Premium earbuds",
      "displayText": "Win a Wireless Headphones",
      "valueData": {
        "requiresSize": false
      },
      "status": "sending",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 2,
      "statusDetails": {
        "shippingCity": "Los Angeles"
      },
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-discount-15",
      "type": "discount",
      "name": "15% Follower Discount",
      "description": "Deal boost",
      "displayText": "+15% Deal Boost for 7 Days",
      "valueData": {
        "percent": 15,
        "durationDays": 7,
        "couponCode": "GOLD15",
        "maxUses": 100
      },
      "status": "active",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 6,
      "statusDetails": {
        "activationDate": "Jan 10, 2025",
        "expirationDate": "Jan 17, 2025",
        "daysRemaining": 3
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-boost-10pct",
      "type": "commission_boost",
      "name": "10% Commission Boost",
      "description": "Temporary commission increase",
      "displayText": "+10% Pay boost for 30 Days",
      "valueData": {
        "percent": 10,
        "durationDays": 30
      },
      "status": "scheduled",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 2,
      "totalQuantity": 3,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 4,
      "statusDetails": {
        "scheduledDate": "Jan 20, 2025 at 6:00 PM",
        "scheduledDateRaw": "2025-01-20T23:00:00Z"
      },
      "redemptionFrequency": "monthly",
      "redemptionType": "scheduled"
    },
    {
      "id": "reward-hoodie",
      "type": "physical_gift",
      "name": "Branded Hoodie",
      "description": "Premium hoodie",
      "displayText": "Win a Branded Hoodie",
      "valueData": {
        "requiresSize": true,
        "sizeCategory": "clothing",
        "sizeOptions": ["S", "M", "L", "XL"]
      },
      "status": "redeeming_physical",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 0,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 2,
      "statusDetails": null,
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-giftcard-50",
      "type": "gift_card",
      "name": "$50 Amazon Gift Card",
      "description": "Amazon GC",
      "displayText": "$50 Gift Card",
      "valueData": {
        "amount": 50
      },
      "status": "redeeming",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 3,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    },
    {
      "id": "reward-giftcard-25",
      "type": "gift_card",
      "name": "$25 Amazon Gift Card",
      "description": "Amazon GC",
      "displayText": "$25 Gift Card",
      "valueData": {
        "amount": 25
      },
      "status": "claimable",
      "canClaim": true,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 0,
      "totalQuantity": 2,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 3,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    },
    {
      "id": "reward-sparkads-100",
      "type": "spark_ads",
      "name": "$100 Spark Ads Credit",
      "description": "Ads boost",
      "displayText": "+$100 Ads Boost",
      "valueData": {
        "amount": 100
      },
      "status": "limit_reached",
      "canClaim": false,
      "isLocked": false,
      "isPreview": false,
      "usedCount": 1,
      "totalQuantity": 1,
      "tierEligibility": "tier_3",
      "requiredTierName": null,
      "displayOrder": 5,
      "statusDetails": null,
      "redemptionFrequency": "one-time",
      "redemptionType": "instant"
    },
    {
      "id": "reward-platinum-giftcard",
      "type": "gift_card",
      "name": "$200 Amazon Gift Card",
      "description": "Premium GC",
      "displayText": "$200 Gift Card",
      "valueData": {
        "amount": 200
      },
      "status": "locked",
      "canClaim": false,
      "isLocked": true,
      "isPreview": true,
      "usedCount": 0,
      "totalQuantity": 1,
      "tierEligibility": "tier_4",
      "requiredTierName": "Platinum",
      "displayOrder": 1,
      "statusDetails": null,
      "redemptionFrequency": "monthly",
      "redemptionType": "instant"
    }
  ]
}
```

### Business Logic

#### **Status Computation (Backend Derives from Multiple Tables)**

**Priority Rank 1 - Clearing:**
```typescript
// Commission boost pending payout (20-day clearing period)
if (reward.type === 'commission_boost' &&
    redemption.status === 'fulfilled' &&
    boost_redemption.boost_status === 'pending_payout') {
  status = 'clearing'
  statusDetails = {
    clearingDays: 20 - daysSince(boost_redemption.sales_at_expiration)
  }
}
```

**Priority Rank 2 - Sending:**
```typescript
// Physical gift shipped by admin
if (reward.type === 'physical_gift' &&
    redemption.status === 'claimed' &&
    physical_gift_redemption.shipped_at IS NOT NULL) {
  status = 'sending'
  statusDetails = {
    shippingCity: physical_gift_redemption.shipping_city
  }
}
```

**Priority Rank 2 - Active:**
```typescript
// Commission boost currently active
if (reward.type === 'commission_boost' &&
    redemption.status === 'claimed' &&
    boost_redemption.boost_status === 'active') {
  status = 'active'
  statusDetails = {
    activationDate: formatDate(boost_redemption.activated_at),
    expirationDate: formatDate(boost_redemption.expires_at),
    daysRemaining: daysBetween(NOW(), boost_redemption.expires_at)
  }
}

// Discount currently active
if (reward.type === 'discount' &&
    redemption.status === 'fulfilled' &&
    redemption.activation_date IS NOT NULL &&
    redemption.expiration_date IS NOT NULL &&
    NOW() >= redemption.activation_date &&
    NOW() <= redemption.expiration_date) {
  status = 'active'
  statusDetails = {
    activationDate: formatDate(redemption.activation_date),
    expirationDate: formatDate(redemption.expiration_date),
    daysRemaining: daysBetween(NOW(), redemption.expiration_date)
  }
}
```

**Priority Rank 4 - Scheduled:**
```typescript
// Commission boost or discount scheduled for future activation
if ((reward.type === 'commission_boost' || reward.type === 'discount') &&
    redemption.status === 'claimed' &&
    redemption.scheduled_activation_date IS NOT NULL) {
  status = 'scheduled'
  statusDetails = {
    scheduledDate: formatDateTime(redemption.scheduled_activation_date, redemption.scheduled_activation_time),
    scheduledDateRaw: toISO8601(redemption.scheduled_activation_date, redemption.scheduled_activation_time)
  }
}
```

**Priority Rank 5 - Redeeming Physical:**
```typescript
// Physical gift claimed, address provided, but not shipped yet
if (reward.type === 'physical_gift' &&
    redemption.status === 'claimed' &&
    physical_gift_redemption.shipping_city IS NOT NULL &&
    physical_gift_redemption.shipped_at IS NULL) {
  status = 'redeeming_physical'
}
```

**Priority Rank 6 - Redeeming:**
```typescript
// Instant rewards (gift_card, spark_ads, experience) claimed but not fulfilled
if (reward.type IN ('gift_card', 'spark_ads', 'experience') &&
    redemption.status === 'claimed') {
  status = 'redeeming'
}
```

**Priority Rank 7 - Claimable:**
```typescript
// No active claim AND within limits
if (!hasActiveClaim && usedCount < totalQuantity && tier matches) {
  status = 'claimable'
  canClaim = true
}
```

**Priority Rank 8 - Limit Reached:**
```typescript
// All uses exhausted (only shows AFTER last reward is concluded)
if (usedCount >= totalQuantity && allClaimsConcluded) {
  status = 'limit_reached'
  canClaim = false
}
```

**Priority Rank 9 - Locked:**
```typescript
// Tier requirement not met (preview from higher tier)
if (reward.tier_eligibility != user.current_tier &&
    reward.preview_from_tier IS NOT NULL &&
    user.current_tier >= reward.preview_from_tier) {
  status = 'locked'
  isLocked = true
  isPreview = true
  canClaim = false
  requiredTierName = getTierName(reward.tier_eligibility)
}
```

---

#### **Usage Count Calculation (VIP Tier Rewards Only)**

```sql
-- Count ONLY VIP tier redemptions from current tier
SELECT COUNT(*) as used_count
FROM redemptions
WHERE user_id = $userId
  AND reward_id = $rewardId
  AND mission_progress_id IS NULL              -- ✅ VIP tier rewards only
  AND tier_at_claim = $currentTier             -- ✅ Current tier only
  AND status IN ('claimed', 'fulfilled', 'concluded')  -- ✅ Active and completed claims
  AND deleted_at IS NULL                       -- ✅ Not soft-deleted
  AND created_at >= (
    SELECT tier_achieved_at
    FROM users
    WHERE id = $userId
  );
```

**Key Points:**
- Mission rewards DON'T count toward VIP tier limits (`mission_progress_id IS NULL`)
- Only current tier redemptions count (`tier_at_claim = current_tier`)
- Resets on tier change (`created_at >= tier_achieved_at`)

**Usage Count Reset Behavior:**

When a user's tier changes, the usage count resets according to these rules:

1. **Tier Promotion (e.g., Silver → Gold):**
   - User's `tier_achieved_at` timestamp updates to NOW()
   - `usedCount` for new tier's rewards starts at 0
   - Old tier's redemptions remain in database (with `tier_at_claim = 'tier_2'`)
   - New tier's rewards become available based on new tier's `redemption_quantity`

2. **Tier Demotion (e.g., Gold → Silver):**
   - User's `tier_achieved_at` timestamp updates to NOW()
   - Higher tier's redemptions are **soft-deleted** (`deleted_at` set, `deleted_reason` = 'tier_change_tier_3_to_tier_2')
   - Lower tier's rewards become available again
   - `usedCount` for lower tier rewards starts fresh from demotion timestamp

3. **Re-Promotion to Same Tier (e.g., Gold → Silver → Gold):**
   - User's `tier_achieved_at` timestamp updates to NOW() when re-promoted
   - Previous Gold tier redemptions are NOT reactivated (soft-deleted during demotion)
   - User gets FRESH `redemption_quantity` limits for Gold tier rewards
   - Example: Gold allows 3 commission boosts → demoted → re-promoted → gets 3 NEW boosts

**SQL Query Ensures Fresh Count:**
```sql
-- Only count redemptions created AFTER current tier achievement
created_at >= (SELECT tier_achieved_at FROM users WHERE id = $userId)
```

**Example Timeline:**
```
Jan 1:  User promoted to Gold (tier_achieved_at = Jan 1)
Jan 5:  Claims commission boost #1 (usedCount = 1/3)
Jan 10: Claims commission boost #2 (usedCount = 2/3)
Feb 1:  Checkpoint: User demoted to Silver (tier_achieved_at = Feb 1, Gold redemptions soft-deleted)
Mar 1:  User re-promoted to Gold (tier_achieved_at = Mar 1)
Mar 5:  Claims commission boost #1 (usedCount = 1/3) ← Fresh count, previous boosts don't count
```

---

#### **Display Text Formatting (Backend Pre-Formats)**

```typescript
function generateDisplayText(reward: Reward): string {
  const { type, value_data, name } = reward

  switch (type) {
    case 'gift_card':
      return `$${value_data.amount} Gift Card`

    case 'commission_boost':
      return `+${value_data.percent}% Pay boost for ${value_data.duration_days} Days`

    case 'spark_ads':
      return `+$${value_data.amount} Ads Boost`

    case 'discount':
      // Convert duration_minutes (stored in DB) to days for display
      const durationDays = Math.floor(value_data.duration_minutes / 1440)
      return `+${value_data.percent}% Deal Boost for ${durationDays} Days`

    case 'physical_gift':
      return `Win a ${name}`

    case 'experience':
      return `Win a ${name}`

    default:
      return name
  }
}
```

**Note:** Backend must transform discount `duration_minutes` (DB field) to `durationDays` (API field) before returning response:
```typescript
// For discount type rewards, transform value_data
if (reward.type === 'discount') {
  reward.valueData = {
    percent: reward.value_data.percent,
    durationDays: Math.floor(reward.value_data.duration_minutes / 1440),
    couponCode: reward.value_data.coupon_code,
    maxUses: reward.value_data.max_uses
  }
}
```

---

#### **Sorting Logic (Backend Dual-Sort)**

```typescript
// Step 1: Sort by status priority
const statusPriority = {
  clearing: 1,
  sending: 2,
  active: 2,
  scheduled: 4,
  redeeming_physical: 5,
  redeeming: 6,
  claimable: 7,
  limit_reached: 8,
  locked: 9
}

// Step 2: Within same status, sort by display_order (admin-defined)
rewards.sort((a, b) => {
  const statusDiff = statusPriority[a.status] - statusPriority[b.status]
  if (statusDiff !== 0) return statusDiff
  return a.displayOrder - b.displayOrder  // Tiebreaker
})
```

---

#### **Database Query**

```sql
-- Get all rewards for user's current tier (including locked previews)
SELECT
  r.id,
  r.type,
  r.name,
  r.description,
  r.value_data,
  r.tier_eligibility,
  r.redemption_frequency,
  r.redemption_quantity,
  r.display_order,
  r.preview_from_tier,
  t.tier_name as tier_name,

  -- Active redemption data (if exists)
  red.id as redemption_id,
  red.status as redemption_status,
  red.claimed_at,
  red.scheduled_activation_date,
  red.scheduled_activation_time,
  red.activation_date,
  red.expiration_date,

  -- Commission boost sub-state (if applicable)
  cb.boost_status,
  cb.activated_at as boost_activated_at,
  cb.expires_at as boost_expires_at,
  cb.sales_at_expiration,

  -- Physical gift sub-state (if applicable)
  pg.shipping_city,
  pg.shipped_at

FROM rewards r
JOIN tiers t ON r.tier_eligibility = t.tier_id AND t.client_id = $clientId
LEFT JOIN redemptions red ON (
  red.reward_id = r.id
  AND red.user_id = $userId
  AND red.mission_progress_id IS NULL  -- VIP tier rewards only
  AND red.status NOT IN ('concluded', 'rejected')  -- Exclude completed/rejected
  AND red.deleted_at IS NULL
)
LEFT JOIN commission_boost_redemptions cb ON cb.redemption_id = red.id
LEFT JOIN physical_gift_redemptions pg ON pg.redemption_id = red.id

WHERE r.client_id = $clientId
  AND r.enabled = true
  AND (
    -- Show rewards for current tier
    r.tier_eligibility = $currentTier
    OR
    -- Show locked previews from higher tiers
    (r.preview_from_tier IS NOT NULL AND $currentTierOrder >= (
      SELECT tier_order FROM tiers WHERE tier_id = r.preview_from_tier AND client_id = $clientId
    ))
  )

ORDER BY r.display_order ASC;  -- Backend will re-sort by status priority
```

---

### Performance Optimization

**Single Query Strategy:**
- Fetch all rewards + active redemptions + sub-states in ONE query
- Use LEFT JOINs for optional sub-state tables
- Backend computes status for each reward
- Backend re-sorts by status priority + display_order

**Expected Response Time:** ~120-150ms

---

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch rewards data"
}
```

---

## POST /api/rewards/:id/claim

**Purpose:** Creator claims a VIP tier reward from their current tier. Creates a redemption record and handles scheduling for commission_boost and discount types.

**Note:** This endpoint is for VIP tier rewards ONLY (rewards page). For mission rewards, use `POST /api/missions/:id/claim`.

### Request

```http
POST /api/rewards/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Request Body Schema

```typescript
interface ClaimRewardRequest {
  // Optional: Only required for scheduled reward types (discount, commission_boost)
  scheduledActivationAt?: string  // ISO 8601 timestamp
                                   // Required if reward type is 'discount' or 'commission_boost'
                                   // Not used for: gift_card, spark_ads, physical_gift, experience

  // Optional: For physical gifts requiring size selection
  sizeValue?: string               // Size value (e.g., "M", "L", "XL")
                                   // Required if reward.value_data.requires_size = true
                                   // Must match one of reward.value_data.size_options

  // Optional: Shipping information for physical gifts
  shippingInfo?: {
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    postalCode: string
    country: string
    phone?: string
  }  // Required if reward type is 'physical_gift'
}
```

### Request Body Examples

**Instant Reward (Gift Card, Spark Ads, Experience):**
```json
{}
```

**Physical Gift (No size required):**
```json
{
  "shippingInfo": {
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA",
    "phone": "555-0123"
  }
}
```

**Physical Gift (Size required):**
```json
{
  "sizeValue": "L",
  "shippingInfo": {
    "addressLine1": "123 Main St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA"
  }
}
```

**Discount (Requires scheduling):**
```json
{
  "scheduledActivationAt": "2025-01-15T14:00:00Z"
}
```

**Commission Boost (Requires activation date, time auto-set to 6 PM EST):**
```json
{
  "scheduledActivationAt": "2025-01-20T23:00:00Z"
}
```

### Validation Business Rules

#### **Pre-Claim Validation (in order):**

1. **Authentication:** Valid JWT token required
2. **Reward Exists:** Reward ID must exist in database
3. **Reward Enabled:** `rewards.enabled = true`
4. **Tier Eligibility:** `reward.tier_eligibility` must match `user.current_tier`
5. **VIP Tier Reward Only:** This endpoint is for VIP tier rewards (rewards page), not mission rewards
6. **No Active Claim:** User must NOT have an active redemption for this reward
   ```sql
   SELECT COUNT(*) FROM redemptions
   WHERE user_id = $userId
     AND reward_id = $rewardId
     AND mission_progress_id IS NULL  -- VIP tier only
     AND status IN ('claimed', 'fulfilled')  -- Active states
     AND deleted_at IS NULL;
   -- Must return 0 (user can't claim same reward twice simultaneously)
   ```
7. **Usage Limit Check:** Must not exceed `redemption_quantity`
   ```sql
   -- Count VIP tier redemptions from current tier only
   SELECT COUNT(*) FROM redemptions
   WHERE user_id = $userId
     AND reward_id = $rewardId
     AND mission_progress_id IS NULL              -- VIP tier only
     AND tier_at_claim = $currentTier             -- Current tier only
     AND status IN ('claimed', 'fulfilled', 'concluded')
     AND deleted_at IS NULL
     AND created_at >= (SELECT tier_achieved_at FROM users WHERE id = $userId);
   -- Count must be < redemption_quantity
   ```
8. **Scheduling Required:** If reward type is `discount` or `commission_boost`, `scheduledActivationAt` must be provided
9. **Scheduling Validation (Discount):**
   - Date must be weekday (Mon-Fri)
   - Time must be between 09:00-16:00 EST
   - Date must be in future
10. **Scheduling Validation (Commission Boost):**
    - Date must be in future
    - Time automatically set to 18:00:00 EST (6 PM) regardless of input
11. **Physical Gift Requirements:**
    - `shippingInfo` must be provided
    - If `value_data.requires_size = true`, `sizeValue` must be provided
    - If `sizeValue` is provided, it must match one of the values in `value_data.size_options`
    ```typescript
    if (reward.value_data.requires_size && !request.sizeValue) {
      throw new Error('SIZE_REQUIRED')
    }
    if (request.sizeValue && !reward.value_data.size_options.includes(request.sizeValue)) {
      throw new Error('INVALID_SIZE_SELECTION')
    }
    ```

#### **Redemption Period Reset Rules:**

One-time rewards have **two different behaviors** based on reward type:

| Reward Type | Redemption Period | Re-claimable on Re-promotion? | Period Start |
|--------------|-------------------|-------------------------------|--------------|
| `gift_card` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `physical_gift` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `experience` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `commission_boost` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `spark_ads` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `discount` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |

---

### Response Schema

```typescript
interface ClaimRewardResponse {
  success: boolean
  message: string  // User-facing success message

  // Created redemption record
  redemption: {
    id: string                        // UUID of created redemption
    status: 'claimed'                 // Always "claimed" immediately after claim
    rewardType: 'gift_card' | 'commission_boost' | 'discount' | 'spark_ads' | 'physical_gift' | 'experience'
    claimedAt: string                 // ISO 8601 timestamp

    // Reward details (for confirmation display)
    reward: {
      id: string
      name: string                    // e.g., "$25 Gift Card", "5% Commission Boost"
      displayText: string             // Pre-formatted: "+5% Pay boost for 30 Days"
      type: string
      valueData: {
        amount?: number               // For gift_card, spark_ads
        percent?: number              // For commission_boost, discount
        durationDays?: number         // For commission_boost, discount (converted from duration_minutes)
        couponCode?: string           // For discount
        maxUses?: number              // For discount
      } | null
    }

    // Scheduling info (only present for discount, commission_boost)
    scheduledActivationAt?: string    // ISO 8601 timestamp

    // Updated usage tracking
    usedCount: number                 // New count after this claim
    totalQuantity: number             // From reward.redemption_quantity

    // Next steps (UI hints based on reward type)
    nextSteps: {
      action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation'
      message: string                 // User-facing instruction
    }
  }

  // Updated rewards list (for UI refresh)
  updatedRewards: Array<{
    id: string
    status: string                    // Updated status after claim
    canClaim: boolean                 // Updated claimability
    usedCount: number                 // Updated count
  }>
}
```

### Response Examples

**Success - Gift Card Claimed:**
```json
{
  "success": true,
  "message": "Gift card claimed! You'll receive your reward soon.",
  "redemption": {
    "id": "redemption-abc-123",
    "status": "claimed",
    "rewardType": "gift_card",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-giftcard-25",
      "name": "$25 Amazon Gift Card",
      "displayText": "$25 Gift Card",
      "type": "gift_card",
      "valueData": {
        "amount": 25
      }
    },
    "usedCount": 1,
    "totalQuantity": 2,
    "nextSteps": {
      "action": "wait_fulfillment",
      "message": "Your gift card is being processed. You'll receive an email when it's ready!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-giftcard-25",
      "status": "redeeming",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

**Success - Commission Boost Scheduled:**
```json
{
  "success": true,
  "message": "Commission boost scheduled to activate on Jan 20 at 6:00 PM ET",
  "redemption": {
    "id": "redemption-boost-456",
    "status": "claimed",
    "rewardType": "commission_boost",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-boost-10pct",
      "name": "10% Commission Boost",
      "displayText": "+10% Pay boost for 30 Days",
      "type": "commission_boost",
      "valueData": {
        "percent": 10,
        "durationDays": 30
      }
    },
    "scheduledActivationAt": "2025-01-20T23:00:00Z",
    "usedCount": 1,
    "totalQuantity": 3,
    "nextSteps": {
      "action": "scheduled_confirmation",
      "message": "Your boost will activate automatically at 6 PM ET on Jan 20!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-boost-10pct",
      "status": "scheduled",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

**Success - Physical Gift Claimed:**
```json
{
  "success": true,
  "message": "Hoodie claimed! We'll ship it to your address soon.",
  "redemption": {
    "id": "redemption-hoodie-789",
    "status": "claimed",
    "rewardType": "physical_gift",
    "claimedAt": "2025-01-14T15:30:00Z",
    "reward": {
      "id": "reward-hoodie",
      "name": "Branded Hoodie",
      "displayText": "Win a Branded Hoodie",
      "type": "physical_gift",
      "valueData": null
    },
    "usedCount": 1,
    "totalQuantity": 1,
    "nextSteps": {
      "action": "shipping_confirmation",
      "message": "Your shipping info has been received. We'll send tracking details via email!"
    }
  },
  "updatedRewards": [
    {
      "id": "reward-hoodie",
      "status": "redeeming_physical",
      "canClaim": false,
      "usedCount": 1
    }
  ]
}
```

---

### Error Responses

**400 Bad Request - Active Claim Exists:**
```json
{
  "error": "ACTIVE_CLAIM_EXISTS",
  "message": "You already have an active claim for this reward. Wait for it to be fulfilled before claiming again.",
  "activeRedemptionId": "redemption-xyz-123",
  "activeRedemptionStatus": "claimed"
}
```

**400 Bad Request - Limit Reached:**
```json
{
  "error": "LIMIT_REACHED",
  "message": "You have reached the redemption limit for this reward (2 of 2 used this month)",
  "usedCount": 2,
  "totalQuantity": 2,
  "redemptionFrequency": "monthly"
}
```

**400 Bad Request - Missing Scheduled Date:**
```json
{
  "error": "SCHEDULING_REQUIRED",
  "message": "This reward requires a scheduled activation date",
  "rewardType": "discount"
}
```

**400 Bad Request - Invalid Schedule (Weekend):**
```json
{
  "error": "INVALID_SCHEDULE",
  "message": "Discounts can only be scheduled on weekdays (Monday-Friday)",
  "allowedDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}
```

**400 Bad Request - Invalid Time Slot:**
```json
{
  "error": "INVALID_TIME_SLOT",
  "message": "Discounts must be scheduled between 9 AM - 4 PM EST",
  "allowedHours": "09:00 - 16:00 EST"
}
```

**400 Bad Request - Missing Shipping Info:**
```json
{
  "error": "SHIPPING_INFO_REQUIRED",
  "message": "Physical gifts require shipping information",
  "rewardType": "physical_gift"
}
```

**400 Bad Request - Missing Size:**
```json
{
  "error": "SIZE_REQUIRED",
  "message": "This item requires a size selection",
  "sizeOptions": ["S", "M", "L", "XL"]
}
```

**400 Bad Request - Invalid Size:**
```json
{
  "error": "INVALID_SIZE_SELECTION",
  "message": "Selected size is not available for this item",
  "selectedSize": "XXL",
  "availableSizes": ["S", "M", "L", "XL"]
}
```

**403 Forbidden - Tier Mismatch:**
```json
{
  "error": "TIER_INELIGIBLE",
  "message": "This reward requires Gold tier. You are currently Silver.",
  "requiredTier": "tier_3",
  "currentTier": "tier_2"
}
```

**404 Not Found:**
```json
{
  "error": "REWARD_NOT_FOUND",
  "message": "Reward not found or not available for your tier"
}
```

**500 Internal Server Error:**
```json
{
  "error": "CLAIM_FAILED",
  "message": "Failed to process reward claim. Please try again or contact support."
}
```

---

# Rewards History

**Page:** `/app/rewards/rewardshistory/page.tsx`

## GET /api/rewards/history

**Purpose:** Returns history of claimed and fulfilled rewards.

### Request

```http
GET /api/rewards/history
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

_To be defined_

---

# Tiers

**Page:** `/app/tiers/page.tsx`

## GET /api/tiers

**Purpose:** Returns tier progression information and requirements.

### Request

```http
GET /api/tiers
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

_To be defined_

---

# 3. MISSIONS PAGE

## 3.1 GET /api/missions

**Purpose:** Fetch all missions for Missions page (active, completed, claimed, raffles)

**Authentication:** Required (Supabase JWT)

**Request:** None (user context from JWT)

**Response Schema:**

```typescript
interface MissionsPageResponse {
  user: {
    id: string
    handle: string
    currentTier: string
    currentTierColor: string  // Hex color (e.g., "#F59E0B")
  }

  completedMissionsCount: number  // Count for "View Completed Missions" link

  missions: Array<{
    id: string  // mission_progress.id (NOT missions.id - for claim/participate calls)
    missionType: 'sales_dollars' | 'sales_units' | 'videos' | 'likes' | 'views' | 'raffle'
    displayName: string  // Static per mission_type from missions.display_name (e.g., "Unlock Payday", "VIP Raffle")
    description: string  // Admin-customized description

    // Progress tracking (non-raffle missions)
    currentProgress: number  // mission_progress.current_value
    goal: number  // missions.target_value
    progressPercentage: number  // (currentProgress / goal) * 100
    remainingValue: number  // goal - currentProgress

    // Reward details
    rewardType: 'gift_card' | 'commission_boost' | 'discount' | 'gift' | 'trip' | 'spark_ads'
    rewardValue: number | null  // Dollar amount or percentage (null for custom rewards)
    rewardCustomText: string | null  // For physical_gift, experience rewards

    // Frontend-ready computed status (NOT database status)
    status: 'active' | 'completed' | 'claimed' | 'processing' | 'won' | 'available' | 'dormant' | 'locked' | 'cancelled'

    // Time tracking
    checkpointEnd: string | null  // ISO 8601 (mission deadline for non-raffle)

    // Tier restrictions
    requiredTier: string | null  // Tier name (e.g., "Gold") or null if no restriction

    // Raffle-specific fields (null for non-raffle missions)
    raffleEndDate: string | null  // ISO 8601
    // Note: Prize name comes from reward.description (physical_gift/experience) or reward.value_data.amount (gift_card)

    // Admin controls
    activated: boolean | null  // Raffle activation control (null for non-raffle)
    enabled: boolean  // Master visibility switch
  }>
}
```

---

### **Status Values (Frontend-Ready Computed)**

The `status` field is **computed by backend** from multiple table states:

| Status | Meaning | Database State | Filters | Display |
|--------|---------|----------------|---------|---------|
| `active` | Mission in progress | `mission_progress.status='active'` AND `missions.enabled=true` | ✅ Show | Progress bar |
| `completed` | Ready to claim | `mission_progress.status='completed'` AND no redemption exists | ✅ Show | "Claim Reward" button |
| `claimed` | Reward claimed, pending fulfillment | `redemptions.status='claimed'` | ✅ Show | "Prize on the way" badge |
| `processing` | Raffle entry submitted, waiting for draw | `raffle_participations.is_winner=NULL` | ✅ Show | "Waiting for Draw" badge |
| `won` | Raffle winner selected | `raffle_participations.is_winner=TRUE` AND `redemptions.status='claimed'` | ✅ Show | "Prize on the way" badge |
| `available` | Raffle accepting entries | `mission_progress.status='active'` AND `missions.mission_type='raffle'` AND `missions.activated=true` | ✅ Show | "Participate" button |
| `dormant` | Raffle not yet accepting entries | `mission_progress.status='dormant'` AND `missions.activated=false` | ✅ Show | "Raffle starts soon" text |
| `locked` | Tier requirement not met | `missions.tier_eligibility` > user's current tier | ✅ Show | Lock icon + required tier |
| `cancelled` | Admin disabled mid-progress | `missions.enabled=false` AND `mission_progress.current_value > 0` | ❌ Hide | N/A |
| `fulfilled` | Admin completed fulfillment | `redemptions.status='fulfilled'` | ❌ Hide (moved to Mission History) | N/A |
| `lost` | Raffle entry lost | `raffle_participations.is_winner=FALSE` | ❌ Hide (moved to Mission History) | N/A |

**Frontend Filtering Logic:**
```typescript
missions.filter(m => {
  // Hide fulfilled, lost, cancelled, disabled missions
  return !['fulfilled', 'lost', 'cancelled'].includes(m.status)
    && m.enabled === true
})
```

**Frontend Sorting Priority:**
```typescript
const statusPriority = {
  won: 1,           // Show raffle wins first
  completed: 2,     // Then missions ready to claim
  claimed: 3,       // Then claimed missions (tracking fulfillment)
  processing: 4,    // Then raffle entries waiting for draw
  active: 5,        // Then active missions in progress
  available: 6,     // Then raffles available to join
  dormant: 7,       // Then dormant raffles (coming soon)
  locked: 8         // Then locked missions (tier requirement)
}
```

---

### **Business Logic:**

**Non-Raffle Missions:**
```typescript
// Status derivation for sales/videos/likes/views missions
if (missionProgress.status === 'completed' && !redemptionExists) {
  status = 'completed'
} else if (redemption.status === 'claimed') {
  status = 'claimed'
} else if (missionProgress.status === 'active') {
  status = 'active'
} else if (missions.tier_eligibility > user.currentTier) {
  status = 'locked'
} else if (missions.enabled === false && missionProgress.current_value > 0) {
  status = 'cancelled'
}
```

**Raffle Missions:**
```typescript
// Status derivation for raffle missions
if (raffleParticipation.is_winner === true) {
  status = 'won'
} else if (raffleParticipation.is_winner === false) {
  status = 'lost'  // Filtered out on Missions page, shown in History
} else if (raffleParticipation.is_winner === null && raffleParticipation.participated_at) {
  status = 'processing'  // Waiting for draw
} else if (missions.activated === true) {
  status = 'available'  // Can participate
} else if (missions.activated === false) {
  status = 'dormant'  // Coming soon
} else if (missions.tier_eligibility > user.currentTier) {
  status = 'locked'
}
```

---

### **Database Operations:**

```sql
-- Fetch all missions for user
SELECT
  mp.id as mission_progress_id,
  mp.current_value,
  mp.status as mission_progress_status,
  mp.checkpoint_end,
  mp.completed_at,
  m.id as mission_id,
  m.mission_type,
  m.display_name,
  m.description,
  m.target_value as goal,
  m.tier_eligibility,
  m.raffle_end_date,
  m.activated,
  m.enabled,
  r.type as reward_type,
  r.value_data,
  r.name as reward_name,
  red.status as redemption_status,
  red.claimed_at,
  rp.is_winner,
  rp.participated_at,
  t.tier_name as current_tier_name,
  t.tier_color as current_tier_color
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
JOIN rewards r ON m.reward_id = r.id
JOIN users u ON mp.user_id = u.id
JOIN tiers t ON u.current_tier = t.tier_id AND t.client_id = u.client_id
LEFT JOIN redemptions red ON mp.id = red.mission_progress_id
LEFT JOIN raffle_participations rp ON m.id = rp.mission_id AND rp.user_id = u.id
WHERE mp.user_id = $userId
  AND mp.client_id = $clientId
  AND m.enabled = true  -- Only show enabled missions
ORDER BY
  -- Frontend will handle final sorting by computed status priority
  mp.created_at DESC;

-- Count completed missions (for Mission History link)
SELECT COUNT(*) as completed_count
FROM mission_progress mp
JOIN redemptions r ON mp.id = r.mission_progress_id
WHERE mp.user_id = $userId
  AND mp.client_id = $clientId
  AND r.status IN ('fulfilled', 'concluded', 'rejected');
```

---

### **Response Example:**

```json
{
  "user": {
    "id": "user-abc-123",
    "handle": "@creator_jane",
    "currentTier": "Gold",
    "currentTierColor": "#F59E0B"
  },
  "completedMissionsCount": 8,
  "missions": [
    {
      "id": "mission-progress-xyz-789",
      "missionType": "sales_dollars",
      "displayName": "Unlock Payday",
      "description": "Reach your sales target",
      "currentProgress": 1500,
      "goal": 2000,
      "progressPercentage": 75,
      "remainingValue": 500,
      "rewardType": "gift_card",
      "rewardValue": 50,
      "rewardCustomText": null,
      "status": "active",
      "checkpointEnd": "2025-03-15T23:59:59Z",
      "requiredTier": null,
      "raffleEndDate": null,
      "activated": null,
      "enabled": true
    },
    {
      "id": "mission-progress-raffle-456",
      "missionType": "raffle",
      "displayName": "VIP Raffle",
      "description": "",
      "currentProgress": 0,
      "goal": 1,
      "progressPercentage": 0,
      "remainingValue": 0,
      "rewardType": "gift",
      "rewardValue": null,
      "rewardCustomText": "iPhone 16 Pro",
      "status": "available",
      "checkpointEnd": null,
      "requiredTier": null,
      "raffleEndDate": "2025-02-15T23:59:59Z",
      "activated": true,
      "enabled": true
    }
  ]
}
```

---

### **Error Responses:**

**401 Unauthorized:**
```json
{ "error": "Unauthorized", "message": "Authentication required" }
```

**500 Internal Server Error:**
```json
{ "error": "ServerError", "message": "Failed to fetch missions" }
```

---

## 3.2 POST /api/missions/:id/participate

**Purpose:** User participates in a raffle (creates mission_progress, redemption, raffle_participation)

**Authentication:** Required (Supabase JWT)

**URL Parameters:**
- `:id` - mission_progress.id (NOT missions.id)

**Request Body:** None

**Response Schema:**

```typescript
interface ParticipateRaffleResponse {
  success: boolean
  message: string

  participation: {
    id: string  // raffle_participations.id
    missionId: string  // missions.id
    participatedAt: string  // ISO 8601
    raffleEndDate: string  // ISO 8601
    isWinner: null  // Always null when participating
    // Note: Prize name comes from mission.reward.description or mission.reward.value_data.amount
  }

  redemption: {
    id: string  // redemptions.id
    status: "claimable"  // Always claimable when raffle entry created
  }

  // Updated mission for UI refresh
  updatedMission: {
    id: string  // mission_progress.id
    status: "processing"  // Changed from 'available' → 'processing'
    description: string  // "Waiting for draw" or "X days until raffle"
  }
}
```

---

### **Business Logic:**

**Pre-Conditions (Validations):**
```typescript
// 1. Mission must be a raffle
if (mission.mission_type !== 'raffle') {
  throw new Error('Mission is not a raffle')
}

// 2. Raffle must be accepting entries (activated=true)
if (mission.activated !== true) {
  throw new Error('Raffle is not accepting entries')
}

// 3. User cannot participate twice in same raffle
const existingParticipation = await checkExistingParticipation(userId, missionId)
if (existingParticipation) {
  throw new Error('You have already participated in this raffle')
}

// 4. Mission must be enabled
if (mission.enabled !== true) {
  throw new Error('Mission is disabled')
}

// 5. Tier eligibility check
if (mission.tier_eligibility && user.currentTier < mission.tier_eligibility) {
  throw new Error(`Requires ${mission.tier_eligibility} tier or higher`)
}
```

**Post-Conditions (State Changes):**
```sql
-- Step 1: Update mission_progress status
UPDATE mission_progress
SET
  status = 'completed',  -- Raffle participation = completion
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = $missionProgressId
  AND user_id = $userId;

-- Step 2: Create redemption (claimable state)
INSERT INTO redemptions (
  user_id,
  client_id,
  reward_id,
  mission_progress_id,
  status,
  tier_at_claim,
  redemption_type,
  created_at
) VALUES (
  $userId,
  $clientId,
  $rewardId,
  $missionProgressId,
  'claimable',  -- Raffle redemptions start as claimable
  $currentTier,
  'instant',  -- Raffles are instant redemption_type
  NOW()
) RETURNING id;

-- Step 3: Create raffle_participation record
INSERT INTO raffle_participations (
  mission_id,
  user_id,
  mission_progress_id,
  redemption_id,
  client_id,
  participated_at,
  is_winner  -- NULL until admin selects winner
) VALUES (
  $missionId,
  $userId,
  $missionProgressId,
  $redemptionId,
  $clientId,
  NOW(),
  NULL
) RETURNING *;
```

---

### **Database Operations:**

```sql
-- Fetch mission details for validation
SELECT
  m.id as mission_id,
  m.mission_type,
  m.activated,
  m.enabled,
  m.tier_eligibility,
  m.raffle_end_date,
  m.reward_id,
  r.name as reward_name,
  mp.id as mission_progress_id,
  mp.status as current_status,
  u.current_tier,
  u.client_id
FROM missions m
JOIN mission_progress mp ON m.id = mp.mission_id
JOIN users u ON mp.user_id = u.id
JOIN rewards r ON m.reward_id = r.id
WHERE mp.id = $missionProgressId
  AND u.id = $userId;

-- Check if already participated
SELECT id FROM raffle_participations
WHERE mission_id = $missionId
  AND user_id = $userId;
-- Must return 0 rows

-- Execute state changes (see Post-Conditions section above)
```

---

### **Response Example:**

**Success:**
```json
{
  "success": true,
  "message": "Successfully entered raffle for iPhone 16 Pro!",
  "participation": {
    "id": "raffle-part-abc-123",
    "missionId": "mission-xyz-789",
    "participatedAt": "2025-01-14T15:30:00Z",
    "raffleEndDate": "2025-02-15T23:59:59Z",
    "isWinner": null
  },
  "redemption": {
    "id": "redemption-def-456",
    "status": "claimable"
  },
  "updatedMission": {
    "id": "mission-progress-xyz-789",
    "status": "processing",
    "description": "11 days until raffle"
  }
}
```

---

### **Error Responses:**

**400 Bad Request - Not a raffle:**
```json
{
  "error": "InvalidMissionType",
  "message": "Mission is not a raffle"
}
```

**400 Bad Request - Not accepting entries:**
```json
{
  "error": "RaffleNotActive",
  "message": "Raffle is not accepting entries"
}
```

**409 Conflict - Already participated:**
```json
{
  "error": "DuplicateParticipation",
  "message": "You have already participated in this raffle"
}
```

**403 Forbidden - Tier requirement not met:**
```json
{
  "error": "InsufficientTier",
  "message": "Requires Gold tier or higher"
}
```

**404 Not Found:**
```json
{
  "error": "MissionNotFound",
  "message": "Mission not found or does not belong to you"
}
```

**500 Internal Server Error:**
```json
{
  "error": "ServerError",
  "message": "Failed to process raffle participation"
}
```

---

## NOTES

- All endpoints require Supabase JWT authentication unless explicitly marked as public
- All timestamps use ISO 8601 format (e.g., "2025-01-10T12:00:00Z")
- All monetary amounts are in USD cents unless otherwise specified
- All endpoints return JSON responses
- Error responses follow standard format: `{ "error": "Type", "message": "Description" }`

---

**Document Version:** 1.5
**Last Updated:** 2025-01-18 (Rewards page API contracts complete with all validations)
**Changelog:**
- v1.5: Fixed all validation issues (3 critical + 4 minor improvements)
- v1.4.1: Resolved critical schema mismatches (discount duration, missing fields)
- v1.4: Added Rewards page API contracts
- v1.3: Added Missions page API contracts
**Validation Status:** ✅ 100% Schema Alignment (SchemaFinalv2.md)
**Next Review:** After remaining page contracts defined (Rewards History, Tiers, Auth)

---

## DESIGN DECISIONS SUMMARY

### Backend vs Frontend Responsibilities (Home Page)

**Decided on 2025-01-10:**

| Responsibility | Backend | Frontend | Rationale |
|----------------|---------|----------|-----------|
| **Progress percentage calculation** | ✅ Calculates & sends | ❌ Displays only | Single source of truth, consistent logic |
| **Date formatting** | ✅ Formats & sends | ❌ Displays only | i18n-ready, backend controls format |
| **Reward text formatting** | ❌ Sends structured data | ✅ Builds strings | UI flexibility for different screens |
| **Reward sorting** | ✅ Sends sorted by display_order | ✅ Can override with type priority | MVP uses frontend type-based sorting, future admin UI will control display_order |
| **SVG circle geometry** | ❌ N/A | ✅ Calculates | Pure UI presentation logic |
| **Number formatting** | ❌ Raw values | ✅ toLocaleString() | UI presentation |

**Security Principle:**
> "Never trust the client, but let the client organize trusted data"

- Authorization & validation = Backend only
- Presentation & formatting = Frontend allowed
- Business logic = Backend only

See [Section 10: Authorization & Security Checklists](#authorization--security-checklists) in ARCHITECTURE.md for implementation details.
