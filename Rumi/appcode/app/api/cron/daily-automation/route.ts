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
import { sendTierChangeNotification } from '@/lib/utils/notificationService';
import { createRaffleDrawingEvent } from '@/lib/utils/googleCalendar';
import { syncRepository } from '@/lib/repositories/syncRepository';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';

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
    raffleCalendar: {
      eventsCreated: number;
    };
    boostActivation: {
      activatedCount: number;
      expiredCount: number;
      transitionedToPendingInfoCount: number;
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

        // Step 3b.1: Send promotion notifications (Task 8.3.3)
        console.log(`[DailyAutomation] Sending promotion notifications`);
        for (const promotion of promotionResult.promotions) {
          await sendTierChangeNotification(clientId, {
            userId: promotion.userId,
            fromTier: promotion.fromTier,
            toTier: promotion.toTier,
            changeType: 'promotion',
            totalValue: promotion.totalValue,
          });
        }
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

      // Step 3c.1: Send tier change notifications from checkpoint evaluation (Task 8.3.3)
      // Promotions and demotions only - no email for 'maintained'
      const checkpointChanges = tierResult.results.filter(r => r.status !== 'maintained');
      if (checkpointChanges.length > 0) {
        console.log(`[DailyAutomation] Sending ${checkpointChanges.length} tier change notifications from checkpoint`);
        for (const change of checkpointChanges) {
          await sendTierChangeNotification(clientId, {
            userId: change.userId,
            fromTier: change.tierBefore,
            toTier: change.tierAfter,
            changeType: change.status === 'promoted' ? 'promotion' : 'demotion',
            totalValue: change.checkpointValue,
            periodStartDate: change.periodStartDate,
            periodEndDate: change.periodEndDate,
          });
        }
      }

      // Step 3d: Create calendar events for raffles ending today (Task 8.3.4)
      // Per Loyalty.md lines 1772-1783: Create reminder at 12:00 PM EST
      console.log(`[DailyAutomation] Checking for raffles ending today`);
      let raffleEventsCreated = 0;
      try {
        const rafflesEndingToday = await syncRepository.findRafflesEndingToday(clientId);

        if (rafflesEndingToday.length > 0) {
          console.log(`[DailyAutomation] Found ${rafflesEndingToday.length} raffles ending today`);

          for (const raffle of rafflesEndingToday) {
            // Set due time to 12:00 PM EST on raffle_end_date
            const drawingDateTime = new Date(raffle.raffleEndDate);
            drawingDateTime.setHours(12, 0, 0, 0); // 12:00 PM

            const calendarResult = await createRaffleDrawingEvent(
              raffle.missionName,
              raffle.prizeName,
              raffle.participantCount,
              drawingDateTime
            );

            if (calendarResult.success) {
              raffleEventsCreated++;
              console.log(`[DailyAutomation] Created calendar event for raffle: ${raffle.missionName}`);
            } else {
              console.warn(`[DailyAutomation] Failed to create calendar event for raffle ${raffle.missionName}: ${calendarResult.error}`);
            }
          }
        }
      } catch (raffleError) {
        // Non-fatal: Log error, continue
        const errorMsg = raffleError instanceof Error ? raffleError.message : String(raffleError);
        console.warn(`[DailyAutomation] Raffle calendar check failed (non-fatal): ${errorMsg}`);
      }

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
            raffleCalendar: {
              eventsCreated: raffleEventsCreated,
            },
            boostActivation: {
              activatedCount: boostActivatedCount,
              expiredCount: boostExpiredCount,
              transitionedToPendingInfoCount: boostTransitionedCount,
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
