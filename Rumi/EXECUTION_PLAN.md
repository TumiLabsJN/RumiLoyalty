# RumiAI Loyalty Platform: LLM Execution Plan
# Version: 1.0
# Status: Not Started

---

## RULES OF ENGAGEMENT (For Executing LLM)

### Core Protocol
1. Execute this plan SEQUENTIALLY - do not skip tasks
2. Before EVERY task, READ the specified documentation references
3. Do NOT implement based on general knowledge - ONLY from referenced docs
4. Mark checkbox `[x]` ONLY after Acceptance Criteria verified
5. If task fails, STOP and report: Task ID + Failure reason
6. Commit after each completed Step with message: "Complete: [Step ID] - [Description]"

### Anti-Hallucination Rules
- FORBIDDEN: Implementing features not in API_CONTRACTS.md
- FORBIDDEN: Assuming schema structure without reading SchemaFinalv2.md
- FORBIDDEN: Skipping RLS policies
- FORBIDDEN: Omitting client_id in queries
- REQUIRED: Read documentation section before implementation
- REQUIRED: Verify against API contracts before marking complete

### Session Management
**Session Start:**
1. Run `/context` to check token usage
2. Find next unchecked `[ ]` task
3. Read documentation for that task
4. Execute task
5. Verify Acceptance Criteria
6. Mark `[x]` and commit

**Session End:**
1. Mark current progress
2. Commit all changes
3. Note any blockers

---

## GLOBAL PHASE CHECKLIST

- [ ] Phase 0: Documentation Review & Environment Setup
- [ ] Phase 1: Database Foundation (Schema, RLS, Triggers, Seeds)
- [ ] Phase 2: Shared Libraries (Types, Clients, Utils)
- [ ] Phase 3: Authentication System
- [ ] Phase 4: Dashboard APIs
- [ ] Phase 5: Missions System
- [ ] Phase 6: Rewards System
- [ ] Phase 7: History & Tiers APIs
- [ ] Phase 8: Automation & Cron Jobs
- [ ] Phase 9: Frontend Integration (MSW → Real APIs)
- [ ] Phase 10: Testing & CI/CD
- [ ] Phase 11: Final Audit & Verification

---

# PHASE 0: DOCUMENTATION REVIEW & ENVIRONMENT SETUP

**Objective:** Establish foundation and confirm complete understanding of requirements before writing any code.

