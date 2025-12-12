# Real-Time Tier Promotion - Fix Documentation

**Bug ID:** BUG-REALTIME-PROMOTION
**Created:** 2025-12-12
**Status:** ✅ Implemented (2025-12-12)
**Severity:** Medium
**Related Tasks:** Task 8.3.2, Task 8.3.3 from EXECUTION_PLAN.md
**Linked Bugs:** BUG-INPROGRESS-VISIBILITY (rewards visibility fix deployed 2025-12-12)
**Implementation:** See RealTimePromotionFixIMPL.md for execution details

---

## 1. Project Context

This is a loyalty platform for TikTok Shop creators built with Next.js 14, TypeScript, and Supabase PostgreSQL. The system tracks creator sales/units, assigns VIP tiers (Bronze/Silver/Gold/Platinum) with associated rewards, and manages missions for earning additional perks.

The bug affects the **tier promotion system** which is responsible for moving creators to higher tiers when they exceed sales/units thresholds. Currently, tier changes only happen at checkpoint evaluations (every ~3 months), not when users actually qualify.

**Tech Stack:** Next.js 14, TypeScript, Supabase, PostgreSQL
**Architecture Pattern:** Repository → Service → Route layers

---

## 2. Bug Summary

**What's happening:** Users who exceed tier thresholds are NOT promoted until their next checkpoint (every 3 months). A Bronze user who sells 1500 units on Day 1 (Gold threshold: 1000) stays Bronze for 90 days.

**What should happen:** Users should be promoted immediately (within 24 hours via daily cron) when their total sales/units exceed a higher tier's threshold.

**Impact:** New creators who perform exceptionally well are denied access to higher-tier rewards and commission rates for up to 3 months, reducing engagement and perceived fairness of the loyalty program.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| Loyalty.md | Flow 1: Daily Metrics Sync | Updates `total_sales`/`total_units` but NO tier promotion step |
| Loyalty.md | Flow 7: Daily Tier Calculation | Only evaluates users WHERE `next_checkpoint_at <= TODAY` |
| tierRepository.ts | getUsersDueForCheckpoint() | Excludes Bronze users with `.neq('current_tier', 'tier_1')` |
| tierCalculationService.ts | runCheckpointEvaluation() | Only processes checkpoint-due users |

### Key Evidence

**Evidence 1:** Flow 7 query excludes Bronze users entirely
- Source: Loyalty.md, Flow 7 Step 1
- Query: `WHERE u.next_checkpoint_at <= TODAY AND u.current_tier != 'tier_1'`
- Implication: Bronze users are NEVER evaluated for promotion

**Evidence 2:** Flow 1 mentions "newly promoted users" but no flow creates them
- Source: Loyalty.md, Flow 1 Step 7
- Quote: "Catches newly promoted users and newly created raffles"
- Implication: Documentation assumes promotion happens elsewhere, but it doesn't

**Evidence 3:** User confirmed Model B (real-time promotion) is intended
- Source: User clarification during discovery
- Implication: Loyalty.md spec was incomplete; real-time promotion was always intended

---

## 4. Root Cause Analysis

**Root Cause:** The tier calculation system was designed only for checkpoint maintenance (keeping/losing tier), not for real-time promotion (gaining tier).

**Contributing Factors:**
1. Loyalty.md Flow 7 focuses solely on checkpoint evaluation
2. Bronze tier explicitly excluded from all tier calculations
3. No separate promotion flow was documented or implemented
4. Daily sync updates metrics but never compares against tier thresholds for promotion

**How it was introduced:** Design oversight - the checkpoint system was built for tier maintenance without considering that promotions should happen immediately.

---

## 5. Business Implications

| Aspect | Impact | Risk Level |
|--------|--------|------------|
| User experience | High performers stuck at low tier for 3 months | High |
| Revenue | Lower commission rates mean less creator motivation | Medium |
| Feature functionality | Loyalty program feels unfair/broken | High |
| Competitive position | Other loyalty programs promote immediately | Medium |

**Business Risk Summary:** Creators who exceed thresholds but aren't promoted will feel the loyalty program is broken or unfair, potentially leading to reduced engagement and negative word-of-mouth.

---

## 6. Current State

