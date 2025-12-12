# Mission Progress Update - Fix Documentation

**Bug ID:** BUG-MISSION-PROGRESS-UPDATE
**Created:** 2025-12-12
**Status:** Implemented (2025-12-12)
**Severity:** High
**Related Tasks:** Task 8.2.2a, Task 8.2.3 from EXECUTION_PLAN.md
**Linked Bugs:** None

---

## Codex Audit Response (v1.1)

**Initial Verdict:** REJECT - Plan incomplete, multi-tenant safety concerns

**Fixes Applied:**

| Issue | Resolution |
|-------|------------|
| Missing `m.client_id = p_client_id` on missions join | Added to both UPDATE statements |
| Empty/null user_ids handling undefined | NULL or empty = update ALL users for client |
| No mission status filters | Added `m.enabled = true AND m.activated = true` |
| No target_value guard | Added `COALESCE(m.target_value, 0) > 0` |
| Missing RPC typings step | Added Step 3 to regenerate database.ts |

**Out of Scope (Separate Bug):**
- Mission progress row creation - noted as separate issue, not blocking this fix

---

## 1. Project Context

This is a loyalty platform for TikTok Shop creators built with Next.js 14, TypeScript, and Supabase PostgreSQL. The system tracks creator sales/units/views/likes via daily CSV imports, manages missions with progress tracking, and rewards creators upon mission completion.

The bug affects the **mission progress update system** which should recalculate `mission_progress.current_value` daily based on aggregated video data within the user's checkpoint period.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

## 2. Bug Summary

**What's happening:** The `syncRepository.updateMissionProgress()` function is a stub that throws "Not implemented" error. Despite being called during daily cron execution, it fails silently (error caught) and mission progress values are never updated.

**What should happen:** Daily cron should recalculate `current_value` for all active missions based on aggregated video metrics (sales, units, views, likes, video count) within each user's `checkpoint_start` to `checkpoint_end` window.

