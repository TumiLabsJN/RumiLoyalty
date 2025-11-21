# TESTING STRATEGY PROPOSAL

## Executive Summary

This testing strategy prioritizes confidence and correctness while respecting the constraints of a solo developer. Our philosophy is pragmatic: focus testing efforts where the risk is highest and the business logic is most complex. We will employ a "testing trophy" model, favoring a broad base of integration tests over a multitude of brittle unit tests.

The strategy is built on three pillars:
1.  **Integration Tests (The Core):** The majority of our effort will be here. We will test the service layer against a real, isolated test database for every run. This provides the highest return on investment, verifying business logic, database queries, schema constraints, RLS policies, and triggers all at once.
2.  **End-to-End (E2E) Tests (The User's Guarantee):** A small, curated set of E2E tests will validate critical user journeys from the UI to the database and back. These are our ultimate guarantee that the core flows work as expected.
3.  **Unit Tests (The Helpers):** Reserved for pure, isolated logic, primarily within the `/lib/utils` directory (e.g., encryption, formatting). They are fast and easy to write but are a lower priority than integration tests for this database-centric application.

This approach ensures that we ship with high confidence, focusing on preventing the most costly bugs—data leakage between tenants and incorrect financial calculations—while maintaining development velocity.

## Testing Approach

### What Gets Tested (Prioritized List)

**Priority 1 - Critical (Must Test):**
1.  **Multi-Tenancy & Access Control (Pattern 8)**
    -   **Why critical:** Data leakage between clients is the highest-impact business risk. Tier-based access is a core feature.
    -   **Testing approach:** Integration tests that create data for multiple clients/tiers and assert that a user from one client/tier cannot see or modify data from another.
    -   **Coverage goal:** 100% of all data-accessing service functions must have a test case verifying this.

2.  **Transactional & State Machine Logic (Patterns 1, 3, 5, 6)**
    -   **Why critical:** Incorrect point deductions, reward claims, or state changes lead to data corruption and a broken user experience.
    -   **Testing approach:** Integration tests on the service layer that verify atomic operations (e.g., `claimReward`) and enforce legal state transitions (e.g., a mission cannot go from `claimed` back to `active`).
    -   **Coverage goal:** 95%

3.  **Authentication & Authorization**
    -   **Why critical:** A security breach would destroy user trust.
    -   **Testing approach:** E2E tests for the full signup/login flow. Integration tests for OTP logic, session handling, and route protection.
    -   **Coverage goal:** 95%

4.  **Sensitive Data Encryption (Pattern 9)**
    -   **Why critical:** Leaking PII or payment information has severe legal and reputational consequences.
    -   **Testing approach:** Unit tests for the `encrypt`/`decrypt` functions. Integration tests for the `payment_accounts` repository to ensure data is opaque in the database and correctly decrypted in the application.
    -   **Coverage goal:** 100%

**Priority 2 - Important (Should Test):**
1.  **API Contracts (Request/Response Schemas)**
    -   **Why critical:** Ensures the frontend and backend communicate correctly.
    -   **Testing approach:** E2E and integration tests will implicitly verify this. Zod schemas handle request validation.
    -   **Coverage goal:** 80% (via integration/E2E tests)

2.  **Cron Job Automation (Pattern 4)**
    -   **Why critical:** Incorrect daily calculations for tiers or metrics will break core logic.
    -   **Testing approach:** Integration tests for the automation service functions (`syncDailyMetrics`, `calculateDailyTiers`).
    -   **Coverage goal:** 90%

**Priority 3 - Nice to Have (Can Defer):**
1.  **Simple Read Operations:**
    -   **Why deferrable:** Basic `GET` endpoints with minimal logic are low-risk and are often covered by the E2E tests of the pages they support.
    -   **Testing approach:** Covered implicitly by E2E tests.
    -   **Coverage goal:** 60%

### Testing Levels

#### Unit Tests
-   **Purpose:** To verify that small, isolated, pure functions work correctly without any external dependencies (no database, no network).
-   **Scope:** Primarily the `/lib/utils` directory (encryption, formatting) and any pure business logic helpers that can be extracted from services.
-   **Tools:** `Vitest`.
-   **Example:**
    ```typescript
    // /tests/unit/utils/encryption.test.ts
    import { encrypt, decrypt } from '@/lib/utils/encryption';
    import { describe, it, expect } from 'vitest';

    describe('Encryption Utility', () => {
      it('should encrypt and decrypt a string successfully', () => {
        const originalText = 'my-secret-venmo-account';
        const encrypted = encrypt(originalText);
        const decrypted = decrypt(encrypted);

        expect(encrypted).not.toEqual(originalText);
        expect(decrypted).toEqual(originalText);
      });
    });
    ```

#### Integration Tests
-   **Purpose:** To verify the interaction between our application code (services, repositories) and the database. This is the most valuable testing level for this project.
-   **Scope:** The entire service layer. Each test will call a service function and assert changes in the test database. This covers business logic, queries, RLS policies, and triggers.
-   **Tools:** `Vitest` with a test database setup.
-   **Example:** See "Critical Area Testing" section.

#### E2E Tests
-   **Purpose:** To verify that critical user journeys work from end to end, simulating real user interaction in a browser.
-   **Scope:** A few critical flows: 1) Signup & Login, 2) View Dashboard, 3) Complete Mission & Claim Reward.
-   **Tools:** `Playwright`.
-   **Example:** See "Code Examples" section.

