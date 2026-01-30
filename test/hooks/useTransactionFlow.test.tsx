// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTransactionFlow from '@/hooks/useTransactionFlow';

const mockSetSuccessInfo = vi.fn();
const mockHandleSuccessModalClose = vi.fn();
vi.mock('@/hooks/useSuccessReceipt', () => ({
  default: (getRedirectPath?: (info: unknown) => string | undefined) => ({
    successInfo: null,
    setSuccessInfo: mockSetSuccessInfo,
    handleSuccessModalClose: mockHandleSuccessModalClose,
  }),
}));

describe('useTransactionFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return isOpen, isLoading, openConfirm, closeConfirm, execute, successInfo, handleSuccessModalClose', () => {
    const executor = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useTransactionFlow(executor));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.openConfirm).toBe('function');
    expect(typeof result.current.closeConfirm).toBe('function');
    expect(typeof result.current.execute).toBe('function');
    expect(result.current.successInfo).toBeNull();
    expect(typeof result.current.handleSuccessModalClose).toBe('function');
  });

  it('should open and close confirm', () => {
    const executor = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useTransactionFlow(executor));
    act(() => result.current.openConfirm());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.closeConfirm());
    expect(result.current.isOpen).toBe(false);
  });

  it('should call executor and setSuccessInfo on success', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1' },
      message: 'Done',
    });
    const { result } = renderHook(() => useTransactionFlow(executor));

    let p: Promise<unknown>;
    act(() => {
      p = result.current.execute();
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      await p!;
    });
    expect(executor).toHaveBeenCalled();
    expect(mockSetSuccessInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        redirect: false,
      }),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('should not setSuccessInfo when executor returns success: false', async () => {
    const executor = vi.fn().mockResolvedValue({ success: false });
    const { result } = renderHook(() => useTransactionFlow(executor));
    await act(async () => {
      await result.current.execute();
    });
    expect(mockSetSuccessInfo).not.toHaveBeenCalled();
  });

  it('should setSuccessInfo with redirect true when executor returns redirect: true', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: true,
      data: { id: '1' },
      redirect: true,
    });
    const { result } = renderHook(() => useTransactionFlow(executor));
    await act(async () => {
      await result.current.execute();
    });
    expect(mockSetSuccessInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        redirect: true,
      }),
    );
  });

  it('should setSuccessInfo with title from message when data is undefined', async () => {
    const executor = vi.fn().mockResolvedValue({
      success: true,
      message: 'Done',
      data: undefined,
    });
    const { result } = renderHook(() => useTransactionFlow(executor));
    await act(async () => {
      await result.current.execute();
    });
    expect(mockSetSuccessInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Done',
          details: undefined,
        }),
        redirect: false,
      }),
    );
  });
});
