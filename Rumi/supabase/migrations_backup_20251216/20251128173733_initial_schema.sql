-- =============================================
-- RUMI LOYALTY PLATFORM - INITIAL SCHEMA
-- Generated from SchemaFinalv2.md
-- =============================================

-- Note: SchemaFinalv2.md uses VARCHAR(50) with CHECK constraints
-- instead of PostgreSQL ENUMs for flexibility during MVP phase.
-- CHECK constraints will be added per-table in subsequent tasks.

-- =============================================
-- 1.1 clients Table
-- Multi-tenant configuration (single client for MVP, scalable to multiple)
-- Reference: SchemaFinalv2.md lines 106-120
-- =============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    tier_calculation_mode VARCHAR(50) DEFAULT 'fixed_checkpoint'
        CHECK (tier_calculation_mode IN ('fixed_checkpoint', 'lifetime')),
    checkpoint_months INTEGER DEFAULT 4,
    vip_metric VARCHAR(10) NOT NULL DEFAULT 'units'
        CHECK (vip_metric IN ('units', 'sales')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 1.6 tiers Table
-- Dynamic tier configuration (3-6 tiers per client, admin-customizable)
-- Reference: SchemaFinalv2.md lines 250-268
-- =============================================

CREATE TABLE tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    tier_order INTEGER NOT NULL,
    tier_id VARCHAR(50) NOT NULL,
    tier_name VARCHAR(100) NOT NULL,
    tier_color VARCHAR(7) NOT NULL,
    sales_threshold DECIMAL(10, 2),
    units_threshold INTEGER,
    commission_rate DECIMAL(5, 2) NOT NULL,
    checkpoint_exempt BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, tier_order),
    UNIQUE(client_id, tier_id)
);

-- =============================================
-- 1.2 users Table
-- Content creator profiles and performance tracking
-- Reference: SchemaFinalv2.md lines 123-155
-- Note: 16 precomputed fields added in Task 1.1.5a
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    tiktok_handle VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    password_hash VARCHAR(255) NOT NULL,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    terms_version VARCHAR(50),
    is_admin BOOLEAN DEFAULT false,
    current_tier VARCHAR(50) DEFAULT 'tier_1',
    tier_achieved_at TIMESTAMP WITH TIME ZONE,
    next_checkpoint_at TIMESTAMP WITH TIME ZONE,
    checkpoint_sales_target DECIMAL(10, 2),
    checkpoint_units_target INTEGER,
    -- Payment info fields (3 fields)
    default_payment_method VARCHAR(20)
        CHECK (default_payment_method IN ('paypal', 'venmo')),
    default_payment_account VARCHAR(255),
    payment_info_updated_at TIMESTAMP WITH TIME ZONE,
    -- Precomputed fields: Leaderboard (5 fields)
    leaderboard_rank INTEGER,
    total_sales DECIMAL(10, 2),
    total_units INTEGER,
    manual_adjustments_total DECIMAL(10, 2),
    manual_adjustments_units INTEGER,
    -- Precomputed fields: Checkpoint progress (3 fields)
    checkpoint_sales_current DECIMAL(10, 2),
    checkpoint_units_current INTEGER,
    projected_tier_at_checkpoint UUID,
    -- Precomputed fields: Engagement (4 fields)
    checkpoint_videos_posted INTEGER,
    checkpoint_total_views BIGINT,
    checkpoint_total_likes BIGINT,
    checkpoint_total_comments BIGINT,
    -- Precomputed fields: Next tier (3 fields)
    next_tier_name VARCHAR(100),
    next_tier_threshold DECIMAL(10, 2),
    next_tier_threshold_units INTEGER,
    -- Precomputed fields: Historical (1 field)
    checkpoint_progress_updated_at TIMESTAMP WITH TIME ZONE,
    -- Other fields
    first_video_date TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 1.3 otp_codes Table
-- Email verification via one-time passwords during signup
-- Reference: SchemaFinalv2.md lines 158-176
-- =============================================

CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL UNIQUE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_otp_session ON otp_codes(session_id);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- =============================================
-- 1.4 password_reset_tokens Table
-- Secure password reset via email magic links
-- Reference: SchemaFinalv2.md lines 187-219
-- =============================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45)
);

CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);

-- =============================================
-- 1.5 videos Table
-- Per-video analytics from Cruva CSV (videos.csv)
-- Reference: SchemaFinalv2.md lines 223-247
-- =============================================

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    video_url TEXT UNIQUE NOT NULL,
    video_title TEXT,
    post_date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    gmv DECIMAL(10, 2) DEFAULT 0,
    ctr DECIMAL(5, 2),
    units_sold INTEGER DEFAULT 0,
    sync_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 1.7 sales_adjustments Table
-- Manual sales corrections (offline sales, refunds, bonuses)
-- Reference: SchemaFinalv2.md lines 271-286
-- =============================================

CREATE TABLE sales_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    amount DECIMAL(10, 2),
    amount_units INTEGER,
    reason TEXT NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL
        CHECK (adjustment_type IN ('manual_sale', 'refund', 'bonus', 'correction')),
    adjusted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 1.8 tier_checkpoints Table
-- Audit trail for tier maintenance evaluations
-- Reference: SchemaFinalv2.md lines 289-308
-- =============================================

