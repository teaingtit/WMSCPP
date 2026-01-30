// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFormData,
  extractFormFields,
  ok,
  fail,
  handleDuplicateError,
  modifyCategoryUnits,
  processBulkAction,
  softDelete,
  withAuth,
} from '@/lib/action-utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkManagerRole } from '@/lib/auth-service';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth-service', () => ({
  checkManagerRole: vi.fn(),
}));

describe('action-utils', () => {
  describe('validateFormData', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0),
    });

    it('should return validated data when valid', () => {
      const result = validateFormData(testSchema, { name: 'John', age: 25 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 25 });
      }
    });

    it('should return error response when invalid', () => {
      const result = validateFormData(testSchema, { name: '', age: 25 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.success).toBe(false);
        expect(result.response.message).toBe('Name is required');
        expect(result.response.errors).toBeDefined();
      }
    });

    it('should handle multiple validation errors', () => {
      const result = validateFormData(testSchema, { name: '', age: -1 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.errors).toBeDefined();
      }
    });
  });

  describe('extractFormFields', () => {
    it('should extract specified fields from FormData', () => {
      const formData = new FormData();
      formData.append('name', 'Test');
      formData.append('email', 'test@example.com');
      formData.append('age', '25');

      const result = extractFormFields(formData, ['name', 'email']);

      expect(result).toEqual({
        name: 'Test',
        email: 'test@example.com',
      });
    });

    it('should return null for missing fields', () => {
      const formData = new FormData();
      formData.append('name', 'Test');

      const result = extractFormFields(formData, ['name', 'email']);

      expect(result).toEqual({
        name: 'Test',
        email: null,
      });
    });
  });

  describe('ok', () => {
    it('should create success response with message', () => {
      const result = ok('Operation successful');

      expect(result).toEqual({
        success: true,
        message: 'Operation successful',
      });
    });

    it('should include additional data when provided', () => {
      const result = ok('Success', { data: { id: 123 } });

      expect(result).toEqual({
        success: true,
        message: 'Success',
        data: { id: 123 },
      });
    });
  });

  describe('fail', () => {
    it('should create error response with message', () => {
      const result = fail('Operation failed');

      expect(result).toEqual({
        success: false,
        message: 'Operation failed',
      });
    });
  });

  describe('handleDuplicateError', () => {
    it('should return error response for duplicate key error (23505)', () => {
      const error = { code: '23505' };
      const result = handleDuplicateError(error, 'SKU', 'ABC123');

      expect(result).toEqual({
        success: false,
        message: 'SKU "ABC123" already exists',
      });
    });

    it('should return null for non-duplicate errors', () => {
      const error = { code: '23503' };
      const result = handleDuplicateError(error, 'SKU', 'ABC123');

      expect(result).toBeNull();
    });

    it('should return null when error is null', () => {
      const result = handleDuplicateError(null, 'SKU', 'ABC123');

      expect(result).toBeNull();
    });
  });

  describe('modifyCategoryUnits', () => {
    let mockSupabase: any;
    let mockSingle: any;
    let mockEq: any;
    let mockSelect: any;
    let mockFrom: any;
    let mockUpdate: any;
    let mockUpdateEq: any;

    beforeEach(() => {
      vi.clearAllMocks();

      // Setup mock chain for SELECT query
      mockSingle = vi.fn();
      mockEq = vi.fn(() => ({ single: mockSingle }));
      mockSelect = vi.fn(() => ({ eq: mockEq }));

      // Setup mock chain for UPDATE query
      mockUpdateEq = vi.fn();
      mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

      mockFrom = vi.fn((table: string) => {
        if (table === 'product_categories') {
          // First call is SELECT, second call is UPDATE
          const callCount = mockFrom.mock.calls.filter(
            (call: any) => call[0] === 'product_categories',
          ).length;
          if (callCount === 1) {
            return { select: mockSelect };
          } else {
            return { update: mockUpdate };
          }
        }
        return { select: mockSelect };
      });

      mockSupabase = {
        from: mockFrom,
      };

      (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('should return error for invalid parameters', async () => {
      const result = await modifyCategoryUnits('', 'KG', 'add');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid parameters');
    });

    it('should add unit to category successfully', async () => {
      const mockCategory = { units: ['PCS'] };
      mockSingle.mockResolvedValue({
        data: mockCategory,
        error: null,
      });
      mockUpdateEq.mockResolvedValue({ error: null });

      const result = await modifyCategoryUnits('cat-123', 'kg', 'add');

      expect(result.success).toBe(true);
      expect(result.message).toContain('KG');
      expect(result.message).toContain('added');
    });

    it('should return error when adding duplicate unit', async () => {
      const mockCategory = { units: ['KG', 'PCS'] };
      mockSingle.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const result = await modifyCategoryUnits('cat-123', 'kg', 'add');

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });

    it('should remove unit from category successfully', async () => {
      const mockCategory = { units: ['KG', 'PCS'] };
      mockSingle.mockResolvedValue({
        data: mockCategory,
        error: null,
      });
      mockUpdateEq.mockResolvedValue({ error: null });

      const result = await modifyCategoryUnits('cat-123', 'kg', 'remove');

      expect(result.success).toBe(true);
      expect(result.message).toContain('KG');
      expect(result.message).toContain('removed');
    });

    it('should return error when removing non-existent unit', async () => {
      const mockCategory = { units: ['PCS'] };
      mockSingle.mockResolvedValue({
        data: mockCategory,
        error: null,
      });

      const result = await modifyCategoryUnits('cat-123', 'kg', 'remove');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const result = await modifyCategoryUnits('cat-123', 'kg', 'add');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error');
    });
  });

  describe('processBulkAction', () => {
    it('should process all items successfully', async () => {
      const items = [1, 2, 3];
      const action = vi.fn().mockResolvedValue({ success: true });

      const result = await processBulkAction(items, action);

      expect(result.success).toBe(true);
      expect(result.details.success).toBe(3);
      expect(result.details.failed).toBe(0);
      expect(action).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      const items = [1, 2, 3];
      const action = vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: 'Failed item 2' })
        .mockResolvedValueOnce({ success: true });

      const result = await processBulkAction(items, action);

      expect(result.success).toBe(false);
      expect(result.details.success).toBe(2);
      expect(result.details.failed).toBe(1);
      expect(result.details.errors).toContain('Failed item 2');
    });

    it('should handle exceptions in action', async () => {
      const items = [1, 2];
      const action = vi
        .fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Action threw error'));

      const result = await processBulkAction(items, action);

      expect(result.success).toBe(false);
      expect(result.details.success).toBe(1);
      expect(result.details.failed).toBe(1);
      expect(result.details.errors).toContain('Action threw error');
    });

    it('should handle empty items array', async () => {
      const items: number[] = [];
      const action = vi.fn();

      const result = await processBulkAction(items, action);

      expect(result.success).toBe(true);
      expect(result.details.success).toBe(0);
      expect(result.details.failed).toBe(0);
      expect(action).not.toHaveBeenCalled();
    });

    it('should handle action with undefined message on failure', async () => {
      const items = [1];
      const action = vi.fn().mockResolvedValue({ success: false });

      const result = await processBulkAction(items, action);

      expect(result.success).toBe(false);
      expect(result.details.errors).toContain('Unknown Error');
    });
  });

  describe('softDelete', () => {
    let mockSupabase: any;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should soft delete item when not in use', async () => {
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'stocks') return mockCheckQuery;
          if (table === 'products') return mockUpdateQuery;
          return mockCheckQuery;
        }),
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const result = await softDelete({
        table: 'products',
        id: 'prod-123',
        checkTable: 'stocks',
        checkColumn: 'product_id',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when item is in use', async () => {
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 5 }),
      };

      mockSupabase = {
        from: vi.fn(() => mockCheckQuery),
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const result = await softDelete({
        table: 'products',
        id: 'prod-123',
        checkTable: 'stocks',
        checkColumn: 'product_id',
        errorMessage: 'Item is in use',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Item is in use');
    });

    it('should soft delete without usage check', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase = {
        from: vi.fn(() => mockUpdateQuery),
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const result = await softDelete({
        table: 'products',
        id: 'prod-123',
      });

      expect(result.success).toBe(true);
    });

    it('should rename field when specified', async () => {
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase = {
        from: vi.fn(() => mockUpdateQuery),
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const result = await softDelete({
        table: 'products',
        id: 'prod-123',
        renameField: { field: 'sku', currentValue: 'SKU001' },
      });

      expect(result.success).toBe(true);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          sku: expect.stringContaining('SKU001_DEL_'),
        }),
      );
    });

    it('should handle update errors', async () => {
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      };

      mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'stocks') return mockCheckQuery;
          return mockUpdateQuery;
        }),
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const result = await softDelete({
        table: 'products',
        id: 'prod-123',
        checkTable: 'stocks',
        checkColumn: 'product_id',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('withAuth', () => {
    let mockSupabase: any;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should fail when user is not authenticated', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const handler = vi.fn();
      const wrappedAction = withAuth(handler);
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should fail when user has no email', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } }, // No email
          }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const handler = vi.fn();
      const wrappedAction = withAuth(handler);
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthenticated');
    });

    it('should execute handler when user is authenticated', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const handler = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
      const wrappedAction = withAuth(handler);
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should catch and handle handler errors', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);

      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const wrappedAction = withAuth(handler);
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Handler failed');
    });

    it('should return Internal Server Error when handler throws error without message', async () => {
      const handler = vi.fn().mockRejectedValue(new Error());
      const wrappedAction = withAuth(handler);
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal Server Error');
    });

    it('should fail when admin role is required but user is not admin', async () => {
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'staff' } }),
      };

      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
        from: vi.fn(() => mockRoleQuery),
      };

      (createClient as any).mockResolvedValue(mockSupabase);
      (checkManagerRole as any).mockResolvedValue(false);

      const handler = vi.fn();
      const wrappedAction = withAuth(handler, { requiredRole: 'admin' });
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Forbidden');
      expect(result.message).toContain('Admin');
    });

    it('should succeed when admin role is required and user is admin', async () => {
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };

      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
        from: vi.fn(() => mockRoleQuery),
      };

      (createClient as any).mockResolvedValue(mockSupabase);
      (checkManagerRole as any).mockResolvedValue(true);

      const handler = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
      const wrappedAction = withAuth(handler, { requiredRole: 'admin' });
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });

    it('should fail when manager role is required but user is not manager', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);
      (checkManagerRole as any).mockResolvedValue(false);

      const handler = vi.fn();
      const wrappedAction = withAuth(handler, { requiredRole: 'manager' });
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Forbidden');
      expect(result.message).toContain('Manager');
    });

    it('should succeed when manager role is required and user is manager', async () => {
      mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com', created_at: '2024-01-01' } },
          }),
        },
      };

      (createClient as any).mockResolvedValue(mockSupabase);
      (checkManagerRole as any).mockResolvedValue(true);

      const handler = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
      const wrappedAction = withAuth(handler, { requiredRole: 'manager' });
      const result = await wrappedAction({ test: 'data' });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalled();
    });
  });
});
