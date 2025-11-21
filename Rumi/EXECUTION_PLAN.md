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
    - **Action:** Add INSERT INTO vip_tiers with Fan, Supporter, VIP, Super Fan tiers
    - **References:** Loyalty.md Core Features (VIP Tiers section)
    - **Acceptance Criteria:** All 4 tiers with correct commission rates and benefits

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
    - **References:** ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063), Section 10 (Authorization & Security Checklists, lines 1064-1337)
    - **Acceptance Criteria:** Functions extract user from JWT, validate client_id presence, follow security patterns from Section 10

- [ ] **Task 2.3.2:** Create encryption utility
    - **Action:** Create `/lib/utils/encryption.ts` with encrypt/decrypt functions using AES-256-GCM
    - **References:** Loyalty.md Pattern 9 (Sensitive Data Encryption)
    - **Acceptance Criteria:** Encrypt/decrypt functions work, use ENCRYPTION_KEY from env

- [ ] **Task 2.3.3:** Create validation utility
    - **Action:** Create `/lib/utils/validation.ts` with Zod schemas for common validations
    - **References:** API_CONTRACTS.md (request schemas)
    - **Acceptance Criteria:** Schemas for email, handle, UUID formats

- [ ] **Task 2.3.4:** Create error handling utility
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
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 8 (Multi-Tenant Query Isolation), ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063)
    - **Acceptance Criteria:** Query MUST filter by client_id AND tiktok_handle, follows tenant isolation rules from Section 9

- [ ] **Task 3.1.3:** Implement findByEmail function
    - **Action:** Add function with signature `findByEmail(clientId: string, email: string)`
    - **References:** SchemaFinalv2.md (users table), Loyalty.md Pattern 9
    - **Acceptance Criteria:** MUST decrypt encrypted_email for comparison, filter by client_id

- [ ] **Task 3.1.4:** Implement create function
    - **Action:** Add function to insert new user with encrypted fields
    - **References:** Loyalty.md Flow 3 (Signup), Pattern 9
    - **Acceptance Criteria:** MUST encrypt email/phone before insert, return created user

- [ ] **Task 3.1.5:** Implement updateLastLogin function
    - **Action:** Add function to update last_login_at timestamp
    - **References:** Loyalty.md Flow 5 (Login)
    - **Acceptance Criteria:** Updates users.last_login_at to now()

- [ ] **Task 3.1.6:** Create OTP repository file
    - **Action:** Create `/lib/repositories/otpRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 3.1.7:** Implement OTP CRUD functions
    - **Action:** Add create, findValid, markUsed, deleteExpired
    - **References:** Loyalty.md Flow 3/4 (OTP verification)
    - **Acceptance Criteria:** Functions enforce expiration check, single-use

- [ ] **Task 3.1.8:** Create client repository file
    - **Action:** Create `/lib/repositories/clientRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 3.1.9:** Implement findById function
    - **Action:** Add function to fetch client by UUID
    - **References:** SchemaFinalv2.md (clients table)
    - **Acceptance Criteria:** Returns client or null

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
    - **References:** API_CONTRACTS.md /auth/check-handle, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Security Checklists, lines 1269-1292)
    - **Acceptance Criteria:** Zod validates request, calls authService, returns 200 with { available }, follows route pattern from Section 5

- [ ] **Task 3.3.2:** Create signup route
    - **Action:** Create `/app/api/auth/signup/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/signup, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Security Checklists, lines 1318-1324)
    - **Acceptance Criteria:** Validates request, calls authService.initiateSignup, returns 201 or 400/409, follows validation patterns from Section 10

- [ ] **Task 3.3.3:** Create verify-otp route
    - **Action:** Create `/app/api/auth/verify-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/verify-otp, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Validates OTP, returns 200 with session or 400/401, follows route structure from Section 5

- [ ] **Task 3.3.4:** Create resend-otp route
    - **Action:** Create `/app/api/auth/resend-otp/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/resend-otp, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Rate limiting pattern)
    - **Acceptance Criteria:** Rate limit applied, returns 200 or 429

- [ ] **Task 3.3.5:** Create login route
    - **Action:** Create `/app/api/auth/login/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/login, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Validates credentials, sends OTP, returns 200 or 401

