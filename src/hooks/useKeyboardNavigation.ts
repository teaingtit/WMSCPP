import { useState, useCallback, useRef, useEffect } from 'react';

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  onSelect: (item: T) => void;
  isOpen: boolean;
  onClose?: () => void;
  loop?: boolean;
}

/**
 * Hook for keyboard navigation in dropdown menus and lists
 *
 * Provides arrow key navigation, Enter to select, and Escape to close.
 * Follows WCAG accessibility guidelines for keyboard interaction.
 *
 * @example
 * ```tsx
 * const { focusedIndex, handleKeyDown, containerRef } = useKeyboardNavigation({
 *   items: options,
 *   onSelect: handleSelect,
 *   isOpen: isDropdownOpen,
 *   onClose: () => setIsDropdownOpen(false),
 * });
 *
 * return (
 *   <div ref={containerRef} onKeyDown={handleKeyDown}>
 *     {options.map((option, index) => (
 *       <div
 *         key={index}
 *         className={index === focusedIndex ? 'bg-slate-100' : ''}
 *       >
 *         {option.label}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useKeyboardNavigation<T>({
  items,
  onSelect,
  isOpen,
  onClose,
  loop = true,
}: UseKeyboardNavigationOptions<T>) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset focus when menu closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (!isOpen || items.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev < items.length - 1) {
              return prev + 1;
            }
            return loop ? 0 : prev;
          });
          break;

        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev > 0) {
              return prev - 1;
            }
            return loop ? items.length - 1 : prev;
          });
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          const item = focusedIndex >= 0 ? items[focusedIndex] : undefined;
          if (item !== undefined) {
            onSelect(item);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          onClose?.();
          break;

        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;

        default:
          break;
      }
    },
    [isOpen, items, focusedIndex, onSelect, onClose, loop],
  );

  // Attach global listener when open
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      // Only handle if focused within container or no specific focus
      if (
        containerRef.current?.contains(document.activeElement) ||
        document.activeElement === document.body
      ) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, handleKeyDown]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current) {
      const focusedElement = containerRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    containerRef,
  };
}
