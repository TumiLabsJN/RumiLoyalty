/**
 * Error Handling Utility
 *
 * Provides standardized error classes and response formatters
 * matching API_CONTRACTS.md error response format.
 *
 * Standard error response format:
 * {
 *   error: "ERROR_CODE",
 *   message: "User-facing message",
 *   ...additionalFields
 * }
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getValidationErrors } from './validation';

// =============================================================================
// SECTION 1: Error Codes
// =============================================================================

/**
 * Standardized error codes matching API_CONTRACTS.md
 */
export const ErrorCode = {
  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  TIER_INELIGIBLE: 'TIER_INELIGIBLE',
  PAYMENT_INFO_NOT_REQUIRED: 'PAYMENT_INFO_NOT_REQUIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',

  // Rate limiting errors (429)
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  REWARD_NOT_FOUND: 'REWARD_NOT_FOUND',
  MISSION_NOT_FOUND: 'MISSION_NOT_FOUND',

  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  HANDLE_TAKEN: 'HANDLE_TAKEN',
  HANDLE_EXISTS: 'HANDLE_EXISTS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  OTP_ALREADY_USED: 'OTP_ALREADY_USED',
  OTP_NOT_FOUND: 'OTP_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  RESEND_TOO_SOON: 'RESEND_TOO_SOON',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_SESSION: 'INVALID_SESSION',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_USED: 'TOKEN_USED',
  WEAK_PASSWORD: 'WEAK_PASSWORD',

  // Business logic errors (400)
  ACTIVE_CLAIM_EXISTS: 'ACTIVE_CLAIM_EXISTS',
  LIMIT_REACHED: 'LIMIT_REACHED',
  SCHEDULING_REQUIRED: 'SCHEDULING_REQUIRED',
  INVALID_SCHEDULE: 'INVALID_SCHEDULE',
  INVALID_TIME_SLOT: 'INVALID_TIME_SLOT',
  SIZE_REQUIRED: 'SIZE_REQUIRED',
  INVALID_SIZE_SELECTION: 'INVALID_SIZE_SELECTION',
  SHIPPING_INFO_REQUIRED: 'SHIPPING_INFO_REQUIRED',
  PAYMENT_ACCOUNT_MISMATCH: 'PAYMENT_ACCOUNT_MISMATCH',
  INVALID_PAYPAL_EMAIL: 'INVALID_PAYPAL_EMAIL',
  INVALID_VENMO_HANDLE: 'INVALID_VENMO_HANDLE',
  MISSION_NOT_CLAIMABLE: 'MISSION_NOT_CLAIMABLE',
  REWARD_NOT_CLAIMABLE: 'REWARD_NOT_CLAIMABLE',
  ALREADY_PARTICIPATED: 'ALREADY_PARTICIPATED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CLAIM_FAILED: 'CLAIM_FAILED',
  AUTH_CREATION_FAILED: 'AUTH_CREATION_FAILED',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// =============================================================================
// SECTION 2: AppError Class
// =============================================================================

/**
 * Application error class with standardized structure
 *
 * @example
 * throw new AppError('LIMIT_REACHED', 'You have reached the redemption limit', 400, {
 *   usedCount: 2,
 *   totalQuantity: 2,
 *   redemptionFrequency: 'monthly'
 * });
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    statusCode: number = 400,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to API response format
   */
  toResponse(): Record<string, unknown> {
    return {
      error: this.code,
      message: this.message,
      ...this.details,
    };
  }
}

// =============================================================================
// SECTION 3: Specialized Error Classes
// =============================================================================

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

/**
 * 403 Forbidden - Access denied
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', details: Record<string, unknown> = {}) {
    super(ErrorCode.FORBIDDEN, message, 403, details);
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details: Record<string, unknown> = {}) {
    super(ErrorCode.NOT_FOUND, `${resource} not found`, 404, details);
  }
}

/**
 * 400 Validation Error - Invalid input
 */
export class ValidationError extends AppError {
  constructor(message: string, errors: Record<string, string> = {}) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, { errors });
  }

  /**
   * Create from Zod validation error
   */
  static fromZodError(error: ZodError): ValidationError {
    const errors = getValidationErrors(error);
    const firstError = error.errors[0]?.message || 'Validation failed';
    return new ValidationError(firstError, errors);
  }
}

/**
 * 400 Business Logic Error - Custom business rule violation
 */
export class BusinessError extends AppError {
  constructor(
    code: ErrorCodeType,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(code, message, 400, details);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message: string = 'An unexpected error occurred') {
    super(ErrorCode.INTERNAL_ERROR, message, 500);
  }
}

// =============================================================================
// SECTION 4: Error Response Formatter
// =============================================================================

/**
 * Format error for API response
 *
 * Handles AppError, ZodError, and generic Error instances.
 * Always returns a standardized error response format.
 *
 * @param error - The error to format
 * @returns NextResponse with appropriate status code and body
 *
 * @example
 * try {
 *   // ... API logic
 * } catch (error) {
 *   return formatErrorResponse(error);
 * }
 */
