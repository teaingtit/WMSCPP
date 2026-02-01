import { test as base, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const TEST_EMAIL = 'test_e2e@example.com';
export const TEST_PASSWORD = 'password123';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let userSeeded = false;
let seedResult = false;

/**
 * Seeds the test user in Supabase if not already done.
 * Should be called once before all tests that require authentication.
 */
export async function seedTestUser(): Promise<boolean> {
  if (userSeeded) return seedResult;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Missing Supabase env vars. Skipping user seeding.');
    userSeeded = true;
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Check if test user already exists
    const { data: users } = await supabase.auth.admin.listUsers();
    let existingUser = users?.users?.find((u: { email?: string }) => u.email === TEST_EMAIL);

    if (existingUser) {
      // Clean up existing role entry first
      await supabase.from('user_roles').delete().eq('user_id', existingUser.id);
      // Delete the user
      await supabase.auth.admin.deleteUser(existingUser.id);
      existingUser = undefined;
    }

    // 2. Create fresh test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: 'Test', last_name: 'E2E' },
    });

    if (error) {
      console.warn('Failed to create test user:', error.message);
      userSeeded = true;
      return false;
    }

    if (data.user) {
      // 3. Assign admin role with conflict handling
      const { error: roleError } = await supabase.from('user_roles').upsert(
        {
          user_id: data.user.id,
          role: 'admin',
          is_active: true,
          allowed_warehouses: [],
        },
        { onConflict: 'user_id' },
      );

      if (roleError) {
        console.warn('Role assignment error:', roleError.message);
      }

      // 4. Ensure a test warehouse exists
      const { data: existingWh } = await supabase
        .from('warehouses')
        .select('id')
        .eq('code', 'TEST')
        .single();

      if (!existingWh) {
        const { error: whError } = await supabase.from('warehouses').insert({
          code: 'TEST',
          name: 'Test Warehouse',
          is_active: true,
        });
        if (whError) {
          console.warn('Warehouse creation error:', whError.message);
        }
      }

      userSeeded = true;
      seedResult = true;
      return true;
    }

    userSeeded = true;
    return false;
  } catch (err) {
    console.warn('Seeding failed with exception:', err);
    userSeeded = true;
    return false;
  }
}

/**
 * Logs in with the test user credentials and selects the first warehouse.
 * Assumes the test user has been seeded via seedTestUser().
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible({ timeout: 10000 });
  await submitButton.click();

  // Wait for dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

  // Go to warehouse selection page explicitly
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // Click on the TEST warehouse card (not settings/other links)
  const warehouseCard = page.locator('a[href="/dashboard/TEST"]');
  await expect(warehouseCard).toBeVisible({ timeout: 5000 });
  await warehouseCard.click();

  // Wait for warehouse-specific dashboard
  await expect(page).toHaveURL(/\/dashboard\/TEST/, { timeout: 10000 });
}

/**
 * Helper class for audit-related operations in tests.
 */
export class AuditHelpers {
  constructor(private page: Page) {}

  /**
   * Creates a new audit session and returns to the session detail page.
   */
  async createSession(name?: string): Promise<void> {
    await this.page.goto('/dashboard/TEST/audit');
    await this.page.waitForLoadState('networkidle');

    await this.page.getByTestId('create-audit-btn').click();
    await this.page.getByTestId('session-name-input').fill(name || `E2E Test ${Date.now()}`);
    await this.page.getByTestId('confirm-create-btn').click();

    // Wait for success modal and close it
    await expect(this.page.getByText('เปิดรอบการนับสำเร็จ')).toBeVisible({ timeout: 10000 });
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Creates a session and navigates to its detail page.
   */
  async createAndNavigate(name?: string): Promise<void> {
    await this.createSession(name);
    await this.page.getByText('จัดการ / ตรวจสอบ').first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Creates a session and enters counting mode.
   */
  async enterCountingMode(name?: string): Promise<void> {
    await this.createAndNavigate(name || `Count Test ${Date.now()}`);
    await this.page.getByTestId('counting-mode-btn').click();
    await this.page.waitForTimeout(300);
  }
}

// Worker-scoped fixtures type
type WorkerFixtures = {
  userReady: boolean;
};

// Test-scoped fixtures type
type TestFixtures = {
  /** Page that is already logged in and in TEST warehouse */
  authenticatedPage: Page;
  /** Audit helper utilities */
  auditHelpers: AuditHelpers;
};

/**
 * Extended test fixture with authentication support.
 * Automatically seeds the test user before tests run.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  userReady: [
    async ({}, use) => {
      const ready = await seedTestUser();
      await use(ready);
    },
    { scope: 'worker', auto: true },
  ],

  authenticatedPage: async ({ page, userReady }, use) => {
    if (!userReady) {
      throw new Error('Test user not seeded');
    }
    await login(page);
    await use(page);
  },

  auditHelpers: async ({ page, userReady }, use) => {
    if (!userReady) {
      throw new Error('Test user not seeded');
    }
    await login(page);
    await use(new AuditHelpers(page));
  },
});

export { expect };
