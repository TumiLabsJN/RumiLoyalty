# Testing Planning for EXECUTION_PLAN.md Integration

**Purpose:** Document findings from three testing strategy proposals (Gemini, Codex, Claude) and provide actionable recommendations for integrating testing into EXECUTION_PLAN.md.

**Audience:** LLM executing EXECUTION_PLAN.md tasks

---

## Source Documents Analyzed

| Document | Lines | Author | Philosophy |
|----------|-------|--------|------------|
| GeminiTests.md | 305 | Gemini | "Testing trophy" - integration as core, E2E as guarantee, unit as helpers |
| CodexTests.md | 374 | Codex | Ship fast - automation guards business rules, explicit pattern testing |
| TestingStrategy.md | 999 | Claude | 70/20/10 split (integration/unit/E2E), TDD for critical paths |

---

## Consensus Across All Three Documents

### Priority 1 - Must Test (100% Coverage Required)

1. **Multi-tenant isolation (Pattern 8)**
   - Every query must filter by `client_id`
   - Test with 2+ clients, verify no data leakage
   - RLS policies must be tested against real database

2. **Reward value calculations**
   - Money amounts must be accurate ($100 not $1000)
   - Edge cases: exactly at target, off-by-one, floating point

3. **State transition validation (Pattern 3)**
   - Invalid transitions must throw errors (claimed → active)
   - Database constraints enforce valid states

4. **Authentication flows**
   - All 3 check-handle scenarios
   - OTP expiration, max attempts, invalid codes

### Priority 2 - Should Test (90%+ Coverage)

5. **Idempotent operations (Pattern 2)** - No duplicate claims
6. **Transactional workflows (Pattern 1)** - Rollback on failure
7. **Tier filtering** - Gold sees Gold, not Platinum
8. **Mission completion detection** - Exactly at target triggers completion
9. **Encryption (Pattern 9)** - Round-trip works, DB stores ciphertext

### Priority 3 - Nice to Have (Defer)

10. Input validation (Zod handles)
11. Email sending (mock)
12. Date formatting (visual inspection)
13. Admin-only endpoints (after AdminFlows.md complete)

---

## Testing Levels - Agreed Approach

### Integration Tests (Primary - 70% of effort)

**What:** Test Repository → Service → API route against real Supabase database

**Why:** Catches multi-tenant bugs, state transition errors, calculation mistakes, RLS policy issues, trigger behavior

**Tools:** Vitest + Supabase local dev

**Key Principle:** DO NOT mock Supabase. Test against real PostgreSQL with actual RLS policies, triggers, constraints.

### Unit Tests (Secondary - 20% of effort)

**What:** Pure functions in isolation (no DB, no network)

**Scope:**
- `/lib/utils/` (encryption, formatting)
- Calculation helpers (tier progress, mission completion percentage)
- Date calculations (checkpoint dates, raffle deadlines)

**Tools:** Vitest

### E2E Tests (Minimal - 10% of effort)

**What:** Browser automation for critical user journeys

**Scope:**
- Signup → OTP → Login flow
- Mission claim flow
- Reward claim flow

**Tools:** Playwright

---

## Critical Patterns to Test

Each pattern from Loyalty.md requires explicit test coverage:

| Pattern | Test Type | What to Verify |
|---------|-----------|----------------|
| 1. Transactional Workflows | Integration | Rollback on mid-transaction failure |
| 2. Idempotent Operations | Integration | Second call returns same result, no duplicate records |
| 3. State Transition Validation | Integration | Invalid transitions throw specific errors |
| 4. Auto-Sync Triggers | Integration | Parent status updates when child status changes |
| 5. Status Validation Constraints | Integration | DB rejects invalid status values |
| 6. VIP Reward Lifecycle | Integration | Soft delete on demotion, restore on promotion |
| 7. Commission Boost History | Integration | Trigger logs all state transitions |
| 8. Multi-Tenant Isolation | Integration | Client A cannot see Client B data |
| 9. Sensitive Data Encryption | Unit + Integration | Encrypt/decrypt round-trip, DB stores ciphertext |

---

## Test Database Strategy

### Setup
```bash
supabase start
supabase db reset
npm run test:seed
```

### Seeding
- Create 2 clients (different vip_metric modes)
- Create 4 tiers per client
- Create 1 user per tier per client
- Create tier-specific rewards and missions

### Cleanup
- Each test suite uses `beforeEach`/`afterEach` hooks
- Transaction rollback OR truncate tables in reverse FK order

