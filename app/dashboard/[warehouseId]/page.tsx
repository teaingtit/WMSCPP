// app/dashboard/[warehouseId]/page.tsx
import React, { Suspense } from 'react';
import Link from 'next/link';
import { Package, LogOut, ArrowDownToLine, ArrowRightLeft } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard-actions';
import { SummaryCards } from '@/components/dashboard/StatsWidgets'; 
import { ActionCard } from '@/components/dashboard/ActionCard';

// Suggestion 2: Create a loading skeleton for the stats cards.
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
    </div>
  );
}

// Suggestion 1: Define action card data in an array for easier management.
const quickActions = (warehouseId: string) => [
  { href: `/dashboard/${warehouseId}/inbound`, icon: <ArrowDownToLine size={28} />, tag: 'INBOUND', title: 'รับสินค้าเข้า', description: 'บันทึกสินค้าใหม่ / สแกนรับของ / จัดเก็บเข้าชั้น', variant: 'primary' as const },
  { href: `/dashboard/${warehouseId}/outbound`, icon: <LogOut size={28} />, tag: 'OUTBOUND', title: 'เบิกจ่ายสินค้า', description: 'ตัดสต็อก / เบิกใช้งาน / ส่งออก', variant: 'secondary' as const },
  { href: `/dashboard/${warehouseId}/transfer`, icon: <ArrowRightLeft size={28} />, tag: 'TRANSFER', title: 'ย้ายสินค้า', description: 'ย้ายตำแหน่ง (Internal Transfer)', variant: 'secondary' as const,
    // Note: The styling for the 'Transfer' card was slightly different. 
    // For simplicity, this example reuses the 'secondary' variant. You can add more variants to ActionCard if needed.
  },
];
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
      <Suspense fallback={<StatsSkeleton />}>
        <SummaryCards stats={stats} />
      </Suspense>

      {/* --- Section 2: Main Content (Full Width) --- */}
      <div> 
         <h3 className="font-bold text-slate-800 text-lg mb-6">เมนูลัด (Quick Actions)</h3>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions(params.warehouseId).map(action => <ActionCard key={action.tag} {...action} />)}

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