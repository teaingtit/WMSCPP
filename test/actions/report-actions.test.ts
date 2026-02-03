// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReportSchedules,
  getReportSchedule,
  createReportSchedule,
  deleteReportSchedule,
  toggleReportSchedule,
  runReportScheduleNow,
  CRON_PRESETS,
  REPORT_TYPE_LABELS,
} from '@/actions/report-actions';
import { createMockSupabaseClient, createMockUser } from '../utils/test-helpers';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/auth-service', () => ({
  checkManagerRole: vi.fn(),
}));

const validWarehouseId = '11111111-1111-1111-1111-111111111111';
const validScheduleId = '22222222-2222-2222-2222-222222222222';

describe('Report Actions', () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = createMockUser();

    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const { checkManagerRole } = await import('@/lib/auth-service');
    vi.mocked(checkManagerRole).mockResolvedValue(true);
  });

  describe('getReportSchedules', () => {
    it('should fetch schedules for warehouse', async () => {
      const mockSchedules = [
        {
          id: validScheduleId,
          warehouse_id: validWarehouseId,
          name: 'Daily Report',
          report_type: 'INVENTORY_SUMMARY',
          schedule_cron: '0 8 * * *',
          recipients: ['a@b.com'],
          config: {},
          is_active: true,
          last_run_at: null,
          last_run_status: null,
          last_run_error: null,
          created_by: mockUser.id,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const createQuery = () => {
        const query: any = {};
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.order = vi.fn(() => query);
        const promise = Promise.resolve({ data: mockSchedules });
        query.then = promise.then.bind(promise);
        query.catch = promise.catch.bind(promise);
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await getReportSchedules(validWarehouseId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(validScheduleId);
      expect(result[0].warehouseId).toBe(validWarehouseId);
      expect(result[0].name).toBe('Daily Report');
      expect(result[0].reportType).toBe('INVENTORY_SUMMARY');
      expect(result[0].recipients).toEqual(['a@b.com']);
    });

    it('should return empty array on error', async () => {
      const createQuery = () => {
        const query: any = {};
        query.select = vi.fn(() => query);
        query.eq = vi.fn(() => query);
        query.order = vi.fn(function () {
          const promise = Promise.resolve({
            data: null,
            error: { message: 'DB error' },
          });
          query.then = promise.then.bind(promise);
          query.catch = promise.catch.bind(promise);
          return query;
        });
        return query;
      };
      mockSupabase.from = vi.fn(() => createQuery());

      const result = await getReportSchedules(validWarehouseId);

      expect(result).toEqual([]);
    });
  });

  describe('getReportSchedule', () => {
    it('should return schedule by id', async () => {
      const mockRow = {
        id: validScheduleId,
        warehouse_id: validWarehouseId,
        name: 'Weekly',
        report_type: 'INVENTORY_SUMMARY',
        schedule_cron: '0 8 * * 1',
        recipients: ['x@y.com'],
        config: {},
        is_active: true,
        last_run_at: null,
        last_run_status: null,
        last_run_error: null,
        created_by: mockUser.id,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRow }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getReportSchedule(validScheduleId);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Weekly');
      expect(result!.reportType).toBe('INVENTORY_SUMMARY');
    });

    it('should return null when not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };
      mockSupabase.from = vi.fn(() => mockQuery);

      const result = await getReportSchedule(validScheduleId);

      expect(result).toBeNull();
    });
  });

  describe('createReportSchedule', () => {
    it('should create schedule when user is manager', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };

      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };

      const insertedRow = {
        id: validScheduleId,
        warehouse_id: validWarehouseId,
        name: 'Test Report',
        report_type: 'INVENTORY_SUMMARY',
        schedule_cron: '0 8 * * *',
        recipients: ['a@b.com'],
        config: {},
        is_active: true,
        last_run_at: null,
        last_run_status: null,
        last_run_error: null,
        created_by: mockUser.id,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: insertedRow, error: null }),
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_roles') return mockRoleQuery;
        return mockInsertQuery;
      });

      const result = await createReportSchedule({
        warehouseId: validWarehouseId,
        name: 'Test Report',
        reportType: 'INVENTORY_SUMMARY',
        scheduleCron: '0 8 * * *',
        recipients: ['a@b.com'],
        config: {},
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Test Report');
    });

    it('should return validation error for invalid warehouse id', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      mockSupabase.from = vi.fn(() => mockRoleQuery);

      const result = await createReportSchedule({
        warehouseId: 'not-a-uuid',
        name: 'Test',
        reportType: 'INVENTORY_SUMMARY',
        scheduleCron: '0 8 * * *',
        recipients: ['a@b.com'],
      });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/warehouse|uuid|invalid/i);
    });
  });

  describe('deleteReportSchedule', () => {
    it('should delete when id is valid and user is manager', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_roles') return mockRoleQuery;
        return mockDeleteQuery;
      });

      const result = await deleteReportSchedule({ id: validScheduleId });

      expect(result.success).toBe(true);
    });

    it('should return validation error for invalid schedule id', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      mockSupabase.from = vi.fn(() => mockRoleQuery);

      const result = await deleteReportSchedule({ id: 'invalid-id' });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/schedule|uuid|invalid|รหัส/i);
    });
  });

  describe('toggleReportSchedule', () => {
    it('should toggle is_active when id and isActive are valid', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_roles') return mockRoleQuery;
        return mockUpdateQuery;
      });

      const result = await toggleReportSchedule({
        id: validScheduleId,
        isActive: false,
      });

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/ปิดใช้งาน/);
    });
  });

  describe('runReportScheduleNow', () => {
    it('should return error when NEXT_PUBLIC_SUPABASE_URL is not set', async () => {
      const orig = process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      const mockScheduleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: validScheduleId }, error: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_roles') return mockRoleQuery;
        return mockScheduleQuery;
      });

      const result = await runReportScheduleNow({ id: validScheduleId });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/SUPABASE_URL|ตั้งค่า/);

      if (orig !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = orig;
    });

    it('should call Edge Function and return success when URL is set', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ processed: 1, results: [] })),
      });
      vi.stubGlobal('fetch', mockFetch);

      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      const mockScheduleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: validScheduleId }, error: null }),
      };
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'user_roles') return mockRoleQuery;
        return mockScheduleQuery;
      });

      const result = await runReportScheduleNow({ id: validScheduleId });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/scheduled-report',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedule_id: validScheduleId }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it('should return validation error for invalid schedule id', async () => {
      mockSupabase.auth = {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      };
      const mockRoleQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { role: 'manager' } }),
      };
      mockSupabase.from = vi.fn(() => mockRoleQuery);

      const result = await runReportScheduleNow({ id: 'bad-uuid' });

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/รหัส|invalid|uuid/i);
    });
  });

  describe('CRON_PRESETS and REPORT_TYPE_LABELS', () => {
    it('CRON_PRESETS should have label and value', () => {
      expect(CRON_PRESETS.length).toBeGreaterThan(0);
      CRON_PRESETS.forEach((p) => {
        expect(p).toHaveProperty('label');
        expect(p).toHaveProperty('value');
        expect(typeof p.label).toBe('string');
        expect(typeof p.value).toBe('string');
      });
    });

    it('REPORT_TYPE_LABELS should cover all report types', () => {
      expect(REPORT_TYPE_LABELS.INVENTORY_SUMMARY).toBeDefined();
      expect(REPORT_TYPE_LABELS.TRANSACTION_SUMMARY).toBeDefined();
    });
  });
});
