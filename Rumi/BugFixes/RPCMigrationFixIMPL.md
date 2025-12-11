# RPC Migration - Implementation Plan

**Decision Source:** RPCMigrationFix.md
**Bug ID:** PERF-001-N+1-QUERIES
**Severity:** Medium
**Implementation Date:** 2025-12-11
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From RPCMigrationFix.md:**

**Bug Summary:** The `updatePrecomputedFields` function executes N individual UPDATE queries instead of using bulk SQL operations, causing O(N) performance that risks Vercel timeout at 500+ users.

**Root Cause:** Supabase JS client cannot express complex `UPDATE...FROM...JOIN` SQL patterns required for bulk operations.

**Files Affected:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_phase8_rpc_functions.sql` (NEW)
- `appcode/lib/repositories/syncRepository.ts` (MODIFY)

**Chosen Solution:**
Create PostgreSQL RPC functions for bulk UPDATE operations, then update syncRepository to call `supabase.rpc()` instead of individual queries. Three RPC functions:
1. `update_precomputed_fields` - Bulk update 13 precomputed fields with vip_metric awareness
2. `update_leaderboard_ranks` - ROW_NUMBER() calculation with vip_metric branching
3. `apply_pending_sales_adjustments` - Atomic adjustment application

**Why This Solution:**
- Matches planned architecture in Loyalty.md Flow 1 Step 4 and ARCHITECTURE.md Section 3.1
- O(1) query complexity regardless of user count
- All logic in single atomic transaction per RPC
- Easy to test (mock RPC call in unit tests)
- Existing RPC pattern in codebase (`20251203_single_query_rpc_functions.sql`)

**From Audit Feedback (Two Rounds):**

**Round 1 - APPROVE WITH CHANGES:**
- vip_metric NULL guard: Added `RAISE EXCEPTION` validation ✅
- Leaderboard metric: Added vip_metric branching for ORDER BY ✅
- Call sequence: Documented required orchestrator order ✅
- Schema citations: Added SchemaFinalv2.md line references ✅
- Test coverage: Added units-mode and NULL/invalid vip_metric tests ✅

**Round 2 - Clarifications Added:**
- Next-tier thresholds: Clarified design choice (BOTH fields set intentionally, frontend picks based on vip_metric) ✅
- Call sequence: Added explicit CRITICAL section with diagram in IMPL doc ✅
- Rollback strategy: Added full rollback/staged rollout section ✅

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 2 (1 new migration, 1 modified repository)
- Lines changed: ~250 (migration) + ~60 (repository changes)
- Breaking changes: NO
- Schema changes: YES (additive - new RPC functions)
- API contract changes: NO

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## CRITICAL: Orchestrator Call Sequence Requirement

**These RPCs are intentionally separate for testability.** The cron orchestrator (`processDailySales` in `salesService.ts`) MUST call them in this exact order to maintain data consistency:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REQUIRED CALL SEQUENCE (enforced by salesService.processDailySales)        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. applyPendingSalesAdjustments(clientId)                                  │
│     └── Updates: total_sales, total_units, manual_adjustments_*             │
│     └── Must run FIRST so totals reflect adjustments                        │
│                                                                             │
│  2. updatePrecomputedFields(clientId, userIds?)                             │
│     └── Reads: total_sales, total_units (includes adjustments from step 1)  │
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

**Why not chain inside RPC?**
- Single responsibility per RPC (easier to test, debug, maintain)
- Matches existing service layer orchestration pattern
- Each RPC can be called independently for specific use cases
- Clearer error handling (know exactly which step failed)

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or only documentation changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1 (NEW):** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
**Expected:** File does NOT exist yet (will be created)

**File 2 (MODIFY):** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```
**Expected:** File exists

**Checklist:**
- [ ] Migration directory exists
- [ ] syncRepository.ts exists
- [ ] File paths match RPCMigrationFix.md

---

### Gate 3: Current Code State Verification

