# Physical Gift RLS Policy - Implementation Plan

**Decision Source:** PhysicalGiftRLSPolicyFix.md
**Bug ID:** BUG-005-PhysicalGiftRLSInsert
**Severity:** High
**Implementation Date:** 2025-12-18
**LLM Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)

---

## Section 1: Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From PhysicalGiftRLSPolicyFix.md v1.6:**

**Bug Summary:** Physical gift claims fail silently because no INSERT RLS policy exists for `physical_gift_redemptions` table, causing shipping data to be lost while redemption appears successful.

**Root Cause:** The `physical_gift_redemptions` table has RLS enabled with SELECT and UPDATE policies for creators, but no INSERT policy exists. Same issue affects `commission_boost_redemptions`.

**Files Affected:**
1. `supabase/migrations/20251218100000_fix_substate_rls_insert.sql` (CREATE)
2. `supabase/migrations/20251218100001_claim_substate_rpc.sql` (CREATE)
3. `appcode/lib/repositories/missionRepository.ts` (MODIFY)

**Chosen Solution:**
Two-part fix from PhysicalGiftRLSPolicyFix.md Section 7:

1. **RLS Policies:** Add INSERT RLS policies for both `physical_gift_redemptions` and `commission_boost_redemptions` sub-state tables

2. **Atomic Transactions:** Replace direct INSERT calls with SECURITY DEFINER RPC functions that wrap redemption UPDATE + sub-state INSERT in a single transaction. RPCs derive user from `auth.uid()` (not caller-provided `p_user_id`).

3. **Repository Restructure:** Reorder `claimReward()` so sub-state types (`physical_gift`, `commission_boost`) are checked FIRST and return early, skipping the standalone UPDATE. Other reward types continue using existing UPDATE flow.

**Why This Solution:**
- True atomicity via PostgreSQL transactions (all-or-nothing)
- No race condition window between operations
- No risk of "double failure" (sub-state fails, then rollback fails)
- Industry standard for multi-table atomic writes
- SECURITY DEFINER with auth.uid() guard prevents forged user IDs
- No double-write: RPC handles UPDATE + INSERT, standalone UPDATE skipped

**From Audit Feedback:**
- Recommendation: APPROVED (v1.6 - all audit feedback incorporated)
- Critical Issues Addressed:
  - Audit #1: commission_boost INSERT policy required
  - Audit #2: Strengthened policy predicate with client_id
  - Audit #3: Atomic RPC transactions (not compensating writes)
  - Audit #4: auth.uid() guard in SECURITY DEFINER RPCs
  - Audit #5: Skip standalone UPDATE for RPC paths
  - Audit #6: Updated Section 9 data flow, API contract verification
- Concerns Addressed: All addressed per audit trail

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 3 (2 new migrations, 1 repository file)
- Lines changed: ~200 (2 migrations ~100 lines each, repository ~50 lines)
- Breaking changes: NO
- Schema changes: YES (RLS policies, RPC functions)
- API contract changes: NO (internal implementation change only)

---

**RED FLAG:** If you find yourself reconsidering the decision, questioning the solution, or analyzing alternatives - STOP. The decision phase is complete. This is execution phase. Follow the locked decision.

---

## Section 2: Pre-Implementation Verification (MUST PASS ALL GATES)

**No steps can proceed until all gates pass. No skipping.**

---

### Gate 1: Environment Verification

**Current Directory:**
```bash
pwd
```
**Expected:** `/home/jorge/Loyalty/Rumi` or `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree OR acceptable uncommitted changes

**Supabase CLI Available:**
```bash
npx supabase --version
```
**Expected:** Version output (confirms CLI available)

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Supabase CLI available: [version]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be created:**

**File 1:** `supabase/migrations/20251218100000_fix_substate_rls_insert.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | grep 20251218
```
**Expected:** File does NOT exist yet (will be created)

**File 2:** `supabase/migrations/20251218100001_claim_substate_rpc.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | grep 20251218
```
**Expected:** File does NOT exist yet (will be created)

**File to be modified:**

**File 3:** `appcode/lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**Migrations directory exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | head -5
```
**Expected:** Directory exists with existing migrations

**Migration ordering verification (CRITICAL):**
```bash
# Get latest existing migration timestamp
ls /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql | sort | tail -3
```
**Expected:** Latest migration is `20251217130000_fix_featured_mission_claimed_filter.sql` or earlier
**New migrations:** `20251218100000` and `20251218100001` are AFTER `20251217130000` ✓

**Ordering confirmation:**
- `20251217130000` < `20251218100000` < `20251218100001` ✓
- Migrations will apply in correct order

**Checklist:**
- [ ] Migration files do not exist yet: [confirmed]
- [ ] missionRepository.ts exists: [confirmed]
- [ ] Migrations directory exists: [confirmed]
- [ ] File paths match Fix.md
- [ ] **Migration ordering correct:** New migrations (`20251218...`) are after existing (`20251217...`)

---

### Gate 3: Current Code State Verification

**Read current state of claimReward function in missionRepository.ts:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1225-1315
```

