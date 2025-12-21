# Claim API Performance Optimization - Enhancement Implementation Plan

**Specification Source:** ClaimAPIPerformanceEnhancement.md
**Enhancement ID:** ENH-001
**Type:** Enhancement
**Priority:** Medium
**Implementation Date:** 2025-12-21
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From ClaimAPIPerformanceEnhancement.md:**

**Enhancement Summary:** The claim API takes ~2000ms due to 12 sequential database queries when it could complete in <500ms using an atomic RPC.

**Business Need:** Users experience noticeable delay between clicking "Claim" and seeing success toast, degrading UX.

**Files to Create/Modify:**
- CREATE: `supabase/migrations/YYYYMMDDHHMMSS_claim_instant_reward_rpc.sql`
- REGENERATE: `lib/types/database.ts`
- MODIFY: `lib/repositories/missionRepository.ts`
- MODIFY: `lib/services/missionService.ts`

**Specified Solution:**
Create atomic RPC `claim_instant_reward` that validates and claims in single database roundtrip for instant reward types (gift_card, spark_ads, experience) and raffle winner claims with empty POST body.

**Acceptance Criteria (From Enhancement.md Section 16):**
1. [ ] RPC function `claim_instant_reward` created and deployed
2. [ ] `claimInstantReward` function added to missionRepository
3. [ ] missionService uses fast path for instant rewards
4. [ ] Type checker passes
5. [ ] Build completes
6. [ ] Manual verification: claim completes in < 1 second
7. [ ] Dev server logs show < 500ms response time
8. [ ] All existing tests still pass

**From Audit Feedback:**
- Recommendation: APPROVE
- Critical Issues Addressed: auth_id → id (fixed in v1.1), deleted_at check (already present)
- Concerns Addressed: Type alignment (13d), Fallback behavior (13c), Scope noted

**Expected Outcome:**
- Feature implemented: YES
- Files created: 1 (migration)
- Files modified: 2 (repository, service) + 1 regenerated (database.ts)
- Lines added: ~100
- Breaking changes: NO
- Schema changes: NO (RPC only, no table changes)
- API contract changes: NO (same response shape, just faster)

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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable state

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Gap Confirmation (CRITICAL)

**Purpose:** Verify the RPC DOESN'T already exist.