**Impact:** All progress-based missions (sales_dollars, sales_units, videos, views, likes) show stale `current_value=0`. Users never see progress updates. Missions never complete automatically. Only raffle-type missions work (they don't track progress).

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| EXECUTION_PLAN.md | Task 8.2.2a | Lists `updateMissionProgress` as one of 11 required functions |
| EXECUTION_PLAN.md | Task 8.2.3 | Implementation Guide step (6) says "call syncRepository.updateMissionProgress" |
| syncRepository.ts | Lines 337-344 | Function throws "Not implemented - see Task 8.2.3" |
| salesService.ts | Lines 195-203 | Calls function but catches error as non-fatal |
| Loyalty.md | Flow 1, Step 5 | Shows SQL for updating mission progress with mission_type-aware calculations |

### Key Evidence

**Evidence 1:** Function throws error
- Source: syncRepository.ts, updateMissionProgress function
- Implication: Mission progress is never updated

**Evidence 2:** Error is silently swallowed
- Source: salesService.ts, Step 6
- Implication: Daily cron completes "successfully" despite mission progress never updating

**Evidence 3:** SQL specification exists
- Source: Loyalty.md, Flow 1 Step 5 "Update mission progress"
- Implication: Implementation logic is fully specified but never coded

## 4. Root Cause Analysis

**Root Cause:** `syncRepository.updateMissionProgress()` was left as a placeholder stub when Task 8.2.2a was marked complete.

**Contributing Factors:**
1. Task marked complete before all 11 functions were implemented
2. Error is caught and logged as "non-fatal" so cron doesn't fail
3. No test coverage for mission progress updates
4. Mission progress creation (initial rows) also not implemented - hidden by same issue

**How it was introduced:** Incomplete implementation during Phase 8 development. Focus was on sales sync and tier calculation; mission progress was deprioritized as a stub.

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | Users never see mission progress updates | High |
| Feature functionality | All progress missions broken (5 of 6 mission types) | High |
| Data integrity | current_value stays at 0 for all missions | Medium |
| Reward distribution | Missions never auto-complete, no rewards earned | High |

**Business Risk Summary:** Core mission feature is completely non-functional. Users cannot earn rewards from sales/units/views/likes/videos missions. Only raffle participation works.

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`
```typescript
// Lines 337-344
async updateMissionProgress(
  clientId: string,
  userIds: string[]
): Promise<number> {
  // TODO: Implement in Task 8.2.3 with mission-type-aware calculations
  // This is a placeholder that will be replaced with actual implementation
  throw new Error('Not implemented - see Task 8.2.3');
},
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/salesService.ts`
```typescript
// Lines 195-203
// Step 6: Update mission progress (currently stub)
console.log('[SalesService] Step 6: Updating mission progress...');
try {
  missionsUpdated = await syncRepository.updateMissionProgress(clientId, processedUserIds);
} catch (missionError) {
  // Non-fatal: Log error, continue
  const errorMsg = missionError instanceof Error ? missionError.message : String(missionError);
  console.warn(`[SalesService] Mission progress update failed (non-fatal): ${errorMsg}`);
}
```

**Current Behavior:**
- Function throws error immediately
- Error caught and logged as warning
- `missionsUpdated` stays at 0
- Daily cron continues without updating any mission progress

### Current Data Flow

```
Daily Cron
  ↓
processDailySales()
  ↓
Step 6: updateMissionProgress() ← THROWS ERROR
  ↓
Error caught, logged as warning
  ↓
Step 7: Continue to redemption creation
```

## 7. Proposed Fix

### Approach

Implement `updateMissionProgress` as a PostgreSQL RPC function (following Pattern 4 from Loyalty.md - O(1) RPC for bulk operations). The RPC will update `current_value` for all active missions based on mission_type-specific aggregations from the videos table.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts`

**Before:**
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

**After:**
```typescript
async updateMissionProgress(
  clientId: string,
  userIds: string[]
): Promise<number> {
  const supabase = createAdminClient();

  // Per Codex audit: empty/null userIds means "update all users for this client"
  // RPC handles this internally with conditional logic
  const { data, error } = await supabase.rpc('update_mission_progress', {
    p_client_id: clientId,
    p_user_ids: userIds.length > 0 ? userIds : null,  // null = all users
  });

  if (error) {
    throw new Error(`Failed to update mission progress: ${error.message}`);
  }

  return data ?? 0;
},
```

**Explanation:** Delegates to RPC for efficient bulk update with mission_type-aware calculations. Empty userIds array is converted to null, signaling RPC to update all users for the client.

### New Code (SQL Migration)

**New File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251212_add_update_mission_progress_rpc.sql`

```sql
-- RPC function to update mission progress for all active missions
-- Per Loyalty.md Flow 1 Step 5 "Update mission progress"
-- Mission-type aware calculations aggregating from videos table
--
-- BUG-MISSION-PROGRESS-UPDATE: Implements missing updateMissionProgress function
--
-- Codex Audit Fixes (2025-12-12):
-- 1. Added m.client_id = p_client_id to missions join (multi-tenant security)
-- 2. NULL/empty p_user_ids = update ALL users for client
-- 3. Added m.enabled = true AND m.activated = true filters
-- 4. Added COALESCE and target_value > 0 guards

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
        ELSE mp.current_value  -- Raffle type: no progress tracking
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
  -- Guard: target_value must be > 0 to avoid unintended completions
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_mission_progress(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_mission_progress(UUID, UUID[]) TO service_role;

COMMENT ON FUNCTION update_mission_progress IS 'Updates mission_progress.current_value based on mission_type-specific aggregations from videos table. NULL p_user_ids updates all users for client. Per Loyalty.md Flow 1 Step 5.';
```

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `lib/repositories/syncRepository.ts` | MODIFY | Replace stub with RPC call |
| `supabase/migrations/20251212_add_update_mission_progress_rpc.sql` | CREATE | New RPC function |

### Dependency Graph

```
syncRepository.ts
├── imports from: @/lib/supabase/admin-client
├── imported by: salesService.ts
└── affects: mission_progress.current_value, mission_progress.status
```

## 9. Data Flow Analysis

### Before Fix

```
Daily Cron → processDailySales() → updateMissionProgress()
                                          ↓
                                   THROWS ERROR
                                          ↓
                               current_value stays 0
```

### After Fix

```
Daily Cron → processDailySales() → updateMissionProgress()
                                          ↓
                                   RPC: update_mission_progress
                                          ↓
                     Aggregate videos by mission_type
                                          ↓
                     Update current_value per mission
                                          ↓
                     Mark completed if >= target_value
```

### Data Transformation Steps

1. **Step 1:** RPC receives client_id and user_ids array
2. **Step 2:** For each active mission_progress, calculates new current_value based on mission_type
3. **Step 3:** Aggregates from videos table within checkpoint window
4. **Step 4:** Updates status to 'completed' if target reached

## 10. Call Chain Mapping

### Affected Call Chain

```
Daily Cron (route.ts)
│
├─► processDailySales() (salesService.ts)
│   └── Orchestrates daily sync
│
├─► syncRepository.updateMissionProgress() (syncRepository.ts)
│   └── ⚠️ BUG IS HERE - throws error
│
└─► RPC: update_mission_progress (PostgreSQL)
    └── Mission-type aware aggregation
```

### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | mission_progress table | Target of updates |
| Database | videos table | Source for aggregations |
| Database | missions table | Provides mission_type, target_value |
| Repository | updateMissionProgress | Stub that throws error |
| Service | processDailySales | Calls repository, catches error |
| API Route | daily-automation | Entry point |

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| mission_progress | current_value, status, checkpoint_start, checkpoint_end | Target of updates |
| missions | mission_type, target_value | Configuration |
| videos | gmv, units_sold, views, likes, post_date | Source data |

### Schema Check

```sql
-- Verify mission_progress has required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'mission_progress'
AND column_name IN ('current_value', 'checkpoint_start', 'checkpoint_end', 'status');
```

### Data Migration Required?
- [x] No - schema already supports fix

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Mission progress display | Various | None - will now show real values |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| current_value | Always 0 | Actual progress | No |

### Frontend Changes Required?
- [x] No - frontend already handles this (displays current_value)

## 13. Alternative Solutions Considered

### Option A: TypeScript Implementation in Repository
- **Description:** Implement aggregation logic in TypeScript with multiple queries
- **Pros:** No SQL migration needed
- **Cons:** N+1 queries, poor performance, complex logic
- **Verdict:** ❌ Rejected - Performance concerns with many users/missions

### Option B: PostgreSQL RPC (Selected)
- **Description:** Single RPC call that does all aggregations in database
- **Pros:** O(1) operation, follows existing pattern (Pattern 4), efficient
- **Cons:** Requires SQL migration
- **Verdict:** ✅ Selected - Matches existing RPC pattern, performant

### Option C: Database Trigger
- **Description:** Trigger on videos table to update mission_progress
- **Pros:** Real-time updates
- **Cons:** Performance impact on every video insert, complex trigger logic
- **Verdict:** ❌ Rejected - Daily batch is sufficient, simpler

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RPC syntax error | Low | Medium | Test in local Supabase first |
| Performance with large datasets | Low | Medium | RPC is O(1), uses indexes |
| Checkpoint_start/end NULL | Medium | Low | COALESCE handles NULLs |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | N/A |
| Database | No | Additive migration |
| Frontend | No | N/A |

## 15. Testing Strategy

### Unit Tests

**File:** `/home/jorge/Loyalty/Rumi/tests/integration/cron/mission-progress.test.ts`
```typescript
describe('updateMissionProgress', () => {
  it('should update current_value for sales_dollars mission', async () => {
    // Setup: Create mission_progress with checkpoint window
    // Add videos within window
    // Call updateMissionProgress
    // Verify current_value = sum of video gmv
  });

  it('should mark mission completed when target reached', async () => {
    // Setup: Create mission with target_value=100
    // Add videos totaling 150
    // Call updateMissionProgress
    // Verify status='completed', completed_at set
  });

  it('should respect checkpoint window boundaries', async () => {
    // Setup: Videos inside and outside checkpoint window
    // Verify only videos within window are counted
  });

  it('should handle different mission types correctly', async () => {
    // Test each: sales_dollars, sales_units, videos, views, likes
  });
});
```

### Manual Verification Steps

1. [ ] Apply migration to local Supabase
2. [ ] Create test mission_progress record with checkpoint window
3. [ ] Add video records within window
4. [ ] Run daily cron
5. [ ] Verify current_value updated correctly
6. [ ] Verify status changes to 'completed' when target reached

### Verification Commands

```bash
# Apply migration
supabase db push

# Type check
npx tsc --noEmit

# Build verification
npm run build
```

## 16. Implementation Checklist

### Pre-Implementation
- [ ] Read Loyalty.md Flow 1 Step 5 (mission progress SQL)
- [ ] Verify mission_progress table has checkpoint_start, checkpoint_end columns
- [ ] Verify videos table has gmv, units_sold, views, likes columns

### Implementation Steps
- [ ] **Step 1:** Create SQL migration file
  - File: `supabase/migrations/20251212_add_update_mission_progress_rpc.sql`
  - Change: Add RPC function with Codex audit fixes (multi-tenant, null handling, guards)
- [ ] **Step 2:** Apply migration
  - Command: `supabase db push`
- [ ] **Step 3:** Regenerate RPC typings (per Codex audit)
  - Command: `supabase gen types typescript --local > lib/types/database.ts`
  - Note: Adds `update_mission_progress` to RPC types
- [ ] **Step 4:** Update syncRepository.ts
  - File: `lib/repositories/syncRepository.ts`
  - Change: Replace stub with RPC call (empty array → null for "all users")

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Manual verification with test data
- [ ] Update AUTOMATION_IMPL.md with new function

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 8.2.2a | Create syncRepository | Function was listed but not implemented |
| 8.2.3 | Implement processDailySales | Step 6 calls this function |

### Updates Required

**Task 8.2.2a:**
- Current AC: Lists 11 functions including updateMissionProgress
- Updated AC: No change needed - just implement the function
- Notes: Function was a stub, now will be real implementation

### New Tasks Created (if any)
- None - this completes existing task

## 18. Definition of Done

- [ ] SQL migration created with RPC function
- [ ] syncRepository.updateMissionProgress calls RPC
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Manual verification shows current_value updating
- [ ] Missions auto-complete when target reached
- [ ] AUTOMATION_IMPL.md updated
- [ ] This document status updated to "Implemented"

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Loyalty.md | Flow 1 Step 5 | SQL specification for mission progress update |
| SchemaFinalv2.md | mission_progress table | Schema definition |
| SchemaFinalv2.md | missions table | mission_type enum |
| EXECUTION_PLAN.md | Task 8.2.2a, 8.2.3 | Task requirements |
| syncRepository.ts | updateMissionProgress | Current stub implementation |

### Reading Order for External Auditor

1. **First:** Loyalty.md - Flow 1 Step 5 - Provides SQL specification
2. **Second:** SchemaFinalv2.md - mission_progress/missions tables - Shows schema
3. **Third:** This document - Sections 6-7 - Shows current vs proposed code

---

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Author:** Claude Code
**Status:** Analysis Complete
