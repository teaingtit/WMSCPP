/**
 * Repository Interface: IInventoryRepository
 *
 * @description
 * Port (interface) defining the contract for inventory data access.
 * This is implementation-agnostic and can be backed by Supabase, MSSQL, or any other data source.
 *
 * @architecture Clean Architecture - Core Layer (Port)
 * @pattern Repository Pattern
 *
 * @example
 * ```typescript
 * // Supabase implementation
 * class SupabaseInventoryRepository implements IInventoryRepository {
 *   async getProducts(): Promise<Product[]> {
 *     const { data } = await supabase.from('products').select('*');
 *     return data;
 *   }
 * }
 *
 * // MSSQL implementation
 * class MSSQLInventoryRepository implements IInventoryRepository {
 *   async getProducts(): Promise<Product[]> {
 *     const pool = await getMSSQLPool();
 *     const result = await pool.request().query('SELECT * FROM Products');
 *     return result.recordset;
 *   }
 * }
 * ```
 */

import type { Product, TransactionLog, OperationResult } from '../entities';

export interface IInventoryRepository {
  /**
   * Retrieve all products from the inventory system
   *
   * @returns Promise resolving to an array of products
   * @throws Should NOT throw - implementations must handle errors internally
   */
  getProducts(): Promise<Product[]>;

  /**
   * Retrieve a single product by SKU
   *
   * @param sku - Stock Keeping Unit identifier
   * @returns Promise resolving to a product or null if not found
   */
  getProductBySku(sku: string): Promise<Product | null>;

  /**
   * Update stock quantity for a specific product
   *
   * @param sku - Product SKU to update
   * @param qty - New quantity (must be >= 0)
   * @returns Operation result with updated product data
   *
   * @example
   * ```typescript
   * const result = await repo.updateStock('SKU-001', 50);
   * if (result.success) {
   *   console.log('Updated product:', result.data);
   * } else {
   *   console.error('Update failed:', result.error);
   * }
   * ```
   */
  updateStock(
    sku: string,
    qty: number,
    options?: {
      /** Optimistic Concurrency Control: Only update if current qty matches this value */
      expectedCurrentQty?: number;
    },
  ): Promise<OperationResult<Product>>;

  /**
   * Log an inventory transaction
   *
   * @param data - Transaction log data
   * @returns Operation result with created transaction log
   *
   * @example
   * ```typescript
   * const result = await repo.logTransaction({
   *   sku: 'SKU-001',
   *   type: TransactionType.INBOUND,
   *   qtyChange: 100,
   *   batchNo: 'BATCH-001',
   *   performedBy: 'user_abc123',
   *   timestamp: new Date().toISOString(),
   * });
   * ```
   */
  logTransaction(data: TransactionLog): Promise<OperationResult<TransactionLog>>;

  /**
   * Retrieve transaction history for a specific product
   *
   * @param sku - Product SKU
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Promise resolving to an array of transaction logs
   */
  getTransactionHistory(sku: string, limit?: number): Promise<TransactionLog[]>;

  /**
   * Perform a stock transfer between locations
   *
   * @param sku - Product SKU
   * @param fromLocation - Source location
   * @param toLocation - Destination location
   * @param qty - Quantity to transfer
   * @param performedBy - User ID performing the transfer
   * @returns Operation result with transaction log
   */
  transferStock(
    sku: string,
    fromLocation: string,
    toLocation: string,
    qty: number,
    performedBy: string,
  ): Promise<OperationResult<TransactionLog>>;
}
