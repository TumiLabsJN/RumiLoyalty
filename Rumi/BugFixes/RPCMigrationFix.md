# RPC Migration - Fix Documentation

**Bug ID:** PERF-001-N+1-QUERIES
**Created:** 2025-12-11
**Status:** Ready for Implementation (Audit Feedback Incorporated)
**Severity:** Medium
**Related Tasks:** Task 8.2.3a, 8.2.3b, 8.3.1a from EXECUTION_PLAN.md
**Linked Bugs:** None

---

## 1. Project Context

This is a loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system tracks TikTok creator performance via daily CSV imports from CRUVA platform, calculates tier status, and manages reward redemptions.

The bug affects the **daily automation cron job** (Phase 8) which processes creator sales data. Specifically, the `updatePrecomputedFields`, `updateLeaderboardRanks`, and `applyPendingSalesAdjustments` functions use N+1 query patterns instead of bulk SQL operations.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers per ARCHITECTURE.md

---

## 2. Bug Summary

**What's happening:** The `updatePrecomputedFields` function in syncRepository executes N individual UPDATE queries (one per user) instead of using bulk SQL operations. Similarly, `updateLeaderboardRanks` and `applyPendingSalesAdjustments` require complex SQL patterns that Supabase JS client cannot express.

**What should happen:** These functions should use PostgreSQL RPC functions to execute bulk UPDATE statements in O(1) queries, as documented in Loyalty.md Flow 1 Step 4 and ARCHITECTURE.md Section 3.1.

**Impact:**
- 50 users: ~2s execution (acceptable)
- 500 users: ~20s execution (risks Vercel timeout on Pro plan)
- 5000 users: ~200s execution (guaranteed timeout)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Loyalty.md | Flow 1 Step 4 (Calculate and update user precomputed fields) | Shows 2 bulk UPDATE queries with correlated subqueries |
| ARCHITECTURE.md | Section 3.1 Implementation | Shows `db.execute()` pattern with single bulk UPDATE |
| EXECUTION_PLAN.md | Task 8.2.3a Acceptance Criteria | States "single efficient query (not N+1)" |
| syncRepository.ts | updatePrecomputedFields function | Current implementation uses N individual UPDATE queries in a loop |

### Key Evidence

**Evidence 1:** Loyalty.md Flow 1 Step 4 shows planned bulk UPDATE
- Source: Loyalty.md, Section "4. Calculate and update user precomputed fields directly"
- Shows: `UPDATE users u SET ... FROM clients c WHERE u.client_id = c.id AND c.vip_metric = 'sales'`
- Implication: Designed for 2 bulk queries (sales mode + units mode), not N queries

**Evidence 2:** EXECUTION_PLAN.md Task 8.2.3a Acceptance Criteria
- Source: EXECUTION_PLAN.md, Task 8.2.3a
- States: "single efficient query (not N+1)"
- Implication: Current implementation violates acceptance criteria

**Evidence 3:** Supabase JS client limitation
- Source: Discovery during implementation
- Finding: Supabase JS client doesn't support `UPDATE...FROM...JOIN` or raw SQL execution
- Implication: Must use PostgreSQL RPC functions for complex bulk operations

---

## 4. Root Cause Analysis

**Root Cause:** Supabase JS client cannot express complex `UPDATE...FROM...JOIN` SQL patterns required for bulk operations.

**Contributing Factors:**
1. Planned architecture assumed `db.execute()` capability (per ARCHITECTURE.md) which doesn't exist in Supabase JS client
2. Task 8.2.3a was implemented without RPC functions due to immediate path forward
3. No existing RPC functions for bulk UPDATE operations in the codebase (only SELECT-based RPCs exist)

**How it was introduced:** Design oversight - the planned SQL patterns in Loyalty.md and ARCHITECTURE.md cannot be directly implemented with Supabase JS client's query builder.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Daily cron reliability | Timeout risk at 500+ users | High |
| Data freshness | If cron fails, dashboard shows stale data | Medium |
| Scalability | Cannot scale beyond ~300 users on Hobby plan | High |
| User experience | Delayed tier updates if cron times out | Medium |

