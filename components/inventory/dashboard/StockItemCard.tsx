'use client';

import React from 'react';
import { StockWithDetails } from '@/types/inventory';
import { InventoryCheckbox } from './InventoryCheckbox';

interface StockItemCardProps {
  item: StockWithDetails;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const StockItemCard = ({ item, isSelected, onToggle }: StockItemCardProps) => {
  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all 
        ${isSelected 
          ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
          : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'
        }`}
    >
       <InventoryCheckbox checked={isSelected} onClick={() => onToggle(item.id)} className="shrink-0" />
       <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-500 truncate">{item.products.sku}</div>
          <div className="text-sm font-bold text-slate-800 truncate">{item.products.name}</div>
          <div className="text-xs text-slate-400 mt-1">
             Qty: <span className="text-indigo-600 font-bold">{item.quantity}</span> {item.products.uom}
          </div>
       </div>
    </div>
  );
};