/**
 * Alert Service
 *
 * Sends admin alerts for automation failures via Resend.
 *
 * References:
 * - Loyalty.md lines 1987-1994 (Automation Monitoring & Reliability)
 * - EXECUTION_PLAN.md Task 8.2.5
 *
 * Alert Requirements:
 * - Automation failures trigger immediate email alerts to admin
 * - Alert includes error message, likely causes, and action steps
 * - Detection time: <15 minutes from failure
 * - Email service: Resend.com (free tier, 100 emails/day)
 * - Alert scenarios: Selector changes, login failures, network timeouts, Cruva downtime
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Alert types for categorizing failures
 */
export type AlertType =
  | 'CRON_FAILURE'
  | 'CRUVA_LOGIN_FAILURE'
  | 'CRUVA_DOWNLOAD_FAILURE'
  | 'CSV_PARSE_FAILURE'
  | 'DATABASE_ERROR';

/**
 * Parameters for sending an admin alert
 */
export interface AdminAlertParams {
  type: AlertType;
  errorMessage: string;
  details?: string[];
  timestamp: string;
}

/**
 * Result of sending an alert
 */
export interface AlertResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Get likely causes based on alert type
 */
function getLikelyCauses(type: AlertType): string[] {
  switch (type) {
    case 'CRUVA_LOGIN_FAILURE':
      return [
        'CRUVA credentials may have changed',
        'Two-factor authentication may have been enabled',
        'CRUVA website login page UI may have changed',
        'Account may be locked due to failed attempts',
      ];
    case 'CRUVA_DOWNLOAD_FAILURE':
      return [
        'CRUVA website UI may have changed (button selectors)',
        'Network timeout connecting to CRUVA',
        'CRUVA website may be down for maintenance',
        'CSV download link may have changed',
      ];
    case 'CSV_PARSE_FAILURE':
      return [
        'CRUVA CSV format may have changed',
        'CSV file may be corrupted or empty',
        'New columns or removed columns in CSV',
        'Date format changes in CSV data',
      ];
    case 'DATABASE_ERROR':
      return [
        'Database connection timeout',
        'Constraint violation (duplicate data)',
        'Database may be at capacity',
        'RPC function error',
      ];
    case 'CRON_FAILURE':
    default:
      return [
        'Unexpected error in automation workflow',
        'Service dependency failure',
        'Memory or timeout limit exceeded',
      ];
  }
}

/**
 * Get action steps based on alert type
 */
function getActionSteps(type: AlertType): string[] {
  const manualUploadStep = 'Use manual CSV upload at /admin/manual-upload as fallback';

  switch (type) {
    case 'CRUVA_LOGIN_FAILURE':
      return [
        'Verify CRUVA credentials in environment variables',
        'Check if CRUVA requires 2FA now',
        'Test manual login to CRUVA website',
        manualUploadStep,
      ];
    case 'CRUVA_DOWNLOAD_FAILURE':
      return [
        'Check CRUVA website status',
        'Review Puppeteer selectors in cruvaDownloader.ts',
        'Test manual download from CRUVA',
        manualUploadStep,
      ];
    case 'CSV_PARSE_FAILURE':
      return [
        'Download CSV manually and inspect format',
        'Check csvParser.ts for expected columns',
        'Compare with previous successful CSV',
        manualUploadStep,
      ];
    case 'DATABASE_ERROR':
      return [
        'Check Supabase dashboard for connection issues',
        'Review sync_logs table for error details',
        'Check for duplicate video_url entries',
        'Retry automation after fixing data issues',
      ];
    case 'CRON_FAILURE':
    default:
      return [
        'Check Vercel function logs for details',
        'Review sync_logs table for error context',
        manualUploadStep,
        'Contact support if issue persists',
      ];
  }
}

/**
 * Format alert email HTML
 */
