'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  threshold?: number;
}

/**
 * PullToRefresh - Pull down to refresh functionality
 *
 * Features:
 * - Touch gesture detection
 * - Visual feedback (arrow rotation)
 * - Smooth spring animation
 * - Customizable threshold
 *
 * Usage:
 * ```tsx
 * <PullToRefresh onRefresh={async () => { await fetchData(); }}>
 *   <YourContent />
 * </PullToRefresh>
 * ```
 */
export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      // Only allow pull if scrolled to top
      const scrollTop = containerRef.current?.scrollTop || window.scrollY;
      if (scrollTop === 0) {
        const touch = e.touches[0];
        if (!touch) return;
        startY.current = touch.clientY;
        setCanPull(true);
      }
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canPull || disabled || isRefreshing) return;

      const touch = e.touches[0];
      if (!touch) return;
      const currentY = touch.clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        // Apply rubber band effect
        const rubberBand = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(rubberBand);

        // Prevent default scroll if pulling
        if (rubberBand > 10) {
          e.preventDefault();
        }
      }
    },
    [canPull, disabled, isRefreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!canPull) return;

    setCanPull(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [canPull, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const rotation = Math.min((pullDistance / threshold) * 180, 180);
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull Indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200',
          'pointer-events-none',
        )}
        style={{
          height: `${pullDistance}px`,
          opacity: opacity,
        }}
      >
        <div
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-full',
            'bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm',
            'shadow-lg border border-neutral-200 dark:border-white/10',
          )}
        >
          <ChevronDown
            className={cn(
              'w-6 h-6 transition-transform duration-200',
              isRefreshing ? 'animate-spin' : '',
            )}
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {isRefreshing
              ? 'กำลังรีเฟรช...'
              : pullDistance >= threshold
              ? 'ปล่อยเพื่อรีเฟรช'
              : 'ดึงลงเพื่อรีเฟรช'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
