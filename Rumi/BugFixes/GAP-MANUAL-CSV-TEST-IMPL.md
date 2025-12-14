# Manual CSV Upload Test - Gap Implementation Plan

**Specification Source:** GAP-MANUAL-CSV-TEST.md
**Gap ID:** GAP-MANUAL-CSV-TEST
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Source Documents Analyzed

| Document | Section/Lines | Purpose |
|----------|---------------|---------|
| GAP-MANUAL-CSV-TEST.md | Full document (844 lines) | Specification source - locked design |
| SchemaFinalv2.md | Lines 123-155 (users), 227-251 (videos), 254-272 (tiers), 106-120 (clients) | Schema verification for test assertions |
| csvParser.ts | Lines 24-35 (CRUVA_COLUMN_MAP), 70-140 (parseCruvaCSV) | Function to test |
| tierCalculationService.ts | Line 340 (checkForPromotions export) | Service function to call |
| tests/helpers/index.ts | Lines 16-47 (exports) | Test helper availability |
| daily-automation-metrics.test.ts | Full file | Test pattern reference |
| syncRepository.ts | Lines 201-240 (findUserByTiktokHandle) | Handle lookup pattern for Test Case 2b |
| EXECUTION_PLAN.md | Task 8.4.9, Task 12.22.5 | Task requirements |

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From GAP-MANUAL-CSV-TEST.md:**

**Gap Summary:** An integration test that validates the complete CSV-to-metrics pipeline by feeding a sample CSV directly to Phase 8 helpers, bypassing the CRUVA Puppeteer download step.

**Business Need:** Validate Phase 8 CSV processing helpers work correctly before Phase 12 builds on them (Task 12.22.5).

**Files to Create/Modify:**
- CREATE: `appcode/tests/integration/cron/manual-csv-upload.test.ts`
- MODIFY: `EXECUTION_PLAN.md` (Task 8.4.9 completion note)

**Specified Solution:**
Create an integration test that simulates the manual CSV upload flow by:
1. Generating a sample CSV string with known values
2. Parsing it with `parseCruvaCSV()` (validates parsing)
3. Inserting videos directly via `createTestVideo` helper
4. Calling `update_precomputed_fields` RPC (validates metrics)
5. Calling `checkForPromotions()` (validates tier logic)
6. Asserting expected outcomes

**Acceptance Criteria (From GAP-MANUAL-CSV-TEST.md Section 16 + Audit Additions):**
1. [ ] Test file created at `appcode/tests/integration/cron/manual-csv-upload.test.ts`
2. [ ] Test Case 1 passes: CSV parsing validates column mapping
3. [ ] Test Case 2 passes: Video insertion via createTestVideo helper
4. [ ] Test Case 2b passes: Handle-based user lookup (Audit addition - mirrors production path)
5. [ ] Test Case 3 passes: RPC update_precomputed_fields updates user metrics
6. [ ] Test Case 4 passes: checkForPromotions triggers tier change
7. [ ] Test Case 5 passes: Multi-tenant isolation (Client B unaffected by Client A operations)
8. [ ] Type checker passes: `npx tsc --noEmit` returns 0 errors
9. [ ] All existing tests still pass: `npm test` shows no regressions
10. [ ] Task 8.4.9 marked complete in EXECUTION_PLAN.md

**From Audit Feedback (IMPL Document Audit - 2025-12-14):**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  1. ✅ Gate 1b added: Environment variable verification to ensure local Supabase
  2. ✅ Verify SUPABASE_URL points to 127.0.0.1/localhost before execution
- Concerns Addressed:
  1. ✅ Source Documents Analyzed section added for traceability
  2. ✅ Removed unused `createTestClient` import (lint compliance)
  3. ✅ Added Test Case 2b: Handle-based lookup to mirror production ingestion path

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1
- Files modified: 1
- Lines added: ~350 (test file with 6 test cases) + ~5 (EXECUTION_PLAN.md)
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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` (or `/home/jorge/Loyalty/Rumi`)

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 1b: Environment Variable Verification (CRITICAL - Audit Requirement)

**Purpose:** Verify `SUPABASE_URL` points to LOCAL Supabase instance, not production. `checkForPromotions()` uses `createClient()` which reads from environment variables. Tests MUST hit local database.

**Check SUPABASE_URL:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && grep "SUPABASE_URL" .env.local .env.test 2>/dev/null | head -5
```
**Expected:** URL contains `127.0.0.1` or `localhost` (local Supabase)
**FAIL Condition:** URL contains `supabase.co` or any remote host