### Current File(s)

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
```typescript
// Lines 401-424: getUsersDueForCheckpoint
async getUsersDueForCheckpoint(clientId: string): Promise<CheckpointUserData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      current_tier,
      checkpoint_sales_current,
      checkpoint_units_current,
      ...
    `)
    .eq('client_id', clientId)
    .neq('current_tier', 'tier_1')  // Bronze tier EXCLUDED
    .lte('next_checkpoint_at', new Date().toISOString().split('T')[0]); // Only if checkpoint due
```

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
```typescript
// Lines 129-172: runCheckpointEvaluation
export async function runCheckpointEvaluation(
  clientId: string
): Promise<RunCheckpointResult> {
  // ...
  // Step 2: Get users due for checkpoint
  let usersDue = await tierRepository.getUsersDueForCheckpoint(clientId);
  // Only processes users from getUsersDueForCheckpoint - excludes Bronze
```

**Current Behavior:**
- Daily cron updates `total_sales` and `total_units` for all users
- Tier evaluation ONLY happens for users with `next_checkpoint_at <= TODAY`
- Bronze users are NEVER evaluated (explicitly excluded)
- Users must wait 3 months for checkpoint to get promoted

### Current Data Flow

```
Daily Cron
    │
    ├─→ processDailySales() → Updates total_sales, total_units
    │
    └─→ runCheckpointEvaluation()
            │
            └─→ getUsersDueForCheckpoint()
                    │
                    └─→ WHERE next_checkpoint_at <= TODAY
                        AND current_tier != 'tier_1'
                            │
                            └─→ Only ~10-50 users/day evaluated
                                (Bronze users NEVER included)
```

---

## 7. Proposed Fix

### Approach

Add a new **promotion check** that runs daily for ALL users (including Bronze). Compare each user's `total_sales` or `total_units` against tier thresholds and promote immediately if qualified. This runs BEFORE checkpoint evaluation.

### Key Business Rules (Per User Clarification)

| On Promotion | Action | Rationale |
|--------------|--------|-----------|
| `current_tier` | Update to new tier | User is now at higher tier |
| `tier_achieved_at` | Reset to NOW | New tier achievement date |
| `next_checkpoint_at` | Reset to NOW + checkpoint_months | Fresh checkpoint period for new tier |
| `checkpoint_*_target` | Set to NEW tier's threshold | User must maintain NEW tier level |
| `checkpoint_*_current` | Reset to 0 | Start fresh accumulation for maintenance |

**Lower tier rewards visibility:** Handled by existing RPC fix (BUG-INPROGRESS-VISIBILITY). Rewards with active redemptions (`status IN ('claimed', 'fulfilled')`) remain visible via `OR red.id IS NOT NULL` pattern.

**Audit logging:** Each promotion logged to `tier_checkpoints` table using existing `logCheckpointResult()` function with `status = 'promoted'`.

### Changes Required

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`

**NEW function to add:**
```typescript
/**
 * Get all users who may qualify for promotion.
 * Returns users whose total_sales OR total_units exceed their current tier's threshold.
 *
 * Unlike checkpoint evaluation, this includes ALL users (including Bronze).
 * Per user request: Model B real-time promotion.
 */
async getUsersForPromotionCheck(clientId: string): Promise<PromotionCandidate[]> {
  const supabase = await createClient();

  // Get all users with their current tier
  const { data: users, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      current_tier,
      total_sales,
      total_units,
      tier_achieved_at
    `)
    .eq('client_id', clientId);

  if (userError) {
    throw new Error(`Failed to fetch users: ${userError.message}`);
  }

  // Get client's VIP metric setting
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('vip_metric')
    .eq('id', clientId)
    .single();

  if (clientError) {
    throw new Error(`Failed to fetch client: ${clientError.message}`);
  }

  // Get tier thresholds sorted by tier_order DESC (highest first)
  const { data: tiers, error: tierError } = await supabase
    .from('tiers')
    .select('tier_id, tier_order, sales_threshold, units_threshold')
    .eq('client_id', clientId)
    .order('tier_order', { ascending: false });

  if (tierError) {
    throw new Error(`Failed to fetch tiers: ${tierError.message}`);
  }

  const vipMetric = client.vip_metric;
  const candidates: PromotionCandidate[] = [];

  for (const user of users || []) {
    const userValue = vipMetric === 'units'
      ? (user.total_units ?? 0)
      : (user.total_sales ?? 0);

    // Find current tier order
    const currentTierData = tiers?.find(t => t.tier_id === user.current_tier);
    const currentTierOrder = currentTierData?.tier_order ?? 1;

    // Find highest qualifying tier
    for (const tier of tiers || []) {
      const threshold = vipMetric === 'units'
        ? (tier.units_threshold ?? 0)
        : (tier.sales_threshold ?? 0);

      if (userValue >= threshold && tier.tier_order > currentTierOrder) {
        // User qualifies for a HIGHER tier
        candidates.push({
          userId: user.id,
          currentTier: user.current_tier ?? 'tier_1',
          currentTierOrder,
          qualifiesForTier: tier.tier_id,
          qualifiesForTierOrder: tier.tier_order,
          totalValue: userValue,
          threshold,
          tierAchievedAt: user.tier_achieved_at ?? new Date().toISOString(),
        });
        break; // Take highest qualifying tier
      }
    }
  }

  return candidates;
},

