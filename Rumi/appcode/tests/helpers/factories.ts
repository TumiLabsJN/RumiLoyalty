/**
 * Test Data Factories
 *
 * Factory functions for creating test data in the local Supabase database.
 * Each factory returns the created record with its ID for cleanup.
 *
 * Usage:
 *   const client = await createTestClientRecord(supabase, { name: 'Test Corp' });
 *   const user = await createTestUser(supabase, { client_id: client.id });
 *   // ... run tests ...
 *   await cleanupTestData(supabase, { clientIds: [client.id] });
 *
 * References:
 *   - EXECUTION_PLAN.md Task 8.4.3 (Test helper infrastructure)
 *   - SchemaFinalv2.md (table schemas)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { randomUUID } from 'crypto';

// Type aliases for cleaner code
type Tables = Database['public']['Tables'];
type ClientInsert = Tables['clients']['Insert'];
type UserInsert = Tables['users']['Insert'];
type TierInsert = Tables['tiers']['Insert'];
type VideoInsert = Tables['videos']['Insert'];
type MissionInsert = Tables['missions']['Insert'];
type RewardInsert = Tables['rewards']['Insert'];

// Factory result types (include ID for cleanup)
export interface TestClient {
  id: string;
  name: string;
  vip_metric: string;
}

export interface TestUser {
  id: string;
  client_id: string;
  tiktok_handle: string;
  current_tier: string;
}

export interface TestTier {
  id: string;
  client_id: string;
  tier_name: string;
  tier_order: number;
}

export interface TestVideo {
  id: string;
  client_id: string;
  user_id: string;
  video_url: string;
}

export interface TestMission {
  id: string;
  client_id: string;
  title: string;
  reward_id: string;
}

export interface TestReward {
  id: string;
  client_id: string;
  type: string;
  tier_eligibility: string;
}

/**
 * Creates a test client record.
 */
export async function createTestClientRecord(
  supabase: SupabaseClient<Database>,
  overrides: Partial<ClientInsert> = {}
): Promise<TestClient> {
  const id = overrides.id || randomUUID();
  const defaultData: ClientInsert = {
    id,
    name: `Test Client ${id.slice(0, 8)}`,
    vip_metric: 'sales',
  };

  const { data, error } = await supabase
    .from('clients')
    .insert({ ...defaultData, ...overrides })
    .select('id, name, vip_metric')
    .single();

  if (error) {
    throw new Error(`Failed to create test client: ${error.message}`);
  }

  return data as TestClient;
}

/**
 * Creates a test user record.
 * Requires a client_id.
 */
