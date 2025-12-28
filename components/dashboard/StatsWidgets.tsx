// components/dashboard/StatsWidgets.tsx
'use client';

import React from 'react';
import { Package, AlertTriangle, ArrowRightLeft, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export function SummaryCards({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      
      {/* Card 1: Total Items (SKU) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Package size={20} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase">สินค้า (SKU)</span>
            </div>
            <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-slate-800">{stats.totalItems?.toLocaleString() || 0}</h3>
                <span className="text-sm font-medium text-slate-400 mb-1">รายการ</span>
            </div>
        </div>
      </div>

      {/* Card 2: Total Quantity (Pieces) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Layers size={20} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase">จำนวนในคลัง</span>
            </div>
            <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-slate-800">{stats.totalQty?.toLocaleString() || 0}</h3>
                <span className="text-sm font-medium text-slate-400 mb-1">ชิ้น</span>
            </div>
        </div>
      </div>

      {/* Card 3: Low Stock */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
                <span className="text-sm font-bold text-slate-500 uppercase">ใกล้หมดสต็อก</span>
            </div>
            <div className="flex items-end gap-2">
                <h3 className={`text-3xl font-black ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {stats.lowStockCount?.toLocaleString() || 0}
                </h3>
                <span className="text-sm font-medium text-slate-400 mb-1">รายการ</span>
            </div>
        </div>
      </div>

    </div>
  );
}

export function ActivityFeed({ logs }: { logs: any[] }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-indigo-600"/>
            ความเคลื่อนไหวล่าสุด
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                    <Package size={20} className="opacity-20"/>
                </div>
                ยังไม่มีรายการเคลื่อนไหว
            </div>
        ) : (
            logs.map((log) => (
                <div key={log.id} className="p-4 border-b border-slate-50 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                        log.type === 'INBOUND' ? 'bg-emerald-100 text-emerald-600' :
                        log.type === 'OUTBOUND' ? 'bg-rose-100 text-rose-600' :
                        'bg-orange-100 text-orange-600'
                    }`}>
                        {log.type === 'INBOUND' ? <Package size={18} /> : 
                         log.type === 'OUTBOUND' ? <ArrowRightLeft size={18} /> : 
                         <Layers size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                             <div className="font-bold text-slate-700 truncate pr-2 text-sm">{log.products?.name || 'Unknown Product'}</div>
                             <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                                 log.type === 'INBOUND' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                 log.type === 'OUTBOUND' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                 'bg-orange-50 text-orange-700 border-orange-100'
                             }`}>
                                {log.type}
                             </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <div className="flex items-center gap-2">
                                <span className="font-mono bg-slate-100 px-1 rounded text-slate-500">
                                    {log.type === 'INBOUND' ? log.to_location?.code : log.from_location?.code}
                                </span>
                                <span>•</span>
                                <span>{log.quantity} {log.products?.uom}</span>
                            </div>
                            <div>
                                {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: th })}
                            </div>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}