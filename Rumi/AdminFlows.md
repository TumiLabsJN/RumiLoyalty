# Admin UI Screens Overview

| Screen | Purpose | Flows Included |
|--------|---------|----------------|
| **1. Dashboard** | Today's Tasks, This Week's Tasks | Today's Tasks display, This Week's Tasks display |
| **2. Redemptions** | All reward fulfillment queues | Instant rewards (Flow 1-2), Physical Gift (Flow 1-3), Commission boost (Flow 1-2), Discount (Flow 1-2), Raffle winner claims (Flow 2A, 2B) |
| **3. Missions** | Mission creation, raffle management | Mission Creation, Raffle Flow 0-1 |
| **4. VIP Rewards** | Create/edit/manage VIP tier rewards | Create (Flow 1), Edit (Flow 2), Enable/Disable (Flow 3) |
| **5. Sales Adjustments** | Add adjustments, view history | Add (Flow 1), View History (Flow 2) |
| **6. Creator Lookup** | Search + profile view | Search Creator (Flow 1) |
| **7. Data Sync** | Sync status, manual CSV upload | View Status (Flow 1), Manual Upload (Flow 2) |
| **8. Reports** | Rewards summary, creator activity | Report 1, Report 2 |

---

# Screen 1: Dashboard

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  DASHBOARD                                              │
│                   │                                                         │
│  ● Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  TODAY'S TASKS                              (12)   ││
│  ○ Missions       │  └─────────────────────────────────────────────────────┘│
│  ○ VIP Rewards    │                                                         │
│  ○ Sales Adj.     │  ┌─────────────────────────────────────────────────────┐│
│  ○ Creator Lookup │  │  🔔 DISCOUNTS TO ACTIVATE                    (2)   ││
│  ○ Data Sync      │  ├─────────────────────────────────────────────────────┤│
│  ○ Reports        │  │  @creator1   15%   2:00 PM EST   GOLD15      [→]   ││
│                   │  │  @creator3   10%   4:00 PM EST   SAVE10      [→]   ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  💸 COMMISSION PAYOUTS                        (1)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  @creator2   $47.50   PayPal   john@email    [→]   ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  🎁 INSTANT REWARDS TO FULFILL                (3)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  @creator4   $50 Gift Card    jane@email   ⚠️ 22h  [→]││
│                   │  │  @creator5   $100 Spark Ads   -            18h  [→]││
│                   │  │  @creator6   Experience       sam@email    12h  [→]││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  📦 PHYSICAL GIFTS TO SHIP                    (1)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  @creator7   Hoodie (L)   Los Angeles, CA    [→]   ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  🎲 RAFFLES TO DRAW                           (0)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  No raffles to draw today                          ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ════════════════════════════════════════════════════  │
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  THIS WEEK                                         ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  🔔 UPCOMING DISCOUNTS                        (3)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  Wed 27th   @creator8    15%    10:00 AM EST       ││
│                   │  │  Thu 28th   @creator9    20%    2:00 PM EST        ││
│                   │  │  Fri 29th   @creator10   10%    11:00 AM EST       ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  🎲 UPCOMING RAFFLES                          (1)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  Sat 30th   Holiday Raffle   iPhone 16   45 entries││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
│                   │  ┌─────────────────────────────────────────────────────┐│
│                   │  │  ⏰ BOOSTS EXPIRING SOON                       (2)   ││
│                   │  ├─────────────────────────────────────────────────────┤│
│                   │  │  Wed 27th   @creator11   5%    Est. payout: $32    ││
│                   │  │  Fri 29th   @creator12   10%   Est. payout: $85    ││
│                   │  └─────────────────────────────────────────────────────┘│
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

LEGEND:
[→] = Clickable link → navigates to Redemptions with tab + row pre-selected
⚠️  = SLA warning (>20 hours)
🔴  = SLA breach (>24 hours)
(n) = Count of items in section
```

## TailwindPlus Components

| Element | Component |
|---------|-----------|
| Shell | Sidebar Layout |
| Section headers | Headings > Simple + Count |
| Task lists | Stacked Lists > With links |
| Empty state | Empty States > Simple |
| Divider (Today/Week) | Dividers > With title |

## Flows

### Today's Tasks

**Purpose:** Unified view of all manual actions needed today, sorted by urgency.

**Queue Categories (in priority order):**

#### 1. 🔔 Discounts to Activate
**Condition:** redemptions.status = 'claimed' AND scheduled_activation_date = TODAY AND scheduled_activation_time <= NOW()
**Display:**
- Handle: users.tiktok_handle
- Discount %: rewards.value_data.percent
- Scheduled time: redemptions.scheduled_activation_time
- Coupon code: rewards.value_data.coupon_code

#### 2. 💸 Commission Payouts
**Condition:** commission_boost_redemptions.boost_status = 'pending_payout'
**Display:**
- Handle: users.tiktok_handle
- Payout amount: commission_boost_redemptions.final_payout_amount
- Payment method: commission_boost_redemptions.payment_method
- Payment account: commission_boost_redemptions.payment_account

#### 3. 🎁 Instant Rewards to Fulfill
**Condition:** redemptions.status = 'claimed' AND rewards.type IN ('gift_card', 'spark_ads', 'experience')
**Display:**
- Handle: users.tiktok_handle
- Reward type: rewards.type
- Value: rewards.value_data.amount OR rewards.value_data.display_text
- Email: users.email
- Claimed: redemptions.claimed_at (hours ago)
- SLA indicator: ⚠️ if > 20 hours, 🔴 if > 24 hours

#### 4. 📦 Physical Gifts to Ship
**Condition:** redemptions.status = 'claimed' AND rewards.type = 'physical_gift' AND physical_gift_redemptions.shipped_at IS NULL
**Display:**
- Handle: users.tiktok_handle
- Item: rewards.name
- Size: physical_gift_redemptions.size_value (if applicable)
- City/State: physical_gift_redemptions.shipping_city, shipping_state
- Claimed: redemptions.claimed_at

#### 5. 🎲 Raffles to Draw
**Condition:** missions.mission_type = 'raffle' AND missions.raffle_end_date = TODAY AND winner not yet selected
**Display:**
- Raffle name: missions.display_name
- Prize: rewards.name
- Participant count: COUNT(raffle_participations)
- End date: missions.raffle_end_date

---

### This Week's Tasks

**Purpose:** Upcoming tasks for planning purposes (informational only, not clickable).

#### Upcoming Discount Activations
**Condition:** redemptions.status = 'claimed' AND scheduled_activation_date BETWEEN TODAY AND TODAY+7
**Display:**
- Date: redemptions.scheduled_activation_date
- Time: redemptions.scheduled_activation_time
- Handle: users.tiktok_handle
- Discount %: rewards.value_data.percent

#### Upcoming Raffle Drawings
**Condition:** missions.mission_type = 'raffle' AND raffle_end_date BETWEEN TODAY AND TODAY+7
**Display:**
- Draw date: missions.raffle_end_date
- Prize: rewards.name
- Current participants: COUNT(raffle_participations)

#### Commission Boosts Expiring Soon
**Condition:** commission_boost_redemptions.boost_status = 'active' AND expires_at BETWEEN TODAY AND TODAY+7
**Display:**
- Expiration: commission_boost_redemptions.expires_at
- Handle: users.tiktok_handle
- Boost %: rewards.value_data.percent
- Estimated payout: (current sales_delta × percent)

---

# Screen 2: Redemptions

## Wireframe

URL: `/redemptions?tab=instant&id=123`
- `tab`: Selects which tab is active (instant | physical | boost | discount)
- `id`: Highlights specific row (from Dashboard link)

### Tab 1: Instant Rewards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  REDEMPTIONS                                            │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ● Redemptions    │  │ [Instant (4)] [Physical (2)] [Pay Boost (1)] [Disc] ││
│  ○ Missions       │  │  ═══════════                                        ││
│  ○ VIP Rewards    │  └─────────────────────────────────────────────────────┘│
│  ○ Sales Adj.     │                                                         │
│  ○ Creator Lookup │  ┌─────────────────────────────────────────────────────┐│
│  ○ Data Sync      │  │ Handle   │ Type       │ Value  │ Email    │ Action  ││
│  ○ Reports        │  ├──────────┼────────────┼────────┼──────────┼─────────┤│
│                   │  │ @crea1   │ Gift Card  │ $50    │ a@b.com  │[Done ✓] ││
│                   │  │ @crea2   │ Spark Ads  │ $100   │ -        │[Done ✓] ││
│                   │  │ @crea3   │ Experience │ VIP Mtg│ c@d.com  │[Done ✓] ││
│                   │  │ @crea4   │ Gift Card  │ $25    │ e@f.com  │[Done ✓] ││
│                   │  └──────────┴────────────┴────────┴──────────┴─────────┘│
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

COLUMNS:
- Handle: users.tiktok_handle
- Type: rewards.type (gift_card | spark_ads | experience)
- Value: rewards.value_data.amount OR display_text
- Email: users.email (or "-" for spark_ads)
- Action: [Done ✓] → sets redemptions.status = 'concluded'
```

