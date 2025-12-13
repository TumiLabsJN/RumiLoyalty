# Automation System - Implementation Guide

**Purpose:** Daily cron job for sales data sync from CRUVA, precomputed field updates, real-time tier promotion, tier checkpoint evaluation, tier change notifications, and raffle calendar events
**Phase:** Phase 8 - Automation & Cron Jobs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-13 (v2.3 - Added Tasks 8.3.3-8.3.4 with full code snippets, call chains, schema refs per FSDocumentationMVP.md)

---

## Quick Reference

**Steps Documented:**
- Step 8.1 - Cron Infrastructure ✅
- Step 8.2 - Daily Sales Sync ✅ (Tasks 8.2.0a-8.2.5, GAP-MISSION-PROGRESS-ROWS, BUG-MISSION-PROGRESS-UPDATE)
- Step 8.3 - Tier Calculation ✅ (Tasks 8.3.0a-8.3.4 COMPLETE)
- Step 8.3b - Real-Time Promotion ✅ (BUG-REALTIME-PROMOTION)
- Step 8.4 - Manual Upload (pending)
- Step 8.5 - Cron Testing (pending)

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `vercel.json` | 13 | Vercel cron configuration |
| `appcode/app/api/cron/daily-automation/route.ts` | 302 | Cron route handler (6-step orchestration + notifications + raffle) |
| `appcode/lib/services/salesService.ts` | 369 | Sales sync orchestration |
| `appcode/lib/services/tierCalculationService.ts` | 457 | Checkpoint eval + real-time promotion |
| `appcode/lib/repositories/syncRepository.ts` | 710 | Database operations for sync + raffle queries |
| `appcode/lib/repositories/tierRepository.ts` | 755 | Tier + checkpoint + promotion functions |
| `appcode/lib/utils/alertService.ts` | 353 | Admin failure alerts via Resend |
| `appcode/lib/utils/notificationService.ts` | 370 | User tier change notifications via Resend |
| `appcode/lib/utils/cronAuth.ts` | 171 | Cron secret validation |
| `appcode/lib/utils/googleCalendar.ts` | 499 | Google Calendar event creation |

**Cron Schedule:** `0 19 * * *` (7 PM UTC / 2 PM EST daily)