## Step 0.1: Documentation Audit
- [ ] **Task 0.1.1:** Read Loyalty.md (3,071 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/Loyalty.md`
    - **Focus:** Lines 2019-2182 (9 Critical Patterns), Lines 374-2017 (10 Data Flows)
    - **Acceptance Criteria:** Create summary document listing all 9 patterns and 10 flows

- [ ] **Task 0.1.2:** Read SchemaFinalv2.md (996 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/SchemaFinalv2.md`
    - **Focus:** All table definitions, RLS policies (lines 711-790), triggers
    - **Acceptance Criteria:** Create table dependency graph showing FK relationships

- [ ] **Task 0.1.3:** Read MissionsRewardsFlows.md (527 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/MissionsRewardsFlows.md`
    - **Focus:** 6 mission types, 6 reward types, state machines
    - **Acceptance Criteria:** Document all valid state transitions

- [ ] **Task 0.1.4:** Read ARCHITECTURE.md (1,433 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/ARCHITECTURE.md`
    - **Focus:** 3-layer pattern, Section 9 (security), folder structure
    - **Acceptance Criteria:** Confirm understanding of repository → service → route pattern

- [ ] **Task 0.1.5:** Read API_CONTRACTS.md (4,906 lines)
    - **Path:** `/home/jorge/Loyalty/Rumi/API_CONTRACTS.md`
    - **Focus:** All 23 endpoints with request/response schemas
    - **Acceptance Criteria:** Create checklist of all 23 endpoints

## Step 0.2: Environment Setup
- [ ] **Task 0.2.1:** Initialize Supabase project
    - **Command:** `supabase init`
    - **References:** Loyalty.md lines 38-40 (Supabase PostgreSQL, Auth, Storage)
    - **Acceptance Criteria:** `/supabase` directory exists

- [ ] **Task 0.2.2a:** Extract Tech Stack dependencies from documentation
    - **Action:** Read Loyalty.md lines 17-49 (Tech Stack section)
    - **Action:** Extract ALL npm packages from Frontend subsection (lines 19-26) and Backend subsection (lines 28-36)
    - **Action:** Create comprehensive list of packages to install
    - **References:** `/home/jorge/Loyalty/Rumi/Loyalty.md` lines 17-49
    - **Acceptance Criteria:** List includes ~15+ packages: Frontend (react-hook-form, lucide-react, date-fns, tailwindcss, shadcn/ui), Backend (@supabase/supabase-js, puppeteer, csv-parse, resend, googleapis, luxon), Development (zod, vitest, playwright, @upstash/ratelimit), Dev Tools (eslint, prettier)

- [ ] **Task 0.2.2b:** Install all dependencies
    - **Command:** `npm install [all-packages-from-task-0.2.2a]`
    - **Acceptance Criteria:** All packages from Tech Stack documented in `package.json`
    - **Verification:** Run `npm list --depth=0` to confirm all installed

- [ ] **Task 0.2.2c:** Verify Node.js version requirement
    - **Command:** `node --version`
    - **References:** Loyalty.md line 44 (Node.js 20+ LTS requirement)
    - **Acceptance Criteria:** Output shows v20.x.x or higher

- [ ] **Task 0.2.3:** Configure environment variables
    - **Action:** Create `.env.local` with: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY
    - **References:** Loyalty.md line 2172 (ENCRYPTION_KEY requirement), Supabase documentation for connection vars
    - **Acceptance Criteria:** All required env vars set, `.env.local` in `.gitignore`

- [ ] **Task 0.2.4:** Configure ESLint and Prettier
    - **Action:** Create `.eslintrc.json` and `.prettierrc` configuration files
    - **References:** Loyalty.md line 47 (Development Tools)
    - **Acceptance Criteria:** ESLint and Prettier configured, can run `npm run lint` successfully

- [ ] **Task 0.2.5:** Configure Supabase Storage for logo uploads
    - **Action:** Create storage bucket for client logos (public read, admin write, 2MB max)
    - **References:** Loyalty.md lines 40, 103-109 (Supabase Storage section)
    - **Acceptance Criteria:** Bucket created named 'logos', RLS policy allows public read

- [ ] **Task 0.2.6:** Link Supabase project
    - **Command:** `supabase link --project-ref [your-project-ref]`
    - **Acceptance Criteria:** Command succeeds with exit code 0

---

# PHASE 1: DATABASE FOUNDATION

**Objective:** Create complete, verified database schema with RLS, triggers, and seed data.

## Step 1.1: Schema Migration - Core Tables
- [ ] **Task 1.1.1:** Create initial migration file
    - **Command:** `supabase migration new initial_schema`
    - **References:** SchemaFinalv2.md
    - **Acceptance Criteria:** New empty migration file in `/supabase/migrations/`

- [ ] **Task 1.1.2:** Add ENUM types to migration
    - **Action:** Add all CREATE TYPE statements for mission_type, mission_status, reward_type, etc.
    - **References:** SchemaFinalv2.md lines 1-50 (enum definitions)
    - **Acceptance Criteria:** Migration contains all enum types

- [ ] **Task 1.1.3:** Add `clients` table
    - **Action:** Add CREATE TABLE for clients with uuid primary key
    - **References:** SchemaFinalv2.md (clients table definition)
    - **Acceptance Criteria:** Table definition matches schema exactly

- [ ] **Task 1.1.4:** Add `vip_tiers` table
    - **Action:** Add CREATE TABLE with FK to clients
    - **References:** SchemaFinalv2.md (vip_tiers table)
    - **Acceptance Criteria:** FK constraint to clients.id present

- [ ] **Task 1.1.5:** Add `users` table
    - **Action:** Add CREATE TABLE with FKs to clients, vip_tiers, referral parent
    - **References:** SchemaFinalv2.md (users table)
    - **Acceptance Criteria:** All FKs defined, encrypted_email and encrypted_phone_number columns present

- [ ] **Task 1.1.5a:** Add 16 precomputed fields to `users` table
    - **Action:** Add columns for dashboard/leaderboard performance optimization: leaderboard_rank (integer), total_sales (numeric), total_units (integer), manual_adjustments_total (numeric), manual_adjustments_units (integer), checkpoint_sales_current (numeric), checkpoint_units_current (integer), projected_tier_at_checkpoint (uuid), checkpoint_videos_posted (integer), checkpoint_total_views (bigint), checkpoint_total_likes (bigint), checkpoint_total_comments (bigint), next_tier_name (varchar), next_tier_threshold (numeric), next_tier_threshold_units (integer), checkpoint_progress_updated_at (timestamp)
    - **References:** ARCHITECTURE.md Section 3.1 (Precomputed Fields, lines 120-152), SchemaFinalv2.md (users table)
    - **Acceptance Criteria:** All 16 precomputed fields added with appropriate data types and NULL defaults, enables 5-6x faster dashboard queries per ARCHITECTURE.md performance targets

- [ ] **Task 1.1.6:** Add `videos` table
    - **Action:** Add CREATE TABLE with FK to clients
    - **References:** SchemaFinalv2.md (videos table)
    - **Acceptance Criteria:** Unique constraint on (client_id, video_link)

- [ ] **Task 1.1.7:** Add `sales_adjustments` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, videos
    - **References:** SchemaFinalv2.md (sales_adjustments table)
    - **Acceptance Criteria:** All FKs present

- [ ] **Task 1.1.8:** Add `tier_checkpoints` table
    - **Action:** Add CREATE TABLE with FK to clients
    - **References:** SchemaFinalv2.md (tier_checkpoints table)
    - **Acceptance Criteria:** Unique constraint on (client_id, tier_name)

- [ ] **Task 1.1.9:** Add `handle_changes` table
    - **Action:** Add CREATE TABLE with FKs to clients, users
    - **References:** SchemaFinalv2.md (handle_changes table)
    - **Acceptance Criteria:** All columns match schema

## Step 1.2: Schema Migration - Missions Tables
- [ ] **Task 1.2.1:** Add `missions` table
    - **Action:** Add CREATE TABLE with FK to clients, reward FK
    - **References:** SchemaFinalv2.md (missions table)
    - **Acceptance Criteria:** mission_type enum, raffle_config jsonb present

- [ ] **Task 1.2.2:** Add `mission_progress` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, missions
    - **References:** SchemaFinalv2.md (mission_progress table)
    - **Acceptance Criteria:** Unique constraint on (client_id, user_id, mission_id)

- [ ] **Task 1.2.3:** Add `raffle_participations` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, missions
    - **References:** SchemaFinalv2.md (raffle_participations table)
    - **Acceptance Criteria:** winner boolean default false

## Step 1.3: Schema Migration - Rewards Tables
- [ ] **Task 1.3.1:** Add `rewards` table
    - **Action:** Add CREATE TABLE with FK to clients, tier restrictions
    - **References:** SchemaFinalv2.md (rewards table)
    - **Acceptance Criteria:** reward_type enum, max_uses_per_user, points_cost present

- [ ] **Task 1.3.2:** Add `redemptions` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, rewards
    - **References:** SchemaFinalv2.md (redemptions table)
    - **Acceptance Criteria:** redemption_status enum, redemption_date

- [ ] **Task 1.3.3:** Add `commission_boost_states` table
    - **Action:** Add CREATE TABLE with FKs to clients, users, redemptions
    - **References:** SchemaFinalv2.md (commission_boost_states table)
    - **Acceptance Criteria:** boost_percentage, is_active boolean

- [ ] **Task 1.3.4:** Add `commission_boost_history` table
    - **Action:** Add CREATE TABLE tracking boost activation/deactivation
    - **References:** SchemaFinalv2.md (commission_boost_history table)
    - **Acceptance Criteria:** action enum (activated/deactivated), created_at

- [ ] **Task 1.3.5:** Add `physical_gift_states` table
    - **Action:** Add CREATE TABLE with shipping info
    - **References:** SchemaFinalv2.md (physical_gift_states table)
    - **Acceptance Criteria:** encrypted_address, shipping_status enum

- [ ] **Task 1.3.6:** Add `physical_gift_tracking` table
    - **Action:** Add CREATE TABLE for shipment history
    - **References:** SchemaFinalv2.md (physical_gift_tracking table)
    - **Acceptance Criteria:** tracking_number, carrier fields

## Step 1.4: Indexes
- [ ] **Task 1.4.1:** Add all indexes to migration file
    - **Action:** Add CREATE INDEX statements for all tables
    - **References:** SchemaFinalv2.md lines 333-450 (indexes section)
    - **Acceptance Criteria:** Index on client_id for every multi-tenant table, performance indexes added

- [ ] **Task 1.4.2:** Add indexes for precomputed fields
    - **Action:** Add CREATE INDEX statements for leaderboard_rank, total_sales, total_units on users table
    - **References:** ARCHITECTURE.md Section 3.3 (line 277 - Performance optimization indexes)
    - **Acceptance Criteria:** Indexes created: idx_users_leaderboard_rank, idx_users_total_sales, idx_users_total_units for optimized dashboard/leaderboard queries

## Step 1.5: RLS Policies
- [ ] **Task 1.5.1:** Enable RLS on all tables
    - **Action:** Add `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;` for all tables
    - **References:** SchemaFinalv2.md lines 711-790 (RLS section)
    - **Acceptance Criteria:** RLS enabled on all tables

- [ ] **Task 1.5.2:** Add creator policies
    - **Action:** Add CREATE POLICY for SELECT/INSERT/UPDATE with client_id check
    - **References:** SchemaFinalv2.md RLS policies, Loyalty.md Pattern 8 (Multi-Tenant Isolation)
    - **Acceptance Criteria:** All policies include `client_id = auth.jwt() ->> 'client_id'` check

- [ ] **Task 1.5.3:** Add admin policies
    - **Action:** Add CREATE POLICY for admin role with full access
    - **References:** SchemaFinalv2.md RLS policies
    - **Acceptance Criteria:** Admin policies allow bypass with role check

## Step 1.6: Database Triggers
- [ ] **Task 1.6.1:** Create trigger function for commission boost auto-sync
    - **Action:** Add CREATE FUNCTION to auto-sync users.current_commission_boost from commission_boost_states
    - **References:** Loyalty.md Pattern 4 (Auto-Sync Triggers), SchemaFinalv2.md triggers section
    - **Acceptance Criteria:** Function updates users.current_commission_boost when boost activated/deactivated

- [ ] **Task 1.6.2:** Create trigger on commission_boost_states
    - **Action:** Add CREATE TRIGGER AFTER INSERT/UPDATE on commission_boost_states
    - **References:** SchemaFinalv2.md triggers
    - **Acceptance Criteria:** Trigger calls auto-sync function

- [ ] **Task 1.6.3:** Create trigger function for commission boost history
    - **Action:** Add CREATE FUNCTION to log activation/deactivation to commission_boost_history
    - **References:** Loyalty.md Pattern 7 (Commission Boost History)
    - **Acceptance Criteria:** Function inserts record with action enum

- [ ] **Task 1.6.4:** Create trigger for boost history logging
    - **Action:** Add CREATE TRIGGER AFTER INSERT/UPDATE on commission_boost_states
    - **References:** SchemaFinalv2.md triggers
    - **Acceptance Criteria:** History logged when is_active changes

- [ ] **Task 1.6.5:** Create state validation triggers
    - **Action:** Add CREATE FUNCTION to validate mission/reward state transitions
    - **References:** Loyalty.md Pattern 3 (State Transition Validation), MissionsRewardsFlows.md
    - **Acceptance Criteria:** Prevents invalid transitions (e.g., pending → claimed without in_progress)

## Step 1.7: Deploy and Verify Schema
- [ ] **Task 1.7.1:** Apply migration to local database
    - **Command:** `supabase db push`
    - **Acceptance Criteria:** Command exits with code 0, no errors

- [ ] **Task 1.7.2:** Verify schema integrity
    - **Command:** `supabase db diff --schema-only`
    - **Acceptance Criteria:** Command output is empty (no drift)

- [ ] **Task 1.7.3:** Verify RLS enabled
    - **Command:** `psql -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"`
    - **Acceptance Criteria:** Query returns 0 rows (all tables have RLS)

- [ ] **Task 1.7.4:** Verify triggers exist
    - **Command:** `psql -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE '%commission_boost%' OR tgname LIKE '%state_validation%';"`
    - **Acceptance Criteria:** All expected triggers listed

## Step 1.8: Seed Data
- [ ] **Task 1.8.1:** Create seed script file
    - **Action:** Create `/supabase/seed.sql`
    - **Acceptance Criteria:** File exists

- [ ] **Task 1.8.2:** Seed base client
    - **Action:** Add INSERT INTO clients with test client
    - **References:** Loyalty.md (Admin Config System)
    - **Acceptance Criteria:** Client with known UUID inserted

- [ ] **Task 1.8.3:** Seed VIP tiers
    - **Action:** Add INSERT INTO vip_tiers with Bronze, Silver, Gold, Platinum tiers
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers tier structure and tier colors), Loyalty.md Core Features (VIP Tiers section)
    - **Implementation Guide:** MUST create 4 tiers with exact naming and properties from API spec (lines 5577-5579, 6684-6840): Tier 1 Bronze (tier_level=1, tier_color=#CD7F32, min_sales=0, commission_rate=10), Tier 2 Silver (tier_level=2, tier_color=#94a3b8, min_sales=1000, commission_rate=12), Tier 3 Gold (tier_level=3, tier_color=#F59E0B, min_sales=3000, commission_rate=15), Tier 4 Platinum (tier_level=4, tier_color=#818CF8, min_sales=5000, commission_rate=20). Tier names MUST match API response exactly: "Bronze", "Silver", "Gold", "Platinum" (not Fan/Supporter/VIP/Super Fan)
    - **Acceptance Criteria:** All 4 tiers inserted with tier_level 1-4, tier_color hex codes matching API spec (Bronze=#CD7F32, Silver=#94a3b8, Gold=#F59E0B, Platinum=#818CF8), min_sales thresholds (0, 1000, 3000, 5000), commission_rate percentages (10, 12, 15, 20), names exactly "Bronze", "Silver", "Gold", "Platinum"

- [ ] **Task 1.8.4:** Seed test users
    - **Action:** Add INSERT INTO users with 2-3 test creators at different tiers
    - **References:** Loyalty.md
    - **Acceptance Criteria:** Users have different tier_ids, valid handles

- [ ] **Task 1.8.5:** Seed test missions
    - **Action:** Add INSERT INTO missions with samples of each type (instant, daily, weekly, monthly, manual, raffle)
    - **References:** MissionsRewardsFlows.md (6 mission types)
    - **Acceptance Criteria:** At least one mission of each type

- [ ] **Task 1.8.6:** Seed test rewards
    - **Action:** Add INSERT INTO rewards with samples of each type (instant, scheduled, physical, commission boost)
    - **References:** MissionsRewardsFlows.md (reward types)
    - **Acceptance Criteria:** Rewards with different points_costs, tier restrictions

- [ ] **Task 1.8.7:** Run seed script
    - **Command:** `supabase db seed`
    - **Acceptance Criteria:** Script executes successfully

---

# PHASE 2: SHARED LIBRARIES

**Objective:** Build foundational code shared across all features.

## Step 2.1: TypeScript Types
- [ ] **Task 2.1.1:** Generate Supabase types
    - **Command:** `supabase gen types typescript --local > lib/types/database.ts`
    - **References:** Loyalty.md lines 38-40 (Supabase PostgreSQL), Supabase CLI documentation for type generation
    - **Acceptance Criteria:** File contains all table types

- [ ] **Task 2.1.2:** Create enums file
    - **Action:** Create `/lib/types/enums.ts` with all enum types
    - **References:** SchemaFinalv2.md (enum definitions)
    - **Acceptance Criteria:** MissionType, MissionStatus, RewardType, RedemptionStatus exported

- [ ] **Task 2.1.3:** Create API types file
    - **Action:** Create `/lib/types/api.ts` with request/response types
    - **References:** API_CONTRACTS.md (all endpoints)
    - **Acceptance Criteria:** Type for each API endpoint's request body and response

## Step 2.2: Supabase Clients
- [ ] **Task 2.2.1:** Create server client
    - **Action:** Create `/lib/supabase/server-client.ts` using `@supabase/ssr` package with cookies for Next.js App Router
    - **References:** Supabase documentation for Next.js App Router server client setup
    - **Implementation Guide:** Use `createServerClient` from `@supabase/ssr`, pass `cookies()` from `next/headers`, use SUPABASE_URL and SUPABASE_ANON_KEY
    - **Acceptance Criteria:** Client uses anon key, respects RLS, works in server components and API routes

- [ ] **Task 2.2.2:** Create admin client
    - **Action:** Create `/lib/supabase/admin-client.ts` using `createClient` from `@supabase/supabase-js` with service role key
    - **References:** Supabase documentation for admin/service role client
    - **Implementation Guide:** Use SUPABASE_SERVICE_ROLE_KEY instead of anon key, bypasses RLS
    - **Acceptance Criteria:** Client bypasses RLS, MUST only be used in cron jobs and admin operations, never in user-facing routes

## Step 2.3: Utility Functions
- [ ] **Task 2.3.1:** Create auth utility
    - **Action:** Create `/lib/utils/auth.ts` with getUserFromRequest, validateClientId
    - **References:** ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137), Section 10 (Authorization & Security Checklists, lines 1142-1415)
    - **Acceptance Criteria:** Functions extract user from JWT, validate client_id presence, follow security patterns from Section 10

- [ ] **Task 2.3.2:** Create encryption utility
    - **Action:** Create `/lib/utils/encryption.ts` with encrypt/decrypt functions using AES-256-GCM
    - **References:** Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Acceptance Criteria:** Encrypt/decrypt functions work, use ENCRYPTION_KEY from env

- [ ] **Task 2.3.3:** Create data transformation utility
    - **Action:** Create `/lib/utils/transformers.ts` with functions for snake_case → camelCase conversion and special case transformations
    - **References:** ARCHITECTURE.md Section 7 (Data Transformation Conventions, lines 954-1024), API_CONTRACTS.md (all response schemas)
    - **Implementation Guide:** Include `transformToCamelCase()` for general field name conversion, `transformDurationMinutesToDays()` for discount duration fields, `transformNestedJson()` for JSONB columns, ensure encrypted fields are handled per lines 1008-1017
    - **Acceptance Criteria:** MUST transform all snake_case database fields to camelCase for API responses, MUST handle special cases (duration_minutes → durationDays, nested JSON keys, encrypted fields), follows Section 7 transformation patterns

- [ ] **Task 2.3.4:** Add transformation tests
    - **Action:** Create `/tests/unit/utils/transformers.test.ts` with test cases for all transformation patterns
    - **References:** ARCHITECTURE.md Section 7 (lines 960-1017 for transformation examples)
    - **Acceptance Criteria:** Tests cover snake_case → camelCase conversion, discount duration transformation (10080 minutes → 7 days), nested JSON transformations, encrypted field handling

- [ ] **Task 2.3.5:** Create validation utility
    - **Action:** Create `/lib/utils/validation.ts` with Zod schemas for common validations
    - **References:** API_CONTRACTS.md (request schemas)
    - **Acceptance Criteria:** Schemas for email, handle, UUID formats

- [ ] **Task 2.3.6:** Create error handling utility
    - **Action:** Create `/lib/utils/errors.ts` with AppError class and error response formatter
    - **References:** API_CONTRACTS.md (error responses)
    - **Acceptance Criteria:** Standard error format matching API contracts

---

# PHASE 3: AUTHENTICATION SYSTEM

**Objective:** Implement complete auth flow with multi-tenant isolation.

## Step 3.1: Auth Repositories
- [ ] **Task 3.1.1:** Create user repository file
    - **Action:** Create `/lib/repositories/userRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938 for file naming)
    - **Acceptance Criteria:** File exists with repository object pattern matching Section 5 examples

- [ ] **Task 3.1.2:** Implement findByHandle function
    - **Action:** Add function with signature `findByHandle(clientId: string, handle: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 8 (Multi-Tenant Query Isolation), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9

- [ ] **Task 3.1.3:** Implement findByEmail function
    - **Action:** Add function with signature `findByEmail(clientId: string, email: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 9 (Sensitive Data Encryption), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST decrypt encrypted_email for comparison (Section 9 checklist item 6), MUST filter by client_id (Section 9 Critical Rule #1)

- [ ] **Task 3.1.4:** Implement create function
    - **Action:** Add function to insert new user with encrypted fields
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 9 (Sensitive Data Encryption), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST encrypt email/phone before INSERT (Section 9 checklist item 6), MUST validate client_id is provided (Section 9 Critical Rule #2), return created user

- [ ] **Task 3.1.5:** Implement updateLastLogin function
    - **Action:** Add function to update last_login_at timestamp for user
    - **References:** SchemaFinalv2.md (users table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id AND user_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5)

- [ ] **Task 3.1.6:** Create OTP repository file
    - **Action:** Create `/lib/repositories/otpRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 3.1.7:** Implement OTP CRUD functions
    - **Action:** Add create, findValid, markUsed, deleteExpired functions for OTP fields on users table
    - **References:** SchemaFinalv2.md (users table otp fields), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), functions enforce expiration check and single-use, UPDATE operations MUST verify count > 0 (Section 9 checklist item 4)

- [ ] **Task 3.1.8:** Create client repository file
    - **Action:** Create `/lib/repositories/clientRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 3.1.9:** Implement findById function
    - **Action:** Add function to fetch client by UUID
    - **References:** SchemaFinalv2.md (clients table)
    - **Acceptance Criteria:** Queries clients table (no client_id filter needed - this IS the tenant table per Section 9 exception), returns client or null

## Step 3.2: Auth Services
- [ ] **Task 3.2.1:** Create auth service file
    - **Action:** Create `/lib/services/authService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943 for function naming)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns (orchestrates repositories, implements business rules, no direct DB access)

- [ ] **Task 3.2.2:** Implement checkHandle function
    - **Action:** Add function calling userRepository.findByHandle
    - **References:** API_CONTRACTS.md /auth/check-handle, Loyalty.md Flow 3
    - **Acceptance Criteria:** Returns { available: boolean }

- [ ] **Task 3.2.3:** Implement initiateSignup function
    - **Action:** Add function with transaction for user creation + OTP generation
    - **References:** Loyalty.md Flow 3 (Signup), Pattern 1 (Transactional Workflows)
    - **Acceptance Criteria:** MUST use transaction, check handle uniqueness, send OTP via Resend

- [ ] **Task 3.2.4:** Implement verifyOTP function
    - **Action:** Add function to validate OTP and create session
    - **References:** Loyalty.md Flow 4 (OTP Verification), Pattern 2 (Idempotent Operations)
    - **Acceptance Criteria:** MUST mark OTP as used, create Supabase session, update last_login_at

- [ ] **Task 3.2.5:** Implement resendOTP function
    - **Action:** Add function to generate new OTP
    - **References:** Loyalty.md Flow 4, Pattern 2
    - **Acceptance Criteria:** MUST be idempotent (rate limit), invalidate previous OTPs

- [ ] **Task 3.2.6:** Implement login function
    - **Action:** Add function for existing user login
    - **References:** Loyalty.md Flow 5 (Login), API_CONTRACTS.md /auth/login
    - **Acceptance Criteria:** Validate credentials, generate OTP, send email

- [ ] **Task 3.2.7:** Implement forgotPassword function
    - **Action:** Add function to initiate password reset
    - **References:** Loyalty.md Flow 6 (Password Reset)
    - **Acceptance Criteria:** Generate reset token, send email

- [ ] **Task 3.2.8:** Implement resetPassword function
    - **Action:** Add function to complete password reset
    - **References:** Loyalty.md Flow 6
    - **Acceptance Criteria:** Validate token, update password, invalidate token

## Step 3.3: Auth API Routes
- [ ] **Task 3.3.1:** Create check-handle route
    - **Action:** Create `/app/api/auth/check-handle/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 34-184 (POST /api/auth/check-handle), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 3-scenario routing logic (lines 104-137): (A) exists+email→login, (B) exists+no email→signup, (C) not found→signup. Normalize handle with @ prefix (line 108-111). Validate handle regex `^[a-zA-Z0-9_.]{1,30}$` (line 168). Return errors: HANDLE_REQUIRED, INVALID_HANDLE, HANDLE_TOO_LONG (lines 142-164)
    - **Acceptance Criteria:** MUST return `{ exists: boolean, has_email: boolean, route: 'signup'|'login', handle: string }` per lines 56-62, implements all 3 routing scenarios per lines 123-136, validates handle format per Section 10.3 line 168, returns 200 for valid requests or 400 for validation errors, follows route pattern from Section 5

- [ ] **Task 3.3.2:** Create signup route
    - **Action:** Create `/app/api/auth/signup/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 189-437 (POST /api/auth/signup), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.4 (Validation Checklist Template, lines 1396-1401)
    - **Implementation Guide:** MUST implement 8-step workflow (lines 247-356): (1) validate input (email format line 252, password 8-128 chars lines 257-262, agreedToTerms line 265), (2) check existing email line 271-276, (3) hash password with bcrypt rounds=10 line 281, (4) create user with client_id + default tier 'tier_1' + terms version '2025-01-18' lines 286-308, (5) generate 6-digit OTP line 312-315, (6) store OTP in otp_codes table expires 5 min lines 319-336, (7) send OTP email via Resend lines 340-346, (8) set HTTP-only cookie lines 350-355. Return errors: EMAIL_ALREADY_EXISTS, INVALID_EMAIL, PASSWORD_TOO_SHORT, PASSWORD_TOO_LONG, TERMS_NOT_ACCEPTED, OTP_SEND_FAILED (lines 360-406)
    - **Acceptance Criteria:** MUST return `{ success: boolean, otpSent: boolean, sessionId: string, userId: string }` per lines 214-219, implements all 8 steps of signup workflow per lines 247-356, validates per Section 10.4 checklist, hashes password with bcrypt rounds=10 (line 281), stores hashed OTP in otp_codes table (line 319-336), sends email via Resend (line 340-346), sets HTTP-only secure cookie with Max-Age=300 (line 353), returns 201 for success or 400/500 for errors, follows route pattern from Section 5

- [ ] **Task 3.3.3:** Create verify-otp route
    - **Action:** Create `/app/api/auth/verify-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 442-722 (POST /api/auth/verify-otp), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 11-step workflow (lines 495-634): (1) get session ID from otp_session HTTP-only cookie line 498-503, (2) validate code format 6 digits line 508-511, (3) query OTP record by session_id + used=false lines 515-527, (4) check OTP exists and not used lines 530-543, (5) check expiration 5 minutes lines 547-553, (6) check max 3 attempts lines 557-570, (7) verify OTP with bcrypt compare lines 574-596 incrementing attempts on failure, (8) mark OTP as used lines 600-603, (9) update users.email_verified=true lines 607-611, (10) create authenticated session with Supabase Auth lines 614-621, (11) set auth_token cookie Max-Age=2592000 (30 days) and clear otp_session cookie lines 625-633. Return errors: INVALID_CODE_FORMAT, INVALID_OTP (with attemptsRemaining), OTP_EXPIRED, OTP_ALREADY_USED, MAX_ATTEMPTS_EXCEEDED, SESSION_NOT_FOUND, INVALID_SESSION (lines 638-693)
    - **Acceptance Criteria:** MUST return `{ success: boolean, verified: boolean, userId: string, sessionToken: string }` per lines 465-470, implements all 11 steps of OTP verification workflow per lines 495-634, reads otp_session cookie (line 499), validates 6-digit format (line 509), queries otp_codes by session_id + used=false (line 524-526), checks expiration and max 3 attempts (lines 548, 558), verifies with bcrypt compare (line 576), increments attempts on failure (line 583), marks used=true on success (line 602), updates email_verified=true (line 609), creates Supabase Auth session (line 616-621), sets auth_token HTTP-only cookie Max-Age=2592000 (line 629), clears otp_session cookie Max-Age=0 (line 630), returns 200 for success or 400 for errors, follows route pattern from Section 5

- [ ] **Task 3.3.4:** Create resend-otp route
    - **Action:** Create `/app/api/auth/resend-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 722-939 (POST /api/auth/resend-otp), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Defense in Depth Pattern, lines 1371-1380)
    - **Implementation Guide:** MUST implement 10-step workflow (lines 774-877): (1) get session ID from otp_session HTTP-only cookie lines 777-782, (2) query existing OTP record by session_id lines 786-794, (3) check session exists lines 797-803, (4) rate limiting check min 30 seconds since created_at lines 807-817, (5) get user email lines 821-822, (6) invalidate old OTP mark used=true lines 826-829, (7) generate new 6-digit OTP with bcrypt rounds=10 lines 833-836, (8) create new OTP record reusing same session_id expires 5 min lines 840-857, (9) send new OTP email via Resend lines 861-866, (10) return response with expiresAt ISO timestamp and remainingSeconds=300 lines 870-876. Return errors: SESSION_NOT_FOUND, INVALID_SESSION, RESEND_TOO_SOON (429), EMAIL_SEND_FAILED (lines 881-911). Security: max 5 resend requests per session (line 920)
    - **Acceptance Criteria:** MUST return `{ success: boolean, sent: boolean, expiresAt: string, remainingSeconds: number }` per lines 746-751, implements all 10 steps of resend workflow per lines 774-877, reads otp_session cookie (line 778), queries existing OTP record (line 792), enforces min 30 seconds wait time between resends (line 809), marks old OTP used=true (line 828), generates new 6-digit OTP with bcrypt rounds=10 (line 835), creates new OTP record with same session_id (line 851), expires in 5 minutes (line 836), sends email via Resend (line 862-865), returns expiresAt as ISO timestamp (line 874) and remainingSeconds=300 (line 875), returns 200 for success or 429 for RESEND_TOO_SOON or 400/500 for other errors, follows route pattern from Section 5

