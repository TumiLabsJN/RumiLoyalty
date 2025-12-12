/**
 * Tier Calculation Service
 *
 * Implements Flow 7: Daily Tier Calculation from Loyalty.md lines 1452-1666.
 * Runs as part of daily cron after sales sync completes.
 *
 * 7-Step Workflow:
 * 1. Apply pending sales adjustments
 * 2. Get users due for checkpoint
 * 3. Calculate checkpoint value (metric-aware)
 * 4. Get tier thresholds and find highest qualifying tier
 * 5. Determine outcome (promoted/maintained/demoted)
 * 6. Update user tier after checkpoint
 * 7. Log checkpoint result
 *
 * References:
 * - Loyalty.md lines 1452-1666 (Flow 7)
 * - EXECUTION_PLAN.md Task 8.3.1
 * - Phase8UpgradeIMPL.md
 */

import { syncRepository } from '@/lib/repositories/syncRepository';
import {
  tierRepository,
  CheckpointUserData,
  TierThreshold,
  CheckpointUpdateData,
  CheckpointLogData,
} from '@/lib/repositories/tierRepository';

/**
 * Result of a single user's checkpoint evaluation
 */
export interface CheckpointEvaluationResult {
  userId: string;
  tierBefore: string;
  tierAfter: string;
  status: 'maintained' | 'promoted' | 'demoted';
  checkpointValue: number;
  threshold: number;
}

/**
 * Result of running checkpoint evaluation for all due users
 */
export interface RunCheckpointResult {
  success: boolean;
  adjustmentsApplied: number;
  usersEvaluated: number;
  promoted: number;
  maintained: number;
  demoted: number;
  results: CheckpointEvaluationResult[];
  errors: string[];
}

/**
 * Determine checkpoint status by comparing tier orders
 * Per Loyalty.md lines 1606-1614
 */
function determineStatus(
  oldTierOrder: number,
  newTierOrder: number
): 'maintained' | 'promoted' | 'demoted' {
  if (newTierOrder > oldTierOrder) {
    return 'promoted';
  } else if (newTierOrder < oldTierOrder) {
    return 'demoted';
  }
  return 'maintained';
}

/**
 * Calculate checkpoint value based on client's vip_metric
 * Per Loyalty.md lines 1563-1578
 *
 * @param user - User data with checkpoint values and adjustments
 * @returns Checkpoint value (sales or units + manual adjustments)
 */
function calculateCheckpointValue(user: CheckpointUserData): number {
  if (user.vipMetric === 'units') {
    // Units mode: checkpoint units + manual adjustments
    return user.checkpointUnitsCurrent + user.manualAdjustmentsUnits;
  }
  // Sales mode: checkpoint sales + manual adjustments
  return user.checkpointSalesCurrent + user.manualAdjustmentsTotal;
}

/**
 * Find highest qualifying tier for a checkpoint value
 * Per Loyalty.md lines 1580-1598
 *
 * Iterates tiers in descending order (highest first).
 * Returns first tier where checkpointValue >= threshold.
 *
 * @param checkpointValue - User's calculated checkpoint performance
 * @param thresholds - Tier thresholds sorted by tier_order DESC
 * @returns Highest qualifying tier, or null if none qualify (shouldn't happen with tier_1)
 */
function findHighestQualifyingTier(
  checkpointValue: number,
  thresholds: TierThreshold[]
): TierThreshold | null {
  for (const tier of thresholds) {
    if (checkpointValue >= tier.threshold) {
      return tier;
    }
  }
  // Should not reach here if tier_1 has threshold=0
  return thresholds.length > 0 ? thresholds[thresholds.length - 1] : null;
}

/**
 * Run checkpoint evaluation for all users due for checkpoint.
 * Per Loyalty.md Flow 7 (lines 1452-1666) and EXECUTION_PLAN.md Task 8.3.1
 *
 * 7-Step Workflow:
 * 1. Apply pending sales adjustments (syncRepository.applyPendingSalesAdjustments)
 * 2. Get users due for checkpoint (tierRepository.getUsersDueForCheckpoint)
 * 3. Calculate checkpoint value (metric-aware)
 * 4. Get tier thresholds and find highest qualifying tier
 * 5. Determine outcome (promoted/maintained/demoted)
 * 6. Update user tier (tierRepository.updateUserTierAfterCheckpoint)
 * 7. Log checkpoint result (tierRepository.logCheckpointResult)
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @returns Result with counts and individual evaluation results
 */
