# Boost Expiration State Skip - Implementation Plan

**Decision Source:** BoostExpirationStateFix.md
**Bug ID:** BUG-BOOST-EXPIRATION-STATE
**Severity:** Medium
**Implementation Date:** 2025-12-13
**LLM Executor:** Claude Opus 4.5

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From BoostExpirationStateFix.md:**

**Bug Summary:** The `expire_active_boosts` RPC function transitions boosts directly from `active` to `pending_info`, skipping the `expired` intermediate state.

**Root Cause:** The RPC was implemented to combine expiration and payment-request-ready transitions into a single UPDATE, eliminating the observable `expired` state.

**Files Affected:**
- `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql` (REPLACED - DONE)
- `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
- `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`

**Chosen Solution:**
Split the expiration flow into two distinct operations:
1. `expire_active_boosts` RPC ends in `expired` state (ALREADY FIXED IN MIGRATION)
2. New `transition_expired_to_pending_info` RPC transitions `expired → pending_info`
3. Daily cron calls both in sequence

**Why This Solution:**
- Each state is observable and queryable
- Matches documented Steps 5 and 6 as separate operations
- Admin can filter/report on `expired` boosts
- Tests pass as written (boost row IS in `expired` state)
- Future flexibility: can add dwell time between states

**From Audit Feedback:**
- Recommendation: APPROVE WITH CHANGES (v2.0 addressed all concerns)
- Critical Issues Addressed: Row now observable in `expired` state, new migration file created
- Concerns Addressed: Multi-tenant filters verified, service_role grants only

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 2 (migration already done)
- Lines changed: ~100
- Breaking changes: NO
- Schema changes: NO (RPC only)
- API contract changes: NO (additive field in cron response)

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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode`

**Git Status:**
```bash
git status --short
```
**Expected:** Working tree may have changes from migration file replacement

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```
**Expected:** File exists

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** File exists

**File 3 (Already Done):** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql`
```bash
ls -la /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
```
**Expected:** File exists with corrected implementation

**Checklist:**
- [ ] All source files exist: 3
- [ ] All files readable
- [ ] File paths match Fix.md

---

### Gate 3: Code State Verification

**Read current state of commissionBoostRepository.ts (ExpireBoostResult interface):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 62-76
```

**Expected Current State (ExpireBoostResult interface exists, no TransitionToPendingInfoResult):**
```typescript
/**
 * Result of expireActiveBoosts operation
 * Per GAP-BOOST-ACTIVATION specification
 * Note: salesDelta comes from DB GENERATED column, NOT app-calculated
 */
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}
```

**Read current state of expireActiveBoosts JSDoc (lines 357-373):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 357-373
```

**Expected Current State (outdated JSDoc mentioning 'pending_info'):**
```typescript
  /**
   * Expire active boosts where expires_at <= NOW().
   * Per GAP-BOOST-ACTIVATION specification.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries (audit correction).
   * CRITICAL: sales_delta is a GENERATED column in the database.
   * Do NOT calculate in application - use RETURNING to get DB-calculated value.
   *
   * Transitions directly to 'pending_info' in single atomic UPDATE.
   * Wraps both phases in single transaction for atomicity (audit correction).
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
```

**Read current state of route CronSuccessResponse (lines 65-68):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 65-68
```

**Expected Current State (missing transitionedToPendingInfoCount):**
```typescript
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
    };
```

**Checklist:**
- [ ] ExpireBoostResult interface exists at lines 67-76: YES
- [ ] No TransitionToPendingInfoResult interface exists: YES
- [ ] expireActiveBoosts JSDoc still mentions 'pending_info': YES
- [ ] CronSuccessResponse missing transitionedToPendingInfoCount: YES
- [ ] Line numbers accurate (not drifted)

**If current state doesn't match:** STOP. Report discrepancy.

---

### Gate 4: Schema Verification

**Read SchemaFinalv2.md for commission_boost_redemptions:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 717-724
```

**Tables involved:** commission_boost_redemptions

