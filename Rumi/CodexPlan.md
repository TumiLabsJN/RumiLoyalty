# IMPLEMENTATION PROPOSAL

## Executive Summary
I'll stand up the backend in layers that mirror the documented contracts and patterns: start with a reproducible Supabase schema (migrations covering FK order, RLS, triggers from `SchemaFinalv2.md:32-979`), then scaffold strongly typed repositories/services aligned with the three-layer architecture in `ARCHITECTURE.md`. Service orchestration will strictly enforce the 9 critical patterns in `Loyalty.md:2019-2182`—transactional mission/tier workflows, idempotent redemptions, multi-tenant filtering, and AES-256-GCM encryption for sensitive payout data—before exposing contract-first API routes. I’ll deliver features page-by-page (Auth → Dashboard → Missions → Rewards → History → Tiers) so each frontend screen can flip from MSW mocks to live APIs via env toggles without breaking demo readiness.

The critical path moves from schema deployment and shared libraries to authentication, then to the high-visibility dashboard/missions/rewards flows that depend on state machines from `MissionsRewardsFlows.md`. Scheduled automation (Flow 1 sync and Flow 7 tier calculation) and cron-triggered webhooks land after core APIs so we can demonstrate manual operations first. Throughout, I'll keep multi-tenant safeguards and encrypted payment handling irreversible by baking them into repository utilities rather than sprinkling checks late in services.

## Database Creation Strategy
### Approach
- Author SQL migrations (Supabase CLI) committed under `/supabase/migrations/*.sql` so schema is source-controlled and reproducible; run via `supabase db push`.
- Use a bootstrap script to apply base schema, followed by seed SQL for clients, tiers, and sample users aligned with contracts (no UI seeding).
- Keep migrations atomic: one file for core tables, subsequent files for sub-state tables, indexes, RLS policies, and triggers as documented.

### Table Creation Sequence
**Step 1: Core Tables**
- Create `clients`, then `tiers` (FK `client_id`), then `users` (FK to clients/tiers, including precomputed fields and payment placeholders) (`SchemaFinalv2.md:32-188`).
- Rationale: `users` references `clients` and must exist before dependent mission/tier/checkpoint tables.

**Step 2: Performance & Audit**
- Add `videos`, `sales_adjustments`, `tier_checkpoints`, `handle_changes` in that order so FK chains (`users.id` → `videos.user_id`, etc.) succeed (`SchemaFinalv2.md:190-270`).

**Step 3: Missions Domain**
- Create `missions` → `mission_progress` (FK to missions/users) ensuring unique constraint on `user_id, mission_id, checkpoint_start` (`SchemaFinalv2.md:273-368`).

**Step 4: Rewards & Redemptions**
- Add `rewards`, then `redemptions` (FKs to rewards/mission_progress/users; include composite `UNIQUE(id, client_id)` and other uniqueness constraints) (`SchemaFinalv2.md:370-523`).

**Step 5: Reward Sub-States**
- Create `commission_boost_redemptions` → `commission_boost_state_history` → `physical_gift_redemptions` → `raffle_participations`, each with composite FKs back to `redemptions(id, client_id)` for multi-tenant enforcement (`SchemaFinalv2.md:524-979`).

### RLS Policies Implementation
- After tables exist, apply RLS per table group: creators (select own rows), system service role (insert/update for cron), admin (all access). Explicitly follow the policies called out near `SchemaFinalv2.md:711-790`.
- Use Supabase CLI `link` + `gen types typescript --project-ref ...` to keep type safety aligned with RLS-enabled schema.

### Triggers & Indexes
- Create indexes exactly as listed (mission lookups, redemptions partial indexes, etc.) to hit performance targets (<200 ms dashboards).
- Add triggers for:
  - Commission boost status auto-logging and redemption sync (Pattern 4/7).
  - State-transition enforcement trigger functions for `redemptions`, `mission_progress`, `commission_boost_redemptions` (Pattern 3).
  - Optional `updated_at` auto-refresh triggers if Supabase doesn’t handle them.

