'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import React from 'react';
import { Package, LayoutGrid } from 'lucide-react';
import { MENU_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const warehouseId = params?.['warehouseId'] as string | undefined;

  const items = [
    MENU_ITEMS.find((m) => m.matchPath === '/dashboard'),
    MENU_ITEMS.find((m) => m.matchPath === '/inventory') || {
      title: 'Inventory',
      href: `/dashboard/${warehouseId || ''}/inventory`,
      icon: Package,
      matchPath: '/inventory',
    },
    MENU_ITEMS.find((m) => m.matchPath === '/audit'),
    MENU_ITEMS.find((m) => m.matchPath === '/settings'),
  ].filter(Boolean) as typeof MENU_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 glass border-t border-border/50 lg:hidden safe-area-bottom">
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const realHref = item.href.replace('[warehouseId]', warehouseId || '');
            const isActive = pathname?.startsWith(realHref);
            const Icon = item.icon || LayoutGrid;

            return (
              <Link
                key={item.href}
                href={realHref}
                className={cn(
                  'relative flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {/* Active indicator */}
                {isActive && <div className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full" />}

                <div
                  className={cn(
                    'p-1.5 rounded-xl transition-all duration-200',
                    isActive ? 'bg-primary/10' : '',
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium mt-0.5 transition-colors',
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