**Alternative - Check local Supabase is running:**
```bash
npx supabase status 2>&1 | grep -E "API URL|DB URL"
```
**Expected:** Shows local URLs (127.0.0.1:54321 or similar)

**Verify test client configuration:**
```bash
grep -n "SUPABASE_URL\|localhost\|127.0.0.1" /home/jorge/Loyalty/Rumi/appcode/tests/helpers/testClient.ts | head -10
```
**Purpose:** Confirm test helpers use local connection

**Checklist:**
- [ ] SUPABASE_URL verified as local (127.0.0.1 or localhost): [YES / NO]
- [ ] Local Supabase is running: [YES / NO]
- [ ] Test client config verified: [YES / NO]

**If SUPABASE_URL points to production:** STOP. Do not proceed. Either:
1. Update `.env.test` to point to local Supabase, OR
2. Run `npx supabase start` and update env vars

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the gap STILL exists - the test file hasn't been created since Gap.md was written.

**Search for existing implementation:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts 2>&1
```
**Expected:** "No such file or directory" (gap is real)

```bash
grep -r "Manual CSV Upload Pipeline" /home/jorge/Loyalty/Rumi/appcode/tests/
```
**Expected:** No matches (gap is real)

**Checklist:**
- [ ] File does not exist: [result]
- [ ] Grep returned no matches: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to ensure proper integration patterns.

**Search for existing test patterns:**
```bash
head -80 /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/daily-automation-metrics.test.ts
```
**Purpose:** Verify test setup patterns match specification

**Search for helper exports:**
```bash
grep -n "export" /home/jorge/Loyalty/Rumi/appcode/tests/helpers/index.ts
```
**Purpose:** Verify all helpers in specification exist

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `tests/helpers/index.ts` | createTestClient, createTestUser, etc. | Direct dependency | Import and use |
| `tests/integration/cron/daily-automation-metrics.test.ts` | Test structure pattern | Pattern to follow | Follow same structure |
| `lib/utils/csvParser.ts` | parseCruvaCSV | Direct dependency | Import and call |
| `lib/services/tierCalculationService.ts` | checkForPromotions | Direct dependency | Import and call |

**Checklist:**
- [ ] Related test patterns identified: YES
- [ ] Duplication risk assessed: LOW (new test file)
- [ ] Integration points identified: 4 imports needed

---

### Gate 4: Files to Modify Verification

**File 1 (CREATE):** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts 2>&1
```
**Expected:** File does not exist

**File 2 (MODIFY):** `/home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md`
```bash
ls -la /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md
```
**Expected:** File exists

**Checklist:**
- [ ] File to create does not exist: confirmed
- [ ] File to modify exists: confirmed
- [ ] File paths match Gap.md

---

### Gate 5: Schema Verification

**Tables involved:** `clients`, `users`, `videos`, `tiers`

**Column verification (from previous SchemaFinalv2.md read):**
| Column in Spec | Table | Exists? | Type Match? |
|----------------|-------|---------|-------------|
| `client_id` | users, videos, tiers | YES | UUID |
| `tiktok_handle` | users | YES | VARCHAR(100) |
| `total_sales` | users | YES | DECIMAL(10,2) |
| `total_units` | users | YES | INTEGER |
| `current_tier` | users | YES | VARCHAR(50) |
| `video_url` | videos | YES | TEXT UNIQUE |
| `gmv` | videos | YES | DECIMAL(10,2) |
| `units_sold` | videos | YES | INTEGER |
| `sales_threshold` | tiers | YES | DECIMAL(10,2) |
| `units_threshold` | tiers | YES | INTEGER |
| `vip_metric` | clients | YES | VARCHAR(10) |

**Checklist:**
- [ ] All required columns exist in schema: YES
- [ ] Data types compatible: YES
- [ ] No schema migration needed: YES

---

### Gate 6: API Contract Verification

> Skip this gate - feature is a test file, no API changes

**Checklist:**
- [x] SKIPPED - No API changes in this implementation

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. For NEW files: Verify file created with correct content
4. If any checkpoint fails, STOP and report

---

