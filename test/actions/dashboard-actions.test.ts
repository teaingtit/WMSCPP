import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardWarehouses, getDashboardStats } from '@/actions/dashboard-actions';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Dashboard Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getDashboardWarehouses', () => {
    it('should return empty array for unauthenticated user', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const result = await getDashboardWarehouses();

      expect(result).toEqual([]);
    });

    it('should return all warehouses for admin', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', allowed_warehouses: [] },
        }),
      };

      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'wh1', code: 'WH01', name: 'Warehouse 1', is_active: true },
          ],
        }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRoleQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await getDashboardWarehouses();

      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter warehouses for staff based on allowed_warehouses', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'staff', allowed_warehouses: ['WH01'] },
        }),
      };

      // Create a query builder that supports chaining and reassignment
      // The query can be reassigned, so we need to return the same object reference
      const warehouseQueryResult = {
        data: [{ id: 'wh1', code: 'WH01', name: 'Warehouse 1', is_active: true }],
      };
      const createWarehouseQuery = () => {
        const query: any = {
          select: vi.fn(function() { return query; }),
          eq: vi.fn(function() { return query; }),
          in: vi.fn(function() { return query; }),
          order: vi.fn(function() { return query; }),
        };
        // Make it thenable and awaitable
        const promise = Promise.resolve(warehouseQueryResult);
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        // Support destructuring: const { data } = await query
        Object.defineProperty(query, 'data', {
          get: () => warehouseQueryResult.data,
          enumerable: true,
        });
        return query;
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRoleQuery;
        }
        return createWarehouseQuery();
      });

      const result = await getDashboardWarehouses();

      expect(result.length).toBe(1);
    });
  });

  describe('getDashboardStats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockWarehouse = { id: 'wh1' };
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse }),
      };

      const mockStocks = [
        { quantity: 10, locations: { warehouse_id: 'wh1' } },
        { quantity: 20, locations: { warehouse_id: 'wh1' } },
      ];

      const mockStocksQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockStocks }),
      };

      const mockAuditsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'audit1', name: 'Audit 1', status: 'OPEN' }],
        }),
      };

      const mockTransactionsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'tx1', type: 'INBOUND', quantity: 5 }],
        }),
      };

      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 5 }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'warehouses') {
          return mockWarehouseQuery;
        }
        if (table === 'stocks') {
          return mockStocksQuery;
        }
        if (table === 'audit_sessions') {
          return mockAuditsQuery;
        }
        if (table === 'transactions') {
          callCount++;
          if (callCount === 1) return mockTransactionsQuery;
          return mockCountQuery;
        }
        return mockWarehouseQuery;
      });

      const result = await getDashboardStats('WH01');

      expect(result.totalItems).toBe(2);
      expect(result.totalQty).toBe(30);
      expect(result.activeAudits).toBeDefined();
      expect(result.recentLogs).toBeDefined();
    });

    it('should return default values on error', async () => {
      const mockWarehouseQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockWarehouseQuery);

      const result = await getDashboardStats('INVALID');

      expect(result.totalItems).toBe(0);
      expect(result.totalQty).toBe(0);
      expect(result.todayTransactionCount).toBe(0);
    });
  });
});
