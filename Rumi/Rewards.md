# REWARDS SYSTEM - TECHNICAL SPECIFICATION

**Platform:** Rumi Loyalty Platform
**Audience:** LLMs (Future AI Assistants)
**Purpose:** Complete reference for rewards mechanics and configuration
**Version:** Tier-Based Auto-Replace System (Final)

---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Reward Types](#2-reward-types)
3. [Creator UI Elements](#3-creator-ui-elements)
4. [Admin Configuration](#4-admin-configuration)
5. [Redemption Flow](#5-redemption-flow)
6. [Redemption Limits & Frequency](#6-redemption-limits--frequency)
7. [Tier Targeting & Auto-Replace](#7-tier-targeting--auto-replace)
8. [Redemption Status Flow](#8-redemption-status-flow)
9. [Database Schema](#9-database-schema)
10. [Edge Cases](#10-edge-cases)
11. [Example Scenarios](#11-example-scenarios)
12. [Critical Rules](#12-critical-rules)

---

## 1. OVERVIEW

### 1.1 What Are Rewards?

**Rewards**  are always-available perks that creators can claim based on their current tier, subject to redemption limits.

**Key Characteristics:**
- **Always available** - No task completion required (unlike missions)
- **Tier-based** - Each tier gets its own set of rewards
- **Auto-replace** - Rewards change automatically when tier changes
- **Redemption limits** - Claimable 1-10 times per period (monthly/weekly/one-time)
- **No progress tracking** - Instant claim (no progress bar)

### 1.2 Rewards vs Missions

| Aspect | Rewards | Missions |
|--------|-------------------|----------|
| **Access** | Always available (tier-based) | Complete task to unlock |
| **Frequency** | Multiple simultaneously | ONE per type at a time |
| **Availability** | Based on `tier_eligibility` | Based on `tier_eligibility` + `display_order` |
| **Progress** | None (instant claim) | Tracked daily (sales, views, etc.) |
| **Limits** | `redemption_quantity` (1-10 per period) | One completion per checkpoint |
| **Reset** | Calendar period (monthly/weekly) | Checkpoint period (missions reset) |
| **Tier Change** | Auto-replace (old tier rewards disappear) | Persist (continue until fulfillment) |

### 1.3 System Architecture

```
rewards table (templates)
    ↓ Creator claims
redemptions table (tracking)
    ↓ Admin fulfills
Done (no unlock trigger)
```

**2 Tables:**
1. `rewards` - Admin-configured reward templates
2. `redemptions` - Individual creator redemption tracking (shared with missions)

---

## 2. REWARD TYPES

### 2.1 Category 1: Auto-Generated Names (Structured Data)

These rewards use JSONB `value_data` field for structured values. Names are auto-generated from type + value.

| Reward Type | Commercial Name | Auto-Generated Format | Example |
|--------------|----------------|----------------------|---------|
| **gift_card** | Gift Card | "Gift Card: $X" | "Gift Card: $50" |
| **commission_boost** | Pay Boost | "Pay Boost: X%" | "Pay Boost: 5%" |
| **spark_ads** | Reach Boost | "Reach Boost: $X" | "Reach Boost: $100" |
| **discount** | Deal Boost | "Deal Boost: X%" | "Deal Boost: 10%" |

**Naming Convention (Auto-Generated):**
- `gift_card` → "Gift Card: $X" (e.g., "Gift Card: $50")
- `commission_boost` → "Pay Boost: X%" (e.g., "Pay Boost: 5%")
- `spark_ads` → "Reach Boost: $X" (e.g., "Reach Boost: $100")
- `discount` → "Deal Boost: X%" (e.g., "Deal Boost: 10%")

**Why Auto-Generated?**
- Consistency across platform
- Easy to understand for creators
- Admin sets value, system generates display name

### 2.2 Category 2: Custom Names (Freeform Text)

These rewards use `description` TEXT field for custom naming.

| Reward Type | Name Storage | Example Name | Example Description |
|--------------|--------------|--------------|---------------------|
| **physical_gift** | `name` field | "Gift Drop: Headphones" | "Headphones" (15 chars) |
| **experience** | `name` field | "Mystery Trip: VIP Event" | "VIP Event" (15 chars) |

**Naming Convention:**
- `physical_gift` → "Gift Drop: {description}"
- `experience` → "Mystery Trip: {description}"

**Why Custom Names?**
- Physical gifts vary widely (headphones, apparel, tech)
- Experiences are unique (events, trips, exclusive access)
- Admin provides description, system adds prefix

### 2.3 Redemption Type (Instant vs Scheduled)

| Reward Type | Redemption Type | When Fulfilled |
|--------------|-----------------|----------------|
| **gift_card** | Instant | Immediately after claim |
| **spark_ads** | Instant | Immediately after claim |
| **physical_gift** | Instant | Immediately after claim (admin ships) |
| **experience** | Instant | Immediately after claim (admin coordinates) |
| **discount** | **Scheduled** | Creator picks activation date/time |
| **commission_boost** | **Scheduled**  | Immediately after claim |

**Key Difference:**
- **Instant:** Creator clicks "Claim" → Enters fulfillment queue immediately
- **Scheduled:** Creator clicks "Claim" → Picks activation date → Enters fulfillment queue

**Only `discount` and `commission_boost` uses scheduled redemption**

### 2.4 Value Data Structure (JSONB)

**Category 1 Rewards (Structured):**

```json
// gift_card
{
  "amount": 50  // Dollar amount
}

// commission_boost
{
  "percent": 5,           // Percentage increase
  "duration_days": 30     // How long boost lasts
}

// spark_ads
{
  "amount": 100  // Advertising budget in dollars
}

// discount
{
  "percent": 10,                // Discount percentage (1-100)
  "duration_minutes": 1440,     // Duration in minutes (10 min to 365 days = 525,600 max)
  "max_uses": 100,              // Total redemptions allowed on TikTok (NULL = unlimited)
  "coupon_code": "GOLD10"       // Coupon code (2-8 chars, A-Z 0-9 only)
}
```

**Category 2 Rewards (Freeform):**
```
// physical_gift
description = "Headphones" // Max 15 chars (VARCHAR(15))
requires_size = true        // Optional: Set to true for clothing/shoes that need size selection

// experience
description = "VIP Event" // Max 15 chars (VARCHAR(15))
```

---

## 3. ADMIN CONFIGURATION

### 3.1 Creating a Reward

**Admin Workflow:**

**Step 1: Reward Type**
- Select: Gift Card, Commission Boost, Spark Ads, Discount, Physical Gift, or Experience
- (Determines name generation and value storage)

**Step 2: Value Configuration**

**If Category 1 (gift_card, commission_boost, spark_ads, discount):**
- **Gift Card:** Enter dollar amount (e.g., 50 = $50)
- **Commission Boost:** Enter percent (e.g., 5 = 5%) + duration days (e.g., 30)
- **Spark Ads:** Enter dollar amount (e.g., 100 = $100)
- **Discount:** Enter percent (e.g., 10 = 10%)

**If Category 2 (physical_gift, experience):**
- Enter custom description (e.g., "Headphones", max 15 chars)
- System auto-generates name with prefix

**Step 3: Tier Targeting**
- Select which tier can claim this reward
- Options: tier_1 (Bronze), tier_2 (Silver), tier_3 (Gold), tier_4 (Platinum), tier_5, tier_6
- **Exact match** (not cumulative) - Only that tier sees it

**Step 4: Redemption Limits**
- **Frequency:** one-time, monthly, weekly, unlimited
- **Quantity:** 1-10 (how many times per period)
- Examples:
  - `{quantity: 2, frequency: 'monthly'}` = 2 per month
  - `{quantity: 1, frequency: 'one-time'}` = once (forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
  - `{quantity: NULL, frequency: 'unlimited'}` = unlimited

**Step 5 (Optional): Preview Visibility**
- Set `preview_from_tier` to show locked reward to lower tiers
- NULL = only eligible tier sees it
- tier_1 = Bronze+ can preview (locked if below tier_eligibility)
- Use case: Motivate tier upgrades

**Step 6: Enable**
- Toggle enabled/disabled
- Disabled rewards hidden from creators

### 3.2 Modifiable Fields Summary

| Field | Required | Type | Purpose |
|-------|----------|------|---------|
| type | Yes | Dropdown | gift_card, commission_boost, spark_ads, discount, physical_gift, experience |
| value_data | Category 1 only | JSONB | {"amount": 50}, {"percent": 5, "duration_days": 30} |
| description | Category 2 only | VARCHAR(15) | "Headphones", "VIP Event" (max 15 chars) |
| name | Auto-generated | String | System generates from type + value |
| tier_eligibility | Yes | Dropdown | tier_1, tier_2, tier_3, tier_4, tier_5, tier_6 |
| redemption_frequency | Yes | Dropdown | one-time, monthly, weekly, unlimited |
| redemption_quantity | Yes | Integer | 1-10 (NULL for unlimited) |
| redemption_type | Auto-assigned | String | instant or scheduled (hardcoded per type) |
| expires_days | No | Integer | Days until expiration (NULL = never) |
| preview_from_tier | No | Dropdown | NULL, tier_1, tier_2, tier_3, tier_4, tier_5, tier_6 |
| enabled | Yes | Boolean | Toggle on/off |
| display_order | No | Integer | Admin UI sorting |
| created_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |

### 3.3 Editing & Disabling Rewards

**Editing:**
- Admin can edit any field before creators claim
- After claims exist, avoid changing `value_data` or `redemption_quantity` (may confuse creators)
- Safe to edit: `enabled`, `display_order`, `preview_from_tier`

**Disabling:**
- Set `enabled = false`
- Reward disappears from creator UI immediately
- Pending redemptions still process normally
- Use case: Remove seasonal/promotional rewards

**Deleting:**
- Not recommended if any creator has pending redemptions
- Consider disabling instead

---

## 4. REDEMPTION FLOW

### 4.1 Instant Redemption (`gift_card`, `spark_ads`, `physical_gift`, `experience`)

**Flow:**

**Step 1: Creator Browses Rewards**
- Navigate to Rewards tab
- System displays eligible rewards filtered by:
  - Exact tier match (`tier_eligibility = current_tier`)
  - Redemption limits not exceeded
  - Claim history

**Step 2: Creator Clicks "Claim"**
- Button available on eligible instant-type rewards
- System validates eligibility:
  - Current tier equals `tier_eligibility` (exact match)
  - Monthly/weekly limit not exceeded
  - One-time limit not exceeded (reward-type-specific: forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
  - No duplicate pending claim for same reward

**Step 3: Create Redemption Record**
- Insert to `redemptions` table:
  ```sql
  INSERT INTO redemptions (
    user_id = creator_id,
    reward_id = reward_id,
    status = 'claimed',           -- 5-state lifecycle: claimable → claimed → fulfilled → concluded | rejected
    tier_at_claim = current_tier,
    claimed_at = NOW(),
    client_id = current_client_id
  )
  ```

**Step 3a: Physical Gift - Additional Info Collection (If Required)**
- **For physical gifts with `requires_size = true` (clothing/shoes):**
  - Size selection modal appears
  - Creator selects size (S, M, L, XL, or shoe size)
  - Shipping address modal appears
  - Creator enters shipping details
  - System creates sub-state record:
    ```sql
    INSERT INTO physical_gift_redemptions (
      redemption_id = redemption_id,
      reward_id = reward_id,
      user_id = creator_id,
      requires_size = true,
      size_category = 'clothing',
      size_value = 'L',
      size_submitted_at = NOW(),
      shipping_address_line1 = '123 Main St',
      shipping_city = 'New York',
      shipping_state = 'NY',
      shipping_postal_code = '10001',
      shipping_country = 'USA',
      shipping_phone = '+1234567890',
      shipping_info_submitted_at = NOW(),
      client_id = current_client_id
    )
    ```
- **For other physical gifts (non-clothing):**
  - Only shipping address modal appears
  - No size selection required

**Step 4: UI Feedback**
- Success message: "Reward claimed! You'll receive it soon."
- Reward card shows "Claimed" badge
- Limit counter updates: "1 of 2 used this month"

**Step 5: Admin Fulfillment**
- Redemption appears in Admin Fulfillment Queue
- Admin completes task (purchase gift card, ship physical item, etc.)
- Admin marks as fulfilled:
  ```sql
  UPDATE redemptions SET
    status = 'fulfilled',
    fulfilled_at = NOW(),
    fulfilled_by = admin_id,
    fulfillment_notes = 'Gift card code: ABCD-EFGH-IJKL'
  WHERE id = redemption_id
  ```
- Creator receives notification

**Step 6: Delivery Confirmation (Optional)**
- For physical gifts: Admin marks as concluded when delivery confirmed
  ```sql
  UPDATE redemptions SET
    status = 'concluded',
    concluded_at = NOW()
  WHERE id = redemption_id
  ```
- For digital rewards (gift_card, spark_ads): Auto-transition to `concluded` when fulfilled

### 4.2 Scheduled Redemption - Discount (Simple Flow)

**Flow:**

**Step 1: Creator Browses Rewards**
- Navigate to Rewards tab
- Sees discount reward with "Schedule" button

**Step 2: Creator Clicks "Schedule"**
- Modal appears with date/time picker
- Creator selects activation date (up to 7 days ahead, weekdays only)
- Creator selects time slot (9:00 AM - 4:00 PM EST, weekdays only)
- Time picker shows: "Times shown in Eastern Time (EST/EDT)"
- **Note:** Discount scheduling is different from Commission Boost (which activates at 6:00 PM EST daily)

**Step 3: Create Redemption Record**
- Insert to `redemptions` table:
  ```sql
  INSERT INTO redemptions (
    user_id = creator_id,
    reward_id = reward_id,
    status = 'claimed',                           -- 5-state lifecycle: claimable → claimed → fulfilled → concluded | rejected
    tier_at_claim = current_tier,
    scheduled_activation_date = '2025-01-12',     -- Date only
    scheduled_activation_time = '14:00:00',       -- Time in EST (9 AM - 4 PM EST slots)
    claimed_at = NOW(),
    client_id = current_client_id
  )
  ```

**Step 4: Google Calendar Event**
- System creates Google Calendar event for admin
- Event time: 30 minutes before activation (scheduled_time - 30 minutes)
- Reminder: "Activate discount for [creator_handle]"
- Event ID stored in `google_calendar_event_id`

**Step 5: UI Feedback**
- Success message: "Success! Your discount will be activated on Jan 12 at 2:00 PM EST"
- Reward card shows scheduled date
- Limit counter updates

**Step 6: Admin Fulfillment (At Scheduled Time)**
- Google Calendar reminder fires 30 minutes before scheduled time
- At scheduled time (e.g., 2:00 PM EST), admin activates discount in TikTok Seller Center
- Admin marks as concluded:
  ```sql
  UPDATE redemptions SET
    status = 'concluded',
    fulfilled_at = NOW(),
    concluded_at = NOW(),
    fulfilled_by = admin_id,
    fulfillment_notes = '10% discount activated in TikTok Shop at 2:00 PM EST'
  WHERE id = redemption_id
  ```
- Creator receives notification

**Step 7: Discount Expires**
- After discount period ends (configured duration in TikTok Shop)
- Discount automatically expires in TikTok system
- No further status update needed (already in `concluded` state)

---

### 4.3 Scheduled Redemption - Commission Boost (Complex Sub-State Flow)

**Commission Boost uses a sub-state schema with 6 detailed states in `commission_boost_redemptions` table.**

**Flow:**

**Step 1: Creator Browses Rewards**
- Navigate to Rewards tab | or on Home tab if its the active mission.
    - Completes mission, schedules reward
- Sees commission boost reward with "Schedule" button

**Step 2: Creator Clicks "Schedule"**
- Modal appears with date picker
- Creator selects activation date (1-7 days ahead)
- Time is fixed: 6:00 PM EST (aligned with daily scraping)

**Step 3: Create Redemption + Commission Boost Sub-State Record**
- Insert to `redemptions` table:
  ```sql
  INSERT INTO redemptions (
    user_id = creator_id,
    reward_id = reward_id,
    status = 'claimed',                           -- High-level status: claimed
    tier_at_claim = current_tier,
    scheduled_activation_date = '2025-01-15',
    claimed_at = NOW(),
    client_id = current_client_id
  )
  ```
- Insert to `commission_boost_redemptions` sub-state table:
  ```sql
  INSERT INTO commission_boost_redemptions (
    redemption_id = redemption_id,
    boost_status = 'scheduled',                   -- Sub-state: scheduled
    scheduled_activation_date = '2025-01-15',
    duration_days = 30,                           -- From reward config
    boost_commission_rate = 5.0,                  -- Locked at claim time
    tier_commission_rate = 10.0,                  -- Locked at claim time (for display)
    client_id = current_client_id
  )
  ```

**Step 4: UI Feedback**
- Success message: "Success! Your boost will activate on Jan 15 at 6:00 PM EST"
- Reward card shows: "Boost scheduled for Jan 15"
- Limit counter updates

**Step 5: Cron Activates Boost (Jan 15, 6:00 PM EST)**
- Daily cron runs after scraping completes (3 PM EST scraping → 6 PM EST activation)
- System captures baseline sales (D0):
  ```sql
  UPDATE commission_boost_redemptions SET
    boost_status = 'active',
    activated_at = NOW(),
    expires_at = NOW() + (duration_days || ' days')::INTERVAL,
    sales_at_activation = :current_gmv_from_cruda
  WHERE scheduled_activation_date = CURRENT_DATE
    AND boost_status = 'scheduled'
  ```
- **Redemption status unchanged:** Still `'claimed'`
- **Boost status updated:** `'scheduled'` → `'active'`
- Email sent: "Boost activated! Your sales will earn 5% extra for 30 days"

**Step 6: Boost Runs (Active Period - e.g., 30 days)**
- Creator's sales tracked automatically via daily scraping
- UI shows: "Boost active - 12 days left"
- **Redemption status:** Still `'claimed'`
- **Boost status:** `'active'`

**Step 7: Boost Expires (Feb 14, 6:00 PM EST)**
- Daily cron detects expiration and calculates payout:
  ```sql
  UPDATE commission_boost_redemptions SET
    boost_status = 'expired',
    sales_at_expiration = :current_gmv_from_cruda,
    sales_delta = sales_at_expiration - sales_at_activation,
    final_payout_amount = sales_delta * (boost_commission_rate / 100)
  WHERE expires_at <= NOW()
    AND boost_status = 'active'
  ```
- **Redemption status:** Still `'claimed'`
- **Boost status:** `'active'` → `'expired'`
- UI shows: "Calculating your payout..."

### Payment Responsibility Context (CRITICAL)

**Understanding Who Pays What:**

The commission boost system involves TWO separate commission payments:

**TikTok Pays (Direct to Creator):**
- Tier commission (e.g., 10%, 12%, 15%) based on creator's VIP tier
- Paid directly by TikTok to creator
- We don't handle this payment

**Brand Pays (We Handle via Venmo/PayPal):**
- Boost commission (e.g., 5% extra) on top of tier commission
- This is the reward value we're providing
- We collect payment info and send payment

**Example Breakdown:**
```
Total Sales During 30-Day Boost: $1,000

TikTok pays creator directly:
  - 10% tier commission = $100 (Gold tier rate)

We pay creator via Venmo/PayPal:
  - 5% boost commission = $50

Creator's total earnings from $1,000 in sales:
  - $100 from TikTok (in their TikTok earnings)
  - $50 from us (via Venmo/PayPal)
  - Total: $150
```

**Why We Show Both in Emails:**
- Creators need to see the full earnings picture
- Prevents confusion ("Where's my other $100?")
- Makes it clear which payment comes from which source
- Builds trust by showing complete transparency

**Critical for Payment Collection:**
When creator submits payment info, they're ONLY receiving the boost commission (5%) from us. The tier commission (10%) already went directly to them from TikTok.

### Step 8: Payment Info Collection (Detailed UI/UX)

After boost expires, creator must submit payment info to receive payout.

#### 4-Step Payment Modal Flow

**Step 1: Show Earnings Breakdown**

Modal displays complete earnings calculation:

```
┌─────────────────────────────────────────────────────┐
│  Your Pay Boost Earnings                            │
│                                                      │
│  Boost Period: Jan 15 - Feb 14, 2025 (30 days)     │
│  Total Sales During Boost: $1,000.00               │
│                                                      │
│  Earnings Breakdown:                                │
│  ├─ Your Tier Commission (10%): $100.00            │
│  │  → Paid directly to you by TikTok               │
│  │                                                  │
│  └─ Your Boost Commission (5%): $50.00             │
│     → We'll pay you this amount                    │
│                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                      │
│  You'll receive $50.00 from us                      │
│                                                      │
│  [Continue to Payment Info]                         │
└─────────────────────────────────────────────────────┘
```

**Purpose:**
- Show full context of their earnings
- Clarify TikTok vs Brand payment split
- Set expectation for payout amount

**Step 2: Choose Payment Method**

```
┌─────────────────────────────────────────────────────┐
│  Choose Payment Method                               │
│                                                      │
│  How would you like to receive your $50.00?        │
│                                                      │
│  ○ Venmo                                            │
│    Fast, easy payment via @username or phone        │
│                                                      │
│  ○ PayPal                                           │
│    Secure payment via email address                 │
│                                                      │
│  [Back]  [Next]                                     │
└─────────────────────────────────────────────────────┘
```

**Options:**
- Venmo (preferred for US creators)
- PayPal (international or creators without Venmo)

**Step 3: Enter Account Info (Double-Entry Verification)**

**If Venmo selected:**
```
┌─────────────────────────────────────────────────────┐
│  Enter Venmo Account                                │
│                                                      │
│  Venmo Username or Phone Number                    │
│  ┌─────────────────────────────────────────────┐   │
│  │ @username or 555-123-4567                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Confirm Venmo Account                              │
│  ┌─────────────────────────────────────────────┐   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ☐ I confirm this information is correct           │
│                                                      │
│  [Back]  [Submit]                                   │
└─────────────────────────────────────────────────────┘
```

**If PayPal selected:**
```
┌─────────────────────────────────────────────────────┐
│  Enter PayPal Email                                 │
│                                                      │
│  PayPal Email Address                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ creator@example.com                          │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Confirm PayPal Email                               │
│  ┌─────────────────────────────────────────────┐   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ☐ I confirm this information is correct           │
│                                                      │
│  [Back]  [Submit]                                   │
└─────────────────────────────────────────────────────┘
```

**Validation:**
- Both fields must match exactly
- Checkbox must be checked
- Format validation (see Payment Validation Rules below)
- Error message if mismatch: "Payment accounts don't match. Please try again."

**Step 4: Confirmation**

```
┌─────────────────────────────────────────────────────┐
│  ✓ Payment Info Submitted                          │
│                                                      │
│  We've received your payment information!          │
│                                                      │
│  Payment Details:                                   │
│  Amount: $50.00                                     │
│  Method: Venmo                                      │
│  Account: @creator_handle                          │
│                                                      │
│  What happens next:                                │
│  • We'll process your payment within 15-20 days    │
│  • You'll receive an email when payment is sent    │
│  • You can edit your payment info anytime before   │
│    we send the payment                             │
│                                                      │
│  [Done]                                             │
└─────────────────────────────────────────────────────┘
```

**System Actions:**
- Update `commission_boost_redemptions`:
  - `boost_status` = 'pending_info' → 'pending_payout'
  - `payment_method` = 'venmo' or 'paypal'
  - `payment_account` = '@creator_handle' or 'email@example.com'
  - `payment_info_submitted_at` = NOW()
- Update `redemptions.status` = 'claimed' → 'fulfilled' (via auto-sync trigger)
- Send Email 1: Payment Info Collected (see Email Templates section)

#### Fallback UI (If Modal Dismissed)

If creator closes modal without submitting:

**Persistent Banner on Home Tab:**
```
┌─────────────────────────────────────────────────────┐
│  💰 Action Required: Submit Payment Info            │
│                                                      │
│  Your Pay Boost has ended! Submit your payment     │
│  info to receive your $50.00 earnings.             │
│                                                      │
│  [Submit Payment Info]  [Dismiss]                  │
└─────────────────────────────────────────────────────┘
```

**Email Reminders:**
- **24 hours after expiration:** "Don't forget to submit your payment info!"
- **7 days after expiration:** "Last reminder: Submit payment info to receive your earnings"

**Modal Re-Opens:**
- Next time creator logs in
- When clicking banner button
- When clicking reminder email link

#### Editing Payment Info

Creators can edit payment info until admin marks as paid:

**Edit Flow:**
1. Creator goes to Rewards → History
2. Finds boost redemption with status "Payment Processing"
3. Clicks "Edit Payment Info"
4. Modal re-opens with Steps 2-4
5. Pre-filled with existing payment method and account
6. Can change method or account
7. Re-validates with double-entry
8. System updates `commission_boost_redemptions` fields
9. Admin sees updated info in payout queue

**After Admin Sends Payment:**
- Edit button becomes disabled
- Status shows "Payment Sent"
- No further edits allowed

### Payment Info Validation Rules

#### Venmo Validation

**Accepted Formats:**

**Format 1: Username**
- Must start with `@`
- Length: 3-30 characters after `@`
- Allowed characters: letters, numbers, underscore, hyphen
- Example: `@johndoe`, `@creator_2024`, `@user-name_123`
- Regex: `^@[a-zA-Z0-9_-]{3,30}$`

**Format 2: Phone Number**
- US phone format: `xxx-xxx-xxxx`
- Must be 10 digits with hyphens
- Example: `555-123-4567`
- Regex: `^\d{3}-\d{3}-\d{4}$`

**Validation Level: Frontend Only (MVP)**
- No Venmo API integration
- No account existence verification
- Regex validation only

**Error Messages:**
- Invalid username: "Venmo username must be @username (3-30 characters, letters/numbers only)"
- Invalid phone: "Phone number must be in format: xxx-xxx-xxxx"
- Mismatch: "Venmo accounts don't match. Please try again."

#### PayPal Validation

**Accepted Format:**
- Valid email address
- Standard email regex
- Example: `creator@example.com`, `user+tags@domain.co.uk`
- Regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`

**Validation Level: Frontend Only (MVP)**
- No PayPal API integration
- No account existence verification
- Email format validation only

**Error Messages:**
- Invalid email: "Please enter a valid email address"
- Mismatch: "Email addresses don't match. Please try again."

#### Double-Entry Verification

**Process:**
1. Creator enters payment account in first field
2. Creator enters same account in second field (confirmation)
3. System compares both entries (case-sensitive exact match)
4. If mismatch: Show error, clear confirmation field, require re-entry
5. If match + checkbox checked: Allow submission

**Why Double-Entry (No API Verification):**
- **MVP Priority:** Saves 6-10 hours implementation time vs API integration
- **Acceptable Risk:** Expected error rate <5% (industry standard for double-entry)
- **Easy Recovery:** Admin can manually verify/correct invalid accounts
- **Post-MVP Path:** Can add Venmo/PayPal API verification if error rate >5%

**Checkbox Required:**
- Text: "I confirm this information is correct and I understand that incorrect information may delay my payment."
- Must be checked to enable Submit button

#### Storage

Payment info stored in `commission_boost_redemptions`:
```sql
payment_method VARCHAR(50),        -- 'venmo' or 'paypal'
payment_account VARCHAR(255),      -- '@handle', 'xxx-xxx-xxxx', or 'email@domain.com'
payment_info_submitted_at TIMESTAMP
```

**Security Note:**
- Stored as plain text (not encrypted for MVP)
- Only accessible to admins and account owner
- Multi-tenant isolation via `client_id` + RLS

**Step 9: Admin Payout Queue**
- Redemption appears in admin payout queue
- Admin reviews:
  - Sales at activation (D0): $1,250.00
  - Sales at expiration (D30): $1,825.00
  - Sales delta: $575.00
  - Calculated payout: $575.00 × 5% = $28.75
- Admin can edit payout amount if needed (with audit trail)
- Admin sends payment via Venmo/PayPal
- Admin marks as paid:
  ```sql
  UPDATE commission_boost_redemptions SET
    boost_status = 'paid',
    payout_sent_at = NOW(),
    payout_sent_by = admin_id,
    final_payout_amount = 28.75                 -- May be edited by admin
  WHERE redemption_id = :redemption_id
  ```
- **Redemption status transitions:** `'fulfilled'` → `'concluded'` (via auto-sync trigger)
- **Boost status:** `'pending_payout'` → `'paid'` (terminal state)

**Step 10: Payment Confirmation**
- Creator receives email: "Payment sent! $28.75 via Venmo to @creator_handle"
- UI shows: "Payout complete: $28.75 sent"
- Boost complete

**Commission Boost Status Summary:**

| Boost Status | Redemption Status | Duration | UI Display |
|--------------|-------------------|----------|------------|
| `scheduled` | `claimed` | 1-7 days | "Boost scheduled for Jan 15" |
| `active` | `claimed` | duration_days (variable) | "Boost active - 12 days left" |
| `expired` | `claimed` | ~15 days | "Calculating your payout..." |
| `pending_info` | `claimed` | Until user submits | Payment info modal appears |
| `pending_payout` | `fulfilled` | Until admin sends | "Payment processing" |
| `paid` | `concluded` | Terminal | "Payout complete: $28.75 sent" |

### 4.4 Admin Fulfillment Process

**Admin Dashboard View:**

**Fulfillment Queue Table:**
| Creator | Reward | Type | Claimed | Hours Remaining | Status |
|---------|--------|------|---------|-----------------|--------|
| @creator1 | Gift Card: $50 | Instant | Jan 5, 2:00 PM | 18h | Claimed |
| @creator2 | Spark Ads: $100 | Instant | Jan 5, 3:00 PM | 17h | Claimed |
| @creator3 | Follower Discount: 10% | Scheduled | Jan 12, 2:00 PM | 156h | Claimed (Scheduled) |
| @creator4 | Pay Boost: 5% | Commission Boost | Jan 1, 6:00 PM | - | Pending Payout |

**Fulfillment Actions:**

**For Instant Rewards (gift_card, spark_ads, physical_gift, experience):**
1. Admin completes operational task:
   - **Gift Card:** Purchase on Amazon, email code to creator
   - **Spark Ads:** Set up Spark Ads campaign for creator's content
   - **Physical Gift:** Ship product to creator's address
   - **Experience:** Coordinate event access with creator

2. Admin clicks "Mark as Fulfilled"
3. Admin enters fulfillment notes:
   - "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com"
   - "Spark Ads campaign created, $100 budget"
   - "Headphones shipped via FedEx, tracking: 123456789"

4. System updates redemption:
   ```sql
   UPDATE redemptions SET
     status = 'fulfilled',
     fulfilled_at = NOW(),
     fulfilled_by = admin_id,
     fulfillment_notes = 'Gift card code: ABCD-EFGH-IJKL'
   WHERE id = redemption_id
   ```

5. For digital rewards (gift_card, spark_ads): Auto-transition to `'concluded'`
6. For physical gifts: Admin manually marks as `'concluded'` when delivery confirmed

**For Scheduled Discounts:**
1. Google Calendar reminder fires 30 minutes before (5:30 PM EST)
2. Admin prepares to activate discount
3. At scheduled time (6:00 PM EST), admin activates in TikTok Seller Center
4. Admin marks as fulfilled (same as instant rewards above)
5. After discount period expires, admin marks as `'concluded'`

**For Commission Boosts:**
1. Activation is **automated** via cron (no admin action needed)
2. Admin only involved in **payout queue** after creator submits payment info

#### Admin Payout Queue (Commission Boost Detailed Workflow)

When boost reaches `'pending_payout'` status, it enters the admin payout queue.

**Queue Display:**

| Creator Handle | Boost Details | Sales Data | Commission Calc | Payment Info | Status | Actions |
|----------------|---------------|------------|-----------------|--------------|--------|---------|
| @creator1 | 5% for 30 days | D0: $1,250<br>DX: $1,825<br>Δ: $575 | Rate: 5%<br>Calculated: $28.75<br>Adjusted: —<br>**Final: $28.75** | Venmo<br>@creator1 | Pending | [Edit Amount] [Edit Payment] [Send Payment] |
| @creator2 | 5% for 30 days | D0: $2,100<br>DX: $3,200<br>Δ: $1,100 | Rate: 5%<br>Calculated: $55.00<br>Adjusted: -$5.00<br>**Final: $50.00** | PayPal<br>user@email.com | Pending | [Edit Amount] [Edit Payment] [Send Payment] |

**Color Coding:**
- Green row: Ready to send (no issues)
- Yellow row: Manual adjustment made (review reason)
- Red row: Payment info invalid or flagged

**Step-by-Step Admin Workflow:**

**Step 1: Review Calculated Payout**

Admin sees automatic calculation:
```
Sales at Activation (D0): $1,250.00
Sales at Expiration (DX): $1,825.00
Sales Delta: $575.00
Boost Rate: 5%
Calculated Payout: $575.00 × 5% = $28.75
```

**Verification:**
- Check if sales_delta looks reasonable
- Compare to typical creator performance
- Look for anomalies (e.g., negative sales, huge spikes)

**Step 2: Edit Payout Amount (If Needed)**

Admin can manually adjust if:
- TikTok data discrepancy discovered
- Returns adjustment needed
- Goodwill credit/penalty

**Edit Amount Flow:**
```
┌─────────────────────────────────────────────────────┐
│  Edit Payout Amount                                 │
│                                                      │
│  Original Calculated Amount: $28.75                │
│                                                      │
│  New Amount                                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ $25.00                                       │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Adjustment Reason (required, min 10 characters)   │
│  ┌─────────────────────────────────────────────┐   │
│  │ TikTok seller dashboard shows $500 sales    │   │
│  │ instead of $575. Adjusted to match TikTok.  │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  [Cancel]  [Save Adjustment]                        │
└─────────────────────────────────────────────────────┘
```

**System Actions:**
- Update `commission_boost_redemptions.final_payout_amount` = $25.00
- Insert to `commission_boost_state_history`:
  ```sql
  {
    commission_boost_redemption_id: boost_id,
    old_status: 'pending_payout',
    new_status: 'pending_payout',
    field_changed: 'final_payout_amount',
    old_value: '28.75',
    new_value: '25.00',
    change_reason: 'TikTok seller dashboard shows $500 sales instead of $575. Adjusted to match TikTok.',
    changed_by: admin_id,
    created_at: NOW()
  }
  ```
- Show yellow highlight in queue (manual adjustment made)

**Step 3: Edit Payment Info (If Invalid)**

If creator's payment account is invalid (typo, closed account, etc.):

**Edit Payment Flow:**
```
┌─────────────────────────────────────────────────────┐
│  Edit Payment Info for @creator1                    │
│                                                      │
│  Current Payment Method: Venmo                      │
│  Current Account: @creator1                         │
│                                                      │
│  New Payment Method                                 │
│  ○ Venmo  ○ PayPal                                  │
│                                                      │
│  New Account                                        │
│  ┌─────────────────────────────────────────────┐   │
│  │ @creator1_new                                │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Reason for Change (optional)                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Creator contacted support, old account      │   │
│  │ was closed                                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ☐ Notify creator of payment info update           │
│                                                      │
│  [Cancel]  [Save Changes]                           │
└─────────────────────────────────────────────────────┘
```

**System Actions:**
- Update `commission_boost_redemptions`:
  - `payment_method` = new method
  - `payment_account` = new account
- If "Notify creator" checked: Send email to creator
- Log to `commission_boost_state_history`

**Step 4: Send Payment**

Admin processes payment manually via Venmo/PayPal:

**Payment Process:**
1. Admin goes to Venmo app or PayPal website
2. Admin sends $28.75 to `@creator1` or `email@example.com`
3. Admin copies transaction ID from confirmation
4. Admin returns to payout queue
5. Admin clicks "Mark as Paid"

**Mark as Paid Modal:**
```
┌─────────────────────────────────────────────────────┐
│  Mark Payment as Sent                               │
│                                                      │
│  Creator: @creator1                                 │
│  Amount: $28.75                                     │
│  Method: Venmo                                      │
│  Account: @creator1                                 │
│                                                      │
│  Transaction ID (required)                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ VNMO-ABC123456789                            │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  Payment Notes (optional)                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ Sent via Venmo on Feb 20, 2025              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  [Cancel]  [Confirm Payment Sent]                   │
└─────────────────────────────────────────────────────┘
```

**System Actions:**
- Update `commission_boost_redemptions`:
  - `boost_status` = 'pending_payout' → 'paid'
  - `payout_sent_at` = NOW()
  - `payout_sent_by` = admin_id
- Update `redemptions`:
  - `status` = 'fulfilled' → 'concluded' (via auto-sync trigger)
  - `external_transaction_id` = 'VNMO-ABC123456789'
  - `fulfillment_notes` = Payment notes
- Send Email 2: Payment Sent (see Email Templates section)
- Remove from payout queue
- Add to Completed Payouts archive

**Learning Loop (First 10 Payouts):**

**Purpose:** Determine if payout calculation can be automated or needs ongoing manual review

For the first 10 commission boost payouts:

**At D+45 (15 days after payout sent):**
1. Admin checks TikTok Seller Dashboard for same period
2. Admin compares TikTok GMV vs Cruva GMV
3. Admin logs comparison:
   ```
   Boost #1:
   - Cruva GMV: $575
   - TikTok GMV: $580
   - Discrepancy: $5 (0.87%)

   Boost #2:
   - Cruva GMV: $1,100
   - TikTok GMV: $1,095
   - Discrepancy: $5 (0.45%)
   ```

**After 10 Payouts:**
- Calculate average discrepancy percentage
- **If <5% average discrepancy:**
  - Decision: Safe to automate payout calculation
  - Future boosts can skip manual D+45 verification
  - Admin only reviews flagged cases (negative sales, huge spikes)
- **If >5% average discrepancy:**
  - Decision: Continue manual review for all payouts
  - Investigate root cause (Cruva data quality, TikTok API issues, etc.)
  - Re-evaluate after data quality improvements

**Why This Matters:**
- TikTok doesn't provide date-of-sale breakdown
- Cruva shows cumulative GMV (includes returns)
- Can't distinguish boost-period sales from post-boost returns at DX
- Manual verification at D+45 ensures accurate payouts
- Learning loop determines if discrepancies are acceptable

**Reports & Reconciliation:**

**Monthly Commission Boost Report:**

Export for client billing:

| Month | Total Boosts | Total Payouts | Total Amount | Status |
|-------|--------------|---------------|--------------|--------|
| Jan 2025 | 15 | 15 | $1,247.50 | Reconciled |

**CSV Export Includes:**
- Creator handle
- Boost start/end dates
- Sales delta
- Payout amount
- Transaction ID
- Payout sent date

**Use Cases:**
- Client billing (brand pays for boost rewards)
- Financial reconciliation
- Audit trail

---

### 4.5 Redemption Records Schema

**Standard Redemption Record (5-State Lifecycle):**

```sql
{
  id: UUID,
  user_id: creator_id,
  reward_id: reward_id,
  status: 'claimable' | 'claimed' | 'fulfilled' | 'concluded' | 'rejected',  -- 5-state lifecycle
  tier_at_claim: 'gold',                              -- Locked at claim time
  claimed_at: '2025-01-05 14:00:00',
  scheduled_activation_date: '2025-01-12',            -- Date only (time always 6 PM EST)
  fulfilled_at: '2025-01-06 10:00:00',                -- When admin fulfilled
  concluded_at: '2025-01-07 14:00:00',                -- When delivery confirmed or auto-concluded
  fulfilled_by: admin_id,
  fulfillment_notes: 'Gift card code: ABCD-EFGH-IJKL',

  -- Rejection tracking (for ALL reward types: raffles, fraud, inventory, policy)
  rejected_at: TIMESTAMP,                             -- When redemption was rejected
  rejection_reason: TEXT,                             -- Why rejected (e.g., "Raffle entry - not selected as winner")

  client_id: client_id
}
```

**Commission Boost Sub-State Record (6-State Sub-Schema):**

```sql
commission_boost_redemptions {
  id: UUID,
  redemption_id: UUID,                                -- FK to redemptions table
  boost_status: 'scheduled' | 'active' | 'expired' | 'pending_info' | 'pending_payout' | 'paid',
  scheduled_activation_date: '2025-01-15',
  activated_at: '2025-01-15 18:00:00',                -- 6 PM EST
  expires_at: '2025-02-14 18:00:00',                  -- 6 PM EST + duration_days
  duration_days: 30,
  boost_commission_rate: 5.0,                         -- Locked at claim time
  tier_commission_rate: 10.0,                         -- Locked at claim time (for display)
  sales_at_activation: 1250.00,                       -- GMV at D0
  sales_at_expiration: 1825.00,                       -- GMV at DX
  sales_delta: 575.00,                                -- Calculated: DX - D0
  calculated_commission: 28.75,                       -- Auto-calculated: sales_delta * boost_rate
  admin_adjusted_commission: null,                    -- Manual adjustment (if admin edits)
  final_payout_amount: 28.75,                         -- Final amount to pay (calculated or adjusted)
  payment_method: 'venmo',
  payment_account: '@creator_handle',
  payment_account_confirm: '@creator_handle',         -- Double-entry verification
  payment_info_collected_at: '2025-02-15 10:00:00',
  payment_info_confirmed: true,                       -- Verification flag
  payout_sent_at: '2025-02-20 14:00:00',
  payout_sent_by: admin_id,
  payout_notes: 'Venmo payment sent, transaction ID: VNMO-ABC123',  -- Admin notes
  client_id: client_id,
  created_at: '2025-01-15 14:00:00',
  updated_at: '2025-02-20 14:00:00'
}
```

**Why lock `tier_at_claim`?**
- Creator claims $50 Gift Card as Gold
- Gets demoted to Silver before fulfillment
- Still receives $50 card (earned while Gold)
- Prevents tier change from affecting pending redemptions

**Why sub-state schema for Commission Boost?**
- Commission Boost has 6 detailed states that don't map to 5 high-level redemption states
- Sub-state table provides granular tracking without polluting base `redemptions` table
- **Auto-sync trigger** keeps `redemptions.status` aligned with `boost_status` (see SchemaDecisions.md Fix 6)
  - Database trigger automatically updates parent redemption status when boost_status changes
  - Mapping: `'pending_payout'` → `'fulfilled'`, `'paid'` → `'concluded'`
  - Financial safety: Guarantees synchronization for PayPal/Venmo automation

**Physical Gift Sub-State Record (Size & Shipping Info):**

```sql
physical_gift_redemptions {
  id: UUID,
  redemption_id: UUID,                                -- FK to redemptions table (ONE-TO-ONE)
  reward_id: UUID,                                    -- FK to rewards table
  user_id: UUID,
  client_id: UUID,

  -- Size information (for clothing/shoes only)
  requires_size: BOOLEAN,                             -- Does this gift require size?
  size_category: 'clothing' | 'shoes' | NULL,
  size_value: 'S' | 'M' | 'L' | 'XL' | '8' | '9.5',  -- User's selected size
  size_submitted_at: TIMESTAMP,

  -- Shipping information (for all physical gifts)
  shipping_address_line1: '123 Main St',
  shipping_address_line2: 'Apt 4B',
  shipping_city: 'New York',
  shipping_state: 'NY',
  shipping_postal_code: '10001',
  shipping_country: 'USA',
  shipping_phone: '+1234567890',
  shipping_info_submitted_at: TIMESTAMP,

  -- Fulfillment tracking
  tracking_number: '1Z999AA10123456784',
  carrier: 'UPS' | 'FedEx' | 'USPS' | 'DHL',
  shipped_at: TIMESTAMP,
  delivered_at: TIMESTAMP,

  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

**Why sub-state schema for Physical Gifts?**
- Physical gifts require additional information (size for clothing, shipping address for all)
- Keeps base `redemptions` table clean (no physical-gift-only fields)
- Consistent with Commission Boost and Raffle sub-state patterns
- Allows different types of physical gifts (clothing with size, non-clothing without size)
- Includes shipping tracking (needed for fulfillment workflow)

---

## 4.6 Email Templates

### 4.6.1 Commission Boost Email 1: Payment Info Collected

**Trigger:** Immediately after creator submits payment info (boost_status = 'pending_payout')

**Subject:** Your Pay Boost Earnings - Payment Info Received

**HTML Version:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .earnings-box { background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
    .breakdown { margin: 15px 0; }
    .breakdown-item { display: flex; justify-content: space-between; padding: 8px 0; }
    .breakdown-item.total { border-top: 2px solid #667eea; font-weight: bold; font-size: 1.1em; margin-top: 10px; padding-top: 15px; }
    .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Your Pay Boost Has Ended!</h1>
      <p>We've received your payment information</p>
    </div>

    <div class="content">
      <p>Hi {{creator_handle}},</p>

      <p>Great news! Your 30-day Pay Boost has ended and we're processing your payment.</p>

      <div class="earnings-box">
        <h3>Your Earnings Breakdown</h3>

        <div class="breakdown">
          <div><strong>Boost Period:</strong> {{boost_start_date}} - {{boost_end_date}}</div>
          <div><strong>Total Sales During Boost:</strong> ${{total_sales}}</div>
        </div>

        <div class="breakdown">
          <div class="breakdown-item">
            <span>Your Tier Commission ({{tier_rate}}%):</span>
            <span>${{tier_commission}}</span>
          </div>
          <div style="margin-left: 20px; color: #666; font-size: 0.9em;">
            → Paid directly to you by TikTok
          </div>

          <div class="breakdown-item" style="margin-top: 15px;">
            <span>Your Boost Commission ({{boost_rate}}%):</span>
            <span>${{boost_commission}}</span>
          </div>
          <div style="margin-left: 20px; color: #666; font-size: 0.9em;">
            → We'll pay you this amount
          </div>

          <div class="breakdown-item total">
            <span>You'll Receive From Us:</span>
            <span>${{boost_commission}}</span>
          </div>
        </div>
      </div>

      <h3>Payment Details</h3>
      <ul>
        <li><strong>Payment Method:</strong> {{payment_method}}</li>
        <li><strong>Account:</strong> {{payment_account}}</li>
        <li><strong>Processing Time:</strong> 15-20 business days</li>
      </ul>

      <h3>What Happens Next?</h3>
      <ol>
        <li>We'll review your boost performance</li>
        <li>We'll process your payment within 15-20 days</li>
        <li>You'll receive another email when payment is sent</li>
      </ol>

      <p><strong>Need to update your payment info?</strong> You can edit it anytime before we send the payment by visiting your Rewards History.</p>

      <a href="{{app_url}}/rewards/history" class="button">View Rewards History</a>

      <p>Thanks for being part of our creator community!</p>

      <p>Best,<br>The {{client_name}} Team</p>
    </div>

    <div class="footer">
      <p>Questions? Reply to this email or contact us at {{support_email}}</p>
      <p>{{client_name}} | {{client_website}}</p>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**

```
Hi {{creator_handle}},

🎉 YOUR PAY BOOST HAS ENDED!

We've received your payment information and we're processing your payment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR EARNINGS BREAKDOWN

Boost Period: {{boost_start_date}} - {{boost_end_date}}
Total Sales During Boost: ${{total_sales}}

Your Tier Commission ({{tier_rate}}%): ${{tier_commission}}
  → Paid directly to you by TikTok

Your Boost Commission ({{boost_rate}}%): ${{boost_commission}}
  → We'll pay you this amount

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You'll Receive From Us: ${{boost_commission}}

PAYMENT DETAILS

Payment Method: {{payment_method}}
Account: {{payment_account}}
Processing Time: 15-20 business days

WHAT HAPPENS NEXT?

1. We'll review your boost performance
2. We'll process your payment within 15-20 days
3. You'll receive another email when payment is sent

Need to update your payment info? You can edit it anytime before we send the payment:
{{app_url}}/rewards/history

Thanks for being part of our creator community!

Best,
The {{client_name}} Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email or contact us at {{support_email}}
{{client_name}} | {{client_website}}
```

---

### 4.6.2 Commission Boost Email 2: Payment Sent

**Trigger:** Immediately when admin marks boost as paid (boost_status = 'paid')

**Subject:** Payment Sent - Your Pay Boost Earnings (${{boost_commission}})

**HTML Version:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .payment-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
    .amount { font-size: 2em; font-weight: bold; color: #10b981; margin: 15px 0; }
    .footer { background: #f7fafc; padding: 20px; text-align: center; font-size: 0.9em; color: #666; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Payment Sent!</h1>
      <p>Your Pay Boost earnings are on the way</p>
    </div>

    <div class="content">
      <p>Hi {{creator_handle}},</p>

      <p>Great news! We've sent your Pay Boost earnings.</p>

      <div class="payment-box">
        <h3>Payment Confirmation</h3>

        <div class="amount">${{boost_commission}}</div>

        <ul style="list-style: none; padding: 0;">
          <li><strong>Payment Method:</strong> {{payment_method}}</li>
          <li><strong>Sent To:</strong> {{payment_account}}</li>
          <li><strong>Transaction ID:</strong> {{transaction_id}}</li>
          <li><strong>Sent On:</strong> {{payout_sent_date}}</li>
        </ul>
      </div>

      <h3>Boost Summary</h3>
      <ul>
        <li><strong>Boost Period:</strong> {{boost_start_date}} - {{boost_end_date}}</li>
        <li><strong>Total Sales:</strong> ${{total_sales}}</li>
        <li><strong>Boost Rate:</strong> {{boost_rate}}%</li>
        <li><strong>Boost Earnings:</strong> ${{boost_commission}}</li>
      </ul>

      <h3>What to Expect</h3>
      <p>You should receive the payment in your {{payment_method}} account within:</p>
      <ul>
        <li><strong>Venmo:</strong> Instantly to a few minutes</li>
        <li><strong>PayPal:</strong> Within 1 business day</li>
      </ul>

      <p><strong>Don't see the payment?</strong> Check your {{payment_method}} account using the transaction ID above. If you still don't see it after 24 hours, please contact us.</p>

      <a href="{{app_url}}/rewards/history" class="button">View Rewards History</a>

      <p>Congratulations on completing your Pay Boost! Keep up the great work.</p>

      <p>Best,<br>The {{client_name}} Team</p>
    </div>

    <div class="footer">
      <p>Questions about your payment? Reply to this email or contact us at {{support_email}}</p>
      <p>{{client_name}} | {{client_website}}</p>
    </div>
  </div>
</body>
</html>
```

**Plain Text Version:**

```
Hi {{creator_handle}},

💰 PAYMENT SENT!

Great news! We've sent your Pay Boost earnings.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT CONFIRMATION

Amount: ${{boost_commission}}

Payment Method: {{payment_method}}
Sent To: {{payment_account}}
Transaction ID: {{transaction_id}}
Sent On: {{payout_sent_date}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOST SUMMARY

Boost Period: {{boost_start_date}} - {{boost_end_date}}
Total Sales: ${{total_sales}}
Boost Rate: {{boost_rate}}%
Boost Earnings: ${{boost_commission}}

WHAT TO EXPECT

You should receive the payment in your {{payment_method}} account within:
- Venmo: Instantly to a few minutes
- PayPal: Within 1 business day

Don't see the payment? Check your {{payment_method}} account using the transaction ID above. If you still don't see it after 24 hours, please contact us at {{support_email}}.

View your rewards history:
{{app_url}}/rewards/history

Congratulations on completing your Pay Boost! Keep up the great work.

Best,
The {{client_name}} Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about your payment? Reply to this email or contact us at {{support_email}}
{{client_name}} | {{client_website}}
```

**Template Variables:**

Common variables for both emails:
- `{{creator_handle}}` - Creator's TikTok handle
- `{{client_name}}` - Brand name
- `{{support_email}}` - Support email address
- `{{client_website}}` - Brand website URL
- `{{app_url}}` - Base URL for app links
- `{{boost_start_date}}` - Activation date (formatted: "Jan 15, 2025")
- `{{boost_end_date}}` - Expiration date (formatted: "Feb 14, 2025")
- `{{total_sales}}` - Formatted sales amount: "1,000.00"
- `{{tier_rate}}` - Tier commission percentage: "10"
- `{{tier_commission}}` - Calculated tier commission: "100.00"
- `{{boost_rate}}` - Boost commission percentage: "5"
- `{{boost_commission}}` - Calculated boost commission: "50.00"
- `{{payment_method}}` - "Venmo" or "PayPal"
- `{{payment_account}}` - Creator's payment account

Email 2 only:
- `{{transaction_id}}` - External transaction ID from Venmo/PayPal
- `{{payout_sent_date}}` - Date payment was sent (formatted: "Feb 20, 2025")

---

## 5. REDEMPTION LIMITS & FREQUENCY

### 5.1 redemption_quantity Field (1-10 per period)

**Purpose:** How many times creator can claim reward per frequency period

**Values:** 1-10 (NULL for unlimited)

**Examples:**
- `redemption_quantity: 1` = Claim once per period
- `redemption_quantity: 2` = Claim twice per period
- `redemption_quantity: 5` = Claim 5 times per period
- `redemption_quantity: NULL` = Unlimited (only with `redemption_frequency: 'unlimited'`)

### 5.2 redemption_frequency Field

**Purpose:** How often redemption counter resets

**Values:** `one-time`, `monthly`, `weekly`, `unlimited`

**Behavior:**

| Frequency | Reset Trigger | Example |
|-----------|---------------|---------|
| **one-time (forever)** | Never | gift_card/physical_gift/experience: Claim once, never again (even if demoted/promoted) |
| **one-time (per tier)** | Tier re-achievement | commission_boost/spark_ads/discount: Claim once per tier achievement period |
| **monthly** | Calendar month boundary (1st of month) | Jan 1 → Feb 1 → Mar 1 |
| **weekly** | Calendar week boundary (Sunday) | Sun → Sun → Sun |
| **unlimited** | Never (no limit) | Claim as many times as wanted |

### 5.3 Redemption Limit Logic

**Query to Check if Creator Can Claim:**

```sql
-- Count redemptions in current period
SELECT COUNT(*) FROM redemptions
WHERE user_id = creator_id
  AND reward_id = reward_id
  AND claimed_at >= period_start
  AND claimed_at < period_end

-- Compare to redemption_quantity
IF count < redemption_quantity THEN
  allow_claim = true
ELSE
  allow_claim = false (limit reached)
```

**Period Calculation:**

**Monthly:**
```javascript
// Current period: January 2025
period_start = '2025-01-01 00:00:00 UTC'
period_end = '2025-02-01 00:00:00 UTC'

// Resets on Feb 1
```

**Weekly:**
```javascript
// Current week: Sunday Jan 5 - Saturday Jan 11
period_start = '2025-01-05 00:00:00 UTC' // Sunday
period_end = '2025-01-12 00:00:00 UTC' // Next Sunday

// Resets every Sunday
```

**One-time (varies by reward type):**

**Type 1: Once Forever (Lifetime Restriction)**
```javascript
// Reward types: gift_card, physical_gift, experience
period_start = user.created_at // Account creation date
period_end = NOW()

// If they claim once, can NEVER claim again
// Even if demoted to Silver then promoted back to Gold:
// - Still cannot claim again (lifetime restriction)
// - Rationale: High-value tangible items not re-awarded
```

**Type 2: Once Per Tier Achievement (Period-Based)**
```javascript
// Reward types: commission_boost, spark_ads, discount
period_start = user.tier_achieved_at // When they reached current tier
period_end = NOW()

// If they claim once while Gold, counter persists until demotion
// If demoted to Silver then promoted back to Gold:
// - New tier_achieved_at timestamp
// - Can claim again (new period)
// - Rationale: Performance boosts motivate regaining tier
```

### 5.4 Creator UI Display

**Limit Counter Examples:**

**Monthly, quantity 2:**
```
Limit: 1 of 2 used this month
[Claim]
```

**Weekly, quantity 1:**
```
Limit: 1 of 1 used this week
Resets on Sunday
[Limit Reached]
```

**One-time:**
```
One-time reward
[Claimed ✓]
```

**Unlimited:**
```
Unlimited claims
[Claim]
```

### 5.5 Edge Cases

**Edge Case 1: Period Transition**

**Scenario:**
```
Jan 31, 11:59 PM: Creator claims (2 of 2 used)
Feb 1, 12:00 AM: Counter resets (0 of 2 used)
Feb 1, 12:01 AM: Creator can claim again
```

**Behavior:** Immediate reset at calendar boundary.

**Edge Case 2: Tier Change Mid-Period**

**Scenario:**
```
Jan 10: Silver creator claims Silver reward (1 of 2 used)
Jan 15: Promoted to Gold
Jan 20: Silver reward disappears (auto-replace)
Feb 1: Counter resets, but Silver reward still not visible (Gold tier now)
```

**Behavior:** Counter resets, but reward no longer visible due to tier change.

**Edge Case 3: One-Time Across Demotion/Promotion (Reward-Type-Specific)**

**Scenario A (Physical Gift - Once Forever):**
```
Day 1: Gold creator claims "Gift Drop: Headphones" (one-time, physical_gift)
Day 30: Demoted to Silver
Day 60: Promoted back to Gold
Day 61: Can creator claim "Headphones" again?
```

**Answer:** NO - Physical gifts are once forever (lifetime restriction).

**Scenario B (Commission Boost - Once Per Tier):**
```
Day 1: Gold creator claims "Pay Boost: 5%" (one-time, commission_boost)
Day 30: Demoted to Silver
Day 60: Promoted back to Gold (new tier_achieved_at)
Day 61: Can creator claim "Pay Boost: 5%" again?
```

**Answer:** YES - Performance boosts reset per tier achievement period (new `tier_achieved_at` timestamp).

---

## 6. TIER TARGETING & AUTO-REPLACE

### 6.1 tier_eligibility Field (Exact Match)

**Field:** `rewards.tier_eligibility`

**Purpose:** Which tier can claim this reward

**Values:** `tier_1`, `tier_2`, `tier_3`, `tier_4`, `tier_5`, `tier_6`

**Rule:** **EXACT match** (not minimum threshold)

**Examples:**
- `tier_eligibility='tier_2'` → Only Silver creators can claim
- `tier_eligibility='tier_3'` → Only Gold creators can claim
- `tier_eligibility='tier_4'` → Only Platinum creators can claim

**Why exact match (not cumulative)?**

```
❌ WRONG (cumulative):
tier_eligibility='tier_2' → Silver, Gold, Platinum all see it

✅ CORRECT (exact):
tier_eligibility='tier_2' → ONLY Silver sees it
tier_eligibility='tier_3' → ONLY Gold sees it (different reward)
```

**Rationale:**
- Each tier gets unique rewards
- Gold tier should have better rewards than Silver (not same rewards)
- Admin creates separate rewards per tier

### 6.2 Tier Change Behavior (Auto-Replace)

**Rule:** Rewards auto-replace when tier changes (old tier rewards disappear, new tier appears).

**Flow:**

**Scenario: Silver → Gold Promotion**

```
Day 1: Creator is Silver (tier_2)
  Rewards visible:
    - "$25 Gift Card" (tier_eligibility='tier_2')
    - "10% Commission Boost" (tier_eligibility='tier_2')

Day 30: Creator promoted to Gold (tier_3)
  tier_achieved_at = Day 30

  Rewards visible (auto-replace):
    - "$50 Gift Card" (tier_eligibility='tier_3')
    - "15% Commission Boost" (tier_eligibility='tier_3')
    - "VIP Event Access" (tier_eligibility='tier_3')

  Silver rewards GONE:
    - "$25 Gift Card" no longer visible
    - "10% Commission Boost" no longer visible
```

**Key Points:**
- No manual action needed
- Immediate replacement
- Filtering based on `current_tier`

**Query:**
```sql
-- Fetch eligible rewards for creator
SELECT * FROM rewards
WHERE client_id = creator.client_id
  AND tier_eligibility = creator.current_tier
  AND enabled = true
```

### 6.3 Pending Redemptions During Tier Change

**Rule:** `tier_at_claim` field prevents redemption loss.

**Scenario:**

```
Day 1: Gold creator claims "$50 Gift Card"
  redemptions.tier_at_claim = 'tier_3'
  redemptions.status = 'pending'

Day 5: Creator demoted to Silver
  current_tier = 'tier_2'
  "$50 Gift Card" no longer visible (auto-replace)

Day 10: Admin fulfills redemption
  Redemption still processes (tier_at_claim='tier_3')
  Creator receives $50 card (earned while Gold)
```

**Why important?**
- Prevents creators from losing earned rewards
- Tier change doesn't affect pending redemptions
- Fair to creators (they earned it at higher tier)

### 6.4 Preview Visibility (Optional)

**Field:** `rewards.preview_from_tier`

**Purpose:** Show locked rewards to lower tiers (motivate upgrades)

**Values:** `NULL`, `tier_1`, `tier_2`, `tier_3`, `tier_4`, `tier_5`, `tier_6`

**Behavior:**

| Value | Who Can Preview |
|-------|----------------|
| `NULL` | Only eligible tier sees reward |
| `tier_1` | Bronze+ can see (locked if below tier_eligibility) |
| `tier_2` | Silver+ can see (locked if below tier_eligibility) |
| `tier_3` | Gold+ can see (locked if below tier_eligibility) |
| `tier_4` | Platinum+ can see (locked if below tier_eligibility) |

**Example:**

**Reward Configuration:**
```sql
{
  name: "$50 Gift Card",
  tier_eligibility: 'tier_3', -- Gold only can claim
  preview_from_tier: 'tier_2' -- Silver+ can SEE it (locked)
}
```

**Result:**

**Bronze creator (tier_1):** Does NOT see reward (below preview_from_tier)

**Silver creator (tier_2):**
```
┌─────────────────────────────────────┐
│ 🔒 Gift Card: $50                   │
│ Gold Tier Reward (Locked)           │
│                                     │
│ Upgrade to Gold to unlock this      │
│ reward                              │
│                                     │
│ [Upgrade Info]                      │
└─────────────────────────────────────┘
```

**Gold creator (tier_3):**
```
┌─────────────────────────────────────┐
│ 💳 Gift Card: $50                   │
│ Gold Tier Reward                    │
│                                     │
│ Redeem for Amazon gift card         │
│                                     │
│ Limit: 0 of 2 used this month       │
│ [Claim]                             │
└─────────────────────────────────────┘
```

**Platinum creator (tier_4):** Does NOT see reward (higher tier doesn't see lower tier rewards)

### 6.5 Visibility Direction

**Rule:** Lower tiers see higher tier rewards (locked). Higher tiers do NOT see lower tier rewards.

**Rationale:**
- Silver seeing Gold rewards = Motivates upgrade ✅
- Gold seeing Silver rewards = Confusing (why show lower tier content?) ❌

**Example:**

```
Rewards configured:
- "$10 Gift Card" (tier_eligibility='tier_1', preview_from_tier=NULL)
- "$25 Gift Card" (tier_eligibility='tier_2', preview_from_tier='tier_1')
- "$50 Gift Card" (tier_eligibility='tier_3', preview_from_tier='tier_2')

Bronze creator sees:
  - "$10 Gift Card" (claimable)
  - "$25 Gift Card" (locked - upgrade to Silver)

Silver creator sees:
  - "$25 Gift Card" (claimable)
  - "$50 Gift Card" (locked - upgrade to Gold)
  - NOT "$10 Gift Card" (lower tier, not shown)

Gold creator sees:
  - "$50 Gift Card" (claimable)
  - NOT "$25 Gift Card" (lower tier)
  - NOT "$10 Gift Card" (lower tier)
```

---

## 7. REDEMPTION STATUS FLOW

### 7.1 Status State Machine (5-State Lifecycle)

```
claimable → claimed → fulfilled → concluded
               ↓
           rejected (terminal state)
```

**State Flow:**
- **Primary path:** claimable → claimed → fulfilled → concluded
- **Alternate terminal state:** claimed → rejected (for rejections: raffles, fraud, inventory, policy)
- **Flexible transitions:** Some rewards skip states (e.g., gift cards: claimed → concluded)

### 7.2 Status Definitions

| Status | Meaning | Trigger | Creator Action | Admin Action Required |
|--------|---------|---------|----------------|----------------------|
| **claimable** | Mission completed or tier achieved, reward available | Mission completion or tier achievement | None yet (auto-created) | None |
| **claimed** | Creator clicked "Claim" button | Creator action | Wait for fulfillment | Fulfill reward |
| **fulfilled** | Admin completed action (shipped, activated, sent payment) | Admin marks fulfilled | None | Confirm completion |
| **concluded** | Admin confirmed completion (delivery verified, payment confirmed) | Admin confirms OR auto-transition | View in history | None (terminal) |
| **rejected** | Redemption rejected (terminal state) | Admin rejects (raffles, fraud, etc.) | None | None (terminal) |

**Key Points:**
- `claimable` state is auto-created (mission completion or VIP tier achievement)
- `rejected` is used for ALL rejection types (not just raffles): raffle losers, fraud, policy violations, inventory issues
- Some rewards auto-transition: gift_card/spark_ads skip `fulfilled` → go directly to `concluded`
- Terminal states: `concluded` and `rejected` (no further transitions)

### 7.3 Status Transition Details

**claimable → claimed:**
- **Trigger:** Creator clicks "Claim" button in UI
- **Action:** Update `status='claimed'`, `claimed_at=NOW()`
- **Notification:** Send email "Reward claimed! You'll receive it soon."
- **UI Change:** Reward card shows "Claimed" badge, enters admin fulfillment queue

**claimed → fulfilled:**
- **Trigger:** Admin clicks "Mark as Fulfilled" in admin panel
- **Action:** Update `status='fulfilled'`, `fulfilled_at=NOW()`, `fulfilled_by=admin_id`
- **Notification:** Send email/push "Your [reward_name] has been delivered!"
- **UI Change:** Status shows "Fulfilled"

**fulfilled → concluded:**
- **Trigger:** Admin confirms completion (physical delivery, payment verified) OR auto-transition (digital rewards)
- **Action:** Update `status='concluded'`, `concluded_at=NOW()`
- **Notification:** Send email "Delivery confirmed!" or "Payment complete!"
- **UI Change:** Redemption moves to history, shows completion date

**claimed → concluded (skip fulfilled):**
- **Trigger:** Instant digital rewards (gift_card, spark_ads)
- **Action:** Update `status='concluded'` directly, `fulfilled_at=NOW()`, `concluded_at=NOW()`
- **Notification:** Send email with gift card code or activation details
- **UI Change:** Redemption immediately complete

**claimed → rejected:**
- **Trigger:** Admin rejects redemption (raffle losers, fraud, inventory, policy violations)
- **Action:** Update `status='rejected'`, `rejection_reason='...'`, `rejected_at=NOW()`
- **Notification:** Depends on rejection type:
  - **Raffle losers:** Separate email "Better luck next time"
  - **Fraud/Policy:** Email with explanation
  - **Inventory:** Email with refund/alternative offer
- **UI Change:** Redemption removed from queue
- **Note:** For raffles, see SchemaFinal.md Section 7 (raffle_participations table) for detailed sub-state tracking

### 7.4 Scheduled Redemption Special Case

**Scheduled redemptions have additional fields:**
- `scheduled_activation_date` - Date when admin should activate
- `scheduled_activation_time` - Time in EST when admin should activate (9 AM - 4 PM EST for discounts)

**Status flow for discounts:**
```
claimable → claimed (waiting for scheduled time) → concluded (admin activated)
```

**Admin View:**
```
Fulfillment Queue:
┌─────────────────────────────────────────────────┐
│ @creator1 - Follower Discount: 10%              │
│ Type: Scheduled                                 │
│ Activation: Jan 12, 2025 at 2:00 PM EST        │
│ Status: Claimed (156 hours remaining)          │
│                                                 │
│ [Mark as Concluded]                             │
└─────────────────────────────────────────────────┘
```

**At scheduled time:**
- Google Calendar reminder fires 30 minutes before scheduled time
- Admin activates discount in TikTok Seller Center at scheduled EST time
- Admin marks as concluded (discounts skip `fulfilled` state)

**Scheduling Constraints:**
- **Discounts:** Weekdays only, 9:00 AM - 4:00 PM EST time slots
- **Commission Boosts:** Daily at 6:00 PM EST (automated, no manual scheduling)

### 7.5 Commission Boost Auto-Sync (Sub-State Schema)

**Commission Boost uses sub-state schema with automatic status synchronization.**

**Auto-Sync Trigger:**
- Database trigger automatically keeps `redemptions.status` synchronized with `commission_boost_redemptions.boost_status`
- Developers don't need to manually update both tables - database handles synchronization

**Mapping:**
| Boost Status | Redemption Status | Auto-Sync Trigger |
|--------------|-------------------|-------------------|
| `scheduled` | `claimed` | ✅ Automatic |
| `active` | `claimed` | ✅ Automatic |
| `expired` | `claimed` | ✅ Automatic |
| `pending_info` | `claimed` | ✅ Automatic |
| `pending_payout` | `fulfilled` | ✅ Automatic |
| `paid` | `concluded` | ✅ Automatic |

**Why Auto-Sync?**
- **Financial Safety:** When boost reaches `'paid'`, redemption automatically becomes `'concluded'`
- **Self-Healing:** If application forgets to update redemption, database fixes it
- **PayPal/Venmo Integration:** Automation can safely query `WHERE boost_status = 'paid'` knowing redemption is guaranteed `'concluded'`
- **Audit Trail:** `boost_sync_log` table records every auto-sync event (see SchemaDecisions.md Fix 6)

**Example:**
```sql
-- Admin marks boost as paid
UPDATE commission_boost_redemptions SET boost_status = 'paid' WHERE id = :boost_id;

-- Auto-sync trigger automatically fires:
UPDATE redemptions SET status = 'concluded', updated_at = NOW() WHERE id = redemption_id;

-- Sync event logged to boost_sync_log table
INSERT INTO boost_sync_log (boost_redemption_id, old_redemption_status, new_redemption_status, boost_status);
```

### 7.6 Raffle Rejection Flow (Sub-State Schema)

**Raffles use a dedicated sub-state schema for tracking participation and winner selection.**

**Raffle Flow:**
1. **Participation:** User clicks "Participate" → Creates `claimable` redemption + entry in `raffle_participations` table
2. **Winner Selection:** Admin picks winner → Winner's redemption stays `claimable`, losers transition to `rejected`
3. **Winner Claims:** Winner clicks "Claim" → Redemption becomes `claimed` → follows normal fulfillment flow
4. **Losers Notified:** Losers receive "Better luck next time" email, redemption status = `rejected`

**Rejection Details:**
```sql
-- For raffle losers
UPDATE redemptions SET
  status = 'rejected',
  rejected_at = NOW(),
  rejection_reason = 'Raffle entry - not selected as winner'
WHERE id IN (SELECT redemption_id FROM raffle_participations WHERE is_winner = false);
```

**Why Sub-State Schema?**
- Tracks all participants (winners + losers) without polluting core redemptions table
- Prevents "loser gets winner message" errors (explicit queries required)
- See RaffleSchema.md for complete documentation

### 7.7 Fulfillment Notes

**Every fulfillment includes notes:**

**Examples:**
```
Gift Card (status: concluded):
  "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com on Jan 6"

Commission Boost (status: concluded after paid):
  "Payment sent: $28.75 via Venmo to @creator_handle on Feb 20"

Spark Ads (status: concluded):
  "Spark Ads campaign created, $100 budget allocated, campaign ID: 12345"

Physical Gift (status: fulfilled, then concluded):
  "Wireless headphones shipped via FedEx, tracking: 123456789. Delivered Jan 15."

Experience (status: concluded):
  "VIP event access confirmed, emailed details to creator@email.com"

Discount (status: concluded):
  "Discount activated in TikTok Seller Center on Jan 12 at 2:00 PM EST, expires Jan 19"

Raffle Rejection (status: rejected):
  "Raffle entry - not selected as winner"
```

**Purpose:**
- Audit trail for all state transitions
- Creator support (if they don't receive reward)
- Admin reference (tracking numbers, codes, payment confirmations)

---

## 8. DATABASE SCHEMA

### 8.1 rewards Table (Templates)
**Purpose:** Admin-configured reward templates

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT uuid_generate_v4() | rewards | Reward templates | |
| client_id | UUID | REFERENCES clients(id) ON DELETE CASCADE | rewards | Multi-tenant isolation | |
| type | VARCHAR(100) | NOT NULL | rewards | Reward type | Options: 'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience' |
| name | VARCHAR(255) | | rewards | Auto-generated from type + value_data | |
| description | VARCHAR(15) | | rewards | User-facing display | Max 15 chars, for physical_gift/experience only |
| value_data | JSONB | | rewards | Structured reward configuration | See value_data examples below |
| tier_eligibility | VARCHAR(50) | NOT NULL | rewards | Tier targeting (exact match) | Options: 'tier_1' through 'tier_6' |
| enabled | BOOLEAN | DEFAULT false | rewards | Visibility control | |
| preview_from_tier | VARCHAR(50) | DEFAULT NULL | rewards | Preview as locked | NULL or 'tier_1' through 'tier_6' |
| redemption_frequency | VARCHAR(50) | DEFAULT 'unlimited' | rewards | Redemption limit frequency | Options: 'one-time', 'monthly', 'weekly', 'unlimited' |
| redemption_quantity | INTEGER | DEFAULT 1 | rewards | How many per period | 1-10, NULL for unlimited |
| redemption_type | VARCHAR(50) | NOT NULL DEFAULT 'instant' | rewards | Redemption process type | Options: 'instant' (gift_card, commission_boost, spark_ads, physical_gift, experience), 'scheduled' (discount) |
| expires_days | INTEGER | | rewards | Expiration | NULL = no expiration |
| display_order | INTEGER | | rewards | Admin UI sorting | |
| created_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |

**value_data JSONB Examples:**

```json
// gift_card
{"amount": 50}

// commission_boost
{"percent": 5, "duration_days": 30}

// spark_ads
{"amount": 100}

// discount
{
  "percent": 10,
  "duration_minutes": 1440,
  "max_uses": 100,
  "coupon_code": "GOLD10"
}

// physical_gift
{
  "requires_size": true,
  "size_category": "clothing",
  "size_options": ["S", "M", "L", "XL"]
}

// experience
{} // Uses description field instead
```

**Constraints:**
```sql
CONSTRAINT check_quantity_with_frequency CHECK (
  (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
  (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
)

CONSTRAINT check_preview_tier CHECK (
  preview_from_tier IS NULL OR
  preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
)

CONSTRAINT check_discount_value_data CHECK (
  type != 'discount' OR (
    value_data->>'percent' IS NOT NULL AND
    (value_data->>'percent')::numeric BETWEEN 1 AND 100 AND
    value_data->>'duration_minutes' IS NOT NULL AND
    (value_data->>'duration_minutes')::integer BETWEEN 10 AND 525600 AND
    value_data->>'coupon_code' IS NOT NULL AND
    LENGTH(value_data->>'coupon_code') BETWEEN 2 AND 8 AND
    value_data->>'coupon_code' ~ '^[A-Z0-9]+$' AND
    (value_data->>'max_uses' IS NULL OR (value_data->>'max_uses')::integer > 0)
  )
)
```

**Indexes:**
```sql
CREATE INDEX idx_rewards_client ON rewards(client_id);
CREATE INDEX idx_rewards_type ON rewards(type);
CREATE INDEX idx_rewards_tier ON rewards(tier_eligibility);
```


### 8.2 redemptions Table (Shared with Missions)

**Purpose:** Tracks claims for both rewards AND missions (shared table)

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT uuid_generate_v4() | redemptions | Redemption records | |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | redemptions | Content creator | |
| reward_id | UUID | REFERENCES rewards(id) ON DELETE CASCADE | redemptions | Which reward | |
| mission_progress_id | UUID | REFERENCES mission_progress(id) ON DELETE CASCADE | redemptions | Which mission completion (if mission-based) | NULL for VIP tier rewards, NOT NULL for ALL mission types (raffle, sales, videos, views, likes) |
| client_id | UUID | REFERENCES clients(id) ON DELETE CASCADE | redemptions | Multi-tenant isolation | |
| status | VARCHAR(50) | DEFAULT 'claimable' | redemptions | 5-state lifecycle | Options: 'claimable', 'claimed', 'fulfilled', 'concluded', 'rejected' |
| tier_at_claim | VARCHAR(50) | NOT NULL | redemptions | Eligibility snapshot (locked) | Prevents tier change from affecting redemption |
| redemption_type | VARCHAR(50) | NOT NULL | redemptions | Workflow type (locked at claim) | Options: 'instant', 'scheduled' - Locked from reward.redemption_type, determines fulfillment workflow |
| claimed_at | TIMESTAMP | | redemptions | When creator clicked "Claim" | |
| scheduled_activation_date | DATE | | redemptions | Date to activate | For discounts and commission boosts |
| scheduled_activation_time | TIME | | redemptions | Time in EST to activate | Discounts: 9 AM-4 PM EST, Boosts: 6 PM EST |
| google_calendar_event_id | VARCHAR(255) | | redemptions | Calendar reminder link | For scheduled rewards |
| fulfilled_at | TIMESTAMP | | redemptions | When admin marked fulfilled | |
| fulfilled_by | UUID | REFERENCES users(id) | redemptions | Which admin fulfilled | |
| fulfillment_notes | TEXT | | redemptions | Admin details | Gift card codes, tracking numbers, etc. |
| concluded_at | TIMESTAMP | | redemptions | Terminal concluded state | |
| rejection_reason | TEXT | | redemptions | Why rejected | For all rejection types: raffles, fraud, inventory, policy |
| rejected_at | TIMESTAMP | | redemptions | When rejected | |
| external_transaction_id | VARCHAR(255) | | redemptions | PayPal/Venmo transaction ID | Critical for payment reconciliation, refunds, dispute resolution |
| deleted_at | TIMESTAMP | | redemptions | Soft delete timestamp | For VIP tier changes (SchemaDecisions Fix 7) |
| deleted_reason | VARCHAR(100) | | redemptions | Why soft deleted | e.g., 'tier_change_tier_3_to_tier_2' |
| created_at | TIMESTAMP | DEFAULT NOW() | redemptions | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | redemptions | Audit | |

**Status Values:**
- `claimable`: Mission completed or tier achieved, reward available
- `claimed`: Creator clicked "Claim" button
- `fulfilled`: Admin completed action (shipped, activated, sent payment)
- `concluded`: Admin confirmed completion (TERMINAL state)
- `rejected`: Redemption rejected (TERMINAL state)

**Constraints:**
```sql
-- Redemption type validation
CHECK (redemption_type IN ('instant', 'scheduled'))

-- Prevent duplicate VIP tier reward redemptions (same user, same reward, same tier, same time)
UNIQUE(user_id, reward_id, tier_at_claim, claimed_at)
WHERE claimed_at IS NOT NULL

-- Prevent duplicate mission-based redemptions (SchemaDecisions Fix 2)
UNIQUE(user_id, mission_progress_id)
WHERE mission_progress_id IS NOT NULL
```

**Indexes:**
```sql
CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_tenant ON redemptions(client_id, user_id, status);
CREATE INDEX idx_redemptions_scheduled ON redemptions(scheduled_activation_date, scheduled_activation_time)
  WHERE scheduled_activation_date IS NOT NULL;
CREATE INDEX idx_redemptions_active ON redemptions(user_id, status, deleted_at)
  WHERE deleted_at IS NULL; -- Efficient queries for active (non-deleted) rewards
```

### 8.3 physical_gift_redemptions Table (Sub-State for Physical Gifts)

**Purpose:** Tracks size selection and shipping information for physical gift redemptions

```sql
CREATE TABLE physical_gift_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys (Class Table Inheritance pattern - ONE-TO-ONE with redemptions)
  redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Size information (for clothing/shoes only)
  requires_size BOOLEAN DEFAULT false,           -- Does this gift require size selection?
  size_category VARCHAR(50),                     -- 'clothing', 'shoes', NULL
  size_value VARCHAR(20),                        -- 'S', 'M', 'L', 'XL', '8', '9.5', etc.
  size_submitted_at TIMESTAMP,                   -- When user submitted size info

  -- Shipping information (for all physical gifts)
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_state VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100) DEFAULT 'USA',
  shipping_phone VARCHAR(50),
  shipping_info_submitted_at TIMESTAMP,

  -- Fulfillment tracking
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),                           -- 'FedEx', 'UPS', 'USPS', 'DHL'
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_size_required CHECK (
    (requires_size = false) OR
    (requires_size = true AND size_category IS NOT NULL AND size_value IS NOT NULL)
  )
);

CREATE INDEX idx_physical_gift_redemptions_redemption
  ON physical_gift_redemptions(redemption_id);
CREATE INDEX idx_physical_gift_redemptions_user
  ON physical_gift_redemptions(user_id, client_id);
CREATE INDEX idx_physical_gift_redemptions_shipped
  ON physical_gift_redemptions(shipped_at) WHERE shipped_at IS NOT NULL;
```

**Key Fields:**
- `redemption_id` → ONE-TO-ONE relationship with redemptions table (UNIQUE constraint)
- `requires_size` → Set based on reward configuration (clothing/shoes = true, other physical gifts = false)
- `size_category` + `size_value` → Required if `requires_size = true`
- `shipping_*` fields → Required for all physical gifts
- `tracking_number` + `carrier` → Populated by admin during fulfillment

**Why Sub-State Schema:**
- Keeps base `redemptions` table clean (no physical-gift-specific fields)
- Consistent with Commission Boost and Raffle patterns
- Allows different physical gift types (clothing with size, non-clothing without size)
- Includes shipping tracking for fulfillment workflow

### 8.4 Query Patterns for Sub-State Tables

**Design Decision:** Sub-state tables include `client_id` for multi-tenant isolation but do NOT duplicate `user_id` or `reward_id` from the parent `redemptions` table.

**Why keep client_id?** Required for database-level Row-Level Security (RLS) in multi-tenant SaaS. Composite FK constraint ensures it matches parent.

**Why remove user_id/reward_id?** Single source of truth prevents data inconsistency bugs. Access via joins through `redemption_id`.

#### Accessing Related Data Through Parent Table

**Example 1: Get Commission Boost with User Info**

```sql
-- SQL: Get pending payouts with user details (tenant-filtered)
SELECT
  cb.id,
  cb.boost_status,
  cb.final_payout_amount,
  cb.payment_account,
  u.tiktok_handle,
  u.email,
  r.name as reward_name
FROM commission_boost_redemptions cb
JOIN redemptions red ON cb.redemption_id = red.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE cb.boost_status = 'pending_payout'
  AND cb.client_id = $1;  -- Direct tenant filter (uses index)
```

```typescript
// Prisma: Get pending payouts (tenant-filtered)
const pendingPayouts = await prisma.commission_boost_redemptions.findMany({
  where: {
    boost_status: 'pending_payout',
    client_id: currentClientId  // Direct tenant filter
  },
  include: {
    redemption: {
      include: {
        user: { select: { tiktok_handle: true, email: true } },
        reward: { select: { name: true, type: true } }
      }
    }
  }
});

// Access data: payout.redemption.user.tiktok_handle
```

**Example 2: Get Physical Gift with Shipping Info**

```sql
-- SQL: Get unshipped gifts with user addresses (tenant-filtered)
SELECT
  pgr.id,
  pgr.shipping_address_line1,
  pgr.shipping_city,
  pgr.shipping_state,
  pgr.size_value,
  u.tiktok_handle,
  r.description as gift_name
FROM physical_gift_redemptions pgr
JOIN redemptions red ON pgr.redemption_id = red.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE pgr.shipped_at IS NULL
  AND pgr.client_id = $1  -- Direct tenant filter
ORDER BY red.claimed_at ASC;
```

```typescript
// Prisma: Get unshipped gifts (tenant-filtered)
const unshippedGifts = await prisma.physical_gift_redemptions.findMany({
  where: {
    shipped_at: null,
    client_id: currentClientId  // Direct tenant filter
  },
  include: {
    redemption: {
      include: {
        user: true,
        reward: { select: { description: true } }
      }
    }
  },
  orderBy: { redemption: { claimed_at: 'asc' } }
});
```

**Example 3: Get Raffle Participants**

```sql
-- SQL: Get all raffle participants with mission info (tenant-filtered)
SELECT
  rp.id,
  rp.is_winner,
  rp.participated_at,
  u.tiktok_handle,
  r.name as reward_name
FROM raffle_participations rp
JOIN redemptions red ON rp.redemption_id = red.id
JOIN missions m ON rp.mission_id = m.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE rp.mission_id = $1
  AND rp.is_winner IS NULL  -- Not yet selected
  AND rp.client_id = $2  -- Direct tenant filter
ORDER BY rp.participated_at ASC;
```

```typescript
// Prisma: Get raffle entries (tenant-filtered)
const raffleEntries = await prisma.raffle_participations.findMany({
  where: {
    mission_id: missionId,
    is_winner: null,
    client_id: currentClientId  // Direct tenant filter
  },
  include: {
    redemption: {
      include: {
        user: true,
        reward: true
      }
    },
    redemption: {
      select: {
        reward: { select: { name: true } }
      }
    }
  },
  orderBy: { participated_at: 'asc' }
});
```

**Performance Note:**
Indexes ensure fast joins and tenant filtering:
- `idx_boost_redemption` on `commission_boost_redemptions(redemption_id)`
- `idx_boost_tenant` on `commission_boost_redemptions(client_id, boost_status)`
- `idx_physical_gift_redemption` on `physical_gift_redemptions(redemption_id)`
- `idx_physical_gift_tenant` on `physical_gift_redemptions(client_id, shipped_at)`
- `idx_raffle_redemption` on `raffle_participations(redemption_id)`
- `idx_raffle_tenant` on `raffle_participations(client_id, mission_id)`

Direct `client_id` filtering uses indexes for fast tenant isolation (~2-5ms). Composite FK constraints prevent data inconsistency bugs.

---

## 9. EDGE CASES

### 9.1 Redemption Limit Reached

**Scenario:**
```
Reward: "$50 Gift Card"
Limit: 2 per month

Jan 5: Creator claims (1 of 2 used)
Jan 10: Creator claims (2 of 2 used)
Jan 15: Creator tries to claim again
```

**Behavior:**
- "Claim" button disabled
- Limit counter shows: "2 of 2 used this month"
- Badge shows: "Limit Reached"
- Tooltip: "Resets on February 1"

### 9.2 Scheduled Discount Active Limit

**Scenario:**
```
Reward: "Follower Discount: 10%"
Limit: 1 active scheduled discount at a time

Jan 5: Creator schedules discount for Jan 12
Jan 6: Creator tries to schedule another discount
```

**Behavior:**
- "Schedule" button disabled
- Message: "You have an active scheduled discount (Jan 12). Complete it first."
- After Jan 12 fulfillment → Can schedule new discount

**Why limit?**
- TikTok Seller Center only supports one active discount per creator
- Prevents scheduling conflicts

### 9.3 Tier Demotion During Scheduled Redemption

**Scenario:**
```
Jan 5: Gold creator schedules "15% Discount" for Jan 12
  redemptions.tier_at_claim = 'tier_3'
  redemptions.scheduled_activation_at = 'Jan 12, 2:00 PM'

Jan 8: Creator demoted to Silver
  current_tier = 'tier_2'
  "15% Discount" reward no longer visible (auto-replace)

Jan 12: Admin activates discount
```

**Behavior:**
- Redemption still processes (tier_at_claim='tier_3')
- Admin activates 15% discount (earned while Gold)
- Creator receives reward despite demotion

**Why important?**
- Fair to creators (they scheduled it while eligible)
- Prevents tier change from canceling scheduled redemptions

### 9.4 Reward Disabled After Claim

**Scenario:**
```
Jan 5: Creator claims "$50 Gift Card"
  redemptions.status = 'pending'

Jan 6: Admin disables "$50 Gift Card" reward
  rewards.enabled = false

Jan 10: Admin fulfills redemption
```

**Behavior:**
- Redemption still processes (already claimed)
- Admin fulfills normally
- Future creators cannot claim (reward disabled)

**Why important?**
- Pending redemptions honored
- Admin can remove rewards mid-period without affecting pending claims

### 9.5 Creator Removed Mid-Fulfillment

**Scenario:**
```
Jan 5: Creator claims "$50 Gift Card"
  redemptions.status = 'pending'

Jan 8: Creator removed from platform (account deleted)
  users.deleted_at = NOW()

Jan 10: Redemption still in admin queue
```

**Behavior:**
- Redemption shown in admin queue with "(Deleted User)" label
- Admin can:
  - Fulfill (if creator provided contact info)
  - Reject with reason "User account deleted"

### 9.6 Period Transition (Monthly → Weekly)

**Scenario:**
```
Reward: "$25 Gift Card"
Original: redemption_frequency='monthly', redemption_quantity=2

Jan 5: Creator claims (1 of 2 used this month)
Jan 10: Admin changes to weekly, quantity=1
Jan 15: Creator claims again
```

**Behavior:**
- Query counts claims in current WEEK (Jan 12-18)
- Previous claim (Jan 5) not counted (different week)
- Creator can claim (0 of 1 used this week)

**Why important?**
- Admin edits can reset limits mid-period
- Query always uses current frequency setting

---

### 9.7 Commission Boost Specific Edge Cases

#### Edge Case 1: Tier Change During Active Boost

**Scenario:**
```
Day 1:  Gold creator (tier_3) claims "Pay Boost: 5%" (commission_boost, tier rate = 10%)
        Commission rates locked at claim:
          - tier_commission_rate = 10.0
          - boost_commission_rate = 5.0

Day 15: Daily cron activates boost at 6 PM EST
        Boost runs with locked rates

Day 20: Creator demoted to Silver (tier_2, tier rate = 7%)
        current_tier changes, but boost continues

Day 45: Boost expires
        Sales delta: $1,000
        Calculated payout: $1,000 × 5% = $50
```

**Behavior:**
- Boost continues with rates locked at claim time
- Creator's actual TikTok earnings: $1,000 × 7% = $70 (current Silver tier)
- Creator's boost payment from us: $1,000 × 5% = $50

**Email Shows:**
```
Your Tier Commission (10%): $100  ← Shows LOCKED rate from claim
  → Note: Your current tier rate is 7%. Your boost used your tier rate at claim time (10%).
  → TikTok pays you 7% on current sales.

Your Boost Commission (5%): $50
  → We'll pay you this amount
```

**Why This Matters:**
- Prevents confusion about tier rate mismatch
- Ensures creator understands why tier commission shown ≠ TikTok payout
- Transparency builds trust

---

#### Edge Case 2: Negative Sales During Boost

**Scenario:**
```
Day 1:  Boost activates
        sales_at_activation (D0): $2,000

Day 30: Boost expires
        sales_at_expiration (DX): $1,800
        sales_delta: $1,800 - $2,000 = -$200 (negative!)
```

**Cause:**
- More returns than new sales during boost period
- Cruva shows cumulative GMV (includes returns)
- Post-purchase returns reduce cumulative total

**Behavior:**
- System calculates: -$200 × 5% = -$10 (negative payout)
- **Floor at $0:** `final_payout_amount = MAX(calculated_amount, 0)`
- Admin receives alert: "Creator @handle has negative sales delta during boost"

**Admin Workflow:**
1. Review: Check if legitimate (high return rate) or data error
2. Options:
   - **If legitimate:** Set payout = $0, send explanation email
   - **If data error:** Investigate Cruva data, adjust manually
3. Mark as concluded with notes

**Email to Creator (if legitimate):**
```
Subject: Pay Boost Update - No Payout Due to Returns

Hi @creator,

Your Pay Boost period has ended. However, due to a high number of returns
during the boost period, your net sales were negative.

Sales at Start: $2,000
Sales at End: $1,800
Net Sales: -$200

Since your sales decreased during the boost (due to returns), there is no
boost commission payment for this period.

Don't worry - this doesn't affect your regular tier commission from TikTok,
and you can claim future boosts normally.

Questions? Contact us at support@...
```

---

#### Edge Case 3: Payment Method No Longer Valid

**Scenario:**
```
Day 1:  Creator submits payment info
        payment_method: 'venmo'
        payment_account: '@old_account'

Day 18: Admin attempts to send payment via Venmo
        Error: "User not found" or "Account closed"
```

**Admin Workflow:**

**Step 1: Contact Creator**
- Admin sends email: "We couldn't send your payment to @old_account. Please update your payment info."
- Email includes link to edit payment info

**Step 2: Creator Updates Info**
- Creator logs in
- Goes to Rewards → History → Finds boost
- Clicks "Edit Payment Info"
- Enters new account: '@new_account'
- System updates `commission_boost_redemptions`

**Step 3: Admin Retries Payment**
- Admin sees updated payment info in queue
- Admin sends payment to new account
- Admin marks as paid

**If Creator Doesn't Respond:**
- After 7 days: Send reminder email
- After 14 days: Send final reminder
- After 30 days: Admin can:
  - Hold payment indefinitely (keep in pending_payout)
  - OR Cancel payout with reason "Unable to contact creator"

**No Automated Retry (MVP):**
- All retries are manual admin-initiated
- Can add automated retry system post-MVP if failure rate >10%

---

#### Edge Case 4: Sales Discrepancy (TikTok vs Cruva Data)

**Scenario:**
```
Boost Period: Jan 15 - Feb 14

At D0 (Jan 15): Cruva shows $1,250
At DX (Feb 14): Cruva shows $1,825
Sales Delta (Cruva): $575
Calculated Payout: $575 × 5% = $28.75

At D+45 (Mar 31): Admin checks TikTok Seller Dashboard
TikTok shows: Jan 15 - Feb 14 sales = $500
Discrepancy: $575 (Cruva) vs $500 (TikTok) = $75 difference (15%)
```

**Cause:**
- Cruva data includes sales attributed to videos from boost period
- TikTok dashboard shows actual checkout-date sales
- Different attribution windows
- Data sync delays

**Admin Workflow:**

**Step 1: Identify Discrepancy**
- Admin compares Cruva GMV vs TikTok dashboard
- If >5% difference: Requires investigation

**Step 2: Investigate Root Cause**
- Check Cruva sync logs for errors
- Check TikTok API response codes
- Verify video attribution windows
- Contact Cruva support if needed

**Step 3: Decide on Adjustment**

**Option A: Trust TikTok Data (Conservative)**
- Adjust payout to match TikTok: $500 × 5% = $25.00
- Adjustment reason: "TikTok seller dashboard shows $500 sales. Adjusted to match TikTok as source of truth."
- Reduces payout by $3.75

**Option B: Trust Cruva Data (Liberal)**
- Keep original payout: $28.75
- Reason: "Cruva includes longer attribution window. Benefit to creator."

**Option C: Split Difference (Compromise)**
- Average both sources: (($575 + $500) / 2) = $537.50
- Payout: $537.50 × 5% = $26.88
- Reason: "Discrepancy between Cruva and TikTok. Used average of both sources."

**Step 4: Document Decision**
- Update `final_payout_amount`
- Enter detailed `adjustment_reason`
- Log to `commission_boost_state_history`

**Step 5: Communicate (Optional)**
- If adjustment >$5: Send email explaining discrepancy
- Build trust through transparency

**Learning Loop Impact:**
- Track discrepancy rate across first 10 payouts
- If consistently >5%: Continue manual review for all future payouts
- If consistently <5%: Automate payout calculation, only review flagged cases

---

#### Edge Case 5: Boost Disabled After Scheduling

**Scenario:**
```
Day 1:  Creator schedules boost for Day 7
        redemptions.status = 'claimed'
        commission_boost_redemptions.boost_status = 'scheduled'

Day 3:  Admin disables commission boost reward
        rewards.enabled = false

Day 7:  Scheduled activation time arrives
```

**Behavior:**
- **Scheduled boosts still activate** (honor creator's claim)
- Reward no longer visible to other creators (future claims blocked)
- Creator's scheduled boost runs normally
- After completion: Next creators cannot claim (reward disabled)

**Why:**
- Fair to creator (they claimed while reward was enabled)
- `tier_at_claim` and scheduled dates are locked at claim time
- Prevents admin from retroactively canceling scheduled rewards

**Database:**
- `rewards.enabled = false` only affects NEW claims
- Existing redemptions (status = 'claimed' or later) continue

---

#### Edge Case 6: Creator Suspended During Boost

**Scenario:**
```
Day 1:  Boost activates, runs normally
Day 15: Creator suspended for policy violation
        users.suspended = true
Day 30: Boost expires
```

**Behavior (MVP):**
- **Out of scope** for automated handling
- Admin manually decides case-by-case:
  - **Option A:** Continue payout (technical completion despite suspension)
  - **Option B:** Cancel payout (policy violation forfeits earnings)

**Manual Admin Workflow:**
1. Boost reaches 'pending_payout' status
2. Admin sees "🚨 Suspended User" flag in payout queue
3. Admin reviews suspension reason
4. Admin decides:
   - If proceed: Mark as paid normally
   - If cancel: Set `boost_status = 'rejected'`, enter rejection_reason

**Post-MVP Enhancement:**
- Add `rewards.suspension_policy` field
- Options: 'forfeit', 'honor', 'manual_review'
- Automate decision based on policy

---

#### Edge Case 7: Multiple Boosts Scheduled for Same Date

**Scenario:**
```
Creator has 2 active scheduled boosts:
- Boost A: 5% for 30 days, scheduled for Jan 15
- Boost B: 5% for 30 days, scheduled for Jan 15
```

**Prevention (NOT an edge case - BLOCKED):**
- **Rule:** Only 1 active scheduled commission_boost per creator at a time
- Enforced at claim time:
  ```sql
  SELECT COUNT(*) FROM commission_boost_redemptions cbr
  JOIN redemptions r ON cbr.redemption_id = r.id
  WHERE r.user_id = creator_id
    AND cbr.client_id = current_client_id
    AND cbr.boost_status IN ('scheduled', 'active')

  IF count > 0:
    BLOCK claim with message: "You already have an active or scheduled Pay Boost. Complete it first."
  ```

**Why Limit:**
- Simplifies payout calculation (avoid overlapping periods)
- Prevents confusion about which boost is active
- Aligns with redemption limit rules

**After First Boost Ends:**
- Creator can schedule another boost
- No limit on total lifetime boosts (just 1 concurrent)

---

## 10. EXAMPLE SCENARIOS

### 10.1 Normal Instant Redemption (Gift Card)

**Setup:** Gold creator, "$50 Gift Card" (monthly limit: 2)

**Timeline:**
```
Jan 5:  Creator sees "$50 Gift Card" (0 of 2 used this month)
        Clicks "Claim"
        Success message: "Reward claimed! You'll receive it soon."
        Counter updates: 1 of 2 used this month

Jan 6:  Admin sees redemption in queue
        Purchases $50 Amazon gift card
        Emails code to creator: ABCD-EFGH-IJKL
        Marks as fulfilled
        Fulfillment notes: "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com"

Jan 6:  Creator receives email: "Your Gift Card: $50 has been delivered!"
        Redemption moves to history

Jan 20: Creator claims again (2 of 2 used this month)
Jan 25: Creator tries to claim → Button disabled (limit reached)
Feb 1:  Counter resets (0 of 2 used this month)
Feb 2:  Creator can claim again
```

### 10.2 Scheduled Discount Flow

**Setup:** Platinum creator, "Follower Discount: 15%" (monthly limit: 1)

**Timeline:**
```
Jan 5:  Creator sees "Follower Discount: 15%"
        Clicks "Schedule"
        Modal appears with date/time picker (weekdays only, 9 AM - 4 PM EST slots)

Jan 5:  Creator selects:
        Date: Jan 12, 2025 (Wednesday)
        Time: 2:00 PM EST
        Clicks "Confirm"

Jan 5:  System creates:
        - Redemption (status='claimed', scheduled_activation_date='2025-01-12', scheduled_activation_time='14:00:00')
        - Google Calendar event (reminder at Jan 12, 1:30 PM EST)

Jan 5:  Success message: "Success! Your discount will be activated on Jan 12 at 2:00 PM EST"
        Counter updates: 1 of 1 used this month

Jan 12, 1:30 PM EST:
        Google Calendar reminder fires
        Admin sees: "Activate discount for @creator_handle in 30 minutes"

Jan 12, 2:00 PM EST:
        Admin activates 15% discount in TikTok Seller Center
        Marks as concluded
        Fulfillment notes: "Discount activated on Jan 12 at 2:00 PM EST, expires Jan 19"

Jan 12, 2:05 PM EST:
        Creator receives email: "Your Follower Discount: 15% has been activated!"
        Redemption moves to history

Feb 1:  Counter resets (0 of 1 used this month)
```

### 10.3 Tier Upgrade Mid-Period (Auto-Replace)

**Setup:** Silver creator promoted to Gold mid-January

**Timeline:**
```
Jan 1:  Silver creator (tier_2)
        Rewards visible:
          - "$25 Gift Card" (monthly limit: 2)
          - "10% Commission Boost" (monthly limit: 1)

Jan 5:  Creator claims "$25 Gift Card" (1 of 2 used)
Jan 6:  Admin fulfills gift card

Jan 15: Creator promoted to Gold (tier_3)
        tier_achieved_at = Jan 15

Jan 15: Rewards auto-replace:
        VISIBLE NOW:
          - "$50 Gift Card" (monthly limit: 2)
          - "15% Commission Boost" (monthly limit: 2)
          - "$100 Spark Ads Budget" (monthly limit: 1)

        GONE:
          - "$25 Gift Card" (no longer visible)
          - "10% Commission Boost" (no longer visible)

Jan 20: Creator claims "$50 Gift Card" (0 of 2 used this month)
        Note: Gold reward has independent counter (not affected by Silver claim)

Feb 1:  Counters reset for ALL Gold rewards
        Note: If demoted back to Silver, Silver rewards reappear with reset counters
```

### 10.4 Redemption Limit Edge Case (Reward-Type-Specific)

**Setup A:** Bronze creator, "Pay Boost: 3%" (one-time, commission_boost - once per tier)

**Timeline:**
```
Day 1:  Bronze creator joins
        tier_achieved_at = Day 1

Day 5:  Creator claims "Pay Boost: 3%" (one-time, commission_boost)
        redemptions.tier_at_claim = 'tier_1'

Day 10: Creator tries to claim again → Button disabled (one-time limit)

Day 30: Creator promoted to Silver
        tier_achieved_at = Day 30
        "Pay Boost: 3%" disappears (auto-replace)

Day 60: Creator demoted back to Bronze
        tier_achieved_at = Day 60 (NEW timestamp)
        "Pay Boost: 3%" reappears

Day 65: Can creator claim "Pay Boost: 3%" again?
        YES - New tier achievement period (Day 60 vs Day 1)
        Performance boosts reset per tier achievement
```

**Setup B:** Bronze creator, "$10 Gift Card" (one-time, gift_card - once forever)

**Timeline:**
```
Day 1:  Bronze creator joins

Day 5:  Creator claims "$10 Gift Card" (one-time, gift_card)

Day 30: Creator promoted to Silver
        "$10 Gift Card" disappears (auto-replace)

Day 60: Creator demoted back to Bronze
        "$10 Gift Card" reappears

Day 65: Can creator claim "$10 Gift Card" again?
        NO - Gift cards are once forever (lifetime restriction)
        Button shows "Already Claimed"
```

### 10.5 Multiple Rewards Same Period

**Setup:** Gold creator, multiple rewards available

**Timeline:**
```
Jan 5:  Gold creator (tier_3)
        Rewards visible:
          - "$50 Gift Card" (monthly limit: 2) - 0 of 2 used
          - "15% Commission Boost" (monthly limit: 1) - 0 of 1 used
          - "$100 Spark Ads Budget" (one-time) - Available
          - "Wireless Headphones" (one-time) - Available

Jan 5:  Creator claims:
        1. "$50 Gift Card" (1 of 2 used)
        2. "15% Commission Boost" (1 of 1 used)
        3. "$100 Spark Ads Budget" (claimed)

Jan 6:  Admin fulfills all 3 redemptions

Jan 10: Creator claims "$50 Gift Card" again (2 of 2 used)
Jan 11: Creator tries "15% Commission Boost" → Limit reached (1 of 1 used)

Jan 15: Creator claims "Wireless Headphones" (4th reward this month)

Result: Creator claimed 4 different rewards in January
        - 2x "$50 Gift Card" (monthly limit)
        - 1x "15% Commission Boost" (monthly limit)
        - 1x "$100 Spark Ads Budget" (one-time)
        - 1x "Wireless Headphones" (one-time)
```

**Key:** Each reward has independent redemption counter.

---

## 11. CRITICAL RULES

### 11.1 Implementation Rules

1. **Tier Filtering:** Always use `WHERE tier_eligibility = current_tier` (exact match, not >=)
2. **Auto-Replace:** On tier change, re-query rewards with new `current_tier` (automatic)
3. **Lock tier_at_claim:** Always save `current_tier` to `tier_at_claim` when creating redemption
4. **Period Calculation:** Use calendar boundaries (Jan 1, Feb 1) for monthly/weekly, NOT user-specific dates
5. **One-Time Period:** Reward-type-specific (forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
6. **Redemption Type:** Hardcode per reward type (discount=scheduled, all others=instant)
7. **Scheduled Validation:** Only allow scheduling 1-7 days ahead (prevent far-future scheduling)
8. **Preview Direction:** Lower tiers see higher (with preview_from_tier), NOT vice versa
9. **Status Lifecycle:** 5-state system (claimable → claimed → fulfilled → concluded | rejected)
10. **Name Generation:** Auto-generate names for Category 1, use description for Category 2

### 11.2 Common Misconceptions

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| tier_eligibility is minimum threshold (Gold sees Silver rewards) | tier_eligibility is exact match (Gold ONLY sees Gold rewards) |
| Rewards reset at checkpoint | Rewards reset at calendar period (monthly/weekly) |
| Tier change cancels pending redemptions | Tier change locks tier_at_claim (redemptions still process) |
| One-time means same for all rewards | One-time is reward-type-specific (forever for tangibles, per tier for boosts) |
| Unlimited has redemption_quantity=0 | Unlimited has redemption_quantity=NULL |
| All rewards instant | Discount is scheduled (creator picks time) |
| Monthly period starts from claim | Monthly period follows calendar (Jan 1, Feb 1, etc.) |
| Creator can claim after limit | Frontend disables button when limit reached |
| Rewards track progress | Rewards are instant (no progress tracking) |
| Higher tiers see lower tier rewards | Higher tiers ONLY see their tier (auto-replace) |

### 11.3 Data Integrity Rules

1. **Every reward MUST have:** type, tier_eligibility, redemption_frequency, redemption_type, enabled
2. **Category 1 rewards MUST have:** value_data JSONB (e.g., `{"amount": 50}`)
3. **Category 2 rewards MUST have:** description VARCHAR(15) (e.g., "Headphones", max 15 chars)
4. **redemption_frequency='unlimited' MUST have:** redemption_quantity=NULL
5. **redemption_frequency!='unlimited' MUST have:** redemption_quantity between 1-10
6. **redemption_type='scheduled' MUST have:** scheduled_activation_at timestamp in redemptions table
7. **tier_at_claim MUST be locked** at redemption creation (never updated after)
8. **status transitions MUST follow:** pending → fulfilled/rejected (no skipping)
9. **Scheduled redemptions MUST have:** google_calendar_event_id for admin reminders
10. **preview_from_tier MUST be** NULL or valid tier value (tier_1, tier_2, etc.)

---

## APPENDIX: QUICK REFERENCE

### Reward Types Summary

| Type | Commercial Name | Category | Redemption | Example |
|------|----------------|----------|------------|---------|
| gift_card | Gift Card | 1 | Instant | "Gift Card: $50" |
| commission_boost | Pay Boost | 1 | Instant | "Pay Boost: 5%" |
| spark_ads | Reach Boost | 1 | Instant | "Reach Boost: $100" |
| discount | Deal Boost | 1 | Scheduled | "Deal Boost: 10%" |
| physical_gift | Gift Drop | 2 | Instant | "Gift Drop: Headphones" |
| experience | Mystery Trip | 2 | Instant | "Mystery Trip: VIP Event" |

### Redemption Frequency

| Frequency | Reset Trigger | Example Period |
|-----------|---------------|----------------|
| one-time (forever) | Never | gift_card/physical_gift/experience: Once ever (no reset) |
| one-time (per tier) | Tier re-achievement | commission_boost/spark_ads/discount: Resets on demotion/promotion |
| monthly | Calendar month | Jan 1 → Feb 1 → Mar 1 |
| weekly | Calendar week | Sunday → Sunday |
| unlimited | Never | No limit |

### Status Flow

```
pending → fulfilled
   ↓
rejected (raffle only)
```

### Tier Change Behavior

**Rewards:** Auto-replace (old tier disappears, new tier appears)
**Pending redemptions:** Still process (tier_at_claim locked)

### Redemption Types

- **Instant:** All types EXCEPT discount
- **Scheduled:** Discount only (creator picks activation time)

---

**END OF REWARDS.MD**