CREATE TABLE tier_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    checkpoint_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sales_in_period DECIMAL(10, 2),
    sales_required DECIMAL(10, 2),
    units_in_period INTEGER,
    units_required INTEGER,
    tier_before VARCHAR(50) NOT NULL,
    tier_after VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL
        CHECK (status IN ('maintained', 'promoted', 'demoted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 1.9 handle_changes Table
-- Audit trail for TikTok handle changes
-- Reference: SchemaFinalv2.md lines 311-325
-- =============================================

CREATE TABLE handle_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    old_handle VARCHAR(100) NOT NULL,
    new_handle VARCHAR(100) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 1.10 sync_logs Table
-- Track automated and manual data sync operations from Cruva
-- Reference: SchemaFinalv2.md lines 328-352
-- =============================================

CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    status VARCHAR(50) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'failed')),
    source VARCHAR(50) NOT NULL DEFAULT 'auto'
        CHECK (source IN ('auto', 'manual')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    file_name VARCHAR(255),
    triggered_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_client ON sync_logs(client_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(client_id, status);
CREATE INDEX idx_sync_logs_recent ON sync_logs(client_id, started_at DESC);

-- =============================================
-- SECTION 2: Missions | Rewards | Reward Sub-states
-- =============================================

-- =============================================
-- 3. rewards Table (created before missions for FK dependency)
-- Admin-configured reward templates
-- Reference: SchemaFinalv2.md lines 458-586
-- =============================================

CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL
        CHECK (type IN ('gift_card', 'commission_boost', 'spark_ads', 'discount', 'physical_gift', 'experience')),
    name VARCHAR(255),
    description VARCHAR(12),
    value_data JSONB,
    reward_source VARCHAR(50) NOT NULL DEFAULT 'mission'
        CHECK (reward_source IN ('vip_tier', 'mission')),
    tier_eligibility VARCHAR(50) NOT NULL
        CHECK (tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')),
    enabled BOOLEAN DEFAULT false,
    preview_from_tier VARCHAR(50)
        CHECK (preview_from_tier IS NULL OR preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')),
    redemption_frequency VARCHAR(50) DEFAULT 'unlimited'
        CHECK (redemption_frequency IN ('one-time', 'monthly', 'weekly', 'unlimited')),
    redemption_quantity INTEGER DEFAULT 1,
    redemption_type VARCHAR(50) NOT NULL DEFAULT 'instant'
        CHECK (redemption_type IN ('instant', 'scheduled')),
    expires_days INTEGER,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint: quantity must be NULL for unlimited, 1-10 otherwise
    CONSTRAINT check_quantity_with_frequency CHECK (
        (redemption_frequency = 'unlimited' AND redemption_quantity IS NULL) OR
        (redemption_frequency != 'unlimited' AND redemption_quantity >= 1 AND redemption_quantity <= 10)
    ),
    -- Constraint: discount type must have valid value_data
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
);

CREATE INDEX idx_rewards_client ON rewards(client_id);
CREATE INDEX idx_rewards_type ON rewards(type);
CREATE INDEX idx_rewards_tier ON rewards(tier_eligibility);
CREATE INDEX idx_rewards_source ON rewards(reward_source);
CREATE INDEX idx_rewards_lookup ON rewards(client_id, enabled, tier_eligibility, reward_source, display_order);

-- =============================================
-- 1. missions Table
-- Mission templates (goals/targets configured by admin)
-- Reference: SchemaFinalv2.md lines 358-417
-- =============================================

CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    mission_type VARCHAR(50) NOT NULL
        CHECK (mission_type IN ('sales_dollars', 'sales_units', 'videos', 'views', 'likes', 'raffle')),
    target_value INTEGER NOT NULL,
    target_unit VARCHAR(20) NOT NULL DEFAULT 'dollars'
        CHECK (target_unit IN ('dollars', 'units', 'count')),
    reward_id UUID NOT NULL REFERENCES rewards(id),
    tier_eligibility VARCHAR(50) NOT NULL
        CHECK (tier_eligibility = 'all' OR tier_eligibility IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')),
    preview_from_tier VARCHAR(50)
        CHECK (preview_from_tier IS NULL OR preview_from_tier IN ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6')),
    display_order INTEGER NOT NULL,
    raffle_end_date TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    activated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraint: raffle must have end date and target_value=0
    CONSTRAINT check_raffle_requirements CHECK (
        (mission_type != 'raffle') OR
        (mission_type = 'raffle' AND raffle_end_date IS NOT NULL AND target_value = 0)
    ),
    -- Constraint: non-raffle must not have raffle_end_date
    CONSTRAINT check_non_raffle_fields CHECK (
        (mission_type = 'raffle') OR
        (mission_type != 'raffle' AND raffle_end_date IS NULL)
    ),
    UNIQUE(client_id, tier_eligibility, mission_type, display_order)
);

CREATE INDEX idx_missions_client ON missions(client_id);
CREATE INDEX idx_missions_tier ON missions(tier_eligibility);
CREATE INDEX idx_missions_lookup ON missions(client_id, enabled, tier_eligibility, display_order);

-- =============================================
-- 2. mission_progress Table
-- User progress on missions
-- Reference: SchemaFinalv2.md lines 421-455
-- =============================================

CREATE TABLE mission_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    current_value INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active'
        CHECK (status IN ('active', 'dormant', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    checkpoint_start TIMESTAMP WITH TIME ZONE,
    checkpoint_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, mission_id, checkpoint_start)
);

CREATE INDEX idx_mission_progress_user ON mission_progress(user_id);
CREATE INDEX idx_mission_progress_status ON mission_progress(status);
CREATE INDEX idx_mission_progress_tenant ON mission_progress(client_id, user_id, status);

-- =============================================
-- 4. redemptions Table
-- Tracks claims for both rewards AND missions (shared table)
-- Reference: SchemaFinalv2.md lines 590-658
-- =============================================

CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES rewards(id) ON DELETE CASCADE,
    mission_progress_id UUID REFERENCES mission_progress(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'claimable'
        CHECK (status IN ('claimable', 'claimed', 'fulfilled', 'concluded', 'rejected')),
    tier_at_claim VARCHAR(50) NOT NULL,
    redemption_type VARCHAR(50) NOT NULL
        CHECK (redemption_type IN ('instant', 'scheduled')),
    claimed_at TIMESTAMP WITH TIME ZONE,
    scheduled_activation_date DATE,
    scheduled_activation_time TIME,
    activation_date TIMESTAMP WITH TIME ZONE,
    expiration_date TIMESTAMP WITH TIME ZONE,
    google_calendar_event_id VARCHAR(255),
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    fulfilled_by UUID REFERENCES users(id),
    fulfillment_notes TEXT,
    concluded_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    rejected_at TIMESTAMP WITH TIME ZONE,
    external_transaction_id VARCHAR(255),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_reason VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Composite unique for sub-state table FKs
    UNIQUE(id, client_id)
);

-- Partial unique index for VIP tier rewards
CREATE UNIQUE INDEX idx_redemptions_unique_vip ON redemptions(user_id, reward_id, tier_at_claim, claimed_at)
    WHERE claimed_at IS NOT NULL;

-- Partial unique index for mission-based redemptions
CREATE UNIQUE INDEX idx_redemptions_unique_mission ON redemptions(user_id, mission_progress_id)
    WHERE mission_progress_id IS NOT NULL;

CREATE INDEX idx_redemptions_user ON redemptions(user_id);
CREATE INDEX idx_redemptions_reward ON redemptions(reward_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_redemptions_tenant ON redemptions(client_id, user_id, status);
CREATE INDEX idx_redemptions_scheduled ON redemptions(scheduled_activation_date, scheduled_activation_time)
    WHERE scheduled_activation_date IS NOT NULL;
CREATE INDEX idx_redemptions_active_period ON redemptions(user_id, status, activation_date, expiration_date)
    WHERE activation_date IS NOT NULL AND expiration_date IS NOT NULL;
CREATE INDEX idx_redemptions_active ON redemptions(user_id, status, deleted_at)
    WHERE deleted_at IS NULL;

-- =============================================
-- 8. raffle_participations Table
-- Sub-state table for Raffle missions (participation & winner selection)
-- Reference: SchemaFinalv2.md lines 888-953
-- =============================================

CREATE TABLE raffle_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_progress_id UUID NOT NULL REFERENCES mission_progress(id) ON DELETE CASCADE,
    redemption_id UUID NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    participated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_winner BOOLEAN,
    winner_selected_at TIMESTAMP WITH TIME ZONE,
    selected_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- One entry per raffle per user
    UNIQUE(mission_id, user_id),
    -- is_winner and winner_selected_at must both be NULL or both NOT NULL
    CONSTRAINT check_winner_consistency CHECK (
        (is_winner IS NULL AND winner_selected_at IS NULL) OR
        (is_winner IS NOT NULL AND winner_selected_at IS NOT NULL)
    ),
    -- Composite FK to enforce client_id matching with parent redemption
    FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
);

CREATE INDEX idx_raffle_mission ON raffle_participations(mission_id, is_winner);
CREATE INDEX idx_raffle_user ON raffle_participations(user_id, mission_id);
CREATE INDEX idx_raffle_winner ON raffle_participations(is_winner, winner_selected_at) WHERE is_winner = true;
CREATE INDEX idx_raffle_redemption ON raffle_participations(redemption_id);

-- =============================================
-- 5. commission_boost_redemptions Table
-- Sub-state table for Commission Boost rewards (6-state sub-schema)
-- Reference: SchemaFinalv2.md lines 662-742
-- =============================================

CREATE TABLE commission_boost_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    boost_status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
        CHECK (boost_status IN ('scheduled', 'active', 'expired', 'pending_info', 'pending_payout', 'paid')),
    scheduled_activation_date DATE NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    duration_days INTEGER NOT NULL DEFAULT 30,
    boost_rate DECIMAL(5, 2) NOT NULL,
    tier_commission_rate DECIMAL(5, 2),
    sales_at_activation DECIMAL(10, 2),
    sales_at_expiration DECIMAL(10, 2),
    sales_delta DECIMAL(10, 2) GENERATED ALWAYS AS (GREATEST(0, sales_at_expiration - sales_at_activation)) STORED,
    calculated_commission DECIMAL(10, 2),
    admin_adjusted_commission DECIMAL(10, 2),
    final_payout_amount DECIMAL(10, 2),
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('venmo', 'paypal')),
    payment_account VARCHAR(255),
    payment_account_confirm VARCHAR(255),
    payment_info_collected_at TIMESTAMP WITH TIME ZONE,
    payment_info_confirmed BOOLEAN DEFAULT false,
    payout_sent_at TIMESTAMP WITH TIME ZONE,
    payout_sent_by UUID REFERENCES users(id),
    payout_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Composite FK to enforce client_id matching with parent redemption
    FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
);

CREATE INDEX idx_boost_redemption ON commission_boost_redemptions(redemption_id);
CREATE INDEX idx_boost_status ON commission_boost_redemptions(boost_status);
CREATE INDEX idx_boost_scheduled ON commission_boost_redemptions(scheduled_activation_date);
CREATE INDEX idx_boost_tenant ON commission_boost_redemptions(client_id, boost_status);

-- =============================================
-- 6. commission_boost_state_history Table
-- Audit trail for Commission Boost state transitions
-- Reference: SchemaFinalv2.md lines 746-779
-- =============================================

CREATE TABLE commission_boost_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boost_redemption_id UUID NOT NULL REFERENCES commission_boost_redemptions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transitioned_by UUID REFERENCES users(id),
    transition_type VARCHAR(50)
        CHECK (transition_type IN ('manual', 'cron', 'api')),
    notes TEXT,
    metadata JSONB
);

CREATE INDEX idx_boost_history_redemption ON commission_boost_state_history(boost_redemption_id, transitioned_at);
CREATE INDEX idx_boost_history_transitioned_by ON commission_boost_state_history(transitioned_by)
    WHERE transitioned_by IS NOT NULL;

-- =============================================
-- 7. physical_gift_redemptions Table
-- Sub-state table for Physical Gift rewards (size & shipping info)
-- Reference: SchemaFinalv2.md lines 820-884
-- =============================================

CREATE TABLE physical_gift_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id UUID UNIQUE NOT NULL REFERENCES redemptions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    requires_size BOOLEAN DEFAULT false,
    size_category VARCHAR(50)
        CHECK (size_category IS NULL OR size_category IN ('clothing', 'shoes')),
    size_value VARCHAR(20),
    size_submitted_at TIMESTAMP WITH TIME ZONE,
    shipping_recipient_first_name VARCHAR(100) NOT NULL,
    shipping_recipient_last_name VARCHAR(100) NOT NULL,
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_state VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20) NOT NULL,
    shipping_country VARCHAR(100) DEFAULT 'USA',
    shipping_phone VARCHAR(50),
    shipping_info_submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tracking_number VARCHAR(100),
    carrier VARCHAR(50)
        CHECK (carrier IS NULL OR carrier IN ('FedEx', 'UPS', 'USPS', 'DHL')),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Size must be provided if required
    CONSTRAINT check_size_required CHECK (
        (requires_size = false) OR
        (requires_size = true AND size_category IS NOT NULL AND size_value IS NOT NULL)
    ),
    -- Composite FK to enforce client_id matching with parent redemption
    FOREIGN KEY (redemption_id, client_id) REFERENCES redemptions(id, client_id)
);

