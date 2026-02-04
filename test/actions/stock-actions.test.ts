// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllProductsAction,
  getProductBySkuAction,
  updateStockAction,
  adjustStockAction,
  transferStockAction,
  checkStockAvailabilityAction,
  getTransactionHistoryAction,
  getLowStockProductsAction,
  getInventorySummaryAction,
} from '@/actions/stock-actions';
import { InventoryService } from '@/services/InventoryService';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('@/infrastructure/RepositoryFactory', () => ({
  RepositoryFactory: {
    getInstance: vi.fn(),
    getRepository: vi.fn(),
    getCurrentProvider: vi.fn(() => 'SUPABASE'),
    reset: vi.fn(),
  },
}));
vi.mock('@/services/InventoryService');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
  RATE_LIMITS: {},
}));
vi.mock('@/lib/error-sanitizer', () => ({
  sanitizeError: vi.fn((err: any) => err?.message || 'Error'),
}));

describe('Stock Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabase.auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: createMockUser() } }),
    };

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getAllProductsAction', () => {
    it('should return products on success', async () => {
      const products = [{ sku: 'P1', name: 'Product 1', qty: 10 }];
      vi.mocked(InventoryService.getAllProducts).mockResolvedValue(products);

      const result = await getAllProductsAction();

      expect(result.success).toBe(true);
      expect(result.data?.products).toEqual(products);
      expect(result.data?.count).toBe(1);
    });

    it('should return fail on error', async () => {
      vi.mocked(InventoryService.getAllProducts).mockRejectedValue(new Error('DB error'));

      const result = await getAllProductsAction();

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('getProductBySkuAction', () => {
    it('should return product when found', async () => {
      const product = { sku: 'P1', name: 'Product 1', qty: 10 };
      vi.mocked(InventoryService.getProductBySku).mockResolvedValue(product);

      const result = await getProductBySkuAction('P1');

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(product);
    });

    it('should return fail when product not found', async () => {
      vi.mocked(InventoryService.getProductBySku).mockResolvedValue(null);

      const result = await getProductBySkuAction('MISSING');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should return fail when SKU is empty', async () => {
      const result = await getProductBySkuAction('');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
    });

    it('should return fail when SKU is whitespace', async () => {
      const result = await getProductBySkuAction('   ');

      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
    });
  });

  describe('updateStockAction', () => {
    it('should return ok when update succeeds', async () => {
      const updated = { sku: 'P1', name: 'P1', qty: 20 };
      vi.mocked(InventoryService.updateStock).mockResolvedValue({ success: true, data: updated });

      const result = await updateStockAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.product).toEqual(updated);
    });

    it('should return fail when SKU is empty', async () => {
      const result = await updateStockAction('', 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
    });

    it('should return fail for invalid quantity', async () => {
      const result = await updateStockAction('P1', NaN);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid quantity');
    });

    it('should return fail for negative quantity', async () => {
      const result = await updateStockAction('P1', -1);

      expect(result.success).toBe(false);
      expect(result.message).toContain('negative');
    });

    it('should return fail when service returns success false', async () => {
      vi.mocked(InventoryService.updateStock).mockResolvedValue({
        success: false,
        error: 'Conflict',
      });

      const result = await updateStockAction('P1', 15);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Conflict');
    });

    it('should pass expectedCurrentQty when options object provided', async () => {
      vi.mocked(InventoryService.updateStock).mockResolvedValue({
        success: true,
        data: { sku: 'P1', qty: 15 },
      });

      await updateStockAction('P1', 15, { expectedCurrentQty: 10 });

      expect(InventoryService.updateStock).toHaveBeenCalledWith('P1', 15, {
        expectedCurrentQty: 10,
      });
    });
  });

  describe('adjustStockAction', () => {
    it('should return ok when adjust succeeds', async () => {
      const input = { sku: 'P1', qtyChange: 5, reason: 'Count', performedBy: 'u1' };
      const tx = { sku: 'P1', type: 'ADJUSTMENT', qtyChange: 5 };
      vi.mocked(InventoryService.adjustStock).mockResolvedValue({ success: true, data: tx });

      const result = await adjustStockAction(input);

      expect(result.success).toBe(true);
      expect(result.data?.transaction).toEqual(tx);
    });

    it('should return fail when SKU is empty', async () => {
      const result = await adjustStockAction({
        sku: '',
        qtyChange: 5,
        reason: 'R',
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
    });

    it('should return fail when reason is empty', async () => {
      const result = await adjustStockAction({
        sku: 'P1',
        qtyChange: 5,
        reason: '',
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Reason is required');
    });

    it('should return fail when performedBy is empty', async () => {
      const result = await adjustStockAction({
        sku: 'P1',
        qtyChange: 5,
        reason: 'R',
        performedBy: '',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('User information');
    });

    it('should return fail for invalid qtyChange', async () => {
      const result = await adjustStockAction({
        sku: 'P1',
        qtyChange: NaN,
        reason: 'R',
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid quantity');
    });
  });

  describe('transferStockAction', () => {
    it('should return ok when transfer succeeds', async () => {
      const input = { sku: 'P1', fromLocation: 'A1', toLocation: 'A2', qty: 5, performedBy: 'u1' };
      const tx = { sku: 'P1', type: 'TRANSFER' };
      vi.mocked(InventoryService.transferStock).mockResolvedValue({ success: true, data: tx });

      const result = await transferStockAction(input);

      expect(result.success).toBe(true);
      expect(result.data?.transaction).toEqual(tx);
    });

    it('should return fail when fromLocation is empty', async () => {
      const result = await transferStockAction({
        sku: 'P1',
        fromLocation: '',
        toLocation: 'A2',
        qty: 5,
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Source location');
    });

    it('should return fail when toLocation is empty', async () => {
      const result = await transferStockAction({
        sku: 'P1',
        fromLocation: 'A1',
        toLocation: '',
        qty: 5,
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Destination location');
    });

    it('should return fail when qty is invalid', async () => {
      const result = await transferStockAction({
        sku: 'P1',
        fromLocation: 'A1',
        toLocation: 'A2',
        qty: 0,
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/quantity|greater than 0/i);
    });

    it('should return fail when from and to location are same', async () => {
      const result = await transferStockAction({
        sku: 'P1',
        fromLocation: 'A1',
        toLocation: 'A1',
        qty: 5,
        performedBy: 'u1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/different|Source and destination/i);
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

    it('should return fail when SKU empty', async () => {
      const result = await checkStockAvailabilityAction('', 5);
      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
    });

    it('should return fail when requiredQty invalid', async () => {
      const result = await checkStockAvailabilityAction('P1', 0);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/greater than 0|Required quantity/i);
    });
  });

  describe('getTransactionHistoryAction', () => {
    it('should return transactions on success', async () => {
      const transactions = [{ sku: 'P1', type: 'ADJUSTMENT', qtyChange: 5 }];
      vi.mocked(InventoryService.getTransactionHistory).mockResolvedValue(transactions);

      const result = await getTransactionHistoryAction('P1', 20);

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toEqual(transactions);
      expect(result.data?.count).toBe(1);
    });

    it('should return fail when SKU empty', async () => {
      const result = await getTransactionHistoryAction('', 50);
      expect(result.success).toBe(false);
      expect(result.message).toContain('SKU is required');
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
});
