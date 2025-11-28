-- =============================================
-- RUMI LOYALTY PLATFORM - SEED DATA
-- For development and testing
-- =============================================

-- =============================================
-- 1. CLIENT (Base Test Client)
-- vip_metric = 'units' mode
-- =============================================

INSERT INTO clients (
    id,
    name,
    subdomain,
    logo_url,
    primary_color,
    tier_calculation_mode,
    checkpoint_months,
    vip_metric
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test Brand',
    'testbrand',
    NULL,
    '#6366f1',
    'fixed_checkpoint',
    4,
    'units'
);

-- =============================================
-- 2. TIERS (4 VIP Levels - Units Mode)
-- Bronze, Silver, Gold, Platinum
-- Reference: API_CONTRACTS.md tier structure
-- =============================================

INSERT INTO tiers (id, client_id, tier_order, tier_id, tier_name, tier_color, units_threshold, commission_rate, checkpoint_exempt) VALUES
    ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1, 'tier_1', 'Bronze', '#CD7F32', 0, 10.00, true),
    ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'tier_2', 'Silver', '#94a3b8', 100, 12.00, false),
    ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 3, 'tier_3', 'Gold', '#F59E0B', 300, 15.00, false),
    ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 4, 'tier_4', 'Platinum', '#818CF8', 500, 20.00, false);

-- =============================================
-- 3. USERS (9 Test Users)
-- 8 creators (2 per tier) + 1 admin
-- Password: Password123! (bcrypt hash with 10 rounds)
-- =============================================

-- Password hash for 'Password123!' with bcrypt rounds=10
-- $2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2