**Business Risk Summary:** The daily automation cron job is the heart of the loyalty engine. If it times out, creator dashboards show stale data, tier calculations are wrong, and support tickets increase. This limits platform growth to ~300-500 users.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`

```typescript
// Current implementation (lines 294-471) - N+1 pattern
async updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<number> {
  const supabase = createAdminClient();

  // Step 1: Get client's vip_metric (1 query)
  const { data: client } = await supabase
    .from('clients')
    .select('vip_metric')
    .eq('id', clientId)
    .single();

  // Step 2: Get tiers (1 query)
  const { data: tiers } = await supabase
    .from('tiers')
    .select('tier_id, tier_name, tier_order, sales_threshold, units_threshold')
    .eq('client_id', clientId);

  // Step 3: Get users (1 query)
  const { data: users } = await supabase
    .from('users')
    .select('id, current_tier, tier_achieved_at')
    .eq('client_id', clientId);

  // Step 4: Get videos (1 query)
  const { data: videoStats } = await supabase
    .from('videos')
    .select('user_id, gmv, units_sold, views, likes, comments, post_date')
    .eq('client_id', clientId);

  // Steps 5-7: Calculate and UPDATE each user (N queries!)
  for (const user of users) {
    await supabase
      .from('users')
      .update({ /* 13 fields */ })
      .eq('id', user.id);  // N individual updates
  }

  return updatedCount;
}
```

**Current Behavior:**
- 4 read queries (client, tiers, users, videos) - acceptable
- N update queries (one per user) - problematic
- Total: O(4 + N) database round-trips

### Current Data Flow

```
processDailySales()
    │
    ├── syncRepository.updatePrecomputedFields(clientId, userIds)
    │   │
    │   ├── SELECT vip_metric FROM clients (1 query)
    │   ├── SELECT * FROM tiers (1 query)
    │   ├── SELECT * FROM users (1 query)
    │   ├── SELECT * FROM videos (1 query)
    │   │
    │   └── FOR EACH user:  ← PROBLEM
    │       └── UPDATE users SET ... WHERE id = user.id (N queries)
    │
    └── Total: 4 + N queries
```

---

## 7. Proposed Fix

### Approach

Create PostgreSQL RPC functions for bulk UPDATE operations, then update syncRepository to call `supabase.rpc()` instead of individual queries. This matches the planned architecture in Loyalty.md and ARCHITECTURE.md.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/YYYYMMDDHHMMSS_add_phase8_rpc_functions.sql`

**New Migration File - 3 RPC Functions:**

