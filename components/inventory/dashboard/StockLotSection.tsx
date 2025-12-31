'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { StockPositionGroup } from './StockPositionGroup';
import { InventoryCheckbox } from './InventoryCheckbox';

interface StockLotSectionProps {
  lot: string;
  positions: Record<string, StockWithDetails[]>;
  selectedIds: Set<string>;
  onToggleLot: (lot: string) => void;
  onTogglePos: (lot: string, pos: string) => void;
  onToggleItem: (id: string) => void;
}

export const StockLotSection = ({
  lot,
  positions,
  selectedIds,
  onToggleLot,
  onTogglePos,
  onToggleItem
}: StockLotSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const posKeys = Object.keys(positions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const totalItemsInLot = Object.values(positions).flat().length;
  
  const isLotSelected = (() => {
    const allItems = Object.values(positions).flat();
    return allItems.length > 0 && allItems.every(item => selectedIds.has(item.id));
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div 
        className="flex items-center gap-4 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none border-b border-slate-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button aria-label="Expand lot" className="p-1 hover:bg-slate-200 rounded-full transition-colors">
            {isExpanded ? <ChevronDown size={20} className="text-slate-500"/> : <ChevronRight size={20} className="text-slate-400"/>}
        </button>
        
        <InventoryCheckbox checked={isLotSelected} onClick={() => onToggleLot(lot)} />
        
        <div className="flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lot / Zone</div>
          <div className="font-bold text-lg text-slate-800">{lot}</div>
        </div>
        
        <div className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500">
           {totalItemsInLot} Items
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {posKeys.map(pos => (
            <StockPositionGroup
                key={pos}
                lot={lot}
                pos={pos}
                items={positions[pos] || []} // ✅ แก้ไขตรงนี้: ใส่ || [] เพื่อกัน undefined
                selectedIds={selectedIds}
                onTogglePos={onTogglePos}
                onToggleItem={onToggleItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};