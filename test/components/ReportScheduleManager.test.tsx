// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportScheduleManager from '@/components/settings/ReportScheduleManager';

vi.mock('@/actions/report-actions', () => ({
  getReportSchedules: vi.fn(),
  createReportSchedule: vi.fn(),
  deleteReportSchedule: vi.fn(),
  toggleReportSchedule: vi.fn(),
  runReportScheduleNow: vi.fn(),
  CRON_PRESETS: [
    { label: 'ทุกวัน 8:00', value: '0 8 * * *' },
    { label: 'ทุกจันทร์ 8:00', value: '0 8 * * 1' },
  ],
  REPORT_TYPE_LABELS: {
    INVENTORY_SUMMARY: 'สรุปสินค้าคงคลัง',
    TRANSACTION_SUMMARY: 'สรุปการเคลื่อนไหว',
  },
}));

vi.mock('@/lib/ui-helpers', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const defaultSchedules = [
  {
    id: 's1',
    warehouseId: 'wh1',
    name: 'Daily Report',
    reportType: 'INVENTORY_SUMMARY',
    scheduleCron: '0 8 * * *',
    recipients: ['a@b.com'],
    config: {},
    isActive: true,
    lastRunAt: '2024-01-15T08:00:00Z',
    lastRunStatus: 'SUCCESS',
    lastRunError: null,
    createdBy: 'u1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('ReportScheduleManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { getReportSchedules } = await import('@/actions/report-actions');
    vi.mocked(getReportSchedules).mockResolvedValue(defaultSchedules);
  });

  it('should render header and warehouse name', async () => {
    render(<ReportScheduleManager warehouseId="wh1" warehouseName="คลังหลัก" />);

    await waitFor(() => {
      expect(screen.getByText('รายงานอัตโนมัติ')).toBeInTheDocument();
    });
    expect(screen.getByText(/คลังหลัก/)).toBeInTheDocument();
  });

  it('should load and display schedules', async () => {
    render(<ReportScheduleManager warehouseId="wh1" warehouseName="Test WH" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });
    expect(screen.getByText('สรุปสินค้าคงคลัง')).toBeInTheDocument();
    expect(screen.getByText('ทุกวัน 8:00')).toBeInTheDocument();
    expect(screen.getByText(/1 ผู้รับ/)).toBeInTheDocument();
  });

  it('should show empty state when no schedules', async () => {
    const { getReportSchedules } = await import('@/actions/report-actions');
    vi.mocked(getReportSchedules).mockResolvedValue([]);

    render(<ReportScheduleManager warehouseId="wh1" warehouseName="Test WH" />);

    await waitFor(() => {
      expect(screen.getByText('ยังไม่มีกำหนดการรายงาน')).toBeInTheDocument();
    });
  });

  it('should show form when clicking เพิ่มกำหนดการ', async () => {
    const user = userEvent.setup();
    render(<ReportScheduleManager warehouseId="wh1" warehouseName="Test WH" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /เพิ่มกำหนดการ/ });
    await user.click(addBtn);

    expect(screen.getByPlaceholderText('เช่น รายงานประจำสัปดาห์')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /ประเภทรายงาน/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /กำหนดการส่ง/ })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('email1@example.com, email2@example.com'),
    ).toBeInTheDocument();
  });

  it('should have Run now and Toggle and Delete buttons for each schedule', async () => {
    render(<ReportScheduleManager warehouseId="wh1" warehouseName="Test WH" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });

    const runButton = screen.getByTitle('ส่งรายงานตอนนี้');
    expect(runButton).toBeInTheDocument();

    const toggleButton = screen.getByTitle('ปิดใช้งาน');
    expect(toggleButton).toBeInTheDocument();

    const deleteButton = screen.getByTitle('ลบ');
    expect(deleteButton).toBeInTheDocument();
  });

  it('should show note about RESEND_API_KEY', async () => {
    render(<ReportScheduleManager warehouseId="wh1" warehouseName="Test WH" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });

    expect(screen.getByText(/RESEND_API_KEY/)).toBeInTheDocument();
    expect(screen.getByText(/REPORT_FROM_EMAIL/)).toBeInTheDocument();
  });
});
