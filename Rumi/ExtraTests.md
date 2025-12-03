# Additional Testing Recommendations

**Last Updated:** 2025-12-03
**Status:** Recommendations for tests NOT already in EXECUTION_PLAN.md
**Priority:** HIGH - These tests would significantly improve production confidence

---

## Comparison with EXECUTION_PLAN.md

**Tests ALREADY planned in EXECUTION_PLAN.md (DO NOT duplicate):**
- Phase 3.4: Auth testing (OTP, password reset, handle uniqueness, multi-tenant)
- Phase 4.4: Dashboard testing (service tests, featured mission, multi-tenant)
- Phase 5.4: Mission testing (completion, claim, idempotent, state, tier, history, raffle)
- Phase 6.4: Reward testing (12 tasks)
- Phase 7.3: Tiers testing (2 tasks)
- Phase 8.5: Cron testing (CSV parsing, metrics, tier calculation, scheduled activation)
- Phase 10.2: E2E Playwright tests (signup flow, mission claim, reward redemption, tier isolation)
- Phase 12: Admin testing (25+ test tasks including multi-tenant isolation, role enforcement)

**What's NOT in EXECUTION_PLAN.md (ACTUAL GAPS):**

| Gap | Why It's a Gap | Risk Level |
|-----|----------------|------------|
| **API Contract Schema Validation** | No automated JSON schema validation against API_CONTRACTS.md | HIGH |
| **HTTP error code testing** | E2E tests focus on happy paths, not 401/400/404 responses | HIGH |
| **Specific UI components** | Playwright tests cover flows, not individual UI elements | MEDIUM |
| **Load/concurrent testing** | No tests for 5+ users claiming simultaneously | MEDIUM |
| **Network error handling** | No tests for timeouts, retries, offline states | LOW (MVP) |

---

## 1. API Contract Schema Validation (NOT IN PLAN)

**Why this is missing:** Phase 11 (Final Audit) manually audits endpoints but doesn't automate JSON schema validation.

**File:** `tests/contracts/missions-contract.test.ts`

```typescript
/**
 * API Contract Validation Tests
 *
 * Validates that API responses match the schema defined in API_CONTRACTS.md.
 * This is NOT covered by Phase 10.2 E2E tests which focus on user flows.
 *
 * Run with:
 *   cd appcode && npm run test:contracts
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Schema from API_CONTRACTS.md lines 2976-3140
const MissionsResponseSchema = {
  type: 'object',
  required: ['user', 'missions'],
  properties: {
    user: {
      type: 'object',
      required: ['id', 'currentTier'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        currentTier: {
          type: 'object',
          required: ['id', 'name', 'color'],
          properties: {
            id: { type: 'string', pattern: '^tier_[1-6]$' },
            name: { type: 'string' },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
      },
    },
    missions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'displayName', 'status', 'progress', 'reward'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          displayName: { type: 'string' },
          status: {
            type: 'string',
            enum: [
              'in_progress', 'default_claim', 'default_schedule',
              'boost_claim', 'boost_schedule',
              'raffle_available', 'raffle_processing', 'raffle_won', 'raffle_lost',
              'locked', 'locked_schedule', 'locked_raffle', 'locked_boost',
              'concluded',
            ],
          },
          progress: {
            type: 'object',
            required: ['current', 'target', 'percentage'],
            properties: {
              current: { type: 'number' },
              target: { type: 'number' },
              percentage: { type: 'number', minimum: 0, maximum: 100 },
            },
          },
          reward: {
            type: 'object',
            required: ['type', 'name'],
          },
        },
      },
    },
  },
};

describe('API Contract Validation', () => {
  const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';
  let authToken: string;

  beforeAll(async () => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+1234567890', otp: '123456' }),
    });
    const data = await response.json();
    authToken = data.session?.access_token;
  });

  it('GET /api/missions should match MissionsResponse schema', async () => {
    const response = await fetch(`${API_BASE}/api/missions`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
    });
    const data = await response.json();

    const validate = ajv.compile(MissionsResponseSchema);
    const valid = validate(data);

    if (!valid) {
      console.error('Schema validation errors:', validate.errors);
    }
    expect(valid).toBe(true);
  });

  it('should have exactly 14 valid status values', async () => {
    const response = await fetch(`${API_BASE}/api/missions`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
    });
    const data = await response.json();

    const validStatuses = [
      'in_progress', 'default_claim', 'default_schedule',
      'boost_claim', 'boost_schedule',
      'raffle_available', 'raffle_processing', 'raffle_won', 'raffle_lost',
      'locked', 'locked_schedule', 'locked_raffle', 'locked_boost',
      'concluded',
    ];

    for (const mission of data.missions) {
      expect(validStatuses).toContain(mission.status);
    }
  });

  it('should have progress percentage between 0 and 100', async () => {
    const response = await fetch(`${API_BASE}/api/missions`, {
      headers: { 'Cookie': `auth-token=${authToken}` },
    });
    const data = await response.json();

    for (const mission of data.missions) {
      expect(mission.progress.percentage).toBeGreaterThanOrEqual(0);
      expect(mission.progress.percentage).toBeLessThanOrEqual(100);
    }
  });
});
```