export async function runCheckpointEvaluation(
  clientId: string
): Promise<RunCheckpointResult> {
  const results: CheckpointEvaluationResult[] = [];
  const errors: string[] = [];
  let promoted = 0;
  let maintained = 0;
  let demoted = 0;

  // Step 1: Apply pending sales adjustments
  // Per Loyalty.md lines 1458-1506 (Step 0)
  console.log(`[TierCalculation] Step 1: Applying pending sales adjustments for client ${clientId}`);
  let adjustmentsApplied = 0;
  try {
    adjustmentsApplied = await syncRepository.applyPendingSalesAdjustments(clientId);
    console.log(`[TierCalculation] Applied ${adjustmentsApplied} pending adjustments`);
  } catch (error) {
    const errorMsg = `Failed to apply sales adjustments: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[TierCalculation] ${errorMsg}`);
    errors.push(errorMsg);
    // Continue with evaluation even if adjustments fail
  }

  // Step 2: Get users due for checkpoint
  // Per Loyalty.md lines 1553-1561 (Step 1)
  console.log(`[TierCalculation] Step 2: Getting users due for checkpoint`);
  let usersDue: CheckpointUserData[];
  try {
    usersDue = await tierRepository.getUsersDueForCheckpoint(clientId);
    console.log(`[TierCalculation] Found ${usersDue.length} users due for checkpoint`);
  } catch (error) {
    const errorMsg = `Failed to get users due for checkpoint: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[TierCalculation] ${errorMsg}`);
    return {
      success: false,
      adjustmentsApplied,
      usersEvaluated: 0,
      promoted: 0,
      maintained: 0,
      demoted: 0,
      results: [],
      errors: [errorMsg],
    };
  }

  if (usersDue.length === 0) {
    console.log(`[TierCalculation] No users due for checkpoint today`);
    return {
      success: true,
      adjustmentsApplied,
      usersEvaluated: 0,
      promoted: 0,
      maintained: 0,
      demoted: 0,
      results: [],
      errors: [],
    };
  }

  // Get tier thresholds once (all users share same client)
  // Per Loyalty.md lines 1580-1598 (Step 3)
  const vipMetric = usersDue[0].vipMetric;
  let thresholds: TierThreshold[];
  try {
    thresholds = await tierRepository.getTierThresholdsForCheckpoint(clientId, vipMetric);
    console.log(`[TierCalculation] Got ${thresholds.length} tier thresholds for ${vipMetric} mode`);
  } catch (error) {
    const errorMsg = `Failed to get tier thresholds: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[TierCalculation] ${errorMsg}`);
    return {
      success: false,
      adjustmentsApplied,
      usersEvaluated: 0,
      promoted: 0,
      maintained: 0,
      demoted: 0,
      results: [],
      errors: [errorMsg],
    };
  }

  // Process each user
  for (const user of usersDue) {
    try {
      // Step 3: Calculate checkpoint value (metric-aware)
      // Per Loyalty.md lines 1563-1578 (Step 2)
      const checkpointValue = calculateCheckpointValue(user);

      // Step 4: Find highest qualifying tier
      // Per Loyalty.md lines 1580-1598 (Step 3)
      const newTier = findHighestQualifyingTier(checkpointValue, thresholds);

      if (!newTier) {
        errors.push(`User ${user.userId}: Could not determine qualifying tier`);
        continue;
      }

      // Step 5: Determine outcome
      // Per Loyalty.md lines 1606-1614 (Step 4)
      const status = determineStatus(user.tierOrder, newTier.tierOrder);

      // Step 6: Update user tier
      // Per Loyalty.md lines 1616-1631 (Step 5)
      const updateData: CheckpointUpdateData = {
        newTier: newTier.tierId,
        tierChanged: user.currentTier !== newTier.tierId,
        checkpointMonths: user.checkpointMonths,
      };
      await tierRepository.updateUserTierAfterCheckpoint(clientId, user.userId, updateData);

      // Step 7: Log checkpoint result
      // Per Loyalty.md lines 1633-1660 (Step 6)
      // Find current tier's threshold for logging
      const currentTierThreshold = thresholds.find(t => t.tierId === user.currentTier);

      const logData: CheckpointLogData = {
        userId: user.userId,
        checkpointDate: new Date().toISOString(),
        periodStartDate: user.tierAchievedAt,
        periodEndDate: new Date().toISOString(),
        salesInPeriod: vipMetric === 'sales' ? checkpointValue : null,
        unitsInPeriod: vipMetric === 'units' ? checkpointValue : null,
        salesRequired: vipMetric === 'sales' ? (currentTierThreshold?.threshold ?? null) : null,
        unitsRequired: vipMetric === 'units' ? (currentTierThreshold?.threshold ?? null) : null,
        tierBefore: user.currentTier,
        tierAfter: newTier.tierId,
        status,
      };
      await tierRepository.logCheckpointResult(clientId, logData);

      // Track results
      results.push({
        userId: user.userId,
        tierBefore: user.currentTier,
        tierAfter: newTier.tierId,
        status,
        checkpointValue,
        threshold: newTier.threshold,
      });

      // Update counters
      if (status === 'promoted') promoted++;
      else if (status === 'demoted') demoted++;
      else maintained++;

      console.log(
        `[TierCalculation] User ${user.userId}: ${user.currentTier} → ${newTier.tierId} (${status}) ` +
        `[value: ${checkpointValue}, threshold: ${newTier.threshold}]`
      );
    } catch (error) {
      const errorMsg = `User ${user.userId}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`[TierCalculation] Error processing user: ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  const success = errors.length === 0;
  console.log(
    `[TierCalculation] Completed: ${results.length}/${usersDue.length} users evaluated ` +
    `(${promoted} promoted, ${maintained} maintained, ${demoted} demoted)`
  );

  return {
    success,
    adjustmentsApplied,
    usersEvaluated: results.length,
    promoted,
    maintained,
    demoted,
    results,
    errors,
  };
}
