# Google Calendar Integration Setup

This guide explains how to set up Google Calendar integration for admin task reminders.

## Purpose

The Google Calendar integration creates automatic calendar events when admin action is needed:
- Reward fulfillment (gift cards, spark ads, experiences)
- Physical gift shipping
- Discount activation (scheduled)
- Commission boost payouts
- Raffle drawings

## Prerequisites

- Google Cloud Platform account
- Access to create service accounts
- Admin calendar to receive events

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable the Google Calendar API

1. Go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### 3. Create a Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Fill in:
   - Name: `loyalty-calendar-bot`
   - Description: `Service account for Loyalty Platform calendar events`
4. Click **Create and Continue**
5. Skip the optional permissions step
6. Click **Done**

### 4. Generate a Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Select **JSON** format
5. Click **Create**
6. Save the downloaded JSON file securely

### 5. Share Calendar with Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want events created on (e.g., admin calendar)
3. Click the three dots next to the calendar name
4. Select **Settings and sharing**
5. Under "Share with specific people or groups", click **Add people and groups**
6. Enter the service account email (format: `loyalty-calendar-bot@YOUR_PROJECT.iam.gserviceaccount.com`)
7. Set permission to **Make changes to events**
8. Click **Send**

### 6. Get the Calendar ID

1. In Calendar settings, scroll to **Integrate calendar**
2. Copy the **Calendar ID**
   - For primary calendar: `your-email@gmail.com`
   - For shared calendar: `abc123@group.calendar.google.com`

### 7. Configure Environment Variables

Add to your `.env.local`:

```bash
# Option 1: Raw JSON (escape newlines or put on one line)
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}

# Option 2: Base64 encoded (recommended for complex JSON)
# Run: cat credentials.json | base64 -w 0
GOOGLE_CALENDAR_CREDENTIALS=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Ii...

# Calendar ID from step 6
GOOGLE_CALENDAR_ID=admin@company.com
```

## Testing

To verify the integration is working:

```typescript
import { createCalendarEvent } from '@/lib/utils/googleCalendar';

const result = await createCalendarEvent({
  title: 'Test Event',
  description: 'Testing calendar integration',
  dueDateTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
});

console.log(result);
// { success: true, eventId: 'abc123' }
```

## Troubleshooting

### "Calendar not configured"
- Check that both `GOOGLE_CALENDAR_CREDENTIALS` and `GOOGLE_CALENDAR_ID` are set
- Restart the server after adding environment variables

### "Invalid credentials"
- Verify the JSON is valid
- If using base64, ensure proper encoding: `cat credentials.json | base64 -w 0`
- Check the service account has not been deleted

### "Access denied" or "Not found"
- Ensure the service account email has been added to the calendar
- Verify the permission is "Make changes to events"
- Double-check the Calendar ID is correct

### Events not appearing
- Check the correct calendar is selected in Google Calendar
- Verify the service account has write access
- Look for errors in the server console

## Security Notes

- **Never commit credentials to git** - `.env.local` should be in `.gitignore`
- Service account keys should be rotated periodically
- Use minimum required permissions (calendar write only)
- Consider using Google Cloud Secret Manager for production

## Event Types Created

| Event | Title Format | Due Time |
|-------|--------------|----------|
| Instant Reward | `🎁 Fulfill {type}: @{handle}` | claimed_at + 2 hours |
| Physical Gift | `📦 Ship Physical Gift: @{handle}` | claimed_at + 2 hours |
| Discount | `🔔 Activate Discount: @{handle}` | scheduled_activation_date |
| Commission Payout | `💸 Commission Payout: @{handle}` | NOW + 2 hours |
| Raffle Drawing | `🎲 Draw Raffle Winner: {name}` | raffle_end_date at 12 PM |

## Reference

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/quickstart/nodejs)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- Source: `Loyalty.md` lines 1690-1793 (Google Calendar Integration)
