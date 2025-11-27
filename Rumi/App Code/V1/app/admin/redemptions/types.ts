// app/admin/redemptions/types.ts
// Redemptions screen types based on AdminFlows.md Screen 2 wireframe

// =============================================================================
// TAB 1: INSTANT REWARDS
// =============================================================================

/** Instant reward types: gift_card, spark_ads, experience */
export type InstantRewardType = 'gift_card' | 'spark_ads' | 'experience'

/** Instant reward status */
export type InstantRewardStatus = 'claimed' | 'concluded'

/** Instant reward item for table display */
export interface InstantRewardItem {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  rewardType: InstantRewardType       // @backend: rewards.type
  rewardTypeFormatted: string         // @backend: computed by server ("Gift Card", "Spark Ads", "Experience")
  value: string                       // @backend: rewards.value_data.amount OR display_text
  email: string | null                // @backend: users.email (null for spark_ads)
  status: InstantRewardStatus         // @backend: redemptions.status
  claimedAt: string                   // @backend: redemptions.claimed_at (ISO 8601)
  claimedAtFormatted: string          // @backend: computed by server ("2 hours ago")
}

// =============================================================================
// TAB 2: PHYSICAL GIFTS
// =============================================================================

/** Physical gift shipping status */
export type PhysicalGiftStatus = 'claimed' | 'shipped' | 'delivered'

/** Physical gift item for table display */
export interface PhysicalGiftItem {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  itemName: string                    // @backend: rewards.name
  sizeValue: string | null            // @backend: physical_gift_redemptions.size_value
  cityState: string                   // @backend: computed by server ("Los Angeles, CA")
  status: PhysicalGiftStatus          // @backend: derived from physical_gift_redemptions state
  statusFormatted: string             // @backend: computed by server
  claimedAt: string                   // @backend: redemptions.claimed_at (ISO 8601)
}

/** Physical gift drawer details (full shipping info) */
export interface PhysicalGiftDetails extends PhysicalGiftItem {
  // Recipient info
  recipientName: string               // @backend: physical_gift_redemptions.recipient_name
  addressLine1: string                // @backend: physical_gift_redemptions.shipping_address_line1
  addressLine2: string | null         // @backend: physical_gift_redemptions.shipping_address_line2
  city: string                        // @backend: physical_gift_redemptions.shipping_city
  state: string                       // @backend: physical_gift_redemptions.shipping_state
  postalCode: string                  // @backend: physical_gift_redemptions.shipping_postal_code

  // Size info (if applicable)
  requiresSize: boolean               // @backend: rewards.value_data.requires_size
  sizeCategory: string | null         // @backend: rewards.value_data.size_category

  // Shipping info (admin fills in)
  carrier: string | null              // @backend: physical_gift_redemptions.carrier
  trackingNumber: string | null       // @backend: physical_gift_redemptions.tracking_number
  shippedAt: string | null            // @backend: physical_gift_redemptions.shipped_at (ISO 8601)
  deliveredAt: string | null          // @backend: physical_gift_redemptions.delivered_at (ISO 8601)
  notes: string | null                // @backend: redemptions.fulfillment_notes
}

// =============================================================================
// TAB 3: PAY BOOST (Commission Boost Payouts)
// =============================================================================

/** Commission boost payout status */
export type BoostPayoutStatus = 'pending_payout' | 'paid'

/** Pay boost item for table display */
export interface PayBoostItem {
  id: string                          // @backend: commission_boost_redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  payoutAmount: number                // @backend: commission_boost_redemptions.final_payout_amount
  payoutAmountFormatted: string       // @backend: computed by server ("$47.50")
  paymentMethod: string               // @backend: commission_boost_redemptions.payment_method
  paymentAccount: string              // @backend: commission_boost_redemptions.payment_account
  status: BoostPayoutStatus           // @backend: commission_boost_redemptions.boost_status
}

/** Pay boost drawer details */
export interface PayBoostDetails extends PayBoostItem {
  // Boost configuration
  boostPercent: number                // @backend: rewards.value_data.percent
  durationDays: number                // @backend: rewards.value_data.duration_days

  // Boost period
  activatedAt: string                 // @backend: commission_boost_redemptions.activated_at (ISO 8601)
  activatedAtFormatted: string        // @backend: computed by server ("Nov 15, 2025")
  expiresAt: string                   // @backend: commission_boost_redemptions.expires_at (ISO 8601)
  expiresAtFormatted: string          // @backend: computed by server ("Nov 22, 2025")

  // Sales during boost
  salesDuringBoost: number            // @backend: commission_boost_redemptions.sales_delta
  salesDuringBoostFormatted: string   // @backend: computed by server ("$950.00")

  // Payout tracking (admin fills in)
  payoutSentAt: string | null         // @backend: commission_boost_redemptions.payout_sent_at (ISO 8601)
  payoutSentBy: string | null         // @backend: commission_boost_redemptions.payout_sent_by (admin name)
  externalTransactionId: string | null // @backend: commission_boost_redemptions.external_transaction_id
  payoutNotes: string | null          // @backend: commission_boost_redemptions.payout_notes
}

// =============================================================================
// TAB 4: DISCOUNT
// =============================================================================

/** Discount activation status */
export type DiscountStatus = 'claimed' | 'ready' | 'active' | 'done'

/** Discount item for table display */
export interface DiscountItem {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  discountPercent: number             // @backend: rewards.value_data.percent
  scheduledDate: string               // @backend: redemptions.scheduled_activation_date (ISO 8601)
  scheduledTime: string               // @backend: redemptions.scheduled_activation_time
  scheduledFormatted: string          // @backend: computed by server ("Today 2:00 PM" or "Wed 10:00 AM")
  couponCode: string                  // @backend: rewards.value_data.coupon_code
  status: DiscountStatus              // @backend: computed by server based on time and activation state
  statusFormatted: string             // @backend: computed by server
}

/** Discount drawer details */
export interface DiscountDetails extends DiscountItem {
  // Coupon configuration
  durationMinutes: number             // @backend: rewards.value_data.duration_minutes
  durationFormatted: string           // @backend: computed by server ("30 minutes")
  maxUses: number | null              // @backend: rewards.value_data.max_uses

  // Activation tracking (admin fills in)
  activatedAt: string | null          // @backend: redemptions.activated_at (ISO 8601)
  activatedAtFormatted: string | null // @backend: computed by server
  activatedBy: string | null          // @backend: redemptions.activated_by (admin name)
  expiresAt: string | null            // @backend: computed (activatedAt + duration)
  expiresAtFormatted: string | null   // @backend: computed by server
}

// =============================================================================
// MAIN RESPONSE TYPE
// =============================================================================

/** Redemptions API response with all tabs */
export interface RedemptionsResponse {
  instantRewards: {
    count: number
    countFormatted: string            // @backend: computed by server
    items: InstantRewardItem[]
  }
  physicalGifts: {
    count: number
    countFormatted: string
    items: PhysicalGiftItem[]
  }
  payBoosts: {
    count: number
    countFormatted: string
    items: PayBoostItem[]
  }
  discounts: {
    count: number
    countFormatted: string
    items: DiscountItem[]
  }
}

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

export type RedemptionTab = 'instant' | 'physical' | 'boost' | 'discount'

export const REDEMPTION_TABS: { id: RedemptionTab; label: string }[] = [
  { id: 'instant', label: 'Instant' },
  { id: 'physical', label: 'Physical' },
  { id: 'boost', label: 'Pay Boost' },
  { id: 'discount', label: 'Discount' },
]
