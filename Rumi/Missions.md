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
- **Fulfillment-triggered** - Next mission appears after admin fulfills reward
- **Tier-persistent** - Missions continue across tier changes (no cancellation)
- **Checkpoint-reset** - Progress resets each checkpoint period
- **Multiple types** - Creator can have sales + videos + raffle active simultaneously

### 1.2 Mission vs Rewards

| Aspect | Missions | Rewards |
|--------|----------|-------------------|
| **Access** | Complete task to unlock | Always available (tier-based) |
| **Frequency** | One per type at a time | Multiple simultaneously |
| **Reset** | Sequential (order 1 → 2 → 3) | Redemption limits (monthly/weekly) |
| **Progress** | Tracked daily (sales, views, etc.) | No progress (instant claim) |
| **Tier Change** | Persist until fulfillment | Auto-replace |

### 1.3 System Architecture

```
missions table (templates)
    ↓ Creates instances
mission_progress table (user-specific tracking)
    ↓ Fulfillment triggers
Sequential unlock (next mission appears)
```

**3 Tables:**
1. `missions` - Admin-configured mission blueprints
2. `mission_progress` - Individual creator progress tracking
3. `raffle_participants` - Raffle entry tracking (special case)

---

## 2. MISSION TYPES

### 2.1 Progress-Based Missions (4 Types)

| Mission Type | Commercial Name | Description | Tracks | Example Target |
|--------------|----------------|-------------|--------|----------------|
| **sales** | "Unlock Payday" | "Reach your sales target" | Dollar sales in checkpoint period | $500 |
| **videos** | "Lights, Camera, Go!" | "Film and post new clips" | Videos posted since checkpoint | 10 videos |
| **likes** | "Road to Viral" | "Rack up those likes" | Total likes on videos | 1,000 likes |
| **views** | "Eyes on You" | "Boost your total views" | Total views on videos | 50,000 views |

**Progress Calculation:**
- **Daily cron** queries source tables (metrics, videos)
- Updates `mission_progress.current_value`
- When `current_value >= target_value` → Status changes to 'completed'

**Data Sources:**
- `sales`: `metrics.tiktok_sales` (sum during checkpoint period)
- `videos`: `videos` table count (posted since checkpoint_start)
- `likes`: `videos.likes` sum (checkpoint period)
- `views`: `videos.views` sum (checkpoint period)

### 2.2 Raffle Mission (Participation-Based)

| Mission Type | Commercial Name | Description | Tracks | Example Target |
|--------------|----------------|-------------|--------|----------------|
| **raffle** | "VIP Raffle" | "Enter to win {prize_name}" | Participation clicks | 0 (no progress) |

**Unique Characteristics:**
- **Prize name is dynamic:** Admin sets via raffle_prize_name field (VARCHAR(15), max 15 chars)
  - Example: "Enter to win iPhone 16 Pro"
  - Template: "Enter to win {raffle_prize_name}"
- **description field:** Admin-only notes (TEXT, not shown to creators)
- **No progress tracking:** Creator clicks "Participate" button (not completion-based)
- **Separate table:** Uses `raffle_participants` (not `mission_progress` for tracking)
- **Custom deadline:** `raffle_end_date` field (not checkpoint-based)
- **Winner selection:** Admin manually selects winner after raffle ends

**Flow:**
1. **Dormant Phase:** Raffle created but `activated=false` → Eligible users see "Raffle start will be announced soon"
2. **Activation:** Admin sets `activated=true` → Eligible users see [Participate] button
3. **Participation:** Creator clicks "Participate" → Creates `mission_progress` (status='processing'), `raffle_participants`, `redemptions`
4. **Processing:** Raffle stays visible with countdown "[XX] days till raffle!"
5. **Winner Selection:** Admin selects winner after `raffle_end_date`
   - Winner: status='won' (stays in Available Missions, awaits admin fulfillment)
   - Non-winners: status='lost' (move to Mission History immediately)
6. **Email (Manual):** Admin downloads CSV with loser emails, sends manually (no automation)
7. **Fulfillment:** Admin fulfills winner's redemption → status='fulfilled' → Next raffle unlocks

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

