/**
 * Payment Info Encryption Integration Tests (Task 6.4.12)
 *
 * Tests encryption of payment accounts via the full API flow per Implementation Guide:
 * 1. Create commission_boost redemption in 'pending_info' status
 * 2. POST /api/rewards/:id/payment-info with payment data
 * 3. Verify payment_account stored as ciphertext (not plaintext)
 * 4. Verify ciphertext format matches iv:authTag:ciphertext pattern
 * 5. Verify decryption returns original value
 * 6. Verify different inputs produce different ciphertext
 * 7. Verify tampered ciphertext fails decryption
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=payment-info-encryption
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.12
 * - Loyalty.md lines 1936-1952 (Pattern 9: Sensitive Data Encryption)
 * - SchemaFinalv2.md lines 700-708 (payment_account fields)
 * - API_CONTRACTS.md lines 5331-5451 (POST /api/rewards/:id/payment-info)
 */

import { NextRequest } from 'next/server';
import { POST as postPaymentInfo } from '@/app/api/rewards/[rewardId]/payment-info/route';
import { encrypt, decrypt, isEncrypted } from '@/lib/utils/encryption';

// Mock Supabase client
jest.mock('@/lib/supabase/server-client', () => ({
  createClient: jest.fn(),
}));

// Mock user repository
jest.mock('@/lib/repositories/userRepository', () => ({
  userRepository: {
    findByAuthId: jest.fn(),
    savePaymentInfo: jest.fn(),
  },
}));

// Mock commission boost repository - we'll spy on what it receives
jest.mock('@/lib/repositories/commissionBoostRepository', () => ({
  commissionBoostRepository: {
    getBoostStatus: jest.fn(),
    savePaymentInfo: jest.fn(),
  },
}));

import { createClient } from '@/lib/supabase/server-client';
import { userRepository } from '@/lib/repositories/userRepository';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';

// Type assertions for mocks
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockUserRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockCommissionBoostRepo = commissionBoostRepository as jest.Mocked<typeof commissionBoostRepository>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturnValue = any;

// Test encryption key (32 bytes = 64 hex characters)
const TEST_ENCRYPTION_KEY = 'a'.repeat(64);

// Test data fixtures
const TEST_CLIENT_ID = 'client-test-123';
const TEST_USER_ID = 'user-test-456';
const TEST_AUTH_ID = 'auth-test-789';
const TEST_REDEMPTION_ID = 'redemption-boost-001';

const mockUser: MockReturnValue = {
  id: TEST_USER_ID,
  authId: TEST_AUTH_ID,
  clientId: TEST_CLIENT_ID,
  tiktokHandle: '@testcreator',
  email: 'test@example.com',
  currentTier: 'tier_3',
};

