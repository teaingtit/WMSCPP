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
  ChevronDown,
} from 'lucide-react';
import { MENU_ITEMS, APP_CONFIG } from '@/lib/constants';
import { logout } from '@/actions/auth-actions';
import { useUser } from '@/components/providers/UserProvider';
import { cn } from '@/lib/utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// Simple Dropdown Component
function NavDropdown({
  title,
  icon: Icon,
  children,
  isActive,
}: {
  title: string;
  icon: any;
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
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive || isOpen
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <Icon size={18} />
        <span>{title}</span>
        <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
          {children}
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
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/20 text-primary-foreground'
            : 'text-slate-400 hover:bg-white/5 hover:text-white',
        )}
      >
        <item.icon size={16} />
        <span>{item.title}</span>
      </Link>
    );
  };

  return (
    <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10 hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-40 shadow-sm">
      {/* Left: Brand & Main Nav */}
      <div className="flex items-center gap-8">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="bg-primary p-1.5 rounded-lg shadow-sm shadow-primary/20 group-hover:scale-110 transition-transform">
            <Package size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg tracking-tight leading-none">
              {APP_CONFIG.name}
            </h1>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {/* General */}
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === '/dashboard'
                ? 'bg-white/10 text-white'
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
                  } as any),
              )}
              {MENU_ITEMS.filter((m) => ['/audit', '/history'].includes(m.matchPath)).map((m) =>
                renderLink(m),
              )}
            </NavDropdown>
          )}

          {/* System */}
          {isAdmin && (
            <Link
              href="/dashboard/settings"
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname.includes('/settings')
                  ? 'bg-white/10 text-white'
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
            <div className="text-right hidden lg:block">
              <div className="text-sm font-bold text-slate-200">{user.email.split('@')[0]}</div>
              <div className="text-[10px] text-slate-400 font-mono uppercase">{user.role}</div>
            </div>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 shadow-sm ${
                isAdmin
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isAdmin ? <Shield size={16} /> : <UserCircle size={18} />}
            </div>
          </div>
        )}

        <form action={logout}>
          <button
            type="submit"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </header>
  );
}
