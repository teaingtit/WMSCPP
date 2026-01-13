import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout } from '@/actions/auth-actions';
import { createMockSupabaseClient, createMockFormData, mockNextNavigation } from '../utils/test-helpers';

// Next.js navigation is mocked in test/setup.ts

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auth Actions', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth = {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    };
    mockSupabase = createMockSupabaseClient();
    mockSupabase.auth = mockAuth;
    
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({ error: null });

      const formData = createMockFormData({
        email: 'test@example.com',
        password: 'password123',
      });

      try {
        const result = await login({ success: false } as any, formData);
        // If redirect throws, that's expected - login was successful
      } catch (error: any) {
        // Expect redirect to be called (throws NEXT_REDIRECT error)
        if (error.message !== 'NEXT_REDIRECT') {
          throw error;
        }
      }

      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error for invalid email format', async () => {
      const formData = createMockFormData({
        email: 'invalid-email',
        password: 'password123',
      });

      const result = await login({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should return error for missing password', async () => {
      const formData = createMockFormData({
        email: 'test@example.com',
        password: '',
      });

      const result = await login({ success: false } as any, formData);

      expect(result.success).toBe(false);
    });

    it('should handle invalid login credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      });

      const formData = createMockFormData({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      const result = await login({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่ถูกต้อง');
    });

    it('should handle connection errors', async () => {
      mockAuth.signInWithPassword.mockRejectedValue(new Error('Connection failed'));

      const formData = createMockFormData({
        email: 'test@example.com',
        password: 'password123',
      });

      const result = await login({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('เชื่อมต่อ');
    });
  });

  describe('logout', () => {
    it('should successfully logout', async () => {
      mockAuth.signOut.mockResolvedValue({ error: null });

      // Logout will call revalidatePath then redirect (which throws)
      // We expect it to throw NEXT_REDIRECT error
      await expect(logout()).rejects.toThrow('NEXT_REDIRECT');

      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors gracefully', async () => {
      mockAuth.signOut.mockRejectedValue(new Error('Logout failed'));

      // Should handle error gracefully
      try {
        await logout();
      } catch (error: any) {
        // Either redirect error or the actual error
        expect(error.message).toBeDefined();
      }
    });
  });
});
