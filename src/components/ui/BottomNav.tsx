'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import React from 'react';
import { Package, LayoutGrid, ClipboardCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const warehouseId = params?.['warehouseId'] as string | undefined;

  // Only show BottomNav on dashboard routes
  if (!pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Define items based on whether we have a warehouseId
  const items = warehouseId
    ? [
        {
          title: 'เลือกคลังสินค้า',
          href: '/dashboard',
          icon: LayoutGrid,
        },
        {
          title: 'สต็อกสินค้า (Inventory)',
          href: `/dashboard/${warehouseId}/inventory`,
          icon: Package,
        },
        {
          title: 'Stock Audit',
          href: `/dashboard/${warehouseId}/audit`,
          icon: ClipboardCheck,
        },
        {
          title: 'ตั้งค่าระบบ',
          href: '/dashboard/settings',
          icon: Settings,
        },
      ]
    : [
        {
          title: 'เลือกคลังสินค้า',
          href: '/dashboard',
          icon: LayoutGrid,
        },
        {
          title: 'ตั้งค่าระบบ',
          href: '/dashboard/settings',
          icon: Settings,
        },
      ];

  return (
    <nav
      role="navigation"
      aria-label="เมนูนำทางหลัก"
      className="fixed inset-x-0 bottom-0 z-50 glass border-t border-border/50 md:hidden safe-area-bottom"
    >
      <div className="max-w-lg mx-auto px-1">
        <div className="flex items-center justify-around h-14">
          {items.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.title}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-0.5 w-6 h-0.5 bg-primary rounded-full" />
                )}

                <div
                  className={cn(
                    'p-1 rounded-lg transition-all duration-200',
                    isActive ? 'bg-primary/10' : '',
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={cn(
                    'text-[9px] font-medium mt-0.5 transition-colors leading-tight',
                    isActive ? 'text-primary font-semibold' : '',
                  )}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
