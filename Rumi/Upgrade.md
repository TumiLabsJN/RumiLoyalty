# UPGRADE PLAN: Single Data Source Migration

**Date:** 2025-01-17
**Status:** Proposed - Pending Implementation
**Goal:** Simplify data sync to use only `videos.csv` from Cruva, eliminate `affiliates.csv` and `metrics` table

---

## DECISION: Remove affiliates.csv Data Source

**Current State:**
- Daily sync downloads TWO CSV files from Cruva: `affiliates.csv` + `videos.csv`
- `affiliates.csv` provides user-level aggregates (Shop GMV, Followers, Live Posts)
- `videos.csv` provides per-video details (GMV, Units, Views, Likes, Comments)
- `metrics` table consolidates both sources

**Problem:**
- Tier calculations only use video-level data (not Shop GMV which includes livestreams)
- Followers count not used anywhere in schema
- Live Posts count tracked but not used for tier calculations
- `metrics` table adds complexity without clear value

**Solution:**
- Use ONLY `videos.csv` from Cruva Dashboard > My Videos
- Aggregate video data directly into `users` table precomputed fields
- Remove `metrics` table entirely
- Remove `affiliates.csv` download from daily sync

---

## DECISION CONFIRMED: Remove metrics Table

**YES - metrics table is being removed** (the table with `period VARCHAR(7)` field)

**Rationale:**
- All required aggregates can be computed from videos table
- Precomputed totals stored in users table for performance
- Mission progress tracked in mission_progress table
- Eliminates unnecessary staging table complexity
- Single data flow: videos → users + mission_progress

---

## NEW DATA MODEL

### Three-Table Architecture

**1. videos table (source of truth)**
- Purpose: Immutable per-video metrics
- Rows: One per video (grows continuously)
- Data: video_url, post_date, sales_dollars, sales_units, views, likes, comments
- Updated: Daily from videos.csv (upsert by video_url)

**2. users table (precomputed aggregates)**
- Purpose: Fast reads for UI
- Rows: One per user
- Data:
  - Lifetime: total_sales, total_units
  - Checkpoint: checkpoint_sales_current, checkpoint_units_current, checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes
  - Window: tier_achieved_at, next_checkpoint_at (per-user rolling checkpoint)
- Updated: Daily after videos table sync (aggregate from videos filtered by date ranges)

**3. mission_progress table (per-mission tracking)**
- Purpose: Track individual mission completion per user
- Rows: One per user per active mission per checkpoint
- Data: current_value, status, checkpoint_start, checkpoint_end (snapshot)
- Updated: Daily after videos table sync (calculate from videos filtered by checkpoint_start/end)

**Key Insight:** Each user has their own checkpoint window stored in users table. Aggregations filter videos by user's tier_achieved_at → next_checkpoint_at dates.

---

## DOCUMENTS AFFECTED

### 1. Loyalty.md (Primary Schema Documentation)

**13 sections requiring changes:**

#### Line 4: Description
**Current:** "based on TikTok performance metrics"
**Change to:** "based on TikTok video performance"
**Reason:** Remove ambiguous "metrics" wording

---

#### Line 57: Daily automation comment
**Current:** "metrics sync + tier calculation"
**Change to:** "data sync + tier calculation"
**Reason:** No longer syncing to metrics table

---

#### Line 66-78: System Architecture Diagram
**Current:**
```
│  Two Data Views:                                │
│  ├─ CRM > My Affiliate (aggregate per creator) │
│  └─ Dashboard > My Videos (per-video details)  │
```
```
│    (Puppeteer automation)
│    affiliates.csv + videos.csv
```

**Change to:**
```
│  Single Data View:                              │
│  └─ Dashboard > My Videos (per-video details)  │
```
```
│    (Puppeteer automation)
│    videos.csv
```

---

#### Line 121: Infrastructure Details
**Current:**
```
- CSV parsing handled by csv-parse library (affiliates.csv + videos.csv)
```

**Change to:**
```
- CSV parsing handled by csv-parse library (videos.csv)
```

---

#### Line 242-265: metrics Table Definition
**Current:**
```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  period VARCHAR(7) NOT NULL,

  -- Sales metrics (from affiliates.csv)
  tiktok_sales DECIMAL(10, 2) DEFAULT 0,
  tiktok_units_sold INTEGER DEFAULT 0,
  videos_posted INTEGER DEFAULT 0,
  live_posts INTEGER DEFAULT 0,

  -- Checkpoint period metrics
  checkpoint_units_sold INTEGER DEFAULT 0,

  -- Engagement metrics (from videos.csv)
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  avg_ctr DECIMAL(5, 2),

  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period)
);
```

