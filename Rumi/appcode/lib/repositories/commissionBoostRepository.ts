/**
 * Commission Boost Repository
 *
 * Data access layer for commission_boost_redemptions table.
 * Per ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 *
 * Responsibilities:
 * - CRUD operations on commission_boost_redemptions
 * - Database queries (Supabase)
 * - Tenant isolation enforcement
 * - Data mapping (DB → domain objects)
 *
 * NOT Responsible For:
 * - Business logic
 * - Computing derived values
 * - Orchestrating multiple operations
 *
 * References:
 * - SchemaFinalv2.md lines 524-746 (commission_boost_redemptions table)
 * - SchemaFinalv2.md lines 750-820 (commission_boost_state_history table)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement)
 */

import { createClient } from '@/lib/supabase/server-client';

/**
 * Parameters for creating a commission boost sub-state
 * Per SchemaFinalv2.md lines 688-715 (commission_boost_redemptions table)
 */
export interface CreateBoostStateParams {
  redemptionId: string;
  clientId: string;
  scheduledActivationDate: string; // DATE format: 'YYYY-MM-DD'
  durationDays: number;
  boostRate: number; // e.g., 5.00 for 5%
  tierCommissionRate?: number; // Optional: locked at claim for display
  userId: string; // For state history transitioned_by
}

/**
 * Result of createBoostState operation
 */
export interface CreateBoostStateResult {
  boostRedemptionId: string;
  boostStatus: string;
  scheduledActivationDate: string;
}

/**
 * Result of activateScheduledBoosts operation
 * Per GAP-BOOST-ACTIVATION specification
 */
export interface ActivateBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  activatedAt: string;
  expiresAt: string;
}

/**
 * Result of expireActiveBoosts operation
 * Per GAP-BOOST-ACTIVATION specification
 * Note: salesDelta comes from DB GENERATED column, NOT app-calculated
 */
export interface ExpireBoostResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  salesAtActivation: number;
  salesAtExpiration: number;
  salesDelta: number;
  boostRate: number;
  finalPayoutAmount: number;
}

/**
 * Result of transitionExpiredToPendingInfo operation
 * Per BUG-BOOST-EXPIRATION-STATE fix
 */
export interface TransitionToPendingInfoResult {
  boostRedemptionId: string;
  redemptionId: string;
  userId: string;
  finalPayoutAmount: number;
}

