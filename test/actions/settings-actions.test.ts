// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllWarehousesForAdmin,
  getCategories,
  getProducts,
  createProduct,
  deleteProduct,
  createWarehouse,
  createCategory,
  updateCategoryUnits,
  addUnitToCategory,
  removeUnitFromCategory,
} from '@/actions/settings-actions';
import { createMockSupabaseClient, createMockFormData } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Settings Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getAllWarehousesForAdmin', () => {
    it('should fetch all active warehouses', async () => {
      const mockWarehouses = [{ id: 'wh1', code: 'WH01', name: 'Warehouse 1', is_active: true }];

      // Create query builder that supports multiple order() calls
      const createQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        }); // Support chaining - can be called multiple times
        // Make it awaitable
        const promise = Promise.resolve({ data: mockWarehouses });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        // Support destructuring: const { data } = await query
        Object.defineProperty(query, 'data', {
          get: () => mockWarehouses,
          enumerable: true,
        });
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await getAllWarehousesForAdmin();

      expect(result).toEqual(mockWarehouses);
    });
  });

  describe('getCategories', () => {
    it('should fetch all categories', async () => {
      const mockCategories = [{ id: 'cat1', name: 'Category 1', form_schema: [] }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCategories }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getCategories();

      expect(result).toEqual(mockCategories);
    });
  });

  describe('getProducts', () => {
    it('should fetch all active products', async () => {
      const mockProducts = [
        {
          id: 'prod1',
          sku: 'SKU001',
          name: 'Product 1',
          category: { name: 'Category 1' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProducts }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getProducts();

      expect(result).toEqual(mockProducts);
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      const mockCategory = {
        form_schema: [],
        units: ['PCS'],
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        if (table === 'products') {
          return mockInsertQuery;
        }
        return mockCategoryQuery;
      });

      const formData = createMockFormData({
        sku: 'SKU001',
        name: 'Product 1',
        category_id: 'cat1',
        uom: 'PCS',
        image_url: '',
      });

      const result = await createProduct(formData);

      expect(result.success).toBe(true);
    });

    it('should reject duplicate SKU', async () => {
      const mockCategory = {
        form_schema: [],
        units: ['PCS'],
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({
          error: { code: '23505', message: 'Duplicate key' },
        }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        if (table === 'products') {
          return mockInsertQuery;
        }
        return mockCategoryQuery;
      });

      const formData = createMockFormData({
        sku: 'SKU001',
        name: 'Product 1',
        category_id: 'cat1',
        uom: 'PCS',
        image_url: '',
      });

      const result = await createProduct(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });
  });

  describe('deleteProduct', () => {
    it('should return fail when product not found', async () => {
      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockProductQuery);

      const formData = createMockFormData({ id: 'nonexistent' });

      const result = await deleteProduct(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบสินค้า');
    });

    it('should soft delete product when no stock exists', async () => {
      const mockProduct = { sku: 'SKU001' };
      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProduct }),
      };

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'products') {
          _callCount++;
          if (_callCount === 1) return mockProductQuery;
          return mockUpdateQuery;
        }
        if (table === 'stocks') {
          return mockCheckQuery;
        }
        return mockProductQuery;
      });

      const formData = createMockFormData({ id: 'prod1' });

      const result = await deleteProduct(formData);

      expect(result.success).toBe(true);
    });

    it('should reject delete when product has stock', async () => {
      const mockProduct = { sku: 'SKU001' };
      const mockProductQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProduct }),
      };

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'products') {
          return mockProductQuery;
        }
        if (table === 'stocks') {
          return mockCheckQuery;
        }
        return mockProductQuery;
      });

      const formData = createMockFormData({ id: 'prod1' });

      const result = await deleteProduct(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ลบไม่ได้');
    });
  });

  describe('createWarehouse', () => {
    it('should create warehouse successfully', async () => {
      // Mock the insert query that returns the warehouse id
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'wh-123' },
          error: null,
        }),
      };

      mockSupabase.from = vi.fn(() => mockInsertQuery);
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Warehouse created' },
        error: null,
      });

      const formData = createMockFormData({
        code: 'WH01',
        name: 'Warehouse 1',
        axis_x: '5',
        axis_y: '5',
        axis_z: '3',
      });

      const result = await createWarehouse(formData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'create_warehouse_xyz_grid',
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from = vi.fn(() => ({ insert: mockInsert }));

      const formData = createMockFormData({
        id: 'CAT1',
        name: 'Category 1',
        schema: '[]',
        units: '["PCS"]',
      });

      const result = await createCategory(formData);

      expect(result.success).toBe(true);
    });

    it('should reject duplicate category ID', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { code: '23505', message: 'Duplicate key' },
      });
      mockSupabase.from = vi.fn(() => ({ insert: mockInsert }));

      const formData = createMockFormData({
        id: 'CAT1',
        name: 'Category 1',
        schema: '[]',
        units: '["PCS"]',
      });

      const result = await createCategory(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should return fail on insert error', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });
      mockSupabase.from = vi.fn(() => ({ insert: mockInsert }));

      const formData = createMockFormData({
        id: 'CAT1',
        name: 'Category 1',
        schema: '[]',
        units: '["PCS"]',
      });

      const result = await createCategory(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('updateCategoryUnits', () => {
    it('should return fail on validation error', async () => {
      const formData = createMockFormData({ id: '', units: '["PCS"]' });

      const result = await updateCategoryUnits(formData);

      expect(result.success).toBe(false);
    });

    it('should update category units successfully', async () => {
      const _mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const formData = createMockFormData({
        id: 'cat1',
        units: '["PCS", "BOX"]',
      });

      const result = await updateCategoryUnits(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('addUnitToCategory', () => {
    it('should add unit to category', async () => {
      const mockCategory = { units: ['PCS'] };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          _callCount++;
          if (_callCount === 1) return mockQuery;
          return mockUpdateQuery;
        }
        return mockQuery;
      });

      const result = await addUnitToCategory('cat1', 'BOX');

      expect(result.success).toBe(true);
    });
  });

  describe('removeUnitFromCategory', () => {
    it('should remove unit from category', async () => {
      const mockCategory = { units: ['PCS', 'BOX'] };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          _callCount++;
          if (_callCount === 1) return mockQuery;
          return mockUpdateQuery;
        }
        return mockQuery;
      });

      const result = await removeUnitFromCategory('cat1', 'BOX');

      expect(result.success).toBe(true);
    });
  });

  describe('deleteWarehouse', () => {
    it('should soft delete warehouse when no stock exists', async () => {
      const { deleteWarehouse } = await import('@/actions/settings-actions');

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'stocks') {
          return mockCheckQuery;
        }
        if (table === 'warehouses') {
          return mockUpdateQuery;
        }
        return mockCheckQuery;
      });

      const formData = createMockFormData({ id: 'wh1' });

      const result = await deleteWarehouse(formData);

      expect(result.success).toBe(true);
    });

    it('should reject delete when warehouse has stock', async () => {
      const { deleteWarehouse } = await import('@/actions/settings-actions');

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      };

      mockSupabase.from = vi.fn(() => mockCheckQuery);

      const formData = createMockFormData({ id: 'wh1' });

      const result = await deleteWarehouse(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('มีสินค้าคงเหลือ');
    });
  });

  describe('deleteCategory', () => {
    it('should delete category when no products use it', async () => {
      const { deleteCategory } = await import('@/actions/settings-actions');

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const createDeleteQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.delete = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockDeleteQuery = createDeleteQuery();

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'products') {
          return mockCheckQuery;
        }
        if (table === 'product_categories') {
          return mockDeleteQuery;
        }
        return mockCheckQuery;
      });

      const formData = createMockFormData({ id: 'cat1' });

      const result = await deleteCategory(formData);

      expect(result.success).toBe(true);
    });

    it('should reject delete when products use the category', async () => {
      const { deleteCategory } = await import('@/actions/settings-actions');

      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      };

      mockSupabase.from = vi.fn(() => mockCheckQuery);

      const formData = createMockFormData({ id: 'cat1' });

      const result = await deleteCategory(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('มีสินค้าใช้ประเภทนี้อยู่');
    });
  });

  describe('updateCategory', () => {
    it('should update category without schema change', async () => {
      const { updateCategory } = await import('@/actions/settings-actions');

      const mockCurrentCategory = {
        form_schema: [{ key: 'color', label: 'Color' }],
        schema_version: 1,
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCategory }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          _callCount++;
          if (_callCount === 1) return mockFetchQuery;
          return mockUpdateQuery;
        }
        return mockFetchQuery;
      });

      const formData = createMockFormData({
        id: 'CAT1',
        name: 'Updated Category',
        schema: '[{"key":"color","label":"Color"}]',
        units: '["PCS"]',
      });

      const result = await updateCategory(formData);

      expect(result.success).toBe(true);
    });

    it('should create schema version when schema changes', async () => {
      const { updateCategory } = await import('@/actions/settings-actions');

      const mockCurrentCategory = {
        form_schema: [{ key: 'color', label: 'Color' }],
        schema_version: 1,
      };

      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentCategory }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      // Mock the schema version creation
      vi.mock('@/actions/schema-version-actions', () => ({
        createSchemaVersion: vi.fn().mockResolvedValue({ success: true }),
      }));

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          _callCount++;
          if (_callCount === 1) return mockFetchQuery;
          return mockUpdateQuery;
        }
        return mockFetchQuery;
      });

      const formData = createMockFormData({
        id: 'CAT1',
        name: 'Updated Category',
        schema: '[{"key":"size","label":"Size"}]',
        units: '["PCS"]',
        change_notes: 'Added size field',
      });

      const result = await updateCategory(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('createProduct with attributes', () => {
    it('should create product with dynamic attributes from category schema', async () => {
      const mockCategory = {
        form_schema: [
          { key: 'color', label: 'Color', type: 'text' },
          { key: 'weight', label: 'Weight', type: 'number' },
        ],
        units: ['PCS'],
      };

      const mockCategoryQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCategory }),
      };

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          return mockCategoryQuery;
        }
        if (table === 'products') {
          return mockInsertQuery;
        }
        return mockCategoryQuery;
      });

      const formData = new FormData();
      formData.append('sku', 'SKU002');
      formData.append('name', 'Product 2');
      formData.append('category_id', 'cat1');
      formData.append('uom', 'PCS');
      formData.append('image_url', '');
      formData.append('color', 'red');
      formData.append('weight', '100');

      const result = await createProduct(formData);

      expect(result.success).toBe(true);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: { color: 'red', weight: 100 },
        }),
      );
    });
  });

  describe('createWarehouse duplicate code', () => {
    it('should reject duplicate warehouse code', async () => {
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate key value' },
        }),
      };
      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        code: 'WH01',
        name: 'Warehouse 1',
        axis_x: '5',
        axis_y: '5',
        axis_z: '3',
      });

      const result = await createWarehouse(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/already exists|รหัสคลัง/i);
    });
  });

  describe('createWarehouse error handling', () => {
    it('should handle insert errors', async () => {
      // Mock insert failure
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      };

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        code: 'WH01',
        name: 'Warehouse 1',
        axis_x: '5',
        axis_y: '5',
        axis_z: '3',
      });

      const result = await createWarehouse(formData);

      expect(result.success).toBe(false);
    });

    it('should handle RPC errors', async () => {
      // Mock successful insert but RPC failure
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'wh-123' },
          error: null,
        }),
      };

      mockSupabase.from = vi.fn(() => mockInsertQuery);
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('RPC Error'),
      });

      const formData = createMockFormData({
        code: 'WH01',
        name: 'Warehouse 1',
        axis_x: '5',
        axis_y: '5',
        axis_z: '3',
      });

      const result = await createWarehouse(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('System Error');
    });

    it('should handle RPC result with success false', async () => {
      // Mock successful insert but RPC returns success: false
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'wh-123' },
          error: null,
        }),
      };

      mockSupabase.from = vi.fn(() => mockInsertQuery);
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { success: false, message: 'สร้างตำแหน่งเก็บไม่สำเร็จ' },
        error: null,
      });

      const formData = createMockFormData({
        code: 'WH01',
        name: 'Warehouse 1',
        axis_x: '5',
        axis_y: '5',
        axis_z: '3',
      });

      const result = await createWarehouse(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('สร้างตำแหน่งเก็บไม่สำเร็จ');
    });
  });
});
