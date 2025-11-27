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

**Purpose:** Get today's tasks and this week's tasks for the admin dashboard

**Reference:** AdminFlows.md - Screen 1: Dashboard

#### Request

```http
GET /api/admin/dashboard/tasks
Authorization: Bearer <token>
```

#### Response Schema

```typescript
interface AdminDashboardTasksResponse {
  todaysTasks: {
    instantRewards: {
      count: number
      countFormatted: string  // "12"
      items: Array<{
        id: string                    // redemptions.id
        creatorHandle: string         // users.tiktok_handle
        rewardType: string            // rewards.type
        rewardName: string            // Backend-generated name
        claimedAt: string             // ISO 8601
        claimedAtFormatted: string    // "2 hours ago"
      }>
    }
    physicalGifts: {
      count: number
      countFormatted: string
      items: Array<{
        id: string
        creatorHandle: string
        rewardName: string
        status: 'pending_address' | 'pending_shipment'
        statusFormatted: string       // "Awaiting Address" | "Ready to Ship"
        claimedAt: string
        claimedAtFormatted: string
      }>
    }
    commissionBoosts: {
      count: number
      countFormatted: string
      items: Array<{
        id: string
        creatorHandle: string
        boostStatus: string           // commission_boost_redemptions.boost_status
        boostStatusFormatted: string  // "Pending Payout"
        finalPayoutAmount: number | null
        finalPayoutAmountFormatted: string | null  // "$47.50"
      }>
    }
    discounts: {
      count: number
      countFormatted: string
      items: Array<{
        id: string
        creatorHandle: string
        scheduledActivationDate: string
        scheduledActivationFormatted: string  // "Today at 2:00 PM EST"
        couponCode: string
      }>
    }
  }

  thisWeeksTasks: {
    // Same structure as todaysTasks but for the week
    instantRewards: { count: number; countFormatted: string }
    physicalGifts: { count: number; countFormatted: string }
    commissionBoosts: { count: number; countFormatted: string }
    discounts: { count: number; countFormatted: string }
  }
}
```

#### Business Logic

1. **Today's Tasks:** Filter by `created_at` or `scheduled_activation_date` = today (EST timezone)
2. **This Week's Tasks:** Filter by current week (Monday-Sunday EST)
3. **Instant Rewards:** redemptions WHERE status = 'claimed' AND reward.redemption_type = 'instant'
4. **Physical Gifts:** redemptions WHERE status IN ('claimed', 'fulfilled') AND reward.type = 'physical_gift'
5. **Commission Boosts:** commission_boost_redemptions WHERE boost_status IN ('pending_info', 'pending_payout')
6. **Discounts:** redemptions WHERE status = 'claimed' AND reward.type = 'discount' AND scheduled_activation_date = today

---

## Screen 2: Redemptions

*API contracts to be added*

---

## Screen 3: Missions

*API contracts to be added*

---

## Screen 4: VIP Rewards

*API contracts to be added*

---

## Screen 5: Sales Adjustments

*API contracts to be added*

---

## Screen 6: Creator Lookup

*API contracts to be added*

---

## Screen 7: Data Sync

*API contracts to be added*

---

## Screen 8: Reports

*API contracts to be added*

---