## 3. CREATOR UI ELEMENTS

### 3.1 What Creators See

**Mission Card Components:**
1. **Display Name** - Hardcoded commercial name ("Unlock Payday")
2. **Description** - Hardcoded description ("Reach your sales target")
3. **Progress Bar** - Visual indicator (350/500)
4. **Target Display** - "Target: $500" or "Target: 10 videos"
5. **Deadline** - Checkpoint date (or raffle end date)
6. **Status Badge** - "In Progress", "Completed", "Claimed", "Pending Fulfillment"
7. **Action Button** - "Claim Reward" (when completed) or "Participate" (raffles)

**Example Mission Card (Sales):**
```
┌─────────────────────────────────────┐
│ 🎯 Unlock Payday                    │
│ Reach your sales target             │
│                                     │
│ Progress: $350 / $500               │
│ [████████░░░░░░] 70%                │
│                                     │
│ Deadline: April 30, 2025            │
│ Status: In Progress                 │
└─────────────────────────────────────┘
```

**Example Mission Card (Raffle):**
```
┌─────────────────────────────────────┐
│ 🎉 VIP Raffle                       │
│ Enter to win iPhone 16 Pro          │
│                                     │
│ Deadline: February 15, 2025         │
│ Status: Waiting for winner          │
│                                     │
│ [You've Participated ✓]            │
└─────────────────────────────────────┘
```

### 3.2 Mission Tabs

**Available Missions Tab:**
- Shows missions with status: `active`, `completed`, `claimed`, `processing` (raffle), `won` (raffle winner)
- Creators can interact (view progress, claim rewards, participate in raffles)
- Real-time updates (daily sync)

**Completed Missions Tab:**
- Shows missions with status: `fulfilled`, `lost` (raffle non-winners)
- Read-only archive
- Sorted by fulfillment date (newest first)
- Creators CANNOT claim from this tab

### 3.3 Multiple Missions Display

Creators can see multiple missions simultaneously (one per type):

```
Available Missions:
┌─────────────────────────┐
│ 🎯 Unlock Payday        │  ← Sales Mission 1
│ Progress: 350/500       │
│ [Claim Reward]          │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎬 Lights, Camera, Go!  │  ← Videos Mission 1
│ Progress: 7/10          │
│ Status: In Progress     │
└─────────────────────────┘

┌─────────────────────────┐
│ 🎉 VIP Raffle           │  ← Raffle Mission 1
│ Enter to win MacBook    │
│ [Participated ✓]        │
└─────────────────────────┘
```

**Key:** Each type progresses independently through its own sequence.

---

## 4. ADMIN CONFIGURATION

### 4.1 Creating a Mission

**Admin Workflow:**

**Step 1: Mission Type**
- Select: Sales, Videos, Views, Likes, or Raffle
- (Display name and description are auto-assigned based on type)

**Step 2: Target Value**
- Sales: Dollar amount (e.g., 500 = $500)
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
- Options: tier_1 (Bronze), tier_2 (Silver), tier_3 (Gold), tier_4 (Platinum), or 'all'

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

### 4.2 Modifiable Fields Summary

| Field | Required | Type | Purpose |
|-------|----------|------|---------|
| mission_type | Yes | Dropdown | Sales, Videos, Views, Likes, Raffle |
| target_value | Yes | Integer | 500, 10, 50000, 1000, 0 (raffle) |
| reward_id | Yes | Dropdown | Reward when completed |
| tier_eligibility | Yes | Dropdown | tier_1, tier_2, tier_3, tier_4, all |
| display_order | Yes | Integer | 1, 2, 3... (sequential unlock) |
| preview_from_tier | No | Dropdown | NULL, tier_1, tier_2, tier_3, tier_4 |
| enabled | Yes | Boolean | Toggle on/off (hides mission from all users) |
| activated | Raffle only | Boolean | Raffle entry toggle: true=accepting entries, false=dormant (ignored for regular missions) |
| raffle_end_date | Raffle only | Date | Winner selection deadline |
| raffle_prize_name | Raffle only | String (15 max) | Dynamic description |
| title | No | String | Admin reference (not shown) |
| description | No | Text | Admin notes (not shown) |

