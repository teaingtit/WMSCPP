// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import { useFormAction, useAsyncAction } from '@/hooks/useFormAction';

vi.mock('@/lib/ui-helpers', () => ({
  notify: {
    ok: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  wrapFormAction:
    (fn: (formData: FormData) => Promise<unknown>) => (_prev: unknown, formData: FormData) =>
      fn(formData),
}));

const mockUseActionState = vi.fn();
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useActionState: (...args: unknown[]) => mockUseActionState(...args),
  };
});

describe('useFormAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActionState.mockReturnValue([{ success: false, message: '' }, vi.fn()]);
  });

  it('should return state, action, and formRef', () => {
    const serverAction = vi.fn().mockResolvedValue({ success: true, message: 'Ok' });
    const { result } = renderHook(() => useFormAction(serverAction));
    expect(result.current.state).toEqual({ success: false, message: '' });
    expect(typeof result.current.action).toBe('function');
    expect(result.current.formRef).toHaveProperty('current');
  });

  it('should call onSuccess when state.success is true', () => {
    const onSuccess = vi.fn();
    mockUseActionState.mockReturnValue([{ success: true, message: 'Success!' }, vi.fn()]);

    const serverAction = vi.fn().mockResolvedValue({ success: true, message: 'Ok' });
    renderHook(() => useFormAction(serverAction, { onSuccess }));

    expect(onSuccess).toHaveBeenCalled();
  });

  it('should call onError when state.success is false', () => {
    const onError = vi.fn();
    mockUseActionState.mockReturnValue([{ success: false, message: 'Error occurred' }, vi.fn()]);

    const serverAction = vi.fn().mockResolvedValue({ success: false, message: 'Error' });
    renderHook(() => useFormAction(serverAction, { onError }));

    expect(onError).toHaveBeenCalledWith('Error occurred');
  });

  it('should reset form on success when resetOnSuccess is true and formRef exists', () => {
    const resetSpy = vi.spyOn(HTMLFormElement.prototype, 'reset');
    mockUseActionState.mockReturnValue([{ success: true, message: 'Success!' }, vi.fn()]);

    const serverAction = vi.fn().mockResolvedValue({ success: true, message: 'Ok' });

    function FormWithReset() {
      const { formRef } = useFormAction(serverAction, { resetOnSuccess: true });
      return <form ref={formRef} data-testid="test-form" />;
    }

    render(<FormWithReset />);

    expect(resetSpy).toHaveBeenCalled();
    resetSpy.mockRestore();
  });

  it('should not call callbacks when message is empty', () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    mockUseActionState.mockReturnValue([{ success: false, message: '' }, vi.fn()]);

    const serverAction = vi.fn().mockResolvedValue({ success: true, message: '' });
    renderHook(() => useFormAction(serverAction, { onSuccess, onError }));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have execute and isLoading', () => {
    const action = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
    const { result } = renderHook(() => useAsyncAction(action));
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.execute).toBe('function');
  });

  it('should set loading during execute and call onSuccess on success', async () => {
    const action = vi.fn().mockResolvedValue({ success: true, message: 'Done' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsyncAction(action, { onSuccess }));

    let p: Promise<unknown>;
    act(() => {
      p = result.current.execute('arg1');
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      await p!;
    });
    expect(result.current.isLoading).toBe(false);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('should call onError when action returns success: false', async () => {
    const action = vi.fn().mockResolvedValue({ success: false, message: 'Failed' });
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction(action, { onError }));

    await act(async () => {
      await result.current.execute();
    });
    expect(onError).toHaveBeenCalledWith('Failed');
  });

  it('should handle thrown errors and call onError', async () => {
    const action = vi.fn().mockRejectedValue(new Error('Network error'));
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncAction(action, { onError }));

    await act(async () => {
      try {
        await result.current.execute();
      } catch (err) {
        // Expected to throw
      }
    });
    expect(onError).toHaveBeenCalledWith('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return result from action', async () => {
    const expectedResult = { success: true, message: 'Done', data: { id: 1 } };
    const action = vi.fn().mockResolvedValue(expectedResult);
    const { result } = renderHook(() => useAsyncAction(action));

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute();
    });
    expect(returnValue).toEqual(expectedResult);
  });
});
