import React from 'react';
import Link from 'next/link';
import { Package, LogOut, ArrowDownToLine, BarChart3 } from 'lucide-react';

export default function WarehouseOverview({ params }: { params: { warehouseId: string } }) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
         <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Overview</h1>
         <p className="text-slate-500 font-medium">จัดการคลังสินค้า: {params.warehouseId}</p>
      </div>
      
      {/* Quick Actions Menu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Inbound */}
        <Link href={`/dashboard/${params.warehouseId}/inbound`} className="group">
            <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 transition-all transform group-hover:scale-105 group-hover:shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                        <ArrowDownToLine size={32} />
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">INBOUND</span>
                </div>
                <h3 className="text-2xl font-bold mb-1">รับสินค้าเข้า</h3>
                <p className="text-indigo-200 text-sm">บันทึกสินค้าใหม่ / สแกนรับของ</p>
            </div>
        </Link>

        {/* Card 2: Inventory */}
        <Link href={`/dashboard/${params.warehouseId}/inventory`} className="group">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-indigo-300 group-hover:shadow-xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Package size={32} />
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">STOCK</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">สินค้าคงคลัง</h3>
                <p className="text-slate-400 text-sm">ตรวจสอบยอด / ดูรายละเอียด Lot</p>
            </div>
        </Link>

        {/* Card 3: Outbound */}
        <Link href={`/dashboard/${params.warehouseId}/outbound`} className="group">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-rose-300 group-hover:shadow-xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors">
                        <LogOut size={32} />
                    </div>
                    <span className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full">OUTBOUND</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">เบิกจ่ายสินค้า</h3>
                <p className="text-slate-400 text-sm">ตัดสต็อก / ย้ายของ / เบิกใช้งาน</p>
            </div>
        </Link>

      </div>

      {/* Stats Widget (Mockup) */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-end">
             <div>
                <h4 className="text-slate-400 font-bold mb-2 flex items-center gap-2"><BarChart3 size={18}/> Activity Log</h4>
                <div className="text-4xl font-black">Ready to use</div>
                <p className="text-slate-500 mt-1">ระบบพร้อมสำหรับการทำรายการ Transaction แรกของคุณ</p>
             </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20"></div>
      </div>
    </div>
  );
}