CREATE INDEX idx_physical_gift_redemption ON physical_gift_redemptions(redemption_id);
CREATE INDEX idx_physical_gift_shipped ON physical_gift_redemptions(shipped_at) WHERE shipped_at IS NOT NULL;
CREATE INDEX idx_physical_gift_pending ON physical_gift_redemptions(created_at) WHERE shipped_at IS NULL;

-- =============================================
-- Additional Performance Indexes
-- Reference: ARCHITECTURE.md Section 3.3, Task 1.4.1-1.4.2
-- =============================================

-- Users table: multi-tenant and leaderboard optimization
CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_tiktok_handle ON users(client_id, tiktok_handle);
CREATE INDEX idx_users_leaderboard_rank ON users(client_id, leaderboard_rank) WHERE leaderboard_rank IS NOT NULL;
CREATE INDEX idx_users_total_sales ON users(client_id, total_sales DESC) WHERE total_sales IS NOT NULL;
CREATE INDEX idx_users_total_units ON users(client_id, total_units DESC) WHERE total_units IS NOT NULL;

-- Videos table: user lookup and date filtering
CREATE INDEX idx_videos_user ON videos(user_id);
CREATE INDEX idx_videos_client ON videos(client_id);
CREATE INDEX idx_videos_post_date ON videos(user_id, post_date);

