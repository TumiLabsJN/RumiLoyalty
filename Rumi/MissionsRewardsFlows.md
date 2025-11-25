# RAFFLE FLOW - ATTRIBUTE MAPPING

## Which Attributes From Which Tables Impact Raffles

| Step | Action | Type | missions | mission_progress | redemptions | raffle_participations |
|------|--------|------|----------|------------------|-------------|----------------------|
| **0** | Admin creates raffle | **Manual** | `mission_type='raffle'`<br>`reward_id` set (can be ANY reward type)<br>`raffle_end_date` set<br>`activated=false`<br>`enabled=true` | - | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST - see Loyalty.md Flow 1 Step 6) | **Automatic** | `enabled=true` ← Trigger for cron<br>`activated=false` OR `true` ← Determines status | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true) | - | - |
| **1a** | Raffle dormant (not accepting entries) | **Automatic** | `activated=false` | `status='dormant'` | - | - |
| **1b** | Admin activates raffle | **Manual** | `activated=true` | **UPDATED:** `status='active'` | - | - |
| **2** | User participates | **Manual** | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type='instant'` | **ROW CREATED:**<br>`is_winner=NULL`<br>`participated_at` set |
| **3** | Admin picks winner | **Manual** | - | `status='completed'` | **Winner:** `status='claimable'`<br>**Losers:** `status='rejected'`<br>`rejection_reason` set | **Winner:** `is_winner=TRUE`<br>**Losers:** `is_winner=FALSE`<br>`winner_selected_at` set<br>`selected_by` set |
| **4** | Winner claims | **Manual** | - | `status='completed'` | `status='claimed'`<br>`claimed_at` set | `is_winner=TRUE` |

**Important:** Raffle flow ends at Step 4 (winner claims). The `mission_progress.status` remains `'completed'` from Step 2 onwards. Subsequent prize fulfillment steps vary by reward type:
- **Physical gifts**: `'claimed'` → `'concluded'` (3-state) - See Physical Gift Reward Flow
- **Gift cards, Spark Ads, Experiences**: `'claimed'` → `'concluded'` (3-state) - See Instant Rewards Flow
- **Commission boost**: `'claimed'` → `'fulfilled'` → `'concluded'` (4-state) - See Commission Boost Reward Flow
- **Discount**: `'claimed'` → `'fulfilled'` → `'concluded'` (4-state) - See Discount Reward Flow

---

## Key Attributes by Table

### missions (Raffle Config)
- `mission_type` - Must be 'raffle'
- `reward_id` - What winner gets (can be ANY reward type: physical_gift, gift_card, commission_boost, spark_ads, discount, experience)
  - Raffle prize name comes from rewards.name (via reward_id FK)
- `raffle_end_date` - Deadline for winner selection
- `activated` - Controls if accepting entries (false=dormant, true=active)
- `enabled` - Makes cron find it

### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'

### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which raffle participation created this redemption)
- `status` - Varies by outcome and prize type:
  - **Losers:** 'claimable' → 'rejected' (terminal state)
  - **Winners:** 'claimable' → 'claimed' → (varies by prize type)
    - **3-state prizes** (physical gift, gift card, spark ads, experience): 'claimed' → 'concluded'
    - **4-state prizes** (commission boost, discount): 'claimed' → 'fulfilled' → 'concluded'
- `rejection_reason` - Set for losers: "Raffle entry - not selected as winner"

### raffle_participations (Sub-State)
- `user_id` - Which user participated (required for UNIQUE constraint)
- `is_winner` - NULL (not picked) → TRUE (won) OR FALSE (lost)
- `participated_at` - When user entered
- `winner_selected_at` - When admin picked winner
- `selected_by` - Which admin picked

---

## Answer to Your Question

**Q: Does raffle_participations have an `activated` field?**

**A: NO** ❌

Only the `missions` table has `activated` field (controls Step 1).

`raffle_participations` has:
- `user_id` (which user participated)
- `is_winner` (NULL/TRUE/FALSE)
- `participated_at`
- `winner_selected_at`
- `selected_by`

**NO `activated` field in raffle_participations.**

**Note:** raffle_participations HAS user_id (unlike reward sub-states) because it extends missions (ONE-TO-MANY) not redemptions (ONE-TO-ONE).

---

## Raffle Reward Examples

**A raffle can have ANY reward type as the prize:**

### Example 1: Raffle for Physical Gift (Hoodie)
```sql
missions:
  mission_type = 'raffle'
  reward_id → rewards.id (where type='physical_gift')
  raffle_end_date = '2025-02-14'

