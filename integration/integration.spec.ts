import { test, expect, login, AuditHelpers } from '../e2e/fixtures/auth';

/**
 * Full Integration E2E Test
 *
 * Exercises the complete critical user flow as defined in ARCHITECTURE.md:
 * Login → Inbound → Outbound (with Transfer and Audit)
 *
 * Run separately from e2e for speed: npm run test:integration
 */

const TEST_WAREHOUSE = 'TEST';
const BASE = `/dashboard/${TEST_WAREHOUSE}`;

test.describe('Full Integration Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('complete user journey: login → inventory → inbound → outbound → transfer → audit → logout', async ({
    page,
    userReady,
  }) => {
    test.skip(!userReady, 'Skipping integration test because test user could not be created');

    // ========== 1. Login ==========
    await page.goto('/');
    await page.fill('input[type="email"], input[name="email"]', 'test_e2e@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    // ========== 2. Select Warehouse ==========
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const warehouseCard = page.locator('a[href="/dashboard/TEST"]');
    await expect(warehouseCard).toBeVisible({ timeout: 5000 });
    await warehouseCard.click();
    await expect(page).toHaveURL(/\/dashboard\/TEST/, { timeout: 10000 });

    // ========== 3. Inventory (Dashboard) ==========
    await page.goto(`${BASE}/inventory`);
    await expect(page).toHaveURL(/inventory/);
    await page.waitForLoadState('networkidle');
    const inventoryContent = page.locator(
      'table, [class*="inventory"], [class*="stock"], h1, [role="main"]',
    );
    await expect(inventoryContent.first()).toBeVisible({ timeout: 5000 });

    // ========== 4. Inbound ==========
    await page.goto(`${BASE}/inbound`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/inbound/);
    const inboundContent = page.locator(
      'h1:has-text("รับสินค้า"), [class*="BulkInbound"], a[href*="inbound/"], .rounded-2xl',
    );
    await expect(inboundContent.first()).toBeVisible({ timeout: 5000 });

    // ========== 5. Outbound ==========
    await page.goto(`${BASE}/outbound`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/outbound/);
    const outboundContent = page.locator(
      'input[placeholder*="ค้นหา"], input[placeholder*="scan"], [class*="outbound"], [class*="queue"]',
    );
    await expect(outboundContent.first()).toBeVisible({ timeout: 5000 });

    // ========== 6. Transfer ==========
    await page.goto(`${BASE}/transfer`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/transfer/);
    const transferContent = page.locator(
      'button:has-text("INTERNAL"), button:has-text("CROSS"), [class*="transfer"], [class*="warehouse"]',
    );
    await expect(transferContent.first()).toBeVisible({ timeout: 5000 });

    // ========== 7. Audit ==========
    const auditHelpers = new AuditHelpers(page);
    await auditHelpers.createAndNavigate(`Integration ${Date.now()}`);
    await page.getByTestId('counting-mode-btn').click();
    await page.waitForTimeout(300);
    await expect(page.getByText('โหมดการนับสินค้า')).toBeVisible({ timeout: 5000 });
    const dashboardBtn = page.getByRole('button', { name: 'Dashboard' });
    if (await dashboardBtn.isVisible()) {
      await dashboardBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // ========== 8. Logout ==========
    const logoutBtn = page.locator('button[title="Sign Out"]');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();
    await page.waitForLoadState('networkidle');

    const loginInput = page.locator('input[type="email"]');
    const isOnLoginPage = await loginInput.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isOnLoginPage).toBeTruthy();
  });

  test('integration: auth → warehouse selection → all main nav links work', async ({
    page,
    userReady,
  }) => {
    test.skip(!userReady, 'Skipping integration test because test user could not be created');

    await login(page);
    await expect(page).toHaveURL(/\/dashboard\/TEST/);

    const navTargets = [
      { selector: 'a[href*="inventory"]', urlPattern: /inventory/ },
      { selector: 'a[href*="inbound"]', urlPattern: /inbound/ },
      { selector: 'a[href*="outbound"]', urlPattern: /outbound/ },
      { selector: 'a[href*="transfer"]', urlPattern: /transfer/ },
      { selector: 'a[href*="audit"]', urlPattern: /audit/ },
    ];

    for (const { selector, urlPattern } of navTargets) {
      const link = page.locator(selector).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(urlPattern, { timeout: 5000 });
        await page.goto(`${BASE}/inventory`);
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
