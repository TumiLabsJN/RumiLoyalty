# Tier Calculation Test - Gap Implementation Plan

**Specification Source:** TierCalculationTestGap.md
**Gap ID:** GAP-TIER-CALC-TEST
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From TierCalculationTestGap.md:**

**Gap Summary:** Integration tests call a local helper function instead of the production `checkForPromotions()` service, so they don't verify actual production behavior.

**Business Need:** Ensure tier calculation logic is tested end-to-end to prevent users being placed in wrong tiers.

**Files to Create/Modify:**
- `appcode/tests/integration/cron/tier-calculation.test.ts` - REWRITE (delete local helper, call production service)

**Specified Solution (From Gap.md Section 6):**
> Rewrite `tier-calculation.test.ts` to:
> 1. DELETE the local `findHighestQualifyingTier()` helper function (lines 69-82)
> 2. Import `checkForPromotions` from production service
> 3. Create users with `total_sales`/`total_units` values (what production actually uses)
> 4. Call `checkForPromotions(clientId)` from production service
> 5. Query database with `.eq('client_id', testClientId)` filter to verify `current_tier` changed as expected

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] Tests import `checkForPromotions` from production service
2. [ ] Tests create users with `total_sales`/`total_units` values
3. [ ] Tests call `checkForPromotions(clientId)`
4. [ ] Tests verify database `current_tier` after promotion check (with `client_id` filter)
5. [ ] All 5 test cases pass
6. [ ] Type checker passes
7. [ ] Build completes

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - ✅ File path corrected to `appcode/tests/...`
  - ✅ Local helper deletion made explicit
  - ✅ `client_id` filter added to DB assertions
- Concerns Addressed:
  - ✅ Reusing existing helpers (createTestUser, cleanupTestData)
  - ✅ Local Supabase requirement documented

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 1
- Lines changed: ~400 (rewrite existing 644-line file)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself re-designing the solution, questioning the specification, or analyzing alternatives - STOP. The design phase is complete. This is execution phase. Follow the locked specification.

---

## Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` or `/home/jorge/Loyalty/Rumi`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - the local helper hasn't been replaced yet.

**Search for local helper in test file:**
```bash
grep -n "function findHighestQualifyingTier" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** Match found (gap exists - local helper still present)

**Search for production import (should NOT exist yet):**
```bash
grep -n "import.*checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** No match (gap exists - production not imported yet)

**Checklist:**
- [ ] Local helper still exists: [YES/NO]
- [ ] Production import missing: [YES/NO]
- [ ] Gap confirmed to still exist: [YES/NO]

**If local helper removed or production import exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Related Code Check

**Purpose:** Confirm production code exists and verify its signature.

**Verify production function exists:**
```bash
grep -n "export async function checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** Match at line ~340

**Verify return type:**
```bash
grep -A2 "export async function checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** `Promise<PromotionCheckResult>`

**Checklist:**
- [ ] Production `checkForPromotions` exists at line: [number]
- [ ] Return type is `PromotionCheckResult`: [YES/NO]
- [ ] Ready to import in tests

---

### Gate 4: Files to Modify Verification

**File to be modified:**

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** File exists, ~644 lines

**Checklist:**
- [ ] File exists: [YES/NO]
- [ ] Current line count: [number]
- [ ] File path matches Gap.md

---

### Gate 5: Factory Verification

**Purpose:** Confirm test helpers support required fields.

**Verify createTestUser supports total_sales/total_units:**
```bash
grep -n "total_sales\|total_units" /home/jorge/Loyalty/Rumi/appcode/tests/helpers/factories.ts
```
**Expected:** Lines 132-133 show defaults for total_sales: 0, total_units: 0

**Checklist:**
- [ ] `total_sales` supported: [YES/NO]
- [ ] `total_units` supported: [YES/NO]
- [ ] No factory modification needed: [YES/NO]

---

### Gate 6: Schema Verification

