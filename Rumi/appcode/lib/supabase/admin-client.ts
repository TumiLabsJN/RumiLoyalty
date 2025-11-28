import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

/**
 * Create Supabase Admin Client (Service Role)
 *
 * ⚠️  WARNING: This client BYPASSES Row Level Security (RLS)!
 *
 * Uses:
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (full database access)
 *
 * ONLY use this client for:
 * - Cron jobs (data sync, scheduled tasks)
 * - Admin operations (tier checkpoints, bulk updates)
 * - Background workers
 *
 * NEVER use this client for:
 * - User-facing API routes
 * - Server components that handle user requests
 * - Any endpoint accessible by creators
 *
 * For user-facing operations, use server-client.ts instead.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Admin client requires service role key for elevated access.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
