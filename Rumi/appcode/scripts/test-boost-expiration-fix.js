/**
 * BUG-BOOST-EXPIRATION-STATE Manual Test Script
 *
 * Tests that expire_active_boosts ends in 'expired' state (not 'pending_info')
 * and transition_expired_to_pending_info moves to 'pending_info'.
 *
 * Run with: node scripts/test-boost-expiration-fix.js
 */

const { createClient } = require('@supabase/supabase-js');

// Load from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clientId = process.env.CLIENT_ID;

if (!supabaseUrl || !supabaseServiceKey || !clientId) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_ID');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTest() {
  console.log('='.repeat(60));
  console.log('BUG-BOOST-EXPIRATION-STATE Test Script');
  console.log('='.repeat(60));
  console.log(`Client ID: ${clientId}`);
  console.log('');

  let testRedemptionId = null;
  let testBoostId = null;

  try {
    // =========================================================================
    // STEP 1: Get a test user
    // =========================================================================
    console.log('[STEP 1] Finding test user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('client_id', clientId)
      .limit(1)
      .single();

    if (userError || !user) {
      console.error('No users found for client. Create a user first.');
      process.exit(1);
    }
    console.log(`  Found user_id: ${user.id}`);

    // =========================================================================
    // STEP 2: Get a commission_boost reward
    // =========================================================================
    console.log('[STEP 2] Finding commission_boost reward...');
    const { data: reward, error: rewardError } = await supabase
      .from('rewards')
      .select('id, redemption_type')
      .eq('client_id', clientId)
      .eq('type', 'commission_boost')
      .limit(1)
      .single();

    if (rewardError || !reward) {
      console.error('No commission_boost reward found. Create one first.');
      process.exit(1);
    }
    console.log(`  Found reward_id: ${reward.id}`);
    console.log(`  Redemption type: ${reward.redemption_type}`);

    // =========================================================================
    // STEP 2b: Get user's current tier
    // =========================================================================
    console.log('[STEP 2b] Getting user tier...');
    const { data: userTier } = await supabase
      .from('users')
      .select('current_tier')
      .eq('id', user.id)
      .single();

    const tierAtClaim = userTier?.current_tier || 'tier_1';
    console.log(`  User tier: ${tierAtClaim}`);

    // =========================================================================
    // STEP 3: Create test redemption
    // =========================================================================
    console.log('[STEP 3] Creating test redemption...');
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .insert({
        client_id: clientId,
        user_id: user.id,
        reward_id: reward.id,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        tier_at_claim: tierAtClaim,
        redemption_type: reward.redemption_type || 'scheduled',
      })
      .select('id')
      .single();

    if (redemptionError) {
      console.error('Failed to create redemption:', redemptionError.message);
      process.exit(1);
    }
    testRedemptionId = redemption.id;
    console.log(`  Created redemption_id: ${testRedemptionId}`);

    // =========================================================================
    // STEP 4: Create test boost in 'active' state with expires_at in PAST
    // =========================================================================
    console.log('[STEP 4] Creating test boost (active, expired yesterday)...');
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: boost, error: boostError } = await supabase
      .from('commission_boost_redemptions')
      .insert({
        client_id: clientId,
        redemption_id: testRedemptionId,
        boost_status: 'active',
        scheduled_activation_date: thirtyOneDaysAgo.toISOString().split('T')[0],
        duration_days: 30,
        boost_rate: 5.00,
        activated_at: thirtyOneDaysAgo.toISOString(),
        expires_at: yesterday.toISOString(),
        sales_at_activation: 5000.00,
      })
      .select('id, boost_status')
      .single();

    if (boostError) {
      console.error('Failed to create boost:', boostError.message);
      // Cleanup redemption
      await supabase.from('redemptions').delete().eq('id', testRedemptionId);
      process.exit(1);
    }
    testBoostId = boost.id;
    console.log(`  Created boost_id: ${testBoostId}`);
    console.log(`  Initial boost_status: ${boost.boost_status}`);
    console.log('');

    // =========================================================================
    // TEST 1: Call expire_active_boosts RPC
    // =========================================================================
    console.log('='.repeat(60));
    console.log('[TEST 1] Calling expire_active_boosts RPC...');
    console.log('  Expected: boost transitions to "expired" (NOT "pending_info")');
    console.log('='.repeat(60));

    const { data: expireResult, error: expireError } = await supabase
      .rpc('expire_active_boosts', { p_client_id: clientId });

    if (expireError) {
      console.error('  ERROR: RPC failed:', expireError.message);
      console.error('  Did you apply the migration first?');
    } else {
      console.log(`  RPC returned ${expireResult?.length || 0} expired boosts`);
      if (expireResult && expireResult.length > 0) {
        console.log('  Result:', JSON.stringify(expireResult[0], null, 2));
      }
    }

    // Verify boost status
    const { data: afterExpire } = await supabase
      .from('commission_boost_redemptions')
      .select('boost_status, sales_at_expiration, sales_delta, final_payout_amount')
      .eq('id', testBoostId)
      .single();

    console.log('');
    console.log('  VERIFICATION:');
    console.log(`    boost_status: ${afterExpire?.boost_status}`);
    console.log(`    sales_at_expiration: ${afterExpire?.sales_at_expiration}`);
    console.log(`    sales_delta: ${afterExpire?.sales_delta}`);
    console.log(`    final_payout_amount: ${afterExpire?.final_payout_amount}`);

    if (afterExpire?.boost_status === 'expired') {
      console.log('');
      console.log('  ✅ TEST 1 PASSED: boost_status is "expired"');
    } else if (afterExpire?.boost_status === 'pending_info') {
      console.log('');
      console.log('  ❌ TEST 1 FAILED: boost_status is "pending_info" (bug NOT fixed)');
    } else {
      console.log('');
      console.log(`  ⚠️ TEST 1 UNEXPECTED: boost_status is "${afterExpire?.boost_status}"`);
    }
    console.log('');

    // =========================================================================
    // TEST 2: Call transition_expired_to_pending_info RPC
    // =========================================================================
    console.log('='.repeat(60));
    console.log('[TEST 2] Calling transition_expired_to_pending_info RPC...');
    console.log('  Expected: boost transitions from "expired" to "pending_info"');
    console.log('='.repeat(60));

    const { data: transitionResult, error: transitionError } = await supabase
      .rpc('transition_expired_to_pending_info', { p_client_id: clientId });

    if (transitionError) {
      console.error('  ERROR: RPC failed:', transitionError.message);
      console.error('  Did you apply the migration first?');
    } else {
      console.log(`  RPC returned ${transitionResult?.length || 0} transitioned boosts`);
      if (transitionResult && transitionResult.length > 0) {
        console.log('  Result:', JSON.stringify(transitionResult[0], null, 2));
      }
    }

    // Verify boost status
    const { data: afterTransition } = await supabase
      .from('commission_boost_redemptions')
      .select('boost_status')
      .eq('id', testBoostId)
      .single();

    console.log('');
    console.log('  VERIFICATION:');
    console.log(`    boost_status: ${afterTransition?.boost_status}`);

    if (afterTransition?.boost_status === 'pending_info') {
      console.log('');
      console.log('  ✅ TEST 2 PASSED: boost_status is "pending_info"');
    } else {
      console.log('');
      console.log(`  ❌ TEST 2 FAILED: boost_status is "${afterTransition?.boost_status}"`);
    }
    console.log('');

    // =========================================================================
    // VERIFY: Check state_history has BOTH transitions
    // =========================================================================
    console.log('='.repeat(60));
    console.log('[VERIFY] Checking state_history for both transitions...');
    console.log('='.repeat(60));

    const { data: history } = await supabase
      .from('commission_boost_state_history')
      .select('from_status, to_status, transitioned_at')
      .eq('boost_redemption_id', testBoostId)
      .order('transitioned_at', { ascending: false });

    if (history && history.length > 0) {
      console.log('  State history entries:');
      history.forEach((h, i) => {
        console.log(`    ${i + 1}. ${h.from_status || 'NULL'} → ${h.to_status}`);
      });

      const hasActiveToExpired = history.some(h => h.from_status === 'active' && h.to_status === 'expired');
      const hasExpiredToPendingInfo = history.some(h => h.from_status === 'expired' && h.to_status === 'pending_info');

      console.log('');
      if (hasActiveToExpired && hasExpiredToPendingInfo) {
        console.log('  ✅ STATE HISTORY CORRECT: Both transitions logged');
      } else {
        console.log('  ❌ STATE HISTORY INCOMPLETE:');
        console.log(`     active → expired: ${hasActiveToExpired ? '✅' : '❌'}`);
        console.log(`     expired → pending_info: ${hasExpiredToPendingInfo ? '✅' : '❌'}`);
      }
    } else {
      console.log('  ⚠️ No state history entries found');
    }
    console.log('');

  } finally {
    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log('='.repeat(60));
    console.log('[CLEANUP] Removing test data...');
    console.log('='.repeat(60));

    if (testBoostId) {
      await supabase
        .from('commission_boost_state_history')
        .delete()
        .eq('boost_redemption_id', testBoostId);

      await supabase
        .from('commission_boost_redemptions')
        .delete()
        .eq('id', testBoostId);

      console.log(`  Deleted boost: ${testBoostId}`);
    }

    if (testRedemptionId) {
      await supabase
        .from('redemptions')
        .delete()
        .eq('id', testRedemptionId);

      console.log(`  Deleted redemption: ${testRedemptionId}`);
    }

    console.log('  Cleanup complete.');
    console.log('');
    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
  }
}

runTest().catch(console.error);
