# IMPLEMENTATION PROPOSAL

## Executive Summary

This plan builds the backend from scratch in 8 sequential phases, prioritizing the critical path to a demo-able application. The approach focuses on authentication first (highest security risk), then dashboard data (user-facing value), missions system (core engagement), and rewards (monetization). Multi-tenant isolation is enforced at every query via `client_id` filtering. The 9 Critical Patterns from Loyalty.md are implemented throughout as foundational requirements, not afterthoughts.

**Key decisions:**
- Start with Supabase migrations for database creation (version-controlled, repeatable)
- Build repository layer first for data access abstraction and multi-tenant enforcement
- Frontend integration happens page-by-page with environment variable flags (safe rollback)
- Cron jobs deferred to Phase 7 (manual sync initially acceptable for demo)

**Critical path:** Auth (signup/login) → Home page (dashboard + featured mission) → One mission type working (sales_dollars) → One reward claimable (gift_card) = Demo-able in ~5 phases

---

## 1. Database Creation Strategy

### Approach: Supabase Migrations (SQL Files)
Use Supabase CLI to generate timestamped migration files. This provides version control, team collaboration, and production deployment safety.

```bash
supabase init  # Initialize project
supabase migration new initial_schema  # Creates migrations/YYYYMMDDHHMMSS_initial_schema.sql
```

### Table Creation Sequence (FK Dependency Order)

**Phase 1: Foundation Tables (No Dependencies)**
- `clients` - Multi-tenant root table
- `password_reset_tokens` - Auth support (future)

**Phase 2: Client-Dependent Tables**
- `tiers` - References `clients.id`
- `users` - References `clients.id`, `tiers.tier_id`
- `otp_codes` - References `users.id`

**Phase 3: Engagement Tables**
- `rewards` - References `clients.id`, `tiers.tier_id`
- `missions` - References `clients.id`, `tiers.tier_id`, `rewards.id`

**Phase 4: Progress & Redemption Tables**
- `mission_progress` - References `users.id`, `missions.id`
- `redemptions` - References `users.id`, `rewards.id`, `mission_progress.id`
- `raffle_participations` - References `users.id`, `missions.id`

**Phase 5: Sub-State Tables (Reward Type Specific)**
- `commission_boost_redemptions` - References `redemptions.id`
- `physical_gift_redemptions` - References `redemptions.id`

**Phase 6: Audit & History Tables**
- `tier_checkpoints` - References `users.id`
- `sales_adjustments` - References `users.id`, `clients.id`
- `mission_progress_history` - References `mission_progress.id`
- `redemption_status_history` - References `redemptions.id`

### RLS Policies Implementation
Create RLS policies AFTER tables are created. Use one migration file per table for RLS:
```bash
supabase migration new rls_users
supabase migration new rls_missions
```

Key policies (from SchemaFinalv2.md lines 711-790):
- SELECT: Filter by `client_id = auth.jwt() ->> 'client_id'`
- INSERT/UPDATE/DELETE: Same filter + row ownership checks

### Triggers & Indexes
Create triggers in separate migration for clarity:
- `mission_progress_history_trigger` - Logs status changes
- `redemption_status_history_trigger` - Logs redemption state transitions

Indexes (critical for performance):
- `users.client_id`, `users.tiktok_handle`
- `missions.client_id`, `missions.tier_eligibility`
- `mission_progress.user_id`, `mission_progress.status`
- `redemptions.user_id`, `redemptions.status`

### Verification Strategy
1. Run migrations: `supabase db push`
2. Inspect schema: `supabase db dump --schema-only > generated_schema.sql`
3. Compare with SchemaFinalv2.md line-by-line
4. Seed test data: Create 2 clients, 4 tiers per client, 5 test users

---

## 2. Sequential Implementation Flow

### Phase 1: Foundation Infrastructure

**Step 1: Project Setup & Environment**
- Install dependencies: `@supabase/supabase-js`, `bcryptjs`, `zod`
- Create `.env.local` with Supabase credentials
- Configure TypeScript strict mode

