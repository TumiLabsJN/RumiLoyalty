# Tier Calculation Test - Gap Documentation

**ID:** GAP-TIER-CALC-TEST
**Type:** Feature Gap
**Created:** 2025-12-14
**Status:** Implemented ✅
**Priority:** High
**Related Tasks:** Task 8.4.5 from EXECUTION_PLAN.md
**Linked Issues:** None
**Audit Status:** APPROVED WITH CHANGES (2025-12-14)

---

## 1. Project Context

Rumi Loyalty Platform is a multi-tenant SaaS application for TikTok creator loyalty programs. The system tracks creator performance (sales, units, engagement) and manages tier-based rewards. Daily cron jobs sync data from CRUVA (external analytics platform), update user metrics, and evaluate tier promotions/demotions.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with multi-tenant isolation via `client_id`

---

## 2. Gap/Enhancement Summary

**What's missing:** The integration test file `tier-calculation.test.ts` defines a local helper function that mimics tier calculation logic, but it does NOT call the actual production service (`checkForPromotions` or `runCheckpointEvaluation`). The tests verify the helper function instead of the real code.

**What should exist:** Integration tests that:
1. Create users with actual `total_sales`/`total_units` values in the database
2. Call the **production** `checkForPromotions()` function from `tierCalculationService.ts`
3. Query the database to verify tier changes occurred correctly

**Why it matters:** If production code has a bug (e.g., uses `>` instead of `>=` for threshold comparison), the current tests would still pass because they test a separate helper function. This defeats the purpose of integration testing and could allow tier calculation bugs to reach production.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `EXECUTION_PLAN.md` | Task 8.4.5 (lines 1515-1521) | Specifies "call tierCalculation → user stays tier_1" - tests should call actual service |
| `tier-calculation.test.ts` | Lines 69-82 | Defines local `findHighestQualifyingTier()` helper instead of importing production code |
| `tier-calculation.test.ts` | Lines 88-130 | Tests call local helper, not `checkForPromotions()` |
| `tierCalculationService.ts` | Lines 340-459 | Production `checkForPromotions()` function exists but is NOT imported in test |
| `tierCalculationService.ts` | Lines 121-132 | Production `findHighestQualifyingTier()` uses same `>=` logic but is internal (not exported) |
| `tierRepository.ts` | Lines 622-702 | `getUsersForPromotionCheck()` queries `total_sales`/`total_units` - tests should set these values |
| `tierRepository.ts` | Lines 679-684 | Production uses `userValue >= threshold && tier.tier_order > currentTierOrder` |
| `Loyalty.md` | Lines 1580-1609 (Tier Calculation Logic) | Specifies `if (checkpointValue >= threshold)` - both local helper and production match |
| `SchemaFinalv2.md` | Section 1.6 (tiers table, lines 254-272) | Defines `sales_threshold` and `units_threshold` columns |
| `SchemaFinalv2.md` | Section 1.2 (users table, lines 123-155) | Defines `total_sales`, `total_units`, `current_tier` fields used by promotion check |
| `daily-automation-metrics.test.ts` | Lines 1-50 | Shows correct pattern: imports helpers, calls RPC functions, verifies DB state |

### Key Evidence

**Evidence 1:** Test defines local helper instead of using production code
- Source: `tier-calculation.test.ts`, lines 69-82
- Code: `function findHighestQualifyingTier(value, tiers)` defined locally in test file
- Implication: Tests verify isolated algorithm, not integration with production service

**Evidence 2:** Production function not imported
- Source: `tier-calculation.test.ts`, lines 27-36
- Missing: `import { checkForPromotions } from '@/lib/services/tierCalculationService'`
- Implication: No path to test actual production behavior

**Evidence 3:** EXECUTION_PLAN.md expects actual service call
- Source: EXECUTION_PLAN.md Task 8.4.5, lines 1517-1518
- Quote: "call tierCalculation → user stays tier_1"
- Implication: Task specification requires calling production tier calculation service

**Evidence 4:** Production service uses `total_sales`/`total_units` not `checkpoint_*`
- Source: `tierRepository.ts` lines 670-672
- Code: `const userValue = vipMetric === 'units' ? (user.total_units ?? 0) : (user.total_sales ?? 0)`
- Implication: Tests must set `total_sales`/`total_units` fields, not checkpoint fields

---

## 4. Business Justification

**Business Need:** Ensure tier calculation logic is tested end-to-end to prevent users being placed in wrong tiers.

