// components/ui/MobileNav.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Package } from 'lucide-react';
import { logout } from '@/actions/auth-actions';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants'; // ✅ Import Constants

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <>
      <div className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Package size={20} className="text-white" />
          </div>
          <span>{APP_CONFIG.name}</span>
        </div>
        
        <button onClick={toggleMenu} className="p-2 hover:bg-slate-800 rounded-lg">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-sm md:hidden pt-20 px-6 pb-6 flex flex-col animate-in fade-in">
           <nav className="space-y-2 flex-1">
             {/* ✅ Loop สร้างเมนูอัตโนมัติ */}
             {MENU_ITEMS.filter(m => !m.hidden).map((item) => {
               const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.includes(item.matchPath);

               return (
                 <Link 
                   key={item.href}
                   href={item.href} 
                   onClick={toggleMenu}
                   className={`flex items-center gap-4 p-4 rounded-xl text-lg font-medium transition-all ${
                     isActive
                     ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                     : 'text-slate-300 hover:bg-slate-800'
                   }`}
                 >
                   <item.icon size={24} /> {item.title}
                 </Link>
               );
             })}
           </nav>

           <div className="mt-auto border-t border-slate-800 pt-6">
              <form action={logout}>
                <button type="submit" className="flex items-center gap-4 w-full p-4 text-rose-400 hover:bg-rose-900/20 rounded-xl transition-colors font-bold">
                  <LogOut size={24} /> ออกจากระบบ
                </button>
              </form>
           </div>
        </div>
      )}
    </>
  );
}