### 4.3 Editing & Disabling Missions

**Editing:**
- Admin can edit any field before mission is active
- Once creators have progress, avoid changing target_value (may confuse creators)

**Disabling:**
- Set `enabled = false`
- Mission disappears from creator UI
- Active `mission_progress` records set to status='cancelled'
- Use case: Temporarily remove mission from rotation

**Deleting:**
- Not recommended if any creator has progress
- Consider disabling instead

---

## 5. REWARDS ASSIGNMENT

### 5.1 Reward Types Available for Missions

Missions can assign any reward type as a reward:

| Reward Type | Example | Description | Redemption |
|--------------|---------|-------------|------------|
| **gift_card** | "$50 Amazon Gift Card" | Monetary reward | Instant |
| **commission_boost** | "5% Commission Boost (30 days)" | Increased commission rate | Instant |
| **discount** | "10% TikTok Follower Discount" | Discount code activation | Scheduled |
| **spark_ads** | "$100 Spark Ads Budget" | Advertising budget | Instant |
| **physical_gift** | "Wireless Headphones" | Physical product shipment | Instant |
| **experience** | "VIP Event Access" | Event/experience access | Instant |

**Note:** Raffles typically use `physical_gift` or `experience` (high-value prizes).

### 5.2 How Rewards Link to Missions

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

### 5.3 Redemption Flow

**After Creator Completes Mission:**
1. Creator clicks "Claim Reward"
2. System creates entry in `redemptions` table
   - `reward_id` = mission's reward_id
   - `status` = 'pending'
   - `tier_at_claim` = creator's current tier (locked)
3. Redemption appears in Admin Fulfillment Queue
4. Admin fulfills reward (see Flow 9 in Loyalty.md)
5. Redemption status = 'fulfilled'
6. **TRIGGER:** Next mission unlocks (if available)

### 5.4 Reward Availability vs Mission Rewards

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

## 6. SEQUENTIAL UNLOCK MECHANICS

### 6.1 Core Concept

**Rule:** ONE active mission per mission_type per user at any time.

**Mechanism:**
1. Admin creates multiple missions with `display_order` (1, 2, 3...)
2. System shows mission with lowest `display_order` first
3. After completion + fulfillment → Next mission (order + 1) unlocks
4. Each `mission_type` has independent sequence

### 6.2 Unlock Trigger

**What triggers next mission:**
- Admin marks redemption as `fulfilled` (NOT the claim action)

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

### 6.3 Sequential Progression Example

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

### 6.4 Multiple Types Simultaneously

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

### 6.5 Gaps in display_order

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

## 7. TIER & VISIBILITY RULES

### 7.1 Tier Eligibility

**Field:** `missions.tier_eligibility`

**Rule:** EXACT match (not minimum threshold)
- `tier_eligibility = 'tier_3'` → Only Gold creators can participate
- `tier_eligibility = 'all'` → All tiers can participate

**Tier Values:**
- `tier_1` = Bronze
- `tier_2` = Silver
- `tier_3` = Gold
- `tier_4` = Platinum
- `all` = Universal (all tiers)

### 7.2 Preview Visibility

**Field:** `missions.preview_from_tier`

**Purpose:** Show locked missions to lower tiers (motivate upgrades)

**Values:**
- `NULL` → Only eligible tier sees mission
- `tier_1` → Bronze+ can see (locked if below tier_eligibility)
- `tier_2` → Silver+ can see (locked if below tier_eligibility)
- `tier_3` → Gold+ can see (locked if below tier_eligibility)
- `tier_4` → Platinum+ can see (locked if below tier_eligibility)

**Example:**
```
Mission: tier_eligibility='tier_3' (Gold), preview_from_tier='tier_1' (Bronze)

Bronze creator: Sees 🔒 "Upgrade to Gold to unlock"
Silver creator: Sees 🔒 "Upgrade to Gold to unlock"
Gold creator: Sees unlocked (can participate)
Platinum creator: Does NOT see (higher tiers don't see lower missions)
```

### 7.3 Visibility Direction

