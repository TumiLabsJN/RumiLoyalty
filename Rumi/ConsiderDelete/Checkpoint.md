# CHECKPOINT DOCUMENT - Schema Audit Phase 4 Analysis

**Date:** 2025-01-15
**Context:** Paused during Phase 4 (Database Partitioning) analysis to document unresolved design questions
**Status:** Awaiting clarification before proceeding with partitioning documentation

---

## WORK COMPLETED (Phases 1-3)

### ✅ Phase 1: Critical Schema Changes (5 tables + client_id)
- Added `client_id` to: metrics, sales_adjustments, tier_checkpoints, commission_boost_state_history, videos
- All schema documentation updated in SchemaFinalv2.md and Loyalty.md

### ✅ Phase 2: Composite Foreign Key Constraints (3 tables)
- Added composite FKs to: commission_boost_redemptions, physical_gift_redemptions, raffle_participations
- Security hardening: Database now enforces client_id matching between sub-state tables and parent redemptions

### ✅ Phase 3: Composite Indexes (2 tables)
- Added composite indexes to: missions, rewards
- Performance optimization for common multi-filter queries (GET /api/missions, GET /api/rewards)

### ✅ Bonus Fixes
- Removed legacy `raffle_prize_name` field (raffle names now come from rewards.name)
- Added `missions.display_name` field (user-facing commercial names)

---

## CURRENT PHASE: Phase 4 - Database Partitioning

**Goal:** Document partitioning strategy for high-volume tables to prevent performance degradation at scale

**Tables Identified for Partitioning:**
1. **videos** - Will become largest table (every TikTok video ever posted)
2. **redemptions** - Audit claims potential 20M rows from VIP tier rewards
3. **metrics** - Monthly aggregated data (immutable records)
4. **commission_boost_state_history** - Audit trail grows indefinitely

---

## CRITICAL ISSUE IDENTIFIED: metrics Table Design Mismatch

### The Problem

**Current Schema (SchemaFinalv2.md:171-195):**
```sql
CREATE TABLE metrics (
  user_id UUID,
  period VARCHAR(7) NOT NULL,  -- Format: 'YYYY-MM' (calendar month)
  tiktok_sales DECIMAL(10, 2),
  checkpoint_units_sold INTEGER,
  ...
  UNIQUE(user_id, period)  -- One row per user per calendar month
);
```

**Checkpoint System (Loyalty.md:148-151):**
```sql
-- clients table
checkpoint_months INTEGER DEFAULT 4  -- 4-MONTH rolling checkpoints per user

-- Example:
-- User A reaches Gold on Jan 15 → checkpoint on May 15 (4 months later)
-- User B reaches Gold on Feb 3 → checkpoint on Jun 3 (4 months later)
-- NOT calendar-based (users don't all reset on same day)
```

### Why This Is a Problem

**Monthly calendar periods ('2025-01', '2025-02') cannot represent 4-month rolling checkpoint windows:**

- User A needs sales from **Jan 15 → May 15** (spans partial months)
  - Jan 15-31 (partial)
  - Feb 1-28 (full)
  - Mar 1-31 (full)
  - Apr 1-30 (full)
  - May 1-15 (partial)

- User B needs sales from **Feb 3 → Jun 3** (different partial months)
  - Feb 3-28 (partial)
  - Mar 1-31 (full)
  - Apr 1-30 (full)
  - May 1-31 (full)
  - Jun 1-3 (partial)

**Monthly aggregates don't align with these date ranges!**

### What SchemaFinalv2.md Says (Line 173)

> **Purpose:** Monthly aggregated performance metrics per creator

**What it does NOT explain:**
- WHY monthly (when checkpoints are 4-month rolling windows)
- WHAT use case requires monthly aggregation
- HOW monthly periods support per-user rolling checkpoint calculations

### Evidence That Monthly Periods Don't Fit

**Line 193-194 (SchemaFinalv2.md):**
> Required for tier calculations and checkpoint evaluations
> Source of truth for mission progress tracking (sales_dollars, sales_units missions)

**But:**
- Tier calculations need data from `tier_achieved_at` + 4 months (per-user rolling window)
- Mission progress needs data from `checkpoint_start` to `checkpoint_end` (per-user window)
- Neither of these align with calendar months ('2025-01', '2025-02')

---

## QUESTIONS THAT NEED ANSWERS

### Q1: What is the metrics table actually used for?

**Possible answers:**
- A) **Dashboard analytics only** (monthly trends, charts) - NOT used for checkpoint calculations
- B) **Historical reporting** - Admin wants to see month-over-month performance
- C) **Misaligned design** - Should track checkpoint periods instead of calendar months
- D) **Legacy artifact** - Inherited from earlier design, needs redesign
- E) **Something else entirely**

**If answer is A or B:** metrics is for analytics only, checkpoint calculations use videos table directly

**If answer is C or D:** metrics table needs redesign to align with checkpoint system

---

### Q2: Where does checkpoint calculation actually happen?

