# Boost Expiration State Skip - Fix Documentation

**Bug ID:** BUG-BOOST-EXPIRATION-STATE
**Created:** 2025-12-13
**Status:** Analysis Complete
**Severity:** Medium
**Related Tasks:** Task 6.4.3, Task 8.4.8 from EXECUTION_PLAN.md
**Linked Bugs:** Related to GAP-BOOST-ACTIVATION (the implementation that introduced this bug)

---

## 1. Project Context

This is a multi-tenant loyalty rewards platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The system manages VIP tier rewards for TikTok creators, including a Commission Boost reward type that has a complex 6-state lifecycle.

The bug affects the Commission Boost expiration logic in the daily automation cron job. Commission Boost rewards allow creators to earn a percentage bonus on sales made during a defined period. The state machine tracks the boost through: scheduled → active → expired → pending_info → pending_payout → paid.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers (per ARCHITECTURE.md Section 5)

---

## 2. Bug Summary

**What's happening:** The `expire_active_boosts` RPC function transitions boosts directly from `active` to `pending_info`, skipping the `expired` intermediate state. The boost row never remains in `expired` state, so it cannot be queried or observed by admin UI.

**What should happen:** Per the documented 6-state lifecycle, boosts should transition `active → expired` first (setting `sales_at_expiration`, calculating `sales_delta` and `final_payout_amount`), leaving the row in `expired` state. A separate operation should then transition `expired → pending_info` when the system is ready to request payment information.

**Impact:**
- `expired` state is never observable (row skips directly to `pending_info`)
- Admin cannot filter/view boosts in "payout calculated, awaiting review" state
- Tests expecting `boost_status='expired'` will fail (Task 6.4.3 Test Case 3)
- State history audit trail is incomplete (missing `expired` state)
- No window for admin to apply `admin_adjusted_commission` before payment request

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **STATE_TRANSITIONS.md** | Section "3. commission_boost_redemptions.boost_status (6 states)" | Explicitly shows `active → expired → pending_info` as separate transitions with distinct triggers |
| **STATE_TRANSITIONS.md** | "Valid Transitions" table | Documents `active → expired` trigger as "duration_days elapsed" and `expired → pending_info` trigger as "System prompts user for payment info" |
| **STATE_TRANSITIONS.md** | "Key Fields Updated at Each State" table | Shows `expired` state sets: `expires_at`, `sales_at_expiration`, `sales_delta`, `calculated_commission` |
| **STATE_TRANSITIONS.md** | "Commission Boost" flow diagram (lines 311-341) | Shows `boost_status = 'expired', sales_delta calculated` as step BEFORE `boost_status = 'pending_info'` |
| **MissionsRewardsFlows.md** | "COMMISSION BOOST REWARD FLOW - ATTRIBUTE MAPPING" table | Step 5 shows `boost_status='expired'` with `sales_at_expiration`, `sales_delta`, `final_payout_amount` calculated; Step 6 shows separate `boost_status='pending_info'` |
| **MissionsRewardsFlows.md** | "commission_boost_redemptions (Sub-State: 6-State Lifecycle + Payment)" | Lists full state machine: `'scheduled' → 'active' → 'expired' → 'pending_info' → 'pending_payout' → 'paid'` |
| **SchemaFinalv2.md** | "boost_status Values" section | Defines `expired` as "Boost period ended, calculating payout" - distinct from `pending_info` "Waiting for payment info from creator" |
| **SchemaFinalv2.md** | CHECK constraint definition | Constraint allows all 6 states including `expired`: `boost_status IN ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid')` |
| **Loyalty.md** | "Pattern 4: Auto-Sync Triggers" | Mapping shows `scheduled/active/expired/pending_info → claimed` - confirms `expired` is a valid state that keeps redemption in `claimed` status |
| **Loyalty.md** | "Pattern 5: Status Validation Constraints" | Lists all 6 valid boost_status values including `expired` |
| **REWARDS_IMPL.md** | "commission_boost_redemptions Table" section | Documents `boost_status` VARCHAR(50) with all 6 states |
| **tests/integration/rewards/commission-boost-lifecycle.test.ts** | Test Case 3 description | Test explicitly expects to READ `boost_status='expired'` from the row after expiration |
| **EXECUTION_PLAN.md** | Task 6.4.3 | Test cases include "(3) expiration sets boost_status='expired' and sales_at_expiration" |
| **supabase/migrations/20251213_boost_activation_rpcs.sql** | `expire_active_boosts` function Phase 2 | Current code sets `boost_status = 'pending_info'` directly, skipping `expired` |

