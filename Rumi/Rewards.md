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
| **physical_gift** | `name` field | "Gift Drop: Luxury Headphones" | "Wireless headphones" |
| **experience** | `name` field | "Mystery Trip: VIP Event Access" | "VIP access to Brand event" |

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
| **commission_boost** | Instant | Immediately after claim |
| **spark_ads** | Instant | Immediately after claim |
| **physical_gift** | Instant | Immediately after claim (admin ships) |
| **experience** | Instant | Immediately after claim (admin coordinates) |
| **discount** | **Scheduled** | Creator picks activation date/time |

**Key Difference:**
- **Instant:** Creator clicks "Claim" → Enters fulfillment queue immediately
- **Scheduled:** Creator clicks "Claim" → Picks activation date → Enters fulfillment queue

**Only `discount` uses scheduled redemption** (TikTok Seller Center activation requires timing).

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
  "percent": 10  // Discount percentage
}
```

**Category 2 Rewards (Freeform):**
```
// physical_gift
description = "Luxury wireless headphones"

// experience
description = "VIP access to Brand event"
```

---

## 3. CREATOR UI ELEMENTS

### 3.1 What Creators See

**Rewards Tab Components:**
1. **Reward Cards** - Grid of available rewards
2. **Reward Name** - Auto-generated or custom
3. **Description** - Reward details (if applicable)
4. **Tier Badge** - Which tier this reward is for
5. **Limit Counter** - "X of Y used this month" (if limited)
6. **Claim Button** - "Claim" or "Schedule" (discount only)
7. **Status Badge** - "Available", "Claimed", "Limit Reached"

**Example Reward Card (Gift Card):**
```
┌─────────────────────────────────────┐
│ 💳 Gift Card: $50                   │
│ Gold Tier Reward                    │
│                                     │
│ Redeem for Amazon gift card         │
│                                     │
│ Limit: 2 of 2 used this month       │
│ [Limit Reached]                     │
└─────────────────────────────────────┘
```

**Example Reward Card (Commission Boost):**
```
┌─────────────────────────────────────┐
│ 📈 Pay Boost: 5%                    │
│ Silver Tier Reward                  │
│                                     │
│ Increase your commission for 30 days│
│                                     │
│ Limit: 0 of 1 used this month       │
│ [Claim]                             │
└─────────────────────────────────────┘
```

**Example Reward Card (Discount - Scheduled):**
```
┌─────────────────────────────────────┐
│ 🎯 Follower Discount: 10%           │
│ Platinum Tier Reward                │
│                                     │
│ Schedule TikTok discount activation │
│                                     │
│ Limit: 0 of 1 used this month       │
│ [Schedule]                          │
└─────────────────────────────────────┘
```

### 3.2 Multiple Rewards Display

Creators can see multiple rewards simultaneously (all tier-specific rewards):

```
Rewards Tab (Gold Creator):

┌─────────────────────────┐
│ 💳 Gift Card: $50       │
│ [Claim]                 │
└─────────────────────────┘