**Expected Current State (key sections):**
```typescript
// Lines 1225-1254: Standalone UPDATE (runs for ALL reward types currently)
const valueData = reward.value_data as Record<string, unknown> | null;
const now = new Date().toISOString();

// 3. Update redemption to 'claimed'
const updateData: Record<string, unknown> = {
  status: 'claimed',
  claimed_at: now,
  updated_at: now,
};

// Add scheduling data for scheduled rewards
if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
  updateData.scheduled_activation_date = claimData.scheduledActivationDate;
  updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
}

const { error: updateError } = await supabase
  .from('redemptions')
  .update(updateData)
  .eq('id', redemptionId);

// Lines 1257-1276: commission_boost INSERT (separate, can fail)
if (reward.type === 'commission_boost') {
  // ... direct INSERT into commission_boost_redemptions
}

// Lines 1278-1306: physical_gift INSERT (separate, can fail)
if (reward.type === 'physical_gift' && claimData.shippingAddress) {
  // ... direct INSERT into physical_gift_redemptions
}
```

**Checklist:**
- [ ] Current code matches Fix.md Section 6: [YES / NO]
- [ ] Line numbers accurate (not drifted): [YES / NO]
- [ ] Standalone UPDATE exists before sub-state branches: [YES / NO]
- [ ] Direct INSERT calls exist for commission_boost and physical_gift: [YES / NO]

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification (Database Bug - REQUIRED)

**Verify physical_gift_redemptions table exists:**
```bash
grep -A 30 "CREATE TABLE.*physical_gift_redemptions" /home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql | head -35
```

**Verify commission_boost_redemptions table exists:**
```bash
grep -A 20 "CREATE TABLE.*commission_boost_redemptions" /home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql | head -25
```

**Verify current RLS policies (no INSERT policy for creators):**
```bash
grep -E "creators.*physical_gift|creators.*boost" /home/jorge/Loyalty/Rumi/supabase/migrations/00000000000000_baseline.sql
```
**Expected:** Shows SELECT and UPDATE policies, NO INSERT policies for creators

**Tables involved:**
- `physical_gift_redemptions`
- `commission_boost_redemptions`
- `redemptions` (parent table)
- `users` (for auth.uid() lookup)

**Column verification for physical_gift_redemptions:**
| Column in RPC | Column in Schema | Match? |
|---------------|------------------|--------|
| redemption_id | redemption_id | TBD |
| client_id | client_id | TBD |
| requires_size | requires_size | TBD |
| size_category | size_category | TBD |
| size_value | size_value | TBD |
| shipping_recipient_first_name | shipping_recipient_first_name | TBD |
| shipping_recipient_last_name | shipping_recipient_last_name | TBD |
| shipping_address_line1 | shipping_address_line1 | TBD |
| shipping_address_line2 | shipping_address_line2 | TBD |
| shipping_city | shipping_city | TBD |
| shipping_state | shipping_state | TBD |
| shipping_postal_code | shipping_postal_code | TBD |
| shipping_country | shipping_country | TBD |
| shipping_phone | shipping_phone | TBD |

**Checklist:**
- [ ] physical_gift_redemptions table exists
- [ ] commission_boost_redemptions table exists
- [ ] No INSERT RLS policy for creators confirmed
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] Foreign keys respected (redemption_id → redemptions.id)

---

### Gate 5: API Contract Verification (API Bug - REQUIRED)

**Verify claim endpoint contract:**
```bash
grep -A 50 "POST /api/missions/\[missionId\]/claim" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -60
```

**Endpoint:** `POST /api/missions/:missionId/claim`

**Response field verification:**
| Field in Code | Field in Contract | Match? |
|---------------|-------------------|--------|
| success | success | TBD |
| redemptionId | redemptionId | TBD |
| newStatus | newStatus | TBD |
| error | error | TBD |

**Checklist:**
- [ ] Endpoint contract found in API_CONTRACTS.md
- [ ] Request shape unchanged (shippingAddress, size, etc.)
- [ ] Response shape unchanged (success, redemptionId, newStatus, error)
- [ ] No breaking changes to contract

---

**GATE STATUS:** [ ] ALL GATES PASSED - Proceeding to implementation
**GATE STATUS:** [ ] GATE FAILED - [Which gate] - [Actual vs Expected]