**Step 2: Type Definitions**
- `/lib/types/database.ts` - Table row types from schema
- `/lib/types/api.ts` - Request/response interfaces from API_CONTRACTS.md
- `/lib/types/enums.ts` - Status enums (mission_status, redemption_status, etc.)

**Step 3: Supabase Clients**
- `/lib/supabase/client.ts` - Browser client (client-side components)
- `/lib/supabase/server.ts` - Server client (API routes, server components)

**Step 4: Utility Functions**
- `/lib/utils/auth.ts` - `getUserFromSession()`, `requireAuth()`
- `/lib/utils/encryption.ts` - AES-256-GCM for Pattern 9 (payment accounts)
- `/lib/utils/formatting.ts` - Currency, dates, number formatting
- `/lib/utils/validation.ts` - Zod schemas for input validation

**Deliverable:** Type-safe foundation ready for business logic

---

### Phase 2: Authentication System

**Step 5: Auth Repositories**
- `/lib/repositories/userRepository.ts`
  - `findById(userId)` - Multi-tenant filter
  - `findByHandle(clientId, handle)` - Handle lookup
  - `create(userData)` - User registration
  - `updateEmailVerified(userId)` - Post-OTP verification
- `/lib/repositories/otpRepository.ts`
  - `create(userId, codeHash)` - Store OTP
  - `findBySessionId(sessionId)` - Retrieve for verification
  - `markAsUsed(otpId)` - One-time use enforcement
  - `incrementAttempts(otpId)` - Rate limiting

**Step 6: Client Repository**
- `/lib/repositories/clientRepository.ts`
  - `findById(clientId)` - Get client config
  - Used for VIP metric mode (sales vs units)

**Step 7: Auth Service Layer**
- `/lib/services/authService.ts`
  - `checkHandle(handle)` - Routing logic (3 scenarios)
  - `signup(handle, email, password)` - User creation + OTP
  - `verifyOtp(sessionId, code)` - OTP validation + session creation
  - `resendOtp(sessionId)` - Rate-limited OTP regeneration
  - `login(handle, password)` - Password authentication

**Step 8: Auth API Routes**
- `/app/api/auth/check-handle/route.ts`
- `/app/api/auth/signup/route.ts`
- `/app/api/auth/verify-otp/route.ts`
- `/app/api/auth/resend-otp/route.ts`
- `/app/api/auth/login/route.ts`

**Critical Patterns Implemented:**
- Pattern 2: Idempotent Operations (duplicate email check)
- Pattern 8: Multi-Tenant Query Isolation (all queries filter by `client_id`)

**Deliverable:** Complete auth flow working (signup → OTP → login)

---

### Phase 3: Dashboard & Home Page

**Step 9: Dashboard Repositories**
- `/lib/repositories/tierRepository.ts`
  - `findByClientId(clientId)` - Get all tiers
  - `findById(tierId)` - Single tier lookup
- `/lib/repositories/missionProgressRepository.ts`
  - `findFeaturedForUser(userId, clientId)` - Home page featured mission
  - `findByUserAndMission(userId, missionId)` - Progress lookup

**Step 10: Dashboard Service Layer**
- `/lib/services/dashboardService.ts`
  - `getDashboardData(userId, clientId)` - Unified endpoint logic
  - `getFeaturedMission(userId, clientId)` - Priority-based mission selection
  - `calculateTierProgress(userId, clientId)` - Checkpoint calculation with VIP metric awareness

**Step 11: Dashboard API Routes**
- `/app/api/dashboard/route.ts` - GET unified dashboard
- `/app/api/dashboard/featured-mission/route.ts` - GET featured mission

**Critical Patterns Implemented:**
- Pattern 8: Multi-Tenant Query Isolation (all queries filter by `client_id`)
- VIP Metric Mode Handling (sales vs units formatting)

**Deliverable:** Home page fully functional with real data

---

### Phase 4: Missions System

