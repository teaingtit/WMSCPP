'use client';

import React from 'react';
import { ArrowRightLeft, Truck } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: 'transfer' | 'outbound') => void;
}

export const BulkActionBar = ({ selectedCount, onAction }: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-6 z-50">
       <div className="flex items-center gap-3">
          <div className="bg-indigo-500 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
            {selectedCount}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Selected Items</span>
            <span className="text-xs text-slate-400">พร้อมดำเนินการ</span>
          </div>
       </div>
       <div className="flex items-center gap-2">
          <button 
            onClick={() => onAction('transfer')} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-sm transition-colors"
          >
            <ArrowRightLeft size={16} /> Transfer
          </button>
          <button 
            onClick={() => onAction('outbound')} 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-900/50"
          >
            <Truck size={16} /> Outbound
          </button>
       </div>
    </div>
  );
};