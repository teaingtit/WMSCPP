'use client';

import React from 'react';
import {
  Layers,
  Package,
  Shield,
  StickyNote,
  AlertTriangle,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { EntityStatus } from '@/types/status';
import { InventoryCheckbox } from './InventoryCheckbox';
import { isRestricted, hasWarning, calculateQuantityBreakdown } from '../utils';

interface StockItemCardProps {
  item: StockWithDetails;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onCardClick?: ((item: StockWithDetails) => void) | undefined;
  categoryFormSchemas: Record<string, any[]>;
  status?: EntityStatus | null | undefined;
  noteCount?: number | undefined;
  onStatusClick?: ((item: StockWithDetails) => void) | undefined;
}

export const StockItemCard = ({
  item,
  isSelected,
  onToggle,
  onCardClick,
  categoryFormSchemas,
  status,
  noteCount = 0,
  onStatusClick,
}: StockItemCardProps) => {
  const lotSchema =
    categoryFormSchemas[item.product?.category_id || '']?.filter((f: any) => f.scope === 'LOT') ||
    [];

  // Use shared status helpers
  const restricted = isRestricted(status);
  const warning = hasWarning(status);
  const {
    total: totalQty,
    affected: affectedQty,
    normal: normalQty,
  } = calculateQuantityBreakdown(item.quantity, status);

  const handleCardClick = () => {
    // If onCardClick is provided, open detail modal
    if (onCardClick) {
      onCardClick(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all duration-200 active:scale-[0.97] touch-manipulation select-none
        ${
          isSelected
            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm'
            : restricted
            ? 'bg-red-50/50 border-red-200 hover:border-red-300'
            : warning
            ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
            : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md active:bg-slate-50'
        }`}
    >
      {/* Top Row: Checkbox + Image + Basic Info */}
      <div className="flex items-start gap-3">
        {/* Restriction Indicator - Top Right Corner */}
        {restricted && (
          <div className="absolute -top-1 -right-1 z-10">
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full text-white animate-pulse"
              style={{ backgroundColor: status?.status?.color || '#ef4444' }}
              title={status?.status?.name}
            >
              <Lock size={10} />
            </span>
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()} className="p-1 -m-1">
          <InventoryCheckbox
            checked={isSelected}
            onClick={() => onToggle(item.id)}
            className="shrink-0"
          />
        </div>

        {/* Thumbnail Image */}
        <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center relative">
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
            <div className="text-xs font-bold text-slate-500 truncate">
              {item.product?.sku || 'Unknown SKU'}
            </div>
            {item.level && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                <Layers size={10} /> {item.level}
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-slate-800 truncate">
            {item.product?.name || 'Unknown Product'}
          </div>

          {/* Status & Notes Badges */}
          {(status?.status || noteCount > 0) && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {status?.status && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusClick?.(item);
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all hover:opacity-80 active:scale-95"
                  style={{
                    backgroundColor: status.status.bg_color,
                    color: status.status.text_color,
                    borderColor: status.status.color + '40',
                  }}
                >
                  {restricted ? (
                    <Lock size={10} />
                  ) : warning ? (
                    <AlertTriangle size={10} />
                  ) : (
                    <Shield size={10} />
                  )}
                  <span className="max-w-[50px] truncate">{status.status.name}</span>
                </button>
              )}
              {noteCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusClick?.(item);
                  }}
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-200 transition-all active:scale-95"
                >
                  <StickyNote size={10} />
                  {noteCount}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Display Attributes */}
      {Object.keys(item.attributes || {}).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lotSchema
            .map((field: any) => {
              const value = item.attributes?.[field.key];
              return value ? (
                <span
                  key={field.key}
                  className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                >
                  {field.label}: {String(value)}
                </span>
              ) : null;
            })
            .filter(Boolean)}
        </div>
      )}

      {/* Quantity Breakdown Section */}
      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
          <span className="font-bold uppercase tracking-wide">Quantity Status</span>
          <span className="font-medium">{item.product?.uom}</span>
        </div>

        <div className="space-y-1">
          {/* Normal Quantity Row */}
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs ${
              !status?.status ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle
                size={12}
                className={!status?.status ? 'text-emerald-500' : 'text-slate-300'}
              />
              <span
                className={`font-medium ${!status?.status ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                Normal
              </span>
            </div>
            <span
              className={`font-bold ${!status?.status ? 'text-emerald-700' : 'text-slate-400'}`}
            >
              {normalQty.toLocaleString()}
            </span>
          </div>

          {/* Affected Quantity Row */}
          <div
            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs ${
              status?.status ? 'border' : 'bg-slate-50'
            }`}
            style={
              status?.status
                ? {
                    backgroundColor: status.status.bg_color,
                    borderColor: status.status.color + '40',
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-1.5">
              {restricted ? (
                <Lock size={12} style={{ color: status?.status?.color || '#e2e8f0' }} />
              ) : warning ? (
                <AlertTriangle size={12} style={{ color: status?.status?.color || '#e2e8f0' }} />
              ) : (
                <Shield
                  size={12}
                  className={status?.status ? '' : 'text-slate-300'}
                  style={status?.status ? { color: status.status.color } : undefined}
                />
              )}
              <span
                className="font-medium max-w-[80px] truncate"
                style={{ color: status?.status?.text_color || '#94a3b8' }}
              >
                {status?.status?.name || 'Affected'}
              </span>
            </div>
            <span className="font-bold" style={{ color: status?.status?.text_color || '#94a3b8' }}>
              {affectedQty.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Total Row */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-dashed border-slate-200">
          <span className="text-xs font-bold text-slate-600">Total</span>
          <span
            className={`text-base font-black ${restricted ? 'text-red-600' : 'text-indigo-600'}`}
          >
            {totalQty.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
