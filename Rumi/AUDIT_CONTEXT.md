# AUDIT CONTEXT - QUICK REFERENCE

**Purpose:** Condensed reference for comprehensive schema, security, and logic audit
**Date:** 2025-01-14
**Sources:** SchemaFinalv2.md, ARCHITECTURE.md, MissionsRewardsFlows.md, Missions.md, Rewards.md

---

## 1. SCHEMA SUMMARY (16 Tables, 7 Domains)

### Domain 1: System Configuration
- **clients** - Multi-tenant config (root table)
  - `vip_metric` - 'sales' or 'units' mode (NEW in V2)
- **tiers** - Tier thresholds (3-6 tiers per client)
  - `sales_threshold` OR `units_threshold` (mutually exclusive)

### Domain 2: User Management
- **users** - Creator profiles + 16 precomputed dashboard fields
  - Leaderboard (5): leaderboard_rank, total_sales, total_units, manual_adjustments_total, manual_adjustments_units
  - Checkpoint (3): checkpoint_sales_current, checkpoint_units_current, projected_tier_at_checkpoint
  - Engagement (4): checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments
  - Next tier (3): next_tier_name, next_tier_threshold, next_tier_threshold_units
- **handle_changes** - TikTok handle tracking

### Domain 3: Performance Tracking
- **metrics** - Monthly aggregated metrics per creator
  - `tiktok_sales`, `tiktok_units_sold`, `checkpoint_units_sold` (NEW in V2)
- **videos** - Per-video analytics (granular, NOT aggregated)
  - Each row = 1 video (NOT SUM)
- **sales_adjustments** - Manual corrections
  - `amount` OR `amount_units` (mutually exclusive)

### Domain 4: Tier System
- **tier_checkpoints** - Audit trail for tier evaluations
  - `sales_in_period`/`sales_required` OR `units_in_period`/`units_required`

### Domain 5: Missions
- **missions** - Mission templates (admin-configured)
  - `target_unit` - 'dollars', 'units', or 'count' (NEW in V2)
- **mission_progress** - User progress tracking

### Domain 6: Rewards
- **rewards** - Reward templates (6 types)
- **redemptions** - 5-state lifecycle (claimable → claimed → fulfilled → concluded | rejected)

### Domain 7: Reward Sub-States
- **commission_boost_redemptions** - 6-state sub-lifecycle (scheduled → active → expired → pending_info → pending_payout → paid)
- **commission_boost_state_history** - Audit trail (auto-populated via trigger)
- **physical_gift_redemptions** - Size + shipping info
- **raffle_participations** - ONE-TO-MANY (has user_id, unlike other sub-states)

---

## 2. FOREIGN KEY DEPENDENCY TREE

```
clients (root)
├── users
│   ├── metrics
│   ├── videos
│   ├── sales_adjustments
│   ├── tier_checkpoints
│   ├── handle_changes
│   ├── mission_progress
│   └── redemptions
├── tiers
├── missions
│   ├── mission_progress
│   └── raffle_participations
└── rewards
    └── redemptions
        ├── commission_boost_redemptions
        │   └── commission_boost_state_history
        ├── physical_gift_redemptions
        └── raffle_participations
```

---

## 3. MULTI-TENANCY ENFORCEMENT RULES

### Critical Pattern (from ARCHITECTURE.md)

**EVERY repository query MUST filter by `client_id`:**

```typescript
// STEP 1: Get user's client_id
const { data: user } = await supabase
  .from('users')
  .select('client_id, current_tier')
  .eq('id', userId)
  .single()

// STEP 2: Use client_id in ALL subsequent queries
const { data: missions } = await supabase
  .from('missions')
  .select('*')
  .eq('client_id', user.client_id)  // ← REQUIRED
  .eq('tier_eligibility', user.current_tier)
```

### Checklist for Every Repository Function:
- [ ] Does it query a tenant-scoped table? (all tables except clients)
- [ ] Does it include `.eq('client_id', user.client_id)`?
- [ ] Is client_id from authenticated user (NOT user input)?

### Sub-State Tables Foreign Key Pattern:

**Why sub-states have client_id (despite being ONE-TO-ONE with redemptions):**
- ✅ Required for Row-Level Security (RLS) in multi-tenant SaaS
- ✅ Composite FK constraint ensures client_id matches parent redemptions.client_id
- ✅ Enables tenant-filtered queries without joining through redemptions

**Exception:** raffle_participations ALSO has user_id (ONE-TO-MANY relationship, needs UNIQUE(mission_id, user_id))

---

## 4. SECURITY PATTERNS & AUTHORIZATION

### Pattern 1: Tenant Isolation (from ARCHITECTURE.md lines 997-1015)

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
  .eq('enabled', true)  // Vulnerable to cross-tenant access
```

### Pattern 2: Server-Side Validation (lines 1018-1038)

```typescript
// ❌ WRONG - Trusts client input
async function claimReward(rewardId: string, userTier: string) {
  const reward = await getReward(rewardId)
  if (reward.tier_eligibility !== userTier) {  // userTier from client = UNSAFE
    throw new Error('Not eligible')
  }
}