/**
 * Promote a user to a higher tier.
 *
 * Updates:
 * - current_tier: New tier
 * - tier_achieved_at: NOW (new achievement date)
 * - next_checkpoint_at: NOW + checkpoint_months (fresh checkpoint period)
 * - checkpoint_*_target: NEW tier's threshold (must maintain new level)
 * - checkpoint_*_current: 0 (reset accumulation)
 *
 * Per user clarification: User gets full checkpoint period to prove new tier.
 */
async promoteUserToTier(
  clientId: string,
  userId: string,
  newTier: string,
  newTierThreshold: number,
  checkpointMonths: number,
  vipMetric: 'sales' | 'units'
): Promise<void> {
  const supabase = await createClient();

  const now = new Date();
  const nextCheckpoint = new Date(now);
  nextCheckpoint.setMonth(nextCheckpoint.getMonth() + checkpointMonths);

  const updateData: Record<string, unknown> = {
    current_tier: newTier,
    tier_achieved_at: now.toISOString(),
    next_checkpoint_at: nextCheckpoint.toISOString(),
    // Reset checkpoint accumulation
    checkpoint_sales_current: 0,
    checkpoint_units_current: 0,
    // Set target to NEW tier's threshold (dynamic per tier)
    checkpoint_sales_target: vipMetric === 'sales' ? newTierThreshold : null,
    checkpoint_units_target: vipMetric === 'units' ? newTierThreshold : null,
  };

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .eq('client_id', clientId);  // Multi-tenant filter

  if (error) {
    throw new Error(`Failed to promote user: ${error.message}`);
  }
}
```

**NEW type to add:**
```typescript
/**
 * Candidate for tier promotion
 */
export interface PromotionCandidate {
  userId: string;
  currentTier: string;
  currentTierOrder: number;
  qualifiesForTier: string;
  qualifiesForTierOrder: number;
  totalValue: number;
  threshold: number;
  tierAchievedAt: string;  // For audit log: when they achieved previous tier
}
```

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`

