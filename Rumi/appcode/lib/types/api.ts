/**
 * API Request/Response Types for Rumi Loyalty Platform
 *
 * These TypeScript interfaces mirror the API contracts documented in API_CONTRACTS.md.
 * All types use camelCase (JavaScript convention) - backend transforms from snake_case.
 *
 * Source of truth: API_CONTRACTS.md
 * Generated: 2025-11-28
 */

import type {
  RewardType,
  MissionType,
  TargetUnit,
  RedemptionStatus,
  BoostStatus,
  PaymentMethod,
  RedemptionFrequency,
  RedemptionType,
  TierId,
  MissionTierEligibility,
  VipMetric,
} from './enums';

// =============================================================================
// SECTION 1: Common Types
// =============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  error: string;
  message: string;
}

/**
 * User info included in most authenticated responses
 */
export interface UserInfo {
  id: string;
  handle: string;
  email?: string;
  currentTier?: TierId;
  currentTierName?: string;
  currentTierColor?: string;
  clientName?: string;
}

/**
 * Tier info object
 */
export interface TierInfo {
  id?: string;
  name: string;
  color: string;
  order?: number;
  checkpointExempt?: boolean;
}

// =============================================================================
// SECTION 2: Authentication Endpoints
// =============================================================================

// POST /api/auth/check-handle
export interface CheckHandleRequest {
  handle: string;
}

export interface CheckHandleResponse {
  exists: boolean;
  hasEmail: boolean;
  route: 'signup' | 'login';
  handle: string;
}

// POST /api/auth/signup
export interface SignupRequest {
  handle: string;
  email: string;
  password: string;
  agreedToTerms: boolean;
}

export interface SignupResponse {
  success: boolean;
  otpSent: boolean;
  sessionId: string;
  userId: string;
}

// POST /api/auth/verify-otp
export interface VerifyOtpRequest {
  code: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified: boolean;
  userId: string;
  sessionToken: string;
}

// POST /api/auth/resend-otp
export interface ResendOtpRequest {
  // Empty - session_id from HTTP-only cookie
}

export interface ResendOtpResponse {
  success: boolean;
  sent: boolean;
  expiresAt: string;
  remainingSeconds: number;
}

// POST /api/auth/login
export interface LoginRequest {
  handle: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  userId: string;
  sessionToken: string;
}

// GET /api/auth/user-status
export interface UserStatusResponse {
  userId: string;
  isRecognized: boolean;
  redirectTo: string;
  emailVerified: boolean;
}

// GET /api/auth/onboarding-info
export interface OnboardingInfoResponse {
  heading: string;
  message: string;
  submessage: string;
  buttonText: string;
}

// POST /api/auth/forgot-password
export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ForgotPasswordResponse {
  sent: boolean;
  emailHint: string;
  expiresIn: number;
}

// POST /api/auth/reset-password
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// SECTION 3: Dashboard / Home Endpoints
// =============================================================================

/**
 * Featured mission status
 */
export type FeaturedMissionStatus =
  | 'active'
  | 'completed'
  | 'claimed'
  | 'fulfilled'
  | 'no_missions'
  | 'raffle_available';

/**
 * Featured mission data
 */
export interface FeaturedMission {
  id: string;
  type: MissionType;
  displayName: string;
  currentProgress: number;
  targetValue: number;
  progressPercentage: number;
  currentFormatted: string | null;
  targetFormatted: string | null;
  targetText: string;
  progressText: string;
  isRaffle: boolean;
  raffleEndDate: string | null;
  rewardType: RewardType;
  rewardAmount: number | null;
  rewardCustomText: string | null;
  rewardDisplayText: string;
}

/**
 * Featured mission response wrapper
 */
export interface FeaturedMissionResponse {
  status: FeaturedMissionStatus;
  mission: FeaturedMission | null;
  tier: TierInfo;
  showCongratsModal: boolean;
  congratsMessage: string | null;
  supportEmail: string;
  emptyStateMessage: string | null;
}

