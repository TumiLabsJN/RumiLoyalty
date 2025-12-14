# BUG-TIER-CALC-SERVICE-CLIENT - Implementation Plan

**Decision Source:** BUG-TIER-CALC-SERVICE-CLIENT.md
**Bug ID:** BUG-TIER-CALC-SERVICE-CLIENT
**Severity:** High
**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## IMPL Audit Feedback Incorporated (2025-12-14)

| Concern | Resolution |
|---------|------------|
| Hardcoded secrets in jest.setup.ts | Changed to import `TEST_CONFIG` from `testClient.ts` (single source of truth) |
| Duplicated setup vs existing helpers | Now uses existing `TEST_CONFIG` export from `testClient.ts` |
| setupFilesAfterEnv collision risk | Added comment in `jest.config.js` noting this is the single setup file |
| RLS bypass trade-off | Warning docstrings added to both files (Step 3, Step 6) |

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From BUG-TIER-CALC-SERVICE-CLIENT.md:**

**Bug Summary:** `tierCalculationService.checkForPromotions()` and `tierRepository` functions fail with `cookies was called outside a request scope` error when called from Jest tests because they use `createClient` from `server-client.ts` which requires Next.js request context.

**Root Cause:** Wrong Supabase client used - these modules are for cron/background operations but import `createClient` from `server-client.ts` (requires cookies) instead of `createAdminClient` from `admin-client.ts` (designed for cron jobs).

**Files Affected:**
- `lib/services/tierCalculationService.ts`
- `lib/repositories/tierRepository.ts`
- `tests/jest.setup.ts` (CREATE)
- `jest.config.js`

**Chosen Solution:**
1. Change import from `server-client` to `admin-client` in both files
2. Change all `await createClient()` to `createAdminClient()` (remove await - admin client is sync)
3. Create `jest.setup.ts` to set local Supabase env vars for tests
4. Add warning docstrings to prevent user-facing misuse

**Why This Solution:**
- `createAdminClient` is explicitly designed for "Cron jobs, Admin operations, Background workers" (admin-client.ts docstring)
- `syncRepository` already uses this pattern successfully
- Fixes root cause (not just a workaround)
- No API/schema changes required

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed: Added jest.setup.ts for local env vars, added warning docstrings
- Concerns Addressed: RLS bypass acknowledged, documented as intentional for cron-only modules

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 4 (2 modify, 1 create, 1 modify)
- Lines changed: ~30 modifications + ~20 new (jest.setup.ts)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

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
git status --short | head -10
```
**Expected:** Acceptable uncommitted changes (GAP docs, EXECUTION files)

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/jest.config.js`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/jest.config.js
```
**Expected:** File exists

**File 4 (to create):** `/home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts 2>&1
```
**Expected:** "No such file or directory" (will be created)

**Checklist:**
- [ ] tierCalculationService.ts exists
- [ ] tierRepository.ts exists
- [ ] jest.config.js exists
- [ ] jest.setup.ts does NOT exist (will create)

---

### Gate 3: Current Code State Verification

**Read tierCalculationService.ts import (line 23):**
```bash
sed -n '23p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** `import { createClient } from '@/lib/supabase/server-client';`

**Read tierCalculationService.ts usage (line 351):**
```bash
sed -n '351p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** `    const supabase = await createClient();`

**Read tierRepository.ts import (line 14):**
```bash
sed -n '14p' /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** `import { createClient } from '@/lib/supabase/server-client';`

