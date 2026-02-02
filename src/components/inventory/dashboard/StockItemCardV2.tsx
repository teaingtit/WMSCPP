'use client';

import React, { useEffect, useRef } from 'react';
import { Layers, Package, Shield, StickyNote, AlertTriangle, Lock } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus } from '@/types/status';
import { InventoryCheckbox } from './InventoryCheckbox';
import { isRestricted, hasWarning, calculateQuantityBreakdown } from '../utils';
import { cn } from '@/lib/utils';

interface StockItemCardV2Props {
  item: StockWithDetails;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onCardClick?: ((item: StockWithDetails) => void) | undefined;
  status?: EntityStatus | null | undefined;
  noteCount?: number | undefined;
  onStatusClick?: ((item: StockWithDetails) => void) | undefined;
}

/**
 * StockItemCardV2 - Mobile-First optimized version
 *
 * Improvements:
 * - Larger padding (12px → 16px)
 * - Better touch targets (48px minimum)
 * - Improved text contrast
 * - Smooth animations
 * - Better visual hierarchy
 */
export const StockItemCardV2 = React.memo(
  ({
    item,
    isSelected,
    onToggle,
    onCardClick,
    status,
    noteCount = 0,
    onStatusClick,
  }: StockItemCardV2Props) => {
    // Use shared status helpers
    const restricted = isRestricted(status);
    const warning = hasWarning(status);
    const { total: totalQty, affected: affectedQty } = calculateQuantityBreakdown(
      item.quantity,
      status,
    );

    const handleCardClick = () => {
      if (onCardClick) {
        onCardClick(item);
      }
    };

    const statusDotRef = useRef<HTMLDivElement>(null);
    const statusBadgeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (restricted && statusDotRef.current) {
        statusDotRef.current.style.setProperty(
          '--status-color',
          status?.status?.color || '#ef4444',
        );
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
        className={cn(
          // Base styles
          'relative flex items-center gap-4 p-4 rounded-2xl border',
          'cursor-pointer transition-all duration-200 ease-smooth',
          'hover:shadow-md active:scale-[0.99] touch-manipulation select-none',
          // Conditional styles
          isSelected
            ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
            : restricted
            ? 'bg-destructive/5 border-destructive/20 hover:border-destructive/30'
            : warning
            ? 'bg-warning/5 border-warning/20 hover:border-warning/30'
            : 'bg-white dark:bg-slate-800 border-neutral-200 dark:border-white/10 hover:border-primary/30',
        )}
      >
        {/* Restriction Indicator */}
        {restricted && (
          <div ref={statusDotRef} className="absolute -top-1.5 -right-1.5 z-10">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-white animate-pulse-soft shadow-lg status-dot-dynamic"
              title={status?.status?.name}
            >
              <Lock size={12} strokeWidth={2.5} />
            </span>
          </div>
        )}

        {/* Checkbox - 48px touch target */}
        <div onClick={(e) => e.stopPropagation()} className="touch-48">
          <InventoryCheckbox
            checked={isSelected}
            onClick={() => onToggle(item.id)}
            className="shrink-0"
          />
        </div>

        {/* Thumbnail - Larger */}
        <div className="h-14 w-14 shrink-0 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 overflow-hidden flex items-center justify-center">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.product?.name || 'Product'}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package size={24} className="text-neutral-300 dark:text-neutral-600" />
          )}
        </div>

        {/* Main Info */}
        <div className="min-w-0 flex-1">
          {/* SKU + Level */}
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate">
              {item.product?.sku || 'Unknown SKU'}
            </div>
            {item.level && (
              <span className="flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                <Layers size={11} />
                {item.level}
              </span>
            )}
          </div>

          {/* Product Name */}
          <div className="text-sm font-bold text-neutral-900 dark:text-white truncate mb-1.5">
            {item.product?.name || 'Unknown Product'}
          </div>

          {/* Status & Notes Badges */}
          {(status?.status || noteCount > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {status?.status && (
                <button
                  ref={statusBadgeRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusClick?.(item);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1',
                    'rounded-lg border transition-all duration-150',
                    'hover:opacity-90 active:scale-95 touch-48',
                    'status-badge-dynamic',
                  )}
                >
                  {restricted ? (
                    <Lock size={12} />
                  ) : warning ? (
                    <AlertTriangle size={12} />
                  ) : (
                    <Shield size={12} />
                  )}
                  <span className="max-w-[80px] truncate">{status.status.name}</span>
                </button>
              )}
              {noteCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusClick?.(item);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold',
                    'bg-warning/10 text-warning-foreground px-2 py-1',
                    'rounded-lg border border-warning/20',
                    'hover:bg-warning/20 transition-all duration-150 active:scale-95',
                    'touch-48',
                  )}
                >
                  <StickyNote size={12} />
                  {noteCount}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quantity - Enhanced */}
        <div className="shrink-0 text-right">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1">
            {item.product?.uom}
          </div>
          <div
            className={cn('text-2xl font-black', restricted ? 'text-destructive' : 'text-primary')}
          >
            {totalQty.toLocaleString()}
          </div>
          {status?.status && affectedQty > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {affectedQty.toLocaleString()} affected
            </div>
          )}
        </div>
      </div>
    );
  },
);

StockItemCardV2.displayName = 'StockItemCardV2';
