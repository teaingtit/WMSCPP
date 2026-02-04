/**
 * Unit Tests for InventoryService
 *
 * @description
 * Comprehensive test suite for InventoryService using mocked IInventoryRepository.
 * Tests cover success scenarios, business rule violations, and error handling.
 *
 * @testing-framework Vitest
 * @pattern Unit Testing with Mocks
 */

// Mock server-only before imports that use it
vi.mock('server-only', () => {
  return {};
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '@/services/InventoryService';
import { RepositoryFactory } from '@/infrastructure/RepositoryFactory';
import type { IInventoryRepository, Product, OperationResult } from '@/core';
import { TransactionLog, TransactionType } from '@/core';

// Mock the RepositoryFactory module
vi.mock('@/infrastructure/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: vi.fn(),
    getRepository: vi.fn(),
    getCurrentProvider: vi.fn(() => 'SUPABASE'),
    reset: vi.fn(),
  },
}));

describe('InventoryService', () => {
  // Mock repository instance
  let mockRepository: IInventoryRepository;

  // Sample test data
  const mockProduct: Product = {
    sku: 'TEST-001',
    name: 'Test Product',
    qty: 100,
    location: 'WH-A-01',
    batchNo: 'BATCH-2026-001',
  };

  const mockLowStockProduct: Product = {
    sku: 'LOW-001',
    name: 'Low Stock Product',
    qty: 5,
    location: 'WH-A-02',
    batchNo: 'BATCH-2026-002',
  };

  const mockTransactionLog: TransactionLog = {
    sku: 'TEST-001',
    type: TransactionType.ADJUSTMENT,
    qtyChange: 10,
    batchNo: 'BATCH-2026-001',
    performedBy: 'test-user',
    timestamp: '2026-02-04T00:00:00.000Z',
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create mock repository with all required methods
    mockRepository = {
      getProducts: vi.fn(),
      getProductBySku: vi.fn(),
      updateStock: vi.fn(),
      logTransaction: vi.fn(),
      getTransactionHistory: vi.fn(),
      transferStock: vi.fn(),
    };

    // Configure RepositoryFactory to return our mock
    vi.mocked(RepositoryFactory.getInstance).mockResolvedValue(mockRepository);
    vi.mocked(RepositoryFactory.getRepository).mockResolvedValue(mockRepository);
  });

  // ============================================================================
  // getAllProducts Tests
  // ============================================================================
  describe('getAllProducts', () => {
    it('should successfully fetch all products', async () => {
      // Arrange
      const mockProducts = [mockProduct, mockLowStockProduct];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(mockProducts);

      // Act
      const result = await InventoryService.getAllProducts();

      // Assert
      expect(result).toEqual(mockProducts);
      expect(mockRepository.getProducts).toHaveBeenCalledTimes(1);
      expect(mockRepository.getProducts).toHaveBeenCalledWith();
    });

    it('should return empty array when no products exist', async () => {
      // Arrange
      vi.mocked(mockRepository.getProducts).mockResolvedValue([]);

      // Act
      const result = await InventoryService.getAllProducts();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when repository fails', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      vi.mocked(mockRepository.getProducts).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(InventoryService.getAllProducts()).rejects.toThrow(errorMessage);
    });
  });

  // ============================================================================
  // getProductBySku Tests
  // ============================================================================
  describe('getProductBySku', () => {
    it('should successfully fetch product by SKU', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      const result = await InventoryService.getProductBySku('TEST-001');

      // Assert
      expect(result).toEqual(mockProduct);
      expect(mockRepository.getProductBySku).toHaveBeenCalledTimes(1);
      expect(mockRepository.getProductBySku).toHaveBeenCalledWith('TEST-001');
    });

    it('should normalize SKU to uppercase', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      await InventoryService.getProductBySku('test-001');

      // Assert
      expect(mockRepository.getProductBySku).toHaveBeenCalledWith('TEST-001');
    });

    it('should trim whitespace from SKU', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      await InventoryService.getProductBySku('  TEST-001  ');

      // Assert
      expect(mockRepository.getProductBySku).toHaveBeenCalledWith('TEST-001');
    });

    it('should return null when product not found', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(null);

      // Act
      const result = await InventoryService.getProductBySku('NONEXISTENT');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when SKU is empty', async () => {
      // Act & Assert
      await expect(InventoryService.getProductBySku('')).rejects.toThrow('SKU is required');
      await expect(InventoryService.getProductBySku('   ')).rejects.toThrow('SKU is required');
    });
  });

  // ============================================================================
  // updateStock Tests (Success Scenarios)
  // ============================================================================
  describe('updateStock - Success Scenarios', () => {
    it('should successfully update stock quantity', async () => {
      // Arrange
      const updatedProduct = { ...mockProduct, qty: 150 };
      const successResult: OperationResult<Product> = {
        success: true,
        data: updatedProduct,
      };
      vi.mocked(mockRepository.updateStock).mockResolvedValue(successResult);

      // Act
      const result = await InventoryService.updateStock('TEST-001', 150);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.qty).toBe(150);
      // Service passes options even if undefined
      expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-001', 150, undefined);
    });

    it('should accept zero as valid quantity', async () => {
      // Arrange
      const zeroQtyProduct = { ...mockProduct, qty: 0 };
      const successResult: OperationResult<Product> = {
        success: true,
        data: zeroQtyProduct,
      };
      vi.mocked(mockRepository.updateStock).mockResolvedValue(successResult);

      // Act
      const result = await InventoryService.updateStock('TEST-001', 0);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.qty).toBe(0);
    });
  });

  // ============================================================================
  // updateStock Tests (Business Rule Violations)
  // ============================================================================
  describe('updateStock - Business Rule Violations', () => {
    it('should reject negative quantity', async () => {
      // Act
      const result = await InventoryService.updateStock('TEST-001', -10);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Quantity cannot be negative');
      expect(mockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should reject empty SKU', async () => {
      // Act
      const result = await InventoryService.updateStock('', 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU is required');
      expect(mockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only SKU', async () => {
      // Act
      const result = await InventoryService.updateStock('   ', 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU is required');
    });
  });

  // ============================================================================
  // updateStock Tests (Error Handling)
  // ============================================================================
  describe('updateStock - Error Handling', () => {
    it('should handle repository failure gracefully', async () => {
      // Arrange
      const errorResult: OperationResult<Product> = {
        success: false,
        error: 'Product not found in database',
      };
      vi.mocked(mockRepository.updateStock).mockResolvedValue(errorResult);

      // Act
      const result = await InventoryService.updateStock('INVALID-SKU', 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found in database');
    });

    it('should propagate database connection errors', async () => {
      // Arrange
      vi.mocked(mockRepository.updateStock).mockRejectedValue(
        new Error('Database connection timeout'),
      );

      // Act & Assert
      await expect(InventoryService.updateStock('TEST-001', 100)).rejects.toThrow(
        'Database connection timeout',
      );
    });
  });

  // ============================================================================
  // adjustStock Tests (Success Scenarios)
  // ============================================================================
  describe('adjustStock - Success Scenarios', () => {
    it('should successfully increase stock', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      const updatedProduct = { ...mockProduct, qty: 110 };
      vi.mocked(mockRepository.updateStock).mockResolvedValue({
        success: true,
        data: updatedProduct,
      });

      vi.mocked(mockRepository.logTransaction).mockResolvedValue({
        success: true,
        data: { ...mockTransactionLog, qtyChange: 10 },
      });

      // Act
      const result = await InventoryService.adjustStock({
        sku: 'TEST-001',
        qtyChange: 10,
        reason: 'Stock replenishment',
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-001', 110, {
        expectedCurrentQty: 100,
      });
      expect(mockRepository.logTransaction).toHaveBeenCalled();
    });

    it('should successfully decrease stock', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      const updatedProduct = { ...mockProduct, qty: 90 };
      vi.mocked(mockRepository.updateStock).mockResolvedValue({
        success: true,
        data: updatedProduct,
      });

      vi.mocked(mockRepository.logTransaction).mockResolvedValue({
        success: true,
        data: { ...mockTransactionLog, qtyChange: -10 },
      });

      // Act
      const result = await InventoryService.adjustStock({
        sku: 'TEST-001',
        qtyChange: -10,
        reason: 'Damaged goods',
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockRepository.updateStock).toHaveBeenCalledWith('TEST-001', 90, {
        expectedCurrentQty: 100,
      });
    });
  });

  // ============================================================================
  // adjustStock Tests (Business Rule Violations)
  // ============================================================================
  describe('adjustStock - Business Rule Violations', () => {
    it('should reject adjustment that would result in negative stock', async () => {
      // Arrange - Product has 100 units, trying to remove 150
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      const result = await InventoryService.adjustStock({
        sku: 'TEST-001',
        qtyChange: -150,
        reason: 'Trying to remove too many',
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
      expect(result.error).toContain('Current: 100');
      expect(result.error).toContain('Change: -150');
      expect(mockRepository.updateStock).not.toHaveBeenCalled();
    });

    it('should reject adjustment for non-existent product', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(null);

      // Act
      const result = await InventoryService.adjustStock({
        sku: 'NONEXISTENT',
        qtyChange: 10,
        reason: 'Test',
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject adjustment with missing required fields', async () => {
      // Test missing SKU
      let result = await InventoryService.adjustStock({
        sku: '',
        qtyChange: 10,
        reason: 'Test',
        performedBy: 'user-123',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');

      // Test missing reason
      result = await InventoryService.adjustStock({
        sku: 'TEST-001',
        qtyChange: 10,
        reason: '',
        performedBy: 'user-123',
      });
      expect(result.success).toBe(false);

      // Test missing performedBy
      result = await InventoryService.adjustStock({
        sku: 'TEST-001',
        qtyChange: 10,
        reason: 'Test',
        performedBy: '',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // transferStock Tests
  // ============================================================================
  describe('transferStock', () => {
    it('should successfully transfer stock between locations', async () => {
      // Arrange
      const successResult: OperationResult<TransactionLog> = {
        success: true,
        data: {
          ...mockTransactionLog,
          type: TransactionType.TRANSFER,
          fromLocation: 'WH-A-01',
          toLocation: 'WH-B-05',
        },
      };
      vi.mocked(mockRepository.transferStock).mockResolvedValue(successResult);

      // Act
      const result = await InventoryService.transferStock({
        sku: 'TEST-001',
        fromLocation: 'WH-A-01',
        toLocation: 'WH-B-05',
        qty: 50,
        performedBy: 'user-123',
        notes: 'Relocating inventory',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.fromLocation).toBe('WH-A-01');
      expect(result.data?.toLocation).toBe('WH-B-05');
      expect(result.data?.metadata?.['notes']).toBe('Relocating inventory');
    });

    it('should reject transfer with zero quantity', async () => {
      // Act
      const result = await InventoryService.transferStock({
        sku: 'TEST-001',
        fromLocation: 'WH-A-01',
        toLocation: 'WH-B-05',
        qty: 0,
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject transfer to same location', async () => {
      // Act
      const result = await InventoryService.transferStock({
        sku: 'TEST-001',
        fromLocation: 'WH-A-01',
        toLocation: 'WH-A-01',
        qty: 50,
        performedBy: 'user-123',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be different');
    });
  });

  // ============================================================================
  // checkStockAvailability Tests
  // ============================================================================
  describe('checkStockAvailability', () => {
    it('should return available=true when stock is sufficient', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      const result = await InventoryService.checkStockAvailability('TEST-001', 50);

      // Assert
      expect(result.available).toBe(true);
      expect(result.currentQty).toBe(100);
      expect(result.deficit).toBeUndefined();
    });

    it('should return available=false when stock is insufficient', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(mockProduct);

      // Act
      const result = await InventoryService.checkStockAvailability('TEST-001', 150);

      // Assert
      expect(result.available).toBe(false);
      expect(result.currentQty).toBe(100);
      expect(result.deficit).toBe(50); // 150 - 100 = 50
    });

    it('should handle non-existent product', async () => {
      // Arrange
      vi.mocked(mockRepository.getProductBySku).mockResolvedValue(null);

      // Act
      const result = await InventoryService.checkStockAvailability('NONEXISTENT', 10);

      // Assert
      expect(result.available).toBe(false);
      expect(result.currentQty).toBe(0);
      expect(result.deficit).toBe(10);
    });
  });

  // ============================================================================
  // getLowStockProducts Tests
  // ============================================================================
  describe('getLowStockProducts', () => {
    it('should return products below threshold', async () => {
      // Arrange
      const allProducts = [mockProduct, mockLowStockProduct];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(allProducts);

      // Act
      const result = await InventoryService.getLowStockProducts(10);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.sku).toBe('LOW-001');
      expect(result[0]?.qty).toBe(5);
    });

    it('should use default threshold of 10', async () => {
      // Arrange
      const allProducts = [mockProduct, mockLowStockProduct];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(allProducts);

      // Act
      const result = await InventoryService.getLowStockProducts();

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return empty array when all products are above threshold', async () => {
      // Arrange
      vi.mocked(mockRepository.getProducts).mockResolvedValue([mockProduct]);

      // Act
      const result = await InventoryService.getLowStockProducts(50);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // getInventorySummary Tests
  // ============================================================================
  describe('getInventorySummary', () => {
    it('should calculate correct totals', async () => {
      // Arrange
      const products = [
        { ...mockProduct, qty: 100 },
        { ...mockLowStockProduct, qty: 50 },
        { ...mockProduct, sku: 'PROD-003', qty: 25 },
      ];
      vi.mocked(mockRepository.getProducts).mockResolvedValue(products);

      // Act
      const result = await InventoryService.getInventorySummary();

      // Assert
      expect(result.totalItems).toBe(3);
      expect(result.totalQuantity).toBe(175); // 100 + 50 + 25
    });

    it('should handle empty inventory', async () => {
      // Arrange
      vi.mocked(mockRepository.getProducts).mockResolvedValue([]);

      // Act
      const result = await InventoryService.getInventorySummary();

      // Assert
      expect(result.totalItems).toBe(0);
      expect(result.totalQuantity).toBe(0);
    });
  });

  // ============================================================================
  // getTransactionHistory Tests
  // ============================================================================
  describe('getTransactionHistory', () => {
    it('should fetch transaction history successfully', async () => {
      // Arrange
      const mockTransactions = [mockTransactionLog];
      vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue(mockTransactions);

      // Act
      const result = await InventoryService.getTransactionHistory('TEST-001', 50);

      // Assert
      expect(result).toEqual(mockTransactions);
      expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('TEST-001', 50);
    });

    it('should use default limit of 50', async () => {
      // Arrange
      vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

      // Act
      await InventoryService.getTransactionHistory('TEST-001');

      // Assert
      expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('TEST-001', 50);
    });

    it('should clamp limit to maximum of 1000', async () => {
      // Arrange
      vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

      // Act - Request more than max
      await InventoryService.getTransactionHistory('TEST-001', 5000);

      // Assert - Should clamp to 1000
      expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('TEST-001', 1000);
    });

    it('should clamp invalid limit values to valid range', async () => {
      // Arrange
      vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

      // Act & Assert - Zero (falsy) should fall back to default 50
      await InventoryService.getTransactionHistory('TEST-001', 0);
      expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('TEST-001', 50);

      vi.clearAllMocks();
      vi.mocked(mockRepository.getTransactionHistory).mockResolvedValue([]);

      // Act & Assert - Negative should clamp to 1
      await InventoryService.getTransactionHistory('TEST-001', -10);
      expect(mockRepository.getTransactionHistory).toHaveBeenCalledWith('TEST-001', 1);
    });
  });
});
