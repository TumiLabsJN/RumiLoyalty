/**
 * Validation Utility
 *
 * Zod schemas for common validations used across API endpoints.
 * These schemas validate request bodies before processing.
 *
 * Usage:
 * ```typescript
 * import { emailSchema, handleSchema, uuidSchema } from '@/lib/utils/validation';
 *
 * // Validate single field
 * const email = emailSchema.parse(input.email);
 *
 * // Validate request body
 * const data = signupRequestSchema.parse(req.body);
 * ```
 *
 * References: API_CONTRACTS.md (request schemas)
 */

import { z } from 'zod';

// =============================================================================
// SECTION 1: Primitive Schemas
// =============================================================================

/**
 * Email validation schema
 *
 * - Must be valid email format
 * - Max 255 characters (database constraint)
 * - Trimmed and lowercased
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email must be 255 characters or less');

/**
 * TikTok handle validation schema
 *
 * - Must start with @ or will be prefixed with @
 * - 2-24 characters after @ (TikTok's rules)
 * - Alphanumeric, underscores, and periods only
 * - Trimmed and lowercased
 */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((val) => (val.startsWith('@') ? val : `@${val}`))
  .refine(
    (val) => /^@[a-z0-9._]{2,24}$/i.test(val),
    'Handle must be 2-24 characters (letters, numbers, underscores, periods)'
  );

/**
 * UUID validation schema
 *
 * - Must be valid UUID v4 format
 * - Used for all ID fields (user_id, client_id, mission_id, etc.)
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Password validation schema
 *
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must contain at least one number'
  );

/**
 * OTP code validation schema
 *
 * - Exactly 6 digits
 */
export const otpCodeSchema = z
  .string()
  .length(6, 'OTP code must be 6 digits')
  .regex(/^\d{6}$/, 'OTP code must contain only digits');

/**
 * Positive integer validation schema
 *
 * - Must be a positive integer (1 or greater)
 */
export const positiveIntSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be a positive number');

/**
 * Non-negative integer validation schema
 *
 * - Must be 0 or greater
 */
export const nonNegativeIntSchema = z
  .number()
  .int('Must be a whole number')
  .nonnegative('Must be 0 or greater');

/**
 * Pagination limit schema
 *
 * - Default: 10
 * - Min: 1
 * - Max: 100
 */
export const paginationLimitSchema = z
  .number()
  .int()
  .min(1, 'Limit must be at least 1')
  .max(100, 'Limit cannot exceed 100')
  .default(10);

/**
 * Pagination offset schema
 *
 * - Default: 0
 * - Min: 0
 */
export const paginationOffsetSchema = z
  .number()
  .int()
  .nonnegative('Offset must be 0 or greater')
  .default(0);

// =============================================================================
// SECTION 2: Request Body Schemas
// =============================================================================

/**
 * POST /api/auth/check-handle
 */
export const checkHandleRequestSchema = z.object({
  handle: handleSchema,
});

/**
 * POST /api/auth/signup
 */
export const signupRequestSchema = z.object({
  handle: handleSchema,
  email: emailSchema,
  password: passwordSchema,
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions' }),
  }),
});

/**
 * POST /api/auth/verify-otp
 */
export const verifyOtpRequestSchema = z.object({
  code: otpCodeSchema,
});

/**
 * POST /api/auth/login
 */
export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/reset-password/request
 */
export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});

/**
 * POST /api/auth/reset-password/confirm
 */
export const resetPasswordConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
});

/**
 * POST /api/missions/:id/claim
 */
export const claimMissionRequestSchema = z.object({
  missionId: uuidSchema,
});

/**
 * POST /api/missions/:id/participate (raffle)
 */
export const participateRaffleRequestSchema = z.object({
  missionId: uuidSchema,
});

/**
 * POST /api/rewards/:id/claim
 */
export const claimRewardRequestSchema = z.object({
  rewardId: uuidSchema,
});

/**
 * POST /api/commission-boost/:id/payment-info
 */
export const submitPaymentInfoSchema = z.object({
  boostId: uuidSchema,
  paymentMethod: z.enum(['venmo', 'paypal', 'zelle']),
  paymentAccount: z.string().min(1, 'Payment account is required').max(255),
  paymentAccountConfirm: z.string().min(1, 'Please confirm your payment account'),
}).refine(
  (data) => data.paymentAccount === data.paymentAccountConfirm,
  {
    message: 'Payment accounts do not match',
    path: ['paymentAccountConfirm'],
  }
);

// =============================================================================
// SECTION 3: Query Parameter Schemas
// =============================================================================

/**
 * Pagination query parameters
 */
export const paginationQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
});

/**
 * Mission history query parameters
 */
export const missionHistoryQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
  status: z.enum(['completed', 'claimed', 'fulfilled']).optional(),
});

/**
 * Redemption history query parameters
 */
export const redemptionHistoryQuerySchema = z.object({
  limit: paginationLimitSchema,
  offset: paginationOffsetSchema,
  status: z.enum(['claimed', 'fulfilled', 'concluded', 'rejected']).optional(),
});

// =============================================================================
// SECTION 4: Helper Functions
// =============================================================================

/**
 * Safely parse and validate data, returning typed result or null
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed data or null if validation fails
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Parse and validate data, throwing ZodError on failure
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed data
 * @throws ZodError if validation fails
 */
export function parse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Get formatted validation errors from ZodError
 *
 * @param error - ZodError instance
 * @returns Object with field names as keys and error messages as values
 */
export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }

  return errors;
}

/**
 * Check if a value is a valid UUID
 *
 * @param value - Value to check
 * @returns true if valid UUID
 */
export function isValidUuid(value: unknown): boolean {
  return uuidSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid email
 *
 * @param value - Value to check
 * @returns true if valid email
 */
export function isValidEmail(value: unknown): boolean {
  return emailSchema.safeParse(value).success;
}

/**
 * Check if a value is a valid TikTok handle
 *
 * @param value - Value to check
 * @returns true if valid handle
 */
export function isValidHandle(value: unknown): boolean {
  return handleSchema.safeParse(value).success;
}

/**
 * Normalize a TikTok handle (add @ prefix, lowercase)
 *
 * @param handle - Handle to normalize
 * @returns Normalized handle with @ prefix, or null if invalid
 */
export function normalizeHandle(handle: string): string | null {
  const result = handleSchema.safeParse(handle);
  return result.success ? result.data : null;
}

/**
 * Validation result type per EXECUTION_PLAN.md Task 3.5.6
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validate request data against a schema
 *
 * Per EXECUTION_PLAN.md Task 3.5.6 acceptance criteria:
 * Returns `{ success: boolean, data?: T, errors?: ZodError }`
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success flag, parsed data, and errors
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// =============================================================================
// SECTION 5: Type Exports
// =============================================================================

export type CheckHandleRequest = z.infer<typeof checkHandleRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirm = z.infer<typeof resetPasswordConfirmSchema>;
export type ClaimMissionRequest = z.infer<typeof claimMissionRequestSchema>;
export type ParticipateRaffleRequest = z.infer<typeof participateRaffleRequestSchema>;
export type ClaimRewardRequest = z.infer<typeof claimRewardRequestSchema>;
export type SubmitPaymentInfo = z.infer<typeof submitPaymentInfoSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type MissionHistoryQuery = z.infer<typeof missionHistoryQuerySchema>;
export type RedemptionHistoryQuery = z.infer<typeof redemptionHistoryQuerySchema>;