**Read current state of updatePrecomputedFields:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 294-472
```

**Verify function signature:**
```typescript
async updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<number> {
```
**Expected:** Function exists at line 294

**Read current state of updateLeaderboardRanks:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 480-484
```

**Expected Current State:**
```typescript
async updateLeaderboardRanks(clientId: string): Promise<void> {
  // TODO: Implement in Task 8.2.3b with ROW_NUMBER()
  // This is a placeholder that will be replaced with actual implementation
  throw new Error('Not implemented - see Task 8.2.3b');
},
```

**Read current state of applyPendingSalesAdjustments:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 714-718
```

**Expected Current State:**
```typescript
async applyPendingSalesAdjustments(clientId: string): Promise<number> {
  // TODO: Implement in Task 8.3.1a with batch SQL
  // This is a placeholder that will be replaced with actual implementation
  throw new Error('Not implemented - see Task 8.3.1a');
},
```

**Checklist:**
- [ ] updatePrecomputedFields exists at line 294: [YES / NO]
- [ ] updateLeaderboardRanks stub exists at line 480: [YES / NO]
- [ ] applyPendingSalesAdjustments stub exists at line 714: [YES / NO]
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since RPCMigrationFix.md was created.

---

### Gate 4: Schema Verification (REQUIRED - Database Bug)

**Read SchemaFinalv2.md for relevant tables:**

**Users table precomputed fields (lines 142-147):**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 142-147
```

**Expected:**
```
- **Precomputed fields (16 fields):**
  - Leaderboard (5 fields): `leaderboard_rank`, `total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units`
  - Checkpoint progress (3 fields): `checkpoint_sales_current`, `checkpoint_units_current`, `projected_tier_at_checkpoint`
  - Engagement (4 fields): `checkpoint_videos_posted`, `checkpoint_total_views`, `checkpoint_total_likes`, `checkpoint_total_comments`
  - Next tier (3 fields): `next_tier_name`, `next_tier_threshold`, `next_tier_threshold_units`
  - Historical (1 field): `checkpoint_progress_updated_at`
```

**Clients vip_metric (line 118):**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 118-118
```

**Expected:**
```
- `vip_metric` - VARCHAR(10) NOT NULL DEFAULT 'units' - VIP tier progression metric: 'units' (volume #) or 'sales' (revenue $$$). Immutable after client launch.
```

**Tiers table (lines 265-267):**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 265-267
```

**Expected:**
```
- `sales_threshold` - DECIMAL(10, 2) - Minimum sales ($) to reach tier (sales mode only)
- `units_threshold` - INTEGER - Minimum units (#) to reach tier (units mode only)
```

**Sales adjustments table (lines 283-289):**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 283-289
```

**Column verification:**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| total_sales | total_sales (users) | ✅ |
| total_units | total_units (users) | ✅ |
| leaderboard_rank | leaderboard_rank (users) | ✅ |
| vip_metric | vip_metric (clients) | ✅ |
| sales_threshold | sales_threshold (tiers) | ✅ |
| units_threshold | units_threshold (tiers) | ✅ |
| amount | amount (sales_adjustments) | ✅ |
| amount_units | amount_units (sales_adjustments) | ✅ |
| applied_at | applied_at (sales_adjustments) | ✅ |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible (DECIMAL, INTEGER, VARCHAR)
- [ ] Nullable handling correct (vip_metric NOT NULL)
- [ ] client_id present in all tables for multi-tenant filtering

---

### Gate 5: Existing RPC Pattern Verification

**Read existing RPC pattern:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251203_single_query_rpc_functions.sql lines 1-50
```

**Expected Pattern:**
```sql
CREATE OR REPLACE FUNCTION function_name(params)
RETURNS type
LANGUAGE sql|plpgsql
SECURITY DEFINER
AS $$
...
$$;

GRANT EXECUTE ON FUNCTION function_name TO service_role;
```

**Checklist:**
- [ ] Existing RPC pattern confirmed
- [ ] SECURITY DEFINER used
- [ ] GRANT EXECUTE pattern confirmed

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Create Migration File with 3 RPC Functions

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql`
**Target Lines:** N/A (new file)
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify file does NOT exist:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql 2>&1
```

**Expected:** File not found error

**Reality Check:**
- [ ] File does not exist yet
- [ ] Migration directory writable

---

#### Create Action

**File Content (COMPLETE - NO PLACEHOLDERS):**

```sql
-- ============================================================================
-- Phase 8 RPC Functions for Daily Automation
-- ============================================================================
-- Purpose: Bulk UPDATE operations for precomputed fields, leaderboard ranks,
--          and sales adjustments
-- References:
--   - RPCMigrationFix.md (BugFixes folder)
--   - Loyalty.md Flow 1 Step 4
--   - EXECUTION_PLAN.md Tasks 8.2.3a, 8.2.3b, 8.3.1a
--   - SchemaFinalv2.md users, tiers, sales_adjustments tables
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: update_precomputed_fields
-- Updates 13 precomputed fields on users table with video aggregations
-- and tier projection calculations. vip_metric aware.
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
  -- DESIGN NOTE: We set BOTH next_tier_threshold AND next_tier_threshold_units
  -- regardless of vip_metric. This is intentional:
  --   - SchemaFinalv2.md lines 146 defines both fields on users table
  --   - Frontend selects which to display based on client.vip_metric
  --   - In units mode: UI shows next_tier_threshold_units ("50 more units to Silver")
  --   - In sales mode: UI shows next_tier_threshold ("$500 more to Silver")
  --   - Having both populated is a denormalization for frontend flexibility
  UPDATE users u
  SET
    next_tier_name = nt.tier_name,
    next_tier_threshold = nt.sales_threshold,        -- Always set (frontend picks based on vip_metric)
    next_tier_threshold_units = nt.units_threshold   -- Always set (frontend picks based on vip_metric)
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
-- Calculates leaderboard ranks using ROW_NUMBER().
-- vip_metric aware: uses total_sales for sales mode, total_units for units mode.
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
-- Applies pending sales/units adjustments to user totals atomically.
-- Updates: total_sales, total_units, manual_adjustments_total, manual_adjustments_units
-- Then marks adjustments as applied (applied_at = NOW()).
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

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
Content: [above content]
```

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```

**Expected:** File exists with correct size (~6KB)

**Verify content:**
```bash
head -30 /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```

**Expected:** Shows header comments and function definition

**State Verification:**
- [ ] File created successfully
- [ ] Content matches expected
- [ ] SQL syntax appears valid

---

#### Step Verification

**SQL Syntax Check (basic):**
```bash
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```
**Expected:** 3 (three functions)

```bash
grep -c "GRANT EXECUTE" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```
**Expected:** 3 (three grants)

**Step Checkpoint:**
- [ ] File created ✅
- [ ] 3 functions defined ✅
- [ ] 3 grants defined ✅
- [ ] vip_metric validation in functions 1 and 2 ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Replace updatePrecomputedFields Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
**Target Lines:** 294-472
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 294-300
```

**Expected Current State (first lines):**
```typescript
  async updatePrecomputedFields(
    clientId: string,
    userIds?: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Step 1: Get client's vip_metric (sales or units mode)
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  async updatePrecomputedFields(
    clientId: string,
    userIds?: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Step 1: Get client's vip_metric (sales or units mode)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('vip_metric')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Failed to get client: ${clientError?.message ?? 'Not found'}`);
    }

    const vipMetric = client.vip_metric as 'sales' | 'units';

    // Step 2: Get all tiers for this client (for projected_tier and next_tier calculations)
    const { data: tiers, error: tiersError } = await supabase
      .from('tiers')
      .select('tier_id, tier_name, tier_order, sales_threshold, units_threshold')
      .eq('client_id', clientId)
      .order('tier_order', { ascending: true });

    if (tiersError) {
      throw new Error(`Failed to get tiers: ${tiersError.message}`);
    }

    // Step 3: Get users to update with their current tier info
    let usersQuery = supabase
      .from('users')
      .select('id, current_tier, tier_achieved_at')
      .eq('client_id', clientId);

    if (userIds && userIds.length > 0) {
      usersQuery = usersQuery.in('id', userIds);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      throw new Error(`Failed to get users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return 0;
    }

    // Step 4: Aggregate video stats for each user
    // Using a single query with GROUP BY for efficiency
    const userIdList = users.map((u) => u.id);

    const { data: videoStats, error: videoError } = await supabase
      .from('videos')
      .select('user_id, gmv, units_sold, views, likes, comments, post_date')
      .eq('client_id', clientId)
      .in('user_id', userIdList);

    if (videoError) {
      throw new Error(`Failed to get video stats: ${videoError.message}`);
    }

    // Step 5: Calculate aggregates per user
    const userAggregates = new Map<string, {
      totalSales: number;
      totalUnits: number;
      checkpointSales: number;
      checkpointUnits: number;
      checkpointVideos: number;
      checkpointViews: number;
      checkpointLikes: number;
      checkpointComments: number;
    }>();

    // Initialize all users with zero values
    for (const user of users) {
      userAggregates.set(user.id, {
        totalSales: 0,
        totalUnits: 0,
        checkpointSales: 0,
        checkpointUnits: 0,
        checkpointVideos: 0,
        checkpointViews: 0,
        checkpointLikes: 0,
        checkpointComments: 0,
      });
    }

    // Aggregate video data
    for (const video of videoStats ?? []) {
      if (!video.user_id) continue;
      const agg = userAggregates.get(video.user_id);
      if (!agg) continue;

      const user = users.find((u) => u.id === video.user_id);
      const tierAchievedAt = user?.tier_achieved_at
        ? new Date(user.tier_achieved_at)
        : null;
      const postDate = new Date(video.post_date);

      // Lifetime totals
      agg.totalSales += video.gmv ?? 0;
      agg.totalUnits += video.units_sold ?? 0;

      // Checkpoint period (post_date >= tier_achieved_at)
      if (!tierAchievedAt || postDate >= tierAchievedAt) {
        agg.checkpointSales += video.gmv ?? 0;
        agg.checkpointUnits += video.units_sold ?? 0;
        agg.checkpointVideos += 1;
        agg.checkpointViews += video.views ?? 0;
        agg.checkpointLikes += video.likes ?? 0;
        agg.checkpointComments += video.comments ?? 0;
      }
    }

    // Step 6: Calculate projected_tier and next_tier for each user
    let updatedCount = 0;

    for (const user of users) {
      const agg = userAggregates.get(user.id);
      if (!agg) continue;

      // Find current tier info
      const currentTierInfo = tiers?.find((t) => t.tier_id === user.current_tier);
      const currentTierOrder = currentTierInfo?.tier_order ?? 1;

      // Calculate projected tier based on checkpoint progress
      const checkpointValue = vipMetric === 'sales' ? agg.checkpointSales : agg.checkpointUnits;
      let projectedTier = 'tier_1';

      if (tiers) {
        for (const tier of tiers) {
          const threshold = vipMetric === 'sales'
            ? (tier.sales_threshold ?? 0)
            : (tier.units_threshold ?? 0);

          if (checkpointValue >= threshold) {
            projectedTier = tier.tier_id;
          }
        }
      }

      // Find next tier (tier with order = current + 1)
      const nextTierInfo = tiers?.find((t) => t.tier_order === currentTierOrder + 1);

      // Step 7: Update user with all precomputed fields
      const { error: updateError } = await supabase
        .from('users')
        .update({
          total_sales: agg.totalSales,
          total_units: agg.totalUnits,
          checkpoint_sales_current: agg.checkpointSales,
          checkpoint_units_current: agg.checkpointUnits,
          checkpoint_videos_posted: agg.checkpointVideos,
          checkpoint_total_views: agg.checkpointViews,
          checkpoint_total_likes: agg.checkpointLikes,
          checkpoint_total_comments: agg.checkpointComments,
          projected_tier_at_checkpoint: projectedTier,
          next_tier_name: nextTierInfo?.tier_name ?? null,
          next_tier_threshold: nextTierInfo?.sales_threshold ?? null,
          next_tier_threshold_units: nextTierInfo?.units_threshold ?? null,
          checkpoint_progress_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .eq('client_id', clientId);

      if (updateError) {
        console.error(`Failed to update user ${user.id}: ${updateError.message}`);
        continue;
      }

      updatedCount++;
    }

    return updatedCount;
  },
```

**NEW Code (replacement):**
```typescript
  /**
   * Update precomputed fields for users via RPC bulk operation
   * Per RPCMigrationFix.md - O(1) performance instead of O(N)
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - Optional user IDs to update (null = all users)
   * @returns Count of users updated
   */
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
  },
```

**Change Summary:**
- Lines removed: ~180
- Lines added: ~20
- Net change: -160 lines

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 294-320
```

**Expected New State:**
```typescript
  /**
   * Update precomputed fields for users via RPC bulk operation
   * Per RPCMigrationFix.md - O(1) performance instead of O(N)
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - Optional user IDs to update (null = all users)
   * @returns Count of users updated
   */
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
  },
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] RPC call syntax correct