### Tab 2: Physical Gifts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  REDEMPTIONS                                            │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ● Redemptions    │  │ [Instant (4)] [Physical (2)] [Pay Boost (1)] [Disc] ││
│  ○ Missions       │  │               ═════════════                         ││
│  ○ VIP Rewards    │  └─────────────────────────────────────────────────────┘│
│  ○ Sales Adj.     │                                                         │
│  ○ Creator Lookup │  ┌─────────────────────────────────────────────────────┐│
│  ○ Data Sync      │  │Handle  │Item      │Size│City, ST    │Status │Action ││
│  ○ Reports        │  ├────────┼──────────┼────┼────────────┼───────┼───────┤│
│                   │  │@crea5  │Hoodie    │ L  │LA, CA      │claimed│[Ship] ││
│                   │  │@crea6  │Cap       │ -  │Miami, FL   │shipped│[Recv] ││
│                   │  └────────┴──────────┴────┴────────────┴───────┴───────┘│
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

Click row → DRAWER slides in from right:
┌────────────────────────────────────────┐
│ Physical Gift Details            [X]  │
├────────────────────────────────────────┤
│                                        │
│ Recipient: John Smith                  │
│ Address: 123 Main St, Apt 4B           │
│ City: Los Angeles, CA 90210            │
│                                        │
│ Size: L (Apparel)  ← if requires_size  │
│                                        │
│ Carrier: [________]                    │
│ Tracking: [________________]           │
│ Notes: [________________]              │
│                                        │
├────────────────────────────────────────┤
│              [Cancel]  [Mark Shipped]  │
└────────────────────────────────────────┘

COLUMNS:
- Handle: users.tiktok_handle
- Item: rewards.name
- Size: physical_gift_redemptions.size_value (or "-")
- City, ST: shipping_city, shipping_state
- Status: claimed | shipped (badge)
- Action: [View] → opens drawer

DRAWER CONTENT:
- Full recipient name
- Full address (line1, line2, city, state, postal)
- Size (if requires_size=true)
- Carrier input
- Tracking input
- Notes input
- Footer: [Cancel] [Mark Shipped] or [Mark Received]
```

### Tab 3: Pay Boost

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  REDEMPTIONS                                            │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ● Redemptions    │  │ [Instant (4)] [Physical (2)] [Pay Boost (1)] [Disc] ││
│  ○ Missions       │  │                              ══════════════         ││
│  ○ VIP Rewards    │  └─────────────────────────────────────────────────────┘│
│  ○ Sales Adj.     │                                                         │
│  ○ Creator Lookup │  ┌─────────────────────────────────────────────────────┐│
│  ○ Data Sync      │  │Handle  │Payout   │Method │Account        │Action   ││
│  ○ Reports        │  ├────────┼─────────┼───────┼───────────────┼─────────┤│
│                   │  │@crea7  │ $47.50  │PayPal │john@email.com │[Paid ✓] ││
│                   │  └────────┴─────────┴───────┴───────────────┴─────────┘│
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

Click row → DRAWER slides in from right:
┌────────────────────────────────────────┐
│ Commission Boost Payout          [X]  │
├────────────────────────────────────────┤
│                                        │
│ Creator: @crea7                        │
│                                        │
│ BOOST DETAILS                          │
│ Boost %: 5%                            │
│ Duration: 7 days                       │
│ Activated: Nov 15, 2025                │
│ Expired: Nov 22, 2025                  │
│ Sales during boost: $950.00            │
│ Final payout: $47.50                   │
│                                        │
│ PAYMENT INFO                           │
│ Method: PayPal                         │
│ Account: john@email.com                │
│                                        │
│ Date paid: [__/__/____]                │
│ Paid by: [____________]                │
│ Transaction ID: [________________]     │
│ Notes: [________________]              │
│                                        │
├────────────────────────────────────────┤
│                [Cancel]  [Mark Paid]   │
└────────────────────────────────────────┘

COLUMNS:
- Handle: users.tiktok_handle
- Payout: commission_boost_redemptions.final_payout_amount
- Method: commission_boost_redemptions.payment_method
- Account: commission_boost_redemptions.payment_account
- Action: [View] → opens drawer

DRAWER CONTENT:
- Boost % and duration
- Activation/expiration dates
- Sales earned during boost period
- Payment method and account (read-only)
- Date paid input (payout_sent_at)
- Paid by input (payout_sent_by)
- Transaction ID input (external_transaction_id)
- Notes input (payout_notes)
- Footer: [Cancel] [Mark Paid]
```

### Tab 4: Discount

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  REDEMPTIONS                                            │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ● Redemptions    │  │ [Instant (4)] [Physical (2)] [Pay Boost (1)] [Disc] ││
│  ○ Missions       │  │                                              ══════ ││
│  ○ VIP Rewards    │  └─────────────────────────────────────────────────────┘│
│  ○ Sales Adj.     │                                                         │
│  ○ Creator Lookup │  ┌─────────────────────────────────────────────────────┐│
│  ○ Data Sync      │  │Handle  │ %  │Sched. Time     │Code    │Status│Action││
│  ○ Reports        │  ├────────┼────┼────────────────┼────────┼──────┼──────┤│
│                   │  │@crea8  │15% │Today 2:00 PM   │GOLD15  │ready │[Act] ││
│                   │  │@crea9  │10% │Today 4:00 PM   │SAVE10  │claim │ -    ││
│                   │  │@crea10 │20% │Wed 10:00 AM    │VIP20   │claim │ -    ││
│                   │  └────────┴────┴────────────────┴────────┴──────┴──────┘│
│                   │                                                         │
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

