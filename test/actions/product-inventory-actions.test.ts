// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductsAction,
  getProductBySkuAction,
  updateStockAction,
  transferStockAction,
  getTransactionHistoryAction,
} from '@/actions/product-inventory-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';

const mockRepo = {
  getProducts: vi.fn(),
  getProductBySku: vi.fn(),
  updateStock: vi.fn(),
  transferStock: vi.fn(),
  getTransactionHistory: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/infrastructure/repositories', () => ({
  SupabaseInventoryRepository: vi.fn().mockImplementation(function (this: any) {
    return mockRepo;
  }),
}));

describe('Product Inventory Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getProductsAction', () => {
    it('should return products on success', async () => {
      const products = [{ sku: 'P1', name: 'Product 1', qty: 10 }];
      mockRepo.getProducts.mockResolvedValue(products);

      const result = await getProductsAction();

      expect(result.success).toBe(true);
      expect(result.data?.products).toEqual(products);
      expect(mockRepo.getProducts).toHaveBeenCalled();
    });

    it('should return fail on error', async () => {
      mockRepo.getProducts.mockRejectedValue(new Error('DB error'));

      const result = await getProductsAction();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch products');
    });
  });

  describe('getProductBySkuAction', () => {
    it('should return product when found', async () => {
      const product = { sku: 'P1', name: 'Product 1', qty: 10 };
      mockRepo.getProductBySku.mockResolvedValue(product);

      const result = await getProductBySkuAction('P1');

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(product);
      expect(mockRepo.getProductBySku).toHaveBeenCalledWith('P1');
    });

    it('should return fail when product not found', async () => {
      mockRepo.getProductBySku.mockResolvedValue(null);

      const result = await getProductBySkuAction('MISSING');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return fail on error', async () => {
      mockRepo.getProductBySku.mockRejectedValue(new Error('Network error'));

      const result = await getProductBySkuAction('P1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch product');
    });
  });

  describe('updateStockAction', () => {
    it('should return ok when update succeeds', async () => {
      const updated = { sku: 'P1', name: 'P1', qty: 20 };
      mockRepo.updateStock.mockResolvedValue({ success: true, data: updated });

      const result = await updateStockAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(updated);
      expect(mockRepo.updateStock).toHaveBeenCalledWith('P1', 20);
    });

    it('should return fail when repo returns success false', async () => {
      mockRepo.updateStock.mockResolvedValue({ success: false, error: 'Concurrent update' });

      const result = await updateStockAction('P1', 20);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Concurrent update');
    });
  });

  describe('transferStockAction', () => {
    it('should return ok when transfer succeeds', async () => {
      const tx = { sku: 'P1', type: 'TRANSFER' };
      mockRepo.transferStock.mockResolvedValue({ success: true, data: tx });

      const result = await transferStockAction('P1', 'A1', 'A2', 5, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.transaction).toEqual(tx);
      expect(mockRepo.transferStock).toHaveBeenCalledWith('P1', 'A1', 'A2', 5, 'user-1');
    });

    it('should return fail when repo returns success false', async () => {
      mockRepo.transferStock.mockResolvedValue({ success: false, error: 'Insufficient stock' });

      const result = await transferStockAction('P1', 'A1', 'A2', 5, 'user-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient stock');
    });
  });

  describe('getTransactionHistoryAction', () => {
    it('should return transactions on success', async () => {
      const transactions = [{ sku: 'P1', type: 'ADJUSTMENT', qtyChange: 5 }];
      mockRepo.getTransactionHistory.mockResolvedValue(transactions);

      const result = await getTransactionHistoryAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toEqual(transactions);
      expect(mockRepo.getTransactionHistory).toHaveBeenCalledWith('P1', 20);
    });

    it('should use default limit 50', async () => {
      mockRepo.getTransactionHistory.mockResolvedValue([]);

      await getTransactionHistoryAction('P1');

      expect(mockRepo.getTransactionHistory).toHaveBeenCalledWith('P1', 50);
    });
  });
});
