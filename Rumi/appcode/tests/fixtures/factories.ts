/**
 * Test Factories for Auth Integration Tests
 *
 * Creates test data with proper FK relationships per SchemaFinalv2.md.
 * All factories use admin client to bypass RLS.
 *
 * References:
 * - SchemaFinalv2.md lines 106-155 (clients and users tables)
 * - ARCHITECTURE.md Section 5 (Repository Layer)
 *
 * Usage:
 *   const { client, cleanup } = await createTestClient({ name: 'Test' });
 *   const { user, cleanup: userCleanup } = await createTestUser({ clientId: client.id });
 *   // ... run tests ...
 *   await userCleanup();
 *   await cleanup();
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '../../.env.local');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (e) {
    // Env vars may already be set
  }
}

loadEnvFile();

// Initialize Supabase admin client (lazy initialization)
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in environment.\n' +
      'Make sure appcode/.env.local exists with these variables.'
    );
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}

// ============================================================================
// Types
// ============================================================================

export interface TestClient {
  id: string;
  name: string;
  subdomain: string;
  vipMetric: string;
}

export interface TestUser {
  id: string;
  clientId: string;
  tiktokHandle: string;
  email: string;
  passwordHash: string;
  currentTier: string;
  emailVerified: boolean;
}

export interface TestTier {
  id: string;
  clientId: string;
  tierId: string;
  tierOrder: number;
  tierName: string;
  tierColor: string;
  salesThreshold: number | null;
  unitsThreshold: number | null;
  commissionRate: number;
}

export interface TestOtp {
  id: string;
  userId: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: string;
}

export interface TestReward {
  id: string;
  clientId: string;
  type: string;
  name: string | null;
  description: string | null;
  valueData: Record<string, unknown> | null;
  rewardSource: string;
  tierEligibility: string;
  redemptionType: string;
  enabled: boolean;
}

export interface TestMission {
  id: string;
  clientId: string;
  title: string;
  displayName: string;
  description: string | null;
  missionType: string;
  targetValue: number;
  targetUnit: string;
  rewardId: string;
  tierEligibility: string;
  previewFromTier: string | null;
  displayOrder: number;
  raffleEndDate: string | null;
  enabled: boolean;
  activated: boolean;
}

export interface TestMissionProgress {
  id: string;
  userId: string;
  missionId: string;
  clientId: string;
  currentValue: number;
  status: string;
  completedAt: string | null;
  checkpointStart: string | null;
  checkpointEnd: string | null;
}

export interface TestRedemption {
  id: string;
  userId: string;
  rewardId: string;
  missionProgressId: string | null;
  clientId: string;
  status: string;
  tierAtClaim: string;
  redemptionType: string;
  claimedAt: string | null;
}

export interface TestRaffleParticipation {
  id: string;
  missionId: string;
  userId: string;
  missionProgressId: string;
  redemptionId: string;
  clientId: string;
  participatedAt: string;
  isWinner: boolean | null;
  winnerSelectedAt: string | null;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test client (tenant)
 *
 * @param options - Client configuration
 * @returns Created client and cleanup function
 */
