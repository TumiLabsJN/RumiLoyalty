/**
 * Notification Service
 *
 * Sends transactional emails to users via Resend.
 * Separate from alertService.ts which handles admin alerts.
 *
 * References:
 * - EXECUTION_PLAN.md Task 8.3.3 (tier change notifications)
 * - SchemaFinalv2.md lines 112, 118, 130, 138-139, 143, 146, 263
 */

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server-client';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// Types
// ============================================

export type TierChangeType = 'promotion' | 'demotion';

export interface TierChangeNotificationParams {
  userId: string;
  fromTier: string;      // tier_id (e.g., 'tier_1')
  toTier: string;        // tier_id (e.g., 'tier_2')
  changeType: TierChangeType;
  totalValue: number;    // total_sales or total_units
  periodStartDate?: string;  // For demotions: tier_achieved_at
  periodEndDate?: string;    // For demotions: next_checkpoint_at
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;     // True if user has no email
}

interface UserNotificationData {
  email: string | null;
  tiktokHandle: string;
  nextTierThreshold: number | null;
  nextTierThresholdUnits: number | null;
}

interface TierNameData {
  tierName: string;
}

interface ClientNotificationData {
  name: string;
  vipMetric: 'sales' | 'units';
}

// ============================================
// Main Function
// ============================================

/**
 * Send tier change notification email to user
 *
 * Per EXECUTION_PLAN.md Task 8.3.3:
 * - Promotion: Congratulations message
 * - Demotion: Encouragement message
 *
 * Data sources (SchemaFinalv2.md):
 * - users: tiktok_handle (130), email (131), total_sales/total_units (143),
 *          next_tier_threshold/next_tier_threshold_units (146)
 * - tiers: tier_name (263)
 * - clients: name (112), vip_metric (118)
 *
 * @param clientId - Client ID for multi-tenant isolation
 * @param params - Notification parameters
 * @returns NotificationResult with success/failure details
 */