- [ ] **Task 3.3.6:** Create forgot-password route
    - **Action:** Create `/app/api/auth/forgot-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/forgot-password, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Sends reset email, returns 200

- [ ] **Task 3.3.7:** Create reset-password route
    - **Action:** Create `/app/api/auth/reset-password/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /auth/reset-password, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Validation patterns)
    - **Acceptance Criteria:** Validates token, resets password, returns 200 or 400

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
    - **Action:** Add function to aggregate: user info, current tier, total points, active commission boost, tier progress
    - **References:** API_CONTRACTS.md /dashboard, Loyalty.md Flow 1 (Dashboard)
    - **Acceptance Criteria:** Single query with JOINs to users, vip_tiers, commission_boost_states

- [ ] **Task 4.1.3:** Implement getStatsSummary function
    - **Action:** Add function to count: available missions, active rewards, pending redemptions
    - **References:** API_CONTRACTS.md /dashboard, ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1028-1063)
    - **Acceptance Criteria:** MUST filter by client_id in ALL queries (Section 9 Critical Rule #1), return counts

- [ ] **Task 4.1.4:** Create mission repository file
    - **Action:** Create `/lib/repositories/missionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 4.1.5:** Implement findFeaturedMission function
    - **Action:** Add function to get highest-priority active mission user hasn't completed
    - **References:** API_CONTRACTS.md /dashboard/featured-mission, Loyalty.md Flow 1
    - **Acceptance Criteria:** Query orders by priority, excludes completed missions

## Step 4.2: Dashboard Services
- [ ] **Task 4.2.1:** Create dashboard service file
    - **Action:** Create `/lib/services/dashboardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 4.2.2:** Implement getDashboardOverview function
    - **Action:** Add function aggregating data from repositories
    - **References:** API_CONTRACTS.md /dashboard
    - **Acceptance Criteria:** Returns complete dashboard object matching API schema

- [ ] **Task 4.2.3:** Implement shouldShowCongratsModal logic
    - **Action:** Add function checking if users.last_login_at is NULL or > 24h ago
    - **References:** Loyalty.md Flow 1 (Congrats Modal)
    - **Acceptance Criteria:** Returns boolean, updates last_login_at after shown

- [ ] **Task 4.2.4:** Implement getFeaturedMission function
    - **Action:** Add function calling missionRepository with user context
    - **References:** API_CONTRACTS.md /dashboard/featured-mission
    - **Acceptance Criteria:** Returns mission or null if all completed

## Step 4.3: Dashboard API Routes
- [ ] **Task 4.3.1:** Create dashboard overview route
    - **Action:** Create `/app/api/dashboard/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /dashboard, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Authorization pattern, lines 1082-1122)
    - **Acceptance Criteria:** Auth middleware, calls service, returns 200 with dashboard data, follows Section 5 route pattern

- [ ] **Task 4.3.2:** Create featured mission route
    - **Action:** Create `/app/api/dashboard/featured-mission/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /dashboard/featured-mission, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Returns 200 with mission or 404 if none, follows Section 5 route pattern

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
    - **Action:** Add function to get missions filtered by: active, tier restrictions, not completed
    - **References:** API_CONTRACTS.md /missions/available, Loyalty.md Flow 8 (Mission List)
    - **Acceptance Criteria:** MUST apply tier filtering, MUST include user progress

- [ ] **Task 5.1.2:** Implement getUserProgress function
    - **Action:** Add function querying mission_progress for user
    - **References:** SchemaFinalv2.md (mission_progress table)
    - **Acceptance Criteria:** Returns progress with status, current_progress, target_progress

- [ ] **Task 5.1.3:** Implement claimReward function
    - **Action:** Add function to update mission_progress.status to 'claimed'
    - **References:** MissionsRewardsFlows.md (Mission Claim Flow)
    - **Acceptance Criteria:** MUST validate status is 'completed', add points to user, update status

- [ ] **Task 5.1.4:** Create raffle repository file
    - **Action:** Create `/lib/repositories/raffleRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 5.1.5:** Implement participate function
    - **Action:** Add function to insert raffle_participations record
    - **References:** MissionsRewardsFlows.md (Raffle Mission Flow)
    - **Acceptance Criteria:** MUST check mission type is 'raffle', mission is active

- [ ] **Task 5.1.6:** Implement getHistory function
    - **Action:** Add function to query mission_progress with mission details
    - **References:** API_CONTRACTS.md /missions/history
    - **Acceptance Criteria:** Returns paginated history ordered by updated_at DESC

## Step 5.2: Mission Services
- [ ] **Task 5.2.1:** Create mission service file
    - **Action:** Create `/lib/services/missionService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 5.2.2:** Implement listAvailableMissions function
    - **Action:** Add function calling repository with tier filtering logic
    - **References:** API_CONTRACTS.md /missions/available
    - **Acceptance Criteria:** Returns missions ordered by: status (in_progress first), priority, created_at

- [ ] **Task 5.2.3:** Implement claimMissionReward function
    - **Action:** Add transactional function to: validate state, add points, update status, create audit trail
    - **References:** Loyalty.md Pattern 1 (Transactional), Pattern 2 (Idempotent), Pattern 3 (State Validation)
    - **Acceptance Criteria:** MUST use transaction, MUST prevent duplicate claims, MUST validate completed → claimed transition

- [ ] **Task 5.2.4:** Implement participateInRaffle function
    - **Action:** Add idempotent function to record participation
    - **References:** MissionsRewardsFlows.md (Raffle Flow), Pattern 2
    - **Acceptance Criteria:** MUST be idempotent (check existing participation), verify mission is raffle type

- [ ] **Task 5.2.5:** Implement getMissionHistory function
    - **Action:** Add function with pagination
    - **References:** API_CONTRACTS.md /missions/history
    - **Acceptance Criteria:** Supports offset/limit, returns total count

## Step 5.3: Mission API Routes
- [ ] **Task 5.3.1:** Create available missions route
    - **Action:** Create `/app/api/missions/available/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /missions/available, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Authorization, lines 1221-1233)
    - **Acceptance Criteria:** Returns 200 with missions array, follows Section 5 route pattern

- [ ] **Task 5.3.2:** Create claim mission route
    - **Action:** Create `/app/api/missions/[missionId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /missions/:id/claim, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Validation, lines 1234-1247)
    - **Acceptance Criteria:** Validates missionId UUID, returns 200 or 400/404, follows validation patterns from Section 10

- [ ] **Task 5.3.3:** Create raffle participation route
    - **Action:** Create `/app/api/missions/[missionId]/participate/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /missions/:id/participate, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Returns 201 on success, 409 if already participated

- [ ] **Task 5.3.4:** Create mission history route
    - **Action:** Create `/app/api/missions/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /missions/history, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Parses offset/limit query params, returns paginated response

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
    - **Action:** Add function querying rewards with tier restrictions, usage limits
    - **References:** API_CONTRACTS.md /rewards, Loyalty.md Flow 9 (Reward List)
    - **Acceptance Criteria:** MUST filter by tier, check max_uses_per_user vs usage_count

- [ ] **Task 6.1.3:** Implement getUsageCount function
    - **Action:** Add function counting redemptions for user
    - **References:** SchemaFinalv2.md (redemptions table)
    - **Acceptance Criteria:** Counts redemptions where user_id matches and status != 'cancelled'

- [ ] **Task 6.1.4:** Implement redeemReward function
    - **Action:** Add transactional function to: deduct points, insert redemption, create sub-state
    - **References:** Loyalty.md Pattern 1 (Transactional), Pattern 6 (VIP Reward Lifecycle)
    - **Acceptance Criteria:** MUST use transaction, validate sufficient points, check usage limit

- [ ] **Task 6.1.5:** Create redemption repository file
    - **Action:** Create `/lib/repositories/redemptionRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.6:** Implement getHistory function
    - **Action:** Add function querying redemptions with reward details
    - **References:** API_CONTRACTS.md /rewards/history
    - **Acceptance Criteria:** Returns paginated history with reward info

- [ ] **Task 6.1.7:** Create commission boost repository file
    - **Action:** Create `/lib/repositories/commissionBoostRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.8:** Implement createBoostState function
    - **Action:** Add function to insert commission_boost_states record
    - **References:** Loyalty.md Pattern 7 (Commission Boost State History)
    - **Acceptance Criteria:** Creates state with boost_percentage, start_date, end_date, is_active=true

- [ ] **Task 6.1.9:** Implement deactivateBoost function
    - **Action:** Add function to set is_active=false and trigger history logging
    - **References:** Pattern 7
    - **Acceptance Criteria:** Updates state, trigger logs deactivation event

- [ ] **Task 6.1.10:** Create physical gift repository file
    - **Action:** Create `/lib/repositories/physicalGiftRepository.ts`
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640, includes Encryption Repository Example lines 641-717), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 6.1.11:** Implement createGiftState function
    - **Action:** Add function to insert physical_gift_states with encrypted address
    - **References:** Loyalty.md Pattern 9 (Encryption)
    - **Acceptance Criteria:** MUST encrypt address using encryption utility