**NEW function to add:**
```typescript
/**
 * Result of promotion check
 */
export interface PromotionCheckResult {
  success: boolean;
  usersChecked: number;
  usersPromoted: number;
  promotions: Array<{
    userId: string;
    fromTier: string;
    toTier: string;
    totalValue: number;
  }>;
  errors: string[];
}

/**
 * Check all users for potential promotion to higher tier.
 * Runs daily after sales sync, BEFORE checkpoint evaluation.
 *
 * Per user requirement: Model B real-time promotion.
 * Users are promoted immediately when total_sales/total_units exceeds higher tier threshold.
 *
 * On promotion:
 * - Updates current_tier, tier_achieved_at
 * - Resets next_checkpoint_at to NOW + checkpoint_months
 * - Sets checkpoint_*_target to NEW tier's threshold
 * - Resets checkpoint_*_current to 0
 * - Logs promotion to tier_checkpoints table for audit
 */
export async function checkForPromotions(
  clientId: string
): Promise<PromotionCheckResult> {
  const promotions: PromotionCheckResult['promotions'] = [];
  const errors: string[] = [];

  console.log(`[TierCalculation] Checking for promotions for client ${clientId}`);

  // Get client settings (needed for checkpoint_months and vip_metric)
  let clientSettings: { checkpointMonths: number; vipMetric: 'sales' | 'units' };
  try {
    const supabase = await createClient();
    const { data: client, error } = await supabase
      .from('clients')
      .select('checkpoint_months, vip_metric')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      throw new Error(`Failed to fetch client: ${error?.message}`);
    }
    clientSettings = {
      checkpointMonths: client.checkpoint_months ?? 3,
      vipMetric: client.vip_metric === 'units' ? 'units' : 'sales',
    };
  } catch (error) {
    const errorMsg = `Failed to get client settings: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[TierCalculation] ${errorMsg}`);
    return {
      success: false,
      usersChecked: 0,
      usersPromoted: 0,
      promotions: [],
      errors: [errorMsg],
    };
  }

  let candidates: PromotionCandidate[];
  try {
    candidates = await tierRepository.getUsersForPromotionCheck(clientId);
    console.log(`[TierCalculation] Found ${candidates.length} users eligible for promotion`);
  } catch (error) {
    const errorMsg = `Failed to get promotion candidates: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[TierCalculation] ${errorMsg}`);
    return {
      success: false,
      usersChecked: 0,
      usersPromoted: 0,
      promotions: [],
      errors: [errorMsg],
    };
  }

  if (candidates.length === 0) {
    return {
      success: true,
      usersChecked: 0,
      usersPromoted: 0,
      promotions: [],
      errors: [],
    };
  }

  for (const candidate of candidates) {
    try {
      // Promote user with checkpoint reset
      await tierRepository.promoteUserToTier(
        clientId,
        candidate.userId,
        candidate.qualifiesForTier,
        candidate.threshold,  // New tier's threshold becomes checkpoint target
        clientSettings.checkpointMonths,
        clientSettings.vipMetric
      );

      // Log promotion to tier_checkpoints for audit trail
      await tierRepository.logCheckpointResult(clientId, {
        userId: candidate.userId,
        checkpointDate: new Date().toISOString().split('T')[0],
        periodStartDate: candidate.tierAchievedAt,  // When they got previous tier
        periodEndDate: new Date().toISOString().split('T')[0],  // Today
        salesInPeriod: clientSettings.vipMetric === 'sales' ? candidate.totalValue : null,
        unitsInPeriod: clientSettings.vipMetric === 'units' ? candidate.totalValue : null,
        salesRequired: clientSettings.vipMetric === 'sales' ? candidate.threshold : null,
        unitsRequired: clientSettings.vipMetric === 'units' ? candidate.threshold : null,
        tierBefore: candidate.currentTier,
        tierAfter: candidate.qualifiesForTier,
        status: 'promoted',  // Audit trail shows this was a real-time promotion
      });

      promotions.push({
        userId: candidate.userId,
        fromTier: candidate.currentTier,
        toTier: candidate.qualifiesForTier,
        totalValue: candidate.totalValue,
      });

      console.log(
        `[TierCalculation] Promoted user ${candidate.userId}: ` +
        `${candidate.currentTier} → ${candidate.qualifiesForTier} ` +
        `(value: ${candidate.totalValue}, threshold: ${candidate.threshold})`
      );
    } catch (error) {
      const errorMsg = `Failed to promote user ${candidate.userId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[TierCalculation] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    usersChecked: candidates.length,
    usersPromoted: promotions.length,
    promotions,
    errors,
  };
}
```

---

**File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`

**Before (current lines 110-124):**
```typescript
      // Step 3b: Run tier checkpoint evaluation (Task 8.3.2)
      // Per Loyalty.md Flow 7: "Runs immediately after data sync completes"
      console.log(`[DailyAutomation] Starting tier checkpoint evaluation`);
      const tierResult = await runCheckpointEvaluation(clientId);
```

**After:**
```typescript
      // Step 3b: Check for real-time promotions (BUG-REALTIME-PROMOTION fix)
      // Users who exceed higher tier thresholds get promoted immediately
      console.log(`[DailyAutomation] Checking for tier promotions`);
      const promotionResult = await checkForPromotions(clientId);

      if (promotionResult.usersPromoted > 0) {
        console.log(
          `[DailyAutomation] Promoted ${promotionResult.usersPromoted} users to higher tiers`
        );
      }

      // Step 3c: Run tier checkpoint evaluation (Task 8.3.2)
      // Per Loyalty.md Flow 7: "Runs immediately after data sync completes"
      console.log(`[DailyAutomation] Starting tier checkpoint evaluation`);
      const tierResult = await runCheckpointEvaluation(clientId);
```

