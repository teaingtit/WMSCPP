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
  });
});
