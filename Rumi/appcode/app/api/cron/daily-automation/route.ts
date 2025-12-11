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
 * - EXECUTION_PLAN.md Tasks 8.2.4, 8.2.5
 *
 * 4-Step Orchestration:
 * 1. Verify cron secret from request headers (via withCronAuth)
 * 2. Call salesService.processDailySales for data sync
 * 3. Handle download/processing failures with detailed error logging
 * 4. Return appropriate HTTP status codes + send admin alert on failure
 */

import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { processDailySales } from '@/lib/services/salesService';
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
        `[DailyAutomation] Completed successfully: ${result.recordsProcessed} records, ` +
          `${result.usersUpdated} users updated, ${result.newUsersCreated} new users, ` +
          `${result.missionsUpdated} missions, ${result.redemptionsCreated} redemptions`
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