-- Tiers table: client lookup
CREATE INDEX idx_tiers_client ON tiers(client_id);

-- Sales adjustments: user and client lookup
CREATE INDEX idx_sales_adjustments_user ON sales_adjustments(user_id);
CREATE INDEX idx_sales_adjustments_client ON sales_adjustments(client_id);

-- Tier checkpoints: user and client lookup
CREATE INDEX idx_tier_checkpoints_user ON tier_checkpoints(user_id);
CREATE INDEX idx_tier_checkpoints_client ON tier_checkpoints(client_id);

-- Handle changes: user lookup
CREATE INDEX idx_handle_changes_user ON handle_changes(user_id);

-- =============================================
-- SECTION 3: Row Level Security (RLS)
-- Reference: Loyalty.md lines 173-183
-- Roles: Creator (read own), System (automation), Admin (full access)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE handle_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_boost_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_boost_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_gift_redemptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Creator Policies (read own data, limited writes)
-- Uses auth.uid() to match user_id
-- =============================================

-- Creators can read their own user record
CREATE POLICY "creators_read_own_user" ON users
    FOR SELECT USING (id = auth.uid());

-- Creators can update their own user record (email, payment info, etc.)
CREATE POLICY "creators_update_own_user" ON users
    FOR UPDATE USING (id = auth.uid());

