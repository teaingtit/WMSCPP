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
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-slate-900/90 backdrop-blur-sm border-t border-white/10 lg:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {items.map((item) => {
            const realHref = item.href.replace('[warehouseId]', warehouseId || '');
            const isActive = pathname?.startsWith(realHref);
            const Icon = item.icon || LayoutGrid;
            return (
              <Link
                key={item.href}
                href={realHref}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-1 text-xs font-medium transition-colors',
                  isActive ? 'text-primary-foreground' : 'text-slate-300',
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-primary-foreground' : 'text-slate-400'}
                />
                <span className="mt-0.5">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