**Quick Navigation:**
- [Step 8.1 - Cron Infrastructure](#step-81---cron-infrastructure)
- [Step 8.2 - Daily Sales Sync](#step-82---daily-sales-sync)
- [Step 8.3 - Tier Calculation](#step-83---tier-calculation)
- [Step 8.3b - Real-Time Promotion](#step-83b---real-time-promotion-bug-realtime-promotion)
- [Task 8.3.3 - Tier Change Notifications](#task-833---tier-change-notifications)
- [Task 8.3.4 - Raffle Drawing Calendar Event](#task-834---raffle-drawing-calendar-event)
- [Configuration Files](#configuration-files)
- [Timing Rationale](#timing-rationale)

---

## Step 8.1 - Cron Infrastructure

**Status:** Complete
**Tasks:** 8.1.1, 8.1.2

### Task 8.1.1: Create Cron Directory

**Action:** Created directory for cron API routes

**Directory:** `appcode/app/api/cron/`

**Files Created:**
```
appcode/app/api/cron/
└── .gitkeep    # Ensures empty directory is tracked by git
```

**Verification:**
```bash
ls -la appcode/app/api/cron/
# Expected: .gitkeep file exists
```

### Task 8.1.2: Vercel Cron Configuration

**File:** `vercel.json` (root directory)

**Configuration** (vercel.json:1-13):
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 19 * * *"
    }
  ],
  "functions": {
    "api/cron/daily-automation.js": {
      "maxDuration": 300
    }
  }
}
```

**Configuration Details:**
| Field | Value | Description |
|-------|-------|-------------|
| `path` | `/api/cron/daily-automation` | API route Vercel calls |
| `schedule` | `0 19 * * *` | 7 PM UTC / 2 PM EST daily |
| `maxDuration` | `300` | 5 minute timeout (sufficient for ~1000 creators) |

**Note:** The `.js` extension in `functions` config references the compiled output. Source file will be `route.ts`.

---

## Configuration Files

### vercel.json

**Location:** `/home/jorge/Loyalty/Rumi/vercel.json`
**Lines:** 13

**Full Content:**
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-automation",
      "schedule": "0 19 * * *"
    }
  ],
  "functions": {
    "api/cron/daily-automation.js": {
      "maxDuration": 300
    }
  }
}
```

**Verification:**
```bash
cat vercel.json | jq '.crons[0].schedule'
# Expected: "0 19 * * *"
```

---

## Timing Rationale

**Source:** Loyalty.md lines 58-65

**Schedule:** 2 PM EST / 7 PM UTC (`0 19 * * *`)

**Why this time:**
1. **Commission boost alignment:** Matches commission boost activation time for accurate sales snapshots
2. **MVP simplicity:** Start with daily, validate with user feedback
3. **Easy upgrade path:** Change 1 line in vercel.json to go hourly
4. **Cost efficiency:** ~$0.10/month (daily) vs $2.40/month (hourly)

**Upgrade Triggers:**
- >10% support tickets about data delays
- User requests for real-time data
- 500+ creators threshold

**Performance Target:** ~2 minutes total at 1000 creators

---

## Step 8.2 - Daily Sales Sync

**Status:** Complete
**Tasks:** 8.2.0a, 8.2.1, 8.2.2a, 8.2.3, 8.2.3-rpc, 8.2.3a, 8.2.3b, 8.2.3c, 8.2.4, 8.2.5

### Database Tables Used

| Table | SchemaFinalv2.md | Purpose |
|-------|------------------|---------|
| `users` | lines 123-226 | Precomputed fields updated by sync |
| `videos` | lines 227-331 | Per-video analytics from CRUVA CSV |
| `sync_logs` | lines 332-354 | Daily sync operation tracking |
| `mission_progress` | lines 425-498 | Mission completion tracking |
| `redemptions` | lines 594-665 | Reward redemption records |

### Function Call Chain

```
GET /api/cron/daily-automation (route.ts:69)
  ├─→ withCronAuth() validates CRON_SECRET (cronAuth.ts:88-120)
  │
  ├─→ processDailySales(clientId) (salesService.ts:59-276)
  │   ├─→ syncRepository.createSyncLog() (syncRepository.ts:176-207)
  │   ├─→ downloadCruvaCSV() (cruvaDownloader.ts)
  │   ├─→ parseCruvaCSV() (csvParser.ts)
  │   ├─→ syncRepository.upsertVideo() per row (syncRepository.ts:231-280)
  │   ├─→ syncRepository.updatePrecomputedFields() RPC (syncRepository.ts:313-335)
  │   ├─→ syncRepository.updateLeaderboardRanks() RPC (syncRepository.ts:348-380)
  │   ├─→ syncRepository.createMissionProgressForEligibleUsers() RPC (syncRepository.ts:381-396) ← Step 5.5 (GAP-MISSION-PROGRESS-ROWS)
  │   ├─→ syncRepository.updateMissionProgress() RPC (syncRepository.ts:337-360) ← Step 6 (BUG-MISSION-PROGRESS-UPDATE)
  │   ├─→ createRedemptionsForCompletedMissions() (salesService.ts:341-368)
  │   │   └─→ syncRepository.findNewlyCompletedMissions() (syncRepository.ts:398-456)
  │   │   └─→ syncRepository.createRedemptionForCompletedMission() (syncRepository.ts:459-506)
  │   └─→ syncRepository.updateSyncLog() (syncRepository.ts:209-228)
  │
  └─→ On failure: sendAdminAlert() (alertService.ts:264-317)
```

---

### Task 8.2.1: CSV Parser with CRUVA Column Mapping

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/utils/csvParser.ts` (228 lines)

**Purpose:** Centralized mapping from CRUVA CSV headers to database column names. If CRUVA changes their column names, update ONLY this file.

**CRUVA_COLUMN_MAP** (csvParser.ts:24-35):
```typescript
export const CRUVA_COLUMN_MAP: Record<string, string> = {
  'Handle': 'tiktok_handle',      // Used for user lookup (not stored in videos table)
  'Video': 'video_url',           // videos.video_url
  'Views': 'views',               // videos.views
  'Likes': 'likes',               // videos.likes
  'Comments': 'comments',         // videos.comments
  'GMV': 'gmv',                   // videos.gmv
  'CTR': 'ctr',                   // videos.ctr
  'Units Sold': 'units_sold',     // videos.units_sold
  'Post Date': 'post_date',       // videos.post_date
  'Video Title': 'video_title',   // videos.video_title
};
```

**Column Mapping Table:**
| CRUVA CSV Header | Database Column | Target Table |
|------------------|-----------------|--------------|
| Handle | tiktok_handle | users (lookup only) |
| Video | video_url | videos |
| Views | views | videos |
| Likes | likes | videos |
| Comments | comments | videos |
| GMV | gmv | videos |
| CTR | ctr | videos |
| Units Sold | units_sold | videos |
| Post Date | post_date | videos |
| Video Title | video_title | videos |

**Exported Interfaces** (csvParser.ts:40-62):
```typescript
export interface ParsedVideoRow {
  tiktok_handle: string;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  gmv: number;
  ctr: number;
  units_sold: number;
  post_date: string;
  video_title: string;
}

export interface ParseResult {
  success: boolean;
  rows: ParsedVideoRow[];
  errors: string[];
  totalRows: number;
  skippedRows: number;
}
```

**parseCruvaCSV Function** (csvParser.ts:70):
```typescript
export function parseCruvaCSV(csvContent: string | Buffer): ParseResult
```

**Exports Summary:**
| Export | Type | Line |
|--------|------|------|
| `CRUVA_COLUMN_MAP` | const | 24 |
| `ParsedVideoRow` | interface | 40 |
| `ParseResult` | interface | 56 |
| `parseCruvaCSV()` | function | 70 |
| `getCruvaColumnHeaders()` | function | 219 |
| `getDatabaseColumnNames()` | function | 226 |

---

### Task 8.2.2: Sales Service File

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/salesService.ts` (369 lines)

**Purpose:** Business logic for daily sales sync from CRUVA platform. Orchestrates CSV processing, video upserts, precomputed field updates, mission progress tracking, and redemption creation.

**ProcessDailySalesResult Interface** (salesService.ts:23-31):
```typescript
export interface ProcessDailySalesResult {
  success: boolean;
  recordsProcessed: number;
  usersUpdated: number;
  newUsersCreated: number;
  missionsUpdated: number;
  redemptionsCreated: number;
  errors: string[];
}
```

**Exports Summary:**
| Export | Type | Line | Status |
|--------|------|------|--------|
| `ProcessDailySalesResult` | interface | 23 | ✅ Implemented |
| `processDailySales()` | async function | 59 | ✅ Implemented (8-step workflow) |
| `processManualUpload()` | async function | 289 | ⏳ Stub (Task 8.4.1) |
| `updatePrecomputedFields()` | async function | 310 | ✅ Delegates to syncRepository |
| `updateLeaderboardRanks()` | async function | 324 | ✅ Delegates to syncRepository |
| `createRedemptionsForCompletedMissions()` | async function | 341 | ✅ Implemented |

**processDailySales 8-Step Workflow** (salesService.ts:59-284):
| Step | Description | Line |
|------|-------------|------|
| 1 | Create sync log to track automation run | 73-74 |
| 2 | Download CSV from CRUVA via Puppeteer | 77-94 |
| 3 | Parse CSV using csvParser utility | 97-102 |
| 4 | For each row: match user, auto-create if needed, upsert video | 119-175 |
| 5 | Update user precomputed fields (RPC) | 178-193 |
| 5.5 | Create mission_progress rows for eligible users (GAP fix) | 195-207 |
| 6 | Update mission progress (RPC) | 209-217 |
| 7 | Create redemptions for newly completed missions | 219-227 |
| 8 | Update sync log with final status | 229-284 |

**Function Signatures:**
```typescript
// Main workflow (salesService.ts:59)
export async function processDailySales(
  clientId: string
): Promise<ProcessDailySalesResult>

// Manual upload stub (salesService.ts:289) - Task 8.4.1
export async function processManualUpload(
  clientId: string,
  csvBuffer: Buffer,
  triggeredBy: string
): Promise<ProcessDailySalesResult>

// Helper - precomputed fields (salesService.ts:310)
export async function updatePrecomputedFields(
  clientId: string,
  userIds?: string[]
): Promise<void>

// Helper - leaderboard ranks (salesService.ts:324)
export async function updateLeaderboardRanks(
  clientId: string
): Promise<void>

// Helper - redemption creation (salesService.ts:341)
export async function createRedemptionsForCompletedMissions(
  clientId: string,
  errors?: string[]
): Promise<number>
```

---

### Task 8.2.2a: syncRepository for Daily Sync Database Operations

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/syncRepository.ts` (627 lines)

**Purpose:** Data access layer for daily sync operations (CRUVA CSV processing). Used by salesService for all database operations per ARCHITECTURE.md Section 4 (Repository Layer).

**Exported Types** (syncRepository.ts:36-83):
```typescript
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

export interface BulkVideoUpsert {
  userId: string;
  videoData: VideoUpsertData;
}

export interface SyncUserData {
  id: string;
  currentTier: string;
}

export interface CompletedMissionData {
  missionProgressId: string;
  userId: string;
  missionId: string;
  rewardId: string;
  currentTier: string;  // From users table JOIN - for tier_at_claim
}

export interface SyncLogInput {
  source: 'auto' | 'manual';
  fileName?: string;
  triggeredBy?: string;
}
```

**syncRepository Functions (12 total):**
| # | Function | Line | Signature | Purpose |
|---|----------|------|-----------|---------|
| 1 | `upsertVideo` | 101 | `(clientId, userId, videoData): Promise<string>` | Upsert video using video_url as unique key |
| 2 | `bulkUpsertVideos` | 149 | `(clientId, videos[]): Promise<{inserted, updated}>` | Batch upsert for efficiency |
| 3 | `findUserByTiktokHandle` | 201 | `(clientId, handle): Promise<SyncUserData \| null>` | Lookup user for CSV row processing |
| 4 | `createUserFromCruva` | 240 | `(clientId, handle, postDate): Promise<string>` | Auto-create user with tier='tier_1' |
| 5 | `updatePrecomputedFields` | 284 | `(clientId, userIds?): Promise<void>` | RPC call to update 16 user fields |
| 6 | `updateLeaderboardRanks` | 313 | `(clientId): Promise<void>` | RPC call for ROW_NUMBER() ranks |
| 7 | `updateMissionProgress` | 337 | `(clientId, userIds[]): Promise<number>` | RPC call to update current_value |
| 8 | `createMissionProgressForEligibleUsers` | 381 | `(clientId): Promise<number>` | RPC call to create mission_progress rows |
| 9 | `findNewlyCompletedMissions` | 406 | `(clientId): Promise<CompletedMissionData[]>` | Find missions ready for redemption |
| 10 | `createRedemptionForCompletedMission` | 479 | `(clientId, data): Promise<string>` | Create redemption with status='claimable' |
| 11 | `createSyncLog` | 544 | `(clientId, input): Promise<string>` | Create sync_log entry |
| 12 | `updateSyncLog` | 577 | `(syncLogId, status, count, error?): Promise<void>` | Update sync_log status |
| 13 | `applyPendingSalesAdjustments` | 609 | `(clientId): Promise<number>` | RPC call for sales adjustments |

**Multi-tenant Filters (All functions filter by client_id):**
| Function | Line | Filter |
|----------|------|--------|
| `upsertVideo` | 112 | `client_id: clientId` (INSERT) |
| `bulkUpsertVideos` | 156 | `client_id: clientId` (INSERT) |
| `findUserByTiktokHandle` | 213 | `.eq('client_id', clientId)` |
| `createUserFromCruva` | 257 | `client_id: clientId` (INSERT) |
| `updatePrecomputedFields` | 291 | `p_client_id: clientId` (RPC param) |
| `updateLeaderboardRanks` | 320 | `p_client_id: clientId` (RPC param) |
| `updateMissionProgress` | 350 | `p_client_id: clientId` (RPC param) |
| `createMissionProgressForEligibleUsers` | 388 | `p_client_id: clientId` (RPC param) |
| `findNewlyCompletedMissions` | 430 | `.eq('client_id', clientId)` |
| `createRedemptionForCompletedMission` | 497 | `client_id: clientId` (INSERT) |
| `createSyncLog` | 556 | `client_id: clientId` (INSERT) |
| `updateSyncLog` | 590 | `.eq('id', syncLogId)` |
| `applyPendingSalesAdjustments` | 618 | `p_client_id: clientId` (RPC param) |

**RPC Functions Used:**
| Repository Function | RPC Name | Migration File |
|---------------------|----------|----------------|
| `updatePrecomputedFields` | `update_precomputed_fields` | 20251211_add_phase8_rpc_functions.sql |
| `updateLeaderboardRanks` | `update_leaderboard_ranks` | 20251211_add_phase8_rpc_functions.sql |
| `applyPendingSalesAdjustments` | `apply_pending_sales_adjustments` | 20251211_add_phase8_rpc_functions.sql |
| `updateMissionProgress` | `update_mission_progress` | 20251212_add_update_mission_progress_rpc.sql |
| `createMissionProgressForEligibleUsers` | `create_mission_progress_for_eligible_users` | 20251212_add_create_mission_progress_rpc.sql |

---

### Task 8.2.3-rpc: Phase 8 RPC Migration for Bulk Operations

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251211_add_phase8_rpc_functions.sql` (225 lines)

**Purpose:** PostgreSQL RPC functions for O(1) bulk UPDATE operations during daily automation. All functions are vip_metric aware and enforce multi-tenant isolation.

**Functions Overview:**
| Function | Line | Signature | Returns |
|----------|------|-----------|---------|
| `update_precomputed_fields` | 18 | `(p_client_id UUID, p_user_ids UUID[] DEFAULT NULL)` | `INTEGER` |
| `update_leaderboard_ranks` | 120 | `(p_client_id UUID)` | `VOID` |
| `apply_pending_sales_adjustments` | 171 | `(p_client_id UUID)` | `INTEGER` |

**Security & Multi-tenancy:**
| Requirement | Implementation | Lines |
|-------------|----------------|-------|
| SECURITY DEFINER | All 3 functions | 24, 125, 176 |
| GRANT EXECUTE to service_role | All 3 functions | 113, 163, 224 |
| client_id filter | WHERE clauses | 51, 69, 87, 145, 148, 155, 158, 189, 195, 205, 211, 216 |

**vip_metric Validation (RAISE EXCEPTION if NULL/invalid):**
```sql
-- Lines 34-35, 134-135 (functions 1 & 2)
IF v_vip_metric IS NULL OR v_vip_metric NOT IN ('sales', 'units') THEN
  RAISE EXCEPTION 'Client % has NULL or invalid vip_metric: %', p_client_id, v_vip_metric;
END IF;
```

**Function 1: update_precomputed_fields** (lines 18-111)

Updates 13 precomputed fields on users table:
| Field | Aggregation |
|-------|-------------|
| `total_sales` | `SUM(gmv)` from all videos |
| `total_units` | `SUM(units_sold)` from all videos |
| `checkpoint_sales_current` | `SUM(gmv)` since tier_achieved_at |
| `checkpoint_units_current` | `SUM(units_sold)` since tier_achieved_at |
| `checkpoint_videos_posted` | `COUNT(*)` since tier_achieved_at |
| `checkpoint_total_views` | `SUM(views)` since tier_achieved_at |
| `checkpoint_total_likes` | `SUM(likes)` since tier_achieved_at |
| `checkpoint_total_comments` | `SUM(comments)` since tier_achieved_at |
| `projected_tier_at_checkpoint` | Highest tier where threshold met (vip_metric aware) |
| `next_tier_name` | Next tier's name |
| `next_tier_threshold` | Next tier's sales_threshold |
| `next_tier_threshold_units` | Next tier's units_threshold |
| `checkpoint_progress_updated_at` | `NOW()` |

**vip_metric Branching** (lines 63-64):
```sql
(v_vip_metric = 'sales' AND u.checkpoint_sales_current >= COALESCE(t.sales_threshold, 0))
OR (v_vip_metric = 'units' AND u.checkpoint_units_current >= COALESCE(t.units_threshold, 0))
```

**Function 2: update_leaderboard_ranks** (lines 120-161)

Calculates leaderboard ranks using ROW_NUMBER():
```sql
-- vip_metric = 'units' (line 143)
ROW_NUMBER() OVER (ORDER BY total_units DESC) as rank

-- vip_metric = 'sales' (line 153)
ROW_NUMBER() OVER (ORDER BY total_sales DESC) as rank
```

**Function 3: apply_pending_sales_adjustments** (lines 171-222)

Atomically applies pending sales_adjustments:
1. Updates `total_sales` and `manual_adjustments_total` from `amount` field
2. Updates `total_units` and `manual_adjustments_units` from `amount_units` field
3. Marks adjustments as applied (`applied_at = NOW()`)

**Call Sequence (per RPCMigrationFixIMPL.md):**
```
1. applyPendingSalesAdjustments()  ← MUST be first (adjusts totals)
2. updatePrecomputedFields()       ← Uses adjusted totals
3. updateLeaderboardRanks()        ← Uses updated totals
```

---

### Task 8.2.4: Daily Automation Route

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts` (227 lines)

**Route Handler** (route.ts:69-117):
```typescript
export const GET = withCronAuth(async () => {
  const timestamp = new Date().toISOString();

  console.log(`[DailyAutomation] Starting cron job at ${timestamp}`);

  // Step 1: Get client ID from environment (MVP single-client pattern)
  const clientId = process.env.CLIENT_ID;

  if (!clientId) {
    console.error('[DailyAutomation] CLIENT_ID environment variable not configured');
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration Error',
        code: 'CLIENT_ID_NOT_CONFIGURED',
        timestamp,
      } as CronErrorResponse,
      { status: 500 }
    );
  }

  try {
    // Step 2: Execute daily sales sync
    console.log(`[DailyAutomation] Processing daily sales for client: ${clientId}`);
    const result = await processDailySales(clientId);

    // Step 3: Handle success or partial failure
    if (result.success) {
      console.log(
        `[DailyAutomation] Completed successfully: ${result.recordsProcessed} records, ` +
          `${result.usersUpdated} users updated, ${result.newUsersCreated} new users, ` +
          `${result.missionsUpdated} missions, ${result.redemptionsCreated} redemptions`
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Daily automation completed successfully',
          data: {
            recordsProcessed: result.recordsProcessed,
            usersUpdated: result.usersUpdated,
            newUsersCreated: result.newUsersCreated,
            missionsUpdated: result.missionsUpdated,
            redemptionsCreated: result.redemptionsCreated,
          },
          timestamp,
        } as CronSuccessResponse,
        { status: 200 }
      );
    }
```

**Partial Failure Handler** (route.ts:118-144):
```typescript
    } else {
      // Partial failure - some records processed but errors occurred
      console.error(
        `[DailyAutomation] Completed with errors: ${result.recordsProcessed} records processed, ` +
          `${result.errors.length} errors`
      );

      // Send admin alert for partial failure (Task 8.2.5)
      const alertType = determineAlertType('PARTIAL_FAILURE', result.errors[0]);
      await sendAdminAlert({
        type: alertType,
        errorMessage: 'Daily automation completed with errors',
        details: result.errors.slice(0, 5),
        timestamp,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Daily automation completed with errors',
          code: 'PARTIAL_FAILURE',
          details: result.errors.slice(0, 10), // Limit to first 10 errors
          timestamp,
        } as CronErrorResponse,
        { status: 500 }
      );
    }
```

**Unexpected Error Handler** (route.ts:145-168):
```typescript
  } catch (error) {
    // Step 4: Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DailyAutomation] Unexpected error: ${errorMessage}`);

    // Send admin alert for unexpected error (Task 8.2.5)
    const alertType = determineAlertType('UNEXPECTED_ERROR', errorMessage);
    await sendAdminAlert({
      type: alertType,
      errorMessage: errorMessage,
      timestamp,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        code: 'UNEXPECTED_ERROR',
        details: [errorMessage],
        timestamp,
      } as CronErrorResponse,
      { status: 500 }
    );
  }
});
```

**Response Codes:**
| Status | Code | Returned At |
|--------|------|-------------|
| 200 | - | route.ts:103-117 (success) |
| 401 | INVALID_CRON_SECRET | cronAuth.ts:96-103 (via withCronAuth) |
| 500 | CLIENT_ID_NOT_CONFIGURED | route.ts:79-87 |
| 500 | PARTIAL_FAILURE | route.ts:134-143 |
| 500 | UNEXPECTED_ERROR | route.ts:158-167 |

---

### Task 8.2.5: Error Monitoring (Admin Alerts)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/utils/alertService.ts` (353 lines)

**Type Definitions** (alertService.ts:26-50):
```typescript
export type AlertType =
  | 'CRON_FAILURE'
  | 'CRUVA_LOGIN_FAILURE'
  | 'CRUVA_DOWNLOAD_FAILURE'
  | 'CSV_PARSE_FAILURE'
  | 'DATABASE_ERROR';

export interface AdminAlertParams {
  type: AlertType;
  errorMessage: string;
  details?: string[];
  timestamp: string;
}

export interface AlertResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

**sendAdminAlert Function** (alertService.ts:264-317):
```typescript
export async function sendAdminAlert(params: AdminAlertParams): Promise<AlertResult> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  // If admin email not configured, log and return (don't block cron)
  if (!adminEmail) {
    console.warn('[AlertService] ADMIN_ALERT_EMAIL not configured - skipping alert');
    return {
      success: false,
      error: 'ADMIN_ALERT_EMAIL not configured',
    };
  }

  // If Resend API key not configured, log and return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[AlertService] RESEND_API_KEY not configured - skipping alert');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    };
  }

  try {
    console.log(`[AlertService] Sending ${params.type} alert to ${adminEmail}`);

    const { data, error } = await resend.emails.send({
      from: 'Rumi Alerts <onboarding@resend.dev>', // Use Resend test domain
      to: adminEmail,
      subject: `[ALERT] Automation Failure: ${params.type}`,
      html: formatAlertEmailHtml(params),
      text: formatAlertEmailText(params),
    });

    if (error) {
      console.error('[AlertService] Failed to send alert:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[AlertService] Alert sent successfully: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AlertService] Unexpected error sending alert:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

**determineAlertType Function** (alertService.ts:322-353):
```typescript
export function determineAlertType(errorCode?: string, errorMessage?: string): AlertType {
  if (!errorCode && !errorMessage) {
    return 'CRON_FAILURE';
  }

  const code = errorCode?.toLowerCase() ?? '';
  const message = errorMessage?.toLowerCase() ?? '';

  if (code.includes('login') || message.includes('login') || message.includes('authentication')) {
    return 'CRUVA_LOGIN_FAILURE';
  }

  if (code.includes('download') || message.includes('download') || message.includes('cruva')) {
    return 'CRUVA_DOWNLOAD_FAILURE';
  }

  if (code.includes('parse') || message.includes('parse') || message.includes('csv')) {
    return 'CSV_PARSE_FAILURE';
  }

  if (
    code.includes('database') ||
    code.includes('db') ||
    message.includes('database') ||
    message.includes('supabase') ||
    message.includes('constraint')
  ) {
    return 'DATABASE_ERROR';
  }

  return 'CRON_FAILURE';
}
```

**Alert Type Mapping** (alertService.ts:55-93, 98-139):
| Type | getLikelyCauses() | getActionSteps() |
|------|-------------------|------------------|
| CRUVA_LOGIN_FAILURE | lines 57-63 | lines 102-108 |
| CRUVA_DOWNLOAD_FAILURE | lines 64-70 | lines 109-115 |
| CSV_PARSE_FAILURE | lines 71-77 | lines 116-122 |
| DATABASE_ERROR | lines 78-84 | lines 123-129 |
| CRON_FAILURE | lines 85-91 | lines 130-137 |

---

### Task 8.2.3c: Redemption Creation (Bug Fix)

**Bug Fixed:** TierAtClaimLookup (BUG-008)
- **Documentation:** `BugFixes/TierAtClaimLookupFix.md`, `BugFixes/TierAtClaimLookupFixIMPL.md`

**createRedemptionsForCompletedMissions** (salesService.ts:327-354):
```typescript
export async function createRedemptionsForCompletedMissions(
  clientId: string,
  errors?: string[]
): Promise<number> {
  let redemptionsCreated = 0;
  const completedMissions = await syncRepository.findNewlyCompletedMissions(clientId);

  for (const mission of completedMissions) {
    try {
      // Use mission.currentTier from findNewlyCompletedMissions JOIN (TierAtClaimLookupFix.md)
      await syncRepository.createRedemptionForCompletedMission(clientId, {
        userId: mission.userId,
        missionProgressId: mission.missionProgressId,
        rewardId: mission.rewardId,
        tierAtClaim: mission.currentTier,
      });
      redemptionsCreated++;
    } catch (redemptionError) {
      const errorMsg = redemptionError instanceof Error ? redemptionError.message : String(redemptionError);
      if (errors) {
        errors.push(`Redemption creation failed for mission ${mission.missionId}: ${errorMsg}`);
      }
      console.error(`[SalesService] Redemption creation failed: ${errorMsg}`);
    }
  }

  return redemptionsCreated;
}
```

**findNewlyCompletedMissions Query with Multi-tenant Filter** (syncRepository.ts:363-379):
```typescript
    const { data, error } = await supabase
      .from('mission_progress')
      .select(`
        id,
        user_id,
        mission_id,
        missions!inner (
          reward_id
        ),
        users!inner (
          current_tier
        )
      `)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .is('completed_at', null)
      .eq('users.client_id', clientId); // AUDIT FIX: Multi-tenant filter on joined users table
```

**Multi-tenant Filters Present:**
- `syncRepository.ts:376` - `.eq('client_id', clientId)` on mission_progress
- `syncRepository.ts:379` - `.eq('users.client_id', clientId)` on joined users table (defense-in-depth)
- `syncRepository.ts:395` - `.eq('client_id', clientId)` on redemptions check

---

### Task 8.2.x: Mission Progress Row Creation (GAP-MISSION-PROGRESS-ROWS)

**Gap Fixed:** GAP-MISSION-PROGRESS-ROWS
- **Documentation:** `BugFixes/MissionProgressRowCreationGap.md`, `BugFixes/MissionProgressRowCreationGapIMPL.md`

**Problem:** No code existed to create `mission_progress` rows. The system assumed rows existed but never created them. Without rows, `updateMissionProgress` RPC had nothing to update.

**Solution:** New Step 5.5 in salesService.ts that calls `createMissionProgressForEligibleUsers()` RPC before Step 6 (update).

**Step 5.5 in salesService.ts** (salesService.ts:195-207):
```typescript
    // Step 5.5: Create mission_progress rows for eligible users (GAP-MISSION-PROGRESS-ROWS)
    console.log('[SalesService] Step 5.5: Creating mission progress rows for eligible users...');
    let missionRowsCreated = 0;
    try {
      missionRowsCreated = await syncRepository.createMissionProgressForEligibleUsers(clientId);
      if (missionRowsCreated > 0) {
        console.log(`[SalesService] Created ${missionRowsCreated} mission progress rows`);
      }
    } catch (createError) {
      // Non-fatal: Log error, continue
      const errorMsg = createError instanceof Error ? createError.message : String(createError);
      console.warn(`[SalesService] Mission progress row creation failed (non-fatal): ${errorMsg}`);
    }
```

**Repository Function** (syncRepository.ts:381-396):
```typescript
  async createMissionProgressForEligibleUsers(
    clientId: string
  ): Promise<number> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc(
      'create_mission_progress_for_eligible_users',
      { p_client_id: clientId }
    );

    if (error) {
      throw new Error(`Failed to create mission progress rows: ${error.message}`);
    }

    return data ?? 0;
  },
```

**RPC Function** (20251212_add_create_mission_progress_rpc.sql:11-62):
```sql
CREATE OR REPLACE FUNCTION create_mission_progress_for_eligible_users(
  p_client_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_count INTEGER := 0;
BEGIN
  INSERT INTO mission_progress (
    client_id, mission_id, user_id, current_value, status,
    checkpoint_start, checkpoint_end, created_at, updated_at
  )
  SELECT
    p_client_id, m.id, u.id, 0,
    CASE WHEN m.activated THEN 'active' ELSE 'dormant' END,
    u.tier_achieved_at, u.next_checkpoint_at, NOW(), NOW()
  FROM missions m
  CROSS JOIN users u
  LEFT JOIN tiers ut ON u.current_tier = ut.tier_id AND ut.client_id = p_client_id
  LEFT JOIN tiers mt ON m.tier_eligibility = mt.tier_id AND mt.client_id = p_client_id
  WHERE m.client_id = p_client_id
    AND u.client_id = p_client_id
    AND m.enabled = true
    AND (
      m.tier_eligibility = 'all'
      OR (ut.tier_order IS NOT NULL AND mt.tier_order IS NOT NULL AND ut.tier_order >= mt.tier_order)
    )
    AND NOT EXISTS (
      SELECT 1 FROM mission_progress mp
      WHERE mp.mission_id = m.id AND mp.user_id = u.id AND mp.client_id = p_client_id
    );

  GET DIAGNOSTICS v_created_count = ROW_COUNT;
  RETURN v_created_count;
END;
$$;
```

**Tier Eligibility Logic:**
| tier_eligibility Value | Behavior |
|------------------------|----------|
| `'all'` | ALL users get mission_progress rows (for raffles, universal missions) |
| `'tier_2'` | Only users with tier_order >= tier_2's tier_order |
| `'tier_3'` | Only users with tier_order >= tier_3's tier_order |

**Multi-tenant Filters (6 total):**
- Line 44: `ut.client_id = p_client_id` (user tier join)
- Line 45: `mt.client_id = p_client_id` (mission tier join)
- Line 46: `m.client_id = p_client_id` (missions)
- Line 47: `u.client_id = p_client_id` (users)
- Line 57: `mp.client_id = p_client_id` (NOT EXISTS subquery)
- Line 33: `p_client_id` in INSERT values

---

### Task 8.2.x: Mission Progress Update (BUG-MISSION-PROGRESS-UPDATE)

**Bug Fixed:** BUG-MISSION-PROGRESS-UPDATE
- **Documentation:** `BugFixes/MissionProgressUpdateFix.md`, `BugFixes/MissionProgressUpdateFixIMPL.md`

**Problem:** `updateMissionProgress` was a stub throwing "Not implemented". Mission progress `current_value` was never updated, missions never completed.

**Solution:** New RPC function that aggregates videos table data within checkpoint window, updates `current_value`, and marks missions as completed when target reached.

**Repository Function** (syncRepository.ts:337-360):
```typescript
  async updateMissionProgress(
    clientId: string,
    userIds: string[]
  ): Promise<number> {
    const supabase = createAdminClient();

    // Per Codex audit: empty/null userIds means "update all users for this client"
    // RPC handles this internally with conditional logic
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

**RPC Function - Value Update** (20251212_add_update_mission_progress_rpc.sql:24-78):
```sql
  UPDATE mission_progress mp
  SET
    current_value = CASE m.mission_type
      WHEN 'sales_dollars' THEN (
        SELECT COALESCE(SUM(v.gmv), 0)::INTEGER FROM videos v
        WHERE v.user_id = mp.user_id AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start AND v.post_date < mp.checkpoint_end
      )
      WHEN 'sales_units' THEN (
        SELECT COALESCE(SUM(v.units_sold), 0) FROM videos v
        WHERE v.user_id = mp.user_id AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start AND v.post_date < mp.checkpoint_end
      )
      WHEN 'videos' THEN (
        SELECT COUNT(*)::INTEGER FROM videos v
        WHERE v.user_id = mp.user_id AND v.client_id = p_client_id
          AND v.post_date >= mp.checkpoint_start AND v.post_date < mp.checkpoint_end
      )
      WHEN 'views' THEN (
        SELECT COALESCE(SUM(v.views), 0)::INTEGER FROM videos v ...
      )
      WHEN 'likes' THEN (
        SELECT COALESCE(SUM(v.likes), 0)::INTEGER FROM videos v ...
      )
      ELSE mp.current_value
    END,
    updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.client_id = p_client_id
    AND m.client_id = p_client_id
    AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
    AND mp.status = 'active'
    AND m.enabled = true AND m.activated = true;
```

**RPC Function - Completion Detection** (20251212_add_update_mission_progress_rpc.sql:82-97):
```sql
  UPDATE mission_progress mp
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  FROM missions m
  WHERE mp.mission_id = m.id
    AND mp.client_id = p_client_id
    AND m.client_id = p_client_id
    AND (p_user_ids IS NULL OR mp.user_id = ANY(p_user_ids))
    AND mp.status = 'active'
    AND m.enabled = true AND m.activated = true
    AND COALESCE(m.target_value, 0) > 0
    AND mp.current_value >= m.target_value;
```

**Mission Type Aggregations:**
| mission_type | Aggregation | Source Column |
|--------------|-------------|---------------|
| `sales_dollars` | `SUM(gmv)` | videos.gmv |
| `sales_units` | `SUM(units_sold)` | videos.units_sold |
| `videos` | `COUNT(*)` | videos (row count) |
| `views` | `SUM(views)` | videos.views |
| `likes` | `SUM(likes)` | videos.likes |

**Checkpoint Window Filter:**
- `v.post_date >= mp.checkpoint_start` - Videos posted on or after checkpoint start
- `v.post_date < mp.checkpoint_end` - Videos posted before checkpoint end (exclusive)

**Completion Logic:**
- `mp.current_value >= m.target_value` → `status = 'completed'`, `completed_at = NOW()`
- Only active missions with `target_value > 0` are evaluated

---

### Environment Variables Required

| Variable | Purpose | Used At |
|----------|---------|---------|
| `CLIENT_ID` | MVP single-client identifier | route.ts:75 |
| `CRON_SECRET` | Vercel cron authentication | cronAuth.ts:38 |
| `RESEND_API_KEY` | Email sending via Resend | alertService.ts:21, 277 |
| `ADMIN_ALERT_EMAIL` | Alert recipient email | alertService.ts:265 |

---

### Verification Commands

**Test 1: Route handler exists at documented line**
```bash
grep -n "export const GET = withCronAuth" appcode/app/api/cron/daily-automation/route.ts
# Expected: 69:export const GET = withCronAuth(async () => {
```

**Test 2: sendAdminAlert function at documented line**
```bash
grep -n "export async function sendAdminAlert" appcode/lib/utils/alertService.ts
# Expected: 264:export async function sendAdminAlert(params: AdminAlertParams): Promise<AlertResult> {
```

**Test 3: Multi-tenant filter present**
```bash
grep -n "users.client_id" appcode/lib/repositories/syncRepository.ts
# Expected: 379:      .eq('users.client_id', clientId); // AUDIT FIX: Multi-tenant filter on joined users table
```

**Test 4: createRedemptionsForCompletedMissions at documented line**
```bash
grep -n "export async function createRedemptionsForCompletedMissions" appcode/lib/services/salesService.ts
# Expected: 341:export async function createRedemptionsForCompletedMissions(
```

**Test 5: createMissionProgressForEligibleUsers at documented line (GAP-MISSION-PROGRESS-ROWS)**
```bash
grep -n "async createMissionProgressForEligibleUsers" appcode/lib/repositories/syncRepository.ts
# Expected: 381:  async createMissionProgressForEligibleUsers(
```

**Test 6: updateMissionProgress RPC call at documented line (BUG-MISSION-PROGRESS-UPDATE)**
```bash
grep -n "async updateMissionProgress" appcode/lib/repositories/syncRepository.ts
# Expected: 337:  async updateMissionProgress(
```

**Test 7: Step 5.5 exists in salesService**
```bash
grep -n "Step 5.5" appcode/lib/services/salesService.ts
# Expected: 195:    // Step 5.5: Create mission_progress rows
```

**Test 8: Mission progress RPC functions exist in Supabase types**
```bash
grep -n "create_mission_progress_for_eligible_users\|update_mission_progress" appcode/lib/types/database.ts | head -4
# Expected: Both RPC functions appear in generated types
```

---

## Step 8.3 - Tier Calculation

**Status:** Partially Complete (Tasks 8.3.0a, 8.3.1, 8.3.1a-c DONE)
**Pending:** Tasks 8.3.2-8.3.4 (Integration, Notifications, Raffle Calendar)

### Database Tables Used

| Table | SchemaFinalv2.md | Purpose |
|-------|------------------|---------|
| `users` | lines 123-155 | User tier fields, checkpoint values |
| `tiers` | lines 254-272 | Tier thresholds for comparison |
| `tier_checkpoints` | lines 293-312 | Checkpoint evaluation audit log |
| `clients` | lines 106-120 | vip_metric and checkpoint_months config |

### Function Call Chain

```
runCheckpointEvaluation(clientId) (tierCalculationService.ts:129)
  ├─→ syncRepository.applyPendingSalesAdjustments() (syncRepository.ts:108)
  │
  ├─→ tierRepository.getUsersDueForCheckpoint() (tierRepository.ts:401)
  │   └─→ Query: users WHERE next_checkpoint_at <= TODAY AND current_tier != 'tier_1'
  │
  ├─→ tierRepository.getTierThresholdsForCheckpoint() (tierRepository.ts:477)
  │   └─→ Query: tiers ORDER BY tier_order DESC
  │
  ├─→ For each user:
  │   ├─→ calculateCheckpointValue(user) (tierCalculationService.ts:80)
  │   ├─→ findHighestQualifyingTier(value, thresholds) (tierCalculationService.ts:100)
  │   ├─→ determineStatus(oldOrder, newOrder) (tierCalculationService.ts:61)
  │   ├─→ tierRepository.updateUserTierAfterCheckpoint() (tierRepository.ts:518)
  │   └─→ tierRepository.logCheckpointResult() (tierRepository.ts:565)
  │
  └─→ Return RunCheckpointResult
```

---

### Task 8.3.1: Tier Calculation Service

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts` (455 lines)

**Main Export** (tierCalculationService.ts:129-301):
```typescript
export async function runCheckpointEvaluation(
  clientId: string
): Promise<RunCheckpointResult> {
  const results: CheckpointEvaluationResult[] = [];
  const errors: string[] = [];
  let promoted = 0;
  let maintained = 0;
  let demoted = 0;

  // Step 1: Apply pending sales adjustments
  console.log(`[TierCalculation] Step 1: Applying pending sales adjustments for client ${clientId}`);
  let adjustmentsApplied = 0;
  try {
    adjustmentsApplied = await syncRepository.applyPendingSalesAdjustments(clientId);
    console.log(`[TierCalculation] Applied ${adjustmentsApplied} pending adjustments`);
  } catch (error) {
    // Continue with evaluation even if adjustments fail
  }

  // Step 2: Get users due for checkpoint
  let usersDue = await tierRepository.getUsersDueForCheckpoint(clientId);

  // Step 3-7: Process each user (calculate value, find tier, update, log)
  // ...
}
```

**Result Interface** (tierCalculationService.ts:46-55):
```typescript
export interface RunCheckpointResult {
  success: boolean;
  adjustmentsApplied: number;
  usersEvaluated: number;
  promoted: number;
  maintained: number;
  demoted: number;
  results: CheckpointEvaluationResult[];
  errors: string[];
}
```

**determineStatus Function** (tierCalculationService.ts:61-71):
```typescript
function determineStatus(
  oldTierOrder: number,
  newTierOrder: number
): 'maintained' | 'promoted' | 'demoted' {
  if (newTierOrder > oldTierOrder) {
    return 'promoted';
  } else if (newTierOrder < oldTierOrder) {
    return 'demoted';
  }
  return 'maintained';
}
```

**calculateCheckpointValue Function** (tierCalculationService.ts:80-87):
```typescript
function calculateCheckpointValue(user: CheckpointUserData): number {
  if (user.vipMetric === 'units') {
    // Units mode: checkpoint units + manual adjustments
    return user.checkpointUnitsCurrent + user.manualAdjustmentsUnits;
  }
  // Sales mode: checkpoint sales + manual adjustments
  return user.checkpointSalesCurrent + user.manualAdjustmentsTotal;
}
```

---

### Task 8.3.0a: Checkpoint Repository Functions

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts` (755 lines)

**Checkpoint Types** (tierRepository.ts:102-158):
```typescript
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

export interface TierThreshold {
  tierId: string;
  tierName: string;
  tierOrder: number;
  threshold: number;
}

export interface CheckpointLogData {
  userId: string;
  checkpointDate: string;
  periodStartDate: string;
  periodEndDate: string;
  salesInPeriod: number | null;
  unitsInPeriod: number | null;
  salesRequired: number | null;
  unitsRequired: number | null;
  tierBefore: string;
  tierAfter: string;
  status: 'maintained' | 'promoted' | 'demoted';
}
```

**getUsersDueForCheckpoint** (tierRepository.ts:416-489):
```typescript
async getUsersDueForCheckpoint(clientId: string): Promise<CheckpointUserData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      current_tier,
      checkpoint_sales_current,
      checkpoint_units_current,
      manual_adjustments_total,
      manual_adjustments_units,
      tier_achieved_at,
      next_checkpoint_at,
      clients!inner (
        vip_metric,
        checkpoint_months
      )
    `)
    .eq('client_id', clientId)               // ⚠️ Multi-tenant filter
    .neq('current_tier', 'tier_1')           // Bronze tier exempt
    .lte('next_checkpoint_at', new Date().toISOString().split('T')[0]); // <= TODAY
```

**getTierThresholdsForCheckpoint** (tierRepository.ts:477-503):
```typescript
async getTierThresholdsForCheckpoint(
  clientId: string,
  vipMetric: 'sales' | 'units'
): Promise<TierThreshold[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tiers')
    .select('tier_id, tier_name, tier_order, sales_threshold, units_threshold')
    .eq('client_id', clientId)               // ⚠️ Multi-tenant filter
    .order('tier_order', { ascending: false }); // Highest tier first

  return (data || []).map((tier) => ({
    tierId: tier.tier_id,
    tierName: tier.tier_name,
    tierOrder: tier.tier_order,
    threshold: vipMetric === 'units'
      ? (tier.units_threshold ?? 0)
      : (tier.sales_threshold ?? 0),
  }));
}
```

**updateUserTierAfterCheckpoint** (tierRepository.ts:518-552):
```typescript
async updateUserTierAfterCheckpoint(
  clientId: string,
  userId: string,
  data: CheckpointUpdateData
): Promise<void> {
  const supabase = await createClient();

  const now = new Date();
  const nextCheckpoint = new Date(now);
  nextCheckpoint.setMonth(nextCheckpoint.getMonth() + data.checkpointMonths);

  const updateData: Record<string, unknown> = {
    current_tier: data.newTier,
    next_checkpoint_at: nextCheckpoint.toISOString(),
    // Reset BOTH checkpoint totals
    checkpoint_sales_current: 0,
    checkpoint_units_current: 0,
  };

  // Only update tier_achieved_at if tier changed
  if (data.tierChanged) {
    updateData.tier_achieved_at = now.toISOString();
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .eq('client_id', clientId);              // ⚠️ Multi-tenant filter
}
```

**logCheckpointResult** (tierRepository.ts:565-596):
```typescript
async logCheckpointResult(
  clientId: string,
  data: CheckpointLogData
): Promise<string> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('tier_checkpoints')
    .insert({
      client_id: clientId,                   // ⚠️ Multi-tenant field
      user_id: data.userId,
      checkpoint_date: data.checkpointDate,
      period_start_date: data.periodStartDate,
      period_end_date: data.periodEndDate,
      sales_in_period: data.salesInPeriod,
      units_in_period: data.unitsInPeriod,
      sales_required: data.salesRequired,
      units_required: data.unitsRequired,
      tier_before: data.tierBefore,
      tier_after: data.tierAfter,
      status: data.status,
    })
    .select('id')
    .single();

  return result.id;
}
```

---

### Multi-Tenant Filters Summary (Step 8.3)

| Function | File:Line | Filter |
|----------|-----------|--------|
| `getUsersDueForCheckpoint` | tierRepository.ts:422 | `.eq('client_id', clientId)` |
| `getTierThresholdsForCheckpoint` | tierRepository.ts:486 | `.eq('client_id', clientId)` |
| `updateUserTierAfterCheckpoint` | tierRepository.ts:546 | `.eq('client_id', clientId)` |
| `logCheckpointResult` | tierRepository.ts:574 | `client_id: clientId` (INSERT) |

---

### Verification Commands (Step 8.3)

**Test 1: runCheckpointEvaluation at documented line**
```bash
grep -n "export async function runCheckpointEvaluation" appcode/lib/services/tierCalculationService.ts
# Expected: 129:export async function runCheckpointEvaluation(
```

**Test 2: Checkpoint repository functions at documented lines**
```bash
grep -n "async getUsersDueForCheckpoint\|async getTierThresholdsForCheckpoint\|async updateUserTierAfterCheckpoint\|async logCheckpointResult" appcode/lib/repositories/tierRepository.ts
# Expected: 401, 477, 518, 565
```

**Test 3: Multi-tenant filters present**
```bash
grep -n "eq('client_id'" appcode/lib/repositories/tierRepository.ts | grep -E "(401|477|518|565)" -A5
# Expected: client_id filter in each checkpoint function
```

---

## Step 8.3b - Real-Time Promotion (BUG-REALTIME-PROMOTION)

**Status:** Complete
**Bug Reference:** BUG-REALTIME-PROMOTION in `/home/jorge/Loyalty/Rumi/BugFixes/RealTimePromotionFix.md`
**Implementation Plan:** `/home/jorge/Loyalty/Rumi/BugFixes/RealTimePromotionFixIMPL.md`

### Problem Solved

Users who exceeded tier thresholds were NOT promoted until their next checkpoint (every 3 months). A Bronze user selling 1500 units (Gold threshold: 1000) would stay Bronze for 90 days.

**Root Cause:** Checkpoint evaluation only runs for users WHERE `next_checkpoint_at <= TODAY AND current_tier != 'tier_1'`. Bronze users were never evaluated.

**Solution:** Add `checkForPromotions()` that runs BEFORE checkpoint evaluation, checks ALL users (including Bronze) against tier thresholds.

### Function Call Chain

```
Daily Cron (route.ts:88)
  └─ processDailySales()                          # Step 2: Data sync
  └─ checkForPromotions(clientId)                 # Step 3: Real-time promotion (NEW)
  │   ├─→ getUsersForPromotionCheck()             # tierRepository.ts:622
  │   ├─→ promoteUserToTier() per candidate       # tierRepository.ts:718
  │   └─→ logCheckpointResult() with status='promoted'  # tierRepository.ts:565
  └─ runCheckpointEvaluation(clientId)            # Step 4: Checkpoint maintenance
```

### New Types (tierRepository.ts)

**PromotionCandidate** (tierRepository.ts:154-163):
```typescript
export interface PromotionCandidate {
  userId: string;
  currentTier: string;
  currentTierOrder: number;
  qualifiesForTier: string;
  qualifiesForTierOrder: number;
  totalValue: number;
  threshold: number;
  tierAchievedAt: string;
}
```

### New Types (tierCalculationService.ts)

**PromotionCheckResult** (tierCalculationService.ts:63-73):
```typescript
export interface PromotionCheckResult {
  success: boolean;
  usersChecked: number;
  usersPromoted: number;
  promotions: Array<{
    userId: string;
    fromTier: string;
    toTier: string;
    totalValue: number;
  }>;
  errors: string[];
}
```

### New Repository Functions (tierRepository.ts)

**getUsersForPromotionCheck** (tierRepository.ts:622-702):
```typescript
async getUsersForPromotionCheck(clientId: string): Promise<PromotionCandidate[]> {
  const supabase = await createClient();

  // Get all users with their current tier
  const { data: users, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      current_tier,
      total_sales,
      total_units,
      tier_achieved_at
    `)
    .eq('client_id', clientId);           // ⚠️ Multi-tenant filter

  // Get client's VIP metric setting
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('vip_metric')
    .eq('id', clientId)                   // ⚠️ Multi-tenant filter
    .single();

  // Get tier thresholds sorted by tier_order DESC (highest first)
  const { data: tiers, error: tierError } = await supabase
    .from('tiers')
    .select('tier_id, tier_order, sales_threshold, units_threshold')
    .eq('client_id', clientId)            // ⚠️ Multi-tenant filter
    .order('tier_order', { ascending: false });

  // For each user, find highest qualifying tier they exceed
  for (const user of users || []) {
    const userValue = vipMetric === 'units'
      ? (user.total_units ?? 0)
      : (user.total_sales ?? 0);

    // Find highest qualifying tier (tiers sorted DESC by tier_order)
    for (const tier of tiers || []) {
      if (userValue >= threshold && tier.tier_order > currentTierOrder) {
        candidates.push({ /* promotion candidate */ });
        break; // Take highest qualifying tier
      }
    }
  }
  return candidates;
}
```

**Key Logic:** Unlike checkpoint evaluation, this includes ALL users (Bronze included). Returns only users who qualify for a HIGHER tier than current.

**promoteUserToTier** (tierRepository.ts:718-754):
```typescript
async promoteUserToTier(
  clientId: string,
  userId: string,
  newTier: string,
  newTierThreshold: number,
  checkpointMonths: number,
  vipMetric: 'sales' | 'units'
): Promise<void> {
  const supabase = await createClient();

  const now = new Date();
  const nextCheckpoint = new Date(now);
  nextCheckpoint.setMonth(nextCheckpoint.getMonth() + checkpointMonths);

  const updateData: Record<string, unknown> = {
    current_tier: newTier,
    tier_achieved_at: now.toISOString(),
    next_checkpoint_at: nextCheckpoint.toISOString(),
    // Reset checkpoint accumulation
    checkpoint_sales_current: 0,
    checkpoint_units_current: 0,
    // Set target to NEW tier's threshold
    checkpoint_sales_target: vipMetric === 'sales' ? newTierThreshold : null,
    checkpoint_units_target: vipMetric === 'units' ? newTierThreshold : null,
  };

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .eq('client_id', clientId);           // ⚠️ Multi-tenant filter
}
```

**Key Updates on Promotion:**
1. `current_tier` → New tier
2. `tier_achieved_at` → NOW (resets VIP reward usage counts)
3. `next_checkpoint_at` → NOW + checkpoint_months (fresh checkpoint period)
4. `checkpoint_*_target` → NEW tier's threshold (must maintain new level)
5. `checkpoint_*_current` → 0 (reset accumulation)

### New Service Function (tierCalculationService.ts)

**checkForPromotions** (tierCalculationService.ts:336-453):
```typescript
export async function checkForPromotions(
  clientId: string
): Promise<PromotionCheckResult> {
  // 1. Get client settings (checkpoint_months, vip_metric)
  // 2. Get promotion candidates via tierRepository.getUsersForPromotionCheck()
  // 3. For each candidate:
  //    a. Call tierRepository.promoteUserToTier()
  //    b. Call tierRepository.logCheckpointResult() with status='promoted'
  // 4. Return PromotionCheckResult
}
```

### Route Integration (route.ts)

**Import** (route.ts:27):
```typescript
import { runCheckpointEvaluation, checkForPromotions } from '@/lib/services/tierCalculationService';
```

**Call Order** (route.ts:113-126):
```typescript
// Step 3b: Check for real-time promotions (BUG-REALTIME-PROMOTION)
console.log(`[DailyAutomation] Checking for tier promotions`);
const promotionResult = await checkForPromotions(clientId);

if (promotionResult.usersPromoted > 0) {
  console.log(
    `[DailyAutomation] Promoted ${promotionResult.usersPromoted} users to higher tiers`
  );
}

// Step 3c: Run tier checkpoint evaluation (Task 8.3.2)
const tierResult = await runCheckpointEvaluation(clientId);
```

**Response Interface** (route.ts:40-49):
```typescript
tierPromotion: {
  usersChecked: number;
  usersPromoted: number;
  promotions: Array<{
    userId: string;
    fromTier: string;
    toTier: string;
    totalValue: number;
  }>;
};
```

### Multi-Tenant Filters Summary (Step 8.3b)

| Function | File:Line | Filter |
|----------|-----------|--------|
| `getUsersForPromotionCheck` | tierRepository.ts:635 | `.eq('client_id', clientId)` |
| `getUsersForPromotionCheck` | tierRepository.ts:646 | `.eq('id', clientId)` (clients) |
| `getUsersForPromotionCheck` | tierRepository.ts:658 | `.eq('client_id', clientId)` (tiers) |
| `promoteUserToTier` | tierRepository.ts:748 | `.eq('client_id', clientId)` |
| `checkForPromotions` | tierCalculationService.ts:349 | `.eq('id', clientId)` (clients) |

### Verification Commands (Step 8.3b)

**Test 1: checkForPromotions at documented line**
```bash
grep -n "export async function checkForPromotions" appcode/lib/services/tierCalculationService.ts
# Expected: 336:export async function checkForPromotions(
```

**Test 2: Promotion repository functions at documented lines**
```bash
grep -n "async getUsersForPromotionCheck\|async promoteUserToTier" appcode/lib/repositories/tierRepository.ts
# Expected: 622, 718
```

**Test 3: Multi-tenant filters in promotion functions**
```bash
grep -n "eq('client_id'" appcode/lib/repositories/tierRepository.ts | tail -5
# Expected: Lines 635, 658, 748 show client_id filters
```

**Test 4: Route imports both functions**
```bash
grep -n "checkForPromotions" appcode/app/api/cron/daily-automation/route.ts
# Expected: Import at line 27, call at line 124
```

### Bronze Tier Handling

| Operation | Bronze (tier_1) Included? | Why |
|-----------|---------------------------|-----|
| `getUsersForPromotionCheck()` | ✅ YES | Bronze users CAN be promoted to Silver/Gold/Platinum |
| `getUsersDueForCheckpoint()` | ❌ NO | Bronze users cannot be demoted (no tier below) |

**Interaction:** A Bronze user who qualifies for Silver:
1. Gets promoted by `checkForPromotions()` → becomes Silver
2. `tier_achieved_at` set to NOW
3. `next_checkpoint_at` set to NOW + checkpoint_months
4. At next checkpoint, evaluated by `runCheckpointEvaluation()` for Silver maintenance

---

## Task 8.3.3 - Tier Change Notifications

**Status:** Complete
**File:** `lib/utils/notificationService.ts` (370 lines)
**References:** EXECUTION_PLAN.md Task 8.3.3, Loyalty.md Flow 7 lines 1606-1610

### Problem Solved

Users were not notified when their tier changed. Both promotion (congratulations) and demotion (encouragement) emails needed to be sent.

**Dual Sources:** Tier changes occur in TWO places:
1. `checkForPromotions()` → promotions only (real-time threshold check)
2. `runCheckpointEvaluation()` → promotions AND demotions (checkpoint maintenance)

### Function Call Chain

```
Daily Cron (route.ts:92)
  └─ checkForPromotions(clientId)              # Step 3b (route.ts:129)
  │   └─► FOR each promotion:
  │       └─ sendTierChangeNotification()      # Step 3b.1 (route.ts:142)
  │           ├─→ supabase.from('users')       # notificationService.ts:98
  │           ├─→ supabase.from('tiers')       # notificationService.ts:126
  │           ├─→ supabase.from('clients')     # notificationService.ts:147
  │           ├─→ buildPromotionEmail()        # notificationService.ts:181
  │           └─→ resend.emails.send()         # notificationService.ts:170
  │
  └─ runCheckpointEvaluation(clientId)         # Step 3c (route.ts:152)
      └─► FOR each change (promoted/demoted):
          └─ sendTierChangeNotification()      # Step 3c.1 (route.ts:174)
              ├─→ (same flow as above)
              └─→ buildDemotionEmail()         # notificationService.ts:242 (if demotion)
```

### Database Tables Used

| Table | Purpose | SchemaFinalv2.md |
|-------|---------|------------------|
| `users` | email, tiktok_handle (line 130), next_tier_threshold (line 146) | Section 2.2 |
| `tiers` | tier_name (line 263) | Section 2.4 |
| `clients` | name (line 112), vip_metric (line 118) | Section 2.1 |

### New File: notificationService.ts

**Purpose:** Send transactional emails to users via Resend (separate from alertService.ts which handles admin alerts).

**Types** (notificationService.ts:21-44):
```typescript
export type TierChangeType = 'promotion' | 'demotion';

export interface TierChangeNotificationParams {
  userId: string;
  fromTier: string;      // tier_id (e.g., 'tier_1')
  toTier: string;        // tier_id (e.g., 'tier_2')
  changeType: TierChangeType;
  totalValue: number;    // total_sales or total_units
  periodStartDate?: string;  // For demotions: tier_achieved_at
  periodEndDate?: string;    // For demotions: next_checkpoint_at
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;     // True if user has no email
}
```

**sendTierChangeNotification** (notificationService.ts:78-169):
```typescript
export async function sendTierChangeNotification(
  clientId: string,
  params: TierChangeNotificationParams
): Promise<NotificationResult> {
  const { userId, fromTier, toTier, changeType, totalValue, periodStartDate, periodEndDate } = params;

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured', skipped: true };
  }

  const supabase = await createClient();

  // Fetch user data
  const { data: userData } = await supabase
    .from('users')
    .select('email, tiktok_handle, next_tier_threshold, next_tier_threshold_units')
    .eq('id', userId)
    .eq('client_id', clientId)             // ⚠️ Multi-tenant filter
    .single();

  // Fetch tier names (old and new)
  const { data: tiersData } = await supabase
    .from('tiers')
    .select('tier_id, tier_name')
    .eq('client_id', clientId)             // ⚠️ Multi-tenant filter
    .in('tier_id', [fromTier, toTier]);

  // Fetch client data
  const { data: clientData } = await supabase
    .from('clients')
    .select('name, vip_metric')
    .eq('id', clientId)                    // ⚠️ Client lookup
    .single();

  // Build email content
  const { subject, html, text } = changeType === 'promotion'
    ? buildPromotionEmail(user, oldTierName, newTierName, totalValue, client)
    : buildDemotionEmail(user, oldTierName, newTierName, totalValue, client, periodStartDate, periodEndDate);

  // Send via Resend
  const { data, error } = await resend.emails.send({
    from: `${client.name} <onboarding@resend.dev>`,
    to: user.email,
    subject, html, text,
  });

  return { success: !error, messageId: data?.id };
}
```

**buildPromotionEmail** (notificationService.ts:181-237):
- Subject: `🎉 You've been promoted to {NewTierName}!`
- Body: Congratulations message with tier progress, new benefits
- Signature: Dynamic `{CompanyName} Team`