**Step 12: Mission Repositories**
- `/lib/repositories/missionRepository.ts`
  - `findActiveByUser(userId, clientId, tier)` - Available missions
  - `findById(missionId, clientId)` - Single mission lookup
- `/lib/repositories/redemptionRepository.ts`
  - `create(redemptionData)` - Claim mission reward
  - `findByUserAndMission(userId, missionId)` - Check existing claims

**Step 13: Mission Service Layer**
- `/lib/services/missionService.ts`
  - `getAvailableMissions(userId, clientId)` - Filter by tier + status
  - `claimMission(userId, missionId, claimData)` - Transactional claim
  - `participateInRaffle(userId, missionId)` - Raffle entry

**Step 14: Mission API Routes**
- `/app/api/missions/route.ts` - GET available missions
- `/app/api/missions/[id]/claim/route.ts` - POST claim reward
- `/app/api/missions/[id]/participate/route.ts` - POST raffle entry

**Critical Patterns Implemented:**
- Pattern 1: Transactional Workflows (claim uses database transaction)
- Pattern 3: State Transition Validation (prevent invalid status changes)
- Pattern 4: Auto-Sync Triggers (mission_progress_history_trigger)

**Deliverable:** Missions page functional with claim flow

---

### Phase 5: Rewards System

**Step 15: Reward Repositories**
- `/lib/repositories/rewardRepository.ts`
  - `findEligibleByTier(clientId, tier)` - Tier-filtered rewards
  - `findById(rewardId, clientId)` - Single reward lookup
  - `checkRedemptionLimit(userId, rewardId)` - Frequency validation

**Step 16: Reward Service Layer**
- `/lib/services/rewardService.ts`
  - `getEligibleRewards(userId, clientId, tier)` - Filter by tier + limits
  - `claimReward(userId, rewardId, claimData)` - Instant/scheduled claim
  - `scheduleActivation(userId, rewardId, date, time)` - Commission boost scheduling

**Step 17: Reward API Routes**
- `/app/api/rewards/route.ts` - GET eligible rewards
- `/app/api/rewards/[id]/claim/route.ts` - POST claim reward
- `/app/api/rewards/history/route.ts` - GET redemption history

**Critical Patterns Implemented:**
- Pattern 5: Status Validation Constraints (prevent invalid reward claims)
- Pattern 6: VIP Reward Lifecycle Management (commission_boost sub-states)
- Pattern 9: Sensitive Data Encryption (payment account encryption)

**Deliverable:** Rewards page functional with instant + scheduled claims

---

### Phase 6: History & Tiers Pages

**Step 18: History Service Layer**
- `/lib/services/historyService.ts`
  - `getMissionHistory(userId, clientId)` - Concluded missions
  - `getRewardHistory(userId, clientId)` - Past redemptions

**Step 19: History API Routes**
- `/app/api/missions/history/route.ts` - GET mission history
- `/app/api/rewards/history/route.ts` - GET reward history

**Step 20: Tiers API Route**
- `/app/api/tiers/route.ts` - GET tier list for display

**Deliverable:** History and Tiers pages functional

---

### Phase 7: Cron Jobs & Automation

**Step 21: Daily Sync Script**
- `/lib/cron/dailySync.ts`
  - Import Cruva CSV data
  - Update `users.total_sales`, `users.total_videos`, etc.
  - Update `mission_progress.current_value` for active missions
  - Apply pending `sales_adjustments`

**Step 22: Daily Tier Calculation**
- `/lib/cron/dailyTierCalc.ts`
  - Query users with `next_checkpoint_at <= TODAY`
  - Calculate checkpoint performance (sales/units + manual adjustments)
  - Update tier (promoted/maintained/demoted)
  - Log to `tier_checkpoints` audit table

**Step 23: Vercel Cron Configuration**
- `/vercel.json` - Configure cron schedule (2:00 PM EST daily)
- `/app/api/cron/daily-sync/route.ts` - API route for sync
- `/app/api/cron/daily-tier-calc/route.ts` - API route for tier calc

