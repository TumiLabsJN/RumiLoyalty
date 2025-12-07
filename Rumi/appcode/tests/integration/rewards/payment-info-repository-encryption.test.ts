/**
 * Payment Info Repository Encryption Tests (Task 6.4.12 - Implementation Guide Step 3)
 *
 * Tests that the ACTUAL commissionBoostRepository encrypts payment_account before
 * passing to Supabase. This verifies the database receives ciphertext, not plaintext.
 *
 * Per Implementation Guide:
 * "(3) query commission_boost_redemptions directly → payment_account column MUST contain ciphertext"
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPatterns=payment-info-repository-encryption
 *
 * References:
 * - EXECUTION_PLAN.md Task 6.4.12 (Implementation Guide step 3)
 * - Loyalty.md lines 1936-1952 (Pattern 9: Sensitive Data Encryption)
 * - ARCHITECTURE.md lines 654-720 (Repository encryption pattern)
 */

import { isEncrypted, decrypt } from '@/lib/utils/encryption';

// Mock ONLY Supabase - NOT the repository
// This allows us to test the actual repository code
jest.mock('@/lib/supabase/server-client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server-client';
import { commissionBoostRepository } from '@/lib/repositories/commissionBoostRepository';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockReturnValue = any;

// Test encryption key (32 bytes = 64 hex characters)
const TEST_ENCRYPTION_KEY = 'a'.repeat(64);

// Test data
const TEST_CLIENT_ID = 'client-test-123';
const TEST_REDEMPTION_ID = 'redemption-boost-001';
const TEST_BOOST_ID = 'boost-001';

describe('Repository Encryption Tests (Implementation Guide Step 3)', () => {
  // Store original env
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Implementation Guide Step 3: Verify payment_account stored as ciphertext
  // ==========================================================================
  describe('commissionBoostRepository.savePaymentInfo encrypts before database', () => {
    it('should pass ENCRYPTED payment_account to Supabase update (Venmo)', async () => {
      // Arrange - capture what gets passed to Supabase .update()
      let capturedUpdatePayload: Record<string, unknown> | null = null;

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        capturedUpdatePayload = payload;
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_REDEMPTION_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      const plaintextVenmo = '@userhandle';

      // Act - call actual repository (not mocked)
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        plaintextVenmo
      );

      // Assert - verify what was passed to Supabase
      expect(capturedUpdatePayload).not.toBeNull();
      expect(capturedUpdatePayload!.payment_method).toBe('venmo');

      // CRITICAL: payment_account MUST be encrypted, NOT plaintext
      const storedPaymentAccount = capturedUpdatePayload!.payment_account as string;
      expect(storedPaymentAccount).not.toBe(plaintextVenmo);
      expect(storedPaymentAccount).not.toContain('@userhandle');

      // Verify it's in encrypted format (iv:authTag:ciphertext)
      expect(isEncrypted(storedPaymentAccount)).toBe(true);
      const parts = storedPaymentAccount.split(':');
      expect(parts.length).toBe(3);

      // Verify it can be decrypted back to original
      const decrypted = decrypt(storedPaymentAccount);
      expect(decrypted).toBe(plaintextVenmo);
    });

    it('should pass ENCRYPTED payment_account to Supabase update (PayPal)', async () => {
      // Arrange
      let capturedUpdatePayload: Record<string, unknown> | null = null;

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        capturedUpdatePayload = payload;
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_REDEMPTION_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      const plaintextPaypal = 'creator@paypal.com';

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'paypal',
        plaintextPaypal
      );

      // Assert
      expect(capturedUpdatePayload).not.toBeNull();
      expect(capturedUpdatePayload!.payment_method).toBe('paypal');

      const storedPaymentAccount = capturedUpdatePayload!.payment_account as string;

      // MUST be encrypted
      expect(storedPaymentAccount).not.toBe(plaintextPaypal);
      expect(storedPaymentAccount).not.toContain('creator');
      expect(storedPaymentAccount).not.toContain('paypal');
      expect(isEncrypted(storedPaymentAccount)).toBe(true);

      // MUST decrypt to original
      expect(decrypt(storedPaymentAccount)).toBe(plaintextPaypal);
    });

    it('should produce different ciphertext for same input (non-deterministic)', async () => {
      // Arrange
      const capturedPayloads: string[] = [];

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        capturedPayloads.push(payload.payment_account as string);
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_REDEMPTION_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      const sameAccount = '@samehandle';

      // Act - call twice with same plaintext
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        sameAccount
      );

      await commissionBoostRepository.savePaymentInfo(
        'redemption-boost-002',
        TEST_CLIENT_ID,
        'venmo',
        sameAccount
      );

      // Assert - different ciphertext each time (random IV)
      expect(capturedPayloads.length).toBe(2);
      expect(capturedPayloads[0]).not.toBe(capturedPayloads[1]);

      // Both must decrypt to same original
      expect(decrypt(capturedPayloads[0])).toBe(sameAccount);
      expect(decrypt(capturedPayloads[1])).toBe(sameAccount);
    });

    it('should set boost_status to pending_payout after saving payment info', async () => {
      // Arrange
      let capturedUpdatePayload: Record<string, unknown> | null = null;

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        capturedUpdatePayload = payload;
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_REDEMPTION_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        '@creator'
      );

      // Assert - boost_status transitions to pending_payout
      expect(capturedUpdatePayload!.boost_status).toBe('pending_payout');
      expect(capturedUpdatePayload!.payment_info_collected_at).toBeDefined();
    });

    it('should update redemptions.status to fulfilled after saving payment info', async () => {
      // Arrange
      let capturedRedemptionPayload: Record<string, unknown> | null = null;

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_BOOST_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockImplementation((payload) => {
              capturedRedemptionPayload = payload;
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                      data: [{ id: TEST_REDEMPTION_ID }],
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'paypal',
        'user@paypal.com'
      );

      // Assert - redemptions.status updated
      expect(capturedRedemptionPayload).not.toBeNull();
      expect(capturedRedemptionPayload!.status).toBe('fulfilled');
      expect(capturedRedemptionPayload!.fulfilled_at).toBeDefined();
    });

    it('should include client_id filter for tenant isolation', async () => {
      // Arrange
      let capturedClientIdFilter: string | null = null;

      const mockEqChain = jest.fn().mockImplementation((field, value) => {
        if (field === 'client_id') {
          capturedClientIdFilter = value;
        }
        return {
          eq: mockEqChain,
          select: jest.fn().mockResolvedValue({
            data: [{ id: TEST_BOOST_ID }],
            error: null,
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: mockEqChain,
            }),
          };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({
                    data: [{ id: TEST_REDEMPTION_ID }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        '@creator'
      );

      // Assert - client_id filter was applied
      expect(capturedClientIdFilter).toBe(TEST_CLIENT_ID);
    });
  });

  // ==========================================================================
  // Verify plaintext is NEVER passed to database
  // ==========================================================================
  describe('Plaintext protection', () => {
    it('should NEVER pass plaintext Venmo handle to database', async () => {
      // Arrange
      const allUpdateCalls: Record<string, unknown>[] = [];

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        allUpdateCalls.push(payload);
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockImplementation((payload) => {
              allUpdateCalls.push(payload);
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                      data: [{ id: TEST_REDEMPTION_ID }],
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      const plaintextHandle = '@secretvenmohandle';

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'venmo',
        plaintextHandle
      );

      // Assert - scan ALL payloads sent to database
      for (const payload of allUpdateCalls) {
        const payloadString = JSON.stringify(payload);
        expect(payloadString).not.toContain('@secretvenmohandle');
        expect(payloadString).not.toContain('secretvenmo');
      }
    });

    it('should NEVER pass plaintext PayPal email to database', async () => {
      // Arrange
      const allUpdateCalls: Record<string, unknown>[] = [];

      const mockUpdate = jest.fn().mockImplementation((payload) => {
        allUpdateCalls.push(payload);
        return {
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ id: TEST_BOOST_ID }],
                error: null,
              }),
            }),
          }),
        };
      });

      const mockFrom = jest.fn().mockImplementation((table) => {
        if (table === 'commission_boost_redemptions') {
          return { update: mockUpdate };
        }
        if (table === 'redemptions') {
          return {
            update: jest.fn().mockImplementation((payload) => {
              allUpdateCalls.push(payload);
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue({
                      data: [{ id: TEST_REDEMPTION_ID }],
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        return {};
      });

      mockCreateClient.mockResolvedValue({
        from: mockFrom,
      } as MockReturnValue);

      const plaintextEmail = 'supersecret.user@privatepaypal.com';

      // Act
      await commissionBoostRepository.savePaymentInfo(
        TEST_REDEMPTION_ID,
        TEST_CLIENT_ID,
        'paypal',
        plaintextEmail
      );

      // Assert - scan ALL payloads sent to database
      for (const payload of allUpdateCalls) {
        const payloadString = JSON.stringify(payload).toLowerCase();
        expect(payloadString).not.toContain('supersecret');
        expect(payloadString).not.toContain('privatepaypal');
      }
    });
  });
});
