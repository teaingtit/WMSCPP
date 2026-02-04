'use client';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 30, 50],
};

/**
 * useHaptic - Haptic feedback for critical mobile interactions
 *
 * @example
 * const { vibrate } = useHaptic();
 * vibrate('medium'); // Button press
 * vibrate('success'); // Transaction complete
 * vibrate('error'); // Validation failed
 *
 * Patterns:
 * - 'light': Selection, toggle (10ms)
 * - 'medium': Button press, confirm (25ms)
 * - 'heavy': Error, warning (50ms)
 * - 'success': Transaction complete sequence
 * - 'error': Validation error sequence
 */
export function useHaptic() {
  const vibrate = (pattern: HapticPattern) => {
    // Check if vibration API is supported
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Silently fail if vibration is not allowed
    }
  };

  return { vibrate };
}

export type { HapticPattern };