**Read SchemaFinalv2.md for users table:**
```bash
# Read lines 123-155 for users table
```

**Columns needed for tests:**
| Column in Spec | Purpose | Required |
|----------------|---------|----------|
| `total_sales` | User's lifetime sales | YES |
| `total_units` | User's lifetime units | YES |
| `current_tier` | User's current tier | YES |
| `client_id` | Multi-tenant isolation | YES |

**Read SchemaFinalv2.md for tiers table:**
```bash
# Read lines 254-272 for tiers table
```

**Columns needed for tests:**
| Column in Spec | Purpose | Required |
|----------------|---------|----------|
| `tier_id` | Tier identifier (tier_1, tier_2) | YES |
| `tier_order` | Tier ranking | YES |
| `sales_threshold` | Threshold for sales mode | YES |
| `units_threshold` | Threshold for units mode | YES |
| `client_id` | Multi-tenant isolation | YES |

**Checklist:**
- [ ] users.total_sales exists: [YES/NO]
- [ ] users.total_units exists: [YES/NO]
- [ ] users.current_tier exists: [YES/NO]
- [ ] tiers.sales_threshold exists: [YES/NO]
- [ ] tiers.units_threshold exists: [YES/NO]
- [ ] All column names verified against SchemaFinalv2.md

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For MODIFIED files: Pre-action check MUST match expected state
4. If any checkpoint fails, STOP and report

---

### Step 1: Verify Current Test File Structure

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts`
**Action Type:** VERIFY (pre-modification state)
**Purpose:** Confirm current file structure before rewriting

**Pre-Action Reality Check:**

**Read Current Imports (lines 1-40):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts lines 1-40
```

**Expected to see:**
- Import from `@/tests/helpers` (existing)
- NO import from `@/lib/services/tierCalculationService` (gap)