**Change to:**
```sql
-- REMOVED: metrics table no longer needed
-- All aggregates computed directly from videos table into users table precomputed fields
-- See users table: total_sales, total_units, checkpoint_sales_current, checkpoint_units_current
```

---

#### Line 1096-1200: Flow 1 - Daily Metrics Sync

**Current structure:**
```
1. Download CSV files from Cruva:
   - Navigate to CRM > My Affiliate, download `affiliates.csv`
   - Navigate to Dashboard > My Videos, download `videos.csv`

2. Parse CSV files:
   - Extract from affiliates.csv: Affiliate Handle, Shop GMV, Video Posts, Live Posts, Post Rate
   - Extract from videos.csv: Handle, Video URL, Views, Likes, Comments, GMV, CTR, Units Sold, Post date

3. Process each creator:
   - For each row in affiliates.csv:
     - Match creator by `tiktok_handle`
     - If match found: Update existing user metrics
     - If no match: Auto-create new user
     - Upsert metrics table (tiktok_sales, videos_posted, live_posts)

4. Process videos:
   - Upsert videos table
   - Aggregate engagement
   - Update metrics table with engagement totals

4a. Calculate and update units sold:
   UPDATE metrics m
   SET tiktok_units_sold = (SELECT SUM(units_sold) FROM videos WHERE user_id = m.user_id);

   UPDATE metrics m
   SET checkpoint_units_sold = (SELECT SUM(units_sold) FROM videos WHERE post_date >= tier_achieved_at);

4b. Update user precomputed fields:
   UPDATE users u
   SET total_units = m.tiktok_units_sold,
       checkpoint_units_current = m.checkpoint_units_sold
   FROM metrics m
```

**Change to:**
```
1. Download CSV file from Cruva:
   - Navigate to Dashboard > My Videos, download `videos.csv`

2. Parse CSV file:
   - Extract from videos.csv: Handle, Video URL, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title

3. Process videos:
   - For each row in videos.csv:
     - Match to user by `tiktok_handle`
     - If no match: Auto-create new user (see Flow 2)
     - Upsert videos table (video_url as unique key)

4. Calculate and update user precomputed fields directly:
   -- Units mode
   UPDATE users u
   SET
     total_units = (SELECT COALESCE(SUM(units_sold), 0) FROM videos WHERE user_id = u.id),
     checkpoint_units_current = (SELECT COALESCE(SUM(units_sold), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_videos_posted = (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_likes = (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_comments = (SELECT COALESCE(SUM(comments), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at)
   FROM clients c
   WHERE u.client_id = c.id AND c.vip_metric = 'units';

   -- Sales mode
   UPDATE users u
   SET
     total_sales = (SELECT COALESCE(SUM(sales_dollars), 0) FROM videos WHERE user_id = u.id),
     checkpoint_sales_current = (SELECT COALESCE(SUM(sales_dollars), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_videos_posted = (SELECT COUNT(*) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_views = (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_likes = (SELECT COALESCE(SUM(likes), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at),
     checkpoint_total_comments = (SELECT COALESCE(SUM(comments), 0) FROM videos WHERE user_id = u.id AND post_date >= u.tier_achieved_at)
   FROM clients c
   WHERE u.client_id = c.id AND c.vip_metric = 'sales';
```

---

#### Line 108: System Architecture diagram - Table list
**Current:** `├─ Core: clients, users, metrics`
**Change to:** `├─ Core: clients, users`
**Reason:** Remove metrics from core tables list

---

#### Line 762-763: Database Indexes
**Current:**
```sql
CREATE INDEX idx_metrics_user_period ON metrics(user_id, period);
CREATE INDEX idx_metrics_tiktok_units ON metrics(user_id, tiktok_units_sold);
```
**Change to:** **DELETE these 2 lines**
**Reason:** metrics table removed, indexes no longer needed

---

#### Line 818-828: Row Level Security (RLS) Policies
**Current:**
```sql
-- Table: metrics
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY metrics_select ON metrics...
CREATE POLICY metrics_insert ON metrics...
CREATE POLICY metrics_update ON metrics...
CREATE POLICY metrics_delete ON metrics...
```
**Change to:** **DELETE entire metrics RLS section (11 lines)**
**Reason:** metrics table removed, RLS policies no longer needed

