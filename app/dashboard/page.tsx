// app/dashboard/page.tsx
import React from 'react';
import Link from 'next/link';
import { getDashboardWarehouses } from '@/actions/dashboard-actions'; // ✅ ใช้ Action ใหม่ที่กรองสิทธิ์แล้ว
import { Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth-service';

export default async function DashboardPage() {
  // ดึงข้อมูล User และ Warehouses
  const user = await getCurrentUser();
  const warehouses = await getDashboardWarehouses();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 mb-10 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
         <div className="relative z-10">
             <h1 className="text-3xl font-bold mb-2">ยินดีต้อนรับกลับ, {user?.email}</h1>
             <p className="text-indigo-100 opacity-90 font-medium">
                {user?.role === 'admin' 
                    ? 'Administrator Mode: ควบคุมดูแลระบบทั้งหมด' 
                    : 'Staff Mode: จัดการคลังสินค้าที่คุณได้รับมอบหมาย'}
             </p>
         </div>
         {/* Decoration */}
         <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-indigo-400 opacity-20 rounded-full blur-2xl"></div>
      </div>

      <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-indigo-600"/> 
              คลังสินค้าของคุณ ({warehouses.length})
          </h2>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <Link 
            key={wh.id} 
            href={`/dashboard/${wh.code}`} 
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden block"
          >
             <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                     <Building2 size={24} />
                 </div>
                 {wh.is_active && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100">
                        <ShieldCheck size={12}/> Online
                    </span>
                 )}
             </div>
             
             <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                 {wh.name}
             </h3>
             <p className="text-sm text-slate-400 font-mono mb-6 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">
                {wh.code}
             </p>
             
             <div className="flex items-center text-sm font-bold text-indigo-600 gap-2 group-hover:translate-x-1 transition-transform">
                 เข้าสู่ระบบจัดการ <ArrowRight size={16}/>
             </div>
          </Link>
        ))}

        {/* Empty State กรณีไม่มีคลัง */}
        {warehouses.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <ShieldCheck size={32}/>
                </div>
                <h3 className="text-lg font-bold text-slate-700">ไม่มีคลังสินค้าที่ได้รับมอบหมาย</h3>
                <p className="text-slate-500 text-sm mt-1">
                    คุณยังไม่มีสิทธิ์เข้าถึงคลังสินค้าใดๆ โปรดติดต่อ Admin เพื่อขอสิทธิ์
                </p>
            </div>
        )}
      </div>
    </div>
  );
}