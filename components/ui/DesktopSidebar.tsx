// components/ui/DesktopSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Package } from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants'; // ✅ ใช้ Constants ที่เราสร้าง
import { logout } from '@/actions/auth-actions';

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0 h-full">
      {/* 1. Logo / Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
           <Package size={20} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">{APP_CONFIG.name}</span>
      </div>
      
      {/* 2. Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {MENU_ITEMS.filter(m => !m.hidden).map((item) => {
          // Logic เช็ค Active Menu
          const isActive = item.exact 
             ? pathname === item.href 
             : pathname.includes(item.matchPath);

          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} /> 
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* 3. Logout Section */}
      <div className="p-4 border-t border-slate-800 mt-auto">
        <form action={logout}>
          <button 
            type="submit"
            className="flex items-center gap-3 w-full px-4 py-3 text-rose-400 hover:bg-rose-900/20 hover:text-rose-300 rounded-xl transition-colors font-bold"
          >
            <LogOut size={18} /> ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  );
}