# Supabase RPC Nullable Parameters - Implementation Plan

**Decision Source:** SupabaseRPCNullableParamsFix.md
**Bug ID:** BUG-007-SupabaseRPCNullableParams
**Severity:** High
**Implementation Date:** 2025-12-18
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From SupabaseRPCNullableParamsFix.md:**

**Bug Summary:** Vercel build fails with TypeScript error `Type 'string | null' is not assignable to type 'string'` because Supabase-generated types mark RPC parameters as required when they should be nullable.

**Root Cause:** Supabase CLI infers parameter nullability from `DEFAULT NULL` clause in PostgreSQL function signatures. Without this clause, parameters are generated as required `string` even though PostgreSQL accepts NULL at runtime.

**Files Affected:**
- `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` (NEW)
- `appcode/lib/types/database.ts` (REGENERATE)
- `appcode/lib/repositories/missionRepository.ts` (MAYBE MODIFY)

**Chosen Solution:**
> Add `DEFAULT NULL` to optional parameters in the RPC function signatures via a new migration. Then regenerate Supabase types so the generated TypeScript correctly allows `null` values.

**Scope:** Only `claim_physical_gift` needs changes. `claim_commission_boost` has all required parameters.

**Auth Guard Status (Important Context):**
> Migration `20251218100002_fix_rpc_auth_column.sql` already fixed the auth guard in BOTH RPCs to use `users.id = auth.uid()` (not `auth_id`). This new migration `20251218100003` only adds `DEFAULT NULL` to the function signature - the function body with correct auth logic is preserved via `CREATE OR REPLACE`.

**Why This Solution:**
- Fixes root cause at the database level
- Supabase type generator will produce correct types
- No manual type overrides needed
- Sustainable - won't be overwritten on type regeneration
- Types accurately reflect reality

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES
- Critical Issues Addressed:
  - Added handling for both type generation outcomes (Outcome A: `string | undefined` vs Outcome B: `string | null`)
  - Added explicit scope clarifying only `claim_physical_gift` needs changes
- Concerns Addressed:
  - Migration ordering documented
  - Both RPC functions analyzed

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 2-3 (migration, types, possibly repository)
- Lines changed: ~100 (new migration) + regenerated types + possible repository update
- Breaking changes: NO
- Schema changes: NO (function signature only)
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
**Expected:** `/home/jorge/Loyalty/Rumi` or `/home/jorge/Loyalty/Rumi/appcode`

**Supabase CLI Available:**
```bash
npx supabase --version
```
**Expected:** Version number displayed (1.x or 2.x)

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR only expected modified files

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Supabase CLI available: [version]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified/created:**

**File 1 (NEW):** `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/
```
**Expected:** Directory exists, migration file does NOT exist yet

**File 2 (EXISTS):** `appcode/lib/types/database.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** File exists

**File 3 (EXISTS):** `appcode/lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**Checklist:**
- [ ] Migration directory exists
- [ ] Migration file does not exist yet (fresh creation)
- [ ] database.ts exists
- [ ] missionRepository.ts exists

---

### Gate 3: Current Code State Verification

**Read current RPC definition to confirm starting state:**
```bash
Read /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100002_fix_rpc_auth_column.sql lines 9-24
```

**Expected Current State:**
```sql
CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT,
  p_size_value TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT
)
```

**Read current generated types:**
```bash
grep -A 20 "claim_physical_gift:" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```

**Expected Current State:**
```typescript
claim_physical_gift: {
  Args: {
    p_city: string
    p_client_id: string
    p_country: string
    p_first_name: string
    p_last_name: string
    p_line1: string
    p_line2: string
    p_phone: string
    p_postal_code: string
    p_redemption_id: string
    p_requires_size: boolean
    p_size_category: string
    p_size_value: string
    p_state: string
  }
  Returns: Json
}
```

**Read current missionRepository.ts RPC call:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1238-1253
```

**Expected Current State:**
```typescript
const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
  p_redemption_id: redemptionId,
  p_client_id: clientId,
  p_requires_size: requiresSize,
  p_size_category: (valueData?.size_category as string) ?? null,
  p_size_value: claimData.size ?? null,
  p_first_name: addr.firstName,
  p_last_name: addr.lastName,
  p_line1: addr.line1,
  p_line2: addr.line2 ?? null,
  p_city: addr.city,
  p_state: addr.state,
  p_postal_code: addr.postalCode,
  p_country: addr.country ?? 'USA',
  p_phone: addr.phone ?? null,
});
```

**Checklist:**
- [ ] Current RPC signature matches Fix.md Section 6: [YES / NO]
- [ ] Current generated types match expected (all `string`, non-nullable): [YES / NO]
- [ ] Current missionRepository uses `?? null` pattern: [YES / NO]
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification

**Read SchemaFinalv2.md for physical_gift_redemptions table:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 848-872
```

