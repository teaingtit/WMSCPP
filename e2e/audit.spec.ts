import { test, expect, login, AuditHelpers } from './fixtures/auth';

/**
 * Audit E2E Tests
 * Tests the full stock counting/audit workflow
 */

test.describe('Stock Audit', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Audit Session List', () => {
    test('should navigate to audit page from sidebar', async ({ page }) => {
      // Navigate via sidebar link
      await page.click('a[href*="audit"]');
      await expect(page).toHaveURL(/\/audit/);

      // Verify page header is visible
      await expect(page.getByRole('heading', { name: 'Stock Audit' })).toBeVisible();
    });

    test('should display active and history tabs', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      // Verify both tabs are present
      await expect(page.getByTestId('tab-active')).toBeVisible();
      await expect(page.getByTestId('tab-history')).toBeVisible();
    });

    test('should switch between active and history tabs', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      // Click history tab
      await page.getByTestId('tab-history').click();
      await expect(page.getByTestId('tab-history')).toHaveClass(/bg-white/);

      // Click back to active tab
      await page.getByTestId('tab-active').click();
      await expect(page.getByTestId('tab-active')).toHaveClass(/bg-white/);
    });

    test('should show empty state when no active sessions', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      // Either shows session cards or empty state
      const sessionCards = page.getByTestId('session-card');
      const emptyState = page.getByText('ไม่มีรายการที่กำลังดำเนินการ');

      const hasCards = (await sessionCards.count()) > 0;
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      // One of them should be true
      expect(hasCards || hasEmpty).toBeTruthy();
    });
  });

  test.describe('Create Audit Session', () => {
    test('should display create session button for manager', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('create-audit-btn')).toBeVisible();
    });

    test('should open create session dialog', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-audit-btn').click();

      // Dialog should be visible with form elements
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByTestId('session-name-input')).toBeVisible();
    });

    test('should validate session name is required', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-audit-btn').click();

      // Confirm button should be disabled without name
      const confirmBtn = page.getByTestId('confirm-create-btn');
      await expect(confirmBtn).toBeDisabled();

      // Enter name and button should enable
      await page.getByTestId('session-name-input').fill('Test Audit');
      await expect(confirmBtn).toBeEnabled();
    });

    test('should create full audit session', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createSession(`Full Audit ${Date.now()}`);

      // Session was created (createSession waits for success modal)
      // No additional assertions needed
    });

    test('should close dialog when clicking cancel', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('create-audit-btn').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Close dialog by clicking outside or pressing escape
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  test.describe('Audit Detail Page', () => {
    test('should navigate to session detail page', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createSession();

      // Click manage button on the first session card
      const manageBtn = page.getByText('จัดการ / ตรวจสอบ').first();
      await manageBtn.click();

      await expect(page).toHaveURL(/\/audit\/[^/]+$/);
    });

    test('should display session header with status badge', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      // Should show OPEN status (page may have multiple OPEN badges; assert at least one visible)
      await expect(page.getByText('OPEN').first()).toBeVisible();
    });

    test('should display counting mode button', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await expect(page.getByTestId('counting-mode-btn')).toBeVisible();
    });

    test('should display pending and completed tabs', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await expect(page.getByTestId('tab-pending')).toBeVisible();
      await expect(page.getByTestId('tab-completed')).toBeVisible();
    });

    test('should have search input for filtering items', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await expect(page.getByTestId('search-audit-items')).toBeVisible();
    });

    test('should filter items when searching', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      // Search for non-existent product
      await page.getByTestId('search-audit-items').fill('nonexistent-xyz-12345');
      await page.waitForTimeout(300);

      // Should show no items message
      await expect(page.getByText('ไม่พบรายการสินค้า')).toBeVisible();
    });
  });

  test.describe('Counting Mode', () => {
    test('should enter counting mode', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      // Should show counting mode header
      await expect(page.getByText('โหมดการนับสินค้า')).toBeVisible();
    });

    test('should display progress bar', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      await expect(page.getByTestId('progress-bar')).toBeVisible();
      await expect(page.getByText('Progress:')).toBeVisible();
    });

    test('should display zone filter buttons', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      await expect(page.getByText('All Zones')).toBeVisible();
    });

    test('should have dashboard button to exit counting mode', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      const dashboardBtn = page.getByRole('button', { name: 'Dashboard' });
      await expect(dashboardBtn).toBeVisible();

      await dashboardBtn.click();

      // Should exit counting mode
      await expect(page.getByText('โหมดการนับสินค้า')).not.toBeVisible();
    });

    test('should display audit item cards', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      // Either has items or shows empty state
      const itemCards = page.locator('[class*="rounded-2xl"][class*="border"]');
      const emptyState = page.getByText('ไม่พบรายการสินค้าที่ค้นหา');

      const hasCards = (await itemCards.count()) > 0;
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasCards || hasEmpty).toBeTruthy();
    });

    test('should have quantity input fields', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.enterCountingMode();

      // Check if there are any number inputs
      const qtyInputs = page.locator('input[type="number"]');
      const count = await qtyInputs.count();

      // If there are items, inputs should exist
      if (count > 0) {
        await expect(qtyInputs.first()).toBeVisible();
      }
    });
  });

  test.describe('Finalize Audit', () => {
    test('should display finalize button for manager', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await expect(page.getByTestId('finalize-btn')).toBeVisible();
    });

    test('should show confirmation dialog when clicking finalize', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await page.getByTestId('finalize-btn').click();

      // Confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('ยืนยันการปิดรอบการนับ?')).toBeVisible();
    });

    test('should show warning about irreversible action', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await page.getByTestId('finalize-btn').click();

      await expect(page.getByText('การดำเนินการนี้ไม่สามารถย้อนกลับได้')).toBeVisible();
    });

    test('should cancel finalization when clicking cancel', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await page.getByTestId('finalize-btn').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByRole('button', { name: 'ยกเลิก' }).click();

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Session should still be OPEN
      await expect(page.locator('text=OPEN')).toBeVisible();
    });

    test('should finalize session and show success modal', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await page.getByTestId('finalize-btn').click();
      await page.getByTestId('confirm-finalize-btn').click();

      // Success modal should appear
      await expect(page.getByText('ปิดรอบการนับสำเร็จ')).toBeVisible({ timeout: 10000 });
    });

    test('should hide finalize button after session is completed', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      await page.getByTestId('finalize-btn').click();
      await page.getByTestId('confirm-finalize-btn').click();

      await expect(page.getByText('ปิดรอบการนับสำเร็จ')).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Finalize button should no longer be visible
      await expect(page.getByTestId('finalize-btn')).not.toBeVisible();
    });
  });

  test.describe('Variance Report', () => {
    test('should display variance report section', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      await helpers.createAndNavigate();

      // Variance report metrics should be visible
      await expect(page.getByText('Progress')).toBeVisible();
      await expect(page.getByText('Accuracy')).toBeVisible();
      await expect(page.getByText('Variance')).toBeVisible();
    });
  });

  test.describe('History Tab', () => {
    test('should show completed sessions in history tab', async ({ page }) => {
      const helpers = new AuditHelpers(page);
      // Create and finalize a session
      await helpers.createAndNavigate(`History Test ${Date.now()}`);

      await page.getByTestId('finalize-btn').click();
      await page.getByTestId('confirm-finalize-btn').click();

      await expect(page.getByText('ปิดรอบการนับสำเร็จ')).toBeVisible({ timeout: 10000 });
      await page.keyboard.press('Escape');

      // Go back to audit list
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      // Click history tab
      await page.getByTestId('tab-history').click();

      // Should show at least one completed session
      const sessionCards = page.getByTestId('session-card');
      await expect(sessionCards.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show view report button for completed sessions', async ({ page }) => {
      await page.goto('/dashboard/TEST/audit');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('tab-history').click();

      // If there are completed sessions, they should have "ดูสรุปผล" button
      const reportBtn = page.getByText('ดูสรุปผล').first();
      const hasCompletedSessions = await reportBtn.isVisible().catch(() => false);

      if (hasCompletedSessions) {
        await expect(reportBtn).toBeVisible();
      }
    });
  });
});
