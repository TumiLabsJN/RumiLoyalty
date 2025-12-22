/**
 * User Repository
 *
 * Data access layer for users table.
 * Uses RPC functions with SECURITY DEFINER to bypass RLS for auth operations.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement, lines 1104-1137)
 * - SecurityDefiner.md Section 3.2 (Repository Changes)
 * - SchemaFinalv2.md (users table)
 */

import { createAdminClient } from '@/lib/supabase/admin-client';
import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';
import { NotFoundError } from '@/lib/utils/errors';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

/**
 * User data returned from repository
 * Sensitive fields are NOT included (handled by service layer if needed)
 */
export interface UserData {
  id: string;
  clientId: string;
  tiktokHandle: string;
  email: string | null;
  emailVerified: boolean;
  currentTier: string;
  tierAchievedAt: string | null;
  totalSales: number;
  isAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Map database row to domain object
 */
function mapToUserData(row: UserRow): UserData {
  return {
    id: row.id,
    clientId: row.client_id,
    tiktokHandle: row.tiktok_handle,
    email: row.email,
    emailVerified: row.email_verified ?? false,
    currentTier: row.current_tier ?? 'tier_1',
    tierAchievedAt: row.tier_achieved_at,
    totalSales: row.total_sales ?? 0,
    isAdmin: row.is_admin ?? false,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

/**
 * Map RPC result to domain object
 * RPC functions return different column sets than full table rows
 */
function mapRpcResultToUserData(row: {
  id: string;
  client_id: string;
  tiktok_handle: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
  last_login_at?: string | null;
  current_tier?: string | null;
}): UserData {
  return {
    id: row.id,
    clientId: row.client_id,
    tiktokHandle: row.tiktok_handle,
    email: row.email,
    emailVerified: row.email_verified ?? false,
    currentTier: row.current_tier ?? 'tier_1',
    tierAchievedAt: null, // Not returned by RPC
    totalSales: 0, // Not returned by RPC
    isAdmin: row.is_admin ?? false,
    lastLoginAt: row.last_login_at ?? null,
    createdAt: new Date().toISOString(), // Not returned by RPC
  };
}

export const userRepository = {
  /**
   * Find user by TikTok handle within a tenant
   *
   * Uses RPC function to bypass RLS for unauthenticated routes.
   *
   * @param clientId - Tenant ID (from server environment)
   * @param handle - TikTok handle (with or without @)
   * @returns User data or null if not found
   */
  async findByHandle(clientId: string, handle: string): Promise<UserData | null> {
    const supabase = createAdminClient();

    // Normalize handle (remove @ if present)
    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    const { data, error } = await supabase.rpc('auth_find_user_by_handle', {
      p_client_id: clientId,
      p_handle: normalizedHandle,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRpcResultToUserData(data[0]);
  },

  /**
   * Find user by email within a tenant
   *
   * Uses RPC function to bypass RLS for unauthenticated routes.
   *
   * @param clientId - Tenant ID (from server environment)
   * @param email - User's email address
   * @returns User data or null if not found
   */
  async findByEmail(clientId: string, email: string): Promise<UserData | null> {
    const supabase = createAdminClient();

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.rpc('auth_find_user_by_email', {
      p_client_id: clientId,
      p_email: normalizedEmail,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRpcResultToUserData(data[0]);
  },

  /**
   * Find user by Supabase Auth ID
   *
   * Uses RPC function to bypass RLS.
   *
   * @param authId - Supabase Auth user ID (UUID)
   * @returns User data or null if not found
   */
  async findByAuthId(authId: string): Promise<UserData | null> {
    const t0 = Date.now();
    const supabase = createAdminClient();
    console.log(`[TIMING][userRepository] createAdminClient(): ${Date.now() - t0}ms`);

    const t1 = Date.now();
    const { data, error } = await supabase.rpc('auth_find_user_by_id', {
      p_user_id: authId,
    });
    console.log(`[TIMING][userRepository] RPC auth_find_user_by_id: ${Date.now() - t1}ms`);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRpcResultToUserData(data[0]);
  },

  /**
   * Create a new user
   *
   * Uses RPC function to bypass RLS. NO is_admin parameter allowed.
   *
   * @param userData - User data to insert
   * @returns Created user data
   */
  async create(userData: {
    id: string; // From Supabase Auth
    clientId: string;
    tiktokHandle: string;
    email: string;
    passwordHash: string; // Hashed password from Supabase Auth
    termsVersion?: string;
  }): Promise<UserData> {
    const supabase = createAdminClient();

    // Validate client_id is provided (Section 9 Critical Rule #2)
    if (!userData.clientId) {
      throw new Error('client_id is required for user creation');
    }

    const { data, error } = await supabase.rpc('auth_create_user', {
      p_id: userData.id,
      p_client_id: userData.clientId,
      p_tiktok_handle: userData.tiktokHandle,
      p_email: userData.email.toLowerCase().trim(),
      p_password_hash: userData.passwordHash,
      p_terms_version: userData.termsVersion,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to create user');
    }

    // Map RPC result (different columns than full table row)
    const row = data[0];
    return {
      id: row.id,
      clientId: row.client_id,
      tiktokHandle: row.tiktok_handle,
      email: row.email,
      emailVerified: row.email_verified ?? false,
      currentTier: row.current_tier ?? 'tier_1',
      tierAchievedAt: null,
      totalSales: 0,
      isAdmin: row.is_admin ?? false,
      lastLoginAt: null,
      createdAt: row.created_at ?? new Date().toISOString(),
    };
  },

  /**
   * Update user's last login timestamp
   *
   * Uses RPC function to bypass RLS.
   *
   * @param clientId - Tenant ID (not used by RPC but kept for API consistency)
   * @param userId - User ID
   */
  async updateLastLogin(clientId: string, userId: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('auth_update_last_login', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Update user's email verification status
   *
   * Uses RPC function to bypass RLS.
   *
   * @param clientId - Tenant ID (not used by RPC but kept for API consistency)
   * @param userId - User ID
   */
  async markEmailVerified(clientId: string, userId: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('auth_mark_email_verified', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Update user's terms acceptance
   *
   * NOT converted to RPC - terms are captured at signup via auth_create_user.
   * This function is only used for updating terms after signup.
   *
   * @param clientId - Tenant ID
   * @param userId - User ID
   * @param termsVersion - Version of terms accepted
   * @throws NotFoundError if user not found in tenant
   */
  async updateTermsAcceptance(
    clientId: string,
    userId: string,
    termsVersion: string
  ): Promise<void> {
    const supabase = await createClient();

    const { error, count } = await supabase
      .from('users')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: termsVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('client_id', clientId); // TENANT ISOLATION

    if (error) {
      throw error;
    }
  },

  /**
   * Check if TikTok handle exists in tenant
   *
   * Uses RPC function to bypass RLS for unauthenticated routes.
   *
   * @param clientId - Tenant ID
   * @param handle - TikTok handle to check
   * @returns true if handle exists, false otherwise
   */
  async handleExists(clientId: string, handle: string): Promise<boolean> {
    const supabase = createAdminClient();

    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    const { data, error } = await supabase.rpc('auth_handle_exists', {
      p_client_id: clientId,
      p_handle: normalizedHandle,
    });

    if (error) {
      throw error;
    }

    return data ?? false;
  },

  /**
   * Check if email exists in tenant
   *
   * Uses RPC function to bypass RLS for unauthenticated routes.
   *
   * @param clientId - Tenant ID
   * @param email - Email to check
   * @returns true if email exists, false otherwise
   */
  async emailExists(clientId: string, email: string): Promise<boolean> {
    const supabase = createAdminClient();

    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.rpc('auth_email_exists', {
      p_client_id: clientId,
      p_email: normalizedEmail,
    });

    if (error) {
      throw error;
    }

    return data ?? false;
  },

  /**
   * Get user's saved payment information for pre-filling payment modals.
   * Per Task 6.1.13 and API_CONTRACTS.md lines 5287-5327.
   *
   * Queries users.default_payment_method and users.default_payment_account.
   * Decrypts payment_account using Pattern 9 encryption utility.
   *
   * SECURITY:
   * - Filters by client_id AND user_id (Section 9 Critical Rule #1)
   * - Decrypts default_payment_account (Pattern 9)
   *
   * @param userId - User ID
   * @param clientId - Tenant ID for multi-tenant isolation
   * @returns PaymentInfoResult with hasPaymentInfo, paymentMethod, paymentAccount
   */
  async getPaymentInfo(
    userId: string,
    clientId: string
  ): Promise<{
    hasPaymentInfo: boolean;
    paymentMethod: 'paypal' | 'venmo' | null;
    paymentAccount: string | null;
  }> {
    // Import decrypt lazily to avoid circular dependencies
    const { safeDecrypt } = await import('@/lib/utils/encryption');

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('default_payment_method, default_payment_account')
      .eq('id', userId)
      .eq('client_id', clientId) // Critical Rule #1: Tenant isolation
      .single();

    if (error) {
      console.error('[UserRepository] Error fetching payment info:', error);
      // Return empty result on error (user may not exist)
      return {
        hasPaymentInfo: false,
        paymentMethod: null,
        paymentAccount: null,
      };
    }

    // No saved payment info
    if (!data.default_payment_method) {
      return {
        hasPaymentInfo: false,
        paymentMethod: null,
        paymentAccount: null,
      };
    }

    // Decrypt payment account (Pattern 9)
    const decryptedAccount = data.default_payment_account
      ? safeDecrypt(data.default_payment_account)
      : null;

    return {
      hasPaymentInfo: true,
      paymentMethod: data.default_payment_method as 'paypal' | 'venmo',
      paymentAccount: decryptedAccount,
    };
  },

  /**
   * Save user's default payment information.
   * Per Task 6.1.14 and API_CONTRACTS.md lines 5331-5451.
   *
   * Encrypts payment_account using Pattern 9 (AES-256-GCM) before storage.
   * Called when saveAsDefault=true during payment info submission.
   *
   * SECURITY:
   * - Encrypts default_payment_account before UPDATE (Pattern 9)
   * - Filters by client_id AND user_id (Section 9 Critical Rule #1)
   * - Verifies count > 0 after UPDATE (Section 9 checklist item 4)
   *
   * @param userId - User ID
   * @param clientId - Tenant ID for multi-tenant isolation
   * @param paymentMethod - 'paypal' or 'venmo'
   * @param paymentAccount - PayPal email or Venmo handle (will be encrypted)
   * @returns boolean indicating success
   */
  async savePaymentInfo(
    userId: string,
    clientId: string,
    paymentMethod: 'paypal' | 'venmo',
    paymentAccount: string
  ): Promise<boolean> {
    // Import encrypt lazily to avoid circular dependencies
    const { encrypt } = await import('@/lib/utils/encryption');

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Encrypt payment account before storage (Pattern 9)
    const encryptedAccount = encrypt(paymentAccount);

    const { data, error } = await supabase
      .from('users')
      .update({
        default_payment_method: paymentMethod,
        default_payment_account: encryptedAccount,
        payment_info_updated_at: now,
        updated_at: now,
      })
      .eq('id', userId)
      .eq('client_id', clientId) // Critical Rule #1: Tenant isolation
      .select('id');

    if (error) {
      console.error('[UserRepository] Error saving payment info:', error);
      throw new Error(`Failed to save payment info: ${error.message}`);
    }

    // Section 9 checklist item 4: Verify count > 0
    if (!data || data.length === 0) {
      console.error(
        '[UserRepository] No rows updated for payment info - user not found'
      );
      return false;
    }

    return true;
  },
};
