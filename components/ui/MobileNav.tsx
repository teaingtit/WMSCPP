// components/ui/MobileNav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Menu, X, Package, LogOut } from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider'; // ✅ Import Hook


export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const user = useUser(); // ✅ ดึง User จาก Context
  const params = useParams();
  const isAdmin = user?.role === 'admin';
  const warehouseId = params?.warehouseId as string;

  return (
    <div className="md:hidden bg-slate-900 text-white sticky top-0 z-50">
      {/* Backdrop: Close menu when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
             <Package size={20} className="text-white" />
          </div>
          {APP_CONFIG.name}
        </div>
        <button onClick={() => setIsOpen(v => !v)}
        className="p-2" 
        aria-controls="mobile-nav-menu" 
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}>
  {isOpen ? <X size={24} /> : <Menu size={24} />}
</button>
      </div>

      {isOpen && (
        <nav id="mobile-nav-menu" className="absolute top-full left-0 w-full bg-slate-900 border-t border-slate-800 shadow-2xl p-4 flex flex-col gap-2 z-20">
            
            {/* User Info (Mobile) */}
            {user && (
                <div className="mb-4 pb-4 border-b border-slate-800">
                    <div className="text-sm font-bold text-white">{user.email}</div>
                    <div className="text-xs text-slate-400 uppercase font-mono mt-1">{user.role}</div>
                </div>
            )}

            {MENU_ITEMS.filter(m => !m.hidden).map((item) => {
                // ✅ Security Filter สำหรับ Mobile
                if (item.href.includes('/settings') && !isAdmin) return null;
                if (item.href.includes('[warehouseId]') && !warehouseId) return null;
                const realHref = item.href.replace('[warehouseId]', warehouseId || '');
                const isActive = item.exact ? pathname === realHref : pathname.startsWith(realHref);

                return (
                  <Link
                    key={item.href}
                    href={realHref}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.title}
                  </Link>
                );
            })}

            <form action={logout} className="mt-2 border-t border-slate-800 pt-2">
                <button type="submit" className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 font-bold">
                    <LogOut size={20} /> ออกจากระบบ
                </button>
            </form>
        </nav>
      )}
    </div>
  );
}