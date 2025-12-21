"use client"

import { toast } from 'sonner'

export interface ClaimMissionRewardOptions {
  missionProgressId: string
  successMessage: string
  successDescription: string
  refreshDelay?: number
}

export interface ClaimMissionRewardResult {
  success: boolean
  message?: string
  redemptionId?: string
}

/**
 * Claims an instant mission reward (gift_card, spark_ads, experience)
 * Centralized to ensure consistent API call, error handling, and refresh behavior
 * Toast messages are context-specific (passed by caller)
 *
 * @param options - Claim options including mission progress ID and toast messages
 * @param refreshFn - Function to refresh the page (router.refresh or window.location.reload)
 * @returns Promise resolving to claim result
 */
export async function claimMissionReward(
  options: ClaimMissionRewardOptions,
  refreshFn: () => void
): Promise<ClaimMissionRewardResult> {
  const { missionProgressId, successMessage, successDescription, refreshDelay = 2000 } = options

  try {
    const response = await fetch(`/api/missions/${missionProgressId}/claim`, {
      method: 'POST',
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to claim reward')
    }

    toast.success(successMessage, {
      description: successDescription,
      duration: 5000,
    })

    // Refresh page to update mission status (delay for toast visibility)
    setTimeout(() => refreshFn(), refreshDelay)

    return { success: true, redemptionId: result.redemptionId }

  } catch (error) {
    console.error('Failed to claim reward:', error)
    toast.error('Failed to claim reward', {
      description: error instanceof Error ? error.message : 'Please try again or contact support',
      duration: 5000,
    })
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
