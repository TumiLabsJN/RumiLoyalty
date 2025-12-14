# Tier Calculation Service Uses Wrong Supabase Client - Fix Documentation

**Bug ID:** BUG-TIER-CALC-SERVICE-CLIENT
**Created:** 2025-12-14
**Status:** Analysis Complete
**Severity:** High
**Related Tasks:** Task 8.4.5 (tier-calculation.test.ts), Task 8.4.9 (manual dry run)
**Linked Bugs:** GAP-MANUAL-CSV-TEST (blocked by this bug)

---

## Audit Feedback Incorporated

**From Audit (2025-12-14):**

| Concern | Resolution |
|---------|------------|
| Admin client bypasses RLS - ensure env vars available | Added Step 5: Create `jest.setup.ts` with local Supabase env vars |
| RLS bypass removes safety net for accidental user-facing use | Added Step 6: Add warning docstrings to both files |
| Document that tests need `SUPABASE_SERVICE_ROLE_KEY` | Handled by `jest.setup.ts` - sets local credentials automatically |

---

## 1. Project Context

This is a creator loyalty/rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system has a daily cron job that syncs sales data from CRUVA, updates creator metrics, and calculates tier promotions/demotions.

The bug affects the `tierCalculationService.ts` and `tierRepository.ts` files which handle tier calculation logic. These run as part of the daily cron job but incorrectly use the server-client (which requires Next.js request context) instead of the admin-client (designed for cron jobs and background workers).

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers with two Supabase client types (server-client for user requests, admin-client for background jobs)

---

## 2. Bug Summary

**What's happening:** `tierCalculationService.checkForPromotions()` and `tierRepository` functions fail with error `cookies was called outside a request scope` when called from Jest tests or any non-HTTP context.

**What should happen:** These functions should work in any context (HTTP requests, cron jobs, Jest tests) since they're designed for background tier calculation, not user-facing operations.

**Impact:**
- `tier-calculation.test.ts` (Task 8.4.5) is broken - all tests fail
- `manual-csv-upload.test.ts` (Task 8.4.9) cannot be implemented - blocked
- Potential production issue if cron job runs outside Next.js request context

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| `tierCalculationService.ts` | Lines 1-20 (docstring) | States "Runs as part of daily cron" - should use admin-client |
| `tierCalculationService.ts` | Line 23 (import) | Imports `createClient` from `server-client` - WRONG |
| `tierCalculationService.ts` | Line 351 | Calls `await createClient()` which requires cookies |
| `tierRepository.ts` | Line 14 (import) | Also imports from `server-client` - WRONG |
| `tierRepository.ts` | 11 locations | Calls `await createClient()` throughout |
| `server-client.ts` | Lines 16-17 | Uses `await cookies()` from Next.js - requires request context |
| `admin-client.ts` | Lines 13-16 (docstring) | Explicitly designed for "Cron jobs, Admin operations, Background workers" |
| `admin-client.ts` | Lines 25-42 | Uses `process.env` directly - no request context needed |
| `syncRepository.ts` | Lines 15, 117, etc. | Uses `createAdminClient` - CORRECT pattern for cron |
| `tier-calculation.test.ts` | Line 42 | Imports and calls `checkForPromotions` directly |
| Jest test output | Runtime error | `cookies was called outside a request scope` |
| Daily cron route | Lines 18-19 | Calls `checkForPromotions` - works because HTTP context exists |

### Key Evidence

**Evidence 1:** Service docstring contradicts implementation
- Source: `tierCalculationService.ts`, lines 1-6
- Quote: "Runs as part of daily cron after sales sync completes"
- Implication: Should use admin-client (designed for cron), not server-client (designed for user requests)

**Evidence 2:** Wrong client import
- Source: `tierCalculationService.ts`, line 23
- Code: `import { createClient } from '@/lib/supabase/server-client';`
- Implication: This client uses `cookies()` which fails outside Next.js request context

**Evidence 3:** Admin-client explicitly designed for this use case
- Source: `admin-client.ts`, lines 13-16
- Quote: "ONLY use this client for: Cron jobs (data sync, scheduled tasks), Admin operations (tier checkpoints, bulk updates), Background workers"
- Implication: `tierCalculationService` matches all three criteria - should use admin-client

**Evidence 4:** Other cron-related code uses correct client
- Source: `syncRepository.ts`, line 15
- Code: `import { createAdminClient } from '@/lib/supabase/admin-client';`
- Implication: Established pattern exists - `tierRepository` and `tierCalculationService` are outliers

