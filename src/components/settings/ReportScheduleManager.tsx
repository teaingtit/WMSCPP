'use client';

import { useState, useEffect } from 'react';
import {
  getReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
  toggleReportSchedule,
  runReportScheduleNow,
  CRON_PRESETS,
  REPORT_TYPE_LABELS,
  type ReportSchedule,
  type ReportType,
} from '@/actions/report-actions';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Mail,
  Plus,
  Trash2,
  Loader2,
  Clock,
  ToggleLeft,
  ToggleRight,
  FileText,
  AlertCircle,
  Check,
  X,
  Play,
} from 'lucide-react';
import { notify } from '@/lib/ui-helpers';
import { cn } from '@/lib/utils';

interface Props {
  warehouseId: string;
  warehouseName: string;
}

export default function ReportScheduleManager({ warehouseId, warehouseName }: Props) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'INVENTORY_SUMMARY' as ReportType,
    scheduleCron: CRON_PRESETS[0].value,
    recipients: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Load schedules
  useEffect(() => {
    loadSchedules();
  }, [warehouseId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const data = await getReportSchedules(warehouseId);
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const recipients = formData.recipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      notify.error('กรุณาระบุอีเมลผู้รับอย่างน้อย 1 คน');
      setSubmitting(false);
      return;
    }

    try {
      const result = await createReportSchedule({
        warehouseId,
        name: formData.name,
        reportType: formData.reportType,
        scheduleCron: formData.scheduleCron,
        recipients,
        config: {},
      });

      if (result.success) {
        notify.success(result.message ?? '');
        setFormData({
          name: '',
          reportType: 'INVENTORY_SUMMARY',
          scheduleCron: CRON_PRESETS[0].value,
          recipients: '',
        });
        setShowForm(false);
        loadSchedules();
      } else {
        notify.error(result.message ?? '');
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const result = await toggleReportSchedule({ id, isActive: !currentStatus });
      if (result.success) {
        notify.success(result.message ?? '');
        loadSchedules();
      } else {
        notify.error(result.message ?? '');
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบกำหนดการนี้หรือไม่?')) return;

    try {
      const result = await deleteReportSchedule({ id });
      if (result.success) {
        notify.success(result.message ?? '');
        loadSchedules();
      } else {
        notify.error(result.message ?? '');
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const result = await runReportScheduleNow({ id });
      if (result.success) {
        notify.success(result.message ?? '');
        loadSchedules();
      } else {
        notify.error(result.message ?? '');
      }
    } catch (error: any) {
      notify.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setRunningId(null);
    }
  };

  const formatCronLabel = (cron: string): string => {
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    return preset?.label || cron;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">รายงานอัตโนมัติ</h3>
              <p className="text-sm text-muted-foreground">
                ตั้งค่าการส่งรายงานทางอีเมลอัตโนมัติสำหรับ {warehouseName}
              </p>
            </div>
          </div>

          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
            {showForm ? (
              <>
                <X size={16} className="mr-2" />
                ยกเลิก
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                เพิ่มกำหนดการ
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-6 bg-muted/30 border-b border-border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">ชื่อรายงาน</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น รายงานประจำสัปดาห์"
                className="input-field"
                required
              />
            </div>

            <div>
              <label
                htmlFor="report-type"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                ประเภทรายงาน
              </label>
              <select
                id="report-type"
                aria-label="ประเภทรายงาน"
                value={formData.reportType}
                onChange={(e) =>
                  setFormData({ ...formData, reportType: e.target.value as ReportType })
                }
                className="input-field"
              >
                {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="schedule-cron"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                กำหนดการส่ง
              </label>
              <select
                id="schedule-cron"
                aria-label="กำหนดการส่ง"
                value={formData.scheduleCron}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduleCron: e.target.value as typeof formData.scheduleCron,
                  })
                }
                className="input-field"
              >
                {CRON_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                ผู้รับ (อีเมล)
              </label>
              <input
                type="text"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="input-field"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                คั่นอีเมลด้วยเครื่องหมายจุลภาค (,)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Check size={16} className="mr-2" />
              )}
              สร้างกำหนดการ
            </Button>
          </div>
        </form>
      )}

      {/* Schedules List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mb-4">
              <FileText size={32} />
            </div>
            <p className="text-muted-foreground">ยังไม่มีกำหนดการรายงาน</p>
            <p className="text-sm text-muted-foreground mt-1">
              คลิก "เพิ่มกำหนดการ" เพื่อสร้างรายงานอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={cn(
                  'p-4 rounded-xl border transition-all',
                  schedule.isActive
                    ? 'bg-card border-border'
                    : 'bg-muted/30 border-border/50 opacity-60',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground truncate">{schedule.name}</h4>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          schedule.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {schedule.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        {REPORT_TYPE_LABELS[schedule.reportType]}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {formatCronLabel(schedule.scheduleCron)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Mail size={14} />
                        {schedule.recipients.length} ผู้รับ
                      </span>
                    </div>

                    {schedule.lastRunAt && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>ส่งล่าสุด:</span>
                        <span>{new Date(schedule.lastRunAt).toLocaleString('th-TH')}</span>
                        {schedule.lastRunStatus === 'SUCCESS' && (
                          <Check size={12} className="text-success" />
                        )}
                        {schedule.lastRunStatus === 'FAILED' && (
                          <AlertCircle size={12} className="text-destructive" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRunNow(schedule.id)}
                      disabled={runningId !== null}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      title="ส่งรายงานตอนนี้"
                    >
                      {runningId === schedule.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(schedule.id, schedule.isActive)}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        schedule.isActive
                          ? 'text-success hover:bg-success/10'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                      title={schedule.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    >
                      {schedule.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="ลบ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="px-6 pb-6">
        <div className="p-4 bg-info/5 border border-info/20 rounded-xl text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">หมายเหตุ</p>
              <p>
                ต้องตั้งค่า <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> และ{' '}
                <code className="bg-muted px-1 rounded">REPORT_FROM_EMAIL</code>{' '}
                เพื่อให้ระบบส่งอีเมลได้
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