- [ ] **Task 6.1.12:** Implement updateShippingStatus function
    - **Action:** Add function to update shipping_status and log tracking
    - **References:** MissionsRewardsFlows.md (Physical Gift Flow)
    - **Acceptance Criteria:** Updates status, inserts physical_gift_tracking record

- [ ] **Task 6.1.13:** Implement getPaymentInfo function
    - **Action:** Add function with signature `getPaymentInfo(clientId: string, userId: string)` to retrieve and decrypt payment account info from commission_boost_states
    - **References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9 (Sensitive Data Encryption), API_CONTRACTS.md /user/payment-info
    - **Acceptance Criteria:** MUST decrypt payment_account field using encryption utility, MUST filter by client_id AND user_id, returns payment_type and decrypted payment_account or null if not set

- [ ] **Task 6.1.14:** Implement savePaymentInfo function
    - **Action:** Add function with signature `savePaymentInfo(clientId: string, userId: string, redemptionId: string, paymentType: string, paymentAccount: string)` to store encrypted payment info
    - **References:** ARCHITECTURE.md Section 5 (Encryption Repository Example, lines 641-717), Loyalty.md Pattern 9 (Sensitive Data Encryption), API_CONTRACTS.md /rewards/:id/payment-info
    - **Acceptance Criteria:** MUST encrypt payment_account before INSERT/UPDATE, MUST validate payment_type enum (venmo, paypal, zelle, bank_account), MUST filter by client_id