function formatAlertEmailHtml(params: AdminAlertParams): string {
  const likelyCauses = getLikelyCauses(params.type);
  const actionSteps = getActionSteps(params.type);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Automation Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px;">
  <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin: 0 0 8px 0;">Automation Failure Alert</h2>
    <p style="color: #7f1d1d; margin: 0;">Daily automation sync failed and requires attention.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h3 style="color: #374151; margin: 0 0 8px 0;">Error Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Type:</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${params.type}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Timestamp:</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${params.timestamp}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Message:</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">${params.errorMessage}</td>
      </tr>
    </table>
  </div>

  ${
    params.details && params.details.length > 0
      ? `
  <div style="margin-bottom: 20px;">
    <h3 style="color: #374151; margin: 0 0 8px 0;">Additional Details</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${params.details.map((d) => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
    </ul>
  </div>
  `
      : ''
  }

  <div style="margin-bottom: 20px;">
    <h3 style="color: #374151; margin: 0 0 8px 0;">Likely Causes</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${likelyCauses.map((c) => `<li style="margin-bottom: 4px;">${c}</li>`).join('')}
    </ul>
  </div>

  <div style="margin-bottom: 20px;">
    <h3 style="color: #374151; margin: 0 0 8px 0;">Recommended Actions</h3>
    <ol style="margin: 0; padding-left: 20px; color: #4b5563;">
      ${actionSteps.map((s) => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
    </ol>
  </div>

  <div style="background: #f3f4f6; border-radius: 8px; padding: 12px; font-size: 14px; color: #6b7280;">
    <strong>Recovery Time Target:</strong> &lt;30 minutes using manual CSV upload fallback.
  </div>
</body>
</html>
`;
}

/**
 * Format alert email plain text
 */
function formatAlertEmailText(params: AdminAlertParams): string {
  const likelyCauses = getLikelyCauses(params.type);
  const actionSteps = getActionSteps(params.type);

  let text = `AUTOMATION FAILURE ALERT\n`;
  text += `========================\n\n`;
  text += `Daily automation sync failed and requires attention.\n\n`;
  text += `ERROR DETAILS\n`;
  text += `-------------\n`;
  text += `Type: ${params.type}\n`;
  text += `Timestamp: ${params.timestamp}\n`;
  text += `Message: ${params.errorMessage}\n`;

  if (params.details && params.details.length > 0) {
    text += `\nADDITIONAL DETAILS\n`;
    text += `------------------\n`;
    params.details.forEach((d) => {
      text += `- ${d}\n`;
    });
  }

  text += `\nLIKELY CAUSES\n`;
  text += `-------------\n`;
  likelyCauses.forEach((c) => {
    text += `- ${c}\n`;
  });

  text += `\nRECOMMENDED ACTIONS\n`;
  text += `-------------------\n`;
  actionSteps.forEach((s, i) => {
    text += `${i + 1}. ${s}\n`;
  });

  text += `\nRecovery Time Target: <30 minutes using manual CSV upload fallback.\n`;

  return text;
}

/**
 * Send admin alert email
 *
 * Sends failure notification to admin via Resend.
 * Fails silently if ADMIN_ALERT_EMAIL is not configured.
 *
 * @param params - Alert parameters
 * @returns AlertResult with success status
 */
export async function sendAdminAlert(params: AdminAlertParams): Promise<AlertResult> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;

  // If admin email not configured, log and return (don't block cron)
  if (!adminEmail) {
    console.warn('[AlertService] ADMIN_ALERT_EMAIL not configured - skipping alert');
    return {
      success: false,
      error: 'ADMIN_ALERT_EMAIL not configured',
    };
  }

  // If Resend API key not configured, log and return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[AlertService] RESEND_API_KEY not configured - skipping alert');
    return {
      success: false,
      error: 'RESEND_API_KEY not configured',
    };
  }

  try {
    console.log(`[AlertService] Sending ${params.type} alert to ${adminEmail}`);

    const { data, error } = await resend.emails.send({
      from: 'Rumi Alerts <onboarding@resend.dev>', // Use Resend test domain
      to: adminEmail,
      subject: `[ALERT] Automation Failure: ${params.type}`,
      html: formatAlertEmailHtml(params),
      text: formatAlertEmailText(params),
    });

    if (error) {
      console.error('[AlertService] Failed to send alert:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(`[AlertService] Alert sent successfully: ${data?.id}`);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AlertService] Unexpected error sending alert:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Determine alert type from error context
 */
export function determineAlertType(errorCode?: string, errorMessage?: string): AlertType {
  if (!errorCode && !errorMessage) {
    return 'CRON_FAILURE';
  }

  const code = errorCode?.toLowerCase() ?? '';
  const message = errorMessage?.toLowerCase() ?? '';

  if (code.includes('login') || message.includes('login') || message.includes('authentication')) {
    return 'CRUVA_LOGIN_FAILURE';
  }

  if (code.includes('download') || message.includes('download') || message.includes('cruva')) {
    return 'CRUVA_DOWNLOAD_FAILURE';
  }

  if (code.includes('parse') || message.includes('parse') || message.includes('csv')) {
    return 'CSV_PARSE_FAILURE';
  }

  if (
    code.includes('database') ||
    code.includes('db') ||
    message.includes('database') ||
    message.includes('supabase') ||
    message.includes('constraint')
  ) {
    return 'DATABASE_ERROR';
  }

  return 'CRON_FAILURE';
}
