'use client';

import { History, Trash2, Package } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { StatusChangeLog } from '@/types/status';

interface HistoryTabProps {
  history: StatusChangeLog[];
}

export default function HistoryTab({ history }: HistoryTabProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <History size={32} className="mx-auto mb-2 opacity-50" />
        <p>No status changes recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((log, index) => {
        const isRemoval = !log.to_status;
        const isPartialChange = log.from_status_id === log.to_status_id && log.affected_quantity;

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold ${
                isRemoval
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {isRemoval ? <Trash2 size={14} /> : history.length - index}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {log.from_status && (
                  <>
                    <StatusBadge status={log.from_status} size="sm" />
                    <span className="text-slate-400">→</span>
                  </>
                )}
                {log.to_status ? (
                  <StatusBadge status={log.to_status} size="sm" />
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
                    Removed
                  </span>
                )}
              </div>

              {/* Show affected quantity info */}
              {(log.affected_quantity || log.total_quantity) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Package size={12} />
                  {isPartialChange ? (
                    <span>
                      Qty changed: <span className="font-medium">{log.affected_quantity}</span>
                      {log.total_quantity && <> of {log.total_quantity}</>}
                    </span>
                  ) : (
                    <span>
                      Qty: <span className="font-medium">{log.affected_quantity}</span>
                    </span>
                  )}
                </div>
              )}

              {log.reason && <p className="text-xs text-slate-600 mt-1 italic">"{log.reason}"</p>}
              <div className="text-[10px] text-slate-400 mt-1">
                {new Date(log.changed_at).toLocaleString('th-TH')} •{' '}
                {log.changed_by_user?.email ||
                  log.changed_by_user?.full_name?.trim() ||
                  [log.changed_by_user?.first_name, log.changed_by_user?.last_name]
                    .filter(Boolean)
                    .join(' ') ||
                  'Unknown'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
