'use client';

import React from 'react';
import { Grid3X3 } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { StockItemCard } from './StockItemCard';
import { InventoryCheckbox } from './InventoryCheckbox';

interface StockPositionGroupProps {
  lot: string;
  pos: string;
  items: StockWithDetails[];
  selectedIds: Set<string>;
  onTogglePos: (lot: string, pos: string) => void;
  onToggleItem: (id: string) => void;
}

export const StockPositionGroup = ({ 
  lot, 
  pos, 
  items, 
  selectedIds, 
  onTogglePos, 
  onToggleItem 
}: StockPositionGroupProps) => {
  // Logic: ตรวจสอบว่าเลือกสินค้าครบทุกชิ้นใน Position นี้หรือไม่
  const isPosSelected = items.length > 0 && items.every(item => selectedIds.has(item.id));
  const firstItem = items[0];

  return (
    <div className="p-4 pl-12 bg-white border-b border-slate-50 last:border-none">
      {/* Header ของ Position */}
      <div className="flex items-center gap-3 mb-3">
         <InventoryCheckbox 
            checked={isPosSelected} 
            onClick={() => onTogglePos(lot, pos)} 
         />
         <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg">
             <Grid3X3 size={16} className="text-indigo-500" />
             <span className="font-bold text-indigo-700">{pos}</span> 
         </div>
         
         {firstItem && (
           <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2 font-mono">
              Code: {firstItem.locations.code}
           </span>
         )}
      </div>

      {/* Grid แสดงรายการสินค้า */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-8">
         {items.map(item => (
            <StockItemCard 
              key={item.id} 
              item={item} 
              isSelected={selectedIds.has(item.id)} 
              onToggle={onToggleItem} 
            />
         ))}
      </div>
    </div>
  );
};