```sql
-- ============================================================================
-- FUNCTION 1: update_precomputed_fields
-- ============================================================================
CREATE OR REPLACE FUNCTION update_precomputed_fields(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip_metric VARCHAR(10);
  v_updated_count INTEGER := 0;
BEGIN
  -- Get client's vip_metric with NULL guard
  SELECT vip_metric INTO v_vip_metric FROM clients WHERE id = p_client_id;

  -- Fail loudly if vip_metric is NULL or invalid (indicates data integrity issue)
  IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
    RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
  END IF;

  -- Update aggregation fields (both modes update engagement fields)
  UPDATE users u
  SET
    total_sales = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
    total_units = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id), 0),
    checkpoint_sales_current = COALESCE((SELECT SUM(gmv) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_units_current = COALESCE((SELECT SUM(units_sold) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_videos_posted = COALESCE((SELECT COUNT(*) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_views = COALESCE((SELECT SUM(views) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_likes = COALESCE((SELECT SUM(likes) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_total_comments = COALESCE((SELECT SUM(comments) FROM videos WHERE user_id = u.id AND client_id = p_client_id AND post_date >= u.tier_achieved_at), 0),
    checkpoint_progress_updated_at = NOW(),
    updated_at = NOW()
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Update projected_tier_at_checkpoint based on vip_metric
  UPDATE users u
  SET projected_tier_at_checkpoint = (
    SELECT t.tier_id
    FROM tiers t
    WHERE t.client_id = p_client_id
      AND (
        (v_vip_metric = 'sales' AND u.checkpoint_sales_current >= COALESCE(t.sales_threshold, 0))
        OR (v_vip_metric = 'units' AND u.checkpoint_units_current >= COALESCE(t.units_threshold, 0))
      )
    ORDER BY t.tier_order DESC
    LIMIT 1
  )
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));

  -- Update next_tier fields
  UPDATE users u
  SET
    next_tier_name = nt.tier_name,
    next_tier_threshold = nt.sales_threshold,
    next_tier_threshold_units = nt.units_threshold
  FROM tiers ct, tiers nt
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND ct.client_id = p_client_id
    AND ct.tier_id = u.current_tier
    AND nt.client_id = p_client_id
    AND nt.tier_order = ct.tier_order + 1;

  -- Clear next_tier for users at max tier
  UPDATE users u
  SET
    next_tier_name = NULL,
    next_tier_threshold = NULL,
    next_tier_threshold_units = NULL
  WHERE u.client_id = p_client_id
    AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids))
    AND NOT EXISTS (
      SELECT 1 FROM tiers ct, tiers nt
      WHERE ct.client_id = p_client_id
        AND ct.tier_id = u.current_tier
        AND nt.client_id = p_client_id
        AND nt.tier_order = ct.tier_order + 1
    );

  RETURN v_updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION update_precomputed_fields(UUID, UUID[]) TO service_role;

-- ============================================================================
-- FUNCTION 2: update_leaderboard_ranks
-- ============================================================================
CREATE OR REPLACE FUNCTION update_leaderboard_ranks(
  p_client_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip_metric VARCHAR(10);
BEGIN
  -- Get client's vip_metric with NULL guard
  SELECT vip_metric INTO v_vip_metric FROM clients WHERE id = p_client_id;

  -- Fail loudly if vip_metric is NULL or invalid (indicates data integrity issue)
  IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
    RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
  END IF;

  -- Branch ranking metric based on vip_metric (SchemaFinalv2.md line 118)
  IF v_vip_metric = 'units' THEN
    UPDATE users u
    SET leaderboard_rank = ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY total_units DESC) as rank
      FROM users
      WHERE client_id = p_client_id
    ) ranked
    WHERE u.id = ranked.id
      AND u.client_id = p_client_id;
  ELSE
    UPDATE users u
    SET leaderboard_rank = ranked.rank
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY total_sales DESC) as rank
      FROM users
      WHERE client_id = p_client_id
    ) ranked
    WHERE u.id = ranked.id
      AND u.client_id = p_client_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION update_leaderboard_ranks(UUID) TO service_role;

-- ============================================================================
-- FUNCTION 3: apply_pending_sales_adjustments
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_pending_sales_adjustments(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_count INTEGER := 0;
BEGIN
  -- Apply sales adjustments (amount field)
  UPDATE users u
  SET
    total_sales = total_sales + adj.total_amount,
    manual_adjustments_total = manual_adjustments_total + adj.total_amount
  FROM (
    SELECT user_id, SUM(amount) as total_amount
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Apply units adjustments (amount_units field)
  UPDATE users u
  SET
    total_units = total_units + adj.total_units,
    manual_adjustments_units = manual_adjustments_units + adj.total_units
  FROM (
    SELECT user_id, SUM(amount_units) as total_units
    FROM sales_adjustments
    WHERE client_id = p_client_id
      AND applied_at IS NULL
      AND amount_units IS NOT NULL
    GROUP BY user_id
  ) adj
  WHERE u.id = adj.user_id
    AND u.client_id = p_client_id;

  -- Mark all adjustments as applied
  UPDATE sales_adjustments
  SET applied_at = NOW()
  WHERE client_id = p_client_id
    AND applied_at IS NULL;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  RETURN v_affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_pending_sales_adjustments(UUID) TO service_role;
```

### Required Call Sequence (IMPORTANT)

These RPCs are intentionally separate for testability and single responsibility. The **cron orchestrator** (`processDailySales` in salesService.ts) MUST call them in this order:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REQUIRED CALL SEQUENCE (enforced by salesService.processDailySales)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. applyPendingSalesAdjustments(clientId)                                  │
│     └── Updates: total_sales, total_units, manual_adjustments_*             │
│                                                                             │
│  2. updatePrecomputedFields(clientId, userIds?)                             │
│     └── Reads: total_sales, total_units (from step 1)                       │
│     └── Updates: checkpoint_*, projected_tier, next_tier_*                  │
│                                                                             │
│  3. updateLeaderboardRanks(clientId)                                        │
│     └── Reads: total_sales OR total_units (based on vip_metric)             │
│     └── Updates: leaderboard_rank                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Why this order matters:**
- Step 1 modifies `total_sales`/`total_units` with manual adjustments
- Step 2 uses those totals to calculate projections and next-tier fields
- Step 3 uses those totals to calculate leaderboard ranks

