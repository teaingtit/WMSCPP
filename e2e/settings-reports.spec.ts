import { test, expect, login } from './fixtures/auth';

test.describe('Settings - Report Schedules', () => {
  test.beforeEach(async ({ page, userReady }) => {
    test.skip(!userReady, 'Test user not seeded');
    await login(page);
  });

  test('should open settings and show reports tab', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /System Configuration/i })).toBeVisible({
      timeout: 10000,
    });

    const reportsTab = page.getByRole('tab', { name: /รายงานอัตโนมัติ/ });
    await expect(reportsTab).toBeVisible({ timeout: 5000 });
    await reportsTab.click();

    await expect(page.getByText('รายงานอัตโนมัติ', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('button', { name: /เพิ่มกำหนดการ/ })).toBeVisible({
      timeout: 5000,
    });
  });

  test('should show warehouse selector and report section in reports tab', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const reportsTab = page.getByRole('tab', { name: /รายงานอัตโนมัติ/ });
    await reportsTab.click();

    await expect(page.getByLabel(/เลือกคลังสินค้า|คลัง/)).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/ตั้งค่าการส่งรายงานทางอีเมลตามกำหนด/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });
});
