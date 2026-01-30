// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAuditSession,
  getInventoryItems,
  getAuditSessions,
  getAuditItems,
  getAuditSessionById,
  updateAuditItemCount,
  finalizeAuditSession,
  updateAuditSession,
} from '@/actions/audit-actions';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockFormData,
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

vi.mock('@/lib/action-utils', () => ({
  withAuth: vi.fn((handler, _options) => {
    // Return a function that accepts both data and optional context
    return (data: any, ctx?: any) => handler(data, ctx);
  }),
}));

describe('Audit Actions', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = createMockUser();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('createAuditSession', () => {
    it('should create audit session successfully', async () => {
      const mockSession = { id: 'session1' };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          _callCount++;
          if (_callCount === 1) {
            return mockQuery; // First call: check for duplicate
          }
          // Second call: insert session
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'stocks') {
          // When items is empty, it queries stocks for full audit
          const stocksQuery: any = {};
          stocksQuery.select = vi.fn(function () {
            return stocksQuery;
          });
          stocksQuery.eq = vi.fn(function () {
            return stocksQuery;
          });
          stocksQuery.gt = vi.fn(function () {
            return Promise.resolve({ data: [] }); // Empty for this test
          });
          return stocksQuery;
        }
        if (table === 'audit_items') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockQuery;
      });

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Test Audit',
        items: '[]',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(true);
    });

    it('should reject duplicate session name', async () => {
      const mockExistingSession = { id: 'existing1' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockExistingSession }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Existing Audit',
        items: '[]',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('มีอยู่แล้ว');
    });

    it('should reject when validation fails', async () => {
      const formData = createMockFormData({
        warehouseId: '',
        name: '',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should reject when warehouse not found', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const formData = createMockFormData({
        warehouseId: 'invalid',
        name: 'Test',
        items: '[]',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบคลังสินค้า');
    });

    it('should return error when inserting audit items fails', async () => {
      const mockSession = { id: 'session1' };
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'stocks') {
          const stocksQuery: any = {};
          stocksQuery.select = vi.fn().mockReturnThis();
          stocksQuery.eq = vi.fn().mockReturnThis();
          stocksQuery.gt = vi.fn().mockResolvedValue({
            data: [{ product_id: 'p1', location_id: 'l1', quantity: 10 }],
          });
          return stocksQuery;
        }
        if (table === 'audit_items') {
          return {
            insert: vi.fn().mockResolvedValue({ error: { message: 'Insert items failed' } }),
          };
        }
        return mockQuery;
      });

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Test Audit',
        items: '',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Insert items failed');
    });

    it('should handle invalid JSON in items gracefully', async () => {
      const mockSession = { id: 'session1' };
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'stocks') {
          const stocksQuery: any = {};
          stocksQuery.select = vi.fn().mockReturnThis();
          stocksQuery.eq = vi.fn().mockReturnThis();
          stocksQuery.gt = vi.fn().mockResolvedValue({ data: [] });
          return stocksQuery;
        }
        if (table === 'audit_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return mockQuery;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Test Audit',
        items: 'invalid-json-{{{',
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      // Should still succeed but fallback to full audit (empty stocks)
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should create partial audit with selected items', async () => {
      const mockSession = { id: 'session1' };
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      const mockStocksData = [
        { id: 'stock1', product_id: 'p1', location_id: 'l1', quantity: 10 },
        { id: 'stock2', product_id: 'p2', location_id: 'l2', quantity: 20 },
      ];

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'stocks') {
          const stocksQuery: any = {};
          stocksQuery.select = vi.fn().mockReturnThis();
          stocksQuery.in = vi.fn().mockResolvedValue({ data: mockStocksData });
          return stocksQuery;
        }
        if (table === 'audit_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return mockQuery;
      });

      const selectedItems = [{ inventory_id: 'stock1' }, { inventory_id: 'stock2' }];

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Partial Audit',
        items: JSON.stringify(selectedItems),
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session1');
    });

    it('should handle partial audit with missing inventory items', async () => {
      const mockSession = { id: 'session1' };
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      // Only stock1 exists in DB, stock2 does not
      const mockStocksData = [{ id: 'stock1', product_id: 'p1', location_id: 'l1', quantity: 10 }];

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
          };
        }
        if (table === 'stocks') {
          const stocksQuery: any = {};
          stocksQuery.select = vi.fn().mockReturnThis();
          stocksQuery.in = vi.fn().mockResolvedValue({ data: mockStocksData });
          return stocksQuery;
        }
        if (table === 'audit_items') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return mockQuery;
      });

      // Request stock1 (exists) and stock2 (doesn't exist)
      const selectedItems = [{ inventory_id: 'stock1' }, { inventory_id: 'stock2' }];

      const formData = createMockFormData({
        warehouseId: 'wh1',
        name: 'Partial Audit Missing',
        items: JSON.stringify(selectedItems),
      });

      const result = await (createAuditSession as any)(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      // Should succeed but only include the found item
      expect(result.success).toBe(true);
    });
  });

  describe('getInventoryItems', () => {
    it('should fetch inventory items for warehouse', async () => {
      const mockItems = [
        {
          id: 'item1',
          quantity: 10,
          product: { id: 'prod1', sku: 'SKU001', name: 'Product 1', image_url: null },
          location: { id: 'loc1', code: 'L01-P01-1' },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const result = await getInventoryItems('wh1');

      expect(result).toEqual(mockItems);
    });

    it('should return empty array when warehouse not found', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await getInventoryItems('invalid');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const result = await getInventoryItems('wh1');
      expect(result).toEqual([]);
    });

    it('should log error and return empty array on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      };
      mockSupabase.from = vi.fn().mockReturnValue(mockQuery);

      const result = await getInventoryItems('wh1');

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('getInventoryItems Error:', 'DB error');
      consoleSpy.mockRestore();
    });
  });

  describe('getAuditSessions', () => {
    it('should fetch audit sessions for warehouse', async () => {
      const mockSessions = [
        { id: 'session1', name: 'Audit 1', status: 'OPEN', created_at: '2024-01-01' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSessions }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue('wh1');

      const result = await getAuditSessions('wh1');

      expect(result).toEqual(mockSessions);
    });

    it('should return empty array when warehouse not found', async () => {
      const { getWarehouseId } = await import('@/lib/utils/db-helpers');
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await getAuditSessions('invalid');

      expect(result).toEqual([]);
    });
  });

  describe('getAuditSessionById', () => {
    it('should fetch audit session by id', async () => {
      const mockSession = {
        id: 'session1',
        name: 'Audit 1',
        status: 'OPEN',
        warehouse_id: 'wh1',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getAuditSessionById('session1');

      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getAuditSessionById('invalid');

      expect(result).toBeNull();
    });
  });

  describe('getAuditItems', () => {
    it('should fetch audit items for session', async () => {
      const mockItems = [
        {
          id: 'item1',
          session_id: 'session1',
          system_qty: 10,
          counted_qty: 10,
          status: 'COUNTED',
          product: { sku: 'SKU001', name: 'Product 1', uom: 'PCS', image_url: null },
          location: { code: 'L01-P01-1', lot: 'L01', cart: 'P01', level: 1 },
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getAuditItems('session1');

      expect(result).toEqual(mockItems);
    });

    it('should return empty array on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getAuditItems('session1');

      expect(result).toEqual([]);
    });
  });

  describe('updateAuditItemCount', () => {
    it('should update audit item count successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockAuditItem = {
        id: 'item1',
        session_id: 'session1',
        audit_sessions: { status: 'OPEN' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAuditItem }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_items') {
          callCount++;
          if (callCount === 1) return mockQuery;
          return mockUpdateQuery;
        }
        return mockQuery;
      });

      const result = await updateAuditItemCount('item1', 10);

      expect(result.success).toBe(true);
    });

    it('should reject negative count', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const result = await updateAuditItemCount('item1', -5);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ติดลบ');
    });

    it('should reject update for closed session', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockAuditItem = {
        id: 'item1',
        session_id: 'session1',
        audit_sessions: { status: 'CLOSED' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAuditItem }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await updateAuditItemCount('item1', 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ปิดแล้ว');
    });

    it('should reject when unauthenticated', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const result = await updateAuditItemCount('item1', 10);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });

    it('should reject when audit item not found', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await updateAuditItemCount('invalid', 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบรายการ');
    });

    it('should return error when update fails', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockAuditItem = {
        id: 'item1',
        session_id: 'session1',
        audit_sessions: { status: 'OPEN' },
      };
      const selectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAuditItem }),
      };
      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'audit_items') {
          callCount++;
          return callCount === 1 ? selectQuery : updateQuery;
        }
        return selectQuery;
      });

      const result = await updateAuditItemCount('item1', 10);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Update failed');
    });
  });

  describe('finalizeAuditSession', () => {
    it('should finalize audit session successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null });

      const result = await finalizeAuditSession('session1', 'wh1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('process_audit_adjustment', expect.any(Object));
      expect(result.success).toBe(true);
    });

    it('should reject when unauthenticated', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const result = await finalizeAuditSession('session1', 'wh1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });

    it('should reject when user is not manager', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const { checkManagerRole } = await import('@/lib/auth-service');
      vi.mocked(checkManagerRole).mockResolvedValue(false);

      const result = await finalizeAuditSession('session1', 'wh1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('สิทธิ์');
    });

    it('should return error when rpc fails', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const { checkManagerRole } = await import('@/lib/auth-service');
      vi.mocked(checkManagerRole).mockResolvedValue(true);
      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: new Error('RPC failed') });

      const result = await finalizeAuditSession('session1', 'wh1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('RPC failed');
    });
  });

  describe('updateAuditSession', () => {
    it('should update audit session successfully', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const result = await updateAuditSession('session1', 'wh1', { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('อัปเดต');
    });

    it('should return error when update fails', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
      };
      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const result = await updateAuditSession('session1', 'wh1', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('DB error');
    });
  });
});
