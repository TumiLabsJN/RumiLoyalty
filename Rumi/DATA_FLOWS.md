# Data Flows

Quick reference for how each page fetches and displays data.

**Purpose:** Help developers (human or AI) quickly understand the data pipeline for each page without reading multiple files.

**Methodology:** Each section is derived from actual code analysis, not documentation. Validation queries verify the data exists in Supabase for the page to function correctly.

---

## Table of Contents

1. [/home (Dashboard)](#home-dashboard)
2. [/missions](#missions) - TODO
3. [/missions/missionhistory](#missionsmissionhistory) - TODO
4. [/tiers](#tiers) - TODO
5. [/rewards](#rewards) - TODO
6. [Login Pages](#login-pages) - TODO

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
| `getMissionHistory(userId, clientId, userInfo)` | Returns concluded missions with formatted dates |

### Repository Layer

**File:** `lib/repositories/missionRepository.ts`

| Function | Query Type | Purpose |
|----------|------------|---------|
| `getHistory(userId, clientId)` | RPC: `get_mission_history` | Get concluded + rejected missions |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `get_mission_history(p_user_id, p_client_id)` | Query concluded/rejected redemptions with mission/reward data |

### Key Business Logic

1. **History Statuses:** Only `concluded` and `rejected_raffle` missions appear
2. **Sorting:** Most recent first (by `concluded_at` or `rejected_at`)
3. **Raffle Display:** Shows winner status and draw date for raffle missions

---

---

## /tiers

TODO: Document after /missions/missionhistory

---

## /rewards

TODO: Document after /tiers

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