export function formatErrorResponse(error: unknown): NextResponse {
  // AppError - use its built-in response format
  if (error instanceof AppError) {
    return NextResponse.json(error.toResponse(), { status: error.statusCode });
  }

  // ZodError - convert to ValidationError
  if (error instanceof ZodError) {
    const validationError = ValidationError.fromZodError(error);
    return NextResponse.json(validationError.toResponse(), { status: 400 });
  }

  // Generic Error - wrap as internal error
  if (error instanceof Error) {
    // Log the actual error for debugging (in production, use proper logging)
    console.error('Unhandled error:', error);

    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }

  // Unknown error type
  console.error('Unknown error type:', error);
  return NextResponse.json(
    {
      error: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

// =============================================================================
// SECTION 5: Error Factory Functions
// =============================================================================

/**
 * Create tier eligibility error
 */
export function tierIneligibleError(
  requiredTier: string,
  currentTier: string,
  requiredTierName?: string
): AppError {
  return new AppError(
    ErrorCode.TIER_INELIGIBLE,
    `This reward requires ${requiredTierName || requiredTier}. You are currently ${currentTier}.`,
    403,
    { requiredTier, currentTier }
  );
}

/**
 * Create active claim exists error
 */
export function activeClaimExistsError(
  redemptionId: string,
  redemptionStatus: string
): AppError {
  return new AppError(
    ErrorCode.ACTIVE_CLAIM_EXISTS,
    'You already have an active claim for this reward. Wait for it to be fulfilled before claiming again.',
    400,
    { activeRedemptionId: redemptionId, activeRedemptionStatus: redemptionStatus }
  );
}

/**
 * Create limit reached error
 */
export function limitReachedError(
  usedCount: number,
  totalQuantity: number,
  redemptionFrequency: string
): AppError {
  return new AppError(
    ErrorCode.LIMIT_REACHED,
    `You have reached the redemption limit for this reward (${usedCount} of ${totalQuantity} used this ${redemptionFrequency})`,
    400,
    { usedCount, totalQuantity, redemptionFrequency }
  );
}

/**
 * Create scheduling required error
 */
export function schedulingRequiredError(rewardType: string): AppError {
  return new AppError(
    ErrorCode.SCHEDULING_REQUIRED,
    'This reward requires a scheduled activation date',
    400,
    { rewardType }
  );
}

/**
 * Create invalid schedule error (weekday requirement)
 */
export function invalidScheduleWeekdayError(): AppError {
  return new AppError(
    ErrorCode.INVALID_SCHEDULE,
    'Discounts can only be scheduled on weekdays (Monday-Friday)',
    400,
    { allowedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
  );
}

/**
 * Create invalid time slot error
 */
export function invalidTimeSlotError(): AppError {
  return new AppError(
    ErrorCode.INVALID_TIME_SLOT,
    'Discounts must be scheduled between 9 AM - 4 PM EST',
    400,
    { allowedHours: '09:00 - 16:00 EST' }
  );
}

/**
 * Create size required error
 */
export function sizeRequiredError(sizeOptions: string[]): AppError {
  return new AppError(
    ErrorCode.SIZE_REQUIRED,
    'This item requires a size selection',
    400,
    { sizeOptions }
  );
}

/**
 * Create invalid size selection error
 */
export function invalidSizeSelectionError(
  selectedSize: string,
  availableSizes: string[]
): AppError {
  return new AppError(
    ErrorCode.INVALID_SIZE_SELECTION,
    'Selected size is not available for this item',
    400,
    { selectedSize, availableSizes }
  );
}

/**
 * Create shipping info required error
 */
export function shippingInfoRequiredError(): AppError {
  return new AppError(
    ErrorCode.SHIPPING_INFO_REQUIRED,
    'Physical gifts require shipping information',
    400,
    { rewardType: 'physical_gift' }
  );
}

/**
 * Create payment account mismatch error
 */
export function paymentAccountMismatchError(): AppError {
  return new AppError(
    ErrorCode.PAYMENT_ACCOUNT_MISMATCH,
    'Payment account confirmation does not match',
    400
  );
}

/**
 * Create invalid PayPal email error
 */
export function invalidPaypalEmailError(): AppError {
  return new AppError(
    ErrorCode.INVALID_PAYPAL_EMAIL,
    'Please provide a valid PayPal email address',
    400
  );
}

/**
 * Create invalid Venmo handle error
 */
export function invalidVenmoHandleError(): AppError {
  return new AppError(
    ErrorCode.INVALID_VENMO_HANDLE,
    'Venmo handle must start with @ (e.g., @username)',
    400
  );
}

/**
 * Create payment info not required error (redemption not in pending_info status)
 * Per API_CONTRACTS.md lines 5435-5441
 */
export function paymentInfoNotRequiredError(currentStatus: string): AppError {
  return new AppError(
    ErrorCode.PAYMENT_INFO_NOT_REQUIRED,
    'This reward is not awaiting payment information',
    403,
    { currentStatus }
  );
}

// =============================================================================
// SECTION 6: Type Guards
// =============================================================================

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if an error is a specific AppError code
 */
export function isErrorCode(error: unknown, code: ErrorCodeType): boolean {
  return isAppError(error) && error.code === code;
}