**If called out of order:** Projections and ranks will be stale (based on pre-adjustment totals).

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`

**Before (updatePrecomputedFields):**
```typescript
async updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<number> {
  // ... 4 SELECT queries ...
  // ... N UPDATE queries in loop ...
  return updatedCount;
}
```

**After:**
```typescript
async updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('update_precomputed_fields', {
    p_client_id: clientId,
    p_user_ids: userIds ?? null,
  });

  if (error) {
    throw new Error(`Failed to update precomputed fields: ${error.message}`);
  }

  return data ?? 0;
}
```

**Before (updateLeaderboardRanks):**
```typescript
async updateLeaderboardRanks(clientId: string): Promise<void> {
  throw new Error('Not implemented - see Task 8.2.3b');
}
```

**After:**
```typescript
async updateLeaderboardRanks(clientId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc('update_leaderboard_ranks', {
    p_client_id: clientId,
  });

  if (error) {
    throw new Error(`Failed to update leaderboard ranks: ${error.message}`);
  }
}
```

**Before (applyPendingSalesAdjustments):**
```typescript
async applyPendingSalesAdjustments(clientId: string): Promise<number> {
  throw new Error('Not implemented - see Task 8.3.1a');
}
```

**After:**
```typescript
async applyPendingSalesAdjustments(clientId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('apply_pending_sales_adjustments', {
    p_client_id: clientId,
  });

  if (error) {
    throw new Error(`Failed to apply sales adjustments: ${error.message}`);
  }

  return data ?? 0;
}
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_add_phase8_rpc_functions.sql` | CREATE | 3 RPC functions |
| `appcode/lib/repositories/syncRepository.ts` | MODIFY | Replace 3 functions with RPC calls |
| `EXECUTION_PLAN.md` | MODIFY | Add Task 8.2.3-rpc before current RPC-dependent tasks |

### Dependency Graph

```
supabase/migrations/YYYYMMDDHHMMSS_add_phase8_rpc_functions.sql (NEW)
├── imports from: none (pure SQL)
├── imported by: none (called via supabase.rpc())
└── affects: syncRepository.ts

appcode/lib/repositories/syncRepository.ts (MODIFY)
├── imports from: @/lib/supabase/admin-client
├── imported by: salesService.ts, tierCalculationService.ts
└── affects: processDailySales, tier calculation flows
```

---

## 9. Data Flow Analysis

### Before Fix

```
processDailySales()
    │
    └── syncRepository.updatePrecomputedFields()
            │
            ├── SELECT client (1 query)
            ├── SELECT tiers (1 query)
            ├── SELECT users (1 query)
            ├── SELECT videos (1 query)
            │
            └── FOR EACH of N users:
                └── UPDATE user (N queries)
            │
            └── Total: 4 + N queries = O(N) performance
```

### After Fix

```
processDailySales()
    │
    ├── [1] syncRepository.applyPendingSalesAdjustments()  ← MUST BE FIRST
    │       └── supabase.rpc('apply_pending_sales_adjustments')
    │               └── Updates total_sales, total_units with adjustments
    │
    ├── [2] syncRepository.updatePrecomputedFields()  ← DEPENDS ON STEP 1
    │       └── supabase.rpc('update_precomputed_fields')
    │               └── PostgreSQL executes:
    │                   ├── UPDATE users SET aggregations...
    │                   ├── UPDATE users SET projected_tier... (uses vip_metric)
    │                   ├── UPDATE users SET next_tier...
    │                   └── UPDATE users SET next_tier NULL...
    │
    └── [3] syncRepository.updateLeaderboardRanks()  ← DEPENDS ON STEP 1
            └── supabase.rpc('update_leaderboard_ranks')
                    └── ORDER BY total_sales OR total_units (based on vip_metric)

    Total: 3 RPC calls = O(1) performance (regardless of user count)
