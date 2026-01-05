// app/dashboard/[warehouseId]/history/page.tsx
import React from 'react';
import { getHistory } from '@/actions/history-actions';
import { History, ArrowRight, ArrowLeft, RefreshCw, User } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function HistoryPage({ params }: { params: { warehouseId: string } }) {
  // ดึงข้อมูลจาก Server Action
  const logs = await getHistory(params['warehouseId'], 50);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <History className="text-indigo-600" />
            ประวัติการทำรายการ (Audit Log)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            แสดงความเคลื่อนไหวล่าสุดของคลัง:{' '}
            <span className="font-bold text-indigo-600">{params['warehouseId']}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Transactions
          </div>
          <div className="text-3xl font-black text-slate-800">{logs.length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table data-stack="true" className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Date/Time</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Product Detail</th>
                <th className="px-6 py-4 text-center">Qty</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                        <History size={24} className="opacity-30" />
                      </div>
                      <p>ยังไม่มีรายการบันทึกในระบบ</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      <div className="font-medium text-slate-700">
                        {format(new Date(log.date), 'dd MMM yyyy', { locale: th })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {format(new Date(log.date), 'HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          log.type === 'INBOUND'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : log.type === 'OUTBOUND'
                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                            : 'bg-orange-50 text-orange-600 border-orange-100'
                        }`}
                      >
                        {log.type === 'INBOUND' && <ArrowRight size={10} />}
                        {log.type === 'OUTBOUND' && <ArrowLeft size={10} />}
                        {log.type === 'TRANSFER' && <RefreshCw size={10} />}
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700">{log.product}</div>
                      <div className="font-mono text-xs text-slate-400 bg-slate-100 inline-block px-1 rounded mt-1">
                        {log.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-800 text-base">
                        {Number(log.quantity).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">{log.uom}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400">{log.from}</span>
                        <ArrowRight size={12} className="text-slate-300" />
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-1 rounded">
                          {log.to}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={12} />
                        </div>
                        <span
                          className="text-xs text-slate-600 truncate max-w-[100px]"
                          title={log.user}
                        >
                          {log.user.split('@')[0]}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
