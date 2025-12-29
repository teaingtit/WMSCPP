// app/dashboard/[warehouseId]/page.tsx
import React from 'react';
import Link from 'next/link';
import { Package, LogOut, ArrowDownToLine, ArrowRightLeft } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard-actions';
import { SummaryCards } from '@/components/dashboard/StatsWidgets'; 

export default async function WarehouseOverview({ params }: { params: { warehouseId: string } }) {
  // ดึงข้อมูล Real-time
  const stats = await getDashboardStats(params.warehouseId);

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div>
         <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Overview</h1>
         <p className="text-slate-500 font-medium">จัดการคลังสินค้า: <span className="text-indigo-600 font-bold">{params.warehouseId}</span></p>
      </div>

      {/* --- Section 1: Stats & Analytics --- */}
      <SummaryCards stats={stats} />

      {/* --- Section 2: Main Content (Full Width) --- */}
      <div> 
         <h3 className="font-bold text-slate-800 text-lg mb-6">เมนูลัด (Quick Actions)</h3>
         
         {/* ปรับ Grid ให้เป็น 3 Columns เต็มจอ */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Inbound Card */}
            <Link href={`/dashboard/${params.warehouseId}/inbound`} className="group">
                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 transition-all transform group-hover:scale-[1.02] group-hover:shadow-2xl h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <ArrowDownToLine size={28} />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded text-indigo-50">INBOUND</span>
                    </div>
                    <h3 className="text-xl font-bold mb-1">รับสินค้าเข้า</h3>
                    <p className="text-indigo-200 text-sm">บันทึกสินค้าใหม่ / สแกนรับของ / จัดเก็บเข้าชั้น</p>
                </div>
            </Link>

            {/* 2. Outbound Card */}
            <Link href={`/dashboard/${params.warehouseId}/outbound`} className="group">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-rose-300 group-hover:shadow-lg h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-100 transition-colors">
                            <LogOut size={28} />
                        </div>
                        <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded">OUTBOUND</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">เบิกจ่ายสินค้า</h3>
                    <p className="text-slate-400 text-sm">ตัดสต็อก / เบิกใช้งาน / ส่งออก</p>
                </div>
            </Link>

            {/* 3. Transfer Card */}
            <Link href={`/dashboard/${params.warehouseId}/transfer`} className="group">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-orange-300 group-hover:shadow-lg h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-100 transition-colors">
                            <ArrowRightLeft size={28} />
                        </div>
                        <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-2 py-1 rounded">TRANSFER</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">ย้ายสินค้า</h3>
                    <p className="text-slate-400 text-sm">ย้ายตำแหน่ง (Internal Transfer)</p>
                </div>
            </Link>

            {/* 4. Inventory Link (Full Width Bar) */}
            <Link href={`/dashboard/${params.warehouseId}/inventory`} className="group md:col-span-3">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-indigo-300 group-hover:shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <Package size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">ตรวจสอบสินค้าคงคลัง (Inventory)</h3>
                            <p className="text-slate-400 text-sm">ดูรายการสต็อกทั้งหมด / ค้นหา / กรองข้อมูล</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-right hidden sm:block">
                        <span className="block text-2xl font-black text-slate-800">{stats.totalItems}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Items</span>
                    </div>
                </div>
            </Link>
         </div>
      </div>
    </div>
  );
}