```

### Data Transformation Steps

1. **Step 1:** RPC receives clientId and optional userIds array
2. **Step 2:** Single UPDATE aggregates videos data into precomputed fields
3. **Step 3:** Single UPDATE calculates projected_tier from tier thresholds
4. **Step 4:** Single UPDATE derives next_tier from tiers table
5. **Step 5:** Return count of affected rows

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/cron/daily-automation (Vercel Cron)
│
└─► salesService.processDailySales()
    │
    │   ┌─────────────────────────────────────────────────────┐
    │   │ ORCHESTRATOR ENFORCES THIS ORDER (see Section 7)    │
    │   └─────────────────────────────────────────────────────┘
    │
    ├─► [1] syncRepository.applyPendingSalesAdjustments() ⚠️ FIX HERE
    │       └── Currently: stub → After: 1 RPC call
    │       └── Updates totals BEFORE projections calculated
    │
    ├─► [2] syncRepository.updatePrecomputedFields() ⚠️ FIX HERE
    │       └── Currently: N queries → After: 1 RPC call
    │       └── Uses totals from step 1 for projections
    │
    └─► [3] syncRepository.updateLeaderboardRanks() ⚠️ FIX HERE
            └── Currently: stub → After: 1 RPC call
            └── Uses totals from step 1 for rankings (vip_metric aware)
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | RPC functions (NEW) | Will contain bulk UPDATE logic |
| Repository | syncRepository.ts | Calls RPC instead of N queries |
| Service | salesService.ts | No change - already calls repository |
| API Route | daily-automation/route.ts | No change - calls service |
| Frontend | None | No direct involvement |

---

## 11. Database/Schema Verification

### Relevant Tables (with SchemaFinalv2.md citations)

| Table | Relevant Columns | SchemaFinalv2.md Reference | Notes |
|-------|------------------|---------------------------|-------|
| `users` | 16 precomputed fields (lines 142-147) | Section 1.2, lines 123-155 | Target of bulk UPDATE |
| `videos` | gmv, units_sold, views, likes, comments, post_date | Section 1.4, lines 227-251 | Source for aggregation |
| `tiers` | tier_id, tier_order, sales_threshold, units_threshold | Section 1.6, lines 254-272 | For projected_tier and next_tier |
| `clients` | vip_metric (DEFAULT 'units', NOT NULL) | Section 1.1, line 118 | Determines sales vs units mode |
| `sales_adjustments` | amount, amount_units, applied_at | Section 1.7, lines 275-290 | For manual adjustments |

### Column Type Verification

| Column | Expected Type | SchemaFinalv2.md Line | Nullable | Notes |
|--------|---------------|----------------------|----------|-------|
| `clients.vip_metric` | VARCHAR(10) | 118 | NOT NULL, DEFAULT 'units' | RPC validates NOT NULL |
| `users.total_sales` | DECIMAL(10,2) | 143 | Has default | Aggregated from videos.gmv |
| `users.total_units` | INTEGER | 143 | Has default | Aggregated from videos.units_sold |
| `users.leaderboard_rank` | INTEGER | 143 | Nullable | Calculated by RPC |
| `tiers.sales_threshold` | DECIMAL(10,2) | 265 | Nullable | Used for sales mode |
| `tiers.units_threshold` | INTEGER | 266 | Nullable | Used for units mode |
| `sales_adjustments.amount` | DECIMAL(10,2) | 283 | Nullable | Sales mode adjustments |
| `sales_adjustments.amount_units` | INTEGER | 284 | Nullable | Units mode adjustments |
| `sales_adjustments.applied_at` | TIMESTAMP | 289 | Nullable | NULL = not yet applied |

### vip_metric Handling

Per SchemaFinalv2.md line 118:
```
vip_metric - VARCHAR(10) NOT NULL DEFAULT 'units' - VIP tier progression metric:
'units' (volume #) or 'sales' (revenue $$$). Immutable after client launch.
```

**RPC Behavior:**
- Both `update_precomputed_fields` and `update_leaderboard_ranks` validate vip_metric
- If NULL or invalid: `RAISE EXCEPTION` (fail loudly)
- If 'sales': Use `total_sales`, `sales_threshold`
- If 'units': Use `total_units`, `units_threshold`

### Schema Check

```sql
-- Verify users table has all precomputed fields
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'total_sales', 'total_units', 'checkpoint_sales_current', 'checkpoint_units_current',
  'checkpoint_videos_posted', 'checkpoint_total_views', 'checkpoint_total_likes',
  'checkpoint_total_comments', 'projected_tier_at_checkpoint', 'next_tier_name',
  'next_tier_threshold', 'next_tier_threshold_units', 'checkpoint_progress_updated_at',
  'leaderboard_rank', 'manual_adjustments_total', 'manual_adjustments_units'
);
-- Expected: 16 rows
```

### Data Migration Required?
- [x] No - schema already supports fix (RPC functions operate on existing columns)

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | various | None |
| Tiers page | various | None |
| Missions page | various | None |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| None | - | - | No |

### Frontend Changes Required?
- [x] No - frontend reads precomputed fields via existing APIs; how they're computed is internal

---

## 13. Alternative Solutions Considered

### Option A: Keep N+1 Pattern (Current State)
- **Description:** Accept the N+1 queries, document as tech debt
- **Pros:** No migration needed, works for MVP
- **Cons:** Doesn't scale, violates acceptance criteria, timeout risk
- **Verdict:** ❌ Rejected - doesn't meet documented requirements

### Option B: Batch Updates (Chunks of 50)
- **Description:** Process users in batches of 50 with Promise.all
- **Pros:** Reduces N to N/50, no migration needed
- **Cons:** Still O(N), complex error handling, doesn't match architecture
- **Verdict:** ❌ Rejected - half measure, still scales poorly

### Option C: PostgreSQL RPC Functions (Selected)
- **Description:** Create RPC functions for bulk SQL operations
- **Pros:** O(1) performance, matches planned architecture, atomic operations
- **Cons:** Requires migration, logic split between TypeScript and SQL
- **Verdict:** ✅ Selected - matches documented architecture, scalable

### Option D: Supabase Edge Functions
- **Description:** Use Deno-based edge functions for raw SQL
- **Pros:** Can use raw SQL, TypeScript
- **Cons:** Different runtime, added complexity, overkill for this use case
- **Verdict:** ❌ Rejected - over-engineered for the problem

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RPC syntax error | Low | Medium | Test locally with `supabase db reset` |
| Migration fails in prod | Low | High | Review migration, test in staging |
| Performance regression | Low | Medium | Run performance test before/after |
| Incorrect aggregation | Low | High | Integration tests verify values |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Internal implementation change |
| Database | No | Additive (new functions) |
| Frontend | No | Reads same data via same APIs |

---

## 15. Testing Strategy

### Unit Tests

**File:** `tests/unit/repositories/syncRepository.test.ts`

```typescript
describe('syncRepository RPC calls', () => {
  it('updatePrecomputedFields calls RPC with correct params', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 5, error: null });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc: mockRpc });

    const result = await syncRepository.updatePrecomputedFields('client-123', ['user-1']);

    expect(mockRpc).toHaveBeenCalledWith('update_precomputed_fields', {
      p_client_id: 'client-123',
      p_user_ids: ['user-1'],
    });
    expect(result).toBe(5);
  });

  it('updatePrecomputedFields passes null for all users', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 10, error: null });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc: mockRpc });

    await syncRepository.updatePrecomputedFields('client-123');

    expect(mockRpc).toHaveBeenCalledWith('update_precomputed_fields', {
      p_client_id: 'client-123',
      p_user_ids: null,
    });
  });

  it('updateLeaderboardRanks calls RPC', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ error: null });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc: mockRpc });

    await syncRepository.updateLeaderboardRanks('client-123');

    expect(mockRpc).toHaveBeenCalledWith('update_leaderboard_ranks', {
      p_client_id: 'client-123',
    });
  });

  it('applyPendingSalesAdjustments calls RPC', async () => {
    const mockRpc = jest.fn().mockResolvedValue({ data: 3, error: null });
    (createAdminClient as jest.Mock).mockReturnValue({ rpc: mockRpc });

    const result = await syncRepository.applyPendingSalesAdjustments('client-123');

    expect(mockRpc).toHaveBeenCalledWith('apply_pending_sales_adjustments', {
      p_client_id: 'client-123',
    });
    expect(result).toBe(3);
  });
});
```

### Integration Tests

```typescript
describe('updatePrecomputedFields integration', () => {
  it('correctly aggregates video stats (sales mode)', async () => {
    // Seed: client with vip_metric='sales', user with 3 videos totaling $600 GMV
    await seedTestClient({ id: clientId, vipMetric: 'sales' });
    await seedTestUser({ id: userId, clientId });
    await seedTestVideos([
      { userId, clientId, gmv: 100 },
      { userId, clientId, gmv: 200 },
      { userId, clientId, gmv: 300 },
    ]);

    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.total_sales).toBe(600);
  });

  it('correctly aggregates video stats (units mode)', async () => {
    // Seed: client with vip_metric='units', user with 3 videos totaling 60 units
    await seedTestClient({ id: clientId, vipMetric: 'units' });
    await seedTestUser({ id: userId, clientId });
    await seedTestVideos([
      { userId, clientId, units_sold: 10 },
      { userId, clientId, units_sold: 20 },
      { userId, clientId, units_sold: 30 },
    ]);

    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.total_units).toBe(60);
  });

  it('calculates projected_tier correctly (sales mode)', async () => {
    // Seed: user at tier_1, checkpoint_sales = 1500 (qualifies for tier_2 at $1000)
    await seedTestClient({ id: clientId, vipMetric: 'sales' });
    await seedTestUser({ id: userId, clientId, currentTier: 'tier_1' });
    await seedTestTiers([
      { clientId, tierId: 'tier_1', tierOrder: 1, salesThreshold: 0 },
      { clientId, tierId: 'tier_2', tierOrder: 2, salesThreshold: 1000 },
    ]);
    await seedTestVideos([{ userId, clientId, gmv: 1500, postDate: new Date() }]);

    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.projected_tier_at_checkpoint).toBe('tier_2');
  });

  it('calculates projected_tier correctly (units mode)', async () => {
    // Seed: user at tier_1, checkpoint_units = 150 (qualifies for tier_2 at 100 units)
    await seedTestClient({ id: clientId, vipMetric: 'units' });
    await seedTestUser({ id: userId, clientId, currentTier: 'tier_1' });
    await seedTestTiers([
      { clientId, tierId: 'tier_1', tierOrder: 1, unitsThreshold: 0 },
      { clientId, tierId: 'tier_2', tierOrder: 2, unitsThreshold: 100 },
    ]);
    await seedTestVideos([{ userId, clientId, units_sold: 150, postDate: new Date() }]);

    await syncRepository.updatePrecomputedFields(clientId);

    const user = await getUser(userId);
    expect(user.projected_tier_at_checkpoint).toBe('tier_2');
  });
});