**Critical Patterns Implemented:**
- Pattern 1: Transactional Workflows (tier calculation uses transaction)
- Pattern 7: Commission Boost State History (track boost status changes)

**Deliverable:** Automated daily operations functional

---

### Phase 8: Frontend Integration

**Step 24: Environment Variable Strategy**
Create feature flags per page:
```
NEXT_PUBLIC_AUTH_USE_REAL_API=true
NEXT_PUBLIC_HOME_USE_REAL_API=false
NEXT_PUBLIC_MISSIONS_USE_REAL_API=false
```

**Step 25: Page-by-Page Migration**
1. Auth pages (independent) - Test signup/login/OTP flows
2. Home page (depends on auth) - Verify dashboard data
3. Missions page (depends on home) - Test claim flow
4. Rewards page (depends on missions patterns) - Test redemption
5. History pages (depends on rewards/missions) - Verify completed items
6. Tiers page (independent display) - Verify tier list

**Step 26: Rollback Plan**
Toggle environment variable to `false` → Frontend reverts to MSW mocks

**Step 27: Verification Per Page**
- Manual testing of all user flows
- Check network tab for real API calls
- Verify data matches API_CONTRACTS.md schemas
- Test error scenarios (invalid OTP, expired session, etc.)

**Deliverable:** All 7 pages integrated with real backend

---

## 3. Architecture & Code Organization

### Directory Structure
```
/lib
├── types/              # TypeScript interfaces
├── supabase/           # Database clients
├── repositories/       # Data access layer (multi-tenant queries)
├── services/           # Business logic layer (orchestration)
├── utils/              # Helper functions (auth, encryption, formatting)
└── cron/               # Automation scripts
```

### Multi-Tenant Isolation Strategy
Every repository query includes `.eq('client_id', clientId)`:
```typescript
export async function findByHandle(clientId: string, handle: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('client_id', clientId)  // CRITICAL: Multi-tenant filter
    .eq('tiktok_handle', handle)
    .single()
  return data
}
```

Verification: All UPDATE/DELETE operations must check `affected_row_count === 1`

---

## 4. Critical Patterns Implementation

**Pattern 1: Transactional Workflows**
Use Supabase transactions for multi-step operations:
- Mission claim: Update `mission_progress` + Create `redemptions` in single transaction
- Tier calculation: Update `users` + Insert `tier_checkpoints` atomically

**Pattern 2: Idempotent Operations**
- Check for existing records before INSERT (e.g., duplicate email, duplicate OTP session)
- Use UPSERT where appropriate

**Pattern 3: State Transition Validation**
Validate allowed transitions before updating status:
- `mission_progress`: active → completed ✅, completed → active ❌
- `redemptions`: claimable → claimed ✅, claimed → claimable ❌

**Pattern 4: Auto-Sync Triggers**
Database triggers automatically log state changes to history tables:
- `mission_progress_history_trigger`
- `redemption_status_history_trigger`

**Pattern 5: Status Validation Constraints**
Database CHECK constraints enforce valid enum values:
```sql
CHECK (status IN ('active', 'completed', 'claimed', 'fulfilled'))
```

**Pattern 6: VIP Reward Lifecycle Management**
Commission boost has sub-state table `commission_boost_redemptions`:
- Tracks `boost_status`: scheduled → active → pending_payout → paid_out
- Handles payment method encryption (Pattern 9)

**Pattern 7: Commission Boost State History**
Track boost lifecycle in `redemption_status_history` table

**Pattern 8: Multi-Tenant Query Isolation**
EVERY query filters by `client_id`. RLS policies enforce at database level.

**Pattern 9: Sensitive Data Encryption**
Payment accounts encrypted with AES-256-GCM:
```typescript
import crypto from 'crypto'
const algorithm = 'aes-256-gcm'
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}
```

---

## 5. Security Implementation

**Multi-Tenant Isolation:** Pattern 8 (enforced at repository + RLS layers)

