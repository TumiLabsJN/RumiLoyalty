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

### Example Responses

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

### Business Logic

#### **Mission Priority (Fallback Order):**
1. Sales (Unlock Payday)
2. Videos (Lights, Camera, Go!)
3. Likes (Road to Viral)
4. Views (Eyes on You)

**Implementation:** Single query with IN clause, sort by priority in application layer

```sql
-- Single optimized query (vs 4 sequential queries)
SELECT m.*, mp.*, b.*
FROM missions m
LEFT JOIN mission_progress mp ON m.id = mp.mission_id AND mp.user_id = $userId
LEFT JOIN rewards b ON m.reward_id = b.id
WHERE m.client_id = $clientId
  AND m.mission_type IN ('sales', 'videos', 'likes', 'views')
  AND m.tier_eligibility = $currentTier
  AND m.enabled = true
  AND (mp.status IN ('active', 'completed', 'claimed') OR mp.status IS NULL)
ORDER BY
  CASE m.mission_type
    WHEN 'sales' THEN 1
    WHEN 'videos' THEN 2
    WHEN 'likes' THEN 3
    WHEN 'views' THEN 4
  END
LIMIT 1
```

**Performance:** ~80ms (single query vs 200ms for sequential)

---

#### **Status Computation:**
- `active`: User has progress record with status='active'
- `completed`: Progress >= target, status='completed'
- `claimed`: User clicked claim, awaiting admin fulfillment
- `no_missions`: No missions found matching criteria

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

  // Current tier data
  currentTier: {
    id: string                          // UUID from tiers.id
    name: string                        // From tiers.tier_name ("Bronze", "Silver", "Gold", "Platinum")
    color: string                       // From tiers.tier_color (hex, e.g., "#F59E0B")
    order: number                       // From tiers.tier_order (1, 2, 3, 4)
    checkpoint_exempt: boolean          // From tiers.checkpoint_exempt (true = tier doesn't expire)
  }

  // Next tier data (null if already at highest tier)
  nextTier: {
    id: string                          // UUID
    name: string                        // Next tier name
    color: string                       // Next tier color (for future use)
    minSalesThreshold: number           // From tiers.min_sales_threshold
  } | null

  // ============================================
  // TIER PROGRESSION (checkpoint-based tracking)
  // ============================================
  tierProgress: {
    currentSales: number                // SUM(metrics.tiktok_sales) + users.manual_adjustments_total since users.tier_achieved_at
    targetSales: number                 // nextTier.minSalesThreshold (or 0 if at max tier)
    progressPercentage: number          // Computed: (currentSales / targetSales) * 100
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
    status: 'active' | 'completed' | 'claimed' | 'fulfilled' | 'no_missions'
    mission: {
      id: string
      type: 'sales' | 'videos' | 'likes' | 'views'
      displayName: string
      currentProgress: number
      targetValue: number
      progressPercentage: number
      rewardType: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
      rewardAmount: number | null
      rewardCustomText: string | null
      unitText: 'sales' | 'videos' | 'likes' | 'views'
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
  currentTierRewards: Array<{
    id: string                          // UUID from rewards.id
    type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
    name: string                        // From rewards.name
    description: string                 // From rewards.description
    valueData: {                        // From rewards.value_data (JSONB)
      amount?: number                   // For gift_card, spark_ads
      percent?: number                  // For commission_boost, discount
      duration_days?: number            // For commission_boost, discount
    } | null
    redemptionQuantity: number          // From rewards.redemption_quantity
    displayOrder: number                // From rewards.display_order
  }>
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
  "currentTier": {
    "id": "tier-gold-uuid",
    "name": "Gold",
    "color": "#F59E0B",
    "order": 3
  },
  "nextTier": {
    "id": "tier-platinum-uuid",
    "name": "Platinum",
    "color": "#818CF8",
    "minSalesThreshold": 5000
  },
  "tierProgress": {
    "currentSales": 4200,
    "targetSales": 5000,
    "progressPercentage": 84,
    "checkpointExpiresAt": "2025-03-15T00:00:00Z",
    "checkpointExpiresFormatted": "March 15, 2025",
    "checkpointMonths": 4
  },
  "featuredMission": {
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
  },
  "currentTierRewards": [
    {
      "id": "reward-1-uuid",
      "type": "experience",
      "name": "VIP Event Access",
      "description": "Get exclusive access to VIP events and meetups",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 1
    },
    {
      "id": "reward-2-uuid",
      "type": "physical_gift",
      "name": "Wireless Headphones",
      "description": "Premium wireless headphones",
      "valueData": null,
      "redemptionQuantity": 1,
      "displayOrder": 2
    },
    {
      "id": "reward-3-uuid",
      "type": "gift_card",
      "name": "$50 Amazon Gift Card",
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
      "name": "5% Commission Boost",
      "description": "Temporary commission increase",
      "valueData": {
        "percent": 5,
        "duration_days": 30
      },
      "redemptionQuantity": 1,
      "displayOrder": 4
    },
    {
      "id": "reward-5-uuid",
      "type": "spark_ads",
      "name": "$100 Spark Ads Budget",
      "description": "TikTok Spark Ads budget boost",
      "valueData": {
        "amount": 100
      },
      "redemptionQuantity": 3,
      "displayOrder": 5
    },
    {
      "id": "reward-6-uuid",
      "type": "discount",
      "name": "10% Follower Discount",
      "description": "Special discount code for followers",
      "valueData": {
        "percent": 10,
        "duration_days": 7
      },
      "redemptionQuantity": 1,
      "displayOrder": 6
    }
  ]
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
  t.min_sales_threshold
FROM tiers t
WHERE t.client_id = $clientId
  AND t.tier_order = $currentTierOrder + 1
LIMIT 1
```

**If no result:** User is at highest tier, return `nextTier: null`

---

#### **Tier Progress Calculation:**

```sql
-- Sum sales since tier was achieved (TikTok metrics + manual adjustments)
SELECT
  COALESCE(SUM(tiktok_sales), 0) as tiktok_sales_total,
  u.manual_adjustments_total
FROM metrics m
JOIN users u ON u.id = m.user_id
WHERE m.user_id = $userId
  AND m.created_at >= $tierAchievedAt
  AND m.created_at < $nextCheckpointAt
GROUP BY u.manual_adjustments_total
```

**Computation:**
```typescript
// Total checkpoint sales = TikTok metrics + manual adjustments
const currentSales = tiktok_sales_total + (user.manual_adjustments_total || 0)

const progressPercentage = nextTier
  ? Math.min((currentSales / nextTier.minSalesThreshold) * 100, 100)
  : 100  // Already at max tier

const checkpointExpiresFormatted = new Date(user.next_checkpoint_at)
  .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
```

**Design Decision:**
Backend calculates and sends `progressPercentage` and `checkpointExpiresFormatted` to ensure:
- ✅ Single source of truth for business logic
- ✅ Consistent calculation across all clients
- ✅ Frontend only handles UI presentation (SVG geometry, number formatting)
- ✅ i18n-ready date formatting controlled by backend

Frontend should NOT recalculate percentages from raw values. This prevents logic divergence and keeps business rules centralized.

**Tier Expiration Business Rules:**

| Tier Configuration | Expires? | Frontend Display |
|------------|----------|------------------|
| **checkpoint_exempt = true** | ❌ Never | Hide expiration date entirely. No tooltip needed. |
| **checkpoint_exempt = false** | ✅ Yes | Show "{TierName} Expires on {Date}" with ℹ️ tooltip explaining checkpoint recalculation. |

**Logic:**
- Tiers with `checkpoint_exempt = true` are guaranteed (typically first tier, but configurable by admin)
- Tiers with `checkpoint_exempt = false` are recalculated at each checkpoint based on sales performance
- Backend sends `checkpoint_exempt` field in currentTier object

**Frontend Implementation:**
```typescript
// Check if current tier is exempt from checkpoints
const tierExpires = !currentTier.checkpoint_exempt

// Only show expiration if tier is NOT exempt
{tierExpires && (
  <p>{currentTier.name} Expires on {tierProgress.checkpointExpiresFormatted}</p>
)}
```

**Tooltip Message (for higher tiers only):**
> "We review your VIP level at each checkpoint based on recent sales. Keep selling to stay {currentTierName} or move up!"

---

#### **Current Tier Rewards Query:**

```sql
-- Get all rewards for current tier
SELECT
  b.id,
  b.type,
  b.name,
  b.description,
  b.value_data,
  b.redemption_quantity,
  b.display_order
FROM rewards b
WHERE b.tier_eligibility = $currentTierId
  AND b.client_id = $clientId
  AND b.enabled = true
ORDER BY b.display_order ASC
```

**Frontend Display Logic:**
- Backend returns rewards sorted by `display_order ASC`
- Frontend displays top 4 rewards as received (no re-sorting)
- If more than 4 exist, show "And more!" message
- Frontend handles:
  - Slicing to top 4: `rewards.slice(0, 4)`
  - Text formatting: Builds display strings from `type` + `valueData`
  - Icon mapping: Maps `type` to UI icons (e.g., `gift_card` → Gift icon)

**Decision (Option A - Keep type-based frontend sorting for MVP):**
For MVP, frontend uses hardcoded type-based priority sorting. Backend sends rewards sorted by `display_order`, but frontend can override if needed. This provides flexibility for different screen sizes (mobile vs desktop) while maintaining a simple implementation.

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

**Purpose:** Creator claims a completed mission reward.

### Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Response Schema

_To be defined_

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

**Purpose:** Returns current tier rewards and rewards.

### Request

```http
GET /api/rewards
Authorization: Bearer <supabase-jwt-token>
```

### Response Schema

_To be defined_

---

## POST /api/rewards/:id/claim

**Purpose:** Creator claims a reward/reward from their current tier.

### Request

```http
POST /api/rewards/550e8400-e29b-41d4-a716-446655440000/claim
Authorization: Bearer <supabase-jwt-token>
Content-Type: application/json
```

### Validation Business Rules

**Tier Eligibility Check:**
- Reward's `tier_eligibility` must match user's `current_tier`
- Reward must have `enabled = true`

**One-Time Redemption Validation:**

One-time rewards have **two different behaviors** based on reward type:

| Reward Type | Redemption Period | Re-claimable on Re-promotion? | Period Start |
|--------------|-------------------|-------------------------------|--------------|
| `gift_card` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `physical_gift` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `experience` | Once forever (lifetime) | ❌ No | `user.created_at` |
| `commission_boost` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `spark_ads` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |
| `discount` | Once per tier achievement | ✅ Yes | `user.tier_achieved_at` |

**Validation SQL:**

```sql
-- For gift_card, physical_gift, experience (Once Forever)
SELECT COUNT(*) FROM redemptions
WHERE user_id = $userId
  AND reward_id = $rewardId
  AND created_at >= (SELECT created_at FROM users WHERE id = $userId);
-- Must return 0 to allow claim

-- For commission_boost, spark_ads, discount (Once Per Tier)
SELECT COUNT(*) FROM redemptions
WHERE user_id = $userId
  AND reward_id = $rewardId
  AND created_at >= (SELECT tier_achieved_at FROM users WHERE id = $userId);
-- Must return 0 to allow claim
```

**Monthly/Weekly Redemption Validation:**

```sql
-- Calculate period based on redemption_frequency
-- See Rewards.md Section 6.3 for period calculation logic

SELECT COUNT(*) FROM redemptions
WHERE user_id = $userId
  AND reward_id = $rewardId
  AND created_at >= $period_start
  AND created_at < $period_end;

-- Compare count to reward.redemption_quantity
-- If count >= redemption_quantity, reject claim
```

### Response

**Success (201 Created):**
```json
{
  "redemption": {
    "id": "redemption-uuid",
    "user_id": "user-uuid",
    "reward_id": "reward-uuid",
    "status": "pending",
    "claimed_at": "2025-01-11T10:30:00Z",
    "fulfilled_at": null
  }
}
```

**Error (400 Bad Request - Already Claimed):**
```json
{
  "error": "ALREADY_CLAIMED",
  "message": "You have already claimed this one-time reward",
  "redemption_type": "once_forever"
}
```

**Error (403 Forbidden - Tier Mismatch):**
```json
{
  "error": "TIER_INELIGIBLE",
  "message": "This reward requires Gold tier. You are currently Silver."
}
```

**Error (400 Bad Request - Limit Reached):**
```json
{
  "error": "LIMIT_REACHED",
  "message": "You have reached the redemption limit for this reward (2 of 2 used this month)"
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

## NOTES

- All endpoints require Supabase JWT authentication unless explicitly marked as public
- All timestamps use ISO 8601 format (e.g., "2025-01-10T12:00:00Z")
- All monetary amounts are in USD cents unless otherwise specified
- All endpoints return JSON responses
- Error responses follow standard format: `{ "error": "Type", "message": "Description" }`

---

**Document Version:** 1.2
**Last Updated:** 2025-01-10 (Home page API contract complete + Backend/Frontend responsibility decisions)
**Next Review:** After remaining page contracts defined (Missions, Rewards, Tiers, Auth)

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
