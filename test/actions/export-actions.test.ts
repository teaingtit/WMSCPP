// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportInventoryToExcel } from '@/actions/export-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('exceljs', () => {
  class MockWorkbook {
    addWorksheet() {
      return {
        columns: [],
        addRow: vi.fn(),
        getRow: vi.fn(() => ({
          font: {},
          fill: {},
        })),
      };
    }
    get xlsx() {
      return {
        writeBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
      };
    }
  }
  return {
    default: {
      Workbook: MockWorkbook,
    },
  };
});

describe('Export Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('exportInventoryToExcel', () => {
    it('should export inventory to Excel successfully', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockStocks = [
        {
          quantity: 10,
          attributes: { lot: 'LOT001' },
          updated_at: '2024-01-01T00:00:00Z',
          products: {
            sku: 'SKU001',
            name: 'Product 1',
            uom: 'PCS',
            category_id: 'cat1',
            attributes: { color: 'red' },
          },
          locations: { code: 'L01-P01-1' },
        },
      ];

      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStocks, error: null }),
      };

      const mockCategories = [
        {
          form_schema: [
            { key: 'color', label: 'สี' },
            { key: 'lot', label: 'Lot' },
          ],
        },
      ];

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: mockCategories }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'stocks') {
          return mockStocksQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.fileName).toContain('Stock');
    });

    it('should handle warehouse code lookup', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'stocks') {
          return mockStocksQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(mockWarehouseQuery.eq).toHaveBeenCalledWith('code', 'WH01');
    });

    it('should return error when warehouse not found', async () => {
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockWarehouseQuery);

      const result = await exportInventoryToExcel('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ไม่พบคลังสินค้า');
    });

    it('should return error when no stock found', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'stocks') {
          return mockStocksQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ไม่พบสินค้า');
    });

    it('should handle errors gracefully', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'stocks') {
          return mockStocksQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use warehouse identifier as ID when it is a valid UUID (skip code lookup)', async () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const mockStocks = [
        {
          quantity: 5,
          attributes: {},
          updated_at: '2024-01-01T00:00:00Z',
          products: { sku: 'SKU1', name: 'P1', uom: 'PCS', category_id: null, attributes: null },
          locations: null,
        },
      ];
      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStocks, error: null }),
      };
      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') return mockStocksQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        return mockStocksQuery;
      });

      const result = await exportInventoryToExcel(uuid);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalledWith('warehouses');
    });

    it('should handle categories with non-array form_schema', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockStocks = [
        {
          quantity: 1,
          attributes: {},
          updated_at: '2024-01-01T00:00:00Z',
          products: { sku: 'S', name: 'N', uom: 'PCS', category_id: null, attributes: {} },
          locations: { code: 'A-B' },
        },
      ];
      const mockCategories = [{ form_schema: { notArray: true } }];
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };
      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStocks, error: null }),
      };
      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: mockCategories }),
      };
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') return mockWarehouseQuery;
        if (table === 'stocks') return mockStocksQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(result.success).toBe(true);
    });

    it('should return error when stocks is empty array', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };
      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      const mockCategoriesQuery = { select: vi.fn().mockResolvedValue({ data: [] }) };
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') return mockWarehouseQuery;
        if (table === 'stocks') return mockStocksQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        return mockWarehouseQuery;
      });

      const result = await exportInventoryToExcel('WH01');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ไม่พบสินค้า');
    });
  });
});