**Search for existing implementation:**
```bash
grep -r "claim_instant_reward" /home/jorge/Loyalty/Rumi/supabase/migrations/
grep -r "claimInstantReward" /home/jorge/Loyalty/Rumi/appcode/lib/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for RPC name: [result]
- [ ] Grep executed for function name: [result]
- [ ] Gap confirmed to still exist: [YES / NO]

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related RPCs to ensure consistent pattern.

**Search for related implementations:**
```bash
grep -l "claim_physical_gift\|claim_commission_boost" /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql
grep -n "isClaimRPCResult" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts | head -5
```

**Related code found:**
| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `20251218100002_fix_rpc_auth_column.sql` | `claim_physical_gift` | Auth pattern template | Follow same `WHERE id = v_auth_uid` pattern |
| `missionRepository.ts` line 231 | `isClaimRPCResult` | Type guard | Reuse existing guard |

**Checklist:**
- [ ] Related code identified: [count] files
- [ ] Duplication risk assessed: LOW (new RPC, reuses patterns)
- [ ] Integration points identified: missionRepository, missionService

---

### Gate 4: Files to Modify Verification

**File 1:** `/home/jorge/Loyalty/Rumi/supabase/migrations/` (directory for new migration)
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/ | tail -5
```
**Expected:** Directory exists, can see recent migrations

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** File exists

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts
```
**Expected:** File exists

**Checklist:**
- [ ] All files to modify exist: [count]
- [ ] Migration directory accessible: [YES]
- [ ] File paths match Enhancement.md

---

### Gate 5: Schema Verification

**Purpose:** Verify tables/columns used in RPC exist.

**Read SchemaFinalv2.md for relevant tables:**
```bash
grep -A 5 "redemptions\|mission_progress\|missions\|rewards\|users" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md | head -40
```

**Tables involved:** users, redemptions, mission_progress, missions, rewards

**Column verification:**
| Column in RPC | Table | Exists? | Type Match? |
|---------------|-------|---------|-------------|
| `users.id` | users | ✅ | UUID |
| `users.current_tier` | users | ✅ | VARCHAR |
| `redemptions.mission_progress_id` | redemptions | ✅ | UUID |
| `redemptions.status` | redemptions | ✅ | VARCHAR |
| `redemptions.deleted_at` | redemptions | ✅ | TIMESTAMP |
| `mission_progress.status` | mission_progress | ✅ | VARCHAR |
| `missions.tier_eligibility` | missions | ✅ | VARCHAR |
| `rewards.type` | rewards | ✅ | VARCHAR |

**Checklist:**
- [ ] All required columns exist in schema
- [ ] Data types compatible
- [ ] No schema migration needed (RPC only)

---

### Gate 6: API Contract Verification

**Purpose:** Verify claim endpoint contract unchanged.

**Read API_CONTRACTS.md for claim endpoint:**
```bash
grep -A 20 "POST /api/missions/:id/claim" /home/jorge/Loyalty/Rumi/API_CONTRACTS.md | head -25
```

**Endpoint:** `POST /api/missions/:id/claim`

**Contract alignment:**
| Aspect | Contract | RPC Impact |
|--------|----------|------------|
| Request body | Optional scheduling data | No change - empty body for instant |
| Response shape | `{ success, message, redemptionId, nextAction }` | No change |
| Status codes | 200, 400, 401, 403, 404, 409 | No change |

**Checklist:**
- [ ] Response structure unchanged
- [ ] No breaking changes to existing API
- [ ] Error responses maintained

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
4. For MODIFIED files: Pre-action check MUST match expected state
5. If any checkpoint fails, STOP and report

---

### Step 0: Quick Parity Re-Check (Before Execution)

**Purpose:** Verify service validations haven't changed since Enhancement.md was written.

**Command:**
```bash
grep -n "progress?.status\|redemption.status\|tierEligibility" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -10
```

**Expected validations in claimMissionReward (lines ~1055-1095):**
1. `progress.status === 'completed'`
2. `redemption.status === 'claimable'`
3. `tierEligibility !== 'all' && tierEligibility !== currentTierId`

**Checklist:**
- [ ] Service validations unchanged from Enhancement.md analysis
- [ ] RPC validation logic still matches
- [ ] Safe to proceed

**If validations changed:** STOP. Update RPC to match before proceeding.

---

### Step 1: Create Migration File for RPC

**Target File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql`
**Action Type:** CREATE
**Purpose:** Add atomic RPC function for instant reward claims

---

