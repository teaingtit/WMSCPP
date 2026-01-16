'use client';

import { cn } from '@/lib/utils';

/**
 * SkipLink - Accessibility component for keyboard navigation
 *
 * Allows users to skip repetitive navigation and jump directly to main content.
 * Visible only when focused (keyboard navigation).
 *
 * Usage:
 * Add at the top of your layout, before navigation elements.
 * Ensure main content has id="main-content"
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        // Hidden by default
        'sr-only',
        // Visible when focused (keyboard navigation)
        'focus:not-sr-only',
        'focus:absolute',
        'focus:z-[9999]',
        'focus:top-4',
        'focus:left-4',
        'focus:px-4',
        'focus:py-2.5',
        'focus:bg-primary',
        'focus:text-primary-foreground',
        'focus:rounded-lg',
        'focus:font-semibold',
        'focus:shadow-lg',
        'focus:ring-2',
        'focus:ring-ring',
        'focus:ring-offset-2',
        'focus:outline-none',
        'transition-all',
        'duration-200',
      )}
      aria-label="ข้ามไปยังเนื้อหาหลัก"
    >
      ข้ามไปยังเนื้อหาหลัก
    </a>
  );
}