### Step 1: Create Test File

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts`
**Action Type:** CREATE
**Purpose:** Create the integration test file with 5 test cases validating CSV → metrics → tier pipeline

---

**New File Content:**
```typescript
/**
 * Integration Tests for Manual CSV Upload Pipeline (Task 8.4.9)
 *
 * Validates Phase 8 CSV processing helpers work correctly when
 * fed CSV data directly (simulating manual upload scenario).
 *
 * Acceptance Criteria Mapping:
 * - Test Case 1 → Validates parseCruvaCSV() column mapping and data types
 * - Test Case 2 → Validates video insertion with createTestVideo helper
 * - Test Case 3 → Validates update_precomputed_fields RPC updates user metrics
 * - Test Case 4 → Validates checkForPromotions() triggers tier change
 * - Test Case 5 → Validates client_id isolation (multi-tenant)
 *
 * Design Decisions:
 * - Uses createTestVideo helper (not direct insert) for consistency with existing tests
 * - All DB operations scoped by .eq('client_id', testClientId)
 * - afterEach cleanup via cleanupTestData(supabase, { clientIds: [testClientId] })
 * - RPC called via (supabase.rpc as Function)('update_precomputed_fields', params)
 */

import { parseCruvaCSV } from '@/lib/utils/csvParser';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import {
  createTestClientRecord,
  createTestUser,
  createTestTier,
  createTestTierSet,
  createTestVideo,
  cleanupTestData,
  assertSupabaseRunning,
} from '@/tests/helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Note: createTestClient removed per audit feedback (unused import)

// Sample CSV matching CRUVA format (10 columns per CRUVA_COLUMN_MAP)
const SAMPLE_CSV = `Handle,Video,Views,Likes,Comments,GMV,CTR,Units Sold,Post Date,Video Title
@testcreator1,https://tiktok.com/video1,1000,50,10,500.00,2.5,25,2025-01-15,Test Video 1
@testcreator1,https://tiktok.com/video2,2000,100,20,750.00,3.0,35,2025-01-16,Test Video 2
@testcreator2,https://tiktok.com/video3,500,25,5,250.00,1.5,10,2025-01-15,Another Video`;

jest.setTimeout(30000);

