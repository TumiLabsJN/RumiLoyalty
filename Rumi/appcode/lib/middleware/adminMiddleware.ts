/**
 * Admin Middleware
 *
 * References:
 * - Loyalty.md lines 219-225 (Admin Routes requiring requireAdmin())
 * - Loyalty.md lines 2362-2368 (Admin Authentication Strategy)
 * - ARCHITECTURE.md Section 10 (Authorization & Security Checklists)
 *
 * Provides wrapper function for Next.js API routes requiring admin access.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserFromRequest,
  requireAdmin,
  AuthenticatedUser,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/auth';

/**
 * Admin error response
 */
export interface AdminErrorResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Request with authenticated admin user attached
 */
export interface AdminRequest extends NextRequest {
  adminUser: AuthenticatedUser;
}

/**
 * Higher-order function that wraps an API route handler with admin authentication
 *
 * Returns:
 * - 401 if not logged in
 * - 403 if logged in but not admin ("Admin access required")
 * - Calls handler with admin user if authorized
 *
 * @param handler - The actual route handler function that receives the admin user
 *
 * @example
 * export const GET = withAdmin(async (request, adminUser) => {
 *   // adminUser is authenticated and verified as admin
 *   const { clientId } = adminUser;
 *   // handler logic
 * });
 */
export function withAdmin(
  handler: (request: NextRequest, adminUser: AuthenticatedUser) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Get authenticated user
      const user = await getUserFromRequest();

      // 2. Check admin privileges
      requireAdmin(user);

      // 3. Admin verified, call handler
      return handler(request, user);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        const errorResponse: AdminErrorResponse = {
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: error.message,
        };
        return NextResponse.json(errorResponse, { status: 401 });
      }

      if (error instanceof ForbiddenError) {
        const errorResponse: AdminErrorResponse = {
          error: 'Forbidden',
          code: 'FORBIDDEN',
          message: 'Admin access required',
        };
        return NextResponse.json(errorResponse, { status: 403 });
      }

      // Unexpected error
      console.error('[AdminMiddleware] Unexpected error:', error);
      return NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        } as AdminErrorResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Standalone admin check for use within route handlers
 * Useful when you need more control over the authentication flow
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const adminResult = await checkAdminAccess();
 *   if (adminResult.error) {
 *     return adminResult.error; // Returns 401 or 403 response
 *   }
 *   const adminUser = adminResult.user;
 *   // Continue with handler logic
 * }
 */
export async function checkAdminAccess(): Promise<
  { user: AuthenticatedUser; error: null } | { user: null; error: NextResponse }
> {
  try {
    const user = await getUserFromRequest();
    requireAdmin(user);
    return { user, error: null };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'Unauthorized',
            code: 'UNAUTHORIZED',
            message: error.message,
          } as AdminErrorResponse,
          { status: 401 }
        ),
      };
    }

    if (error instanceof ForbiddenError) {
      return {
        user: null,
        error: NextResponse.json(
          {
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Admin access required',
          } as AdminErrorResponse,
          { status: 403 }
        ),
      };
    }

    // Unexpected error
    console.error('[AdminMiddleware] Unexpected error:', error);
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        } as AdminErrorResponse,
        { status: 500 }
      ),
    };
  }
}
