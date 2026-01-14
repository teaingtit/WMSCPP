'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ClipboardCheck,
  ArrowLeftRight,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface BottomNavV2Props {
  warehouseId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'หน้าหลัก',
  },
  {
    href: '/dashboard/[wh]/inventory',
    icon: Package,
    label: 'สต็อก',
  },
  {
    href: '/dashboard/[wh]/audit',
    icon: ClipboardCheck,
    label: 'ตรวจนับ',
  },
  {
    href: '/dashboard/[wh]/transfer',
    icon: ArrowLeftRight,
    label: 'โอนย้าย',
  },
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: 'ตั้งค่า',
  },
];

export default function BottomNavV2({ warehouseId }: BottomNavV2Props) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden" aria-label="เมนูหลัก">
      {/* Backdrop Blur Layer */}
      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-neutral-200/50 dark:border-white/10 shadow-lg" />

      {/* Content Container */}
      <div className="relative max-w-lg mx-auto px-2 py-2 safe-area-bottom">
        <div className="flex items-center justify-around gap-1">
          {NAV_ITEMS.map((item) => {
            // Replace [wh] placeholder with actual warehouseId
            const href = item.href.replace('[wh]', warehouseId || '');

            // Determine if this item is active
            const isActive =
              item.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  // Base styles
                  'flex flex-col items-center justify-center gap-1',
                  'min-w-[64px] min-h-[56px] rounded-2xl',
                  'transition-all duration-200 ease-smooth',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ring-offset-2',
                  'touch-manipulation',
                  // Active state
                  isActive && 'bg-primary/10',
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                {/* Icon Container */}
                <div
                  className={cn(
                    'relative w-10 h-10 rounded-xl flex items-center justify-center',
                    'transition-all duration-200 ease-smooth',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-primary/30'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                >
                  <Icon className={cn('w-5 h-5')} strokeWidth={isActive ? 2.5 : 2} />

                  {/* Active Indicator Dot */}
                  {isActive && (
                    <div className="absolute -top-0.5 w-1 h-1 bg-white rounded-full animate-pulse-soft" />
                  )}

                  {/* Badge (optional) */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium transition-colors leading-none',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
