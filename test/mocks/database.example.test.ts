// @ts-nocheck
/**
 * Example test file demonstrating database mocking patterns.
 *
 * This file shows various ways to mock Supabase database operations
 * for testing server actions and other database-dependent code.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MockDatabase,
  createMockSupabaseClient,
  createMockQueryBuilder,
  createConfigurableQueryBuilder,
  mockFactories,
  mockErrors,
  successResult,
  errorResult,
  createTableMock,
} from './database';

describe('Database Mocking Examples', () => {
  describe('MockDatabase - In-Memory Database', () => {
    let db: MockDatabase;

    beforeEach(() => {
      db = new MockDatabase();
    });

    it('should seed and query data', () => {
      // Seed some products
      db.seed('products', [
        mockFactories.product({ id: 'prod-1', sku: 'SKU-001', name: 'Product A' }),
        mockFactories.product({ id: 'prod-2', sku: 'SKU-002', name: 'Product B' }),
        mockFactories.product({ id: 'prod-3', sku: 'SKU-003', name: 'Product C' }),
      ]);

      // Query all products
      expect(db.getAll('products')).toHaveLength(3);

      // Find specific product
      const product = db.findOne('products', (p) => p.sku === 'SKU-002');
      expect(product?.name).toBe('Product B');
    });

    it('should support CRUD operations', () => {
      // Insert
      const newProduct = db.insert('products', { sku: 'NEW-001', name: 'New Product' });
      expect(newProduct.id).toBeDefined();
      expect(db.getAll('products')).toHaveLength(1);

      // Update
      db.update('products', (p) => p.sku === 'NEW-001', { name: 'Updated Product' });
      const updated = db.findOne('products', (p) => p.sku === 'NEW-001');
      expect(updated?.name).toBe('Updated Product');

      // Delete
      db.delete('products', (p) => p.sku === 'NEW-001');
      expect(db.getAll('products')).toHaveLength(0);
    });

    it('should initialize with data', () => {
      const dbWithData = new MockDatabase({
        warehouses: [
          mockFactories.warehouse({ id: 'wh-1' }),
          mockFactories.warehouse({ id: 'wh-2' }),
        ],
        products: [mockFactories.product()],
      });

      expect(dbWithData.getAll('warehouses')).toHaveLength(2);
      expect(dbWithData.getAll('products')).toHaveLength(1);
    });
  });

  describe('createMockQueryBuilder - Simple Query Mocking', () => {
    it('should create a chainable query builder', () => {
      const builder = createMockQueryBuilder({
        data: [{ id: '1', name: 'Test' }],
        error: null,
      });

      // All methods should be chainable
      const result = builder.select('*').eq('id', '1').order('name');
      expect(result).toBe(builder);
      expect(builder.select).toHaveBeenCalledWith('*');
      expect(builder.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should support async/await', async () => {
      const builder = createMockQueryBuilder({
        data: { id: '1', name: 'Test' },
        error: null,
      });

      const result = await builder.select('*').eq('id', '1');
      expect(result.data).toEqual({ id: '1', name: 'Test' });
    });

    it('should support single() for single record queries', async () => {
      const builder = createMockQueryBuilder({
        data: { id: '1', name: 'Test' },
        error: null,
      });

      const result = await builder.select('*').eq('id', '1').single();
      expect(result.data).toEqual({ id: '1', name: 'Test' });
    });
  });

  describe('createMockSupabaseClient - Full Client Mocking', () => {
    it('should create a mock client with default behavior', () => {
      const supabase = createMockSupabaseClient();

      expect(supabase.from).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.rpc).toBeDefined();
    });

    it('should support table-specific mocks', async () => {
      const supabase = createMockSupabaseClient({
        tables: {
          products: createMockQueryBuilder({
            data: [mockFactories.product({ sku: 'TEST-001' })],
            error: null,
          }),
          warehouses: createMockQueryBuilder({
            data: [mockFactories.warehouse({ code: 'WH01' })],
            error: null,
          }),
        },
      });

      // Query products
      const products = await supabase.from('products').select('*');
      expect(products.data[0].sku).toBe('TEST-001');

      // Query warehouses
      const warehouses = await supabase.from('warehouses').select('*');
      expect(warehouses.data[0].code).toBe('WH01');
    });

    it('should support RPC mocking', async () => {
      const supabase = createMockSupabaseClient({
        rpcResponses: {
          process_inbound_transaction: {
            data: { success: true, stock_id: 'stock-123' },
            error: null,
          },
          create_warehouse_xyz_grid: {
            data: { success: true, message: 'Grid created' },
            error: null,
          },
        },
      });

      const result = await supabase.rpc('process_inbound_transaction', {
        p_warehouse_id: 'wh-1',
        p_product_id: 'prod-1',
        p_quantity: 100,
      });

      expect(result.data.success).toBe(true);
      expect(result.data.stock_id).toBe('stock-123');
    });

    it('should support auth mocking', async () => {
      const mockUser = mockFactories.user({ email: 'admin@test.com' });
      const supabase = createMockSupabaseClient({ user: mockUser });

      const { data } = await supabase.auth.getUser();
      expect(data.user.email).toBe('admin@test.com');
    });
  });

  describe('mockFactories - Data Generation', () => {
    it('should create realistic mock data', () => {
      const user = mockFactories.user();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');

      const product = mockFactories.product({ sku: 'CUSTOM-SKU' });
      expect(product.sku).toBe('CUSTOM-SKU');
      expect(product.is_active).toBe(true);

      const warehouse = mockFactories.warehouse();
      expect(warehouse.axis_x).toBe(5);
      expect(warehouse.axis_y).toBe(5);
    });

    it('should support overrides', () => {
      const customProduct = mockFactories.product({
        id: 'custom-id',
        sku: 'CUSTOM-001',
        name: 'Custom Product',
        attributes: { color: 'red', size: 'large' },
      });

      expect(customProduct.id).toBe('custom-id');
      expect(customProduct.sku).toBe('CUSTOM-001');
      expect(customProduct.attributes.color).toBe('red');
    });
  });

  describe('mockErrors - Error Simulation', () => {
    it('should create duplicate key errors', () => {
      const error = mockErrors.duplicate('sku');
      expect(error.code).toBe('23505');
      expect(error.message).toContain('duplicate key');
    });

    it('should create not found errors', () => {
      const error = mockErrors.notFound();
      expect(error.code).toBe('PGRST116');
    });

    it('should create permission errors', () => {
      const error = mockErrors.permissionDenied();
      expect(error.code).toBe('42501');
      expect(error.message).toContain('permission denied');
    });

    it('should handle error results in query builder (Supabase style)', async () => {
      // Supabase doesn't throw - it returns { data: null, error: ... }
      const builder = createMockQueryBuilder({
        data: null,
        error: mockErrors.duplicate('sku'),
      });

      const result = await builder.insert({ sku: 'EXISTING' });
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('23505');
    });

    it('should handle not found in single() query', async () => {
      const builder = createMockQueryBuilder({
        data: null,
        error: mockErrors.notFound(),
      });

      const result = await builder.select('*').eq('id', 'nonexistent').single();
      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('PGRST116');
    });
  });

  describe('Integration Example - Testing a Server Action', () => {
    // This demonstrates how you would test a server action

    // Example server action (simulated)
    async function createProduct(
      supabase: any,
      data: { sku: string; name: string; category_id: string },
    ) {
      // Check if SKU exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', data.sku)
        .single();

      if (existing) {
        return { success: false, message: 'SKU already exists' };
      }

      // Insert product
      const { data: product, error } = await supabase
        .from('products')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, data: product };
    }

    it('should handle successful product creation', async () => {
      const newProduct = mockFactories.product({ sku: 'NEW-001' });

      // Create query builder that returns null for existence check, then returns product
      let callCount = 0;
      const productQuery = createConfigurableQueryBuilder();
      productQuery.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check if exists (return null)
          return Promise.resolve({ data: null, error: null });
        }
        // Second call: insert (return new product)
        return Promise.resolve({ data: newProduct, error: null });
      });

      const supabase = createMockSupabaseClient({
        tables: { products: productQuery },
      });

      const result = await createProduct(supabase, {
        sku: 'NEW-001',
        name: 'New Product',
        category_id: 'cat-1',
      });

      expect(result.success).toBe(true);
      expect(result.data?.sku).toBe('NEW-001');
    });

    it('should handle duplicate SKU error', async () => {
      const existingProduct = mockFactories.product({ sku: 'EXISTING' });

      const productQuery = createMockQueryBuilder({
        data: existingProduct,
        error: null,
      });

      const supabase = createMockSupabaseClient({
        tables: { products: productQuery },
      });

      const result = await createProduct(supabase, {
        sku: 'EXISTING',
        name: 'Duplicate',
        category_id: 'cat-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });
  });
});