### Verification Strategy
- Use `supabase db diff` against `SchemaFinalv2.md` to confirm all columns/constraints exist.
- Run `psql` queries mirroring the unique/index definitions to ensure outputs match documentation.
- Seed initial data: insert base client row, tier rows (Tier 1-4), one admin user, plus fixture missions/rewards that match API contracts for integration smoke tests.

## Sequential Implementation Flow
### Phase 1: Foundation Infrastructure
**Step 1: TypeScript Type Definitions**
- Create `/lib/types/api.ts` (interfaces mirroring `API_CONTRACTS.md` responses), `/lib/types/database.ts` (Supabase gen types), `/lib/types/enums.ts` (status enums per Pattern 5).
- Why first: Services/repositories rely on strict typing for mission/reward states.

**Step 2: Supabase Client Setup**
- Implement `/lib/supabase/server-client.ts` (service key via `createServerComponentClient`) and `/lib/supabase/admin-client.ts` (service role for cron). Expose typed helpers.

**Step 3: Utility Functions**
- `/lib/utils/auth.ts` (decode JWT, fetch session user with client_id/tier), `/lib/utils/encryption.ts` (AES-256-GCM encrypt/decrypt with rotation-friendly metadata), `/lib/utils/errors.ts` (typed errors), `/lib/utils/validation.ts` (Zod schemas referenced by routes).
- Why third: Shared concerns (Pattern 9, validation) reused everywhere.

### Phase 2: Authentication System
**Step 4: User Repository (`/lib/repositories/userRepository.ts`)**
- Functions: `findByHandle(handle)`, `findById(userId)`, `createFromSignup()`, `updateEmailVerified(userId)`, `updateLastLogin(userId)`, `updatePassword(hash)`. All queries filter `.eq('client_id', clientId)` per Pattern 8.

**Step 5: OTP Repository (`otpRepository.ts`)**
- `createOtp(userId, sessionId)`, `findActiveBySession(sessionId)`, `markUsed(id)`, `incrementAttempts(id)`, `invalidate(sessionId)`. Ensures idempotency/policies for Flow 6.

**Step 6: Client Repository (`clientRepository.ts`)**
- `findDefaultClient()` (single row for MVP) and `getTermsContent(clientId)` for login screens.

**Step 7: Auth Service (`authService.ts`)**
- Implement `checkHandle`, `signup`, `verifyOtp`, `resendOtp`, `login`, `forgotPassword`, `resetPassword` referencing Flow 3/4/5 logic (`Loyalty.md:649-1260`) with Pattern 1 transactions (user + OTP + email events) and Pattern 2 idempotency.

**Step 8: Auth API Routes**
- Create routes per `API_CONTRACTS.md` (check-handle, signup, verify-otp, resend-otp, login, forgot/reset password). Validate body via Zod, call services, set cookies.

*Deliverable:* End-to-end auth + OTP + password reset, enabling frontend to swap MSW mocks for auth pages.

### Phase 3: Dashboard & Home Page
**Step 9: Dashboard Repository Modules**
- `dashboardRepository.ts`: aggregator queries for `GET /api/dashboard` (user, client, tiers, missions summary) using precomputed fields (`Loyalty.md Flow 1, Step 4`).
- `missionRepository.ts`: functions `findFeaturedMission(userId)`, `listMissionsForUser(userId)` using join patterns from `ARCHITECTURE.md Section 6`.
- `redemptionRepository.ts`: `findRecentFulfillments(userId)` for congrats modal.

**Step 10: Dashboard Service (`dashboardService.ts`)**
- Compose repositories to build `FeaturedMissionResponse` and `DashboardResponse`, ensuring status logic matches `API_CONTRACTS.md:1769-2150`.

**Step 11: Dashboard API Routes**
- `/app/api/dashboard/featured-mission/route.ts` and `/app/api/dashboard/route.ts`. Implement caching headers (short TTL), update `users.last_login_at` after success.