STATUS KEY (badges):
• claim (yellow) = claimed, waiting for scheduled time
• ready (green) = scheduled time reached, needs activation
• active (indigo) = activated, running on TikTok
• done (gray) = expired, concluded

Click row → DRAWER slides in from right:
┌────────────────────────────────────────┐
│ Discount Activation              [X]  │
├────────────────────────────────────────┤
│                                        │
│ Creator: @crea8                        │
│                                        │
│ COUPON DETAILS (copy to TikTok)        │
│ Discount: 15%                          │
│ Duration: 30 minutes                   │
│ Max uses: 50                           │
│ Coupon code: GOLD15                    │
│                                        │
│ SCHEDULE                               │
│ Activation: Nov 25, 2025 2:00 PM EST   │
│ Expires: (auto after activation)       │
│                                        │
├────────────────────────────────────────┤
│            [Cancel]  [Mark Activated]  │
└────────────────────────────────────────┘

COLUMNS:
- Handle: users.tiktok_handle
- %: rewards.value_data.percent
- Sched. Time: scheduled_activation_date + scheduled_activation_time
- Code: rewards.value_data.coupon_code
- Status: claim | ready | active | done (badge)
- Action: [View] → opens drawer (only when status='ready')

DRAWER CONTENT:
- Discount %, duration, max uses
- Coupon code (for copying to TikTok)
- Scheduled activation time
- Footer: [Cancel] [Mark Activated]

NOTE: Rows where status='active' or 'done' could be hidden or
shown in a separate "History" sub-view
```

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as Dashboard |
| Tab navigation | Tabs > With underline | 4 tabs with counts |
| Data tables | Tables > Simple | One per tab |
| Action buttons | Buttons > Primary | [Done ✓], [View], [Mark Shipped], etc. |
| Detail drawer | Drawer > With sticky footer | Click row → slides in from right |
| Empty state | Empty States > Simple | "No pending [reward type]" |
| Status badges | Badges > Pill with border | claim (yellow), shipped (blue), ready (green), etc. |

## Flows

### Instant Rewards (gift card, spark ads, experience)

#### Flow 1: Fulfilling Reward
**Information to view from Admin UI**
1. Gift card
   - Value $ = rewards.value_data 'amount'
   - Handle = users.tiktok_handle
   - Creator Email = users.email

2. Spark ads:
   - Value $ = rewards.value_data 'amount'
   - Handle = users.tiktok_handle

3. Experience:
   - Description = rewards.value_data 'display_text'
   - Handle = users.tiktok_handle
   - Creator Email = users.email

**Action (Manual):**
1. Gift Card: Purchase Gift Card and send to email
2. Spark Ads: Invest in the Creators handle
3. Experience: Contact user Email

#### Flow 2: After reward is fulfilled
**Information to view from Admin UI**
1. Gift Card: redemptions.status
2. Spark Ads: redemptions.status
3. Experience: redemptions.status

**Action (Manual):**
1. Gift Card: Change redemptions.status from 'claimed' to 'concluded'
2. Spark Ads: Change redemptions.status from 'claimed' to 'concluded'
3. Experience: Change redemptions.status from 'claimed' to 'concluded'

---

### Physical Gift

#### Flow 1: Shipping Reward

**Information to view from Admin UI**
1. First name = physical_gift_redemptions.shipping_recipient_first_name
2. Second name = physical_gift_redemptions.shipping_recipient_last_name
3. Shipping Street = physical_gift_redemptions.shipping_address_line1
4. Apt, suite, unit = physical_gift_redemptions.shipping_address_line2
5. City = physical_gift_redemptions.shipping_city
6. State = physical_gift_redemptions.shipping_state
7. Postal Code = physical_gift_redemptions.shipping_postal_code

_Optional: For value_data.requires_size=true_
- rewards.value_data requires_size
- rewards.value_data size_category
- rewards.value_data size_options

**Action (Manual):**
1. Buy & Ship Reward OR Ship Reward

#### Flow 2: After Shipping

**Information to view from Admin UI**
1. physical_gift_redemptions.shipped_at
2. physical_gift_redemptions.carrier
3. physical_gift_redemptions.tracking_number
4. redemptions.fulfillment_notes (admin notes)

**Action (Manual):**
1. Modify physical_gift_redemptions.shipped_at

#### Flow 3: When Received (Shipper email)

**Information to view from Admin UI**
1. physical_gift_redemptions.delivered_at
2. redemptions.status

**Action (Manual):**
1. Change redemptions.status from 'claimed' to 'concluded'
2. Set date on physical_gift_redemptions.delivered_at

---

### Commission Boost

#### Flow 1: Transfer Money
**Information to view from Admin UI**
1. Payment method: commission_boost_redemptions.payment_method
2. Payment Account: commission_boost_redemptions.payment_account
3. Payment Amount: commission_boost_redemptions.final_payout_amount

**Action (Manual):**
1. Make payment from PayPal/Venmo

#### Flow 2: After Transfer
**Information to view from Admin UI**
1. Payment Date: commission_boost_redemptions.payout_sent_at
2. Who sent payment: commission_boost_redemptions.payout_sent_by
3. Transaction ID: redemptions.external_transaction_id
4. Notes: commission_boost_redemptions.payout_notes

**Action (Manual):**
1. Input payment Date
2. Input who made payment
3. Input transaction ID
4. Input notes (optional)

---

### Discount

#### Flow 1: Create Coupon (Status: redemptions.status = 'claimed')

**Trigger:** When scheduled_activation_date + scheduled_activation_time arrives

**Information to view from Admin UI:**
1. User Handle: users.tiktok_handle
2. Discount %: rewards.value_data.percent
3. Duration (minutes): rewards.value_data.duration_minutes
4. Coupon Code: rewards.value_data.coupon_code
5. Max Uses: rewards.value_data.max_uses
6. Scheduled Activation: redemptions.scheduled_activation_date + scheduled_activation_time

**Action (Manual):**
1. Go to TikTok Seller Central
2. Create coupon with above parameters
3. Return to Admin UI
4. Click "Mark as Activated" button

**Status Update:**
- Change redemptions.status from 'claimed' to 'fulfilled'
- Set redemptions.activation_date = NOW()
- Set redemptions.expiration_date = NOW() + duration_minutes

#### Flow 2: After Expiration (Status: redemptions.status = 'concluded')

**Trigger:** Automatic when NOW() >= expiration_date

**Information to view:**
1. Expiration date: redemptions.expiration_date
2. Status: redemptions.status = 'concluded'

**Action:**
- System automatically changes status to 'concluded'
- No manual action needed

---

### Raffle Winner Claims

#### Flow 2A: Winner Claims Digital Gift
**Condition:** mission.reward_id = gift_card or experience

**Trigger:** redemptions.status='claimed' & is_winner=TRUE

**Information to view from Admin UI**
- Value $ = rewards.value_data 'amount'
- Handle = users.tiktok_handle
- Creator Email = users.email

**Action (Manual):**
1. Buy Gift Card
2. Mark redemptions.status as 'concluded'

#### Flow 2B: Winner Claims Physical Gift
**Condition:** mission.reward_id = physical_gift

**2B.1 - Trigger:** redemptions.status='claimed' & is_winner=TRUE

**Information to view from Admin UI**
1. First name = physical_gift_redemptions.shipping_recipient_first_name
2. Second name = physical_gift_redemptions.shipping_recipient_last_name
3. Shipping Street = physical_gift_redemptions.shipping_address_line1
4. Apt, suite, unit = physical_gift_redemptions.shipping_address_line2
5. City = physical_gift_redemptions.shipping_city
6. State = physical_gift_redemptions.shipping_state
7. Postal Code = physical_gift_redemptions.shipping_postal_code

_Optional: For value_data.requires_size=true_
- rewards.value_data requires_size
- rewards.value_data size_category
- rewards.value_data size_options

**Action (Manual):**
1. Buy & Ship Reward OR Ship Reward

**2B.2 - Trigger:** Product Delivered

**Information to view from Admin UI**
1. redemptions.status modification

**Action (Manual):**
1. Modify redemptions.status to Concluded

---

# Screen 3: Missions

## Wireframe

### Main Table

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  MISSIONS                                               │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  Missions                        [+ Create Mission] ││
│  ● Missions       │  └─────────────────────────────────────────────────────┘│
│  ○ VIP Rewards    │                                                         │
│  ○ Sales Adj.     │  ┌─────────────────────────────────────────────────────┐│
│  ○ Creator Lookup │  │Name       │Type   │Target│Reward    │Tier  │Status  ││
│  ○ Data Sync      │  ├───────────┼───────┼──────┼──────────┼──────┼────────┤│
│  ○ Reports        │  │First Sale │sales  │$100  │$10 Gift  │Bronze│active  ││
│                   │  │Power Sell │sales  │$500  │5% Boost  │Silver│active  ││
│                   │  │Unit Master│units  │25    │Hoodie    │Gold  │active  ││
│                   │  │Holiday... │raffle │-     │iPhone 16 │All   │active  ││
│                   │  │Spring... │raffle │-     │$500 Card │Gold  │draft   ││
│                   │  └───────────┴───────┴──────┴──────────┴──────┴────────┘│
│                   │                                                         │
│                   │  RAFFLE DETAILS (shown inline for raffle type):         │
│                   │  Holiday Raffle: Ends Nov 30 | 45 entries               │
│                   │  Spring Raffle: Not activated | 0 entries               │
│                   │                                                         │
│                   │  Raffle data sources:                                   │
│                   │  - End date: missions.raffle_end_date                   │
│                   │  - Entries: COUNT(raffle_participations WHERE mission_id)│
│                   │  - Not activated: missions.activated = false            │
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

COLUMNS:
- Name: missions.display_name
- Type: missions.mission_type ('sales_dollars' | 'sales_units' | 'videos' | 'views' | 'likes' | 'raffle')
- Target: missions.target_value (or "-" for raffle)
- Reward: rewards.name
- Tier: missions.tier_eligibility
- Status: draft | active | ended (badge)

STATUS KEY (badges):
• draft (gray) = enabled=false OR activated=false
• active (green) = enabled=true AND activated=true
• ended (blue) = raffle past end_date, or mission concluded
```

