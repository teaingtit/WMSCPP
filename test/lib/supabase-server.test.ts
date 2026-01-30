// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('supabase/server', () => {
  let mockCookieStore: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock cookie store
    mockCookieStore = {
      getAll: vi.fn(),
      set: vi.fn(),
    };

    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
    };

    (cookies as any).mockReturnValue(mockCookieStore);
    (createServerClient as any).mockReturnValue(mockSupabaseClient);
  });

  describe('createClient', () => {
    it('should create Supabase client with correct configuration', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      };

      await createClient();

      expect(createServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.any(Object),
        }),
      );

      process.env = originalEnv;
    });

    it('should call cookies() to get cookie store', async () => {
      await createClient();
      expect(cookies).toHaveBeenCalled();
    });

    it('should configure getAll cookie handler', async () => {
      const mockCookies = [
        { name: 'cookie1', value: 'value1' },
        { name: 'cookie2', value: 'value2' },
      ];
      mockCookieStore.getAll.mockReturnValue(mockCookies);

      await createClient();

      // Get the cookies config that was passed to createServerClient
      const callArgs = (createServerClient as any).mock.calls[0];
      const cookiesConfig = callArgs[2].cookies;

      // Test getAll
      const result = cookiesConfig.getAll();
      expect(result).toEqual(mockCookies);
      expect(mockCookieStore.getAll).toHaveBeenCalled();
    });

    it('should configure setAll cookie handler', async () => {
      await createClient();

      // Get the cookies config
      const callArgs = (createServerClient as any).mock.calls[0];
      const cookiesConfig = callArgs[2].cookies;

      // Test setAll
      const cookiesToSet = [{ name: 'test-cookie', value: 'test-value', options: { path: '/' } }];

      cookiesConfig.setAll(cookiesToSet);

      expect(mockCookieStore.set).toHaveBeenCalledWith('test-cookie', 'test-value', { path: '/' });
    });

    it('should handle setAll errors gracefully (Server Component context)', async () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in Server Component');
      });

      await createClient();

      const callArgs = (createServerClient as any).mock.calls[0];
      const cookiesConfig = callArgs[2].cookies;

      // Should not throw error
      expect(() => {
        cookiesConfig.setAll([{ name: 'test', value: 'value', options: {} }]);
      }).not.toThrow();
    });

    it('should return Supabase client instance', async () => {
      const client = await createClient();
      expect(client).toBe(mockSupabaseClient);
    });
  });
});
