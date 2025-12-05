/**
 * Google Calendar Utility
 *
 * Creates calendar events as reminders for admin manual tasks.
 * Used for reward fulfillment, physical gift shipping, discount activation,
 * commission boost payouts, and raffle drawings.
 *
 * References: Loyalty.md lines 1690-1793 (Google Calendar Integration)
 *
 * Environment Variables:
 * - GOOGLE_CALENDAR_CREDENTIALS: Service account JSON credentials (base64 encoded or JSON string)
 * - GOOGLE_CALENDAR_ID: Admin calendar ID (e.g., "admin@company.com" or calendar ID)
 *
 * Error Handling:
 * - All functions log errors but don't throw (non-blocking)
 * - Parent operations should continue even if calendar event fails
 */

import { google, calendar_v3 } from 'googleapis';

// =============================================================================
// SECTION 1: Configuration & Initialization
// =============================================================================

/**
 * Calendar event types matching Loyalty.md event creation rules
 */
export type CalendarEventType =
  | 'instant_reward'      // gift_card, spark_ads, experience
  | 'physical_gift'       // Physical gift shipping
  | 'discount_activation' // Scheduled discount activation
  | 'commission_payout'   // Commission boost payout
  | 'raffle_drawing';     // Raffle winner selection

/**
 * Get Google Calendar client
 * Uses service account authentication
 */
