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
  tierLevel: string;
  salesThreshold: number;
}

export interface TestOtp {
  id: string;
  userId: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: string;
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
  tierLevel?: string;
  salesThreshold?: number;
}): Promise<{ tier: TestTier; cleanup: () => Promise<void> }> {
  const id = randomUUID();
  const tierLevel = options.tierLevel ?? 'tier_1';
  const salesThreshold = options.salesThreshold ?? 0;

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('tiers')
    .insert({
      id,
      client_id: options.clientId,
      tier_level: tierLevel,
      sales_threshold: salesThreshold,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test tier: ${error.message}`);
  }

  const tier: TestTier = {
    id: data.id,
    clientId: data.client_id,
    tierLevel: data.tier_level,
    salesThreshold: data.sales_threshold,
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

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Clean up all test data in correct FK order
 *
 * Deletes: redemptions → mission_progress → missions → rewards → users → tiers → clients
 *
 * @param clientId - Client ID to clean up (deletes all related data)
 */
export async function cleanupTestData(clientId: string): Promise<void> {
  // Delete in reverse FK order to avoid constraint violations

  // 1. Delete redemptions (references rewards, users)
  await getSupabaseClient().from('redemptions').delete().eq('client_id', clientId);

  // 2. Delete mission_progress (references missions, users)
  await getSupabaseClient().from('mission_progress').delete().eq('client_id', clientId);

  // 3. Delete missions (references clients)
  await getSupabaseClient().from('missions').delete().eq('client_id', clientId);

  // 4. Delete rewards (references tiers, clients)
  await getSupabaseClient().from('rewards').delete().eq('client_id', clientId);

  // 5. Delete OTP codes (references users)
  const { data: users } = await getSupabaseClient()
    .from('users')
    .select('id')
    .eq('client_id', clientId);

  if (users && users.length > 0) {
    const userIds = users.map(u => u.id);
    await getSupabaseClient().from('otp_codes').delete().in('user_id', userIds);
    await getSupabaseClient().from('password_reset_tokens').delete().in('user_id', userIds);
  }

  // 6. Delete users (references clients, tiers)
  await getSupabaseClient().from('users').delete().eq('client_id', clientId);

  // 7. Delete tiers (references clients)
  await getSupabaseClient().from('tiers').delete().eq('client_id', clientId);

  // 8. Delete client
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
