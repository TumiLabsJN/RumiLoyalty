/**
 * Daily Automation Cron Route
 *
 * Executes daily sales sync from CRUVA platform.
 * Triggered by Vercel cron at 2:00 PM EST daily (0 19 * * *).
 *
 * References:
 * - Loyalty.md Flow 1 lines 410-610 (Daily Metrics Sync complete workflow)
 * - Loyalty.md line 412 (Vercel cron at 2 PM EST daily)
 * - Loyalty.md lines 252-260 (Cron Job Security with CRON_SECRET)
 * - Loyalty.md lines 1987-1994 (Automation Monitoring & Reliability)
 * - EXECUTION_PLAN.md Tasks 8.2.4, 8.2.5, 8.3.2
 * - BUG-REALTIME-PROMOTION (Real-time tier promotion)
 *
 * 6-Step Orchestration:
 * 1. Verify cron secret from request headers (via withCronAuth)
 * 2. Call salesService.processDailySales for data sync
 * 3. Call tierCalculationService.checkForPromotions for real-time promotions (BUG-REALTIME-PROMOTION)
 * 4. Call tierCalculationService.runCheckpointEvaluation for tier maintenance (Task 8.3.2)
 * 5. Handle download/processing failures with detailed error logging
 * 6. Return appropriate HTTP status codes + send admin alert on failure
 */

import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { processDailySales } from '@/lib/services/salesService';
import { runCheckpointEvaluation, checkForPromotions } from '@/lib/services/tierCalculationService';
import { sendAdminAlert, determineAlertType } from '@/lib/utils/alertService';

/**
 * Response type for successful cron execution
 */
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

/**
 * Response type for failed cron execution
 */
interface CronErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: string[];
  timestamp: string;
}

/**
 * GET /api/cron/daily-automation
 *
 * Executes daily sales sync workflow:
 * 1. Downloads CSV from CRUVA via Puppeteer
 * 2. Parses CSV and upserts video records
 * 3. Updates user precomputed fields
 * 4. Updates leaderboard ranks
 * 5. Updates mission progress
 * 6. Creates redemptions for completed missions
 *
 * Security: Protected by CRON_SECRET validation (withCronAuth)
 * Rate Limit: 1/day (enforced by Vercel cron scheduling)
 *
 * @returns 200 with success metrics or 500 with error details
 */
export const GET = withCronAuth(async () => {
  const timestamp = new Date().toISOString();

  console.log(`[DailyAutomation] Starting cron job at ${timestamp}`);

  // Step 1: Get client ID from environment (MVP single-client pattern)
  const clientId = process.env.CLIENT_ID;

  if (!clientId) {
    console.error('[DailyAutomation] CLIENT_ID environment variable not configured');
    return NextResponse.json(
      {
        success: false,
        error: 'Configuration Error',
        code: 'CLIENT_ID_NOT_CONFIGURED',
        timestamp,
      } as CronErrorResponse,
      { status: 500 }
    );
  }

  try {
    // Step 2: Execute daily sales sync
    console.log(`[DailyAutomation] Processing daily sales for client: ${clientId}`);
    const result = await processDailySales(clientId);

    // Step 3: Handle success or partial failure
    if (result.success) {
      console.log(
        `[DailyAutomation] Sales sync completed: ${result.recordsProcessed} records, ` +
          `${result.usersUpdated} users updated, ${result.newUsersCreated} new users, ` +
          `${result.missionsUpdated} missions, ${result.redemptionsCreated} redemptions`
      );

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

      if (tierResult.errors.length > 0) {
        console.warn(
          `[DailyAutomation] Tier calculation completed with ${tierResult.errors.length} errors`
        );
      }

      console.log(
        `[DailyAutomation] Tier calculation completed: ${tierResult.usersEvaluated} users evaluated ` +
          `(${tierResult.promoted} promoted, ${tierResult.maintained} maintained, ${tierResult.demoted} demoted)`
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Daily automation completed successfully',
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
              usersEvaluated: tierResult.usersEvaluated,
              promoted: tierResult.promoted,
              maintained: tierResult.maintained,
              demoted: tierResult.demoted,
            },
          },
          timestamp,
        } as CronSuccessResponse,
        { status: 200 }
      );
    } else {
      // Partial failure - some records processed but errors occurred
      console.error(
        `[DailyAutomation] Completed with errors: ${result.recordsProcessed} records processed, ` +
          `${result.errors.length} errors`
      );

      // Send admin alert for partial failure (Task 8.2.5)
      const alertType = determineAlertType('PARTIAL_FAILURE', result.errors[0]);
      await sendAdminAlert({
        type: alertType,
        errorMessage: 'Daily automation completed with errors',
        details: result.errors.slice(0, 5),
        timestamp,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Daily automation completed with errors',
          code: 'PARTIAL_FAILURE',
          details: result.errors.slice(0, 10), // Limit to first 10 errors
          timestamp,
        } as CronErrorResponse,
        { status: 500 }
      );
    }
  } catch (error) {
    // Step 4: Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DailyAutomation] Unexpected error: ${errorMessage}`);

    // Send admin alert for unexpected error (Task 8.2.5)
    const alertType = determineAlertType('UNEXPECTED_ERROR', errorMessage);
    await sendAdminAlert({
      type: alertType,
      errorMessage: errorMessage,
      timestamp,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        code: 'UNEXPECTED_ERROR',
        details: [errorMessage],
        timestamp,
      } as CronErrorResponse,
      { status: 500 }
    );
  }
});
