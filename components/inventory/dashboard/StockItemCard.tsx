'use client';

import React from 'react';
import { Layers, Package } from 'lucide-react';
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
      className={`relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 active:scale-[0.97] touch-manipulation select-none
        ${isSelected 
          ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' 
          : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md active:bg-slate-50'
        }`}
    >
       <div onClick={(e) => e.stopPropagation()} className="p-1 -m-1">
          <InventoryCheckbox checked={isSelected} onClick={() => onToggle(item.id)} className="shrink-0" />
       </div>
       
       {/* Thumbnail Image */}
       <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.product?.name || 'Product'} 
              className="h-full w-full object-cover"
            />
          ) : (
            <Package size={20} className="text-slate-300" />
          )}
       </div>

       <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="text-xs font-bold text-slate-500 truncate">{item.product?.sku || 'Unknown SKU'}</div>
            {item.level && (
               <span className="flex items-center gap-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                  <Layers size={10} /> {item.level}
               </span>
            )}
          </div>
          <div className="text-sm font-bold text-slate-800 truncate">{item.product?.name || 'Unknown Product'}</div>
          <div className="flex items-center justify-between mt-1">
             <div className="text-xs text-slate-400">
                Qty: <span className="text-indigo-600 font-bold">{item.quantity.toLocaleString()}</span> {item.product?.uom}
             </div>
          </div>
       </div>
    </div>
  );
};