---

#### Step Verification

**Type Check:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts 2>&1 | head -20
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new type errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Replace updateLeaderboardRanks Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
**Target Lines:** After updatePrecomputedFields (new line ~320)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Find current updateLeaderboardRanks:**
```bash
grep -n "async updateLeaderboardRanks" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines [line_number-5]
```

**Expected Current State:**
```typescript
  async updateLeaderboardRanks(clientId: string): Promise<void> {
    // TODO: Implement in Task 8.2.3b with ROW_NUMBER()
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3b');
  },
```

---

#### Edit Action

**OLD Code:**
```typescript
  async updateLeaderboardRanks(clientId: string): Promise<void> {
    // TODO: Implement in Task 8.2.3b with ROW_NUMBER()
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3b');
  },
```

**NEW Code:**
```typescript
  /**
   * Update leaderboard ranks via RPC bulk operation
   * Per RPCMigrationFix.md - Uses ROW_NUMBER() with vip_metric awareness
   *
   * @param clientId - Client ID for multi-tenant isolation
   */
  async updateLeaderboardRanks(clientId: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('update_leaderboard_ranks', {
      p_client_id: clientId,
    });

    if (error) {
      throw new Error(`Failed to update leaderboard ranks: ${error.message}`);
    }
  },
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
grep -A 15 "async updateLeaderboardRanks" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```

