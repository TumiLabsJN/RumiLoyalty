/**
 * Jest Setup - Environment Configuration
 *
 * Sets environment variables for local Supabase before any tests run.
 * Required because some services (tierCalculationService, tierRepository)
 * use createAdminClient which reads from process.env.
 *
 * IMPORTANT: This is the ONLY Jest setup file. If adding more setup,
 * add it here rather than creating additional setup files.
 *
 * Credentials are imported from testClient.ts (single source of truth)
 * rather than hardcoded here.
 *
 * References:
 * - BUG-TIER-CALC-SERVICE-CLIENT.md (audit requirement)
 * - tests/helpers/testClient.ts (credential source of truth)
 */

import { TEST_CONFIG } from './helpers/testClient';

// Set environment variables from testClient.ts constants
// This allows createAdminClient() to work in test context
process.env.SUPABASE_URL = TEST_CONFIG.url;
process.env.SUPABASE_ANON_KEY = TEST_CONFIG.anonKey;
process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_CONFIG.serviceRoleKey;