**buildDemotionEmail** (notificationService.ts:242-310):
- Subject: `Important: Your tier status has changed`
- Body: Encouragement message with how to level up
- Includes: Checkpoint period dates, threshold to regain tier
- Signature: Dynamic `{CompanyName} Team`

### Route Integration (route.ts)

**Imports** (route.ts:29):
```typescript
import { sendTierChangeNotification } from '@/lib/utils/notificationService';
```

**Step 3b.1: Promotion notifications** (route.ts:139-147):
```typescript
// Step 3b.1: Send promotion notifications (Task 8.3.3)
console.log(`[DailyAutomation] Sending promotion notifications`);
for (const promotion of promotionResult.promotions) {
  await sendTierChangeNotification(clientId, {
    userId: promotion.userId,
    fromTier: promotion.fromTier,
    toTier: promotion.toTier,
    changeType: 'promotion',
    totalValue: promotion.totalValue,
  });
}
```

**Step 3c.1: Checkpoint notifications** (route.ts:168-181):
```typescript
// Step 3c.1: Send tier change notifications from checkpoint evaluation (Task 8.3.3)
const checkpointChanges = tierResult.results.filter(r => r.status !== 'maintained');
if (checkpointChanges.length > 0) {
  for (const change of checkpointChanges) {
    await sendTierChangeNotification(clientId, {
      userId: change.userId,
      fromTier: change.tierBefore,
      toTier: change.tierAfter,
      changeType: change.status === 'promoted' ? 'promotion' : 'demotion',
      totalValue: change.checkpointValue,
      periodStartDate: change.periodStartDate,
      periodEndDate: change.periodEndDate,
    });
  }
}
```