**If any gate fails:** STOP. Do not proceed. Report discrepancy to user.

---

## Section 3: Implementation Steps

**Execution Rules:**
1. Steps MUST be executed in order (no skipping)
2. Each step MUST complete all checkpoints before next step
3. Pre-action reality check MUST match expected state
4. Post-action verification MUST confirm change
5. If any checkpoint fails, STOP and report

---

### Step 1: Create Migration 1 - RLS INSERT Policies

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify file does not exist:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql 2>&1
```

**Expected:** "No such file or directory"

**Reality Check:**
- [ ] File does not exist (ready to create)

---

#### Write Action

**NEW File Content:**
```sql
-- Migration: Add INSERT RLS policies for sub-state tables
-- Bug ID: BUG-005-PhysicalGiftRLSInsert
-- Purpose: Allow creators to insert their own physical gift and commission boost records
-- Date: 2025-12-18
-- Note: Both policies use strengthened predicate with client_id matching for defense-in-depth

-- Add INSERT policy for physical_gift_redemptions
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_physical_gift_redemptions"
ON "public"."physical_gift_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);

-- REQUIRED: Also fix commission_boost_redemptions (same pattern, same risk)
-- Verifies user owns parent redemption AND client_id matches (aligns with composite FK)
CREATE POLICY "creators_insert_own_boost_redemptions"
ON "public"."commission_boost_redemptions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."redemptions"
    WHERE "redemptions"."id" = "redemption_id"
      AND "redemptions"."user_id" = "auth"."uid"()
      AND "redemptions"."client_id" = "client_id"
  )
);
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql
Content: [above SQL]
```

---

#### Post-Action Verification

**Read created file:**
```bash
cat /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql
```

**Expected:** File contains both CREATE POLICY statements

**Verify file exists:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql
```

**State Verification:**
- [ ] File created successfully
- [ ] Contains physical_gift_redemptions INSERT policy
- [ ] Contains commission_boost_redemptions INSERT policy
- [ ] Both policies use EXISTS with client_id check

