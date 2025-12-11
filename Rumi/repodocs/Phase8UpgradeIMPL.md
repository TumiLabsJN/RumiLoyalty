# Phase 8 Repository Layer Implementation Guide

**Purpose:** Specify exactly how to add repository layer to Phase 8 following Option B
**Audience:** LLM agents implementing the upgrade
**Created:** 2025-12-11
**Status:** Ready for Implementation

---

## Overview

**Option B Selected:**
- Create `syncRepository.ts` for Step 8.2 (Daily Sales Sync)
- Extend `tierRepository.ts` for Step 8.3 (Tier Calculation)

**Why Option B:**
- Clear separation: sync operations vs tier operations
- Follows domain boundaries
- Easier to debug (sync issues → syncRepository, tier issues → tierRepository)

---

## 1. New Files to Create

### 1.1 syncRepository.ts

**Location:** `/lib/repositories/syncRepository.ts`

**Tables Accessed:**
| Table | Operations |
|-------|------------|
| `videos` | SELECT, UPSERT |
| `users` | SELECT, UPDATE (precomputed fields, leaderboard) |
| `sync_logs` | INSERT, UPDATE |
| `sales_adjustments` | SELECT, UPDATE (apply pending) |
| `mission_progress` | SELECT, UPDATE |
| `redemptions` | INSERT |

**Functions to Implement:**

```typescript
export const syncRepository = {
  // ========== Video Operations ==========

  /**
   * Upsert video record using video_url as unique key
   * Per SchemaFinalv2.md lines 227-251
   */
  async upsertVideo(
    clientId: string,
    userId: string,
    videoData: {
      videoUrl: string;
      videoTitle: string;
      postDate: string;
      views: number;
      likes: number;
      comments: number;
      gmv: number;
      ctr: number;
      unitsSold: number;
    }
  ): Promise<string>  // Returns video ID

  /**
   * Bulk upsert videos for efficiency
   */
  async bulkUpsertVideos(
    clientId: string,
    videos: Array<{ userId: string; videoData: VideoData }>
  ): Promise<{ inserted: number; updated: number }>

  // ========== User Lookup ==========

  /**
   * Find user by TikTok handle
   * Reuses existing userRepository.findByHandle pattern
   */
  async findUserByTiktokHandle(
    clientId: string,
    handle: string
  ): Promise<{ id: string; currentTier: string } | null>

  /**
   * Create user from CRUVA CSV data (auto-registration)
   * Per Loyalty.md Flow 2 lines 556-560
   */
  async createUserFromCruva(
    clientId: string,
    tiktokHandle: string,
    firstVideoDate: string
  ): Promise<string>  // Returns user ID

  // ========== Precomputed Fields ==========

  /**
   * Update all 16 precomputed fields for users
   * Per ARCHITECTURE.md Section 3.1 lines 176-207
   *
   * Fields updated:
   * - leaderboard_rank, total_sales, total_units
   * - manual_adjustments_total, manual_adjustments_units
   * - checkpoint_sales_current, checkpoint_units_current
   * - checkpoint_videos_posted, checkpoint_total_views
   * - checkpoint_total_likes, checkpoint_total_comments
   * - projected_tier_at_checkpoint
   * - next_tier_name, next_tier_threshold, next_tier_threshold_units
   * - checkpoint_progress_updated_at
   */
  async updatePrecomputedFields(
    clientId: string,
    userIds?: string[]  // If empty, update all users
  ): Promise<number>  // Returns count updated

  /**
   * Calculate and update leaderboard ranks
   * Uses ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_sales DESC)
   */
  async updateLeaderboardRanks(clientId: string): Promise<void>

  // ========== Mission Progress ==========

  /**
   * Update mission progress for users based on current metrics
   * Per Loyalty.md lines 466-533
   */
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number>  // Returns count updated

  /**
   * Find missions where status just changed to 'completed'
   * (current_value >= target_value AND status was 'in_progress')
   */
  async findNewlyCompletedMissions(
    clientId: string
  ): Promise<Array<{ missionProgressId: string; userId: string; missionId: string; rewardId: string }|}>>

  // ========== Redemption Creation ==========

  /**
   * Create redemption records for completed missions
   * Per Loyalty.md lines 338-355
   */
  async createRedemptionForCompletedMission(
    clientId: string,
    data: {
      userId: string;
      missionProgressId: string;  // Per SchemaFinalv2.md line 603
      rewardId: string;
      tierAtClaim: string;
    }
  ): Promise<string>  // Returns redemption ID

  // ========== Sync Logs ==========

  /**
   * Create sync log entry when automation starts
   */
  async createSyncLog(
    clientId: string,
    data: {
      source: 'auto' | 'manual';
      fileName?: string;
      triggeredBy?: string;
    }
  ): Promise<string>  // Returns sync_log ID

  /**
   * Update sync log with completion status
   */
  async updateSyncLog(
    syncLogId: string,
    status: 'success' | 'failed',
    recordsProcessed: number,
    errorMessage?: string
  ): Promise<void>

  // ========== Sales Adjustments ==========

  /**
   * Apply pending sales adjustments to users
   * Per Loyalty.md lines 1458-1541 (Step 0 of tier calculation)
   *
   * 1. UPDATE users.total_sales += SUM(amount) WHERE applied_at IS NULL
   * 2. UPDATE users.manual_adjustments_total += same
   * 3. For units mode: same for units fields
   * 4. Mark adjustments as applied
   */
  async applyPendingSalesAdjustments(clientId: string): Promise<number>  // Returns count applied
}
```

