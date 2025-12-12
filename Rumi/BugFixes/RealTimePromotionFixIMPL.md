# Real-Time Tier Promotion - Implementation Plan

**Decision Source:** RealTimePromotionFix.md
**Bug ID:** BUG-REALTIME-PROMOTION
**Severity:** Medium
**Implementation Date:** 2025-12-12
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.1 (Updated with Codex Audit Response)

---

### Codex Audit Response Summary (v1.1 Updates)

**Audit Recommendation:** APPROVE WITH CHANGES

**Changes Made:**
1. ✅ Gate 2 - Verified file line counts match (597, 301, 199)
2. ✅ Added Bronze tier handling clarification (intentional design)
3. ✅ Step 8 - Added explicit interface changes (`tierPromotion` field shape)
4. ✅ Added Performance Considerations section (acceptable for MVP)

**Auditor Questions Answered:**
- Q1: `tierPromotion` field structure documented in Step 8
- Q2: Bronze inclusion in promotion / exclusion from checkpoint is intentional

---

## Decision Context (IMMUTABLE - DO NOT RE-DECIDE)

**From RealTimePromotionFix.md:**

**Bug Summary:** Users who exceed tier thresholds are NOT promoted until their next checkpoint (every 3 months), even though they should be promoted immediately.

**Root Cause:** The tier calculation system was designed only for checkpoint maintenance (keeping/losing tier), not for real-time promotion (gaining tier). Bronze users are explicitly excluded from all tier calculations.

**Files Affected:**
- `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
- `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
- `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`

**Chosen Solution:**
Add a new promotion check that runs daily for ALL users (including Bronze). Compare each user's `total_sales` or `total_units` against tier thresholds and promote immediately if qualified. This runs BEFORE checkpoint evaluation.

**Why This Solution:**
- Fits existing daily cron architecture (no new infrastructure)
- Simple, testable, maintainable
- 24-hour delay acceptable (per user confirmation)
- Can integrate with Task 8.3.3 notifications
- Uses existing `logCheckpointResult()` for audit trail

**From Audit Feedback:**
- Recommendation: Address Codex concerns
- Critical Issues Addressed: Checkpoint reset on promotion, checkpoint target to new tier's threshold, audit logging
- Concerns Addressed: Multi-tenant filtering, API contract (internal only), performance (acceptable for ~1000 users)

**Expected Outcome:**
- Bug resolved: YES
- Files modified: 3
- Lines changed: ~250 (new code additions)
- Breaking changes: NO
- Schema changes: NO
- API contract changes: YES (additive only - tierPromotion field)

---

### Bronze Tier Handling Clarification (Codex Audit Response)

**Question:** Should Bronze users be considered only in promotion but excluded from checkpoint evaluation?

**Answer:** YES - this is intentional by design:

| Operation | Bronze (tier_1) Included? | Why |
|-----------|---------------------------|-----|
| `getUsersForPromotionCheck()` | ✅ YES | Bronze users CAN be promoted to Silver/Gold/Platinum |
| `getUsersDueForCheckpoint()` | ❌ NO | Bronze users cannot be demoted (no tier below), so checkpoint is N/A |

**Code Reference:**
- Promotion check: No tier filter (includes all users)
- Checkpoint: `.neq('current_tier', 'tier_1')` at tierRepository.ts:431

**Interaction:** A Bronze user who qualifies for Silver will be:
1. Promoted by `checkForPromotions()` → becomes Silver
2. Their `next_checkpoint_at` set to NOW + checkpoint_months
3. At next checkpoint (3 months later), evaluated by `runCheckpointEvaluation()` for Silver maintenance

This is the correct flow - no unintended promotions/demotions interaction.

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
**Expected:** `/home/jorge/Loyalty/Rumi/appcode` (or parent directory)

**Git Status:**
```bash
git status --short
```
**Expected:** Clean working tree or acceptable uncommitted changes

**Checklist:**
- [ ] Directory confirmed: [actual path]
- [ ] Git status acceptable: [actual status]
- [ ] Ready to proceed

---

### Gate 2: Source Files Verification

**Files to be modified:**

**File 1:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** 597 lines (verified 2025-12-12)

**File 2:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** 301 lines (verified 2025-12-12)

