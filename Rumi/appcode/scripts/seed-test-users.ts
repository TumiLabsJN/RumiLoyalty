/**
 * Seed Test Users Script
 *
 * Creates test data for Phase 9 frontend integration testing:
 * - 1 test client (vip_metric='sales')
 * - 4 tiers (tier_1 through tier_4)
 * - 4 test users at different VIP levels
 * - Video records for each user
 *
 * Usage: npx ts-node scripts/seed-test-users.ts
 *
 * References: SchemaFinalv2.md (clients 106-120, users 123-155, tiers 254-272, videos 227-251)
 */

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

const BCRYPT_ROUNDS = 10;
const TEST_PASSWORD = 'TestPass123!';

// IDs for referential integrity
// CLIENT_ID must be set in .env.local - fail fast if missing
const CLIENT_ID = process.env.CLIENT_ID;
if (!CLIENT_ID) {
  console.error('❌ ERROR: CLIENT_ID not set in .env.local');
  console.error('   The seed script requires a valid CLIENT_ID to match the app configuration.');
  console.error('   Run: echo "CLIENT_ID=your-uuid-here" >> .env.local');
  process.exit(1);
}
const TIER_IDS = {
  tier_1: randomUUID(),
  tier_2: randomUUID(),
  tier_3: randomUUID(),
  tier_4: randomUUID(),
};

// Tier configuration matching SchemaFinalv2.md lines 254-272
const TIER_CONFIG = [
  {
    id: TIER_IDS.tier_1,
    tier_order: 1,
    tier_id: 'tier_1',
    tier_name: 'Bronze',
    tier_color: '#CD7F32',
    sales_threshold: 0,
    units_threshold: 0,
    commission_rate: 10.0,
    checkpoint_exempt: true,
  },
  {
    id: TIER_IDS.tier_2,
    tier_order: 2,
    tier_id: 'tier_2',
    tier_name: 'Silver',
    tier_color: '#C0C0C0',
    sales_threshold: 1000,
    units_threshold: 100,
    commission_rate: 12.5,
    checkpoint_exempt: false,
  },
  {
    id: TIER_IDS.tier_3,
    tier_order: 3,
    tier_id: 'tier_3',
    tier_name: 'Gold',
    tier_color: '#FFD700',
    sales_threshold: 3000,
    units_threshold: 300,
    commission_rate: 15.0,
    checkpoint_exempt: false,
  },
  {
    id: TIER_IDS.tier_4,
    tier_order: 4,
    tier_id: 'tier_4',
    tier_name: 'Platinum',
    tier_color: '#E5E4E2',
    sales_threshold: 5000,
    units_threshold: 500,
    commission_rate: 20.0,
    checkpoint_exempt: false,
  },
];

// Test user configuration matching SchemaFinalv2.md lines 123-155
// Note: id field removed - will be assigned from Supabase Auth user ID
interface TestUser {
  tiktok_handle: string;
  email: string;
  // current_tier uses tier_id string per schema line 137: VARCHAR(50) DEFAULT 'tier_1'
  current_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  checkpoint_sales_current: number;
  checkpoint_units_current: number;
  next_checkpoint_at: Date | null;
  video_count: number;
  // Precomputed fields per schema lines 142-147
  leaderboard_rank: number;
  checkpoint_sales_target: number;
  checkpoint_units_target: number;
  projected_tier_at_checkpoint: string;
  next_tier_name: string | null;
  next_tier_threshold: number | null;
  next_tier_threshold_units: number | null;
  // Engagement stats (will be calculated from videos)
  checkpoint_total_views: number;
  checkpoint_total_likes: number;
  checkpoint_total_comments: number;
}

