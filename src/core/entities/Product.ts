/**
 * Core Entity: Product
 *
 * @description
 * Domain entity representing a product in the inventory system.
 * This is a pure TypeScript type with NO dependencies on external libraries.
 *
 * @architecture Clean Architecture - Core Layer (Domain)
 */

export interface Product {
  /**
   * Stock Keeping Unit - Unique identifier for the product
   * @example "SKU-001", "PROD-ABC-123"
   */
  sku: string;

  /**
   * Product name
   * @example "MacBook Pro 16-inch", "iPhone 15 Pro Max"
   */
  name: string;

  /**
   * Current quantity in stock
   * @minimum 0
   */
  qty: number;

  /**
   * Storage location code
   * @example "A-01-03", "WH-MAIN-R2-S5"
   */
  location: string;

  /**
   * Batch number for traceability
   * @example "BATCH-2026-001", "LOT-20260204-A"
   */
  batchNo: string;
}

/**
 * Type guard to validate if an object is a valid Product
 * @param obj - Object to validate
 * @returns True if object matches Product interface
 */
export function isProduct(obj: unknown): obj is Product {
  if (typeof obj !== 'object' || obj === null) return false;

  const p = obj as Record<string, unknown>;

  return (
    typeof p['sku'] === 'string' &&
    typeof p['name'] === 'string' &&
    typeof p['qty'] === 'number' &&
    typeof p['location'] === 'string' &&
    typeof p['batchNo'] === 'string'
  );
}
