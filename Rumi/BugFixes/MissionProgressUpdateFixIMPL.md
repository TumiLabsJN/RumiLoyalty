# Mission Progress Update - Implementation Plan

**Decision Source:** MissionProgressUpdateFix.md
**Bug ID:** BUG-MISSION-PROGRESS-UPDATE
**Severity:** High
**Implementation Date:** 2025-12-12
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From MissionProgressUpdateFix.md:**

**Bug Summary:** The `syncRepository.updateMissionProgress()` function is a stub that throws "Not implemented" error, causing all mission progress updates to silently fail.

**Root Cause:** Function was left as placeholder stub when Task 8.2.2a was marked complete; error is caught as non-fatal so cron continues without updating mission progress.

**Files Affected:**
- `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
- `/home/jorge/Loyalty/Rumi/supabase/migrations/` (new file)

**Chosen Solution:**
From MissionProgressUpdateFix.md Section 7 - Proposed Fix:
> Implement `updateMissionProgress` as a PostgreSQL RPC function (following Pattern 4 from Loyalty.md - O(1) RPC for bulk operations). The RPC will update `current_value` for all active missions based on mission_type-specific aggregations from the videos table.

**Why This Solution:**
- Follows existing RPC pattern established in `20251211_add_phase8_rpc_functions.sql`
- O(1) performance for bulk updates (vs N+1 queries in TypeScript)
- SQL specification already exists in Loyalty.md Flow 1 Step 5
- Matches architecture decision (Pattern 4: RPC for bulk operations)
- Keeps complex aggregation logic in database layer

**From Audit Feedback (Codex Audit v1.1):**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - Added `m.client_id = p_client_id` to missions join (multi-tenant security)
  - NULL/empty p_user_ids = update ALL users for client
  - Added `m.enabled = true AND m.activated = true` filters
  - Added `COALESCE(m.target_value, 0) > 0` guard
  - Added RPC typings regeneration step

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 2 (1 existing, 1 new migration)
- Lines changed: ~120 (new RPC) + ~15 (repository update)
- Breaking changes: NO
- Schema changes: NO (additive RPC function only)
- API contract changes: NO

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

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
**Expected:** Clean working tree OR acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/supabase/migrations/`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
**Expected:** Directory exists

**Checklist:**
- [ ] syncRepository.ts exists
- [ ] migrations directory exists
- [ ] File paths match Fix.md

---

### Gate 3: Current Code State Verification

**Read current state of updateMissionProgress stub:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 327-350
```

**Expected Current State:**
```typescript
  // ========== Mission Progress ==========

  /**
   * Update mission progress for users based on current metrics
   * Per Loyalty.md lines 466-533
   *
   * @param clientId - Client ID for multi-tenant isolation
   * @param userIds - User IDs to update progress for
   * @returns Count of progress records updated
   */
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    // TODO: Implement in Task 8.2.3 with mission-type-aware calculations
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3');
  },
```

**Checklist:**
- [ ] Current code matches Fix.md Section 6: [YES / NO]
- [ ] Line numbers accurate (not drifted)
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification

**Read SchemaFinalv2.md for mission_progress table:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 425-460
```

**Tables involved:** mission_progress, missions, videos

**Column verification for mission_progress:**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| current_value | current_value (INTEGER DEFAULT 0) | Verify |
| status | status (VARCHAR(50) DEFAULT 'active') | Verify |
| checkpoint_start | checkpoint_start (TIMESTAMP) | Verify |
| checkpoint_end | checkpoint_end (TIMESTAMP) | Verify |
| completed_at | completed_at (TIMESTAMP) | Verify |
| client_id | client_id (UUID NOT NULL) | Verify |
| mission_id | mission_id (UUID FK) | Verify |
| user_id | user_id (UUID FK) | Verify |

**Column verification for missions (from lines 362-420):**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| mission_type | mission_type (VARCHAR(50) NOT NULL) | Verify |
| target_value | target_value (INTEGER NOT NULL) | Verify |
| enabled | enabled (BOOLEAN DEFAULT true) | Verify |
| activated | activated (BOOLEAN DEFAULT false) | Verify |
| client_id | client_id (UUID FK) | Verify |

