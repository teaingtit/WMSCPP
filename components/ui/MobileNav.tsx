'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Menu, X, Package, LogOut, ChevronRight, UserCircle, Warehouse } from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const user = useUser();
  const params = useParams();
  const isAdmin = user?.role === 'admin';
  const warehouseId = params?.['warehouseId'] as string;

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden sticky top-0 z-50">
      {/* Navbar */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20">
            <Package size={20} className="text-primary-foreground" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">{APP_CONFIG.name}</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -mr-2 text-slate-400 hover:bg-white/10 rounded-full transition-colors active:bg-white/20"
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-[85%] max-w-[320px] bg-slate-900 border-l border-white/10 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900">
          <h2 className="font-bold text-white text-lg">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* User Profile */}
          {user && (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm ${
                    isAdmin
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <UserCircle size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-200 truncate text-sm">{user.email}</div>
                  <div className="text-xs text-slate-400 font-mono uppercase bg-white/10 inline-block px-1.5 py-0.5 rounded border border-white/5 mt-1">
                    {user.role}
                  </div>
                </div>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 p-2 rounded-xl border border-white/5">
                  <Warehouse size={14} className="text-slate-500" />
                  <span>
                    Access:{' '}
                    <span className="font-bold text-slate-300">
                      {user.allowed_warehouses?.length || 0}
                    </span>{' '}
                    Warehouses
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Applications
            </div>
            {MENU_ITEMS.filter((m) => !m.hidden).map((item) => {
              // Security & Logic Filters
              if (item.href.includes('/settings') && !isAdmin) return null;
              if (item.href.includes('[warehouseId]') && !warehouseId) return null;

              const realHref = item.href.replace('[warehouseId]', warehouseId || '');
              const isActive = item.exact ? pathname === realHref : pathname.startsWith(realHref);

              return (
                <Link
                  key={item.href}
                  href={realHref}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center justify-between p-3.5 rounded-xl text-sm font-medium transition-all duration-200 group active:scale-[0.98]',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white active:bg-white/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={20}
                      className={
                        isActive
                          ? 'text-primary-foreground/90'
                          : 'text-slate-500 group-hover:text-primary'
                      }
                    />
                    <span>{item.title}</span>
                  </div>
                  {!isActive && (
                    <ChevronRight
                      size={16}
                      className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full p-3.5 text-rose-400 bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
