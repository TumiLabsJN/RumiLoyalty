# Commission Boost Activation - Gap Documentation

**ID:** GAP-BOOST-ACTIVATION
**Type:** Feature Gap
**Created:** 2025-12-13
**Status:** Analysis Complete
**Priority:** High
**Related Tasks:** Task 8.4.1 (Cron Testing), Task 8.4.8 (Test scheduled activation), Task 8.4.9 (Manual dry run)
**Linked Issues:** None
**Audit Reviews:** 2 external audits completed 2025-12-13, corrections incorporated v1.1

---

## 1. Project Context

This is a creator loyalty platform built with Next.js 14, TypeScript, and Supabase (PostgreSQL). The platform tracks creator sales from TikTok Shop (via CRUVA CSV sync), awards tier-based VIP rewards, and manages mission completion. One reward type is "Commission Boost" - creators earn extra commission percentage on sales during a specified period (e.g., 5% bonus for 30 days). The boost has a 6-state lifecycle managed in `commission_boost_redemptions` table.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers (per ARCHITECTURE.md Section 5)

---

## 2. Gap/Enhancement Summary

**What's missing:** No application code exists to transition commission boosts from `'scheduled'` → `'active'` → `'expired'` states. The daily cron job does not activate scheduled boosts or expire active ones.

**What should exist:** A cron-triggered function that:
1. Finds boosts where `scheduled_activation_date = TODAY` and `boost_status = 'scheduled'`
2. Updates them to `boost_status = 'active'`, sets `activated_at`, `expires_at`, and captures `sales_at_activation` from user's current `total_sales`
3. Finds boosts where `expires_at <= NOW()` and `boost_status = 'active'`
4. Updates them to `boost_status = 'expired'`, captures `sales_at_expiration`, calculates `final_payout_amount`
5. Transitions expired boosts to `boost_status = 'pending_info'`

**Why it matters:** Without this, boost payouts cannot be calculated accurately. The `sales_at_activation` snapshot (user's GMV at boost start) and `sales_at_expiration` snapshot (user's GMV at boost end) are REQUIRED to calculate `sales_delta` and `final_payout_amount`. Creators would never receive their commission boost payments.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Loyalty.md | Lines 58-65 (Timing rationale) | "Aligns with commission boost activation time for accurate sales snapshots" |
| Loyalty.md | Line 416 (Timing Rationale) | "Aligned with commission boost activation (2 PM EST) to ensure accurate sales snapshots for boost payout calculations" |
| MissionsRewardsFlows.md | Commission Boost Flow (lines 443-510) | Step 4 shows `boost_status='active'`, `sales_at_activation` set; Step 5 shows `boost_status='expired'`, `sales_at_expiration` set |
| SchemaFinalv2.md | commission_boost_redemptions table (lines 666-746) | Columns exist: `activated_at`, `expires_at`, `sales_at_activation`, `sales_at_expiration`, `sales_delta` (GENERATED), `final_payout_amount` |
| initial_schema.sql | Lines 487-523 | Table created with all columns; `sales_delta` is GENERATED ALWAYS AS |
| EXECUTION_PLAN.md | Task 8.4.8 (line 1533-1534) | Test expects "boost_status changes to 'active'" and "sales_at_activation captures current sales value" |
| EXECUTION_PLAN.md | Task 8.4.9 (line 1540) | Manual verification expects "verify boost activations triggered if scheduled" |
| commissionBoostRepository.ts | Full file (253 lines) | Only 3 functions: `createBoostState`, `getBoostStatus`, `savePaymentInfo` - NO activation/expiration |
| daily-automation/route.ts | Full file (302 lines) | No mention of "boost" anywhere |
| syncRepository.ts | Full file (710 lines) | No boost-related functions |

### Key Evidence

**Evidence 1:** Cron timing explicitly designed for boost activation
- Source: Loyalty.md, line 416
- Quote: "Aligned with commission boost activation (2 PM EST) to ensure accurate sales snapshots for boost payout calculations"
- Implication: The cron job SHOULD activate boosts, but no code does this

