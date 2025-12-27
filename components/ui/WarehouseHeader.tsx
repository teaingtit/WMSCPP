// components/ui/WarehouseHeader.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, UserCircle } from 'lucide-react';

interface WarehouseHeaderProps {
  warehouse: {
    name: string;
    code: string;
    is_active: boolean;
  };
}

export default function WarehouseHeader({ warehouse }: WarehouseHeaderProps) {
  const pathname = usePathname();
  // เช็คว่าอยู่หน้า Dashboard หลักของคลังหรือไม่? (เช่น /dashboard/WH-TEST)
  // ถ้าใช่ -> ไม่โชว์ปุ่มย้อนกลับ / ถ้าไม่ใช่ (เช่นหน้า Inbound) -> โชว์
  const isRoot = pathname === `/dashboard/${warehouse.code}`;

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm h-18">
      <div className="flex items-center gap-4">
         {/* 1. ปุ่มย้อนกลับ (Show only if not on root) */}
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
            <h2 className="text-xl font-bold text-slate-800 leading-none mb-1">
              {warehouse.name}
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{warehouse.code}</span>
                <span>•</span>
                <span className={warehouse.is_active ? "text-emerald-500" : "text-rose-500"}>
                  {warehouse.is_active ? 'Online' : 'Maintenance'}
                </span>
            </div>
         </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
         <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-400">Admin User</div>
            <div className="text-xs text-slate-300">System Admin</div>
         </div>
         <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <UserCircle size={24} />
         </div>
      </div>
    </header>
  );
}