**Rule:** Lower tiers see higher tier missions (locked). Higher tiers do NOT see lower tier missions.

**Rationale:**
- Silver creators seeing Gold missions = Motivates upgrade
- Gold creators seeing Silver missions = Confusing (why show lower tier content?)

### 7.4 Sequential Lock vs Preview Lock

**Scenario:** Gold creator on Sales Mission 1, Mission 3 exists with preview settings

**If Mission 3 has `preview_from_tier='tier_3'` (Gold):**
- Gold creator SEES Mission 3 as 🔒 "Complete previous missions first"

**If Mission 3 has `preview_from_tier=NULL`:**
- Gold creator does NOT see Mission 3 (hidden until Mission 2 fulfilled)

**Rule:** `preview_from_tier` can override sequential lock if same tier is in range.

### 7.5 Tier Change Behavior

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

## 8. STATUS FLOW & TABS

### 8.1 Status State Machine

```
active → completed → claimed → fulfilled
   ↓
cancelled (only if admin disables mission)
```

### 8.2 Mission Visibility & State Controls

The mission system uses **two separate control mechanisms** working together:

#### 8.2.1 Template-Level Controls (missions table)

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

#### 8.2.2 Progress-Level States (mission_progress table)

**Field: `status`**
- **Purpose:** Tracks individual user's progress on a mission
- **Scope:** User-specific (each creator has own status)
- **Database Values:**

| Status | Meaning | Mission Type | User Action | Next State |
|--------|---------|--------------|-------------|------------|
| `active` | In progress | Regular | Work toward goal | `completed` |
| `completed` | Goal reached | Regular | Click [Claim Reward] | `claimed` |
| `claimed` | Reward claimed | Regular | Wait for admin | `fulfilled` |
| `fulfilled` | Admin delivered | All | None (moves to history) | N/A |
| `processing` | Entered raffle | Raffle | Wait for draw | `won` or `lost` |
| `won` | Raffle winner | Raffle | Wait for admin | `fulfilled` |
| `lost` | Raffle loser | Raffle | None (moves to history) | N/A |
| `cancelled` | Admin voided | All | None (mission removed) | N/A |

**Frontend-Computed States (not stored in database):**

The backend API computes these "virtual" statuses from database fields:

| Computed Status | Condition | Display |
|----------------|-----------|---------|
| `available` | Raffle with `activated=true`, no progress record | [Participate] button |
| `dormant` | Raffle with `activated=false`, no progress record | "Raffle starts soon" |
| `locked` | User's tier doesn't match `tier_eligibility` | 🔒 Tier badge |

**Status Flow Examples:**

**Regular Mission:**
```
(no record) → active → completed → claimed → fulfilled
```

**Raffle Mission:**
```
dormant (activated=false)
  → available (admin sets activated=true)
  → processing (user clicks Participate)
  → won/lost (admin selects winner)
  → fulfilled (admin delivers prize to winner)
```

### 8.3 Status Definitions (Database Values)

| Status | Meaning | Tab | Trigger | Creator Action |
|--------|---------|-----|---------|----------------|
| **active** | In progress | Available | Mission created/unlocked | View progress |
| **completed** | Target reached | Available | current_value >= target | Click "Claim" |
| **claimed** | Reward claimed | Available | Creator clicks "Claim" | Wait for fulfillment |
| **fulfilled** | Admin fulfilled | Completed | Admin marks fulfilled | View in history |
| **cancelled** | Mission disabled | Removed | Admin disables mission | None |
| **processing** | Raffle entry submitted (raffle-only) | Available | Creator clicks "Participate" | Wait for winner selection |
| **won** | Raffle winner (raffle-only) | Available | Admin selects winner | Wait for fulfillment |
| **lost** | Raffle non-winner (raffle-only) | Completed | Admin selects winner | View in history |

### 8.4 Tab Placement Logic

**Available Missions Tab:**
```sql
SELECT * FROM mission_progress
WHERE user_id = ?
  AND status IN ('active', 'completed', 'claimed', 'processing', 'won')
  AND checkpoint_start = current_checkpoint
ORDER BY mission_type, display_order
```