**Evidence 2:** Test expects activation but tests are mocked
- Source: commission-boost-lifecycle.test.ts, lines 289-326
- Finding: Test "should set boost_status to active after activation" mocks the response via `mockRewardService.claimReward.mockResolvedValue(createCommissionBoostClaimResponse('active', ...))`
- Implication: Tests assume functionality exists but actually mock it; no real activation logic tested

**Evidence 3:** EXECUTION_PLAN.md expects activation in manual verification
- Source: Task 8.4.9, line 1540
- Quote: "verify boost activations triggered if scheduled"
- Implication: Plan expects functionality that was never implemented

**Evidence 4:** No activation code in codebase
- Source: Grep search across entire appcode/
- Finding: Zero results for `activateScheduledBoosts`, `expireActiveBoosts`, or any UPDATE to `boost_status='active'`
- Implication: Feature does not exist

---

## 4. Business Justification

**Business Need:** Commission boost payout calculation requires accurate snapshots of user sales at activation and expiration to calculate the bonus payment.

**User Stories:**
1. As a creator, I need my commission boost to activate automatically on my scheduled date so that my bonus sales period starts correctly
2. As an admin, I need accurate `sales_at_activation` and `sales_at_expiration` values so that I can pay creators the correct bonus amount

**Impact if NOT implemented:**
- `sales_at_activation` is never captured → payout calculation impossible
- `sales_at_expiration` is never captured → payout calculation impossible
- `final_payout_amount` is never calculated → admins cannot process payouts
- Boosts stay in `'scheduled'` status forever → creators never receive payments
- Financial liability: creators owed money with no way to calculate amount

---

## 5. Current State Analysis

### What Currently Exists

**File:** `appcode/lib/repositories/commissionBoostRepository.ts`
```typescript
// Existing functions (253 lines total)
export const commissionBoostRepository = {
  // Creates boost with boost_status='scheduled' (lines 60-120)
  async createBoostState(params: CreateBoostStateParams): Promise<CreateBoostStateResult>,

  // Reads current boost_status (lines 130-148)
  async getBoostStatus(redemptionId: string, clientId: string): Promise<string | null>,

  // Transitions pending_info → pending_payout (lines 170-252)
  async savePaymentInfo(...): Promise<{...}>,
};
```

**Current Capability:**
- CAN create boost with `boost_status='scheduled'` at claim time
- CAN read current `boost_status`
- CAN transition `pending_info` → `pending_payout` when user submits payment info
- CANNOT transition `scheduled` → `active` (the gap)
- CANNOT transition `active` → `expired` (the gap)
- CANNOT capture `sales_at_activation` or `sales_at_expiration` (the gap)

### Current Data Flow

```
User Claims Boost
       ↓
createBoostState()
       ↓
boost_status = 'scheduled'
scheduled_activation_date = [user selected]
       ↓
[NOTHING HAPPENS - GAP]
       ↓
boost stays 'scheduled' forever
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

### Approach

Add new functions to `commissionBoostRepository.ts` and integrate them into `daily-automation/route.ts`. The cron will call these functions after sales sync to activate scheduled boosts and expire active boosts.

### Audit Corrections Applied (v1.1)

| Audit Concern | Resolution |
|---------------|------------|
| **N+1 Query Anti-Pattern** | Use single `UPDATE...FROM` with JOIN instead of loop |
| **Generated Column (sales_delta)** | Do NOT calculate in app; use RETURNING to get DB-calculated value |
| **Transactionality** | Wrap entire batch in single transaction |
| **Two-Step Update Risk** | Combine `active → pending_info` in single atomic UPDATE (skip intermediate `expired` state in application; DB trigger logs the transition) |
| **Explicit client_id Filters** | All queries MUST include `AND client_id = $1` |
| **Type Regeneration** | Not required - no new RPCs, using existing table types |

### New Code to Create

**New Functions in:** `appcode/lib/repositories/commissionBoostRepository.ts`

```typescript
// SPECIFICATION - TO BE IMPLEMENTED

