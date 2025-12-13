# Commission Boost Activation - Gap Implementation Plan

**Specification Source:** BoostActivationGap.md
**Gap ID:** GAP-BOOST-ACTIVATION
**Type:** Feature Gap
**Priority:** High
**Implementation Date:** 2025-12-13
**LLM Executor:** Claude Opus 4.5

---

## Gap Reference (IMMUTABLE - DO NOT RE-DESIGN)

**From BoostActivationGap.md:**

**Gap Summary:** No application code exists to transition commission boosts from `'scheduled'` → `'active'` → `'pending_info'` states. The daily cron job does not activate scheduled boosts or expire active ones.

**Business Need:** Commission boost payout calculation requires accurate snapshots of user sales at activation and expiration to calculate the bonus payment.

**Files to Create/Modify:**
- `lib/repositories/commissionBoostRepository.ts` (MODIFY)
- `app/api/cron/daily-automation/route.ts` (MODIFY)

**Specified Solution:**
From Gap.md Section 6:
1. Add `activateScheduledBoosts()` function using `UPDATE...FROM` with JOIN (no N+1)
2. Add `expireActiveBoosts()` function using two-phase transaction with RETURNING
3. Integrate into daily-automation route after tier calculations

**Acceptance Criteria (From Gap.md Section 16):**
1. [ ] `activateScheduledBoosts()` function implemented with client_id filtering
2. [ ] `expireActiveBoosts()` function implemented with client_id filtering
3. [ ] Both functions use `UPDATE...FROM` with JOIN (no N+1 queries)
4. [ ] `expireActiveBoosts()` uses DB GENERATED `sales_delta` via RETURNING (not app-calculated)
5. [ ] `expireActiveBoosts()` wrapped in single transaction for atomicity
6. [ ] daily-automation route calls both functions after tier calculations
7. [ ] Response includes `boostActivation` with activation/expiration counts
8. [ ] Type checker passes
9. [ ] All tests pass (existing + new)
10. [ ] Build completes
11. [ ] Manual verification completed
12. [ ] client_id filters verified in both activation and expiration queries
13. [ ] EXECUTION_PLAN.md updated with Task 8.3.5
14. [ ] Gap.md document status updated to "Implemented"

**From Audit Feedback (Gap.md Audits):**
- Recommendation: APPROVE WITH CHANGES (both audits)
- Critical Issues Addressed: N+1 query eliminated, generated column handled correctly, transactionality added
- Concerns Addressed: Explicit client_id filters, type regeneration clarified

**From Audit Feedback (IMPL Audit - 2025-12-13):**
- Recommendation: APPROVE WITH CHANGES
- **Critical Issue 1 (FIXED):** RPC types not in database.ts - Use `as Function` pattern for RPC calls
- **Critical Issue 2 (FIXED):** Over-broad GRANT to authenticated - Removed, service_role only
- **Concern 1 (FIXED):** NULL handling for total_sales - Added COALESCE(..., 0)
- **Concern 2 (VERIFIED):** Line numbers verified at 253 lines

**Expected Outcome:**
- Feature implemented: YES
- Files created: 0
- Files modified: 2
- Lines added: ~200
- Breaking changes: NO
- Schema changes: NO
- API contract changes: NO (additive only - new response fields)

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

**Purpose:** Verify the gap STILL exists - code hasn't been added since Gap.md was created.

**Search for existing implementation:**
```bash
grep -r "activateScheduledBoosts" appcode/lib/
grep -r "expireActiveBoosts" appcode/lib/
grep -r "boost_status.*=.*'active'" appcode/lib/
```

**Expected:** No matches (gap is real)
**Actual:** [document actual output]

**Checklist:**
- [ ] Grep executed for `activateScheduledBoosts`: No matches
- [ ] Grep executed for `expireActiveBoosts`: No matches
- [ ] Grep executed for `boost_status='active'` UPDATE: No matches
- [ ] Gap confirmed to still exist: YES

**If code already exists:** STOP. Gap may have been filled. Report to user.

---

### Gate 3: Partial/Related Code Check

**Purpose:** Find related code to avoid duplication and ensure proper integration.

**Search for related implementations:**
```bash
grep -r "commission_boost" appcode/lib/repositories/
grep -r "boost_status" appcode/lib/
```

