import { test, expect, Page } from '@playwright/test';

/**
 * Outbound Stock E2E Tests
 * Tests the stock dispatch workflow
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

test.describe('Outbound Stock', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to outbound page', async ({ page }) => {
    await page.click('a[href*="outbound"], button:has-text("จ่ายสินค้า")');
    await expect(page).toHaveURL(/outbound/);
  });

  test('should display stock listing', async ({ page }) => {
    await page.goto('/dashboard/outbound');

    // Should show inventory or stock table
    await expect(page.locator('table, [class*="inventory"], [class*="stock-list"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should select stock item for outbound', async ({ page }) => {
    await page.goto('/dashboard/outbound');

    // Click on first stock item
    const stockItem = page.locator('tr, [class*="stock-item"], [class*="inventory-item"]').first();
    if (await stockItem.isVisible()) {
      await stockItem.click();

      // Should show outbound form or quantity selector
      await expect(page.locator('input[type="number"], button:has-text("ยืนยัน")')).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test('should validate quantity on outbound', async ({ page }) => {
    await page.goto('/dashboard/outbound');

    const stockItem = page.locator('tr, [class*="stock-item"]').first();
    if (await stockItem.isVisible()) {
      await stockItem.click();

      // Try to enter invalid quantity
      const qtyInput = page.locator('input[type="number"], input[name="quantity"]');
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('-1');
        await page.click('button[type="submit"], button:has-text("ยืนยัน")');

        // Should show validation error
        await expect(page.locator('[class*="error"], [role="alert"]')).toBeVisible({
          timeout: 3000,
        });
      }
    }
  });
});