### Key Evidence

**Evidence 1:** STATE_TRANSITIONS.md defines two separate transitions
- Source: STATE_TRANSITIONS.md, "Valid Transitions" table
- Quote:
  - `"| active | expired | duration_days elapsed | redemptions.status stays 'claimed' |"`
  - `"| expired | pending_info | System prompts user for payment info | redemptions.status stays 'claimed' |"`
- Implication: These are documented as TWO distinct transitions with different triggers, not one atomic operation

**Evidence 2:** MissionsRewardsFlows.md shows separate steps
- Source: MissionsRewardsFlows.md, "COMMISSION BOOST REWARD FLOW - ATTRIBUTE MAPPING" table
- Quote:
  - `"| **5** | Boost expires | ... | boost_status='expired' ... sales_delta calculated, final_payout_amount calculated |"`
  - `"| **6** | System requests payment info | ... | boost_status='pending_info' |"`
- Implication: Step 5 and Step 6 are distinct operations in the business flow

**Evidence 3:** Test expects to READ `expired` state from row
- Source: tests/integration/rewards/commission-boost-lifecycle.test.ts, Test Case 3
- Quote: `"// Test Case 3: Expiration sets boost_status='expired' and sales_at_expiration"`
- Code: `expect(data.redemption.boostDetails.boostStatus).toBe('expired');`
- Implication: Test reads the current row status, not state_history - requires row to BE in `expired` state

**Evidence 4:** Current RPC skips `expired` entirely
- Source: supabase/migrations/20251213_boost_activation_rpcs.sql, Phase 2
- Quote: `"SET boost_status = 'pending_info'"`
- Implication: Row never has `boost_status='expired'`, tests fail, admin can't query

**Evidence 5:** `expired` state has distinct business meaning
- Source: SchemaFinalv2.md, "boost_status Values" section
- Quote:
  - `"expired: Boost period ended, calculating payout"`
  - `"pending_info: Waiting for payment info from creator"`
- Implication: These states represent different business conditions that must be observable

---

## 4. Root Cause Analysis

**Root Cause:** The `expire_active_boosts` RPC was implemented to combine expiration and payment-request-ready transitions into a single UPDATE, but this eliminated the observable `expired` state that the documented lifecycle requires.

**Contributing Factors:**
1. GAP-BOOST-ACTIVATION implementation focused on avoiding N+1 queries and ensuring transactionality
2. The distinction between `expired` (payout calculated, awaiting review) and `pending_info` (ready for payment request) was collapsed
3. Audit feedback focused on query efficiency and NULL handling, not state machine fidelity
4. Initial fix proposal (three-phase in single RPC) still ended in `pending_info`, not solving observability

**How it was introduced:** During GAP-BOOST-ACTIVATION implementation on 2025-12-13, the `expire_active_boosts` RPC was designed to set `boost_status = 'pending_info'` directly in Phase 2, skipping the intermediate `expired` state to reduce database operations.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| **State Observability** | `expired` state never exists in row - cannot query, filter, or display | High |
| **Admin Visibility** | Cannot see boosts in "payout calculated, awaiting review" state | Medium |
| **Test Suite** | Task 6.4.3 Test Case 3 reads row status, expects `expired` - will fail | High |
| **Audit Trail** | State history missing `expired` transition - compliance gap | Medium |
| **Manual Adjustments** | No window to apply `admin_adjusted_commission` before payment request | Low |

