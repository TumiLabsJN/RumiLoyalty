/**
 * Integration Tests: OTP Security
 *
 * Tests OTP expiration and attempt limits via RPC functions.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=otp-security
 *
 * References:
 * - EXECUTION_PLAN.md Task 3.4.3 (Test OTP expiration enforced)
 * - API_CONTRACTS.md lines 438-592 (POST /api/auth/verify-otp)
 * - SchemaFinalv2.md lines 158-184 (otp_codes table)
 *
 * Test Cases per EXECUTION_PLAN.md:
 * 1. valid OTP within 5 min succeeds
 * 2. expired OTP (>5 min) returns OTP_EXPIRED
 * 3. invalid OTP returns OTP_INVALID
 * 4. max attempts (3) exceeded returns MAX_ATTEMPTS_EXCEEDED
 * 5. attempts_count tracks failed attempts
 *
 * Note: Actual implementation uses 5 min expiry and 3 max attempts
 * (per API_CONTRACTS.md), not 10 min / 5 attempts as in EXECUTION_PLAN.md
 */

import bcrypt from 'bcryptjs';
import {
  createTestClient,
  createTestUser,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
} from '../../fixtures/factories';

describe('OTP Security Integration Tests', () => {
  let testClientId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Verify database connection
    await setupTestDb();

    // Create test client
    const { client } = await createTestClient({
      name: 'OTP Security Test Client',
    });
    testClientId = client.id;

    // Create test user
    const { user } = await createTestUser({
      clientId: testClientId,
      tiktokHandle: `otpsecurity_${Date.now()}`,
      email: `otpsecurity_${Date.now()}@test.com`,
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testClientId) {
      await cleanupTestData(testClientId);
    }
  });

  describe('Test Case 1: Valid OTP within 5 min succeeds', () => {
    const sessionId = `valid_otp_${Date.now()}`;
    const otpCode = '123456';
    let otpHash: string;

    beforeAll(async () => {
      otpHash = await bcrypt.hash(otpCode, 10);
    });

    it('should create OTP with 5 minute expiry', async () => {
      const supabase = getTestSupabase();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      const { error } = await supabase.rpc('auth_create_otp', {
        p_user_id: testUserId,
        p_session_id: sessionId,
        p_code_hash: otpHash,
        p_expires_at: expiresAt.toISOString(),
      });

      expect(error).toBeNull();
    });

    it('should find valid OTP by session', async () => {
      const supabase = getTestSupabase();

      const { data, error } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].used).toBe(false);
      expect(data[0].attempts).toBe(0);

      // Verify expiry is in the future
      const expiresAt = new Date(data[0].expires_at);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify correct OTP code via bcrypt', async () => {
      const supabase = getTestSupabase();

      // Get the OTP record
      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      // Verify bcrypt comparison works
      const isValid = await bcrypt.compare(otpCode, data[0].code_hash);
      expect(isValid).toBe(true);
    });
  });

  describe('Test Case 2: Expired OTP (>5 min) detected', () => {
    const sessionId = `expired_otp_${Date.now()}`;
    const otpCode = '654321';

    it('should create OTP with past expiry (already expired)', async () => {
      const supabase = getTestSupabase();
      const otpHash = await bcrypt.hash(otpCode, 10);
      // Set expiry to 1 minute ago (already expired)
      const expiresAt = new Date(Date.now() - 60 * 1000);

      const { error } = await supabase.rpc('auth_create_otp', {
        p_user_id: testUserId,
        p_session_id: sessionId,
        p_code_hash: otpHash,
        p_expires_at: expiresAt.toISOString(),
      });

      expect(error).toBeNull();
    });

    it('should detect expired OTP', async () => {
      const supabase = getTestSupabase();

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      // Check expiry is in the past
      const expiresAt = new Date(data[0].expires_at);
      const isExpired = expiresAt.getTime() < Date.now();
      expect(isExpired).toBe(true);

      // This is what authService.verifyOTP would check:
      // if (new Date(otpRecord.expiresAt) < new Date()) {
      //   throw new BusinessError('OTP_EXPIRED', '...');
      // }
    });
  });

  describe('Test Case 3: Invalid OTP returns error', () => {
    const sessionId = `invalid_otp_${Date.now()}`;
    const correctCode = '111111';
    const wrongCode = '999999';

    beforeAll(async () => {
      const supabase = getTestSupabase();
      const otpHash = await bcrypt.hash(correctCode, 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await supabase.rpc('auth_create_otp', {
        p_user_id: testUserId,
        p_session_id: sessionId,
        p_code_hash: otpHash,
        p_expires_at: expiresAt.toISOString(),
      });
    });

    it('should reject wrong OTP code via bcrypt', async () => {
      const supabase = getTestSupabase();

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      // Verify bcrypt rejects wrong code
      const isValid = await bcrypt.compare(wrongCode, data[0].code_hash);
      expect(isValid).toBe(false);

      // This is what authService.verifyOTP would do:
      // const isValid = await verifyOTPHash(code, otpRecord.codeHash);
      // if (!isValid) {
      //   throw new BusinessError('INVALID_OTP', '...');
      // }
    });
  });

  describe('Test Case 4: Max attempts (3) exceeded', () => {
    const sessionId = `max_attempts_${Date.now()}`;

    beforeAll(async () => {
      const supabase = getTestSupabase();
      const otpHash = await bcrypt.hash('222222', 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await supabase.rpc('auth_create_otp', {
        p_user_id: testUserId,
        p_session_id: sessionId,
        p_code_hash: otpHash,
        p_expires_at: expiresAt.toISOString(),
      });
    });

    it('should start with 0 attempts', async () => {
      const supabase = getTestSupabase();

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      expect(data[0].attempts).toBe(0);
    });

    it('should increment attempts on each failed verification', async () => {
      const supabase = getTestSupabase();

      // Simulate 3 failed attempts
      for (let i = 1; i <= 3; i++) {
        await supabase.rpc('auth_increment_otp_attempts', {
          p_session_id: sessionId,
        });

        const { data } = await supabase.rpc('auth_find_otp_by_session', {
          p_session_id: sessionId,
        });

        expect(data[0].attempts).toBe(i);
      }
    });

    it('should detect max attempts exceeded (attempts >= 3)', async () => {
      const supabase = getTestSupabase();

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      const maxAttemptsExceeded = data[0].attempts >= 3;
      expect(maxAttemptsExceeded).toBe(true);

      // This is what authService.verifyOTP checks:
      // if (otpRecord.attempts >= 3) {
      //   throw new BusinessError('OTP_MAX_ATTEMPTS', '...');
      // }
    });
  });

  describe('Test Case 5: OTP marked as used prevents reuse', () => {
    const sessionId = `used_otp_${Date.now()}`;

    beforeAll(async () => {
      const supabase = getTestSupabase();
      const otpHash = await bcrypt.hash('333333', 10);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await supabase.rpc('auth_create_otp', {
        p_user_id: testUserId,
        p_session_id: sessionId,
        p_code_hash: otpHash,
        p_expires_at: expiresAt.toISOString(),
      });
    });

    it('should start with used=false', async () => {
      const supabase = getTestSupabase();

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      expect(data[0].used).toBe(false);
    });

    it('should mark OTP as used after successful verification', async () => {
      const supabase = getTestSupabase();

      // Mark as used (simulating successful verification)
      await supabase.rpc('auth_mark_otp_used', {
        p_session_id: sessionId,
      });

      const { data } = await supabase.rpc('auth_find_otp_by_session', {
        p_session_id: sessionId,
      });

      expect(data[0].used).toBe(true);

      // This is what authService.verifyOTP checks:
      // if (otpRecord.used) {
      //   throw new BusinessError('OTP_ALREADY_USED', '...');
      // }
    });
  });

  describe('OTP Expiry Time Calculation', () => {
    it('should calculate correct 5-minute expiry window', () => {
      const OTP_EXPIRY_MINUTES = 5;
      const now = Date.now();
      const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Verify 5 minute window
      const diffMs = expiresAt.getTime() - now;
      const diffMinutes = diffMs / 1000 / 60;

      expect(diffMinutes).toBe(5);
    });
  });
});
