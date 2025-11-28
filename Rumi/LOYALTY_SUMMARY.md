# Phase 0 Documentation Audit Outputs

**Tasks 0.1.1 - 0.1.4 Combined Summary**
**Created:** 2025-11-28

---

# Task 0.1.1: Loyalty.md Summary

---

## 9 Critical Implementation Patterns

**Source:** Loyalty.md lines 1794-1953

### Pattern 1: Transactional Workflows
- **Requirement:** Wrap all multi-step state changes in database transactions
- **Apply to:** Mission progress updates → redemption creation → next mission unlock, Tier promotion → reward creation, Claim reward button → sub-state record creation, Raffle winner selection → redemption updates
- **Rule:** ALL steps succeed OR ALL rollback (no partial updates)
- **Reference:** ARCHITECTURE.md Section 10.1

### Pattern 2: Idempotent Operations
- **Requirement:** All claim operations MUST be idempotent via database UNIQUE constraints
- **Apply to:** Mission reward claims (UNIQUE: user_id, mission_progress_id), Raffle participation (UNIQUE: mission_id, user_id), VIP tier rewards (UNIQUE: user_id, reward_id, tier_at_claim, claimed_at), Payment info submission
- **Rule:** Database rejects duplicate operations at query level
- **Reference:** SchemaFinalv2.md Section 2 (constraints), ARCHITECTURE.md Section 10.2

### Pattern 3: State Transition Validation
- **Requirement:** Database triggers MUST validate all state transitions
- **State Machines:**
  - redemptions: claimable → claimed → fulfilled → concluded (terminal)
  - commission_boost: scheduled → active → expired → pending_info → pending_payout → paid (terminal)
  - mission_progress: dormant → active → completed (terminal)
- **Rule:** Only valid transitions allowed. Invalid transitions raise EXCEPTION
- **Reference:** SchemaFinalv2.md lines 752-785 (trigger examples)

### Pattern 4: Auto-Sync Triggers
- **Requirement:** Commission boost sub-state changes MUST auto-update parent redemption status
- **Apply to:** Commission boost lifecycle transitions, Payment queue processing, Admin payout actions
- **Mapping:** scheduled/active/expired/pending_info → claimed | pending_payout → fulfilled | paid → concluded
- **Rule:** Database triggers keep boost_status and redemptions.status synchronized
- **Reference:** SchemaFinalv2.md lines 690-693

### Pattern 5: Status Validation Constraints
- **Requirement:** CHECK constraints MUST enforce valid status values on all state columns
- **Valid Values:**
  - redemptions.status: 'claimable', 'claimed', 'fulfilled', 'concluded', 'rejected'
  - mission_progress.status: 'active', 'dormant', 'completed'
  - commission_boost_redemptions.boost_status: 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'
- **Rule:** Database rejects invalid status values immediately (prevents typos)
- **Reference:** SchemaFinalv2.md Section 2 (CHECK constraints on all tables)

### Pattern 6: VIP Reward Lifecycle Management
- **Requirement:** VIP tier rewards MUST use backfill + soft delete pattern for tier changes
- **Apply to:** Admin creates new reward for existing tier (backfill to all current tier users), User demoted to lower tier (soft delete claimable rewards: deleted_at, deleted_reason), User re-promoted to higher tier (reactivate existing records, no duplicates)
- **Rule:** Backfill creates redemptions for all eligible users. Soft delete hides/shows rewards based on tier (reversible)
- **Schema:** redemptions.deleted_at, redemptions.deleted_reason (SchemaFinalv2.md lines 579-582)
- **Reference:** ARCHITECTURE.md Section 10.6 (backfill job, tier change handler)