### Create/Edit Mission Drawer

```
Click [+ Create Mission] OR click existing row → DRAWER:
┌────────────────────────────────────────┐
│ Create Mission                   [X]  │
├────────────────────────────────────────┤
│                                        │
│ MISSION DETAILS                        │
│ Internal Title: [____________________] │
│ Display Name: [____________________]   │
│                                        │
│ Type: [sales ▼]                        │
│   ○ sales ($ or units per vip_metric)  │
│   ○ videos                             │
│   ○ views                              │
│   ○ likes                              │
│   ○ raffle                             │
│                                        │
│ Target Value: [________]               │
│ Target Unit: [dollars ▼]  ← auto-set   │
│ (hidden if type=raffle)                │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ REWARD                                 │
│ ○ Select existing  ● Create new        │
│                                        │
│ ┌─ Create Reward (inline) ───────────┐ │
│ │ Type: [gift_card ▼]                │ │
│ │   gift_card | commission_boost |   │ │
│ │   spark_ads | discount |           │ │
│ │   physical_gift | experience       │ │
│ │                                    │ │
│ │ (Fields change based on type)      │ │
│ │ Amount: [$50]  ← for gift_card     │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ AVAILABILITY                           │
│ Tier Eligibility: [all ▼]              │
│ Display Order: [1]                     │
│                                        │
│ STATUS                                 │
│ ☑ Enabled (visible to creators)       │
│ ☐ Activated (accepting progress)      │
│                                        │
│ RAFFLE SETTINGS (if type=raffle)       │
│ End Date: [__/__/____]                 │
│                                        │
├────────────────────────────────────────┤
│              [Cancel]  [Save Mission]  │
└────────────────────────────────────────┘

DRAWER FIELDS:
- Internal Title: missions.title (admin reference, NOT shown to creators)
- Display Name: missions.display_name (user-facing)
- Type: missions.mission_type
  - If 'sales' selected: auto-sets to 'sales_dollars' or 'sales_units' based on clients.vip_metric
  - Others: 'videos', 'views', 'likes', 'raffle'
- Target Value: missions.target_value (0 for raffle)
- Target Unit: missions.target_unit ('dollars', 'units', or 'count' - auto-set based on type)
- Reward: missions.reward_id
  - "Select existing" → dropdown of rewards WHERE reward_source='mission'
  - "Create new" → inline reward form (saves reward first, then links)
- Tier Eligibility: missions.tier_eligibility ('all', 'tier_1' through 'tier_6')
- Display Order: missions.display_order
- Enabled: missions.enabled
- Activated: missions.activated
- End Date: missions.raffle_end_date (raffle only, required)

INLINE REWARD CREATION:
When "Create new" selected, show reward fields based on type:
- gift_card: amount (number)
- commission_boost: percent (number), duration_days (number)
- spark_ads: amount (number)
- discount: percent, duration_minutes, coupon_code, max_uses
- physical_gift: requires_size (toggle), size_category, size_options, display_text
- experience: display_text
All inline rewards auto-set: reward_source='mission', tier_eligibility=(from mission)
```

### Raffle Actions Drawer

```
Click raffle row → DRAWER (with raffle-specific actions):
┌────────────────────────────────────────┐
│ Holiday Raffle                   [X]  │
├────────────────────────────────────────┤
│                                        │
│ RAFFLE INFO                            │
│ Name: Holiday Raffle                   │
│ Prize: iPhone 16                       │
│ Tier: All                              │
│ End Date: Nov 30, 2025                 │
│ Entries: 45                            │
│                                        │
│ STATUS                                 │
│ Activated: ✓ Yes                       │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ SELECT WINNER (after end date)         │
│ Winner Handle: [@____________]         │
│                                        │
│ Current Winner: (none selected)        │
│                                        │
├────────────────────────────────────────┤
│    [Cancel]  [Save]  [Select Winner]   │
└────────────────────────────────────────┘

DRAWER ACTIONS:
- If not activated: [Activate Raffle] button
- If past end date + no winner: [Select Winner] button
- Winner input: raffle_participations.is_winner = true
```

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as other screens |
| Page header | Headings > With actions | Title + [Create Mission] button |
| Data table | Tables > Simple | All missions list |
| Create/Edit drawer | Drawer > With sticky footer | Mission form |
| Raffle drawer | Drawer > With sticky footer | Raffle actions |
| Form inputs | Input Groups | Text fields (title, display_name, target_value) |
| Dropdowns | Select Menus | Type, Reward (existing), Tier |
| Radio buttons | Radio Groups | Select existing vs Create new reward |
| Checkboxes | Toggles | Enabled, Activated, requires_size |
| Date picker | Input Groups | raffle_end_date |
| Status badges | Badges > Pill with border | draft, active, ended |
| Empty state | Empty States > Simple | "No missions yet" |

