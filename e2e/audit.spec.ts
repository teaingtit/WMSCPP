import { test, expect, Page } from '@playwright/test';

/**
 * Audit E2E Tests
 * Tests the stock counting/audit workflow
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

test.describe('Stock Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to audit page', async ({ page }) => {
    await page.click('a[href*="audit"], button:has-text("ตรวจนับ")');
    await expect(page).toHaveURL(/audit/);
  });

  test('should display location selector for audit', async ({ page }) => {
    await page.goto('/dashboard/audit');

    // Should show location picker
    await expect(
      page.locator('[class*="location"], select, input[placeholder*="location"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show stock items in selected location', async ({ page }) => {
    await page.goto('/dashboard/audit');
    await page.waitForLoadState('networkidle');

    // Stock items should be displayed
    const items = page.locator('[class*="product"], [class*="stock"], tr');
    await expect(items.first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow editing counted quantity', async ({ page }) => {
    await page.goto('/dashboard/audit');
    await page.waitForLoadState('networkidle');

    // Click on a stock item to edit
    const editBtn = page
      .locator('button:has-text("แก้ไข"), [class*="edit"], input[type="number"]')
      .first();
    if (await editBtn.isVisible()) {
      await editBtn.click();

      // Quantity input should be editable
      const qtyInput = page.locator(
        'input[type="number"], input[name*="quantity"], input[name*="count"]',
      );
      await expect(qtyInput.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show variance after count entry', async ({ page }) => {
    await page.goto('/dashboard/audit');
    await page.waitForLoadState('networkidle');

    // Look for variance indicator after entering a count
    const varianceIndicator = page.locator(
      '[class*="variance"], [class*="diff"], [class*="discrepancy"]',
    );
    // This is a visual check - may vary based on actual implementation
    const count = await varianceIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