**Column verification:**
| Column in Code | Column in Schema | Match? |
|----------------|------------------|--------|
| boost_status | boost_status VARCHAR(50) | ✅ |
| sales_at_expiration | sales_at_expiration DECIMAL(10,2) | ✅ |
| sales_delta | sales_delta GENERATED | ✅ |
| final_payout_amount | final_payout_amount DECIMAL(10,2) | ✅ |

**Valid boost_status values:** 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid'

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] 'expired' is valid boost_status value
- [ ] 'pending_info' is valid boost_status value

---

### Gate 5: Migration File Verification

**Verify migration file contains all three RPCs:**
```bash
grep -n "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
```

**Expected:**
- Line ~22: `activate_scheduled_boosts`
- Line ~62: `expire_active_boosts`
- Line ~125: `transition_expired_to_pending_info`

**Verify expire_active_boosts ends in 'expired':**
```bash
grep -n "boost_status = 'expired'" /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
```

**Expected:** Line ~102: `boost_status = 'expired'`

**Verify transition_expired_to_pending_info exists:**
```bash
grep -n "transition_expired_to_pending_info" /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
```

**Expected:** Multiple matches (function definition and grants)

**Checklist:**
- [ ] All three RPCs present in migration
- [ ] expire_active_boosts sets boost_status = 'expired'
- [ ] transition_expired_to_pending_info function exists
- [ ] service_role grants present

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

### Step 1: Add TransitionToPendingInfoResult Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
**Target Lines:** After line 76 (after ExpireBoostResult interface)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 67-78
```

**Expected Current State (EXACT CODE):**
```typescript
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}

export const commissionBoostRepository = {
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]
- [ ] Line numbers accurate

**If current state doesn't match:** STOP. Do not proceed with edit.

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}

export const commissionBoostRepository = {
```

**NEW Code (replacement):**
```typescript
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}

/**
 * Result of transitionExpiredToPendingInfo operation
 * Per BUG-BOOST-EXPIRATION-STATE fix
 */
export interface TransitionToPendingInfoResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  finalPayoutAmount: number;
}

