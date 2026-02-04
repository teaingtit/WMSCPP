/**
 * Inventory Service - Business Logic Layer
 *
 * @description
 * Service layer that encapsulates business logic for inventory management.
 * Uses RepositoryFactory to get the appropriate data access layer.
 *
 * @architecture Clean Architecture - Application Layer (Use Cases)
 * @pattern Service Pattern + Dependency Injection
 *
 * @security Server-Side Only - Never import this in Client Components!
 */

import 'server-only';

import type { Product, TransactionLog, TransactionType, OperationResult } from '@/core';
import { RepositoryFactory } from '@/infrastructure/RepositoryFactory';

/** Maximum allowed SKU length to prevent abuse and DB overflow */
const MAX_SKU_LENGTH = 100;

/** Validate SKU: non-empty, within length, after trim */
function validateSku(
  sku: string,
): { valid: true; normalized: string } | { valid: false; error: string } {
  const trimmed = sku?.trim() ?? '';
  if (trimmed === '') {
    return { valid: false, error: 'SKU is required' };
  }
  if (trimmed.length > MAX_SKU_LENGTH) {
    return { valid: false, error: `SKU must be at most ${MAX_SKU_LENGTH} characters` };
  }
  return { valid: true, normalized: trimmed.toUpperCase() };
}

