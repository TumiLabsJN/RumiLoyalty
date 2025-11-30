# ARCHITECTURE

**Project:** RumiAI Loyalty Platform
**Pattern:** Repository + Service Layer (Alternative 3)
**Date Established:** 2025-01-10
**Status:** Active - Official Architecture

**Related Documents:**
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Complete API endpoint specifications and request/response schemas
- [Loyalty.md](./Loyalty.md) - Business requirements and feature specifications

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architectural Pattern](#architectural-pattern)
3. [Data Freshness Strategy](#data-freshness-strategy)
4. [Folder Structure](#folder-structure)
5. [Layer Responsibilities](#layer-responsibilities)
6. [Code Examples](#code-examples)
7. [Naming Conventions](#naming-conventions)
8. [Testing Strategy](#testing-strategy)
9. [Multitenancy Enforcement](#multitenancy-enforcement)
10. [Authorization & Security Checklists](#authorization--security-checklists)
11. [Migration Guide](#migration-guide)

---

## 1. OVERVIEW

### Why Repository + Service Pattern?

**Decision Context:** Chosen over simpler Service Layer pattern for a multitenant SaaS product with the following requirements:

✅ **Multitenancy is critical** - Tenant isolation must be enforced consistently
✅ **Multiple data sources** - Supabase + Cruva CSV export + future integrations
✅ **Long-term product** - Will be maintained for years
✅ **Testing required** - SaaS products need comprehensive test coverage
✅ **Daily cron jobs** - Backend processing needs clean separation
✅ **AI-assisted development** - Smaller, focused files work better with AI tools

**Trade-off Accepted:** ~5 extra hours upfront for cleaner, more maintainable architecture.

---

## 2. ARCHITECTURAL PATTERN

### The Three Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                  (Next.js App Router)                   │
│                                                          │
│  /app/api/missions/route.ts                            │
│  - Handles HTTP requests/responses                      │
│  - Validates input                                      │
│  - Returns JSON                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                         │
│                   (Business Logic)                       │
│                                                          │
│  /lib/services/missionService.ts                        │
│  - Orchestrates repositories                            │
│  - Implements business rules                            │
│  - Pure functions (no direct DB access)                 │
│  - Returns domain objects                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                        │
│                  (Data Access)                          │
│                                                          │
│  /lib/repositories/missionRepository.ts                 │
│  - CRUD operations                                      │
│  - Database queries                                     │
│  - Tenant isolation enforcement                         │
│  - External API calls                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
              ┌──────────────┬──────────────┐
              │   Supabase   │  Cruva CSV   │
              │  (Database)  │  (External)  │
              └──────────────┴──────────────┘
```

### Data Flow Example

**Request Flow:**
```
User clicks [Claim Reward]
  → POST /api/missions/123/claim (route.ts)
    → missionService.claimReward(userId, missionId)
      → missionRepository.findById(missionId)
      → missionRepository.updateStatus(missionId, 'claimed')
      → rewardRepository.createRedemption(userId, missionId)
    ← Service returns { success: true, redemptionId: '...' }
  ← Route returns JSON response
```

---

## 3. DATA FRESHNESS STRATEGY

**Decision:** Hybrid Approach (Precomputation + Compute-on-Request)
**Date:** 2025-01-18
**Updated:** Aligned with Loyalty.md precomputed fields strategy

### Overview

The platform uses **two different strategies** based on data characteristics:

1. **Precomputed Fields** - For dashboard/leaderboard metrics (updated daily)
2. **Compute on Request** - For real-time user actions (computed immediately)

---

### Strategy 1: Precomputed Fields (Daily Sync)

**What gets precomputed:**

User dashboard metrics are calculated once daily during Cruva CSV sync (3 PM EST):

**Leaderboard (5 fields):**
- `leaderboard_rank` - Position among all creators
- `total_sales` - Lifetime sales (sales mode)
- `total_units` - Lifetime units (units mode)
- `manual_adjustments_total` - Sum of manual sales adjustments
- `manual_adjustments_units` - Sum of manual unit adjustments

**Checkpoint Progress (3 fields):**
- `checkpoint_sales_current` - Sales in current checkpoint period (sales mode)
- `checkpoint_units_current` - Units in current checkpoint period (units mode)
- `projected_tier_at_checkpoint` - Projected tier based on current performance

**Engagement Metrics (4 fields):**
- `checkpoint_videos_posted` - Videos since tier achievement
- `checkpoint_total_views` - Total views in checkpoint period
- `checkpoint_total_likes` - Total likes in checkpoint period
- `checkpoint_total_comments` - Total comments in checkpoint period

**Next Tier Info (3 fields):**
- `next_tier_name` - Name of next tier
- `next_tier_threshold` - Sales threshold (sales mode)
- `next_tier_threshold_units` - Units threshold (units mode)

**Historical (1 field):**
- `checkpoint_progress_updated_at` - Last update timestamp

**Total: 16 precomputed fields per user**

---

**Why Precompute These Fields:**

✅ **Data Already Stale** - Cruva CSV syncs once daily (24h delay), so compute-on-request provides no freshness benefit
✅ **Mobile Performance Critical** - Target <200ms page load on 4G networks
✅ **Scale Justifies Optimization** - At 1000 creators (100K+ video rows), aggregation queries become slow
✅ **Infrastructure Already Exists** - Daily cron job already running, just add 2 minutes for precomputation
✅ **Consistent Data View** - All users see data from same sync time (no mid-day ranking fluctuations)

**Performance Comparison at 1000 creators:**

| Approach | Dashboard Load Time | Leaderboard Load Time |
|----------|--------------------|-----------------------|
| **Without precomputation** | 300-500ms | 400-600ms ❌ |
| **With precomputation** | 60-100ms | 50-80ms ✅ |

**Improvement:** 5-6x faster on mobile

---

**Implementation:**

Daily cron job updates all precomputed fields:

```typescript
// Runs during daily Cruva sync (Flow 1, Step 4)
async function updatePrecomputedFields() {
  // Update sales/units mode fields
  await db.execute(`
    UPDATE users u
    SET
      total_sales = (SELECT COALESCE(SUM(gmv), 0) FROM videos WHERE user_id = u.id),
      checkpoint_sales_current = (SELECT COALESCE(SUM(gmv), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
      checkpoint_videos_posted = (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
      checkpoint_total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
      -- ... (12 more fields)
      checkpoint_progress_updated_at = NOW()
    FROM clients c
    WHERE u.client_id = c.id AND c.vip_metric = 'sales'
  `)

  // Update leaderboard ranks
  await db.execute(`
    UPDATE users u
    SET leaderboard_rank = ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_sales DESC) as rank
      FROM users
    ) ranked
    WHERE u.id = ranked.id
  `)
}
```

**API queries are simple SELECTs:**

```typescript
// Fast query - no aggregation needed
async function getDashboard(userId: string) {
  return await db.users.findUnique({
    where: { id: userId },
    select: {
      leaderboard_rank: true,
      total_sales: true,
      checkpoint_sales_current: true,
      checkpoint_videos_posted: true,
      // ... all precomputed fields
    }
  })
}
```

---

### Strategy 2: Compute on Request (Real-time Operations)

**What gets computed on request:**

All **user-triggered actions** that require immediate feedback:

✅ **Reward claims** - Check eligibility, create redemption record
✅ **Raffle participation** - Validate tier, create participation record
✅ **Mission completion checks** - Compare current_value vs target_value
✅ **Profile updates** - Update user settings
✅ **Tier changes** - Manual admin adjustments
✅ **Payment info submission** - Commission boost payment collection

**Why Compute on Request:**

✅ **Need immediate feedback** - User expects instant response after clicking button
✅ **Low query complexity** - Simple lookups, not aggregations
✅ **Infrequent operations** - Not every page load, only on user action
✅ **Data changes between syncs** - User settings, admin adjustments happen outside daily sync

**Performance:** These queries are fast (<50ms) because:
- Indexed lookups (not aggregations)
- Single-row operations
- No complex JOINs

---

### Optimization Techniques (Both Strategies)

**1. Single Query with Priority Sorting**
- Fetch all mission types in one query (vs 4 sequential queries)
- Sort by priority in application layer
- Performance: ~80ms (vs 200ms sequential)

**2. Smart JOINs**
- Combine related data in single queries
- Reduce total query count per page load
- Example: User + tiers + next tier in one query

**3. Parallel Query Execution**
- Independent queries run simultaneously using `Promise.all()`
- Example: Fetch user data, missions, and rewards in parallel
- Reduces total wait time

**4. Database Indexes**
- Composite indexes on frequently queried columns
- Partial indexes with WHERE clauses
- Performance boost: 20-40% per query
- Precomputed fields have indexes: `idx_users_total_sales`, `idx_users_leaderboard_rank`

---

### Performance Targets

| Page | Target | Actual (Precomputed) |
|------|--------|---------------------|
| Home | < 200ms | ~60ms ✅ |
| Leaderboard | < 200ms | ~50ms ✅ |
| Missions | < 200ms | ~110ms ✅ |
| Rewards | < 200ms | ~130ms ✅ |
| Tiers | < 200ms | ~80ms ✅ |

---

### Data Update Frequency

| Data Type | Update Method | Frequency |
|-----------|--------------|-----------|
| Video data | Daily Cruva CSV sync | Once at 3 PM EST |
| Precomputed user metrics | Daily cron job | Once at 3 PM EST |
| Mission progress | Daily cron job | Once at 3 PM EST |
| Tier calculations | Daily cron job | Once at 3 PM EST |
| User actions | Compute on request | Immediate |
| Profile updates | Compute on request | Immediate |
| Reward claims | Compute on request | Immediate |

**Data staleness:** Max 24 hours (acceptable per Loyalty.md design)

---

### Why NOT Full Real-time?

❌ **Cruva API limitation** - CSV export only (no webhooks, no real-time API)
❌ **No benefit** - Data already 24h stale from Cruva sync
❌ **Scale problems** - Aggregating 100K+ video rows on every page load = slow
❌ **Complexity** - Cache invalidation, stale data bugs, higher maintenance cost

✅ **Daily precomputation** - Simple, fast, predictable, scales to 1000+ creators

---

## 4. FOLDER STRUCTURE

### Complete Directory Layout

```
/home/jorge/Loyalty/Rumi/App Code/V1/

├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Presentation Layer)
│   │   ├── dashboard/
│   │   │   └── featured-mission/
│   │   │       └── route.ts      # GET endpoint
│   │   ├── missions/
│   │   │   ├── route.ts          # GET /api/missions
│   │   │   ├── [id]/
│   │   │   │   ├── claim/
│   │   │   │   │   └── route.ts  # POST /api/missions/:id/claim
│   │   │   │   └── participate/
│   │   │   │       └── route.ts  # POST /api/missions/:id/participate
│   │   │   └── history/
│   │   │       └── route.ts      # GET /api/missions/history
│   │   ├── rewards/
│   │   │   ├── route.ts
│   │   │   └── history/
│   │   │       └── route.ts
│   │   ├── tiers/
│   │   │   └── route.ts
│   │   └── auth/
│   │       ├── signup/
│   │       ├── verify-otp/
│   │       └── reset-password/
│   │
│   ├── home/
│   │   └── page.tsx              # Frontend pages
│   ├── missions/
│   ├── rewards/
│   ├── tiers/
│   └── login/
│
├── lib/                          # Backend Logic
│   ├── services/                 # Service Layer (Business Logic)
│   │   ├── missionService.ts
│   │   ├── rewardService.ts
│   │   ├── tierService.ts
│   │   ├── authService.ts
│   │   └── cronService.ts        # Daily cron job logic
│   │
│   ├── repositories/             # Repository Layer (Data Access)
│   │   ├── missionRepository.ts
│   │   ├── rewardRepository.ts
│   │   ├── tierRepository.ts
│   │   ├── userRepository.ts
│   │   ├── tiktokRepository.ts   # External API
│   │   └── cacheRepository.ts    # Future: Redis
│   │
│   ├── types/                    # TypeScript Interfaces
│   │   ├── mission.ts
│   │   ├── reward.ts
│   │   ├── tier.ts
│   │   ├── user.ts
│   │   └── api.ts
│   │
│   ├── utils/                    # Shared Utilities
│   │   ├── supabase.ts           # Supabase client setup
│   │   ├── errors.ts             # Custom error classes
│   │   ├── validation.ts         # Input validation
│   │   └── formatters.ts         # Data formatters
│   │
│   └── middleware/               # Middleware Functions
│       ├── auth.ts               # Authentication middleware
│       ├── tenantIsolation.ts    # Tenant validation
│       └── rateLimit.ts          # Rate limiting
│
├── tests/                        # Test Files
│   ├── unit/
│   │   ├── services/
│   │   └── repositories/
│   └── integration/
│       └── api/
│
└── cron/                         # Background Jobs
    └── daily-sync.ts             # Daily TikTok sync
```

---

## 5. LAYER RESPONSIBILITIES

### Presentation Layer (API Routes)

**Location:** `/app/api/**/route.ts`

**Responsibilities:**
- ✅ HTTP request/response handling
- ✅ Input validation (request body, params, headers)
- ✅ Authentication (verify JWT token)
- ✅ Error handling (catch exceptions, return error responses)
- ✅ Calling service layer

**NOT Responsible For:**
- ❌ Database queries
- ❌ Business logic
- ❌ External API calls
- ❌ Data transformations

**Example:**
```typescript
// app/api/missions/[id]/claim/route.ts
import { claimMissionReward } from '@/lib/services/missionService'
import { getUserFromToken } from '@/lib/utils/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const user = await getUserFromToken(request)

    // 2. Validate input
    const missionId = params.id
    if (!missionId) {
      return Response.json({ error: 'Mission ID required' }, { status: 400 })
    }

    // 3. Call service layer
    const result = await claimMissionReward(user.id, missionId)

    // 4. Return response
    return Response.json(result, { status: 200 })

  } catch (error) {
    console.error('Claim error:', error)
    return Response.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    )
  }
}
```

---

### Service Layer (Business Logic)

**Location:** `/lib/services/*.ts`

**Responsibilities:**
- ✅ Orchestrating multiple repositories
- ✅ Implementing business rules
- ✅ Data transformations
- ✅ Computing derived values (e.g., mission status)
- ✅ Transaction coordination

**NOT Responsible For:**
- ❌ Direct database access (use repositories)
- ❌ HTTP handling (that's routes)
- ❌ Raw SQL queries (that's repositories)

**See Also:** [API_CONTRACTS.md](./API_CONTRACTS.md) for complete business logic specifications and validation rules.

**Example:**
```typescript
// lib/services/missionService.ts
import { missionRepository } from '@/lib/repositories/missionRepository'
import { rewardRepository } from '@/lib/repositories/rewardRepository'
import { userRepository } from '@/lib/repositories/userRepository'

export async function claimMissionReward(
  userId: string,
  missionId: string
) {
  // 1. Get user data (via repository)
  const user = await userRepository.findById(userId)

  // 2. Get mission data (via repository)
  const mission = await missionRepository.findById(missionId)

  // 3. Business logic validation
  if (mission.status !== 'completed') {
    throw new Error('Mission not completed yet')
  }

  if (mission.userId !== userId) {
    throw new Error('Mission does not belong to this user')
  }

  // 4. Update mission status (via repository)
  await missionRepository.updateStatus(missionId, 'claimed')

  // 5. Create redemption record (via repository)
  const redemption = await rewardRepository.createRedemption({
    userId,
    missionId,
    rewardId: mission.rewardId,
    tierAtClaim: user.currentTier,
    status: 'pending',
  })

  // 6. Return domain object
  return {
    success: true,
    redemptionId: redemption.id,
    message: 'Reward claimed successfully',
  }
}
```

---

### Repository Layer (Data Access)

**Location:** `/lib/repositories/*.ts`

**Responsibilities:**
- ✅ CRUD operations
- ✅ Database queries (Supabase)
- ✅ External API calls (TikTok, etc.)
- ✅ **Tenant isolation enforcement**
- ✅ Data mapping (DB → domain objects)

**NOT Responsible For:**
- ❌ Business logic
- ❌ Computing derived values
- ❌ Orchestrating multiple operations

**Example:**
```typescript
// lib/repositories/missionRepository.ts
import { createClient } from '@/lib/utils/supabase'
import type { Mission } from '@/lib/types/mission'

export const missionRepository = {
  /**
   * Find mission by ID
   * ENFORCES tenant isolation by verifying client_id
   */
  async findById(missionId: string): Promise<Mission | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        rewards (*)
      `)
      .eq('id', missionId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Find active missions for user
   * AUTOMATICALLY filters by user's client_id
   */
  async findActiveByUser(userId: string): Promise<Mission[]> {
    const supabase = createClient()

    // 1. Get user's client_id (tenant isolation)
    const { data: user } = await supabase
      .from('users')
      .select('client_id, current_tier, checkpoint_start')
      .eq('id', userId)
      .single()

    if (!user) throw new Error('User not found')

    // 2. Query missions filtered by client_id
    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        mission_progress (
          current_value,
          status,
          claimed_at,
          fulfilled_at
        )
      `)
      .eq('client_id', user.client_id)  // ← TENANT ISOLATION
      .eq('enabled', true)
      .eq('tier_eligibility', user.current_tier)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data
  },

  /**
   * Update mission status
   * SECURITY: Always filter by client_id to prevent cross-tenant mutations
   */
  async updateStatus(
    missionId: string,
    clientId: string,  // Required for tenant isolation
    status: 'active' | 'completed' | 'dormant'
  ): Promise<void> {
    const supabase = createClient()

    const { error, count } = await supabase
      .from('mission_progress')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('mission_id', missionId)
      .eq('client_id', clientId)  // Enforces tenant isolation
      .select('id', { count: 'exact', head: true })

    if (error) throw error

    // Fail if no rows updated (prevents cross-tenant mutation)
    if (count === 0) {
      throw new NotFoundError('Mission not found')
    }
  },
}
```

---

### Encryption Repository Example

**Use Case:** Encrypting sensitive payment information before storage

```typescript
// lib/repositories/commissionBoostRepository.ts
import { createClient } from '@/lib/utils/supabase'
import { encrypt, decrypt } from '@/lib/utils/encryption'
import type { PaymentInfo } from '@/lib/types/payment'

export const commissionBoostRepository = {
  /**
   * Update payment information with encryption
   * SECURITY: Always encrypt payment_account before storage
   */
  async updatePaymentInfo(
    boostId: string,
    clientId: string,
    paymentInfo: PaymentInfo
  ): Promise<void> {
    const supabase = createClient()

    // Encrypt sensitive field
    const encryptedAccount = encrypt(paymentInfo.payment_account)

    const { error, count } = await supabase
      .from('commission_boost_redemptions')
      .update({
        payment_method: paymentInfo.payment_method,
        payment_account: encryptedAccount,
        payment_account_confirm: encryptedAccount,
        payment_info_collected_at: new Date().toISOString()
      })
      .eq('id', boostId)
      .eq('client_id', clientId)  // Tenant isolation
      .select('id', { count: 'exact', head: true })

    if (error) throw error
    if (count === 0) throw new NotFoundError('Boost not found')
  },

  /**
   * Retrieve payment information with decryption
   * SECURITY: Always decrypt payment_account after retrieval
   */
  async getPaymentInfo(
    boostId: string,
    clientId: string
  ): Promise<PaymentInfo> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('commission_boost_redemptions')
      .select('payment_method, payment_account')
      .eq('id', boostId)
      .eq('client_id', clientId)  // Tenant isolation
      .single()

    if (error) throw error

    // Decrypt sensitive field
    return {
      payment_method: data.payment_method,
      payment_account: decrypt(data.payment_account)
    }
  }
}
```

**Key Points:**
- Encrypt BEFORE insert/update
- Decrypt AFTER select
- Never log decrypted values
- Always include tenant isolation (client_id filter)

---

### External Data Repository Example

**Note:** Current implementation uses Cruva CSV export, not TikTok API. This example shows potential future TikTok API integration.

```typescript
// lib/repositories/tiktokRepository.ts
// NOTE: Current implementation uses Cruva CSV export, not TikTok API
// This example shows potential future TikTok API integration
import type { TikTokMetrics } from '@/lib/types/tiktok'

export const tiktokRepository = {
  /**
   * Fetch user metrics from TikTok Shop API
   */
  async fetchUserMetrics(tiktokHandle: string): Promise<TikTokMetrics> {
    const response = await fetch(
      `https://api.tiktok.com/shop/metrics/${tiktokHandle}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.TIKTOK_API_KEY}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('TikTok API request failed')
    }

    const data = await response.json()

    return {
      totalSales: data.total_sales,
      totalVideos: data.total_videos,
      totalViews: data.total_views,
      totalLikes: data.total_likes,
      lastSyncedAt: new Date().toISOString(),
    }
  },
}
```

---

## 6. CODE EXAMPLES

### Complete Feature: Fetch Featured Mission

#### Step 1: Route Handler

```typescript
// app/api/dashboard/featured-mission/route.ts
import { getFeaturedMission } from '@/lib/services/missionService'
import { getUserFromToken } from '@/lib/utils/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request)
    const result = await getFeaturedMission(user.id)
    return Response.json(result)
  } catch (error) {
    console.error('Featured mission error:', error)
    return Response.json(
      { error: 'Failed to fetch featured mission' },
      { status: 500 }
    )
  }
}
```

#### Step 2: Service Layer

```typescript
// lib/services/missionService.ts
import { missionRepository } from '@/lib/repositories/missionRepository'
import { userRepository } from '@/lib/repositories/userRepository'
import { tierRepository } from '@/lib/repositories/tierRepository'

export async function getFeaturedMission(userId: string) {
  // 1. Get user and tier info
  const user = await userRepository.findById(userId)
  const tier = await tierRepository.findById(user.currentTier)

  // 2. Try to find mission by priority
  const missionTypes = ['sales', 'videos', 'likes', 'views']

  for (const type of missionTypes) {
    const mission = await missionRepository.findActiveByUserAndType(
      userId,
      type
    )

    if (mission) {
      // 3. Compute business logic
      const progressPercentage = Math.min(
        (mission.currentProgress / mission.targetValue) * 100,
        100
      )

      return {
        status: mission.status,
        mission: {
          id: mission.id,
          type: mission.missionType,
          displayName: getMissionDisplayName(mission.missionType),
          currentProgress: mission.currentProgress,
          targetValue: mission.targetValue,
          progressPercentage: Math.round(progressPercentage),
          rewardType: mission.reward.type,
          rewardAmount: mission.reward.valueData.amount,
          unitText: mission.missionType,
        },
        tier: {
          name: tier.tierName,
          color: tier.tierColor,
        },
        showCongratsModal: false,
        congratsMessage: null,
        supportEmail: user.client.supportEmail,
        emptyStateMessage: null,
      }
    }
  }

  // 4. No missions found
  return {
    status: 'no_missions',
    mission: null,
    tier: {
      name: tier.tierName,
      color: tier.tierColor,
    },
    showCongratsModal: false,
    congratsMessage: null,
    supportEmail: user.client.supportEmail,
    emptyStateMessage: 'You\'ve completed all missions for your tier!',
  }
}

function getMissionDisplayName(type: string): string {
  const names = {
    sales: 'Unlock Payday',
    videos: 'Lights, Camera, Go!',
    likes: 'Road to Viral',
    views: 'Eyes on You',
  }
  return names[type] || type
}
```

#### Step 3: Repository Layer

```typescript
// lib/repositories/missionRepository.ts
import { createClient } from '@/lib/utils/supabase'

export const missionRepository = {
  async findActiveByUserAndType(userId: string, missionType: string) {
    const supabase = createClient()

    // Get user's client_id and tier
    const { data: user } = await supabase
      .from('users')
      .select('client_id, current_tier, checkpoint_start')
      .eq('id', userId)
      .single()

    if (!user) return null

    // Find mission with tenant isolation
    const { data, error } = await supabase
      .from('missions')
      .select(`
        id,
        mission_type,
        target_value,
        reward_id,
        rewards (
          type,
          value_data
        ),
        mission_progress!inner (
          current_value,
          status
        )
      `)
      .eq('client_id', user.client_id)         // TENANT ISOLATION
      .eq('mission_type', missionType)
      .eq('tier_eligibility', user.current_tier)
      .eq('enabled', true)
      .eq('mission_progress.user_id', userId)
      .eq('mission_progress.checkpoint_start', user.checkpoint_start)
      .in('mission_progress.status', ['active', 'completed', 'claimed'])
      .order('display_order', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      missionType: data.mission_type,
      targetValue: data.target_value,
      currentProgress: data.mission_progress[0]?.current_value || 0,
      status: data.mission_progress[0]?.status || 'active',
      reward: data.rewards,
    }
  },
}
```

---

## 7. NAMING CONVENTIONS

### Files

- **Routes:** `route.ts` (Next.js convention)
- **Services:** `<domain>Service.ts` (e.g., `missionService.ts`)
- **Repositories:** `<domain>Repository.ts` (e.g., `missionRepository.ts`)
- **Types:** `<domain>.ts` (e.g., `mission.ts`)

### Functions

- **Services:** `verbNoun()` (e.g., `getFeaturedMission`, `claimReward`)
- **Repositories:** `crudOperation()` (e.g., `findById`, `updateStatus`, `create`)

### Variables

- **camelCase** for variables and functions
- **PascalCase** for types and interfaces
- **UPPER_SNAKE_CASE** for constants

### Data Transformation Conventions

**Database → API Response Transformations:**

All API responses transform database field names from `snake_case` to `camelCase`:

```typescript
// Database fields (snake_case)
{
  current_tier: 'tier_3',
  tier_achieved_at: '2025-01-01T00:00:00Z',
  total_sales: 5000
}

// API response (camelCase)
{
  currentTier: 'tier_3',
  tierAchievedAt: '2025-01-01T00:00:00Z',
  totalSales: 5000
}
```

**Critical Transformations (Special Cases):**

1. **Discount Duration Fields**
   ```typescript
   // Database stores duration in minutes
   rewards.value_data.duration_minutes = 10080  // 7 days

   // API response converts to days for display
   {
     valueData: {
       durationDays: Math.floor(duration_minutes / 1440)  // = 7
     }
   }
   ```

2. **Nested JSON Fields**
   ```typescript
   // Database JSONB column (snake_case keys)
   rewards.value_data = {
     "coupon_code": "GOLD15",
     "max_uses": 100
   }

   // API response (camelCase keys)
   {
     valueData: {
       couponCode: "GOLD15",
       maxUses: 100
     }
   }
   ```

3. **Encrypted Fields**
   ```typescript
   // Database stores encrypted value
   commission_boost_redemptions.payment_account = "encrypted_string_here"

   // Repository layer decrypts before returning
   {
     paymentAccount: decrypt(payment_account)  // "user@email.com"
   }
   ```

**Implementation Location:**
- Field name transformation: Service Layer
- Data type transformation: Service Layer
- Encryption/Decryption: Repository Layer

**Reference:** See [API_CONTRACTS.md](./API_CONTRACTS.md) for complete field transformation specifications.

---

## 8. TESTING STRATEGY

### Unit Tests (Fast, Isolated)

**Test Services:**
```typescript
// tests/unit/services/missionService.test.ts
import { getFeaturedMission } from '@/lib/services/missionService'
import { missionRepository } from '@/lib/repositories/missionRepository'

// Mock repositories
jest.mock('@/lib/repositories/missionRepository')

describe('missionService.getFeaturedMission', () => {
  it('returns active sales mission if available', async () => {
    // Arrange
    missionRepository.findActiveByUserAndType.mockResolvedValue({
      id: '123',
      missionType: 'sales',
      currentProgress: 300,
      targetValue: 500,
      status: 'active',
    })

    // Act
    const result = await getFeaturedMission('user-123')

    // Assert
    expect(result.status).toBe('active')
    expect(result.mission.type).toBe('sales')
    expect(result.mission.progressPercentage).toBe(60)
  })
})
```

**Test Repositories:**
```typescript
// tests/unit/repositories/missionRepository.test.ts
import { missionRepository } from '@/lib/repositories/missionRepository'

describe('missionRepository.findActiveByUserAndType', () => {
  it('filters by client_id for tenant isolation', async () => {
    // Use test database or mock Supabase client
    const result = await missionRepository.findActiveByUserAndType(
      'user-123',
      'sales'
    )

    // Verify query included client_id filter
    expect(mockSupabase.lastQuery).toContain('client_id')
  })
})
```

### Integration Tests (Slower, Real Database)

```typescript
// tests/integration/api/missions.test.ts
describe('POST /api/missions/:id/claim', () => {
  it('successfully claims completed mission', async () => {
    const response = await fetch('/api/missions/mission-123/claim', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

---

## 9. MULTITENANCY ENFORCEMENT

### Critical Rules

**EVERY repository query MUST filter by `client_id`**

**Pattern:**
```typescript
// 1. Get user's client_id first
const { data: user } = await supabase
  .from('users')
  .select('client_id')
  .eq('id', userId)
  .single()

// 2. Use client_id in all subsequent queries
const { data: missions } = await supabase
  .from('missions')
  .select('*')
  .eq('client_id', user.client_id)  // ← REQUIRED
```

**Checklist for Every Repository Function:**
- [ ] Does it query a tenant-scoped table? (missions, rewards, tiers, etc.)
- [ ] Does it include `.eq('client_id', clientId)` filter?
- [ ] Is the client_id from authenticated user (not user input)?
- [ ] For UPDATE/DELETE: Does it verify `count > 0` after mutation?
- [ ] For UPDATE/DELETE: Does it throw `NotFoundError` if `count === 0`?
- [ ] For sensitive fields: Does it encrypt before INSERT/UPDATE and decrypt after SELECT?

**Exception:** Global tables (no client_id):
- `users` table (has client_id as foreign key)
- `clients` table (is the tenant table)

---

## 10. AUTHORIZATION & SECURITY CHECKLISTS

### Overview

**Security Principle:**
> "Never trust the client, but let the client organize trusted data"

All authorization and business logic validation MUST occur in the backend (Service + Repository layers). Frontend code is assumed to be untrusted and can only handle presentation logic.

**Key Concepts:**
- **Authorization** = What data can the user ACCESS? (Backend filters queries)
- **Validation** = What actions can the user PERFORM? (Backend validates claims/mutations)
- **Presentation** = How should data DISPLAY? (Frontend organizes/formats trusted data)

---

### 10.1 Rewards Authorization Checklist

#### GET /api/dashboard (Rewards Data)

**Backend Query Requirements:**

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Filter by user's tier | `WHERE b.tier_eligibility = $currentTierId` | ✅ Must implement |
| Filter by user's client | `WHERE b.client_id = $clientId` | ✅ Must implement |
| Filter by enabled status | `WHERE b.enabled = true` | ✅ Must implement |

**Query Example:**
```sql
SELECT
  b.id,
  b.type,
  b.name,
  b.description,
  b.value_data,
  b.redemption_quantity,
  b.display_order
FROM rewards b
WHERE b.tier_eligibility = $currentTierId      -- SECURITY: User's tier only
  AND b.client_id = $clientId          -- SECURITY: User's client only
  AND b.enabled = true                 -- SECURITY: Active rewards only
ORDER BY b.display_order ASC
```

**Safe Frontend Operations:**
- ✅ Sorting rewards for display (presentation logic)
- ✅ Formatting reward text (UI logic)
- ✅ Mapping icons to types (UI logic)
- ✅ Slicing to top N items (UI logic)

**Why Frontend Sorting is Safe:**
Frontend can only sort/filter/display what backend already authorized. Even if a malicious user modifies frontend code, they cannot:
- ❌ See rewards from higher tiers (backend never sent them)
- ❌ See disabled rewards (backend filtered them)
- ❌ See other clients' rewards (backend enforced multitenancy)

---

#### POST /api/rewards/:id/claim (Claim Validation)

**Backend Validation Requirements:**

| Validation Check | Implementation | Status |
|------------------|----------------|--------|
| Verify tier eligibility | `reward.tier_eligibility === user.current_tier` | ✅ Must implement |
| Verify client ownership | `reward.client_id === user.client_id` | ✅ Must implement |
| Check redemption limits | `COUNT(redemptions) < reward.redemption_quantity` | ✅ Must implement |
| Verify reward enabled | `reward.enabled === true` | ✅ Must implement |
| Check frequency period | Based on `redemption_frequency` (monthly/weekly/one-time) | ✅ Must implement |

**Example Implementation:**
```typescript
// lib/services/rewardService.ts
export async function claimReward(userId: string, rewardId: string) {
  // 1. Get user data (includes client_id and tier)
  const user = await userRepository.findById(userId)
  if (!user) throw new NotFoundError('User not found')

  // 2. Get reward data
  const reward = await rewardRepository.findById(rewardId)
  if (!reward) throw new NotFoundError('Reward not found')

  // 3. SECURITY CHECKS (all must pass)

  // Check 1: Client ownership (multitenancy)
  if (reward.client_id !== user.client_id) {
    throw new ForbiddenError('Reward not available for your organization')
  }

  // Check 2: Tier eligibility
  if (reward.tier_eligibility !== user.current_tier) {
    throw new ForbiddenError('Tier requirement not met')
  }

  // Check 3: Reward is active
  if (!reward.enabled) {
    throw new ForbiddenError('Reward is no longer available')
  }

  // 4. Check redemption limits
  const period = getFrequencyPeriod(reward.redemption_frequency)
  const redeemedCount = await redemptionRepository.countByUserAndReward(
    userId,
    rewardId,
    period
  )

  if (redeemedCount >= reward.redemption_quantity) {
    throw new ForbiddenError('Redemption limit reached for this period')
  }

  // 5. All checks passed - create redemption
  return redemptionRepository.create({
    user_id: userId,
    reward_id: rewardId,
    status: 'pending',
    tier_at_claim: user.current_tier,
    claimed_at: new Date().toISOString()
  })
}

// Helper function for frequency periods
function getFrequencyPeriod(frequency: string): { start: Date; end: Date } {
  const now = new Date()

  switch (frequency) {
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    case 'weekly':
      const dayOfWeek = now.getDay()
      const start = new Date(now)
      start.setDate(now.getDate() - dayOfWeek)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start, end }
    case 'one-time':
      return {
        start: new Date(0), // Beginning of time
        end: new Date()     // Now
      }
    default:
      throw new Error(`Invalid frequency: ${frequency}`)
  }
}
```

**Critical Rule:**
> NEVER assume frontend has validated anything. Backend must re-validate ALL requirements on every mutation.

---

### 10.2 Missions Authorization Checklist

#### GET /api/missions (List Missions)

**Backend Query Requirements:**

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Filter by user's tier | `WHERE m.tier_eligibility = $currentTier` | ✅ Must implement |
| Filter by user's client | `WHERE m.client_id = $clientId` | ✅ Must implement |
| Filter by enabled status | `WHERE m.enabled = true` | ✅ Must implement |
| Filter by checkpoint period | `WHERE mp.checkpoint_start = $currentCheckpoint` | ✅ Must implement |

---

#### POST /api/missions/:id/claim (Claim Mission)

**Backend Validation Requirements:**

| Validation Check | Implementation | Status |
|------------------|----------------|--------|
| Verify mission completion | `mission_progress.current_value >= mission.target_value` | ✅ Must implement |
| Verify tier eligibility | `mission.tier_eligibility === user.current_tier` | ✅ Must implement |
| Verify client ownership | `mission.client_id === user.client_id` | ✅ Must implement |
| Verify status is 'completed' | `mission_progress.status === 'completed'` | ✅ Must implement |
| Prevent double-claim | `mission_progress.claimed_at === null` | ✅ Must implement |

---

### 10.3 Common Security Patterns

#### Pattern 1: Tenant Isolation

**Every query must include client_id filter:**
```typescript
// ✅ CORRECT
const rewards = await supabase
  .from('rewards')
  .select('*')
  .eq('client_id', user.client_id)  // Required

// ❌ WRONG - Missing client_id filter
const rewards = await supabase
  .from('rewards')
  .select('*')
  .eq('enabled', true)
```

---

#### Pattern 2: Server-Side Validation

**Never trust client input for authorization decisions:**
```typescript
// ❌ WRONG - Trusts client to send correct tier
async function claimReward(rewardId: string, userTier: string) {
  const reward = await getReward(rewardId)
  if (reward.tier_eligibility !== userTier) {  // userTier from client = UNSAFE
    throw new Error('Not eligible')
  }
}

// ✅ CORRECT - Gets tier from authenticated user
async function claimReward(userId: string, rewardId: string) {
  const user = await getUser(userId)    // userId from JWT token
  const reward = await getReward(rewardId)
  if (reward.tier_eligibility !== user.current_tier) {  // user.current_tier from DB = SAFE
    throw new Error('Not eligible')
  }
}
```

---

#### Pattern 3: Defense in Depth

**Validate at multiple layers:**

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Route Handler** | Authentication, input validation | Check JWT token valid, validate UUID format |
| **Service Layer** | Business logic, authorization | Check tier eligibility, redemption limits |
| **Repository Layer** | Data integrity, multitenancy | Include client_id in queries, enforce constraints |

---

### 10.4 Security Checklist Template

**Use this template when implementing new features:**

```markdown
## Feature: [Feature Name]

### Authorization (GET endpoints)
- [ ] Backend filters by user's tier
- [ ] Backend filters by user's client_id
- [ ] Backend filters by enabled/active status
- [ ] Frontend only organizes/displays authorized data

### Validation (POST/PUT/DELETE endpoints)
- [ ] Backend verifies tier eligibility
- [ ] Backend verifies client ownership
- [ ] Backend checks business rule constraints
- [ ] Backend prevents duplicate/invalid operations
- [ ] All user input is validated and sanitized

### Multitenancy
- [ ] All queries include .eq('client_id', user.client_id)
- [ ] User object comes from authenticated session
- [ ] No cross-tenant data leakage possible
- [ ] RLS policies use helper functions `is_admin_of_client()` / `get_current_user_client_id()` to avoid recursion

### Testing
- [ ] Unit tests verify authorization logic
- [ ] Integration tests verify SQL queries filter correctly
- [ ] Negative tests verify unauthorized access is blocked
```

---

## 11. MIGRATION GUIDE

### Adding a New Feature

**Example: Add "Leaderboard" feature**

#### Step 1: Create Types
```typescript
// lib/types/leaderboard.ts
export interface LeaderboardEntry {
  userId: string
  handle: string
  totalSales: number
  rank: number
}
```

#### Step 2: Create Repository
```typescript
// lib/repositories/leaderboardRepository.ts
export const leaderboardRepository = {
  async getTopCreators(clientId: string, limit: number) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, tiktok_handle, total_sales')
      .eq('client_id', clientId)  // TENANT ISOLATION
      .order('total_sales', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },
}
```

#### Step 3: Create Service
```typescript
// lib/services/leaderboardService.ts
import { leaderboardRepository } from '@/lib/repositories/leaderboardRepository'
import { userRepository } from '@/lib/repositories/userRepository'

export async function getLeaderboard(userId: string) {
  const user = await userRepository.findById(userId)
  const topCreators = await leaderboardRepository.getTopCreators(
    user.clientId,
    10
  )

  return topCreators.map((creator, index) => ({
    userId: creator.id,
    handle: creator.tiktok_handle,
    totalSales: creator.total_sales,
    rank: index + 1,
  }))
}
```

#### Step 4: Create API Route
```typescript
// app/api/leaderboard/route.ts
import { getLeaderboard } from '@/lib/services/leaderboardService'
import { getUserFromToken } from '@/lib/utils/auth'

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request)
    const leaderboard = await getLeaderboard(user.id)
    return Response.json(leaderboard)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
```

---

## 12. SECURITY DEFINER PATTERN FOR AUTH

### Overview

Authentication routes present a unique challenge: they need to query the database BEFORE the user is authenticated. Standard RLS policies fail because `auth.uid()` is NULL for unauthenticated requests.

**Problem:** RLS policies that check user permissions cause:
1. **Infinite recursion** - Admin policies query `users` table within themselves
2. **Zero rows returned** - When `auth.uid() = NULL`, no policies match
3. **Security holes** - `USING(true)` policies are overly permissive

**Solution:** SECURITY DEFINER RPC functions with GRANT/REVOKE access control.

### When to Use This Pattern

| Scenario | Use RPC? | Reason |
|----------|----------|--------|
| Unauthenticated auth routes (signup, login, check-handle) | YES | `auth.uid()` is NULL |
| OTP verification (verify-otp, resend-otp) | YES | User has session cookie but no JWT |
| Password reset (forgot-password, reset-password) | YES | User has token but no JWT |
| `getUserFromRequest()` in auth.ts | YES | Queries users table, triggers RLS recursion |
| Authenticated routes (dashboard, missions, rewards) | NO | Use standard RLS with helper functions |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: GRANT/REVOKE                                          │
│  ├─ All auth RPC functions: REVOKE FROM PUBLIC                  │
│  ├─ Groups A,B,D,E: GRANT TO service_role only                  │
│  └─ Group C: GRANT TO authenticated (for RLS policies)          │
│                                                                 │
│  Layer 2: SECURITY DEFINER Functions                            │
│  ├─ Run with definer privileges (bypass RLS)                    │
│  ├─ Return minimal data (boolean, limited columns)              │
│  └─ No privilege escalation parameters                          │
│                                                                 │
│  Layer 3: RLS Policies (for authenticated users)                │
│  ├─ Admin policies use is_admin_of_client() helper              │
│  ├─ Creator policies use get_current_user_client_id() helper    │
│  └─ No self-referencing subqueries (no recursion)               │
│                                                                 │
│  Layer 4: Client ID Trust Boundary                              │
│  ├─ client_id from process.env.CLIENT_ID (server-side)          │
│  └─ Never from user input                                       │
└─────────────────────────────────────────────────────────────────┘
```

### RPC Function Groups

**20 SECURITY DEFINER functions in 5 groups:**

| Group | Count | Purpose | Granted To |
|-------|-------|---------|------------|
| A | 6 | Auth routes (anon access): find user, check uniqueness, create user, get client | service_role |
| B | 3 | Cookie auth (OTP session): find user by ID, mark verified, update login | service_role |
| C | 2 | RLS helpers: is_admin_of_client(), get_current_user_client_id() | authenticated |
| D | 4 | OTP operations: create, find, mark used, increment attempts | service_role |
| E | 5 | Password reset: create token, find valid, find recent, mark used, invalidate | service_role |

### Repository Pattern

Auth repositories use `createAdminClient()` to call RPC functions:

```typescript
// File: lib/repositories/userRepository.ts
import { createAdminClient } from '@/lib/supabase/admin-client';

async findByHandle(clientId: string, handle: string): Promise<UserData | null> {
  // Note: createAdminClient() is SYNC, not async!
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('auth_find_user_by_handle', {
    p_client_id: clientId,
    p_handle: handle,
  });

  // IMPORTANT: RPC returns ARRAY, not single object
  if (error || !data || data.length === 0) return null;
  return mapToUserData(data[0]);  // Access first element
}
```

### Key Gotchas

| Gotcha | Wrong | Right |
|--------|-------|-------|
| Client sync | `await createAdminClient()` | `createAdminClient()` (sync) |
| RPC returns | `const user = data;` | `const user = data[0];` (array) |
| Admin client | Direct table queries | RPC function calls only |

### Why Admin Client + RPC Is OK

This does NOT violate the "never admin client for user-facing routes" guidance because:

1. **We're calling RPC functions, not direct table queries**
2. **RPC functions have explicit GRANT/REVOKE** - only `service_role` can call them
3. **The functions themselves are the security boundary** - they only expose what's needed
4. **The admin client is used to INVOKE the security mechanism**, not to bypass it

Think of it as:
- ❌ Admin client + direct table query = bypasses RLS = BAD
- ✅ Admin client + RPC function with GRANT = enforces function-level security = GOOD

### Tables with USING(false) Policies

Two tables deny ALL direct access - operations go through RPC only:

| Table | Policy | Reason |
|-------|--------|--------|
| `otp_codes` | `USING(false)` | OTP created before auth, `auth.uid()` is NULL |
| `password_reset_tokens` | `USING(false)` | Token created/used without auth |

This is MORE secure than `USING(true)` because:
- Direct queries are blocked even if someone bypasses the API
- All access must go through controlled RPC functions
- Defense in depth: even if GRANT fails, RLS blocks direct access

### RLS Helper Functions

Two helper functions break the recursion cycle for authenticated users:

```sql
-- Called BY admin RLS policies (breaks recursion)
CREATE OR REPLACE FUNCTION is_admin_of_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND client_id = p_client_id AND is_admin = true
    )
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Called BY creator RLS policies (breaks recursion)
CREATE OR REPLACE FUNCTION get_current_user_client_id()
RETURNS UUID AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    ELSE (SELECT client_id FROM public.users WHERE id = auth.uid())
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Note:** These are granted to `authenticated` role (not `service_role`) because they're called BY RLS policies during authenticated requests.

### Migration Reference

All functions, policies, and GRANT/REVOKE statements are in:
`supabase/migrations/20251129165155_fix_rls_with_security_definer.sql`

### Files Using This Pattern

| File | Functions Using RPC |
|------|---------------------|
| `lib/repositories/userRepository.ts` | 8 functions |
| `lib/repositories/clientRepository.ts` | 1 function |
| `lib/repositories/otpRepository.ts` | 4 functions |
| `lib/repositories/passwordResetRepository.ts` | 5 functions |
| `lib/utils/auth.ts` | `getUserFromRequest()` |
| `app/api/internal/client-config/route.ts` | 1 direct RPC call |

---

## SUMMARY

**Architecture:** Repository + Service Pattern
**Enforcement:** All repositories enforce tenant isolation via `client_id`
**Auth Pattern:** SECURITY DEFINER RPC functions for unauthenticated routes (Section 12)
**Testing:** Unit tests for services, integration tests for API routes
**Scalability:** Clean separation enables future growth (caching, multiple DBs, etc.)

**Key Files:**
- Routes: `/app/api/**/route.ts`
- Services: `/lib/services/*.ts`
- Repositories: `/lib/repositories/*.ts`
- Types: `/lib/types/*.ts`

---

**Document Version:** 1.1
**Last Updated:** 2025-11-21
**Changelog:**
- v1.1 (2025-11-21): Added cross-reference to API_CONTRACTS.md, documented data transformation conventions (discount duration, encryption, nested JSON)
- v1.0 (2025-01-10): Initial architecture documentation
**Next Review:** After first 3 features implemented