### Service Interface Update (tierCalculationService.ts)

**CheckpointEvaluationResult** extended (tierCalculationService.ts:36-45):
```typescript
export interface CheckpointEvaluationResult {
  userId: string;
  tierBefore: string;
  tierAfter: string;
  status: 'maintained' | 'promoted' | 'demoted';
  checkpointValue: number;
  threshold: number;
  periodStartDate: string;  // For notifications (Task 8.3.3)
  periodEndDate: string;    // For notifications (Task 8.3.3)
}
```

### Multi-Tenant Filters Summary (Task 8.3.3)

| Function | File:Line | Filter |
|----------|-----------|--------|
| `sendTierChangeNotification` (users) | notificationService.ts:101-102 | `.eq('id', userId).eq('client_id', clientId)` |
| `sendTierChangeNotification` (tiers) | notificationService.ts:129 | `.eq('client_id', clientId)` |
| `sendTierChangeNotification` (clients) | notificationService.ts:150 | `.eq('id', clientId)` |

### Verification Commands (Task 8.3.3)

**Test 1: sendTierChangeNotification at documented line**
```bash
grep -n "export async function sendTierChangeNotification" appcode/lib/utils/notificationService.ts
# Expected: 78:export async function sendTierChangeNotification(
```

**Test 2: Route calls notification for both sources**
```bash
grep -n "sendTierChangeNotification" appcode/app/api/cron/daily-automation/route.ts
# Expected: Lines 29 (import), 142 (promotions), 174 (checkpoint)
```