**From Loyalty.md:193-195:**
```sql
-- users table
tier_achieved_at TIMESTAMP  -- Start of checkpoint period
next_checkpoint_at TIMESTAMP  -- End of checkpoint period (tier_achieved_at + 4 months)
```

**Question:** Do checkpoint calculations:
- A) Query `metrics` table (sum monthly periods that overlap checkpoint window)?
- B) Query `videos` table directly (filter by post_date range)?
- C) Use precomputed fields in `users` table (checkpoint_sales_current, checkpoint_units_current)?
- D) Something else?

**Related fields (Loyalty.md:208-209):**
```sql
checkpoint_sales_current DECIMAL(10, 2) DEFAULT 0  -- Sales in current checkpoint period
checkpoint_units_current INTEGER DEFAULT 0  -- Units in current checkpoint period
```

**These fields suggest:** Checkpoint totals are precomputed and stored in users table, updated by daily sync

**If true:** metrics table might be redundant for checkpoint calculations

---

### Q3: How does daily Cruva CSV sync update data?

**From Loyalty.md:127, 199, 2800:**
- Daily sync happens
- Updates precomputed fields in users table
- Updates metrics table (but HOW? Which month period gets updated?)

**Scenario:** Today is Jan 25, 2025. Daily sync runs. User A's checkpoint is Jan 15 → May 15.

**What happens to metrics table?**
- A) Updates `period = '2025-01'` row (current calendar month)
- B) Updates multiple period rows that span checkpoint window?
- C) Doesn't update metrics table at all (only updates users.checkpoint_sales_current)?

**This is unclear from documentation.**

---

### Q4: VIP Tier Rewards - Are redemptions created eagerly or lazily?

**From CodexAudit2.md:66:**
> ❌ MISSING: There is no partition plan even though eager VIP tier rewards alone can produce ~20 M rows

**Question:** When admin creates a new VIP tier reward for tier_3:
- A) **Eager creation** - System immediately creates redemptions for ALL existing tier_3 users (backfill job)
- B) **Lazy creation** - System only creates redemption when user clicks "claim"

**If eager:** redemptions table will grow VERY fast (need partitioning urgently)

**If lazy:** redemptions table grows slower (partitioning less urgent)

**From Loyalty.md:1510, 1666, 1868:**
- References to "backfill job" suggest EAGER creation
- But not explicitly stated

**Evidence for eager (Loyalty.md:1510):**
> **Solution:** Combined backfill job + soft delete pattern with reactivation logic.

**Need confirmation:** Are VIP tier reward redemptions auto-created via backfill when reward is configured?

---

### Q5: Redemptions table scale - Is 20M realistic?

**Audit claim (CodexAudit2.md:66):**
> eager VIP tier rewards alone can produce ~20 M rows

**Need clarification:**
1. How many VIP tier rewards per tier? (2? 5? 10?)
2. Expected user scale? (1k? 10k? 100k creators?)
3. Average tier changes per user per year? (2? 5? 10?)
4. Are redemptions soft-deleted or hard-deleted on tier demotion?

**Example calculation:**
```
10,000 users × 5 tiers × 4 rewards/tier × 3 tier changes/year × 5 years
= 3,000,000 rows

100,000 users × 5 tiers × 4 rewards/tier × 3 tier changes/year × 5 years
= 30,000,000 rows
```

**Need realistic scale estimate to justify partitioning strategy.**

---

## PARTITIONING DECISION TREE

### videos Table - ✅ Clear candidate for partitioning

**Strategy:** Range partitioning by `post_date` (monthly partitions)

**Rationale:**
- Will be largest table (every video ever posted by all creators)
- Daily CSV sync continuously adds videos
- Queries often filter by date range (checkpoint period queries)
- Immutable historical data (old videos never change)

**Partition example:**
```sql
CREATE TABLE videos_partitioned (LIKE videos INCLUDING ALL)
PARTITION BY RANGE (post_date);

CREATE TABLE videos_2025_01 PARTITION OF videos_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE videos_2025_02 PARTITION OF videos_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

**Documentation decision:** Proceed with documenting this strategy

---

### metrics Table - ⚠️ BLOCKED pending Q1-Q3 answers

**Current state:**
- Monthly periods ('YYYY-MM') don't align with 4-month rolling checkpoints
- Purpose unclear (analytics vs checkpoint calculations)
- May need redesign instead of partitioning

**Possible outcomes based on answers:**

**If metrics is for analytics only (not checkpoint calculations):**
- Keep monthly periods
- Document range partitioning by `period`
- Note: Used for historical reporting, not checkpoint calculations

**If metrics is for checkpoint calculations:**
- REDESIGN NEEDED - Monthly periods don't work
- Either:
  - A) Remove table entirely (calculate from videos on-demand)
  - B) Change to different granularity (daily snapshots? checkpoint-period aggregates?)
  - C) Keep for different purpose, clarify documentation

**Cannot document partitioning until table purpose is clarified.**

---

### redemptions Table - ⚠️ BLOCKED pending Q4-Q5 answers

**Current uncertainty:**
- Scale estimate unclear (20M rows realistic?)
- Eager vs lazy creation pattern unknown
- Partitioning strategy depends on scale

**Possible partitioning strategies:**

**Strategy A: Partition by client_id (list partitioning)**
```sql
ALTER TABLE redemptions PARTITION BY LIST (client_id);