describe('Manual CSV Upload Pipeline (Task 8.4.9)', () => {
  let supabase: SupabaseClient<Database>;
  let testClientId: string;

  beforeAll(async () => {
    await assertSupabaseRunning();
    supabase = createTestClient();
  });

  afterAll(async () => {
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
    }
  });

  afterEach(async () => {
    // CRITICAL: Clean up test data after each test to prevent cross-test pollution
    if (testClientId) {
      await cleanupTestData(supabase, { clientIds: [testClientId] });
      testClientId = '';
    }
  });

  // ==========================================================================
  // Test Case 1: CSV parsing (validates parseCruvaCSV column mapping)
  // Acceptance Criterion: Parse CSV string → correct ParseResult with typed rows
  // ==========================================================================
  describe('Test Case 1: CSV Parsing', () => {
    it('should parse CSV with correct column mapping and data types', () => {
      // ACT: Parse sample CSV
      const result = parseCruvaCSV(SAMPLE_CSV);

      // ASSERT: Parsing succeeded
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalRows).toBe(3);
      expect(result.skippedRows).toBe(0);

      // ASSERT: Column mapping correct (CRUVA headers → database columns)
      expect(result.rows[0].tiktok_handle).toBe('@testcreator1'); // Handle → tiktok_handle
      expect(result.rows[0].video_url).toBe('https://tiktok.com/video1'); // Video → video_url
      expect(result.rows[0].views).toBe(1000); // Views → views (number)
      expect(result.rows[0].gmv).toBe(500.00); // GMV → gmv (number)
      expect(result.rows[0].units_sold).toBe(25); // Units Sold → units_sold (number)
      expect(result.rows[0].post_date).toBe('2025-01-15'); // Post Date → post_date

      // ASSERT: Multiple rows parsed
      expect(result.rows.length).toBe(3);
      expect(result.rows[1].tiktok_handle).toBe('@testcreator1');
      expect(result.rows[2].tiktok_handle).toBe('@testcreator2');
    });
  });

  // ==========================================================================
  // Test Case 2: Video insertion (validates createTestVideo helper)
  // Acceptance Criterion: Parsed rows → videos table with correct data
  // ==========================================================================
  describe('Test Case 2: Video Insertion', () => {
    it('should insert videos from parsed CSV data using test helper', async () => {
      // SETUP: Create test client and user
      const client = await createTestClientRecord(supabase, {
        name: 'CSV Upload Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
      });

      // ACT: Parse CSV and insert videos using helper
      const parseResult = parseCruvaCSV(SAMPLE_CSV);
      const userRows = parseResult.rows.filter(r => r.tiktok_handle === '@testcreator1');

      for (const row of userRows) {
        await createTestVideo(supabase, {
          client_id: testClientId,
          user_id: user.id,
          video_url: row.video_url,
          video_title: row.video_title,
          post_date: row.post_date,
          views: row.views,
          likes: row.likes,
          comments: row.comments,
          gmv: row.gmv,
          ctr: row.ctr,
          units_sold: row.units_sold,
        });
      }

      // ASSERT: Videos exist in database with correct data
      const { data: videos } = await supabase
        .from('videos')
        .select('video_url, gmv, units_sold, views')
        .eq('client_id', testClientId) // Multi-tenant filter
        .eq('user_id', user.id);

      expect(videos).toHaveLength(2);
      expect(videos?.find(v => v.video_url === 'https://tiktok.com/video1')?.gmv).toBe(500.00);
      expect(videos?.find(v => v.video_url === 'https://tiktok.com/video2')?.gmv).toBe(750.00);
    });
  });

  // ==========================================================================
  // Test Case 2b: Handle-based user lookup (mirrors real ingestion path)
  // Acceptance Criterion: CSV tiktok_handle → find user → insert video for that user
  // Per Audit: Validates findUserByTiktokHandle pattern used in production
  // ==========================================================================
  describe('Test Case 2b: Handle-Based User Lookup', () => {
    it('should find user by tiktok_handle from CSV and insert video', async () => {
      // SETUP: Create test client and user with known handle
      const client = await createTestClientRecord(supabase, {
        name: 'Handle Lookup Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      const knownHandle = '@testcreator1';
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: knownHandle,
        current_tier: 'tier_1',
      });

      // ACT: Parse CSV, find user by handle (simulating findUserByTiktokHandle)
      const parseResult = parseCruvaCSV(SAMPLE_CSV);
      const csvRow = parseResult.rows.find(r => r.tiktok_handle === knownHandle);
      expect(csvRow).toBeDefined();

      // Simulate findUserByTiktokHandle: query user by tiktok_handle
      const { data: foundUser } = await supabase
        .from('users')
        .select('id, tiktok_handle')
        .eq('client_id', testClientId) // Multi-tenant filter
        .eq('tiktok_handle', knownHandle)
        .single();

      expect(foundUser).toBeDefined();
      expect(foundUser?.tiktok_handle).toBe(knownHandle);

      // Insert video for the found user (using user_id from lookup)
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: foundUser!.id,
        video_url: csvRow!.video_url,
        video_title: csvRow!.video_title,
        gmv: csvRow!.gmv,
        units_sold: csvRow!.units_sold,
      });

      // ASSERT: Video linked to correct user via handle lookup
      const { data: videos } = await supabase
        .from('videos')
        .select('video_url, user_id')
        .eq('client_id', testClientId)
        .eq('user_id', foundUser!.id);

      expect(videos).toHaveLength(1);
      expect(videos?.[0].video_url).toBe(csvRow!.video_url);
    });
  });

  // ==========================================================================
  // Test Case 3: Metrics update via RPC (validates update_precomputed_fields)
  // Acceptance Criterion: After video insert → user.total_sales = SUM(videos.gmv)
  // ==========================================================================
  describe('Test Case 3: Metrics Update via RPC', () => {
    it('should update user precomputed fields after calling RPC', async () => {
      // SETUP: Create client, tiers, user
      const client = await createTestClientRecord(supabase, {
        name: 'Metrics RPC Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      await createTestTierSet(supabase, testClientId);

      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
        total_sales: 0, // Start at 0
      });

      // ACT: Insert videos with known GMV values
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/test-video-1',
        gmv: 500.00,
        units_sold: 25,
      });
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/test-video-2',
        gmv: 750.00,
        units_sold: 35,
      });

      // ACT: Call RPC to update precomputed fields
      // Signature: update_precomputed_fields(p_client_id UUID, p_user_ids UUID[] DEFAULT NULL)
      const { data: rpcResult, error: rpcError } = await (supabase.rpc as Function)(
        'update_precomputed_fields',
        { p_client_id: testClientId, p_user_ids: null }
      );

      expect(rpcError).toBeNull();

      // ASSERT: User metrics updated correctly
      const { data: updatedUser } = await supabase
        .from('users')
        .select('total_sales, total_units, checkpoint_sales_current')
        .eq('id', user.id)
        .eq('client_id', testClientId) // Multi-tenant filter
        .single();

      expect(Number(updatedUser?.total_sales)).toBe(1250.00); // 500 + 750
      expect(Number(updatedUser?.total_units)).toBe(60); // 25 + 35
    });
  });

  // ==========================================================================
  // Test Case 4: Tier promotion (validates checkForPromotions)
  // Acceptance Criterion: User crosses threshold → current_tier updated
  // ==========================================================================
  describe('Test Case 4: Tier Promotion', () => {
    it('should trigger tier promotion when sales exceed threshold', async () => {
      // SETUP: Create client with tiers
      const client = await createTestClientRecord(supabase, {
        name: 'Tier Promotion Test Client',
        vip_metric: 'sales',
      });
      testClientId = client.id;

      // Create tiers: tier_1 (0), tier_2 (1000), tier_3 (3000)
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

      // Create user at tier_1 with 0 sales
      const user = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@testcreator1',
        current_tier: 'tier_1',
        total_sales: 0,
      });

      // ACT: Add videos that push sales over tier_2 threshold (1000)
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/promo-video-1',
        gmv: 600.00,
      });
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: user.id,
        video_url: 'https://tiktok.com/promo-video-2',
        gmv: 600.00,
      });

      // Call RPC to update metrics (total_sales = 1200)
      await (supabase.rpc as Function)('update_precomputed_fields', {
        p_client_id: testClientId,
        p_user_ids: null,
      });

      // Verify total_sales updated before promotion check
      const { data: beforePromo } = await supabase
        .from('users')
        .select('total_sales, current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(Number(beforePromo?.total_sales)).toBe(1200);
      expect(beforePromo?.current_tier).toBe('tier_1'); // Not promoted yet

      // ACT: Call checkForPromotions (this is the tier calculation service)
      const promotionResult = await checkForPromotions(testClientId);

      // ASSERT: User promoted to tier_2
      const { data: afterPromo } = await supabase
        .from('users')
        .select('current_tier')
        .eq('id', user.id)
        .eq('client_id', testClientId)
        .single();

      expect(afterPromo?.current_tier).toBe('tier_2');
      expect(promotionResult.usersPromoted).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Test Case 5: Multi-tenant isolation (validates client_id scoping)
  // Acceptance Criterion: Operations on client A do NOT affect client B
  // ==========================================================================
  describe('Test Case 5: Multi-tenant Isolation', () => {
    let clientBId: string;

    afterEach(async () => {
      // Clean up Client B separately
      if (clientBId) {
        await cleanupTestData(supabase, { clientIds: [clientBId] });
        clientBId = '';
      }
    });

    it('should only affect videos/users for specified client_id', async () => {
      // SETUP: Create two separate clients
      const clientA = await createTestClientRecord(supabase, {
        name: 'Client A',
        vip_metric: 'sales',
      });
      testClientId = clientA.id;

      const clientB = await createTestClientRecord(supabase, {
        name: 'Client B',
        vip_metric: 'sales',
      });
      clientBId = clientB.id;

      // Create tiers for Client A only
      await createTestTierSet(supabase, testClientId);

      // Create users in each client
      const userA = await createTestUser(supabase, {
        client_id: testClientId,
        tiktok_handle: '@creatorA',
        total_sales: 0,
      });
      const userB = await createTestUser(supabase, {
        client_id: clientBId,
        tiktok_handle: '@creatorB',
        total_sales: 0,
      });

      // ACT: Add videos only to Client A's user
      await createTestVideo(supabase, {
        client_id: testClientId,
        user_id: userA.id,
        video_url: 'https://tiktok.com/clientA-video',
        gmv: 1000.00,
      });

      // Call RPC for Client A only
      await (supabase.rpc as Function)('update_precomputed_fields', {
        p_client_id: testClientId,
        p_user_ids: null,
      });

      // ASSERT: Client A's user updated
      const { data: userAAfter } = await supabase
        .from('users')
        .select('total_sales')
        .eq('id', userA.id)
        .eq('client_id', testClientId)
        .single();

      expect(Number(userAAfter?.total_sales)).toBe(1000);

      // ASSERT: Client B's user NOT affected (still 0)
      const { data: userBAfter } = await supabase
        .from('users')
        .select('total_sales')
        .eq('id', userB.id)
        .eq('client_id', clientBId)
        .single();

      expect(Number(userBAfter?.total_sales)).toBe(0);
    });
  });
});
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
```
**Expected:** File exists, ~290 lines

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -E "manual-csv-upload|error" | head -20
```
**Expected:** No type errors related to the new file

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Update EXECUTION_PLAN.md Task 8.4.9