**Test 3: Multi-tenant filters present**
```bash
grep -n "eq('client_id'" appcode/lib/utils/notificationService.ts
# Expected: Lines 102, 129
```

---

## Task 8.3.4 - Raffle Drawing Calendar Event

**Status:** Complete
**References:** EXECUTION_PLAN.md Task 8.3.4, Loyalty.md lines 1772-1783

### Problem Solved

Admin needed calendar reminders when raffles end so they can draw winners. The daily cron now creates Google Calendar events for raffles ending TODAY.

### Function Call Chain

```
Daily Cron (route.ts:92)
  └─ syncRepository.findRafflesEndingToday(clientId)   # Step 3d (route.ts:191)
  │   ├─→ supabase.from('missions')                    # syncRepository.ts:656
  │   └─→ supabase.from('raffle_participations')       # syncRepository.ts:686 (count)
  │
  └─► FOR each raffle ending today:
      └─ createRaffleDrawingEvent()                    # route.ts:201
          └─→ createCalendarEvent()                    # googleCalendar.ts:119
              └─→ google.calendar.events.insert()      # googleCalendar.ts:162
```

### Database Tables Used

| Table | Purpose | SchemaFinalv2.md |
|-------|---------|------------------|
| `missions` | raffle_end_date (line 380), display_name (line 371) | Section 2.5 |
| `rewards` | name (via JOIN with missions.reward_id) | Section 2.6 |
| `raffle_participations` | participant count | Section 8 (line 894) |