- [ ] **Task 3.3.5:** Create login route
    - **Action:** Create `/app/api/auth/login/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 946-1118 (POST /api/auth/login with error responses), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 5-step workflow (lines 1003-1056): (1) find user by handle lines 1006-1015, return 401 INVALID_CREDENTIALS if not found (line 1037 + 1113 - don't reveal "user not found"), (2) verify password with bcrypt.compare lines 1018-1019 and 1040-1042, return 401 INVALID_CREDENTIALS if invalid (line 1113 same error for both cases), rate limit 5 failed attempts in 15 minutes return 429 ACCOUNT_LOCKED (lines 1042, 1091-1096, 1112), (3) check email_verified=true lines 1044-1046, return 403 EMAIL_NOT_VERIFIED if false (lines 1083-1088), (4) create authenticated session with JWT token payload {userId, handle, email, issued_at, expires_at} lines 1048-1051 and 1116, (5) set HTTP-only cookie auth-token with 7 days expiration (lines 1028, 1115), Secure + SameSite=Strict flags (line 1027, 1111), return response lines 1053-1055. Return errors: MISSING_FIELDS (400), INVALID_HANDLE (400), INVALID_CREDENTIALS (401), EMAIL_NOT_VERIFIED (403), ACCOUNT_LOCKED (429), INTERNAL_ERROR (500) (lines 1059-1105). Log login attempts for security auditing (line 1117)
    - **Acceptance Criteria:** MUST return `{ success: boolean, userId: string, sessionToken: string }` per lines 987-991, implements all 5 steps of login workflow per lines 1003-1056, validates handle format starts with @ 3-30 chars (line 1071), returns 400 MISSING_FIELDS if handle or password missing (line 1062-1064), queries users by handle (line 1014), verifies password with bcrypt.compare (lines 1018-1019, 1109), returns 401 INVALID_CREDENTIALS for invalid handle OR password with SAME error message for both (lines 1037, 1041, 1113 - no user enumeration), rate limits 5 failed attempts per handle in 15 minutes (line 1112), returns 429 ACCOUNT_LOCKED after 5 failed attempts (lines 1091-1096), checks email_verified=true (line 1045, 1114), returns 403 EMAIL_NOT_VERIFIED if false (lines 1083-1088), creates JWT token with payload {userId, handle, email, issued_at, expires_at} (lines 1049, 1116), sets HTTP-only cookie auth-token with Secure + SameSite=Strict + 7 days expiration (lines 1027-1028, 1110-1111, 1115), logs login attempts for auditing (line 1117), returns 200 for success or 400/401/403/429/500 for errors, follows route pattern from Section 5

- [ ] **Task 3.3.6:** Create forgot-password route
    - **Action:** Create `/app/api/auth/forgot-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 1462-1614 (POST /api/auth/forgot-password), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 6-step workflow (lines 1522-1556): (1) lookup user by email OR handle (identifier field accepts either) lines 1524-1527 and 1474, (2) CRITICAL anti-enumeration: if user not found still return success 200 but don't send email (prevent account enumeration) lines 1529-1530 and 1576, (3) if user found generate secure token with crypto.randomBytes(32).toString('base64url') 44 chars lines 1532-1534, (4) hash token with bcrypt before storing in password_reset_tokens table (user_id, token_hash, expires_at NOW + 15 minutes) lines 1536-1538 and 1578-1579, (5) send email via SendGrid/AWS SES with reset link https://app.com/login/resetpw?token={token} expires in 15 minutes lines 1540-1551, (6) mask email for response (first 2 chars + **** + @ + domain) lines 1553-1555. Return errors: MISSING_IDENTIFIER (400), INVALID_IDENTIFIER (400), TOO_MANY_REQUESTS (429 - 3 requests per hour), EMAIL_SEND_FAILED (500) (lines 1560-1573). Security: rate limit 3 requests per hour per identifier (lines 1564, 1577), token stored as bcrypt hash not plaintext (line 1578), one-time use marked as used_at after reset (line 1580), HTTPS only links (line 1581). Database: requires password_reset_tokens table with schema (id, user_id, token_hash, created_at, expires_at, used_at, ip_address) lines 1589-1602
    - **Acceptance Criteria:** MUST return `{ sent: boolean, emailHint: string, expiresIn: number }` per lines 1506-1510, implements all 6 steps of forgot-password workflow per lines 1522-1556, accepts identifier field as email OR handle (line 1474), validates identifier format (email or handle starting with @) per Section 10.3, ALWAYS returns 200 success even if user not found to prevent enumeration (lines 1529-1530, 1576), queries users by email OR handle (line 1526), generates secure token with crypto.randomBytes(32).toString('base64url') 44 chars (lines 1533-1534), hashes token with bcrypt before storing (line 1536, 1578), stores in password_reset_tokens table with expires_at NOW + 15 minutes (lines 1537-1538, 1579), sends email via SendGrid/AWS SES with reset link (lines 1540-1551), masks email response first 2 chars + **** + @ + domain (lines 1553-1555, 1501), returns expiresIn=15 minutes (line 1502, 1518), rate limits 3 requests per hour per identifier (lines 1564, 1577), ensures one-time use with used_at field (line 1580), uses HTTPS only for reset links (line 1581), returns 200 for success or 400/429/500 for errors, follows route pattern from Section 5

- [ ] **Task 3.3.7:** Create reset-password route
    - **Action:** Create `/app/api/auth/reset-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/reset-password, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Acceptance Criteria:** Validates token and password strength server-side (Section 10.3), resets password, returns 200 or 400

- [ ] **Task 3.3.8:** Create user-status route
    - **Action:** Create `/app/api/auth/user-status/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1141-1297 (GET /api/auth/user-status with error responses and security notes), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 6-step workflow (lines 1193-1227): (1) validate session token BEFORE any database queries (line 1281), get authenticated user from JWT decode or session lookup from HTTP-only cookie auth-token lines 1196-1197 and 1152, return 401 UNAUTHORIZED if invalid/missing lines 1232-1234 and 1259-1264, (2) query user info (id, email_verified, last_login_at, created_at) lines 1200-1206, (3) determine recognition status based on last_login_at: NULL=first login (isRecognized=false), NOT NULL=returning user (isRecognized=true) lines 1208-1211 and 1236-1239, (4) determine routing destination: isRecognized=false → redirectTo="/login/welcomeunr", isRecognized=true → redirectTo="/home" lines 1213-1215 and 1238-1239, (5) update last_login_at=NOW() and updated_at=NOW() AFTER checking recognition status lines 1217-1224 (CRITICAL: update after check to detect first-time users), (6) return response with routing instruction lines 1226-1227. Backend owns all routing logic, frontend follows redirectTo instruction lines 1246-1249. Security: idempotent after first call (line 1280), no sensitive data exposed like password_hash or payment info (line 1278), only userId UUID returned (line 1282). Return errors: UNAUTHORIZED (401), INTERNAL_ERROR (500) (lines 1259-1272)
    - **Acceptance Criteria:** MUST return `{ userId: string, isRecognized: boolean, redirectTo: string, emailVerified: boolean }` per lines 1165-1170, implements all 6 steps of user-status workflow per lines 1193-1227, validates session token BEFORE database queries (line 1281), returns 401 UNAUTHORIZED with "Please log in to continue" if invalid/missing (lines 1259-1264), queries users table for id/email_verified/last_login_at/created_at (lines 1200-1206, 1290-1294), sets isRecognized=false if last_login_at IS NULL (lines 1210, 1238), sets isRecognized=true if last_login_at IS NOT NULL (lines 1211, 1239), sets redirectTo="/login/welcomeunr" for first-time users (lines 1214, 1238), sets redirectTo="/home" for returning users (lines 1215, 1239), updates last_login_at=NOW() AFTER checking status to preserve first-login detection (lines 1217-1224, 1241-1244, 1279), is idempotent after first call (line 1280), does NOT expose sensitive data like password_hash or payment info (line 1278), only exposes userId UUID (line 1282), returns 200 for success or 401/500 for errors, follows route pattern from Section 5