describe('updateLeaderboardRanks integration', () => {
  it('ranks by total_sales in sales mode', async () => {
    await seedTestClient({ id: clientId, vipMetric: 'sales' });
    await seedTestUsers([
      { id: user1Id, clientId, totalSales: 1000, totalUnits: 5 },
      { id: user2Id, clientId, totalSales: 500, totalUnits: 50 },  // More units, less sales
      { id: user3Id, clientId, totalSales: 2000, totalUnits: 10 },
    ]);

    await syncRepository.updateLeaderboardRanks(clientId);

    const users = await getUsers(clientId);
    expect(users.find(u => u.id === user3Id).leaderboard_rank).toBe(1); // $2000 = rank 1
    expect(users.find(u => u.id === user1Id).leaderboard_rank).toBe(2); // $1000 = rank 2
    expect(users.find(u => u.id === user2Id).leaderboard_rank).toBe(3); // $500 = rank 3
  });

  it('ranks by total_units in units mode', async () => {
    await seedTestClient({ id: clientId, vipMetric: 'units' });
    await seedTestUsers([
      { id: user1Id, clientId, totalSales: 1000, totalUnits: 5 },
      { id: user2Id, clientId, totalSales: 500, totalUnits: 50 },  // More units, less sales
      { id: user3Id, clientId, totalSales: 2000, totalUnits: 10 },
    ]);

    await syncRepository.updateLeaderboardRanks(clientId);

    const users = await getUsers(clientId);
    expect(users.find(u => u.id === user2Id).leaderboard_rank).toBe(1); // 50 units = rank 1
    expect(users.find(u => u.id === user3Id).leaderboard_rank).toBe(2); // 10 units = rank 2
    expect(users.find(u => u.id === user1Id).leaderboard_rank).toBe(3); // 5 units = rank 3
  });
});

