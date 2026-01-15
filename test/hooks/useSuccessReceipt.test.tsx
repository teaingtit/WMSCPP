import { renderHook, act } from '@testing-library/react';
import useSuccessReceipt from '@/hooks/useSuccessReceipt';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Access the mocked router from setup.ts (or re-mock if needed)
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: vi.fn(),
  };
});

describe('useSuccessReceipt', () => {
  let mockPush: any;
  let mockRefresh: any;

  beforeEach(() => {
    mockPush = vi.fn();
    mockRefresh = vi.fn();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    });
  });

  it('should initialize with null info', () => {
    const { result } = renderHook(() => useSuccessReceipt());
    expect(result.current.successInfo).toBeNull();
  });

  it('should set success info', () => {
    const { result } = renderHook(() => useSuccessReceipt());
    const mockData: any = { data: { title: 'Success' }, redirect: false };

    act(() => {
      result.current.setSuccessInfo(mockData);
    });

    expect(result.current.successInfo).toEqual(mockData);
  });

  it('should handle close without redirect path (default refresh)', () => {
    const { result } = renderHook(() => useSuccessReceipt());
    const mockData: any = { data: {}, redirect: false };

    act(() => {
      result.current.setSuccessInfo(mockData);
    });

    act(() => {
      result.current.handleSuccessModalClose();
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.successInfo).toBeNull();
  });

  it('should handle close with redirect path', () => {
    const getRedirectPath = vi.fn().mockReturnValue('/new-path');
    const { result } = renderHook(() => useSuccessReceipt(getRedirectPath));
    const mockData: any = { data: {}, redirect: true };

    act(() => {
      result.current.setSuccessInfo(mockData);
    });

    act(() => {
      result.current.handleSuccessModalClose();
    });

    expect(getRedirectPath).toHaveBeenCalledWith(mockData);
    expect(mockPush).toHaveBeenCalledWith('/new-path');
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(result.current.successInfo).toBeNull();
  });

  it('should do nothing if info is null on close', () => {
    const { result } = renderHook(() => useSuccessReceipt());

    act(() => {
      result.current.handleSuccessModalClose();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