**Column verification for videos (from lines 227-250):**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| gmv | gmv (DECIMAL(10,2) DEFAULT 0) | Verify |
| units_sold | units_sold (INTEGER DEFAULT 0) | Verify |
| views | views (INTEGER DEFAULT 0) | Verify |
| likes | likes (INTEGER DEFAULT 0) | Verify |
| post_date | post_date (TIMESTAMP) | Verify |
| client_id | client_id (UUID FK) | Verify |
| user_id | user_id (UUID FK) | Verify |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] Nullable handling correct
- [ ] Foreign keys respected

---

### Gate 5: Existing RPC Pattern Verification

**Read existing RPC function for pattern reference:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql lines 1-50
```

**Expected Pattern Elements:**
- `CREATE OR REPLACE FUNCTION` syntax
- `LANGUAGE plpgsql`
- `SECURITY DEFINER`
- `GRANT EXECUTE ON FUNCTION ... TO service_role`
- Parameter naming: `p_client_id`, `p_user_ids`
- Return type: `INTEGER` for count
- Error handling with `RAISE EXCEPTION`

**Checklist:**
- [ ] Pattern elements identified
- [ ] Consistent with existing migrations
- [ ] Ready to follow pattern

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

### Step 1: Create SQL Migration File for RPC Function

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql`
**Action Type:** CREATE (new file)

---

#### Pre-Action Reality Check

**Verify file does not exist:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql 2>&1
```

**Expected:** File not found / No such file or directory

**Reality Check:**
- [ ] Command executed
- [ ] File does not exist: [YES / NO]

---

#### Create Action

**Create new file with RPC function:**

```sql
-- ============================================================================
-- Mission Progress Update RPC Function
-- ============================================================================
-- Purpose: Update mission_progress.current_value based on mission_type-specific
--          aggregations from videos table within checkpoint window
-- References:
--   - BUG-MISSION-PROGRESS-UPDATE (BugFixes/MissionProgressUpdateFix.md)
--   - Loyalty.md Flow 1 Step 5 "Update mission progress"
--   - EXECUTION_PLAN.md Task 8.2.3
--   - SchemaFinalv2.md mission_progress, missions, videos tables
-- ============================================================================
--
-- Codex Audit Fixes Applied (2025-12-12):
-- 1. Added m.client_id = p_client_id to missions join (multi-tenant security)
-- 2. NULL/empty p_user_ids = update ALL users for client
-- 3. Added m.enabled = true AND m.activated = true filters
-- 4. Added COALESCE(m.target_value, 0) > 0 guard for completion check
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mission_progress(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL  -- NULL or empty = all users for client
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Update current_value for all active missions based on mission_type
  -- Aggregates from videos table within checkpoint_start to checkpoint_end window
  -- Per Loyalty.md Flow 1 Step 5
  WITH progress_updates AS (
    UPDATE mission_progress mp
    SET
      current_value = CASE m.mission_type
        WHEN 'sales_dollars' THEN (
          SELECT COALESCE(SUM(v.gmv), 0)::INTEGER
          FROM videos v
          WHERE v.user_id = mp.user_id
            AND v.client_id = p_client_id
            AND v.post_date >= mp.checkpoint_start
            AND v.post_date < mp.checkpoint_end
        )
        WHEN 'sales_units' THEN (
          SELECT COALESCE(SUM(v.units_sold), 0)
          FROM videos v
          WHERE v.user_id = mp.user_id
            AND v.client_id = p_client_id
            AND v.post_date >= mp.checkpoint_start
            AND v.post_date < mp.checkpoint_end
        )
        WHEN 'videos' THEN (
          SELECT COUNT(*)::INTEGER
          FROM videos v
          WHERE v.user_id = mp.user_id
            AND v.client_id = p_client_id
            AND v.post_date >= mp.checkpoint_start
            AND v.post_date < mp.checkpoint_end
        )
        WHEN 'views' THEN (
          SELECT COALESCE(SUM(v.views), 0)::INTEGER
          FROM videos v
          WHERE v.user_id = mp.user_id
            AND v.client_id = p_client_id
            AND v.post_date >= mp.checkpoint_start
            AND v.post_date < mp.checkpoint_end
        )
        WHEN 'likes' THEN (
          SELECT COALESCE(SUM(v.likes), 0)::INTEGER
          FROM videos v
          WHERE v.user_id = mp.user_id
            AND v.client_id = p_client_id
            AND v.post_date >= mp.checkpoint_start
            AND v.post_date < mp.checkpoint_end
        )
        ELSE mp.current_value  -- Raffle type: no progress tracking (target_value=0)
      END,
      updated_at = NOW()
    FROM missions m
    WHERE mp.mission_id = m.id
      AND mp.client_id = p_client_id
      AND m.client_id = p_client_id           -- SECURITY: Multi-tenant filter on missions
      AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))  -- NULL = all users
      AND mp.status = 'active'
      AND m.enabled = true                     -- Only enabled missions
      AND m.activated = true                   -- Only activated missions
      AND m.mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes')
    RETURNING mp.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM progress_updates;

  -- Update status to 'completed' for missions that hit target
  -- Guard: target_value must be > 0 to avoid unintended completions (raffle has target_value=0)
  UPDATE mission_progress mp
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.client_id = p_client_id
    AND m.client_id = p_client_id             -- SECURITY: Multi-tenant filter on missions
    AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))  -- NULL = all users
    AND mp.status = 'active'
    AND m.enabled = true                       -- Only enabled missions
    AND m.activated = true                     -- Only activated missions
    AND COALESCE(m.target_value, 0) > 0        -- Guard: must have valid target
    AND mp.current_value >= m.target_value
    AND m.mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes');

  RETURN v_updated_count;