### Pattern 7: Commission Boost State History
- **Requirement:** Commission boost state transitions MUST be logged to audit table via database trigger
- **Apply to:** All commission boost status updates (cron activation, expiration), Admin payout actions (pending_payout → paid), User payment info submission (pending_info → pending_payout)
- **Rule:** Database trigger logs all boost_status changes to commission_boost_state_history table (financial compliance)
- **Reference:** SchemaFinalv2.md lines 735-750 (trigger), ARCHITECTURE.md Section 10.7

### Pattern 8: Multi-Tenant Query Isolation
- **Requirement:** ALL UPDATE/DELETE queries MUST filter by BOTH primary key AND client_id
- **Apply to:** ALL repository UPDATE methods on tenant-scoped tables, ALL repository DELETE methods on tenant-scoped tables
- **Tables:** missions, rewards, redemptions, users, mission_progress, etc.
- **Rule:** WHERE clause MUST include `.eq('client_id', clientId)` to prevent cross-tenant mutations (IDOR attacks)
- **Reference:** ARCHITECTURE.md Section 10.8 (repository pattern, testing)

### Pattern 9: Sensitive Data Encryption (Payment Account Security)
- **Requirement:** Payment accounts (Venmo, PayPal) MUST be encrypted with AES-256-GCM before storing
- **Apply to:** Commission boost payment accounts, Any PII: SSN, tax IDs, bank account numbers (if added later)
- **NOT needed for:** TikTok handles (public), emails (public), order IDs
- **Rule:** Encrypt before INSERT/UPDATE, decrypt after SELECT. Store ENCRYPTION_KEY in environment variable (never hardcode)
- **Algorithm:** AES-256-GCM (industry standard, prevents tampering)
- **Schema:** payment_account VARCHAR(255) stores encrypted string in format "iv:authTag:ciphertext"
- **Reference:** ARCHITECTURE.md Section 10.9

---

## 10 Data Flows

**Source:** Loyalty.md lines 374-2017

### Flow 1: Daily Metrics Sync (Automated)
- **Trigger:** Vercel cron job at 6:00 PM EST daily (11:00 PM UTC)
- **Steps:**
  1. Puppeteer downloads CSV from Cruva (TikTok analytics platform)
  2. Parse CSV with csv-parse library
  3. Process videos: match by tiktok_handle, auto-create new users if not found
  4. Update user precomputed fields (total_sales, checkpoint_sales_current, engagement metrics)
  5. Update mission progress for all active missions
  6. Log sync results
  7. Handle raffles (ensure participation rows exist for eligible users)
  8. Error handling & alerts (email admin within 15 minutes if failure)
- **Data Freshness:** Max 24 hour delay, average 12 hours

### Flow 2: Automatic Creator Onboarding
- **Trigger:** New handle appears in Cruva CSV (during Flow 1)
- **Steps:**
  1. Detect new creator (handle not in database)
  2. Auto-create user account (handle from CSV, email=NULL, tier_1)
  3. Log auto-onboarded creator
- **Note:** Creator discovers program through brand communication, completes registration on first login

### Flow 3: Creator First-Time Registration
- **Trigger:** Creator visits platform URL for first time
- **8-Page Journey:**
  1. `/login/start` - Handle Collection (frontend validation, @ sanitization)
  2. `/login/signup` - Email + Password Collection (terms/privacy sheets)
  3. `/login/otp` - 6-Digit Email Verification (auto-submit, paste handling)
  4. `/login/loading` - User Status Check (routes by last_login_at)
  5A. `/login/welcomeunr` - First-time User Welcome (last_login_at IS NULL)
  5B. `/home` - Returning User Dashboard (last_login_at IS NOT NULL)
- **Two Paths:**
  - Cruva-Sourced (Path 1): Handle exists in DB, may need email registration
  - Word-of-Mouth (Path 2): New handle, sample program flow

### Flow 4: Returning User Login
- **Trigger:** Creator returns to platform
- **Scenario A (Email Registered):**
  - `/login/start` → `/login/wb` (password only) → `/login/loading` → `/home` or `/login/welcomeunr`
  - ~32-35 seconds, no OTP required
