export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          checkpoint_months: number | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          subdomain: string | null
          tier_calculation_mode: string | null
          updated_at: string | null
          vip_metric: string
        }
        Insert: {
          checkpoint_months?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          subdomain?: string | null
          tier_calculation_mode?: string | null
          updated_at?: string | null
          vip_metric?: string
        }
        Update: {
          checkpoint_months?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          subdomain?: string | null
          tier_calculation_mode?: string | null
          updated_at?: string | null
          vip_metric?: string
        }
        Relationships: []
      }
      commission_boost_redemptions: {
        Row: {
          activated_at: string | null
          admin_adjusted_commission: number | null
          boost_rate: number
          boost_status: string
          calculated_commission: number | null
          client_id: string
          created_at: string | null
          duration_days: number
          expires_at: string | null
          final_payout_amount: number | null
          id: string
          payment_account: string | null
          payment_account_confirm: string | null
          payment_info_collected_at: string | null
          payment_info_confirmed: boolean | null
          payment_method: string | null
          payout_notes: string | null
          payout_sent_at: string | null
          payout_sent_by: string | null
          redemption_id: string
          sales_at_activation: number | null
          sales_at_expiration: number | null
          sales_delta: number | null
          scheduled_activation_date: string
          tier_commission_rate: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          admin_adjusted_commission?: number | null
          boost_rate: number
          boost_status?: string
          calculated_commission?: number | null
          client_id: string
          created_at?: string | null
          duration_days?: number
          expires_at?: string | null
          final_payout_amount?: number | null
          id?: string
          payment_account?: string | null
          payment_account_confirm?: string | null
          payment_info_collected_at?: string | null
          payment_info_confirmed?: boolean | null
          payment_method?: string | null
          payout_notes?: string | null
          payout_sent_at?: string | null
          payout_sent_by?: string | null
          redemption_id: string
          sales_at_activation?: number | null
          sales_at_expiration?: number | null
          sales_delta?: number | null
          scheduled_activation_date: string
          tier_commission_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          admin_adjusted_commission?: number | null
          boost_rate?: number
          boost_status?: string
          calculated_commission?: number | null
          client_id?: string
          created_at?: string | null
          duration_days?: number
          expires_at?: string | null
          final_payout_amount?: number | null
          id?: string
          payment_account?: string | null
          payment_account_confirm?: string | null
          payment_info_collected_at?: string | null
          payment_info_confirmed?: boolean | null
          payment_method?: string | null
          payout_notes?: string | null
          payout_sent_at?: string | null
          payout_sent_by?: string | null
          redemption_id?: string
          sales_at_activation?: number | null
          sales_at_expiration?: number | null
          sales_delta?: number | null
          scheduled_activation_date?: string
          tier_commission_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_boost_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_boost_redemptions_payout_sent_by_fkey"
            columns: ["payout_sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_boost_redemptions_redemption_id_client_id_fkey"
            columns: ["redemption_id", "client_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "commission_boost_redemptions_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_boost_state_history: {
        Row: {
          boost_redemption_id: string
          client_id: string
          from_status: string | null
          id: string
          metadata: Json | null
          notes: string | null
          to_status: string | null
          transition_type: string | null
          transitioned_at: string | null
          transitioned_by: string | null
        }
        Insert: {
          boost_redemption_id: string
          client_id: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status?: string | null
          transition_type?: string | null
          transitioned_at?: string | null
          transitioned_by?: string | null
        }
        Update: {
          boost_redemption_id?: string
          client_id?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status?: string | null
          transition_type?: string | null
          transitioned_at?: string | null
          transitioned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_boost_state_history_boost_redemption_id_fkey"
            columns: ["boost_redemption_id"]
            isOneToOne: false
            referencedRelation: "commission_boost_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_boost_state_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_boost_state_history_transitioned_by_fkey"
            columns: ["transitioned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      handle_changes: {
        Row: {
          detected_at: string | null
          id: string
          new_handle: string
          old_handle: string
          resolved_at: string | null
          resolved_by: string | null
          user_id: string | null
        }
        Insert: {
          detected_at?: string | null
          id?: string
          new_handle: string
          old_handle: string
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Update: {
          detected_at?: string | null
          id?: string
          new_handle?: string
          old_handle?: string
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handle_changes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handle_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_progress: {
        Row: {
          checkpoint_end: string | null
          checkpoint_start: string | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          id: string
          mission_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          checkpoint_end?: string | null
          checkpoint_start?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          mission_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          checkpoint_end?: string | null
          checkpoint_start?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          mission_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          activated: boolean | null
          client_id: string | null
          created_at: string | null
          description: string | null
          display_name: string
          display_order: number
          enabled: boolean | null
          id: string
          mission_type: string
          preview_from_tier: string | null
          raffle_end_date: string | null
          reward_id: string
          target_unit: string
          target_value: number
          tier_eligibility: string
          title: string
        }
        Insert: {
          activated?: boolean | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          display_order: number
          enabled?: boolean | null
          id?: string
          mission_type: string
          preview_from_tier?: string | null
          raffle_end_date?: string | null
          reward_id: string
          target_unit?: string
          target_value: number
          tier_eligibility: string
          title: string
        }
        Update: {
          activated?: boolean | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          enabled?: boolean | null
          id?: string
          mission_type?: string
          preview_from_tier?: string | null
          raffle_end_date?: string | null
          reward_id?: string
          target_unit?: string
          target_value?: number
          tier_eligibility?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          access_token_encrypted: string | null
          attempts: number | null
          code_hash: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token_encrypted: string | null
          session_id: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          attempts?: number | null
          code_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token_encrypted?: string | null
          session_id: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          attempts?: number | null
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token_encrypted?: string | null
          session_id?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_gift_redemptions: {
        Row: {
          carrier: string | null
          client_id: string
          created_at: string | null
          delivered_at: string | null
          id: string
          redemption_id: string
          requires_size: boolean | null
          shipped_at: string | null
          shipping_address_line1: string
          shipping_address_line2: string | null
          shipping_city: string
          shipping_country: string | null
          shipping_info_submitted_at: string
          shipping_phone: string | null
          shipping_postal_code: string
          shipping_recipient_first_name: string
          shipping_recipient_last_name: string
          shipping_state: string
          size_category: string | null
          size_submitted_at: string | null
          size_value: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          client_id: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          redemption_id: string
          requires_size?: boolean | null
          shipped_at?: string | null
          shipping_address_line1: string
          shipping_address_line2?: string | null
          shipping_city: string
          shipping_country?: string | null
          shipping_info_submitted_at: string
          shipping_phone?: string | null
          shipping_postal_code: string
          shipping_recipient_first_name: string
          shipping_recipient_last_name: string
          shipping_state: string
          size_category?: string | null
          size_submitted_at?: string | null
          size_value?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          client_id?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          redemption_id?: string
          requires_size?: boolean | null
          shipped_at?: string | null
          shipping_address_line1?: string
          shipping_address_line2?: string | null
          shipping_city?: string
          shipping_country?: string | null
          shipping_info_submitted_at?: string
          shipping_phone?: string | null
          shipping_postal_code?: string
          shipping_recipient_first_name?: string
          shipping_recipient_last_name?: string
          shipping_state?: string
          size_category?: string | null
          size_submitted_at?: string | null
          size_value?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_gift_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_gift_redemptions_redemption_id_client_id_fkey"
            columns: ["redemption_id", "client_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "physical_gift_redemptions_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_participations: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_winner: boolean | null
          mission_id: string
          mission_progress_id: string
          participated_at: string
          redemption_id: string
          selected_by: string | null
          updated_at: string | null
          user_id: string
          winner_selected_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          mission_id: string
          mission_progress_id: string
          participated_at?: string
          redemption_id: string
          selected_by?: string | null
          updated_at?: string | null
          user_id: string
          winner_selected_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_winner?: boolean | null
          mission_id?: string
          mission_progress_id?: string
          participated_at?: string
          redemption_id?: string
          selected_by?: string | null
          updated_at?: string | null
          user_id?: string
          winner_selected_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raffle_participations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_participations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_participations_mission_progress_id_fkey"
            columns: ["mission_progress_id"]
            isOneToOne: false
            referencedRelation: "mission_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_participations_redemption_id_client_id_fkey"
            columns: ["redemption_id", "client_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "raffle_participations_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_participations_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffle_participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          activation_date: string | null
          claimed_at: string | null
          client_id: string | null
          concluded_at: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_reason: string | null
          expiration_date: string | null
          external_transaction_id: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          fulfillment_notes: string | null
          google_calendar_event_id: string | null
          id: string
          mission_progress_id: string | null
          redemption_type: string
          rejected_at: string | null
          rejection_reason: string | null
          reward_id: string | null
          scheduled_activation_date: string | null
          scheduled_activation_time: string | null
          status: string | null
          tier_at_claim: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activation_date?: string | null
          claimed_at?: string | null
          client_id?: string | null
          concluded_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          expiration_date?: string | null
          external_transaction_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          google_calendar_event_id?: string | null
          id?: string
          mission_progress_id?: string | null
          redemption_type: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reward_id?: string | null
          scheduled_activation_date?: string | null
          scheduled_activation_time?: string | null
          status?: string | null
          tier_at_claim: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activation_date?: string | null
          claimed_at?: string | null
          client_id?: string | null
          concluded_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_reason?: string | null
          expiration_date?: string | null
          external_transaction_id?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          google_calendar_event_id?: string | null
          id?: string
          mission_progress_id?: string | null
          redemption_type?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          reward_id?: string | null
          scheduled_activation_date?: string | null
          scheduled_activation_time?: string | null
          status?: string | null
          tier_at_claim?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_mission_progress_id_fkey"
            columns: ["mission_progress_id"]
            isOneToOne: false
            referencedRelation: "mission_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          enabled: boolean | null
          expires_days: number | null
          id: string
          name: string | null
          preview_from_tier: string | null
          redemption_frequency: string | null
          redemption_quantity: number | null
          redemption_type: string
          reward_source: string
          tier_eligibility: string
          type: string
          updated_at: string | null
          value_data: Json | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          enabled?: boolean | null
          expires_days?: number | null
          id?: string
          name?: string | null
          preview_from_tier?: string | null
          redemption_frequency?: string | null
          redemption_quantity?: number | null
          redemption_type?: string
          reward_source?: string
          tier_eligibility: string
          type: string
          updated_at?: string | null
          value_data?: Json | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          enabled?: boolean | null
          expires_days?: number | null
          id?: string
          name?: string | null
          preview_from_tier?: string | null
          redemption_frequency?: string | null
          redemption_quantity?: number | null
          redemption_type?: string
          reward_source?: string
          tier_eligibility?: string
          type?: string
          updated_at?: string | null
          value_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          amount: number | null
          amount_units: number | null
          applied_at: string | null
          client_id: string
          created_at: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          amount?: number | null
          amount_units?: number | null
          applied_at?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          amount?: number | null
          amount_units?: number | null
          applied_at?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_adjustments_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          file_name: string | null
          id: string
          records_processed: number | null
          source: string
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          records_processed?: number | null
          source?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          records_processed?: number | null
          source?: string
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_checkpoints: {
        Row: {
          checkpoint_date: string
          client_id: string
          created_at: string | null
          id: string
          period_end_date: string
          period_start_date: string
          sales_in_period: number | null
          sales_required: number | null
          status: string
          tier_after: string
          tier_before: string
          units_in_period: number | null
          units_required: number | null
          user_id: string | null
        }
        Insert: {
          checkpoint_date: string
          client_id: string
          created_at?: string | null
          id?: string
          period_end_date: string
          period_start_date: string
          sales_in_period?: number | null
          sales_required?: number | null
          status: string
          tier_after: string
          tier_before: string
          units_in_period?: number | null
          units_required?: number | null
          user_id?: string | null
        }
        Update: {
          checkpoint_date?: string
          client_id?: string
          created_at?: string | null
          id?: string
          period_end_date?: string
          period_start_date?: string
          sales_in_period?: number | null
          sales_required?: number | null
          status?: string
          tier_after?: string
          tier_before?: string
          units_in_period?: number | null
          units_required?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_checkpoints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_checkpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          checkpoint_exempt: boolean | null
          client_id: string
          commission_rate: number
          created_at: string | null
          id: string
          sales_threshold: number | null
          tier_color: string
          tier_id: string
          tier_name: string
          tier_order: number
          units_threshold: number | null
          updated_at: string | null
        }
        Insert: {
          checkpoint_exempt?: boolean | null
          client_id: string
          commission_rate: number
          created_at?: string | null
          id?: string
          sales_threshold?: number | null
          tier_color: string
          tier_id: string
          tier_name: string
          tier_order: number
          units_threshold?: number | null
          updated_at?: string | null
        }
        Update: {
          checkpoint_exempt?: boolean | null
          client_id?: string
          commission_rate?: number
          created_at?: string | null
          id?: string
          sales_threshold?: number | null
          tier_color?: string
          tier_id?: string
          tier_name?: string
          tier_order?: number
          units_threshold?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          checkpoint_progress_updated_at: string | null
          checkpoint_sales_current: number | null
          checkpoint_sales_target: number | null
          checkpoint_total_comments: number | null
          checkpoint_total_likes: number | null
          checkpoint_total_views: number | null
          checkpoint_units_current: number | null
          checkpoint_units_target: number | null
          checkpoint_videos_posted: number | null
          client_id: string
          created_at: string | null
          current_tier: string | null
          default_payment_account: string | null
          default_payment_method: string | null
          email: string | null
          email_verified: boolean | null
          first_video_date: string | null
          id: string
          is_admin: boolean | null
          last_login_at: string | null
          leaderboard_rank: number | null
          manual_adjustments_total: number | null
          manual_adjustments_units: number | null
          next_checkpoint_at: string | null
          next_tier_name: string | null
          next_tier_threshold: number | null
          next_tier_threshold_units: number | null
          password_hash: string
          payment_info_updated_at: string | null
          projected_tier_at_checkpoint: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          tier_achieved_at: string | null
          tiktok_handle: string
          total_sales: number | null
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          checkpoint_progress_updated_at?: string | null
          checkpoint_sales_current?: number | null
          checkpoint_sales_target?: number | null
          checkpoint_total_comments?: number | null
          checkpoint_total_likes?: number | null
          checkpoint_total_views?: number | null
          checkpoint_units_current?: number | null
          checkpoint_units_target?: number | null
          checkpoint_videos_posted?: number | null
          client_id: string
          created_at?: string | null
          current_tier?: string | null
          default_payment_account?: string | null
          default_payment_method?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_video_date?: string | null
          id?: string
          is_admin?: boolean | null
          last_login_at?: string | null
          leaderboard_rank?: number | null
          manual_adjustments_total?: number | null
          manual_adjustments_units?: number | null
          next_checkpoint_at?: string | null
          next_tier_name?: string | null
          next_tier_threshold?: number | null
          next_tier_threshold_units?: number | null
          password_hash: string
          payment_info_updated_at?: string | null
          projected_tier_at_checkpoint?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tier_achieved_at?: string | null
          tiktok_handle: string
          total_sales?: number | null
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          checkpoint_progress_updated_at?: string | null
          checkpoint_sales_current?: number | null
          checkpoint_sales_target?: number | null
          checkpoint_total_comments?: number | null
          checkpoint_total_likes?: number | null
          checkpoint_total_views?: number | null
          checkpoint_units_current?: number | null
          checkpoint_units_target?: number | null
          checkpoint_videos_posted?: number | null
          client_id?: string
          created_at?: string | null
          current_tier?: string | null
          default_payment_account?: string | null
          default_payment_method?: string | null
          email?: string | null
          email_verified?: boolean | null
          first_video_date?: string | null
          id?: string
          is_admin?: boolean | null
          last_login_at?: string | null
          leaderboard_rank?: number | null
          manual_adjustments_total?: number | null
          manual_adjustments_units?: number | null
          next_checkpoint_at?: string | null
          next_tier_name?: string | null
          next_tier_threshold?: number | null
          next_tier_threshold_units?: number | null
          password_hash?: string
          payment_info_updated_at?: string | null
          projected_tier_at_checkpoint?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tier_achieved_at?: string | null
          tiktok_handle?: string
          total_sales?: number | null
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          client_id: string
          comments: number | null
          created_at: string | null
          ctr: number | null
          gmv: number | null
          id: string
          likes: number | null
          post_date: string
          sync_date: string
          units_sold: number | null
          updated_at: string | null
          user_id: string | null
          video_title: string | null
          video_url: string
          views: number | null
        }
        Insert: {
          client_id: string
          comments?: number | null
          created_at?: string | null
          ctr?: number | null
          gmv?: number | null
          id?: string
          likes?: number | null
          post_date: string
          sync_date: string
          units_sold?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_title?: string | null
          video_url: string
          views?: number | null
        }
        Update: {
          client_id?: string
          comments?: number | null
          created_at?: string | null
          ctr?: number | null
          gmv?: number | null
          id?: string
          likes?: number | null
          post_date?: string
          sync_date?: string
          units_sold?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_title?: string | null
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_create_otp:
        | {
            Args: {
              p_access_token_encrypted?: string
              p_code_hash: string
              p_expires_at: string
              p_refresh_token_encrypted?: string
              p_session_id: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_code_hash: string
              p_expires_at: string
              p_session_id: string
              p_user_id: string
            }
            Returns: string
          }
      auth_create_reset_token: {
        Args: {
          p_expires_at: string
          p_ip_address?: string
          p_token_hash: string
          p_user_id: string
        }
        Returns: string
      }
      auth_create_user: {
        Args: {
          p_client_id: string
          p_email: string
          p_id: string
          p_password_hash: string
          p_terms_version?: string
          p_tiktok_handle: string
        }
        Returns: {
          client_id: string
          created_at: string
          current_tier: string
          email: string
          email_verified: boolean
          id: string
          is_admin: boolean
          terms_accepted_at: string
          terms_version: string
          tiktok_handle: string
        }[]
      }
      auth_email_exists: {
        Args: { p_client_id: string; p_email: string }
        Returns: boolean
      }
      auth_find_otp_by_session: {
        Args: { p_session_id: string }
        Returns: {
          access_token_encrypted: string
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          refresh_token_encrypted: string
          session_id: string
          used: boolean
          user_id: string
        }[]
      }
      auth_find_recent_reset_tokens: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
        }[]
      }
      auth_find_user_by_email: {
        Args: { p_client_id: string; p_email: string }
        Returns: {
          client_id: string
          email: string
          email_verified: boolean
          id: string
          is_admin: boolean
          tiktok_handle: string
        }[]
      }
      auth_find_user_by_handle: {
        Args: { p_client_id: string; p_handle: string }
        Returns: {
          client_id: string
          email: string
          email_verified: boolean
          id: string
          is_admin: boolean
          last_login_at: string
          tiktok_handle: string
        }[]
      }
      auth_find_user_by_id: {
        Args: { p_user_id: string }
        Returns: {
          client_id: string
          current_tier: string
          email: string
          email_verified: boolean
          id: string
          is_admin: boolean
          tiktok_handle: string
        }[]
      }
      auth_find_valid_reset_tokens: {
        Args: never
        Returns: {
          expires_at: string
          id: string
          token_hash: string
          used_at: string
          user_id: string
        }[]
      }
      auth_get_client_by_id: {
        Args: { p_client_id: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          primary_color: string
          subdomain: string
        }[]
      }
      auth_handle_exists: {
        Args: { p_client_id: string; p_handle: string }
        Returns: boolean
      }
      auth_increment_otp_attempts: {
        Args: { p_session_id: string }
        Returns: number
      }
      auth_invalidate_user_reset_tokens: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      auth_mark_email_verified: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      auth_mark_otp_used: { Args: { p_session_id: string }; Returns: undefined }
      auth_mark_reset_token_used: {
        Args: { p_token_id: string }
        Returns: undefined
      }
      auth_update_last_login: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_current_user_client_id: { Args: never; Returns: string }
      is_admin_of_client: { Args: { p_client_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
