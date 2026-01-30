// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUsers, createUser, deleteUser, reactivateUser } from '@/actions/user-actions';
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

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: vi.fn(),
        createUser: vi.fn(),
        inviteUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    from: vi.fn(),
  },
}));

describe('User Actions', () => {
  let mockSupabase: any;
  let mockSupabaseAdmin: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    mockSupabaseAdmin = supabaseAdmin;
  });

  describe('getUsers', () => {
    it('should return empty array when listUsers fails', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'admin' } }),
      };
      mockSupabase.from = vi.fn(() => mockRoleQuery);
      mockSupabaseAdmin.auth.admin.listUsers = vi.fn().mockResolvedValue({
        data: { users: null },
        error: new Error('Auth error'),
      });

      const result = await getUsers();

      expect(result).toEqual([]);
    });

    it('should return empty array for unauthenticated user', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      };

      const result = await getUsers();

      expect(result).toEqual([]);
    });

    it('should return empty array for non-admin user', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'staff' },
        }),
      };
      mockSupabase.from = vi.fn(() => mockRoleQuery);

      const result = await getUsers();

      expect(result).toEqual([]);
    });

    it('should fetch users for admin', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
      };

      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@example.com',
          created_at: '2024-01-01',
          last_sign_in_at: '2024-01-02',
          user_metadata: { first_name: 'John', last_name: 'Doe' },
        },
      ];

      mockSupabaseAdmin.auth.admin.listUsers = vi.fn().mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const mockRolesQuery = {
        select: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user1', role: 'staff', allowed_warehouses: [], is_active: true }],
        }),
      };

      const mockProfilesQuery = {
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'user1', first_name: 'John', last_name: 'Doe', full_name: 'John Doe' }],
        }),
      };

      let _callCount = 0;
      mockSupabase.from = vi.fn(() => mockRoleQuery);
      mockSupabaseAdmin.from = vi.fn((table) => {
        if (table === 'user_roles') {
          return mockRolesQuery;
        }
        if (table === 'profiles') {
          return mockProfilesQuery;
        }
        return mockRolesQuery;
      });

      const result = await getUsers();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].email).toBe('user1@example.com');
    });
  });

  describe('createUser', () => {
    it('should reject when email already registered', async () => {
      mockSupabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User has already been registered' },
      });

      const formData = createMockFormData({
        email: 'existing@example.com',
        password: 'password123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'off',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('อีเมลนี้ถูกใช้งานแล้ว');
    });

    it('should create user with password successfully', async () => {
      const mockNewUser = {
        id: 'user1',
        email: 'newuser@example.com',
        created_at: '2024-01-01',
      };

      mockSupabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from = vi.fn(() => ({ insert: mockInsert }));

      const formData = createMockFormData({
        email: 'newuser@example.com',
        password: 'password123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'off',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(true);
    });

    it('should invite user by email successfully', async () => {
      const mockNewUser = {
        id: 'user1',
        email: 'newuser@example.com',
        created_at: '2024-01-01',
      };

      mockSupabaseAdmin.auth.admin.inviteUserByEmail = vi.fn().mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseAdmin.from = vi.fn(() => ({ insert: mockInsert }));

      const formData = createMockFormData({
        email: 'newuser@example.com',
        password: '',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'on',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('ส่งอีเมลยืนยัน');
    });

    it('should reject invalid email format', async () => {
      const formData = createMockFormData({
        email: 'invalid-email',
        password: 'password123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('อีเมล');
    });

    it('should reject short password when not using email verification', async () => {
      const formData = createMockFormData({
        email: 'user@example.com',
        password: '123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'off',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('รหัสผ่าน');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user with history', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      // Create query builder for count query
      const createCountQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          // Return result with count when eq is called
          return Promise.resolve({ count: 5 });
        });
        return query;
      };
      const mockCheckQuery = createCountQuery();

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseAdmin.from = vi.fn((table) => {
        if (table === 'transactions') {
          return mockCheckQuery;
        }
        if (table === 'user_roles') {
          return mockUpdateQuery;
        }
        return mockCheckQuery;
      });

      mockSupabaseAdmin.auth.admin.updateUserById = vi.fn().mockResolvedValue({
        error: null,
      });

      const result = await deleteUser('user1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('ระงับการใช้งาน');
    });

    it('should hard delete user without history', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      // Create query builder for count query
      const createCountQuery = () => {
        const query: any = {};
        query.select = vi.fn(function () {
          return query;
        });
        query.eq = vi.fn(function () {
          // Return result with count when eq is called
          return Promise.resolve({ count: 0 });
        });
        return query;
      };
      const mockCheckQuery = createCountQuery();

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseAdmin.from = vi.fn((table) => {
        if (table === 'transactions') {
          return mockCheckQuery;
        }
        if (table === 'user_roles') {
          return mockDeleteQuery;
        }
        return mockCheckQuery;
      });

      mockSupabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({
        error: null,
      });

      const result = await deleteUser('user1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('ลบผู้ใช้ถาวร');
    });

    it('should reject deleting own account', async () => {
      const mockUser = createMockUser({ id: 'user1' });
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const result = await deleteUser('user1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ตัวเอง');
    });
  });

  describe('deleteUser error handling', () => {
    it('should return fail on delete error', async () => {
      const mockUser = createMockUser();
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
      };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseAdmin.from = vi.fn((table) => {
        if (table === 'transactions') return mockCheckQuery;
        if (table === 'user_roles') return mockDeleteQuery;
        return mockCheckQuery;
      });
      mockSupabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({
        error: new Error('Delete failed'),
      });

      const result = await deleteUser('user1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Delete failed');
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      mockSupabaseAdmin.auth.admin.updateUserById = vi.fn().mockResolvedValue({
        error: null,
      });

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabaseAdmin.from = vi.fn(() => mockUpdateQuery);

      const result = await reactivateUser('user1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('เปิดใช้งาน');
    });

    it('should return error on reactivation failure', async () => {
      mockSupabaseAdmin.auth.admin.updateUserById = vi
        .fn()
        .mockRejectedValue(new Error('Update failed'));

      const result = await reactivateUser('user1');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Update failed');
    });
  });

  describe('createUser role insert error', () => {
    it('should rollback user when role insert fails', async () => {
      const mockNewUser = {
        id: 'user1',
        email: 'newuser@example.com',
        created_at: '2024-01-01',
      };

      mockSupabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: { user: mockNewUser },
        error: null,
      });

      mockSupabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({
        error: null,
      });

      mockSupabaseAdmin.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: { message: 'Role insert failed' } }),
      }));

      const formData = createMockFormData({
        email: 'newuser@example.com',
        password: 'password123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'off',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user1');
    });

    it('should return generic error message for non-duplicate errors', async () => {
      mockSupabaseAdmin.auth.admin.createUser = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Some server error' },
      });

      const formData = createMockFormData({
        email: 'newuser@example.com',
        password: 'password123',
        role: 'staff',
        first_name: 'John',
        last_name: 'Doe',
        verify_email: 'off',
      });

      const result = await createUser({ success: false } as any, formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Some server error');
    });
  });
});