const TEST_USERS: TestUser[] = [
  {
    tiktok_handle: 'testbronze',
    email: 'testbronze@test.com',
    current_tier: 'tier_1',
    checkpoint_sales_current: 250,
    checkpoint_units_current: 25,
    next_checkpoint_at: null, // Bronze is checkpoint_exempt per schema line 268
    video_count: 2,
    leaderboard_rank: 4,
    checkpoint_sales_target: 0, // Bronze has no target (checkpoint_exempt)
    checkpoint_units_target: 0,
    projected_tier_at_checkpoint: 'tier_1',
    next_tier_name: 'Silver',
    next_tier_threshold: 1000,
    next_tier_threshold_units: 100,
    checkpoint_total_views: 5000,
    checkpoint_total_likes: 250,
    checkpoint_total_comments: 50,
  },
  {
    tiktok_handle: 'testsilver',
    email: 'testsilver@test.com',
    current_tier: 'tier_2',
    checkpoint_sales_current: 1500,
    checkpoint_units_current: 150,
    next_checkpoint_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    video_count: 10,
    leaderboard_rank: 3,
    checkpoint_sales_target: 1000, // Must maintain Silver threshold
    checkpoint_units_target: 100,
    projected_tier_at_checkpoint: 'tier_2',
    next_tier_name: 'Gold',
    next_tier_threshold: 3000,
    next_tier_threshold_units: 300,
    checkpoint_total_views: 25000,
    checkpoint_total_likes: 1250,
    checkpoint_total_comments: 250,
  },
  {
    tiktok_handle: 'testgold',
    email: 'testgold@test.com',
    current_tier: 'tier_3',
    checkpoint_sales_current: 3500,
    checkpoint_units_current: 350,
    next_checkpoint_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    video_count: 25,
    leaderboard_rank: 2,
    checkpoint_sales_target: 3000, // Must maintain Gold threshold
    checkpoint_units_target: 300,
    projected_tier_at_checkpoint: 'tier_3',
    next_tier_name: 'Platinum',
    next_tier_threshold: 5000,
    next_tier_threshold_units: 500,
    checkpoint_total_views: 75000,
    checkpoint_total_likes: 3750,
    checkpoint_total_comments: 750,
  },
  {
    tiktok_handle: 'testplatinum',
    email: 'testplatinum@test.com',
    current_tier: 'tier_4',
    checkpoint_sales_current: 8000,
    checkpoint_units_current: 800,
    next_checkpoint_at: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
    video_count: 50,
    leaderboard_rank: 1,
    checkpoint_sales_target: 5000, // Must maintain Platinum threshold
    checkpoint_units_target: 500,
    projected_tier_at_checkpoint: 'tier_4',
    next_tier_name: null, // Already at highest tier
    next_tier_threshold: null,
    next_tier_threshold_units: null,
    checkpoint_total_views: 200000,
    checkpoint_total_likes: 10000,
    checkpoint_total_comments: 2000,
  },
];