export const commissionBoostRepository = {
```

**Edit Command:**
```
Tool: Edit
File: /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
Old String: [exact match above]
New String: [exact replacement above]
```

**Change Summary:**
- Lines removed: 0
- Lines added: 11
- Net change: +11

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 67-89
```

**Expected New State (EXACT CODE):**
```typescript
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}

/**
 * Result of transitionExpiredToPendingInfo operation
 * Per BUG-BOOST-EXPIRATION-STATE fix
 */
export interface TransitionToPendingInfoResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  finalPayoutAmount: number;
}

export const commissionBoostRepository = {
```

**State Verification:**
- [ ] Read command executed
- [ ] New state matches expected: [YES / NO]
- [ ] Changes applied correctly

---

#### Step Verification

**Type Check:**
```bash
npx tsc --noEmit lib/repositories/commissionBoostRepository.ts 2>&1 | head -20
```
**Expected:** No new type errors from interface addition

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Update expireActiveBoosts JSDoc

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
**Target Lines:** 368-377 (adjusted for +11 lines from Step 1)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 368-388
```

**Expected Current State (outdated JSDoc):**
```typescript
  /**
   * Expire active boosts where expires_at <= NOW().
   * Per GAP-BOOST-ACTIVATION specification.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries (audit correction).
   * CRITICAL: sales_delta is a GENERATED column in the database.
   * Do NOT calculate in application - use RETURNING to get DB-calculated value.
   *
   * Transitions directly to 'pending_info' in single atomic UPDATE.
   * Wraps both phases in single transaction for atomicity (audit correction).
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
  async expireActiveBoosts(
    clientId: string
  ): Promise<{
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO / PARTIAL]

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
  /**
   * Expire active boosts where expires_at <= NOW().
   * Per GAP-BOOST-ACTIVATION specification.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries (audit correction).
   * CRITICAL: sales_delta is a GENERATED column in the database.
   * Do NOT calculate in application - use RETURNING to get DB-calculated value.
   *
   * Transitions directly to 'pending_info' in single atomic UPDATE.
   * Wraps both phases in single transaction for atomicity (audit correction).
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
```

**NEW Code (replacement):**
```typescript
  /**
   * Expire active boosts where expires_at <= NOW().
   * Per GAP-BOOST-ACTIVATION specification + BUG-BOOST-EXPIRATION-STATE fix.
   *
   * IMPORTANT: After this call, boosts are in 'expired' state (NOT 'pending_info').
   * Call transitionExpiredToPendingInfo() to move to 'pending_info'.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries.
   * CRITICAL: sales_delta is a GENERATED column in the database.
   * Do NOT calculate in application - use RETURNING to get DB-calculated value.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
```

**Change Summary:**
- Lines removed: 0
- Lines added: 0
- Net change: 0 (content change only)

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 368-385
```

**Expected New State:**
JSDoc should mention:
- "boosts are in 'expired' state (NOT 'pending_info')"
- "Call transitionExpiredToPendingInfo()"

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Add transitionExpiredToPendingInfo Function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
**Target Lines:** Before the closing `};` of commissionBoostRepository object
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read Current State (end of file):**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts lines 438-450
```

**Expected Current State:**
```typescript
      return { expiredCount: 0, expirations: [], errors };
    }
  },
};
```

**Reality Check:**
- [ ] Read command executed
- [ ] File ends with `};` after expireActiveBoosts function

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
      return { expiredCount: 0, expirations: [], errors };
    }
  },
};
```

**NEW Code (replacement):**
```typescript
      return { expiredCount: 0, expirations: [], errors };
    }
  },

  /**
   * Transition expired boosts to pending_info state.
   * Per BUG-BOOST-EXPIRATION-STATE fix - Step 6 of documented flow.
   *
   * Call this after expireActiveBoosts() to request payment info.
   * For MVP, called immediately. Future: configurable dwell time.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   */
  async transitionExpiredToPendingInfo(
    clientId: string
  ): Promise<{
    transitionedCount: number;
    transitions: TransitionToPendingInfoResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const transitions: TransitionToPendingInfoResult[] = [];

    try {
      // Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('transition_expired_to_pending_info', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error transitioning expired to pending_info:', error);
        errors.push(`Transition failed: ${error.message}`);
        return { transitionedCount: 0, transitions: [], errors };
      }

      // Map RPC results to TransitionToPendingInfoResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          transitions.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            finalPayoutAmount: Number(row.final_payout_amount),
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Transitioned ${transitions.length} expired boosts to pending_info for client ${clientId}`
      );

      return {
        transitionedCount: transitions.length,
        transitions,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in transitionExpiredToPendingInfo:', errorMessage);
      errors.push(errorMessage);
      return { transitionedCount: 0, transitions: [], errors };
    }
  },
};
```

**Change Summary:**
- Lines removed: 0
- Lines added: ~65
- Net change: +65

---

#### Post-Action Verification

**Verify function exists:**
```bash
grep -n "transitionExpiredToPendingInfo" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```

**Expected:** Multiple matches (JSDoc, function definition, console.log)

**Verify file line count increased:**
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```

**Expected:** ~502 lines (was 437, +11 interface, +65 function = ~513)

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] Function exists in file ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update CronSuccessResponse Interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Lines:** 65-68
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 62-70
```

**Expected Current State:**
```typescript
    raffleCalendar: {
      eventsCreated: number;
    };
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
    };
  };
  timestamp: string;
```

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
    };
```

**NEW Code (replacement):**
```typescript
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
      transitionedToPendingInfoCount: number;
    };
```

**Change Summary:**
- Lines removed: 0
- Lines added: 1
- Net change: +1

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 65-70
```

**Expected New State:**
```typescript
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
      transitionedToPendingInfoCount: number;
    };
```

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Post-action state matches expected ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 5: Update Boost Lifecycle Step in Route

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Lines:** 230-269 (boost lifecycle section)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 229-270
```

**Expected Current State (missing transitionExpiredToPendingInfo call):**
```typescript
      console.log(`[DailyAutomation] Processing commission boost lifecycle`);
      let boostActivatedCount = 0;
      let boostExpiredCount = 0;
      try {
        // Activate scheduled boosts (scheduled → active)
        const activationResult = await commissionBoostRepository.activateScheduledBoosts(clientId);
        boostActivatedCount = activationResult.activatedCount;
        ...
        // Expire active boosts (active → pending_info)
        const expirationResult = await commissionBoostRepository.expireActiveBoosts(clientId);
        ...
      } catch (boostError) {
        ...
      }