**Tables involved:** physical_gift_redemptions

**Column verification (nullable fields):**
| Column in RPC | Column in Schema | Nullable? | Match? |
|---------------|------------------|-----------|--------|
| p_size_category | size_category VARCHAR(50) | YES (no NOT NULL) | ✅ |
| p_size_value | size_value VARCHAR(20) | YES (no NOT NULL) | ✅ |
| p_line2 | shipping_address_line2 VARCHAR(255) | YES (no NOT NULL) | ✅ |
| p_phone | shipping_phone VARCHAR(50) | YES (no NOT NULL) | ✅ |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Nullable fields confirmed nullable in schema
- [ ] Foreign keys respected (redemption_id, client_id)

---

### Gate 5: Supabase Connection Verification

**Verify Supabase is linked:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase status
```
**Expected:** Shows linked project status

**Checklist:**
- [ ] Supabase CLI linked to project
- [ ] Can run migrations
- [ ] Can regenerate types

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Create Migration File

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` (NEW)
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify migration doesn't exist:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003*.sql 2>&1
```
**Expected:** "No such file or directory" or empty result

**Reality Check:**
- [ ] Command executed
- [ ] Migration file does not exist: [YES / NO]

**If file exists:** STOP. Migration may have been partially applied.

---

#### Create Action

**NEW File Content:**
```sql
-- Migration: Add DEFAULT NULL to optional RPC parameters
-- Bug ID: BUG-007-SupabaseRPCNullableParams
-- Purpose: Make Supabase type generator produce nullable types for optional params
-- Date: 2025-12-18
-- Scope: Only claim_physical_gift (claim_commission_boost has all required params)

-- ============================================
-- RPC: claim_physical_gift (ADD DEFAULT NULL)
-- ============================================
-- Parameters needing DEFAULT NULL:
--   p_size_category - nullable in schema (size not always required)
--   p_size_value    - nullable in schema (size not always required)
--   p_line2         - nullable in schema (apt/suite is optional)
--   p_phone         - nullable in schema (phone is optional)
-- ============================================

CREATE OR REPLACE FUNCTION claim_physical_gift(
  p_redemption_id UUID,
  p_client_id UUID,
  p_requires_size BOOLEAN,
  p_size_category TEXT DEFAULT NULL,
  p_size_value TEXT DEFAULT NULL,
  p_first_name TEXT,
  p_last_name TEXT,
  p_line1 TEXT,
  p_line2 TEXT DEFAULT NULL,
  p_city TEXT,
  p_state TEXT,
  p_postal_code TEXT,
  p_country TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_auth_uid UUID := auth.uid();
BEGIN
  -- SECURITY: Get user_id from auth.uid()
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly
  SELECT id INTO v_user_id
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Verify redemption belongs to authenticated user and is claimable
  IF NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE id = p_redemption_id
      AND user_id = v_user_id
      AND client_id = p_client_id
      AND status = 'claimable'
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Redemption not found or not claimable'
    );
  END IF;

  -- Both operations in single transaction (implicit BEGIN)

  -- 1. Update redemption status
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = p_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id;

  -- 2. Insert physical gift sub-state
  INSERT INTO physical_gift_redemptions (
    redemption_id, client_id,
    requires_size, size_category, size_value, size_submitted_at,
    shipping_recipient_first_name, shipping_recipient_last_name,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code,
    shipping_country, shipping_phone, shipping_info_submitted_at
  ) VALUES (
    p_redemption_id, p_client_id,
    p_requires_size, p_size_category, p_size_value,
    CASE WHEN p_size_value IS NOT NULL THEN v_now ELSE NULL END,
    p_first_name, p_last_name,
    p_line1, p_line2,
    p_city, p_state, p_postal_code,
    COALESCE(p_country, 'USA'), p_phone, v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql
Content: [above SQL]
```

---

#### Post-Action Verification

**Verify file created:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql
```
**Expected:** File exists with reasonable size (~3KB)

**Verify content:**
```bash
grep "DEFAULT NULL" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql
```
**Expected:** Shows 4 lines with DEFAULT NULL (p_size_category, p_size_value, p_line2, p_phone)

**State Verification:**
- [ ] File created successfully
- [ ] Contains 4 DEFAULT NULL clauses
- [ ] SQL syntax correct

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] File created successfully ✅
- [ ] Post-action verification passed ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Apply Migration to Supabase