---

### 1.2 Extend tierRepository.ts

**Location:** `/lib/repositories/tierRepository.ts` (existing file)

**New Tables Accessed:**
| Table | Operations |
|-------|------------|
| `tier_checkpoints` | INSERT |
| `users` | SELECT (due for checkpoint), UPDATE (tier change) |

**Functions to Add:**

```typescript
// Add to existing tierRepository object:

  // ========== Checkpoint Evaluation ==========

  /**
   * Get users due for checkpoint evaluation
   * Per Loyalty.md lines 1553-1561
   *
   * Query: WHERE next_checkpoint_at <= TODAY
   *        AND current_tier != 'tier_1' (Bronze exempt)
   */
  async getUsersDueForCheckpoint(
    clientId: string
  ): Promise<Array<{
    userId: string;
    currentTier: string;
    tierOrder: number;
    checkpointSalesCurrent: number;
    checkpointUnitsCurrent: number;
    manualAdjustmentsTotal: number;
    manualAdjustmentsUnits: number;
    tierAchievedAt: string;
    nextCheckpointAt: string;
  }|}>>

  /**
   * Get tier thresholds for comparison
   * Returns tiers ordered by tier_order DESC for highest-first matching
   */
  async getTierThresholdsForCheckpoint(
    clientId: string,
    vipMetric: 'sales' | 'units'
  ): Promise<Array<{
    tierId: string;
    tierName: string;
    tierOrder: number;
    threshold: number;  // sales_threshold or units_threshold based on metric
  }|}>>

  /**
   * Update user tier after checkpoint evaluation
   * Per Loyalty.md lines 1611-1626
   *
   * Updates:
   * - current_tier
   * - tier_achieved_at = NOW() (if changed)
   * - next_checkpoint_at = NOW() + checkpoint_months
   * - checkpoint_sales_current = 0 (reset)
   * - checkpoint_units_current = 0 (reset)
   */
  async updateUserTierAfterCheckpoint(
    clientId: string,
    userId: string,
    data: {
      newTier: string;
      tierChanged: boolean;
      checkpointMonths: number;
    }
  ): Promise<void>

  /**
   * Log checkpoint evaluation result to tier_checkpoints table
   * Per Loyalty.md lines 1628-1655
   */
  async logCheckpointResult(
    clientId: string,
    data: {
      userId: string;
      checkpointDate: string;
      periodStartDate: string;
      periodEndDate: string;
      salesInPeriod?: number;
      unitsInPeriod?: number;
      salesRequired?: number;
      unitsRequired?: number;
      tierBefore: string;
      tierAfter: string;
      status: 'promoted' | 'maintained' | 'demoted';
    }
  ): Promise<string>  // Returns tier_checkpoint ID

  /**
   * Handle tier demotion - soft delete VIP rewards
   * Per Loyalty.md lines 2341-2390
   */
  async softDeleteVipRewardsOnDemotion(
    clientId: string,
    userId: string,
    oldTier: string,
    newTier: string
  ): Promise<number>  // Returns count soft-deleted
```

