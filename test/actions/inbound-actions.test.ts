// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProductCategories,
  getCategoryDetail,
  getInboundOptions,
  getWarehouseLots,
  getCartsByLot,
  getLevelsByCart,
  submitInbound,
  submitBulkInbound,
} from '@/actions/inbound-actions';
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

describe('Inbound Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    const { getWarehouseId } = await import('@/lib/utils/db-helpers');
    vi.mocked(getWarehouseId).mockImplementation((_s: any, id: string) => Promise.resolve(id));
  });

  describe('getProductCategories', () => {
    it('should fetch all product categories', async () => {
      const mockCategories = [
        { id: 'cat1', name: 'Category 1' },
        { id: 'cat2', name: 'Category 2' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCategories }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getProductCategories();

      expect(mockSupabase.from).toHaveBeenCalledWith('product_categories');
      expect(result).toEqual(mockCategories);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getProductCategories();

      expect(result).toEqual([]);
    });
  });

  describe('getCategoryDetail', () => {
    it('should fetch category by ID', async () => {
      const mockCategory = { id: 'cat1', name: 'Category 1', form_schema: [] };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getCategoryDetail('cat1');

      expect(result).toEqual(mockCategory);
    });
  });

  describe('getInboundOptions', () => {
    it('should return empty products array when query returns null', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getInboundOptions('wh1', 'cat1');

      expect(result.products).toEqual([]);
    });

    it('should fetch products for a category', async () => {
      const mockProducts = [{ id: 'prod1', name: 'Product 1', category_id: 'cat1' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProducts }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getInboundOptions('wh1', 'cat1');

      expect(result.products).toEqual(mockProducts);
    });
  });

  describe('getWarehouseLots', () => {
    it('should return empty array when getWarehouseId returns null', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);
      mockSupabase.from = vi.fn();

      const result = await getWarehouseLots('invalid');

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch unique lots for a warehouse', async () => {
      const mockLocations = [{ lot: 'L01' }, { lot: 'L01' }, { lot: 'L02' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLocations }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getWarehouseLots('wh1');

      expect(result).toEqual(['L01', 'L02']);
    });
  });

  describe('getCartsByLot', () => {
    it('should return empty array when getWarehouseId returns null', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await getCartsByLot('invalid', 'L01');

      expect(result).toEqual([]);
    });

    it('should fetch unique carts for a lot', async () => {
      const mockLocations = [{ cart: 'P01' }, { cart: 'P01' }, { cart: 'P02' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLocations }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getCartsByLot('wh1', 'L01');

      expect(result).toEqual(['P01', 'P02']);
    });
  });

  describe('getLevelsByCart', () => {
    it('should return empty array when getWarehouseId returns null', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await getLevelsByCart('invalid', 'L01', 'P01');

      expect(result).toEqual([]);
    });

    it('should fetch levels for a cart', async () => {
      const mockLocations = [
        { id: 'loc1', level: 1, code: 'L01-P01-1', type: 'STORAGE' },
        { id: 'loc2', level: 2, code: 'L01-P01-2', type: 'STORAGE' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLocations }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getLevelsByCart('wh1', 'L01', 'P01');

      expect(result).toEqual(mockLocations);
    });
  });

  describe('submitInbound', () => {
    it('should successfully submit inbound transaction', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRpc = vi.fn().mockResolvedValue({
        data: { success: true },
        error: null,
      });
      mockSupabase.rpc = mockRpc;

      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: '00000000-0000-0000-0000-000000000000',
            warehouse_id: 'wh1',
            is_active: true,
          },
        }),
      };

      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '00000000-0000-0000-0000-000000000001', is_active: true },
        }),
      };

      const mockProductDetailQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { name: 'Product 1', uom: 'PCS', sku: 'SKU001' },
        }),
      };

      const mockLocationDetailQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { code: 'L01-P01-1' },
        }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockLocationQuery;
        if (callCount === 2) return mockProductQuery;
        if (callCount === 3) return mockProductDetailQuery;
        return mockLocationDetailQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000', // Valid UUID
        productId: '00000000-0000-0000-0000-000000000001', // Valid UUID
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(mockRpc).toHaveBeenCalledWith('process_inbound_transaction', expect.any(Object));
      expect(result.success).toBe(true);
    });

    it('should reject invalid location', async () => {
      const mockUser = createMockUser();
      // First validation passes, then location check fails
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockLocationQuery);

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000', // Valid UUID format
        productId: '00000000-0000-0000-0000-000000000001', // Valid UUID format
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบพิกัด');
    });

    it('should reject inactive location', async () => {
      const mockUser = createMockUser();
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'loc1', warehouse_id: 'wh1', is_active: false },
        }),
      };
      mockSupabase.from = vi.fn(() => mockLocationQuery);

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000', // Valid UUID format
        productId: '00000000-0000-0000-0000-000000000001', // Valid UUID format
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ปิดใช้งาน');
    });

    it('should validate quantity is positive', async () => {
      const mockUser = createMockUser();
      const formData = {
        warehouseId: 'wh1',
        locationId: 'loc1',
        productId: 'prod1',
        quantity: -5,
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
    });

    it('should reject when location belongs to different warehouse', async () => {
      const mockUser = createMockUser();
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'loc1', warehouse_id: 'other-wh', is_active: true },
        }),
      };
      mockSupabase.from = vi.fn(() => mockLocationQuery);

      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000',
        productId: '00000000-0000-0000-0000-000000000001',
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('พิกัดนี้ไม่อยู่ในคลัง');
    });

    it('should reject when product not found', async () => {
      const mockUser = createMockUser();
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'loc1', warehouse_id: 'wh1', is_active: true },
        }),
      };
      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockLocationQuery;
        return mockProductQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000',
        productId: '00000000-0000-0000-0000-000000000001',
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบสินค้า');
    });

    it('should reject when product is inactive', async () => {
      const mockUser = createMockUser();
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'loc1', warehouse_id: 'wh1', is_active: true },
        }),
      };
      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'prod1', is_active: false },
        }),
      };
      let callCount = 0;
      mockSupabase.from = vi.fn(() => {
        callCount++;
        if (callCount === 1) return mockLocationQuery;
        return mockProductQuery;
      });

      const formData = {
        warehouseId: 'wh1',
        locationId: '00000000-0000-0000-0000-000000000000',
        productId: '00000000-0000-0000-0000-000000000001',
        quantity: 10,
        attributes: {},
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ปิดใช้งาน');
    });

    it('should reject invalid form data (validation)', async () => {
      const mockUser = createMockUser();
      const formData = {
        warehouseId: 'wh1',
        locationId: 'not-a-uuid',
        productId: '00000000-0000-0000-0000-000000000001',
        quantity: 10,
      };

      const result = await (submitInbound as any)(formData as any, {
        user: mockUser as any,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('submitBulkInbound', () => {
    it('should call processBulkAction with items and submitInbound', async () => {
      const { processBulkAction } = await import('@/lib/action-utils');
      const mockResult = { success: true, results: [] };
      vi.mocked(processBulkAction).mockResolvedValue(mockResult as any);

      const items = [
        {
          warehouseId: 'wh1',
          locationId: '00000000-0000-0000-0000-000000000000',
          productId: '00000000-0000-0000-0000-000000000001',
          quantity: 5,
        },
      ];

      const result = await submitBulkInbound(items);

      expect(processBulkAction).toHaveBeenCalledWith(items, submitInbound);
      expect(result).toEqual(mockResult);
    });
  });
});