**Step Checkpoint:**
- [ ] Pre-action state matched expected (file didn't exist) ✅
- [ ] Write applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Create Migration 2 - Atomic RPC Functions

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql`
**Action Type:** CREATE

---

#### Pre-Action Reality Check

**Verify file does not exist:**
```bash
ls /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql 2>&1
```

**Expected:** "No such file or directory"

**Reality Check:**
- [ ] File does not exist (ready to create)

---

#### Write Action

**NEW File Content:**
```sql
-- Migration: Add atomic claim RPC functions for sub-state tables
-- Bug ID: BUG-005-PhysicalGiftRLSInsert
-- Purpose: Wrap redemption UPDATE + sub-state INSERT in atomic transaction
-- Date: 2025-12-18
-- SECURITY: Functions derive user from auth.uid() - do NOT trust caller-provided user IDs

-- ============================================
-- RPC 1: claim_physical_gift
-- Atomically claims redemption + inserts shipping data
-- SECURITY: Derives user from auth.uid() via users.auth_id
-- ============================================
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
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up internal user_id from auth_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = v_auth_uid
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

  -- If we reach here, both succeeded (auto-commit)
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error triggers automatic rollback
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_physical_gift FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_physical_gift TO authenticated;

-- ============================================
-- RPC 2: claim_commission_boost
-- Atomically claims redemption + inserts boost schedule
-- SECURITY: Derives user from auth.uid() via users.auth_id
-- ============================================
CREATE OR REPLACE FUNCTION claim_commission_boost(
  p_redemption_id UUID,
  p_client_id UUID,
  p_scheduled_date DATE,
  p_duration_days INTEGER,
  p_boost_rate NUMERIC
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
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Look up internal user_id from auth_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = v_auth_uid
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

  -- 2. Insert commission boost sub-state
  INSERT INTO commission_boost_redemptions (
    redemption_id, client_id,
    boost_status, scheduled_activation_date,
    duration_days, boost_rate
  ) VALUES (
    p_redemption_id, p_client_id,
    'scheduled', p_scheduled_date,
    p_duration_days, p_boost_rate
  );

  -- If we reach here, both succeeded (auto-commit)
  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', p_redemption_id,
    'new_status', 'claimed'
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error triggers automatic rollback
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_commission_boost FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_commission_boost TO authenticated;
```

**Write Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql
Content: [above SQL]
```

---

#### Post-Action Verification

**Read created file:**
```bash
head -50 /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql
```

**Verify both functions exist:**
```bash
grep "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql
```
**Expected:** Shows both `claim_physical_gift` and `claim_commission_boost`

**Verify auth.uid() guard present:**
```bash
grep "auth.uid()" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql | wc -l
```
**Expected:** Multiple occurrences (at least 4)

**State Verification:**
- [ ] File created successfully
- [ ] Contains claim_physical_gift function
- [ ] Contains claim_commission_boost function
- [ ] Both functions have auth.uid() guard
- [ ] Both functions have SECURITY DEFINER
- [ ] Both functions have EXCEPTION handler for rollback

**Step Checkpoint:**
- [ ] Pre-action state matched expected (file didn't exist) ✅
- [ ] Write applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Apply Migrations to Database

**Action Type:** EXECUTE

---

#### Pre-Action Reality Check

**Verify migrations exist:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218*.sql
```
**Expected:** Both migration files exist

**Reality Check:**
- [ ] Both migration files exist

---

#### Execute Action

**Apply migrations:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db push
```

**Expected:** Migrations applied successfully

---

#### Post-Action Verification

**Verify RLS policies created:**
```bash
npx supabase db query "SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('physical_gift_redemptions', 'commission_boost_redemptions') ORDER BY policyname;"
```
**Expected:** Shows INSERT policies for both tables

**Verify RPC functions created:**
```bash
npx supabase db query "SELECT proname FROM pg_proc WHERE proname IN ('claim_physical_gift', 'claim_commission_boost');"
```
**Expected:** Shows both function names

**State Verification:**
- [ ] Migrations applied without error
- [ ] INSERT policies visible in pg_policies
- [ ] RPC functions visible in pg_proc

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Migration applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update missionRepository.ts - Restructure claimReward Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Target Lines:** ~1225-1315
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read current state:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1225-1315
```

**Expected Current State:** Standalone UPDATE at ~1241-1254, followed by commission_boost branch at ~1257-1276, followed by physical_gift branch at ~1278-1306

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit. Report actual state vs expected.

---

#### Edit Action

**Strategy:** Replace the entire claimReward section from the standalone UPDATE through the physical_gift branch with the new restructured flow.

**OLD Code (to be replaced) - Lines ~1225-1313:**
```typescript
    const valueData = reward.value_data as Record<string, unknown> | null;
    const now = new Date().toISOString();

    // 3. Update redemption to 'claimed'
    const updateData: Record<string, unknown> = {
      status: 'claimed',
      claimed_at: now,
      updated_at: now,
    };

    // Add scheduling data for scheduled rewards
    if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
      updateData.scheduled_activation_date = claimData.scheduledActivationDate;
      updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
    }

    const { error: updateError } = await supabase
      .from('redemptions')
      .update(updateData)
      .eq('id', redemptionId);

    if (updateError) {
      console.error('[MissionRepository] Error claiming reward:', updateError);
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Failed to update redemption',
      };
    }

    // 4. Create sub-state records based on reward type
    if (reward.type === 'commission_boost') {
      const durationDays = (valueData?.duration_days as number) ?? 30;
      const boostPercent = (valueData?.percent as number) ?? 0;

      const { error: boostError } = await supabase
        .from('commission_boost_redemptions')
        .insert({
          redemption_id: redemptionId,
          client_id: clientId,
          boost_status: 'scheduled',
          scheduled_activation_date: claimData.scheduledActivationDate!,
          duration_days: durationDays,
          boost_rate: boostPercent,
        });

      if (boostError) {
        console.error('[MissionRepository] Error creating boost record:', boostError);
        // Note: Main redemption is already claimed, sub-state can be recovered
      }
    }

    if (reward.type === 'physical_gift' && claimData.shippingAddress) {
      const addr = claimData.shippingAddress;
      const requiresSize = (valueData?.requires_size as boolean) ?? false;

      const { error: giftError } = await supabase
        .from('physical_gift_redemptions')
        .insert({
          redemption_id: redemptionId,
          client_id: clientId,
          requires_size: requiresSize,
          size_category: (valueData?.size_category as string) ?? null,
          size_value: claimData.size ?? null,
          size_submitted_at: claimData.size ? now : null,
          shipping_recipient_first_name: addr.firstName,
          shipping_recipient_last_name: addr.lastName,
          shipping_address_line1: addr.line1,
          shipping_address_line2: addr.line2 ?? null,
          shipping_city: addr.city,
          shipping_state: addr.state,
          shipping_postal_code: addr.postalCode,
          shipping_country: addr.country ?? 'USA',
          shipping_phone: addr.phone ?? null,
          shipping_info_submitted_at: now,
        });

      if (giftError) {
        console.error('[MissionRepository] Error creating gift record:', giftError);
      }
    }

    return {
      success: true,
      redemptionId,
      newStatus: 'claimed',
    };
```

**NEW Code (replacement):**
```typescript
    const valueData = reward.value_data as Record<string, unknown> | null;
    const now = new Date().toISOString();

    // ============================================
    // SUB-STATE REWARD TYPES: Use atomic RPC (skip standalone UPDATE)
    // RPC handles BOTH redemption UPDATE + sub-state INSERT in one transaction
    // ============================================

    if (reward.type === 'physical_gift' && claimData.shippingAddress) {
      // Physical gift: Atomic RPC handles UPDATE + INSERT
      const addr = claimData.shippingAddress;
      const requiresSize = (valueData?.requires_size as boolean) ?? false;

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

      if (rpcError || !result?.success) {
        console.error('[MissionRepository] Physical gift claim failed:', rpcError || result?.error);
        return {
          success: false,
          redemptionId,
          newStatus: 'claimable',
          error: result?.error ?? 'Failed to claim physical gift',
        };
      }

      return { success: true, redemptionId, newStatus: 'claimed' };
    }

    if (reward.type === 'commission_boost') {
      // Commission boost: Atomic RPC handles UPDATE + INSERT
      const durationDays = (valueData?.duration_days as number) ?? 30;
      const boostPercent = (valueData?.percent as number) ?? 0;

      const { data: result, error: rpcError } = await supabase.rpc('claim_commission_boost', {
        p_redemption_id: redemptionId,
        p_client_id: clientId,
        p_scheduled_date: claimData.scheduledActivationDate,
        p_duration_days: durationDays,
        p_boost_rate: boostPercent,
      });

      if (rpcError || !result?.success) {
        console.error('[MissionRepository] Commission boost claim failed:', rpcError || result?.error);
        return {
          success: false,
          redemptionId,
          newStatus: 'claimable',
          error: result?.error ?? 'Failed to schedule commission boost',
        };
      }

      return { success: true, redemptionId, newStatus: 'claimed' };
    }

    // ============================================
    // OTHER REWARD TYPES: Use existing standalone UPDATE
    // (raffle, points, discount, etc. - no sub-state table)
    // ============================================

    const updateData: Record<string, unknown> = {
      status: 'claimed',
      claimed_at: now,
      updated_at: now,
    };

    if (reward.redemption_type === 'scheduled' && claimData.scheduledActivationDate) {
      updateData.scheduled_activation_date = claimData.scheduledActivationDate;
      updateData.scheduled_activation_time = claimData.scheduledActivationTime ?? '19:00:00';
    }

    const { error: updateError } = await supabase
      .from('redemptions')
      .update(updateData)
      .eq('id', redemptionId);

    if (updateError) {
      console.error('[MissionRepository] Error claiming reward:', updateError);
      return {
        success: false,
        redemptionId,
        newStatus: 'claimable',
        error: 'Failed to update redemption',
      };
    }

    return { success: true, redemptionId, newStatus: 'claimed' };
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
Old String: [exact match of OLD code above]
New String: [exact replacement of NEW code above]
```

**Change Summary:**
- Lines removed: ~88
- Lines added: ~95
- Net change: +7 lines
- Key change: Sub-state types now checked FIRST with RPC calls, returning early. Standalone UPDATE moved to end for other types.

---

#### Post-Action Verification

**Read modified state:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1225-1320
```

**Verify RPC calls present:**
```bash
grep "supabase.rpc" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** Shows `claim_physical_gift` and `claim_commission_boost` RPC calls

**Verify physical_gift checked before standalone UPDATE:**
```bash
grep -n "reward.type === 'physical_gift'" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** Line number should be BEFORE the standalone UPDATE

**CRITICAL: Verify OLD direct INSERT code is REMOVED (no double-write):**
```bash
# Verify NO direct INSERT to physical_gift_redemptions remains
grep "from('physical_gift_redemptions').insert" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** NO matches (old INSERT removed)

```bash
# Verify NO direct INSERT to commission_boost_redemptions remains
grep "from('commission_boost_redemptions').insert" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** NO matches (old INSERT removed)

**Verify early returns exist for RPC paths (prevents reaching standalone UPDATE):**
```bash
grep -A2 "supabase.rpc('claim_physical_gift'" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts | grep "return"
```
**Expected:** Shows `return { success: true, redemptionId, newStatus: 'claimed' }` after RPC

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected
- [ ] RPC calls present for both sub-state types
- [ ] Sub-state types checked BEFORE standalone UPDATE
- [ ] Early returns prevent falling through to standalone UPDATE
- [ ] **NO direct INSERT to physical_gift_redemptions** (old code removed)
- [ ] **NO direct INSERT to commission_boost_redemptions** (old code removed)

---

#### Step Verification

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new type errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]
**If FAIL:** [Exact failure point and actual state]