**Related code found:**

| File | Function/Pattern | Relationship | Action |
|------|-----------------|--------------|--------|
| `commissionBoostRepository.ts` | `createBoostState()` | Creates scheduled boosts | Extend with new functions |
| `commissionBoostRepository.ts` | `savePaymentInfo()` | Transitions pending_info→pending_payout | Complements our new functions |
| `commissionBoostRepository.ts` | `getBoostStatus()` | Reads current status | May be useful for verification |

**Checklist:**
- [ ] Related code identified: 1 file (commissionBoostRepository.ts)
- [ ] Duplication risk assessed: LOW (new functions, not duplicates)
- [ ] Integration points identified: Add functions to existing repository

---

### Gate 4: Files to Modify Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts
```
**Expected:** File exists, 253 lines

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
```bash
ls -la /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
wc -l /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** File exists, 302 lines

**Checklist:**
- [ ] commissionBoostRepository.ts exists: YES (253 lines)
- [ ] daily-automation/route.ts exists: YES (302 lines)
- [ ] File paths match Gap.md: YES

---

### Gate 5: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**
```bash
Read /home/jorge/Loyalty/Rumi/SchemaFinalv2.md lines 666-746
```

**Tables involved:** commission_boost_redemptions, users, redemptions

**Column verification:**
| Column in Spec | Column in Schema | Exists? | Type Match? |
|----------------|------------------|---------|-------------|
| boost_status | boost_status | ✅ | VARCHAR(50) ✅ |
| scheduled_activation_date | scheduled_activation_date | ✅ | DATE ✅ |
| activated_at | activated_at | ✅ | TIMESTAMP ✅ |
| expires_at | expires_at | ✅ | TIMESTAMP ✅ |
| duration_days | duration_days | ✅ | INTEGER ✅ |
| boost_rate | boost_rate | ✅ | DECIMAL(5,2) ✅ |
| sales_at_activation | sales_at_activation | ✅ | DECIMAL(10,2) ✅ |
| sales_at_expiration | sales_at_expiration | ✅ | DECIMAL(10,2) ✅ |
| sales_delta | sales_delta | ✅ | DECIMAL(10,2) GENERATED ✅ |
| final_payout_amount | final_payout_amount | ✅ | DECIMAL(10,2) ✅ |
| client_id | client_id | ✅ | UUID ✅ |

**Checklist:**
- [ ] All required columns exist in schema: YES
- [ ] Data types compatible: YES
- [ ] sales_delta is GENERATED column: YES (line 702)
- [ ] No schema migration needed: CORRECT

---

### Gate 6: API Contract Verification

**Endpoint:** `GET /api/cron/daily-automation`

**Contract alignment:**
| Field in Spec | Field in Contract | Aligned? |
|---------------|-------------------|----------|
| boostActivation.activatedCount | NEW (additive) | ✅ |
| boostActivation.expiredCount | NEW (additive) | ✅ |

**Checklist:**
- [ ] Changes are additive only: YES
- [ ] No breaking changes: CORRECT
- [ ] Response structure extends existing: YES

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

### Step 1: Add ActivateBoostResult and ExpireBoostResult interfaces

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add type definitions for the new functions' return values

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read commissionBoostRepository.ts lines 43-48
```

**Expected Current State (EXACT CODE):**
```typescript
export interface CreateBoostStateResult {
  boostRedemptionId: string;
  boostStatus: string;
  scheduledActivationDate: string;
}
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] Line numbers accurate

---

**Edit Action:**

**OLD Code (to be replaced):**
```typescript
export interface CreateBoostStateResult {
  boostRedemptionId: string;
  boostStatus: string;
  scheduledActivationDate: string;
}
```

**NEW Code (replacement):**
```typescript
export interface CreateBoostStateResult {
  boostRedemptionId: string;
  boostStatus: string;
  scheduledActivationDate: string;
}

/**
 * Result of activateScheduledBoosts operation
 * Per GAP-BOOST-ACTIVATION specification
 */
export interface ActivateBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  activatedAt: string;
  expiresAt: string;
}

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

---

#### Post-Action Verification

**Read Modified State:**
```bash
Read commissionBoostRepository.ts lines 43-75
```

**Expected:** Interfaces now include ActivateBoostResult and ExpireBoostResult

**State Verification:**
- [ ] Read command executed
- [ ] New interfaces added correctly
- [ ] No syntax errors

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit lib/repositories/commissionBoostRepository.ts 2>&1 | head -20
```
**Expected:** No type errors