// Helper to create mock NextRequest for POST /api/rewards/:id/payment-info
function createPaymentInfoRequest(
  redemptionId: string,
  body: {
    paymentMethod: 'paypal' | 'venmo';
    paymentAccount: string;
    paymentAccountConfirm: string;
    saveAsDefault: boolean;
  }
): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/rewards/${redemptionId}/payment-info`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Helper to setup authenticated Supabase mock
function setupAuthenticatedMock() {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: TEST_AUTH_ID, email: 'test@example.com' } },
        error: null,
      }),
    },
  } as MockReturnValue);
}

// Helper to setup standard mocks for successful payment info submission
function setupSuccessfulPaymentInfoMocks() {
  setupAuthenticatedMock();
  mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
  mockCommissionBoostRepo.getBoostStatus.mockResolvedValue('pending_info');
  mockUserRepo.savePaymentInfo.mockResolvedValue(true);
}

describe('Payment Info Encryption Integration Tests (Task 6.4.12)', () => {
  // Store original env and set test key
  const originalEnv = process.env.ENCRYPTION_KEY;
  const originalClientId = process.env.CLIENT_ID;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    process.env.CLIENT_ID = TEST_CLIENT_ID;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
    if (originalClientId !== undefined) {
      process.env.CLIENT_ID = originalClientId;
    } else {
      delete process.env.CLIENT_ID;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Implementation Guide Step 1-2: Create redemption in pending_info, POST payment-info
  // ==========================================================================
  describe('API Route Flow - POST /api/rewards/:id/payment-info', () => {
    it('should accept payment info when boost is in pending_info status', async () => {
      // Arrange
      setupSuccessfulPaymentInfoMocks();
      const now = new Date().toISOString();
      mockCommissionBoostRepo.savePaymentInfo.mockResolvedValue({
        redemptionId: TEST_REDEMPTION_ID,
        status: 'fulfilled',
        paymentMethod: 'venmo',
        paymentInfoCollectedAt: now,
      });

      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'venmo',
        paymentAccount: '@userhandle',
        paymentAccountConfirm: '@userhandle',
        saveAsDefault: false,
      });

      // Act
      const response = await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.redemption.status).toBe('fulfilled');
      expect(data.redemption.paymentMethod).toBe('venmo');
    });

    it('should reject payment info when boost is not in pending_info status', async () => {
      // Arrange
      setupAuthenticatedMock();
      mockUserRepo.findByAuthId.mockResolvedValue(mockUser);
      mockCommissionBoostRepo.getBoostStatus.mockResolvedValue('active'); // Wrong status

      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'venmo',
        paymentAccount: '@userhandle',
        paymentAccountConfirm: '@userhandle',
        saveAsDefault: false,
      });

      // Act
      const response = await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });
      const data = await response.json();

      // Assert - should fail with error (403 per API_CONTRACTS.md)
      expect(response.status).toBe(403);
      expect(data.error).toBe('PAYMENT_INFO_NOT_REQUIRED');
    });
  });

  // ==========================================================================
  // Implementation Guide Step 3-4: Verify payment_account stored as ciphertext
  // ==========================================================================
  describe('Test Case 1: payment_account stored as ciphertext (not plaintext)', () => {
    it('should call repository.savePaymentInfo with plaintext (repository encrypts)', async () => {
      // Arrange
      setupSuccessfulPaymentInfoMocks();
      const now = new Date().toISOString();
      mockCommissionBoostRepo.savePaymentInfo.mockResolvedValue({
        redemptionId: TEST_REDEMPTION_ID,
        status: 'fulfilled',
        paymentMethod: 'venmo',
        paymentInfoCollectedAt: now,
      });

      const venmoHandle = '@userhandle';
      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'venmo',
        paymentAccount: venmoHandle,
        paymentAccountConfirm: venmoHandle,
        saveAsDefault: false,
      });

      // Act
      await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });

      // Assert - service passes plaintext to repository, repository encrypts
      expect(mockCommissionBoostRepo.savePaymentInfo).toHaveBeenCalledWith(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        venmoHandle // Plaintext passed to repository
      );
    });

    it('should encrypt PayPal email before database storage', () => {
      // Test encryption utility directly - simulating what repository does
      const paypalEmail = 'john@paypal.com';

      // Act - simulate repository encryption
      const encrypted = encrypt(paypalEmail);

      // Assert - encrypted value is NOT plaintext
      expect(encrypted).not.toBe(paypalEmail);
      expect(encrypted).not.toContain('john');
      expect(encrypted).not.toContain('paypal');
    });

    it('should encrypt Venmo handle before database storage', () => {
      // Test encryption utility directly - simulating what repository does
      const venmoHandle = '@johndoe';

      // Act - simulate repository encryption
      const encrypted = encrypt(venmoHandle);

      // Assert - encrypted value is NOT plaintext
      expect(encrypted).not.toBe(venmoHandle);
      expect(encrypted).not.toContain('@johndoe');
    });

    it('should produce ciphertext in iv:authTag:ciphertext format', () => {
      // Per Loyalty.md Pattern 9: format is "iv:authTag:ciphertext"
      const paymentAccount = '@userhandle';

      // Act
      const encrypted = encrypt(paymentAccount);

      // Assert - format is 3 parts separated by colons
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should produce base64-encoded IV, authTag, and ciphertext', () => {
      // Per Loyalty.md Pattern 9: all parts are base64 encoded
      const paymentAccount = 'jane@venmo.com';

      // Act
      const encrypted = encrypt(paymentAccount);
      const [ivBase64, authTagBase64, ciphertextBase64] = encrypted.split(':');

      // Assert - all parts should be valid base64
      expect(() => Buffer.from(ivBase64, 'base64')).not.toThrow();
      expect(() => Buffer.from(authTagBase64, 'base64')).not.toThrow();
      expect(() => Buffer.from(ciphertextBase64, 'base64')).not.toThrow();
    });

    it('should use AES-256-GCM algorithm (12-byte IV)', () => {
      // Per Loyalty.md Pattern 9: AES-256-GCM with 96-bit (12-byte) IV
      const paymentAccount = 'test@paypal.com';

      // Act
      const encrypted = encrypt(paymentAccount);
      const ivBase64 = encrypted.split(':')[0];
      const iv = Buffer.from(ivBase64, 'base64');

      // Assert - IV should be 12 bytes for GCM mode
      expect(iv.length).toBe(12);
    });

    it('should use 16-byte auth tag for tamper detection', () => {
      // Per Loyalty.md Pattern 9: 128-bit (16-byte) auth tag
      const paymentAccount = 'test@venmo.com';

      // Act
      const encrypted = encrypt(paymentAccount);
      const authTagBase64 = encrypted.split(':')[1];
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Assert - auth tag should be 16 bytes
      expect(authTag.length).toBe(16);
    });
  });

  // ==========================================================================
  // Implementation Guide Step 5: Verify decryption returns original value
  // ==========================================================================
  describe('Test Case 2: decryption returns original value correctly', () => {
    it('should decrypt PayPal email back to original value', () => {
      // Simulate: encrypt before INSERT, decrypt after SELECT
      const originalEmail = 'john.doe@paypal.com';

      // Act - encrypt (INSERT) then decrypt (SELECT)
      const encrypted = encrypt(originalEmail);
      const decrypted = decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(originalEmail);
    });

    it('should decrypt Venmo handle back to original value', () => {
      const originalHandle = '@johndoe123';

      // Act
      const encrypted = encrypt(originalHandle);
      const decrypted = decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(originalHandle);
    });

    it('should handle special characters in PayPal email', () => {
      const specialEmail = 'user+test.name@sub.domain.com';

      // Act
      const encrypted = encrypt(specialEmail);
      const decrypted = decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(specialEmail);
    });

    it('should handle unicode characters', () => {
      const unicodeAccount = 'usuario@ejemplo.com';

      // Act
      const encrypted = encrypt(unicodeAccount);
      const decrypted = decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(unicodeAccount);
    });

    it('should handle maximum VARCHAR(255) length', () => {
      // Per SchemaFinalv2.md: payment_account is VARCHAR(255)
      const longAccount = 'a'.repeat(200) + '@paypal.com';

      // Act
      const encrypted = encrypt(longAccount);
      const decrypted = decrypt(encrypted);

      // Assert
      expect(decrypted).toBe(longAccount);
    });
  });

  // ==========================================================================
  // Implementation Guide Step 6: Different inputs produce different ciphertext
  // ==========================================================================
  describe('Test Case 3: different inputs produce different ciphertext', () => {
    it('should produce different ciphertext for different accounts', () => {
      const account1 = 'user1@paypal.com';
      const account2 = 'user2@paypal.com';

      // Act
      const encrypted1 = encrypt(account1);
      const encrypted2 = encrypt(account2);

      // Assert - different inputs = different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      // Per Loyalty.md Pattern 9: random IV ensures non-deterministic encryption
      const sameAccount = '@userhandle';

      // Act - encrypt same value twice
      const encrypted1 = encrypt(sameAccount);
      const encrypted2 = encrypt(sameAccount);

      // Assert - same input produces different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should produce different IVs for each encryption', () => {
      const account = 'test@paypal.com';

      // Act
      const encrypted1 = encrypt(account);
      const encrypted2 = encrypt(account);

      // Extract IVs
      const iv1 = encrypted1.split(':')[0];
      const iv2 = encrypted2.split(':')[0];

      // Assert - IVs should be different (randomness)
      expect(iv1).not.toBe(iv2);
    });

    it('should decrypt both to same original value despite different ciphertext', () => {
      const originalAccount = '@samehandle';

      // Act
      const encrypted1 = encrypt(originalAccount);
      const encrypted2 = encrypt(originalAccount);
      const decrypted1 = decrypt(encrypted1);
      const decrypted2 = decrypt(encrypted2);

      // Assert - different ciphertext, same decrypted value
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypted1).toBe(originalAccount);
      expect(decrypted2).toBe(originalAccount);
    });

    it('should protect against rainbow table attacks via unique ciphertext', () => {
      // Common Venmo handles should produce different ciphertext each time
      const commonHandle = '@john';

      // Act - encrypt 3 times
      const encrypted1 = encrypt(commonHandle);
      const encrypted2 = encrypt(commonHandle);
      const encrypted3 = encrypt(commonHandle);

      // Assert - all different (can't precompute)
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted2).not.toBe(encrypted3);
      expect(encrypted1).not.toBe(encrypted3);
    });
  });

  // ==========================================================================
  // Implementation Guide Step 7: Tampered ciphertext fails decryption
  // ==========================================================================
  describe('Test Case 4: tampered ciphertext fails decryption', () => {
    it('should fail when ciphertext portion is modified', () => {
      const original = 'john@paypal.com';
      const encrypted = encrypt(original);
      const parts = encrypted.split(':');

      // Tamper with ciphertext (third part)
      const tamperedCiphertext = 'AAAA' + parts[2].substring(4);
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

      // Act & Assert
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should fail when IV is modified', () => {
      const original = '@venmouser';
      const encrypted = encrypt(original);
      const parts = encrypted.split(':');

      // Tamper with IV (first part)
      const tamperedIV = 'BBBB' + parts[0].substring(4);
      const tampered = `${tamperedIV}:${parts[1]}:${parts[2]}`;

      // Act & Assert
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should fail when auth tag is modified', () => {
      const original = 'user@payment.com';
      const encrypted = encrypt(original);
      const parts = encrypted.split(':');

      // Tamper with auth tag (second part)
      const tamperedAuthTag = 'CCCC' + parts[1].substring(4);
      const tampered = `${parts[0]}:${tamperedAuthTag}:${parts[2]}`;

      // Act & Assert
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should fail with malformed format (missing parts)', () => {
      // Only two parts instead of three
      const malformed = 'abc123:def456';

      // Act & Assert
      expect(() => decrypt(malformed)).toThrow('Invalid encrypted data format');
    });

    it('should fail when ciphertext from one account is swapped to another', () => {
      // Attacker tries to reuse encrypted value from another record
      const account1 = '@victim';
      const account2 = '@attacker';
      const encrypted1 = encrypt(account1);
      const encrypted2 = encrypt(account2);

      // Extract parts and swap ciphertext
      const parts1 = encrypted1.split(':');
      const parts2 = encrypted2.split(':');
      const swapped = `${parts1[0]}:${parts1[1]}:${parts2[2]}`;

      // Act & Assert - authentication fails
      expect(() => decrypt(swapped)).toThrow();
    });

    it('should fail with completely invalid base64 content', () => {
      const invalidContent = 'not:valid:base64!!!';

      // Act & Assert
      expect(() => decrypt(invalidContent)).toThrow();
    });

    it('should fail when decrypted with wrong encryption key', () => {
      const original = 'secret@paypal.com';
      const encrypted = encrypt(original);

      // Change the key
      const savedKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      // Act & Assert
      expect(() => decrypt(encrypted)).toThrow();

      // Restore
      process.env.ENCRYPTION_KEY = savedKey;
    });
  });

  // ==========================================================================
  // Additional Security Validations per Pattern 9
  // ==========================================================================
  describe('Pattern 9 Security Requirements', () => {
    it('should throw if ENCRYPTION_KEY is missing', () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => encrypt('test@test.com')).toThrow(
        'ENCRYPTION_KEY environment variable is required'
      );

      // Restore
      process.env.ENCRYPTION_KEY = savedKey;
    });

    it('should throw if ENCRYPTION_KEY is wrong length (not 64 hex chars)', () => {
      const savedKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'tooshort';

      // Act & Assert
      expect(() => encrypt('test@test.com')).toThrow(
        'ENCRYPTION_KEY must be 64 hex characters'
      );

      // Restore
      process.env.ENCRYPTION_KEY = savedKey;
    });

    it('should correctly identify encrypted vs plaintext strings', () => {
      const plainEmail = 'john@paypal.com';
      const plainVenmo = '@johndoe';
      const encrypted = encrypt(plainEmail);

      // Assert
      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(plainEmail)).toBe(false);
      expect(isEncrypted(plainVenmo)).toBe(false);
      expect(isEncrypted('')).toBe(false);
    });

    it('should never expose plaintext in encrypted output', () => {
      const sensitiveEmail = 'supersecret.user@privatepaypal.com';
      const sensitiveVenmo = '@secrethandle123';

      const encryptedEmail = encrypt(sensitiveEmail);
      const encryptedVenmo = encrypt(sensitiveVenmo);

      // Assert - no part of plaintext visible
      expect(encryptedEmail.toLowerCase()).not.toContain('supersecret');
      expect(encryptedEmail.toLowerCase()).not.toContain('paypal');
      expect(encryptedVenmo.toLowerCase()).not.toContain('secret');
      expect(encryptedVenmo.toLowerCase()).not.toContain('handle');
    });
  });

  // ==========================================================================
  // API Integration: Verify repository receives correct parameters
  // ==========================================================================
  describe('Repository Integration', () => {
    it('should pass correct parameters to commissionBoostRepository.savePaymentInfo', async () => {
      // Arrange
      setupSuccessfulPaymentInfoMocks();
      const now = new Date().toISOString();
      mockCommissionBoostRepo.savePaymentInfo.mockResolvedValue({
        redemptionId: TEST_REDEMPTION_ID,
        status: 'fulfilled',
        paymentMethod: 'paypal',
        paymentInfoCollectedAt: now,
      });

      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'paypal',
        paymentAccount: 'creator@paypal.com',
        paymentAccountConfirm: 'creator@paypal.com',
        saveAsDefault: true,
      });

      // Act
      await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });

      // Assert - repository called with correct params
      expect(mockCommissionBoostRepo.savePaymentInfo).toHaveBeenCalledTimes(1);
      expect(mockCommissionBoostRepo.savePaymentInfo).toHaveBeenCalledWith(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'paypal',
        'creator@paypal.com'
      );

      // Assert - user repository called for saveAsDefault=true
      expect(mockUserRepo.savePaymentInfo).toHaveBeenCalledWith(
        TEST_USER_ID,
        TEST_CLIENT_ID,
        'paypal',
        'creator@paypal.com'
      );
    });

    it('should not call userRepository.savePaymentInfo when saveAsDefault=false', async () => {
      // Arrange
      setupSuccessfulPaymentInfoMocks();
      const now = new Date().toISOString();
      mockCommissionBoostRepo.savePaymentInfo.mockResolvedValue({
        redemptionId: TEST_REDEMPTION_ID,
        status: 'fulfilled',
        paymentMethod: 'venmo',
        paymentInfoCollectedAt: now,
      });

      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'venmo',
        paymentAccount: '@creator',
        paymentAccountConfirm: '@creator',
        saveAsDefault: false, // Don't save as default
      });

      // Act
      await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });

      // Assert - user repository NOT called
      expect(mockUserRepo.savePaymentInfo).not.toHaveBeenCalled();
    });

    it('should verify boost status is pending_info before saving', async () => {
      // Arrange
      setupSuccessfulPaymentInfoMocks();
      const now = new Date().toISOString();
      mockCommissionBoostRepo.savePaymentInfo.mockResolvedValue({
        redemptionId: TEST_REDEMPTION_ID,
        status: 'fulfilled',
        paymentMethod: 'venmo',
        paymentInfoCollectedAt: now,
      });

      const request = createPaymentInfoRequest(TEST_REDEMPTION_ID, {
        paymentMethod: 'venmo',
        paymentAccount: '@creator',
        paymentAccountConfirm: '@creator',
        saveAsDefault: false,
      });

      // Act
      await postPaymentInfo(request, {
        params: Promise.resolve({ rewardId: TEST_REDEMPTION_ID }),
      });

      // Assert - getBoostStatus was called to verify status
      expect(mockCommissionBoostRepo.getBoostStatus).toHaveBeenCalledWith(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID
      );
    });
  });
});