INSERT INTO users (id, client_id, tiktok_handle, email, password_hash, is_admin, current_tier, total_units) VALUES
    -- Admin user
    ('bbbb0000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'admin1', 'admin@testbrand.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', true, 'tier_4', 1000),
    -- Bronze creators (tier_1, 0-99 units)
    ('bbbb1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'bronzecreator1', 'bronze1@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_1', 25),
    ('bbbb1111-1111-1111-1111-222222222222', '11111111-1111-1111-1111-111111111111', 'bronzecreator2', 'bronze2@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_1', 50),
    -- Silver creators (tier_2, 100-299 units)
    ('bbbb2222-2222-2222-2222-111111111111', '11111111-1111-1111-1111-111111111111', 'silvercreator1', 'silver1@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_2', 150),
    ('bbbb2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'silvercreator2', 'silver2@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_2', 200),
    -- Gold creators (tier_3, 300-499 units)
    ('bbbb3333-3333-3333-3333-111111111111', '11111111-1111-1111-1111-111111111111', 'goldcreator1', 'gold1@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_3', 350),
    ('bbbb3333-3333-3333-3333-222222222222', '11111111-1111-1111-1111-111111111111', 'goldcreator2', 'gold2@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_3', 400),
    -- Platinum creators (tier_4, 500+ units)
    ('bbbb4444-4444-4444-4444-111111111111', '11111111-1111-1111-1111-111111111111', 'platinumcreator1', 'platinum1@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_4', 600),
    ('bbbb4444-4444-4444-4444-222222222222', '11111111-1111-1111-1111-111111111111', 'platinumcreator2', 'platinum2@test.com', '$2b$10$ty/IhrZxY3l76u3lp.T1xuQAw8PkQgXRr3CSQeGpLBjNa6FYSPYd2', false, 'tier_4', 750);

-- =============================================
-- 4. REWARDS (Various types across tiers)
-- Must be created before missions (FK dependency)
-- All enabled = true for testing
-- =============================================

-- Bronze (tier_1) rewards
INSERT INTO rewards (id, client_id, type, name, description, value_data, reward_source, tier_eligibility, enabled, redemption_frequency, redemption_quantity, redemption_type, display_order) VALUES
    ('cccc1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'gift_card', '$25 Gift Card', 'Amazon GC', '{"amount": 25}', 'mission', 'tier_1', true, 'monthly', 2, 'instant', 1),
    ('cccc1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spark_ads', '$30 Ads Boost', 'Spark Ads', '{"amount": 30}', 'mission', 'tier_1', true, 'monthly', 1, 'instant', 2),
    ('cccc1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'commission_boost', '5% Pay Boost', '30 day boost', '{"percent": 5, "duration_days": 30}', 'mission', 'tier_1', true, 'one-time', 1, 'scheduled', 3),
    ('cccc1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'discount', '5% Deal Boost', '7 day deal', '{"percent": 5, "duration_minutes": 10080, "coupon_code": "BRONZE5", "max_uses": 100}', 'mission', 'tier_1', true, 'weekly', 1, 'instant', 4),
    ('cccc1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'physical_gift', 'Branded Stickers', 'Sticker pack', '{"name": "Sticker Pack", "requires_size": false}', 'mission', 'tier_1', true, 'one-time', 1, 'instant', 5);

-- Silver (tier_2) rewards
INSERT INTO rewards (id, client_id, type, name, description, value_data, reward_source, tier_eligibility, enabled, redemption_frequency, redemption_quantity, redemption_type, display_order) VALUES
    ('cccc2222-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'gift_card', '$40 Gift Card', 'Amazon GC', '{"amount": 40}', 'mission', 'tier_2', true, 'monthly', 2, 'instant', 1),
    ('cccc2222-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spark_ads', '$50 Ads Boost', 'Spark Ads', '{"amount": 50}', 'mission', 'tier_2', true, 'monthly', 2, 'instant', 2),
    ('cccc2222-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'commission_boost', '8% Pay Boost', '30 day boost', '{"percent": 8, "duration_days": 30}', 'mission', 'tier_2', true, 'one-time', 1, 'scheduled', 3),
    ('cccc2222-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'discount', '10% Deal Boost', '7 day deal', '{"percent": 10, "duration_minutes": 10080, "coupon_code": "SILVER10", "max_uses": 100}', 'mission', 'tier_2', true, 'weekly', 1, 'instant', 4),
    ('cccc2222-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'physical_gift', 'Water Bottle', 'Branded btl', '{"name": "Branded Water Bottle", "requires_size": false}', 'mission', 'tier_2', true, 'one-time', 1, 'instant', 5);

-- Gold (tier_3) rewards
INSERT INTO rewards (id, client_id, type, name, description, value_data, reward_source, tier_eligibility, enabled, redemption_frequency, redemption_quantity, redemption_type, display_order) VALUES
    ('cccc3333-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'gift_card', '$75 Gift Card', 'Amazon GC', '{"amount": 75}', 'mission', 'tier_3', true, 'monthly', 2, 'instant', 1),
    ('cccc3333-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spark_ads', '$100 Ads Boost', 'Spark Ads', '{"amount": 100}', 'mission', 'tier_3', true, 'monthly', 2, 'instant', 2),
    ('cccc3333-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'commission_boost', '10% Pay Boost', '30 day boost', '{"percent": 10, "duration_days": 30}', 'mission', 'tier_3', true, 'one-time', 1, 'scheduled', 3),
    ('cccc3333-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'discount', '15% Deal Boost', '7 day deal', '{"percent": 15, "duration_minutes": 10080, "coupon_code": "GOLD15", "max_uses": 100}', 'mission', 'tier_3', true, 'weekly', 1, 'instant', 4),
    ('cccc3333-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'physical_gift', 'Branded Hoodie', 'Apparel', '{"name": "Branded Hoodie", "requires_size": true, "size_category": "clothing", "size_options": ["S", "M", "L", "XL"]}', 'mission', 'tier_3', true, 'one-time', 1, 'instant', 5),
    ('cccc3333-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'experience', 'VIP Event Access', 'Event invite', '{"description": "Exclusive creator meetup"}', 'mission', 'tier_3', true, 'one-time', 1, 'instant', 6);

-- Platinum (tier_4) rewards
INSERT INTO rewards (id, client_id, type, name, description, value_data, reward_source, tier_eligibility, enabled, redemption_frequency, redemption_quantity, redemption_type, display_order) VALUES
    ('cccc4444-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'gift_card', '$100 Gift Card', 'Amazon GC', '{"amount": 100}', 'mission', 'tier_4', true, 'monthly', 3, 'instant', 1),
    ('cccc4444-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'spark_ads', '$200 Ads Boost', 'Spark Ads', '{"amount": 200}', 'mission', 'tier_4', true, 'monthly', 2, 'instant', 2),
    ('cccc4444-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'commission_boost', '15% Pay Boost', '30 day boost', '{"percent": 15, "duration_days": 30}', 'mission', 'tier_4', true, 'one-time', 1, 'scheduled', 3),
    ('cccc4444-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'discount', '20% Deal Boost', '14 day deal', '{"percent": 20, "duration_minutes": 20160, "coupon_code": "PLAT20", "max_uses": 100}', 'mission', 'tier_4', true, 'weekly', 1, 'instant', 4),
    ('cccc4444-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'physical_gift', 'AirPods Pro', 'Electronics', '{"name": "AirPods Pro", "requires_size": false}', 'mission', 'tier_4', true, 'one-time', 1, 'instant', 5),
    ('cccc4444-0006-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'experience', 'Mystery Trip', 'Travel prize', '{"description": "All-expenses-paid creator retreat"}', 'mission', 'tier_4', true, 'one-time', 1, 'instant', 6);

-- Raffle rewards (for raffle missions)
INSERT INTO rewards (id, client_id, type, name, description, value_data, reward_source, tier_eligibility, enabled, redemption_frequency, redemption_quantity, redemption_type, display_order) VALUES
    ('cccc0000-aaa1-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'physical_gift', 'iPhone 15 Pro', 'Raffle prize', '{"name": "iPhone 15 Pro", "requires_size": false}', 'mission', 'tier_1', true, 'one-time', 1, 'instant', 100),
    ('cccc0000-aaa2-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'gift_card', '$500 Gift Card', 'Raffle prize', '{"amount": 500}', 'mission', 'tier_1', true, 'one-time', 1, 'instant', 101);

-- =============================================
-- 5. MISSIONS (22 total)
-- 5 standard types x 4 tiers = 20 missions
-- 2 raffles (1 dormant, 1 active)
-- =============================================

-- Bronze (tier_1) missions - 5 standard types
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, enabled, activated) VALUES
    ('dddd1111-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sell $100', 'Sell $100 in Products', 'Reach $100 in sales', 'sales_dollars', 100, 'dollars', 'cccc1111-0001-0000-0000-000000000001', 'tier_1', 1, true, true),
    ('dddd1111-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sell 10 Units', 'Sell 10 Units', 'Sell 10 products', 'sales_units', 10, 'units', 'cccc1111-0002-0000-0000-000000000002', 'tier_1', 2, true, true),
    ('dddd1111-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Post 3 Videos', 'Post 3 Videos', 'Create 3 videos', 'videos', 3, 'count', 'cccc1111-0003-0000-0000-000000000003', 'tier_1', 3, true, true),
    ('dddd1111-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Get 1K Views', 'Reach 1,000 Views', 'Accumulate 1000 views', 'views', 1000, 'count', 'cccc1111-0004-0000-0000-000000000004', 'tier_1', 4, true, true),
    ('dddd1111-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Get 100 Likes', 'Collect 100 Likes', 'Accumulate 100 likes', 'likes', 100, 'count', 'cccc1111-0005-0000-0000-000000000005', 'tier_1', 5, true, true);

-- Silver (tier_2) missions - 5 standard types
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, enabled, activated) VALUES
    ('dddd2222-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sell $250', 'Sell $250 in Products', 'Reach $250 in sales', 'sales_dollars', 250, 'dollars', 'cccc2222-0001-0000-0000-000000000001', 'tier_2', 1, true, true),
    ('dddd2222-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sell 25 Units', 'Sell 25 Units', 'Sell 25 products', 'sales_units', 25, 'units', 'cccc2222-0002-0000-0000-000000000002', 'tier_2', 2, true, true),
    ('dddd2222-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Post 5 Videos', 'Post 5 Videos', 'Create 5 videos', 'videos', 5, 'count', 'cccc2222-0003-0000-0000-000000000003', 'tier_2', 3, true, true),
    ('dddd2222-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Get 5K Views', 'Reach 5,000 Views', 'Accumulate 5000 views', 'views', 5000, 'count', 'cccc2222-0004-0000-0000-000000000004', 'tier_2', 4, true, true),
    ('dddd2222-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Get 500 Likes', 'Collect 500 Likes', 'Accumulate 500 likes', 'likes', 500, 'count', 'cccc2222-0005-0000-0000-000000000005', 'tier_2', 5, true, true);

-- Gold (tier_3) missions - 5 standard types
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, enabled, activated) VALUES
    ('dddd3333-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sell $500', 'Sell $500 in Products', 'Reach $500 in sales', 'sales_dollars', 500, 'dollars', 'cccc3333-0001-0000-0000-000000000001', 'tier_3', 1, true, true),
    ('dddd3333-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sell 50 Units', 'Sell 50 Units', 'Sell 50 products', 'sales_units', 50, 'units', 'cccc3333-0002-0000-0000-000000000002', 'tier_3', 2, true, true),
    ('dddd3333-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Post 7 Videos', 'Post 7 Videos', 'Create 7 videos', 'videos', 7, 'count', 'cccc3333-0003-0000-0000-000000000003', 'tier_3', 3, true, true),
    ('dddd3333-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Get 10K Views', 'Reach 10,000 Views', 'Accumulate 10000 views', 'views', 10000, 'count', 'cccc3333-0004-0000-0000-000000000004', 'tier_3', 4, true, true),
    ('dddd3333-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Get 1K Likes', 'Collect 1,000 Likes', 'Accumulate 1000 likes', 'likes', 1000, 'count', 'cccc3333-0005-0000-0000-000000000005', 'tier_3', 5, true, true);

-- Platinum (tier_4) missions - 5 standard types
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, enabled, activated) VALUES
    ('dddd4444-0001-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Sell $1000', 'Sell $1,000 in Products', 'Reach $1000 in sales', 'sales_dollars', 1000, 'dollars', 'cccc4444-0001-0000-0000-000000000001', 'tier_4', 1, true, true),
    ('dddd4444-0002-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Sell 100 Units', 'Sell 100 Units', 'Sell 100 products', 'sales_units', 100, 'units', 'cccc4444-0002-0000-0000-000000000002', 'tier_4', 2, true, true),
    ('dddd4444-0003-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Post 10 Videos', 'Post 10 Videos', 'Create 10 videos', 'videos', 10, 'count', 'cccc4444-0003-0000-0000-000000000003', 'tier_4', 3, true, true),
    ('dddd4444-0004-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Get 25K Views', 'Reach 25,000 Views', 'Accumulate 25000 views', 'views', 25000, 'count', 'cccc4444-0004-0000-0000-000000000004', 'tier_4', 4, true, true),
    ('dddd4444-0005-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Get 2.5K Likes', 'Collect 2,500 Likes', 'Accumulate 2500 likes', 'likes', 2500, 'count', 'cccc4444-0005-0000-0000-000000000005', 'tier_4', 5, true, true);

-- Raffle missions (2 total)
-- Raffle 1: DORMANT (activated = false) - iPhone raffle
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, raffle_end_date, enabled, activated) VALUES
    ('dddd0000-aaa1-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'iPhone Raffle', 'Win an iPhone 15 Pro!', 'Enter for a chance to win', 'raffle', 0, 'count', 'cccc0000-aaa1-0000-0000-000000000001', 'all', 100, NOW() + INTERVAL '30 days', true, false);

-- Raffle 2: ACTIVE (activated = true) - Gift Card raffle
INSERT INTO missions (id, client_id, title, display_name, description, mission_type, target_value, target_unit, reward_id, tier_eligibility, display_order, raffle_end_date, enabled, activated) VALUES
    ('dddd0000-aaa2-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Gift Card Raffle', 'Win a $500 Gift Card!', 'Enter for a chance to win', 'raffle', 0, 'count', 'cccc0000-aaa2-0000-0000-000000000002', 'all', 101, NOW() + INTERVAL '14 days', true, true);

-- =============================================
-- END OF SEED DATA
-- Summary:
--   1 client (Test Brand, units mode)
--   4 tiers (Bronze, Silver, Gold, Platinum)
--   9 users (1 admin + 8 creators, 2 per tier)
--   24 rewards (5-6 per tier + 2 raffle prizes)
--   22 missions (5 per tier + 2 raffles)
-- =============================================
