'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { withAuth, ok, fail, validateFormData } from '@/lib/action-utils';
import type { ActionResponse } from '@/types/action-response';
import { z } from 'zod';

// ==========================================
// Types
// ==========================================

export type ReportType = 'INVENTORY_SUMMARY' | 'TRANSACTION_SUMMARY';

export interface ReportSchedule {
  id: string;
  warehouseId: string;
  name: string;
  reportType: ReportType;
  scheduleCron: string;
  recipients: string[];
  config: Record<string, any>;
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | null;
  lastRunError: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Schemas
// ==========================================

const CreateScheduleSchema = z.object({
  warehouseId: z.string().uuid('Invalid warehouse ID'),
  name: z.string().min(1, 'ชื่อรายงานจำเป็น').max(100),
  reportType: z.enum(['INVENTORY_SUMMARY', 'TRANSACTION_SUMMARY'], {
    errorMap: () => ({ message: 'ประเภทรายงานไม่ถูกต้อง' }),
  }),
  scheduleCron: z.string().min(1, 'กำหนดการจำเป็น'),
  recipients: z.array(z.string().email('อีเมลไม่ถูกต้อง')).min(1, 'ต้องมีผู้รับอย่างน้อย 1 คน'),
  config: z.record(z.any()).optional().default({}),
});

const UpdateScheduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  reportType: z.enum(['INVENTORY_SUMMARY', 'TRANSACTION_SUMMARY']).optional(),
  scheduleCron: z.string().min(1).optional(),
  recipients: z.array(z.string().email()).optional(),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// Data Fetching
// ==========================================

export async function getReportSchedules(warehouseId: string): Promise<ReportSchedule[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching report schedules:', error);
    return [];
  }

  return (data || []).map(mapToReportSchedule);
}

export async function getReportSchedule(id: string): Promise<ReportSchedule | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('report_schedules').select('*').eq('id', id).single();

  if (error || !data) {
    return null;
  }

  return mapToReportSchedule(data);
}

// ==========================================
// Actions
// ==========================================

export const createReportSchedule = withAuth<z.infer<typeof CreateScheduleSchema>, ReportSchedule>(
  async (data, { user, supabase }): Promise<ActionResponse<ReportSchedule>> => {
    const validation = validateFormData(CreateScheduleSchema, data);
    if (!validation.success)
      return validation.response as unknown as ActionResponse<ReportSchedule>;

    const { warehouseId, name, reportType, scheduleCron, recipients, config } = validation.data;

    try {
      const { data: result, error } = await supabase
        .from('report_schedules')
        .insert({
          warehouse_id: warehouseId,
          name,
          report_type: reportType,
          schedule_cron: scheduleCron,
          recipients,
          config: config || {},
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      revalidatePath('/dashboard/settings');
      return ok('สร้างกำหนดการรายงานสำเร็จ', {
        data: mapToReportSchedule(result),
      }) as unknown as ActionResponse<ReportSchedule>;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(
        `ไม่สามารถสร้างกำหนดการได้: ${message}`,
      ) as unknown as ActionResponse<ReportSchedule>;
    }
  },
  { requiredRole: 'manager' },
);

export const updateReportSchedule = withAuth<z.infer<typeof UpdateScheduleSchema>, ReportSchedule>(
  async (data, { supabase }): Promise<ActionResponse<ReportSchedule>> => {
    const validation = validateFormData(UpdateScheduleSchema, data);
    if (!validation.success)
      return validation.response as unknown as ActionResponse<ReportSchedule>;

    const { id, ...updates } = validation.data;

    try {
      const updateData: Record<string, any> = {};
      if (updates['name'] !== undefined) updateData['name'] = updates['name'];
      if (updates['reportType'] !== undefined) updateData['report_type'] = updates['reportType'];
      if (updates['scheduleCron'] !== undefined)
        updateData['schedule_cron'] = updates['scheduleCron'];
      if (updates['recipients'] !== undefined) updateData['recipients'] = updates['recipients'];
      if (updates['config'] !== undefined) updateData['config'] = updates['config'];
      if (updates['isActive'] !== undefined) updateData['is_active'] = updates['isActive'];

      const { data: result, error } = await supabase
        .from('report_schedules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      revalidatePath('/dashboard/settings');
      return ok('อัปเดตกำหนดการรายงานสำเร็จ', {
        data: mapToReportSchedule(result),
      }) as unknown as ActionResponse<ReportSchedule>;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(
        `ไม่สามารถอัปเดตกำหนดการได้: ${message}`,
      ) as unknown as ActionResponse<ReportSchedule>;
    }
  },
  { requiredRole: 'manager' },
);

const ScheduleIdSchema = z.object({ id: z.string().uuid('Invalid schedule ID') });

export const deleteReportSchedule = withAuth<{ id: string }, void>(
  async (data, { supabase }) => {
    const parsed = ScheduleIdSchema.safeParse(data);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'รหัสกำหนดการไม่ถูกต้อง');
    }
    try {
      const { error } = await supabase.from('report_schedules').delete().eq('id', parsed.data.id);

      if (error) throw error;

      revalidatePath('/dashboard/settings');
      return ok('ลบกำหนดการรายงานสำเร็จ');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(`ไม่สามารถลบกำหนดการได้: ${message}`);
    }
  },
  { requiredRole: 'manager' },
);

const ToggleScheduleSchema = z.object({ id: z.string().uuid(), isActive: z.boolean() });

export const toggleReportSchedule = withAuth<{ id: string; isActive: boolean }, void>(
  async (data, { supabase }) => {
    const parsed = ToggleScheduleSchema.safeParse(data);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
    }
    try {
      const { error } = await supabase
        .from('report_schedules')
        .update({ is_active: parsed.data.isActive })
        .eq('id', parsed.data.id);

      if (error) throw error;

      revalidatePath('/dashboard/settings');
      return ok(parsed.data.isActive ? 'เปิดใช้งานกำหนดการแล้ว' : 'ปิดใช้งานกำหนดการแล้ว');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(`ไม่สามารถเปลี่ยนสถานะได้: ${message}`);
    }
  },
  { requiredRole: 'manager' },
);

