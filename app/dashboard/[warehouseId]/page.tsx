import React, { Suspense } from 'react';
import Link from 'next/link';
import { LogOut, ArrowDownToLine, ArrowRightLeft, Package, Search } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard-actions';
import {  DairyActivityFeed, ActiveAuditList } from '@/components/dashboard/StatsWidgets'; 

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse mb-6">
      <div className="h-24 bg-slate-200 rounded-xl"></div>
      <div className="h-24 bg-slate-200 rounded-xl"></div>
      <div className="h-24 bg-slate-200 rounded-xl"></div>
      <div className="h-24 bg-slate-200 rounded-xl"></div>
    </div>
  );
}

const quickActions = (warehouseId: string) => [
  { href: `/dashboard/${warehouseId}/inbound`, icon: <ArrowDownToLine size={24} />, tag: 'INBOUND', title: 'รับสินค้าเข้า', description: 'บันทึกสินค้าใหม่ / สแกนรับของ', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  { href: `/dashboard/${warehouseId}/outbound`, icon: <LogOut size={24} />, tag: 'OUTBOUND', title: 'เบิกจ่ายสินค้า', description: 'ตัดสต็อก / เบิกใช้งาน', color: 'bg-rose-500', textColor: 'text-rose-600' },
  { href: `/dashboard/${warehouseId}/transfer`, icon: <ArrowRightLeft size={24} />, tag: 'TRANSFER', title: 'ย้ายตำแหน่ง', description: 'ย้ายตำแหน่งภายในคลัง', color: 'bg-blue-500', textColor: 'text-blue-600' },
];

export default async function WarehouseOverview({ params }: { params: { warehouseId: string } }) {
  const stats = await getDashboardStats(params.warehouseId);

  return (
    <div className="min-h-screen -m-4 p-4 md:p-6 space-y-6 bg-slate-100 text-slate-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
         <div>
             <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
             <p className="text-slate-500 text-xs md:text-sm font-medium flex items-center gap-1">
                Warehouse: <span className="bg-white text-slate-700 px-2 py-0.5 rounded font-mono font-bold border border-slate-200 shadow-sm">{params.warehouseId}</span>
             </p>
         </div>
         <div className="w-full md:w-auto">
             <Link href={`/dashboard/${params.warehouseId}/inventory`} className="flex items-center justify-center gap-2 w-full md:w-auto bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all">
                <Search size={16} /> ค้นหาสินค้า
             </Link>
         </div>
      </div>

      {/* Quick Actions (Top) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in [animation-delay:200ms]">
        {quickActions(params.warehouseId).map(action => (
            <Link key={action.tag} href={action.href} className="block group">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4 h-full">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${action.color}`}>
                        {action.icon}
                    </div>
                    <div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest block mb-0.5 ${action.textColor}`}>{action.tag}</span>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{action.title}</h3>
                        <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{action.description}</p>
                    </div>
                </div>
            </Link>
        ))}
          
          {/* Inventory Link as a Card */}
          <Link href={`/dashboard/${params.warehouseId}/inventory`} className="block group">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4 h-full">
                <div className="w-12 h-12 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0">
                    <Package size={24} />
                </div>
                <div className="flex-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-0.5">INVENTORY</span>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">สินค้าคงคลัง</h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">ดูรายการสต็อก ({stats.totalItems})</p>
                </div>
            </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Audits */}
          <div className="lg:col-span-2 space-y-6">
              {/* Active Audits (Priority) */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <ActiveAuditList sessions={stats.activeAudits || []} warehouseId={params.warehouseId} />
              </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="lg:col-span-1 space-y-6">
              <div className="h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-fade-in [animation-delay:400ms]">
                  <DairyActivityFeed logs={stats.recentLogs} />
              </div>
          </div>

      </div>
    </div>
  );
}