**New File Content:**
```sql
-- Migration: Add atomic claim RPC for instant rewards and raffle winner claims
-- Enhancement ID: ENH-001
-- Covers: gift_card, spark_ads, experience, and raffle winner claims (all use empty POST body)
-- Purpose: Single DB call replaces 10+ sequential queries for these claim types
-- Date: 2025-12-21
-- SYNC: Must match missionService.claimMissionReward() validation logic

CREATE OR REPLACE FUNCTION claim_instant_reward(
  p_mission_progress_id UUID,
  p_client_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := NOW();
  v_user_id UUID;
  v_user_tier TEXT;
  v_auth_uid UUID := auth.uid();
  v_redemption_id UUID;
  v_redemption_status TEXT;
  v_reward_type TEXT;
  v_mission_status TEXT;
  v_tier_eligibility TEXT;
BEGIN
  -- SECURITY: Derive user_id from auth.uid() - cannot be forged
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- In this schema, users.id = auth.uid() directly (no separate auth_id column)
  -- Pattern from 20251218100002_fix_rpc_auth_column.sql
  SELECT id, current_tier INTO v_user_id, v_user_tier
  FROM users
  WHERE id = v_auth_uid
    AND client_id = p_client_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Single query: Get redemption + validate in one shot
  SELECT
    r.id,
    r.status,
    rw.type,
    mp.status,
    m.tier_eligibility
  INTO
    v_redemption_id,
    v_redemption_status,
    v_reward_type,
    v_mission_status,
    v_tier_eligibility
  FROM redemptions r
  JOIN mission_progress mp ON r.mission_progress_id = mp.id
  JOIN missions m ON mp.mission_id = m.id
  JOIN rewards rw ON r.reward_id = rw.id
  WHERE r.mission_progress_id = p_mission_progress_id
    AND r.user_id = v_user_id
    AND r.client_id = p_client_id
    AND r.deleted_at IS NULL;

  -- Validation checks (matches missionService.claimMissionReward validation)
  IF v_redemption_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;

  IF v_mission_status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed yet');
  END IF;

  IF v_redemption_status != 'claimable' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reward already claimed or not available',
      'redemption_id', v_redemption_id
    );
  END IF;

  IF v_tier_eligibility != 'all' AND v_tier_eligibility != v_user_tier THEN
    RETURN jsonb_build_object('success', false, 'error', 'You are no longer eligible for this reward');
  END IF;

  -- Only allow instant reward types (works for both regular missions and raffle winners)
  -- Raffle winners with gift_card/spark_ads/experience prizes use same empty-body claim
  IF v_reward_type NOT IN ('gift_card', 'spark_ads', 'experience') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This reward type requires additional information',
      'reward_type', v_reward_type
    );
  END IF;

  -- Atomic update
  UPDATE redemptions
  SET status = 'claimed', claimed_at = v_now, updated_at = v_now
  WHERE id = v_redemption_id
    AND user_id = v_user_id
    AND client_id = p_client_id
    AND status = 'claimable';  -- Re-check for race condition

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Claim failed - status may have changed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'new_status', 'claimed',
    'message', 'Reward claimed successfully!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Security: Grant execute to authenticated users only
REVOKE ALL ON FUNCTION claim_instant_reward FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_instant_reward TO authenticated;
```

**Create Command:**
```
Tool: Write
File: /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql
Content: [full content above]
```

**Post-Create Verification:**
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql
wc -l /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql
```
**Expected:** File exists, ~110 lines

**Step Checkpoint:**
- [ ] Migration file created successfully ✅
- [ ] File exists with correct line count ✅
- [ ] SQL syntax appears correct ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Apply Migration to Local Supabase

**Target:** Local Supabase database
**Action Type:** EXECUTE
**Purpose:** Create the RPC function in database

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db push
```
**Alternative if needed:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase migration up
```

**Expected:** Migration applied successfully

**Post-Apply Verification:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase db diff
```
**Expected:** No pending changes (migration applied)

**Step Checkpoint:**
- [ ] Migration command executed ✅
- [ ] No errors in output ✅
- [ ] RPC function created in database ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Regenerate Supabase Types

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts`
**Action Type:** REGENERATE
**Purpose:** Add RPC types to TypeScript

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && npx supabase gen types typescript --local > appcode/lib/types/database.ts
```

**Post-Regenerate Verification:**
```bash
grep -n "claim_instant_reward" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts
```
**Expected:** Function appears in generated types

**Step Checkpoint:**
- [ ] Types regenerated successfully ✅
- [ ] `claim_instant_reward` appears in database.ts ✅
- [ ] No syntax errors in generated file ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Add claimInstantReward Function to Repository

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add new function to call the RPC

---

**Pre-Action Reality Check:**

**Read Current State (find insertion point after claimReward function):**
```bash
grep -n "async claimReward\|^  },\?$" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts | tail -10
```

**Expected:** Find end of claimReward function to insert after