- [ ] **Task 3.3.9:** Create onboarding-info route
    - **Action:** Create `/app/api/auth/onboarding-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1304-1455 (GET /api/auth/onboarding-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 5-step workflow (lines 1356-1379): (1) get authenticated user from session token JWT decode or session lookup from HTTP-only cookie auth-token lines 1359-1360, return 401 UNAUTHORIZED if invalid/missing lines 1415-1420, (2) get user's client_id from users table lines 1363-1365, (3) get client-specific onboarding configuration - MVP: return hardcoded default response for single client lines 1368-1369 and 1383-1386, Future: query onboarding_messages table by client_id lines 1388-1391, (4) build response with dynamic content: can include dynamic dates (next Monday calculated server-side lines 1393-1397), client-specific communication channels (DMs/email/SMS line 1374), localization (line 1375), A/B testing variants (line 1376), (5) return response line 1378. MVP Implementation: hardcode response in backend (line 1383-1386), simple JavaScript object returned. Future: onboarding_messages table with schema {id, client_id, heading, message, submessage, button_text, created_at} (lines 1388-1391). Security: can be cached per client_id for 1 hour (lines 1409-1411), no sensitive data exposed (line 1434), no PII (line 1437). Return errors: UNAUTHORIZED (401), INTERNAL_ERROR (500) (lines 1415-1428)
    - **Acceptance Criteria:** MUST return `{ heading: string, message: string, submessage: string, buttonText: string }` per lines 1328-1333, implements all 5 steps of onboarding-info workflow per lines 1356-1379, validates session token from HTTP-only cookie auth-token (line 1315), returns 401 UNAUTHORIZED if invalid/missing (lines 1415-1420), queries users table for client_id (lines 1363-1365, 1449-1450), MVP implementation returns hardcoded default response (lines 1383-1386), response can include emojis in heading (line 1321), dynamic dates in message (line 1322), communication channel info in submessage (line 1323), CTA button text (line 1324), can be cached per client_id (lines 1409-1411, 1435), does NOT expose sensitive data or PII (lines 1434, 1437), returns 200 for success or 401/500 for errors, follows route pattern from Section 5

## Step 3.4: Auth Testing
- [ ] **Task 3.4.1:** Create auth service tests
    - **Action:** Create `/tests/integration/services/authService.test.ts`
    - **Acceptance Criteria:** File exists with test suite skeleton

- [ ] **Task 3.4.2:** Test signup flow
    - **Action:** Write integration test for full signup → OTP → verify
    - **Acceptance Criteria:** Test passes, verifies user created in DB

- [ ] **Task 3.4.3:** Test handle uniqueness
    - **Action:** Write test ensuring duplicate handles rejected
    - **Acceptance Criteria:** Test passes, 409 returned for duplicate

- [ ] **Task 3.4.4:** Test multi-tenant isolation
    - **Action:** Write test verifying client_id boundaries
    - **References:** Loyalty.md Pattern 8
    - **Acceptance Criteria:** User from client A cannot access user from client B

- [ ] **Task 3.4.5:** Create E2E auth test
    - **Action:** Create Playwright test for signup flow
    - **Acceptance Criteria:** Test automates form fill, OTP verification

---

# PHASE 4: DASHBOARD APIS

**Objective:** Implement dashboard overview and featured mission.

## Step 4.1: Dashboard Repositories
- [ ] **Task 4.1.1:** Create dashboard repository file
    - **Action:** Create `/lib/repositories/dashboardRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 4.1.2:** Implement getUserDashboard function
    - **Action:** Add function querying user, client, current tier, next tier with VIP metric-aware data selection
    - **References:** API_CONTRACTS.md lines 2061-2669 (GET /api/dashboard sections 1-3: User & Tier Info, Client config, Tier Progress), SchemaFinalv2.md (users, clients, vip_tiers tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query with JOINs: users JOIN clients JOIN tiers (current tier) LEFT JOIN tiers (next tier WHERE tier_order = current_tier.tier_order + 1). Return 3 sections (lines 2079-2125): (1) user (id, handle, email, clientName from clients.company_name), (2) client (id, vipMetric from clients.vip_metric enum 'sales'|'units', vipMetricLabel), (3) currentTier (id, name, color, order, checkpointExempt camelCase transformed from checkpoint_exempt snake_case per lines 2099, 2386-2424), (4) nextTier (id, name, color, minSalesThreshold camelCase from sales_threshold) or null if highest tier (lines 2102-2108, 2412-2424). Return raw checkpoint values (checkpoint_sales_current or checkpoint_units_current + manual_adjustments) for service layer VIP metric-aware formatting
    - **Acceptance Criteria:** MUST filter by client_id for vip_tiers JOIN (Section 9 Critical Rule #1), executes single query with JOINs to users/clients/tiers, returns user section with id/handle/email/clientName, returns client section with vipMetric enum and vipMetricLabel, returns currentTier with checkpointExempt camelCase (lines 2094-2100), returns nextTier with minSalesThreshold camelCase or null (lines 2102-2108), returns raw checkpoint values for VIP metric-aware formatting by service layer

- [ ] **Task 4.1.3:** Implement getCurrentTierRewards function
    - **Action:** Add function querying rewards for user's current tier with LIMIT 4
    - **References:** API_CONTRACTS.md lines 2172-2192 (Current Tier Rewards section), SchemaFinalv2.md (rewards table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** Query rewards WHERE client_id=$clientId AND tier_eligibility=$currentTier AND enabled=true, ORDER BY display_order ASC, LIMIT 4 (lines 2173-2176). Also get total count for "And more!" logic (line 2192). Return fields: id, type, name, displayText (backend-generated), description, valueData (camelCase transformed), redemptionQuantity, displayOrder (lines 2177-2190)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), filters by tier_eligibility=$currentTier AND enabled=true, sorted by display_order ASC, LIMIT 4 rewards for showcase card (lines 2174-2176), includes totalRewardsCount for full tier reward count (line 2192), returns fields matching lines 2177-2190 with valueData camelCase transformed

- [ ] **Task 4.1.4:** Create mission repository file
    - **Action:** Create `/lib/repositories/missionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 4.1.5:** Implement findFeaturedMission function
    - **Action:** Add function querying missions with priority order and raffle filtering
    - **References:** API_CONTRACTS.md lines 1773-2060 (GET /api/dashboard/featured-mission with priority selection lines 1960-1968) and lines 3649-3699 (alternative spec with selection priority order lines 3685-3692), SchemaFinalv2.md (missions, mission_progress, raffle_participations tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST use single optimized query (~80ms, lines 1940-1972) with IN clause for mission types (raffle, sales_dollars, sales_units, videos, likes, views). Filter: client_id + tier_eligibility=$currentTier + enabled=true. Raffle ONLY if activated=true AND no existing raffle_participation for user (lines 1952-1958, 3687, 3698). Exclude claimed missions (lines 1959, 1981-1984). Order by priority (lines 1960-1968, 3685-3692): raffle=0 (if activated + not participated), sales_dollars=1 (if vip_metric='sales'), sales_units=2 (if vip_metric='units'), videos=3, likes=4, views=5. LIMIT 1. Return mission with mission_progress data, reward details, VIP metric for backend formatting
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), uses single query with mission types IN clause, filters by tier_eligibility + enabled=true (lines 3695-3696), includes raffle ONLY if activated=true AND no raffle_participation (lines 3687-3688, 3698), excludes claimed missions, orders by 6-priority ranking (raffle > sales_dollars > sales_units > videos > likes > views per lines 3685-3692), considers VIP metric for sales type priority, LIMIT 1, includes mission_progress.status IN ('active', 'completed') per line 3697, returns null if no missions match

## Step 4.2: Dashboard Services
- [ ] **Task 4.2.1:** Create dashboard service file
    - **Action:** Create `/lib/services/dashboardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 4.2.2:** Implement getDashboardOverview function
    - **Action:** Add function that aggregates 5 sections with VIP metric-aware formatting and tier progression calculations
    - **References:** API_CONTRACTS.md lines 2061-2669 (GET /api/dashboard complete unified endpoint with 5 major sections)
    - **Implementation Guide:** MUST aggregate 5 sections (lines 2075-2193): (1) call dashboardRepository.getUserDashboard for user/client/currentTier/nextTier sections, (2) calculate tierProgress: read precomputed checkpoint_sales_current or checkpoint_units_current + manual_adjustments_total (lines 2428-2450), compute progressPercentage = (currentValue / targetValue) * 100, format display strings based on client.vipMetric (sales mode: "$4,200" vs units mode: "4,200 units") (lines 2456-2471), include checkpointExpiresAt/checkpointExpiresFormatted/checkpointMonths (lines 2122-2125), (3) call getFeaturedMission for featuredMission section with SAME data structure as GET /api/dashboard/featured-mission including isRaffle flag, raffleEndDate, formatted progress text (lines 2132-2168, 2486-2641), (4) call getCurrentTierRewards for currentTierRewards LIMIT 4 with backend displayText generation, (5) return totalRewardsCount. Backend handles ALL formatting per vipMetric setting (lines 2473-2484). Tier expiration logic based on checkpointExempt boolean (lines 2642-2667)
    - **Acceptance Criteria:** Returns complete DashboardResponse matching lines 2075-2193, aggregates user/client/currentTier/nextTier from repository, calculates tierProgress with VIP metric-aware formatting (sales: "$4,200" vs units: "4,200 units"), reads from precomputed checkpoint fields (lines 2428-2450), computes progressPercentage in backend, includes featuredMission with SAME logic as Task 4.3.2 (lines 2132-2168), queries currentTierRewards filtered by tier + enabled LIMIT 4 sorted by display_order (lines 2172-2192), includes totalRewardsCount, backend handles ALL display string formatting based on vipMetric (lines 2473-2484), follows service layer patterns

- [ ] **Task 4.2.3:** Implement shouldShowCongratsModal logic
    - **Action:** Add function checking if mission was fulfilled AFTER user's last login
    - **References:** API_CONTRACTS.md lines 1996-2029 (Congratulations modal logic in featured-mission), Loyalty.md Flow 1 (Congrats Modal)
    - **Implementation Guide:** MUST compare mission_progress.fulfilled_at > users.last_login_at to detect newly completed missions (lines 1996-2029). Query finds missions WHERE fulfilled_at IS NOT NULL AND fulfilled_at > last_login_at (lines 2003-2010). If found, set showCongratsModal=true and provide congratsMessage with mission details (lines 2014-2018). CRITICAL: update users.last_login_at=NOW() AFTER checking comparison but before returning response (lines 2023-2028) to prevent modal from showing again on refresh (line 2037)
    - **Acceptance Criteria:** Returns boolean showCongratsModal by comparing mission_progress.fulfilled_at > users.last_login_at per lines 1996-2029, queries missions WHERE fulfilled_at > last_login_at (lines 2003-2010), generates congratsMessage if found (lines 2014-2018), updates users.last_login_at=NOW() AFTER checking but before returning (lines 2023-2028), prevents duplicate modals on refresh (line 2037)

- [ ] **Task 4.2.4:** Implement getFeaturedMission function
    - **Action:** Add function that formats mission with status computation, displayName mapping, and congrats modal logic
    - **References:** API_CONTRACTS.md lines 1773-2060 (GET /api/dashboard/featured-mission complete response) and lines 3649-3699 (alternative spec with emptyStateMessage line 3679)
    - **Implementation Guide:** Call repository for highest-priority mission, then: (1) use static displayName mapping per type (lines 1901-1927): sales_dollars/sales_units→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle", (2) compute status: 'active' if mission_progress.status='active', 'completed' if status='completed', 'no_missions' if null (lines 1976-1985), (3) calculate progressPercentage = (currentProgress / targetValue) * 100 in backend (lines 1987-1992), (4) check congrats modal: compare mission_progress.fulfilled_at > users.last_login_at, set showCongratsModal=true if found, generate congratsMessage, update last_login_at AFTER checking to prevent re-showing (lines 1996-2029, 2037), (5) return emptyStateMessage "No active missions. Check back soon!" if null (line 3679), (6) include tier info (name, color), supportEmail from client
    - **Acceptance Criteria:** Returns FeaturedMissionResponse matching lines 1787-1824 and 3665-3680, calls repository for priority-ordered mission, uses static displayName mapping (lines 1901-1927), computes status: active/completed/no_missions (lines 1976-1985), calculates progressPercentage in backend (lines 1987-1992), checks congrats modal by comparing fulfilled_at > last_login_at (lines 1996-2029), updates last_login_at AFTER checking (lines 2023-2028), returns emptyStateMessage if no missions (line 3679), includes tier and supportEmail, follows service layer patterns

## Step 4.3: Dashboard API Routes
- [ ] **Task 4.3.1:** Create dashboard overview route
    - **Action:** Create `/app/api/dashboard/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 2061-2669 (GET /api/dashboard unified endpoint), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST return unified dashboard response with 5 major sections (lines 2075-2193): (1) User & Tier Info: query users JOIN clients JOIN tiers, return id/handle/email/clientName and currentTier (id/name/color/order/checkpointExempt camelCase) and nextTier (id/name/color/minSalesThreshold) or null if highest tier (lines 2079-2108, 2386-2424), (2) Client config: vipMetric (sales|units) and vipMetricLabel (lines 2086-2091), (3) Tier Progress: read from precomputed users.checkpoint_sales_current or checkpoint_units_current + manual_adjustments, compute progressPercentage, format display strings based on vipMetric (sales mode: "$4,200" | units mode: "4,200 units"), include checkpointExpiresFormatted (lines 2113-2125, 2428-2471), (4) Featured Mission: SAME data structure as GET /api/dashboard/featured-mission with isRaffle flag, raffleEndDate, formatted progress text (currentFormatted/targetFormatted/targetText/progressText), backend handles ALL formatting (lines 2132-2168, 2486-2641), (5) Current Tier Rewards: query rewards WHERE tier_eligibility + enabled=true + client_id per Section 10.1, sort by display_order ASC, LIMIT 4 rewards, include displayText (backend-generated), totalRewardsCount for "And more!" logic (lines 2172-2192). Backend formats ALL display strings per vipMetric setting (lines 2473-2484). Tier expiration logic: show if checkpointExempt=false, hide if true (lines 2642-2667)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, email, clientName}, client: {id, vipMetric, vipMetricLabel}, currentTier: {id, name, color, order, checkpointExempt}, nextTier: {id, name, color, minSalesThreshold} | null, tierProgress: {currentValue, targetValue, progressPercentage, currentFormatted, targetFormatted, checkpointExpiresAt, checkpointExpiresFormatted, checkpointMonths}, featuredMission: {...same as GET /api/dashboard/featured-mission...}, currentTierRewards: [{id, type, name, displayText, description, valueData, redemptionQuantity, displayOrder}], totalRewardsCount: number }` per lines 2075-2193, queries users JOIN clients JOIN tiers (lines 2389-2405), queries next tier by tier_order+1 or returns null (lines 2412-2424), reads tier progress from precomputed checkpoint_sales_current or checkpoint_units_current + manual_adjustments (lines 2431-2450), formats display strings based on vipMetric (sales: "$4,200" vs units: "4,200 units") (lines 2456-2471), includes featuredMission with SAME logic as Task 4.3.2 plus isRaffle/raffleEndDate/formatted progress text (lines 2486-2591), queries rewards filtered by tier + enabled + client_id per Section 10.1 sorted by display_order LIMIT 4 (lines 2172-2192), backend handles ALL formatting (lines 2636-2641), includes checkpointExempt camelCase for tier expiration UI logic (lines 2642-2667), returns 200 or 401/500, follows route pattern from Section 5

- [ ] **Task 4.3.2:** Create featured mission route
    - **Action:** Create `/app/api/dashboard/featured-mission/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 1773-2060 (GET /api/dashboard/featured-mission), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST use single optimized query (lines 1940-1970, ~80ms performance): query missions with IN clause for types (raffle, sales_dollars, sales_units, videos, likes, views), filter by client_id + tier_eligibility + enabled=true per Section 10.2, raffle ONLY if activated=true (surprise feature lines 1952-1953), exclude if user participated in raffle (lines 1954-1958), exclude claimed missions (lines 1959, 1981-1984), order by priority: raffle=0 > sales_dollars=1 > sales_units=2 > videos=3 > likes=4 > views=5 (lines 1960-1968), LIMIT 1. Display name mapping static per type (lines 1901-1927): sales_dollars/sales_units→"Sales Sprint", likes→"Fan Favorite", views→"Road to Viral", videos→"Lights, Camera, Go!", raffle→"VIP Raffle". Compute progressPercentage in backend (currentProgress/targetValue)*100 (lines 1987-1992). Congratulations modal: compare mission_progress.fulfilled_at > users.last_login_at (lines 1996-2029), set showCongratsModal=true if found, update last_login_at AFTER checking (lines 2023-2028, 2037). Status: active/completed/no_missions (lines 1976-1985). Return errors: 401, 500 (lines 2040-2055)
    - **Acceptance Criteria:** MUST return `{ status: 'active'|'completed'|'claimed'|'fulfilled'|'no_missions', mission: {id, type, displayName, currentProgress, targetValue, progressPercentage, rewardType, rewardAmount, rewardCustomText, unitText} | null, tier: {name, color}, showCongratsModal: boolean, congratsMessage: string | null, supportEmail: string, emptyStateMessage: string | null }` per lines 1787-1824, uses single optimized query ~80ms (lines 1940-1972), filters by client_id + tier_eligibility + enabled=true per Section 10.2, includes raffle ONLY if activated=true (lines 1952-1953), excludes claimed missions from home page (lines 1959, 1981-1984), orders by priority raffle > sales_dollars > sales_units > videos > likes > views (lines 1960-1968), uses static display name mapping per type (lines 1901-1927), calculates progressPercentage in backend (lines 1800, 1987-1992), checks congrats modal by comparing fulfilled_at > last_login_at (lines 1998-2029), updates last_login_at AFTER checking to prevent re-showing (lines 2023-2028, 2037), returns 200 with status='no_missions' if none found (not 404) (lines 1883-1896), follows route pattern from Section 5

## Step 4.4: Dashboard Testing
- [ ] **Task 4.4.1:** Create dashboard integration tests
    - **Action:** Create `/tests/integration/api/dashboard.test.ts`
    - **Acceptance Criteria:** Tests for overview and featured mission endpoints

- [ ] **Task 4.4.2:** Test multi-tenant isolation
    - **Action:** Write test verifying client_id boundary
    - **Acceptance Criteria:** User cannot see dashboard of different client

- [ ] **Task 4.4.3:** Test congrats modal logic
    - **Action:** Write test for first login and 24h threshold
    - **Acceptance Criteria:** showCongratsModal true/false correctly

---

# PHASE 5: MISSIONS SYSTEM

**Objective:** Implement mission listing, claiming, progress tracking, raffle participation.

## Step 5.1: Mission Repositories
- [ ] **Task 5.1.1:** Extend missionRepository with listAvailable function
    - **Action:** Add function querying missions with progress, redemptions, and sub-states using LEFT JOINs
    - **References:** API_CONTRACTS.md lines 2949-3648 (GET /api/missions with complex query requirements), Loyalty.md Flow 8 (Mission List), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute single optimized query with LEFT JOINs to: (1) mission_progress for current_value/target_value/status/checkpoint_end, (2) redemptions WHERE mission_progress_id IS NOT NULL (mission rewards, not VIP tier rewards), (3) commission_boost_redemptions for boost_status/activated_at/expires_at/scheduled dates, (4) physical_gift_redemptions for shipping_city/shipped_at, (5) raffle_participations for is_winner, (6) tiers for tier_name/tier_color. Filter missions WHERE client_id=$clientId AND enabled=true AND (tier_eligibility=$currentTier OR preview_from_tier filtering for locked previews). Return all data needed for backend 14-status computation (lines 3241-3296), VIP metric-aware progress formatting (lines 3092-3100), deadline calculations, scheduling data, raffle data, locked data. Use single query strategy for performance
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes single query with LEFT JOINs to mission_progress/redemptions/commission_boost_redemptions/physical_gift_redemptions/raffle_participations/tiers, filters by enabled=true, filters by tier_eligibility OR preview_from_tier logic for locked tier previews, excludes concluded/rejected redemptions, includes all fields needed for 14-status computation (lines 2990-2994), progress tracking, deadline info, scheduling data, raffle data, locked data, ordered by display_order for backend re-sorting

- [ ] **Task 5.1.2:** Implement getUserProgress function
    - **Action:** Add function querying mission_progress with VIP metric-aware field selection
    - **References:** API_CONTRACTS.md lines 2996-3005 (progress object with VIP metric formatting), SchemaFinalv2.md (mission_progress table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** Query mission_progress table for current_value, target_value, status, checkpoint_end. Return raw numeric values for backend VIP metric-aware formatting (lines 3092-3100): sales_dollars mode formats as "$350"/"$500", sales_units mode formats as "35 units"/"50 units", other types format as "8 videos"/"15 videos". Backend will calculate percentage, remainingText, progressText
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), returns progress with status/current_value/target_value/checkpoint_end for VIP metric-aware formatting by service layer, returns null for raffle/locked missions (no progress tracking per lines 2996, 3186)

- [ ] **Task 5.1.3:** Implement claimReward function
    - **Action:** Add transactional function to update redemptions.status and create sub-state records
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim with sub-state creation lines 3766), SchemaFinalv2.md (redemptions, commission_boost_redemptions, physical_gift_redemptions tables), MissionsRewardsFlows.md (Mission Claim Flow), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute transactional workflow: (1) UPDATE redemptions SET status='claimed', claimed_at=NOW() WHERE mission_progress_id=$missionProgressId AND status='claimable' (line 3765), verify count > 0 after UPDATE, (2) For commission_boost: INSERT INTO commission_boost_redemptions (redemption_id, boost_status='pending_info', scheduled_activation_date, scheduled_activation_time), (3) For physical_gift: INSERT INTO physical_gift_redemptions (redemption_id, shipping_city, shipping_state, shipping_address_encrypted, size_value if provided), (4) For discount: store scheduled_activation_date and scheduled_activation_time in redemptions table. NO points (mission rewards are tied to redemptions table, not points system). Return redemption_id for response
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST validate redemptions.status='claimable' (line 3762), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5), updates redemptions.status 'claimable' → 'claimed' (line 3765), creates sub-state for commission_boost (commission_boost_redemptions) or physical_gift (physical_gift_redemptions) per line 3766, NO points addition (mission rewards use redemptions), returns redemption_id

- [ ] **Task 5.1.4:** Create raffle repository file
    - **Action:** Create `/lib/repositories/raffleRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 5.1.5:** Implement participate function
    - **Action:** Add transactional function to update mission_progress, create redemption, and insert raffle participation
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate with 8-step processing lines 3805-3814), SchemaFinalv2.md (raffle_participations, mission_progress, redemptions tables), MissionsRewardsFlows.md (Raffle Mission Flow), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute transactional 3-database-operation workflow: (1) UPDATE mission_progress SET status='completed' WHERE user_id=$userId AND mission_id=$missionId AND status='active' (line 3811), verify count > 0 after UPDATE, (2) INSERT INTO redemptions (user_id, reward_id, mission_progress_id, client_id, status='claimable', claimed_at=NULL) for raffle reward (line 3812), (3) INSERT INTO raffle_participations (user_id, mission_id, client_id, is_winner=NULL, participated_at=NOW()) (line 3813). Return raffle data fields: draw_date from mission, prize name from reward. Check duplicate participation before INSERT by querying raffle_participations WHERE user_id + mission_id (line 3809)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST use transaction for 3 database operations, checks mission.mission_type='raffle' (line 3807), checks mission.activated=true (line 3808), prevents duplicate participation by checking raffle_participations table (line 3809), updates mission_progress.status 'active' → 'completed' (line 3811), creates redemptions row status='claimable' (line 3812), creates raffle_participations row is_winner=NULL (line 3813), returns draw_date and prize_name for response formatting

- [ ] **Task 5.1.6:** Implement getHistory function
    - **Action:** Add function querying concluded/rejected missions with INNER JOIN redemptions
    - **References:** API_CONTRACTS.md lines 3820-4041 (GET /api/missions/history backend query lines 3970-4002), SchemaFinalv2.md (mission_progress, redemptions, missions, rewards, raffle_participations tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query (lines 3970-4002): SELECT missions JOIN mission_progress JOIN rewards JOIN redemptions (INNER JOIN WHERE status IN ('concluded', 'rejected') lines 3989-3992) LEFT JOIN raffle_participations, WHERE client_id + mp.status != 'cancelled' (line 3999), ORDER BY COALESCE(concluded_at, rejected_at) DESC (line 4001). Return all fields for backend formatting: mission type/display_name, reward type/name/value_data, completion dates (completed_at, claimed_at, concluded_at/rejected_at), raffle data (is_winner, draw_date, prize_name). NO pagination per API spec (lines 3820-4041 show no pagination parameters)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes INNER JOIN redemptions WHERE status IN ('concluded', 'rejected') (lines 3989-3992), excludes cancelled missions mp.status != 'cancelled' (line 3999), NO pagination (API spec shows none), ordered by COALESCE(concluded_at, rejected_at) DESC (line 4001), includes mission/reward/completion/raffle fields for backend formatting, LEFT JOIN raffle_participations for rejected raffle data

## Step 5.2: Mission Services
- [ ] **Task 5.2.1:** Create mission service file
    - **Action:** Create `/lib/services/missionService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 5.2.2:** Implement listAvailableMissions function
    - **Action:** Add function that computes 14-status ranking, formats display text with VIP metric mode, populates flippable cards, and sorts by featured + actionable priority
    - **References:** API_CONTRACTS.md lines 2949-3648 (GET /api/missions complete response with status computation, backend formatting, and sorting logic)
    - **Implementation Guide:** MUST call repository to get missions with progress/redemptions (LEFT JOIN data), then for each mission: (1) compute status from 14-priority ranking (lines 3232-3296): raffle_available, raffle_claim, default_claim, default_schedule, pending_info, clearing, sending, active, scheduled, redeeming/redeeming_physical, in_progress, raffle_won/raffle_processing/dormant, locked, (2) use static displayName mapping per mission_type (lines 3070-3079): sales→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle", (3) generate reward description with article for physical gifts/experiences (lines 3081-3090): "Win an iPhone 16 Pro!" using addArticle() helper, (4) format progress text per VIP metric mode (lines 3092-3100): sales_dollars→"$350 of $500"/"$150 more to go!", sales_units→"35 units of 50 units"/"15 more units to go!", (5) calculate deadline.daysRemaining from checkpoint_end, (6) populate scheduling data with formatted dates/times EST (lines 3025-3035), (7) populate raffleData with daysUntilDraw/isWinner/prizeName with article (lines 3037-3044), (8) populate lockedData with requiredTierName/requiredTierColor/unlockMessage (lines 3046-3053), (9) populate flippableCard ONLY for specific statuses (lines 3304-3463): redeeming, sending, scheduled, active, pending_info, clearing with type-specific content, (10) sort by featured mission first (line 3236-3239), then 12-priority status ranking (lines 3241-3296), then mission type priority (raffle→sales→videos→likes→views, line 3298). Return user info, featuredMissionId (always first in array), and sorted missions array
    - **Acceptance Criteria:** Returns complete MissionsPageResponse matching lines 2963-3065, calls repository for single query with LEFT JOINs, computes all 14 possible statuses using priority ranking (lines 3232-3296), uses static displayName mapping per mission_type (lines 3070-3079), generates reward descriptions with article for physical gifts/experiences (lines 3081-3090), formats ALL progress text per VIP metric mode (lines 3092-3100), calculates daysRemaining/daysUntilDraw in backend, populates flippableCard for 8 specific status+reward type combinations (lines 3304-3463), sorts with featured mission first guarantee (line 3300), then 12-priority status ranking, then mission type secondary sort (line 3298), includes featuredMissionId, follows service layer patterns

- [ ] **Task 5.2.3:** Implement claimMissionReward function
    - **Action:** Add function that validates 7 steps, handles varying request body, and formats nextAction response
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim with 7-step validation), Loyalty.md Pattern 1 (Transactional), Pattern 2 (Idempotent), Pattern 3 (State Validation)
    - **Implementation Guide:** MUST validate 7 steps (lines 3761-3767): (1) verify mission_progress.status='completed' (line 3763), (2) check redemptions.status='claimable' not already claimed (line 3764, idempotent), (3) verify mission.tier_eligibility = user.current_tier (line 3765), (4) validate request body based on reward type (line 3766): instant rewards (gift_card/spark_ads/experience) empty body (line 3718), scheduled rewards (commission_boost/discount) require scheduledActivationDate YYYY-MM-DD + scheduledActivationTime HH:MM:SS EST (lines 3721-3724), physical gifts require shippingAddress object + optional size from valueData.sizeOptions (lines 3726-3743), (5) call repository to update redemptions.status 'claimable' → 'claimed' (line 3767), (6) create sub-state records if needed (line 3768), (7) log audit trail (line 3769). Format nextAction response (lines 3753-3758): type 'show_confirmation' or 'navigate_to_missions', status (new redemption status), message (next steps). NO points (mission rewards use redemptions, not points). Return success=true with message "Reward claimed successfully!" (line 3751)
    - **Acceptance Criteria:** Returns response matching lines 3749-3758, validates all 7 steps (lines 3761-3769), MUST be idempotent by checking redemptions.status='claimable' (line 3764), verifies mission_progress.status='completed' (line 3763), validates tier eligibility (line 3765), handles varying request body: instant empty, scheduled with date/time EST, physical with shippingAddress + optional size (lines 3717-3743), calls repository for transactional UPDATE + sub-state creation, NO points addition (mission rewards use redemptions), formats nextAction with type/status/message (lines 3753-3758), returns redemptionId, follows service layer patterns

- [ ] **Task 5.2.4:** Implement participateInRaffle function
    - **Action:** Add idempotent function that validates 4 rules, executes 3 database operations, and formats raffle response
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate with 8-step backend processing), MissionsRewardsFlows.md (Raffle Mission Flow), Loyalty.md Pattern 2 (Idempotent)
    - **Implementation Guide:** MUST validate 4 pre-participation rules (lines 3807-3810): (1) verify mission.mission_type='raffle' (line 3807), (2) check mission.activated=true (line 3808), (3) verify user hasn't already participated by checking raffle_participations table return 409 if exists (line 3809, idempotent), (4) verify tier eligibility mission.tier_eligibility = user.current_tier (line 3810). Call repository for transactional 3 operations (lines 3811-3813). Format response (lines 3794-3801): drawDate ISO 8601 from mission.raffle_end_date, drawDateFormatted "Feb 20, 2025", daysUntilDraw backend-calculated from NOW() to raffle_end_date, prizeName with article "an iPhone 16 Pro" from reward.value_data.display_text. Return success=true with message "You're entered in the raffle!" (line 3797)
    - **Acceptance Criteria:** Returns response matching lines 3793-3802, validates all 4 pre-participation rules (lines 3807-3810), MUST be idempotent by checking raffle_participations (line 3809), verifies mission_type='raffle' (line 3807), checks activated=true (line 3808), validates tier eligibility (line 3810), calls repository for 3 transactional operations (mission_progress UPDATE, redemptions INSERT, raffle_participations INSERT), formats raffleData with drawDate/drawDateFormatted/daysUntilDraw/prizeName (lines 3796-3801), calculates daysUntilDraw in backend, adds article to prizeName, returns 409 if already participated, follows service layer patterns

- [ ] **Task 5.2.5:** Implement getMissionHistory function
    - **Action:** Add function that formats concluded missions with reward-focused names and status determination
    - **References:** API_CONTRACTS.md lines 3820-4041 (GET /api/missions/history complete response with backend formatting)
    - **Implementation Guide:** MUST call repository to get concluded/rejected missions, then for each: (1) determine status (lines 4004-4019): if redemption.status='concluded' return 'concluded', if redemption.status='rejected' AND raffle_participation.is_winner=false return 'rejected_raffle', (2) backend format reward name focused on reward not mission (lines 3877-3886): gift_card "$50 Gift Card" (not "Win a..."), commission_boost "5% Pay Boost", spark_ads "$100 Ads Boost", discount "15% Deal Boost", physical_gift/experience use display_text or description, (3) generate subtitle "From: {displayName} mission" (lines 3888-3896), (4) format dates: completedAt/completedAtFormatted, claimedAt/claimedAtFormatted, deliveredAt/deliveredAtFormatted with ISO 8601 + formatted "Jan 10, 2025" (lines 4022-4037), (5) populate raffleData for rejected raffles with isWinner=false, drawDate, drawDateFormatted, prizeName with article (lines 3864-3870). Return user info (id, currentTier, currentTierName, currentTierColor) and history array. NO pagination per API spec
    - **Acceptance Criteria:** Returns MissionHistoryResponse matching lines 3834-3872, calls repository for INNER JOIN redemptions, determines status: concluded or rejected_raffle (lines 4004-4019), formats reward names focused on reward (lines 3877-3886), generates subtitle "From: {displayName} mission" (lines 3888-3896), formats all dates with ISO 8601 + formatted versions (lines 4022-4037), includes raffleData with isWinner for lost raffles (lines 3864-3870), includes user section with tier info, NO pagination (API spec shows none), follows service layer patterns

## Step 5.3: Mission API Routes
- [ ] **Task 5.3.1:** Create missions list route
    - **Action:** Create `/app/api/missions/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 2949-3648 (GET /api/missions for Missions page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST return complex missions page response with PRE-COMPUTED status, progress, and formatted display text (lines 2962-3065): (1) User & Tier Info with currentTier/currentTierName/currentTierColor (lines 2965-2971), (2) featuredMissionId for home page sync (line 2974), (3) missions array sorted by actionable priority with 14 possible statuses (in_progress, default_claim, default_schedule, scheduled, active, redeeming, redeeming_physical, sending, pending_info, clearing, dormant, raffle_available, raffle_processing, raffle_claim, raffle_won, locked) (lines 2990-2994), each mission includes progress object with backend-formatted currentFormatted/targetFormatted/remainingText/progressText per VIP metric mode (sales: "$350" vs units: "35 units") (lines 2996-3005, 3092-3100), deadline with daysRemaining (lines 3007-3012), scheduling data with formatted dates/times EST (lines 3025-3035), raffleData with daysUntilDraw/isWinner/prizeName with article (lines 3037-3044), lockedData with requiredTierName/unlockMessage (lines 3046-3053), flippableCard content (lines 3055-3063). Display name mapping static per type (lines 3070-3079): sales→"Sales Sprint", videos→"Lights, Camera, Go!", likes→"Fan Favorite", views→"Road to Viral", raffle→"VIP Raffle". Reward descriptions VIP metric mode-aware (lines 3081-3090). Backend generates ALL formatted display text (lines 3092-3100)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, currentTier, currentTierName, currentTierColor}, featuredMissionId: string, missions: [{id, missionType, displayName, targetUnit, tierEligibility, rewardType, rewardDescription, status, progress: {currentValue, currentFormatted, targetValue, targetFormatted, percentage, remainingText, progressText} | null, deadline: {checkpointEnd, checkpointEndFormatted, daysRemaining} | null, valueData, scheduling, raffleData, lockedData, flippableCard}] }` per lines 2963-3065, filters by user's tier/client_id/enabled per Section 10.2, includes 14 possible mission statuses (lines 2990-2994), uses static display name mapping per type (lines 3070-3079), backend formats ALL progress text per VIP metric mode (sales: "$350" vs units: "35 units") (lines 3092-3100), formats reward descriptions with article "Win an iPhone 16 Pro!" (lines 3081-3090), calculates percentage/daysRemaining/daysUntilDraw in backend, provides raffleData with isWinner/prizeName, provides lockedData with requiredTierName/unlockMessage, returns 200 or 401/500, follows route pattern from Section 5

- [ ] **Task 5.3.2:** Create claim mission route
    - **Action:** Create `/app/api/missions/[missionId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 3700-3770 (POST /api/missions/:id/claim), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Mission Claim Validation, lines 1312-1323)
    - **Implementation Guide:** MUST implement 7-step validation workflow (lines 3759-3767): (1) verify mission_progress.status='completed' (line 3761), (2) check redemptions.status='claimable' not already claimed (line 3762), (3) verify mission.tier_eligibility = user.current_tier (line 3763), (4) validate request body based on reward type: instant rewards (gift_card/spark_ads/experience) empty body, scheduled rewards (commission_boost/discount) require scheduledActivationDate/Time EST (lines 3718-3722), physical gifts require shippingAddress + optional size from valueData.sizeOptions (lines 3724-3741), (5) update redemptions.status from 'claimable' → 'claimed' (line 3765), (6) create sub-state records if needed (line 3766), (7) log audit trail (line 3767). Per Section 10.2 validation table MUST check: mission completion current_value >= target_value, tier eligibility, client ownership, status='completed', prevent double-claim claimed_at === null (lines 1314-1322). Request body varies by reward type (lines 3715-3741)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemptionId: string, nextAction: {type: 'show_confirmation'|'navigate_to_missions', status: string, message: string} }` per lines 3747-3756, implements all 7 validation steps per lines 3759-3767, verifies mission_progress.status='completed' (line 3761), checks redemptions.status='claimable' (line 3762), validates tier eligibility (line 3763), accepts varying request body: instant rewards empty, scheduled rewards with scheduledActivationDate/Time EST, physical gifts with shippingAddress + optional size (lines 3715-3741), updates redemptions.status 'claimable' → 'claimed' (line 3765), creates sub-state records if needed (line 3766), logs audit trail (line 3767), validates per Section 10.2 table (mission completion, tier eligibility, client ownership, status='completed', prevent double-claim) (lines 1314-1322), validates missionId UUID, returns 200 for success or 400/404 for errors, follows route pattern from Section 5

- [ ] **Task 5.3.3:** Create raffle participation route
    - **Action:** Create `/app/api/missions/[missionId]/participate/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 3771-3814 (POST /api/missions/:id/participate), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Server-Side Validation Pattern, lines 1347-1367)
    - **Implementation Guide:** MUST implement 8-step backend processing workflow (lines 3803-3812): (1) verify mission.mission_type='raffle' (line 3805), (2) check mission.activated=true (line 3806), (3) verify user hasn't already participated check raffle_participations table (line 3807), (4) verify tier eligibility mission.tier_eligibility = user.current_tier (line 3808), (5) update mission_progress.status from 'active' → 'completed' (line 3809), (6) create redemptions row with status='claimable' (line 3810), (7) create raffle_participations row with is_winner=NULL (line 3811), (8) log audit trail (line 3812). Request body empty (line 3785). Response includes raffleData with drawDate ISO 8601, drawDateFormatted "Feb 20, 2025", daysUntilDraw backend-calculated, prizeName with article "an iPhone 16 Pro" (lines 3794-3799)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, raffleData: {drawDate: string, drawDateFormatted: string, daysUntilDraw: number, prizeName: string} }` per lines 3791-3800, implements all 8 processing steps per lines 3803-3812, accepts empty request body (line 3785), verifies mission_type='raffle' (line 3805), checks activated=true (line 3806), prevents duplicate participation (line 3807), validates tier eligibility (line 3808), updates mission_progress.status 'active' → 'completed' (line 3809), creates redemptions row status='claimable' (line 3810), creates raffle_participations row is_winner=NULL (line 3811), logs audit trail (line 3812), validates per Section 10.3 server-side, validates missionId UUID, returns 200 for success or 409 if already participated or 400/404 for other errors, follows route pattern from Section 5

