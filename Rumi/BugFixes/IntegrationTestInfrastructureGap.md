# Integration Test Infrastructure - Gap Documentation

**ID:** GAP-INT-TEST-INFRA-001
**Type:** Feature Gap
**Created:** 2025-12-14
**Status:** Analysis Complete
**Priority:** High (blocks Phase 8.4 integration testing)
**Related Tasks:** Task 8.4.3 from EXECUTION_PLAN.md (Test daily automation updates user metrics)
**Linked Issues:** ENH-MIGRATION-NAMING-001 (prerequisite - completed)

---

## 1. Project Context

Rumi is a multi-tenant loyalty platform for TikTok creators built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The project follows Repository → Service → Route architectural layers per ARCHITECTURE.md. Testing strategy per TestingStrategy.md mandates 70% integration tests against real database with actual RLS policies.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL, Jest
**Architecture Pattern:** Repository → Service → Route layers (per ARCHITECTURE.md)

---

## 2. Gap/Enhancement Summary

**What's missing:** Infrastructure for running integration tests against local Supabase instance. Specifically:
1. Test client that connects to local Supabase (port 54321) instead of remote
2. Video factory function for creating test video records
3. Centralized cleanup utility for integration tests

**What should exist:**
1. `tests/helpers/testClient.ts` - Supabase client for local dev instance
2. Video factory in existing `tests/fixtures/factories.ts`
3. `tests/helpers/cleanup.ts` - Batch cleanup by client_id

**Why it matters:** Task 8.4.3-8.4.9 require true integration tests that:
- Create real database records (clients, users, videos)
- Call actual service functions (processDailySales, RPCs)
- Verify precomputed fields are updated correctly
- Cannot be done with mocks (current approach in Task 8.4.1-8.4.2)

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| EXECUTION_PLAN.md | Task 8.4.1 lines 1475-1480 | Specifies "import factories, beforeEach: create test client...tiers...users, afterEach: cleanupTestData()" |
| EXECUTION_PLAN.md | Task 8.4.3 lines 1490-1496 | Requires "create user with checkpoint_sales_current=500...create videos records...call processDailySales...query users" |
| TestingStrategy.md | Lines 1-15 (Executive Summary) | "70% integration tests...Test database using Supabase local dev - Tests run against real PostgreSQL with actual RLS policies" |
| TestingStrategy.md | Lines 79-112 (Integration Tests) | Shows example with `seedTestData(supabase)` and `cleanupTestData(supabase)` |
| TestingStrategy.md | Lines 94-98 | References `@/tests/fixtures/testData` for seed/cleanup functions |
| ARCHITECTURE.md | Section 8 (Testing Strategy) | Specifies test structure and patterns |
| SchemaFinalv2.md | Lines 142-147 | Users precomputed fields (16 fields) to be tested |
| SchemaFinalv2.md | Lines 227-251 | Videos table schema - need factory for this |
| jest.config.js | moduleNameMapper | `'^@/(.*)$': '<rootDir>/$1'` - path alias for tests |
| tests/fixtures/factories.ts | Lines 1-857 | Existing factories: createTestClient, createTestUser, createTestTier, createTestOtp, createTestMission, createTestMissionProgress - NO video factory |
| tests/fixtures/factories.ts | Lines 48-63 | Uses `process.env.SUPABASE_URL` from .env.local (remote), NOT local Supabase |
| supabase/config.toml | Full config | Local Supabase configured on port 54321 (API), 54322 (DB) |
| npx supabase start output | Runtime | Confirms local ports: API=54321, DB=54322, Studio=54323 |

### Key Evidence

**Evidence 1:** EXECUTION_PLAN.md Task 8.4.1 explicitly requires factory and cleanup infrastructure
```
(1) import factories, (2) beforeEach: create test client with vip_metric, create tiers with thresholds,
create users with checkpoint values, create enabled missions with tier_eligibility,
(3) afterEach: cleanupTestData()
```
- Source: EXECUTION_PLAN.md lines 1477-1478
- Implication: Tests MUST use factories and cleanup, not mocks