/**
 * Activate scheduled boosts where scheduled_activation_date <= TODAY
 * Uses single UPDATE...FROM with JOIN to avoid N+1 queries.
 * Sets boost_status='active', activated_at, expires_at, sales_at_activation
 *
 * CRITICAL: Must include client_id filter in WHERE clause
 */
export interface ActivateBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  activatedAt: string;
  expiresAt: string;
}

async activateScheduledBoosts(clientId: string): Promise<{
  activatedCount: number;
  activations: ActivateBoostResult[];
  errors: string[];
}> {
  // IMPLEMENTATION APPROACH (Single Query - No N+1):
  //
  // UPDATE commission_boost_redemptions cb
  // SET
  //   boost_status = 'active',
  //   activated_at = NOW(),
  //   expires_at = NOW() + (cb.duration_days || ' days')::INTERVAL,
  //   sales_at_activation = u.total_sales
  // FROM redemptions r
  // JOIN users u ON r.user_id = u.id AND u.client_id = $1
  // WHERE cb.redemption_id = r.id
  //   AND cb.client_id = $1                              -- CRITICAL: Multi-tenant filter
  //   AND cb.boost_status = 'scheduled'
  //   AND cb.scheduled_activation_date <= CURRENT_DATE
  // RETURNING cb.id, cb.redemption_id, r.user_id, cb.sales_at_activation, cb.activated_at, cb.expires_at;
  //
  // Note: Existing database triggers will:
  // 1. sync_boost_to_redemption() - updates parent redemptions.status
  // 2. log_boost_transition() - logs to commission_boost_state_history
}

/**
 * Expire active boosts where expires_at <= NOW()
 * Uses single UPDATE...FROM with JOIN to avoid N+1 queries.
 *
 * CRITICAL: sales_delta is a GENERATED column in the database.
 * Do NOT calculate in application - use RETURNING to get DB-calculated value.
 *
 * Transitions directly to 'pending_info' in single atomic UPDATE.
 * (The boost_status technically goes scheduled→active→pending_info;
 *  the 'expired' state is transient and captured via audit trigger)
 *
 * CRITICAL: Must include client_id filter in WHERE clause
 */
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;        // From DB GENERATED column, NOT app-calculated
  boostRate: number;
  finalPayoutAmount: number;
}

async expireActiveBoosts(clientId: string): Promise<{
  expiredCount: number;
  expirations: ExpireBoostResult[];
  errors: string[];
}> {
  // IMPLEMENTATION APPROACH (Two-Phase Single Transaction):
  //
  // Phase 1: Set sales_at_expiration (triggers sales_delta calculation)
  // UPDATE commission_boost_redemptions cb
  // SET
  //   sales_at_expiration = u.total_sales
  // FROM redemptions r
  // JOIN users u ON r.user_id = u.id AND u.client_id = $1
  // WHERE cb.redemption_id = r.id
  //   AND cb.client_id = $1                              -- CRITICAL: Multi-tenant filter
  //   AND cb.boost_status = 'active'
  //   AND cb.expires_at <= NOW()
  // RETURNING cb.id, cb.sales_at_activation, cb.sales_at_expiration, cb.sales_delta, cb.boost_rate;
  //
  // Phase 2: Calculate final_payout_amount and transition to pending_info
  // UPDATE commission_boost_redemptions
  // SET
  //   boost_status = 'pending_info',
  //   final_payout_amount = sales_delta * boost_rate / 100
  // WHERE id = ANY($1)                                   -- Array of IDs from Phase 1
  //   AND client_id = $2                                 -- CRITICAL: Multi-tenant filter
  // RETURNING id, redemption_id, sales_delta, boost_rate, final_payout_amount;
  //
  // WRAP BOTH PHASES IN SINGLE TRANSACTION for atomicity.
  //
  // Note: Existing database triggers will:
  // 1. sync_boost_to_redemption() - updates parent redemptions.status
  // 2. log_boost_transition() - logs to commission_boost_state_history
}
```

**Explanation:** These functions fill the gap in the boost lifecycle. They are called by the daily cron after sales sync, ensuring `total_sales` is up-to-date before snapshots are taken. The implementation uses batch UPDATE queries with JOINs to avoid N+1 performance issues, and relies on the database GENERATED column for `sales_delta` calculation.

### New Types/Interfaces

```typescript
// SPECIFICATION - TO BE IMPLEMENTED