---

## 2. EXECUTION_PLAN.md Changes

### 2.1 New Tasks to Add

**Insert after Task 8.2.2:**

```markdown
- [ ] **Task 8.2.2a:** Create syncRepository for daily sync database operations
    - **Action:** Create `/lib/repositories/syncRepository.ts`
    - **References:** ARCHITECTURE.md Section 4 (Repository Layer, lines 534-612), Section 9 (Multitenancy, lines 1104-1137), Phase8UpgradeIMPL.md
    - **Implementation Guide:** Create repository with functions for: (1) upsertVideo - upsert to videos table using video_url as unique key, (2) bulkUpsertVideos - batch insert for efficiency, (3) findUserByTiktokHandle - lookup user for CSV row processing, (4) createUserFromCruva - auto-create user per Flow 2 lines 556-560, (5) updatePrecomputedFields - update all 16 fields on users table, (6) updateLeaderboardRanks - ROW_NUMBER() calculation, (7) updateMissionProgress - recalculate current_value for active missions, (8) findNewlyCompletedMissions - find missions that just hit target, (9) createRedemptionForCompletedMission - insert redemption for auto-claim, (10) createSyncLog/updateSyncLog - sync_logs table operations, (11) applyPendingSalesAdjustments - apply pending sales_adjustments to users
    - **Acceptance Criteria:** (1) File exists at /lib/repositories/syncRepository.ts, (2) All functions filter by client_id per Section 9, (3) TypeScript compiles, (4) Follows Section 4 patterns (Supabase queries, data mapping, error handling)
```

**Insert before Task 8.3.1:**

```markdown
- [ ] **Task 8.3.0a:** Extend tierRepository with checkpoint evaluation functions
    - **Action:** Add checkpoint functions to `/lib/repositories/tierRepository.ts`
    - **References:** ARCHITECTURE.md Section 4 (Repository Layer), Loyalty.md lines 1553-1655 (checkpoint workflow), SchemaFinalv2.md lines 286-310 (tier_checkpoints table), Phase8UpgradeIMPL.md
    - **Implementation Guide:** Add 5 functions to existing tierRepository: (1) getUsersDueForCheckpoint - query users WHERE next_checkpoint_at <= TODAY AND current_tier != 'tier_1', joins clients for vip_metric and checkpoint_months, (2) getTierThresholdsForCheckpoint - get tier thresholds ordered by tier_order DESC for highest-first matching, returns sales_threshold or units_threshold based on vip_metric param, (3) updateUserTierAfterCheckpoint - update current_tier, tier_achieved_at, next_checkpoint_at, reset checkpoint counters to 0, (4) logCheckpointResult - insert audit record to tier_checkpoints with period dates, values, tier_before, tier_after, status, (5) softDeleteVipRewardsOnDemotion - set deleted_at and deleted_reason on VIP redemptions when user demoted
    - **Acceptance Criteria:** (1) All 5 functions added to tierRepository.ts, (2) All functions filter by client_id per Section 9, (3) TypeScript compiles, (4) Checkpoint exempt tiers (Bronze/tier_1) excluded from getUsersDueForCheckpoint, (5) getTierThresholdsForCheckpoint is metric-aware (uses correct threshold field)
```

---

### 2.2 Existing Tasks to Modify

**Task 8.2.3 - Change from direct DB to repository:**

```markdown
- [ ] **Task 8.2.3:** Implement processDailySales function
    - **Action:** Add transactional function to salesService implementing 6-step workflow using syncRepository
    - **References:** SchemaFinalv2.md (videos table), Loyalty.md Flow 1 lines 425-465, syncRepository functions from Task 8.2.2a
    - **Implementation Guide:** MUST implement complete Flow 1 workflow using syncRepository: (1) call cruvaDownloader.downloadCSV(), (2) parse CSV using csvParser, (3) for each row: call syncRepository.findUserByTiktokHandle, if null call syncRepository.createUserFromCruva, then call syncRepository.upsertVideo, (4) call syncRepository.updatePrecomputedFields, (5) call syncRepository.updateMissionProgress, (6) call syncRepository.findNewlyCompletedMissions + createRedemptionForCompletedMission for each. Use syncRepository.createSyncLog at start and updateSyncLog at end.
    - **Acceptance Criteria:** Uses syncRepository for ALL database operations (no direct Supabase in service), wrapped in transaction per Pattern 1
```