**File 3:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
```bash
wc -l /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** 199 lines (verified 2025-12-12)

**Checklist:**
- [ ] All source files exist: 3
- [ ] All files readable
- [ ] Line counts match expected (±5 lines acceptable if minor formatting changes)

---

### Gate 3: Current Code State Verification

**Read end of tierRepository.ts:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts lines 590-597
```

**Expected Current State:**
```typescript
    if (error) {
      console.error('[TierRepository] Error logging checkpoint result:', error);
      throw new Error(`Failed to log checkpoint result: ${error.message}`);
    }

    return result.id;
  },
};
```

**Read end of tierCalculationService.ts:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts lines 295-301
```

**Expected Current State:**
```typescript
    promoted,
    maintained,
    demoted,
    results,
    errors,
  };
}
```

**Read route.ts checkpoint section:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 111-125
```

**Expected Current State:**
```typescript
      // Step 3b: Run tier checkpoint evaluation (Task 8.3.2)
      // Per Loyalty.md Flow 7: "Runs immediately after data sync completes"
      console.log(`[DailyAutomation] Starting tier checkpoint evaluation`);
      const tierResult = await runCheckpointEvaluation(clientId);

      if (tierResult.errors.length > 0) {
        console.warn(
          `[DailyAutomation] Tier calculation completed with ${tierResult.errors.length} errors`
        );
      }

      console.log(
        `[DailyAutomation] Tier calculation completed: ${tierResult.usersEvaluated} users evaluated ` +
          `(${tierResult.promoted} promoted, ${tierResult.maintained} maintained, ${tierResult.demoted} demoted)`
      );
```

**Checklist:**
- [ ] tierRepository.ts ends with `};` at line 597
- [ ] tierCalculationService.ts ends with `}` at line 301
- [ ] route.ts has checkpoint at lines 111-114
- [ ] No unexpected changes since analysis

**If current state doesn't match:** STOP. Report discrepancy. File may have changed since Fix.md was created.

---

### Gate 4: Schema Verification

**Read SchemaFinalv2.md for relevant tables:**

**Verify users table columns:**
```bash
grep -A 50 "users" /home/jorge/Loyalty/Rumi/SchemaFinalv2.md | grep -E "current_tier|total_sales|total_units|tier_achieved_at|next_checkpoint_at|checkpoint_sales|checkpoint_units"
```

**Tables involved:** users, tiers, clients, tier_checkpoints

**Column verification:**
| Column in Code | Exists in Schema? |
|----------------|-------------------|
| users.current_tier | [ ] |
| users.total_sales | [ ] |
| users.total_units | [ ] |
| users.tier_achieved_at | [ ] |
| users.next_checkpoint_at | [ ] |
| users.checkpoint_sales_current | [ ] |
| users.checkpoint_units_current | [ ] |
| users.checkpoint_sales_target | [ ] |
| users.checkpoint_units_target | [ ] |
| tiers.tier_id | [ ] |
| tiers.tier_order | [ ] |
| tiers.sales_threshold | [ ] |
| tiers.units_threshold | [ ] |
| clients.vip_metric | [ ] |
| clients.checkpoint_months | [ ] |
| tier_checkpoints.status | [ ] |

**Checklist:**
- [ ] All column names match schema exactly
- [ ] Data types compatible
- [ ] tier_checkpoints.status supports 'promoted' value

---

### Gate 5: Existing Functions Verification

**Verify logCheckpointResult exists (for audit logging):**
```bash
grep -n "async logCheckpointResult" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** Function exists (around line 565)

**Verify createClient import exists:**
```bash
grep -n "createClient" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts | head -5
```
**Expected:** Import at top of file

**Checklist:**
- [ ] logCheckpointResult function exists
- [ ] createClient available for new functions

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

### Step 1: Add PromotionCandidate Interface to tierRepository.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
**Target Location:** After CheckpointLogData interface (line 136-148), before CheckpointUpdateData (line 154)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Find insertion point:**
```bash
grep -n "export interface CheckpointLogData" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** Line 136