- [ ] **Task 5.3.4:** Create mission history route
    - **Action:** Create `/app/api/missions/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 3820-4041 (GET /api/missions/history), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.2 (Missions Authorization, lines 1299-1309)
    - **Implementation Guide:** MUST query concluded missions with INNER JOIN on redemptions WHERE status IN ('concluded', 'rejected') (lines 3970-4002): SELECT missions JOIN mission_progress JOIN rewards JOIN redemptions (status IN 'concluded'/'rejected') LEFT JOIN raffle_participations, WHERE client_id + mp.status != 'cancelled', ORDER BY COALESCE(concluded_at, rejected_at) DESC (lines 3998-4001). Status determination (lines 4004-4019): if redemption.status='concluded' return 'concluded', if redemption.status='rejected' AND raffle_participation.is_winner=false return 'rejected_raffle'. Backend formats reward names focused on reward not mission (lines 3877-3886): gift_card "$50 Gift Card", commission_boost "5% Pay Boost", spark_ads "$100 Ads Boost", discount "15% Deal Boost", physical_gift/experience use display_text or description. Subtitle format "From: {displayName} mission" (lines 3888-3896). Date fields (lines 4022-4038): concluded missions use completed_at/claimed_at/concluded_at, rejected raffles use participated_at with null claimed_at/deliveredAt. Each date includes ISO 8601 and formatted version "Jan 10, 2025"
    - **Acceptance Criteria:** MUST return `{ user: {id, currentTier, currentTierName, currentTierColor}, history: [{id, missionType, displayName, status: 'concluded'|'rejected_raffle', rewardType, rewardName, rewardSubtitle, completedAt, completedAtFormatted, claimedAt, claimedAtFormatted, deliveredAt, deliveredAtFormatted, raffleData: {isWinner, drawDate, drawDateFormatted, prizeName} | null}] }` per lines 3834-3872, queries with INNER JOIN on redemptions WHERE status IN ('concluded', 'rejected') (lines 3989-3992), filters by client_id per Section 10.2, excludes cancelled missions mp.status != 'cancelled' (line 3999), orders by concluded_at/rejected_at DESC (line 4001), determines status: concluded or rejected_raffle (lines 4007-4018), backend formats reward names focused on reward (lines 3877-3886), generates subtitle "From: {displayName} mission" (lines 3888-3896), includes formatted dates for completedAt/claimedAt/deliveredAt (lines 4022-4037), provides raffleData with isWinner for lost raffles (lines 3864-3870), returns 200 or 401/500, follows route pattern from Section 5

## Step 5.4: Mission Testing
- [ ] **Task 5.4.1:** Create mission service tests
    - **Action:** Create `/tests/integration/services/missionService.test.ts`
    - **Acceptance Criteria:** File exists

- [ ] **Task 5.4.2:** Test idempotent claim
    - **Action:** Write test attempting duplicate claim
    - **References:** Loyalty.md Pattern 2
    - **Acceptance Criteria:** Second claim returns error, points not double-added

- [ ] **Task 5.4.3:** Test state validation
    - **Action:** Write test attempting claim on non-completed mission
    - **References:** Loyalty.md Pattern 3
    - **Acceptance Criteria:** Returns 400, status unchanged

- [ ] **Task 5.4.4:** Test tier filtering
    - **Action:** Write test verifying lower-tier user cannot see higher-tier missions
    - **Acceptance Criteria:** Missions correctly filtered by tier restrictions

- [ ] **Task 5.4.5:** Test raffle participation
    - **Action:** Write test for raffle flow
    - **Acceptance Criteria:** Participation recorded, duplicate prevented

---

# PHASE 6: REWARDS SYSTEM

**Objective:** Implement reward listing, redemption, sub-state management.

## Step 6.1: Reward Repositories
- [ ] **Task 6.1.1:** Create reward repository file
    - **Action:** Create `/lib/repositories/rewardRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.2:** Implement listAvailable function
    - **Action:** Add function querying rewards with active redemptions and sub-states using LEFT JOINs
    - **References:** API_CONTRACTS.md lines 4045-4809 (GET /api/rewards database query lines 4713-4774), SchemaFinalv2.md (rewards table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute single optimized query (lines 4713-4774) with LEFT JOINs to: (1) redemptions table WHERE mission_progress_id IS NULL AND status NOT IN ('concluded', 'rejected') AND deleted_at IS NULL (lines 4751-4756), (2) commission_boost_redemptions for boost_status/activated_at/expires_at/sales_at_expiration (lines 4758, 4739-4743), (3) physical_gift_redemptions for shipping_city/shipped_at (lines 4759, 4745-4747), (4) tiers for tier_name (line 4750). Filter rewards WHERE client_id=$clientId AND enabled=true AND (tier_eligibility=$currentTier OR preview_from_tier filtering lines 4764-4771). Return all data needed for backend status computation and formatting. Use single query strategy for performance (lines 4778-4786)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes single query with LEFT JOINs to redemptions/commission_boost_redemptions/physical_gift_redemptions/tiers per lines 4713-4774, filters by enabled=true, filters by tier_eligibility OR preview_from_tier logic (lines 4763-4771), excludes concluded/rejected redemptions (line 4755), includes all fields needed for status computation (redemption_status, boost_status, shipping_city, shipped_at, scheduled dates, activation dates), ordered by display_order ASC for backend re-sorting

- [ ] **Task 6.1.3:** Implement getUsageCount function
    - **Action:** Add function counting VIP tier redemptions for current tier only with tier achievement reset logic
    - **References:** API_CONTRACTS.md lines 4540-4590 (Usage Count Calculation for VIP Tier Rewards), SchemaFinalv2.md (redemptions table), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query per lines 4542-4556: SELECT COUNT(*) FROM redemptions WHERE user_id=$userId AND reward_id=$rewardId AND mission_progress_id IS NULL (VIP tier rewards only, line 4548) AND tier_at_claim=$currentTier (current tier only, line 4549) AND status IN ('claimed', 'fulfilled', 'concluded') (active and completed claims, line 4550) AND deleted_at IS NULL (not soft-deleted, line 4551) AND created_at >= (SELECT tier_achieved_at FROM users WHERE id=$userId) (resets on tier change, lines 4552-4556). Key points (lines 4559-4562): mission rewards don't count (mission_progress_id IS NULL), only current tier counts (tier_at_claim filter), resets when tier changes (tier_achieved_at comparison). Usage count reset behavior (lines 4564-4600): tier promotion resets to 0, tier demotion soft-deletes higher tier redemptions, re-promotion gives fresh limits
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), counts WHERE mission_progress_id IS NULL (VIP tier rewards only per line 4548), filters tier_at_claim=$currentTier (current tier only per line 4549), filters status IN ('claimed', 'fulfilled', 'concluded') per line 4550, excludes soft-deleted (deleted_at IS NULL per line 4551), filters created_at >= tier_achieved_at for tier change reset logic (lines 4552-4556), implements fresh count on tier promotion/demotion/re-promotion per lines 4564-4600