**Task 8.2.3a - Change to use repository:**

```markdown
- [ ] **Task 8.2.3a:** Implement updatePrecomputedFields function
    - **Action:** Implement syncRepository.updatePrecomputedFields with SQL aggregation
    - **References:** ARCHITECTURE.md Section 3.1 lines 176-207, SchemaFinalv2.md users table precomputed fields
    - **Implementation Guide:** In syncRepository, implement updatePrecomputedFields that: (1) aggregates videos table for checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments, (2) aggregates sales_adjustments for checkpoint_sales_current, checkpoint_units_current, (3) calculates projected_tier_at_checkpoint by comparing to tier thresholds, (4) derives next_tier_name, next_tier_threshold from tiers table, (5) sets checkpoint_progress_updated_at = NOW()
    - **Acceptance Criteria:** All 16 precomputed fields updated correctly, single efficient query (not N+1)
```

**Task 8.2.3b - Change to use repository:**

```markdown
- [ ] **Task 8.2.3b:** Implement updateLeaderboardRanks function
    - **Action:** Implement syncRepository.updateLeaderboardRanks with ROW_NUMBER()
    - **References:** ARCHITECTURE.md Section 3.1 lines 196-207
    - **Implementation Guide:** In syncRepository, implement using: UPDATE users SET leaderboard_rank = subquery.rank FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_sales DESC) as rank FROM users WHERE client_id = $1) subquery WHERE users.id = subquery.id
    - **Acceptance Criteria:** Ranks calculated correctly per client_id partition, ties handled consistently
```

**Task 8.2.3c - Change to use repository:**

```markdown
- [ ] **Task 8.2.3c:** Implement createRedemptionsForCompletedMissions function
    - **Action:** Implement using syncRepository.findNewlyCompletedMissions + createRedemptionForCompletedMission
    - **References:** Loyalty.md lines 338-355, SchemaFinalv2.md redemptions table
    - **Implementation Guide:** In salesService: (1) call syncRepository.findNewlyCompletedMissions to get missions where current_value >= target_value AND no existing redemption, (2) for each, call syncRepository.createRedemptionForCompletedMission with status='claimable'
    - **Acceptance Criteria:** Redemptions created only for newly completed missions, no duplicates
```

**Task 8.3.1 - Change to use repository:**

```markdown
- [ ] **Task 8.3.1:** Create tier calculation service with checkpoint maintenance
    - **Action:** Create `/lib/services/tierCalculationService.ts` using tierRepository functions from Task 8.3.0a
    - **References:** Loyalty.md lines 1452-1666 (Flow 7), tierRepository checkpoint functions
    - **Implementation Guide:** MUST implement 7-step workflow using tierRepository: (1) call syncRepository.applyPendingSalesAdjustments, (2) call tierRepository.getUsersDueForCheckpoint, (3) for each user: calculate checkpoint value (metric-aware), (4) call tierRepository.getTierThresholdsForCheckpoint and find highest qualifying tier, (5) determine outcome (promoted/maintained/demoted), (6) call tierRepository.updateUserTierAfterCheckpoint, (7) call tierRepository.logCheckpointResult. If demoted, call tierRepository.softDeleteVipRewardsOnDemotion.
    - **Acceptance Criteria:** Uses tierRepository for ALL database operations (no direct Supabase in service)
```

**Task 8.3.1a - Change to use repository:**

```markdown
- [ ] **Task 8.3.1a:** Implement applyPendingSalesAdjustments function
    - **Action:** Implement syncRepository.applyPendingSalesAdjustments
    - **References:** Loyalty.md lines 1458-1541
    - **Implementation Guide:** In syncRepository: (1) SELECT SUM(amount), SUM(amount_units) FROM sales_adjustments WHERE client_id=$1 AND applied_at IS NULL GROUP BY user_id, (2) UPDATE users SET total_sales += sum, manual_adjustments_total += sum, total_units += sum_units, manual_adjustments_units += sum_units, (3) UPDATE sales_adjustments SET applied_at = NOW() WHERE applied_at IS NULL AND client_id = $1
    - **Acceptance Criteria:** Adjustments applied exactly once (applied_at prevents double-application)
```

