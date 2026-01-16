'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Maximum value (default: 100)
   */
  max?: number;
  /**
   * Show percentage text
   */
  showLabel?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant
   */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  /**
   * Indeterminate mode (animated loading)
   */
  indeterminate?: boolean;
  /**
   * ARIA label for accessibility
   */
  'aria-label'?: string;
}

/**
 * ProgressBar - Visual progress indicator component
 *
 * Features:
 * - Determinate and indeterminate modes
 * - Multiple size and color variants
 * - Full accessibility support
 * - Smooth animations
 *
 * Usage:
 * ```tsx
 * <ProgressBar value={75} showLabel />
 * <ProgressBar indeterminate aria-label="กำลังอัปโหลด" />
 * ```
 */
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      showLabel = false,
      size = 'md',
      variant = 'default',
      indeterminate = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    // Clamp value between 0 and max
    const clampedValue = Math.min(Math.max(value, 0), max);
    const percentage = indeterminate ? undefined : Math.round((clampedValue / max) * 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    };

    const label =
      ariaLabel || (percentage !== undefined ? `ความคืบหน้า ${percentage}%` : 'กำลังโหลด');

    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-label={label}
        aria-busy={indeterminate}
        {...props}
      >
        {/* Background track */}
        <div className={cn('w-full rounded-full bg-muted overflow-hidden', sizeClasses[size])}>
          {/* Progress fill */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant],
              indeterminate && 'w-1/3',
            )}
            style={{
              ...(indeterminate
                ? { animation: 'progress-indeterminate 1.5s ease-in-out infinite' }
                : { width: `${percentage}%` }),
            }}
          />
        </div>

        {/* Label */}
        {showLabel && percentage !== undefined && (
          <div className="mt-1.5 text-xs font-medium text-muted-foreground text-right">
            {percentage}%
          </div>
        )}
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
