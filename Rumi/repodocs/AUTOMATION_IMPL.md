# Automation System - Implementation Guide

**Purpose:** Daily cron job for sales data sync from CRUVA, precomputed field updates, tier calculation, and commission boost activation
**Phase:** Phase 8 - Automation & Cron Jobs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-11

---

## Quick Reference

**Steps Documented:**
- Step 8.1 - Cron Infrastructure ✅
- Step 8.2 - Daily Sales Sync ✅ (Tasks 8.2.0a-8.2.5)
- Step 8.3 - Tier Calculation (pending)
- Step 8.4 - Manual Upload (pending)
- Step 8.5 - Cron Testing (pending)

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `vercel.json` | 13 | Vercel cron configuration |
| `appcode/app/api/cron/daily-automation/route.ts` | 169 | Cron route handler |
| `appcode/lib/services/salesService.ts` | 355 | Sales sync orchestration |
| `appcode/lib/repositories/syncRepository.ts` | 575 | Database operations for sync |
| `appcode/lib/utils/alertService.ts` | 353 | Admin failure alerts via Resend |
| `appcode/lib/utils/cronAuth.ts` | 171 | Cron secret validation |

**Cron Schedule:** `0 19 * * *` (7 PM UTC / 2 PM EST daily)

**Quick Navigation:**
- [Step 8.1 - Cron Infrastructure](#step-81---cron-infrastructure)
- [Step 8.2 - Daily Sales Sync](#step-82---daily-sales-sync)
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

## Pending Implementation

### Step 8.3 - Tier Calculation
- Task 8.3.0a: Extend tierRepository with checkpoint functions
- Task 8.3.1: Tier calculation service
- Task 8.3.1a-c: RPC functions for tier evaluation
- Task 8.3.2: Integrate with daily-automation
- Task 8.3.3: Tier change notifications
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

**Document Version:** 2.0
**Created:** 2025-12-10
**Last Updated:** 2025-12-11
**Phase:** 8 - Automation & Cron Jobs
