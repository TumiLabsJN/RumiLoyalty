# MISSIONS SYSTEM - TECHNICAL SPECIFICATION

**Platform:** Rumi Loyalty Platform
**Audience:** LLMs (Future AI Assistants)
**Purpose:** Complete reference for mission mechanics and configuration
**Version:** Sequential Unlock System (Final) 
---

## TABLE OF CONTENTS

1. [Overview](#1-overview)
2. [Mission Types](#2-mission-types)
3. [Creator UI Elements](#3-creator-ui-elements)
4. [Admin Configuration](#4-admin-configuration)
5. [Rewards Assignment](#5-rewards-assignment)
6. [Sequential Unlock Mechanics](#6-sequential-unlock-mechanics)
7. [Tier & Visibility Rules](#7-tier--visibility-rules)
8. [Status Flow & Tabs](#8-status-flow--tabs)
9. [Database Schema](#9-database-schema)
10. [Edge Cases](#10-edge-cases)
11. [Example Scenarios](#11-example-scenarios)
12. [Critical Rules](#12-critical-rules)

---

## 1. OVERVIEW

### 1.1 What Are Missions?

**Missions** are task-based rewards where creators complete specific goals (sales targets, video posts, engagement metrics) to unlock rewards.

**Key Characteristics:**
- **Sequential unlock** - One mission per type active at a time
- **Fulfillment-triggered** - Next mission appears after 'completed' status
- **Not Tier-persistent** - The active mission a user may be in before Level reassignment maintains, until completion. Then the current VIP level missions continue
- **Checkpoint-reset** - VIP level resets each checkpoint, if at checkpoint reassigned → Progress resets each checkpoint period
- **Multiple types** - Creator can have sales + videos + raffle active simultaneously

### 1.2 Mission vs Rewards

| Aspect | Missions | Rewards |
|--------|----------|-------------------|
| **Access** | Complete task to unlock | Always available (tier-based) |
| **Frequency** | One per type at a time | Multiple simultaneously |
| **Reset** | Sequential (order 1 → 2 → 3) | Redemption limits (monthly/weekly) |
| **Progress** | Tracked daily (sales, views, etc.) | No progress (instant claim) |
| **Tier Change** | Persist until fulfillment | Auto-replace |

## 2. MISSION TYPES

### 2.1 Progress-Based Missions (5 Types)

**Note:** "Commercial Name" is stored in the `missions.display_name` database field.

| Mission Type | Commercial Name | Description | Tracks | Example Target |
|--------------|----------------|-------------|--------|----------------|
| **sales_dollars** | "Unlock Payday" | "Reach your sales target" | Dollar sales amount | $500 |
| **sales_units** | "Unlock Payday" | "Reach your sales target" | Units sold | 50 units |
| **videos** | "Lights, Camera, Go!" | "Film and post new clips" | Videos posted since checkpoint | 10 videos |
| **likes** | "Road to Viral" | "Rack up those likes" | Total likes on videos | 1,000 likes |
| **views** | "Eyes on You" | "Boost your total views" | Total views on videos | 50,000 views |

**Progress Calculation:**
- **Daily cron** queries source tables (metrics, videos)
- Updates `mission_progress.current_value`
- When `current_value >= target_value` → Status changes to 'completed'

**Data Sources:**
- `sales_dollars`: Checkpoint sales + manual adjustments (sales mode clients only)
  - Formula: `metrics.checkpoint_sales + users.manual_adjustments_total`
  - Used when `client.vip_metric = 'sales'`
  - Admin validation: Sales missions in sales mode must use `target_unit = 'dollars'`
- `sales_units`: Checkpoint units + manual adjustments (units mode clients only)
  - Formula: `metrics.checkpoint_units_sold + users.manual_adjustments_units`
  - Used when `client.vip_metric = 'units'`
  - Admin validation: Sales missions in units mode must use `target_unit = 'units'`
- `videos`: `videos` table count (posted since checkpoint_start)
- `likes`: `videos.likes` sum (checkpoint period)
- `views`: `videos.views` sum (checkpoint period)
- `raffle`: none (participation-based, no progress tracking)

**Important - Mission Metric Consistency (Issue 9):**
- Sales missions MUST match client.vip_metric (NO MIXING allowed)
- Units mode clients → Sales missions use `target_unit = 'units'`
- Sales mode clients → Sales missions use `target_unit = 'dollars'`
- Engagement missions (videos, likes, views) → Always use `target_unit = 'count'` (valid in both modes)
- Admin panel enforces this validation at mission creation

### 2.2 Raffles

**Note:** "Commercial Name" is stored in the `missions.display_name` database field.

| Mission Type | Commercial Name | Description | Tracks | Example Target |
| **raffle** | "Lucky Ticket" | "Enter to win {prize_name}" | Participation clicks | No requirement |

**Raffles - Unique Characteristics:**
- **Prize name is dynamic:** Comes from rewards.name field (via reward_id FK)
  - Example: "Enter to win iPhone 16 Pro"
  - Template: "Enter to win {reward.name}"
- **No progress tracking:** Creator clicks "Participate" button (not completion-based)
- **Custom deadline:** `raffle_end_date` field (not checkpoint-based)
- **Winner selection:** Admin manually selects winner after raffle ends

**Flow:**
1. **Dormant Phase:** Raffle created but `activated=false` → mission_progress.status='dormant' → Eligible users see "Raffle start will be announced soon"
2. **Activation:** Admin sets `activated=true` → mission_progress.status='active' → Eligible users see [Participate] button
3. **Participation:** Creator clicks "Participate" → Creates:
   - `mission_progress` (status='completed', completed_at set)
   - `raffle_participations` (is_winner=NULL)
   - `redemptions` (status='claimable', mission_progress_id set)
4. **Processing:** Raffle stays visible with countdown "[XX] days till raffle!"
5. **Winner Selection:** Admin selects winner after `raffle_end_date`
   - Winner: raffle_participations.is_winner=TRUE, redemptions.status='claimable' (stays in Available Missions)
   - Non-winners: raffle_participations.is_winner=FALSE, redemptions.status='rejected' (move to Completed tab)
6. **Email (Manual):** Admin downloads CSV with loser emails, sends manually (no automation)
7. **Fulfillment:** Winner claims (redemptions 'claimable' → 'claimed'), Admin fulfills (redemptions 'claimed' → 'fulfilled' → 'concluded') → Next raffle unlocks

### 2.3 Hardcoded vs Configurable Elements

| Element | Hardcoded | Configurable by Admin |
|---------|-----------|----------------------|
| **Display Name** | ✅ Yes ("Unlock Payday", etc.) | ❌ No |
| **Description** | ✅ Yes (except raffle prize_name) | ⚠️ Raffle only (prize_name) |
| **Target Value** | ❌ No | ✅ Yes (500, 1000, 2000...) |
| **Reward** | ❌ No | ✅ Yes (select from rewards) |
| **Tier Eligibility** | ❌ No | ✅ Yes (tier_1, tier_2, etc.) |
| **Display Order** | ❌ No | ✅ Yes (1, 2, 3...) |
| **Enabled/Disabled** | ❌ No | ✅ Yes (toggle) |
| **Preview Visibility** | ❌ No | ✅ Yes (preview_from_tier) |

**Why Hardcoded Names?**
- Brand consistency across platform
- Prevents naming confusion
- Admin can use `title` field for internal reference (not shown to creators)

---

## 3. ADMIN CONFIGURATION

### 3.1 Creating a Mission

**Admin Workflow:**

**Step 1: Mission Type**
- Select: Sales_dollars, Sales_units, Videos, Views, Likes, or Raffle
- (Display name and description are auto-assigned based on type)

**Step 2: Target Value**
- Sales Dollars: Dollar amount (e.g., 500 = $500)
- Sales Units: Unit amount (e.g., 10, 50)
- Videos: Number of videos (e.g., 10)
- Views: Total views (e.g., 50000)
- Likes: Total likes (e.g., 1000)
- Raffle: 0 (no progress tracking)

**Step 3: Reward Selection**
- Dropdown showing all created rewards
- Options: Gift cards, commission boosts, discounts, Spark Ads, physical gifts, experiences
- (See Section 5 for reward types)

**Step 4: Tier Eligibility**
- Select which tier can participate
- Options: tier_1, tier_2, tier_3, tier_4, tier_5, tier_6, or 'all'
- Tier names (Bronze, Silver, Gold, etc.) are configured separately in the tiers system

**Step 5: Display Order**
- Set sequential position (1, 2, 3...)
- Determines unlock order (order 1 appears first, then 2, then 3)
- Must be unique per tier+type combination

**Step 6 (Optional): Preview Visibility**
- Set `preview_from_tier` to show locked mission to lower tiers
- NULL = only eligible tier sees it
- tier_1 = Bronze+ can see (locked if below eligibility)

**Step 7 (Raffle Only): Raffle Configuration**
- **Prize Name:** Enter prize name (max 15 chars) - appears in description
- **End Date:** Select raffle end date (winner selection deadline)

**Step 8: Internal Reference (Optional)**
- **Title:** Admin-only label (e.g., "Q1 Gold Sales Push")
- **Description:** Admin notes (not shown to creators)

**Step 9: Enable**
- Toggle enabled/disabled
- Disabled missions hidden from creators

### 3.2 Modifiable Fields Summary

| Field | Required | Type | Purpose |
|-------|----------|------|---------|
| id | System | UUID | Primary key (auto-generated) |
| client_id | System | UUID | Multi-tenant isolation (auto-assigned) |
| title | No | String (255 max) | Internal admin reference (NOT shown to creators) |
| display_name | Yes | String (255 max) | User-facing mission name (e.g., "Unlock Payday", "Lights, Camera, Go!") |
| description | No | Text | Admin notes |
| mission_type | Yes | Dropdown | Sales_dollars, Sales_units, Videos, Views, Likes, Raffle |
| target_value | Yes | Integer | 500, 10, 50000, 1000, 0 (raffle) |
| reward_id | Yes | Dropdown | Reward when completed |
| tier_eligibility | Yes | Dropdown | tier_1, tier_2, tier_3, tier_4, tier_5, tier_6, all |
| display_order | Yes | Integer | 1, 2, 3... (sequential unlock) |
| preview_from_tier | No | Dropdown | NULL, tier_1, tier_2, tier_3, tier_4, tier_5, tier_6 |
| enabled | Yes | Boolean | Toggle on/off (hides mission from all users) |
| activated | Raffle only | Boolean | Raffle entry toggle: true=accepting entries, false=dormant (ignored for regular missions) |
| raffle_end_date | Raffle only | Timestamp | Winner selection deadline (ONLY for raffle type) |
| created_at | System | Timestamp | Audit trail (auto-generated) |

### 3.3 Editing & Disabling Missions

**Editing:**
- Admin can edit any field before mission is active
- Once creators have progress, avoid changing target_value (may confuse creators)

**Disabling:**
- Set `enabled = false`
- Mission disappears from creator UI
- Active `mission_progress` records remain with their current status (mission just becomes hidden)
- Use case: Temporarily remove mission from rotation

**Note:** There is no 'cancelled' status in mission_progress. Disabled missions simply become invisible to creators but progress persists.

**Deleting:**
- Not recommended if any creator has progress
- Consider disabling instead

---

## 4. REWARDS ASSIGNMENT

### 4.1 Reward Types Available for Missions

Missions can assign any reward type as a reward:

| Reward Type | Example | Description | Redemption |
|--------------|---------|-------------|------------|
| **gift_card** | "$50 Amazon Gift Card" | Monetary reward | Instant |
| **commission_boost** | "5% Commission Boost (30 days)" | Increased commission rate | Scheduled |
| **discount** | "10% TikTok Follower Discount" | Discount code activation | Scheduled |
| **spark_ads** | "$100 Spark Ads Budget" | Advertising budget | Instant |
| **physical_gift** | "Wireless Headphones" | Physical product shipment | Instant |
| **experience** | "VIP Event Access" | Event/experience access | Instant |

### 4.2 How Rewards Link to Missions

**Database Relationship:**
```
missions.reward_id → rewards.id (Foreign Key)
```

**Admin Flow:**
1. Admin creates rewards FIRST (via Rewards management)
   - Example: Create "$50 Gift Card" reward
2. Admin creates mission SECOND
   - Select reward from dropdown
   - Mission now rewards that reward when completed

**One Reward Per Mission:**
- Each mission assigns exactly ONE reward
- If admin wants multiple rewards, create separate missions

**Example Setup:**
```
Reward 1: "$25 Gift Card" (reward_id = B1)
Reward 2: "$50 Gift Card" (reward_id = B2)
Reward 3: "$100 Gift Card" (reward_id = B3)

Mission 1: Sales $500 → Rewards B1 ($25)
Mission 2: Sales $1000 → Rewards B2 ($50)
Mission 3: Sales $2000 → Rewards B3 ($100)
```

### 4.3 Redemption Flow

**After Creator Completes Mission:**
1. mission_progress.status = `completed` & System creates entry in redemptions table with:
  - status = `claimable`
  - reward_id = mission's reward_id
  - mission_progress_id = links to the completed mission
  - tier_at_claim = creator's current tier (locked)

### 4.4 Reward Availability vs Mission Rewards

**Key Difference:**

**Rewards (VIP Active Mode 1):**
- Always available based on tier
- Creator can claim anytime (subject to redemption limits)

**Missions (Mode 3):**
- Must complete task to unlock
- One at a time (sequential)
- Reward only claimable AFTER mission completion

**Example:**
- Gold tier has "$50 Gift Card" reward (always available)
- Gold tier also has Sales Mission rewarding "$50 Gift Card"
- Creator can claim reward directly OR complete mission for same reward
- Admin decides which rewards appear in both places

---

## 5. SEQUENTIAL UNLOCK MECHANICS

### 5.1 Core Concept

**Rule:** ONE active mission per mission_type per user at any time.

**Mechanism:**
1. Admin creates multiple missions with `display_order` (1, 2, 3...)
2. System shows mission with lowest `display_order` first
3. After completion + fulfillment → Next mission (order + 1) unlocks
4. Each `mission_type` has independent sequence

### 5.2 Unlock Trigger

**What triggers next mission:**
- Admin marks mission as `completed`

**Query Logic:**
```sql
-- After mission fulfilled, find next mission
SELECT * FROM missions
WHERE client_id = ?
  AND tier_eligibility = current_tier  -- Uses CURRENT tier
  AND mission_type = completed_mission_type
  AND display_order = 1  -- Always start at order 1 of current tier
  AND enabled = true
LIMIT 1
```

**Critical:** Uses **current tier**, not original mission's tier (handles tier changes).

### 5.3 Sequential Progression Example

**Setup:**
- Gold tier has 3 sales missions (orders 1, 2, 3)

**Timeline:**
```
Day 1:  Creator sees Sales Mission order=1 (target=$500)
Day 10: Completes $500 → status='completed'
Day 11: Creator claims → status='claimed'
Day 12: Admin fulfills → status='fulfilled'
        Query finds Sales Mission order=2
        Creator sees Sales Mission order=2 (target=$1000)

Day 25: Completes $1000 → Claims → Fulfills
        Query finds Sales Mission order=3
        Creator sees Sales Mission order=3 (target=$2000)

Day 45: Completes $2000 → Claims → Fulfills
        Query finds no more sales missions (sequence complete)
```

### 5.4 Multiple Types Simultaneously

**Each type has independent sequence:**

```
Active Missions (Gold Creator):
- Sales Mission order=1 (progressing through sales sequence)
- Videos Mission order=1 (progressing through videos sequence)
- Raffle Mission order=1 (progressing through raffle sequence)

After Sales Mission 1 fulfilled:
- Sales Mission order=2 appears (sales sequence advances)
- Videos Mission order=1 still active (videos sequence unchanged)
- Raffle Mission order=1 still active (raffle sequence unchanged)
```

**Key:** Each `mission_type` progresses independently.

### 5.5 Gaps in display_order

**Allowed:** Display orders don't need to be sequential (1, 2, 3...)

**Example:**
```
Gold Sales Missions:
- Mission A: display_order = 1
- Mission B: display_order = 5 (no missions with order 2, 3, 4)
- Mission C: display_order = 10

Progression:
Order 1 fulfilled → Query finds order 5 (skips gap)
Order 5 fulfilled → Query finds order 10 (skips gap)
```

**Query:** `WHERE display_order > current_order ORDER BY display_order ASC LIMIT 1`

---

## 6. TIER & VISIBILITY RULES

### 6.1 Tier Eligibility

**Field:** `missions.tier_eligibility`

**Rule:** EXACT match (not minimum threshold)
- `tier_eligibility = 'tier_3'` → Only Gold creators can participate
- `tier_eligibility = 'all'` → All tiers can participate

**Tier Values:**
- `tier_1` through `tier_6` - Individual tier levels
- `all` = Universal (all tiers)

**Note:** Tier names (Bronze, Silver, Gold, Platinum, etc.) are configured in the tiers system and may vary by client

### 6.2 Preview Visibility

**Field:** `missions.preview_from_tier`

**Purpose:** Show locked missions to lower tiers (motivate upgrades)

**Values:**
- `NULL` → Only eligible tier sees mission
- `tier_1` → tier_1+ can see (locked if below tier_eligibility)
- `tier_2` → tier_2+ can see (locked if below tier_eligibility)
- `tier_3` → tier_3+ can see (locked if below tier_eligibility)
- `tier_4` → tier_4+ can see (locked if below tier_eligibility)
- `tier_5` → tier_5+ can see (locked if below tier_eligibility)
- `tier_6` → tier_6+ can see (locked if below tier_eligibility)

**Example:**
```
Mission: tier_eligibility='tier_3', preview_from_tier='tier_1'

tier_1 creator: Sees 🔒 "Upgrade to tier_3 to unlock"
tier_2 creator: Sees 🔒 "Upgrade to tier_3 to unlock"
tier_3 creator: Sees unlocked (can participate)
tier_4/5/6 creator: Does NOT see (higher tiers don't see lower missions)
```

### 6.3 Visibility Direction

**Rule:** Lower tiers see higher tier missions (locked). Higher tiers do NOT see lower tier missions.

**Rationale:**
- Silver creators seeing Gold missions = Motivates upgrade
- Gold creators seeing Silver missions = Confusing (why show lower tier content?)

### 6.4 Sequential Lock vs Preview Lock

**Scenario:** Gold creator on Sales Mission 1, Mission 3 exists with preview settings

**If Mission 3 has `preview_from_tier='tier_3'` (Gold):**
- Gold creator SEES Mission 3 as 🔒 "Complete previous missions first"

**If Mission 3 has `preview_from_tier=NULL`:**
- Gold creator does NOT see Mission 3 (hidden until Mission 2 fulfilled)

**Rule:** `preview_from_tier` can override sequential lock if same tier is in range.

### 6.5 Tier Change Behavior

**Rule:** ALL missions persist across tier changes (no cancellation).

**Flow:**
```
Silver creator on Silver Sales Mission 1 (300/500 progress)
↓
Gets upgraded to Gold
↓
Mission persists (continues at 300/500)
↓
Completes mission (500/500) → Claims → Admin fulfills
↓
Query: WHERE tier='tier_3' (Gold) AND type='sales' AND order=1
↓
Result: Gold Sales Mission 1 appears
↓
Creator now on Gold mission sequence
```

**Key Points:**
- Old tier mission completes normally
- After fulfillment → Switches to NEW tier's sequence
- If new tier lacks mission type → No replacement appears

---

## 7. STATUS FLOW & TABS

### 7.1 Two Separate Lifecycles

The mission system uses **TWO separate database tables** with distinct lifecycles:

#### **Lifecycle 1: Mission Completion** (mission_progress table)
Tracks whether creator achieved the mission goal:
```
dormant → active → completed
```
- **dormant**: Mission visible but not yet active (raffle with activated=false)
- **active**: Creator working toward goal
- **completed**: Goal achieved (TERMINAL state)

#### **Lifecycle 2: Reward Claiming** (redemptions table)
Tracks reward claiming and fulfillment (only created AFTER mission completed):
```
claimable → claimed → fulfilled → concluded
```
- **claimable**: Mission completed, reward ready to claim
- **claimed**: Creator clicked "Claim", waiting for admin
- **fulfilled**: Admin delivered reward
- **concluded**: Reward lifecycle complete (TERMINAL state)
- **rejected**: Reward denied (raffle losers, fraud, etc.) (TERMINAL state)

**Key Concept:**
- mission_progress reaches 'completed' → System creates redemptions record with status='claimable'
- Creator then interacts with the redemptions table to claim and receive their reward
- The two tables work together but track different parts of the process

### 7.2 Mission Visibility & State Controls

The mission system uses **two separate control mechanisms** working together:

#### 7.2.1 Template-Level Controls (missions table)

**Field: `enabled`**
- **Purpose:** Master visibility switch for entire mission
- **Scope:** Affects all users at the eligible tier
- **Values:**
  - `true`: Mission exists and can be seen
  - `false`: Mission completely hidden from everyone
- **Applies to:** All mission types (sales, videos, views, likes, raffle)

**Field: `activated`**
- **Purpose:** Raffle entry acceptance toggle
- **Scope:** Controls whether users can participate in raffle
- **Values:**
  - `true`: Raffle accepting entries (users see [Participate] button)
  - `false`: Raffle dormant (users see "Raffle starts soon")
- **Applies to:** Raffle missions only (ignored for sales/videos/views/likes)
- **Default:** `false` for raffles (admin must manually activate)

**Relationship:**
```
enabled=false              → Mission completely hidden (overrides activated)
enabled=true, activated=false → Raffle visible but not accepting entries
enabled=true, activated=true  → Raffle open for participation
```

**Use Cases:**
- **Create raffle in advance:** Set `activated=false` to announce raffle but delay entries
- **Temporarily pause entries:** Set `activated=false` to close entries while keeping raffle visible
- **Remove mission entirely:** Set `enabled=false` to hide from all users

#### 7.2.2 Progress-Level States (mission_progress table)

**Field: `status`**
- **Purpose:** Tracks individual user's progress on a mission
- **Scope:** User-specific (each creator has own status)
- **Database Values (mission_progress table only):**

| Status | Meaning | When Set | Next State |
|--------|---------|----------|------------|
| `dormant` | Mission visible but not active | Raffle with activated=false, OR regular mission before checkpoint | `active` |
| `active` | In progress | Daily cron creates/activates mission | `completed` |
| `completed` | Goal reached | Daily cron detects current_value >= target_value | N/A (terminal) |

**Note:** After mission_progress.status='completed', the system creates a redemptions record with status='claimable'. The reward claiming lifecycle is tracked in the redemptions table, NOT in mission_progress.

#### 7.2.3 Reward Claimability Filtering (Issue 10)

**Problem:** Missions can repeat per checkpoint period, but some rewards are one-time forever (physical_gift, experience, gift_card).

**Solution (Option C):** Only show missions if the reward is claimable.

**Visibility Rules:**
Missions are shown to creators only if:
1. ✅ `enabled = true`
2. ✅ Tier eligibility matches (exact match or preview mode)
3. ✅ **Reward is claimable** (new rule):

**Reward Claimability Check:**
```sql
-- Unlimited/repeatable rewards (always show)
r.redemption_frequency IN ('monthly', 'weekly', 'unlimited')

OR

-- One-time per tier (show if not claimed in current tier achievement period)
(
  r.redemption_frequency = 'one-time'
  AND r.type IN ('commission_boost', 'spark_ads', 'discount')
  AND NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE user_id = ?
      AND reward_id = r.id
      AND tier_at_claim = user.current_tier
      AND claimed_at >= user.tier_achieved_at
  )
)

OR

-- One-time forever (show if NEVER claimed)
(
  r.redemption_frequency = 'one-time'
  AND r.type IN ('physical_gift', 'experience', 'gift_card')
  AND NOT EXISTS (
    SELECT 1 FROM redemptions
    WHERE user_id = ?
      AND reward_id = r.id
  )
)
```

**Example:**
```
Mission: "Sell $5,000" → Reward: Wireless Headphones (one-time forever)

1st time GOLD: Mission visible ✅
Claims headphones ✅
Demoted to SILVER → Promoted back to GOLD (2nd time)
Mission HIDDEN ❌ (headphones already claimed forever)

Mission: "Sell $2,000" → Reward: 5% Commission Boost (one-time per tier)

1st time GOLD: Mission visible ✅
Claims boost ✅
Demoted to SILVER → Promoted back to GOLD (2nd time, new tier_achieved_at)
Mission visible again ✅ (new tier achievement period)
```

**Rationale:**
- Prevents confusing UX where mission appears but reward is grayed out
- Consistent with reward auto-replace logic (irrelevant rewards disappear on tier change)
- VIP reward logic: 1st time tier achievement gets physical_gift/experience, 2nd+ time doesn't

**Frontend-Computed States (not stored in database):**

The backend API computes these "virtual" statuses from database fields:

| Computed Status | Condition | Display |
|----------------|-----------|---------|
| `available` | Raffle with `activated=true`, no progress record | [Participate] button |
| `dormant` | Raffle with `activated=false`, no progress record | "Raffle starts soon" |
| `locked` | User's tier doesn't match `tier_eligibility` | 🔒 Tier badge |

**Status Flow Examples:**

**Regular Mission (mission_progress only):**
```
(no record) → active → completed
```
Then redemptions created with status='claimable' → 'claimed' → 'fulfilled' → 'concluded'

**Raffle Mission (mission_progress only):**
```
dormant (activated=false) → active (admin sets activated=true) → completed (user clicks Participate)
```
Then redemptions created with status='claimable', and raffle_participations tracks winner selection

### 7.3 mission_progress Status Definitions

| Status | Meaning | When Set | Creator Sees |
|--------|---------|----------|--------------|
| **dormant** | Mission exists but not yet active | Raffle with activated=false | "Raffle start will be announced soon" |
| **active** | In progress | Daily cron creates/activates mission | Progress bar showing current_value/target_value |
| **completed** | Target reached | Daily cron detects current_value >= target_value | Mission stays visible; redemptions table handles claiming |

**Reward Claiming:** After mission_progress.status='completed', a redemptions record is created. The claiming/fulfillment flow is tracked in the redemptions table with statuses: 'claimable' → 'claimed' → 'fulfilled' → 'concluded'

### 7.4 Tab Placement Logic

**Available Missions Tab:**
Shows missions user can currently work on:
```sql
SELECT mp.* FROM mission_progress mp
JOIN redemptions r ON r.mission_progress_id = mp.id
WHERE mp.user_id = ?
  AND mp.status IN ('active', 'dormant', 'completed')
  AND r.status IN ('claimable', 'claimed')
  AND mp.checkpoint_start = current_checkpoint
ORDER BY mission_type, display_order
```

**Completed Missions Tab:**
Shows completed and fulfilled missions:
```sql
SELECT mp.* FROM mission_progress mp
JOIN redemptions r ON r.mission_progress_id = mp.id
WHERE mp.user_id = ?
  AND mp.status = 'completed'
  AND r.status IN ('fulfilled', 'concluded', 'rejected')
ORDER BY r.fulfilled_at DESC
```

### 7.5 mission_progress Transition Details

**dormant → active:**
- **Trigger (Raffle):** Admin sets `missions.activated=true`
- **Trigger (Regular):** Daily cron activates mission based on checkpoint period
- **Action:** Update `status='active'`
- **UI Change:** Mission becomes interactive (progress bar or participate button visible)

**active → completed:**
- **Trigger:** Daily cron detects `current_value >= target_value`
- **Action:** Update `status='completed'`, `completed_at=NOW()`, create redemptions record with `status='claimable'`
- **Notification:** Send email/push "Mission Complete! Claim your reward"
- **UI:** Mission shows in Available tab; redemptions table handles claiming flow

**Note on Claiming/Fulfillment:**
After mission_progress reaches 'completed', the redemptions table manages the reward lifecycle:
- Creator claims: `redemptions.status` = 'claimable' → 'claimed'
- Admin fulfills: `redemptions.status` = 'claimed' → 'fulfilled' → 'concluded'
- This unlocks next mission in sequence (if available)

### 7.6 Raffle Lifecycle

**Raffle Phases:**

**Phase 0 (Dormant):**
- `missions.activated=false`
- `mission_progress.status='dormant'`
- UI: "Raffle start will be announced soon"

**Phase 1 (Active/Accepting Entries):**
- Admin sets `missions.activated=true`
- `mission_progress.status='active'`
- UI: [Participate] button visible

**Phase 2 (Participated):**
- Creator clicks "Participate"
- `mission_progress.status='completed'`, `completed_at` set
- `raffle_participations` entry created with `is_winner=NULL`
- `redemptions` entry created with `status='claimable'`, `mission_progress_id` set
- UI: "[X] days till raffle!"

**Phase 3 (Winner Selection):**
- Admin selects winner after raffle_end_date
- **Winner:** `raffle_participations.is_winner=TRUE`, `redemptions.status='claimable'` (stays)
- **Losers:** `raffle_participations.is_winner=FALSE`, `redemptions.status='rejected'`
- UI: Winner sees "You Won! Claim your prize", Losers see "Better luck next time"

**Phase 4 (Fulfillment - Winner Only):**
- Winner claims: `redemptions.status` = 'claimable' → 'claimed'
- Admin fulfills: `redemptions.status` = 'claimed' → 'fulfilled' → 'concluded'
- Next raffle unlocks (if exists)

**Critical Differences from Regular Missions:**
- No progress tracking (target_value=0, current_value not used)
- Participation immediately sets status='completed' (not gradual progress)
- Winner selection uses raffle_participations.is_winner field
- Non-winners get redemptions.status='rejected'

---

## 8. DATABASE SCHEMA

### 8.1 missions Table (Templates)

**Purpose:** Admin-configured mission blueprints

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Internal admin reference (NOT shown to creators)
  title VARCHAR(255) NOT NULL, -- "Q1 Gold Sales Push"
  display_name VARCHAR(255) NOT NULL, -- "Unlock Payday" (user-facing commercial name)
  description TEXT, -- Admin notes

  -- Mission configuration
  mission_type VARCHAR(50) NOT NULL, -- 'sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle'
  target_value INTEGER NOT NULL, -- 500, 50, 10, 50000, 1000, 0 (raffle)

  -- Reward assignment
  reward_id UUID NOT NULL REFERENCES rewards(id), -- What they unlock when complete

  -- Tier & visibility
  tier_eligibility VARCHAR(50) NOT NULL, -- 'tier_1' through 'tier_6', or 'all'
  preview_from_tier VARCHAR(50) NULL, -- NULL or 'tier_1' through 'tier_6'

  -- Sequential unlock
  display_order INTEGER NOT NULL, -- 1, 2, 3... (sequential unlock position)

  -- Raffle-specific fields
  raffle_end_date TIMESTAMP NULL, -- Winner selection deadline (ONLY for raffles)
    -- Prize name comes from rewards.name via reward_id FK

  -- Controls
  enabled BOOLEAN DEFAULT true,
  activated BOOLEAN DEFAULT false, -- For raffles only: false = dormant, true = accepting entries
    -- Regular missions (sales, videos, views, likes): Ignored (always behave as activated)
    -- Raffle missions: Start dormant (false), admin manually activates to accept entries
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_raffle_requirements CHECK (
    (mission_type != 'raffle') OR
    (mission_type = 'raffle' AND raffle_end_date IS NOT NULL AND target_value = 0)
  ),
  CONSTRAINT check_non_raffle_fields CHECK (
    (mission_type = 'raffle') OR
    (mission_type != 'raffle' AND raffle_end_date IS NULL)
  ),
  CONSTRAINT check_tier_eligibility CHECK (
    tier_eligibility = 'all' OR
    tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
  ),
  CONSTRAINT check_preview_tier_missions CHECK (
    preview_from_tier IS NULL OR
    preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
  ),
  UNIQUE(client_id, tier_eligibility, mission_type, display_order)
);
```

**Key Constraints:**
- `UNIQUE(client_id, tier_eligibility, mission_type, display_order)` → Prevents duplicate orders per tier+type
- `CHECK` raffle requirements → Ensures raffles have end_date and target=0

### 8.2 mission_progress Table (User Instances)

**Purpose:** Tracks individual creator progress on missions

```sql
CREATE TABLE mission_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id), -- Multi-tenant isolation

  -- Progress tracking
  current_value INTEGER DEFAULT 0, -- 350/500, 7/10, 45000/50000
  status VARCHAR(50) DEFAULT 'active', -- Options: 'active', 'dormant', 'completed'
    -- 'dormant': Mission visible but not yet active (raffle with activated=false)
    -- 'active': In progress
    -- 'completed': Target reached (reward claiming handled by redemptions table)

  -- Status timestamps
  completed_at TIMESTAMP, -- When hit target
  created_at TIMESTAMP DEFAULT NOW(), -- Audit trail
  updated_at TIMESTAMP DEFAULT NOW(), -- Audit trail

  -- Checkpoint period linkage (missions reset at checkpoint)
  -- NOTE: These are SNAPSHOTS from users.tier_achieved_at and users.next_checkpoint_at
  -- Copied when mission is created, NEVER updated (even if user's tier changes)
  checkpoint_start TIMESTAMP, -- Snapshot of user's tier_achieved_at (when checkpoint period started)
  checkpoint_end TIMESTAMP, -- Snapshot of user's next_checkpoint_at (mission deadline)
                            -- Preserves original deadline even after tier promotions

  UNIQUE(user_id, mission_id, checkpoint_start) -- One progress per mission per checkpoint
);

CREATE INDEX idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX idx_mission_progress_status ON mission_progress(status);
CREATE INDEX idx_mission_progress_tenant ON mission_progress(client_id, user_id, status);
```

**Key Constraints:**
- `UNIQUE(user_id, mission_id, checkpoint_start)` → One progress record per mission per checkpoint period

### 8.3 raffle_participations Table (Raffle Tracking)

**Purpose:** Tracks raffle participation and winner selection

```sql
CREATE TABLE raffle_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Which user participated
  mission_progress_id UUID NOT NULL REFERENCES mission_progress(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id), -- Multi-tenant isolation

  participated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_winner BOOLEAN, -- NULL = not yet selected, TRUE = won, FALSE = lost
  winner_selected_at TIMESTAMP,
  selected_by UUID REFERENCES users(id), -- Which admin selected winner
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(mission_id, user_id), -- One entry per user per raffle
  CHECK (
    (is_winner IS NULL AND winner_selected_at IS NULL) OR
    (is_winner IS NOT NULL AND winner_selected_at IS NOT NULL)
  )
);

CREATE INDEX idx_raffle_mission ON raffle_participations(mission_id, is_winner);
CREATE INDEX idx_raffle_user ON raffle_participations(user_id, mission_id);
CREATE INDEX idx_raffle_winner ON raffle_participations(is_winner, winner_selected_at) WHERE is_winner = true;
CREATE INDEX idx_raffle_redemption ON raffle_participations(redemption_id);
```

**Why Separate Table:**
- Tracks all participants for admin winner selection
- Links raffle participation to mission_progress and redemptions
- is_winner field determines redemptions.status outcome (rejected for losers)
- Has user_id for direct queries and UNIQUE constraint (unlike reward sub-states which are ONE-TO-ONE)

**Why raffle_participations HAS user_id (unlike reward sub-states):**
- Reward sub-states (commission_boost, physical_gift) extend `redemptions` (ONE-TO-ONE, user_id redundant)
- Mission sub-states (raffle_participations) extend `missions` (ONE-TO-MANY, user_id required)
- UNIQUE(mission_id, user_id) prevents duplicate participation

---

## 9. EDGE CASES

### 9.1 Gap in display_order

**Scenario:**
```
Gold Sales Missions:
- Mission A: display_order = 1
- Mission B: display_order = 5 (no 2, 3, 4)
```

**Behavior:**
- After Mission A fulfilled → System finds Mission B (next available order)
- Gaps automatically skipped
- No blocking or errors

### 9.2 Mission Disabled Mid-Sequence

**Scenario:**
```
Gold Sales: orders 1, 2, 3
Creator completes order=1
Admin disables order=2 (enabled=false)
```

**Behavior:**
- After order=1 fulfilled → Query finds order=3 (skips disabled)
- Creator sees order=3 next
- Disabled mission hidden

### 9.3 New Tier Lacks Mission Type

**Scenario:**
```
Silver has: Sales, Videos, Views
Gold has: Sales, Likes, Raffle (NO Videos, NO Views)

Silver creator on Videos Mission 1
Gets upgraded to Gold
```

**Behavior:**
- Creator continues Silver Videos Mission 1 (persistence)
- After fulfillment → Query: `WHERE tier='tier_3' AND type='videos'`
- Result: NULL (Gold has no Videos missions)
- No replacement appears
- Creator sees only Gold's mission types going forward

### 9.4 Tier Change During Active Mission

**Scenario:**
```
Gold creator on Sales Mission 1 (300/500)
Gets demoted to Silver
```

**Behavior:**
- Mission progress continues (350/500, 400/500...)
- Completes Gold mission normally (500/500)
- Claims → Admin fulfills
- **Then:** Silver Sales Mission order=1 appears (if exists)

**Key:** Old tier mission completes first, THEN switches to new tier sequence.

### 9.5 Checkpoint Reset

**Scenario:**
```
Gold creator on Sales Mission 2 (800/1000)
Checkpoint period ends (Apr 30)
New checkpoint starts (May 1)
```

**Behavior:**
- Old progress: `{mission_id=M2, checkpoint_start='2025-01-01', status='active', current_value=800}`
- New checkpoint_start assigned: '2025-05-01'
- Query active missions for new checkpoint
- Result: Gold Sales Mission order=1 (restarts sequence)
- New progress: `{mission_id=M1, checkpoint_start='2025-05-01', status='active', current_value=0}`

**Key:** Mission sequence resets each checkpoint period.

### 9.6 Same Mission, Different Checkpoints

**Scenario:**
```
Checkpoint 1: Creator completes Sales Mission 1
Checkpoint 2: Same Sales Mission 1 appears again
```

**Behavior:**
- Checkpoint 1 record: `UNIQUE(user, mission, checkpoint_1)`
- Checkpoint 2 record: `UNIQUE(user, mission, checkpoint_2)`
- Both exist (different checkpoint_start)
- Recurring missions allowed

---

## 10. EXAMPLE SCENARIOS

### 10.1 Normal Sequential Progression

**Setup:** Gold creator, 3 sales missions (orders 1, 2, 3)

**Timeline:**
```
Day 1:  Sees Sales Mission 1 ($500 target)
Day 10: $500 reached → status='completed'
Day 11: Claims → status='claimed'
Day 12: Admin fulfills → Mission 2 unlocks ($1000 target)
Day 25: $1000 reached → Claims → Fulfills → Mission 3 unlocks
Day 45: Completes all 3 missions
```

### 10.2 Tier Demotion Mid-Mission

**Setup:** Gold creator on Sales Mission 1 (300/500), gets demoted to Silver

**Timeline:**
```
Day 1:  Gold tier, Sales Mission 1 (300/500)
Day 30: Checkpoint → Demoted to Silver
Day 31: Mission persists (NOT cancelled), still 300/500
Day 40: Completes mission (500/500)
Day 41: Claims → Fulfills
Day 42: Silver Sales Mission order=1 appears (new tier sequence)
```

### 10.3 Multiple Types Simultaneously

**Setup:** Gold creator with Sales, Videos, Raffle active

**Timeline:**
```
Day 1:  Active: Sales (100/500), Videos (3/10), Raffle (participated)
Day 15: Videos complete → Claims → Fulfills
Day 16: Active: Sales (350/500), Videos Mission 2 (0/15), Raffle (waiting)
Day 20: Sales complete → Claims → Fulfills
Day 21: Active: Sales Mission 2 (0/1000), Videos (5/15), Raffle (waiting)
```

**Key:** Each type progresses independently.

### 10.4 Raffle Winner Selection

**Setup:** 50 creators participate in Platinum raffle

**Timeline:**
```
Jan 15: Raffle created (activated=false)
        mission_progress.status='dormant' for eligible creators
        UI: "Raffle start will be announced soon"

Jan 16: Admin activates raffle (activated=true)
        mission_progress.status='active' for eligible creators
        UI: [Participate] button

Jan 20: 50 creators click "Participate"
        All 50: mission_progress.status='completed', completed_at set
        All 50: raffle_participations entries created (is_winner=NULL)
        All 50: redemptions entries created (status='claimable', mission_progress_id set)
        UI: "[12] days till raffle!"

Feb 1:  Raffle end date passes

Feb 2:  Admin selects Creator #23 as winner

Creator #23: raffle_participations.is_winner=TRUE
            redemptions.status='claimable' (stays in Available tab)
            UI: "🎉 You Won! Claim your prize"

Creators #1-22, #24-50: raffle_participations.is_winner=FALSE
                        redemptions.status='rejected' (move to Completed tab)
                        UI: "Better Luck Next Time"

Admin downloads CSV with 49 loser emails, sends manual emails

Feb 3:  Creator #23 claims prize (redemptions 'claimable' → 'claimed')
Feb 5:  Admin fulfills winner (redemptions 'claimed' → 'fulfilled' → 'concluded')
        Next raffle unlocks (if exists)
```

---

## 11. CRITICAL RULES

### 11.1 Implementation Rules

1. **Sequential Unlock Query:** Always use `WHERE tier_eligibility = current_tier` (NOT original tier)
2. **Status Transitions:**
   - mission_progress: Never skip states (dormant → active → completed)
   - redemptions: Never skip states (claimable → claimed → fulfilled → concluded)
3. **Tab Placement:** Use BOTH tables - mission_progress.status='completed' AND redemptions.status for tab assignment
4. **Raffle Separation:** NEVER use mission_progress for raffle participation (use raffle_participations)
5. **Tier Change:** Missions persist across tier changes (progress continues uninterrupted)
6. **display_order Uniqueness:** Enforce `UNIQUE(client_id, tier_eligibility, mission_type, display_order)`
7. **Checkpoint Isolation:** Use checkpoint_start in UNIQUE constraint for reset behavior
8. **Fulfillment Trigger:** Next mission unlock happens when redemption.status='fulfilled'
9. **Preview Direction:** Lower tiers see higher (locked), NOT vice versa
10. **Type Independence:** Each mission_type has its own sequential progression (don't mix)


### 11.3 Data Integrity Rules

1. **Every mission MUST have:** mission_type, target_value, reward_id, tier_eligibility, display_order
2. **Raffle missions MUST have:** raffle_end_date, target_value=0
3. **Non-raffle missions MUST have:** raffle_end_date=NULL
4. **display_order MUST be unique** per (client, tier, type) combination
5. **mission_progress MUST link** to valid checkpoint_start
6. **Status transitions MUST follow** state machine (no skipping)
7. **Raffle participation MUST use** raffle_participations table (not mission_progress current_value)

---

## APPENDIX: QUICK REFERENCE

### Mission Types Summary

| Type | Name | Description | Target Example |
|------|------|-------------|----------------|
| sales_dollars | Unlock Payday | Reach your sales target | $500 |
| sales_units | Unlock Payday | Reach your sales target | 50 units |
| videos | Lights, Camera, Go! | Film and post new clips | 10 |
| likes | Road to Viral | Rack up those likes | 1,000 |
| views | Eyes on You | Boost your total views | 50,000 |
| raffle | VIP Raffle | Enter to win {prize_name} | 0 |


### Tab Placement

- **Available:** mission_progress.status IN ('active', 'dormant', 'completed') AND redemptions.status IN ('claimable', 'claimed')
- **Completed:** mission_progress.status = 'completed' AND redemptions.status IN ('fulfilled', 'concluded', 'rejected')

### Unlock Trigger

Admin marks redemption as 'fulfilled' → Next mission appears

### Tier Change

Missions persist (NO cancellation) → After fulfillment, switch to current tier sequence

---

**END OF MISSIONS.MD**