rewards (the prize):
  type = 'physical_gift'
  name = 'Branded Hoodie'
  value_data = {"requires_size": true, "size_category": "clothing", "size_options": ["S","M","L","XL"]}
```
**Winner flow:** Winner selected → Winner claims → Size modal → Shipping modal → Admin ships

---

### Example 2: Raffle for Gift Card
```sql
missions:
  mission_type = 'raffle'
  reward_id → rewards.id (where type='gift_card')
  raffle_end_date = '2025-02-14'

rewards (the prize):
  type = 'gift_card'
  name = '$100 Amazon GC'
  value_data = {"amount": 100}
```
**Winner flow:** Winner selected → Winner claims → Admin emails gift card code

---

### Example 3: Raffle for Commission Boost
```sql
missions:
  mission_type = 'raffle'
  reward_id → rewards.id (where type='commission_boost')
  raffle_end_date = '2025-02-14'

rewards (the prize):
  type = 'commission_boost'
  name = '5% Boost 30d'
  value_data = {"percent": 5, "duration_days": 30}
```
**Winner flow:** Winner selected → Winner claims → Boost scheduled → Boost activates → Sales tracked → Payout

---

### Example 4: Raffle for Spark Ads
```sql
missions:
  mission_type = 'raffle'
  reward_id → rewards.id (where type='spark_ads')
  raffle_end_date = '2025-02-14'

rewards (the prize):
  type = 'spark_ads'
  name = '$200 Spark Ads'
  value_data = {"amount": 200}
```
**Winner flow:** Winner selected → Winner claims → Admin activates in TikTok Ads Manager

---
---

# STANDARD MISSIONS FLOW - ATTRIBUTE MAPPING

## Which Attributes From Which Tables Impact Standard Missions

**Mission Types:** sales_dollars, sales_units, videos, views, likes

| Step | Action | Type | missions | mission_progress | redemptions |
|------|--------|------|----------|------------------|-------------|
| **0** | Admin creates standard mission | **Manual** | `mission_type='sales_dollars'` (or sales_units/videos/views/likes)<br>`target_value` set (e.g., 1000 = $1000 or 50 units)<br>`reward_id` set<br>`activated=false`<br>`enabled=true` | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST - see Loyalty.md Flow 1 Step 6) | **Automatic** | `enabled=true` ← Trigger for cron<br>`activated=false` OR `true` ← Determines status | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true)<br>`current_value=0` | - |
| **1a** | Mission dormant | **Automatic** | `activated=false` | `status='dormant'`<br>`current_value=0` | - |
| **1b** | Mission active | **Manual** | `activated=true` | `status='active'`<br>`current_value=0` | - |
| **2** | User making progress<br>(Daily cron updates from Cruva CSV) | **Automatic** | `target_value` (goal) | `current_value` incrementing<br>e.g., 0 → 3 → 7 → 10 | - |
| **3** | User completes mission<br>(current_value >= target_value) | **Automatic** | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type` set (from reward) |
| **4** | User claims reward | **Manual** | - | `status='completed'` | `status='claimed'`<br>`claimed_at` set |

**Important:** Mission flow ends at Step 4 (user claims). The `mission_progress.status` remains `'completed'` from Step 3 onwards. Subsequent reward fulfillment steps vary by reward type and are documented in the reward-specific sections below:
- **Instant rewards** (gift_card, spark_ads, experience): `'claimed'` → `'concluded'` (3-state)
- **Physical gifts**: `'claimed'` → `'concluded'` (3-state)
- **Commission boost**: `'claimed'` → `'fulfilled'` → `'concluded'` (4-state with payment flow)
- **Discount**: `'claimed'` → `'fulfilled'` → `'concluded'` (4-state with activation)

---

## Key Attributes by Table

### missions (Mission Config)
- `mission_type` - 'sales_dollars', 'sales_units', 'videos', 'views', 'likes'
- `target_value` - Goal (e.g., 1000 = $1000 or 50 units, 5 videos)
- `reward_id` - What user gets when complete
- `enabled` - Makes cron find it
- `activated` - Controls if mission is dormant/active

### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'
- `current_value` - Progress toward target (updated daily by cron, metric-aware)
  - **sales_dollars** (sales mode clients): `metrics.checkpoint_sales + users.manual_adjustments_total`
  - **sales_units** (units mode clients): `metrics.checkpoint_units_sold + users.manual_adjustments_units`
  - **videos**: Video count from videos table (posted since checkpoint_start)
  - **views**: Total views from videos table (checkpoint period)
  - **likes**: Total likes from videos table (checkpoint period)

### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which mission completion created this redemption)
- `status` - 'claimable' → 'claimed' → (varies by reward type)
  - **Note:** After 'claimed', the status flow varies by reward type:
    - **3-state flow** (instant rewards, physical gifts): 'claimed' → 'concluded'
    - **4-state flow** (commission boost, discount): 'claimed' → 'fulfilled' → 'concluded'
  - See individual reward flow sections below for detailed status transitions

---

## Progress Tracking Examples

### Example 1: Sales Dollars Mission (target_value=1000)

**Timeline:**
```
Day 1 (Mon): mission_progress.current_value = 0
Day 2 (Tue): Daily cron runs → current_value = 347  ($347.82 rounded to $347)
Day 3 (Wed): Daily cron runs → current_value = 823  ($823.19 total)
Day 4 (Thu): Daily cron runs → current_value = 1247 ($1247.50 total)
             → current_value >= target_value (1247 >= 1000)
             → mission_progress.status = 'completed'
             → redemptions.status = 'claimable' (created)
```

### Example 2: Sales Units Mission (target_value=50)

**Timeline:**
```
Day 1 (Mon): mission_progress.current_value = 0
Day 2 (Tue): Daily cron runs → current_value = 12  (12 units sold)
Day 3 (Wed): Daily cron runs → current_value = 38  (38 units total)
Day 4 (Thu): Daily cron runs → current_value = 53  (53 units total)
             → current_value >= target_value (53 >= 50)
             → mission_progress.status = 'completed'
             → redemptions.status = 'claimable' (created)
```

### Example 3: Videos Mission (target_value=5)

**Timeline:**
```
Week 1: mission_progress.current_value = 2 (posted 2 videos)
Week 2: Daily cron runs → current_value = 4 (posted 2 more videos)
Week 3: Daily cron runs → current_value = 5 (posted 1 more video)
        → current_value >= target_value (5 >= 5)
        → mission_progress.status = 'completed'
        → redemptions.status = 'claimable' (created)
```

---

## Key Differences Between Mission Types

| Aspect | Raffle | Standard Missions |
|--------|--------|-------------------|
| **Mission type** | `mission_type='raffle'` | `mission_type='sales_dollars/sales_units/videos/views/likes'` |
| **Has target_value** | No (always 0) | Yes (e.g., $1000, 50 units, 5 videos) |
| **Progress tracking** | No progress (just participation) | Yes (current_value increments daily) |
| **Completion trigger** | User clicks "Participate" | `current_value >= target_value` |
| **Who completes** | Everyone who participates | Everyone who hits target |
| **Who gets reward** | Winner only (admin selects) | Everyone who completes |
| **Sub-state table** | raffle_participations | None (unless reward has sub-state) |

---

## How Daily Cron Updates current_value

**From Loyalty.md Flow 1 Step 6:**

```typescript
// For each mission_progress row with status='active'
const missionProgress = await db.mission_progress.findMany({
  where: { status: 'active' }
});

for (const mp of missionProgress) {
  const mission = await db.missions.findUnique({ where: { id: mp.mission_id } });
  const user = await db.users.findUnique({ where: { id: mp.user_id } });

  let newValue = 0;

  switch (mission.mission_type) {
    case 'sales_dollars':
      // Sales mode: checkpoint sales + manual adjustments
      const metrics = await db.metrics.findFirst({
        where: { user_id: user.id }
      });
      newValue = Math.round(metrics.checkpoint_sales + user.manual_adjustments_total);
      break;
    case 'sales_units':
      // Units mode: checkpoint units + manual adjustments
      const metricsUnits = await db.metrics.findFirst({
        where: { user_id: user.id }
      });
      newValue = metricsUnits.checkpoint_units_sold + user.manual_adjustments_units;
      break;
    case 'videos':
      newValue = user.checkpoint_videos_posted; // Checkpoint period videos
      break;
    case 'views':
      newValue = user.checkpoint_total_views; // Checkpoint period views
      break;
    case 'likes':
      newValue = user.checkpoint_total_likes; // Checkpoint period likes
      break;
  }

  // Update current_value
  await db.mission_progress.update({
    where: { id: mp.id },
    data: { current_value: newValue }
  });

  // Check if completed
  if (newValue >= mission.target_value) {
    await db.mission_progress.update({
      where: { id: mp.id },
      data: { status: 'completed', completed_at: new Date() }
    });

    // Create claimable redemption
    await db.redemptions.create({
      data: {
        user_id: mp.user_id,
        mission_progress_id: mp.id,
        reward_id: mission.reward_id,
        status: 'claimable',
        client_id: mission.client_id
      }
    });
  }
}
```

