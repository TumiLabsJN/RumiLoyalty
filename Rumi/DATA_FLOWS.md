# Data Flows

Quick reference for how each page fetches and displays data.

**Purpose:** Help developers (human or AI) quickly understand the data pipeline for each page without reading multiple files.

**Methodology:** Each section is derived from actual code analysis, not documentation. Validation queries verify the data exists in Supabase for the page to function correctly.

---

## Table of Contents

1. [/home (Dashboard)](#home-dashboard)
2. [/missions](#missions)
3. [/missions/missionhistory](#missionsmissionhistory)
4. [/tiers](#tiers)
5. [/rewards](#rewards) ✅ Complete (ENH-006 + ENH-008)
6. [/rewards/rewardshistory](#rewardsrewardshistory) ✅ Complete (ENH-011)
7. [Login Pages](#login-pages) - TODO

---

## /home (Dashboard)

**File:** `app/home/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard` | GET | Fetch all dashboard data |

### Data Flow

```
page.tsx
  └── fetch('/api/dashboard')
        └── app/api/dashboard/route.ts
              ├── userRepository.findByAuthId()
              └── dashboardService.getDashboardOverview()
                    ├── dashboardRepository.getUserDashboard()
                    ├── dashboardService.getFeaturedMission()
                    │     ├── missionRepository.findFeaturedMission()
                    │     └── missionRepository.findRecentFulfillment()
                    ├── dashboardRepository.getCurrentTierRewards()
                    └── dashboardRepository.updateLastLoginAt()
```

### Service Layer

**File:** `lib/services/dashboardService.ts`

| Function | Purpose |
|----------|---------|
| `getDashboardOverview(userId, clientId)` | Main orchestrator - aggregates all dashboard data |
| `getFeaturedMission(userId, clientId, currentTierId, vipMetric, tierInfo, lastLoginAt)` | Gets highest-priority mission with formatting |
| `checkCongratsModal(userId, clientId, lastLoginAt)` | Checks for recently fulfilled missions |
| `generateRewardDisplayText(reward)` | Formats reward display text (single source of truth) |
| `formatVipMetricValue(value, vipMetric)` | Formats currency/units based on client setting |

### Repository Layer

**File:** `lib/repositories/userRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findByAuthId(authId)` | RPC: `auth_find_user_by_id` | Get user from Supabase Auth ID |

**File:** `lib/repositories/dashboardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getUserDashboard(userId, clientId)` | SELECT with JOIN | Get user, client, tier data |
| `getCurrentTierRewards(clientId, currentTierId)` | SELECT + COUNT | Get top 4 VIP tier rewards |
| `updateLastLoginAt(userId, clientId)` | UPDATE | Update last login after congrats modal |

**File:** `lib/repositories/missionRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findFeaturedMission(userId, clientId, currentTierId, vipMetric)` | SELECT with JOINs | Get highest-priority mission |
| `findRecentFulfillment(userId, clientId, lastLoginAt)` | SELECT with JOINs | Check for congrats modal trigger |

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `users` | id, tiktok_handle, email, current_tier, checkpoint_sales_current, checkpoint_units_current, manual_adjustments_total, manual_adjustments_units, next_checkpoint_at, last_login_at, client_id | User profile and progress |
| `clients` | id, name, vip_metric, checkpoint_months, primary_color | Client configuration |
| `tiers` | id, tier_id, tier_name, tier_color, tier_order, sales_threshold, units_threshold, checkpoint_exempt | Tier definitions |
| `missions` | id, mission_type, display_name, title, description, target_value, target_unit, raffle_end_date, activated, tier_eligibility, enabled, reward_id | Mission definitions |
| `mission_progress` | id, user_id, client_id, mission_id, current_value, status, completed_at | User's mission progress |
| `rewards` | id, type, name, description, value_data, reward_source, redemption_quantity, display_order, tier_eligibility, enabled | Reward definitions |
| `raffle_participations` | mission_id, user_id, client_id | Track raffle entries (exclusion filter) |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID |

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /home to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table
- `:current_tier` → User's current_tier value (e.g., 'tier_1')

```sql
-- 1. Verify user exists and has valid current_tier
SELECT id, tiktok_handle, current_tier, client_id,
       checkpoint_sales_current, checkpoint_units_current,
       last_login_at
FROM users
WHERE id = ':user_id'
  AND client_id = ':client_id';

-- 2. Verify client has vip_metric configured
SELECT id, name, vip_metric, checkpoint_months
FROM clients
WHERE id = ':client_id';

-- 3. Verify tiers exist for client
SELECT tier_id, tier_name, tier_order, tier_color,
       sales_threshold, units_threshold, checkpoint_exempt
FROM tiers
WHERE client_id = ':client_id'
ORDER BY tier_order;

-- 4. Verify user's current_tier exists in tiers table
-- (CRITICAL: If this returns 0 rows, dashboard will fail)
SELECT tier_id, tier_name, tier_color, tier_order
FROM tiers
WHERE client_id = ':client_id'
  AND tier_id = ':current_tier';

-- 5. Verify missions exist for user's tier
SELECT m.id, m.mission_type, m.display_name, m.tier_eligibility,
       m.enabled, m.activated, m.target_value,
       r.id as reward_id, r.type as reward_type, r.name as reward_name
FROM missions m
LEFT JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = ':client_id'
  AND m.tier_eligibility = ':current_tier'
  AND m.enabled = true
ORDER BY
  CASE m.mission_type
    WHEN 'raffle' THEN 0
    WHEN 'sales_dollars' THEN 1
    WHEN 'sales_units' THEN 2
    WHEN 'videos' THEN 3
    WHEN 'likes' THEN 4
    WHEN 'views' THEN 5
    ELSE 99
  END;

-- 6. Verify VIP tier rewards exist (for rewards card)
SELECT id, type, name, display_order, tier_eligibility
FROM rewards
WHERE client_id = ':client_id'
  AND tier_eligibility = ':current_tier'
  AND reward_source = 'vip_tier'
  AND enabled = true
ORDER BY display_order;

-- 7. Check user's mission progress (if any)
SELECT mp.id, mp.mission_id, mp.current_value, mp.status, mp.completed_at,
       m.mission_type, m.display_name
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
WHERE mp.user_id = ':user_id'
  AND mp.client_id = ':client_id';

-- 8. Check raffle participations (excluded from featured mission)
SELECT rp.mission_id, m.display_name, rp.participated_at
FROM raffle_participations rp
JOIN missions m ON rp.mission_id = m.id
WHERE rp.user_id = ':user_id'
  AND rp.client_id = ':client_id';
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #4 |
| No mission circle shown | No enabled missions for user's tier | Query #5 |
| Empty rewards card | No `vip_tier` rewards for tier | Query #6 |
| Progress always 0 | No `mission_progress` row for user | Query #7 |
| Raffle keeps showing | `raffle_participations` row missing | Query #8 |
| Wrong tier color | Tier exists but `tier_color` is NULL | Query #3 |
| "Unlock null" text | `nextTier` query failed - check tier_order sequence | Query #3 |

### Frontend State

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `dashboardData` | API response | All dashboard data |
| `isLoading` | Local | Show loading spinner |
| `error` | Local | Show error state with retry |
| `isTierCardFlipped` | Local | Flip animation for tier card |
| `showScheduleModal` | Local | Discount scheduling modal |

### Key Business Logic

1. **Featured Mission Priority:** raffle > sales_dollars > sales_units > videos > likes > views
2. **Raffle Exclusion:** Only shown if `activated=true` AND user has no `raffle_participations` entry
3. **Congrats Modal:** Shown when `mission_progress.fulfilled_at > users.last_login_at`
4. **VIP Metric:** Client setting determines if progress shows `$X` (sales) or `X units` (units)
5. **Tier Progress:** `checkpoint_sales_current + manual_adjustments_total` (or units equivalent)

### Seed Data Requirements

For /home to function correctly, seed data must be created in the correct order with proper relationships.

#### Dependency Order (Must seed in this order)

```
1. clients          (no dependencies)
2. tiers            (depends on: clients)
3. rewards          (depends on: clients, tiers for tier_eligibility)
4. users            (depends on: clients, tiers for current_tier, Supabase Auth for id)
5. missions         (depends on: clients, tiers, rewards)
6. mission_progress (depends on: users, missions, clients)
```

#### Minimum Viable Seed Data

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `clients` | 1 | `id`, `vip_metric` ('sales' or 'units'), `checkpoint_months` |
| `tiers` | At least 1 | `tier_id`, `tier_name`, `tier_color`, `tier_order`, `client_id` |
| `users` | 1 test user | `id` (MUST match Supabase Auth UUID), `client_id`, `current_tier` |
| `rewards` | At least 1 VIP tier reward | `tier_eligibility`, `reward_source='vip_tier'`, `enabled=true` |
| `missions` | At least 1 enabled mission | `tier_eligibility`, `enabled=true`, `reward_id`, `mission_type` |
| `mission_progress` | 1 per user/mission | `user_id`, `mission_id`, `current_value`, `status='active'` |

#### Critical Constraints

| Constraint | Requirement | What Breaks If Violated |
|------------|-------------|-------------------------|
| **User ID = Auth ID** | `users.id` MUST equal Supabase Auth user UUID | Login succeeds but user lookup fails → redirect loop |
| **VIP Metric Match** | If `clients.vip_metric='units'`, only create `sales_units` missions (not `sales_dollars`) | Inconsistent UI: mission shows $ while tier shows units |
| **Tier Exists** | `users.current_tier` must exist in `tiers.tier_id` | 500 error on dashboard load |
| **Reward Linked** | `missions.reward_id` must reference valid `rewards.id` | Mission query fails |

#### Seed Script Checklist

Before running seed script, verify:

- [ ] `CLIENT_ID` in `.env.local` matches the client you're seeding
- [ ] Supabase Auth users are created FIRST, then use their UUIDs for `users.id`
- [ ] Mission types match client's `vip_metric` setting
- [ ] At least one `reward_source='vip_tier'` reward exists per tier
- [ ] `mission_progress` rows created for users to see progress > 0

#### Common Seed Script Pitfalls

| Pitfall | Symptom | Prevention |
|---------|---------|------------|
| Creating `users` before Supabase Auth | Login works, then 401 on API calls | Create Auth user first, use its UUID |
| Duplicate user rows | Deleted wrong one → ID mismatch | Check Auth dashboard for correct UUID before deleting |
| Missing `mission_progress` | Progress shows 0/X | Seed progress after missions |
| Wrong `mission_type` for `vip_metric` | $ vs units mismatch on same screen | Filter mission types based on client config |
| Deleting missions orphans progress | JOIN fails, no featured mission | Delete `mission_progress` first, then missions |

#### Test Users Reference

| Handle | Email | Password | Tier |
|--------|-------|----------|------|
| @testbronze | testbronze@test.com | TestPass123! | tier_1 (Bronze) |
| @testsilver | testsilver@test.com | TestPass123! | tier_2 (Silver) |
| @testgold | testgold@test.com | TestPass123! | tier_3 (Gold) |
| @testplatinum | testplatinum@test.com | TestPass123! | tier_4 (Platinum) |

---

## /missions

**File:** `app/missions/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/missions` | GET | Fetch all missions with status, progress, rewards |

### Data Flow

```
page.tsx
  └── fetch('/api/missions')
        └── app/api/missions/route.ts
              ├── userRepository.findByAuthId()
              ├── dashboardRepository.getUserDashboard()
              └── missionService.listAvailableMissions()
                    └── missionRepository.listAvailable()
                          └── RPC: get_available_missions
```

### Service Layer

**File:** `lib/services/missionService.ts`

| Function | Purpose |
|----------|---------|
| `listAvailableMissions(userId, clientId, userInfo, vipMetric, tierLookup)` | Main orchestrator - fetches missions, computes 16 statuses, sorts by 12-priority |
| `computeStatus(data)` | Derives status from progress, redemption, sub-state data |
| `transformMission(data, status, tierLookup)` | Formats raw data to API response shape |
| `sortMissions(missions, vipMetric, featuredMissionId)` | Applies status + mission type priority sorting |
| `generateRewardDescription(rewardType, valueData, description)` | Formats reward text with article grammar |
| `generateProgressText(currentValue, targetValue, missionType)` | Formats progress with currency/units |
| `generateFlippableCard(status, data)` | Builds flippable card content for 8 card types |

### Repository Layer

**File:** `lib/repositories/userRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findByAuthId(authId)` | RPC: `auth_find_user_by_id` | Get user from Supabase Auth ID |

**File:** `lib/repositories/dashboardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getUserDashboard(userId, clientId, options)` | SELECT with JOIN | Get user, client, tier data (with allTiers option) |

**File:** `lib/repositories/missionRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `listAvailable(userId, clientId, currentTierId)` | RPC: `get_available_missions` | Single query for all mission data with 8 JOINs |
| `findById(missionId, userId, clientId)` | SELECT with JOINs | Get single mission with all related data |
| `claimReward(redemptionId, userId, clientId, claimData)` | UPDATE + INSERT | Update redemption, create sub-state records |

**File:** `lib/repositories/raffleRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `participate(missionId, userId, clientId, currentTierId)` | RPC: `raffle_create_participation` | Create participation atomically |
| `getRaffleMissionInfo(missionId, clientId)` | SELECT with JOIN | Get raffle draw date and prize info |
| `hasParticipated(missionId, userId, clientId)` | SELECT single | Check existing participation |

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `missions` | id, mission_type, display_name, target_value, target_unit, raffle_end_date, activated, tier_eligibility, preview_from_tier, enabled, reward_id | Mission definitions |
| `mission_progress` | id, user_id, mission_id, current_value, status, completed_at, checkpoint_start, checkpoint_end | User's progress on missions |
| `rewards` | id, type, name, description, value_data, redemption_type, reward_source | Reward templates |
| `redemptions` | id, status, claimed_at, fulfilled_at, scheduled_activation_date, scheduled_activation_time, activation_date, expiration_date | Claim tracking |
| `commission_boost_redemptions` | boost_status, scheduled_activation_date, activated_at, expires_at, duration_days | Commission boost sub-state |
| `physical_gift_redemptions` | shipped_at, shipping_city, requires_size | Physical gift sub-state |
| `raffle_participations` | mission_id, user_id, is_winner, participated_at, winner_selected_at | Raffle entry tracking |
| `tiers` | tier_id, tier_name, tier_color, tier_order | Tier definitions for locked missions |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID |
| `get_available_missions(p_user_id, p_client_id, p_current_tier)` | Single query with 8 JOINs for all mission data |
| `raffle_create_participation(p_mission_id, p_user_id, p_client_id, p_reward_id, p_tier_at_claim)` | Atomic raffle participation creation |

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /missions to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table
- `:current_tier` → User's current_tier value (e.g., 'tier_1')

```sql
-- 1. Verify missions exist for user's tier (or 'all')
SELECT m.id, m.mission_type, m.display_name, m.tier_eligibility,
       m.enabled, m.activated, m.target_value,
       r.id as reward_id, r.type as reward_type, r.name as reward_name
FROM missions m
LEFT JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = ':client_id'
  AND m.enabled = true
  AND (m.tier_eligibility = ':current_tier' OR m.tier_eligibility = 'all')
ORDER BY m.display_order;

-- 2. Verify user's mission progress exists
SELECT mp.id, mp.mission_id, mp.current_value, mp.status,
       mp.completed_at, mp.checkpoint_start, mp.checkpoint_end,
       m.mission_type, m.display_name
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
WHERE mp.user_id = ':user_id'
  AND mp.client_id = ':client_id';

-- 3. Check redemptions for completed missions
SELECT r.id, r.status, r.claimed_at, r.mission_progress_id,
       rw.type as reward_type, rw.name as reward_name
FROM redemptions r
JOIN rewards rw ON r.reward_id = rw.id
WHERE r.user_id = ':user_id'
  AND r.client_id = ':client_id'
  AND r.deleted_at IS NULL;

-- 4. Check raffle participations
SELECT rp.mission_id, rp.is_winner, rp.participated_at,
       m.display_name
FROM raffle_participations rp
JOIN missions m ON rp.mission_id = m.id
WHERE rp.user_id = ':user_id'
  AND rp.client_id = ':client_id';

-- 5. Verify locked missions (preview_from_tier)
SELECT m.id, m.display_name, m.tier_eligibility, m.preview_from_tier,
       r.type as reward_type, r.name as reward_name
FROM missions m
LEFT JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = ':client_id'
  AND m.enabled = true
  AND m.preview_from_tier = ':current_tier';

-- 6. Check commission boost sub-states
SELECT cb.boost_status, cb.scheduled_activation_date,
       cb.activated_at, cb.expires_at, cb.duration_days
FROM commission_boost_redemptions cb
WHERE cb.client_id = ':client_id'
  AND cb.redemption_id IN (
    SELECT id FROM redemptions WHERE user_id = ':user_id'
  );
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #1 (join fails) |
| No missions shown | No enabled missions for user's tier | Query #1 |
| Progress always 0 | No `mission_progress` row for user | Query #2 |
| Completed mission not claimable | No `redemptions` row with status='claimable' | Query #3 |
| Raffle shows "Participate" after entering | `raffle_participations` row missing | Query #4 |
| Locked mission not showing | `preview_from_tier` doesn't match user's tier | Query #5 |
| Commission boost stuck in wrong status | `commission_boost_redemptions.boost_status` incorrect | Query #6 |
| Wrong status computed | Check `computeStatus()` logic in missionService.ts:490 | - |

### Frontend State

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `missionsData` | API response (currently mock) | All missions data |
| `showDiscountModal` | Local | Discount scheduling modal |
| `showPayboostModal` | Local | Commission boost scheduling modal |
| `showPaymentInfoModal` | Local | Payment info collection modal |
| `showPhysicalGiftModal` | Local | Physical gift claim modal |
| `selectedMission` | Local | Mission selected for modal action |
| `selectedPaymentMission` | Local | Mission for payment info |
| `selectedPhysicalGift` | Local | Mission for physical gift claim |

### Key Business Logic

1. **16 Mission Statuses:** `in_progress`, `default_claim`, `default_schedule`, `scheduled`, `active`, `redeeming`, `redeeming_physical`, `sending`, `pending_info`, `clearing`, `dormant`, `raffle_available`, `raffle_processing`, `raffle_claim`, `raffle_won`, `locked`

2. **12-Priority Sorting:** Featured first → raffle_available/raffle_claim → default_claim/default_schedule → pending_info → clearing → sending → active → scheduled → redeeming → in_progress → raffle_won/raffle_processing/dormant → locked

3. **Mission Type Priority (within same status):** raffle > sales_dollars > sales_units > videos > likes > views

4. **VIP Metric Preference:** If client's `vip_metric='sales'`, prefer `sales_dollars`; if `'units'`, prefer `sales_units`

5. **Raffle Eligibility:** Only show if `activated=true` AND no existing `raffle_participations` entry

6. **Locked Missions:** Show if `preview_from_tier` matches user's current tier (preview from lower tier)

7. **Flippable Cards:** 8 card types for: redeeming, sending, scheduled (boost/discount), active (boost/discount), pending_info, clearing

### Seed Data Requirements

For /missions to function correctly, in addition to /home requirements:

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `missions` | At least 1 per tier | `tier_eligibility`, `enabled=true`, `reward_id`, `mission_type` |
| `mission_progress` | 1 per user/mission | `user_id`, `mission_id`, `current_value`, `status='active'`, `checkpoint_start`, `checkpoint_end` |
| `redemptions` | Created on mission completion | `mission_progress_id`, `status='claimable'`, `tier_at_claim` |

### Current Implementation Status

**Backend:** ✅ Complete (API routes, services, repositories all implemented)

**Frontend:** 🔄 Using mock data - needs to call `/api/missions`

**TODO for Task 9.3:** Replace mock data in `page.tsx` (lines 59-641) with `fetch('/api/missions')`

---

## /missions/missionhistory

**File:** `app/missions/missionhistory/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/missions/history` | GET | Fetch concluded missions (completed + lost raffles) |

### Data Flow

```
page.tsx
  └── fetch('/api/missions/history')
        └── app/api/missions/history/route.ts
              ├── userRepository.findByAuthId()
              ├── dashboardRepository.getUserDashboard()
              └── missionService.getMissionHistory()
                    └── missionRepository.getHistory()
                          └── RPC: get_mission_history
```

### Service Layer

**File:** `lib/services/missionService.ts`

| Function | Purpose |
|----------|---------|
| `getMissionHistory(userId, clientId, userInfo)` | Main orchestrator - fetches history, determines status, formats dates |
| `generateRewardName(rewardType, valueData, description)` | Formats reward display name based on type |
| `formatDateShort(date)` | Formats ISO date to "Jan 10, 2025" format |
| `addArticle(text)` | Adds "a" or "an" article for prize names |

### Repository Layer

**File:** `lib/repositories/userRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findByAuthId(authId)` | RPC: `auth_find_user_by_id` | Get user from Supabase Auth ID |

**File:** `lib/repositories/dashboardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getUserDashboard(userId, clientId)` | SELECT with JOIN | Get user, client, tier data for response |

**File:** `lib/repositories/missionRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getHistory(userId, clientId)` | RPC: `get_mission_history` | Get concluded + rejected redemptions with all related data |

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `users` | id, client_id, current_tier | User identification and tier info |
| `redemptions` | id, status, claimed_at, fulfilled_at, concluded_at, rejected_at, mission_progress_id, deleted_at | Track reward fulfillment lifecycle |
| `mission_progress` | id, mission_id, completed_at | Link redemption to mission |
| `missions` | id, mission_type, display_name | Mission identity and display |
| `rewards` | id, type, name, description, value_data, reward_source | Reward details for display |
| `raffle_participations` | is_winner, participated_at, winner_selected_at, mission_progress_id | Raffle outcome data |
| `tiers` | tier_id, tier_name, tier_color | User's current tier for header display |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID |
| `get_mission_history(p_user_id, p_client_id)` | Single query for concluded/rejected redemptions with 4 JOINs |

**RPC Query (PostgreSQL):**
```sql
SELECT
  red.id, red.status, red.claimed_at, red.fulfilled_at, red.concluded_at, red.rejected_at,
  m.id, m.mission_type, m.display_name,
  r.id, r.type, r.name, r.description, r.value_data, r.reward_source,
  mp.completed_at,
  rp.is_winner, rp.participated_at, rp.winner_selected_at
FROM redemptions red
INNER JOIN mission_progress mp ON red.mission_progress_id = mp.id
INNER JOIN missions m ON mp.mission_id = m.id
INNER JOIN rewards r ON m.reward_id = r.id
LEFT JOIN raffle_participations rp ON mp.id = rp.mission_progress_id AND rp.user_id = p_user_id
WHERE red.user_id = p_user_id
  AND red.client_id = p_client_id
  AND red.status IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
  AND red.mission_progress_id IS NOT NULL
ORDER BY COALESCE(red.concluded_at, red.rejected_at) DESC;
```

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /missions/missionhistory to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table

```sql
-- 1. Verify user exists and has valid current_tier (for header display)
SELECT id, tiktok_handle, current_tier, client_id
FROM users
WHERE id = ':user_id'
  AND client_id = ':client_id';

-- 2. Verify user's tier exists (for tier badge in header)
SELECT tier_id, tier_name, tier_color
FROM tiers
WHERE client_id = ':client_id'
  AND tier_id = (SELECT current_tier FROM users WHERE id = ':user_id');

-- 3. Check concluded redemptions (main history data)
SELECT red.id, red.status, red.concluded_at, red.rejected_at,
       m.mission_type, m.display_name,
       r.type as reward_type, r.name as reward_name
FROM redemptions red
JOIN mission_progress mp ON red.mission_progress_id = mp.id
JOIN missions m ON mp.mission_id = m.id
JOIN rewards r ON m.reward_id = r.id
WHERE red.user_id = ':user_id'
  AND red.client_id = ':client_id'
  AND red.status IN ('concluded', 'rejected')
  AND red.deleted_at IS NULL
ORDER BY COALESCE(red.concluded_at, red.rejected_at) DESC;

-- 4. Check raffle participations for history entries
SELECT rp.is_winner, rp.participated_at, rp.winner_selected_at,
       m.display_name, r.name as prize_name
FROM raffle_participations rp
JOIN mission_progress mp ON rp.mission_progress_id = mp.id
JOIN missions m ON mp.mission_id = m.id
JOIN rewards r ON m.reward_id = r.id
WHERE rp.user_id = ':user_id'
  AND rp.client_id = ':client_id';

-- 5. Verify mission_progress links exist (required for JOINs)
SELECT mp.id, mp.mission_id, mp.status, mp.completed_at,
       m.display_name
FROM mission_progress mp
JOIN missions m ON mp.mission_id = m.id
WHERE mp.user_id = ':user_id'
  AND mp.client_id = ':client_id'
  AND mp.status IN ('completed', 'fulfilled');
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #2 |
| Empty history list | No `redemptions` with status 'concluded' or 'rejected' | Query #3 |
| Missing raffle entries | `raffle_participations` not linked via `mission_progress_id` | Query #4 |
| Wrong completion date | `mission_progress.completed_at` is NULL | Query #5 |
| "a prize" instead of prize name | `rewards.value_data.display_text` is NULL and `rewards.description` is NULL | Query #3 (check reward_name) |
| Raffle shows as concluded instead of rejected | `redemption.status` is 'concluded' not 'rejected' | Query #3 |

### Frontend State

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `mockApiResponse` | Currently mock, will be API | All history data |
| `currentTierName` | `mockApiResponse.user.currentTierName` | Header tier badge text |
| `currentTierColor` | `mockApiResponse.user.currentTierColor` | Header tier badge color |

**TODO:** Add after frontend integration:
- `isLoading` - Show loading skeleton during fetch
- `error` - Show error state with retry button

### Key Business Logic

1. **History Statuses:** Only `concluded` and `rejected_raffle` missions appear (derived from `redemptions.status`)
2. **Status Derivation:** If `redemption.status='rejected'` AND `raffle_participation.is_winner=false` → `rejected_raffle`, else → `concluded`
3. **Sorting:** Most recent first by `COALESCE(concluded_at, rejected_at) DESC`
4. **Raffle Display:** Shows `raffleData` object with `isWinner`, `drawDate`, `prizeName` for raffle missions
5. **Date Formatting:** All dates formatted as "Jan 10, 2025" via `formatDateShort()`
6. **Prize Name Generation:** Uses `generateRewardName()` with article grammar ("a Hoodie", "an iPhone")
7. **Mission Display Names:** Uses `MISSION_DISPLAY_NAMES` map for consistent naming (e.g., `sales_dollars` → "Sales Sprint")

### Seed Data Requirements

For /missions/missionhistory to show data, users must have completed missions that reached `concluded` or `rejected` status.

#### Dependency Order (Must seed in this order)

```
1. clients          (no dependencies)
2. tiers            (depends on: clients)
3. rewards          (depends on: clients)
4. users            (depends on: clients, tiers, Supabase Auth)
5. missions         (depends on: clients, tiers, rewards)
6. mission_progress (depends on: users, missions) - status='completed' or 'fulfilled'
7. redemptions      (depends on: mission_progress, rewards) - status='concluded' or 'rejected'
8. raffle_participations (optional, for raffle history)
```

#### Minimum Viable Seed Data

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `users` | 1 test user | `id` (MUST match Supabase Auth UUID), `client_id`, `current_tier` |
| `tiers` | At least 1 | `tier_id`, `tier_name`, `tier_color` (for header badge) |
| `missions` | At least 1 concluded | `mission_type`, `display_name`, `reward_id` |
| `rewards` | At least 1 | `type`, `name`, `value_data` (for display text) |
| `mission_progress` | 1 per concluded mission | `status='completed'` or `'fulfilled'`, `completed_at` NOT NULL |
| `redemptions` | 1 per history entry | `status='concluded'` or `'rejected'`, `concluded_at` or `rejected_at` NOT NULL, `mission_progress_id` NOT NULL |

#### Critical Constraints

| Constraint | Requirement | What Breaks If Violated |
|------------|-------------|-------------------------|
| **mission_progress_id NOT NULL** | `redemptions.mission_progress_id` must reference valid `mission_progress.id` | RPC returns empty - INNER JOIN fails |
| **Status IN ('concluded', 'rejected')** | Only these statuses appear in history | Nothing shows if all redemptions are 'claimed' or 'claimable' |
| **deleted_at IS NULL** | Soft-deleted redemptions excluded | Deleted items would incorrectly appear |
| **Tier exists** | `users.current_tier` must exist in `tiers.tier_id` | 500 error on dashboard lookup |

#### Common Seed Script Pitfalls

| Pitfall | Symptom | Prevention |
|---------|---------|------------|
| Missing `mission_progress_id` on redemption | Empty history despite redemptions existing | Always create mission_progress before redemptions |
| Redemption status='claimed' not 'concluded' | Mission completed but not in history | Set status='concluded' and `concluded_at` timestamp |
| Raffle without `mission_progress_id` link | Raffle history missing | Link via `raffle_participations.mission_progress_id` |
| Missing `concluded_at` timestamp | Sorting fails, may show at bottom | Always set timestamp when setting status='concluded' |

### Current Implementation Status

**Backend:** ✅ Complete (API route, service, repository, RPC all implemented)

**Frontend:** ✅ Complete (ENH-005 - Server Component + Client Component pattern)

**Files:**
- `page.tsx` - Server Component (fetches `/api/missions/history`, handles 401 redirect)
- `missionhistory-client.tsx` - Client Component (receives `initialData` prop, renders UI)

---

## /tiers

**File:** `app/tiers/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tiers` | GET | Fetch tier progression data with rewards |

### Data Flow

**Current (Mock):**
```
page.tsx (Client Component)
  └── useState(scenarios)
        └── Mock data (2 scenarios, lines 38-429)
```

**Target (Server Component - TO BE IMPLEMENTED):**
```
page.tsx (Server Component)
  └── tierService.getTiersPageData() [Direct service call]
        ├── tierRepository.getUserTierContext()
        ├── tierRepository.getVipSystemSettings()
        ├── tierRepository.getAllTiers()
        ├── tierRepository.getVipTierRewards()
        ├── tierRepository.getTierMissions()
        └── aggregateRewardsForTier() (9-priority sorting)
```

### Service Layer

**File:** `lib/services/tierService.ts`

| Function | Purpose |
|----------|---------|
| `getTiersPageData(userId, clientId)` | Main orchestrator - fetches all tier data, builds response |
| `formatSalesValue(value, metric)` | Format number as "$2,100" or "2,100 units" |
| `formatProgressText(remaining, metric)` | Format "$900 to go" or "900 units to go" |
| `formatSalesDisplayText(minSales, metric)` | Format "$1,000+ in sales" or "1,000+ in units sold" |
| `generateRewardDisplayText(type, isRaffle, valueData, name, description)` | Format reward display text |
| `getRewardPriority(type, isRaffle)` | Get sort priority (1-9) for reward |
| `getExpirationInfo(tierLevel, nextCheckpointAt)` | Calculate expiration display (Bronze never expires) |
| `aggregateRewardsForTier(vipRewards, missionRewards, tierEligibility)` | Group rewards by type+isRaffle, max 4 |

### Repository Layer

**File:** `lib/repositories/tierRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getAllTiers(clientId)` | SELECT | Get all tiers ordered by tier_order |
| `getUserTierContext(userId, clientId)` | SELECT + SELECT | Get user tier info + tier_order lookup |
| `getVipSystemSettings(clientId)` | SELECT | Get client's vip_metric setting |
| `getVipTierRewards(clientId)` | SELECT | Get VIP tier rewards (reward_source='vip_tier') |
| `getTierMissions(clientId)` | SELECT with JOIN | Get missions with linked rewards |

**Note:** tierRepository uses `createAdminClient` (bypasses RLS).

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `users` | id, client_id, current_tier, total_sales, total_units, next_checkpoint_at, tier_achieved_at | User tier context |
| `clients` | id, vip_metric | VIP system configuration |
| `tiers` | id, tier_id, tier_name, tier_color, tier_order, sales_threshold, units_threshold, commission_rate, checkpoint_exempt | Tier definitions |
| `rewards` | id, type, name, description, value_data, tier_eligibility, redemption_quantity, reward_source, enabled | VIP tier rewards |
| `missions` | id, mission_type, tier_eligibility, reward_id, enabled | Mission definitions (for reward aggregation) |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID (used by API route) |

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /tiers to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table
- `:current_tier` → User's current_tier value (e.g., 'tier_1')

```sql
-- 1. Verify user exists with tier context
SELECT id, current_tier, total_sales, total_units,
       next_checkpoint_at, tier_achieved_at
FROM users
WHERE id = ':user_id'
  AND client_id = ':client_id';

-- 2. Verify client has vip_metric configured
SELECT id, vip_metric
FROM clients
WHERE id = ':client_id';

-- 3. Verify all tiers exist for client (with thresholds)
SELECT tier_id, tier_name, tier_order, tier_color,
       sales_threshold, units_threshold, commission_rate
FROM tiers
WHERE client_id = ':client_id'
ORDER BY tier_order;

-- 4. Verify user's current_tier exists in tiers table
-- (CRITICAL: If this returns 0 rows, service will throw error)
SELECT tier_id, tier_name, tier_order
FROM tiers
WHERE client_id = ':client_id'
  AND tier_id = ':current_tier';

-- 5. Verify VIP tier rewards exist per tier
SELECT tier_eligibility, type, name, redemption_quantity
FROM rewards
WHERE client_id = ':client_id'
  AND reward_source = 'vip_tier'
  AND enabled = true
ORDER BY tier_eligibility, display_order;

-- 6. Verify missions have linked rewards for aggregation
SELECT m.id, m.mission_type, m.tier_eligibility,
       r.type as reward_type, r.name as reward_name
FROM missions m
JOIN rewards r ON m.reward_id = r.id
WHERE m.client_id = ':client_id'
  AND m.enabled = true
  AND r.enabled = true
ORDER BY m.tier_eligibility;

-- 7. Check tier thresholds are sequential
-- (tier_order 2 should have higher threshold than tier_order 1)
SELECT tier_order, tier_name, sales_threshold, units_threshold
FROM tiers
WHERE client_id = ':client_id'
ORDER BY tier_order;
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #4 |
| Empty tier cards | No tiers for client_id | Query #3 |
| No rewards on tier cards | No `vip_tier` rewards or missions | Query #5, #6 |
| Wrong progress percentage | `total_sales` or `total_units` is NULL | Query #1 |
| Wrong VIP metric format | `clients.vip_metric` not set | Query #2 |
| "Max tier reached" when not | Next tier not found (tier_order gap) | Query #7 |
| Bronze showing expiration | `getExpirationInfo()` check failing | Query #4 (verify tier_order=1) |
| Commission rate 0 | `tiers.commission_rate` not set | Query #3 |

### Frontend State

**Current (Mock - TO BE REMOVED):**

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `activeScenario` | useState | Debug scenario switcher |
| `debugPanelOpen` | useState | Toggle debug panel |
| `scenarios` | Mock data | 2 test scenarios (Bronze, Silver) |

**Target (Server Component Pattern):**

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `initialData` | Server Component prop | TiersPageResponse from service |
| `error` | Server Component prop | Error message if service fails |

### Key Business Logic

1. **Tier Filtering:** Only show current tier + higher tiers (`tier_order >= user's tier_order`)
2. **VIP Metric:** Client setting determines `$X` (sales_dollars) vs `X units` (sales_units)
3. **Progress Calculation:** `(currentSales / nextTierTarget) * 100`, capped at 100%
4. **Expiration Logic:** Bronze (tier_order=1) never expires, higher tiers show `next_checkpoint_at`
5. **Reward Aggregation:** Group by type+isRaffle, sum uses, max 4 per tier card
6. **Priority Sorting (9 levels):** physical_gift_raffle(1) > experience_raffle(2) > gift_card_raffle(3) > experience(4) > physical_gift(5) > gift_card(6) > commission_boost(7) > spark_ads(8) > discount(9)
7. **isRaffle Derivation:** `mission.mission_type === 'raffle'` (not stored on reward)
8. **totalPerksCount:** Sum of all `redemption_quantity` values for tier

### Seed Data Requirements

For /tiers to function correctly, seed data must include tier thresholds and rewards.

#### Dependency Order

```
1. clients          (no dependencies)
2. tiers            (depends on: clients) - with thresholds + commission rates
3. rewards          (depends on: clients, tiers) - reward_source='vip_tier'
4. users            (depends on: clients, tiers, Supabase Auth)
5. missions         (depends on: clients, tiers, rewards) - for reward aggregation
```

#### Minimum Viable Seed Data

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `clients` | 1 | `id`, `vip_metric` ('sales' or 'units') |
| `tiers` | At least 2 | `tier_id`, `tier_name`, `tier_order`, `tier_color`, `sales_threshold` OR `units_threshold`, `commission_rate` |
| `users` | 1 test user | `id` (MUST match Supabase Auth UUID), `client_id`, `current_tier`, `total_sales` OR `total_units` |
| `rewards` | At least 1 per tier | `tier_eligibility`, `reward_source='vip_tier'`, `enabled=true`, `type` |

#### Critical Constraints

| Constraint | Requirement | What Breaks If Violated |
|------------|-------------|-------------------------|
| **Tier Order Sequential** | tier_order must be 1, 2, 3, 4 (no gaps) | Next tier lookup fails |
| **Thresholds Increasing** | Higher tier_order = higher threshold | Progress calculation wrong |
| **VIP Metric Match** | Thresholds must match client's vip_metric | Wrong threshold used for progress |
| **Commission Rate Set** | Each tier needs `commission_rate` | "0% Commission" displayed |

### Current Implementation Status

**Backend:** ✅ Complete (API route, service, repository all implemented)

**Frontend:** 🔄 Using mock data - needs Server Component conversion

**TODO for Task 9.7:**
1. Convert `page.tsx` to Server Component (direct service call)
2. Create `tiers-client.tsx` Client Component (UI)
3. Remove mock data (lines 38-429) and debug panel (lines 517-566)
4. Apply ENH-010 pattern (getUserIdFromToken + dashboardData.user)

---

## /rewards

**File:** `app/rewards/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rewards` | GET | Fetch all VIP tier rewards with status, eligibility, usage counts |

### Data Flow

```
page.tsx
  └── fetch('/api/rewards')
        └── app/api/rewards/route.ts
              ├── userRepository.findByAuthId()
              ├── dashboardRepository.getUserDashboard()
              └── rewardService.listAvailableRewards()
                    ├── rewardRepository.listAvailable()
                    │     └── RPC: get_available_rewards
                    ├── rewardRepository.getRedemptionCount()
                    ├── computeStatus()
                    ├── generateName()
                    └── generateDisplayText()
```

### Service Layer

**File:** `lib/services/rewardService.ts`

| Function | Purpose |
|----------|---------|
| `listAvailableRewards(params)` | Main orchestrator - fetches rewards, computes status, formats display |
| `computeStatus(data)` | Derives status from active redemption and sub-state data |
| `generateName(type, valueData, description)` | Formats reward name by type (e.g., "$50 Gift Card", "5% Pay Boost") |
| `generateDisplayText(type, valueData, description)` | Formats display text by type (e.g., "Amazon Gift Card", "Higher earnings (30d)") |

### Repository Layer

**File:** `lib/repositories/userRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findByAuthId(authId)` | RPC: `auth_find_user_by_id` | Get user from Supabase Auth ID |

**File:** `lib/repositories/dashboardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getUserDashboard(userId, clientId)` | SELECT with JOIN | Get user, client, tier data |

**File:** `lib/repositories/rewardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `listAvailable(userId, clientId, currentTier, currentTierOrder)` | RPC: `get_available_rewards` | Get all VIP tier rewards with active redemptions and sub-states |
| `getRedemptionCount(userId, clientId)` | SELECT COUNT | Count concluded redemptions for history link |

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `users` | id, client_id, current_tier, tier_achieved_at, tiktok_handle | User profile and tier info |
| `clients` | id, name, vip_metric | Client configuration |
| `tiers` | tier_id, tier_name, tier_color, tier_order | Tier definitions for eligibility |
| `rewards` | id, type, name, description, value_data, tier_eligibility, reward_source, redemption_quantity, redemption_frequency, display_order, enabled | Reward definitions |
| `redemptions` | id, user_id, reward_id, status, claimed_at, scheduled_activation_date, tier_at_claim, mission_progress_id | Claim tracking (mission_progress_id IS NULL for VIP tier) |
| `commission_boost_redemptions` | boost_status, scheduled_activation_date, activated_at, expires_at, duration_days, payment_method | Commission boost sub-state |
| `physical_gift_redemptions` | shipped_at, shipping_city, requires_size | Physical gift sub-state |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID |
| `get_available_rewards(p_user_id, p_client_id, p_current_tier, p_current_tier_order)` | Single query with JOINs for all reward data with active redemptions |

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /rewards to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table
- `:current_tier` → User's current_tier value (e.g., 'tier_1')

```sql
-- 1. Verify user exists and has valid current_tier
SELECT id, tiktok_handle, current_tier, client_id, tier_achieved_at
FROM users
WHERE id = ':user_id'
  AND client_id = ':client_id';

-- 2. Verify user's tier exists in tiers table
SELECT tier_id, tier_name, tier_color, tier_order
FROM tiers
WHERE client_id = ':client_id'
  AND tier_id = ':current_tier';

-- 3. Verify VIP tier rewards exist for user's tier
SELECT id, type, name, tier_eligibility, reward_source,
       redemption_quantity, redemption_frequency, display_order, enabled
FROM rewards
WHERE client_id = ':client_id'
  AND reward_source = 'vip_tier'
  AND enabled = true
  AND (tier_eligibility = ':current_tier' OR preview_from_tier = ':current_tier')
ORDER BY display_order;

-- 4. Check user's VIP tier redemptions (not mission-linked)
SELECT r.id, r.status, r.claimed_at, r.tier_at_claim,
       rw.type as reward_type, rw.name as reward_name
FROM redemptions r
JOIN rewards rw ON r.reward_id = rw.id
WHERE r.user_id = ':user_id'
  AND r.client_id = ':client_id'
  AND r.mission_progress_id IS NULL
  AND r.deleted_at IS NULL;

-- 5. Check commission boost sub-states
SELECT cb.boost_status, cb.scheduled_activation_date,
       cb.activated_at, cb.expires_at, cb.duration_days
FROM commission_boost_redemptions cb
WHERE cb.client_id = ':client_id'
  AND cb.redemption_id IN (
    SELECT id FROM redemptions
    WHERE user_id = ':user_id'
      AND mission_progress_id IS NULL
  );

-- 6. Check physical gift sub-states
SELECT pg.shipped_at, pg.shipping_city, pg.requires_size
FROM physical_gift_redemptions pg
WHERE pg.client_id = ':client_id'
  AND pg.redemption_id IN (
    SELECT id FROM redemptions
    WHERE user_id = ':user_id'
      AND mission_progress_id IS NULL
  );

-- 7. Count concluded redemptions (for history link)
SELECT COUNT(*) as redemption_count
FROM redemptions
WHERE user_id = ':user_id'
  AND client_id = ':client_id'
  AND status = 'concluded';
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #2 |
| No rewards shown | No `vip_tier` rewards for user's tier | Query #3 |
| Reward shows wrong status | Active redemption or sub-state has incorrect status | Query #4, #5 |
| Commission boost stuck | `commission_boost_redemptions.boost_status` incorrect | Query #5 |
| Physical gift not showing as shipped | `physical_gift_redemptions.shipped_at` is NULL | Query #6 |
| Wrong usage count (X/Y) | Redemptions not linked correctly or wrong tier_at_claim | Query #4 |
| Locked reward not visible | `preview_from_tier` doesn't match user's tier | Query #3 |
| History count wrong | Redemptions not in 'concluded' status | Query #7 |

### Frontend State

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `mockData` | Currently mock, will be API | All rewards data (user, redemptionCount, rewards[]) |
| `showScheduleModal` | Local | Discount scheduling modal |
| `selectedDiscount` | Local | Discount being scheduled (id, percent, durationDays) |
| `showPayboostModal` | Local | Commission boost scheduling modal |
| `selectedPayboost` | Local | Payboost being scheduled (id, percent, durationDays) |
| `showPhysicalGiftModal` | Local | Physical gift claim modal |
| `selectedPhysicalGift` | Local | Physical gift being claimed |
| `showPaymentInfoModal` | Local | Payment info collection modal |
| `selectedReward` | Local | Reward for payment info |
| `userTimezone` | Browser | User's timezone for date formatting |

**TODO:** Add after frontend integration:
- `isLoading` - Show loading skeleton during fetch
- `error` - Show error state with retry button

### Key Business Logic

1. **10 Reward Statuses:** `clearing`, `sending`, `active`, `pending_info`, `scheduled`, `redeeming_physical`, `redeeming`, `claimable`, `limit_reached`, `locked`

2. **Backend Priority Sorting:** actionable (pending_info, claimable) → status updates (clearing, sending, active, scheduled) → processing (redeeming) → informational (limit_reached, locked)

3. **Tier Eligibility:** User must match `tier_eligibility` exactly OR be in `preview_from_tier` (locked preview)

4. **Usage Limits:** `usedCount` vs `totalQuantity` - based on `redemption_quantity` and `tier_at_claim` matching current tier

5. **VIP Tier Filter:** Only `reward_source='vip_tier'` rewards (not mission rewards)

6. **Scheduling Required:** `discount` and `commission_boost` types open scheduling modal before claim

7. **Flippable Cards:** 6 card types for: clearing, scheduled, active, pending_info, sending, redeeming

8. **Payment Info Flow:** `pending_info` status requires payment method before commission boost can proceed

### Seed Data Requirements

For /rewards to function correctly, seed data must be created in the correct order with proper relationships.

#### Dependency Order (Must seed in this order)

```
1. clients          (no dependencies)
2. tiers            (depends on: clients)
3. rewards          (depends on: clients, tiers for tier_eligibility)
4. users            (depends on: clients, tiers for current_tier, Supabase Auth for id)
5. redemptions      (depends on: users, rewards, clients) - optional, for active claims
6. commission_boost_redemptions (depends on: redemptions) - optional, for boost sub-states
7. physical_gift_redemptions    (depends on: redemptions) - optional, for gift sub-states
```

#### Minimum Viable Seed Data

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `clients` | 1 | `id`, `vip_metric` ('sales' or 'units') |
| `tiers` | At least 1 | `tier_id`, `tier_name`, `tier_color`, `tier_order`, `client_id` |
| `users` | 1 test user | `id` (MUST match Supabase Auth UUID), `client_id`, `current_tier` |
| `rewards` | At least 1 VIP tier reward | `tier_eligibility`, `reward_source='vip_tier'`, `enabled=true`, `type` |

#### Critical Constraints

| Constraint | Requirement | What Breaks If Violated |
|------------|-------------|-------------------------|
| **User ID = Auth ID** | `users.id` MUST equal Supabase Auth user UUID | Login succeeds but user lookup fails → redirect loop |
| **Tier Exists** | `users.current_tier` must exist in `tiers.tier_id` | 500 error on dashboard lookup |
| **reward_source='vip_tier'** | Rewards must have this to appear on /rewards | Empty rewards list |
| **mission_progress_id IS NULL** | VIP tier redemptions have no mission link | Redemptions won't be counted correctly |

### Current Implementation Status

**Backend:** ✅ Complete (API route, service, repository, RPC all implemented)

**Frontend:** ✅ Complete (ENH-006 + ENH-008 - Server Component + direct service calls)

**Files:**
- `page.tsx` - Server Component (calls `rewardService.listAvailableRewards()` directly, handles 401 redirect)
- `rewards-client.tsx` - Client Component (receives `initialData` prop, renders UI with modals)

**Completed:** 2025-12-23 (Step 9.5)

---

## /rewards/rewardshistory

**File:** `app/rewards/rewardshistory/page.tsx`

### API Calls

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rewards/history` | GET | Fetch concluded VIP tier redemptions |

### Data Flow

**Target (Server Component - TO BE IMPLEMENTED):**
```
page.tsx (Server Component)
  └── rewardService.getRewardHistory() [Direct service call]
        ├── rewardRepository.getConcludedRedemptions()
        │     └── SELECT with JOIN (redemptions + rewards)
        ├── generateName()
        └── generateDisplayText()
```

**Current (Mock):**
```
page.tsx (Client Component)
  └── useState(scenarios)
        └── Mock data (5 scenarios, lines 39-329)
```

### Service Layer

**File:** `lib/services/rewardService.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `getRewardHistory(params)` | 1306-1352 | Main orchestrator - fetches concluded redemptions, formats for display |
| `generateName(type, valueData, description)` | 315-340 | Formats reward name by type (e.g., "$50 Gift Card") |
| `generateDisplayText(type, valueData, description)` | 342-427 | Formats display text by type (e.g., "Amazon Gift Card") |

### Repository Layer

**File:** `lib/repositories/userRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `findByAuthId(authId)` | RPC: `auth_find_user_by_id` | Get user from Supabase Auth ID |

**File:** `lib/repositories/dashboardRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getUserDashboard(userId, clientId)` | SELECT with JOIN | Get user, client, tier data for header |

**File:** `lib/repositories/rewardRepository.ts`

| Function | Lines | Query Type | Purpose |
|----------|-------|------------|---------|
| `getConcludedRedemptions(userId, clientId)` | 546-610 | SELECT with JOIN | Get concluded redemptions with reward details |

### Database Tables

| Table | Fields Used | Purpose |
|-------|-------------|---------|
| `users` | id, tiktok_handle, current_tier, client_id | User identification |
| `tiers` | tier_id, tier_name, tier_color | Current tier for header badge |
| `redemptions` | id, reward_id, claimed_at, concluded_at, status, user_id, client_id, mission_progress_id, deleted_at | Concluded redemption records |
| `rewards` | id, type, name, description, value_data, reward_source | Reward details for display |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `auth_find_user_by_id(p_user_id)` | Bypass RLS to find user by Supabase Auth ID |

### Validation Queries

Run these queries in Supabase SQL Editor to verify data exists for /rewards/rewardshistory to work.

**Replace placeholders:**
- `:client_id` → Your CLIENT_ID from .env.local
- `:user_id` → User's UUID from users table

```sql
-- 1. Verify user exists and has valid current_tier (for header badge)
SELECT id, tiktok_handle, current_tier, client_id
FROM users
WHERE id = ':user_id'
  AND client_id = ':client_id';

-- 2. Verify user's tier exists (for tier badge in header)
SELECT tier_id, tier_name, tier_color
FROM tiers
WHERE client_id = ':client_id'
  AND tier_id = (SELECT current_tier FROM users WHERE id = ':user_id');

-- 3. Check concluded VIP tier redemptions (main history data)
-- NOTE: mission_progress_id IS NULL = VIP tier reward (not mission reward)
SELECT red.id, red.status, red.claimed_at, red.concluded_at,
       rw.type as reward_type, rw.name as reward_name,
       rw.value_data, rw.reward_source
FROM redemptions red
JOIN rewards rw ON red.reward_id = rw.id
WHERE red.user_id = ':user_id'
  AND red.client_id = ':client_id'
  AND red.status = 'concluded'
  AND red.mission_progress_id IS NULL
  AND red.deleted_at IS NULL
ORDER BY red.concluded_at DESC;

-- 4. Count concluded redemptions (should match history length)
SELECT COUNT(*) as history_count
FROM redemptions
WHERE user_id = ':user_id'
  AND client_id = ':client_id'
  AND status = 'concluded'
  AND mission_progress_id IS NULL
  AND deleted_at IS NULL;

-- 5. Verify rewards table has data for JOIN
SELECT id, type, name, description, value_data, reward_source
FROM rewards
WHERE client_id = ':client_id'
  AND reward_source = 'vip_tier';
```

### Common Issues

| Symptom | Likely Cause | Validation Query |
|---------|--------------|------------------|
| 500 error on page load | User's `current_tier` doesn't exist in `tiers` table | Query #2 |
| Empty history list | No `redemptions` with status='concluded' | Query #3 |
| Missing items in history | `mission_progress_id` is NOT NULL (mission rewards excluded) | Query #3 |
| Wrong reward name | `generateName()` not matching reward type | Query #3 (check value_data) |
| "null" in description | `rewards.value_data` or `description` is NULL | Query #5 |
| Dates showing wrong | `concluded_at` timestamp missing or malformed | Query #3 |

### Frontend State

**Current (Mock - TO BE REMOVED):**

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `activeScenario` | useState | Debug scenario switcher |
| `debugPanelOpen` | useState | Toggle debug panel |
| `user` | mockData | User tier info for header |
| `history` | mockData | Concluded redemption list |

**Target (Server Component Pattern):**

| State Variable | Source | Purpose |
|----------------|--------|---------|
| `initialData` | Server Component prop | RedemptionHistoryResponse from service |
| `error` | Server Component prop | Error message if service fails |

### Key Business Logic

1. **VIP Tier Only:** Only shows `mission_progress_id IS NULL` redemptions (not mission rewards)
2. **Status Filter:** Only `status='concluded'` (terminal state)
3. **Sorting:** `concluded_at DESC` (most recent first)
4. **Name Formatting:** Uses `generateName()` for backend-formatted names
5. **Display Text:** Uses `generateDisplayText()` for descriptions
6. **No Pagination:** Per API spec, returns all history items

### Seed Data Requirements

For /rewards/rewardshistory to show data, users must have claimed and concluded VIP tier rewards.

#### Dependency Order

```
1. clients          (no dependencies)
2. tiers            (depends on: clients)
3. rewards          (depends on: clients) - reward_source='vip_tier'
4. users            (depends on: clients, tiers, Supabase Auth)
5. redemptions      (depends on: users, rewards) - status='concluded', mission_progress_id=NULL
```

#### Minimum Viable Seed Data

| Table | Required Rows | Critical Fields |
|-------|---------------|-----------------|
| `users` | 1 test user | `id` (MUST match Supabase Auth UUID), `client_id`, `current_tier` |
| `tiers` | At least 1 | `tier_id`, `tier_name`, `tier_color` (for header badge) |
| `rewards` | At least 1 VIP tier | `type`, `value_data`, `reward_source='vip_tier'` |
| `redemptions` | 1 per history entry | `status='concluded'`, `concluded_at` NOT NULL, `mission_progress_id=NULL` |

#### Critical Constraints

| Constraint | Requirement | What Breaks If Violated |
|------------|-------------|-------------------------|
| **mission_progress_id IS NULL** | VIP tier redemptions have no mission link | Items won't appear in history |
| **status='concluded'** | Only terminal state appears | Nothing shows if status is 'claimed' or 'fulfilled' |
| **concluded_at NOT NULL** | Required for sorting | Sorting fails, may show at bottom |
| **Tier exists** | `users.current_tier` must exist in `tiers.tier_id` | 500 error on dashboard lookup |

### Current Implementation Status

**Backend:** ✅ Complete (API route, service, repository all implemented)

**Frontend:** 🔄 Using mock data - needs Server Component conversion

**TODO for Task 9.6:**
1. Convert `page.tsx` to Server Component (direct service call)
2. Create `rewardshistory-client.tsx` Client Component (UI)
3. Remove mock data (lines 39-329) and debug panel (lines 337-390)

---

## Login Pages

TODO: Document authentication flow pages

---

## Maintenance Notes

**When to update this document:**
- Adding new API calls to a page
- Changing service/repository function signatures
- Adding new database queries
- Discovering new common issues

**How to verify accuracy:**
1. Read the actual `page.tsx` file
2. Trace `fetch()` calls to API routes
3. Trace service calls to repository calls
4. Run validation queries against live database
