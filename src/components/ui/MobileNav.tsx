'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Menu,
  X,
  Package,
  LogOut,
  ChevronRight,
  UserCircle,
  Warehouse,
  Sparkles,
} from 'lucide-react';
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
      {/* Navbar - Glass morphism style */}
      <div className="glass-dark px-4 py-3.5 flex items-center justify-between safe-area-top">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
              <Package size={20} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-success rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">{APP_CONFIG.name}</span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">v{APP_CONFIG.version}</span>
          </div>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="p-2.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay with blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer - Modern sliding panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-[85%] max-w-[340px] bg-slate-900 border-l border-white/10 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out transform',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h2 className="font-bold text-white text-lg">เมนู</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="ปิดเมนู"
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* User Profile Card */}
          {user && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl p-4 border border-white/10 shadow-lg">
              <div className="flex items-center gap-3.5 mb-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
                    isAdmin
                      ? 'bg-gradient-to-br from-primary to-blue-600 text-white'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                  )}
                >
                  <UserCircle size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{user.email}</div>
                  <div
                    className={cn(
                      'text-xs font-bold uppercase tracking-wide mt-0.5',
                      isAdmin ? 'text-primary' : 'text-emerald-400',
                    )}
                  >
                    {user.role}
                  </div>
                </div>
              </div>

              {!isAdmin && (
                <div className="flex items-center gap-2.5 text-sm text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
                  <Warehouse size={16} className="text-slate-500 flex-shrink-0" />
                  <span>
                    สิทธิ์เข้าถึง:{' '}
                    <span className="font-bold text-white">
                      {user.allowed_warehouses?.length || 0}
                    </span>{' '}
                    คลังสินค้า
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <div className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              เมนูนำทาง
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
                      ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                        isActive ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10',
                      )}
                    >
                      <item.icon size={18} />
                    </div>
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
        <div className="p-4 border-t border-white/10 bg-slate-900/80 backdrop-blur-sm">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2.5 w-full p-3.5 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30 rounded-xl font-semibold transition-all shadow-sm active:scale-[0.98]"
            >
              <LogOut size={18} />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
