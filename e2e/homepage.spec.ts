import { test, expect } from '@playwright/test';

test('homepage smoke', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/WMS/i);
});
