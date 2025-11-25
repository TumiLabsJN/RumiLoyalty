# SCHEMA FINAL V2 - COMPLETE DATABASE SCHEMA

**Platform:** Rumi Loyalty Platform
**Version:** Final Consolidated Schema (Missions + Rewards + System Tables)
**Date:** 2025-01-14
**Sources:** SchemaFinal.md + Loyalty.md + VIP Metric Enhancements

---

## TABLE OF CONTENTS

### SECTION 1: SYSTEM | USER MANAGEMENT | PERFORMANCE | TIER SYSTEM

| # | Table Name | Purpose | Line |
|---|------------|---------|------|
| 1.1 | clients | Multi-tenant configuration & branding | 32 |
| 1.2 | users | Creator profiles & precomputed dashboard fields | 58 |
| 1.4 | videos | Per-video analytics (granular) | 124 |
| 1.5 | tiers | Dynamic tier configuration (3-6 tiers) | 159 |
| 1.6 | sales_adjustments | Manual sales/units corrections | 190 |
| 1.7 | tier_checkpoints | Tier maintenance audit trail | 216 |
| 1.8 | handle_changes | TikTok handle change tracking | 247 |
| 1.10 | sync_logs | Data sync operation tracking | 327 |

### SECTION 2: MISSIONS | REWARDS | REWARD SUB-STATES

| # | Table Name | Purpose | Line |
|---|------------|---------|------|
| 2.1 | missions | Mission templates (admin-configured goals) | 273 |
| 2.2 | mission_progress | User progress tracking on missions | 333 |
| 2.3 | rewards | Reward templates (admin-configured) | 370 |
| 2.4 | redemptions | Claim tracking (5-state lifecycle) | 459 |
| 2.5 | commission_boost_redemptions | Commission boost sub-state (6-state lifecycle) | 524 |
| 2.6 | commission_boost_state_history | Commission boost audit trail | 605 |
| 2.7 | physical_gift_redemptions | Physical gift sub-state (size + shipping) | 678 |
| 2.8 | raffle_participations | Raffle mission sub-state (ONE-TO-MANY) | 741 |

### SECTION 3: SCHEMA DOMAINS

**Domain 1: System Configuration**
- clients (1.1) - Multi-tenant config
- tiers (1.5) - Tier thresholds

**Domain 2: User Management**
- users (1.2) - Creator profiles
- handle_changes (1.8) - Handle tracking

**Domain 3: Performance Tracking**
- videos (1.4) - Per-video data
- sales_adjustments (1.6) - Manual corrections

**Domain 4: Tier System**
- tier_checkpoints (1.7) - Tier audit trail

**Domain 5: Missions**
- missions (2.1) - Mission templates
- mission_progress (2.2) - User progress

**Domain 6: Rewards**
- rewards (2.3) - Reward templates
- redemptions (2.4) - Claim tracking

**Domain 7: Reward Sub-States**
- commission_boost_redemptions (2.5) - Boost lifecycle
- commission_boost_state_history (2.6) - Boost audit
- physical_gift_redemptions (2.7) - Shipping info
- raffle_participations (2.8) - Raffle entries

---

## QUICK REFERENCE

### Tables by Foreign Key Dependencies
```
clients (root)
├── users
│   ├── videos
│   ├── sales_adjustments
│   ├── tier_checkpoints
│   ├── handle_changes
│   ├── mission_progress
│   └── redemptions
├── tiers
├── missions
│   ├── mission_progress
│   └── raffle_participations
└── rewards
    └── redemptions
        ├── commission_boost_redemptions
        │   └── commission_boost_state_history
        ├── physical_gift_redemptions
        └── raffle_participations
```

### Tables by Access Pattern
**Dashboard Queries:** users (1.2), tiers (1.5)
**Mission Tracking:** missions (2.1), mission_progress (2.2)
**Reward Claiming:** rewards (2.3), redemptions (2.4)
**Admin Fulfillment:** commission_boost_redemptions (2.5), physical_gift_redemptions (2.7)
**Audit/Compliance:** tier_checkpoints (1.7), commission_boost_state_history (2.6)

---

## SECTION 1: System | User Management | Performance Tracking | Tier System

### 1.1 clients Table

