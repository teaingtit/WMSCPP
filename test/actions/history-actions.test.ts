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
  });
});
