import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAriaAnnounce } from '@/hooks/useAriaAnnounce';

describe('useAriaAnnounce', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return an announce function', () => {
    const { result } = renderHook(() => useAriaAnnounce());
    expect(typeof result.current).toBe('function');
  });

  it('should set region textContent when region exists (polite)', () => {
    const region = document.createElement('div');
    region.id = 'aria-live-announcements';
    document.body.appendChild(region);

    const { result } = renderHook(() => useAriaAnnounce());
    act(() => {
      result.current('Test message', 'polite');
    });
    expect(region.textContent).toBe('Test message');
    document.body.removeChild(region);
  });

  it('should use aria-live-assertive region when priority is assertive', () => {
    const region = document.createElement('div');
    region.id = 'aria-live-assertive';
    document.body.appendChild(region);

    const { result } = renderHook(() => useAriaAnnounce());
    act(() => {
      result.current('Assertive message', 'assertive');
    });
    expect(region.textContent).toBe('Assertive message');
    document.body.removeChild(region);
  });

  it('should not throw when region does not exist', () => {
    const { result } = renderHook(() => useAriaAnnounce());
    expect(() => {
      act(() => {
        result.current('No region', 'polite');
      });
    }).not.toThrow();
  });
});
