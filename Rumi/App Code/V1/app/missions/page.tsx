"use client"
    import {
      Trophy,
      CheckCircle2,
      ChevronRight,
      TrendingUp,
      Video,
      Heart,
      Eye,
      Ticket,
      Lock,
      Loader2,
    } from "lucide-react"
    import { Button } from "@/components/ui/button"
    import { PageLayout } from "@/components/pagelayout"
    import { ScheduleDiscountModal } from "@/components/schedule-discount-modal"
    import { toast } from "sonner"
    import { cn } from "@/lib/utils"
    import Link from "next/link"
    import { useState } from "react"
    import * as React from "react"

    export default function MissionsPage() {
      // ============================================
      // DEBUG PANEL - Test Scenario Switcher
      // ============================================
      const [activeScenario, setActiveScenario] = useState("scenario-2")
      const [debugPanelOpen, setDebugPanelOpen] = useState(false)
      const [showScheduleModal, setShowScheduleModal] = useState(false)
      const [selectedMission, setSelectedMission] = useState<{ id: string; percent: number; durationDays: number } | null>(null)

      // Tier colors (matches VIP level)
      const tierColors = {
        Bronze: "#CD7F32",
        Silver: "#94a3b8",
        Gold: "#F59E0B",
        Platinum: "#818CF8",
      }

      // ============================================
      // TEST SCENARIOS - 12 Comprehensive Cases
      // ============================================
      const scenarios = {
        // SCENARIO 1: New Bronze User
        "scenario-1": {
          name: "New Bronze User",
          currentTier: "Bronze",
          completedMissions: 0,
          missions: [
            {
              id: "1",
              mission_type: "sales" as const,
              display_name: "First Steps",
              description: "Make your first sales",
              current_progress: 50,
              goal: 200,
              progress_percentage: 25,
              remaining_value: 150,
              reward_type: "gift_card",
              reward_value: 25,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "Starter Pack",
              status: "locked" as const,
              checkpoint_end: null,
              required_tier: "Silver",
              raffle_prize_name: "Starter Pack",
              raffle_end_date: null,
              activated: false,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "iPad Pro",
              status: "dormant" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "iPad Pro",
              raffle_end_date: "2025-04-01T23:59:59Z",
              activated: false,
              enabled: true,
            },
          ],
        },

        // SCENARIO 2: Active Grinder (Gold tier)
        "scenario-2": {
          name: "Active Grinder",
          currentTier: "Gold",
          completedMissions: 8,
          missions: [
            {
              id: "1",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Reach your sales target",
              current_progress: 1500,
              goal: 2000,
              progress_percentage: 75,
              remaining_value: 500,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "videos" as const,
              display_name: "Lights, Camera, Go!",
              description: "Film and post new clips",
              current_progress: 8,
              goal: 15,
              progress_percentage: 50,
              remaining_value: 7,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "likes" as const,
              display_name: "Road to Viral",
              description: "Rack up those likes",
              current_progress: 1000,
              goal: 1000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "gift_card",
              reward_value: 25,
              reward_custom_text: null,
              status: "completed" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "4",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "iPhone 16 Pro",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "iPhone 16 Pro",
              raffle_end_date: "2025-02-15T23:59:59Z",
              activated: true,
              enabled: true,
            },
          ],
        },

        // SCENARIO 3: Mission Complete Ready
        "scenario-3": {
          name: "Missions Complete",
          currentTier: "Silver",
          completedMissions: 5,
          missions: [
            {
              id: "1",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Reached sales target!",
              current_progress: 500,
              goal: 500,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "completed" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "likes" as const,
              display_name: "Road to Viral",
              description: "Hit the like goal!",
              current_progress: 1000,
              goal: 1000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "completed" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "videos" as const,
              display_name: "Lights, Camera, Go!",
              description: "Keep posting videos",
              current_progress: 9,
              goal: 15,
              progress_percentage: 60,
              remaining_value: 6,
              reward_type: "discount",
              reward_value: 10,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 4: Claimed Pending Fulfillment
        "scenario-4": {
          name: "Rewards Claimed",
          currentTier: "Gold",
          completedMissions: 12,
          missions: [
            {
              id: "1",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Prize claimed, waiting for delivery",
              current_progress: 2000,
              goal: 2000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "claimed" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "likes" as const,
              display_name: "Road to Viral",
              description: "Prize claimed, pending fulfillment",
              current_progress: 1000,
              goal: 1000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "claimed" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "views" as const,
              display_name: "Eyes on You",
              description: "Boost your total views",
              current_progress: 25000,
              goal: 50000,
              progress_percentage: 50,
              remaining_value: 25000,
              reward_type: "discount",
              reward_value: 10,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-20T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 5: Raffle Winner
        "scenario-5": {
          name: "Raffle Winner!",
          currentTier: "Gold",
          completedMissions: 15,
          missions: [
            {
              id: "1",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "You won the raffle!",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "iPhone 16 Pro",
              status: "won" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "iPhone 16 Pro",
              raffle_end_date: null,
              activated: true,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "AirPods Pro",
              status: "processing" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "AirPods Pro",
              raffle_end_date: "2025-03-01T23:59:59Z",
              activated: true,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "trip",
              reward_value: null,
              reward_custom_text: "VIP Event Pass",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "VIP Event Pass",
              raffle_end_date: "2025-02-20T23:59:59Z",
              activated: true,
              enabled: true,
            },
            {
              id: "4",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Keep selling!",
              current_progress: 1800,
              goal: 2000,
              progress_percentage: 90,
              remaining_value: 200,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 6: Raffle Participant (processing raffles)
        "scenario-6": {
          name: "Raffle Participant",
          currentTier: "Silver",
          completedMissions: 6,
          missions: [
            {
              id: "1",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "Waiting for draw",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "MacBook Pro",
              status: "processing" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "MacBook Pro",
              raffle_end_date: "2025-02-25T23:59:59Z",
              activated: true,
              enabled: true,
            },
            {
              id: "2",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "Wireless Headphones",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "Wireless Headphones",
              raffle_end_date: "2025-03-05T23:59:59Z",
              activated: true,
              enabled: true,
            },
            {
              id: "3",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "trip",
              reward_value: null,
              reward_custom_text: "Beach Getaway",
              status: "dormant" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "Beach Getaway",
              raffle_end_date: "2025-04-01T23:59:59Z",
              activated: false,
              enabled: true,
            },
          ],
        },

        // SCENARIO 7: Admin Cancelled Mission ⚠️ CRITICAL TEST
        "scenario-7": {
          name: "🚨 Admin Cancelled",
          currentTier: "Gold",
          completedMissions: 10,
          missions: [
            {
              id: "cancelled-1",
              mission_type: "sales" as const,
              display_name: "Unlock Payday (CANCELLED)",
              description: "This mission was disabled by admin",
              current_progress: 800,
              goal: 1000,
              progress_percentage: 80,
              remaining_value: 200,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "cancelled" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: false, // Admin disabled it
            },
            {
              id: "active-1",
              mission_type: "videos" as const,
              display_name: "Lights, Camera, Go!",
              description: "This mission is still active",
              current_progress: 10,
              goal: 15,
              progress_percentage: 67,
              remaining_value: 5,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 8: Visibility Controls (enabled=false) ⚠️ CRITICAL TEST
        "scenario-8": {
          name: "🚨 Disabled Missions",
          currentTier: "Silver",
          completedMissions: 7,
          missions: [
            {
              id: "disabled-1",
              mission_type: "sales" as const,
              display_name: "Hidden Mission (enabled=false)",
              description: "This should NOT be visible",
              current_progress: 500,
              goal: 1000,
              progress_percentage: 50,
              remaining_value: 500,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: false, // Should be filtered out
            },
            {
              id: "disabled-raffle",
              mission_type: "raffle" as const,
              display_name: "Hidden Raffle (enabled=false, activated=true)",
              description: "enabled overrides activated",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "Should Not Show",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "Should Not Show",
              raffle_end_date: "2025-03-05T23:59:59Z",
              activated: true, // activated=true but...
              enabled: false, // ...enabled=false wins!
            },
            {
              id: "visible-1",
              mission_type: "videos" as const,
              display_name: "Visible Mission (enabled=true)",
              description: "This SHOULD be visible",
              current_progress: 8,
              goal: 15,
              progress_percentage: 53,
              remaining_value: 7,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true, // This one shows
            },
          ],
        },

        // SCENARIO 9: Lock Type Comparison
        "scenario-9": {
          name: "Lock Types",
          currentTier: "Silver",
          completedMissions: 4,
          missions: [
            {
              id: "tier-locked",
              mission_type: "sales" as const,
              display_name: "VIP Payday (Tier Locked)",
              description: "Requires Gold tier",
              current_progress: 0,
              goal: 3000,
              progress_percentage: 0,
              remaining_value: 3000,
              reward_type: "gift_card",
              reward_value: 100,
              reward_custom_text: null,
              status: "locked" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: "Gold",
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "raffle-locked",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle (Tier Locked)",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "Platinum Prize",
              status: "locked" as const,
              checkpoint_end: null,
              required_tier: "Platinum",
              raffle_prize_name: "Platinum Prize",
              raffle_end_date: null,
              activated: false,
              enabled: true,
            },
            {
              id: "unlocked-1",
              mission_type: "videos" as const,
              display_name: "Lights, Camera, Go! (Unlocked)",
              description: "This is available for Silver",
              current_progress: 5,
              goal: 15,
              progress_percentage: 33,
              remaining_value: 10,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 10: Progress Boundaries
        "scenario-10": {
          name: "Progress Edges",
          currentTier: "Gold",
          completedMissions: 9,
          missions: [
            {
              id: "progress-0",
              mission_type: "sales" as const,
              display_name: "Just Started (0%)",
              description: "Brand new mission",
              current_progress: 0,
              goal: 500,
              progress_percentage: 0,
              remaining_value: 500,
              reward_type: "gift_card",
              reward_value: 25,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "progress-25",
              mission_type: "videos" as const,
              display_name: "Early Stage (25%)",
              description: "Quarter way there",
              current_progress: 5,
              goal: 20,
              progress_percentage: 25,
              remaining_value: 15,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "progress-50",
              mission_type: "likes" as const,
              display_name: "Halfway (50%)",
              description: "Middle of the journey",
              current_progress: 500,
              goal: 1000,
              progress_percentage: 50,
              remaining_value: 500,
              reward_type: "discount",
              reward_value: 10,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "progress-99",
              mission_type: "views" as const,
              display_name: "Almost There! (99%)",
              description: "One sale away!",
              current_progress: 49500,
              goal: 50000,
              progress_percentage: 99,
              remaining_value: 500,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-20T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "progress-100",
              mission_type: "sales" as const,
              display_name: "Complete! (100%)",
              description: "Ready to claim",
              current_progress: 1000,
              goal: 1000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "commission_boost",
              reward_value: 10,
              reward_custom_text: null,
              status: "completed" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },

        // SCENARIO 11: Reward Type Showcase
        "scenario-11": {
          name: "All Reward Types",
          currentTier: "Platinum",
          completedMissions: 18,
          missions: [
            {
              id: "reward-giftcard",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Gift card reward",
              current_progress: 1500,
              goal: 2000,
              progress_percentage: 75,
              remaining_value: 500,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "reward-commission",
              mission_type: "videos" as const,
              display_name: "Content Creator",
              description: "Commission boost reward",
              current_progress: 10,
              goal: 15,
              progress_percentage: 67,
              remaining_value: 5,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "reward-discount",
              mission_type: "likes" as const,
              display_name: "Fan Favorite",
              description: "Discount reward",
              current_progress: 800,
              goal: 1000,
              progress_percentage: 80,
              remaining_value: 200,
              reward_type: "discount",
              reward_value: 10,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            {
              id: "reward-physical",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "AirPods Pro",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "AirPods Pro",
              raffle_end_date: "2025-02-15T23:59:59Z",
              activated: true,
              enabled: true,
            },
            {
              id: "reward-experience",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "trip",
              reward_value: null,
              reward_custom_text: "VIP Event Pass",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "VIP Event Pass",
              raffle_end_date: "2025-03-01T23:59:59Z",
              activated: true,
              enabled: true,
            },
          ],
        },

        // SCENARIO 12: Mixed Status Stress Test
        "scenario-12": {
          name: "🔥 All States",
          currentTier: "Platinum",
          completedMissions: 20,
          missions: [
            // won (priority 1)
            {
              id: "state-won",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "You won!",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "iPhone 16 Pro",
              status: "won" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "iPhone 16 Pro",
              raffle_end_date: null,
              activated: true,
              enabled: true,
            },
            // completed (priority 2)
            {
              id: "state-completed",
              mission_type: "sales" as const,
              display_name: "Unlock Payday",
              description: "Ready to claim",
              current_progress: 2000,
              goal: 2000,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "gift_card",
              reward_value: 50,
              reward_custom_text: null,
              status: "completed" as const,
              checkpoint_end: "2025-03-15T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            // claimed (priority 3)
            {
              id: "state-claimed",
              mission_type: "videos" as const,
              display_name: "Lights, Camera, Go!",
              description: "Prize claimed",
              current_progress: 15,
              goal: 15,
              progress_percentage: 100,
              remaining_value: 0,
              reward_type: "commission_boost",
              reward_value: 5,
              reward_custom_text: null,
              status: "claimed" as const,
              checkpoint_end: "2025-03-10T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            // processing (priority 4)
            {
              id: "state-processing",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "Waiting for draw",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "MacBook Pro",
              status: "processing" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "MacBook Pro",
              raffle_end_date: "2025-03-01T23:59:59Z",
              activated: true,
              enabled: true,
            },
            // active (priority 5)
            {
              id: "state-active",
              mission_type: "likes" as const,
              display_name: "Road to Viral",
              description: "In progress",
              current_progress: 600,
              goal: 1000,
              progress_percentage: 60,
              remaining_value: 400,
              reward_type: "discount",
              reward_value: 10,
              reward_custom_text: null,
              status: "active" as const,
              checkpoint_end: "2025-02-28T23:59:59Z",
              required_tier: null,
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
            // available (priority 6)
            {
              id: "state-available",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "Join now",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "trip",
              reward_value: null,
              reward_custom_text: "VIP Event Pass",
              status: "available" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "VIP Event Pass",
              raffle_end_date: "2025-02-20T23:59:59Z",
              activated: true,
              enabled: true,
            },
            // dormant (priority 7)
            {
              id: "state-dormant",
              mission_type: "raffle" as const,
              display_name: "VIP Raffle",
              description: "Coming soon",
              current_progress: 0,
              goal: 1,
              progress_percentage: 0,
              remaining_value: 0,
              reward_type: "gift",
              reward_value: null,
              reward_custom_text: "Wireless Headphones",
              status: "dormant" as const,
              checkpoint_end: null,
              required_tier: null,
              raffle_prize_name: "Wireless Headphones",
              raffle_end_date: "2025-04-01T23:59:59Z",
              activated: false,
              enabled: true,
            },
            // locked (priority 8)
            {
              id: "state-locked",
              mission_type: "views" as const,
              display_name: "Elite Views",
              description: "Locked mission",
              current_progress: 0,
              goal: 100000,
              progress_percentage: 0,
              remaining_value: 100000,
              reward_type: "gift_card",
              reward_value: 100,
              reward_custom_text: null,
              status: "locked" as const,
              checkpoint_end: "2025-03-20T23:59:59Z",
              required_tier: "Elite",
              raffle_prize_name: null,
              raffle_end_date: null,
              activated: null,
              enabled: true,
            },
          ],
        },
      }

      // Get current scenario data
      const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
      const currentTier = currentScenario.currentTier
      const completedMissions = currentScenario.completedMissions
      const missions = currentScenario.missions

      const currentTierColor = tierColors[currentTier as keyof typeof tierColors]

      const handleClaimMission = (mission: any) => {
        console.log("[v0] Claim mission clicked:", mission.id)

        // If discount type, open scheduling modal
        if (mission.reward_type === "discount") {
          setSelectedMission({
            id: mission.id,
            percent: mission.reward_value || 0,
            durationDays: 30, // Default duration for mission discounts
          })
          setShowScheduleModal(true)
          return
        }

        // For other reward types, claim immediately
        // TODO: POST /api/missions/:id/claim
        // Sets status from 'completed' → 'claimed'
      }

      const handleScheduleDiscount = async (scheduledDate: Date) => {
        if (!selectedMission) return

        console.log("[v0] Schedule mission discount for:", selectedMission.id, scheduledDate.toISOString())

        try {
          // TODO: POST /api/missions/:id/claim
          // Request body: { scheduled_activation_at: scheduledDate.toISOString() }

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500))

          // Show success message
          const dateStr = scheduledDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
          const timeStr = scheduledDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "America/New_York",
          })

          toast.success(`Discount scheduled for ${dateStr} at ${timeStr} ET`, {
            description: "We'll activate your boost at this time",
            duration: 5000,
          })

          // Reset selected mission
          setSelectedMission(null)
        } catch (error) {
          console.error("Failed to schedule discount:", error)
          toast.error("Failed to schedule discount", {
            description: "Please try again or contact support",
            duration: 5000,
          })
        }
      }

      const handleParticipateRaffle = (missionId: string) => {
        console.log("[v0] Participate in raffle clicked:", missionId)
        // TODO: POST /api/missions/:id/participate
        // Creates mission_progress (status='processing'), raffle_participants, redemptions
      }

      // Map backend mission types to frontend icons
      const getIconForMissionType = (missionType: string, status: string) => {
        if (status === "locked") {
          return <Lock className="h-8 w-8 text-slate-400" />
        }

        const iconClass = cn(
          "h-8 w-8",
          status === "processing" && "text-amber-500",
          (status === "active" || status === "available" || status === "dormant") &&
  "text-slate-700",
          (status === "completed" || status === "claimed" || status === "won") &&
  "text-green-600",
        )

        // Backend mission_type → Frontend icon mapping
        switch (missionType) {
          case "sales":
            return <TrendingUp className={iconClass} />
          case "videos":
            return <Video className={iconClass} />
          case "likes":
            return <Heart className={iconClass} />
          case "views":
            return <Eye className={iconClass} />
          case "raffle":
            return <Ticket className={iconClass} />
          default:
            return <TrendingUp className={iconClass} />
        }
      }

      // Calculate days remaining
      const calculateDaysRemaining = (endDate: string): number => {
        return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      }

      // Format remaining amount text based on mission type
      const getRemainingText = (missionType: string, remainingValue: number): string => {
        switch (missionType) {
          case "sales":
            return `$${remainingValue.toLocaleString()} more to sell!`
          case "videos":
            return `${remainingValue} more ${remainingValue === 1 ? 'video' : 'videos'} to
  post!`
          case "likes":
            return `${remainingValue.toLocaleString()} more likes!`
          case "views":
            return `${remainingValue.toLocaleString()} more views!`
          default:
            return `${remainingValue} more!`
        }
      }

      // Format reward text based on reward type
      const getRewardText = (
        rewardType: string,
        rewardValue: number | null,
        rewardCustomText: string | null
      ): string => {
        switch (rewardType) {
          case "gift_card":
            return `Win a $${rewardValue} Gift Card!`
          case "commission_boost":
            return `Win a ${rewardValue}% Commission Boost!`
          case "discount":
            return `Win a ${rewardValue}% Follower Discount!`
          case "gift":
            return `Win a ${rewardCustomText} Gift!`
          case "trip":
            return `Win a ${rewardCustomText}!`
          default:
            return "Win a reward!"
        }
      }

      // Frontend filtering and sorting logic
      const displayMissions = missions
        .filter((mission) => {
          // Filter out missions that should not appear in Available Missions tab
          // 1. Fulfilled missions (moved to Completed Missions tab)
          if (mission.status === "fulfilled") return false

          // 2. Lost raffle entries (moved to Completed Missions tab)
          if (mission.status === "lost") return false

          // 3. Cancelled missions (admin disabled mission mid-progress)
          if (mission.status === "cancelled") return false

          // 4. Disabled missions (admin set enabled=false - master visibility switch)
          // This overrides all other states including activated
          if (mission.enabled === false) return false

          // All other statuses should appear (active, completed, claimed, processing, won, available, dormant, locked)
          return true
        })
        .sort((a, b) => {
          const statusPriority = {
            won: 1,
            completed: 2,
            claimed: 3,
            processing: 4,
            active: 5,
            available: 6,
            dormant: 7,
            locked: 8,
          }
          return statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority]
        })

      return (
        <>
          {/* DEBUG PANEL TOGGLE BUTTON - Always visible */}
          <button
            onClick={() => setDebugPanelOpen(!debugPanelOpen)}
            className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
            aria-label="Toggle test scenarios"
          >
            🧪
          </button>

          {/* DEBUG PANEL - Collapsible */}
          {debugPanelOpen && (
            <div className="fixed top-16 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-purple-500 p-4 w-64 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  🧪 Test Scenarios
                  <span className="text-xs text-slate-500">({Object.keys(scenarios).length})</span>
                </h3>
                <button
                  onClick={() => setDebugPanelOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5">
              {Object.entries(scenarios).map(([key, scenario]) => (
                <Button
                  key={key}
                  onClick={() => setActiveScenario(key)}
                  variant={activeScenario === key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full justify-start text-xs h-auto py-2 px-3",
                    activeScenario === key && "bg-purple-600 hover:bg-purple-700"
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Trophy
                      className="h-3 w-3 flex-shrink-0"
                      style={{ color: activeScenario === key ? "#ffffff" : tierColors[scenario.currentTier as keyof typeof tierColors] }}
                    />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="font-semibold truncate w-full">
                        {scenario.name}
                      </span>
                      <span className={cn(
                        "text-xs",
                        activeScenario === key ? "text-white/80" : "text-slate-500"
                      )}>
                        {scenario.currentTier} • {scenario.missions.length} missions
                      </span>
                    </div>
                  </div>
                </Button>
              ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold">Active:</span> {currentScenario.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Showing {displayMissions.length} of {missions.length} missions
                </p>
              </div>
            </div>
          )}

          <PageLayout
            title="Missions"
            headerContent={
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3
    py-2 rounded-lg border border-white/30">
                <Trophy className="w-5 h-5" style={{ color: currentTierColor }} />
                <span className="text-base font-semibold text-white">{currentTier}</span>
              </div>
            }
          >
            {/* Mission Cards */}
            <div className="space-y-4">
              {displayMissions.map((mission) => {
                const isRaffle = mission.mission_type === "raffle"

                // Build reward text
                let rewardText = ""
                if (isRaffle) {
                  // For raffles, use raffle_prize_name
                  if (mission.status === "won") {
                    rewardText = `You won ${mission.raffle_prize_name}!`
                  } else if (mission.status === "available" || mission.status === "processing") {
                    rewardText = getRewardText(mission.reward_type, mission.reward_value,
    mission.raffle_prize_name)
                  }
                } else {
                  // For regular missions, use reward fields
                  rewardText = getRewardText(mission.reward_type, mission.reward_value,
    mission.reward_custom_text)
                }

                // Build mission description for special raffle states
                let missionDescription = mission.description
                if (isRaffle) {
                  if (mission.status === "locked") {
                    missionDescription = `Unlock at ${mission.required_tier}`
                  } else if (mission.status === "dormant") {
                    missionDescription = "Raffle starts soon"
                  } else if (mission.status === "processing") {
                    const days = calculateDaysRemaining(mission.raffle_end_date!)
                    missionDescription = `${days} days until raffle`
                  }
                }

                // Card styling based on status
                const cardClass = cn(
                  "p-5 rounded-xl border",
                  (mission.status === "active" || mission.status === "available" ||
    mission.status === "dormant") &&
                    "bg-slate-50 border-slate-200",
                  mission.status === "processing" && "bg-amber-50 border-amber-200",
                  (mission.status === "completed" || mission.status === "claimed" ||
    mission.status === "won") &&
                    "bg-green-50 border-green-200",
                  mission.status === "locked" && "bg-slate-50 border-slate-200 opacity-60",
                )

                return (
                  <div key={mission.id} className={cardClass}>
                    {/* Top Row: Icon + Locked Badge */}
                    <div className="flex items-start justify-between mb-3">
                      {getIconForMissionType(mission.mission_type, mission.status)}

                      {/* Locked badge */}
                      {mission.status === "locked" && (
                        <div className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full
    text-xs font-medium">
                          🔒 {mission.required_tier}
                        </div>
                      )}
                    </div>

                    {/* Mission Title */}
                    <h3 className="text-lg font-bold text-slate-900
    mb-2">{mission.display_name}</h3>

                    {/* Reward Text - Shows for all non-locked, non-dormant missions */}
                    {mission.status !== "locked" && mission.status !== "dormant" && rewardText &&
     (
                      <p className="text-base text-slate-600 mb-3 font-medium">{rewardText}</p>
                    )}

                    {/* Mission Description - Only for locked/dormant raffles */}
                    {(mission.status === "locked" || mission.status === "dormant") && (
                      <p className="text-base text-slate-600 mb-3">{missionDescription}</p>
                    )}

                    {/* Progress Section (only for active/completed regular missions) */}
                    {!isRaffle && (mission.status === "active" || mission.status === "completed")
     && (
                      <>
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-full bg-slate-200 rounded-full h-3 mr-3">
                              <div
                                className="bg-blue-600 h-3 rounded-full transition-all
    duration-500"
                                style={{ width: `${mission.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-base font-semibold text-slate-900
    whitespace-nowrap">
                              {mission.progress_percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Remaining Amount Text - Only for active missions */}
                        {mission.remaining_value > 0 && mission.status === "active" && (
                          <p className="text-base font-semibold text-slate-900 mb-3">
                            {getRemainingText(mission.mission_type, mission.remaining_value)}
                          </p>
                        )}
                      </>
                    )}

                    {/* Processing raffle description */}
                    {isRaffle && mission.status === "processing" && (
                      <p className="text-sm text-slate-600 mb-3">{missionDescription}</p>
                    )}

                    {/* Status-specific actions/displays */}
                    {mission.status === "completed" && !isRaffle && (
                      <Button
                        onClick={() => handleClaimMission(mission)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600
    hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 rounded-lg"
                      >
                        {mission.reward_type === "discount" ? "Schedule Discount" : "Claim Reward"}
                      </Button>
                    )}

                    {mission.status === "claimed" && (
                      <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3
    py-2 rounded-lg text-sm font-medium w-fit">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Prize on the way
                      </div>
                    )}

                    {isRaffle && mission.status === "available" && (
                      <Button
                        onClick={() => handleParticipateRaffle(mission.id)}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600
    hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg"
                      >
                        Participate
                      </Button>
                    )}

                    {isRaffle && mission.status === "processing" && (
                      <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3
    py-2 rounded-lg text-sm font-medium w-fit">
                        <Ticket className="h-4 w-4" />
                        Waiting for Draw
                      </div>
                    )}

                    {isRaffle && mission.status === "won" && (
                      <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3
    py-2 rounded-lg text-sm font-medium w-fit">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Prize on the way
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Completed Missions History Section */}
            <div className="border-t border-slate-200 pt-6 mt-8">
              <Link href="/missions/missionhistory" className="block">
                <Button
                  variant="outline"
                  className="w-full bg-white border-slate-200 text-slate-700 font-medium py-3
    rounded-lg hover:bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span>View Completed Missions</span>
                    <span className="text-slate-400">({completedMissions})</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Button>
              </Link>
            </div>

            {/* Schedule Discount Modal */}
            {selectedMission && (
              <ScheduleDiscountModal
                open={showScheduleModal}
                onClose={() => {
                  setShowScheduleModal(false)
                  setSelectedMission(null)
                }}
                onConfirm={handleScheduleDiscount}
                discountPercent={selectedMission.percent}
                durationDays={selectedMission.durationDays}
              />
            )}
          </PageLayout>
        </>
      )
    }