### Isolation
- Tests can run in parallel with unique tenant IDs
- Sequential for tests depending on cron/transactions

---

## Recommended EXECUTION_PLAN.md Structure

### Option 1: Inline Test Tasks (RECOMMENDED)

Add `-TEST` suffix task immediately after implementation task:

```markdown
- [ ] **Task 3.3.1:** Create signup route
    - **Action:** Create POST handler...
    - **Acceptance Criteria:** ...

- [ ] **Task 3.3.1-TEST:** Test signup route
    - **Action:** Add integration tests for signup endpoint
    - **References:** TestingStrategy.md, API_CONTRACTS.md lines 189-437
    - **Test Cases:** (1) happy path 201, (2) EMAIL_ALREADY_EXISTS 400, (3) INVALID_EMAIL 400, (4) PASSWORD_TOO_SHORT 400, (5) TERMS_NOT_ACCEPTED 400, (6) OTP_SEND_FAILED 500
    - **Acceptance Criteria:** All 6 test cases passing
```

### Option 2: Testing Step Per Phase

Add Step X.Y at end of each phase for testing:

```markdown
## Step 3.4: Auth Testing
- [ ] **Task 3.4.1:** Test check-handle endpoint
- [ ] **Task 3.4.2:** Test signup endpoint
- [ ] **Task 3.4.3:** Test verify-otp endpoint
- [ ] **Task 3.4.4:** Test login endpoint
- [ ] **Task 3.4.5-GATE:** All auth tests passing
```

### Gate Tasks

After each major Step, add verification gate:

```markdown
- [ ] **Task X.Y.Z-GATE:** Verify all tests passing
    - **Command:** `npm run test:unit && npm run test:integration`
    - **Acceptance Criteria:** 0 failures, coverage >= 85% for this module
```

---

## Test File Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── dashboardService.test.ts
│   │   ├── missionService.test.ts
│   │   └── rewardService.test.ts
│   └── utils/
│       ├── encryption.test.ts
│       └── formatting.test.ts
├── integration/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── check-handle.test.ts
│   │   │   ├── signup.test.ts
│   │   │   ├── verify-otp.test.ts
│   │   │   └── login.test.ts
│   │   ├── dashboard/
│   │   ├── missions/
│   │   └── rewards/
│   ├── patterns/
│   │   ├── idempotency.test.ts
│   │   ├── multi-tenant.test.ts
│   │   └── state-transitions.test.ts
│   └── flows/
│       ├── mission-claim.test.ts
│       └── tier-promotion.test.ts
├── e2e/
│   └── creator-journeys/
│       ├── signup-to-claim.spec.ts
│       └── mission-completion.spec.ts
└── fixtures/
    ├── factories.ts
    ├── testData.ts
    └── helpers.ts
```

---

## Coverage Goals

| Component | Target | Rationale |
|-----------|--------|-----------|
| Repositories | 90% | Multi-tenant filters critical |
| Services | 90% | Business rules enforcement |
| API Routes | 85% | Integration tests cover typical cases |
| Utils | 70% | Encryption 100%, formatters lower |
| Overall | 85% | High enough to catch regressions |

---

## When to Write Tests

| Approach | When to Use |
|----------|-------------|
| TDD (Test-First) | Multi-tenant isolation, money calculations, state transitions |
| Test-During | API endpoints, service layer logic |
| Test-After | Simple CRUD, utilities, formatters |

---

## Implementation Sequence

### Phase 0 Addition: Testing Infrastructure

```markdown
## Step 0.3: Testing Infrastructure Setup
- [ ] **Task 0.3.1:** Install testing dependencies
    - **Command:** `npm install -D vitest @vitest/coverage-v8 playwright @playwright/test supertest`
    - **Acceptance Criteria:** All packages in devDependencies

- [ ] **Task 0.3.2:** Configure Vitest
    - **Action:** Create vitest.config.ts with coverage thresholds
    - **Acceptance Criteria:** `npm run test` works, coverage reports generated

- [ ] **Task 0.3.3:** Create test fixtures
    - **Action:** Create /tests/fixtures/factories.ts with createTestClient, createTestUser, createTestMission, createTestReward
    - **Acceptance Criteria:** Factory functions create valid test data

- [ ] **Task 0.3.4:** Create test database setup
    - **Action:** Create /tests/setup/setup-test-db.ts
    - **Acceptance Criteria:** Tests run against isolated Supabase instance

- [ ] **Task 0.3.5:** Add npm scripts
    - **Action:** Add test:unit, test:integration, test:e2e, test:coverage to package.json
    - **Acceptance Criteria:** All scripts execute correctly