**Step Checkpoint:**
- [ ] Interfaces added successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No new errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 2: Implement activateScheduledBoosts function

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
**Action Type:** MODIFY
**Purpose:** Add function to activate scheduled boosts using UPDATE...FROM with JOIN

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read commissionBoostRepository.ts lines 249-253
```

**Expected Current State (EXACT CODE):**
```typescript
    return {
      redemptionId: redemptionId,
      status: 'fulfilled',
      paymentMethod: paymentMethod,
      paymentInfoCollectedAt: now,
    };
  },
};
```

**Reality Check:**
- [ ] Read command executed
- [ ] Current state matches expected: [YES / NO]
- [ ] File ends with `};` on line 253

---

**Edit Action:**

**OLD Code (to be replaced):**
```typescript
    return {
      redemptionId: redemptionId,
      status: 'fulfilled',
      paymentMethod: paymentMethod,
      paymentInfoCollectedAt: now,
    };
  },
};
```

**NEW Code (replacement):**
```typescript
    return {
      redemptionId: redemptionId,
      status: 'fulfilled',
      paymentMethod: paymentMethod,
      paymentInfoCollectedAt: now,
    };
  },

  /**
   * Activate scheduled boosts where scheduled_activation_date <= TODAY.
   * Per GAP-BOOST-ACTIVATION specification.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries (audit correction).
   * Sets boost_status='active', activated_at, expires_at, sales_at_activation.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
  async activateScheduledBoosts(
    clientId: string
  ): Promise<{
    activatedCount: number;
    activations: ActivateBoostResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const activations: ActivateBoostResult[] = [];

    try {
      // Single UPDATE...FROM with JOIN (no N+1 - audit correction)
      // Uses raw SQL via rpc because Supabase JS doesn't support UPDATE...FROM syntax directly
      // IMPL Audit Fix: Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('activate_scheduled_boosts', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error activating scheduled boosts:', error);
        errors.push(`Activation failed: ${error.message}`);
        return { activatedCount: 0, activations: [], errors };
      }

      // Map RPC results to ActivateBoostResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          activations.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            salesAtActivation: Number(row.sales_at_activation),
            activatedAt: row.activated_at,
            expiresAt: row.expires_at,
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Activated ${activations.length} scheduled boosts for client ${clientId}`
      );

      return {
        activatedCount: activations.length,
        activations,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in activateScheduledBoosts:', errorMessage);
      errors.push(errorMessage);
      return { activatedCount: 0, activations: [], errors };
    }
  },

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
    expiredCount: number;
    expirations: ExpireBoostResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const expirations: ExpireBoostResult[] = [];

    try {
      // Single RPC call handles both phases in transaction (audit correction)
      // Phase 1: Set sales_at_expiration (DB calculates sales_delta via GENERATED column)
      // Phase 2: Calculate final_payout_amount and transition to pending_info
      // IMPL Audit Fix: Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('expire_active_boosts', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error expiring active boosts:', error);
        errors.push(`Expiration failed: ${error.message}`);
        return { expiredCount: 0, expirations: [], errors };
      }

      // Map RPC results to ExpireBoostResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          expirations.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            salesAtActivation: Number(row.sales_at_activation),
            salesAtExpiration: Number(row.sales_at_expiration),
            salesDelta: Number(row.sales_delta), // From DB GENERATED column
            boostRate: Number(row.boost_rate),
            finalPayoutAmount: Number(row.final_payout_amount),
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Expired ${expirations.length} active boosts for client ${clientId}`
      );

      return {
        expiredCount: expirations.length,
        expirations,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in expireActiveBoosts:', errorMessage);
      errors.push(errorMessage);
      return { expiredCount: 0, expirations: [], errors };
    }
  },
};
```

---

#### Post-Action Verification

**Read Modified State:**
```bash
wc -l lib/repositories/commissionBoostRepository.ts
```
**Expected:** ~380 lines (was 253, added ~127)

**State Verification:**
- [ ] Read command executed
- [ ] New functions added correctly
- [ ] File ends properly with `};`

---

#### Step Checkpoint

**Type Check:**
```bash
npx tsc --noEmit lib/repositories/commissionBoostRepository.ts 2>&1 | head -20
```
**Expected:** No type errors (RPC calls will need RPC functions created)

**Step Checkpoint:**
- [ ] Functions added successfully ✅
- [ ] Post-action state matches expected ✅
- [ ] No syntax errors introduced ✅

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 3: Create RPC functions in database

**Target:** Supabase database
**Action Type:** CREATE (SQL migration)
**Purpose:** Create the RPC functions that the repository calls

**Note:** This step requires creating a new migration file with the RPC functions. The functions use UPDATE...FROM with JOIN as specified.

---

**Migration File Content:**
```sql
-- Migration: Add boost activation/expiration RPC functions
-- Per GAP-BOOST-ACTIVATION specification
-- IMPL Audit Fixes Applied:
--   1. COALESCE(u.total_sales, 0) to handle NULL total_sales
--   2. service_role ONLY grants (removed authenticated - security fix)

-- Function 1: activate_scheduled_boosts
-- Uses UPDATE...FROM with JOIN (no N+1)
-- Returns activated boost details
CREATE OR REPLACE FUNCTION activate_scheduled_boosts(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  sales_at_activation DECIMAL(10,2),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'active',
    activated_at = NOW(),
    expires_at = NOW() + (cb.duration_days || ' days')::INTERVAL,
    -- IMPL Audit Fix: COALESCE to handle NULL total_sales
    sales_at_activation = COALESCE(u.total_sales, 0)
  FROM redemptions r
  JOIN users u ON r.user_id = u.id AND u.client_id = p_client_id
  WHERE cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
    AND cb.boost_status = 'scheduled'
    AND cb.scheduled_activation_date <= CURRENT_DATE
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.sales_at_activation,
    cb.activated_at,
    cb.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: expire_active_boosts
-- Two-phase operation in single transaction (audit correction)
-- Uses DB GENERATED column for sales_delta (audit correction)
CREATE OR REPLACE FUNCTION expire_active_boosts(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  sales_at_activation DECIMAL(10,2),
  sales_at_expiration DECIMAL(10,2),
  sales_delta DECIMAL(10,2),
  boost_rate DECIMAL(5,2),
  final_payout_amount DECIMAL(10,2)
) AS $$
DECLARE
  expired_ids UUID[];
BEGIN
  -- Phase 1: Set sales_at_expiration (triggers sales_delta GENERATED column calculation)
  WITH expired AS (
    UPDATE commission_boost_redemptions cb
    -- IMPL Audit Fix: COALESCE to handle NULL total_sales
    SET sales_at_expiration = COALESCE(u.total_sales, 0)
    FROM redemptions r
    JOIN users u ON r.user_id = u.id AND u.client_id = p_client_id
    WHERE cb.redemption_id = r.id
      AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
      AND cb.boost_status = 'active'
      AND cb.expires_at <= NOW()
    RETURNING cb.id
  )
  SELECT ARRAY_AGG(id) INTO expired_ids FROM expired;

  -- If no boosts to expire, return empty
  IF expired_ids IS NULL OR array_length(expired_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Phase 2: Calculate final_payout_amount and transition to pending_info
  -- Uses sales_delta from GENERATED column (already calculated by Phase 1)
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'pending_info',
    final_payout_amount = cb.sales_delta * cb.boost_rate / 100
  FROM redemptions r
  WHERE cb.id = ANY(expired_ids)
    AND cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.sales_at_activation,
    cb.sales_at_expiration,
    cb.sales_delta,
    cb.boost_rate,
    cb.final_payout_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPL Audit Fix: Grant ONLY to service_role (cron uses this)
-- REMOVED: authenticated grants - these are cron-only operations
-- SECURITY: Prevents authenticated users from manipulating other tenants' boosts
GRANT EXECUTE ON FUNCTION activate_scheduled_boosts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION expire_active_boosts(UUID) TO service_role;
```

**Migration File Path:** `/home/jorge/Loyalty/Rumi/supabase/migrations/[timestamp]_boost_activation_rpcs.sql`

---

#### Step Checkpoint

**Checklist:**
- [ ] Migration file created
- [ ] Both RPC functions defined
- [ ] client_id filters present in all queries
- [ ] sales_delta uses GENERATED column (not calculated)
- [ ] Two-phase transaction in expire_active_boosts
- [ ] COALESCE(u.total_sales, 0) in both functions (IMPL Audit Fix)
- [ ] ONLY service_role grants, NO authenticated (IMPL Audit Fix)

**Checkpoint Status:** [PASS ✅ / FAIL ❌]

---

### Step 4: Update daily-automation route - Add import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Action Type:** MODIFY
**Purpose:** Import commissionBoostRepository

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read route.ts lines 24-31
```

**Expected Current State:**
```typescript
import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { processDailySales } from '@/lib/services/salesService';
import { runCheckpointEvaluation, checkForPromotions } from '@/lib/services/tierCalculationService';
import { sendAdminAlert, determineAlertType } from '@/lib/utils/alertService';
import { sendTierChangeNotification } from '@/lib/utils/notificationService';
import { createRaffleDrawingEvent } from '@/lib/utils/googleCalendar';
import { syncRepository } from '@/lib/repositories/syncRepository';
```

---

**Edit Action:**

**OLD Code:**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
```

**NEW Code:**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';
```

---

#### Post-Action Verification

**Read line 32:**
```bash
Read route.ts lines 31-33
```

**Expected:** New import present

---

### Step 5: Update CronSuccessResponse interface

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Action Type:** MODIFY
**Purpose:** Add boostActivation to response interface

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read route.ts lines 61-64
```

**Expected Current State:**
```typescript
    raffleCalendar: {
      eventsCreated: number;
    };
  };
```

---

**Edit Action:**

**OLD Code:**
```typescript
    raffleCalendar: {
      eventsCreated: number;
    };
  };
```

**NEW Code:**
```typescript
    raffleCalendar: {
      eventsCreated: number;
    };
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
    };
  };
```

---

### Step 6: Add boost activation/expiration step to route

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Action Type:** MODIFY
**Purpose:** Call boost activation and expiration functions after raffle calendar step

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read route.ts lines 216-221
```

**Expected Current State:**
```typescript
        }
      } catch (raffleError) {
        // Non-fatal: Log error, continue
        const errorMsg = raffleError instanceof Error ? raffleError.message : String(raffleError);
        console.warn(`[DailyAutomation] Raffle calendar check failed (non-fatal): ${errorMsg}`);
      }
```

---

**Edit Action:**

**OLD Code:**
```typescript
      } catch (raffleError) {
        // Non-fatal: Log error, continue
        const errorMsg = raffleError instanceof Error ? raffleError.message : String(raffleError);
        console.warn(`[DailyAutomation] Raffle calendar check failed (non-fatal): ${errorMsg}`);
      }

      return NextResponse.json(
```

**NEW Code:**
```typescript
      } catch (raffleError) {
        // Non-fatal: Log error, continue
        const errorMsg = raffleError instanceof Error ? raffleError.message : String(raffleError);
        console.warn(`[DailyAutomation] Raffle calendar check failed (non-fatal): ${errorMsg}`);
      }

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

      return NextResponse.json(
```

---

### Step 7: Add boostActivation to response data

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Action Type:** MODIFY
**Purpose:** Include boostActivation counts in response

---

#### Pre-Action Reality Check

**Read Current State:**
```bash
Read route.ts lines 243-246
```

**Expected Current State:**
```typescript
            raffleCalendar: {
              eventsCreated: raffleEventsCreated,
            },
          },
```

---

**Edit Action:**

**OLD Code:**
```typescript
            raffleCalendar: {
              eventsCreated: raffleEventsCreated,
            },
          },
```

**NEW Code:**
```typescript
            raffleCalendar: {
              eventsCreated: raffleEventsCreated,
            },
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
            },
          },
```

---

## Integration Verification

**All new code must integrate cleanly with existing code.**

---

### Import Verification

**File:** `daily-automation/route.ts`
**New Import:**
```typescript
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';
```

**Verification:**
```bash
npx tsc --noEmit app/api/cron/daily-automation/route.ts 2>&1 | head -20
```
**Expected:** No import errors

**Checklist:**
- [ ] Import path correct
- [ ] Exported names match (`commissionBoostRepository`)
- [ ] Types align

---

### Call Site Verification

**File:** `daily-automation/route.ts`
**Calls:**
```typescript
await commissionBoostRepository.activateScheduledBoosts(clientId)
await commissionBoostRepository.expireActiveBoosts(clientId)
```

**Verification:**
- [ ] Arguments match function signature (clientId: string)
- [ ] Return type handled correctly (destructured activatedCount, errors, etc.)
- [ ] Error handling in place (try/catch)

---

### Type Alignment Verification

**New Types Introduced:**
```typescript
ActivateBoostResult
ExpireBoostResult
```

**Verification:**
- [ ] Types exported from commissionBoostRepository.ts
- [ ] Types not needed in route (only counts used)
- [ ] No type conflicts with existing types

---

**INTEGRATION STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `activate_scheduled_boosts` RPC
```sql
WHERE cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
  AND u.client_id = p_client_id   -- JOIN condition also filters
```

**Security Checklist:**
- [ ] `client_id = p_client_id` present in WHERE
- [ ] JOIN also filters by client_id
- [ ] No cross-tenant data exposure possible

**Query 2:** `expire_active_boosts` RPC
```sql
WHERE cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter (Phase 1)
  AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter (Phase 2)
```

**Security Checklist:**
- [ ] `client_id = p_client_id` present in both phases
- [ ] Array of IDs comes from Phase 1 which is already filtered
- [ ] No cross-tenant data exposure possible

---

### Grep Verification (Explicit Check)

```bash
grep -n "client_id" supabase/migrations/*boost_activation*.sql
```
**Expected:** client_id filter on multiple lines (Phase 1, Phase 2, JOINs)

```bash
grep -n "clientId" lib/repositories/commissionBoostRepository.ts | tail -20
```
**Expected:** clientId validation and usage in new functions

---

**SECURITY STATUS:** [ALL CHECKS PASSED ✅ / ISSUES FOUND ❌]

---

## Feature Verification (ALL MUST PASS)

**No shortcuts. Run every command. Document actual results.**
**Each verification MUST trace back to Gap.md acceptance criteria.**

---

### Verification 1: Build Succeeds

**Command:**
```bash
npm run build 2>&1 | tail -20
```
**Expected:** Build completes without errors
**Actual:** [document actual output]

**Status:**
- [ ] Build passed ✅

---

### Verification 2: Type Check Passes

**Command:**
```bash
npx tsc --noEmit 2>&1 | grep "error" | wc -l
```
**Expected:** 0 errors (or same count as before)
**Actual:** [count]

**Status:**
- [ ] Type check passed ✅

---

### Verification 3: Acceptance Criteria Validation

#### Criterion 1: `activateScheduledBoosts()` function implemented with client_id filtering
**Test:** Check function exists and has client_id validation
**Command:**
```bash
grep -n "activateScheduledBoosts" lib/repositories/commissionBoostRepository.ts
grep -n "client_id" lib/repositories/commissionBoostRepository.ts | wc -l
```
**Expected:** Function exists, multiple client_id references
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 2: `expireActiveBoosts()` function implemented with client_id filtering
**Test:** Check function exists and has client_id validation
**Command:**
```bash
grep -n "expireActiveBoosts" lib/repositories/commissionBoostRepository.ts
```
**Expected:** Function exists
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 3: Both functions use UPDATE...FROM with JOIN (no N+1 queries)
**Test:** Check RPC functions use UPDATE...FROM
**Command:**
```bash
grep -n "UPDATE.*FROM" supabase/migrations/*boost_activation*.sql
```
**Expected:** UPDATE...FROM pattern in both RPCs
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 4: `expireActiveBoosts()` uses DB GENERATED `sales_delta`
**Test:** Check sales_delta is read from RETURNING, not calculated in app
**Command:**
```bash
grep -n "sales_delta" lib/repositories/commissionBoostRepository.ts
```
**Expected:** Comment mentions "From DB GENERATED column", no calculation
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 5: `expireActiveBoosts()` wrapped in single transaction
**Test:** Check RPC has both phases in single function
**Command:**
```bash
grep -n "Phase 1\|Phase 2" supabase/migrations/*boost_activation*.sql
```
**Expected:** Both phases in single LANGUAGE plpgsql function
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 6: daily-automation route calls both functions
**Test:** Check calls exist in route
**Command:**
```bash
grep -n "activateScheduledBoosts\|expireActiveBoosts" app/api/cron/daily-automation/route.ts
```
**Expected:** Both function calls present
**Status:** [ ] PASS ✅ / FAIL ❌

#### Criterion 7: Response includes boostActivation
**Test:** Check interface and response
**Command:**
```bash
grep -n "boostActivation" app/api/cron/daily-automation/route.ts
```
**Expected:** In interface and response object
**Status:** [ ] PASS ✅ / FAIL ❌

---

### Verification 4: Git Diff Sanity Check

**Command:**
```bash
git diff --stat
```

**Expected Changes:**
- `lib/repositories/commissionBoostRepository.ts`: ~130 lines added
- `app/api/cron/daily-automation/route.ts`: ~55 lines added
- `supabase/migrations/..._boost_activation_rpcs.sql`: NEW file ~80 lines

**Status:**
- [ ] Diff shows only expected changes ✅
- [ ] No unexpected files modified ✅

---

**FEATURE VERIFICATION STATUS:** [ALL PASSED ✅ / FAILED ❌]

**Acceptance Criteria Summary:**
| Criterion | From Gap.md | Test Result |
|-----------|-------------|-------------|
| 1 | activateScheduledBoosts with client_id | ✅ / ❌ |
| 2 | expireActiveBoosts with client_id | ✅ / ❌ |
| 3 | UPDATE...FROM with JOIN | ✅ / ❌ |
| 4 | DB GENERATED sales_delta | ✅ / ❌ |
| 5 | Single transaction | ✅ / ❌ |
| 6 | Route integration | ✅ / ❌ |
| 7 | Response includes counts | ✅ / ❌ |

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** 2025-12-13
**Executor:** Claude Opus 4.5
**Specification Source:** BoostActivationGap.md
**Implementation Doc:** BoostActivationGapIMPL.md
**Gap ID:** GAP-BOOST-ACTIVATION

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
[Timestamp] Step 1: Add interfaces - [status]
[Timestamp] Step 2: Implement activateScheduledBoosts - [status]
[Timestamp] Step 3: Create RPC migration - [status]
[Timestamp] Step 4: Add import to route - [status]
[Timestamp] Step 5: Update response interface - [status]
[Timestamp] Step 6: Add boost lifecycle step - [status]
[Timestamp] Step 7: Add to response data - [status]
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
[Timestamp] client_id grep verification - [PASS/FAIL]
```

**Feature Verification:**
```
[Timestamp] Build succeeds - [status]
[Timestamp] Type check passes - [status]
[Timestamp] Criteria 1-7 - [status each]
[Timestamp] Git diff sanity - [status]
```

---

### Files Created/Modified

**Complete List:**
1. `lib/repositories/commissionBoostRepository.ts` - MODIFY - ~130 lines added - activation/expiration functions
2. `app/api/cron/daily-automation/route.ts` - MODIFY - ~55 lines added - integration + response
3. `supabase/migrations/[timestamp]_boost_activation_rpcs.sql` - CREATE - ~80 lines - RPC functions

**Total:** 3 files, ~265 lines added

---

### Auditor Verification Commands

**Quick Verification (Run These):**

```bash
# 1. Verify files changed
git diff --stat

# 2. Verify no type errors
npx tsc --noEmit 2>&1 | grep "error" | wc -l

# 3. Verify client_id filters in repository
grep -n "client_id\|clientId" lib/repositories/commissionBoostRepository.ts | wc -l

# 4. Verify client_id filters in migration
grep -n "client_id" supabase/migrations/*boost_activation*.sql | wc -l

# 5. Verify integration in route
grep -n "commissionBoostRepository\|boostActivation" app/api/cron/daily-automation/route.ts
```

---

## Document Status

**Implementation Date:** 2025-12-13
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed ✅
- [ ] Gap confirmed to exist
- [ ] Partial code checked (no duplication)
- [ ] Schema verified
- [ ] API contract verified (additive changes only)

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

**Feature Verification:**
- [ ] Build succeeds ✅
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
- Next: Update BoostActivationGap.md status to "Implemented"

---

### Next Actions

**If implementation succeeded:**
1. [ ] Apply database migration
2. [ ] Git commit with message (template below)
3. [ ] Update BoostActivationGap.md status to "Implemented"
4. [ ] Verify in clean build
5. [ ] Add Task 8.3.5 to EXECUTION_PLAN.md

**Git Commit Message Template:**
```
feat: Add commission boost activation/expiration automation

Implements GAP-BOOST-ACTIVATION: Commission boost lifecycle automation

New functions:
- commissionBoostRepository.activateScheduledBoosts()
- commissionBoostRepository.expireActiveBoosts()

Database:
- activate_scheduled_boosts RPC (UPDATE...FROM with JOIN)
- expire_active_boosts RPC (two-phase transaction)

Integration:
- daily-automation route Step 3e calls both functions
- Response includes boostActivation counts

Audit corrections applied:
- N+1 query eliminated via UPDATE...FROM
- sales_delta from DB GENERATED column
- Atomic transaction for expiration

References:
- BugFixes/BoostActivationGap.md
- BugFixes/BoostActivationGapIMPL.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Anti-Hallucination Final Check

**Before marking this document COMPLETE, verify you:**

### Reality Checks
- [ ] Actually ran EVERY bash command (not imagined output)
- [ ] Read EVERY file mentioned (not from memory)
- [ ] Used EXACT line numbers from files (not approximated)
- [ ] Used COMPLETE code blocks (zero placeholders)
- [ ] Verified against reality (not assumed)
- [ ] Read SchemaFinalv2.md for database columns
- [ ] Confirmed gap still exists before implementation

### Specification Fidelity
- [ ] Followed locked specification (no re-design)
- [ ] Implemented specified solution exactly (no modifications)
- [ ] Addressed audit feedback (N+1, generated column, transaction)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] Used grep to confirm client_id presence
- [ ] No cross-tenant data exposure

### Acceptance Criteria
- [ ] EVERY criterion from Gap.md tested
- [ ] Each test traces back to specific criterion
- [ ] All criteria documented as PASS/FAIL

---

**META-VERIFICATION STATUS:** [ALL CHECKS PASSED ✅ / CHECKS FAILED ❌]

---

**Document Version:** 1.1
**Created:** 2025-12-13
**Author:** Claude Opus 4.5
**Status:** READY FOR EXECUTION (IMPL Audit Corrections Applied)

---

## Appendix: IMPL Audit Review Summary

### Audit Received: 2025-12-13
**Recommendation:** APPROVE WITH CHANGES

### Critical Issues (Fixed)

| Issue | Problem | Fix Applied |
|-------|---------|-------------|
| **RPC Types** | `supabase.rpc('activate_scheduled_boosts')` would fail tsc because RPC not in generated types | Use `(supabase.rpc as Function)('...')` pattern in both function calls |
| **Over-broad Grants** | `GRANT ... TO authenticated` with `SECURITY DEFINER` allows any user to manipulate any tenant's boosts | Removed `authenticated` grants; `service_role` only (cron-only operations) |

### Concerns (Addressed)

| Concern | Problem | Fix Applied |
|---------|---------|-------------|
| **NULL Handling** | `sales_at_activation = u.total_sales` fails if `total_sales` is NULL, causing NULL `sales_delta` and `final_payout_amount` | Added `COALESCE(u.total_sales, 0)` in both RPCs |
| **Line Numbers** | Auditor noted lines might be stale | Verified: file is 253 lines as documented |

### Auditor Questions Answered

**Q1: Can we make Supabase type regeneration a required step (or adopt `as Function`)?**
A: Adopted `as Function` pattern. Matches existing codebase patterns. Type regeneration can be done as future cleanup.

**Q2: Is there any product requirement for end-users to invoke these RPCs?**
A: No. These are cron-only operations. No user-facing feature calls boost activation/expiration. `service_role` only is correct.

### Changes Made to IMPL Document

1. **Step 2:** Added `// IMPL Audit Fix:` comment and `as Function` pattern to both RPC calls
2. **Step 3 Migration:**
   - Added `COALESCE(u.total_sales, 0)` in both functions
   - Removed `TO authenticated` grants
   - Added header comment documenting fixes
3. **Step 3 Checkpoint:** Added verification items for COALESCE and service_role-only grants
4. **Audit Feedback section:** Updated to include IMPL audit summary
5. **Document Version:** Updated to 1.1