**Read Local Helper (lines 65-85):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts lines 65-85
```

**Expected to see:**
- Local `function findHighestQualifyingTier(` definition
- This is what will be DELETED

**Checklist:**
- [ ] Current imports verified
- [ ] Local helper location confirmed at lines ~69-82
- [ ] Ready to rewrite file

---

### Step 2: Rewrite Test File (Complete Replacement)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts`
**Action Type:** WRITE (complete file replacement)
**Purpose:** Replace entire file with production-calling tests

**New File Content:**

```typescript
/**
 * Integration Tests for Tier Calculation - Threshold Boundaries
 *
 * Tests that tier calculation uses correct >= threshold comparison
 * by calling the PRODUCTION checkForPromotions() service function.
 *
 * IMPORTANT: Uses LOCAL Supabase instance (requires `npx supabase start`).
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=tier-calculation
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.4.5 (Test tier calculation correct thresholds)
 * - SchemaFinalv2.md lines 254-272 (tiers table with sales_threshold, units_threshold)
 * - Loyalty.md lines 1580-1609 (Tier Calculation Logic: >= threshold comparison)
 * - tierCalculationService.ts checkForPromotions() (production function)
 *
 * Test Cases (per EXECUTION_PLAN.md Task 8.4.5):
 * 1. 999 < 1000 stays at current tier (below threshold)
 * 2. Exactly 1000 promotes to next tier (>= threshold)
 * 3. 1001 promotes to next tier (> threshold)
 * 4. vip_metric='sales' uses sales_threshold
 * 5. vip_metric='units' uses units_threshold
 *
 * Prerequisites:
 *   - Local Supabase running: `cd appcode && npx supabase start`
 *   - Database migrations applied
 *
 * GAP FIX: GAP-TIER-CALC-TEST
 * This file was rewritten to call production checkForPromotions()
 * instead of a local helper function.
 */

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
      testClientId = ''; // Reset for next test
    }
  });

  // ============================================================================
  // Test Case 1: 999 < 1000 stays at current tier
  // Per Loyalty.md line 1594: >= threshold means 999 fails threshold of 1000
  // ============================================================================
  describe('Test Case 1: Below threshold (999 < 1000)', () => {
    it('should NOT promote user when total_sales is 999 and Silver threshold is 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Below',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers with known thresholds
      // tier_1 (Bronze): threshold 0
      // tier_2 (Silver): threshold 1000
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
        total_sales: 999, // Below Silver threshold of 1000
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: No promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(0);
      expect(result.promotions).toHaveLength(0);

      // VERIFY: User tier unchanged in database (with client_id filter for multi-tenant safety)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_1');
    });
  });

  // ============================================================================
  // Test Case 2: Exactly 1000 promotes (>= threshold)
  // Per Loyalty.md line 1594: if (checkpointValue >= threshold)
  // ============================================================================
  describe('Test Case 2: Exactly at threshold (1000 >= 1000)', () => {
    it('should promote user when total_sales is exactly 1000', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Exact',
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
        total_sales: 1000, // Exactly at Silver threshold
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed in database (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });
  });

  // ============================================================================
  // Test Case 3: 1001 promotes (> threshold)
  // Per Loyalty.md line 1594: >= means 1001 > 1000 passes
  // ============================================================================
  describe('Test Case 3: Above threshold (1001 > 1000)', () => {
    it('should promote user when total_sales is 1001', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Above',
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

      // Setup: Create user at tier_1 with total_sales = 1001
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 1001, // Above Silver threshold
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed in database (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });

    it('should find highest qualifying tier when value exceeds multiple thresholds', async () => {
      // Setup: Create client in sales mode
      const client = await createTestClientRecord(supabase, {
        name: 'Threshold Test Client - Multi',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create 4-tier setup
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
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_3',
        tier_name: 'Gold',
        tier_order: 3,
        sales_threshold: 3000,
        units_threshold: 300,
      });
      await createTestTier(supabase, {
        client_id: testClientId,
        tier_id: 'tier_4',
        tier_name: 'Platinum',
        tier_order: 4,
        sales_threshold: 10000,
        units_threshold: 1000,
      });

      // Setup: Create user at tier_1 with total_sales = 5000 (exceeds Silver AND Gold)
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 5000, // Exceeds Gold (3000) but not Platinum (10000)
        total_units: 0,
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promoted to Gold (highest qualifying)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_3'); // Gold, not Silver

      // VERIFY: User tier changed to Gold (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_3');
    });
  });

  // ============================================================================
  // Test Case 4: vip_metric='sales' uses sales_threshold
  // Per Loyalty.md lines 1590-1592: vip_metric determines threshold field
  // ============================================================================
  describe('Test Case 4: vip_metric=sales uses sales_threshold', () => {
    it('should use sales_threshold when client vip_metric is sales', async () => {
      // Setup: Create client with SALES mode
      const client = await createTestClientRecord(supabase, {
        name: 'Sales Mode Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Setup: Create tiers with DIFFERENT sales and units thresholds
      // This proves we're using the correct field
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
        sales_threshold: 1000, // Sales threshold is HIGH
        units_threshold: 50, // Units threshold is LOW
      });

      // Setup: Create user with total_sales = 500 (below sales 1000, above units 50)
      // In SALES mode, user should NOT be promoted
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 500, // Below sales_threshold (1000)
        total_units: 100, // Above units_threshold (50) - but shouldn't matter
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: NO promotion (because sales_threshold used, not units_threshold)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(0);

      // VERIFY: User tier unchanged (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_1');
    });
  });

  // ============================================================================
  // Test Case 5: vip_metric='units' uses units_threshold
  // Per Loyalty.md lines 1590-1592: vip_metric determines threshold field
  // ============================================================================
  describe('Test Case 5: vip_metric=units uses units_threshold', () => {
    it('should use units_threshold when client vip_metric is units', async () => {
      // Setup: Create client with UNITS mode
      const client = await createTestClientRecord(supabase, {
        name: 'Units Mode Client',
        vip_metric: 'units',
      });
      testClientId = client.id;

      // Setup: Create tiers with DIFFERENT sales and units thresholds
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
        sales_threshold: 1000, // Sales threshold is HIGH
        units_threshold: 50, // Units threshold is LOW
      });

      // Setup: Create user with total_units = 100 (above units 50, below sales 1000)
      // In UNITS mode, user SHOULD be promoted
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        current_tier: 'tier_1',
        total_sales: 100, // Below sales_threshold (1000) - but shouldn't matter
        total_units: 100, // Above units_threshold (50)
      });

      // ACT: Call PRODUCTION service
      const result = await checkForPromotions(testClientId);

      // ASSERT: Promotion occurred (because units_threshold used)
      expect(result.success).toBe(true);
      expect(result.usersPromoted).toBe(1);
      expect(result.promotions[0].fromTier).toBe('tier_1');
      expect(result.promotions[0].toTier).toBe('tier_2');

      // VERIFY: User tier changed (with client_id filter)
      const { data: updatedUser } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(updatedUser?.current_tier).toBe('tier_2');
    });

    it('should correctly differentiate between sales and units mode', async () => {
      // Setup: Create TWO clients - one in each mode
      const salesClient = await createTestClientRecord(supabase, {
        name: 'Sales Mode Test',
        vip_metric: 'sales',
      });

      const unitsClient = await createTestClientRecord(supabase, {
        name: 'Units Mode Test',
        vip_metric: 'units',
      });

      // Create identical tiers for BOTH clients
      for (const clientId of [salesClient.id, unitsClient.id]) {
        await createTestTier(supabase, {
          client_id: clientId,
          tier_id: 'tier_1',
          tier_name: 'Bronze',
          tier_order: 1,
          sales_threshold: 0,
          units_threshold: 0,
        });
        await createTestTier(supabase, {
          client_id: clientId,
          tier_id: 'tier_2',
          tier_name: 'Silver',
          tier_order: 2,
          sales_threshold: 1000,
          units_threshold: 100,
        });
      }

      // Create user in SALES client with value 500
      const salesUser = await createTestUser(supabase, {
        client_id: salesClient.id,
        current_tier: 'tier_1',
        total_sales: 500, // Below 1000
        total_units: 500, // Above 100 - but shouldn't matter
      });

      // Create user in UNITS client with value 500
      const unitsUser = await createTestUser(supabase, {
        client_id: unitsClient.id,
        current_tier: 'tier_1',
        total_sales: 500, // Below 1000 - but shouldn't matter
        total_units: 500, // Above 100
      });

      // ACT: Call PRODUCTION service for BOTH clients
      const salesResult = await checkForPromotions(salesClient.id);
      const unitsResult = await checkForPromotions(unitsClient.id);

      // ASSERT: Different outcomes based on vip_metric
      expect(salesResult.usersPromoted).toBe(0); // 500 < 1000 sales
      expect(unitsResult.usersPromoted).toBe(1); // 500 >= 100 units

      // VERIFY in database (with client_id filters)
      const { data: salesUserAfter } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', salesUser.id)
        .eq('client_id', salesClient.id)
        .single();

      const { data: unitsUserAfter } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', unitsUser.id)
        .eq('client_id', unitsClient.id)
        .single();

      expect(salesUserAfter?.current_tier).toBe('tier_1'); // NOT promoted
      expect(unitsUserAfter?.current_tier).toBe('tier_2'); // Promoted

      // Cleanup both clients
      await cleanupTestData(supabase, { clientIds: [salesClient.id, unitsClient.id] });
      testClientId = ''; // Clear to avoid double cleanup
    });
  });
});
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
Content: [full content above]
```

**Post-Create Verification:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** ~420 lines

**Verify production import present:**
```bash
grep -n "import.*checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** Line ~42 shows import

**Verify local helper REMOVED:**
```bash
grep -n "function findHighestQualifyingTier" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** No matches (helper deleted)

**Step Checkpoint:**
- [ ] File written successfully ✅
- [ ] Production import present ✅
- [ ] Local helper removed ✅
- [ ] Line count approximately correct ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Type Check

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts`
**Action Type:** VERIFY
**Purpose:** Confirm no type errors in rewritten file

**Type Check Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit tests/integration/cron/tier-calculation.test.ts 2>&1 | head -30
```
**Expected:** No type errors (or only pre-existing errors unrelated to this file)

**Step Checkpoint:**
- [ ] Type check passed ✅
- [ ] No new type errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts`

**New Import:**
```typescript
import { checkForPromotions } from '@/lib/services/tierCalculationService';
```

**Verification:**
```bash
grep -n "checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts | head -5
```
**Expected:** Import line + multiple call sites

**Checklist:**
- [ ] Import path correct (`@/lib/services/tierCalculationService`)
- [ ] Function name matches export (`checkForPromotions`)
- [ ] Return type handled correctly (`PromotionCheckResult`)

---

### Call Site Verification

**Function calls in test file:**

| Test Case | Call Site | Expected |
|-----------|-----------|----------|
| Test 1 | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 2 | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 3a | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 3b | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 4 | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 5a | `await checkForPromotions(testClientId)` | Returns `PromotionCheckResult` |
| Test 5b | `await checkForPromotions(salesClient.id)` + `await checkForPromotions(unitsClient.id)` | Returns `PromotionCheckResult` |

**Checklist:**
- [ ] All calls pass `clientId` string parameter
- [ ] All calls await the Promise
- [ ] All calls check `result.success`, `result.usersPromoted`, `result.promotions`

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**DB Verification Queries in Tests:**

**Query Pattern (used in all tests):**
```typescript
const { data: updatedUser } = await supabase
  .from('users')
  .select('current_tier')
  .eq('id', user.id)
  .eq('client_id', testClientId)  // Multi-tenant filter
  .single();
```

**Security Checklist:**
- [ ] `.eq('client_id', testClientId)` present in ALL DB assertions
- [ ] No queries without client_id filter
- [ ] No cross-tenant data exposure possible

---

### Grep Verification (Explicit Check)

```bash
grep -n "\.eq('client_id'" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** Multiple lines showing client_id filter in DB queries

**Checklist:**
- [ ] Test Case 1: client_id filter present
- [ ] Test Case 2: client_id filter present
- [ ] Test Case 3a: client_id filter present
- [ ] Test Case 3b: client_id filter present
- [ ] Test Case 4: client_id filter present
- [ ] Test Case 5a: client_id filter present
- [ ] Test Case 5b: client_id filter present (both queries)

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before changes)
**Actual:** [document actual output]

