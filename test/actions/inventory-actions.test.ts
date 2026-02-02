// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInventoryByPositions } from '@/actions/inventory-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Inventory Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getInventoryByPositions', () => {
    it('should return stocks and totals when RPC succeeds', async () => {
      const mockStocks = [
        { id: 's1', lot: 'L1', cart: 'C1', product: { sku: 'SKU1' }, quantity: 10 },
      ];
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: {
          stocks: mockStocks,
          totalPositions: 5,
          totalStocks: 12,
        },
        error: null,
      });

      const result = await getInventoryByPositions({
        warehouseId: 'wh-1',
        page: 1,
        positionsPerPage: 15,
      });

      expect(result).not.toBeNull();
      expect(result?.stocks).toEqual(mockStocks);
      expect(result?.totalPositions).toBe(5);
      expect(result?.totalStocks).toBe(12);
      expect(result?.totalPages).toBe(1);
    });

    it('should return null when RPC returns error', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await getInventoryByPositions({ warehouseId: 'wh-1' });

      expect(result).toBeNull();
    });

    it('should return default empty result when data is null', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getInventoryByPositions({ warehouseId: 'wh-1' });

      expect(result).toEqual({
        stocks: [],
        totalPositions: 0,
        totalStocks: 0,
        totalPages: 0,
      });
    });

    it('should return default empty result when stocks is not an array', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { stocks: null, totalPositions: 0 },
        error: null,
      });

      const result = await getInventoryByPositions({ warehouseId: 'wh-1' });

      expect(result).toEqual({
        stocks: [],
        totalPositions: 0,
        totalStocks: 0,
        totalPages: 0,
      });
    });

    it('should clamp page to 1 when page is less than 1', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { stocks: [], totalPositions: 0, totalStocks: 0 },
        error: null,
      });

      await getInventoryByPositions({
        warehouseId: 'wh-1',
        page: 0,
        positionsPerPage: 15,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          p_warehouse_id: 'wh-1',
          p_page: 1,
          p_positions_per_page: 15,
          p_search: null,
        }),
      );
    });

    it('should clamp positionsPerPage between 1 and 50', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { stocks: [], totalPositions: 0, totalStocks: 0 },
        error: null,
      });

      await getInventoryByPositions({
        warehouseId: 'wh-1',
        page: 1,
        positionsPerPage: 100,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          p_positions_per_page: 50,
        }),
      );

      mockSupabase.rpc.mockClear();
      await getInventoryByPositions({
        warehouseId: 'wh-1',
        page: 1,
        positionsPerPage: 0,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          p_positions_per_page: 1,
        }),
      );
    });

    it('should pass trimmed search or null when search is empty', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: { stocks: [], totalPositions: 0, totalStocks: 0 },
        error: null,
      });

      await getInventoryByPositions({
        warehouseId: 'wh-1',
        search: '  sku1  ',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          p_search: 'sku1',
        }),
      );

      mockSupabase.rpc.mockClear();
      await getInventoryByPositions({
        warehouseId: 'wh-1',
        search: '   ',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          p_search: null,
        }),
      );
    });

    it('should compute totalPages from totalPositions and perPage', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: {
          stocks: [{ id: 's1' }],
          totalPositions: 25,
          totalStocks: 30,
        },
        error: null,
      });

      const result = await getInventoryByPositions({
        warehouseId: 'wh-1',
        page: 1,
        positionsPerPage: 10,
      });

      expect(result?.totalPages).toBe(3);
      expect(result?.totalStocks).toBe(30);
    });
  });
});
