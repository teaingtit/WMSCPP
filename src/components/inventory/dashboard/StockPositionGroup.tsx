'use client';

import React, { useMemo, useState } from 'react';
import { Grid3X3, Layers, ChevronDown } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus } from '@/types/status';
import { StockItemCard } from './StockItemCard';
import { InventoryCheckbox } from './InventoryCheckbox';

interface StockPositionGroupProps {
  lot: string;
  pos: string;
  items: StockWithDetails[];
  selectedIds: Set<string>;
  onTogglePos: (lot: string, pos: string) => void;
  onToggleItem: (id: string) => void;
  onToggleMultiple: (ids: string[]) => void;
  onCardClick?: ((item: StockWithDetails) => void) | undefined;
  categoryFormSchemas: Record<string, any[]>;
  statusMap?: Map<string, EntityStatus> | undefined;
  noteCountMap?: Map<string, number> | undefined;
  onStatusClick?: ((item: StockWithDetails) => void) | undefined;
}

const getLevelStyles = (level: string) => {
  const char = level.charAt(0).toUpperCase();

  // Level A / 1 -> Red (Rose)
  if (['A', '1'].includes(char)) {
    return {
      text: 'text-rose-700',
      icon: 'text-rose-500',
      hoverBg: 'hover:bg-rose-50',
      badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    };
  }

  // Level B / 2 -> Blue
  if (['B', '2'].includes(char)) {
    return {
      text: 'text-blue-700',
      icon: 'text-blue-500',
      hoverBg: 'hover:bg-blue-50',
      badge: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
  }

  // Level C / 3 -> Green (Emerald)
  if (['C', '3'].includes(char)) {
    return {
      text: 'text-emerald-700',
      icon: 'text-emerald-500',
      hoverBg: 'hover:bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    };
  }

  // Default -> Slate / Indigo
  return {
    text: 'text-slate-600',
    icon: 'text-indigo-400',
    hoverBg: 'hover:bg-slate-50',
    badge: 'bg-slate-50 text-slate-400 border border-slate-200',
  };
};

export const StockPositionGroup = ({
  lot,
  pos,
  items,
  selectedIds,
  onTogglePos,
  onToggleItem,
  onToggleMultiple,
  onCardClick,
  categoryFormSchemas,
  statusMap,
  noteCountMap,
  onStatusClick,
}: StockPositionGroupProps) => {
  // Logic: ตรวจสอบว่าเลือกสินค้าครบทุกชิ้นใน Position นี้หรือไม่
  const isPosSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  // Group items by level
  const itemsByLevel = useMemo(() => {
    const groups: Record<string, StockWithDetails[]> = {};
    items.forEach((item) => {
      const lvl = item.level || 'Unassigned';
      const bucket = groups[lvl] || (groups[lvl] = []);
      bucket.push(item);
    });
    return groups;
  }, [items]);

  const sortedLevels = useMemo(
    () =>
      Object.keys(itemsByLevel).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [itemsByLevel],
  );

  // State to track collapsed levels
  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({});

  const toggleLevel = (lvl: string) => {
    setCollapsedLevels((prev) => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  return (
    <div className="p-4 bg-white border-b border-slate-100 last:border-none">
      {/* Header ของ Position */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-1 -m-1">
          <InventoryCheckbox checked={isPosSelected} onClick={() => onTogglePos(lot, pos)} />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
          <Grid3X3 size={16} className="text-indigo-500" />
          <span className="font-bold text-indigo-700">{pos}</span>
        </div>
        <span className="text-xs text-slate-400">({items.length} items)</span>
      </div>

      {/* Loop แสดง Level */}
      <div className="pl-2 md:pl-6 space-y-2">
        {sortedLevels.map((lvl) => {
          const isCollapsed = collapsedLevels[lvl];
          const lvlItems = itemsByLevel[lvl] || [];
          const isLevelSelected =
            lvlItems.length > 0 && lvlItems.every((item) => selectedIds.has(item.id));
          const styles = getLevelStyles(lvl);

          return (
            <div key={lvl} className="relative">
              {/* Level Header */}
              <div
                className={`flex items-center gap-3 py-3 cursor-pointer rounded-xl px-3 -ml-2 transition-all select-none group active:scale-[0.98] touch-manipulation ${styles.hoverBg}`}
                onClick={() => toggleLevel(lvl)}
              >
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-300 ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />

                <div onClick={(e) => e.stopPropagation()} className="p-2 -m-2">
                  <InventoryCheckbox
                    checked={isLevelSelected}
                    onClick={() => onToggleMultiple(lvlItems.map((i) => i.id))}
                  />
                </div>

                <span className={`flex items-center gap-2 text-sm font-bold ${styles.text}`}>
                  <Layers size={16} className={styles.icon} />
                  Level {lvl}
                </span>

                <div className="flex-1 h-px bg-slate-100 group-hover:bg-slate-200 transition-colors mx-2"></div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${styles.badge}`}
                >
                  {lvlItems.length}
                </span>
              </div>

              {/* Grid แสดงรายการสินค้าใน Level นี้ */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-4 md:pl-8 pb-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300 ease-out">
                  {lvlItems.map((item) => (
                    <StockItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggle={onToggleItem}
                      onCardClick={onCardClick}
                      categoryFormSchemas={categoryFormSchemas}
                      status={statusMap?.get(item.id)}
                      noteCount={noteCountMap?.get(item.id) || 0}
                      onStatusClick={onStatusClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