---

## Section 4: Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `claim_physical_gift` RPC
```sql
-- All queries include client_id filtering
SELECT id INTO v_user_id FROM users WHERE auth_id = v_auth_uid AND client_id = p_client_id;
-- Redemption verification
SELECT 1 FROM redemptions WHERE id = p_redemption_id AND user_id = v_user_id AND client_id = p_client_id ...
-- UPDATE includes client_id
UPDATE redemptions SET ... WHERE id = p_redemption_id AND user_id = v_user_id AND client_id = p_client_id;
-- INSERT includes client_id
INSERT INTO physical_gift_redemptions (redemption_id, client_id, ...) VALUES (p_redemption_id, p_client_id, ...);
```

**Security Checklist:**
- [ ] `client_id` filter present in user lookup
- [ ] `client_id` filter present in redemption verification
- [ ] `client_id` filter present in UPDATE
- [ ] `client_id` included in INSERT
- [ ] No cross-tenant data exposure possible

**Query 2:** `claim_commission_boost` RPC
```sql
-- Same pattern as claim_physical_gift
```

**Security Checklist:**
- [ ] Same client_id filtering pattern as Query 1
- [ ] No cross-tenant data exposure possible

**Query 3:** RLS INSERT Policies
```sql
-- Both policies verify client_id matches parent redemption
EXISTS (
  SELECT 1 FROM "public"."redemptions"
  WHERE "redemptions"."id" = "redemption_id"
    AND "redemptions"."user_id" = "auth"."uid"()
    AND "redemptions"."client_id" = "client_id"
)
```

