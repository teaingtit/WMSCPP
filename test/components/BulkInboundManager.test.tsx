/**
 * BulkInboundManager — Vitest + React Testing Library
 *
 * Covers: happy path (download template, upload success), edge cases (empty state,
 * long strings, validation triggers), mocks for server actions and notify,
 * user-event interactions, and basic accessibility of controls.
 */

// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkInboundManager from '@/components/inbound/BulkInboundManager';

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

vi.mock('@/actions/bulk-import-actions', () => ({
  downloadInboundTemplate: vi.fn(),
  importInboundStock: vi.fn(),
}));

vi.mock('@/lib/ui-helpers', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    ok: vi.fn(),
  },
}));

// -----------------------------------------------------------------------------
// Test data
// -----------------------------------------------------------------------------

const defaultProps = {
  warehouseId: 'wh-uuid-1',
  userId: 'user-uuid-1',
  categories: [
    { id: 'cat-1', name: 'อิเล็กทรอนิกส์' },
    { id: 'cat-2', name: 'ของ consumable' },
  ],
};

const emptyCategories: any[] = [];

function createMockFile(name = 'inbound.xlsx', size = 1024): File {
  return new File(['x'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// -----------------------------------------------------------------------------
// Suite
// -----------------------------------------------------------------------------

describe('BulkInboundManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Render and accessibility', () => {
    it('renders header and description', () => {
      render(<BulkInboundManager {...defaultProps} />);

      expect(
        screen.getByRole('heading', { name: /Bulk Inbound|นำเข้าแบบไฟล์/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ระบบจะตรวจสอบความถูกต้องของข้อมูลทุกบรรทัดก่อนบันทึก/),
      ).toBeInTheDocument();
    });

    it('renders category select with accessible label', () => {
      render(<BulkInboundManager {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('id', 'category-select');
    });

    it('renders download and upload buttons with accessible roles', () => {
      render(<BulkInboundManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /โหลด Template/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /อัปโหลดไฟล์/i })).toBeInTheDocument();
    });

    it('file input has aria-label for accessibility', () => {
      render(<BulkInboundManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('aria-label', 'Upload Excel');
      expect(fileInput).toHaveAttribute('accept', '.xlsx');
    });
  });

  describe('Happy path — primary user flow', () => {
    it('populates category options from props', () => {
      render(<BulkInboundManager {...defaultProps} />);

      expect(screen.getByRole('option', { name: '-- กรุณาเลือกหมวดหมู่ --' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'อิเล็กทรอนิกส์' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'ของ consumable' })).toBeInTheDocument();
    });

    it('downloads template when category selected and button clicked', async () => {
      const user = userEvent.setup();
      const { downloadInboundTemplate } = await import('@/actions/bulk-import-actions');
      vi.mocked(downloadInboundTemplate).mockResolvedValue({
        base64: 'dGVzdC1iYXNlNjQ=',
        fileName: 'Inbound_Template_อิเล็กทรอนิกส์.xlsx',
      });

      render(<BulkInboundManager {...defaultProps} />);

      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );
      await user.click(screen.getByRole('button', { name: /โหลด Template/i }));

      await waitFor(() => {
        expect(downloadInboundTemplate).toHaveBeenCalledWith('wh-uuid-1', 'cat-1');
      });

      const { notify } = await import('@/lib/ui-helpers');
      expect(notify.success).toHaveBeenCalledWith('ดาวน์โหลด Template สำเร็จ');
    });

    it('shows success report when upload succeeds', async () => {
      const user = userEvent.setup();
      const { importInboundStock } = await import('@/actions/bulk-import-actions');
      vi.mocked(importInboundStock).mockResolvedValue({
        success: true,
        message: 'นำเข้าสำเร็จ',
        report: { total: 10, success: 10, failed: 0, errors: [] },
      });

      render(<BulkInboundManager {...defaultProps} />);

      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      const file = createMockFile();
      const input = document.querySelector('input[type="file"]');
      await user.upload(input!, file);

      await waitFor(() => {
        expect(importInboundStock).toHaveBeenCalled();
      });

      const formData = vi.mocked(importInboundStock).mock.calls[0][0] as FormData;
      expect(formData.get('warehouseId')).toBe('wh-uuid-1');
      expect(formData.get('categoryId')).toBe('cat-1');
      expect(formData.get('userId')).toBe('user-uuid-1');
      expect(formData.get('file')).toBe(file);

      await waitFor(() => {
        expect(screen.getByText('นำเข้าสำเร็จ')).toBeInTheDocument();
      });
      expect(screen.getByText(/ตรวจสอบ 10 รายการ/)).toBeInTheDocument();
    });

    it('calls notify.ok on successful import', async () => {
      const user = userEvent.setup();
      const { importInboundStock } = await import('@/actions/bulk-import-actions');
      vi.mocked(importInboundStock).mockResolvedValue({
        success: true,
        message: 'OK',
        report: { total: 5, success: 5, failed: 0, errors: [] },
      });

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      const input = document.querySelector('input[type="file"]');
      await user.upload(input!, createMockFile());

      await waitFor(async () => {
        const { notify } = await import('@/lib/ui-helpers');
        expect(notify.ok).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, message: 'OK' }),
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('does not call download when no category selected (button is disabled)', async () => {
      render(<BulkInboundManager {...defaultProps} />);

      const downloadBtn = screen.getByRole('button', { name: /โหลด Template/i });
      expect(downloadBtn).toBeDisabled();
      const { downloadInboundTemplate } = await import('@/actions/bulk-import-actions');
      expect(downloadInboundTemplate).not.toHaveBeenCalled();
    });

    it('does not call import when category not selected (upload is disabled)', () => {
      render(<BulkInboundManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeDisabled();
    });

    it('handles empty categories list', () => {
      render(<BulkInboundManager {...defaultProps} categories={emptyCategories} />);

      const select = screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i });
      expect(select).toBeInTheDocument();
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(1); // only placeholder
    });

    it('handles download API returning no base64', async () => {
      const user = userEvent.setup();
      const { downloadInboundTemplate } = await import('@/actions/bulk-import-actions');
      vi.mocked(downloadInboundTemplate).mockResolvedValue({ base64: null, fileName: '' });

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );
      await user.click(screen.getByRole('button', { name: /โหลด Template/i }));

      await waitFor(async () => {
        const { notify } = await import('@/lib/ui-helpers');
        expect(notify.error).toHaveBeenCalledWith('ไม่สามารถสร้าง Template ได้');
      });
    });

    it('handles download API throwing', async () => {
      const user = userEvent.setup();
      const { downloadInboundTemplate } = await import('@/actions/bulk-import-actions');
      vi.mocked(downloadInboundTemplate).mockRejectedValue(new Error('Network error'));

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );
      await user.click(screen.getByRole('button', { name: /โหลด Template/i }));

      await waitFor(async () => {
        const { notify } = await import('@/lib/ui-helpers');
        expect(notify.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('shows failure report when import returns success: false', async () => {
      const user = userEvent.setup();
      const { importInboundStock } = await import('@/actions/bulk-import-actions');
      vi.mocked(importInboundStock).mockResolvedValue({
        success: false,
        message: 'พบข้อผิดพลาด 2 รายการ',
        report: {
          total: 5,
          success: 3,
          failed: 2,
          errors: ['แถว 2: SKU ซ้ำ', 'แถว 4: จำนวนไม่ถูกต้อง'],
        },
      });

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      const input = document.querySelector('input[type="file"]');
      await user.upload(input!, createMockFile());

      await waitFor(() => {
        expect(screen.getByText('นำเข้าล้มเหลว')).toBeInTheDocument();
      });
      expect(screen.getByText(/รายการข้อผิดพลาด/)).toBeInTheDocument();
      expect(screen.getByText(/แถว 2: SKU ซ้ำ/)).toBeInTheDocument();
      expect(screen.getByText(/แถว 4: จำนวนไม่ถูกต้อง/)).toBeInTheDocument();
    });

    it('handles import API throwing (network error)', async () => {
      const user = userEvent.setup();
      const { importInboundStock } = await import('@/actions/bulk-import-actions');
      vi.mocked(importInboundStock).mockRejectedValue(new Error('Connection failed'));

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      const input = document.querySelector('input[type="file"]');
      await user.upload(input!, createMockFile());

      await waitFor(async () => {
        const { notify } = await import('@/lib/ui-helpers');
        expect(notify.error).toHaveBeenCalledWith('Connection failed');
      });
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('renders with category name containing very long text', () => {
      const longName = 'หมวดหมู่ที่มีชื่อยาวมากๆ '.repeat(20);
      render(
        <BulkInboundManager {...defaultProps} categories={[{ id: 'long-cat', name: longName }]} />,
      );

      const longOption = screen.getByRole('option', { name: /หมวดหมู่ที่มีชื่อยาวมากๆ/ });
      expect(longOption).toBeInTheDocument();
      expect(longOption).toHaveAttribute('value', 'long-cat');
    });

    it('clears report when category selection changes', async () => {
      const user = userEvent.setup();
      const { importInboundStock } = await import('@/actions/bulk-import-actions');
      vi.mocked(importInboundStock).mockResolvedValue({
        success: true,
        report: { total: 1, success: 1, failed: 0, errors: [] },
      });

      render(<BulkInboundManager {...defaultProps} />);
      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      const input = document.querySelector('input[type="file"]');
      await user.upload(input!, createMockFile());

      await waitFor(() => {
        expect(screen.getByText('นำเข้าสำเร็จ')).toBeInTheDocument();
      });

      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-2',
      );

      expect(screen.queryByText('นำเข้าสำเร็จ')).not.toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('disables download and upload when no category selected', () => {
      render(<BulkInboundManager {...defaultProps} />);

      expect(screen.getByRole('button', { name: /โหลด Template/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /อัปโหลดไฟล์/i })).toBeDisabled();
    });

    it('enables buttons after category is selected', async () => {
      const user = userEvent.setup();
      render(<BulkInboundManager {...defaultProps} />);

      await user.selectOptions(
        screen.getByRole('combobox', { name: /เลือกหมวดหมู่สินค้า/i }),
        'cat-1',
      );

      expect(screen.getByRole('button', { name: /โหลด Template/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /อัปโหลดไฟล์/i })).not.toBeDisabled();
    });
  });
});