### New Repository Function (syncRepository.ts)

**RaffleEndingTodayData** (syncRepository.ts:88-94):
```typescript
export interface RaffleEndingTodayData {
  missionId: string;
  missionName: string;
  prizeName: string;
  participantCount: number;
  raffleEndDate: string;
}
```

**findRafflesEndingToday** (syncRepository.ts:649-709):
```typescript
async findRafflesEndingToday(clientId: string): Promise<RaffleEndingTodayData[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Query missions with raffle_end_date = TODAY
  const { data: missions } = await supabase
    .from('missions')
    .select(`
      id, display_name, raffle_end_date, reward_id,
      rewards!inner ( name )
    `)
    .eq('client_id', clientId)           // ⚠️ Multi-tenant filter
    .eq('mission_type', 'raffle')
    .eq('activated', true)
    .eq('enabled', true)
    .gte('raffle_end_date', `${today}T00:00:00`)
    .lt('raffle_end_date', `${today}T23:59:59`);

  // Get participant counts for each raffle
  for (const mission of missions) {
    const { count } = await supabase
      .from('raffle_participations')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)         // ⚠️ Multi-tenant filter
      .eq('mission_id', mission.id);
    // ... build result
  }
}
```

### Route Integration (route.ts)

**Imports** (route.ts:30-31):
```typescript
import { createRaffleDrawingEvent } from '@/lib/utils/googleCalendar';
import { syncRepository } from '@/lib/repositories/syncRepository';
```

