# 10/31

## Auth flows
### Signup flow (signup/page.tsx)

#### Issue 1: Handle check condition to go to this page
  Security Question: Backend Validation?

  YES - Backend validation is CRITICAL

  Here's why and how:

  Flow Should Be:

  1. User enters @username on /login/start
     ↓
  2. Frontend sends to backend: POST /api/auth/check-handle
     Request: { tiktok_handle: "@username" }
     ↓
  3. Backend checks database:
     - Does this handle exist in our users table?
     - Is it associated with current client?
     ↓
  4A. If EXISTS → Backend returns: { exists: true, is_new: false }
      Frontend redirects to: /login (password entry page)

  4B. If NOT EXISTS → Backend returns: { exists: false, is_new: true }
      Frontend redirects to: /login/signup (password creation page)

#### Issue 2: Dynamic content for Terms and Privacy Policy

#### Decision Server-Side Rendering

  Choice: Server-Side Rendering (SSR) for /login/signup page

  Reason: Eliminates loading spinner, handle appears instantly on page load
  (~100ms faster), better UX with no content flash.

  Implementation:
  - Next.js async component fetches session server-side before rendering
  - Session cookie read via cookies() from next/headers
  - Handle populated in HTML before client receives page
  - No useState, useEffect, or loading states needed

  Trade-off: Slightly more complex (async components) but cleaner UX and less
  client-side code.

 
### OTP Flow (otp.tsx)


#### Explanation
 Backend Requirements Summary

  Choice: Client-side OTP verification with session-based email/client data

  Reason: OTP input requires real-time interactivity (auto-focus, countdown timer, instant feedback), making client-side rendering necessary. Session data (email, client name) fetched once on mount.

  Implementation:

  1. Session Management

  - When user signs up on /login/signup, backend creates session with:
  {
    "session_id": "xyz123",
    "tiktok_handle": "@creatorpro",
    "email": "creator@example.com",
    "client_id": "abc",
    "otp_sent_at": "2024-01-15T12:00:00Z"
  }
  - Store in Redis/database, set HttpOnly cookie

  2. API Endpoints Needed

  GET /api/auth/session

  - Reads session cookie
  - Returns: { email: string, client_name: string }
  - Used to populate dynamic text on page load

  POST /api/auth/verify-otp

  Request: { otp: "123456" } // session_id from cookie
  Response: {
    verified: true/false,
    error?: "Invalid or expired code",
    session_token?: "jwt_token"
  }
  - Validates OTP against stored code in session/database
  - Expires after 10 minutes or 3 failed attempts
  - On success: marks user as verified, returns auth token

  POST /api/auth/resend-otp

  Request: {} // session_id from cookie
  Response: { sent: true }
  - Generates new 6-digit OTP
  - Sends email via SendGrid/AWS SES
  - Updates otp_sent_at timestamp
  - Rate limit: max 3 resends per 30 minutes

  3. Database Schema

  -- Add to sessions table:
  ALTER TABLE sessions ADD COLUMN email TEXT;
  ALTER TABLE sessions ADD COLUMN otp_code TEXT;
  ALTER TABLE sessions ADD COLUMN otp_sent_at TIMESTAMP;
  ALTER TABLE sessions ADD COLUMN otp_attempts INTEGER DEFAULT 0;

  -- Index for faster lookups:
  CREATE INDEX idx_sessions_otp ON sessions(session_id, otp_code);

  4. Security Considerations

  - OTP expires after 10 minutes
  - Max 3 verification attempts per code
  - Max 3 resend requests per 30 minutes (rate limiting)
  - Hash OTP before storing (bcrypt/argon2)
  - Clear OTP from session after successful verification

  Trade-off: Client-side rendering means page needs initial data fetch (~50-100ms), but necessary for interactive OTP input behavior. Auto-submit with 1-second delay provides smooth UX while giving user moment to review input.

### Security Review
Do we have any open endpoints in frontend that we should worry about ?

## Misc

### Mission logic
```WIP: If a VIP level has possibility of multiple Sales missions, the new one cannot appear till the old one is completed```
```1. Will they have usedCount, MaxRedemptions visible?```

### Raffle Mission Time 
Different logic than checkpoint, logic is vs admin set expiry

### Rewards Claiming **
Gift Drop
- If its clothes, then you either:
    - Automate size selection
    - Manually do it

### Modifiable colors in Home Screen
Depending on color palette for Bronze, Silver, Gold, Platinum 

### Logo upload 
1. ~~Comes back for log in page~~
2. ~~Logo Dimension in screen~~

### Follower Discount date programming modal window **
Need to design this 

## Home Page Dynamic **
Once sales of Gift Card mission are completed,
- Text "Next: $30 Gift Card" must be dynamic and have a CLAIM button.


## LEGAL

### Point 1
- Accept that there will be rankings where their performance is displayed to other creators

### Point 2 - Rewards & Missions

#### VIP Level Missions
If they are bronze and have a 1,000 views mission. They dont complete it but go on to Silver, they wont be able to participate of that mission anymore


#### Expiry
- Rewards per VIP level. If they are not used within expiry, they won't be able to be used.


#### Conditions
##### Spark Ads Boost
We will decide which video to invest the benefit and when. 

##### Tik Tok Commission Boost
It is active when they claim it for the duration stipulated

### POINT 3
Welcome gifts per VIP level (Gifts, experiences, gift cards) are ONLY when you get to that level. Demotion and continued upgrade back to the level is not included

