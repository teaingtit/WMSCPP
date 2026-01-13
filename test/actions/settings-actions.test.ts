import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllWarehousesForAdmin,
  getCategories,
  getProducts,
  createProduct,
  deleteProduct,
  createWarehouse,
  deleteWarehouse,
  createCategory,
  deleteCategory,
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
      const mockWarehouses = [
        { id: 'wh1', code: 'WH01', name: 'Warehouse 1', is_active: true },
      ];

      // Create query builder that supports multiple order() calls
      const createQuery = () => {
        const query: any = {};
        query.select = vi.fn(function() { return query; });
        query.eq = vi.fn(function() { return query; });
        query.order = vi.fn(function() { return query; }); // Support chaining - can be called multiple times
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
      const mockCategories = [
        { id: 'cat1', name: 'Category 1', form_schema: [] },
      ];

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

      let callCount = 0;
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

      let callCount = 0;
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

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'products') {
          callCount++;
          if (callCount === 1) return mockProductQuery;
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

      let callCount = 0;
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

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_warehouse_xyz_grid', expect.any(Object));
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
  });

  describe('updateCategoryUnits', () => {
    it('should update category units successfully', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
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

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          callCount++;
          if (callCount === 1) return mockQuery;
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

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'product_categories') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return mockUpdateQuery;
        }
        return mockQuery;
      });

      const result = await removeUnitFromCategory('cat1', 'BOX');

      expect(result.success).toBe(true);
    });
  });
});
