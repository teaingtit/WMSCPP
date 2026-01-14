'use client';

import { cn } from '@/lib/utils';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'button' | 'input';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
  className?: string;
  count?: number;
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
}: SkeletonLoaderProps) {
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
      default:
        return 'h-4 w-full rounded';
    }
  };

  const skeletonElement = (
    <div
      className={cn(
        'bg-neutral-200 dark:bg-neutral-800 animate-pulse relative overflow-hidden',
        getVariantStyles(),
        className,
      )}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{skeletonElement}</div>
      ))}
    </div>
  );
}
