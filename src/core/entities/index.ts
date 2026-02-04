/**
 * Core Entities - Barrel Export
 *
 * @description
 * Central export point for all domain entities.
 * This follows the Barrel Pattern for cleaner imports.
 *
 * @architecture Clean Architecture - Core Layer (Domain)
 */

export type { Product } from './Product';
export { isProduct } from './Product';
export type { TransactionLog, OperationResult } from './TransactionLog';
export { TransactionType, isTransactionType } from './TransactionLog';