## Flows

### Mission Creation

**Information to input from Admin UI:**
1. Type of Mission: missions.mission_type
2. Target of mission: target_value or target_unit, depends on Loyalty Configuration
3. Create reward: reward_id
4. VIP level availability: tier_eligibility
5. Sequential Unlock Position: display_order
6. If Mission is active: enabled=True
7. If Mission is activated: activated

---

### Raffle

#### Flow 0: Making Raffle Active
**Trigger:** When Admin decides to start accepting participants for Raffle
By default raffle is Activated='false'

**Information to view from Admin UI**
A list of the Raffles that are dormant (have Activated='false'):
- Raffle name: missions.display_name
- Prize: rewards.name
- End date: missions.raffle_end_date

**Action (Manual):**
Modify the Activated field to TRUE.

#### Flow 1: Selecting winner

**Trigger:** missions.raffle_end_date = current date

**Information to view from Admin UI**
A field where I can write the handle of the winner

**Action (Manual):**
Write the handle of the winner

---

# Screen 4: VIP Rewards

## Wireframe

### Main Table

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  VIP REWARDS                                            │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  VIP Rewards                     [+ Create Reward]  ││
│  ○ Missions       │  └─────────────────────────────────────────────────────┘│
│  ● VIP Rewards    │                                                         │
│  ○ Sales Adj.     │  ┌─────────────────────────────────────────────────────┐│
│  ○ Creator Lookup │  │Name        │Type       │Tier   │Frequency│Status   ││
│  ○ Data Sync      │  ├────────────┼───────────┼───────┼─────────┼─────────┤│
│  ○ Reports        │  │$50 Gift    │gift_card  │Bronze │monthly  │active   ││
│                   │  │5% Boost    │comm_boost │Silver │one-time │active   ││
│                   │  │$100 Ads    │spark_ads  │Gold   │unlimited│active   ││
│                   │  │10% Deal    │discount   │Gold   │weekly   │inactive ││
│                   │  │Hoodie      │phys_gift  │Plat   │one-time │active   ││
│                   │  │VIP Dinner  │experience │Plat   │one-time │active   ││
│                   │  └────────────┴───────────┴───────┴─────────┴─────────┘│
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

COLUMNS (from SchemaFinalv2.md rewards table):
- Name: rewards.name (auto-generated from type + value_data)
- Type: rewards.type
- Tier: rewards.tier_eligibility → JOIN tiers.tier_name
- Frequency: rewards.redemption_frequency
- Status: rewards.enabled (active=true, inactive=false) (badge)

FILTER: WHERE rewards.reward_source = 'vip_tier'
```

### Create/Edit Reward Drawer

```
Click [+ Create Reward] OR click existing row → DRAWER:
┌────────────────────────────────────────┐
│ Create VIP Reward                [X]  │
├────────────────────────────────────────┤
│                                        │
│ REWARD TYPE                            │
│ Type: [gift_card ▼]                    │
│   ○ gift_card                          │
│   ○ commission_boost                   │
│   ○ spark_ads                          │
│   ○ discount                           │
│   ○ physical_gift                      │
│   ○ experience                         │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ VALUE CONFIGURATION                    │
│ (Fields change based on type selected) │
│                                        │
│ ┌─ gift_card ──────────────────────┐   │
│ │ Amount: [$____]                  │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌─ commission_boost ───────────────┐   │
│ │ Percent: [___] %                 │   │
│ │ Duration: [___] days             │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌─ spark_ads ──────────────────────┐   │
│ │ Amount: [$____]                  │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌─ discount ───────────────────────┐   │
│ │ Percent: [___] %                 │   │
│ │ Duration: [____] minutes         │   │
│ │ Coupon code: [________]          │   │
│ │ Max uses: [___] (optional)       │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌─ physical_gift ──────────────────┐   │
│ │ Name (12 chars): [__________]    │   │
│ │ Display text: [________________] │   │
│ │ Requires size: [toggle]          │   │
│ │ Size category: [clothing ▼]      │   │
│ │ Size options: [S, M, L, XL]      │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌─ experience ─────────────────────┐   │
│ │ Name (12 chars): [__________]    │   │
│ │ Display text: [________________] │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ─────────────────────────────────────  │
│                                        │
│ AVAILABILITY                           │
│ Tier: [tier_2 (Silver) ▼]              │
│ Preview from: [tier_1 (Bronze) ▼]      │
│                                        │
│ REDEMPTION LIMITS                      │
│ Frequency: [monthly ▼]                 │
│   one-time | monthly | weekly |        │
│   unlimited                            │
│ Quantity: [1]  (per period)            │
│                                        │
│ STATUS                                 │
│ ☑ Enabled (visible to creators)       │
│                                        │
├────────────────────────────────────────┤
│              [Cancel]  [Save Reward]   │
└────────────────────────────────────────┘

DRAWER FIELDS (from SchemaFinalv2.md rewards table):
- Type: rewards.type
  Options: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'

- Description: rewards.description (VARCHAR 12 chars max, ONLY for physical_gift/experience)
  - Used to generate rewards.name: "Gift Drop: ${description}" or just "${description}"

- Value Configuration: rewards.value_data (JSONB, varies by type)
  - gift_card: {"amount": number}
  - commission_boost: {"percent": number, "duration_days": number}
  - spark_ads: {"amount": number}
  - discount: {"percent": number, "duration_minutes": number, "coupon_code": string, "max_uses": number}
  - physical_gift: {"requires_size": boolean, "size_category": string, "size_options": string[], "display_text": string (max 27 chars)}
  - experience: {"display_text": string (max 27 chars)}

- Tier: rewards.tier_eligibility ('tier_1' through 'tier_6')
- Preview from: rewards.preview_from_tier (NULL or 'tier_1' through 'tier_6')
- Frequency: rewards.redemption_frequency ('one-time' | 'monthly' | 'weekly' | 'unlimited')
- Quantity: rewards.redemption_quantity (1-10, NULL for unlimited)
- Enabled: rewards.enabled

NOTE: display_order is NOT exposed in admin UI for VIP rewards.
- Backend auto-handles (e.g., auto-increment on creation)
- Frontend sorts by STATUS PRIORITY first, then display_order as secondary
- Status priority: pending_info → claimable → clearing/sending/active/scheduled → redeeming → limit_reached → locked

