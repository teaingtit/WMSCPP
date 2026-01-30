'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type SkeletonVariant =
  | 'text'
  | 'card'
  | 'avatar'
  | 'button'
  | 'input'
  | 'table'
  | 'form'
  | 'list'
  | 'badge'
  | 'circle';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
  count?: number;
  'aria-label'?: string;
  'aria-busy'?: boolean;
}

/**
 * SkeletonLoader - Animated placeholder for loading states
 *
 * Features:
 * - Multiple variants (text, card, avatar, button, input)
 * - Shimmer animation
 * - Customizable size
 * - Repeat count support
 *
 * Usage:
 * ```tsx
 * <SkeletonLoader variant="card" count={3} />
 * <SkeletonLoader variant="text" width="200px" />
 * ```
 */
export default function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className,
  count = 1,
  'aria-label': ariaLabel,
  'aria-busy': ariaBusy = true,
}: SkeletonLoaderProps) {
  const sizeRef = useRef<HTMLDivElement>(null);
  const ariaBusyProps = ariaBusy
    ? ({ 'aria-busy': 'true' as const } as const)
    : ({ 'aria-busy': 'false' as const } as const);

  useEffect(() => {
    if (!sizeRef.current) return;
    if (width) sizeRef.current.style.setProperty('--skeleton-width', width);
    if (height) sizeRef.current.style.setProperty('--skeleton-height', height);
  }, [width, height]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return 'h-4 w-full rounded';
      case 'card':
        return 'h-32 w-full rounded-2xl';
      case 'avatar':
        return 'h-12 w-12 rounded-full';
      case 'button':
        return 'h-10 w-24 rounded-xl';
      case 'input':
        return 'h-12 w-full rounded-lg';
      case 'table':
        return 'h-12 w-full rounded-lg';
      case 'form':
        return 'h-16 w-full rounded-xl';
      case 'list':
        return 'h-20 w-full rounded-lg';
      case 'badge':
        return 'h-6 w-16 rounded-full';
      case 'circle':
        return 'h-16 w-16 rounded-full';
      default:
        return 'h-4 w-full rounded';
    }
  };

  const skeletonElement = (
    <div
      className={cn(
        'bg-neutral-200 dark:bg-neutral-800 animate-pulse relative overflow-hidden',
        (width || height) && 'skeleton-size-dynamic',
        getVariantStyles(),
        className,
      )}
      {...ariaBusyProps}
      aria-label={ariaLabel || 'กำลังโหลด'}
      role="status"
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="sr-only">{ariaLabel || 'กำลังโหลด'}</span>
    </div>
  );

  const wrapper = (
    <div ref={sizeRef} className={count > 1 ? 'space-y-3' : undefined}>
      {count === 1
        ? skeletonElement
        : Array.from({ length: count }).map((_, index) => <div key={index}>{skeletonElement}</div>)}
    </div>
  );
  return wrapper;
}