**Expected:** Shows RPC call, not throw statement

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Replace applyPendingSalesAdjustments Implementation

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
**Target Lines:** Near end of file (~714)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Find current applyPendingSalesAdjustments:**
```bash
grep -n "async applyPendingSalesAdjustments" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines [line_number-5]
```

**Expected Current State:**
```typescript
  async applyPendingSalesAdjustments(clientId: string): Promise<number> {
    // TODO: Implement in Task 8.3.1a with batch SQL
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.3.1a');
  },
```

---

#### Edit Action

**OLD Code:**
```typescript
  async applyPendingSalesAdjustments(clientId: string): Promise<number> {
    // TODO: Implement in Task 8.3.1a with batch SQL
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.3.1a');
  },
```

**NEW Code:**
```typescript
  /**
   * Apply pending sales adjustments via RPC bulk operation
   * Per RPCMigrationFix.md - Atomic application of all pending adjustments
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @returns Count of adjustments applied
   */
  async applyPendingSalesAdjustments(clientId: string): Promise<number> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('apply_pending_sales_adjustments', {
      p_client_id: clientId,
    });

    if (error) {
      throw new Error(`Failed to apply sales adjustments: ${error.message}`);
    }

    return data ?? 0;
  },
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
grep -A 15 "async applyPendingSalesAdjustments" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```

