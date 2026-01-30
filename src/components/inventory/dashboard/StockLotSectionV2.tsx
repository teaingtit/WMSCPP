'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StockWithDetails } from '@/types/inventory';
import type { EntityStatus } from '@/types/status';
import type { LotStatus } from '@/actions/status-actions';
import { StockPositionGroup } from './StockPositionGroup';
import { isRestricted } from '../utils';

interface StockLotSectionV2Props {
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

export const StockLotSectionV2 = React.memo(
  ({
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
  }: StockLotSectionV2Props) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Sort position keys
    const posKeys = useMemo(
      () => Object.keys(positions).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      [positions],
    );

    // Calculate total items
    const totalItems = useMemo(() => Object.values(positions).flat().length, [positions]);

    // Calculate restricted items
    const restrictedCount = useMemo(() => {
      if (!statusMap) return 0;
      const allItems = Object.values(positions).flat();
      return allItems.filter((item) => isRestricted(statusMap.get(item.id))).length;
    }, [positions, statusMap]);

    // Check if lot is selected
    const isLotSelected = useMemo(() => {
      const allItems = Object.values(positions).flat();
      return allItems.length > 0 && allItems.every((item) => selectedIds.has(item.id));
    }, [positions, selectedIds]);

    const handleToggle = () => {
      setIsExpanded(!isExpanded);
    };

    const handleSelectLot = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleLot(lot);
    };

    return (
      <article
        className={cn(
          'bg-white dark:bg-slate-800 rounded-3xl',
          'border border-neutral-200/50 dark:border-white/10',
          'shadow-sm hover:shadow-md transition-shadow duration-200',
          'overflow-hidden',
        )}
      >
        {/* Header - Full Touch Target */}
        <button
          onClick={handleToggle}
          className={cn(
            'flex items-center justify-between w-full p-5',
            'text-left touch-manipulation',
            'transition-colors duration-150',
            'hover:bg-neutral-50 dark:hover:bg-white/5',
            'active:bg-neutral-100 dark:active:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ring-offset-2',
          )}
          {...(isExpanded
            ? { 'aria-expanded': 'true' as const }
            : { 'aria-expanded': 'false' as const })}
          aria-label={`${lot} - ${totalItems} รายการ${
            restrictedCount > 0 ? `, มี ${restrictedCount} รายการติดสถานะ` : ''
          }`}
        >
          {/* Left Section: Expand Icon + Checkbox + Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Expand/Collapse Icon */}
            <div className="p-2 -m-2 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-full transition-colors touch-48">
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-neutral-500 dark:text-neutral-400 transition-transform duration-300 ease-smooth',
                  isExpanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </div>

            {/* Checkbox (Interactive - stops propagation) */}
            <div
              onClick={handleSelectLot}
              className="flex items-center justify-center p-2 -m-2 touch-48"
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-md border-2 transition-all duration-150',
                  isLotSelected
                    ? 'bg-primary border-primary'
                    : 'border-neutral-400 dark:border-neutral-500 hover:border-primary',
                )}
                aria-label={isLotSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              >
                {isLotSelected && (
                  <svg
                    className="w-full h-full text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>

            {/* Package Icon */}
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary" strokeWidth={2.5} />
            </div>

            {/* Text Information */}
            <div className="flex-1 min-w-0">
              {/* Lot Name */}
              <div className="font-semibold text-base text-neutral-900 dark:text-white truncate">
                {lot}
              </div>

              {/* Meta Information */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {totalItems} รายการ
                </span>

                {/* Restricted Badge */}
                {restrictedCount > 0 && (
                  <>
                    <span className="text-neutral-400" aria-hidden="true">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                      <span>{restrictedCount} ติดสถานะ</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Section: Expand Icon (Mobile Only - duplicated for balance) */}
          <div className="md:hidden ml-2">
            <ChevronDown
              className={cn(
                'w-5 h-5 text-neutral-400 transition-transform duration-300 ease-smooth',
                isExpanded && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Expandable Content - Position Groups */}
        {isExpanded && (
          <div className="divide-y divide-neutral-100 dark:divide-white/5 animate-fade-in-up">
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
      </article>
    );
  },
);

StockLotSectionV2.displayName = 'StockLotSectionV2';