END;
$$;

-- Grant execute permission to service_role (used by admin client)
GRANT EXECUTE ON FUNCTION update_mission_progress(UUID, UUID[]) TO service_role;

-- Documentation comment
COMMENT ON FUNCTION update_mission_progress IS
  'Updates mission_progress.current_value based on mission_type-specific aggregations from videos table. '
  'NULL p_user_ids updates all users for client. '
  'Also marks missions as completed when current_value >= target_value. '
  'Per Loyalty.md Flow 1 Step 5. BUG-MISSION-PROGRESS-UPDATE fix.';
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql
Content: [SQL above]
```

---

#### Post-Action Verification

**Verify file was created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql
```
**Expected:** File exists

**Verify file content:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql lines 1-30
```
**Expected:** Header comment and function signature visible

**State Verification:**
- [ ] File created successfully
- [ ] Content matches expected SQL
- [ ] Function signature correct

---

#### Step Verification

**SQL Syntax Check (visual inspection):**
- [ ] CREATE OR REPLACE FUNCTION syntax correct
- [ ] Parameter types correct (UUID, UUID[])
- [ ] RETURNS INTEGER
- [ ] LANGUAGE plpgsql
- [ ] SECURITY DEFINER
- [ ] $$ delimiters balanced
- [ ] GRANT statement present

**Step Checkpoint:**
- [ ] Pre-action state matched expected (file didn't exist)
- [ ] Write applied successfully
- [ ] Post-action state matches expected (file exists with correct content)
- [ ] SQL syntax appears correct

**Checkpoint Status:** [PASS / FAIL]
**If FAIL:** [Exact failure point and actual state]

---

### Step 1.5: Regenerate Supabase RPC Types (Per Codex Audit)

**Purpose:** Ensure new RPC function is reflected in TypeScript types
**Action Type:** COMMAND

---

#### Pre-Action Reality Check

**Verify Supabase CLI available:**
```bash
supabase --version
```
**Expected:** Version number displayed (e.g., 1.x.x)

**Reality Check:**
- [ ] Command executed
- [ ] Supabase CLI available: [YES / NO]

---

#### Execute Command

**Regenerate Types:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && supabase gen types typescript --local > lib/types/database.ts
```

