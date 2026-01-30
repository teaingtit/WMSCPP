// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchStockForOutbound, submitOutbound } from '@/actions/outbound-actions';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/utils/db-helpers', () => ({
  getWarehouseId: vi.fn((_supabase, id) => Promise.resolve(id)),
}));

vi.mock('@/lib/action-utils', () => ({
  withAuth: vi.fn((handler, _options) => {
    return (data: any, ctx?: any) => handler(data, ctx);
  }),
  processBulkAction: vi.fn(),
}));

describe('Outbound Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    const { getWarehouseId } = await import('@/lib/utils/db-helpers');
    vi.mocked(getWarehouseId).mockImplementation((_s: any, id: string) => Promise.resolve(id));
  });

  describe('searchStockForOutbound', () => {
    it('should return empty array when getWarehouseId returns null', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await searchStockForOutbound('invalid', 'query');

      expect(result).toEqual([]);
    });

    it('should search stocks by product name or SKU', async () => {
      const mockStocks = [
        {
          id: 'stock1',
          quantity: 10,
          products: { id: 'prod1', sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockStocks, error: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await searchStockForOutbound('wh1', 'Product');

      expect(result).toEqual(mockStocks);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await searchStockForOutbound('wh1', 'Product');

      expect(result).toEqual([]);
    });
  });

  describe('submitOutbound', () => {
    it('should successfully submit outbound transaction', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 10,
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Outbound successful' },
        error: null,
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        qty: 5,
        note: 'Test outbound',
      };

      const result = await (submitOutbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_stock', expect.any(Object));
      expect(result.success).toBe(true);
    });

    it('should reject invalid quantity', async () => {
      const mockUser = createMockUser();
      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        qty: -5,
      };

      const result = await (submitOutbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('จำนวนไม่ถูกต้อง');
    });

    it('should reject when quantity exceeds available stock', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 5,
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        qty: 10,
      };

      const result = await (submitOutbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('มากกว่า');
    });

    it('should reject outbound for restricted status', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 10,
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };

      const mockStatus = {
        status: {
          name: 'Blocked',
          effect: 'TRANSACTIONS_PROHIBITED',
        },
      };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        qty: 5,
      };

      const result = await (submitOutbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่สามารถเบิกจ่ายได้');
    });

    it('should allow outbound when entity has no status', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 10,
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };
      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };
      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Deducted' },
        error: null,
      });

      const result = await (submitOutbound as any)(
        { warehouseId: 'wh1', stockId: 'stock1', qty: 5 } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
    });

    it('should allow outbound when status effect is not restricted', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 10,
        products: { name: 'Product 1', sku: 'SKU001', uom: 'PCS' },
        locations: { code: 'L01-P01-1' },
      };
      const mockStatus = {
        status: { name: 'Available', effect: 'NORMAL' },
      };
      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };
      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus }),
      };
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'OK' },
        error: null,
      });

      const result = await (submitOutbound as any)(
        { warehouseId: 'wh1', stockId: 'stock1', qty: 5 } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
    });

    it('should reject when RPC returns success false', async () => {
      const mockUser = createMockUser();
      const mockStockInfo = {
        id: 'stock1',
        quantity: 10,
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStockInfo }),
      };
      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockStockQuery;
        return mockStatusQuery;
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: false, message: 'Insufficient stock' },
        error: null,
      });

      const result = await (submitOutbound as any)(
        { warehouseId: 'wh1', stockId: 'stock1', qty: 5 } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient stock');
    });

    it('should reject when stock not found', async () => {
      const mockUser = createMockUser();
      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockStockQuery);

      await expect(
        (submitOutbound as any)({ warehouseId: 'wh1', stockId: 'invalid', qty: 5 } as any, {
          user: mockUser as any,
          supabase: mockSupabase,
        }),
      ).rejects.toThrow('ไม่พบข้อมูลสต็อก');
    });

    it('should reject NaN or zero qty', async () => {
      const mockUser = createMockUser();
      const result = await (submitOutbound as any)(
        { warehouseId: 'wh1', stockId: 'stock1', qty: 'abc' } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );
      expect(result.success).toBe(false);
      expect(result.message).toContain('จำนวนไม่ถูกต้อง');
    });
  });
});
