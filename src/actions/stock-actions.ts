/**
 * Stock Management Actions - Using Service Layer
 *
 * @description
 * Simplified stock management actions that use InventoryService instead of
 * direct Supabase calls. These are suitable for basic CRUD operations.
 *
 * For complex workflows (inbound/outbound with RPC, cross-warehouse transfers),
 * continue using the specialized actions (inbound-actions.ts, transfer-actions.ts)
 * as they contain business logic that goes beyond simple repository operations.
 *
 * @architecture
 * UI Components → Stock Actions → InventoryService → RepositoryFactory → Repository
 */

'use server';

import { InventoryService } from '@/services/InventoryService';
import type { StockAdjustmentInput, StockTransferInput } from '@/services/InventoryService';
import { ok, fail } from '@/lib/action-utils';
import { revalidatePath } from 'next/cache';
import { enforceRateLimit } from '@/lib/rate-limit';
import { sanitizeError } from '@/lib/error-sanitizer';
import { createClient } from '@/lib/supabase/server';

/**
 * Helper to get current user ID for rate limiting
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Get all products in inventory
 * Database-agnostic - works with both Supabase and MSSQL
 *
 * @example
 * ```typescript
 * const result = await getAllProductsAction();
 * if (result.success) {
 *   console.log('Products:', result.data.products);
 * }
 * ```
 */
