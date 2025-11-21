# TESTING STRATEGY PROPOSAL

## Executive Summary
Ship fast without surprises: automated tests focus on backend behaviors that can silently leak tiers, mis-state rewards, or break transactional flows. I’ll layer tests—unit for deterministic transforms, integration for repository/service boundaries with Supabase, and selective Playwright E2E journeys for creator-critical flows—while keeping coverage high where defects are most expensive (auth, missions, rewards, multi-tenant isolation, monetary calculations). Coverage goals emphasize services/repositories/API routes, with lower emphasis on pure helpers. Manual testing remains essential for UI polish and multi-device confidence, but automation guards business rules, critical patterns, and regression risks.

## Testing Approach

### What Gets Tested (Prioritized List)
**Priority 1 - Critical (Must Test):**
1. Mission & reward state machines (claim, schedule, fulfill)
   - Why critical: Breaks directly impact payouts and user trust.
   - Testing approach: Integration tests per status transition + unit tests on calculators.
   - Coverage goal: ≥90% for services/repositories handling missions/rewards.

2. Authentication & onboarding (signup/OTP/login/reset)
   - Why critical: Blocks entry, handles PII.
   - Testing approach: Integration tests hitting API routes with Supabase test DB; Playwright flow for UI.
   - Coverage goal: ≥85%.

3. Multi-tenant/tier isolation
   - Why critical: Leakage is a showstopper.
   - Testing approach: Unit/integration tests enforcing `.eq('client_id')`, tier filtering, RLS.
   - Coverage goal: 100% of repository methods with tenant filters.

4. Reward value calculations/limits
   - Why critical: Monetary mistakes unacceptable.
   - Testing approach: Unit tests for calculators, integration for limit enforcement.
   - Coverage goal: ≥90%.

**Priority 2 - Important (Should Test):**
1. Cron workflows (Flow 1/7)
   - Why: Keeps dashboards accurate.
   - Approach: Integration tests using fixture CSVs + mocked clock.
   - Coverage: ≥70%.

2. Encryption utilities (Pattern 9)
   - Why: Payout security.
   - Approach: Unit tests verifying round-trip + failure cases.

3. Error boundaries/rate limiting
   - Why: Prevent brute-force & degrade gracefully.
   - Approach: Unit tests for middleware; integration for throttled endpoints.
   - Coverage: ≥70%.

**Priority 3 - Nice to Have (Can Defer):**
1. Admin-only endpoints (config UI)
2. Non-critical UI animations
3. Rare reward types (raffle automation) beyond minimal coverage

### Testing Levels

#### Unit Tests
- **Purpose:** Verify pure logic: eligibility calculations, formatting, encryption.
- **Scope:** Utility modules, validation, service helpers (e.g., mission progress percentage).
- **Tools:** Vitest (fast, TS-native), ts-mockito for light mocks.
- **Example:**
  ```typescript
  import { describe, it, expect } from 'vitest'
  import { calculateMissionProgress } from '@/lib/services/missionService/helpers'

  describe('calculateMissionProgress', () => {
    it('caps percentage at 100', () => {
      const result = calculateMissionProgress({ current: 1200, target: 1000 })
      expect(result.percentage).toBe(100)
    })
  })
  ```

#### Integration Tests
- **Purpose:** Validate repositories/services against Supabase test DB, ensuring SQL filters, triggers, and transactions behave.
- **Scope:** API routes, repository calls, cron jobs (using dockerized Supabase or Supabase test project).
- **Tools:** Vitest/Jest + supertest; `supabase-js` pointing to test DB; custom test seeding helpers.
- **Example:**
  ```typescript
  import request from 'supertest'
  import { app } from '@/tests/integration/server'
  import { seedUser, seedMission } from '@/tests/fixtures'

  it('POST /api/missions/:id/claim enforces idempotency', async () => {
    const { user, mission } = await seedMission({ completed: true })
    const token = await login(user)

    await request(app)
      .post(`/api/missions/${mission.id}/claim`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    await request(app)
      .post(`/api/missions/${mission.id}/claim`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200) // still 200 but no duplicate record

    const redemptions = await supabase.from('redemptions').select('*').eq('mission_progress_id', mission.progressId)
    expect(redemptions.data).toHaveLength(1)
  })
  ```

