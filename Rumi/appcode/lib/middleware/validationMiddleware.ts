/**
 * Validation Middleware
 *
 * References:
 * - Loyalty.md lines 240-242 (Zod validation on all routes)
 * - ARCHITECTURE.md Section 10.3 (Server-Side Validation Pattern)
 *
 * Provides wrapper function for Next.js API routes to validate request body/query/params.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation error response format per ARCHITECTURE.md Section 10.3
 */
export interface ValidationErrorResponse {
  error: string;
  code: string;
  fields: Record<string, string[]>;
}

/**
 * Validated request with typed body
 */
export interface ValidatedRequest<T> extends NextRequest {
  validatedBody: T;
}

/**
 * Format Zod errors into field-level error messages
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!fields[path]) {
      fields[path] = [];
    }
    fields[path].push(issue.message);
  }

  return fields;
}

/**
 * Higher-order function that wraps an API route handler with request body validation
 *
 * @param schema - Zod schema to validate the request body against
 * @param handler - The actual route handler function that receives validated data
 *
 * @example
 * import { signupRequestSchema } from '@/lib/utils/validation';
 *
 * export const POST = withValidation(signupRequestSchema, async (request, data) => {
 *   // data is typed and validated
 *   const { email, password, handle } = data;
 *   // handler logic
 * });
 */
export function withValidation<T extends ZodSchema>(
  schema: T,
  handler: (request: NextRequest, data: z.infer<T>) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Parse request body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          {
            error: 'Invalid JSON',
            code: 'INVALID_JSON',
            fields: { _root: ['Request body must be valid JSON'] },
          } as ValidationErrorResponse,
          { status: 400 }
        );
      }

      // Validate against schema
      const result = schema.safeParse(body);

      if (!result.success) {
        const errorResponse: ValidationErrorResponse = {
          error: 'Validation Error',
          code: 'VALIDATION_ERROR',
          fields: formatZodErrors(result.error),
        };

        return NextResponse.json(errorResponse, { status: 400 });
      }

      // Validation passed, call handler with validated data
      return handler(request, result.data);
    } catch (error) {
      console.error('[Validation] Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          fields: {},
        } as ValidationErrorResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Validate query parameters from URL
 *
 * @example
 * const query = validateQuery(request, paginationSchema);
 * if (query.error) {
 *   return query.error; // Returns 400 response
 * }
 * const { limit, offset } = query.data;
 */
export function validateQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);

  const result = schema.safeParse(searchParams);

  if (!result.success) {
    const errorResponse: ValidationErrorResponse = {
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      fields: formatZodErrors(result.error),
    };

    return {
      data: null,
      error: NextResponse.json(errorResponse, { status: 400 }),
    };
  }

  return { data: result.data, error: null };
}

/**
 * Validate path parameters (from dynamic route segments)
 *
 * @example
 * // In /api/users/[id]/route.ts
 * const params = validateParams({ id: params.id }, uuidSchema.transform(id => ({ id })));
 * if (params.error) {
 *   return params.error;
 * }
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string>,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(params);

  if (!result.success) {
    const errorResponse: ValidationErrorResponse = {
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      fields: formatZodErrors(result.error),
    };

    return {
      data: null,
      error: NextResponse.json(errorResponse, { status: 400 }),
    };
  }

  return { data: result.data, error: null };
}

/**
 * Standalone body validation for use within route handlers
 * Useful when you need more control over the validation flow
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const validation = await validateBody(request, signupRequestSchema);
 *   if (validation.error) {
 *     return validation.error; // Returns 400 response
 *   }
 *   const { email, password } = validation.data;
 *   // Continue with handler logic
 * }
 */
export async function validateBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid JSON',
          code: 'INVALID_JSON',
          fields: { _root: ['Request body must be valid JSON'] },
        } as ValidationErrorResponse,
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const errorResponse: ValidationErrorResponse = {
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      fields: formatZodErrors(result.error),
    };

    return {
      data: null,
      error: NextResponse.json(errorResponse, { status: 400 }),
    };
  }

  return { data: result.data, error: null };
}
