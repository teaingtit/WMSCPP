import { test, expect, devices } from '@playwright/test';

// Use iPhone 13 emulation for mobile checks
test.use({ ...devices['iPhone 13'] });

const ROUTES = ['/', '/login', '/dashboard', '/dashboard/settings'];

test.describe('mobile rendering', () => {
  for (const route of ROUTES) {
    test(`loads ${route} on mobile`, async ({ page }) => {
      const url = `http://localhost:3000${route}`;
      const messages: string[] = [];

      page.on('console', (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => messages.push(`pageerror: ${err.message}`));

      await page.goto(url, { waitUntil: 'networkidle' });

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