export const commissionBoostRepository = {
  /**
   * Create commission boost sub-state record with initial state history.
   * Per Task 6.1.8 and Loyalty.md Pattern 7 (initial creation logging).
   *
   * Inserts into:
   * 1. commission_boost_redemptions (boost_status='scheduled')
   * 2. commission_boost_state_history (from_status=NULL, to_status='scheduled')
   *
   * SECURITY: Validates client_id is provided (ARCHITECTURE.md Section 9 Critical Rule #2)
   */
  async createBoostState(
    params: CreateBoostStateParams
  ): Promise<CreateBoostStateResult> {
    // Critical Rule #2: Validate client_id is provided
    if (!params.clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();

    // Step 1: Insert commission_boost_redemptions record
    const { data: boostRecord, error: boostError } = await supabase
      .from('commission_boost_redemptions')
      .insert({
        redemption_id: params.redemptionId,
        client_id: params.clientId,
        boost_status: 'scheduled', // Per SchemaFinalv2.md default
        scheduled_activation_date: params.scheduledActivationDate,
        duration_days: params.durationDays,
        boost_rate: params.boostRate,
        tier_commission_rate: params.tierCommissionRate ?? null,
      })
      .select('id, boost_status, scheduled_activation_date')
      .single();

    if (boostError) {
      console.error(
        '[CommissionBoostRepository] Error creating boost state:',
        boostError
      );
      throw new Error(`Failed to create boost state: ${boostError.message}`);
    }

    // Step 2: Insert initial state history record (NULL → 'scheduled')
    // Per Loyalty.md Pattern 7: Application code logs initial creation
    const { error: historyError } = await supabase
      .from('commission_boost_state_history')
      .insert({
        boost_redemption_id: boostRecord.id,
        client_id: params.clientId,
        from_status: null, // NULL for initial creation
        to_status: 'scheduled',
        transitioned_by: params.userId,
        transition_type: 'api',
      });

    if (historyError) {
      console.error(
        '[CommissionBoostRepository] Error creating state history:',
        historyError
      );
      // Note: Boost record was created, but history failed
      // In production, this should be a transaction - for now, log and continue
    }

    return {
      boostRedemptionId: boostRecord.id,
      boostStatus: boostRecord.boost_status,
      scheduledActivationDate: boostRecord.scheduled_activation_date,
    };
  },

  /**
   * Get boost status for a redemption.
   * Used to verify redemption is in 'pending_info' status before accepting payment info.
   *
   * @param redemptionId - Parent redemption ID
   * @param clientId - Tenant ID for multi-tenant isolation
   * @returns boost_status or null if not found
   */
  async getBoostStatus(
    redemptionId: string,
    clientId: string
  ): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('commission_boost_redemptions')
      .select('boost_status')
      .eq('redemption_id', redemptionId)
      .eq('client_id', clientId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.boost_status;
  },

  /**
   * Save payment information for a commission boost redemption.
   * Per Task 6.1.14 and API_CONTRACTS.md lines 5331-5451.
   *
   * Updates:
   * 1. commission_boost_redemptions: payment_method, payment_account (encrypted),
   *    payment_info_collected_at, boost_status='pending_payout'
   * 2. redemptions: status='fulfilled', fulfilled_at
   *
   * SECURITY:
   * - Encrypts payment_account before UPDATE (Pattern 9)
   * - Filters by client_id (Section 9 Critical Rule #1)
   * - Verifies count > 0 after UPDATE (Section 9 checklist item 4)
   *
   * @param redemptionId - Parent redemption ID
   * @param clientId - Tenant ID for multi-tenant isolation
   * @param paymentMethod - 'paypal' or 'venmo'
   * @param paymentAccount - PayPal email or Venmo handle (will be encrypted)
   * @returns Object with redemption status update info
   */
  async savePaymentInfo(
    redemptionId: string,
    clientId: string,
    paymentMethod: 'paypal' | 'venmo',
    paymentAccount: string
  ): Promise<{
    redemptionId: string;
    status: 'fulfilled';
    paymentMethod: 'paypal' | 'venmo';
    paymentInfoCollectedAt: string;
  }> {
    // Import encrypt lazily to avoid circular dependencies
    const { encrypt } = await import('@/lib/utils/encryption');

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Encrypt payment account before storage (Pattern 9)
    const encryptedAccount = encrypt(paymentAccount);

    // Step 1: Update commission_boost_redemptions with payment info
    const { data: boostData, error: boostError } = await supabase
      .from('commission_boost_redemptions')
      .update({
        payment_method: paymentMethod,
        payment_account: encryptedAccount,
        payment_info_collected_at: now,
        boost_status: 'pending_payout', // Transition from pending_info to pending_payout
      })
      .eq('redemption_id', redemptionId)
      .eq('client_id', clientId) // Critical Rule #1: Tenant isolation
      .select('id');

    if (boostError) {
      console.error(
        '[CommissionBoostRepository] Error saving payment info:',
        boostError
      );
      throw new Error(`Failed to save payment info: ${boostError.message}`);
    }

    // Section 9 checklist item 4: Verify count > 0
    if (!boostData || boostData.length === 0) {
      throw new Error(
        `NotFoundError: Commission boost redemption for ${redemptionId} not found for client ${clientId}`
      );
    }

    // Step 2: Update redemptions.status to 'fulfilled'
    const { data: redemptionData, error: redemptionError } = await supabase
      .from('redemptions')
      .update({
        status: 'fulfilled',
        fulfilled_at: now,
      })
      .eq('id', redemptionId)
      .eq('client_id', clientId) // Critical Rule #1: Tenant isolation
      .select('id');

    if (redemptionError) {
      console.error(
        '[CommissionBoostRepository] Error updating redemption status:',
        redemptionError
      );
      throw new Error(
        `Failed to update redemption status: ${redemptionError.message}`
      );
    }

    // Section 9 checklist item 4: Verify count > 0
    if (!redemptionData || redemptionData.length === 0) {
      throw new Error(
        `NotFoundError: Redemption ${redemptionId} not found for client ${clientId}`
      );
    }

    return {
      redemptionId: redemptionId,
      status: 'fulfilled',
      paymentMethod: paymentMethod,
      paymentInfoCollectedAt: now,
    };
  },

  /**
   * Activate scheduled boosts where scheduled_activation_date <= TODAY.
   * Per GAP-BOOST-ACTIVATION specification.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries (audit correction).
   * Sets boost_status='active', activated_at, expires_at, sales_at_activation.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
  async activateScheduledBoosts(
    clientId: string
  ): Promise<{
    activatedCount: number;
    activations: ActivateBoostResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const activations: ActivateBoostResult[] = [];

    try {
      // Single UPDATE...FROM with JOIN (no N+1 - audit correction)
      // Uses raw SQL via rpc because Supabase JS doesn't support UPDATE...FROM syntax directly
      // IMPL Audit Fix: Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('activate_scheduled_boosts', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error activating scheduled boosts:', error);
        errors.push(`Activation failed: ${error.message}`);
        return { activatedCount: 0, activations: [], errors };
      }

      // Map RPC results to ActivateBoostResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          activations.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            salesAtActivation: Number(row.sales_at_activation),
            activatedAt: row.activated_at,
            expiresAt: row.expires_at,
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Activated ${activations.length} scheduled boosts for client ${clientId}`
      );

      return {
        activatedCount: activations.length,
        activations,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in activateScheduledBoosts:', errorMessage);
      errors.push(errorMessage);
      return { activatedCount: 0, activations: [], errors };
    }
  },

  /**
   * Expire active boosts where expires_at <= NOW().
   * Per GAP-BOOST-ACTIVATION specification + BUG-BOOST-EXPIRATION-STATE fix.
   *
   * IMPORTANT: After this call, boosts are in 'expired' state (NOT 'pending_info').
   * Call transitionExpiredToPendingInfo() to move to 'pending_info'.
   *
   * Uses single UPDATE...FROM with JOIN to avoid N+1 queries.
   * CRITICAL: sales_delta is a GENERATED column in the database.
   * Do NOT calculate in application - use RETURNING to get DB-calculated value.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   *
   * Database triggers will automatically:
   * 1. sync_boost_to_redemption() - updates parent redemptions.status
   * 2. log_boost_transition() - logs to commission_boost_state_history
   */
  async expireActiveBoosts(
    clientId: string
  ): Promise<{
    expiredCount: number;
    expirations: ExpireBoostResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const expirations: ExpireBoostResult[] = [];

    try {
      // Single RPC call handles both phases in transaction (audit correction)
      // Phase 1: Set sales_at_expiration (DB calculates sales_delta via GENERATED column)
      // Phase 2: Calculate final_payout_amount and transition to pending_info
      // IMPL Audit Fix: Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('expire_active_boosts', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error expiring active boosts:', error);
        errors.push(`Expiration failed: ${error.message}`);
        return { expiredCount: 0, expirations: [], errors };
      }

      // Map RPC results to ExpireBoostResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          expirations.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            salesAtActivation: Number(row.sales_at_activation),
            salesAtExpiration: Number(row.sales_at_expiration),
            salesDelta: Number(row.sales_delta), // From DB GENERATED column
            boostRate: Number(row.boost_rate),
            finalPayoutAmount: Number(row.final_payout_amount),
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Expired ${expirations.length} active boosts for client ${clientId}`
      );

      return {
        expiredCount: expirations.length,
        expirations,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in expireActiveBoosts:', errorMessage);
      errors.push(errorMessage);
      return { expiredCount: 0, expirations: [], errors };
    }
  },

  /**
   * Transition expired boosts to pending_info state.
   * Per BUG-BOOST-EXPIRATION-STATE fix - Step 6 of documented flow.
   *
   * Call this after expireActiveBoosts() to request payment info.
   * For MVP, called immediately. Future: configurable dwell time.
   *
   * CRITICAL: Includes client_id filter in WHERE clause for multi-tenant isolation.
   */
  async transitionExpiredToPendingInfo(
    clientId: string
  ): Promise<{
    transitionedCount: number;
    transitions: TransitionToPendingInfoResult[];
    errors: string[];
  }> {
    // Critical Rule #2: Validate client_id is provided
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const errors: string[] = [];
    const transitions: TransitionToPendingInfoResult[] = [];

    try {
      // Use 'as Function' pattern since RPC not in generated types yet
      const { data, error } = await (supabase.rpc as Function)('transition_expired_to_pending_info', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('[CommissionBoostRepository] Error transitioning expired to pending_info:', error);
        errors.push(`Transition failed: ${error.message}`);
        return { transitionedCount: 0, transitions: [], errors };
      }

      // Map RPC results to TransitionToPendingInfoResult
      if (data && Array.isArray(data)) {
        for (const row of data) {
          transitions.push({
            boostRedemptionId: row.boost_redemption_id,
            redemptionId: row.redemption_id,
            userId: row.user_id,
            finalPayoutAmount: Number(row.final_payout_amount),
          });
        }
      }

      console.log(
        `[CommissionBoostRepository] Transitioned ${transitions.length} expired boosts to pending_info for client ${clientId}`
      );

      return {
        transitionedCount: transitions.length,
        transitions,
        errors,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[CommissionBoostRepository] Unexpected error in transitionExpiredToPendingInfo:', errorMessage);
      errors.push(errorMessage);
      return { transitionedCount: 0, transitions: [], errors };
    }
  },
};