-- Creators can read client config (for branding)
CREATE POLICY "creators_read_client" ON clients
    FOR SELECT USING (
        id IN (SELECT client_id FROM users WHERE id = auth.uid())
    );

-- Creators can read tiers (for tier display)
CREATE POLICY "creators_read_tiers" ON tiers
    FOR SELECT USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    );

-- Creators can read their own videos
CREATE POLICY "creators_read_own_videos" ON videos
    FOR SELECT USING (user_id = auth.uid());

-- Creators can read rewards (for rewards catalog)
CREATE POLICY "creators_read_rewards" ON rewards
    FOR SELECT USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
        AND enabled = true
    );

-- Creators can read missions (for missions list)
CREATE POLICY "creators_read_missions" ON missions
    FOR SELECT USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
        AND enabled = true
    );

-- Creators can read their own mission progress
CREATE POLICY "creators_read_own_mission_progress" ON mission_progress
    FOR SELECT USING (user_id = auth.uid());

-- Creators can read their own redemptions
CREATE POLICY "creators_read_own_redemptions" ON redemptions
    FOR SELECT USING (user_id = auth.uid());

-- Creators can update their own redemptions (claim action)
CREATE POLICY "creators_update_own_redemptions" ON redemptions
    FOR UPDATE USING (user_id = auth.uid());

-- Creators can read their own raffle participations
CREATE POLICY "creators_read_own_raffle_participations" ON raffle_participations
    FOR SELECT USING (user_id = auth.uid());

-- Creators can insert raffle participations (participate action)
CREATE POLICY "creators_insert_raffle_participations" ON raffle_participations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Creators can read their own commission boost redemptions (via redemption join)
CREATE POLICY "creators_read_own_boost_redemptions" ON commission_boost_redemptions
    FOR SELECT USING (
        redemption_id IN (SELECT id FROM redemptions WHERE user_id = auth.uid())
    );

-- Creators can update their own boost redemptions (payment info submission)
CREATE POLICY "creators_update_own_boost_redemptions" ON commission_boost_redemptions
    FOR UPDATE USING (
        redemption_id IN (SELECT id FROM redemptions WHERE user_id = auth.uid())
    );

-- Creators can read their own physical gift redemptions
CREATE POLICY "creators_read_own_physical_gift_redemptions" ON physical_gift_redemptions
    FOR SELECT USING (
        redemption_id IN (SELECT id FROM redemptions WHERE user_id = auth.uid())
    );

-- Creators can update their own physical gift redemptions (shipping info)
CREATE POLICY "creators_update_own_physical_gift_redemptions" ON physical_gift_redemptions
    FOR UPDATE USING (
        redemption_id IN (SELECT id FROM redemptions WHERE user_id = auth.uid())
    );

