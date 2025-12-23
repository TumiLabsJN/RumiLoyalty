/**
 * Next.js Middleware for Route Protection
 *
 * References:
 * - Loyalty.md lines 2346-2349 (Route Protection via Next.js middleware)
 * - Loyalty.md lines 2362-2365 (Admin Authentication Strategy)
 *
 * Protects:
 * - /admin/* pages: Requires is_admin = true
 * - Redirects unauthorized users to /dashboard with message
 *
 * Note: This is defense layer 1 (Route Protection).
 * API routes have their own protection via adminMiddleware.ts.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware (edge runtime compatible)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie on request for this middleware chain
          request.cookies.set({
            name,
            value,
            ...options,
          });
          // Set cookie on response for browser
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check for auth-token cookie (our custom session token)
  const authToken = request.cookies.get('auth-token')?.value;
  const refreshToken = request.cookies.get('auth-refresh-token')?.value;

  // BUG-AUTH-COOKIE-SESSION Fix: Restore session from custom cookies
  // Supabase expects sb-xxx-auth-token but we use custom names.
  // Call setSession() to restore session - this also handles token refresh.
  if (authToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken || '',
    });

    // If tokens were refreshed, update our custom cookies
    if (sessionData?.session) {
      const newAccessToken = sessionData.session.access_token;
      const newRefreshToken = sessionData.session.refresh_token;

      // Update cookies if tokens changed (were refreshed)
      if (newAccessToken && newAccessToken !== authToken) {
        request.cookies.set({
          name: 'auth-token',
          value: newAccessToken,
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set('auth-token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 2592000, // 30 days
        });
      }
      if (newRefreshToken && newRefreshToken !== refreshToken) {
        request.cookies.set({
          name: 'auth-refresh-token',
          value: newRefreshToken,
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        response.cookies.set('auth-refresh-token', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 2592000, // 30 days
        });
      }
    }
  }

  // For non-admin routes, session restoration is done - return response
  // This allows the route handler to use the restored session
  if (!pathname.startsWith('/admin')) {
    return response;
  }

  // ============================================
  // ADMIN-ONLY PROTECTION BELOW
  // ============================================

  if (!authToken) {
    // No session - redirect to login
    const loginUrl = new URL('/login/start', request.url);
    loginUrl.searchParams.set('message', 'Please log in to access admin pages');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Invalid session - redirect to login
      const loginUrl = new URL('/login/start', request.url);
      loginUrl.searchParams.set('message', 'Session expired. Please log in again.');
      return NextResponse.redirect(loginUrl);
    }

    // Check is_admin flag from users table
    // Note: We use service role via RPC to bypass RLS
    const { data: userData, error: userError } = await supabase.rpc('auth_find_user_by_id', {
      p_user_id: user.id,
    });

    if (userError || !userData || userData.length === 0) {
      // User not found - redirect to dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'User profile not found');
      return NextResponse.redirect(dashboardUrl);
    }

    const userRecord = userData[0];

    if (!userRecord.is_admin) {
      // User is not admin - redirect to dashboard with message
      // Per Loyalty.md line 2365: "Admin access required"
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'Admin access required');
      return NextResponse.redirect(dashboardUrl);
    }

    // Admin verified - allow access
    return response;
  } catch (error) {
    console.error('[Middleware] Error checking admin access:', error);
    // On error, redirect to dashboard for safety
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('error', 'Authentication error');
    return NextResponse.redirect(dashboardUrl);
  }
}

/**
 * Matcher configuration
 * Only run middleware on /admin/* routes
 * Excludes API routes, static files, and images
 */
export const config = {
  matcher: [
    // Protected routes that need session refresh
    // Note: Static assets (/_next/*, images, etc.) are NOT matched - explicit list is safer
    '/admin/:path*',
    '/home/:path*',
    '/home',
    '/missions/:path*',
    '/missions',
    '/rewards/:path*',
    '/rewards',
    '/tiers/:path*',
    '/tiers',
    '/api/user/:path*',
    '/api/missions/:path*',
    '/api/rewards/:path*',
    '/api/auth/user-status',
    '/api/auth/onboarding-info',
    '/api/dashboard',
    '/api/dashboard/featured-mission',
    '/api/tiers',
    '/api/missions',
  ],
};
