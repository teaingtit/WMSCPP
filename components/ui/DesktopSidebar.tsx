'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Package, UserCircle, Shield, Warehouse } from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider'; // ✅ Import Hook

export default function DesktopSidebar() {
  const pathname = usePathname();
  const user = useUser(); // ✅ ดึงข้อมูล User จาก Context ทันที (เร็วมาก)

  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col shrink-0 h-full shadow-2xl z-50">
      
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50">
        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
           <Package size={20} className="text-white" />
        </div>
        <div>
            <h1 className="font-bold text-lg tracking-tight leading-none">{APP_CONFIG.name}</h1>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">ENTERPRISE</span>
        </div>
      </div>
      
      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Menu</div>
        
        {MENU_ITEMS.filter(m => !m.hidden).map((item) => {
          // ✅ Security Filter: ถ้าไม่ใช่ Admin ห้ามเห็นเมนู Settings เด็ดขาด
          if (item.href.includes('/settings') && !isAdmin) return null;

          const isActive = item.exact 
             ? pathname === item.href 
             : pathname.includes(item.matchPath);

          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} /> 
              <span className="relative z-10">{item.title}</span>
              {isActive && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section (The Fix) */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800">
        {user && (
            <div className="bg-slate-800/50 rounded-xl p-3 mb-3 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-sm ${isAdmin ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'}`}>
                        {isAdmin ? <Shield size={16}/> : <UserCircle size={18}/>}
                    </div>
                    <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate w-28" title={user.email}>
                            {user.email.split('@')[0]}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono uppercase">
                             {user.role}
                        </div>
                    </div>
                </div>
                
                {/* Info Badge */}
                {!isAdmin && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
                        <Warehouse size={10}/>
                        <span>Access: {user.allowed_warehouses?.length || 0} WH</span>
                    </div>
                )}
            </div>
        )}

        <form action={logout}>
          <button 
            type="submit"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-rose-900/30 hover:border-rose-500"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}