**Evidence 2:** TestingStrategy.md mandates real database testing
```
Test database using Supabase local dev - Tests run against real PostgreSQL with actual RLS policies,
triggers, and constraints
```
- Source: TestingStrategy.md line 9
- Implication: Local Supabase client required, remote won't work for isolated testing

**Evidence 3:** Existing factories.ts uses remote Supabase, not local
```typescript
// tests/fixtures/factories.ts lines 48-62
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;  // ← Remote URL from .env.local
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // ...
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}
```
- Source: tests/fixtures/factories.ts lines 48-62
- Implication: Cannot use existing factories for local testing

**Evidence 4:** No video factory exists
```bash
$ grep -n "Video\|video" tests/fixtures/factories.ts
# (no output)
```
- Source: grep search on factories.ts
- Implication: Task 8.4.3 requires creating videos, but no factory exists

**Evidence 5:** Task 8.4.3 requires video creation for metrics testing
```
(2) create videos records: 3 videos totaling $300 GMV, 5 units_sold, 1000 views, 50 likes, 10 comments
```
- Source: EXECUTION_PLAN.md line 1493
- Implication: Video factory is required

---

## 4. Business Justification

**Business Need:** Enable true integration testing against local Supabase to verify daily automation correctly updates user precomputed fields, preventing stale dashboard data and incorrect tier calculations.

**User Stories:**
1. As a developer, I need to test that processDailySales updates checkpoint_sales_current so that creators see accurate progress
2. As a developer, I need to test video aggregation (views, likes, comments) so that engagement metrics are correct
3. As a developer, I need cleanup utilities so that tests don't pollute each other

**Impact if NOT implemented:**
- Cannot complete Task 8.4.3-8.4.9 (Phase 8 blocked)
- Risk of shipping untested precomputed field logic
- "Stale dashboard data catastrophic bug" (per EXECUTION_PLAN.md Task 8.4.3 Acceptance Criteria)
- Creators may see incorrect sales, units, or tier progress

---

## 5. Current State Analysis

#### What Currently Exists

**File:** `tests/fixtures/factories.ts` (857 lines)
```typescript
// Existing factories:
export async function createTestClient(options): Promise<{ client: TestClient; cleanup: () => Promise<void> }>
export async function createTestUser(options): Promise<{ user: TestUser; cleanup: () => Promise<void> }>
export async function createTestTier(options): Promise<{ tier: TestTier; cleanup: () => Promise<void> }>
export async function createTestOtp(options): Promise<{ otp: TestOtp; cleanup: () => Promise<void> }>
export async function createTestMission(options): Promise<{ mission: TestMission; cleanup: () => Promise<void> }>
export async function createTestMissionProgress(options): Promise<{ missionProgress: TestMissionProgress; cleanup: () => Promise<void> }>

// Uses remote Supabase:
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;  // Remote
  // ...
}
```

**File:** `jest.config.js`
```javascript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**Current Capability:**
- ✅ Can create test clients, users, tiers, missions, mission_progress
- ✅ Each factory returns cleanup function
- ✅ Jest configured with path alias
- ❌ Cannot create test videos (no factory)
- ❌ Cannot test against local Supabase (uses remote)
- ❌ No batch cleanup by client_id

#### Current Data Flow

```
Test File
   ↓
tests/fixtures/factories.ts
   ↓
getSupabaseClient() → process.env.SUPABASE_URL (remote)
   ↓
Remote Supabase Database
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach
1. Create `tests/helpers/testClient.ts` with local Supabase connection (ports from `npx supabase start`)
2. Add `createTestVideo` factory to existing `tests/fixtures/factories.ts`
3. Create `tests/helpers/cleanup.ts` with batch cleanup by client_id
4. Create `tests/helpers/index.ts` barrel export

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

#### New Files to Create