┌─────────────────────────┐
│ 📈 Pay Boost: 15%       │
│ [Claim]                 │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎁 Spark Ads: $100      │
│ Limit: 2 of 2 used      │
│ [Limit Reached]         │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎁 Gift Drop: Headphones│
│ One-time reward         │
│ [Claimed ✓]             │
└─────────────────────────┘
```

**Key:** All rewards for current tier shown, filtered by redemption limits.

### 3.3 Scheduling Interface (Discount-Only)

**Flow:**
1. Creator clicks "Schedule" on discount reward
2. Modal appears with date/time picker
3. Creator selects activation date (up to 7 days ahead)
4. Creator selects time (10:00 AM - 6:30 PM Eastern Time)
5. System converts to Brazil time (UTC-3)
6. Creates redemption with `scheduled_activation_at`

**Example Modal:**
```
┌─────────────────────────────────────────┐
│ Schedule Discount Activation            │
│                                         │
│ When do you want to activate this       │
│ discount?                               │
│                                         │
│ Date: [Jan 12, 2025 ▼]                 │
│ Time: [2:00 PM EST ▼]                  │
│                                         │
│ ⚠ Choose a time when you're available  │
│   to activate in TikTok Seller Center   │
│                                         │
│ Times shown in Eastern Time (EST/EDT)  │
│                                         │
│ [Cancel]              [Confirm]         │
└─────────────────────────────────────────┘
```

### 3.4 Locked Rewards (Preview Feature)

If admin sets `preview_from_tier`, lower tiers see locked rewards:

**Example (Silver creator seeing Gold reward):**
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

---

## 4. ADMIN CONFIGURATION

### 4.1 Creating a Reward

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
- Enter custom description (e.g., "Luxury wireless headphones")
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

**Step 5 (Optional): Expiration**
- Set days until reward expires (e.g., 30 days)
- NULL = no expiration
- Use case: Limited-time promotions

**Step 6 (Optional): Preview Visibility**
- Set `preview_from_tier` to show locked reward to lower tiers
- NULL = only eligible tier sees it
- tier_1 = Bronze+ can preview (locked if below tier_eligibility)
- Use case: Motivate tier upgrades

**Step 7: Enable**
- Toggle enabled/disabled
- Disabled rewards hidden from creators

### 4.2 Modifiable Fields Summary

| Field | Required | Type | Purpose |
|-------|----------|------|---------|
| type | Yes | Dropdown | gift_card, commission_boost, spark_ads, discount, physical_gift, experience |
| value_data | Category 1 only | JSONB | {"amount": 50}, {"percent": 5, "duration_days": 30} |
| description | Category 2 only | Text | "Luxury wireless headphones", "VIP event access" |
| name | Auto-generated | String | System generates from type + value |
| tier_eligibility | Yes | Dropdown | tier_1, tier_2, tier_3, tier_4, tier_5, tier_6 |
| redemption_frequency | Yes | Dropdown | one-time, monthly, weekly, unlimited |
| redemption_quantity | Yes | Integer | 1-10 (NULL for unlimited) |
| redemption_type | Auto-assigned | String | instant or scheduled (hardcoded per type) |
| expires_days | No | Integer | Days until expiration (NULL = never) |
| preview_from_tier | No | Dropdown | NULL, tier_1, tier_2, tier_3, tier_4, tier_5, tier_6 |
| enabled | Yes | Boolean | Toggle on/off |
| display_order | No | Integer | Admin UI sorting |

### 4.3 Editing & Disabling Rewards

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

## 5. REDEMPTION FLOW

### 5.1 Instant Redemption (gift_card, commission_boost, spark_ads, physical_gift, experience)

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
    status = 'pending',
    tier_at_claim = current_tier, -- Locked at claim time
    redemption_type = 'instant',
    claimed_at = NOW()
  )
  ```

**Step 4: UI Feedback**
- Success message: "Reward claimed! You'll receive it soon."
- Reward card shows "Claimed" badge
- Limit counter updates: "1 of 2 used this month"

**Step 5: Admin Fulfillment**
- Redemption appears in Admin Fulfillment Queue
- Admin completes task (purchase gift card, activate boost, etc.)
- Admin marks as fulfilled
- Creator receives notification

### 5.2 Scheduled Redemption (discount)

**Flow:**

**Step 1: Creator Browses Rewards**
- Navigate to Rewards tab
- Sees discount reward with "Schedule" button

**Step 2: Creator Clicks "Schedule"**
- Modal appears with date/time picker
- Creator selects activation date (up to 7 days ahead)
- Creator selects time (10:00 AM - 6:30 PM Eastern Time)
- Time picker shows: "Times shown in Eastern Time (EST/EDT)"

**Step 3: Timezone Conversion**
- Creator's selection: Jan 12, 2:00 PM EST (UTC-5)
- System converts to Brazil time: Jan 12, 4:00 PM Brazil (UTC-3)
- Stores in `scheduled_activation_at` field

