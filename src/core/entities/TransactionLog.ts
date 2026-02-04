/**
 * Core Types: Transaction Log
 *
 * @description
 * Domain types for inventory transaction logging.
 * Pure TypeScript with NO external dependencies.
 *
 * @architecture Clean Architecture - Core Layer (Domain)
 */

/**
 * Transaction types in the inventory system
 */
export enum TransactionType {
  /** Stock adjustment (manual correction) */
  ADJUSTMENT = 'ADJUSTMENT',
  /** Inbound transfer from supplier or other warehouse */
  INBOUND = 'INBOUND',
  /** Outbound transfer to customer or other warehouse */
  OUTBOUND = 'OUTBOUND',
  /** Stock transfer between locations within the same warehouse */
  TRANSFER = 'TRANSFER',
  /** Periodic inventory count */
  STOCKTAKE = 'STOCKTAKE',
}

const TRANSACTION_TYPE_VALUES = new Set<string>(Object.values(TransactionType));

/**
 * Type guard for valid TransactionType (avoids unsafe casts from DB)
 */
export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && TRANSACTION_TYPE_VALUES.has(value);
}

/**
 * Transaction log data structure
 */
export interface TransactionLog {
  /**
   * Product SKU involved in the transaction
   */
  sku: string;

  /**
   * Type of transaction
   */
  type: TransactionType;

  /**
   * Quantity change (positive for inbound, negative for outbound)
   */
  qtyChange: number;

  /**
   * Source location (for transfers)
   * @optional Only required for TRANSFER type
   */
  fromLocation?: string;

  /**
   * Destination location (for transfers)
   * @optional Only required for TRANSFER type
   */
  toLocation?: string;

  /**
   * Batch number
   */
  batchNo: string;

  /**
   * User who performed the transaction
   * @example "user_abc123", "admin@example.com"
   */
  performedBy: string;

  /**
   * Additional metadata (JSON-serializable)
   */
  metadata?: Record<string, unknown>;

  /**
   * Transaction timestamp (ISO 8601 format)
   * @example "2026-02-04T00:28:51+07:00"
   */
  timestamp: string;
}

/**
 * Result type for operations that may succeed or fail
 */
export interface OperationResult<T> {
  /**
   * Whether the operation succeeded
   */
  success: boolean;

  /**
   * Result data (only present if success = true)
   */
  data?: T;

  /**
   * Error message (only present if success = false)
   */
  error?: string;
}