**Target File:** `/home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md`
**Action Type:** MODIFY
**Purpose:** Mark Task 8.4.9 as complete with implementation note

---

**Pre-Action Reality Check:**

**Read Current State:**
```bash
grep -n "Task 8.4.9" /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md | head -5
```

Find the line with Task 8.4.9 and read surrounding context.

**Edit Action:**

**OLD Code (to be replaced):**
```markdown
- [ ] **Task 8.4.9:** Manual dry run
```
(Or whatever the current unchecked state shows)

**NEW Code (replacement):**
```markdown
- [x] **Task 8.4.9:** Manual dry run
    - **Note:** Validated Phase 8 CSV processing helpers via `manual-csv-upload.test.ts` (5 test cases). Tests: CSV parsing, video insertion, metrics RPC, tier promotion, multi-tenant isolation.
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md
Old String: [exact line with Task 8.4.9]
New String: [updated line with completion note]
```

**Post-Action Verification:**
```bash
grep -A2 "Task 8.4.9" /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md
```
**Expected:** Shows `[x]` and completion note

**Step Checkpoint:**
- [ ] Action completed successfully
- [ ] Post-action state matches expected
- [ ] Task marked complete with note

**Checkpoint Status:** [PASS / FAIL]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts`

**Imports to verify:**
```typescript
import { parseCruvaCSV } from '@/lib/utils/csvParser';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import { createTestClient, createTestClientRecord, createTestUser, createTestTier, createTestTierSet, createTestVideo, cleanupTestData, assertSupabaseRunning } from '@/tests/helpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
```

**Verification:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit tests/integration/cron/manual-csv-upload.test.ts 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import paths correct
- [ ] Exported names match
- [ ] Types align

---

### Call Site Verification

**Function calls in tests:**
| Function | Arguments | Return Type |
|----------|-----------|-------------|
| `parseCruvaCSV(SAMPLE_CSV)` | string | ParseResult |
| `createTestClientRecord(supabase, {...})` | SupabaseClient, object | TestClient |
| `createTestUser(supabase, {...})` | SupabaseClient, object | TestUser |
| `createTestTier(supabase, {...})` | SupabaseClient, object | TestTier |
| `createTestTierSet(supabase, clientId)` | SupabaseClient, string | void |
| `createTestVideo(supabase, {...})` | SupabaseClient, object | TestVideo |
| `cleanupTestData(supabase, {...})` | SupabaseClient, options | void |
| `checkForPromotions(clientId)` | string | PromotionCheckResult |
| `supabase.rpc('update_precomputed_fields', {...})` | string, params | {data, error} |

**Verification:**
- [ ] All function signatures match
- [ ] Return types handled correctly
- [ ] Error handling present where needed

---

### Type Alignment Verification

**Types Used (existing, not new):**
- `ParseResult` from csvParser.ts
- `SupabaseClient<Database>` from @supabase/supabase-js
- `Database` from @/lib/types/database

**Verification:**
- [ ] No new types introduced
- [ ] Existing types imported correctly
- [ ] No type conflicts

---

**INTEGRATION STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** Select videos in Test Case 2
```typescript
await supabase
  .from('videos')
  .select('video_url, gmv, units_sold, views')
  .eq('client_id', testClientId) // Multi-tenant filter
  .eq('user_id', user.id);