**User Stories:**
1. As a QA engineer, I need integration tests that call actual production code so that I can trust test results indicate production behavior
2. As a developer, I need tests that verify database state changes so that I can catch integration bugs before deployment

**Impact if NOT implemented:**
- Tier calculation bugs could reach production undetected
- Users could be promoted/demoted incorrectly, causing support tickets
- False confidence from passing tests that don't test production code

---

## 5. Current State Analysis

### What Currently Exists

**File:** `appcode/tests/integration/cron/tier-calculation.test.ts` (644 lines)

```typescript
// Current: Local helper function (NOT production code)
function findHighestQualifyingTier(
  value: number,
  tiers: Array<{ tier_id: string; tier_order: number; threshold: number }>
): { tier_id: string; tier_order: number } | null {
  const sortedTiers = [...tiers].sort((a, b) => b.tier_order - a.tier_order);
  for (const tier of sortedTiers) {
    if (value >= tier.threshold) {
      return { tier_id: tier.tier_id, tier_order: tier.tier_order };
    }
  }
  return null;
}
```

```typescript
// Current: Test calls local helper, not production service
it('should NOT qualify for tier with threshold 1000 when value is 999', async () => {
  // ... create tiers in DB ...

  // PROBLEM: Calls local helper, not production checkForPromotions()
  const result = findHighestQualifyingTier(999, tierThresholds);
  expect(result?.tier_id).toBe('tier_1');
});
```

**Current Capability:**
- ✅ Creates test data in local Supabase (tiers, clients)
- ✅ Tests `>=` threshold logic in isolation
- ✅ Covers vip_metric branching (sales vs units)
- ❌ Does NOT call `checkForPromotions()` production function
- ❌ Does NOT verify database tier changes
- ❌ Does NOT test `getUsersForPromotionCheck()` repository function

### Current Data Flow

```
Current (BROKEN):
Test Data → Local Helper Function → Assertion
             ↑ NOT production code

Expected (CORRECT):
Test Data → checkForPromotions() → DB Update → Query DB → Assertion
             ↑ production service
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Rewrite `tier-calculation.test.ts` to:
1. Create users with `total_sales`/`total_units` values (what production actually uses)
2. Call `checkForPromotions(clientId)` from production service
3. Query database to verify `current_tier` changed as expected

### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will REPLACE the current test implementation.**

**Modified File:** `appcode/tests/integration/cron/tier-calculation.test.ts`

**⚠️ CRITICAL: This rewrites the existing file IN PLACE. The local `findHighestQualifyingTier` helper function (lines 69-82) MUST BE DELETED.**

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
// IMPORTANT: DELETE the local findHighestQualifyingTier() helper function
// IMPORTANT: Requires local Supabase running: `cd appcode && npx supabase start`

import {
  createTestClient,
  createTestClientRecord,
  createTestUser,
  createTestTier,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Test timeout for database operations
jest.setTimeout(30000);

describe('Tier Calculation - Threshold Boundaries (Task 8.4.5)', () => {
  let supabase: SupabaseClient<Database>;
  let testClientId: string;

  beforeAll(async () => {
    // Verify local Supabase is running
    await assertSupabaseRunning();
    supabase = createTestClient();
  });

  afterAll(async () => {
    // Final cleanup
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
    }
  });

  afterEach(async () => {
    // Cleanup after each test - uses existing cleanupTestData helper
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
    }
  });

  // ============================================================================
  // Test Case 1: 999 < 1000 stays at current tier
  // ============================================================================
  describe('Test Case 1: Below threshold (999 < 1000)', () => {
    it('should NOT promote user when total_sales is 999 and Silver threshold is 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });

      // Setup: Create user at tier_1 with total_sales = 999
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 999,  // Below Silver threshold of 1000
        total_units: 0,
      });

      // ACT: Call production service
      const result = await checkForPromotions(testClientId);

      // ASSERT: No promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(0);
      expect(result.promotions).toHaveLength(0);

      // VERIFY: User tier unchanged in database
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_1');
    });
  });

  // ============================================================================
  // Test Case 2: Exactly 1000 promotes (>= threshold)
  // ============================================================================
  describe('Test Case 2: Exactly at threshold (1000 >= 1000)', () => {
    it('should promote user when total_sales is exactly 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Exact Threshold Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_1',
        tier_name: 'Bronze',
        tier_order: 1,
        sales_threshold: 0,
        units_threshold: 0,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_2',
        tier_name: 'Silver',
        tier_order: 2,
        sales_threshold: 1000,
        units_threshold: 100,
      });

      // Setup: Create user at tier_1 with total_sales = 1000 (exactly at threshold)
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 1000,  // Exactly at Silver threshold
        total_units: 0,
      });

      // ACT: Call production service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed in database
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });
  });

  // ============================================================================
  // Test Case 3: 1001 promotes (> threshold)
  // ============================================================================
  describe('Test Case 3: Above threshold (1001 > 1000)', () => {
    it('should promote user when total_sales is 1001', async () => {
      // Similar setup to Test Case 2...
      // Create user with total_sales = 1001
      // Call checkForPromotions()
      // Verify promotion to tier_2
    });
  });

  // ============================================================================
  // Test Case 4: vip_metric='sales' uses sales_threshold
  // ============================================================================
  describe('Test Case 4: vip_metric=sales uses sales_threshold', () => {
    it('should use sales_threshold when client vip_metric is sales', async () => {
      // Setup: Create client with vip_metric='sales'
      // Create tiers with different sales_threshold vs units_threshold
      // Create user with total_sales=500 (below sales 1000, above units 50)
      // In SALES mode, user should NOT be promoted
      // Call checkForPromotions()
      // Verify NO promotion (because sales_threshold used, not units_threshold)
    });
  });

  // ============================================================================
  // Test Case 5: vip_metric='units' uses units_threshold
  // ============================================================================
  describe('Test Case 5: vip_metric=units uses units_threshold', () => {
    it('should use units_threshold when client vip_metric is units', async () => {
      // Setup: Create client with vip_metric='units'
      // Create tiers with sales_threshold=1000, units_threshold=50
      // Create user with total_units=100 (above units threshold)
      // In UNITS mode, user SHOULD be promoted
      // Call checkForPromotions()
      // Verify promotion occurred (because units_threshold used)
    });
  });
});
```

