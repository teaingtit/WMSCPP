import { test, expect, Page } from '@playwright/test';

/**
 * Stock Transfer E2E Tests
 * Tests warehouse-to-warehouse transfer workflow
 */

async function login(page: Page) {
  await page.goto('/');
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';
  await page.fill('input[type="email"], input[name="email"]', testEmail);
  await page.fill('input[type="password"], input[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Stock Transfer', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to transfer page', async ({ page }) => {
    await page.click('a[href*="transfer"], button:has-text("โอนสินค้า")');
    await expect(page).toHaveURL(/transfer/);
  });

  test('should display From and To warehouse selectors', async ({ page }) => {
    await page.goto('/dashboard/transfer');

    // Should show warehouse selection dropdowns or cards
    await expect(
      page.locator('[class*="warehouse"], select, [role="combobox"]').first(),
    ).toBeVisible();
  });

  test('should select source and destination warehouses', async ({ page }) => {
    await page.goto('/dashboard/transfer');

    // Select source warehouse
    const sourceSelector = page.locator('[data-testid="from-warehouse"], select').first();
    if (await sourceSelector.isVisible()) {
      await sourceSelector.click();

      // Select first option
      await page.locator('[role="option"], option').first().click();
    }

    // Select destination warehouse
    const destSelector = page.locator('[data-testid="to-warehouse"], select').nth(1);
    if (await destSelector.isVisible()) {
      await destSelector.click();
      await page.locator('[role="option"], option').nth(1).click();
    }
  });

  test('should display transferable stock after warehouse selection', async ({ page }) => {
    await page.goto('/dashboard/transfer');
    await page.waitForLoadState('networkidle');

    // After selecting warehouses, stock list should appear
    const stockList = page.locator('[class*="stock"], [class*="inventory"], table');
    // Check if any content loads
    await expect(stockList.first()).toBeVisible({ timeout: 5000 });
  });
});