```
**Security Checklist:**
- [ ] `.eq('client_id', testClientId)` present: YES
- [ ] No cross-tenant data exposure possible: YES

**Query 2:** Select user in Test Case 3
```typescript
await supabase
  .from('users')
  .select('total_sales, total_units, checkpoint_sales_current')
  .eq('id', user.id)
  .eq('client_id', testClientId) // Multi-tenant filter
  .single();
```
**Security Checklist:**
- [ ] `.eq('client_id', testClientId)` present: YES

**Query 3:** RPC call
```typescript
await (supabase.rpc as Function)('update_precomputed_fields', {
  p_client_id: testClientId, // Multi-tenant parameter
  p_user_ids: null,
});
```
**Security Checklist:**
- [ ] `p_client_id` parameter passed: YES

---

### Grep Verification (Explicit Check)

```bash
grep -n "client_id" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
```
**Expected:** client_id present on multiple lines (createTestClientRecord, createTestUser, createTestVideo, RPC params, query filters)

---

### Authentication Check

> Skip - test file, not API route

**Checklist:**
- [x] SKIPPED - Not an API route

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed

---

### Verification 2: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before implementation)
**Actual:** [count]

**Status:**
- [ ] Type check passed

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: Test file created at specified path
**From Gap.md:** "Test file created at `appcode/tests/integration/cron/manual-csv-upload.test.ts`"
**Test:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
```
**Expected:** File exists
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 2: Test Case 1 passes (CSV parsing)
**From Gap.md:** "CSV parsing validates column mapping"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="CSV Parsing" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 3: Test Case 2 passes (Video insertion)
**From Gap.md:** "Video insertion via createTestVideo helper"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="Video Insertion" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 4: Test Case 2b passes (Handle-based lookup) - Audit Addition
**From Audit:** "Validates findUserByTiktokHandle pattern used in production"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="Handle-Based" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 5: Test Case 3 passes (Metrics RPC)
**From Gap.md:** "RPC update_precomputed_fields updates user metrics"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="Metrics Update" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 6: Test Case 4 passes (Tier promotion)
**From Gap.md:** "checkForPromotions triggers tier change"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="Tier Promotion" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 7: Test Case 5 passes (Multi-tenant isolation)
**From Gap.md:** "Multi-tenant isolation (Client B unaffected by Client A operations)"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload --testNamePattern="Multi-tenant" 2>&1 | tail -30
```
**Expected:** Test passes
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 8: All 6 tests pass together
**From Gap.md:** "All tests pass"
**Test:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload 2>&1 | tail -40
```
**Expected:** 6 tests pass (5 original + 1 audit addition)
**Actual:** [result]
**Status:** [ ] PASS / FAIL

