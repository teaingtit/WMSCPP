'use client';

import React from 'react';
import { X, Trash2, ArrowRightLeft, Truck, Package } from 'lucide-react';
import { StockWithDetails } from '@/types/inventory';
import { Button } from '@/components/ui/button';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: StockWithDetails[];
  onRemove: (id: string) => void;
  onAction: (action: 'internal' | 'cross' | 'outbound') => void;
}

export const CartDrawer = ({ isOpen, onClose, items, onRemove, onAction }: CartDrawerProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Inventory Cart</h2>
              <p className="text-xs text-slate-500">{items.length} items selected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - List of Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
              <Package size={48} className="opacity-20" />
              <p>No items in cart</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3 group hover:border-indigo-200 transition-colors"
              >
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

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-700 truncate text-sm">
                      {item.product?.name}
                    </h4>
                    <button
                      onClick={() => onRemove(item.id)}
                      aria-label={
                        item.product?.name
                          ? `Remove ${item.product.name}`
                          : `Remove item ${item.id}`
                      }
                      className="text-slate-300 hover:text-red-500 transition-colors p-1 -mr-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">{item.product?.sku}</div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono font-bold">
                      {item.location?.code}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="font-bold text-slate-700">
                      {item.quantity.toLocaleString()} {item.product?.uom}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3 pb-safe">
          <div className="flex justify-between items-center text-sm font-bold text-slate-600 mb-2">
            <span>Total Items:</span>
            <span className="text-lg text-indigo-600">{items.length}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onAction('internal')}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white"
              disabled={items.length === 0}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Internal Move
            </Button>
            <Button
              onClick={() => onAction('cross')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
              disabled={items.length === 0}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Cross Dock
            </Button>
          </div>
          <Button
            onClick={() => onAction('outbound')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
            disabled={items.length === 0}
          >
            <Truck className="mr-2 h-4 w-4" /> Issue / Outbound
          </Button>
        </div>
      </div>
    </div>
  );
};