```

### Per-Phase Testing Steps

Each implementation phase (3-8) should end with a Testing Step:

- **Phase 3:** Step 3.4 - Auth Testing
- **Phase 4:** Step 4.4 - Dashboard Testing
- **Phase 5:** Step 5.4 - Missions Testing
- **Phase 6:** Step 6.4 - Rewards Testing
- **Phase 7:** Step 7.3 - History Testing
- **Phase 8:** Step 8.4 - Cron Testing

---

## Test Task Template

Use this template when adding test tasks to EXECUTION_PLAN.md:

```markdown
- [ ] **Task X.Y.Z-TEST:** Test [feature/endpoint]
    - **Action:** Add [unit|integration|E2E] tests for [component]
    - **References:** [TestingStrategy.md], [API_CONTRACTS.md lines], [relevant docs]
    - **Test Cases:** (1) [case], (2) [case], (3) [case]...
    - **Acceptance Criteria:** All N test cases passing, [specific coverage requirement if applicable]
```

---

## Manual Testing Checklist (Pre-Deploy)

To be executed before each production deployment:

- [ ] Auth flow: Signup → OTP → Login completes
- [ ] Dashboard loads with correct tier, progress, featured mission
- [ ] Missions page shows only user's tier missions
- [ ] Completed mission shows "Claim" button
- [ ] Claim triggers modal correctly
- [ ] Redemption appears in history
- [ ] Navigation between all pages works
- [ ] Loading states show (no white flashes)
- [ ] Error messages are user-friendly
- [ ] Mobile responsive (375px width)

---

## Implementation Approach for EXECUTION_PLAN.md Integration

### Key Principles (Revised)

1. **Inline testing** - Add `-TEST` task immediately after each implementation task, not in separate phase
2. **No separate infrastructure step** - Create fixtures when first test needs them
3. **No gate tasks** - Test pass/fail is self-evident from test task acceptance criteria
4. **Pattern tests embedded** - Multi-tenant, idempotency tested within feature tests, not separately
5. **Focus on catastrophic bugs** - 25 high-value tests, not 42 bureaucratic tasks

---

## The 25 Critical Tests

Derived from systematic analysis: "What's the worst that could happen?" per feature.

### Category 1: Auth (Tests 1-3)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 1 | Auth flow (signup → OTP → login) | Users can't log in | Task 3.3.5 (login route) |
| 2 | OTP expiration enforced (expired OTP rejected) | Account takeover via old OTP | Task 3.3.3 (verify-otp route) |
| 3 | Password reset token single-use | Account takeover via reused token | Task 3.3.6 (reset-password route) |

### Category 2: Multi-tenant & Tier (Tests 4-7)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 4 | Multi-tenant isolation (Client A ≠ Client B) | Data leakage, lawsuit | Task 4.2.1 (dashboard service) |
| 5 | Tier filtering (Gold sees Gold, not Platinum) | Wrong content shown | Task 5.2.1 (missions service) |
| 6 | Tier promotion → new rewards immediately visible | User misses earned rewards | Task 8.3.2 (tier calculation cron) |
| 7 | Tier demotion → rewards soft-deleted correctly | Orphan data, user confusion | Task 8.3.2 (tier calculation cron) |

### Category 3: Missions (Tests 8-11)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 8 | Mission completion at exact target (edge cases: target, target-1, target+1) | Mission stuck, can't claim | Task 5.2.2 (mission progress) |
| 9 | Mission claim → redemption created correctly | Claim broken, no reward | Task 5.3.1 (claim endpoint) |
| 10 | Mission history shows completed missions | User thinks data vanished | Task 7.2.1 (history endpoint) |
| 11 | Raffle: 5 users enter, 1 winner, 4 losers see correct messages | Everyone wins bug (100 iPhones) | Task 5.3.3 (raffle participate) |

**Test 11 Details:**
- Seed 5 users, all participate in raffle
- Admin picks 1 winner
- Assert: 1 user has `is_winner=true`, redemption `status='claimable'`
- Assert: 4 users have `is_winner=false`, redemption `status='rejected'`
- Assert: 4 users see "Better luck next time" (via API response or history)

### Category 4: Rewards - 6 Types (Tests 12-19)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 12 | gift_card: correct amount displayed and stored | $100 shows as $1000, financial loss | Task 6.3.1 (reward claim) |
| 13 | commission_boost: full lifecycle (scheduled → active → expired → pending_info → pending_payout → paid) | Boost stuck, never paid | Task 6.3.2 (commission boost claim) |
| 14 | commission_boost: payout calculation correct (sales_delta × boost_rate) | Wrong payout amount | Task 6.3.2 (commission boost claim) |
| 15 | spark_ads: claim creates redemption correctly | Broken reward type | Task 6.3.1 (reward claim) |
| 16 | discount: max_uses enforced (stops working after N uses) | Unlimited coupon use, revenue loss | Task 6.3.3 (discount claim) |
| 17 | discount: activation at scheduled time works | Discount never activates | Task 8.3.3 (scheduled activation cron) |
| 18 | physical_gift: shipping info required, stored correctly | Gift shipped to nowhere | Task 6.3.4 (physical gift claim) |
| 19 | experience: claim creates redemption correctly | Broken reward type | Task 6.3.1 (reward claim) |

### Category 5: State & Idempotency (Tests 20-22)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 20 | Idempotency: claim twice = 1 redemption (not 2) | Double payout | Task 6.3.1 (reward claim) |
| 21 | Invalid state transitions rejected (claimed → claimable throws error) | Corrupt data | Task 6.2.1 (redemption service) |
| 22 | Redemption lifecycle completes (claimed → fulfilled → concluded) | Redemption stuck forever | Task 6.3.2 (commission boost claim) |

### Category 6: Cron & Automation (Tests 23-25)

| # | Test | Catastrophe Prevented | Add After Task |
|---|------|----------------------|----------------|
| 23 | Daily sync updates user metrics correctly | Stale dashboard data | Task 8.2.1 (daily sync cron) |
| 24 | Tier calculation uses correct thresholds | Users in wrong tier | Task 8.3.2 (tier calculation cron) |
| 25 | Scheduled activation fires at 6PM EST correctly | Commission boost / discount never activates | Task 8.3.3 (scheduled activation cron) |

---

## How to Add Tests to EXECUTION_PLAN.md

### Pattern: Inline `-TEST` Task

After each implementation task, add the corresponding test task:

```markdown
- [ ] **Task 6.3.2:** Create commission boost claim endpoint
    - **Action:** Create POST handler for commission boost with scheduling
    - **References:** API_CONTRACTS.md lines X-Y
    - **Acceptance Criteria:** Creates redemption + commission_boost_redemptions record

