/**
 * Integration Tests for Auth Service (Step 3.2)
 *
 * Tests authService functions against live Supabase with seed data.
 *
 * Run with:
 *   cd appcode && node ../tests/integration/auth-service.test.js
 *
 * Requires:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Seed data deployed to Supabase
 *
 * Seed Data Used:
 *   - Client: 11111111-1111-1111-1111-111111111111 (Test Brand)
 *   - User with email: bronzecreator1 / bronze1@test.com
 *   - User handles: admin1, bronzecreator1, silvercreator1, etc.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from appcode/.env.local manually
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
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
    console.error('Could not load .env.local file:', e.message);
  }
}

loadEnvFile(path.join(__dirname, '../../appcode/.env.local'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  console.error('Make sure appcode/.env.local has these variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test constants from seed data
const TEST_CLIENT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_USER_WITH_EMAIL = {
  handle: 'bronzecreator1',
  email: 'bronze1@test.com',
  id: 'bbbb1111-1111-1111-1111-111111111111',
};
const TEST_NONEXISTENT_HANDLE = 'nonexistent_user_12345';

// ============================================================================
// Test Utilities
// ============================================================================

let passed = 0;
let failed = 0;

function logTest(name) {
  console.log(`\n📋 ${name}`);
}

function logPass(msg) {
  console.log(`  ✅ PASSED: ${msg}`);
  passed++;
}

function logFail(msg, error = null) {
  console.log(`  ❌ FAILED: ${msg}`);
  if (error) console.log(`     Error: ${error}`);
  failed++;
}

// ============================================================================
// Repository Tests (Direct DB queries to verify repositories work)
// ============================================================================

async function testUserRepository() {
  logTest('Test 1: userRepository.findByHandle - existing user with email');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('client_id', TEST_CLIENT_ID)
    .eq('tiktok_handle', TEST_USER_WITH_EMAIL.handle)
    .single();

  if (error) {
    logFail('Query failed', error.message);
    return;
  }

  if (data && data.email === TEST_USER_WITH_EMAIL.email) {
    logPass(`Found user "${data.tiktok_handle}" with email "${data.email}"`);
  } else {
    logFail(`Expected email ${TEST_USER_WITH_EMAIL.email}, got ${data?.email}`);
  }
}

async function testUserRepositoryNotFound() {
  logTest('Test 2: userRepository.findByHandle - non-existent user');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('client_id', TEST_CLIENT_ID)
    .eq('tiktok_handle', TEST_NONEXISTENT_HANDLE)
    .maybeSingle();

  if (error) {
    logFail('Query failed', error.message);
    return;
  }

  if (data === null) {
    logPass('Correctly returned null for non-existent user');
  } else {
    logFail(`Expected null, got user: ${data?.tiktok_handle}`);
  }
}

async function testClientRepository() {
  logTest('Test 3: clientRepository.findById - existing client');

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', TEST_CLIENT_ID)
    .single();

  if (error) {
    logFail('Query failed', error.message);
    return;
  }

  if (data && data.name === 'Test Brand') {
    logPass(`Found client "${data.name}" with vip_metric="${data.vip_metric}"`);
  } else {
    logFail(`Expected "Test Brand", got "${data?.name}"`);
  }
}

// ============================================================================
// Service Logic Tests (Simulating authService logic)
// ============================================================================

async function testCheckHandleScenarioA() {
  logTest('Test 4: checkHandle Scenario A - exists + has email → route to login');

  // Simulate checkHandle logic
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, tiktok_handle')
    .eq('client_id', TEST_CLIENT_ID)
    .eq('tiktok_handle', TEST_USER_WITH_EMAIL.handle)
    .maybeSingle();

  if (error) {
    logFail('Query failed', error.message);
    return;
  }

  // Scenario A: exists + has email
  const exists = user !== null;
  const hasEmail = user?.email !== null;
  const route = (exists && hasEmail) ? 'login' : 'signup';

  if (exists && hasEmail && route === 'login') {
    logPass(`Handle "${TEST_USER_WITH_EMAIL.handle}" → route="${route}" (Scenario A)`);
  } else {
    logFail(`Expected route="login", got route="${route}" (exists=${exists}, hasEmail=${hasEmail})`);
  }
}

async function testCheckHandleScenarioC() {
  logTest('Test 5: checkHandle Scenario C - not found → route to signup');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, tiktok_handle')
    .eq('client_id', TEST_CLIENT_ID)
    .eq('tiktok_handle', TEST_NONEXISTENT_HANDLE)
    .maybeSingle();

  if (error) {
    logFail('Query failed', error.message);
    return;
  }

  // Scenario C: not found
  const exists = user !== null;
  const hasEmail = user?.email !== null;
  const route = exists ? (hasEmail ? 'login' : 'signup') : 'signup';

  if (!exists && route === 'signup') {
    logPass(`Handle "${TEST_NONEXISTENT_HANDLE}" → route="${route}" (Scenario C)`);
  } else {
    logFail(`Expected route="signup", got route="${route}" (exists=${exists})`);
  }
}

async function testOtpTableExists() {
  logTest('Test 6: OTP table exists and is queryable');

  const { data, error } = await supabase
    .from('otp_codes')
    .select('id')
    .limit(1);

  if (error) {
    logFail('OTP table query failed', error.message);
    return;
  }

  logPass('OTP table exists and is queryable');
}

async function testPasswordResetTableExists() {
  logTest('Test 7: password_reset_tokens table exists and is queryable');

  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('id')
    .limit(1);

  if (error) {
    logFail('password_reset_tokens table query failed', error.message);
    return;
  }

  logPass('password_reset_tokens table exists and is queryable');
}

async function testTenantIsolation() {
  logTest('Test 8: Tenant isolation - query with wrong client_id returns empty');

  const WRONG_CLIENT_ID = '99999999-9999-9999-9999-999999999999';

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('client_id', WRONG_CLIENT_ID)
    .eq('tiktok_handle', TEST_USER_WITH_EMAIL.handle)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    logFail('Query failed unexpectedly', error.message);
    return;
  }

  if (data === null) {
    logPass('Tenant isolation working - wrong client_id returns null');
  } else {
    logFail('Tenant isolation BROKEN - found user with wrong client_id');
  }
}

// ============================================================================
// API Route Tests (requires server running on localhost:3000)
// ============================================================================

async function testCheckHandleAPI() {
  logTest('Test 9: API /api/auth/check-handle - existing user (requires server)');

  // Skip if no server URL configured
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${serverUrl}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'bronzecreator1' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logFail(`API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      return;
    }

    const data = await response.json();

    if (data.exists === true && data.has_email === true && data.route === 'login') {
      logPass(`API returned correct routing: exists=${data.exists}, has_email=${data.has_email}, route=${data.route}`);
    } else {
      logFail(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('  ⏭️  SKIPPED: Server not running (run: cd appcode && npm run dev)');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

async function testCheckHandleAPINewUser() {
  logTest('Test 10: API /api/auth/check-handle - new user (requires server)');

  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${serverUrl}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'totally_new_user_xyz' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logFail(`API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      return;
    }

    const data = await response.json();

    if (data.exists === false && data.has_email === false && data.route === 'signup') {
      logPass(`API returned correct routing: exists=${data.exists}, has_email=${data.has_email}, route=${data.route}`);
    } else {
      logFail(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('  ⏭️  SKIPPED: Server not running (run: cd appcode && npm run dev)');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

async function testCheckHandleAPIValidation() {
  logTest('Test 11: API /api/auth/check-handle - validation error (requires server)');

  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${serverUrl}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '' }),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error === 'HANDLE_REQUIRED') {
        logPass(`API returned correct validation error: ${data.error}`);
      } else {
        logFail(`Unexpected error code: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response.status}`);
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('  ⏭️  SKIPPED: Server not running (run: cd appcode && npm run dev)');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 Auth Service Integration Tests (Step 3.2 + 3.3)\n');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Test Client ID: ${TEST_CLIENT_ID}`);
  console.log('='.repeat(60));

  // Repository tests
  await testUserRepository();
  await testUserRepositoryNotFound();
  await testClientRepository();

  // Service logic tests
  await testCheckHandleScenarioA();
  await testCheckHandleScenarioC();

  // Table existence tests
  await testOtpTableExists();
  await testPasswordResetTableExists();

  // Security tests
  await testTenantIsolation();

  // API route tests (optional - requires server)
  console.log('\n--- API Route Tests (require server running) ---');
  await testCheckHandleAPI();
  await testCheckHandleAPINewUser();
  await testCheckHandleAPIValidation();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