**Security Checklist:**
- [ ] Policy checks user_id = auth.uid()
- [ ] Policy checks client_id matches parent redemption
- [ ] Defense-in-depth: Even if RPC bypasses RLS, policy exists as backup

---

### Authentication Check

**RPC Functions:**
- [ ] SECURITY DEFINER functions verify auth.uid() is not NULL
- [ ] User lookup derives internal user_id from auth.uid()
- [ ] Cannot forge user_id - derived from JWT

**RLS Policies:**
- [ ] Policies use auth.uid() for ownership verification
- [ ] Authenticated role required for GRANT EXECUTE

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED ✅ / [ ] ISSUES FOUND ❌

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.

---

## Section 5: Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Bug-Specific Validation

**Test physical gift claim flow:**
```bash
# Start dev server
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev &

# Wait for server to start, then test endpoint manually
# Or check server logs for successful claim
```

**Expected:** Physical gift claim creates both redemption update AND physical_gift_redemptions row

**Verification Query (run in Supabase dashboard):**
```sql
-- After testing, verify physical_gift_redemptions row exists
SELECT r.id, r.status, pgr.shipping_city
FROM redemptions r
LEFT JOIN physical_gift_redemptions pgr ON r.id = pgr.redemption_id
WHERE r.id = '[test_redemption_id]';
```
**Expected:** pgr.shipping_city is NOT NULL (row was created)

**Status:**
- [ ] Bug-specific validation passed ✅

---

### Verification 2: No New Errors Introduced

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** Same or fewer errors than before
**Actual:** [count]

**Status:**
- [ ] No new type errors introduced ✅

---

### Verification 3: Modified Files Compile/Work

**Type check repository file:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1
```
**Expected:** No errors on modified file
**Actual:** [document output]

**Status:**
- [ ] All modified files compile ✅

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] All column names in RPC match physical_gift_redemptions table
- [ ] All column names in RPC match commission_boost_redemptions table
- [ ] Data types correct (UUID, TEXT, BOOLEAN, DATE, INTEGER, NUMERIC)
- [ ] Foreign key relationships respected

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [ ] Response shape unchanged: `{ success, redemptionId, newStatus, error? }`
- [ ] No breaking changes to existing consumers
- [ ] Error responses use same format

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
git diff appcode/lib/repositories/missionRepository.ts
```

**Expected Changes:**
- `supabase/migrations/20251218100000_fix_substate_rls_insert.sql`: NEW (30 lines)
- `supabase/migrations/20251218100001_claim_substate_rpc.sql`: NEW (180 lines)
- `appcode/lib/repositories/missionRepository.ts`: ~100 lines changed

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 7: Runtime Test

**Test Command:**
```bash
# Start dev server and manually test physical gift claim flow
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev
```

**Manual Test Steps:**
1. Login as test creator
2. Navigate to mission with physical gift reward
3. Complete mission to get claimable reward
4. Submit claim with shipping address
5. Verify success message
6. Check database for physical_gift_redemptions row

**Expected:** Claim succeeds AND physical_gift_redemptions row created with shipping data
**Actual:** [actual behavior]

