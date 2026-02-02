// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStockById,
  searchStockForTransfer,
  submitTransfer,
  submitCrossTransfer,
  submitBulkTransfer,
  preflightBulkTransfer,
} from '@/actions/transfer-actions';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('@/lib/utils/db-helpers', () => ({
  getWarehouseId: vi.fn((_supabase, id) => Promise.resolve(id)),
}));

vi.mock('@/lib/action-utils', () => ({
  withAuth: vi.fn((handler: (data: any, ctx: any) => any, _options: any) => {
    return async (data: any, ctx?: any) => {
      if (ctx !== undefined) return handler(data, ctx);
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, message: 'Unauthenticated' };
      return handler(data, { user, supabase });
    };
  }),
}));

describe('Transfer Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    const { getWarehouseId } = await import('@/lib/utils/db-helpers');
    vi.mocked(getWarehouseId).mockImplementation((_s: any, id: string) => Promise.resolve(id));
  });

  describe('getStockById', () => {
    it('should fetch stock by ID', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
        locations: { code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getStockById('stock1');

      expect(result).toEqual(mockStock);
    });

    it('should return null when stock not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getStockById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('searchStockForTransfer', () => {
    it('should search stocks for transfer', async () => {
      const mockStocks = [
        {
          id: 'stock1',
          quantity: 10,
          products: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          locations: { code: 'L01-P01-1', warehouse_id: 'wh1' },
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

      const result = await searchStockForTransfer('wh1', 'Product');

      expect(result).toEqual(mockStocks);
    });

    it('should return empty array when warehouse not found', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await searchStockForTransfer('invalid', 'query');

      expect(result).toEqual([]);
    });

    it('should return empty array on search error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await searchStockForTransfer('wh1', 'query');

      expect(result).toEqual([]);
    });
  });

  describe('submitTransfer', () => {
    it('should reject transfer with invalid quantity', async () => {
      const mockUser = createMockUser();

      const formData = {
        warehouseId: 'wh1',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 0,
      };

      const result = await (submitTransfer as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('จำนวนไม่ถูกต้อง');
    });

    it('should reject when warehouse not found', async () => {
      const mockUser = createMockUser();
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      await expect(
        (submitTransfer as any)(
          {
            warehouseId: 'invalid',
            stockId: 'stock1',
            targetLocationId: 'loc2',
            transferQty: 5,
          } as any,
          { user: mockUser as any, supabase: mockSupabase },
        ),
      ).rejects.toThrow('Warehouse Not Found');
    });

    it('should reject when transfer to same location', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        return stockQuery;
      });
      mockSupabase.rpc = vi.fn();

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: 'loc1',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('ตำแหน่งเดิม');
    });

    it('should reject when status blocks transfer', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const statusData = {
        status_definitions: { effect: 'TRANSACTIONS_PROHIBITED', name: 'Blocked' },
      };
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: statusData }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        return stockQuery;
      });

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('สถานะ');
    });

    it('should reject when source stock not found', async () => {
      const mockUser = createMockUser();
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        return stockQuery;
      });

      await expect(
        (submitTransfer as any)(
          {
            warehouseId: 'wh1',
            stockId: 'invalid',
            targetLocationId: 'loc2',
            transferQty: 5,
          } as any,
          { user: mockUser as any, supabase: mockSupabase },
        ),
      ).rejects.toThrow('ไม่พบสต็อกต้นทาง');
    });

    it('should complete internal transfer successfully', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stockQuery;
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('ย้ายสินค้าสำเร็จ');
      expect(result.details?.type).toBe('TRANSFER');
    });

    it('should transfer using lot/cart/level coordinates', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01-P01-Z01' },
      };

      const mockLocLookupQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'loc2' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return mockLocLookupQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stockQuery;
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: '', // No location ID, use coordinates
          targetLot: '02',
          targetCart: '03',
          targetLevel: '1',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('ย้ายสินค้าสำเร็จ');
    });

    it('should reject when target location not found by coordinates', async () => {
      const mockUser = createMockUser();

      const mockLocLookupQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return mockLocLookupQuery;
        return mockLocLookupQuery;
      });

      await expect(
        (submitTransfer as any)(
          {
            warehouseId: 'wh1',
            stockId: 'stock1',
            targetLocationId: '',
            targetLot: '99',
            targetCart: '99',
            targetLevel: '9',
            transferQty: 5,
          } as any,
          { user: mockUser as any, supabase: mockSupabase },
        ),
      ).rejects.toThrow('ไม่พบพิกัดปลายทาง');
    });

    it('should return error when RPC returns failure', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        return stockQuery;
      });
      mockSupabase.rpc = vi
        .fn()
        .mockResolvedValue({ data: { success: false, message: 'Insufficient qty' }, error: null });

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insufficient qty');
    });

    it('should handle other status effects like CLOSED', async () => {
      const mockUser = createMockUser();
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
        locations: { code: 'L01' },
      };
      const statusData = {
        status_definitions: { effect: 'CLOSED', name: 'Closed for Audit' },
      };
      const locQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
      };
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      const statusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: statusData }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations') return locQuery;
        if (table === 'stocks') return stockQuery;
        if (table === 'entity_statuses') return statusQuery;
        return stockQuery;
      });

      const result = await (submitTransfer as any)(
        {
          warehouseId: 'wh1',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('สถานะ');
    });
  });

  describe('submitCrossTransfer', () => {
    it('should reject cross-transfer to same warehouse', async () => {
      const mockUser = createMockUser();
      const formData = {
        sourceWarehouseId: 'wh1',
        targetWarehouseId: 'wh1', // Same warehouse
        stockId: 'stock1',
        transferQty: 5,
      };

      const result = await (submitCrossTransfer as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('แตกต่างจากคลังต้นทาง');
    });

    it('should reject cross-transfer to inactive warehouse', async () => {
      const mockUser = createMockUser();
      const mockTargetWarehouse = {
        id: 'wh2',
        code: 'WH02',
        name: 'Warehouse 2',
        is_active: false,
      };

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTargetWarehouse }),
      } as any);

      const formData = {
        sourceWarehouseId: 'wh1',
        targetWarehouseId: 'wh2',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 5,
      };

      const result = await (submitCrossTransfer as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ปิดใช้งาน');
    });

    it('should reject when quantity exceeds source', async () => {
      const mockUser = createMockUser();
      const mockTargetWarehouse = {
        id: 'wh2',
        code: 'WH02',
        name: 'WH2',
        is_active: true,
      };
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        quantity: 3,
        products: { name: 'P1', uom: 'PCS' },
        locations: { code: 'L01' },
      };

      const stocksChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return stocksChain;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stocksChain;
      });

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'warehouses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTargetWarehouse }),
          } as any;
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { code: 'L02' } }),
          } as any;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sourceStock }),
        } as any;
      });

      const result = await (submitCrossTransfer as any)(
        {
          sourceWarehouseId: 'wh1',
          targetWarehouseId: 'wh2',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 10,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('มากกว่า');
    });

    it('should complete cross-transfer successfully', async () => {
      const mockUser = createMockUser();
      const mockTargetWarehouse = {
        id: 'wh2',
        code: 'WH02',
        name: 'WH2',
        is_active: true,
      };
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        quantity: 10,
        products: { name: 'P1', uom: 'PCS' },
        locations: { code: 'L01' },
      };

      const stocksChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return stocksChain;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stocksChain;
      });

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'warehouses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTargetWarehouse }),
          } as any;
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { code: 'L02' } }),
          } as any;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sourceStock }),
        } as any;
      });
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await (submitCrossTransfer as any)(
        {
          sourceWarehouseId: 'wh1',
          targetWarehouseId: 'wh2',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('ย้ายข้ามคลังสำเร็จ');
      expect(result.details?.type).toBe('CROSS_TRANSFER');
    });

    it('should cross-transfer using lot/cart/level coordinates', async () => {
      const mockUser = createMockUser();
      const mockTargetWarehouse = {
        id: 'wh2',
        code: 'WH02',
        name: 'WH2',
        is_active: true,
      };
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        quantity: 10,
        products: { name: 'P1', uom: 'PCS' },
        locations: { code: 'L01' },
      };

      const stocksChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return stocksChain;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stocksChain;
      });

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'warehouses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTargetWarehouse }),
          } as any;
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { code: 'L02-P03-Z01' } }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'target-loc-id', code: 'L02-P03-Z01' },
            }),
          } as any;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sourceStock }),
        } as any;
      });
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await (submitCrossTransfer as any)(
        {
          sourceWarehouseId: 'wh1',
          targetWarehouseId: 'wh2',
          stockId: 'stock1',
          targetLocationId: '', // No location ID - use coordinates
          targetLot: '02',
          targetCart: '03',
          targetLevel: '1',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(true);
      expect(result.details?.toLocation).toBe('L02-P03-Z01');
    });

    it('should return error when cross-transfer RPC fails', async () => {
      const mockUser = createMockUser();
      const mockTargetWarehouse = {
        id: 'wh2',
        code: 'WH02',
        name: 'WH2',
        is_active: true,
      };
      const sourceStock = {
        product_id: 'prod1',
        location_id: 'loc1',
        quantity: 10,
        products: { name: 'P1', uom: 'PCS' },
        locations: { code: 'L01' },
      };

      const stocksChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: sourceStock }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return stocksChain;
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return stocksChain;
      });

      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'warehouses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTargetWarehouse }),
          } as any;
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { code: 'L02' } }),
          } as any;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sourceStock }),
        } as any;
      });
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { success: false, message: 'Location not found in target warehouse' },
        error: null,
      } as any);

      const result = await (submitCrossTransfer as any)(
        {
          sourceWarehouseId: 'wh1',
          targetWarehouseId: 'wh2',
          stockId: 'stock1',
          targetLocationId: 'loc2',
          transferQty: 5,
        } as any,
        { user: mockUser as any, supabase: mockSupabase },
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Location not found');
    });
  });

  describe('submitBulkTransfer', () => {
    it('should report mixed success and failure', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'loc2', code: 'L02' } }),
          };
        if (table === 'stocks')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                product_id: 'p1',
                location_id: 'loc1',
                products: { name: 'P1', sku: 'SKU1', uom: 'PCS' },
                locations: { code: 'L01' },
              },
            }),
          };
        if (table === 'entity_statuses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          };
        if (table === 'transactions') return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      });
      const { supabaseAdmin } = await import('@/lib/supabase/admin');
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === 'warehouses')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'wh2', code: 'WH02', name: 'WH2', is_active: true },
            }),
          } as any;
        if (table === 'locations')
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { code: 'L02' } }),
          } as any;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              product_id: 'p1',
              location_id: 'loc1',
              quantity: 10,
              products: { name: 'P1', uom: 'PCS' },
              locations: { code: 'L01' },
            },
          }),
        } as any;
      });
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const internalItem = {
        mode: 'INTERNAL',
        warehouseId: 'wh1',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 5,
      };
      const crossItem = {
        mode: 'CROSS',
        sourceWarehouseId: 'wh1',
        targetWarehouseId: 'wh2',
        stockId: 'stock1',
        targetLocationId: 'loc2',
        transferQty: 5,
      };

      const items = [internalItem, crossItem];
      const result = await submitBulkTransfer(items);

      expect(result.details).toBeDefined();
      expect(result.message).toContain('ย้ายสำเร็จ');
    });
  });

  describe('preflightBulkTransfer', () => {
    it('should validate bulk transfer items', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 5,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should detect missing stock id', async () => {
      const items = [
        {
          qty: 5,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toContain('Missing stock id');
    });

    it('should detect stock not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [
        {
          sourceStock: { id: 'invalid' },
          qty: 5,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toContain('Stock not found');
    });

    it('should detect invalid quantity', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 0,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toBeDefined();
    });

    it('should detect insufficient quantity', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 20,
          targetLocation: { id: 'loc2' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toBeDefined();
    });

    it('should detect target location not found', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };

      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') {
          return mockStockQuery;
        }
        if (table === 'locations') {
          return mockLocationQuery;
        }
        return mockStockQuery;
      });

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 5,
          targetLocation: { id: 'invalid' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toContain('Target location not found');
    });

    it('should detect transfer to same location', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };

      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
        }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') {
          return mockStockQuery;
        }
        if (table === 'locations') {
          return mockLocationQuery;
        }
        return mockStockQuery;
      });

      const items = [
        {
          sourceStock: { id: 'stock1' },
          qty: 5,
          targetLocation: { id: 'loc1' },
        },
      ];

      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toContain('Cannot transfer to same location');
    });

    it('should pass preflight when item is valid with target location', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };
      const mockLocation = { id: 'loc2', code: 'L02', warehouse_id: 'wh1' };

      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockLocation }),
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return mockStockQuery;
        if (table === 'locations') return mockLocationQuery;
        return mockStockQuery;
      });

      const items = [{ sourceStock: { id: 'stock1' }, qty: 5, targetLocation: { id: 'loc2' } }];
      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(true);
      expect(result.summary.ok).toBe(1);
    });

    it('should accept item with stockId and transferQty keys', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01-P01-1', warehouse_id: 'wh1' },
      };
      const mockLocation = { id: 'loc2', code: 'L02', warehouse_id: 'wh1' };
      const mockStockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockLocation }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'stocks') return mockStockQuery;
        if (table === 'locations') return mockLocationQuery;
        return mockStockQuery;
      });

      const items = [{ stockId: 'stock1', transferQty: 5, targetLocation: { id: 'loc2' } }];
      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(true);
      expect(result.summary.ok).toBe(1);
    });

    it('should handle preflight when item has no target location', async () => {
      const mockStock = {
        id: 'stock1',
        quantity: 10,
        products: { id: 'prod1', sku: 'SKU001', name: 'Product 1' },
        locations: { id: 'loc1', code: 'L01', warehouse_id: 'wh1' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStock }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const items = [{ sourceStock: { id: 'stock1' }, qty: 5 }];
      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(true);
      expect(result.summary.total).toBe(1);
    });

    it('should catch and report preflight error', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('DB error')),
      }));

      const items = [{ sourceStock: { id: 'stock1' }, qty: 5 }];
      const result = await preflightBulkTransfer(items);

      expect(result.results[0].ok).toBe(false);
      expect(result.results[0].reason).toBeDefined();
    });
  });
});
