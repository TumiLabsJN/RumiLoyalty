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
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

const BCRYPT_ROUNDS = 10;
const TEST_PASSWORD = 'TestPass123!';

// IDs for referential integrity
const CLIENT_ID = randomUUID();
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
interface TestUser {
  id: string;
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
    id: randomUUID(),
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
    id: randomUUID(),
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
    id: randomUUID(),
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
    id: randomUUID(),
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

  // Step 1: Create test client (SchemaFinalv2.md lines 106-120)
  console.log('1. Creating test client...');
  const { error: clientError } = await supabase.from('clients').insert({
    id: CLIENT_ID,
    name: 'Test Client',
    subdomain: 'test',
    logo_url: 'https://placehold.co/200x200/EC4899/white?text=TEST', // Placeholder logo
    primary_color: '#EC4899',
    tier_calculation_mode: 'fixed_checkpoint',
    checkpoint_months: 4,
    vip_metric: 'sales',
  });

  if (clientError) {
    if (clientError.code === '23505') {
      console.log('   Client already exists, continuing...');
    } else {
      throw new Error(`Failed to create client: ${clientError.message}`);
    }
  } else {
    console.log(`   Created client: ${CLIENT_ID}`);
  }

  // Step 2: Create tiers (SchemaFinalv2.md lines 254-272)
  console.log('\n2. Creating tiers...');
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
  }

  // Step 3: Create users (SchemaFinalv2.md lines 123-155)
  console.log('\n3. Creating test users...');
  for (const user of TEST_USERS) {
    const { error: userError } = await supabase.from('users').insert({
      // Core fields (lines 128-136)
      id: user.id,
      client_id: CLIENT_ID,
      tiktok_handle: user.tiktok_handle,
      email: user.email,
      email_verified: true,
      password_hash: passwordHash,
      terms_accepted_at: now,
      terms_version: '2025-01-18',
      is_admin: false,
      // Tier fields (lines 137-141)
      current_tier: user.current_tier, // VARCHAR(50): 'tier_1', 'tier_2', etc.
      tier_achieved_at: now,
      next_checkpoint_at: user.next_checkpoint_at?.toISOString() || null,
      checkpoint_sales_target: user.checkpoint_sales_target,
      checkpoint_units_target: user.checkpoint_units_target,
      // Precomputed: Leaderboard (line 143)
      leaderboard_rank: user.leaderboard_rank,
      total_sales: user.checkpoint_sales_current,
      total_units: user.checkpoint_units_current,
      manual_adjustments_total: 0,
      manual_adjustments_units: 0,
      // Precomputed: Checkpoint progress (line 144)
      checkpoint_sales_current: user.checkpoint_sales_current,
      checkpoint_units_current: user.checkpoint_units_current,
      projected_tier_at_checkpoint: user.projected_tier_at_checkpoint,
      // Precomputed: Engagement (line 145)
      checkpoint_videos_posted: user.video_count,
      checkpoint_total_views: user.checkpoint_total_views,
      checkpoint_total_likes: user.checkpoint_total_likes,
      checkpoint_total_comments: user.checkpoint_total_comments,
      // Precomputed: Next tier (line 146)
      next_tier_name: user.next_tier_name,
      next_tier_threshold: user.next_tier_threshold,
      next_tier_threshold_units: user.next_tier_threshold_units,
      // Precomputed: Historical (line 147)
      checkpoint_progress_updated_at: now,
      // Other fields (lines 152-154)
      first_video_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_login_at: now,
    });

    if (userError) {
      if (userError.code === '23505') {
        console.log(`   User @${user.tiktok_handle} already exists, continuing...`);
      } else {
        throw new Error(`Failed to create user @${user.tiktok_handle}: ${userError.message}`);
      }
    } else {
      console.log(`   Created user: @${user.tiktok_handle} (${user.current_tier})`);
    }
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
        user_id: user.id,
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
