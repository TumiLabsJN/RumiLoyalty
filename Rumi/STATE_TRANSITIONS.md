# State Transitions Document

**Task 0.1.3 Output - MissionsRewardsFlows.md Analysis**
**Created:** 2025-11-28

---

## 6 Mission Types

| Mission Type | target_value | Progress Metric | Completion Trigger |
|--------------|--------------|-----------------|-------------------|
| **sales_dollars** | Number (e.g., 1000 = $1000) | checkpoint_sales + manual_adjustments_total | current_value >= target_value |
| **sales_units** | Number (e.g., 50 = 50 units) | checkpoint_units_sold + manual_adjustments_units | current_value >= target_value |
| **videos** | Number (e.g., 5 = 5 videos) | checkpoint_videos_posted | current_value >= target_value |
| **views** | Number (e.g., 100000 = 100K views) | checkpoint_total_views | current_value >= target_value |
| **likes** | Number (e.g., 5000 = 5K likes) | checkpoint_total_likes | current_value >= target_value |
| **raffle** | Always 0 | N/A (participation-based) | User clicks "Participate" button |

---

## 6 Reward Types

| Reward Type | redemption_type | Has Sub-State Table | Status Flow |
|-------------|-----------------|---------------------|-------------|
| **gift_card** | instant | No | claimable → claimed → concluded (3-state) |
| **spark_ads** | instant | No | claimable → claimed → concluded (3-state) |
| **experience** | instant | No | claimable → claimed → concluded (3-state) |
| **physical_gift** | instant | Yes (`physical_gift_redemptions`) | claimable → claimed → concluded (3-state) |
| **commission_boost** | scheduled | Yes (`commission_boost_redemptions`) | claimable → claimed → fulfilled → concluded (4-state) |
| **discount** | scheduled | No | claimable → claimed → fulfilled → concluded (4-state) |

---

## State Machines

### 1. mission_progress.status (3 states)

```
┌────────────────────────────────────────────────────┐
│              MISSION PROGRESS STATE                │
└────────────────────────────────────────────────────┘

    ┌─────────┐     Admin activates      ┌────────┐     current_value >=     ┌───────────┐
    │ dormant │────────mission──────────→│ active │────────target_value────→│ completed │
    └─────────┘                          └────────┘                          └───────────┘
                                              ↑                                 (TERMINAL)
                                              │
                                    Daily cron updates
                                      current_value
```

**Valid Transitions:**
- `dormant → active` (Admin activates mission OR missions.activated=true at creation)
- `active → completed` (current_value >= target_value for standard missions, OR user clicks "Participate" for raffles)

**Invalid Transitions:**
- `dormant → completed` (must go through active)
- `completed → active` (completed is terminal)
- `completed → dormant` (completed is terminal)
- `active → dormant` (no deactivation once active)

---

### 2. redemptions.status (5 states)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        REDEMPTIONS STATUS                                   │
└────────────────────────────────────────────────────────────────────────────┘

                                          ┌─────────────────┐
                                          │    rejected     │
                                          │   (TERMINAL)    │
                                          └─────────────────┘
                                                  ↑
                                           Raffle loser
                                                  │
┌───────────┐  User clicks   ┌─────────┐  Admin action   ┌───────────┐  Admin confirms   ┌───────────┐
│ claimable │───"Claim"────→│ claimed │───────────────→│ fulfilled │─────────────────→│ concluded │
└───────────┘                └─────────┘                 └───────────┘                   │ (TERMINAL)│
                                  │                                                      └───────────┘
                                  │      For 3-state rewards                                   ↑
                                  │      (instant, physical_gift)                              │
                                  └────────────────────────────────────────────────────────────┘