**Explanation:** The new tests call `checkForPromotions(clientId)` which is the production service function. This ensures:
1. Production `getUsersForPromotionCheck()` is exercised
2. Production threshold comparison logic (`userValue >= threshold`) is tested
3. Production `promoteUserToTier()` is called
4. Database state changes are verified end-to-end

### Key Differences from Current Implementation

| Aspect | Current (Wrong) | Proposed (Correct) |
|--------|-----------------|-------------------|
| Function tested | Local `findHighestQualifyingTier` | Production `checkForPromotions` |
| User field used | N/A (no users created for test) | `total_sales`, `total_units` |
| DB verification | None | Query user's `current_tier` after |
| Import needed | None | `checkForPromotions` from service |

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `/tests/integration/cron/tier-calculation.test.ts` | REWRITE | Replace local helper with production service calls |
| `/tests/helpers/factories.ts` | VERIFY | Ensure `createTestUser` accepts `total_sales`, `total_units` overrides |

### Dependency Graph

```
tier-calculation.test.ts (TO BE MODIFIED)
├── imports from: @/tests/helpers (existing)
├── imports from: @/lib/services/tierCalculationService (NEW)
│   └── checkForPromotions()
└── exports: none (test file)

tierCalculationService.ts (existing, NO CHANGES)
├── imports: tierRepository
└── exports: checkForPromotions, runCheckpointEvaluation

tierRepository.ts (existing, NO CHANGES)
├── getUsersForPromotionCheck()
└── promoteUserToTier()
```

---

## 8. Data Flow After Implementation

