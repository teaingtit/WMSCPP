'use client';

import { useCallback, useEffect, useRef } from 'react';

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const regionId = priority === 'assertive' ? 'aria-live-assertive' : 'aria-live-announcements';
    const region = document.getElementById(regionId);

    if (region) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Clear previous message
      region.textContent = '';
      // Force reflow
      void region.offsetWidth;
      // Set new message
      region.textContent = message;

      // Clear after announcement (optional, for repeated announcements)
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (region.textContent === message) {
          region.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}