- **Scenario B (Cruva Import, No Email):**
  - `/login/start` → `/login/signup` → `/login/otp` → `/login/loading` → `/home`
  - 3-5 minutes, OTP required

### Flow 5: Password Reset (Magic Link)
- **Trigger:** Creator clicks "Forgot password?" on `/login/wb`
- **Steps:**
  1. `/login/forgotpw` - Request reset (lookup by handle)
  2. Email sent with magic link (15-minute expiration)
  3. `/login/resetpw?token=xyz` - Create new password
  4. `/login/wb?reset=success` - Success confirmation
- **Security:** One-time use, 15-minute expiration, old tokens invalidated

### Flow 6: Email Verification System (OTP)
- **Purpose:** Verify email for gift card delivery, discount codes, payment info
- **OTP Generation:** 6-digit code, bcrypt hashed, 5-minute expiration
- **Verification:** Max 3 attempts, one-time use
- **Security Features:** 5-min expiration, 3 attempt limit, rate limiting (1 resend/60 sec)

### Flow 7: Daily Tier Calculation (Automated)
- **Trigger:** Runs immediately after data sync (6:00 PM EST)
- **Steps:**
  0. Apply pending sales adjustments first
  1. Query users due for checkpoint (WHERE next_checkpoint_at <= TODAY)
  2. Calculate checkpoint performance (metric-aware: sales OR units)
  3. Compare to tier thresholds (from tiers table)
  4. Determine outcome (promoted/maintained/demoted)
  5. Update user record (current_tier, tier_achieved_at, next_checkpoint_at)
  6. Log to tier_checkpoints audit table
  7. Handle mission tier changes (old missions persist, new tier missions appear)
- **Note:** Per-user rolling checkpoints, NOT calendar-based

### Flow 8: Creator Claims Reward
- **Trigger:** Creator clicks claim on eligible reward
- **Eligibility Filtering:**
  - Exact tier match (tier_eligibility = current_tier)
  - Monthly/weekly/one-time limits
  - Claim history checks
- **Two Redemption Processes:** Instant rewards vs. scheduled rewards

### Flow 9: Discovery & Onboarding Model (Path 1 - Recognized Creators)
- **Path 1 (Cruva-Sourced):**
  1. Brand outreach via DMs/SMS to existing creators
  2. Program introduction (VIP loyalty benefits)
  3. URL sharing (loyalty.brand.com)
  4. Self-registration: Handle → Email + Password → OTP
  5. Full platform access
- **Database State:** users.tiktok_handle exists, has videos in database

### Flow 10: Discovery & Onboarding Model (Path 2 - Word-of-Mouth/Sample Program)
- **Path 2 (Word-of-Mouth):**
  1. Organic discovery (peers, social media)
  2. Self-registration with unknown handle
  3. Soft onboarding: "Watch your DMs for sample request link"
  4. Preview access (rewards locked, missions hidden)
  5. Content creation: Post video → appears in Cruva → full access granted
- **Database State:** users.tiktok_handle created during signup, no videos initially

---

## Additional Important Sections

### Google Calendar Integration (lines 1690-1793)
- **Purpose:** Create calendar events as reminders for manual tasks
- **Event Types:**
  - Instant Rewards: 🎁 Fulfill {reward_type} (due: claimed_at + 2 hours)
  - Physical Gift: 📦 Ship Physical Gift (due: claimed_at + 2 hours)
  - Discount Activation: 🔔 Activate Discount (due: scheduled_activation_date)
  - Commission Boost Payout: 💸 Commission Payout (due: NOW() + 2 hours)
  - Raffle Drawing: 🎲 Draw Raffle Winner (due: raffle_end_date)

### Dashboard Performance Optimization (lines 2145-2199)
- **Target:** <2 seconds page load on mobile (4G)
- **Strategy:** Precompute during daily sync
- **16 Precomputed Fields:** leaderboard_rank, total_sales, total_units, checkpoint_* metrics, next_tier_* info
- **Performance Savings:** ~270ms per dashboard load

