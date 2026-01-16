'use client';

import { useCallback } from 'react';

/**
 * Hook for announcing messages to screen readers
 *
 * Usage:
 * ```tsx
 * const announce = useAriaAnnounce();
 * announce('บันทึกข้อมูลเรียบร้อย', 'polite');
 * ```
 */
export function useAriaAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const regionId = priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-announcements';
    const region = document.getElementById(regionId);

    if (region) {
      // Clear previous message
      region.textContent = '';
      // Force reflow
      void region.offsetWidth;
      // Set new message
      region.textContent = message;

      // Clear after announcement (optional, for repeated announcements)
      setTimeout(() => {
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}
