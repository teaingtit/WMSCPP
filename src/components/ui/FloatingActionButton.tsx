'use client';

import { Plus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type FABVariant = 'primary' | 'success' | 'warning' | 'destructive';

interface FABProps {
  onClick: () => void;
  label: string;
  icon?: LucideIcon;
  variant?: FABVariant;
  badge?: number;
  disabled?: boolean;
}

const variantStyles: Record<FABVariant, string> = {
  primary:
    'bg-gradient-to-br from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-primary/30',
  success:
    'bg-gradient-to-br from-success to-emerald-600 hover:from-success/90 hover:to-emerald-600/90 shadow-success/30',
  warning:
    'bg-gradient-to-br from-warning to-orange-600 hover:from-warning/90 hover:to-orange-600/90 shadow-warning/30',
  destructive:
    'bg-gradient-to-br from-destructive to-red-700 hover:from-destructive/90 hover:to-red-700/90 shadow-destructive/30',
};

/**
 * FloatingActionButton (FAB) - Mobile-First primary action button
 *
 * Features:
 * - Fixed position in bottom-right corner
 * - Positioned above bottom navigation (bottom-24 md:bottom-8)
 * - Gradient backgrounds with variants
 * - Optional badge for notifications
 * - Smooth scale animations
 *
 * Usage:
 * ```tsx
 * <FloatingActionButton
 *   onClick={() => handleAdd()}
 *   label="เพิ่มสินค้า"
 *   icon={Plus}
 *   variant="primary"
 * />
 * ```
 */
export default function FloatingActionButton({
  onClick,
  label,
  icon: Icon = Plus,
  variant = 'primary',
  badge,
  disabled = false,
}: FABProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles
        'fixed right-5 bottom-24 md:bottom-8 z-40',
        'w-14 h-14 rounded-2xl',
        'flex items-center justify-center',
        'text-white font-semibold',
        'shadow-lg transition-all duration-200 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ring-offset-2 ring-offset-background',
        'touch-manipulation',
        // Variant colors
        variantStyles[variant],
        // Interactive states
        !disabled && 'hover:scale-110 active:scale-95',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={label}
      aria-disabled={disabled ? 'true' : 'false'}
    >
      <Icon className="w-6 h-6" strokeWidth={2.5} />

      {/* Badge for notifications */}
      {badge !== undefined && badge > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center px-1 shadow-md">
          {badge > 99 ? '99+' : badge}
        </div>
      )}
    </button>
  );
}