type RunReportResult = { processed: number };

/** Trigger Edge Function to run a schedule once (run now). Caller must be manager with access to the schedule's warehouse. */
export const runReportScheduleNow = withAuth<{ id: string }, RunReportResult>(
  async (data, { supabase }): Promise<ActionResponse<RunReportResult>> => {
    const parsed = ScheduleIdSchema.safeParse(data);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? 'รหัสกำหนดการไม่ถูกต้อง',
      ) as unknown as ActionResponse<RunReportResult>;
    }
    const { data: schedule, error: fetchErr } = await supabase
      .from('report_schedules')
      .select('id')
      .eq('id', parsed.data.id)
      .single();
    if (fetchErr || !schedule) {
      return fail('ไม่พบกำหนดการรายงาน') as unknown as ActionResponse<RunReportResult>;
    }
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    if (!supabaseUrl) {
      return fail(
        'ไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL',
      ) as unknown as ActionResponse<RunReportResult>;
    }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/scheduled-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: parsed.data.id }),
      });
      let json: { error?: string; processed?: number; results?: unknown[] };
      try {
        const text = await res.text();
        json = text
          ? (JSON.parse(text) as { error?: string; processed?: number; results?: unknown[] })
          : {};
      } catch {
        json = {};
      }
      if (!res.ok) {
        return fail(
          json?.error || res.statusText || 'เรียกส่งรายงานไม่สำเร็จ',
        ) as unknown as ActionResponse<RunReportResult>;
      }
      revalidatePath('/dashboard/settings');
      return ok('กำลังส่งรายงาน', {
        data: { processed: json.processed ?? 1 },
      }) as unknown as ActionResponse<RunReportResult>;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return fail(
        `ไม่สามารถเรียกส่งรายงานได้: ${message}`,
      ) as unknown as ActionResponse<RunReportResult>;
    }
  },
  { requiredRole: 'manager' },
);

// ==========================================
// Helpers
// ==========================================

function mapToReportSchedule(row: any): ReportSchedule {
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    name: row.name,
    reportType: row.report_type,
    scheduleCron: row.schedule_cron,
    recipients: row.recipients || [],
    config: row.config || {},
    isActive: row.is_active,
    lastRunAt: row.last_run_at,
    lastRunStatus: row.last_run_status,
    lastRunError: row.last_run_error,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Cron presets for UI
export const CRON_PRESETS = [
  { label: 'ทุกวัน เวลา 8:00', value: '0 8 * * *' },
  { label: 'ทุกวันจันทร์ เวลา 8:00', value: '0 8 * * 1' },
  { label: 'วันที่ 1 ของเดือน เวลา 8:00', value: '0 8 1 * *' },
  { label: 'ทุกวันศุกร์ เวลา 17:00', value: '0 17 * * 5' },
] as const;

// Report type labels in Thai
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  INVENTORY_SUMMARY: 'สรุปสินค้าคงคลัง',
  TRANSACTION_SUMMARY: 'สรุปการเคลื่อนไหวสินค้า',
};