export async function createTestClient(options: {
  name?: string;
  subdomain?: string;
  vipMetric?: string;
} = {}): Promise<{ client: TestClient; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const name = options.name ?? `Test Client ${id.slice(0, 8)}`;
  const subdomain = options.subdomain ?? `test-${id.slice(0, 8)}`;
  const vipMetric = options.vipMetric ?? 'units';

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('clients')
    .insert({
      id,
      name,
      subdomain,
      vip_metric: vipMetric,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test client: ${error.message}`);
  }

  const client: TestClient = {
    id: data.id,
    name: data.name,
    subdomain: data.subdomain,
    vipMetric: data.vip_metric,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('clients').delete().eq('id', id);
  };

  return { client, cleanup };
}

/**
 * Create a test user
 *
 * @param options - User configuration (clientId required)
 * @returns Created user and cleanup function
 */
export async function createTestUser(options: {
  clientId: string;
  tiktokHandle?: string;
  email?: string;
  passwordHash?: string;
  currentTier?: string;
  emailVerified?: boolean;
}): Promise<{ user: TestUser; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const tiktokHandle = options.tiktokHandle ?? `testuser_${id.slice(0, 8)}`;
  const email = options.email ?? `${tiktokHandle}@test.com`;
  const passwordHash = options.passwordHash ?? '$2b$10$test_hash_placeholder';
  const currentTier = options.currentTier ?? 'tier_1';
  const emailVerified = options.emailVerified ?? false;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('users')
    .insert({
      id,
      client_id: options.clientId,
      tiktok_handle: tiktokHandle,
      email,
      password_hash: passwordHash,
      current_tier: currentTier,
      email_verified: emailVerified,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  const user: TestUser = {
    id: data.id,
    clientId: data.client_id,
    tiktokHandle: data.tiktok_handle,
    email: data.email,
    passwordHash: data.password_hash,
    currentTier: data.current_tier,
    emailVerified: data.email_verified,
  };

  const cleanup = async () => {
    // Delete related OTPs first (FK constraint)
    await getSupabaseClient().from('otp_codes').delete().eq('user_id', id);
    // Delete related password reset tokens (FK constraint)
    await getSupabaseClient().from('password_reset_tokens').delete().eq('user_id', id);
    // Delete user
    await getSupabaseClient().from('users').delete().eq('id', id);
  };

  return { user, cleanup };
}

/**
 * Create a test tier
 *
 * @param options - Tier configuration (clientId required)
 * @returns Created tier and cleanup function
 */
export async function createTestTier(options: {
  clientId: string;
  tierId?: string;
  tierOrder?: number;
  tierName?: string;
  tierColor?: string;
  salesThreshold?: number | null;
  unitsThreshold?: number | null;
  commissionRate?: number;
}): Promise<{ tier: TestTier; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const tierId = options.tierId ?? 'tier_1';
  const tierOrder = options.tierOrder ?? 1;
  const tierName = options.tierName ?? 'Bronze';
  const tierColor = options.tierColor ?? '#CD7F32';
  const salesThreshold = options.salesThreshold ?? null;
  const unitsThreshold = options.unitsThreshold ?? 0;
  const commissionRate = options.commissionRate ?? 5.0;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('tiers')
    .insert({
      id,
      client_id: options.clientId,
      tier_id: tierId,
      tier_order: tierOrder,
      tier_name: tierName,
      tier_color: tierColor,
      sales_threshold: salesThreshold,
      units_threshold: unitsThreshold,
      commission_rate: commissionRate,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test tier: ${error.message}`);
  }

  const tier: TestTier = {
    id: data.id,
    clientId: data.client_id,
    tierId: data.tier_id,
    tierOrder: data.tier_order,
    tierName: data.tier_name,
    tierColor: data.tier_color,
    salesThreshold: data.sales_threshold,
    unitsThreshold: data.units_threshold,
    commissionRate: data.commission_rate,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('tiers').delete().eq('id', id);
  };

  return { tier, cleanup };
}

/**
 * Create a test OTP code
 *
 * @param options - OTP configuration (sessionId required)
 * @returns Created OTP and cleanup function
 */
