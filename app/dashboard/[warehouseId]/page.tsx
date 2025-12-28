// app/dashboard/[warehouseId]/page.tsx
import React from 'react';
import Link from 'next/link';
import { Package, LogOut, ArrowDownToLine, ArrowRightLeft } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard-actions';
import { SummaryCards, ActivityFeed } from '@/components/dashboard/StatsWidgets';

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

      {/* --- Section 2: Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-bold text-slate-800 text-lg">เมนูลัด (Quick Actions)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
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

                {/* 3. Transfer Card (New!) */}
                <Link href={`/dashboard/${params.warehouseId}/transfer`} className="group md:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-orange-300 group-hover:shadow-lg flex items-center gap-6">
                        <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-100 transition-colors">
                            <ArrowRightLeft size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">ย้ายสินค้าภายใน (Internal Transfer)</h3>
                            <p className="text-slate-400 text-sm">ย้ายตำแหน่งจัดเก็บ (Lot to Lot) / จัดระเบียบคลังสินค้า</p>
                        </div>
                    </div>
                </Link>

                {/* 4. Inventory Card (Full Width) */}
                <Link href={`/dashboard/${params.warehouseId}/inventory`} className="group md:col-span-2">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm transition-all transform group-hover:border-indigo-300 group-hover:shadow-lg flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <Package size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">สินค้าคงคลัง (Stock)</h3>
                            </div>
                            <p className="text-slate-400 text-sm">ตรวจสอบรายการสต็อก / Batch / วันหมดอายุ</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-slate-800">{stats.totalItems}</span>
                            <div className="text-xs font-bold text-slate-400 uppercase">Items</div>
                        </div>
                    </div>
                </Link>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div>
             <ActivityFeed logs={stats.recentLogs} />
          </div>

      </div>
    </div>
  );
}