*Reasoning:* Dashboard is first non-auth surface and drives other endpoints’ data contracts.

### Phase 4: Missions System
**Step 12: Mission Progress Repository**
- CRUD: `listMissionCards(userId)`, `getMissionProgressById(id)`, `updateStatusByMission(id, clientId)`, `createRedemptionForCompletion(...)`. Include transaction wrappers for Pattern 1.

**Step 13: Mission Service (`missionService.ts`)**
- Functions: `getMissionsPage(userId)`, `claimMissionReward(userId, missionId)`, `participateRaffle(userId, missionId)`.
- Enforce Patterns 2 & 3: check mission eligibility, mission_progress status, ensure `redemptions` creation + state updates happen in one transaction.

**Step 14: Mission API Routes**
- `GET /api/missions`, `POST /api/missions/[id]/claim`, `POST /api/missions/[id]/participate`, `GET /api/missions/history`.
- Use Flow mappings from `MissionsRewardsFlows.md` to pre-populate statuses.

### Phase 5: Rewards System
**Step 15: Reward Repository**
- `listRewardsForUser(userId)`, `findRewardById(id)`, `countUsage(userId,rewardId)`, `createVipRedemption(...)`, `getRedemptionForReward(...)`.
- Join `physical_gift_redemptions`, `commission_boost_redemptions` as needed (Pattern 6 for soft deletes, Pattern 9 for encrypted fields).

**Step 16: Reward Service (`rewardService.ts`)**
- `getRewardsPage(userId)`, `claimReward(userId, rewardId, payload)`, `getRedemptionHistory(userId)`.
- Implement limit checks (`Loyalty.md lines 2227-2330`), scheduling windows (commission boost 6 PM EST, discount 9 AM–4 PM local), and auto-creation of sub-state rows.

**Step 17: Reward API Routes**
- `GET /api/rewards`, `POST /api/rewards/[id]/claim`, `GET /api/rewards/history`.
- Accept body payload for scheduled activations (date/time), shipping info, or raffle winner flows.

### Phase 6: History & Tiers Pages
**Step 18: History Repositories/Services**
- `missionHistoryRepository.ts`, `rewardHistoryRepository.ts` to fetch paginated concluded items (per API contracts).
- Services to shape responses and compute friendly text.

**Step 19: Tier Service**
- `getTierProgress(userId)` and `getTierSettings(clientId)` referencing Flow 7 results and admin configuration (`Loyalty.md 2555-3056`).
- API route `/api/tiers`.

### Phase 7: Cron Jobs & Automation
**Step 20: Cron Service Modules**
- `/cron/daily-sync.ts` implementing Flow 1 (download CSV via Puppeteer, parse, upsert videos, update users) and Flow 7 (tier calculation) sequentially with `Pattern 1` transactions and `Pattern 7` logging.
- Add `cron/manual-upload.ts` (optional) to reuse parsing logic for fallback uploads.

**Step 21: Scheduling**
- Configure `vercel.json` cron (6 PM EST). Provide local script for manual run.

### Phase 8: Frontend Integration & Toggle Strategy
**Step 22: MSW Swap Process**
- Introduce env flags (`NEXT_PUBLIC_USE_REAL_AUTH`, etc.) so each page flips individually.
- Provide integration checklist per page (network tab verification) before toggling flag to true.

**Step 23: Monitoring & Alert Hooks**
- Hook Resend email alerts for cron failures, integrate logging to Vercel/Logflare.

### Phase 9: Ops Hardening
**Step 24: Rate Limiting Middleware**
- Implement `/lib/middleware/rateLimit.ts` using Upstash for auth endpoints (5/min) and general endpoints (100/min) per requirements.

**Step 25: Session & Cookie Hardening**
- Ensure `HttpOnly`, `Secure`, `SameSite=Strict`, 30-day TTL.