-- =============================================
-- Admin Policies (full access within client)
-- Admins identified by is_admin = true in users table
-- =============================================

-- Admin full access to all tables (client-scoped)
CREATE POLICY "admin_full_access_clients" ON clients
    FOR ALL USING (
        id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_users" ON users
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_tiers" ON tiers
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_videos" ON videos
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_sales_adjustments" ON sales_adjustments
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_tier_checkpoints" ON tier_checkpoints
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_handle_changes" ON handle_changes
    FOR ALL USING (
        user_id IN (SELECT id FROM users WHERE client_id IN (
            SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true
        ))
    );

CREATE POLICY "admin_full_access_sync_logs" ON sync_logs
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_rewards" ON rewards
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_missions" ON missions
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_mission_progress" ON mission_progress
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_redemptions" ON redemptions
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_raffle_participations" ON raffle_participations
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_boost_redemptions" ON commission_boost_redemptions
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_boost_history" ON commission_boost_state_history
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

CREATE POLICY "admin_full_access_physical_gift_redemptions" ON physical_gift_redemptions
    FOR ALL USING (
        client_id IN (SELECT client_id FROM users WHERE id = auth.uid() AND is_admin = true)
    );

-- =============================================
-- Service Role Policies (for automation/cron jobs)
-- Service role bypasses RLS by default in Supabase
-- These policies are for completeness if using anon key with elevated perms
-- =============================================

-- OTP codes: system can manage (for signup flow)
CREATE POLICY "system_manage_otp_codes" ON otp_codes
    FOR ALL USING (true);

-- Password reset tokens: system can manage
CREATE POLICY "system_manage_password_reset_tokens" ON password_reset_tokens
    FOR ALL USING (true);

-- =============================================
-- SECTION 4: Triggers
-- Reference: SchemaFinalv2.md lines 721-724, 781-816
-- =============================================

-- =============================================
-- Trigger 1: Auto-sync commission boost status to redemptions
-- When boost_status changes, update parent redemptions.status
-- Reference: SchemaFinalv2.md lines 721-724
-- =============================================

CREATE OR REPLACE FUNCTION sync_boost_to_redemption()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if boost_status actually changed
    IF OLD.boost_status IS DISTINCT FROM NEW.boost_status THEN
        UPDATE redemptions
        SET
            status = CASE
                WHEN NEW.boost_status IN ('scheduled', 'active', 'expired', 'pending_info') THEN 'claimed'
                WHEN NEW.boost_status = 'pending_payout' THEN 'fulfilled'
                WHEN NEW.boost_status = 'paid' THEN 'concluded'
                ELSE status  -- No change for unknown states
            END,
            updated_at = NOW()
        WHERE id = NEW.redemption_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_boost_status
    AFTER UPDATE ON commission_boost_redemptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_boost_to_redemption();

-- =============================================
-- Trigger 2: Log commission boost state transitions
-- Audit trail for financial compliance
-- Reference: SchemaFinalv2.md lines 781-816
-- =============================================

CREATE OR REPLACE FUNCTION log_boost_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.boost_status IS DISTINCT FROM NEW.boost_status THEN
        INSERT INTO commission_boost_state_history (
            boost_redemption_id,
            client_id,
            from_status,
            to_status,
            transitioned_by,
            transition_type
        )
        VALUES (
            NEW.id,
            NEW.client_id,
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

-- =============================================
-- Trigger 3: Updated_at auto-update
-- Automatically update updated_at on row changes
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables with updated_at column
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tiers_updated_at
    BEFORE UPDATE ON tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_mission_progress_updated_at
    BEFORE UPDATE ON mission_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_redemptions_updated_at
    BEFORE UPDATE ON redemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_raffle_participations_updated_at
    BEFORE UPDATE ON raffle_participations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_commission_boost_redemptions_updated_at
    BEFORE UPDATE ON commission_boost_redemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_physical_gift_redemptions_updated_at
    BEFORE UPDATE ON physical_gift_redemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