```

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
      // Step 3e: Activate/expire commission boosts (GAP-BOOST-ACTIVATION)
      // Per Loyalty.md line 416: "Aligned with commission boost activation (2 PM EST)"
      console.log(`[DailyAutomation] Processing commission boost lifecycle`);
      let boostActivatedCount = 0;
      let boostExpiredCount = 0;
      try {
        // Activate scheduled boosts (scheduled → active)
        const activationResult = await commissionBoostRepository.activateScheduledBoosts(clientId);
        boostActivatedCount = activationResult.activatedCount;

        if (activationResult.activatedCount > 0) {
          console.log(
            `[DailyAutomation] Activated ${activationResult.activatedCount} commission boosts`
          );
        }

        if (activationResult.errors.length > 0) {
          console.warn(
            `[DailyAutomation] Boost activation had ${activationResult.errors.length} errors`
          );
        }

        // Expire active boosts (active → pending_info)
        const expirationResult = await commissionBoostRepository.expireActiveBoosts(clientId);
        boostExpiredCount = expirationResult.expiredCount;

        if (expirationResult.expiredCount > 0) {
          console.log(
            `[DailyAutomation] Expired ${expirationResult.expiredCount} commission boosts ` +
            `(total payout: $${expirationResult.expirations.reduce((sum, e) => sum + e.finalPayoutAmount, 0).toFixed(2)})`
          );
        }

        if (expirationResult.errors.length > 0) {
          console.warn(
            `[DailyAutomation] Boost expiration had ${expirationResult.errors.length} errors`
          );
        }
      } catch (boostError) {
        // Non-fatal: Log error, continue
        const errorMsg = boostError instanceof Error ? boostError.message : String(boostError);
        console.warn(`[DailyAutomation] Boost lifecycle processing failed (non-fatal): ${errorMsg}`);
      }
```

**NEW Code (replacement):**
```typescript
      // Step 3e: Activate/expire commission boosts (GAP-BOOST-ACTIVATION + BUG-BOOST-EXPIRATION-STATE fix)
      // Per Loyalty.md line 416: "Aligned with commission boost activation (2 PM EST)"
      console.log(`[DailyAutomation] Processing commission boost lifecycle`);
      let boostActivatedCount = 0;
      let boostExpiredCount = 0;
      let boostTransitionedCount = 0;
      try {
        // Step 4: Activate scheduled boosts (scheduled → active)
        const activationResult = await commissionBoostRepository.activateScheduledBoosts(clientId);
        boostActivatedCount = activationResult.activatedCount;

        if (activationResult.activatedCount > 0) {
          console.log(
            `[DailyAutomation] Activated ${activationResult.activatedCount} commission boosts`
          );
        }

        if (activationResult.errors.length > 0) {
          console.warn(
            `[DailyAutomation] Boost activation had ${activationResult.errors.length} errors`
          );
        }

        // Step 5: Expire active boosts (active → expired)
        // Per BUG-BOOST-EXPIRATION-STATE fix: now ends in 'expired' state
        const expirationResult = await commissionBoostRepository.expireActiveBoosts(clientId);
        boostExpiredCount = expirationResult.expiredCount;

        if (expirationResult.expiredCount > 0) {
          console.log(
            `[DailyAutomation] Expired ${expirationResult.expiredCount} commission boosts ` +
            `(total payout: $${expirationResult.expirations.reduce((sum, e) => sum + e.finalPayoutAmount, 0).toFixed(2)})`
          );
        }

        if (expirationResult.errors.length > 0) {
          console.warn(
            `[DailyAutomation] Boost expiration had ${expirationResult.errors.length} errors`
          );
        }

        // Step 6: Transition expired boosts to pending_info (expired → pending_info)
        // Per BUG-BOOST-EXPIRATION-STATE fix: separate operation
        // NOTE: For MVP, called immediately. Future: configurable dwell time.
        const transitionResult = await commissionBoostRepository.transitionExpiredToPendingInfo(clientId);
        boostTransitionedCount = transitionResult.transitionedCount;

        if (transitionResult.transitionedCount > 0) {
          console.log(
            `[DailyAutomation] Transitioned ${transitionResult.transitionedCount} boosts to pending_info`
          );
        }

        if (transitionResult.errors.length > 0) {
          console.warn(
            `[DailyAutomation] Boost transition had ${transitionResult.errors.length} errors`
          );
        }
      } catch (boostError) {
        // Non-fatal: Log error, continue
        const errorMsg = boostError instanceof Error ? boostError.message : String(boostError);
        console.warn(`[DailyAutomation] Boost lifecycle processing failed (non-fatal): ${errorMsg}`);
      }
```