AUTO-SET BY SYSTEM:
- rewards.reward_source = 'vip_tier' (always for VIP rewards)
- rewards.redemption_type:
  - 'instant' for: gift_card, spark_ads, physical_gift, experience
  - 'scheduled' for: commission_boost, discount
- rewards.name = auto-generated from type + value_data (see SchemaFinalv2.md backend generation rules)
```

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as other screens |
| Page header | Headings > With actions | Title + [Create Reward] button |
| Data table | Tables > Simple | All VIP rewards list |
| Create/Edit drawer | Drawer > With sticky footer | Reward form |
| Form inputs | Input Groups > With label | Amount, percent, duration, description |
| Dropdowns | Select Menus > Simple native | Type, tier, frequency |
| Toggles | Toggles > With right label | Enabled, requires_size |
| Status badges | Badges > Pill with border | active (green), inactive (gray) |
| Empty state | Empty States > Simple | "No VIP rewards yet" |

## Flows

### Flow 1: Create VIP Tier Reward

**Information to input from Admin UI:**
1. Reward type: rewards.type
   - Options: 'gift_card' | 'commission_boost' | 'spark_ads' | 'discount' | 'physical_gift' | 'experience'
2. Reward name: rewards.name
3. Description: rewards.description
4. Value configuration: rewards.value_data (varies by type)
   - gift_card: { amount: number }
   - commission_boost: { percent: number, duration_days: number }
   - spark_ads: { amount: number }
   - discount: { percent: number, duration_minutes: number, coupon_code: string, max_uses: number }
   - physical_gift: { requires_size: boolean, size_category: string, size_options: string[] }
   - experience: { display_text: string }
5. VIP level availability: rewards.tier_eligibility
6. Redemption frequency: rewards.redemption_frequency
   - Options: 'one-time' | 'monthly' | 'weekly' | 'unlimited'
7. Redemption quantity limit: rewards.redemption_quantity
8. Display order: rewards.display_order
9. Preview from lower tier: rewards.preview_from_tier (optional)
10. If Reward is active: rewards.enabled = true

**Auto-set by system:**
- rewards.reward_source = 'vip_tier'
- rewards.redemption_type = 'instant' (gift_card, spark_ads, experience, physical_gift) OR 'scheduled' (commission_boost, discount)

---

### Flow 2: Edit VIP Tier Reward

**Information to view from Admin UI:**
List of existing VIP tier rewards (WHERE reward_source = 'vip_tier'):
- Name: rewards.name
- Type: rewards.type
- Tier: rewards.tier_eligibility + tiers.tier_name
- Status: rewards.enabled (Active/Inactive)
- Usage: COUNT(redemptions) / rewards.redemption_quantity

**Action (Manual):**
1. Click reward to edit
2. Modify any field from Flow 1
3. Save changes

---

### Flow 3: Enable/Disable Reward

**Information to view from Admin UI:**
- Reward name: rewards.name
- Current status: rewards.enabled

**Action (Manual):**
1. Toggle rewards.enabled between true/false

**Note:** Disabling a reward:
- Hides from creator Rewards page
- Does NOT affect active redemptions already in progress

---

# Screen 5: Sales Adjustments

## Wireframe

### Main Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  SALES ADJUSTMENTS                                      │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  Sales Adjustments                                  ││
│  ○ Missions       │  └─────────────────────────────────────────────────────┘│
│  ○ VIP Rewards    │                                                         │
│  ● Sales Adj.     │  ┌─ SEARCH CREATOR ───────────────────────────────────┐ │
│  ○ Creator Lookup │  │ Handle: [@____________] [Search]                   │ │
│  ○ Data Sync      │  └────────────────────────────────────────────────────┘ │
│  ○ Reports        │                                                         │
│                   │  ┌─ CREATOR INFO (shown after search) ────────────────┐ │
│                   │  │ @creator_jane                                      │ │
│                   │  │ Total Sales: $5,420    Checkpoint: $1,200          │ │
│                   │  │ Current Tier: Gold     Manual Adj: +$300           │ │
│                   │  └────────────────────────────────────────────────────┘ │
│                   │                                                         │
│                   │  ┌─ ADD ADJUSTMENT (shown after search) ──────────────┐ │
│                   │  │ Amount: [$_____] (positive or negative)            │ │
│                   │  │   OR                                               │ │
│                   │  │ Units: [_____] (if client uses units mode)         │ │
│                   │  │                                                    │ │
│                   │  │ Type: [manual_sale ▼]                              │ │
│                   │  │   manual_sale | refund | bonus | correction        │ │
│                   │  │                                                    │ │
│                   │  │ Reason: [________________________________]         │ │
│                   │  │         (required)                                 │ │
│                   │  │                                                    │ │
│                   │  │                           [Submit Adjustment]      │ │
│                   │  └────────────────────────────────────────────────────┘ │
│                   │                                                         │
│                   │  ┌─ ADJUSTMENT HISTORY (shown after search) ──────────┐ │
│                   │  │Date      │Amount │Type       │Reason     │Status   │ │
│                   │  ├──────────┼───────┼───────────┼───────────┼─────────┤ │
│                   │  │Nov 20    │+$200  │manual_sale│Popup event│applied  │ │
│                   │  │Nov 15    │-$50   │refund     │Return item│applied  │ │
│                   │  │Nov 25    │+$100  │bonus      │Great video│pending  │ │
│                   │  └──────────┴───────┴───────────┴───────────┴─────────┘ │
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘

SECTIONS:
1. SEARCH CREATOR - Find user by handle
2. CREATOR INFO - Shows current stats (hidden until search)
3. ADD ADJUSTMENT - Form to create adjustment (hidden until search)
4. ADJUSTMENT HISTORY - Past adjustments for this user (hidden until search)
```

### Field Mappings (from SchemaFinalv2.md)

**Search Input:**
- Handle: users.tiktok_handle

**Creator Info (read-only, from users table line 142-143):**
- Total Sales: users.total_sales (DECIMAL)
- Checkpoint Sales: users.checkpoint_sales_current (DECIMAL)
- Current Tier: users.current_tier → JOIN tiers.tier_name
- Manual Adj Total: users.manual_adjustments_total (DECIMAL)

NOTE: If client uses units mode (clients.vip_metric = 'units'):
- Show users.total_units instead of total_sales
- Show users.checkpoint_units_current instead of checkpoint_sales
- Show users.manual_adjustments_units instead of manual_adjustments_total

**Add Adjustment Form (from sales_adjustments table lines 275-284):**
- Amount: sales_adjustments.amount (DECIMAL 10,2) - for sales mode
- Units: sales_adjustments.amount_units (INTEGER) - for units mode
- Type: sales_adjustments.adjustment_type
  - Options: 'manual_sale' | 'refund' | 'bonus' | 'correction'
- Reason: sales_adjustments.reason (TEXT, NOT NULL)

**Auto-set by system:**
- sales_adjustments.id = UUID generated
- sales_adjustments.user_id = searched user's ID
- sales_adjustments.client_id = admin's client_id
- sales_adjustments.adjusted_by = admin's user ID
- sales_adjustments.created_at = NOW()
- sales_adjustments.applied_at = NULL (set during next daily sync)

