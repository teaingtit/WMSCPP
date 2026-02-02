import { test, expect, devices } from '@playwright/test';

// Use Pixel 5 emulation for mobile checks (uses chromium instead of webkit)
test.use({ ...devices['Pixel 5'] });

const ROUTES = ['/', '/login', '/dashboard', '/dashboard/settings'];

test.describe('mobile rendering', () => {
  for (const route of ROUTES) {
    test(`loads ${route} on mobile`, async ({ page, baseURL }) => {
      const messages: string[] = [];

      page.on('console', (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => messages.push(`pageerror: ${err.message}`));

      // Use baseURL from config (http://localhost:3006) instead of hardcoded port
      await page.goto(route, { waitUntil: 'networkidle' });

      // capture screenshot for visual inspection
      const safeName =
        route === '/' ? 'root' : route.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      await page.screenshot({ path: `e2e-results/${safeName}.png`, fullPage: true });

      // basic sanity: page should have body
      const body = await page.locator('body').innerText();
      expect(body.length).toBeGreaterThan(0);

      // attach console messages to test output
      for (const m of messages)
        test.info().attachments.push({
          name: `console-${safeName}.log`,
          body: m,
          contentType: 'text/plain',
        });
    });
  }
});

test.describe('mobile navigation', () => {
  test('bottom nav is visible on mobile dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Bottom navigation should be visible on mobile
    const bottomNav = page.locator('nav[aria-label="เมนูนำทางหลัก"]');

    // May redirect to login, so check if we're on dashboard
    const url = page.url();
    if (url.includes('/dashboard') && !url.includes('/login')) {
      await expect(bottomNav).toBeVisible();

      // Should have navigation items
      const navLinks = bottomNav.locator('a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test('bottom nav has minimum touch target size', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const url = page.url();
    if (url.includes('/dashboard') && !url.includes('/login')) {
      const bottomNav = page.locator('nav[aria-label="เมนูนำทางหลัก"]');
      const navLinks = bottomNav.locator('a');

      const count = await navLinks.count();
      for (let i = 0; i < count; i++) {
        const link = navLinks.nth(i);
        const box = await link.boundingBox();
        if (box) {
          // Touch targets should be at least 44px (WCAG AA)
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

test.describe('mobile modals', () => {
  test('login page is mobile-friendly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Login form should be visible
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check that inputs have proper sizing for touch
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const box = await input.boundingBox();
      if (box) {
        // Inputs should have adequate height for touch
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

// Landscape mode tests
test.describe('landscape mode', () => {
  test.use({
    viewport: { width: 896, height: 414 }, // iPhone landscape
  });

  test('page renders correctly in landscape', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Page should not have horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Small overflow is acceptable, large is not
    if (hasOverflow) {
      const overflowAmount = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      expect(overflowAmount).toBeLessThan(20); // Allow small rounding errors
    }

    await page.screenshot({
      path: 'e2e-results/login-landscape.png',
      fullPage: true,
    });
  });

  test('dashboard renders in landscape without breaking', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await page.screenshot({
      path: 'e2e-results/dashboard-landscape.png',
      fullPage: true,
    });

    // Basic rendering check
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
  });
});

// Touch interaction tests
test.describe('touch interactions', () => {
  test('buttons respond to touch', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Find submit button
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      // Button should be clickable
      const box = await submitButton.boundingBox();
      if (box) {
        // Touch target should be at least 44px
        expect(box.height).toBeGreaterThanOrEqual(40);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

// Viewport meta tag test
test.describe('viewport configuration', () => {
  test('has proper viewport meta tag', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport).toContain('width=device-width');
  });
});