**Purpose:** Multi-tenant configuration (single client for MVP, scalable to multiple)

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `name` - VARCHAR(255) - Client/brand display name
- `subdomain` - VARCHAR(100) UNIQUE - Future multi-tenant routing (e.g., 'clientx.loyaltyapp.com')
- `logo_url` - TEXT - Supabase Storage URL for login screen logo (required for go-live)
- `primary_color` - VARCHAR(7) DEFAULT '#6366f1' - Global header color (hex format)
- `tier_calculation_mode` - VARCHAR(50) DEFAULT 'fixed_checkpoint' - Options: 'fixed_checkpoint' (default, checkpoint-based tier maintenance), 'lifetime' (tiers never downgrade)
- `checkpoint_months` - INTEGER DEFAULT 4 - Checkpoint period duration (same for all non-Bronze tiers)
- `vip_metric` - VARCHAR(20) NOT NULL DEFAULT 'sales' - VIP tier progression metric: 'sales' (revenue $$$) or 'units' (volume #). Immutable after client launch.
- `created_at`, `updated_at` - TIMESTAMP - Audit trail

---

### 1.2 users Table

**Purpose:** Content creator profiles and performance tracking

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `client_id` - UUID REFERENCES clients(id)
- `tiktok_handle` - VARCHAR(100) NOT NULL - Primary identifier from Cruva CSV
- `email` - VARCHAR(255) NULLABLE - Collected on first login
- `email_verified` - BOOLEAN DEFAULT false
- `password_hash` - VARCHAR(255) NOT NULL - Bcrypt hash of user password (rounds=10)
- `terms_accepted_at` - TIMESTAMP NULLABLE - When user agreed to Terms of Use
- `terms_version` - VARCHAR(50) NULLABLE - Version of terms accepted (e.g., "2025-01-18")
- `is_admin` - BOOLEAN DEFAULT false
- `current_tier` - VARCHAR(50) DEFAULT 'tier_1'
- `tier_achieved_at` - TIMESTAMP - When reached current tier (start of checkpoint period)
- `next_checkpoint_at` - TIMESTAMP - End of checkpoint period
- `checkpoint_sales_target` - DECIMAL(10, 2) - Sales needed to maintain tier (sales mode)
- `checkpoint_units_target` - INTEGER - Units needed to maintain tier (units mode)
- **Precomputed fields (16 fields):**
  - Leaderboard (5 fields): `leaderboard_rank`, `total_sales`, `total_units`, `manual_adjustments_total`, `manual_adjustments_units`
  - Checkpoint progress (3 fields): `checkpoint_sales_current`, `checkpoint_units_current`, `projected_tier_at_checkpoint`
  - Engagement (4 fields): `checkpoint_videos_posted`, `checkpoint_total_views`, `checkpoint_total_likes`, `checkpoint_total_comments`
  - Next tier (3 fields): `next_tier_name`, `next_tier_threshold`, `next_tier_threshold_units`
  - Historical (1 field): `checkpoint_progress_updated_at`
- **Payment info fields (3 fields):**
  - `default_payment_method` - VARCHAR(20) NULLABLE - 'paypal' or 'venmo' (user's saved preference)
  - `default_payment_account` - VARCHAR(255) NULLABLE - PayPal email or Venmo handle
  - `payment_info_updated_at` - TIMESTAMP NULLABLE - When user last updated payment info
- `first_video_date` - TIMESTAMP - When first appeared in Cruva
- `last_login_at` - TIMESTAMP
- `created_at`, `updated_at` - TIMESTAMP

---

### 1.3 otp_codes Table

**Purpose:** Email verification via one-time passwords during signup

**Current Attributes:**
- `id` - UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` - UUID REFERENCES users(id) ON DELETE CASCADE
- `session_id` - VARCHAR(100) NOT NULL UNIQUE - Tracked via HTTP-only cookie
- `code_hash` - VARCHAR(255) NOT NULL - Bcrypt hash of 6-digit OTP code
- `expires_at` - TIMESTAMP NOT NULL - 5 minutes from creation
- `attempts` - INTEGER DEFAULT 0 - Max 3 attempts before code becomes invalid
- `used` - BOOLEAN DEFAULT false - One-time use only (cannot reuse same code)
- `created_at` - TIMESTAMP DEFAULT NOW()

**Indexes:**
```sql
CREATE INDEX idx_otp_session ON otp_codes(session_id);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

**Security Features:**
- Session ID in HTTP-only cookie (cannot be accessed by JavaScript)
- OTP code hashed with bcrypt before storage (never plaintext)
- Automatic expiration after 5 minutes
- Attempt counter for rate limiting
- Used flag prevents code reuse

---

### 1.4 password_reset_tokens Table

**Purpose:** Secure password reset via email magic links

**Current Attributes:**
- `id` - UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` - UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `token_hash` - VARCHAR(255) NOT NULL - Bcrypt hash of reset token (never store plaintext)
- `created_at` - TIMESTAMP NOT NULL DEFAULT NOW() - When token was generated
- `expires_at` - TIMESTAMP NOT NULL - Token valid for 15 minutes (created_at + 15 minutes)
- `used_at` - TIMESTAMP NULLABLE - NULL = not used yet, timestamp = already used (one-time use)
- `ip_address` - VARCHAR(45) NULLABLE - IP address that requested reset (for security audit log)

**Indexes:**
- `idx_token_hash` - Fast token lookups during validation (bcrypt compare)
- `idx_user_id` - User-specific queries (e.g., revoke all tokens for user)
- `idx_expires_at` - Cleanup job for expired tokens (daily cron)

**Security Features:**
- Token stored as bcrypt hash (even if DB breached, tokens are secure)
- Expires in 15 minutes (short-lived, reduces attack window)
- One-time use prevents replay attacks (used_at flag)
- Anti-enumeration: Always return success even if user not found
- Rate limiting: Max 3 reset requests per hour per identifier

**Flow:**
1. User requests reset → backend generates crypto.randomBytes(32) token (44 chars)
2. Backend hashes token with bcrypt, stores hash in password_reset_tokens table
3. Backend sends plaintext token in email link: `/login/resetpw?token=abc123xyz`
4. User clicks link → frontend sends token to backend
5. Backend validates: bcrypt.compare(token, token_hash), checks expiration, checks used_at
6. If valid → update users.password_hash, set used_at = NOW()
7. Token can never be reused (used_at prevents replay)

---

### 1.5 videos Table

**Purpose:** Per-video analytics from Cruva CSV (videos.csv) - Each row represents ONE video with its individual metrics

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `user_id` - UUID REFERENCES users(id) - Which creator posted this video
- `client_id` - UUID NOT NULL REFERENCES clients(id) - Multi-tenant isolation
- `video_url` - TEXT UNIQUE NOT NULL - Unique identifier for this specific video
- `video_title` - TEXT - Title of this specific video
- `post_date` - DATE NOT NULL - When this video was posted
- `views` - INTEGER DEFAULT 0 - View count for this video only (NOT total views)
- `likes` - INTEGER DEFAULT 0 - Like count for this video only (NOT total likes)
- `comments` - INTEGER DEFAULT 0 - Comment count for this video only (NOT total comments)
- `gmv` - DECIMAL(10, 2) DEFAULT 0 - GMV generated by this video only (NOT total GMV)
- `ctr` - DECIMAL(5, 2) - Click-through rate for this video only
- `units_sold` - INTEGER DEFAULT 0 - Units sold through this video only (NOT total units)
- `sync_date` - TIMESTAMP NOT NULL - When this video's data was last synced from Cruva
- `created_at`, `updated_at` - TIMESTAMP - Audit trail

**Important:** This is a **per-video granular table**. Aggregation happens separately:
- Total views/likes/comments are calculated via `SUM()` queries and stored in `users` table precomputed fields
- Mission progress tracking aggregates from this table into mission_progress.current_value (e.g., `SUM(views) WHERE post_date >= checkpoint_start`)
- Each row = 1 video, each metric = that video's individual performance

---

### 1.6 tiers Table

**Purpose:** Dynamic tier configuration (3-6 tiers per client, admin-customizable)

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `client_id` - UUID REFERENCES clients(id)
- `tier_order` - INTEGER NOT NULL - Display order: 1-6
- `tier_id` - VARCHAR(50) NOT NULL - Internal ID: 'tier_1' through 'tier_6'
- `tier_name` - VARCHAR(100) NOT NULL - Admin-customizable (e.g., 'Bronze', 'Silver', 'Gold', 'Platinum')
- `tier_color` - VARCHAR(7) NOT NULL - Hex color for UI display
- `sales_threshold` - DECIMAL(10, 2) - Minimum sales ($) to reach tier (sales mode only, mutually exclusive with units_threshold)
- `units_threshold` - INTEGER - Minimum units (#) to reach tier (units mode only, mutually exclusive with sales_threshold)
- `commission_rate` - DECIMAL(5, 2) NOT NULL - Commission percentage
- `checkpoint_exempt` - BOOLEAN DEFAULT false - true = no checkpoints (entry tier only)
- `created_at`, `updated_at` - TIMESTAMP
- UNIQUE(client_id, tier_order)
- UNIQUE(client_id, tier_id)

---

### 1.7 sales_adjustments Table

**Purpose:** Manual sales corrections (offline sales, refunds, bonuses)

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `user_id` - UUID REFERENCES users(id)
- `client_id` - UUID NOT NULL REFERENCES clients(id) - Multi-tenant isolation
- `amount` - DECIMAL(10, 2) - Positive or negative sales adjustment (sales mode, mutually exclusive with amount_units)
- `amount_units` - INTEGER - Positive or negative units adjustment (units mode, mutually exclusive with amount)
- `reason` - TEXT NOT NULL - Admin explanation
- `adjustment_type` - VARCHAR(50) NOT NULL - Options: 'manual_sale', 'refund', 'bonus', 'correction'
- `adjusted_by` - UUID REFERENCES users(id) - Which admin made adjustment
- `created_at` - TIMESTAMP
- `applied_at` - TIMESTAMP - When included in tier calculation (NULL until daily sync applies it)

---

### 1.8 tier_checkpoints Table

**Purpose:** Audit trail for tier maintenance evaluations

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `user_id` - UUID REFERENCES users(id)
- `client_id` - UUID NOT NULL REFERENCES clients(id) - Multi-tenant isolation
- `checkpoint_date` - TIMESTAMP NOT NULL
- `period_start_date` - TIMESTAMP NOT NULL
- `period_end_date` - TIMESTAMP NOT NULL
- `sales_in_period` - DECIMAL(10, 2) - Sales in checkpoint period (sales mode only, includes manual adjustments)
- `sales_required` - DECIMAL(10, 2) - Sales required to maintain tier (sales mode only)
- `units_in_period` - INTEGER - Units in checkpoint period (units mode only, includes manual adjustments)
- `units_required` - INTEGER - Units required to maintain tier (units mode only)
- `tier_before` - VARCHAR(50) NOT NULL
- `tier_after` - VARCHAR(50) NOT NULL
- `status` - VARCHAR(50) NOT NULL - Options: 'maintained', 'promoted', 'demoted'
- `created_at` - TIMESTAMP

---

### 1.9 handle_changes Table

**Purpose:** Audit trail for TikTok handle changes (detect when creator changes handle)

**Current Attributes:**
- `id` - UUID PRIMARY KEY
- `user_id` - UUID REFERENCES users(id)
- `old_handle` - VARCHAR(100) NOT NULL
- `new_handle` - VARCHAR(100) NOT NULL
- `detected_at` - TIMESTAMP DEFAULT NOW()
- `resolved_by` - UUID - Admin who confirmed the change
- `resolved_at` - TIMESTAMP

**Status:** **KEEP** ✅

---

### 1.10 sync_logs Table

**Purpose:** Track automated and manual data sync operations from Cruva

**Current Attributes:**
- `id` - UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `client_id` - UUID NOT NULL REFERENCES clients(id) - Multi-tenant isolation
- `status` - VARCHAR(50) NOT NULL DEFAULT 'running' - Options: 'running', 'success', 'failed'
- `source` - VARCHAR(50) NOT NULL DEFAULT 'auto' - Options: 'auto', 'manual'
- `started_at` - TIMESTAMP NOT NULL DEFAULT NOW() - When sync started
- `completed_at` - TIMESTAMP - When sync finished (NULL if running)
- `records_processed` - INTEGER DEFAULT 0 - Number of records processed
- `error_message` - TEXT - Error details if status='failed'
- `file_name` - VARCHAR(255) - Original filename for manual uploads
- `triggered_by` - UUID REFERENCES users(id) - Admin who triggered manual upload (NULL for auto)
- `created_at` - TIMESTAMP DEFAULT NOW()

**Indexes:**
```sql
CREATE INDEX idx_sync_logs_client ON sync_logs(client_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(client_id, status);
CREATE INDEX idx_sync_logs_recent ON sync_logs(client_id, started_at DESC);
```

**Status:** **NEW** - Added for Admin UI Data Sync screen

---

## SECTION 2: Missions | Rewards | Reward Sub-states

### 1. missions Table

**Purpose:** Mission templates (goals/targets configured by admin)

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT uuid_generate_v4() | missions | Mission templates | |
| client_id | UUID | REFERENCES clients(id) ON DELETE CASCADE | missions | Multi-tenant isolation | |
| title | VARCHAR(255) | NOT NULL | missions | Internal admin reference (NOT shown to creators) | |
| display_name | VARCHAR(255) | NOT NULL | missions | User-facing mission name | Static per mission_type: 'Sales Sprint' (sales), 'Fan Favorite' (likes), 'Road to Viral' (views), 'Lights, Camera, Go!' (videos), 'VIP Raffle' (raffle) |
| description | TEXT | | missions | Admin notes | |
| mission_type | VARCHAR(50) | NOT NULL | missions | Mission configuration | Options: 'sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle' |
| target_value | INTEGER | NOT NULL | missions | Target to achieve | Set to 0 for raffle type |
| target_unit | VARCHAR(20) | NOT NULL DEFAULT 'dollars' | missions | Unit type for target_value | Options: 'dollars' (sales mode), 'units' (units mode), 'count' (engagement missions) |
| reward_id | UUID | NOT NULL REFERENCES rewards(id) | missions | What they unlock when complete | |
| tier_eligibility | VARCHAR(50) | NOT NULL | missions | Tier targeting | Options: 'all', 'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6' |
| preview_from_tier | VARCHAR(50) | NULL | missions | Visibility controls | NULL or 'tier_1' through 'tier_6' |
| display_order | INTEGER | NOT NULL | missions | Sequential unlock position | 1, 2, 3... |
| raffle_end_date | TIMESTAMP | NULL | missions | Winner selection deadline | ONLY for raffle type (required if mission_type='raffle') |
| enabled | BOOLEAN | DEFAULT true | missions | Controls | |
| activated | BOOLEAN | DEFAULT false | missions | For raffles: false=dormant, true=accepting entries | Regular missions ignore this field |
| created_at | TIMESTAMP | DEFAULT NOW() | missions | Audit | |

**Constraints:**
```sql
CONSTRAINT check_raffle_requirements CHECK (
  (mission_type != 'raffle') OR
  (mission_type = 'raffle' AND raffle_end_date IS NOT NULL AND target_value = 0)
)

CONSTRAINT check_non_raffle_fields CHECK (
  (mission_type = 'raffle') OR
  (mission_type != 'raffle' AND raffle_end_date IS NULL)
)

CONSTRAINT check_tier_eligibility CHECK (
  tier_eligibility = 'all' OR
  tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
)

CONSTRAINT check_preview_tier_missions CHECK (
  preview_from_tier IS NULL OR
  preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')
)

CONSTRAINT check_target_unit CHECK (
  target_unit IN ('dollars', 'units', 'count')
)

UNIQUE(client_id, tier_eligibility, mission_type, display_order)
```

**Indexes:**
```sql
CREATE INDEX idx_missions_client ON missions(client_id);
CREATE INDEX idx_missions_tier ON missions(tier_eligibility);

-- Composite index for common multi-filter queries (GET /api/missions)
CREATE INDEX idx_missions_lookup ON missions(client_id, enabled, tier_eligibility, display_order);
```

---

### 2. mission_progress Table

**Purpose:** User progress on missions (did the creator achieve the goal?)

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT uuid_generate_v4() | mission_progress | User progress tracking | |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | mission_progress | Content creator | |
| mission_id | UUID | REFERENCES missions(id) ON DELETE CASCADE | mission_progress | Which mission | |
| client_id | UUID | NOT NULL REFERENCES clients(id) | mission_progress | Multi-tenant isolation | Added in SchemaDecisions Fix 1 |
| current_value | INTEGER | DEFAULT 0 | mission_progress | Progress tracking | e.g., 350/500, 7/10 |
| status | VARCHAR(50) | DEFAULT 'active' | mission_progress | Mission lifecycle state | Options: 'active', 'dormant', 'completed' |
| completed_at | TIMESTAMP | | mission_progress | When hit target | |
| checkpoint_start | TIMESTAMP | | mission_progress | Snapshot of tier_achieved_at | Never updated after creation |
| checkpoint_end | TIMESTAMP | | mission_progress | Snapshot of next_checkpoint_at | Mission deadline |
| created_at | TIMESTAMP | DEFAULT NOW() | mission_progress | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | mission_progress | Audit | |

**Status Values:**
- `active`: Mission in progress
- `dormant`: Mission paused/inactive
- `completed`: Target reached (mission lifecycle complete)

**Constraints:**
```sql
UNIQUE(user_id, mission_id, checkpoint_start) -- One progress per mission per checkpoint
```

**Indexes:**
```sql
CREATE INDEX idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX idx_mission_progress_status ON mission_progress(status);
CREATE INDEX idx_mission_progress_tenant ON mission_progress(client_id, user_id, status);
```

---

### 3. rewards Table

**Purpose:** Admin-configured reward templates

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT uuid_generate_v4() | rewards | Reward templates | |
| client_id | UUID | REFERENCES clients(id) ON DELETE CASCADE | rewards | Multi-tenant isolation | |
| type | VARCHAR(100) | NOT NULL | rewards | Reward type | Options: 'gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience' |
| name | VARCHAR(255) | | rewards | Auto-generated from type + value_data | Backend generates at query time (see API_CONTRACTS.md) |
| description | VARCHAR(12) | | rewards | User-facing display | Max 12 chars, for physical_gift/experience only (used to generate name) |
| value_data | JSONB | | rewards | Structured reward configuration | See value_data examples below. May include displayText for physical_gift/experience |
| reward_source | VARCHAR(50) | NOT NULL DEFAULT 'mission' | rewards | Reward classification | Options: 'vip_tier' (automatic tier benefits), 'mission' (goal-based rewards). Determines which UI contexts display this reward. |
| tier_eligibility | VARCHAR(50) | NOT NULL | rewards | Tier targeting (exact match) | Options: 'tier_1' through 'tier_6' |
| enabled | BOOLEAN | DEFAULT false | rewards | Visibility control | |
| preview_from_tier | VARCHAR(50) | DEFAULT NULL | rewards | Preview as locked | NULL or 'tier_1' through 'tier_6' |
| redemption_frequency | VARCHAR(50) | DEFAULT 'unlimited' | rewards | Redemption limit frequency | Options: 'one-time', 'monthly', 'weekly', 'unlimited' |
| redemption_quantity | INTEGER | DEFAULT 1 | rewards | How many per period | 1-10, NULL for unlimited |
| redemption_type | VARCHAR(50) | NOT NULL DEFAULT 'instant' | rewards | Redemption process type | Options: 'instant' (gift_card, spark_ads, physical_gift, experience), 'scheduled' (commission_boost, discount) |
| expires_days | INTEGER | | rewards | Expiration | NULL = no expiration |
| display_order | INTEGER | | rewards | Admin UI sorting | |
| created_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | rewards | Audit | |

**value_data JSONB Examples:**

```json
// gift_card (displayText auto-generated by backend)
{"amount": 50}

// commission_boost (displayText auto-generated by backend)
{"percent": 5, "duration_days": 30}

// spark_ads (displayText auto-generated by backend)
{"amount": 100}

// discount (displayText auto-generated by backend)
{
  "percent": 10,
  "duration_minutes": 1440,
  "max_uses": 100,
  "coupon_code": "GOLD10"
}

// physical_gift (displayText provided by client admin, max 27 chars)
{
  "requires_size": true,
  "size_category": "clothing",
  "size_options": ["S", "M", "L", "XL"],
  "display_text": "Premium wireless earbuds"
}

// experience (displayText provided by client admin, max 27 chars)
{
  "display_text": "VIP weekend getaway"
}
```

**Backend name/displayText Generation Rules:**

When serving `GET /api/rewards`, backend generates `name` and `displayText` fields:

| Type | name | displayText |
|------|------|-------------|
| gift_card | `"$${amount} Gift Card"` | `"Amazon Gift Card"` |
| commission_boost | `"${percent}% Pay Boost"` | `"Higher earnings (${durationDays}d)"` |
| spark_ads | `"$${amount} Ads Boost"` | `"Spark Ads Promo"` |
| discount | `"${percent}% Deal Boost"` | `"Follower Discount (${durationDays}d)"` |
| physical_gift | `"Gift Drop: ${description}"` | `value_data.display_text \|\| description` |
| experience | `description` | `value_data.display_text \|\| description` |

See API_CONTRACTS.md for full API response specification.

**Constraints:**
```sql
CONSTRAINT check_reward_source CHECK (
  reward_source IN ('vip_tier', 'mission')
)

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
CREATE INDEX idx_rewards_source ON rewards(reward_source);

-- Composite index for common multi-filter queries (GET /api/rewards, GET /api/dashboard)
CREATE INDEX idx_rewards_lookup ON rewards(client_id, enabled, tier_eligibility, reward_source, display_order);
```

---

### 4. redemptions Table

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
| activation_date | TIMESTAMP | | redemptions | When discount/boost activated | Set when status='fulfilled' for discounts (cron job activates at scheduled time) |
| expiration_date | TIMESTAMP | | redemptions | When discount/boost expires | For discounts: activation_date + duration_minutes, For boosts: see commission_boost_redemptions.expires_at |
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

-- Composite unique constraint for sub-state table foreign keys
UNIQUE(id, client_id)  -- Allows redemptions(id, client_id) to be referenced by composite FKs
```

**Indexes:**
```sql
CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_tenant ON redemptions(client_id, user_id, status);
CREATE INDEX idx_redemptions_scheduled ON redemptions(scheduled_activation_date, scheduled_activation_time)
  WHERE scheduled_activation_date IS NOT NULL;
CREATE INDEX idx_redemptions_active_period ON redemptions(user_id, status, activation_date, expiration_date)
  WHERE activation_date IS NOT NULL AND expiration_date IS NOT NULL; -- Query active discounts/boosts
CREATE INDEX idx_redemptions_active ON redemptions(user_id, status, deleted_at)
  WHERE deleted_at IS NULL; -- Efficient queries for active (non-deleted) rewards
```

---

### 5. commission_boost_redemptions Table

**Purpose:** Sub-state table for Commission Boost rewards (6-state sub-schema)

**Foreign Key Design Note:**
This table includes `client_id` for **multi-tenant isolation** and Row-Level Security (RLS).
- ✅ Has `client_id` for database-level tenant filtering (critical for SaaS)
- ✅ Composite FK constraint ensures `client_id` matches parent `redemptions.client_id`
- ❌ No duplicate `user_id`, `reward_id` (access via redemption join)

**Query Pattern:**
```sql
-- Get boost with user/reward info (tenant-filtered)
SELECT cb.*, u.tiktok_handle, r.name
FROM commission_boost_redemptions cb
JOIN redemptions red ON cb.redemption_id = red.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE cb.boost_status = 'pending_payout'
  AND cb.client_id = $1;  -- Tenant isolation
```

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | commission_boost_redemptions | Sub-state record | |
| redemption_id | UUID | UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE | commission_boost_redemptions | FK to parent (ONE-TO-ONE) | |
| client_id | UUID | NOT NULL REFERENCES clients(id) | commission_boost_redemptions | Multi-tenant isolation | Required for RLS, constrained to match redemptions.client_id |
| boost_status | VARCHAR(50) | NOT NULL DEFAULT 'scheduled' | commission_boost_redemptions | Sub-state lifecycle | Options: 'scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid' |
| scheduled_activation_date | DATE | NOT NULL | commission_boost_redemptions | Date to activate | |
| activated_at | TIMESTAMP | | commission_boost_redemptions | Actual activation time | 6 PM EST |
| expires_at | TIMESTAMP | | commission_boost_redemptions | Expiration time | activated_at + duration_days |
| duration_days | INTEGER | NOT NULL DEFAULT 30 | commission_boost_redemptions | Boost duration | From reward config, locked at claim |
| boost_rate | DECIMAL(5,2) | NOT NULL | commission_boost_redemptions | Commission boost percentage | Locked at claim time (e.g., 5.00 = 5%) |
| tier_commission_rate | DECIMAL(5,2) | | commission_boost_redemptions | Tier base rate | For display purposes, locked at claim |
| sales_at_activation | DECIMAL(10,2) | | commission_boost_redemptions | GMV at D0 | |
| sales_at_expiration | DECIMAL(10,2) | | commission_boost_redemptions | GMV at DX | |
| sales_delta | DECIMAL(10,2) | GENERATED ALWAYS AS (GREATEST(0, sales_at_expiration - sales_at_activation)) STORED | commission_boost_redemptions | Calculated delta | Auto-calculated |
| calculated_commission | DECIMAL(10,2) | | commission_boost_redemptions | Auto-calculated payout | sales_delta * boost_rate |
| admin_adjusted_commission | DECIMAL(10,2) | | commission_boost_redemptions | Manual adjustment | If admin edits payout |
| final_payout_amount | DECIMAL(10,2) | | commission_boost_redemptions | Final amount to pay | Calculated or adjusted |
| payment_method | VARCHAR(20) | | commission_boost_redemptions | Payment platform | Options: 'venmo', 'paypal' |
| payment_account | VARCHAR(255) | | commission_boost_redemptions | Venmo handle or PayPal email | |
| payment_account_confirm | VARCHAR(255) | | commission_boost_redemptions | Double-entry verification | Must match payment_account |
| payment_info_collected_at | TIMESTAMP | | commission_boost_redemptions | When user submitted | |
| payment_info_confirmed | BOOLEAN | DEFAULT false | commission_boost_redemptions | Verification flag | |
| payout_sent_at | TIMESTAMP | | commission_boost_redemptions | When payment sent | |
| payout_sent_by | UUID | REFERENCES users(id) | commission_boost_redemptions | Which admin sent payment | |
| payout_notes | TEXT | | commission_boost_redemptions | Admin notes | Transaction ID, etc. |
| created_at | TIMESTAMP | DEFAULT NOW() | commission_boost_redemptions | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | commission_boost_redemptions | Audit | |

**boost_status Values:**
- `scheduled`: Boost scheduled, not yet active
- `active`: Boost running, tracking sales
- `expired`: Boost period ended, calculating payout
- `pending_info`: Waiting for payment info from creator
- `pending_payout`: Payment info received, admin needs to send payment
- `paid`: Payment sent (TERMINAL state)

**Auto-Sync Trigger:** Database trigger automatically updates `redemptions.status` when `boost_status` changes
- `scheduled/active/expired/pending_info` → redemptions.status = 'claimed'
- `pending_payout` → redemptions.status = 'fulfilled'
- `paid` → redemptions.status = 'concluded'

**Constraints:**
```sql
CONSTRAINT check_boost_status CHECK (
  boost_status IN ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid')
)

-- Composite FK to enforce client_id matching with parent redemption
FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
```

**Indexes:**
```sql
CREATE INDEX idx_boost_redemption ON commission_boost_redemptions(redemption_id);
CREATE INDEX idx_boost_status ON commission_boost_redemptions(boost_status);
CREATE INDEX idx_boost_scheduled ON commission_boost_redemptions(scheduled_activation_date);
CREATE INDEX idx_boost_tenant ON commission_boost_redemptions(client_id, boost_status);
```

---

### 6. commission_boost_state_history Table

**Purpose:** Audit trail for Commission Boost state transitions (SchemaDecisions Fix 8)

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | commission_boost_state_history | Audit record | |
| boost_redemption_id | UUID | NOT NULL REFERENCES commission_boost_redemptions(id) ON DELETE CASCADE | commission_boost_state_history | Which boost | |
| client_id | UUID | NOT NULL REFERENCES clients(id) | commission_boost_state_history | Multi-tenant isolation | Backfilled from commission_boost_redemptions |
| from_status | VARCHAR(50) | | commission_boost_state_history | Previous state | NULL for initial creation |
| to_status | VARCHAR(50) | | commission_boost_state_history | New state | |
| transitioned_at | TIMESTAMP | DEFAULT NOW() | commission_boost_state_history | When transition occurred | |
| transitioned_by | UUID | REFERENCES users(id) | commission_boost_state_history | Which admin/user | NULL if automated (cron) |
| transition_type | VARCHAR(50) | | commission_boost_state_history | How transition happened | Options: 'manual', 'cron', 'api' |
| notes | TEXT | | commission_boost_state_history | Optional context | Admin notes, error messages |
| metadata | JSONB | | commission_boost_state_history | Extra context | Payment amounts, error details, etc. |

**Purpose:**
- Financial compliance: PayPal/Venmo audit trail
- Debugging: Trace exact state flow for payment issues
- User disputes: Definitive proof of state transitions
- Analytics: Measure transition times, identify bottlenecks

**Auto-populated by trigger:** Database trigger automatically logs all commission boost status changes (see Loyalty.md Pattern 7)

**Indexes:**
```sql
CREATE INDEX idx_boost_history_redemption
  ON commission_boost_state_history(boost_redemption_id, transitioned_at);

CREATE INDEX idx_boost_history_transitioned_by
  ON commission_boost_state_history(transitioned_by)
  WHERE transitioned_by IS NOT NULL;
```

**Database Trigger:**
```sql
-- Automatically log all commission boost state transitions
CREATE OR REPLACE FUNCTION log_boost_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.boost_status IS DISTINCT FROM NEW.boost_status THEN
    INSERT INTO commission_boost_state_history (
      boost_redemption_id,
      from_status,
      to_status,
      transitioned_by,
      transition_type
    )
    VALUES (
      NEW.id,
      OLD.boost_status,
      NEW.boost_status,
      NULLIF(current_setting('app.current_user_id', true), '')::UUID,
      CASE
        WHEN current_setting('app.current_user_id', true) = '' THEN 'cron'
        ELSE 'manual'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_boost_transitions
  AFTER UPDATE ON commission_boost_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION log_boost_transition();
```

---

### 7. physical_gift_redemptions Table

**Purpose:** Sub-state table for Physical Gift rewards (size & shipping info)

**Foreign Key Design Note:**
This table includes `client_id` for **multi-tenant isolation** and Row-Level Security (RLS).
- ✅ Has `client_id` for database-level tenant filtering (critical for SaaS)
- ✅ Composite FK constraint ensures `client_id` matches parent `redemptions.client_id`
- ❌ No duplicate `user_id`, `reward_id` (access via redemption join)

**Query Pattern:**
```sql
-- Get unshipped gifts with user address (tenant-filtered)
SELECT pgr.*, u.tiktok_handle, r.description
FROM physical_gift_redemptions pgr
JOIN redemptions red ON pgr.redemption_id = red.id
JOIN users u ON red.user_id = u.id
JOIN rewards r ON red.reward_id = r.id
WHERE pgr.shipped_at IS NULL
  AND pgr.client_id = $1;  -- Tenant isolation
```

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | physical_gift_redemptions | Sub-state record | |
| redemption_id | UUID | UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE | physical_gift_redemptions | FK to parent (ONE-TO-ONE) | |
| client_id | UUID | NOT NULL REFERENCES clients(id) | physical_gift_redemptions | Multi-tenant isolation | Required for RLS, constrained to match redemptions.client_id |
| requires_size | BOOLEAN | DEFAULT false | physical_gift_redemptions | Does gift need size? | Set based on reward config |
| size_category | VARCHAR(50) | | physical_gift_redemptions | Type of size | Options: 'clothing', 'shoes', NULL |
| size_value | VARCHAR(20) | | physical_gift_redemptions | User's selected size | e.g., 'S', 'M', 'L', 'XL', '8', '9.5' |
| size_submitted_at | TIMESTAMP | | physical_gift_redemptions | When user selected size | |
| shipping_recipient_first_name | VARCHAR(100) | NOT NULL | physical_gift_redemptions | Recipient first name | Required for carrier delivery |
| shipping_recipient_last_name | VARCHAR(100) | NOT NULL | physical_gift_redemptions | Recipient last name | Required for carrier delivery |
| shipping_address_line1 | VARCHAR(255) | NOT NULL | physical_gift_redemptions | Street address | Required for all physical gifts |
| shipping_address_line2 | VARCHAR(255) | | physical_gift_redemptions | Apt, suite, unit | |
| shipping_city | VARCHAR(100) | NOT NULL | physical_gift_redemptions | City | |
| shipping_state | VARCHAR(100) | NOT NULL | physical_gift_redemptions | State/Province | |
| shipping_postal_code | VARCHAR(20) | NOT NULL | physical_gift_redemptions | ZIP/Postal code | |
| shipping_country | VARCHAR(100) | DEFAULT 'USA' | physical_gift_redemptions | Country | |
| shipping_phone | VARCHAR(50) | | physical_gift_redemptions | Contact phone | |
| shipping_info_submitted_at | TIMESTAMP | NOT NULL | physical_gift_redemptions | When user submitted address | |
| tracking_number | VARCHAR(100) | | physical_gift_redemptions | Carrier tracking number | Admin populates |
| carrier | VARCHAR(50) | | physical_gift_redemptions | Shipping carrier | Options: 'FedEx', 'UPS', 'USPS', 'DHL' |
| shipped_at | TIMESTAMP | | physical_gift_redemptions | When admin marked shipped | |
| delivered_at | TIMESTAMP | | physical_gift_redemptions | When package delivered | |
| created_at | TIMESTAMP | DEFAULT NOW() | physical_gift_redemptions | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | physical_gift_redemptions | Audit | |

**Constraints:**
```sql
CONSTRAINT check_size_required CHECK (
  (requires_size = false) OR
  (requires_size = true AND size_category IS NOT NULL AND size_value IS NOT NULL)
)

-- Composite FK to enforce client_id matching with parent redemption
FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
```

**Indexes:**
```sql
CREATE INDEX idx_physical_gift_redemption ON physical_gift_redemptions(redemption_id);
CREATE INDEX idx_physical_gift_shipped ON physical_gift_redemptions(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX idx_physical_gift_pending ON physical_gift_redemptions(created_at) WHERE shipped_at IS NULL;
```

---

### 8. raffle_participations Table

**Purpose:** Sub-state table for Raffle missions (participation & winner selection)

**Foreign Key Design Note:**
This table includes `client_id` for **multi-tenant isolation** and Row-Level Security (RLS).
- ✅ Has `client_id` for database-level tenant filtering (critical for SaaS)
- ✅ Has `user_id` for direct user queries and UNIQUE constraint (ONE-TO-MANY relationship)
- ✅ Composite FK constraint ensures `client_id` matches parent `redemptions.client_id`

**Why raffle_participations HAS user_id (unlike reward sub-states):**
- Reward sub-states (commission_boost, physical_gift) extend `redemptions` (ONE-TO-ONE, user_id redundant)
- Mission sub-states (raffle_participations) extend `missions` (ONE-TO-MANY, user_id required)
- UNIQUE constraint needs it: `UNIQUE(mission_id, user_id)` prevents duplicate participation

**Query Pattern:**
```sql
-- Get raffle participants with user info (tenant-filtered)
SELECT rp.*, u.tiktok_handle, m.raffle_prize_name
FROM raffle_participations rp
JOIN users u ON rp.user_id = u.id
JOIN missions m ON rp.mission_id = m.id
WHERE rp.is_winner IS NULL  -- Not yet selected
  AND rp.client_id = $1;  -- Tenant isolation
```

| Attributes (Column) | Data Type | Constraints / Default | Type | Purpose | Comments |
|---------------------|-----------|----------------------|------|---------|----------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | raffle_participations | Sub-state record | |
| mission_id | UUID | NOT NULL REFERENCES missions(id) ON DELETE CASCADE | raffle_participations | Which raffle mission | |
| user_id | UUID | NOT NULL REFERENCES users(id) ON DELETE CASCADE | raffle_participations | Which user participated | Required for UNIQUE constraint |
| mission_progress_id | UUID | NOT NULL REFERENCES mission_progress(id) ON DELETE CASCADE | raffle_participations | FK to mission progress | |
| redemption_id | UUID | NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE | raffle_participations | FK to redemption (claimable) | |
| client_id | UUID | NOT NULL REFERENCES clients(id) | raffle_participations | Multi-tenant isolation | Required for RLS, constrained to match redemptions.client_id |
| participated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | raffle_participations | When user clicked "Participate" | |
| is_winner | BOOLEAN | | raffle_participations | Winner selection status | NULL = not picked, TRUE = won, FALSE = lost |
| winner_selected_at | TIMESTAMP | | raffle_participations | When admin selected winner | |
| selected_by | UUID | REFERENCES users(id) | raffle_participations | Which admin selected | Audit trail |
| created_at | TIMESTAMP | DEFAULT NOW() | raffle_participations | Audit | |
| updated_at | TIMESTAMP | DEFAULT NOW() | raffle_participations | Audit | |

**is_winner Values:**
- `NULL`: Winner not yet selected
- `TRUE`: User won the raffle
- `FALSE`: User lost the raffle

**Constraints:**
```sql
UNIQUE(mission_id, user_id) -- One entry per raffle per user

CHECK (
  (is_winner IS NULL AND winner_selected_at IS NULL) OR
  (is_winner IS NOT NULL AND winner_selected_at IS NOT NULL)
)

-- Composite FK to enforce client_id matching with parent redemption
FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
```

**Indexes:**
```sql
CREATE INDEX idx_raffle_mission ON raffle_participations(mission_id, is_winner);
CREATE INDEX idx_raffle_user ON raffle_participations(user_id, mission_id);
CREATE INDEX idx_raffle_winner ON raffle_participations(is_winner, winner_selected_at) WHERE is_winner = true;
CREATE INDEX idx_raffle_redemption ON raffle_participations(redemption_id);
```

---



## SECTION 3: Domains

**Domain 1: System Configuration**
- clients (Loyalty.md)
- tiers (Loyalty.md)

**Domain 2: User Management**
- users (Loyalty.md)
- handle_changes (Loyalty.md)

**Domain 3: Performance Tracking**
- videos (Loyalty.md)
- sales_adjustments (Loyalty.md)

**Domain 4: Tier System**
- tier_checkpoints (Loyalty.md)

**Domain 5: Missions**
- missions (SchemaFinal.md) - **UPDATED**: Added target_unit field for VIP metric flexibility
- mission_progress (SchemaFinal.md)

**Domain 6: Rewards**
- rewards (SchemaFinal.md)
- redemptions (SchemaFinal.md with modifications from Phase 3)

**Domain 7: Reward Sub-States**
- commission_boost_redemptions (SchemaFinal.md)
- commission_boost_state_history (SchemaFinal.md)
- physical_gift_redemptions (SchemaFinal.md)
- raffle_participations (SchemaFinal.md)