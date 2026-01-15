import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFormData,
  extractFormFields,
  ok,
  fail,
  handleDuplicateError,
  modifyCategoryUnits,
  processBulkAction,
} from '@/lib/action-utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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
  });
});
