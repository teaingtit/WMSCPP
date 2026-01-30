import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

describe('useSwipeGesture', () => {
  let onSwipeLeft: ReturnType<typeof vi.fn>;
  let onSwipeRight: ReturnType<typeof vi.fn>;
  let onSwipeUp: ReturnType<typeof vi.fn>;
  let onSwipeDown: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSwipeLeft = vi.fn();
    onSwipeRight = vi.fn();
    onSwipeUp = vi.fn();
    onSwipeDown = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return bind with onTouchStart, onTouchEnd, onTouchCancel', () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }));
    expect(result.current.bind).toHaveProperty('onTouchStart');
    expect(result.current.bind).toHaveProperty('onTouchEnd');
    expect(result.current.bind).toHaveProperty('onTouchCancel');
    expect(result.current.swiping).toBe(false);
    expect(result.current.direction).toBeNull();
  });

  it('should call onSwipeRight when swiping right past threshold', async () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 50 }),
    );
    const el = document.createElement('div');
    document.body.appendChild(el);

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 0, clientY: 50 }],
      } as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(true);

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 80, clientY: 55 } as Touch],
    });
    Object.defineProperty(moveEvent, 'preventDefault', { value: vi.fn() });
    await act(async () => {
      window.dispatchEvent(moveEvent);
    });

    await act(async () => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeRight).toHaveBeenCalled();
    expect(onSwipeLeft).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('should call onSwipeLeft when swiping left past threshold', async () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 50 }),
    );
    const el = document.createElement('div');
    document.body.appendChild(el);

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 100, clientY: 50 }],
      } as React.TouchEvent);
    });

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 30, clientY: 55 } as Touch],
    });
    await act(async () => {
      window.dispatchEvent(moveEvent);
    });

    await act(async () => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeLeft).toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it('should not call callbacks when movement is below threshold', async () => {
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold: 100 }),
    );

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 0, clientY: 50 }],
      } as React.TouchEvent);
    });

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 30, clientY: 55 } as Touch],
    });
    await act(async () => {
      window.dispatchEvent(moveEvent);
    });

    await act(async () => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('should reset swiping and direction on touch end', () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }));

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 0, clientY: 50 }],
      } as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(true);

    act(() => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(false);
    expect(result.current.direction).toBeNull();
  });

  it('should call onSwipeUp when swiping up past threshold', async () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeUp, onSwipeDown, threshold: 50 }));

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 50, clientY: 100 }],
      } as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(true);

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 55, clientY: 30 } as Touch], // dy = -70, absY > threshold
    });
    await act(async () => {
      window.dispatchEvent(moveEvent);
    });

    await act(async () => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeUp).toHaveBeenCalled();
    expect(onSwipeDown).not.toHaveBeenCalled();
  });

  it('should call onSwipeDown when swiping down past threshold', async () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeUp, onSwipeDown, threshold: 50 }));

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 50, clientY: 0 }],
      } as React.TouchEvent);
    });

    const moveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 55, clientY: 80 } as Touch], // dy = 80, absY > threshold
    });
    await act(async () => {
      window.dispatchEvent(moveEvent);
    });

    await act(async () => {
      result.current.bind.onTouchEnd({} as React.TouchEvent);
    });

    expect(onSwipeDown).toHaveBeenCalled();
    expect(onSwipeUp).not.toHaveBeenCalled();
  });

  it('should handle touch cancel', () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }));

    act(() => {
      result.current.bind.onTouchStart({
        touches: [{ clientX: 0, clientY: 50 }],
      } as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(true);

    act(() => {
      result.current.bind.onTouchCancel({} as React.TouchEvent);
    });
    expect(result.current.swiping).toBe(false);
  });

  it('should handle touch start with no touches', () => {
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }));

    act(() => {
      result.current.bind.onTouchStart({
        touches: [],
      } as unknown as React.TouchEvent);
    });
    // Should not crash, swiping state depends on implementation
  });
});