**Alternative if local DB not running:**
```bash
# Skip this step if Supabase local is not running
# Types can be regenerated after migration is applied to remote
# The type assertion pattern (supabase.rpc as Function) handles this gracefully
```

---

#### Post-Action Verification

**Verify types file updated (if regenerated):**
```bash
grep "update_mission_progress" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts 2>/dev/null || echo "Types not yet regenerated - OK if local DB not running"
```
**Expected:** Either function found in types OR graceful skip message

**State Verification:**
- [ ] Types regenerated OR gracefully skipped
- [ ] No errors during generation

---

#### Step Checkpoint

- [ ] Supabase CLI available (or step skipped)
- [ ] Types regenerated (or deferred to post-migration)
- [ ] No blocking errors

**Checkpoint Status:** [PASS / SKIP]
**If SKIP:** Types will be regenerated after migration applied to remote DB

---

### Step 2: Update syncRepository.ts - Replace Stub with RPC Call

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
**Target Lines:** 337-344
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 337-344
```

**Expected Current State (EXACT CODE):**
```typescript
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    // TODO: Implement in Task 8.2.3 with mission-type-aware calculations
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3');
  },
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate (not drifted)

**If current state doesn't match:** STOP. Do not proceed with edit. Report actual state vs expected.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    // TODO: Implement in Task 8.2.3 with mission-type-aware calculations
    // This is a placeholder that will be replaced with actual implementation
    throw new Error('Not implemented - see Task 8.2.3');
  },
```

**NEW Code (replacement):**
```typescript
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Per Codex audit: empty/null userIds means "update all users for this client"
    // RPC handles this internally with conditional logic
    // Type assertion: RPC function added in 20251212_add_update_mission_progress_rpc.sql
    // Regenerate types after migration: supabase gen types typescript
    const { data, error } = await (supabase.rpc as Function)(
      'update_mission_progress',
      {
        p_client_id: clientId,
        p_user_ids: userIds.length > 0 ? userIds : null,  // null = all users
      }
    );

    if (error) {
      throw new Error(`Failed to update mission progress: ${error.message}`);
    }

    return (data as number) ?? 0;
  },
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
Old String: [exact OLD code above]
New String: [exact NEW code above]
```

**Change Summary:**
- Lines removed: 8
- Lines added: 20
- Net change: +12 lines

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts lines 337-358
```

**Expected New State (EXACT CODE):**
```typescript
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Per Codex audit: empty/null userIds means "update all users for this client"
    // RPC handles this internally with conditional logic
    // Type assertion: RPC function added in 20251212_add_update_mission_progress_rpc.sql
    // Regenerate types after migration: supabase gen types typescript
    const { data, error } = await (supabase.rpc as Function)(
      'update_mission_progress',
      {
        p_client_id: clientId,
        p_user_ids: userIds.length > 0 ? userIds : null,  // null = all users
      }
    );

    if (error) {
      throw new Error(`Failed to update mission progress: ${error.message}`);
    }

    return (data as number) ?? 0;
  },
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | head -20
```
**Expected:** No new type errors related to updateMissionProgress

**No New Errors Introduced:**
- [ ] File compiles without new errors
- [ ] Existing functionality preserved (createAdminClient already imported)

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]
**If FAIL:** [Exact failure point and actual state]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `update_mission_progress` RPC function

```sql
-- First UPDATE statement
WHERE mp.mission_id = m.id
  AND mp.client_id = p_client_id              -- MULTI-TENANT FILTER
  AND m.client_id = p_client_id               -- MULTI-TENANT FILTER ON JOIN
  AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
  ...

-- Second UPDATE statement (completion check)
WHERE mp.mission_id = m.id
  AND mp.client_id = p_client_id              -- MULTI-TENANT FILTER
  AND m.client_id = p_client_id               -- MULTI-TENANT FILTER ON JOIN
  AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
  ...
```

**Security Checklist:**
- [ ] `mp.client_id = p_client_id` present in both UPDATE statements
- [ ] `m.client_id = p_client_id` present in both UPDATE statements (Codex fix)
- [ ] No raw SQL without client_id filter
- [ ] No cross-tenant data exposure possible
- [ ] Videos subqueries also filter by `v.client_id = p_client_id`

