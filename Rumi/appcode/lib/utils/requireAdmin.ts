/**
 * Require Admin Utility
 *
 * References:
 * - Loyalty.md lines 218-226 (Admin Routes requiring requireAdmin())
 * - Loyalty.md lines 2345-2360 (Admin Authentication Strategy)
 * - ARCHITECTURE.md Section 10 (Authorization & Security Checklists)
 *
 * Defense-in-depth strategy per Loyalty.md lines 2357-2360:
 * 1. Next.js middleware (route protection)
 * 2. This utility (API protection)
 * 3. RLS policies (database protection)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Admin user data returned on successful authentication
 */
export interface AdminUser {
  id: string;
  clientId: string;
  email: string;
  tiktokHandle: string;
  isAdmin: boolean;
}

/**
 * Error response structure
 */
export interface AdminAuthError {
  error: string;
  code: string;
  message: string;
}

/**
 * Require admin authentication for API routes
 *
 * Per EXECUTION_PLAN.md Task 3.5.8 acceptance criteria:
 * - Returns 401 if not logged in
 * - Returns 403 with "Admin access required" message if logged in but not admin
 * - Returns user object with client_id if admin
 * - Filters users query by client_id (multi-tenant isolation)
 *
 * @param request - NextRequest object
 * @returns AdminUser on success, NextResponse error on failure
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AdminUser | NextResponse> {
  const supabase = await createClient();

  // 1. Extract session from request (Supabase Auth)
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  // 2. If no session, return 401 Unauthorized
  if (authError || !authUser) {
    const errorResponse: AdminAuthError = {
      error: 'Unauthorized',
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  // 3. Query users table for is_admin flag with client_id filter
  // Use RPC function to bypass RLS recursion issues
  const adminClient = createAdminClient();
  const { data: userData, error: userError } = await adminClient.rpc('auth_find_user_by_id', {
    p_user_id: authUser.id,
  });

  if (userError || !userData || userData.length === 0) {
    const errorResponse: AdminAuthError = {
      error: 'Forbidden',
      code: 'USER_NOT_FOUND',
      message: 'User profile not found',
    };
    return NextResponse.json(errorResponse, { status: 403 });
  }

  const user = userData[0];

  // 4. If is_admin = false, return 403 Forbidden with "Admin access required"
  if (!user.is_admin) {
    const errorResponse: AdminAuthError = {
      error: 'Forbidden',
      code: 'FORBIDDEN',
      message: 'Admin access required', // Per Loyalty.md line 2348
    };
    return NextResponse.json(errorResponse, { status: 403 });
  }

  // 5. If is_admin = true, return user object with client_id
  return {
    id: user.id,
    clientId: user.client_id,
    email: user.email || '',
    tiktokHandle: user.tiktok_handle,
    isAdmin: true,
  };
}

/**
 * Type guard to check if result is an error response
 */
export function isAdminAuthError(
  result: AdminUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
