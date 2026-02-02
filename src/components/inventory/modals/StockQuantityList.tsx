'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Package } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';

interface StockQuantityListProps {
  items: StockWithDetails[];
  quantities: Record<string, number>;
  onQuantityChange: (id: string, quantity: number) => void;
  /** Custom render for additional item info */
  renderItemExtra?: (item: StockWithDetails) => React.ReactNode;
}

/**
 * Shared component for displaying stock items with editable quantities.
 * Used in BulkTransferModal and BulkOutboundModal.
 */
export const StockQuantityList = ({
  items,
  quantities,
  onQuantityChange,
  renderItemExtra,
}: StockQuantityListProps) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-4 p-3 border border-slate-100 rounded-xl bg-white shadow-sm"
        >
          {/* Thumbnail */}
          <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.product?.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package size={18} className="text-slate-300" />
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">
              {item.product?.name || 'Unknown Product'}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
              <span className="font-mono">{item.product?.sku}</span>
              <span className="w-px h-3 bg-slate-300"></span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                {item.location?.code}
              </span>
            </div>
            {renderItemExtra?.(item)}
          </div>

          {/* Quantity Input */}
          <div className="shrink-0 text-right">
            <div className="text-xs text-slate-500 mb-1">Max: {item.quantity.toLocaleString()}</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                aria-label={`Quantity for ${item.product?.name || 'item'}`}
                className="w-20 p-1.5 text-right border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                value={quantities[item.id] || 0}
                min={0}
                max={item.quantity}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (num < 0) return;
                  onQuantityChange(item.id, Math.min(num, item.quantity));
                }}
              />
              <span className="text-xs text-slate-500 font-medium">{item.product?.uom}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook for managing quantity state for bulk operations.
 * Initializes quantities with full amount for each item.
 */
export function useBulkQuantities(items: StockWithDetails[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.quantity;
    });
    return initial;
  });

  const handleQuantityChange = useCallback((id: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [id]: quantity }));
  }, []);

  const validateQuantities = useCallback(() => {
    const invalidItem = items.find((item) => {
      const qty = quantities[item.id];
      return !qty || qty <= 0;
    });
    return !invalidItem;
  }, [items, quantities]);

  const totalQuantity = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities],
  );

  return {
    quantities,
    handleQuantityChange,
    validateQuantities,
    totalQuantity,
  };
}
