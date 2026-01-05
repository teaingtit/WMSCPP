'use client';

import React from 'react';
import { MapPin, Calendar, Hash, Layers } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';

interface InventoryCardProps {
  item: StockWithDetails;
}

export default function InventoryCard({ item }: InventoryCardProps) {
  return (
    <div className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] active:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col h-full cursor-pointer touch-manipulation select-none">
      {/* Decorative BG */}
      <div
        className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -mr-6 -mt-6 opacity-10 group-hover:opacity-20 transition-opacity ${
          item.product?.category_id === 'CHEMICAL' ? 'bg-amber-500' : 'bg-indigo-500'
        }`}
      ></div>

      {/* Header: Category & Location */}
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span
          className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${
            item.product?.category_id === 'CHEMICAL'
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-indigo-50 text-indigo-700 border-indigo-100'
          }`}
        >
          {item.product?.category_id || 'GEN'}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-800 text-white px-2 py-1 rounded">
            <MapPin size={10} /> {item.location?.code || 'N/A'}
          </span>
          {item.level && (
            <span className="flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
              <Layers size={10} /> Lv.{item.level}
            </span>
          )}
        </div>
      </div>

      {/* Content: Name & SKU */}
      <div className="mb-4 relative z-10 flex-1">
        <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
          {item.product?.name || 'Unknown Product'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
          <Hash size={12} /> {item.product?.sku || '-'}
        </div>
      </div>

      {/* Footer: Qty & Status */}
      <div className="pt-3 border-t border-slate-100 relative z-10 mt-auto">
        <div className="flex justify-between items-end">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {item.quantity.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{item.product?.uom}</span>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-slate-300 flex items-center gap-1 justify-end">
          <Calendar size={10} /> {new Date(item.updated_at).toLocaleDateString('th-TH')}
        </div>
      </div>
    </div>
  );
}