#### E2E Tests
- **Purpose:** Validate creator journeys in browser (signup → OTP → mission → reward claim).
- **Scope:** Core pages per Flow 3/4/8; ensures UI buttons wired to APIs.
- **Tools:** Playwright (runs against Vercel preview or local server with seeded DB and MSW disabled).
- **Example:**
  ```typescript
  test('creator signs up, verifies OTP, claims reward', async ({ page }) => {
    await page.goto('/login/start')
    await page.fill('[data-testid=handle-input]', 'creatorpro')
    await page.click('text=Continue')
    // ... rest of flow, intercept OTP email via mailhog API, fill code ...
    await page.goto('/rewards')
    await page.click('text=Pay Boost: 5%')
    await expect(page.getByText('Success')).toBeVisible()
  })
  ```

### Critical Area Testing

#### A) Creator Flows Testing
- Automated Playwright suites cover: handle lookup, signup + OTP, returning login, mission claim, reward claim, password reset.
- Integration tests validate API responses on each flow step (e.g., `POST /api/auth/check-handle`, `POST /api/rewards/:id/claim`).
- Button coverage: use React Testing Library to simulate clicks on key UI components (claim CTA, schedule pickers).
- Detect dead ends: Playwright runs check for spinner timeouts, ensures final state (modal text, new mission) appears.

#### B) Tier Isolation Testing
- Repository integration tests seed Gold & Platinum users; assert queries with Gold token never return Platinum rows.
- E2E tests log in as Gold user, inspect DOM ensures Platinum cards absent.
- Automated RLS smoke test: run `select * from rewards` as Authenticated role; expect Supabase to reject.
- Multi-tenant isolation: integration tests create two clients, ensure `client_id` mismatches throw 404.

#### C) Reward Value Accuracy Testing
- Unit tests for `formatRewardDisplay`, `calculateUsageWindow`, `computeSalesDelta`.
- Integration tests for mission completion boundaries: current_value == target_value, > target, < target.
- Supabase triggers tested by setting `commission_boost_redemptions.sales_at_activation`/`expiration` and verifying `final_payout_amount`.
- Assertions on API payloads: e.g., `reward.valueData.amount` equals expected number.

#### D) Critical Patterns Testing
1. **Transactional workflows:** Integration tests wrap mission completion + redemption creation; intentionally inject failure mid-transaction to confirm rollback (no half-created rows).
2. **Idempotent operations:** Tests attempt double claims; expect same outcome / unique constraint prevents second row.
3. **State transition validation:** Integration tests attempt invalid status updates (e.g., claimed → active) using service role; expect SQL exception.
4. **Auto-sync triggers:** Update `commission_boost_redemptions.boost_status` and assert parent `redemptions.status` updated by trigger.
5. **Status validation constraints:** Unit tests ensure zod rejects invalid status; integration tests attempt to insert invalid status → DB error.
6. **VIP reward lifecycle management:** Tests demote user; verify redemptions soft-deleted (`deleted_at` set) and restored on promotion.
7. **Commission boost state history:** Update boost status twice, assert `commission_boost_state_history` has entries with correct statuses and `transition_type`.
8. **Multi-tenant isolation:** Integration tests purposely omit `.eq('client_id')` (via faulty function) using mutation guard to ensure count=0 triggers NotFound.
9. **Sensitive data encryption:** Unit tests ensure `encrypt` + `decrypt` produce original; integration tests verify DB value not plaintext and decrypts correctly.

### Testing Tools & Setup

#### Tool Stack
- **Unit Testing:** Vitest + Testing Library – fast TS support.
- **Integration Testing:** Vitest/Jest + supertest + dockerized Supabase (or Supabase test project).
- **E2E Testing:** Playwright (headless) with seeded DB.
- **Mocking:** Supabase client mocked via `msw` for unit tests; for integration use real test DB.
- **Test Database:** Supabase schema deployed to `SUPABASE_TEST_URL`; use transactional tests with `pg` or supabase RPC to reset.