### Critical Area Testing

#### A) Creator Flows Testing
This is best handled by E2E tests that mimic the user's exact journey.

-   **Approach:** Use Playwright to script a browser to perform a full signup, receive an OTP (by polling the test database directly for the OTP code), log in, navigate the dashboard, and claim a pre-seeded reward.
-   **Example:** See `Example D: End-to-End Flow Test` below.

#### B) Tier & Multi-Tenant Isolation Testing
This is the most critical integration test.

-   **Approach:** Before tests run, seed the database with two clients (`Client A`, `Client B`) and two users (`User Gold` in Client A, `User Platinum` in Client B). Also create rewards specific to each client and tier. The test then authenticates as `User Gold` and attempts to access data belonging to `Client B` or `User Platinum`.
-   **Example:** See `Example A: Tier Isolation Test` below.

#### C) Reward Value Accuracy Testing
This is a classic integration test case for the service layer.

-   **Approach:** Seed a user and a mission with a specific goal (e.g., `sales_dollars` of 500). Call a service function to simulate progress (e.g., `addSales(500)`). Then call the mission completion check service and assert that the `mission_progress` status is updated to `completed` in the database.
-   **Example:** See `Example B: Reward Calculation Test` below.

#### D) Critical Patterns Testing
-   **Pattern 1 (Transactional):** Integration test on a service function (e.g., `claimReward`). The test will mock a part of the transaction to fail (e.g., by trying to decrement points below zero, which a DB constraint would block). It will then assert that all initial steps (like creating the `user_rewards` record) were rolled back.
-   **Pattern 2 (Idempotent):** Integration test. Call a service function twice in a row with the same `Idempotency-Key`. Assert the database only contains one new record. See `Example C: Idempotency Test`.
-   **Pattern 3 (State Transition):** Integration test. For a mission in the `in_progress` state, call a service function to update its status to `claimed`. Assert that the function throws a specific `InvalidStateTransitionError`.
-   **Pattern 4 (Auto-Sync):** Integration test for the `automationService`. Seed the test DB with mock external data, run the sync function, and assert the `mission_progress` table is updated correctly.
-   **Pattern 7 (Commission Boost History):** Integration test. Update a `user_rewards` record for a commission boost reward and query the `commission_boost_state_history` table to assert that the database trigger correctly inserted a new history record.
-   **Patterns 5, 6, 8, 9:** These are tested via the methods described in sections A, B, and C.

### Testing Tools & Setup

#### Tool Stack
-   **Unit/Integration Testing:** **Vitest**. It's modern, fast, and has a great API.
-   **E2E Testing:** **Playwright**. It's robust, fast, and offers excellent debugging tools for testing browser interactions.
-   **Mocking:** We will **avoid mocking Supabase**. Mocking the database is brittle and fails to test our actual queries, RLS policies, and triggers.
-   **Test Database:** **Supabase's built-in test environment**. We will use `supabase test db` to run our tests against a fresh, isolated PostgreSQL instance on every run.