- [ ] **Task 6.3.2-TEST:** Test commission boost claim
    - **Action:** Add integration tests for commission boost lifecycle
    - **References:** TestingPlanning.md Test #13, #14, #22
    - **Test Cases:**
      (1) Claim creates redemption with status='claimed' and boost_status='scheduled'
      (2) Full lifecycle: scheduled → active → expired → pending_info → pending_payout → paid
      (3) Payout calculation: sales_delta=1000, boost_rate=5% → final_payout=50
      (4) Claim twice returns same redemption (idempotency)
    - **Acceptance Criteria:** All 4 test cases passing
```

### When to Create Test Infrastructure

**First test task (likely Task 3.3.1-TEST)** should include:
- Install vitest, supertest
- Create `/tests/fixtures/factories.ts` with needed factory functions
- Create test database setup

Don't create infrastructure before you need it.

---

## Test Task Template

```markdown
- [ ] **Task X.Y.Z-TEST:** Test [feature]
    - **Action:** Add [integration|unit] tests for [component]
    - **References:** TestingPlanning.md Test #N, API_CONTRACTS.md lines X-Y
    - **Test Cases:** (1) [case], (2) [case], (3) [case]...
    - **Acceptance Criteria:** All N test cases passing
```

---

## Summary

| Metric | Old Plan | New Plan |
|--------|----------|----------|
| Total test tasks | 42 | 25 |
| Separate infrastructure step | Yes | No (create when needed) |
| Gate tasks | 6 | 0 |
| Pattern tests separate | Yes | No (embedded in feature tests) |
| Testing placement | End of phase | Inline after implementation |

**Result:** 25 focused tests that catch catastrophic bugs, added inline with implementation for maximum context retention

---

## References

- GeminiTests.md - /home/jorge/Loyalty/Rumi/GeminiTests.md
- CodexTests.md - /home/jorge/Loyalty/Rumi/CodexTests.md
- TestingStrategy.md - /home/jorge/Loyalty/Rumi/TestingStrategy.md
- EXECUTION_PLAN_STRUCTURE_GUIDE.md - /home/jorge/Loyalty/Rumi/EXECUTION_PLAN_STRUCTURE_GUIDE.md