async function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function seedTestData() {
  console.log('Starting test data seed...\n');

  const supabase = await createAdminClient();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  // Step 0: Clean up existing test data (if any)
  console.log('0. Cleaning up existing test data...');

  // Delete test users first (FK constraint)
  const { error: deleteUsersError } = await supabase
    .from('users')
    .delete()
    .like('tiktok_handle', 'test%');
  if (deleteUsersError) {
    console.log(`   Warning: Could not delete test users: ${deleteUsersError.message}`);
  } else {
    console.log('   Deleted existing test users');
  }

  // Delete test videos (orphaned after user delete)
  // Videos are deleted via cascade from users

  // Delete test tiers
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('subdomain', 'test')
    .single();

  if (existingClient) {
    const { error: deleteTiersError } = await supabase
      .from('tiers')
      .delete()
      .eq('client_id', existingClient.id);
    if (deleteTiersError) {
      console.log(`   Warning: Could not delete test tiers: ${deleteTiersError.message}`);
    } else {
      console.log('   Deleted existing test tiers');
    }

    // Delete test client
    const { error: deleteClientError } = await supabase
      .from('clients')
      .delete()
      .eq('id', existingClient.id);
    if (deleteClientError) {
      console.log(`   Warning: Could not delete test client: ${deleteClientError.message}`);
    } else {
      console.log('   Deleted existing test client');
    }
  }

  // Step 1: Check if client exists or create test client
  console.log('\n1. Checking/Creating client...');
  const { data: configuredClient } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', CLIENT_ID)
    .single();

  if (configuredClient) {
    console.log(`   Using existing client: ${configuredClient.name} (${CLIENT_ID})`);
  } else {
    // Create new test client if doesn't exist
    const { error: clientError } = await supabase.from('clients').insert({
      id: CLIENT_ID,
      name: 'Test Client',
      subdomain: 'test',
      logo_url: 'https://placehold.co/200x200/EC4899/white?text=TEST',
      primary_color: '#EC4899',
      tier_calculation_mode: 'fixed_checkpoint',
      checkpoint_months: 4,
      vip_metric: 'sales',
    });

    if (clientError) {
      throw new Error(`Failed to create client: ${clientError.message}`);
    }
    console.log(`   Created client: ${CLIENT_ID}`);
  }

  // Step 2: Check existing tiers or create new ones
  console.log('\n2. Checking/Creating tiers...');

  // Check if tiers exist for this client
  const { data: existingTiers } = await supabase
    .from('tiers')
    .select('id, tier_id, tier_name')
    .eq('client_id', CLIENT_ID);

  // Build tier ID mapping (use existing or create new)
  const tierIdMap: Record<string, string> = {};

  if (existingTiers && existingTiers.length > 0) {
    // Use existing tier IDs
    for (const tier of existingTiers) {
      tierIdMap[tier.tier_id] = tier.id;
      console.log(`   Using existing tier: ${tier.tier_name} (${tier.tier_id})`);
    }
  } else {
    // Create new tiers
    for (const tier of TIER_CONFIG) {
      const { error: tierError } = await supabase.from('tiers').insert({
        ...tier,
        client_id: CLIENT_ID,
      });
      if (tierError) {
        if (tierError.code === '23505') {
          console.log(`   Tier ${tier.tier_name} already exists, continuing...`);
        } else {
          throw new Error(`Failed to create tier ${tier.tier_name}: ${tierError.message}`);
        }
      } else {
        console.log(`   Created tier: ${tier.tier_name} (${tier.tier_id})`);
      }
      tierIdMap[tier.tier_id] = tier.id;
    }
  }

  // Helper to get tier UUID from tier_id string
  const getTierUUID = (tierId: string): string => {
    return tierIdMap[tierId] || TIER_IDS[tierId as keyof typeof TIER_IDS];
  };

  // Step 3: Create test users with proper Supabase Auth integration
  // This mirrors production signup flow: Auth user first, then users table
  console.log('\n3. Creating test users with Supabase Auth...');

  // Track created user IDs for video creation
  const userIdMap: Record<string, string> = {};

  for (const user of TEST_USERS) {
    // 3a. Try to create Supabase Auth user FIRST (mirrors production signup)
    let authUserId: string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: TEST_PASSWORD,
      email_confirm: true,  // Auto-confirm for test users
    });

    // 3b. Handle "already exists" error gracefully (avoids listUsers pagination issues)
    if (authError?.message?.includes('already been registered')) {
      console.log(`   Auth user exists for ${user.email}, finding and deleting...`);

      // Find existing user by email (paginate through all users if needed)
      let existingAuthId: string | null = null;
      let page = 1;
      const perPage = 100;

      while (!existingAuthId) {
        const { data: listData } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

        const found = listData?.users?.find((u: { email?: string }) => u.email === user.email);
        if (found) {
          existingAuthId = found.id;
          break;
        }

        // No more pages
        if (!listData?.users?.length || listData.users.length < perPage) {
          throw new Error(`Could not find existing Auth user for ${user.email}`);
        }
        page++;
      }

      // Delete existing Auth user
      await supabase.auth.admin.deleteUser(existingAuthId);
      console.log(`   Deleted existing Auth user: ${existingAuthId}`);

      // Retry creation
      const { data: retryData, error: retryError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });

      if (retryError || !retryData.user) {
        throw new Error(`Failed to create Auth user for ${user.email}: ${retryError?.message}`);
      }
      authUserId = retryData.user.id;
    } else if (authError || !authData.user) {
      throw new Error(`Failed to create Auth user for ${user.email}: ${authError?.message}`);
    } else {
      authUserId = authData.user.id;
    }

    console.log(`   Created Auth user: ${user.email} (${authUserId})`);

    // Store for video creation
    userIdMap[user.tiktok_handle] = authUserId;

    // 3c. Insert into users table with Auth ID (matches production flow)
    const { error: userError } = await supabase.from('users').insert({
      // Core fields - using Auth ID as users.id
      id: authUserId,  // Uses Supabase Auth ID - matches production flow
      client_id: CLIENT_ID,
      tiktok_handle: user.tiktok_handle,
      email: user.email,
      email_verified: true,
      password_hash: '[managed-by-supabase-auth]',  // Supabase manages password
      terms_accepted_at: now,
      terms_version: '2025-01-18',
      is_admin: false,
      // Tier fields
      current_tier: user.current_tier,  // VARCHAR column - store 'tier_1' string directly
      tier_achieved_at: now,
      next_checkpoint_at: user.next_checkpoint_at?.toISOString() || null,
      checkpoint_sales_target: user.checkpoint_sales_target,
      checkpoint_units_target: user.checkpoint_units_target,
      // Precomputed: Leaderboard
      leaderboard_rank: user.leaderboard_rank,
      total_sales: user.checkpoint_sales_current,
      total_units: user.checkpoint_units_current,
      manual_adjustments_total: 0,
      manual_adjustments_units: 0,
      // Precomputed: Checkpoint progress
      checkpoint_sales_current: user.checkpoint_sales_current,
      checkpoint_units_current: user.checkpoint_units_current,
      projected_tier_at_checkpoint: getTierUUID(user.projected_tier_at_checkpoint),
      // Precomputed: Engagement
      checkpoint_videos_posted: user.video_count,
      checkpoint_total_views: user.checkpoint_total_views,
      checkpoint_total_likes: user.checkpoint_total_likes,
      checkpoint_total_comments: user.checkpoint_total_comments,
      // Precomputed: Next tier
      next_tier_name: user.next_tier_name,
      next_tier_threshold: user.next_tier_threshold,
      next_tier_threshold_units: user.next_tier_threshold_units,
      // Precomputed: Historical
      checkpoint_progress_updated_at: now,
      // Other fields
      first_video_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_login_at: null,  // Will be set on first login (for isRecognized detection)
    });

    if (userError) {
      // Rollback: delete Auth user if users table insert fails
      await supabase.auth.admin.deleteUser(authUserId);
      throw new Error(`Failed to create user @${user.tiktok_handle}: ${userError.message}`);
    }

    console.log(`   Created user: @${user.tiktok_handle} (${user.current_tier})`);
  }

  // Step 4: Create video records (SchemaFinalv2.md lines 227-251)
  console.log('\n4. Creating video records...');
  for (const user of TEST_USERS) {
    const videos = [];
    const viewsPerVideo = Math.floor(user.checkpoint_total_views / user.video_count);
    const likesPerVideo = Math.floor(user.checkpoint_total_likes / user.video_count);
    const commentsPerVideo = Math.floor(user.checkpoint_total_comments / user.video_count);

    for (let i = 0; i < user.video_count; i++) {
      videos.push({
        id: randomUUID(),
        user_id: userIdMap[user.tiktok_handle],
        client_id: CLIENT_ID,
        video_url: `https://tiktok.com/@${user.tiktok_handle}/video/${randomUUID()}`,
        video_title: `Test Video ${i + 1} by @${user.tiktok_handle}`,
        post_date: new Date(Date.now() - (user.video_count - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        views: viewsPerVideo + Math.floor(Math.random() * 500),
        likes: likesPerVideo + Math.floor(Math.random() * 50),
        comments: commentsPerVideo + Math.floor(Math.random() * 10),
        gmv: (user.checkpoint_sales_current / user.video_count) + Math.random() * 10,
        ctr: Math.random() * 5 + 1, // CTR between 1% and 6% (line 242)
        units_sold: Math.floor(user.checkpoint_units_current / user.video_count) + 1,
        sync_date: new Date().toISOString(),
      });
    }

    const { error: videosError } = await supabase.from('videos').insert(videos);
    if (videosError) {
      if (videosError.code === '23505') {
        console.log(`   Videos for @${user.tiktok_handle} already exist, continuing...`);
      } else {
        throw new Error(`Failed to create videos for @${user.tiktok_handle}: ${videosError.message}`);
      }
    } else {
      console.log(`   Created ${user.video_count} videos for @${user.tiktok_handle}`);
    }
  }

  // Step 5: Create mission progress records for test users
  console.log('\n5. Creating mission progress records...');

  // Get missions for this client
  const { data: missions, error: missionsError } = await supabase
    .from('missions')
    .select('id, mission_type, tier_eligibility, target_value, display_name')
    .eq('client_id', CLIENT_ID)
    .eq('enabled', true);

  if (missionsError) {
    console.log(`   Warning: Could not fetch missions: ${missionsError.message}`);
  } else if (missions && missions.length > 0) {
    console.log(`   Found ${missions.length} missions for client`);

    for (const user of TEST_USERS) {
      const userId = userIdMap[user.tiktok_handle];

      // Find missions eligible for this user's tier
      const eligibleMissions = missions.filter(
        (m) => m.tier_eligibility === 'all' || m.tier_eligibility === user.current_tier
      );

      for (const mission of eligibleMissions) {
        // Calculate progress based on user tier (higher tier = more progress)
        const tierIndex = ['tier_1', 'tier_2', 'tier_3', 'tier_4'].indexOf(user.current_tier);
        const progressPercent = Math.min(0.3 + tierIndex * 0.2, 0.9); // 30% to 90%
        const currentValue = Math.floor((mission.target_value || 100) * progressPercent);

        // First try to delete any existing progress for this mission/user
        await supabase
          .from('mission_progress')
          .delete()
          .eq('mission_id', mission.id)
          .eq('user_id', userId);

        // Then insert fresh
        const { error: progressError } = await supabase.from('mission_progress').insert({
          id: randomUUID(),
          mission_id: mission.id,
          user_id: userId,
          client_id: CLIENT_ID,
          current_value: currentValue,
          status: 'active',
          checkpoint_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          checkpoint_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (progressError) {
          console.log(`   Warning: Could not create progress for ${mission.display_name}: ${progressError.message}`);
        }
      }

      console.log(`   Created progress for @${user.tiktok_handle} (${eligibleMissions.length} missions)`);
    }
  } else {
    console.log('   No missions found for client - skipping progress creation');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed complete!');
  console.log('='.repeat(50));
  console.log('\nTest credentials:');
  console.log(`   Password for all users: ${TEST_PASSWORD}`);
  console.log('\nTest users:');
  console.log('   Handle          | Tier     | Sales    | Next Checkpoint');
  console.log('   ' + '-'.repeat(55));
  for (const user of TEST_USERS) {
    const tierName = TIER_CONFIG.find(t => t.tier_id === user.current_tier)?.tier_name || user.current_tier;
    const checkpoint = user.next_checkpoint_at
      ? user.next_checkpoint_at.toISOString().split('T')[0]
      : 'N/A (exempt)';
    console.log(
      `   @${user.tiktok_handle.padEnd(13)} | ${tierName.padEnd(8)} | $${user.checkpoint_sales_current.toString().padStart(6)} | ${checkpoint}`
    );
  }
  console.log('\nClient ID: ' + CLIENT_ID);
}

// Run the seed
seedTestData()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  });