CREATE TABLE redemptions_client_a PARTITION OF redemptions
  FOR VALUES IN ('client-uuid-a');

CREATE TABLE redemptions_client_b PARTITION OF redemptions
  FOR VALUES IN ('client-uuid-b');
```
- **Use when:** Multi-tenant at scale (100+ clients)
- **Benefit:** Tenant data isolation, easy client offboarding

**Strategy B: Partition by created_at (range partitioning)**
```sql
CREATE TABLE redemptions_partitioned (LIKE redemptions INCLUDING ALL)
PARTITION BY RANGE (created_at);

CREATE TABLE redemptions_2025_q1 PARTITION OF redemptions_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```
- **Use when:** Time-based archival needed
- **Benefit:** Easy to archive old data, query recent data faster

**Strategy C: No partitioning (defer until scale justifies)**
- **Use when:** Scale doesn't justify complexity yet
- **Benefit:** Simpler implementation, add partitioning later when needed

**Cannot decide without scale estimate and creation pattern.**

---

### commission_boost_state_history Table - ✅ Clear candidate

**Strategy:** Range partitioning by `transitioned_at` (quarterly or yearly)

**Rationale:**
- Audit trail grows indefinitely
- Immutable historical records
- Old data can be archived to cold storage
- Queries typically filter by recent date ranges

**Documentation decision:** Proceed with documenting this strategy

---

## RECOMMENDED NEXT STEPS

### Immediate Actions Needed:

1. **Answer Q1-Q3:** Clarify metrics table purpose and checkpoint calculation logic
   - Review codebase (if exists) or design docs
   - Determine if metrics is for analytics vs checkpoint calculations
   - Document actual data flow: Cruva CSV → daily sync → what gets updated?

2. **Answer Q4-Q5:** Clarify VIP tier reward creation pattern and scale
   - Confirm eager vs lazy creation
   - Provide realistic scale estimates (users, rewards per tier, tier changes/year)
   - Determine if 20M row estimate is accurate

3. **Decide on metrics table:**
   - **Option A:** Redesign table to align with checkpoint system
   - **Option B:** Keep as-is but clarify it's analytics-only (checkpoint calcs use videos table)
   - **Option C:** Remove table entirely (calculate everything from videos on-demand)

4. **Update SchemaFinalv2.md** to clarify:
   - metrics table purpose (lines 173, 193-194)
   - Relationship between monthly periods and 4-month checkpoints
   - How checkpoint calculations actually work

---

## FILES AFFECTED

**Schema Documentation:**
- `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md` (Lines 171-195: metrics table)
- `/home/jorge/Loyalty/Rumi/Loyalty.md` (Lines 148-151: checkpoint_months, Lines 241-265: metrics table)

**Audit Reference:**
- `/home/jorge/Loyalty/Rumi/CodexAudit2.md` (Lines 66-82: Partitioning recommendations, Lines 433-490: Phase 4 tasks)

**Related Documentation:**
- Need to review mission progress calculation flows
- Need to review checkpoint evaluation logic
- Need to review VIP tier reward creation flows

---

## CONTEXT FOR FRESH CLI INSTANCE

**Where we left off:**
- Completed Phases 1-3 of audit implementation (schema changes, composite FKs, composite indexes)
- Started Phase 4 (database partitioning)
- Discovered fundamental design question: Why does metrics table use monthly periods when checkpoints are 4-month rolling windows?
- User confirmed: "I think we do not need monthly periods at all"
- Paused to document questions before proceeding

**What to do next:**
1. Read this Checkpoint.md file
2. Get answers to Q1-Q5 from user
3. Based on answers, either:
   - Redesign metrics table
   - Clarify metrics table purpose in documentation
   - Remove metrics table from schema
4. Resume Phase 4 partitioning documentation with correct understanding

**Key insight:** Don't assume monthly periods make sense for a 4-month rolling checkpoint system. The schema may have design issues that need fixing before documenting operational strategies like partitioning.

---

## OPEN DESIGN QUESTIONS SUMMARY

| # | Question | Impact | Blocking |
|---|----------|--------|----------|
| Q1 | What is metrics table actually used for? | Determines if redesign needed | metrics partitioning |
| Q2 | Where does checkpoint calculation happen? | Clarifies data flow | metrics partitioning |
| Q3 | How does daily sync update metrics? | Determines if monthly periods work | metrics partitioning |
| Q4 | Eager vs lazy VIP tier reward creation? | Determines redemptions scale | redemptions partitioning |
| Q5 | Is 20M redemptions realistic? | Justifies partitioning urgency | redemptions partitioning |

**Tables NOT blocked:**
- ✅ videos table - Can document partitioning (clear use case)
- ✅ commission_boost_state_history - Can document partitioning (clear use case)

---

**END OF CHECKPOINT DOCUMENT**