---
---

# REWARDS
## PHYSICAL GIFT REWARD FLOW - ATTRIBUTE MAPPING

**Note:** This is a REWARD flow, not a mission flow. Physical gift is a reward type that can be assigned to ANY mission (raffle, sales, videos, etc.).

### Which Attributes From Which Tables Impact Physical Gifts

| Step | Action | missions | rewards | mission_progress | redemptions | physical_gift_redemptions |
|------|--------|----------|---------|------------------|-------------|--------------------------|
| **0** | Admin creates mission with physical gift reward | `mission_type='sales_dollars'` (or sales_units/videos/views/likes)<br>`target_value` set<br>`reward_id` set<br>`activated=false`<br>`enabled=true` | `type='physical_gift'`<br>`value_data.requires_size` set<br>`value_data.size_category` set (if needed)<br>`value_data.size_options` set (if needed) | - | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST) | `enabled=true` ← Trigger<br>`activated` ← Determines status | - | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true)<br>`current_value=0` | - | - |
| **1a** | Mission dormant | `activated=false` | - | `status='dormant'` | - | - |
| **1b** | Mission active | `activated=true` | - | `status='active'`<br>`current_value` updating | - | - |
| **2** | User completes mission (hits target) | - | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type='instant'` | - |
| **3a** | User claims (requires_size=false)<br>Shipping modal only | - | `value_data.requires_size=false` | `status='completed'` | `status='claimed'`<br>`claimed_at` set | **ROW CREATED:**<br>`requires_size=false`<br>`size_category=NULL`<br>`size_value=NULL`<br>`shipping_address_line1` set<br>`shipping_city` set<br>`shipping_state` set<br>`shipping_postal_code` set<br>`shipping_info_submitted_at` set |
| **3b** | User claims (requires_size=true)<br>Size modal → Shipping modal | - | `value_data.requires_size=true`<br>`value_data.size_category` shown<br>`value_data.size_options` shown | `status='completed'` | `status='claimed'`<br>`claimed_at` set | **ROW CREATED:**<br>`requires_size=true`<br>`size_category` set (from reward)<br>`size_value` set (user selected)<br>`size_submitted_at` set<br>`shipping_address_line1` set<br>`shipping_city` set<br>`shipping_state` set<br>`shipping_postal_code` set<br>`shipping_info_submitted_at` set |
| **4** | Admin ships item | - | - | `status='completed'` | `status='claimed'` ← **STAYS 'claimed'** | `tracking_number` set<br>`carrier` set<br>`shipped_at` set |
| **5** | Package delivered | - | - | `status='completed'` | `status='concluded'`<br>`concluded_at` set | `delivered_at` set |

**Important:** The `redemptions.status` field stays `'claimed'` from Step 3 through Step 4. The frontend determines the UI display status by checking `physical_gift_redemption.shipped_at`:
- **Step 3a/3b** (address submitted, not shipped): `shipped_at IS NULL` → UI shows **"Redeeming Physical"** badge
- **Step 4** (admin shipped item): `shipped_at IS NOT NULL` → UI shows **"Sending"** badge
- **Step 5** (delivered): `redemptions.status='concluded'` → Moves to **Rewards History** page

---

### Key Attributes by Table

#### missions (Mission Config)
- `mission_type` - 'sales_dollars', 'sales_units', 'videos', 'views', 'likes' (NOT 'physical_gift' - that's reward type)
- `target_value` - Goal to achieve (e.g., $1000, 50 units, 5 videos)
- `reward_id` - Points to physical_gift reward
- `enabled` - Makes cron find it
- `activated` - Controls if mission is dormant/active

#### rewards (Physical Gift Config)
- `type` - Must be 'physical_gift'
- `value_data.requires_size` - Controls UI flow (size modal or not)
- `value_data.size_category` - 'clothing', 'shoes', etc.
- `value_data.size_options` - Array of sizes to show user

#### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'
- `current_value` - Progress toward target (dollars, units sold, video count, etc.)

#### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which mission completion created this redemption)
- `status` - 'claimable' → 'claimed' → 'concluded'
  - **Note:** Physical gifts do NOT use 'fulfilled' status. Status stays 'claimed' from Step 3 through Step 4.
  - **Frontend UI status** is determined by `physical_gift_redemption.shipped_at`:
    - `shipped_at IS NULL` → UI shows 'redeeming_physical' (processing order)
    - `shipped_at IS NOT NULL` → UI shows 'sending' (gift on the way)

#### physical_gift_redemptions (Sub-State: Size + Shipping + Tracking)
- `requires_size` - Copied from reward config
- `size_category` - Copied from reward config (if requires_size=true)
- `size_value` - User's selected size (if requires_size=true)
- `shipping_address_line1/city/state/postal_code` - User's address
- `tracking_number/carrier` - Admin fills when shipping
- `shipped_at` - When admin marked as shipped
- `delivered_at` - When package delivered

---

## INSTANT REWARDS FLOW - ATTRIBUTE MAPPING

**Note:** This flow applies to 3 reward types: gift_card, spark_ads, experience

**Pattern:** Instant fulfillment - no sub-state tables, no scheduling

### Which Attributes From Which Tables Impact Instant Rewards

| Step | Action | missions | rewards | mission_progress | redemptions |
|------|--------|----------|---------|------------------|-------------|
| **0** | Admin creates mission with instant reward | `mission_type='sales_dollars'` (or sales_units/videos/views/likes)<br>`target_value` set<br>`reward_id` set<br>`activated=false`<br>`enabled=true` | `type='gift_card'` OR `'spark_ads'` OR `'experience'`<br>`value_data` set | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST - see Loyalty.md Flow 1 Step 6) | `enabled=true` ← Trigger<br>`activated` ← Determines status | - | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true)<br>`current_value=0` | - |
| **1a** | Mission dormant | `activated=false` | - | `status='dormant'` | - |
| **1b** | Mission active | `activated=true` | - | `status='active'`<br>`current_value` updating | - |
| **2** | User completes mission (hits target) | - | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type='instant'` |
| **3** | User claims | - | - | `status='completed'` | `status='claimed'`<br>`claimed_at` set |
| **4** | Admin marks delivered | - | - | `status='completed'` | `status='concluded'`<br>`concluded_at` set |

