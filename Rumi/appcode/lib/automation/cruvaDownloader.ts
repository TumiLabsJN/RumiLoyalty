/**
 * CRUVA CSV Downloader
 *
 * Puppeteer automation to download videos.csv from CRUVA platform.
 *
 * References:
 * - Loyalty.md lines 73-83 (CRUVA TikTok Analytics Platform)
 * - Loyalty.md line 120 (Puppeteer headless Chrome)
 * - Loyalty.md lines 425-431 (Flow 1: Download CSV from CRUVA)
 * - EXECUTION_PLAN.md Task 8.2.0a
 *
 * Environment Variables Required:
 * - CRUVA_LOGIN_URL: Login page URL (e.g., https://cruva.com/signin)
 * - CRUVA_USERNAME: Email for CRUVA authentication
 * - CRUVA_PASSWORD: Password for CRUVA authentication
 *
 * 4-Step Workflow:
 * 1. Launch headless Chrome
 * 2. Navigate to CRUVA_LOGIN_URL and authenticate
 * 3. Navigate to Dashboard > My Videos page
 * 4. Trigger CSV download and save videos.csv
 */

import puppeteer, { Browser } from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';

// Selectors for CRUVA UI elements
const SELECTORS = {
  emailInput: '#email',
  passwordInput: '#password',
  loginButton: 'button[type="submit"]',
  exportButton: 'button:has-text("Export to CSV")', // Puppeteer doesn't support :has-text, will use XPath
};

// CRUVA URLs (relative paths, base URL from env)
const CRUVA_PATHS = {
  videos: '/dashboard/videos',
};

// Download directory
const DOWNLOAD_DIR = '/tmp';
const CSV_FILENAME = 'videos.csv';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  attempts: number;
}

/**
 * Downloads videos.csv from CRUVA platform
 *
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns DownloadResult with file path or error
 */
export async function downloadCruvaCSV(maxRetries: number = 3): Promise<DownloadResult> {
  // Validate environment variables
  const loginUrl = process.env.CRUVA_LOGIN_URL;
  const username = process.env.CRUVA_USERNAME;
  const password = process.env.CRUVA_PASSWORD;

  if (!loginUrl) {
    return {
      success: false,
      error: 'CRUVA_LOGIN_URL environment variable is not configured',
      attempts: 0,
    };
  }

  if (!username || !password) {
    return {
      success: false,
      error: 'CRUVA_USERNAME or CRUVA_PASSWORD environment variable is not configured',
      attempts: 0,
    };
  }

  let lastError: string = '';
  let attempts = 0;

  // Retry loop
  while (attempts < maxRetries) {
    attempts++;
    console.log(`[CruvaDownloader] Attempt ${attempts}/${maxRetries}`);

    let browser: Browser | null = null;

    try {
      // Step 1: Launch headless Chrome
      console.log('[CruvaDownloader] Step 1: Launching headless Chrome...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Configure download behavior
      const client = await page.createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_DIR,
      });

      // Set reasonable timeout
      page.setDefaultTimeout(30000);

      // Step 2: Navigate to login page and authenticate
      console.log('[CruvaDownloader] Step 2: Navigating to login page...');
      await page.goto(loginUrl, { waitUntil: 'networkidle2' });

      // Fill login form
      console.log('[CruvaDownloader] Filling login credentials...');
      await page.waitForSelector(SELECTORS.emailInput);
      await page.waitForSelector(SELECTORS.passwordInput);

      // Click fields before typing and add delay for reliability
      const emailField = await page.$(SELECTORS.emailInput);
      const passwordField = await page.$(SELECTORS.passwordInput);

      if (emailField) {
        await emailField.click();
        await emailField.type(username, { delay: 50 });
      }

      if (passwordField) {
        await passwordField.click();
        await passwordField.type(password, { delay: 50 });
      }

      // Click login button and wait for navigation
      console.log('[CruvaDownloader] Submitting login form...');
      const submitButton = await page.$(SELECTORS.loginButton);
      if (submitButton) {
        await submitButton.click();
      }

      // Wait for navigation (with timeout fallback)
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        console.log('[CruvaDownloader] Navigation timeout - checking current state...');
      });

      // Small delay to ensure page state is settled
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify login succeeded (check we're not still on signin page)
      const currentUrl = page.url();
      if (currentUrl.includes('/signin')) {
        throw new Error('Login failed - still on signin page. Check credentials.');
      }
      console.log('[CruvaDownloader] Login successful');

      // Step 3: Navigate to Dashboard > My Videos
      console.log('[CruvaDownloader] Step 3: Navigating to My Videos page...');
      const baseUrl = new URL(loginUrl).origin;
      const videosUrl = `${baseUrl}${CRUVA_PATHS.videos}`;
      await page.goto(videosUrl, { waitUntil: 'networkidle2' });

      // Verify we're on the videos page
      if (!page.url().includes('/dashboard/videos')) {
        throw new Error('Failed to navigate to videos page');
      }
      console.log('[CruvaDownloader] On My Videos page');

      // Step 4: Trigger CSV download
      console.log('[CruvaDownloader] Step 4: Triggering CSV export...');

      // Find and click the "Export to CSV" button using XPath (Puppeteer doesn't support :has-text)
      const exportButtonXPath = '//button[contains(., "Export to CSV")]';
      await page.waitForSelector('::-p-xpath(' + exportButtonXPath + ')');

      // Remove existing file if present (to detect new download)
      const expectedFilePath = path.join(DOWNLOAD_DIR, CSV_FILENAME);
      if (fs.existsSync(expectedFilePath)) {
        fs.unlinkSync(expectedFilePath);
      }

      // Click export button
      const [exportButton] = await page.$$('::-p-xpath(' + exportButtonXPath + ')');
      if (!exportButton) {
        throw new Error('Export to CSV button not found');
      }
      await exportButton.click();

      // Wait for download to complete (poll for file existence)
      console.log('[CruvaDownloader] Waiting for download to complete...');
      const downloadComplete = await waitForDownload(expectedFilePath, 30000);

      if (!downloadComplete) {
        throw new Error('CSV download timed out');
      }

      console.log(`[CruvaDownloader] Download complete: ${expectedFilePath}`);

      // Close browser
      await browser.close();
      browser = null;

      return {
        success: true,
        filePath: expectedFilePath,
        attempts,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      console.error(`[CruvaDownloader] Attempt ${attempts} failed: ${errorMessage}`);

      // Close browser if still open
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('[CruvaDownloader] Error closing browser:', closeError);
        }
        browser = null;
      }

      // If not last attempt, wait before retry
      if (attempts < maxRetries) {
        const waitTime = attempts * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`[CruvaDownloader] Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
    attempts,
  };
}

/**
 * Waits for a file to exist (polling)
 */
async function waitForDownload(filePath: string, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(filePath)) {
      // Wait a bit more to ensure file is fully written
      await sleep(500);
      // Check file size is > 0
      const stats = fs.statSync(filePath);
      if (stats.size > 0) {
        return true;
      }
    }
    await sleep(pollInterval);
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads the downloaded CSV file as a Buffer
 *
 * @param filePath - Path to the CSV file
 * @returns Buffer containing file contents
 */
export function readCSVBuffer(filePath: string): Buffer {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

/**
 * Cleans up the downloaded CSV file
 *
 * @param filePath - Path to the CSV file to delete
 */
export function cleanupCSV(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`[CruvaDownloader] Cleaned up: ${filePath}`);
  }
}
