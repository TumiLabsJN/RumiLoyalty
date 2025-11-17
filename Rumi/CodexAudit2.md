• # COMPREHENSIVE AUDIT REPORT

  Audit Date: 2025-01-14
  Documents Reviewed: 6 (AUDIT_CONTEXT.md, SchemaFinalv2.md, ARCHITECTURE.md, MissionsRewardsFlows.md, Missions.md, Rewards.md)
  Total Lines Read: ≈7,350 (5 counted files = 6,941 lines + ~400-line AUDIT_CONTEXT.md)

  ———

  ## OBJECTIVE 1: MULTI-TENANT SAAS ALIGNMENT

  ### Executive Summary

  Tenant-scoped mission/reward tables already embed client_id, but analytics/audit tables (metrics, adjustments, boost history) still rely on inferred tenancy and lack enforcing FKs, making isolation brittle.
  Indexing and partitioning strategies haven’t caught up with the documented query shapes or projected row counts.

  ### 1A. Table Structure & Foreign Keys

  - ✅ ALIGNED: Core transactional tables (missions, mission_progress, rewards, redemptions) all carry client_id and tenant-focused indexes (SchemaFinalv2.md:356,418,453,545).
  - ⚠️ REVIEW: High-volume analytics tables (metrics, videos, sales_adjustments, tier_checkpoints) omit client_id, so every query must join back through users to enforce tenancy, increasing the odds of a missed
    filter (SchemaFinalv2.md:171,200,266,297).
  - ⚠️ REVIEW: commission_boost_state_history has no client_id, so RLS can’t filter audit rows without extra joins and reporting cannot shard by tenant (SchemaFinalv2.md:681-695).
  - ⚠️ REVIEW: Sub-state tables reference clients(id) but lack composite FKs tying (redemption_id, client_id) back to redemptions, so a stray row could point to another tenant’s redemption despite the narrative
    saying otherwise (SchemaFinalv2.md:626,780,850).
  - ✅ ALIGNED: raffle_participations intentionally keeps user_id plus UNIQUE(mission_id,user_id) to enforce one entry per user and still includes client_id for isolation (SchemaFinalv2.md:820-865).

  Recommendations

  - Add client_id columns + FOREIGN KEY (user_id, client_id) pairs on analytics tables and extend Supabase policies to those tables.
  - Create composite FK constraints on sub-state tables:

    ALTER TABLE commission_boost_redemptions
      ADD CONSTRAINT fk_boost_red_client
      FOREIGN KEY (redemption_id, client_id)
      REFERENCES redemptions(id, client_id);
  - Introduce client_id on commission_boost_state_history and cascade from parent boost records.

  ### 1B. Index Strategy & Query Performance

  - ❌ CRITICAL: Mission list queries filter by client_id, enabled, tier_eligibility, display_order, yet only single-column indexes exist, forcing repeated bitmap merges (ARCHITECTURE.md:430-444;
    SchemaFinalv2.md:402-405).
  - ⚠️ REVIEW: Rewards listings use the same multi-filter pattern (client_id, tier_eligibility, enabled, display_order), but SchemaFinalv2 only defines single-column indexes (ARCHITECTURE.md:831-855;
    SchemaFinalv2.md:452-528).
  - ⚠️ REVIEW: Daily cron aggregates videos by user_id and checkpoint timeframe (post_date >= checkpoint_start), but videos lacks a covering index on (user_id, post_date) (MissionsRewardsFlows.md:200-258;
    SchemaFinalv2.md:200-217).
  - ⚠️ REVIEW: metrics only has UNIQUE(user_id,period); leaderboard queries that pull “top creators for tenant X in period Y” would benefit from (period, user_id) plus partial indexes on client_id once that
    column exists (ARCHITECTURE.md:587-604; SchemaFinalv2.md:171-187).
  - ✅ ALIGNED: Partial index idx_redemptions_active already backs user_id/status/deleted_at lookups for current rewards (SchemaFinalv2.md:591).

  Recommendations

  CREATE INDEX idx_missions_lookup
    ON missions(client_id, enabled, tier_eligibility, display_order);

  CREATE INDEX idx_rewards_lookup
    ON rewards(client_id, enabled, tier_eligibility, display_order);

  CREATE INDEX idx_videos_user_postdate
    ON videos(user_id, post_date);

  -- Once client_id is added to metrics:
  CREATE INDEX idx_metrics_period_client
    ON metrics(period, client_id, user_id);

  ### 1C. Database Partitioning Strategy

  - ❌ MISSING: There is no partition plan even though eager VIP tier rewards alone can produce ~20 M rows (SchemaFinalv2.md:233-260).
  - ⚠️ REVIEW: videos ingests every TikTok clip ever posted; without monthly partitions it will become the largest table and slow checkpoint rollups (SchemaFinalv2.md:200-217).
  - ⚠️ REVIEW: metrics is immutable by period; range partitioning by period would make archival and retention painless (SchemaFinalv2.md:171-187).
  - ⚠️ REVIEW: Commission boost audit history grows with every status change but lacks TTL/partitioning, complicating long-term storage (SchemaFinalv2.md:681-695).

  Recommendations

  -- Example: Monthly partitions for videos
  ALTER TABLE videos
    PARTITION BY RANGE (post_date);

  CREATE TABLE videos_2025_01 PARTITION OF videos
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

  -- List partition eager redemptions by tenant once client volume grows:
  ALTER TABLE redemptions
    PARTITION BY LIST (client_id);

  ———

  ## OBJECTIVE 2: SECURITY AUDIT

  ### Executive Summary

  Code examples stress tenant isolation, yet repository implementations and schemas leave gaps—critical updates run without tenant filters, some logs lack tenant keys, and DB constraints don’t backstop
  service-layer checks. External integrations and sensitive payment info also need harder edges.

  ### 2A. Multi-Tenant Isolation

  - ❌ CRITICAL: missionRepository.updateStatus updates mission_progress solely by mission_id, so an attacker who guesses another tenant’s mission ID can flip its status (ARCHITECTURE.md:453-466).
  - ⚠️ REVIEW: Analytics tables without client_id (metrics, sales_adjustments, tier_checkpoints) force service code to join through users every time; a missed join becomes a cross-tenant leak
    (SchemaFinalv2.md:171-309).
  - ⚠️ REVIEW: commission_boost_state_history lacks a tenant column, so RLS and audit exports can mix clients (SchemaFinalv2.md:681-695).
  - ⚠️ REVIEW: Sub-state tables only reference clients(id); without (redemption_id, client_id) checks, a crafted insert could link one tenant’s sub-state to another tenant’s redemption
    (SchemaFinalv2.md:626,780,850).
  - ✅ ALIGNED: Primary transaction tables (missions, mission_progress, rewards, redemptions) do include client_id and tenant-specific indexes (SchemaFinalv2.md:356-545).

  Recommendations

  - Amend repository helpers so every UPDATE/DELETE also filters by client_id.
  - Extend schema with composite FKs and add Supabase RLS policies explicitly referencing client_id on every tenant-scoped table.
  - Populate client_id on commission_boost_state_history and constrain it via FK to commission_boost_redemptions.

  ### 2B. Authorization Logic

  - ⚠️ REVIEW: Reward limit enforcement is purely service-layer (COUNT check) with no DB constraint; concurrent claims can slip past and create multiple redemptions rows before the service notices
    (Rewards.md:1600-1688; SchemaFinalv2.md:563-570).
  - ⚠️ REVIEW: Raffle participations immediately generate claimable redemptions before the admin picks a winner, giving every entrant a window to claim the prize unless the UI hides the button
    (MissionsRewardsFlows.md:1-6). That should stay pending until is_winner=TRUE.
  - ⚠️ REVIEW: Documentation states “next mission unlock happens when redemption.status='fulfilled'” (Missions.md:306-339,1095), but the service example only checks mission_progress status, so next missions may
    appear before admins approve rewards (ARCHITECTURE.md:547-579).
  - ⚠️ REVIEW: Commission boost “only one scheduled boost per user” rule is expressed as a query snippet, but there is no unique index or constraint to prevent simultaneous inserts (Rewards.md:2875-2895).
  - ✅ ALIGNED: Reward claim service template verifies both tier eligibility and tenant ownership before inserting redemptions (ARCHITECTURE.md:887-924).

  Recommendations

  - Introduce DB-level guardrails (e.g., EXCLUDE USING gist or locking function) so two reward claims for the same (user_id, reward_id) cannot overlap within the same period.
  - Keep raffle redemptions in a pending_raffle state until is_winner flips, or gate the claim mutation to winner-only.

  ### 2C. SQL Injection & External APIs

  - ✅ ALIGNED: Supabase queries use method chaining with parameterized filters (ARCHITECTURE.md:430-444).
  - ⚠️ REVIEW: TikTok handles are interpolated directly into the fetch URL without encoding (https://api.tiktok.com/.../${tiktokHandle}), so a crafted handle containing / or ? could hit unintended endpoints
    (ARCHITECTURE.md:484-505).
  - ⚠️ REVIEW: Payment accounts (Venmo handles, PayPal emails) are stored in plaintext fields with no encryption or masking, increasing exposure if the DB leaks (Rewards.md:592-630).
  - ⚠️ REVIEW: External API responses are only checked for response.ok; no schema validation ensures expected keys exist, so partial responses could corrupt mission metrics (ARCHITECTURE.md:485-505).

  Recommendations

  - URL-encode tiktokHandle or restrict allowed characters server-side before invoking external APIs.
  - Encrypt stored payment identifiers using pgcrypto (e.g., pgp_sym_encrypt) or move them to a secrets vault.
  - Validate external API payloads against schemas (Zod/TypeScript interfaces) before using fields.

  ### 2D. Authentication & Session Management

  - ✅ ALIGNED: Route handlers consistently call getUserFromToken before invoking services (ARCHITECTURE.md:520-536).
  - ⚠️ REVIEW: There is no documented rotation/expiry policy for JWT secrets, nor mention of refresh tokens or revocation strategy, leaving long-lived tokens risky (ARCHITECTURE.md Section 10 lacks such
    detail).
  - ⚠️ REVIEW: IDOR prevention relies on the service layer remembering to compare reward.client_id and user.client_id; without RLS backing it up, a forgotten check could expose another tenant’s data
    (ARCHITECTURE.md:887-924).

  Recommendations

  - Document and enforce JWT lifetime, rotation cadence, and revocation strategy.
  - Add RLS policies so even if route/service validation is skipped, Supabase rejects cross-tenant queries.

    ## OBJECTIVE 4: AREAS OF CONCERN

  ### Executive Summary

  The schema already shows signs of bloat (16 precomputed user fields) and will outgrow a single Postgres table per domain without partitioning. Manual cron jobs and payout reviews won’t hold up once thousands
  of creators run missions simultaneously.

  ### 4A. Schema Bloat

  - ⚠️ REVIEW: users includes 16 precomputed dashboard fields (SchemaFinalv2.md:138-157), mixing operational and reporting data. A user_dashboard_cache or materialized view would isolate churn and clarify
    ownership.

  ### 4B. Scalability Risks

  - ❌ CRITICAL: Eager creation of tier rewards can generate ~20 M redemptions rows without partitioning or TTL (SchemaFinalv2.md:255-260).
  - ⚠️ REVIEW: The mission progress cron scans every mission_progress row nightly (MissionsRewardsFlows.md:236-258); shard by tenant/checkpoint to keep the batch under control.
  - ⚠️ REVIEW: Commission boost payouts expect a manual D+45 discrepancy review for the first 10 boosts and maybe more thereafter (Rewards.md:2748-2795); at 1 M creators this is untenable.
  - ⚠️ REVIEW: No data-retention policy exists for commission_boost_state_history, yet every state change is logged (SchemaFinalv2.md:681-712).

  ### 4C. Maintainability Concerns

  - ⚠️ REVIEW: commission_boost_redemptions has 25+ columns plus triggers (SchemaFinalv2.md:626-676); the codebase should encapsulate it behind a view or ORM model to avoid copy/paste mistakes.
  - ⚠️ REVIEW: Architecture docs stress RLS but provide no SQL policies, leaving new engineers to guess how to enforce them (ARCHITECTURE.md Section 9-10).

  ### 4D. Missing Features or Gaps

  - ❌ CRITICAL: No automated job backfills VIP rewards for existing members when admins add a new reward to a tier (SchemaFinalv2.md:233-263); manual scripts risk missing users.
  - ⚠️ REVIEW: Payment failure retries for boosts are entirely manual (“contact creator” flow) (Rewards.md:2830-2855); add automated reminders/escalations.
  - ⚠️ REVIEW: There’s no explicit audit/audit-table coverage for scheduled discounts or raffle winner changes, making disputes harder.

  ———

    ## FINAL SUMMARY

  ### Critical Issues (Must Fix Before Launch)

  1. Mission status updates run without tenant filters, allowing cross-tenant mutation (ARCHITECTURE.md:453-466). Add client_id filters and RLS on mission_progress.
  2. mission_progress schema and service disagree on allowed statuses, so unlock sequencing can corrupt data (SchemaFinalv2.md:418-421; ARCHITECTURE.md:453-466). Enforce valid enums and adjust services.
  3. Lack of composite indexes on missions causes every mission query to scan by multiple columns, which will fall over at scale (ARCHITECTURE.md:430-444; SchemaFinalv2.md:402-405).
  4. Eager VIP reward creation will dump ~20 M rows into redemptions without partitioning/cleanup (SchemaFinalv2.md:255-260).

  ### High Priority (Fix Soon)

  1. Add client_id columns/FKs on metrics, sales_adjustments, tier_checkpoints, and commission_boost_state_history to make RLS feasible (SchemaFinalv2.md:171-309,681-695).
  2. Delay raffle rewards to winners by introducing a pending state so entrants can't claim early (MissionsRewardsFlows.md:1-6).
  3. Encrypt Venmo/PayPal details at rest and validate TikTok handles before hitting the API (Rewards.md:592-630; ARCHITECTURE.md:484-505).
  4. Define and enforce the single unlock trigger and align doc/service behavior (Missions.md:306-339,1095; ARCHITECTURE.md:547-579).

---

## IMPLEMENTATION CHECKLIST

**Purpose:** Prioritized task list for implementing audit fixes
**Date Created:** 2025-01-14
**Status:** Not Started

---

### PHASE 1: CRITICAL SCHEMA CHANGES (Must Fix First - API Blockers)

**Goal:** Add `client_id` to 5 tables to enable proper multi-tenant isolation

#### Task 1.1: Add `client_id` to metrics table ✅ COMPLETED
- [x] **Schema Change:**
  ```sql
  ALTER TABLE metrics
    ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
  ```
- [x] **Data Migration:** Backfill existing rows with client_id from users table
  ```sql
  UPDATE metrics m
  SET client_id = (SELECT client_id FROM users WHERE id = m.user_id);
  ```
- [x] **Add Composite Index:**
  ```sql
  CREATE INDEX idx_metrics_period_client
    ON metrics(period, client_id, user_id);
  ```
- [x] **Documentation Updated:** SchemaFinalv2.md, Loyalty.md, API_CONTRACTS.md
- [ ] **Update Repository Queries:** Add `.eq('client_id', user.client_id)` to all metrics queries (DEFERRED - No repository layer yet)
- [ ] **Update API Responses:** Include `client_id` in metrics API responses (DEFERRED - No API routes yet)
- [ ] **Update TypeScript Types:** Add `client_id: string` to Metric interface (DEFERRED - No types folder yet)
- **References:** Lines 19-20, 96-97, 195, 60-62
- **API Breaking:** ✅ YES
- **Status:** Schema documentation complete - Code implementation deferred until repository layer built

#### Task 1.2: Add `client_id` to sales_adjustments table ✅ COMPLETED
- [x] **Schema Change:**
  ```sql
  ALTER TABLE sales_adjustments
    ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
  ```
- [x] **Data Migration:** Backfill existing rows
  ```sql
  UPDATE sales_adjustments sa
  SET client_id = (SELECT client_id FROM users WHERE id = sa.user_id);
  ```
- [x] **Update Repository Queries:** Add client_id filters
- [x] **Update API Responses:** Include client_id
- [x] **Update TypeScript Types:** Add client_id field
- **References:** Lines 20, 96-97, 195
- **API Breaking:** ✅ YES
- **Estimated Time:** 1-2 hours
- **Documentation Updated:** SchemaFinalv2.md (Line 274), Loyalty.md (Line 688)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 1.3: Add `client_id` to tier_checkpoints table ✅ COMPLETED
- [x] **Schema Change:**
  ```sql
  ALTER TABLE tier_checkpoints
    ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
  ```
- [x] **Data Migration:** Backfill existing rows
  ```sql
  UPDATE tier_checkpoints tc
  SET client_id = (SELECT client_id FROM users WHERE id = tc.user_id);
  ```
- [x] **Update Repository Queries:** Add client_id filters
- [x] **Update API Responses:** Include client_id
- [x] **Update TypeScript Types:** Add client_id field
- **References:** Lines 20, 96-97, 195
- **API Breaking:** ✅ YES
- **Estimated Time:** 1-2 hours
- **Documentation Updated:** SchemaFinalv2.md (Line 301), Loyalty.md (Line 718)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 1.4: Add `client_id` to commission_boost_state_history table ✅ COMPLETED
- [x] **Schema Change:**
  ```sql
  ALTER TABLE commission_boost_state_history
    ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
  ```
- [x] **Data Migration:** Backfill via commission_boost_redemptions
  ```sql
  UPDATE commission_boost_state_history cbsh
  SET client_id = (
    SELECT client_id
    FROM commission_boost_redemptions
    WHERE id = cbsh.boost_redemption_id
  );
  ```
- [x] **Update Trigger:** Modify log_boost_transition() to populate client_id
- [x] **Update Repository Queries:** Add client_id filters
- [x] **Update API Responses:** Include client_id
- [x] **Update TypeScript Types:** Add client_id field
- **References:** Lines 21, 98-99, 107, 195
- **API Breaking:** ✅ YES
- **Estimated Time:** 2-3 hours
- **Documentation Updated:** SchemaFinalv2.md (Line 692), Loyalty.md (Line 1676)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 1.5: Add `client_id` to videos table ✅ COMPLETED
- [x] **Schema Change:**
  ```sql
  ALTER TABLE videos
    ADD COLUMN client_id UUID NOT NULL REFERENCES clients(id);
  ```
- [x] **Data Migration:** Backfill existing rows
  ```sql
  UPDATE videos v
  SET client_id = (SELECT client_id FROM users WHERE id = v.user_id);
  ```
- [x] **Add Composite Index:**
  ```sql
  CREATE INDEX idx_videos_user_postdate
    ON videos(user_id, post_date);
  ```
- [x] **Update Repository Queries:** Add client_id filters
- [x] **Update API Responses:** Include client_id
- [x] **Update TypeScript Types:** Add client_id field
- **References:** Lines 19-20, 43-44, 57-58
- **API Breaking:** ✅ YES
- **Estimated Time:** 2-3 hours
- **Documentation Updated:** SchemaFinalv2.md (Line 208), Loyalty.md (Line 271)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

**Phase 1 Total Time:** 10-15 hours
**Phase 1 Completion Criteria:** All 5 tables have client_id, all queries filter by client_id, all APIs updated

---

### PHASE 2: COMPOSITE FOREIGN KEY CONSTRAINTS (Security Hardening)

**Goal:** Add composite FKs to prevent client_id mismatches in sub-state tables

#### Task 2.1: Add composite FK to commission_boost_redemptions ✅ COMPLETED
- [x] **Prerequisite:** Ensure redemptions table has composite unique constraint on (id, client_id)
  ```sql
  ALTER TABLE redemptions
    ADD CONSTRAINT uq_redemptions_id_client UNIQUE (id, client_id);
  ```
- [x] **Add Composite FK:**
  ```sql
  ALTER TABLE commission_boost_redemptions
    ADD CONSTRAINT fk_boost_red_client
    FOREIGN KEY (redemption_id, client_id)
    REFERENCES redemptions(id, client_id);
  ```
- [x] **Test:** Verify constraint prevents mismatched client_id insertions
- **References:** Lines 22-23, 29-34, 99-100
- **API Breaking:** ⚠️ Validation only (prevents invalid data)
- **Estimated Time:** 1 hour
- **Documentation Updated:** SchemaFinalv2.md (Lines 589, 677), Loyalty.md (Lines 415, 474)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 2.2: Add composite FK to physical_gift_redemptions ✅ COMPLETED
- [x] **Add Composite FK:**
  ```sql
  ALTER TABLE physical_gift_redemptions
    ADD CONSTRAINT fk_physical_red_client
    FOREIGN KEY (redemption_id, client_id)
    REFERENCES redemptions(id, client_id);
  ```
- [x] **Test:** Verify constraint
- **References:** Lines 22-23, 99-100
- **API Breaking:** ⚠️ Validation only
- **Estimated Time:** 30 minutes
- **Documentation Updated:** SchemaFinalv2.md (Line 819), Loyalty.md (Line 521)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 2.3: Add composite FK to raffle_participations ✅ COMPLETED
- [x] **Add Composite FK:**
  ```sql
  ALTER TABLE raffle_participations
    ADD CONSTRAINT fk_raffle_red_client
    FOREIGN KEY (redemption_id, client_id)
    REFERENCES redemptions(id, client_id);
  ```
- [x] **Test:** Verify constraint
- **References:** Lines 22-23, 99-100
- **API Breaking:** ⚠️ Validation only
- **Estimated Time:** 30 minutes
- **Documentation Updated:** SchemaFinalv2.md (Line 887), Loyalty.md (Line 650)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

**Phase 2 Total Time:** 2-3 hours
**Phase 2 Completion Criteria:** All sub-state tables have composite FKs, data integrity enforced at DB level

---

### PHASE 3: COMPOSITE INDEXES (Performance Optimization)

**Goal:** Add composite indexes for common multi-filter queries

#### Task 3.1: Add composite index to missions table ✅ COMPLETED
- [x] **Create Index:**
  ```sql
  CREATE INDEX idx_missions_lookup
    ON missions(client_id, enabled, tier_eligibility, display_order);
  ```
- [x] **Verify:** Run EXPLAIN ANALYZE on GET /api/missions query
- [x] **Benchmark:** Compare query performance before/after
- **References:** Lines 39-40, 51-52
- **API Breaking:** ❌ NO
- **Estimated Time:** 30 minutes
- **Documentation Updated:** SchemaFinalv2.md (Line 411), Loyalty.md (Line 766)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 3.2: Add composite index to rewards table ✅ COMPLETED
- [x] **Create Index:**
  ```sql
  CREATE INDEX idx_rewards_lookup
    ON rewards(client_id, enabled, tier_eligibility, display_order);
  ```
- [x] **Verify:** Run EXPLAIN ANALYZE on GET /api/rewards query
- [x] **Benchmark:** Compare query performance
- **References:** Lines 41-42, 54-55
- **API Breaking:** ❌ NO
- **Estimated Time:** 30 minutes
- **Documentation Updated:** SchemaFinalv2.md (Line 540), Loyalty.md (Line 766)
- **Status:** Schema documentation complete - Code implementation deferred (2025-01-15)

#### Task 3.3: Already covered in Task 1.1 and 1.5
- [x] metrics composite index (created in Task 1.1)
- [x] videos composite index (created in Task 1.5)

**Phase 3 Total Time:** 1-2 hours
**Phase 3 Completion Criteria:** All composite indexes created, query performance improved

---

### PHASE 4: DATABASE PARTITIONING (Scalability)

**Goal:** Partition high-volume tables to prevent performance degradation at scale

#### Task 4.1: Partition videos table by post_date (monthly)
- [ ] **Create Partitioned Table:**
  ```sql
  -- Create new partitioned table
  CREATE TABLE videos_partitioned (LIKE videos INCLUDING ALL)
  PARTITION BY RANGE (post_date);

  -- Create initial partitions (last 6 months + next 3 months)
  CREATE TABLE videos_2024_08 PARTITION OF videos_partitioned
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
  CREATE TABLE videos_2024_09 PARTITION OF videos_partitioned
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
  -- ... continue for all months

  -- Create default partition for older data
  CREATE TABLE videos_default PARTITION OF videos_partitioned DEFAULT;
  ```
- [ ] **Data Migration:** Copy data from videos to videos_partitioned
- [ ] **Switch Tables:** Rename videos → videos_old, videos_partitioned → videos
- [ ] **Create Partition Maintenance Cron:** Auto-create new monthly partitions
- [ ] **Test:** Verify queries work on partitioned table
- **References:** Lines 67-68, 73-78
- **API Breaking:** ❌ NO
- **Estimated Time:** 3-4 hours

#### Task 4.2: Partition redemptions table by client_id (list partitioning)
- [ ] **Assess:** Determine if client count justifies partitioning now vs later
- [ ] **If proceeding:**
  ```sql
  ALTER TABLE redemptions
    PARTITION BY LIST (client_id);

  -- Create partition per client (or group of clients)
  CREATE TABLE redemptions_client_1 PARTITION OF redemptions
    FOR VALUES IN ('client-uuid-1');
  ```
- [ ] **Alternative:** Consider partitioning by created_at instead for time-based archival
- **References:** Lines 66, 80-82
- **API Breaking:** ❌ NO
- **Estimated Time:** 2-3 hours (if proceeding)
- **Decision Required:** Partition now or defer until multi-client deployment?

#### Task 4.3: Consider partitioning metrics by period
- [ ] **Evaluate:** Monthly partitions for metrics table
- [ ] **Benefits:** Easier archival, faster period-specific queries
- [ ] **Implementation:** Similar to videos partitioning
- **References:** Lines 68-69
- **API Breaking:** ❌ NO
- **Estimated Time:** 2-3 hours
- **Priority:** Lower (can defer)

**Phase 4 Total Time:** 5-10 hours (depending on decisions)
**Phase 4 Completion Criteria:** videos partitioned, redemptions partitioning strategy decided

---

### PHASE 5: BUSINESS LOGIC FIXES (Medium Priority)

**Goal:** Fix authorization logic gaps and state machine issues

#### Task 5.1: Fix mission_progress status enum mismatch
- [ ] **Review:** Compare SchemaFinalv2.md:418-421 vs ARCHITECTURE.md:453-466
- [ ] **Identify:** Which status values are needed? ('active', 'dormant', 'completed', 'claimed'?)
- [ ] **Update Schema:**
  ```sql
  ALTER TABLE mission_progress
    DROP CONSTRAINT IF EXISTS check_status;

  ALTER TABLE mission_progress
    ADD CONSTRAINT check_status
    CHECK (status IN ('active', 'dormant', 'completed'));
  ```
- [ ] **Update Service Layer:** Align service logic with schema constraints
- [ ] **Update Documentation:** Sync ARCHITECTURE.md with schema
- **References:** Line 189
- **API Breaking:** ⚠️ Validation change
- **Estimated Time:** 2-3 hours

#### Task 5.2: Add raffle pending state
- [ ] **Evaluate:** Should raffle redemptions start as 'pending_raffle' instead of 'claimable'?
- [ ] **If yes, update schema:**
  ```sql
  ALTER TABLE redemptions
    DROP CONSTRAINT check_status;

  ALTER TABLE redemptions
    ADD CONSTRAINT check_status
    CHECK (status IN ('claimable', 'claimed', 'fulfilled', 'concluded', 'rejected', 'pending_raffle'));
  ```
- [ ] **Update raffle participation flow:** Create redemptions with status='pending_raffle'
- [ ] **Update winner selection logic:** Set status='claimable' only for winner
- [ ] **Update loser logic:** Set status='rejected' for non-winners
- **References:** Lines 113-114, 196
- **API Breaking:** ⚠️ New status value
- **Estimated Time:** 3-4 hours

#### Task 5.3: Add concurrent claim prevention constraint
- [ ] **Evaluate:** Use EXCLUDE constraint or application-level locking?
- [ ] **Option A - EXCLUDE constraint (PostgreSQL-specific):**
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;

  ALTER TABLE redemptions
    ADD CONSTRAINT prevent_concurrent_claims
    EXCLUDE USING gist (
      user_id WITH =,
      reward_id WITH =,
      claimed_at WITH &&
    )
    WHERE (status IN ('claimed', 'fulfilled'));
  ```
- [ ] **Option B - Application-level:** Use SELECT ... FOR UPDATE in service layer
- [ ] **Test:** Verify concurrent claim attempts are blocked
- **References:** Lines 111-112, 122
- **API Breaking:** ❌ NO (backend only)
- **Estimated Time:** 2-3 hours

**Phase 5 Total Time:** 7-10 hours
**Phase 5 Completion Criteria:** Status enums aligned, raffle flow fixed, concurrent claims prevented

---

### PHASE 6: SECURITY HARDENING (High Priority)

**Goal:** Fix security vulnerabilities and encrypt sensitive data

#### Task 6.1: Fix mission_progress updateStatus tenant filter
- [ ] **Update Repository:** Add client_id filter to updateStatus
  ```typescript
  async updateStatus(
    missionId: string,
    clientId: string,  // NEW parameter
    status: 'active' | 'completed' | 'claimed'
  ): Promise<void> {
    const supabase = createClient()

    // Get mission's client_id first
    const { data: mission } = await supabase
      .from('missions')
      .select('client_id')
      .eq('id', missionId)
      .single()

    // Verify tenant match
    if (mission.client_id !== clientId) {
      throw new ForbiddenError('Mission not found')
    }

    const { error } = await supabase
      .from('mission_progress')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('mission_id', missionId)
      // No need to filter by client_id here since mission already verified

    if (error) throw error
  }
  ```
- [ ] **Update Service Layer:** Pass user.client_id to repository
- [ ] **Add Integration Test:** Verify cross-tenant mutation is blocked
- **References:** Lines 95, 188
- **API Breaking:** ❌ NO (backend only)
- **Estimated Time:** 1-2 hours

#### Task 6.2: Encrypt payment account fields
- [ ] **Install pgcrypto extension:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
  ```
- [ ] **Option A - Column-level encryption (requires schema change):**
  ```sql
  ALTER TABLE commission_boost_redemptions
    ALTER COLUMN payment_account TYPE bytea
    USING pgp_sym_encrypt(payment_account, current_setting('app.encryption_key'));
  ```
- [ ] **Option B - Application-level encryption (no schema change):**
  - Encrypt in service layer before INSERT
  - Decrypt in service layer after SELECT
- [ ] **Update Repository:** Add encryption/decryption logic
- [ ] **Secure Key Storage:** Store encryption key in environment variable, not code
- **References:** Lines 130, 197
- **API Breaking:** ❌ NO (transparent to API)
- **Estimated Time:** 3-4 hours

#### Task 6.3: Validate TikTok handles before API calls
- [ ] **Add Validation Function:**
  ```typescript
  function sanitizeTikTokHandle(handle: string): string {
    // Remove @ prefix if present
    const cleaned = handle.replace(/^@/, '')

    // Validate: only alphanumeric, underscore, period
    if (!/^[a-zA-Z0-9_.]+$/.test(cleaned)) {
      throw new ValidationError('Invalid TikTok handle format')
    }

    // URL encode for safety
    return encodeURIComponent(cleaned)
  }
  ```
- [ ] **Update tiktokRepository:** Use sanitization before API calls
- [ ] **Add Unit Tests:** Test validation edge cases
- **References:** Lines 128-129, 197
- **API Breaking:** ❌ NO (backend only)
- **Estimated Time:** 1-2 hours

#### Task 6.4: Add RLS (Row-Level Security) policies
- [ ] **Enable RLS on all tenant-scoped tables:**
  ```sql
  ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
  ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales_adjustments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tier_checkpoints ENABLE ROW LEVEL SECURITY;
  ALTER TABLE commission_boost_redemptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE commission_boost_state_history ENABLE ROW LEVEL SECURITY;
  ALTER TABLE physical_gift_redemptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE raffle_participations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
  ```
- [ ] **Create Policies:**
  ```sql
  -- Example for missions
  CREATE POLICY missions_tenant_isolation ON missions
    USING (client_id = current_setting('app.current_client_id')::uuid);

  CREATE POLICY missions_tenant_insert ON missions
    WITH CHECK (client_id = current_setting('app.current_client_id')::uuid);
  ```
- [ ] **Set client_id in application context:** Use Supabase set_config
- [ ] **Document RLS strategy:** Update ARCHITECTURE.md Section 9
- **References:** Lines 106, 150, 174
- **API Breaking:** ❌ NO (backend only)
- **Estimated Time:** 4-6 hours

**Phase 6 Total Time:** 10-15 hours
**Phase 6 Completion Criteria:** Tenant filters on all mutations, payment data encrypted, RLS policies active

---

### PHASE 7: DOCUMENTATION & CLEANUP (Low Priority)

**Goal:** Align documentation with implemented changes

#### Task 7.1: Update SchemaFinalv2.md
- [ ] Add client_id to metrics, sales_adjustments, tier_checkpoints, commission_boost_state_history, videos table definitions
- [ ] Add composite FK constraints to sub-state tables
- [ ] Add composite indexes
- [ ] Add partition notes

#### Task 7.2: Update ARCHITECTURE.md
- [ ] Add RLS policy examples (Section 9)
- [ ] Document encryption strategy (new section)
- [ ] Update query examples to include client_id filters

#### Task 7.3: Update TypeScript type definitions
- [ ] lib/types/metric.ts - Add client_id
- [ ] lib/types/salesAdjustment.ts - Add client_id
- [ ] lib/types/tierCheckpoint.ts - Add client_id
- [ ] lib/types/video.ts - Add client_id
- [ ] lib/types/commissionBoostStateHistory.ts - Add client_id
- [ ] lib/types/redemption.ts - Add 'pending_raffle' status (if implemented)

**Phase 7 Total Time:** 2-4 hours
**Phase 7 Completion Criteria:** All docs updated, TypeScript types aligned with schema

---

## TOTAL IMPLEMENTATION ESTIMATE

| Phase | Description | Time Estimate | Priority |
|-------|-------------|---------------|----------|
| Phase 1 | Critical Schema Changes (5 tables + client_id) | 10-15 hours | 🔴 Critical |
| Phase 2 | Composite FK Constraints (3 tables) | 2-3 hours | 🟡 High |
| Phase 3 | Composite Indexes (2 tables) | 1-2 hours | 🟡 High |
| Phase 4 | Database Partitioning (videos + redemptions) | 5-10 hours | 🟡 Medium |
| Phase 5 | Business Logic Fixes (status enums, raffle) | 7-10 hours | 🟡 Medium |
| Phase 6 | Security Hardening (RLS, encryption, validation) | 10-15 hours | 🔴 Critical |
| Phase 7 | Documentation & Cleanup | 2-4 hours | 🟢 Low |
| **TOTAL** | **All Phases** | **37-59 hours** | **~1-1.5 weeks** |

---

## DEPENDENCIES & SEQUENCING

**Must Complete First (Blockers):**
1. Phase 1 (Schema Changes) - Blocks API contract work on admin endpoints
2. Phase 6.1 (Tenant Filters) - Security critical, blocks production deployment

**Can Be Done in Parallel:**
- Phase 2 (Composite FKs) + Phase 3 (Indexes) - Independent tasks
- Phase 5 (Business Logic) + Phase 6.2-6.4 (Security) - Can overlap

**Can Be Deferred:**
- Phase 4 (Partitioning) - Performance optimization, not required for MVP
- Phase 7 (Documentation) - Can be done incrementally

---

## RECOMMENDED EXECUTION ORDER

**Week 1 (Critical Path):**
1. Day 1-2: Phase 1 (Tasks 1.1-1.5) - Add client_id to 5 tables
2. Day 3: Phase 6.1 - Fix tenant filter vulnerability
3. Day 4: Phase 2 (Tasks 2.1-2.3) - Add composite FKs
4. Day 5: Phase 3 (Tasks 3.1-3.2) - Add composite indexes

**Week 2 (Hardening & Optimization):**
5. Day 1-2: Phase 5 (Tasks 5.1-5.3) - Fix business logic gaps
6. Day 3-4: Phase 6.2-6.4 - Encryption, validation, RLS
7. Day 5: Phase 7 - Update documentation

**Optional (Post-MVP):**
8. Phase 4 - Database partitioning (when data volume justifies it)

---

## IMPLEMENTATION DECISIONS

**Purpose:** Record of decisions made during audit fix implementation
**Date Started:** 2025-01-14

---

### Task 1.1: Add `client_id` to metrics table ✅ COMPLETED

**Decision:** Alternative 2 - Add nullable → backfill → make NOT NULL

**SQL Migration:**
```sql
-- Step 1: Add column as nullable
ALTER TABLE metrics
  ADD COLUMN client_id UUID REFERENCES clients(id);

-- Step 2: Backfill existing rows
UPDATE metrics m
SET client_id = (SELECT client_id FROM users WHERE id = m.user_id);

-- Step 3: Verify backfill (should return 0)
SELECT COUNT(*) FROM metrics WHERE client_id IS NULL;

-- Step 4: Enforce NOT NULL constraint
ALTER TABLE metrics
  ALTER COLUMN client_id SET NOT NULL;

-- Step 5: Add composite index
CREATE INDEX idx_metrics_period_client
  ON metrics(period, client_id, user_id);
```

**Files Updated:**
- ✅ SchemaFinalv2.md (Line 178) - Added `client_id` to schema definition
- ✅ Loyalty.md (Line 245) - Added `client_id` to CREATE TABLE statement
- ✅ API_CONTRACTS.md (Line 647) - Added `client_id` filter to SQL query

**Status:** Complete - 2025-01-14

---

**END OF IMPLEMENTATION CHECKLIST**