---

#### Line 928: System routes
**Current:** `/api/cron/metrics-sync` POST
**Change to:** `/api/cron/data-sync` POST
**Reason:** More accurate name (syncing videos, not metrics table)

---

#### Line 2061, 2114-2117: Checkpoint Calculation References

**Current:**
```
- Checkpoint calculations use: `SUM(metrics.tiktok_sales) + users.manual_adjustments_total`
checkpointValue = metrics.checkpoint_units_sold + user.manual_adjustments_units;
checkpointValue = metrics.checkpoint_sales + user.manual_adjustments_total;
```

**Change to:**
```
- Checkpoint calculations use: `users.checkpoint_sales_current + users.manual_adjustments_total`
checkpointValue = user.checkpoint_units_current + user.manual_adjustments_units;
checkpointValue = user.checkpoint_sales_current + user.manual_adjustments_total;
```

---

### 2. ARCHITECTURE.md

**5 sections requiring changes:**

#### Line 33: Multiple data sources description
**Current:** `✅ **Multiple data sources** - Supabase + TikTok API + future integrations`
**Change to:** `✅ **Multiple data sources** - Supabase + Cruva CSV export + future integrations`
**Reason:** Accurate reflection of actual data source (Cruva, not TikTok API)

---

#### Line 84: Data sources diagram
**Current:** `│   Supabase   │  TikTok API  │`
**Change to:** `│   Supabase   │  Cruva CSV   │`
**Reason:** Update diagram to show Cruva as data source

---

#### Line 128: Parallel query execution example
**Current:** "Fetch user data, missions, and metrics in parallel"
**Change to:** "Fetch user data, missions, and rewards in parallel"
**Reason:** Remove metrics reference, use more accurate example

---

#### Line 155: Data update frequency
**Current:** `- **TikTok metrics:** Daily sync at midnight UTC (existing cron job)`
**Change to:** `- **Video data:** Daily sync at midnight UTC (existing cron job)`
**Reason:** More accurate description of what's being synced

---

#### Line 478-508: External Data Repository Example
**Current:** Full `tiktokRepository.ts` example with `fetchUserMetrics()` function
**Change to:** Add note above example:
```typescript
// NOTE: Current implementation uses Cruva CSV export, not TikTok API
// This example shows potential future TikTok API integration
```
**Reason:** Clarify this is aspirational example, not current implementation

---

#### Line 2155-2166: Checkpoint evaluation - reset metrics comment
**Current:** Comment says "Reset BOTH metrics"
**Change to:** "Reset BOTH checkpoint totals"
**Reason:** These are fields in users table, not metrics table

---

### 2. SchemaFinalv2.md

**7 sections requiring changes:**

#### Line 18: Table of Contents entry
**Current:** `| 1.3 | metrics | Monthly aggregated performance metrics | 95 |`
**Change to:** **DELETE this row**
**Reason:** metrics table removed

---

#### Line 49: Domain 3 table list
**Current:** `- metrics (1.3) - Monthly aggregates`
**Change to:** **DELETE this line**
**Reason:** metrics table removed from domain

---

#### Line 98: Dashboard Queries access pattern
**Current:** `**Dashboard Queries:** users (1.2), metrics (1.3), tiers (1.5)`
**Change to:** `**Dashboard Queries:** users (1.2), tiers (1.5)`
**Reason:** Dashboard reads from users table, not metrics

---

#### Line 171-199: Section 1.3 metrics Table

**Current:**
```markdown
### 1.3 metrics Table

**Purpose:** Monthly aggregated performance metrics per creator

**Current Attributes:**
- `id`, `user_id`, `client_id`, `period` VARCHAR(7)
- `tiktok_sales`, `tiktok_units_sold`, `checkpoint_units_sold`
- `videos_posted`, `live_posts`
- `total_views`, `total_likes`, `total_comments`, `avg_ctr`
- `updated_at`
- UNIQUE(user_id, period)

**Status:** **KEEP** ✅

**Rationale:**
- Required for tier calculations and checkpoint evaluations
- Source of truth for mission progress tracking
```

