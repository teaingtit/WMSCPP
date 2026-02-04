/**
 * Supabase Implementation: IInventoryRepository
 *
 * @description
 * Adapter that implements the IInventoryRepository interface using Supabase as the data source.
 * This is part of the Infrastructure Layer and depends on the Core Layer (but NOT vice versa).
 *
 * @architecture Clean Architecture - Infrastructure Layer (Adapter)
 * @pattern Repository Pattern + Adapter Pattern
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IInventoryRepository, Product, TransactionLog, OperationResult } from '@/core';
import { TransactionType, isTransactionType } from '@/core';

/**
 * Supabase-backed implementation of IInventoryRepository
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 * import { SupabaseInventoryRepository } from '@/infrastructure/repositories';
 *
 * export async function getInventoryAction() {
 *   const supabase = await createClient();
 *   const repo = new SupabaseInventoryRepository(supabase);
 *   const products = await repo.getProducts();
 *   return ok({ products });
 * }
 * ```
 */
export class SupabaseInventoryRepository implements IInventoryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('sku, name, qty, location, batch_no')
      .order('sku', { ascending: true });

    if (error) {
      console.error('[SupabaseInventoryRepository] getProducts error:', error);
      console.error('[SupabaseInventoryRepository] getProducts details:', {
        code: error.code,
        message: error.message,
      });
      return [];
    }

    // Map database columns to domain entity
    return (data || []).map((row) => ({
      sku: row.sku ?? '',
      name: row.name ?? '',
      qty: row.qty ?? 0,
      location: row.location ?? '',
      batchNo: row.batch_no ?? '',
    }));
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('sku, name, qty, location, batch_no')
      .eq('sku', sku)
      .single();

    if (error || !data) {
      console.error('[SupabaseInventoryRepository] getProductBySku error:', { sku, error });
      return null;
    }

    return {
      sku: data.sku ?? '',
      name: data.name ?? '',
      qty: data.qty ?? 0,
      location: data.location ?? '',
      batchNo: data.batch_no ?? '',
    };
  }

  async updateStock(
    sku: string,
    qty: number,
    options?: { expectedCurrentQty?: number },
  ): Promise<OperationResult<Product>> {
    // Validate quantity (reject negative, NaN, non-finite)
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0) {
      return {
        success: false,
        error: 'Quantity must be a finite non-negative number',
      };
    }

    let query = this.supabase.from('products').update({ qty }).eq('sku', sku);

    // Optimistic Concurrency Control
    if (options?.expectedCurrentQty !== undefined) {
      query = query.eq('qty', options.expectedCurrentQty);
    }

    const { data, error } = await query.select('sku, name, qty, location, batch_no').maybeSingle(); // Use maybeSingle to handle 0 rows (concurrency mismatch)

    if (error) {
      console.error('[SupabaseInventoryRepository] updateStock error:', { sku, error });
      return {
        success: false,
        error: error.message || 'Failed to update stock',
      };
    }

    // Concurrency Check Failed (No rows updated)
    if (!data) {
      // Check if product actually exists to give better error message
      const exists = await this.getProductBySku(sku);
      if (!exists) {
        return { success: false, error: `Product with SKU ${sku} not found` };
      }
      return {
        success: false,
        error: `Race Condition detected: Stock has changed since last read. Please try again.`,
      };
    }

    return {
      success: true,
      data: {
        sku: data.sku ?? '',
        name: data.name ?? '',
        qty: data.qty ?? 0,
        location: data.location ?? '',
        batchNo: data.batch_no ?? '',
      },
    };
  }

  async logTransaction(transactionData: TransactionLog): Promise<OperationResult<TransactionLog>> {
    const { data, error } = await this.supabase
      .from('transaction_logs')
      .insert({
        sku: transactionData.sku,
        type: transactionData.type,
        qty_change: transactionData.qtyChange,
        from_location: transactionData.fromLocation,
        to_location: transactionData.toLocation,
        batch_no: transactionData.batchNo,
        performed_by: transactionData.performedBy,
        metadata: transactionData.metadata,
        timestamp: transactionData.timestamp,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[SupabaseInventoryRepository] logTransaction error:', {
        sku: transactionData.sku,
        type: transactionData.type,
        error,
      });
      return {
        success: false,
        error: error?.message || 'Failed to log transaction',
      };
    }

    const txType = isTransactionType(data.type) ? data.type : TransactionType.ADJUSTMENT;
    return {
      success: true,
      data: {
        sku: data.sku ?? '',
        type: txType,
        qtyChange:
          typeof data.qty_change === 'number' && Number.isFinite(data.qty_change)
            ? data.qty_change
            : 0,
        fromLocation: data.from_location ?? undefined,
        toLocation: data.to_location ?? undefined,
        batchNo: data.batch_no ?? '',
        performedBy: data.performed_by ?? '',
        metadata: data.metadata ?? undefined,
        timestamp: data.timestamp ?? new Date().toISOString(),
      },
    };
  }

  async getTransactionHistory(sku: string, limit: number = 50): Promise<TransactionLog[]> {
    const { data, error } = await this.supabase
      .from('transaction_logs')
      .select('*')
      .eq('sku', sku)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('[SupabaseInventoryRepository] getTransactionHistory error:', {
        sku,
        limit,
        error,
      });
      return [];
    }

    return data.map((row) => {
      const txType = isTransactionType(row.type) ? row.type : TransactionType.ADJUSTMENT;
      return {
        sku: row.sku ?? '',
        type: txType,
        qtyChange:
          typeof row.qty_change === 'number' && Number.isFinite(row.qty_change)
            ? row.qty_change
            : 0,
        fromLocation: row.from_location ?? undefined,
        toLocation: row.to_location ?? undefined,
        batchNo: row.batch_no ?? '',
        performedBy: row.performed_by ?? '',
        metadata: row.metadata ?? undefined,
        timestamp: row.timestamp ?? new Date().toISOString(),
      };
    });
  }

  async transferStock(
    sku: string,
    fromLocation: string,
    toLocation: string,
    qty: number,
    performedBy: string,
  ): Promise<OperationResult<TransactionLog>> {
    // Validate inputs
    if (qty <= 0) {
      return {
        success: false,
        error: 'Transfer quantity must be greater than 0',
      };
    }

    if (fromLocation === toLocation) {
      return {
        success: false,
        error: 'Source and destination locations cannot be the same',
      };
    }

    // Get current product
    const product = await this.getProductBySku(sku);
    if (!product) {
      return {
        success: false,
        error: `Product with SKU ${sku} not found`,
      };
    }

    if (product.location !== fromLocation) {
      return {
        success: false,
        error: `Product is not in location ${fromLocation}`,
      };
    }

    if (product.qty < qty) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${product.qty}, Requested: ${qty}`,
      };
    }

    // STRICT VALIDATION: Current schema only supports 1 location per product.
    // We cannot split stock. Qty must match exactly.
    if (product.qty !== qty) {
      return {
        success: false,
        error:
          'Partial transfers are not supported in this schema version. You must transfer the entire quantity.',
      };
    }

    // Update product location
    const { error: updateError } = await this.supabase
      .from('products')
      .update({ location: toLocation })
      .eq('sku', sku);

    if (updateError) {
      return {
        success: false,
        error: updateError.message,
      };
    }

    // Log the transfer transaction
    const transactionLog: TransactionLog = {
      sku,
      type: 'TRANSFER' as TransactionType,
      qtyChange: 0, // Transfer doesn't change total quantity
      fromLocation,
      toLocation,
      batchNo: product.batchNo,
      performedBy,
      timestamp: new Date().toISOString(),
    };

    return this.logTransaction(transactionLog);
  }

  /**
   * Atomic stock transfer using RPC function
   * Ensures all operations happen in a single transaction
   *
   * @param productId - Product UUID
   * @param fromLocationId - Source location UUID
   * @param toLocationId - Destination location UUID
   * @param qty - Quantity to transfer
   * @param userId - User UUID performing the transfer
   * @param userEmail - User email for audit
   * @param warehouseId - Warehouse UUID
   * @param details - Optional transfer details
   */
  async transferStockAtomic(
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    qty: number,
    userId: string,
    userEmail: string,
    warehouseId: string,
    details?: string,
  ): Promise<OperationResult<{ transactionId: string; quantityTransferred: number }>> {
    try {
      const { data, error } = await this.supabase.rpc('transfer_stock_atomic', {
        p_product_id: productId,
        p_from_location_id: fromLocationId,
        p_to_location_id: toLocationId,
        p_quantity: qty,
        p_user_id: userId,
        p_user_email: userEmail,
        p_warehouse_id: warehouseId,
        p_details: details,
      });

      if (error) {
        console.error('[SupabaseInventoryRepository] transferStockAtomic RPC error:', error);
        return {
          success: false,
          error: error.message || 'Atomic transfer failed',
        };
      }

      // RPC returns JSONB with success/error structure
      if (!data || !data.success) {
        return {
          success: false,
          error: data?.error || 'Transfer failed',
        };
      }

      return {
        success: true,
        data: {
          transactionId: data.data?.transaction_id,
          quantityTransferred: data.data?.quantity_transferred,
        },
      };
    } catch (error) {
      console.error('[SupabaseInventoryRepository] transferStockAtomic exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Atomic transfer failed',
      };
    }
  }
}