**Change Summary:**
- Lines removed: 0
- Lines added: ~20
- Net change: +20

---

#### Post-Action Verification

**Verify transitionExpiredToPendingInfo call exists:**
```bash
grep -n "transitionExpiredToPendingInfo" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```

**Expected:** At least 1 match

**Verify boostTransitionedCount variable exists:**
```bash
grep -n "boostTransitionedCount" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```

**Expected:** Multiple matches (declaration, assignment, usage in response)

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] transitionExpiredToPendingInfo call added ✅
- [ ] boostTransitionedCount variable added ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 6: Update Response Data

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Lines:** ~295-298 (in response object)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 310-320
```

**Expected Current State (missing transitionedToPendingInfoCount):**
```typescript
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
            },
```

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
            },
```

**NEW Code (replacement):**
```typescript
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
              transitionedToPendingInfoCount: boostTransitionedCount,
            },
```

**Change Summary:**
- Lines removed: 0
- Lines added: 1
- Net change: +1

---

#### Post-Action Verification

**Verify transitionedToPendingInfoCount in response:**
```bash
grep -n "transitionedToPendingInfoCount" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```

**Expected:** 2 matches (interface definition + response object)

**Step Checkpoint:**
- [ ] Pre-action state matched expected ✅
- [ ] Edit applied successfully ✅
- [ ] Response includes transitionedToPendingInfoCount ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `transitionExpiredToPendingInfo`
```typescript
const { data, error } = await (supabase.rpc as Function)('transition_expired_to_pending_info', {
  p_client_id: clientId,
});
```

**Security Checklist:**
- [ ] `p_client_id` parameter passed to RPC
- [ ] RPC function filters by `cb.client_id = p_client_id`
- [ ] No cross-tenant data exposure possible

**Query 2:** `expire_active_boosts` (already verified in GAP-BOOST-ACTIVATION)
- [ ] `p_client_id` parameter passed to RPC
- [ ] RPC function filters by `cb.client_id = p_client_id`

---

### Authentication Check

**Route:** `/api/cron/daily-automation`

**Checklist:**
- [ ] Cron secret validation (existing)
- [ ] Client ID from authenticated context
- [ ] service_role used for RPC calls

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Final Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**

---

### Verification 1: Type Check

```bash
npx tsc --noEmit 2>&1 | grep -i error | wc -l
```
**Expected:** Same or fewer errors than before
**Actual:** [document]

---

### Verification 2: Build Check

```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build succeeds
**Actual:** [document]

---

### Verification 3: Function Exists Check

```bash
grep -c "transitionExpiredToPendingInfo" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```
**Expected:** >= 3 (interface comment, function name, console.log)
**Actual:** [document]

---

### Verification 4: Interface Exists Check

```bash
grep -c "TransitionToPendingInfoResult" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```
**Expected:** >= 2 (interface definition, return type)
**Actual:** [document]

---

### Verification 5: Route Integration Check

```bash
grep -c "transitionExpiredToPendingInfo\|boostTransitionedCount\|transitionedToPendingInfoCount" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** >= 5
**Actual:** [document]

---

### Verification 6: Git Diff Sanity Check

```bash
git diff --stat
```

**Expected Changes:**
- `lib/repositories/commissionBoostRepository.ts`: ~76 lines changed
- `app/api/cron/daily-automation/route.ts`: ~22 lines changed
- `supabase/migrations/20251213_boost_activation_rpcs.sql`: replaced

**Actual:** [document]