```

**Valid Transitions:**
| From | To | Trigger | Applies To |
|------|-----|---------|-----------|
| claimable | claimed | User clicks "Claim" button | All reward types |
| claimable | rejected | Raffle loser (admin picks winner) | Raffle missions only |
| claimed | fulfilled | Admin marks fulfilled (scheduled rewards) | commission_boost, discount |
| claimed | concluded | Admin marks delivered (instant rewards) | gift_card, spark_ads, experience, physical_gift |
| fulfilled | concluded | Admin confirms completion | commission_boost, discount |

**Reward Type Specific Flows:**

| Reward Type | Status Flow |
|-------------|-------------|
| gift_card | claimable → claimed → concluded |
| spark_ads | claimable → claimed → concluded |
| experience | claimable → claimed → concluded |
| physical_gift | claimable → claimed → concluded |
| commission_boost | claimable → claimed → fulfilled → concluded |
| discount | claimable → claimed → fulfilled → concluded |

**Invalid Transitions:**
- `claimable → fulfilled` (must go through claimed)
- `claimable → concluded` (must go through claimed)
- `claimed → claimable` (no reversal)
- `fulfilled → claimed` (no reversal)
- `concluded → *` (terminal state)
- `rejected → *` (terminal state)

---

### 3. commission_boost_redemptions.boost_status (6 states)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                      COMMISSION BOOST SUB-STATE LIFECYCLE                                   │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────┐   2 PM EST on    ┌────────┐   duration_days   ┌─────────┐   System prompts   ┌──────────────┐
│ scheduled │───scheduled_date─→│ active │─────elapsed──────→│ expired │───for payment───→│ pending_info │
└───────────┘                   └────────┘                   └─────────┘                    └──────────────┘
                                    │                                                              │
                               Cron tracks                                                   User submits
                               sales_at_*                                                   payment info
                                                                                                   │
                                                                                                   ↓
                                                             ┌──────┐     Admin sends      ┌───────────────┐
                                                             │ paid │←─────payment────────│pending_payout │
                                                             └──────┘                      └───────────────┘
                                                            (TERMINAL)
```

**Valid Transitions:**
| From | To | Trigger | Auto-Updates Parent |
|------|-----|---------|---------------------|
| scheduled | active | 2 PM EST cron on scheduled_activation_date | redemptions.status stays 'claimed' |
| active | expired | duration_days elapsed | redemptions.status stays 'claimed' |
| expired | pending_info | System prompts user for payment info | redemptions.status stays 'claimed' |
| pending_info | pending_payout | User submits payment_method + payment_account | redemptions.status → 'fulfilled' |
| pending_payout | paid | Admin sends payment | redemptions.status → 'concluded' |

**Key Fields Updated at Each State:**
| State | Fields Set |
|-------|-----------|
| scheduled | scheduled_activation_date, boost_rate, duration_days |
| active | activated_at, sales_at_activation |
| expired | expires_at, sales_at_expiration, sales_delta, calculated_commission |
| pending_info | (waiting for user) |
| pending_payout | payment_method, payment_account, payment_info_collected_at |
| paid | payout_sent_at, payout_sent_by, payout_notes, final_payout_amount |

**Auto-Sync Trigger (Pattern 4):**
```sql
-- Database trigger automatically syncs:
scheduled/active/expired/pending_info → redemptions.status = 'claimed'
pending_payout → redemptions.status = 'fulfilled'
paid → redemptions.status = 'concluded'
```

---

### 4. raffle_participations.is_winner (3 states)

```
┌────────────────────────────────────────────────────────────────┐
│               RAFFLE PARTICIPATION STATUS                       │
└────────────────────────────────────────────────────────────────┘

                    ┌──────┐
              ┌────→│ TRUE │ (Winner - can claim prize)
              │     └──────┘
┌──────┐      │
│ NULL │──────┤
└──────┘      │     ┌───────┐
(Waiting)     └────→│ FALSE │ (Loser - redemption.status='rejected')
                    └───────┘
```

**Valid Transitions:**
- `NULL → TRUE` (Admin selects this user as winner)
- `NULL → FALSE` (Admin selects different user as winner)

**No Reversal:** Once is_winner is set, it cannot be changed.

**Impact on redemptions:**
- Winner (`is_winner=TRUE`): `redemptions.status` stays 'claimable', can proceed to claim
- Loser (`is_winner=FALSE`): `redemptions.status` → 'rejected', `rejection_reason` = "Raffle entry - not selected as winner"

---

## Complete Flow Diagrams

### Standard Mission Flow (sales_dollars/sales_units/videos/views/likes)