#### Test Database Strategy
- **Setup:** `supabase db push --seed tests/seeds/base.sql` to dedicated test project; CI uses service key.
- **Seeding:** Fixtures in `/tests/fixtures/*.sql` or builder functions to insert clients, users, missions.
- **Cleanup:** Wrap each integration test in DB transaction or run `truncate` script.
- **Isolation:** Use unique tenant IDs per test; ensure tests run serially when depending on cron/transactions.

### When to Write Tests

#### TDD Approach (Test-First) For:
- Validation utilities and calculators (reward limits, encryption) – ensures logic matches spec before hooking to DB.
- Repository methods enforcing multi-tenant filters – prevents forgetting `.eq('client_id')`.

#### Test-During Approach For:
- API routes/services – write critical path tests as soon as service functions exist (Auth, Missions).
- Cron jobs – write integration test while building job logic.

#### Test-After Approach For:
- UI-only interactions, secondary admin features – validate via manual/Playwright after UI built.

### Test Organization

#### File Structure
```
tests/
├── unit/
│   ├── repositories/
│   ├── services/
│   └── utils/
├── integration/
│   ├── api/
│   └── flows/
├── e2e/
│   └── creator-journeys/
└── fixtures/
    └── testData.ts
```

#### Naming Conventions
- Test files: mirror target path with `.test.ts` suffix (e.g., `lib/services/missionService.test.ts`).
- Test cases: `describe('Service.method')` + `it('handles completed missions')`.
- Fixtures: `buildUserFixture()`, `seedMissionFixture()` functions reused across tests.

### Code Examples

#### Example A: Tier Isolation Test
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { rewardRepository } from '@/lib/repositories/rewardRepository'
import { seedClientWithRewards } from '@/tests/fixtures'

describe('rewardRepository.listRewardsForUser', () => {
  let goldUser: TestUser
  let platinumReward: TestReward

  beforeEach(async () => {
    const { users, rewards } = await seedClientWithRewards()
    goldUser = users.gold
    platinumReward = rewards.platinumOnly
  })

  it('does not return higher-tier rewards', async () => {
    const rewards = await rewardRepository.listRewardsForUser(goldUser.id)

    expect(rewards.some(r => r.id === platinumReward.id)).toBe(false)
    rewards.forEach(r => expect(r.tier_eligibility).toBe(goldUser.current_tier))
  })
})
```

#### Example B: Reward Calculation Test
```typescript
import { calculateCompletionStatus } from '@/lib/services/missionService/helpers'
import { describe, it, expect } from 'vitest'

describe('calculateCompletionStatus', () => {
  it('marks mission completed when current equals target', () => {
    const result = calculateCompletionStatus({ currentValue: 500, targetValue: 500 })
    expect(result.status).toBe('completed')
    expect(result.progressPercentage).toBe(100)
  })
})
```

#### Example C: Idempotency Test
```typescript
import { claimMissionReward } from '@/lib/services/missionService'
import { seedCompletedMission } from '@/tests/fixtures'
import { describe, it, expect } from 'vitest'

describe('claimMissionReward', () => {
  it('returns existing redemption when claiming twice', async () => {
    const { userId, missionId } = await seedCompletedMission()
    const first = await claimMissionReward(userId, missionId)
    const second = await claimMissionReward(userId, missionId)

    expect(first.redemptionId).toBe(second.redemptionId)
    const { data } = await supabase
      .from('redemptions')
      .select('*')
      .eq('mission_progress_id', first.missionProgressId)
    expect(data).toHaveLength(1)
  })
})
```

#### Example D: End-to-End Flow Test
```typescript
import { test, expect } from '@playwright/test'
import { getOtpFromMailhog } from '@/tests/e2e/utils'