**Encryption:** Pattern 9 (AES-256-GCM for payment accounts in `commission_boost_redemptions` table)

**Input Validation:** Zod schemas for all API request bodies:
```typescript
const signupSchema = z.object({
  handle: z.string().regex(/^@?[a-zA-Z0-9_.]{1,30}$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  agreedToTerms: z.literal(true)
})
```

**Rate Limiting:** Implement via middleware:
- Auth endpoints: 5 requests per IP per minute
- Other endpoints: 100 requests per user per minute

**Session Management:** HTTP-only cookies for auth tokens, 30-day expiration

---

## 6. API Implementation Order

**Phase 1: Auth (Foundation)**
Reason: Required for all other endpoints, highest security risk

**Phase 2: Dashboard (User Value)**
Reason: Shows users their tier, progress, featured mission - immediate engagement

**Phase 3: Missions (Core Engagement)**
Reason: Primary platform interaction, builds on dashboard data

**Phase 4: Rewards (Monetization)**
Reason: Redemption flow, depends on mission patterns

**Phase 5: History (Supporting)**
Reason: Read-only, depends on completed missions/rewards

**Phase 6: Tiers (Simple)**
Reason: Simple list endpoint, no dependencies

---

## 7. Integration Strategy

**Swapping Mocks to Real APIs:** Environment variable flags per page (see Phase 8, Step 24)

**Rollback Plan:** Toggle flag to `false` → Instant revert to MSW mocks

**Page-by-Page Migration:** Auth → Home → Missions → Rewards → History → Tiers

**Verification Per Page:** Manual testing + network inspection + schema validation

---

## 8. Risk Assessment

**Highest-Risk Areas:**

1. **Multi-tenant isolation bugs**
   - Risk: User sees data from another client
   - Mitigation: Repository layer enforces `client_id` filter, RLS policies provide defense-in-depth, integration tests with 2 clients

2. **Commission boost encryption**
   - Risk: Payment info leaked in logs/errors
   - Mitigation: Encrypt at service layer, never log decrypted values, use secure env vars

3. **State transition validation**
   - Risk: Invalid state changes (e.g., claimed → active)
   - Mitigation: Service layer validation + database CHECK constraints

4. **VIP metric mode confusion**
   - Risk: Mixing sales/units calculations
   - Mitigation: Service layer checks `client.vip_metric` before every calculation

**De-risking Strategy:**
- Build auth first (highest security risk)
- Prototype encryption early (validate AES-256-GCM implementation)
- Test multi-tenant queries with 2 clients immediately

**Bottlenecks:**
- Database schema deployment (first-time Supabase setup)
- Frontend integration testing (7 pages to verify)

**Unknowns Requiring Research:**
- Vercel cron job reliability (backup: manual script execution)
- Supabase connection pooling at scale (monitor performance)

---

## 9. Critical Path to Demo-able

**Minimum Viable Features:**
1. Auth flow (login + signup + OTP)
2. Home page (dashboard with featured mission)
3. One mission type working (sales_dollars)
4. One reward type claimable (gift_card)

**What Can Be Deferred:**
- Raffle missions (Phase 4 enhancement)
- Commission boost rewards (complex sub-state)
- Physical gift rewards (shipping logic)
- Discount rewards (TikTok API integration)
- Cron job automation (manual sync initially)
- Admin config system (hardcoded config initially)

**Critical Path Steps:**
1. Phase 1: Foundation (types, clients, utils) - 1 day
2. Phase 2: Auth (complete flow) - 2 days
3. Phase 3: Dashboard (home page data) - 1 day
4. Phase 4: Missions (sales_dollars only) - 2 days
5. Phase 5: Rewards (gift_card only) - 1 day
6. Phase 8: Frontend Integration (auth + home + missions) - 1 day

**Total to demo-able: ~8 days of focused implementation**

**Success Criteria:**
- User can signup with email
- User can login and see their dashboard
- User can view active sales mission with progress
- User can claim completed mission reward
- Gift card redemption shows in history
