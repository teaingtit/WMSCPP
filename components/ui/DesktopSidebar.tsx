'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  LogOut,
  Package,
  UserCircle,
  Shield,
  Warehouse,
  LayoutGrid,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider';
import { SidebarAccordion } from './SidebarAccordion';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const user = useUser();

  const isAdmin = user?.role === 'admin';
  const warehouseId = params?.['warehouseId'] as string;

  // Helper to render a link
  const renderLink = (item: (typeof MENU_ITEMS)[0]) => {
    // Security Filter
    if (item.href.includes('/settings') && !isAdmin) return null;

    // Logic: ถ้า Link ต้องใช้ warehouseId แต่ยังไม่มี -> ซ่อน (หรือแสดงเป็น Disabled ถ้าต้องการ)
    if (item.href.includes('[warehouseId]') && !warehouseId) return null;

    const realHref = item.href.replace('[warehouseId]', warehouseId || '');
    const isActive = item.exact ? pathname === realHref : pathname.includes(item.matchPath);

    return (
      <Link
        key={item.href}
        href={realHref}
        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-primary-foreground'
        }`}
      >
        <item.icon
          size={18}
          className={`transition-transform duration-300 ${
            isActive ? 'scale-110' : 'group-hover:scale-110'
          }`}
        />
        <span className="relative z-10">{item.title}</span>
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        )}
      </Link>
    );
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white hidden md:flex flex-col shrink-0 h-full shadow-2xl z-50 border-r border-slate-800/50">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800/50 flex items-center gap-3 bg-slate-900/50">
        <div className="bg-primary p-2 rounded-lg shadow-lg shadow-primary/20">
          <Package size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight leading-none text-slate-100">
            {APP_CONFIG.name}
          </h1>
          <span className="text-[10px] text-slate-500 font-mono tracking-wider">ENTERPRISE</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {/* Group 1: General */}
        <SidebarAccordion title="General" icon={LayoutGrid} defaultOpen={true}>
          {MENU_ITEMS.filter((m) => m.matchPath === '/dashboard').map(renderLink)}
        </SidebarAccordion>

        {/* Group 2: Operations */}
        {warehouseId && (
          <SidebarAccordion title="Operations" icon={ClipboardList} defaultOpen={true}>
            {MENU_ITEMS.filter(
              (m) => ['/audit', '/history', '/inventory'].includes(m.matchPath) && !m.hidden,
            ).map(renderLink)}

            {/* Additional Inventory Link explicitly if not in MENU_ITEMS or hidden there */}
            <Link
              href={`/dashboard/${warehouseId}/inventory`}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                pathname.includes('/inventory')
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-primary-foreground'
              }`}
            >
              <Package size={18} />
              <span className="relative z-10">Inventory</span>
            </Link>
          </SidebarAccordion>
        )}

        {/* Group 3: System */}
        {isAdmin && (
          <SidebarAccordion title="System" icon={Settings} defaultOpen={false}>
            {MENU_ITEMS.filter((m) => m.matchPath === '/settings').map(renderLink)}
          </SidebarAccordion>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 bg-slate-900/80 border-t border-slate-800/50">
        {user && (
          <div className="bg-slate-800/40 rounded-xl p-3 mb-3 border border-slate-700/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-sm ${
                  isAdmin
                    ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                    : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {isAdmin ? <Shield size={16} /> : <UserCircle size={18} />}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-200 truncate w-28" title={user.email}>
                  {user.email.split('@')[0]}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono uppercase">
                  {user.role}
                </div>
              </div>
            </div>
            {!isAdmin && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <Warehouse size={10} />
                <span>Access: {user.allowed_warehouses?.length || 0} WH</span>
              </div>
            )}
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border border-rose-900/20 hover:border-rose-500/30"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
