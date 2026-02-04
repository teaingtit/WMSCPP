// components/ui/WarehouseHeader.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, UserCircle, Shield } from 'lucide-react';

interface WarehouseHeaderProps {
  warehouse: {
    name: string;
    code: string;
    is_active: boolean;
  };
  // ✅ ADD: เพิ่ม Type สำหรับ User
  user?: {
    email: string;
    role: string;
  } | null;
}

export default function WarehouseHeader({ warehouse, user }: WarehouseHeaderProps) {
  const pathname = usePathname();
  const isRoot = pathname === `/dashboard/${warehouse.code}`;
  const isAdmin = user?.role === 'admin';

  return (
    <header className="bg-card border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm min-h-[4.5rem]">
      <div className="flex items-center gap-4">
        {/* 1. ปุ่มย้อนกลับ */}
        {!isRoot && (
          <Link
            href={`/dashboard/${warehouse.code}`}
            className="p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="กลับหน้าหลักคลังสินค้า"
          >
            <ArrowLeft size={24} />
          </Link>
        )}

        {/* 2. Logo/Title */}
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-foreground leading-none mb-1">{warehouse.name}</h2>
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
              {warehouse.code}
            </span>
            <span className="text-muted-foreground/60">•</span>
            <span
              className={`flex items-center gap-1 ${
                warehouse.is_active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  warehouse.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              {warehouse.is_active ? 'Online' : 'Maintenance'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Right Side: User Profile */}
      <div className="flex items-center gap-3 pl-6 border-l border-border">
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-foreground">{user?.email || 'Guest'}</div>
          <div
            className={`text-xs font-bold uppercase tracking-wider ${
              isAdmin ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {isAdmin ? 'Administrator' : 'Staff Member'}
          </div>
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${
            isAdmin
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {isAdmin ? <Shield size={20} /> : <UserCircle size={24} />}
        </div>
      </div>
    </header>
  );
}