**Step 3d: Raffle calendar events** (route.ts:186-217):
```typescript
// Step 3d: Create calendar events for raffles ending today (Task 8.3.4)
console.log(`[DailyAutomation] Checking for raffles ending today`);
let raffleEventsCreated = 0;
try {
  const rafflesEndingToday = await syncRepository.findRafflesEndingToday(clientId);

  if (rafflesEndingToday.length > 0) {
    for (const raffle of rafflesEndingToday) {
      // Set due time to 12:00 PM EST on raffle_end_date
      const drawingDateTime = new Date(raffle.raffleEndDate);
      drawingDateTime.setHours(12, 0, 0, 0); // 12:00 PM

      const calendarResult = await createRaffleDrawingEvent(
        raffle.missionName,
        raffle.prizeName,
        raffle.participantCount,
        drawingDateTime
      );

      if (calendarResult.success) {
        raffleEventsCreated++;
      }
    }
  }
} catch (raffleError) {
  // Non-fatal: Log error, continue
}
```

**Response Interface Updated** (route.ts:61-63):
```typescript
raffleCalendar: {
  eventsCreated: number;
};
```

### Pre-existing Helper (googleCalendar.ts)

**createRaffleDrawingEvent** (googleCalendar.ts:479-498):
```typescript
export async function createRaffleDrawingEvent(
  missionName: string,
  prizeName: string,
  participantCount: number,
  drawingDateTime: Date
): Promise<CalendarEventResult> {
  const title = `🎲 Draw Raffle Winner: ${missionName}`;
  const description = `Raffle: ${missionName}