## Step 6.2: Reward Services
- [ ] **Task 6.2.1:** Create reward service file
    - **Action:** Create `/lib/services/rewardService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 6.2.2:** Implement listAvailableRewards function
    - **Action:** Add function calling repository with tier + usage filtering
    - **References:** API_CONTRACTS.md /rewards
    - **Acceptance Criteria:** Returns rewards user can afford and is eligible for

- [ ] **Task 6.2.3:** Implement claimReward function with type routing
    - **Action:** Add function that routes to correct handler based on reward_type
    - **References:** MissionsRewardsFlows.md (6 reward types)
    - **Acceptance Criteria:** Calls: claimInstant, claimScheduled, claimPhysical, or claimCommissionBoost

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
    - **Action:** Add function with pagination
    - **References:** API_CONTRACTS.md /rewards/history
    - **Acceptance Criteria:** Returns redemptions with reward details

- [ ] **Task 6.2.9:** Implement getPaymentInfo service function
    - **Action:** Add function calling commissionBoostRepository.getPaymentInfo with user context
    - **References:** API_CONTRACTS.md /user/payment-info, ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Acceptance Criteria:** Returns decrypted payment info object with payment_type and payment_account, or null if not set, follows service layer patterns

- [ ] **Task 6.2.10:** Implement savePaymentInfo service function
    - **Action:** Add function to validate payment info and call repository
    - **References:** API_CONTRACTS.md /rewards/:id/payment-info, ARCHITECTURE.md Section 5 (Service Layer, lines 463-526)
    - **Acceptance Criteria:** Validates payment_type enum (venmo, paypal, zelle, bank_account), validates payment_account format is not empty, verifies reward exists and is commission_boost type, calls repository.savePaymentInfo

## Step 6.3: Reward API Routes
- [ ] **Task 6.3.1:** Create available rewards route
    - **Action:** Create `/app/api/rewards/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /rewards, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Authorization, lines 1080-1122)
    - **Acceptance Criteria:** Returns 200 with rewards array, follows Section 5 route pattern with authorization checks