**New File 1:** `tests/helpers/testClient.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Local Supabase ports from `npx supabase start`
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export function createTestClient(): SupabaseClient<Database> {
  return createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function assertSupabaseRunning(): Promise<void> {
  const client = createTestClient();
  const { error } = await client.from('clients').select('id').limit(1);
  if (error?.message.includes('ECONNREFUSED')) {
    throw new Error('Local Supabase not running. Start with: npx supabase start');
  }
}
```

**Explanation:** Provides hardcoded local Supabase credentials (standard for all local instances). Separate from existing factories to avoid breaking remote tests.

**New File 2:** `tests/helpers/cleanup.ts`
```typescript
// SPECIFICATION - TO BE IMPLEMENTED
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

export async function cleanupTestData(
  supabase: SupabaseClient<Database>,
  options: { clientIds: string[] }
): Promise<void> {
  for (const clientId of options.clientIds) {
    // Delete in FK order (leaf tables first)
    await supabase.from('videos').delete().eq('client_id', clientId);
    await supabase.from('mission_progress').delete().eq('client_id', clientId);
    await supabase.from('redemptions').delete().eq('client_id', clientId);
    await supabase.from('users').delete().eq('client_id', clientId);
    await supabase.from('tiers').delete().eq('client_id', clientId);
    await supabase.from('missions').delete().eq('client_id', clientId);
    await supabase.from('clients').delete().eq('id', clientId);
  }
}
```

**Explanation:** Batch cleanup by client_id respecting FK constraints. Deletes all related data for test isolation.

#### Code to Add to Existing File

