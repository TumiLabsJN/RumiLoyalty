// app/admin/dashboard/types.ts
// Dashboard types based on AdminFlows.md Screen 1 wireframe

// =============================================================================
// TODAY'S TASKS
// =============================================================================

/** Discounts scheduled to activate today */
export interface DiscountTask {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  discountPercent: number             // @backend: rewards.value_data.percent
  scheduledTime: string               // @backend: redemptions.scheduled_activation_time (ISO 8601)
  scheduledTimeFormatted: string      // @backend: computed by server ("2:00 PM EST")
  couponCode: string                  // @backend: rewards.value_data.coupon_code
}

/** Commission boosts pending payout */
export interface CommissionPayoutTask {
  id: string                          // @backend: commission_boost_redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  payoutAmount: number                // @backend: commission_boost_redemptions.final_payout_amount
  payoutAmountFormatted: string       // @backend: computed by server ("$47.50")
  paymentMethod: string               // @backend: commission_boost_redemptions.payment_method
  paymentAccount: string              // @backend: commission_boost_redemptions.payment_account
}

/** SLA status for time-sensitive tasks */
export type SlaStatus = 'ok' | 'warning' | 'breach'

/** Instant rewards (gift cards, spark ads, experiences) to fulfill */
export interface InstantRewardTask {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  rewardType: 'gift_card' | 'spark_ads' | 'experience'  // @backend: rewards.type
  rewardValue: string                 // @backend: rewards.value_data.amount OR display_text
  email: string | null                // @backend: users.email (null for spark_ads)
  claimedHoursAgo: number             // @backend: computed from redemptions.claimed_at
  claimedHoursAgoFormatted: string    // @backend: computed by server ("22h")
  slaStatus: SlaStatus                // @backend: computed by server (warning if >20h, breach if >24h)
}

/** Physical gifts pending shipment */
export interface PhysicalGiftTask {
  id: string                          // @backend: redemptions.id
  creatorHandle: string               // @backend: users.tiktok_handle
  itemName: string                    // @backend: rewards.name
  sizeValue: string | null            // @backend: physical_gift_redemptions.size_value
  cityState: string                   // @backend: computed by server ("Los Angeles, CA")
}

/** Raffles that need to be drawn today */
export interface RaffleDrawTask {
  id: string                          // @backend: missions.id
  raffleName: string                  // @backend: missions.display_name
  prizeName: string                   // @backend: rewards.name
  participantCount: number            // @backend: COUNT(raffle_participations)
  participantCountFormatted: string   // @backend: computed by server
  endDate: string                     // @backend: missions.raffle_end_date (ISO 8601)
}

/** Task group with count and items */
export interface TaskGroup<T> {
  count: number
  countFormatted: string              // @backend: computed by server
  items: T[]
}

/** All today's task categories */
export interface TodaysTasks {
  discounts: TaskGroup<DiscountTask>
  commissionPayouts: TaskGroup<CommissionPayoutTask>
  instantRewards: TaskGroup<InstantRewardTask>
  physicalGifts: TaskGroup<PhysicalGiftTask>
  rafflesToDraw: TaskGroup<RaffleDrawTask>
}

// =============================================================================
// THIS WEEK'S TASKS (Preview/Planning - Not Clickable)
// =============================================================================

/** Upcoming discount activation */
export interface UpcomingDiscount {
  id: string                          // @backend: redemptions.id
  date: string                        // @backend: redemptions.scheduled_activation_date (ISO 8601)
  dateFormatted: string               // @backend: computed by server ("Wed 27th")
  time: string                        // @backend: redemptions.scheduled_activation_time
  timeFormatted: string               // @backend: computed by server ("10:00 AM EST")
  creatorHandle: string               // @backend: users.tiktok_handle
  discountPercent: number             // @backend: rewards.value_data.percent
}

/** Upcoming raffle drawing */
export interface UpcomingRaffle {
  id: string                          // @backend: missions.id
  drawDate: string                    // @backend: missions.raffle_end_date (ISO 8601)
  drawDateFormatted: string           // @backend: computed by server ("Sat 30th")
  raffleName: string                  // @backend: missions.display_name
  prizeName: string                   // @backend: rewards.name
  participantCount: number            // @backend: COUNT(raffle_participations)
  participantCountFormatted: string   // @backend: computed by server
}

/** Commission boost expiring soon */
export interface ExpiringBoost {
  id: string                          // @backend: commission_boost_redemptions.id
  expirationDate: string              // @backend: commission_boost_redemptions.expires_at (ISO 8601)
  expirationDateFormatted: string     // @backend: computed by server ("Wed 27th")
  creatorHandle: string               // @backend: users.tiktok_handle
  boostPercent: number                // @backend: rewards.value_data.percent
  estimatedPayout: number             // @backend: computed (sales_delta × percent)
  estimatedPayoutFormatted: string    // @backend: computed by server ("$32")
}

/** All this week's task categories */
export interface ThisWeeksTasks {
  upcomingDiscounts: TaskGroup<UpcomingDiscount>
  upcomingRaffles: TaskGroup<UpcomingRaffle>
  expiringBoosts: TaskGroup<ExpiringBoost>
}

// =============================================================================
// MAIN RESPONSE TYPE
// =============================================================================

/** Dashboard API response */
export interface DashboardResponse {
  todaysTasks: TodaysTasks
  thisWeeksTasks: ThisWeeksTasks
}
