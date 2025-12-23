/**
 * Cron Warmup Route
 *
 * Keeps serverless functions and Supabase connections warm.
 * Runs every 2 minutes via Vercel cron.
 *
 * References:
 * - CronWarmupEnhancement.md (ENH-011)
 * - cronAuth.ts lines 45-57 (withCronAuth expects Authorization: Bearer header)
 * - Vercel Cron Docs: Vercel auto-injects Authorization: Bearer ${CRON_SECRET}
 *
 * Security:
 * - Protected by CRON_SECRET (withCronAuth validates Bearer token)
 * - Uses anon client for signIn (respects RLS, standard auth flow)
 * - Warmup user must exist in public.users with correct client_id
 */

import { NextResponse } from 'next/server';
import { withCronAuth } from '@/lib/utils/cronAuth';
import { createClient } from '@supabase/supabase-js';

// Pages to warm up - auth-protected pages need session cookies
const PROTECTED_PAGES = [
  '/home',
  '/missions',
  '/missions/missionhistory',
  '/rewards',
  '/rewards/rewardshistory',
  '/tiers',
];

// Public pages - no auth needed, but still warm the serverless functions
const PUBLIC_PAGES = [
  '/login/start',
  '/login/signup',
  '/login/otp',
  '/login/forgotpw',
  '/login/resetpw',
  '/login/loading',
  '/login/wb',
  '/login/welcomeunr',
];

interface WarmupResult {
  page: string;
  status: number;
  timeMs: number;
  error?: string;
}

export const GET = withCronAuth(async () => {
  const timestamp = new Date().toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl) {
    console.error('[Warmup] NEXT_PUBLIC_SITE_URL not configured');
    return NextResponse.json({
      success: false,
      error: 'NEXT_PUBLIC_SITE_URL not configured',
      timestamp,
    }, { status: 500 });
  }

  console.log(`[Warmup] Starting warmup at ${timestamp}`);

  // Step 1: Authenticate as warmup user using ANON client
  // Uses anon key to respect RLS and standard auth flow (not service-role)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Warmup] Supabase URL or Anon Key not configured');
    return NextResponse.json({
      success: false,
      error: 'Supabase configuration missing',
      timestamp,
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const warmupEmail = process.env.WARMUP_USER_EMAIL;
  const warmupPassword = process.env.WARMUP_USER_PASSWORD;

  if (!warmupEmail || !warmupPassword) {
    console.error('[Warmup] WARMUP_USER_EMAIL or WARMUP_USER_PASSWORD not configured');
    return NextResponse.json({
      success: false,
      error: 'WARMUP_USER_EMAIL or WARMUP_USER_PASSWORD not configured',
      timestamp,
    }, { status: 500 });
  }

  // Sign in to get session tokens
  const t0 = Date.now();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: warmupEmail,
    password: warmupPassword,
  });
  console.log(`[Warmup] Auth signIn: ${Date.now() - t0}ms`);

  if (authError || !authData.session) {
    console.error('[Warmup] Auth failed:', authError?.message);
    return NextResponse.json({
      success: false,
      error: `Auth failed: ${authError?.message}`,
      timestamp,
    }, { status: 500 });
  }

  // Use correct cookie names that middleware expects (middleware.ts:80-82)
  const accessToken = authData.session.access_token;
  const refreshToken = authData.session.refresh_token;
  const cookieHeader = `auth-token=${accessToken}; auth-refresh-token=${refreshToken}`;

  const results: WarmupResult[] = [];

  // Step 2: Warm protected pages (with auth cookies)
  for (const page of PROTECTED_PAGES) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        headers: {
          Cookie: cookieHeader,
        },
        cache: 'no-store',
      });
      results.push({
        page,
        status: response.status,
        timeMs: Date.now() - start,
      });
      console.log(`[Warmup] ${page}: ${response.status} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        page,
        status: 0,
        timeMs: Date.now() - start,
        error: errorMsg,
      });
      console.error(`[Warmup] ${page}: ERROR - ${errorMsg}`);
    }
  }

  // Step 3: Warm public pages (no auth needed)
  for (const page of PUBLIC_PAGES) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        cache: 'no-store',
      });
      results.push({
        page,
        status: response.status,
        timeMs: Date.now() - start,
      });
      console.log(`[Warmup] ${page}: ${response.status} (${Date.now() - start}ms)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        page,
        status: 0,
        timeMs: Date.now() - start,
        error: errorMsg,
      });
      console.error(`[Warmup] ${page}: ERROR - ${errorMsg}`);
    }
  }

  // Step 4: Sign out to clean up session
  await supabase.auth.signOut();

  // Calculate summary
  const successful = results.filter(r => r.status >= 200 && r.status < 400).length;
  const failed = results.filter(r => r.status === 0 || r.status >= 400).length;
  const totalTimeMs = results.reduce((sum, r) => sum + r.timeMs, 0);
  const avgTimeMs = results.length > 0 ? Math.round(totalTimeMs / results.length) : 0;

  console.log(`[Warmup] Complete: ${successful}/${results.length} pages, avg ${avgTimeMs}ms, total ${totalTimeMs}ms`);

  return NextResponse.json({
    success: failed === 0,
    message: `Warmup complete: ${successful}/${results.length} pages warmed`,
    data: {
      pagesWarmed: successful,
      pagesFailed: failed,
      avgTimeMs,
      totalTimeMs,
      results,
    },
    timestamp,
  }, { status: failed === 0 ? 200 : 207 });
});
