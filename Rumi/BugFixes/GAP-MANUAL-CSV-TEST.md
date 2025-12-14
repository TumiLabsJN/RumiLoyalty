# Manual CSV Upload Test - Gap Documentation

**ID:** GAP-MANUAL-CSV-TEST
**Type:** Feature Gap
**Created:** 2025-12-14
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 8.4.9 from EXECUTION_PLAN.md (Manual dry run)
**Linked Issues:** Prerequisite for Task 12.22.5 (Manual Upload Service)

---

## Priority Justification

**High Priority** because:
- Task 8.4.9 requires validation that Phase 8 CSV processing helpers work end-to-end
- Without live CRUVA sales data, this is the only way to test the complete pipeline
- Validates foundation that Task 12.22.5 (Phase 12) will build upon
- Business continuity: Manual upload is the fallback when automation fails

---

## 1. Project Context

This is a creator loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system syncs sales data from CRUVA (TikTok Shop analytics) daily, updates creator metrics, and manages tier-based rewards. The daily automation pipeline downloads CSV from CRUVA, parses it, updates video records, recalculates user metrics, and triggers tier promotions.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with RPC functions for bulk operations

---

## 2. Gap/Enhancement Summary

**What's missing:** An integration test that validates the complete CSV-to-metrics pipeline by feeding a sample CSV directly to the Phase 8 helpers, bypassing the CRUVA Puppeteer download step.

**What should exist:** A test file `manual-csv-upload.test.ts` that:
1. Creates sample CSV data matching CRUVA format
2. Parses it using `parseCruvaCSV()`
3. Inserts videos into the database
4. Calls RPC `update_precomputed_fields` to update user metrics
5. Calls `checkForPromotions()` to verify tier changes
6. Validates the entire pipeline produces correct results

**Why it matters:**
- Task 8.4.9 requires manual verification but CRUVA has no live sales data yet
- This test validates Phase 8 helpers work correctly before Phase 12 builds the admin upload service
- Ensures CSV → database → metrics → tier pipeline is correct

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **EXECUTION_PLAN.md** | Task 8.4.9 (lines 1547-1551) | "Manual dry run" requires: seed data, create test CSV, call cron, verify sync_logs/sales_adjustments/user metrics/tier changes |
| **EXECUTION_PLAN.md** | Task 12.22.5 (lines 2714-2718) | Manual upload service "MUST reuse Phase 8 CSV processing helpers" - confirms Phase 8 helpers are foundation |
| **Loyalty.md** | Flow 1: Daily Metrics Sync (lines 410-464) | 5-step pipeline: Download CSV → Parse → Process videos → Update precomputed fields → Update missions |
| **Loyalty.md** | Manual CSV Upload Fallback (lines 1996-2016) | "Same CSV processing logic as automated sync (reuses existing code)" - confirms test should use same helpers |
| **csvParser.ts** | CRUVA_COLUMN_MAP (lines 24-35) | 10 CSV columns: Handle, Video, Views, Likes, Comments, GMV, CTR, Units Sold, Post Date, Video Title |
| **csvParser.ts** | parseCruvaCSV function (lines 70-140) | Pure function that parses CSV string/Buffer → ParseResult with rows, errors, counts |
| **SchemaFinalv2.md** | videos table (lines 227-251) | Per-video granular table with video_url as UNIQUE key, gmv, units_sold, views, likes, comments |
| **SchemaFinalv2.md** | users precomputed fields (lines 142-147) | 16 precomputed fields including total_sales, checkpoint_sales_current, total_units, etc. |
| **syncRepository.ts** | upsertVideo (lines 112-150) | Uses video_url as unique key with onConflict upsert |
| **syncRepository.ts** | findUserByTiktokHandle (line 212) | Matches CSV Handle column to user |
| **Phase 8 RPC migration** | update_precomputed_fields (lines 18-55) | RPC function that aggregates videos → users precomputed fields |
| **daily-automation-metrics.test.ts** | Test patterns (lines 1-80) | Existing test pattern: createTestClient, createTestUser, createTestVideo, call RPC, verify |
| **tests/helpers/index.ts** | Exported helpers (lines 24-40) | Available: createTestClientRecord, createTestUser, createTestTier, createTestVideo, cleanupTestData |