export async function sendTierChangeNotification(
  clientId: string,
  params: TierChangeNotificationParams
): Promise<NotificationResult> {
  const { userId, fromTier, toTier, changeType, totalValue, periodStartDate, periodEndDate } = params;

  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('[NotificationService] RESEND_API_KEY not configured - skipping notification');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
      skipped: true,
    };
  }

  try {
    const supabase = await createClient();

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, tiktok_handle, next_tier_threshold, next_tier_threshold_units')
      .eq('id', userId)
      .eq('client_id', clientId)
      .single();

    if (userError || !userData) {
      throw new Error(`Failed to fetch user data: ${userError?.message ?? 'User not found'}`);
    }

    const user: UserNotificationData = {
      email: userData.email,
      tiktokHandle: userData.tiktok_handle,
      nextTierThreshold: userData.next_tier_threshold,
      nextTierThresholdUnits: userData.next_tier_threshold_units,
    };

    // Skip if user has no email
    if (!user.email) {
      console.log(`[NotificationService] User ${userId} has no email - skipping notification`);
      return {
        success: true,
        skipped: true,
      };
    }

    // Fetch tier names (old and new)
    const { data: tiersData, error: tiersError } = await supabase
      .from('tiers')
      .select('tier_id, tier_name')
      .eq('client_id', clientId)
      .in('tier_id', [fromTier, toTier]);

    if (tiersError || !tiersData || tiersData.length < 2) {
      throw new Error(`Failed to fetch tier names: ${tiersError?.message ?? 'Tiers not found'}`);
    }

    const oldTierData = tiersData.find(t => t.tier_id === fromTier);
    const newTierData = tiersData.find(t => t.tier_id === toTier);

    if (!oldTierData || !newTierData) {
      throw new Error(`Tier data incomplete: fromTier=${fromTier}, toTier=${toTier}`);
    }

    const oldTierName: string = oldTierData.tier_name;
    const newTierName: string = newTierData.tier_name;

    // Fetch client data
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, vip_metric')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      throw new Error(`Failed to fetch client data: ${clientError?.message ?? 'Client not found'}`);
    }

    const client: ClientNotificationData = {
      name: clientData.name,
      vipMetric: clientData.vip_metric === 'units' ? 'units' : 'sales',
    };

    // Build email content
    const { subject, html, text } = changeType === 'promotion'
      ? buildPromotionEmail(user, oldTierName, newTierName, totalValue, client)
      : buildDemotionEmail(user, oldTierName, newTierName, totalValue, client, periodStartDate, periodEndDate);

    // Send email via Resend
    console.log(`[NotificationService] Sending ${changeType} notification to ${user.email}`);

    const { data, error } = await resend.emails.send({
      from: `${client.name} <onboarding@resend.dev>`,
      to: user.email,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('[NotificationService] Failed to send email:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[NotificationService] Email sent successfully: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[NotificationService] Error sending notification: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// Email Builders
// ============================================

/**
 * Build promotion email content
 */
function buildPromotionEmail(
  user: UserNotificationData,
  oldTierName: string,
  newTierName: string,
  totalValue: number,
  client: ClientNotificationData
): { subject: string; html: string; text: string } {
  const metricLabel = client.vipMetric === 'units' ? 'units' : 'sales';
  const valueFormatted = client.vipMetric === 'sales'
    ? `$${totalValue.toLocaleString()}`
    : totalValue.toLocaleString();

  const subject = `🎉 You've been promoted to ${newTierName}!`;

  const text = `Hi ${user.tiktokHandle},

Great news! Your performance has earned you a promotion.

Your Progress:
• Previous Tier: ${oldTierName}
• New Tier: ${newTierName}
• Achievement: ${valueFormatted} ${metricLabel}

What's New:
• Access to ${newTierName} exclusive rewards
• Higher commission rate
• New missions unlocked

Keep up the amazing work!

— The ${client.name} Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #10b981;">🎉 Congratulations!</h1>

  <p>Hi <strong>${user.tiktokHandle}</strong>,</p>

  <p>Great news! Your performance has earned you a promotion.</p>

  <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #166534;">📈 Your Progress</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="padding: 4px 0;">• Previous Tier: <strong>${oldTierName}</strong></li>
      <li style="padding: 4px 0;">• New Tier: <strong style="color: #10b981;">${newTierName}</strong></li>
      <li style="padding: 4px 0;">• Achievement: <strong>${valueFormatted}</strong> ${metricLabel}</li>
    </ul>
  </div>

  <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #854d0e;">🎁 What's New</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="padding: 4px 0;">• Access to ${newTierName} exclusive rewards</li>
      <li style="padding: 4px 0;">• Higher commission rate</li>
      <li style="padding: 4px 0;">• New missions unlocked</li>
    </ul>
  </div>

  <p>Keep up the amazing work!</p>

  <p style="color: #666; margin-top: 30px;">— The ${client.name} Team</p>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Build demotion email content
 */
function buildDemotionEmail(
  user: UserNotificationData,
  oldTierName: string,
  newTierName: string,
  totalValue: number,
  client: ClientNotificationData,
  periodStartDate?: string,
  periodEndDate?: string
): { subject: string; html: string; text: string } {
  const metricLabel = client.vipMetric === 'units' ? 'units' : 'sales';

  // Get threshold for regaining old tier
  const nextThreshold = client.vipMetric === 'units'
    ? user.nextTierThresholdUnits
    : user.nextTierThreshold;
  const thresholdFormatted = nextThreshold
    ? (client.vipMetric === 'sales' ? `$${nextThreshold.toLocaleString()}` : nextThreshold.toLocaleString())
    : 'the required amount';

  // Format dates
  const startFormatted = periodStartDate
    ? new Date(periodStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  const endFormatted = periodEndDate
    ? new Date(periodEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';

  const subject = `Important: Your tier status has changed`;

  const text = `Hi ${user.tiktokHandle},

Your tier status has been updated based on your recent checkpoint evaluation.

Your Status:
• Previous Tier: ${oldTierName}
• Current Tier: ${newTierName}
• Checkpoint Period: ${startFormatted} - ${endFormatted}

How to Level Up:
• Continue making sales
• Reach ${thresholdFormatted} ${metricLabel} to regain ${oldTierName}
• Complete missions for bonus rewards

We believe in you — let's get back on track!

— The ${client.name} Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #6366f1;">Important Update</h1>

  <p>Hi <strong>${user.tiktokHandle}</strong>,</p>

  <p>Your tier status has been updated based on your recent checkpoint evaluation.</p>

  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #475569;">📊 Your Status</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="padding: 4px 0;">• Previous Tier: <strong>${oldTierName}</strong></li>
      <li style="padding: 4px 0;">• Current Tier: <strong>${newTierName}</strong></li>
      <li style="padding: 4px 0;">• Checkpoint Period: ${startFormatted} - ${endFormatted}</li>
    </ul>
  </div>

  <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e40af;">💪 How to Level Up</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="padding: 4px 0;">• Continue making sales</li>
      <li style="padding: 4px 0;">• Reach <strong>${thresholdFormatted}</strong> ${metricLabel} to regain ${oldTierName}</li>
      <li style="padding: 4px 0;">• Complete missions for bonus rewards</li>
    </ul>
  </div>

  <p>We believe in you — let's get back on track!</p>

  <p style="color: #666; margin-top: 30px;">— The ${client.name} Team</p>
</body>
</html>`;

  return { subject, html, text };
}