**Step 4: Create Redemption Record**
- Insert to `redemptions` table:
  ```sql
  INSERT INTO redemptions (
    user_id = creator_id,
    reward_id = reward_id,
    status = 'pending',
    tier_at_claim = current_tier,
    redemption_type = 'scheduled',
    scheduled_activation_at = '2025-01-12 19:00:00 UTC', -- Brazil time
    claimed_at = NOW()
  )
  ```

**Step 5: Google Calendar Event**
- System creates Google Calendar event for admin
- Event time: 30 minutes before activation
- Reminder: "Activate discount for [creator_handle]"
- Event ID stored in `google_calendar_event_id`

**Step 6: UI Feedback**
- Success message: "Success! Your discount will be activated on Jan 12 at 2:00 PM EST"
- Reward card shows scheduled date
- Limit counter updates

**Step 7: Admin Fulfillment (At Scheduled Time)**
- Google Calendar reminder fires
- Admin activates discount in TikTok Seller Center
- Admin marks as fulfilled
- Creator receives notification

### 5.3 Admin Fulfillment Process

**Admin Dashboard View:**

**Fulfillment Queue Table:**
| Creator | Reward | Type | Claimed | Hours Remaining | Status |
|---------|--------|------|---------|-----------------|--------|
| @creator1 | Gift Card: $50 | Instant | Jan 5, 2:00 PM | 18h | Pending |
| @creator2 | Pay Boost: 5% | Instant | Jan 5, 3:00 PM | 17h | Pending |
| @creator3 | Follower Discount: 10% | Scheduled | Jan 12, 2:00 PM | 156h | Scheduled |

**Fulfillment Actions:**

**For Instant Rewards:**
1. Admin completes operational task:
   - **Gift Card:** Purchase on Amazon, email code to creator
   - **Commission Boost:** Activate in TikTok Seller Center for creator's account
   - **Spark Ads:** Set up Spark Ads campaign for creator's content
   - **Physical Gift:** Ship product to creator's address
   - **Experience:** Coordinate event access with creator

2. Admin clicks "Mark as Fulfilled"
3. Admin enters fulfillment notes:
   - "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com"
   - "Commission boost activated, expires Feb 15"
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

**For Scheduled Rewards:**
1. Google Calendar reminder fires 30 minutes before
2. Admin prepares to activate discount
3. At scheduled time, admin activates in TikTok Seller Center
4. Admin marks as fulfilled (same as instant)

### 5.4 Redemption Records

**Every redemption creates a record:**

```sql
{
  id: UUID,
  user_id: creator_id,
  reward_id: reward_id,
  status: 'pending' | 'fulfilled' | 'rejected',
  tier_at_claim: 'tier_3', -- Locked at claim time
  claimed_at: '2025-01-05 14:00:00',
  redemption_type: 'instant' | 'scheduled',
  scheduled_activation_at: '2025-01-12 19:00:00 UTC', -- If scheduled
  fulfilled_at: '2025-01-06 10:00:00', -- When admin fulfilled
  fulfilled_by: admin_id,
  fulfillment_notes: 'Gift card code: ABCD-EFGH-IJKL'
}
```

**Why lock `tier_at_claim`?**
- Creator claims $50 Gift Card as Gold
- Gets demoted to Silver before fulfillment
- Still receives $50 card (earned while Gold)
- Prevents tier change from affecting pending redemptions

---

## 6. REDEMPTION LIMITS & FREQUENCY

### 6.1 redemption_quantity Field (1-10 per period)

**Purpose:** How many times creator can claim reward per frequency period

**Values:** 1-10 (NULL for unlimited)

**Examples:**
- `redemption_quantity: 1` = Claim once per period
- `redemption_quantity: 2` = Claim twice per period
- `redemption_quantity: 5` = Claim 5 times per period
- `redemption_quantity: NULL` = Unlimited (only with `redemption_frequency: 'unlimited'`)

### 6.2 redemption_frequency Field

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