**Status:**
- [ ] Type check passed ✅

---

### Verification 2: Build Succeeds (Optional - Skip if type check passes)

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -10
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 3: Acceptance Criteria Validation

**For each acceptance criterion from Gap.md Section 16:**

#### Criterion 1: Tests import `checkForPromotions` from production service
**Test:**
```bash
grep "import.*checkForPromotions.*from.*tierCalculationService" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```
**Expected:** Match found
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: Tests create users with `total_sales`/`total_units` values
**Test:**
```bash
grep "total_sales:" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts | head -5
```
**Expected:** Multiple matches showing total_sales values (999, 1000, 1001, 500, etc.)
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: Tests call `checkForPromotions(clientId)`
**Test:**
```bash
grep "await checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts | wc -l
```
**Expected:** 8 calls (one per test, plus 2 in the comparison test)
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Tests verify database `current_tier` after promotion check (with client_id filter)
**Test:**
```bash
grep -A2 "\.from('users')" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts | grep "client_id" | wc -l
```
**Expected:** Multiple matches (one per DB verification)
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: All 5 test cases pass
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=tier-calculation 2>&1 | tail -20
```
**Expected:** All tests pass
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Type checker passes
**Test:** (Same as Verification 1)
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Build completes
**Test:** (Same as Verification 2 or skip if type check passes)
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
```