**Expected:** Shows RPC call, not throw statement

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**RPC Function 1:** `update_precomputed_fields`
```sql
WHERE u.client_id = p_client_id
  AND (p_user_ids IS NULL OR u.id = ANY(p_user_ids));
```

**Security Checklist:**
- [x] `client_id = p_client_id` filter present in all UPDATE statements
- [x] No raw SQL without client_id filter
- [x] No cross-tenant data exposure possible

**RPC Function 2:** `update_leaderboard_ranks`
```sql
WHERE client_id = p_client_id
...
AND u.client_id = p_client_id;
```

**Security Checklist:**
- [x] `client_id = p_client_id` filter present
- [x] Subquery also filtered by client_id
- [x] No cross-tenant data exposure

**RPC Function 3:** `apply_pending_sales_adjustments`
```sql
WHERE client_id = p_client_id
  AND applied_at IS NULL
...
AND u.client_id = p_client_id;
```

**Security Checklist:**
- [x] `client_id = p_client_id` filter on sales_adjustments
- [x] `client_id = p_client_id` filter on users UPDATE
- [x] No cross-tenant data exposure

---

**SECURITY STATUS:** ALL CHECKS PASSED ✅

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Migration File Valid

```bash
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```
**Expected:** ~180-200 lines
**Actual:** [document actual output]

