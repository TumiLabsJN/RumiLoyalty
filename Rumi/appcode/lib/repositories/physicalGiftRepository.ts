/**
 * Physical Gift Repository
 *
 * Data access layer for physical_gift_redemptions table.
 * Per ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 *
 * Responsibilities:
 * - CRUD operations on physical_gift_redemptions
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
 * - SchemaFinalv2.md lines 824-889 (physical_gift_redemptions table)
 * - ARCHITECTURE.md Section 9 (Multitenancy Enforcement)
 */

import { createClient } from '@/lib/supabase/server-client';

/**
 * Shipping address info for physical gift creation
 * Per SchemaFinalv2.md lines 857-865 (physical_gift_redemptions shipping fields)
 */
export interface ShippingInfo {
  recipientFirstName: string;
  recipientLastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string; // Defaults to 'USA'
  phone?: string;
}

/**
 * Size info for physical gifts that require sizing
 * Per SchemaFinalv2.md lines 853-856 (size fields)
 */
export interface SizeInfo {
  requiresSize: boolean;
  sizeCategory?: 'clothing' | 'shoes' | null;
  sizeValue?: string; // e.g., 'S', 'M', 'L', 'XL', '8', '9.5'
}

/**
 * Parameters for creating a physical gift sub-state
 */
export interface CreateGiftStateParams {
  redemptionId: string;
  clientId: string;
  shippingInfo: ShippingInfo;
  sizeInfo?: SizeInfo;
}

/**
 * Result of createGiftState operation
 */
export interface CreateGiftStateResult {
  giftRedemptionId: string;
  shippingInfoSubmittedAt: string;
}

export const physicalGiftRepository = {
  /**
   * Create physical gift sub-state record with shipping info.
   * Per Task 6.1.11 and SchemaFinalv2.md lines 826-890.
   *
   * Shipping state is inferred from timestamps:
   * - shipped_at IS NULL = pending
   * - shipped_at IS NOT NULL = shipped
   * - delivered_at IS NOT NULL = delivered
   *
   * SECURITY: Validates client_id is provided (ARCHITECTURE.md Section 9 Critical Rule #2)
   * NOTE: Shipping addresses are NOT encrypted per Loyalty.md Pattern 9 (only payment accounts)
   */
  async createGiftState(
    params: CreateGiftStateParams
  ): Promise<CreateGiftStateResult> {
    // Critical Rule #2: Validate client_id is provided
    if (!params.clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const submittedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('physical_gift_redemptions')
      .insert({
        redemption_id: params.redemptionId,
        client_id: params.clientId,
        // Size fields (optional)
        requires_size: params.sizeInfo?.requiresSize ?? false,
        size_category: params.sizeInfo?.sizeCategory ?? null,
        size_value: params.sizeInfo?.sizeValue ?? null,
        size_submitted_at: params.sizeInfo?.sizeValue ? submittedAt : null,
        // Shipping fields (required)
        shipping_recipient_first_name: params.shippingInfo.recipientFirstName,
        shipping_recipient_last_name: params.shippingInfo.recipientLastName,
        shipping_address_line1: params.shippingInfo.addressLine1,
        shipping_address_line2: params.shippingInfo.addressLine2 ?? null,
        shipping_city: params.shippingInfo.city,
        shipping_state: params.shippingInfo.state,
        shipping_postal_code: params.shippingInfo.postalCode,
        shipping_country: params.shippingInfo.country ?? 'USA',
        shipping_phone: params.shippingInfo.phone ?? null,
        shipping_info_submitted_at: submittedAt,
      })
      .select('id, shipping_info_submitted_at')
      .single();

    if (error) {
      console.error(
        '[PhysicalGiftRepository] Error creating gift state:',
        error
      );
      throw new Error(`Failed to create gift state: ${error.message}`);
    }

    return {
      giftRedemptionId: data.id,
      shippingInfoSubmittedAt: data.shipping_info_submitted_at,
    };
  },

  /**
   * Mark a physical gift as shipped with tracking info.
   * Per Task 6.1.12 and SchemaFinalv2.md lines 867-870.
   *
   * Shipping state is inferred from timestamps:
   * - shipped_at IS NULL = pending
   * - shipped_at IS NOT NULL = shipped
   *
   * SECURITY:
   * - Filters by client_id (ARCHITECTURE.md Section 9 Critical Rule #1)
   * - Verifies count > 0 after UPDATE (Section 9 checklist item 4)
   * - Throws NotFoundError if count === 0 (Section 9 checklist item 5)
   */
  async markAsShipped(
    giftRedemptionId: string,
    clientId: string,
    trackingNumber: string,
    carrier: 'FedEx' | 'UPS' | 'USPS' | 'DHL'
  ): Promise<{ shippedAt: string }> {
    // Critical Rule #1: Filter by client_id
    if (!clientId) {
      throw new Error('client_id is required for multi-tenant isolation');
    }

    const supabase = await createClient();
    const shippedAt = new Date().toISOString();

    const { data, error, count } = await supabase
      .from('physical_gift_redemptions')
      .update({
        shipped_at: shippedAt,
        tracking_number: trackingNumber,
        carrier: carrier,
      })
      .eq('id', giftRedemptionId)
      .eq('client_id', clientId) // Critical Rule #1: Tenant isolation
      .select('shipped_at');

    if (error) {
      console.error(
        '[PhysicalGiftRepository] Error marking as shipped:',
        error
      );
      throw new Error(`Failed to mark as shipped: ${error.message}`);
    }

    // Section 9 checklist items 4 & 5: Verify count > 0, throw if 0
    if (!data || data.length === 0) {
      throw new Error(
        `NotFoundError: Physical gift redemption ${giftRedemptionId} not found for client ${clientId}`
      );
    }

    return {
      shippedAt: data[0].shipped_at ?? shippedAt,
    };
  },
};