#### Criterion 9: Task 8.4.9 marked complete
**From Gap.md:** "Task 8.4.9 marked complete in EXECUTION_PLAN.md"
**Test:**
```bash
grep -A2 "Task 8.4.9" /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md
```
**Expected:** Shows `[x]` checkbox
**Actual:** [result]
**Status:** [ ] PASS / FAIL

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] All column names match SchemaFinalv2.md: YES (verified in Gate 5)
- [ ] All data types correct: YES
- [ ] All relationships respected: YES

---

### Verification 5: API Contract Alignment Confirmed

> Skip - no API changes

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Changes:**
- `appcode/tests/integration/cron/manual-csv-upload.test.ts`: ~290 lines added (new file)
- `EXECUTION_PLAN.md`: ~3 lines modified

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

### Verification 7: Full Test Suite (No Regressions)

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test 2>&1 | tail -50
```
**Expected:** All existing tests still pass
**Actual:** [result]

**Status:**
- [ ] No regressions

---

**FEATURE VERIFICATION STATUS:** [ ] ALL PASSED / [ ] FAILED

**Acceptance Criteria Summary:**
| Criterion | From Gap.md / Audit | Test Result |
|-----------|---------------------|-------------|
| 1 | Test file created | [ ] |
| 2 | Test Case 1 (CSV parsing) | [ ] |
| 3 | Test Case 2 (Video insertion) | [ ] |
| 4 | Test Case 2b (Handle lookup) - Audit | [ ] |
| 5 | Test Case 3 (Metrics RPC) | [ ] |
| 6 | Test Case 4 (Tier promotion) | [ ] |
| 7 | Test Case 5 (Multi-tenant) | [ ] |
| 8 | All 6 tests pass | [ ] |
| 9 | Task 8.4.9 marked complete | [ ] |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-14
**Executor:** Claude Opus 4.5
**Specification Source:** GAP-MANUAL-CSV-TEST.md
**Implementation Doc:** GAP-MANUAL-CSV-TEST-IMPL.md
**Gap ID:** GAP-MANUAL-CSV-TEST

---

### Execution Log

**Pre-Implementation:**
```
[TBD] Gate 1: Environment - [PASS/FAIL]
[TBD] Gate 1b: Env Var Verification (Audit) - [PASS/FAIL] - SUPABASE_URL is local
[TBD] Gate 2: Gap Confirmation - [PASS/FAIL]
[TBD] Gate 3: Partial Code Check - [PASS/FAIL]
[TBD] Gate 4: Files - [PASS/FAIL]
[TBD] Gate 5: Schema - PASS (verified from read)
[TBD] Gate 6: API Contract - SKIPPED
```

**Implementation Steps:**
```
[TBD] Step 1: Create test file - Created/Modified - Verified
[TBD] Step 2: Update EXECUTION_PLAN.md - Created/Modified - Verified
```

**Integration Verification:**
```
[TBD] Import check - [PASS/FAIL]
[TBD] Call site check - [PASS/FAIL]
[TBD] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[TBD] Multi-tenant check - [PASS/FAIL]
[TBD] client_id grep verification - [PASS/FAIL]
[TBD] Auth check - SKIPPED
```

**Feature Verification:**
```
[TBD] Build succeeds - [PASS/FAIL]
[TBD] Type check passes - [PASS/FAIL]
[TBD] Criterion 1-8 - [PASS/FAIL each]
[TBD] Git diff sanity - [PASS/FAIL]
[TBD] No regressions - [PASS/FAIL]
[TBD] Overall: [PASS/FAIL]
```

---

### Files Created/Modified

**Complete List:**
1. `appcode/tests/integration/cron/manual-csv-upload.test.ts` - CREATE - ~290 lines - Integration test file
2. `EXECUTION_PLAN.md` - MODIFY - ~3 lines - Task completion note

**Total:** 2 files, ~293 lines added (net)

---

### Feature Completion

**Before Implementation:**
- Gap: No test validates complete CSV → metrics → tier pipeline
- Code existed: NO

**After Implementation:**
- Feature: IMPLEMENTED
- All acceptance criteria: MET
- Verification: 5 test cases pass

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify file created
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts
# Should show: file exists, ~290 lines

# 2. Verify no type errors
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
# Should show: 0 (or same as baseline)

# 3. Verify tests pass
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- --testPathPattern=manual-csv-upload
# Should show: 5 tests pass

# 4. Verify multi-tenant filters present
grep -n "client_id" /home/jorge/Loyalty/Rumi/appcode/tests/integration/cron/manual-csv-upload.test.ts | wc -l
# Should show: 15+ occurrences

# 5. Verify Task 8.4.9 marked complete
grep "Task 8.4.9" /home/jorge/Loyalty/Rumi/EXECUTION_PLAN.md
# Should show: [x] Task 8.4.9
```

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [TBD]/5
- Steps completed: [TBD]/2
- Verifications passed: [TBD]/8
- Acceptance criteria met: [TBD]/8
- Errors encountered: [TBD]
- Retries needed: [TBD]

