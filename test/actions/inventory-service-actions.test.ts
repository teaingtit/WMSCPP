// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductsServiceAction,
  getProductBySkuServiceAction,
  updateStockServiceAction,
  adjustStockServiceAction,
  transferStockServiceAction,
  getTransactionHistoryServiceAction,
  checkStockAvailabilityAction,
  getLowStockProductsAction,
  getInventorySummaryAction,
  syncFromERPServiceAction,
} from '@/actions/inventory-service-actions';
import { InventoryService } from '@/services/InventoryService';

vi.mock('@/infrastructure/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: vi.fn(),
    getRepository: vi.fn(),
    getCurrentProvider: vi.fn(() => 'SUPABASE'),
    reset: vi.fn(),
  },
}));
vi.mock('@/services/InventoryService');

describe('Inventory Service Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProductsServiceAction', () => {
    it('should return products on success', async () => {
      const products = [{ sku: 'P1', name: 'Product 1', qty: 10 }];
      vi.mocked(InventoryService.getAllProducts).mockResolvedValue(products);

      const result = await getProductsServiceAction();

      expect(result.success).toBe(true);
      expect(result.data?.products).toEqual(products);
      expect(InventoryService.getAllProducts).toHaveBeenCalledOnce();
    });

    it('should return fail on error', async () => {
      vi.mocked(InventoryService.getAllProducts).mockRejectedValue(new Error('DB error'));

      const result = await getProductsServiceAction();

      expect(result.success).toBe(false);
      expect(result.message).toContain('DB error');
    });
  });

  describe('getProductBySkuServiceAction', () => {
    it('should return product when found', async () => {
      const product = { sku: 'P1', name: 'Product 1', qty: 10 };
      vi.mocked(InventoryService.getProductBySku).mockResolvedValue(product);

      const result = await getProductBySkuServiceAction('P1');

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(product);
      expect(InventoryService.getProductBySku).toHaveBeenCalledWith('P1');
    });

    it('should return fail when product not found', async () => {
      vi.mocked(InventoryService.getProductBySku).mockResolvedValue(null);

      const result = await getProductBySkuServiceAction('MISSING');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return fail on error', async () => {
      vi.mocked(InventoryService.getProductBySku).mockRejectedValue(new Error('Network error'));

      const result = await getProductBySkuServiceAction('P1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });
  });

  describe('updateStockServiceAction', () => {
    it('should return ok when update succeeds', async () => {
      const updated = { sku: 'P1', name: 'P1', qty: 20 };
      vi.mocked(InventoryService.updateStock).mockResolvedValue({ success: true, data: updated });

      const result = await updateStockServiceAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(updated);
      expect(InventoryService.updateStock).toHaveBeenCalledWith('P1', 20, {
        expectedCurrentQty: undefined,
      });
    });

    it('should return fail when service returns success false', async () => {
      vi.mocked(InventoryService.updateStock).mockResolvedValue({
        success: false,
        error: 'Concurrent update',
      });

      const result = await updateStockServiceAction('P1', 20);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Concurrent update');
    });

    it('should pass expectedCurrentQty when provided', async () => {
      vi.mocked(InventoryService.updateStock).mockResolvedValue({
        success: true,
        data: { sku: 'P1', qty: 15 },
      });

      await updateStockServiceAction('P1', 15, { expectedCurrentQty: 10 });

      expect(InventoryService.updateStock).toHaveBeenCalledWith('P1', 15, {
        expectedCurrentQty: 10,
      });
    });
  });

  describe('adjustStockServiceAction', () => {
    it('should return ok when adjust succeeds', async () => {
      const input = { sku: 'P1', qtyChange: 5, reason: 'Count', performedBy: 'u1' };
      const tx = { sku: 'P1', type: 'ADJUSTMENT', qtyChange: 5 };
      vi.mocked(InventoryService.adjustStock).mockResolvedValue({ success: true, data: tx });

      const result = await adjustStockServiceAction(input);

      expect(result.success).toBe(true);
      expect(result.data?.transaction).toEqual(tx);
      expect(InventoryService.adjustStock).toHaveBeenCalledWith(input);
    });

    it('should return fail when service returns success false', async () => {
      vi.mocked(InventoryService.adjustStock).mockResolvedValue({
        success: false,
        error: 'Insufficient stock',
      });

      const result = await adjustStockServiceAction({
        sku: 'P1',
        qtyChange: -100,
        reason: 'Adjust',
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient stock');
    });
  });

  describe('transferStockServiceAction', () => {
    it('should return ok when transfer succeeds', async () => {
      const input = { sku: 'P1', fromLocation: 'A1', toLocation: 'A2', qty: 5, performedBy: 'u1' };
      const tx = { sku: 'P1', type: 'TRANSFER' };
      vi.mocked(InventoryService.transferStock).mockResolvedValue({ success: true, data: tx });

      const result = await transferStockServiceAction(input);

      expect(result.success).toBe(true);
      expect(result.data?.transaction).toEqual(tx);
      expect(InventoryService.transferStock).toHaveBeenCalledWith(input);
    });
  });

  describe('getTransactionHistoryServiceAction', () => {
    it('should return transactions on success', async () => {
      const transactions = [{ sku: 'P1', type: 'ADJUSTMENT', qtyChange: 5 }];
      vi.mocked(InventoryService.getTransactionHistory).mockResolvedValue(transactions);

      const result = await getTransactionHistoryServiceAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toEqual(transactions);
      expect(InventoryService.getTransactionHistory).toHaveBeenCalledWith('P1', 20);
    });

    it('should use default limit 50', async () => {
      vi.mocked(InventoryService.getTransactionHistory).mockResolvedValue([]);

      await getTransactionHistoryServiceAction('P1');

      expect(InventoryService.getTransactionHistory).toHaveBeenCalledWith('P1', 50);
    });
  });

  describe('checkStockAvailabilityAction', () => {
    it('should return available when stock sufficient', async () => {
      vi.mocked(InventoryService.checkStockAvailability).mockResolvedValue({
        available: true,
        currentQty: 50,
        deficit: 0,
      });

      const result = await checkStockAvailabilityAction('P1', 10);

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(true);
      expect(result.message).toContain('Stock available');
    });

    it('should return not available when stock insufficient', async () => {
      vi.mocked(InventoryService.checkStockAvailability).mockResolvedValue({
        available: false,
        currentQty: 5,
        deficit: 5,
      });

      const result = await checkStockAvailabilityAction('P1', 10);

      expect(result.success).toBe(true);
      expect(result.data?.available).toBe(false);
      expect(result.message).toContain('Insufficient stock');
    });
  });

  describe('getLowStockProductsAction', () => {
    it('should return products below threshold', async () => {
      const products = [{ sku: 'LOW', name: 'Low', qty: 2 }];
      vi.mocked(InventoryService.getLowStockProducts).mockResolvedValue(products);

      const result = await getLowStockProductsAction(10);

      expect(result.success).toBe(true);
      expect(result.data?.products).toEqual(products);
      expect(result.data?.threshold).toBe(10);
      expect(InventoryService.getLowStockProducts).toHaveBeenCalledWith(10);
    });
  });

  describe('getInventorySummaryAction', () => {
    it('should return summary on success', async () => {
      const summary = { totalProducts: 10, totalQty: 100 };
      vi.mocked(InventoryService.getInventorySummary).mockResolvedValue(summary);

      const result = await getInventorySummaryAction();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(summary);
    });
  });

  describe('syncFromERPServiceAction', () => {
    it('should return ok when all synced', async () => {
      vi.mocked(InventoryService.syncFromERP).mockResolvedValue({ synced: 5, failed: 0 });

      const result = await syncFromERPServiceAction();

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(5);
      expect(result.data?.failed).toBe(0);
    });

    it('should return ok with message when some failed', async () => {
      vi.mocked(InventoryService.syncFromERP).mockResolvedValue({ synced: 3, failed: 2 });

      const result = await syncFromERPServiceAction();

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/Synced 3.*2 failed/);
    });
  });
});