**Update response interface to include promotions:**
```typescript
interface CronSuccessResponse {
  success: true;
  message: string;
  data: {
    recordsProcessed: number;
    usersUpdated: number;
    newUsersCreated: number;
    missionsUpdated: number;
    redemptionsCreated: number;
    tierPromotion: {           // NEW
      usersPromoted: number;
    };
    tierCalculation: {
      usersEvaluated: number;
      promoted: number;
      maintained: number;
      demoted: number;
    };
  };
  timestamp: string;
}
```

---

## 8. Files Affected

| File | Action | Changes |
|------|--------|---------|
| `appcode/lib/repositories/tierRepository.ts` | MODIFY | Add `getUsersForPromotionCheck()`, `promoteUserToTier()`, `PromotionCandidate` interface |
| `appcode/lib/services/tierCalculationService.ts` | MODIFY | Add `checkForPromotions()`, `PromotionCheckResult` interface |
| `appcode/app/api/cron/daily-automation/route.ts` | MODIFY | Add promotion check call, update response interface |

### Dependency Graph

```
daily-automation/route.ts
├── imports from: tierCalculationService.ts (add checkForPromotions)
├── imported by: Vercel cron
└── affects: Daily cron response includes promotion counts

tierCalculationService.ts
├── imports from: tierRepository.ts (add getUsersForPromotionCheck, promoteUserToTier)
├── imported by: daily-automation/route.ts
└── affects: New promotion check function available

tierRepository.ts
├── imports from: supabase/server-client.ts
├── imported by: tierCalculationService.ts, tierService.ts
└── affects: New repository functions for promotion logic
```

---

## 9. Data Flow Analysis

### Before Fix

```
Daily Cron
    │
    ├─→ Sales Sync → Updates total_sales/total_units
    │
    └─→ Checkpoint Evaluation → Only users with next_checkpoint_at <= TODAY
            │
            └─→ Bronze users NEVER evaluated
                    │
                    └─→ No promotion for 3 months
```

### After Fix

```
Daily Cron
    │
    ├─→ Sales Sync → Updates total_sales/total_units
    │
    ├─→ Promotion Check (NEW) → ALL users checked against thresholds
    │       │
    │       └─→ If total_value >= higher_tier_threshold → PROMOTE NOW
    │
    └─→ Checkpoint Evaluation → Maintenance/demotion for due users
```

### Data Transformation Steps

1. **Sales Sync:** CSV data → `total_sales`/`total_units` updated in users table
2. **Promotion Check:** Compare `total_sales`/`total_units` against tier thresholds
3. **Promote:** Update `current_tier` and `tier_achieved_at` for qualifying users
4. **Checkpoint:** Evaluate maintenance/demotion for checkpoint-due users

---

## 10. Call Chain Mapping

### Affected Call Chain

```
GET /api/cron/daily-automation (route.ts)
│
├─► processDailySales() (salesService.ts)
│   └── Updates total_sales, total_units
│
├─► checkForPromotions() (tierCalculationService.ts) ← NEW
│   ├── getUsersForPromotionCheck() (tierRepository.ts) ← NEW
│   └── promoteUserToTier() (tierRepository.ts) ← NEW
│
└─► runCheckpointEvaluation() (tierCalculationService.ts)
    └── getUsersDueForCheckpoint() (tierRepository.ts)
```

### Integration Points

| Layer | Component | Role in Fix |
|-------|-----------|-------------|
| Database | users table | Source of `total_sales`/`total_units`, updated `current_tier` |
| Database | tiers table | Source of threshold values |
| Repository | getUsersForPromotionCheck() | NEW - Queries candidates |
| Repository | promoteUserToTier() | NEW - Updates user tier |
| Service | checkForPromotions() | NEW - Orchestrates promotion logic |
| API Route | daily-automation | Calls new promotion check |

---

## 11. Database/Schema Verification

### Relevant Tables