**Target:** Remote Supabase database
**Action Type:** RUN MIGRATION

---

#### Pre-Action Reality Check

**Verify migration file exists:**
```bash
cat /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql | head -20
```
**Expected:** Shows migration header with BUG-007 reference

**Reality Check:**
- [ ] Migration file exists and readable
- [ ] Contains correct bug reference

---

#### Execute Action

**Apply migration:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db push
```

**Expected Output:**
- Migration applied successfully
- No errors

---

#### Post-Action Verification

**Verify function updated in database:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db diff
```
**Expected:** No pending changes (migration already applied)

**State Verification:**
- [ ] Migration applied without errors
- [ ] Function signature updated in database

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Migration applied successfully ✅
- [ ] Post-action verification passed ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Regenerate Supabase Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts`
**Action Type:** REGENERATE

---

#### Pre-Action Reality Check

**Verify current types (before regeneration):**
```bash
grep -A 5 "p_size_value" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** Shows `p_size_value: string` (non-nullable)

**Reality Check:**
- [ ] Current types show non-nullable string
- [ ] Ready to regenerate

---

#### Execute Action

**Regenerate types:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase gen types typescript --linked > appcode/lib/types/database.ts
```

**Expected Output:**
- Types regenerated successfully
- No errors

---

#### Post-Action Verification

**CRITICAL DECISION POINT - Check generated type format:**
```bash
grep -A 20 "claim_physical_gift:" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```

**Check for Outcome A or B:**

**Outcome A (`string | undefined` - optional with `?`):**
```typescript
p_size_value?: string
```

**Outcome B (`string | null` - nullable):**
```typescript
p_size_value: string | null
```

**State Verification:**
- [ ] Types regenerated successfully
- [ ] Identified outcome: [A / B]

---

### ⚠️ MANDATORY DECISION GATE - DO NOT PROCEED WITHOUT COMPLETING

**Record the outcome here:** Outcome = [A / B]

**Routing Decision (HARD STOP - CHOOSE ONE):**

| Outcome | Generated Type Format | Next Step | Repository Update |
|---------|----------------------|-----------|-------------------|
| **A** | `p_size_value?: string` (optional) | → Step 4A (REQUIRED) | YES - must use conditional spread |
| **B** | `p_size_value: string \| null` (nullable) | → Step 5 (skip 4A) | NO - current `?? null` works |

**If Outcome A:** You MUST execute Step 4A. The build will fail if you skip it because `null` is not assignable to `undefined`.

**If Outcome B:** Skip directly to Step 5 (Final Verification).

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Types regenerated successfully ✅
- [ ] Outcome identified and recorded: [A / B] ✅
- [ ] Routing decision made: [Step 4A / Step 5] ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4A: (REQUIRED FOR OUTCOME A) Update missionRepository.ts

> **⚠️ THIS STEP IS REQUIRED IF OUTCOME A**
> **SKIP ONLY IF OUTCOME B** (types show `string | null`)
>
> If you identified Outcome A (`p_size_value?: string`) and skip this step, the build WILL FAIL.

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** 1238-1253
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read current RPC call:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1238-1253
```

**Expected Current State:**
```typescript
      const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
        p_redemption_id: redemptionId,
        p_client_id: clientId,
        p_requires_size: requiresSize,
        p_size_category: (valueData?.size_category as string) ?? null,
        p_size_value: claimData.size ?? null,
        p_first_name: addr.firstName,
        p_last_name: addr.lastName,
        p_line1: addr.line1,
        p_line2: addr.line2 ?? null,
        p_city: addr.city,
        p_state: addr.state,
        p_postal_code: addr.postalCode,
        p_country: addr.country ?? 'USA',
        p_phone: addr.phone ?? null,
      });
```

**Reality Check:**
- [ ] Current code uses `?? null` pattern
- [ ] Line numbers accurate

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
      const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
        p_redemption_id: redemptionId,
        p_client_id: clientId,
        p_requires_size: requiresSize,
        p_size_category: (valueData?.size_category as string) ?? null,
        p_size_value: claimData.size ?? null,
        p_first_name: addr.firstName,
        p_last_name: addr.lastName,
        p_line1: addr.line1,
        p_line2: addr.line2 ?? null,
        p_city: addr.city,
        p_state: addr.state,
        p_postal_code: addr.postalCode,
        p_country: addr.country ?? 'USA',
        p_phone: addr.phone ?? null,
      });
