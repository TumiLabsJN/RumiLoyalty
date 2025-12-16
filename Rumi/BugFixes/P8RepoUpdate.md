# Phase 8 Repository Layer Update Guide

**Purpose:** Document the architecture compliance issue in Phase 8 sales service and required repository addition
**Audience:** LLM agents maintaining or upgrading the automation/cron system
**Created:** 2025-12-11
**Status:** Pending Implementation

---

## 1. What We Discovered

### Discovery Method
During Task 8.2.2 implementation audit, compared `salesService.ts` imports against ARCHITECTURE.md Section 5 patterns.

### Documents Reviewed

| Document | Lines | Finding |
|----------|-------|---------|
| ARCHITECTURE.md | 467-481 | Section 5 Service Layer: "NOT Responsible For: Direct database access (use repositories)" |
| ARCHITECTURE.md | 939-943 | Section 7 Naming: `<domain>Repository.ts` pattern |
| EXECUTION_PLAN.md | 1369-1406 | Phase 8 Step 8.2 tasks - no repository task exists |
| salesService.ts | 15 | Imports Supabase client directly (violates Section 5) |

### The Gap

Phase 8 tasks define:
- ✅ Task 8.2.0a: cruvaDownloader.ts (automation layer)
- ✅ Task 8.2.1: csvParser.ts (utility layer)
- ✅ Task 8.2.2: salesService.ts (service layer)
- ❌ **Missing:** Repository layer for database operations

---

## 2. Context on the Issue

### Architecture Pattern (ARCHITECTURE.md Section 5)

```
Route Layer (HTTP)
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Database Access)  ← MISSING FOR PHASE 8
    ↓
Supabase Client
```

### Current salesService.ts Implementation

```typescript
// Line 15 - VIOLATION of Section 5
import { createClient } from '@/lib/supabase/server-client';
```

### What Section 5 Requires

```typescript
// CORRECT pattern per Section 5
import { salesRepository } from '@/lib/repositories/salesRepository';
// OR
import { videoRepository } from '@/lib/repositories/videoRepository';
import { userRepository } from '@/lib/repositories/userRepository';
```

### Why This Matters

The daily cron job (`processDailySales`) will perform these database operations:
1. Lookup users by `tiktok_handle`
2. Auto-create users if not found
3. Upsert videos table (10 columns per row)
4. Update 16 precomputed fields on users table
5. Update mission_progress records
6. Create redemption records

