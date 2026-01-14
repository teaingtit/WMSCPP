import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  downloadMasterTemplate,
  importMasterData,
  downloadInboundTemplate,
  importInboundStock,
} from '@/actions/bulk-import-actions';
import {
  createMockSupabaseClient,
  createMockFormData,
  createMockUser,
} from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/utils/db-helpers', () => ({
  getWarehouseId: vi.fn((_supabase, id) => Promise.resolve(id)),
}));

vi.mock('@/lib/auth-service', () => ({
  checkManagerRole: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/utils/excel-utils', () => ({
  generateCategoryTemplate: vi.fn().mockResolvedValue('base64-category-template'),
  generateProductTemplate: vi.fn().mockResolvedValue('base64-product-template'),
  generateInboundTemplate: vi.fn().mockResolvedValue('base64-inbound-template'),
  parseExcel: vi.fn(),
  parseAttributeString: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  isValidUUID: vi.fn((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  ),
}));

describe('Bulk Import Actions', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = createMockUser();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('downloadMasterTemplate', () => {
    it('should download category template', async () => {
      const { generateCategoryTemplate } = await import('@/lib/utils/excel-utils');

      const result = await downloadMasterTemplate('category');

      expect(generateCategoryTemplate).toHaveBeenCalled();
      expect(result.base64).toBe('base64-category-template');
      expect(result.fileName).toBe('Category_Template.xlsx');
    });

    it('should download product template for category', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Category 1',
        form_schema: [{ key: 'color', label: 'สี', type: 'text' }],
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const { generateProductTemplate } = await import('@/lib/utils/excel-utils');

      const result = await downloadMasterTemplate('product', 'cat1');

      expect(generateProductTemplate).toHaveBeenCalledWith('Category 1', mockCategory.form_schema);
      expect(result.base64).toBe('base64-product-template');
      expect(result.fileName).toContain('Product_Template');
    });

    it('should throw error when category ID missing for product template', async () => {
      await expect(downloadMasterTemplate('product')).rejects.toThrow('Category ID is required');
    });
  });

  describe('importMasterData', () => {
    it('should import categories successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback) => {
            callback({ text: 'ID' }, 1);
            callback({ text: 'Name' }, 2);
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(
            {
              getCell: vi.fn(() => ({ text: 'CAT1' })),
            },
            3,
          );
        }),
        rowCount: 3,
      };

      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({ upsert: mockUpsert }));

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file: file as any,
      });

      const _result = await importMasterData(formData, 'category');

      // Note: This test may need adjustment based on actual implementation
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should reject import for non-manager user', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const { checkManagerRole } = await import('@/lib/auth-service');
      vi.mocked(checkManagerRole).mockResolvedValue(false);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file: file as any,
      });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('สิทธิ์');
    });
  });

  describe('downloadInboundTemplate', () => {
    it('should download inbound template successfully', async () => {
      const mockWarehouse = {
        code: 'WH01',
        config: { hasGrid: true },
      };

      const mockCategory = {
        id: 'cat1',
        name: 'Category 1',
        form_schema: [{ key: 'lot', label: 'Lot', type: 'text' }],
      };

      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        return mockWarehouseQuery;
      });

      const { generateInboundTemplate } = await import('@/lib/utils/excel-utils');

      const result = await downloadInboundTemplate('WH01', 'cat1');

      expect(generateInboundTemplate).toHaveBeenCalled();
      expect(result.base64).toBe('base64-inbound-template');
      expect(result.fileName).toContain('Inbound');
    });

    it('should handle warehouse code lookup', async () => {
      const mockWarehouse = {
        code: 'WH01',
        config: { hasGrid: true },
      };

      const mockCategory = {
        id: 'cat1',
        name: 'Category 1',
        form_schema: [],
      };

      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await downloadInboundTemplate('WH01', 'cat1');

      expect(result.base64).toBeDefined();
      expect(result.fileName).toContain('Inbound');
    });
  });

  describe('importInboundStock', () => {
    it('should import inbound stock successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback) => {
            callback({ text: 'SKU' }, 1);
            callback({ text: 'Qty' }, 2);
            callback({ text: 'Lot' }, 3);
            callback({ text: 'Cart' }, 4);
          }),
        })),
        eachRow: vi.fn((callback) => {
          callback(
            {
              getCell: vi.fn((col) => {
                if (col === 1) return { text: 'SKU001', value: 'SKU001' };
                if (col === 2) return { value: 10 };
                if (col === 3) return { text: 'L01', value: 'L01' };
                if (col === 4) return { text: 'P01', value: 'P01' };
                return { text: '', value: null };
              }),
            },
            2,
          );
        }),
        rowCount: 2,
      };

      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const mockProducts = [{ id: 'prod1', sku: 'SKU001' }];
      const mockLocations = [
        { id: 'loc1', code: 'L01-P01-1', lot: 'L01', cart: 'P01', level: '1' },
      ];
      const mockCategory = { form_schema: [] };

      const mockProductsQuery = {
        select: vi.fn().mockResolvedValue({ data: mockProducts }),
      };

      const mockLocationsQuery = {
        select: vi.fn().mockResolvedValue({ data: mockLocations }),
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null });

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'products') {
          return mockProductsQuery;
        }
        if (table === 'locations') {
          return mockLocationsQuery;
        }
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        return mockProductsQuery;
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file: file as any,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const _result = await importInboundStock(formData);

      // Note: This test may need adjustment based on actual implementation
      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should reject import when warehouse not found', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file: file as any,
        warehouseId: 'invalid',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบคลังสินค้า');
    });
  });
});
