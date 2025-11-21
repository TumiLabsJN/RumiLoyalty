# IMPLEMENTATION PROPOSAL

## Executive Summary

This proposal outlines a phased, security-first implementation strategy for the loyalty platform's backend. The approach is designed for rapid, correct, and maintainable development by a solo developer, leveraging the specified Next.js and Supabase stack.

We will begin by deploying the complete database schema using Supabase's migration tools, ensuring a solid foundation. The backend implementation will follow the prescribed 3-layer architecture (Repository → Service → API), built feature-by-feature starting with the non-negotiable authentication system. Each feature will be built completely—from data access to the API endpoint—before moving to the next, ensuring incremental stability.

The critical path to a demo-able product focuses on the core user journey: **Signup → Login → View Dashboard → Complete a Sales Mission → Claim a Gift Card Reward**. This path prioritizes the highest-risk and most essential features, deferring complex automation and secondary features until after a successful initial demo. Multi-tenancy and security are not afterthoughts; they are woven into every layer from the very first line of code.

## Database Creation Strategy

### Approach

We will use the **Supabase CLI and migration files** to create the database schema. This approach is superior to using the UI or one-off SQL scripts because it provides version control for the database schema, enables repeatable deployments across different environments (local, staging, production), and aligns with CI/CD best practices.

The process will be:
1.  Initialize Supabase in the project: `supabase init`.
2.  Create a new migration file for the initial schema: `supabase migration new initial_schema`.
3.  Translate the table definitions, RLS policies, triggers, and functions from `SchemaFinalv2.md` into SQL and place them into the newly created migration file.
4.  Apply the migration locally: `supabase db push`.
5.  Create a separate migration for seeding initial data: `supabase migration new seed_data`.

### Table Creation Sequence

Tables will be created in an order that respects foreign key (FK) dependencies. Tables with no dependencies are created first.

**Step 1: Core & Independent Tables**
-   `clients`: No dependencies. The root of multi-tenancy.
-   `idempotency_keys`: No dependencies. Critical for Pattern 2.
-   `rewards`: No dependencies. Missions have an FK to rewards.
-   `payment_accounts`: No dependencies. Users have an FK to this.

**Step 2: Primary Entity Tables**
-   `tiers`: Depends on `clients` (FK `client_id`).
-   `users`: Depends on `clients`, `tiers`, and `payment_accounts`.
-   `otps`: Depends on `users`.

**Step 3: Mission & Reward Association Tables**
-   `missions`: Depends on `clients` and `rewards`.
-   `mission_progress`: Depends on `users` and `missions`.
-   `mission_completion_log`: Depends on `mission_progress`.

**Step 4: History & State Management Tables**
-   `user_tier_history`: Depends on `users` and `tiers`.
-   `commission_boost_state_history`: Depends on `users` and `rewards`.
-   `user_points_history`: Depends on `users`, `clients`.
-   `redemption_codes`: Depends on `clients`, `rewards`.
-   `user_rewards`: Depends on `users`, `rewards`, `redemption_codes`.

### RLS Policies Implementation