| Table | Relevant Columns | Notes |
|-------|------------------|-------|
| users | current_tier, total_sales, total_units, tier_achieved_at, next_checkpoint_at, checkpoint_*_current, checkpoint_*_target | All columns already exist |
| tiers | tier_id, tier_order, sales_threshold, units_threshold | All columns already exist |
| clients | vip_metric, checkpoint_months | Determines sales vs units mode and checkpoint period |
| tier_checkpoints | user_id, tier_before, tier_after, status, checkpoint_date, etc. | Audit log for tier changes (existing table) |

### Schema Check

```sql
-- Verify users table has required columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
  'current_tier', 'total_sales', 'total_units', 'tier_achieved_at',
  'next_checkpoint_at', 'checkpoint_sales_current', 'checkpoint_units_current',
  'checkpoint_sales_target', 'checkpoint_units_target'
);
-- Expected: 9 rows

-- Verify tiers table has threshold columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tiers'
AND column_name IN ('tier_id', 'tier_order', 'sales_threshold', 'units_threshold');
-- Expected: 4 rows

-- Verify clients table has checkpoint_months
SELECT column_name FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('vip_metric', 'checkpoint_months');
-- Expected: 2 rows

-- Verify tier_checkpoints table exists with status column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tier_checkpoints'
AND column_name = 'status';
-- Expected: 1 row (supports 'promoted' value)
```

### Data Migration Required?
- [ ] Yes
- [x] No - schema already supports fix (all required columns exist, tier_checkpoints.status supports 'promoted')

---

## 12. Frontend Impact Assessment

### Affected Components

| Component | File | Impact |
|-----------|------|--------|
| Dashboard | app/home/page.tsx | None - reads current_tier dynamically |
| Rewards | app/rewards/page.tsx | None - uses RPC with p_current_tier |
| Missions | app/missions/page.tsx | None - uses RPC with p_current_tier |

### API Contract Changes

| Field | Before | After | Breaking? |
|-------|--------|-------|-----------|
| tierPromotion | N/A | `{ usersPromoted: number }` | No - additive |

### Frontend Changes Required?
- [ ] Yes
- [x] No - frontend reads `current_tier` dynamically from user context

---

## 13. Alternative Solutions Considered

### Option A: Database Trigger
- **Description:** PostgreSQL trigger fires on `total_sales` update, auto-promotes
- **Pros:** Immediate, no cron dependency
- **Cons:** Complex trigger logic, hard to debug, can't send notifications
- **Verdict:** Rejected - Triggers are hard to maintain and test

### Option B: Daily Cron Check (Selected)
- **Description:** Add promotion check to existing daily cron, runs after sales sync
- **Pros:** Simple, testable, aligns with existing architecture, can send notifications
- **Cons:** Up to 24-hour delay (acceptable per user confirmation)
- **Verdict:** Selected - Fits existing patterns, maintainable

### Option C: Real-time API Check
- **Description:** Check tier on every API call, promote on-demand
- **Pros:** Truly real-time
- **Cons:** Performance overhead on every request, complex rollback
- **Verdict:** Rejected - Over-engineering, 24-hour delay is acceptable

---

## 14. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Promotion logic has edge case bug | Low | Medium | Comprehensive test coverage |
| Performance impact (1000+ users) | Low | Low | Query is O(n), ~50ms for 1000 users |
| Notification spam on mass promotion | Low | Low | Task 8.3.3 handles notification deduplication |

### Breaking Change Analysis

| Component | Breaking? | Migration Path |
|-----------|-----------|----------------|
| API Response | No | Additive field `tierPromotion` |
| Database | No | No schema changes |
| Frontend | No | Reads `current_tier` dynamically |

---

## 15. Testing Strategy

### Unit Tests