- [ ] **Task 6.1.4:** Implement redeemReward function
    - **Action:** Add transactional function to insert redemption with tier-specific usage counting and create sub-state tables
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim with usage limits and sub-state requirements), SchemaFinalv2.md (redemptions, commission_boost_redemptions, physical_gift_redemptions tables), Loyalty.md Pattern 1 (Transactional), Pattern 6 (VIP Reward Lifecycle), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute transactional INSERT with tier-specific data: (1) INSERT INTO redemptions (user_id, reward_id, client_id, status='claimed', claimed_at=NOW(), tier_at_claim=$currentTier, mission_progress_id=NULL for VIP tier rewards line 4908, scheduled_activation_date/time if provided) (2) Count usage WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931) to enforce usage limits, (3) For commission_boost: INSERT INTO commission_boost_redemptions (redemption_id, boost_status='pending_info', scheduled_activation_date/time), (4) For physical_gift: INSERT INTO physical_gift_redemptions (redemption_id, shipping_city, shipping_state, shipping_address_encrypted, size_value if provided), (5) For discount: store scheduled_activation_date and scheduled_activation_time in redemptions table. NO points deduction (VIP tier rewards use redemption_quantity limits, not points per line 4814). Redemption period reset: gift_card/physical_gift/experience count once forever, commission_boost/spark_ads/discount reset on tier re-achievement (lines 4953-4965)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST use transaction, NO points deduction (VIP tier rewards line 4814), enforces usage limits with tier-specific count WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931), inserts redemption with tier_at_claim field, creates sub-state for commission_boost (commission_boost_redemptions) or physical_gift (physical_gift_redemptions), applies redemption period reset rules (lines 4953-4965), returns redemption ID and created sub-state IDs

- [ ] **Task 6.1.5:** Create redemption repository file
    - **Action:** Create `/lib/repositories/redemptionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.6:** Implement getHistory function
    - **Action:** Add function querying concluded redemptions with INNER JOIN rewards for user
    - **References:** API_CONTRACTS.md lines 5413-5554 (GET /api/rewards/history backend query lines 5428-5442), SchemaFinalv2.md (redemptions, rewards tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Implementation Guide:** MUST execute query (lines 5428-5442): SELECT redemptions.id, reward_id, rewards.type, rewards.name, rewards.description, claimed_at, concluded_at FROM redemptions INNER JOIN rewards ON redemptions.reward_id = rewards.id WHERE redemptions.user_id=$userId AND redemptions.status='concluded' AND redemptions.client_id=$clientId ORDER BY concluded_at DESC. Return all fields needed for backend formatting: type (for formatting rules), name, description, value_data JSONB (for amount/percent/durationDays/displayText), claimed_at, concluded_at. NO pagination per API spec (lines 5413-5554 show no offset/limit parameters)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), executes INNER JOIN rewards (line 5438), filters WHERE status='concluded' (line 5440), NO pagination (API spec shows no pagination), ordered by concluded_at DESC (line 5441), returns all fields needed for backend formatting (type, name, description, value_data, claimed_at, concluded_at)

- [ ] **Task 6.1.7:** Create commission boost repository file
    - **Action:** Create `/lib/repositories/commissionBoostRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.8:** Implement createBoostState function
    - **Action:** Add function to insert commission_boost_redemptions record with state history
    - **References:** SchemaFinalv2.md (commission_boost_redemptions table), Loyalty.md Pattern 7 (Commission Boost State History), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST insert into commission_boost_redemptions AND commission_boost_state_history, creates state with boost_percentage, start_date, end_date, boost_status='active'

- [ ] **Task 6.1.9:** Implement deactivateBoost function
    - **Action:** Add function to update boost_status='deactivated' and insert state history record
    - **References:** SchemaFinalv2.md (commission_boost_redemptions table), Loyalty.md Pattern 7 (Commission Boost State History), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5), updates boost_status to 'deactivated', inserts commission_boost_state_history record

- [ ] **Task 6.1.10:** Create physical gift repository file
    - **Action:** Create `/lib/repositories/physicalGiftRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.11:** Implement createGiftState function
    - **Action:** Add function to insert physical_gift_redemptions with encrypted shipping address
    - **References:** SchemaFinalv2.md (physical_gift_redemptions table), Loyalty.md Pattern 6 (VIP Reward Lifecycle), Pattern 9 (Encryption), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST validate client_id is provided (Section 9 Critical Rule #2), MUST encrypt shipping_address before INSERT (Section 9 checklist item 6), creates record with shipping_status='pending'

- [ ] **Task 6.1.12:** Implement updateShippingStatus function
    - **Action:** Add function to update shipping_status with state transition validation
    - **References:** SchemaFinalv2.md (physical_gift_redemptions table), Loyalty.md Pattern 6 (VIP Reward Lifecycle), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), MUST throw NotFoundError if count === 0 (Section 9 checklist item 5), validates shipping_status transitions (pending→shipped→delivered)

- [ ] **Task 6.1.13:** Implement getPaymentInfo function
    - **Action:** Add function to retrieve and decrypt saved payment info from users table
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info response schema lines 5260-5264), ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Section 9 (Multitenancy Enforcement, lines 1104-1137), Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Implementation Guide:** Query users table: SELECT default_payment_method, default_payment_account WHERE id=$userId AND client_id=$clientId. Decrypt default_payment_account using encryption utility (Pattern 9). Return object with hasPaymentInfo boolean, paymentMethod ('paypal'|'venmo'|null), and decrypted paymentAccount (string|null) per lines 5260-5264. If default_payment_method IS NULL return hasPaymentInfo=false with null values (lines 5278-5285), else return hasPaymentInfo=true with decrypted account (lines 5269-5275)
    - **Acceptance Criteria:** MUST decrypt default_payment_account field using encryption utility (Section 9 checklist item 6, Pattern 9), MUST filter by client_id AND user_id (Section 9 Critical Rule #1), queries users.default_payment_method and users.default_payment_account (not commission_boost_redemptions), returns object matching lines 5260-5264 with hasPaymentInfo boolean, paymentMethod ('paypal'|'venmo'|null), paymentAccount (decrypted string|null), returns hasPaymentInfo=false with nulls if no saved info

- [ ] **Task 6.1.14:** Implement savePaymentInfo function
    - **Action:** Add function to update redemption with encrypted payment info and optionally save to user defaults
    - **References:** API_CONTRACTS.md lines 5290-5412 (POST /api/rewards/:id/payment-info with encryption and status transition), ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Section 9 (Multitenancy Enforcement, lines 1104-1137), Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Implementation Guide:** MUST perform 2 database operations: (1) UPDATE redemptions SET payment_method=$paymentMethod, payment_account=encrypt($paymentAccount), status='fulfilled', payment_info_collected_at=NOW() WHERE id=$redemptionId AND client_id=$clientId (lines 5343-5345), verify count > 0 after UPDATE (Section 9 checklist item 4), (2) if saveAsDefault=true then UPDATE users SET default_payment_method=$paymentMethod, default_payment_account=encrypt($paymentAccount) WHERE id=$userId AND client_id=$clientId (lines 5309, 5347). PaymentMethod enum ONLY 'paypal' or 'venmo' (line 5307, NOT zelle or bank_account). Return updated redemption data and userPaymentUpdated boolean
    - **Acceptance Criteria:** MUST encrypt payment_account before UPDATE using encryption utility (Section 9 checklist item 6, Pattern 9), validates paymentMethod enum is 'paypal' or 'venmo' ONLY (line 5307), updates redemption.status from 'pending_info' to 'fulfilled' (line 5343), sets payment_info_collected_at timestamp (line 5345), MUST filter by client_id (Section 9 Critical Rule #1), MUST verify count > 0 after UPDATE (Section 9 checklist item 4), if saveAsDefault=true updates users.default_payment_method and users.default_payment_account with encryption (lines 5309, 5347), returns userPaymentUpdated boolean

## Step 6.2: Reward Services
- [ ] **Task 6.2.1:** Create reward service file
    - **Action:** Create `/lib/services/rewardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 6.2.2:** Implement listAvailableRewards function
    - **Action:** Add function that computes status, formats display text, calculates availability, and sorts by actionable priority
    - **References:** API_CONTRACTS.md lines 4045-4809 (GET /api/rewards complete response with status computation, backend formatting, and sorting logic)
    - **Implementation Guide:** MUST call repository to get rewards with active redemptions (LEFT JOIN data), then for each reward: (1) compute status from 10-priority ranking (lines 4403-4536): pending_info, clearing, sending, active, scheduled, redeeming_physical, redeeming, claimable, limit_reached, locked, (2) generate backend-formatted name and displayText per type (lines 4142-4161): gift_card "$X Gift Card"/"Amazon Gift Card", commission_boost "X% Pay Boost"/"Higher earnings (Xd)", spark_ads "$X Ads Boost"/"Spark Ads Promo", discount "X% Deal Boost"/"Follower Discount (Xd)", physical_gift "Gift Drop: {desc}"/{valueData.displayText}, experience {desc}/{valueData.displayText}, (3) compute canClaim based on tier match + limit + enabled + no active claim (line 4102), compute isLocked for tier mismatch (line 4103), compute isPreview for preview_from_tier (line 4104), (4) calculate usedCount for VIP tier rewards WHERE mission_progress_id IS NULL AND tier_at_claim=current_tier (line 4107), (5) generate statusDetails with formatted dates/times (lines 4115-4131), (6) sort by dual-sort: status priority 1-10, then display_order (lines 4652-4709). Transform discount duration_minutes to durationDays (lines 4637-4648). Return user info, redemptionCount (COUNT status='concluded'), and sorted rewards array
    - **Acceptance Criteria:** Returns complete RewardsPageResponse matching lines 4059-4138, calls repository for single query with LEFT JOINs, computes all 10 possible statuses using priority ranking (lines 4403-4536), generates backend-formatted name/displayText per type (lines 4142-4161), computes canClaim/isLocked/isPreview flags (lines 4101-4104), calculates usedCount with VIP tier filtering (line 4107), generates statusDetails with formatted dates (lines 4115-4131), transforms discount duration_minutes to durationDays (lines 4637-4648), sorts by status priority 1-10 then display_order (lines 4652-4709), includes redemptionCount for history link, follows service layer patterns

- [ ] **Task 6.2.3:** Implement claimReward function with type routing
    - **Action:** Add function that validates 11 pre-claim rules, routes by reward type, and enforces scheduling constraints
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim with 11-step validation), MissionsRewardsFlows.md (6 reward types), ARCHITECTURE.md Section 10.1 (Rewards Claim Validation, lines 1201-1294)
    - **Implementation Guide:** MUST validate 11 pre-claim rules (lines 4902-4951): (1) auth JWT, (2) reward exists, (3) enabled=true, (4) tier_eligibility matches current_tier, (5) VIP tier only (mission_progress_id IS NULL), (6) no active redemption status IN ('claimed', 'fulfilled') (lines 4909-4917), (7) usage limit COUNT < redemption_quantity with tier-specific WHERE mission_progress_id IS NULL AND tier_at_claim=$currentTier AND created_at >= tier_achieved_at (lines 4919-4931), (8) scheduling required for discount/commission_boost, (9) discount: weekday Mon-Fri + 09:00-16:00 EST + future date (lines 4933-4936), (10) commission_boost: future date + auto-set time to 18:00:00 EST (lines 4937-4939), (11) physical_gift: shippingInfo required + sizeValue if requires_size=true matching size_options (lines 4940-4951). Route by type: instant (gift_card/spark_ads/experience) empty body, scheduled (discount/commission_boost) with scheduledActivationAt, physical_gift with shippingInfo+optional sizeValue. Apply redemption period reset rules (lines 4953-4965). Return 10 error types (lines 5138-5238): ACTIVE_CLAIM_EXISTS, LIMIT_REACHED, SCHEDULING_REQUIRED, INVALID_SCHEDULE, INVALID_TIME_SLOT, SHIPPING_INFO_REQUIRED, SIZE_REQUIRED, INVALID_SIZE_SELECTION, TIER_NOT_ELIGIBLE, CLAIM_FAILED
    - **Acceptance Criteria:** Validates all 11 pre-claim rules (lines 4902-4951), checks tier eligibility matches current_tier (line 4907), checks no active redemption (lines 4909-4917), enforces tier-specific usage limits (lines 4919-4931), validates discount scheduling weekday + 09:00-16:00 EST (lines 4933-4936), auto-sets commission_boost time to 18:00:00 EST (lines 4937-4939), validates physical_gift shippingInfo + size requirements (lines 4940-4951), routes by reward type (instant/scheduled/physical), applies redemption period reset rules (lines 4953-4965), throws specific error types, calls repository.redeemReward, returns complete response with updatedRewards array, follows service layer patterns

- [ ] **Task 6.2.4:** Implement claimInstant function
    - **Action:** Add function for instant reward (code revealed immediately)
    - **References:** MissionsRewardsFlows.md (Instant Reward Flow)
    - **Acceptance Criteria:** Returns redemption with reward_code/voucher

- [ ] **Task 6.2.5:** Implement claimScheduled function
    - **Action:** Add function for scheduled reward (delivered via email)
    - **References:** MissionsRewardsFlows.md (Scheduled Reward Flow)
    - **Acceptance Criteria:** Sets delivery_date, queues email job

- [ ] **Task 6.2.6:** Implement claimPhysical function
    - **Action:** Add function requiring shipping address
    - **References:** MissionsRewardsFlows.md (Physical Gift Flow)
    - **Acceptance Criteria:** Creates physical_gift_states, validates address provided

- [ ] **Task 6.2.7:** Implement claimCommissionBoost function
    - **Action:** Add function to activate boost and auto-sync
    - **References:** Loyalty.md Pattern 4 (Auto-Sync), Pattern 7 (Boost History)
    - **Acceptance Criteria:** Creates boost state, trigger updates users.current_commission_boost, logs activation

