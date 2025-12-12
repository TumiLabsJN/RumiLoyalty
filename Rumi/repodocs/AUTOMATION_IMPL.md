# Automation System - Implementation Guide

**Purpose:** Daily cron job for sales data sync from CRUVA, precomputed field updates, real-time tier promotion, tier checkpoint evaluation, and commission boost activation
**Phase:** Phase 8 - Automation & Cron Jobs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-12 (v2.1 - Added real-time promotion per BUG-REALTIME-PROMOTION)

---

## Quick Reference

**Steps Documented:**
- Step 8.1 - Cron Infrastructure ✅
- Step 8.2 - Daily Sales Sync ✅ (Tasks 8.2.0a-8.2.5)
- Step 8.3 - Tier Calculation ✅ (Tasks 8.3.0a-8.3.2) | ⏳ (8.3.3-4 pending)
- Step 8.3b - Real-Time Promotion ✅ (BUG-REALTIME-PROMOTION)
- Step 8.4 - Manual Upload (pending)
- Step 8.5 - Cron Testing (pending)

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `vercel.json` | 13 | Vercel cron configuration |
| `appcode/app/api/cron/daily-automation/route.ts` | 227 | Cron route handler (6-step orchestration) |
| `appcode/lib/services/salesService.ts` | 355 | Sales sync orchestration |
| `appcode/lib/services/tierCalculationService.ts` | 455 | Checkpoint eval + real-time promotion |
| `appcode/lib/repositories/syncRepository.ts` | 575 | Database operations for sync |
| `appcode/lib/repositories/tierRepository.ts` | 755 | Tier + checkpoint + promotion functions |
| `appcode/lib/utils/alertService.ts` | 353 | Admin failure alerts via Resend |
| `appcode/lib/utils/cronAuth.ts` | 171 | Cron secret validation |

**Cron Schedule:** `0 19 * * *` (7 PM UTC / 2 PM EST daily)

**Quick Navigation:**
- [Step 8.1 - Cron Infrastructure](#step-81---cron-infrastructure)
- [Step 8.2 - Daily Sales Sync](#step-82---daily-sales-sync)
- [Step 8.3 - Tier Calculation](#step-83---tier-calculation)
- [Step 8.3b - Real-Time Promotion](#step-83b---real-time-promotion-bug-realtime-promotion)
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
  ├─→ processDailySales(clientId) (salesService.ts:59-262)
  │   ├─→ syncRepository.createSyncLog() (syncRepository.ts:176-207)
  │   ├─→ downloadCruvaCSV() (cruvaDownloader.ts)
  │   ├─→ parseCruvaCSV() (csvParser.ts)
  │   ├─→ syncRepository.upsertVideo() per row (syncRepository.ts:231-280)
  │   ├─→ syncRepository.updatePrecomputedFields() RPC (syncRepository.ts:313-345)
  │   ├─→ syncRepository.updateLeaderboardRanks() RPC (syncRepository.ts:348-380)
  │   ├─→ syncRepository.updateMissionProgress() (syncRepository.ts:487-530)
  │   ├─→ createRedemptionsForCompletedMissions() (salesService.ts:327-354)
  │   │   └─→ syncRepository.findNewlyCompletedMissions() (syncRepository.ts:354-420)
  │   │   └─→ syncRepository.createRedemptionForCompletedMission() (syncRepository.ts:423-470)
  │   └─→ syncRepository.updateSyncLog() (syncRepository.ts:209-228)
  │
  └─→ On failure: sendAdminAlert() (alertService.ts:264-317)
```

---

### Task 8.2.4: Daily Automation Route

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts` (169 lines)

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
# Expected: 327:export async function createRedemptionsForCompletedMissions(
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

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts` (301 lines)

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

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts` (597 lines)

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

**getUsersDueForCheckpoint** (tierRepository.ts:401-466):
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

## Pending Implementation

### Step 8.3 - Remaining Tasks
- ~~Task 8.3.2: Integrate with daily-automation~~ ✅ Complete
- Task 8.3.3: Tier change notifications (needs dual-source: promotions + demotions)
- Task 8.3.4: Raffle drawing calendar event

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

**Document Version:** 2.1
**Created:** 2025-12-10
**Last Updated:** 2025-12-12
**Phase:** 8 - Automation & Cron Jobs