**Expected Changes:**
- `tier-calculation.test.ts`: ~644 lines deleted, ~420 lines added (net change)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows expected changes ✅
- [ ] No unexpected modifications ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | Import checkForPromotions | ✅ / ❌ |
| 2 | Create users with total_sales/total_units | ✅ / ❌ |
| 3 | Call checkForPromotions(clientId) | ✅ / ❌ |
| 4 | Verify DB with client_id filter | ✅ / ❌ |
| 5 | All 5 test cases pass | ✅ / ❌ |
| 6 | Type checker passes | ✅ / ❌ |
| 7 | Build completes | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-14
**Executor:** Claude Opus 4.5
**Specification Source:** TierCalculationTestGap.md
**Implementation Doc:** TierCalculationTestGapIMPL.md
**Gap ID:** GAP-TIER-CALC-TEST

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Related Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Factory Verification - [PASS/FAIL]
[Timestamp] Gate 6: Schema Verification - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Verify Current Structure - Verified ✅
[Timestamp] Step 2: Rewrite Test File - Written ✅ - Verified ✅
[Timestamp] Step 3: Type Check - [PASS/FAIL]
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] client_id grep verification - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Type check passes ✅
[Timestamp] Criterion 1: Import checkForPromotions ✅
[Timestamp] Criterion 2: total_sales/total_units ✅
[Timestamp] Criterion 3: checkForPromotions calls ✅
[Timestamp] Criterion 4: client_id filter ✅
[Timestamp] Criterion 5: All tests pass ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `appcode/tests/integration/cron/tier-calculation.test.ts` - REWRITE - ~420 lines - Production integration tests