- [ ] **Task 6.2.8:** Implement getRewardHistory function
    - **Action:** Add function that formats concluded redemptions using same backend formatting rules as GET /api/rewards
    - **References:** API_CONTRACTS.md lines 5413-5554 (GET /api/rewards/history complete response with backend formatting)
    - **Implementation Guide:** MUST call repository to get concluded redemptions, then format name and description for each history item using SAME logic as GET /api/rewards (lines 5469-5481): gift_card name="$"+amount+" Gift Card" description="Amazon Gift Card", commission_boost name=percent+"% Pay Boost" description="Higher earnings ("+durationDays+"d)", spark_ads name="$"+amount+" Ads Boost" description="Spark Ads Promo", discount name=percent+"% Deal Boost" description="Follower Discount ("+durationDays+"d)", physical_gift name="Gift Drop: "+description description=valueData.displayText||description, experience name=description description=valueData.displayText||description. Return two sections (lines 5444-5466): user info (id, handle, currentTier, currentTierName, currentTierColor from users JOIN tiers) and history array with backend-formatted name/description. NO pagination per API spec. Frontend notes (lines 5528-5534): show "Completed" badge (not "concluded"), display "Completed on [date]" using concludedAt, empty state message
    - **Acceptance Criteria:** Returns complete RedemptionHistoryResponse matching lines 5444-5466, calls repository for concluded redemptions, formats name and description using SAME rules as GET /api/rewards per lines 5469-5481 (6 reward types), includes user section with id/handle/currentTier/currentTierName/currentTierColor, includes history array sorted by concludedAt DESC, NO pagination (API spec shows none), follows service layer patterns

- [ ] **Task 6.2.9:** Implement getPaymentInfo service function
    - **Action:** Add function that calls repository and returns formatted payment info response
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info complete response structure), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Implementation Guide:** Call repository to get decrypted payment info from users table. Return PaymentInfoResponse object (lines 5260-5264): hasPaymentInfo boolean (true if default_payment_method IS NOT NULL), paymentMethod ('paypal'|'venmo'|null), paymentAccount (decrypted string|null). Full unmasked account returned since user is authenticated (line 5263). Two scenarios: if saved return hasPaymentInfo=true (lines 5269-5275), if not saved return hasPaymentInfo=false with all nulls (lines 5278-5285)
    - **Acceptance Criteria:** Returns PaymentInfoResponse matching lines 5260-5264, calls repository.getPaymentInfo for decrypted data, returns hasPaymentInfo boolean, returns paymentMethod ('paypal'|'venmo'|null), returns full unmasked paymentAccount (decrypted, line 5263), returns hasPaymentInfo=false with null values if no saved info (lines 5278-5285), follows service layer patterns

- [ ] **Task 6.2.10:** Implement savePaymentInfo service function
    - **Action:** Add function that validates 4 rules, verifies status, and calls repository
    - **References:** API_CONTRACTS.md lines 5290-5412 (POST /api/rewards/:id/payment-info with 4 validation rules), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Implementation Guide:** MUST validate 4 rules before calling repository (lines 5370-5400): (1) verify paymentAccount === paymentAccountConfirm, throw PAYMENT_ACCOUNT_MISMATCH error if not match (lines 5370-5375), (2) if paymentMethod='paypal' validate email format with regex, throw INVALID_PAYPAL_EMAIL if invalid (lines 5378-5383), (3) if paymentMethod='venmo' validate handle starts with @, throw INVALID_VENMO_HANDLE if not (lines 5386-5391), (4) verify redemption.status='pending_info', throw PAYMENT_INFO_NOT_REQUIRED (403) if status is not 'pending_info' (lines 5394-5400). PaymentMethod enum ONLY 'paypal' or 'venmo' (line 5307, NOT zelle or bank_account). After validation, call repository to encrypt and save payment info, update status to 'fulfilled', optionally save to user defaults if saveAsDefault=true
    - **Acceptance Criteria:** Validates paymentMethod enum is 'paypal' or 'venmo' ONLY (line 5307), validates 4 rules: (1) paymentAccount === paymentAccountConfirm (lines 5370-5375), (2) PayPal email format (lines 5378-5383), (3) Venmo @ prefix (lines 5386-5391), (4) status='pending_info' (lines 5394-5400), throws specific error types for each validation failure, calls repository.savePaymentInfo with encrypted payment_account, updates status to 'fulfilled', handles saveAsDefault logic for user defaults, returns complete response with userPaymentUpdated boolean, follows service layer patterns

## Step 6.3: Reward API Routes
- [ ] **Task 6.3.1:** Create rewards list route
    - **Action:** Create `/app/api/rewards/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 4045-4809 (GET /api/rewards for Rewards page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST return complex rewards page response with PRE-COMPUTED status and availability (lines 4059-4138): (1) User & Tier Info with currentTier/currentTierName/currentTierColor (lines 4061-4067), (2) redemptionCount for history link COUNT of status='concluded' (lines 4069-4070), (3) rewards array sorted by actionable priority with 10 possible statuses (clearing, sending, active, pending_info, scheduled, redeeming_physical, redeeming, claimable, limit_reached, locked) (lines 4096-4099), each reward includes backend-formatted name and displayText per type (lines 4142-4161): gift_card "$50 Gift Card" / "Amazon Gift Card", commission_boost "5% Pay Boost" / "Higher earnings (30d)", spark_ads "$100 Ads Boost" / "Spark Ads Promo", discount "15% Deal Boost" / "Follower Discount (7d)", physical_gift "Gift Drop: {description}" / valueData.displayText, experience description / valueData.displayText. Computed availability: canClaim (tier match + limit + enabled + no active claim), isLocked (tier_eligibility != current_tier), isPreview (preview_from_tier) (lines 4101-4104). Usage tracking: usedCount filtered by mission_progress_id IS NULL AND tier_at_claim = current_tier (line 4107), totalQuantity from redemption_quantity (line 4108). StatusDetails with formatted dates/times: scheduledDate, activationDate, expirationDate, daysRemaining, shippingCity, clearingDays (lines 4115-4131). RedemptionFrequency (one-time, monthly, weekly, unlimited) and redemptionType (instant, scheduled) (lines 4133-4137)
    - **Acceptance Criteria:** MUST return `{ user: {id, handle, currentTier, currentTierName, currentTierColor}, redemptionCount: number, rewards: [{id, type, name, description, displayText, valueData, status, canClaim, isLocked, isPreview, usedCount, totalQuantity, tierEligibility, requiredTierName, displayOrder, statusDetails, redemptionFrequency, redemptionType}] }` per lines 4059-4138, filters by user's tier/client_id/enabled per Section 10.1, includes 10 possible reward statuses (lines 4096-4099), backend generates name and displayText per type (lines 4142-4161), computes canClaim based on tier + limit + enabled + no active claim (line 4102), computes isLocked for tier_eligibility mismatch (line 4103), includes isPreview for preview_from_tier rewards (line 4104), tracks usedCount for VIP tier rewards WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier (line 4107), provides statusDetails with formatted dates (lines 4115-4131), includes redemptionFrequency and redemptionType (lines 4133-4137), returns 200 or 401/500, follows route pattern from Section 5

- [ ] **Task 6.3.2:** Create claim reward route
    - **Action:** Create `/app/api/rewards/[rewardId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 4810-5241 (POST /api/rewards/:id/claim VIP tier rewards only), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Claim Validation, lines 1201-1294)
    - **Implementation Guide:** MUST implement 11-step pre-claim validation (lines 4902-4951): (1) authentication JWT required (line 4904), (2) reward exists (line 4905), (3) rewards.enabled=true (line 4906), (4) reward.tier_eligibility matches user.current_tier (line 4907), (5) VIP tier reward only (mission_progress_id IS NULL) (line 4908), (6) no active redemption WHERE status IN ('claimed', 'fulfilled') (lines 4909-4917), (7) usage limit check COUNT < redemption_quantity WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier AND created_at >= tier_achieved_at (lines 4919-4931), (8) scheduling required for discount/commission_boost (line 4932), (9) discount scheduling: weekday Mon-Fri + time 09:00-16:00 EST + future date (lines 4933-4936), (10) commission_boost scheduling: future date + time auto-set to 18:00:00 EST (lines 4937-4939), (11) physical_gift requirements: shippingInfo required + sizeValue if requires_size=true + must match size_options (lines 4940-4951). Request body varies (lines 4827-4898): instant rewards empty, scheduled rewards scheduledActivationAt ISO 8601, physical gifts shippingInfo + optional sizeValue. Redemption period reset rules (lines 4953-4965): gift_card/physical_gift/experience once forever, commission_boost/spark_ads/discount once per tier achievement (re-claimable on re-promotion). 10 error types (lines 5138-5238): ACTIVE_CLAIM_EXISTS, LIMIT_REACHED, SCHEDULING_REQUIRED, INVALID_SCHEDULE (weekend), INVALID_TIME_SLOT, SHIPPING_INFO_REQUIRED, SIZE_REQUIRED, INVALID_SIZE_SELECTION, TIER_NOT_ELIGIBLE, CLAIM_FAILED
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemption: {id, status: 'claimed', rewardType, claimedAt, reward: {id, name, displayText, type, valueData}, scheduledActivationAt?, usedCount, totalQuantity, nextSteps: {action, message}}, updatedRewards: [{id, status, canClaim, usedCount}] }` per lines 4971-5018, implements all 11 validation steps per lines 4902-4951 and Section 10.1 table lines 1203-1211, validates tier eligibility matches current_tier (line 4907), checks no active redemption status IN ('claimed', 'fulfilled') (lines 4909-4917), enforces usage limits with tier-specific count WHERE mission_progress_id IS NULL AND tier_at_claim = current_tier AND created_at >= tier_achieved_at (lines 4919-4931), validates discount scheduling weekday + 09:00-16:00 EST (lines 4933-4936), auto-sets commission_boost time to 18:00:00 EST (lines 4937-4939), validates physical_gift shippingInfo + size requirements (lines 4940-4951), accepts varying request body per reward type (lines 4827-4898), applies redemption period reset rules once forever vs once per tier (lines 4953-4965), returns 200 for success or 400/403/404/500 for 10 error types (lines 5138-5238), follows route pattern from Section 5

- [ ] **Task 6.3.3:** Create reward history route
    - **Action:** Create `/app/api/rewards/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5413-5554 (GET /api/rewards/history for Rewards History page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.1 (Rewards Authorization, lines 1160-1198)
    - **Implementation Guide:** MUST retrieve user's concluded reward redemptions (archived/completed history) that have reached terminal "concluded" state only (lines 5415, 5440). Backend query (lines 5428-5442): SELECT redemptions.id, reward_id, rewards.type, rewards.name, rewards.description, claimed_at, concluded_at FROM redemptions INNER JOIN rewards WHERE user_id=current_user AND status='concluded' ORDER BY concluded_at DESC. Response includes two sections (lines 5444-5466): user info (id, handle, currentTier, currentTierName, currentTierColor) and history array of concluded redemptions. Backend MUST format name and description fields using SAME logic as GET /api/rewards (lines 5469-5481): gift_card name="$"+amount+" Gift Card" description="Amazon Gift Card", commission_boost name=percent+"% Pay Boost" description="Higher earnings ("+durationDays+"d)", spark_ads name="$"+amount+" Ads Boost" description="Spark Ads Promo", discount name=percent+"% Deal Boost" description="Follower Discount ("+durationDays+"d)", physical_gift name="Gift Drop: "+description description=valueData.displayText||description, experience name=description description=valueData.displayText||description. Each history item includes: id (redemptions.id), rewardId (redemptions.reward_id FK), name (backend-formatted), description (backend-formatted displayText), type (RewardType enum), claimedAt (ISO 8601 timestamp when claimed), concludedAt (ISO 8601 timestamp when moved to history), status='concluded' (always 'concluded' in history, line 5464). Frontend display notes (lines 5528-5534): show "Completed" badge instead of "Concluded", display "Completed on [date]" using concludedAt, show "No redemption history yet" for empty array, backend returns sorted by concludedAt DESC. NO pagination (API spec shows no pagination parameters in request or response). Return errors: UNAUTHORIZED 401 (lines 5537-5542), SERVER_ERROR 500 (lines 5545-5551)
    - **Acceptance Criteria:** MUST return `{ user: { id, handle, currentTier, currentTierName, currentTierColor }, history: Array<{ id, rewardId, name, description, type, claimedAt, concludedAt, status }> }` per lines 5444-5466, auth middleware verifies user (line 5423), filters by client_id per Section 10.1, queries redemptions WHERE status='concluded' with INNER JOIN rewards (lines 5428-5442), backend formats name and description using same rules as GET /api/rewards per lines 5469-5481, returns sorted by concluded_at DESC (line 5441), NO pagination (no offset/limit/page parameters), returns 200 with user info and history array or 401/500 for errors per lines 5537-5551, follows route pattern from Section 5

- [ ] **Task 6.3.4:** Create get payment info route
    - **Action:** Create `/app/api/user/payment-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5246-5289 (GET /api/user/payment-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)
    - **Implementation Guide:** MUST retrieve user's saved payment information for pre-filling payment modals for commission boost payouts (line 5248). Returns full unmasked account since user is authenticated (line 5263). Two response scenarios (lines 5269-5285): if payment info exists return hasPaymentInfo=true with paymentMethod and paymentAccount, if no saved info return hasPaymentInfo=false with null values. PaymentMethod enum 'paypal' or 'venmo' (line 5262). Backend must decrypt payment_account from database using encryption utility (Pattern 9 Sensitive Data Encryption)
    - **Acceptance Criteria:** MUST return `{ hasPaymentInfo: boolean, paymentMethod: 'paypal'|'venmo'|null, paymentAccount: string|null }` per lines 5260-5264, auth middleware verifies user, filters by client_id per Section 10.3, calls rewardService.getPaymentInfo, decrypts payment_account field (Pattern 9), returns full unmasked account for authenticated user (line 5263), returns 200 with hasPaymentInfo=true if info exists (lines 5269-5275) OR 200 with hasPaymentInfo=false and null values if no saved info (lines 5278-5285), NOT 404, follows route pattern from Section 5

- [ ] **Task 6.3.5:** Create save payment info route
    - **Action:** Create `/app/api/rewards/[rewardId]/payment-info/route.ts` with POST handler
    - **References:** API_CONTRACTS.md lines 5290-5412 (POST /api/rewards/:id/payment-info), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.4 (Validation Checklist Template, lines 1396-1401)
    - **Implementation Guide:** MUST submit payment information for commission boost payout (line 5292). Request body requires 4 fields (lines 5305-5310): paymentMethod enum 'paypal'|'venmo', paymentAccount string, paymentAccountConfirm string (must match paymentAccount), saveAsDefault boolean (saves to users.default_payment_* if true). Validation rules: (1) verify paymentAccount === paymentAccountConfirm return PAYMENT_ACCOUNT_MISMATCH if not (lines 5370-5375), (2) validate PayPal email format return INVALID_PAYPAL_EMAIL if invalid (lines 5378-5383), (3) validate Venmo handle starts with @ return INVALID_VENMO_HANDLE if not (lines 5386-5391), (4) verify redemption status is 'pending_info' return PAYMENT_INFO_NOT_REQUIRED (403) if not (lines 5394-5400). Backend processing: update redemption with encrypted payment_account (Pattern 9), update redemption.status to 'fulfilled' (line 5343), set paymentInfoCollectedAt timestamp (line 5345), if saveAsDefault=true update users.default_payment_method and users.default_payment_account (line 5309). Return 5 error types (lines 5368-5409): PAYMENT_ACCOUNT_MISMATCH, INVALID_PAYPAL_EMAIL, INVALID_VENMO_HANDLE, PAYMENT_INFO_NOT_REQUIRED (403), REWARD_NOT_FOUND (404)
    - **Acceptance Criteria:** MUST return `{ success: boolean, message: string, redemption: {id, status: 'fulfilled', paymentMethod, paymentInfoCollectedAt: string}, userPaymentUpdated: boolean }` per lines 5338-5348, Zod validates request body with 4 fields paymentMethod/paymentAccount/paymentAccountConfirm/saveAsDefault per Section 10.4, validates paymentAccount === paymentAccountConfirm (lines 5370-5375), validates PayPal email format (lines 5378-5383), validates Venmo handle starts with @ (lines 5386-5391), verifies redemption status is 'pending_info' (lines 5394-5400), encrypts payment_account before storing (Pattern 9), updates redemption.status to 'fulfilled' (line 5343), sets paymentInfoCollectedAt ISO 8601 timestamp (line 5345), saves to users default payment if saveAsDefault=true (line 5309, 5347), calls rewardService.savePaymentInfo, returns 200 for success or 400/403/404 for 5 error types (lines 5368-5409), follows route pattern from Section 5

## Step 6.4: Reward Testing
- [ ] **Task 6.4.1:** Create reward service tests
    - **Action:** Create `/tests/integration/services/rewardService.test.ts`
    - **Acceptance Criteria:** File exists

- [ ] **Task 6.4.2:** Test points deduction
    - **Action:** Write test verifying points correctly deducted
    - **Acceptance Criteria:** User points reduced by reward cost

- [ ] **Task 6.4.3:** Test insufficient points
    - **Action:** Write test attempting claim without enough points
    - **Acceptance Criteria:** Returns 400, redemption not created

- [ ] **Task 6.4.4:** Test usage limit
    - **Action:** Write test hitting max_uses_per_user
    - **Acceptance Criteria:** Nth+1 redemption fails with 400

- [ ] **Task 6.4.5:** Test tier isolation
    - **Action:** Write test verifying lower-tier user cannot claim higher-tier reward
    - **Acceptance Criteria:** Returns 403, redemption not created

- [ ] **Task 6.4.6:** Test commission boost lifecycle
    - **Action:** Write test for boost activation → auto-sync → deactivation
    - **References:** Loyalty.md Pattern 4, 7
    - **Acceptance Criteria:** users.current_commission_boost updated, history logged

- [ ] **Task 6.4.7:** Test address encryption
    - **Action:** Write test verifying physical_gift_states.encrypted_address is encrypted
    - **References:** Loyalty.md Pattern 9
    - **Acceptance Criteria:** Raw address not visible in DB, decrypts correctly

---

# PHASE 7: HISTORY & TIERS APIS

**Objective:** Implement mission/reward history and tier listing endpoints.

## Step 7.1: History Endpoints
- [ ] **Task 7.1.1:** Verify mission history (already implemented in Phase 5.3.4)
    - **Command:** `curl -H "Authorization: Bearer [token]" http://localhost:3000/api/missions/history`
    - **Acceptance Criteria:** Returns 200 with mission history

- [ ] **Task 7.1.2:** Verify reward history (already implemented in Phase 6.3.3)
    - **Command:** `curl -H "Authorization: Bearer [token]" http://localhost:3000/api/rewards/history`
    - **Acceptance Criteria:** Returns 200 with reward history

## Step 7.2: Tiers API
- [ ] **Task 7.2.1:** Create tier repository file
    - **Action:** Create `/lib/repositories/tierRepository.ts`
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers), ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern, includes functions for querying vip_tiers with rewards/missions aggregation per Section 5