**Adjustment History Table (from sales_adjustments table):**
- Date: sales_adjustments.created_at
- Amount: sales_adjustments.amount OR sales_adjustments.amount_units (based on client mode)
- Type: sales_adjustments.adjustment_type
- Reason: sales_adjustments.reason
- Status:
  - 'pending' (yellow badge) if applied_at IS NULL
  - 'applied' (green badge) if applied_at IS NOT NULL

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as other screens |
| Page header | Headings > Simple | Just title, no action button |
| Search section | Input Groups > With label + Button | Handle search field |
| Creator info card | Description Lists | Read-only stats display |
| Form inputs | Input Groups > With label | Amount/Units, Reason |
| Dropdown | Select Menus > Simple native | Adjustment type |
| Submit button | Buttons > Primary | Submit Adjustment |
| History table | Tables > Simple | Past adjustments |
| Status badges | Badges > Pill with border | applied (green), pending (yellow) |

## Use Cases
- Offline event sales (creator sold at popup, not tracked in TikTok)
- Refund corrections (TikTok refund not reflected in Cruva)
- Bonus credits (exceptional content quality reward)

## Flows

### Flow 1: Add Sales Adjustment

**Trigger:** Admin identifies need for manual correction

**Information to input from Admin UI:**
1. Creator lookup: users.tiktok_handle (search field)
2. Adjustment amount: sales_adjustments.amount (positive or negative)
3. Adjustment type: sales_adjustments.adjustment_type
   - Options: 'offline_sale' | 'refund_correction' | 'bonus' | 'other'
4. Reason: sales_adjustments.reason (text field, required)

**Information to view (after lookup):**
1. Current total sales: users.total_sales
2. Current checkpoint sales: users.checkpoint_sales_current
3. Current tier: users.current_tier
4. Adjustment history for this user (if any)

**Action (Manual):**
1. Search for creator by handle
2. Enter adjustment amount (+ or -)
3. Select adjustment type
4. Enter reason
5. Click "Submit Adjustment"

**Status Update:**
- Creates sales_adjustments record with applied_at = NULL
- Applied during next daily sync (see Loyalty.md Flow 7 Step 0)
- Updates users.total_sales and users.manual_adjustments_total

---

### Flow 2: View Adjustment History

**Information to view from Admin UI:**
1. sales_adjustments.amount
2. sales_adjustments.adjustment_type
3. sales_adjustments.reason
4. sales_adjustments.created_at
5. sales_adjustments.applied_at (NULL if pending, timestamp if applied)
6. sales_adjustments.created_by (admin who created)

---

# Screen 6: Creator Lookup

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  CREATOR LOOKUP                                         │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  Creator Lookup                                     ││
│  ○ Missions       │  └─────────────────────────────────────────────────────┘│
│  ○ VIP Rewards    │                                                         │
│  ○ Sales Adj.     │  ┌─ SEARCH ───────────────────────────────────────────┐ │
│  ● Creator Lookup │  │ Handle or Email: [@_________] [Search]             │ │
│  ○ Data Sync      │  └────────────────────────────────────────────────────┘ │
│  ○ Reports        │                                                         │
│                   │  ┌─ CREATOR PROFILE (shown after search) ─────────────┐ │
│                   │  │ Handle:        @creator_jane                       │ │
│                   │  │ Email:         jane@email.com                      │ │
│                   │  │ Current Tier:  Gold                                │ │
│                   │  │ Total Sales:   $5,420                              │ │
│                   │  │ Checkpoint:    $1,200 / $2,000                     │ │
│                   │  │ Member Since:  Jan 15, 2025                        │ │
│                   │  └────────────────────────────────────────────────────┘ │
│                   │                                                         │
│                   │  ┌─ ACTIVE REDEMPTIONS ───────────────────────────────┐ │
│                   │  │Reward        │Type       │Status    │Claimed       │ │
│                   │  ├──────────────┼───────────┼──────────┼──────────────┤ │
│                   │  │$50 Gift Card │gift_card  │claimed   │Nov 20        │ │
│                   │  │5% Pay Boost  │comm_boost │active    │Nov 15        │ │
│                   │  │Hoodie (L)    │phys_gift  │shipping  │Nov 18        │ │
│                   │  └──────────────┴───────────┴──────────┴──────────────┘ │
│                   │                                                         │
│                   │  ┌─ MISSION PROGRESS ─────────────────────────────────┐ │
│                   │  │Mission       │Type       │Progress  │Status        │ │
│                   │  ├──────────────┼───────────┼──────────┼──────────────┤ │
│                   │  │First $500    │sales      │$320/$500 │active        │ │
│                   │  │10 Videos     │videos     │7/10      │active        │ │
│                   │  │Holiday Raffle│raffle     │entered   │active        │ │
│                   │  └──────────────┴───────────┴──────────┴──────────────┘ │
│                   │                                                         │
│                   │  ┌─ REDEMPTION HISTORY (last 10) ─────────────────────┐ │
│                   │  │Reward        │Claimed    │Concluded │              │ │
│                   │  ├──────────────┼───────────┼──────────┤              │ │
│                   │  │$25 Gift Card │Oct 15     │Oct 16    │              │ │
│                   │  │10% Discount  │Oct 10     │Oct 10    │              │ │
│                   │  └──────────────┴───────────┴──────────┴──────────────┘ │
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Field Mappings (from SchemaFinalv2.md)

**Search Input:**
- Handle or Email: users.tiktok_handle OR users.email

**Creator Profile (from users table lines 127-153):**
- Handle: users.tiktok_handle
- Email: users.email
- Current Tier: users.current_tier → JOIN tiers.tier_name
- Total Sales: users.total_sales (or users.total_units for units mode)
- Checkpoint Progress: users.checkpoint_sales_current / users.checkpoint_sales_target
- Member Since: users.created_at

NOTE: If client uses units mode (clients.vip_metric = 'units'):
- Show users.total_units instead of total_sales
- Show users.checkpoint_units_current / users.checkpoint_units_target

**Active Redemptions (from redemptions table):**
- Filter: WHERE user_id = ? AND status NOT IN ('concluded', 'rejected') AND deleted_at IS NULL
- Reward: rewards.name
- Type: rewards.type
- Status: redemptions.status (+ sub-state from commission_boost_redemptions.boost_status or physical_gift_redemptions)
- Claimed: redemptions.claimed_at

**Mission Progress (from mission_progress table):**
- Filter: WHERE user_id = ? AND status IN ('active', 'completed')
- Mission: missions.display_name
- Type: missions.mission_type
- Progress: mission_progress.current_value / missions.target_value
- Status: mission_progress.status ('active' | 'dormant' | 'completed')

**Redemption History (from redemptions table):**
- Filter: WHERE user_id = ? AND status = 'concluded' ORDER BY concluded_at DESC LIMIT 10
- Reward: rewards.name
- Claimed: redemptions.claimed_at
- Concluded: redemptions.concluded_at

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as other screens |
| Page header | Headings > Simple | Just title |
| Search section | Input Groups > With label + Button | Handle/email search |
| Creator profile | Description Lists > Left-aligned | Read-only key-value pairs |
| Data tables (3x) | Tables > Simple | Redemptions, Progress, History |
| Status badges | Badges > Pill with border | active, claimed, shipping, etc. |
| Empty states | Empty States > Simple | "No active redemptions" etc. |

