# TESTING STRATEGY PROPOSAL

## Executive Summary

This testing strategy prioritizes **integration tests over unit tests** to maximize bug detection with minimal developer time. Given solo development constraints, we focus testing effort on the 3 critical user-facing concerns: (1) creator flows work correctly, (2) no tier/client leakage, and (3) accurate reward calculations.

**Key decisions:**
- **70% integration tests, 20% unit tests, 10% E2E tests** - Integration tests catch multi-tenant bugs, state transition errors, and calculation mistakes in real database scenarios
- **Test database using Supabase local dev** - Tests run against real PostgreSQL with actual RLS policies, triggers, and constraints
- **TDD for critical patterns** (multi-tenant isolation, money calculations) - Write tests first for highest-risk areas
- **Manual testing for UI/UX flows** - Automated E2E tests are expensive; human testing catches UX issues better for solo dev

**Coverage goal: 85% for critical paths (auth, missions, rewards), 60% overall** - Focused coverage on areas where bugs cause customer impact.

---

## Testing Approach

### What Gets Tested (Prioritized List)

**Priority 1 - Critical (Must Test):**

1. **Multi-tenant isolation (Pattern 8)**
   - Why critical: Gold user seeing Platinum rewards = lawsuit-level breach
   - Testing approach: Integration tests with 2 clients, verify queries filter by `client_id`
   - Coverage goal: 100%

2. **Reward value calculations**
   - Why critical: $100 gift card showing as $1000 = financial loss
   - Testing approach: Unit tests for calculation functions + integration tests for full flow
   - Coverage goal: 100%

3. **State transition validation (Pattern 3)**
   - Why critical: Invalid states (claimed → active) break flows, cause support tickets
   - Testing approach: Integration tests attempting invalid transitions
   - Coverage goal: 95%

4. **Mission completion detection**
   - Why critical: User completes mission but can't claim = retention loss
   - Testing approach: Integration tests with edge cases (exactly at target, 1 over, 1 under)
   - Coverage goal: 100%

5. **Authentication flows**
   - Why critical: Broken signup/login = no users
   - Testing approach: Integration tests for all 3 scenarios (check-handle routing logic)
   - Coverage goal: 95%

**Priority 2 - Important (Should Test):**

6. **Idempotent operations (Pattern 2)**
   - Why important: Duplicate claims = double rewards = financial loss
   - Testing approach: Integration tests calling endpoints twice
   - Coverage goal: 90%

7. **Tier filtering**
   - Why important: Wrong tier content = confused users
   - Testing approach: Integration tests verifying rewards/missions by tier
   - Coverage goal: 90%

8. **Transactional workflows (Pattern 1)**
   - Why important: Partial updates = corrupt data
   - Testing approach: Integration tests with forced failures mid-transaction
   - Coverage goal: 80%

9. **OTP verification**
   - Why important: Broken OTP = support tickets
   - Testing approach: Integration tests for expiration, max attempts, invalid codes
   - Coverage goal: 90%

**Priority 3 - Nice to Have (Can Defer):**

10. **Input validation** - Zod schemas catch most issues, manual testing sufficient
11. **Email sending** - Mock email service, verify template structure
12. **Date formatting** - Visual inspection during manual testing
13. **Error messages** - Manual testing for user-friendliness

---

## Testing Levels

### Integration Tests (70% of effort)

**Purpose:** Verify multi-layer interactions work correctly with real database. Test Repository → Service → API route together.

**Scope:**
- All API routes (23 endpoints)
- Critical business logic (tier calculations, mission completion detection)
- Multi-tenant isolation
- State transitions

**Tools:** Vitest + Supabase local dev