Without a repository layer, all this database logic lives in the service - making it:
- Harder to test (can't mock database calls)
- Harder to debug (business logic mixed with SQL)
- Inconsistent with rest of codebase

---

## 3. Business Implications

### Why This Code Path is Critical

| Aspect | Impact |
|--------|--------|
| **Data Source** | ALL creator performance data flows through this cron job |
| **Frequency** | Runs daily at 2 PM EST - affects every user |
| **Dependencies** | Dashboard, Tiers, Missions, Rewards all depend on this data |
| **Debugging** | When "my sales aren't showing" tickets come in, this is where we look |

### Risk Assessment

| Scenario | With Repository | Without Repository |
|----------|-----------------|-------------------|
| User reports missing sales | Check repository logs, trace specific function | Dig through 500-line service function |
| Need to change video upsert logic | Modify `videoRepository.upsertVideo()` | Find and modify inline SQL in service |
| Unit test the sync logic | Mock repository, test business logic | Must mock Supabase client, complex setup |
| Add new column to videos table | Update repository + types | Hunt through service for all references |

### Long-term Maintenance

This cron job is the **heart of the loyalty engine**:
- If it fails, dashboards show stale data
- If it's buggy, tier calculations are wrong
- If it's hard to debug, support tickets pile up

A clean repository layer pays dividends every time we need to:
- Debug a user's missing data
- Add a new metric from CRUVA
- Optimize slow queries
- Write regression tests

---

## 4. Fixes for Issue

### Recommended Fix: Add Repository Task to Phase 8

**Insert new Task 8.2.2a before Task 8.2.3:**

```markdown
- [ ] **Task 8.2.2a:** Create sales repository for database operations
    - **Action:** Create `/lib/repositories/salesRepository.ts`
    - **References:** ARCHITECTURE.md Section 4 (Repository Layer, lines 399-462), Section 7 (Naming Conventions)
    - **Implementation Guide:** Create repository with functions for: (1) findUserByTiktokHandle(clientId, handle), (2) createUser(clientId, userData), (3) upsertVideo(clientId, userId, videoData), (4) updateUserPrecomputedFields(clientId, userId, fields), (5) bulkUpdateLeaderboardRanks(clientId), (6) findActiveMissionProgress(clientId, userId), (7) updateMissionProgress(clientId, progressId, data), (8) createRedemption(clientId, redemptionData), (9) createSyncLog(clientId, logData), (10) updateSyncLog(syncLogId, status, details)
    - **Acceptance Criteria:** File exists with repository functions following Section 4 patterns, all database operations use client_id filter per Section 9
```

### Alternative: Split Into Domain Repositories

Instead of one `salesRepository.ts`, could add functions to existing repositories:

| Repository | New Functions |
|------------|---------------|
| `userRepository.ts` | `findByTiktokHandle()`, `createFromCruva()`, `updatePrecomputedFields()`, `bulkUpdateLeaderboardRanks()` |
| `videoRepository.ts` (NEW) | `upsertVideo()`, `findByUserAndDateRange()` |
| `missionRepository.ts` | Already has progress functions |
| `rewardRepository.ts` | Already has redemption functions |

**Recommendation:** Single `salesRepository.ts` is simpler for the cron job's specific needs. Domain repositories can be refactored later if reuse emerges.

### Update salesService.ts Imports

**Before:**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

**After:**
```typescript
import { salesRepository } from '@/lib/repositories/salesRepository';
```

---

## 5. What Could Break If We Implement the Fixes

### Low Risk

| Component | Risk | Reason |
|-----------|------|--------|
| Existing services | None | They don't depend on salesService yet |
| Existing repositories | None | New file, no modifications |
| API routes | None | Cron route not created yet (Task 8.2.4) |

### Potential Issues

| Issue | Mitigation |
|-------|------------|
| Task numbering in EXECUTION_PLAN.md | Use 8.2.2a to insert without renumbering |
| Additional development time | ~30 minutes for repository skeleton |
| Learning curve for new pattern | Follows existing repository patterns |

### Breaking Change Checklist

- [ ] Existing repository files - NO CHANGE
- [ ] Existing service files - NO CHANGE
- [ ] Database schema - NO CHANGE
- [ ] API contracts - NO CHANGE
- [ ] Frontend - NO CHANGE

---

## 6. Dependency Analysis

### Current Phase 8 Dependency Chain

```
Task 8.2.0a: cruvaDownloader.ts
    ↓ (downloads CSV)
Task 8.2.1: csvParser.ts
    ↓ (parses CSV to ParsedVideoRow[])
Task 8.2.2: salesService.ts
    ↓ (orchestrates workflow)
Task 8.2.3: processDailySales implementation
    ↓ (calls database directly - VIOLATION)
Database
```

### Proposed Dependency Chain

```
Task 8.2.0a: cruvaDownloader.ts
    ↓ (downloads CSV)
Task 8.2.1: csvParser.ts
    ↓ (parses CSV to ParsedVideoRow[])
Task 8.2.2: salesService.ts
    ↓ (orchestrates workflow)
Task 8.2.2a: salesRepository.ts  ← NEW
    ↓ (database operations)
Task 8.2.3: processDailySales implementation
    ↓ (calls repository)
Database
```

### Files That Will Import salesRepository.ts

```
lib/repositories/salesRepository.ts (NEW)
  └── lib/services/salesService.ts
      └── app/api/cron/daily-automation/route.ts (Task 8.2.4)
      └── app/api/cron/manual-upload/route.ts (Task 8.4.1)
```

### Existing Repositories (For Pattern Reference)

| File | Lines | Functions |
|------|-------|-----------|
| `userRepository.ts` | ~400 | findById, findByEmail, updateTier, etc. |
| `missionRepository.ts` | ~350 | findActiveMissions, updateProgress, etc. |
| `rewardRepository.ts` | ~500 | findRewards, createRedemption, etc. |
| `dashboardRepository.ts` | ~300 | getUserDashboardData, etc. |
| `tierRepository.ts` | ~250 | findTiers, getUserTierProgress, etc. |

---

## 7. Data Flow Analysis

### Current Flow (Without Repository)

```
CRUVA Platform
    │
    │ Puppeteer (cruvaDownloader.ts)
    ▼
/tmp/videos.csv
    │
    │ csvParser.parseCruvaCSV()
    ▼
ParsedVideoRow[]
    │
    │ salesService.processDailySales()
    │ ├── Direct Supabase calls ← VIOLATION
    │ ├── Business logic mixed with SQL
    │ └── Hard to test/debug
    ▼
Database (videos, users, mission_progress, redemptions)
```

### Proposed Flow (With Repository)

```
CRUVA Platform
    │
    │ Puppeteer (cruvaDownloader.ts)
    ▼
/tmp/videos.csv
    │
    │ csvParser.parseCruvaCSV()
    ▼
ParsedVideoRow[]
    │
    │ salesService.processDailySales()
    │ ├── Business logic only
    │ ├── Calls salesRepository functions
    │ └── Easy to test with mocked repository
    │
    │ salesRepository.*()
    │ ├── All database operations
    │ ├── client_id filtering
    │ └── Consistent logging
    ▼
Database (videos, users, mission_progress, redemptions)
```

### Data Transformation Points

```
CSV Row (CRUVA headers)
    ↓ csvParser.ts
ParsedVideoRow (DB column names)
    ↓ salesService.ts (business validation)
VideoUpsertData (repository input type)
    ↓ salesRepository.ts (SQL)
videos table row
```

---

## 8. Potential Upstream or Downstream Impact

### Upstream (What Feeds Into This)

| Component | Impact |
|-----------|--------|
| CRUVA Platform | None - external system |
| cruvaDownloader.ts | None - already complete |
| csvParser.ts | None - already complete |
| Environment variables | None |

### Downstream (What This Feeds)

| Component | Impact | Notes |
|-----------|--------|-------|
| Dashboard API | None | Reads from same tables, different repository |
| Missions API | None | Has own missionRepository |
| Rewards API | None | Has own rewardRepository |
| Tiers API | None | Has own tierRepository |
| Admin UI | None | Uses same APIs |

### Cross-Cutting Concerns

| Concern | Handled By |
|---------|------------|
| Multi-tenant isolation | Repository adds `client_id` to all queries |
| Error logging | Repository can add consistent error logging |
| Transaction management | Service coordinates, repository executes |
| Audit trail | sync_logs table (repository creates entries) |

---

## 9. Call Chain Mapping

### Cron Route → Service → Repository → Database

```
GET /api/cron/daily-automation (route.ts - Task 8.2.4)
  │
  ├── Verify CRON_SECRET header
  │
  ├── salesService.processDailySales(clientId)
  │   │
  │   ├── cruvaDownloader.downloadCruvaCSV()
  │   │   └── Returns: { filePath: '/tmp/videos.csv' }
  │   │
  │   ├── csvParser.parseCruvaCSV(buffer)
  │   │   └── Returns: ParseResult { rows: ParsedVideoRow[] }
  │   │
  │   ├── salesRepository.createSyncLog(clientId, { status: 'running' })
  │   │   └── Returns: syncLogId
  │   │
  │   ├── FOR EACH row in ParsedVideoRow[]:
  │   │   │
  │   │   ├── salesRepository.findUserByTiktokHandle(clientId, handle)
  │   │   │   └── Returns: User | null
  │   │   │
  │   │   ├── IF user is null:
  │   │   │   └── salesRepository.createUser(clientId, { tiktok_handle, ... })
  │   │   │
  │   │   └── salesRepository.upsertVideo(clientId, userId, videoData)
  │   │
  │   ├── salesRepository.updateAllPrecomputedFields(clientId)
  │   │   └── SQL aggregation query
  │   │
  │   ├── salesRepository.bulkUpdateLeaderboardRanks(clientId)
  │   │   └── ROW_NUMBER() OVER (PARTITION BY...)
  │   │
  │   ├── salesRepository.updateMissionProgressForUsers(clientId, userIds)
  │   │
  │   ├── salesRepository.createRedemptionsForCompletedMissions(clientId)
  │   │
  │   └── salesRepository.updateSyncLog(syncLogId, 'success', recordCount)
  │
  └── Return 200 OK with summary
```

### Error Handling Chain

```
Any step fails
  │
  ├── salesRepository.updateSyncLog(syncLogId, 'failed', errorMessage)
  │
  ├── salesService catches error, returns { success: false, error }
  │
  ├── Route sends Resend alert to admin (Task 8.2.5)
  │
  └── Return 500 with error details
```

---

## 10. Database/Schema Verification

### Tables Accessed by salesRepository

| Table | Operations | Schema Reference |
|-------|------------|------------------|
| `users` | SELECT, INSERT, UPDATE | SchemaFinalv2.md lines 123-155 |
| `videos` | SELECT, UPSERT | SchemaFinalv2.md lines 227-251 |
| `mission_progress` | SELECT, UPDATE | SchemaFinalv2.md lines 425-458 |
| `redemptions` | INSERT | SchemaFinalv2.md lines 594-662 |
| `sync_logs` | INSERT, UPDATE | SchemaFinalv2.md lines 332-356 |

### Key Columns for Repository Functions

**users table (for findUserByTiktokHandle):**
```sql
- client_id (UUID, FK, multi-tenant filter)
- tiktok_handle (VARCHAR(100), lookup key)
- current_tier (VARCHAR(50), for new users = 'tier_1')
- first_video_date (TIMESTAMP, from CSV post_date)
- 16 precomputed fields (for updatePrecomputedFields)
```

**videos table (for upsertVideo):**
```sql
- client_id (UUID, FK, multi-tenant filter)
- user_id (UUID, FK)
- video_url (TEXT, UNIQUE, upsert key)
- video_title, post_date, views, likes, comments, gmv, ctr, units_sold
- sync_date (TIMESTAMP, when synced)
```

### Verification Queries

```sql
-- Verify videos table has UNIQUE constraint on video_url
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'videos' AND constraint_type = 'UNIQUE';

-- Verify users table has index on tiktok_handle
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users' AND indexdef LIKE '%tiktok_handle%';
```

---

## 11. Frontend Impact Assessment

**No frontend impact.**

The repository layer is server-side infrastructure. Frontend components:
- Do NOT import from `/lib/repositories/`
- Do NOT call cron endpoints directly
- Consume data via existing API routes (`/api/dashboard`, `/api/missions`, etc.)

### Frontend Data Sources

| Page | API Endpoint | Repository Used |
|------|--------------|-----------------|
| Dashboard | `GET /api/dashboard` | dashboardRepository |
| Missions | `GET /api/missions` | missionRepository |
| Rewards | `GET /api/rewards` | rewardRepository |
| Tiers | `GET /api/tiers` | tierRepository |

All these will continue to work. The new `salesRepository` only feeds the cron job, which populates the same tables these APIs read from.

---

## Implementation Checklist

- [ ] Add Task 8.2.2a to EXECUTION_PLAN.md (insert after 8.2.2)
- [ ] Create `lib/repositories/salesRepository.ts` skeleton
- [ ] Update `salesService.ts` imports to use repository
- [ ] Implement repository functions in Task 8.2.2a
- [ ] Implement service functions in Task 8.2.3 (using repository)
- [ ] Verify TypeScript compiles
- [ ] Update AUTOMATION_IMPL.md with repository documentation

---

## References

- ARCHITECTURE.md Section 4 (Repository Layer, lines 399-462)
- ARCHITECTURE.md Section 5 (Service Layer, lines 467-531)
- ARCHITECTURE.md Section 7 (Naming Conventions, lines 939-955)
- ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
- EXECUTION_PLAN.md Phase 8 (lines 1338-1517)
- SchemaFinalv2.md (videos, users, mission_progress, redemptions, sync_logs tables)
- Loyalty.md Flow 1 (lines 425-610)