export async function createTestUser(
  supabase: SupabaseClient<Database>,
  overrides: Partial<UserInsert> & { client_id: string }
): Promise<TestUser> {
  const id = overrides.id || randomUUID();
  const handle = overrides.tiktok_handle || `@testuser_${id.slice(0, 8)}`;

  // Set checkpoint dates for testing
  const tierAchievedAt = new Date();
  tierAchievedAt.setMonth(tierAchievedAt.getMonth() - 1); // 1 month ago

  const nextCheckpointAt = new Date();
  nextCheckpointAt.setMonth(nextCheckpointAt.getMonth() + 2); // 2 months from now

  const defaultData: UserInsert = {
    id,
    client_id: overrides.client_id,
    tiktok_handle: handle,
    password_hash: '$2b$10$testhashedpassword', // Dummy hash
    current_tier: 'tier_1',
    tier_achieved_at: tierAchievedAt.toISOString(),
    next_checkpoint_at: nextCheckpointAt.toISOString(),
    checkpoint_sales_current: 0,
    checkpoint_units_current: 0,
    checkpoint_videos_posted: 0,
    checkpoint_total_views: 0,
    checkpoint_total_likes: 0,
    checkpoint_total_comments: 0,
    total_sales: 0,
    total_units: 0,
    leaderboard_rank: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .insert({ ...defaultData, ...overrides })
    .select('id, client_id, tiktok_handle, current_tier')
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data as TestUser;
}

/**
 * Creates a test tier record.
 * Requires a client_id.
 */
export async function createTestTier(
  supabase: SupabaseClient<Database>,
  overrides: Partial<TierInsert> & { client_id: string; tier_order: number }
): Promise<TestTier> {
  const id = overrides.id || randomUUID();

  const defaultData: TierInsert = {
    id,
    client_id: overrides.client_id,
    tier_id: overrides.tier_id || `tier_${overrides.tier_order}`,
    tier_name: overrides.tier_name || `Tier ${overrides.tier_order}`,
    tier_order: overrides.tier_order,
    tier_color: overrides.tier_color || '#6366f1',
    commission_rate: overrides.commission_rate ?? 5.0,
    sales_threshold: overrides.sales_threshold ?? overrides.tier_order * 1000,
    units_threshold: overrides.units_threshold ?? overrides.tier_order * 100,
  };

  const { data, error } = await supabase
    .from('tiers')
    .insert({ ...defaultData, ...overrides })
    .select('id, client_id, tier_name, tier_order')
    .single();

  if (error) {
    throw new Error(`Failed to create test tier: ${error.message}`);
  }

  return data as TestTier;
}

/**
 * Creates a test video record.
 * Requires client_id and user_id.
 */
export async function createTestVideo(
  supabase: SupabaseClient<Database>,
  overrides: Partial<VideoInsert> & { client_id: string; user_id: string }
): Promise<TestVideo> {
  const id = overrides.id || randomUUID();

  const defaultData: VideoInsert = {
    id,
    client_id: overrides.client_id,
    user_id: overrides.user_id,
    video_url: overrides.video_url || `https://tiktok.com/video/${id.slice(0, 8)}`,
    video_title: 'Test Video',
    post_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    views: 100,
    likes: 10,
    comments: 5,
    gmv: 50.0,
    ctr: 2.5,
    units_sold: 2,
    sync_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('videos')
    .insert({ ...defaultData, ...overrides })
    .select('id, client_id, user_id, video_url')
    .single();

  if (error) {
    throw new Error(`Failed to create test video: ${error.message}`);
  }

  return data as TestVideo;
}

/**
 * Creates a test reward record.
 * Requires client_id.
 */
export async function createTestReward(
  supabase: SupabaseClient<Database>,
  overrides: Partial<RewardInsert> & { client_id: string }
): Promise<TestReward> {
  const id = overrides.id || randomUUID();

  const defaultData: RewardInsert = {
    id,
    client_id: overrides.client_id,
    type: overrides.type || 'gift_card',
    value_data: overrides.value_data || { amount: 50 },
    tier_eligibility: overrides.tier_eligibility || 'all',
    redemption_type: overrides.redemption_type || 'instant',
    redemption_frequency: overrides.redemption_frequency || 'unlimited',
    redemption_quantity: overrides.redemption_frequency && overrides.redemption_frequency !== 'unlimited' ? (overrides.redemption_quantity || 1) : null,
    enabled: overrides.enabled ?? true,
  };

  const { data, error } = await supabase
    .from('rewards')
    .insert({ ...defaultData, ...overrides })
    .select('id, client_id, type, tier_eligibility')
    .single();

  if (error) {
    throw new Error(`Failed to create test reward: ${error.message}`);
  }

  return data as TestReward;
}

/**
 * Creates a test mission record.
 * Requires client_id and reward_id.
 */
export async function createTestMission(
  supabase: SupabaseClient<Database>,
  overrides: Partial<MissionInsert> & { client_id: string; reward_id: string }
): Promise<TestMission> {
  const id = overrides.id || randomUUID();

  const defaultData: MissionInsert = {
    id,
    client_id: overrides.client_id,
    title: overrides.title || `Test Mission ${id.slice(0, 8)}`,
    display_name: overrides.display_name || 'Sales Sprint',
    description: overrides.description || 'Test mission for integration tests',
    mission_type: overrides.mission_type || 'sales_dollars',
    target_value: overrides.target_value ?? 1000,
    target_unit: overrides.target_unit || 'dollars',
    reward_id: overrides.reward_id,
    tier_eligibility: overrides.tier_eligibility || 'all',
    display_order: overrides.display_order ?? 1,
    enabled: overrides.enabled ?? true,
  };

  const { data, error } = await supabase
    .from('missions')
    .insert({ ...defaultData, ...overrides })
    .select('id, client_id, title, reward_id')
    .single();

  if (error) {
    throw new Error(`Failed to create test mission: ${error.message}`);
  }

  return data as TestMission;
}

/**
 * Creates multiple tiers for a client (typical 4-tier setup).
 */
export async function createTestTierSet(
  supabase: SupabaseClient<Database>,
  clientId: string,
  options: {
    tierNames?: string[];
    salesThresholds?: number[];
    unitsThresholds?: number[];
  } = {}
): Promise<TestTier[]> {
  const tierNames = options.tierNames || ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const salesThresholds = options.salesThresholds || [0, 1000, 3000, 10000];
  const unitsThresholds = options.unitsThresholds || [0, 100, 300, 1000];

  const tiers: TestTier[] = [];

  for (let i = 0; i < tierNames.length; i++) {
    const tier = await createTestTier(supabase, {
      client_id: clientId,
      tier_name: tierNames[i],
      tier_order: i + 1,
      sales_threshold: salesThresholds[i],
      units_threshold: unitsThresholds[i],
    });
    tiers.push(tier);
  }

  return tiers;
}

/**
 * Creates a complete test setup: client + tiers + users.
 * Returns all created IDs for cleanup.
 */
export async function createTestSetup(
  supabase: SupabaseClient<Database>,
  options: {
    clientName?: string;
    vipMetric?: 'sales' | 'units';
    userCount?: number;
  } = {}
): Promise<{
  client: TestClient;
  tiers: TestTier[];
  users: TestUser[];
}> {
  // Create client
  const client = await createTestClientRecord(supabase, {
    name: options.clientName || 'Integration Test Client',
    vip_metric: options.vipMetric || 'sales',
  });

  // Create tiers
  const tiers = await createTestTierSet(supabase, client.id);

  // Create users
  const userCount = options.userCount || 3;
  const users: TestUser[] = [];

  for (let i = 0; i < userCount; i++) {
    const user = await createTestUser(supabase, {
      client_id: client.id,
      tiktok_handle: `@testuser_${i + 1}`,
      current_tier: `tier_${(i % 4) + 1}`, // Distribute across tiers
    });
    users.push(user);
  }

  return { client, tiers, users };
}
