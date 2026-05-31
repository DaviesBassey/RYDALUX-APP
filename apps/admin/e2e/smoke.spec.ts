import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Smoke Tests', () => {
  const email = process.env.ADMIN_E2E_EMAIL;
  const password = process.env.ADMIN_E2E_PASSWORD;
  const baseUrl = process.env.ADMIN_E2E_BASE_URL || 'http://localhost:3000';

  test.beforeAll(() => {
    if (!email || !password) {
      console.warn(
        'WARNING: ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD environment variables are not set. Smoke tests may fail if they cannot log in.'
      );
    }
  });

  // Helper function to check page content for typical frontend/client-side error patterns
  async function verifyPageHealth(page: any, path: string) {
    const bodyText = await page.textContent('body');
    
    // 1. Check for blank page/body
    expect(bodyText ? bodyText.trim().length : 0).toBeGreaterThan(0);

    // 2. Check for typical Next.js / frontend errors and server exceptions
    const errorStrings = [
      'Application error',
      'client-side exception',
      'HTTP 500',
      'Failed to load',
      'Cannot GET',
      'Internal Server Error'
    ];

    for (const errorString of errorStrings) {
      if (bodyText && bodyText.includes(errorString)) {
        throw new Error(`Health check failed on path [${path}]: Found error string "${errorString}"`);
      }
    }
  }

  test('Render Login successfully', async ({ page }) => {
    await page.goto('/login');
    // Basic title verification
    await expect(page).toHaveTitle(/Rydalux/i);
    await verifyPageHealth(page, '/login');
  });

  test('Perform login and navigate through dashboard routes', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    
    // Wait for the inputs to be visible
    await page.waitForSelector('#admin-email');
    await page.waitForSelector('#admin-password');

    // Fill credentials
    await page.fill('#admin-email', email || 'admin@rydalux.local');
    await page.fill('#admin-password', password || 'LocalAdminPass123!');
    
    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**');
    await verifyPageHealth(page, '/dashboard');

    // 2. Define the pages to inspect
    const dashboardRoutes = [
      '/dashboard',
      '/dashboard/users',
      '/dashboard/riders',
      '/dashboard/drivers',
      '/dashboard/kyc',
      '/dashboard/vehicles',
      '/dashboard/trips',
      '/dashboard/payments',
      '/dashboard/payouts',
      '/dashboard/ledger',
      '/dashboard/support',
      '/dashboard/safety',
      '/dashboard/audit-logs',
      '/dashboard/settings'
    ];

    // Visit each route sequentially to check health
    for (const route of dashboardRoutes) {
      console.log(`Checking route: ${route}`);
      await page.goto(route);
      
      // Wait for page state (e.g. wait for dynamic client content or simple load state)
      await page.waitForLoadState('networkidle');

      // Verify page is healthy and has content
      await verifyPageHealth(page, route);
    }
  });
});