**File:** `tests/fixtures/factories.ts` (ADD after line 570)
```typescript
// SPECIFICATION - TO BE ADDED

export interface TestVideo {
  id: string;
  clientId: string;
  userId: string;
  videoUrl: string;
  gmv: number;
  unitsSold: number;
  views: number;
  likes: number;
  comments: number;
}

export async function createTestVideo(options: {
  clientId: string;
  userId: string;
  videoUrl?: string;
  postDate?: string;
  gmv?: number;
  unitsSold?: number;
  views?: number;
  likes?: number;
  comments?: number;
}): Promise<{ video: TestVideo; cleanup: () => Promise<void> }> {
  const supabase = getSupabaseClient();
  const id = randomUUID();
  const videoUrl = options.videoUrl || `https://tiktok.com/video/${id.slice(0, 8)}`;

  const { error } = await supabase.from('videos').insert({
    id,
    client_id: options.clientId,
    user_id: options.userId,
    video_url: videoUrl,
    video_title: 'Test Video',
    post_date: options.postDate || new Date().toISOString().split('T')[0],
    gmv: options.gmv ?? 50.00,
    units_sold: options.unitsSold ?? 2,
    views: options.views ?? 100,
    likes: options.likes ?? 10,
    comments: options.comments ?? 5,
    ctr: 2.5,
    sync_date: new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to create test video: ${error.message}`);

  const video: TestVideo = {
    id,
    clientId: options.clientId,
    userId: options.userId,
    videoUrl,
    gmv: options.gmv ?? 50.00,
    unitsSold: options.unitsSold ?? 2,
    views: options.views ?? 100,
    likes: options.likes ?? 10,
    comments: options.comments ?? 5,
  };

  const cleanup = async () => {
    await supabase.from('videos').delete().eq('id', id);
  };

  return { video, cleanup };
}
```

**Explanation:** Follows existing factory pattern with cleanup function. Includes all video metrics per SchemaFinalv2.md lines 227-251.

---

## 7. Integration Points

#### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `tests/helpers/testClient.ts` | CREATE | Local Supabase client |
| `tests/helpers/cleanup.ts` | CREATE | Batch cleanup utility |
| `tests/helpers/index.ts` | CREATE | Barrel export |
| `tests/fixtures/factories.ts` | MODIFY | Add createTestVideo factory (~60 lines) |

#### Dependency Graph

```
tests/integration/cron/daily-automation-metrics.test.ts (TO BE CREATED - Task 8.4.3)
├── imports from: tests/helpers/testClient.ts (NEW)
├── imports from: tests/helpers/cleanup.ts (NEW)
└── imports from: tests/fixtures/factories.ts (EXISTING + video factory)

tests/helpers/testClient.ts (NEW)
├── imports from: @supabase/supabase-js
└── exports: createTestClient, assertSupabaseRunning

tests/helpers/cleanup.ts (NEW)
├── imports from: @supabase/supabase-js
└── exports: cleanupTestData

tests/fixtures/factories.ts (EXISTING)
├── imports from: @supabase/supabase-js
└── exports: createTestClient, createTestUser, createTestTier, createTestVideo (NEW)
```

---

## 8. Data Flow After Implementation

```
Test File (daily-automation-metrics.test.ts)
   ↓
beforeAll: assertSupabaseRunning()
   ↓
beforeEach: createTestClient() + createTestUser() + createTestVideo()
   ↓
tests/helpers/testClient.ts
   ↓
Local Supabase (http://127.0.0.1:54321)
   ↓
afterEach: cleanupTestData({ clientIds: [testClientId] })
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| clients | id, name, vip_metric | Create test client |
| users | id, client_id, checkpoint_sales_current, checkpoint_units_current, etc. | Create test users with precomputed fields |
| tiers | id, client_id, tier_order, sales_threshold | Create tier structure |
| videos | id, client_id, user_id, gmv, units_sold, views, likes, comments | Create test videos for aggregation |

#### Schema Changes Required?
- [x] No - existing schema supports this feature

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| cleanupTestData - delete videos | Yes | [ ] |
| cleanupTestData - delete users | Yes | [ ] |
| cleanupTestData - delete tiers | Yes | [ ] |
| cleanupTestData - delete clients | Yes (by id) | [ ] |
| createTestVideo - insert | Yes | [ ] |

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | N/A |

#### Breaking Changes?
- [x] No - test infrastructure only, no API changes

---

## 11. Performance Considerations

#### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Records created per test | ~10-20 | Yes |
| Cleanup time | <100ms | Yes |
| Test suite execution | ~30-60s | Yes |

#### Optimization Needed?
- [x] No - acceptable for test infrastructure

---

## 12. Alternative Solutions Considered

#### Option A: Extend existing factories.ts only
- **Description:** Add local Supabase support to existing factories.ts
- **Pros:** Single file, no new files
- **Cons:** Risk of breaking existing remote tests, mixes concerns
- **Verdict:** ❌ Rejected - separation of concerns is cleaner

#### Option B: Create separate helpers + extend factories (Selected)
- **Description:** New helpers directory for local client/cleanup, add video factory to existing factories
- **Pros:** Clean separation, existing tests unaffected, follows TestingStrategy.md pattern
- **Cons:** One more directory
- **Verdict:** ✅ Selected - aligns with documented patterns

#### Option C: Use Docker test containers
- **Description:** Spin up fresh Supabase per test run
- **Pros:** Complete isolation
- **Cons:** Slow startup (~30s), complex, already have local Supabase
- **Verdict:** ❌ Rejected - overkill when local Supabase works

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Local Supabase not running | Medium | High | assertSupabaseRunning() fails fast with clear error |
| Tests pollute each other | Low | Medium | afterEach cleanup by client_id |
| FK constraint errors on cleanup | Low | Low | Delete in correct order (leaf tables first) |
| Path alias not resolving | Low | Low | Jest moduleNameMapper already configured |

---

## 14. Testing Strategy

#### Unit Tests
N/A - This IS test infrastructure

#### Integration Tests

```typescript
// tests/integration/helpers/test-infrastructure.test.ts
describe('Test Infrastructure', () => {
  it('createTestClient connects to local Supabase', async () => {
    const client = createTestClient();
    const { error } = await client.from('clients').select('id').limit(1);
    expect(error).toBeNull();
  });

  it('createTestVideo creates video record', async () => {
    const { client } = await createTestClientRecord();
    const { user } = await createTestUser({ clientId: client.id });
    const { video, cleanup } = await createTestVideo({
      clientId: client.id,
      userId: user.id,
      gmv: 100,
    });
    expect(video.gmv).toBe(100);
    await cleanup();
  });

  it('cleanupTestData removes all client data', async () => {
    const { client } = await createTestClientRecord();
    await cleanupTestData(supabase, { clientIds: [client.id] });
    const { data } = await supabase.from('clients').select('id').eq('id', client.id);
    expect(data).toHaveLength(0);
  });
});
```

#### Manual Verification Steps

1. [ ] Run `npx supabase start` - verify local Supabase running
2. [ ] Run `npm test -- --testPathPattern=test-infrastructure` - verify helpers work
3. [ ] Run existing tests - verify no regression

---

## 15. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing tests/fixtures/factories.ts exists (857 lines)
- [x] Verify jest.config.js has moduleNameMapper
- [x] Verify local Supabase running (ports 54321, 54322)

#### Implementation Steps
- [ ] **Step 1:** Create `tests/helpers/testClient.ts`
  - File: `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/testClient.ts`
  - Action: CREATE
- [ ] **Step 2:** Create `tests/helpers/cleanup.ts`
  - File: `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/cleanup.ts`
  - Action: CREATE
- [ ] **Step 3:** Create `tests/helpers/index.ts`
  - File: `/home/jorge/Loyalty/Rumi/appcode/tests/helpers/index.ts`
  - Action: CREATE
- [ ] **Step 4:** Add createTestVideo to factories.ts
  - File: `/home/jorge/Loyalty/Rumi/appcode/tests/fixtures/factories.ts`
  - Action: MODIFY - Add TestVideo interface and createTestVideo function

#### Post-Implementation
- [ ] Run `npx tsc --noEmit` - no type errors
- [ ] Run `npm test` - all existing tests pass
- [ ] Run test against local Supabase - verify connection works

---

## 16. Definition of Done

- [ ] `tests/helpers/testClient.ts` created with createTestClient and assertSupabaseRunning
- [ ] `tests/helpers/cleanup.ts` created with cleanupTestData
- [ ] `tests/helpers/index.ts` created with barrel exports
- [ ] `tests/fixtures/factories.ts` has createTestVideo function
- [ ] All files compile with no TypeScript errors
- [ ] assertSupabaseRunning correctly detects local Supabase state
- [ ] createTestVideo creates video records in local database
- [ ] cleanupTestData removes all client-related data
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| EXECUTION_PLAN.md | Task 8.4.1 lines 1475-1480 | Factory and cleanup requirements |
| EXECUTION_PLAN.md | Task 8.4.3 lines 1490-1496 | Video creation and metrics testing requirements |
| TestingStrategy.md | Lines 1-15 (Executive Summary) | 70% integration tests, local Supabase mandate |
| TestingStrategy.md | Lines 79-112 (Integration Tests) | seedTestData/cleanupTestData pattern |
| SchemaFinalv2.md | Lines 142-147 | Users precomputed fields (16 fields) |
| SchemaFinalv2.md | Lines 227-251 | Videos table schema for factory |
| tests/fixtures/factories.ts | Full file (857 lines) | Existing factory patterns to follow |
| jest.config.js | moduleNameMapper | Path alias configuration |
| supabase/config.toml | Full config | Local Supabase port configuration |
| npx supabase start output | Runtime | Local Supabase credentials and ports |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-14
**Author:** Claude Code
**Status:** Analysis Complete

---

# Checklist for LLM Creating Gap Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap (not Bug or Enhancement)
- [x] Project context explains the system to an outsider
- [x] Gap summary clearly states what's MISSING
- [x] Source Documents Analyzed table has 10+ entries with specific findings
- [x] Key Evidence section has 5+ items with source citations
- [x] Current state shows what EXISTS (existing factories)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed in cleanup
- [x] Integration points show dependency graph
- [x] Testing strategy included
- [x] External auditor could implement from this document alone
