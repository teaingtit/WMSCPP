// components/ui/WarehouseHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, UserCircle, Shield, User } from 'lucide-react';

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
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm h-18">
      <div className="flex items-center gap-4">
        {/* 1. ปุ่มย้อนกลับ */}
        {!isRoot && (
          <Link
            href={`/dashboard/${warehouse.code}`}
            className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="กลับหน้าหลักคลังสินค้า"
          >
            <ArrowLeft size={24} />
          </Link>
        )}

        {/* 2. Logo/Title */}
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 leading-none mb-1">{warehouse.name}</h2>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
              {warehouse.code}
            </span>
            <span className="text-slate-300">•</span>
            <span
              className={`flex items-center gap-1 ${
                warehouse.is_active ? 'text-emerald-600' : 'text-rose-600'
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
      <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-slate-700">{user?.email || 'Guest'}</div>
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isAdmin ? 'text-purple-600' : 'text-slate-400'
            }`}
          >
            {isAdmin ? 'Administrator' : 'Staff Member'}
          </div>
        </div>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm ${
            isAdmin
              ? 'bg-purple-50 text-purple-600 border-purple-100'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}
        >
          {isAdmin ? <Shield size={20} /> : <UserCircle size={24} />}
        </div>
      </div>
    </header>
  );
}