**Find exact insertion point:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts lines 1355-1370
```

**Reality Check:**
- [ ] Read command executed
- [ ] Found insertion point after claimReward function
- [ ] Line numbers accurate

---

**Edit Action:**

**Insert NEW Code after claimReward function (before closing brace of missionRepository object):**

```typescript
  /**
   * Claim an instant reward (gift_card, spark_ads, experience) or raffle winner prize via atomic RPC.
   * Replaces findByProgressId + claimReward for instant reward types.
   * SYNC: Must match missionService.claimMissionReward() validation logic.
   *
   * @param missionProgressId - The mission_progress.id (NOT missions.id)
   * @param clientId - Client ID for multitenancy
   * @returns ClaimResult with success/error status
   */
  async claimInstantReward(
    missionProgressId: string,
    clientId: string
  ): Promise<ClaimResult> {
    // Use createClient() - needs auth context for auth.uid() in RPC
    const supabase = await createClient();

    const { data: result, error: rpcError } = await supabase.rpc('claim_instant_reward', {
      p_mission_progress_id: missionProgressId,
      p_client_id: clientId,
    });

    // Use existing isClaimRPCResult type guard (line 231)
    if (rpcError || !isClaimRPCResult(result) || !result.success) {
      const errorMsg = isClaimRPCResult(result) ? result.error : 'Invalid RPC response';
      console.error('[MissionRepository] Instant reward claim failed:', rpcError || errorMsg);
      return {
        success: false,
        redemptionId: result?.redemption_id ?? '',
        newStatus: 'claimable',
        error: errorMsg ?? 'Failed to claim reward',
      };
    }

    return {
      success: true,
      redemptionId: result.redemption_id,
      newStatus: result.new_status,
    };
  },
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
Old String: [end of claimReward function - exact match from file]
New String: [end of claimReward function + new claimInstantReward function]
```

---

**Post-Action Verification:**
```bash
grep -n "claimInstantReward" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** Function appears in file

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/repositories/missionRepository.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Function added to missionRepository ✅
- [ ] Type check passes ✅
- [ ] No syntax errors ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Modify missionService to Use Fast Path

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
**Action Type:** MODIFY
**Purpose:** Add early return for instant rewards using new RPC

---

**Pre-Action Reality Check:**

**Read Current State (beginning of claimMissionReward function):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts lines 1032-1055
```

**Expected Current State:** Function starts with findByProgressId call

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected
- [ ] Line numbers accurate

---

**Edit Action:**

**Insert fast path BEFORE the findByProgressId call (after function signature, before existing logic):**

```typescript
  // FAST PATH: For instant rewards with no claimData, use atomic RPC
  // This skips the expensive findByProgressId + validation flow
  // SYNC: RPC validates same logic - keep in sync if validation changes
  const hasClaimData = claimData.scheduledActivationDate ||
                       claimData.shippingAddress ||
                       claimData.size;

  if (!hasClaimData) {
    // Likely instant reward - try atomic RPC first
    const instantResult = await missionRepository.claimInstantReward(
      missionProgressId,
      clientId
    );

    if (instantResult.success) {
      return {
        success: true,
        message: 'Reward claimed successfully!',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'show_confirmation',
          status: instantResult.newStatus,
          message: 'We will deliver your reward in up to 72 hours.',
        },
      };
    }

    // If RPC failed with "requires additional information", fall through to normal flow
    // This handles edge cases where reward type changed or needs scheduled data
    if (!instantResult.error?.includes('requires additional information')) {
      return {
        success: false,
        message: instantResult.error ?? 'Failed to claim reward',
        redemptionId: instantResult.redemptionId,
        nextAction: {
          type: 'navigate_to_missions',
          status: 'error',
          message: 'Please try again.',
        },
      };
    }
    // Fall through to existing slow path for scheduled/physical_gift
  }

  // EXISTING FLOW: For scheduled rewards (commission_boost, discount) and physical_gift
```

---

**Post-Action Verification:**
```bash
grep -n "claimInstantReward\|FAST PATH" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -5
```
**Expected:** Fast path code appears in file

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit lib/services/missionService.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Fast path added to missionService ✅
- [ ] Type check passes ✅
- [ ] Fallback logic correct ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`

**Existing Import (should already exist):**
```typescript
import { missionRepository } from '@/lib/repositories/missionRepository';
```

**Verification:**
```bash
grep -n "missionRepository" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -3
```
**Expected:** Import exists, no new import needed

**Checklist:**
- [ ] missionRepository already imported
- [ ] No new imports needed
- [ ] Types align (ClaimResult interface)

---