**Query 2:** TypeScript repository function

```typescript
const { data, error } = await (supabase.rpc as Function)(
  'update_mission_progress',
  {
    p_client_id: clientId,  // Client ID passed to RPC
    p_user_ids: userIds.length > 0 ? userIds : null,
  }
);
```

**Security Checklist:**
- [ ] clientId parameter passed to RPC
- [ ] RPC handles isolation internally
- [ ] No additional queries without isolation

---

### Authentication Check

**Route:** `/api/cron/daily-automation` (calls salesService which calls this function)

**Checklist:**
- [ ] Cron route uses admin client (service_role)
- [ ] Client ID extracted from configuration/context
- [ ] Tenant isolation enforced at RPC level

---

**SECURITY STATUS:** [ALL CHECKS PASSED / ISSUES FOUND]

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

#### For Database/Query Bugs:

**Verify RPC function exists in migration:**
```bash
grep -n "CREATE OR REPLACE FUNCTION update_mission_progress" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql
```
**Expected:** Line 1 or near top shows function creation
**Actual:** [document actual output]

**Verify repository calls RPC:**
```bash
grep -n "update_mission_progress" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```
**Expected:** Shows RPC call (not throw Error)
**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed

---

### Verification 2: No New Errors Introduced

**Type Check:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] No new type errors introduced

---

### Verification 3: Modified Files Compile/Work

**For each modified file:**
```bash
npx tsc --noEmit /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts 2>&1
```
**Expected:** No errors on modified file
**Actual:** [document output]

**Status:**
- [ ] All modified files compile

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] All column names match SchemaFinalv2.md (verified in Gate 4)
- [ ] Data types correct (INTEGER for current_value, TIMESTAMP for checkpoint_*)
- [ ] All relationships (FKs) respected (mission_id, user_id, client_id)

---

### Verification 5: Build Verification

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build succeeds
**Actual:** [document output]

**Status:**
- [ ] Build passes

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `lib/repositories/syncRepository.ts`: ~12 lines changed - stub replaced with RPC call
- `supabase/migrations/20251212_add_update_mission_progress_rpc.sql`: new file (~120 lines)

**Actual Changes:** [document git diff output]

**Detailed diff for repository:**
```bash
git diff /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts
```

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

**FINAL VERIFICATION STATUS:** [ALL PASSED / FAILED]

**If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-12
**Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Decision Source:** MissionProgressUpdateFix.md
**Implementation Doc:** MissionProgressUpdateFixIMPL.md
**Bug ID:** BUG-MISSION-PROGRESS-UPDATE

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: RPC Pattern - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create SQL migration - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 1.5: Regenerate RPC types - [PASS/SKIP] (per Codex audit)
[Timestamp] Step 2: Update syncRepository - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Bug-specific validation ✅
[Timestamp] No new errors ✅
[Timestamp] Files compile ✅
[Timestamp] Schema alignment ✅
[Timestamp] Build passes ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `/home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql` - CREATE - New RPC function (~120 lines)
2. `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts` - Lines 337-358 - MODIFY - Replace stub with RPC call (+12 lines net)
3. `/home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts` - REGENERATE - Updated RPC types (if local DB running)

**Total:** 2-3 files modified, ~132 lines added (+ regenerated types)

---

### Bug Resolution

**Before Implementation:**
- Bug: `updateMissionProgress()` throws "Not implemented" error
- Root cause: Function left as stub when Task 8.2.2a marked complete

**After Implementation:**
- Bug: RESOLVED
- Verification: Function calls RPC which updates mission_progress.current_value based on mission_type-specific aggregations

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: MissionProgressUpdateFix.md
- Documented 19 sections
- Proposed solution: PostgreSQL RPC following Pattern 4

**Step 2: Audit Phase**
- Codex audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: YES (multi-tenant fixes, null handling, guards)

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: MissionProgressUpdateFixIMPL.md
- Executing 2 implementation steps
- Verifications: [pending]

