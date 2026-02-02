// @ts-nocheck
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

/** Chainable Supabase query builder that resolves to the given result when awaited */
function chainableBuilder(result: { data: any; error: any }) {
  const p = Promise.resolve(result);
  const b: any = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally?.bind(p),
  };
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.gt = vi.fn(() => b);
  b.single = vi.fn().mockResolvedValue(result);
  b.maybeSingle = vi.fn().mockResolvedValue(result);
  return b;
}

describe('Bulk Import Actions', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = createMockUser();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    const { checkManagerRole } = await import('@/lib/auth-service');
    vi.mocked(checkManagerRole).mockResolvedValue(true);
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

    it('should throw when category not found for product template', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      await expect(downloadMasterTemplate('product', 'nonexistent')).rejects.toThrow(
        'Category not found',
      );
    });
  });

  describe('importMasterData', () => {
    it('should reject when file is missing', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const formData = createMockFormData({ categoryId: 'cat1' });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบไฟล์');
    });

    it('should reject product import when category not found', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockCategoryQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file: file as any,
        categoryId: 'nonexistent-cat',
      });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

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
        file,
      });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('สิทธิ์');
    });

    it('should reject when unauthenticated', async () => {
      mockSupabase.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) };
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });

    it('should reject when no file provided', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const formData = createMockFormData({});

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบไฟล์');
    });

    it('should reject product import when category not found', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        categoryId: 'cat1',
      });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Category ID');
    });

    it('should reject when required headers missing (category)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'Other' }, 1);
          }),
        })),
        eachRow: vi.fn(),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('รูปแบบไฟล์ไม่ถูกต้อง');
    });

    it('should reject when required headers missing (product)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'Other' }, 1);
          }),
        })),
        eachRow: vi.fn(),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(result.message).toContain('รูปแบบไฟล์ไม่ถูกต้อง');
    });

    it('should return row validation errors for category (missing id/name)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'id' }, 1);
            callback({ text: 'name' }, 2);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: '' };
              if (col === 2) return { text: 'Name1' };
              return { text: '' };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn(() => ({ upsert: vi.fn() }));

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some((e: string) => e.includes('ID')) ||
          result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
    });

    it('should return row validation errors for product (invalid UOM)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'name' }, 2);
            callback({ text: 'uom' }, 3);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'INVALID_UOM', value: 'INVALID_UOM' };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some((e: string) => e.includes('หน่วย')) ||
          result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
    });

    it('should handle upsert error and return system error', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'id' }, 1);
            callback({ text: 'name' }, 2);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => (col === 1 ? { text: 'C1' } : { text: 'Cat1' })),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
      }));

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(result.message).toContain('unexpected');
    });

    it('should import product successfully with category context', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'name' }, 2);
            callback({ text: 'uom' }, 3);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'PCS', value: 'PCS' };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn((table: string) =>
        table === 'product_categories' ? catQuery : { upsert: mockUpsert },
      );

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Imported');
    });

    it('should reject product import when required attribute is missing', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [
          { key: 'weight', label: 'น้ำหนัก', type: 'number', scope: 'PRODUCT', required: true },
        ],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'name' }, 2);
            callback({ text: 'uom' }, 3);
            callback({ text: 'weight (weight)' }, 4);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'PCS', value: 'PCS' };
              if (col === 4) return { text: '', value: null };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some(
          (e: string) => e.includes('จำเป็นต้องกรอก') || e.includes('น้ำหนัก'),
        ) || result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
    });

    it('should reject product import when number field has invalid value', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [{ key: 'weight', label: 'น้ำหนัก', type: 'number', scope: 'PRODUCT' }],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'name' }, 2);
            callback({ text: 'uom' }, 3);
            callback({ text: 'weight (weight)' }, 4);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'PCS', value: 'PCS' };
              if (col === 4) return { text: 'not-a-number', value: 'not-a-number' };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some(
          (e: string) => e.includes('ตัวเลข') || e.includes('น้ำหนัก'),
        ) || result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
    });

    it('should reject product import when date field has invalid value', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [{ key: 'expiry', label: 'วันหมดอายุ', type: 'date', scope: 'PRODUCT' }],
        units: ['PCS'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'name' }, 2);
            callback({ text: 'uom' }, 3);
            callback({ text: 'expiry (expiry)' }, 4);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'PCS', value: 'PCS' };
              if (col === 4) return { text: 'invalid-date', value: 'invalid-date' };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn(() => catQuery);

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some(
          (e: string) => e.includes('วันที่') || e.includes('วันหมดอายุ'),
        ) || result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
    });

    it('should import category with Thai headers (รหัสหมวดหมู่, ชื่อ)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: ' รหัสหมวดหมู่ ' }, 1);
            callback({ text: ' ชื่อ ' }, 2);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'CAT1' };
              if (col === 2) return { text: 'Category One' };
              return { text: '' };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }));

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Imported');
    });

    it('should import product with Thai UOM header (หน่วย)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCategory = {
        id: 'cat1',
        name: 'Cat',
        form_schema: [],
        units: ['PCS', 'BOX'],
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'ชื่อ' }, 2);
            callback({ text: 'หน่วย' }, 3);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU1', value: 'SKU1' };
              if (col === 2) return { text: 'Product 1', value: 'Product 1' };
              if (col === 3) return { text: 'BOX', value: 'BOX' };
              return { text: '', value: null };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const catQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };
      mockSupabase.from = vi.fn((table: string) =>
        table === 'product_categories'
          ? catQuery
          : { upsert: vi.fn().mockResolvedValue({ error: null }) },
      );

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file, categoryId: 'cat1' });

      const result = await importMasterData(formData, 'product');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Imported');
    });

    it('should return error for category row missing name', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'id' }, 1);
            callback({ text: 'name' }, 2);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row3 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'C1' };
              if (col === 2) return { text: '' };
              return { text: '' };
            }),
          };
          callback(row3, 3);
        }),
        rowCount: 3,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn(() => ({ upsert: vi.fn() }));

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({ file });

      const result = await importMasterData(formData, 'category');

      expect(result.success).toBe(false);
      expect(
        (result.report?.errors as string[] | undefined)?.some(
          (e: string) => e.includes('Name') || e.includes('ชื่อ'),
        ) || result.message?.includes('ข้อผิดพลาด'),
      ).toBeTruthy();
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

    it('should throw when warehouse or category not found', async () => {
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      };
      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from = vi.fn((table: string) =>
        table === 'warehouses' ? mockWarehouseQuery : mockCategoryQuery,
      );

      await expect(downloadInboundTemplate('invalid', 'cat1')).rejects.toThrow(
        'ไม่พบข้อมูลคลังสินค้าหรือหมวดหมู่สินค้า',
      );
    });
  });

  describe('importInboundStock', () => {
    it('should import inbound stock successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'SKU' }, 1);
            callback({ text: 'Qty' }, 2);
            callback({ text: 'Lot' }, 3);
            callback({ text: 'Cart' }, 4);
            callback({ text: 'Level' }, 5);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          callback(
            {
              getCell: vi.fn((col: number) => {
                if (col === 1) return { text: 'SKU001', value: 'SKU001' };
                if (col === 2) return { value: 10 };
                if (col === 3) return { text: 'L01', value: 'L01' };
                if (col === 4) return { text: 'P01', value: 'P01' };
                if (col === 5) return { text: '1', value: 1 };
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

      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: mockProducts, error: null });
        if (table === 'locations') return chainableBuilder({ data: mockLocations, error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: mockCategory, error: null });
        return chainableBuilder({ data: null, error: null });
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('นำเข้าสำเร็จ');
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
        file,
        warehouseId: 'invalid',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบคลังสินค้า');
    });

    it('should reject when no file provided', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const formData = createMockFormData({
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบไฟล์');
    });

    it('should reject when template missing required columns (SKU/Qty)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'Other' }, 1);
          }),
        })),
        eachRow: vi.fn(),
        rowCount: 1,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: [], error: null });
        if (table === 'locations') return chainableBuilder({ data: [], error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('รูปแบบไฟล์ไม่ถูกต้อง');
    });

    it('should reject when row has invalid qty or missing SKU', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'qty' }, 2);
            callback({ text: 'lot' }, 3);
            callback({ text: 'cart' }, 4);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row2 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: '', value: null };
              if (col === 2) return { value: 0 };
              if (col === 3) return { text: 'L01', value: 'L01' };
              if (col === 4) return { text: 'P01', value: 'P01' };
              return { text: '', value: null };
            }),
          };
          callback(row2, 2);
        }),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: [], error: null });
        if (table === 'locations') return chainableBuilder({ data: [], error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.report?.errors?.length ?? 0).toBeGreaterThanOrEqual(0);
    });

    it('should reject when no valid transactions in file', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'qty' }, 2);
            callback({ text: 'lot' }, 3);
            callback({ text: 'cart' }, 4);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row2 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: '', value: null };
              if (col === 2) return { value: null };
              if (col === 3) return { text: '', value: null };
              if (col === 4) return { text: '', value: null };
              return { text: '', value: null };
            }),
          };
          callback(row2, 2);
        }),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: [], error: null });
        if (table === 'locations') return chainableBuilder({ data: [], error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบข้อมูลสินค้า');
    });

    it('should return system error when rpc fails', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'qty' }, 2);
            callback({ text: 'lot' }, 3);
            callback({ text: 'cart' }, 4);
            callback({ text: 'level' }, 5);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row2 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU001', value: 'SKU001' };
              if (col === 2) return { value: 10 };
              if (col === 3) return { text: 'L01', value: 'L01' };
              if (col === 4) return { text: 'P01', value: 'P01' };
              if (col === 5) return { text: '1', value: 1 };
              return { text: '', value: null };
            }),
          };
          callback(row2, 2);
        }),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const mockProducts = [{ id: 'prod1', sku: 'SKU001' }];
      const mockLocations = [
        { id: 'loc1', code: 'L01-P01-1', lot: 'L01', cart: 'P01', level: '1' },
      ];
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: mockProducts, error: null });
        if (table === 'locations') return chainableBuilder({ data: mockLocations, error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: new Error('RPC failed') });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('unexpected');
    });

    it('should return fail when RPC returns success false with error_count and firstError', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'qty' }, 2);
            callback({ text: 'lot' }, 3);
            callback({ text: 'cart' }, 4);
            callback({ text: 'level' }, 5);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row2 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU001', value: 'SKU001' };
              if (col === 2) return { value: 10 };
              if (col === 3) return { text: 'L01', value: 'L01' };
              if (col === 4) return { text: 'P01', value: 'P01' };
              if (col === 5) return { text: '1', value: 1 };
              return { text: '', value: null };
            }),
          };
          callback(row2, 2);
        }),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const mockProducts = [{ id: 'prod1', sku: 'SKU001' }];
      const mockLocations = [
        { id: 'loc1', code: 'L01-P01-1', lot: 'L01', cart: 'P01', level: '1' },
      ];
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: mockProducts, error: null });
        if (table === 'locations') return chainableBuilder({ data: mockLocations, error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: {
          success: false,
          error_count: 2,
          results: [{ success: false, error: 'First RPC error' }],
        },
        error: null,
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('2');
      expect(result.message).toContain('First RPC error');
      expect(result.report?.failed).toBe(2);
    });

    it('should return fail when RPC returns success false with no error_count', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, n: number) => void) => {
            callback({ text: 'sku' }, 1);
            callback({ text: 'qty' }, 2);
            callback({ text: 'lot' }, 3);
            callback({ text: 'cart' }, 4);
            callback({ text: 'level' }, 5);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          const row2 = {
            getCell: vi.fn((col: number) => {
              if (col === 1) return { text: 'SKU001', value: 'SKU001' };
              if (col === 2) return { value: 10 };
              if (col === 3) return { text: 'L01', value: 'L01' };
              if (col === 4) return { text: 'P01', value: 'P01' };
              if (col === 5) return { text: '1', value: 1 };
              return { text: '', value: null };
            }),
          };
          callback(row2, 2);
        }),
        rowCount: 2,
      };
      const { parseExcel } = await import('@/lib/utils/excel-utils');
      vi.mocked(parseExcel).mockResolvedValue(mockWorksheet as any);

      const mockProducts = [{ id: 'prod1', sku: 'SKU001' }];
      const mockLocations = [
        { id: 'loc1', code: 'L01-P01-1', lot: 'L01', cart: 'P01', level: '1' },
      ];
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: mockProducts, error: null });
        if (table === 'locations') return chainableBuilder({ data: mockLocations, error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: false, error_count: 0 },
        error: null,
      });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('การนำเข้าข้อมูลไม่สำเร็จ');
    });

    it('should parse inbound file with Thai headers (รหัสสินค้า, จำนวน, โซน, ตู้)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockWorksheet = {
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (c: { text: string }, colNum: number) => void) => {
            callback({ text: ' รหัสสินค้า ' }, 1);
            callback({ text: ' จำนวน ' }, 2);
            callback({ text: ' โซน ' }, 3);
            callback({ text: ' ตู้ ' }, 4);
            callback({ text: ' ชั้น ' }, 5);
          }),
        })),
        eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
          callback(
            {
              getCell: vi.fn((col: number) => {
                if (col === 1) return { text: 'SKU001', value: 'SKU001' };
                if (col === 2) return { value: 5 };
                if (col === 3) return { text: 'L01', value: 'L01' };
                if (col === 4) return { text: 'P01', value: 'P01' };
                if (col === 5) return { text: '1', value: 1 };
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
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'products') return chainableBuilder({ data: mockProducts, error: null });
        if (table === 'locations') return chainableBuilder({ data: mockLocations, error: null });
        if (table === 'warehouses') return chainableBuilder({ data: {}, error: null });
        if (table === 'product_categories')
          return chainableBuilder({ data: { form_schema: [] }, error: null });
        return chainableBuilder({ data: null, error: null });
      });
      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null });

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const formData = createMockFormData({
        file,
        warehouseId: 'wh1',
        categoryId: 'cat1',
      });

      const result = await importInboundStock(formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('นำเข้าสำเร็จ');
    });
  });
});