## Architecture Decisions
### Code Organization
```
/app/api/*/route.ts        // Presentation layer
/lib/types/*.ts            // Shared interfaces/enums
/lib/supabase/*.ts         // Supabase clients
/lib/repositories/*.ts     // Data access (multi-tenant filters)
/lib/services/*.ts         // Business logic, Pattern enforcement
/lib/utils/*.ts            // Auth, encryption, validation, errors
/cron/*.ts                 // Flow 1 & 7 automation
```

### Multi-Tenant Isolation Strategy
- Every repository function: fetch authenticated user once → capture `client_id`.
- Queries include `.eq('client_id', clientId)` and verify `count > 0` on mutations (Pattern 8).
- Example (`missionRepository.findByHandle`):
  ```typescript
  await supabase
    .from('missions')
    .select('*')
    .eq('client_id', clientId)
    .eq('id', missionId)
    .single()
  ```
- Services never accept client_id from request body; derive from user context.

### Critical Patterns Implementation
- **Pattern 1:** Wrap mission completion → redemption creation → progress updates inside a Supabase RPC or explicit `pg` transaction (use service role).
- **Pattern 2:** Let DB constraints reject duplicates; services catch `23505` errors, return idempotent success.
- **Pattern 3:** Implement trigger functions restricting invalid status jumps; repositories update via allowed states only.
- **Pattern 4:** Trigger on `commission_boost_redemptions` updates to sync `redemptions.status` automatically.
- **Pattern 5:** Enumerations centralised in `/lib/types/enums.ts`; zod schemas validate before hitting DB.
- **Pattern 6:** Provide `vipRewardManager` service to backfill soft-deletions when tier changes detected in Flow 7.
- **Pattern 7:** Build `log_boost_transition` trigger exactly as `SchemaFinalv2.md:710-770`.
- **Pattern 8:** Enforce `.eq('client_id', clientId)` + `count` checks in repository templates.
- **Pattern 9:** `/lib/utils/encryption.ts` handles AES-256-GCM with `ENCRYPTION_KEY` env var, storing `iv:authTag:cipher`. All payment info flows use this helper.

## Security Implementation
- **Multi-tenant enforcement:** repository templates, plus integration tests to confirm cross-tenant attempts fail.
- **Sensitive data encryption:** AES-256-GCM for `payment_account` and similar fields; never log decrypted values.
- **Input validation:** All routes use Zod schemas replicating contract shapes; normalization (handle regex `^[a-zA-Z0-9_.]{1,30}$` per `API_CONTRACTS.md:20-77`).
- **Rate limiting:** Upstash tokens per IP/user (5/min for auth, 100/min for others).
- **Session management:** Supabase JWT issuance, HTTP-only cookies, refresh on login; update `last_login_at` post dashboard fetch for congrats modal logic.
- **Audit logging:** Use `commission_boost_state_history`, `tier_checkpoints`, `handle_changes` for compliance.

## API Implementation Order
1. Auth endpoints (check-handle → reset-password) – unblock frontend login flows; independent of missions.
2. Dashboard endpoints (`/dashboard/featured-mission`, `/dashboard`) – rely on user data only.
3. Missions endpoints – need mission, mission_progress, redemptions logic ready.
4. Rewards endpoints (`/rewards`, claim, history) – depend on mission completion/redemptions.
5. History endpoints (mission/reward history) – read-only after above exist.
6. Tiers endpoint – minimal dependencies besides tiers/users.
- Verification: Postman/Newman collection for each endpoint, compare responses to API contracts before toggling frontend.

## Integration Strategy
- **Swapping mocks:** Add page-level env toggles (e.g., `NEXT_PUBLIC_HOME_USE_REAL_API`). Flip per page once backend endpoint returns contract-compliant data.
- **Rollback:** If integration fails, revert env flag to `false`; frontend reverts to MSW without code changes.
- **Env vars:** `.env.local` holds Supabase keys, encryption key, Upstash credentials, Resend API key, Cron secrets; document in README.
- **Page rollout order:** Auth → Home → Missions → Rewards → History → Tiers.
- **Verification:** Manual UX smoke test + console assertion of API payload shapes after each toggle.

