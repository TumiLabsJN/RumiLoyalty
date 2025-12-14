# RumiAI Loyalty Platform: LLM Execution Plan
# Version: 1.0
# Status: Not Started

---

## RULES OF ENGAGEMENT (For Executing LLM)

### Core Protocol
1. **READ EXECUTION_STATUS.md FIRST** before starting any work (contains current task, CR workflow, sequential enforcement)
2. Execute this plan SEQUENTIALLY - do not skip tasks
3. Before EVERY task, READ the specified documentation references
4. Do NOT implement based on general knowledge - ONLY from referenced docs
5. Mark checkbox `[x]` ONLY after Acceptance Criteria verified
6. If task fails, STOP and report: Task ID + Failure reason
7. Commit after completing each task: "Complete: [Task ID] - [Description]"

### Anti-Hallucination Rules
- FORBIDDEN: Implementing features not in API_CONTRACTS.md
- FORBIDDEN: Assuming schema structure without reading SchemaFinalv2.md
- FORBIDDEN: Skipping RLS policies
- FORBIDDEN: Omitting client_id in queries
- REQUIRED: Read documentation section before implementation
- REQUIRED: Verify against API contracts before marking complete

### Decision Authority (CRITICAL)
- FORBIDDEN: Making architectural decisions not explicitly in source docs
- FORBIDDEN: Converting data types (e.g., VARCHAR to ENUM) without explicit instruction
- FORBIDDEN: Adding patterns/abstractions not specified in documentation
- FORBIDDEN: "Improving" or "optimizing" beyond what's written
- **IF AMBIGUOUS: STOP and ask user before proceeding**
- **IF DOCS CONFLICT WITH TASK: STOP and ask user which to follow**

### Operational Procedures
**All session management, CR workflows, and sequential enforcement rules live in EXECUTION_STATUS.md.**

---

## GLOBAL PHASE CHECKLIST

- [ ] Phase 0: Documentation Review & Environment Setup
- [ ] Phase 1: Database Foundation (Schema, RLS, Triggers, Seeds)
- [ ] Phase 2: Shared Libraries (Types, Clients, Utils)
- [ ] Phase 3: Authentication System (Repos, Services, Routes, Testing, Security Infrastructure)
- [ ] Phase 4: Dashboard APIs
- [ ] Phase 5: Missions System
- [x] Phase 6: Rewards System
- [ ] Phase 7: History & Tiers APIs (Step 7.1 complete)
- [ ] Phase 8: Automation & Cron Jobs
- [ ] Phase 9: Frontend Integration (MSW → Real APIs)
- [ ] Phase 10: Testing & CI/CD
- [ ] Phase 11: Final Audit & Verification
- [ ] Phase 12: Admin System (Dashboard, Redemptions, Missions, VIP Rewards, Sales Adjustments, Creator Lookup, Data Sync, Reports)

---

# PHASE 0: DOCUMENTATION REVIEW & ENVIRONMENT SETUP

**Objective:** Establish foundation and confirm complete understanding of requirements before writing any code.

## Step 0.1: Documentation Audit
- [x] **Task 0.1.1:** Read Loyalty.md (3,071 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/Loyalty.md`
    - **Focus:** Lines 2019-2182 (9 Critical Patterns), Lines 374-2017 (10 Data Flows)
    - **Acceptance Criteria:** Create summary document listing all 9 patterns and 10 flows
    - **Output:** `/home/jorge/Loyalty/Rumi/LOYALTY_SUMMARY.md`

- [x] **Task 0.1.2:** Read SchemaFinalv2.md (996 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
    - **Focus:** All table definitions, RLS policies (lines 711-790), triggers
    - **Acceptance Criteria:** Create table dependency graph showing FK relationships
    - **Output:** `/home/jorge/Loyalty/Rumi/SCHEMA_DEPENDENCY_GRAPH.md`

- [x] **Task 0.1.3:** Read MissionsRewardsFlows.md (527 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/MissionsRewardsFlows.md`
    - **Focus:** 6 mission types, 6 reward types, state machines
    - **Acceptance Criteria:** Document all valid state transitions
    - **Output:** `/home/jorge/Loyalty/Rumi/STATE_TRANSITIONS.md`

- [x] **Task 0.1.4:** Read ARCHITECTURE.md (1,433 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/ARCHITECTURE.md`
    - **Focus:** 3-layer pattern, Section 9 (security), folder structure
    - **Acceptance Criteria:** Confirm understanding of repository → service → route pattern
    - **Output:** Confirmation added to `/home/jorge/Loyalty/Rumi/LOYALTY_SUMMARY.md`

- [x] **Task 0.1.5:** Read API_CONTRACTS.md (4,906 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
    - **Focus:** All 23 endpoints with request/response schemas
    - **Acceptance Criteria:** Create checklist of all 23 endpoints
    - **Output:** `/home/jorge/Loyalty/Rumi/API_ENDPOINTS_CHECKLIST.md`

## Step 0.2: Environment Setup
- [x] **Task 0.2.1:** Initialize Supabase project
    - **Command:** `supabase init`
    - **References:** Loyalty.md lines 38-40 (Supabase PostgreSQL, Auth, Storage)
    - **Acceptance Criteria:** `/supabase` directory exists

- [x] **Task 0.2.2a:** Extract Tech Stack dependencies from documentation
    - **Action:** Read Loyalty.md lines 17-49 (Tech Stack section)
    - **Action:** Extract ALL npm packages from Frontend subsection (lines 19-26) and Backend subsection (lines 28-36)
    - **Action:** Create comprehensive list of packages to install
    - **References:** `/home/jorge/Loyalty/Rumi/Loyalty.md` lines 17-49
    - **Acceptance Criteria:** List includes ~15+ packages: Frontend (react-hook-form, lucide-react, date-fns, tailwindcss, shadcn/ui), Backend (@supabase/supabase-js, puppeteer, csv-parse, resend, googleapis, luxon), Development (zod, vitest, playwright, @upstash/ratelimit), Dev Tools (eslint, prettier)
    - **Output:** `/home/jorge/Loyalty/Rumi/TECH_STACK_DEPENDENCIES.md`

- [x] **Task 0.2.2b:** Install all dependencies
    - **Command:** `npm install [all-packages-from-task-0.2.2a]`
    - **Acceptance Criteria:** All packages from Tech Stack documented in `package.json`
    - **Verification:** Run `npm list --depth=0` to confirm all installed
    - **Note:** Created Next.js project in `/home/jorge/Loyalty/Rumi/app/`

- [x] **Task 0.2.2c:** Verify Node.js version requirement
    - **Command:** `node --version`
    - **References:** Loyalty.md line 44 (Node.js 20+ LTS requirement)
    - **Acceptance Criteria:** Output shows v20.x.x or higher
    - **Result:** v22.16.0 ✅

- [x] **Task 0.2.3:** Configure environment variables
    - **Action:** Create `.env.local` with: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY
    - **References:** Loyalty.md line 2172 (ENCRYPTION_KEY requirement), Supabase documentation for connection vars
    - **Acceptance Criteria:** All required env vars set, `.env.local` in `.gitignore`

- [x] **Task 0.2.3a:** Add CRUVA credentials to environment variables
    - **Action:** Add to `.env.local`: CRUVA_USERNAME, CRUVA_PASSWORD, CRUVA_LOGIN_URL (platform URL for Puppeteer authentication)
    - **References:** Loyalty.md lines 73-83 (CRUVA TikTok Analytics Platform), lines 425-427 (Flow 1: Puppeteer logs into CRUVA)
    - **Acceptance Criteria:** CRUVA credentials stored securely in `.env.local`, not committed to git, ready for Puppeteer automation

- [x] **Task 0.2.4:** Configure ESLint and Prettier
    - **Action:** Create `.eslintrc.json` and `.prettierrc` configuration files
    - **References:** Loyalty.md line 47 (Development Tools)
    - **Acceptance Criteria:** ESLint and Prettier configured, can run `npm run lint` successfully

- [x] **Task 0.2.5:** Configure Supabase Storage for logo uploads
    - **Action:** Create storage bucket for client logos (public read, admin write, 2MB max)
    - **References:** Loyalty.md lines 40, 103-109 (Supabase Storage section)
    - **Acceptance Criteria:** Bucket created named 'logos', RLS policy allows public read
    - **Note:** Configured in supabase/config.toml, bucket created on supabase start or db push

- [x] **Task 0.2.6:** Link Supabase project
    - **Command:** `supabase link --project-ref vyvkvlhzzglfklrwzcby`
    - **Acceptance Criteria:** Command succeeds with exit code 0

- [x] **Task 0.2.7:** Configure Supabase Auth session duration
    - **Action:** Set JWT expiry to 7 days (604800 seconds) in Supabase Dashboard → Project Settings → Auth
    - **References:** Loyalty.md lines 2348 (Session Duration)
    - **Acceptance Criteria:** Supabase Auth JWT expiry set to 604800 seconds (7 days - Supabase maximum)

---

# PHASE 1: DATABASE FOUNDATION

**Objective:** Create complete, verified database schema with RLS, triggers, and seed data.

## Step 1.1: Schema Migration - Core Tables
- [x] **Task 1.1.1:** Create initial migration file
    - **Command:** `supabase migration new initial_schema`
    - **References:** SchemaFinalv2.md
    - **Acceptance Criteria:** New empty migration file in `/supabase/migrations/`
    - **Output:** `supabase/migrations/20251128173733_initial_schema.sql`

- [x] **Task 1.1.2:** ~~Add ENUM types to migration~~ SKIPPED
    - **Action:** ~~Add all CREATE TYPE statements for mission_type, mission_status, reward_type, etc.~~
    - **References:** SchemaFinalv2.md lines 1-50 (enum definitions)
    - **Acceptance Criteria:** ~~Migration contains all enum types~~
    - **Decision:** SchemaFinalv2.md uses VARCHAR(50) with CHECK constraints, not ENUMs. Task skipped per user direction to follow source doc.

- [x] **Task 1.1.3:** Add `clients` table
    - **Action:** Add CREATE TABLE for clients with uuid primary key
    - **References:** SchemaFinalv2.md lines 106-120 (clients table)
    - **Acceptance Criteria:** MUST have vip_metric VARCHAR(10) NOT NULL DEFAULT 'units' with options ('units', 'sales'), MUST have tier_calculation_mode VARCHAR(50) DEFAULT 'fixed_checkpoint' with options ('fixed_checkpoint', 'lifetime'), MUST have checkpoint_months INTEGER DEFAULT 4, MUST have logo_url TEXT, MUST have primary_color VARCHAR(7) DEFAULT '#6366f1', MUST have subdomain VARCHAR(100) UNIQUE

- [x] **Task 1.1.4:** Add `tiers` table
    - **Action:** Add CREATE TABLE with FK to clients
    - **References:** SchemaFinalv2.md lines 250-268 (tiers table)
    - **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id), MUST have tier_order INTEGER NOT NULL (1-6), MUST have tier_id VARCHAR(50) NOT NULL ('tier_1' through 'tier_6'), MUST have tier_name VARCHAR(100) NOT NULL, MUST have tier_color VARCHAR(7) NOT NULL, MUST have sales_threshold DECIMAL(10,2) and units_threshold INTEGER (mutually exclusive), MUST have commission_rate DECIMAL(5,2) NOT NULL, MUST have checkpoint_exempt BOOLEAN DEFAULT false, MUST have UNIQUE(client_id, tier_order) and UNIQUE(client_id, tier_id)

- [x] **Task 1.1.5:** Add `users` table
    - **Action:** Add CREATE TABLE with FK to clients
    - **References:** SchemaFinalv2.md lines 123-155 (users table)
    - **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id), MUST have tiktok_handle VARCHAR(100) NOT NULL, MUST have email VARCHAR(255) NULLABLE, MUST have password_hash VARCHAR(255) NOT NULL, MUST have is_admin BOOLEAN DEFAULT false, MUST have current_tier VARCHAR(50) DEFAULT 'tier_1', MUST have tier_achieved_at and next_checkpoint_at TIMESTAMP fields, MUST have 3 payment info fields (default_payment_method, default_payment_account, payment_info_updated_at)

- [x] **Task 1.1.5a:** Add 16 precomputed fields to `users` table
    - **Action:** Add columns for dashboard/leaderboard performance optimization: leaderboard_rank (integer), total_sales (numeric), total_units (integer), manual_adjustments_total (numeric), manual_adjustments_units (integer), checkpoint_sales_current (numeric), checkpoint_units_current (integer), projected_tier_at_checkpoint (uuid), checkpoint_videos_posted (integer), checkpoint_total_views (bigint), checkpoint_total_likes (bigint), checkpoint_total_comments (bigint), next_tier_name (varchar), next_tier_threshold (numeric), next_tier_threshold_units (integer), checkpoint_progress_updated_at (timestamp)
    - **References:** ARCHITECTURE.md Section 3.1 (Precomputed Fields, lines 120-152), SchemaFinalv2.md (users table)
    - **Acceptance Criteria:** All 16 precomputed fields added with appropriate data types and NULL defaults, enables 5-6x faster dashboard queries per ARCHITECTURE.md performance targets

- [x] **Task 1.1.5b:** Add `otp_codes` table
    - **Action:** Add CREATE TABLE with FK to users
    - **References:** SchemaFinalv2.md lines 158-184 (otp_codes table), API_CONTRACTS.md lines 320-437 (signup OTP flow), lines 709-722 (verify-otp fields)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id) ON DELETE CASCADE, MUST have session_id VARCHAR(100) NOT NULL UNIQUE, MUST have code_hash VARCHAR(255) NOT NULL, MUST have expires_at TIMESTAMP NOT NULL, MUST have attempts INTEGER DEFAULT 0, MUST have used BOOLEAN DEFAULT false, MUST have indexes on session_id and expires_at per lines 172-176

- [x] **Task 1.1.5c:** Add `password_reset_tokens` table
    - **Action:** Add CREATE TABLE with FK to users
    - **References:** SchemaFinalv2.md lines 187-220 (password_reset_tokens table), API_CONTRACTS.md lines 1587-1614 (forgot-password fields), lines 1745-1756 (reset-password fields)
    - **Acceptance Criteria:** MUST have user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, MUST have token_hash VARCHAR(255) NOT NULL, MUST have expires_at TIMESTAMP NOT NULL (15 minutes from creation), MUST have used_at TIMESTAMP NULLABLE, MUST have ip_address VARCHAR(45) NULLABLE, MUST have indexes on token_hash, user_id, and expires_at per lines 200-203

- [x] **Task 1.1.6:** Add `videos` table
    - **Action:** Add CREATE TABLE with FKs to clients and users
    - **References:** SchemaFinalv2.md lines 223-248 (videos table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id), MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have video_url TEXT UNIQUE NOT NULL, MUST have post_date DATE NOT NULL, MUST have views/likes/comments INTEGER DEFAULT 0, MUST have gmv DECIMAL(10,2) DEFAULT 0, MUST have units_sold INTEGER DEFAULT 0, MUST have sync_date TIMESTAMP NOT NULL

- [x] **Task 1.1.7:** Add `sales_adjustments` table
    - **Action:** Add CREATE TABLE with FKs to clients and users
    - **References:** SchemaFinalv2.md lines 271-286 (sales_adjustments table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id), MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have amount DECIMAL(10,2) and amount_units INTEGER (mutually exclusive), MUST have reason TEXT NOT NULL, MUST have adjustment_type VARCHAR(50) NOT NULL with options ('manual_sale', 'refund', 'bonus', 'correction'), MUST have adjusted_by UUID REFERENCES users(id), MUST have applied_at TIMESTAMP NULLABLE

- [x] **Task 1.1.8:** Add `tier_checkpoints` table
    - **Action:** Add CREATE TABLE with FKs to clients and users
    - **References:** SchemaFinalv2.md lines 289-308 (tier_checkpoints table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id), MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have checkpoint_date/period_start_date/period_end_date TIMESTAMP NOT NULL, MUST have sales_in_period/sales_required DECIMAL(10,2) and units_in_period/units_required INTEGER (mode-dependent), MUST have tier_before/tier_after VARCHAR(50) NOT NULL, MUST have status VARCHAR(50) NOT NULL with options ('maintained', 'promoted', 'demoted')

- [x] **Task 1.1.9:** Add `handle_changes` table
    - **Action:** Add CREATE TABLE with FK to users
    - **References:** SchemaFinalv2.md lines 311-324 (handle_changes table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id), MUST have old_handle/new_handle VARCHAR(100) NOT NULL, MUST have detected_at TIMESTAMP DEFAULT NOW(), MUST have resolved_by UUID REFERENCES users(id) NULLABLE, MUST have resolved_at TIMESTAMP NULLABLE

- [x] **Task 1.1.10:** Add `sync_logs` table
    - **Action:** Add CREATE TABLE with FK to clients and triggered_by FK to users
    - **References:** SchemaFinalv2.md lines 328-352 (sync_logs table)
    - **Acceptance Criteria:** MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have status VARCHAR(50) NOT NULL DEFAULT 'running' with options ('running', 'success', 'failed'), MUST have source VARCHAR(50) NOT NULL DEFAULT 'auto' with options ('auto', 'manual'), MUST have started_at TIMESTAMP NOT NULL DEFAULT NOW(), MUST have completed_at TIMESTAMP NULLABLE, MUST have records_processed INTEGER DEFAULT 0, MUST have error_message TEXT NULLABLE, MUST have file_name VARCHAR(255) NULLABLE, MUST have triggered_by UUID REFERENCES users(id) NULLABLE, MUST have indexes per lines 346-350 (idx_sync_logs_client, idx_sync_logs_status, idx_sync_logs_recent)

## Step 1.2: Schema Migration - Missions Tables
- [x] **Task 1.2.1:** Add `missions` table
    - **Action:** Add CREATE TABLE with FK to clients, reward FK
    - **References:** SchemaFinalv2.md lines 358-417 (missions table)
    - **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id) ON DELETE CASCADE, MUST have mission_type VARCHAR(50) NOT NULL with options ('sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle'), MUST have target_value INTEGER NOT NULL, MUST have target_unit VARCHAR(20) NOT NULL DEFAULT 'dollars' with options ('dollars', 'units', 'count'), MUST have reward_id UUID NOT NULL REFERENCES rewards(id), MUST have tier_eligibility VARCHAR(50) NOT NULL with options ('all', 'tier_1'-'tier_6'), MUST have preview_from_tier VARCHAR(50) NULL, MUST have display_order INTEGER NOT NULL, MUST have raffle_end_date TIMESTAMP NULL (required for raffle type), MUST have CHECK constraints per lines 383-407, MUST have UNIQUE(client_id, tier_eligibility, mission_type, display_order), MUST have indexes per lines 410-417

- [x] **Task 1.2.2:** Add `mission_progress` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, missions
    - **References:** SchemaFinalv2.md lines 421-455 (mission_progress table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id) ON DELETE CASCADE, MUST have mission_id UUID REFERENCES missions(id) ON DELETE CASCADE, MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have current_value INTEGER DEFAULT 0, MUST have status VARCHAR(50) DEFAULT 'active' with options ('active', 'dormant', 'completed'), MUST have completed_at TIMESTAMP NULLABLE, MUST have checkpoint_start TIMESTAMP (never updated after creation), MUST have checkpoint_end TIMESTAMP (mission deadline), MUST have UNIQUE(user_id, mission_id, checkpoint_start) constraint per line 446, MUST have indexes per lines 449-454

- [x] **Task 1.2.3:** Add `raffle_participations` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, missions, mission_progress, redemptions
    - **References:** SchemaFinalv2.md lines 888-953 (raffle_participations table)
    - **Acceptance Criteria:** MUST have mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE, MUST have user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, MUST have mission_progress_id UUID NOT NULL REFERENCES mission_progress(id) ON DELETE CASCADE, MUST have redemption_id UUID NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE, MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have composite FK (redemption_id, client_id) REFERENCES redemptions(id, client_id) per line 944, MUST have participated_at TIMESTAMP NOT NULL DEFAULT NOW(), MUST have is_winner BOOLEAN (NULL = not picked, TRUE = won, FALSE = lost) per line 923, MUST have winner_selected_at TIMESTAMP and selected_by UUID REFERENCES users(id) for audit trail, MUST have UNIQUE(mission_id, user_id) constraint per line 936, MUST have CHECK constraint ensuring is_winner and winner_selected_at are both NULL or both NOT NULL per lines 938-941, MUST have indexes per lines 949-953

## Step 1.3: Schema Migration - Rewards Tables
- [x] **Task 1.3.1:** Add `rewards` table (created before missions for FK dependency)
    - **Action:** Add CREATE TABLE with FK to clients, tier restrictions
    - **References:** SchemaFinalv2.md lines 458-586 (rewards table)
    - **Acceptance Criteria:** MUST have client_id UUID REFERENCES clients(id) ON DELETE CASCADE, MUST have type VARCHAR(100) NOT NULL with options ('gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'), MUST have value_data JSONB (structure per lines 482-514), MUST have reward_source VARCHAR(50) NOT NULL DEFAULT 'mission' with options ('vip_tier', 'mission'), MUST have tier_eligibility VARCHAR(50) NOT NULL with options ('tier_1'-'tier_6'), MUST have preview_from_tier VARCHAR(50) DEFAULT NULL, MUST have redemption_frequency VARCHAR(50) DEFAULT 'unlimited' with options ('one-time', 'monthly', 'weekly', 'unlimited'), MUST have redemption_quantity INTEGER DEFAULT 1 (1-10 or NULL for unlimited), MUST have redemption_type VARCHAR(50) NOT NULL DEFAULT 'instant' with options ('instant', 'scheduled'), MUST have enabled BOOLEAN DEFAULT false, MUST have display_order INTEGER, MUST have CHECK constraint check_reward_source per lines 549-551, MUST have CHECK constraint check_quantity_with_frequency per lines 553-556, MUST have CHECK constraint check_preview_tier per lines 558-561, MUST have CHECK constraint check_discount_value_data per lines 563-574 (percent 1-100, duration_minutes 10-525600, coupon_code 2-8 chars uppercase alphanumeric, max_uses > 0 or NULL), MUST have indexes per lines 577-586

- [x] **Task 1.3.2:** Add `redemptions` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, rewards, mission_progress
    - **References:** SchemaFinalv2.md lines 590-661 (redemptions table)
    - **Acceptance Criteria:** MUST have user_id UUID REFERENCES users(id) ON DELETE CASCADE, MUST have reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE, MUST have mission_progress_id UUID REFERENCES mission_progress(id) ON DELETE CASCADE (NULL for VIP tier rewards, NOT NULL for mission rewards), MUST have client_id UUID REFERENCES clients(id) ON DELETE CASCADE, MUST have status VARCHAR(50) DEFAULT 'claimable' with options ('claimable', 'claimed', 'fulfilled', 'concluded', 'rejected'), MUST have tier_at_claim VARCHAR(50) NOT NULL, MUST have redemption_type VARCHAR(50) NOT NULL with options ('instant', 'scheduled'), MUST have claimed_at TIMESTAMP, MUST have scheduled_activation_date DATE and scheduled_activation_time TIME, MUST have activation_date TIMESTAMP and expiration_date TIMESTAMP, MUST have google_calendar_event_id VARCHAR(255), MUST have fulfilled_at TIMESTAMP and fulfilled_by UUID REFERENCES users(id) and fulfillment_notes TEXT, MUST have concluded_at TIMESTAMP, MUST have rejection_reason TEXT and rejected_at TIMESTAMP, MUST have external_transaction_id VARCHAR(255), MUST have deleted_at TIMESTAMP and deleted_reason VARCHAR(100) for soft delete, MUST have CHECK constraint redemption_type IN ('instant', 'scheduled') per line 632, MUST have UNIQUE constraints per lines 635-643, MUST have UNIQUE(id, client_id) for composite FK support, MUST have indexes per lines 647-658

- [x] **Task 1.3.3:** Add `commission_boost_redemptions` table
    - **Action:** Add CREATE TABLE with composite FK to redemptions(id, client_id)
    - **References:** SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table)
    - **Acceptance Criteria:** MUST have redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE (ONE-TO-ONE), MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have composite FK (redemption_id, client_id) REFERENCES redemptions(id, client_id) per line 733, MUST have boost_status VARCHAR(50) NOT NULL DEFAULT 'scheduled' with options ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'), MUST have scheduled_activation_date DATE NOT NULL, MUST have activated_at TIMESTAMP and expires_at TIMESTAMP, MUST have duration_days INTEGER NOT NULL DEFAULT 30, MUST have boost_rate DECIMAL(5,2) NOT NULL and tier_commission_rate DECIMAL(5,2), MUST have sales_at_activation/sales_at_expiration DECIMAL(10,2), MUST have sales_delta DECIMAL(10,2) GENERATED ALWAYS AS (GREATEST(0, sales_at_expiration - sales_at_activation)) STORED, MUST have calculated_commission/admin_adjusted_commission/final_payout_amount DECIMAL(10,2), MUST have payment_method VARCHAR(20) with options ('venmo', 'paypal'), MUST have payment_account/payment_account_confirm VARCHAR(255), MUST have payment_info_collected_at TIMESTAMP and payment_info_confirmed BOOLEAN DEFAULT false, MUST have payout_sent_at TIMESTAMP and payout_sent_by UUID REFERENCES users(id) and payout_notes TEXT, MUST have CHECK constraint per lines 728-730, MUST have indexes per lines 738-741

- [x] **Task 1.3.4:** Add `commission_boost_state_history` table
    - **Action:** Add CREATE TABLE for audit trail with trigger for auto-logging
    - **References:** SchemaFinalv2.md lines 746-816 (commission_boost_state_history table)
    - **Acceptance Criteria:** MUST have boost_redemption_id UUID NOT NULL REFERENCES commission_boost_redemptions(id) ON DELETE CASCADE, MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have from_status VARCHAR(50) NULLABLE (NULL for initial creation), MUST have to_status VARCHAR(50), MUST have transitioned_at TIMESTAMP DEFAULT NOW(), MUST have transitioned_by UUID REFERENCES users(id) NULLABLE (NULL if automated/cron), MUST have transition_type VARCHAR(50) with options ('manual', 'cron', 'api'), MUST have notes TEXT and metadata JSONB, MUST have indexes per lines 773-778, MUST have trigger log_boost_transition() per lines 784-815

- [x] **Task 1.3.5:** Add `physical_gift_redemptions` table
    - **Action:** Add CREATE TABLE with composite FK to redemptions(id, client_id)
    - **References:** SchemaFinalv2.md lines 820-887 (physical_gift_redemptions table)
    - **Acceptance Criteria:** MUST have redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE (ONE-TO-ONE), MUST have client_id UUID NOT NULL REFERENCES clients(id), MUST have composite FK (redemption_id, client_id) REFERENCES redemptions(id, client_id) per line 876, MUST have requires_size BOOLEAN DEFAULT false, MUST have size_category VARCHAR(50) with options ('clothing', 'shoes', NULL), MUST have size_value VARCHAR(20) and size_submitted_at TIMESTAMP, MUST have shipping_recipient_first_name/last_name VARCHAR(100) NOT NULL, MUST have shipping_address_line1 VARCHAR(255) NOT NULL and shipping_address_line2 VARCHAR(255), MUST have shipping_city VARCHAR(100) NOT NULL and shipping_state VARCHAR(100) NOT NULL and shipping_postal_code VARCHAR(20) NOT NULL, MUST have shipping_country VARCHAR(100) DEFAULT 'USA', MUST have shipping_phone VARCHAR(50) and shipping_info_submitted_at TIMESTAMP NOT NULL, MUST have tracking_number VARCHAR(100) and carrier VARCHAR(50) with options ('FedEx', 'UPS', 'USPS', 'DHL'), MUST have shipped_at TIMESTAMP and delivered_at TIMESTAMP, MUST have CHECK constraint check_size_required per lines 870-873, MUST have indexes per lines 881-883

## Step 1.4: Indexes
- [x] **Task 1.4.1:** Add all indexes to migration file
    - **Action:** Add CREATE INDEX statements for all tables
    - **References:** SchemaFinalv2.md lines 333-450 (indexes section)
    - **Acceptance Criteria:** Index on client_id for every multi-tenant table, performance indexes added

- [x] **Task 1.4.2:** Add indexes for precomputed fields
    - **Action:** Add CREATE INDEX statements for leaderboard_rank, total_sales, total_units on users table
    - **References:** ARCHITECTURE.md Section 3.3 (line 277 - Performance optimization indexes)
    - **Acceptance Criteria:** Indexes created: idx_users_leaderboard_rank, idx_users_total_sales, idx_users_total_units for optimized dashboard/leaderboard queries

## Step 1.5: RLS Policies
- [x] **Task 1.5.1:** Enable RLS on all tables
    - **Action:** Add `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` for all tables
    - **References:** SchemaFinalv2.md lines 711-790 (RLS section)
    - **Acceptance Criteria:** RLS enabled on all tables

- [x] **Task 1.5.2:** Add creator policies
    - **Action:** Add CREATE POLICY for SELECT/INSERT/UPDATE with client_id check
    - **References:** SchemaFinalv2.md RLS policies, Loyalty.md Pattern 8 (Multi-Tenant Isolation)
    - **Acceptance Criteria:** All policies include `client_id = auth.jwt() ->> 'client_id'` check

- [x] **Task 1.5.3:** Add admin policies
    - **Action:** Add CREATE POLICY for admin role with full access
    - **References:** SchemaFinalv2.md RLS policies
    - **Acceptance Criteria:** Admin policies allow bypass with role check

## Step 1.6: Database Triggers
- [x] **Task 1.6.1:** Create trigger function for commission boost auto-sync
    - **Action:** Add CREATE FUNCTION to auto-sync users.current_commission_boost from commission_boost_states
    - **References:** Loyalty.md Pattern 4 (Auto-Sync Triggers), SchemaFinalv2.md triggers section
    - **Acceptance Criteria:** Function updates users.current_commission_boost when boost activated/deactivated

- [x] **Task 1.6.2:** Create trigger on commission_boost_states
    - **Action:** Add CREATE TRIGGER AFTER INSERT/UPDATE on commission_boost_states
    - **References:** SchemaFinalv2.md triggers
    - **Acceptance Criteria:** Trigger calls auto-sync function

- [x] **Task 1.6.3:** Create trigger function for commission boost history
    - **Action:** Add CREATE FUNCTION to log activation/deactivation to commission_boost_history
    - **References:** Loyalty.md Pattern 7 (Commission Boost History)
    - **Acceptance Criteria:** Function inserts record with action enum

- [x] **Task 1.6.4:** Create trigger for boost history logging
    - **Action:** Add CREATE TRIGGER AFTER INSERT/UPDATE on commission_boost_states
    - **References:** SchemaFinalv2.md triggers
    - **Acceptance Criteria:** History logged when is_active changes

- [x] **Task 1.6.5:** Create state validation triggers
    - **Action:** Add CREATE FUNCTION to validate mission/reward state transitions
    - **References:** MissionsRewardsFlows.md lines 30, 34, 166, 176 (state machines), Loyalty.md lines 2066-2078 (Pattern 3: State Transition Validation)
    - **Acceptance Criteria:** MUST validate mission_progress.status transitions (dormant → active → completed per line 30), MUST validate redemptions.status transitions (claimable → claimed → fulfilled → concluded + rejected per line 34), trigger raises EXCEPTION on invalid transitions, follows Pattern 3 from Loyalty.md

## Step 1.7: Deploy and Verify Schema
- [x] **Task 1.7.1:** Apply migration to remote database
    - **Command:** `supabase db push`
    - **Acceptance Criteria:** Command exits with code 0, no errors

- [x] **Task 1.7.2:** Verify schema integrity
    - **Command:** `supabase db diff --schema-only`
    - **Acceptance Criteria:** Command output is empty (no drift)

- [x] **Task 1.7.3:** Verify RLS enabled
    - **Command:** `psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"`
    - **Acceptance Criteria:** Query returns 0 rows (all tables have RLS)

- [x] **Task 1.7.4:** Verify triggers exist
    - **Command:** `psql -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%commission_boost%' OR tgname LIKE '%state_validation%';"`
    - **Acceptance Criteria:** All expected triggers listed

## Step 1.8: Seed Data
- [x] **Task 1.8.1:** Create seed script file
    - **Action:** Create `/supabase/seed.sql`
    - **Acceptance Criteria:** File exists

- [x] **Task 1.8.2:** Seed base client
    - **Action:** Add INSERT INTO clients with test client
    - **References:** Loyalty.md (Admin Config System)
    - **Acceptance Criteria:** Client with known UUID inserted

- [x] **Task 1.8.3:** Seed VIP tiers
    - **Action:** Add INSERT INTO vip_tiers with Bronze, Silver, Gold, Platinum tiers
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers tier structure and tier colors), Loyalty.md Core Features (VIP Tiers section)
    - **Implementation Guide:** MUST create 4 tiers with exact naming and properties from API spec (lines 5577-5579, 6684-6840): Tier 1 Bronze (tier_level=1, tier_color=#CD7F32, min_sales=0, commission_rate=10), Tier 2 Silver (tier_level=2, tier_color=#94a3b8, min_sales=1000, commission_rate=12), Tier 3 Gold (tier_level=3, tier_color=#F59E0B, min_sales=3000, commission_rate=15), Tier 4 Platinum (tier_level=4, tier_color=#818CF8, min_sales=5000, commission_rate=20). Tier names MUST match API response exactly: "Bronze", "Silver", "Gold", "Platinum" (not Fan/Supporter/VIP/Super Fan)
    - **Acceptance Criteria:** All 4 tiers inserted with tier_level 1-4, tier_color hex codes matching API spec (Bronze=#CD7F32, Silver=#94a3b8, Gold=#F59E0B, Platinum=#818CF8), min_sales thresholds (0, 1000, 3000, 5000), commission_rate percentages (10, 12, 15, 20), names exactly "Bronze", "Silver", "Gold", "Platinum"
    - **Note:** Using units_threshold (0, 100, 300, 500) instead of sales since client uses vip_metric='units'

- [x] **Task 1.8.4:** Seed test users
    - **Action:** Add INSERT INTO users with 2-3 test creators at different tiers
    - **References:** Loyalty.md
    - **Acceptance Criteria:** Users have different tier_ids, valid handles
    - **Note:** Created 9 users: 1 admin (admin1) + 8 creators (2 per tier)

- [x] **Task 1.8.5:** Seed test missions
    - **Action:** Add INSERT INTO missions with samples of each type (instant, daily, weekly, monthly, manual, raffle)
    - **References:** MissionsRewardsFlows.md (6 mission types)
    - **Acceptance Criteria:** At least one mission of each type
    - **Note:** Created 22 missions: 5 types x 4 tiers + 2 raffles (1 dormant, 1 active)

- [x] **Task 1.8.6:** Seed test rewards
    - **Action:** Add INSERT INTO rewards with samples of each type (instant, scheduled, physical, commission boost)
    - **References:** MissionsRewardsFlows.md (reward types)
    - **Acceptance Criteria:** Rewards with different points_costs, tier restrictions
    - **Note:** Created 24 rewards across all types and tiers, all enabled=true

- [x] **Task 1.8.7:** Run seed script
    - **Command:** `supabase db seed`
    - **Acceptance Criteria:** Script executes successfully
    - **Note:** Ran via `supabase db push --include-seed` (Completed: 2025-11-28)

---

# PHASE 2: SHARED LIBRARIES

**Objective:** Build foundational code shared across all features.

## Step 2.1: TypeScript Types
- [x] **Task 2.1.1:** Generate Supabase types
    - **Command:** `supabase gen types typescript --local > lib/types/database.ts`
    - **References:** Loyalty.md lines 38-40 (Supabase PostgreSQL), Supabase CLI documentation for type generation
    - **Acceptance Criteria:** File contains all table types

- [x] **Task 2.1.2:** Create enums file
    - **Action:** Create `/lib/types/enums.ts` with all enum types
    - **References:** SchemaFinalv2.md (enum definitions)
    - **Acceptance Criteria:** MissionType, MissionStatus, RewardType, RedemptionStatus exported

- [x] **Task 2.1.3:** Create API types file
    - **Action:** Create `/lib/types/api.ts` with request/response types
    - **References:** API_CONTRACTS.md (all endpoints)
    - **Acceptance Criteria:** Type for each API endpoint's request body and response

## Step 2.2: Supabase Clients
- [x] **Task 2.2.1:** Create server client
    - **Action:** Create `/lib/supabase/server-client.ts` using `@supabase/ssr` package with cookies for Next.js App Router
    - **References:** Supabase documentation for Next.js App Router server client setup
    - **Implementation Guide:** Use `createServerClient` from `@supabase/ssr`, pass `cookies()` from `next/headers`, use SUPABASE_URL and SUPABASE_ANON_KEY
    - **Acceptance Criteria:** Client uses anon key, respects RLS, works in server components and API routes

- [x] **Task 2.2.2:** Create admin client
    - **Action:** Create `/lib/supabase/admin-client.ts` using `createClient` from `@supabase/supabase-js` with service role key
    - **References:** Supabase documentation for admin/service role client
    - **Implementation Guide:** Use SUPABASE_SERVICE_ROLE_KEY instead of anon key, bypasses RLS
    - **Acceptance Criteria:** Client bypasses RLS. Used for: (1) cron jobs, (2) admin operations, (3) RPC calls in auth routes via SECURITY DEFINER functions. See ARCHITECTURE.md Section 12 for the RPC pattern.

## Step 2.3: Utility Functions
- [x] **Task 2.3.1:** Create auth utility
    - **Action:** Create `/lib/utils/auth.ts` with getUserFromRequest, validateClientId
    - **References:** ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137), Section 10 (Authorization & Security Checklists, lines 1142-1415)
    - **Acceptance Criteria:** Functions extract user from JWT, validate client_id presence, follow security patterns from Section 10
    - **Implementation Note:** `getUserFromRequest()` uses RPC function `auth_find_user_by_id` via `createAdminClient()` to bypass RLS recursion. CRITICAL for all authenticated routes. See ARCHITECTURE.md Section 12 Section 3.6.

- [x] **Task 2.3.2:** Create encryption utility
    - **Action:** Create `/lib/utils/encryption.ts` with encrypt/decrypt functions using AES-256-GCM
    - **References:** Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Acceptance Criteria:** Encrypt/decrypt functions work, use ENCRYPTION_KEY from env

- [x] **Task 2.3.3:** Create data transformation utility
    - **Action:** Create `/lib/utils/transformers.ts` with functions for snake_case → camelCase conversion and special case transformations
    - **References:** ARCHITECTURE.md Section 7 (Data Transformation Conventions, lines 954-1024), API_CONTRACTS.md (all response schemas)
    - **Implementation Guide:** Include `transformToCamelCase()` for general field name conversion, `transformDurationMinutesToDays()` for discount duration fields, `transformNestedJson()` for JSONB columns, ensure encrypted fields are handled per lines 1008-1017
    - **Acceptance Criteria:** MUST transform all snake_case database fields to camelCase for API responses, MUST handle special cases (duration_minutes → durationDays, nested JSON keys, encrypted fields), follows Section 7 transformation patterns

- [x] **Task 2.3.4:** Add transformation tests
    - **Action:** Create `/tests/unit/utils/transformers.test.ts` with test cases for all transformation patterns
    - **References:** ARCHITECTURE.md Section 7 (lines 960-1017 for transformation examples)
    - **Acceptance Criteria:** Tests cover snake_case → camelCase conversion, discount duration transformation (10080 minutes → 7 days), nested JSON transformations, encrypted field handling

- [x] **Task 2.3.5:** Create validation utility
    - **Action:** Create `/lib/utils/validation.ts` with Zod schemas for common validations
    - **References:** API_CONTRACTS.md (request schemas)
    - **Acceptance Criteria:** Schemas for email, handle, UUID formats

- [x] **Task 2.3.6:** Create error handling utility
    - **Action:** Create `/lib/utils/errors.ts` with AppError class and error response formatter
    - **References:** API_CONTRACTS.md (error responses)
    - **Acceptance Criteria:** Standard error format matching API contracts

- [x] **Task 2.3.7:** Create Google Calendar utility file
    - **Action:** Create `/lib/utils/googleCalendar.ts` with calendar event creation functions
    - **References:** Loyalty.md lines 1987-2089 (Google Calendar Integration), googleapis npm package
    - **Implementation Guide:** (1) Initialize Google Calendar API client using service account credentials from GOOGLE_CALENDAR_CREDENTIALS env var, (2) Export createCalendarEvent function accepting: title, description, dueDateTime, reminderMinutes (optional), (3) Export deleteCalendarEvent function accepting eventId, (4) Export markEventCompleted function accepting eventId, (5) Use admin calendar ID from GOOGLE_CALENDAR_ID env var, (6) Handle API errors gracefully (log but don't fail parent operation)
    - **Acceptance Criteria:** File exports createCalendarEvent, deleteCalendarEvent, markEventCompleted functions, uses googleapis package, reads credentials from environment variables, includes error handling that doesn't break calling code

- [x] **Task 2.3.8:** Add Google Calendar environment variables
    - **Action:** Add GOOGLE_CALENDAR_CREDENTIALS (service account JSON) and GOOGLE_CALENDAR_ID (admin calendar ID) to `.env.example` and document setup
    - **References:** Loyalty.md lines 1987-2089 (Google Calendar Integration)
    - **Acceptance Criteria:** Environment variables documented, .env.example updated, README includes Google Calendar setup instructions

---

# PHASE 3: AUTHENTICATION SYSTEM

**Objective:** Implement complete auth flow with multi-tenant isolation.

## Step 3.1: Auth Repositories
- [x] **Task 3.1.1:** Create user repository file
    - **Action:** Create `/lib/repositories/userRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938 for file naming)
    - **Acceptance Criteria:** File exists with repository object pattern matching Section 5 examples
    - **Implementation Note:** Uses `createAdminClient()` + RPC functions to bypass RLS for unauthenticated auth routes. See ARCHITECTURE.md Section 12 Section 3.2.

- [x] **Task 3.1.2:** Implement findByHandle function
    - **Action:** Add function with signature `findByHandle(clientId: string, handle: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 8 (Multi-Tenant Query Isolation), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9
    - **Implementation Note:** Uses RPC function `auth_find_user_by_handle(p_client_id, p_handle)`. Returns array - access via `data[0]`.

- [x] **Task 3.1.3:** Implement findByEmail function
    - **Action:** Add function with signature `findByEmail(clientId: string, email: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 9 (Sensitive Data Encryption), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1)
    - **Implementation Note:** Uses RPC function `auth_find_user_by_email(p_client_id, p_email)`. Email stored as plaintext (not encrypted) per current schema. Returns array - access via `data[0]`.

- [x] **Task 3.1.4:** Implement create function
    - **Action:** Add function to insert new user
    - **References:** SchemaFinalv2.md (users table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), return created user
    - **Implementation Note:** Uses RPC function `auth_create_user(p_id, p_client_id, p_tiktok_handle, p_email, p_password_hash, p_terms_version)`. NO is_admin parameter (security). Returns array - access via `data[0]`.

- [x] **Task 3.1.5:** Implement updateLastLogin function
    - **Action:** Add function to update last_login_at timestamp for user
    - **References:** SchemaFinalv2.md (users table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST update last_login_at for specified user
    - **Implementation Note:** Uses RPC function `auth_update_last_login(p_user_id)`. SECURITY DEFINER bypasses RLS.

- [x] **Task 3.1.6:** Create OTP repository file
    - **Action:** Create `/lib/repositories/otpRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern
    - **Implementation Note:** Uses `createAdminClient()` + RPC functions. Table has `USING(false)` RLS policy - all access via RPC only. See ARCHITECTURE.md Section 12 Section 3.4.

- [x] **Task 3.1.7:** Implement OTP CRUD functions
    - **Action:** Add create, findValidBySessionId, markUsed, incrementAttempts, deleteExpired functions for otp_codes table
    - **References:** SchemaFinalv2.md lines 158-184 (otp_codes table), API_CONTRACTS.md lines 520-605 (OTP verification flow), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST query by session_id, MUST check expiration/used/attempts in application code after RPC fetch
    - **Implementation Note:** RPC functions: `auth_create_otp`, `auth_find_otp_by_session`, `auth_mark_otp_used`, `auth_increment_otp_attempts`. Validity checks done in app code after fetch.

- [x] **Task 3.1.8:** Create client repository file
    - **Action:** Create `/lib/repositories/clientRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern
    - **Implementation Note:** Uses `createAdminClient()` + RPC for `findById`. See ARCHITECTURE.md Section 12 Section 3.3.

- [x] **Task 3.1.9:** Implement findById function
    - **Action:** Add function to fetch client by UUID
    - **References:** SchemaFinalv2.md (clients table)
    - **Acceptance Criteria:** Queries clients table (no client_id filter needed - this IS the tenant table per Section 9 exception), returns client or null
    - **Implementation Note:** Uses RPC function `auth_get_client_by_id(p_client_id)`. Returns array - access via `data[0]`.

## Step 3.2: Auth Services
- [x] **Task 3.2.1:** Create auth service file
    - **Action:** Create `/lib/services/authService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943 for function naming)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns (orchestrates repositories, implements business rules, no direct DB access)

- [x] **Task 3.2.2:** Implement checkHandle function
    - **Action:** Add function calling userRepository.findByHandle
    - **References:** API_CONTRACTS.md /auth/check-handle, Loyalty.md Flow 3
    - **Acceptance Criteria:** Returns { available: boolean }

- [x] **Task 3.2.3:** Implement initiateSignup function
    - **Action:** Add function with transaction for user creation + OTP generation
    - **References:** Loyalty.md Flow 3 (Signup), Pattern 1 (Transactional Workflows)
    - **Acceptance Criteria:** MUST use transaction, check handle uniqueness, send OTP via Resend

- [x] **Task 3.2.4:** Implement verifyOTP function
    - **Action:** Add function to validate OTP and create session
    - **References:** Loyalty.md Flow 4 (OTP Verification), Pattern 2 (Idempotent Operations)
    - **Acceptance Criteria:** MUST mark OTP as used, create Supabase session, update last_login_at

- [x] **Task 3.2.5:** Implement resendOTP function
    - **Action:** Add function to generate new OTP
    - **References:** Loyalty.md Flow 4, Pattern 2
    - **Acceptance Criteria:** MUST be idempotent (rate limit), invalidate previous OTPs

- [x] **Task 3.2.6:** Implement login function
    - **Action:** Add function for existing user login
    - **References:** Loyalty.md Flow 4 (Returning User Login), API_CONTRACTS.md /auth/login (lines 948-1108)
    - **Acceptance Criteria:** Verify password via Supabase Auth signInWithPassword(), check email_verified, update last_login_at

- [x] **Task 3.2.7:** Implement forgotPassword function
    - **Action:** Add function to initiate password reset
    - **References:** Loyalty.md Flow 5 (Password Reset), API_CONTRACTS.md lines 1464-1613
    - **Acceptance Criteria:** Generate reset token, send email, anti-enumeration (always return success)
    - **Implementation Note:** Uses `passwordResetRepository` with RPC functions: `auth_create_reset_token`, `auth_find_recent_reset_tokens`. Table has `USING(false)` policy. See ARCHITECTURE.md Section 12 Section 3.5.

- [x] **Task 3.2.8:** Implement resetPassword function
    - **Action:** Add function to complete password reset
    - **References:** API_CONTRACTS.md lines 1623-1768
    - **Acceptance Criteria:** Validate token (bcrypt compare), update password via Supabase Auth, invalidate token
    - **Implementation Note:** Uses RPC functions: `auth_find_valid_reset_tokens`, `auth_mark_reset_token_used`, `auth_invalidate_user_reset_tokens`. See ARCHITECTURE.md Section 12 Section 3.5.

## Step 3.3: Auth API Routes
- [x] **Task 3.3.1:** Create check-handle route
    - **Action:** Create `/app/api/auth/check-handle/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 34-184 (POST /api/auth/check-handle), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 3-scenario routing logic (lines 104-137): (A) exists+email→login, (B) exists+no email→signup, (C) not found→signup. Normalize handle with @ prefix (line 108-111). Validate handle regex `^[a-zA-Z0-9_.]{1,30}$` (line 168). Return errors: HANDLE_REQUIRED, INVALID_HANDLE, HANDLE_TOO_LONG (lines 142-164)
    - **Acceptance Criteria:** MUST return `{ exists: boolean, has_email: boolean, route: 'signup'|'login', handle: string }` per lines 56-62, implements all 3 routing scenarios per lines 123-136, validates handle format per Section 10.3 line 168, returns 200 for valid requests or 400 for validation errors, follows route pattern from Section 5
    - **Implementation Note:** Uses RPC function `auth_find_user_by_handle` via userRepository. See ARCHITECTURE.md Section 12.

- [x] **Task 3.3.2:** Create signup route
    - **Action:** Create `/app/api/auth/signup/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.4 (Validation Checklist Template, lines 1396-1401)
    - **Implementation Guide:** MUST implement 8-step workflow (lines 247-356): (1) validate input (email format line 252, password 8-128 chars lines 257-262, agreedToTerms line 265), (2) check existing email line 271-276, (3) hash password with bcrypt rounds=10 line 281, (4) create user with client_id + default tier 'tier_1' + terms version '2025-01-18' lines 286-308, (5) generate 6-digit OTP line 312-315, (6) store OTP in otp_codes table expires 5 min lines 319-336, (7) send OTP email via Resend lines 340-346, (8) set HTTP-only cookie lines 350-355. Return errors: EMAIL_ALREADY_EXISTS, INVALID_EMAIL, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, TERMS_NOT_ACCEPTED, OTP_SEND_FAILED (lines 360-406)
    - **Acceptance Criteria:** MUST return `{ success: boolean, otpSent: boolean, sessionId: string, userId: string }` per lines 214-219, implements all 8 steps of signup workflow per lines 247-356, validates per Section 10.4 checklist, hashes password with bcrypt rounds=10 (line 281), stores hashed OTP in otp_codes table (line 319-336), sends email via Resend (line 340-346), sets HTTP-only secure cookie with Max-Age=300 (line 353), returns 201 for success or 400/500 for errors, follows route pattern from Section 5
    - **Implementation Note:** Uses RPC functions: `auth_handle_exists`, `auth_email_exists`, `auth_create_user`, `auth_create_otp`. See ARCHITECTURE.md Section 12.

- [x] **Task 3.3.3:** Create verify-otp route
    - **Action:** Create `/app/api/auth/verify-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 442-722 (POST /api/auth/verify-otp), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 11-step workflow (lines 495-634): (1) get session ID from otp_session HTTP-only cookie line 498-503, (2) validate code format 6 digits line 508-511, (3) query OTP record by session_id + used=false lines 515-527, (4) check OTP exists and not used lines 530-543, (5) check expiration 5 minutes lines 547-553, (6) check max 3 attempts lines 557-570, (7) verify OTP with bcrypt compare lines 574-596 incrementing attempts on failure, (8) mark OTP as used lines 600-603, (9) update users.email_verified=true lines 607-611, (10) create authenticated session with Supabase Auth lines 614-621, (11) set auth_token cookie Max-Age=2592000 (30 days) and clear otp_session cookie lines 625-633. Return errors: INVALID_CODE_FORMAT, INVALID_OTP (with attemptsRemaining), OTP_EXPIRED, OTP_ALREADY_USED, MAX_ATTEMPTS_EXCEEDED, SESSION_NOT_FOUND, INVALID_SESSION (lines 638-693)
    - **Acceptance Criteria:** MUST return `{ success: boolean, verified: boolean, userId: string, sessionToken: string }` per lines 465-470, implements all 11 steps of OTP verification workflow per lines 495-634, reads otp_session cookie (line 499), validates 6-digit format (line 509), queries otp_codes by session_id + used=false (line 524-526), checks expiration and max 3 attempts (lines 548, 558), verifies with bcrypt compare (line 576), increments attempts on failure (line 583), marks used=true on success (line 602), updates email_verified=true (line 609), creates Supabase Auth session (line 616-621), sets auth_token HTTP-only cookie Max-Age=2592000 (line 629), clears otp_session cookie Max-Age=0 (line 630), returns 200 for success or 400 for errors, follows route pattern from Section 5
    - **Implementation Note:** Uses RPC functions: `auth_find_otp_by_session`, `auth_increment_otp_attempts`, `auth_mark_otp_used`, `auth_mark_email_verified`, `auth_update_last_login`. See ARCHITECTURE.md Section 12.

- [x] **Task 3.3.4:** Create resend-otp route
    - **Action:** Create `/app/api/auth/resend-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 722-939 (POST /api/auth/resend-otp), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Defense in Depth Pattern, lines 1371-1380)
    - **Implementation Guide:** MUST implement 10-step workflow (lines 774-877): (1) get session ID from otp_session HTTP-only cookie lines 777-782, (2) query existing OTP record by session_id lines 786-794, (3) check session exists lines 797-803, (4) rate limiting check min 30 seconds since created_at lines 807-817, (5) get user email lines 821-822, (6) invalidate old OTP mark used=true lines 826-829, (7) generate new 6-digit OTP with bcrypt rounds=10 lines 833-836, (8) create new OTP record reusing same session_id expires 5 min lines 840-857, (9) send new OTP email via Resend lines 861-866, (10) return response with expiresAt ISO timestamp and remainingSeconds=300 lines 870-876. Return errors: SESSION_NOT_FOUND, INVALID_SESSION, RESEND_TOO_SOON (429), EMAIL_SEND_FAILED (lines 881-911). Security: max 5 resend requests per session (line 920)
    - **Acceptance Criteria:** MUST return `{ success: boolean, sent: boolean, expiresAt: string, remainingSeconds: number }` per lines 746-751, implements all 10 steps of resend workflow per lines 774-877, reads otp_session cookie (line 778), queries existing OTP record (line 792), enforces min 30 seconds wait time between resends (line 809), marks old OTP used=true (line 828), generates new 6-digit OTP with bcrypt rounds=10 (line 835), creates new OTP record with same session_id (line 851), expires in 5 minutes (line 836), sends email via Resend (line 862-865), returns expiresAt as ISO timestamp (line 874) and remainingSeconds=300 (line 875), returns 200 for success or 429 for RESEND_TOO_SOON or 400/500 for other errors, follows route pattern from Section 5

- [x] **Task 3.3.5:** Create login route
    - **Action:** Create `/app/api/auth/login/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 946-1118 (POST /api/auth/login with error responses), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 5-step workflow (lines 1003-1056): (1) find user by handle lines 1006-1015, return 401 INVALID_CREDENTIALS if not found (line 1037 + 1113 - don't reveal "user not found"), (2) verify password with bcrypt.compare lines 1018-1019 and 1040-1042, return 401 INVALID_CREDENTIALS if invalid (line 1113 same error for both cases), rate limit 5 failed attempts in 15 minutes return 429 ACCOUNT_LOCKED (lines 1042, 1091-1096, 1112), (3) check email_verified=true lines 1044-1046, return 403 EMAIL_NOT_VERIFIED if false (lines 1083-1088), (4) create authenticated session with JWT token payload {userId, handle, email, issued_at, expires_at} lines 1048-1051 and 1116, (5) set HTTP-only cookie auth-token with 7 days expiration (lines 1028, 1115), Secure + SameSite=Strict flags (line 1027, 1111), return response lines 1053-1055. Return errors: MISSING_FIELDS (400), INVALID_HANDLE (400), INVALID_CREDENTIALS (401), EMAIL_NOT_VERIFIED (403), ACCOUNT_LOCKED (429), INTERNAL_ERROR (500) (lines 1059-1105). Log login attempts for security auditing (line 1117)
    - **Acceptance Criteria:** MUST return `{ success: boolean, userId: string, sessionToken: string }` per lines 987-991, implements all 5 steps of login workflow per lines 1003-1056, validates handle format starts with @ 3-30 chars (line 1071), returns 400 MISSING_FIELDS if handle or password missing (line 1062-1064), queries users by handle (line 1014), verifies password with bcrypt.compare (lines 1018-1019, 1109), returns 401 INVALID_CREDENTIALS for invalid handle OR password with SAME error message for both (lines 1037, 1041, 1113 - no user enumeration), rate limits 5 failed attempts per handle in 15 minutes (line 1112), returns 429 ACCOUNT_LOCKED after 5 failed attempts (lines 1091-1096), checks email_verified=true (line 1045, 1114), returns 403 EMAIL_NOT_VERIFIED if false (lines 1083-1088), creates JWT token with payload {userId, handle, email, issued_at, expires_at} (lines 1049, 1116), sets HTTP-only cookie auth-token with Secure + SameSite=Strict + 7 days expiration (lines 1027-1028, 1110-1111, 1115), logs login attempts for auditing (line 1117), returns 200 for success or 400/401/403/429/500 for errors, follows route pattern from Section 5

- [x] **Task 3.3.6:** Create forgot-password route
    - **Action:** Create `/app/api/auth/forgot-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 1462-1614 (POST /api/auth/forgot-password), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 6-step workflow (lines 1522-1556): (1) lookup user by email OR handle (identifier field accepts either) lines 1524-1527 and 1474, (2) CRITICAL anti-enumeration: if user not found still return success 200 but don't send email (prevent account enumeration) lines 1529-1530 and 1576, (3) if user found generate secure token with crypto.randomBytes(32).toString('base64url') 44 chars lines 1532-1534, (4) hash token with bcrypt before storing in password_reset_tokens table (user_id, token_hash, expires_at NOW + 15 minutes) lines 1536-1538 and 1578-1579, (5) send email via SendGrid/AWS SES with reset link https://app.com/login/resetpw?token={token} expires in 15 minutes lines 1540-1551, (6) mask email for response (first 2 chars + **** + @ + domain) lines 1553-1555. Return errors: MISSING_IDENTIFIER (400), INVALID_IDENTIFIER (400), TOO_MANY_REQUESTS (429 - 3 requests per hour), EMAIL_SEND_FAILED (500) (lines 1560-1573). Security: rate limit 3 requests per hour per identifier (lines 1564, 1577), token stored as bcrypt hash not plaintext (line 1578), one-time use marked as used_at after reset (line 1580), HTTPS only links (line 1581). Database: requires password_reset_tokens table with schema (id, user_id, token_hash, created_at, expires_at, used_at, ip_address) lines 1589-1602
    - **Acceptance Criteria:** MUST return `{ sent: boolean, emailHint: string, expiresIn: number }` per lines 1506-1510, implements all 6 steps of forgot-password workflow per lines 1522-1556, accepts identifier field as email OR handle (line 1474), validates identifier format (email or handle starting with @) per Section 10.3, ALWAYS returns 200 success even if user not found to prevent enumeration (lines 1529-1530, 1576), queries users by email OR handle (line 1526), generates secure token with crypto.randomBytes(32).toString('base64url') 44 chars (lines 1533-1534), hashes token with bcrypt before storing (line 1536, 1578), stores in password_reset_tokens table with expires_at NOW + 15 minutes (lines 1537-1538, 1579), sends email via SendGrid/AWS SES with reset link (lines 1540-1551), masks email response first 2 chars + **** + @ + domain (lines 1553-1555, 1501), returns expiresIn=15 minutes (line 1502, 1518), rate limits 3 requests per hour per identifier (lines 1564, 1577), ensures one-time use with used_at field (line 1580), uses HTTPS only for reset links (line 1581), returns 200 for success or 400/429/500 for errors, follows route pattern from Section 5

- [x] **Task 3.3.7:** Create reset-password route
    - **Action:** Create `/app/api/auth/reset-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/reset-password, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Acceptance Criteria:** Validates token and password strength server-side (Section 10.3), resets password, returns 200 or 400

- [x] **Task 3.3.8:** Create user-status route
    - **Action:** Create `/app/api/auth/user-status/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1141-1297 (GET /api/auth/user-status with error responses and security notes), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 6-step workflow (lines 1193-1227): (1) validate session token BEFORE any database queries (line 1281), get authenticated user from JWT decode or session lookup from HTTP-only cookie auth-token lines 1196-1197 and 1152, return 401 UNAUTHORIZED if invalid/missing lines 1232-1234 and 1259-1264, (2) query user info (id, email_verified, last_login_at, created_at) lines 1200-1206, (3) determine recognition status based on last_login_at: NULL=first login (isRecognized=false), NOT NULL=returning user (isRecognized=true) lines 1208-1211 and 1236-1239, (4) determine routing destination: isRecognized=false → redirectTo="/login/welcomeunr", isRecognized=true → redirectTo="/home" lines 1213-1215 and 1238-1239, (5) update last_login_at=NOW() and updated_at=NOW() AFTER checking recognition status lines 1217-1224 (CRITICAL: update after check to detect first-time users), (6) return response with routing instruction lines 1226-1227. Backend owns all routing logic, frontend follows redirectTo instruction lines 1246-1249. Security: idempotent after first call (line 1280), no sensitive data exposed like password_hash or payment info (line 1278), only userId UUID returned (line 1282). Return errors: UNAUTHORIZED (401), INTERNAL_ERROR (500) (lines 1259-1272)
    - **Acceptance Criteria:** MUST return `{ userId: string, isRecognized: boolean, redirectTo: string, emailVerified: boolean }` per lines 1165-1170, implements all 6 steps of user-status workflow per lines 1193-1227, validates session token BEFORE database queries (line 1281), returns 401 UNAUTHORIZED with "Please log in to continue" if invalid/missing (lines 1259-1264), queries users table for id/email_verified/last_login_at/created_at (lines 1200-1206, 1290-1294), sets isRecognized=false if last_login_at IS NULL (lines 1210, 1238), sets isRecognized=true if last_login_at IS NOT NULL (lines 1211, 1239), sets redirectTo="/login/welcomeunr" for first-time users (lines 1214, 1238), sets redirectTo="/home" for returning users (lines 1215, 1239), updates last_login_at=NOW() AFTER checking status to preserve first-login detection (lines 1217-1224, 1241-1244, 1279), is idempotent after first call (line 1280), does NOT expose sensitive data like password_hash or payment info (line 1278), only exposes userId UUID (line 1282), returns 200 for success or 401/500 for errors, follows route pattern from Section 5

- [x] **Task 3.3.9:** Create onboarding-info route
    - **Action:** Create `/app/api/auth/onboarding-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1304-1455 (GET /api/auth/onboarding-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 5-step workflow (lines 1356-1379): (1) get authenticated user from session token JWT decode or session lookup from HTTP-only cookie auth-token lines 1359-1360, return 401 UNAUTHORIZED if invalid/missing lines 1415-1420, (2) get user's client_id from users table lines 1363-1365, (3) get client-specific onboarding configuration - MVP: return hardcoded default response for single client lines 1368-1369 and 1383-1386, Future: query onboarding_messages table by client_id lines 1388-1391, (4) build response with dynamic content: can include dynamic dates (next Monday calculated server-side lines 1393-1397), client-specific communication channels (DMs/email/SMS line 1374), localization (line 1375), A/B testing variants (line 1376), (5) return response line 1378. MVP Implementation: hardcode response in backend (line 1383-1386), simple JavaScript object returned. Future: onboarding_messages table with schema {id, client_id, heading, message, submessage, button_text, created_at} (lines 1388-1391). Security: can be cached per client_id for 1 hour (lines 1409-1411), no sensitive data exposed (line 1434), no PII (line 1437). Return errors: UNAUTHORIZED (401), INTERNAL_ERROR (500) (lines 1415-1428)
    - **Acceptance Criteria:** MUST return `{ heading: string, message: string, submessage: string, buttonText: string }` per lines 1328-1333, implements all 5 steps of onboarding-info workflow per lines 1356-1379, validates session token from HTTP-only cookie auth-token (line 1315), returns 401 UNAUTHORIZED if invalid/missing (lines 1415-1420), queries users table for client_id (lines 1363-1365, 1449-1450), MVP implementation returns hardcoded default response (lines 1383-1386), response can include emojis in heading (line 1321), dynamic dates in message (line 1322), communication channel info in submessage (line 1323), CTA button text (line 1324), can be cached per client_id (lines 1409-1411, 1435), does NOT expose sensitive data or PII (lines 1434, 1437), returns 200 for success or 401/500 for errors, follows route pattern from Section 5

## Step 3.4: Auth Testing
- [x] **Task 3.4.1:** Create auth test infrastructure
    - **Action:** Create `/tests/integration/services/authService.test.ts` and `/tests/fixtures/factories.ts`
    - **References:** SchemaFinalv2.md lines 106-155 (clients and users tables), ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
    - **Implementation Guide:** MUST create test infrastructure: (1) install vitest and supertest if not present, (2) create factories.ts with createTestClient({name, subdomain, vip_metric}) returning client with UUID, (3) createTestUser({client_id, tiktok_handle, email, current_tier}) returning user with UUID and auth token, (4) createTestTier({client_id, tier_level, sales_threshold}), (5) cleanupTestData() that deletes in reverse FK order: redemptions → mission_progress → missions → rewards → users → tiers → clients, (6) setupTestDb() that initializes Supabase test client
    - **Acceptance Criteria:** File exists with test suite skeleton, factory functions MUST create valid test data with proper FK relationships per SchemaFinalv2.md, cleanup MUST remove all test data without FK violations

- [x] **Task 3.4.2:** Test complete auth flow
    - **Action:** Create `/tests/integration/auth/signup-login-flow.test.ts`
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup), lines 438-592 (POST /api/auth/verify-otp), lines 593-750 (POST /api/auth/login), SchemaFinalv2.md lines 123-155 (users table), lines 158-184 (otp_codes table)
    - **Implementation Guide:** MUST test complete flow: (1) create test client with createTestClient(), (2) POST /api/auth/signup with {email, password, tiktokHandle, agreedToTerms: true} → expect 201, otpSent=true, (3) query otp_codes table directly to get OTP code, (4) POST /api/auth/verify-otp with {email, code} → expect 200, verified=true, (5) POST /api/auth/login with {email, password} → expect 200, valid JWT token, (6) verify users table has email_verified=true, (7) verify auth token allows access to protected endpoint
    - **Test Cases:** (1) signup creates user in DB with correct client_id, (2) signup returns otpSent=true and sessionId, (3) verify-otp marks email_verified=true, (4) login returns valid JWT token, (5) token grants access to protected routes
    - **Acceptance Criteria:** All 5 test cases MUST pass, user record MUST exist in users table per SchemaFinalv2.md lines 123-155, otp_codes record MUST be created and consumed per lines 158-184, auth flow prevents users-cant-login catastrophic bug

- [x] **Task 3.4.3:** Test OTP expiration enforced
    - **Action:** Create `/tests/integration/auth/otp-security.test.ts`
    - **References:** API_CONTRACTS.md lines 438-592 (POST /api/auth/verify-otp), SchemaFinalv2.md lines 158-184 (otp_codes table with expires_at), Loyalty.md lines 2345-2360 (OTP Security)
    - **Implementation Guide:** MUST test OTP security: (1) create user via signup, (2) Test valid OTP: query otp_codes, POST /api/auth/verify-otp with correct code → expect 200, (3) Test expired OTP: INSERT otp_codes with expires_at = NOW() - INTERVAL '11 minutes', POST verify-otp → expect 400 OTP_EXPIRED, (4) Test invalid OTP: POST verify-otp with wrong 6-digit code → expect 400 OTP_INVALID, (5) Test max attempts: POST verify-otp with wrong code 5 times, 6th attempt → expect 400 MAX_ATTEMPTS_EXCEEDED even with correct code, (6) verify otp_codes.attempts_count incremented per attempt
    - **Test Cases:** (1) valid OTP within 10 min succeeds, (2) expired OTP (>10 min) returns OTP_EXPIRED, (3) invalid OTP returns OTP_INVALID, (4) max attempts (5) exceeded returns MAX_ATTEMPTS_EXCEEDED, (5) attempts_count tracks failed attempts
    - **Acceptance Criteria:** All 5 test cases MUST pass, OTP expiration MUST be enforced at 10 minutes per SchemaFinalv2.md line 172, max attempts MUST be 5 per line 173, prevents account-takeover-via-old-OTP catastrophic bug

- [x] **Task 3.4.4:** Test password reset token single-use
    - **Action:** Create `/tests/integration/auth/password-reset-security.test.ts`
    - **References:** API_CONTRACTS.md lines 751-945 (POST /api/auth/forgot-password, POST /api/auth/reset-password), SchemaFinalv2.md lines 187-220 (password_reset_tokens table)
    - **Implementation Guide:** MUST test reset token security: (1) create verified user, (2) POST /api/auth/forgot-password with {email} → expect 200, (3) query password_reset_tokens table to get token, (4) POST /api/auth/reset-password with {token, newPassword} → expect 200, (5) verify password_reset_tokens.used_at is set, (6) POST /api/auth/reset-password with same token again → expect 400 TOKEN_ALREADY_USED, (7) Test expiration: INSERT token with expires_at = NOW() - INTERVAL '2 hours', POST reset-password → expect 400 TOKEN_EXPIRED, (8) verify user can login with new password
    - **Test Cases:** (1) valid token resets password successfully, (2) same token reused returns TOKEN_ALREADY_USED, (3) expired token (>1 hour) returns TOKEN_EXPIRED, (4) user can login with new password after reset
    - **Acceptance Criteria:** All 4 test cases MUST pass, token MUST be single-use per SchemaFinalv2.md line 205 (used_at), expiration MUST be 1 hour per line 204, prevents account-takeover-via-reused-token catastrophic bug

- [x] **Task 3.4.5:** Test handle uniqueness
    - **Action:** Add test case to `/tests/integration/auth/signup-login-flow.test.ts`
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup error HANDLE_ALREADY_EXISTS), SchemaFinalv2.md lines 138-139 (users.tiktok_handle UNIQUE per client)
    - **Implementation Guide:** MUST test handle uniqueness: (1) create test client, (2) POST /api/auth/signup with {tiktokHandle: 'creator1', ...} → expect 201, (3) POST /api/auth/signup with same {tiktokHandle: 'creator1', different email, ...} → expect 400 HANDLE_ALREADY_EXISTS, (4) create second test client, (5) POST /api/auth/signup to client B with {tiktokHandle: 'creator1', ...} → expect 201 (same handle OK in different client)
    - **Test Cases:** (1) first signup with handle succeeds, (2) second signup with same handle same client returns 400, (3) same handle in different client succeeds (multi-tenant)
    - **Acceptance Criteria:** All 3 test cases MUST pass, UNIQUE(client_id, tiktok_handle) constraint MUST be enforced per SchemaFinalv2.md line 139

- [x] **Task 3.4.6:** Test multi-tenant isolation
    - **Action:** Create `/tests/integration/security/multi-tenant-isolation.test.ts`
    - **References:** Loyalty.md lines 2091-2130 (Pattern 8: Multi-Tenant Query Isolation), SchemaFinalv2.md lines 106-120 (clients table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063)
    - **Implementation Guide:** MUST test tenant isolation: (1) create clientA and clientB with createTestClient(), (2) create userA in clientA, userB in clientB, (3) create rewardA for clientA, rewardB for clientB, (4) create missionA for clientA, missionB for clientB, (5) Test API isolation: GET /api/rewards as userA → MUST NOT contain rewardB, (6) GET /api/missions as userA → MUST NOT contain missionB, (7) POST /api/rewards/:rewardB_id/claim as userA → expect 403 or 404, (8) Test RLS: direct Supabase query as userA context → verify RLS blocks clientB data, (9) verify all queries include client_id filter per Pattern 8
    - **Test Cases:** (1) User A cannot see Client B rewards via API, (2) User A cannot see Client B missions via API, (3) User A cannot claim Client B reward (403/404), (4) RLS policy blocks direct DB access across tenants
    - **Acceptance Criteria:** All 4 test cases MUST pass, every query MUST filter by client_id per Loyalty.md Pattern 8, RLS policies MUST enforce isolation per ARCHITECTURE.md Section 9, prevents data-leakage-lawsuit catastrophic bug
    - **Note:** otp_codes and password_reset_tokens tables use `USING(false)` RLS policies - all access goes through RPC functions only. Direct queries to these tables will return 0 rows by design.

- [x] **Task 3.4.7:** Create E2E auth test
    - **Action:** Create `/tests/e2e/auth/signup-flow.spec.ts` using Playwright
    - **References:** API_CONTRACTS.md lines 67-188 (POST /api/auth/check-handle), lines 189-437 (signup), lines 438-592 (verify-otp)
    - **Implementation Guide:** MUST test browser flow: (1) navigate to /login/start, (2) enter tiktok handle in input, click Continue, (3) if new user: fill email, password, check terms, click Sign Up, (4) intercept OTP from test DB or mock email, (5) enter OTP digits, click Verify, (6) assert redirect to /home, (7) assert dashboard shows user handle
    - **Acceptance Criteria:** Playwright test MUST automate form fill, OTP entry, verify redirect to authenticated dashboard

## Step 3.5: Security Infrastructure
- [x] **Task 3.5.1:** Install Upstash Rate Limit package
    - **Command:** `npm install @upstash/ratelimit @upstash/redis`
    - **References:** Loyalty.md lines 193-295 (API Security section), Loyalty.md lines 231-238 (Rate Limiting Implementation)
    - **Acceptance Criteria:** Packages appear in `package.json` dependencies, MUST install both @upstash/ratelimit and @upstash/redis

- [x] **Task 3.5.2:** Configure Upstash Redis connection
    - **Action:** Add Upstash environment variables to `.env.local`
    - **References:** Loyalty.md lines 257-260 (Environment variables for Upstash)
    - **Acceptance Criteria:** MUST add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to environment file, values obtained from Upstash dashboard

- [x] **Task 3.5.3:** Create rate limit utility file
    - **Action:** Create `/lib/utils/rateLimit.ts` with Upstash Redis client initialization
    - **References:** Loyalty.md lines 231-238 (Rate limiting technology: Upstash Redis, 10,000 requests/day free tier), ARCHITECTURE.md Section 7 (Naming Conventions, lines 932-938 for file naming)
    - **Implementation Guide:** MUST initialize Upstash Redis client using environment variables (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from lines 259-260). Create reusable rate limiter instances for different limits: loginLimiter (5/min per IP, line 205), signupLimiter (3/min per IP, line 206), claimLimiter (10/hour per user, line 214), cronLimiter (1/day, lines 228-229). Use sliding window algorithm for accurate rate limiting.
    - **Acceptance Criteria:** File exists at `/lib/utils/rateLimit.ts`, MUST export Redis client instance, MUST export 4 pre-configured rate limiter functions (loginLimiter, signupLimiter, claimLimiter, cronLimiter) with limits matching Loyalty.md lines 205-229, uses sliding window algorithm for fairness

- [x] **Task 3.5.4:** Implement rate limit middleware
    - **Action:** Create `/lib/middleware/rateLimitMiddleware.ts` with Next.js API route wrapper
    - **References:** Loyalty.md lines 202-230 (API Route Inventory with rate limits), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Implementation Guide:** MUST create wrapper function `withRateLimit(limiter, handler)` that: (1) extracts identifier (IP for auth routes, userId for creator routes), (2) calls limiter.limit(identifier), (3) if limit exceeded return 429 with Retry-After header, (4) if limit OK call handler and return response. Support both IP-based (lines 205-206) and user-based (line 214) rate limiting.
    - **Acceptance Criteria:** File exists at `/lib/middleware/rateLimitMiddleware.ts`, MUST export `withRateLimit` wrapper function, returns 429 status code with `Retry-After` header when limit exceeded, supports both IP-based and user-based identification, integrates with Upstash rate limiters from Task 3.5.3

- [x] **Task 3.5.5:** Install Zod package (if not already installed)
    - **Command:** `npm list zod || npm install zod`
    - **References:** Loyalty.md lines 240-242 (Input Validation with Zod schemas on all routes)
    - **Acceptance Criteria:** Zod package present in `package.json`, version 3.x or higher

- [x] **Task 3.5.6:** Create validation utility file
    - **Action:** Create `/lib/utils/validation.ts` with reusable Zod schemas
    - **References:** Loyalty.md lines 240-242 (Zod validation requirement), API_CONTRACTS.md (request schemas for all endpoints), ARCHITECTURE.md Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST create common Zod schemas for reuse across routes: emailSchema (RFC 5322 format), passwordSchema (8-128 chars), handleSchema (alphanumeric + underscore/period, 1-30 chars matching line 168 in API_CONTRACTS), uuidSchema (valid UUID v4), paginationSchema (limit/offset with defaults). Export helper function `validateRequest(schema, data)` that returns `{ success: boolean, data?: T, errors?: ZodError }`.
    - **Acceptance Criteria:** File exists at `/lib/utils/validation.ts`, MUST export 5+ common Zod schemas (email, password, handle, uuid, pagination), MUST export `validateRequest` helper function, schemas match validation rules from API_CONTRACTS.md and Section 10.3

- [x] **Task 3.5.7:** Implement request validation middleware
    - **Action:** Create `/lib/middleware/validationMiddleware.ts` with Next.js API route wrapper
    - **References:** Loyalty.md lines 240-242 (Zod validation on all routes), ARCHITECTURE.md Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST create wrapper function `withValidation(schema, handler)` that: (1) parses request body/query/params, (2) validates against Zod schema, (3) if validation fails return 400 with field-level errors, (4) if validation passes attach validated data to request and call handler. Return errors in format: `{ error: "VALIDATION_ERROR", fields: { fieldName: ["error message"] } }` per Section 10.3.
    - **Acceptance Criteria:** File exists at `/lib/middleware/validationMiddleware.ts`, MUST export `withValidation` wrapper function, returns 400 status code with field-level errors on validation failure (format matches Section 10.3), attaches validated data to request object, supports body/query/params validation

- [x] **Task 3.5.8:** Create requireAdmin utility file
    - **Action:** Create `/lib/utils/requireAdmin.ts` with admin authorization function
    - **References:** Loyalty.md lines 218-226 (Admin Routes requiring requireAdmin()), Loyalty.md lines 2345-2360 (Admin Authentication Strategy), ARCHITECTURE.md Section 10 (Authorization & Security Checklists, lines 1142-1415)
    - **Implementation Guide:** MUST implement function `requireAdmin(request)` that: (1) extracts session from request (Supabase Auth), (2) if no session return 401 Unauthorized, (3) query users table for `is_admin` flag with client_id filter, (4) if `is_admin = false` return 403 Forbidden with message "Admin access required" (line 2348), (5) if `is_admin = true` return user object with client_id. MUST follow defense-in-depth strategy from lines 2357-2360 (middleware + utility + RLS).
    - **Acceptance Criteria:** File exists at `/lib/utils/requireAdmin.ts`, MUST export `requireAdmin` function, returns 401 if not logged in, returns 403 with "Admin access required" message if logged in but not admin (line 2348), returns user object with client_id if admin, MUST filter users query by client_id (multi-tenant isolation per Section 9), follows defense-in-depth pattern from Loyalty.md lines 2357-2360

- [x] **Task 3.5.9:** Implement requireAdmin middleware function
    - **Action:** Create `/lib/middleware/adminMiddleware.ts` with Next.js API route wrapper
    - **References:** Loyalty.md lines 218-226 (Admin Routes), Loyalty.md lines 2346-2352 (Route Protection and API Protection), ARCHITECTURE.md Section 10 (Authorization & Security Checklists, lines 1142-1415)
    - **Implementation Guide:** MUST create wrapper function `withAdmin(handler)` that: (1) calls requireAdmin(request) from Task 3.5.8, (2) if returns error (401/403) immediately return error response, (3) if returns user object attach admin user to request context, (4) call handler with admin-verified request. Used on all routes in lines 219-225.
    - **Acceptance Criteria:** File exists at `/lib/middleware/adminMiddleware.ts`, MUST export `withAdmin` wrapper function, calls requireAdmin utility from Task 3.5.8, returns 401/403 errors without calling handler, attaches admin user to request context on success, ready to wrap admin API routes from lines 219-225

- [x] **Task 3.5.10:** Create admin middleware for Next.js routes
    - **Action:** Create `/middleware.ts` (Next.js middleware) with admin page protection
    - **References:** Loyalty.md lines 2346-2349 (Route Protection via Next.js middleware), ARCHITECTURE.md Section 10 (Authorization & Security Checklists, lines 1142-1415)
    - **Implementation Guide:** MUST create Next.js middleware that: (1) intercepts all `/admin/*` page requests (not API routes), (2) checks session via Supabase Auth, (3) checks `is_admin` flag from users table, (4) if not admin redirects to `/dashboard` with toast message "Admin access required" (line 2348), (5) if admin allows request to proceed. Runs on page navigation (defense layer 1 from lines 2357-2360).
    - **Acceptance Criteria:** File exists at `/middleware.ts` (Next.js middleware), MUST protect all `/admin/*` page routes (not API routes), checks `is_admin` flag from users table, redirects unauthorized users to `/dashboard` with "Admin access required" toast (line 2348), allows admin users to access admin pages, follows Route Protection pattern from lines 2346-2349

- [x] **Task 3.5.11:** Create file validation utility file
    - **Action:** Create `/lib/utils/fileValidation.ts` with image upload validation functions
    - **References:** Loyalty.md lines 262-293 (File Upload Security 3-Layer Validation), Loyalty.md lines 269-274 (Allowed file types and size limits)
    - **Implementation Guide:** MUST create 3 validation functions: (1) `validateFileType(file)` - checks extension is .png, .jpg, .jpeg only (line 270), rejects .svg, .gif, .webp (lines 271-272), checks MIME type matches extension (prevents executable disguise, line 288), (2) `validateFileSize(file)` - enforces 2 MB max (line 274), (3) `validateImageFile(file)` - combines both checks and returns `{ valid: boolean, error?: string }`. No SVG to prevent XSS attacks (line 271).
    - **Acceptance Criteria:** File exists at `/lib/utils/fileValidation.ts`, MUST export 3 functions (validateFileType, validateFileSize, validateImageFile), MUST only allow .png, .jpg, .jpeg extensions (line 270), MUST reject .svg, .gif, .webp (lines 271-272), MUST enforce 2 MB max size (line 274), MUST check MIME type matches extension to prevent executables disguised as images (line 288), follows 3-Layer Validation Model from lines 264-268

- [x] **Task 3.5.12:** Implement file type validation
    - **Action:** Add extension and MIME type checking logic to `validateFileType` function
    - **References:** Loyalty.md lines 269-272 (Allowed file types), Loyalty.md line 288 (Executable disguised as image attack prevention)
    - **Implementation Guide:** MUST check file extension against whitelist ['.png', '.jpg', '.jpeg'] (line 270). MUST check MIME type against whitelist ['image/png', 'image/jpeg'] using file.type property. MUST verify extension matches MIME type (e.g., .png file MUST have image/png MIME type). Reject if: (1) extension not in whitelist, (2) MIME type not in whitelist, (3) extension/MIME mismatch. Return descriptive error messages.
    - **Acceptance Criteria:** `validateFileType` function MUST check both extension and MIME type, MUST use whitelist approach (only .png, .jpg, .jpeg allowed per line 270), MUST prevent extension/MIME mismatch to block executables disguised as images (line 288), returns descriptive error for invalid type or mismatch

- [x] **Task 3.5.13:** Implement file size validation
    - **Action:** Add size checking logic to `validateFileSize` function
    - **References:** Loyalty.md line 274 (Size Limit: Max 2 MB enforced at all 3 layers), Loyalty.md line 289 (Oversized file attack prevention)
    - **Implementation Guide:** MUST check file.size property against 2 MB limit (2 * 1024 * 1024 bytes = 2097152 bytes per line 274). Reject if file.size > 2097152. Return error message with actual size and limit in human-readable format (e.g., "File size 3.5 MB exceeds maximum of 2 MB"). This is Layer 2 (API Route) of 3-layer validation (lines 264-268).
    - **Acceptance Criteria:** `validateFileSize` function MUST enforce 2 MB maximum (line 274), rejects files larger than 2097152 bytes, returns human-readable error message with actual size and limit, implements Layer 2 of 3-Layer Validation Model (lines 264-268)

- [x] **Task 3.5.14:** Create upload handler middleware
    - **Action:** Create `/lib/middleware/uploadMiddleware.ts` with file upload wrapper
    - **References:** Loyalty.md lines 262-293 (File Upload Security), Loyalty.md lines 276-282 (Storage structure: supabase-storage/logos/client-{uuid}.ext)
    - **Implementation Guide:** MUST create wrapper function `withFileUpload(handler, options)` that: (1) extracts file from multipart/form-data request, (2) calls validateImageFile from Task 3.5.11, (3) if validation fails return 400 with error, (4) generates storage path using pattern `logos/client-{clientId}.{ext}` (lines 278-281), (5) calls Supabase Storage API to upload file, (6) attaches file URL to request and calls handler. Path MUST include client_id to prevent overwriting other clients' logos (line 292).
    - **Acceptance Criteria:** File exists at `/lib/middleware/uploadMiddleware.ts`, MUST export `withFileUpload` wrapper function, validates files using Task 3.5.11 utilities, returns 400 on validation failure, generates storage path with pattern `logos/client-{clientId}.{ext}` (lines 278-281), uploads to Supabase Storage, MUST include client_id in path to prevent cross-client overwrites (line 292)

- [x] **Task 3.5.15:** Create cron auth utility file
    - **Action:** Create `/lib/utils/cronAuth.ts` with cron secret validation function
    - **References:** Loyalty.md lines 252-260 (Cron Job Security with Vercel cron secret validation), Loyalty.md line 258 (CRON_SECRET environment variable)
    - **Implementation Guide:** MUST create function `validateCronSecret(request)` that: (1) extracts secret from request headers (Authorization: Bearer {secret}), (2) compares against CRON_SECRET environment variable using constant-time comparison (prevents timing attacks), (3) if mismatch return 401 Unauthorized, (4) if match return true. MUST use constant-time comparison library (e.g., crypto.timingSafeEqual) to prevent timing attacks.
    - **Acceptance Criteria:** File exists at `/lib/utils/cronAuth.ts`, MUST export `validateCronSecret` function, extracts secret from Authorization header, compares against CRON_SECRET environment variable (line 258), MUST use constant-time comparison to prevent timing attacks, returns 401 if secret invalid, returns true if secret valid

- [x] **Task 3.5.16:** Implement CRON_SECRET validation
    - **Action:** Add constant-time comparison logic to `validateCronSecret` function
    - **References:** Loyalty.md lines 253-260 (Vercel cron secret validation), Loyalty.md lines 227-229 (System Routes requiring cron secret)
    - **Implementation Guide:** MUST use Node.js crypto.timingSafeEqual for comparison. Convert both secrets to Buffer before comparison. Handle edge cases: (1) missing Authorization header → 401, (2) malformed Authorization header (not "Bearer {secret}") → 401, (3) CRON_SECRET not set in environment → throw error (deployment failure, not runtime 401), (4) secrets match → return true. Used on route /api/cron/daily-automation (single combined route for data sync + tier calculation).
    - **Acceptance Criteria:** `validateCronSecret` MUST use crypto.timingSafeEqual for constant-time comparison, handles missing/malformed Authorization header with 401, throws error if CRON_SECRET environment variable not set (prevents deployment without secret), returns true on valid secret, ready to protect cron routes from lines 228-229

- [x] **Task 3.5.17:** Add CRON_SECRET to environment variables
    - **Action:** Generate random secret and add to `.env.local` and Vercel environment
    - **References:** Loyalty.md line 258 (CRON_SECRET environment variable), Loyalty.md lines 253-260 (Cron Job Security)
    - **Implementation Guide:** MUST generate cryptographically secure random secret (minimum 32 characters, use crypto.randomBytes(32).toString('hex')). Add to `.env.local` as `CRON_SECRET=<generated-secret>`. Add same secret to Vercel project environment variables for production deployment. Document in .env.example with placeholder value. Used by cron routes to authenticate Vercel cron scheduler (lines 253-260).
    - **Acceptance Criteria:** CRON_SECRET added to `.env.local` with cryptographically secure random value (minimum 32 characters), same secret added to Vercel project environment variables, documented in .env.example, value generated using crypto.randomBytes or equivalent secure method

---

# PHASE 4: DASHBOARD APIS

**Objective:** Implement dashboard overview and featured mission.

## Step 4.1: Dashboard Repositories
- [x] **Task 4.1.1:** Create dashboard repository file
    - **Action:** Create `/lib/repositories/dashboardRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 4.1.2:** Implement getUserDashboard function
    - **Action:** Add function querying user, client, current tier, next tier with VIP metric-aware data selection
    - **References:** API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard sections 1-3: User & Tier Info, Client config, Tier Progress), SchemaFinalv2.md (users, clients, vip_tiers tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query with JOINs: users JOIN clients JOIN tiers (current tier) LEFT JOIN tiers (next tier WHERE tier_order = current_tier.tier_order + 1). Return 3 sections (lines 2079-2125): (1) user (id, handle, email, clientName from clients.company_name), (2) client (id, vipMetric from clients.vip_metric enum 'sales'|'units', vipMetricLabel), (3) currentTier (id, name, color, order, checkpointExempt camelCase transformed from checkpoint_exempt snake_case per lines 2099, 2386-2424), (4) nextTier (id, name, color, minSalesThreshold camelCase from sales_threshold) or null if highest tier (lines 2102-2108, 2412-2424). Return raw checkpoint values (checkpoint_sales_current or checkpoint_units_current + manual_adjustments) for service layer VIP metric-aware formatting
    - **Acceptance Criteria:** MUST filter by client_id for vip_tiers JOIN (Section 9 Critical Rule #1), executes single query with JOINs to users/clients/tiers, returns user section with id/handle/email/clientName, returns client section with vipMetric enum and vipMetricLabel, returns currentTier with checkpointExempt camelCase (lines 2094-2100), returns nextTier with minSalesThreshold camelCase or null (lines 2102-2108), returns raw checkpoint values for VIP metric-aware formatting by service layer

- [x] **Task 4.1.3:** Implement getCurrentTierRewards function
    - **Action:** Add function querying rewards for user's current tier with LIMIT 4
    - **References:** API_CONTRACTS.md lines 2172-2192 (Current Tier Rewards section), SchemaFinalv2.md (rewards table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** Query rewards WHERE client_id=$clientId AND tier_eligibility=$currentTier AND enabled=true AND reward_source='vip_tier', ORDER BY display_order ASC, LIMIT 4 (lines 2173-2176). Also get total count for "And more!" logic (line 2192). Return fields: id, type, name, displayText (backend-generated), description, valueData (camelCase transformed), rewardSource, redemptionQuantity, displayOrder (lines 2177-2190)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), filters by tier_eligibility=$currentTier AND enabled=true AND reward_source='vip_tier' (excludes mission rewards), sorted by display_order ASC, LIMIT 4 rewards for showcase card (lines 2174-2176), includes totalRewardsCount for full tier reward count (line 2192), returns fields matching lines 2177-2190 with valueData camelCase transformed, includes rewardSource in response

- [x] **Task 4.1.4:** Create mission repository file
    - **Action:** Create `/lib/repositories/missionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 4.1.5:** Implement findFeaturedMission function
    - **Action:** Add function querying missions with priority order and raffle filtering
    - **References:** API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission with priority selection lines 1963-1970) and lines 3656-3705 (alternative spec with selection priority order lines 3690-3697), SchemaFinalv2.md (missions, mission_progress, raffle_participations tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST use single optimized query (~80ms, lines 1943-1975) with IN clause for mission types (raffle, sales_dollars, sales_units, videos, likes, views). Filter: client_id + tier_eligibility=$currentTier + enabled=true. Raffle ONLY if activated=true AND no existing raffle_participation for user (lines 1954-1960, 3687, 3698). Exclude claimed missions (lines 1959, 1981-1984). Order by priority (lines 1963-1970, 3685-3692): raffle=0 (if activated + not participated), sales_dollars=1 (if vip_metric='sales'), sales_units=2 (if vip_metric='units'), videos=3, likes=4, views=5. LIMIT 1. Return mission with mission_progress data, reward details, VIP metric for backend formatting
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), uses single query with mission types IN clause, filters by tier_eligibility + enabled=true (lines 3700-3701), includes raffle ONLY if activated=true AND no raffle_participation (lines 3692-3693, 3698), excludes claimed missions, orders by 6-priority ranking (raffle > sales_dollars > sales_units > videos > likes > views per lines 3690-3697), considers VIP metric for sales type priority, LIMIT 1, includes mission_progress.status IN ('active', 'completed') per line 3702, returns null if no missions match

## Step 4.2: Dashboard Services
- [x] **Task 4.2.1:** Create dashboard service file
    - **Action:** Create `/lib/services/dashboardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [x] **Task 4.2.2:** Implement getDashboardOverview function
    - **Action:** Add function that aggregates 5 sections with VIP metric-aware formatting and tier progression calculations
    - **References:** API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard complete unified endpoint with 5 major sections)
    - **Implementation Guide:** MUST aggregate 5 sections (lines 2075-2193): (1) call dashboardRepository.getUserDashboard for user/client/currentTier/nextTier sections, (2) calculate tierProgress: read precomputed checkpoint_sales_current or checkpoint_units_current + manual_adjustments_total (lines 2428-2450), compute progressPercentage = (currentValue / targetValue) * 100, format display strings based on client.vipMetric (sales mode: "$4,200" vs units mode: "4,200 units") (lines 2456-2471), include checkpointExpiresAt/checkpointExpiresFormatted/checkpointMonths (lines 2122-2125), (3) call getFeaturedMission for featuredMission section with SAME data structure as GET /api/dashboard/featured-mission including isRaffle flag, raffleEndDate, formatted progress text (lines 2132-2168, 2486-2641), (4) call getCurrentTierRewards for currentTierRewards LIMIT 4 with backend displayText generation, (5) return totalRewardsCount. Backend handles ALL formatting per vipMetric setting (lines 2473-2484). Tier expiration logic based on checkpointExempt boolean (lines 2642-2667)
    - **Acceptance Criteria:** Returns complete DashboardResponse matching lines 2075-2193, aggregates user/client/currentTier/nextTier from repository, calculates tierProgress with VIP metric-aware formatting (sales: "$4,200" vs units: "4,200 units"), reads from precomputed checkpoint fields (lines 2428-2450), computes progressPercentage in backend, includes featuredMission with SAME logic as Task 4.3.2 (lines 2132-2168), queries currentTierRewards filtered by tier + enabled LIMIT 4 sorted by display_order (lines 2172-2192), includes totalRewardsCount, backend handles ALL display string formatting based on vipMetric (lines 2473-2484), follows service layer patterns

- [x] **Task 4.2.3:** Implement shouldShowCongratsModal logic
    - **Action:** Add function checking if mission was fulfilled AFTER user's last login
    - **References:** API_CONTRACTS.md lines 1998-2037 (Congratulations modal logic in featured-mission), Loyalty.md Flow 1 (Congrats Modal)
    - **Implementation Guide:** MUST compare mission_progress.fulfilled_at > users.last_login_at to detect newly completed missions (lines 1998-2037). Query finds missions WHERE fulfilled_at IS NOT NULL AND fulfilled_at > last_login_at (lines 2004-2017). If found, set showCongratsModal=true and provide congratsMessage with mission details (lines 2020-2023). CRITICAL: update users.last_login_at=NOW() AFTER checking comparison but before returning response (lines 2025-2030) to prevent modal from showing again on refresh (line 2037)
    - **Acceptance Criteria:** Returns boolean showCongratsModal by comparing mission_progress.fulfilled_at > users.last_login_at per lines 1998-2037, queries missions WHERE fulfilled_at > last_login_at (lines 2004-2017), generates congratsMessage if found (lines 2020-2023), updates users.last_login_at=NOW() AFTER checking but before returning (lines 2025-2030), prevents duplicate modals on refresh (line 2037)

- [x] **Task 4.2.4:** Implement getFeaturedMission function
    - **Action:** Add function that formats mission with status computation, displayName mapping, and congrats modal logic
    - **References:** API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission complete response) and lines 3656-3705 (alternative spec with emptyStateMessage line 3684)
    - **Implementation Guide:** Call repository for highest-priority mission, then: (1) use static displayName mapping per type (lines 1903-1929): sales_dollars/sales_units→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle", (2) compute status: 'active' if mission_progress.status='active', 'completed' if status='completed', 'no_missions' if null (lines 1978-1986), (3) calculate progressPercentage = (currentProgress / targetValue) * 100 in backend (lines 1988-1994), (4) check congrats modal: compare mission_progress.fulfilled_at > users.last_login_at, set showCongratsModal=true if found, generate congratsMessage, update last_login_at AFTER checking to prevent re-showing (lines 1998-2037, 2037), (5) return emptyStateMessage "No active missions. Check back soon!" if null (line 3684), (6) include tier info (name, color), supportEmail from client
    - **Acceptance Criteria:** Returns FeaturedMissionResponse matching lines 1789-1826 and 3665-3680, calls repository for priority-ordered mission, uses static displayName mapping (lines 1903-1929), computes status: active/completed/no_missions (lines 1978-1986), calculates progressPercentage in backend (lines 1988-1994), checks congrats modal by comparing fulfilled_at > last_login_at (lines 1998-2037), updates last_login_at AFTER checking (lines 2025-2030), returns emptyStateMessage if no missions (line 3684), includes tier and supportEmail, follows service layer patterns

## Step 4.3: Dashboard API Routes
- [x] **Task 4.3.1:** Create dashboard overview route
    - **Action:** Create `/app/api/dashboard/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 2063-2948 (GET /api/dashboard unified endpoint), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST return unified dashboard response with 5 major sections (lines 2075-2193): (1) User & Tier Info: query users JOIN clients JOIN tiers, return id/handle/email/clientName and currentTier (id/name/color/order/checkpointExempt camelCase) and nextTier (id/name/color/minSalesThreshold) or null if highest tier (lines 2079-2108, 2386-2424), (2) Client config: vipMetric (sales|units) and vipMetricLabel (lines 2086-2091), (3) Tier Progress: read from precomputed users.checkpoint_sales_current or checkpoint_units_current + manual_adjustments, compute progressPercentage, format display strings based on vipMetric (sales mode: "$4,200" | units mode: "4,200 units"), include checkpointExpiresFormatted (lines 2113-2125, 2428-2471), (4) Featured Mission: SAME data structure as GET /api/dashboard/featured-mission with isRaffle flag, raffleEndDate, formatted progress text (currentFormatted/targetFormatted/targetText/progressText), backend handles ALL formatting (lines 2132-2168, 2486-2641), (5) Current Tier Rewards: query rewards WHERE tier_eligibility + enabled=true + client_id per Section 10.1, sort by display_order ASC, LIMIT 4 rewards, include displayText (backend-generated), totalRewardsCount for "And more!" logic (lines 2172-2192). Backend formats ALL display strings per vipMetric setting (lines 2473-2484). Tier expiration logic: show if checkpointExempt=false, hide if true (lines 2642-2667)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, email, clientName}, client: {id, vipMetric, vipMetricLabel}, currentTier: {id, name, color, order, checkpointExempt}, nextTier: {id, name, color, minSalesThreshold} | null, tierProgress: {currentValue, targetValue, progressPercentage, currentFormatted, targetFormatted, checkpointExpiresAt, checkpointExpiresFormatted, checkpointMonths}, featuredMission: {...same as GET /api/dashboard/featured-mission...}, currentTierRewards: [{id, type, name, displayText, description, valueData, redemptionQuantity, displayOrder}], totalRewardsCount: number }` per lines 2075-2193, queries users JOIN clients JOIN tiers (lines 2389-2405), queries next tier by tier_order+1 or returns null (lines 2412-2424), reads tier progress from precomputed checkpoint_sales_current or checkpoint_units_current + manual_adjustments (lines 2431-2450), formats display strings based on vipMetric (sales: "$4,200" vs units: "4,200 units") (lines 2456-2471), includes featuredMission with SAME logic as Task 4.3.2 plus isRaffle/raffleEndDate/formatted progress text (lines 2486-2591), queries rewards filtered by tier + enabled + client_id per Section 10.1 sorted by display_order LIMIT 4 (lines 2172-2192), backend handles ALL formatting (lines 2636-2641), includes checkpointExempt camelCase for tier expiration UI logic (lines 2642-2667), returns 200 or 401/500, follows route pattern from Section 5

- [x] **Task 4.3.2:** Create featured mission route
    - **Action:** Create `/app/api/dashboard/featured-mission/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1775-2060 (GET /api/dashboard/featured-mission), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST use single optimized query (lines 1943-1972, ~80ms performance): query missions with IN clause for types (raffle, sales_dollars, sales_units, videos, likes, views), filter by client_id + tier_eligibility + enabled=true per Section 10.2, raffle ONLY if activated=true (surprise feature lines 1954-1955), exclude if user participated in raffle (lines 1954-1958), exclude claimed missions (lines 1959, 1981-1984), order by priority: raffle=0 > sales_dollars=1 > sales_units=2 > videos=3 > likes=4 > views=5 (lines 1963-1970), LIMIT 1. Display name mapping static per type (lines 1903-1929): sales_dollars/sales_units→"Sales Sprint", likes→"Fan Favorite", views→"Road to Viral", videos→"Lights, Camera, Go!", raffle→"VIP Raffle". Compute progressPercentage in backend (currentProgress/targetValue)*100 (lines 1988-1994). Congratulations modal: compare mission_progress.fulfilled_at > users.last_login_at (lines 1998-2037), set showCongratsModal=true if found, update last_login_at AFTER checking (lines 2025-2030, 2037). Status: active/completed/no_missions (lines 1978-1986). Return errors: 401, 500 (lines 2041-2055)
    - **Acceptance Criteria:** MUST return `{ status: 'active'|'completed'|'claimed'|'fulfilled'|'no_missions', mission: {id, type, displayName, currentProgress, targetValue, progressPercentage, rewardType, rewardAmount, rewardCustomText, unitText} | null, tier: {name, color}, showCongratsModal: boolean, congratsMessage: string | null, supportEmail: string, emptyStateMessage: string | null }` per lines 1789-1826, uses single optimized query ~80ms (lines 1943-1975), filters by client_id + tier_eligibility + enabled=true per Section 10.2, includes raffle ONLY if activated=true (lines 1954-1955), excludes claimed missions from home page (lines 1959, 1981-1984), orders by priority raffle > sales_dollars > sales_units > videos > likes > views (lines 1963-1970), uses static display name mapping per type (lines 1903-1929), calculates progressPercentage in backend (lines 1800, 1987-1992), checks congrats modal by comparing fulfilled_at > last_login_at (lines 2000-2037), updates last_login_at AFTER checking to prevent re-showing (lines 2025-2030, 2037), returns 200 with status='no_missions' if none found (not 404) (lines 1885-1898), follows route pattern from Section 5

## Step 4.4: Dashboard Testing
- [x] **Task 4.4.1:** Create dashboard integration tests
    - **Action:** Create `/tests/integration/api/dashboard.test.ts`
    - **Acceptance Criteria:** Tests for overview and featured mission endpoints

- [x] **Task 4.4.2:** Test multi-tenant isolation
    - **Action:** Write test verifying client_id boundary
    - **Acceptance Criteria:** User cannot see dashboard of different client

- [x] **Task 4.4.3:** Test congrats modal logic
    - **Action:** Write test for first login and 24h threshold
    - **Acceptance Criteria:** showCongratsModal true/false correctly

---

# PHASE 5: MISSIONS SYSTEM

**Objective:** Implement mission listing, claiming, progress tracking, raffle participation.

## Step 5.1: Mission Repositories
- [x] **Task 5.1.1:** Extend missionRepository with listAvailable function
    - **Action:** Add function querying missions with progress, redemptions, and sub-states using LEFT JOINs
    - **References:** API_CONTRACTS.md lines 2955-3820 (GET /api/missions with complex query requirements), Loyalty.md Flow 8 (Mission List), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute single optimized query with LEFT JOINs to: (1) mission_progress for current_value/target_value/status/checkpoint_end, (2) redemptions WHERE mission_progress_id IS NOT NULL (mission rewards, not VIP tier rewards), (3) commission_boost_redemptions for boost_status/activated_at/expires_at/scheduled dates, (4) physical_gift_redemptions for shipping_city/shipped_at, (5) raffle_participations for is_winner, (6) tiers for tier_name/tier_color. Filter missions WHERE client_id=$clientId AND enabled=true AND (tier_eligibility=$currentTier OR preview_from_tier filtering for locked previews). Return all data needed for backend 14-status computation (lines 3241-3296), VIP metric-aware progress formatting (lines 3092-3100), deadline calculations, scheduling data, raffle data, locked data. Use single query strategy for performance
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes single query with LEFT JOINs to mission_progress/redemptions/commission_boost_redemptions/physical_gift_redemptions/raffle_participations/tiers, filters by enabled=true, filters by tier_eligibility OR preview_from_tier logic for locked tier previews, excludes concluded/rejected redemptions, includes all fields needed for 14-status computation (lines 2990-2994), progress tracking, deadline info, scheduling data, raffle data, locked data, ordered by display_order for backend re-sorting

- [x] **Task 5.1.2:** Implement getUserProgress function
    - **Action:** Add function querying mission_progress with VIP metric-aware field selection
    - **References:** API_CONTRACTS.md lines 2996-3005 (progress object with VIP metric formatting), SchemaFinalv2.md (mission_progress table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** Query mission_progress table for current_value, target_value, status, checkpoint_end. Return raw numeric values for backend VIP metric-aware formatting (lines 3092-3100): sales_dollars mode formats as "$350"/"$500", sales_units mode formats as "35 units"/"50 units", other types format as "8 videos"/"15 videos". Backend will calculate percentage, remainingText, progressText
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), returns progress with status/current_value/target_value/checkpoint_end for VIP metric-aware formatting by service layer, returns null for raffle/locked missions (no progress tracking per lines 2996, 3186)

- [x] **Task 5.1.3:** Implement claimReward function
    - **Action:** Add transactional function to update redemptions.status and create sub-state records
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim with sub-state creation lines 3766), SchemaFinalv2.md (redemptions, commission_boost_redemptions, physical_gift_redemptions tables), MissionsRewardsFlows.md (Mission Claim Flow), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute transactional workflow: (1) UPDATE redemptions SET status='claimed', claimed_at=NOW() WHERE mission_progress_id=$missionProgressId AND status='claimable' (line 3765), verify count > 0 after UPDATE, (2) For commission_boost: INSERT INTO commission_boost_redemptions (redemption_id, boost_status='pending_info', scheduled_activation_date, scheduled_activation_time), (3) For physical_gift: INSERT INTO physical_gift_redemptions (redemption_id, shipping_city, shipping_state, shipping_address_encrypted, size_value if provided), (4) For discount: store scheduled_activation_date and scheduled_activation_time in redemptions table. NO points (mission rewards are tied to redemptions table, not points system). Return redemption_id for response
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST validate redemptions.status='claimable' (line 3762), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5), updates redemptions.status 'claimable' → 'claimed' (line 3765), creates sub-state for commission_boost (commission_boost_redemptions) or physical_gift (physical_gift_redemptions) per line 3766, NO points addition (mission rewards use redemptions), returns redemption_id

- [x] **Task 5.1.4:** Create raffle repository file
    - **Action:** Create `/lib/repositories/raffleRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 5.1.5:** Implement participate function
    - **Action:** Add transactional function to update mission_progress, create redemption, and insert raffle participation
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate with 8-step processing lines 3805-3814), SchemaFinalv2.md (raffle_participations, mission_progress, redemptions tables), MissionsRewardsFlows.md (Raffle Mission Flow), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute transactional 3-database-operation workflow: (1) UPDATE mission_progress SET status='completed' WHERE user_id=$userId AND mission_id=$missionId AND status='active' (line 3811), verify count > 0 after UPDATE, (2) INSERT INTO redemptions (user_id, reward_id, mission_progress_id, client_id, status='claimable', claimed_at=NULL) for raffle reward (line 3812), (3) INSERT INTO raffle_participations (user_id, mission_id, client_id, is_winner=NULL, participated_at=NOW()) (line 3813). Return raffle data fields: draw_date from mission, prize name from reward. Check duplicate participation before INSERT by querying raffle_participations WHERE user_id + mission_id (line 3809)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST use transaction for 3 database operations, checks mission.mission_type='raffle' (line 3807), checks mission.activated=true (line 3808), prevents duplicate participation by checking raffle_participations table (line 3809), updates mission_progress.status 'active' → 'completed' (line 3811), creates redemptions row status='claimable' (line 3812), creates raffle_participations row is_winner=NULL (line 3813), returns draw_date and prize_name for response formatting

- [x] **Task 5.1.6:** Implement getHistory function
    - **Action:** Add function querying concluded/rejected missions with INNER JOIN redemptions
    - **References:** API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history backend query lines 3978-4009), SchemaFinalv2.md (mission_progress, redemptions, missions, rewards, raffle_participations tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query (lines 3978-4009): SELECT missions JOIN mission_progress JOIN rewards JOIN redemptions (INNER JOIN WHERE status IN ('concluded', 'rejected') lines 3997-4000) LEFT JOIN raffle_participations, WHERE client_id + mp.status != 'cancelled' (line 4006), ORDER BY COALESCE(concluded_at, rejected_at) DESC (line 4008). Return all fields for backend formatting: mission type/display_name, reward type/name/value_data, completion dates (completed_at, claimed_at, concluded_at/rejected_at), raffle data (is_winner, draw_date, prize_name). NO pagination per API spec (lines 3820-4041 show no pagination parameters)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes INNER JOIN redemptions WHERE status IN ('concluded', 'rejected') (lines 3997-4000), excludes cancelled missions mp.status != 'cancelled' (line 4006), NO pagination (API spec shows none), ordered by COALESCE(concluded_at, rejected_at) DESC (line 4008), includes mission/reward/completion/raffle fields for backend formatting, LEFT JOIN raffle_participations for rejected raffle data

## Step 5.2: Mission Services
- [x] **Task 5.2.1:** Create mission service file
    - **Action:** Create `/lib/services/missionService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [x] **Task 5.2.2:** Implement listAvailableMissions function
    - **Action:** Add function that computes 14-status ranking, formats display text with VIP metric mode, populates flippable cards, and sorts by featured + actionable priority
    - **References:** API_CONTRACTS.md lines 2955-3820 (GET /api/missions complete response with status computation, backend formatting, and sorting logic)
    - **Implementation Guide:** MUST call repository to get missions with progress/redemptions (LEFT JOIN data), then for each mission: (1) compute status from 14-priority ranking (lines 3232-3296): raffle_available, raffle_claim, default_claim, default_schedule, pending_info, clearing, sending, active, scheduled, redeeming/redeeming_physical, in_progress, raffle_won/raffle_processing/dormant, locked, (2) use static displayName mapping per mission_type (lines 3070-3079): sales→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle", (3) generate reward description with article for physical gifts/experiences (lines 3081-3090): "Win an iPhone 16 Pro!" using addArticle() helper, (4) format progress text per VIP metric mode (lines 3092-3100): sales_dollars→"$350 of $500"/"$150 more to go!", sales_units→"35 units of 50 units"/"15 more units to go!", (5) calculate deadline.daysRemaining from checkpoint_end, (6) populate scheduling data with formatted dates/times EST (lines 3025-3035), (7) populate raffleData with daysUntilDraw/isWinner/prizeName with article (lines 3037-3044), (8) populate lockedData with requiredTierName/requiredTierColor/unlockMessage (lines 3046-3053), (9) populate flippableCard ONLY for specific statuses (lines 3304-3463): redeeming, sending, scheduled, active, pending_info, clearing with type-specific content, (10) sort by featured mission first (line 3236-3239), then 12-priority status ranking (lines 3241-3296), then mission type priority (raffle→sales→videos→likes→views, line 3298). Return user info, featuredMissionId (always first in array), and sorted missions array
    - **Acceptance Criteria:** Returns complete MissionsPageResponse matching lines 2963-3065, calls repository for single query with LEFT JOINs, computes all 14 possible statuses using priority ranking (lines 3232-3296), uses static displayName mapping per mission_type (lines 3070-3079), generates reward descriptions with article for physical gifts/experiences (lines 3081-3090), formats ALL progress text per VIP metric mode (lines 3092-3100), calculates daysRemaining/daysUntilDraw in backend, populates flippableCard for 8 specific status+reward type combinations (lines 3304-3463), sorts with featured mission first guarantee (line 3300), then 12-priority status ranking, then mission type secondary sort (line 3298), includes featuredMissionId, follows service layer patterns

- [x] **Task 5.2.3:** Implement claimMissionReward function
    - **Action:** Add function that validates 7 steps, handles varying request body, and formats nextAction response
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim with 7-step validation), Loyalty.md Pattern 1 (Transactional), Pattern 2 (Idempotent), Pattern 3 (State Validation)
    - **Implementation Guide:** MUST validate 7 steps (lines 3761-3767): (1) verify mission_progress.status='completed' (line 3763), (2) check redemptions.status='claimable' not already claimed (line 3764, idempotent), (3) verify mission.tier_eligibility = user.current_tier (line 3765), (4) validate request body based on reward type (line 3766): instant rewards (gift_card/spark_ads/experience) empty body (line 3718), scheduled rewards (commission_boost/discount) require scheduledActivationDate YYYY-MM-DD + scheduledActivationTime HH:MM:SS EST (lines 3721-3724), physical gifts require shippingAddress object + optional size from valueData.sizeOptions (lines 3726-3743), (5) call repository to update redemptions.status 'claimable' → 'claimed' (line 3767), (6) create sub-state records if needed (line 3768), (7) log audit trail (line 3769). Format nextAction response (lines 3753-3758): type 'show_confirmation' or 'navigate_to_missions', status (new redemption status), message (next steps). NO points (mission rewards use redemptions, not points). Return success=true with message "Reward claimed successfully!" (line 3751)
    - **Acceptance Criteria:** Returns response matching lines 3749-3758, validates all 7 steps (lines 3761-3769), MUST be idempotent by checking redemptions.status='claimable' (line 3764), verifies mission_progress.status='completed' (line 3763), validates tier eligibility (line 3765), handles varying request body: instant empty, scheduled with date/time EST, physical with shippingAddress + optional size (lines 3717-3743), calls repository for transactional UPDATE + sub-state creation, NO points addition (mission rewards use redemptions), formats nextAction with type/status/message (lines 3753-3758), returns redemptionId, follows service layer patterns

- [x] **Task 5.2.4:** Implement participateInRaffle function
    - **Action:** Add idempotent function that validates 4 rules, executes 3 database operations, and formats raffle response
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate with 8-step backend processing), MissionsRewardsFlows.md (Raffle Mission Flow), Loyalty.md Pattern 2 (Idempotent)
    - **Implementation Guide:** MUST validate 4 pre-participation rules (lines 3807-3810): (1) verify mission.mission_type='raffle' (line 3807), (2) check mission.activated=true (line 3808), (3) verify user hasn't already participated by checking raffle_participations table return 409 if exists (line 3809, idempotent), (4) verify tier eligibility mission.tier_eligibility = user.current_tier (line 3810). Call repository for transactional 3 operations (lines 3811-3813). Format response (lines 3794-3801): drawDate ISO 8601 from mission.raffle_end_date, drawDateFormatted "Feb 20, 2025", daysUntilDraw backend-calculated from NOW() to raffle_end_date, prizeName with article "an iPhone 16 Pro" from reward.value_data.display_text. Return success=true with message "You're entered in the raffle!" (line 3797)
    - **Acceptance Criteria:** Returns response matching lines 3793-3802, validates all 4 pre-participation rules (lines 3807-3810), MUST be idempotent by checking raffle_participations (line 3809), verifies mission_type='raffle' (line 3807), checks activated=true (line 3808), validates tier eligibility (line 3810), calls repository for 3 transactional operations (mission_progress UPDATE, redemptions INSERT, raffle_participations INSERT), formats raffleData with drawDate/drawDateFormatted/daysUntilDraw/prizeName (lines 3796-3801), calculates daysUntilDraw in backend, adds article to prizeName, returns 409 if already participated, follows service layer patterns

- [x] **Task 5.2.5:** Implement getMissionHistory function
    - **Action:** Add function that formats concluded missions with reward-focused names and status determination
    - **References:** API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history complete response with backend formatting)
    - **Implementation Guide:** MUST call repository to get concluded/rejected missions, then for each: (1) determine status (lines 4011-4026): if redemption.status='concluded' return 'concluded', if redemption.status='rejected' AND raffle_participation.is_winner=false return 'rejected_raffle', (2) backend format reward name focused on reward not mission (lines 3883-3892): gift_card "$50 Gift Card" (not "Win a..."), commission_boost "5% Pay Boost", spark_ads "$100 Ads Boost", discount "15% Deal Boost", physical_gift/experience use display_text or description, (3) generate subtitle "From: {displayName} mission" (lines 3895-3903), (4) format dates: completedAt/completedAtFormatted, claimedAt/claimedAtFormatted, deliveredAt/deliveredAtFormatted with ISO 8601 + formatted "Jan 10, 2025" (lines 4022-4037), (5) populate raffleData for rejected raffles with isWinner=false, drawDate, drawDateFormatted, prizeName with article (lines 3864-3870). Return user info (id, currentTier, currentTierName, currentTierColor) and history array. NO pagination per API spec
    - **Acceptance Criteria:** Returns MissionHistoryResponse matching lines 3834-3872, calls repository for INNER JOIN redemptions, determines status: concluded or rejected_raffle (lines 4011-4026), formats reward names focused on reward (lines 3883-3892), generates subtitle "From: {displayName} mission" (lines 3895-3903), formats all dates with ISO 8601 + formatted versions (lines 4022-4037), includes raffleData with isWinner for lost raffles (lines 3864-3870), includes user section with tier info, NO pagination (API spec shows none), follows service layer patterns

## Step 5.3: Mission API Routes
- [x] **Task 5.3.1:** Create missions list route
    - **Action:** Create `/app/api/missions/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 2955-3820 (GET /api/missions for Missions page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST return complex missions page response with PRE-COMPUTED status, progress, and formatted display text (lines 2962-3065): (1) User & Tier Info with currentTier/currentTierName/currentTierColor (lines 2965-2971), (2) featuredMissionId for home page sync (line 2974), (3) missions array sorted by actionable priority with 14 possible statuses (in_progress, default_claim, default_schedule, scheduled, active, redeeming, redeeming_physical, sending, pending_info, clearing, dormant, raffle_available, raffle_processing, raffle_claim, raffle_won, locked) (lines 2990-2994), each mission includes progress object with backend-formatted currentFormatted/targetFormatted/remainingText/progressText per VIP metric mode (sales: "$350" vs units: "35 units") (lines 2996-3005, 3092-3100), deadline with daysRemaining (lines 3007-3012), scheduling data with formatted dates/times EST (lines 3025-3035), raffleData with daysUntilDraw/isWinner/prizeName with article (lines 3037-3044), lockedData with requiredTierName/unlockMessage (lines 3046-3053), flippableCard content (lines 3055-3063). Display name mapping static per type (lines 3070-3079): sales→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle". Reward descriptions VIP metric mode-aware (lines 3081-3090). Backend generates ALL formatted display text (lines 3092-3100)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, currentTier, currentTierName, currentTierColor}, featuredMissionId: string, missions: [{id, missionType, displayName, targetUnit, tierEligibility, rewardType, rewardDescription, status, progress: {currentValue, currentFormatted, targetValue, targetFormatted, percentage, remainingText, progressText} | null, deadline: {checkpointEnd, checkpointEndFormatted, daysRemaining} | null, valueData, scheduling, raffleData, lockedData, flippableCard}] }` per lines 2963-3065, filters by user's tier/client_id/enabled per Section 10.2, includes 14 possible mission statuses (lines 2990-2994), uses static display name mapping per type (lines 3070-3079), backend formats ALL progress text per VIP metric mode (sales: "$350" vs units: "35 units") (lines 3092-3100), formats reward descriptions with article "Win an iPhone 16 Pro!" (lines 3081-3090), calculates percentage/daysRemaining/daysUntilDraw in backend, provides raffleData with isWinner/prizeName, provides lockedData with requiredTierName/unlockMessage, returns 200 or 401/500, follows route pattern from Section 5

- [x] **Task 5.3.2:** Create claim mission route
    - **Action:** Create `/app/api/missions/[missionId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Mission Claim Validation, lines 1312-1323)
    - **Implementation Guide:** MUST implement 7-step validation workflow (lines 3759-3767): (1) verify mission_progress.status='completed' (line 3761), (2) check redemptions.status='claimable' not already claimed (line 3762), (3) verify mission.tier_eligibility = user.current_tier (line 3763), (4) validate request body based on reward type: instant rewards (gift_card/spark_ads/experience) empty body, scheduled rewards (commission_boost/discount) require scheduledActivationDate/Time EST (lines 3718-3722), physical gifts require shippingAddress + optional size from valueData.sizeOptions (lines 3724-3741), (5) update redemptions.status from 'claimable' → 'claimed' (line 3765), (6) create sub-state records if needed (line 3766), (7) log audit trail (line 3767). Per Section 10.2 validation table MUST check: mission completion current_value >= target_value, tier eligibility, client ownership, status='completed', prevent double-claim claimed_at === null (lines 1314-1322). Request body varies by reward type (lines 3715-3741)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemptionId: string, nextAction: {type: 'show_confirmation'|'navigate_to_missions', status: string, message: string} }` per lines 3747-3756, implements all 7 validation steps per lines 3759-3767, verifies mission_progress.status='completed' (line 3761), checks redemptions.status='claimable' (line 3762), validates tier eligibility (line 3763), accepts varying request body: instant rewards empty, scheduled rewards with scheduledActivationDate/Time EST, physical gifts with shippingAddress + optional size (lines 3715-3741), updates redemptions.status 'claimable' → 'claimed' (line 3765), creates sub-state records if needed (line 3766), logs audit trail (line 3767), validates per Section 10.2 table (mission completion, tier eligibility, client ownership, status='completed', prevent double-claim) (lines 1314-1322), validates missionId UUID, returns 200 for success or 400/404 for errors, follows route pattern from Section 5

- [x] **Task 5.3.3:** Create raffle participation route
    - **Action:** Create `/app/api/missions/[missionId]/participate/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 8-step backend processing workflow (lines 3803-3812): (1) verify mission.mission_type='raffle' (line 3805), (2) check mission.activated=true (line 3806), (3) verify user hasn't already participated check raffle_participations table (line 3807), (4) verify tier eligibility mission.tier_eligibility = user.current_tier (line 3808), (5) update mission_progress.status from 'active' → 'completed' (line 3809), (6) create redemptions row with status='claimable' (line 3810), (7) create raffle_participations row with is_winner=NULL (line 3811), (8) log audit trail (line 3812). Request body empty (line 3785). Response includes raffleData with drawDate ISO 8601, drawDateFormatted "Feb 20, 2025", daysUntilDraw backend-calculated, prizeName with article "an iPhone 16 Pro" (lines 3794-3799)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, raffleData: {drawDate: string, drawDateFormatted: string, daysUntilDraw: number, prizeName: string} }` per lines 3791-3800, implements all 8 processing steps per lines 3803-3812, accepts empty request body (line 3785), verifies mission_type='raffle' (line 3805), checks activated=true (line 3806), prevents duplicate participation (line 3807), validates tier eligibility (line 3808), updates mission_progress.status 'active' → 'completed' (line 3809), creates redemptions row status='claimable' (line 3810), creates raffle_participations row is_winner=NULL (line 3811), logs audit trail (line 3812), validates per Section 10.3 server-side, validates missionId UUID, returns 200 for success or 409 if already participated or 400/404 for other errors, follows route pattern from Section 5

- [x] **Task 5.3.4:** Create mission history route
    - **Action:** Create `/app/api/missions/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST query concluded missions with INNER JOIN on redemptions WHERE status IN ('concluded', 'rejected') (lines 3978-4009): SELECT missions JOIN mission_progress JOIN rewards JOIN redemptions (status IN 'concluded'/'rejected') LEFT JOIN raffle_participations, WHERE client_id + mp.status != 'cancelled', ORDER BY COALESCE(concluded_at, rejected_at) DESC (lines 4006-4009). Status determination (lines 4011-4026): if redemption.status='concluded' return 'concluded', if redemption.status='rejected' AND raffle_participation.is_winner=false return 'rejected_raffle'. Backend formats reward names focused on reward not mission (lines 3883-3892): gift_card "$50 Gift Card", commission_boost "5% Pay Boost", spark_ads "$100 Ads Boost", discount "15% Deal Boost", physical_gift/experience use display_text or description. Subtitle format "From: {displayName} mission" (lines 3895-3903). Date fields (lines 4029-4045): concluded missions use completed_at/claimed_at/concluded_at, rejected raffles use participated_at with null claimed_at/deliveredAt. Each date includes ISO 8601 and formatted version "Jan 10, 2025"
    - **Acceptance Criteria:** MUST return `{ user: {id, currentTier, currentTierName, currentTierColor}, history: [{id, missionType, displayName, status: 'concluded'|'rejected_raffle', rewardType, rewardName, rewardSubtitle, completedAt, completedAtFormatted, claimedAt, claimedAtFormatted, deliveredAt, deliveredAtFormatted, raffleData: {isWinner, drawDate, drawDateFormatted, prizeName} | null}] }` per lines 3834-3872, queries with INNER JOIN on redemptions WHERE status IN ('concluded', 'rejected') (lines 3997-4000), filters by client_id per Section 10.2, excludes cancelled missions mp.status != 'cancelled' (line 4006), orders by concluded_at/rejected_at DESC (line 4008), determines status: concluded or rejected_raffle (lines 4007-4018), backend formats reward names focused on reward (lines 3883-3892), generates subtitle "From: {displayName} mission" (lines 3895-3903), includes formatted dates for completedAt/claimedAt/deliveredAt (lines 4022-4037), provides raffleData with isWinner for lost raffles (lines 3864-3870), returns 200 or 401/500, follows route pattern from Section 5

## Step 5.4: Mission Testing
- [x] **Task 5.4.1:** Create mission service tests
    - **Action:** Create `/tests/integration/services/missionService.test.ts`
    - **References:** SchemaFinalv2.md lines 358-455 (missions and mission_progress tables), ARCHITECTURE.md Section 5 (Service Layer, lines 641-750)
    - **Implementation Guide:** MUST create test file with: (1) import factories from /tests/fixtures/factories.ts, (2) import missionService, (3) beforeEach: create test client, tiers, user, missions using factories, (4) afterEach: call cleanupTestData(), (5) describe blocks for: 'listAvailableMissions', 'claimMissionReward', 'participateInRaffle', 'getMissionHistory'
    - **Acceptance Criteria:** File exists with test suite skeleton, imports working, beforeEach/afterEach setup test isolation

- [x] **Task 5.4.2:** Test mission completion edge cases
    - **Action:** Create `/tests/integration/missions/completion-detection.test.ts`
    - **References:** SchemaFinalv2.md lines 421-455 (mission_progress table), API_CONTRACTS.md lines 2952-3140 (GET /api/missions response with progress), MissionsRewardsFlows.md lines 146-322 (Standard Mission Flow)
    - **Implementation Guide:** MUST test completion boundaries: (1) create mission with target_value=500, (2) Test at target: UPDATE mission_progress SET current_value=500, call GET /api/dashboard/featured-mission → expect status='completed', (3) Test below target: UPDATE current_value=499 → expect status='active', (4) Test above target: UPDATE current_value=501 → expect status='completed', (5) Test mission_progress.status field is updated correctly by backend trigger or service, (6) verify target_unit matches client.vip_metric ('dollars' or 'units')
    - **Test Cases:** (1) current_value = target_value → status='completed', (2) current_value = target_value - 1 → status='active', (3) current_value = target_value + 1 → status='completed', (4) completion detected regardless of how much over target
    - **Acceptance Criteria:** All 4 test cases MUST pass, mission_progress.status MUST transition to 'completed' when current_value >= target_value per SchemaFinalv2.md line 430, prevents mission-stuck-cant-claim catastrophic bug

- [x] **Task 5.4.3:** Test mission claim creates redemption
    - **Action:** Create `/tests/integration/missions/claim-creates-redemption.test.ts`
    - **References:** API_CONTRACTS.md lines 3142-3258 (POST /api/missions/:id/claim), SchemaFinalv2.md lines 590-661 (redemptions table), MissionsRewardsFlows.md lines 146-322 (claim flow)
    - **Implementation Guide:** MUST test claim creates correct records: (1) create user at tier_3, mission with tier_eligibility='tier_3' and reward_id, set mission_progress.status='completed', (2) POST /api/missions/:id/claim → expect 200, (3) query redemptions table → verify record exists with: user_id matches, reward_id matches mission.reward_id, status='claimed', tier_at_claim='tier_3', mission_progress_id set, client_id matches, (4) verify mission_progress.status updated to 'claimed' or appropriate state, (5) verify response includes redemptionId
    - **Test Cases:** (1) claim creates redemption with status='claimed', (2) redemption.reward_id matches mission.reward_id, (3) redemption.tier_at_claim matches user's current tier, (4) mission_progress linked via mission_progress_id, (5) response includes valid redemptionId UUID
    - **Acceptance Criteria:** All 5 test cases MUST pass, redemption record MUST be created per SchemaFinalv2.md lines 590-658, all FK relationships MUST be correct, prevents claim-broken-no-reward catastrophic bug

- [x] **Task 5.4.4:** Test idempotent mission claim
    - **Action:** Add test to `/tests/integration/missions/claim-creates-redemption.test.ts`
    - **References:** Loyalty.md lines 2031-2050 (Pattern 2: Idempotent Operations), API_CONTRACTS.md lines 3142-3258 (claim endpoint)
    - **Implementation Guide:** MUST test idempotency: (1) setup completed mission, (2) POST /api/missions/:id/claim first time → expect 200, store redemptionId, (3) POST /api/missions/:id/claim second time → expect 400 ALREADY_CLAIMED or 200 with same redemptionId (idempotent), (4) query redemptions table → COUNT(*) WHERE mission_progress_id = X MUST equal 1, (5) verify user was NOT double-rewarded (no duplicate records)
    - **Test Cases:** (1) first claim succeeds with 200, (2) second claim returns ALREADY_CLAIMED or same redemption, (3) exactly 1 redemption record exists (not 2)
    - **Acceptance Criteria:** All 3 test cases MUST pass, duplicate claim MUST NOT create duplicate redemption per Loyalty.md Pattern 2, prevents double-payout catastrophic bug

- [x] **Task 5.4.5:** Test state validation on claim
    - **Action:** Create `/tests/integration/missions/state-validation.test.ts`
    - **References:** Loyalty.md lines 2051-2090 (Pattern 3: State Transition Validation), SchemaFinalv2.md lines 430-432 (mission_progress.status options)
    - **Implementation Guide:** MUST test invalid states rejected: (1) create mission_progress with status='active', (2) POST /api/missions/:id/claim → expect 400 MISSION_NOT_COMPLETED, (3) UPDATE status='dormant', POST claim → expect 400, (4) Test invalid DB transition: attempt direct UPDATE mission_progress SET status='active' WHERE status='completed' → expect DB constraint error or service rejection, (5) verify mission_progress.status can only transition forward: active→completed→claimed, never backward
    - **Test Cases:** (1) claim on status='active' returns 400 MISSION_NOT_COMPLETED, (2) claim on status='dormant' returns 400, (3) invalid backward transition completed→active rejected, (4) only forward transitions allowed
    - **Acceptance Criteria:** All 4 test cases MUST pass, state transitions MUST follow Loyalty.md Pattern 3, prevents corrupt-data catastrophic bug

- [x] **Task 5.4.6:** Test tier filtering for missions
    - **Action:** Create `/tests/integration/missions/tier-filtering.test.ts`
    - **References:** SchemaFinalv2.md lines 373-374 (missions.tier_eligibility, preview_from_tier), API_CONTRACTS.md lines 2952-3140 (GET /api/missions with tier filtering)
    - **Implementation Guide:** MUST test tier visibility: (1) create Gold user (tier_3), (2) create mission with tier_eligibility='tier_3' (Gold), (3) create mission with tier_eligibility='tier_4' (Platinum), (4) create mission with tier_eligibility='tier_4' AND preview_from_tier='tier_3', (5) GET /api/missions as Gold user → MUST contain Gold mission, MUST NOT contain Platinum mission (unless preview), (6) if preview mission returned, verify it has isPreview=true or locked state, (7) POST /api/missions/:platinumMissionId/claim as Gold user → expect 403 TIER_MISMATCH
    - **Test Cases:** (1) Gold user sees tier_3 missions, (2) Gold user does NOT see tier_4 missions (no preview), (3) Gold user sees tier_4 mission with preview_from_tier='tier_3' as preview/locked, (4) Gold user cannot claim tier_4 mission (403)
    - **Acceptance Criteria:** All 4 test cases MUST pass, tier_eligibility MUST filter missions per SchemaFinalv2.md line 373, preview_from_tier MUST show teaser per line 374, prevents wrong-content-shown bug

- [x] **Task 5.4.7:** Test mission history shows completed
    - **Action:** Create `/tests/integration/missions/history-completeness.test.ts`
    - **References:** API_CONTRACTS.md lines 3827-4047 (GET /api/missions/history), SchemaFinalv2.md lines 421-455 (mission_progress)
    - **Implementation Guide:** MUST test history completeness: (1) create user with mission, set mission_progress.status='completed', (2) POST /api/missions/:id/claim → creates redemption, (3) GET /api/missions/history → expect mission in response, (4) verify response includes: mission id, displayName, status='concluded', rewardType, rewardName, completedAt, claimedAt timestamps, (5) verify mission does NOT appear in GET /api/missions (active list), (6) create second mission, complete and claim it, verify BOTH appear in history (no data vanishing)
    - **Test Cases:** (1) completed+claimed mission appears in history, (2) history includes redemption info (rewardName, claimedAt), (3) concluded mission NOT in active missions list, (4) multiple completed missions all appear (no vanishing)
    - **Acceptance Criteria:** All 4 test cases MUST pass, history MUST show all concluded missions per API_CONTRACTS.md lines 3827-4047, prevents user-thinks-data-vanished catastrophic bug

- [x] **Task 5.4.8:** Test raffle winner and losers
    - **Action:** Create `/tests/integration/missions/raffle-winner-selection.test.ts`
    - **References:** API_CONTRACTS.md lines 3261-3430 (POST /api/missions/:id/raffle/participate), SchemaFinalv2.md lines 888-953 (raffle_participations table), MissionsRewardsFlows.md lines 3-143 (Raffle Mission Flow)
    - **Implementation Guide:** MUST test complete raffle flow: (1) create raffle mission with mission_type='raffle' and raffle_end_date in past, (2) create 5 test users all at eligible tier, (3) each user calls POST /api/missions/:id/raffle/participate → expect 200 for all 5, (4) verify 5 raffle_participations records with is_winner=NULL, (5) simulate admin winner selection (direct DB or admin endpoint): UPDATE raffle_participations SET is_winner=true, winner_selected_at=NOW() WHERE user_id=:winner_id, UPDATE is_winner=false for other 4, (6) verify winner: redemption.status='claimable', is_winner=true, winner_selected_at set, (7) verify 4 losers: redemption.status='rejected', is_winner=false, (8) GET /api/missions/history as loser → verify raffleData.isWinner=false in response
    - **Test Cases:** (1) 5 users participate successfully, (2) admin selection sets 1 winner is_winner=true, (3) 4 losers have is_winner=false, (4) winner redemption status='claimable', (5) loser redemptions status='rejected', (6) loser history shows raffleData.isWinner=false ("Better luck next time")
    - **Acceptance Criteria:** All 6 test cases MUST pass, raffle_participations.is_winner MUST be correctly set per SchemaFinalv2.md line 923, redemption statuses MUST match winner/loser per lines 938-941, prevents everyone-wins-100-iPhones catastrophic bug

- [x] **Task 5.4.9:** Test disabled mission filtering
    - **Action:** Create `tests/integration/missions/disabled-filtering.test.ts` with test cases verifying missions with `activated=false` are excluded from queries
    - **References:** SchemaFinalv2.md lines 362-420 (missions table, activated column), lib/services/missionService.ts (listAvailableMissions WHERE clause), API_CONTRACTS.md lines 2951-3140 (GET /api/missions)
    - **Implementation Guide:** MUST test 2 cases: (1) query with activated=true mission returns that mission, (2) query with activated=false mission excludes it from results. Use same factory pattern as existing mission tests.
    - **Acceptance Criteria:** Test file exists with 2+ passing tests, queries MUST verify `activated=true` filter excludes deactivated missions, follows multi-tenant pattern (client_id filter)

- [x] **Task 5.4.10:** Test mission priority sorting
    - **Action:** Create `tests/integration/missions/priority-sorting.test.ts` with test cases verifying 12-priority status sorting order
    - **References:** lib/services/missionService.ts lines 800-900 (sortMissionsByPriority function), API_CONTRACTS.md lines 3000-3100 (status enum and display order), repodocs/MISSIONS_IMPL.md (12-priority sort documentation)
    - **Implementation Guide:** MUST test 3 cases: (1) default_claim missions appear before in_progress, (2) locked missions appear after claimable missions, (3) full sort order matches: default_claim > default_schedule > boost_claim > boost_schedule > raffle_available > raffle_processing > in_progress > locked > locked_schedule > locked_raffle > locked_boost > concluded
    - **Acceptance Criteria:** Test file exists with 3+ passing tests, sorting MUST match 12-priority order documented in MISSIONS_IMPL.md, test creates missions with different statuses and verifies array order

---

# PHASE 6: REWARDS SYSTEM

**Objective:** Implement reward listing, redemption, sub-state management.

## Step 6.1: Reward Repositories
- [x] **Task 6.1.1:** Create reward repository file
    - **Action:** Create `/lib/repositories/rewardRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 6.1.2:** Implement listAvailable function
    - **Action:** Add function querying rewards with active redemptions and sub-states using LEFT JOINs
    - **References:** API_CONTRACTS.md lines 4053-4827 (GET /api/rewards database query lines 4733-4792), SchemaFinalv2.md (rewards table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute single optimized query (lines 4733-4792) with LEFT JOINs to: (1) redemptions table WHERE mission_progress_id IS NULL AND status NOT IN ('concluded', 'rejected') AND deleted_at IS NULL (lines 4769-4775), (2) commission_boost_redemptions for boost_status/activated_at/expires_at/sales_at_expiration (lines 4758, 4739-4743), (3) physical_gift_redemptions for shipping_city/shipped_at (lines 4759, 4745-4747), (4) tiers for tier_name (line 4768). Filter rewards WHERE client_id=$clientId AND enabled=true AND reward_source='vip_tier' AND (tier_eligibility=$currentTier OR preview_from_tier filtering lines 4782-4790). Return all data needed for backend status computation and formatting including rewardSource field. Use single query strategy for performance (lines 4796-4804)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes single query with LEFT JOINs to redemptions/commission_boost_redemptions/physical_gift_redemptions/tiers per lines 4733-4792, filters by enabled=true AND reward_source='vip_tier' (excludes mission rewards per line 4781), filters by tier_eligibility OR preview_from_tier logic (lines 4782-4790), excludes concluded/rejected redemptions (line 4773), includes all fields needed for status computation (redemption_status, boost_status, shipping_city, shipped_at, scheduled dates, activation dates), includes rewardSource in response, ordered by display_order ASC for backend re-sorting

- [x] **Task 6.1.3:** Implement getUsageCount function
    - **Action:** Add function counting VIP tier redemptions for current tier only with tier achievement reset logic
    - **References:** API_CONTRACTS.md lines 4540-4590 (Usage Count Calculation for VIP Tier Rewards), SchemaFinalv2.md (redemptions table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query per lines 4542-4556: SELECT COUNT(*) FROM redemptions WHERE user_id=$userId AND reward_id=$rewardId AND mission_progress_id IS NULL (VIP tier rewards only, line 4548) AND tier_at_claim=$currentTier (current tier only, line 4549) AND status IN ('claimed', 'fulfilled', 'concluded') (active and completed claims, line 4550) AND deleted_at IS NULL (not soft-deleted, line 4551) AND created_at >= (SELECT tier_achieved_at FROM users WHERE id=$userId) (resets on tier change, lines 4552-4556). Key points (lines 4559-4562): mission rewards don't count (mission_progress_id IS NULL), only current tier counts (tier_at_claim filter), resets when tier changes (tier_achieved_at comparison). Usage count reset behavior (lines 4564-4600): tier promotion resets to 0, tier demotion soft-deletes higher tier redemptions, re-promotion gives fresh limits. Note: This function is for VIP tier rewards only (reward_source='vip_tier'); mission reward usage is tracked separately via mission_progress_id
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), counts WHERE mission_progress_id IS NULL (VIP tier rewards only per line 4548), filters tier_at_claim=$currentTier (current tier only per line 4549), filters status IN ('claimed', 'fulfilled', 'concluded') per line 4550, excludes soft-deleted (deleted_at IS NULL per line 4551), filters created_at >= tier_achieved_at for tier change reset logic (lines 4552-4556), implements fresh count on tier promotion/demotion/re-promotion per lines 4564-4600, validates reward has reward_source='vip_tier' before counting

- [x] **Task 6.1.4:** Implement redeemReward function
    - **Action:** Add transactional function to insert redemption with tier-specific usage counting and create sub-state tables
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim with usage limits and sub-state requirements), SchemaFinalv2.md (redemptions, commission_boost_redemptions, physical_gift_redemptions tables), Loyalty.md Pattern 1 (Transactional), Pattern 6 (VIP Reward Lifecycle), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST first validate reward.reward_source='vip_tier' (line 4934-4938, mission rewards use POST /api/missions/:id/claim instead). MUST execute transactional INSERT with tier-specific data: (1) INSERT INTO redemptions (user_id, reward_id, client_id, status='claimed', claimed_at=NOW(), tier_at_claim=$currentTier, mission_progress_id=NULL for VIP tier rewards line 4908, scheduled_activation_date/time if provided) (2) Count usage WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931) to enforce usage limits, (3) For commission_boost: INSERT INTO commission_boost_redemptions (redemption_id, boost_status='pending_info', scheduled_activation_date/time), (4) For physical_gift: INSERT INTO physical_gift_redemptions (redemption_id, shipping_city, shipping_state, shipping_address_encrypted, size_value if provided), (5) For discount: store scheduled_activation_date and scheduled_activation_time in redemptions table. NO points deduction (VIP tier rewards use redemption_quantity limits, not points per line 4814). Redemption period reset: gift_card/physical_gift/experience count once forever, commission_boost/spark_ads/discount reset on tier re-achievement (lines 4953-4965)
    - **Acceptance Criteria:** MUST validate reward.reward_source='vip_tier' before processing (lines 4934-4938), MUST validate client_id is provided (Section 9 Critical Rule #2), MUST use transaction, NO points deduction (VIP tier rewards line 4814), enforces usage limits with tier-specific count WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931), inserts redemption with tier_at_claim field, creates sub-state for commission_boost (commission_boost_redemptions) or physical_gift (physical_gift_redemptions), applies redemption period reset rules (lines 4953-4965), returns redemption ID and created sub-state IDs

- [x] **Task 6.1.5:** Create redemption repository file
    - **Action:** Create `/lib/repositories/redemptionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 6.1.6:** Implement getHistory function
    - **Action:** Add function querying concluded redemptions with INNER JOIN rewards for user
    - **References:** API_CONTRACTS.md lines 5439-5578 (GET /api/rewards/history backend query lines 5454-5468), SchemaFinalv2.md (redemptions, rewards tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query (lines 5467-5485): SELECT redemptions.id, reward_id, rewards.type, rewards.name, rewards.description, rewards.value_data, rewards.reward_source, claimed_at, concluded_at FROM redemptions INNER JOIN rewards ON redemptions.reward_id = rewards.id WHERE redemptions.user_id=$userId AND redemptions.status='concluded' AND redemptions.client_id=$clientId ORDER BY concluded_at DESC. Return all fields needed for backend formatting: type (for formatting rules), name, description, value_data JSONB (for amount/percent/durationDays/displayText), reward_source (for rewardSource in response), claimed_at, concluded_at. NO pagination per API spec (lines 5413-5554 show no offset/limit parameters). Note: History can contain both VIP tier and mission rewards
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes INNER JOIN rewards (line 5490), filters WHERE status='concluded' (line 5466), NO pagination (API spec shows no pagination), ordered by concluded_at DESC (line 5467), returns all fields needed for backend formatting (type, name, description, value_data, reward_source, claimed_at, concluded_at), includes rewardSource in response (line 5497)

- [x] **Task 6.1.7:** Create commission boost repository file
    - **Action:** Create `/lib/repositories/commissionBoostRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 6.1.8:** Implement createBoostState function
    - **Action:** Add function to insert commission_boost_redemptions record with state history
    - **References:** SchemaFinalv2.md (commission_boost_redemptions table lines 666-746), Loyalty.md Pattern 7 (Commission Boost State History), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST insert into commission_boost_redemptions AND commission_boost_state_history (from_status=NULL, to_status='scheduled'), creates state with boost_rate, scheduled_activation_date, duration_days, boost_status='scheduled' (per SchemaFinalv2.md default)

- [x] **Task 6.1.9:** ~~Implement deactivateBoost function~~ **REMOVED**
    - **Reason:** 'deactivated' is not a valid boost_status per SchemaFinalv2.md CHECK constraint. Boost cancellation is handled via parent redemptions.status='rejected' pattern instead. No new status needed.

- [x] **Task 6.1.10:** Create physical gift repository file
    - **Action:** Create `/lib/repositories/physicalGiftRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [x] **Task 6.1.11:** Implement createGiftState function
    - **Action:** Add function to insert physical_gift_redemptions with shipping address
    - **References:** SchemaFinalv2.md (physical_gift_redemptions table lines 826-890), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), inserts shipping info fields per SchemaFinalv2.md (no encryption - shipping addresses not classified as sensitive per Loyalty.md Pattern 9), shipping state inferred from timestamps (shipped_at IS NULL = pending, per schema design)

- [x] **Task 6.1.12:** Implement markAsShipped function
    - **Action:** Add function to update shipped_at timestamp with tracking info (per SchemaFinalv2.md timestamp-based design, no shipping_status column)
    - **References:** SchemaFinalv2.md (physical_gift_redemptions table lines 867-870), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5), sets shipped_at=NOW(), tracking_number, carrier; shipping state inferred from timestamps (shipped_at IS NULL = pending, shipped_at IS NOT NULL = shipped)

- [x] **Task 6.1.13:** Implement getPaymentInfo function
    - **Action:** Add function to retrieve and decrypt saved payment info from users table
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info response schema lines 5260-5264), ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Section 9 (Multitenancy Enforcement, lines 1104-1137), Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Implementation Guide:** Query users table: SELECT default_payment_method, default_payment_account WHERE id=$userId AND client_id=$clientId. Decrypt default_payment_account using encryption utility (Pattern 9). Return object with hasPaymentInfo boolean, paymentMethod ('paypal'|'venmo'|null), and decrypted paymentAccount (string|null) per lines 5260-5264. If default_payment_method IS NULL return hasPaymentInfo=false with null values (lines 5278-5285), else return hasPaymentInfo=true with decrypted account (lines 5269-5275)
    - **Acceptance Criteria:** MUST decrypt default_payment_account field using encryption utility (Section 9 checklist item 6, Pattern 9), MUST filter by client_id AND user_id (Section 9 Critical Rule #1), queries users.default_payment_method and users.default_payment_account (not commission_boost_redemptions), returns object matching lines 5260-5264 with hasPaymentInfo boolean, paymentMethod ('paypal'|'venmo'|null), paymentAccount (decrypted string|null), returns hasPaymentInfo=false with nulls if no saved info

- [x] **Task 6.1.14:** Implement savePaymentInfo function
    - **Action:** Add function to update commission_boost_redemptions with encrypted payment info, update redemption status, and optionally save to user defaults
    - **References:** API_CONTRACTS.md lines 5331-5451 (POST /api/rewards/:id/payment-info), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table - payment fields), lines 590-661 (redemptions table - status only), ARCHITECTURE.md Section 9 (Multitenancy Enforcement), Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Implementation Guide:** MUST perform 3 database operations: (1) UPDATE commission_boost_redemptions SET payment_method=$paymentMethod, payment_account=encrypt($paymentAccount), payment_info_collected_at=NOW(), boost_status='pending_payout' WHERE redemption_id=$redemptionId AND client_id=$clientId, verify count > 0 (Section 9 checklist item 4), (2) UPDATE redemptions SET status='fulfilled', fulfilled_at=NOW() WHERE id=$redemptionId AND client_id=$clientId, (3) if saveAsDefault=true then UPDATE users SET default_payment_method=$paymentMethod, default_payment_account=encrypt($paymentAccount), payment_info_updated_at=NOW() WHERE id=$userId AND client_id=$clientId. PaymentMethod ONLY 'paypal' or 'venmo'. Return updated redemption data and userPaymentUpdated boolean
    - **Acceptance Criteria:** MUST encrypt payment_account before UPDATE using encryption utility (Pattern 9), validates paymentMethod is 'paypal' or 'venmo' ONLY, updates commission_boost_redemptions.payment_method/payment_account/payment_info_collected_at (NOT redemptions table), updates commission_boost_redemptions.boost_status to 'pending_payout', updates redemptions.status to 'fulfilled' and fulfilled_at timestamp, MUST filter by client_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), if saveAsDefault=true updates users.default_payment_method and users.default_payment_account with encryption, returns userPaymentUpdated boolean

## Step 6.2: Reward Services
- [x] **Task 6.2.1:** Create reward service file
    - **Action:** Create `/lib/services/rewardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [x] **Task 6.2.2:** Implement listAvailableRewards function
    - **Action:** Add function that computes status, formats display text, calculates availability, and sorts by actionable priority
    - **References:** API_CONTRACTS.md lines 4053-4827 (GET /api/rewards complete response with status computation, backend formatting, and sorting logic)
    - **Implementation Guide:** MUST call repository to get rewards with active redemptions (LEFT JOIN data), then for each reward: (1) compute status from 10-priority ranking (lines 4403-4536): pending_info, clearing, sending, active, scheduled, redeeming_physical, redeeming, claimable, limit_reached, locked, (2) generate backend-formatted name and displayText per type (lines 4142-4161): gift_card "$X Gift Card"/"Amazon Gift Card", commission_boost "X% Pay Boost"/"Higher earnings (Xd)", spark_ads "$X Ads Boost"/"Spark Ads Promo", discount "X% Deal Boost"/"Follower Discount (Xd)", physical_gift "Gift Drop: {desc}"/{valueData.displayText}, experience {desc}/{valueData.displayText}, (3) compute canClaim based on tier match + limit + enabled + no active claim (line 4102), compute isLocked for tier mismatch (line 4103), compute isPreview for preview_from_tier (line 4104), (4) calculate usedCount for VIP tier rewards WHERE mission_progress_id IS NULL AND tier_at_claim=current_tier (line 4107), (5) generate statusDetails with formatted dates/times (lines 4115-4131), (6) sort by dual-sort: status priority 1-10, then display_order (lines 4652-4709). Transform discount duration_minutes to durationDays (lines 4637-4648). Return user info, redemptionCount (COUNT status='concluded'), and sorted rewards array
    - **Acceptance Criteria:** Returns complete RewardsPageResponse matching lines 4059-4138, calls repository for single query with LEFT JOINs, computes all 10 possible statuses using priority ranking (lines 4403-4536), generates backend-formatted name/displayText per type (lines 4142-4161), computes canClaim/isLocked/isPreview flags (lines 4101-4104), calculates usedCount with VIP tier filtering (line 4107), generates statusDetails with formatted dates (lines 4115-4131), transforms discount duration_minutes to durationDays (lines 4637-4648), sorts by status priority 1-10 then display_order (lines 4652-4709), includes redemptionCount for history link, follows service layer patterns

- [x] **Task 6.2.3:** Implement claimReward function with type routing
    - **Action:** Add function that validates 11 pre-claim rules, routes by reward type, and enforces scheduling constraints
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim with 11-step validation), MissionsRewardsFlows.md (6 reward types), ARCHITECTURE.md Section 10.1 (Rewards Claim Validation, lines 1201-1294), Loyalty.md lines 2011-2077 (Reward Redemption Rules & Edge Cases: Once Forever vs Once Per Tier Achievement)
    - **Implementation Guide:** MUST validate 11 pre-claim rules (lines 4902-4951): (1) auth JWT, (2) reward exists, (3) enabled=true, (4) tier_eligibility matches current_tier, (5) VIP tier only (mission_progress_id IS NULL), (6) no active redemption status IN ('claimed', 'fulfilled') (lines 4909-4917), (7) usage limit COUNT < redemption_quantity with tier-specific WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931), (8) scheduling required for discount/commission_boost, (9) discount: weekday Mon-Fri + 09:00-16:00 EST + future date (lines 4933-4936), (10) commission_boost: future date + auto-set time to 14:00:00 EST / 19:00 UTC (lines 4937-4939), (11) physical_gift: shippingInfo required + sizeValue if requires_size=true matching size_options (lines 4940-4951). Route by type: instant (gift_card/spark_ads/experience) empty body, scheduled (discount/commission_boost) with scheduledActivationAt, physical_gift with shippingInfo+optional sizeValue. Apply redemption period reset rules (lines 4953-4965). Return 10 error types (lines 5138-5238): ACTIVE_CLAIM_EXISTS, LIMIT_REACHED, SCHEDULING_REQUIRED, INVALID_SCHEDULE, INVALID_TIME_SLOT, SHIPPING_INFO_REQUIRED, SIZE_REQUIRED, INVALID_SIZE_SELECTION, TIER_NOT_ELIGIBLE, CLAIM_FAILED
    - **Acceptance Criteria:** Validates all 11 pre-claim rules (lines 4902-4951), checks tier eligibility matches current_tier (line 4907), checks no active redemption (lines 4909-4917), enforces tier-specific usage limits (lines 4919-4931), validates discount scheduling weekday + 09:00-16:00 EST (lines 4933-4936), auto-sets commission_boost time to 14:00:00 EST / 19:00 UTC (lines 4937-4939), validates physical_gift shippingInfo + size requirements (lines 4940-4951), routes by reward type (instant/scheduled/physical), applies redemption period reset rules (lines 4953-4965), throws specific error types, calls repository.redeemReward, returns complete response with updatedRewards array, follows service layer patterns

- [x] **Task 6.2.4:** Implement claimInstant function
    - **Action:** Add function for instant reward claim (gift_card, spark_ads, experience) with Google Calendar event creation. Called from claimReward() after validation passes.
    - **References:** Loyalty.md lines 1698-1711 (Instant Rewards calendar trigger), MissionsRewardsFlows.md (Instant Reward Flow), lib/utils/googleCalendar.ts (createInstantRewardEvent helper)
    - **Implementation Guide:** (1) Call rewardRepository.redeemReward() to create redemption (status='claimed'), (2) Call googleCalendar.createInstantRewardEvent with handle, rewardType, value, email, (3) If calendar succeeds, call rewardRepository.updateCalendarEventId() to store event_id, (4) Build and return ClaimRewardResponse. Title: "🎁 Fulfill {reward_type}: @{handle}", due: claimed_at + 2 hours.
    - **Acceptance Criteria:** Calls redeemReward() (redemption created), creates Google Calendar event with 2-hour due time via createInstantRewardEvent(), stores google_calendar_event_id via updateCalendarEventId(), handles calendar API errors gracefully (redemption still succeeds if calendar fails), returns ClaimRewardResponse
    - **Pre-requisites:** (1) Add updateCalendarEventId(redemptionId, clientId, eventId) to rewardRepository.ts, (2) Add userHandle: string and userEmail: string to ClaimRewardParams interface (needed for calendar event title/description, route passes from user data)

- [x] **Task 6.2.5:** Implement claimScheduled function
    - **Action:** Add function for scheduled reward (discount) with Google Calendar event creation. Called from claimReward() after validation passes.
    - **References:** Loyalty.md lines 1732-1750 (Discount Activation calendar trigger), MissionsRewardsFlows.md (Scheduled Reward Flow), lib/utils/googleCalendar.ts (createDiscountActivationEvent helper)
    - **Implementation Guide:** (1) Call rewardRepository.redeemReward() with scheduledActivationDate/Time to create redemption (status='claimed', redemption_type='scheduled'), (2) Call googleCalendar.createDiscountActivationEvent with handle, percent, durationMinutes, couponCode, maxUses, activationDateTime, (3) If calendar succeeds, call rewardRepository.updateCalendarEventId() to store event_id, (4) Build and return ClaimRewardResponse. Title: "🔔 Activate Discount: @{handle}", due: scheduled_activation_date + time, 15-min reminder.
    - **Acceptance Criteria:** Calls redeemReward() with scheduled fields, creates Google Calendar event at scheduled time with 15-min reminder via createDiscountActivationEvent(), stores google_calendar_event_id via updateCalendarEventId(), handles calendar API errors gracefully, returns ClaimRewardResponse

- [x] **Task 6.2.6:** Implement claimPhysical function
    - **Action:** Add function for physical_gift reward with shipping address and Google Calendar event creation. Called from claimReward() after validation passes.
    - **References:** Loyalty.md lines 1713-1730 (Physical Gift calendar trigger), MissionsRewardsFlows.md (Physical Gift Flow), lib/utils/googleCalendar.ts (createPhysicalGiftEvent helper)
    - **Implementation Guide:** (1) Call rewardRepository.redeemReward() with shippingInfo to create redemption + physical_gift_redemptions row, (2) Call googleCalendar.createPhysicalGiftEvent with handle, itemName, sizeValue, shippingAddress, (3) If calendar succeeds, call rewardRepository.updateCalendarEventId() to store event_id, (4) Build and return ClaimRewardResponse. Title: "📦 Ship Physical Gift: @{handle}", due: claimed_at + 2 hours.
    - **Acceptance Criteria:** Calls redeemReward() which creates physical_gift_redemptions with shipping address, creates Google Calendar event with 2-hour due time and shipping details via createPhysicalGiftEvent(), stores google_calendar_event_id via updateCalendarEventId(), handles calendar API errors gracefully, returns ClaimRewardResponse

- [x] **Task 6.2.7:** Implement claimCommissionBoost function
    - **Action:** Add function for commission_boost reward. Called from claimReward() after validation passes. NOTE: Calendar event is NOT created at claim time - it's created at pending_payout (Task 6.2.7a).
    - **References:** Loyalty.md Pattern 4 (Auto-Sync), Pattern 7 (Boost History), SchemaFinalv2.md lines 665-746 (commission_boost_redemptions table)
    - **Implementation Guide:** (1) Call rewardRepository.redeemReward() with scheduledActivationDate/Time, durationDays, boostRate to create redemption + commission_boost_redemptions row (boost_status='scheduled'), (2) NO calendar event at claim - calendar created when boost reaches pending_payout (Task 6.2.7a), (3) Build and return ClaimRewardResponse.
    - **Acceptance Criteria:** Calls redeemReward() which creates commission_boost_redemptions with boost_status='scheduled', NO calendar event at claim time (deferred to 6.2.7a), returns ClaimRewardResponse with scheduled confirmation

- [x] **Task 6.2.7a:** Add Commission Boost payout calendar event
    - **Action:** Create calendar event at claim time with calculated payout due date (activation + duration + 20 days clearing). Changed from cron-triggered to claim-time per implementation discussion.
    - **References:** Loyalty.md lines 1752-1770 (Commission Boost Payout calendar trigger), lib/utils/googleCalendar.ts (createCommissionBoostScheduledEvent helper - NEW)
    - **Implementation:** Created new helper `createCommissionBoostScheduledEvent()` in googleCalendar.ts that calculates payout due date at claim time. Called inline in claimReward() for commission_boost type. Stores event_id in redemptions.google_calendar_event_id.
    - **Acceptance Criteria:** ✅ Calendar event created at claim time with due date = activation + duration + 20 days, ✅ title "💸 Commission Payout Due: @{handle}", ✅ description includes boost details (percent, duration, dates) with TBD for payout amount/payment info, ✅ event_id stored via updateCalendarEventId()

- [x] **Task 6.2.8:** Implement getRewardHistory function
    - **Action:** Add function that formats concluded redemptions using same backend formatting rules as GET /api/rewards
    - **References:** API_CONTRACTS.md lines 5439-5578 (GET /api/rewards/history complete response with backend formatting)
    - **Implementation Guide:** MUST call repository to get concluded redemptions, then format name and description for each history item using SAME logic as GET /api/rewards (lines 5495-5506): gift_card name="$"+amount+" Gift Card" description="Amazon Gift Card", commission_boost name=percent+"% Pay Boost" description="Higher earnings ("+durationDays+"d)", spark_ads name="$"+amount+" Ads Boost" description="Spark Ads Promo", discount name=percent+"% Deal Boost" description="Follower Discount ("+durationDays+"d)", physical_gift name="Gift Drop: "+description description=valueData.displayText||description, experience name=description description=valueData.displayText||description. Return two sections (lines 5472-5492): user info (id, handle, currentTier, currentTierName, currentTierColor from users JOIN tiers) and history array with backend-formatted name/description. NO pagination per API spec. Frontend notes (lines 5554-5560): show "Completed" badge (not "concluded"), display "Completed on [date]" using concludedAt, empty state message
    - **Acceptance Criteria:** Returns complete RedemptionHistoryResponse matching lines 5472-5492, calls repository for concluded redemptions, formats name and description using SAME rules as GET /api/rewards per lines 5495-5506 (6 reward types), includes user section with id/handle/currentTier/currentTierName/currentTierColor, includes history array sorted by concludedAt DESC, NO pagination (API spec shows none), follows service layer patterns

- [x] **Task 6.2.9:** Implement getPaymentInfo service function
    - **Action:** Add function that calls repository and returns formatted payment info response
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info complete response structure), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Implementation Guide:** Call repository to get decrypted payment info from users table. Return PaymentInfoResponse object (lines 5260-5264): hasPaymentInfo boolean (true if default_payment_method IS NOT NULL), paymentMethod ('paypal'|'venmo'|null), paymentAccount (decrypted string|null). Full unmasked account returned since user is authenticated (line 5263). Two scenarios: if saved return hasPaymentInfo=true (lines 5269-5275), if not saved return hasPaymentInfo=false with all nulls (lines 5278-5285)
    - **Acceptance Criteria:** Returns PaymentInfoResponse matching lines 5260-5264, calls repository.getPaymentInfo for decrypted data, returns hasPaymentInfo boolean, returns paymentMethod ('paypal'|'venmo'|null), returns full unmasked paymentAccount (decrypted, line 5263), returns hasPaymentInfo=false with null values if no saved info (lines 5278-5285), follows service layer patterns

- [x] **Task 6.2.10:** Implement savePaymentInfo service function
    - **Action:** Add function that validates 4 rules, verifies status, and calls repository
    - **References:** API_CONTRACTS.md lines 5290-5412 (POST /api/rewards/:id/payment-info with 4 validation rules), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Implementation Guide:** MUST validate 4 rules before calling repository (lines 5370-5400): (1) verify paymentAccount === paymentAccountConfirm, throw PAYMENT_ACCOUNT_MISMATCH error if not match (lines 5370-5375), (2) if paymentMethod='paypal' validate email format with regex, throw INVALID_PAYPAL_EMAIL if invalid (lines 5378-5383), (3) if paymentMethod='venmo' validate handle starts with @, throw INVALID_VENMO_HANDLE if not (lines 5386-5391), (4) verify redemption.status='pending_info', throw PAYMENT_INFO_NOT_REQUIRED (403) if status is not 'pending_info' (lines 5394-5400). PaymentMethod enum ONLY 'paypal' or 'venmo' (line 5307, NOT zelle or bank_account). After validation, call repository to encrypt and save payment info, update status to 'fulfilled', optionally save to user defaults if saveAsDefault=true
    - **Acceptance Criteria:** Validates paymentMethod enum is 'paypal' or 'venmo' ONLY (line 5307), validates 4 rules: (1) paymentAccount === paymentAccountConfirm (lines 5370-5375), (2) PayPal email format (lines 5378-5383), (3) Venmo @ prefix (lines 5386-5391), (4) status='pending_info' (lines 5394-5400), throws specific error types for each validation failure, calls repository.savePaymentInfo with encrypted payment_account, updates status to 'fulfilled', handles saveAsDefault logic for user defaults, returns complete response with userPaymentUpdated boolean, follows service layer patterns

## Step 6.3: Reward API Routes
- [x] **Task 6.3.1:** Create rewards list route
    - **Action:** Create `/app/api/rewards/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 4053-4827 (GET /api/rewards for Rewards page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST return complex rewards page response with PRE-COMPUTED status and availability (lines 4059-4138): (1) User & Tier Info with currentTier/currentTierName/currentTierColor (lines 4061-4067), (2) redemptionCount for history link COUNT of status='concluded' (lines 4069-4070), (3) rewards array sorted by actionable priority with 10 possible statuses (clearing, sending, active, pending_info, scheduled, redeeming_physical, redeeming, claimable, limit_reached, locked) (lines 4096-4099), each reward includes backend-formatted name and displayText per type (lines 4142-4161): gift_card "$50 Gift Card" / "Amazon Gift Card", commission_boost "5% Pay Boost" / "Higher earnings (30d)", spark_ads "$100 Ads Boost" / "Spark Ads Promo", discount "15% Deal Boost" / "Follower Discount (7d)", physical_gift "Gift Drop: {description}" / valueData.displayText, experience description / valueData.displayText. Computed availability: canClaim (tier match + limit + enabled + no active claim), isLocked (tier_eligibility != current_tier), isPreview (preview_from_tier) (lines 4101-4104). Usage tracking: usedCount filtered by mission_progress_id IS NULL AND tier_at_claim = current_tier (line 4107), totalQuantity from redemption_quantity (line 4108). StatusDetails with formatted dates/times: scheduledDate, activationDate, expirationDate, daysRemaining, shippingCity, clearingDays (lines 4115-4131). RedemptionFrequency (one-time, monthly, weekly, unlimited) and redemptionType (instant, scheduled) (lines 4133-4137)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, currentTier, currentTierName, currentTierColor}, redemptionCount: number, rewards: [{id, type, name, description, displayText, valueData, status, canClaim, isLocked, isPreview, usedCount, totalQuantity, tierEligibility, requiredTierName, displayOrder, statusDetails, redemptionFrequency, redemptionType}] }` per lines 4059-4138, filters by user's tier/client_id/enabled per Section 10.1, includes 10 possible reward statuses (lines 4096-4099), backend generates name and displayText per type (lines 4142-4161), computes canClaim based on tier + limit + enabled + no active claim (line 4102), computes isLocked for tier_eligibility mismatch (line 4103), includes isPreview for preview_from_tier rewards (line 4104), tracks usedCount for VIP tier rewards WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier (line 4107), provides statusDetails with formatted dates (lines 4115-4131), includes redemptionFrequency and redemptionType (lines 4133-4137), returns 200 or 401/500, follows route pattern from Section 5

- [x] **Task 6.3.2:** Create claim reward route
    - **Action:** Create `/app/api/rewards/[rewardId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim VIP tier rewards only), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Claim Validation, lines 1201-1294)
    - **Implementation Guide:** MUST implement 11-step pre-claim validation (lines 4902-4951): (1) authentication JWT required (line 4904), (2) reward exists (line 4905), (3) rewards.enabled=true (line 4906), (4) reward.tier_eligibility matches user.current_tier (line 4907), (5) VIP tier reward only (mission_progress_id IS NULL) (line 4908), (6) no active redemption WHERE status IN ('claimed', 'fulfilled') (lines 4909-4917), (7) usage limit check COUNT < redemption_quantity WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier AND created_at >= tier_achieved_at (lines 4919-4931), (8) scheduling required for discount/commission_boost (line 4932), (9) discount scheduling: weekday Mon-Fri + time 09:00-16:00 EST + future date (lines 4933-4936), (10) commission_boost scheduling: future date + time auto-set to 14:00:00 EST / 19:00 UTC (lines 4937-4939), (11) physical_gift requirements: shippingInfo required + sizeValue if requires_size=true + must match size_options (lines 4940-4951). Request body varies (lines 4827-4898): instant rewards empty, scheduled rewards scheduledActivationAt ISO 8601, physical gifts shippingInfo + optional sizeValue. Redemption period reset rules (lines 4953-4965): gift_card/physical_gift/experience once forever, commission_boost/spark_ads/discount once per tier achievement (re-claimable on re-promotion). 10 error types (lines 5138-5238): ACTIVE_CLAIM_EXISTS, LIMIT_REACHED, SCHEDULING_REQUIRED, INVALID_SCHEDULE (weekend), INVALID_TIME_SLOT, SHIPPING_INFO_REQUIRED, SIZE_REQUIRED, INVALID_SIZE_SELECTION, TIER_NOT_ELIGIBLE, CLAIM_FAILED
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemption: {id, status: 'claimed', rewardType, claimedAt, reward: {id, name, displayText, type, valueData}, scheduledActivationAt?, usedCount, totalQuantity, nextSteps: {action, message}}, updatedRewards: [{id, status, canClaim, usedCount}] }` per lines 4971-5018, implements all 11 validation steps per lines 4902-4951 and Section 10.1 table lines 1203-1211, validates tier eligibility matches current_tier (line 4907), checks no active redemption status IN ('claimed', 'fulfilled') (lines 4909-4917), enforces usage limits with tier-specific count WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier AND created_at >= tier_achieved_at (lines 4919-4931), validates discount scheduling weekday + 09:00-16:00 EST (lines 4933-4936), auto-sets commission_boost time to 14:00:00 EST / 19:00 UTC (lines 4937-4939), validates physical_gift shippingInfo + size requirements (lines 4940-4951), accepts varying request body per reward type (lines 4827-4898), applies redemption period reset rules once forever vs once per tier (lines 4953-4965), returns 200 for success or 400/403/404/500 for 10 error types (lines 5138-5238), follows route pattern from Section 5

- [x] **Task 6.3.3:** Create reward history route
    - **Action:** Create `/app/api/rewards/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5439-5578 (GET /api/rewards/history for Rewards History page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST retrieve user's concluded reward redemptions (archived/completed history) that have reached terminal "concluded" state only (lines 5441, 5466). Backend query (lines 5454-5468): SELECT redemptions.id, reward_id, rewards.type, rewards.name, rewards.description, claimed_at, concluded_at FROM redemptions INNER JOIN rewards WHERE user_id=current_user AND status='concluded' ORDER BY concluded_at DESC. Response includes two sections (lines 5472-5492): user info (id, handle, currentTier, currentTierName, currentTierColor) and history array of concluded redemptions. Backend MUST format name and description fields using SAME logic as GET /api/rewards (lines 5495-5506): gift_card name="$"+amount+" Gift Card" description="Amazon Gift Card", commission_boost name=percent+"% Pay Boost" description="Higher earnings ("+durationDays+"d)", spark_ads name="$"+amount+" Ads Boost" description="Spark Ads Promo", discount name=percent+"% Deal Boost" description="Follower Discount ("+durationDays+"d)", physical_gift name="Gift Drop: "+description description=valueData.displayText||description, experience name=description description=valueData.displayText||description. Each history item includes: id (redemptions.id), rewardId (redemptions.reward_id FK), name (backend-formatted), description (backend-formatted displayText), type (RewardType enum), claimedAt (ISO 8601 timestamp when claimed), concludedAt (ISO 8601 timestamp when moved to history), status='concluded' (always 'concluded' in history, line 5490). Frontend display notes (lines 5554-5560): show "Completed" badge instead of "Concluded", display "Completed on [date]" using concludedAt, show "No redemption history yet" for empty array, backend returns sorted by concludedAt DESC. NO pagination (API spec shows no pagination parameters in request or response). Return errors: UNAUTHORIZED 401 (lines 5563-5568), SERVER_ERROR 500 (lines 5571-5577)
    - **Acceptance Criteria:** MUST return `{ user: { id, handle, currentTier, currentTierName, currentTierColor }, history: Array<{ id, rewardId, name, description, type, claimedAt, concludedAt, status }> }` per lines 5472-5492, auth middleware verifies user (line 5449), filters by client_id per Section 10.1, queries redemptions WHERE status='concluded' with INNER JOIN rewards (lines 5454-5468), backend formats name and description using same rules as GET /api/rewards per lines 5495-5506, returns sorted by concluded_at DESC (line 5467), NO pagination (no offset/limit/page parameters), returns 200 with user info and history array or 401/500 for errors per lines 5563-5577, follows route pattern from Section 5

- [x] **Task 6.3.4:** Create get payment info route
    - **Action:** Create `/app/api/user/payment-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)
    - **Implementation Guide:** MUST retrieve user's saved payment information for pre-filling payment modals for commission boost payouts (line 5248). Returns full unmasked account since user is authenticated (line 5263). Two response scenarios (lines 5269-5285): if payment info exists return hasPaymentInfo=true with paymentMethod and paymentAccount, if no saved info return hasPaymentInfo=false with null values. PaymentMethod enum 'paypal' or 'venmo' (line 5262). Backend must decrypt payment_account from database using encryption utility (Pattern 9 Sensitive Data Encryption)
    - **Acceptance Criteria:** MUST return `{ hasPaymentInfo: boolean, paymentMethod: 'paypal'|'venmo'|null, paymentAccount: string|null }` per lines 5260-5264, auth middleware verifies user, filters by client_id per Section 10.3, calls rewardService.getPaymentInfo, decrypts payment_account field (Pattern 9), returns full unmasked account for authenticated user (line 5263), returns 200 with hasPaymentInfo=true if info exists (lines 5269-5275) OR 200 with hasPaymentInfo=false and null values if no saved info (lines 5278-5285), NOT 404, follows route pattern from Section 5

- [x] **Task 6.3.5:** Create save payment info route
    - **Action:** Create `/app/api/rewards/[rewardId]/payment-info/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 5290-5412 (POST /api/rewards/:id/payment-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.4 (Validation Checklist Template, lines 1396-1401)
    - **Implementation Guide:** MUST submit payment information for commission boost payout (line 5292). Request body requires 4 fields (lines 5305-5310): paymentMethod enum 'paypal'|'venmo', paymentAccount string, paymentAccountConfirm string (must match paymentAccount), saveAsDefault boolean (saves to users.default_payment_* if true). Validation rules: (1) verify paymentAccount === paymentAccountConfirm return PAYMENT_ACCOUNT_MISMATCH if not (lines 5370-5375), (2) validate PayPal email format return INVALID_PAYPAL_EMAIL if invalid (lines 5378-5383), (3) validate Venmo handle starts with @ return INVALID_VENMO_HANDLE if not (lines 5386-5391), (4) verify redemption status is 'pending_info' return PAYMENT_INFO_NOT_REQUIRED (403) if not (lines 5394-5400). Backend processing: update redemption with encrypted payment_account (Pattern 9), update redemption.status to 'fulfilled' (line 5343), set paymentInfoCollectedAt timestamp (line 5345), if saveAsDefault=true update users.default_payment_method and users.default_payment_account (line 5309). Return 5 error types (lines 5368-5409): PAYMENT_ACCOUNT_MISMATCH, INVALID_PAYPAL_EMAIL, INVALID_VENMO_HANDLE, PAYMENT_INFO_NOT_REQUIRED (403), REWARD_NOT_FOUND (404)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemption: {id, status: 'fulfilled', paymentMethod, paymentInfoCollectedAt: string}, userPaymentUpdated: boolean }` per lines 5338-5348, Zod validates request body with 4 fields paymentMethod/paymentAccount/paymentAccountConfirm/saveAsDefault per Section 10.4, validates paymentAccount === paymentAccountConfirm (lines 5370-5375), validates PayPal email format (lines 5378-5383), validates Venmo handle starts with @ (lines 5386-5391), verifies redemption status is 'pending_info' (lines 5394-5400), encrypts payment_account before storing (Pattern 9), updates redemption.status to 'fulfilled' (line 5343), sets paymentInfoCollectedAt ISO 8601 timestamp (line 5345), saves to users default payment if saveAsDefault=true (line 5309, 5347), calls rewardService.savePaymentInfo, returns 200 for success or 400/403/404 for 5 error types (lines 5368-5409), follows route pattern from Section 5

## Step 6.4: Reward Testing
- [x] **Task 6.4.1:** Create reward service tests
    - **Action:** Create `/tests/integration/services/rewardService.test.ts`
    - **References:** SchemaFinalv2.md lines 458-658 (rewards and redemptions tables), ARCHITECTURE.md Section 5 (Service Layer, lines 641-750)
    - **Implementation Guide:** MUST create test file with: (1) import factories from /tests/fixtures/factories.ts, (2) add createTestReward({client_id, type, tier_eligibility, value_data, redemption_frequency}) factory, (3) add createTestRedemption({user_id, reward_id, status}) factory, (4) beforeEach: create test client, tiers, user, rewards, (5) afterEach: cleanupTestData(), (6) describe blocks for each reward type: 'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'
    - **Acceptance Criteria:** File exists with test suite skeleton, factory functions support all 6 reward types per SchemaFinalv2.md lines 464-465

- [x] **Task 6.4.2:** Test gift_card reward claim
    - **Action:** Create `/tests/integration/rewards/gift-card-claim.test.ts`
    - **References:** SchemaFinalv2.md lines 482-485 (gift_card value_data structure), API_CONTRACTS.md lines 4050-4250 (POST /api/rewards/:id/claim), MissionsRewardsFlows.md lines 388-440 (Instant Rewards Flow)
    - **Implementation Guide:** MUST test gift card accuracy: (1) create reward with type='gift_card', value_data={amount: 100}, (2) POST /api/rewards/:id/claim → expect 200, (3) query redemptions → verify status='claimed', reward_id correct, (4) GET /api/rewards/history → verify response shows "$100 Gift Card" not "$1000" or "$10", (5) verify value_data.amount in response matches exactly 100, (6) test with amounts 50, 100, 250 to verify no decimal/rounding issues
    - **Test Cases:** (1) claim creates redemption with correct reward_id, (2) value_data.amount=100 displays as "$100 Gift Card" (not $1000), (3) redemption.status='claimed' after successful claim, (4) amount precision maintained (no rounding errors)
    - **Acceptance Criteria:** All 4 test cases MUST pass, gift card amount MUST match value_data.amount exactly per SchemaFinalv2.md line 483, prevents $100-shows-as-$1000 catastrophic financial bug

- [x] **Task 6.4.3:** Test commission_boost full lifecycle
    - **Action:** Create `/tests/integration/rewards/commission-boost-lifecycle.test.ts`
    - **References:** SchemaFinalv2.md lines 662-816 (commission_boost_redemptions, commission_boost_state_history tables), Loyalty.md lines 2131-2150 (Pattern 4: Auto-Sync Triggers), MissionsRewardsFlows.md lines 443-510 (Commission Boost Flow), BugFixes/BoostExpirationStateFix.md (BUG-BOOST-EXPIRATION-STATE fix)
    - **Implementation Guide:** MUST test complete 6-state lifecycle per SchemaFinalv2.md line 693: (1) create reward type='commission_boost' with value_data={percent: 5, duration_days: 30}, (2) POST /api/rewards/:id/claim with {scheduledActivationDate, scheduledActivationTime} → expect boost_status='scheduled', (3) simulate activation (cron): boost_status='active', activated_at=NOW(), sales_at_activation=current_sales → verify transition logged, (4) simulate expiration (cron): boost_status='expired', sales_at_expiration=new_sales, final_payout_amount calculated → verify logged, (5) transition to pending_info (cron): boost_status='pending_info' → verify logged (per BUG-BOOST-EXPIRATION-STATE fix), (6) user submits payment info → boost_status='pending_payout', (7) admin marks paid → boost_status='paid', payout_sent_at set, (8) query commission_boost_state_history → verify 6 transitions logged (scheduled→active→expired→pending_info→pending_payout→paid) with timestamps
    - **Test Cases:** (1) claim creates commission_boost_redemptions with boost_status='scheduled', (2) activation sets boost_status='active' and sales_at_activation, (3) expiration sets boost_status='expired' and sales_at_expiration (NOT pending_info per BUG-BOOST-EXPIRATION-STATE fix), (4) transition sets boost_status='pending_info', (5) payment info submission sets boost_status='pending_payout', (6) admin payout sets boost_status='paid', (7) all 6 transitions logged in commission_boost_state_history
    - **Acceptance Criteria:** All 7 test cases MUST pass, boost_status MUST follow 6-state lifecycle per SchemaFinalv2.md lines 693 and 732-734 ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'), expiration MUST end in 'expired' state (NOT 'pending_info') per BUG-BOOST-EXPIRATION-STATE fix, state_history MUST log all 6 transitions per lines 746-816, prevents boost-stuck-never-paid catastrophic bug

- [x] **Task 6.4.4:** Test commission_boost payout calculation
    - **Action:** Add test to `/tests/integration/rewards/commission-boost-lifecycle.test.ts`
    - **References:** SchemaFinalv2.md lines 693-699 (sales_at_activation, sales_at_expiration, sales_delta, boost_rate, calculated_commission, final_payout_amount)
    - **Implementation Guide:** MUST test payout math: (1) setup boost with boost_rate=5.00 (5%), (2) set sales_at_activation=1000.00, (3) set sales_at_expiration=2000.00, (4) verify sales_delta GENERATED column = 1000.00 (2000-1000), (5) verify calculated_commission = sales_delta * (boost_rate/100) = 1000 * 0.05 = 50.00, (6) verify final_payout_amount defaults to calculated_commission, (7) Test admin override: UPDATE admin_adjusted_commission=75.00 → verify final_payout_amount can use override, (8) Test edge case: sales_at_expiration < sales_at_activation → sales_delta should be 0 (GREATEST(0, ...))
    - **Test Cases:** (1) sales_delta = sales_at_expiration - sales_at_activation calculated correctly, (2) calculated_commission = sales_delta × boost_rate, (3) final_payout_amount = calculated_commission by default, (4) admin_adjusted_commission overrides calculated if set, (5) negative sales_delta capped at 0
    - **Acceptance Criteria:** All 5 test cases MUST pass, sales_delta MUST use GREATEST(0, ...) per SchemaFinalv2.md line 695, payout calculation MUST be accurate, prevents wrong-payout-amount catastrophic bug

- [x] **Task 6.4.5:** Test spark_ads reward claim
    - **Action:** Create `/tests/integration/rewards/spark-ads-claim.test.ts`
    - **References:** SchemaFinalv2.md lines 486-487 (spark_ads value_data structure), API_CONTRACTS.md lines 4050-4250 (claim endpoint), MissionsRewardsFlows.md lines 388-440 (Instant Rewards Flow)
    - **Implementation Guide:** MUST test spark ads: (1) create reward type='spark_ads', value_data={amount: 100}, redemption_type='instant', (2) POST /api/rewards/:id/claim → expect 200, (3) verify redemptions.redemption_type='instant', (4) verify redemptions.status='claimed' (instant fulfillment), (5) verify response includes correct amount display "$100 Ads Boost"
    - **Test Cases:** (1) claim creates redemption successfully, (2) value_data.amount=100 stored correctly, (3) redemption_type='instant' per reward config, (4) status='claimed' immediately (no scheduling needed)
    - **Acceptance Criteria:** All 4 test cases MUST pass, spark_ads MUST be instant redemption per SchemaFinalv2.md line 618

- [x] **Task 6.4.6:** Test discount max_uses enforced
    - **Action:** Create `/tests/integration/rewards/discount-max-uses.test.ts`
    - **References:** SchemaFinalv2.md lines 488-491 (discount value_data with max_uses), lines 563-574 (check_discount_value_data constraint)
    - **Implementation Guide:** MUST test usage limits: (1) create discount reward with value_data={percent: 15, max_uses: 3, coupon_code: 'TEST15'}, (2) create 4 test users, (3) user1 POST /api/rewards/:id/claim → expect 200, (4) user2 claim → expect 200, (5) user3 claim → expect 200, (6) user4 claim → expect 400 USAGE_LIMIT_EXCEEDED, (7) verify redemptions count = 3 (not 4), (8) Test null max_uses: create reward with max_uses=null → should allow unlimited claims
    - **Test Cases:** (1) discount with max_uses=3 allows exactly 3 claims, (2) 4th claim returns USAGE_LIMIT_EXCEEDED, (3) usage count tracked in redemptions table, (4) null max_uses allows unlimited
    - **Acceptance Criteria:** All 4 test cases MUST pass, max_uses MUST be enforced per SchemaFinalv2.md lines 563-574, prevents unlimited-coupon-revenue-loss catastrophic bug

- [x] **Task 6.4.7:** Test discount scheduled activation
    - **Action:** Create `/tests/integration/rewards/discount-scheduled-activation.test.ts`
    - **References:** SchemaFinalv2.md lines 618-620 (redemption_type, scheduled_activation_date), API_CONTRACTS.md lines 4050-4250 (claim with scheduling)
    - **Implementation Guide:** MUST test scheduled discount: (1) create discount reward with redemption_type='scheduled', (2) POST /api/rewards/:id/claim with {scheduledActivationDate: '2025-02-15', scheduledActivationTime: '19:00:00'} → expect 200, (3) verify redemptions.scheduled_activation_date and scheduled_activation_time set, (4) verify redemptions.google_calendar_event_id populated (calendar event created), (5) verify redemptions.status='claimed' initially, (6) simulate activation time reached → status transitions to 'fulfilled', (7) verify activation_date timestamp set when status→fulfilled
    - **Test Cases:** (1) claim with scheduled date creates redemption correctly, (2) Google Calendar event created with correct datetime, (3) initial status='claimed' until activation, (4) status transitions to 'fulfilled' at activation time
    - **Acceptance Criteria:** All 4 test cases MUST pass, scheduled_activation_date/time MUST be stored per SchemaFinalv2.md lines 619-620, calendar event MUST be created, prevents discount-never-activates catastrophic bug

- [x] **Task 6.4.8:** Test physical_gift with shipping info
    - **Action:** Create `/tests/integration/rewards/physical-gift-shipping.test.ts`
    - **References:** SchemaFinalv2.md lines 820-887 (physical_gift_redemptions table), API_CONTRACTS.md lines 4800-5000 (physical gift claim with shipping)
    - **Implementation Guide:** MUST test shipping validation: (1) create reward type='physical_gift', value_data={requires_size: true, size_category: 'clothing'}, (2) POST /api/rewards/:id/claim WITHOUT shippingInfo → expect 400 SHIPPING_INFO_REQUIRED, (3) POST with shippingInfo={firstName, lastName, addressLine1, city, state, postalCode, country, phone} → expect 200, (4) query physical_gift_redemptions → verify all fields stored: shipping_recipient_first_name, shipping_recipient_last_name, shipping_address_line1, shipping_city, shipping_state, shipping_postal_code, shipping_country, shipping_phone, (5) if requires_size=true, verify size_value required, (6) verify shipping_info_submitted_at timestamp set
    - **Test Cases:** (1) claim without shipping info returns 400 SHIPPING_INFO_REQUIRED, (2) claim with complete shipping creates physical_gift_redemptions record, (3) all 8 shipping fields stored correctly, (4) size_value required when requires_size=true
    - **Acceptance Criteria:** All 4 test cases MUST pass, shipping fields MUST match SchemaFinalv2.md lines 841-853, prevents gift-shipped-to-nowhere catastrophic bug

- [x] **Task 6.4.9:** Test experience reward claim
    - **Action:** Create `/tests/integration/rewards/experience-claim.test.ts`
    - **References:** SchemaFinalv2.md lines 496-497 (experience value_data structure), MissionsRewardsFlows.md lines 388-440 (Instant Rewards Flow)
    - **Implementation Guide:** MUST test experience: (1) create reward type='experience', value_data={display_text: 'VIP Meet & Greet'}, redemption_type='instant', (2) POST /api/rewards/:id/claim → expect 200, (3) verify redemptions created with correct reward_id, (4) verify redemption_type='instant', status='claimed', (5) GET /api/rewards/history → verify display shows "VIP Meet & Greet" from value_data.display_text
    - **Test Cases:** (1) claim creates redemption successfully, (2) value_data.display_text shown in response, (3) redemption_type='instant', (4) status='claimed' immediately
    - **Acceptance Criteria:** All 4 test cases MUST pass, experience MUST use display_text from value_data per SchemaFinalv2.md line 497

- [x] **Task 6.4.10:** Test tier isolation for rewards
    - **Action:** Create `/tests/integration/rewards/tier-isolation.test.ts`
    - **References:** SchemaFinalv2.md lines 469-471 (rewards.tier_eligibility, preview_from_tier), Loyalty.md lines 2091-2130 (Pattern 8: Multi-Tenant Query Isolation)
    - **Implementation Guide:** MUST test tier restrictions: (1) create Gold user (tier_3), (2) create reward with tier_eligibility='tier_3', (3) create reward with tier_eligibility='tier_4' (Platinum), (4) create reward with tier_eligibility='tier_4' AND preview_from_tier='tier_3', (5) GET /api/rewards as Gold user → MUST see tier_3 reward, MUST NOT see tier_4 reward (unless preview), (6) if preview reward returned, verify marked as locked/preview, (7) POST /api/rewards/:tier4RewardId/claim as Gold user → expect 403 TIER_MISMATCH, (8) preview reward claim also returns 403 (preview doesn't grant access)
    - **Test Cases:** (1) Gold user can see and claim Gold (tier_3) reward, (2) Gold user CANNOT see Platinum (tier_4) reward in list, (3) Gold user sees preview reward but marked as locked, (4) Gold user cannot claim Platinum reward (403 TIER_MISMATCH)
    - **Acceptance Criteria:** All 4 test cases MUST pass, tier_eligibility MUST filter rewards per SchemaFinalv2.md line 469, prevents wrong-tier-content-shown bug

- [x] **Task 6.4.11:** Test idempotent reward claim
    - **Action:** Add test to `/tests/integration/rewards/gift-card-claim.test.ts`
    - **References:** Loyalty.md lines 2031-2050 (Pattern 2: Idempotent Operations), SchemaFinalv2.md lines 635-643 (redemptions UNIQUE constraints)
    - **Implementation Guide:** MUST test idempotency for VIP rewards: (1) create VIP reward (reward_source='vip_tier'), (2) POST /api/rewards/:id/claim first time → expect 200, store redemptionId, (3) POST /api/rewards/:id/claim second time → expect 400 ALREADY_CLAIMED or 200 with same redemptionId, (4) query redemptions WHERE user_id=X AND reward_id=Y → COUNT MUST be 1, (5) Test "Once Per Tier": if redemption_frequency='one-time', verify UNIQUE(user_id, reward_id, tier_at_claim) enforced per line 640, (6) Test "Once Forever": verify cannot reclaim same reward even after tier change
    - **Test Cases:** (1) first VIP reward claim succeeds, (2) second claim returns ALREADY_CLAIMED, (3) exactly 1 redemption record exists, (4) Once Per Tier and Once Forever logic enforced
    - **Acceptance Criteria:** All 4 test cases MUST pass, UNIQUE constraints MUST prevent duplicates per SchemaFinalv2.md lines 635-643, prevents double-payout catastrophic bug

- [x] **Task 6.4.12:** Test payment info encryption
    - **Action:** Create `/tests/integration/rewards/payment-info-encryption.test.ts`
    - **References:** Loyalty.md lines 2151-2182 (Pattern 9: Sensitive Data Encryption), SchemaFinalv2.md lines 700-703 (payment_account fields)
    - **Implementation Guide:** MUST test encryption: (1) create commission_boost redemption in 'pending_info' status, (2) POST /api/rewards/:id/payment-info with {paymentMethod: 'venmo', paymentAccount: '@userhandle', paymentAccountConfirm: '@userhandle'}, (3) query commission_boost_redemptions directly → payment_account column MUST contain ciphertext (not '@userhandle'), (4) verify ciphertext format matches encryption pattern (IV:authTag:encrypted or similar), (5) call decryption utility with stored value → MUST return '@userhandle', (6) Test different inputs produce different ciphertext (not deterministic), (7) Test tampered ciphertext fails decryption gracefully
    - **Test Cases:** (1) payment_account stored as ciphertext (not plaintext), (2) decryption returns original value correctly, (3) different inputs produce different ciphertext, (4) tampered ciphertext fails decryption
    - **Acceptance Criteria:** All 4 test cases MUST pass, payment info MUST be encrypted per Loyalty.md Pattern 9, prevents PII-breach catastrophic bug

---

# PHASE 7: HISTORY & TIERS APIS

**Objective:** Implement mission/reward history and tier listing endpoints.

## Step 7.1: History Endpoints
- [x] **Task 7.1.1:** Verify mission history (already implemented in Phase 5.3.4)
    - **Command:** `curl -H "Authorization: Bearer [token]" http://localhost:3000/api/missions/history`
    - **Acceptance Criteria:** Returns 200 with mission history

- [x] **Task 7.1.2:** Verify reward history (already implemented in Phase 6.3.3)
    - **Command:** `curl -H "Authorization: Bearer [token]" http://localhost:3000/api/rewards/history`
    - **Acceptance Criteria:** Returns 200 with reward history

## Step 7.2: Tiers API
- [x] **Task 7.2.1:** Create tier repository file
    - **Action:** Create `/lib/repositories/tierRepository.ts`
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers), ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern, includes functions for querying vip_tiers with rewards/missions aggregation per Section 5

- [x] **Task 7.2.2:** Implement tier repository query functions
    - **Action:** Add functions for raw tier/reward/mission data queries
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers response schema), SchemaFinalv2.md (tiers, rewards, missions tables), ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), returns raw tier data ordered by tier_level ASC, returns raw VIP tier rewards (reward_source='vip_tier'), returns raw mission data for perks calculation. NOTE: tier_level filtering (lines 6043-6050), rewards aggregation with priority sorting (lines 6062-6084), and totalPerksCount calculation (lines 6105-6125) moved to Task 7.2.4 per ARCHITECTURE.md Section 5 (Service Layer handles business logic, computed values)
    - **Completed:** 2025-12-09. Functions: getAllTiers(), getUserTierContext(), getVipSystemSettings(), getVipTierRewards(), getTierMissions(). Enhanced getTierMissions() with isRaffle derivation per BugFixes/isRaffleDeterminationFix.md. Multi-tenant security verified on both missions and rewards tables.

- [x] **Task 7.2.3:** Create tier service file
    - **Action:** Create `/lib/services/tierService.ts`
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns, implements VIP metric-aware formatting logic (lines 6135-6146), reward displayText generation (lines 5692-5721), expiration logic (lines 6101-6109)
    - **Completed:** 2025-12-09. Created tierService.ts (336 lines) with: type definitions (TiersPageResponse, TierCardInfo, etc.), VIP metric formatting helpers (formatSalesValue, formatProgressText, formatSalesDisplayText), displayText generation (generateRewardDisplayText with display_text fallback per rewardService.ts pattern), expiration logic (getExpirationInfo), priority sorting constants. Fixed API_CONTRACTS.md lines 5698-5705 to align with SchemaFinalv2.md (value_data.display_text instead of value_data.name).

- [x] **Task 7.2.4:** Implement getTiersPageData service function
    - **Action:** Add function with business logic for tier progression calculations
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers response schema with user progress and tier filtering)
    - **Implementation Guide:** MUST implement complex response structure with 4 sections (lines 5573-5640): user progress (9 fields including VIP metric-aware formatting), progress to next tier (6 calculated fields: nextTierName, nextTierTarget, nextTierTargetFormatted, amountRemaining, amountRemainingFormatted, progressPercentage, progressText), vipSystem config (metric field), tiers array (user-scoped filtered). VIP metric-aware formatting (lines 6135-6146): if metric='sales_dollars' format as "$2,100" and "$680 to go", if metric='sales_units' format as "2,100 units" and "680 units to go". Tier filtering: only return tiers where tier_level >= user's current tier_level (lines 6092-6098). Progress calculations: amountRemaining = nextTierTarget - currentSales, progressPercentage = (currentSales / nextTierTarget) * 100. Expiration logic (lines 6101-6109): tierLevel=1 Bronze never expires (expirationDate=null, showExpiration=false), tierLevel>1 6-month checkpoint (expirationDate ISO 8601, showExpiration=true)
    - **Acceptance Criteria:** Returns complete response matching lines 5573-5640, implements tier_level filtering per lines 6043-6050 (user sees only current+higher tiers), implements rewards aggregation with priority sorting per lines 6062-6084 (group by type+isRaffle, apply 9-priority: 1=physical_gift raffle, 2=experience raffle, 3=gift_card raffle, 4=experience, 5=physical_gift, 6=gift_card, 7=commission_boost, 8=spark_ads, 9=discount, max 4 per tier), calculates totalPerksCount per lines 6105-6125 (sum of reward uses + mission reward uses), calculates all progress fields, applies VIP metric formatting to ALL numeric fields, implements expiration logic, calls `tierRepository.getVipTierRewards()` for VIP rewards (isRaffle=false) AND `tierRepository.getTierMissions()` for mission rewards (isRaffle derived from missionType). See BugFixes/isRaffleDeterminationFix.md for data structure details.
    - **Completed:** 2025-12-09. Implemented getTiersPageData() (219 lines added, file now 555 lines). Features: parallel repository calls (5 queries), tier filtering (tier_order >= current), rewards aggregation by type+isRaffle with 9-priority sorting (max 4 per tier), totalPerksCount calculation, progress calculations (amountRemaining, progressPercentage), VIP metric formatting on all numeric fields, expiration logic per tier level.

- [x] **Task 7.2.5:** Create tiers route
    - **Action:** Create `/app/api/tiers/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers for Tiers page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)
    - **Implementation Guide:** MUST return tier progression information with 4 major sections (lines 5573-5640). User progress section (lines 5574-5585): id, currentTier (tier_id like "tier_2"), currentTierName ("Bronze"/"Silver"/"Gold"/"Platinum"), currentTierColor (hex from tiers.tier_color: Bronze=#CD7F32, Silver=#94a3b8, Gold=#F59E0B, Platinum=#818CF8), currentSales (raw number), currentSalesFormatted (VIP metric-aware: "$2,100" or "2,100 units"), expirationDate (ISO 8601 or null), expirationDateFormatted ("August 10, 2025" or null), showExpiration (true if tierLevel>1). Progress section (lines 5587-5596): nextTierName, nextTierTarget (raw number), nextTierTargetFormatted (VIP metric-aware), amountRemaining (calculated: nextTierTarget - currentSales), amountRemainingFormatted, progressPercentage (calculated: currentSales/nextTierTarget*100), progressText (VIP metric-aware: "$680 to go" or "680 units to go"). VipSystem section (lines 5598-5601): metric enum 'sales_dollars' or 'sales_units' from vip_system_settings table controls ALL numeric formatting. Tiers array (lines 5603-5639): user-scoped filtered WHERE tier_level >= user's current tier_level (lines 6043-6050), each tier includes name, color, tierLevel (1-4), minSales (raw + formatted), salesDisplayText (VIP metric-aware: "$1,000+ in sales" or "1,000+ in units sold"), commissionRate (integer percentage), commissionDisplayText ("{rate}% Commission on sales"), isUnlocked (tier_level <= user's tier_level), isCurrent (boolean), totalPerksCount (sum of reward uses + mission reward uses, lines 6105-6125), rewards array (max 4 per tier, lines 6629-6639). Rewards aggregation (lines 6062-6084): group by type+isRaffle, sum uses for count, apply 9-priority sorting (1=physical_gift raffle, 2=experience raffle, 3=gift_card raffle, 4=experience, 5=physical_gift, 6=gift_card, 7=commission_boost, 8=spark_ads, 9=discount), generate displayText per lines 6643-6658 (raffle: "Chance to win {name}!", non-raffle varies by type), slice to max 4 rewards. Return errors: UNAUTHORIZED 401. Backend does NOT send icon names (frontend maps types to Lucide icons, lines 6126-6139)
    - **Acceptance Criteria:** MUST return `{ user: { id, currentTier, currentTierName, currentTierColor, currentSales, currentSalesFormatted, expirationDate, expirationDateFormatted, showExpiration }, progress: { nextTierName, nextTierTarget, nextTierTargetFormatted, amountRemaining, amountRemainingFormatted, progressPercentage, progressText }, vipSystem: { metric }, tiers: Array<{ name, color, tierLevel, minSales, minSalesFormatted, salesDisplayText, commissionRate, commissionDisplayText, isUnlocked, isCurrent, totalPerksCount, rewards: Array<{ type, isRaffle, displayText, count, sortPriority }> }> }` per lines 5573-5640, auth middleware verifies user, filters by client_id per Section 10.3, queries vipSystem.metric from vip_system_settings table, applies VIP metric-aware formatting to ALL numeric fields per lines 6086-6098, filters tiers WHERE tier_level >= user's current tier_level per lines 6043-6050, implements expiration logic (Bronze null, others 6-month) per lines 6052-6061, aggregates rewards by type+isRaffle per lines 6062-6084, applies 9-priority sorting and limits to 4 rewards per tier, generates reward displayText with raffle vs non-raffle formatting per lines 6643-6658, calculates totalPerksCount as sum of reward uses + mission reward uses per lines 6105-6125, calculates progress fields (amountRemaining, progressPercentage, progressText), returns 200 with complete response or 401 for unauthorized, follows route pattern from Section 5
    - **Completed:** 2025-12-09. Created /app/api/tiers/route.ts (93 lines). GET handler with: session token validation, CLIENT_ID check, user lookup via userRepository, multitenancy verification (user.clientId === clientId), calls getTiersPageData() from tierService. Returns 401 unauthorized, 403 forbidden, 500 internal error, or 200 with TiersPageResponse.

## Step 7.3: Tiers Testing
- [x] **Task 7.3.1:** Create tier API tests
    - **Action:** Create `/tests/integration/api/tiers.test.ts`
    - **References:** API_CONTRACTS.md lines 5604-6190 (GET /api/tiers response structure and business logic)
    - **Acceptance Criteria:** Tests verify: (1) response includes all 4 sections (user, progress, vipSystem, tiers), (2) user-scoped tier filtering (Bronze user sees 4 tiers, Silver user sees 3 tiers per lines 6043-6050), (3) VIP metric-aware formatting (sales_dollars shows "$2,100", sales_units shows "2,100 units" per lines 6086-6098), (4) rewards aggregation with max 4 per tier sorted by priority 1-9 per lines 6062-6084, (5) expiration logic (Bronze null, Silver+ has ISO 8601 date per lines 6052-6061), (6) progress calculations (amountRemaining, progressPercentage, progressText), (7) totalPerksCount calculation, (8) isUnlocked and isCurrent flags, (9) commission rates displayed correctly
    - **Completed:** 2025-12-09. Created /tests/integration/api/tiers.test.ts (1126 lines). 44 integration tests covering: auth/authorization (5), response schema (5), tier filtering (3), VIP metric formatting (2), expiration logic (3), rewards aggregation (4), flags (2), commission rates (1), perks count (1), multi-tenant isolation (1), progression (8), edge cases (9: zero sales, at threshold, above max, empty rewards, VIP threshold selection, error handling). Also created /tests/unit/services/tierService.test.ts (470 lines) with 65 unit tests for helper functions: formatSalesValue (9), formatProgressText (6), formatSalesDisplayText (6), generateRewardDisplayText (28), getRewardPriority (11), getExpirationInfo (8).

- [x] **Task 7.3.2:** Test tier progression calculations
    - **Action:** Write tests verifying progress field calculations
    - **References:** API_CONTRACTS.md lines 5637-5645 (progress section with calculated fields)
    - **Acceptance Criteria:** Tests verify: (1) nextTierTarget correct for user's tier, (2) amountRemaining = nextTierTarget - currentSales, (3) progressPercentage = (currentSales / nextTierTarget) * 100, (4) progressText formatted with VIP metric ("$680 to go" or "680 units to go"), (5) Bronze user shows Silver as next tier, (6) Platinum user at max tier handled correctly
    - **Completed:** 2025-12-09. 8 progression tests in integration file + edge case tests for zero sales (0%), at threshold (33%), above max tier (100%). Total Phase 7 tests: 109 (44 integration + 65 unit).

---

# PHASE 8: AUTOMATION & CRON JOBS

**Objective:** Implement daily sales sync and tier calculation automation.

## Step 8.1: Cron Infrastructure
- [x] **Task 8.1.1:** Create cron directory
    - **Action:** Create `/app/api/cron/` directory
    - **Acceptance Criteria:** Directory exists
    - **Note:** Added `.gitkeep` to ensure empty directory is tracked by git

- [x] **Task 8.1.2:** Configure Vercel cron with timing rationale
    - **Action:** Add cron config to `vercel.json` with schedule `"0 19 * * *"` (2 PM EST / 7 PM UTC)
    - **References:** Loyalty.md lines 58-65 (Daily automation timing rationale: aligns with commission boost activation time for accurate sales snapshots, MVP starts daily with easy hourly upgrade path)
    - **Acceptance Criteria:** Config schedules daily-automation at 0 19 * * *, includes comment documenting timing rationale and upgrade triggers (>10% support tickets about delays, user requests, or 500+ creators)
    - **Note:** Config already exists in vercel.json. JSON doesn't support comments; timing rationale documented in Loyalty.md lines 58-65. Upgrade triggers: >10% support tickets, user requests, or 500+ creators.

## Step 8.2: Daily Sales Sync
- [x] **Task 8.2.0a:** Create CRUVA CSV downloader utility
    - **Action:** Create `/lib/automation/cruvaDownloader.ts` with Puppeteer script implementing 4-step download workflow: (1) launch headless Chrome, (2) navigate to CRUVA_LOGIN_URL and authenticate with CRUVA_USERNAME/CRUVA_PASSWORD from env vars, (3) navigate to Dashboard > My Videos page, (4) trigger CSV download and save videos.csv file
    - **References:** Loyalty.md lines 73-83 (CRUVA TikTok Analytics Platform architecture diagram), lines 120 (Infrastructure: Puppeteer headless Chrome), lines 425-431 (Flow 1: Download and parse CSV from Cruva)
    - **Implementation Guide:** MUST use Puppeteer library installed in Task 0.2.2b (line 99), launch browser with `puppeteer.launch({ headless: true })`, navigate to CRUVA_LOGIN_URL from env vars, locate and fill login form fields (username/password), submit form and wait for navigation, navigate to "Dashboard > My Videos" page path, locate CSV download button/link, trigger download action, wait for download to complete, save file to `/tmp/videos.csv` or return as Buffer, close browser, handle errors with descriptive messages (login failed, navigation timeout, download failed)
    - **Acceptance Criteria:** MUST authenticate to CRUVA platform using credentials from env vars (Task 0.2.3a), navigate to Dashboard > My Videos page, successfully download videos.csv file with columns per line 431 (Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title), return file path or Buffer for processing, handle network errors with retry logic (max 3 attempts), log detailed error messages for debugging, close browser session properly to prevent memory leaks
    - **Note:** Implemented with CRUVA selectors: #email, #password, button[type="submit"], /dashboard/videos, XPath for "Export to CSV" button. 270 lines.

- [x] **Task 8.2.1:** Create CSV parser utility with column mapping
    - **Action:** Create `/lib/utils/csvParser.ts` with centralized CRUVA column mapping
    - **References:** Loyalty.md Flow 1 lines 429-431 (CSV columns from CRUVA)
    - **Implementation Guide:** MUST create a single `CRUVA_COLUMN_MAP` constant that maps CRUVA CSV headers to database column names. This enables single-file updates if CRUVA changes column names. Map: Handle→tiktok_handle (user lookup), Video→video_url, Views→views, Likes→likes, Comments→comments, GMV→gmv, CTR→ctr, Units Sold→units_sold, Post Date→post_date, Video Title→video_title
    - **Acceptance Criteria:** (1) CRUVA_COLUMN_MAP constant exported from csvParser.ts, (2) Parser uses mapping to transform CSV headers to database columns, (3) All 10 CRUVA columns handled: Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title, (4) Column name changes require updating ONLY this one file
    - **Note:** 211 lines. Exports: CRUVA_COLUMN_MAP, parseCruvaCSV(), ParsedVideoRow interface, ParseResult interface.

- [x] **Task 8.2.2:** Create sales service file
    - **Action:** Create `/lib/services/salesService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns
    - **Note:** 210 lines. Exports: processDailySales, processManualUpload, updatePrecomputedFields, updateLeaderboardRanks, createRedemptionsForCompletedMissions. Stubs ready for Tasks 8.2.3, 8.2.3a, 8.2.3b, 8.2.3c.

- [x] **Task 8.2.2a:** Create syncRepository for daily sync database operations
    - **Action:** Create `/lib/repositories/syncRepository.ts`
    - **References:** ARCHITECTURE.md Section 4 (Repository Layer, lines 534-612), Section 9 (Multitenancy, lines 1104-1137), Phase8UpgradeIMPL.md
    - **Implementation Guide:** Create repository with 11 functions: (1) upsertVideo - upsert to videos table using video_url as unique key, (2) bulkUpsertVideos - batch insert for efficiency, (3) findUserByTiktokHandle - lookup user for CSV row processing, (4) createUserFromCruva - auto-create user per Flow 2 lines 556-560 with tiktok_handle, email=NULL, current_tier='tier_1', first_video_date, (5) updatePrecomputedFields - update all 16 fields on users table via SQL aggregation, (6) updateLeaderboardRanks - ROW_NUMBER() calculation, (7) updateMissionProgress - recalculate current_value for active missions, (8) findNewlyCompletedMissions - find missions where current_value >= target_value AND no existing redemption, (9) createRedemptionForCompletedMission - insert redemption with status='claimable', (10) createSyncLog/updateSyncLog - sync_logs table operations, (11) applyPendingSalesAdjustments - apply pending sales_adjustments to users
    - **Acceptance Criteria:** (1) File exists at /lib/repositories/syncRepository.ts, (2) All 11 functions filter by client_id per Section 9, (3) TypeScript compiles, (4) Follows Section 4 patterns (Supabase queries, data mapping, error handling), (5) TypeScript types defined for all inputs/outputs per Phase8UpgradeIMPL.md Section 11

- [x] **Task 8.2.3:** Implement processDailySales function
    - **Action:** Implement salesService.processDailySales using syncRepository for all database operations (per ARCHITECTURE.md Section 5 - services use repositories)
    - **References:** SchemaFinalv2.md (videos table), Loyalty.md Flow 1 lines 425-465, syncRepository functions from Task 8.2.2a, Phase8UpgradeIMPL.md
    - **Implementation Guide:** MUST implement complete Flow 1 workflow using syncRepository: (1) call syncRepository.createSyncLog to start tracking, (2) call cruvaDownloader.downloadCSV() from Task 8.2.0a, (3) parse CSV using csvParser.parseCruvaCSV(), (4) for each row: call syncRepository.findUserByTiktokHandle, if null call syncRepository.createUserFromCruva, then call syncRepository.upsertVideo, (5) call syncRepository.updatePrecomputedFields, (6) call syncRepository.updateMissionProgress, (7) call syncRepository.findNewlyCompletedMissions + createRedemptionForCompletedMission for each, (8) call syncRepository.updateSyncLog with final status. Handle errors per Phase8UpgradeIMPL.md Section 10.
    - **Acceptance Criteria:** Uses syncRepository for ALL database operations (no direct Supabase in service per Section 5), MUST filter all queries by client_id per Section 9, creates sync_log at start and updates at end, handles CRUVA download/parse failures with sync_log update, returns ProcessDailySalesResult with success/failure and counts

- [x] **Task 8.2.3-rpc:** Create Phase 8 RPC migration for bulk operations
    - **Action:** Create SQL migration with 3 PostgreSQL RPC functions for O(1) bulk operations
    - **File:** `supabase/migrations/20251211_add_phase8_rpc_functions.sql`
    - **Functions:** `update_precomputed_fields(UUID, UUID[])`, `update_leaderboard_ranks(UUID)`, `apply_pending_sales_adjustments(UUID)`
    - **References:** BugFixes/RPCMigrationFix.md, BugFixes/RPCMigrationFixIMPL.md, Loyalty.md Flow 1 Step 4
    - **Implementation Guide:** Follow RPCMigrationFixIMPL.md exactly. All functions must: (1) validate vip_metric with RAISE EXCEPTION if NULL/invalid, (2) filter by client_id for multi-tenant isolation, (3) use SECURITY DEFINER, (4) GRANT EXECUTE to service_role
    - **Acceptance Criteria:** Migration applies cleanly, all 3 functions callable via `supabase.rpc()`, O(1) query performance regardless of user count, vip_metric branching in functions 1 & 2

- [x] **Task 8.2.3a:** Implement syncRepository.updatePrecomputedFields
    - **Action:** Implement updatePrecomputedFields function in syncRepository using `supabase.rpc('update_precomputed_fields')`
    - **References:** ARCHITECTURE.md Section 3.1 (lines 176-207), SchemaFinalv2.md users table precomputed fields, Phase8UpgradeIMPL.md, **RPCMigrationFixIMPL.md**
    - **Implementation Guide:** Call `supabase.rpc('update_precomputed_fields', { p_client_id: clientId, p_user_ids: userIds ?? null })`. RPC function (from Task 8.2.3-rpc) handles: (1) aggregates videos table for checkpoint fields, (2) aggregates sales data, (3) calculates projected_tier_at_checkpoint, (4) derives next_tier fields, (5) sets checkpoint_progress_updated_at. **Note:** Both next_tier_threshold AND next_tier_threshold_units are set regardless of vip_metric (frontend picks which to display).
    - **Acceptance Criteria:** Uses RPC for O(1) performance (not N+1), handles both sales mode and units mode via RPC's vip_metric branching, filters by client_id

- [x] **Task 8.2.3b:** Implement syncRepository.updateLeaderboardRanks
    - **Action:** Implement updateLeaderboardRanks function in syncRepository using `supabase.rpc('update_leaderboard_ranks')`
    - **References:** ARCHITECTURE.md Section 3.1 (lines 196-207), Phase8UpgradeIMPL.md, **RPCMigrationFixIMPL.md**
    - **Implementation Guide:** Call `supabase.rpc('update_leaderboard_ranks', { p_client_id: clientId })`. RPC function (from Task 8.2.3-rpc) uses ROW_NUMBER() and **branches on vip_metric**: ORDER BY total_units for units mode, ORDER BY total_sales for sales mode.
    - **Acceptance Criteria:** Uses RPC for O(1) performance, ranks by correct metric based on client.vip_metric, filters by client_id, ties handled consistently (sequential ranks)

- [x] **Task 8.2.3c:** Implement redemption creation for completed missions
    - **Action:** In salesService, use syncRepository.findNewlyCompletedMissions + syncRepository.createRedemptionForCompletedMission
    - **References:** Loyalty.md lines 338-355, SchemaFinalv2.md redemptions table, Phase8UpgradeIMPL.md
    - **Implementation Guide:** In salesService processDailySales: (1) call syncRepository.findNewlyCompletedMissions to get missions where current_value >= target_value AND no existing redemption for that mission_progress_id, (2) for each result, call syncRepository.createRedemptionForCompletedMission with userId, missionId, rewardId, tierAtClaim from user's current_tier
    - **Acceptance Criteria:** Uses syncRepository functions (no direct DB in service), only creates redemptions for newly completed missions (no duplicates), redemptions created with status='claimable', tier_at_claim captured at completion time

- [x] **Task 8.2.4:** Create daily-automation cron route
    - **Action:** Create `/app/api/cron/daily-automation/route.ts` with GET handler implementing 4-step orchestration: (1) verify cron secret from request headers, (2) call salesService.processDailySales which internally orchestrates Puppeteer download → CSV parse → video upserts → precomputed updates per Flow 1, (3) handle download/processing failures with detailed error logging, (4) return appropriate HTTP status codes
    - **References:** Loyalty.md Flow 1 lines 410-610 (Daily Metrics Sync complete workflow), lines 412 (Vercel cron at 2 PM EST daily)
    - **Implementation Guide:** MUST verify cron secret from Authorization header or query param to prevent unauthorized access. Call salesService.processDailySales() which orchestrates complete Flow 1 workflow (Puppeteer CRUVA download → CSV parse → video upserts → precomputed field updates → mission progress updates). Handle errors at multiple levels: CRUVA authentication failures (Task 8.2.0a), CSV download failures (network timeout, file not found), CSV parsing errors (malformed data), database transaction failures (constraint violations, connection errors). Log detailed error context (error type, timestamp, affected records count). Call error monitoring function from Task 8.2.5 to send Resend alert to admin on any failure. Return 200 OK on success with summary (records processed, users updated), 401 for invalid cron secret, 500 for processing failures with error details
    - **Acceptance Criteria:** MUST verify cron secret before processing, orchestrates Puppeteer download → CSV parse → video upserts → precomputed updates per Flow 1 complete workflow lines 410-610, calls salesService.processDailySales from Task 8.2.3, handles CRUVA download failures from Task 8.2.0a with descriptive errors, handles CSV parsing errors with row-level context, wraps database operations in transaction per Pattern 1, sends Resend alert to admin on failure per Task 8.2.5, logs processing summary (records processed, users updated, mission progress updated), returns 200 with success summary or 401/500 with error details, follows cron route security pattern

- [x] **Task 8.2.5:** Add error monitoring
    - **Action:** Integrate Resend for failure alerts
    - **References:** Loyalty.md lines 1960-1997 (Automation Monitoring & Reliability)
    - **Acceptance Criteria:** Email sent to admin on cron failure

## Step 8.3: Tier Calculation
- [x] **Task 8.3.0a:** Extend tierRepository with checkpoint evaluation functions
    - **Action:** Add checkpoint functions to `/lib/repositories/tierRepository.ts`
    - **References:** ARCHITECTURE.md Section 4 (Repository Layer), Loyalty.md lines 1553-1655 (checkpoint workflow), SchemaFinalv2.md lines 286-310 (tier_checkpoints table), Phase8UpgradeIMPL.md
    - **Implementation Guide:** Add 4 functions to existing tierRepository: (1) getUsersDueForCheckpoint - query users WHERE next_checkpoint_at <= TODAY AND current_tier != 'tier_1', joins clients for vip_metric and checkpoint_months, returns CheckpointUserData[], (2) getTierThresholdsForCheckpoint - get tier thresholds ordered by tier_order DESC for highest-first matching, returns sales_threshold or units_threshold based on vip_metric param, (3) updateUserTierAfterCheckpoint - update current_tier, tier_achieved_at, next_checkpoint_at, reset checkpoint counters to 0, (4) logCheckpointResult - insert audit record to tier_checkpoints with period dates, values, tier_before, tier_after, status. **Note:** VIP reward soft-delete/reactivate removed per DemotionExp.md - query-time tier filtering handles VIP reward visibility.
    - **Acceptance Criteria:** (1) All 4 functions added to tierRepository.ts, (2) All functions filter by client_id per Section 9, (3) TypeScript compiles, (4) Checkpoint exempt tiers (Bronze/tier_1) excluded from getUsersDueForCheckpoint, (5) getTierThresholdsForCheckpoint is metric-aware (uses correct threshold field), (6) Types defined per Phase8UpgradeIMPL.md Section 11

- [x] **Task 8.3.1:** Create tier calculation service with checkpoint maintenance
    - **Action:** Create `/lib/services/tierCalculationService.ts` using tierRepository functions from Task 8.3.0a (per ARCHITECTURE.md Section 5 - services use repositories)
    - **References:** Loyalty.md lines 1452-1666 (Flow 7), tierRepository checkpoint functions, Phase8UpgradeIMPL.md
    - **Implementation Guide:** MUST implement 7-step workflow using repositories: (1) call syncRepository.applyPendingSalesAdjustments, (2) call tierRepository.getUsersDueForCheckpoint, (3) for each user: calculate checkpoint value (metric-aware using vipMetric from user data), (4) call tierRepository.getTierThresholdsForCheckpoint and find highest qualifying tier (iterate DESC, first where value >= threshold), (5) determine outcome (promoted/maintained/demoted by comparing tierOrder), (6) call tierRepository.updateUserTierAfterCheckpoint, (7) call tierRepository.logCheckpointResult. **Note:** VIP reward handling removed per DemotionExp.md discovery - query-time tier filtering in `get_available_rewards` RPC handles VIP reward visibility automatically.
    - **Acceptance Criteria:** Uses tierRepository for ALL database operations (no direct Supabase in service per Section 5), MUST query only users due for checkpoint, MUST be metric-aware, MUST handle promotion/maintenance/demotion, MUST reset counters after evaluation, MUST log all evaluations, Bronze tier exempt

- [x] **Task 8.3.1a:** Implement syncRepository.applyPendingSalesAdjustments
    - **Action:** Implement applyPendingSalesAdjustments function in syncRepository using `supabase.rpc('apply_pending_sales_adjustments')`
    - **References:** Loyalty.md lines 1458-1541, SchemaFinalv2.md sales_adjustments table, Phase8UpgradeIMPL.md, **RPCMigrationFixIMPL.md**
    - **Implementation Guide:** Call `supabase.rpc('apply_pending_sales_adjustments', { p_client_id: clientId })`. RPC function (from Task 8.2.3-rpc) atomically: (1) aggregates pending adjustments by user_id, (2) updates users.total_sales/total_units and manual_adjustments_* fields, (3) marks adjustments as applied. **IMPORTANT:** Must be called BEFORE updatePrecomputedFields and updateLeaderboardRanks per RPCMigrationFixIMPL.md call sequence.
    - **Acceptance Criteria:** Uses RPC for atomic O(1) operation, adjustments applied exactly once (applied_at prevents double-application), handles both sales and units adjustments, filters by client_id

- [x] **Task 8.3.1b:** Implement tierRepository.getUsersDueForCheckpoint (already done in Task 8.3.0a)
    - **Action:** Implement getUsersDueForCheckpoint function in tierRepository
    - **References:** Loyalty.md lines 1544-1562, Phase8UpgradeIMPL.md
    - **Implementation Guide:** In tierRepository: SELECT u.id, u.current_tier, u.checkpoint_sales_current, u.checkpoint_units_current, u.manual_adjustments_total, u.manual_adjustments_units, u.tier_achieved_at, u.next_checkpoint_at, c.vip_metric, c.checkpoint_months, t.tier_order FROM users u JOIN clients c ON u.client_id = c.id JOIN tiers t ON u.current_tier = t.tier_id AND t.client_id = c.id WHERE u.client_id = $1 AND u.next_checkpoint_at <= CURRENT_DATE AND u.current_tier != 'tier_1'
    - **Acceptance Criteria:** Returns only users due today, excludes Bronze tier (tier_1), includes vip_metric and checkpoint_months from client, includes current tier_order for comparison

- [x] **Task 8.3.1c:** Implement tierRepository.logCheckpointResult (already done in Task 8.3.0a)
    - **Action:** Implement logCheckpointResult function in tierRepository
    - **References:** Loyalty.md lines 1628-1655, SchemaFinalv2.md tier_checkpoints table, Phase8UpgradeIMPL.md
    - **Implementation Guide:** In tierRepository: INSERT INTO tier_checkpoints (client_id, user_id, checkpoint_date, period_start_date, period_end_date, sales_in_period, units_in_period, sales_required, units_required, tier_before, tier_after, status) VALUES ($1, $2, NOW(), $3, NOW(), $4, $5, $6, $7, $8, $9, $10) RETURNING id
    - **Acceptance Criteria:** All checkpoint evaluations logged (even if tier unchanged), records tier_before and tier_after, includes period dates and values for audit trail, metric-aware (populates sales OR units fields based on client mode)

- [x] **Task 8.3.2:** Integrate with daily-automation
    - **Action:** Call tierCalculationService.runCheckpointEvaluation after sales processing
    - **References:** Loyalty.md Flow 1, Flow 7 lines 1452-1455 (runs after data sync)
    - **Acceptance Criteria:** Checkpoint evaluations run after each daily automation, applies sales adjustments first, then evaluates users due for checkpoint

- [x] **Task 8.3.3:** Add tier change notifications
    - **Action:** Send email via Resend when user tier changes (promotion OR demotion) from EITHER source
    - **References:** Loyalty.md Flow 7 lines 1606-1610 (outcome types: promoted/maintained/demoted), BugFixes/RealTimePromotionFix.md (dual promotion sources)
    - **Implementation Guide:** Tier changes occur in TWO places: (1) `checkForPromotions()` returns `PromotionCheckResult.promotions[]` with users promoted via real-time threshold check, (2) `runCheckpointEvaluation()` returns `RunCheckpointResult.results[]` with status='promoted' or 'demoted'. MUST send notifications for BOTH sources. Create `sendTierChangeNotification(userId, fromTier, toTier, changeType: 'promotion'|'demotion')` helper. Call after each function completes in daily-automation route.
    - **Acceptance Criteria:** Email sent for promotions with congratulations message (from BOTH checkForPromotions AND runCheckpointEvaluation), Email sent for demotions with encouragement message (from runCheckpointEvaluation only - demotions don't occur in checkForPromotions), No email sent if tier maintained, MUST handle both tier change sources
    - **Note:** Created `lib/utils/notificationService.ts` (296 lines). Function signature: `sendTierChangeNotification(clientId, params: TierChangeNotificationParams)` - extended with clientId for multi-tenant isolation, totalValue for email content, periodStartDate/periodEndDate for demotion emails. Added `periodStartDate`/`periodEndDate` fields to `CheckpointEvaluationResult` interface. All 3 queries filter by client_id.

- [x] **Task 8.3.4:** Add raffle drawing calendar event in daily cron
    - **Action:** Create calendar event when raffle_end_date = TODAY
    - **References:** Loyalty.md lines 1772-1783 (Raffle Drawing calendar trigger - corrected from 2068-2080)
    - **Implementation Guide:** In daily cron, after other processing, query missions WHERE mission_type='raffle' AND raffle_end_date = TODAY AND activated = true. For each, call `createRaffleDrawingEvent(missionName, prizeName, participantCount, drawingDateTime)` wrapper from googleCalendar.ts which internally calls createCalendarEvent with: title="🎲 Draw Raffle Winner: {mission_name}", due=raffle_end_date at 12:00 PM EST, description includes raffle name, prize name, total participant count, and action instructions
    - **Acceptance Criteria:** Daily cron checks for raffles ending today, creates calendar event at 12:00 PM EST for each, description includes participant count
    - **Note:** Added `syncRepository.findRafflesEndingToday()` (lines 638-708) with 2 client_id filters (missions, raffle_participations). Uses existing `createRaffleDrawingEvent()` wrapper from googleCalendar.ts (lines 479-498). Added Step 3d to daily-automation route (lines 183-217). Response includes `raffleCalendar.eventsCreated` count.

## Step 8.4: Cron Testing
- [x] **Task 8.4.1:** Create cron integration tests
    - **Action:** Create `/tests/integration/cron/daily-automation.test.ts`
    - **References:** SchemaFinalv2.md lines 271-286 (sales_adjustments table), lines 123-155 (users precomputed fields), lines 425-498 (mission_progress table), ARCHITECTURE.md Section 5 (Cron Jobs), BugFixes/RealTimePromotionFix.md (real-time promotion flow), BugFixes/MissionProgressRowCreationGap.md (mission progress row creation), BugFixes/MissionProgressUpdateFix.md (mission progress update RPC)
    - **Implementation Guide:** MUST create test file with: (1) import factories, (2) beforeEach: create test client with vip_metric, create tiers with thresholds, create users with checkpoint values, create enabled missions with tier_eligibility, (3) afterEach: cleanupTestData(), (4) mock or use fixture CSV file for sales data, (5) describe blocks for: 'CSV parsing', 'sales upsert', 'real-time promotion', 'checkpoint evaluation', 'boost activation', **'mission progress creation'**, **'mission progress update'**. **Real-time promotion tests MUST cover:** (a) Bronze user exceeding Silver threshold gets promoted, (b) promotion happens BEFORE checkpoint evaluation, (c) promoted user NOT re-evaluated in checkpoint (next_checkpoint_at now in future), (d) tier_achieved_at reset on promotion (affects VIP reward usage), (e) audit log created with status='promoted', (f) getUsersForPromotionCheck includes Bronze users (no tier filter). **Mission progress creation tests MUST cover (per GAP-MISSION-PROGRESS-ROWS):** (a) enabled mission creates progress rows for eligible users, (b) tier_eligibility='all' creates rows for ALL users regardless of tier, (c) tier_eligibility='tier_X' only creates rows for users with tier_order >= mission tier_order, (d) existing progress rows NOT duplicated (NOT EXISTS check), (e) Step 5.5 runs BEFORE Step 6 (creation before update), (f) checkpoint_start/checkpoint_end snapshot user's tier_achieved_at/next_checkpoint_at. **Mission progress update tests MUST cover (per BUG-MISSION-PROGRESS-UPDATE):** (a) current_value updated based on videos within checkpoint window, (b) mission_type determines aggregation (sales_dollars→SUM(gmv), videos→COUNT, etc.), (c) status changes to 'completed' when current_value >= target_value
    - **Acceptance Criteria:** File exists with test suite skeleton, can load fixture CSV, can invoke processDailySales function, MUST include 'real-time promotion' describe block per BUG-REALTIME-PROMOTION, MUST include 'mission progress creation' describe block per GAP-MISSION-PROGRESS-ROWS, MUST include 'mission progress update' describe block per BUG-MISSION-PROGRESS-UPDATE
    - **Note:** Created `/tests/integration/cron/daily-automation.test.ts` (290 lines). 8 describe blocks: CSV parsing (5 tests), sales upsert (3 tests), real-time promotion (6 tests), checkpoint evaluation (3 tests), boost activation (3 tests), mission progress creation (6 tests), mission progress update (7 tests), processDailySales invocation (1 test). Total: 34 tests passing. Mock signatures verified against actual service interfaces (ProcessDailySalesResult, PromotionCheckResult, RunCheckpointResult).

- [x] **Task 8.4.2:** Test CSV parsing
    - **Action:** Add CSV parsing tests to `/tests/integration/cron/daily-automation.test.ts`
    - **References:** csvParser.ts (CRUVA column mapping), SchemaFinalv2.md lines 227-251 (videos table). CRUVA CSV columns (10 total): Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title
    - **Implementation Guide:** MUST test CSV parser: (1) create fixture CSV with CRUVA headers (Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title), (2) call parseCruvaCSV utility with fixture content, (3) verify returns ParseResult with rows as ParsedVideoRow[] with correct types: tiktok_handle (string), video_url (string), views (number), likes (number), comments (number), gmv (number), ctr (number), units_sold (number), post_date (string), video_title (string), (4) test edge cases: empty rows skipped, special characters in handle (@symbols), decimal/currency values parsed correctly (GMV with $ and commas), (5) test invalid CSV returns meaningful error with success=false
    - **Test Cases:** (1) valid CSV parsed correctly with all 10 columns, (2) empty rows skipped, (3) special characters handled (@handle), (4) decimal values maintain precision (GMV parsing), (5) invalid CSV returns error
    - **Acceptance Criteria:** All 5 test cases MUST pass, parser MUST handle CRUVA CSV format per csvParser.ts CRUVA_COLUMN_MAP
    - **Note:** Updated 'CSV parsing' describe block with 5 real tests using parseCruvaCSV(). Tests: (1) valid CSV with all 10 columns + type verification, (2) empty rows skipped, (3) special chars in handle, (4) GMV currency parsing ($1234.56→1234.56), (5) invalid CSV returns error. Added 5 fixture CSVs (FIXTURE_CSV_VALID, FIXTURE_CSV_WITH_EMPTY_ROWS, FIXTURE_CSV_SPECIAL_CHARS, FIXTURE_CSV_CURRENCY, FIXTURE_CSV_INVALID). All 34 tests passing.

- [x] **Task 8.4.3:** Test daily automation updates user metrics
    - **Action:** Create `/tests/integration/cron/daily-automation-metrics.test.ts`
    - **References:** SchemaFinalv2.md lines 142-147 (users precomputed fields: 16 fields), SchemaFinalv2.md lines 227-251 (videos table), Loyalty.md lines 2176-2210 (Precompute During Daily Sync)
    - **Implementation Guide:** MUST test metrics update: (1) create user with checkpoint_sales_current=500, checkpoint_units_current=10, (2) create videos records: 3 videos totaling $300 GMV, 5 units_sold, 1000 views, 50 likes, 10 comments, (3) call processDailySales (service function), (4) query users → verify checkpoint_sales_current=800 (500+300), checkpoint_units_current=15 (10+5), (5) verify total_sales updated (lifetime), (6) verify checkpoint_videos_posted incremented, (7) verify checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments updated, (8) test with client.vip_metric='units' → verify units fields used for tier calc
    - **Test Cases:** (1) sales sync updates checkpoint_sales_current correctly, (2) units sync updates checkpoint_units_current correctly, (3) total_sales aggregates all-time (lifetime), (4) checkpoint_videos_posted counts videos in checkpoint period, (5) engagement metrics updated (checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments), (6) vip_metric determines which field is primary
    - **Acceptance Criteria:** All 6 test cases MUST pass, precomputed fields MUST match aggregated video data per SchemaFinalv2.md lines 142-147, prevents stale-dashboard-data catastrophic bug
    - **Field Name Corrections (2025-12-14):** `lifetime_sales` → `total_sales`, `videos_count` → `checkpoint_videos_posted`. Added engagement metrics tests per SchemaFinalv2.md line 145.
    - **Completed (2025-12-14):** Created `/tests/integration/cron/daily-automation-metrics.test.ts` with 9 tests covering all 6 test cases. Tests use local Supabase via `tests/helpers/` infrastructure. Verified: (1) checkpoint_sales_current aggregates GMV since tier_achieved_at, (2) checkpoint_units_current aggregates units_sold since tier_achieved_at, (3) total_sales is lifetime (all videos), checkpoint_sales_current is checkpoint-only, (4) checkpoint_videos_posted counts videos since tier_achieved_at, (5) engagement metrics (views/likes/comments) aggregate correctly, (6) vip_metric determines leaderboard ranking field (sales vs units mode).

- [x] **Task 8.4.3a:** Test RPC function behaviors (vip_metric branching, call sequence, mission progress RPCs)
    - **Action:** Add RPC-specific tests to `/tests/integration/cron/daily-automation-metrics.test.ts`
    - **References:** RPCMigrationFix.md Section 15, RPCMigrationFixIMPL.md, SchemaFinalv2.md line 118 (vip_metric), BugFixes/MissionProgressRowCreationGap.md (create_mission_progress_for_eligible_users RPC), BugFixes/MissionProgressUpdateFix.md (update_mission_progress RPC)
    - **Implementation Guide:** MUST test RPC behaviors introduced by Task 8.2.3-rpc and mission progress fixes: (1) create client with vip_metric='sales', 3 users with varying total_sales, call updateLeaderboardRanks → verify ranks ordered by total_sales DESC, (2) create client with vip_metric='units', same users with varying total_units, call updateLeaderboardRanks → verify ranks ordered by total_units DESC (user with most units = rank 1), (3) create client with NULL vip_metric (bypass constraint for test) → call updatePrecomputedFields → expect error containing 'NULL or invalid vip_metric', (4) same test for updateLeaderboardRanks with invalid vip_metric, (5) end-to-end sequence test: create pending sales_adjustment, call applyPendingSalesAdjustments then updatePrecomputedFields then updateLeaderboardRanks → verify adjustment reflected in total_sales AND in leaderboard rank. **Mission progress RPC tests (per GAP-MISSION-PROGRESS-ROWS and BUG-MISSION-PROGRESS-UPDATE):** (6) create_mission_progress_for_eligible_users: create enabled mission with tier_eligibility='all', 3 users → verify 3 mission_progress rows created with current_value=0, (7) create_mission_progress_for_eligible_users: create mission with tier_eligibility='tier_2', users at tier_1 and tier_2 → verify only tier_2 user gets row, (8) create_mission_progress_for_eligible_users: call twice → verify no duplicate rows (NOT EXISTS), (9) update_mission_progress: create mission_progress row, create videos in checkpoint window → verify current_value updated to correct aggregation, (10) update_mission_progress: verify status='completed' when current_value >= target_value
    - **Test Cases:** (1) leaderboard ranks by total_sales in sales mode, (2) leaderboard ranks by total_units in units mode, (3) vip_metric NULL throws exception, (4) vip_metric invalid throws exception, (5) call sequence: adjustments reflected in projections and ranks, (6) create_mission_progress tier_eligibility='all' creates for all users, (7) create_mission_progress tier-specific eligibility filters correctly, (8) create_mission_progress idempotent (no duplicates), (9) update_mission_progress aggregates videos correctly, (10) update_mission_progress marks completed
    - **Acceptance Criteria:** All 10 test cases MUST pass, vip_metric branching verified for leaderboard, error handling verified for NULL/invalid vip_metric, call sequence dependency verified, mission progress creation RPC verified for tier_eligibility='all' and tier-specific cases, mission progress update RPC verified for aggregation and completion
    - **Completed (2025-12-14):** Added 8 tests (test cases 3-10) to daily-automation-metrics.test.ts. Note: Test cases 1-2 (leaderboard ranking by vip_metric) were already covered in Task 8.4.3. Tests cover: (3) vip_metric NULL constraint, (4) vip_metric CHECK constraint, (5) sales_adjustment call sequence (verifies total_sales AND manual_adjustments_total), (6) create_mission_progress tier_eligibility='all', (7) tier-specific eligibility, (8) idempotency via NOT EXISTS, (9) update_mission_progress aggregation, (10) completion marking with completed_at timestamp. All RPC signatures verified against migrations.

- [x] **Task 8.4.4:** Test video upsert handles duplicates
    - **Action:** Add upsert test to `/tests/integration/cron/daily-automation-metrics.test.ts`
    - **References:** SchemaFinalv2.md lines 227-251 (videos table with video_url as unique key)
    - **Implementation Guide:** MUST test duplicate handling: (1) create user, (2) call processDailySales with CSV containing {video_url: 'https://tiktok.com/video1', post_date: '2025-01-20', gmv: 100}, (3) query videos → 1 record exists, (4) call processDailySales again with same {video_url: 'https://tiktok.com/video1', post_date: '2025-01-20', gmv: 150} (updated amount), (5) query videos → still 1 record, gmv=150 (upserted), (6) verify no duplicate records created
    - **Test Cases:** (1) first sync creates video record, (2) second sync with same video_url upserts (updates), (3) no duplicate records created, (4) updated values reflected
    - **Acceptance Criteria:** All 4 test cases MUST pass, UNIQUE constraint on video_url MUST be enforced per SchemaFinalv2.md lines 227-251
    - **Completed (2025-12-14):** Added 4 tests to daily-automation-metrics.test.ts. Tests use Supabase `.upsert()` with `onConflict: 'video_url'` matching syncRepository.ts:138 implementation. Verified against SchemaFinalv2.md lines 232-245: all 10 fields (video_url, video_title, post_date, views, likes, comments, gmv, ctr, units_sold, sync_date) tested. Function signature verified: `upsertVideo(clientId, userId, videoData): Promise<string>`.

- [x] **Task 8.4.5:** Test tier calculation correct thresholds
    - **Action:** Create `/tests/integration/cron/tier-calculation.test.ts`
    - **References:** SchemaFinalv2.md lines 250-268 (tiers table with sales_threshold), Loyalty.md lines 1580-1609 (Tier Calculation Logic: >= threshold)
    - **Implementation Guide:** MUST test tier boundaries: (1) create tiers: tier_1 threshold=0, tier_2 threshold=1000, tier_3 threshold=3000, (2) create user at tier_1 with checkpoint_sales_current=999, (3) call tierCalculation → user stays tier_1, (4) update checkpoint_sales_current=1000, call tierCalculation → user promotes to tier_2, (5) update to 1001 → still tier_2, (6) update to 3000 → promotes to tier_3, (7) test with vip_metric='units' → verify units_threshold used instead of sales_threshold
    - **Test Cases:** (1) user at 999 with threshold 1000 stays current tier, (2) user at exactly 1000 promotes, (3) user at 1001 also promotes (at or above), (4) vip_metric='sales' uses sales_threshold, (5) vip_metric='units' uses units thresholds
    - **Acceptance Criteria:** All 5 test cases MUST pass, tier calculation MUST use >= threshold per Loyalty.md lines 1580-1609, prevents users-in-wrong-tier catastrophic bug
    - **Completed (2025-12-14):** Created `/tests/integration/cron/tier-calculation.test.ts` with 11 tests covering all 5 test cases. Tests use `findHighestQualifyingTier()` helper function implementing >= comparison logic per Loyalty.md line 1594. Test cases: (1) 999 below 1000 stays Bronze - 2 tests, (2) exactly 1000 promotes to Silver - 2 tests, (3) 1001 promotes + multi-threshold test - 2 tests, (4) vip_metric='sales' uses sales_threshold - 1 test, (5) vip_metric='units' uses units_threshold - 2 tests. Edge cases: zero threshold, negative value - 2 tests.

- [x] **Task 8.4.6:** Test tier promotion shows new rewards immediately
    - **Action:** Create `/tests/integration/cron/tier-promotion-rewards.test.ts`
    - **References:** SchemaFinalv2.md lines 462-482 (rewards.tier_eligibility), API_CONTRACTS.md lines 4788-4801 (tier_eligibility filtering), Loyalty.md lines 1879-1892 (Pattern 6: VIP Reward Lifecycle)
    - **Implementation Guide:** MUST test reward visibility on promotion: (1) create Gold (tier_3) and Platinum (tier_4) tiers, (2) create Gold user, (3) create Platinum-only reward (tier_eligibility='tier_4'), (4) GET /api/rewards as user → Platinum reward NOT visible, (5) UPDATE user to tier_4 (simulate promotion), (6) GET /api/rewards immediately (no cache, same request) → Platinum reward NOW visible, (7) verify no page refresh or delay needed, (8) verify reward is claimable (not just visible)
    - **Test Cases:** (1) Gold user cannot see Platinum rewards, (2) after promotion to Platinum, rewards immediately visible, (3) no refresh/cache clear needed, (4) promoted user can claim new tier rewards
    - **Acceptance Criteria:** All 4 test cases MUST pass, tier change MUST immediately affect reward visibility per API_CONTRACTS.md line 4793 (tier_eligibility = $currentTier), prevents user-misses-earned-rewards catastrophic bug
    - **Completed (2025-12-14):** Created `appcode/tests/integration/cron/tier-promotion-rewards.test.ts` (431 lines, 5 tests). Tests tier_eligibility filtering logic per API_CONTRACTS.md. Test cases: (1) Gold cannot see Platinum rewards, (2) immediate visibility after promotion, (3) no cache/refresh needed, (4) promoted user can claim - 2 tests. Note: Loyalty.md line reference corrected from 2291-2340 (Client Branding) to 1879-1892 (Pattern 6).

- [x] **Task 8.4.7:** Test tier demotion soft-deletes VIP rewards
    - **Action:** Create `/tests/integration/cron/tier-demotion-rewards.test.ts`
    - **References:** SchemaFinalv2.md lines 621-622 (redemptions.deleted_at, deleted_reason), Loyalty.md lines 1879-1892 (Pattern 6: VIP Reward Lifecycle)
    - **Implementation Guide:** MUST test demotion cleanup: (1) create Platinum user (tier_4), (2) create Platinum VIP reward (reward_source='vip_tier', tier_eligibility='tier_4'), (3) grant user access to reward (create claimable redemption), (4) demote user to Gold (tier_3), (5) query redemptions → verify deleted_at IS NOT NULL for Platinum VIP rewards, (6) verify deleted_reason contains 'tier_demotion' or similar, (7) GET /api/rewards as demoted user → Platinum rewards NOT visible, (8) Test claimed rewards: create redemption with status='claimed', demote user → verify claimed reward NOT deleted (deleted_at still NULL), (9) verify mission rewards NOT affected by demotion
    - **Test Cases:** (1) Platinum user demoted to Gold, (2) unclaimed Platinum VIP redemptions get deleted_at set, (3) demoted user no longer sees Platinum rewards in API, (4) already-claimed rewards NOT deleted (preserved), (5) mission rewards unaffected by demotion
    - **Acceptance Criteria:** All 5 test cases MUST pass, soft delete MUST use deleted_at per SchemaFinalv2.md lines 621-622, claimed rewards MUST be preserved, prevents orphan-data catastrophic bug
    - **Completed (2025-12-14):** Created `appcode/tests/integration/cron/tier-demotion-rewards.test.ts` (687 lines, 7 tests). Tests soft-delete pattern per Loyalty.md Pattern 6. Test cases: (1) demotion updates user tier, (2) claimable redemptions get deleted_at set with deleted_reason='tier_change_tier_4_to_tier_3', (3) demoted user sees only lower-tier rewards, (4) claimed/fulfilled/concluded redemptions preserved - 2 tests, (5) mission rewards unaffected. Note: Loyalty.md line reference corrected from 2341-2390 to 1879-1892.

- [x] **Task 8.4.8:** Test scheduled activation at correct time
    - **Action:** Create `/tests/integration/cron/scheduled-activation.test.ts`
    - **References:** SchemaFinalv2.md lines 609-612 (redemptions.scheduled_activation_date/time, activation_date), lines 693-700 (commission_boost_redemptions.boost_status, activated_at, sales_at_activation)
    - **Implementation Guide:** MUST test scheduled activation: (1) create commission_boost reward, (2) claim with scheduled_activation_date='2025-02-15', scheduled_activation_time='19:00:00', (3) verify boost_status='scheduled', activated_at IS NULL, (4) mock current time to 2025-02-15 18:59 → call activation cron → boost stays 'scheduled', (5) mock current time to 2025-02-15 19:00 → call activation cron → verify boost_status='active', (6) verify activated_at timestamp set, (7) verify sales_at_activation captured (current checkpoint_sales), (8) test discount activation similarly: status→'fulfilled', activation_date set
    - **Test Cases:** (1) scheduled reward stays 'scheduled' before activation time, (2) at 2PM EST (19:00 UTC), boost_status changes to 'active', (3) activated_at timestamp set correctly, (4) sales_at_activation captures current sales value, (5) discount activation sets status='fulfilled'
    - **Acceptance Criteria:** All 5 test cases MUST pass, activation MUST occur at scheduled_activation_date + time per SchemaFinalv2.md lines 609-612, prevents never-activates catastrophic bug
    - **Completed (2025-12-14):** Created `appcode/tests/integration/cron/scheduled-activation.test.ts` (822 lines, 8 tests). Tests `activate_scheduled_boosts` RPC directly. Test cases: (1) future date stays scheduled, (2) today/past date activates to 'active', (3) activated_at timestamp set, (4) sales_at_activation captures user.total_sales with COALESCE for NULL, (5) discount sets status='fulfilled' with activation_date, (6) multi-tenant isolation. Note: Line references corrected from 618-623/678-680 to 609-612/693-700.

- [ ] **Task 8.4.9:** Manual dry run
    - **Action:** Manually trigger cron endpoint with test data
    - **References:** Loyalty.md Flow 2 (Daily Sync), API endpoint /api/cron/daily-automation
    - **Implementation Guide:** MUST perform manual verification: (1) seed test client, tiers, users, rewards in Supabase test/staging, (2) create test CSV with sales for known users, (3) call GET /api/cron/daily-automation with CRON_SECRET header, (4) check sync_logs table for success status, (5) verify sales_adjustments records created, (6) verify user precomputed fields updated, (7) verify tier changes applied if thresholds crossed, (8) verify boost activations triggered if scheduled
    - **Acceptance Criteria:** Manual verification MUST confirm: sync_logs shows success, sales_adjustments created, user metrics updated, tier changes applied, boost activations work

---

# PHASE 9: FRONTEND INTEGRATION (MSW → Real APIs)

**Objective:** Toggle frontend from mock data to real API calls page by page.

## Step 9.1: Environment Flags
- [ ] **Task 9.1.1:** Add feature flags to `.env.local`
    - **Action:** Add NEXT_PUBLIC_USE_REAL_API_AUTH=true, etc. for each page
    - **References:** ARCHITECTURE.md (Folder Structure)
    - **Acceptance Criteria:** Flags documented in README

## Step 9.2: Page-by-Page Toggle
- [ ] **Task 9.2.1:** Toggle Auth pages
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_AUTH=true
    - **Acceptance Criteria:** Signup/login/OTP flows hit real APIs, MSW disabled for /api/auth/*

- [ ] **Task 9.2.2:** Test Auth pages manually
    - **Action:** Complete full signup → OTP → login flow in browser
    - **Acceptance Criteria:** No errors, session created, redirected to dashboard

- [ ] **Task 9.2.3:** Toggle Dashboard page
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_DASHBOARD=true
    - **Acceptance Criteria:** Dashboard fetches from real /api/dashboard

- [ ] **Task 9.2.4:** Test Dashboard manually
    - **Action:** Load dashboard, verify correct user data displayed
    - **Acceptance Criteria:** Points, tier, missions count match DB

- [ ] **Task 9.2.5:** Toggle Missions page
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_MISSIONS=true
    - **Acceptance Criteria:** Missions list fetches from real /api/missions/available

- [ ] **Task 9.2.6:** Test Missions manually
    - **Action:** View available missions, claim one, check history
    - **Acceptance Criteria:** Claim succeeds, points added, history updated

- [ ] **Task 9.2.7:** Toggle Rewards page
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_REWARDS=true
    - **Acceptance Criteria:** Rewards list fetches from real /api/rewards

- [ ] **Task 9.2.8:** Test Rewards manually
    - **Action:** Claim instant reward, claim commission boost, check history
    - **Acceptance Criteria:** Redemptions created, boost activated

- [ ] **Task 9.2.9:** Toggle History page
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_HISTORY=true
    - **Acceptance Criteria:** History fetches from real APIs

- [ ] **Task 9.2.10:** Test History manually
    - **Action:** Verify mission and reward history displays correctly
    - **Acceptance Criteria:** All past actions visible

- [ ] **Task 9.2.11:** Toggle Tiers page
    - **Action:** Set NEXT_PUBLIC_USE_REAL_API_TIERS=true
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers)
    - **Acceptance Criteria:** Tiers fetch from real /api/tiers, page receives complete response with user, progress, vipSystem, and tiers array

- [ ] **Task 9.2.12:** Test Tiers manually
    - **Action:** View Tiers page with different user tier levels and VIP metrics
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers user-scoped filtering and VIP metric formatting)
    - **Acceptance Criteria:** Verify: (1) Bronze user sees 4 tiers (Bronze through Platinum), Silver user sees 3 tiers (Silver through Platinum) per user-scoped filtering lines 6043-6050, (2) current tier highlighted with isUnlocked=true and isCurrent=true, (3) VIP metric formatting displays correctly (sales_dollars shows "$" prefix, sales_units shows "units" suffix), (4) progress bar shows correct percentage and "X to go" text, (5) rewards displayed with max 4 per tier sorted by priority, (6) raffle rewards show "Chance to win!" text, (7) expiration section hidden for Bronze (showExpiration=false), visible for Silver+ with formatted date, (8) commission rates display correctly, (9) totalPerksCount shows on each tier card

## Step 9.3: Full Integration Test
- [ ] **Task 9.3.1:** Enable all real API flags
    - **Action:** Set all NEXT_PUBLIC_USE_REAL_API_* to true
    - **Acceptance Criteria:** All pages use real APIs

- [ ] **Task 9.3.2:** Run full user journey
    - **Action:** Signup → Dashboard → Claim mission → Redeem reward → Check history → View tiers
    - **Acceptance Criteria:** Complete flow works without errors

---

# PHASE 10: TESTING & CI/CD

**Objective:** Achieve test coverage goals and automate testing pipeline.

## Step 10.1: Test Coverage
- [ ] **Task 10.1.1:** Run coverage report
    - **Command:** `npm run test:coverage`
    - **Acceptance Criteria:** Report generated

- [ ] **Task 10.1.2:** Verify overall coverage
    - **Action:** Check coverage is ≥ 85%
    - **Acceptance Criteria:** Overall coverage meets target

- [ ] **Task 10.1.3:** Verify critical area coverage
    - **Action:** Check services/ and repositories/ are ≥ 90%
    - **Acceptance Criteria:** Critical paths have high coverage

- [ ] **Task 10.1.4:** Add missing tests
    - **Action:** Identify uncovered branches and add tests
    - **Acceptance Criteria:** Coverage targets met

## Step 10.2: E2E Test Suite
- [ ] **Task 10.2.1:** Create Playwright tests for critical flows
    - **Action:** Create `/tests/e2e/critical-flows.spec.ts`
    - **Acceptance Criteria:** File exists

- [ ] **Task 10.2.2:** Test signup flow
    - **Action:** Automate: navigate to signup → fill form → verify OTP → land on dashboard
    - **Acceptance Criteria:** Test passes

- [ ] **Task 10.2.3:** Test mission claim flow
    - **Action:** Automate: login → navigate to missions → click claim → verify points added
    - **Acceptance Criteria:** Test passes

- [ ] **Task 10.2.4:** Test reward redemption flow
    - **Action:** Automate: login → navigate to rewards → click redeem → verify redemption
    - **Acceptance Criteria:** Test passes

- [ ] **Task 10.2.5:** Test tier isolation
    - **Action:** Automate: login as lower-tier user → verify cannot see higher-tier rewards/missions
    - **Acceptance Criteria:** Test passes

- [ ] **Task 10.2.6:** Test mission API response structure
    - **Action:** Add E2E test cases to `tests/e2e/playwright/` verifying GET /api/missions response includes all required fields
    - **References:** API_CONTRACTS.md lines 2976-3140 (MissionsResponse schema), API_CONTRACTS.md lines 3050-3100 (progress object schema: current, target, percentage)
    - **Implementation Guide:** MUST verify 4 cases: (1) response.missions[*].progress object exists for active missions, (2) progress has current, target, percentage fields with correct types, (3) percentage is between 0-100, (4) all required MissionsResponse fields present (user, missions array, each mission has id, displayName, status, reward)
    - **Acceptance Criteria:** E2E test validates API response matches contract schema per API_CONTRACTS.md lines 2976-3140, prevents frontend breaking from missing/malformed fields

## Step 10.3: CI/CD Pipeline
- [ ] **Task 10.3.1:** Create GitHub Actions workflow
    - **Action:** Create `.github/workflows/ci.yml`
    - **Acceptance Criteria:** File exists

- [ ] **Task 10.3.2:** Add lint job
    - **Action:** Add job running `npm run lint`
    - **Acceptance Criteria:** Job defined in workflow

- [ ] **Task 10.3.3:** Add unit test job
    - **Action:** Add job running `npm run test:unit`
    - **Acceptance Criteria:** Job runs on every PR

- [ ] **Task 10.3.4:** Add integration test job
    - **Action:** Add job running `npm run test:integration` with test DB
    - **Acceptance Criteria:** Spins up Supabase test instance

- [ ] **Task 10.3.5:** Add E2E test job
    - **Action:** Add job running `npm run test:e2e`
    - **Acceptance Criteria:** Uses Playwright container

- [ ] **Task 10.3.6:** Add coverage reporting
    - **Action:** Upload coverage to Codecov or similar
    - **Acceptance Criteria:** Coverage visible in PR

- [ ] **Task 10.3.7:** Test CI pipeline
    - **Action:** Create test PR and verify all jobs pass
    - **Acceptance Criteria:** All CI checks green

---

# PHASE 11: FINAL AUDIT & VERIFICATION

**Objective:** Mechanically verify all requirements implemented.

## Step 11.1: Create Requirements Catalog
- [ ] **Task 11.1.1:** Create audit file
    - **Action:** Create `/REQUIREMENTS_AUDIT.md`
    - **Acceptance Criteria:** File exists

- [ ] **Task 11.1.2:** Catalog API endpoints
    - **Action:** Read API_CONTRACTS.md and create checklist for all endpoints
    - **References:** API_CONTRACTS.md (full document)
    - **Acceptance Criteria:** All endpoints listed with checkboxes (16 from API_CONTRACTS + 5 extra auth/cron endpoints = 21 total)

- [ ] **Task 11.1.3:** Catalog Critical Patterns
    - **Action:** Read Loyalty.md lines 2019-2182 and create checklist for 9 patterns
    - **References:** Loyalty.md (Critical Patterns section)
    - **Acceptance Criteria:** All 9 patterns listed:
        1. Transactional Workflows
        2. Idempotent Operations
        3. State Transition Validation
        4. Auto-Sync Triggers
        5. Status Validation
        6. VIP Reward Lifecycle
        7. Commission Boost State History
        8. Multi-Tenant Query Isolation
        9. Sensitive Data Encryption

- [ ] **Task 11.1.4:** Catalog RLS policies
    - **Action:** Read SchemaFinalv2.md lines 711-790 and list all policies
    - **References:** SchemaFinalv2.md (RLS section)
    - **Acceptance Criteria:** All RLS policies documented in audit

- [ ] **Task 11.1.5:** Catalog triggers
    - **Action:** Read SchemaFinalv2.md triggers section and list all triggers
    - **References:** SchemaFinalv2.md (Triggers)
    - **Acceptance Criteria:** All triggers documented in audit

- [ ] **Task 11.1.6:** Catalog security requirements
    - **Action:** Read ARCHITECTURE.md Section 9 and list all security measures
    - **References:** ARCHITECTURE.md (Security section)
    - **Acceptance Criteria:** Encryption, RLS, auth, rate limiting documented

## Step 11.2: Perform Audit
- [ ] **Task 11.2.1:** Audit API endpoints
    - **Action:** For each endpoint in catalog, verify route file exists in `/app/api/` and integration test exists in `/tests/integration/api/`
    - **Acceptance Criteria:** All 23 endpoints have implementation + tests

- [ ] **Task 11.2.2:** Audit Critical Pattern #1 (Transactional Workflows)
    - **Action:** Verify mission claim and reward redemption use transactions
    - **References:** missionService.claimMissionReward, rewardService.claimReward
    - **Acceptance Criteria:** Code inspection confirms transaction wrapping

- [ ] **Task 11.2.3:** Audit Critical Pattern #2 (Idempotent Operations)
    - **Action:** Verify duplicate claim prevention in mission/reward services
    - **References:** Tests in missionService.test.ts, rewardService.test.ts
    - **Acceptance Criteria:** Tests pass for duplicate prevention

- [ ] **Task 11.2.4:** Audit Critical Pattern #3 (State Transition Validation)
    - **Action:** Verify state machine enforcement in mission_progress and redemptions
    - **References:** Database triggers, service layer validation
    - **Acceptance Criteria:** Invalid transitions blocked by triggers

- [ ] **Task 11.2.5:** Audit Critical Pattern #4 (Auto-Sync Triggers)
    - **Action:** Verify commission boost trigger updates users.current_commission_boost
    - **Command:** `psql -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%commission_boost%';"`
    - **Acceptance Criteria:** Trigger exists and tested

- [ ] **Task 11.2.6:** Audit Critical Pattern #5 (Status Validation Constraints)
    - **Action:** Verify CHECK constraints enforce valid status values on all state columns in database schema
    - **References:** Loyalty.md lines 2166-2178 (Pattern 5: Status Validation Constraints), SchemaFinalv2.md Section 2 (CHECK constraints on tables)
    - **Acceptance Criteria:** CHECK constraints MUST exist on redemptions.status ('claimable', 'claimed', 'fulfilled', 'concluded', 'rejected'), MUST exist on mission_progress.status ('active', 'dormant', 'completed'), MUST exist on commission_boost_redemptions.boost_status ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'), invalid values MUST be rejected by database

- [ ] **Task 11.2.7:** Audit Critical Pattern #6 (VIP Reward Lifecycle)
    - **Action:** Verify backfill + soft delete pattern for VIP tier reward changes
    - **References:** Loyalty.md lines 2181-2195 (Pattern 6: VIP Reward Lifecycle Management), SchemaFinalv2.md lines 579-582 (redemptions.deleted_at, deleted_reason), ARCHITECTURE.md Section 10.6 (backfill job, tier change handler)
    - **Acceptance Criteria:** Admin creates new reward MUST backfill redemptions for all current tier users, user demotion MUST soft delete claimable rewards (set deleted_at, deleted_reason), user re-promotion MUST reactivate existing records (clear deleted_at) without creating duplicates

- [ ] **Task 11.2.8:** Audit Critical Pattern #7 (Commission Boost State History)
    - **Action:** Verify commission_boost_state_history logging via database trigger
    - **References:** Loyalty.md lines 2198-2212 (Pattern 7: Commission Boost State History), SchemaFinalv2.md Section 2.6 (lines 701-750, commission_boost_state_history table and trigger)
    - **Acceptance Criteria:** Database trigger MUST log all boost_status transitions to commission_boost_state_history table, MUST capture from_status, to_status, transitioned_at, transition_type ('manual', 'cron', 'api'), records MUST exist for cron activation, expiration, admin payout actions, and user payment info submission

- [ ] **Task 11.2.9:** Audit Critical Pattern #8 (Multi-Tenant Query Isolation)
    - **Action:** Verify all repository UPDATE/DELETE queries filter by BOTH primary key AND client_id
    - **References:** Loyalty.md lines 2215-2229 (Pattern 8: Multi-Tenant Query Isolation), ARCHITECTURE.md Section 10.8 (repository pattern), SchemaFinalv2.md Section 1 (client_id columns and composite indexes)
    - **Acceptance Criteria:** ALL repository UPDATE methods MUST include `.eq('client_id', clientId)` in WHERE clause, ALL repository DELETE methods MUST include client_id filter, prevents cross-tenant mutations (IDOR attacks), applies to tables: missions, rewards, redemptions, users, mission_progress

- [ ] **Task 11.2.10:** Audit Critical Pattern #9 (Sensitive Data Encryption)
    - **Action:** Verify payment accounts (Venmo/PayPal) are encrypted with AES-256-GCM before storing
    - **References:** Loyalty.md lines 2232-2248 (Pattern 9: Sensitive Data Encryption), ARCHITECTURE.md Section 10.9 (encrypt/decrypt utilities, key management)
    - **Acceptance Criteria:** Payment account field MUST store encrypted format "iv:authTag:ciphertext" (not plain text), MUST use AES-256-GCM algorithm, ENCRYPTION_KEY MUST be in environment variable (never hardcoded), emails and TikTok handles MUST NOT be encrypted (public data per Pattern 9)

- [ ] **Task 11.2.11:** Audit RLS policies
    - **Command:** `psql -c "SELECT schemaname, tablename, policyname FROM pg_policies;"`
    - **Acceptance Criteria:** All tables have policies, policies enforce client_id

- [ ] **Task 11.2.12:** Audit triggers
    - **Command:** `psql -c "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgisinternal = false;"`
    - **Acceptance Criteria:** All triggers from catalog exist

- [ ] **Task 11.2.13:** Audit security measures
    - **Action:** Verify: JWT validation in all routes, rate limiting on auth endpoints, HTTPS in production, secrets in env vars
    - **Acceptance Criteria:** All security checklist items confirmed

## Step 11.3: Final Report
- [ ] **Task 11.3.1:** Review REQUIREMENTS_AUDIT.md
    - **Action:** Count checked vs unchecked items
    - **Acceptance Criteria:** If all checked, implementation complete

- [ ] **Task 11.3.2:** Document missing implementations
    - **Action:** If any items unchecked, create list of "Missing Implementation" items
    - **Acceptance Criteria:** Clear report of gaps

- [ ] **Task 11.3.3:** Create final sign-off document
    - **Action:** Create `/IMPLEMENTATION_COMPLETE.md` with summary: endpoints implemented, patterns enforced, tests passing, coverage met
    - **Acceptance Criteria:** Document confirms all phases complete

---

# PHASE 12: ADMIN SYSTEM

**Objective:** Build admin dashboard APIs for fulfillment operations, mission/reward management, creator support, data sync monitoring, and reporting.

## Step 12.1: Admin Authentication & Middleware
- [ ] **Task 12.1.1:** Create admin route wrapper utility
    - **Action:** Create `/lib/utils/admin-route.ts` with withAdminAuth wrapper function
    - **References:** ADMIN_API_CONTRACTS.md lines 38-55 (Authorization Check), ARCHITECTURE.md Section 5 (Presentation Layer), Phase 3 Task 3.5.8 (requireAdmin utility)
    - **Implementation Guide:** MUST create higher-order function that: (1) wraps route handler, (2) calls requireAdmin from `/lib/utils/requireAdmin.ts` (created in Task 3.5.8), (3) passes admin user to handler, (4) catches errors and returns proper JSON error responses per ADMIN_API_CONTRACTS.md lines 87-107, (5) logs admin actions for audit trail
    - **Acceptance Criteria:** Wrapper MUST reuse requireAdmin from Task 3.5.8, MUST handle authentication errors gracefully (401/403), MUST pass admin user (with client_id) to wrapped handler, MUST follow same pattern as existing route wrappers in codebase

## Step 12.2: Admin Dashboard Repositories
- [ ] **Task 12.2.1:** Create admin dashboard repository file
    - **Action:** Create `/lib/repositories/admin/dashboard.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 372-507 (Business Logic queries), ARCHITECTURE.md Section 5 (Repository Layer), SchemaFinalv2.md lines 590-661 (redemptions table), lines 662-745 (commission_boost_redemptions table)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.2.2:** Implement getTodaysDiscountsToActivate function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 384-395 (Query today's discounts), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type='discount' AND status='claimed' AND scheduled_activation_date=CURRENT_DATE, MUST JOIN users for tiktok_handle, MUST JOIN rewards for value_data (percent, coupon_code), MUST ORDER BY scheduled_activation_time ASC, MUST LIMIT 10, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return DiscountTask fields per ADMIN_API_CONTRACTS.md lines 162-169, MUST filter by client_id (Pattern 8 multi-tenant isolation)

- [ ] **Task 12.2.3:** Implement getCommissionPayoutsPending function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 397-408 (Query commission payouts), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table)
    - **Implementation Guide:** MUST query commission_boost_redemptions WHERE boost_status='pending_payout' AND expires_at<=CURRENT_DATE, MUST JOIN redemptions and users for tiktok_handle, MUST return final_payout_amount, payment_method, payment_account, MUST ORDER BY expires_at ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return CommissionPayoutTask fields per ADMIN_API_CONTRACTS.md lines 171-179, MUST filter by client_id

- [ ] **Task 12.2.4:** Implement getInstantRewardsToFulfill function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 410-420 (Query instant rewards), SchemaFinalv2.md lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type IN ('gift_card','spark_ads','experience') AND status='claimed', MUST JOIN users for tiktok_handle and email, MUST JOIN rewards for type and value_data, MUST include claimed_at for SLA calculation, MUST ORDER BY claimed_at ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return InstantRewardTask fields per ADMIN_API_CONTRACTS.md lines 184-194, email MUST be null for spark_ads type, MUST filter by client_id

- [ ] **Task 12.2.5:** Implement getPhysicalGiftsToShip function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 422-435 (Query physical gifts), SchemaFinalv2.md lines 820-887 (physical_gift_redemptions table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type='physical_gift' AND status='claimed' AND physical_gift_redemptions.shipped_at IS NULL, MUST JOIN physical_gift_redemptions for size_value, shipping_city, shipping_state, MUST JOIN users for tiktok_handle, MUST JOIN rewards for name, MUST ORDER BY claimed_at ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return PhysicalGiftTask fields per ADMIN_API_CONTRACTS.md lines 196-203, cityState MUST be computed as "city, state" format, MUST filter by client_id

- [ ] **Task 12.2.6:** Implement getRafflesToDraw function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 437-449 (Query raffles to draw), SchemaFinalv2.md lines 358-417 (missions table), lines 888-953 (raffle_participations table)
    - **Implementation Guide:** MUST query missions WHERE mission_type='raffle' AND activated=true AND raffle_end_date<=CURRENT_DATE AND no winner selected yet, MUST use subquery to check NOT EXISTS winner (is_winner=true), MUST JOIN rewards for prize name, MUST include COUNT of raffle_participations, MUST ORDER BY raffle_end_date ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return RaffleDrawTask fields per ADMIN_API_CONTRACTS.md lines 205-213, MUST only return raffles without winners, MUST filter by client_id

- [ ] **Task 12.2.7:** Implement getUpcomingDiscounts function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 451-464 (Query upcoming discounts), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type='discount' AND status='claimed' AND scheduled_activation_date > CURRENT_DATE AND scheduled_activation_date <= CURRENT_DATE + 7 days, MUST JOIN users and rewards, MUST ORDER BY scheduled_activation_date ASC, scheduled_activation_time ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return UpcomingDiscount fields per ADMIN_API_CONTRACTS.md lines 219-228, MUST filter by client_id

- [ ] **Task 12.2.8:** Implement getUpcomingRaffles function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 466-478 (Query upcoming raffles), SchemaFinalv2.md lines 358-417 (missions table), lines 888-953 (raffle_participations table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query missions WHERE mission_type='raffle' AND activated=true AND raffle_end_date > CURRENT_DATE AND raffle_end_date <= CURRENT_DATE + 7 days, MUST JOIN rewards for prize name, MUST include COUNT of raffle_participations, MUST ORDER BY raffle_end_date ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return UpcomingRaffle fields per ADMIN_API_CONTRACTS.md lines 230-239, MUST filter by client_id

- [ ] **Task 12.2.9:** Implement getExpiringBoosts function
    - **Action:** Add function to dashboard repository
    - **References:** ADMIN_API_CONTRACTS.md lines 480-491 (Query expiring boosts), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table)
    - **Implementation Guide:** MUST query commission_boost_redemptions WHERE boost_status='active' AND expires_at > CURRENT_DATE AND expires_at <= CURRENT_DATE + 7 days, MUST JOIN redemptions and users for tiktok_handle, MUST return boost_rate, expires_at, sales_delta for estimated payout calculation, MUST ORDER BY expires_at ASC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return ExpiringBoost fields per ADMIN_API_CONTRACTS.md lines 241-250, estimatedPayout MUST be calculated as sales_delta × boost_rate, MUST filter by client_id

## Step 12.3: Admin Dashboard Services
- [ ] **Task 12.3.1:** Create admin dashboard service file
    - **Action:** Create `/lib/services/admin/dashboard.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 372-506 (Business Logic), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.3.2:** Implement getDashboardTasks function
    - **Action:** Add main orchestration function to dashboard service
    - **References:** ADMIN_API_CONTRACTS.md lines 131-250 (Response Schema), lines 372-506 (Business Logic)
    - **Implementation Guide:** MUST call all 8 repository functions (discounts, payouts, instant, physical, raffles, upcoming discounts, upcoming raffles, expiring boosts), MUST run queries in parallel for performance (Promise.all), MUST compute counts for each TaskGroup, MUST return DashboardResponse structure with todaysTasks and thisWeeksTasks
    - **Acceptance Criteria:** Service MUST return complete DashboardResponse per ADMIN_API_CONTRACTS.md lines 131-135, MUST handle empty results gracefully (return count:0, items:[])

- [ ] **Task 12.3.3:** Implement computeSlaStatus helper function
    - **Action:** Add SLA computation helper to dashboard service
    - **References:** ADMIN_API_CONTRACTS.md lines 493-501 (SLA status computation)
    - **Implementation Guide:** MUST compute hours since claimed_at, MUST return 'breach' if >= 24 hours, MUST return 'warning' if >= 20 hours, MUST return 'ok' otherwise
    - **Acceptance Criteria:** Function MUST return SlaStatus type ('ok' | 'warning' | 'breach') per ADMIN_API_CONTRACTS.md line 182, MUST match thresholds exactly (20h warning, 24h breach)

- [ ] **Task 12.3.4:** Implement formatting helper functions
    - **Action:** Add date/time/currency formatting helpers to dashboard service
    - **References:** ADMIN_API_CONTRACTS.md lines 66-73 (Backend-Formatted Fields), lines 167-168 (scheduledTimeFormatted), lines 176 (payoutAmountFormatted), lines 223-225 (dateFormatted, timeFormatted)
    - **Implementation Guide:** MUST format time as "2:00 PM EST" per line 167, MUST format currency as "$47.50" per line 176, MUST format date as "Wed 27th" per line 223, MUST format hours ago as "22h" per line 192, MUST add @ prefix to tiktok_handle per line 562
    - **Acceptance Criteria:** All *Formatted fields MUST match exact formats shown in ADMIN_API_CONTRACTS.md example response lines 253-369

## Step 12.4: Admin Dashboard Routes
- [ ] **Task 12.4.1:** Create GET /api/admin/dashboard/tasks route
    - **Action:** Create `/app/api/admin/dashboard/tasks/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 112-581 (GET /api/admin/dashboard/tasks complete specification), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper from Task 12.1.1, MUST call dashboardService.getDashboardTasks(clientId), MUST return 200 with DashboardResponse on success, MUST return 401/403 for auth errors per lines 508-524, MUST return 500 for internal errors per lines 526-532
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 253-369, MUST include all todaysTasks groups (discounts, commissionPayouts, instantRewards, physicalGifts, rafflesToDraw) and thisWeeksTasks groups (upcomingDiscounts, upcomingRaffles, expiringBoosts), each group MUST have count, countFormatted, and items array

## Step 12.5: Admin Dashboard Testing
- [ ] **Task 12.5.1:** Create admin dashboard integration tests
    - **Action:** Create `/tests/integration/admin/dashboard.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 508-532 (Error Responses), TestingPlanning.md (test patterns)
    - **Implementation Guide:** MUST test 6 cases: (1) 401 returned for missing auth token, (2) 403 returned for non-admin user (creator token), (3) 200 returned with correct DashboardResponse structure for admin user, (4) empty arrays returned when no tasks exist (count:0, items:[]), (5) SLA status computed correctly (create gift_card redemption >24h ago → slaStatus='breach'), (6) multi-tenant isolation (admin for client A cannot see client B data → empty results)
    - **Acceptance Criteria:** All 6 test cases MUST pass, tests MUST use test fixtures for admin/creator users, tests MUST clean up test data after each test, MUST verify response matches DashboardResponse schema per ADMIN_API_CONTRACTS.md lines 131-250

- [ ] **Task 12.5.2:** Test dashboard formatted fields accuracy
    - **Action:** Add test cases to `/tests/integration/admin/dashboard.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 174-248 (*Formatted fields), AdminTesting.md SHOULD #8
    - **Implementation Guide:** MUST test 4 cases: (1) countFormatted shows "3 tasks" not "3", (2) slaStatusFormatted shows "On Track" / "At Risk" / "Breach" based on slaStatus enum, (3) claimedAtFormatted shows relative time "2 hours ago", (4) scheduledFormatted shows "Today 2:00 PM" or "Tomorrow 10:00 AM"
    - **Acceptance Criteria:** All 4 formatted field patterns MUST match ADMIN_API_CONTRACTS.md examples per lines 174-248

## Step 12.6: Admin Redemptions Repositories
- [ ] **Task 12.6.1:** Create admin redemptions repository file
    - **Action:** Create `/lib/repositories/admin/redemptions.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 682-748 (Business Logic queries), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.6.2:** Implement getInstantRewards function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 684-694 (Instant Rewards query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type IN ('gift_card','spark_ads','experience') AND status IN ('claimed','concluded') AND deleted_at IS NULL, MUST JOIN users for tiktok_handle and email, MUST JOIN rewards for type and value_data, MUST ORDER BY claimed_at DESC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return InstantRewardItem fields per ADMIN_API_CONTRACTS.md lines 632-643, email MUST be null for spark_ads type, MUST filter by client_id

- [ ] **Task 12.6.3:** Implement getPhysicalGifts function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 696-707 (Physical Gifts query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 820-887 (physical_gift_redemptions table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type='physical_gift' AND deleted_at IS NULL, MUST JOIN physical_gift_redemptions for size_value, shipping_city, shipping_state, shipped_at, delivered_at, MUST JOIN users for tiktok_handle, MUST JOIN rewards for name, MUST ORDER BY claimed_at DESC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return PhysicalGiftItem fields per ADMIN_API_CONTRACTS.md lines 645-655, status MUST be computed from shipped_at/delivered_at (claimed→shipped→delivered), MUST filter by client_id

- [ ] **Task 12.6.4:** Implement getPayBoosts function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 709-719 (Pay Boost query), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table)
    - **Implementation Guide:** MUST query commission_boost_redemptions WHERE boost_status IN ('pending_payout','paid') AND redemptions.deleted_at IS NULL, MUST JOIN redemptions and users for tiktok_handle, MUST return id (from commission_boost_redemptions), final_payout_amount, payment_method, payment_account, boost_status, MUST ORDER BY expires_at DESC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return PayBoostItem fields per ADMIN_API_CONTRACTS.md lines 657-666, id MUST be commission_boost_redemptions.id (not redemptions.id), MUST filter by client_id

- [ ] **Task 12.6.5:** Implement getDiscounts function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 721-732 (Discount query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions WHERE rewards.type='discount' AND status IN ('claimed','fulfilled','concluded') AND deleted_at IS NULL, MUST JOIN users for tiktok_handle, MUST JOIN rewards for value_data (percent, coupon_code), MUST return scheduled_activation_date, scheduled_activation_time, activation_date, expiration_date for status computation, MUST ORDER BY scheduled_activation_date ASC, scheduled_activation_time ASC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return DiscountItem fields per ADMIN_API_CONTRACTS.md lines 668-679, MUST filter by client_id

- [ ] **Task 12.6.6:** Implement getPhysicalGiftById function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 752-795 (GET /api/admin/redemptions/physical/:id), SchemaFinalv2.md lines 590-661 (redemptions table), lines 820-887 (physical_gift_redemptions table)
    - **Implementation Guide:** MUST query redemptions by id, MUST JOIN physical_gift_redemptions for all shipping fields (recipient name, address lines, city, state, postal_code, carrier, tracking_number, shipped_at, delivered_at), MUST JOIN users for tiktok_handle, MUST JOIN rewards for name and value_data (requires_size, size_category), MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return PhysicalGiftDetails fields per ADMIN_API_CONTRACTS.md lines 766-794, recipientName MUST be computed as first_name + ' ' + last_name, MUST return null if not found or wrong client_id

- [ ] **Task 12.6.7:** Implement markPhysicalGiftShipped function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 799-844 (PATCH /api/admin/redemptions/physical/:id/ship), SchemaFinalv2.md lines 820-887 (physical_gift_redemptions table), lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST update physical_gift_redemptions SET carrier, tracking_number, shipped_at, updated_at per lines 829-835, MUST update redemptions SET fulfillment_notes, fulfilled_at, fulfilled_by, status='fulfilled', updated_at per lines 837-843, MUST validate redemption exists and belongs to client_id, MUST validate current status allows shipping (not already delivered)
    - **Acceptance Criteria:** Updates MUST match exact SQL from ADMIN_API_CONTRACTS.md lines 829-843, MUST throw error if not found or already delivered

- [ ] **Task 12.6.8:** Implement markPhysicalGiftDelivered function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 848-881 (PATCH /api/admin/redemptions/physical/:id/deliver), SchemaFinalv2.md lines 820-887 (physical_gift_redemptions table), lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST update physical_gift_redemptions SET delivered_at=NOW(), updated_at=NOW() per lines 871-874, MUST update redemptions SET status='concluded', concluded_at=NOW(), updated_at=NOW() per lines 876-880, MUST validate redemption exists and belongs to client_id, MUST validate shipped_at is not null (can't deliver before shipping)
    - **Acceptance Criteria:** Updates MUST match exact SQL from ADMIN_API_CONTRACTS.md lines 870-880, MUST throw error if not found or not yet shipped

- [ ] **Task 12.6.9:** Implement getPayBoostById function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 885-928 (GET /api/admin/redemptions/boost/:id), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table)
    - **Implementation Guide:** MUST query commission_boost_redemptions by id, MUST JOIN redemptions for external_transaction_id, MUST JOIN users for tiktok_handle (via redemptions.user_id) and payout_sent_by handle, MUST return all fields per lines 899-926 (boost config, period, sales, payout tracking), MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return PayBoostDetails fields per ADMIN_API_CONTRACTS.md lines 898-927, MUST return null if not found or wrong client_id

- [ ] **Task 12.6.10:** Implement markPayBoostPaid function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 932-977 (PATCH /api/admin/redemptions/boost/:id/pay), SchemaFinalv2.md lines 662-745 (commission_boost_redemptions table), lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST update commission_boost_redemptions SET boost_status='paid', payout_sent_at, payout_sent_by, payout_notes, updated_at per lines 963-969, MUST update redemptions SET status='concluded', concluded_at, external_transaction_id, updated_at per lines 971-976, MUST validate boost exists and belongs to client_id, MUST validate boost_status='pending_payout'
    - **Acceptance Criteria:** Updates MUST match exact SQL from ADMIN_API_CONTRACTS.md lines 962-976, MUST throw error if not found or not in pending_payout status

- [ ] **Task 12.6.11:** Implement getDiscountById function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 981-1018 (GET /api/admin/redemptions/discount/:id), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions by id, MUST JOIN users for tiktok_handle and fulfilled_by handle, MUST JOIN rewards for value_data (percent, duration_minutes, max_uses, coupon_code), MUST return all fields per lines 995-1017 (coupon config, activation tracking), MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return DiscountDetails fields per ADMIN_API_CONTRACTS.md lines 994-1017, MUST return null if not found or wrong client_id

- [ ] **Task 12.6.12:** Implement activateDiscount function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1022-1060 (PATCH /api/admin/redemptions/discount/:id/activate), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST first query rewards.value_data->>'duration_minutes' per lines 1045-1049, MUST update redemptions SET status='fulfilled', activation_date=NOW(), expiration_date=NOW()+duration_minutes, fulfilled_at, fulfilled_by, updated_at per lines 1051-1059, MUST validate redemption exists and belongs to client_id, MUST validate status='claimed' and scheduled time has passed
    - **Acceptance Criteria:** Updates MUST match exact SQL from ADMIN_API_CONTRACTS.md lines 1044-1059, MUST throw error if not found or not ready to activate

- [ ] **Task 12.6.13:** Implement concludeInstantReward function
    - **Action:** Add function to redemptions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1064-1095 (PATCH /api/admin/redemptions/instant/:id/conclude), SchemaFinalv2.md lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST update redemptions SET status='concluded', concluded_at=NOW(), fulfilled_at=NOW(), fulfilled_by, updated_at per lines 1087-1094, MUST validate redemption exists and belongs to client_id, MUST validate reward type IN ('gift_card','spark_ads','experience'), MUST validate status='claimed'
    - **Acceptance Criteria:** Updates MUST match exact SQL from ADMIN_API_CONTRACTS.md lines 1086-1094, MUST throw error if not found or not in claimed status

## Step 12.7: Admin Redemptions Services
- [ ] **Task 12.7.1:** Create admin redemptions service file
    - **Action:** Create `/lib/services/admin/redemptions.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 682-748 (Business Logic), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.7.2:** Implement getAllRedemptions function
    - **Action:** Add main orchestration function to redemptions service
    - **References:** ADMIN_API_CONTRACTS.md lines 606-680 (Response Schema)
    - **Implementation Guide:** MUST call all 4 repository functions (getInstantRewards, getPhysicalGifts, getPayBoosts, getDiscounts), MUST run queries in parallel for performance (Promise.all), MUST compute counts for each tab group, MUST return RedemptionsResponse structure with instantRewards, physicalGifts, payBoosts, discounts
    - **Acceptance Criteria:** Service MUST return complete RedemptionsResponse per ADMIN_API_CONTRACTS.md lines 608-630, MUST handle empty results gracefully (return count:0, items:[])

- [ ] **Task 12.7.3:** Implement computeDiscountStatus helper function
    - **Action:** Add discount status computation helper to redemptions service
    - **References:** ADMIN_API_CONTRACTS.md lines 734-748 (computeDiscountStatus function)
    - **Implementation Guide:** MUST implement exact logic from lines 736-747: (1) if status='concluded' return 'done', (2) if activation_date exists and now < expiration_date return 'active', (3) if activation_date exists and now >= expiration_date return 'done', (4) if now >= scheduledDateTime return 'ready', (5) else return 'claimed'
    - **Acceptance Criteria:** Function MUST return DiscountStatus type ('claimed' | 'ready' | 'active' | 'done') per ADMIN_API_CONTRACTS.md line 677, MUST match exact logic from lines 736-747

- [ ] **Task 12.7.4:** Implement computePhysicalGiftStatus helper function
    - **Action:** Add physical gift status computation helper to redemptions service
    - **References:** ADMIN_API_CONTRACTS.md lines 652-653 (status derivation from physical_gift_redemptions state)
    - **Implementation Guide:** MUST compute status from shipped_at/delivered_at: (1) if delivered_at is not null return 'delivered', (2) if shipped_at is not null return 'shipped', (3) else return 'claimed'
    - **Acceptance Criteria:** Function MUST return PhysicalGiftStatus type ('claimed' | 'shipped' | 'delivered') per ADMIN_API_CONTRACTS.md line 652

- [ ] **Task 12.7.5:** Implement getPhysicalGiftDetails service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 752-795 (GET physical/:id)
    - **Implementation Guide:** MUST call repository getPhysicalGiftById, MUST compute status using computePhysicalGiftStatus, MUST throw NOT_FOUND error if repository returns null
    - **Acceptance Criteria:** Service MUST return PhysicalGiftDetails with computed status, MUST throw appropriate error for not found

- [ ] **Task 12.7.6:** Implement shipPhysicalGift service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 799-844 (PATCH ship)
    - **Implementation Guide:** MUST validate request data (carrier, trackingNumber, shippedAt required), MUST call repository markPhysicalGiftShipped with admin user id
    - **Acceptance Criteria:** Service MUST validate input, MUST pass admin_id to repository for fulfilled_by field

- [ ] **Task 12.7.7:** Implement deliverPhysicalGift service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 848-881 (PATCH deliver)
    - **Implementation Guide:** MUST call repository markPhysicalGiftDelivered
    - **Acceptance Criteria:** Service MUST call repository function

- [ ] **Task 12.7.8:** Implement getPayBoostDetails service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 885-928 (GET boost/:id)
    - **Implementation Guide:** MUST call repository getPayBoostById, MUST throw NOT_FOUND error if repository returns null
    - **Acceptance Criteria:** Service MUST return PayBoostDetails, MUST throw appropriate error for not found

- [ ] **Task 12.7.9:** Implement payBoost service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 932-977 (PATCH pay)
    - **Implementation Guide:** MUST validate request data (datePaid, transactionId required), MUST call repository markPayBoostPaid with admin user id
    - **Acceptance Criteria:** Service MUST validate input, MUST pass admin_id to repository for payout_sent_by field

- [ ] **Task 12.7.10:** Implement getDiscountDetails service function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 981-1018 (GET discount/:id)
    - **Implementation Guide:** MUST call repository getDiscountById, MUST compute status using computeDiscountStatus, MUST throw NOT_FOUND error if repository returns null
    - **Acceptance Criteria:** Service MUST return DiscountDetails with computed status, MUST throw appropriate error for not found

- [ ] **Task 12.7.11:** Implement activateDiscountService function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 1022-1060 (PATCH activate)
    - **Implementation Guide:** MUST call repository activateDiscount with admin user id
    - **Acceptance Criteria:** Service MUST pass admin_id to repository for fulfilled_by field

- [ ] **Task 12.7.12:** Implement concludeInstantRewardService function
    - **Action:** Add function to redemptions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 1064-1095 (PATCH conclude)
    - **Implementation Guide:** MUST call repository concludeInstantReward with admin user id
    - **Acceptance Criteria:** Service MUST pass admin_id to repository for fulfilled_by field

## Step 12.8: Admin Redemptions Routes
- [ ] **Task 12.8.1:** Create GET /api/admin/redemptions route
    - **Action:** Create `/app/api/admin/redemptions/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 595-750 (GET /api/admin/redemptions), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper from Task 12.1.1, MUST call redemptionsService.getAllRedemptions(clientId), MUST return 200 with RedemptionsResponse on success
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 608-680, MUST include all 4 tab groups (instantRewards, physicalGifts, payBoosts, discounts)

- [ ] **Task 12.8.2:** Create GET /api/admin/redemptions/physical/[id] route
    - **Action:** Create `/app/api/admin/redemptions/physical/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 752-795 (GET physical/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call service getPhysicalGiftDetails(clientId, id), MUST return 200 with PhysicalGiftDetails on success, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 766-794

- [ ] **Task 12.8.3:** Create PATCH /api/admin/redemptions/physical/[id]/ship route
    - **Action:** Create `/app/api/admin/redemptions/physical/[id]/ship/route.ts` with PATCH handler
    - **References:** ADMIN_API_CONTRACTS.md lines 799-844 (PATCH ship), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST validate request body per lines 810-815, MUST call service shipPhysicalGift, MUST return 200 with success message per lines 820-824, MUST return 404 if not found, MUST return 409 for invalid state
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 810-815, MUST return success response per lines 820-824

- [ ] **Task 12.8.4:** Create PATCH /api/admin/redemptions/physical/[id]/deliver route
    - **Action:** Create `/app/api/admin/redemptions/physical/[id]/deliver/route.ts` with PATCH handler
    - **References:** ADMIN_API_CONTRACTS.md lines 848-881 (PATCH deliver), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST call service deliverPhysicalGift, MUST return 200 with success message per lines 861-865, MUST return 404 if not found, MUST return 409 if not yet shipped
    - **Acceptance Criteria:** Route MUST return success response per ADMIN_API_CONTRACTS.md lines 861-865

- [ ] **Task 12.8.5:** Create GET /api/admin/redemptions/boost/[id] route
    - **Action:** Create `/app/api/admin/redemptions/boost/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 885-928 (GET boost/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call service getPayBoostDetails(clientId, id), MUST return 200 with PayBoostDetails on success, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 898-927

- [ ] **Task 12.8.6:** Create PATCH /api/admin/redemptions/boost/[id]/pay route
    - **Action:** Create `/app/api/admin/redemptions/boost/[id]/pay/route.ts` with PATCH handler
    - **References:** ADMIN_API_CONTRACTS.md lines 932-977 (PATCH pay), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST validate request body per lines 943-948, MUST call service payBoost, MUST return 200 with success message per lines 953-957, MUST return 404 if not found, MUST return 409 for invalid state
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 943-948, MUST return success response per lines 953-957

- [ ] **Task 12.8.7:** Create GET /api/admin/redemptions/discount/[id] route
    - **Action:** Create `/app/api/admin/redemptions/discount/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 981-1018 (GET discount/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call service getDiscountDetails(clientId, id), MUST return 200 with DiscountDetails on success, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 994-1017

- [ ] **Task 12.8.8:** Create PATCH /api/admin/redemptions/discount/[id]/activate route
    - **Action:** Create `/app/api/admin/redemptions/discount/[id]/activate/route.ts` with PATCH handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1022-1060 (PATCH activate), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST call service activateDiscountService, MUST return 200 with success message per lines 1035-1039, MUST return 404 if not found, MUST return 409 if not ready to activate
    - **Acceptance Criteria:** Route MUST return success response per ADMIN_API_CONTRACTS.md lines 1035-1039

- [ ] **Task 12.8.9:** Create PATCH /api/admin/redemptions/instant/[id]/conclude route
    - **Action:** Create `/app/api/admin/redemptions/instant/[id]/conclude/route.ts` with PATCH handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1064-1095 (PATCH conclude), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST call service concludeInstantRewardService, MUST return 200 with success message per lines 1076-1080, MUST return 404 if not found, MUST return 409 if not in claimed status
    - **Acceptance Criteria:** Route MUST return success response per ADMIN_API_CONTRACTS.md lines 1076-1080

- [ ] **Task 12.8.10:** Test redemptions list all tabs
    - **Action:** Create `/tests/integration/admin/redemptions/redemptions-list.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 595-680 (GET /api/admin/redemptions), AdminTesting.md SHOULD #3
    - **Implementation Guide:** MUST test 4 cases: (1) tab=instant returns only gift_card/spark_ads/experience types, (2) tab=physical returns only physical_gift type, (3) tab=boost returns only commission_boost type, (4) tab=discount returns only discount type with correct status derivation
    - **Acceptance Criteria:** All 4 tab filters MUST return correct redemption types per ADMIN_API_CONTRACTS.md lines 620-680

- [ ] **Task 12.8.11:** Test physical gift state transitions
    - **Action:** Create `/tests/integration/admin/redemptions/physical-gift-flow.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 780-870 (ship/deliver endpoints), AdminTesting.md Bug #4, SchemaFinalv2.md lines 820-887 (physical_gift_redemptions)
    - **Implementation Guide:** MUST test 5 cases: (1) ship succeeds when status='claimed', (2) ship fails when already shipped → 409, (3) deliver succeeds when shipped_at is set, (4) deliver fails when not yet shipped → 409, (5) deliver fails when already delivered → 409
    - **Acceptance Criteria:** All 5 state transition cases MUST pass, prevents invalid-state-transition bug (AdminTesting.md Bug #4)

- [ ] **Task 12.8.12:** Test commission boost payout flow
    - **Action:** Create `/tests/integration/admin/redemptions/boost-payout-flow.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 871-960 (boost detail/pay endpoints), AdminTesting.md Bug #3, SchemaFinalv2.md lines 662-745 (commission_boost_redemptions)
    - **Implementation Guide:** MUST test 5 cases: (1) GET returns correct final_payout_amount calculation, (2) pay succeeds when boost_status='pending_payout', (3) pay fails when boost_status='paid' → 409 (idempotency), (4) pay sets payout_sent_at and payout_sent_by correctly (audit trail), (5) pay with wrong redemption ID → 404
    - **Acceptance Criteria:** All 5 cases MUST pass, final_payout_amount MUST match calculation per lines 920-935, prevents wrong-payout bug (AdminTesting.md Bug #3)

- [ ] **Task 12.8.13:** Test discount activation flow
    - **Action:** Create `/tests/integration/admin/redemptions/discount-activation.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1022-1060 (activate endpoint), AdminTesting.md Bug #4
    - **Implementation Guide:** MUST test 4 cases: (1) activate succeeds when status='ready', (2) activate fails when status='claimed' (not ready yet) → 409, (3) activate fails when already activated → 409, (4) expiration_date set correctly based on duration_minutes
    - **Acceptance Criteria:** All 4 cases MUST pass, activation MUST set expiration_date per lines 1055-1056

- [ ] **Task 12.8.14:** Test instant reward conclude
    - **Action:** Create `/tests/integration/admin/redemptions/instant-conclude.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1064-1095 (conclude endpoint), AdminTesting.md Bug #4
    - **Implementation Guide:** MUST test 3 cases: (1) conclude succeeds when status='claimed', (2) conclude fails when already concluded → 409, (3) conclude sets concluded_at and fulfilled_by correctly (audit trail)
    - **Acceptance Criteria:** All 3 cases MUST pass, audit fields MUST be set per AdminTesting.md Bug #11

## Step 12.9: Admin Missions Repositories
- [ ] **Task 12.9.1:** Create admin missions repository file
    - **Action:** Create `/lib/repositories/admin/missions.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1132-1655 (Screen 3: Missions), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.9.2:** Implement getAllMissions function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1186-1197 (Business Logic query), SchemaFinalv2.md lines 358-420 (missions table), lines 458-589 (rewards table), lines 888-953 (raffle_participations table)
    - **Implementation Guide:** MUST query missions with JOIN rewards for reward_name, MUST include subquery COUNT(raffle_participations) for raffle_entry_count, MUST return all fields per lines 1163-1179 (id, display_name, mission_type, target_value, target_unit, tier_eligibility, enabled, activated, raffle_end_date, reward_name, raffle_entry_count), MUST ORDER BY display_order ASC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return MissionItem fields per ADMIN_API_CONTRACTS.md lines 1163-1179, MUST include raffle_entry_count for raffle missions, MUST filter by client_id

- [ ] **Task 12.9.3:** Implement getMissionById function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1213-1249 (GET /api/admin/missions/:id), SchemaFinalv2.md lines 358-420 (missions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query missions by id, MUST JOIN rewards for reward_name, MUST return all fields per lines 1227-1244 (id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, preview_from_tier, display_order, enabled, activated, raffle_end_date, reward_name), MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return MissionDetails fields per ADMIN_API_CONTRACTS.md lines 1227-1244, MUST return null if not found or wrong client_id

- [ ] **Task 12.9.4:** Implement createMission function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1346-1355 (INSERT mission), SchemaFinalv2.md lines 358-420 (missions table)
    - **Implementation Guide:** MUST INSERT into missions with all fields per lines 1348-1354 (client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, preview_from_tier, display_order, enabled, activated, raffle_end_date), MUST RETURN id and display_name
    - **Acceptance Criteria:** Insert MUST match SQL from ADMIN_API_CONTRACTS.md lines 1346-1355, MUST return created mission id and display_name

- [ ] **Task 12.9.5:** Implement createInlineReward function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1315-1320 (INSERT inline reward), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST INSERT into rewards with reward_source='mission' per lines 1317-1319, MUST set enabled=true, MUST copy tier_eligibility from mission, MUST RETURN id
    - **Acceptance Criteria:** Insert MUST match SQL from ADMIN_API_CONTRACTS.md lines 1316-1319, MUST return created reward id, reward_source MUST be 'mission'

- [ ] **Task 12.9.6:** Implement updateMission function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1387-1401 (UPDATE mission), SchemaFinalv2.md lines 358-420 (missions table)
    - **Implementation Guide:** MUST UPDATE missions using COALESCE for optional fields per lines 1390-1400, MUST NOT allow updating mission_type or display_name per line 1403, MUST filter by id AND client_id
    - **Acceptance Criteria:** Update MUST match SQL from ADMIN_API_CONTRACTS.md lines 1389-1400 (excluding updated_at which is not in schema), mission_type and display_name MUST NOT be updatable

- [ ] **Task 12.9.7:** Implement getRaffleById function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1447-1453 (raffle mission query), SchemaFinalv2.md lines 358-420 (missions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query missions WHERE mission_type='raffle', MUST JOIN rewards for reward_name, MUST return id, display_name, tier_eligibility, raffle_end_date, activated, reward_name per lines 1449-1450, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return raffle mission fields per ADMIN_API_CONTRACTS.md lines 1421-1434, MUST return null if not found or not raffle type

- [ ] **Task 12.9.8:** Implement getRaffleParticipants function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1455-1462 (participants query), SchemaFinalv2.md lines 888-953 (raffle_participations table)
    - **Implementation Guide:** MUST query raffle_participations WHERE mission_id, MUST JOIN users for tiktok_handle, MUST return id, user_id, tiktok_handle, participated_at, is_winner per lines 1456-1460, MUST ORDER BY participated_at ASC, MUST filter by client_id
    - **Acceptance Criteria:** Query MUST return RaffleParticipant fields per ADMIN_API_CONTRACTS.md lines 1436-1442, winner determined by is_winner=true per line 1462

- [ ] **Task 12.9.9:** Implement activateRaffle function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1487-1496 (UPDATE activate), SchemaFinalv2.md lines 358-420 (missions table), line 378 (activated field)
    - **Implementation Guide:** MUST UPDATE missions SET activated=true WHERE mission_type='raffle' AND activated=false per lines 1490-1495 (excluding updated_at which is not in schema), MUST filter by id AND client_id
    - **Acceptance Criteria:** Update MUST set activated=true per SchemaFinalv2.md line 378, MUST only activate if currently not activated

- [ ] **Task 12.9.10:** Implement selectRaffleWinner function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1526-1565 (select winner), SchemaFinalv2.md lines 888-953 (raffle_participations table), lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST execute 4-step process: (1) UPDATE all participants SET is_winner=false per lines 1529-1535, (2) UPDATE selected user SET is_winner=true, winner_selected_at=NOW(), selected_by=admin_id per lines 1537-1543, (3) UPDATE winner's redemption SET status='claimed', claimed_at=NOW() per lines 1545-1553, (4) UPDATE losers' redemptions SET status='rejected', rejection_reason='Did not win raffle' per lines 1555-1564, MUST filter by client_id
    - **Acceptance Criteria:** All 4 UPDATE statements MUST match SQL from ADMIN_API_CONTRACTS.md lines 1528-1564, is_winner MUST follow SchemaFinalv2.md lines 929-932 (NULL→not picked, TRUE→won, FALSE→lost)

- [ ] **Task 12.9.11:** Implement getAvailableRewards function
    - **Action:** Add function to missions repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1601-1611 (Business Logic query), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query rewards WHERE client_id AND enabled=true AND reward_source='mission', MUST support optional tierEligibility filter, MUST return id, type, value_data, description per lines 1604-1610, MUST ORDER BY type, display_order
    - **Acceptance Criteria:** Query MUST return rewards for mission dropdown per ADMIN_API_CONTRACTS.md lines 1593-1598, MUST filter reward_source='mission' per SchemaFinalv2.md line 470

## Step 12.10: Admin Missions Services
- [ ] **Task 12.10.1:** Create admin missions service file
    - **Action:** Create `/lib/services/admin/missions.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1132-1655 (Screen 3: Missions), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.10.2:** Implement computeMissionStatus helper function
    - **Action:** Add mission status computation helper to missions service
    - **References:** ADMIN_API_CONTRACTS.md lines 1199-1209 (computeMissionStatus function)
    - **Implementation Guide:** MUST implement exact logic from lines 1201-1208: (1) if !enabled return 'draft', (2) if mission_type='raffle' AND !activated return 'draft', (3) if mission_type='raffle' AND raffle_end_date < now return 'ended', (4) else return 'active'
    - **Acceptance Criteria:** Function MUST return MissionStatus type ('draft' | 'active' | 'ended') per ADMIN_API_CONTRACTS.md line 1183, MUST match exact logic from lines 1201-1208

- [ ] **Task 12.10.3:** Implement formatMissionType helper function
    - **Action:** Add mission type formatting helper to missions service
    - **References:** ADMIN_API_CONTRACTS.md line 1167 (missionTypeFormatted)
    - **Implementation Guide:** MUST format mission_type to display string: 'sales_dollars' → 'Sales ($)', 'sales_units' → 'Sales (units)', 'videos' → 'Videos', 'views' → 'Views', 'likes' → 'Likes', 'raffle' → 'Raffle'
    - **Acceptance Criteria:** Function MUST return human-readable mission type string

- [ ] **Task 12.10.4:** Implement formatTargetValue helper function
    - **Action:** Add target value formatting helper to missions service
    - **References:** ADMIN_API_CONTRACTS.md line 1169 (targetValueFormatted)
    - **Implementation Guide:** MUST format based on target_unit: 'dollars' → "$X", 'units' → "X units", 'count' → "X", raffle (target_value=0) → "-"
    - **Acceptance Criteria:** Function MUST return formatted target value string, MUST return "-" for raffle missions

- [ ] **Task 12.10.5:** Implement getAllMissionsService function
    - **Action:** Add function to missions service that wraps repository call and adds formatting
    - **References:** ADMIN_API_CONTRACTS.md lines 1143-1210 (GET /api/admin/missions)
    - **Implementation Guide:** MUST call repository getAllMissions, MUST compute status using computeMissionStatus for each mission, MUST format missionType, targetValue, tier, status, raffleEndDate using helpers, MUST return MissionsResponse with missions array and totalCount
    - **Acceptance Criteria:** Service MUST return complete MissionsResponse per ADMIN_API_CONTRACTS.md lines 1157-1161, all *Formatted fields MUST be computed

- [ ] **Task 12.10.6:** Implement getMissionDetailsService function
    - **Action:** Add function to missions service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 1213-1249 (GET /api/admin/missions/:id)
    - **Implementation Guide:** MUST call repository getMissionById, MUST throw NOT_FOUND error if repository returns null
    - **Acceptance Criteria:** Service MUST return MissionDetails per ADMIN_API_CONTRACTS.md lines 1227-1244, MUST throw appropriate error for not found

- [ ] **Task 12.10.7:** Implement getDisplayName helper function
    - **Action:** Add display name lookup helper to missions service
    - **References:** ADMIN_API_CONTRACTS.md lines 1322-1332 (DISPLAY_NAMES mapping)
    - **Implementation Guide:** MUST return display_name based on mission_type: 'sales_dollars' → 'Sales Sprint', 'sales_units' → 'Sales Sprint', 'videos' → 'Lights, Camera, Go!', 'views' → 'Road to Viral', 'likes' → 'Fan Favorite', 'raffle' → 'VIP Raffle'
    - **Acceptance Criteria:** Function MUST return exact display names per ADMIN_API_CONTRACTS.md lines 1324-1331

- [ ] **Task 12.10.8:** Implement getTargetUnit helper function
    - **Action:** Add target unit lookup helper to missions service
    - **References:** ADMIN_API_CONTRACTS.md lines 1334-1344 (TARGET_UNITS mapping)
    - **Implementation Guide:** MUST return target_unit based on mission_type: 'sales_dollars' → 'dollars', 'sales_units' → 'units', 'videos'/'views'/'likes'/'raffle' → 'count'
    - **Acceptance Criteria:** Function MUST return exact target units per ADMIN_API_CONTRACTS.md lines 1336-1343

- [ ] **Task 12.10.9:** Implement createMissionService function
    - **Action:** Add function to missions service for creating missions
    - **References:** ADMIN_API_CONTRACTS.md lines 1251-1356 (POST /api/admin/missions)
    - **Implementation Guide:** MUST validate request data, MUST call createInlineReward if inlineReward provided (step 1 per lines 1315-1320), MUST auto-set display_name using getDisplayName helper (step 2), MUST auto-set target_unit using getTargetUnit helper (step 3), MUST set target_value=0 for raffle missions, MUST call repository createMission (step 4)
    - **Acceptance Criteria:** Service MUST follow 4-step process from ADMIN_API_CONTRACTS.md lines 1313-1355, MUST return {success: true, mission: {id, displayName}}

- [ ] **Task 12.10.10:** Implement updateMissionService function
    - **Action:** Add function to missions service for updating missions
    - **References:** ADMIN_API_CONTRACTS.md lines 1359-1404 (PATCH /api/admin/missions/:id)
    - **Implementation Guide:** MUST validate mission exists and belongs to client, MUST NOT allow updating mission_type or display_name, MUST call repository updateMission
    - **Acceptance Criteria:** Service MUST enforce immutability of mission_type and display_name per line 1403, MUST return {success: true, message: 'Mission updated'}

- [ ] **Task 12.10.11:** Implement getRaffleDetailsService function
    - **Action:** Add function to missions service for getting raffle details
    - **References:** ADMIN_API_CONTRACTS.md lines 1407-1464 (GET /api/admin/missions/raffle/:id)
    - **Implementation Guide:** MUST call repository getRaffleById, MUST call repository getRaffleParticipants, MUST compute entryCount from participants.length, MUST find winner from participants WHERE is_winner=true, MUST format tierEligibility, raffleEndDate, participatedAt using helpers, MUST throw NOT_FOUND if raffle not found
    - **Acceptance Criteria:** Service MUST return complete RaffleDetails per ADMIN_API_CONTRACTS.md lines 1421-1434, participants MUST include all formatted fields per lines 1436-1442

- [ ] **Task 12.10.12:** Implement activateRaffleService function
    - **Action:** Add function to missions service for activating raffles
    - **References:** ADMIN_API_CONTRACTS.md lines 1467-1497 (POST /api/admin/missions/raffle/:id/activate)
    - **Implementation Guide:** MUST validate raffle exists and belongs to client, MUST validate raffle is not already activated, MUST call repository activateRaffle
    - **Acceptance Criteria:** Service MUST return {success: true, message: 'Raffle activated'} per lines 1480-1484, MUST throw error if already activated

- [ ] **Task 12.10.13:** Implement selectRaffleWinnerService function
    - **Action:** Add function to missions service for selecting raffle winner
    - **References:** ADMIN_API_CONTRACTS.md lines 1500-1565 (POST /api/admin/missions/raffle/:id/select-winner)
    - **Implementation Guide:** MUST validate raffle exists and belongs to client, MUST validate userId is a participant, MUST validate raffle_end_date has passed, MUST call repository selectRaffleWinner with admin_id, MUST get winner's handle from users table
    - **Acceptance Criteria:** Service MUST return {success: true, message: 'Winner selected', winnerHandle} per lines 1518-1523, MUST handle all 4 database updates atomically

- [ ] **Task 12.10.14:** Implement getAvailableRewardsService function
    - **Action:** Add function to missions service for getting available rewards dropdown
    - **References:** ADMIN_API_CONTRACTS.md lines 1569-1612 (GET /api/admin/rewards/available)
    - **Implementation Guide:** MUST call repository getAvailableRewards with optional tierEligibility filter, MUST generate name from type + value_data using existing reward name generation logic (per SchemaFinalv2.md lines 516-527), MUST compute valueFormatted (e.g., "$50", "5% (30d)")
    - **Acceptance Criteria:** Service MUST return AvailableRewardsResponse per ADMIN_API_CONTRACTS.md lines 1589-1598, name and valueFormatted MUST be computed by backend

## Step 12.11: Admin Missions Routes
- [ ] **Task 12.11.1:** Create GET /api/admin/missions route
    - **Action:** Create `/app/api/admin/missions/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1143-1210 (GET /api/admin/missions), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper from Task 12.1.1, MUST call missionsService.getAllMissionsService(clientId), MUST return 200 with MissionsResponse on success
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1157-1184, MUST include missions array with all formatted fields

- [ ] **Task 12.11.2:** Create GET /api/admin/missions/[id] route
    - **Action:** Create `/app/api/admin/missions/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1213-1249 (GET /api/admin/missions/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call missionsService.getMissionDetailsService(clientId, id), MUST return 200 with MissionDetails on success, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1227-1244

- [ ] **Task 12.11.3:** Add POST handler to /api/admin/missions route
    - **Action:** Add POST handler to `/app/api/admin/missions/route.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1251-1356 (POST /api/admin/missions), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST validate request body per lines 1262-1274 (title, missionType, targetValue, tierEligibility required; rewardId OR inlineReward required), MUST call missionsService.createMissionService, MUST return 200 with {success, mission: {id, displayName}} per lines 1304-1310
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 1262-1298, MUST return success response per lines 1304-1310

- [ ] **Task 12.11.4:** Add PATCH handler to /api/admin/missions/[id] route
    - **Action:** Add PATCH handler to `/app/api/admin/missions/[id]/route.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1359-1404 (PATCH /api/admin/missions/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST validate request body (all fields optional per lines 1370-1375), MUST call missionsService.updateMissionService, MUST return 200 with {success, message} per lines 1380-1384, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST accept partial update body per ADMIN_API_CONTRACTS.md lines 1370-1375, MUST return success response per lines 1380-1384

- [ ] **Task 12.11.5:** Create GET /api/admin/missions/raffle/[id] route
    - **Action:** Create `/app/api/admin/missions/raffle/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1407-1464 (GET /api/admin/missions/raffle/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call missionsService.getRaffleDetailsService(clientId, id), MUST return 200 with RaffleDetails on success, MUST return 404 if not found or not raffle type
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1421-1442

- [ ] **Task 12.11.6:** Create POST /api/admin/missions/raffle/[id]/activate route
    - **Action:** Create `/app/api/admin/missions/raffle/[id]/activate/route.ts` with POST handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1467-1497 (POST /api/admin/missions/raffle/:id/activate), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call missionsService.activateRaffleService, MUST return 200 with {success, message} per lines 1480-1484, MUST return 404 if not found, MUST return 409 if already activated
    - **Acceptance Criteria:** Route MUST return success response per ADMIN_API_CONTRACTS.md lines 1480-1484

- [ ] **Task 12.11.7:** Create POST /api/admin/missions/raffle/[id]/select-winner route
    - **Action:** Create `/app/api/admin/missions/raffle/[id]/select-winner/route.ts` with POST handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1500-1565 (POST /api/admin/missions/raffle/:id/select-winner), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST validate request body has userId per line 1512, MUST call missionsService.selectRaffleWinnerService, MUST return 200 with {success, message, winnerHandle} per lines 1518-1523, MUST return 404 if raffle not found, MUST return 400 if userId not a participant
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 1511-1513, MUST return success response per lines 1518-1523

- [ ] **Task 12.11.8:** Create GET /api/admin/rewards/available route
    - **Action:** Create `/app/api/admin/rewards/available/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1569-1612 (GET /api/admin/rewards/available), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract optional tierEligibility from query params per lines 1580-1584, MUST call missionsService.getAvailableRewardsService(clientId, tierEligibility), MUST return 200 with AvailableRewardsResponse on success
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1588-1598, tierEligibility filter MUST be optional

- [ ] **Task 12.11.9:** Test missions CRUD flow
    - **Action:** Create `/tests/integration/admin/missions/missions-crud.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1143-1405 (GET/POST/PATCH missions), AdminTesting.md SHOULD #4
    - **Implementation Guide:** MUST test 6 cases: (1) GET /missions returns list with correct fields, (2) GET /missions/:id returns full details, (3) POST creates mission with auto-generated displayName, (4) POST with inlineReward creates both mission and reward, (5) PATCH updates only specified fields, (6) mission_type and display_name immutable after creation
    - **Acceptance Criteria:** All 6 CRUD cases MUST pass, displayName MUST be auto-set per lines 1324-1332

- [ ] **Task 12.11.10:** Test raffle winner selection workflow
    - **Action:** Create `/tests/integration/admin/missions/raffle-workflow.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1407-1560 (raffle endpoints), AdminTesting.md Bug #5, SchemaFinalv2.md lines 888-953 (raffle_participations)
    - **Implementation Guide:** MUST test 13 cases per AdminTesting.md Bug #5: (1) 0 participants → appropriate error/empty, (2) 1 participant → normal flow wins, (3) participant from wrong client → 403/404, (4) winner already selected → 409, (5) non-participant user_id → 400, (6) raffle not ended yet → 409, (7) raffle not activated → 409, (8) winner redemption moves to claimed, (9) losers redemptions marked rejected, (10) selected_by audit field set, (11) winner_selected_at timestamp set, (12) only one is_winner=true, (13) all losers have is_winner=false
    - **Acceptance Criteria:** All 13 cases MUST pass, prevents wrong-raffle-winner bug (AdminTesting.md Bug #5)

- [ ] **Task 12.11.11:** Test available rewards dropdown
    - **Action:** Add test cases to `/tests/integration/admin/missions/missions-crud.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1569-1612 (GET /api/admin/rewards/available), AdminTesting.md SHOULD #5
    - **Implementation Guide:** MUST test 3 cases: (1) returns only reward_source='mission' rewards, (2) excludes reward_source='vip_tier' rewards, (3) returns empty array when no mission rewards exist
    - **Acceptance Criteria:** All 3 cases MUST pass, reward_source filter MUST work correctly

## Step 12.12: Admin VIP Rewards Repositories
- [ ] **Task 12.12.1:** Create admin vip-rewards repository file
    - **Action:** Create `/lib/repositories/admin/vip-rewards.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1656-1956 (Screen 4: VIP Rewards), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.12.2:** Implement getAllVipRewards function
    - **Action:** Add function to vip-rewards repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1702-1711 (Business Logic query), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query rewards WHERE client_id AND reward_source='vip_tier', MUST return id, type, description, value_data, tier_eligibility, redemption_frequency, redemption_quantity, enabled, display_order per lines 1705-1706, MUST ORDER BY tier_eligibility ASC, display_order ASC
    - **Acceptance Criteria:** Query MUST return VipRewardItem fields per ADMIN_API_CONTRACTS.md lines 1684-1695, MUST filter reward_source='vip_tier' per SchemaFinalv2.md line 470

- [ ] **Task 12.12.3:** Implement getVipRewardById function
    - **Action:** Add function to vip-rewards repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1775-1784 (Business Logic query), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query rewards by id WHERE client_id AND reward_source='vip_tier', MUST return all fields per lines 1778-1779 (id, type, description, value_data, tier_eligibility, preview_from_tier, redemption_type, redemption_frequency, redemption_quantity, expires_days, enabled)
    - **Acceptance Criteria:** Query MUST return VipRewardDetails fields per ADMIN_API_CONTRACTS.md lines 1749-1762, MUST return null if not found or wrong client_id

- [ ] **Task 12.12.4:** Implement createVipReward function
    - **Action:** Add function to vip-rewards repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1846-1858 (INSERT query), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST INSERT with reward_source='vip_tier', MUST auto-calculate display_order using subquery per line 1856, MUST convert camelCase valueData to snake_case value_data, MUST RETURN id
    - **Acceptance Criteria:** Insert MUST match SQL from ADMIN_API_CONTRACTS.md lines 1847-1857, reward_source MUST be 'vip_tier'

- [ ] **Task 12.12.5:** Implement updateVipReward function
    - **Action:** Add function to vip-rewards repository
    - **References:** ADMIN_API_CONTRACTS.md lines 1901-1918 (UPDATE query), SchemaFinalv2.md lines 458-589 (rewards table)
    - **Implementation Guide:** MUST UPDATE using COALESCE for optional fields per lines 1904-1915, MUST filter by id AND client_id AND reward_source='vip_tier', MUST convert camelCase valueData to snake_case value_data, MUST set updated_at=NOW()
    - **Acceptance Criteria:** Update MUST match SQL from ADMIN_API_CONTRACTS.md lines 1903-1918

## Step 12.13: Admin VIP Rewards Services
- [ ] **Task 12.13.1:** Create admin vip-rewards service file
    - **Action:** Create `/lib/services/admin/vip-rewards.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1656-1956 (Screen 4: VIP Rewards), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.13.2:** Implement generateRewardName helper function
    - **Action:** Add reward name generation helper to vip-rewards service
    - **References:** ADMIN_API_CONTRACTS.md lines 1713-1731 (generateRewardName function), SchemaFinalv2.md lines 516-527 (name generation rules)
    - **Implementation Guide:** MUST generate name based on type + value_data: gift_card → "$X Gift Card", commission_boost → "X% Pay Boost", spark_ads → "$X Ads Boost", discount → "X% Deal Boost", physical_gift → "Gift Drop: {description}", experience → description
    - **Acceptance Criteria:** Function MUST return exact name formats per ADMIN_API_CONTRACTS.md lines 1717-1729 and SchemaFinalv2.md lines 520-527

- [ ] **Task 12.13.3:** Implement formatRewardType helper function
    - **Action:** Add reward type formatting helper to vip-rewards service
    - **References:** ADMIN_API_CONTRACTS.md line 1688 (typeFormatted)
    - **Implementation Guide:** MUST format type to display string: gift_card → "Gift Card", commission_boost → "Commission Boost", spark_ads → "Spark Ads", discount → "Discount", physical_gift → "Physical Gift", experience → "Experience"
    - **Acceptance Criteria:** Function MUST return human-readable reward type string

- [ ] **Task 12.13.4:** Implement getRedemptionType helper function
    - **Action:** Add redemption type lookup helper to vip-rewards service
    - **References:** ADMIN_API_CONTRACTS.md lines 1834-1844 (REDEMPTION_TYPES mapping), SchemaFinalv2.md line 476 (redemption_type)
    - **Implementation Guide:** MUST return redemption_type based on type: gift_card/spark_ads/physical_gift/experience → 'instant', commission_boost/discount → 'scheduled'
    - **Acceptance Criteria:** Function MUST return exact redemption types per ADMIN_API_CONTRACTS.md lines 1836-1843

- [ ] **Task 12.13.5:** Implement getAllVipRewardsService function
    - **Action:** Add function to vip-rewards service that wraps repository call and adds formatting
    - **References:** ADMIN_API_CONTRACTS.md lines 1664-1731 (GET /api/admin/vip-rewards)
    - **Implementation Guide:** MUST call repository getAllVipRewards, MUST generate name using generateRewardName for each reward, MUST format type, tier, frequency, status using helpers, MUST return VipRewardsResponse with rewards array and totalCount
    - **Acceptance Criteria:** Service MUST return complete VipRewardsResponse per ADMIN_API_CONTRACTS.md lines 1678-1682, all *Formatted fields MUST be computed

- [ ] **Task 12.13.6:** Implement getVipRewardDetailsService function
    - **Action:** Add function to vip-rewards service that wraps repository call
    - **References:** ADMIN_API_CONTRACTS.md lines 1735-1787 (GET /api/admin/vip-rewards/:id)
    - **Implementation Guide:** MUST call repository getVipRewardById, MUST generate name using generateRewardName, MUST convert snake_case value_data to camelCase valueData per line 1786, MUST throw NOT_FOUND error if repository returns null
    - **Acceptance Criteria:** Service MUST return VipRewardDetails per ADMIN_API_CONTRACTS.md lines 1749-1762, valueData MUST be camelCase

- [ ] **Task 12.13.7:** Implement createVipRewardService function
    - **Action:** Add function to vip-rewards service for creating VIP rewards
    - **References:** ADMIN_API_CONTRACTS.md lines 1790-1870 (POST /api/admin/vip-rewards)
    - **Implementation Guide:** MUST validate request data per lines 1860-1869, MUST auto-set redemption_type using getRedemptionType helper, MUST convert camelCase valueData to snake_case value_data, MUST call repository createVipReward, MUST generate name for response
    - **Acceptance Criteria:** Service MUST follow validation rules from ADMIN_API_CONTRACTS.md lines 1860-1869, MUST return {success: true, reward: {id, name}}

- [ ] **Task 12.13.8:** Implement updateVipRewardService function
    - **Action:** Add function to vip-rewards service for updating VIP rewards
    - **References:** ADMIN_API_CONTRACTS.md lines 1873-1922 (PATCH /api/admin/vip-rewards/:id)
    - **Implementation Guide:** MUST validate reward exists and belongs to client, MUST recalculate redemption_type if type changes per line 1921, MUST convert camelCase valueData to snake_case value_data, MUST call repository updateVipReward
    - **Acceptance Criteria:** Service MUST return {success: true, message: 'VIP reward updated'} per lines 1894-1898

## Step 12.14: Admin VIP Rewards Routes
- [ ] **Task 12.14.1:** Create GET /api/admin/vip-rewards route
    - **Action:** Create `/app/api/admin/vip-rewards/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1664-1731 (GET /api/admin/vip-rewards), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST call vipRewardsService.getAllVipRewardsService(clientId), MUST return 200 with VipRewardsResponse on success
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1678-1700

- [ ] **Task 12.14.2:** Add POST handler to /api/admin/vip-rewards route
    - **Action:** Add POST handler to `/app/api/admin/vip-rewards/route.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1790-1870 (POST /api/admin/vip-rewards), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST validate request body per lines 1801-1813, MUST call vipRewardsService.createVipRewardService, MUST return 200 with {success, reward: {id, name}} per lines 1822-1829
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 1801-1813, MUST return success response per lines 1822-1829

- [ ] **Task 12.14.3:** Create GET /api/admin/vip-rewards/[id] route
    - **Action:** Create `/app/api/admin/vip-rewards/[id]/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1735-1787 (GET /api/admin/vip-rewards/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call vipRewardsService.getVipRewardDetailsService(clientId, id), MUST return 200 with VipRewardDetails on success, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1749-1772

- [ ] **Task 12.14.4:** Add PATCH handler to /api/admin/vip-rewards/[id] route
    - **Action:** Add PATCH handler to `/app/api/admin/vip-rewards/[id]/route.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1873-1922 (PATCH /api/admin/vip-rewards/:id), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST validate request body (all fields optional per lines 1884-1889), MUST call vipRewardsService.updateVipRewardService, MUST return 200 with {success, message} per lines 1894-1898, MUST return 404 if not found
    - **Acceptance Criteria:** Route MUST accept partial update body per ADMIN_API_CONTRACTS.md lines 1884-1889, MUST return success response per lines 1894-1898

- [ ] **Task 12.14.5:** Test VIP rewards CRUD flow
    - **Action:** Create `/tests/integration/admin/vip-rewards/vip-rewards-crud.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1656-1956 (Screen 4: VIP Rewards), AdminTesting.md SHOULD #5
    - **Implementation Guide:** MUST test 5 cases: (1) GET /vip-rewards returns only reward_source='vip_tier' rewards, (2) POST creates reward with reward_source='vip_tier' automatically set, (3) GET /vip-rewards/:id returns full details with valueData transformed, (4) PATCH updates only specified fields, (5) created reward excluded from /rewards/available (mission dropdown)
    - **Acceptance Criteria:** All 5 cases MUST pass, reward_source MUST be auto-set to 'vip_tier' on creation

## Step 12.15: Admin Sales Adjustments Repositories
- [ ] **Task 12.15.1:** Create admin sales-adjustments repository file
    - **Action:** Create `/lib/repositories/admin/sales-adjustments.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1959-2208 (Screen 5: Sales Adjustments), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.15.2:** Implement searchCreatorByHandle function
    - **Action:** Add function to sales-adjustments repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2016-2027 (Business Logic query), SchemaFinalv2.md lines 123-155 (users table), lines 250-268 (tiers table)
    - **Implementation Guide:** MUST query users WHERE client_id AND (tiktok_handle = handle OR tiktok_handle = '@' + handle), MUST LEFT JOIN tiers for tier_name, MUST return id, tiktok_handle, total_sales, total_units, checkpoint_sales_current, checkpoint_units_current, manual_adjustments_total, manual_adjustments_units, current_tier, tier_name per lines 2019-2022
    - **Acceptance Criteria:** Query MUST return CreatorInfo fields per ADMIN_API_CONTRACTS.md lines 1993-2013, MUST handle handle with or without @ prefix

- [ ] **Task 12.15.3:** Implement getAdjustmentsByUserId function
    - **Action:** Add function to sales-adjustments repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2076-2087 (Business Logic query), SchemaFinalv2.md lines 271-286 (sales_adjustments table)
    - **Implementation Guide:** MUST query sales_adjustments WHERE user_id AND client_id, MUST LEFT JOIN users for adjusted_by_handle, MUST return id, amount, amount_units, reason, adjustment_type, adjusted_by, created_at, applied_at, adjusted_by_handle per lines 2079-2081, MUST ORDER BY created_at DESC
    - **Acceptance Criteria:** Query MUST return AdjustmentHistoryItem fields per ADMIN_API_CONTRACTS.md lines 2055-2070

- [ ] **Task 12.15.4:** Implement createAdjustment function
    - **Action:** Add function to sales-adjustments repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2149-2156 (INSERT query), SchemaFinalv2.md lines 271-286 (sales_adjustments table)
    - **Implementation Guide:** MUST INSERT with user_id, client_id, amount, amount_units, adjustment_type, reason, adjusted_by, created_at=NOW() per lines 2151-2155, applied_at MUST remain NULL (set by daily sync job), MUST RETURN full record
    - **Acceptance Criteria:** Insert MUST match SQL from ADMIN_API_CONTRACTS.md lines 2150-2155, applied_at MUST be NULL per line 2158

## Step 12.16: Admin Sales Adjustments Services
- [ ] **Task 12.16.1:** Create admin sales-adjustments service file
    - **Action:** Create `/lib/services/admin/sales-adjustments.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1959-2208 (Screen 5: Sales Adjustments), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.16.2:** Implement formatAdjustmentAmount helper function
    - **Action:** Add adjustment amount formatting helper to sales-adjustments service
    - **References:** ADMIN_API_CONTRACTS.md line 2061 (amountFormatted)
    - **Implementation Guide:** MUST format amount based on mode: sales → "+$200" or "-$50", units → "+50 units" or "-10 units", MUST include sign prefix
    - **Acceptance Criteria:** Function MUST return formatted amount with sign per ADMIN_API_CONTRACTS.md line 2061

- [ ] **Task 12.16.3:** Implement formatAdjustmentType helper function
    - **Action:** Add adjustment type formatting helper to sales-adjustments service
    - **References:** ADMIN_API_CONTRACTS.md line 2063 (adjustmentTypeFormatted)
    - **Implementation Guide:** MUST format adjustment_type: manual_sale → "Manual Sale", refund → "Refund", bonus → "Bonus", correction → "Correction"
    - **Acceptance Criteria:** Function MUST return human-readable adjustment type per SchemaFinalv2.md line 282

- [ ] **Task 12.16.4:** Implement searchCreatorService function
    - **Action:** Add function to sales-adjustments service for searching creators
    - **References:** ADMIN_API_CONTRACTS.md lines 1967-2032 (GET /api/admin/creators/search)
    - **Implementation Guide:** MUST call repository searchCreatorByHandle, MUST get client.vip_metric to determine which fields to populate (sales vs units) per lines 2029-2031, MUST format sales/units values, MUST return CreatorSearchResponse with found boolean
    - **Acceptance Criteria:** Service MUST return CreatorSearchResponse per ADMIN_API_CONTRACTS.md lines 1987-1991, MUST populate correct fields based on vip_metric

- [ ] **Task 12.16.5:** Implement getAdjustmentHistoryService function
    - **Action:** Add function to sales-adjustments service for getting adjustment history
    - **References:** ADMIN_API_CONTRACTS.md lines 2035-2088 (GET /api/admin/creators/:id/adjustments)
    - **Implementation Guide:** MUST validate user exists and belongs to client, MUST call repository getAdjustmentsByUserId, MUST compute status from applied_at (NULL → 'pending', else → 'applied') per line 2066, MUST format all *Formatted fields
    - **Acceptance Criteria:** Service MUST return AdjustmentHistoryResponse per ADMIN_API_CONTRACTS.md lines 2049-2053, status MUST be computed per line 2066

- [ ] **Task 12.16.6:** Implement createAdjustmentService function
    - **Action:** Add function to sales-adjustments service for creating adjustments
    - **References:** ADMIN_API_CONTRACTS.md lines 2091-2175 (POST /api/admin/creators/:id/adjustments)
    - **Implementation Guide:** MUST validate user exists and belongs to client, MUST validate amount vs amountUnits based on client.vip_metric per lines 2139-2147, MUST call repository createAdjustment with admin_id, MUST format response with all *Formatted fields
    - **Acceptance Criteria:** Service MUST validate mutually exclusive amount/amountUnits per lines 2139-2147, MUST return adjustment with status='pending' and appliedAt=null per lines 2127-2128

## Step 12.17: Admin Sales Adjustments Routes
- [ ] **Task 12.17.1:** Create GET /api/admin/creators/search route
    - **Action:** Create `/app/api/admin/creators/search/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 1967-2032 (GET /api/admin/creators/search), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract handle from query params (required per line 1982), MUST call salesAdjustmentsService.searchCreatorService(clientId, handle), MUST return 200 with CreatorSearchResponse
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 1987-2013, handle query param MUST be required

- [ ] **Task 12.17.2:** Create GET /api/admin/creators/[id]/adjustments route
    - **Action:** Create `/app/api/admin/creators/[id]/adjustments/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2035-2088 (GET /api/admin/creators/:id/adjustments), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call salesAdjustmentsService.getAdjustmentHistoryService(clientId, id), MUST return 200 with AdjustmentHistoryResponse, MUST return 404 if user not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 2049-2074

- [ ] **Task 12.17.3:** Add POST handler to /api/admin/creators/[id]/adjustments route
    - **Action:** Add POST handler to `/app/api/admin/creators/[id]/adjustments/route.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2091-2175 (POST /api/admin/creators/:id/adjustments), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST validate request body per lines 2102-2107, MUST call salesAdjustmentsService.createAdjustmentService, MUST return 200 with {success, adjustment, error} per lines 2114-2134, MUST return 404 if user not found
    - **Acceptance Criteria:** Route MUST accept request body per ADMIN_API_CONTRACTS.md lines 2102-2107, MUST return success response per lines 2114-2134

- [ ] **Task 12.17.4:** Test creator search functionality
    - **Action:** Create `/tests/integration/admin/sales-adjustments/adjustments-flow.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 1967-2032 (GET /api/admin/creators/search), AdminTesting.md SHOULD #6
    - **Implementation Guide:** MUST test 4 cases: (1) search by @handle finds user, (2) search by handle without @ finds same user, (3) search by HANDLE (uppercase) finds same user (case insensitive), (4) search for non-existent handle returns found=false
    - **Acceptance Criteria:** All 4 cases MUST pass, search MUST be case-insensitive and handle @ prefix

- [ ] **Task 12.17.5:** Test manual adjustment integrity
    - **Action:** Add test cases to `/tests/integration/admin/sales-adjustments/adjustments-flow.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2091-2175 (POST /api/admin/creators/:id/adjustments), AdminTesting.md Bug #6
    - **Implementation Guide:** MUST test 5 cases: (1) adjustment created with correct user_id, (2) adjustment uses correct metric based on client.vip_metric (sales vs units), (3) applied_at is NULL on creation (set by sync job), (4) adjusted_by set to admin's user_id (audit trail), (5) amount/amountUnits mutually exclusive per client.vip_metric
    - **Acceptance Criteria:** All 5 cases MUST pass, prevents manual-adjustment-misapplication bug (AdminTesting.md Bug #6)

## Step 12.18: Admin Creator Lookup Repositories
- [ ] **Task 12.18.1:** Create admin creator-lookup repository file
    - **Action:** Create `/lib/repositories/admin/creator-lookup.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2214-2407 (Screen 6: Creator Lookup), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.18.2:** Implement getCreatorProfile function
    - **Action:** Add function to creator-lookup repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2307-2317 (profile query), SchemaFinalv2.md lines 123-155 (users table), lines 250-268 (tiers table)
    - **Implementation Guide:** MUST query users by id WHERE client_id, MUST LEFT JOIN tiers for tier_name, MUST return id, tiktok_handle, email, current_tier, created_at, total_sales, total_units, checkpoint_sales_current, checkpoint_sales_target, checkpoint_units_current, checkpoint_units_target, tier_name per lines 2309-2313
    - **Acceptance Criteria:** Query MUST return CreatorProfile fields per ADMIN_API_CONTRACTS.md lines 2243-2264, MUST return null if not found

- [ ] **Task 12.18.3:** Implement getActiveRedemptions function
    - **Action:** Add function to creator-lookup repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2319-2332 (active redemptions query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table), lines 662-745 (commission_boost_redemptions), lines 820-887 (physical_gift_redemptions)
    - **Implementation Guide:** MUST query redemptions WHERE user_id AND client_id AND status NOT IN ('concluded','rejected') AND deleted_at IS NULL, MUST JOIN rewards for type and value_data, MUST LEFT JOIN commission_boost_redemptions for boost_status, MUST LEFT JOIN physical_gift_redemptions for shipped_at and delivered_at, MUST ORDER BY claimed_at DESC
    - **Acceptance Criteria:** Query MUST return ActiveRedemption fields per ADMIN_API_CONTRACTS.md lines 2266-2276

- [ ] **Task 12.18.4:** Implement getMissionProgress function
    - **Action:** Add function to creator-lookup repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2334-2344 (mission progress query), SchemaFinalv2.md lines 421-457 (mission_progress table), lines 358-420 (missions table)
    - **Implementation Guide:** MUST query mission_progress WHERE user_id AND client_id AND status IN ('active','completed'), MUST JOIN missions for display_name, mission_type, target_value, MUST return id, current_value, status, display_name, mission_type, target_value, MUST ORDER BY updated_at DESC
    - **Acceptance Criteria:** Query MUST return MissionProgressItem fields per ADMIN_API_CONTRACTS.md lines 2278-2288, status MUST match SchemaFinalv2.md lines 439-442

- [ ] **Task 12.18.5:** Implement getRedemptionHistory function
    - **Action:** Add function to creator-lookup repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2346-2356 (redemption history query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions WHERE user_id AND client_id AND status='concluded', MUST JOIN rewards for type and value_data, MUST return id, claimed_at, concluded_at, type, value_data, MUST ORDER BY concluded_at DESC, MUST LIMIT 10
    - **Acceptance Criteria:** Query MUST return RedemptionHistoryItem fields per ADMIN_API_CONTRACTS.md lines 2290-2297, MUST limit to 10 records

## Step 12.19: Admin Creator Lookup Services
- [ ] **Task 12.19.1:** Create admin creator-lookup service file
    - **Action:** Create `/lib/services/admin/creator-lookup.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2214-2407 (Screen 6: Creator Lookup), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.19.2:** Implement computeSubStatus helper function
    - **Action:** Add sub-status computation helper to creator-lookup service
    - **References:** ADMIN_API_CONTRACTS.md lines 2358-2371 (computeSubStatus function)
    - **Implementation Guide:** MUST compute sub-status from sub-state tables: if commission_boost → return boost_status, if physical_gift → return 'delivered'/'shipped'/'pending_shipment' based on shipped_at/delivered_at, else return null
    - **Acceptance Criteria:** Function MUST match exact logic from ADMIN_API_CONTRACTS.md lines 2360-2370

- [ ] **Task 12.19.3:** Implement formatMissionProgress helper function
    - **Action:** Add mission progress formatting helper to creator-lookup service
    - **References:** ADMIN_API_CONTRACTS.md line 2285 (progressFormatted)
    - **Implementation Guide:** MUST format progress based on mission_type: sales_dollars → "$320/$500", sales_units/videos/views/likes → "7/10", raffle → "entered"
    - **Acceptance Criteria:** Function MUST return progress string per ADMIN_API_CONTRACTS.md line 2285

- [ ] **Task 12.19.4:** Implement getCreatorDetailsService function
    - **Action:** Add main orchestration function to creator-lookup service
    - **References:** ADMIN_API_CONTRACTS.md lines 2222-2372 (GET /api/admin/creators/:id/details)
    - **Implementation Guide:** MUST call all 4 repository functions (profile, activeRedemptions, missionProgress, redemptionHistory) in parallel, MUST compute subStatus for each active redemption using computeSubStatus, MUST format all *Formatted fields, MUST get client.vip_metric to populate correct sales/units fields, MUST throw NOT_FOUND if profile is null
    - **Acceptance Criteria:** Service MUST return complete CreatorDetailsResponse per ADMIN_API_CONTRACTS.md lines 2236-2241

## Step 12.20: Admin Creator Lookup Routes
- [ ] **Task 12.20.1:** Create GET /api/admin/creators/[id]/details route
    - **Action:** Create `/app/api/admin/creators/[id]/details/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2222-2372 (GET /api/admin/creators/:id/details), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract id from params, MUST call creatorLookupService.getCreatorDetailsService(clientId, id), MUST return 200 with CreatorDetailsResponse, MUST return 404 if creator not found
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 2236-2303

- [ ] **Task 12.20.2:** Test creator details aggregation
    - **Action:** Create `/tests/integration/admin/creator-lookup/creator-details.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2222-2372 (GET /api/admin/creators/:id/details), AdminTesting.md SHOULD #7
    - **Implementation Guide:** MUST test 5 cases: (1) returns profile with correct tier info, (2) returns activeRedemptions with computed subStatus, (3) returns missionProgress with progressFormatted, (4) returns redemptionHistory limited to 10 items, (5) returns 404 for non-existent creator
    - **Acceptance Criteria:** All 5 cases MUST pass, all 4 data sections MUST be populated correctly per lines 2243-2303

## Step 12.21: Admin Data Sync Repositories
- [ ] **Task 12.21.1:** Create admin data-sync repository file
    - **Action:** Create `/lib/repositories/admin/data-sync.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2409-2595 (Screen 7: Data Sync), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.21.2:** Implement getCurrentSyncStatus function
    - **Action:** Add function to data-sync repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2471-2478 (current status query), SchemaFinalv2.md lines 328-353 (sync_logs table)
    - **Implementation Guide:** MUST query sync_logs WHERE client_id ORDER BY started_at DESC LIMIT 1, MUST return id, status, started_at, completed_at, records_processed, error_message per lines 2473-2474
    - **Acceptance Criteria:** Query MUST return CurrentSyncStatus fields per ADMIN_API_CONTRACTS.md lines 2438-2446, MUST return null if no sync history

- [ ] **Task 12.21.3:** Implement getSyncHistory function
    - **Action:** Add function to data-sync repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2480-2490 (history query), SchemaFinalv2.md lines 328-353 (sync_logs table)
    - **Implementation Guide:** MUST query sync_logs WHERE client_id ORDER BY started_at DESC LIMIT 10, MUST LEFT JOIN users for triggered_by_handle, MUST return all fields per lines 2482-2484 (id, status, source, started_at, completed_at, records_processed, error_message, file_name, triggered_by, triggered_by_handle)
    - **Acceptance Criteria:** Query MUST return SyncHistoryItem fields per ADMIN_API_CONTRACTS.md lines 2448-2463, MUST limit to 10 records

- [ ] **Task 12.21.4:** Implement createSyncLog function
    - **Action:** Add function to data-sync repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2526-2533 (INSERT query), SchemaFinalv2.md lines 328-353 (sync_logs table)
    - **Implementation Guide:** MUST INSERT with client_id, status='running', source='manual', started_at=NOW(), file_name, triggered_by per lines 2528-2531, MUST RETURN id
    - **Acceptance Criteria:** Insert MUST match SQL from ADMIN_API_CONTRACTS.md lines 2527-2532, status MUST be 'running' per SchemaFinalv2.md line 335

- [ ] **Task 12.21.5:** Implement updateSyncLogSuccess function
    - **Action:** Add function to data-sync repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2540-2547 (UPDATE success), SchemaFinalv2.md lines 328-353 (sync_logs table)
    - **Implementation Guide:** MUST UPDATE sync_logs SET status='success', completed_at=NOW(), records_processed per lines 2542-2545
    - **Acceptance Criteria:** Update MUST match SQL from ADMIN_API_CONTRACTS.md lines 2541-2546

- [ ] **Task 12.21.6:** Implement updateSyncLogFailed function
    - **Action:** Add function to data-sync repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2549-2556 (UPDATE failed), SchemaFinalv2.md lines 328-353 (sync_logs table)
    - **Implementation Guide:** MUST UPDATE sync_logs SET status='failed', completed_at=NOW(), error_message per lines 2551-2554
    - **Acceptance Criteria:** Update MUST match SQL from ADMIN_API_CONTRACTS.md lines 2550-2555

## Step 12.22: Admin Data Sync Services
- [ ] **Task 12.22.1:** Create admin data-sync service file
    - **Action:** Create `/lib/services/admin/data-sync.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2409-2595 (Screen 7: Data Sync), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.22.2:** Implement formatSyncStatus helper function
    - **Action:** Add sync status formatting helper to data-sync service
    - **References:** ADMIN_API_CONTRACTS.md line 2440 (statusFormatted)
    - **Implementation Guide:** MUST format status: running → "Running", success → "Success", failed → "Failed"
    - **Acceptance Criteria:** Function MUST return human-readable status per SchemaFinalv2.md line 335

- [ ] **Task 12.22.3:** Implement formatSyncSource helper function
    - **Action:** Add sync source formatting helper to data-sync service
    - **References:** ADMIN_API_CONTRACTS.md line 2458 (sourceFormatted)
    - **Implementation Guide:** MUST format source: auto → "Auto", manual → "Manual"
    - **Acceptance Criteria:** Function MUST return human-readable source per SchemaFinalv2.md line 336

- [ ] **Task 12.22.4:** Implement getSyncStatusService function
    - **Action:** Add function to data-sync service for getting sync status
    - **References:** ADMIN_API_CONTRACTS.md lines 2417-2491 (GET /api/admin/sync/status)
    - **Implementation Guide:** MUST call repository getCurrentSyncStatus and getSyncHistory, MUST format all *Formatted fields, MUST handle case where no sync history exists
    - **Acceptance Criteria:** Service MUST return complete DataSyncResponse per ADMIN_API_CONTRACTS.md lines 2431-2436

- [ ] **Task 12.22.5:** Implement uploadCsvService function
    - **Action:** Add function to data-sync service for CSV upload
    - **References:** ADMIN_API_CONTRACTS.md lines 2494-2557 (POST /api/admin/sync/upload), Loyalty.md lines 1996-2016 (Manual CSV Upload Fallback)
    - **Implementation Guide:** MUST validate file is CSV and <= 10MB per lines 2521-2524, MUST validate csvType='creator_metrics', MUST call repository createSyncLog, MUST trigger async processing job, MUST return syncLogId immediately (processing continues in background). **REUSE PHASE 8 HELPERS:** The async processing job MUST reuse existing helpers from Phase 8: `parseCruvaCSV()` from csvParser.ts, `syncRepository.upsertVideo()`, `syncRepository.updatePrecomputedFields()`, `syncRepository.updateMissionProgress()`, `tierCalculationService.checkForPromotions()`, `tierCalculationService.runCheckpointEvaluation()`. This ensures manual upload produces identical results to automated daily sync.
    - **Acceptance Criteria:** Service MUST validate file per lines 2521-2524, MUST return {success: true, syncLogId} per lines 2512-2516, MUST reuse Phase 8 CSV processing helpers for consistency with automated sync

## Step 12.23: Admin Data Sync Routes
- [ ] **Task 12.23.1:** Create GET /api/admin/sync/status route
    - **Action:** Create `/app/api/admin/sync/status/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2417-2491 (GET /api/admin/sync/status), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST call dataSyncService.getSyncStatusService(clientId), MUST return 200 with DataSyncResponse
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 2431-2467

- [ ] **Task 12.23.2:** Create POST /api/admin/sync/upload route
    - **Action:** Create `/app/api/admin/sync/upload/route.ts` with POST handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2494-2557 (POST /api/admin/sync/upload), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST parse multipart form data for file and csvType, MUST call dataSyncService.uploadCsvService, MUST return 200 with {success, syncLogId, error}, MUST return 400 for invalid CSV, MUST return 413 for file > 10MB per lines 2570-2575
    - **Acceptance Criteria:** Route MUST accept multipart form data per ADMIN_API_CONTRACTS.md lines 2498-2507, MUST return success response per lines 2511-2516

- [ ] **Task 12.23.3:** Test CSV upload validation and safety
    - **Action:** Create `/tests/integration/admin/data-sync/csv-upload.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2494-2557 (POST /api/admin/sync/upload), AdminTesting.md Bug #7
    - **Implementation Guide:** MUST test 9 cases per AdminTesting.md Bug #7: (1) upload blocked when sync_logs has status='running' → 409, (2) duplicate handles in CSV → last row wins + warning returned, (3) unknown handles → skipped + returned in response, (4) wrong client's handles → skipped silently, (5) file > 10MB → 413, (6) invalid CSV format → 400, (7) partial failure → transaction rollback, (8) success returns syncLogId, (9) sync_log created with status='running' and triggered_by set
    - **Acceptance Criteria:** All 9 cases MUST pass, prevents CSV-upload-data-corruption bug (AdminTesting.md Bug #7)

- [ ] **Task 12.23.4:** Test sync status endpoint
    - **Action:** Add test cases to `/tests/integration/admin/data-sync/csv-upload.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2417-2491 (GET /api/admin/sync/status), AdminTesting.md SHOULD #2
    - **Implementation Guide:** MUST test 3 cases: (1) returns currentSync with correct status, (2) returns history limited to 10 items ordered by started_at DESC, (3) returns empty history for new client
    - **Acceptance Criteria:** All 3 cases MUST pass, history MUST be ordered correctly per lines 2480-2490

## Step 12.24: Admin Reports Repositories
- [ ] **Task 12.24.1:** Create admin reports repository file
    - **Action:** Create `/lib/repositories/admin/reports.repository.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2597-3076 (Screen 8: Reports), ARCHITECTURE.md Section 5 (Repository Layer)
    - **Acceptance Criteria:** File exists with repository class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.24.2:** Implement getRewardsSummary function
    - **Action:** Add function to reports repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2831-2915 (rewards summary query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table), lines 662-745 (commission_boost_redemptions table)
    - **Implementation Guide:** MUST use UNION ALL query for all 6 reward types per lines 2832-2914, MUST filter WHERE status='concluded' AND concluded_at BETWEEN start_date AND end_date, MUST compute total_spent differently per type: gift_card/spark_ads from value_data.amount, commission_boost from final_payout_amount, discount/physical_gift/experience → NULL
    - **Acceptance Criteria:** Query MUST return RewardsSummaryRow fields per ADMIN_API_CONTRACTS.md lines 2656-2663, total_spent sources MUST match table lines 2943-2950

- [ ] **Task 12.24.3:** Implement getCreatorActivity function
    - **Action:** Add function to reports repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2917-2940 (creator activity query), SchemaFinalv2.md lines 590-661 (redemptions table), lines 458-589 (rewards table)
    - **Implementation Guide:** MUST query redemptions GROUP BY rewards.type, MUST COUNT(id) for redemption_count, MUST COUNT(DISTINCT user_id) for unique_creators, MUST filter WHERE status='concluded' AND concluded_at BETWEEN start_date AND end_date
    - **Acceptance Criteria:** Query MUST return CreatorActivityRow fields per ADMIN_API_CONTRACTS.md lines 2680-2687

- [ ] **Task 12.24.4:** Implement getCreatorActivityTotals function
    - **Action:** Add function to reports repository
    - **References:** ADMIN_API_CONTRACTS.md lines 2932-2940 (overall totals query), SchemaFinalv2.md lines 590-661 (redemptions table)
    - **Implementation Guide:** MUST query redemptions for overall COUNT(id) and COUNT(DISTINCT user_id), MUST filter WHERE status='concluded' AND concluded_at BETWEEN start_date AND end_date
    - **Acceptance Criteria:** Query MUST return total_redemptions and total_unique_creators per ADMIN_API_CONTRACTS.md lines 2673-2676

## Step 12.25: Admin Reports Services
- [ ] **Task 12.25.1:** Create admin reports service file
    - **Action:** Create `/lib/services/admin/reports.service.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2597-3076 (Screen 8: Reports), ARCHITECTURE.md Section 5 (Service Layer)
    - **Acceptance Criteria:** File exists with service class/object pattern matching ARCHITECTURE.md Section 5

- [ ] **Task 12.25.2:** Implement computeDateRange helper function
    - **Action:** Add date range computation helper to reports service
    - **References:** ADMIN_API_CONTRACTS.md lines 2790-2828 (computeDateRange function)
    - **Implementation Guide:** MUST compute start/end dates based on preset: this_month → startOfMonth/endOfMonth, last_month → same for previous month, this_quarter → startOfQuarter/endOfQuarter, last_quarter → same for previous quarter, custom → use provided startDate/endDate, MUST generate periodLabel ("January 2025", "Q1 2025", or "Jan 1 - Jan 31, 2025")
    - **Acceptance Criteria:** Function MUST match exact logic from ADMIN_API_CONTRACTS.md lines 2792-2828

- [ ] **Task 12.25.3:** Implement formatRewardTypePlural helper function
    - **Action:** Add reward type plural formatting helper to reports service
    - **References:** ADMIN_API_CONTRACTS.md line 2658 (rewardTypeFormatted in reports)
    - **Implementation Guide:** MUST format type to plural display: gift_card → "Gift Cards", commission_boost → "Commission Boosts", spark_ads → "Spark Ads", discount → "Discounts", physical_gift → "Physical Gifts", experience → "Experiences"
    - **Acceptance Criteria:** Function MUST return plural reward type strings per example response lines 2706-2746

- [ ] **Task 12.25.4:** Implement getReportsService function
    - **Action:** Add main orchestration function to reports service
    - **References:** ADMIN_API_CONTRACTS.md lines 2605-2951 (GET /api/admin/reports)
    - **Implementation Guide:** MUST validate preset and custom date params, MUST call computeDateRange, MUST call repository getRewardsSummary and getCreatorActivity and getCreatorActivityTotals in parallel, MUST compute totalCount and totalSpent sums for RewardsSummaryReport, MUST format all *Formatted fields
    - **Acceptance Criteria:** Service MUST return complete ReportsResponse per ADMIN_API_CONTRACTS.md lines 2628-2632

- [ ] **Task 12.25.5:** Implement generateExcelReport helper function
    - **Action:** Add Excel generation helper to reports service
    - **References:** ADMIN_API_CONTRACTS.md lines 2983-3038 (Excel generation logic)
    - **Implementation Guide:** MUST use xlsx library, MUST create workbook with 2 sheets: "Rewards Summary" (columns: Reward Type, Count, Total Spent with totals row) and "Creator Activity" (columns: Reward Type, Redemptions, Unique Creators with totals row) per lines 2987-3001
    - **Acceptance Criteria:** Function MUST generate Excel buffer with exact sheet structure per ADMIN_API_CONTRACTS.md lines 2987-3037

- [ ] **Task 12.25.6:** Implement generateFilename helper function
    - **Action:** Add filename generation helper to reports service
    - **References:** ADMIN_API_CONTRACTS.md lines 3003-3011 (generateFilename function)
    - **Implementation Guide:** MUST generate filename based on dateRange: custom → "rewards-report-{startDate}-to-{endDate}.xlsx", presets → "rewards-report-{periodLabel-lowercased}.xlsx"
    - **Acceptance Criteria:** Function MUST match exact logic from ADMIN_API_CONTRACTS.md lines 3005-3010

- [ ] **Task 12.25.7:** Implement exportReportsService function
    - **Action:** Add export orchestration function to reports service
    - **References:** ADMIN_API_CONTRACTS.md lines 2954-3039 (GET /api/admin/reports/export)
    - **Implementation Guide:** MUST call getReportsService to get data, MUST call generateExcelReport to create buffer, MUST call generateFilename for Content-Disposition header
    - **Acceptance Criteria:** Service MUST return {buffer, filename, contentType} for route to send as binary response

## Step 12.26: Admin Reports Routes
- [ ] **Task 12.26.1:** Create GET /api/admin/reports route
    - **Action:** Create `/app/api/admin/reports/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2605-2951 (GET /api/admin/reports), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract preset from query params (required per line 2621), MUST extract optional startDate/endDate for custom preset, MUST call reportsService.getReportsService(clientId, preset, startDate, endDate), MUST return 200 with ReportsResponse, MUST return 400 if custom preset without dates per lines 3044-3049
    - **Acceptance Criteria:** Route MUST return exact response structure per ADMIN_API_CONTRACTS.md lines 2628-2688

- [ ] **Task 12.26.2:** Create GET /api/admin/reports/export route
    - **Action:** Create `/app/api/admin/reports/export/route.ts` with GET handler
    - **References:** ADMIN_API_CONTRACTS.md lines 2954-3039 (GET /api/admin/reports/export), ARCHITECTURE.md Section 5 (Presentation Layer)
    - **Implementation Guide:** MUST use withAdminAuth wrapper, MUST extract preset and optional startDate/endDate from query params, MUST call reportsService.exportReportsService, MUST return binary response with Content-Type 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and Content-Disposition 'attachment; filename="{filename}"' per lines 2977-2979
    - **Acceptance Criteria:** Route MUST return binary Excel file with correct headers per ADMIN_API_CONTRACTS.md lines 2976-2979

- [ ] **Task 12.26.3:** Test reports date range presets
    - **Action:** Create `/tests/integration/admin/reports/reports-generation.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2605-2951 (GET /api/admin/reports), AdminTesting.md SHOULD #10
    - **Implementation Guide:** MUST test 5 cases: (1) this_month returns correct start/end dates, (2) last_month returns correct start/end dates, (3) this_quarter returns correct start/end dates, (4) last_quarter returns correct start/end dates, (5) custom with startDate/endDate works correctly
    - **Acceptance Criteria:** All 5 preset cases MUST pass, date calculations MUST match logic per lines 2790-2828

- [ ] **Task 12.26.4:** Test reports data accuracy
    - **Action:** Add test cases to `/tests/integration/admin/reports/reports-generation.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2831-2951 (report queries), AdminTesting.md Bug #8
    - **Implementation Guide:** MUST test 4 cases: (1) rewardsSummary counts only concluded redemptions in date range, (2) creatorActivity counts unique creators correctly, (3) totalSpent calculated correctly per reward type, (4) empty date range returns zero counts not error
    - **Acceptance Criteria:** All 4 cases MUST pass, prevents report-inaccuracy bug (AdminTesting.md Bug #8)

- [ ] **Task 12.26.5:** Test reports export
    - **Action:** Add test cases to `/tests/integration/admin/reports/reports-generation.test.ts`
    - **References:** ADMIN_API_CONTRACTS.md lines 2954-3039 (GET /api/admin/reports/export), AdminTesting.md SHOULD #10
    - **Implementation Guide:** MUST test 3 cases: (1) returns binary Excel file with correct Content-Type, (2) filename matches preset pattern, (3) Excel has 2 sheets (Rewards Summary, Creator Activity)
    - **Acceptance Criteria:** All 3 cases MUST pass, Content-Type MUST be 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

## Step 12.27: Admin Cross-Cutting Tests

- [ ] **Task 12.27.1:** Test multi-tenant isolation across all admin endpoints
    - **Action:** Create `/tests/integration/admin/auth/multi-tenant-isolation.test.ts`
    - **References:** AdminTesting.md Bug #1, ARCHITECTURE.md Section 9 (Multitenancy Enforcement)
    - **Implementation Guide:** MUST test ALL 30 admin endpoints with 2 clients (A and B): for each endpoint, admin from Client A MUST NOT see/modify Client B data. Test pattern: (1) create data for both clients, (2) request as Admin A, (3) verify response contains ONLY Client A data or returns 404 for Client B IDs
    - **Acceptance Criteria:** All 30 endpoints MUST pass multi-tenant isolation, prevents data-leakage-lawsuit bug (AdminTesting.md Bug #1)

- [ ] **Task 12.27.2:** Test admin role enforcement across all admin endpoints
    - **Action:** Create `/tests/integration/admin/auth/admin-role-enforcement.test.ts`
    - **References:** AdminTesting.md Bug #2, Task 3.5.8 (requireAdmin utility)
    - **Implementation Guide:** MUST test ALL 30 admin endpoints with creator token (non-admin): each endpoint MUST return 403 FORBIDDEN. Test pattern: (1) create creator user (is_admin=false), (2) request each endpoint with creator token, (3) verify 403 response
    - **Acceptance Criteria:** All 30 endpoints MUST return 403 for non-admin users, prevents unauthorized-access bug (AdminTesting.md Bug #2)

- [ ] **Task 12.27.3:** Test audit trail integrity across all mutations
    - **Action:** Create `/tests/integration/admin/auth/audit-trail.test.ts`
    - **References:** AdminTesting.md Bug #11, SchemaFinalv2.md (audit fields: fulfilled_by, adjusted_by, selected_by, payout_sent_by)
    - **Implementation Guide:** MUST test all mutation endpoints set audit fields correctly: (1) PATCH ship/deliver sets fulfilled_by, (2) PATCH pay sets payout_sent_by, (3) POST adjustment sets adjusted_by, (4) POST select-winner sets selected_by, (5) all timestamps (*_at) set correctly
    - **Acceptance Criteria:** All audit fields MUST be set to admin's user_id, all timestamps MUST be set, prevents broken-audit-trail bug (AdminTesting.md Bug #11)

- [ ] **Task 12.27.4:** Test soft delete respected across all list endpoints
    - **Action:** Create `/tests/integration/admin/auth/soft-delete.test.ts`
    - **References:** AdminTesting.md Bug #10, SchemaFinalv2.md (deleted_at fields)
    - **Implementation Guide:** MUST test all list endpoints exclude soft-deleted records: (1) create record, (2) soft-delete (set deleted_at), (3) GET list, (4) verify deleted record NOT in response. Endpoints: /redemptions, /missions, /vip-rewards
    - **Acceptance Criteria:** All list endpoints MUST exclude records where deleted_at IS NOT NULL, prevents deleted-items-appearing bug (AdminTesting.md Bug #10)

---

# VERIFICATION GATES

These gates MUST pass before proceeding to next phase:

## Gate 1: Database Foundation Complete
- [ ] All tables exist (`supabase db diff` is empty)
- [ ] RLS enabled on all tables
- [ ] Triggers exist and fire correctly
- [ ] Seed data loads successfully

## Gate 2: Auth System Complete
- [ ] All 7 auth endpoints return 200/201 for valid requests
- [ ] Multi-tenant isolation test passes
- [ ] E2E signup flow test passes

## Gate 3: Dashboard Complete
- [ ] Dashboard endpoint returns correct data
- [ ] Featured mission logic works
- [ ] Multi-tenant test passes

## Gate 4: Missions Complete
- [ ] All 4 mission endpoints work
- [ ] Idempotent claim test passes
- [ ] State validation test passes
- [ ] Raffle participation works

## Gate 5: Rewards Complete
- [ ] All 3 reward endpoints work
- [ ] All 4 reward types can be claimed
- [ ] Commission boost auto-sync works
- [ ] Address encryption verified

## Gate 6: Automation Complete
- [ ] Daily sync cron executes successfully
- [ ] Tier calculation works
- [ ] Manual upload works
- [ ] Error alerts configured

## Gate 7: Frontend Integration Complete
- [ ] All pages toggled to real APIs
- [ ] Full user journey test passes
- [ ] No console errors

## Gate 8: Testing Complete
- [ ] Coverage ≥ 85% overall
- [ ] Coverage ≥ 90% for services/repositories
- [ ] All E2E tests pass
- [ ] CI pipeline green

## Gate 9: Final Audit Complete
- [ ] All 23 API endpoints implemented + tested
- [ ] All 9 Critical Patterns enforced + tested
- [ ] All RLS policies deployed
- [ ] All triggers deployed
- [ ] All security measures confirmed

---

# COMPLETENESS CHECKLIST

## API Endpoints (21 total)
- [ ] POST /api/auth/check-handle
- [ ] POST /api/auth/signup
- [ ] POST /api/auth/verify-otp
- [ ] POST /api/auth/resend-otp
- [ ] POST /api/auth/login
- [ ] POST /api/auth/forgot-password
- [ ] POST /api/auth/reset-password
- [ ] GET /api/dashboard
- [ ] GET /api/dashboard/featured-mission
- [ ] GET /api/missions/available
- [ ] POST /api/missions/:id/claim
- [ ] POST /api/missions/:id/participate
- [ ] GET /api/missions/history
- [ ] GET /api/rewards
- [ ] POST /api/rewards/:id/claim
- [ ] GET /api/rewards/history
- [ ] GET /api/user/payment-info
- [ ] POST /api/rewards/:id/payment-info
- [ ] GET /api/tiers
- [ ] GET /api/cron/daily-automation
- [ ] POST /api/cron/manual-upload

## Critical Patterns (9 total)
- [ ] Pattern 1: Transactional Workflows
- [ ] Pattern 2: Idempotent Operations
- [ ] Pattern 3: State Transition Validation
- [ ] Pattern 4: Auto-Sync Triggers
- [ ] Pattern 5: Status Validation
- [ ] Pattern 6: VIP Reward Lifecycle
- [ ] Pattern 7: Commission Boost State History
- [ ] Pattern 8: Multi-Tenant Query Isolation
- [ ] Pattern 9: Sensitive Data Encryption

## Database Objects
- [ ] 15+ tables created
- [ ] All indexes created
- [ ] All RLS policies deployed
- [ ] All triggers deployed
- [ ] Seed data loaded

## Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows
- [ ] Test coverage ≥ 85%
- [ ] CI/CD pipeline configured

## Security
- [ ] JWT validation on all protected routes
- [ ] Rate limiting on auth endpoints
- [ ] RLS enforced on all tables
- [ ] Sensitive data encrypted
- [ ] Secrets in environment variables

---

# END OF EXECUTION PLAN

**Status**: Ready for execution
**Last Updated**: 2025-11-21
**Version**: 1.0