### Key Evidence

**Evidence 1:** Task 8.4.9 requires manual verification of full pipeline
- Source: EXECUTION_PLAN.md, Task 8.4.9 (line 1550)
- Quote: "MUST perform manual verification: (1) seed test client, tiers, users, rewards in Supabase test/staging, (2) create test CSV with sales for known users..."
- Implication: No automated test exists to validate this flow

**Evidence 2:** Phase 12 depends on Phase 8 helpers working correctly
- Source: EXECUTION_PLAN.md, Task 12.22.5 (line 2717)
- Quote: "MUST reuse Phase 8 CSV processing helpers for consistency with automated sync"
- Implication: Phase 8 helpers must be validated before Phase 12 builds on them

**Evidence 3:** Manual upload uses same logic as automated sync
- Source: Loyalty.md, line 2000
- Quote: "Same CSV processing logic as automated sync (reuses existing code)"
- Implication: Testing the helpers validates both automated and manual paths

**Evidence 4:** Pure parsing function exists and can be tested directly
- Source: csvParser.ts, line 70
- Function: `parseCruvaCSV(csvContent: string | Buffer): ParseResult`
- Implication: Can create sample CSV string and parse it without CRUVA

---

## 4. Business Justification

**Business Need:** Validate that CSV data correctly flows through the system to update creator metrics and tier status.

**User Stories:**
1. As a developer, I need to verify the CSV parsing and processing pipeline works correctly so that when Phase 12 builds the admin upload service, it has a solid foundation.
2. As an admin, I need confidence that manual CSV uploads will produce the same results as automated syncs so that business continuity is maintained during automation failures.

**Impact if NOT implemented:**
- Cannot verify Task 8.4.9 acceptance criteria without live CRUVA data
- Phase 12 Task 12.22.5 builds on unvalidated foundation
- First real data sync could reveal bugs in metrics calculation
- Manual upload fallback path untested until production use

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `appcode/lib/utils/csvParser.ts`
```typescript
// Pure function that parses CSV - CAN be tested directly
export function parseCruvaCSV(csvContent: string | Buffer): ParseResult {
  // Parses CSV with CRUVA column headers
  // Returns { success, rows, errors, totalRows, skippedRows }
}

export const CRUVA_COLUMN_MAP: Record<string, string> = {
  'Handle': 'tiktok_handle',
  'Video': 'video_url',
  'Views': 'views',
  'GMV': 'gmv',
  // ... 10 columns total
};
```

**File:** `supabase/migrations/20251211163010_add_phase8_rpc_functions.sql`
```sql
-- RPC function that updates user precomputed fields from videos
CREATE OR REPLACE FUNCTION update_precomputed_fields(
  p_client_id UUID,
  p_user_ids UUID[] DEFAULT NULL
) RETURNS INTEGER
-- Updates: total_sales, total_units, checkpoint_sales_current, etc.
```

**File:** `appcode/tests/helpers/index.ts`
```typescript
// Test helpers already available
export { createTestClientRecord, createTestUser, createTestTier, createTestVideo, cleanupTestData };
```

**Current Capability:**
- ✅ Can parse CSV with `parseCruvaCSV()`
- ✅ Can insert videos with test helpers
- ✅ Can update metrics via RPC `update_precomputed_fields`
- ✅ Can check tier promotions via `checkForPromotions()`
- ❌ No test validates the complete CSV → metrics → tier pipeline

#### Current Data Flow (Automated Sync)

```
CRUVA Website → Puppeteer Download → CSV File → parseCruvaCSV() →
  → findUserByTiktokHandle() → upsertVideo() →
  → update_precomputed_fields RPC → checkForPromotions()
```

**Gap:** No way to test steps 3-6 without steps 1-2 (CRUVA download)

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Create an integration test that simulates the manual CSV upload flow by:
1. Generating a sample CSV string with known values
2. Parsing it with `parseCruvaCSV()` (validates parsing)
3. Inserting videos directly (simulating upsertVideo behavior)
4. Calling `update_precomputed_fields` RPC (validates metrics)
5. Calling `checkForPromotions()` (validates tier logic)
6. Asserting expected outcomes

#### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

**New File:** `appcode/tests/integration/cron/manual-csv-upload.test.ts`

```typescript
// SPECIFICATION - TO BE IMPLEMENTED
/**
 * Integration Tests for Manual CSV Upload Pipeline
 *
 * Validates Phase 8 CSV processing helpers work correctly when
 * fed CSV data directly (simulating manual upload scenario).
 *
 * Acceptance Criteria Mapping:
 * - Test 1 → Validates parseCruvaCSV() column mapping and data types
 * - Test 2 → Validates video insertion with createTestVideo helper
 * - Test 3 → Validates update_precomputed_fields RPC updates user metrics
 * - Test 4 → Validates checkForPromotions() triggers tier change
 * - Test 5 → Validates client_id isolation (multi-tenant)
 *
 * Design Decisions:
 * - Uses createTestVideo helper (not direct insert) for consistency with existing tests
 * - All DB operations scoped by .eq('client_id', testClientId)
 * - afterEach cleanup via cleanupTestData(supabase, { clientIds: [testClientId] })
 * - RPC called via (supabase.rpc as Function)('update_precomputed_fields', params)
 */

import { parseCruvaCSV, ParsedVideoRow } from '@/lib/utils/csvParser';
import { checkForPromotions } from '@/lib/services/tierCalculationService';
import {
  createTestClient,
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
  // Acceptance: Parse CSV string → correct ParseResult with typed rows
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
  // Acceptance: Parsed rows → videos table with correct data
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
  // Test Case 3: Metrics update via RPC (validates update_precomputed_fields)
  // Acceptance: After video insert → user.total_sales = SUM(videos.gmv)
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
  // Acceptance: User crosses threshold → current_tier updated
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
  // Acceptance: Operations on client A do NOT affect client B
  // ==========================================================================
  describe('Test Case 5: Multi-tenant Isolation', () => {
    it('should only affect videos/users for specified client_id', async () => {
      // SETUP: Create two separate clients
      const clientA = await createTestClientRecord(supabase, {
        name: 'Client A',
        vip_metric: 'sales',
      });
      const clientAId = clientA.id;

      const clientB = await createTestClientRecord(supabase, {
        name: 'Client B',
        vip_metric: 'sales',
      });
      const clientBId = clientB.id;

      // Use clientA for cleanup tracking
      testClientId = clientAId;

      // Create users in each client
      const userA = await createTestUser(supabase, {
        client_id: clientAId,
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
        client_id: clientAId,
        user_id: userA.id,
        video_url: 'https://tiktok.com/clientA-video',
        gmv: 1000.00,
      });

      // Call RPC for Client A only
      await (supabase.rpc as Function)('update_precomputed_fields', {
        p_client_id: clientAId,
        p_user_ids: null,
      });

      // ASSERT: Client A's user updated
      const { data: userAAfter } = await supabase
        .from('users')
        .select('total_sales')
        .eq('id', userA.id)
        .eq('client_id', clientAId)
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

      // Cleanup Client B manually
      await cleanupTestData(supabase, { clientIds: [clientBId] });
    });
  });
});
```

**Explanation:** This test validates the complete pipeline that Task 12.22.5 will use. By testing with a hardcoded CSV string, we bypass the CRUVA download step while validating all downstream processing.

#### New Types/Interfaces

No new types needed - uses existing `ParseResult`, `ParsedVideoRow` from csvParser.ts.

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `tests/integration/cron/manual-csv-upload.test.ts` | CREATE | New test file with 5+ test cases |
| `EXECUTION_PLAN.md` | MODIFY | Add completion note to Task 8.4.9 |

#### Dependency Graph

