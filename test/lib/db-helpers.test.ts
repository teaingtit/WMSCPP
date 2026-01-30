import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { createMockSupabaseClient } from '../utils/test-helpers';
import { MOCK_WAREHOUSES } from '../fixtures/mock-data';

vi.mock('@/lib/utils', () => ({
  isValidUUID: (uuid: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid),
}));

describe('db-helpers', () => {
  describe('getWarehouseId', () => {
    it('should return identifier when it is a valid UUID', async () => {
      const supabase = createMockSupabaseClient();
      const result = await getWarehouseId(supabase as any, '123e4567-e89b-12d3-a456-426614174000');
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should query warehouses by code and return id when found', async () => {
      const supabase = createMockSupabaseClient();
      const builder = supabase.from!('warehouses') as any;
      builder.maybeSingle = vi.fn().mockResolvedValue({
        data: { id: MOCK_WAREHOUSES[0].id },
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue(builder);

      const result = await getWarehouseId(supabase as any, 'WH-A');
      expect(supabase.from).toHaveBeenCalledWith('warehouses');
      expect(builder.select).toHaveBeenCalledWith('id');
      expect(builder.eq).toHaveBeenCalledWith('code', 'WH-A');
      expect(builder.maybeSingle).toHaveBeenCalled();
      expect(result).toBe(MOCK_WAREHOUSES[0].id);
    });

    it('should return null when code not found', async () => {
      const supabase = createMockSupabaseClient();
      const builder = supabase.from!('warehouses') as any;
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(builder);

      const result = await getWarehouseId(supabase as any, 'WH-NOTFOUND');
      expect(result).toBeNull();
    });
  });
});
