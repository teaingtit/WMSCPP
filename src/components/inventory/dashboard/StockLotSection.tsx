'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, AlertTriangle, MapPin, Settings2 } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus, createStatusStyle } from '@/types/status';
import { StockPositionGroup } from './StockPositionGroup';
import { InventoryCheckbox } from './InventoryCheckbox';
import { LotStatus } from '@/actions/status-actions';
import { isRestricted } from '../utils';

interface StockLotSectionProps {
  lot: string;
  positions: Record<string, StockWithDetails[]>;
  selectedIds: Set<string>;
  onToggleLot: (lot: string) => void;
  onTogglePos: (lot: string, pos: string) => void;
  onToggleItem: (id: string) => void;
  onToggleMultiple: (ids: string[]) => void;
  onCardClick?: ((item: StockWithDetails) => void) | undefined;
  statusMap?: Map<string, EntityStatus> | undefined;
  noteCountMap?: Map<string, number> | undefined;
  onStatusClick?: ((item: StockWithDetails) => void) | undefined;
  lotStatus?: LotStatus | null;
  isAdmin?: boolean;
  onLotStatusClick?: (lot: string) => void;
}

export const StockLotSection = ({
  lot,
  positions,
  selectedIds,
  onToggleLot,
  onTogglePos,
  onToggleItem,
  onToggleMultiple,
  onCardClick,
  statusMap,
  noteCountMap,
  onStatusClick,
  lotStatus,
  isAdmin,
  onLotStatusClick,
}: StockLotSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const posKeys = useMemo(
    () => Object.keys(positions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [positions],
  );

  const allItems = useMemo(() => Object.values(positions).flat(), [positions]);
  const totalItemsInLot = allItems.length;

  // Count restricted items in lot
  const restrictedCount = useMemo(() => {
    if (!statusMap) return 0;
    return allItems.filter((item) => isRestricted(statusMap.get(item.id))).length;
  }, [allItems, statusMap]);

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
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-slate-800">{lot}</span>
            {/* Lot Status Badge */}
            {lotStatus?.status && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAdmin && onLotStatusClick) onLotStatusClick(lot);
                }}
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border transition-all ${
                  isAdmin ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'
                }`}
                style={createStatusStyle(lotStatus.status)}
                title={isAdmin ? 'Click to change lot status' : lotStatus.status.description || ''}
              >
                <MapPin size={12} />
                {lotStatus.status.name}
              </button>
            )}
            {/* Add Status Button (Admin only, when no status) */}
            {isAdmin && !lotStatus?.status && onLotStatusClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLotStatusClick(lot);
                }}
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-cyan-600 px-2 py-1 rounded-lg border border-dashed border-slate-300 hover:border-cyan-400 transition-all"
                title="ตั้งค่าสถานะ"
              >
                <Settings2 size={12} />
                ตั้งค่าสถานะ
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {restrictedCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200">
              <AlertTriangle size={12} /> {restrictedCount} รายการติดสถานะ
            </span>
          )}
          <span className="text-xs font-bold bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500">
            {totalItemsInLot} รายการ
          </span>
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
              items={positions[pos] || []}
              selectedIds={selectedIds}
              onTogglePos={onTogglePos}
              onToggleItem={onToggleItem}
              onToggleMultiple={onToggleMultiple}
              onCardClick={onCardClick}
              statusMap={statusMap}
              noteCountMap={noteCountMap}
              onStatusClick={onStatusClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