**Change to:**
```markdown
### 1.3 metrics Table - **REMOVED** ❌

**Previous Purpose:** Consolidated user-level aggregates from Cruva affiliates.csv + videos.csv

**Removal Rationale:**
- Tier calculations only use video-level data (not Shop GMV which includes livestreams)
- All required aggregates can be computed directly from videos table
- Mission progress tracked in mission_progress table (calculated from videos)
- Precomputed totals stored in users table for performance
- Eliminates unnecessary staging table and simplifies architecture
- period VARCHAR(7) field didn't align with per-user rolling checkpoint windows

**Migration Path:**
- Lifetime totals: videos → users.total_sales, users.total_units
- Checkpoint totals: videos (filtered by tier_achieved_at) → users.checkpoint_sales_current, users.checkpoint_units_current
- Mission progress: videos (filtered by checkpoint_start/end) → mission_progress.current_value

**New Data Flow:** videos.csv → videos table → users table + mission_progress table

**See:**
- users table: total_sales, total_units, checkpoint_sales_current, checkpoint_units_current, checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes
- mission_progress table: current_value (per mission per user)
```

---

#### Line 222-223: videos table aggregation note
**Current:**
```
- Total views/likes/comments are calculated via `SUM()` queries and stored in `metrics` table
- Mission progress tracking aggregates from this table...
```
**Change to:**
```
- Total views/likes/comments are calculated via `SUM()` queries and stored in `users` table precomputed fields
- Mission progress tracking aggregates from this table into mission_progress.current_value
```
**Reason:** Clarify aggregation target is users table, not metrics

---

#### Line 919: Domain 3 table list reference
**Current:** `- metrics (Loyalty.md)`
**Change to:** **DELETE this line**
**Reason:** metrics table removed

---

### 3. API_CONTRACTS.md

**1 section requiring changes:**

#### Line 739-763: Tier Progress Calculation

**Current:**
```sql
-- Line 746-762: Tier Progress Calculation
SELECT
  COALESCE(SUM(
    CASE
      WHEN $vipMetric = 'sales' THEN m.tiktok_sales
      WHEN $vipMetric = 'units' THEN m.tiktok_units_sold
    END
  ), 0) as metric_total,
  u.manual_adjustments_total
FROM metrics m
JOIN users u ON u.id = m.user_id
WHERE m.user_id = $userId
  AND m.client_id = $clientId
  AND m.created_at >= $tierAchievedAt
  AND m.created_at < $nextCheckpointAt
GROUP BY u.manual_adjustments_total
```

**Change to:**
```sql
-- Tier Progress Calculation (read from precomputed users table)
SELECT
  CASE
    WHEN c.vip_metric = 'sales' THEN u.checkpoint_sales_current
    WHEN c.vip_metric = 'units' THEN u.checkpoint_units_current
  END as metric_total,
  u.manual_adjustments_total,
  u.manual_adjustments_units
FROM users u
JOIN clients c ON c.id = u.client_id
WHERE u.id = $userId
  AND u.client_id = $clientId;
```

**Commentary update (Line 767):**
```typescript
// OLD:
// Total checkpoint value = TikTok metrics + manual adjustments
const currentValue = metric_total + (user.manual_adjustments_total || 0)

// NEW:
// Total checkpoint value = Precomputed checkpoint total + manual adjustments
const currentValue = (client.vip_metric === 'sales')
  ? (user.checkpoint_sales_current + user.manual_adjustments_total)
  : (user.checkpoint_units_current + user.manual_adjustments_units)
```

**Impact:** Much simpler query - single table read instead of JOIN + SUM aggregation. Precomputed values updated daily by sync.

---

## BENEFITS OF SINGLE SOURCE

**Simplified Architecture:**
- ❌ Remove metrics table (13 fields, UNIQUE constraint, indexes)
- ❌ Remove affiliates.csv download step (Puppeteer navigation + CSV parsing)
- ❌ Remove metrics table upsert logic (multiple UPDATE statements)
- ✅ Single data flow: videos.csv → videos table → users table

**Performance:**
- Current: videos → metrics → users (3-step cascade)
- New: videos → users (2-step direct)
- Fewer database operations per sync

**Maintainability:**
- Fewer tables to maintain
- Single source of truth (videos table)
- Clear data lineage

**Data Accuracy:**
- No risk of affiliates.csv vs videos.csv mismatch
- Checkpoint calculations directly from video post_date ranges
- No period field confusion (monthly vs rolling checkpoints)

---

## IMPLEMENTATION CHECKLIST

**Schema Changes:**
- [ ] Drop metrics table: `DROP TABLE metrics CASCADE;`
- [ ] Update SchemaFinalv2.md to document removal
- [ ] Update Loyalty.md CREATE TABLE statements