export async function createTestOtp(options: {
  userId?: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt?: Date;
}): Promise<{ otp: TestOtp; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const expiresAt = options.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('otp_codes')
    .insert({
      id,
      user_id: options.userId ?? null,
      session_id: options.sessionId,
      code_hash: options.codeHash,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test OTP: ${error.message}`);
  }

  const otp: TestOtp = {
    id: data.id,
    userId: data.user_id,
    sessionId: data.session_id,
    codeHash: data.code_hash,
    expiresAt: data.expires_at,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('otp_codes').delete().eq('id', id);
  };

  return { otp, cleanup };
}

/**
 * Create a test reward
 *
 * @param options - Reward configuration (clientId required)
 * @returns Created reward and cleanup function
 */
export async function createTestReward(options: {
  clientId: string;
  type?: string;
  name?: string | null;
  description?: string | null;
  valueData?: Record<string, unknown> | null;
  rewardSource?: string;
  tierEligibility?: string;
  redemptionType?: string;
  redemptionFrequency?: string;
  redemptionQuantity?: number | null;
  enabled?: boolean;
}): Promise<{ reward: TestReward; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const type = options.type ?? 'gift_card';
  const name = options.name ?? null;
  const description = options.description ?? null;
  const valueData = options.valueData ?? { amount: 50 };
  const rewardSource = options.rewardSource ?? 'mission';
  // rewards.tier_eligibility only allows 'tier_1' through 'tier_6' (not 'all')
  const tierEligibility = options.tierEligibility ?? 'tier_1';
  const redemptionType = options.redemptionType ?? 'instant';
  const redemptionFrequency = options.redemptionFrequency ?? 'unlimited';
  // Per constraint: unlimited = null quantity, otherwise 1-10
  const redemptionQuantity = redemptionFrequency === 'unlimited' ? null : (options.redemptionQuantity ?? 1);
  const enabled = options.enabled ?? true;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('rewards')
    .insert({
      id,
      client_id: options.clientId,
      type,
      name,
      description,
      value_data: valueData,
      reward_source: rewardSource,
      tier_eligibility: tierEligibility,
      redemption_type: redemptionType,
      redemption_frequency: redemptionFrequency,
      redemption_quantity: redemptionQuantity,
      enabled,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test reward: ${error.message}`);
  }

  const reward: TestReward = {
    id: data.id,
    clientId: data.client_id,
    type: data.type,
    name: data.name,
    description: data.description,
    valueData: data.value_data,
    rewardSource: data.reward_source,
    tierEligibility: data.tier_eligibility,
    redemptionType: data.redemption_type,
    enabled: data.enabled,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('rewards').delete().eq('id', id);
  };

  return { reward, cleanup };
}

/**
 * Create a test mission
 *
 * @param options - Mission configuration (clientId, rewardId required)
 * @returns Created mission and cleanup function
 */
