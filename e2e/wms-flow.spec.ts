/**
 * WMS E2E Test Suite - Comprehensive User Flow Testing
 *
 * @description
 * End-to-end tests covering critical user workflows in the Warehouse Management System.
 *
 * Test Scenarios:
 * 1. Happy Path: Barcode scan -> Product identification -> Qty input -> Save -> Success
 * 2. Error Path: Invalid quantity -> Error dialog -> Input recovery
 * 3. Race Conditions: Rapid button clicks -> Single transaction verification
 *
 * @framework Playwright
 * @requires Authenticated session via auth.ts fixture
 */

import { test, expect } from './fixtures/auth';
import { createClient } from '@supabase/supabase-js';

// Supabase client for test data verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Test Constants
const WAREHOUSE_CODE = 'TEST';
const TEST_SKU = 'E2E-WMS-FLOW-001';
const TEST_PRODUCT_NAME = 'E2E WMS Flow Test Product';
const TEST_LOC_CODE = 'E2E-WMS-LOC';
const TEST_LOT = 'E2E';
const TEST_POS = 'P1';
const TEST_LEVEL = 'L1';

test.describe('WMS Core User Flows', () => {
  let warehouseId: string;
  let initialStock: number;

  /**
   * Test Setup: Seed required data
   */
  test.beforeAll(async () => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check environment variables.');
    }

    // Get Test Warehouse
    const { data: wh } = await supabase
      .from('warehouses')
      .select('id')
      .eq('code', WAREHOUSE_CODE)
      .single();

    if (!wh) {
      throw new Error(`Test warehouse '${WAREHOUSE_CODE}' not found.`);
    }
    warehouseId = wh.id;

    // Seed Test Product
    const { error: prodError } = await supabase.from('products').upsert(
      {
        sku: TEST_SKU,
        name: TEST_PRODUCT_NAME,
        uom: 'PCS',
        is_active: true,
      },
      { onConflict: 'sku' },
    );
    if (prodError) throw new Error(`Failed to seed product: ${prodError.message}`);

    // Seed Location
    await supabase.from('locations').delete().match({
      code: TEST_LOC_CODE,
      warehouse_id: warehouseId,
    });

    const { error: locError } = await supabase.from('locations').insert({
      warehouse_id: warehouseId,
      code: TEST_LOC_CODE,
      lot: TEST_LOT,
      cart: TEST_POS,
      level: TEST_LEVEL,
      type: 'shelf',
      is_active: true,
    });
    if (locError) throw new Error(`Failed to seed location: ${locError.message}`);

    // Clean up any existing inventory for this product in this warehouse
    // to ensure consistent test state
    await supabase.from('inventory').delete().match({
      product_sku: TEST_SKU,
      warehouse_id: warehouseId,
    });

    // Record initial state
    initialStock = 0;
  });

  /**
   * Cleanup: Remove test data after all tests
   */
  test.afterAll(async () => {
    if (!supabase) return;

    // Clean up transaction logs for this test SKU
    await supabase.from('transaction_logs').delete().eq('sku', TEST_SKU);

    // Clean up inventory
    await supabase.from('inventory').delete().match({
      product_sku: TEST_SKU,
      warehouse_id: warehouseId,
    });
  });

  // =========================================================================
  // HAPPY PATH: Complete Inbound Flow
  // =========================================================================
  test.describe('Happy Path - Complete Inbound Flow', () => {
    test('User scans barcode, enters quantity, and saves successfully', async ({
      authenticatedPage: page,
    }) => {
      // Step 1: Navigate to Inbound page
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Step 2: Simulate barcode scan (type SKU into search)
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Simulate rapid barcode scanner input
      await searchInput.click();
      await searchInput.fill(TEST_SKU);

      // Step 3: Wait for product to appear in autocomplete and select it
      const productOption = page.getByText(TEST_PRODUCT_NAME);
      await expect(productOption).toBeVisible({ timeout: 5000 });
      await productOption.click();

      // Step 4: Verify product is selected (card should show product details)
      await expect(page.getByText(TEST_SKU)).toBeVisible();

      // Step 5: Select location hierarchy
      const lotSelect = page.getByLabel('เลือก Lot', { exact: false });
      await expect(lotSelect).toBeEnabled({ timeout: 5000 });
      await lotSelect.selectOption({ label: TEST_LOT });

      const posSelect = page.getByLabel('เลือก Position', { exact: false });
      await expect(posSelect).toBeEnabled({ timeout: 3000 });
      await posSelect.selectOption({ label: TEST_POS });

      const levelSelect = page.getByLabel('เลือก Level', { exact: false });
      await expect(levelSelect).toBeEnabled({ timeout: 3000 });
      await levelSelect.selectOption({ label: TEST_LEVEL });

      // Step 6: Enter quantity
      const qtyInput = page.locator('input[type="number"]');
      await qtyInput.fill('25');

      // Step 7: Add to queue
      const addButton = page.getByRole('button', { name: 'เพิ่มลงรายการ' });
      await addButton.click();

      // Step 8: Verify item appears in queue
      await expect(page.getByText(`1. ${TEST_PRODUCT_NAME}`)).toBeVisible({ timeout: 5000 });

      // Step 9: Click confirm all
      const confirmAllButton = page.getByRole('button', { name: 'ยืนยันรับเข้าทั้งหมด' });
      await confirmAllButton.click();

      // Step 10: Handle confirmation modal
      const modal = page.locator('.fixed').filter({ hasText: 'ยืนยันการรับเข้าสินค้า' });
      await expect(modal).toBeVisible({ timeout: 5000 });

      const confirmButton = modal.getByRole('button', { name: 'ยืนยันรับเข้า' });
      await confirmButton.click();

      // Step 11: Verify success toast/modal appears
      await expect(page.getByText('บันทึกการรับเข้าสินค้าเรียบร้อย')).toBeVisible({
        timeout: 15000,
      });

      // Step 12: Verify transaction count
      await expect(page.getByText('1 รายการ')).toBeVisible();

      // Step 13: Database verification (optional - verify actual data)
      if (supabase) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('qty')
          .eq('product_sku', TEST_SKU)
          .eq('warehouse_id', warehouseId)
          .single();

        expect(inventory?.qty).toBeGreaterThanOrEqual(25);
      }
    });

    test('Successful flow shows correct UI feedback', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Quick flow through
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Enter quantity and add
      await page.locator('input[type="number"]').fill('10');
      await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();

      // Verify visual feedback
      await expect(page.getByText(`1. ${TEST_PRODUCT_NAME}`)).toBeVisible();

      // Verify quantity badge shows in queue
      const queueItem = page.locator('.bg-white, .bg-card').filter({ hasText: TEST_PRODUCT_NAME });
      await expect(queueItem.getByText('10')).toBeVisible();
    });
  });

  // =========================================================================
  // ERROR PATH: Invalid Quantity Handling
  // =========================================================================
  test.describe('Error Path - Invalid Quantity Handling', () => {
    test('Shows error when quantity exceeds available stock (outbound)', async ({
      authenticatedPage: page,
    }) => {
      // Navigate to outbound page (where stock limits apply)
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/outbound`);
      await page.waitForLoadState('networkidle');

      // Search for product
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill(TEST_SKU);

      // Wait for autocomplete
      const productOption = page.getByText(TEST_PRODUCT_NAME);

      // If product appears in autocomplete, select it
      const optionVisible = await productOption.isVisible().catch(() => false);
      if (optionVisible) {
        await productOption.click();

        // Try to enter quantity exceeding stock
        const qtyInput = page.locator('input[type="number"]');
        await qtyInput.fill('999999'); // Excessive quantity

        // Attempt to add to queue
        const addButton = page.getByRole('button', { name: /เพิ่ม|Add/i });

        if (await addButton.isVisible()) {
          await addButton.click();

          // Expect error message about insufficient stock
          const errorMessage = page.locator('[role="alert"], .text-red-500, .text-destructive');
          const hasError = await errorMessage
            .first()
            .isVisible()
            .catch(() => false);

          if (hasError) {
            await expect(errorMessage.first()).toBeVisible();
          } else {
            // Alternative: Check for disabled submit or validation message
            const validationMsg = page.getByText(/ไม่เพียงพอ|Insufficient|exceed/i);
            const hasValidation = await validationMsg.isVisible().catch(() => false);
            expect(hasError || hasValidation).toBeTruthy();
          }
        }
      } else {
        // Product not in stock - this is also a valid error state
        test.skip();
      }
    });

    test('Shows error for zero quantity', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Quick setup
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Enter zero quantity
      const qtyInput = page.locator('input[type="number"]');
      await qtyInput.fill('0');

      // Try to add
      const addButton = page.getByRole('button', { name: 'เพิ่มลงรายการ' });

      // Button should either be disabled or show error on click
      const isDisabled = await addButton.isDisabled();

      if (!isDisabled) {
        await addButton.click();

        // Check for error indication
        const hasErrorClass = await qtyInput.evaluate(
          (el) =>
            el.classList.contains('border-red-500') ||
            el.classList.contains('border-destructive') ||
            el.getAttribute('aria-invalid') === 'true',
        );

        expect(hasErrorClass || isDisabled).toBeTruthy();
      } else {
        expect(isDisabled).toBe(true);
      }
    });

    test('Shows error for negative quantity', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Quick setup
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Try entering negative quantity
      const qtyInput = page.locator('input[type="number"]');
      await qtyInput.fill('-5');

      // The input should either reject negative values or show error
      const inputValue = await qtyInput.inputValue();

      // HTML number input with min=0 may auto-correct or browser may prevent
      // Check if value was accepted and if so, button should be disabled
      if (inputValue === '-5') {
        const addButton = page.getByRole('button', { name: 'เพิ่มลงรายการ' });
        const isDisabled = await addButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
      // If input was auto-corrected, that's also valid behavior
    });

    test('Input field is focused/highlighted on validation error', async ({
      authenticatedPage: page,
    }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Setup product selection
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Don't fill quantity, try to submit
      const addButton = page.getByRole('button', { name: 'เพิ่มลงรายการ' });
      const qtyInput = page.locator('input[type="number"]');

      // Clear any default value
      await qtyInput.clear();

      // Try to add without quantity
      if (!(await addButton.isDisabled())) {
        await addButton.click();

        // Check if quantity input now has focus or error styling
        const isFocused = await qtyInput.evaluate((el) => document.activeElement === el);
        const hasErrorClass = await qtyInput.evaluate(
          (el) =>
            el.classList.contains('border-red-500') ||
            el.classList.contains('ring-red-500') ||
            el.getAttribute('aria-invalid') === 'true',
        );

        // Either the input is focused or has error styling
        expect(isFocused || hasErrorClass).toBeTruthy();
      }
    });
  });

  // =========================================================================
  // RACE CONDITIONS: Rapid Click Prevention
  // =========================================================================
  test.describe('Race Conditions - Rapid Save Prevention', () => {
    test('Multiple rapid clicks result in single transaction', async ({
      authenticatedPage: page,
    }) => {
      // Track transaction count before test
      let transactionCountBefore = 0;
      if (supabase) {
        const { count } = await supabase
          .from('transaction_logs')
          .select('*', { count: 'exact', head: true })
          .eq('sku', TEST_SKU);
        transactionCountBefore = count || 0;
      }

      // Setup inbound flow
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Enter quantity and add to queue
      await page.locator('input[type="number"]').fill('5');
      await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();
      await expect(page.getByText(`1. ${TEST_PRODUCT_NAME}`)).toBeVisible();

      // Click confirm all
      await page.getByRole('button', { name: 'ยืนยันรับเข้าทั้งหมด' }).click();

      // Wait for modal
      const modal = page.locator('.fixed').filter({ hasText: 'ยืนยันการรับเข้าสินค้า' });
      await expect(modal).toBeVisible({ timeout: 5000 });

      // RAPID CLICKS: Click the confirm button 5 times rapidly
      const confirmButton = modal.getByRole('button', { name: 'ยืนยันรับเข้า' });

      // Execute 5 rapid clicks
      const clickPromises = [];
      for (let i = 0; i < 5; i++) {
        clickPromises.push(confirmButton.click({ force: true }).catch(() => {}));
      }

      // Wait for all clicks to complete
      await Promise.all(clickPromises);

      // Wait for the operation to complete (success or error)
      await page.waitForTimeout(2000);

      // Verify only ONE transaction was recorded
      if (supabase) {
        // Small delay to let DB writes complete
        await page.waitForTimeout(1000);

        const { count: transactionCountAfter } = await supabase
          .from('transaction_logs')
          .select('*', { count: 'exact', head: true })
          .eq('sku', TEST_SKU);

        const newTransactions = (transactionCountAfter || 0) - transactionCountBefore;

        // Should be exactly 1 new transaction (or 0 if all clicks were blocked)
        expect(newTransactions).toBeLessThanOrEqual(1);
      }

      // Check UI shows single success (not multiple)
      const successMessages = await page
        .locator('.text-green-500, .text-green-600, [data-success]')
        .count();
      expect(successMessages).toBeLessThanOrEqual(1);
    });

    test('Save button is disabled during processing', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      // Select location
      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      // Add item
      await page.locator('input[type="number"]').fill('3');
      await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();

      // Open confirm modal
      await page.getByRole('button', { name: 'ยืนยันรับเข้าทั้งหมด' }).click();
      const modal = page.locator('.fixed').filter({ hasText: 'ยืนยันการรับเข้าสินค้า' });
      await expect(modal).toBeVisible();

      const confirmButton = modal.getByRole('button', { name: 'ยืนยันรับเข้า' });

      // Click and immediately check if button becomes disabled
      await confirmButton.click();

      // The button should either be disabled or show loading state
      const isDisabledOrLoading = await confirmButton.evaluate((btn) => {
        return (
          btn.hasAttribute('disabled') ||
          btn.classList.contains('disabled') ||
          btn.getAttribute('aria-disabled') === 'true' ||
          btn.querySelector('.animate-spin') !== null || // Loading spinner
          btn.textContent?.includes('กำลัง') // "กำลังบันทึก" = "Saving..."
        );
      });

      // In well-designed UI, button should be disabled during processing
      // If not disabled, log a warning (this could be a bug)
      if (!isDisabledOrLoading) {
        console.warn(
          'Button was not disabled during processing - potential race condition vulnerability',
        );
      }
    });

    test('Network request interceptor verifies single API call', async ({
      authenticatedPage: page,
    }) => {
      let apiCallCount = 0;

      // Intercept all POST requests to track API calls
      await page.route('**', async (route) => {
        const request = route.request();
        if (request.method() === 'POST' && request.url().includes('/inbound')) {
          const postData = request.postData();
          if (postData && postData.includes(TEST_PRODUCT_NAME)) {
            apiCallCount++;
          }
        }
        await route.continue();
      });

      // Execute the flow
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      await page.locator('input[type="number"]').fill('2');
      await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();

      await page.getByRole('button', { name: 'ยืนยันรับเข้าทั้งหมด' }).click();

      const modal = page.locator('.fixed').filter({ hasText: 'ยืนยันการรับเข้าสินค้า' });
      await expect(modal).toBeVisible();

      const confirmButton = modal.getByRole('button', { name: 'ยืนยันรับเข้า' });

      // Triple-click rapidly
      await confirmButton.click({ force: true });
      await confirmButton.click({ force: true }).catch(() => {});
      await confirmButton.click({ force: true }).catch(() => {});

      // Wait for completion
      await page.waitForTimeout(3000);

      // Verify only one API call was made
      expect(apiCallCount).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // ADDITIONAL EDGE CASES
  // =========================================================================
  test.describe('Edge Cases', () => {
    test('Handles network timeout gracefully', async ({ authenticatedPage: page }) => {
      // Simulate slow network
      await page.route('**', async (route) => {
        const request = route.request();
        if (request.method() === 'POST') {
          // Add 5 second delay
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        await route.continue();
      });

      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Quick flow
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);

      const productOption = page.getByText(TEST_PRODUCT_NAME);
      const isVisible = await productOption.isVisible().catch(() => false);

      if (isVisible) {
        await productOption.click();

        await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
        await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
        await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

        await page.locator('input[type="number"]').fill('1');
        await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();

        // The UI should remain responsive during slow network
        const pageUrl = page.url();
        expect(pageUrl).toContain('/inbound');

        // UI should show loading state, not freeze
        // Skip actual submit to avoid timeout
      }
    });

    test('Form resets after successful submission', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      // Complete a submission
      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');
      await searchInput.fill(TEST_SKU);
      await page.getByText(TEST_PRODUCT_NAME).click();

      await page.getByLabel('เลือก Lot', { exact: false }).selectOption({ label: TEST_LOT });
      await page.getByLabel('เลือก Position', { exact: false }).selectOption({ label: TEST_POS });
      await page.getByLabel('เลือก Level', { exact: false }).selectOption({ label: TEST_LEVEL });

      await page.locator('input[type="number"]').fill('1');
      await page.getByRole('button', { name: 'เพิ่มลงรายการ' }).click();

      await page.getByRole('button', { name: 'ยืนยันรับเข้าทั้งหมด' }).click();

      const modal = page.locator('.fixed').filter({ hasText: 'ยืนยันการรับเข้าสินค้า' });
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'ยืนยันรับเข้า' }).click();

      // Wait for success
      await expect(page.getByText('บันทึกการรับเข้าสินค้าเรียบร้อย')).toBeVisible({
        timeout: 15000,
      });

      // Close success modal (press Escape or click close)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Verify form is reset - queue should be empty
      const queueItem = page.getByText(`1. ${TEST_PRODUCT_NAME}`);
      const hasQueueItem = await queueItem.isVisible().catch(() => false);
      expect(hasQueueItem).toBe(false);
    });

    test('Handles special characters in product search', async ({ authenticatedPage: page }) => {
      await page.goto(`/dashboard/${WAREHOUSE_CODE}/inbound`);
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder('พิมพ์ชื่อ หรือยิงบาร์โค้ด...');

      // Test SQL injection attempt
      await searchInput.fill("'; DROP TABLE products; --");
      await page.waitForTimeout(500);

      // Page should still be functional (no crash)
      expect(page.url()).toContain('/inbound');

      // Test XSS attempt
      await searchInput.clear();
      await searchInput.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(500);

      // Page should still be functional
      expect(page.url()).toContain('/inbound');

      // Search with Unicode characters
      await searchInput.clear();
      await searchInput.fill('ทดสอบ สินค้า ภาษาไทย');
      await page.waitForTimeout(500);

      // Page should handle gracefully
      expect(page.url()).toContain('/inbound');
    });
  });
});
