// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/use-media-query';

const mockMatchMedia = (matches: boolean) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  onchange: null,
  media: '',
});

describe('useMediaQuery', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    if (typeof window.matchMedia === 'undefined') {
      (window as any).matchMedia = vi.fn(() => mockMatchMedia(false));
    }
  });

  afterEach(() => {
    (window as any).matchMedia = originalMatchMedia;
  });

  it('should return true when matchMedia returns matches: true', () => {
    const matchMediaFn = vi.fn(() => mockMatchMedia(true));
    (window as any).matchMedia = matchMediaFn;

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should return false when matchMedia returns matches: false', () => {
    const matchMediaFn = vi.fn(() => mockMatchMedia(false));
    (window as any).matchMedia = matchMediaFn;

    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('should update when media query match changes', async () => {
    const listeners: Array<() => void> = [];
    const mockMedia = mockMatchMedia(false);
    mockMedia.addEventListener = vi.fn((_type: string, fn: () => void) => {
      listeners.push(fn);
    });
    mockMedia.removeEventListener = vi.fn((_type: string, fn: () => void) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    });
    (window as any).matchMedia = vi.fn(() => mockMedia);

    const { result, rerender } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    Object.defineProperty(mockMedia, 'matches', { value: true, configurable: true });
    await act(async () => {
      listeners.forEach((fn) => fn());
    });
    rerender();
    expect(result.current).toBe(true);
  });
});