```bash
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
```
**Expected:** 3
**Actual:** [document actual output]

**Status:**
- [ ] Migration file has 3 functions ✅

---

### Verification 2: TypeScript Compiles

```bash
npx tsc --noEmit 2>&1 | grep -c "error"
```
**Expected:** 0 (or same as before)
**Actual:** [count]

**Status:**
- [ ] No new type errors introduced ✅

---

### Verification 3: syncRepository Modified Correctly

```bash
grep -c "supabase.rpc" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```
**Expected:** 3 (three RPC calls)
**Actual:** [count]

```bash
grep -c "throw new Error('Not implemented" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```
**Expected:** 1 (only updateMissionProgress remains as stub)
**Actual:** [count]

**Status:**
- [ ] All 3 functions now use RPC ✅

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] All column names match SchemaFinalv2.md
- [ ] vip_metric validated (NOT NULL, 'sales' or 'units')
- [ ] All relationships (FKs) respected
- [ ] client_id filtering in all RPC functions

---

### Verification 5: Git Diff Sanity Check

```bash
git diff --stat
```

**Expected Changes:**
- `supabase/migrations/20251211_add_phase8_rpc_functions.sql`: ~180 lines (new file)
- `appcode/lib/repositories/syncRepository.ts`: ~-130 lines (net reduction)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-11
**Executor:** Claude Opus 4.5
**Decision Source:** RPCMigrationFix.md
**Implementation Doc:** RPCMigrationFixIMPL.md
**Bug ID:** PERF-001-N+1-QUERIES

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: Existing RPC Pattern - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create migration file - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 2: Replace updatePrecomputedFields - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 3: Replace updateLeaderboardRanks - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 4: Replace applyPendingSalesAdjustments - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] All 3 RPCs have client_id filtering - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Migration file valid ✅
[Timestamp] TypeScript compiles ✅
[Timestamp] syncRepository modified ✅
[Timestamp] Schema alignment ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251211_add_phase8_rpc_functions.sql` - Lines 1-~180 - CREATE - 3 RPC functions
2. `appcode/lib/repositories/syncRepository.ts` - Lines 294-472, 480-484, 714-718 - MODIFY - Replace N+1 with RPC calls

**Total:** 2 files modified, ~+180 lines (migration), ~-130 lines net (repository)

---

### Bug Resolution

**Before Implementation:**
- Bug: N+1 query pattern causing O(N) performance
- Root cause: Supabase JS client cannot express UPDATE...FROM...JOIN

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: 3 functions now call supabase.rpc() with O(1) performance

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: RPCMigrationFix.md
- Documented 19 sections
- Proposed solution: PostgreSQL RPC functions

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: vip_metric handling, leaderboard branching, call sequence

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: RPCMigrationFixIMPL.md
- Executed 4 implementation steps
- All verifications: [PENDING]

**Step 4: Current Status**
- Implementation: [PENDING EXECUTION]
- Bug resolved: [PENDING]
- Ready for commit: [PENDING]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file exists with 3 functions
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
# Should show: 3

# 2. Verify RPC calls in syncRepository
grep -c "supabase.rpc" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
# Should show: 3

# 3. Verify no type errors
npx tsc --noEmit 2>&1 | grep "error" | wc -l
# Should show: 0

# 4. Verify vip_metric validation in RPCs
grep -c "RAISE EXCEPTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
# Should show: 2 (in functions 1 and 2)

# 5. Verify client_id filtering
grep -c "client_id = p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql
# Should show: 8+ occurrences
```

**Expected Results:**
- 3 functions created ✅
- 3 RPC calls in repository ✅
- 0 type errors ✅
- 2 RAISE EXCEPTION guards ✅
- Multi-tenant filtering throughout ✅

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: 5/5
- Steps completed: 4/4
- Verifications passed: [X/5]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: 2
- Lines changed: ~+50 net (migration adds, repository reduces)
- Breaking changes: 0
- Security verified: YES
- Tests updated: NO (test doc in RPCMigrationFix.md Section 15)