**Count createClient usages in tierRepository.ts:**
```bash
grep -c "await createClient()" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** 11

**Checklist:**
- [ ] tierCalculationService.ts line 23 matches: `import { createClient } from '@/lib/supabase/server-client';`
- [ ] tierCalculationService.ts line 351 matches: `const supabase = await createClient();`
- [ ] tierRepository.ts line 14 matches: `import { createClient } from '@/lib/supabase/server-client';`
- [ ] tierRepository.ts has 11 `await createClient()` calls

**If current state doesn't match:** STOP. Report discrepancy. File may have changed.

---

### Gate 4: Schema Verification

> Skip - this bug doesn't involve database schema changes, only client connection method

**Checklist:**
- [x] SKIPPED - No schema changes

---

### Gate 5: API Contract Verification

> Skip - this bug doesn't involve API contract changes

**Checklist:**
- [x] SKIPPED - No API changes

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Update tierCalculationService.ts Import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Line:** 23
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
sed -n '22,24p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected Current State (EXACT CODE):**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
import { createClient } from '@/lib/supabase/server-client';
import {
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

**NEW Code (replacement):**
```typescript
import { createAdminClient } from '@/lib/supabase/admin-client';
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
Old String: import { createClient } from '@/lib/supabase/server-client';
New String: import { createAdminClient } from '@/lib/supabase/admin-client';
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
sed -n '22,24p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected New State:**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
import { createAdminClient } from '@/lib/supabase/admin-client';
import {
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Update tierCalculationService.ts Usage

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Line:** 351
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
sed -n '350,352p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected Current State:**
```typescript
  try {
    const supabase = await createClient();
    const { data: client, error } = await supabase
```

---

#### Edit Action

**OLD Code:**
```typescript
    const supabase = await createClient();
```

**NEW Code:**
```typescript
    const supabase = createAdminClient();
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
Old String:     const supabase = await createClient();
New String:     const supabase = createAdminClient();
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
sed -n '350,352p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected New State:**
```typescript
  try {
    const supabase = createAdminClient();
    const { data: client, error } = await supabase
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Add Warning Docstring to tierCalculationService.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Lines:** 1-2
**Action Type:** MODIFY (add warning after existing docstring opener)

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
sed -n '1,3p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected Current State:**
```typescript
/**
 * Tier Calculation Service
 *
```

---

#### Edit Action

**OLD Code:**
```typescript
/**
 * Tier Calculation Service
```

**NEW Code:**
```typescript
/**
 * Tier Calculation Service
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
Old String: /**
 * Tier Calculation Service
New String: /**
 * Tier Calculation Service
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
sed -n '1,7p' /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected New State:**
```typescript
/**
 * Tier Calculation Service
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
 *
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Update tierRepository.ts Import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
**Target Line:** 14
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
sed -n '13,15p' /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected Current State:**
```typescript

import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';
```

---

#### Edit Action

**OLD Code:**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

**NEW Code:**
```typescript
import { createAdminClient } from '@/lib/supabase/admin-client';
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
Old String: import { createClient } from '@/lib/supabase/server-client';
New String: import { createAdminClient } from '@/lib/supabase/admin-client';
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
sed -n '13,15p' /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected New State:**
```typescript

import { createAdminClient } from '@/lib/supabase/admin-client';
import type { Database } from '@/lib/types/database';
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Update tierRepository.ts Usages (11 locations)

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
**Target Lines:** 183, 219, 275, 304, 342, 417, 496, 538, 584, 623, 726
**Action Type:** MODIFY (replace_all)

---

#### Pre-Action Reality Check

**Count current usages:**
```bash
grep -c "const supabase = await createClient();" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected:** 11

---

#### Edit Action

**OLD Code (all 11 occurrences):**
```typescript
    const supabase = await createClient();
```

**NEW Code (all 11 occurrences):**
```typescript
    const supabase = createAdminClient();
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
Old String:     const supabase = await createClient();
New String:     const supabase = createAdminClient();
replace_all: true
```

---

#### Post-Action Verification

**Count new usages:**
```bash
grep -c "const supabase = createAdminClient();" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected:** 11

**Verify no old usages remain:**
```bash
grep -c "const supabase = await createClient();" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected:** 0

**Step Checkpoint:**
- [ ] Pre-action count was 11
- [ ] Edit applied successfully (replace_all)
- [ ] Post-action count is 11 (createAdminClient)
- [ ] No old usages remain (0)

**Checkpoint Status:** [PASS / FAIL]

---

### Step 6: Add Warning Docstring to tierRepository.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
**Target Lines:** 1-2
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
sed -n '1,3p' /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected Current State:**
```typescript
/**
 * Tier Repository
 *
```

---

#### Edit Action

**OLD Code:**
```typescript
/**
 * Tier Repository
```

**NEW Code:**
```typescript
/**
 * Tier Repository
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
Old String: /**
 * Tier Repository
New String: /**
 * Tier Repository
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
sed -n '1,7p' /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```

**Expected New State:**
```typescript
/**
 * Tier Repository
 *
 * ⚠️  INTERNAL - CRON/ADMIN USE ONLY
 * This module uses createAdminClient (bypasses RLS).
 * DO NOT import from user-facing routes or components.
 *
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected

**Checkpoint Status:** [PASS / FAIL]

---

### Step 7: Create jest.setup.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify file doesn't exist:**
```bash
ls /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts 2>&1
```

**Expected:** "No such file or directory"

**Verify TEST_CONFIG is exported from testClient.ts:**
```bash
grep -n "export const TEST_CONFIG" /home/jorge/Loyalty/Rumi/appcode/tests/helpers/testClient.ts
```

**Expected:** Line 90 shows export

---

#### Create Action

**New File Content:**
```typescript
/**
 * Jest Setup - Environment Configuration
 *
 * Sets environment variables for local Supabase before any tests run.
 * Required because some services (tierCalculationService, tierRepository)
 * use createAdminClient which reads from process.env.
 *
 * IMPORTANT: This is the ONLY Jest setup file. If adding more setup,
 * add it here rather than creating additional setup files.
 *
 * Credentials are imported from testClient.ts (single source of truth)
 * rather than hardcoded here.
 *
 * References:
 * - BUG-TIER-CALC-SERVICE-CLIENT.md (audit requirement)
 * - tests/helpers/testClient.ts (credential source of truth)
 */

import { TEST_CONFIG } from './helpers/testClient';

// Set environment variables from testClient.ts constants
// This allows createAdminClient() to work in test context
process.env.SUPABASE_URL = TEST_CONFIG.url;
process.env.SUPABASE_ANON_KEY = TEST_CONFIG.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_CONFIG.serviceRoleKey;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts
Content: [above content]
```

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts
```

**Expected:** File exists

**Verify content:**
```bash
head -5 /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts
```

**Expected:** Shows docstring beginning

**Step Checkpoint:**
- [ ] File did not exist before
- [ ] File created successfully
- [ ] Content is correct

**Checkpoint Status:** [PASS / FAIL]

---

### Step 8: Update jest.config.js

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/jest.config.js`
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
cat /home/jorge/Loyalty/Rumi/appcode/jest.config.js
```

**Expected Current State:**
```javascript
/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
  ],
};

module.exports = config;
```

---

#### Edit Action

**OLD Code:**
```javascript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
```

**NEW Code:**
```javascript
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Single setup file - sets env vars for local Supabase (BUG-TIER-CALC-SERVICE-CLIENT)
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/jest.config.js
Old String: const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
New String: const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Single setup file - sets env vars for local Supabase (BUG-TIER-CALC-SERVICE-CLIENT)
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
cat /home/jorge/Loyalty/Rumi/appcode/jest.config.js
```

**Expected:** Contains `setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],` with comment

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state contains setupFilesAfterEnv

**Checkpoint Status:** [PASS / FAIL]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**tierCalculationService.ts query (line 352-356):**
```typescript
const { data: client, error } = await supabase
  .from('clients')
  .select('checkpoint_months, vip_metric')
  .eq('id', clientId)
  .single();
```

**Security Checklist:**
- [ ] `.eq('id', clientId)` present - filters by specific client ID
- [ ] No cross-tenant data exposure possible

**Note:** tierRepository functions are called with `clientId` parameter and filter accordingly. This was verified in BUG-TIER-CALC-SERVICE-CLIENT.md Section 14.

---

### Authentication Check

> Skip - this is service/repository layer, not API route. Auth is handled at route level.

**Checklist:**
- [x] SKIPPED - Service layer, not API route

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**Run tier-calculation tests:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tier-calculation 2>&1 | tail -30
```

**Expected:** Tests pass (no more "cookies was called outside a request scope" error)
**Actual:** [document actual output]

**Status:**
- [ ] Bug-specific validation passed

---

### Verification 2: No New Errors Introduced

**Type Check all modified files:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/services/tierCalculationService.ts lib/repositories/tierRepository.ts 2>&1
```

**Expected:** No errors
**Actual:** [document output]

**Status:**
- [ ] No new type errors introduced

---

### Verification 3: Modified Files Compile

**Full type check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```

**Expected:** 0 (or same as baseline)
**Actual:** [count]

**Status:**
- [ ] All modified files compile

---

### Verification 4: Schema Alignment

> Skip - no schema changes

**Status:**
- [x] SKIPPED - No schema changes

---

### Verification 5: API Contract Alignment

> Skip - no API changes

**Status:**
- [x] SKIPPED - No API changes

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat appcode/
```

**Expected Changes:**
- `lib/services/tierCalculationService.ts`: ~5 lines changed (import, usage, docstring)
- `lib/repositories/tierRepository.ts`: ~15 lines changed (import, 11 usages, docstring)
- `tests/jest.setup.ts`: new file ~25 lines
- `jest.config.js`: ~1 line added

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes
- [ ] No unexpected files modified
- [ ] Line counts approximately correct

---

### Verification 7: Runtime Test

**Run full test to verify no regressions:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tier-calculation 2>&1 | tail -20
```

**Expected:** 7 tests pass
**Actual:** [document output]

**Status:**
- [ ] Runtime test passed

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED / [ ] FAILED

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-14
**Executor:** Claude Opus 4.5
**Decision Source:** BUG-TIER-CALC-SERVICE-CLIENT.md
**Implementation Doc:** BUG-TIER-CALC-SERVICE-CLIENT-IMPL.md
**Bug ID:** BUG-TIER-CALC-SERVICE-CLIENT

---

### Execution Log

**Pre-Implementation:**
```
[TBD] Gate 1: Environment - [PASS/FAIL]
[TBD] Gate 2: Files - [PASS/FAIL]
[TBD] Gate 3: Code State - [PASS/FAIL]
[TBD] Gate 4: Schema - SKIPPED
[TBD] Gate 5: API Contract - SKIPPED
```

**Implementation Steps:**
```
[TBD] Step 1: tierCalculationService.ts import - Pre/Applied/Post/Verified
[TBD] Step 2: tierCalculationService.ts usage - Pre/Applied/Post/Verified
[TBD] Step 3: tierCalculationService.ts docstring - Pre/Applied/Post/Verified
[TBD] Step 4: tierRepository.ts import - Pre/Applied/Post/Verified
[TBD] Step 5: tierRepository.ts usages (11) - Pre/Applied/Post/Verified
[TBD] Step 6: tierRepository.ts docstring - Pre/Applied/Post/Verified
[TBD] Step 7: Create jest.setup.ts - Pre/Applied/Post/Verified
[TBD] Step 8: Update jest.config.js - Pre/Applied/Post/Verified
```

**Security Verification:**
```
[TBD] Multi-tenant check - [PASS/FAIL]
[TBD] Auth check - SKIPPED
```

**Final Verification:**
```
[TBD] Bug-specific validation (tier-calculation tests)
[TBD] No new errors
[TBD] Files compile
[TBD] Schema alignment - SKIPPED
[TBD] API contract - SKIPPED
[TBD] Git diff sanity
[TBD] Runtime test
[TBD] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `lib/services/tierCalculationService.ts` - MODIFY - Import + usage + docstring
2. `lib/repositories/tierRepository.ts` - MODIFY - Import + 11 usages + docstring
3. `tests/jest.setup.ts` - CREATE - Local Supabase env vars
4. `jest.config.js` - MODIFY - Add setupFilesAfterEnv

**Total:** 4 files, ~50 lines changed (net)

---

### Bug Resolution

**Before Implementation:**
- Bug: `cookies was called outside a request scope` when calling checkForPromotions from Jest
- Root cause: Wrong Supabase client (server-client requires Next.js request context)

**After Implementation:**
- Bug: RESOLVED
- Verification: tier-calculation.test.ts passes

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify imports changed
grep "createAdminClient" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
grep "createAdminClient" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
# Should show: import and usages

# 2. Verify no old imports remain
grep "server-client" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
grep "server-client" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
# Should show: no matches

# 3. Verify jest.setup.ts exists
ls -la /home/jorge/Loyalty/Rumi/appcode/tests/jest.setup.ts
# Should show: file exists

# 4. Verify jest.config.js has setupFilesAfterEnv
grep "setupFilesAfterEnv" /home/jorge/Loyalty/Rumi/appcode/jest.config.js
# Should show: setupFilesAfterEnv line

# 5. Verify tests pass
cd /home/jorge/Loyalty/Rumi/appcode && npm test -- tier-calculation
# Should show: tests pass (no cookies error)
```

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [TBD]/3 (+ 2 skipped)
- Steps completed: [TBD]/8
- Verifications passed: [TBD]/5 (+ 2 skipped)
- Errors encountered: [TBD]
- Retries needed: [TBD]

**Code Quality:**
- Files modified: 4
- Lines changed: ~50
- Breaking changes: 0
- Security verified: YES
- Tests updated: NO (existing tests will now pass)

---

## Document Status

**Implementation Date:** 2025-12-14
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [x] Schema verified - SKIPPED
- [x] API contract verified - SKIPPED

**Implementation:**
- [ ] All 8 steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified
- [x] Auth requirements met - SKIPPED (service layer)

**Verification:**
- [ ] Bug-specific validation passed
- [ ] No new errors
- [ ] Files compile
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
2. [ ] Update BUG-TIER-CALC-SERVICE-CLIENT.md status to "Implemented"
3. [ ] Resume GAP-MANUAL-CSV-TEST implementation
4. [ ] Update EXECUTION_PLAN.md Task 8.4.5 note

**Git Commit Message Template:**
```
fix(tier-calc): use admin-client instead of server-client

Resolves BUG-TIER-CALC-SERVICE-CLIENT: tierCalculationService and
tierRepository used server-client which requires Next.js request
context (cookies). Changed to admin-client for cron/background use.

Changes:
- lib/services/tierCalculationService.ts: admin-client import + warning
- lib/repositories/tierRepository.ts: admin-client import (11 usages) + warning
- tests/jest.setup.ts: new file - sets local Supabase env vars
- jest.config.js: added setupFilesAfterEnv

This fix enables tier-calculation.test.ts (Task 8.4.5) to pass and
unblocks GAP-MANUAL-CSV-TEST (Task 8.4.9).

References:
- BugFixes/BUG-TIER-CALC-SERVICE-CLIENT.md
- BugFixes/BUG-TIER-CALC-SERVICE-CLIENT-IMPL.md

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
- [x] Read SchemaFinalv2.md - N/A (no schema changes)
- [x] Read API_CONTRACTS.md - N/A (no API changes)

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining after execution)

### Decision Fidelity
- [x] Followed locked decision (no re-analysis)
- [x] Implemented chosen solution exactly (no modifications)
- [x] Addressed audit feedback (jest.setup.ts, warning docstrings)
- [x] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [x] Verified auth requirements - N/A (service layer)
- [ ] No cross-tenant data exposure

---

**META-VERIFICATION STATUS:** [PENDING EXECUTION]

**Document is ready for execution. All [TBD] fields will be filled during implementation.**
