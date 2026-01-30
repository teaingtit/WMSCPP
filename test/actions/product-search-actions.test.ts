// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchProducts } from '@/actions/product-search-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';
import { MOCK_PRODUCTS } from '../fixtures/mock-data';

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('product-search-actions', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('searchProducts', () => {
    it('should return empty data for empty query', async () => {
      const result = await searchProducts('');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty data for whitespace-only query', async () => {
      const result = await searchProducts('   ');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty data when query becomes empty after sanitize', async () => {
      const result = await searchProducts(',,,');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should call Supabase with sanitized query and return products on success', async () => {
      const builder = mockSupabase.from!('products') as any;
      const promise = Promise.resolve({ data: [...MOCK_PRODUCTS], error: null });
      builder.then = promise.then.bind(promise);
      builder.catch = promise.catch.bind(promise);
      builder.finally = promise.finally?.bind(promise);
      vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

      const result = await searchProducts('Alpha', 10);

      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(builder.select).toHaveBeenCalledWith('id, sku, name, uom, category_id');
      expect(builder.or).toHaveBeenCalled();
      expect(builder.limit).toHaveBeenCalledWith(10);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toEqual([...MOCK_PRODUCTS]);
    });

    it('should strip commas from query before search', async () => {
      const builder = mockSupabase.from!('products') as any;
      const promise = Promise.resolve({ data: [MOCK_PRODUCTS[0]], error: null });
      builder.then = promise.then.bind(promise);
      builder.catch = promise.catch.bind(promise);
      builder.finally = promise.finally?.bind(promise);
      vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

      await searchProducts('Alpha, Beta', 5);

      expect(builder.or).toHaveBeenCalledWith(expect.stringContaining('Alpha Beta'));
      expect(builder.limit).toHaveBeenCalledWith(5);
    });

    it('should return error when Supabase returns error', async () => {
      const builder = mockSupabase.from!('products') as any;
      const promise = Promise.resolve({
        data: null,
        error: { message: 'Database error' },
      });
      builder.then = promise.then.bind(promise);
      builder.catch = promise.catch.bind(promise);
      builder.finally = promise.finally?.bind(promise);
      vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

      const result = await searchProducts('Alpha');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should return empty array when data is null', async () => {
      const builder = mockSupabase.from!('products') as any;
      const promise = Promise.resolve({ data: null, error: null });
      builder.then = promise.then.bind(promise);
      builder.catch = promise.catch.bind(promise);
      builder.finally = promise.finally?.bind(promise);
      vi.mocked(mockSupabase.from).mockReturnValue(builder as any);

      const result = await searchProducts('Alpha');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return unexpected error on exception', async () => {
      vi.mocked((await import('@/lib/supabase/server')).createClient).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await searchProducts('Alpha');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred');
    });
  });
});
