/**
 * Product Inventory Actions - Server Actions using Repository Pattern
 *
 * @description
 * Next.js Server Actions that use the Repository Pattern for database abstraction.
 * Demonstrates Dependency Injection and Clean Architecture principles.
 *
 * @architecture
 * - Server Actions (Presentation Layer)
 * - Repository Interface (Core Layer - Port)
 * - Repository Implementation (Infrastructure Layer - Adapter)
 *
 * @benefits
 * 1. **Testability**: Easy to mock repositories in tests
 * 2. **Flexibility**: Switch between Supabase/MSSQL without changing actions
 * 3. **Maintainability**: Business logic separated from data access
 * 4. **Type Safety**: Strict TypeScript types from core entities
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { SupabaseInventoryRepository } from '@/infrastructure/repositories';
import type { IInventoryRepository } from '@/core';
import { ok, fail } from '@/lib/action-utils';

/**
 * Get all products from the inventory
 *
 * @returns ActionResult with array of products
 *
 * @example
 * ```typescript
 * const result = await getProductsAction();
 * if (result.success) {
 *   console.log('Products:', result.data.products);
 * }
 * ```
 */
export async function getProductsAction() {
  try {
    const supabase = await createClient();
    const repo: IInventoryRepository = new SupabaseInventoryRepository(supabase);

    const products = await repo.getProducts();

    return ok('Products fetched successfully', { products });
  } catch (error) {
    console.error('[getProductsAction] Error:', error);
    return fail('Failed to fetch products');
  }
}

/**
 * Get a single product by SKU
 *
 * @param sku - Product SKU to fetch
 * @returns ActionResult with product data
 */
export async function getProductBySkuAction(sku: string) {
  try {
    const supabase = await createClient();
    const repo: IInventoryRepository = new SupabaseInventoryRepository(supabase);

    const product = await repo.getProductBySku(sku);

    if (!product) {
      return fail(`Product with SKU ${sku} not found`);
    }

    return ok('Product fetched successfully', { product });
  } catch (error) {
    console.error('[getProductBySkuAction] Error:', error);
    return fail('Failed to fetch product');
  }
}

/**
 * Update stock quantity for a product
 *
 * @param sku - Product SKU
 * @param qty - New quantity
 * @returns ActionResult with updated product
 */
export async function updateStockAction(sku: string, qty: number) {
  try {
    const supabase = await createClient();
    const repo: IInventoryRepository = new SupabaseInventoryRepository(supabase);

    const result = await repo.updateStock(sku, qty);

    if (!result.success || !result.data) {
      return fail(result.error || 'Failed to update stock');
    }

    return ok('Stock updated successfully', { product: result.data });
  } catch (error) {
    console.error('[updateStockAction] Error:', error);
    return fail('Failed to update stock');
  }
}

/**
 * Transfer stock between locations
 *
 * @param sku - Product SKU
 * @param fromLocation - Source location
 * @param toLocation - Destination location
 * @param qty - Quantity to transfer
 * @param performedBy - User ID performing the transfer
 * @returns ActionResult with transaction log
 */
export async function transferStockAction(
  sku: string,
  fromLocation: string,
  toLocation: string,
  qty: number,
  performedBy: string,
) {
  try {
    const supabase = await createClient();
    const repo: IInventoryRepository = new SupabaseInventoryRepository(supabase);

    const result = await repo.transferStock(sku, fromLocation, toLocation, qty, performedBy);

    if (!result.success || !result.data) {
      return fail(result.error || 'Failed to transfer stock');
    }

    return ok('Stock transferred successfully', { transaction: result.data });
  } catch (error) {
    console.error('[transferStockAction] Error:', error);
    return fail('Failed to transfer stock');
  }
}

/**
 * Get transaction history for a product
 *
 * @param sku - Product SKU
 * @param limit - Maximum number of records (default: 50)
 * @returns ActionResult with transaction history
 */
export async function getTransactionHistoryAction(sku: string, limit: number = 50) {
  try {
    const supabase = await createClient();
    const repo: IInventoryRepository = new SupabaseInventoryRepository(supabase);

    const transactions = await repo.getTransactionHistory(sku, limit);

    return ok('Transaction history fetched successfully', { transactions });
  } catch (error) {
    console.error('[getTransactionHistoryAction] Error:', error);
    return fail('Failed to fetch transaction history');
  }
}

/**
 * Example: Dual-Database Query (Advanced Pattern)
 *
 * @description
 * Demonstrates how to use multiple repository implementations
 * to sync data from MSSQL (ERP) to Supabase (Main DB)
 */
export async function syncProductsFromERPAction() {
  try {
    // Import MSSQL repository only when needed (code splitting)
    const { MSSQLInventoryRepository } = await import('@/infrastructure/repositories');

    // Fetch from MSSQL (Legacy ERP)
    const mssqlRepo: IInventoryRepository = new MSSQLInventoryRepository();
    const erpProducts = await mssqlRepo.getProducts();

    // Write to Supabase (Main Database)
    const supabase = await createClient();
    const { error } = await supabase.from('products').upsert(
      erpProducts.map((p) => ({
        sku: p.sku,
        name: p.name,
        qty: p.qty,
        location: p.location,
        batch_no: p.batchNo,
      })),
      { onConflict: 'sku' },
    );

    if (error) {
      return fail(`Failed to sync products: ${error.message}`);
    }

    return ok('Products synced from ERP successfully', { syncedCount: erpProducts.length });
  } catch (error) {
    console.error('[syncProductsFromERPAction] Error:', error);
    return fail('Failed to sync products from ERP');
  }
}