**Task 8.3.1b - Change to use repository:**

```markdown
- [ ] **Task 8.3.1b:** Implement getUsersDueForCheckpoint function
    - **Action:** Implement tierRepository.getUsersDueForCheckpoint
    - **References:** Loyalty.md lines 1544-1562
    - **Implementation Guide:** In tierRepository: SELECT u.*, c.vip_metric, c.checkpoint_months FROM users u JOIN clients c ON u.client_id = c.id WHERE u.client_id = $1 AND u.next_checkpoint_at <= CURRENT_DATE AND u.current_tier != 'tier_1'
    - **Acceptance Criteria:** Returns only users due today, excludes Bronze tier
```

**Task 8.3.1c - Change to use repository:**

```markdown
- [ ] **Task 8.3.1c:** Implement logCheckpointResult function
    - **Action:** Implement tierRepository.logCheckpointResult
    - **References:** Loyalty.md lines 1628-1655, SchemaFinalv2.md tier_checkpoints table
    - **Implementation Guide:** In tierRepository: INSERT INTO tier_checkpoints (client_id, user_id, checkpoint_date, period_start_date, period_end_date, sales_in_period, units_in_period, sales_required, units_required, tier_before, tier_after, status) VALUES (...)
    - **Acceptance Criteria:** All checkpoint evaluations logged, metric-aware (sales OR units fields populated)
```

---

### 2.3 Step 8.5 Tasks to Modify (Minor Fixes)

**Task 8.5.3 - Remove internal function reference:**

```markdown
- [ ] **Task 8.5.3:** Test daily automation updates user metrics
    - **Action:** Create `/tests/integration/cron/daily-automation-metrics.test.ts`
    - **References:** SchemaFinalv2.md lines 130-145 (users precomputed fields: checkpoint_sales_current, checkpoint_units_current, lifetime_sales, etc.), Loyalty.md lines 1946-2010 (Daily Sync Flow)
    - **Implementation Guide:** MUST test metrics update: (1) create user with checkpoint_sales_current=500, checkpoint_units_current=10, (2) create videos records: 3 videos totaling $300 GMV and 5 units, (3) call processDailySales, (4) query users → verify checkpoint_sales_current=800 (500+300), checkpoint_units_current=15 (10+5), (5) verify lifetime_sales updated, (6) verify videos_count incremented, (7) test with client.vip_metric='units' → verify units fields used for tier calc
    - **Test Cases:** (1) sales sync updates checkpoint_sales_current correctly, (2) units sync updates checkpoint_units_current correctly, (3) lifetime_sales aggregates all-time, (4) precomputed fields recalculated after sync, (5) vip_metric determines which field is primary
    - **Acceptance Criteria:** All 5 test cases MUST pass, precomputed fields MUST match aggregated video data per SchemaFinalv2.md lines 130-145, prevents stale-dashboard-data catastrophic bug
```

**Changes from original:**
- Removed "or updatePrecomputedFields" (now internal to repository)
- Changed "sales_adjustments records" to "videos records" (correct table)

---

**Task 8.5.4 - Fix table reference:**

```markdown
- [ ] **Task 8.5.4:** Test video upsert handles duplicates
    - **Action:** Add upsert test to `/tests/integration/cron/daily-automation-metrics.test.ts`
    - **References:** SchemaFinalv2.md lines 227-251 (videos table with video_url as unique key)
    - **Implementation Guide:** MUST test duplicate handling: (1) create user, (2) call processDailySales with CSV containing {video_url: 'video1', post_date: '2025-01-20', gmv: 100}, (3) query videos → 1 record exists, (4) call processDailySales again with same {video_url: 'video1', post_date: '2025-01-20', gmv: 150} (updated amount), (5) query videos → still 1 record, gmv=150 (upserted), (6) verify no duplicate records created
    - **Test Cases:** (1) first sync creates video record, (2) second sync with same video_url upserts (updates), (3) no duplicate records created, (4) updated values reflected
    - **Acceptance Criteria:** All 4 test cases MUST pass, UNIQUE constraint on video_url MUST be enforced per SchemaFinalv2.md lines 227-251
```