- [ ] **Task 7.2.2:** Implement tier repository query functions
    - **Action:** Add functions for tier data with rewards aggregation
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers response schema and business logic), SchemaFinalv2.md (vip_tiers, rewards, missions tables), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter by client_id (Section 9 Critical Rule #1), queries vip_tiers with tier_level filtering (lines 6043-6050), includes rewards aggregation with priority sorting (lines 6062-6084), calculates total perks count (lines 6105-6125), returns tier data ordered by tier_level ASC

- [ ] **Task 7.2.3:** Create tier service file
    - **Action:** Create `/lib/services/tierService.ts`
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers), ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns, implements VIP metric-aware formatting logic (lines 6086-6098), reward displayText generation (lines 6643-6658), expiration logic (lines 6052-6061)

- [ ] **Task 7.2.4:** Implement getTiersPageData service function
    - **Action:** Add function with business logic for tier progression calculations
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers response schema with user progress and tier filtering)
    - **Implementation Guide:** MUST implement complex response structure with 4 sections (lines 5573-5640): user progress (9 fields including VIP metric-aware formatting), progress to next tier (6 calculated fields: nextTierName, nextTierTarget, nextTierTargetFormatted, amountRemaining, amountRemainingFormatted, progressPercentage, progressText), vipSystem config (metric field), tiers array (user-scoped filtered). VIP metric-aware formatting (lines 6086-6098): if metric='sales_dollars' format as "$2,100" and "$680 to go", if metric='sales_units' format as "2,100 units" and "680 units to go". Tier filtering: only return tiers where tier_level >= user's current tier_level (lines 6043-6050). Progress calculations: amountRemaining = nextTierTarget - currentSales, progressPercentage = (currentSales / nextTierTarget) * 100. Expiration logic (lines 6052-6061): tierLevel=1 Bronze never expires (expirationDate=null, showExpiration=false), tierLevel>1 6-month checkpoint (expirationDate ISO 8601, showExpiration=true)
    - **Acceptance Criteria:** Returns complete response matching lines 5573-5640, implements tier_level filtering (user sees only current+higher tiers), calculates all progress fields, applies VIP metric formatting to ALL numeric fields, implements expiration logic, calls repository for tier/rewards data

- [ ] **Task 7.2.5:** Create tiers route
    - **Action:** Create `/app/api/tiers/route.ts` with GET handler
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers for Tiers page), ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10.3 (Tenant Isolation Pattern, lines 1328-1343)
    - **Implementation Guide:** MUST return tier progression information with 4 major sections (lines 5573-5640). User progress section (lines 5574-5585): id, currentTier (tier_id like "tier_2"), currentTierName ("Bronze"/"Silver"/"Gold"/"Platinum"), currentTierColor (hex from tiers.tier_color: Bronze=#CD7F32, Silver=#94a3b8, Gold=#F59E0B, Platinum=#818CF8), currentSales (raw number), currentSalesFormatted (VIP metric-aware: "$2,100" or "2,100 units"), expirationDate (ISO 8601 or null), expirationDateFormatted ("August 10, 2025" or null), showExpiration (true if tierLevel>1). Progress section (lines 5587-5596): nextTierName, nextTierTarget (raw number), nextTierTargetFormatted (VIP metric-aware), amountRemaining (calculated: nextTierTarget - currentSales), amountRemainingFormatted, progressPercentage (calculated: currentSales/nextTierTarget*100), progressText (VIP metric-aware: "$680 to go" or "680 units to go"). VipSystem section (lines 5598-5601): metric enum 'sales_dollars' or 'sales_units' from vip_system_settings table controls ALL numeric formatting. Tiers array (lines 5603-5639): user-scoped filtered WHERE tier_level >= user's current tier_level (lines 6043-6050), each tier includes name, color, tierLevel (1-4), minSales (raw + formatted), salesDisplayText (VIP metric-aware: "$1,000+ in sales" or "1,000+ in units sold"), commissionRate (integer percentage), commissionDisplayText ("{rate}% Commission on sales"), isUnlocked (tier_level <= user's tier_level), isCurrent (boolean), totalPerksCount (sum of reward uses + mission reward uses, lines 6105-6125), rewards array (max 4 per tier, lines 6629-6639). Rewards aggregation (lines 6062-6084): group by type+isRaffle, sum uses for count, apply 9-priority sorting (1=physical_gift raffle, 2=experience raffle, 3=gift_card raffle, 4=experience, 5=physical_gift, 6=gift_card, 7=commission_boost, 8=spark_ads, 9=discount), generate displayText per lines 6643-6658 (raffle: "Chance to win {name}!", non-raffle varies by type), slice to max 4 rewards. Return errors: UNAUTHORIZED 401. Backend does NOT send icon names (frontend maps types to Lucide icons, lines 6126-6139)
    - **Acceptance Criteria:** MUST return `{ user: { id, currentTier, currentTierName, currentTierColor, currentSales, currentSalesFormatted, expirationDate, expirationDateFormatted, showExpiration }, progress: { nextTierName, nextTierTarget, nextTierTargetFormatted, amountRemaining, amountRemainingFormatted, progressPercentage, progressText }, vipSystem: { metric }, tiers: Array<{ name, color, tierLevel, minSales, minSalesFormatted, salesDisplayText, commissionRate, commissionDisplayText, isUnlocked, isCurrent, totalPerksCount, rewards: Array<{ type, isRaffle, displayText, count, sortPriority }> }> }` per lines 5573-5640, auth middleware verifies user, filters by client_id per Section 10.3, queries vipSystem.metric from vip_system_settings table, applies VIP metric-aware formatting to ALL numeric fields per lines 6086-6098, filters tiers WHERE tier_level >= user's current tier_level per lines 6043-6050, implements expiration logic (Bronze null, others 6-month) per lines 6052-6061, aggregates rewards by type+isRaffle per lines 6062-6084, applies 9-priority sorting and limits to 4 rewards per tier, generates reward displayText with raffle vs non-raffle formatting per lines 6643-6658, calculates totalPerksCount as sum of reward uses + mission reward uses per lines 6105-6125, calculates progress fields (amountRemaining, progressPercentage, progressText), returns 200 with complete response or 401 for unauthorized, follows route pattern from Section 5

## Step 7.3: Tiers Testing
- [ ] **Task 7.3.1:** Create tier API tests
    - **Action:** Create `/tests/integration/api/tiers.test.ts`
    - **References:** API_CONTRACTS.md lines 5559-6140 (GET /api/tiers response structure and business logic)
    - **Acceptance Criteria:** Tests verify: (1) response includes all 4 sections (user, progress, vipSystem, tiers), (2) user-scoped tier filtering (Bronze user sees 4 tiers, Silver user sees 3 tiers per lines 6043-6050), (3) VIP metric-aware formatting (sales_dollars shows "$2,100", sales_units shows "2,100 units" per lines 6086-6098), (4) rewards aggregation with max 4 per tier sorted by priority 1-9 per lines 6062-6084, (5) expiration logic (Bronze null, Silver+ has ISO 8601 date per lines 6052-6061), (6) progress calculations (amountRemaining, progressPercentage, progressText), (7) totalPerksCount calculation, (8) isUnlocked and isCurrent flags, (9) commission rates displayed correctly

- [ ] **Task 7.3.2:** Test tier progression calculations
    - **Action:** Write tests verifying progress field calculations
    - **References:** API_CONTRACTS.md lines 5587-5596 (progress section with calculated fields)
    - **Acceptance Criteria:** Tests verify: (1) nextTierTarget correct for user's tier, (2) amountRemaining = nextTierTarget - currentSales, (3) progressPercentage = (currentSales / nextTierTarget) * 100, (4) progressText formatted with VIP metric ("$680 to go" or "680 units to go"), (5) Bronze user shows Silver as next tier, (6) Platinum user at max tier handled correctly

---

# PHASE 8: AUTOMATION & CRON JOBS

**Objective:** Implement daily sales sync and tier calculation automation.

## Step 8.1: Cron Infrastructure
- [ ] **Task 8.1.1:** Create cron directory
    - **Action:** Create `/app/api/cron/` directory
    - **Acceptance Criteria:** Directory exists

- [ ] **Task 8.1.2:** Configure Vercel cron with timing rationale
    - **Action:** Add cron config to `vercel.json` with schedule `"0 23 * * *"` (6 PM EST / 11 PM UTC)
    - **References:** Loyalty.md lines 58-65 (Daily automation timing rationale: aligns with commission boost activation time for accurate sales snapshots, MVP starts daily with easy hourly upgrade path)
    - **Acceptance Criteria:** Config schedules daily-sync at 0 23 * * *, includes comment documenting timing rationale and upgrade triggers (>10% support tickets about delays, user requests, or 500+ creators)

## Step 8.2: Daily Sales Sync
- [ ] **Task 8.2.1:** Create CSV parser utility
    - **Action:** Create `/lib/utils/csvParser.ts`
    - **References:** Loyalty.md Flow 1 (Daily Sales Sync)
    - **Acceptance Criteria:** Parses CSV with columns: tiktok_handle, video_link, sales_amount, date

- [ ] **Task 8.2.2:** Create sales service file
    - **Action:** Create `/lib/services/salesService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 8.2.3:** Implement processDailySales function
    - **Action:** Add transactional function to: fetch CSV from R2, parse rows, insert/update sales_adjustments, update user totals
    - **References:** SchemaFinalv2.md (videos, sales_adjustments tables), Loyalty.md Pattern 1 (Transactional), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
    - **Acceptance Criteria:** MUST filter all queries by client_id (Section 9 Critical Rule #1), MUST use transaction, handle duplicates (upsert), update users.total_sales and precomputed fields

- [ ] **Task 8.2.3a:** Add updatePrecomputedFields function to daily sync
    - **Action:** Add SQL to update all 16 precomputed fields on users table after sales data sync: total_sales, total_units, manual_adjustments_total, manual_adjustments_units, checkpoint_sales_current, checkpoint_units_current, checkpoint_videos_posted, checkpoint_total_views, checkpoint_total_likes, checkpoint_total_comments, next_tier_name, next_tier_threshold, next_tier_threshold_units, checkpoint_progress_updated_at
    - **References:** ARCHITECTURE.md Section 3.1 (lines 176-207 - SQL for updating precomputed fields)
    - **Acceptance Criteria:** Function aggregates data from videos, sales_adjustments, and vip_tiers tables, updates all 16 fields in single transaction, handles both sales mode and units mode based on client.vip_metric

- [ ] **Task 8.2.3b:** Add updateLeaderboardRanks function to daily sync
    - **Action:** Add SQL to calculate and update leaderboard_rank for all users based on total_sales or total_units
    - **References:** ARCHITECTURE.md Section 3.1 (lines 196-207 - Leaderboard rank calculation)
    - **Acceptance Criteria:** Uses ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY total_sales DESC) to assign ranks, updates users.leaderboard_rank

- [ ] **Task 8.2.4:** Create daily-sync cron route
    - **Action:** Create `/app/api/cron/daily-sync/route.ts` with GET handler
    - **References:** Loyalty.md Flow 1
    - **Acceptance Criteria:** Verifies cron secret, calls salesService.processDailySales

- [ ] **Task 8.2.5:** Add error monitoring
    - **Action:** Integrate Resend for failure alerts
    - **References:** Loyalty.md (Automation Monitoring)
    - **Acceptance Criteria:** Email sent to admin on cron failure

## Step 8.3: Tier Calculation
- [ ] **Task 8.3.1:** Create tier calculation service
    - **Action:** Add runTierCalculations function to tierService
    - **References:** API_CONTRACTS.md lines 5559-6140 (tier_level structure and min_sales thresholds), Loyalty.md Flow 7 (Auto Tier Advancement)
    - **Implementation Guide:** MUST query vip_tiers ordered by tier_level DESC to find highest tier where user's total_sales >= tier's min_sales. Tier thresholds from API spec: Bronze tier_level=1 min_sales=0, Silver tier_level=2 min_sales=1000, Gold tier_level=3 min_sales=3000, Platinum tier_level=4 min_sales=5000. Update user's current_tier to matching tier_id and set tier_achieved_at timestamp for redemption period tracking
    - **Acceptance Criteria:** Queries users and vip_tiers tables, compares total_sales to min_sales thresholds per API spec tier structure (0, 1000, 3000, 5000), updates user's current_tier to highest qualifying tier_level, sets tier_achieved_at timestamp when tier changes for redemption period reset tracking

- [ ] **Task 8.3.2:** Integrate with daily-sync
    - **Action:** Call tierService.runTierCalculations after sales processing
    - **References:** Loyalty.md Flow 1
    - **Acceptance Criteria:** Tiers updated after each daily sync

- [ ] **Task 8.3.3:** Add tier change notifications
    - **Action:** Send email via Resend when user tier advances
    - **References:** Loyalty.md Flow 7
    - **Acceptance Criteria:** Email sent to user with new tier info

## Step 8.4: Manual Upload
- [ ] **Task 8.4.1:** Create manual upload route
    - **Action:** Create `/app/api/cron/manual-upload/route.ts` with POST handler
    - **References:** Loyalty.md Flow 2 (Manual Sales Adjustment Upload)
    - **Acceptance Criteria:** Admin can upload CSV ad-hoc, triggers same processDailySales

## Step 8.5: Cron Testing
- [ ] **Task 8.5.1:** Create cron integration tests
    - **Action:** Create `/tests/integration/cron/daily-sync.test.ts`
    - **Acceptance Criteria:** File exists

- [ ] **Task 8.5.2:** Test CSV parsing
    - **Action:** Write test with fixture CSV
    - **Acceptance Criteria:** Correctly parses all rows

- [ ] **Task 8.5.3:** Test sales upsert
    - **Action:** Write test verifying duplicates handled
    - **Acceptance Criteria:** Duplicate video_link + date updates existing record

- [ ] **Task 8.5.4:** Test tier advancement
    - **Action:** Write test where user crosses threshold
    - **Acceptance Criteria:** User tier_id updated, notification sent

- [ ] **Task 8.5.5:** Manual dry run
    - **Action:** Manually trigger cron with test data
    - **Acceptance Criteria:** Verify in Supabase that sales_adjustments and user tiers updated

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

- [ ] **Task 11.2.6:** Audit Critical Pattern #5 (Status Validation)
    - **Action:** Verify API contracts return correct status codes
    - **References:** Integration tests for all endpoints
    - **Acceptance Criteria:** Tests verify 200, 400, 401, 404, 500 responses

- [ ] **Task 11.2.7:** Audit Critical Pattern #6 (VIP Reward Lifecycle)
    - **Action:** Verify reward claim flow handles all reward types
    - **References:** rewardService.claimReward routing logic
    - **Acceptance Criteria:** Instant, scheduled, physical, commission boost all implemented

- [ ] **Task 11.2.8:** Audit Critical Pattern #7 (Commission Boost State History)
    - **Action:** Verify commission_boost_history logging
    - **Command:** Query commission_boost_history table after boost activation/deactivation
    - **Acceptance Criteria:** History records created with correct action enum

- [ ] **Task 11.2.9:** Audit Critical Pattern #8 (Multi-Tenant Query Isolation)
    - **Action:** Verify all repository queries include client_id filter
    - **References:** Code inspection of all repository files
    - **Acceptance Criteria:** No query lacks client_id filter

- [ ] **Task 11.2.10:** Audit Critical Pattern #9 (Sensitive Data Encryption)
    - **Action:** Verify email, phone, address encrypted at rest
    - **Command:** `psql -c "SELECT encrypted_email FROM users LIMIT 1;"`
    - **Acceptance Criteria:** Data is encrypted (not plain text)

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
- [ ] GET /api/cron/daily-sync
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