/** Validate quantity: finite number, non-negative, within safe integer range */
function validateQuantity(qty: number): { valid: true } | { valid: false; error: string } {
  if (typeof qty !== 'number' || !Number.isFinite(qty)) {
    return { valid: false, error: 'Quantity must be a finite number' };
  }
  if (qty < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  if (qty > Number.MAX_SAFE_INTEGER) {
    return { valid: false, error: 'Quantity exceeds maximum safe integer limits' };
  }
  return { valid: true };
}

/**
 * Stock adjustment input
 */
export interface StockAdjustmentInput {
  sku: string;
  qtyChange: number;
  reason: string;
  performedBy: string;
}

/**
 * Stock transfer input
 */
export interface StockTransferInput {
  sku: string;
  fromLocation: string;
  toLocation: string;
  qty: number;
  performedBy: string;
  notes?: string;
}

/**
 * Bulk stock update input
 */
export interface BulkStockUpdate {
  sku: string;
  qty: number;
}

/**
 * Inventory Service
 *
 * @example
 * ```typescript
 * import { InventoryService } from '@/services/InventoryService';
 *
 * export async function getProductsAction() {
 *   const products = await InventoryService.getAllProducts();
 *   return { success: true, data: products };
 * }
 * ```
 */
export class InventoryService {
  /**
   * Get all products from inventory
   *
   * @returns Promise<Product[]>
   */
  static async getAllProducts(): Promise<Product[]> {
    const repo = await RepositoryFactory.getInstance();
    return repo.getProducts();
  }

  /**
   * Get a single product by SKU
   *
   * @param sku - Product SKU
   * @returns Promise<Product | null>
   */
  static async getProductBySku(sku: string): Promise<Product | null> {
    const skuResult = validateSku(sku);
    if (!skuResult.valid) {
      throw new Error(skuResult.error);
    }
    const repo = await RepositoryFactory.getInstance();
    return repo.getProductBySku(skuResult.normalized);
  }

  /**
   * Update stock quantity
   *
   * @param sku - Product SKU
   * @param qty - New quantity
   * @param options - Optional OCC: pass expectedCurrentQty to update only if current DB qty matches (prevents race conditions)
   * @returns Promise<OperationResult<Product>>
   */
  static async updateStock(
    sku: string,
    qty: number,
    options?: { expectedCurrentQty?: number },
  ): Promise<OperationResult<Product>> {
    const skuResult = validateSku(sku);
    if (!skuResult.valid) {
      return { success: false, error: skuResult.error };
    }
    const qtyResult = validateQuantity(qty);
    if (!qtyResult.valid) {
      return { success: false, error: qtyResult.error };
    }
    if (options?.expectedCurrentQty !== undefined) {
      const expectedResult = validateQuantity(options.expectedCurrentQty);
      if (!expectedResult.valid) {
        return { success: false, error: `Invalid expectedCurrentQty: ${expectedResult.error}` };
      }
    }

    const repo = await RepositoryFactory.getInstance();
    return repo.updateStock(skuResult.normalized, qty, options);
  }

  /**
   * Adjust stock with reason tracking (business logic wrapper)
   *
   * @param input - Stock adjustment details
   * @returns Promise<OperationResult<TransactionLog>>
   */
  static async adjustStock(input: StockAdjustmentInput): Promise<OperationResult<TransactionLog>> {
    const { sku, qtyChange, reason, performedBy } = input;

    const skuResult = validateSku(sku);
    if (!skuResult.valid) {
      return { success: false, error: skuResult.error };
    }
    const normalizedSku = skuResult.normalized;

    if (!reason?.trim()) {
      return { success: false, error: 'Reason is required' };
    }
    if (!performedBy?.trim()) {
      return { success: false, error: 'PerformedBy is required' };
    }
    if (typeof qtyChange !== 'number' || !Number.isFinite(qtyChange)) {
      return { success: false, error: 'Quantity change must be a finite number' };
    }

    const repo = await RepositoryFactory.getInstance();
    const product = await repo.getProductBySku(normalizedSku);
    if (!product) {
      return {
        success: false,
        error: `Product with SKU ${normalizedSku} not found`,
      };
    }

    const newQty = product.qty + qtyChange;
    if (newQty < 0) {
      return {
        success: false,
        error: `Insufficient stock. Current: ${product.qty}, Change: ${qtyChange}, Result: ${newQty}`,
      };
    }

    const newQtyValidation = validateQuantity(newQty);
    if (!newQtyValidation.valid) {
      return { success: false, error: newQtyValidation.error };
    }

    // Optimistic Concurrency Control: only update if current qty still matches
    const updateResult = await repo.updateStock(normalizedSku, newQty, {
      expectedCurrentQty: product.qty,
    });
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'Failed to update stock',
      };
    }

    const transactionLog: TransactionLog = {
      sku: normalizedSku,
      type: 'ADJUSTMENT' as TransactionType,
      qtyChange,
      batchNo: product.batchNo,
      performedBy: performedBy.trim(),
      metadata: { reason: reason.trim() },
      timestamp: new Date().toISOString(),
    };

    return repo.logTransaction(transactionLog);
  }

  /**
   * Transfer stock between locations
   *
   * @param input - Stock transfer details
   * @returns Promise<OperationResult<TransactionLog>>
   */
  static async transferStock(input: StockTransferInput): Promise<OperationResult<TransactionLog>> {
    const { sku, fromLocation, toLocation, qty, performedBy, notes } = input;

    const skuResult = validateSku(sku);
    if (!skuResult.valid) {
      return { success: false, error: skuResult.error };
    }
    const normalizedSku = skuResult.normalized;

    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) {
      return {
        success: false,
        error: 'Transfer quantity must be a finite number greater than 0',
      };
    }
    if (fromLocation === toLocation) {
      return {
        success: false,
        error: 'Source and destination locations must be different',
      };
    }
    if (!fromLocation?.trim() || !toLocation?.trim()) {
      return { success: false, error: 'Source and destination locations are required' };
    }
    if (!performedBy?.trim()) {
      return { success: false, error: 'PerformedBy is required' };
    }

    const repo = await RepositoryFactory.getInstance();
    const result = await repo.transferStock(
      normalizedSku,
      fromLocation.trim(),
      toLocation.trim(),
      qty,
      performedBy.trim(),
    );

    // Add notes to metadata if provided
    if (result.success && result.data && notes) {
      result.data.metadata = {
        ...result.data.metadata,
        notes,
      };
    }

    return result;
  }

  /**
   * Get transaction history for a product
   *
   * @param sku - Product SKU
   * @param limit - Maximum number of records (default: 50)
   * @returns Promise<TransactionLog[]>
   */
  static async getTransactionHistory(sku: string, limit: number = 50): Promise<TransactionLog[]> {
    const skuResult = validateSku(sku);
    if (!skuResult.valid) {
      throw new Error(skuResult.error);
    }
    const limitNum = Math.min(Math.max(1, Math.floor(Number(limit) || 50)), 1000);
    const repo = await RepositoryFactory.getInstance();
    return repo.getTransactionHistory(skuResult.normalized, limitNum);
  }

  /**
   * Check stock availability
   *
   * @param sku - Product SKU
   * @param requiredQty - Required quantity
   * @returns Promise<{ available: boolean; currentQty: number; deficit?: number }>
   */
  static async checkStockAvailability(
    sku: string,
    requiredQty: number,
  ): Promise<{ available: boolean; currentQty: number; deficit?: number }> {
    const product = await this.getProductBySku(sku);

    if (!product) {
      return {
        available: false,
        currentQty: 0,
        deficit: requiredQty,
      };
    }

    const available = product.qty >= requiredQty;
    const deficit = available ? undefined : requiredQty - product.qty;

    return {
      available,
      currentQty: product.qty,
      ...(deficit !== undefined && { deficit }),
    };
  }

  /**
   * Bulk update stock quantities
   *
   * @param updates - Array of stock updates
   * @returns Promise<{ success: number; failed: number; errors: string[] }>
   */
  static async bulkUpdateStock(
    updates: BulkStockUpdate[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const repo = await RepositoryFactory.getInstance();

    for (const update of updates) {
      const skuResult = validateSku(update.sku ?? '');
      if (!skuResult.valid) {
        results.failed++;
        results.errors.push(`${update.sku ?? '(empty)'}: ${skuResult.error}`);
        continue;
      }
      const qtyResult = validateQuantity(update.qty);
      if (!qtyResult.valid) {
        results.failed++;
        results.errors.push(`${skuResult.normalized}: ${qtyResult.error}`);
        continue;
      }
      try {
        const result = await repo.updateStock(skuResult.normalized, update.qty);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${skuResult.normalized}: ${result.error ?? 'Update failed'}`);
        }
      } catch (error) {
        console.error('[InventoryService] bulkUpdateStock error:', {
          sku: skuResult.normalized,
          error,
        });
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${skuResult.normalized}: ${message}`);
      }
    }

    return results;
  }

  /**
   * Sync products from ERP (MSSQL) to main database (Supabase)
   *
   * @returns Promise<{ synced: number; failed: number; errors: string[] }>
   */
  static async syncFromERP(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const currentProvider = RepositoryFactory.getCurrentProvider();

    if (currentProvider === 'MSSQL') {
      throw new Error('Cannot sync from ERP when MSSQL is the primary database');
    }

    // Get data from MSSQL
    const mssqlRepo = await RepositoryFactory.getRepository('MSSQL');
    const erpProducts = await mssqlRepo.getProducts();

    // Get Supabase repository
    const supabaseRepo = await RepositoryFactory.getRepository('SUPABASE');

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Update each product in Supabase
    for (const product of erpProducts) {
      try {
        const result = await supabaseRepo.updateStock(product.sku, product.qty);
        if (result.success) {
          results.synced++;
        } else {
          results.failed++;
          results.errors.push(`${product.sku}: ${result.error}`);
        }
      } catch (error) {
        console.error(`[InventoryService] syncFromERP error for ${product.sku}:`, error);
        results.failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${product.sku}: ${message}`);
      }
    }

    return results;
  }

  /**
   * Get low stock products (business logic: qty < threshold)
   *
   * @param threshold - Stock level threshold (default: 10)
   * @returns Promise<Product[]>
   */
  static async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    const t = typeof threshold === 'number' && Number.isFinite(threshold) ? threshold : 10;
    const safeThreshold = t < 0 ? 0 : t;
    const allProducts = await this.getAllProducts();
    return allProducts.filter((product) => product.qty < safeThreshold);
  }

  /**
   * Calculate total inventory value
   * (This is a placeholder - in real scenario, you'd need price data)
   *
   * @returns Promise<{ totalItems: number; totalQuantity: number }>
   */
  static async getInventorySummary(): Promise<{ totalItems: number; totalQuantity: number }> {
    const products = await this.getAllProducts();

    return {
      totalItems: products.length,
      totalQuantity: products.reduce((sum, p) => sum + p.qty, 0),
    };
  }
}