// GET /api/dashboard/featured-mission
export type GetFeaturedMissionResponse = FeaturedMissionResponse;

/**
 * Client configuration for dashboard
 */
export interface ClientInfo {
  id: string;
  vipMetric: VipMetric;
  vipMetricLabel: string;
}

/**
 * Current tier data
 */
export interface CurrentTierInfo {
  id: string;
  name: string;
  color: string;
  order: number;
  checkpointExempt: boolean;
}

/**
 * Next tier data
 */
export interface NextTierInfo {
  id: string;
  name: string;
  color: string;
  minSalesThreshold: number;
}

/**
 * Tier progression data
 */
export interface TierProgress {
  currentValue: number;
  targetValue: number;
  progressPercentage: number;
  currentFormatted: string;
  targetFormatted: string;
  checkpointExpiresAt: string;
  checkpointExpiresFormatted: string;
  checkpointMonths: number;
}

/**
 * Current tier reward item
 */
export interface CurrentTierReward {
  id: string;
  type: RewardType;
  name: string;
  displayText: string;
  description: string;
  valueData: RewardValueData | null;
  rewardSource: 'vip_tier' | 'mission';
  redemptionQuantity: number;
  displayOrder: number;
}

// GET /api/dashboard
export interface DashboardResponse {
  user: UserInfo;
  client: ClientInfo;
  currentTier: CurrentTierInfo;
  nextTier: NextTierInfo | null;
  tierProgress: TierProgress;
  featuredMission: FeaturedMissionResponse;
  currentTierRewards: CurrentTierReward[];
  totalRewardsCount: number;
}

// =============================================================================
// SECTION 4: Missions Endpoints
// =============================================================================

/**
 * Mission status (comprehensive)
 */
export type MissionStatus =
  | 'in_progress'
  | 'default_claim'
  | 'default_schedule'
  | 'scheduled'
  | 'active'
  | 'redeeming'
  | 'redeeming_physical'
  | 'sending'
  | 'pending_info'
  | 'clearing'
  | 'dormant'
  | 'raffle_available'
  | 'raffle_processing'
  | 'raffle_claim'
  | 'raffle_won'
  | 'locked';

/**
 * Mission progress data
 */
export interface MissionProgress {
  currentValue: number;
  currentFormatted: string;
  targetValue: number;
  targetFormatted: string;
  percentage: number;
  remainingText: string;
  progressText: string;
}

/**
 * Mission deadline data
 */
export interface MissionDeadline {
  checkpointEnd: string;
  checkpointEndFormatted: string;
  daysRemaining: number;
}

/**
 * Reward value data (JSONB transformed to camelCase)
 */
export interface RewardValueData {
  percent?: number;
  durationDays?: number;
  amount?: number;
  displayText?: string;
  requiresSize?: boolean;
  sizeCategory?: string;
  sizeOptions?: string[];
  couponCode?: string;
  maxUses?: number;
}

/**
 * Mission scheduling data
 */
export interface MissionScheduling {
  scheduledActivationDate: string;
  scheduledActivationTime: string;
  scheduledActivationFormatted: string;
  activationDate: string | null;
  activationDateFormatted: string | null;
  expirationDate: string | null;
  expirationDateFormatted: string | null;
  durationText: string;
}

/**
 * Raffle-specific data
 */
export interface RaffleData {
  raffleEndDate: string;
  raffleEndFormatted: string;
  daysUntilDraw: number;
  isWinner: boolean | null;
  prizeName: string;
}

/**
 * Locked mission data
 */
export interface LockedData {
  requiredTier: TierId;
  requiredTierName: string;
  requiredTierColor: string;
  unlockMessage: string;
  previewFromTier: TierId | null;
}

/**
 * Flippable card content
 */
export interface FlippableCard {
  backContentType: 'dates' | 'message';
  message: string | null;
  dates: Array<{
    label: string;
    value: string;
  }> | null;
}

/**
 * Full mission item
 */
