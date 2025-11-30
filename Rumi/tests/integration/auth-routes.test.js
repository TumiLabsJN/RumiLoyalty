/**
 * Integration Tests for Auth API Routes (Step 3.3)
 *
 * Tests all 8 auth API routes against a running dev server.
 *
 * Run with:
 *   1. Start dev server: cd appcode && npm run dev
 *   2. Run tests: node tests/integration/auth-routes.test.js
 *
 * Requires:
 *   - Dev server running on localhost:3000
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in appcode/.env.local
 *   - CLIENT_ID in appcode/.env.local
 *   - Seed data deployed to Supabase
 *
 * Seed Data Used:
 *   - Client: 11111111-1111-1111-1111-111111111111 (Test Brand)
 *   - User: bronzecreator1 / bronze1@test.com / Password123!
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from appcode/.env.local
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

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';

// Test constants
const TEST_EXISTING_USER = {
  handle: 'bronzecreator1',
  email: 'bronze1@test.com',
  password: 'Password123!',
};

const TEST_NEW_USER = {
  handle: 'newuser_' + Date.now(),
  email: `newuser_${Date.now()}@test.com`,
  password: 'TestPassword123!',
};

// ============================================================================
// Test Utilities
// ============================================================================

let passed = 0;
let failed = 0;
let skipped = 0;

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

function logSkip(msg) {
  console.log(`  ⏭️  SKIPPED: ${msg}`);
  skipped++;
}

async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// Route Tests
// ============================================================================

// Test 1: POST /api/auth/check-handle - Existing user
async function testCheckHandleExisting() {
  logTest('Test 1: POST /api/auth/check-handle - existing user');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: TEST_EXISTING_USER.handle }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logFail(`API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      return;
    }

    const data = await response.json();

    if (data.exists === true && data.has_email === true && data.route === 'login') {
      logPass(`exists=${data.exists}, has_email=${data.has_email}, route=${data.route}`);
    } else {
      logFail(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running (run: cd appcode && npm run dev)');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 2: POST /api/auth/check-handle - New user
async function testCheckHandleNew() {
  logTest('Test 2: POST /api/auth/check-handle - new user');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'totally_new_user_xyz_999' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logFail(`API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      return;
    }

    const data = await response.json();

    if (data.exists === false && data.has_email === false && data.route === 'signup') {
      logPass(`exists=${data.exists}, has_email=${data.has_email}, route=${data.route}`);
    } else {
      logFail(`Unexpected response: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 3: POST /api/auth/check-handle - Validation error
async function testCheckHandleValidation() {
  logTest('Test 3: POST /api/auth/check-handle - validation error (empty handle)');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '' }),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error === 'HANDLE_REQUIRED') {
        logPass(`Correct validation error: ${data.error}`);
      } else {
        logFail(`Unexpected error code: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 4: POST /api/auth/signup - Validation errors
async function testSignupValidation() {
  logTest('Test 4: POST /api/auth/signup - validation errors');

  try {
    // Test missing email
    const response1 = await fetchWithTimeout(`${SERVER_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'test', password: 'test123456', agreedToTerms: true }),
    });

    if (response1.status === 400) {
      const data = await response1.json();
      if (data.error === 'INVALID_EMAIL') {
        logPass(`Email validation: ${data.error}`);
      } else {
        logFail(`Unexpected error for email: ${data.error}`);
      }
    } else {
      logFail(`Expected 400 for missing email, got ${response1.status}`);
    }

    // Test short password
    const response2 = await fetchWithTimeout(`${SERVER_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'test',
        email: 'test@test.com',
        password: 'short',
        agreedToTerms: true
      }),
    });

    if (response2.status === 400) {
      const data = await response2.json();
      if (data.error === 'PASSWORD_TOO_SHORT') {
        logPass(`Password validation: ${data.error}`);
      } else {
        logFail(`Unexpected error for password: ${data.error}`);
      }
    } else {
      logFail(`Expected 400 for short password, got ${response2.status}`);
    }

    // Test terms not accepted
    const response3 = await fetchWithTimeout(`${SERVER_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'test',
        email: 'test@test.com',
        password: 'ValidPassword123',
        agreedToTerms: false
      }),
    });

    if (response3.status === 400) {
      const data = await response3.json();
      if (data.error === 'TERMS_NOT_ACCEPTED') {
        logPass(`Terms validation: ${data.error}`);
      } else {
        logFail(`Unexpected error for terms: ${data.error}`);
      }
    } else {
      logFail(`Expected 400 for terms, got ${response3.status}`);
    }

  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 5: POST /api/auth/login - Validation errors
async function testLoginValidation() {
  logTest('Test 5: POST /api/auth/login - validation errors');

  try {
    // Test missing fields
    const response1 = await fetchWithTimeout(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'test' }),
    });

    if (response1.status === 400) {
      const data = await response1.json();
      if (data.error === 'MISSING_FIELDS') {
        logPass(`Missing fields validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response1.status}`);
    }

    // Test invalid credentials
    const response2 = await fetchWithTimeout(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'nonexistent_user_xyz',
        password: 'wrongpassword123'
      }),
    });

    if (response2.status === 401) {
      const data = await response2.json();
      if (data.error === 'INVALID_CREDENTIALS') {
        logPass(`Invalid credentials: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 401, got ${response2.status}`);
    }

  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 6: POST /api/auth/verify-otp - Session not found
async function testVerifyOtpNoSession() {
  logTest('Test 6: POST /api/auth/verify-otp - session not found');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '123456' }),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error === 'SESSION_NOT_FOUND') {
        logPass(`Correct error without session cookie: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 7: POST /api/auth/verify-otp - Invalid code format
async function testVerifyOtpInvalidFormat() {
  logTest('Test 7: POST /api/auth/verify-otp - invalid code format');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'otp_session=fake_session_id_12345',
      },
      body: JSON.stringify({ code: 'abc' }), // Invalid format
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error === 'INVALID_CODE_FORMAT' || data.error === 'SESSION_NOT_FOUND') {
        logPass(`Correct validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 8: POST /api/auth/resend-otp - Session not found
async function testResendOtpNoSession() {
  logTest('Test 8: POST /api/auth/resend-otp - session not found');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response.status === 400) {
      const data = await response.json();
      if (data.error === 'SESSION_NOT_FOUND') {
        logPass(`Correct error without session cookie: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 9: POST /api/auth/forgot-password - Validation
async function testForgotPasswordValidation() {
  logTest('Test 9: POST /api/auth/forgot-password - validation');

  try {
    // Test missing identifier
    const response1 = await fetchWithTimeout(`${SERVER_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (response1.status === 400) {
      const data = await response1.json();
      if (data.error === 'MISSING_IDENTIFIER') {
        logPass(`Missing identifier validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response1.status}`);
    }

    // Test anti-enumeration (always returns 200 even for non-existent user)
    const response2 = await fetchWithTimeout(`${SERVER_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nonexistent@test.com' }),
    });

    if (response2.status === 200) {
      const data = await response2.json();
      if (data.sent === true) {
        logPass(`Anti-enumeration working: returns 200 even for non-existent user`);
      } else {
        logFail(`Unexpected response: ${JSON.stringify(data)}`);
      }
    } else {
      logFail(`Expected 200 (anti-enumeration), got ${response2.status}`);
    }

  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 10: POST /api/auth/reset-password - Validation
async function testResetPasswordValidation() {
  logTest('Test 10: POST /api/auth/reset-password - validation');

  try {
    // Test missing fields
    const response1 = await fetchWithTimeout(`${SERVER_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'sometoken' }),
    });

    if (response1.status === 400) {
      const data = await response1.json();
      if (data.error === 'MISSING_FIELDS') {
        logPass(`Missing fields validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response1.status}`);
    }

    // Test weak password
    const response2 = await fetchWithTimeout(`${SERVER_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'sometoken', newPassword: 'short' }),
    });

    if (response2.status === 400) {
      const data = await response2.json();
      if (data.error === 'WEAK_PASSWORD') {
        logPass(`Weak password validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response2.status}`);
    }

    // Test invalid token
    const response3 = await fetchWithTimeout(`${SERVER_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_token_xyz', newPassword: 'ValidPassword123!' }),
    });

    if (response3.status === 400) {
      const data = await response3.json();
      if (data.error === 'INVALID_TOKEN') {
        logPass(`Invalid token validation: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 400, got ${response3.status}`);
    }

  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// Test 11: GET /api/auth/user-status - Unauthorized
async function testUserStatusUnauthorized() {
  logTest('Test 11: GET /api/auth/user-status - unauthorized');

  try {
    const response = await fetchWithTimeout(`${SERVER_URL}/api/auth/user-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.error === 'UNAUTHORIZED') {
        logPass(`Correct unauthorized error: ${data.error}`);
      } else {
        logFail(`Unexpected error: ${data.error}`);
      }
    } else {
      logFail(`Expected 401, got ${response.status}`);
    }
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'ECONNREFUSED') {
      logSkip('Server not running');
    } else {
      logFail(`Network error: ${err.message}`);
    }
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 Auth API Routes Integration Tests (Step 3.3)\n');
  console.log('='.repeat(60));
  console.log(`Server URL: ${SERVER_URL}`);
  console.log('='.repeat(60));

  // Check if server is running
  try {
    await fetchWithTimeout(`${SERVER_URL}/api/auth/check-handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'test' }),
    }, 3000);
    console.log('✅ Server is running\n');
  } catch (err) {
    console.log('⚠️  Server may not be running. Start it with: cd appcode && npm run dev\n');
  }

  // Run all tests
  await testCheckHandleExisting();
  await testCheckHandleNew();
  await testCheckHandleValidation();
  await testSignupValidation();
  await testLoginValidation();
  await testVerifyOtpNoSession();
  await testVerifyOtpInvalidFormat();
  await testResendOtpNoSession();
  await testForgotPasswordValidation();
  await testResetPasswordValidation();
  await testUserStatusUnauthorized();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);

  if (failed === 0 && skipped === 0) {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  } else if (failed === 0) {
    console.log('⚠️  Some tests skipped (server not running?)\n');
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