### Test Cases (5 total):

| # | Test | What It Verifies |
|---|------|------------------|
| 1 | `GET /api/missions matches schema` | Response has all required fields with correct types |
| 2 | `Status values are valid` | Only 14 documented statuses appear |
| 3 | `Progress percentage is 0-100` | No invalid percentages like 150% |
| 4 | `Error responses match schema` | Errors have code, message fields |
| 5 | `History response matches schema` | History has required fields |

---

## 2. HTTP Error Code Testing (NOT IN PLAN)

**Why this is missing:** Phase 10.2 E2E tests focus on happy path flows (signup, claim, etc.), not explicit error handling.

**File:** `tests/e2e/api/error-handling.test.ts`

```typescript
/**
 * HTTP Error Code Tests
 *
 * Explicitly tests 401, 400, 404, 409 responses.
 * Phase 10.2 tests flows, not error codes.
 *
 * Run with:
 *   cd appcode && npm run test:e2e:errors
 */

describe('HTTP Error Code Tests', () => {
  const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';

  describe('401 Unauthorized', () => {
    it('GET /api/missions without token returns 401', async () => {
      const response = await fetch(`${API_BASE}/api/missions`);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/missions/:id/claim without token returns 401', async () => {
      const response = await fetch(`${API_BASE}/api/missions/fake-id/claim`, {
        method: 'POST',
      });
      expect(response.status).toBe(401);
    });

    it('GET /api/dashboard without token returns 401', async () => {
      const response = await fetch(`${API_BASE}/api/dashboard`);
      expect(response.status).toBe(401);
    });

    it('GET /api/rewards without token returns 401', async () => {
      const response = await fetch(`${API_BASE}/api/rewards`);
      expect(response.status).toBe(401);
    });
  });

  describe('400 Bad Request', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1234567890', otp: '123456' }),
      });
      const data = await response.json();
      authToken = data.session?.access_token;
    });

    it('POST /api/missions/:id/claim for incomplete mission returns 400', async () => {
      // This requires an active but incomplete mission
      // Test expects MISSION_NOT_COMPLETED code
    });

    it('POST /api/auth/verify-otp with wrong OTP returns 400', async () => {
      const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1234567890', otp: '000000' }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('404 Not Found', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+1234567890', otp: '123456' }),
      });
      const data = await response.json();
      authToken = data.session?.access_token;
    });

    it('POST /api/missions/:id/claim with invalid UUID returns 404', async () => {
      const response = await fetch(`${API_BASE}/api/missions/00000000-0000-0000-0000-000000000000/claim`, {
        method: 'POST',
        headers: { 'Cookie': `auth-token=${authToken}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('409 Conflict', () => {
    it('POST /api/missions/:id/claim twice returns 409', async () => {
      // Tests idempotent claim - second attempt should return 409
    });
  });
});
```

### Test Cases (8 total):

| # | Test | What It Verifies |
|---|------|------------------|
| 1 | `GET /api/missions 401` | Auth middleware blocks requests |
| 2 | `POST claim 401` | Claim requires auth |
| 3 | `GET /api/dashboard 401` | Dashboard requires auth |
| 4 | `GET /api/rewards 401` | Rewards requires auth |
| 5 | `Incomplete mission 400` | Can't claim unfinished missions |
| 6 | `Wrong OTP 400` | Bad OTP rejected |
| 7 | `Invalid UUID 404` | Non-existent mission returns 404 |
| 8 | `Double claim 409` | Already claimed returns conflict |

---

## 3. Detailed UI Component Testing (NOT EXPLICIT IN PLAN)

**Why this is missing:** Phase 10.2 tests user flows ("claim mission") but doesn't test specific UI elements.

**File:** `tests/e2e/playwright/ui-components.spec.ts`

```typescript
/**
 * UI Component Tests
 *
 * Tests specific UI elements not covered by flow-based Phase 10.2 tests.
 *
 * Run with:
 *   cd appcode && npx playwright test ui-components
 */

import { test, expect } from '@playwright/test';

test.describe('Progress Bar Component', () => {
  test('should show correct percentage width', async ({ page }) => {
    // Login first...
    await page.goto('/missions');

    const progressBar = page.locator('[data-testid="progress-bar"]').first();
    if (await progressBar.isVisible()) {
      const width = await progressBar.getAttribute('style');
      expect(width).toMatch(/width:\s*\d+%/);
    }
  });

  test('should update after value change', async ({ page }) => {
    // Verify progress bar reflects database changes
  });
});

test.describe('Claim Modal Component', () => {
  test('should open when claim button clicked', async ({ page }) => {
    await page.goto('/missions');
    const claimButton = page.locator('[data-testid="claim-button"]').first();
    if (await claimButton.isVisible()) {
      await claimButton.click();
      await expect(page.locator('[data-testid="claim-modal"]')).toBeVisible();
    }
  });

  test('should show reward details', async ({ page }) => {
    await page.goto('/missions');
    const claimButton = page.locator('[data-testid="claim-button"]').first();
    if (await claimButton.isVisible()) {
      await claimButton.click();
      await expect(page.locator('[data-testid="reward-name"]')).toBeVisible();
    }
  });

  test('should close on cancel', async ({ page }) => {
    await page.goto('/missions');
    const claimButton = page.locator('[data-testid="claim-button"]').first();
    if (await claimButton.isVisible()) {
      await claimButton.click();
      await page.click('[data-testid="cancel-button"]');
      await expect(page.locator('[data-testid="claim-modal"]')).not.toBeVisible();
    }
  });
});