**Completed Missions Tab:**
```sql
SELECT * FROM mission_progress
WHERE user_id = ?
  AND status IN ('fulfilled', 'lost')
ORDER BY fulfilled_at DESC
```

### 8.5 Status Transition Details

**active → completed:**
- **Trigger:** Daily cron detects `current_value >= target_value`
- **Action:** Update `status='completed'`, `completed_at=NOW()`
- **Notification:** Send email/push "Mission Complete! Claim your reward"

**completed → claimed:**
- **Trigger:** Creator clicks "Claim Reward" button
- **Action:** Create `redemptions` record, update `status='claimed'`, `claimed_at=NOW()`
- **UI Change:** Button changes to "Pending Fulfillment" badge

**claimed → fulfilled:**
- **Trigger:** Admin clicks "Mark as Fulfilled" in admin panel
- **Action:** Update `redemption.status='fulfilled'`, `mission_progress.status='fulfilled'`, `fulfilled_at=NOW()`
- **Side Effect:** Unlock next mission in sequence (if available)

**active → cancelled:**
- **Trigger:** Admin sets `missions.enabled=false`
- **Action:** Update all active progress records to `status='cancelled'`
- **UI Change:** Mission disappears from Available Missions

### 8.6 Raffle Status Special Case

**Raffle uses 3 unique status values:**

| Status | Raffle Meaning | Trigger |
|--------|----------------|---------|
| **processing** | Entry submitted, awaiting winner selection | Creator clicks "Participate" |
| **won** | Selected as winner, awaiting admin fulfillment | Admin selects this creator as winner |
| **lost** | Not selected, moved to history | Admin selects different creator as winner |

**Raffle Lifecycle:**
```
Phase 0 (Dormant):
  activated=false → Show "Raffle start will be announced soon"
↓
Phase 1 (Active):
  Admin sets activated=true → Show [Participate] button
↓
Phase 2 (Processing):
  Creator participates → mission_progress.status='processing'
                       → raffle_participants entry created
                       → redemptions entry created (status='pending')
                       → Show "[15] days till raffle!"
↓
Phase 3 (Concluded):
  Admin selects winner → Winner: status='won' (stays in Available Missions)
                       → Non-winners: status='lost' (move to Completed Missions)
                       → Admin downloads CSV with loser emails
                       → Redemptions: Winner stays 'pending', losers bulk rejected
↓
Phase 4 (Fulfillment - Winner Only):
  Admin fulfills winner → mission_progress.status='fulfilled'
                       → redemptions.status='fulfilled'
                       → Next raffle unlocks (if exists)
```

**Critical Differences from Regular Missions:**
- No progress tracking (target_value=0)
- Creates redemption at participation (not at claim)
- Non-winners never reach 'fulfilled' status (they get 'lost')
- Uses 3 raffle-specific statuses: processing, won, lost

---

## 9. DATABASE SCHEMA

### 9.1 missions Table (Templates)

**Purpose:** Admin-configured mission blueprints