**Total:** 1 file, net change ~-220 lines (644 → ~420)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify local helper removed
grep -n "function findHighestQualifyingTier" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
# Should show: no matches

# 2. Verify production import added
grep -n "import.*checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts
# Should show: line ~42

# 3. Verify client_id filters present
grep -n "\.eq('client_id'" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/tier-calculation.test.ts | wc -l
# Should show: 8+ occurrences

# 4. Verify type check
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit tests/integration/cron/tier-calculation.test.ts 2>&1 | head -5
# Should show: no errors

# 5. Run tests (requires local Supabase)
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=tier-calculation
# Should show: all tests pass
```

---

## Document Status

**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Factory supports required fields
- [ ] Schema verified

**Implementation:**
- [ ] Step 1 completed ✅
- [ ] Step 2 completed ✅
- [ ] Step 3 completed ✅

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filters confirmed via grep ✅

**Feature Verification:**
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update TierCalculationTestGap.md status to "Implemented"

**Git Commit Message Template:**
```
fix(tests): rewrite tier-calculation tests to call production service

Implements GAP-TIER-CALC-TEST: Tests were calling a local helper
function instead of production checkForPromotions() service.

Changes:
- Deleted local findHighestQualifyingTier() helper
- Added import from @/lib/services/tierCalculationService
- Tests now call checkForPromotions(clientId) directly
- All DB assertions include .eq('client_id', testClientId) filter
- 7 tests covering all 5 test cases from EXECUTION_PLAN.md Task 8.4.5

References:
- TierCalculationTestGap.md
- TierCalculationTestGapIMPL.md
- EXECUTION_PLAN.md Task 8.4.5

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used COMPLETE code blocks (zero placeholders)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)

### Specification Fidelity
- [ ] Followed locked specification from Gap.md (no re-design)
- [ ] Addressed ALL audit feedback (file path, local helper deletion, client_id filter)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering in all DB queries)
- [ ] Used grep to confirm client_id presence

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED ✅ / CHECKS FAILED ❌

**RED FLAGS exhibited:** [ ] None ✅
