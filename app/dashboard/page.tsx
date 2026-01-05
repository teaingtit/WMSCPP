// app/dashboard/page.tsx
import React from 'react';
import Link from 'next/link';
import { getDashboardWarehouses } from '@/actions/dashboard-actions';
import { Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-service';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const warehouses = await getDashboardWarehouses();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden animate-fade-in border border-blue-500/30">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            ยินดีต้อนรับกลับ, {user?.email}
          </h1>
          <p className="text-blue-100 opacity-90 font-medium text-sm md:text-base">
            {user?.role === 'admin'
              ? 'Administrator Mode: ควบคุมดูแลระบบทั้งหมด'
              : 'Staff Mode: จัดการคลังสินค้าที่คุณได้รับมอบหมาย'}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-blue-400 opacity-20 rounded-full blur-2xl"></div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-bold text-slate-950 flex items-center gap-2">
          <Building2 className="text-blue-400" />
          คลังสินค้าของคุณ ({warehouses.length})
        </h2>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh, index) => (
          <Link
            key={wh.id}
            href={`/dashboard/${wh.code}`}
            className="group bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-900/20 hover:border-blue-500 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden block animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 bg-slate-700 text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm border border-slate-600 group-hover:border-blue-500">
                <Building2 size={24} />
              </div>
              {wh.is_active && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-full border border-emerald-800 shadow-sm">
                  <ShieldCheck size={12} /> Online
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-1 group-hover:text-blue-400 transition-colors relative z-10">
              {wh.name}
            </h3>
            <p className="text-sm text-slate-400 font-mono mb-6 bg-slate-900 inline-block px-2 py-0.5 rounded border border-slate-700 relative z-10">
              {wh.code}
            </p>

            <div className="flex items-center text-sm font-bold text-blue-400 gap-2 group-hover:translate-x-1 transition-transform relative z-10">
              เข้าสู่ระบบจัดการ <ArrowRight size={16} />
            </div>
          </Link>
        ))}

        {warehouses.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-800 rounded-2xl border border-dashed border-slate-700">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 border border-slate-600">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-200">ไม่มีคลังสินค้าที่ได้รับมอบหมาย</h3>
            <p className="text-slate-400 text-sm mt-1">
              คุณยังไม่มีสิทธิ์เข้าถึงคลังสินค้าใดๆ โปรดติดต่อ Admin เพื่อขอสิทธิ์
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
