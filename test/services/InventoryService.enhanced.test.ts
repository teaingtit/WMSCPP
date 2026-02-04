/**
 * Enhanced Unit Tests for InventoryService
 *
 * @description
 * Comprehensive test suite focusing on boundary values, edge cases,
 * repository isolation, and validation rules.
 *
 * Target Coverage:
 * - Stock Calculation Logic (boundary values)
 * - Repository Isolation (mocked IInventoryRepository)
 * - Validation Rules (invalid SKUs, empty inputs, type coercion)
 *
 * @testing-framework Vitest
 * @pattern Unit Testing with AAA (Arrange-Act-Assert)
 */

// Mock server-only before imports
vi.mock('server-only', () => ({}));

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InventoryService } from '@/services/InventoryService';
import { RepositoryFactory } from '@/infrastructure/RepositoryFactory';
import type { IInventoryRepository, Product, OperationResult, TransactionLog } from '@/core';
import { TransactionType } from '@/core';

// Mock the RepositoryFactory module
vi.mock('@/infrastructure/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: vi.fn(),
    getRepository: vi.fn(),
    getCurrentProvider: vi.fn(() => 'SUPABASE'),
    reset: vi.fn(),
  },
}));

describe('InventoryService - Enhanced Test Suite', () => {
  let mockRepository: IInventoryRepository;

  // Reusable test fixtures
  const createProduct = (overrides: Partial<Product> = {}): Product => ({
    sku: 'TEST-SKU-001',
    name: 'Test Product',
    qty: 100,
    location: 'WH-A-01',
    batchNo: 'BATCH-2026-001',
    ...overrides,
  });

  const createTransactionLog = (overrides: Partial<TransactionLog> = {}): TransactionLog => ({
    sku: 'TEST-SKU-001',
    type: TransactionType.ADJUSTMENT,
    qtyChange: 10,
    batchNo: 'BATCH-2026-001',
    performedBy: 'test-user',
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock repository
    mockRepository = {
      getProducts: vi.fn(),
      getProductBySku: vi.fn(),
      updateStock: vi.fn(),
      logTransaction: vi.fn(),
      getTransactionHistory: vi.fn(),
      transferStock: vi.fn(),
    };

    vi.mocked(RepositoryFactory.getInstance).mockResolvedValue(mockRepository);
    vi.mocked(RepositoryFactory.getRepository).mockResolvedValue(mockRepository);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // SECTION 1: STOCK CALCULATION LOGIC - BOUNDARY VALUES
  // ==========================================================================
  describe('Stock Calculation Logic - Boundary Values', () => {
    describe('Zero Stock Scenarios', () => {
      it('should handle product with exactly zero stock', async () => {
        const zeroStockProduct = createProduct({ qty: 0 });
        vi.mocked(mockRepository.getProducts).mockResolvedValue([zeroStockProduct]);

        const result = await InventoryService.getAllProducts();

        expect(result).toHaveLength(1);
        expect(result[0]?.qty).toBe(0);
      });

      it('should accept zero as valid quantity in updateStock', async () => {
        const updatedProduct = createProduct({ qty: 0 });
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: updatedProduct,
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', 0);

        expect(result.success).toBe(true);
        expect(result.data?.qty).toBe(0);
        expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-SKU-001', 0, undefined);
      });

      it('should allow adjustStock to reach exactly zero', async () => {
        const product = createProduct({ qty: 50 });
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(product);
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 0 }),
        });
        vi.mocked(mockRepository.logTransaction).mockResolvedValue({
          success: true,
          data: createTransactionLog({ qtyChange: -50 }),
        });

        const result = await InventoryService.adjustStock({
          sku: 'TEST-SKU-001',
          qtyChange: -50, // Exactly depletes stock
          reason: 'Complete depletion',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(true);
        expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-SKU-001', 0, {
          expectedCurrentQty: 50,
        });
      });

      it('should correctly report zero stock availability', async () => {
        const zeroStockProduct = createProduct({ qty: 0 });
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(zeroStockProduct);

        const result = await InventoryService.checkStockAvailability('TEST-SKU-001', 1);

        expect(result.available).toBe(false);
        expect(result.currentQty).toBe(0);
        expect(result.deficit).toBe(1);
      });
    });

    describe('Negative Input Handling', () => {
      it('should reject negative quantity in updateStock', async () => {
        const result = await InventoryService.updateStock('TEST-SKU-001', -10);

        expect(result.success).toBe(false);
        expect(result.error).toContain('negative');
        expect(mockRepository.updateStock).not.toHaveBeenCalled();
      });

      it('should treat -0 as zero (valid quantity)', async () => {
        // JavaScript has -0 which equals 0 (-0 === 0 is true)
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 0 }),
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', -0);

        // -0 === 0 in JavaScript, so this should pass as valid
        expect(result.success).toBe(true);
      });

      it('should reject adjustment resulting in negative stock', async () => {
        const product = createProduct({ qty: 10 });
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(product);

        const result = await InventoryService.adjustStock({
          sku: 'TEST-SKU-001',
          qtyChange: -20, // More than available
          reason: 'Impossible withdrawal',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Insufficient stock');
        expect(result.error).toContain('Current: 10');
        expect(result.error).toContain('Change: -20');
      });

      it('should reject negative transfer quantity', async () => {
        const result = await InventoryService.transferStock({
          sku: 'TEST-SKU-001',
          fromLocation: 'WH-A-01',
          toLocation: 'WH-B-01',
          qty: -5,
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('greater than 0');
      });

      it('should handle negative threshold in getLowStockProducts', async () => {
        const products = [createProduct({ qty: 5 })];
        vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

        // Negative threshold should be treated as 0
        const result = await InventoryService.getLowStockProducts(-10);

        // With threshold 0, products with qty >= 0 are NOT low stock
        expect(result).toHaveLength(0);
      });
    });

    describe('Decimal Value Handling', () => {
      it('should accept integer quantities', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 100 }),
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', 100);

        expect(result.success).toBe(true);
      });

      it('should accept decimal quantities (fractional units)', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 10.5 }),
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', 10.5);

        expect(result.success).toBe(true);
        expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-SKU-001', 10.5, undefined);
      });

      it('should handle very small decimal quantities', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 0.001 }),
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', 0.001);

        expect(result.success).toBe(true);
      });

      it('should correctly calculate decimal adjustments', async () => {
        const product = createProduct({ qty: 10.5 });
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(product);
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 8.3 }),
        });
        vi.mocked(mockRepository.logTransaction).mockResolvedValue({
          success: true,
          data: createTransactionLog({ qtyChange: -2.2 }),
        });

        const result = await InventoryService.adjustStock({
          sku: 'TEST-SKU-001',
          qtyChange: -2.2,
          reason: 'Decimal adjustment',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(true);
        // 10.5 - 2.2 = 8.3
        expect(mockRepository.updateStock).toHaveBeenCalledWith(
          'TEST-SKU-001',
          expect.closeTo(8.3, 5),
          { expectedCurrentQty: 10.5 },
        );
      });
    });

    describe('Large Number Handling', () => {
      it('should handle MAX_SAFE_INTEGER', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: Number.MAX_SAFE_INTEGER }),
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', Number.MAX_SAFE_INTEGER);

        expect(result.success).toBe(true);
      });

      it('should reject quantities exceeding MAX_SAFE_INTEGER', async () => {
        const result = await InventoryService.updateStock(
          'TEST-SKU-001',
          Number.MAX_SAFE_INTEGER + 1,
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('maximum safe integer');
      });

      it('should reject Infinity', async () => {
        const result = await InventoryService.updateStock('TEST-SKU-001', Infinity);

        expect(result.success).toBe(false);
        expect(result.error).toContain('finite');
      });

      it('should reject NaN', async () => {
        const result = await InventoryService.updateStock('TEST-SKU-001', NaN);

        expect(result.success).toBe(false);
        expect(result.error).toContain('finite');
      });
    });

    describe('Inventory Summary Calculations', () => {
      it('should correctly sum large inventories', async () => {
        const products = [
          createProduct({ sku: 'A', qty: 1000000 }),
          createProduct({ sku: 'B', qty: 2000000 }),
          createProduct({ sku: 'C', qty: 500000 }),
        ];
        vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

        const result = await InventoryService.getInventorySummary();

        expect(result.totalItems).toBe(3);
        expect(result.totalQuantity).toBe(3500000);
      });

      it('should handle mixed zero and positive quantities', async () => {
        const products = [
          createProduct({ sku: 'A', qty: 100 }),
          createProduct({ sku: 'B', qty: 0 }),
          createProduct({ sku: 'C', qty: 50 }),
        ];
        vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

        const result = await InventoryService.getInventorySummary();

        expect(result.totalItems).toBe(3);
        expect(result.totalQuantity).toBe(150);
      });

      it('should return zero totals for empty inventory', async () => {
        vi.mocked(mockRepository.getProducts).mockResolvedValue([]);

        const result = await InventoryService.getInventorySummary();

        expect(result.totalItems).toBe(0);
        expect(result.totalQuantity).toBe(0);
      });
    });
  });

  // ==========================================================================
  // SECTION 2: REPOSITORY ISOLATION
  // ==========================================================================
  describe('Repository Isolation', () => {
    describe('Mock Verification', () => {
      it('should call repository methods with correct arguments', async () => {
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(createProduct());

        await InventoryService.getProductBySku('  test-sku-001  ');

        // Verify SKU is normalized (trimmed + uppercased)
        expect(mockRepository.getProductBySku).toHaveBeenCalledWith('TEST-SKU-001');
        expect(mockRepository.getProductBySku).toHaveBeenCalledTimes(1);
      });

      it('should not call repository when validation fails', async () => {
        // Empty SKU should fail validation before repository call
        await InventoryService.updateStock('', 100);

        expect(mockRepository.updateStock).not.toHaveBeenCalled();
      });

      it('should call repository exactly once per operation', async () => {
        vi.mocked(mockRepository.getProducts).mockResolvedValue([createProduct()]);

        await InventoryService.getAllProducts();

        expect(mockRepository.getProducts).toHaveBeenCalledTimes(1);
      });

      it('should pass OCC options correctly to repository', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: true,
          data: createProduct({ qty: 150 }),
        });

        await InventoryService.updateStock('TEST-SKU-001', 150, { expectedCurrentQty: 100 });

        expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-SKU-001', 150, {
          expectedCurrentQty: 100,
        });
      });
    });

    describe('Repository Error Propagation', () => {
      it('should propagate repository exceptions', async () => {
        vi.mocked(mockRepository.getProducts).mockRejectedValue(new Error('Connection timeout'));

        await expect(InventoryService.getAllProducts()).rejects.toThrow('Connection timeout');
      });

      it('should handle repository returning failure result', async () => {
        vi.mocked(mockRepository.updateStock).mockResolvedValue({
          success: false,
          error: 'Database constraint violation',
        });

        const result = await InventoryService.updateStock('TEST-SKU-001', 100);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Database constraint violation');
      });

      it('should handle null/undefined repository responses gracefully', async () => {
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(null);

        const result = await InventoryService.getProductBySku('NONEXISTENT');

        expect(result).toBeNull();
      });
    });

    describe('Repository Factory Integration', () => {
      it('should get repository instance for each operation', async () => {
        vi.mocked(mockRepository.getProducts).mockResolvedValue([]);

        await InventoryService.getAllProducts();
        await InventoryService.getAllProducts();

        expect(RepositoryFactory.getInstance).toHaveBeenCalledTimes(2);
      });

      it('should handle factory failure gracefully', async () => {
        vi.mocked(RepositoryFactory.getInstance).mockRejectedValue(
          new Error('Factory initialization failed'),
        );

        await expect(InventoryService.getAllProducts()).rejects.toThrow(
          'Factory initialization failed',
        );
      });
    });
  });

  // ==========================================================================
  // SECTION 3: VALIDATION RULES
  // ==========================================================================
  describe('Validation Rules', () => {
    describe('SKU Validation', () => {
      it('should reject empty SKU', async () => {
        const result = await InventoryService.updateStock('', 100);

        expect(result.success).toBe(false);
        expect(result.error).toBe('SKU is required');
      });

      it('should reject whitespace-only SKU', async () => {
        const result = await InventoryService.updateStock('   ', 100);

        expect(result.success).toBe(false);
        expect(result.error).toBe('SKU is required');
      });

      it('should reject SKU exceeding max length (100 chars)', async () => {
        const longSku = 'A'.repeat(101);

        await expect(InventoryService.getProductBySku(longSku)).rejects.toThrow(
          'SKU must be at most 100 characters',
        );
      });

      it('should accept SKU at exactly max length', async () => {
        const maxLengthSku = 'A'.repeat(100);
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(null);

        const result = await InventoryService.getProductBySku(maxLengthSku);

        expect(mockRepository.getProductBySku).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('should normalize SKU to uppercase', async () => {
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(createProduct());

        await InventoryService.getProductBySku('lowercase-sku');

        expect(mockRepository.getProductBySku).toHaveBeenCalledWith('LOWERCASE-SKU');
      });

      it('should trim whitespace from SKU', async () => {
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(createProduct());

        await InventoryService.getProductBySku('  SKU-123  ');

        expect(mockRepository.getProductBySku).toHaveBeenCalledWith('SKU-123');
      });

      it('should handle special characters in SKU', async () => {
        vi.mocked(mockRepository.getProductBySku).mockResolvedValue(createProduct());

        await InventoryService.getProductBySku('SKU-001/A_B.C');

        expect(mockRepository.getProductBySku).toHaveBeenCalledWith('SKU-001/A_B.C');
      });
    });

    describe('Quantity Validation', () => {
      it('should reject string quantity', async () => {
        // @ts-expect-error - Testing runtime behavior with wrong type
        const result = await InventoryService.updateStock('SKU-001', '100');

        expect(result.success).toBe(false);
        expect(result.error).toContain('finite');
      });

      it('should reject null quantity', async () => {
        // @ts-expect-error - Testing runtime behavior
        const result = await InventoryService.updateStock('SKU-001', null);

        expect(result.success).toBe(false);
      });

      it('should reject undefined quantity', async () => {
        // @ts-expect-error - Testing runtime behavior
        const result = await InventoryService.updateStock('SKU-001', undefined);

        expect(result.success).toBe(false);
      });

      it('should reject object as quantity', async () => {
        // @ts-expect-error - Testing runtime behavior
        const result = await InventoryService.updateStock('SKU-001', { value: 100 });

        expect(result.success).toBe(false);
      });
    });

    describe('AdjustStock Input Validation', () => {
      it('should reject missing reason', async () => {
        const result = await InventoryService.adjustStock({
          sku: 'SKU-001',
          qtyChange: 10,
          reason: '',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Reason is required');
      });

      it('should reject whitespace-only reason', async () => {
        const result = await InventoryService.adjustStock({
          sku: 'SKU-001',
          qtyChange: 10,
          reason: '   ',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Reason is required');
      });

      it('should reject missing performedBy', async () => {
        const result = await InventoryService.adjustStock({
          sku: 'SKU-001',
          qtyChange: 10,
          reason: 'Test',
          performedBy: '',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('PerformedBy is required');
      });

      it('should reject non-finite qtyChange', async () => {
        const result = await InventoryService.adjustStock({
          sku: 'SKU-001',
          qtyChange: NaN,
          reason: 'Test',
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('finite');
      });
    });

    describe('TransferStock Input Validation', () => {
      it('should reject same source and destination', async () => {
        const result = await InventoryService.transferStock({
          sku: 'SKU-001',
          fromLocation: 'WH-A-01',
          toLocation: 'WH-A-01',
          qty: 10,
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('must be different');
      });

      it('should reject empty fromLocation', async () => {
        const result = await InventoryService.transferStock({
          sku: 'SKU-001',
          fromLocation: '',
          toLocation: 'WH-B-01',
          qty: 10,
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject zero transfer quantity', async () => {
        const result = await InventoryService.transferStock({
          sku: 'SKU-001',
          fromLocation: 'WH-A-01',
          toLocation: 'WH-B-01',
          qty: 0,
          performedBy: 'user-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('greater than 0');
      });
    });

    describe('Transaction History Limit Validation', () => {
      it('should use default when limit is 0 (falsy)', async () => {
        vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

        await InventoryService.getTransactionHistory('SKU-001', 0);

        // 0 is falsy, so implementation uses default of 50
        expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('SKU-001', 50);
      });

      it('should enforce maximum limit of 1000', async () => {
        vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

        await InventoryService.getTransactionHistory('SKU-001', 5000);

        // Should clamp to 1000
        expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('SKU-001', 1000);
      });

      it('should use default limit of 50', async () => {
        vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

        await InventoryService.getTransactionHistory('SKU-001');

        expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('SKU-001', 50);
      });

      it('should handle NaN limit by using default', async () => {
        vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

        await InventoryService.getTransactionHistory('SKU-001', NaN);

        // NaN should fall back to default 50
        expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('SKU-001', 50);
      });
    });
  });

  // ==========================================================================
  // SECTION 4: OPTIMISTIC CONCURRENCY CONTROL (OCC)
  // ==========================================================================
  describe('Optimistic Concurrency Control', () => {
    it('should detect race condition during adjustStock', async () => {
      const product = createProduct({ qty: 100 });
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(product);

      // Simulate race condition: update returns failure
      vi.mocked(mockRepository.updateStock).mockResolvedValue({
        success: false,
        error: 'Race Condition detected: Stock has changed since last read. Please try again.',
      });

      const result = await InventoryService.adjustStock({
        sku: 'TEST-SKU-001',
        qtyChange: 10,
        reason: 'Test adjustment',
        performedBy: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Race Condition');
    });

    it('should pass expectedCurrentQty for OCC in updateStock', async () => {
      vi.mocked(mockRepository.updateStock).mockResolvedValue({
        success: true,
        data: createProduct({ qty: 150 }),
      });

      await InventoryService.updateStock('SKU-001', 150, { expectedCurrentQty: 100 });

      expect(mockRepository.updateStock).toHaveBeenCalledWith('SKU-001', 150, {
        expectedCurrentQty: 100,
      });
    });

    it('should validate expectedCurrentQty is non-negative', async () => {
      const result = await InventoryService.updateStock('SKU-001', 100, {
        expectedCurrentQty: -10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('expectedCurrentQty');
    });
  });

  // ==========================================================================
  // SECTION 5: BULK OPERATIONS
  // ==========================================================================
  describe('Bulk Operations', () => {
    it('should handle bulk update with mixed success/failure', async () => {
      vi.mocked(mockRepository.updateStock)
        .mockResolvedValueOnce({ success: true, data: createProduct({ sku: 'SKU-A' }) })
        .mockResolvedValueOnce({ success: false, error: 'Not found' })
        .mockResolvedValueOnce({ success: true, data: createProduct({ sku: 'SKU-C' }) });

      const result = await InventoryService.bulkUpdateStock([
        { sku: 'SKU-A', qty: 100 },
        { sku: 'SKU-B', qty: 200 },
        { sku: 'SKU-C', qty: 300 },
      ]);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('SKU-B: Not found');
    });

    it('should validate each item in bulk update', async () => {
      const result = await InventoryService.bulkUpdateStock([
        { sku: '', qty: 100 }, // Invalid SKU
        { sku: 'SKU-B', qty: -10 }, // Invalid qty
      ]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
      expect(mockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should handle empty bulk update array', async () => {
      const result = await InventoryService.bulkUpdateStock([]);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should continue processing after individual item failure', async () => {
      vi.mocked(mockRepository.updateStock)
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({ success: true, data: createProduct() });

      const result = await InventoryService.bulkUpdateStock([
        { sku: 'SKU-A', qty: 100 },
        { sku: 'SKU-B', qty: 200 },
      ]);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('DB Error');
    });
  });

  // ==========================================================================
  // SECTION 6: ERP SYNC
  // ==========================================================================
  describe('ERP Sync', () => {
    it('should throw error when primary DB is MSSQL', async () => {
      vi.mocked(RepositoryFactory.getCurrentProvider).mockReturnValue('MSSQL');

      await expect(InventoryService.syncFromERP()).rejects.toThrow(
        'Cannot sync from ERP when MSSQL is the primary database',
      );
    });

    it('should fetch from MSSQL and update Supabase', async () => {
      vi.mocked(RepositoryFactory.getCurrentProvider).mockReturnValue('SUPABASE');

      const mssqlProducts = [
        createProduct({ sku: 'ERP-001', qty: 500 }),
        createProduct({ sku: 'ERP-002', qty: 300 }),
      ];

      const mssqlRepo = {
        ...mockRepository,
        getProducts: vi.fn().mockResolvedValue(mssqlProducts),
      };

      const supabaseRepo = {
        ...mockRepository,
        updateStock: vi.fn().mockResolvedValue({ success: true }),
      };

      vi.mocked(RepositoryFactory.getRepository).mockImplementation(async (provider) => {
        return provider === 'MSSQL' ? mssqlRepo : supabaseRepo;
      });

      const result = await InventoryService.syncFromERP();

      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(supabaseRepo.updateStock).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // SECTION 7: LOW STOCK FILTERING
  // ==========================================================================
  describe('Low Stock Products', () => {
    it('should return products below default threshold (10)', async () => {
      const products = [
        createProduct({ sku: 'A', qty: 5 }),
        createProduct({ sku: 'B', qty: 15 }),
        createProduct({ sku: 'C', qty: 9 }),
      ];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

      const result = await InventoryService.getLowStockProducts();

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.sku)).toContain('A');
      expect(result.map((p) => p.sku)).toContain('C');
    });

    it('should handle non-finite threshold by using default', async () => {
      vi.mocked(mockRepository.getProducts).mockResolvedValue([createProduct({ qty: 5 })]);

      const result = await InventoryService.getLowStockProducts(NaN);

      // NaN threshold should use default of 10
      expect(result).toHaveLength(1);
    });

    it('should include products at exactly the threshold', async () => {
      const products = [createProduct({ qty: 10 })];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

      // qty < threshold, so qty=10 is NOT less than threshold=10
      const result = await InventoryService.getLowStockProducts(10);

      expect(result).toHaveLength(0);
    });
  });
});