// Already defined above in function signatures:
// - ActivateBoostResult
// - ExpireBoostResult
```

### Database Triggers (Already Exist - No Changes Needed)

The following triggers in `initial_schema.sql` will automatically fire on boost_status changes:

1. **`sync_boost_to_redemption()`** (lines 851-875): Syncs `boost_status` to parent `redemptions.status`
2. **`log_boost_transition()`** (lines 883-916): Logs all transitions to `commission_boost_state_history`

**Note:** There is NO `validate_boost_state_transition` trigger - the state machine is enforced by application logic, not database constraints. The CHECK constraint only validates that `boost_status` is one of the 6 valid values.

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `lib/repositories/commissionBoostRepository.ts` | MODIFY | Add `activateScheduledBoosts()` and `expireActiveBoosts()` functions |
| `app/api/cron/daily-automation/route.ts` | MODIFY | Add Step 3e: call boost activation/expiration after tier calculations |

### Dependency Graph

```
daily-automation/route.ts
├── existing imports: salesService, tierCalculationService, syncRepository, notificationService
├── will import: commissionBoostRepository
└── will call: activateScheduledBoosts(), expireActiveBoosts()

commissionBoostRepository.ts (MODIFIED)
├── existing imports: createClient from supabase/server-client
├── existing exports: createBoostState, getBoostStatus, savePaymentInfo
└── new exports: activateScheduledBoosts, expireActiveBoosts
```

---

## 8. Data Flow After Implementation

```
Daily Cron (2 PM EST)
       ↓
[Existing] Sales Sync → updates user.total_sales
       ↓
[Existing] Tier Calculations
       ↓
[NEW] activateScheduledBoosts(clientId)
       ↓
       ├─→ Single UPDATE...FROM with JOIN (no N+1):
       │     UPDATE commission_boost_redemptions cb
       │     SET boost_status='active', activated_at=NOW(),
       │         expires_at=NOW()+duration_days, sales_at_activation=u.total_sales
       │     FROM redemptions r JOIN users u ON r.user_id = u.id
       │     WHERE cb.client_id = $1 AND cb.boost_status = 'scheduled'
       │       AND cb.scheduled_activation_date <= CURRENT_DATE
       │     RETURNING cb.id, cb.redemption_id, r.user_id, ...
       ├─→ DB Trigger: sync_boost_to_redemption() fires
       ├─→ DB Trigger: log_boost_transition() fires
       └─→ Return: { activatedCount, activations[] }
       ↓
[NEW] expireActiveBoosts(clientId) - SINGLE TRANSACTION
       ↓
       ├─→ Phase 1: UPDATE...FROM with JOIN to set sales_at_expiration
       │     (DB GENERATED column calculates sales_delta automatically)
       ├─→ Phase 2: UPDATE to set final_payout_amount and boost_status='pending_info'
       │     final_payout_amount = sales_delta * boost_rate / 100
       ├─→ DB Trigger: sync_boost_to_redemption() fires
       ├─→ DB Trigger: log_boost_transition() fires
       └─→ Return: { expiredCount, expirations[] }
       ↓