test('signup → verify OTP → login → claim reward', async ({ page }) => {
  await page.goto('/login/start')
  await page.fill('[data-testid=handle-input]', 'creatorpro')
  await page.click('button:has-text("Continue")')

  await page.fill('[data-testid=email-input]', 'creator@example.com')
  await page.fill('[data-testid=password-input]', 'SuperSecure123')
  await page.check('[data-testid=terms-checkbox]')
  await page.click('button:has-text("Sign Up")')

  const otp = await getOtpFromMailhog('creator@example.com')
  await page.fill('[data-testid=otp-input]', otp)
  await page.click('button:has-text("Verify")')

  await expect(page).toHaveURL('/home')

  await page.goto('/rewards')
  await page.click('text=Gift Card: $100')
  await page.click('button:has-text("Claim")')
  await expect(page.getByText('Success')).toBeVisible()
})
```

### Manual Testing Strategy

#### Manual Test Checklist
Pre-Deploy Checklist:
[ ] Verify branding/tier colors on mobile + desktop  
[ ] Manually run Flow 3 (signup) with real email to ensure deliverability  
[ ] Test scheduled reward selection UI (commission boost, discount)  
[ ] Fulfill a reward via admin panel and ensure status updates appear in history  
[ ] Trigger cron manually with sample CSV and confirm dashboard updates  
[ ] Verify encryption: inspect DB to ensure payment fields encrypted  

#### When to Perform Manual Testing
- Before each release candidate (at least once per week).
- After significant UI change or new page integration.
- After cron automation or Puppeteer selector change.

#### Manual Testing Focus Areas
- Visual regression (tier badges, reward cards).
- Touch interactions on real devices (drag, scroll).
- Calendar/timezone selectors for scheduled rewards.
- Admin workflows (fulfillment queues).

### Coverage Goals

#### Overall Target
- Goal: 85% statement coverage overall.
- Rationale: high enough to catch regressions while manageable solo.

#### Per-Component Coverage
- Repositories: 90% – multi-tenant filters critical.
- Services: 90% – enforce business rules/patterns.
- API Routes: 80% – integration tests cover typical success/error.
- Utils: 70% – encryption/validation only.

### Testing in Development Workflow

#### Continuous Testing
- On file save: optional Vitest watch for touched unit tests.
- On commit: lint + unit tests.
- On PR: unit + integration suites (parallel), Playwright smoke (headless).
- Before deploy: full suite (unit + integration + e2e). Cron tests optional if no changes.

#### CI/CD Integration
- GitHub Actions workflow: 
  1. `npm run lint`
  2. `npm run test:unit`
  3. `npm run test:integration` (with Supabase service key secrets)
  4. `npm run test:e2e` (Playwright against preview URL)
  5. Upload coverage report; block merge if < thresholds.

### Testing Sequence (Aligned with Implementation)

- **Phase 1 (foundation):** Write unit tests for utils (encryption, formatting).
- **Phase 2 (auth):** Integration tests for auth routes + Playwright signup.
- **Phase 3 (dashboard):** Integration tests verifying aggregated payloads + snapshot tests for featured mission.
- **Phase 4 (missions):** Unit tests for progress calculators, integration tests for claim API + idempotency.
- **Phase 5 (rewards):** Integration tests for limit enforcement, encryption tests, Playwright reward claim.
- **Phase 6 (history/tiers):** Read-only API snapshots.
- **Phase 7 (cron):** Integration test with fixture CSV; run manually.
- **Phase 8 (frontend toggles):** Playwright smoke after each page toggled.

### Risk Assessment

#### Highest-Risk Areas If Inadequately Tested
1. Reward claim logic
   - Impact: Over/under payouts.
   - Mitigation: High-coverage integration tests + e2e claim flows.
2. Multi-tenant leakage
   - Impact: Data exposure.
   - Mitigation: Repository tests + Playwright checks + Supabase RLS tests.
3. Cron pipelines
   - Impact: stale dashboards, mis-tiering.
   - Mitigation: Integration tests with fixtures, manual cron dry runs.

#### Likely Bug Types
- Off-by-one mission completion – catch via boundary tests.
- Missing `.eq('client_id')` – catch via repository tests + static lint rule.
- Trigger misfires (commission boost) – catch via integration test asserting parent status.

### Success Criteria
- All Priority 1 areas ≥ coverage goals and passing automated suites.
- Playwright journeys for Flow 3 + Flow 8 succeed on CI.
- Manual checklist completed for release candidate.
- No open critical testing bugs (tier leak, reward miscalc, auth failure).
- Cron job dry run passes with expected DB updates.

When these criteria are met, backend is considered production-ready.
