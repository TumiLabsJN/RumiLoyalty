/**
 * Sync Test: Verifies helper's allowed routes match middleware.ts matcher
 *
 * This test imports from BOTH sources to detect drift:
 * 1. middleware.ts config.matcher - actual routes that run setSession()
 * 2. get-user-id-from-token.ts ALLOWED_PAGE_ROUTES - routes where helper is safe
 *
 * If this test fails, update BOTH files together.
 *
 * References:
 * - HomePageAuthOptimizationEnhancement.md (ENH-010)
 */

import { config as middlewareConfig } from '../../../middleware';
import { ALLOWED_PAGE_ROUTES } from '@/lib/supabase/get-user-id-from-token';

describe('getUserIdFromToken route sync', () => {
  // Source of truth: middleware.ts config.matcher
  const middlewareMatcher = middlewareConfig.matcher as string[];

  // Source of truth: helper's exported constant
  const helperRoutes = ALLOWED_PAGE_ROUTES as readonly string[];

  it('every ALLOWED_PAGE_ROUTE is covered by middleware matcher', () => {
    for (const route of helperRoutes) {
      const isMatched = middlewareMatcher.some(pattern => {
        // Handle exact match: '/home' matches '/home'
        if (pattern === route) return true;
        // Handle wildcard: '/home/:path*' covers '/home'
        if (pattern.startsWith(route + '/') || pattern.startsWith(route + ':')) return true;
        return false;
      });

      expect(isMatched).toBe(true);
    }
  });

  it('every middleware page route is in ALLOWED_PAGE_ROUTES', () => {
    // Filter to only page routes (exclude /api/* routes)
    const pagePatterns = middlewareMatcher.filter(p => !p.startsWith('/api/'));

    for (const pattern of pagePatterns) {
      // Extract base route: '/home/:path*' -> '/home', '/home' -> '/home'
      const baseRoute = '/' + pattern.split('/')[1].replace(/:.*$/, '');

      const isInHelper = helperRoutes.some(
        allowed => baseRoute === allowed || baseRoute.startsWith(allowed + '/')
      );

      expect(isInHelper).toBe(true);
    }
  });
});
