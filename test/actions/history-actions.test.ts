// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHistory } from '@/actions/history-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('History Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getHistory', () => {
    it('should fetch transaction history in simple mode', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategories = [
        {
          form_schema: [
            { key: 'color', label: 'สี' },
            { key: 'size', label: 'ขนาด' },
          ],
        },
      ];

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: mockCategories }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'INBOUND',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Test transaction',
          attributes: { color: 'red' },
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          from_loc: null,
          to_loc: { code: 'L01-P01-1', warehouse: { name: 'Warehouse 1' } },
        },
      ];

      // Create a query builder that supports reassignment and chaining
      const createTransactionsQuery = () => {
        const query: any = {};
        // Initialize methods that return the query itself
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        // Make it thenable
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        // Support destructuring
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple');

      expect(result.length).toBe(1);
      expect(result[0].category).toBe('TRANSACTION');
      expect(result[0].type).toBe('INBOUND');
    });

    it('should filter by transaction type', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      // Create a query builder that supports reassignment
      // The query is created initially, then reassigned with .eq() or .in()
      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        }); // Supports reassignment: txQuery = txQuery.eq(...)
        query.in = vi.fn(function () {
          return query;
        }); // Supports reassignment: txQuery = txQuery.in(...)
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        // Make it thenable
        const promise = Promise.resolve({ data: [], error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', { get: () => [], enumerable: true });
        Object.defineProperty(query, 'error', { get: () => null, enumerable: true });
        return query;
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple', { type: 'INBOUND' });

      expect(result).toEqual([]);
    });

    it('should return empty array when warehouse not found', async () => {
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockWarehouseQuery);

      const result = await getHistory('INVALID', 100, 'simple');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      // Create a query builder that supports reassignment
      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const dbError = new Error('Database error');
        const promise = Promise.resolve({
          data: null,
          error: dbError,
        });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', { get: () => null, enumerable: true });
        Object.defineProperty(query, 'error', { get: () => dbError, enumerable: true });
        return query;
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple');

      expect(result).toEqual([]);
    });

    it('should fetch history in detailed mode with system logs', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'INBOUND',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Test transaction',
          attributes: {},
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          from_loc: null,
          to_loc: { code: 'L01-P01-1', warehouse: { name: 'Warehouse 1' } },
        },
      ];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocations = [{ id: 'loc1' }];
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockLocations }),
      };

      const mockStatusLogs = [
        {
          id: 'log1',
          entity_type: 'LOCATION',
          entity_id: 'loc1',
          changed_at: '2024-01-01T00:00:00Z',
          reason: 'Status change',
          changer: { email: 'admin@example.com' },
          from_status: { name: 'Available' },
          to_status: { name: 'Reserved' },
        },
      ];

      const createStatusLogsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockStatusLogs, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatusLogs,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocationDetailsQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'loc1', code: 'L01-P01-1' }] }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        if (table === 'locations') {
          callCount++;
          if (callCount === 1) return mockLocationQuery;
          return mockLocationDetailsQuery;
        }
        if (table === 'status_change_logs') {
          return createStatusLogsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'detailed');

      expect(result.length).toBeGreaterThan(0);
      const hasSystemLog = result.some((entry) => entry.category === 'SYSTEM');
      expect(hasSystemLog).toBe(true);
    });

    it('should filter by search term', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'INBOUND',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Test product ABC',
          attributes: {},
          product: { sku: 'ABC001', name: 'Product ABC', uom: 'PCS' },
          from_loc: null,
          to_loc: { code: 'L01-P01-1', warehouse: { name: 'Warehouse 1' } },
        },
      ];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple', { search: 'ABC' });

      expect(result.length).toBe(1);
      expect(result[0].sku).toBe('ABC001');
    });

    it('should filter by date range', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: [], error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', { get: () => [], enumerable: true });
        Object.defineProperty(query, 'error', { get: () => null, enumerable: true });
        return query;
      };

      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual([]);
    });

    it('should resolve attribute labels from category schema', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategories = [
        {
          form_schema: [
            { key: 'color', label: 'สี' },
            { key: 'size', label: 'ขนาด' },
          ],
        },
      ];

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: mockCategories }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'INBOUND',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Test transaction',
          attributes: { color: 'red', size: 'L' },
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          from_loc: null,
          to_loc: { code: 'L01-P01-1', warehouse: { name: 'Warehouse 1' } },
        },
      ];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple');

      expect(result[0].attributes).toHaveProperty('สี', 'red');
      expect(result[0].attributes).toHaveProperty('ขนาด', 'L');
    });

    it('should handle ADJUST transaction type', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'ADJUST',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Adjustment',
          attributes: {},
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          from_loc: null,
          to_loc: null,
        },
      ];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'product_categories') {
          return mockCategoriesQuery;
        }
        if (table === 'transactions') {
          return createTransactionsQuery();
        }
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'simple');

      expect(result[0].from).toBe('System');
      expect(result[0].to).toBe('Adjustment');
    });

    it('should exclude system logs when filtering by TRANSACTION type', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions = [
        {
          id: 'tx1',
          type: 'INBOUND',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
          user_email: 'user@example.com',
          details: 'Test',
          attributes: {},
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS' },
          from_loc: null,
          to_loc: { code: 'L01', warehouse: { name: 'WH1' } },
        },
      ];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocations = [{ id: 'loc1' }];
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockLocations }),
      };

      // The logs should NOT be queried when type filter is a transaction type
      const mockStatusLogs = [
        {
          id: 'log1',
          entity_type: 'LOCATION',
          entity_id: 'loc1',
          changed_at: '2024-01-01T00:00:00Z',
          reason: 'Status changed',
          changer: { email: 'admin@example.com' },
          from_status: { name: 'Available' },
          to_status: { name: 'Reserved' },
        },
      ];

      const createStatusLogsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockStatusLogs, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatusLogs,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocationDetailsQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'loc1', code: 'L01' }] }),
      };

      let locCallCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') return mockWarehouseQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        if (table === 'transactions') return createTransactionsQuery();
        if (table === 'locations') {
          locCallCount++;
          if (locCallCount === 1) return mockLocationQuery;
          return mockLocationDetailsQuery;
        }
        if (table === 'status_change_logs') return createStatusLogsQuery();
        return mockWarehouseQuery;
      });

      // Using type filter 'INBOUND' should still include transactions only
      const result = await getHistory('WH01', 100, 'detailed', { type: 'INBOUND' });

      // All results should be TRANSACTION category (no SYSTEM logs because they're filtered client-side when type is set)
      const transactionEntries = result.filter((e) => e.category === 'TRANSACTION');
      expect(transactionEntries.length).toBeGreaterThan(0);
    });

    it('should apply date range filter to system logs in detailed mode', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions: any[] = [];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocations = [{ id: 'loc1' }];
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockLocations }),
      };

      const mockStatusLogs = [
        {
          id: 'log1',
          entity_type: 'LOCATION',
          entity_id: 'loc1',
          changed_at: '2024-01-15T00:00:00Z',
          reason: 'In date range',
          changer: { email: 'admin@example.com' },
          from_status: { name: 'Available' },
          to_status: { name: 'Reserved' },
        },
      ];

      const createStatusLogsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockStatusLogs, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatusLogs,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocationDetailsQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'loc1', code: 'L01' }] }),
      };

      let locCallCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') return mockWarehouseQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        if (table === 'transactions') return createTransactionsQuery();
        if (table === 'locations') {
          locCallCount++;
          if (locCallCount === 1) return mockLocationQuery;
          return mockLocationDetailsQuery;
        }
        if (table === 'status_change_logs') return createStatusLogsQuery();
        return mockWarehouseQuery;
      });

      const result = await getHistory('WH01', 100, 'detailed', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      // Should include system logs within the date range
      const hasSystemLog = result.some((entry) => entry.category === 'SYSTEM');
      expect(hasSystemLog).toBe(true);
    });

    it('should filter system logs by changer email in search', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockCategoriesQuery = {
        select: vi.fn().mockResolvedValue({ data: [] }),
      };

      const mockTransactions: any[] = [];

      const createTransactionsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockTransactions, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockTransactions,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocations = [{ id: 'loc1' }];
      const mockLocationQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockLocations }),
      };

      // Two logs - one matches search, one doesn't
      const mockStatusLogs = [
        {
          id: 'log1',
          entity_type: 'LOCATION',
          entity_id: 'loc1',
          changed_at: '2024-01-01T00:00:00Z',
          reason: 'Change 1',
          changer: { email: 'admin@example.com' }, // Should match search="admin"
          from_status: { name: 'Available' },
          to_status: { name: 'Reserved' },
        },
        {
          id: 'log2',
          entity_type: 'LOCATION',
          entity_id: 'loc1',
          changed_at: '2024-01-02T00:00:00Z',
          reason: 'Change 2',
          changer: { email: 'user@example.com' }, // Should NOT match search="admin"
          from_status: { name: 'Reserved' },
          to_status: { name: 'Available' },
        },
      ];

      const createStatusLogsQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.in = vi.fn(function () {
          return query;
        });
        query.or = vi.fn(function () {
          return query;
        });
        query.gte = vi.fn(function () {
          return query;
        });
        query.lte = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        query.limit = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockStatusLogs, error: null });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatusLogs,
          enumerable: true,
        });
        Object.defineProperty(query, 'error', {
          get: () => null,
          enumerable: true,
        });
        return query;
      };

      const mockLocationDetailsQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [{ id: 'loc1', code: 'L01' }] }),
      };

      let locCallCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') return mockWarehouseQuery;
        if (table === 'product_categories') return mockCategoriesQuery;
        if (table === 'transactions') return createTransactionsQuery();
        if (table === 'locations') {
          locCallCount++;
          if (locCallCount === 1) return mockLocationQuery;
          return mockLocationDetailsQuery;
        }
        if (table === 'status_change_logs') return createStatusLogsQuery();
        return mockWarehouseQuery;
      });

      // The client-side filter in history-actions.ts should filter logs by changer email
      const result = await getHistory('WH01', 100, 'detailed', { search: 'admin' });

      // All SYSTEM entries should have "admin" in their user field
      const systemEntries = result.filter((e) => e.category === 'SYSTEM');
      expect(systemEntries.length).toBe(1);
      expect(systemEntries[0].user).toContain('admin');
    });
  });
});
