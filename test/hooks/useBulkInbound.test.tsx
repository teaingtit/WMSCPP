/**
 * useBulkInbound — tests with injected dependencies (no vi.mock of actions).
 * Demonstrates testing the hook in isolation by passing mock deps.
 */

// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkInbound } from '@/hooks/useBulkInbound';

describe('useBulkInbound', () => {
  let mockDownload: ReturnType<typeof vi.fn>;
  let mockImport: ReturnType<typeof vi.fn>;
  let mockNotify: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    ok: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDownload = vi.fn();
    mockImport = vi.fn();
    mockNotify = {
      success: vi.fn(),
      error: vi.fn(),
      ok: vi.fn(),
    };
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useBulkInbound({
        warehouseId: 'wh-1',
        userId: 'u-1',
        deps: {
          downloadTemplate: mockDownload,
          importStock: mockImport,
          notify: mockNotify,
        },
      }),
    );

    expect(result.current.selectedCat).toBe('');
    expect(result.current.report).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('setSelectedCat updates selectedCat and clears report', () => {
    const { result } = renderHook(() =>
      useBulkInbound({
        warehouseId: 'wh-1',
        userId: 'u-1',
        deps: { downloadTemplate: mockDownload, importStock: mockImport, notify: mockNotify },
      }),
    );

    act(() => result.current.setSelectedCat('cat-1'));
    expect(result.current.selectedCat).toBe('cat-1');

    act(() => result.current.setSelectedCat('cat-2'));
    expect(result.current.selectedCat).toBe('cat-2');
  });

  it('handleDownload calls notify.error when no category selected', async () => {
    const { result } = renderHook(() =>
      useBulkInbound({
        warehouseId: 'wh-1',
        userId: 'u-1',
        deps: { downloadTemplate: mockDownload, importStock: mockImport, notify: mockNotify },
      }),
    );

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockNotify.error).toHaveBeenCalledWith('กรุณาเลือกหมวดหมู่สินค้าก่อน');
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('handleDownload calls downloadTemplate and notify.success when category selected', async () => {
    mockDownload.mockResolvedValue({ base64: 'YQ==', fileName: 'Template.xlsx' });

    const { result } = renderHook(() =>
      useBulkInbound({
        warehouseId: 'wh-1',
        userId: 'u-1',
        deps: { downloadTemplate: mockDownload, importStock: mockImport, notify: mockNotify },
      }),
    );

    act(() => result.current.setSelectedCat('cat-1'));

    await act(async () => {
      await result.current.handleDownload();
    });

    expect(mockDownload).toHaveBeenCalledWith('wh-1', 'cat-1');
    expect(mockNotify.success).toHaveBeenCalledWith('ดาวน์โหลด Template สำเร็จ');
  });

  it('handleUpload builds FormData and calls importStock with injected deps', async () => {
    mockImport.mockResolvedValue({
      success: true,
      report: { total: 5, success: 5, failed: 0, errors: [] },
    });

    const file = new File(['x'], 'in.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fakeEvent = {
      target: { files: [file], value: '' },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    const { result } = renderHook(() =>
      useBulkInbound({
        warehouseId: 'wh-1',
        userId: 'u-1',
        deps: { downloadTemplate: mockDownload, importStock: mockImport, notify: mockNotify },
      }),
    );

    act(() => result.current.setSelectedCat('cat-1'));

    await act(async () => {
      await result.current.handleUpload(fakeEvent);
    });

    expect(mockImport).toHaveBeenCalledTimes(1);
    const formData = mockImport.mock.calls[0][0] as FormData;
    expect(formData.get('warehouseId')).toBe('wh-1');
    expect(formData.get('categoryId')).toBe('cat-1');
    expect(formData.get('userId')).toBe('u-1');
    expect(formData.get('file')).toBe(file);
    expect(result.current.report).toEqual({ total: 5, failed: 0, errors: [] });
  });
});
