'use client';

import React from 'react';
import { HistoryEntry, TransactionEntry, SystemLogEntry } from '@/types/history';
import { format } from 'date-fns';
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  GitCommit,
  Settings,
  FileText,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatAttributeKey, formatAttributeValue } from '@/lib/utils';

interface TerminalLogViewProps {
  logs: HistoryEntry[];
}

export default function TerminalLogView({ logs }: TerminalLogViewProps) {
  const params = useParams();
  const warehouseId = params['warehouseId'] as string;

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <FileText size={32} className="mb-3 opacity-50" />
        <p>No system logs found for this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl overflow-hidden font-mono text-sm shadow-xl border border-slate-700">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
          </div>
          <span className="ml-3 text-xs text-slate-400 font-sans font-medium">
            System Activity Log
          </span>
        </div>
        <div className="text-[10px] text-slate-500">Live View</div>
      </div>

      <div className="p-4 space-y-3 max-h-[800px] overflow-y-auto custom-scrollbar">
        {logs.map((log) => (
          <div
            key={log.id}
            className="group flex items-start gap-3 hover:bg-slate-800/50 p-2 rounded transition-colors border-l-2 border-transparent hover:border-indigo-500"
          >
            {/* Timestamp */}
            <div className="shrink-0 w-32 text-slate-500 text-[11px] pt-1">
              {format(new Date(log.date), 'MM/dd HH:mm:ss')}
            </div>

            {/* Icon */}
            <div className="shrink-0 pt-0.5">{getIcon(log)}</div>

            {/* Content */}
            <div className="flex-1">
              {log.category === 'TRANSACTION' ? (
                <TransactionLine entry={log as TransactionEntry} warehouseId={warehouseId} />
              ) : (
                <SystemLine entry={log as SystemLogEntry} />
              )}
            </div>

            {/* User */}
            <div className="shrink-0 text-xs text-slate-500 flex items-center gap-1.5 pt-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <User size={10} />
              {log.user.split('@')[0]}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 text-slate-600 pt-4 animate-pulse">
          <span className="text-emerald-500">➜</span>
          <span className="w-2 h-4 bg-slate-600 block"></span>
        </div>
      </div>
    </div>
  );
}

function getIcon(log: HistoryEntry) {
  if (log.category === 'TRANSACTION') {
    const t = log.type;
    if (t === 'INBOUND') return <ArrowRight size={14} className="text-emerald-400" />;
    if (t === 'OUTBOUND') return <ArrowLeft size={14} className="text-rose-400" />;
    if (t.includes('TRANSFER')) return <RefreshCw size={14} className="text-orange-400" />;
    return <GitCommit size={14} className="text-blue-400" />;
  }
  return <Settings size={14} className="text-purple-400" />;
}

function TransactionLine({ entry, warehouseId }: { entry: TransactionEntry; warehouseId: string }) {
  // Safe link to inventory search
  const productLink = `/dashboard/${warehouseId}/inventory?search=${entry.sku}`;
  const hasAttributes = entry.attributes && Object.keys(entry.attributes).length > 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`uppercase font-bold text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(
              entry.type,
            )}`}
          >
            {entry.type}
          </span>
          <Link
            href={productLink}
            className="text-slate-300 font-semibold hover:text-indigo-400 hover:underline decoration-dashed decoration-indigo-500/50 underline-offset-4"
          >
            {entry.product}
          </Link>
          <span className="text-slate-500 text-xs">({entry.sku})</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span className="text-white font-bold">
            {entry.quantity} {entry.uom}
          </span>
          <span>from</span>
          <span className="text-indigo-300">{entry.from}</span>
          <span>to</span>
          <span className="text-emerald-300">{entry.to}</span>
        </div>

        {entry.details && entry.details !== entry.from && entry.details !== entry.to && (
          <span className="text-slate-600 text-[10px] italic">"{entry.details}"</span>
        )}
      </div>

      {hasAttributes && (
        <div className="flex flex-wrap gap-2 pl-1">
          {Object.entries(entry.attributes || {}).map(([key, value]) => (
            <span
              key={key}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
            >
              <span className="text-slate-500 mr-1">{formatAttributeKey(key)}:</span>
              <span className="text-amber-200/80">{formatAttributeValue(value)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemLine({ entry }: { entry: SystemLogEntry }) {
  // If entity type is location, link to settings


  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          {entry.type}
        </span>
        <span className="text-purple-200 font-medium">{entry.entityName}</span>
        <span className="text-slate-500 text-xs">({entry.entityType})</span>
      </div>
      <div className="text-xs text-slate-400 pl-1 border-l-2 border-slate-700 ml-1">
        {entry.action}:{' '}
        <span className="text-rose-300 line-through mr-1 opacity-70">{entry.oldValue}</span>{' '}
        <ArrowRight size={10} className="inline mx-1" />{' '}
        <span className="text-emerald-300 font-bold">{entry.newValue}</span>
        {entry.reason && <span className="ml-2 text-slate-500">Note: {entry.reason}</span>}
      </div>
    </div>
  );
}

function getTypeColor(type: string) {
  if (type === 'INBOUND') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (type === 'OUTBOUND') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  if (type.includes('TRANSFER'))
    return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
  return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
}