---

**FINAL VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-13
**Executor:** Claude Opus 4.5
**Decision Source:** BoostExpirationStateFix.md
**Implementation Doc:** BoostExpirationStateFixIMPL.md
**Bug ID:** BUG-BOOST-EXPIRATION-STATE

---

### Execution Log

**Pre-Implementation:**
```
Gate 1: Environment - [PENDING]
Gate 2: Files - [PENDING]
Gate 3: Code State - [PENDING]
Gate 4: Schema - [PENDING]
Gate 5: Migration - [PENDING]
```

**Implementation Steps:**
```
Step 1: Add TransitionToPendingInfoResult interface - [PENDING]
Step 2: Update expireActiveBoosts JSDoc - [PENDING]
Step 3: Add transitionExpiredToPendingInfo function - [PENDING]
Step 4: Update CronSuccessResponse interface - [PENDING]
Step 5: Update boost lifecycle step in route - [PENDING]
Step 6: Update response data - [PENDING]
```

**Security Verification:**
```
Multi-tenant check - [PENDING]
Auth check - [PENDING]
```

**Final Verification:**
```
Type check - [PENDING]
Build check - [PENDING]
Function exists - [PENDING]
Interface exists - [PENDING]
Route integration - [PENDING]
Git diff sanity - [PENDING]
```

---

### Files Modified

**Complete List:**
1. `supabase/migrations/20251213_boost_activation_rpcs.sql` - REPLACED - corrected RPCs
2. `lib/repositories/commissionBoostRepository.ts` - ADD - interface + function (~76 lines)
3. `app/api/cron/daily-automation/route.ts` - MODIFY - call new function + response field (~22 lines)

**Total:** 3 files modified, ~100 lines changed (net)

---

### Bug Resolution

**Before Implementation:**
- Bug: expire_active_boosts skips 'expired' state, goes directly to 'pending_info'
- Root cause: Combined transitions to reduce DB operations

**After Implementation:**
- Bug: RESOLVED
- Verification: expire_active_boosts ends in 'expired', separate transitionExpiredToPendingInfo for Step 6

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify migration has all three RPCs
grep -c "CREATE OR REPLACE FUNCTION" /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
# Should show: 3

# 2. Verify expire_active_boosts ends in 'expired'
grep "boost_status = 'expired'" /home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql
# Should show: 1 match (in expire_active_boosts)

# 3. Verify new function in repository
grep -c "transitionExpiredToPendingInfo" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
# Should show: >= 3

# 4. Verify route calls new function
grep "transitionExpiredToPendingInfo" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
# Should show: 1 match

# 5. Verify response includes new field
grep "transitionedToPendingInfoCount" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
# Should show: 2 matches
```

---

## Document Status

**Implementation Date:** 2025-12-13
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [ ] Schema verified
- [ ] Migration file verified

**Implementation:**
- [ ] All steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified
- [ ] Auth requirements met

**Verification:**
- [ ] Type check passed
- [ ] Build passed
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed

---

### Final Status

**Implementation Result:** [PENDING]

**Next Actions (after implementation succeeds):**
1. [ ] Git commit with message below
2. [ ] Update BoostExpirationStateFix.md status to "Implemented"
3. [ ] Verify in clean build
4. [ ] Apply migration to database

**Git Commit Message Template:**
```
fix: restore observable expired state in boost lifecycle

Resolves BUG-BOOST-EXPIRATION-STATE: expire_active_boosts now ends in
'expired' state instead of skipping to 'pending_info'

Changes:
- Migration: expire_active_boosts ends in 'expired', new transition_expired_to_pending_info RPC
- Repository: Add transitionExpiredToPendingInfo() function
- Route: Call both functions in sequence, add transitionedToPendingInfoCount to response

References:
- BoostExpirationStateFix.md
- BoostExpirationStateFixIMPL.md

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

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Verified auth requirements
- [ ] No cross-tenant data exposure

---

**META-VERIFICATION STATUS:** [PENDING - Document created, execution not started]

**RED FLAGS exhibited:** None - document created following template

---

**Document Version:** 1.0
**Created:** 2025-12-13
**Status:** Ready for Execution
