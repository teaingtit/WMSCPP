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
import { createMockSupabaseClient, createMockUser, createMockFormData } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/utils/db-helpers', () => ({
  getWarehouseId: vi.fn((supabase, id) => Promise.resolve(id)),
}));

vi.mock('@/lib/auth-service', () => ({
  checkManagerRole: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/lib/action-utils', () => ({
  withAuth: vi.fn((handler, options) => handler),
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
      const mockInsert = vi.fn().mockResolvedValue({ data: mockSession, error: null });
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'audit_sessions') {
          callCount++;
          if (callCount === 1) {
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
          stocksQuery.select = vi.fn(function() { return stocksQuery; });
          stocksQuery.eq = vi.fn(function() { return stocksQuery; });
          stocksQuery.gt = vi.fn(function() { 
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

      const result = await createAuditSession(formData, {
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

      const result = await createAuditSession(formData, {
        user: mockUser,
        supabase: mockSupabase,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('มีอยู่แล้ว');
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

      const result = await getInventoryItems('wh1');

      expect(result).toEqual(mockItems);
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

      const result = await getAuditSessions('wh1');

      expect(result).toEqual(mockSessions);
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
  });
});