**Code Changes:**
- [ ] Remove affiliates.csv download from daily sync cron job
- [ ] Remove metrics table INSERT/UPDATE queries
- [ ] Update checkpoint calculation to read from users table only
- [ ] Update any queries that reference metrics table

**Documentation Changes:**
- [ ] **Loyalty.md** (13 changes)
  - [ ] Line 4: Description wording
  - [ ] Line 57: Daily automation comment
  - [ ] Line 66-78: System architecture diagram
  - [ ] Line 108: Core tables list
  - [ ] Line 121: Infrastructure details
  - [ ] Line 242-265: metrics table definition (REMOVE)
  - [ ] Line 762-763: Database indexes (DELETE)
  - [ ] Line 818-828: RLS policies (DELETE)
  - [ ] Line 928: System routes name
  - [ ] Line 1096-1200: Daily sync flow (major rewrite)
  - [ ] Line 2061, 2114-2117: Checkpoint calc references
  - [ ] Line 2155-2166: Comment correction

- [ ] **SchemaFinalv2.md** (7 changes)
  - [ ] Line 18: TOC entry (DELETE)
  - [ ] Line 49: Domain 3 list (DELETE)
  - [ ] Line 98: Dashboard queries
  - [ ] Line 171-199: metrics section (mark REMOVED)
  - [ ] Line 222-223: Aggregation note
  - [ ] Line 919: Domain 3 reference (DELETE)

- [ ] **API_CONTRACTS.md** (1 change)
  - [ ] Line 739-763: Tier progress query

- [ ] **ARCHITECTURE.md** (5 changes)
  - [ ] Line 33: Data sources description
  - [ ] Line 84: Data sources diagram
  - [ ] Line 128: Parallel query example
  - [ ] Line 155: Data update frequency
  - [ ] Line 478-508: Repository example note

**Mission Progress Update Logic:**
- [ ] Add Step 5 to daily sync: Update mission_progress.current_value for all active missions
- [ ] Query videos table filtered by mission_progress.checkpoint_start/end for each mission
- [ ] Mark missions as 'completed' when current_value >= target_value

**Testing:**
- [ ] Verify daily sync works with videos.csv only
- [ ] Verify checkpoint calculations correct (users table precomputed fields)
- [ ] Verify tier promotions/demotions work
- [ ] Verify mission progress tracking updates daily (current_value)
- [ ] Verify mission completion detection works

---

## SUMMARY OF CHANGES

**4 Documents Affected:**

1. **Loyalty.md** (13 sections changed)
   - Line 4: Description wording
   - Line 57: Daily automation comment
   - Line 66-78: System architecture diagram
   - Line 108: Core tables list
   - Line 121: Infrastructure details
   - Line 242-265: metrics table definition (REMOVE)
   - Line 762-763: Database indexes (DELETE metrics indexes)
   - Line 818-828: RLS policies (DELETE metrics RLS)
   - Line 928: System routes endpoint name
   - Line 1096-1200: Daily sync flow (major rewrite)
   - Line 2061, 2114-2117: Checkpoint calculation references
   - Line 2155-2166: Reset "metrics" comment

2. **SchemaFinalv2.md** (7 sections changed)
   - Line 18: Table of Contents entry (DELETE row)
   - Line 49: Domain 3 table list (DELETE line)
   - Line 98: Dashboard Queries access pattern
   - Line 171-199: Section 1.3 metrics table (mark as REMOVED)
   - Line 222-223: videos table aggregation note
   - Line 919: Domain 3 reference (DELETE line)

3. **API_CONTRACTS.md** (1 section changed)
   - Line 739-763: Tier progress calculation query

4. **ARCHITECTURE.md** (5 sections changed)
   - Line 33: Multiple data sources description
   - Line 84: Data sources diagram
   - Line 128: Parallel query example
   - Line 155: Data update frequency
   - Line 478-508: External repository example (add clarifying note)

**Key Migration:**
- FROM: affiliates.csv + videos.csv → metrics table → users table
- TO: videos.csv → videos table → users table + mission_progress table

**Result:** Simpler, faster, more maintainable architecture with clear data lineage.

---

## ROLLBACK PLAN

If single source proves insufficient:

1. Re-add metrics table to schema
2. Re-add affiliates.csv download to sync
3. Restore metrics table upsert logic
4. Revert documentation changes

**Indicators to roll back:**
- Cannot calculate required metrics from videos.csv alone
- Performance degradation from direct videos → users aggregation
- Business requirement emerges for Shop GMV (video + livestream combined)

---

**END OF UPGRADE PLAN**
