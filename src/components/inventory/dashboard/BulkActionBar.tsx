'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onOpenCart: () => void;
  onClear: () => void;
}

export const BulkActionBar = ({ selectedCount, onOpenCart, onClear }: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 duration-300">
      <div
        className="bg-slate-900 text-white p-2 pl-4 pr-2 rounded-full shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform cursor-pointer"
        onClick={onOpenCart}
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
            {selectedCount}
          </div>
          <span className="font-bold text-sm">Items in Cart</span>
        </div>

        <div className="h-6 w-px bg-slate-700"></div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase"
        >
          Clear
        </button>

        <div className="h-6 w-px bg-slate-700"></div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCart();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-sm transition-colors shadow-lg shadow-indigo-900/50"
        >
          <ShoppingCart size={16} /> View Cart
        </button>
      </div>
    </div>
  );
};