export async function getAllProductsAction() {
  try {
    const products = await InventoryService.getAllProducts();

    return ok('Products fetched successfully', {
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('[getAllProductsAction] Error:', error);
    return fail(sanitizeError(error, { context: { action: 'getAllProductsAction' } }));
  }
}

/**
 * Get single product by SKU
 * Database-agnostic
 *
 * @param sku - Product SKU (will be normalized to uppercase)
 */
export async function getProductBySkuAction(sku: string) {
  try {
    if (!sku || sku.trim() === '') {
      return fail('SKU is required');
    }

    const product = await InventoryService.getProductBySku(sku);

    if (!product) {
      return fail(`Product with SKU "${sku}" not found`);
    }

    return ok('Product found', { product });
  } catch (error) {
    console.error('[getProductBySkuAction] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch product. Please try again.';
    return fail(message);
  }
}

/**
 * Update stock quantity (simple update)
 * Database-agnostic
 *
 * Use this for direct stock quantity updates.
 * For complex workflows with validation and logging, use adjustStockAction instead.
 *
 * @param sku - Product SKU
 * @param qty - New quantity (must be >= 0)
 * @param warehouseIdOrOptions - Optional: warehouse ID string (for cache revalidation), or { warehouseId, expectedCurrentQty } for OCC (prevents race when two users update same SKU)
 */
export async function updateStockAction(
  sku: string,
  qty: number,
  warehouseIdOrOptions?: string | { warehouseId?: string; expectedCurrentQty?: number },
) {
  try {
    // Input validation
    if (!sku || sku.trim() === '') {
      return fail('SKU is required');
    }

    if (typeof qty !== 'number' || !Number.isFinite(qty)) {
      return fail('Invalid quantity value');
    }

    if (qty < 0) {
      return fail('Quantity cannot be negative');
    }

    const options =
      typeof warehouseIdOrOptions === 'string'
        ? { warehouseId: warehouseIdOrOptions }
        : warehouseIdOrOptions ?? {};

    // Call service layer (pass OCC option to avoid lost updates when two users edit same SKU)
    const result = await InventoryService.updateStock(
      sku,
      qty,
      options.expectedCurrentQty !== undefined
        ? { expectedCurrentQty: options.expectedCurrentQty }
        : undefined,
    );

    if (!result.success) {
      return fail(result.error || 'Failed to update stock');
    }

    const warehouseId = options.warehouseId;
    if (warehouseId) {
      revalidatePath(`/dashboard/${warehouseId}/inventory`);
      revalidatePath(`/dashboard/${warehouseId}/history`);
    }

    return ok(`Stock updated successfully for ${sku}`, { product: result.data });
  } catch (error) {
    console.error('[updateStockAction] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update stock. Please check your connection and try again.';
    return fail(message);
  }
}

/**
 * Adjust stock with reason tracking (recommended for stock changes)
 * Database-agnostic
 *
 * This action includes business logic validation and transaction logging.
 * Use this instead of updateStockAction when you need audit trail.
 *
 * Rate Limited: TRANSACTION (30 requests/minute)
 *
 * @param input - Stock adjustment details
 * @param warehouseId - Optional warehouse ID for cache revalidation
 */
export async function adjustStockAction(input: StockAdjustmentInput, warehouseId?: string) {
  try {
    // Rate limiting check
    const userId = await getCurrentUserId();
    if (userId) {
      const rateLimitResponse = await enforceRateLimit('TRANSACTION', userId);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // Input validation
    if (!input.sku || input.sku.trim() === '') {
      return fail('SKU is required');
    }

    if (!input.reason || input.reason.trim() === '') {
      return fail('Reason is required for stock adjustment');
    }

    if (!input.performedBy || input.performedBy.trim() === '') {
      return fail('User information is required');
    }

    if (typeof input.qtyChange !== 'number' || isNaN(input.qtyChange)) {
      return fail('Invalid quantity change value');
    }

    // Call service layer with business logic
    const result = await InventoryService.adjustStock(input);

    if (!result.success) {
      // User-friendly error messages
      const errorMessage = result.error || 'Failed to adjust stock';
      return fail(errorMessage);
    }

    // Revalidate cache
    if (warehouseId) {
      revalidatePath(`/dashboard/${warehouseId}/inventory`);
      revalidatePath(`/dashboard/${warehouseId}/history`);
    }

    const changeType = input.qtyChange > 0 ? 'increased' : 'decreased';
    const absChange = Math.abs(input.qtyChange);

    return ok(`Stock ${changeType} by ${absChange} units for ${input.sku}`, {
      transaction: result.data,
    });
  } catch (error) {
    console.error('[adjustStockAction] Error:', error);
    return fail(
      sanitizeError(error, {
        context: { action: 'adjustStockAction', sku: input.sku },
        userId: input.performedBy,
      }),
    );
  }
}

/**
 * Transfer stock between locations (simple transfer)
 * Database-agnostic
 *
 * For complex cross-warehouse transfers with RPC logic,
 * continue using transfer-actions.ts
 *
 * Rate Limited: TRANSACTION (30 requests/minute)
 *
 * @param input - Stock transfer details
 * @param warehouseId - Optional warehouse ID for cache revalidation
 */
export async function transferStockAction(input: StockTransferInput, warehouseId?: string) {
  try {
    // Rate limiting check
    const userId = await getCurrentUserId();
    if (userId) {
      const rateLimitResponse = await enforceRateLimit('TRANSACTION', userId);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // Input validation
    if (!input.sku || input.sku.trim() === '') {
      return fail('SKU is required');
    }

    if (!input.fromLocation || input.fromLocation.trim() === '') {
      return fail('Source location is required');
    }

    if (!input.toLocation || input.toLocation.trim() === '') {
      return fail('Destination location is required');
    }

    if (!input.performedBy || input.performedBy.trim() === '') {
      return fail('User information is required');
    }

    if (typeof input.qty !== 'number' || isNaN(input.qty) || input.qty <= 0) {
      return fail('Transfer quantity must be greater than 0');
    }

    if (input.fromLocation === input.toLocation) {
      return fail('Source and destination locations must be different');
    }

    // Call service layer
    const result = await InventoryService.transferStock(input);

    if (!result.success) {
      // User-friendly error messages
      const errorMessage = result.error || 'Failed to transfer stock';
      return fail(errorMessage);
    }

    // Revalidate cache
    if (warehouseId) {
      revalidatePath(`/dashboard/${warehouseId}/inventory`);
      revalidatePath(`/dashboard/${warehouseId}/history`);
    }

    return ok(`Stock transferred successfully from ${input.fromLocation} to ${input.toLocation}`, {
      transaction: result.data,
    });
  } catch (error) {
    console.error('[transferStockAction] Error:', error);
    return fail(
      sanitizeError(error, {
        context: {
          action: 'transferStockAction',
          sku: input.sku,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
        },
        userId: input.performedBy,
      }),
    );
  }
}

/**
 * Check stock availability before operations
 * Database-agnostic
 *
 * @param sku - Product SKU
 * @param requiredQty - Required quantity
 */
export async function checkStockAvailabilityAction(sku: string, requiredQty: number) {
  try {
    if (!sku || sku.trim() === '') {
      return fail('SKU is required');
    }

    if (typeof requiredQty !== 'number' || isNaN(requiredQty) || requiredQty <= 0) {
      return fail('Required quantity must be greater than 0');
    }

    const result = await InventoryService.checkStockAvailability(sku, requiredQty);

    const message = result.available
      ? `✅ Stock available: ${result.currentQty} units`
      : `❌ Insufficient stock. Available: ${result.currentQty}, Deficit: ${result.deficit}`;

    return ok(message, result);
  } catch (error) {
    console.error('[checkStockAvailabilityAction] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to check stock availability. Please try again.';
    return fail(message);
  }
}

/**
 * Get transaction history for a product
 * Database-agnostic
 *
 * @param sku - Product SKU
 * @param limit - Maximum number of records (default: 50, max: 1000)
 */
export async function getTransactionHistoryAction(sku: string, limit: number = 50) {
  try {
    if (!sku || sku.trim() === '') {
      return fail('SKU is required');
    }

    // Validate and clamp limit
    const validLimit = Math.min(Math.max(1, limit), 1000);

    const transactions = await InventoryService.getTransactionHistory(sku, validLimit);

    return ok(`Found ${transactions.length} transaction(s)`, {
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[getTransactionHistoryAction] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch transaction history. Please try again.';
    return fail(message);
  }
}

/**
 * Get low stock products (below threshold)
 * Database-agnostic
 *
 * @param threshold - Stock level threshold (default: 10)
 */
export async function getLowStockProductsAction(threshold: number = 10) {
  try {
    if (typeof threshold !== 'number' || isNaN(threshold) || threshold < 0) {
      return fail('Invalid threshold value');
    }

    const products = await InventoryService.getLowStockProducts(threshold);

    return ok(`Found ${products.length} low stock product(s)`, {
      products,
      threshold,
      count: products.length,
    });
  } catch (error) {
    console.error('[getLowStockProductsAction] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch low stock products. Please try again.';
    return fail(message);
  }
}

/**
 * Get inventory summary statistics
 * Database-agnostic
 */
export async function getInventorySummaryAction() {
  try {
    const summary = await InventoryService.getInventorySummary();

    return ok('Inventory summary fetched successfully', summary);
  } catch (error) {
    console.error('[getInventorySummaryAction] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch inventory summary. Please try again.';
    return fail(message);
  }
}

/**
 * Sync products from ERP system (MSSQL to Supabase)
 * Only works when DB_PROVIDER=SUPABASE
 *
 * Rate Limited: BULK_IMPORT (5 requests/minute) - This is a heavy operation
 *
 * @param warehouseId - Optional warehouse ID for cache revalidation
 */
export async function syncFromERPAction(warehouseId?: string) {
  let userId: string | null = null;
  try {
    // Rate limiting check - use BULK_IMPORT limit for this heavy operation
    userId = await getCurrentUserId();
    if (userId) {
      const rateLimitResponse = await enforceRateLimit('BULK_IMPORT', userId);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    const result = await InventoryService.syncFromERP();

    // Revalidate cache after sync
    if (warehouseId) {
      revalidatePath(`/dashboard/${warehouseId}/inventory`);
      revalidatePath(`/dashboard/${warehouseId}/history`);
    }

    const message =
      result.failed === 0
        ? `Successfully synced ${result.synced} products from ERP`
        : `Synced ${result.synced} products, ${result.failed} failed`;

    return ok(message, result);
  } catch (error) {
    console.error('[syncFromERPAction] Error:', error);
    return fail(
      sanitizeError(error, {
        context: { action: 'syncFromERPAction', warehouseId },
        ...(userId != null ? { userId } : {}),
      }),
    );
  }
}
