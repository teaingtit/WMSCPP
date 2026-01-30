// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransitionRouter } from '@/hooks/useTransitionRouter';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
const mockSetIsLoading = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock('@/components/providers/GlobalLoadingProvider', () => ({
  useGlobalLoading: () => ({
    setIsLoading: mockSetIsLoading,
  }),
}));

describe('useTransitionRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return push, replace, back that set loading and call router', () => {
    const { result } = renderHook(() => useTransitionRouter());
    act(() => result.current.push('/dashboard'));
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');

    act(() => result.current.replace('/login'));
    expect(mockReplace).toHaveBeenCalledWith('/login');

    act(() => result.current.back());
    expect(mockBack).toHaveBeenCalled();
  });
});
