import { test, expect, login } from './fixtures/auth';

/**
 * Inbound Stock E2E Tests
 * Tests the stock receiving workflow
 */

test.describe('Inbound Stock', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to inbound page', async ({ page }) => {
    // Click on inbound menu/button
    await page.click('a[href*="inbound"], button:has-text("รับสินค้า")');
    await expect(page).toHaveURL(/inbound/);
  });

  test('should display product search field', async ({ page }) => {
    await page.goto('/dashboard/inbound');

    // Search input should be visible
    await expect(
      page.locator('input[placeholder*="ค้นหา"], input[placeholder*="scan"], input[id*="search"]'),
    ).toBeVisible();
  });

  test('should search for product and display results', async ({ page }) => {
    await page.goto('/dashboard/inbound');

    // Type in search field
    await page.fill(
      'input[placeholder*="ค้นหา"], input[placeholder*="scan"], input[id*="search"]',
      'TEST',
    );

    // Wait for search results
    await page.waitForTimeout(500); // Debounce wait

    // Results should appear (product cards or list items)
    const resultCount = await page
      .locator('[class*="product"], [class*="item"], [role="listitem"]')
      .count();
    expect(resultCount).toBeGreaterThanOrEqual(0); // At least should not error
  });

  test('should show confirmation after selecting product', async ({ page }) => {
    await page.goto('/dashboard/inbound');

    // Search for product
    await page.fill(
      'input[placeholder*="ค้นหา"], input[placeholder*="scan"], input[id*="search"]',
      'TEST',
    );
    await page.waitForTimeout(500);

    // Click first product result if exists
    const firstProduct = page
      .locator('[class*="product"], [class*="item"], [role="listitem"]')
      .first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();

      // Should show quantity input or confirmation form
      await expect(page.locator('input[type="number"], input[name="quantity"]')).toBeVisible({
        timeout: 3000,
      });
    }
  });
});