```
[existing] csvParser.ts
├── exports: parseCruvaCSV, ParseResult, ParsedVideoRow, CRUVA_COLUMN_MAP
└── used by: NEW manual-csv-upload.test.ts

[existing] tierCalculationService.ts
├── exports: checkForPromotions
└── used by: NEW manual-csv-upload.test.ts

[existing] tests/helpers/index.ts
├── exports: createTestClient, createTestUser, createTestTierSet, cleanupTestData
└── used by: NEW manual-csv-upload.test.ts

[existing] RPC update_precomputed_fields
├── called via: supabase.rpc('update_precomputed_fields', {p_client_id})
└── used by: NEW manual-csv-upload.test.ts

[NEW] tests/integration/cron/manual-csv-upload.test.ts (TO BE CREATED)
├── imports from: csvParser.ts, tierCalculationService.ts, tests/helpers
└── exports: test suite validating CSV → metrics → tier pipeline
```

---

## 8. Data Flow After Implementation

```
[Sample CSV String] → [parseCruvaCSV()] → [ParseResult with rows]
         ↓                    ↓                     ↓
   Hardcoded test data    Pure function      {rows: ParsedVideoRow[]}
                                                     ↓
                              [Insert videos via test client]
                                                     ↓
                              [supabase.from('videos').insert()]
                                                     ↓
                              [Call RPC update_precomputed_fields]
                                                     ↓
                              [User.total_sales, total_units updated]
                                                     ↓
                              [Call checkForPromotions()]
                                                     ↓
                              [Tier promotion if threshold crossed]
                                                     ↓
                              [ASSERT: Expected values match]
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `clients` | id, vip_metric | Test client setup, determines sales vs units mode |
| `users` | id, tiktok_handle, total_sales, total_units, current_tier, client_id | User lookup, metrics verification |
| `videos` | id, user_id, client_id, video_url, gmv, units_sold, views, likes, comments, post_date | Video insertion from CSV |
| `tiers` | id, client_id, tier_id, sales_threshold, units_threshold | Tier promotion thresholds |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| Insert videos | Yes - videos.client_id | [ ] |
| Update precomputed fields | Yes - p_client_id parameter to RPC | [ ] |
| Check promotions | Yes - clientId parameter | [ ] |
| Query users | Yes - users.client_id | [ ] |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | This is a test file, no API changes |

#### Breaking Changes?
- [x] No - additive changes only (new test file)

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records processed | 3-10 rows per test | Yes |
| Query complexity | O(n) for video inserts | Yes |
| Frequency | On-demand (test runs) | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP (test file, not production code)

---

## 12. Alternative Solutions Considered

#### Option A: Call syncRepository functions directly
- **Description:** Import and call syncRepository.upsertVideo() etc. directly
- **Pros:** Tests actual repository code
- **Cons:** syncRepository uses createAdminClient() which reads from env vars pointing to production
- **Verdict:** ❌ Rejected - environment variable issue

#### Option B: Use test client with direct DB operations (Selected)
- **Description:** Use createTestClient() from test helpers, insert videos directly, call RPC via test client
- **Pros:** Follows existing test patterns (daily-automation-metrics.test.ts), bypasses env var issue
- **Cons:** Doesn't test syncRepository.upsertVideo() function directly
- **Verdict:** ✅ Selected - consistent with existing tests, validates same logic path

#### Option C: Mock createAdminClient
- **Description:** Jest mock createAdminClient to return test client
- **Pros:** Would test actual repository code
- **Cons:** Complex mock setup, fragile to implementation changes
- **Verdict:** ❌ Rejected - unnecessary complexity

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSV format differs from production | Low | Medium | Use documented CRUVA_COLUMN_MAP exactly |
| RPC function not available locally | Low | High | Verify migrations applied before test |
| Test passes but production fails | Low | Medium | Test validates same logic path as production |

---

## 14. Testing Strategy

#### Unit Tests

Not applicable - this IS a test file.

#### Integration Tests

See Section 6 for complete, executable test specification. Tests follow existing pattern from `daily-automation-metrics.test.ts`.

#### Manual Verification Steps

1. [ ] Run `npx supabase start` to ensure local DB running
2. [ ] Verify RPC exists: `SELECT proname FROM pg_proc WHERE proname = 'update_precomputed_fields';`
3. [ ] Run `npm test -- --testPathPattern=manual-csv-upload`
4. [ ] Verify all 5 tests pass
5. [ ] Check Supabase Studio to confirm test data cleaned up

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [ ] Verify local Supabase is running: `npx supabase status`
- [ ] Confirm RPC migration applied: Check for `update_precomputed_fields` in Supabase
- [ ] Confirm test helpers work: `npm test -- --testPathPattern=daily-automation-metrics --testNamePattern="Test Case 1"`

#### Implementation Steps

**Step 1:** Create test file structure
- File: `appcode/tests/integration/cron/manual-csv-upload.test.ts`
- Action: CREATE
- Copy specification from Section 6 exactly

**Step 2:** Verify imports resolve
- `parseCruvaCSV` from `@/lib/utils/csvParser`
- `checkForPromotions` from `@/lib/services/tierCalculationService`
- All helpers from `@/tests/helpers`

**Step 3:** Run type check
- Command: `npx tsc --noEmit`
- Expected: 0 errors

**Step 4:** Run tests
- Command: `npm test -- --testPathPattern=manual-csv-upload`
- Expected: 5 tests pass

#### Key Implementation Details (Answers to Audit Questions)

**Q1: How to insert parsed CSV rows?**
- Use `createTestVideo` helper (not direct insert)
- Pattern: Parse CSV → filter rows by tiktok_handle → call `createTestVideo` for each
- All inserts include `client_id: testClientId` for multi-tenant scoping

**Q2: Cleanup strategy?**
- `afterEach` calls `cleanupTestData(supabase, { clientIds: [testClientId] })`
- Test Case 5 also cleans up Client B manually: `await cleanupTestData(supabase, { clientIds: [clientBId] })`
- Pattern matches existing tests in `daily-automation-metrics.test.ts`

**Q3: RPC invocation?**
- Signature: `(supabase.rpc as Function)('update_precomputed_fields', { p_client_id: testClientId, p_user_ids: null })`
- Cast needed because RPC may not be in generated types
- Returns row count (INTEGER)

**Q4: Multi-tenant scoping?**
- All `.select()` queries include `.eq('client_id', testClientId)`
- All `createTestVideo` calls include `client_id: testClientId`
- RPC takes `p_client_id` parameter and filters internally

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test -- --testPathPattern=manual-csv-upload`
- [ ] Run full test suite to ensure no regressions: `npm test`
- [ ] Update EXECUTION_PLAN.md Task 8.4.9 with completion note