// ✅ CORRECT - Gets tier from authenticated session
async function claimReward(userId: string, rewardId: string) {
  const user = await getUser(userId)  // userId from JWT token
  const reward = await getReward(rewardId)
  if (reward.tier_eligibility !== user.current_tier) {  // DB source = SAFE
    throw new Error('Not eligible')
  }
}
```

### Authorization Checklist (from ARCHITECTURE.md lines 831-869)

**GET Endpoints (Data Access):**
- [ ] Backend filters by user's tier (`WHERE tier_eligibility = $currentTier`)
- [ ] Backend filters by user's client (`WHERE client_id = $clientId`)
- [ ] Backend filters by enabled status (`WHERE enabled = true`)
- [ ] Frontend ONLY organizes/displays authorized data

**POST/PUT Endpoints (Mutations):**
- [ ] Backend verifies tier eligibility (`reward.tier_eligibility === user.current_tier`)
- [ ] Backend verifies client ownership (`reward.client_id === user.client_id`)
- [ ] Backend checks business rules (redemption limits, mission completion)
- [ ] Backend prevents duplicate/invalid operations

---

## 5. KEY FLOWS & STATE TRANSITIONS

### Flow 1: Mission Completion → Reward Claim

**From MissionsRewardsFlows.md:**

```
Mission Created (admin)
  ↓ (daily sync)
Mission Progress Created (user_id, checkpoint_start)
  ↓ (daily sync updates current_value)
Mission Completed (current_value >= target_value)
  ↓ (daily sync)
Redemption Created (status = 'claimable')
  ↓ (user clicks "Claim")
Redemption Claimed (status = 'claimed')
  ↓ (admin fulfills)
Redemption Fulfilled (status = 'fulfilled')
  ↓ (admin confirms)
Redemption Concluded (status = 'concluded')
```

### Flow 2: Commission Boost 6-State Lifecycle

**From Rewards.md:**

```
scheduled → active → expired → pending_info → pending_payout → paid
   ↓           ↓         ↓           ↓              ↓            ↓
(cron 6PM)  (D0)    (DX cron)  (user submits) (admin pays) (terminal)
```

**Auto-Sync Trigger:** commission_boost_redemptions.boost_status changes → redemptions.status updates automatically

### Flow 3: Raffle Winner Selection

```
Mission Created (type='raffle', activated=false)
  ↓ (admin activates)
Mission Activated (activated=true)
  ↓ (users participate)
Raffle Participations Created (is_winner=NULL)
  ↓ (raffle_end_date reached)
Admin Selects Winner (is_winner=TRUE for 1, FALSE for rest)
  ↓
Winner's Redemption: status='claimed'
Losers' Redemptions: status='rejected'
```

---

## 6. EDGE CASES & KNOWN COMPLEXITIES

### From Missions.md:

**Mission Edge Cases:**
1. **Tier Change During Checkpoint** - Mission progress tied to checkpoint_start (immutable snapshot)
2. **Checkpoint Rollover** - New checkpoint = new mission_progress rows
3. **Sequential Unlock** - display_order determines unlock sequence

### From Rewards.md:

**Reward Edge Cases:**
1. **VIP Tier Demotion** - Soft delete redemptions with deleted_reason='tier_change_tier_3_to_tier_2'
2. **Redemption Frequency Periods** - monthly/weekly/one-time calculated from claimed_at
3. **Commission Boost Concurrency** - Only 1 active/scheduled boost per user (enforced in service layer)
4. **Physical Gift Size Requirements** - Conditional based on reward.value_data.requires_size
5. **Raffle Duplicate Participation** - UNIQUE(mission_id, user_id) prevents duplicates
6. **Payment Info Verification** - Double-entry: payment_account === payment_account_confirm

### Multi-Tenant Edge Cases:

**Potential Vulnerabilities:**
1. **Cross-tenant reward access** - If API allows rewardId from different client_id
2. **Sub-state client_id mismatch** - If commission_boost_redemptions.client_id !== redemptions.client_id
3. **User enumeration** - Sequential user IDs vs UUIDs (UUIDs used ✅)

---

## 7. QUERY PATTERNS & INDEX STRATEGY

### Known Query Patterns (from ARCHITECTURE.md):

**Pattern 1: List Missions for User**
```sql
SELECT m.*, mp.current_value, r.type, r.value_data
FROM missions m
JOIN mission_progress mp ON mp.mission_id = m.id
JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = $1              -- Filter 1
  AND m.tier_eligibility = $2       -- Filter 2
  AND m.enabled = true               -- Filter 3
  AND mp.user_id = $3                -- Filter 4
ORDER BY m.display_order ASC
```

**Existing Index (from SchemaFinalv2.md):**
```sql
CREATE INDEX idx_missions_client ON missions(client_id);
CREATE INDEX idx_missions_tier ON missions(tier_eligibility);
```

**Missing Composite Index:**
```sql
CREATE INDEX idx_missions_lookup
  ON missions(client_id, tier_eligibility, enabled, display_order);