**Evidence 5:** Jest test failure proves the bug
- Source: `npm test -- tier-calculation` output
- Error: `cookies was called outside a request scope`
- Implication: Bug is real and reproducible

---

## 4. Root Cause Analysis

**Root Cause:** `tierCalculationService.ts` and `tierRepository.ts` import `createClient` from `server-client.ts` which uses Next.js `cookies()` API, but these modules are designed for background/cron operations that don't have request context.

**Contributing Factors:**
1. Two Supabase client patterns exist (`server-client` vs `admin-client`) - easy to pick wrong one
2. No lint rule or type system enforcement to prevent misuse
3. Works in production cron because Next.js API routes provide request context
4. Bug only manifests in Jest tests or standalone execution

**How it was introduced:** Design oversight during initial implementation. The service was likely tested only via the cron route (which has request context) and never directly in Jest.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| Test coverage | Phase 8 tier tests broken - cannot verify tier logic | High |
| Development velocity | GAP-MANUAL-CSV-TEST blocked - Phase 8 completion delayed | High |
| Production reliability | Works now but fragile - could break if called differently | Medium |
| Code maintainability | Wrong pattern makes code harder to test and debug | Medium |

**Business Risk Summary:** Phase 8 testing is blocked. The `tier-calculation.test.ts` file is completely non-functional, and `manual-csv-upload.test.ts` cannot be implemented without this fix.

---

## 6. Current State

#### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
```typescript
// Line 23 - WRONG import
import { createClient } from '@/lib/supabase/server-client';

// Line 351 - fails in Jest because server-client uses cookies()
const supabase = await createClient();
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
```typescript
// Line 14 - WRONG import
import { createClient } from '@/lib/supabase/server-client';

// Lines 183, 219, 275, 304, 342, 417, 496, 538, 584, 623, 726 - all fail in Jest
const supabase = await createClient();
```

**Current Behavior:**
- Works in production cron because API route provides Next.js request context
- Fails in Jest tests with `cookies was called outside a request scope`
- Fails if ever called from background worker or standalone script

#### Current Data Flow

```
[Jest Test] → checkForPromotions(clientId)
     ↓
[tierCalculationService.ts] → await createClient()
     ↓
[server-client.ts] → await cookies()
     ↓
❌ FAILURE: "cookies was called outside a request scope"
```

---

## 7. Proposed Fix

#### Approach

Change `tierCalculationService.ts` and `tierRepository.ts` to use `createAdminClient` from `admin-client.ts` instead of `createClient` from `server-client.ts`. This matches the documented use case (cron jobs, admin operations) and follows the pattern used by `syncRepository.ts`.

#### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`

**Before:**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

**After:**
```typescript
import { createAdminClient } from '@/lib/supabase/admin-client';
```

**Before (line 351):**
```typescript
const supabase = await createClient();
```

**After:**
```typescript
const supabase = createAdminClient();
```

**Explanation:** `createAdminClient` is synchronous (no `await`) and doesn't require request context. It uses `process.env` directly for credentials, which works in any execution context.

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`

**Before:**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

**After:**
```typescript
import { createAdminClient } from '@/lib/supabase/admin-client';
```

**Before (11 locations):**
```typescript
const supabase = await createClient();
```

**After (all 11 locations):**
```typescript
const supabase = createAdminClient();
```

**Explanation:** Same fix - use admin-client which is designed for repository/background operations.

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `lib/services/tierCalculationService.ts` | MODIFY | Change import, 1 usage, add warning docstring |
| `lib/repositories/tierRepository.ts` | MODIFY | Change import, 11 usages, add warning docstring |
| `tests/jest.setup.ts` | CREATE | Set local Supabase env vars for tests |
| `jest.config.js` | MODIFY | Add `setupFilesAfterEnv` to load jest.setup.ts |

### Dependency Graph

```
tierCalculationService.ts
├── imports from: admin-client.ts (after fix)
├── imports from: tierRepository.ts
├── imported by: app/api/cron/daily-automation/route.ts
└── imported by: tests/integration/cron/tier-calculation.test.ts

tierRepository.ts
├── imports from: admin-client.ts (after fix)
├── imported by: tierCalculationService.ts
└── affects: All tier-related operations
```

---

## 9. Data Flow Analysis

#### Before Fix

```
[Jest Test] → checkForPromotions()
     ↓
[server-client] → cookies()
     ↓
