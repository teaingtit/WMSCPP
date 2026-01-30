'use client';

import { useCallback, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface UseSwipeGestureOptions {
  /** Min distance (px) to count as a swipe. Default 50 */
  threshold?: number;
  /** Max vertical drift (px) allowed for horizontal swipe. Default 80 */
  maxVerticalDrift?: number;
  /** Max horizontal drift (px) allowed for vertical swipe. Default 80 */
  maxHorizontalDrift?: number;
  /** Called when user swipes left (e.g. next tab) */
  onSwipeLeft?: () => void;
  /** Called when user swipes right (e.g. previous tab) */
  onSwipeRight?: () => void;
  /** Called when user swipes up (optional, e.g. reveal actions) */
  onSwipeUp?: () => void;
  /** Called when user swipes down (optional) */
  onSwipeDown?: () => void;
  /** Prevent default touch behavior (e.g. scroll) during horizontal swipe. Default true when onSwipeLeft/Right provided */
  preventScroll?: boolean;
  /** Use capture phase for listeners. Default true */
  capture?: boolean;
}

const DEFAULT_THRESHOLD = 50;
const DEFAULT_DRIFT = 80;

/**
 * Hook for swipe gestures: horizontal (tabs, carousel) and optional vertical.
 * Use for: swipe-between-tabs, swipe-to-select or swipe-to-reveal on inventory rows.
 *
 * @example Tabs
 * const { bind } = useSwipeGesture({
 *   onSwipeLeft: () => setTab((i) => Math.min(i + 1, tabs.length - 1)),
 *   onSwipeRight: () => setTab((i) => Math.max(i - 1, 0)),
 * });
 * return <div {...bind}>...</div>;
 *
 * @example Inventory row (swipe to select)
 * const { bind } = useSwipeGesture({
 *   onSwipeRight: () => onSelect?.(itemId),
 *   threshold: 60,
 * });
 * return <div {...bind} className="touch-pan-y">...</div>;
 */
export function useSwipeGesture(options: UseSwipeGestureOptions = {}) {
  const {
    threshold = DEFAULT_THRESHOLD,
    maxVerticalDrift = DEFAULT_DRIFT,
    maxHorizontalDrift = DEFAULT_DRIFT,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    preventScroll = Boolean(onSwipeLeft ?? onSwipeRight),
    capture = true,
  } = options;

  const [swiping, setSwiping] = useState(false);
  const [direction, setDirection] = useState<SwipeDirection | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const handledRef = useRef(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  const handleEnd = useCallback(() => {
    startRef.current = { x: 0, y: 0 };
    handledRef.current = false;
    setSwiping(false);
    setDirection(null);
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  const handleMove = useCallback(
    (e: TouchEvent) => {
      if (handledRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX > absY) {
        if (absY <= maxVerticalDrift && absX >= threshold) {
          if (preventScroll) e.preventDefault();
          handledRef.current = true;
          setDirection(dx > 0 ? 'right' : 'left');
          if (dx > 0) onSwipeRight?.();
          else onSwipeLeft?.();
          handleEnd();
        }
      } else {
        if (absX <= maxHorizontalDrift && absY >= threshold) {
          handledRef.current = true;
          setDirection(dy > 0 ? 'down' : 'up');
          if (dy > 0) onSwipeDown?.();
          else onSwipeUp?.();
          handleEnd();
        }
      }
    },
    [
      threshold,
      maxVerticalDrift,
      maxHorizontalDrift,
      preventScroll,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      handleEnd,
    ],
  );

  const handleStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startRef.current = { x: t.clientX, y: t.clientY };
      handledRef.current = false;
      setSwiping(true);
      setDirection(null);

      if (cleanupRef.current) cleanupRef.current();
      const move = (ev: TouchEvent) => handleMove(ev);
      const end = () => handleEnd();
      window.addEventListener('touchmove', move, { passive: !preventScroll, capture });
      window.addEventListener('touchend', end, { capture });
      window.addEventListener('touchcancel', end, { capture });
      cleanupRef.current = () => {
        window.removeEventListener('touchmove', move, { capture });
        window.removeEventListener('touchend', end, { capture });
        window.removeEventListener('touchcancel', end, { capture });
      };
    },
    [handleMove, handleEnd, preventScroll, capture],
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      handleEnd();
    },
    [handleEnd],
  );

  return {
    bind: {
      onTouchStart: handleStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    swiping,
    direction,
  };
}
