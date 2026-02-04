// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadOutboundTemplate, importBulkOutbound } from '@/actions/bulk-outbound-actions';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockFormData,
} from '../utils/test-helpers';
import * as ExcelUtils from '@/lib/utils/excel-utils';
import { getWarehouseId } from '@/lib/utils/db-helpers';
import { checkManagerRole } from '@/lib/auth-service';
import { enforceRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/utils/db-helpers');
vi.mock('@/lib/utils/excel-utils');
vi.mock('@/lib/auth-service');
vi.mock('@/lib/rate-limit');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('Bulk Outbound Actions', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabase.auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: createMockUser() } }),
    };

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    vi.mocked(getWarehouseId).mockImplementation(async (_sb, id) => id);
    vi.mocked(enforceRateLimit).mockResolvedValue(null);
    vi.mocked(checkManagerRole).mockResolvedValue(true);
  });

  describe('downloadOutboundTemplate', () => {
    it('should return base64 and fileName when warehouse exists', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { code: 'WH01', name: 'Main' },
          error: null,
        }),
      }));
      vi.mocked(ExcelUtils.generateOutboundTemplate).mockResolvedValue('base64content');

      const result = await downloadOutboundTemplate('wh-uuid-1');

      expect(result.success).toBe(true);
      expect(result.base64).toBe('base64content');
      expect(result.fileName).toContain('WH01');
      expect(ExcelUtils.generateOutboundTemplate).toHaveBeenCalledWith('WH01');
    });

    it('should return fail when warehouse not found', async () => {
      vi.mocked(getWarehouseId).mockResolvedValue(null);

      const result = await downloadOutboundTemplate('invalid');

      expect(result.success).toBe(false);
      expect(result.message).toContain('ไม่พบคลังสินค้า');
    });

    it('should return fail when getWarehouseId throws', async () => {
      vi.mocked(getWarehouseId).mockRejectedValue(new Error('DB error'));

      const result = await downloadOutboundTemplate('wh-1');

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('importBulkOutbound', () => {
    it('should return fail when no file in formData', async () => {
      const formData = createMockFormData({ warehouseId: 'wh-1' });

      const result = await importBulkOutbound(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/ไม่พบไฟล์|file/i);
    });

    it('should return fail when unauthenticated', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } });
      const formData = createMockFormData({
        warehouseId: 'wh-1',
        file: new File([''], 'out.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      });

      const result = await importBulkOutbound(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unauthenticated');
    });

    it('should return fail when warehouse not found', async () => {
      vi.mocked(getWarehouseId).mockResolvedValue(null);
      const formData = createMockFormData({
        warehouseId: 'invalid',
        file: new File([''], 'out.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      });

      const result = await importBulkOutbound(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/ไม่พบคลังสินค้า/);
    });

    it('should return fail when user is not manager', async () => {
      vi.mocked(checkManagerRole).mockResolvedValue(false);
      const formData = createMockFormData({
        warehouseId: 'wh-1',
        file: new File([''], 'out.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      });

      const result = await importBulkOutbound(formData);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/สิทธิ์|Manager/i);
    });

    it('should return fail when rate limit exceeded', async () => {
      vi.mocked(enforceRateLimit).mockResolvedValue({
        success: false,
        message: 'Too many requests',
      });
      const formData = createMockFormData({
        warehouseId: 'wh-1',
        file: new File([''], 'out.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      });

      const result = await importBulkOutbound(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many requests');
    });
  });
});