❌ FAILURE (no request context)
```

#### After Fix

```
[Jest Test] → checkForPromotions()
     ↓
[admin-client] → process.env
     ↓
✅ SUCCESS (env vars always available)
```

#### Data Transformation Steps

1. **Step 1:** Test calls `checkForPromotions(clientId)`
2. **Step 2:** Service calls `createAdminClient()` (sync, no cookies)
3. **Step 3:** Admin client reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env
4. **Step 4:** Database query executes successfully
5. **Step 5:** Test assertions pass

---

## 10. Call Chain Mapping

#### Affected Call Chain

```
[tier-calculation.test.ts]
│
├─► checkForPromotions(clientId) [tierCalculationService.ts]
│   ├── createAdminClient() [admin-client.ts] ← FIX HERE
│   └── tierRepository.getUsersForPromotionCheck()
│       └── createAdminClient() ← FIX HERE
│
└─► tierRepository.promoteUserToTier()
    └── createAdminClient() ← FIX HERE
```

#### Integration Points

| Layer | Component | Role in Bug |
|-------|-----------|-------------|
| Database | Supabase PostgreSQL | Destination - receives queries |
| Repository | tierRepository | Uses wrong client - AFFECTED |
| Service | tierCalculationService | Uses wrong client - AFFECTED |
| API Route | daily-automation/route.ts | Entry point - provides context (masks bug) |
| Test | tier-calculation.test.ts | Entry point - no context (exposes bug) |

---

## 11. Database/Schema Verification

#### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `clients` | checkpoint_months, vip_metric | Read by checkForPromotions |
| `users` | current_tier, total_sales, total_units | Read/write by tier functions |
| `tiers` | tier_id, sales_threshold, units_threshold | Read for threshold comparison |
| `tier_checkpoints` | all columns | Write for audit log |

#### Schema Check

```sql
-- No schema changes needed - fix is client-side only
SELECT 1; -- Tables already exist and support operations
```

#### Data Migration Required?
- [x] No - schema already supports fix (client-side code change only)

---

## 12. Frontend Impact Assessment

#### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| None | N/A | None |

#### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| None | N/A | N/A | No |

### Frontend Changes Required?
- [x] No - this is a backend-only fix affecting how Supabase client is created

---

## 13. Alternative Solutions Considered

#### Option A: Mock createClient in Tests
- **Description:** Add `jest.mock('@/lib/supabase/server-client')` to test files
- **Pros:** No production code changes, quick fix
- **Cons:** Doesn't fix root cause, each test file needs mock, masks the design flaw
- **Verdict:** ❌ Rejected - workaround, not fix

#### Option B: Use createAdminClient (Selected)
- **Description:** Change tierCalculationService and tierRepository to use admin-client
- **Pros:** Fixes root cause, matches documented usage, follows existing pattern (syncRepository)
- **Cons:** Changes production code (low risk - same database, different auth)
- **Verdict:** ✅ Selected - correct long-term fix

#### Option C: Add Optional Client Parameter
- **Description:** Add `supabase?: SupabaseClient` parameter to functions, default to createClient
- **Pros:** Maximum flexibility, tests can inject test client
- **Cons:** API change, requires updating all call sites, over-engineering
- **Verdict:** ❌ Rejected - unnecessary complexity

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Admin client bypasses RLS | Low | Low | Tier operations don't rely on RLS - they're admin operations |
| Missing env vars in test | Low | Medium | Tests use local Supabase with known credentials |
| Regression in production | Low | Medium | Admin client works same as server client for these queries |

#### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API | No | Same functions, same signatures |
| Database | No | No schema changes |
| Frontend | No | No frontend changes |

---

## 15. Testing Strategy

#### Unit Tests

Not applicable - this fixes existing integration tests.

#### Integration Tests

**File:** `tests/integration/cron/tier-calculation.test.ts` (existing, currently broken)

After fix, this test should pass:
```bash
npm test -- tier-calculation
```

**Expected:** 7 tests pass (currently 0 pass due to cookies error)

#### Manual Verification Steps

1. [x] Verify current tests fail with cookies error (already confirmed)
2. [ ] Apply fix to tierCalculationService.ts
3. [ ] Apply fix to tierRepository.ts
4. [ ] Run `npm test -- tier-calculation` - should pass
5. [ ] Run `npm run build` - should succeed
6. [ ] Verify production cron still works (same database queries)

#### Verification Commands

```bash
# Run tier calculation tests (currently failing)
npm test -- tier-calculation