### Call Site Verification

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts`
**Call:**
```typescript
const instantResult = await missionRepository.claimInstantReward(
  missionProgressId,
  clientId
);
```

**Verification:**
- [ ] Arguments match function signature (missionProgressId: string, clientId: string)
- [ ] Return type handled correctly (ClaimResult with success, redemptionId, error)
- [ ] Error handling in place (checks success, falls through if needed)

---

### Type Alignment Verification

**Existing Type Used:**
```typescript
interface ClaimResult {
  success: boolean;
  redemptionId: string;
  newStatus: string;
  error?: string;
}
```

**Verification:**
- [ ] ClaimResult interface already exists in missionRepository.ts
- [ ] RPC return shape matches isClaimRPCResult guard
- [ ] No type conflicts

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `claim_instant_reward` RPC
```sql
-- User lookup
WHERE id = v_auth_uid
  AND client_id = p_client_id;

-- Redemption lookup
WHERE r.mission_progress_id = p_mission_progress_id
  AND r.user_id = v_user_id
  AND r.client_id = p_client_id
  AND r.deleted_at IS NULL;

-- Update
WHERE id = v_redemption_id
  AND user_id = v_user_id
  AND client_id = p_client_id
  AND status = 'claimable';
```

**Security Checklist:**
- [ ] `client_id = p_client_id` present in all queries
- [ ] `user_id` derived from auth.uid() (not trusted from caller)
- [ ] No cross-tenant data exposure possible

---

### Grep Verification (Explicit Check)

```bash
grep -n "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql
```
**Expected:** client_id filter on lines with WHERE clauses
**Actual:** [document actual output]

---

### Authentication Check

**RPC:** `claim_instant_reward`

**Checklist:**
- [ ] `auth.uid()` used to derive user (line 17 in RPC)
- [ ] Returns error if not authenticated
- [ ] User ID never trusted from caller (derived from auth)
- [ ] SECURITY DEFINER used for RLS bypass

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

**If ISSUES FOUND:** STOP. Security issues must be resolved before proceeding.

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Enhancement.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: RPC function created and deployed
**Test:** Check RPC exists in database
**Command:**
```bash
grep -l "claim_instant_reward" /home/jorge/Loyalty/Rumi/supabase/migrations/*.sql
```
**Expected:** Migration file found
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: claimInstantReward function added to missionRepository
**Test:** Function exists in repository
**Command:**
```bash
grep -n "async claimInstantReward" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts
```
**Expected:** Function found with line number
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: missionService uses fast path
**Test:** Fast path code exists in service
**Command:**
```bash
grep -n "FAST PATH\|claimInstantReward" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts | head -5
```
**Expected:** Both patterns found
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: Type checker passes
**Test:** No type errors
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -c "error" || echo "0"
```
**Expected:** 0
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: Build completes
**Test:** Build succeeds
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -5
```
**Expected:** No errors in output
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: Manual verification - claim completes in < 1 second
**Test:** Start dev server, claim instant reward, observe timing
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run dev
# Then manually test claim in browser
```
**Expected:** Toast appears in < 1 second
**Actual:** [actual result from manual test]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Dev server logs show < 500ms response time
**Test:** Check server output for claim timing
**Expected:** `POST /api/missions/.../claim 200 in XXXms` where XXX < 500
**Actual:** [actual timing from logs]
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 8: Existing tests still pass
**Test:** Run test suite (if exists)
**Command:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm test 2>&1 | tail -20
```
**Expected:** All tests pass (or no test suite)
**Actual:** [actual result]
**Status:** [ ] PASS ✅ / FAIL ❌ / SKIPPED (no tests)

---

### Verification 4: Schema Alignment Confirmed

**Verification:**
- [ ] All column names match SchemaFinalv2.md (verified in Gate 5)
- [ ] All data types correct
- [ ] All relationships (FKs) respected

---

### Verification 5: API Contract Alignment Confirmed

**Verification:**
- [ ] Response matches API_CONTRACTS.md (same shape, just faster)
- [ ] No breaking changes to existing consumers
- [ ] Error responses correct

---

### Verification 6: Git Diff Sanity Check

**Command:**
```bash
cd /home/jorge/Loyalty/Rumi && git diff --stat
```

**Expected Changes:**
- `supabase/migrations/20251221120000_claim_instant_reward_rpc.sql`: ~110 lines added
- `appcode/lib/types/database.ts`: regenerated (large diff)
- `appcode/lib/repositories/missionRepository.ts`: ~35 lines added
- `appcode/lib/services/missionService.ts`: ~45 lines added

**Actual Changes:** [document git diff output]

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅
- [ ] Line counts approximately correct ✅

---

### Verification 7: Runtime/Integration Test

**Test:** Manual claim of instant reward
1. Start dev server
2. Navigate to missions page
3. Complete a mission with gift_card/spark_ads/experience reward
4. Click "Claim Reward"
5. Observe timing and success

**Expected:** Claim completes in < 1 second, toast shows success
**Actual:** [actual behavior]

**Status:**
- [ ] Runtime test passed ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Enhancement.md | Test Result |
|-----------|---------------------|-------------|
| 1 | RPC created | ✅ / ❌ |
| 2 | Repository function added | ✅ / ❌ |
| 3 | Service uses fast path | ✅ / ❌ |
| 4 | Type check passes | ✅ / ❌ |
| 5 | Build completes | ✅ / ❌ |
| 6 | Claim < 1 second | ✅ / ❌ |
| 7 | Logs show < 500ms | ✅ / ❌ |
| 8 | Existing tests pass | ✅ / ❌ / SKIPPED |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-21
**Executor:** Claude Opus 4.5
**Specification Source:** ClaimAPIPerformanceEnhancement.md
**Implementation Doc:** ClaimAPIPerformanceEnhancementIMPL.md
**Enhancement ID:** ENH-001

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Gap Confirmation - [PASS/FAIL]
[Timestamp] Gate 3: Partial Code Check - [PASS/FAIL]
[Timestamp] Gate 4: Files - [PASS/FAIL]
[Timestamp] Gate 5: Schema - [PASS/FAIL]
[Timestamp] Gate 6: API Contract - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 0: Parity re-check - Verified ✅
[Timestamp] Step 1: Create migration - Created ✅ - Verified ✅
[Timestamp] Step 2: Apply migration - Executed ✅ - Verified ✅
[Timestamp] Step 3: Regenerate types - Regenerated ✅ - Verified ✅
[Timestamp] Step 4: Add repository function - Modified ✅ - Verified ✅
[Timestamp] Step 5: Add service fast path - Modified ✅ - Verified ✅
```

**Integration Verification:**
```
[Timestamp] Import check - [PASS/FAIL]
[Timestamp] Call site check - [PASS/FAIL]
[Timestamp] Type alignment - [PASS/FAIL]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] client_id grep verification - [PASS/FAIL]
[Timestamp] Auth check - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Build succeeds ✅
[Timestamp] Type check passes ✅
[Timestamp] Criterion 1: RPC created ✅
[Timestamp] Criterion 2: Repository function ✅
[Timestamp] Criterion 3: Service fast path ✅
[Timestamp] Criterion 4: Type check ✅
[Timestamp] Criterion 5: Build ✅
[Timestamp] Criterion 6: < 1 second claim ✅
[Timestamp] Criterion 7: < 500ms logs ✅
[Timestamp] Criterion 8: Tests pass ✅ / SKIPPED
[Timestamp] Schema alignment ✅
[Timestamp] API contract ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Runtime test ✅
[Timestamp] Overall: PASS ✅
```

---

### Files Created/Modified

**Complete List:**
1. `supabase/migrations/20251221120000_claim_instant_reward_rpc.sql` - CREATE - ~110 lines - Atomic RPC function
2. `appcode/lib/types/database.ts` - REGENERATE - varies - Supabase types with new RPC
3. `appcode/lib/repositories/missionRepository.ts` - MODIFY - +35 lines - claimInstantReward function
4. `appcode/lib/services/missionService.ts` - MODIFY - +45 lines - Fast path logic

**Total:** 4 files, ~190 lines added (net)

---

### Feature Completion

**Before Implementation:**
- Gap: Claim API takes ~2000ms due to sequential queries
- Fast path: NO

**After Implementation:**
- Feature: Atomic RPC for instant claims ✅
- All acceptance criteria: MET ✅
- Performance: ~300-500ms (75% improvement)

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration file exists
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql

# 2. Verify RPC in generated types
grep "claim_instant_reward" /home/jorge/Loyalty/Rumi/appcode/lib/types/database.ts

# 3. Verify repository function
grep -n "claimInstantReward" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/missionRepository.ts

# 4. Verify service fast path
grep -n "FAST PATH" /home/jorge/Loyalty/Rumi/appcode/lib/services/missionService.ts

# 5. Verify multi-tenant filters
grep -n "client_id" /home/jorge/Loyalty/Rumi/supabase/migrations/20251221120000_claim_instant_reward_rpc.sql

# 6. Verify no type errors
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep "error" | wc -l

# 7. Verify build
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -5
```

**Expected Results:**
- Migration file exists ✅
- RPC in database.ts ✅
- claimInstantReward in repository ✅
- FAST PATH in service ✅
- client_id filters present ✅
- 0 type errors ✅
- Build succeeds ✅

---

## Document Status

**Implementation Date:** 2025-12-21
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] Schema verified
- [ ] API contract verified

**Implementation:**
- [ ] All steps completed ✅
- [ ] All checkpoints passed ✅
- [ ] No steps skipped

**Integration:**
- [ ] Imports verified ✅
- [ ] Call sites verified ✅
- [ ] Types aligned ✅

**Security:**
- [ ] Multi-tenant isolation verified ✅
- [ ] client_id filters confirmed via grep ✅
- [ ] Auth requirements met ✅

**Feature Verification:**
- [ ] Build succeeds ✅
- [ ] Type check passes ✅
- [ ] ALL acceptance criteria met ✅
- [ ] Git diff reviewed ✅

**Documentation:**
- [ ] Audit trail complete ✅
- [ ] Execution log detailed ✅
- [ ] Metrics documented ✅

---

### Final Status

**Implementation Result:** [SUCCESS ✅ / FAILED ❌]

**If SUCCESS:**
- Feature implemented: YES
- All acceptance criteria: MET
- Ready for: Git commit
- Next: Update ClaimAPIPerformanceEnhancement.md status to "Implemented"

**Git Commit Message Template:**
```
feat: add atomic RPC for instant reward claims (ENH-001)

Implements ENH-001: Claim API Performance Optimization
Reduces claim latency from ~2000ms to ~300-500ms for instant rewards

New files:
- supabase/migrations/20251221120000_claim_instant_reward_rpc.sql: Atomic RPC function

Modified files:
- lib/repositories/missionRepository.ts: Add claimInstantReward function
- lib/services/missionService.ts: Add fast path for instant rewards
- lib/types/database.ts: Regenerated with new RPC types

Covers: gift_card, spark_ads, experience rewards + raffle winner claims

References:
- BugFixes/ClaimAPIPerformanceEnhancement.md
- BugFixes/ClaimAPIPerformanceEnhancementIMPL.md

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
- [ ] Read API_CONTRACTS.md for API changes
- [ ] Confirmed gap still exists before implementation

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)
- [ ] Filled in ALL blanks (no "TBD" remaining)

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (if any)
- [ ] Did not second-guess specification

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence
- [ ] Verified auth requirements
- [ ] No cross-tenant data exposure

### Acceptance Criteria
- [ ] EVERY criterion from Enhancement.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL
- [ ] No criteria skipped or assumed

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

**RED FLAGS you exhibited (if any):**
- [ ] None ✅
- [ ] Used placeholder code
- [ ] Approximated line numbers
- [ ] Skipped verification
- [ ] Re-designed specification
- [ ] Assumed without verifying
- [ ] Skipped security check
- [ ] Skipped acceptance criteria
- [ ] Other: [describe]

---

**Document Version:** 1.1
**Created:** 2025-12-21
**Status:** READY FOR EXECUTION

**Revision History:**
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-21 | Initial implementation plan |
| 1.1 | 2025-12-21 | Added Step 0 (parity re-check) per audit recommendation |