**Changes from original:**
- Changed task name from "sales upsert" to "video upsert"
- Changed references from sales_adjustments (lines 271-286) to videos (lines 227-251)
- Changed test data from {sales: 100} to {gmv: 100} (correct column)
- Changed table queries from sales_adjustments to videos

---

## 3. Implementation Order

```
Phase 8 Implementation Sequence (Updated)
=========================================

Step 8.1: Cron Infrastructure ✅ COMPLETE
  - Task 8.1.1: Create cron directory ✅
  - Task 8.1.2: Configure Vercel cron ✅

Step 8.2: Daily Sales Sync
  - Task 8.2.0a: CRUVA downloader ✅ COMPLETE
  - Task 8.2.1: CSV parser ✅ COMPLETE (+ CruvaUpgrade fix)
  - Task 8.2.2: Sales service skeleton ✅ COMPLETE
  - Task 8.2.2a: Create syncRepository ← NEW (do first)
  - Task 8.2.3: Implement processDailySales (uses syncRepository)
  - Task 8.2.3a: Implement updatePrecomputedFields (in syncRepository)
  - Task 8.2.3b: Implement updateLeaderboardRanks (in syncRepository)
  - Task 8.2.3c: Implement createRedemptionsForCompletedMissions (in syncRepository)
  - Task 8.2.4: Create daily-automation route
  - Task 8.2.5: Error monitoring

Step 8.3: Tier Calculation
  - Task 8.3.0a: Extend tierRepository ← NEW (do first)
  - Task 8.3.1: Tier calculation service (uses tierRepository)
  - Task 8.3.1a: applyPendingSalesAdjustments (in syncRepository)
  - Task 8.3.1b: getUsersDueForCheckpoint (in tierRepository)
  - Task 8.3.1c: logCheckpointResult (in tierRepository)
  - Task 8.3.2: Integrate with daily-automation
  - Task 8.3.3: Tier change notifications
  - Task 8.3.4: Raffle drawing calendar event

Step 8.4: Manual Upload (no changes needed)

Step 8.5: Cron Testing
  - Task 8.5.1: Create test file (no changes)
  - Task 8.5.2: Test CSV parsing (no changes)
  - Task 8.5.3: Test user metrics ← MODIFIED (remove updatePrecomputedFields reference)
  - Task 8.5.4: Test video upsert ← MODIFIED (fix table reference: videos not sales_adjustments)
  - Task 8.5.5-8.5.9: (no changes - tests call services/routes)
```

---

## 4. File Structure After Implementation

```
lib/
├── repositories/
│   ├── syncRepository.ts       ← NEW (Step 8.2 database operations)
│   ├── tierRepository.ts       ← EXTENDED (Step 8.3 checkpoint functions)
│   ├── userRepository.ts       (unchanged)
│   ├── missionRepository.ts    (unchanged)
│   ├── rewardRepository.ts     (unchanged)
│   └── ... other existing repos
├── services/
│   ├── salesService.ts         ← Uses syncRepository
│   ├── tierCalculationService.ts ← Uses tierRepository
│   └── ... other existing services
├── automation/
│   └── cruvaDownloader.ts      (unchanged)
└── utils/
    └── csvParser.ts            (unchanged)
```

---

## 5. Dependency Graph

```
salesService.ts
  ├── imports syncRepository
  ├── imports cruvaDownloader
  └── imports csvParser

syncRepository.ts
  ├── imports createClient from supabase
  └── accesses: videos, users, sync_logs, sales_adjustments, mission_progress, redemptions

tierCalculationService.ts
  ├── imports tierRepository
  └── imports syncRepository (for applyPendingSalesAdjustments)

tierRepository.ts (extended)
  ├── imports createClient from supabase
  └── accesses: tiers, tier_checkpoints, users, redemptions (for demotion)

daily-automation/route.ts
  ├── imports salesService.processDailySales
  └── imports tierCalculationService.runCheckpointEvaluation
```

---

## 6. Verification Checklist

After implementation, verify:

**Repository Files:**
- [ ] `syncRepository.ts` created with all 11 functions
- [ ] `tierRepository.ts` extended with 5 new functions
- [ ] All repository functions include `client_id` filtering
- [ ] TypeScript types defined for all inputs/outputs

**Service Files:**
- [ ] `salesService.ts` imports syncRepository (not Supabase directly)
- [ ] `tierCalculationService.ts` imports tierRepository (not Supabase directly)
- [ ] No direct Supabase imports in service files

**Documentation:**
- [ ] EXECUTION_PLAN.md updated with new tasks (8.2.2a, 8.3.0a)
- [ ] EXECUTION_PLAN.md updated with modified tasks (8.2.3, 8.2.3a-c, 8.3.1, 8.3.1a-c)
- [ ] EXECUTION_PLAN.md updated with Step 8.5 fixes (8.5.3, 8.5.4)
- [ ] AUTOMATION_IMPL.md updated with repository layer section

**Build:**
- [ ] TypeScript compiles without errors
- [ ] No unused imports warnings

---

## 7. Rollback Plan

If issues arise, the rollback is straightforward:

1. Services can temporarily import Supabase directly (revert to original plan)
2. Repository functions can be implemented incrementally
3. No schema changes required - this is purely code organization

---

## 8. Existing Files to Update

### 8.1 salesService.ts (Already Created - Task 8.2.2)

**File:** `/lib/services/salesService.ts`

**Current imports (WRONG - violates Section 5):**
```typescript
import { createClient } from '@/lib/supabase/server-client';
import { downloadCruvaCSV, readCSVBuffer, cleanupCSV } from '@/lib/automation/cruvaDownloader';
import { parseCruvaCSV, type ParsedVideoRow, type ParseResult } from '@/lib/utils/csvParser';
```

**Change to:**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
import { downloadCruvaCSV, readCSVBuffer, cleanupCSV } from '@/lib/automation/cruvaDownloader';
import { parseCruvaCSV, type ParsedVideoRow, type ParseResult } from '@/lib/utils/csvParser';
// REMOVED: import { createClient } from '@/lib/supabase/server-client';
```

**When:** Update imports when implementing Task 8.2.3 (after syncRepository exists)

### 8.2 AUTOMATION_IMPL.md

**Action:** Add section documenting repository layer after implementation

```markdown
## Repository Layer (Added per Phase8UpgradeIMPL.md)

- syncRepository.ts: Daily sync database operations
- tierRepository.ts: Extended with checkpoint functions
```

---

## 9. Repository Reuse Strategy

### Decision: syncRepository Implements Own Functions

syncRepository does **NOT** call other repositories. It implements its own database functions.

**Why not reuse missionRepository/redemptionRepository?**

| Reason | Explanation |
|--------|-------------|
| Architecture pattern | Repositories should not call other repositories - that's service layer orchestration per ARCHITECTURE.md Section 5 |
| Different context | Sync operations run without user auth context, may need admin client |
| Bulk operations | Sync needs batch operations that user-facing repos don't have |
| Traceability | All sync-related queries in one file for easier debugging |
| Different error handling | Sync may skip bad rows; user operations should fail fast |

### userRepository.findByHandle Clarification

Line 77 says "Reuses existing userRepository.findByHandle **pattern**"

This means:
- syncRepository.findUserByTiktokHandle() implements its **own** query
- Following the **same pattern** (normalize handle, client_id filter)
- Does **NOT** import or call userRepository

**Why duplicate?**
- userRepository.findByHandle uses RPC function for auth (bypasses RLS)
- syncRepository runs with service role, doesn't need RPC
- Different return type (sync only needs id + currentTier)

---

## 10. Error Handling Strategy

### Sync Process Error Handling

| Stage | Error Behavior |
|-------|----------------|
| CRUVA download fails | Return immediately with error, update sync_log status='failed' |
| CSV parse fails | Return immediately with error, update sync_log status='failed' |
| User lookup fails | Log error, skip row, continue to next |
| User creation fails | Log error, skip row, continue to next |
| Video upsert fails | Log error, skip row, continue to next |
| Precomputed fields fails | Log error, continue (non-fatal) |
| Mission progress fails | Log error, continue (non-fatal) |

### Transaction Strategy

**Supabase transactions:** Use `supabase.rpc()` for transactional operations or batch operations within single query.

**Per-row isolation:** Each CSV row is processed independently. One bad row doesn't rollback others.

**Sync log:** Always updated at end, even on partial failure:
```typescript
await syncRepository.updateSyncLog(syncLogId,
  errors.length > 0 ? 'failed' : 'success',
  processedCount,
  errors.join('; ')
);
```

### Tier Calculation Error Handling

| Stage | Error Behavior |
|-------|----------------|
| Get users due | If fails, abort tier calculation entirely |
| Per-user evaluation | Log error, skip user, continue to next |
| Tier update fails | Log error, skip user, continue to next |
| Checkpoint log fails | Log error (non-fatal), continue |
| Demotion cleanup fails | Log error (non-fatal), continue |

---

## 11. TypeScript Types

### Types for syncRepository

```typescript
// Input type for video upsert (maps from ParsedVideoRow)
export interface VideoUpsertData {
  videoUrl: string;
  videoTitle: string;
  postDate: string;
  views: number;
  likes: number;
  comments: number;
  gmv: number;
  ctr: number;
  unitsSold: number;
}