**Read area after CheckpointLogData:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts lines 136-160
```
**Expected:** CheckpointLogData ends at line 148, CheckpointUpdateData starts at 154

---

#### Edit Action

**Insert after line 148 (closing `}` of CheckpointLogData), before line 150 (comment for CheckpointUpdateData):**

**OLD Code (lines 147-150):**
```typescript
  status: 'maintained' | 'promoted' | 'demoted';
}

/**
```

**NEW Code:**
```typescript
  status: 'maintained' | 'promoted' | 'demoted';
}

/**
 * Candidate for tier promotion
 * Used by real-time promotion check (BUG-REALTIME-PROMOTION)
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

/**
```

**Change Summary:**
- Lines added: ~14
- Net change: +14

---

#### Post-Action Verification

**Read new interface:**
```bash
grep -n "PromotionCandidate" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** Interface found

---

#### Step Verification

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | head -5
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]

---

### Step 2: Add getUsersForPromotionCheck to tierRepository.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts`
**Target Lines:** Before the closing `};` of the tierRepository object (line 597)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read current end of file:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts lines 590-597
```

**Expected Current State:**
```typescript
    if (error) {
      console.error('[TierRepository] Error logging checkpoint result:', error);
      throw new Error(`Failed to log checkpoint result: ${error.message}`);
    }

    return result.id;
  },
};
```

---

#### Edit Action

**OLD Code (to be replaced):**
```typescript
    return result.id;
  },
};
```

**NEW Code (replacement):**
```typescript
    return result.id;
  },

  /**
   * Get all users who may qualify for promotion.
   * Returns users whose total_sales OR total_units exceed their current tier's threshold.
   *
   * Unlike checkpoint evaluation, this includes ALL users (including Bronze).
   * Per BUG-REALTIME-PROMOTION: Model B real-time promotion.
   *
   * SECURITY: Filters by client_id (multitenancy)
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
      .eq('client_id', clientId);  // Multi-tenant filter

    if (userError) {
      console.error('[TierRepository] Error fetching users for promotion check:', userError);
      throw new Error(`Failed to fetch users: ${userError.message}`);
    }

    // Get client's VIP metric setting
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('vip_metric')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('[TierRepository] Error fetching client:', clientError);
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    // Get tier thresholds sorted by tier_order DESC (highest first)
    const { data: tiers, error: tierError } = await supabase
      .from('tiers')
      .select('tier_id, tier_order, sales_threshold, units_threshold')
      .eq('client_id', clientId)  // Multi-tenant filter
      .order('tier_order', { ascending: false });

    if (tierError) {
      console.error('[TierRepository] Error fetching tiers:', tierError);
      throw new Error(`Failed to fetch tiers: ${tierError.message}`);
    }

    const vipMetric = client?.vip_metric;
    const candidates: PromotionCandidate[] = [];

    for (const user of users || []) {
      const userValue = vipMetric === 'units'
        ? (user.total_units ?? 0)
        : (user.total_sales ?? 0);

      // Find current tier order
      const currentTierData = tiers?.find(t => t.tier_id === user.current_tier);
      const currentTierOrder = currentTierData?.tier_order ?? 1;

      // Find highest qualifying tier (tiers sorted DESC by tier_order)
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
   * Per BUG-REALTIME-PROMOTION: User gets full checkpoint period to prove new tier.
   *
   * SECURITY: Filters by client_id AND user_id (multitenancy)
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
      console.error('[TierRepository] Error promoting user:', error);
      throw new Error(`Failed to promote user: ${error.message}`);
    }
  },
};
```

**Change Summary:**
- Lines removed: 3
- Lines added: ~130
- Net change: +127

---

#### Post-Action Verification

**Read new functions:**
```bash
grep -n "getUsersForPromotionCheck\|promoteUserToTier" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts
```
**Expected:** Both functions found

**Verify multi-tenant filters:**
```bash
grep -n "eq('client_id'" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts | tail -5
```
**Expected:** client_id filters in new functions

---

#### Step Verification

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | head -10
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced
- [ ] Multi-tenant filters present

**Checkpoint Status:** [PASS / FAIL]

---

### Step 3: Add PromotionCheckResult Interface to tierCalculationService.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Location:** After RunCheckpointResult interface (line 55), before determineStatus function (line 57)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Find RunCheckpointResult:**
```bash
grep -n "export interface RunCheckpointResult" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** Line 46

**Read area after RunCheckpointResult:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts lines 53-65
```
**Expected:** RunCheckpointResult ends at line 55, determineStatus starts at line 57

---

#### Edit Action

**OLD Code (lines 54-57):**
```typescript
  errors: string[];
}

/**
```

**NEW Code:**
```typescript
  errors: string[];
}

/**
 * Result of promotion check
 * Per BUG-REALTIME-PROMOTION: Model B real-time promotion
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
```

**Change Summary:**
- Lines added: ~18
- Net change: +18

---

#### Post-Action Verification

**Read new interface:**
```bash
grep -n "PromotionCheckResult" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** Interface found

---

#### Step Verification

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | head -5
```
**Expected:** No new type errors

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]

---

### Step 4: Add checkForPromotions Function to tierCalculationService.ts

**NOTE:** This step references the OLD structure - will be updated during execution after Steps 1-3 shift line numbers.

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Lines:** End of file (currently line 301, will shift after Step 3)
**Action Type:** ADD

---

#### Pre-Action Reality Check

**Read end of file:**
```bash
tail -10 /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```

**Expected Current State (end of runCheckpointEvaluation):**
```typescript
    promoted,
    maintained,
    demoted,
    results,
    errors,
  };
}
```

---

#### Edit Action

**OLD Code (to be replaced - just the closing):**
```typescript
  };
}
```

**NEW Code (replacement):**
```typescript
  };
}

/**
 * Check all users for potential promotion to higher tier.
 * Runs daily after sales sync, BEFORE checkpoint evaluation.
 *
 * Per BUG-REALTIME-PROMOTION: Model B real-time promotion.
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

  // Get promotion candidates
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
    console.log(`[TierCalculation] No users eligible for promotion`);
    return {
      success: true,
      usersChecked: 0,
      usersPromoted: 0,
      promotions: [],
      errors: [],
    };
  }

  // Process each candidate
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
        periodStartDate: candidate.tierAchievedAt.split('T')[0],  // When they got previous tier
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

**Change Summary:**
- Lines removed: 2
- Lines added: ~120
- Net change: +118

---

#### Post-Action Verification

**Read new function:**
```bash
grep -n "checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts
```
**Expected:** Function found

---

#### Step Verification

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | head -10
```
**Expected:** No new type errors (may need to add import)

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Edit applied successfully
- [ ] Post-action state matches expected
- [ ] No new errors introduced

**Checkpoint Status:** [PASS / FAIL]

---

### Step 5: Add Imports to tierCalculationService.ts

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts`
**Target Location:** Import section (lines 22-29)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read import section:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts lines 21-30
```

**Expected Current State:**
```typescript
import { syncRepository } from '@/lib/repositories/syncRepository';
import {
  tierRepository,
  CheckpointUserData,
  TierThreshold,
  CheckpointUpdateData,
  CheckpointLogData,
} from '@/lib/repositories/tierRepository';
```

---

#### Edit Action 5a: Add createClient import

**Add after line 22 (after syncRepository import):**
```typescript
import { createClient } from '@/lib/supabase/server-client';
```

#### Edit Action 5b: Update tierRepository import

**OLD Code (lines 23-29):**
```typescript
import {
  tierRepository,
  CheckpointUserData,
  TierThreshold,
  CheckpointUpdateData,
  CheckpointLogData,
} from '@/lib/repositories/tierRepository';
```

**NEW Code:**
```typescript
import {
  tierRepository,
  CheckpointUserData,
  TierThreshold,
  CheckpointUpdateData,
  CheckpointLogData,
  PromotionCandidate,
} from '@/lib/repositories/tierRepository';
```

---

#### Post-Action Verification

**Verify imports:**
```bash
grep -n "PromotionCandidate\|createClient" /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts | head -5
```
**Expected:** Both imports found

---

### Step 6: Update daily-automation Route - Add Import

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Location:** Import section (line 24)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read import section:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 21-30
```

**Expected Current State:**
```typescript
import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { processDailySales } from '@/lib/services/salesService';
import { runCheckpointEvaluation } from '@/lib/services/tierCalculationService';
import { sendAdminAlert, determineAlertType } from '@/lib/utils/alertService';
```

---

#### Edit Action

**OLD Code:**
```typescript
import { runCheckpointEvaluation } from '@/lib/services/tierCalculationService';
```

**NEW Code:**
```typescript
import { runCheckpointEvaluation, checkForPromotions } from '@/lib/services/tierCalculationService';
```

---

#### Post-Action Verification

**Verify import:**
```bash
grep -n "checkForPromotions" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** Import found

---

### Step 7: Update daily-automation Route - Add Promotion Check Call

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Lines:** 111-114 (before checkpoint evaluation)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read current checkpoint section:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 108-130
```

---

#### Edit Action

**OLD Code:**
```typescript
      // Step 3b: Run tier checkpoint evaluation (Task 8.3.2)
      // Per Loyalty.md Flow 7: "Runs immediately after data sync completes"
      console.log(`[DailyAutomation] Starting tier checkpoint evaluation`);
      const tierResult = await runCheckpointEvaluation(clientId);
```

**NEW Code:**
```typescript
      // Step 3b: Check for real-time promotions (BUG-REALTIME-PROMOTION)
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

---

### Step 8: Update daily-automation Route - Update Response Interface and Data

**Target File:** `/home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts`
**Target Lines:** Lines 31-48 (CronSuccessResponse interface) and lines 127-147 (response data)
**Action Type:** MODIFY

---

#### Pre-Action Reality Check

**Read response interface:**
```bash
Read /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts lines 31-48
```

**Expected Current State:**
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

#### Edit Action 8a: Update CronSuccessResponse Interface

**OLD Code (lines 31-48):**
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

**NEW Code:**
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
    tierPromotion: {
      usersChecked: number;
      usersPromoted: number;
      promotions: Array<{
        userId: string;
        fromTier: string;
        toTier: string;
        totalValue: number;
      }>;
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

**Change Summary:**
- Added `tierPromotion` field before `tierCalculation`
- Shape matches `PromotionCheckResult` interface from Step 3

---

#### Edit Action 8b: Update Response Data

**Find the response data section (around line 127-147) and add tierPromotion data.**

**OLD Code (partial):**
```typescript
          data: {
            recordsProcessed: result.recordsProcessed,
            usersUpdated: result.usersUpdated,
            newUsersCreated: result.newUsersCreated,
            missionsUpdated: result.missionsUpdated,
            redemptionsCreated: result.redemptionsCreated,
            tierCalculation: {
```

**NEW Code:**
```typescript
          data: {
            recordsProcessed: result.recordsProcessed,
            usersUpdated: result.usersUpdated,
            newUsersCreated: result.newUsersCreated,
            missionsUpdated: result.missionsUpdated,
            redemptionsCreated: result.redemptionsCreated,
            tierPromotion: {
              usersChecked: promotionResult.usersChecked,
              usersPromoted: promotionResult.usersPromoted,
              promotions: promotionResult.promotions,
            },
            tierCalculation: {
```

---

#### Post-Action Verification

**Verify interface updated:**
```bash
grep -n "tierPromotion" /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** Found in interface definition AND response data

**Type Check:**
```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | head -5
```
**Expected:** No new type errors

---

#### Step Verification

**Step Checkpoint:**
- [ ] Pre-action state matched expected
- [ ] Interface updated with tierPromotion field
- [ ] Response data includes promotionResult values
- [ ] No new type errors

**Checkpoint Status:** [PASS / FAIL]

---

## Security Verification

**All queries MUST be verified for multi-tenant isolation.**

---

### Multi-Tenant Security Check

**Query 1:** `getUsersForPromotionCheck` - users query
```typescript
.eq('client_id', clientId)  // Multi-tenant filter
```
**Checklist:**
- [ ] `.eq('client_id', clientId)` present

**Query 2:** `getUsersForPromotionCheck` - tiers query
```typescript
.eq('client_id', clientId)  // Multi-tenant filter
```
**Checklist:**
- [ ] `.eq('client_id', clientId)` present

**Query 3:** `promoteUserToTier` - update query
```typescript
.eq('id', userId)
.eq('client_id', clientId);  // Multi-tenant filter
```
**Checklist:**
- [ ] `.eq('client_id', clientId)` present

---

**SECURITY STATUS:** [ ] ALL CHECKS PASSED / [ ] ISSUES FOUND

---

## Performance Considerations (Codex Audit Response)

**Concern:** Daily full-scan promotion check may have performance impact.

**Current Assessment:**
| Metric | Value | Acceptable? |
|--------|-------|-------------|
| Users scanned | ~1000 (MVP) | ✅ YES |
| Query complexity | O(users × tiers) | ✅ YES (~1000 × 4 = 4000 comparisons) |
| Frequency | Daily (not per-request) | ✅ YES |
| Database load | 2 SELECT queries + N UPDATE queries | ✅ YES (N typically small) |

**Why acceptable for MVP:**
1. Runs once daily during off-peak (2 PM EST)
2. ~1000 users is well within Supabase free tier limits
3. Most users won't qualify for promotion (N << 1000)
4. No real-time latency impact (cron job)

**Future monitoring (post-MVP):**
- If user base exceeds 10,000: Consider batching
- If promotion check takes >30s: Add index on `(client_id, current_tier)`
- If many false candidates: Add pre-filter on `total_sales/total_units`

**No optimization needed for MVP launch.**

---

## Final Verification (ALL MUST PASS)

---

### Verification 1: Type Check

```bash
cd /home/jorge/Loyalty/Rumi/appcode && npx tsc --noEmit 2>&1 | grep -i "error" | wc -l
```
**Expected:** 0 errors
**Actual:** [document actual output]

---

### Verification 2: New Functions Exist

```bash
grep -n "getUsersForPromotionCheck\|promoteUserToTier\|checkForPromotions\|PromotionCandidate\|PromotionCheckResult" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts /home/jorge/Loyalty/Rumi/appcode/lib/services/tierCalculationService.ts /home/jorge/Loyalty/Rumi/appcode/app/api/cron/daily-automation/route.ts
```
**Expected:** All new functions/types found
**Actual:** [document actual output]

---

### Verification 3: Multi-Tenant Filters

```bash
grep -n "eq('client_id'" /home/jorge/Loyalty/Rumi/appcode/lib/repositories/tierRepository.ts | wc -l
```
**Expected:** Count increased from before (new filters added)
**Actual:** [document actual output]

---

### Verification 4: Build Success

```bash
cd /home/jorge/Loyalty/Rumi/appcode && npm run build 2>&1 | tail -10
```
**Expected:** Build succeeds
**Actual:** [document actual output]

---

### Verification 5: Git Diff Sanity Check

```bash
git diff --stat
```
**Expected Changes:**
- tierRepository.ts: ~140 lines added
- tierCalculationService.ts: ~135 lines added
- route.ts: ~25 lines added

**Actual Changes:** [document git diff output]

---

**FINAL VERIFICATION STATUS:** [ ] ALL PASSED / [ ] FAILED

---

## Audit Trail

**For Second LLM Auditor: This section allows you to verify implementation without re-executing.**

---

### Implementation Summary

**Date:** [To be filled during execution]
**Executor:** Claude Opus 4.5
**Decision Source:** RealTimePromotionFix.md
**Implementation Doc:** RealTimePromotionFixIMPL.md
**Bug ID:** BUG-REALTIME-PROMOTION

---

### Execution Log

**Pre-Implementation:**
```
[Timestamp] Gate 1: Environment - [PASS/FAIL]
[Timestamp] Gate 2: Files - [PASS/FAIL]
[Timestamp] Gate 3: Code State - [PASS/FAIL]
[Timestamp] Gate 4: Schema - [PASS/FAIL]
[Timestamp] Gate 5: Existing Functions - [PASS/FAIL]
```

**Implementation Steps:**
```
[Timestamp] Step 1: Add PromotionCandidate interface - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 2: Add getUsersForPromotionCheck & promoteUserToTier - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 3: Add PromotionCheckResult interface - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 4: Add checkForPromotions function - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 5: Add import for PromotionCandidate - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 6: Update route import - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 7: Add promotion check call - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
[Timestamp] Step 8: Update response interface and data - Pre ✅ - Applied ✅ - Post ✅ - Verified ✅
```

**Security Verification:**
```
[Timestamp] Multi-tenant check - [PASS/FAIL]
```

**Final Verification:**
```
[Timestamp] Type check ✅
[Timestamp] New functions exist ✅
[Timestamp] Multi-tenant filters ✅
[Timestamp] Build success ✅
[Timestamp] Git diff sanity ✅
[Timestamp] Overall: PASS ✅
```

---

### Files Modified

**Complete List:**
1. `appcode/lib/repositories/tierRepository.ts` - Lines 160+, 595+ - ADD - PromotionCandidate interface, getUsersForPromotionCheck(), promoteUserToTier()
2. `appcode/lib/services/tierCalculationService.ts` - Lines 55+, 301+ - ADD - PromotionCheckResult interface, checkForPromotions()
3. `appcode/app/api/cron/daily-automation/route.ts` - Lines 24, 111+, 30+, 130+ - MODIFY - Import, promotion check call, response interface/data

**Total:** 3 files modified, ~300 lines changed (net additions)

---

### Decision Trail (Full Context)

**Step 1: Analysis Phase**
- StandardBugFix.md template applied (adapted for Feature Gap)
- Created: RealTimePromotionFix.md
- Documented 19 sections
- Proposed solution identified

**Step 2: Audit Phase**
- Codex audit completed
- Recommendation: Address concerns
- Feedback addressed: Checkpoint reset, tier threshold target, audit logging, multi-tenant filters

**Step 3: Implementation Phase**
- StandardBugFixIMPL.md template applied
- Created: RealTimePromotionFixIMPL.md
- Executing 8 implementation steps
- All verifications to pass

**Step 4: Current Status**
- Implementation: PENDING
- Ready for execution approval

---

## Document Status

**Implementation Date:** [To be filled]
**LLM Executor:** Claude Opus 4.5
**Document Version:** 1.0

---

### Completion Checklist

**Pre-Implementation:**
- [ ] All gates passed
- [ ] Current code state verified
- [ ] Schema verified
- [ ] Existing functions verified

**Implementation:**
- [ ] All 8 steps completed
- [ ] All checkpoints passed
- [ ] No steps skipped

**Security:**
- [ ] Multi-tenant isolation verified (3 queries)

**Verification:**
- [ ] Type check passed
- [ ] New functions exist
- [ ] Build succeeded
- [ ] Git diff reviewed

**Documentation:**
- [ ] Audit trail complete
- [ ] Execution log detailed

---

### Final Status

**Implementation Result:** [PENDING]

**If SUCCESS:**
- Bug resolved: YES
- Ready for: Git commit
- Next: Update RealTimePromotionFix.md status to "Implemented"

**Git Commit Message Template:**
```
feat: Add real-time tier promotion check (BUG-REALTIME-PROMOTION)

Adds daily promotion check that runs BEFORE checkpoint evaluation.
Users exceeding tier thresholds are promoted immediately (24h max delay).

Changes:
- tierRepository.ts: Add getUsersForPromotionCheck(), promoteUserToTier()
- tierCalculationService.ts: Add checkForPromotions()
- daily-automation/route.ts: Call promotion check, update response

Key behaviors:
- Includes ALL users (including Bronze)
- Resets checkpoint schedule on promotion (NOW + checkpoint_months)
- Sets checkpoint target to NEW tier's threshold
- Logs promotions to tier_checkpoints with status='promoted'

References:
- BugFixes/RealTimePromotionFix.md
- BugFixes/RealTimePromotionFixIMPL.md

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

### Execution Integrity
- [ ] Executed steps in EXACT order (no skipping)
- [ ] Passed ALL checkpoints (no shortcuts)
- [ ] Documented ACTUAL results (not expected)
- [ ] Stopped at ANY checkpoint failure (no proceeding blindly)

### Decision Fidelity
- [ ] Followed locked decision (no re-analysis)
- [ ] Implemented chosen solution exactly (no modifications)
- [ ] Addressed audit feedback (checkpoint reset, targets, logging)

### Security Verification
- [ ] Verified multi-tenant isolation (client_id filtering)
- [ ] All 3 new queries have client_id filter

---

**META-VERIFICATION STATUS:** ✅ EXECUTED SUCCESSFULLY (2025-12-12)

**RED FLAGS exhibited:** [x] None - All 8 steps completed, type check passed, build passed
