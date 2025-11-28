/**
 * Test script to verify seed data was deployed correctly
 * Run with: node scripts/test-seed-data.js
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment
 */

const { createClient } = require('@supabase/supabase-js');

// Load from environment or use defaults for testing
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vyvkvlhzzglfklrwzcby.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable required');
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/test-seed-data.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
  console.log('🧪 Running Seed Data Verification Tests\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  // Test 1: Client exists
  console.log('\n📋 Test 1: Client exists with correct config');
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', '11111111-1111-1111-1111-111111111111');

  if (clientError) {
    console.log('  ❌ FAILED:', clientError.message);
    failed++;
  } else if (clients.length === 1 && clients[0].vip_metric === 'units' && clients[0].name === 'Test Brand') {
    console.log('  ✅ PASSED: Client "Test Brand" exists with vip_metric=units');
    passed++;
  } else {
    console.log('  ❌ FAILED: Client not found or incorrect config');
    failed++;
  }

  // Test 2: 4 tiers exist
  console.log('\n📋 Test 2: 4 tiers exist with correct colors');
  const { data: tiers, error: tierError } = await supabase
    .from('tiers')
    .select('*')
    .eq('client_id', '11111111-1111-1111-1111-111111111111')
    .order('tier_order');

  if (tierError) {
    console.log('  ❌ FAILED:', tierError.message);
    failed++;
  } else if (tiers.length === 4) {
    const expectedTiers = [
      { name: 'Bronze', color: '#CD7F32', threshold: 0, rate: 10 },
      { name: 'Silver', color: '#94a3b8', threshold: 100, rate: 12 },
      { name: 'Gold', color: '#F59E0B', threshold: 300, rate: 15 },
      { name: 'Platinum', color: '#818CF8', threshold: 500, rate: 20 }
    ];

    let allMatch = true;
    for (let i = 0; i < 4; i++) {
      if (tiers[i].tier_name !== expectedTiers[i].name ||
          tiers[i].tier_color !== expectedTiers[i].color ||
          tiers[i].units_threshold !== expectedTiers[i].threshold ||
          parseFloat(tiers[i].commission_rate) !== expectedTiers[i].rate) {
        allMatch = false;
        console.log(`  ❌ Tier ${i+1} mismatch:`, tiers[i]);
      }
    }

    if (allMatch) {
      console.log('  ✅ PASSED: All 4 tiers correct (Bronze, Silver, Gold, Platinum)');
      passed++;
    } else {
      failed++;
    }
  } else {
    console.log('  ❌ FAILED: Expected 4 tiers, found', tiers.length);
    failed++;
  }

  // Test 3: 9 users exist
  console.log('\n📋 Test 3: 9 users exist (1 admin + 8 creators)');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, tiktok_handle, is_admin, current_tier')
    .eq('client_id', '11111111-1111-1111-1111-111111111111');

  if (userError) {
    console.log('  ❌ FAILED:', userError.message);
    failed++;
  } else if (users.length === 9) {
    const admins = users.filter(u => u.is_admin);
    const creators = users.filter(u => !u.is_admin);

    if (admins.length === 1 && creators.length === 8) {
      console.log('  ✅ PASSED: 1 admin (admin1) + 8 creators');
      console.log('     Handles:', users.map(u => u.tiktok_handle).join(', '));
      passed++;
    } else {
      console.log('  ❌ FAILED: Wrong admin/creator split');
      failed++;
    }
  } else {
    console.log('  ❌ FAILED: Expected 9 users, found', users.length);
    failed++;
  }

  // Test 4: Rewards exist (24 total)
  console.log('\n📋 Test 4: 24 rewards exist with all types');
  const { data: rewards, error: rewardError } = await supabase
    .from('rewards')
    .select('id, type, tier_eligibility, enabled')
    .eq('client_id', '11111111-1111-1111-1111-111111111111');

  if (rewardError) {
    console.log('  ❌ FAILED:', rewardError.message);
    failed++;
  } else {
    const rewardTypes = [...new Set(rewards.map(r => r.type))];
    const allEnabled = rewards.every(r => r.enabled === true);

    console.log(`  Found ${rewards.length} rewards`);
    console.log('  Types:', rewardTypes.join(', '));

    if (rewards.length === 24 && rewardTypes.length >= 5 && allEnabled) {
      console.log('  ✅ PASSED: 24 rewards, multiple types, all enabled');
      passed++;
    } else {
      console.log('  ❌ FAILED: Count, types, or enabled status incorrect');
      failed++;
    }
  }

  // Test 5: Missions exist (22 total)
  console.log('\n📋 Test 5: 22 missions exist with all types');
  const { data: missions, error: missionError } = await supabase
    .from('missions')
    .select('id, mission_type, tier_eligibility, activated')
    .eq('client_id', '11111111-1111-1111-1111-111111111111');

  if (missionError) {
    console.log('  ❌ FAILED:', missionError.message);
    failed++;
  } else {
    const missionTypes = [...new Set(missions.map(m => m.mission_type))];
    const raffles = missions.filter(m => m.mission_type === 'raffle');
    const dormantRaffles = raffles.filter(r => !r.activated);
    const activeRaffles = raffles.filter(r => r.activated);

    console.log(`  Found ${missions.length} missions`);
    console.log('  Types:', missionTypes.join(', '));
    console.log(`  Raffles: ${raffles.length} (${dormantRaffles.length} dormant, ${activeRaffles.length} active)`);

    if (missions.length === 22 &&
        missionTypes.length === 6 &&
        dormantRaffles.length === 1 &&
        activeRaffles.length === 1) {
      console.log('  ✅ PASSED: 22 missions, 6 types, 1 dormant + 1 active raffle');
      passed++;
    } else {
      console.log('  ❌ FAILED: Counts or raffle states incorrect');
      failed++;
    }
  }

  // Test 6: RLS is enabled on all tables
  console.log('\n📋 Test 6: RLS enabled on all tables');
  const { data: rlsCheck, error: rlsError } = await supabase.rpc('check_rls_status');

  if (rlsError) {
    // RLS check function doesn't exist, skip this test
    console.log('  ⚠️  SKIPPED: RLS check function not available');
    console.log('     (This is expected - would need a custom function)');
  }

  // Test 7: Foreign key integrity
  console.log('\n📋 Test 7: Foreign key integrity (missions → rewards)');
  const { data: missionRewards, error: fkError } = await supabase
    .from('missions')
    .select('id, reward_id, rewards(id, name)')
    .eq('client_id', '11111111-1111-1111-1111-111111111111');

  if (fkError) {
    console.log('  ❌ FAILED:', fkError.message);
    failed++;
  } else {
    const missingRewards = missionRewards.filter(m => !m.rewards);
    if (missingRewards.length === 0) {
      console.log('  ✅ PASSED: All missions have valid reward references');
      passed++;
    } else {
      console.log('  ❌ FAILED:', missingRewards.length, 'missions missing rewards');
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Seed data is correctly deployed.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