describe('vip_metric validation', () => {
  it('throws exception if vip_metric is NULL', async () => {
    // This shouldn't happen due to NOT NULL constraint, but test RPC behavior
    await seedTestClientWithNullMetric({ id: clientId });

    await expect(syncRepository.updatePrecomputedFields(clientId))
      .rejects.toThrow(/NULL or invalid vip_metric/);
  });

  it('throws exception if vip_metric is invalid', async () => {
    // Manually insert invalid value (bypassing constraint for test)
    await seedTestClientWithInvalidMetric({ id: clientId, vipMetric: 'invalid' });

    await expect(syncRepository.updateLeaderboardRanks(clientId))
      .rejects.toThrow(/NULL or invalid vip_metric/);
  });
});

describe('end-to-end: adjustments → projections → ranks', () => {
  it('adjustments are reflected in projections and ranks', async () => {
    // Setup: sales mode client with 2 users
    await seedTestClient({ id: clientId, vipMetric: 'sales' });
    await seedTestUsers([
      { id: user1Id, clientId, totalSales: 1000 },
      { id: user2Id, clientId, totalSales: 800 },
    ]);
    // Add pending adjustment that will flip rankings
    await seedPendingAdjustment({ userId: user2Id, clientId, amount: 500 }); // user2: 800+500=1300

    // Execute in required order
    await syncRepository.applyPendingSalesAdjustments(clientId);
    await syncRepository.updatePrecomputedFields(clientId);
    await syncRepository.updateLeaderboardRanks(clientId);

    const users = await getUsers(clientId);
    // After adjustment: user2=$1300 > user1=$1000
    expect(users.find(u => u.id === user2Id).total_sales).toBe(1300);
    expect(users.find(u => u.id === user2Id).leaderboard_rank).toBe(1);
    expect(users.find(u => u.id === user1Id).leaderboard_rank).toBe(2);
  });
});
```

### Manual Verification Steps

1. [ ] Deploy migration to local Supabase
2. [ ] Run `SELECT * FROM pg_proc WHERE proname LIKE 'update_%' OR proname LIKE 'apply_%'` to verify functions exist
3. [ ] Test RPC manually: `SELECT update_precomputed_fields('client-uuid', NULL)`
4. [ ] Trigger daily sync and verify precomputed fields updated
5. [ ] Check sync_logs for success status

### Verification Commands

```bash
# Apply migration locally
supabase db reset