# Type check
npx tsc --noEmit

# Build verification
npm run build

# Full test suite
npm test
```

---

## 16. Implementation Checklist

#### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress

#### Implementation Steps
- [ ] **Step 1:** Update tierCalculationService.ts import
  - File: `lib/services/tierCalculationService.ts`
  - Change: Line 23 `server-client` → `admin-client`
- [ ] **Step 2:** Update tierCalculationService.ts usage
  - File: `lib/services/tierCalculationService.ts`
  - Change: Line 351 `await createClient()` → `createAdminClient()`
- [ ] **Step 3:** Update tierRepository.ts import
  - File: `lib/repositories/tierRepository.ts`
  - Change: Line 14 `server-client` → `admin-client`
- [ ] **Step 4:** Update tierRepository.ts usages (11 locations)
  - File: `lib/repositories/tierRepository.ts`
  - Change: Lines 183, 219, 275, 304, 342, 417, 496, 538, 584, 623, 726
  - Change: `await createClient()` → `createAdminClient()` (remove await)
- [ ] **Step 5:** Create jest.setup.ts for local Supabase env vars (Audit Requirement)
  - File: `tests/jest.setup.ts`
  - Purpose: Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to local values before tests
  - Update: `jest.config.js` to include `setupFilesAfterEnv`
- [ ] **Step 6:** Add warning docstrings to prevent user-facing misuse (Audit Requirement)
  - File: `lib/services/tierCalculationService.ts` - Add warning at top
  - File: `lib/repositories/tierRepository.ts` - Add warning at top
  - Warning: "⚠️ INTERNAL - CRON/ADMIN USE ONLY. Uses admin-client (bypasses RLS). DO NOT import from user-facing routes."

#### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test -- tier-calculation`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Testing Strategy
- [ ] Update EXECUTION_PLAN.md if tasks affected

---

## 17. EXECUTION_PLAN.md Integration

#### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 8.4.5 | tier-calculation.test.ts | Currently broken - will work after fix |
| 8.4.9 | Manual dry run | Blocked - can proceed after fix |

#### Updates Required

**Task 8.4.5:**
- Current status: Tests exist but fail
- After fix: Tests should pass
- Notes: Add note about BUG-TIER-CALC-SERVICE-CLIENT fix

**Task 8.4.9:**
- Current status: Blocked by client bug
- After fix: Can implement GAP-MANUAL-CSV-TEST
- Notes: Depends on this bug being fixed first

#### New Tasks Created (if any)
- None - this is a prerequisite fix, not a new feature

---

## 18. Definition of Done

- [ ] Import changed in tierCalculationService.ts (line 23)
- [ ] Usage changed in tierCalculationService.ts (line 351)
- [ ] Warning docstring added to tierCalculationService.ts
- [ ] Import changed in tierRepository.ts (line 14)
- [ ] All 11 usages changed in tierRepository.ts
- [ ] Warning docstring added to tierRepository.ts
- [ ] `tests/jest.setup.ts` created with local env vars
- [ ] `jest.config.js` updated with setupFilesAfterEnv
- [ ] Type checker passes with no errors
- [ ] `npm test -- tier-calculation` passes (7 tests)
- [ ] Build completes successfully
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| `tierCalculationService.ts` | Docstring (lines 1-20), import (line 23), usage (line 351) | Bug location in service |
| `tierRepository.ts` | Import (line 14), 11 usages | Bug location in repository |
| `server-client.ts` | Full file | Shows why cookies() fails |
| `admin-client.ts` | Docstring (lines 4-23), implementation (lines 25-42) | Shows correct client for cron |
| `syncRepository.ts` | Import (line 15) | Shows correct pattern |
| `tier-calculation.test.ts` | Full file | Reproduces the bug |

### Reading Order for External Auditor

1. **First:** `admin-client.ts` - Docstring explains when to use this client (cron jobs, background workers)
2. **Second:** `server-client.ts` - Shows cookies() usage that causes the bug
3. **Third:** `tierCalculationService.ts` - Lines 1-6 docstring says "runs as part of daily cron" but uses wrong client
4. **Fourth:** `syncRepository.ts` line 15 - Shows the correct pattern being used elsewhere
5. **Fifth:** Run `npm test -- tier-calculation` - Reproduces the error

---

**Document Version:** 1.0
**Last Updated:** 2025-12-14
**Author:** Claude Code
**Status:** Analysis Complete