**Step 4: Current Status**
- Implementation: [PENDING/COMPLETE]
- Bug resolved: [YES/NO]
- Ready for commit: [YES/NO]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file created
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql

# 2. Verify RPC function in migration
grep "CREATE OR REPLACE FUNCTION update_mission_progress" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql

# 3. Verify multi-tenant filters in RPC
grep "client_id = p_client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql

# 4. Verify repository calls RPC (not throws error)
grep -A5 "async updateMissionProgress" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts

# 5. Verify no type errors
npx tsc --noEmit 2>&1 | grep "syncRepository" || echo "No errors in syncRepository"

# 6. Verify build passes
npm run build
```

**Expected Results:**
- Migration file exists
- RPC function defined with correct signature
- Multi-tenant filters present (mp.client_id AND m.client_id)
- Repository calls RPC instead of throwing error
- No type errors
- Build passes

**Audit Status:** [VERIFIED / ISSUES FOUND]
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5]
- Steps completed: [3/3] (including Step 1.5 types regeneration)
- Verifications passed: [6/6]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: 2-3 (+ types if regenerated)
- Lines changed: ~132 (net add)
- Breaking changes: 0
- Security verified: YES
- Tests updated: N/A (integration test recommended)

---

## Document Status

**Implementation Date:** 2025-12-12
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Document Version:** 1.1 (Codex audit: added Step 1.5 for types regeneration)

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [ ] Schema verified
- [ ] RPC pattern verified

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] Auth requirements met

**Verification:**
- [ ] Bug-specific validation passed
- [ ] No new errors
- [ ] Files compile
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed
- [ ] Metrics documented

---

### Final Status

**Implementation Result:** [PENDING]

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update MissionProgressUpdateFix.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update MissionProgressUpdateFix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Apply migration to Supabase: `supabase db push`
5. [ ] Regenerate types: `supabase gen types typescript --local > lib/types/database.ts`

**Git Commit Message Template:**
```
fix: implement updateMissionProgress RPC for mission progress tracking

Resolves BUG-MISSION-PROGRESS-UPDATE: syncRepository.updateMissionProgress()
was a stub throwing "Not implemented" error. Mission progress values were
never updated during daily cron.

Changes:
- supabase/migrations/20251212_add_update_mission_progress_rpc.sql: New RPC
  function with mission_type-aware aggregations from videos table
- lib/repositories/syncRepository.ts: Replace stub with RPC call

Security:
- Multi-tenant isolation on both mission_progress and missions tables
- Codex audit fixes applied (client_id filters, null handling, guards)

References:
- MissionProgressUpdateFix.md
- MissionProgressUpdateFixIMPL.md
- Loyalty.md Flow 1 Step 5

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**If implementation failed:**
1. [ ] Review failure point
2. [ ] Check for line number drift
3. [ ] Verify file state matches Fix.md assumptions
4. [ ] Report to user for guidance

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
- [ ] Verified RPC pattern from existing migrations

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (Codex fixes applied)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering on BOTH tables)
- [ ] Verified auth requirements (service_role grant)
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

### Code Quality
- [ ] No "... rest of code ..." placeholders used
- [ ] No "around line X" approximations used
- [ ] No "should work" assumptions made
- [ ] No "probably" or "likely" hedging used

---

**META-VERIFICATION STATUS:** [PENDING - Execute to verify]

**RED FLAGS exhibited:** None (document created, not yet executed)

---

## Dependency Note

**IMPORTANT:** This fix (BUG-MISSION-PROGRESS-UPDATE) depends on mission_progress rows existing.

Per GAP-MISSION-PROGRESS-ROWS (documented in MissionProgressRowCreationGap.md):
- Mission progress rows must be created BEFORE this update function can work
- Without rows, this RPC updates 0 records
- Recommended: Implement GAP-MISSION-PROGRESS-ROWS first or alongside this fix

**Execution Order:**
1. GAP-MISSION-PROGRESS-ROWS - Creates mission_progress rows for eligible users
2. BUG-MISSION-PROGRESS-UPDATE (this fix) - Updates current_value on existing rows

---

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Author:** Claude Opus 4.5
**Status:** Ready for Execution