export interface Mission {
  id: string;
  missionType: MissionType;
  displayName: string;
  targetUnit: TargetUnit;
  tierEligibility: MissionTierEligibility;
  rewardType: RewardType;
  rewardDescription: string;
  rewardSource: 'vip_tier' | 'mission';
  status: MissionStatus;
  progress: MissionProgress | null;
  deadline: MissionDeadline | null;
  valueData: RewardValueData | null;
  scheduling: MissionScheduling | null;
  raffleData: RaffleData | null;
  lockedData: LockedData | null;
  flippableCard: FlippableCard | null;
}

// GET /api/missions
export interface MissionsPageResponse {
  user: UserInfo;
  featuredMissionId: string;
  missions: Mission[];
}

// POST /api/missions/:id/claim
export interface ClaimMissionRequest {
  // Instant rewards (gift_card, spark_ads, experience)
  // Empty object

  // Scheduled rewards (commission_boost, discount)
  scheduledActivationDate?: string;
  scheduledActivationTime?: string;

  // Physical gifts
  size?: string;
  shippingAddress?: ShippingAddress;
}

export interface ShippingAddress {
  firstName: string;   // Recipient first name (required for carrier delivery)
  lastName: string;    // Recipient last name (required for carrier delivery)
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface ClaimMissionResponse {
  success: boolean;
  message: string;
  redemptionId: string;
  nextAction: {
    type: 'show_confirmation' | 'navigate_to_missions';
    status: string;
    message: string;
  };
}

// POST /api/missions/:id/participate
export interface ParticipateRaffleResponse {
  success: boolean;
  message: string;
  raffleData: {
    drawDate: string;
    drawDateFormatted: string;
    daysUntilDraw: number;
    prizeName: string;
  };
}

// =============================================================================
// SECTION 5: Mission History Endpoints
// =============================================================================

/**
 * Mission history status
 */
export type MissionHistoryStatus = 'concluded' | 'rejected_raffle';

/**
 * Mission history item
 */
export interface MissionHistoryItem {
  id: string;
  missionType: MissionType;
  displayName: string;
  status: MissionHistoryStatus;
  rewardType: RewardType;
  rewardName: string;
  rewardSubtitle: string;
  rewardSource: 'vip_tier' | 'mission';
  completedAt: string;
  completedAtFormatted: string;
  claimedAt: string | null;
  claimedAtFormatted: string | null;
  deliveredAt: string | null;
  deliveredAtFormatted: string | null;
  raffleData: {
    isWinner: boolean;
    drawDate: string;
    drawDateFormatted: string;
    prizeName: string;
  } | null;
}

// GET /api/missions/history
export interface MissionHistoryResponse {
  user: UserInfo;
  history: MissionHistoryItem[];
}

// =============================================================================
// SECTION 6: Rewards Endpoints
// =============================================================================

/**
 * Reward status
 */
export type RewardStatus =
  | 'clearing'
  | 'sending'
  | 'active'
  | 'pending_info'
  | 'scheduled'
  | 'redeeming_physical'
  | 'redeeming'
  | 'claimable'
  | 'limit_reached'
  | 'locked';

/**
 * Reward status details
 */
export interface RewardStatusDetails {
  scheduledDate?: string;
  scheduledDateRaw?: string;
  activationDate?: string;
  expirationDate?: string;
  daysRemaining?: number;
  shippingCity?: string;
  clearingDays?: number;
}

/**
 * Full reward item
 */
export interface Reward {
  id: string;
  type: RewardType;
  name: string;
  description: string;
  displayText: string;
  valueData: RewardValueData | null;
  status: RewardStatus;
  canClaim: boolean;
  isLocked: boolean;
  isPreview: boolean;
  usedCount: number;
  totalQuantity: number;
  tierEligibility: TierId;
  requiredTierName: string | null;
  rewardSource: 'vip_tier' | 'mission';
  displayOrder: number;
  statusDetails: RewardStatusDetails | null;
  redemptionFrequency: RedemptionFrequency;
  redemptionType: RedemptionType;
}

// GET /api/rewards
export interface RewardsPageResponse {
  user: UserInfo;
  redemptionCount: number;
  rewards: Reward[];
}

// POST /api/rewards/:id/claim
export interface ClaimRewardRequest {
  scheduledActivationAt?: string;
  sizeValue?: string;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
}

export interface ClaimRewardResponse {
  success: boolean;
  message: string;
  redemption: {
    id: string;
    status: 'claimed';
    rewardType: RewardType;
    claimedAt: string;
    reward: {
      id: string;
      name: string;
      displayText: string;
      type: RewardType;
      rewardSource: 'vip_tier';
      valueData: RewardValueData | null;
    };
    scheduledActivationAt?: string;
    usedCount: number;
    totalQuantity: number;
    nextSteps: {
      action: 'wait_fulfillment' | 'shipping_confirmation' | 'scheduled_confirmation';
      message: string;
    };
  };
  updatedRewards: Array<{
    id: string;
    status: RewardStatus;
    canClaim: boolean;
    usedCount: number;
  }>;
}

// =============================================================================
// SECTION 7: Rewards History & Payment Endpoints
// =============================================================================

// GET /api/user/payment-info
export interface PaymentInfoResponse {
  hasPaymentInfo: boolean;
  paymentMethod: PaymentMethod | null;
  paymentAccount: string | null;
}

// POST /api/rewards/:id/payment-info
export interface PaymentInfoRequest {
  paymentMethod: PaymentMethod;
  paymentAccount: string;
  paymentAccountConfirm: string;
  saveAsDefault: boolean;
}

export interface PaymentInfoSubmitResponse {
  success: boolean;
  message: string;
  redemption: {
    id: string;
    status: string;
    paymentMethod: PaymentMethod;
    paymentInfoCollectedAt: string;
  };
  userPaymentUpdated: boolean;
}

/**
 * Redemption history item
 */
export interface RedemptionHistoryItem {
  id: string;
  rewardId: string;
  name: string;
  description: string;
  type: RewardType;
  rewardSource: 'vip_tier' | 'mission';
  claimedAt: string;
  concludedAt: string;
  status: 'concluded';
}

// GET /api/rewards/history
export interface RedemptionHistoryResponse {
  user: UserInfo;
  history: RedemptionHistoryItem[];
}

// =============================================================================
// SECTION 8: Tiers Endpoints
// =============================================================================

/**
 * Tier reward preview
 */
export interface TierRewardPreview {
  type: RewardType;
  isRaffle: boolean;
  displayText: string;
  count: number;
  sortPriority: number;
}

/**
 * Tier card data
 */
export interface TierCard {
  name: string;
  color: string;
  tierLevel: number;
  minSales: number;
  minSalesFormatted: string;
  salesDisplayText: string;
  commissionRate: number;
  commissionDisplayText: string;
  isUnlocked: boolean;
  isCurrent: boolean;
  totalPerksCount: number;
  rewards: TierRewardPreview[];
}

/**
 * User tier progress info
 */
export interface TierUserProgress {
  id: string;
  currentTier: TierId;
  currentTierName: string;
  currentTierColor: string;
  currentSales: number;
  currentSalesFormatted: string;
  expirationDate: string | null;
  expirationDateFormatted: string | null;
  showExpiration: boolean;
}

/**
 * Progress to next tier
 */
export interface NextTierProgress {
  nextTierName: string;
  nextTierTarget: number;
  nextTierTargetFormatted: string;
  amountRemaining: number;
  amountRemainingFormatted: string;
  progressPercentage: number;
  progressText: string;
}

/**
 * VIP system configuration
 */
export interface VipSystemConfig {
  metric: 'sales_dollars' | 'sales_units';
}

// GET /api/tiers
export interface TiersPageResponse {
  user: TierUserProgress;
  progress: NextTierProgress;
  vipSystem: VipSystemConfig;
  tiers: TierCard[];
}

// =============================================================================
// SECTION 9: Internal/System Endpoints
// =============================================================================

// GET /api/internal/client-config
export interface ClientConfigResponse {
  logoUrl: string;
  privacyPolicyUrl: string;
  clientName: string;
  primaryColor: string;
}