export async function createTestMission(options: {
  clientId: string;
  rewardId: string;
  title?: string;
  displayName?: string;
  description?: string | null;
  missionType?: string;
  targetValue?: number;
  targetUnit?: string;
  tierEligibility?: string;
  previewFromTier?: string | null;
  displayOrder?: number;
  raffleEndDate?: Date | null;
  enabled?: boolean;
  activated?: boolean;
}): Promise<{ mission: TestMission; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const missionType = options.missionType ?? 'sales_units';
  const title = options.title ?? `Test Mission ${id.slice(0, 8)}`;
  const displayName = options.displayName ?? 'Sales Sprint';
  const description = options.description ?? null;
  const targetValue = options.targetValue ?? (missionType === 'raffle' ? 0 : 100);
  const targetUnit = options.targetUnit ?? 'units';
  const tierEligibility = options.tierEligibility ?? 'all';
  const previewFromTier = options.previewFromTier ?? null;
  const displayOrder = options.displayOrder ?? 1;
  const raffleEndDate = missionType === 'raffle'
    ? (options.raffleEndDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    : null;
  const enabled = options.enabled ?? true;
  const activated = options.activated ?? (missionType === 'raffle' ? true : false);

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('missions')
    .insert({
      id,
      client_id: options.clientId,
      title,
      display_name: displayName,
      description,
      mission_type: missionType,
      target_value: targetValue,
      target_unit: targetUnit,
      reward_id: options.rewardId,
      tier_eligibility: tierEligibility,
      preview_from_tier: previewFromTier,
      display_order: displayOrder,
      raffle_end_date: raffleEndDate?.toISOString() ?? null,
      enabled,
      activated,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test mission: ${error.message}`);
  }

  const mission: TestMission = {
    id: data.id,
    clientId: data.client_id,
    title: data.title,
    displayName: data.display_name,
    description: data.description,
    missionType: data.mission_type,
    targetValue: data.target_value,
    targetUnit: data.target_unit,
    rewardId: data.reward_id,
    tierEligibility: data.tier_eligibility,
    previewFromTier: data.preview_from_tier,
    displayOrder: data.display_order,
    raffleEndDate: data.raffle_end_date,
    enabled: data.enabled,
    activated: data.activated,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('missions').delete().eq('id', id);
  };

  return { mission, cleanup };
}

/**
 * Create a test mission progress record
 *
 * @param options - Progress configuration (userId, missionId, clientId required)
 * @returns Created progress and cleanup function
 */
export async function createTestMissionProgress(options: {
  userId: string;
  missionId: string;
  clientId: string;
  currentValue?: number;
  status?: string;
  completedAt?: Date | null;
  checkpointStart?: Date | null;
  checkpointEnd?: Date | null;
}): Promise<{ progress: TestMissionProgress; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const currentValue = options.currentValue ?? 0;
  const status = options.status ?? 'active';
  const completedAt = options.completedAt ?? null;
  const checkpointStart = options.checkpointStart ?? new Date();
  const checkpointEnd = options.checkpointEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('mission_progress')
    .insert({
      id,
      user_id: options.userId,
      mission_id: options.missionId,
      client_id: options.clientId,
      current_value: currentValue,
      status,
      completed_at: completedAt?.toISOString() ?? null,
      checkpoint_start: checkpointStart?.toISOString() ?? null,
      checkpoint_end: checkpointEnd?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test mission progress: ${error.message}`);
  }

  const progress: TestMissionProgress = {
    id: data.id,
    userId: data.user_id,
    missionId: data.mission_id,
    clientId: data.client_id,
    currentValue: data.current_value,
    status: data.status,
    completedAt: data.completed_at,
    checkpointStart: data.checkpoint_start,
    checkpointEnd: data.checkpoint_end,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('mission_progress').delete().eq('id', id);
  };

  return { progress, cleanup };
}

/**
 * Create a test redemption record
 *
 * @param options - Redemption configuration (userId, rewardId, clientId, tierAtClaim required)
 * @returns Created redemption and cleanup function
 */
export async function createTestRedemption(options: {
  userId: string;
  rewardId: string;
  clientId: string;
  tierAtClaim: string;
  missionProgressId?: string | null;
  status?: string;
  redemptionType?: string;
  claimedAt?: Date | null;
  concludedAt?: Date | null;
  rejectedAt?: Date | null;
}): Promise<{ redemption: TestRedemption; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const missionProgressId = options.missionProgressId ?? null;
  const status = options.status ?? 'claimable';
  const redemptionType = options.redemptionType ?? 'instant';
  const claimedAt = options.claimedAt ?? null;
  const concludedAt = options.concludedAt ?? null;
  const rejectedAt = options.rejectedAt ?? null;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('redemptions')
    .insert({
      id,
      user_id: options.userId,
      reward_id: options.rewardId,
      mission_progress_id: missionProgressId,
      client_id: options.clientId,
      status,
      tier_at_claim: options.tierAtClaim,
      redemption_type: redemptionType,
      claimed_at: claimedAt?.toISOString() ?? null,
      concluded_at: concludedAt?.toISOString() ?? null,
      rejected_at: rejectedAt?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test redemption: ${error.message}`);
  }

  const redemption: TestRedemption = {
    id: data.id,
    userId: data.user_id,
    rewardId: data.reward_id,
    missionProgressId: data.mission_progress_id,
    clientId: data.client_id,
    status: data.status,
    tierAtClaim: data.tier_at_claim,
    redemptionType: data.redemption_type,
    claimedAt: data.claimed_at,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('redemptions').delete().eq('id', id);
  };

  return { redemption, cleanup };
}

/**
 * Create a test raffle participation record
 *
 * @param options - Raffle participation configuration (all FKs required)
 * @returns Created participation and cleanup function
 */
export async function createTestRaffleParticipation(options: {
  missionId: string;
  userId: string;
  missionProgressId: string;
  redemptionId: string;
  clientId: string;
  participatedAt?: Date;
  isWinner?: boolean | null;
  winnerSelectedAt?: Date | null;
}): Promise<{ participation: TestRaffleParticipation; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const participatedAt = options.participatedAt ?? new Date();
  const isWinner = options.isWinner ?? null;
  const winnerSelectedAt = options.winnerSelectedAt ?? null;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('raffle_participations')
    .insert({
      id,
      mission_id: options.missionId,
      user_id: options.userId,
      mission_progress_id: options.missionProgressId,
      redemption_id: options.redemptionId,
      client_id: options.clientId,
      participated_at: participatedAt.toISOString(),
      is_winner: isWinner,
      winner_selected_at: winnerSelectedAt?.toISOString() ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test raffle participation: ${error.message}`);
  }

  const participation: TestRaffleParticipation = {
    id: data.id,
    missionId: data.mission_id,
    userId: data.user_id,
    missionProgressId: data.mission_progress_id,
    redemptionId: data.redemption_id,
    clientId: data.client_id,
    participatedAt: data.participated_at,
    isWinner: data.is_winner,
    winnerSelectedAt: data.winner_selected_at,
  };

  const cleanup = async () => {
    await getSupabaseClient().from('raffle_participations').delete().eq('id', id);
  };

  return { participation, cleanup };
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Clean up all test data in correct FK order
 *
 * Deletes: sub-states → redemptions → mission_progress → missions → rewards → users → tiers → clients
 *
 * @param clientId - Client ID to clean up (deletes all related data)
 */
export async function cleanupTestData(clientId: string): Promise<void> {
  // Delete in reverse FK order to avoid constraint violations

  // 1. Delete raffle_participations (references redemptions, mission_progress)
  await getSupabaseClient().from('raffle_participations').delete().eq('client_id', clientId);

  // 2. Delete commission_boost_redemptions (references redemptions)
  await getSupabaseClient().from('commission_boost_redemptions').delete().eq('client_id', clientId);

  // 3. Delete physical_gift_redemptions (references redemptions)
  await getSupabaseClient().from('physical_gift_redemptions').delete().eq('client_id', clientId);

  // 4. Delete redemptions (references rewards, users, mission_progress)
  await getSupabaseClient().from('redemptions').delete().eq('client_id', clientId);

  // 5. Delete mission_progress (references missions, users)
  await getSupabaseClient().from('mission_progress').delete().eq('client_id', clientId);

  // 6. Delete missions (references rewards, clients)
  await getSupabaseClient().from('missions').delete().eq('client_id', clientId);

  // 7. Delete rewards (references clients)
  await getSupabaseClient().from('rewards').delete().eq('client_id', clientId);

  // 8. Delete OTP codes (references users)
  const { data: users } = await getSupabaseClient()
    .from('users')
    .select('id')
    .eq('client_id', clientId);

  if (users && users.length > 0) {
    const userIds = users.map(u => u.id);
    await getSupabaseClient().from('otp_codes').delete().in('user_id', userIds);
    await getSupabaseClient().from('password_reset_tokens').delete().in('user_id', userIds);
  }

  // 9. Delete users (references clients, tiers)
  await getSupabaseClient().from('users').delete().eq('client_id', clientId);

  // 10. Delete tiers (references clients)
  await getSupabaseClient().from('tiers').delete().eq('client_id', clientId);

  // 11. Delete client
  await getSupabaseClient().from('clients').delete().eq('id', clientId);
}

// ============================================================================
// Test Database Setup
// ============================================================================

/**
 * Initialize test database connection and verify connectivity
 *
 * @returns Supabase client for direct queries in tests
 */
export async function setupTestDb(): Promise<SupabaseClient> {
  // Verify connection by querying clients table
  const db = getSupabaseClient();
  const { error } = await db.from('clients').select('id').limit(1);

  if (error) {
    throw new Error(`Failed to connect to test database: ${error.message}`);
  }

  return db;
}

/**
 * Get the admin Supabase client for direct queries
 */
export function getTestSupabase(): SupabaseClient {
  return getSupabaseClient();
}

// ============================================================================
// Test Constants (from seed data)
// ============================================================================

export const SEED_DATA = {
  CLIENT_ID: '11111111-1111-1111-1111-111111111111',
  ADMIN_USER: {
    id: 'aaaa1111-1111-1111-1111-111111111111',
    handle: 'admin1',
    email: 'admin1@test.com',
  },
  BRONZE_USER: {
    id: 'bbbb1111-1111-1111-1111-111111111111',
    handle: 'bronzecreator1',
    email: 'bronze1@test.com',
  },
};