```

**Pattern 2: Active Rewards Query**
```sql
SELECT * FROM redemptions
WHERE user_id = $1
  AND status IN ('claimable', 'claimed')
  AND deleted_at IS NULL
```

**Existing Index:**
```sql
CREATE INDEX idx_redemptions_active
  ON redemptions(user_id, status, deleted_at)
  WHERE deleted_at IS NULL;  -- Partial index ✅
```

**Pattern 3: Commission Boost Payout Queue**
```sql
SELECT cbr.*, u.tiktok_handle, r.name
FROM commission_boost_redemptions cbr
JOIN redemptions red ON cbr.redemption_id = red.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE cbr.boost_status = 'pending_payout'
  AND cbr.client_id = $1
```

**Existing Index:**
```sql
CREATE INDEX idx_boost_status ON commission_boost_redemptions(boost_status);
CREATE INDEX idx_boost_tenant ON commission_boost_redemptions(client_id, boost_status);
```

---

## 8. DATA FRESHNESS STRATEGY

### From ARCHITECTURE.md (lines 105-159):

**Approach:** Compute on Request with Optimized Queries

**NOT using:**
- ❌ Precomputed cache (except users table dashboard fields)
- ❌ Redis/Memcached
- ❌ Materialized views

**Optimization Techniques:**
1. Single query with priority sorting (80ms vs 200ms sequential)
2. Smart JOINs (combine related data)
3. Parallel query execution (Promise.all())
4. Database indexes (20-40% performance boost)

**Performance Targets:**
| Page | Target | Status |
|------|--------|--------|
| Home | < 200ms | ~140ms ✅ |
| Missions | < 200ms | ~110ms ✅ |
| Rewards | < 200ms | ~130ms ✅ |

**Data Update Frequency:**
- TikTok metrics: Daily sync (midnight UTC cron)
- Mission progress: Daily sync
- User actions: Real-time (claim, participate)
- API responses: Always fresh (computed on request)

**Exception:** users table precomputed fields updated daily (acceptable 24h staleness)

---

## 9. ARCHITECTURE PATTERNS

### Three-Layer Pattern (from ARCHITECTURE.md):

```
Presentation Layer (API Routes)
  ↓ calls
Service Layer (Business Logic)
  ↓ calls
Repository Layer (Data Access + Tenant Isolation)
  ↓ queries
Supabase / TikTok API
```

**Layer Responsibilities:**

**Presentation (/app/api/**/route.ts):**
- ✅ HTTP request/response
- ✅ Input validation
- ✅ Authentication (verify JWT)
- ❌ NO database queries
- ❌ NO business logic

**Service (/lib/services/*.ts):**
- ✅ Orchestrate repositories
- ✅ Implement business rules
- ✅ Data transformations
- ❌ NO direct DB access

**Repository (/lib/repositories/*.ts):**
- ✅ CRUD operations
- ✅ Database queries
- ✅ **ENFORCE tenant isolation**
- ✅ External API calls
- ❌ NO business logic

---

## 10. VIP METRIC FLEXIBILITY (NEW in V2)

### Dual-Mode Support: Sales ($) OR Units (#)

**Configuration Level (clients table):**
```sql
clients.vip_metric = 'sales' OR 'units'  -- Immutable after launch
```

**Affected Tables:**
- **missions** - `target_unit`: 'dollars' | 'units' | 'count'
- **users** - Added: checkpoint_units_target, checkpoint_units_current, total_units, next_tier_threshold_units
- **metrics** - Added: tiktok_units_sold, checkpoint_units_sold
- **tiers** - `sales_threshold` OR `units_threshold` (mutually exclusive)
- **sales_adjustments** - `amount` OR `amount_units` (mutually exclusive)
- **tier_checkpoints** - Added: units_in_period, units_required

**Logic:** Client chooses metric at setup (sales $ or units #). All tier calculations, missions, and checkpoints use that metric exclusively.

---

## 11. CRITICAL AUDIT AREAS

### For Objective 1: Multi-Tenant SaaS Alignment
**Focus:**
- client_id enforcement in all 16 tables
- Sub-state FK pattern (why client_id despite ONE-TO-ONE?)
- Composite indexes for multi-filter queries
- Partitioning strategy for high-volume tables (videos, metrics)

### For Objective 2: Security
**Focus:**
- Cross-tenant data leakage prevention
- Authorization checks (tier eligibility, redemption limits)
- SQL injection vulnerabilities (using Supabase parameterized queries)
- External API security (TikTok API token handling)
- JWT token validation
- Sub-state client_id mismatch prevention

### For Objective 3: Logic & Features
**Focus:**
- Mission completion → reward claim flow correctness
- Commission boost 6-state lifecycle
- Raffle winner selection logic
- Tier checkpoint evaluations
- VIP tier demotion handling (soft delete)
- Redemption frequency periods (monthly/weekly/one-time)

### For Objective 4: Areas of Concern
**Focus:**
- Precomputed fields bloat (16 fields in users table)
- Missing composite indexes
- No database partitioning strategy
- Query performance at scale (1000s of videos per user)
- Concurrent commission boost claims
- Race conditions in raffle winner selection

---

**END OF AUDIT CONTEXT**