// Bulk upsert input
export interface BulkVideoUpsert {
  userId: string;
  videoData: VideoUpsertData;
}

// User lookup result (minimal for sync)
export interface SyncUserData {
  id: string;
  currentTier: string;
}

// Newly completed mission result
export interface CompletedMissionData {
  missionProgressId: string;
  userId: string;
  missionId: string;
  rewardId: string;
}

// Sync log creation input
export interface SyncLogInput {
  source: 'auto' | 'manual';
  fileName?: string;
  triggeredBy?: string;
}
```

### Types for tierRepository Extensions

```typescript
// User due for checkpoint
export interface CheckpointUserData {
  userId: string;
  currentTier: string;
  tierOrder: number;
  checkpointSalesCurrent: number;
  checkpointUnitsCurrent: number;
  manualAdjustmentsTotal: number;
  manualAdjustmentsUnits: number;
  tierAchievedAt: string;
  nextCheckpointAt: string;
  vipMetric: 'sales' | 'units';
  checkpointMonths: number;
}

// Tier threshold for comparison
export interface TierThreshold {
  tierId: string;
  tierName: string;
  tierOrder: number;
  threshold: number;
}

// Checkpoint log input
export interface CheckpointLogData {
  userId: string;
  checkpointDate: string;
  periodStartDate: string;
  periodEndDate: string;
  salesInPeriod?: number;
  unitsInPeriod?: number;
  salesRequired?: number;
  unitsRequired?: number;
  tierBefore: string;
  tierAfter: string;
  status: 'promoted' | 'maintained' | 'demoted';
}
```

---

## 12. Step 8.5 Testing Considerations

### Original Statement
"Step 8.5: Cron Testing (no changes needed - tests call service layer)"

### Clarification

**Integration tests (8.5.1-8.5.9):** These test the full flow and hit real database. They call:
- `processDailySales()` → uses syncRepository → hits DB
- `tierCalculation()` → uses tierRepository → hits DB

**No mock changes needed** because integration tests use real DB.

**Unit tests (if added later):** Would need to mock repositories:
```typescript
jest.mock('@/lib/repositories/syncRepository', () => ({
  syncRepository: {
    findUserByTiktokHandle: jest.fn(),
    upsertVideo: jest.fn(),
    // ...
  }
}));
```

### Task 8.5.2 (CSV Parsing)
Still works unchanged - tests `parseCruvaCSV()` directly, no repository involved.

---

## References

- ARCHITECTURE.md Section 4 (Repository Layer, lines 534-612)
- ARCHITECTURE.md Section 5 (Service Layer, lines 467-531)
- ARCHITECTURE.md Section 9 (Multitenancy, lines 1104-1137)
- Loyalty.md Flow 1 (lines 425-610) - Daily Metrics Sync
- Loyalty.md Flow 7 (lines 1452-1666) - Daily Tier Calculation
- SchemaFinalv2.md - videos, users, tier_checkpoints, sync_logs, sales_adjustments tables
- CruvaUpgrade.md - CSV parser single-source-of-truth fix