#### Test Database Strategy
-   **Setup:** Before the entire test suite runs, we will use `supabase db reset` to ensure a clean slate, and then run our schema migrations.
-   **Seeding:** We will use a fixture library (like `test-data-bot` or a simple factory function) in `/tests/fixtures/testData.ts` to create reusable test data. Before each integration test *file* or major `describe` block, we will seed the necessary data (clients, users, missions).
-   **Cleanup:** After each individual test, we will wrap the test logic in a database transaction and roll it back automatically. This provides perfect isolation between tests within the same file and is extremely fast.
-   **Isolation:** The combination of `supabase test db` (isolation between runs) and transaction rollbacks (isolation between tests) provides a robust and fast testing environment.

### When to Write Tests

-   **TDD (Test-First) For:**
    -   **Critical Service Logic:** For complex functions like `claimReward` or `calculateDailyTiers`. Writing the test first forces clear definition of inputs, outputs, and side effects.
    -   **Utility Functions:** For all functions in `/lib/utils`.
-   **Test-During/After For:**
    -   **Repositories & API Routes:** The logic is often simple "wiring". It's more pragmatic to write the implementation and then write an integration test to confirm it's connected correctly.
    -   **E2E Tests:** Always written after the feature is implemented and manually testable.

### Test Organization

#### File Structure
```
/tests
├── e2e/
│   └── creator-journeys.spec.ts
├── fixtures/
│   └── factories.ts
├── integration/
│   ├── services/
│   │   ├── authService.test.ts
│   │   └── rewardService.test.ts
│   └── patterns/
│       └── idempotency.test.ts
├── setup/
│   └── setup-test-db.ts
└── unit/
    └── utils/
        └── encryption.test.ts
```

#### Naming Conventions
-   **Test files:** `[filename].test.ts` for unit/integration, `[feature].spec.ts` for E2E.
-   **Test cases:** `it('should [do something] when [in some state]')`.
-   **Test data:** Use factory functions from `/tests/fixtures/factories.ts` for readable and maintainable data setup (e.g., `createTestUser({ tier: 'gold' })`).

### Code Examples

#### Example A: Tier Isolation Test
```typescript
// /tests/integration/services/rewardService.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, createTestUser, createTestReward } from '@/tests/fixtures/factories';
import { rewardService } from '@/lib/services/rewardService';
import { getTestContext } from '@/tests/setup/getTestContext';

describe('Reward Service - Multi-Tenancy & Tier Isolation', () => {
  beforeAll(async () => {
    // Setup: Create data for two separate clients and tiers
    const clientA = await createTestClient({ name: 'Client A' });
    const clientB = await createTestClient({ name: 'Client B' });

    await createTestUser({ clientId: clientA.id, tier: 'gold', handle: 'gold-user' });
    await createTestUser({ clientId: clientB.id, tier: 'platinum', handle: 'platinum-user' });

    await createTestReward({ clientId: clientA.id, requiredTier: 'gold', name: 'Gold Reward' });
    await createTestReward({ clientId: clientB.id, requiredTier: 'platinum', name: 'Platinum Reward' });
  });

  it('should only return rewards for the user\'s client and accessible tier', async () => {
    // Execution: Authenticate as the Gold user from Client A
    const { db, user } = await getTestContext({ userHandle: 'gold-user' });
    const availableRewards = await rewardService.listAvailableRewards(db, user.id, user.clientId);

    // Assertion
    expect(availableRewards).toHaveLength(1);
    expect(availableRewards[0].name).toBe('Gold Reward');
    expect(availableRewards[0].name).not.toBe('Platinum Reward');
  });
});
```

#### Example B: Reward Calculation Test
```typescript
// /tests/integration/services/missionService.test.ts
it('should update mission status to completed when target is met exactly', async () => {
  // Setup
  const { db, user } = await getTestContext({ userHandle: 'test-user' });
  const mission = await createTestMission({ type: 'sales_dollars', target: 500 });
  const progress = await createMissionProgress({ userId: user.id, missionId: mission.id, status: 'in_progress', value: 0 });

  // Execution
  await missionService.updateSalesProgress(db, progress.id, 500);
  const updatedProgress = await missionService.checkCompletion(db, progress.id);

  // Assertion
  expect(updatedProgress.status).toBe('completed');
});
```

