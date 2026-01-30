import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TEST_EMAIL = 'test_e2e@example.com';
const TEST_PASSWORD = 'password123';

test.describe('Authentication', () => {
  test.describe.configure({ mode: 'serial' });

  let userCreated = false;

  test.beforeAll(async () => {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Missing Supabase env vars. Skipping user seeding.');
      return;
    }

    try {
      // 1. Clean up existing test user
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users?.users) {
        const existingUser = users.users.find((u) => u.email === TEST_EMAIL);
        if (existingUser) {
          await supabase.auth.admin.deleteUser(existingUser.id);
        }
      }

      // 2. Create fresh test user
      const { data, error } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'E2E' },
      });

      if (error) {
        console.warn('Failed to create test user (Supabase might be unreachable):', error.message);
      } else if (data.user) {
        userCreated = true;
        // 3. Assign Role
        const { error: roleError } = await supabase.from('user_roles').upsert({
          user_id: data.user.id,
          role: 'admin',
          is_active: true,
          allowed_warehouses: [],
        });

        if (roleError) console.warn('Role assignment error:', roleError.message);
      }
    } catch (err) {
      console.warn('Seeding failed with exception:', err);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=ไม่ถูกต้อง, text=Invalid, [role="alert"], .toast')).toBeVisible(
      { timeout: 10000 },
    );
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    test.skip(!userCreated, 'Skipping login test because test user could not be created');

    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });

  test('should logout successfully', async ({ page }) => {
    test.skip(!userCreated, 'Skipping logout test because test user could not be created');

    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    const logoutSelectors = [
      'button:has-text("ออกจากระบบ")',
      '[aria-label="logout"]',
      'button:has-text("Logout")',
      '#logout-button',
    ];

    // Attempt logic to find logout
    // ... same as before
    const avatar = page.locator('.avatar, [data-testid="user-menu"]');
    if (await avatar.isVisible()) {
      await avatar.click();
    }
    const logoutBtn = page.locator(logoutSelectors.join(','));
    await logoutBtn.first().click();

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