# Run tests
npm test -- syncRepository

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [ ] Ensure no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Create migration file
  - File: `supabase/migrations/YYYYMMDDHHMMSS_add_phase8_rpc_functions.sql`
  - Change: Add 3 RPC functions
- [ ] **Step 2:** Test migration locally
  - Command: `supabase db reset && supabase start`
  - Verify: Functions exist in database
- [ ] **Step 3:** Update syncRepository.ts
  - File: `appcode/lib/repositories/syncRepository.ts`
  - Change: Replace 3 function implementations with RPC calls
- [ ] **Step 4:** Run TypeScript check
  - Command: `npx tsc --noEmit`
- [ ] **Step 5:** Update EXECUTION_PLAN.md
  - Add Task 8.2.3-rpc
  - Mark Task 8.2.3a as updated to use RPC

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update EXECUTION_PLAN.md with task completion

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 8.2.3a | updatePrecomputedFields | Implementation changed to use RPC |
| 8.2.3b | updateLeaderboardRanks | Implementation changed to use RPC |
| 8.3.1a | applyPendingSalesAdjustments | Implementation changed to use RPC |

### Updates Required

**New Task 8.2.3-rpc:**
```markdown
- [ ] **Task 8.2.3-rpc:** Create Phase 8 RPC migration
    - **Action:** Create SQL migration with 3 RPC functions for bulk operations
    - **Functions:** update_precomputed_fields, update_leaderboard_ranks, apply_pending_sales_adjustments
    - **References:** RPCMigrationFix.md (BugFixes folder), Loyalty.md Flow 1 Step 4
    - **Acceptance Criteria:** Migration applies cleanly, functions callable via supabase.rpc(), O(1) query performance
```

**Task 8.2.3a update:**
- Add note: "Uses update_precomputed_fields RPC from Task 8.2.3-rpc"

**Task 8.2.3b update:**
- Add note: "Uses update_leaderboard_ranks RPC from Task 8.2.3-rpc"

**Task 8.3.1a update:**
- Add note: "Uses apply_pending_sales_adjustments RPC from Task 8.2.3-rpc"

---

## 18. Definition of Done

- [ ] Migration file created with 3 RPC functions
- [ ] Migration tested locally with `supabase db reset`
- [ ] syncRepository.ts updated to use `supabase.rpc()` calls
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New unit tests added for RPC calls
- [ ] Integration tests verify correct aggregation
- [ ] Build completes successfully
- [ ] Manual verification steps completed
- [ ] EXECUTION_PLAN.md updated with Task 8.2.3-rpc
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

> **Note:** Reference by section name, not line numbers (lines change frequently).

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Loyalty.md | Flow 1 Step 4 "Calculate and update user precomputed fields" | Planned SQL for bulk UPDATE |
| Loyalty.md | Flow 7 Step 0 "Apply Pending Sales Adjustments" | Planned SQL for adjustments |
| ARCHITECTURE.md | Section 3.1 Implementation | Shows db.execute() pattern |
| EXECUTION_PLAN.md | Tasks 8.2.3a, 8.2.3b, 8.3.1a | Affected tasks |
| SchemaFinalv2.md | Section 1.2 users Table | 16 precomputed fields definition |
| SchemaFinalv2.md | Section 1.6 tiers Table | Tier threshold columns |
| 20251203_single_query_rpc_functions.sql | All functions | Pattern for RPC functions |

### Reading Order for External Auditor

1. **First:** This document Sections 1-2 - Provides context and summary
2. **Second:** Loyalty.md Flow 1 Step 4 - Shows planned architecture
3. **Third:** EXECUTION_PLAN.md Tasks 8.2.3a, 8.2.3b, 8.3.1a - Shows acceptance criteria
4. **Fourth:** This document Section 7 - Shows exact fix

---

**Document Version:** 1.0
**Last Updated:** 2025-12-11
**Author:** Claude Code
**Status:** Analysis Complete
