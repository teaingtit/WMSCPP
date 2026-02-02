'use client';

import { useEffect, useRef } from 'react';
import { Layers, Package, Shield, StickyNote, AlertTriangle, Lock } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus } from '@/types/status';
import { InventoryCheckbox } from './InventoryCheckbox';
import { isRestricted, hasWarning, calculateQuantityBreakdown } from '../utils';

interface StockItemCardProps {
  item: StockWithDetails;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onCardClick?: ((item: StockWithDetails) => void) | undefined;

  status?: EntityStatus | null | undefined;
  noteCount?: number | undefined;
  onStatusClick?: ((item: StockWithDetails) => void) | undefined;
}

export const StockItemCard = ({
  item,
  isSelected,
  onToggle,
  onCardClick,

  status,
  noteCount = 0,
  onStatusClick,
}: StockItemCardProps) => {
  // Use shared status helpers
  const restricted = isRestricted(status);
  const warning = hasWarning(status);
  const { total: totalQty, affected: affectedQty } = calculateQuantityBreakdown(
    item.quantity,
    status,
  );

  const handleCardClick = () => {
    // If onCardClick is provided, open detail modal
    if (onCardClick) {
      onCardClick(item);
    }
  };

  const statusDotRef = useRef<HTMLDivElement>(null);
  const statusBadgeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (restricted && statusDotRef.current) {
      statusDotRef.current.style.setProperty('--status-color', status?.status?.color || '#ef4444');
    }
  }, [restricted, status?.status?.color]);

  useEffect(() => {
    if (status?.status && statusBadgeRef.current) {
      statusBadgeRef.current.style.setProperty('--status-bg', status.status.bg_color);
      statusBadgeRef.current.style.setProperty('--status-text', status.status.text_color);
      statusBadgeRef.current.style.setProperty('--status-border', status.status.color + '40');
    }
  }, [status?.status]);

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99] touch-manipulation select-none
        ${
          isSelected
            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
            : restricted
            ? 'bg-red-50/50 border-red-200 hover:border-red-300'
            : warning
            ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
            : 'bg-white border-slate-200 hover:border-indigo-200'
        }`}
    >
      {/* Restriction Indicator */}
      {restricted && (
        <div ref={statusDotRef} className="absolute -top-1 -right-1 z-10">
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full text-white animate-pulse status-dot-dynamic"
            title={status?.status?.name}
          >
            <Lock size={10} />
          </span>
        </div>
      )}

      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()} className="p-1 -m-1">
        <InventoryCheckbox
          checked={isSelected}
          onClick={() => onToggle(item.id)}
          className="shrink-0"
        />
      </div>

      {/* Thumbnail */}
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

      {/* Main Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="text-xs font-bold text-slate-500 truncate">
            {item.product?.sku || 'Unknown SKU'}
          </div>
          {item.level && (
            <span className="flex items-center gap-0.5 text-xs font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
              <Layers size={10} /> {item.level}
            </span>
          )}
        </div>
        <div className="text-sm font-bold text-slate-800 truncate">
          {item.product?.name || 'Unknown Product'}
        </div>

        {/* Status & Notes Badges */}
        {(status?.status || noteCount > 0) && (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {status?.status && (
              <button
                ref={statusBadgeRef}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusClick?.(item);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded border transition-all hover:opacity-80 active:scale-95 status-badge-dynamic"
              >
                {restricted ? (
                  <Lock size={10} />
                ) : warning ? (
                  <AlertTriangle size={10} />
                ) : (
                  <Shield size={10} />
                )}
                <span className="max-w-[60px] truncate">{status.status.name}</span>
              </button>
            )}
            {noteCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusClick?.(item);
                }}
                className="inline-flex items-center gap-0.5 text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-200 transition-all active:scale-95"
              >
                <StickyNote size={10} />
                {noteCount}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quantity - Compact Display */}
      <div className="shrink-0 text-right">
        <div className="text-xs text-slate-500 font-medium mb-0.5">{item.product?.uom}</div>
        <div className={`text-xl font-black ${restricted ? 'text-red-600' : 'text-indigo-600'}`}>
          {totalQty.toLocaleString()}
        </div>
        {status?.status && affectedQty > 0 && (
          <div className="text-xs text-slate-500 mt-0.5">
            {affectedQty.toLocaleString()} affected
          </div>
        )}
      </div>
    </div>
  );
};
