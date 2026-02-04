/**
 * MSSQL Implementation: IInventoryRepository
 *
 * @description
 * Adapter that implements the IInventoryRepository interface using Microsoft SQL Server.
 * Typically used for reading from legacy ERP systems or external databases.
 *
 * @architecture Clean Architecture - Infrastructure Layer (Adapter)
 * @pattern Repository Pattern + Adapter Pattern
 *
 * @warning
 * This implementation is primarily for READ operations from legacy systems.
 * Write operations should be carefully managed to avoid data inconsistencies.
 */

import sql from 'mssql';
import type { IInventoryRepository, Product, TransactionLog, OperationResult } from '@/core';
import { TransactionType, isTransactionType } from '@/core';

/**
 * MSSQL Connection Pool Configuration
 */
const config: sql.config = {
  server: process.env['MSSQL_SERVER'] || 'localhost',
  port: parseInt(process.env['MSSQL_PORT'] || '1433'),
  database: process.env['MSSQL_DATABASE'] || '',
  user: process.env['MSSQL_USER'] || '',
  password: process.env['MSSQL_PASSWORD'] || '',
  options: {
    encrypt: process.env['MSSQL_ENCRYPT'] === 'true',
    trustServerCertificate: process.env['MSSQL_TRUST_SERVER_CERTIFICATE'] === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create MSSQL connection pool
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

/** Raw product row shape from MSSQL Products table (after column aliasing) */
interface MSSQLProductRow {
  sku?: string | null;
  name?: string | null;
  qty?: number | null;
  location?: string | null;
  batchNo?: string | null;
}

/**
 * MSSQL-backed implementation of IInventoryRepository
 *
 * @example
 * ```typescript
 * import { MSSQLInventoryRepository } from '@/infrastructure/repositories';
 *
 * export async function syncFromERPAction() {
 *   const repo = new MSSQLInventoryRepository();
 *   const products = await repo.getProducts();
 *   return ok({ products });
 * }
 * ```
 */
export class MSSQLInventoryRepository implements IInventoryRepository {
  /**
   * Maps a raw database row to a Product entity.
   * Ensures null safety and consistent data types.
   */
  private mapToProduct(row: MSSQLProductRow): Product {
    return {
      sku: row.sku ?? '',
      name: row.name ?? '',
      qty: typeof row.qty === 'number' && Number.isFinite(row.qty) ? row.qty : 0,
      location: row.location ?? '',
      batchNo: row.batchNo ?? '',
    };
  }

  async getProducts(): Promise<Product[]> {
    try {
      const poolConnection = await getPool();
      const result = await poolConnection.request().query<MSSQLProductRow>(`
          SELECT 
            SKU as sku,
            ProductName as name,
            Quantity as qty,
            LocationCode as location,
            BatchNumber as batchNo
          FROM Products
          WHERE IsActive = 1
          ORDER BY SKU ASC
        `);

      return (result.recordset ?? []).map((row) => this.mapToProduct(row));
    } catch (error) {
      console.error('[MSSQLInventoryRepository] getProducts error:', error);
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] getProducts stack:', error.stack);
      }
      return [];
    }
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const poolConnection = await getPool();
      const result = await poolConnection.request().input('sku', sql.VarChar, sku)
        .query<MSSQLProductRow>(`
          SELECT 
            SKU as sku,
            ProductName as name,
            Quantity as qty,
            LocationCode as location,
            BatchNumber as batchNo
          FROM Products
          WHERE SKU = @sku AND IsActive = 1
        `);

      const row = result.recordset?.[0];
      return row ? this.mapToProduct(row) : null;
    } catch (error) {
      console.error('[MSSQLInventoryRepository] getProductBySku error:', { sku, error });
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] getProductBySku stack:', error.stack);
      }
      return null;
    }
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

    try {
      const poolConnection = await getPool();

      // Update the stock with optional concurrency check
      const request = poolConnection
        .request()
        .input('sku', sql.VarChar, sku)
        .input('qty', sql.Int, qty);

      let updateSql = `
                UPDATE Products
                SET Quantity = @qty, UpdatedAt = GETDATE()
                WHERE SKU = @sku
            `;

      if (options?.expectedCurrentQty !== undefined) {
        request.input('expected', sql.Int, options.expectedCurrentQty);
        updateSql += ` AND Quantity = @expected`;
      }

      const result = await request.query(updateSql);

      if (result.rowsAffected[0] === 0) {
        // Check if directly checking availability helps debug
        const exists = await this.getProductBySku(sku);
        if (!exists) {
          return { success: false, error: `Product with SKU ${sku} not found` };
        }
        return {
          success: false,
          error: `Race Condition detected: Stock has changed since last read. Please try again.`,
        };
      }

      // Fetch updated product
      const product = await this.getProductBySku(sku);

      if (!product) {
        return {
          success: false,
          error: `Product with SKU ${sku} not found after update`,
        };
      }

      return {
        success: true,
        data: product,
      };
    } catch (error) {
      console.error('[MSSQLInventoryRepository] updateStock error:', { sku, error });
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] updateStock stack:', error.stack);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock',
      };
    }
  }

  async logTransaction(transactionData: TransactionLog): Promise<OperationResult<TransactionLog>> {
    try {
      const poolConnection = await getPool();

      await poolConnection
        .request()
        .input('sku', sql.VarChar, transactionData.sku)
        .input('type', sql.VarChar, transactionData.type)
        .input('qtyChange', sql.Int, transactionData.qtyChange)
        .input('fromLocation', sql.VarChar, transactionData.fromLocation || null)
        .input('toLocation', sql.VarChar, transactionData.toLocation || null)
        .input('batchNo', sql.VarChar, transactionData.batchNo)
        .input('performedBy', sql.VarChar, transactionData.performedBy)
        .input('metadata', sql.NVarChar, JSON.stringify(transactionData.metadata || {}))
        .input('timestamp', sql.DateTime2, new Date(transactionData.timestamp)).query(`
          INSERT INTO TransactionLogs (
            SKU, Type, QtyChange, FromLocation, ToLocation,
            BatchNumber, PerformedBy, Metadata, Timestamp
          )
          VALUES (
            @sku, @type, @qtyChange, @fromLocation, @toLocation,
            @batchNo, @performedBy, @metadata, @timestamp
          )
        `);

      return {
        success: true,
        data: transactionData,
      };
    } catch (error) {
      console.error('[MSSQLInventoryRepository] logTransaction error:', {
        sku: transactionData.sku,
        type: transactionData.type,
        error,
      });
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] logTransaction stack:', error.stack);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log transaction',
      };
    }
  }

  async getTransactionHistory(sku: string, limit: number = 50): Promise<TransactionLog[]> {
    try {
      const poolConnection = await getPool();
      const result = await poolConnection
        .request()
        .input('sku', sql.VarChar, sku)
        .input('limit', sql.Int, limit).query<{
        SKU: string;
        Type: string;
        QtyChange: number;
        FromLocation: string | null;
        ToLocation: string | null;
        BatchNumber: string;
        PerformedBy: string;
        Metadata: string;
        Timestamp: Date;
      }>(`
          SELECT TOP (@limit)
            SKU, Type, QtyChange, FromLocation, ToLocation,
            BatchNumber, PerformedBy, Metadata, Timestamp
          FROM TransactionLogs
          WHERE SKU = @sku
          ORDER BY Timestamp DESC
        `);

      return (result.recordset ?? []).map((row) => {
        let metadata: Record<string, unknown> = {};
        try {
          metadata =
            typeof row.Metadata === 'string'
              ? (JSON.parse(row.Metadata || '{}') as Record<string, unknown>)
              : {};
        } catch {
          console.warn(
            '[MSSQLInventoryRepository] getTransactionHistory invalid Metadata for SKU:',
            row.SKU,
          );
        }
        const type = isTransactionType(row.Type) ? row.Type : TransactionType.ADJUSTMENT;
        const log: TransactionLog = {
          sku: row.SKU ?? '',
          type,
          qtyChange:
            typeof row.QtyChange === 'number' && Number.isFinite(row.QtyChange) ? row.QtyChange : 0,
          batchNo: row.BatchNumber ?? '',
          performedBy: row.PerformedBy ?? '',
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          timestamp:
            row.Timestamp instanceof Date ? row.Timestamp.toISOString() : new Date().toISOString(),
        };
        if (row.FromLocation) log.fromLocation = row.FromLocation;
        if (row.ToLocation) log.toLocation = row.ToLocation;
        return log;
      });
    } catch (error) {
      console.error('[MSSQLInventoryRepository] getTransactionHistory error:', {
        sku,
        limit,
        error,
      });
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] getTransactionHistory stack:', error.stack);
      }
      return [];
    }
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

    try {
      const poolConnection = await getPool();

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
      if (product.qty !== qty) {
        return {
          success: false,
          error:
            'Partial transfers are not supported in this schema version. You must transfer the entire quantity.',
        };
      }

      // Update location
      await poolConnection
        .request()
        .input('sku', sql.VarChar, sku)
        .input('toLocation', sql.VarChar, toLocation).query(`
          UPDATE Products
          SET LocationCode = @toLocation, UpdatedAt = GETDATE()
          WHERE SKU = @sku
        `);

      // Log transaction
      const transactionLog: TransactionLog = {
        sku,
        type: 'TRANSFER' as TransactionType,
        qtyChange: 0,
        fromLocation,
        toLocation,
        batchNo: product.batchNo,
        performedBy,
        timestamp: new Date().toISOString(),
      };

      return this.logTransaction(transactionLog);
    } catch (error) {
      console.error('[MSSQLInventoryRepository] transferStock error:', {
        sku,
        fromLocation,
        toLocation,
        error,
      });
      if (error instanceof Error) {
        console.error('[MSSQLInventoryRepository] transferStock stack:', error.stack);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }
}

/**
 * Gracefully close the MSSQL connection pool
 * Call this during application shutdown
 */
export async function closeMSSQLPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
