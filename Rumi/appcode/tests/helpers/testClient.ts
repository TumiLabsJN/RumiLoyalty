/**
 * Test Supabase Client
 *
 * Creates a Supabase client pointing to the local development instance.
 * Used for integration tests that need real database access.
 *
 * Prerequisites:
 *   - Run `npx supabase start` before running tests
 *   - Local Supabase on ports 54321 (API), 54322 (DB)
 *
 * References:
 *   - EXECUTION_PLAN.md Task 8.4.3 (Test helper infrastructure)
 *   - supabase/config.toml (local port configuration)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

// Local Supabase configuration (from `npx supabase start` output)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

// Default local anon key (same for all local instances)
// This is the publishable key from `npx supabase start`
const LOCAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Default local service role key (bypasses RLS)
const LOCAL_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/**
 * Creates a Supabase client for integration tests.
 * Uses service role key to bypass RLS for test setup/teardown.
 */
export function createTestClient(): SupabaseClient<Database> {
  return createClient<Database>(
    LOCAL_SUPABASE_URL,
    LOCAL_SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Creates a Supabase client with anon key (simulates regular user).
 * Useful for testing RLS policies.
 */
export function createTestAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    LOCAL_SUPABASE_URL,
    LOCAL_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Checks if local Supabase is running.
 * Call this in beforeAll() to fail fast if Supabase isn't started.
 */
export async function assertSupabaseRunning(): Promise<void> {
  const client = createTestClient();

  try {
    // Simple health check - query a system table
    const { error } = await client.from('clients').select('id').limit(1);

    if (error && error.message.includes('ECONNREFUSED')) {
      throw new Error(
        'Local Supabase is not running. Start it with: npx supabase start'
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
      throw new Error(
        'Local Supabase is not running. Start it with: npx supabase start'
      );
    }
    // Other errors might be OK (table might not exist yet)
  }
}

// Export constants for direct use if needed
export const TEST_CONFIG = {
  url: LOCAL_SUPABASE_URL,
  anonKey: LOCAL_SUPABASE_ANON_KEY,
  serviceRoleKey: LOCAL_SUPABASE_SERVICE_ROLE_KEY,
  dbPort: 54322,
  apiPort: 54321,
  studioPort: 54323,
} as const;