[Response includes boost activation/expiration counts]
```

---

## 9. Database/Schema Requirements

### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| `commission_boost_redemptions` | `boost_status`, `scheduled_activation_date`, `activated_at`, `expires_at`, `duration_days`, `boost_rate`, `sales_at_activation`, `sales_at_expiration`, `sales_delta`, `final_payout_amount`, `client_id`, `redemption_id` | Read/Update for activation and expiration |
| `users` | `id`, `total_sales`, `client_id` | Read `total_sales` for snapshots |
| `redemptions` | `id`, `user_id`, `client_id` | JOIN to get user_id for boost |

### Schema Changes Required?
- [x] No - existing schema supports this feature

The columns `activated_at`, `expires_at`, `sales_at_activation`, `sales_at_expiration`, `sales_delta`, `final_payout_amount` already exist in `commission_boost_redemptions` table (SchemaFinalv2.md lines 694-705).

### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| SELECT scheduled boosts | Yes | [ ] |
| SELECT active boosts | Yes | [ ] |
| SELECT user.total_sales | Yes | [ ] |
| UPDATE boost_status, activation fields | Yes | [ ] |
| UPDATE boost_status, expiration fields | Yes | [ ] |

---

## 10. API Contract Changes

### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| `GET /api/cron/daily-automation` | MODIFY | Response has `tierPromotion`, `tierCalculation`, `raffleCalendar` | Add `boostActivation: { activatedCount, expiredCount }` |

### Breaking Changes?
- [x] No - additive changes only

The cron response is internal (not consumed by frontend). Adding fields is non-breaking.

---

## 11. Performance Considerations

### Expected Load

| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Boosts to activate per day | ~0-5 (MVP scale) | Yes |
| Boosts to expire per day | ~0-5 (MVP scale) | Yes |
| Query complexity | O(1) - single UPDATE regardless of count | Yes |
| Frequency | Once daily at 2 PM EST | Yes |

### Optimization Applied (Audit Correction)
- [x] **N+1 Query Eliminated:** Using `UPDATE...FROM` with JOIN instead of loop
- [x] **Batch Processing:** All activations/expirations in single query per type
- [x] **DB-Calculated Fields:** `sales_delta` is GENERATED column, not app-calculated

At scale (1000+ boosts), the single-query approach handles efficiently. No additional optimization needed.

---

## 12. Alternative Solutions Considered

### Option A: Database Trigger / Scheduled Function
- **Description:** PostgreSQL scheduled job (pg_cron) or trigger to auto-activate boosts
- **Pros:** No application code needed, runs in database
- **Cons:** Supabase doesn't support pg_cron on free tier; harder to debug; can't easily capture user.total_sales from different table
- **Verdict:** Rejected - Supabase limitations, debugging difficulty

### Option B: Application Code in Daily Cron (Selected)
- **Description:** Add functions to commissionBoostRepository, call from daily-automation route
- **Pros:** Follows existing patterns, easy to debug, can access any table, consistent with cron architecture
- **Cons:** Requires code changes
- **Verdict:** Selected - consistent with existing architecture, maintainable

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| sales_at_activation captured at wrong time | Low | High | Activate boosts AFTER sales sync completes (sequence in cron) |
| Double-activation (boost activated twice) | Low | Medium | WHERE clause: `boost_status = 'scheduled'` ensures idempotency |
| Missing client_id filter | Low | Critical | Code review checklist, explicit in spec, multi-tenant tests |
| Calculation error in final_payout_amount | Low | High | Use DB GENERATED column for sales_delta, unit tests with known values |
| Partial batch failure | Low | Medium | Wrap expiration in single transaction for atomicity (audit correction) |
| N+1 query performance | N/A | N/A | Eliminated via UPDATE...FROM with JOIN (audit correction) |

---

## 14. Testing Strategy

### Unit Tests

**File:** `tests/unit/repositories/commissionBoostRepository.test.ts`
```typescript
describe('activateScheduledBoosts', () => {
  it('should activate boosts where scheduled_activation_date = TODAY', async () => {
    // Setup: Create boost with scheduled_activation_date = TODAY
    // Act: Call activateScheduledBoosts(clientId)
    // Assert: boost_status = 'active', activated_at set, sales_at_activation captured
  });

  it('should NOT activate boosts where scheduled_activation_date = TOMORROW', async () => {
    // Setup: Create boost with scheduled_activation_date = TOMORROW
    // Act: Call activateScheduledBoosts(clientId)
    // Assert: boost_status still 'scheduled'
  });

  it('should set expires_at = activated_at + duration_days', async () => {
    // Setup: Create boost with duration_days = 30
    // Act: Call activateScheduledBoosts(clientId)
    // Assert: expires_at is 30 days after activated_at
  });

  it('should capture sales_at_activation from user.total_sales', async () => {
    // Setup: User with total_sales = 5000, scheduled boost
    // Act: Call activateScheduledBoosts(clientId)
    // Assert: sales_at_activation = 5000
  });
});

