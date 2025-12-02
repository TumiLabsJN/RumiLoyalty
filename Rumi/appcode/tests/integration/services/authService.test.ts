/**
 * Integration Tests for Auth Service
 *
 * Tests authService functions against live Supabase database.
 *
 * Run with:
 *   cd appcode && npm test -- --testPathPattern=authService
 *
 * References:
 * - EXECUTION_PLAN.md Task 3.4.1 (Test infrastructure)
 * - API_CONTRACTS.md (All auth endpoints)
 * - ARCHITECTURE.md Section 12 (SECURITY DEFINER Pattern)
 *
 * Prerequisites:
 *   - SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Database migrations deployed
 */

import {
  createTestClient,
  createTestUser,
  cleanupTestData,
  setupTestDb,
  getTestSupabase,
  SEED_DATA,
} from '../../fixtures/factories';

// Environment variables are loaded by factories.ts

describe('Auth Service Integration Tests', () => {
  let testClientId: string;
  let cleanupFns: Array<() => Promise<void>> = [];

  beforeAll(async () => {
    // Verify database connection
    await setupTestDb();
  });

  afterAll(async () => {
    // Run all cleanup functions in reverse order
    for (const cleanup of cleanupFns.reverse()) {
      try {
        await cleanup();
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
    }
  });

  describe('Test Infrastructure', () => {
    it('should connect to Supabase', async () => {
      const supabase = getTestSupabase();
      const { data, error } = await supabase.from('clients').select('id').limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should create and cleanup test client', async () => {
      const { client, cleanup } = await createTestClient({
        name: 'Infrastructure Test Client',
      });

      expect(client.id).toBeDefined();
      expect(client.name).toBe('Infrastructure Test Client');

      // Verify client exists in database
      const supabase = getTestSupabase();
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();

      expect(data).not.toBeNull();
      expect(data?.name).toBe('Infrastructure Test Client');

      // Cleanup
      await cleanup();

      // Verify client is deleted
      const { data: afterDelete } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();

      expect(afterDelete).toBeNull();
    });

    it('should create and cleanup test user with FK relationships', async () => {
      // Create client first
      const { client, cleanup: clientCleanup } = await createTestClient({
        name: 'User Test Client',
      });
      cleanupFns.push(clientCleanup);

      // Create user
      const { user, cleanup: userCleanup } = await createTestUser({
        clientId: client.id,
        tiktokHandle: 'test_infra_user',
        email: 'infra@test.com',
      });
      cleanupFns.push(userCleanup);

      expect(user.id).toBeDefined();
      expect(user.clientId).toBe(client.id);
      expect(user.tiktokHandle).toBe('test_infra_user');

      // Verify user exists
      const supabase = getTestSupabase();
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      expect(data).not.toBeNull();
      expect(data?.client_id).toBe(client.id);
    });

    it('should access seed data constants', () => {
      expect(SEED_DATA.CLIENT_ID).toBe('11111111-1111-1111-1111-111111111111');
      expect(SEED_DATA.BRONZE_USER.handle).toBe('bronzecreator1');
    });
  });

  describe('RPC Function Access', () => {
    it('should query users via RPC function', async () => {
      const supabase = getTestSupabase();

      // Test auth_find_user_by_handle RPC
      const { data, error } = await supabase.rpc('auth_find_user_by_handle', {
        p_client_id: SEED_DATA.CLIENT_ID,
        p_handle: SEED_DATA.BRONZE_USER.handle,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);

      if (data && data.length > 0) {
        expect(data[0].tiktok_handle).toBe(SEED_DATA.BRONZE_USER.handle);
      }
    });

    it('should check handle existence via RPC function', async () => {
      const supabase = getTestSupabase();

      // Test auth_handle_exists RPC
      const { data: exists, error } = await supabase.rpc('auth_handle_exists', {
        p_client_id: SEED_DATA.CLIENT_ID,
        p_handle: SEED_DATA.BRONZE_USER.handle,
      });

      expect(error).toBeNull();
      expect(exists).toBe(true);

      // Test non-existent handle
      const { data: notExists } = await supabase.rpc('auth_handle_exists', {
        p_client_id: SEED_DATA.CLIENT_ID,
        p_handle: 'nonexistent_handle_12345',
      });

      expect(notExists).toBe(false);
    });
  });
});
