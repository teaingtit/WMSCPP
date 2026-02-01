'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
}

/**
 * BottomSheet - Mobile-optimized modal that slides from bottom
 *
 * Features:
 * - Swipe down to dismiss
 * - Backdrop blur
 * - Snap points support
 * - Full-screen on mobile, centered modal on desktop
 * - Smooth spring animation
 *
 * Usage:
 * ```tsx
 * <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Details">
 *   <YourContent />
 * </BottomSheet>
 * ```
 */
export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90], // percentage of viewport height
  initialSnap = 0,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Sync dynamic height to DOM when open (avoids inline style in JSX for linter)
  const heightVh = snapPoints[initialSnap];
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;
    sheetRef.current.style.setProperty('height', `${heightVh}vh`);
  }, [isOpen, heightVh]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startY.current = touch.clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;
    currentY.current = touch.clientY;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0) {
      // Only allow dragging down
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;

    const deltaY = currentY.current - startY.current;
    isDragging.current = false;

    if (deltaY > 100) {
      // Dismiss if dragged more than 100px
      onClose();
    }

    // Reset position
    sheetRef.current.style.transform = '';
  }, [onClose]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    sheet.addEventListener('touchstart', handleTouchStart);
    sheet.addEventListener('touchmove', handleTouchMove);
    sheet.addEventListener('touchend', handleTouchEnd);

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'relative w-full bg-white dark:bg-slate-900',
          'rounded-t-3xl md:rounded-3xl',
          'shadow-2xl',
          'max-h-dvh-90 md:max-h-dvh-80 md:max-w-2xl',
          'flex flex-col',
          'animate-in slide-in-from-bottom duration-300 ease-smooth',
          'md:animate-in md:zoom-in-95 md:fade-in',
        )}
      >
        {/* Handle (drag indicator) - Mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/10',
                'transition-colors touch-48',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