## Flows

### Flow 1: Search Creator

**Purpose:** Support/troubleshooting when creator asks about their status

**Information to input from Admin UI:**
1. Search by: users.tiktok_handle OR users.email

**Information to view (after lookup):**

#### Creator Profile
1. Handle: users.tiktok_handle
2. Email: users.email
3. Current tier: users.current_tier + tiers.tier_name
4. Total sales: users.total_sales
5. Checkpoint sales: users.checkpoint_sales_current
6. Member since: users.created_at

#### Active Redemptions
List of redemptions WHERE status NOT IN ('concluded', 'rejected'):
- Reward name: rewards.name
- Type: rewards.type
- Status: redemptions.status (+ sub-state if applicable)
- Claimed at: redemptions.claimed_at

#### Mission Progress
List of mission_progress for this user:
- Mission name: missions.display_name
- Status: mission_progress.status
- Progress: mission_progress.current_value / missions.target_value

#### Redemption History
List of concluded redemptions (last 10):
- Reward name: rewards.name
- Claimed: redemptions.claimed_at
- Concluded: redemptions.concluded_at

---

# Screen 7: Data Sync

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  DATA SYNC                                              │
│                   │                                                         │
│  ○ Dashboard      │  ┌─────────────────────────────────────────────────────┐│
│  ○ Redemptions    │  │  Data Sync                                          ││
│  ○ Missions       │  └─────────────────────────────────────────────────────┘│
│  ○ VIP Rewards    │                                                         │
│  ○ Sales Adj.     │  ┌─ SYNC STATUS ──────────────────────────────────────┐ │
│  ○ Creator Lookup │  │                                                    │ │
│  ● Data Sync      │  │ Status:          ● Running  ○ Success  ○ Failed    │ │
│  ○ Reports        │  │ Last Sync:       Nov 25, 2025 6:00 AM EST          │ │
│                   │  │ Records:         1,247 processed                   │ │
│                   │  │ Error:           -                                 │ │
│                   │  │                                                    │ │
│                   │  └────────────────────────────────────────────────────┘ │
│                   │                                                         │
│                   │  ┌─ SYNC HISTORY (last 10) ───────────────────────────┐ │
│                   │  │Date        │Status │Records│Source  │Error         │ │
│                   │  ├────────────┼───────┼───────┼────────┼──────────────┤ │
│                   │  │Nov 25 6AM  │success│1,247  │auto    │-             │ │
│                   │  │Nov 24 6AM  │success│1,198  │auto    │-             │ │
│                   │  │Nov 23 6AM  │failed │0      │auto    │Timeout       │ │
│                   │  │Nov 22 8AM  │success│1,180  │manual  │-             │ │
│                   │  └────────────┴───────┴───────┴────────┴──────────────┘ │
│                   │                                                         │
│                   │  ════════════════════════════════════════════════════  │
│                   │                                                         │
│                   │  ┌─ MANUAL CSV UPLOAD (Fallback) ─────────────────────┐ │
│                   │  │                                                    │ │
│                   │  │ Use when automated sync fails                      │ │
│                   │  │                                                    │ │
│                   │  │ CSV Type: [creator_metrics ▼]                      │ │
│                   │  │                                                    │ │
│                   │  │ ┌────────────────────────────────────────────────┐ │ │
│                   │  │ │  Drag and drop CSV file here                  │ │ │
│                   │  │ │  or click to browse                           │ │ │
│                   │  │ └────────────────────────────────────────────────┘ │ │
│                   │  │                                                    │ │
│                   │  │                            [Process CSV]           │ │
│                   │  │                                                    │ │
│                   │  └────────────────────────────────────────────────────┘ │
│                   │                                                         │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### Field Mappings

**Sync Status (from sync_logs table - SchemaFinalv2.md section 1.10):**
- Status: sync_logs.status ('running' | 'success' | 'failed')
- Last Sync: sync_logs.completed_at (or started_at if status='running')
- Records: sync_logs.records_processed
- Error: sync_logs.error_message (NULL if success)

**Sync History:**
- Filter: ORDER BY started_at DESC LIMIT 10
- Date: sync_logs.completed_at (or started_at if status='running')
- Status: sync_logs.status (badge)
- Records: sync_logs.records_processed
- Source: sync_logs.source ('auto' | 'manual')
- Error: sync_logs.error_message
- File Name: sync_logs.file_name (for manual uploads)
- Triggered By: sync_logs.triggered_by (admin user, for manual uploads)

**Manual Upload:**
- CSV Type: 'creator_metrics' (dropdown)
- File: file upload field
- Action: [Process CSV] button creates sync_logs entry with source='manual'

## TailwindPlus Components

| Element | Component | Notes |
|---------|-----------|-------|
| Shell | Sidebar Layout | Same as other screens |
| Page header | Headings > Simple | Just title |
| Status card | Description Lists > Left-aligned | Current sync status |
| History table | Tables > Simple | Past syncs |
| Status badges | Badges > Pill with border | success (green), failed (red), running (blue) |
| File upload | File Upload - Simple styled | Native input with Tailwind styling |
| Dropdown | Select Menus > Simple native | CSV type |
| Button | Buttons > Primary | Process CSV |
| Divider | Dividers > With title | Separates sections |

## Flows

### Flow 1: View Sync Status

**Purpose:** Monitor automated Cruva sync health

**Information to view from Admin UI:**
1. Last successful sync: sync_logs.completed_at
2. Sync status: 'success' | 'failed' | 'running'
3. Records processed: sync_logs.records_processed
4. Error message (if failed): sync_logs.error_message

---

### Flow 2: Manual CSV Upload (Fallback)

**Trigger:** Automation failure (Puppeteer blocked, Cruva down, etc.)

**Information to input from Admin UI:**
1. CSV file upload field
2. CSV type: 'creator_metrics' (sales, units, etc.)

**Action (Manual):**
1. Download CSV from Cruva manually
2. Upload via Admin UI
3. Click "Process CSV"

**Status Update:**
- System processes CSV same as automated sync
- Creates sync_log entry with source = 'manual'
- Stores file_name and triggered_by (admin user ID)
- Updates metrics, mission_progress, tier calculations

---

# Screen 8: Reports

## Wireframe
TODO

## TailwindPlus Components
TODO

## Reports

### Report 1: Rewards Summary (Monthly/Quarterly)

**Purpose:** Answer "How much did we spend on rewards this period?"

**Information to view from Admin UI:**
1. Date range selector (This Month / This Quarter / Custom)
2. Breakdown by reward type:
   - Gift Cards: COUNT + Total $ spent (SUM of rewards.value_data.amount)
   - Spark Ads: COUNT + Total $ spent
   - Commission Boosts: COUNT + Total $ paid (SUM of commission_boost_redemptions.final_payout_amount)
   - Discounts: COUNT given
   - Physical Gifts: COUNT shipped
   - Experiences: COUNT delivered

**Filters:**
- Status: concluded only (actually delivered/paid)

---

### Report 2: Creator Activity Summary

**Purpose:** Answer "How many creators claimed rewards this month?"

**Information to view from Admin UI:**
1. Date range selector
2. Total unique creators who claimed rewards
3. Total redemptions count
4. Breakdown by reward type

---
