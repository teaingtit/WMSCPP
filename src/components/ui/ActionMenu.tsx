'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
  triggerClassName?: string;
  align?: 'left' | 'right';
}

/**
 * ActionMenu - Mobile-friendly action menu component
 *
 * Replaces hover-only action buttons with a tap-friendly menu.
 * Use this for edit/delete actions that were previously hidden behind hover states.
 *
 * @example
 * ```tsx
 * <ActionMenu
 *   items={[
 *     { label: 'Edit', icon: <Edit2 size={16} />, onClick: handleEdit },
 *     { label: 'Delete', icon: <Trash2 size={16} />, onClick: handleDelete, variant: 'danger' },
 *   ]}
 * />
 * ```
 */
export function ActionMenu({
  items,
  className,
  triggerClassName,
  align = 'right',
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2.5 min-w-[44px] min-h-[44px] rounded-xl',
          'flex items-center justify-center',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'active:bg-slate-200 dark:active:bg-slate-700',
          'transition-colors touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          triggerClassName,
        )}
        aria-label="เมนูการดำเนินการ"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={20} className="text-slate-600 dark:text-slate-500" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div
            className={cn(
              'absolute top-full mt-1 z-50',
              'bg-white dark:bg-slate-900 rounded-xl',
              'shadow-xl border border-slate-200 dark:border-slate-700',
              'min-w-[160px] py-1',
              'animate-scale-in origin-top-right',
              align === 'right' ? 'right-0' : 'left-0',
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm',
                  'transition-colors touch-manipulation',
                  'focus-visible:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  !item.disabled &&
                    (item.variant === 'danger'
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'),
                )}
                role="menuitem"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
