/**
 * Inventory Actions - Using Service Layer
 *
 * @description
 * Server Actions that demonstrate using InventoryService instead of
 * directly accessing repositories. This follows proper layered architecture.
 *
 * @architecture
 * Server Actions → Service Layer → Repository Factory → Repository Implementation
 */

'use server';

import { InventoryService } from '@/services/InventoryService';
import type { StockAdjustmentInput, StockTransferInput } from '@/services/InventoryService';
import { ok, fail } from '@/lib/action-utils';

/**
 * Get all products (uses Service Layer)
 *
 * @example
 * ```typescript
 * const result = await getProductsServiceAction();
 * if (result.success) {
 *   console.log('Products:', result.data.products);
 * }
 * ```
 */
export async function getProductsServiceAction() {
  try {
    const products = await InventoryService.getAllProducts();
    return ok('Products fetched successfully', { products });
  } catch (error) {
    console.error('[getProductsServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    return fail(message);
  }
}

/**
 * Get product by SKU (uses Service Layer with validation)
 */
export async function getProductBySkuServiceAction(sku: string) {
  try {
    const product = await InventoryService.getProductBySku(sku);

    if (!product) {
      return fail(`Product with SKU ${sku} not found`);
    }

    return ok('Product fetched successfully', { product });
  } catch (error) {
    console.error('[getProductBySkuServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return fail(message);
  }
}

/**
 * Update stock quantity (uses Service Layer with business rules)
 * @param options - Optional expectedCurrentQty for optimistic locking (prevents race when two users update same SKU)
 */
export async function updateStockServiceAction(
  sku: string,
  qty: number,
  options?: { expectedCurrentQty?: number },
) {
  try {
    const result = await InventoryService.updateStock(
      sku,
      qty,
      options?.expectedCurrentQty !== undefined
        ? { expectedCurrentQty: options.expectedCurrentQty }
        : undefined,
    );

    if (!result.success) {
      return fail(result.error || 'Failed to update stock');
    }

    return ok('Stock updated successfully', { product: result.data });
  } catch (error) {
    console.error('[updateStockServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update stock';
    return fail(message);
  }
}

/**
 * Adjust stock with reason (business logic in Service)
 */
export async function adjustStockServiceAction(input: StockAdjustmentInput) {
  try {
    const result = await InventoryService.adjustStock(input);

    if (!result.success) {
      return fail(result.error || 'Failed to adjust stock');
    }

    return ok('Stock adjusted successfully', { transaction: result.data });
  } catch (error) {
    console.error('[adjustStockServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to adjust stock';
    return fail(message);
  }
}

/**
 * Transfer stock between locations (uses Service Layer)
 */
export async function transferStockServiceAction(input: StockTransferInput) {
  try {
    const result = await InventoryService.transferStock(input);

    if (!result.success) {
      return fail(result.error || 'Failed to transfer stock');
    }

    return ok('Stock transferred successfully', { transaction: result.data });
  } catch (error) {
    console.error('[transferStockServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to transfer stock';
    return fail(message);
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistoryServiceAction(sku: string, limit: number = 50) {
  try {
    const transactions = await InventoryService.getTransactionHistory(sku, limit);
    return ok('Transaction history fetched successfully', { transactions });
  } catch (error) {
    console.error('[getTransactionHistoryServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction history';
    return fail(message);
  }
}

/**
 * Check stock availability
 */
export async function checkStockAvailabilityAction(sku: string, requiredQty: number) {
  try {
    const result = await InventoryService.checkStockAvailability(sku, requiredQty);

    const message = result.available
      ? `Stock available: ${result.currentQty} units`
      : `Insufficient stock. Available: ${result.currentQty}, Deficit: ${result.deficit}`;

    return ok(message, result);
  } catch (error) {
    console.error('[checkStockAvailabilityAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to check stock availability';
    return fail(message);
  }
}

/**
 * Get low stock products
 */
export async function getLowStockProductsAction(threshold: number = 10) {
  try {
    const products = await InventoryService.getLowStockProducts(threshold);

    return ok(`Found ${products.length} low stock products`, { products, threshold });
  } catch (error) {
    console.error('[getLowStockProductsAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch low stock products';
    return fail(message);
  }
}

/**
 * Get inventory summary
 */
export async function getInventorySummaryAction() {
  try {
    const summary = await InventoryService.getInventorySummary();
    return ok('Inventory summary fetched successfully', summary);
  } catch (error) {
    console.error('[getInventorySummaryAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory summary';
    return fail(message);
  }
}

/**
 * Sync products from ERP (advanced feature)
 */
export async function syncFromERPServiceAction() {
  try {
    const result = await InventoryService.syncFromERP();

    const message =
      result.failed === 0
        ? `Successfully synced ${result.synced} products from ERP`
        : `Synced ${result.synced} products, ${result.failed} failed`;

    return ok(message, result);
  } catch (error) {
    console.error('[syncFromERPServiceAction] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync from ERP';
    return fail(message);
  }
}