describe('expireActiveBoosts', () => {
  it('should expire boosts where expires_at <= NOW', async () => {
    // Setup: Create active boost with expires_at = yesterday
    // Act: Call expireActiveBoosts(clientId)
    // Assert: boost_status = 'pending_info' (direct transition)
  });

  it('should use DB GENERATED column for sales_delta (not app-calculated)', async () => {
    // Setup: Active boost with sales_at_activation = 5000, user.total_sales = 8000
    // Act: Call expireActiveBoosts(clientId)
    // Assert: sales_delta = 3000 (from RETURNING, not calculated in app)
  });

  it('should cap sales_delta at 0 if sales decreased (via DB GENERATED)', async () => {
    // Setup: Active boost with sales_at_activation = 5000, user.total_sales = 4000
    // Act: Call expireActiveBoosts(clientId)
    // Assert: sales_delta = 0 (DB GREATEST(0, ...) handles this)
  });

  it('should calculate final_payout_amount = sales_delta * boost_rate / 100', async () => {
    // Setup: sales_delta = 2000, boost_rate = 5
    // Act: Call expireActiveBoosts(clientId)
    // Assert: final_payout_amount = 100
  });

  it('should process all expirations atomically in single transaction', async () => {
    // Setup: 3 active boosts with expires_at = yesterday
    // Act: Call expireActiveBoosts(clientId)
    // Assert: All 3 transition to 'pending_info' or none do
  });
});
```

### Integration Tests

```typescript
describe('Daily Automation - Boost Lifecycle', () => {
  it('should activate and expire boosts in single cron run', async () => {
    // Setup: One scheduled boost (today), one active boost (expired yesterday)
    // Act: Call GET /api/cron/daily-automation
    // Assert: Response includes boostActivation: { activatedCount: 1, expiredCount: 1 }
  });
});
```

### Manual Verification Steps

1. [ ] Create test boost with `scheduled_activation_date = TODAY`
2. [ ] Call `GET /api/cron/daily-automation` with CRON_SECRET
3. [ ] Verify `boost_status` changed to `'active'`
4. [ ] Verify `activated_at`, `expires_at`, `sales_at_activation` populated
5. [ ] Create test boost with `boost_status = 'active'` and `expires_at = yesterday`
6. [ ] Call `GET /api/cron/daily-automation` with CRON_SECRET
7. [ ] Verify `boost_status` changed to `'pending_info'`
8. [ ] Verify `sales_at_expiration`, `final_payout_amount` populated

---

## 15. Implementation Checklist

### Pre-Implementation
- [ ] Read and understand all source documents referenced
- [ ] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress
- [ ] Verify TypeScript types exist for `commission_boost_redemptions` table (no regeneration needed)

### Implementation Steps
- [ ] **Step 1:** Add `ActivateBoostResult` and `ExpireBoostResult` interfaces to commissionBoostRepository.ts
  - File: `lib/repositories/commissionBoostRepository.ts`
  - Action: MODIFY - add types
- [ ] **Step 2:** Implement `activateScheduledBoosts()` function
  - File: `lib/repositories/commissionBoostRepository.ts`
  - Action: MODIFY - add function
  - **CRITICAL:** Use `UPDATE...FROM` with JOIN (no N+1)
  - **CRITICAL:** Include `AND cb.client_id = $1` in WHERE clause
- [ ] **Step 3:** Implement `expireActiveBoosts()` function
  - File: `lib/repositories/commissionBoostRepository.ts`
  - Action: MODIFY - add function
  - **CRITICAL:** Use `UPDATE...FROM` with JOIN (no N+1)
  - **CRITICAL:** Include `AND cb.client_id = $1` in WHERE clause
  - **CRITICAL:** Do NOT calculate `sales_delta` in app - use RETURNING from DB
  - **CRITICAL:** Wrap Phase 1 + Phase 2 in single transaction
- [ ] **Step 4:** Add imports and Step 3e to daily-automation route
  - File: `app/api/cron/daily-automation/route.ts`
  - Action: MODIFY - add import, add Step 3e after tier calculations
- [ ] **Step 5:** Update response interface to include `boostActivation`
  - File: `app/api/cron/daily-automation/route.ts`
  - Action: MODIFY - extend CronSuccessResponse

### Post-Implementation
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Manual verification per Section 14
- [ ] Verify client_id filters in activation query (grep/review)
- [ ] Verify client_id filters in expiration query (grep/review)
- [ ] Update EXECUTION_PLAN.md - add Task 8.3.5

---

## 16. Definition of Done

- [ ] `activateScheduledBoosts()` function implemented with client_id filtering
- [ ] `expireActiveBoosts()` function implemented with client_id filtering
- [ ] Both functions use `UPDATE...FROM` with JOIN (no N+1 queries)
- [ ] `expireActiveBoosts()` uses DB GENERATED `sales_delta` via RETURNING (not app-calculated)
- [ ] `expireActiveBoosts()` wrapped in single transaction for atomicity
- [ ] daily-automation route calls both functions after tier calculations
- [ ] Response includes `boostActivation` with activation/expiration counts
- [ ] Type checker passes
- [ ] All tests pass (existing + new)
- [ ] Build completes
- [ ] Manual verification completed
- [ ] client_id filters verified in both activation and expiration queries
- [ ] EXECUTION_PLAN.md updated with Task 8.3.5
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Loyalty.md | Lines 58-65 (Timing rationale), Line 416 (Timing Rationale) | Confirms cron timing for boost activation |
| MissionsRewardsFlows.md | Commission Boost Flow (lines 443-510) | Defines expected state transitions |
| SchemaFinalv2.md | commission_boost_redemptions table (lines 666-746) | Defines column schema |
| ARCHITECTURE.md | Section 5 (Repository Layer), Section 9 (Multitenancy) | Architecture patterns to follow |
| initial_schema.sql | Lines 487-523 (table), 851-916 (triggers) | Actual database structure |
| commissionBoostRepository.ts | Full file | Current state of repository |
| daily-automation/route.ts | Full file | Integration point for new functions |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-13
**Author:** Claude Code
**Status:** Analysis Complete (Audit Corrections Applied)

---

## Appendix: Audit Review Summary

### Audit 1 Concerns (Addressed)
| Concern | Status | Resolution |
|---------|--------|------------|
| Type generation not mentioned | Clarified | No new RPCs = no regeneration needed; added to pre-implementation checklist |
| Multi-tenant filtering not explicit | Fixed | Added explicit `client_id` requirements to Steps 2, 3 and Definition of Done |

### Audit 2 Concerns (Addressed)
| Concern | Status | Resolution |
|---------|--------|------------|
| State Machine Conflict (`validate_boost_state_transition`) | **Invalid** | Trigger does not exist in deployed schema; only CHECK constraint + logging triggers exist |
| N+1 Query Anti-Pattern | Fixed | Rewrote to use `UPDATE...FROM` with JOIN |
| Generated Column Misunderstanding | Fixed | Specification now uses RETURNING to get DB-calculated `sales_delta` |
| Lack of Transactionality | Fixed | Added requirement to wrap expiration in single transaction |
| Two-Step Update Risk | Fixed | Combined into single atomic transition per phase |

### Auditor Question Responses

**Q1: Should `validate_boost_state_transition` trigger be modified?**
A: The trigger does not exist. The deployed schema only has:
- `sync_boost_to_redemption()` - syncs status to parent
- `log_boost_transition()` - audit logging
No state validation trigger exists to modify.

**Q2: Should entire batch be atomic transaction?**
A: Yes, `expireActiveBoosts()` now specifies wrapping both phases in single transaction. Activation is already atomic (single UPDATE).

---

# Checklist for LLM Creating Gap/Enhancement Document

Before marking complete, verify:

- [x] **Type clearly identified** as Feature Gap (not Bug or Enhancement)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