```

**NEW Code (replacement with conditional spread):**
```typescript
      const { data: result, error: rpcError } = await supabase.rpc('claim_physical_gift', {
        p_redemption_id: redemptionId,
        p_client_id: clientId,
        p_requires_size: requiresSize,
        p_first_name: addr.firstName,
        p_last_name: addr.lastName,
        p_line1: addr.line1,
        p_city: addr.city,
        p_state: addr.state,
        p_postal_code: addr.postalCode,
        p_country: addr.country ?? 'USA',
        // Optional fields - only include if truthy (Supabase types use undefined)
        ...(valueData?.size_category && { p_size_category: valueData.size_category as string }),
        ...(claimData.size && { p_size_value: claimData.size }),
        ...(addr.line2 && { p_line2: addr.line2 }),
        ...(addr.phone && { p_phone: addr.phone }),
      });
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
Old String: [exact OLD code above]
New String: [exact NEW code above]
```

---

#### Post-Action Verification

**Read modified code:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1238-1255
```

**Expected New State:**
- Uses conditional spread `...(condition && { key: value })`
- No `?? null` for optional fields
- Required fields still passed directly

**State Verification:**
- [ ] Code modified correctly
- [ ] Conditional spread syntax used
- [ ] No `?? null` for optional fields

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `claim_physical_gift` RPC function
```sql
-- From migration file
SELECT id INTO v_user_id
FROM users
WHERE id = v_auth_uid
  AND client_id = p_client_id;  -- ✅ client_id filter

-- Redemption check
SELECT 1 FROM redemptions
WHERE id = p_redemption_id
  AND user_id = v_user_id
  AND client_id = p_client_id  -- ✅ client_id filter
  AND status = 'claimable'
  AND deleted_at IS NULL

-- Update
UPDATE redemptions
SET status = 'claimed', claimed_at = v_now, updated_at = v_now
WHERE id = p_redemption_id
  AND user_id = v_user_id
  AND client_id = p_client_id;  -- ✅ client_id filter

-- Insert
INSERT INTO physical_gift_redemptions (
  redemption_id, client_id,  -- ✅ client_id included
  ...
)
```

**Security Checklist:**
- [ ] All SELECT queries filter by client_id ✅
- [ ] All UPDATE queries filter by client_id ✅
- [ ] INSERT includes client_id column ✅
- [ ] No raw SQL without client_id filter ✅
- [ ] No cross-tenant data exposure possible ✅

---

### Authentication Check

**RPC Function:** `claim_physical_gift`

**Checklist:**
- [ ] `auth.uid()` checked at start of function ✅
- [ ] Returns error if not authenticated ✅
- [ ] User verified against users table ✅
- [ ] Tenant isolation enforced via client_id ✅

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: TypeScript Build

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build
```
**Expected:** Build succeeds (no type errors)
**Actual:** [document actual output]

**Status:**
- [ ] Build passes with no errors ✅

---

### Verification 2: Type Check on Modified Files

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1
```
**Expected:** No type errors on missionRepository.ts
**Actual:** [document actual output]

**Status:**
- [ ] No type errors on modified repository ✅

---

### Verification 3: Generated Types Verification

**Command:**
```bash
grep -A 20 "claim_physical_gift:" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** Optional fields show `?` or `| null`
**Actual:** [document actual output]

**Status:**
- [ ] Types correctly show optional/nullable params ✅

---

### Verification 4: Migration Applied

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db diff
```
**Expected:** No pending differences (migration applied)
**Actual:** [document actual output]

**Status:**
- [ ] Migration fully applied ✅

---

### Verification 5: Schema Alignment Confirmed

**Verification:**
- [ ] RPC param names match schema column names
- [ ] Nullable fields match schema (size_category, size_value, line2, phone)
- [ ] Required fields match schema (first_name, last_name, etc.)

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Changes:**
- `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql`: NEW (~100 lines)
- `appcode/lib/types/database.ts`: MODIFIED (regenerated)
- `appcode/lib/repositories/missionRepository.ts`: MODIFIED (if Outcome A)

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