**File:** `appcode/tests/unit/services/tierCalculationService.test.ts`
```typescript
describe('checkForPromotions', () => {
  it('should promote Bronze user to Gold when total_units exceeds Gold threshold', async () => {
    // Setup: User with total_units=1500, Gold threshold=1000
    // Action: checkForPromotions(clientId)
    // Assert: User promoted to Gold, tier_achieved_at updated
  });

  it('should NOT promote user who is already at highest qualifying tier', async () => {
    // Setup: Gold user with total_units=1500, Gold threshold=1000
    // Action: checkForPromotions(clientId)
    // Assert: No promotion (already Gold)
  });

  it('should promote to highest qualifying tier (skip tiers)', async () => {
    // Setup: Bronze user with total_units=3000, Platinum threshold=2500
    // Action: checkForPromotions(clientId)
    // Assert: User promoted to Platinum (skips Silver/Gold)
  });

  it('should handle units mode vs sales mode correctly', async () => {
    // Setup: Client with vip_metric='units'
    // Action: checkForPromotions(clientId)
    // Assert: Uses total_units, not total_sales
  });

  it('should reset checkpoint schedule on promotion', async () => {
    // Setup: Bronze user with next_checkpoint_at in 30 days
    // Action: checkForPromotions(clientId) - promotes to Gold
    // Assert: next_checkpoint_at = NOW + checkpoint_months (fresh period)
  });

  it('should set checkpoint target to new tier threshold', async () => {
    // Setup: Bronze user, Gold threshold=1000
    // Action: checkForPromotions(clientId) - promotes to Gold
    // Assert: checkpoint_units_target = 1000 (Gold threshold, not Bronze)
  });

  it('should reset checkpoint current values on promotion', async () => {
    // Setup: Bronze user with checkpoint_units_current=500
    // Action: checkForPromotions(clientId) - promotes to Gold
    // Assert: checkpoint_units_current = 0 (start fresh)
  });

  it('should log promotion to tier_checkpoints table', async () => {
    // Setup: Bronze user
    // Action: checkForPromotions(clientId) - promotes to Gold
    // Assert: tier_checkpoints row with status='promoted', tier_before='tier_1', tier_after='tier_3'
  });
});
```

### Integration Tests

**File:** `appcode/tests/integration/cron/promotion-check.test.ts`
```typescript
describe('Real-Time Promotion Integration', () => {
  it('should promote user in daily cron when threshold exceeded', async () => {
    // Setup: Create Bronze user, set total_units > Gold threshold
    // Action: Call daily-automation cron
    // Assert: User is now Gold tier
  });

  it('should make higher tier rewards visible after promotion', async () => {
    // Setup: Create Bronze user, promote to Gold
    // Action: Call get_available_rewards RPC
    // Assert: Gold tier rewards now visible
  });

  it('should keep in-progress lower tier rewards visible after promotion', async () => {
    // Setup: Bronze user with claimed Bronze reward, then promote to Gold
    // Action: Call get_available_rewards RPC
    // Assert: Bronze reward with active redemption still visible (per BUG-INPROGRESS-VISIBILITY fix)
  });

  it('should not cause duplicate checkpoint evaluation after promotion', async () => {
    // Setup: Bronze user with next_checkpoint_at = TODAY
    // Action: checkForPromotions promotes to Gold, then runCheckpointEvaluation runs
    // Assert: User NOT re-evaluated (next_checkpoint_at was reset to future)
  });

  it('should create audit log entry for each promotion', async () => {
    // Setup: Multiple Bronze users qualifying for Gold
    // Action: checkForPromotions(clientId)
    // Assert: tier_checkpoints has entries for each with status='promoted'
  });
});
```

### Manual Verification Steps

1. [ ] Create test user at Bronze tier with `total_units = 0`
2. [ ] Update `total_units` to exceed Gold threshold (e.g., 1500)
3. [ ] Trigger daily cron manually
4. [ ] Verify user is now Gold tier
5. [ ] Verify `tier_achieved_at` is updated to today
6. [ ] Verify `next_checkpoint_at` is reset to NOW + checkpoint_months
7. [ ] Verify `checkpoint_units_target` equals Gold threshold
8. [ ] Verify `checkpoint_units_current` is reset to 0
9. [ ] Verify Gold tier rewards are visible to user
10. [ ] Verify tier_checkpoints table has audit entry with status='promoted'

### Verification Commands

```bash
# Run specific tests
cd appcode && npm test -- --testPathPattern=promotion

# Type check
cd appcode && npx tsc --noEmit

# Build verification
cd appcode && npm run build

# Verify tier_checkpoints audit log (after running cron)
# In Supabase SQL Editor:
SELECT * FROM tier_checkpoints WHERE status = 'promoted' ORDER BY created_at DESC;
```

---

## 16. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify current code matches "Current State" section
- [x] Ensure no conflicting changes in progress
- [x] Verify schema supports checkpoint_*_target columns (see Section 11)