**Important:** The `redemptions.status` field transitions directly from `'claimed'` to `'concluded'`. Instant rewards do NOT use `'fulfilled'` status. The frontend determines the UI display status:
- **Step 3** (user claimed): `status='claimed'` → UI shows **"Redeeming"** badge
- **Step 4** (admin delivered): `status='concluded'` → Moves to **Rewards History** page

---

### Key Attributes by Table

#### missions (Mission Config)
- `mission_type` - 'sales_dollars', 'sales_units', 'videos', 'views', 'likes'
- `target_value` - Goal to achieve
- `reward_id` - Points to instant reward

#### rewards (Instant Reward Config)
- `type` - 'gift_card', 'spark_ads', or 'experience'
- `value_data` examples:
  - **gift_card:** `{"amount": 50}` - Dollar value of gift card
  - **spark_ads:** `{"amount": 100}` - Dollar value of ad credit
  - **experience:** `{}` - Uses description field for details

#### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'
- `current_value` - Progress toward target

#### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which mission completion created this redemption)
- `status` - 'claimable' → 'claimed' → 'concluded'
  - **Note:** Instant rewards do NOT use 'fulfilled' status (unlike commission_boost/discount which do)
  - **Frontend UI status** is determined by `redemptions.status`:
    - `status='claimed'` → UI shows 'redeeming' (being processed)
    - `status='concluded'` → Moved to Rewards History page

**NOTE:** Instant rewards have NO sub-state table (similar to discount rewards). All status tracking is stored directly in the `redemptions` table. This is simpler than commission_boost (which has `commission_boost_redemptions` sub-table) and physical_gift (which has `physical_gift_redemptions` sub-table).

---
---

