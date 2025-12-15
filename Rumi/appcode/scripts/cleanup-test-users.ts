/**
 * Cleanup Test Users Script
 *
 * Removes test data created by seed-test-users.ts:
 * - Deletes Supabase Auth users for test emails (with pagination)
 * - Deletes users table records with test handles
 * - Cascade deletes videos via FK
 *
 * Usage: npx ts-node scripts/cleanup-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: '.env.local' });

// Test user emails to clean up
const TEST_EMAILS = [
  'testbronze@test.com',
  'testsilver@test.com',
  'testgold@test.com',
  'testplatinum@test.com',
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

async function cleanupTestData() {
  console.log('Starting test data cleanup...\n');

  const supabase = await createAdminClient();

  // Step 1: Delete Supabase Auth users (with pagination)
  console.log('1. Deleting Supabase Auth users...');

  for (const email of TEST_EMAILS) {
    // Find Auth user by email (paginate through all users if needed)
    let existingAuthId: string | null = null;
    let page = 1;
    const perPage = 100;

    while (!existingAuthId) {
      const { data: listData } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      const found = listData?.users?.find((u: { email?: string }) => u.email === email);
      if (found) {
        existingAuthId = found.id;
        break;
      }

      // No more pages - user not found
      if (!listData?.users?.length || listData.users.length < perPage) {
        break;
      }
      page++;
    }

    if (existingAuthId) {
      const { error } = await supabase.auth.admin.deleteUser(existingAuthId);
      if (error) {
        console.log(`   Warning: Could not delete Auth user ${email}: ${error.message}`);
      } else {
        console.log(`   Deleted Auth user: ${email}`);
      }
    } else {
      console.log(`   Auth user not found: ${email}`);
    }
  }

  // Step 2: Delete videos for test users first (FK constraint)
  console.log('\n2. Deleting test videos...');

  // First get test user IDs
  const { data: testUsers } = await supabase
    .from('users')
    .select('id')
    .like('tiktok_handle', 'test%');

  if (testUsers && testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id);
    const { error: videosError } = await supabase
      .from('videos')
      .delete()
      .in('user_id', userIds);

    if (videosError) {
      console.log(`   Warning: Could not delete test videos: ${videosError.message}`);
    } else {
      console.log('   Deleted test videos');
    }
  }

  // Step 3: Delete users table records
  console.log('\n3. Deleting users table records...');

  const { error: deleteUsersError } = await supabase
    .from('users')
    .delete()
    .like('tiktok_handle', 'test%');

  if (deleteUsersError) {
    console.log(`   Warning: Could not delete test users: ${deleteUsersError.message}`);
  } else {
    console.log('   Deleted test users from users table');
  }

  // Step 4: Delete test tiers and client (if test subdomain exists)
  console.log('\n4. Cleaning up test client data...');

  const { data: testClient } = await supabase
    .from('clients')
    .select('id')
    .eq('subdomain', 'test')
    .single();

  if (testClient) {
    const { error: tiersError } = await supabase
      .from('tiers')
      .delete()
      .eq('client_id', testClient.id);

    if (!tiersError) {
      console.log('   Deleted test tiers');
    }

    const { error: clientError } = await supabase
      .from('clients')
      .delete()
      .eq('id', testClient.id);

    if (!clientError) {
      console.log('   Deleted test client');
    }
  } else {
    console.log('   No test client found (subdomain=test)');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Cleanup complete!');
  console.log('='.repeat(50));
  console.log('\nNow run: npx ts-node scripts/seed-test-users.ts');
}

// Run the cleanup
cleanupTestData()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  });