### Checkpoint Demotion Policy (lines 2078-2143)
- **Policy Rules:**
  - No grace periods - immediate demotion
  - Can skip tiers (Platinum → Silver)
  - Strict thresholds (must meet exact threshold)
- **Configuration:** Per-user rolling checkpoints (individual tier_achieved_at dates)
- **Bronze tier:** No checkpoints (entry tier, never demoted)

### Reward Redemption Rules (lines 2011-2077)
- **Time-Based Limits:** Monthly (30 days), Weekly (7 days) windows from tier_achieved_at
- **One-Time Limits:**
  - Once Forever: gift_card, physical_gift, experience
  - Once Per Tier Achievement: commission_boost, spark_ads, discount
- **Eligibility:** Checked at claim time, tier locked in as tier_at_claim

---

## Key Implementation Notes

1. **Multi-tenant Architecture:** All queries MUST filter by client_id (IDOR prevention)
2. **Session Duration:** JWT expiry = 60 days (5184000 seconds) for both creators and admins
3. **Data Freshness:** Dashboard shows data up to 24 hours old (acceptable for MVP)
4. **Email Service:** Resend.com (free tier, 100 emails/day)
5. **Automation Recovery:** Manual CSV upload fallback at `/admin/manual-upload`
6. **VIP Metric Modes:** Clients can use 'sales' (GMV) OR 'units' (quantity sold)

---

# Task 0.1.4: ARCHITECTURE.md - Pattern Confirmation

## Confirmed: Repository → Service → Route Pattern

I have read and confirmed understanding of the 3-layer architecture pattern.

### Layer Structure

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                  (Next.js App Router)                    │
│                                                          │
│  /app/api/missions/route.ts                             │
│  - Handles HTTP requests/responses                       │
│  - Validates input                                       │
│  - Returns JSON                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                         │
│                   (Business Logic)                       │
│                                                          │
│  /lib/services/missionService.ts                        │
│  - Orchestrates repositories                            │
│  - Implements business rules                            │
│  - Pure functions (no direct DB access)                 │
│  - Returns domain objects                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                        │
│                  (Data Access)                          │
│                                                          │
│  /lib/repositories/missionRepository.ts                 │
│  - CRUD operations                                      │
│  - Database queries                                     │
│  - Tenant isolation enforcement                         │
│  - External API calls                                   │
└─────────────────────────────────────────────────────────┘
```

### Key Folder Structure

```
/app/api/         → API Routes (Presentation Layer)
/lib/services/    → Service Layer (Business Logic)
/lib/repositories/→ Repository Layer (Data Access)
/lib/types/       → TypeScript Interfaces
/lib/utils/       → Shared Utilities
/lib/middleware/  → Middleware Functions
/tests/           → Test Files
/cron/            → Background Jobs
```

### Layer Responsibilities

| Layer | Responsibilities | NOT Responsible For |
|-------|-----------------|---------------------|
| **Route** | HTTP handling, input validation, authentication, calling services | Database queries, business logic |
| **Service** | Orchestrating repositories, business rules, data transformations | Direct DB access, HTTP handling |
| **Repository** | CRUD operations, DB queries, tenant isolation, encryption | Business logic, orchestration |

### Security Patterns (Section 9)

1. **Multitenancy Enforcement** - EVERY query MUST filter by `client_id`
2. **Server-Side Validation** - Never trust client input for authorization
3. **Defense in Depth** - Validate at all layers
4. **Encryption** - Encrypt sensitive fields before storage, decrypt after retrieval

### Data Freshness Strategy

- **Precomputed Fields** - 16 fields updated daily during cron sync (dashboard/leaderboard)
- **Compute on Request** - User actions (claims, participation, profile updates)

**Confirmed ready to implement following this pattern.**

---

**END OF SUMMARY**
