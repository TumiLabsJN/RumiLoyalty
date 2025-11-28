# ADMIN API CONTRACTS

**Project:** RumiAI Loyalty Platform - Admin Dashboard
**Base URL:** `/api/admin`
**Authentication:** Supabase JWT token in `Authorization: Bearer <token>` header + Admin role required
**Date Created:** 2025-01-25
**Status:** In Progress

---

## TABLE OF CONTENTS

1. [Authentication & Authorization](#authentication--authorization)
2. [API Conventions](#api-conventions)
3. [Error Response Format](#error-response-format)
4. [Screen 1: Dashboard](#screen-1-dashboard)
5. [Screen 2: Redemptions](#screen-2-redemptions)
6. [Screen 3: Missions](#screen-3-missions)
7. [Screen 4: VIP Rewards](#screen-4-vip-rewards)
8. [Screen 5: Sales Adjustments](#screen-5-sales-adjustments)
9. [Screen 6: Creator Lookup](#screen-6-creator-lookup)
10. [Screen 7: Data Sync](#screen-7-data-sync)
11. [Screen 8: Reports](#screen-8-reports)

---

## Authentication & Authorization

All admin endpoints require:

1. **Valid Supabase JWT token** in Authorization header
2. **Admin role** - User must have `role = 'admin'` in users table

```http
Authorization: Bearer <supabase-jwt-token>
```

### Authorization Check (All Admin Endpoints)

```typescript
// Middleware applied to all /api/admin/* routes
async function requireAdmin(req: Request) {
  const user = await getAuthenticatedUser(req)

  if (!user) {
    throw { error: "UNAUTHORIZED", message: "Authentication required" }
  }

  if (user.role !== 'admin') {
    throw { error: "ADMIN_ACCESS_REQUIRED", message: "Admin access required" }
  }

  return user
}
```

---

## API Conventions

### Field Naming
- **Database:** snake_case (e.g., `created_at`, `tiktok_handle`)
- **API Response:** camelCase (e.g., `createdAt`, `tiktokHandle`)
- **JSONB internals:** Preserve original case (e.g., `valueData.duration_days`)

### Backend-Formatted Fields
Backend provides pre-formatted versions for display:

| Raw Field | Formatted Field | Example |
|-----------|-----------------|---------|
| `amount` | `amountFormatted` | `"$50.00"` |
| `createdAt` | `createdAtFormatted` | `"Nov 25, 2025 6:00 PM EST"` |
| `completedAt` | `completedAtFormatted` | `"Nov 25, 2025"` |

### Success Response (Mutations)

```typescript
interface MutationResponse {
  success: boolean
  message: string  // User-facing success message
  // ... additional data
}
```

---

## Error Response Format

All errors follow this structure:

```typescript
interface ErrorResponse {
  error: string    // Machine-readable error code (SCREAMING_SNAKE_CASE)
  message: string  // Human-readable message
}
```

### Common Admin Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid JWT token |
| `ADMIN_ACCESS_REQUIRED` | 403 | User is not admin |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `CONFLICT` | 409 | Resource state conflict (e.g., already fulfilled) |

---

## Screen 1: Dashboard

### GET /api/admin/dashboard/tasks

**Purpose:** Get today's actionable tasks and this week's upcoming tasks for the admin dashboard

**Frontend Reference:** `app/admin/dashboard/types.ts` (lines 1-131)

#### Request

```http
GET /api/admin/dashboard/tasks
Authorization: Bearer <token>
```

#### Query Parameters

None required.

#### Response Schema

```typescript
interface DashboardResponse {
  todaysTasks: TodaysTasks
  thisWeeksTasks: ThisWeeksTasks
}

interface TodaysTasks {
  discounts: TaskGroup<DiscountTask>
  commissionPayouts: TaskGroup<CommissionPayoutTask>
  instantRewards: TaskGroup<InstantRewardTask>
  physicalGifts: TaskGroup<PhysicalGiftTask>
  rafflesToDraw: TaskGroup<RaffleDrawTask>
}

interface ThisWeeksTasks {
  upcomingDiscounts: TaskGroup<UpcomingDiscount>
  upcomingRaffles: TaskGroup<UpcomingRaffle>
  expiringBoosts: TaskGroup<ExpiringBoost>
}

interface TaskGroup<T> {
  count: number                       // COUNT(*) from query
  countFormatted: string              // Backend formats: "12"
  items: T[]                          // Limited to 10 items max
}

// =============================================================================
// TODAY'S TASK TYPES
// =============================================================================

/** Discounts scheduled to activate today */
interface DiscountTask {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  discountPercent: number             // From rewards.value_data.percent
  scheduledTime: string               // From redemptions.scheduled_activation_time (ISO 8601)
  scheduledTimeFormatted: string      // Backend computes: "2:00 PM EST"
  couponCode: string                  // From rewards.value_data.coupon_code
}

/** Commission boosts pending payout */
interface CommissionPayoutTask {
  id: string                          // From commission_boost_redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  payoutAmount: number                // From commission_boost_redemptions.final_payout_amount
  payoutAmountFormatted: string       // Backend computes: "$47.50"
  paymentMethod: string               // From commission_boost_redemptions.payment_method
  paymentAccount: string              // From commission_boost_redemptions.payment_account
}

/** SLA status for time-sensitive tasks */
type SlaStatus = 'ok' | 'warning' | 'breach'

/** Instant rewards (gift cards, spark ads, experiences) to fulfill */
interface InstantRewardTask {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  rewardType: 'gift_card' | 'spark_ads' | 'experience'  // From rewards.type
  rewardValue: string                 // From rewards.value_data.amount OR display_text
  email: string | null                // From users.email (null for spark_ads)
  claimedHoursAgo: number             // Backend computes: hours since claimed_at
  claimedHoursAgoFormatted: string    // Backend computes: "22h"
  slaStatus: SlaStatus                // Backend computes: 'warning' if >20h, 'breach' if >24h
}

/** Physical gifts pending shipment */
interface PhysicalGiftTask {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  itemName: string                    // From rewards.name
  sizeValue: string | null            // From physical_gift_redemptions.size_value
  cityState: string                   // Backend computes: "Los Angeles, CA"
}

/** Raffles that need to be drawn today */
interface RaffleDrawTask {
  id: string                          // From missions.id (UUID)
  raffleName: string                  // From missions.display_name
  prizeName: string                   // From rewards.name
  participantCount: number            // COUNT(raffle_participations WHERE mission_id)
  participantCountFormatted: string   // Backend computes: "45"
  endDate: string                     // From missions.raffle_end_date (ISO 8601)
}

// =============================================================================
// THIS WEEK'S TASK TYPES
// =============================================================================

/** Upcoming discount activation */
interface UpcomingDiscount {
  id: string                          // From redemptions.id (UUID)
  date: string                        // From redemptions.scheduled_activation_date (ISO 8601)
  dateFormatted: string               // Backend computes: "Wed 27th"
  time: string                        // From redemptions.scheduled_activation_time
  timeFormatted: string               // Backend computes: "10:00 AM EST"
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  discountPercent: number             // From rewards.value_data.percent
}

/** Upcoming raffle drawing */
interface UpcomingRaffle {
  id: string                          // From missions.id (UUID)
  drawDate: string                    // From missions.raffle_end_date (ISO 8601)
  drawDateFormatted: string           // Backend computes: "Sat 30th"
  raffleName: string                  // From missions.display_name
  prizeName: string                   // From rewards.name
  participantCount: number            // COUNT(raffle_participations WHERE mission_id)
  participantCountFormatted: string   // Backend computes: "45"
}

/** Commission boost expiring soon */
interface ExpiringBoost {
  id: string                          // From commission_boost_redemptions.id (UUID)
  expirationDate: string              // From commission_boost_redemptions.expires_at (ISO 8601)
  expirationDateFormatted: string     // Backend computes: "Wed 27th"
  creatorHandle: string               // From users.tiktok_handle (with @ prefix)
  boostPercent: number                // From commission_boost_redemptions.boost_rate (locked at claim)
  estimatedPayout: number             // Backend computes: sales_delta × boost_rate
  estimatedPayoutFormatted: string    // Backend computes: "$32"
}
```

#### Example Response

**Success (200):**
```json
{
  "todaysTasks": {
    "discounts": {
      "count": 2,
      "countFormatted": "2",
      "items": [
        {
          "id": "redemption-disc-001",
          "creatorHandle": "@creator1",
          "discountPercent": 15,
          "scheduledTime": "2025-01-27T14:00:00-05:00",
          "scheduledTimeFormatted": "2:00 PM EST",
          "couponCode": "GOLD15"
        }
      ]
    },
    "commissionPayouts": {
      "count": 1,
      "countFormatted": "1",
      "items": [
        {
          "id": "boost-payout-001",
          "creatorHandle": "@creator2",
          "payoutAmount": 47.50,
          "payoutAmountFormatted": "$47.50",
          "paymentMethod": "PayPal",
          "paymentAccount": "john@email.com"
        }
      ]
    },
    "instantRewards": {
      "count": 3,
      "countFormatted": "3",
      "items": [
        {
          "id": "redemption-instant-001",
          "creatorHandle": "@creator4",
          "rewardType": "gift_card",
          "rewardValue": "$50 Gift Card",
          "email": "jane@email.com",
          "claimedHoursAgo": 22,
          "claimedHoursAgoFormatted": "22h",
          "slaStatus": "warning"
        }
      ]
    },
    "physicalGifts": {
      "count": 1,
      "countFormatted": "1",
      "items": [
        {
          "id": "redemption-physical-001",
          "creatorHandle": "@creator7",
          "itemName": "Hoodie",
          "sizeValue": "L",
          "cityState": "Los Angeles, CA"
        }
      ]
    },
    "rafflesToDraw": {
      "count": 0,
      "countFormatted": "0",
      "items": []
    }
  },
  "thisWeeksTasks": {
    "upcomingDiscounts": {
      "count": 3,
      "countFormatted": "3",
      "items": [
        {
          "id": "redemption-upcoming-001",
          "date": "2025-01-29",
          "dateFormatted": "Wed 29th",
          "time": "10:00:00",
          "timeFormatted": "10:00 AM EST",
          "creatorHandle": "@creator8",
          "discountPercent": 15
        }
      ]
    },
    "upcomingRaffles": {
      "count": 1,
      "countFormatted": "1",
      "items": [
        {
          "id": "mission-raffle-001",
          "drawDate": "2025-02-01",
          "drawDateFormatted": "Sat 1st",
          "raffleName": "Holiday Raffle",
          "prizeName": "iPhone 16",
          "participantCount": 45,
          "participantCountFormatted": "45"
        }
      ]
    },
    "expiringBoosts": {
      "count": 2,
      "countFormatted": "2",
      "items": [
        {
          "id": "boost-expiring-001",
          "expirationDate": "2025-01-29",
          "expirationDateFormatted": "Wed 29th",
          "creatorHandle": "@creator11",
          "boostPercent": 5,
          "estimatedPayout": 32,
          "estimatedPayoutFormatted": "$32"
        }
      ]
    }
  }
}
```

#### Business Logic

**Backend responsibilities:**

1. **Authenticate request:**
   ```typescript
   const user = await requireAdmin(req)
   if (!user) {
     return Response.json({ error: "UNAUTHORIZED" }, { status: 401 })
   }
   ```

2. **Query today's discounts to activate:**
   ```sql
   SELECT r.id, u.tiktok_handle, rw.value_data, r.scheduled_activation_time
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE rw.type = 'discount'
     AND r.status = 'claimed'
     AND r.scheduled_activation_date = CURRENT_DATE
   ORDER BY r.scheduled_activation_time ASC
   LIMIT 10;
   ```

3. **Query commission payouts pending:**
   ```sql
   SELECT cbr.id, u.tiktok_handle, cbr.final_payout_amount,
          cbr.payment_method, cbr.payment_account
   FROM commission_boost_redemptions cbr
   JOIN redemptions r ON cbr.redemption_id = r.id
   JOIN users u ON r.user_id = u.id
   WHERE cbr.boost_status = 'pending_payout'
     AND cbr.expires_at <= CURRENT_DATE
   ORDER BY cbr.expires_at ASC
   LIMIT 10;
   ```

4. **Query instant rewards to fulfill:**
   ```sql
   SELECT r.id, u.tiktok_handle, u.email, rw.type, rw.value_data, r.claimed_at
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE rw.type IN ('gift_card', 'spark_ads', 'experience')
     AND r.status = 'claimed'
   ORDER BY r.claimed_at ASC
   LIMIT 10;
   ```

5. **Query physical gifts to ship:**
   ```sql
   SELECT r.id, u.tiktok_handle, rw.name, pgr.size_value,
          pgr.shipping_city, pgr.shipping_state
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
   WHERE rw.type = 'physical_gift'
     AND r.status = 'claimed'
     AND pgr.shipped_at IS NULL
   ORDER BY r.claimed_at ASC
   LIMIT 10;
   ```

6. **Query raffles to draw today:**
   ```sql
   SELECT m.id, m.display_name, rw.name AS prize_name, m.raffle_end_date,
          (SELECT COUNT(*) FROM raffle_participations rp WHERE rp.mission_id = m.id) AS participant_count
   FROM missions m
   JOIN rewards rw ON m.reward_id = rw.id
   WHERE m.mission_type = 'raffle'
     AND m.activated = true
     AND m.raffle_end_date <= CURRENT_DATE
     AND NOT EXISTS (SELECT 1 FROM raffle_participations rp WHERE rp.mission_id = m.id AND rp.is_winner = true)
   ORDER BY m.raffle_end_date ASC
   LIMIT 10;
   ```

7. **Query upcoming discounts (this week):**
   ```sql
   SELECT r.id, r.scheduled_activation_date, r.scheduled_activation_time,
          u.tiktok_handle, rw.value_data
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE rw.type = 'discount'
     AND r.status = 'claimed'
     AND r.scheduled_activation_date > CURRENT_DATE
     AND r.scheduled_activation_date <= CURRENT_DATE + INTERVAL '7 days'
   ORDER BY r.scheduled_activation_date ASC, r.scheduled_activation_time ASC
   LIMIT 10;
   ```

8. **Query upcoming raffles (this week):**
   ```sql
   SELECT m.id, m.display_name, rw.name AS prize_name, m.raffle_end_date,
          (SELECT COUNT(*) FROM raffle_participations rp WHERE rp.mission_id = m.id) AS participant_count
   FROM missions m
   JOIN rewards rw ON m.reward_id = rw.id
   WHERE m.mission_type = 'raffle'
     AND m.activated = true
     AND m.raffle_end_date > CURRENT_DATE
     AND m.raffle_end_date <= CURRENT_DATE + INTERVAL '7 days'
   ORDER BY m.raffle_end_date ASC
   LIMIT 10;
   ```

9. **Query expiring boosts (this week):**
   ```sql
   SELECT cbr.id, u.tiktok_handle, cbr.boost_rate, cbr.expires_at, cbr.sales_delta
   FROM commission_boost_redemptions cbr
   JOIN redemptions r ON cbr.redemption_id = r.id
   JOIN users u ON r.user_id = u.id
   WHERE cbr.boost_status = 'active'
     AND cbr.expires_at > CURRENT_DATE
     AND cbr.expires_at <= CURRENT_DATE + INTERVAL '7 days'
   ORDER BY cbr.expires_at ASC
   LIMIT 10;
   ```

10. **Compute SLA status for instant rewards:**
    ```typescript
    function computeSlaStatus(claimedAt: Date): SlaStatus {
      const hoursAgo = (Date.now() - claimedAt.getTime()) / (1000 * 60 * 60)
      if (hoursAgo >= 24) return 'breach'
      if (hoursAgo >= 20) return 'warning'
      return 'ok'
    }
    ```

11. **Format response and return:**
    ```typescript
    return Response.json(dashboardResponse, { status: 200 })
    ```

#### Error Responses

**401 Unauthorized - Not Authenticated:**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**403 Forbidden - Not Admin:**
```json
{
  "error": "ADMIN_ACCESS_REQUIRED",
  "message": "Admin access required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

#### Security Notes

- Requires admin role (users.role = 'admin')
- Rate limiting: 100 requests per minute per user
- No sensitive PII exposed beyond what admin needs

#### Database Tables Used

**Primary:**
- `redemptions` - Claim tracking and status
- `commission_boost_redemptions` - Boost-specific data
- `physical_gift_redemptions` - Shipping info
- `missions` - Mission/raffle configuration
- `raffle_participations` - Raffle entries

**Related:**
- `users` - Creator profiles (JOIN for handle, email)
- `rewards` - Reward templates (JOIN for type, value_data)

#### Fields Referenced

| Table.Column | Type | API Field | Notes |
|--------------|------|-----------|-------|
| `redemptions.id` | UUID | `id` | Primary key |
| `redemptions.status` | VARCHAR(50) | - | Filter only |
| `redemptions.claimed_at` | TIMESTAMP | `claimedAt` | ISO 8601 |
| `redemptions.scheduled_activation_date` | DATE | `date` | For discounts |
| `redemptions.scheduled_activation_time` | TIME | `time` | For discounts |
| `users.tiktok_handle` | VARCHAR(100) | `creatorHandle` | With @ prefix |
| `users.email` | VARCHAR(255) | `email` | For instant rewards |
| `rewards.type` | VARCHAR(50) | `rewardType` | Enum |
| `rewards.name` | VARCHAR(100) | `itemName`, `prizeName` | |
| `rewards.value_data` | JSONB | Various | Type-specific fields |
| `commission_boost_redemptions.final_payout_amount` | DECIMAL(10,2) | `payoutAmount` | |
| `commission_boost_redemptions.payment_method` | VARCHAR(50) | `paymentMethod` | |
| `commission_boost_redemptions.payment_account` | VARCHAR(255) | `paymentAccount` | |
| `commission_boost_redemptions.expires_at` | TIMESTAMP | `expirationDate` | ISO 8601 |
| `commission_boost_redemptions.sales_delta` | DECIMAL(10,2) | - | For estimatedPayout calc |
| `commission_boost_redemptions.boost_rate` | DECIMAL(5,2) | `boostPercent` | Locked at claim |
| `physical_gift_redemptions.size_value` | VARCHAR(20) | `sizeValue` | |
| `physical_gift_redemptions.shipping_city` | VARCHAR(100) | - | For cityState |
| `physical_gift_redemptions.shipping_state` | VARCHAR(50) | - | For cityState |
| `missions.id` | UUID | `id` | Primary key |
| `missions.display_name` | VARCHAR(100) | `raffleName` | |
| `missions.raffle_end_date` | DATE | `endDate`, `drawDate` | |
| N/A | N/A | `*Formatted` fields | Backend computed |

---

## Screen 2: Redemptions

**Frontend Reference:** `app/admin/redemptions/types.ts`

This screen has 4 tabs with 9 total endpoints:
- Tab 1: Instant Rewards (gift_card, spark_ads, experience)
- Tab 2: Physical Gifts
- Tab 3: Pay Boost (commission boost payouts)
- Tab 4: Discounts

---

### GET /api/admin/redemptions

**Purpose:** Get all redemptions for all 4 tabs (list view)

#### Request

```http
GET /api/admin/redemptions
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface RedemptionsResponse {
  instantRewards: {
    count: number
    countFormatted: string
    items: InstantRewardItem[]
  }
  physicalGifts: {
    count: number
    countFormatted: string
    items: PhysicalGiftItem[]
  }
  payBoosts: {
    count: number
    countFormatted: string
    items: PayBoostItem[]
  }
  discounts: {
    count: number
    countFormatted: string
    items: DiscountItem[]
  }
}

// TAB 1: INSTANT REWARDS
interface InstantRewardItem {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle
  rewardType: 'gift_card' | 'spark_ads' | 'experience'  // From rewards.type
  rewardTypeFormatted: string         // Backend computes: "Gift Card", "Spark Ads", "Experience"
  value: string                       // From rewards.value_data.amount OR display_text
  email: string | null                // From users.email (null for spark_ads)
  status: 'claimed' | 'concluded'     // From redemptions.status
  claimedAt: string                   // From redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // Backend computes: "2 hours ago"
}

// TAB 2: PHYSICAL GIFTS
interface PhysicalGiftItem {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle
  itemName: string                    // From rewards.name
  sizeValue: string | null            // From physical_gift_redemptions.size_value
  cityState: string                   // Backend computes: "Los Angeles, CA"
  status: 'claimed' | 'shipped' | 'delivered'  // Derived from physical_gift_redemptions state
  statusFormatted: string             // Backend computes: "Pending", "Shipped", "Delivered"
  claimedAt: string                   // From redemptions.claimed_at (ISO 8601)
}

// TAB 3: PAY BOOST
interface PayBoostItem {
  id: string                          // From commission_boost_redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle (via redemptions JOIN)
  payoutAmount: number                // From commission_boost_redemptions.final_payout_amount
  payoutAmountFormatted: string       // Backend computes: "$47.50"
  paymentMethod: string               // From commission_boost_redemptions.payment_method
  paymentAccount: string              // From commission_boost_redemptions.payment_account
  status: 'pending_payout' | 'paid'   // From commission_boost_redemptions.boost_status
}

// TAB 4: DISCOUNT
interface DiscountItem {
  id: string                          // From redemptions.id (UUID)
  creatorHandle: string               // From users.tiktok_handle
  discountPercent: number             // From rewards.value_data.percent
  scheduledDate: string               // From redemptions.scheduled_activation_date (ISO 8601)
  scheduledTime: string               // From redemptions.scheduled_activation_time
  scheduledFormatted: string          // Backend computes: "Today 2:00 PM" or "Wed 10:00 AM"
  couponCode: string                  // From rewards.value_data.coupon_code
  status: 'claimed' | 'ready' | 'active' | 'done'  // Backend computes from time + activation state
  statusFormatted: string             // Backend computes
}
```

#### Business Logic

1. **Instant Rewards query:**
   ```sql
   SELECT r.id, u.tiktok_handle, rw.type, rw.value_data, u.email, r.status, r.claimed_at
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE rw.type IN ('gift_card', 'spark_ads', 'experience')
     AND r.status IN ('claimed', 'concluded')
     AND r.deleted_at IS NULL
   ORDER BY r.claimed_at DESC;
   ```

2. **Physical Gifts query:**
   ```sql
   SELECT r.id, u.tiktok_handle, rw.name, pgr.size_value,
          pgr.shipping_city, pgr.shipping_state, pgr.shipped_at, pgr.delivered_at, r.claimed_at
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
   WHERE rw.type = 'physical_gift'
     AND r.deleted_at IS NULL
   ORDER BY r.claimed_at DESC;
   ```

3. **Pay Boost query:**
   ```sql
   SELECT cbr.id, u.tiktok_handle, cbr.final_payout_amount,
          cbr.payment_method, cbr.payment_account, cbr.boost_status
   FROM commission_boost_redemptions cbr
   JOIN redemptions r ON cbr.redemption_id = r.id
   JOIN users u ON r.user_id = u.id
   WHERE cbr.boost_status IN ('pending_payout', 'paid')
     AND r.deleted_at IS NULL
   ORDER BY cbr.expires_at DESC;
   ```

4. **Discount query:**
   ```sql
   SELECT r.id, u.tiktok_handle, rw.value_data,
          r.scheduled_activation_date, r.scheduled_activation_time, r.activation_date, r.expiration_date
   FROM redemptions r
   JOIN users u ON r.user_id = u.id
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE rw.type = 'discount'
     AND r.status IN ('claimed', 'fulfilled', 'concluded')
     AND r.deleted_at IS NULL
   ORDER BY r.scheduled_activation_date ASC, r.scheduled_activation_time ASC;
   ```

5. **Compute discount status:**
   ```typescript
   function computeDiscountStatus(r: Redemption): 'claimed' | 'ready' | 'active' | 'done' {
     const now = new Date()
     const scheduledDateTime = new Date(`${r.scheduled_activation_date}T${r.scheduled_activation_time}`)

     if (r.status === 'concluded') return 'done'
     if (r.activation_date) {
       if (now < new Date(r.expiration_date)) return 'active'
       return 'done'
     }
     if (now >= scheduledDateTime) return 'ready'
     return 'claimed'
   }
   ```

---

### GET /api/admin/redemptions/physical/:id

**Purpose:** Get physical gift details for drawer view

#### Request

```http
GET /api/admin/redemptions/physical/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface PhysicalGiftDetails {
  id: string                          // From redemptions.id
  creatorHandle: string               // From users.tiktok_handle
  itemName: string                    // From rewards.name
  sizeValue: string | null            // From physical_gift_redemptions.size_value
  cityState: string                   // Backend computes
  status: 'claimed' | 'shipped' | 'delivered'
  statusFormatted: string
  claimedAt: string

  // Recipient info
  recipientName: string               // From physical_gift_redemptions.shipping_recipient_first_name + last_name
  addressLine1: string                // From physical_gift_redemptions.shipping_address_line1
  addressLine2: string | null         // From physical_gift_redemptions.shipping_address_line2
  city: string                        // From physical_gift_redemptions.shipping_city
  state: string                       // From physical_gift_redemptions.shipping_state
  postalCode: string                  // From physical_gift_redemptions.shipping_postal_code

  // Size info
  requiresSize: boolean               // From rewards.value_data.requires_size
  sizeCategory: string | null         // From rewards.value_data.size_category

  // Shipping info (admin fills)
  carrier: string | null              // From physical_gift_redemptions.carrier
  trackingNumber: string | null       // From physical_gift_redemptions.tracking_number
  shippedAt: string | null            // From physical_gift_redemptions.shipped_at (ISO 8601)
  deliveredAt: string | null          // From physical_gift_redemptions.delivered_at (ISO 8601)
  notes: string | null                // From redemptions.fulfillment_notes
}
```

---

### PATCH /api/admin/redemptions/physical/:id/ship

**Purpose:** Mark physical gift as shipped

#### Request

```http
PATCH /api/admin/redemptions/physical/:id/ship
Authorization: Bearer <token>
Content-Type: application/json

{
  "carrier": "USPS",
  "trackingNumber": "9400111899223456789012",
  "shippedAt": "2025-01-27",
  "notes": "Shipped via priority mail"
}
```

#### Response

```json
{
  "success": true,
  "message": "Gift marked as shipped"
}
```

#### Business Logic

```sql
UPDATE physical_gift_redemptions
SET carrier = $2,
    tracking_number = $3,
    shipped_at = $4,
    updated_at = NOW()
WHERE redemption_id = $1;

UPDATE redemptions
SET fulfillment_notes = $5,
    fulfilled_at = NOW(),
    fulfilled_by = $admin_id,
    status = 'fulfilled',
    updated_at = NOW()
WHERE id = $1;
```

---

### PATCH /api/admin/redemptions/physical/:id/deliver

**Purpose:** Mark physical gift as delivered (concludes redemption)

#### Request

```http
PATCH /api/admin/redemptions/physical/:id/deliver
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "message": "Gift marked as delivered"
}
```

#### Business Logic

```sql
UPDATE physical_gift_redemptions
SET delivered_at = NOW(),
    updated_at = NOW()
WHERE redemption_id = $1;

UPDATE redemptions
SET status = 'concluded',
    concluded_at = NOW(),
    updated_at = NOW()
WHERE id = $1;
```

---

### GET /api/admin/redemptions/boost/:id

**Purpose:** Get pay boost details for drawer view

#### Request

```http
GET /api/admin/redemptions/boost/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface PayBoostDetails {
  id: string                          // From commission_boost_redemptions.id
  creatorHandle: string               // From users.tiktok_handle
  payoutAmount: number                // From commission_boost_redemptions.final_payout_amount
  payoutAmountFormatted: string
  paymentMethod: string               // From commission_boost_redemptions.payment_method
  paymentAccount: string              // From commission_boost_redemptions.payment_account
  status: 'pending_payout' | 'paid'

  // Boost configuration (locked at claim)
  boostPercent: number                // From commission_boost_redemptions.boost_rate
  durationDays: number                // From commission_boost_redemptions.duration_days

  // Boost period
  activatedAt: string                 // From commission_boost_redemptions.activated_at (ISO 8601)
  activatedAtFormatted: string
  expiresAt: string                   // From commission_boost_redemptions.expires_at (ISO 8601)
  expiresAtFormatted: string

  // Sales during boost
  salesDuringBoost: number            // From commission_boost_redemptions.sales_delta
  salesDuringBoostFormatted: string

  // Payout tracking
  payoutSentAt: string | null         // From commission_boost_redemptions.payout_sent_at (ISO 8601)
  payoutSentByHandle: string | null   // From users.tiktok_handle (via JOIN on payout_sent_by)
  externalTransactionId: string | null // From redemptions.external_transaction_id
  payoutNotes: string | null          // From commission_boost_redemptions.payout_notes
}
```

---

### PATCH /api/admin/redemptions/boost/:id/pay

**Purpose:** Mark commission boost payout as sent

#### Request

```http
PATCH /api/admin/redemptions/boost/:id/pay
Authorization: Bearer <token>
Content-Type: application/json

{
  "datePaid": "2025-01-27",
  "paidBy": "Admin Name",
  "transactionId": "PAYPAL-ABC123",
  "notes": "Sent via PayPal"
}
```

#### Response

```json
{
  "success": true,
  "message": "Payout marked as sent"
}
```

#### Business Logic

```sql
UPDATE commission_boost_redemptions
SET boost_status = 'paid',
    payout_sent_at = $2,
    payout_sent_by = $admin_id,
    payout_notes = $4,
    updated_at = NOW()
WHERE id = $1;

UPDATE redemptions
SET status = 'concluded',
    concluded_at = NOW(),
    external_transaction_id = $3,
    updated_at = NOW()
WHERE id = (SELECT redemption_id FROM commission_boost_redemptions WHERE id = $1);
```

---

### GET /api/admin/redemptions/discount/:id

**Purpose:** Get discount details for drawer view

#### Request

```http
GET /api/admin/redemptions/discount/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface DiscountDetails {
  id: string                          // From redemptions.id
  creatorHandle: string               // From users.tiktok_handle
  discountPercent: number             // From rewards.value_data.percent
  scheduledDate: string               // From redemptions.scheduled_activation_date
  scheduledTime: string               // From redemptions.scheduled_activation_time
  scheduledFormatted: string
  couponCode: string                  // From rewards.value_data.coupon_code
  status: 'claimed' | 'ready' | 'active' | 'done'
  statusFormatted: string

  // Coupon configuration
  durationMinutes: number             // From rewards.value_data.duration_minutes
  durationFormatted: string           // Backend computes: "30 minutes"
  maxUses: number | null              // From rewards.value_data.max_uses

  // Activation tracking
  activatedAt: string | null          // From redemptions.activation_date (ISO 8601)
  activatedAtFormatted: string | null
  activatedByHandle: string | null    // From users.tiktok_handle (via JOIN on fulfilled_by)
  expiresAt: string | null            // From redemptions.expiration_date (ISO 8601)
  expiresAtFormatted: string | null
}
```

---

### PATCH /api/admin/redemptions/discount/:id/activate

**Purpose:** Activate discount coupon (when status = 'ready')

#### Request

```http
PATCH /api/admin/redemptions/discount/:id/activate
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "message": "Discount activated"
}
```

#### Business Logic

```sql
-- Get discount duration from reward
SELECT rw.value_data->>'duration_minutes' as duration_minutes
FROM redemptions r
JOIN rewards rw ON r.reward_id = rw.id
WHERE r.id = $1;

-- Update redemption
UPDATE redemptions
SET status = 'fulfilled',
    activation_date = NOW(),
    expiration_date = NOW() + ($duration_minutes * INTERVAL '1 minute'),
    fulfilled_at = NOW(),
    fulfilled_by = $admin_id,
    updated_at = NOW()
WHERE id = $1;
```

---

### PATCH /api/admin/redemptions/instant/:id/conclude

**Purpose:** Mark instant reward as done (gift card sent, spark ads applied, experience delivered)

#### Request

```http
PATCH /api/admin/redemptions/instant/:id/conclude
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "message": "Reward marked as completed"
}
```

#### Business Logic

```sql
UPDATE redemptions
SET status = 'concluded',
    concluded_at = NOW(),
    fulfilled_at = NOW(),
    fulfilled_by = $admin_id,
    updated_at = NOW()
WHERE id = $1
  AND status = 'claimed';
```

---

### Error Responses (All Redemption Endpoints)

**404 Not Found:**
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Redemption not found"
}
```

**409 Conflict (invalid state transition):**
```json
{
  "error": "INVALID_STATE",
  "message": "Cannot ship - gift already delivered"
}
```

---

### Database Tables Used

**Primary:**
- `redemptions` - Main claim tracking
- `physical_gift_redemptions` - Shipping info sub-state
- `commission_boost_redemptions` - Boost payout sub-state

**Related:**
- `users` - Creator profiles
- `rewards` - Reward templates (JOIN for type, value_data)

---

## Screen 3: Missions

**Frontend Reference:** `app/admin/missions/types.ts`

This screen has 8 endpoints:
- List/CRUD for missions
- Raffle management (activate, select winner)
- Available rewards dropdown

---

### GET /api/admin/missions

**Purpose:** Get all missions for table display

#### Request

```http
GET /api/admin/missions
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface MissionsResponse {
  missions: MissionItem[]
  totalCount: number
  totalCountFormatted: string
}

interface MissionItem {
  id: string                          // From missions.id (UUID)
  displayName: string                 // From missions.display_name
  missionType: MissionType            // From missions.mission_type
  missionTypeFormatted: string        // Backend computes: "Sales", "Videos", etc.
  targetValue: number                 // From missions.target_value
  targetValueFormatted: string        // Backend computes: "$100", "25 units", "-" for raffle
  rewardName: string                  // From rewards.name (via missions.reward_id JOIN)
  tierEligibility: TierEligibility    // From missions.tier_eligibility
  tierFormatted: string               // Backend computes: "Bronze", "All", etc.
  status: MissionStatus               // Backend computes from enabled + activated + raffle_end_date
  statusFormatted: string             // Backend computes: "Draft", "Active", "Ended"
  // Raffle-specific
  raffleEndDate: string | null        // From missions.raffle_end_date (ISO 8601)
  raffleEndDateFormatted: string | null // Backend computes: "Nov 30", "Today"
  raffleEntryCount: number | null     // Backend computes: COUNT(raffle_participations)
}

type MissionType = 'sales_dollars' | 'sales_units' | 'videos' | 'views' | 'likes' | 'raffle'
type TierEligibility = 'all' | 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6'
type MissionStatus = 'draft' | 'active' | 'ended'
```

#### Business Logic

```sql
SELECT m.id, m.display_name, m.mission_type, m.target_value, m.target_unit,
       m.tier_eligibility, m.enabled, m.activated, m.raffle_end_date,
       rw.name AS reward_name,
       (SELECT COUNT(*) FROM raffle_participations rp WHERE rp.mission_id = m.id) AS raffle_entry_count
FROM missions m
JOIN rewards rw ON m.reward_id = rw.id
WHERE m.client_id = $client_id
ORDER BY m.display_order ASC;
```

**Status computation:**
```typescript
function computeMissionStatus(m: Mission): MissionStatus {
  if (!m.enabled) return 'draft'
  if (m.mission_type === 'raffle') {
    if (!m.activated) return 'draft'
    if (new Date(m.raffle_end_date) < new Date()) return 'ended'
  }
  return 'active'
}
```

---

### GET /api/admin/missions/:id

**Purpose:** Get full mission details for edit drawer

#### Request

```http
GET /api/admin/missions/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface MissionDetails {
  id: string                          // From missions.id
  title: string                       // From missions.title (internal admin reference)
  displayName: string                 // From missions.display_name (user-facing, auto-set)
  description: string | null          // From missions.description (admin notes)
  missionType: MissionType            // From missions.mission_type
  targetValue: number                 // From missions.target_value
  targetUnit: TargetUnit              // From missions.target_unit
  rewardId: string | null             // From missions.reward_id (FK to rewards)
  tierEligibility: TierEligibility    // From missions.tier_eligibility
  previewFromTier: TierEligibility | null  // From missions.preview_from_tier
  displayOrder: number                // From missions.display_order
  enabled: boolean                    // From missions.enabled
  activated: boolean                  // From missions.activated
  raffleEndDate: string | null        // From missions.raffle_end_date (ISO 8601)
  // Joined data
  rewardName: string | null           // From rewards.name
}

type TargetUnit = 'dollars' | 'units' | 'count'
```

---

### POST /api/admin/missions

**Purpose:** Create new mission (with optional inline reward creation)

#### Request

```http
POST /api/admin/missions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Q1 Sales Sprint",
  "missionType": "sales_dollars",
  "targetValue": 100,
  "tierEligibility": "tier_2",
  "previewFromTier": "tier_1",
  "displayOrder": 1,
  "enabled": false,
  "activated": false,
  "raffleEndDate": null,
  "rewardId": "existing-reward-uuid",
  "inlineReward": null
}
```

**OR with inline reward creation:**

```json
{
  "title": "Q1 Sales Sprint",
  "missionType": "sales_dollars",
  "targetValue": 100,
  "tierEligibility": "tier_2",
  "previewFromTier": "tier_1",
  "displayOrder": 1,
  "enabled": false,
  "activated": false,
  "raffleEndDate": null,
  "rewardId": null,
  "inlineReward": {
    "type": "gift_card",
    "description": null,
    "valueData": {
      "amount": 50
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "mission": {
    "id": "new-mission-uuid",
    "displayName": "Sales Sprint"
  }
}
```

#### Business Logic

1. **If inlineReward provided, create reward first:**
   ```sql
   INSERT INTO rewards (client_id, type, description, value_data, reward_source, tier_eligibility, enabled)
   VALUES ($client_id, $type, $description, $value_data, 'mission', $tier_eligibility, true)
   RETURNING id;
   ```

2. **Auto-set display_name based on mission_type:**
   ```typescript
   const DISPLAY_NAMES: Record<MissionType, string> = {
     sales_dollars: 'Sales Sprint',
     sales_units: 'Sales Sprint',
     videos: 'Lights, Camera, Go!',
     views: 'Road to Viral',
     likes: 'Fan Favorite',
     raffle: 'VIP Raffle'
   }
   ```

3. **Auto-set target_unit based on mission_type:**
   ```typescript
   const TARGET_UNITS: Record<MissionType, TargetUnit> = {
     sales_dollars: 'dollars',
     sales_units: 'units',
     videos: 'count',
     views: 'count',
     likes: 'count',
     raffle: 'count'  // target_value = 0 for raffle
   }
   ```

4. **Insert mission:**
   ```sql
   INSERT INTO missions (
     client_id, title, display_name, description, mission_type, target_value, target_unit,
     reward_id, tier_eligibility, preview_from_tier, display_order, enabled, activated, raffle_end_date
   ) VALUES (
     $client_id, $title, $display_name, $description, $mission_type, $target_value, $target_unit,
     $reward_id, $tier_eligibility, $preview_from_tier, $display_order, $enabled, $activated, $raffle_end_date
   ) RETURNING id, display_name;
   ```

---

### PATCH /api/admin/missions/:id

**Purpose:** Update existing mission

#### Request

```http
PATCH /api/admin/missions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "targetValue": 150,
  "enabled": true,
  "activated": true
}
```

#### Response

```json
{
  "success": true,
  "message": "Mission updated"
}
```

#### Business Logic

```sql
UPDATE missions
SET title = COALESCE($title, title),
    target_value = COALESCE($target_value, target_value),
    tier_eligibility = COALESCE($tier_eligibility, tier_eligibility),
    preview_from_tier = $preview_from_tier,
    display_order = COALESCE($display_order, display_order),
    enabled = COALESCE($enabled, enabled),
    activated = COALESCE($activated, activated),
    raffle_end_date = $raffle_end_date,
    updated_at = NOW()
WHERE id = $1 AND client_id = $client_id;
```

**Note:** `mission_type` and `display_name` cannot be changed after creation.

---

### GET /api/admin/missions/raffle/:id

**Purpose:** Get raffle details for winner selection drawer

#### Request

```http
GET /api/admin/missions/raffle/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface RaffleDetails {
  id: string                          // From missions.id
  displayName: string                 // From missions.display_name
  rewardName: string                  // From rewards.name
  tierEligibility: TierEligibility    // From missions.tier_eligibility
  tierFormatted: string               // Backend computes
  raffleEndDate: string               // From missions.raffle_end_date (ISO 8601)
  raffleEndDateFormatted: string      // Backend computes
  entryCount: number                  // COUNT(raffle_participations)
  activated: boolean                  // From missions.activated
  participants: RaffleParticipant[]   // From raffle_participations JOIN users
  winnerHandle: string | null         // Winner's handle (if selected)
  winnerId: string | null             // Winner's user_id (if selected)
}

interface RaffleParticipant {
  id: string                          // From raffle_participations.id
  userId: string                      // From raffle_participations.user_id
  handle: string                      // From users.tiktok_handle
  participatedAt: string              // From raffle_participations.participated_at (ISO 8601)
  participatedAtFormatted: string     // Backend computes
}
```

#### Business Logic

```sql
-- Get raffle mission
SELECT m.id, m.display_name, m.tier_eligibility, m.raffle_end_date, m.activated,
       rw.name AS reward_name
FROM missions m
JOIN rewards rw ON m.reward_id = rw.id
WHERE m.id = $1 AND m.mission_type = 'raffle';

-- Get participants
SELECT rp.id, rp.user_id, u.tiktok_handle, rp.participated_at, rp.is_winner
FROM raffle_participations rp
JOIN users u ON rp.user_id = u.id
WHERE rp.mission_id = $1
ORDER BY rp.participated_at ASC;

-- Winner is participant WHERE is_winner = true
```

---

### POST /api/admin/missions/raffle/:id/activate

**Purpose:** Activate raffle to accept entries

#### Request

```http
POST /api/admin/missions/raffle/:id/activate
Authorization: Bearer <token>
```

#### Response

```json
{
  "success": true,
  "message": "Raffle activated"
}
```

#### Business Logic

```sql
UPDATE missions
SET activated = true,
    updated_at = NOW()
WHERE id = $1
  AND mission_type = 'raffle'
  AND activated = false;
```

---

### POST /api/admin/missions/raffle/:id/select-winner

**Purpose:** Select raffle winner

#### Request

```http
POST /api/admin/missions/raffle/:id/select-winner
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "winner-user-uuid"
}
```

#### Response

```json
{
  "success": true,
  "message": "Winner selected",
  "winnerHandle": "@lucky_creator"
}
```

#### Business Logic

```sql
-- Mark all participants as NOT winners
UPDATE raffle_participations
SET is_winner = false,
    winner_selected_at = NULL,
    selected_by = NULL,
    updated_at = NOW()
WHERE mission_id = $mission_id;

-- Mark selected user as winner
UPDATE raffle_participations
SET is_winner = true,
    winner_selected_at = NOW(),
    selected_by = $admin_id,
    updated_at = NOW()
WHERE mission_id = $mission_id AND user_id = $winner_user_id;

-- Update redemption status to 'claimed' for winner
UPDATE redemptions r
SET status = 'claimed',
    claimed_at = NOW(),
    updated_at = NOW()
FROM raffle_participations rp
WHERE rp.redemption_id = r.id
  AND rp.mission_id = $mission_id
  AND rp.user_id = $winner_user_id;

-- Reject all other participants' redemptions
UPDATE redemptions r
SET status = 'rejected',
    rejection_reason = 'Did not win raffle',
    rejected_at = NOW(),
    updated_at = NOW()
FROM raffle_participations rp
WHERE rp.redemption_id = r.id
  AND rp.mission_id = $mission_id
  AND rp.user_id != $winner_user_id;
```

---

### GET /api/admin/rewards/available

**Purpose:** Get available rewards for mission reward dropdown

#### Request

```http
GET /api/admin/rewards/available?tierEligibility=tier_2
Authorization: Bearer <token>
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| tierEligibility | string | No | Filter by tier |

#### Response Schema

```typescript
interface AvailableRewardsResponse {
  rewards: RewardOption[]
}

interface RewardOption {
  id: string                          // From rewards.id
  name: string                        // Backend-generated from type + value_data
  type: RewardType                    // From rewards.type
  valueFormatted: string              // Backend computes: "$50", "5% (30d)", etc.
}
```

#### Business Logic

```sql
SELECT id, type, value_data, description
FROM rewards
WHERE client_id = $client_id
  AND enabled = true
  AND reward_source = 'mission'
  AND ($tier_eligibility IS NULL OR tier_eligibility = $tier_eligibility)
ORDER BY type, display_order;
```

---

### Error Responses (All Mission Endpoints)

**404 Not Found:**
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Mission not found"
}
```

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Raffle missions require raffle_end_date"
}
```

**409 Conflict:**
```json
{
  "error": "INVALID_STATE",
  "message": "Raffle already has a winner selected"
}
```

---

### Database Tables Used

**Primary:**
- `missions` - Mission configuration
- `rewards` - Reward templates
- `raffle_participations` - Raffle entries and winner

**Related:**
- `users` - Participant handles
- `redemptions` - Updated when winner selected

---

## Screen 4: VIP Rewards

**Frontend Reference:** `app/admin/vip-rewards/types.ts`

This screen has 4 endpoints for CRUD operations on VIP tier rewards (`reward_source = 'vip_tier'`).

---

### GET /api/admin/vip-rewards

**Purpose:** Get all VIP rewards for table display

#### Request

```http
GET /api/admin/vip-rewards
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface VipRewardsResponse {
  rewards: VipRewardItem[]
  totalCount: number
  totalCountFormatted: string
}

interface VipRewardItem {
  id: string                          // From rewards.id (UUID)
  name: string                        // Backend-generated from type + value_data
  type: RewardType                    // From rewards.type
  typeFormatted: string               // Backend computes: "Gift Card", "Commission Boost", etc.
  tierEligibility: TierEligibility    // From rewards.tier_eligibility
  tierFormatted: string               // Backend computes: "Bronze", "Silver", etc.
  redemptionFrequency: RedemptionFrequency  // From rewards.redemption_frequency
  frequencyFormatted: string          // Backend computes: "One-time", "Monthly", etc.
  enabled: boolean                    // From rewards.enabled
  statusFormatted: string             // Backend computes: "Active" or "Inactive"
}

type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
type TierEligibility = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4' | 'tier_5' | 'tier_6'
type RedemptionFrequency = 'one-time' | 'monthly' | 'weekly' | 'unlimited'
```

#### Business Logic

```sql
SELECT id, type, description, value_data, tier_eligibility,
       redemption_frequency, redemption_quantity, enabled, display_order
FROM rewards
WHERE client_id = $client_id
  AND reward_source = 'vip_tier'
ORDER BY tier_eligibility ASC, display_order ASC;
```

**Backend generates name based on type + value_data:**
```typescript
function generateRewardName(r: Reward): string {
  switch (r.type) {
    case 'gift_card':
      return `$${r.value_data.amount} Gift Card`
    case 'commission_boost':
      return `${r.value_data.percent}% Pay Boost`
    case 'spark_ads':
      return `$${r.value_data.amount} Ads Boost`
    case 'discount':
      return `${r.value_data.percent}% Deal Boost`
    case 'physical_gift':
      return `Gift Drop: ${r.description}`
    case 'experience':
      return r.description
  }
}
```

---

### GET /api/admin/vip-rewards/:id

**Purpose:** Get full VIP reward details for edit drawer

#### Request

```http
GET /api/admin/vip-rewards/:id
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface VipRewardDetails {
  id: string                          // From rewards.id
  type: RewardType                    // From rewards.type
  description: string | null          // From rewards.description (max 12 chars)
  valueData: ValueData                // From rewards.value_data (JSONB, snake_case in DB)
  tierEligibility: TierEligibility    // From rewards.tier_eligibility
  previewFromTier: TierEligibility | null  // From rewards.preview_from_tier
  redemptionType: RedemptionType      // From rewards.redemption_type (auto-set by backend)
  redemptionFrequency: RedemptionFrequency  // From rewards.redemption_frequency
  redemptionQuantity: number | null   // From rewards.redemption_quantity (1-10, NULL for unlimited)
  expiresDays: number | null          // From rewards.expires_days (NULL = no expiration)
  enabled: boolean                    // From rewards.enabled
  name: string | null                 // Backend-generated for display
}

type RedemptionType = 'instant' | 'scheduled'  // instant: gift_card, spark_ads, physical_gift, experience | scheduled: commission_boost, discount

// Value data varies by type:
interface GiftCardValueData { amount: number }
interface CommissionBoostValueData { percent: number; durationDays: number }
interface SparkAdsValueData { amount: number }
interface DiscountValueData { percent: number; durationMinutes: number; couponCode: string; maxUses: number | null }
interface PhysicalGiftValueData { requiresSize: boolean; sizeCategory: string | null; sizeOptions: string[]; displayText: string }
interface ExperienceValueData { displayText: string }
```

#### Business Logic

```sql
SELECT id, type, description, value_data, tier_eligibility, preview_from_tier,
       redemption_type, redemption_frequency, redemption_quantity, expires_days, enabled
FROM rewards
WHERE id = $1
  AND client_id = $client_id
  AND reward_source = 'vip_tier';
```

**Note:** Backend converts snake_case `value_data` keys to camelCase for API response.

---

### POST /api/admin/vip-rewards

**Purpose:** Create new VIP tier reward

#### Request

```http
POST /api/admin/vip-rewards
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "gift_card",
  "description": null,
  "valueData": {
    "amount": 50
  },
  "tierEligibility": "tier_2",
  "previewFromTier": "tier_1",
  "redemptionFrequency": "monthly",
  "redemptionQuantity": 1,
  "expiresDays": null,
  "enabled": false
}
```

**Note:** `redemptionType` is auto-set by backend based on `type`:
- `instant`: gift_card, spark_ads, physical_gift, experience
- `scheduled`: commission_boost, discount

#### Response

```json
{
  "success": true,
  "reward": {
    "id": "new-reward-uuid",
    "name": "$50 Gift Card"
  }
}
```

#### Business Logic

1. **Auto-set redemption_type based on type:**
   ```typescript
   const REDEMPTION_TYPES: Record<RewardType, RedemptionType> = {
     gift_card: 'instant',
     spark_ads: 'instant',
     physical_gift: 'instant',
     experience: 'instant',
     commission_boost: 'scheduled',
     discount: 'scheduled'
   }
   ```

2. **Insert with snake_case value_data:**
   ```sql
   INSERT INTO rewards (
     client_id, type, description, value_data, reward_source, redemption_type,
     tier_eligibility, preview_from_tier, redemption_frequency,
     redemption_quantity, expires_days, enabled, display_order
   ) VALUES (
     $client_id, $type, $description, $value_data_snake_case, 'vip_tier', $redemption_type,
     $tier_eligibility, $preview_from_tier, $redemption_frequency,
     $redemption_quantity, $expires_days, $enabled,
     (SELECT COALESCE(MAX(display_order), 0) + 1 FROM rewards WHERE client_id = $client_id AND reward_source = 'vip_tier')
   ) RETURNING id;
   ```

**Validation Rules (per SchemaFinalv2.md constraints):**
- `type` must be valid reward type
- `tierEligibility` must be specific tier (no 'all' for VIP rewards)
- `redemptionQuantity` must be 1-10 if `redemptionFrequency` != 'unlimited'
- `redemptionQuantity` must be NULL if `redemptionFrequency` = 'unlimited'
- For `discount` type (CHECK constraint lines 563-574):
  - `percent`: 1-100
  - `duration_minutes`: 10-525600 (10 min to 1 year)
  - `coupon_code`: 2-8 chars, uppercase alphanumeric (`^[A-Z0-9]+$`)
  - `max_uses`: NULL or > 0

---

### PATCH /api/admin/vip-rewards/:id

**Purpose:** Update existing VIP reward

#### Request

```http
PATCH /api/admin/vip-rewards/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "valueData": {
    "amount": 75
  },
  "enabled": true
}
```

#### Response

```json
{
  "success": true,
  "message": "VIP reward updated"
}
```

#### Business Logic

```sql
UPDATE rewards
SET type = COALESCE($type, type),
    description = $description,
    value_data = COALESCE($value_data_snake_case, value_data),
    tier_eligibility = COALESCE($tier_eligibility, tier_eligibility),
    preview_from_tier = $preview_from_tier,
    redemption_type = COALESCE($redemption_type, redemption_type),
    redemption_frequency = COALESCE($redemption_frequency, redemption_frequency),
    redemption_quantity = $redemption_quantity,
    expires_days = $expires_days,
    enabled = COALESCE($enabled, enabled),
    updated_at = NOW()
WHERE id = $1
  AND client_id = $client_id
  AND reward_source = 'vip_tier';
```

**Note:** If `type` changes, backend must recalculate `redemption_type`.

---

### Error Responses (All VIP Reward Endpoints)

**404 Not Found:**
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "VIP reward not found"
}
```

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Coupon code must be 2-8 uppercase alphanumeric characters"
}
```

---

### Database Tables Used

**Primary:**
- `rewards` - Reward templates (WHERE `reward_source = 'vip_tier'`)

**Schema Constraints (from SchemaFinalv2.md):**
- `rewards.description` - VARCHAR(12) max for physical_gift/experience
- `rewards.value_data` - JSONB with type-specific validation
- `rewards.redemption_frequency` - 'one-time', 'monthly', 'weekly', 'unlimited'
- `rewards.redemption_quantity` - 1-10 or NULL (per CHECK constraint line 554)
- Discount `coupon_code` - 2-8 chars, uppercase alphanumeric (CHECK constraint line 570)

---

## Screen 5: Sales Adjustments

**Frontend Reference:** `app/admin/sales-adjustments/types.ts`

This screen has 3 endpoints for searching creators and managing sales adjustments.

---

### GET /api/admin/creators/search

**Purpose:** Search for creator by TikTok handle

#### Request

```http
GET /api/admin/creators/search?handle=@creator1
Authorization: Bearer <token>
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| handle | string | Yes | TikTok handle (with or without @) |

#### Response Schema

```typescript
interface CreatorSearchResponse {
  found: boolean
  creator: CreatorInfo | null
  error: string | null
}

interface CreatorInfo {
  id: string                          // From users.id (UUID)
  handle: string                      // From users.tiktok_handle
  // Sales mode fields (client.vip_metric = 'sales')
  totalSales: number | null           // From users.total_sales
  totalSalesFormatted: string | null  // Backend computes: "$5,420"
  checkpointSales: number | null      // From users.checkpoint_sales_current
  checkpointSalesFormatted: string | null  // Backend computes
  manualAdjustmentsTotal: number | null    // From users.manual_adjustments_total
  manualAdjustmentsTotalFormatted: string | null  // Backend computes: "+$300"
  // Units mode fields (client.vip_metric = 'units')
  totalUnits: number | null           // From users.total_units
  totalUnitsFormatted: string | null  // Backend computes: "5,420 units"
  checkpointUnits: number | null      // From users.checkpoint_units_current
  checkpointUnitsFormatted: string | null  // Backend computes
  manualAdjustmentsUnits: number | null    // From users.manual_adjustments_units
  manualAdjustmentsUnitsFormatted: string | null  // Backend computes: "+300 units"
  // Tier info
  currentTier: string                 // From users.current_tier
  currentTierName: string             // From tiers.tier_name (via JOIN)
}
```

#### Business Logic

```sql
SELECT u.id, u.tiktok_handle, u.total_sales, u.total_units,
       u.checkpoint_sales_current, u.checkpoint_units_current,
       u.manual_adjustments_total, u.manual_adjustments_units,
       u.current_tier, t.tier_name
FROM users u
LEFT JOIN tiers t ON u.current_tier = t.tier_id AND u.client_id = t.client_id
WHERE u.client_id = $client_id
  AND (u.tiktok_handle = $handle OR u.tiktok_handle = '@' || $handle);
```

**Return fields based on client.vip_metric:**
- If `vip_metric = 'sales'`: populate sales fields, null units fields
- If `vip_metric = 'units'`: populate units fields, null sales fields

---

### GET /api/admin/creators/:id/adjustments

**Purpose:** Get adjustment history for a creator

#### Request

```http
GET /api/admin/creators/:id/adjustments
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface AdjustmentHistoryResponse {
  adjustments: AdjustmentHistoryItem[]
  totalCount: number
  totalCountFormatted: string
}

interface AdjustmentHistoryItem {
  id: string                          // From sales_adjustments.id
  createdAt: string                   // From sales_adjustments.created_at (ISO 8601)
  createdAtFormatted: string          // Backend computes: "Nov 20"
  amount: number | null               // From sales_adjustments.amount (sales mode)
  amountUnits: number | null          // From sales_adjustments.amount_units (units mode)
  amountFormatted: string             // Backend computes: "+$200" or "-$50" or "+50 units"
  adjustmentType: AdjustmentType      // From sales_adjustments.adjustment_type
  adjustmentTypeFormatted: string     // Backend computes: "Manual Sale"
  reason: string                      // From sales_adjustments.reason
  appliedAt: string | null            // From sales_adjustments.applied_at (ISO 8601 or NULL)
  status: AdjustmentStatus            // Computed: applied_at IS NULL -> 'pending', else 'applied'
  statusFormatted: string             // Backend computes: "Pending" or "Applied"
  adjustedBy: string                  // From sales_adjustments.adjusted_by
  adjustedByHandle: string | null     // From users.tiktok_handle (via JOIN on adjusted_by)
}

type AdjustmentType = 'manual_sale' | 'refund' | 'bonus' | 'correction'
type AdjustmentStatus = 'pending' | 'applied'
```

#### Business Logic

```sql
SELECT sa.id, sa.amount, sa.amount_units, sa.reason, sa.adjustment_type,
       sa.adjusted_by, sa.created_at, sa.applied_at,
       admin.tiktok_handle AS adjusted_by_handle
FROM sales_adjustments sa
LEFT JOIN users admin ON sa.adjusted_by = admin.id
WHERE sa.user_id = $user_id
  AND sa.client_id = $client_id
ORDER BY sa.created_at DESC;
```

---

### POST /api/admin/creators/:id/adjustments

**Purpose:** Create new sales/units adjustment for a creator

#### Request

```http
POST /api/admin/creators/:id/adjustments
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": -50.00,
  "amountUnits": null,
  "adjustmentType": "refund",
  "reason": "Customer returned product order #12345"
}
```

**Note:** Provide `amount` for sales mode OR `amountUnits` for units mode (mutually exclusive).

#### Response

```json
{
  "success": true,
  "adjustment": {
    "id": "new-adjustment-uuid",
    "createdAt": "2025-01-27T10:30:00Z",
    "createdAtFormatted": "Just now",
    "amount": -50.00,
    "amountUnits": null,
    "amountFormatted": "-$50.00",
    "adjustmentType": "refund",
    "adjustmentTypeFormatted": "Refund",
    "reason": "Customer returned product order #12345",
    "appliedAt": null,
    "status": "pending",
    "statusFormatted": "Pending",
    "adjustedBy": "admin-uuid",
    "adjustedByHandle": "@admin_user"
  },
  "error": null
}
```

#### Business Logic

1. **Validate based on client.vip_metric:**
   ```typescript
   if (client.vip_metric === 'sales' && amount === null) {
     throw new ValidationError("Amount required for sales mode")
   }
   if (client.vip_metric === 'units' && amountUnits === null) {
     throw new ValidationError("Amount units required for units mode")
   }
   ```

2. **Insert adjustment:**
   ```sql
   INSERT INTO sales_adjustments (
     user_id, client_id, amount, amount_units, adjustment_type, reason, adjusted_by, created_at
   ) VALUES (
     $user_id, $client_id, $amount, $amount_units, $adjustment_type, $reason, $admin_id, NOW()
   ) RETURNING *;
   ```

3. **Note:** `applied_at` remains NULL. The daily sync job applies pending adjustments:
   ```sql
   -- Daily sync job (not this endpoint):
   UPDATE sales_adjustments
   SET applied_at = NOW()
   WHERE applied_at IS NULL;

   UPDATE users u
   SET manual_adjustments_total = manual_adjustments_total + (
     SELECT COALESCE(SUM(amount), 0) FROM sales_adjustments
     WHERE user_id = u.id AND applied_at IS NOT NULL AND amount IS NOT NULL
   ),
   manual_adjustments_units = manual_adjustments_units + (
     SELECT COALESCE(SUM(amount_units), 0) FROM sales_adjustments
     WHERE user_id = u.id AND applied_at IS NOT NULL AND amount_units IS NOT NULL
   );
   ```

---

### Error Responses (All Sales Adjustment Endpoints)

**404 Not Found:**
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Creator not found"
}
```

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Reason is required"
}
```

---

### Database Tables Used

**Primary:**
- `sales_adjustments` - Manual adjustments (SchemaFinalv2.md lines 271-286)
- `users` - Creator profiles with precomputed totals

**Key Schema Fields (from SchemaFinalv2.md):**
- `sales_adjustments.amount` - DECIMAL(10,2) for sales mode
- `sales_adjustments.amount_units` - INTEGER for units mode
- `sales_adjustments.adjustment_type` - 'manual_sale', 'refund', 'bonus', 'correction'
- `sales_adjustments.applied_at` - NULL = pending, timestamp = applied
- `users.manual_adjustments_total` - Running total of applied sales adjustments
- `users.manual_adjustments_units` - Running total of applied units adjustments

---

## Screen 6: Creator Lookup

**Frontend Reference:** `app/admin/creator-lookup/types.ts`

This screen reuses the search endpoint from Screen 5 and adds a details endpoint.

---

### GET /api/admin/creators/:id/details

**Purpose:** Get full creator details including active redemptions, mission progress, and history

#### Request

```http
GET /api/admin/creators/:id/details
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface CreatorDetailsResponse {
  profile: CreatorProfile
  activeRedemptions: ActiveRedemption[]
  missionProgress: MissionProgressItem[]
  redemptionHistory: RedemptionHistoryItem[]
}

interface CreatorProfile {
  id: string                          // From users.id
  handle: string                      // From users.tiktok_handle
  email: string                       // From users.email
  currentTier: string                 // From users.current_tier
  currentTierName: string             // From tiers.tier_name (via JOIN)
  // Sales mode fields
  totalSales: number | null           // From users.total_sales
  totalSalesFormatted: string | null  // Backend computes: "$5,420"
  checkpointSalesCurrent: number | null     // From users.checkpoint_sales_current
  checkpointSalesTarget: number | null      // From users.checkpoint_sales_target
  checkpointProgressFormatted: string | null // Backend computes: "$1,200 / $2,000"
  // Units mode fields
  totalUnits: number | null           // From users.total_units
  totalUnitsFormatted: string | null  // Backend computes: "5,420 units"
  checkpointUnitsCurrent: number | null     // From users.checkpoint_units_current
  checkpointUnitsTarget: number | null      // From users.checkpoint_units_target
  checkpointUnitsProgressFormatted: string | null // Backend computes: "120 / 200 units"
  // Member info
  createdAt: string                   // From users.created_at (ISO 8601)
  memberSinceFormatted: string        // Backend computes: "Jan 15, 2025"
}

interface ActiveRedemption {
  id: string                          // From redemptions.id
  rewardName: string                  // From rewards.name (backend-generated)
  rewardType: RewardType              // From rewards.type
  rewardTypeFormatted: string         // Backend computes: "Gift Card", "Pay Boost"
  status: RedemptionStatus            // From redemptions.status
  statusFormatted: string             // Backend computes
  claimedAt: string                   // From redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // Backend computes: "Nov 20"
  subStatus: string | null            // From sub-state tables (boost_status, shipping state)
}

interface MissionProgressItem {
  id: string                          // From mission_progress.id
  missionName: string                 // From missions.display_name
  missionType: MissionType            // From missions.mission_type
  missionTypeFormatted: string        // Backend computes: "Sales", "Videos", "Raffle"
  currentValue: number                // From mission_progress.current_value
  targetValue: number                 // From missions.target_value
  progressFormatted: string           // Backend computes: "$320/$500", "7/10", "entered"
  status: MissionProgressStatus       // From mission_progress.status
  statusFormatted: string             // Backend computes: "Active", "Completed"
}

interface RedemptionHistoryItem {
  id: string                          // From redemptions.id
  rewardName: string                  // From rewards.name
  claimedAt: string                   // From redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // Backend computes: "Oct 15"
  concludedAt: string                 // From redemptions.concluded_at (ISO 8601)
  concludedAtFormatted: string        // Backend computes: "Oct 16"
}

type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
type RedemptionStatus = 'claimable' | 'claimed' | 'fulfilled' | 'concluded' | 'rejected'
type MissionType = 'sales_dollars' | 'sales_units' | 'videos' | 'views' | 'likes' | 'raffle'
type MissionProgressStatus = 'active' | 'dormant' | 'completed'
```

#### Business Logic

1. **Get creator profile:**
   ```sql
   SELECT u.id, u.tiktok_handle, u.email, u.current_tier, u.created_at,
          u.total_sales, u.total_units,
          u.checkpoint_sales_current, u.checkpoint_sales_target,
          u.checkpoint_units_current, u.checkpoint_units_target,
          t.tier_name
   FROM users u
   LEFT JOIN tiers t ON u.current_tier = t.tier_id AND u.client_id = t.client_id
   WHERE u.id = $user_id AND u.client_id = $client_id;
   ```

2. **Get active redemptions:**
   ```sql
   SELECT r.id, r.status, r.claimed_at, rw.type, rw.value_data, rw.description,
          cbr.boost_status, pgr.shipped_at, pgr.delivered_at
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   LEFT JOIN commission_boost_redemptions cbr ON r.id = cbr.redemption_id
   LEFT JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
   WHERE r.user_id = $user_id
     AND r.client_id = $client_id
     AND r.status NOT IN ('concluded', 'rejected')
     AND r.deleted_at IS NULL
   ORDER BY r.claimed_at DESC;
   ```

3. **Get mission progress:**
   ```sql
   SELECT mp.id, mp.current_value, mp.status,
          m.display_name, m.mission_type, m.target_value
   FROM mission_progress mp
   JOIN missions m ON mp.mission_id = m.id
   WHERE mp.user_id = $user_id
     AND mp.client_id = $client_id
     AND mp.status IN ('active', 'completed')
   ORDER BY mp.updated_at DESC;
   ```

4. **Get redemption history (concluded only, last 10):**
   ```sql
   SELECT r.id, r.claimed_at, r.concluded_at, rw.type, rw.value_data, rw.description
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.user_id = $user_id
     AND r.client_id = $client_id
     AND r.status = 'concluded'
   ORDER BY r.concluded_at DESC
   LIMIT 10;
   ```

5. **Compute sub-status for active redemptions:**
   ```typescript
   function computeSubStatus(r: Redemption, cbr?: CommissionBoostRedemption, pgr?: PhysicalGiftRedemption): string | null {
     if (cbr) {
       return cbr.boost_status // 'scheduled', 'active', 'pending_payout', etc.
     }
     if (pgr) {
       if (pgr.delivered_at) return 'delivered'
       if (pgr.shipped_at) return 'shipped'
       return 'pending_shipment'
     }
     return null
   }
   ```

---

### Error Responses

**404 Not Found:**
```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Creator not found"
}
```

---

### Database Tables Used

**Primary:**
- `users` - Creator profile
- `redemptions` - Active and historical redemptions
- `mission_progress` - Current mission tracking

**Related:**
- `tiers` - Tier name lookup
- `rewards` - Reward details (for name generation)
- `missions` - Mission details
- `commission_boost_redemptions` - Boost sub-state
- `physical_gift_redemptions` - Shipping sub-state

**Key Schema Fields:**
- `users.checkpoint_sales_current`, `users.checkpoint_sales_target` (lines 140-141, 144)
- `users.checkpoint_units_current`, `users.checkpoint_units_target` (lines 141, 144)
- `mission_progress.status` - 'active', 'dormant', 'completed' (line 438)
- `redemptions.concluded_at` - When redemption was completed (line 607)

---

## Screen 7: Data Sync

**Frontend Reference:** `app/admin/data-sync/types.ts`

This screen has 2 endpoints for monitoring sync status and manual CSV uploads.

---

### GET /api/admin/sync/status

**Purpose:** Get current sync status and sync history

#### Request

```http
GET /api/admin/sync/status
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface DataSyncResponse {
  currentStatus: CurrentSyncStatus
  history: SyncHistoryItem[]
  historyCount: number
  historyCountFormatted: string
}

interface CurrentSyncStatus {
  status: SyncStatus               // From sync_logs.status (most recent)
  statusFormatted: string          // Backend computes: "Running", "Success", "Failed"
  lastSyncAt: string | null        // From sync_logs.completed_at or started_at
  lastSyncAtFormatted: string      // Backend computes: "Nov 25, 2025 6:00 AM EST"
  recordsProcessed: number         // From sync_logs.records_processed
  recordsProcessedFormatted: string // Backend computes: "1,247 processed"
  errorMessage: string | null      // From sync_logs.error_message
}

interface SyncHistoryItem {
  id: string                       // From sync_logs.id
  startedAt: string                // From sync_logs.started_at (ISO 8601)
  completedAt: string | null       // From sync_logs.completed_at (ISO 8601)
  dateFormatted: string            // Backend computes: "Nov 25 6AM"
  status: SyncStatus               // From sync_logs.status
  statusFormatted: string          // Backend computes
  recordsProcessed: number         // From sync_logs.records_processed
  recordsProcessedFormatted: string // Backend computes: "1,247"
  source: SyncSource               // From sync_logs.source
  sourceFormatted: string          // Backend computes: "Auto", "Manual"
  errorMessage: string | null      // From sync_logs.error_message
  fileName: string | null          // From sync_logs.file_name (manual uploads)
  triggeredBy: string | null       // From sync_logs.triggered_by
  triggeredByHandle: string | null // From users.tiktok_handle (via JOIN)
}

type SyncStatus = 'running' | 'success' | 'failed'
type SyncSource = 'auto' | 'manual'
```

#### Business Logic

1. **Get current status (most recent sync):**
   ```sql
   SELECT id, status, started_at, completed_at, records_processed, error_message
   FROM sync_logs
   WHERE client_id = $client_id
   ORDER BY started_at DESC
   LIMIT 1;
   ```

2. **Get sync history (last 10):**
   ```sql
   SELECT sl.id, sl.status, sl.source, sl.started_at, sl.completed_at,
          sl.records_processed, sl.error_message, sl.file_name, sl.triggered_by,
          u.tiktok_handle AS triggered_by_handle
   FROM sync_logs sl
   LEFT JOIN users u ON sl.triggered_by = u.id
   WHERE sl.client_id = $client_id
   ORDER BY sl.started_at DESC
   LIMIT 10;
   ```

---

### POST /api/admin/sync/upload

**Purpose:** Upload CSV file for manual sync

#### Request

```http
POST /api/admin/sync/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <CSV file>
csvType: "creator_metrics"
```

#### Response

```json
{
  "success": true,
  "syncLogId": "new-sync-log-uuid",
  "error": null
}
```

#### Business Logic

1. **Validate file:**
   - Must be CSV format
   - Max size: 10MB
   - csvType must be 'creator_metrics'

2. **Create sync log entry:**
   ```sql
   INSERT INTO sync_logs (
     client_id, status, source, started_at, file_name, triggered_by
   ) VALUES (
     $client_id, 'running', 'manual', NOW(), $file_name, $admin_id
   ) RETURNING id;
   ```

3. **Process CSV (async job):**
   - Parse CSV rows
   - Update users table with metrics
   - Update sync_logs with progress

4. **On completion:**
   ```sql
   UPDATE sync_logs
   SET status = 'success',
       completed_at = NOW(),
       records_processed = $count
   WHERE id = $sync_log_id;
   ```

5. **On failure:**
   ```sql
   UPDATE sync_logs
   SET status = 'failed',
       completed_at = NOW(),
       error_message = $error
   WHERE id = $sync_log_id;
   ```

---

### Error Responses

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid CSV format"
}
```

**413 Payload Too Large:**
```json
{
  "error": "FILE_TOO_LARGE",
  "message": "File exceeds 10MB limit"
}
```

---

### Database Tables Used

**Primary:**
- `sync_logs` - Sync operation tracking (SchemaFinalv2.md lines 328-353)

**Key Schema Fields:**
- `sync_logs.status` - 'running', 'success', 'failed' (line 335)
- `sync_logs.source` - 'auto', 'manual' (line 336)
- `sync_logs.started_at` - TIMESTAMP NOT NULL (line 337)
- `sync_logs.completed_at` - TIMESTAMP NULL (line 338)
- `sync_logs.records_processed` - INTEGER (line 339)
- `sync_logs.error_message` - TEXT (line 340)
- `sync_logs.file_name` - VARCHAR(255) (line 341)
- `sync_logs.triggered_by` - UUID REFERENCES users(id) (line 342)

---

## Screen 8: Reports

**Frontend Reference:** `app/admin/reports/types.ts`

This screen has 2 endpoints for viewing aggregated reports and exporting to Excel.

---

### GET /api/admin/reports

**Purpose:** Get rewards summary and creator activity reports for a date range

#### Request

```http
GET /api/admin/reports?preset=this_month
GET /api/admin/reports?preset=custom&startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer <token>
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| preset | string | Yes | 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'custom' |
| startDate | string | If custom | ISO 8601 date (YYYY-MM-DD) |
| endDate | string | If custom | ISO 8601 date (YYYY-MM-DD) |

#### Response Schema

```typescript
interface ReportsResponse {
  dateRange: DateRange
  rewardsSummary: RewardsSummaryReport
  creatorActivity: CreatorActivityReport
}

interface DateRange {
  preset: DateRangePreset
  startDate: string | null          // ISO 8601, for custom range
  endDate: string | null            // ISO 8601, for custom range
  periodLabel: string               // Backend computes: "November 2025", "Q4 2025"
}

type DateRangePreset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'custom'

// =============================================================================
// REPORT 1: REWARDS SUMMARY
// =============================================================================

interface RewardsSummaryReport {
  periodLabel: string               // Backend computes: "November 2025"
  rows: RewardsSummaryRow[]
  totalCount: number                // SUM of all row counts
  totalCountFormatted: string       // Backend computes: "95"
  totalSpent: number                // SUM of totalSpent (where applicable)
  totalSpentFormatted: string       // Backend computes: "$4,297.50"
}

interface RewardsSummaryRow {
  rewardType: RewardType            // From rewards.type
  rewardTypeFormatted: string       // Backend computes: "Gift Cards"
  count: number                     // COUNT(redemptions.id) WHERE status='concluded'
  countFormatted: string            // Backend computes: "45"
  totalSpent: number | null         // Varies by type (see Business Logic)
  totalSpentFormatted: string       // Backend computes: "$2,250.00" or "-"
}

type RewardType = 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'

// =============================================================================
// REPORT 2: CREATOR ACTIVITY SUMMARY
// =============================================================================

interface CreatorActivityReport {
  periodLabel: string               // Backend computes: "November 2025"
  totalUniqueCreators: number       // COUNT(DISTINCT user_id) overall
  totalUniqueCreatorsFormatted: string // Backend computes: "67"
  totalRedemptions: number          // COUNT(redemptions.id) overall
  totalRedemptionsFormatted: string // Backend computes: "95"
  rows: CreatorActivityRow[]
}

interface CreatorActivityRow {
  rewardType: RewardType            // From rewards.type
  rewardTypeFormatted: string       // Backend computes: "Gift Cards"
  redemptionCount: number           // COUNT(redemptions.id) per type
  redemptionCountFormatted: string  // Backend computes: "45"
  uniqueCreators: number            // COUNT(DISTINCT redemptions.user_id) per type
  uniqueCreatorsFormatted: string   // Backend computes: "38"
}
```

#### Example Response

**Success (200):**
```json
{
  "dateRange": {
    "preset": "this_month",
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "periodLabel": "January 2025"
  },
  "rewardsSummary": {
    "periodLabel": "January 2025",
    "rows": [
      {
        "rewardType": "gift_card",
        "rewardTypeFormatted": "Gift Cards",
        "count": 45,
        "countFormatted": "45",
        "totalSpent": 2250.00,
        "totalSpentFormatted": "$2,250.00"
      },
      {
        "rewardType": "commission_boost",
        "rewardTypeFormatted": "Commission Boosts",
        "count": 12,
        "countFormatted": "12",
        "totalSpent": 547.50,
        "totalSpentFormatted": "$547.50"
      },
      {
        "rewardType": "spark_ads",
        "rewardTypeFormatted": "Spark Ads",
        "count": 8,
        "countFormatted": "8",
        "totalSpent": 800.00,
        "totalSpentFormatted": "$800.00"
      },
      {
        "rewardType": "discount",
        "rewardTypeFormatted": "Discounts",
        "count": 15,
        "countFormatted": "15",
        "totalSpent": null,
        "totalSpentFormatted": "-"
      },
      {
        "rewardType": "physical_gift",
        "rewardTypeFormatted": "Physical Gifts",
        "count": 10,
        "countFormatted": "10",
        "totalSpent": null,
        "totalSpentFormatted": "-"
      },
      {
        "rewardType": "experience",
        "rewardTypeFormatted": "Experiences",
        "count": 5,
        "countFormatted": "5",
        "totalSpent": null,
        "totalSpentFormatted": "-"
      }
    ],
    "totalCount": 95,
    "totalCountFormatted": "95",
    "totalSpent": 3597.50,
    "totalSpentFormatted": "$3,597.50"
  },
  "creatorActivity": {
    "periodLabel": "January 2025",
    "totalUniqueCreators": 67,
    "totalUniqueCreatorsFormatted": "67",
    "totalRedemptions": 95,
    "totalRedemptionsFormatted": "95",
    "rows": [
      {
        "rewardType": "gift_card",
        "rewardTypeFormatted": "Gift Cards",
        "redemptionCount": 45,
        "redemptionCountFormatted": "45",
        "uniqueCreators": 38,
        "uniqueCreatorsFormatted": "38"
      },
      {
        "rewardType": "commission_boost",
        "rewardTypeFormatted": "Commission Boosts",
        "redemptionCount": 12,
        "redemptionCountFormatted": "12",
        "uniqueCreators": 12,
        "uniqueCreatorsFormatted": "12"
      }
    ]
  }
}
```

#### Business Logic

**Backend responsibilities:**

1. **Compute date range from preset:**
   ```typescript
   function computeDateRange(preset: DateRangePreset, startDate?: string, endDate?: string): { start: Date, end: Date, label: string } {
     const now = new Date()
     switch (preset) {
       case 'this_month':
         return {
           start: startOfMonth(now),
           end: endOfMonth(now),
           label: format(now, 'MMMM yyyy')  // "January 2025"
         }
       case 'last_month':
         const lastMonth = subMonths(now, 1)
         return {
           start: startOfMonth(lastMonth),
           end: endOfMonth(lastMonth),
           label: format(lastMonth, 'MMMM yyyy')
         }
       case 'this_quarter':
         return {
           start: startOfQuarter(now),
           end: endOfQuarter(now),
           label: `Q${getQuarter(now)} ${getYear(now)}`  // "Q1 2025"
         }
       case 'last_quarter':
         const lastQuarter = subQuarters(now, 1)
         return {
           start: startOfQuarter(lastQuarter),
           end: endOfQuarter(lastQuarter),
           label: `Q${getQuarter(lastQuarter)} ${getYear(lastQuarter)}`
         }
       case 'custom':
         return {
           start: new Date(startDate!),
           end: new Date(endDate!),
           label: `${format(new Date(startDate!), 'MMM d')} - ${format(new Date(endDate!), 'MMM d, yyyy')}`
         }
     }
   }
   ```

2. **Query rewards summary (Report 1):**
   ```sql
   -- Gift cards: count and total from rewards.value_data.amount
   SELECT 'gift_card' AS reward_type,
          COUNT(r.id) AS count,
          SUM((rw.value_data->>'amount')::decimal) AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'gift_card'

   UNION ALL

   -- Commission boosts: count and total from commission_boost_redemptions.final_payout_amount
   SELECT 'commission_boost' AS reward_type,
          COUNT(r.id) AS count,
          SUM(cbr.final_payout_amount) AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   JOIN commission_boost_redemptions cbr ON r.id = cbr.redemption_id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'commission_boost'

   UNION ALL

   -- Spark ads: count and total from rewards.value_data.amount
   SELECT 'spark_ads' AS reward_type,
          COUNT(r.id) AS count,
          SUM((rw.value_data->>'amount')::decimal) AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'spark_ads'

   UNION ALL

   -- Discounts: count only, no spend tracking
   SELECT 'discount' AS reward_type,
          COUNT(r.id) AS count,
          NULL AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'discount'

   UNION ALL

   -- Physical gifts: count only, variable cost not tracked
   SELECT 'physical_gift' AS reward_type,
          COUNT(r.id) AS count,
          NULL AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'physical_gift'

   UNION ALL

   -- Experiences: count only, variable cost not tracked
   SELECT 'experience' AS reward_type,
          COUNT(r.id) AS count,
          NULL AS total_spent
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
     AND rw.type = 'experience';
   ```

3. **Query creator activity (Report 2):**
   ```sql
   -- Per reward type: redemption count and unique creators
   SELECT rw.type AS reward_type,
          COUNT(r.id) AS redemption_count,
          COUNT(DISTINCT r.user_id) AS unique_creators
   FROM redemptions r
   JOIN rewards rw ON r.reward_id = rw.id
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date
   GROUP BY rw.type
   ORDER BY rw.type;

   -- Overall totals
   SELECT COUNT(r.id) AS total_redemptions,
          COUNT(DISTINCT r.user_id) AS total_unique_creators
   FROM redemptions r
   WHERE r.client_id = $client_id
     AND r.status = 'concluded'
     AND r.concluded_at >= $start_date
     AND r.concluded_at <= $end_date;
   ```

4. **totalSpent calculation by reward type:**
   | Reward Type | Source | Notes |
   |-------------|--------|-------|
   | `gift_card` | `rewards.value_data.amount` | Fixed amount per reward |
   | `commission_boost` | `commission_boost_redemptions.final_payout_amount` | Actual payout (may differ from calculated) |
   | `spark_ads` | `rewards.value_data.amount` | Fixed amount per reward |
   | `discount` | N/A | No direct cost to client |
   | `physical_gift` | N/A | Variable cost, not tracked in DB |
   | `experience` | N/A | Variable cost, not tracked in DB |

---

### GET /api/admin/reports/export

**Purpose:** Export reports to Excel file

#### Request

```http
GET /api/admin/reports/export?preset=this_month&format=xlsx
Authorization: Bearer <token>
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| preset | string | Yes | Date range preset |
| startDate | string | If custom | ISO 8601 date |
| endDate | string | If custom | ISO 8601 date |
| format | string | No | 'xlsx' (default), 'csv' |

#### Response

**Success (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="rewards-report-2025-01.xlsx"`
- Body: Binary Excel file

#### Business Logic

1. **Generate same data as GET /api/admin/reports**

2. **Create Excel workbook with 2 sheets:**

   **Sheet 1: "Rewards Summary"**
   | Reward Type | Count | Total Spent |
   |-------------|-------|-------------|
   | Gift Cards | 45 | $2,250.00 |
   | Commission Boosts | 12 | $547.50 |
   | ... | ... | ... |
   | **Total** | **95** | **$3,597.50** |

   **Sheet 2: "Creator Activity"**
   | Reward Type | Redemptions | Unique Creators |
   |-------------|-------------|-----------------|
   | Gift Cards | 45 | 38 |
   | Commission Boosts | 12 | 12 |
   | ... | ... | ... |
   | **Total** | **95** | **67** |

3. **Generate filename based on date range:**
   ```typescript
   function generateFilename(dateRange: DateRange): string {
     if (dateRange.preset === 'custom') {
       return `rewards-report-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`
     }
     return `rewards-report-${dateRange.periodLabel.replace(' ', '-').toLowerCase()}.xlsx`
   }
   ```

4. **Use xlsx library for generation:**
   ```typescript
   import * as XLSX from 'xlsx'

   const workbook = XLSX.utils.book_new()

   // Sheet 1: Rewards Summary
   const summaryData = [
     ['Reward Type', 'Count', 'Total Spent'],
     ...rewardsSummary.rows.map(r => [r.rewardTypeFormatted, r.count, r.totalSpentFormatted]),
     ['Total', rewardsSummary.totalCount, rewardsSummary.totalSpentFormatted]
   ]
   const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
   XLSX.utils.book_append_sheet(workbook, summarySheet, 'Rewards Summary')

   // Sheet 2: Creator Activity
   const activityData = [
     ['Reward Type', 'Redemptions', 'Unique Creators'],
     ...creatorActivity.rows.map(r => [r.rewardTypeFormatted, r.redemptionCount, r.uniqueCreators]),
     ['Total', creatorActivity.totalRedemptions, creatorActivity.totalUniqueCreators]
   ]
   const activitySheet = XLSX.utils.aoa_to_sheet(activityData)
   XLSX.utils.book_append_sheet(workbook, activitySheet, 'Creator Activity')

   return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
   ```

---

### Error Responses (All Report Endpoints)

**400 Bad Request:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Custom date range requires startDate and endDate"
}
```

```json
{
  "error": "VALIDATION_ERROR",
  "message": "startDate cannot be after endDate"
}
```

---

### Database Tables Used

**Primary:**
- `redemptions` - Claim tracking (WHERE `status = 'concluded'`)
- `rewards` - Reward templates (for type and value_data)
- `commission_boost_redemptions` - For actual payout amounts

**Key Schema Fields:**
- `redemptions.status` - Filter for 'concluded' only
- `redemptions.concluded_at` - Date range filtering
- `redemptions.user_id` - For unique creator counts
- `rewards.type` - Grouping by reward type
- `rewards.value_data.amount` - For gift_card, spark_ads totals
- `commission_boost_redemptions.final_payout_amount` - For commission boost totals

---
