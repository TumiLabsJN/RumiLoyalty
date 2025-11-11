# API SPECIFICATION - Mission Endpoints

**Platform:** Rumi Loyalty Platform
**Audience:** Backend Developers
**Purpose:** Complete API specifications for mission-related endpoints
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [GET /api/missions](#2-get-apimissions)
3. [POST /api/missions/:id/claim](#3-post-apiMissionsidclaim)
4. [POST /api/missions/:id/participate](#4-post-apimissionsidparticipate)
5. [Status Computation Logic](#5-status-computation-logic)
6. [Error Handling](#6-error-handling)

---

## 1. OVERVIEW

### 1.1 Authentication

All mission endpoints require authentication via session token:

```http
Authorization: Bearer <session_token>
Cookie: session_id=<session_id>
```

### 1.2 Common Headers

**Request:**
```http
Content-Type: application/json
Accept: application/json
```

**Response:**
```http
Content-Type: application/json
```

### 1.3 Rate Limiting

- **GET endpoints:** 60 requests/minute per user
- **POST endpoints:** 10 requests/minute per user

---

## 2. GET /api/missions

Returns all missions visible to the authenticated user with computed status values.

### 2.1 Request

```http
GET /api/missions HTTP/1.1
Host: api.rumiloyalty.com
Authorization: Bearer <token>
```

**Query Parameters:** None

### 2.2 Response Format

```typescript
interface Mission {
  // Core identification
  id: string                    // UUID
  mission_type: 'sales' | 'videos' | 'views' | 'likes' | 'raffle'
  display_name: string          // e.g., "Unlock Payday", "VIP Raffle"
  description: string           // e.g., "Reach your sales target"

  // Progress fields (null for locked missions)
  current_progress: number | null  // Current value achieved (0 if no progress)
  goal: number                     // Target value to complete mission
  progress_percentage: number      // 0-100
  remaining_value: number          // How much more needed

  // Reward fields
  reward_type: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
  reward_value: number | null      // Numeric value (null for physical_gift/experience)
  reward_custom_text: string | null // Custom text for physical_gift/experience (15 char max)

  // Status (COMPUTED BY BACKEND - see Section 5)
  status: 'active' | 'completed' | 'claimed' | 'available' | 'dormant' | 'processing' | 'won' | 'locked'

  // Deadline
  checkpoint_end: string | null    // ISO 8601 timestamp (regular missions)

  // Tier controls
  required_tier: string | null     // If locked: 'tier_1', 'tier_2', etc.

  // Raffle-specific fields
  raffle_prize_name: string | null  // Prize name (15 char max, raffle only)
  raffle_end_date: string | null    // ISO 8601 timestamp (raffle only)
  activated: boolean | null         // Raffle entry status (raffle only)
}
```

### 2.3 Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "mission_type": "sales",
    "display_name": "Unlock Payday",
    "description": "Reach your sales target",
    "current_progress": 350,
    "goal": 500,
    "progress_percentage": 70,
    "remaining_value": 150,
    "reward_type": "gift_card",
    "reward_value": 50,
    "reward_custom_text": null,
    "status": "active",
    "checkpoint_end": "2025-04-30T23:59:59Z",
    "required_tier": null,
    "raffle_prize_name": null,
    "raffle_end_date": null,
    "activated": null
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "mission_type": "raffle",
    "display_name": "VIP Raffle",
    "description": "Enter to win iPhone 16 Pro",
    "current_progress": 0,
    "goal": 1,
    "progress_percentage": 0,
    "remaining_value": 0,
    "reward_type": "physical_gift",
    "reward_value": null,
    "reward_custom_text": "iPhone 16 Pro",
    "status": "available",
    "checkpoint_end": null,
    "required_tier": null,
    "raffle_prize_name": "iPhone 16 Pro",
    "raffle_end_date": "2025-02-15T23:59:59Z",
    "activated": true
  }
]
```

### 2.4 Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired session token"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch missions"
}
```

---

## 3. POST /api/missions/:id/claim

Creator claims a completed mission reward.

### 3.1 Request

```http
POST /api/missions/550e8400-e29b-41d4-a716-446655440000/claim HTTP/1.1
Host: api.rumiloyalty.com
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** None (empty)

### 3.2 Validation Rules

**Pre-conditions:**
1. Mission must exist and be enabled
2. User must have progress record for this mission
3. Mission status must be `'completed'` (not `'active'`, `'claimed'`, or `'fulfilled'`)
4. Mission must not be a raffle (raffles use different flow)

### 3.3 Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "mission_id": "550e8400-e29b-41d4-a716-446655440000",
  "redemption_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "claimed",
  "message": "Reward claimed successfully. Awaiting admin fulfillment."
}
```

**Side Effects:**
1. Updates `mission_progress.status` from `'completed'` to `'claimed'`
2. Sets `mission_progress.claimed_at = NOW()`
3. Creates `redemptions` record with `status='pending'`
4. Records `tier_at_claim` (locks tier for this redemption)

### 3.4 Error Responses

**400 Bad Request - Not Completed:**
```json
{
  "error": "BadRequest",
  "message": "Mission must be completed before claiming. Current status: active"
}
```

**400 Bad Request - Already Claimed:**
```json
{
  "error": "BadRequest",
  "message": "Mission reward already claimed"
}
```

**404 Not Found:**
```json
{
  "error": "NotFound",
  "message": "Mission not found or not accessible"
}
```

---

## 4. POST /api/missions/:id/participate

Creator participates in a raffle mission.

### 4.1 Request

```http
POST /api/missions/660e8400-e29b-41d4-a716-446655440001/participate HTTP/1.1
Host: api.rumiloyalty.com
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** None (empty)

### 4.2 Validation Rules

**Pre-conditions:**
1. Mission must exist and be enabled
2. Mission type must be `'raffle'`
3. Mission must have `activated=true` (raffle accepting entries)
4. User must not have already participated (no `mission_progress` record)
5. User's tier must match `tier_eligibility`
6. Raffle must not have ended (`raffle_end_date > NOW()`)

### 4.3 Success Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "mission_id": "660e8400-e29b-41d4-a716-446655440001",
  "participation_id": "880e8400-e29b-41d4-a716-446655440003",
  "redemption_id": "990e8400-e29b-41d4-a716-446655440004",
  "status": "processing",
  "raffle_end_date": "2025-02-15T23:59:59Z",
  "message": "Successfully entered raffle. Winner will be announced after draw date."
}
```

**Side Effects:**
1. Creates `mission_progress` record with `status='processing'`
2. Sets `mission_progress.claimed_at = NOW()`
3. Creates `raffle_participants` entry
4. Creates `redemptions` record with `status='pending'`
5. Records `tier_at_claim` (locks tier for this redemption)

### 4.4 Error Responses

**400 Bad Request - Not a Raffle:**
```json
{
  "error": "BadRequest",
  "message": "This endpoint is only for raffle missions"
}
```

**400 Bad Request - Not Activated:**
```json
{
  "error": "BadRequest",
  "message": "Raffle is not currently accepting entries. Status: dormant"
}
```

**400 Bad Request - Already Participated:**
```json
{
  "error": "BadRequest",
  "message": "You have already participated in this raffle"
}
```

**400 Bad Request - Raffle Ended:**
```json
{
  "error": "BadRequest",
  "message": "Raffle entry period has ended"
}
```

**403 Forbidden - Tier Mismatch:**
```json
{
  "error": "Forbidden",
  "message": "This raffle requires Gold tier. Your current tier: Silver"
}
```

---

## 5. STATUS COMPUTATION LOGIC

### 5.1 Backend Pseudocode

```typescript
async function getMissions(userId: string): Promise<Mission[]> {
  // Step 1: Get user's current tier
  const user = await db.query(`
    SELECT current_tier FROM users WHERE id = $1
  `, [userId])

  const currentTier = user.current_tier // e.g., 'tier_3' (Gold)

  // Step 2: Query missions + user's progress
  const missions = await db.query(`
    SELECT
      m.*,
      mp.status as progress_status,
      mp.current_value,
      mp.completed_at,
      mp.claimed_at
    FROM missions m
    LEFT JOIN mission_progress mp
      ON m.id = mp.mission_id
      AND mp.user_id = $1
      AND mp.checkpoint_start = (SELECT checkpoint_start FROM users WHERE id = $1)
    WHERE m.enabled = true
      AND m.client_id = $2
  `, [userId, user.client_id])

  // Step 3: Transform and compute status for each mission
  const transformed = missions.map(mission => {
    // Case 1: Mission is locked (tier requirement not met)
    if (mission.tier_eligibility !== currentTier && mission.tier_eligibility !== 'all') {
      // Check if user can preview
      const canPreview = checkPreviewAccess(currentTier, mission.preview_from_tier, mission.tier_eligibility)

      if (!canPreview) {
        return null // Don't show at all
      }

      return {
        ...mission,
        status: 'locked',
        current_progress: null,
        progress_percentage: 0,
        remaining_value: mission.target_value,
        required_tier: mission.tier_eligibility
      }
    }

    // Case 2: Raffle with no progress record
    if (mission.mission_type === 'raffle' && !mission.progress_status) {
      return {
        ...mission,
        status: mission.activated ? 'available' : 'dormant',
        current_progress: 0,
        progress_percentage: 0,
        remaining_value: 0,
        required_tier: null
      }
    }

    // Case 3: Raffle with progress record
    if (mission.mission_type === 'raffle' && mission.progress_status) {
      return {
        ...mission,
        status: mission.progress_status, // 'processing', 'won', 'lost', 'fulfilled'
        current_progress: 0,
        progress_percentage: mission.progress_status === 'won' ? 100 : 0,
        remaining_value: 0,
        required_tier: null
      }
    }

    // Case 4: Regular mission with progress record
    if (mission.progress_status) {
      const percentage = Math.min((mission.current_value / mission.target_value) * 100, 100)
      const remaining = Math.max(mission.target_value - mission.current_value, 0)

      return {
        ...mission,
        status: mission.progress_status, // 'active', 'completed', 'claimed', 'fulfilled'
        current_progress: mission.current_value,
        progress_percentage: Math.round(percentage),
        remaining_value: remaining,
        required_tier: null
      }
    }

    // Case 5: Regular mission with no progress record (new mission)
    return {
      ...mission,
      status: 'active',
      current_progress: 0,
      progress_percentage: 0,
      remaining_value: mission.target_value,
      required_tier: null
    }
  })
  .filter(m => m !== null) // Remove null entries (locked missions user can't preview)
  .filter(m =>
    // Filter out fulfilled, cancelled, lost missions
    !['fulfilled', 'cancelled', 'lost'].includes(m.status)
  )

  return transformed
}

function checkPreviewAccess(
  userTier: string,
  previewFromTier: string | null,
  requiredTier: string
): boolean {
  if (previewFromTier === null) {
    return false // No preview allowed
  }

  const tierLevels = {
    'tier_1': 1, // Bronze
    'tier_2': 2, // Silver
    'tier_3': 3, // Gold
    'tier_4': 4, // Platinum
  }

  const userLevel = tierLevels[userTier] || 0
  const previewLevel = tierLevels[previewFromTier] || 0

  // User can preview if their tier >= preview_from_tier
  return userLevel >= previewLevel
}
```

### 5.2 Status Decision Tree

```
Is mission enabled?
├─ NO → Don't return (filtered out)
└─ YES → Continue

Does user's tier match tier_eligibility?
├─ NO → Check preview_from_tier
│   ├─ Can preview → Return status='locked'
│   └─ Cannot preview → Don't return (filtered out)
└─ YES → Continue

Is mission type = 'raffle'?
├─ YES → Check progress record
│   ├─ No progress → Return status='available' or 'dormant' (based on activated)
│   └─ Has progress → Return status=progress_status ('processing', 'won', 'lost', 'fulfilled')
└─ NO (Regular mission) → Check progress record
    ├─ No progress → Return status='active'
    └─ Has progress → Return status=progress_status ('active', 'completed', 'claimed', 'fulfilled')

Filter out: status IN ('fulfilled', 'cancelled', 'lost')
```

### 5.3 Field Mappings

| Frontend Expects | Computed From | Notes |
|-----------------|---------------|-------|
| `status: 'active'` | `mission_progress.status='active'` OR no progress record | Regular missions |
| `status: 'completed'` | `mission_progress.status='completed'` | Regular missions |
| `status: 'claimed'` | `mission_progress.status='claimed'` | Regular missions |
| `status: 'available'` | `missions.activated=true` + no progress | Raffle only - NOT in DB |
| `status: 'dormant'` | `missions.activated=false` + no progress | Raffle only - NOT in DB |
| `status: 'processing'` | `mission_progress.status='processing'` | Raffle only |
| `status: 'won'` | `mission_progress.status='won'` | Raffle only |
| `status: 'locked'` | User tier doesn't match `tier_eligibility` | Computed - NOT in DB |

---

## 6. ERROR HANDLING

### 6.1 Common Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid mission state, already claimed, raffle not activated |
| 401 | Unauthorized | Missing or invalid session token |
| 403 | Forbidden | Tier requirement not met, raffle not eligible |
| 404 | Not Found | Mission doesn't exist or user doesn't have access |
| 409 | Conflict | Already participated in raffle |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database error, unexpected failure |

### 6.2 Error Response Format

All errors follow this structure:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "code": "ERROR_CODE_CONSTANT",
  "details": {
    "field": "Additional context"
  }
}
```

### 6.3 Client Retry Logic

**Retryable Errors (5xx):**
- 500 Internal Server Error
- 503 Service Unavailable
- 504 Gateway Timeout

**Exponential Backoff:**
```
Retry 1: Wait 1 second
Retry 2: Wait 2 seconds
Retry 3: Wait 4 seconds
Max retries: 3
```

**Non-Retryable Errors (4xx):**
- Client should display error to user
- Do not retry automatically
- User must correct the issue

---

## APPENDIX: COMPLETE TYPE DEFINITIONS

```typescript
// Mission status types
type MissionStatus =
  | 'active'       // Regular mission in progress
  | 'completed'    // Regular mission ready to claim
  | 'claimed'      // Regular mission claimed, awaiting fulfillment
  | 'available'    // Raffle accepting entries (computed from activated=true)
  | 'dormant'      // Raffle not yet open (computed from activated=false)
  | 'processing'   // Raffle entry submitted, awaiting winner selection
  | 'won'          // Raffle winner selected, awaiting fulfillment
  | 'locked'       // Tier requirement not met (computed)

// Mission types
type MissionType = 'sales' | 'videos' | 'views' | 'likes' | 'raffle'

// Reward types
type RewardType =
  | 'gift_card'
  | 'commission_boost'
  | 'spark_ads'
  | 'discount'
  | 'physical_gift'
  | 'experience'

// Complete mission interface
interface Mission {
  id: string
  mission_type: MissionType
  display_name: string
  description: string
  current_progress: number | null
  goal: number
  progress_percentage: number
  remaining_value: number
  reward_type: RewardType
  reward_value: number | null
  reward_custom_text: string | null
  status: MissionStatus
  checkpoint_end: string | null
  required_tier: string | null
  raffle_prize_name: string | null
  raffle_end_date: string | null
  activated: boolean | null
}

// API responses
interface ClaimResponse {
  success: boolean
  mission_id: string
  redemption_id: string
  status: 'claimed'
  message: string
}

interface ParticipateResponse {
  success: boolean
  mission_id: string
  participation_id: string
  redemption_id: string
  status: 'processing'
  raffle_end_date: string
  message: string
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
  details?: Record<string, any>
}
```

---

**END OF API_SPECIFICATION.MD**