**Status:**
- [ ] Runtime test passed ✅

---

### Verification 8: Double-Write Sanity Check (CRITICAL)

**Purpose:** Confirm no double-write conflict exists - only ONE redemption update path per claim type.

**Code Flow Verification:**
```bash
# Count redemption UPDATE statements in claimReward function
grep -n "from('redemptions').update" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** Only ONE match (the standalone UPDATE for non-sub-state types at end of function)

**Verify RPC paths return early (never reach standalone UPDATE):**
```bash
# Show the flow: RPC call followed by early return
grep -B5 -A15 "supabase.rpc('claim_physical_gift'" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts | tail -20
```
**Expected:** Shows `return { success: true, ...}` BEFORE standalone UPDATE section

**Git diff verification of removal:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff appcode/lib/repositories/missionRepository.ts | grep -E "^-.*from\('physical_gift_redemptions'\).insert|^-.*from\('commission_boost_redemptions'\).insert"
```
**Expected:** Shows removed lines (old direct INSERT statements)

**Sanity Checklist:**
- [ ] Only ONE `from('redemptions').update` in claimReward function
- [ ] RPC paths (`physical_gift`, `commission_boost`) return early with success/failure
- [ ] Standalone UPDATE only reachable for other reward types (`raffle`, `points`, etc.)
- [ ] Git diff confirms old direct INSERT code is removed (not duplicated)
- [ ] No path exists where both RPC and standalone UPDATE run for same claim

**Status:**
- [ ] Double-write sanity check passed ✅

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED ✅ / [ ] FAILED ❌

**If ALL PASSED:**
- Implementation complete
- Ready for audit
- Safe to commit

**If FAILED:**
- [Which verification failed]
- [Actual vs Expected]
- [Investigation needed]

---

## Section 6: Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-18
**Executor:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Decision Source:** PhysicalGiftRLSPolicyFix.md v1.6
**Implementation Doc:** PhysicalGiftRLSPolicyFixIMPL.md
**Bug ID:** BUG-005-PhysicalGiftRLSInsert

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Create Migration 1 (RLS policies) - Pre ✅ - Applied ✅ - Post ✅
[Timestamp] Step 2: Create Migration 2 (RPC functions) - Pre ✅ - Applied ✅ - Post ✅
[Timestamp] Step 3: Apply migrations - Pre ✅ - Applied ✅ - Post ✅
[Timestamp] Step 4: Update missionRepository.ts - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Bug-specific validation ✅
[Timestamp] No new errors ✅
[Timestamp] Files compile ✅
[Timestamp] Schema alignment ✅
[Timestamp] API contract ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Runtime test ✅
[Timestamp] Overall: [PASS/FAIL]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251218100000_fix_substate_rls_insert.sql` - CREATE - RLS INSERT policies
2. `supabase/migrations/20251218100001_claim_substate_rpc.sql` - CREATE - Atomic RPC functions
3. `appcode/lib/repositories/missionRepository.ts` - MODIFY - Use RPC calls, restructure flow

**Total:** 3 files modified, ~310 lines added/changed (net)

---

### Bug Resolution

**Before Implementation:**
- Bug: Physical gift claims fail silently - shipping data lost, redemption marked claimed with no sub-state
- Root cause: No INSERT RLS policy for physical_gift_redemptions table

**After Implementation:**
- Bug: RESOLVED ✅
- Verification: physical_gift_redemptions row created with shipping data after claim

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied
- Created: PhysicalGiftRLSPolicyFix.md
- Documented 20 sections (including audit trail)
- Proposed solution: RLS policies + atomic RPCs + repository restructure

**Step 2: Audit Phase**
- 6 external LLM audits completed
- Recommendation: APPROVED (v1.6)
- All feedback addressed:
  - Audit #1: commission_boost required
  - Audit #2: Strengthened policy predicate
  - Audit #3: Atomic RPC transactions
  - Audit #4: auth.uid() guard
  - Audit #5: Skip standalone UPDATE
  - Audit #6: Update data flow, API contract verification

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: PhysicalGiftRLSPolicyFixIMPL.md
- Executed 4 implementation steps
- All verifications passed ✅

**Step 4: Current Status**
- Implementation: [COMPLETE/IN PROGRESS]
- Bug resolved: [YES/NO]
- Ready for commit: [YES/NO]

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration files created
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251218*.sql
# Should show: 2 files

# 2. Verify RLS policies in migration
grep "CREATE POLICY" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100000_fix_substate_rls_insert.sql
# Should show: 2 policies (physical_gift, commission_boost)

# 3. Verify RPC functions in migration
grep "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql
# Should show: 2 functions

# 4. Verify auth.uid() guard in RPCs
grep "auth.uid()" /home/jorge/Loyalty/Rumi/supabase/migrations/20251218100001_claim_substate_rpc.sql | wc -l
# Should show: 4+ occurrences

# 5. Verify repository uses RPC calls
grep "supabase.rpc" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
# Should show: claim_physical_gift and claim_commission_boost

# 6. Verify no type errors on modified file
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1
# Should show: no errors

# 7. Verify git diff
cd /home/jorge/Loyalty/Rumi && git diff --stat
# Should show: 3 files changed
```