**Example:**
```typescript
// tests/integration/api/missions/claim.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { seedTestData, cleanupTestData } from '@/tests/fixtures/testData'

describe('POST /api/missions/:id/claim', () => {
  let supabase: any
  let testData: any

  beforeEach(async () => {
    supabase = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_KEY!)
    testData = await seedTestData(supabase)
  })

  afterEach(async () => {
    await cleanupTestData(supabase)
  })

  it('allows Gold user to claim completed Gold mission', async () => {
    // Arrange: Gold user with completed sales mission
    const goldUser = testData.users.goldUser
    const goldMission = testData.missions.goldSalesMission

    // Set mission as completed
    await supabase
      .from('mission_progress')
      .update({ status: 'completed', current_value: 500 })
      .eq('user_id', goldUser.id)
      .eq('mission_id', goldMission.id)

    // Act: Claim mission
    const response = await fetch(`http://localhost:3000/api/missions/${goldMission.id}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${goldUser.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    // Assert
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.redemptionId).toBeDefined()

    // Verify redemption created
    const { data: redemption } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', goldUser.id)
      .eq('mission_progress_id', data.missionProgressId)
      .single()

    expect(redemption.status).toBe('claimed')
    expect(redemption.reward_id).toBe(goldMission.reward_id)
  })

  it('prevents Gold user from claiming Platinum mission', async () => {
    // Arrange: Gold user trying to claim Platinum mission
    const goldUser = testData.users.goldUser
    const platinumMission = testData.missions.platinumSalesMission

    // Act: Attempt to claim
    const response = await fetch(`http://localhost:3000/api/missions/${platinumMission.id}/claim`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${goldUser.authToken}`,
        'Content-Type': 'application/json'
      }
    })

    // Assert
    expect(response.status).toBe(403)
    const error = await response.json()
    expect(error.error).toBe('TIER_MISMATCH')
  })
})
```

### Unit Tests (20% of effort)

**Purpose:** Verify complex calculation logic in isolation.

**Scope:**
- Money calculations (tier thresholds, checkpoint progress)
- VIP metric mode logic (sales vs units formatting)
- Date calculations (checkpoint dates, raffle deadlines)
- Encryption/decryption (Pattern 9)

**Tools:** Vitest

**Example:**
```typescript
// tests/unit/services/dashboardService.test.ts
import { describe, it, expect } from 'vitest'
import { calculateTierProgress } from '@/lib/services/dashboardService'

describe('calculateTierProgress', () => {
  it('calculates progress correctly in sales mode', () => {
    const user = {
      checkpoint_sales_current: 4200,
      manual_adjustments_total: 300,
      checkpoint_units_current: 0,
      manual_adjustments_units: 0
    }
    const client = { vip_metric: 'sales' }
    const nextTier = { sales_threshold: 5000 }

    const result = calculateTierProgress(user, client, nextTier)

    expect(result.currentValue).toBe(4500) // 4200 + 300
    expect(result.targetValue).toBe(5000)
    expect(result.progressPercentage).toBe(90)
    expect(result.currentFormatted).toBe('$4,500')
    expect(result.targetFormatted).toBe('$5,000')
  })

  it('calculates progress correctly in units mode', () => {
    const user = {
      checkpoint_sales_current: 0,
      manual_adjustments_total: 0,
      checkpoint_units_current: 850,
      manual_adjustments_units: 50
    }
    const client = { vip_metric: 'units' }
    const nextTier = { units_threshold: 1000 }

    const result = calculateTierProgress(user, client, nextTier)

    expect(result.currentValue).toBe(900) // 850 + 50
    expect(result.targetValue).toBe(1000)
    expect(result.progressPercentage).toBe(90)
    expect(result.currentFormatted).toBe('900 units')
    expect(result.targetFormatted).toBe('1,000 units')
  })

  it('caps progress at 100% when over target', () => {
    const user = {
      checkpoint_sales_current: 6000,
      manual_adjustments_total: 0,
      checkpoint_units_current: 0,
      manual_adjustments_units: 0
    }
    const client = { vip_metric: 'sales' }
    const nextTier = { sales_threshold: 5000 }

    const result = calculateTierProgress(user, client, nextTier)

    expect(result.progressPercentage).toBe(100)
  })
})
```

### E2E Tests (10% of effort)

**Purpose:** Verify critical user journeys work end-to-end in browser.

**Scope:**
- Signup → OTP → Login flow
- Login → View mission → Complete → Claim flow
- Critical edge cases (session expiration, network errors)

**Tools:** Playwright

**Example:**
```typescript
// tests/e2e/creator-flows/signup-to-claim.spec.ts
import { test, expect } from '@playwright/test'

test('creator can signup, verify OTP, and claim completed mission', async ({ page }) => {
  // Signup
  await page.goto('http://localhost:3000/login/start')
  await page.fill('input[name="handle"]', 'testcreator')
  await page.click('button:has-text("Continue")')

  // Enter email and password
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'SecurePass123')
  await page.check('input[name="agreedToTerms"]')
  await page.click('button:has-text("Sign Up")')

  // Get OTP from test database
  const otp = await getTestOTPCode('test@example.com')

  // Enter OTP
  await page.fill('input[name="code"]', otp)
  await page.click('button:has-text("Verify")')

  // Should redirect to home
  await expect(page).toHaveURL('/home')

  // Navigate to missions
  await page.click('a[href="/missions"]')

  // Find completed mission
  const completedMission = page.locator('[data-status="completed"]').first()
  await expect(completedMission).toBeVisible()

  // Claim mission
  await completedMission.click('button:has-text("Claim")')

  // Verify success modal
  await expect(page.locator('[data-testid="success-modal"]')).toBeVisible()
  await expect(page.locator('text=/claimed successfully/i')).toBeVisible()
})
```

---

## Critical Area Testing

### A) Creator Flows Testing

**Approach:** Combination of integration tests for API logic + manual testing for UI/UX.

**Integration tests verify:**
- API returns correct data
- State transitions work
- Database updates correctly

**Manual testing verifies:**
- Buttons are clickable
- Modals appear correctly
- Error messages are clear
- Loading states work

**Example - Testing Mission Claim Flow:**
```typescript
// tests/integration/flows/mission-claim.test.ts
describe('Mission claim flow', () => {
  it('completes full claim flow for gift card reward', async () => {
    // Setup: User with completed mission
    const user = await createTestUser({ tier: 'tier_3' })
    const mission = await createTestMission({
      tier_eligibility: 'tier_3',
      reward_type: 'gift_card',
      target_value: 500
    })
    await setMissionProgress(user.id, mission.id, {
      current_value: 500,
      status: 'completed'
    })

    // Step 1: User claims mission
    const claimResponse = await POST(`/api/missions/${mission.id}/claim`, {
      auth: user.authToken
    })
    expect(claimResponse.status).toBe(200)
    expect(claimResponse.data.redemptionId).toBeDefined()

    // Step 2: Verify redemption created
    const redemption = await supabase
      .from('redemptions')
      .select('*')
      .eq('id', claimResponse.data.redemptionId)
      .single()
    expect(redemption.data.status).toBe('claimed')
    expect(redemption.data.reward_id).toBe(mission.reward_id)

    // Step 3: Verify mission appears in history
    const historyResponse = await GET('/api/missions/history', {
      auth: user.authToken
    })
    const historyMission = historyResponse.data.history.find(m => m.id === mission.id)
    expect(historyMission).toBeDefined()

    // Step 4: Verify mission no longer in available missions
    const missionsResponse = await GET('/api/missions', {
      auth: user.authToken
    })
    const availableMission = missionsResponse.data.missions.find(m => m.id === mission.id)
    expect(availableMission).toBeUndefined()
  })
})
```

### B) Tier Isolation Testing

**Approach:** Create test data for multiple tiers, verify users only see their tier's content.

**Example - Multi-Tier Isolation Test:**
```typescript
// tests/integration/security/tier-isolation.test.ts
describe('Tier isolation', () => {
  let bronze: any, silver: any, gold: any, platinum: any

  beforeEach(async () => {
    const client = await createTestClient()

    // Create 4 tiers with rewards/missions
    bronze = await createTestUser({ tier: 'tier_1', client_id: client.id })
    silver = await createTestUser({ tier: 'tier_2', client_id: client.id })
    gold = await createTestUser({ tier: 'tier_3', client_id: client.id })
    platinum = await createTestUser({ tier: 'tier_4', client_id: client.id })

    // Create tier-specific rewards
    await createTestReward({ tier_eligibility: 'tier_2', name: 'Silver Reward' })
    await createTestReward({ tier_eligibility: 'tier_3', name: 'Gold Reward' })
    await createTestReward({ tier_eligibility: 'tier_4', name: 'Platinum Reward' })
  })

  it('Bronze user cannot see Silver, Gold, or Platinum rewards', async () => {
    const response = await GET('/api/rewards', { auth: bronze.authToken })

    const rewardNames = response.data.rewards.map(r => r.name)
    expect(rewardNames).not.toContain('Silver Reward')
    expect(rewardNames).not.toContain('Gold Reward')
    expect(rewardNames).not.toContain('Platinum Reward')
  })

  it('Gold user can see Gold rewards but not Platinum', async () => {
    const response = await GET('/api/rewards', { auth: gold.authToken })

    const rewardNames = response.data.rewards.map(r => r.name)
    expect(rewardNames).toContain('Gold Reward')
    expect(rewardNames).not.toContain('Platinum Reward')
  })

  it('Gold user cannot claim Platinum mission', async () => {
    const platinumMission = await createTestMission({ tier_eligibility: 'tier_4' })

    const response = await POST(`/api/missions/${platinumMission.id}/claim`, {
      auth: gold.authToken
    })

    expect(response.status).toBe(403)
    expect(response.data.error).toBe('TIER_MISMATCH')
  })

  it('Platinum user promoted from Gold still cannot see old Gold missions', async () => {
    // Create Gold mission while user is Gold
    const goldMission = await createTestMission({
      tier_eligibility: 'tier_3',
      display_order: 1
    })
    await setMissionProgress(platinum.id, goldMission.id, { status: 'active' })

    // Promote user to Platinum
    await supabase
      .from('users')
      .update({ current_tier: 'tier_4' })
      .eq('id', platinum.id)

    // Get available missions
    const response = await GET('/api/missions', {
      auth: await refreshAuthToken(platinum.id)  // Get new token with updated tier
    })

    // Old Gold mission should not appear (unless explicitly persisted in progress)
    const missions = response.data.missions
    const goldMissionInList = missions.find(m => m.id === goldMission.id && m.tierEligibility === 'tier_3')

    // If mission shows, it must be in-progress, not newly available
    if (goldMissionInList) {
      expect(goldMissionInList.status).toBe('in_progress')
    }
  })
})
```

### C) Reward Value Accuracy Testing

**Approach:** Test edge cases in calculations (exactly at target, off-by-one, floating point errors).

**Example - Calculation Accuracy Tests:**
```typescript
// tests/integration/calculations/reward-values.test.ts
describe('Reward value accuracy', () => {
  it('detects mission completion at exactly target value', async () => {
    const user = await createTestUser()
    const mission = await createTestMission({ target_value: 500 })

    // Set progress to exactly 500
    await setMissionProgress(user.id, mission.id, { current_value: 500 })

    const response = await GET('/api/dashboard/featured-mission', { auth: user.authToken })

    expect(response.data.mission.currentProgress).toBe(500)
    expect(response.data.mission.targetValue).toBe(500)
    expect(response.data.status).toBe('completed')
  })

  it('does not complete mission at target - 1', async () => {
    const user = await createTestUser()
    const mission = await createTestMission({ target_value: 500 })

    // Set progress to 499 (one under)
    await setMissionProgress(user.id, mission.id, { current_value: 499 })

    const response = await GET('/api/dashboard/featured-mission', { auth: user.authToken })

    expect(response.data.mission.currentProgress).toBe(499)
    expect(response.data.status).toBe('active')
  })

  it('displays correct gift card amount', async () => {
    const reward = await createTestReward({
      type: 'gift_card',
      value_data: { amount: 100 }
    })

    const response = await GET('/api/rewards', { auth: user.authToken })
    const giftCard = response.data.rewards.find(r => r.id === reward.id)

    expect(giftCard.valueData.amount).toBe(100)
    expect(giftCard.displayText).toBe('$100 Gift Card')
    expect(giftCard.displayText).not.toBe('$1,000 Gift Card')
    expect(giftCard.displayText).not.toBe('$10 Gift Card')
  })

  it('calculates tier progress with manual adjustments correctly', async () => {
    const user = await createTestUser({
      checkpoint_sales_current: 4700,
      manual_adjustments_total: 300
    })
    const nextTier = { sales_threshold: 5000 }

    const response = await GET('/api/dashboard', { auth: user.authToken })

    expect(response.data.tierProgress.currentValue).toBe(5000) // 4700 + 300
    expect(response.data.tierProgress.progressPercentage).toBe(100)
  })

  it('prevents floating point errors in percentage calculations', async () => {
    const user = await createTestUser()
    const mission = await createTestMission({ target_value: 333 })

    // 250 / 333 = 75.075075...%
    await setMissionProgress(user.id, mission.id, { current_value: 250 })

    const response = await GET('/api/dashboard/featured-mission', { auth: user.authToken })

    // Should round to 75, not 75.075075
    expect(response.data.mission.progressPercentage).toBe(75)
  })
})
```

### D) Critical Patterns Testing

**Pattern 1: Transactional Workflows**
```typescript
describe('Pattern 1: Transactional workflows', () => {
  it('rolls back mission claim if redemption creation fails', async () => {
    // Mock database to fail on redemption insert
    const spy = vi.spyOn(supabase, 'from').mockImplementationOnce(() => {
      throw new Error('Database error')
    })

    const response = await POST(`/api/missions/${mission.id}/claim`, { auth: user.authToken })

    expect(response.status).toBe(500)

    // Verify mission_progress NOT updated
    const progress = await supabase
      .from('mission_progress')
      .select('status')
      .eq('id', progressId)
      .single()
    expect(progress.data.status).toBe('completed') // Still completed, not claimed
  })
})
```

**Pattern 2: Idempotent Operations**
```typescript
describe('Pattern 2: Idempotent operations', () => {
  it('prevents duplicate mission claims', async () => {
    // First claim succeeds
    const response1 = await POST(`/api/missions/${mission.id}/claim`, { auth: user.authToken })
    expect(response1.status).toBe(200)

    // Second claim fails
    const response2 = await POST(`/api/missions/${mission.id}/claim`, { auth: user.authToken })
    expect(response2.status).toBe(400)
    expect(response2.data.error).toBe('ALREADY_CLAIMED')

    // Verify only one redemption created
    const { count } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('reward_id', mission.reward_id)
    expect(count).toBe(1)
  })
})
```

**Pattern 3: State Transition Validation**
```typescript
describe('Pattern 3: State transition validation', () => {
  it('prevents invalid state transition: claimed → active', async () => {
    // Setup: Mission already claimed
    await supabase
      .from('mission_progress')
      .update({ status: 'claimed' })
      .eq('id', progressId)

    // Attempt to reset to active (invalid)
    const { error } = await supabase
      .from('mission_progress')
      .update({ status: 'active' })
      .eq('id', progressId)

    expect(error).toBeDefined()
    expect(error.message).toMatch(/invalid state transition/i)
  })
})
```

**Pattern 8: Multi-Tenant Query Isolation**
```typescript
describe('Pattern 8: Multi-tenant query isolation', () => {
  it('prevents Client A user from seeing Client B data', async () => {
    const clientA = await createTestClient({ name: 'Client A' })
    const clientB = await createTestClient({ name: 'Client B' })

    const userA = await createTestUser({ client_id: clientA.id })
    const userB = await createTestUser({ client_id: clientB.id })

    const rewardB = await createTestReward({
      client_id: clientB.id,
      name: 'Client B Exclusive'
    })

    // User A queries rewards
    const response = await GET('/api/rewards', { auth: userA.authToken })

    const rewardNames = response.data.rewards.map(r => r.name)
    expect(rewardNames).not.toContain('Client B Exclusive')
  })
})
```

**Pattern 9: Sensitive Data Encryption**
```typescript
describe('Pattern 9: Sensitive data encryption', () => {
  it('encrypts payment account before storing', async () => {
    const user = await createTestUser()
    const paymentAccount = 'user@venmo.com'

    // Claim commission boost and provide payment info
    await POST(`/api/missions/${commissionBoostMission.id}/claim`, {
      auth: user.authToken,
      body: {
        scheduledActivationDate: '2025-02-15',
        scheduledActivationTime: '18:00:00',
        paymentMethod: 'venmo',
        paymentAccount
      }
    })

    // Query database directly
    const { data } = await supabase
      .from('commission_boost_redemptions')
      .select('payment_account_encrypted')
      .eq('user_id', user.id)
      .single()

    // Verify encrypted (not plaintext)
    expect(data.payment_account_encrypted).not.toBe(paymentAccount)
    expect(data.payment_account_encrypted).toMatch(/^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/) // iv:authTag:encrypted format
  })
})
```

---

## Testing Tools & Setup

### Tool Stack
- **Unit Testing:** Vitest (fast, TS support, Vite-native)
- **Integration Testing:** Vitest + Supertest (API request testing)
- **E2E Testing:** Playwright (browser automation, cross-browser support)
- **Mocking:** Vitest mocking + MSW (for external APIs like email service)
- **Test Database:** Supabase local dev (real PostgreSQL with RLS)

### Test Database Strategy

**Setup:**
```bash
# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Seed test data
npm run test:seed
```

**Seeding:**
```typescript
// tests/fixtures/testData.ts
export async function seedTestData(supabase: any) {
  // Create 2 clients
  const clientA = await supabase.from('clients').insert({
    name: 'Test Client A',
    vip_metric: 'sales'
  }).select().single()

  const clientB = await supabase.from('clients').insert({
    name: 'Test Client B',
    vip_metric: 'units'
  }).select().single()

  // Create 4 tiers per client
  const tiers = []
  for (const client of [clientA.data, clientB.data]) {
    tiers.push(
      await createTier({ client_id: client.id, tier_id: 'tier_1', sales_threshold: 0 }),
      await createTier({ client_id: client.id, tier_id: 'tier_2', sales_threshold: 1000 }),
      await createTier({ client_id: client.id, tier_id: 'tier_3', sales_threshold: 2000 }),
      await createTier({ client_id: client.id, tier_id: 'tier_4', sales_threshold: 5000 })
    )
  }

  // Create test users (1 per tier per client)
  const users = {
    clientA_bronze: await createUser({ client_id: clientA.data.id, tier: 'tier_1' }),
    clientA_gold: await createUser({ client_id: clientA.data.id, tier: 'tier_3' }),
    clientB_silver: await createUser({ client_id: clientB.data.id, tier: 'tier_2' })
  }

  return { clients: [clientA.data, clientB.data], tiers, users }
}

export async function cleanupTestData(supabase: any) {
  // Delete in reverse FK dependency order
  await supabase.from('redemptions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('mission_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('missions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('rewards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('tiers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
```

**Cleanup:** Each test suite runs `beforeEach` and `afterEach` hooks for cleanup

**Isolation:** Tests run in parallel with separate test database instances (Supabase local dev supports this)

---

## When to Write Tests

### TDD Approach (Test-First) For:
- **Multi-tenant isolation** - Critical Pattern 8, write test first to verify `client_id` filtering
- **Money calculations** - Write test first to prevent $100 → $1000 bugs
- **State transitions** - Write test first to define valid/invalid transitions

### Test-During Approach For:
- **API endpoints** - Write integration test while implementing endpoint
- **Service layer logic** - Write unit test alongside complex business logic

### Test-After Approach For:
- **Simple CRUD** - Repository layer with basic queries
- **Utilities** - Formatting functions, date helpers

---

## Test Organization

### File Structure
```
tests/
├── unit/
│   ├── services/
│   │   ├── dashboardService.test.ts
│   │   ├── missionService.test.ts
│   │   └── authService.test.ts
│   └── utils/
│       ├── encryption.test.ts
│       └── formatting.test.ts
├── integration/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── check-handle.test.ts
│   │   │   ├── signup.test.ts
│   │   │   └── login.test.ts
│   │   ├── missions/
│   │   │   ├── list.test.ts
│   │   │   └── claim.test.ts
│   │   └── rewards/
│   │       └── claim.test.ts
│   ├── flows/
│   │   ├── mission-claim.test.ts
│   │   └── tier-promotion.test.ts
│   └── security/
│       ├── tier-isolation.test.ts
│       └── multi-tenant-isolation.test.ts
├── e2e/
│   └── creator-journeys/
│       ├── signup-to-claim.spec.ts
│       └── mission-completion.spec.ts
└── fixtures/
    ├── testData.ts
    └── helpers.ts
```

### Naming Conventions
- Test files: `{feature}.test.ts` (unit/integration), `{flow}.spec.ts` (E2E)
- Test cases: `it('should {expected behavior} when {condition}', ...)`
- Test data: `create{Entity}()` factory functions

---

## Manual Testing Strategy

### Manual Test Checklist

**Pre-Deploy Checklist:**
- [ ] Auth flow: Signup → OTP → Login completes successfully
- [ ] Dashboard loads with correct tier, progress, featured mission
- [ ] Missions page shows only user's tier missions
- [ ] Completed mission shows "Claim" button
- [ ] Claim button triggers modal/form correctly
- [ ] Reward redemption appears in history
- [ ] Navigation between all 7 pages works
- [ ] Loading states show correctly (no white flashes)
- [ ] Error messages are user-friendly (no stack traces)
- [ ] Mobile responsive (test on 375px width)

**When to Perform Manual Testing:**
- After completing each implementation phase
- Before frontend integration (page-by-page)
- Before production deployment

**Manual Testing Focus Areas:**
- UI/UX flows (button states, modals, animations)
- Error handling (network failures, expired sessions)
- Mobile responsiveness
- Cross-browser compatibility (Chrome, Safari, Firefox)

---

## Coverage Goals

### Overall Target
- **Goal:** 85% line coverage, 90% branch coverage for critical paths
- **Rationale:** High coverage on money/security logic, lower on utilities/formatters

### Per-Component Coverage
- **Repositories:** 80% - Data access layer, multi-tenant filtering
- **Services:** 90% - Business logic, calculations, state transitions
- **API Routes:** 85% - Request validation, error handling
- **Utils:** 60% - Formatters are visually tested, encryption needs 100%

### Tracking Coverage
```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['lib/**/*.ts'],
      exclude: ['lib/types/**', '**/*.test.ts'],
      thresholds: {
        lines: 85,
        branches: 90,
        functions: 80,
        statements: 85
      }
    }
  }
})
```

---

## Testing in Development Workflow

### Continuous Testing
- **On file save:** Vitest watch mode runs unit tests
- **On commit:** Git pre-commit hook runs unit + integration tests
- **On PR:** GitHub Actions runs full test suite + E2E tests
- **Before deploy:** Manual checklist + full test suite

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Start Supabase local
        run: npx supabase start

      - name: Run migrations
        run: npx supabase db reset

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Testing Sequence (Aligned with Implementation)

**Phase 1: Foundation Infrastructure**
- Unit tests for encryption/decryption (Pattern 9)
- Unit tests for formatting functions (currency, dates)

**Phase 2: Authentication System**
- Integration tests for all 5 auth endpoints
- Test 3 check-handle scenarios
- Test OTP expiration, max attempts, invalid codes

**Phase 3: Dashboard & Home Page**
- Unit tests for tier progress calculation
- Integration tests for dashboard endpoint
- Test VIP metric mode (sales vs units)

**Phase 4: Missions System**
- Integration tests for mission list, claim, participate
- Test tier isolation (Gold cannot claim Platinum)
- Test mission completion detection (edge cases)

**Phase 5: Rewards System**
- Integration tests for reward list, claim
- Test redemption limits (monthly, weekly, one-time)
- Test scheduled vs instant claims

**Phase 6: History & Tiers**
- Integration tests for history endpoints
- Visual testing for history display

**Phase 7: Cron Jobs**
- Unit tests for daily sync logic
- Unit tests for tier calculation logic
- Manual testing with test data

**Phase 8: Frontend Integration**
- E2E tests for critical flows
- Manual testing checklist per page

---

## Risk Assessment

### Highest-Risk Areas If Inadequately Tested

1. **Multi-tenant isolation (Pattern 8)**
   - Impact: Client A sees Client B data = lawsuit, contract breach
   - Mitigation: 100% integration test coverage, test with 2 clients in every scenario

2. **Reward calculations**
   - Impact: $100 gift card shows as $1000 = financial loss
   - Mitigation: Unit tests for all calculation functions, edge case testing (boundary values)

3. **State transitions**
   - Impact: Invalid states break flows, cause support tickets
   - Mitigation: Integration tests attempting all invalid transitions, database constraints

4. **Tier filtering**
   - Impact: Gold user sees Platinum content = poor UX, confused users
   - Mitigation: Integration tests per tier, verify query filters

### Likely Bug Types

- **Off-by-one errors** - Detection: Edge case tests (exactly at target, one under, one over)
- **Floating point errors** - Detection: Unit tests with non-round numbers (333, 777)
- **Race conditions** - Detection: Integration tests with concurrent requests
- **Null pointer errors** - Detection: TypeScript strict mode + test with missing data

---

## Success Criteria

When these criteria are met, system is production-ready:

1. **85% code coverage** achieved across critical paths (measured by Vitest)
2. **All Priority 1 tests passing** (multi-tenant isolation, reward calculations, state transitions)
3. **Zero failing tests in CI/CD** pipeline
4. **Manual checklist 100% complete** (all 10 items checked)
5. **No P0/P1 bugs** in test environment (blocking bugs fixed before deploy)
6. **E2E tests passing** for critical flows (signup, claim mission)
7. **Cross-browser testing complete** (Chrome, Safari, Firefox)
8. **Mobile testing complete** (iPhone, Android at 375px)
