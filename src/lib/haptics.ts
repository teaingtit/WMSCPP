/**
 * Visual Haptic Feedback Utilities
 *
 * Provides visual feedback animations to simulate haptic responses
 * since Web Vibration API has limited browser support
 */

type FeedbackType = 'pulse' | 'shake' | 'success' | 'error' | 'bounce';

/**
 * Trigger visual feedback on an element
 */
export const triggerFeedback = (element: HTMLElement | null, type: FeedbackType = 'pulse') => {
  if (!element) return;

  // Remove any existing animation classes
  element.classList.remove(
    'animate-pulse-once',
    'animate-shake',
    'animate-bounce-soft',
    'flash-success',
    'flash-error',
  );

  // Force reflow to restart animation
  void element.offsetWidth;

  // Add appropriate animation class
  switch (type) {
    case 'pulse':
      element.classList.add('animate-pulse-once');
      setTimeout(() => element.classList.remove('animate-pulse-once'), 500);
      break;

    case 'shake':
      element.classList.add('animate-shake');
      setTimeout(() => element.classList.remove('animate-shake'), 400);
      break;

    case 'success':
      element.classList.add('flash-success');
      setTimeout(() => element.classList.remove('flash-success'), 600);
      break;

    case 'error':
      element.classList.add('flash-error');
      setTimeout(() => element.classList.remove('flash-error'), 600);
      break;

    case 'bounce':
      element.classList.add('animate-bounce-soft');
      setTimeout(() => element.classList.remove('animate-bounce-soft'), 1000);
      break;
  }
};

/**
 * Hook for button press feedback
 */
export const useHapticFeedback = () => {
  const pulse = (e: React.MouseEvent<HTMLElement>) => {
    triggerFeedback(e.currentTarget, 'pulse');
  };

  const shake = (e: React.MouseEvent<HTMLElement>) => {
    triggerFeedback(e.currentTarget, 'shake');
  };

  const success = (e: React.MouseEvent<HTMLElement>) => {
    triggerFeedback(e.currentTarget, 'success');
  };

  const error = (e: React.MouseEvent<HTMLElement>) => {
    triggerFeedback(e.currentTarget, 'error');
  };

  return { pulse, shake, success, error };
};

/**
 * React Hook for triggering feedback on ref
 */
export const useFeedbackRef = () => {
  const trigger = (type: FeedbackType) => {
    return (element: HTMLElement | null) => {
      triggerFeedback(element, type);
    };
  };

  return { trigger };
};