```
Admin creates mission (missions.enabled=true, activated=false)
         │
         ↓ [Daily cron creates mission_progress rows]
         │
mission_progress.status = 'dormant'
         │
         ↓ [Admin activates: missions.activated=true]
         │
mission_progress.status = 'active', current_value=0
         │
         ↓ [Daily cron updates current_value from Cruva data]
         │
current_value increments (0 → 347 → 823 → 1247)
         │
         ↓ [current_value >= target_value]
         │
mission_progress.status = 'completed'
redemptions.status = 'claimable' (row created)
         │
         ↓ [User clicks "Claim"]
         │
redemptions.status = 'claimed'
         │
         ↓ [Reward fulfillment - varies by type]
         │
redemptions.status = 'concluded' (TERMINAL)
```

### Raffle Mission Flow

```
Admin creates raffle (missions.mission_type='raffle', activated=false)
         │
         ↓ [Daily cron creates mission_progress rows]
         │
mission_progress.status = 'dormant'
         │
         ↓ [Admin activates: missions.activated=true]
         │
mission_progress.status = 'active'
         │
         ↓ [User clicks "Participate"]
         │
mission_progress.status = 'completed'
redemptions.status = 'claimable' (row created)
raffle_participations.is_winner = NULL (row created)
         │
         ↓ [Admin selects winner]
         │
┌────────┴────────┐
↓                 ↓
WINNER            LOSERS
is_winner=TRUE    is_winner=FALSE
redemptions.status='claimable'   redemptions.status='rejected' (TERMINAL)
         │
         ↓ [Winner clicks "Claim"]
         │
redemptions.status = 'claimed'
         │
         ↓ [Reward fulfillment - varies by prize type]
         │
redemptions.status = 'concluded' (TERMINAL)
```

---

## Reward Fulfillment Flows by Type

### 1. Instant Rewards (gift_card, spark_ads, experience)

```
redemptions.status = 'claimed'
         │
         ↓ [Admin delivers reward (emails gift card, activates spark ads, etc.)]
         │
redemptions.status = 'concluded'
```

**No sub-state table.** Simple 3-state flow.

---

### 2. Physical Gift

```
redemptions.status = 'claimed'
         │
         ↓ [User submits size (if requires_size=true) + shipping address]
         │
physical_gift_redemptions row created
  - shipping_address_*, size_value, shipped_at=NULL
         │
         ↓ [Admin ships item]
         │
physical_gift_redemptions.shipped_at = NOW()
physical_gift_redemptions.tracking_number = 'ABC123'
         │
         ↓ [Package delivered]
         │
redemptions.status = 'concluded'
physical_gift_redemptions.delivered_at = NOW()
```

**UI Status (derived from shipped_at):**
- `shipped_at IS NULL` → "Redeeming Physical" badge
- `shipped_at IS NOT NULL` → "Sending" badge
- `status = 'concluded'` → Rewards History page

---

### 3. Commission Boost

```
redemptions.status = 'claimed'
         │
         ↓ [User selects activation date]
         │
commission_boost_redemptions.boost_status = 'scheduled'
         │
         ↓ [2 PM EST on scheduled date]
         │
boost_status = 'active', sales_at_activation recorded
         │
         ↓ [duration_days elapsed]
         │
boost_status = 'expired', sales_delta calculated
         │
         ↓ [System prompts for payment]
         │
boost_status = 'pending_info'
         │
         ↓ [User submits Venmo/PayPal info]
         │
boost_status = 'pending_payout'
redemptions.status = 'fulfilled' (auto-sync)
         │
         ↓ [Admin sends payment]
         │
boost_status = 'paid'
redemptions.status = 'concluded' (auto-sync)
```

---

### 4. Discount

```
redemptions.status = 'claimed'
         │
         ↓ [User selects activation time slot (9 AM - 4 PM EST, weekdays)]
         │
redemptions.scheduled_activation_date/time set
         │
         ↓ [Cron activates at scheduled time]
         │
redemptions.status = 'fulfilled'
redemptions.activation_date = NOW()
redemptions.expiration_date = NOW() + duration_minutes
         │
         ↓ [Discount expires OR max_uses reached]
         │
redemptions.status = 'concluded'
```

**No sub-state table.** Status tracked in redemptions table.

---

## Summary: State Count by Entity

| Entity | States | Terminal States |
|--------|--------|-----------------|
| mission_progress.status | 3 | completed |
| redemptions.status | 5 | concluded, rejected |
| boost_status | 6 | paid |
| raffle_participations.is_winner | 3 (NULL, TRUE, FALSE) | TRUE, FALSE |

---

**END OF STATE TRANSITIONS DOCUMENT**
