// app/dashboard/page.tsx
import React from 'react';
import Link from 'next/link';
import { getWarehouses } from '@/actions/warehouse-actions';
import { Warehouse, ArrowRight, Building2, ShieldCheck, AlertOctagon } from 'lucide-react';

export default async function WarehouseSelectorPage() {
  // ดึงข้อมูลจริงจาก Database
  const warehouses = await getWarehouses();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-10">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-2 transform hover:rotate-6 transition-all duration-300">
            <Warehouse size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            WMS <span className="text-indigo-600">Pro</span> Portal
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
            เลือกระบบคลังสินค้าที่คุณต้องการเข้าใช้งาน
          </p>
        </div>

        {/* Warehouse Grid */}
        {warehouses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {warehouses.map((wh) => (
              <Link 
                key={wh.id} 
                href={`/dashboard/${wh.code}`} // Dynamic Route ไปยังคลังนั้นๆ
                className="group relative bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-bl-full -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform"></div>

                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className={`p-4 rounded-2xl ${
                    wh.code.includes('CHEM') 
                      ? 'bg-amber-100 text-amber-600' // สีส้มสำหรับคลังเคมี
                      : 'bg-indigo-50 text-indigo-600' // สีม่วงสำหรับทั่วไป
                  }`}>
                    {wh.code.includes('CHEM') ? <AlertOctagon size={28} /> : <Building2 size={28} />}
                  </div>
                  <div className="p-2.5 rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <ArrowRight size={20} />
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                    {wh.name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md tracking-wider">
                      CODE: {wh.code}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                      <ShieldCheck size={12} /> Active
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Empty State (กรณีเพิ่งเริ่มระบบ ยังไม่มีคลัง)
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
               <Building2 size={32} />
            </div>
            <p className="text-slate-400 font-medium">ไม่พบข้อมูลคลังสินค้า</p>
            <p className="text-sm text-slate-300 mt-1">กรุณาไปที่หน้า Settings เพื่อสร้างคลังสินค้าแรก</p>
            <Link href="/dashboard/settings" className="inline-block mt-6 text-indigo-600 font-bold hover:underline">
              + ไปที่หน้าตั้งค่า
            </Link>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center">
            <Link href="/dashboard/settings" className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                ต้องการเพิ่มคลังสินค้าใหม่? <span className="underline">ไปที่ตั้งค่าระบบ</span>
            </Link>
        </div>

      </div>
    </div>
  );
}