## COMMISSION BOOST REWARD FLOW - ATTRIBUTE MAPPING

**Note:** This is a REWARD flow, not a mission flow. Commission boost is a reward type with complex 6-state lifecycle.

### Which Attributes From Which Tables Impact Commission Boost

| Step | Action | missions | rewards | mission_progress | redemptions | commission_boost_redemptions |
|------|--------|----------|---------|------------------|-------------|------------------------------|
| **0** | Admin creates mission with commission boost reward | `mission_type='sales_dollars'` (or sales_units/videos/views/likes)<br>`target_value` set<br>`reward_id` set<br>`activated=false`<br>`enabled=true` | `type='commission_boost'`<br>`value_data={"percent": 5, "duration_days": 30}`<br>`redemption_type='scheduled'` | - | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST) | `enabled=true` ← Trigger<br>`activated` ← Determines status | - | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true)<br>`current_value=0` | - | - |
| **1a** | Mission dormant | `activated=false` | - | `status='dormant'` | - | - |
| **1b** | Mission active | `activated=true` | - | `status='active'`<br>`current_value` updating | - | - |
| **2** | User completes mission (hits target) | - | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type='scheduled'` | - |
| **3** | User claims & schedules activation date | - | - | `status='completed'` | `status='claimed'`<br>`claimed_at` set<br>`scheduled_activation_date` set<br>`scheduled_activation_time='18:00:00'` (6 PM EST) | **ROW CREATED:**<br>`boost_status='scheduled'`<br>`scheduled_activation_date` set |
| **4** | Boost activates (6 PM EST on scheduled date) | - | `value_data.duration_days` | `status='completed'` | `scheduled_activation_date` reached | `boost_status='active'`<br>`scheduled_activation_date` set<br>`sales_at_activation` set (GMV at D0) |
| **5** | Boost expires (after duration_days) | - | `value_data.duration_days` elapsed | `status='completed'` | - | `boost_status='expired'`<br>`sales_at_expiration` set (GMV at DX)<br>`sales_delta` calculated<br>`final_payout_amount` calculated |
| **6** | System requests payment info | - | - | `status='completed'` | - | `boost_status='pending_info'` |
| **7** | User submits payment info | - | - | `status='completed'` | `status='fulfilled'` (auto-updated) | `boost_status='pending_payout'`<br>`payment_method` set<br>`payment_account` set<br>`payment_account_confirm` set<br>`payment_info_collected_at` set |
| **8** | Admin sends payment | - | - | `status='completed'` | `status='concluded'` (auto-updated)<br>`concluded_at` set | `boost_status='paid'`<br>`payout_sent_at` set<br>`payout_sent_by` set<br>`payout_notes` set |

---

### Key Attributes by Table

#### missions (Mission Config)
- `mission_type` - 'sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle'
- `target_value` - Goal to achieve
- `reward_id` - Points to commission_boost reward

#### rewards (Commission Boost Config)
- `type` - 'commission_boost'
- `value_data` - `{"percent": 5, "duration_days": 30}`
  - `percent` - Boost percentage (e.g., 5 = 5%)
  - `duration_days` - How long boost lasts
- `redemption_type` - 'scheduled' (requires activation date)

#### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'
- `current_value` - Progress toward target

#### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which mission completion created this redemption)
- `status` - 'claimable' → 'claimed' → 'fulfilled' → 'concluded'
- `scheduled_activation_date` - When boost will activate
- `scheduled_activation_time` - Fixed at 6 PM EST

#### commission_boost_redemptions (Sub-State: 6-State Lifecycle + Payment)
- `boost_status` - 'scheduled' → 'active' → 'expired' → 'pending_info' → 'pending_payout' → 'paid'
- `scheduled_activation_date` - When boost starts
- `sales_at_activation` - GMV at start (D0)
- `sales_at_expiration` - GMV at end (DX)
- `sales_delta` - Sales made during boost period (calculated: sales_at_expiration - sales_at_activation)
- `final_payout_amount` - Commission owed (sales_delta × boost_percent)
- `payment_method` - Payment platform ('venmo' or 'paypal')
- `payment_account` - PayPal/Venmo handle
- `payment_account_confirm` - Confirmation of payment handle
- `payment_info_collected_at` - When user submitted payment info
- `payout_sent_at` - When admin paid
- `payout_sent_by` - Which admin paid
- `payout_notes` - Admin notes (transaction ID, etc.)

**NOTE:** Commission boost has auto-sync trigger:
- When `boost_status='pending_payout'` → parent `redemptions.status` auto-updates to 'fulfilled'
- When `boost_status='paid'` → parent `redemptions.status` auto-updates to 'concluded'

See SchemaFinal.md commission_boost_state_history table for audit trail and Loyalty.md Pattern 7 for database trigger implementation.

---
---

## DISCOUNT REWARD FLOW - ATTRIBUTE MAPPING

**Note:** This is a REWARD flow. Discount is a reward type with scheduled activation (no sub-state table).

### Which Attributes From Which Tables Impact Discount

| Step | Action | missions | rewards | mission_progress | redemptions |
|------|--------|----------|---------|------------------|-------------|
| **0** | Admin creates mission with discount reward | `mission_type='sales_dollars'` (or sales_units/videos/views/likes)<br>`target_value` set<br>`reward_id` set<br>`activated=false`<br>`enabled=true` | `type='discount'`<br>`value_data={"percent": 10, "duration_minutes": 1440, "coupon_code": "GOLD10", "max_uses": 100}`<br>`redemption_type='scheduled'` | - | - |
| **0.5** | System creates mission_progress rows<br>(Daily cron at 3 PM EST) | `enabled=true` ← Trigger<br>`activated` ← Determines status | - | **ROW CREATED:**<br>`status='dormant'` (if activated=false)<br>`status='active'` (if activated=true)<br>`current_value=0` | - |
| **1a** | Mission dormant | `activated=false` | - | `status='dormant'` | - |
| **1b** | Mission active | `activated=true` | - | `status='active'`<br>`current_value` updating | - |
| **2** | User completes mission (hits target) | - | - | `status='completed'`<br>`completed_at` set | **ROW CREATED:**<br>`status='claimable'`<br>`mission_progress_id` set<br>`redemption_type='scheduled'` |
| **3** | User claims & schedules activation time slot<br>(9 AM - 4 PM EST, weekdays) | - | - | `status='completed'` | `status='claimed'`<br>`claimed_at` set<br>`scheduled_activation_date` set<br>`scheduled_activation_time` set |
| **4** | Discount activates (at scheduled time)<br>System action: Discount code becomes active for TikTok shop | - | `value_data.coupon_code` activated<br>`value_data.percent`<br>`value_data.duration_minutes` | `status='completed'` | `status='fulfilled'`<br>`fulfilled_at` set<br>`activation_date` set<br>`expiration_date` calculated (activation_date + duration_minutes) |
| **5** | Discount expires (after duration_minutes) OR max_uses reached | - | `value_data.duration_minutes` elapsed<br>OR `value_data.max_uses` reached | `status='completed'` | `status='concluded'`<br>`concluded_at` set<br>`NOW() >= expiration_date` |

---

### Key Attributes by Table

#### missions (Mission Config)
- `mission_type` - 'sales_dollars', 'sales_units', 'videos', 'views', 'likes'
- `target_value` - Goal to achieve
- `reward_id` - Points to discount reward

#### rewards (Discount Config)
- `type` - 'discount'
- `value_data` - `{"percent": 10, "duration_minutes": 1440, "coupon_code": "GOLD10", "max_uses": 100}`
  - `percent` - Discount percentage (1-100)
  - `duration_minutes` - Validity period (10 min - 365 days in minutes)
  - `coupon_code` - 2-8 character code (letters/numbers only)
  - `max_uses` - Maximum redemptions (optional)
- `redemption_type` - 'scheduled' (requires activation time)

#### mission_progress (User's Mission Status)
- `status` - 'dormant' → 'active' → 'completed'
- `current_value` - Progress toward target

#### redemptions (Reward Claim Status)
- `mission_progress_id` - Links to mission_progress.id (which mission completion created this redemption)
- `status` - 'claimable' → 'claimed' → 'fulfilled' → 'concluded'
- `scheduled_activation_date` - When discount activates (date only)
- `scheduled_activation_time` - Time slot (9 AM - 4 PM EST, weekdays only)
- `activation_date` - Actual activation timestamp (set when cron job activates discount)
- `expiration_date` - Calculated expiration timestamp (activation_date + duration_minutes)

**NOTE:** Discount has NO sub-state table. All scheduling and activation tracking stored in main redemptions table.