**Business Risk Summary:** The core payout calculation works correctly, but the `expired` state is never observable. Tests that verify the state machine will fail. Admins cannot view or filter boosts in the "payout calculated" state before payment info is requested. This violates the documented 6-state lifecycle.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql`

```sql
-- Current code (Phase 2 of expire_active_boosts function)
-- Phase 2: Calculate final_payout_amount and transition to pending_info
-- Uses sales_delta from GENERATED column (already calculated by Phase 1)
RETURN QUERY
UPDATE commission_boost_redemptions cb
SET
  boost_status = 'pending_info',  -- BUG: Row never has 'expired' status
  final_payout_amount = cb.sales_delta * cb.boost_rate / 100
FROM redemptions r
WHERE cb.id = ANY(expired_ids)
  AND cb.redemption_id = r.id
  AND cb.client_id = p_client_id
RETURNING
  cb.id AS boost_redemption_id,
  cb.redemption_id,
  r.user_id,
  cb.sales_at_activation,
  cb.sales_at_expiration,
  cb.sales_delta,
  cb.boost_rate,
  cb.final_payout_amount;
```

**Current Behavior:**
- Phase 1: Sets `sales_at_expiration`, triggers `sales_delta` GENERATED column
- Phase 2: Sets `boost_status = 'pending_info'` and calculates `final_payout_amount`
- Row NEVER has `boost_status = 'expired'`
- State history logs only: `active → pending_info` (skips `expired`)

### Current Data Flow

```
Daily Cron (2 PM EST)
       │
       ▼
expire_active_boosts RPC
       │
       ├─► Phase 1: SET sales_at_expiration
       │   (sales_delta calculated by DB)
       │
       └─► Phase 2: SET boost_status = 'pending_info'  ← BUG
           SET final_payout_amount
           │
           ▼
       Row status: 'pending_info' (NEVER 'expired')
       State History: active → pending_info (MISSING 'expired')
```

---

## 7. Proposed Fix

### Approach: Two Separate Cron Operations

Split the expiration flow into two distinct operations that match the documented Steps 5 and 6:

1. **`expire_active_boosts` RPC (modified):** Transitions `active → expired`
   - Sets `sales_at_expiration`, triggers `sales_delta` calculation
   - Sets `boost_status = 'expired'`
   - Calculates `final_payout_amount`
   - Returns rows now in `expired` state

2. **`transition_expired_to_pending_info` RPC (new):** Transitions `expired → pending_info`
   - Sets `boost_status = 'pending_info'`
   - Returns rows now in `pending_info` state

The daily cron calls both in sequence. For MVP, there is no delay between them, but the architecture supports adding a configurable dwell time in the future.

**Why this is architecturally sound:**
- Each state is observable and queryable (row actually IS in that state)
- Matches documented Steps 5 and 6 as separate operations
- Admin can filter/report on `expired` boosts (payout calculated, awaiting review)
- Tests pass as written (boost row IS in `expired` state after first operation)
- State history accurately reflects what happened (two distinct transitions)
- Future flexibility: can add admin approval gate or dwell time between states

### Changes Required

#### Migration File (Replaced)

**File:** `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql`

**Note:** Since this migration was never applied to any environment, we deleted and recreated the file with the correct implementation rather than creating a new migration file. This avoids dead code.

```sql
-- Migration: Add boost activation/expiration RPC functions
-- Per GAP-BOOST-ACTIVATION specification + BUG-BOOST-EXPIRATION-STATE fix
--
-- Functions:
--   1. activate_scheduled_boosts - Transitions scheduled → active
--   2. expire_active_boosts - Transitions active → expired (NOT pending_info)
--   3. transition_expired_to_pending_info - Transitions expired → pending_info
--
-- SECURITY: All functions use SECURITY DEFINER with service_role-only grants
-- MULTI-TENANT: All functions require p_client_id and filter all queries

-- ============================================================================
-- Function 1: activate_scheduled_boosts (unchanged from original)
-- ============================================================================
-- [See full file for activate_scheduled_boosts implementation]