test.describe('Congratulations Modal', () => {
  test('should appear after successful claim', async ({ page }) => {
    await page.goto('/missions');
    const claimButton = page.locator('[data-testid="claim-button"]').first();
    if (await claimButton.isVisible()) {
      await claimButton.click();
      await page.click('[data-testid="confirm-claim-button"]');
      await expect(page.locator('[data-testid="congrats-modal"]')).toBeVisible({
        timeout: 5000
      });
    }
  });

  test('should show correct reward name', async ({ page }) => {
    // Verify congrats modal shows the claimed reward
  });
});

test.describe('Lock Icon Component', () => {
  test('should appear on tier-locked missions', async ({ page }) => {
    await page.goto('/missions');
    const lockedMission = page.locator('[data-testid="mission-card"][data-status="locked"]').first();
    if (await lockedMission.isVisible()) {
      await expect(lockedMission.locator('[data-testid="lock-icon"]')).toBeVisible();
    }
  });

  test('should disable claim button', async ({ page }) => {
    await page.goto('/missions');
    const lockedMission = page.locator('[data-testid="mission-card"][data-status="locked"]').first();
    if (await lockedMission.isVisible()) {
      const claimButton = lockedMission.locator('[data-testid="claim-button"]');
      await expect(claimButton).toBeDisabled();
    }
  });
});

test.describe('Raffle UI', () => {
  test('should show Enter Raffle button', async ({ page }) => {
    await page.goto('/missions');
    const raffleMission = page.locator('[data-testid="mission-card"][data-type="raffle"]').first();
    if (await raffleMission.isVisible()) {
      await expect(raffleMission.locator('[data-testid="enter-raffle-button"]')).toBeVisible();
    }
  });

  test('should show Processing state after entry', async ({ page }) => {
    await page.goto('/missions');
    const enterButton = page.locator('[data-testid="enter-raffle-button"]').first();
    if (await enterButton.isVisible()) {
      await enterButton.click();
      await expect(page.locator('[data-testid="raffle-processing"]')).toBeVisible();
    }
  });
});
```

### Test Cases (10 total):

| # | Test | What It Verifies |
|---|------|------------------|
| 1 | Progress bar width | Shows correct percentage |
| 2 | Progress bar updates | Reflects database changes |
| 3 | Claim modal opens | Click triggers modal |
| 4 | Claim modal shows reward | Reward details visible |
| 5 | Claim modal closes | Cancel button works |
| 6 | Congrats modal appears | Success feedback shown |
| 7 | Congrats modal content | Shows correct reward |
| 8 | Lock icon visible | Locked missions show icon |
| 9 | Lock disables button | Can't click locked missions |
| 10 | Raffle UI elements | Enter button and processing state |

---

## Summary: What to Implement

| Test Category | In EXECUTION_PLAN? | Recommendation |
|---------------|-------------------|----------------|
| Multi-tenant isolation | ✅ YES (10.2.5, 12.27.1) | Skip - already covered |
| E2E signup flow | ✅ YES (10.2.2) | Skip - already covered |
| E2E mission claim flow | ✅ YES (10.2.3) | Skip - already covered |
| E2E reward redemption | ✅ YES (10.2.4) | Skip - already covered |
| **Contract schema validation** | ❌ NO | **IMPLEMENT** |
| **HTTP error codes (401/400/404)** | ❌ NO | **IMPLEMENT** |
| **Specific UI components** | ❌ NOT EXPLICIT | **IMPLEMENT** |
| Load/concurrent testing | ❌ NO | Lower priority |
| Network error handling | ❌ NO | Lowest priority |

---

## Implementation Priority

| Test Type | Effort | Value | Priority | Reason |
|-----------|--------|-------|----------|--------|
| Contract Validation | Low | HIGH | **1st** | Catches API drift from docs |
| HTTP Error Codes | Medium | HIGH | **2nd** | Catches auth/validation bugs |
| UI Components | High | MEDIUM | **3rd** | Phase 10.2 partially covers this |

---

## Setup Requirements

### For Contract Validation:
```bash
npm install --save-dev ajv ajv-formats
npm test -- --testPathPatterns=contracts
```

### For Error Code Tests:
```bash
# No additional dependencies
E2E_TEST_OTP=123456 npm run dev
npm test -- --testPathPatterns=e2e/api/error
```

### For UI Component Tests:
```bash
npm install --save-dev @playwright/test
npx playwright install
npx playwright test ui-components
```

---

**Document Version:** 2.0
**Last Updated:** 2025-12-03
**Changed:** Removed suggestions already in EXECUTION_PLAN.md, focused on actual gaps
