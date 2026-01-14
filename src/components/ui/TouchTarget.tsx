'use client';

import { cn } from '@/lib/utils';

interface TouchTargetProps {
  size?: 44 | 48 | 56;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * TouchTarget: Ensures minimum touch target size for accessibility
 * Default: 48x48px (WCAG AAA)
 *
 * Usage:
 * ```tsx
 * <TouchTarget onClick={handleClick} ariaLabel="Delete">
 *   <Trash2 className="w-5 h-5" />
 * </TouchTarget>
 * ```
 */
export default function TouchTarget({
  size = 48,
  children,
  onClick,
  className,
  ariaLabel,
  disabled = false,
}: TouchTargetProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center',
        'touch-manipulation transition-all duration-150',
        size === 44 && 'min-w-[44px] min-h-[44px]',
        size === 48 && 'min-w-[48px] min-h-[48px]',
        size === 56 && 'min-w-[56px] min-h-[56px]',
        onClick && !disabled && 'active:scale-95',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...(onClick && { type: 'button' as const })}
    >
      {children}
    </Component>
  );
}
