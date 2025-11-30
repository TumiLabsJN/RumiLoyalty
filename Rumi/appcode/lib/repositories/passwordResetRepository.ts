/**
 * Password Reset Repository
 *
 * Data access layer for password_reset_tokens table.
 * Uses RPC functions with SECURITY DEFINER to bypass RLS.
 * Table has USING(false) policy - all access must go through RPC.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - SecurityDefiner.md Section 3.5 (Repository Changes)
 * - SchemaFinalv2.md lines 187-219 (password_reset_tokens table)
 * - API_CONTRACTS.md lines 1464-1613 (forgot-password endpoint)
 *
 * Security Notes:
 * - Tokens are stored as bcrypt hashes (not plaintext)
 * - Tokens expire after 15 minutes
 * - Tokens are one-time use (marked with used_at timestamp)
 */

import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Password reset token data returned from repository
 */
export interface PasswordResetData {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  ipAddress: string | null;
}

/**
 * Map RPC result to domain object
 */
function mapRpcResultToPasswordResetData(row: {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at?: string;
  ip_address?: string | null;
}): PasswordResetData {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    createdAt: row.created_at ?? new Date().toISOString(),
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    ipAddress: row.ip_address ?? null,
  };
}

export const passwordResetRepository = {
  /**
   * Create a new password reset token
   *
   * Uses RPC function to bypass USING(false) policy.
   *
   * @param data - Token data to insert
   * @returns Created token data
   */
  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
  }): Promise<PasswordResetData> {
    const supabase = createAdminClient();

    const { data: tokenId, error } = await supabase.rpc('auth_create_reset_token', {
      p_user_id: data.userId,
      p_token_hash: data.tokenHash,
      p_expires_at: data.expiresAt.toISOString(),
      p_ip_address: data.ipAddress,
    });

    if (error) {
      throw error;
    }

    if (!tokenId) {
      throw new Error('Failed to create password reset token');
    }

    // RPC returns just the ID, construct full data
    return {
      id: tokenId,
      userId: data.userId,
      tokenHash: data.tokenHash,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt.toISOString(),
      usedAt: null,
      ipAddress: data.ipAddress ?? null,
    };
  },

  /**
   * Find all valid (non-expired, non-used) tokens
   *
   * Uses RPC function to bypass USING(false) policy.
   * Used for token verification - must iterate and compare with bcrypt
   * since bcrypt hashes are salted and can't be queried directly.
   *
   * @returns Array of valid token data
   */
  async findAllValid(): Promise<PasswordResetData[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_find_valid_reset_tokens');

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRpcResultToPasswordResetData);
  },

  /**
   * Find token by ID
   *
   * NOT converted to RPC - not used in auth flow.
   * reset-password uses findAllValid + bcrypt compare.
   *
   * @param id - Token UUID
   * @returns Token data or null if not found
   */
  async findById(id: string): Promise<PasswordResetData | null> {
    const supabase = createAdminClient();

    // Use admin client which bypasses RLS
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      tokenHash: data.token_hash,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      usedAt: data.used_at,
      ipAddress: data.ip_address,
    };
  },

  /**
   * Find token by user ID (for rate limiting)
   *
   * Uses RPC function to bypass USING(false) policy.
   * Returns all tokens created for a user in the last hour.
   *
   * @param userId - User UUID
   * @returns Array of token data
   */
  async findRecentByUserId(userId: string): Promise<PasswordResetData[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_find_recent_reset_tokens', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }

    // RPC returns only id and created_at for rate limiting
    return (data ?? []).map((row: { id: string; created_at: string }) => ({
      id: row.id,
      userId: userId,
      tokenHash: '', // Not returned by RPC (not needed for rate limiting)
      createdAt: row.created_at,
      expiresAt: '', // Not returned by RPC
      usedAt: null,
      ipAddress: null,
    }));
  },

  /**
   * Mark token as used
   *
   * Uses RPC function to bypass USING(false) policy.
   * Sets used_at timestamp to prevent token reuse.
   *
   * @param id - Token UUID
   */
  async markUsed(id: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('auth_mark_reset_token_used', {
      p_token_id: id,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Invalidate all tokens for a user
   *
   * Uses RPC function to bypass USING(false) policy.
   * Marks all unused tokens as used. Called when:
   * - User successfully resets password
   * - User requests a new reset (invalidate old ones)
   *
   * @param userId - User UUID
   */
  async invalidateAllForUser(userId: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('auth_invalidate_user_reset_tokens', {
      p_user_id: userId,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Delete expired tokens
   *
   * NOT converted to RPC - cleanup job uses admin client directly.
   *
   * @returns Number of deleted records
   */
  async deleteExpired(): Promise<number> {
    const supabase = createAdminClient();

    // Note: With USING(false) policy, we need to use service_role
    // which bypasses RLS. This already uses admin client.
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw error;
    }

    return data?.length ?? 0;
  },
};