### 6.3 Redemption Limit Logic

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

### 6.4 Creator UI Display

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

### 6.5 Edge Cases

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

## 7. TIER TARGETING & AUTO-REPLACE

### 7.1 tier_eligibility Field (Exact Match)

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

### 7.2 Tier Change Behavior (Auto-Replace)

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

### 7.3 Pending Redemptions During Tier Change

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

### 7.4 Preview Visibility (Optional)

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

### 7.5 Visibility Direction

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

## 8. REDEMPTION STATUS FLOW

### 8.1 Status State Machine

```
pending → fulfilled
   ↓
rejected (raffle non-winners only)
```

**Note:** Rewards have simpler status flow than missions (no progress states).

### 8.2 Status Definitions

| Status | Meaning | Trigger | Creator Action |
|--------|---------|---------|----------------|
| **pending** | Awaiting admin fulfillment | Creator claims reward | Wait for fulfillment |
| **fulfilled** | Admin completed fulfillment | Admin marks fulfilled | View in history |
| **rejected** | Redemption rejected | Admin bulk rejects (raffle non-winners) | None (raffle losers) |

**Key Differences from Missions:**
- ❌ NO `active` status (rewards don't track progress)
- ❌ NO `completed` status (instant claim, no completion step)
- ❌ NO `claimed` status (directly to `pending` after claim)
- ✅ Only 3 statuses: pending, fulfilled, rejected

### 8.3 Status Transition Details

**pending → fulfilled:**
- **Trigger:** Admin clicks "Mark as Fulfilled" in admin panel
- **Action:** Update `status='fulfilled'`, `fulfilled_at=NOW()`, `fulfilled_by=admin_id`
- **Notification:** Send email/push "Your [reward_name] has been delivered!"
- **UI Change:** Redemption moves to history, shows fulfillment date

**pending → rejected:**
- **Trigger:** Admin bulk rejects raffle non-winners
- **Action:** Update `status='rejected'`, `rejection_reason='Raffle entry - not selected as winner'`, `rejected_at=NOW()`
- **Notification:** None (raffle loser emails sent separately)
- **UI Change:** Redemption removed from queue

### 8.4 Scheduled Redemption Special Case

**Scheduled redemptions have additional field:**
- `scheduled_activation_at` - When admin should activate

**Status flow identical:**
```
pending (waiting for scheduled time) → fulfilled (admin activated)
```

**Admin View:**
```
Fulfillment Queue:
┌─────────────────────────────────────────────────┐
│ @creator1 - Follower Discount: 10%              │
│ Type: Scheduled                                 │
│ Activation: Jan 12, 2025 at 2:00 PM EST        │
│ Status: Pending (156 hours remaining)          │
│                                                 │
│ [Mark as Fulfilled]                             │
└─────────────────────────────────────────────────┘
```

**At scheduled time:**
- Google Calendar reminder fires
- Admin activates discount in TikTok Seller Center
- Admin marks as fulfilled (same as instant)

### 8.5 Fulfillment Notes

**Every fulfillment includes notes:**

**Examples:**
```
Gift Card:
  "Gift card code: ABCD-EFGH-IJKL, sent to creator@email.com on Jan 6"

Commission Boost:
  "Commission boost activated in TikTok Seller Center, expires Feb 15"

Spark Ads:
  "Spark Ads campaign created, $100 budget allocated, campaign ID: 12345"

Physical Gift:
  "Wireless headphones shipped via FedEx, tracking: 123456789"

Experience:
  "VIP event access confirmed, emailed details to creator@email.com"

Discount:
  "Discount activated in TikTok Seller Center on Jan 12 at 2:00 PM EST, expires Jan 19"
```

**Purpose:**
- Audit trail
- Creator support (if they don't receive reward)
- Admin reference (tracking numbers, codes, etc.)

---

## 9. DATABASE SCHEMA

### 9.1 rewards Table (Templates)

**Purpose:** Admin-configured reward templates

```sql
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Reward details
  type VARCHAR(100) NOT NULL, -- 'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience'
  name VARCHAR(255), -- Auto-generated from type + value_data
  description TEXT, -- Freeform text for physical_gift/experience

  -- Value storage (Section 3: Smart Hybrid approach)
  value_data JSONB, -- JSON for structured data (percent, amount, duration_days)
    -- Examples:
    -- commission_boost: {"percent": 5, "duration_days": 30}
    -- spark_ads: {"amount": 100}
    -- gift_card: {"amount": 50}
    -- discount: {"percent": 10}
    -- physical_gift/experience: Uses description TEXT instead

  -- Tier targeting
  tier_eligibility VARCHAR(50) NOT NULL, -- 'tier_1' through 'tier_6' (exact match, not minimum)

  -- Visibility controls
  enabled BOOLEAN DEFAULT false,
  preview_from_tier VARCHAR(50) DEFAULT NULL, -- NULL = only eligible tier, 'tier_1' = Bronze+ can preview as locked

  -- Redemption limits
  redemption_frequency VARCHAR(50) DEFAULT 'unlimited', -- 'one-time', 'monthly', 'weekly', 'unlimited'
  redemption_quantity INTEGER DEFAULT 1, -- How many times claimable per frequency period (1-10)
    -- Examples:
    -- {redemption_quantity: 2, redemption_frequency: 'monthly'} = 2 per month
    -- {redemption_quantity: 1, redemption_frequency: 'one-time'} = once (forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
    -- {redemption_quantity: NULL, redemption_frequency: 'unlimited'} = unlimited

  -- Redemption process type (hardcoded per reward type in MVP)
  redemption_type VARCHAR(50) NOT NULL DEFAULT 'instant', -- 'instant' or 'scheduled'
    -- instant: gift_card, commission_boost, spark_ads, physical_gift, experience
    -- scheduled: discount (creator schedules activation time)

  expires_days INTEGER, -- NULL = no expiration
  display_order INTEGER, -- For admin UI sorting

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_quantity_with_frequency CHECK (
    (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
    (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
  ),
  CONSTRAINT check_preview_tier CHECK (
    preview_from_tier IS NULL OR
    preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
  )
);
```

**Key Constraints:**
- `check_quantity_with_frequency` → Ensures unlimited has NULL quantity, others have 1-10
- `check_preview_tier` → Validates preview_from_tier values

### 9.2 redemptions Table (Shared with Missions)

**Purpose:** Tracks claims for both rewards AND missions

```sql
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,

  -- Status tracking (simplified: no approval step, all claims auto-valid)
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'fulfilled', or 'rejected'
    -- 'pending': Awaiting admin fulfillment
    -- 'fulfilled': Admin completed fulfillment
    -- 'rejected': Raffle non-winner (bulk rejected by admin)

  -- Eligibility snapshot (locked at claim time)
  tier_at_claim VARCHAR(50) NOT NULL, -- tier_1/tier_2/tier_3/tier_4 when creator clicked "Claim"
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Redemption type (instant vs scheduled)
  redemption_type VARCHAR(50) NOT NULL, -- 'instant' or 'scheduled'

  -- Scheduling (for TikTok Discount - scheduled type only)
  scheduled_activation_at TIMESTAMP, -- When to activate (Brazil time UTC-3)
  google_calendar_event_id VARCHAR(255), -- Google Calendar event ID for admin reminders

  -- Fulfillment tracking
  fulfilled_at TIMESTAMP, -- When admin marked as fulfilled
  fulfilled_by UUID REFERENCES users(id), -- Which admin fulfilled
  fulfillment_notes TEXT, -- Admin's fulfillment details (gift card codes, activation notes, etc.)

  -- Rejection tracking (for raffle non-winners)
  rejection_reason TEXT, -- Why redemption was rejected (e.g., "Raffle entry - not selected as winner")
  rejected_at TIMESTAMP, -- When admin rejected
  rejected_by UUID REFERENCES users(id), -- Which admin rejected

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_scheduled ON redemptions(scheduled_activation_at) WHERE scheduled_activation_at IS NOT NULL;
```

**Key Fields:**
- `tier_at_claim` → Locked at claim time (prevents tier change from affecting redemption)
- `scheduled_activation_at` → Only for discount type (scheduled redemption)
- `google_calendar_event_id` → Links to Google Calendar event for admin reminders

---

## 10. EDGE CASES

### 10.1 Redemption Limit Reached

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

### 10.2 Scheduled Discount Active Limit

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

### 10.3 Tier Demotion During Scheduled Redemption

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

### 10.4 Reward Disabled After Claim

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

### 10.5 Creator Removed Mid-Fulfillment

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

### 10.6 Period Transition (Monthly → Weekly)

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

## 11. EXAMPLE SCENARIOS

### 11.1 Normal Instant Redemption (Gift Card)

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

### 11.2 Scheduled Discount Flow

**Setup:** Platinum creator, "Follower Discount: 15%" (monthly limit: 1)

**Timeline:**
```
Jan 5:  Creator sees "Follower Discount: 15%"
        Clicks "Schedule"
        Modal appears with date/time picker

Jan 5:  Creator selects:
        Date: Jan 12, 2025
        Time: 2:00 PM EST
        Clicks "Confirm"

Jan 5:  System creates:
        - Redemption (status='pending', scheduled_activation_at='Jan 12, 7:00 PM UTC')
        - Google Calendar event (reminder at Jan 12, 1:30 PM EST)

Jan 5:  Success message: "Success! Your discount will be activated on Jan 12 at 2:00 PM EST"
        Counter updates: 1 of 1 used this month

Jan 12, 1:30 PM EST:
        Google Calendar reminder fires
        Admin sees: "Activate discount for @creator_handle in 30 minutes"

Jan 12, 2:00 PM EST:
        Admin activates 15% discount in TikTok Seller Center
        Marks as fulfilled
        Fulfillment notes: "Discount activated on Jan 12 at 2:00 PM EST, expires Jan 19"

Jan 12, 2:05 PM:
        Creator receives email: "Your Follower Discount: 15% has been activated!"
        Redemption moves to history

Feb 1:  Counter resets (0 of 1 used this month)
```

### 11.3 Tier Upgrade Mid-Period (Auto-Replace)

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

### 11.4 Redemption Limit Edge Case (Reward-Type-Specific)

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

### 11.5 Multiple Rewards Same Period

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

## 12. CRITICAL RULES

### 12.1 Implementation Rules

1. **Tier Filtering:** Always use `WHERE tier_eligibility = current_tier` (exact match, not >=)
2. **Auto-Replace:** On tier change, re-query rewards with new `current_tier` (automatic)
3. **Lock tier_at_claim:** Always save `current_tier` to `tier_at_claim` when creating redemption
4. **Period Calculation:** Use calendar boundaries (Jan 1, Feb 1) for monthly/weekly, NOT user-specific dates
5. **One-Time Period:** Reward-type-specific (forever for gift_card/physical_gift/experience, per tier for commission_boost/spark_ads/discount)
6. **Redemption Type:** Hardcode per reward type (discount=scheduled, all others=instant)
7. **Scheduled Validation:** Only allow scheduling 1-7 days ahead (prevent far-future scheduling)
8. **Preview Direction:** Lower tiers see higher (with preview_from_tier), NOT vice versa
9. **Status Simplicity:** Only 3 statuses for rewards (pending, fulfilled, rejected) - simpler than missions
10. **Name Generation:** Auto-generate names for Category 1, use description for Category 2

### 12.2 Common Misconceptions

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

### 12.3 Data Integrity Rules

1. **Every reward MUST have:** type, tier_eligibility, redemption_frequency, redemption_type, enabled
2. **Category 1 rewards MUST have:** value_data JSONB (e.g., `{"amount": 50}`)
3. **Category 2 rewards MUST have:** description TEXT (e.g., "Luxury headphones")
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
