import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWarehouses } from '@/actions/warehouse-actions';
import { createMockSupabaseClient } from '../utils/test-helpers';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Warehouse Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getWarehouses', () => {
    it('should fetch all active warehouses', async () => {
      const mockWarehouses = [
        { id: 'wh1', code: 'WH01', name: 'Warehouse 1', is_active: true },
        { id: 'wh2', code: 'WH02', name: 'Warehouse 2', is_active: true },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockWarehouses }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getWarehouses();

      expect(mockSupabase.from).toHaveBeenCalledWith('warehouses');
      expect(result).toEqual(mockWarehouses);
    });

    it('should return empty array when no warehouses found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getWarehouses();

      expect(result).toEqual([]);
    });
  });
});
