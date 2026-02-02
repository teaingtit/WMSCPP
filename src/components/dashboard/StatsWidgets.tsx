'use client';

import {
  Package,
  ArrowRightLeft,
  ClipboardList,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import Link from 'next/link';

// --- Active Audit Sessions List ---
export function ActiveAuditList({
  sessions,
  warehouseId,
}: {
  sessions: any[];
  warehouseId: string;
}) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-6 shadow-sm relative overflow-hidden group">
      <h3 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4 relative z-10">
        <ClipboardList size={20} className="text-amber-400" />
        กำลังดำเนินการนับสต็อก (Audits)
      </h3>
      <div className="space-y-3 relative z-10">
        {sessions.map((session) => (
          <Link
            key={session.id}
            href={`/dashboard/${warehouseId}/audit/${session.id}`}
            className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 hover:bg-slate-700 hover:border-amber-500/50 transition-all flex justify-between items-center group/item"
          >
            <div>
              <div className="font-bold text-slate-200 text-sm group-hover/item:text-amber-400 transition-colors">
                {session.name}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                <Clock size={12} className="text-slate-400" />
                <span className="opacity-80">
                  เริ่มเมื่อ:{' '}
                  {format(new Date(session.created_at), 'dd MMM yyyy HH:mm', { locale: th })}
                </span>
              </div>
            </div>
            <div className="bg-amber-900/30 text-amber-400 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 border border-amber-800/50 group-hover/item:bg-amber-900/50 transition-all">
              นับต่อ <ArrowRightLeft size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- Dairy Activity Feed ---
export function DairyActivityFeed({ logs }: { logs: any[] }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm overflow-hidden flex flex-col h-full relative">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center relative z-10">
        <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm">
          <Clock size={18} className="text-blue-400" />
          รายการเคลื่อนไหวล่าสุด
        </h3>
        <span className="text-xs font-bold bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-800">
          ล่าสุด
        </span>
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 p-4 relative z-10">
        {logs.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs gap-3 opacity-70">
            <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center border border-slate-700">
              <Package size={20} className="text-slate-400" />
            </div>
            ยังไม่มีรายการเคลื่อนไหว
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-700/30 border border-slate-700 rounded-xl flex items-center gap-4 hover:bg-slate-700/50 transition-all group"
              >
                {/* Icon Box 3D Effect */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-white/5 ${
                    log.type === 'INBOUND'
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : log.type === 'OUTBOUND'
                      ? 'bg-rose-900/50 text-rose-400'
                      : 'bg-blue-900/50 text-blue-400'
                  }`}
                >
                  {log.type === 'INBOUND' ? (
                    <ArrowDownLeft size={18} />
                  ) : log.type === 'OUTBOUND' ? (
                    <ArrowUpRight size={18} />
                  ) : (
                    <ArrowRightLeft size={18} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-200 text-sm truncate pr-2 group-hover:text-blue-400 transition-colors">
                      {log.products?.name || 'ไม่ระบุสินค้า'}
                    </h4>
                    <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap bg-slate-900/50 px-2 py-0.5 rounded-full">
                      {format(new Date(log.created_at), 'HH:mm', { locale: th })}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mt-2">
                    <div className="text-xs text-slate-400">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono mr-2 border border-slate-600">
                        {log.type === 'INBOUND' ? log.to_location?.code : log.from_location?.code}
                      </span>
                      <span className="text-xs text-slate-500">{log.products?.sku}</span>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        log.type === 'INBOUND'
                          ? 'text-emerald-400'
                          : log.type === 'OUTBOUND'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      {log.type === 'OUTBOUND' ? '-' : '+'}
                      {Number(log.quantity).toLocaleString()}{' '}
                      <span className="text-xs font-medium text-slate-600">
                        {log.products?.uom}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
