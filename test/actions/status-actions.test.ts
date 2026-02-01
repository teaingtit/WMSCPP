// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getStatusDefinitions,
  getDefaultStatus,
  createStatusDefinition,
  updateStatusDefinition,
  deleteStatusDefinition,
  applyEntityStatus,
  removeEntityStatus,
  getInventoryStatusData,
} from '@/actions/status-actions';
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

describe('Status Actions', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = createMockUser();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getStatusDefinitions', () => {
    it('should fetch active status definitions', async () => {
      const mockStatuses = [
        {
          id: 'status1',
          name: 'Available',
          code: 'AVAILABLE',
          is_active: true,
        },
      ];

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
        }); // Support chaining
        const promise = Promise.resolve({ data: mockStatuses });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatuses,
          enumerable: true,
        });
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await getStatusDefinitions();

      expect(result).toEqual(mockStatuses);
    });
  });

  describe('getDefaultStatus', () => {
    it('should fetch default status', async () => {
      const mockStatus = {
        id: 'status1',
        name: 'Default',
        is_default: true,
        is_active: true,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getDefaultStatus();

      expect(result).toEqual(mockStatus);
    });
  });

  describe('createStatusDefinition', () => {
    it('should create status definition successfully', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      // Create insert query builder - insert() should return a promise
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({
          data: null,
          error: null,
        });
        // insert() is called directly on the query builder
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      // Since is_default is 'false', the update query won't be called
      // So the first call to from('status_definitions') should return insert query
      mockSupabase.from = vi.fn((table) => {
        if (table === 'status_definitions') {
          return mockInsertQuery;
        }
        return mockUpdateQuery;
      });

      const formData = createMockFormData({
        name: 'New Status',
        code: 'NEW_STATUS',
        color: '#FF0000',
        bg_color: '#FFFFFF',
        text_color: '#000000',
        effect: 'NORMAL',
        status_type: 'PRODUCT',
        is_default: 'false',
        sort_order: '0',
      });

      const result = await createStatusDefinition(formData);

      expect(result.success).toBe(true);
    });

    it('should unset other defaults when setting new default', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'status_definitions') {
          _callCount++;
          if (_callCount === 1) return mockUpdateQuery;
          return { insert: mockInsert };
        }
        return mockUpdateQuery;
      });

      const formData = createMockFormData({
        name: 'New Default',
        code: 'NEW_DEFAULT',
        color: '#FF0000',
        bg_color: '#FFFFFF',
        text_color: '#000000',
        effect: 'NORMAL',
        status_type: 'PRODUCT',
        is_default: 'true',
        sort_order: '0',
      });

      const result = await createStatusDefinition(formData);

      expect(mockUpdateQuery.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('updateStatusDefinition', () => {
    it('should handle duplicate code on update', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: { code: '23505', message: 'Duplicate key' },
        }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Updated',
        code: 'EXISTING_CODE',
        color: '#00FF00',
        bg_color: '#FFFFFF',
        text_color: '#000000',
        effect: 'NORMAL',
        status_type: 'PRODUCT',
      });

      const result = await updateStatusDefinition(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should update status definition successfully', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ error: null }),
      };

      // Since is_default is not set (or false), the first update query won't be called
      // So the first call to from('status_definitions') should return the update query
      // update().eq() should return a promise with { data, error }
      const createUpdateQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({
          data: null,
          error: null,
        });
        query.update = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockUpdateQuery2 = createUpdateQuery();

      mockSupabase.from = vi.fn((table) => {
        if (table === 'status_definitions') {
          return mockUpdateQuery2;
        }
        return mockUpdateQuery;
      });

      const formData = createMockFormData({
        id: '00000000-0000-0000-0000-000000000001', // Valid UUID
        name: 'Updated Status',
        code: 'UPDATED',
        color: '#00FF00',
        bg_color: '#FFFFFF',
        text_color: '#000000',
        effect: 'NORMAL',
        status_type: 'PRODUCT',
      });

      const result = await updateStatusDefinition(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteStatusDefinition', () => {
    it('should soft delete status when not in use', async () => {
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
        if (table === 'entity_statuses') {
          return mockCheckQuery;
        }
        if (table === 'status_definitions') {
          return mockUpdateQuery;
        }
        return mockCheckQuery;
      });

      const formData = createMockFormData({ id: 'status1' });

      const result = await deleteStatusDefinition(formData);

      expect(result.success).toBe(true);
    });

    it('should reject delete when status is in use', async () => {
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      };

      mockSupabase.from = vi.fn(() => mockCheckQuery);

      const formData = createMockFormData({ id: 'status1' });

      const result = await deleteStatusDefinition(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot delete');
    });
  });

  describe('applyEntityStatus', () => {
    it('should apply status to entity successfully', async () => {
      // getAuthUser calls supabase.auth.getUser() and then queries user_roles
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      // Mock user_roles query for getAuthUser
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', is_active: true },
        }),
      };

      const mockCurrentStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };

      // Create upsert query that returns a promise
      // upsert() is called with data and options, returns { data, error }
      const createUpsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({
          data: null,
          error: null,
        });
        query.upsert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockUpsertQuery = createUpsertQuery();

      // Create insert query that returns a promise
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({
          data: null,
          error: null,
        });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRoleQuery;
        }
        if (table === 'entity_statuses') {
          _callCount++;
          if (_callCount === 1) return mockCurrentStatusQuery;
          return mockUpsertQuery;
        }
        if (table === 'status_change_logs') {
          return mockInsertQuery;
        }
        return mockCurrentStatusQuery;
      });

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: '00000000-0000-0000-0000-000000000001', // Valid UUID
        status_id: '00000000-0000-0000-0000-000000000002', // Valid UUID
        notes: 'Test note',
        reason: 'Test reason',
      });

      const result = await applyEntityStatus(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('removeEntityStatus', () => {
    it('should remove status when no current status (skip log insert)', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockCurrentStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };

      const createDeleteQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.delete = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'error', { get: () => null, enumerable: true });
        return query;
      };
      const mockDeleteQuery = createDeleteQuery();

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'entity_statuses') {
          _callCount++;
          if (_callCount === 1) return mockCurrentStatusQuery;
          return mockDeleteQuery;
        }
        return mockCurrentStatusQuery;
      });

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
        reason: 'Removed',
      });

      const result = await removeEntityStatus(formData);

      expect(result.success).toBe(true);
    });

    it('should remove status from entity successfully', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockCurrentStatus = {
        status_id: 'status1',
        affected_quantity: 10,
      };

      const mockCurrentStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCurrentStatus }),
      };

      // Create delete query that supports chaining with multiple eq() calls
      const createDeleteQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.delete = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          // After second eq(), return the promise
          return query;
        });
        // Make it thenable
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'error', { get: () => null, enumerable: true });
        return query;
      };
      const mockDeleteQuery = createDeleteQuery();

      // Create insert query that returns a promise
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({
          data: null,
          error: null,
        });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'entity_statuses') {
          _callCount++;
          if (_callCount === 1) return mockCurrentStatusQuery;
          return mockDeleteQuery;
        }
        if (table === 'status_change_logs') {
          return mockInsertQuery;
        }
        return mockCurrentStatusQuery;
      });

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
        reason: 'Removed for testing',
      });

      const result = await removeEntityStatus(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('getInventoryStatusData', () => {
    it('should fetch status data for multiple stocks', async () => {
      const mockStatuses = [
        {
          entity_id: 'stock1',
          status: { id: 'status1', name: 'Available' },
        },
      ];

      const mockNotes = [{ entity_id: 'stock1' }, { entity_id: 'stock1' }];

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockStatuses, error: null }),
      };

      const mockNotesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockNotes, error: null }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'entity_statuses') {
          return mockStatusQuery;
        }
        if (table === 'entity_notes') {
          return mockNotesQuery;
        }
        return mockStatusQuery;
      });

      const result = await getInventoryStatusData(['stock1', 'stock2']);

      expect(result.statuses).toBeInstanceOf(Map);
      expect(result.noteCounts).toBeInstanceOf(Map);
      expect(result.noteCounts.get('stock1')).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      };

      mockSupabase.from = vi.fn(() => mockStatusQuery);

      const result = await getInventoryStatusData(['stock1']);

      expect(result.statuses.size).toBe(0);
      expect(result.noteCounts.size).toBe(0);
    });

    it('should handle noteError gracefully', async () => {
      const mockStatuses = [
        {
          entity_id: 'stock1',
          status: { id: 'status1', name: 'Available' },
        },
      ];

      const mockStatusQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockStatuses, error: null }),
      };

      const mockNotesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: new Error('Notes Error') }),
      };

      mockSupabase.from = vi.fn((table) => {
        if (table === 'entity_statuses') {
          return mockStatusQuery;
        }
        if (table === 'entity_notes') {
          return mockNotesQuery;
        }
        return mockStatusQuery;
      });

      const result = await getInventoryStatusData(['stock1']);

      // Statuses should still be returned even if notes fail
      expect(result.statuses.size).toBe(1);
      expect(result.noteCounts.size).toBe(0); // Notes failed so empty
    });
  });

  describe('getAllStatusDefinitions', () => {
    it('should fetch all status definitions including inactive', async () => {
      const mockStatuses = [
        { id: 'status1', name: 'Active', is_active: true },
        { id: 'status2', name: 'Inactive', is_active: false },
      ];

      const createQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.order = vi.fn(function () {
          return query;
        });
        const promise = Promise.resolve({ data: mockStatuses });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatuses,
          enumerable: true,
        });
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await (await import('@/actions/status-actions')).getAllStatusDefinitions();

      expect(result.length).toBe(2);
    });
  });

  describe('getLocationStatusDefinitions', () => {
    it('should fetch only location type status definitions', async () => {
      const mockStatuses = [
        { id: 'status1', name: 'Available', status_type: 'LOCATION', is_active: true },
      ];

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
        });
        const promise = Promise.resolve({ data: mockStatuses });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'data', {
          get: () => mockStatuses,
          enumerable: true,
        });
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await (
        await import('@/actions/status-actions')
      ).getLocationStatusDefinitions();

      expect(result.length).toBe(1);
      expect(result[0].status_type).toBe('LOCATION');
    });
  });

  describe('getEntityStatus', () => {
    it('should return null when entity has no status (PGRST116)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows' },
        }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityStatus('STOCK', 'stock1');

      expect(result).toBeNull();
    });

    it('should fetch status for a single entity', async () => {
      const mockStatus = {
        entity_id: 'stock1',
        entity_type: 'STOCK',
        status: { id: 'status1', name: 'Available' },
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStatus }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityStatus('STOCK', 'stock1');

      expect(result).toEqual(mockStatus);
    });
  });

  describe('getEntityStatuses', () => {
    it('should fetch statuses for multiple entities', async () => {
      const mockStatuses = [
        { entity_id: 'stock1', status: { id: 'status1', name: 'Available' } },
        { entity_id: 'stock2', status: { id: 'status2', name: 'Reserved' } },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockStatuses }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityStatuses('STOCK', ['stock1', 'stock2']);

      expect(result.size).toBe(2);
      expect(result.get('stock1')).toBeDefined();
    });
  });

  describe('getLotStatus', () => {
    it('should fetch lot status', async () => {
      const mockLotStatus = {
        lot: 'LOT001',
        status_id: 'status1',
        status: { id: 'status1', name: 'Available' },
        applied_at: '2024-01-01',
        applied_by: 'user1',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLotStatus }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (await import('@/actions/status-actions')).getLotStatus('wh1', 'LOT001');

      expect(result).toEqual(mockLotStatus);
    });

    it('should return null when lot status not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (await import('@/actions/status-actions')).getLotStatus('wh1', 'LOT001');

      expect(result).toBeNull();
    });
  });

  describe('getLotStatuses', () => {
    it('should fetch lot statuses for warehouse', async () => {
      const mockLotStatuses = [
        { lot: 'LOT001', status: { id: 'status1', name: 'Available' } },
        { lot: 'LOT002', status: { id: 'status2', name: 'Reserved' } },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockLotStatuses }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (await import('@/actions/status-actions')).getLotStatuses('wh1');

      expect(result.size).toBe(2);
      expect(result.get('LOT001')).toBeDefined();
    });

    it('should handle errors and return empty map', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (await import('@/actions/status-actions')).getLotStatuses('wh1');

      expect(result.size).toBe(0);
    });
  });

  describe('getLotStatus', () => {
    it('should log error when DB request fails with non-PGRST116 code', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Unknown DB Error' },
        }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await (await import('@/actions/status-actions')).getLotStatus('wh1', 'LOT001');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching lot status:', expect.anything());
      consoleSpy.mockRestore();
    });
  });

  describe('setLotStatus', () => {
    it('should handle generic error during upsert', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };

      const mockUpsertQuery = {
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Upsert failed' } }),
      };

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') return mockRoleQuery;
        if (table === 'lot_statuses') return mockUpsertQuery;
        return mockRoleQuery; // fallthrough
      });

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '00000000-0000-0000-0000-000000000002',
        reason: 'Test',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Upsert failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle generic error during delete', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: { message: 'Delete failed' } }),
        catch: vi.fn(),
      } as any;

      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') return mockRoleQuery;
        if (table === 'lot_statuses') return mockDeleteQuery;
        return mockRoleQuery;
      });

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Delete failed');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
    it('should set lot status for admin user', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };

      const createUpsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ data: null, error: null });
        query.upsert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockUpsertQuery = createUpsertQuery();

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRoleQuery;
        }
        if (table === 'lot_statuses') {
          return mockUpsertQuery;
        }
        return mockRoleQuery;
      });

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '00000000-0000-0000-0000-000000000002',
        reason: 'Test',
      });

      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(true);
    });

    it('should reject non-admin user', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'user' } }),
      };

      mockSupabase.from = vi.fn(() => mockRoleQuery);

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '00000000-0000-0000-0000-000000000002',
      });

      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Admin access required');
    });

    it('should remove lot status when status_id is null', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };

      const createDeleteQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.delete = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return query;
        });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        Object.defineProperty(query, 'error', { get: () => null, enumerable: true });
        return query;
      };
      const mockDeleteQuery = createDeleteQuery();

      let callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRoleQuery;
        }
        if (table === 'lot_statuses') {
          return mockDeleteQuery;
        }
        return mockRoleQuery;
      });

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '',
      });

      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed');
    });
  });

  describe('getEntityNotes', () => {
    it('should fetch entity notes', async () => {
      const mockNotes = [
        { id: 'note1', content: 'Note 1' },
        { id: 'note2', content: 'Note 2' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      Object.assign(mockQuery, mockNotes);

      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityNotes('STOCK', 'stock1');

      expect(mockSupabase.from).toHaveBeenCalledWith('entity_notes');
    });
  });

  describe('getStatusChangeHistory', () => {
    it('should fetch status change history', async () => {
      const mockHistory = [{ id: 'log1', from_status_id: 'status1', to_status_id: 'status2' }];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getStatusChangeHistory('STOCK', 'stock1');

      expect(mockSupabase.from).toHaveBeenCalledWith('status_change_logs');
    });
  });

  describe('addEntityNote', () => {
    it('should add note to entity', async () => {
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
        content: 'Test note',
      });

      const result = await (await import('@/actions/status-actions')).addEntityNote(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('updateEntityNote', () => {
    it('should update entity note', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: 'note1',
        content: 'Updated note',
      });

      const result = await (await import('@/actions/status-actions')).updateEntityNote(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteEntityNote', () => {
    it('should delete entity note', async () => {
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

      mockSupabase.from = vi.fn(() => mockDeleteQuery);

      const formData = createMockFormData({ id: 'note1' });

      const result = await (await import('@/actions/status-actions')).deleteEntityNote(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('toggleNotePin', () => {
    it('should toggle note pin status', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: 'note1',
        is_pinned: 'true',
      });

      const result = await (await import('@/actions/status-actions')).toggleNotePin(formData);

      expect(result.success).toBe(true);
    });

    it('should handle toggle pin error', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: 'note1',
        is_pinned: 'true',
      });

      const result = await (await import('@/actions/status-actions')).toggleNotePin(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('removePartialStatus', () => {
    it('should remove partial status successfully', async () => {
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: null });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
        quantity: '5',
      });

      const result = await (await import('@/actions/status-actions')).removePartialStatus(formData);

      expect(result.success).toBe(true);
    });

    it('should handle error when removing partial status', async () => {
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: { message: 'Insert failed' } });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
      });

      const result = await (await import('@/actions/status-actions')).removePartialStatus(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('addEntityNote error handling', () => {
    it('should handle error when adding note', async () => {
      const createInsertQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: { message: 'Insert failed' } });
        query.insert = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockInsertQuery = createInsertQuery();

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: 'stock1',
        content: 'Test note',
      });

      const result = await (await import('@/actions/status-actions')).addEntityNote(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('updateEntityNote error handling', () => {
    it('should handle error when updating note', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: 'note1',
        content: 'Updated note',
      });

      const result = await (await import('@/actions/status-actions')).updateEntityNote(formData);

      expect(result.success).toBe(false);
    });

    it('should update note with is_pinned flag', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from = vi.fn(() => mockUpdateQuery);

      const formData = createMockFormData({
        id: 'note1',
        is_pinned: 'true',
      });

      const result = await (await import('@/actions/status-actions')).updateEntityNote(formData);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteEntityNote error handling', () => {
    it('should handle error when deleting note', async () => {
      const createDeleteQuery = () => {
        const query: any = {};
        const promise = Promise.resolve({ error: { message: 'Delete failed' } });
        query.delete = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          return promise;
        });
        return query;
      };
      const mockDeleteQuery = createDeleteQuery();

      mockSupabase.from = vi.fn(() => mockDeleteQuery);

      const formData = createMockFormData({ id: 'note1' });

      const result = await (await import('@/actions/status-actions')).deleteEntityNote(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('applyEntityStatus validation', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const formData = createMockFormData({
        entity_type: 'STOCK',
        entity_id: '00000000-0000-0000-0000-000000000001',
        status_id: '00000000-0000-0000-0000-000000000002',
      });

      const result = await applyEntityStatus(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication required');
    });
  });

  describe('setLotStatus authentication', () => {
    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const formData = createMockFormData({
        warehouse_id: '00000000-0000-0000-0000-000000000001',
        lot: 'LOT001',
        status_id: '00000000-0000-0000-0000-000000000002',
      });

      const result = await (await import('@/actions/status-actions')).setLotStatus(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication required');
    });
  });

  describe('createStatusDefinition error handling', () => {
    it('should handle duplicate code error', async () => {
      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({
          error: { code: '23505', message: 'Duplicate key' },
        }),
      };

      mockSupabase.from = vi.fn(() => mockInsertQuery);

      const formData = createMockFormData({
        name: 'New Status',
        code: 'EXISTING_CODE',
        color: '#FF0000',
        bg_color: '#FFFFFF',
        text_color: '#000000',
        effect: 'NORMAL',
        status_type: 'PRODUCT',
        is_default: 'false',
        sort_order: '0',
      });

      const result = await createStatusDefinition(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });
  });

  describe('deleteStatusDefinition error handling', () => {
    it('should handle delete error', async () => {
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn((table) => {
        if (table === 'entity_statuses') {
          return mockCheckQuery;
        }
        if (table === 'status_definitions') {
          return mockUpdateQuery;
        }
        return mockCheckQuery;
      });

      const formData = createMockFormData({ id: 'status1' });

      const result = await deleteStatusDefinition(formData);

      expect(result.success).toBe(false);
    });
  });

  describe('getEntityNotes', () => {
    it('should return null on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: null, error: new Error('DB error') }),
        catch: vi.fn(),
      };
      Object.defineProperty(mockQuery, 'data', { get: () => null });
      Object.defineProperty(mockQuery, 'error', { get: () => new Error('DB error') });
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityNotes('STOCK', 'stock1');
      expect(result).toBeNull();
    });

    it('should return notes on success', async () => {
      const mockNotes = [{ id: 'note1', content: 'Test note' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      const promise = Promise.resolve({ data: mockNotes, error: null });
      (mockQuery as any).then = promise.then.bind(promise);
      (mockQuery as any).catch = promise.catch.bind(promise);
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getEntityNotes('STOCK', 'stock1');
      expect(result).toEqual(mockNotes);
    });
  });

  describe('getStatusChangeHistory', () => {
    it('should return null on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: null, error: new Error('DB error') }),
        catch: vi.fn(),
      };
      Object.defineProperty(mockQuery, 'error', { get: () => new Error('DB error') });
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getStatusChangeHistory('STOCK', 'stock1');
      expect(result).toBeNull();
    });

    it('should return history on success', async () => {
      const mockHistory = [{ id: 'log1', from_status_id: 's1', to_status_id: 's2' }];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      const promise = Promise.resolve({ data: mockHistory, error: null });
      (mockQuery as any).then = promise.then.bind(promise);
      (mockQuery as any).catch = promise.catch.bind(promise);
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await (
        await import('@/actions/status-actions')
      ).getStatusChangeHistory('STOCK', 'stock1');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('removePartialStatus error handling', () => {
    it('should handle error when removing partial status', async () => {
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
      }));

      const formData = createMockFormData({
        entity_id: 'stock1',
        quantity: '5',
      });

      const result = await (await import('@/actions/status-actions')).removePartialStatus(formData);
      expect(result.success).toBe(false);
    });
  });
});