**Expected Results:**
- 2 migration files created ✅
- 2 RLS INSERT policies ✅
- 2 RPC functions with auth.uid() guard ✅
- Repository uses RPC calls ✅
- No type errors ✅
- Git diff shows expected files ✅

**Audit Status:** [ ] VERIFIED ✅ / [ ] ISSUES FOUND ❌
**If issues:** [List discrepancies]

---

### Metrics

**Implementation Efficiency:**
- Gates passed: [5/5]
- Steps completed: [4/4]
- Verifications passed: [8/8]
- Errors encountered: [0]
- Retries needed: [0]

**Code Quality:**
- Files modified: 3
- Lines changed: ~310
- Breaking changes: 0
- Security verified: YES
- Tests updated: N/A (manual testing)

---

## Section 7: Document Status

**Implementation Date:** 2025-12-18
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Current code state verified
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] Auth requirements met ✅

**Verification:**
- [ ] Bug-specific validation passed ✅
- [ ] No new errors ✅
- [ ] Files compile ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [ ] SUCCESS ✅ / [ ] FAILED ❌

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update PhysicalGiftRLSPolicyFix.md status to "Implemented"

**If FAILED:**
- Failure point: [Step N / Verification M]
- Actual state: [description]
- Expected state: [description]
- Investigation needed: [YES]

---

### Next Actions

**If implementation succeeded:**
1. [ ] Git commit with message (template below)
2. [ ] Update PhysicalGiftRLSPolicyFix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Test physical gift claim flow end-to-end

**Git Commit Message Template:**
```
fix: Add RLS INSERT policies and atomic RPCs for sub-state tables

Resolves BUG-005: Physical gift claims fail silently due to missing RLS INSERT policy

Changes:
- supabase/migrations/20251218100000: Add INSERT RLS policies for physical_gift_redemptions and commission_boost_redemptions
- supabase/migrations/20251218100001: Add atomic RPC functions (claim_physical_gift, claim_commission_boost) with auth.uid() guard
- appcode/lib/repositories/missionRepository.ts: Use RPC calls for sub-state types, restructure flow to skip standalone UPDATE

Security:
- RPCs derive user from auth.uid() (cannot be forged)
- All operations include client_id for multi-tenant isolation
- SECURITY DEFINER with explicit auth checks

References:
- PhysicalGiftRLSPolicyFix.md v1.6
- PhysicalGiftRLSPolicyFixIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**If implementation failed:**
1. [ ] Review failure point
2. [ ] Check for line number drift
3. [ ] Verify file state matches Fix.md assumptions
4. [ ] Report to user for guidance

---

## Section 8: Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Saw EXACT expected output (not guessed)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified ACTUAL vs EXPECTED (not assumed)
- [ ] Read SchemaFinalv2.md for database queries
- [ ] Read API_CONTRACTS.md for API changes

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (all 6 audits)
- [ ] Did not second-guess user's choice

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Verified auth requirements (auth.uid() guard)
- [ ] No cross-tenant data exposure

### Documentation Completeness
- [ ] All sections present (no skipped sections)
- [ ] All commands documented (no missing steps)
- [ ] All outputs recorded (no unverified claims)
- [ ] Audit trail complete (second LLM can verify)

### Code Quality
- [ ] No "... rest of code ..." placeholders used
- [ ] No "around line X" approximations used
- [ ] No "should work" assumptions made
- [ ] No "probably" or "likely" hedging used

---

**META-VERIFICATION STATUS:** [ ] ALL CHECKS PASSED ✅ / [ ] CHECKS FAILED ❌

**If any check failed:** This document is NOT complete. Go back and fix.

**RED FLAGS you exhibited (if any):**
- [ ] None ✅
- [ ] Used placeholder code
- [ ] Approximated line numbers
- [ ] Skipped verification
- [ ] Re-analyzed decision
- [ ] Assumed without verifying
- [ ] Skipped security check
- [ ] Other: [describe]

**If RED FLAGS exist:** Document is unreliable. Restart with strict adherence to protocol.

---

**Document Version:** 1.0
**Created:** 2025-12-18
**Status:** READY FOR EXECUTION
