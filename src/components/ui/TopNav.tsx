'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  LogOut,
  Package,
  UserCircle,
  Shield,
  LayoutGrid,
  Settings,
  ClipboardList,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider';
import { cn } from '@/lib/utils';

// Modern Dropdown Component with glass morphism
function NavDropdown({
  title,
  icon: Icon,
  children,
  isActive,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive || isOpen
            ? 'bg-white/10 text-white shadow-sm'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <Icon size={18} />
        <span>{title}</span>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 glass-dark rounded-2xl shadow-2xl p-2 z-50 animate-scale-in">
          <div className="space-y-1">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const params = useParams();
  const user = useUser();

  const isAdmin = user?.role === 'admin';
  const warehouseId = params?.['warehouseId'] as string;

  const renderLink = (item: (typeof MENU_ITEMS)[0], onClick?: () => void) => {
    if (item.href.includes('/settings') && !isAdmin) return null;
    if (item.href.includes('[warehouseId]') && !warehouseId) return null;

    const realHref = item.href.replace('[warehouseId]', warehouseId || '');
    const isActive = item.exact ? pathname === realHref : pathname.includes(item.matchPath);

    return (
      <Link
        key={item.href}
        href={realHref}
        onClick={onClick ?? (() => {})}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/20 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <item.icon size={16} />
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <header className="glass-dark hidden lg:flex items-center justify-between px-6 py-3 sticky top-0 z-40">
      {/* Left: Brand & Main Nav */}
      <div className="flex items-center gap-10">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2.5 rounded-xl shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">
              <Package size={22} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight leading-none flex items-center gap-2">
              {APP_CONFIG.name}
              <Sparkles size={14} className="text-primary" />
            </h1>
            <span className="text-[10px] text-slate-500 font-medium">v{APP_CONFIG.version}</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              pathname === '/dashboard'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white',
            )}
          >
            <LayoutGrid size={18} />
            <span>Dashboard</span>
          </Link>

          {/* Operations Dropdown */}
          {warehouseId && (
            <NavDropdown
              title="Operations"
              icon={ClipboardList}
              isActive={['/audit', '/history', '/inventory', '/inbound', '/outbound'].some((path) =>
                pathname.includes(path),
              )}
            >
              {renderLink(
                MENU_ITEMS.find((m) => m.matchPath === '/inventory') ||
                  ({
                    title: 'Inventory',
                    href: `/dashboard/${warehouseId}/inventory`,
                    icon: Package,
                    matchPath: '/inventory',
                  } as (typeof MENU_ITEMS)[0]),
              )}
              {MENU_ITEMS.filter((m) => ['/audit', '/history'].includes(m.matchPath)).map((m) =>
                renderLink(m),
              )}
            </NavDropdown>
          )}

          {/* System Settings */}
          {isAdmin && (
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                pathname.includes('/settings')
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <Settings size={18} />
              <span>System</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden xl:block">
              <div className="text-sm font-semibold text-white">{user.email.split('@')[0]}</div>
              <div
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wide',
                  isAdmin ? 'text-primary' : 'text-emerald-400',
                )}
              >
                {user.role}
              </div>
            </div>
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105',
                isAdmin
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
              )}
            >
              {isAdmin ? <Shield size={18} /> : <UserCircle size={20} />}
            </div>
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 active:scale-95"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