#### Example C: Idempotency Test
```typescript
// /tests/integration/patterns/idempotency.test.ts
it('should not create a duplicate reward claim when called twice with the same idempotency key', async () => {
  // Setup
  const { db, user } = await getTestContext({ userHandle: 'test-user', points: 1000 });
  const reward = await createTestReward({ cost: 100 });
  const idempotencyKey = crypto.randomUUID();

  // Execution
  const res1 = await rewardService.claimReward(db, user.id, user.clientId, reward.id, idempotencyKey);
  const res2 = await rewardService.claimReward(db, user.id, user.clientId, reward.id, idempotencyKey);

  // Assertion
  const claims = await db.from('user_rewards').select().eq('user_id', user.id);
  expect(claims.data).toHaveLength(1); // Only one record created
  expect(res1.status).toBe('SUCCESS');
  expect(res2.status).toBe('SUCCESS_IDEMPOTENT_REPLAY'); // Service returns a special status
});
```

#### Example D: End-to-End Flow Test
```typescript
// /tests/e2e/creator-journeys.spec.ts
import { test, expect } from '@playwright/test';

test('Full user journey: signup, login, and view dashboard', async ({ page }) => {
  // Signup
  await page.goto('/signup');
  await page.fill('input[name="handle"]', 'new-e2e-user');
  await page.fill('input[name="email"]', 'e2e-user@test.com');
  await page.click('button[type="submit"]');

  // In a real test, we'd fetch the OTP from the test DB here
  const otp = '123456'; // Hardcoded for example
  await page.fill('input[name="otp"]', otp);
  await page.click('button[type="submit"]');

  // Login & Dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome, new-e2e-user');
  await expect(page.locator('[data-testid="featured-mission"]')).toBeVisible();
});
```

### Manual Testing Strategy

-   **Checklist:** A "Pre-Release Manual Test" checklist will be maintained in a `TESTING.md` file. It will include:
    -   [ ] Verify the visual layout of the dashboard on Chrome, Firefox, and Safari mobile.
    -   [ ] Perform an exploratory test of the reward claim flow, trying to click buttons out of order.
    -   [ ] Verify that encrypted payment info in the Supabase Studio UI is unreadable gibberish.
    -   [ ] Manually trigger a cron job and verify the outcome for a test user.
-   **When:** Before every production deployment and after any major UI change.
-   **Focus Areas:** UI/UX issues, visual regressions, responsiveness, and anything that requires subjective human judgment—things automation can't easily catch.

### Coverage Goals
-   **Overall Target:** **>85%** line coverage.
-   **Repositories:** **80%** (Focus on `WHERE` clauses and data mapping).
-   **Services:** **95%** (This is the core logic; it must be near-perfect).
-   **API Routes:** **70%** (Mainly testing validation, auth checks, and error handling).
-   **Utils:** **100%** (Pure functions are easy and cheap to test).

### Testing in Development Workflow
-   **On file save:** `vitest --watch` will run only the tests related to the changed files.
-   **On commit:** A `husky` pre-commit hook will run all unit and integration tests (`vitest run`).
-   **On PR:** A GitHub Action will run the entire test suite (`unit`, `integration`, `e2e`) and post a coverage report. Merging will be blocked if tests fail or coverage drops.
-   **Before deploy:** The CI/CD pipeline to production requires the PR checks to be green.

### Testing Sequence (Aligned with Implementation)
-   **Phase 1 (Foundation):** Write unit tests for all `utils` functions.
-   **Phase 2 (Auth):** Write integration tests for `authService`. Write the first E2E test for the signup/login flow.
-   **Phase 3 (Dashboard):** Write integration tests for `homeService`, including multi-tenant checks.
-   **Phase 4 (Missions):** Write integration tests for `missionService`, focusing on state transitions.
-   **Phase 5 (Rewards):** Write integration tests for `rewardService`, focusing on transactional logic and idempotency.
-   This continues, with tests being written *as part of* each implementation phase.

### Risk Assessment
-   **Highest-Risk Areas:**
    1.  **Multi-Tenancy Failure:** Impact: Catastrophic data leak. Mitigation: Every service function that accesses data has a dedicated integration test with a multi-client setup.
    2.  **Incorrect Point/Reward Logic:** Impact: Financial/trust loss. Mitigation: Transactional integration tests that verify atomicity and correctness for all financial operations.
-   **Likely Bug Types:**
    -   **Off-by-one errors in queries:** Detected by integration tests with specific seed data (e.g., progress equals target vs. progress is one less than target).
    -   **RLS policy misconfiguration:** Detected by integration tests where a user from Client A tries to access Client B's data and expects a "not found" or "forbidden" error.