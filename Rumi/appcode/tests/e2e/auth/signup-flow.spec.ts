import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Signup Flow
 *
 * References:
 * - EXECUTION_PLAN.md Task 3.4.7
 * - API_CONTRACTS.md lines 67-188 (check-handle), 189-437 (signup), 438-592 (verify-otp)
 *
 * Flow tested:
 * 1. Navigate to /login/start
 * 2. Enter TikTok handle, click Continue
 * 3. Fill signup form (email, password, terms checkbox)
 * 4. Click Sign Up
 * 5. Enter OTP digits (uses E2E_TEST_OTP env var)
 * 6. Assert redirect to loading page, then welcome/home
 */

// Fixed OTP for E2E testing (must match E2E_TEST_OTP env var set in server)
const TEST_OTP = '123456';

// Generate unique test data to avoid conflicts
const generateTestData = () => {
  const timestamp = Date.now();
  return {
    handle: `e2etest${timestamp}`,
    email: `e2etest${timestamp}@test.example.com`,
    password: 'TestPassword123!',
  };
};

test.describe('Signup Flow', () => {
  test('complete signup with OTP verification', async ({ page }) => {
    const testData = generateTestData();

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      consoleErrors.push(`Page error: ${error.message}`);
    });

    // Step 1: Navigate to /login/start
    await page.goto('/login/start');

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for React hydration

    // Verify we're on the start page
    await expect(page.getByRole('heading', { name: /let's get started/i })).toBeVisible();

    // Step 2: Enter TikTok handle
    const handleInput = page.locator('input[type="text"]');
    await expect(handleInput).toBeVisible();
    await handleInput.click();
    await handleInput.fill(testData.handle);

    // Wait for React to update state and enable button
    await page.waitForTimeout(500);

    // Click Continue button
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled({ timeout: 5000 });
    await continueButton.click();

    // Step 3: Wait for navigation to signup page
    await page.waitForURL('/login/signup');

    // Verify we're on signup page with welcome message
    await expect(page.getByRole('heading', { name: new RegExp(`welcome.*${testData.handle}`, 'i') })).toBeVisible();

    // Step 4: Fill signup form
    // Email input
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(testData.email);

    // Password input (inside PasswordInput component)
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(testData.password);

    // Terms checkbox
    const termsCheckbox = page.locator('#terms-privacy');
    await termsCheckbox.click();

    // Step 5: Click Sign Up button
    const signupButton = page.getByRole('button', { name: /sign up/i });
    await signupButton.click();

    // Step 6: Wait for navigation to OTP page
    await page.waitForURL('/login/otp', { timeout: 10000 });

    // Verify OTP page loaded
    await expect(page.getByRole('heading', { name: /enter otp code/i })).toBeVisible();

    // Step 7: Enter OTP digits (6 separate inputs)
    const otpInputs = page.locator('input[inputmode="numeric"]');
    await expect(otpInputs).toHaveCount(6);

    // Enter each digit of the OTP
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(TEST_OTP[i]);
    }

    // Step 8: OTP auto-submits after 1 second delay
    // Wait for verification modal to appear
    await expect(page.getByText(/verifying/i)).toBeVisible({ timeout: 3000 });

    // Step 9: Wait for redirect to loading page
    await page.waitForURL('/login/loading', { timeout: 10000 });

    // Step 10: Wait for final redirect (either /home or /login/welcomeunr)
    // The loading page checks user status and redirects accordingly
    await page.waitForURL(/\/(home|login\/welcomeunr)/, { timeout: 15000 });

    // Verify we're on an authenticated page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(home|login\/welcomeunr)/);

    console.log(`✅ Signup flow completed successfully for handle: @${testData.handle}`);
    console.log(`   Final URL: ${currentUrl}`);
  });

  test('existing user with email goes to login page', async ({ page }) => {
    // First, create a user by completing signup flow
    const existingUser = {
      handle: `existing${Date.now()}`,
      email: `existing${Date.now()}@test.example.com`,
      password: 'TestPassword123!',
    };

    // Step 1: Create user via signup
    await page.goto('/login/start');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.locator('input[type="text"]').fill(existingUser.handle);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL('/login/signup');

    await page.locator('input[type="email"]').fill(existingUser.email);
    await page.locator('input[type="password"]').fill(existingUser.password);
    await page.locator('#terms-privacy').click();
    await page.getByRole('button', { name: /sign up/i }).click();

    await page.waitForURL('/login/otp', { timeout: 10000 });

    // Enter OTP (using fixed E2E_TEST_OTP)
    const otpInputs = page.locator('input[inputmode="numeric"]');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(TEST_OTP[i]);
    }

    // Wait for redirect after OTP verification
    await page.waitForURL(/\/(home|login\/welcomeunr|login\/loading)/, { timeout: 15000 });

    // Step 2: Now check if existing user goes to login
    await page.goto('/login/start');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.locator('input[type="text"]').fill(existingUser.handle);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /continue/i }).click();

    // Should redirect to welcome back (login) page since user exists with email
    await page.waitForURL('/login/wb', { timeout: 10000 });

    console.log(`✅ Existing user @${existingUser.handle} redirected to login page`);
  });

  test('invalid OTP shows error message', async ({ page }) => {
    const testData = generateTestData();

    // Complete signup to get to OTP page
    await page.goto('/login/start');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.locator('input[type="text"]').fill(testData.handle);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /continue/i }).click();

    await page.waitForURL('/login/signup');

    await page.locator('input[type="email"]').fill(testData.email);
    await page.locator('input[type="password"]').fill(testData.password);
    await page.locator('#terms-privacy').click();
    await page.getByRole('button', { name: /sign up/i }).click();

    await page.waitForURL('/login/otp', { timeout: 10000 });

    // Enter WRONG OTP (not the E2E_TEST_OTP=123456)
    const otpInputs = page.locator('input[inputmode="numeric"]');
    const wrongOtp = '999999';
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(wrongOtp[i]);
    }

    // Wait for error message after verification fails
    // Error appears in red box with text like "Invalid code" or "Verification failed"
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });

    // Should still be on OTP page (not redirected)
    expect(page.url()).toContain('/login/otp');

    console.log(`✅ Invalid OTP correctly shows error message`);
  });
});
