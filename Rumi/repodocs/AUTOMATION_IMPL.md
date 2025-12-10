# Automation System - Implementation Guide

**Purpose:** Daily cron job for sales data sync from CRUVA, precomputed field updates, tier calculation, and commission boost activation
**Phase:** Phase 8 - Automation & Cron Jobs
**Target Audience:** LLM agents debugging or modifying this feature
**Last Updated:** 2025-12-10

---

## Quick Reference

**Steps Documented:**
- Step 8.1 - Cron Infrastructure ✅
- Step 8.2 - Daily Sales Sync (pending)
- Step 8.3 - Tier Calculation (pending)
- Step 8.4 - Manual Upload (pending)
- Step 8.5 - Cron Testing (pending)

**Key Files:**
| File | Lines | Purpose |
|------|-------|---------|
| `vercel.json` | 13 | Vercel cron configuration |
| `appcode/app/api/cron/.gitkeep` | 0 | Directory placeholder for cron routes |

**Cron Schedule:** `0 19 * * *` (7 PM UTC / 2 PM EST daily)

**Quick Navigation:**
- [Step 8.1 - Cron Infrastructure](#step-81---cron-infrastructure)
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

## Pending Implementation

### Step 8.2 - Daily Sales Sync
- Task 8.2.0a: CRUVA CSV downloader (Puppeteer)
- Task 8.2.1: CSV parser utility with `CRUVA_COLUMN_MAP`
- Task 8.2.2: Sales service file
- Task 8.2.3: `processDailySales` function
- Task 8.2.4: `/api/cron/daily-automation` route
- Task 8.2.5: Error monitoring (Resend alerts)

### Step 8.3 - Tier Calculation
- Task 8.3.1: Tier calculation service
- Task 8.3.2: Integrate with daily-automation
- Task 8.3.3: Tier change notifications

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

**Document Version:** 1.0
**Created:** 2025-12-10
**Phase:** 8 - Automation & Cron Jobs