Prize: ${prizeName}
Total Participants: ${participantCount}

Action: Select winner in Admin UI`;

  return createCalendarEvent({
    title, description,
    dueDateTime: drawingDateTime,
    reminderMinutes: 15,
  });
}
```

### Multi-Tenant Filters Summary (Task 8.3.4)

| Function | File:Line | Filter |
|----------|-----------|--------|
| `findRafflesEndingToday` (missions) | syncRepository.ts:667 | `.eq('client_id', clientId)` |
| `findRafflesEndingToday` (raffle_participations) | syncRepository.ts:689 | `.eq('client_id', clientId)` |

### Verification Commands (Task 8.3.4)

**Test 1: findRafflesEndingToday at documented line**
```bash
grep -n "async findRafflesEndingToday" appcode/lib/repositories/syncRepository.ts
# Expected: 649:  async findRafflesEndingToday(clientId: string): Promise<RaffleEndingTodayData[]> {
```

**Test 2: Route calls raffle calendar creation**
```bash
grep -n "createRaffleDrawingEvent\|findRafflesEndingToday" appcode/app/api/cron/daily-automation/route.ts
# Expected: Lines 30 (import), 191, 201
```

**Test 3: Multi-tenant filters present**
```bash
grep -n "eq('client_id'" appcode/lib/repositories/syncRepository.ts | tail -3
# Expected: Lines 667, 689 show client_id filters in raffle function
```

---

## Pending Implementation

### Step 8.3 - Remaining Tasks
- ~~Task 8.3.2: Integrate with daily-automation~~ ✅ Complete
- ~~Task 8.3.3: Tier change notifications~~ ✅ Complete
- ~~Task 8.3.4: Raffle drawing calendar event~~ ✅ Complete

### Step 8.4 - Manual Upload
- Task 8.4.1: Manual upload route (admin fallback)

### Step 8.5 - Cron Testing
- Tasks 8.5.1-8.5.9: Integration tests

---

## Database Tables (To Be Used)

**Reference:** SchemaFinalv2.md

| Table | Purpose | Lines |
|-------|---------|-------|
| `videos` | Per-video analytics from CRUVA CSV | 227-251 |
| `users` | Precomputed fields updated by sync | 123-155 |
| `tiers` | Tier thresholds for calculation | 254-272 |
| `tier_checkpoints` | Checkpoint evaluation audit log | 286-310 |
| `sync_logs` | Daily sync status tracking | TBD |

---

## Error Handling (To Be Implemented)

**Failure Scenarios:**
1. CRUVA authentication failure
2. CSV download timeout
3. CSV parsing errors
4. Database transaction failures

**Recovery:** Manual CSV upload via `/admin/data-sync` page

**Monitoring:** Resend email alerts to admin on any failure

---

**Document Version:** 2.2
**Created:** 2025-12-10
**Last Updated:** 2025-12-12 (v2.2 - Added mission progress creation per GAP-MISSION-PROGRESS-ROWS, mission progress update per BUG-MISSION-PROGRESS-UPDATE)
**Phase:** 8 - Automation & Cron Jobs
