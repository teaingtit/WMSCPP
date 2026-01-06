'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { StockPositionGroup } from './StockPositionGroup';
import { InventoryCheckbox } from './InventoryCheckbox';
import { useInventorySelection } from '@/components/inventory/InventoryDashboard'; // Import useInventorySelection

interface StockLotSectionProps {
  lot: string;
  positions: Record<string, StockWithDetails[]>;
  selectedIds: Set<string>;
  onToggleLot: (lot: string) => void;
  onTogglePos: (lot: string, pos: string) => void;
  onToggleItem: (id: string) => void;
  onToggleMultiple: (ids: string[]) => void;
  categoryFormSchemas: Record<string, any[]>;
}

export const StockLotSection = ({
  lot,
  positions,
  selectedIds,
  onToggleLot,
  onTogglePos,
  onToggleItem,
  onToggleMultiple,
}: StockLotSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { categoryFormSchemas } = useInventorySelection(); // Retrieve categoryFormSchemas from context

  const posKeys = useMemo(
    () => Object.keys(positions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [positions],
  );

  const allItems = useMemo(() => Object.values(positions).flat(), [positions]);
  const totalItemsInLot = allItems.length;

  const isLotSelected = useMemo(() => {
    return allItems.length > 0 && allItems.every((item) => selectedIds.has(item.id));
  }, [allItems, selectedIds]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div
        className="flex items-center gap-4 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-all duration-200 select-none border-b border-slate-100 active:scale-[0.99] touch-manipulation"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ChevronDown
            size={20}
            className={`text-slate-500 transition-transform duration-300 ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
        </div>

        <div onClick={(e) => e.stopPropagation()} className="p-2 -m-2">
          <InventoryCheckbox checked={isLotSelected} onClick={() => onToggleLot(lot)} />
        </div>

        <div className="flex-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Lot / Zone
          </div>
          <div className="font-bold text-lg text-slate-800">{lot}</div>
        </div>

        <div className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500">
          {totalItemsInLot} Items
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="divide-y divide-slate-100 animate-in slide-in-from-top-1 duration-200">
          {posKeys.map((pos) => (
            <StockPositionGroup
              key={pos}
              lot={lot}
              pos={pos}
              items={positions[pos] || []} // ✅ แก้ไขตรงนี้: ใส่ || [] เพื่อกัน undefined
              selectedIds={selectedIds}
              onTogglePos={onTogglePos}
              onToggleItem={onToggleItem}
              onToggleMultiple={onToggleMultiple}
              categoryFormSchemas={categoryFormSchemas} // Pass categoryFormSchemas
            />
          ))}
        </div>
      )}
    </div>
  );
};