### Verification 7: Dev Server Test (Optional)

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev
```

**Test:**
- Navigate to missions page
- Verify no console errors related to claim_physical_gift

**Status:**
- [ ] Dev server starts without errors ✅
- [ ] No runtime errors visible ✅

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-18
**Executor:** Claude Opus 4.5
**Decision Source:** SupabaseRPCNullableParamsFix.md
**Implementation Doc:** SupabaseRPCNullableParamsFixIMPL.md
**Bug ID:** BUG-007-SupabaseRPCNullableParams

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: Supabase Connection - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create migration - Pre ✅ - Created ✅ - Post ✅
[Timestamp] Step 2: Apply migration - Pre ✅ - Applied ✅ - Post ✅
[Timestamp] Step 3: Regenerate types - Pre ✅ - Regenerated ✅ - Outcome [A/B]
[Timestamp] Step 4A: Update repository - [EXECUTED/SKIPPED] - Pre ✅ - Applied ✅ - Post ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] TypeScript build ✅
[Timestamp] Type check modified files ✅
[Timestamp] Generated types verification ✅
[Timestamp] Migration applied ✅
[Timestamp] Schema alignment ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Dev server test ✅ / SKIPPED
[Timestamp] Overall: PASS ✅
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251218100003_fix_rpc_nullable_params.sql` - NEW - RPC with DEFAULT NULL
2. `appcode/lib/types/database.ts` - REGENERATED - Optional/nullable types
3. `appcode/lib/repositories/missionRepository.ts` - MODIFIED (if Outcome A) - Conditional spread

**Total:** 2-3 files modified

---

### Bug Resolution

**Before Implementation:**
- Bug: Vercel build fails with `Type 'string | null' is not assignable to type 'string'`
- Root cause: Supabase types generated as required string without DEFAULT NULL

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: `npm run build` passes, no type errors

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: SupabaseRPCNullableParamsFix.md
- Documented 19 sections
- Proposed solution: Add DEFAULT NULL to RPC

**Step 2: Audit Phase**
- External LLM audit completed
- Recommendation: APPROVE WITH CHANGES
- Feedback addressed: Added Outcome A/B handling, clarified scope

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: SupabaseRPCNullableParamsFixIMPL.md
- 3-4 implementation steps (conditional based on outcome)
- All verifications defined

**Step 4: Current Status**
- Implementation: [PENDING/COMPLETE]
- Bug resolved: [PENDING/YES]
- Ready for commit: [NO/YES]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql

# 2. Verify DEFAULT NULL in migration
grep "DEFAULT NULL" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100003_fix_rpc_nullable_params.sql

# 3. Verify types regenerated (optional params)
grep -A 20 "claim_physical_gift:" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts

# 4. Verify build passes
cd /home/jorge/Loyalty/Rumi/appcode && npm run build

# 5. Check git diff
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Results:**
- Migration file exists with 4 DEFAULT NULL clauses ✅
- Types show optional (`?`) or nullable (`| null`) params ✅
- Build passes ✅
- Git diff shows expected files only ✅

**Audit Status:** [VERIFIED ✅ / ISSUES FOUND ❌]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5]
- Steps completed: [3-4/3-4]
- Verifications passed: [7/7]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: [2-3]
- Lines changed: [~100 new + regenerated]
- Breaking changes: [0]
- Security verified: [YES]
- Tests updated: [N/A - type-level fix]

---

## Document Status

**Implementation Date:** 2025-12-18
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified
- [ ] Supabase connection verified

**Implementation:**
- [ ] Step 1: Migration created ✅
- [ ] Step 2: Migration applied ✅
- [ ] Step 3: Types regenerated ✅
- [ ] Step 4A: Repository updated (if needed) ✅

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] Auth requirements met ✅

**Verification:**
- [ ] TypeScript build passes ✅
- [ ] Type check passes ✅
- [ ] Migration applied ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [PENDING / SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update SupabaseRPCNullableParamsFix.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update SupabaseRPCNullableParamsFix.md status to "Implemented"
3. [ ] Verify Vercel deployment succeeds
4. [ ] Test physical gift claim flow

**Git Commit Message Template:**
```
fix: Add DEFAULT NULL to RPC optional params for Supabase type generation

Resolves BUG-007-SupabaseRPCNullableParams: Vercel build failed with
type error 'string | null' not assignable to 'string'

Changes:
- supabase/migrations/20251218100003: Add DEFAULT NULL to p_size_category,
  p_size_value, p_line2, p_phone in claim_physical_gift RPC
- appcode/lib/types/database.ts: Regenerated with optional params
- appcode/lib/repositories/missionRepository.ts: Updated to conditional
  spread (if Outcome A)

References:
- SupabaseRPCNullableParamsFix.md
- SupabaseRPCNullableParamsFixIMPL.md

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
- [ ] Read SchemaFinalv2.md for database queries

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (Outcome A/B handling)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Verified auth requirements (auth.uid() check)
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

**RED FLAGS exhibited:**
- [ ] None ✅

---

**Document Version:** 1.0
**Last Updated:** 2025-12-18
**Author:** Claude Opus 4.5
**Status:** Ready for Execution