function getCalendarClient(): calendar_v3.Calendar | null {
  try {
    const credentialsEnv = process.env.GOOGLE_CALENDAR_CREDENTIALS;

    if (!credentialsEnv) {
      console.warn('GOOGLE_CALENDAR_CREDENTIALS not set - calendar events disabled');
      return null;
    }

    // Parse credentials (supports base64 encoded or raw JSON)
    let credentials: Record<string, unknown>;
    try {
      // Try base64 decode first
      const decoded = Buffer.from(credentialsEnv, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    } catch {
      // Fall back to raw JSON
      credentials = JSON.parse(credentialsEnv);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('Failed to initialize Google Calendar client:', error);
    return null;
  }
}

/**
 * Get calendar ID from environment
 */
function getCalendarId(): string | null {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    console.warn('GOOGLE_CALENDAR_ID not set - calendar events disabled');
    return null;
  }

  return calendarId;
}

// =============================================================================
// SECTION 2: Event Creation
// =============================================================================

export interface CreateCalendarEventParams {
  title: string;
  description: string;
  dueDateTime: Date;
  reminderMinutes?: number; // Default: no reminder for instant, 15 for scheduled
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Create a calendar event for admin task reminder
 *
 * @param params - Event parameters
 * @returns Result with eventId if successful, error message if failed
 *
 * @example
 * const result = await createCalendarEvent({
 *   title: '🎁 Fulfill gift_card: @creatorhandle',
 *   description: 'Reward Type: gift_card\nValue: $50\n...',
 *   dueDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
 * });
 *
 * if (result.success) {
 *   // Store result.eventId in database for later deletion
 * }
 */
export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CalendarEventResult> {
  const { title, description, dueDateTime, reminderMinutes } = params;

  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

    if (!calendar || !calendarId) {
      return {
        success: false,
        error: 'Calendar not configured',
      };
    }

    // Create event with 1-hour duration (standard for task reminders)
    const endDateTime = new Date(dueDateTime.getTime() + 60 * 60 * 1000);

    const event: calendar_v3.Schema$Event = {
      summary: title,
      description,
      start: {
        dateTime: dueDateTime.toISOString(),
        timeZone: 'America/New_York', // EST/EDT
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
    };

    // Add reminder if specified
    if (reminderMinutes !== undefined) {
      event.reminders = {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: reminderMinutes },
          { method: 'email', minutes: reminderMinutes },
        ],
      };
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create calendar event:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// SECTION 3: Event Management
// =============================================================================

/**
 * Delete a calendar event
 *
 * Called when admin completes the task (e.g., marks reward as fulfilled)
 *
 * @param eventId - The Google Calendar event ID to delete
 * @returns Result indicating success or failure
 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

    if (!calendar || !calendarId) {
      return {
        success: false,
        error: 'Calendar not configured',
      };
    }

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to delete calendar event:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Mark a calendar event as completed
 *
 * Updates the event title with a checkmark and changes color to indicate completion.
 * Alternative to deletion when you want to keep a record.
 *
 * @param eventId - The Google Calendar event ID to mark as completed
 * @returns Result indicating success or failure
 */
export async function markEventCompleted(
  eventId: string
): Promise<CalendarEventResult> {
  try {
    const calendar = getCalendarClient();
    const calendarId = getCalendarId();

    if (!calendar || !calendarId) {
      return {
        success: false,
        error: 'Calendar not configured',
      };
    }

    // First, get the current event
    const existing = await calendar.events.get({
      calendarId,
      eventId,
    });

    if (!existing.data) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    // Update with completion indicator
    const updatedEvent: calendar_v3.Schema$Event = {
      summary: `✅ ${existing.data.summary}`,
      description: `[COMPLETED]\n\n${existing.data.description || ''}`,
      // colorId '2' is green in Google Calendar
      colorId: '2',
    };

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updatedEvent,
    });

    return { success: true, eventId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to mark calendar event as completed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// SECTION 4: Helper Functions for Specific Event Types
// =============================================================================

/**
 * Create instant reward fulfillment event
 * For: gift_card, spark_ads, experience
 *
 * @param handle - Creator's TikTok handle (with @)
 * @param rewardType - Type of reward
 * @param value - Reward value (e.g., 50 for $50)
 * @param email - Creator's email
 */
export async function createInstantRewardEvent(
  handle: string,
  rewardType: string,
  value: number,
  email: string
): Promise<CalendarEventResult> {
  const title = `🎁 Fulfill ${rewardType}: ${handle}`;
  const description = `Reward Type: ${rewardType}
Value: $${value}
Creator: ${handle}
Email: ${email}

Action: Purchase and deliver reward, then mark as concluded in Admin UI`;

  const dueDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

  return createCalendarEvent({ title, description, dueDateTime });
}

/**
 * Create physical gift shipping event
 */
export async function createPhysicalGiftEvent(
  handle: string,
  itemName: string,
  sizeValue: string | null,
  shippingAddress: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
  }
): Promise<CalendarEventResult> {
  const title = `📦 Ship Physical Gift: ${handle}`;

  let addressLines = `${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.line1}`;
  if (shippingAddress.line2) {
    addressLines += `\n${shippingAddress.line2}`;
  }
  addressLines += `\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`;

  const description = `Item: ${itemName}
${sizeValue ? `Size: ${sizeValue}\n` : ''}
Ship To:
${addressLines}

Action: Purchase/ship item, then update shipped_at in Admin UI`;

  const dueDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

  return createCalendarEvent({ title, description, dueDateTime });
}

/**
 * Create discount activation event
 * Scheduled for the activation date/time with 15-minute reminder
 */
export async function createDiscountActivationEvent(
  handle: string,
  percent: number,
  durationMinutes: number,
  couponCode: string,
  maxUses: number | null,
  activationDateTime: Date
): Promise<CalendarEventResult> {
  const title = `🔔 Activate Discount: ${handle}`;
  const description = `Creator: ${handle}
Discount: ${percent}%
Duration: ${durationMinutes} minutes
Coupon Code: ${couponCode}
Max Uses: ${maxUses || 'Unlimited'}

Action:
1. Go to TikTok Seller Central
2. Create coupon with above parameters
3. Return to Admin UI and click "Mark as Activated"`;

  return createCalendarEvent({
    title,
    description,
    dueDateTime: activationDateTime,
    reminderMinutes: 15,
  });
}

/**
 * Create commission boost scheduled event (at claim time)
 *
 * Called when user claims a commission boost. Creates calendar event
 * with due date calculated as: activation + duration + 20 days clearing.
 *
 * Note: Payout amount is TBD at claim time - will be calculated after
 * boost expires based on sales during boost period.
 *
 * @param handle - Creator's TikTok handle (with @)
 * @param boostPercent - Boost percentage (e.g., 5 for 5%)
 * @param boostDurationDays - Boost duration in days
 * @param activationDate - Scheduled activation date
 * @param email - Creator's email for contact info
 */
export async function createCommissionBoostScheduledEvent(
  handle: string,
  boostPercent: number,
  boostDurationDays: number,
  activationDate: Date,
  email: string
): Promise<CalendarEventResult> {
  // Calculate key dates
  const expiresAt = new Date(activationDate);
  expiresAt.setDate(expiresAt.getDate() + boostDurationDays);

  const payoutDueDate = new Date(expiresAt);
  payoutDueDate.setDate(payoutDueDate.getDate() + 20); // 20-day clearing period

  const title = `💸 Commission Payout Due: ${handle}`;
  const description = `Creator: ${handle}
Email: ${email}

Boost Details:
- Percent: ${boostPercent}%
- Duration: ${boostDurationDays} days
- Activates: ${activationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
- Expires: ${expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
- Payout Due: ${payoutDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

Payout Amount: TBD (calculated after boost expires)
Payment Info: TBD (user will submit after boost expires)

Action: After user submits payment info, send payout via their selected method`;

  return createCalendarEvent({
    title,
    description,
    dueDateTime: payoutDueDate,
    reminderMinutes: 60, // 1 hour reminder before payout due
  });
}

/**
 * Create commission payout event
 *
 * Note: This helper is for use when all payout details are known
 * (e.g., when admin is ready to send payment). For claim-time
 * calendar creation, use createCommissionBoostScheduledEvent instead.
 */
export async function createCommissionPayoutEvent(
  handle: string,
  payoutAmount: number,
  paymentMethod: string,
  paymentAccount: string,
  boostPercent: number,
  boostDurationDays: number,
  salesDelta: number
): Promise<CalendarEventResult> {
  const title = `💸 Commission Payout: ${handle}`;
  const description = `Creator: ${handle}
Payout Amount: $${payoutAmount.toFixed(2)}
Payment Method: ${paymentMethod}
Payment Account: ${paymentAccount}

Boost Details:
- Percent: ${boostPercent}%
- Duration: ${boostDurationDays} days
- Sales During Boost: $${salesDelta.toFixed(2)}

Action: Send payment via ${paymentMethod}, then record in Admin UI`;

  const dueDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

  return createCalendarEvent({ title, description, dueDateTime });
}

/**
 * Create raffle drawing event
 */
export async function createRaffleDrawingEvent(
  missionName: string,
  prizeName: string,
  participantCount: number,
  drawingDateTime: Date
): Promise<CalendarEventResult> {
  const title = `🎲 Draw Raffle Winner: ${missionName}`;
  const description = `Raffle: ${missionName}
Prize: ${prizeName}
Total Participants: ${participantCount}

Action: Select winner in Admin UI`;

  return createCalendarEvent({
    title,
    description,
    dueDateTime: drawingDateTime,
    reminderMinutes: 15,
  });
}
