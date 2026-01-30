// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapFormAction, notify, confirmAction } from '@/lib/ui-helpers';
import { toast } from 'sonner';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.confirm
global.confirm = vi.fn();

describe('ui-helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('wrapFormAction', () => {
    it('should wrap async function and call it with formData', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });
      const wrapped = wrapFormAction(mockFn);

      const formData = new FormData();
      formData.append('test', 'value');

      await wrapped(null, formData);

      expect(mockFn).toHaveBeenCalledWith(formData);
    });

    it('should return the result from wrapped function', async () => {
      const expectedResult = { success: true, data: 'test' };
      const mockFn = vi.fn().mockResolvedValue(expectedResult);
      const wrapped = wrapFormAction(mockFn);

      const result = await wrapped(null, new FormData());

      expect(result).toEqual(expectedResult);
    });
  });

  describe('notify.ok', () => {
    it('should show success toast when res.success is true', () => {
      const res = { success: true, message: 'Operation successful' };
      notify.ok(res);

      expect(toast.success).toHaveBeenCalledWith('Operation successful', undefined);
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('should show error toast when res.success is false', () => {
      const res = { success: false, message: 'Operation failed' };
      notify.ok(res);

      expect(toast.error).toHaveBeenCalledWith('Operation failed', undefined);
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('should use default success message if not provided', () => {
      const res = { success: true };
      notify.ok(res, { successMsg: 'Custom success' });

      expect(toast.success).toHaveBeenCalledWith('Custom success', undefined);
    });

    it('should use default error message if not provided', () => {
      const res = { success: false };
      notify.ok(res, { errorMsg: 'Custom error' });

      expect(toast.error).toHaveBeenCalledWith('Custom error', undefined);
    });

    it('should pass toast id option when provided', () => {
      const res = { success: true, message: 'Success' };
      notify.ok(res, { id: 'toast-123' });

      expect(toast.success).toHaveBeenCalledWith('Success', { id: 'toast-123' });
    });

    it('should pass id option for error toast when provided', () => {
      const res = { success: false, message: 'Failed' };
      notify.ok(res, { id: 'error-toast-456' });

      expect(toast.error).toHaveBeenCalledWith('Failed', { id: 'error-toast-456' });
    });
  });

  describe('notify.success', () => {
    it('should show success toast with message', () => {
      notify.success('Test success message');

      expect(toast.success).toHaveBeenCalledWith('Test success message', undefined);
    });

    it('should pass id option when provided', () => {
      notify.success('Success', { id: 'custom-id' });

      expect(toast.success).toHaveBeenCalledWith('Success', { id: 'custom-id' });
    });
  });

  describe('notify.error', () => {
    it('should show error toast with message', () => {
      notify.error('Test error message');

      expect(toast.error).toHaveBeenCalledWith('Test error message', undefined);
    });

    it('should use default "Error" message when no message provided', () => {
      notify.error();

      expect(toast.error).toHaveBeenCalledWith('Error', undefined);
    });

    it('should pass id option when provided', () => {
      notify.error('Error occurred', { id: 'error-id' });

      expect(toast.error).toHaveBeenCalledWith('Error occurred', { id: 'error-id' });
    });
  });

  describe('confirmAction', () => {
    it('should call window.confirm with message', () => {
      (global.confirm as any).mockReturnValue(true);

      const result = confirmAction('Are you sure?');

      expect(global.confirm).toHaveBeenCalledWith('Are you sure?');
      expect(result).toBe(true);
    });

    it('should return false when user cancels', () => {
      (global.confirm as any).mockReturnValue(false);

      const result = confirmAction('Delete this item?');

      expect(result).toBe(false);
    });
  });
});
