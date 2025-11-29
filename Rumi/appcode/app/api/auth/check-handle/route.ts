import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { formatErrorResponse, BusinessError } from '@/lib/utils/errors';

/**
 * POST /api/auth/check-handle
 *
 * Validate TikTok handle and determine routing based on user existence
 * and email registration status.
 *
 * References:
 * - API_CONTRACTS.md lines 34-184 (POST /api/auth/check-handle)
 * - ARCHITECTURE.md Section 5 (Presentation Layer)
 *
 * 3 Routing Scenarios:
 * - A: exists + has email → route to login
 * - B: exists + no email → route to signup (Cruva import)
 * - C: not found → route to signup (new user)
 */

// Handle validation regex per API_CONTRACTS.md line 170
const HANDLE_REGEX = /^[a-zA-Z0-9_.]{1,30}$/;

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { handle } = body;

    // Validate handle is provided
    if (!handle || typeof handle !== 'string' || handle.trim() === '') {
      return NextResponse.json(
        {
          error: 'HANDLE_REQUIRED',
          message: 'TikTok handle is required',
        },
        { status: 400 }
      );
    }

    // Normalize handle (remove @ prefix if present for validation)
    const normalizedHandle = handle.trim().startsWith('@')
      ? handle.trim().slice(1)
      : handle.trim();

    // Validate handle length
    if (normalizedHandle.length > 30) {
      return NextResponse.json(
        {
          error: 'HANDLE_TOO_LONG',
          message: 'Handle must be 30 characters or less',
        },
        { status: 400 }
      );
    }

    // Validate handle format
    if (!HANDLE_REGEX.test(normalizedHandle)) {
      return NextResponse.json(
        {
          error: 'INVALID_HANDLE',
          message: 'Handle can only contain letters, numbers, underscores, and periods',
        },
        { status: 400 }
      );
    }

    // Get client ID from environment (MVP: single tenant)
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('CLIENT_ID not configured in environment');
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Server configuration error',
        },
        { status: 500 }
      );
    }

    // Call auth service to check handle
    const result = await authService.checkHandle(clientId, normalizedHandle);

    // Return response per API_CONTRACTS.md lines 56-62
    // Note: API uses snake_case (has_email) per contract
    return NextResponse.json({
      exists: result.exists,
      has_email: result.hasEmail,
      route: result.route,
      handle: result.handle, // Already normalized with @ prefix
    });

  } catch (error) {
    console.error('check-handle error:', error);
    return formatErrorResponse(error);
  }
}