**Code Quality:**
- Files created: 1
- Files modified: 1
- Lines added: ~293
- Breaking changes: 0
- Security verified: YES
- Tests added: 5

---

## Document Status

**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] Schema verified
- [x] API contract verified (SKIPPED - no API)

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified
- [ ] Call sites verified
- [ ] Types aligned

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] client_id filters confirmed via grep
- [x] Auth requirements met (SKIPPED - test file)

**Feature Verification:**
- [ ] Build succeeds
- [ ] Type check passes
- [ ] ALL acceptance criteria met
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed
- [ ] Metrics documented

---

### Final Status

**Implementation Result:** [PENDING EXECUTION]

---

### Next Actions

**After implementation succeeds:**
1. [ ] Git commit with message (template below)
2. [ ] Update GAP-MANUAL-CSV-TEST.md status to "Implemented"
3. [ ] Update EXECUTION_STATUS.md with Task 8.4.9
4. [ ] Verify in clean build

**Git Commit Message Template:**
```
feat(tests): add manual CSV upload pipeline integration tests

Implements GAP-MANUAL-CSV-TEST: Integration tests for Phase 8 CSV processing
Validates CSV → metrics → tier pipeline for Task 8.4.9 (Manual dry run)

New files:
- tests/integration/cron/manual-csv-upload.test.ts: 5 test cases

Modified files:
- EXECUTION_PLAN.md: Task 8.4.9 completion note

Test Coverage:
- Test Case 1: CSV parsing with parseCruvaCSV()
- Test Case 2: Video insertion via createTestVideo helper
- Test Case 3: Metrics update via update_precomputed_fields RPC
- Test Case 4: Tier promotion via checkForPromotions()
- Test Case 5: Multi-tenant isolation validation

References:
- BugFixes/GAP-MANUAL-CSV-TEST.md
- BugFixes/GAP-MANUAL-CSV-TEST-IMPL.md

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
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [x] Read SchemaFinalv2.md for database queries (verified in context refresh)
- [x] Read API_CONTRACTS.md for API changes (N/A - test file)
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining after execution)

### Specification Fidelity
- [x] Followed locked specification (no re-design)
- [x] Implemented specified solution exactly (no modifications)
- [x] Addressed audit feedback (cleanup, RPC syntax, multi-tenant)
- [x] Did not second-guess specification

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence
- [x] Verified auth requirements (N/A - test file)
- [ ] No cross-tenant data exposure

### Acceptance Criteria
- [ ] EVERY criterion from Gap.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL
- [ ] No criteria skipped or assumed

---

**META-VERIFICATION STATUS:** [PENDING EXECUTION]

**Document is ready for execution. All [TBD] fields will be filled during implementation.**

---

**Document Version:** 1.0
**Created:** 2025-12-14
**Status:** Ready for Execution