```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Internal admin reference (NOT shown to creators)
  title VARCHAR(255) NOT NULL, -- "Q1 Gold Sales Push"
  description TEXT, -- Admin notes

  -- Mission configuration
  mission_type VARCHAR(50) NOT NULL, -- 'sales', 'videos', 'views', 'likes', 'raffle'
  target_value INTEGER NOT NULL, -- 500, 10, 50000, 1000, 0 (raffle)

  -- Reward assignment
  reward_id UUID NOT NULL REFERENCES rewards(id), -- What they unlock when complete

  -- Tier & visibility
  tier_eligibility VARCHAR(50) NOT NULL, -- 'tier_1' through 'tier_6', or 'all'
  preview_from_tier VARCHAR(50) NULL, -- NULL, 'tier_1', 'tier_2', 'tier_3', 'tier_4'

  -- Sequential unlock
  display_order INTEGER NOT NULL, -- 1, 2, 3... (sequential unlock position)

  -- Raffle-specific fields
  raffle_end_date TIMESTAMP NULL, -- Winner selection deadline (ONLY for raffles)
  raffle_prize_name VARCHAR(15), -- Dynamic description (max 15 chars)

  -- Controls
  enabled BOOLEAN DEFAULT true,
  activated BOOLEAN DEFAULT false, -- For raffles only: false = dormant, true = accepting entries
    -- Regular missions (sales, videos, views, likes): Ignored (always behave as activated)
    -- Raffle missions: Start dormant (false), admin manually activates to accept entries
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_raffle_requirements CHECK (
    (mission_type != 'raffle') OR
    (mission_type = 'raffle' AND raffle_end_date IS NOT NULL AND raffle_prize_name IS NOT NULL AND target_value = 0)
  ),
  CONSTRAINT check_non_raffle_fields CHECK (
    (mission_type = 'raffle') OR
    (mission_type != 'raffle' AND raffle_end_date IS NULL AND raffle_prize_name IS NULL)
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

### 9.2 mission_progress Table (User Instances)

**Purpose:** Tracks individual creator progress on missions. Mission Status

```sql
CREATE TABLE mission_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,

  -- Progress tracking
  current_value INTEGER DEFAULT 0, -- 350/500, 7/10, 45000/50000
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'claimed', 'fulfilled', 'cancelled', 'processing', 'won', 'lost'
    -- 'active': In progress
    -- 'completed': Target reached, can claim
    -- 'claimed': Creator claimed, pending admin fulfillment
    -- 'fulfilled': Admin marked as fulfilled, moves to Completed Missions tab
    -- 'cancelled': Mission disabled by admin (NOT used for tier changes)
    -- 'processing': Raffle entry submitted, awaiting winner selection (raffle-only)
    -- 'won': Raffle winner selected, awaiting admin fulfillment (raffle-only)
    -- 'lost': Raffle non-winner, moves to Mission History (raffle-only)

  -- Status timestamps
  completed_at TIMESTAMP, -- When hit target
  claimed_at TIMESTAMP, -- When creator claimed
  fulfilled_at TIMESTAMP, -- When admin fulfilled (triggers next mission unlock)

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
```

**Key Constraints:**
- `UNIQUE(user_id, mission_id, checkpoint_start)` → One progress record per mission per checkpoint period

### 9.3 raffle_participants Table (Raffle Tracking)

**Purpose:** Separate tracking for raffle participation

```sql
CREATE TABLE raffle_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raffle_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  participated_at TIMESTAMP DEFAULT NOW(),
  is_winner BOOLEAN DEFAULT false,
  winner_selected_at TIMESTAMP,

  UNIQUE(raffle_id, user_id) -- One entry per user per raffle
);

CREATE INDEX idx_raffle_participants_raffle ON raffle_participants(raffle_id);
CREATE INDEX idx_raffle_participants_user ON raffle_participants(user_id);
CREATE INDEX idx_raffle_winners ON raffle_participants(is_winner) WHERE is_winner = true;
```

**Why Separate Table:**
- Raffles are participation-based (not progress-based)
- Need to track all participants for winner selection
- Different data model than mission_progress

---

## 10. EDGE CASES

### 10.1 Gap in display_order

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

### 10.2 Mission Disabled Mid-Sequence

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

### 10.3 New Tier Lacks Mission Type

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

### 10.4 Tier Change During Active Mission

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

### 10.5 Checkpoint Reset

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

### 10.6 Same Mission, Different Checkpoints

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

## 11. EXAMPLE SCENARIOS

### 11.1 Normal Sequential Progression

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

### 11.2 Tier Demotion Mid-Mission

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

### 11.3 Multiple Types Simultaneously

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

### 11.4 Raffle Winner Selection

**Setup:** 50 creators participate in Platinum raffle

**Timeline:**
```
Jan 15: Raffle created (activated=false)
        Eligible creators see: "Raffle start will be announced soon"

Jan 16: Admin activates raffle (activated=true)
        Eligible creators see: [Participate] button

Jan 20: 50 creators click "Participate"
        All 50: mission_progress.status='processing'
        All 50: raffle_participants entries created
        All 50: redemptions entries created (status='pending')
        UI shows: "[12] days till raffle!"