RLS policies, as defined in `SchemaFinalv2.md` (lines 711-790), will be included directly within the `initial_schema` migration SQL file. Each `CREATE TABLE` statement will be followed by the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` and `CREATE POLICY ...` statements for that table. This ensures RLS is active from the moment the table is created.

### Triggers & Indexes

-   **Triggers:** The database functions (e.g., `log_commission_boost_state_change`) and the corresponding triggers (e.g., `on_user_rewards_update`) will be defined at the end of the `initial_schema` migration file, after all tables are created.
-   **Indexes:** All `CREATE INDEX` statements from the schema document will be included in the migration file, placed after their corresponding `CREATE TABLE` statements.

### Verification Strategy

1.  After running `supabase db push`, run `supabase db diff --schema-only > verification.sql`.
2.  The `verification.sql` file should be empty or contain only minor, inconsequential differences (like comment changes). This confirms the deployed schema matches the migration file.
3.  Manually cross-reference the RLS policies in the Supabase Studio UI against `SchemaFinalv2.md` for a final sanity check.

## Sequential Implementation Flow

### Phase 1: Foundation & Infrastructure

**Step 1: TypeScript Type Definitions**
-   Create `/lib/types/database.ts`: Contains TypeScript interfaces for each database table row (e.g., `User`, `Mission`). Generated from the schema or manually created.
-   Create `/lib/types/api.ts`: Contains request/response interfaces for all endpoints, derived directly from `API_CONTRACTS.md`.
-   Create `/lib/types/enums.ts`: Defines all status enums (e.g., `MissionStatus`, `RewardStatus`) to ensure consistency.
-   **Why first:** A strong type system is the foundation for writing correct, maintainable code and is a prerequisite for all subsequent layers.

**Step 2: Supabase Client & Configuration**
-   Create `/lib/supabase/client.ts`: Exports a Supabase client for browser-side use.
-   Create `/lib/supabase/server.ts`: Exports a Supabase client for server-side use (API routes, server components).
-   Configure environment variables (`.env.local`) for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
-   **Why second:** All data access repositories depend on a configured Supabase client.

**Step 3: Core Utility Functions**
-   Create `/lib/utils/auth.ts`: Implements `getUserFromRequest(request: NextRequest)` to extract the user session from the request context.
-   Create `/lib/utils/encryption.ts`: Implements `encrypt(text: string)` and `decrypt(hash: string)` using `crypto` for AES-256-GCM (Pattern 9).
-   Create `/lib/schemas/validation.ts`: Defines Zod schemas for all API request bodies to enforce input validation.
-   **Why third:** These utilities are cross-cutting concerns that will be used by the service and API layers.

**Deliverable:** A type-safe, configured foundation ready for business logic implementation.

### Phase 2: Authentication System (API Endpoints 1-5)

**Step 4: Core Repositories**
-   Create `/lib/repositories/clientRepository.ts` with `findById(clientId: string)`.
-   Create `/lib/repositories/userRepository.ts` with `findByHandle(clientId, handle)`, `findById(userId)`, `create(userData)`, `updateLastLogin(userId)`.
-   Create `/lib/repositories/otpRepository.ts` with `create(otpData)`, `findActiveByUserId(userId)`, `markAsUsed(otpId)`.
-   **Why fourth:** The auth service needs these fundamental data access functions to operate on users, clients, and OTPs.

**Step 5: Auth Service Layer**
-   Create `/lib/services/authService.ts`.
-   Implement `checkHandleAvailability(clientId, handle)`, `initiateSignup(clientHandle, userHandle, email)`, `verifyOtpAndLogin(userId, otpCode)`, `resendOtp(userId)`.
-   This layer will orchestrate calls to the repositories and contain the core business logic for the signup/login flow.
-   **Why fifth:** It translates API requests into concrete database operations and business rules.

**Step 6: Auth API Routes**
-   Create `/app/api/auth/[...]/route.ts` files for `check-handle`, `signup`, `verify-otp`, `resend-otp`, and `login`.
-   Each route will:
    1.  Parse and validate the request body using Zod schemas from `validation.ts`.
    2.  Call the appropriate `authService` function.
    3.  Handle errors and return structured JSON responses as per `API_CONTRACTS.md`.
-   **Why sixth:** This exposes the authentication business logic to the frontend.

**Deliverable:** A complete, secure, and working authentication flow. Users can sign up, verify their email via OTP, and log in to receive a session cookie.

### Phase 3: Dashboard & Home Page (API Endpoints 6-7)

**Step 7: Read-Only Repositories for Dashboard**
-   Create `/lib/repositories/missionRepository.ts` with `findFeatured(clientId, userId)`.
-   Create `/lib/repositories/userPointsRepository.ts` with `getPointsSummary(clientId, userId)`.
-   **Why seventh:** The dashboard needs to fetch data about missions and user points.

**Step 8: Home/Dashboard Service Layer**
-   Create `/lib/services/homeService.ts`.
-   Implement `getDashboardData(clientId, userId)` which calls the new repository functions to aggregate all data needed for the home page.
-   **Why eighth:** Consolidates data fetching for the dashboard into a single business logic unit.

**Step 9: Home/Dashboard API Routes**
-   Create `/app/api/home/dashboard/route.ts` and `/app/api/home/points-history/route.ts`.
-   These routes will be protected, using `getUserFromRequest` to get the session, then call `homeService` to fetch data, ensuring the `clientId` and `userId` are passed for multi-tenant filtering.
-   **Why ninth:** Exposes the dashboard data to the authenticated frontend.

**Deliverable:** A logged-in user can load the dashboard and see their points summary and the featured mission.

### Phase 4: Missions System (API Endpoints 8-10)

**Step 10: Mission Repositories (Read & Write)**
-   Extend `/lib/repositories/missionRepository.ts` with `findAllActive(clientId, userId)` and `findProgressById(missionProgressId)`.
-   Create `/lib/repositories/missionProgressRepository.ts` with `create(progressData)`, `updateStatus(progressId, status)`.
-   **Why tenth:** These are the data access functions needed to view and interact with missions.

**Step 11: Mission Service Layer**
-   Create `/lib/services/missionService.ts`.
-   Implement `listActiveMissions(clientId, userId)`, `getMissionDetails(clientId, userId, missionId)`, and `startMission(clientId, userId, missionId)`.
-   This service will contain the state transition logic for starting a mission (`not_started` -> `in_progress`).
-   **Why eleventh:** Encapsulates the business logic for mission lifecycle management.

**Step 12: Mission API Routes**
-   Create API routes under `/app/api/missions/...` for listing, getting details, and starting missions.
-   These routes will be protected and use the `missionService`.
-   **Why twelfth:** Exposes mission functionality to the frontend.

**Deliverable:** Users can view available missions, see details, and start a mission.

### Phase 5: Rewards System (API Endpoints 11-14)

**Step 13: Reward Repositories**
-   Create `/lib/repositories/rewardRepository.ts` with `findAll(clientId)` and `findById(rewardId)`.
-   Create `/lib/repositories/userRewardRepository.ts` with `create(userRewardData)`, `updateStatus(userRewardId, status)`.
-   Create `/lib/repositories/redemptionCodeRepository.ts` with `findAvailableCode(rewardId)` and `assignCodeToUser(codeId, userId)`.
-   **Why thirteenth:** These functions are necessary for viewing and claiming rewards.

**Step 14: Reward Service Layer**
-   Create `/lib/services/rewardService.ts`.
-   Implement `listAvailableRewards(clientId, userId)`, `getRewardDetails(...)`, and `claimReward(clientId, userId, rewardId)`.
-   The `claimReward` function will be a complex, transactional operation (Pattern 1) that checks user points, decrements them, creates a `user_rewards` record, and assigns a `redemption_codes` if applicable. This is a high-risk area.
-   **Why fourteenth:** This is the core logic for the reward redemption flow, a critical part of the user experience.

**Step 15: Reward API Routes**
-   Create API routes under `/app/api/rewards/...` for listing, details, claiming, and viewing claimed rewards.
-   **Why fifteenth:** Exposes the reward system to the frontend.

**Deliverable:** Users can view available rewards and claim a "Gift Card" reward, which is on the critical path.

### Phase 6: History & Tiers Pages (API Endpoints 15-17)

**Step 16: History Repositories & Services**
-   Extend existing repositories or create new ones (e.g., `userTierHistoryRepository`) to fetch data for the history pages.
-   Create `/lib/services/historyService.ts` to aggregate data for mission and reward history.
-   Create `/lib/services/tierService.ts` to get current tier and history.
-   **Why sixteenth:** These are primarily read-heavy operations that depend on data generated in previous phases.

**Step 17: History & Tiers API Routes**
-   Create API routes for `/app/api/history/...` and `/app/api/tiers/current`.
-   **Why seventeenth:** Exposes historical and tier data.

**Deliverable:** The History and Tiers pages are functional.

### Phase 7: Cron Jobs & Automation

**Step 18: Automation Services**
-   Create `/lib/services/automationService.ts`.
-   Implement `syncDailyMetrics()` (Loyalty.md Flow 1) and `calculateDailyTiers()` (Loyalty.md Flow 7). These functions will contain the complex business logic for daily calculations and should be designed to be idempotent.
-   **Why eighteenth:** This logic is complex and self-contained, best built after the core interactive features are stable.

**Step 19: Cron Job API Routes**
-   Create `/app/api/cron/daily-sync/route.ts` and `/app/api/cron/tier-calculation/route.ts`.
-   These routes will be protected by a secret key passed in the `Authorization` header. They will invoke the `automationService` functions.
-   Configure these routes in `vercel.json` to be run on a schedule.
-   **Why nineteenth:** This exposes the automation logic to Vercel's Cron Job runner.

**Deliverable:** Automated daily jobs for metrics and tiers are running.

### Phase 8: Frontend Integration

This phase runs in parallel with backend development, page by page, as features are completed.

**Step 20: Integration Strategy Implementation**
-   Implement the environment variable flags (`NEXT_PUBLIC_..._USE_REAL_API`) in the frontend's API client/wrapper.
-   As each backend phase is completed, the corresponding flag is toggled to `true` in `.env.local`.
-   **Why last:** Integration can only happen after the backend APIs are built and deployed.

**Deliverable:** A fully functional application connected to the live backend, with MSW mocks completely disabled.

## Architecture Decisions

### Code Organization

```
/lib
├── types/           # (Phase 1) TypeScript interfaces (database.ts, api.ts, enums.ts)
├── supabase/        # (Phase 1) Supabase clients (client.ts, server.ts)
├── schemas/         # (Phase 1) Zod validation schemas (validation.ts)
├── utils/           # (Phase 1) Helper functions (auth.ts, encryption.ts)
├── repositories/    # (Phases 2+) Data access layer (userRepository.ts, etc.)
└── services/        # (Phases 2+) Business logic layer (authService.ts, etc.)
/app/api/
├── auth/            # (Phase 2) Auth endpoints
├── home/            # (Phase 3) Dashboard endpoints
├── missions/        # (Phase 4) Mission endpoints
├── rewards/         # (Phase 5) Reward endpoints
├── history/         # (Phase 6) History endpoints
├── tiers/           # (Phase 6) Tier endpoints
└── cron/            # (Phase 7) Cron job endpoints
```

### Multi-Tenant Isolation Strategy

**Pattern:** A combination of application-layer logic and database-layer RLS.

1.  **Application Layer (Primary Enforcement):** The `clientId` will be retrieved from the user's session or request context. It will be explicitly passed down from the API route -> Service -> Repository for **every single database query**.
    ```typescript
    // Example from userRepository.ts
    export async function findByHandle(db: SupabaseClient, clientId: string, handle: string) {
      const { data, error } = await db
        .from('users')
        .select('id')
        .eq('client_id', clientId) // ← CRITICAL: Multi-tenant filter
        .eq('tiktok_handle', handle)
        .single();
      // ...
    }
    ```
2.  **Database Layer (Failsafe):** RLS policies will be implemented as a second line of defense. The policy will ensure that a query can only access rows matching the `client_id` of the currently authenticated user. This prevents accidental data leakage even if an application-layer bug exists.

### Critical Patterns Implementation

1.  **Transactional Workflows:** For complex operations like `claimReward`, we will use Supabase Edge Functions written in Deno/TypeScript (or `plpgsql` database functions if preferred) to ensure atomicity. The function will accept all necessary parameters, wrap the multi-step logic (check points, decrement points, create user reward) in a single transaction, and roll back on any failure.
2.  **Idempotent Operations:** A unique `Idempotency-Key` will be required in the header for all `POST`/`PUT`/`PATCH` requests. The `idempotency_keys` table (`id`, `key`, `user_id`, `request_path`, `response_code`, `response_body`, `created_at`) will be checked at the beginning of the service layer function. If the key exists, the stored response is returned immediately without re-executing the logic.
3.  **State Transition Validation:** In each service (e.g., `missionService`), a validation map will define legal transitions (e.g., `const validTransitions = { 'not_started': ['in_progress'] }`). Any state update will be checked against this map before calling the repository.
4.  **Auto-Sync Triggers:** Implemented via Vercel Cron Jobs calling dedicated API endpoints as described in Phase 7.
5.  **Status Validation Constraints:** Implemented using PostgreSQL `ENUM` types and `CHECK` constraints directly in the `initial_schema` migration file.
6.  **VIP Reward Lifecycle Management:** This logic will be encapsulated within the `rewardService`, specifically in the functions that handle VIP reward state changes, ensuring all rules from `MissionsRewardsFlows.md` are met.
7.  **Commission Boost State History:** The database trigger `on_user_rewards_update` defined in `SchemaFinalv2.md` will handle this automatically. We must verify this trigger is created in the migration and works as expected.
8.  **Multi-Tenant Query Isolation:** Implemented as described in the "Multi-Tenant Isolation Strategy" section above.
9.  **Sensitive Data Encryption:** Implemented in `/lib/utils/encryption.ts` using Node.js `crypto`. The `payment_accounts` repository will be responsible for calling `encrypt()` before `INSERT`/`UPDATE` and `decrypt()` after `SELECT`. The encryption key will be stored securely as a Vercel environment variable.

## Security Measures

-   **Encryption (Pattern 9):**
    -   **Library:** Node.js built-in `crypto` module.
    -   **Algorithm:** AES-256-GCM.
    -   **Implementation:** `/lib/utils/encryption.ts`. The `encrypt` function will return a string concatenating the IV, auth tag, and encrypted content, which is then stored in the database. `decrypt` will parse this string to perform decryption.
    -   **Key Management:** `ENCRYPTION_KEY` stored as a secret in Vercel environment variables.
-   **Input Validation:**
    -   **Library:** Zod.
    -   **Implementation:** All API routes will validate incoming request bodies, query parameters, and route parameters against schemas defined in `/lib/schemas/validation.ts`. This prevents malformed data from ever reaching the service layer.
-   **Rate Limiting:**
    -   **Library:** `@upstash/ratelimit`.
    -   **Implementation:** Apply middleware to API routes.
        -   Auth endpoints (`/api/auth/*`): Stricter limit (e.g., 5 requests per IP per minute).
        -   General API endpoints: Looser limit (e.g., 100 requests per user per minute).
-   **Session Management:**
    -   Leverage Supabase's built-in auth, which uses secure, HTTP-only cookies.
    -   Configure cookie settings for production: `Secure=true`, `SameSite=Strict`.
    -   Session expiration will be set to 30 days as specified.

## Integration Strategy

### Swapping Mocks to Real APIs

**Approach:** Use per-feature environment variable flags. This provides granular control and minimizes risk.

```
# .env.local
NEXT_PUBLIC_USE_REAL_AUTH_API=false
NEXT_PUBLIC_USE_REAL_HOME_API=false
NEXT_PUBLIC_USE_REAL_MISSIONS_API=false
# ... etc.
```

The frontend's API fetching logic will conditionally use MSW or the real `fetch` based on these flags.

### Page-by-Page Migration

1.  **Phase 2 Complete:** Set `NEXT_PUBLIC_USE_REAL_AUTH_API=true`. Test signup/login pages.
2.  **Phase 3 Complete:** Set `NEXT_PUBLIC_USE_REAL_HOME_API=true`. Test dashboard page.
3.  **Phase 4 Complete:** Set `NEXT_PUBLIC_USE_REAL_MISSIONS_API=true`. Test missions page.
4.  Continue this pattern for Rewards, History, and Tiers.

### Rollback Plan

If a bug is found after enabling a real API, the rollback is instantaneous:
1.  Set the corresponding environment variable back to `false`.
2.  The frontend automatically reverts to using the stable MSW mock for that feature.
3.  This requires no code changes or redeployments, isolating the issue while other features remain functional.

## Risk Assessment

### Highest-Risk Areas

1.  **Multi-tenant Isolation Bugs:** The highest impact risk. A bug could cause data leakage between clients.
    -   **Mitigation:** Enforce the "belt-and-suspenders" approach (application-layer `clientId` checks + database RLS). Build and test the auth/dashboard flow with two separate clients and users immediately after Phase 3 to verify isolation early.
2.  **State Transition Logic:** Incorrect state changes can lead to data corruption (e.g., claiming a reward twice).
    -   **Mitigation:** Implement state validation maps in the service layer as described. For critical transitions like claiming a reward, use database transactions to ensure atomicity.
3.  **Idempotency & Transactions:** Incorrect implementation of idempotency or transactions for financial operations (points, rewards) could lead to incorrect point balances.
    -   **Mitigation:** Prototype the `claimReward` flow using a Supabase Edge Function early (during Phase 5). Write specific tests for the idempotency key logic.

### De-risking Strategy

-   **Tackle Security First:** The implementation sequence prioritizes the entire authentication system (Phase 2) to address security from the start.
-   **Prototype Complex Logic:** The `claimReward` service function, involving transactions and state changes, should be treated as a prototype spike during Phase 5 to validate the approach before building other reward types.
-   **Verify Multi-Tenancy Early:** As soon as the dashboard is built (Phase 3), create seed data for two distinct clients and manually verify that user A from client 1 cannot see any data from user B in client 2.

### Bottlenecks

-   **Complex Business Logic:** The logic for mission completion checks (e.g., `sales_dollars`) and reward redemption is complex. This could slow down development of the service layer.
    -   **Mitigation:** Focus on the simplest path first (sales mission, gift card reward). Defer other, more complex mission/reward types until after the demo.
-   **Database Function Development:** If extensive `plpgsql` is needed for transactions, and the developer is not a PostgreSQL expert, this could be a bottleneck.
    -   **Mitigation:** Favor Supabase Edge Functions (TypeScript) for transactional logic, as it keeps the entire stack in a single language.

### Unknowns Requiring Research

-   **TikTok API Integration:** The daily sync cron job depends on fetching data from a TikTok API. The exact authentication method, rate limits, and data structure of this external API are unknowns that need to be investigated before Phase 7 begins.
-   **Vercel Cron Performance:** The performance and reliability of Vercel's cron jobs for potentially long-running tasks (tier calculation across many users) needs to be confirmed. A timeout might require breaking the job into smaller, batch-oriented tasks.

## Critical Path to Demo-able

### Minimum Viable Features

1.  **Auth:** Full signup, OTP verification, and login flow.
2.  **Dashboard:** Display user points and a featured mission.
3.  **Missions:** Ability to view and start one mission type (`sales_dollars`). The completion will be simulated manually in the database for the demo.
4.  **Rewards:** Ability to view and claim one reward type (`gift_card`).

### What Can Be Deferred (Post-Demo)

-   All other mission types (e.g., `engagement_rate`, `views_per_video`).
-   All other reward types (e.g., `commission_boost`, `raffle`, `physical_gift`).
-   The cron jobs for daily sync and tier calculation (these can be run manually or data can be simulated for the demo).
-   The full Admin Config System.
-   History and Tiers pages (can show empty states).
-   Password reset functionality.

### Critical Path Steps

1.  **DB Schema:** Deploy the full schema via migrations.
2.  **Phase 1:** Build the foundation (types, clients, utils).
3.  **Phase 2:** Build the complete Auth system.
4.  **Seed Data:** Create a `client`, a `user`, a `sales_dollars` mission, and a `gift_card` reward in the database.
5.  **Phase 3:** Build the Dashboard API.
6.  **Partial Phase 4:** Build the `listActiveMissions` and `startMission` service/API.
7.  **Partial Phase 5:** Build the `listAvailableRewards` and `claimReward` service/API for the `gift_card` type.
8.  **Integrate Frontend:** Sequentially enable the real APIs for Auth, Home, Missions, and Rewards pages.