### Implementation Steps
- [ ] **Step 1:** Add types to tierRepository.ts
  - File: `appcode/lib/repositories/tierRepository.ts`
  - Change: Add `PromotionCandidate` interface (with tierAchievedAt field)
- [ ] **Step 2:** Add getUsersForPromotionCheck to tierRepository.ts
  - File: `appcode/lib/repositories/tierRepository.ts`
  - Change: Add new function with client_id filter
- [ ] **Step 3:** Add promoteUserToTier to tierRepository.ts
  - File: `appcode/lib/repositories/tierRepository.ts`
  - Change: Add new function (updates tier, checkpoint schedule, targets, and resets current values)
- [ ] **Step 4:** Add types to tierCalculationService.ts
  - File: `appcode/lib/services/tierCalculationService.ts`
  - Change: Add `PromotionCheckResult` interface
- [ ] **Step 5:** Add checkForPromotions to tierCalculationService.ts
  - File: `appcode/lib/services/tierCalculationService.ts`
  - Change: Add new function (includes audit logging via logCheckpointResult)
- [ ] **Step 6:** Update daily-automation route
  - File: `appcode/app/api/cron/daily-automation/route.ts`
  - Change: Add import for checkForPromotions, call before runCheckpointEvaluation, update response interface
- [ ] **Step 7:** Export new functions
  - File: `appcode/lib/repositories/tierRepository.ts`
  - Change: Ensure `getUsersForPromotionCheck` and `promoteUserToTier` are exported

### Post-Implementation
- [ ] Run type checker: `cd appcode && npx tsc --noEmit`
- [ ] Run tests: `cd appcode && npm test`
- [ ] Run build: `cd appcode && npm run build`
- [ ] Manual verification per Testing Strategy (10 steps)
- [ ] Verify tier_checkpoints audit log has promotion entries
- [ ] Update EXECUTION_PLAN.md Task 8.3.2 if needed
- [ ] Update AUTOMATION_IMPL.md with new promotion flow documentation

---

## 17. EXECUTION_PLAN.md Integration

### Affected Tasks

| Task ID | Task Name | Impact |
|---------|-----------|--------|
| 8.3.2 | Integrate with daily-automation | Add promotion check before checkpoint evaluation |
| 8.3.3 | Add tier change notifications | Notifications should cover real-time promotions too |

### Updates Required

**Task 8.3.2:**
- Current AC: Checkpoint evaluations run after daily automation
- Updated AC: **Promotion check runs first**, then checkpoint evaluation
- Notes: Promotion check is separate from checkpoint (promotion = immediate, checkpoint = maintenance)

### New Tasks Created (if any)
- [ ] None - this fits within existing Task 8.3.2 scope

---

## 18. Definition of Done

- [ ] All code changes implemented per "Proposed Fix" section
- [ ] Type checker passes with no errors
- [ ] All existing tests pass
- [ ] New tests added per "Testing Strategy" section
- [ ] Build completes successfully
- [ ] Manual verification steps completed
- [ ] EXECUTION_PLAN.md updated (if applicable)
- [ ] This document status updated to "Implemented"

---

## 19. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| Loyalty.md | Flow 1: Daily Metrics Sync | Shows what gets updated daily |
| Loyalty.md | Flow 7: Daily Tier Calculation | Shows current checkpoint-only logic |
| EXECUTION_PLAN.md | Phase 8, Tasks 8.3.x | Task context |
| tierRepository.ts | getUsersDueForCheckpoint | Shows current exclusion of Bronze |
| tierCalculationService.ts | runCheckpointEvaluation | Shows current checkpoint-only flow |

### Reading Order for External Auditor

1. **First:** Loyalty.md - Flow 1 - Shows daily sync updates metrics
2. **Second:** Loyalty.md - Flow 7 - Shows checkpoint-only tier logic (the gap)
3. **Third:** This document - Section 7 - Shows exact code changes needed

---

**Document Version:** 2.0
**Last Updated:** 2025-12-12
**Author:** Claude Code
**Status:** Implementation Ready

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-12 | Initial document |
| 2.0 | 2025-12-12 | Addressed Codex audit: Added checkpoint reset logic, checkpoint target to new tier threshold, audit logging via tier_checkpoints, expanded testing strategy, explicit multi-tenant filters |
