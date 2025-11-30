/**
 * OTP Repository
 *
 * Data access layer for otp_codes table.
 * Uses RPC functions with SECURITY DEFINER to bypass RLS.
 * Table has USING(false) policy - all access must go through RPC.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - SecurityDefiner.md Section 3.4 (Repository Changes)
 * - SchemaFinalv2.md lines 158-184 (otp_codes table)
 * - API_CONTRACTS.md lines 520-605 (OTP verification flow)
 */

import { createAdminClient } from '@/lib/supabase/admin-client';
import { NotFoundError } from '@/lib/utils/errors';

/**
 * OTP data returned from repository
 */
export interface OtpData {
  id: string;
  userId: string | null;
  sessionId: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  createdAt: string;
}

/**
 * Map RPC result to domain object
 */
function mapRpcResultToOtpData(row: {
  id: string;
  user_id: string | null;
  session_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  used: boolean;
  created_at: string;
}): OtpData {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    codeHash: row.code_hash,
    expiresAt: row.expires_at,
    attempts: row.attempts ?? 0,
    used: row.used ?? false,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export const otpRepository = {
  /**
   * Create a new OTP code
   *
   * Uses RPC function to bypass USING(false) policy.
   *
   * @param otpData - OTP data to insert
   * @returns Created OTP data (id only from RPC)
   */
  async create(otpData: {
    userId?: string | null;
    sessionId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<OtpData> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_create_otp', {
      p_user_id: otpData.userId ?? '',
      p_session_id: otpData.sessionId,
      p_code_hash: otpData.codeHash,
      p_expires_at: otpData.expiresAt.toISOString(),
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create OTP');
    }

    // RPC returns just the ID, construct full OtpData
    return {
      id: data,
      userId: otpData.userId ?? null,
      sessionId: otpData.sessionId,
      codeHash: otpData.codeHash,
      expiresAt: otpData.expiresAt.toISOString(),
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Find OTP by session ID (without validity checks)
   *
   * Uses RPC function to bypass USING(false) policy.
   *
   * @param sessionId - Session ID from HTTP-only cookie
   * @returns OTP data or null if not found
   */
  async findBySessionId(sessionId: string): Promise<OtpData | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_find_otp_by_session', {
      p_session_id: sessionId,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRpcResultToOtpData(data[0]);
  },

  /**
   * Find a valid OTP by session ID
   *
   * Checks validity in application code after fetching via RPC.
   *
   * @param sessionId - Session ID from HTTP-only cookie
   * @returns OTP data or null if not found/invalid
   */
  async findValidBySessionId(sessionId: string): Promise<OtpData | null> {
    const otp = await this.findBySessionId(sessionId);

    if (!otp) {
      return null;
    }

    // Check validity in application code
    const now = new Date();
    const expiresAt = new Date(otp.expiresAt);

    if (otp.used || otp.attempts >= 3 || expiresAt <= now) {
      return null;
    }

    return otp;
  },

  /**
   * Mark OTP as used
   *
   * Uses RPC function to bypass USING(false) policy.
   *
   * @param sessionId - Session ID to identify the OTP
   */
  async markUsed(sessionId: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase.rpc('auth_mark_otp_used', {
      p_session_id: sessionId,
    });

    if (error) {
      throw error;
    }
  },

  /**
   * Increment attempt counter
   *
   * Uses RPC function to bypass USING(false) policy.
   * Returns the new attempt count.
   *
   * @param sessionId - Session ID to identify the OTP
   * @returns New attempt count
   */
  async incrementAttempts(sessionId: string): Promise<number> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_increment_otp_attempts', {
      p_session_id: sessionId,
    });

    if (error) {
      throw error;
    }

    return data ?? 0;
  },

  /**
   * Delete expired OTPs
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
      .from('otp_codes')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      throw error;
    }

    return data?.length ?? 0;
  },

  /**
   * Delete OTP by session ID
   *
   * NOT converted to RPC - cleanup function.
   *
   * @param sessionId - Session ID to identify the OTP
   * @returns true if deleted, false if not found
   */
  async deleteBySessionId(sessionId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('otp_codes')
      .delete()
      .eq('session_id', sessionId)
      .select('id');

    if (error) {
      throw error;
    }

    return (data?.length ?? 0) > 0;
  },

  /**
   * Link OTP to user after user creation
   *
   * NOT converted to RPC - userId is set at OTP creation via auth_create_otp.
   * This function is deprecated but kept for backwards compatibility.
   *
   * @param sessionId - Session ID to identify the OTP
   * @param userId - User ID to link
   */
  async linkToUser(sessionId: string, userId: string): Promise<void> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('otp_codes')
      .update({ user_id: userId })
      .eq('session_id', sessionId)
      .select('id');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new NotFoundError('OTP');
    }
  },
};