-- ============================================================================
-- Function 2: expire_active_boosts (FIXED)
-- Now ends in 'expired' state, NOT 'pending_info'
-- ============================================================================
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

  -- Phase 2: Set 'expired' status and calculate final_payout_amount
  -- Row now observable in 'expired' state (Step 5 of documented flow)
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'expired',  -- FIX: Now ends in 'expired', not 'pending_info'
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

-- ============================================================================
-- Function 2: transition_expired_to_pending_info (NEW)
-- Handles Step 6: System requests payment info
-- ============================================================================
CREATE OR REPLACE FUNCTION transition_expired_to_pending_info(p_client_id UUID)
RETURNS TABLE (
  boost_redemption_id UUID,
  redemption_id UUID,
  user_id UUID,
  final_payout_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  UPDATE commission_boost_redemptions cb
  SET
    boost_status = 'pending_info'
  FROM redemptions r
  WHERE cb.redemption_id = r.id
    AND cb.client_id = p_client_id  -- CRITICAL: Multi-tenant filter
    AND cb.boost_status = 'expired'
  RETURNING
    cb.id AS boost_redemption_id,
    cb.redemption_id,
    r.user_id,
    cb.final_payout_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grants: service_role ONLY (cron uses this, not authenticated users)
-- ============================================================================
GRANT EXECUTE ON FUNCTION expire_active_boosts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION transition_expired_to_pending_info(UUID) TO service_role;

-- SECURITY: Revoke from public (defense in depth)
REVOKE EXECUTE ON FUNCTION expire_active_boosts(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_expired_to_pending_info(UUID) FROM PUBLIC;
```

#### Repository Changes

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`

**Add new interface (after ExpireBoostResult):**
```typescript
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
```

**Modify expireActiveBoosts return type comment:**
```typescript
  /**
   * Expire active boosts where expires_at <= NOW().
   *
   * IMPORTANT: After this call, boosts are in 'expired' state (NOT 'pending_info').
   * Call transitionExpiredToPendingInfo() to move to 'pending_info'.
   *
   * Per BUG-BOOST-EXPIRATION-STATE fix: expired is now an observable state.
   */
```

**Add new function (after expireActiveBoosts):**
```typescript
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
      // IMPL Audit Fix: Use 'as Function' pattern since RPC not in generated types yet
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
```

#### Route Changes

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`

**Update CronSuccessResponse interface:**
```typescript
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
      transitionedToPendingInfoCount: number;  // NEW
    };
```

**Update boost lifecycle step (after expireActiveBoosts call):**
```typescript
      // Step 3e: Activate/expire commission boosts (GAP-BOOST-ACTIVATION)
      // Per Loyalty.md line 416: "Aligned with commission boost activation (2 PM EST)"
      console.log(`[DailyAutomation] Processing commission boost lifecycle`);
      let boostActivatedCount = 0;
      let boostExpiredCount = 0;
      let boostTransitionedCount = 0;
      try {
        // Step 5: Activate scheduled boosts (scheduled → active)
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

**Update response data:**
```typescript
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
              transitionedToPendingInfoCount: boostTransitionedCount,
            },
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20251213_boost_activation_rpcs.sql` | REPLACE | Deleted and recreated with corrected `expire_active_boosts` (ends in `expired`) and new `transition_expired_to_pending_info` RPC |
| `lib/repositories/commissionBoostRepository.ts` | MODIFY | Add `TransitionToPendingInfoResult` interface, add `transitionExpiredToPendingInfo()` function, update `expireActiveBoosts()` comments |
| `app/api/cron/daily-automation/route.ts` | MODIFY | Update `CronSuccessResponse` interface, add `transitionExpiredToPendingInfo` call, update response data |

### Dependency Graph

```
20251213_boost_activation_rpcs.sql (REPLACED)
├── original file deleted and recreated with correct implementation
├── imported by: (none - migration file)
├── called by: commissionBoostRepository.expireActiveBoosts()
│              commissionBoostRepository.transitionExpiredToPendingInfo()
└── affects: commission_boost_redemptions table, commission_boost_state_history table

commissionBoostRepository.ts
├── imports from: @/lib/supabase/server-client
├── imported by: daily-automation/route.ts
└── exports: expireActiveBoosts(), transitionExpiredToPendingInfo()

daily-automation/route.ts
├── imports from: commissionBoostRepository
└── calls: expireActiveBoosts() THEN transitionExpiredToPendingInfo()
```

---

## 9. Data Flow Analysis

### Before Fix

```
expire_active_boosts()
       │
       ▼
Phase 1: UPDATE SET sales_at_expiration
       │
       ▼
Phase 2: UPDATE SET boost_status='pending_info', final_payout_amount
       │
       ▼
Row status: 'pending_info' (NEVER 'expired')
State History: [active → pending_info]  ← INCORRECT
```

### After Fix

```
expire_active_boosts()
       │
       ▼
Phase 1: UPDATE SET sales_at_expiration
       │
       ▼
Phase 2: UPDATE SET boost_status='expired', final_payout_amount
       │
       ▼
Row status: 'expired'  ← OBSERVABLE STATE
State History: [active → expired]  ← CORRECT
       │
       ▼
transition_expired_to_pending_info()
       │
       ▼
UPDATE SET boost_status='pending_info'
       │
       ▼
Row status: 'pending_info'
State History: [expired → pending_info]  ← CORRECT
```

### Data Transformation Steps

1. **expire_active_boosts Phase 1:** Set `sales_at_expiration = user.total_sales` → triggers `sales_delta` GENERATED column
2. **expire_active_boosts Phase 2:** Set `boost_status = 'expired'`, calculate `final_payout_amount` → state_history logs `active → expired`, row IS in `expired` state
3. **transition_expired_to_pending_info:** Set `boost_status = 'pending_info'` → state_history logs `expired → pending_info`

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/cron/daily-automation (route.ts)
│
├─► processDailySales() (salesService.ts)
│
├─► checkForPromotions() (tierCalculationService.ts)
│
├─► runCheckpointEvaluation() (tierCalculationService.ts)
│
├─► createRaffleDrawingEvent() (googleCalendar.ts)
│
├─► commissionBoostRepository.activateScheduledBoosts()
│
├─► commissionBoostRepository.expireActiveBoosts()  ← MODIFIED
│   │
│   └─► supabase.rpc('expire_active_boosts')
│       └─► Now ends in 'expired' state (FIX)
│
└─► commissionBoostRepository.transitionExpiredToPendingInfo()  ← NEW
    │
    └─► supabase.rpc('transition_expired_to_pending_info')
        └─► Moves 'expired' → 'pending_info'
```

### Integration Points

| Layer | Component | Role in Fix |
|-------|-----------|-------------|
| Database | `expire_active_boosts` RPC | Modified to end in `expired` state |
| Database | `transition_expired_to_pending_info` RPC | New function for Step 6 |
| Database | `commission_boost_state_history` trigger | Now receives both transitions |
| Repository | `expireActiveBoosts()` | Returns rows in `expired` state |
| Repository | `transitionExpiredToPendingInfo()` | New function |
| Route | `daily-automation` | Calls both functions in sequence |
| Frontend | Admin dashboard | Can now filter by `expired` status |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| `commission_boost_redemptions` | `boost_status`, `sales_at_expiration`, `sales_delta`, `final_payout_amount` | Row will now be observable in `expired` state |
| `commission_boost_state_history` | `from_status`, `to_status`, `transitioned_at` | Will log both `active→expired` and `expired→pending_info` |

### Schema Check

```sql
-- Verify expired is a valid status (it is per CHECK constraint)
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%boost_status%';

-- Expected: boost_status IN ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid')
```

### Data Migration Required?
- [ ] Yes
- [x] No - schema already supports `expired` state, just need to use it

### Migration Strategy
- **REPLACED** `20251213_boost_activation_rpcs.sql` (deleted and recreated)
- Since migration was never applied to any environment, we avoided dead code by replacing the file
- File now contains all three RPCs with correct implementation

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Admin Redemptions List | (Phase 12) | Can now filter by `expired` status |
| Creator Rewards Status | (existing) | None - shows boost as "in progress" for both expired and pending_info |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| `CronSuccessResponse.boostActivation` | `{activatedCount, expiredCount}` | `{activatedCount, expiredCount, transitionedToPendingInfoCount}` | No (additive) |

### Frontend Changes Required?
- [ ] Yes
- [x] No - API changes are additive, frontend unaffected

---

## 13. Alternative Solutions Considered

### Option A: Two Separate Cron Operations (Selected)
- **Description:** `expire_active_boosts` ends in `expired`; new `transition_expired_to_pending_info` handles Step 6
- **Pros:**
  - Each state is observable and queryable
  - Matches documented Steps 5 and 6
  - Admin can filter/report on `expired` boosts
  - Tests pass as written
  - State history accurate
  - Future-proof: can add dwell time or approval gate
- **Cons:** Two RPC calls instead of one
- **Verdict:** ✅ Selected - architecturally sound, matches design

### Option B: Three-Phase UPDATE in Single RPC
- **Description:** Add Phase 3 to set `pending_info` after Phase 2 sets `expired` in same function
- **Pros:** Single RPC call
- **Cons:**
  - Row still ends in `pending_info` - tests fail
  - Admin can't query `expired` state
  - Only state_history shows transition, not observable
- **Verdict:** ❌ Rejected - doesn't solve observability problem

### Option C: Update Documentation to Remove `expired` State
- **Description:** Remove `expired` from the 6-state lifecycle, make it a 5-state lifecycle
- **Pros:** No code changes needed
- **Cons:**
  - Changes business semantics
  - Loses admin visibility
  - Requires updating multiple docs, tests, CHECK constraint
- **Verdict:** ❌ Rejected - changes business requirements to match incorrect implementation

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| State history trigger doesn't fire | Low | Medium | Test with manual query after fix |
| Performance impact from second RPC call | Low | Low | Separate transaction, batch operation |
| Existing data in wrong state | N/A | N/A | No production data yet (feature not deployed) |
| Migration conflicts with prior migration | N/A | N/A | Replaced file since never applied |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API Response | No | Additive field only |
| Database | No | Schema already supports `expired` |
| Frontend | No | No changes required |

### Multi-Tenant Security Verification
- [x] `expire_active_boosts` has `p_client_id` parameter and `cb.client_id = p_client_id` filter
- [x] `transition_expired_to_pending_info` has `p_client_id` parameter and `cb.client_id = p_client_id` filter
- [x] Both functions granted to `service_role` only
- [x] Both functions have `REVOKE FROM PUBLIC`

---

## 15. Testing Strategy

### Unit Tests

Task 6.4.3 Test Case 3 will now pass:

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/rewards/commission-boost-lifecycle.test.ts`
```typescript
describe('Test Case 3: Expiration sets status=expired and sales_at_expiration', () => {
  it('should set boost_status to expired after duration_days', async () => {
    // After fix: boost row IS in 'expired' state after expireActiveBoosts()
    // Test reads current row status - will pass
    expect(data.redemption.boostDetails.boostStatus).toBe('expired');
  });
});
```

### New Tests Needed

**File:** `/home/jorge/Loyalty/Rumi/appcode/tests/integration/rewards/boost-expiration-fix.test.ts`
```typescript
describe('BUG-BOOST-EXPIRATION-STATE fix', () => {
  it('should leave boost in expired state after expireActiveBoosts', async () => {
    // 1. Create boost in 'active' state with expires_at in past
    // 2. Call expireActiveBoosts RPC
    // 3. Query commission_boost_redemptions
    // 4. Verify boost_status = 'expired' (NOT 'pending_info')
  });

  it('should transition to pending_info after transitionExpiredToPendingInfo', async () => {
    // 1. Create boost in 'expired' state
    // 2. Call transitionExpiredToPendingInfo RPC
    // 3. Query commission_boost_redemptions
    // 4. Verify boost_status = 'pending_info'
  });

  it('should log both transitions in state_history', async () => {
    // 1. Create boost in 'active' state with expires_at in past
    // 2. Call expireActiveBoosts RPC
    // 3. Call transitionExpiredToPendingInfo RPC
    // 4. Query commission_boost_state_history
    // 5. Verify TWO entries: active→expired AND expired→pending_info
  });
});
```

### Manual Verification Steps

1. [ ] Apply new migration to test database
2. [ ] Insert test boost with `boost_status='active'` and `expires_at` in past
3. [ ] Call `SELECT * FROM expire_active_boosts('client-uuid')`
4. [ ] Verify boost now has `boost_status='expired'` (NOT 'pending_info')
5. [ ] Call `SELECT * FROM transition_expired_to_pending_info('client-uuid')`
6. [ ] Verify boost now has `boost_status='pending_info'`
7. [ ] Query `commission_boost_state_history` for this boost
8. [ ] Verify TWO rows: `active→expired` and `expired→pending_info`

### Verification Commands

```bash
# Apply migration
cd /home/jorge/Loyalty/Rumi/supabase
supabase db push

# Run specific tests
cd /home/jorge/Loyalty/Rumi/appcode
npm test -- --testPathPattern=commission-boost-lifecycle
npm test -- --testPathPattern=boost-expiration-fix

# Type check
npm run typecheck

# Build verification
npm run build
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress
- [x] Confirm 20251213 migration should NOT be edited (create new migration)

### Implementation Steps
- [x] **Step 1:** Replace migration file (DONE)
  - File: `/home/jorge/Loyalty/Rumi/supabase/migrations/20251213_boost_activation_rpcs.sql`
  - Action: Deleted old file, created new with all three RPCs

- [ ] **Step 2:** Add `TransitionToPendingInfoResult` interface
  - File: `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
  - Location: After `ExpireBoostResult` interface

- [ ] **Step 3:** Update `expireActiveBoosts()` JSDoc comments
  - File: `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
  - Change: Note that function now ends in `expired` state

- [ ] **Step 4:** Add `transitionExpiredToPendingInfo()` function
  - File: `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/commissionBoostRepository.ts`
  - Location: After `expireActiveBoosts()` function

- [ ] **Step 5:** Update `CronSuccessResponse` interface
  - File: `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
  - Change: Add `transitionedToPendingInfoCount` field

- [ ] **Step 6:** Update boost lifecycle step in route
  - File: `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
  - Change: Add call to `transitionExpiredToPendingInfo()` after `expireActiveBoosts()`

- [ ] **Step 7:** Update response data
  - File: `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
  - Change: Include `transitionedToPendingInfoCount` in response

### Post-Implementation
- [ ] Apply migration: `supabase db push`
- [ ] Run type checker: `npm run typecheck`
- [ ] Run tests: `npm test -- --testPathPattern=commission-boost-lifecycle`
- [ ] Verify state_history has both transitions (manual SQL query)
- [ ] Run build: `npm run build`
- [ ] Update this document status to "Implemented"

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 6.4.3 | Test commission_boost full lifecycle | Test Case 3 expects `expired` state - will pass after fix |
| 8.4.8 | Test scheduled activation at correct time | Test expects `expired` state - will pass after fix |

### Updates Required

**Task 6.4.3:**
- Current AC: Test expects `boost_status='expired'` at step 3
- Updated AC: No change needed - test is correct, implementation was wrong
- Notes: Fix the implementation, not the test

**Task 8.4.8:**
- Current AC: Test expects expiration to set `boost_status='expired'`
- Updated AC: No change needed
- Notes: Implementation fix makes test pass as written

### New Tasks Created (if any)
- None - this is a bug fix, not new functionality

---

## 18. Definition of Done

- [x] Migration file replaced (`20251213_boost_activation_rpcs.sql`)
- [ ] Migration applied to database
- [ ] `commissionBoostRepository` has new `transitionExpiredToPendingInfo()` function
- [ ] `daily-automation` route calls both functions in sequence
- [ ] After `expireActiveBoosts()`, boost row IS in `expired` state
- [ ] After `transitionExpiredToPendingInfo()`, boost row IS in `pending_info` state
- [ ] State history shows both `active→expired` and `expired→pending_info` transitions
- [ ] Task 6.4.3 Test Case 3 passes
- [ ] Type checker passes with no errors
- [ ] Build completes successfully
- [ ] Multi-tenant filters verified in both RPCs
- [ ] Grants verified as `service_role` only
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| STATE_TRANSITIONS.md | "3. commission_boost_redemptions.boost_status (6 states)", "Valid Transitions" table, "Commission Boost" flow | Authoritative state machine definition |
| MissionsRewardsFlows.md | "COMMISSION BOOST REWARD FLOW - ATTRIBUTE MAPPING" (Steps 5-6) | Business flow with all 6 states as separate steps |
| SchemaFinalv2.md | "boost_status Values", CHECK constraint | Database schema and valid states |
| Loyalty.md | "Pattern 4: Auto-Sync Triggers", "Pattern 5: Status Validation Constraints" | Business rules for state transitions |
| REWARDS_IMPL.md | "commission_boost_redemptions Table" section | Implementation documentation |
| EXECUTION_PLAN.md | Task 6.4.3, Task 8.4.8 | Test requirements that validate correct behavior |
| commission-boost-lifecycle.test.ts | Test Case 3 | Existing test that expects `expired` state |

### Reading Order for External Auditor

1. **First:** STATE_TRANSITIONS.md - "3. commission_boost_redemptions.boost_status" - Provides the authoritative 6-state lifecycle diagram showing `expired` as distinct, observable state
2. **Second:** MissionsRewardsFlows.md - "COMMISSION BOOST REWARD FLOW" - Shows business steps 5 and 6 as separate operations with different triggers
3. **Third:** SchemaFinalv2.md - "boost_status Values" - Confirms `expired` means "calculating payout" vs `pending_info` means "waiting for user"
4. **Fourth:** supabase/migrations/20251213_boost_activation_rpcs.sql - Corrected implementation with all three RPCs
5. **Fifth:** This document - Complete fix specification with two-operation solution

---

## 20. Future Considerations

### Configurable Dwell Time

The current implementation calls `transitionExpiredToPendingInfo()` immediately after `expireActiveBoosts()`. In the future, this could be enhanced:

```typescript
// Future enhancement: configurable dwell time per client
const dwellHours = await clientConfigRepository.getBoostExpiredDwellHours(clientId);

if (dwellHours === 0) {
  // Immediate transition (current MVP behavior)
  await commissionBoostRepository.transitionExpiredToPendingInfo(clientId);
} else {
  // Deferred transition - separate cron job or scheduled task
  console.log(`[DailyAutomation] Boosts will transition to pending_info after ${dwellHours}h dwell`);
}
```

This architecture supports adding admin approval gates or review periods without further structural changes.

---

**Document Version:** 2.1
**Last Updated:** 2025-12-13
**Author:** Claude Code
**Status:** Analysis Complete

**Changelog:**
- v2.1: Migration file strategy update
  - Since migration was never applied, replaced file instead of creating new one
  - Deleted `20251213_boost_activation_rpcs.sql` and recreated with correct implementation
  - Avoids dead code in codebase
- v2.0: Major revision per auditor feedback
  - Changed from three-phase single RPC to two separate RPC operations
  - Added new `transition_expired_to_pending_info` RPC
  - Added `transitionExpiredToPendingInfo()` repository function
  - Updated route to call both functions in sequence
  - Added multi-tenant and security verification
  - Added future considerations for configurable dwell time
- v1.0: Initial analysis (rejected approach)