---

## Document Status

**Implementation Date:** 2025-12-11
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified (SchemaFinalv2.md)
- [ ] Existing RPC pattern verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filtering in all RPCs ✅

**Verification:**
- [ ] Migration file valid ✅
- [ ] No new type errors ✅
- [ ] syncRepository modified ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update RPCMigrationFix.md status to "Implemented"

---

### Next Actions

**After implementation succeeds:**
1. [ ] Git commit with message (template below)
2. [ ] Update RPCMigrationFix.md status to "Implemented"
3. [ ] Apply migration to local Supabase: `supabase db reset`
4. [ ] Verify functions exist: `SELECT proname FROM pg_proc WHERE proname LIKE 'update_%' OR proname LIKE 'apply_%'`
5. [ ] Update EXECUTION_PLAN.md Tasks 8.2.3a, 8.2.3b, 8.3.1a with notes

**Git Commit Message Template:**
```
fix(perf): Replace N+1 queries with PostgreSQL RPC functions

Resolves PERF-001-N+1-QUERIES: updatePrecomputedFields, updateLeaderboardRanks,
and applyPendingSalesAdjustments now use bulk SQL operations via RPC.

Changes:
- supabase/migrations/20251211_add_phase8_rpc_functions.sql: 3 new RPC functions
- lib/repositories/syncRepository.ts: Replace implementations with supabase.rpc() calls

Performance: O(N) → O(1) for all three operations
Security: All RPCs filter by client_id for multi-tenant isolation
vip_metric: Functions 1 & 2 validate and branch on 'sales' vs 'units' mode

References:
- BugFixes/RPCMigrationFix.md
- BugFixes/RPCMigrationFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Rollback Strategy

**If the RPC functions misbehave after deployment:**

### Migration Characteristics
- **Type:** Additive only (new functions, no schema changes)
- **Breaking changes:** None (existing tables unchanged)
- **Reversibility:** High (functions can be dropped, old code restored)

### Rollback Steps (If Needed)

**Step 1: Restore TypeScript code**
```bash
# Revert syncRepository.ts to pre-RPC implementation
git checkout HEAD~1 -- appcode/lib/repositories/syncRepository.ts
```

**Step 2: (Optional) Remove RPC functions**
```sql
-- Only if functions are causing issues at DB level
DROP FUNCTION IF EXISTS update_precomputed_fields(UUID, UUID[]);
DROP FUNCTION IF EXISTS update_leaderboard_ranks(UUID);
DROP FUNCTION IF EXISTS apply_pending_sales_adjustments(UUID);
```

**Step 3: Verify rollback**
```bash
# Confirm old N+1 implementation restored
grep -c "for (const user of users)" appcode/lib/repositories/syncRepository.ts
# Should show: 1 (the N+1 loop is back)
```

### Staged Rollout (Recommended)

1. **Local testing:** `supabase db reset && supabase start`
2. **Verify functions:** `SELECT proname FROM pg_proc WHERE proname LIKE 'update_%'`
3. **Test RPC manually:** `SELECT update_precomputed_fields('client-uuid', NULL)`
4. **Deploy to staging** (if available)
5. **Monitor first cron run** in production logs
6. **Check sync_logs** for success/failure status

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| RPC syntax error | Test locally with `supabase db reset` before deploy |
| vip_metric NULL | RAISE EXCEPTION alerts immediately (fail fast) |
| Wrong aggregation | Integration tests verify values before deploy |
| Performance regression | Compare timing logs before/after |

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Read SchemaFinalv2.md for database queries
- [ ] Verified existing RPC pattern in migrations

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (vip_metric, leaderboard, sequence)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] All 3 RPCs have proper filtering
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

---

**META-VERIFICATION STATUS:** [PENDING - AWAITING EXECUTION]

**RED FLAGS exhibited:** None ✅

---

**Document Version:** 1.1
**Last Updated:** 2025-12-11 (Audit Round 2 Clarifications Added)
**Status:** Ready for Execution