## Cron Jobs & Automation
- **Daily metrics sync (Flow 1, `Loyalty.md:410-610`):** `cron/daily-sync.ts` orchestrates Puppeteer download, CSV parse (`csv-parse`), video upserts, precomputed updates, and OTP/resend metrics. Send Resend alert on failure.
- **Daily tier calculation (Flow 7, `Loyalty.md:1449-1678`):** Same cron invokes `runTierCalculations()` after sync, applying adjustments, evaluating checkpoints, logging `tier_checkpoints`, handling VIP reward soft deletes/reactivation.
- **Activation tasks (discount/boost scheduling):** For MVP manual fulfilment, rely on Google Calendar creation from API (per Flow 9B) until automation added; optionally add future cron to auto-activate.
- **Fallback manual upload:** Provide admin API to upload CSV to Supabase storage and trigger parser.

## Risk Assessment
- **Cross-tenant leak risk:** If any repository misses `.eq('client_id', ...)`, data leaks. Mitigation: shared query builder + automated tests hitting unauthorized tenant scenarios early.
- **State machine bugs (missions/rewards):** Invalid transitions could pay twice. Mitigation: implement Pattern 3 triggers first, unit-test service transitions with fixture data.
- **Encryption handling:** Wrong key rotation could corrupt payout data. Mitigation: create deterministic integration test encrypt→decrypt, store key in Vercel secrets, add health check endpoint for encryption.
- **Cron failures:** Data staleness >24h unacceptable. Mitigation: send Resend alert + manual upload instructions; keep manual upload tool ready before cron goes live.
- **CSV automation fragility:** Puppeteer selectors may change. Mitigation: wrap automation with retry/backoff and versioned selector config.

## Critical Path Analysis
- **Demo minimum:** Auth (Flows 3-5), Dashboard data, Missions page with at least one mission type, Rewards page with claim flow for one instant reward, manual fulfillment path.
- **Critical path steps:** 
  1. Deploy schema + seeds.
  2. Implement auth stack.
  3. Deliver dashboard endpoints.
  4. Implement mission state machine + claim API.
  5. Implement reward claim + fulfilment metadata.
  6. Wire manual cron stubs (manual trigger) for demo data freshness.
- **Deferrable items:** Raffle missions, commission boost payout automation, admin config UI, cron auto-activation for discounts/boosts, full Upstash rate limiter (can stub with middleware returning 429).
- **Dependencies:** Repositories rely on Supabase client + types; services rely on repository coverage; API routes rely on services; frontend depends on endpoints toggled.

## Success Criteria Per Phase
- **Phase 1:** Type defs compile; Supabase clients usable server-side; encryption helper round-trips sample data.
- **Phase 2:** Entire auth journey (check handle → OTP → login → forgot/reset) works against DB; OTP attempts capped; sessions issued.
- **Phase 3:** `/api/dashboard` + `/api/dashboard/featured-mission` return contract-compliant payloads with congrats modal logic updating `last_login_at`.
- **Phase 4:** `/api/missions` renders correct priority ordering; POST claim enforces mission status + idempotency; raffle participation recorded.
- **Phase 5:** `/api/rewards` surfaces availability/limits; claim endpoint handles instant + scheduled payloads, encrypted payment info, soft deletes.
- **Phase 6:** History + tier endpoints paginate and format per contract.
- **Phase 7:** Cron job can be run locally to ingest fixture CSV and recalc tiers (manual trigger ok pre-prod).
- **Phase 8:** All frontend pages toggled to live APIs with env flags documented and rollback path tested.

## Next Steps
1. Generate Supabase migration files from `SchemaFinalv2.md` and apply to a fresh project.
2. Scaffold `/lib` skeleton (types, supabase clients, utils) and commit.
3. Implement auth repositories/services/routes and verify with Postman collection before moving to dashboard stack.