```
Test Setup                 Production Service              Database Verification
-----------                ------------------              --------------------
createTestUser()     →     checkForPromotions()      →     supabase.select()
  total_sales: 1000          getUsersForPromotionCheck()     current_tier
  current_tier: tier_1       promoteUserToTier()              ↓
       ↓                            ↓                    expect('tier_2')
  [DB: users]              [DB: users updated]
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `users` | `id`, `client_id`, `current_tier`, `total_sales`, `total_units`, `tier_achieved_at` | Create test users, verify tier changes |
| `tiers` | `client_id`, `tier_id`, `tier_order`, `sales_threshold`, `units_threshold` | Create tier configuration |
| `clients` | `id`, `vip_metric`, `checkpoint_months` | Client configuration for promotion check |
| `tier_checkpoints` | All columns | Audit log created by `checkForPromotions` |

### Schema Changes Required?
- [x] No - existing schema supports this feature

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| Create test user | Yes - provided in `createTestUser` | [x] |
| Create test tier | Yes - provided in `createTestTier` | [x] |
| `checkForPromotions(clientId)` | Yes - clientId parameter | [x] |
| Verify user tier | Should add `.eq('client_id', testClientId)` | [ ] |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

This is a test file change, no API changes.

### Breaking Changes?
- [x] No - test file only

---

## 11. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 5-10 test users per test | Yes |
| Query complexity | O(n) where n = test users | Yes |
| Frequency | On-demand (test runs) | Yes |

### Optimization Needed?
- [x] No - acceptable for test suite

---

## 12. Alternative Solutions Considered

### Option A: Mock Production Service (Rejected)
- **Description:** Mock `checkForPromotions` and test the mock
- **Pros:** Faster tests, no DB dependency
- **Cons:** Doesn't verify production code, same problem as current
- **Verdict:** ❌ Rejected - defeats purpose of integration test

### Option B: Call Production Service (Selected)
- **Description:** Call actual `checkForPromotions()` with real DB
- **Pros:** Tests actual production code path, verifies DB changes
- **Cons:** Slower tests, requires local Supabase
- **Verdict:** ✅ Selected - true integration test

### Option C: Export Internal Function
- **Description:** Export `findHighestQualifyingTier` from service and test it
- **Pros:** Tests real function, no side effects
- **Cons:** Doesn't test full integration (DB queries, updates)
- **Verdict:** ❌ Rejected - partial coverage only

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tests become slower | Medium | Low | Acceptable for integration tests |
| Local Supabase required | Low | Low | Already required for other tests |
| Factory doesn't support total_sales | Low | Medium | Verify factory accepts override |

---

## 14. Testing Strategy

### Unit Tests
N/A - this IS the test file being fixed

### Integration Tests

**File:** `/tests/integration/cron/tier-calculation.test.ts`

```typescript
describe('Tier Calculation - Production Integration', () => {
  it('calls checkForPromotions and verifies DB tier change', async () => {
    // Create user with total_sales = 1000
    // Call checkForPromotions(clientId)
    // Query DB, expect current_tier = 'tier_2'
  });
});
```

### Manual Verification Steps

1. [ ] Run `npm test -- --testPathPattern=tier-calculation`
2. [ ] Verify all 5 test cases pass
3. [ ] Verify tests import `checkForPromotions` from production service
4. [ ] Verify tests query DB to check tier changes

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [ ] Confirm `createTestUser` factory accepts `total_sales`, `total_units` overrides

### Implementation Steps
- [ ] **Step 1:** Verify factory supports total_sales/total_units
  - File: `/tests/helpers/factories.ts`
  - Action: VERIFY (or MODIFY if needed)
- [ ] **Step 2:** Rewrite tier-calculation.test.ts
  - File: `/tests/integration/cron/tier-calculation.test.ts`
  - Action: REWRITE per Section 6 specification
- [ ] **Step 3:** Run tests to verify
  - Command: `npm test -- --testPathPattern=tier-calculation`

### Post-Implementation
- [ ] Run type checker
- [ ] Run tests
- [ ] Run build
- [ ] Manual verification
- [ ] Update EXECUTION_PLAN.md Task 8.4.5 completion notes

---

## 16. Definition of Done

- [ ] Tests import `checkForPromotions` from production service
- [ ] Tests create users with `total_sales`/`total_units` values
- [ ] Tests call `checkForPromotions(clientId)`
- [ ] Tests verify database `current_tier` after promotion check
- [ ] All 5 test cases pass
- [ ] Type checker passes
- [ ] Build completes
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| EXECUTION_PLAN.md | Task 8.4.5 (lines 1515-1521) | Task specification requiring "call tierCalculation" |
| tierCalculationService.ts | `checkForPromotions` (lines 340-459) | Production function to be tested |
| tierRepository.ts | `getUsersForPromotionCheck` (lines 622-702) | Queries total_sales/total_units |
| tierRepository.ts | Line 684: `userValue >= threshold` | Production comparison operator |
| Loyalty.md | Lines 1580-1609 | Business logic: `>=` threshold comparison |
| SchemaFinalv2.md | Section 1.6 tiers (lines 254-272) | sales_threshold, units_threshold columns |
| SchemaFinalv2.md | Section 1.2 users (lines 123-155) | total_sales, total_units, current_tier fields |
| tier-calculation.test.ts | Lines 69-82 | Current local helper (to be replaced) |
| daily-automation-metrics.test.ts | Lines 1-50 | Reference pattern for correct integration testing |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-14
**Author:** Claude Code
**Status:** Analysis Complete

---

## Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (N/A for test file)
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