- [ ] **Task 6.3.2:** Create claim reward route
    - **Action:** Create `/app/api/rewards/[rewardId]/claim/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /rewards/:id/claim, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Claim Validation, lines 1123-1218)
    - **Acceptance Criteria:** Accepts optional shipping_address in body, returns 200 or 400/404, follows validation patterns from Section 10

- [ ] **Task 6.3.3:** Create reward history route
    - **Action:** Create `/app/api/rewards/history/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /rewards/history, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Returns paginated history, follows Section 5 route pattern

- [ ] **Task 6.3.4:** Create get payment info route
    - **Action:** Create `/app/api/user/payment-info/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /user/payment-info, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Auth middleware verifies user, calls rewardService.getPaymentInfo, returns 200 with payment_type and payment_account if exists or 404 if not set, follows Section 5 route pattern

- [ ] **Task 6.3.5:** Create save payment info route
    - **Action:** Create `/app/api/rewards/[rewardId]/payment-info/route.ts` with POST handler
    - **References:** API_CONTRACTS.md /rewards/:id/payment-info, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461), Section 10 (Validation patterns, lines 1318-1324)
    - **Acceptance Criteria:** Zod validates request body (payment_type enum, payment_account string), calls rewardService.savePaymentInfo, returns 201 on success or 400 for validation errors, follows Section 10 validation patterns

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
    - **References:** ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640), Section 7 (Naming Conventions, lines 932-938)
    - **Acceptance Criteria:** File exists with repository object pattern

- [ ] **Task 7.2.2:** Implement listTiers function
    - **Action:** Add function to query vip_tiers for client
    - **References:** API_CONTRACTS.md /tiers, Loyalty.md Flow 7 (Tiers Page)
    - **Acceptance Criteria:** Returns all tiers with commission rates, benefits, point thresholds

- [ ] **Task 7.2.3:** Create tier service file
    - **Action:** Create `/lib/services/tierService.ts`
    - **References:** ARCHITECTURE.md Section 5 (Service Layer, lines 463-526), Section 7 (Naming Conventions, lines 939-943)
    - **Acceptance Criteria:** File exists with service functions following Section 5 patterns

- [ ] **Task 7.2.4:** Implement getTiers function
    - **Action:** Add function calling repository
    - **References:** API_CONTRACTS.md /tiers
    - **Acceptance Criteria:** Returns tiers ordered by tier order (Fan → Super Fan)

- [ ] **Task 7.2.5:** Create tiers route
    - **Action:** Create `/app/api/tiers/route.ts` with GET handler
    - **References:** API_CONTRACTS.md /tiers, ARCHITECTURE.md Section 5 (Presentation Layer, lines 408-461)
    - **Acceptance Criteria:** Returns 200 with tiers array, follows Section 5 route pattern

## Step 7.3: Tiers Testing
- [ ] **Task 7.3.1:** Create tier API tests
    - **Action:** Create `/tests/integration/api/tiers.test.ts`
    - **Acceptance Criteria:** Test returns correct tier structure

- [ ] **Task 7.3.2:** Test tier ordering
    - **Action:** Write test verifying tiers sorted correctly
    - **Acceptance Criteria:** Tiers in ascending order by point thresholds

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
    - **References:** Loyalty.md Flow 1, Pattern 1 (Transactional)
    - **Acceptance Criteria:** MUST use transaction, handle duplicates (upsert), update users.total_sales

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
    - **References:** Loyalty.md Flow 7 (Auto Tier Advancement)
    - **Acceptance Criteria:** Queries users, compares total_sales to tier checkpoints, updates tier_id

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
    - **Acceptance Criteria:** Tiers fetch from real /api/tiers

- [ ] **Task 9.2.12:** Test Tiers manually
    - **Action:** View all tiers, verify current tier highlighted
    - **Acceptance Criteria:** Tier benefits and thresholds correct

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