Feb 1:  Raffle end date passes

Feb 2:  Admin selects Creator #23 as winner

Creator #23: status='won' (stays in Available Missions)
            redemption stays 'pending' (awaits fulfillment)
            UI shows: "🎉 You Won! Coordinating Delivery"

Creators #1-22, #24-50: status='lost' (move to Mission History immediately)
                        redemptions bulk rejected (status='rejected')
                        UI shows: "Better Luck Next Time"

Admin downloads CSV with 49 loser emails, sends manual emails

Feb 3:  Creator #23 waits for admin fulfillment
Feb 5:  Admin fulfills winner → status='fulfilled' → Raffle 2 unlocks (if exists)
```

---

## 12. CRITICAL RULES

### 12.1 Implementation Rules

1. **Sequential Unlock Query:** Always use `WHERE tier_eligibility = current_tier` (NOT original tier)
2. **Status Transitions:** Never skip states (active → completed → claimed → fulfilled)
3. **Tab Placement:** Status='fulfilled' is ONLY trigger to move to Completed Missions
4. **Raffle Separation:** NEVER use mission_progress for raffle participation (use raffle_participants)
5. **Tier Change:** NEVER set status='cancelled' on tier change (missions persist)
6. **display_order Uniqueness:** Enforce `UNIQUE(client_id, tier_eligibility, mission_type, display_order)`
7. **Checkpoint Isolation:** Use checkpoint_start in UNIQUE constraint for reset behavior
8. **Fulfillment Trigger:** Next mission unlock happens when redemption.status='fulfilled'
9. **Preview Direction:** Lower tiers see higher (locked), NOT vice versa
10. **Type Independence:** Each mission_type has its own sequential progression (don't mix)

### 12.2 Common Misconceptions

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| Missions cancel on tier change | Missions persist across tier changes |
| Raffles track progress like sales | Raffles are participation-based (click button, status='processing') |
| Raffles use status='active' when waiting | Raffles use status='processing' (unique raffle status) |
| Raffle winners get status='completed' | Raffle winners get status='won' (unique raffle status) |
| Raffle losers get status='fulfilled' | Raffle losers get status='lost' (unique raffle status) |
| Next unlocks when creator claims | Next unlocks when admin fulfills |
| tier_eligibility shows to all tiers | Only lower tiers see higher (with preview_from_tier) |
| Multiple sales missions active | ONE mission per type at a time |
| display_order must be 1,2,3 (no gaps) | Gaps allowed (1,3,5), auto-skipped |
| Completed missions stay in Available forever | Move to Completed when status='fulfilled' or 'lost' |

### 12.3 Data Integrity Rules

1. **Every mission MUST have:** mission_type, target_value, reward_id, tier_eligibility, display_order
2. **Raffle missions MUST have:** raffle_end_date, raffle_prize_name, target_value=0
3. **Non-raffle missions MUST have:** raffle_end_date=NULL, raffle_prize_name=NULL
4. **display_order MUST be unique** per (client, tier, type) combination
5. **mission_progress MUST link** to valid checkpoint_start
6. **Status transitions MUST follow** state machine (no skipping)
7. **Raffle participation MUST use** raffle_participants table (not mission_progress current_value)

---

## APPENDIX: QUICK REFERENCE

### Mission Types Summary

| Type | Name | Description | Target Example |
|------|------|-------------|----------------|
| sales | Unlock Payday | Reach your sales target | $500 |
| videos | Lights, Camera, Go! | Film and post new clips | 10 |
| likes | Road to Viral | Rack up those likes | 1,000 |
| views | Eyes on You | Boost your total views | 50,000 |
| raffle | VIP Raffle | Enter to win {prize_name} | 0 |

### Status Flow

```
active → completed → claimed → fulfilled
```

### Tab Placement

- **Available:** active, completed, claimed, processing (raffle), won (raffle)
- **Completed:** fulfilled, lost (raffle)

### Unlock Trigger

Admin marks redemption as 'fulfilled' → Next mission appears

### Tier Change

Missions persist (NO cancellation) → After fulfillment, switch to current tier sequence

---

**END OF MISSIONS.MD**