---

## 16. Definition of Done

- [ ] Test file created at `appcode/tests/integration/cron/manual-csv-upload.test.ts`
- [ ] Test Case 1 passes: CSV parsing validates column mapping
- [ ] Test Case 2 passes: Video insertion via createTestVideo helper
- [ ] Test Case 3 passes: RPC update_precomputed_fields updates user metrics
- [ ] Test Case 4 passes: checkForPromotions triggers tier change
- [ ] Test Case 5 passes: Multi-tenant isolation (Client B unaffected by Client A operations)
- [ ] Type checker passes: `npx tsc --noEmit` returns 0 errors
- [ ] All existing tests still pass: `npm test` shows no regressions
- [ ] Task 8.4.9 marked complete in EXECUTION_PLAN.md with note: "Validated Phase 8 CSV processing helpers via manual-csv-upload.test.ts - ready for Task 12.22.5"
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| EXECUTION_PLAN.md | Task 8.4.9, Task 12.22.5 | Task definitions and requirements |
| Loyalty.md | Flow 1 (lines 410-464), Manual Upload (lines 1996-2016) | Business logic and pipeline specification |
| SchemaFinalv2.md | videos table (227-251), users fields (142-147) | Database schema for validation |
| csvParser.ts | Full file | Parsing function to test |
| syncRepository.ts | upsertVideo, findUserByTiktokHandle | Repository patterns (reference only) |
| Phase 8 RPC migration | update_precomputed_fields | RPC function to call |
| daily-automation-metrics.test.ts | Test patterns | Existing test patterns to follow |
| tests/helpers/index.ts | Exported helpers | Available test utilities |

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
