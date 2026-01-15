import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentUser, requireUser, requireAdmin, checkManagerRole } from '@/lib/auth-service';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ROLES, TABLES } from '@/lib/constants';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Access the mocked redirect from setup.ts (or re-mock if needed)
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    redirect: vi.fn(),
  };
});

describe('auth-service', () => {
  let mockSupabase: any;
  let mockSingle: any;
  let mockEq: any;
  let mockSelect: any;
  let mockFrom: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom = vi.fn(() => ({ select: mockSelect }));

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        signOut: vi.fn(),
      },
      from: mockFrom,
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('checkManagerRole', () => {
    it('should return true for ADMIN role', async () => {
      mockSingle.mockResolvedValue({
        data: { role: ROLES.ADMIN },
      });

      const result = await checkManagerRole(mockSupabase, 'user-123');
      expect(result).toBe(true);
    });

    it('should return true for MANAGER role', async () => {
      mockSingle.mockResolvedValue({
        data: { role: ROLES.MANAGER },
      });

      const result = await checkManagerRole(mockSupabase, 'user-123');
      expect(result).toBe(true);
    });

    it('should return false for other roles or no role', async () => {
      mockSingle.mockResolvedValue({
        data: { role: 'staff' },
      });
      expect(await checkManagerRole(mockSupabase, 'user-123')).toBe(false);

      mockSingle.mockResolvedValue({
        data: null,
      });
      expect(await checkManagerRole(mockSupabase, 'user-123')).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return null if getUser fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return null if user has no role data', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      // Mock role query to return null
      mockSingle.mockResolvedValue({
        data: null,
        error: new Error('No role'),
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return null if user is banned', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: '123',
            banned_until: new Date(Date.now() + 10000).toISOString(), // Future date
          },
        },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { role: 'staff', is_active: true },
        error: null,
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: '123',
            banned_until: null,
          },
        },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { role: 'staff', is_active: false },
        error: null,
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return user object if valid', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        created_at: '2023-01-01',
        banned_until: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { role: 'staff', is_active: true, allowed_warehouses: ['wh1'] },
        error: null,
      });

      const result = await getCurrentUser();
      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'staff',
        allowed_warehouses: ['wh1'],
        created_at: '2023-01-01',
        is_active: true,
        is_banned: false,
      });
    });
  });

  describe('requireUser', () => {
    it('should redirect if getCurrentUser returns null', async () => {
      // Case: No user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('No auth'),
      });

      await requireUser();
      expect(redirect).toHaveBeenCalledWith('/login');
    });

    it('should return user if exists', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
      mockSingle.mockResolvedValue({
        data: { role: 'staff', is_active: true },
      });

      const result = await requireUser();
      expect(result.id).toBe('123');
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should redirect if not admin', async () => {
      // Staff user
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
      mockSingle.mockResolvedValue({
        data: { role: ROLES.STAFF, is_active: true },
      });

      await requireAdmin();
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should return user if admin', async () => {
      // Admin user
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
      mockSingle.mockResolvedValue({
        data: { role: ROLES.ADMIN, is_active: true },
      });

      const result = await requireAdmin();
      expect(result.role).toBe(ROLES.ADMIN);
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
