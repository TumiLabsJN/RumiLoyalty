/**
 * Test Helpers - Barrel Export
 *
 * Central export for all test helper utilities.
 *
 * Usage:
 *   import {
 *     createTestClient,
 *     createTestClientRecord,
 *     createTestUser,
 *     cleanupTestData,
 *   } from '@/tests/helpers';
 */

// Client utilities
export {
  createTestClient,
  createTestAnonClient,
  assertSupabaseRunning,
  TEST_CONFIG,
} from './testClient';

// Factory functions
export {
  createTestClientRecord,
  createTestUser,
  createTestTier,
  createTestVideo,
  createTestReward,
  createTestMission,
  createTestTierSet,
  createTestSetup,
  // Types
  type TestClient,
  type TestUser,
  type TestTier,
  type TestVideo,
  type TestReward,
  type TestMission,
} from './factories';

// Cleanup utilities
export {
  cleanupTestData,
  cleanupAllTestData,
  type CleanupOptions,
} from './cleanup';
