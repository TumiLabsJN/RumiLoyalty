/**
 * RPC Function Return Types
 *
 * These types match the RETURNS TABLE definitions in our PostgreSQL functions.
 * See SingleQueryBS.md Section 4 for the SQL function definitions.
 * Migration: supabase/migrations/20251203_single_query_rpc_functions.sql
 */

/**
 * Return type for get_available_missions RPC function
 * Maps to Section 4.2 RETURNS TABLE in SingleQueryBS.md
 */
export interface GetAvailableMissionsRow {
  // Mission columns
  mission_id: string;
  mission_type: string;
  mission_display_name: string;
  mission_title: string;
  mission_description: string | null;
  mission_target_value: number;
  mission_target_unit: string;
  mission_raffle_end_date: string | null;
  mission_activated: boolean | null;
  mission_tier_eligibility: string;
  mission_preview_from_tier: string | null;
  mission_enabled: boolean | null;
  mission_display_order: number;
  mission_reward_id: string;
  // Reward columns
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_redemption_type: string | null;
  reward_source: string | null;
  // Tier columns
  tier_id: string;
  tier_name: string;
  tier_color: string;
  tier_order: number;
  // Mission progress columns
  progress_id: string | null;
  progress_current_value: number | null;
  progress_status: string | null;
  progress_completed_at: string | null;
  progress_checkpoint_start: string | null;
  progress_checkpoint_end: string | null;
  // Redemption columns
  redemption_id: string | null;
  redemption_status: string | null;
  redemption_claimed_at: string | null;
  redemption_fulfilled_at: string | null;
  redemption_concluded_at: string | null;
  redemption_rejected_at: string | null;
  redemption_scheduled_activation_date: string | null;
  redemption_scheduled_activation_time: string | null;
  redemption_activation_date: string | null;
  redemption_expiration_date: string | null;
  // Commission boost columns
  boost_status: string | null;
  boost_scheduled_activation_date: string | null;
  boost_activated_at: string | null;
  boost_expires_at: string | null;
  boost_duration_days: number | null;
  // Physical gift columns
  physical_gift_shipped_at: string | null;
  physical_gift_shipping_city: string | null;
  physical_gift_requires_size: boolean | null;
  // Raffle participation columns
  raffle_is_winner: boolean | null;
  raffle_participated_at: string | null;
  raffle_winner_selected_at: string | null;
}

/**
 * Return type for get_available_rewards RPC function
 * Maps to Section 4.1 RETURNS TABLE in SingleQueryBS.md
 */
export interface GetAvailableRewardsRow {
  // Reward columns
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_tier_eligibility: string;
  reward_preview_from_tier: string | null;
  reward_redemption_frequency: string | null;
  reward_redemption_quantity: number | null;
  reward_redemption_type: string | null;
  reward_source: string | null;
  reward_display_order: number | null;
  reward_enabled: boolean | null;
  reward_expires_days: number | null;
  // Tier columns
  tier_id: string;
  tier_name: string;
  tier_color: string;
  tier_order: number;
  // Redemption columns
  redemption_id: string | null;
  redemption_status: string | null;
  redemption_claimed_at: string | null;
  redemption_scheduled_activation_date: string | null;
  redemption_scheduled_activation_time: string | null;
  redemption_activation_date: string | null;
  redemption_expiration_date: string | null;
  redemption_fulfilled_at: string | null;
  // Commission boost columns
  boost_status: string | null;
  boost_scheduled_activation_date: string | null;
  boost_activated_at: string | null;
  boost_expires_at: string | null;
  boost_duration_days: number | null;
  boost_rate: number | null;
  boost_sales_at_expiration: number | null;
  // Physical gift columns
  physical_gift_requires_size: boolean | null;
  physical_gift_size_value: string | null;
  physical_gift_shipping_city: string | null;
  physical_gift_shipped_at: string | null;
}

/**
 * Return type for get_mission_history RPC function
 * Maps to MissionQuery2.md
 */
export interface GetMissionHistoryRow {
  // Redemption columns
  redemption_id: string;
  redemption_status: string;
  redemption_claimed_at: string | null;
  redemption_fulfilled_at: string | null;
  redemption_concluded_at: string | null;
  redemption_rejected_at: string | null;
  // Mission columns
  mission_id: string;
  mission_type: string;
  mission_display_name: string;
  // Reward columns
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_source: string | null;
  // Progress columns
  progress_completed_at: string | null;
  // Raffle columns
  raffle_is_winner: boolean | null;
  raffle_participated_at: string | null;
  raffle_winner_selected_at: string | null;
  // GAP-RAFFLE-001: Missed raffle flag
  is_missed: boolean | null;
}
